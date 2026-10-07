package com.nestling.youtubeplayer

import android.util.Log
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

/** Process-local, short-lived stream URLs shared by playback and Up next resolution. */
object ResolvedStreamCache {
  private const val MAX_AGE_MS = 5 * 60 * 1000L
  private const val MAX_ENTRIES = 8
  private data class Entry(val info: PlaybackInfo, val resolvedAtMs: Long)
  private val entries = LinkedHashMap<String, Entry>(MAX_ENTRIES, 0.75f, true)
  private val pending = mutableMapOf<String, Any>()
  private val resolver: YouTubePlaybackResolver = AuthorizedPlaybackResolver()
  private val executor = Executors.newSingleThreadExecutor()

  private fun nowMs() = System.nanoTime() / 1_000_000L

  @Synchronized
  fun getIfFresh(videoId: String, atMs: Long = nowMs()): PlaybackInfo? {
    val entry = entries[videoId] ?: return null
    if (atMs - entry.resolvedAtMs >= MAX_AGE_MS) {
      entries.remove(videoId)
      return null
    }
    return entry.info
  }

  @Synchronized
  fun put(info: PlaybackInfo) {
    entries[info.videoId] = Entry(info, nowMs())
    if (entries.size > MAX_ENTRIES) entries.remove(entries.keys.first())
  }

  @Synchronized
  fun invalidate(videoId: String) {
    entries.remove(videoId)
    // A prefetch already in flight must not restore the failed entry.
    pending.remove(videoId)
  }

  @Synchronized
  fun prefetch(videoId: String) {
    if (getIfFresh(videoId) != null || pending.containsKey(videoId) || pending.size >= MAX_ENTRIES) return
    val token = Any()
    pending[videoId] = token
    try {
      executor.execute {
        try {
          val info = resolver.resolve(videoId, preferAdaptive = true)
          synchronized(this) {
            if (pending[videoId] === token) {
              pending.remove(videoId)
              put(info)
            }
          }
        } catch (error: Exception) {
          synchronized(this) { if (pending[videoId] === token) pending.remove(videoId) }
          Log.w(TAG, "prefetch($videoId) failed, will resolve normally on play", error)
        }
      }
    } catch (rejected: RejectedExecutionException) {
      pending.remove(videoId)
      Log.w(TAG, "prefetch($videoId): executor rejected", rejected)
    }
  }

  private const val TAG = "ResolvedStreamCache"
}
