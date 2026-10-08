/**
 * Watch-time accounting.
 *
 * Time is credited from the *playhead* moving forward, never from wall clock time. That way:
 *  - a paused, buffering, backgrounded or recovering player cannot accrue time,
 *  - a delayed progress callback does not lose time it actually played,
 *  - seeking forward is not mistaken for watching (it is a jump, not playback).
 */
export type AccountingOptions = {
  /** Jumps larger than this are treated as seeks/discontinuities, not watch time. */
  maxDeltaMs?: number;
  playbackSpeed?: number;
};

export const defaultMaxDeltaMs = 5_000;

export type AccountingResult = {
  seconds: number;
  /** Position to compare against on the next sample. `null` stops accounting until playback resumes. */
  lastPositionMs: number | null;
};

export function accountPlayheadSample(
  previousPositionMs: number | null,
  positionMs: number,
  isPlaying: boolean,
  options: AccountingOptions = {},
): AccountingResult {
  if (!Number.isFinite(positionMs)) return { seconds: 0, lastPositionMs: null };
  if (!isPlaying) return { seconds: 0, lastPositionMs: null };
  if (previousPositionMs === null) return { seconds: 0, lastPositionMs: positionMs };

  const speed = options.playbackSpeed ?? 1;
  if (!Number.isFinite(speed) || speed < 0.25 || speed > 2) return { seconds: 0, lastPositionMs: null };
  const deltaMs = positionMs - previousPositionMs;
  const maxDeltaMs = options.maxDeltaMs ?? defaultMaxDeltaMs;
  if (deltaMs <= 0 || deltaMs / speed > maxDeltaMs) return { seconds: 0, lastPositionMs: positionMs };

  return { seconds: deltaMs / speed / 1000, lastPositionMs: positionMs };
}

/**
 * Keeps screen-time storage bounded: only the recent window is ever needed by the policy, the
 * dashboard, or the parents' screen-time screen.
 */
export function pruneUsageRecords<T extends { date: string }>(records: T[], now = new Date(), retentionDays = 30): T[] {
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - retentionDays + 1);
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
  return records.filter((record) => record.date >= cutoffKey);
}
