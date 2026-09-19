package com.nestling.youtubeplayer

import android.app.Activity
import android.content.Context
import android.content.pm.ActivityInfo
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException as Media3PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
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
  executor: ExecutorService = Executors.newSingleThreadExecutor(),
) {
  private val resolverExecutor: ExecutorService = executor
  private val progressIntervalMs = 500L

  private var currentVideoId: String? = null
  private var requestGeneration = 0L
  private var retryAttempt = 0
  private var resumePositionMs = 0L
  private var recovering = false
  private var ticking = false
  private var destroyed = false
  private var attachedView: PlayerView? = null
  private var fullscreenActive = false

  private val retryRunnable = Runnable { refreshAndResume() }

  val player: ExoPlayer = ExoPlayer.Builder(context)
    .setMediaSourceFactory(DefaultMediaSourceFactory(context))
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
      exoPlayer.addListener(object : Player.Listener {
        override fun onPlaybackStateChanged(playbackState: Int) {
          when (playbackState) {
            Player.STATE_BUFFERING -> emit("onBuffer", event())
            Player.STATE_READY -> {
              recovering = false
              emit("onReady", event())
            }
            Player.STATE_ENDED -> {
              resumePositionMs = 0L
              emit("onEnd", event())
            }
          }
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
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
          handlePlaybackFailure(classifyPlaybackError(error))
        }
      })
    }

  fun isDestroyed() = destroyed

  /** Binds the player to a PlayerView. Safe to call again after a detach. */
  fun attach(playerView: PlayerView) {
    if (destroyed) return
    attachedView = playerView
    playerView.player = player
    playerView.useController = true
    playerView.controllerShowTimeoutMs = 3_000
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

  fun play(videoId: String, autoplay: Boolean = true) {
    val normalizedId = videoId.trim()
    if (normalizedId.isEmpty()) {
      emitError(PlaybackCodes.INVALID_VIDEO_ID)
      return
    }
    if (destroyed) return

    cancelPendingRetry()
    // A new play request restores the retry budget; recovery chains never reset it.
    retryAttempt = 0
    recovering = false
    currentVideoId = normalizedId
    resumePositionMs = 0L
    emit("onLoad", event())
    resolveAndPrepare(normalizedId, ++requestGeneration, startPositionMs = 0L, autoplay = autoplay)
  }

  fun pause() {
    updatePositionTracking()
    player.pause()
  }

  fun resume(videoId: String) {
    val normalizedId = videoId.trim()
    if (currentVideoId != normalizedId) {
      play(normalizedId, true)
      return
    }
    if (destroyed) return

    val failed = player.playerError != null || player.playbackState == Player.STATE_IDLE
    if (failed) {
      cancelPendingRetry()
      retryAttempt = 0
      recovering = false
      resolveAndPrepare(normalizedId, ++requestGeneration, resumePositionMs, autoplay = true)
      return
    }
    player.play()
  }

  fun seek(positionMs: Long) {
    player.seekTo(positionMs.coerceAtLeast(0L))
    updatePositionTracking()
  }

  fun seekBy(deltaMs: Long) = seek(player.currentPosition + deltaMs)

  fun setVolume(volume: Float) {
    player.volume = volume.coerceIn(0f, 1f)
  }

  fun setFullscreen(fullscreen: Boolean) {
    fullscreenActive = fullscreen
    applyFullscreen(fullscreen)
  }

  fun toggle() {
    if (player.isPlaying) pause() else player.play()
  }

  fun stop() {
    cancelPendingRetry()
    requestGeneration++
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
    progressTick()
  }

  fun release() {
    if (destroyed) return
    destroyed = true
    ticking = false
    cancelPendingRetry()
    mainHandler.removeCallbacksAndMessages(null)
    detach()
    if (fullscreenActive) applyFullscreen(false)
    resolverExecutor.shutdownNow()
    player.release()
  }

  private fun progressTick() {
    if (destroyed || !ticking) return
    updatePositionTracking()
    emit("onProgress", event())
    mainHandler.postDelayed({ progressTick() }, progressIntervalMs)
  }

  private fun resolveAndPrepare(videoId: String, generation: Long, startPositionMs: Long, autoplay: Boolean) {
    val task = Runnable {
      val result = runCatching { resolver.resolve(videoId) }
      mainHandler.post {
        if (destroyed || generation != requestGeneration) return@post
        result
          .onSuccess { info -> prepare(info, startPositionMs, autoplay) }
          .onFailure { error ->
            val code = (error as? PlaybackException)?.code ?: PlaybackCodes.RESOLVER_UNAVAILABLE
            handlePlaybackFailure(code)
          }
      }
    }
    try {
      resolverExecutor.execute(task)
    } catch (_: RejectedExecutionException) {
      // The controller was released while resolving.
    }
  }

  private fun prepare(info: PlaybackInfo, startPositionMs: Long, autoplay: Boolean) {
    val mediaItem = createMediaItem(info)
    if (mediaItem == null) {
      emitError(PlaybackCodes.UNSUPPORTED_FORMAT)
      return
    }
    // A fresh MediaSource is always created: stream URLs are short-lived and never reused.
    player.setMediaItem(mediaItem, startPositionMs.coerceAtLeast(0L))
    player.prepare()
    player.playWhenReady = autoplay
  }

  private fun handlePlaybackFailure(code: String) {
    if (destroyed) return
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
    resolveAndPrepare(videoId, ++requestGeneration, resumePositionMs, autoplay = true)
  }

  private fun cancelPendingRetry() {
    mainHandler.removeCallbacks(retryRunnable)
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

  private fun createMediaItem(info: PlaybackInfo): MediaItem? {
    val source = info.manifestUrl ?: info.videoUrl ?: info.audioUrl ?: return null
    val builder = MediaItem.Builder()
      .setMediaId(info.videoId)
      .setUri(source)
    info.mimeType?.let { builder.setMimeType(it) }
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
    private const val GENERIC_ERROR_MESSAGE = "This video can't be played right now."
  }
}
