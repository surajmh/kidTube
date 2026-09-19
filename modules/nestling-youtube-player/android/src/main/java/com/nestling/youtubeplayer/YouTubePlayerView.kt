package com.nestling.youtubeplayer

import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.widget.FrameLayout
import androidx.media3.ui.PlayerView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

class YouTubePlayerView(
  context: Context,
  appContext: AppContext,
) : ExpoView(context, appContext) {
  private val onLoad by EventDispatcher<Map<String, Any>>()
  private val onReady by EventDispatcher<Map<String, Any>>()
  private val onPlay by EventDispatcher<Map<String, Any>>()
  private val onPause by EventDispatcher<Map<String, Any>>()
  private val onBuffer by EventDispatcher<Map<String, Any>>()
  private val onProgress by EventDispatcher<Map<String, Any>>()
  private val onRetry by EventDispatcher<Map<String, Any>>()
  private val onEnd by EventDispatcher<Map<String, Any>>()
  private val onError by EventDispatcher<Map<String, Any>>()

  private val playerView = PlayerView(context).apply {
    setBackgroundColor(Color.BLACK)
    useController = true
    layoutParams = FrameLayout.LayoutParams(
      LayoutParams.MATCH_PARENT,
      LayoutParams.MATCH_PARENT,
      Gravity.CENTER,
    )
  }

  var autoplay: Boolean = true
  var currentVideoId: String? = null
    private set

  /**
   * The controller owns the ExoPlayer, so it is recreated whenever its player has been released
   * (window detach, Activity recreation, RN view recycling). Exactly one controller is ever bound
   * to [playerView].
   */
  private var controllerRef: ExoPlayerController? = null

  val controller: ExoPlayerController
    get() {
      controllerRef?.let { existing -> if (!existing.isDestroyed()) return existing }
      val created = ExoPlayerController(
        context = context,
        emit = { eventName, payload -> dispatch(eventName, payload) },
      )
      controllerRef = created
      created.attach(playerView)
      return created
    }

  init {
    orientation = VERTICAL
    // View.setFocusable(boolean) is the D-pad/TV focusability flag we want; `focusable` alone maps
    // to the deprecated int getter.
    isFocusable = true
    isFocusableInTouchMode = true
    addView(playerView)
    controller
    requestFocus()
  }

  fun setVideo(videoId: String?) {
    if (videoId.isNullOrBlank()) return
    currentVideoId = videoId
  }

  /** Background/suspend safety net. Never creates a player just to pause nothing. */
  fun pauseForBackground() {
    controllerRef?.let { existing -> if (!existing.isDestroyed()) existing.onActivityBackground() }
  }

  /** Releases the player and the surface reference. Never recreates a controller. */
  fun releasePlayer() {
    controllerRef?.let { existing ->
      existing.detach()
      existing.release()
    }
    controllerRef = null
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    controller
    requestFocus()
  }

  override fun onDetachedFromWindow() {
    releasePlayer()
    super.onDetachedFromWindow()
  }

  private fun dispatch(eventName: String, payload: Map<String, Any>) {
    when (eventName) {
      "onLoad" -> onLoad(payload)
      "onReady" -> onReady(payload)
      "onPlay" -> onPlay(payload)
      "onPause" -> onPause(payload)
      "onBuffer" -> onBuffer(payload)
      "onProgress" -> onProgress(payload)
      "onRetry" -> onRetry(payload)
      "onEnd" -> onEnd(payload)
      "onError" -> onError(payload)
    }
  }
}
