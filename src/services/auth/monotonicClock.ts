import { Platform } from 'react-native';
import nativePlayerModule from '../../native/YouTubePlayerModule';

/**
 * Milliseconds since the device booted, or null where that is unavailable (iOS, tests, a build
 * without the native module). It keeps counting through sleep and does not move when someone
 * changes the date, which is why the PIN lockout measures its delay with it.
 */
export function elapsedSinceBoot(): number | null {
  if (Platform.OS !== 'android') return null;
  try {
    const value = nativePlayerModule?.getElapsedRealtime?.();
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
