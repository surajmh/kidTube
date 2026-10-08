import { isCanonicalChannelId } from './content/channelSyncRules';

/**
 * A link, an @handle or a UC… id names exactly one channel; anything else is a name to search for.
 * A bare word such as "cocomelon" is deliberately a name: guessing it is a handle can land on the
 * wrong channel, whereas a search shows what it found.
 */
export function isExactChannelReference(input: string): boolean {
  const text = input.trim();
  if (!text) return false;
  return text.startsWith('@') || /^(https?:\/\/|www\.|m\.youtube\.com|youtube\.com|youtu\.be)/i.test(text) || isCanonicalChannelId(text);
}

/** "1.2M", "850K", "12" — the short counts a channel card shows. */
export function compactCount(value: number | undefined): string | null {
  if (value === undefined || !Number.isFinite(value) || value < 0) return null;
  if (value >= 1_000_000) return `${trimZero(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trimZero(value / 1_000)}K`;
  return String(Math.floor(value));
}

function trimZero(value: number) {
  return (value >= 100 ? Math.round(value) : Math.round(value * 10) / 10).toString();
}

/** `m:ss`, or `h:mm:ss` past an hour. */
export function formatLength(seconds: number | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = String(whole % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}
