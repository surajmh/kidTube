import { PlayerAdapter } from '../services/playerAdapter';
import { PlayerErrorCode } from '../services/playerErrors';
import NativeYouTubePlayer, { PlayerCommandResult } from './YouTubePlayerModule';

function requireNativePlayer() {
  if (!NativeYouTubePlayer) {
    throw new Error('Native Nestling player is unavailable. Build with npx expo run:android.');
  }
  return NativeYouTubePlayer;
}

/**
 * A rejected command must surface as an error rather than a silent no-op: the native allow list
 * refusing a video is exactly the case that must never look like "the video just didn't start".
 */
function ensureAccepted(result: PlayerCommandResult, fallbackCode: PlayerErrorCode = 'PLAYBACK_FAILURE') {
  if (result.accepted) return;
  const error = new Error(result.message ?? 'The player refused that command.') as Error & { code?: string };
  error.code = result.code ?? fallbackCode.toLowerCase();
  throw error;
}

export class NativeYouTubePlayerAdapter implements PlayerAdapter {
  setAllowedVideoIds(videoIds: string[]) {
    return requireNativePlayer().setAllowedVideoIds(videoIds).then(() => undefined);
  }

  play(videoId: string) {
    return requireNativePlayer().play(videoId).then((result) => ensureAccepted(result));
  }

  pause() {
    return requireNativePlayer().pause().then(() => undefined);
  }

  resume(videoId: string) {
    return requireNativePlayer().resume(videoId).then((result) => ensureAccepted(result));
  }

  seek(position: number) {
    return requireNativePlayer().seek(position).then((result) => ensureAccepted(result, 'PLAYBACK_FAILURE'));
  }

  stop() {
    return requireNativePlayer().stop().then(() => undefined);
  }

  setVolume(volume: number) {
    return requireNativePlayer().setVolume(volume).then(() => undefined);
  }

  setFullscreen(fullscreen: boolean) {
    return requireNativePlayer().setFullscreen(fullscreen).then(() => undefined);
  }
}

export const nativeYouTubePlayerAdapter = new NativeYouTubePlayerAdapter();
