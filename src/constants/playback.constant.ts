import type { PlaybackSettings } from '../types';

export const defaultPlaybackSettings: PlaybackSettings = {
  autoplay: false,
  maxQualityHeight: 1080,
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
