import { useCallback, useEffect, useRef, useState } from 'react';
import { AUTO_HIDE_MS } from './playerControls.constant';
import { PlayerControlsHook } from './playerControls.type';

/**
 * Visibility of the control overlay.
 *
 * The rule that matters: controls only auto-hide while something is actually playing. Hiding
 * them over a paused or buffering video would leave a child tapping a black rectangle with no
 * way to tell the app is not broken.
 */
export function usePlayerControls(isPlaying: boolean): PlayerControlsHook {
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const arm = useCallback(() => {
    clear();
    if (!isPlaying) return;
    timer.current = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
  }, [clear, isPlaying]);

  const keepAlive = useCallback(() => {
    setVisible(true);
    arm();
  }, [arm]);

  const toggleVisible = useCallback(() => {
    setVisible((current) => {
      if (current) {
        clear();
        return false;
      }
      arm();
      return true;
    });
  }, [arm, clear]);

  // Pausing brings the controls back and cancels any pending hide; resuming starts the clock.
  useEffect(() => {
    if (!isPlaying) {
      clear();
      setVisible(true);
      return;
    }
    arm();
  }, [isPlaying, arm, clear]);

  useEffect(() => clear, [clear]);

  return { visible, toggleVisible, keepAlive };
}
