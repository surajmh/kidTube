export function formatLockRemaining(ms: number) {
  const totalSeconds = Math.max(1, Math.ceil(ms / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes} min ${String(seconds).padStart(2, '0')} s` : `${seconds} seconds`;
}
