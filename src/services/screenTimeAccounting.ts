import type { AccountingOptions, AccountingResult } from './screenTimeAccounting.type';

export const defaultMaxDeltaMs = 5_000;

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
