import { setNativeDownloadModule } from '../services/downloadService';
import type { PlayerAdapter } from '../services/playerAdapter.type';
import type { PlayerErrorCode } from '../services/playerErrors.type';
import NativeYouTubePlayer from './YouTubePlayerModule';
import type { PlayerCommandResult } from './YouTubePlayerModule.type';
import { setNativeMetadataModule } from '../services/content/nativeYouTubeContentProvider';

function requireNativePlayer() {
  if (!NativeYouTubePlayer) {
    throw new Error('Native kidTube player is unavailable. Build with npx expo run:android.');
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

  /** Best-effort: a rejection (policy-blocked, or the module being unavailable) is never an error here. */
  async prefetch(videoId: string) {
    try {
      await requireNativePlayer().prefetch(videoId);
    } catch {
      // Nothing to do — the eventual `play()`/`resume()` just resolves normally instead.
    }
  }

  setFullscreen(fullscreen: boolean) {
    return requireNativePlayer().setFullscreen(fullscreen).then(() => undefined);
  }
}

export const nativeYouTubePlayerAdapter = new NativeYouTubePlayerAdapter();

// Hand the metadata surface to the content provider. This file already owns the native module and
// is only ever reached from the app, so the pure-logic tests never load expo-modules-core.
setNativeMetadataModule(NativeYouTubePlayer ?? null);

setNativeDownloadModule(NativeYouTubePlayer ?? null);
