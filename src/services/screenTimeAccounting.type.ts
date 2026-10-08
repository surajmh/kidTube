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

export type AccountingResult = {
  seconds: number;
  /** Position to compare against on the next sample. `null` stops accounting until playback resumes. */
  lastPositionMs: number | null;
};
