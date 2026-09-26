package com.nestling.youtubeplayer

import android.util.Log
import java.util.Collections
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

/**
 * Lets the "up next" video's stream be resolved before it is actually played, so switching to it
 * pays only the (already-cached) network fetch for its bytes, not the NewPipe resolve latency too
 * — the same thing YouTube's own app does. Resolution is the slow part of starting a new video
 * (a scrape-based HTTP round trip); playing it is comparatively instant once the URLs are known.
 *
 * Deliberately its own object rather than something `ExoPlayerController` owns: the controller (and
 * its `ExoPlayer`) can be destroyed and recreated across a background/foreground cycle, but a
 * prefetch kicked off before that must not be lost with it.
 */
object ResolvedStreamCache {
  /** Generous relative to how soon a prefetched video is actually used (tens of seconds), and
   *  short enough that a resolved-but-never-played entry cannot linger meaningfully. */
  private const val MAX_AGE_MS = 5 * 60 * 1000L

  private data class Entry(val info: PlaybackInfo, val resolvedAtMs: Long)

  private val resolver: YouTubePlaybackResolver = AuthorizedPlaybackResolver()
  private val executor: ExecutorService = Executors.newSingleThreadExecutor()
  private val entries = Collections.synchronizedMap(mutableMapOf<String, Entry>())

  /** Best-effort and idempotent: a video already cached or already resolving is left alone. */
  fun prefetch(videoId: String) {
    if (entries.containsKey(videoId)) return
    try {
      executor.execute {
        val result = runCatching { resolver.resolve(videoId, preferAdaptive = true) }
        result.onSuccess { info ->
          entries[videoId] = Entry(info, System.currentTimeMillis())
          Log.i(TAG, "prefetch($videoId) cached")
        }
        result.onFailure { error ->
          // Never surfaced as a playback error — the eventual `play()`/`resume()` just resolves
          // normally, exactly as if this had never been attempted.
          Log.w(TAG, "prefetch($videoId) failed, will resolve normally on play", error)
        }
      }
    } catch (rejected: RejectedExecutionException) {
      Log.w(TAG, "prefetch($videoId): executor rejected", rejected)
    }
  }

  /** Consumes and returns a fresh entry, or null on a miss/stale/in-flight — caller resolves as usual. */
  fun takeIfFresh(videoId: String): PlaybackInfo? {
    val entry = entries.remove(videoId) ?: return null
    if (System.currentTimeMillis() - entry.resolvedAtMs > MAX_AGE_MS) return null
    return entry.info
  }

  private const val TAG = "ResolvedStreamCache"
}
