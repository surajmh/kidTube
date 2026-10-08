export const storageKeys = {
  profiles: '@nestling/profiles',
  playlists: '@nestling/playlists',
  channels: '@nestling/channels',
  videos: '@nestling/videos',
  history: '@nestling/history',
  screenTime: '@nestling/screen-time',
  settings: '@nestling/settings',
  requests: '@nestling/requests',
  approvals: '@nestling/approvals',
  categories: '@nestling/categories',
  childRules: '@nestling/child-content-rules',
  profilePolicies: '@nestling/profile-policies',
  overrides: '@nestling/playback-overrides',
  channelSync: '@nestling/channel-sync',
  downloadOwners: '@nestling/download-owners',
} as const;

/** Earlier builds stored playback settings here; `loadAppData` moves them to `storageKeys.settings`. */
export const legacySettingsKey = '@nestling/phase3-settings';
