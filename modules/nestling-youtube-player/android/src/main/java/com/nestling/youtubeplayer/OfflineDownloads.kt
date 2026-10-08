package com.nestling.youtubeplayer

import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.StatFs
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.NoOpCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.offline.Download
import androidx.media3.exoplayer.offline.DownloadHelper
import androidx.media3.exoplayer.offline.DownloadManager
import androidx.media3.exoplayer.offline.DownloadRequest
import androidx.media3.exoplayer.offline.DownloadService
import androidx.media3.exoplayer.source.MediaSource
import expo.modules.kotlin.Promise
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.util.concurrent.Executors

/** Durable downloads are separate from the evictable streaming cache, and stay in private storage excluded from Android backup. */
object OfflineDownloads {
  private lateinit var context: Context
  private lateinit var cache: SimpleCache
  private var instance: DownloadManager? = null
  private val preparingPromises = mutableMapOf<String, Promise>()
  private val preparing = mutableMapOf<String, DownloadHelper>()
  private val http = DefaultHttpDataSource.Factory().setConnectTimeoutMs(15_000).setReadTimeoutMs(20_000)
  // Serial decoding/download selection keeps small tablets responsive.
  private val executor = Executors.newSingleThreadExecutor()
  private val main = Handler(Looper.getMainLooper())

  fun manager(appContext: Context): DownloadManager {
    check(Looper.myLooper() == Looper.getMainLooper())
    instance?.let { return it }
    context = appContext.applicationContext
    val database = StandaloneDatabaseProvider(context)
    cache = SimpleCache(File(context.noBackupFilesDir, "offline_media"), NoOpCacheEvictor(), database)
    return DownloadManager(context, database, cache, http, executor).also {
      instance = it
      it.maxParallelDownloads = 1
      it.minRetryCount = 2
      it.resumeDownloads()
    }
  }

  private fun metadata(request: DownloadRequest) = runCatching { JSONObject(String(request.data, Charsets.UTF_8)) }.getOrDefault(JSONObject())
  private fun expiry(request: DownloadRequest) = metadata(request).optLong("expiresAt", 0L)
  private fun permitted(request: DownloadRequest): Boolean {
    val prefs = context.getSharedPreferences("offline_lifecycle", Context.MODE_PRIVATE)
    val removedAt = maxOf(prefs.getLong("clearedAt", 0), prefs.getLong("removed:${request.id}", 0))
    return metadata(request).optLong("createdAt", 0L) > removedAt && expiry(request) > System.currentTimeMillis()
  }

  fun readyRequest(appContext: Context, videoId: String): DownloadRequest? {
    val manager = manager(appContext)
    val download = manager.downloadIndex.getDownload(videoId) ?: return null
    return download.request.takeIf { download.state == Download.STATE_COMPLETED && permitted(it) }
  }

  /** No upstream: a missing/corrupt saved segment fails, it can never fall through to the internet. */
  fun mediaSource(appContext: Context, videoId: String): MediaSource? {
    val request = readyRequest(appContext, videoId) ?: return null
    val source = CacheDataSource.Factory().setCache(cache)
      .setUpstreamDataSourceFactory(null).setCacheWriteDataSinkFactory(null)
    return DownloadHelper.createMediaSource(request.copyWithId(videoId), source)
  }

  fun list(appContext: Context): List<Map<String, Any>> {
    val manager = manager(appContext)
    val rows = mutableListOf<Map<String, Any>>()
    manager.downloadIndex.getDownloads().use { cursor ->
      while (cursor.moveToNext()) {
        val stored = cursor.download
        val download = manager.currentDownloads.firstOrNull { it.request.id == stored.request.id } ?: stored
        val expires = expiry(download.request)
        if (!permitted(download.request)) {
          if (download.state != Download.STATE_REMOVING) DownloadService.sendRemoveDownload(context, OfflineDownloadService::class.java, download.request.id, false)
          continue
        }
        val state = when (download.state) {
          Download.STATE_COMPLETED -> "ready"
          Download.STATE_FAILED -> "failed"
          Download.STATE_REMOVING -> "removing"
          Download.STATE_STOPPED -> "paused"
          else -> "downloading"
        }
        rows.add(mapOf("videoId" to download.request.id, "state" to state,
          "expiresAt" to expires, "bytes" to download.bytesDownloaded,
          "percent" to download.percentDownloaded.coerceAtLeast(0f)))
      }
    }
    preparing.keys.forEach { rows.add(mapOf("videoId" to it, "state" to "preparing", "percent" to 0, "bytes" to 0, "expiresAt" to 0)) }
    if (rows.any { it["state"] == "downloading" }) DownloadService.start(context, OfflineDownloadService::class.java)
    return rows
  }

  /** Called on main after stream resolution; authorization is checked again before enqueueing. */
  fun add(appContext: Context, info: PlaybackInfo, maxHeight: Int, expiresAt: Long, authorized: () -> Boolean, promise: Promise) {
    manager(appContext)
    if (!authorized()) { promise.reject("E_PARENT", "Parent mode is required.", null); return }
    if (preparing.containsKey(info.videoId)) { promise.reject("E_DOWNLOAD", "This video is already being prepared.", null); return }
    if (StatFs(context.filesDir.absolutePath).availableBytes < 64L * 1024 * 1024) {
      promise.reject("E_SPACE", "Free some device storage before saving a video.", null); return
    }
    val uri = info.manifestUrl ?: info.videoUrl
    if (uri == null || (info.manifestUrl == null && info.audioUrl != null)) {
      promise.reject("E_DOWNLOAD", "This video cannot be saved for travel.", null); return
    }
    val parameters = DownloadHelper.getDefaultTrackSelectorParameters(context).buildUpon()
      .setMaxVideoSize(Int.MAX_VALUE, maxHeight).setExceedVideoConstraintsIfNecessary(false)
      .setForceHighestSupportedBitrate(true).setPreferredTextLanguage("en").build()
    val item = MediaItem.Builder().setMediaId(info.videoId).setUri(Uri.parse(uri)).setMimeType(info.mimeType).build()
    val helper = DownloadHelper.Factory().setDataSourceFactory(http)
      .setRenderersFactory(DefaultRenderersFactory(context)).setTrackSelectionParameters(parameters).create(item)
    preparing[info.videoId] = helper
    preparingPromises[info.videoId] = promise
    helper.prepare(object : DownloadHelper.Callback {
      override fun onPrepared(helper: DownloadHelper, isPlayable: Boolean) {
        try {
          if (!authorized() || preparing[info.videoId] !== helper) throw IllegalStateException("Parent mode is required.")
          if (!isPlayable) throw IllegalStateException("This video cannot be saved at that quality.")
          if (info.manifestUrl != null) {
            val hasVideo = (0 until helper.periodCount).any { period ->
              val mapped = helper.getMappedTrackInfo(period)
              (0 until mapped.rendererCount).any { renderer ->
                mapped.getRendererType(renderer) == C.TRACK_TYPE_VIDEO && helper.getTrackSelections(period, renderer).isNotEmpty()
              }
            }
            if (!hasVideo) throw IllegalStateException("This video cannot be saved at that quality.")
          } else if ((info.height ?: 0) > maxHeight) throw IllegalStateException("This video cannot be saved at that quality.")
          val data = JSONObject().put("createdAt", System.currentTimeMillis()).put("expiresAt", expiresAt).toString().toByteArray(Charsets.UTF_8)
          val request = helper.getDownloadRequest(info.videoId, data)
          if (info.manifestUrl != null && request.streamKeys.isEmpty()) throw IllegalStateException("No downloadable video tracks were found.")
          DownloadService.sendAddDownload(context, OfflineDownloadService::class.java, request, false)
          promise.resolve(mapOf("accepted" to true))
        } catch (error: Exception) {
          promise.reject("E_DOWNLOAD", error.message, error)
        } finally {
          if (preparing[info.videoId] === helper) { preparing.remove(info.videoId); preparingPromises.remove(info.videoId) }
          helper.release()
        }
      }
      override fun onPrepareError(helper: DownloadHelper, error: IOException) {
        if (preparing[info.videoId] === helper) { preparing.remove(info.videoId); preparingPromises.remove(info.videoId) }
        helper.release()
        promise.reject("E_DOWNLOAD", "Could not prepare this video. Check your connection and try again.", error)
      }
    })
    // A dead endpoint must not leave the Save button waiting forever.
    main.postDelayed({
      if (preparing[info.videoId] === helper) {
        preparing.remove(info.videoId)
        preparingPromises.remove(info.videoId)
        helper.release()
        promise.reject("E_DOWNLOAD", "Preparing the download timed out. Try again.", null)
      }
    }, 45_000)
  }

  fun remove(appContext: Context, videoId: String) {
    manager(appContext)
    check(context.getSharedPreferences("offline_lifecycle", Context.MODE_PRIVATE).edit().putLong("removed:$videoId", System.currentTimeMillis()).commit()) { "Could not persist download removal." }
    preparing.remove(videoId)?.release()
    preparingPromises.remove(videoId)?.reject("E_DOWNLOAD", "Download cancelled.", null)
    DownloadService.sendRemoveDownload(context, OfflineDownloadService::class.java, videoId, false)
  }

  fun clear(appContext: Context) {
    manager(appContext)
    check(context.getSharedPreferences("offline_lifecycle", Context.MODE_PRIVATE).edit().putLong("clearedAt", System.currentTimeMillis()).commit()) { "Could not persist download reset." }
    preparing.values.forEach { it.release() }
    preparingPromises.values.forEach { it.reject("E_DOWNLOAD", "Download cancelled.", null) }
    preparingPromises.clear()
    preparing.clear()
    // Stop playback immediately, while Media3 removes the bytes asynchronously.
    DownloadService.sendRemoveAllDownloads(context, OfflineDownloadService::class.java, false)
  }
}
