import { overrideRepository } from '../repositories/parentalControlsRepository';
import type { PlaybackSettings } from '../types';
import type { PlaybackOverride } from '../types';
import { parentSessionService } from './auth/parentSession';
import type { ParentSession } from './auth/parentSession.type';
import { endOfLocalDay } from './approvalRules';
import type { OverridePreset } from './playbackOverrideService.type';
import { id } from '../utils/id';

export const overridePresets: OverridePreset[] = [
  { id: 'fifteen_minutes', label: '+15 minutes', additionalSeconds: 15 * 60, untilBedtime: false },
  { id: 'thirty_minutes', label: '+30 minutes', additionalSeconds: 30 * 60, untilBedtime: false },
  { id: 'until_bedtime', label: 'Until bedtime', additionalSeconds: null, untilBedtime: true },
];

export function bedtimeStartInstant(settings: PlaybackSettings, now = new Date()) {
  if (!settings.bedtimeEnabled) return null;
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    Math.floor(settings.bedtimeStartMinutes / 60),
    settings.bedtimeStartMinutes % 60,
    0,
    0,
  );
  return start.getTime() > now.getTime() ? start : new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Temporary parent overrides. They add watch time for a bounded period and never
 * change the child's configured limit.
 */
export class PlaybackOverrideService {
  private overrides: PlaybackOverride[] = [];

  hydrate(overrides: PlaybackOverride[]) {
    this.overrides = overrides;
  }

  all() {
    return this.overrides;
  }

  active(profileId: string, now = new Date()) {
    return this.overrides.filter(
      (override) => override.profileId === profileId && new Date(override.expiresAt).getTime() > now.getTime(),
    );
  }

  /** Extra seconds granted by live overrides for this profile. */
  additionalSeconds(profileId: string, now = new Date()) {
    return this.active(profileId, now).reduce((total, override) => total + override.additionalSeconds, 0);
  }

  grantsScheduleAccess(profileId: string, now = new Date()) {
    return this.active(profileId, now).some((override) => override.grantsScheduleAccess);
  }

  /** Parent-only. */
  async grant(
    session: ParentSession,
    input: { profileId: string; preset: OverridePreset; settings: PlaybackSettings; grantsScheduleAccess: boolean },
  ): Promise<PlaybackOverride[]> {
    parentSessionService.require('grant a parent override');

    const now = new Date();
    let additionalSeconds: number;
    let expiresAt: Date;

    if (input.preset.untilBedtime) {
      const bedtime = bedtimeStartInstant(input.settings, now);
      const end = bedtime ?? endOfLocalDay(now);
      expiresAt = end;
      additionalSeconds = Math.max(0, Math.round((end.getTime() - now.getTime()) / 1000));
    } else {
      additionalSeconds = input.preset.additionalSeconds ?? 0;
      expiresAt = new Date(now.getTime() + additionalSeconds * 1000);
    }

    const override: PlaybackOverride = {
      id: id('override'),
      profileId: input.profileId,
      additionalSeconds,
      grantedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      grantsScheduleAccess: input.grantsScheduleAccess,
    };

    this.overrides = [override, ...this.overrides];
    await overrideRepository.saveAll(this.overrides);
    return this.overrides;
  }

  /** Parent-only. */
  async revoke(session: ParentSession, profileId: string) {
    parentSessionService.require('revoke a parent override');
    const next = this.overrides.filter((override) => override.profileId !== profileId);
    this.overrides = next;
    await overrideRepository.saveAll(next);
    return next;
  }

  async pruneExpired(now = new Date()) {
    const next = this.overrides.filter((override) => new Date(override.expiresAt).getTime() > now.getTime());
    if (next.length === this.overrides.length) return this.overrides;
    this.overrides = next;
    await overrideRepository.saveAll(next);
    return next;
  }
}

export const playbackOverrideService = new PlaybackOverrideService();
