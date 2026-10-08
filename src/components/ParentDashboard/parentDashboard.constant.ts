import { Feather } from '@expo/vector-icons';
import type { ParentSection } from '../ParentShell/parentShell.type';

type Icon = keyof typeof Feather.glyphMap;

export const DASHBOARD_COPY = {
  subtitle: 'Manage a safe and fun viewing experience for your kids.',
  childCaption: 'Active profile',
  manageChildren: 'Manage children',
  overviewTitle: 'Family overview',
  overviewAction: 'View details',
  manageTitle: 'Manage your family experience',
  manageBody: 'Keep content safe, organised and fun for your kids.',
  libraryTitle: 'Library & security',
  libraryBody: 'Organise content and keep your family safe.',
} as const;

/** Icon tile colours for the overview counters: a dark wash with a brighter glyph. */
export const OVERVIEW_STATS: Array<{ key: 'channels' | 'videos' | 'categories' | 'pending'; label: string; icon: Icon; wash: string; glyph: string }> = [
  { key: 'channels', label: 'channels', icon: 'users', wash: '#1B3B2C', glyph: '#6EE7A8' },
  { key: 'videos', label: 'videos', icon: 'play', wash: '#3E1F22', glyph: '#FF7A85' },
  { key: 'categories', label: 'categories', icon: 'grid', wash: '#2B2650', glyph: '#A99CFF' },
  { key: 'pending', label: 'pending', icon: 'clock', wash: '#40301A', glyph: '#F2B84B' },
];

export type DashboardTile = { id: ParentSection; label: string; hint: string; icon: Icon; tint: string };

export const MANAGE_TILES: DashboardTile[] = [
  { id: 'downloads', label: 'Downloads', hint: 'Save approved videos for travel.', icon: 'download', tint: '#7DB4F5' },
  { id: 'children', label: 'Children', hint: 'Profiles, limits and rules.', icon: 'users', tint: '#86D9AE' },
  { id: 'activity', label: 'Activity', hint: 'What has been watched.', icon: 'bar-chart-2', tint: '#F2A4D6' },
  { id: 'settings', label: 'Playback', hint: 'Screen time and bedtime.', icon: 'sliders', tint: '#F5B07A' },
];

export const LIBRARY_TILES: DashboardTile[] = [
  { id: 'playlists', label: 'Playlists', hint: 'Create and order video collections.', icon: 'list', tint: '#B5A6F5' },
  { id: 'security', label: 'Security', hint: 'Change the parent PIN.', icon: 'lock', tint: '#82AEE8' },
];
