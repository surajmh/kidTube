package com.nestling.youtubeplayer

import android.content.Context
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import java.io.File

/** Process-wide byte cache. Default URI keys keep different encodings and revisions separate. */
object MediaCache {
  private const val MAX_BYTES = 300L * 1024 * 1024

  @Volatile
  private var cache: SimpleCache? = null

  private fun getOrCreate(context: Context): SimpleCache = cache ?: synchronized(this) {
    cache ?: SimpleCache(
      File(context.cacheDir, "nestling_media_cache"),
      LeastRecentlyUsedCacheEvictor(MAX_BYTES),
      StandaloneDatabaseProvider(context),
    ).also { cache = it }
  }

  /** A cache-wrapped data source factory, standing in for what `DefaultMediaSourceFactory` would otherwise build on its own. */
  fun dataSourceFactory(context: Context): CacheDataSource.Factory {
    return CacheDataSource.Factory()
      .setCache(getOrCreate(context))
      .setUpstreamDataSourceFactory(DefaultDataSource.Factory(context))
      // A cache miss, or any error reading the cache itself, still falls through to the network
      // read — this must never be why a video fails to play.
      .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
  }
}
