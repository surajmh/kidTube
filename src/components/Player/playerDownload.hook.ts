import { useCallback, useRef, useState } from 'react';
import { DOWNLOAD_COPY } from './playerDownload.constant';
import type { PlayerDownloadProps } from './playerDownload.type';

export function usePlayerDownload({ video, downloads }: PlayerDownloadProps) {
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<number[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);

  // The ref blocks a second tap before React has re-rendered the disabled button.
  const run = useCallback(async (task: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      console.warn('[downloads] save failed:', error instanceof Error ? error.message : error);
      setMessage(DOWNLOAD_COPY.failed);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);

  const press = useCallback(() => run(async () => {
    const heights = await downloads.options(video);
    if (heights.length === 0) throw new Error('no options');
    if (heights.length === 1) await downloads.start(video, heights[0]);
    else setChoices([...heights].sort((a, b) => b - a));
  }), [downloads, video, run]);

  const choose = useCallback((height: number) => {
    setChoices(null);
    return run(() => downloads.start(video, height));
  }, [downloads, video, run]);

  const cancel = useCallback(() => setChoices(null), []);

  return { item: downloads.itemFor(video), busy, choices, message, press, choose, cancel };
}
