# Nestling YouTube player

This isolated Expo module owns the Android Media3/ExoPlayer implementation and is designed for
Android phones, tablets, and TV. D-pad left/right seek by 10 seconds and media play/pause keys are
handled by `YouTubePlayerView`.

## Resolver boundary

`YouTubePlaybackResolver` is intentionally an authorized-source boundary. It must be implemented
by a permitted playback provider that returns short-lived `PlaybackInfo` data. The module does not
contain InnerTube, SABR, scraping, stream extraction, ad blocking, or YouTube-specific request
emulation. Temporary stream URLs are never persisted.

## Reliability

Failures recover in a bounded loop: classify -> refresh the resolver -> new MediaSource -> resume at
the last known position, with exponential backoff and a fixed attempt budget per playback session
(`PlaybackRetryPolicy`). Terminal failures (deleted/private video, unsupported container) never retry.

One `ExoPlayer`, one `PlayerView` binding and one progress loop exist per view. The controller is
released on window detach, on view destroy and on Activity destroy, and is recreated on re-attach, so
no player, surface or Activity reference outlives its view.

## Build

This is a native module and requires a development build/custom Android build, not Expo Go:

```bash
npx expo prebuild
npx expo run:android
```
