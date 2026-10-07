package com.nestling.youtubeplayer

import android.app.Activity
import android.content.Context
import android.content.pm.ActivityInfo
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.KeyEvent
import android.view.View
import android.util.Log
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException as Media3PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.Timeline
import androidx.media3.exoplayer.analytics.AnalyticsListener
import org.json.JSONObject
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.LoadControl
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.source.MergingMediaSource
import androidx.media3.extractor.DefaultExtractorsFactory
import androidx.media3.ui.PlayerView
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.RejectedExecutionException

/**
 * Owns exactly one ExoPlayer and one resolver executor for one playback surface.
 *
 * Recovery model (bounded):
 *
 *   error -> refresh playback information -> rebuild the MediaSource -> resume from the last
 *   known position, with exponential backoff and a fixed attempt budget per playback session.
 *
 * Only the video id and the playback position survive a refresh; short-lived stream URLs live in
 * memory for the current MediaSource and are never persisted.
 */
class ExoPlayerController(
  private val context: Context,
  private val emit: (String, Map<String, Any>) -> Unit,
  private val resolver: YouTubePlaybackResolver = AuthorizedPlaybackResolver(),
  private val retryPolicy: PlaybackRetryPolicy = PlaybackRetryPolicy(),
  private val mainHandler: Handler = Handler(Looper.getMainLooper()),
  private val bufferStallTimeoutMs: Long = 15_000L,
  executor: ExecutorService = Executors.newSingleThreadExecutor(),
) {
  private val resolverExecutor: ExecutorService = executor
  private val progressIntervalMs = 500L

  private var currentVideoId: String? = null
  @Volatile private var requestGeneration = 0L
  private var resolutionTask: Future<*>? = null
  private var retryAttempt = 0
  private var resumePositionMs = 0L
  private var recovering = false
  private var ticking = false
  @Volatile private var destroyed = false
  private var attachedView: PlayerView? = null
  private var fullscreenActive = false
  private var diagnosticSession = ""
  private var diagnosticStartedAt = 0L
  private var diagnosticFirstFrame = false

  private val retryRunnable = Runnable { refreshAndResume() }

  /**
   * A throttled stream can connect and trickle bytes just fast enough to never trip ExoPlayer's
   * own HTTP read-timeout, yet never fast enough to leave `STATE_BUFFERING` — the known failure
   * mode `AuthorizedPlaybackResolver`'s fallback progressive URLs describe. Without this, that
   * looks identical to "still loading" forever, with no error and no retry. This watchdog gives
   * every buffering spell a bounded window before treating it as the network failure it is,
   * which routes it through the existing bounded retry policy instead of hanging indefinitely.
   */
  private val bufferStallRunnable = Runnable {
    Log.w(TAG, "buffering stalled for ${bufferStallTimeoutMs}ms, treating as a network failure")
    handlePlaybackFailure(PlaybackCodes.NETWORK_ERROR)
  }

  val player: ExoPlayer = ExoPlayer.Builder(context)
    .setMediaSourceFactory(cachedMediaSourceFactory())
    .setLoadControl(loadControl())
    .setAudioAttributes(
      AudioAttributes.Builder()
        .setUsage(C.USAGE_MEDIA)
        .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
        .build(),
      true,
    )
    .build()
    .also { exoPlayer ->
      // Keeps the screen/CPU awake for the whole video on tablets and TV, and never while paused.
      exoPlayer.setWakeMode(C.WAKE_MODE_LOCAL)
      // The ladder tops out at 1080p: more costs battery and decode headroom the family
      // devices in this app's target do not have.
      exoPlayer.setTrackSelectionParameters(
        exoPlayer.trackSelectionParameters
          .buildUpon()
          .setMaxVideoSize(Int.MAX_VALUE, 1080)
          .build(),
      )
      exoPlayer.addListener(object : Player.Listener {
        override fun onPlaybackStateChanged(playbackState: Int) {
          diagnostic("state", mapOf("state" to playbackState, "positionMs" to exoPlayer.currentPosition, "playWhenReady" to exoPlayer.playWhenReady))
          when (playbackState) {
            Player.STATE_BUFFERING -> {
              emit("onBuffer", event())
              armBufferStallWatchdog()
            }
            Player.STATE_READY -> {
              recovering = false
              cancelBufferStallWatchdog()
              emit("onReady", event())
            }
            Player.STATE_ENDED -> {
              cancelBufferStallWatchdog()
              resumePositionMs = 0L
              emit("onEnd", event())
            }
            Player.STATE_IDLE -> cancelBufferStallWatchdog()
          }
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
          diagnostic("playing", mapOf("playing" to isPlaying, "positionMs" to exoPlayer.currentPosition))
          if (isPlaying) {
            recovering = false
            updatePositionTracking()
          } else {
            // A pause during recovery is ours, not the child's: don't report it.
            if (recovering) return
            updatePositionTracking()
          }
          emit(if (isPlaying) "onPlay" else "onPause", event(mapOf("isPlaying" to isPlaying)))
        }

        override fun onPlayerError(error: Media3PlaybackException) {
          val code = classifyPlaybackError(error)
          Log.w(TAG, "onPlayerError videoId=$currentVideoId errorCode=${error.errorCode} (${error.errorCodeName}) -> $code", error)
          cancelBufferStallWatchdog()
          handlePlaybackFailure(code)
        }
      })
      exoPlayer.addAnalyticsListener(object : AnalyticsListener {
        override fun onRenderedFirstFrame(eventTime: AnalyticsListener.EventTime, output: Any, renderTimeMs: Long) {
          if (eventTime.timeline.isEmpty) return
          val mediaId = eventTime.timeline.getWindow(eventTime.windowIndex, Timeline.Window()).mediaItem.mediaId
          if (mediaId != currentVideoId || diagnosticFirstFrame || diagnosticSession.isEmpty()) return
          diagnosticFirstFrame = true
          diagnostic("first_frame", mapOf("nativeStartToFrameMs" to (renderTimeMs - diagnosticStartedAt)))
        }

        override fun onDroppedVideoFrames(eventTime: AnalyticsListener.EventTime, droppedFrames: Int, elapsedMs: Long) {
          diagnostic("dropped_frames", mapOf("count" to droppedFrames, "intervalMs" to elapsedMs))
        }
      })
    }

  // Enabled only for a local capture: adb shell setprop log.tag.KidTubePerf DEBUG.
  private fun diagnostic(name: String, extra: Map<String, Any> = emptyMap()) {
    if (!Log.isLoggable("KidTubePerf", Log.DEBUG) || diagnosticSession.isEmpty()) return
    Log.i("KidTubePerf", JSONObject(buildMap<String, Any> {
      put("event", name)
      put("session", diagnosticSession)
      put("videoId", currentVideoId.orEmpty())
      put("elapsedMs", SystemClock.elapsedRealtime())
      putAll(extra)
    }).toString())
  }

  fun isDestroyed() = destroyed

  /** Binds the player to a PlayerView. Safe to call again after a detach. */
  fun attach(playerView: PlayerView) {
    if (destroyed) return
    attachedView = playerView
    playerView.player = player
    // The React Native layer draws all transport controls (an overlay with a scrubber, skips and
    // play/pause); the stock Media3 controller would compete with it for taps.
    playerView.useController = false
    playerView.setOnKeyListener { _, keyCode, event ->
      if (event.action != KeyEvent.ACTION_DOWN) return@setOnKeyListener false
      when (keyCode) {
        KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> { toggle(); true }
        KeyEvent.KEYCODE_DPAD_LEFT -> { seekBy(-10_000); true }
        KeyEvent.KEYCODE_DPAD_RIGHT -> { seekBy(10_000); true }
        else -> false
      }
    }
    startProgressTicking()
  }

  /** Drops the surface/player reference so nothing outlives the view. */
  fun detach() {
    attachedView?.player = null
    attachedView?.setOnKeyListener(null)
    attachedView = null
  }

  /**
   * `play`/`pause`/`resume`/`seek`/`setVolume`/`setFullscreen`/`stop` are called both from the
   * view's own main-thread key listener and from the module's `AsyncFunction`s — which Expo runs
   * on a dedicated background queue, never the main thread. ExoPlayer instances may only be
   * touched from the thread that created them (the main thread here); calling any of them
   * directly from that queue throws `IllegalStateException: Player is accessed on the wrong
   * thread` — silently, since these are void, fire-and-forget commands whose result arrives later
   * via events. Every entry point below hops onto `mainHandler` first so callers never need to
   * know or care which thread they were invoked from.
   */
  fun play(videoId: String, autoplay: Boolean = true) = onMainThread {
    val normalizedId = videoId.trim()
    if (normalizedId.isEmpty()) {
      emitError(PlaybackCodes.INVALID_VIDEO_ID)
      return@onMainThread
    }
    if (destroyed) return@onMainThread

    cancelPendingRetry()
    // A new play request restores the retry budget; recovery chains never reset it.
    retryAttempt = 0
    recovering = false
    currentVideoId = normalizedId
    diagnosticStartedAt = SystemClock.elapsedRealtime()
    diagnosticSession = "${System.identityHashCode(this)}:$diagnosticStartedAt"
    diagnosticFirstFrame = false
    diagnostic("start")
    resumePositionMs = 0L
    emit("onLoad", event())
    resolveAndPrepare(normalizedId, ++requestGeneration, startPositionMs = 0L, autoplay = autoplay)
  }

  fun pause() = onMainThread {
    diagnostic("pause_command")
    updatePositionTracking()
    player.pause()
  }

  fun resume(videoId: String) = onMainThread {
    diagnostic("resume_command")
    val normalizedId = videoId.trim()
    if (currentVideoId != normalizedId) {
      play(normalizedId, true)
      return@onMainThread
    }
    if (destroyed) return@onMainThread

    val failed = player.playerError != null || player.playbackState == Player.STATE_IDLE
    if (failed) {
      cancelPendingRetry()
      retryAttempt = 0
      recovering = false
      resolveAndPrepare(normalizedId, ++requestGeneration, resumePositionMs, autoplay = true)
      return@onMainThread
    }
    player.play()
  }

  fun seek(positionMs: Long) = onMainThread {
    diagnostic("seek_command", mapOf("targetMs" to positionMs))
    player.seekTo(positionMs.coerceAtLeast(0L))
    updatePositionTracking()
  }

  fun seekBy(deltaMs: Long) = onMainThread { seek(player.currentPosition + deltaMs) }

  fun setVolume(volume: Float) = onMainThread {
    player.volume = volume.coerceIn(0f, 1f)
  }

  fun setFullscreen(fullscreen: Boolean) = onMainThread {
    fullscreenActive = fullscreen
    applyFullscreen(fullscreen)
  }

  fun toggle() = onMainThread {
    if (player.isPlaying) pause() else player.play()
  }

  /** Runs `body` on `mainHandler` now if already there, or posts it, so it never re-enters twice. */
  private inline fun onMainThread(crossinline body: () -> Unit) {
    if (Looper.myLooper() == mainHandler.looper) body() else mainHandler.post { body() }
  }

  fun stop() = onMainThread {
    diagnostic("stop")
    cancelPendingRetry()
    cancelBufferStallWatchdog()
    requestGeneration++
    resolutionTask?.cancel(true)
    resolutionTask = null
    retryAttempt = 0
    recovering = false
    resumePositionMs = 0L
    player.playWhenReady = false
    player.stop()
    currentVideoId = null
  }

  /**
   * Called when the Activity goes to the background or the TV suspends.
   *
   * Playback is only ever *stopped* here. Resuming is the React Native layer's decision, because
   * that is where the parental playback policy lives and the native player must not bypass it.
   */
  fun onActivityBackground() {
    if (destroyed || !player.isPlaying) return
    updatePositionTracking()
    player.pause()
  }

  /** Idempotent: repeated calls must not create a second progress stream. */
  fun startProgressTicking() {
    if (destroyed || ticking) return
    ticking = true
    // The first tick is posted rather than run inline: attach() is reached from the view's own
    // constructor, and emitting an event before the view is mounted fails view creation outright.
    mainHandler.post { progressTick() }
  }

  fun release() {
    if (destroyed) return
    diagnostic("release")
    destroyed = true
    ticking = false
    cancelPendingRetry()
    cancelBufferStallWatchdog()
    mainHandler.removeCallbacksAndMessages(null)
    detach()
    if (fullscreenActive) applyFullscreen(false)
    resolutionTask?.cancel(true)
    resolutionTask = null
    resolverExecutor.shutdownNow()
    player.release()
  }

  private fun progressTick() {
    if (destroyed || !ticking) return
    updatePositionTracking()
    emit("onProgress", event())
    mainHandler.postDelayed({ progressTick() }, progressIntervalMs)
  }

  private fun resolveAndPrepare(
    videoId: String,
    generation: Long,
    startPositionMs: Long,
    autoplay: Boolean,
    preferAdaptive: Boolean = true,
  ) {
    resolutionTask?.cancel(true)
    resolutionTask = null
    diagnostic("resolve_start", mapOf("generation" to generation, "adaptive" to preferAdaptive))
    // Only the normal (non-recovery) path consults the prefetch cache: a `preferAdaptive = false`
    // call is a retry deliberately asking for the degraded fallback, and a stale adaptive-quality
    // entry from a prefetch would be exactly the wrong thing to hand it.
    if (preferAdaptive) {
      val cached = ResolvedStreamCache.takeIfFresh(videoId)
      if (cached != null) {
        diagnostic("resolve_end", mapOf("cached" to true, "generation" to generation))
        prepare(cached, startPositionMs, autoplay)
        return
      }
    }
    val task = Runnable {
      // Cancellation is cooperative; reject stale queued work before it makes any requests.
      if (destroyed || generation != requestGeneration || Thread.currentThread().isInterrupted) return@Runnable
      val result = runCatching { resolver.resolve(videoId, preferAdaptive) }
      mainHandler.post {
        if (destroyed || generation != requestGeneration) return@post
        result
          .onSuccess { info ->
            diagnostic("resolve_end", mapOf("cached" to false, "generation" to generation))
            prepare(info, startPositionMs, autoplay)
          }
          .onFailure { error ->
            Log.w("NestlingResolver", "resolveAndPrepare($videoId) threw", error)
            val code = (error as? PlaybackException)?.code ?: PlaybackCodes.RESOLVER_UNAVAILABLE
            handlePlaybackFailure(code)
          }
      }
    }
    try {
      resolutionTask = resolverExecutor.submit(task)
    } catch (rejected: RejectedExecutionException) {
      Log.w("NestlingResolver", "executor rejected id=$videoId", rejected)
    }
  }

  private fun prepare(info: PlaybackInfo, startPositionMs: Long, autoplay: Boolean) {
    diagnostic("prepare", mapOf("positionMs" to startPositionMs, "source" to if (info.manifestUrl != null) "hls" else if (info.audioUrl != null && info.videoUrl != null) "merged" else "progressive"))
    val source = createMediaSource(info)
    if (source == null) {
      Log.w(TAG, "prepare(${info.videoId}) resolved but no playable source: $info")
      emitError(PlaybackCodes.UNSUPPORTED_FORMAT)
      return
    }
    // A fresh MediaSource is always created: stream URLs are short-lived and never reused.
    player.setMediaSource(source, startPositionMs.coerceAtLeast(0L))
    player.prepare()
    player.playWhenReady = autoplay
  }

  private fun handlePlaybackFailure(code: String) {
    if (destroyed) return
    diagnostic("failure", mapOf("code" to code, "attempt" to retryAttempt))
    updatePositionTracking()
    player.playWhenReady = false

    if (!retryPolicy.isRecoverable(code) || retryAttempt >= retryPolicy.maxAttempts) {
      recovering = false
      emitError(code)
      return
    }

    retryAttempt += 1
    recovering = true
    val delayMs = retryPolicy.delayForAttempt(retryAttempt)
    emit(
      "onRetry",
      event(
        mapOf(
          "code" to code,
          "attempt" to retryAttempt,
          "attempts" to retryPolicy.maxAttempts,
          "delayMs" to delayMs,
        ),
      ),
    )
    mainHandler.removeCallbacks(retryRunnable)
    mainHandler.postDelayed(retryRunnable, delayMs)
  }

  /** Refreshes playback information and continues from the last known position. */
  private fun refreshAndResume() {
    if (destroyed || !recovering) return
    val videoId = currentVideoId ?: return
    emit("onBuffer", event())
    // The adaptive stream is what just failed, so recovery takes the plain progressive route:
    // 360p and throttled-proof, and better than a retry loop that re-requests a dead manifest.
    resolveAndPrepare(videoId, ++requestGeneration, resumePositionMs, autoplay = true, preferAdaptive = false)
  }

  private fun cancelPendingRetry() {
    mainHandler.removeCallbacks(retryRunnable)
  }

  /** Each buffering spell gets its own fresh window; entering `STATE_BUFFERING` again re-arms it. */
  private fun armBufferStallWatchdog() {
    mainHandler.removeCallbacks(bufferStallRunnable)
    mainHandler.postDelayed(bufferStallRunnable, bufferStallTimeoutMs)
  }

  private fun cancelBufferStallWatchdog() {
    mainHandler.removeCallbacks(bufferStallRunnable)
  }

  private fun updatePositionTracking() {
    val position = player.currentPosition
    if (position > 0L && position != C.TIME_UNSET) resumePositionMs = position
  }

  /**
   * Maps Media3 failures onto playback codes so the JS layer can tell a transient stream problem
   * (refresh and retry) from a permanently unavailable video (show a message, stop).
   */
  private fun classifyPlaybackError(error: Media3PlaybackException): String = when (error.errorCode) {
    Media3PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED,
    Media3PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT,
    -> PlaybackCodes.NETWORK_ERROR

    // A resumable HTTP failure usually means the short-lived stream URL went stale.
    Media3PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS -> PlaybackCodes.STREAM_EXPIRED

    Media3PlaybackException.ERROR_CODE_IO_FILE_NOT_FOUND,
    Media3PlaybackException.ERROR_CODE_IO_NO_PERMISSION,
    -> PlaybackCodes.VIDEO_UNAVAILABLE

    Media3PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED,
    Media3PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED,
    Media3PlaybackException.ERROR_CODE_PARSING_MANIFEST_MALFORMED,
    Media3PlaybackException.ERROR_CODE_PARSING_MANIFEST_UNSUPPORTED,
    -> PlaybackCodes.UNSUPPORTED_FORMAT

    else -> PlaybackCodes.PLAYBACK_FAILURE
  }

  private fun cachedMediaSourceFactory() =
    DefaultMediaSourceFactory(MediaCache.dataSourceFactory(context), DefaultExtractorsFactory())

  /**
   * Raises only the buffer ceiling above the default; start-up and rebuffer-resume thresholds stay
   * at ExoPlayer's own values, which are already fast (1s / 2s).
   *
   * `AuthorizedPlaybackResolver`'s fallback progressive streams are throttled server-side: they
   * trickle bytes just fast enough to avoid a read-timeout, but the rate is bursty rather than
   * flat, so a bigger reserve absorbs a temporary dip instead of draining into the buffer-stall
   * watchdog for what would have recovered on its own a second later.
   */
  private fun loadControl(): LoadControl =
    DefaultLoadControl.Builder()
      .setBufferDurationsMs(
        DefaultLoadControl.DEFAULT_MIN_BUFFER_MS,
        120_000,
        DefaultLoadControl.DEFAULT_BUFFER_FOR_PLAYBACK_MS,
        DefaultLoadControl.DEFAULT_BUFFER_FOR_PLAYBACK_AFTER_REBUFFER_MS,
      )
      .build()

  private fun createMediaSource(info: PlaybackInfo): MediaSource? {
    val factory = cachedMediaSourceFactory()
    val videoUrl = info.videoUrl
    val audioUrl = info.audioUrl

    // Anything above 360p is delivered as separate video-only and audio-only streams, which
    // ExoPlayer plays as one by merging them.
    if (info.manifestUrl == null && videoUrl != null && audioUrl != null) {
      return MergingMediaSource(
        factory.createMediaSource(mediaItem(info.videoId, videoUrl, info.mimeType, "video-${info.height ?: 0}")),
        factory.createMediaSource(mediaItem(info.videoId, audioUrl, null, "audio")),
      )
    }

    val single = info.manifestUrl ?: videoUrl ?: audioUrl ?: return null
    val variant = if (info.manifestUrl != null) "hls" else "muxed-${info.height ?: 0}"
    return factory.createMediaSource(mediaItem(info.videoId, single, info.mimeType, variant))
  }

  /**
   * `variant` distinguishes the video/audio/muxed/HLS-manifest track and (where relevant) its
   * resolved quality, so a video-only and an audio-only fetch for the same video — or the same
   * video resolved at two different qualities across retries — never collide on one cache entry.
   */
  private fun mediaItem(videoId: String, uri: String, mimeType: String?, variant: String): MediaItem {
    // The resolved URL is short-lived and re-signed on every resolve, so it cannot be the cache
    // key itself — this lets `MediaCache`'s `CacheKeyFactory` recover a key that stays the same
    // across resolves of the same video/track/quality, which is what makes a replay a cache hit.
    MediaCache.registerStableKey(uri, "$videoId:$variant")
    val builder = MediaItem.Builder()
      .setMediaId(videoId)
      .setUri(uri)
    mimeType?.let { builder.setMimeType(it) }
    return builder.build()
  }

  private fun applyFullscreen(fullscreen: Boolean) {
    val activity = findActivity(context) ?: return
    activity.requestedOrientation = if (fullscreen) {
      ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
    } else {
      ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
    }
    activity.window.decorView.systemUiVisibility = if (fullscreen) {
      View.SYSTEM_UI_FLAG_FULLSCREEN or
        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
    } else {
      0
    }
  }

  private fun emitError(code: String, message: String = GENERIC_ERROR_MESSAGE) {
    emit("onError", event(mapOf("code" to code, "message" to message)))
  }

  private fun findActivity(context: Context): Activity? {
    var current: Context? = context
    while (current is android.content.ContextWrapper) {
      if (current is Activity) return current
      current = current.baseContext
    }
    return current as? Activity
  }

  private fun event(extra: Map<String, Any> = emptyMap()): Map<String, Any> = buildMap {
    currentVideoId?.let { put("videoId", it) }
    put("position", player.currentPosition)
    player.duration.takeUnless { it == C.TIME_UNSET }?.let { put("duration", it) }
    put("bufferedPosition", player.bufferedPosition)
    put("isPlaying", player.isPlaying)
    putAll(extra)
  }

  companion object {
    private const val TAG = "ExoPlayerController"
    private const val GENERIC_ERROR_MESSAGE = "This video can't be played right now."
  }
}
