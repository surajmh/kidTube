/** `m:ss` for the scrubber's elapsed/total labels — never null, unlike the shared duration helper. */
export function formatDuration(seconds?: number) {
  if (!seconds) return '—';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}
