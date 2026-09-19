package com.nestling.youtubeplayer

/**
 * Resolves an approved video ID into short-lived, authorized playback data.
 *
 * This boundary intentionally does not contain InnerTube, SABR, scraping, or stream extraction.
 * A production resolver must be supplied through a permitted backend/provider that returns
 * short-lived media URLs or a DASH manifest. The ExoPlayer layer remains unchanged when the
 * resolver is replaced.
 */
interface YouTubePlaybackResolver {
  fun resolve(videoId: String): PlaybackInfo
}

class AuthorizedPlaybackResolver : YouTubePlaybackResolver {
  override fun resolve(videoId: String): PlaybackInfo {
    throw PlaybackException(
      PlaybackCodes.RESOLVER_UNAVAILABLE,
      "This player needs an authorized playback source.",
    )
  }
}

class PlaybackException(val code: String, override val message: String) : Exception(message)
