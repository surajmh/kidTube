import type { Feather } from '@expo/vector-icons';
import { colors } from '../theme';

/** Icon and colour for a content request's status; anything but pending/approved reads as declined. */
export function requestStatusVisual(status: string, palette = colors): { icon: keyof typeof Feather.glyphMap; color: string } {
  if (status === 'pending') return { icon: 'clock', color: palette.yellow };
  if (status === 'approved') return { icon: 'check-circle', color: palette.mintDark };
  return { icon: 'x-circle', color: palette.danger };
}

/**
 * Width of a comparison bar, as a percentage of the largest value.
 *
 * Guards both ends: a zero maximum would divide by zero on an empty week, and a value larger
 * than the maximum would overflow the track.
 */
export function barWidthPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const safeMax = Math.max(1, Number.isFinite(max) ? max : 1);
  return Math.min(100, (value / safeMax) * 100);
}
