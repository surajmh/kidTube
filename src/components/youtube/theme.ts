/**
 * Kid Mode design tokens.
 *
 * A video-app design language: near-black surfaces, one saturated accent, and almost no chrome
 * so thumbnails carry the screen. Parent Mode keeps its own light palette in `../theme`, which is
 * deliberate — the two surfaces are for different people and never appear together.
 */
export const yt = {
  /** Page background. Near-black rather than pure black so elevated surfaces can still read. */
  bg: '#0F0F0F',
  /** Cards, sheets and the search field. */
  surface: '#212121',
  /** Chips and pressed states. */
  surfaceAlt: '#272727',
  /** An inverted chip: light fill, dark label. */
  chipActive: '#F1F1F1',
  chipActiveText: '#0F0F0F',
  text: '#F1F1F1',
  textDim: '#AAAAAA',
  /** Brand accent. Used for the mark and destructive/live affordances only. */
  accent: '#FF0033',
  line: '#303030',
  /** Duration pill over a thumbnail. */
  badge: 'rgba(0,0,0,0.8)',
  onAccent: '#FFFFFF',
} as const;

/** A channel avatar with no artwork falls back to a tinted initial. */
export const avatarTints = ['#3D5AFE', '#00897B', '#8E24AA', '#F4511E', '#5E6BC0', '#00838F'] as const;

export function tintFor(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  return avatarTints[hash % avatarTints.length];
}

/** `h:mm:ss` past an hour, `m:ss` below it — the badge convention viewers expect. */
export function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return null;
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Thumbnails come straight from the image CDN by video id, so the feed looks right before the
 * metadata provider exists. `hq720` is the 16:9 rendition; `mqdefault` is the always-present
 * fallback for older uploads that never got one.
 */
export function thumbnailUrls(video: { youtubeVideoId: string; thumbnailUrl?: string }) {
  const cdn = `https://i.ytimg.com/vi/${video.youtubeVideoId}`;
  return {
    primary: video.thumbnailUrl ?? `${cdn}/hq720.jpg`,
    fallback: `${cdn}/mqdefault.jpg`,
  };
}
