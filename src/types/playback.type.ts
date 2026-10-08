export type SponsorBlockCategory =
  | 'sponsor'
  | 'intro'
  | 'outro'
  | 'selfpromo'
  | 'interaction'
  | 'music';

export type ScheduleWindow = {
  startMinutes: number;
  endMinutes: number;
};

export type PlaybackSettings = {
  autoplay: boolean;
  /** Parent-set ceiling for adaptive video quality. */
  maxQualityHeight?: number;
  /** Whether a child may save videos for offline viewing. */
  downloadsEnabled: boolean;
  /** How long a saved video stays on the device. */
  downloadRetentionDays: 7 | 30;
  sponsorBlockEnabled: boolean;
  sponsorBlockCategories: SponsorBlockCategory[];
  dailyLimitMinutes: number | null;
  screenTimeWarningsEnabled: boolean;
  allowedHoursEnabled: boolean;
  schedules: Record<string, ScheduleWindow[]>;
  bedtimeEnabled: boolean;
  bedtimeStartMinutes: number;
  bedtimeEndMinutes: number;
};

export type ScreenTimeUsage = {
  profileId: string;
  date: string;
  secondsWatched: number;
};

export type PlaybackBlockedReason =
  | 'VIDEO_NOT_APPROVED'
  | 'CATEGORY_BLOCKED'
  | 'SCREEN_TIME_EXCEEDED'
  | 'NOT_READY'
  | 'OUTSIDE_ALLOWED_HOURS'
  | 'BEDTIME'
  | 'APPROVAL_EXPIRED';

export type PlaybackDecision = { allowed: true } | { allowed: false; reason: PlaybackBlockedReason };
