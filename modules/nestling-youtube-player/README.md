# Nestling YouTube player

This local Expo module owns the Android Media3/ExoPlayer implementation and is designed for
Android phones, tablets, and TV. The same player controller handles touch and TV D-pad input;
left/right seeks by 10 seconds, media play/pause is supported, and the native command surface includes volume and landscape fullscreen. `QualitySelector` keeps Auto/720p/1080p policy isolated from the resolver.

## Resolver boundary

`YouTubePlaybackResolver` is intentionally an authorized-source boundary. It must be implemented
by a permitted playback provider that returns short-lived `PlaybackInfo` data. The module does not
contain InnerTube, SABR, scraping, stream extraction, ad blocking, or YouTube-specific request
emulation. Temporary stream URLs are never persisted.

Until an authorized resolver is supplied, the native player fails closed with a child-safe error.

## Build

This is a native module and requires a development build/custom Android build, not Expo Go:

```bash
npx expo prebuild
npx expo run:android
```
