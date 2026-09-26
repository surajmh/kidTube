package com.nestling.youtubeplayer

import android.content.Context
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.CacheKeyFactory
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import java.io.File
import java.util.Collections

/**
 * An on-disk cache for resolved video/audio bytes, shared by every playback session in the
 * process — `SimpleCache` enforces at most one open instance per directory, so this is a
 * singleton rather than something each `ExoPlayerController` owns.
 *
 * Kids replay the same few-minute songs constantly. Without this, every replay re-fetched the
 * same bytes over the network from scratch, because the resolved stream URLs are short-lived and
 * re-signed on every resolve — the raw URL can never be a usable cache key on its own.
 */
object MediaCache {
  private const val MAX_BYTES = 300L * 1024 * 1024

  @Volatile
  private var cache: SimpleCache? = null

  /**
   * Maps a resolved URL to a key that stays the same across resolves of the same video/track/
   * quality, so a later replay (a fresh, differently-signed URL) still lands on the bytes an
   * earlier resolve already cached. Registered by the resolver at the moment each URL is turned
   * into a `MediaItem` — see `ExoPlayerController.mediaItem`. Grows for the life of the process;
   * a family session realistically touches at most a few hundred videos, so this is not worth
   * bounding.
   */
  private val stableKeysByUrl = Collections.synchronizedMap(mutableMapOf<String, String>())

  fun registerStableKey(url: String, stableKey: String) {
    stableKeysByUrl[url] = stableKey
  }

  private fun getOrCreate(context: Context): SimpleCache = cache ?: synchronized(this) {
    cache ?: SimpleCache(
      File(context.cacheDir, "nestling_media_cache"),
      LeastRecentlyUsedCacheEvictor(MAX_BYTES),
      StandaloneDatabaseProvider(context),
    ).also { cache = it }
  }

  /** A cache-wrapped data source factory, standing in for what `DefaultMediaSourceFactory` would otherwise build on its own. */
  fun dataSourceFactory(context: Context): CacheDataSource.Factory {
    val cacheKeyFactory = CacheKeyFactory { dataSpec ->
      stableKeysByUrl[dataSpec.uri.toString()] ?: dataSpec.uri.toString()
    }
    return CacheDataSource.Factory()
      .setCache(getOrCreate(context))
      .setUpstreamDataSourceFactory(DefaultDataSource.Factory(context))
      .setCacheKeyFactory(cacheKeyFactory)
      // A cache miss, or any error reading the cache itself, still falls through to the network
      // read — this must never be why a video fails to play.
      .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
  }
}
