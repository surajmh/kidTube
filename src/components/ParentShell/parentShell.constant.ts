import { Feather } from '@expo/vector-icons';
import { ParentSection } from './parentShell.type';

export const SECTIONS: Array<{ id: ParentSection; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'channels', label: 'Channels', icon: 'users' },
  { id: 'videos', label: 'Videos', icon: 'play' },
  { id: 'categories', label: 'Categories', icon: 'grid' },
  { id: 'requests', label: 'Requests', icon: 'inbox' },
];

/**
 * How close to the bottom counts as "nearing the end", in pixels.
 *
 * Roughly a screen's worth, so the next page is already arriving by the time the parent reaches
 * the end rather than after a visible stall.
 */
export const NEAR_BOTTOM_THRESHOLD = 700;

export const SETTINGS_SECTIONS: Array<{
  id: ParentSection; label: string; description: string;
  icon: keyof typeof Feather.glyphMap;
  tone: 'cyan' | 'purple' | 'blue' | 'pink' | 'green' | 'orange';
}> = [
  { id: 'children', label: 'Children', description: 'Manage profiles, screen time and settings', icon: 'users', tone: 'purple' },
  { id: 'settings', label: 'Family settings', description: 'App access, content and safety preferences', icon: 'settings', tone: 'blue' },
  { id: 'channels', label: 'Channels', description: 'Manage allowed channels', icon: 'tv', tone: 'pink' },
  { id: 'videos', label: 'Videos', description: 'Manage allowed videos', icon: 'film', tone: 'green' },
  { id: 'categories', label: 'Categories', description: 'Choose what content is available', icon: 'grid', tone: 'orange' },
  { id: 'requests', label: 'Requests', description: 'Review content requests from your child', icon: 'message-circle', tone: 'purple' },
  { id: 'playlists', label: 'Playlists', description: 'Manage saved playlists', icon: 'list', tone: 'cyan' },
  { id: 'downloads', label: 'Downloads', description: 'Manage downloaded videos', icon: 'download', tone: 'blue' },
  { id: 'activity', label: 'Activity', description: 'Review watch history and screen time', icon: 'bar-chart-2', tone: 'green' },
  { id: 'security', label: 'Security', description: 'Manage the parent PIN', icon: 'shield', tone: 'orange' },
];
