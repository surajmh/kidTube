package com.nestling.youtubeplayer

/**
 * Deliberately contains only playback data. YouTube-specific request/response types must stay
 * inside the resolver implementation and never cross into the React Native bridge.
 */
data class PlaybackInfo(
  val videoId: String,
  val durationMs: Long? = null,
  val videoUrl: String? = null,
  val audioUrl: String? = null,
  val manifestUrl: String? = null,
  val mimeType: String? = null,
  val width: Int? = null,
  val height: Int? = null,
)

data class PlaybackResult(
  val accepted: Boolean,
  val message: String? = null,
)

object PlaybackCodes {
  const val INVALID_VIDEO_ID = "invalid_video_id"
  const val RESOLVER_UNAVAILABLE = "resolver_unavailable"
  const val VIDEO_UNAVAILABLE = "video_unavailable"
  const val UNSUPPORTED_FORMAT = "unsupported_format"
  const val PLAYBACK_FAILURE = "playback_failure"

  /** Network or transport failure: recoverable by refreshing playback information. */
  const val NETWORK_ERROR = "network_error"

  /** The short-lived stream URL stopped working: recoverable by refreshing playback information. */
  const val STREAM_EXPIRED = "stream_expired"
}
