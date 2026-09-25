# Phase 2 native playback

kidTube now has an isolated Android Expo module at `modules/nestling-youtube-player`.

```text
React Native YouTubePlayer
  -> native Expo module
  -> ExoPlayerController / Media3
  -> YouTubePlaybackResolver boundary
  -> short-lived authorized Media3 source
```

## Native capabilities

- Media3/ExoPlayer controller and `PlayerView`
- Play, pause, resume, seek, stop
- Progress events every 500ms
- Load, ready, play, pause, buffering, progress, end, and error events
- Volume and landscape fullscreen commands
- Android TV-compatible focus and D-pad left/right seeking
- Lifecycle-safe player release
- Android-only local Expo module with `INTERNET` permission
- Automatic quality policy boundary for Auto, 720p, and 1080p

## Important playback boundary (remaining blocker)

The module intentionally does **not** implement SmartTube/InnerTube/SABR extraction, scraping,
stream URL discovery, or ad-blocking behavior. Those paths are unofficial YouTube extraction
mechanisms and are not embedded in this family app. `AuthorizedPlaybackResolver` fails closed until
a permitted playback provider supplies a short-lived DASH/HLS/progressive source for the approved
video ID. Temporary stream URLs are not persisted.

The React Native layer only passes a video ID after the existing `WhitelistService` check; it never
passes arbitrary network URLs to the native module.

## Build

This requires a custom Android development build, not Expo Go:

```bash
npx expo prebuild
npx expo run:android
```

Android TV and tablet builds use the same engine and view. The local machine must have a configured
JDK and Android SDK for Gradle compilation.
