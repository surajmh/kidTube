/** `m:ss` for the scrubber's elapsed/total labels — never null, unlike the shared duration helper. */
export function formatDuration(seconds?: number) {
  if (seconds === undefined) return '—';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

export function centerPlayLabel(hasEnded: boolean, isBuffering: boolean) {
  if (hasEnded) return 'Replay video';
  return isBuffering ? 'Buffering' : 'Play video';
}

export function nativeHint(isOffline: boolean, queueLabel?: string) {
  if (isOffline) return 'Playing a saved video';
  return queueLabel ? `Playing from ${queueLabel}` : 'Approved by your parent';
}
