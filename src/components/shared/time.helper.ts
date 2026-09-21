/**
 * Clock-time helpers, shared by every surface that edits a schedule.
 *
 * `minutesToTime` previously existed in three places. All of them worked in minutes from
 * midnight, so the conversions belong in one module rather than being retyped per panel.
 */

export const MINUTES_IN_DAY = 24 * 60;

/** Normalises any minute offset into the day, wrapping rather than producing an impossible time. */
function withinDay(value: number): number {
  return ((value % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
}

/** Minutes from midnight as a 12-hour clock time, e.g. `7:30 PM`. */
export function minutesToTime(value: number): string {
  const normalised = withinDay(value);
  const hour = Math.floor(normalised / 60);
  const minute = normalised % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** Minutes from midnight as a 24-hour `HH:MM` value for a text field. */
export function minutesToInput(value: number): string {
  const normalised = withinDay(value);
  return `${String(Math.floor(normalised / 60)).padStart(2, '0')}:${String(normalised % 60).padStart(2, '0')}`;
}

/**
 * Parses `HH:MM` back to minutes from midnight.
 *
 * Returns null for anything it cannot read, so a half-typed field never silently becomes a real
 * time: the caller keeps the previous value rather than writing 0 or NaN into a schedule.
 */
export function parseTime(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}
