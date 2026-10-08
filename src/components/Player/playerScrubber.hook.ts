import { useRef, useState } from 'react';
import { View } from 'react-native';

export function usePlayerScrubber(positionMs: number, bufferedMs: number, durationMs: number) {
  const trackRef = useRef<View>(null);
  const geom = useRef({ left: 0, width: 0 });
  const [dragMs, setDragMs] = useState<number | null>(null);
  const enabled = durationMs > 0;
  const ratio = (ms: number) => (enabled ? Math.min(Math.max(ms / durationMs, 0), 1) : 0);
  const played = ratio(dragMs ?? positionMs);
  const buffered = ratio(bufferedMs);
  const positionFrom = (pageX: number) => {
    const { left, width } = geom.current;
    if (width <= 0) return null;
    return Math.min(Math.max((pageX - left) / width, 0), 1) * durationMs;
  };
  const measure = () => {
    const node = trackRef.current;
    if (!node) return;
    node.measureInWindow((x, _y, width) => {
      geom.current = { left: x, width };
    });
  };
  return { trackRef, dragMs, setDragMs, enabled, played, buffered, positionFrom, measure };
}
