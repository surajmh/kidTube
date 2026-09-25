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
  | 'OUTSIDE_ALLOWED_HOURS'
  | 'BEDTIME'
  | 'APPROVAL_EXPIRED';

export type PlaybackDecision = { allowed: true } | { allowed: false; reason: PlaybackBlockedReason };

export const defaultPlaybackSettings: PlaybackSettings = {
  autoplay: false,
  sponsorBlockEnabled: true,
  sponsorBlockCategories: ['sponsor', 'intro', 'outro', 'selfpromo'],
  dailyLimitMinutes: 60,
  screenTimeWarningsEnabled: true,
  allowedHoursEnabled: false,
  schedules: {
    '0': [{ startMinutes: 16 * 60, endMinutes: 19 * 60 }],
    '1': [{ startMinutes: 16 * 60, endMinutes: 19 * 60 }],
    '2': [{ startMinutes: 16 * 60, endMinutes: 19 * 60 }],
    '3': [{ startMinutes: 16 * 60, endMinutes: 19 * 60 }],
    '4': [{ startMinutes: 16 * 60, endMinutes: 19 * 60 }],
    '5': [{ startMinutes: 9 * 60, endMinutes: 19 * 60 }],
    '6': [{ startMinutes: 9 * 60, endMinutes: 19 * 60 }],
  },
  bedtimeEnabled: false,
  bedtimeStartMinutes: 20 * 60,
  bedtimeEndMinutes: 7 * 60,
};
