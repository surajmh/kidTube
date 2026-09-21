/**
 * Duration formatting, shared by every surface that shows one.
 *
 * It previously existed twice with different behaviour for a missing value -- one returned an
 * em dash, the other null -- which meant "no duration" rendered inconsistently. Returning null
 * is the honest answer; each caller decides what to show in its place.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/** `h:mm:ss` past an hour, `m:ss` below it. Null when there is no usable duration. */
export function formatDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) return null;
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / HOUR);
  const minutes = Math.floor((whole % HOUR) / MINUTE);
  const secs = whole % MINUTE;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}
