import { PlaybackSettings, PlaybackDecision, ScreenTimeUsage } from '../playbackTypes';
import { ProfilePolicyOverrides } from '../parentalControlsTypes';
import { ContentAccessOutcome } from './contentAccessService';
import { mergeProfilePolicy } from './profilePolicyService';

function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function currentMinutes(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

function isInWindow(minutes: number, start: number, end: number) {
  if (start === end) return true;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

export type PlaybackCheckInput = {
  profileId: string;
  videoId: string;
  channelId?: string;
  categoryIds?: string[];
};

export type PlaybackPolicyHydration = {
  settings: PlaybackSettings;
  screenTime: ScreenTimeUsage[];
  profiles?: { id: string }[];
  profilePolicies?: Record<string, ProfilePolicyOverrides>;
};

export type ContentAccessResolver = (
  profileId: string,
  input: { videoId: string; channelId?: string; categoryIds?: string[] },
  now: Date,
) => ContentAccessOutcome;

const decisionForOutcome: Record<ContentAccessOutcome, PlaybackDecision> = {
  allowed: { allowed: true },
  expired: { allowed: false, reason: 'APPROVAL_EXPIRED' },
  category_blocked: { allowed: false, reason: 'CATEGORY_BLOCKED' },
  child_blocked: { allowed: false, reason: 'VIDEO_NOT_APPROVED' },
  not_approved: { allowed: false, reason: 'VIDEO_NOT_APPROVED' },
};

/** Child-facing copy. Never exposes policy internals. */
export function describePlaybackDecision(decision: PlaybackDecision) {
  if (decision.allowed) return '';
  switch (decision.reason) {
    case 'VIDEO_NOT_APPROVED':
    case 'CATEGORY_BLOCKED':
      return 'This video isn’t available for your profile.';
    case 'APPROVAL_EXPIRED':
      return 'Your time with this video has finished. You can ask a grown-up for it again.';
    case 'SCREEN_TIME_EXCEEDED':
      return 'You’ve finished your screen time for today. Come back tomorrow!';
    case 'OUTSIDE_ALLOWED_HOURS':
      return 'Kids mode isn’t available right now.';
    case 'BEDTIME':
      return 'It’s bedtime. Come back in the morning!';
  }
}

/** A parent override can only unlock time-based restrictions. */
export function isTimeRelatedReason(decision: PlaybackDecision) {
  if (decision.allowed) return false;
  return (
    decision.reason === 'SCREEN_TIME_EXCEEDED' ||
    decision.reason === 'OUTSIDE_ALLOWED_HOURS' ||
    decision.reason === 'BEDTIME'
  );
}

export type OverrideWindow = {
  additionalSeconds: number;
  grantsScheduleAccess: boolean;
};

export type OverrideResolver = (profileId: string, now: Date) => OverrideWindow;

/**
 * The single place that decides whether a child may play something.
 *
 * Order: profile -> content approval -> temporary approval -> category ->
 * parent override window -> screen time -> allowed hours -> bedtime.
 */
export class PlaybackPolicyService {
  private settings!: PlaybackSettings;
  private usage = new Map<string, ScreenTimeUsage>();
  private profiles: { id: string }[] = [];
  private profilePolicies: Record<string, ProfilePolicyOverrides> = {};
  private contentAccess: ContentAccessResolver = () => 'not_approved';
  private overrides: OverrideResolver = () => ({ additionalSeconds: 0, grantsScheduleAccess: false });
  private hydrated = false;

  hydrate(input: PlaybackPolicyHydration) {
    this.settings = input.settings;
    this.profiles = input.profiles ?? [];
    this.profilePolicies = input.profilePolicies ?? {};
    this.usage = new Map(input.screenTime.map((record) => [`${record.profileId}:${record.date}`, record]));
    this.hydrated = true;
  }

  setSettings(settings: PlaybackSettings) {
    this.settings = settings;
  }

  setProfilePolicies(policies: Record<string, ProfilePolicyOverrides>) {
    this.profilePolicies = policies;
  }

  setProfiles(profiles: { id: string }[]) {
    this.profiles = profiles;
  }

  setContentAccessResolver(resolver: ContentAccessResolver) {
    this.contentAccess = resolver;
  }

  setOverrideResolver(resolver: OverrideResolver) {
    this.overrides = resolver;
  }

  isHydrated() {
    return this.hydrated;
  }

  /** Global family settings. */
  getSettings() {
    return this.settings;
  }

  /** Global settings with any per-child overrides applied. */
  getEffectiveSettings(profileId: string) {
    return mergeProfilePolicy(this.settings, this.profilePolicies[profileId]);
  }

  getUsage(profileId: string, date = localDayKey()) {
    return this.usage.get(`${profileId}:${date}`)?.secondsWatched ?? 0;
  }

  /** Extra seconds currently unlocked by live parent overrides. */
  getOverrideSeconds(profileId: string, now = new Date()) {
    return this.overrides(profileId, now).additionalSeconds;
  }

  private screenTimeDecision(profileId: string, now: Date, override: OverrideWindow): PlaybackDecision {
    const settings = this.getEffectiveSettings(profileId);
    if (settings.dailyLimitMinutes === null) return { allowed: true };
    const limit = settings.dailyLimitMinutes * 60 + override.additionalSeconds;
    if (this.getUsage(profileId) >= limit) return { allowed: false, reason: 'SCREEN_TIME_EXCEEDED' };
    return { allowed: true };
  }

  private scheduleDecision(profileId: string, now: Date, override: OverrideWindow): PlaybackDecision {
    const settings = this.getEffectiveSettings(profileId);
    if (override.grantsScheduleAccess) return { allowed: true };
    if (settings.bedtimeEnabled && isInWindow(currentMinutes(now), settings.bedtimeStartMinutes, settings.bedtimeEndMinutes)) {
      return { allowed: false, reason: 'BEDTIME' };
    }
    if (settings.allowedHoursEnabled) {
      const windows = settings.schedules[String(now.getDay())] ?? [];
      if (!windows.some((window) => isInWindow(currentMinutes(now), window.startMinutes, window.endMinutes))) {
        return { allowed: false, reason: 'OUTSIDE_ALLOWED_HOURS' };
      }
    }
    return { allowed: true };
  }

  canPlay(input: PlaybackCheckInput): PlaybackDecision {
    if (!this.hydrated || !this.settings) return { allowed: false, reason: 'SCREEN_TIME_EXCEEDED' };

    // 1. Is the profile valid? Unknown profiles own no content.
    if (this.profiles.length && !this.profiles.some((profile) => profile.id === input.profileId)) {
      return { allowed: false, reason: 'VIDEO_NOT_APPROVED' };
    }

    // 2-4. Global approval, child-specific grants, temporary approval, categories.
    const outcome = this.contentAccess(
      input.profileId,
      { videoId: input.videoId, channelId: input.channelId, categoryIds: input.categoryIds },
      new Date(),
    );
    const contentDecision = decisionForOutcome[outcome];
    if (!contentDecision.allowed) return contentDecision;

    // 5-7. Screen time, allowed hours, bedtime (skipped while a parent override is live).
    // Resolved once and shared: `scheduleDecision`/`screenTimeDecision` used to each call the
    // (injected, possibly non-trivial) override resolver independently for the same instant.
    const now = new Date();
    const override = this.overrides(input.profileId, now);
    const schedule = this.scheduleDecision(input.profileId, now, override);
    if (!schedule.allowed) return schedule;
    return this.screenTimeDecision(input.profileId, now, override);
  }

  /** Re-checked while playback is already running (no content re-check needed). */
  canContinuePlayback(profileId: string, now = new Date()): PlaybackDecision {
    if (!this.hydrated || !this.settings) return { allowed: false, reason: 'SCREEN_TIME_EXCEEDED' };
    const override = this.overrides(profileId, now);
    const schedule = this.scheduleDecision(profileId, now, override);
    if (!schedule.allowed) return schedule;
    return this.screenTimeDecision(profileId, now, override);
  }

  shouldAutoplay(profileId: string) {
    if (!this.settings) return false;
    return Boolean(this.getEffectiveSettings(profileId).autoplay && this.canContinuePlayback(profileId).allowed);
  }

  getRemainingSeconds(profileId: string, now = new Date()) {
    const settings = this.getEffectiveSettings(profileId);
    if (settings.dailyLimitMinutes === null) return null;
    const limit = settings.dailyLimitMinutes * 60 + this.getOverrideSeconds(profileId, now);
    return Math.max(0, limit - this.getUsage(profileId));
  }

  addPlaybackSeconds(profileId: string, seconds: number) {
    if (!this.hydrated || seconds <= 0) return this.getUsage(profileId);
    const date = localDayKey();
    const key = `${profileId}:${date}`;
    const next = {
      profileId,
      date,
      secondsWatched: this.getUsage(profileId, date) + seconds,
    };
    this.usage.set(key, next);
    return next.secondsWatched;
  }

  records() {
    return [...this.usage.values()];
  }

  /** Used after pruning stored usage so memory and storage stay identical. */
  replaceRecords(records: ScreenTimeUsage[]) {
    this.usage = new Map(records.map((record) => [`${record.profileId}:${record.date}`, record]));
  }
}

export const playbackPolicy = new PlaybackPolicyService();
export { localDayKey };
