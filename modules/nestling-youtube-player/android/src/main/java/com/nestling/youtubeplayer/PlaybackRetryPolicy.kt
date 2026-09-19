package com.nestling.youtubeplayer

/**
 * Bounded retry policy for recoverable playback failures.
 *
 * Recovery is a three step loop: error -> refresh the resolver -> rebuild the MediaSource and
 * resume from the last known position. It must never retry forever, so every playback session gets
 * a fixed budget that is only restored by a new user-initiated play/resume.
 */
class PlaybackRetryPolicy(
  val maxAttempts: Int = 3,
  private val baseDelayMs: Long = 1_000L,
  private val maxDelayMs: Long = 8_000L,
) {
  /** Transient failures worth refreshing the stream for. */
  fun isRecoverable(code: String): Boolean = when (code) {
    PlaybackCodes.NETWORK_ERROR,
    PlaybackCodes.STREAM_EXPIRED,
    PlaybackCodes.PLAYBACK_FAILURE,
    PlaybackCodes.RESOLVER_UNAVAILABLE,
    -> true

    else -> false
  }

  /** Exponential backoff with a ceiling: 1s, 2s, 4s, ... capped at [maxDelayMs]. */
  fun delayForAttempt(attempt: Int): Long {
    val safeAttempt = attempt.coerceAtLeast(1)
    val multiplier = 1L shl (safeAttempt - 1).coerceAtMost(16)
    return (baseDelayMs * multiplier).coerceAtMost(maxDelayMs)
  }
}
