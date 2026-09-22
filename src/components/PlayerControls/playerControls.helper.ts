/**
 * Where a seek should land, clamped to the video.
 *
 * Skipping past either end is a normal thing to do -- pressing back-10 in the first second, or
 * forward-10 near the end -- so it clamps rather than refusing, and a zero or unknown duration
 * yields 0 instead of NaN.
 */
export function seekTarget(positionMs: number, deltaMs: number, durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 0;
  return Math.max(0, Math.min(positionMs + deltaMs, durationMs));
}

/** Fraction of the scrubber a touch landed at, clamped to 0..1. */
export function progressFromTouch(locationX: number, width: number): number {
  if (width <= 0) return 0;
  return Math.max(0, Math.min(locationX / width, 1));
}

/**
 * The elapsed label. Derived from progress rather than tracked separately so it can never
 * disagree with the bar the user is looking at.
 */
export function elapsedSeconds(progress: number, durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 0;
  return Math.round((durationMs / 1000) * Math.max(0, Math.min(progress, 1)));
}
