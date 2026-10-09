import { useRef, useState } from 'react';
import { Platform, type GestureResponderEvent } from 'react-native';
import { formatDuration } from './player.helper';

export function usePlayerGestures(positionMs: number, durationMs: number, onSeek: (ms: number) => void, presentation: { minimized?: boolean; onMinimize?: () => void; onExpand?: () => void; onClose?: () => void } = {}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState<number | undefined>();
  const [feedback, setFeedback] = useState('');
  const size = useRef({ width: 1, height: 1 });
  const start = useRef({ x: 0, y: 0, position: 0, volume: 1, brightness: 0.5 });
  const mode = useRef<'seek' | 'volume' | 'brightness' | 'fullscreen' | 'dismiss' | null>(null);
  const target = useRef(0);
  function move(event: GestureResponderEvent) {
    if (event.nativeEvent.touches.length > 1) return;
    const dx = event.nativeEvent.locationX - start.current.x;
    const dy = event.nativeEvent.locationY - start.current.y;
    if (!mode.current && Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
    mode.current ??= presentation.minimized ? (Math.abs(dx) > Math.abs(dy) ? 'dismiss' : 'fullscreen')
      : !fullscreen && presentation.onMinimize && Math.abs(dy) >= Math.abs(dx) ? 'fullscreen'
      : Math.abs(dx) > Math.abs(dy) ? 'seek'
      : start.current.x < size.current.width * 0.25 ? 'brightness'
      : start.current.x > size.current.width * 0.75 ? 'volume' : 'fullscreen';
    if (mode.current === 'seek') {
      target.current = Math.round(Math.max(0, Math.min(durationMs, start.current.position + dx / size.current.width * 120_000)));
      setFeedback(`Seek to ${formatDuration(Math.round(target.current / 1000))}`);
    } else if (mode.current === 'dismiss') {
      target.current = dx;
      setFeedback('Close mini player');
    } else if (mode.current === 'fullscreen') {
      target.current = dy;
      setFeedback(presentation.minimized ? 'Expand player' : dy < 0 ? 'Enter fullscreen' : fullscreen ? 'Exit fullscreen' : 'Minimize player');
    } else {
      const value = Math.max(0, Math.min(1, start.current[mode.current] - dy / size.current.height));
      if (mode.current === 'volume') setVolume(value); else setBrightness(Math.max(0.01, value));
      setFeedback(`${mode.current === 'volume' ? 'Volume' : 'Brightness'} ${Math.round(value * 100)}%`);
    }
  }
  return {
    fullscreen, setFullscreen, volume, setVolume, brightness, setBrightness, feedback,
    handlers: {
      onLayout: (event: { nativeEvent: { layout: { width: number; height: number } } }) => { size.current = event.nativeEvent.layout; },
      onStartShouldSetResponder: () => !Platform.isTV,
      onResponderGrant: (event: GestureResponderEvent) => {
        start.current = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY, position: positionMs, volume, brightness: brightness ?? 0.5 };
        mode.current = null;
        // Block the native ScrollView before it can take the first vertical move.
        return true;
      },
      onResponderMove: move,
      onResponderTerminationRequest: () => false,
      onResponderRelease: () => {
        if (mode.current === 'seek' && durationMs > 0) onSeek(target.current);
        if (mode.current === 'dismiss' && Math.abs(target.current) >= 48) presentation.onClose?.();
        if (mode.current === 'fullscreen' && Math.abs(target.current) >= 48) {
          if (presentation.minimized) { if (target.current < 0) presentation.onExpand?.(); }
          else if (target.current > 0 && !fullscreen && presentation.onMinimize) presentation.onMinimize();
          else setFullscreen(target.current < 0);
        }
        const tapped = mode.current === null;
        mode.current = null;
        setFeedback('');
        return tapped;
      },
      onResponderTerminate: () => { mode.current = null; setFeedback(''); },
    },
  };
}
