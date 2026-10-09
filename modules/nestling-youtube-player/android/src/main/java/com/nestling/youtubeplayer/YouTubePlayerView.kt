package com.nestling.youtubeplayer

import android.content.Context
import android.content.res.Configuration
import android.view.ViewGroup
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
  // Media3 owns this native child hierarchy; it must remeasure after PiP/rotation resizes.
  override val shouldUseAndroidLayout = true
  private val onPictureInPictureChanged by EventDispatcher<Map<String, Any>>()
  private val onLoad by EventDispatcher<Map<String, Any>>()
  private val onReady by EventDispatcher<Map<String, Any>>()
  private val onPlay by EventDispatcher<Map<String, Any>>()
  private val onPause by EventDispatcher<Map<String, Any>>()
  private val onBuffer by EventDispatcher<Map<String, Any>>()
  private val onProgress by EventDispatcher<Map<String, Any>>()
  private val onRetry by EventDispatcher<Map<String, Any>>()
  private val onEnd by EventDispatcher<Map<String, Any>>()
  private val onTracksChanged by EventDispatcher<Map<String, Any>>()
  private val onError by EventDispatcher<Map<String, Any>>()

  private val pipListener = androidx.core.util.Consumer<androidx.core.app.PictureInPictureModeChangedInfo> { info -> pictureInPictureChanged(info.isInPictureInPictureMode) }
  private var lastPipParams: Pair<Boolean, android.graphics.Rect>? = null
  private val lifecycleObserver = object : androidx.lifecycle.DefaultLifecycleObserver {
    override fun onStop(owner: androidx.lifecycle.LifecycleOwner) { pauseForBackground() }
  }
  private var pipActivity: androidx.activity.ComponentActivity? = null

  private val isTelevision = (resources.configuration.uiMode and Configuration.UI_MODE_TYPE_MASK) == Configuration.UI_MODE_TYPE_TELEVISION

  private val playerView = PlayerView(context).apply {
    setBackgroundColor(Color.BLACK)
    useController = true
    layoutParams = FrameLayout.LayoutParams(
      LayoutParams.MATCH_PARENT,
      LayoutParams.MATCH_PARENT,
      Gravity.CENTER,
    )
  }

  var playbackSpeed: Float = 1f
    set(value) { field = value; controller.setPlaybackSpeed(value) }
  var qualityHeight: Int = 0
    set(value) { field = value; controller.setQuality(value, maxQualityHeight) }
  var maxQualityHeight: Int = 1080
    set(value) { field = value; controller.setQuality(qualityHeight, value) }
  var fullscreen: Boolean = false
    set(value) { field = value; controller.setFullscreen(value) }
  var volume: Float = 1f
    set(value) { if (value.isFinite()) { field = value.coerceIn(0f, 1f); controller.setVolume(field) } }
  var audioLanguage: String? = null
    set(value) { field = value; controller.setAudioLanguage(value) }
  private var originalBrightness: Float? = null
  fun setBrightness(value: Float) {
    if (!value.isFinite()) return
    val activity = appContext.currentActivity ?: return
    if (originalBrightness == null) originalBrightness = activity.window.attributes.screenBrightness
    activity.window.attributes = activity.window.attributes.apply { screenBrightness = value.coerceIn(0.01f, 1f) }
  }

  var captionTrack: String? = null
    set(value) { field = value; controller.setCaptionTrack(value) }
  fun setCaptionScale(scale: Float) {
    playerView.subtitleView?.setFractionalTextSize(0.0533f * scale.coerceIn(1f, 1.5f))
  }

  var autoplay: Boolean = true
  var currentVideoId: String? = null
    private set

  /**
   * The controller owns the ExoPlayer, so it is recreated whenever its player has been released
   * (Activity destruction or RN view recycling). Exactly one controller is ever bound
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
      created.setPlaybackSpeed(playbackSpeed)
      created.setQuality(qualityHeight, maxQualityHeight)
      created.setCaptionTrack(captionTrack)
      created.setAudioLanguage(audioLanguage)
      created.setVolume(volume)
      if (fullscreen) created.setFullscreen(true)
      return created
    }

  init {
    orientation = VERTICAL
    // View.setFocusable(boolean) is the D-pad/TV focusability flag we want; `focusable` alone maps
    // to the deprecated int getter.
    // The React overlay owns TV focus; the video surface must not steal it on attach.
    isFocusable = !isTelevision
    isFocusableInTouchMode = !isTelevision
    if (isTelevision) descendantFocusability = ViewGroup.FOCUS_BLOCK_DESCENDANTS
    addView(playerView)
    controller
    if (!isTelevision) requestFocus()
  }

  fun setVideo(videoId: String?) {
    if (videoId.isNullOrBlank()) return
    currentVideoId = videoId
  }

  fun pictureInPictureChanged(value: Boolean) {
    val wasInPictureInPicture = controller.inPictureInPicture
    controller.inPictureInPicture = value
    onPictureInPictureChanged(mapOf("inPictureInPicture" to value))
    if (wasInPictureInPicture && !value) postDelayed({
      // PiP expansion resumes the Activity; closing the system window leaves it stopped.
      if (pipActivity?.lifecycle?.currentState == androidx.lifecycle.Lifecycle.State.CREATED) controllerRef?.stop()
    }, 150)
    updatePictureInPictureParams()
  }

  private fun supportsPictureInPicture(): Boolean {
    val activity = appContext.currentActivity ?: return false
    return android.os.Build.VERSION.SDK_INT >= 26 && activity.packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_PICTURE_IN_PICTURE)
  }

  private fun pictureInPictureParams(autoEnter: Boolean): android.app.PictureInPictureParams {
    val rect = android.graphics.Rect()
    playerView.getGlobalVisibleRect(rect)
    val builder = android.app.PictureInPictureParams.Builder().setAspectRatio(android.util.Rational(16, 9))
    if (!rect.isEmpty) builder.setSourceRectHint(rect)
    if (android.os.Build.VERSION.SDK_INT >= 31) builder.setAutoEnterEnabled(autoEnter)
    return builder.build()
  }

  fun updatePictureInPictureParams() {
    if (!supportsPictureInPicture()) return
    val activity = appContext.currentActivity ?: return
    val autoEnter = controllerRef?.canAutoEnterPictureInPicture() == true &&
      pipActivity?.lifecycle?.currentState?.isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED) == true
    val rect = android.graphics.Rect()
    playerView.getGlobalVisibleRect(rect)
    val params = autoEnter to rect
    if (params == lastPipParams) return
    try {
      activity.setPictureInPictureParams(pictureInPictureParams(autoEnter))
      lastPipParams = params
    } catch (error: IllegalStateException) { android.util.Log.w("kidTube", "Could not update PiP", error) }
  }

  fun enterPictureInPicture(): Boolean {
    if (!supportsPictureInPicture() || !controller.canAutoEnterPictureInPicture()) return false
    val activity = appContext.currentActivity ?: return false
    controller.inPictureInPicture = true
    val entered = try { activity.enterPictureInPictureMode(pictureInPictureParams(false)) }
      catch (error: IllegalStateException) { false }
    pictureInPictureChanged(entered)
    return entered
  }

  /** Visible PiP playback continues; leaving the visible Activity pauses or enables audio. */
  fun pauseForBackground() {
    // PiP keeps the Activity visible (STARTED). onPause happens before the Home transition,
    // so only onStop may apply ordinary background playback rules.
    if (pipActivity?.lifecycle?.currentState?.isAtLeast(androidx.lifecycle.Lifecycle.State.STARTED) == true) return
    controllerRef?.takeUnless { it.isDestroyed() }?.let { existing ->
      existing.inPictureInPicture = android.os.Build.VERSION.SDK_INT >= 26 && appContext.currentActivity?.isInPictureInPictureMode == true
      existing.onActivityBackground()
      updatePictureInPictureParams()
    }
  }

  /** Releases the player and the surface reference. Never recreates a controller. */
  fun releasePlayer() {
    pipActivity?.lifecycle?.removeObserver(lifecycleObserver)
    if (supportsPictureInPicture()) appContext.currentActivity?.setPictureInPictureParams(pictureInPictureParams(false))
    lastPipParams = null
    pipActivity?.removeOnPictureInPictureModeChangedListener(pipListener)
    pipActivity = null
    controllerRef?.let { existing ->
      existing.detach()
      existing.release()
    }
    controllerRef = null
    originalBrightness?.let { brightness ->
      appContext.currentActivity?.window?.let { window -> window.attributes = window.attributes.apply { screenBrightness = brightness } }
    }
    originalBrightness = null
  }

  /**
   * Backgrounding an Activity can tear down and recreate this SurfaceView's underlying surface
   * without the controller itself being destroyed (that only happens in `onDetachedFromWindow`,
   * and Android doesn't always reach that on a mere background/foreground cycle). `controller`'s
   * getter only (re)creates a controller when the old one is gone — it never rebinds a *surviving*
   * one to the surface that now exists, so playback kept rendering to a dead surface and silently
   * went nowhere on return. Calling `attach` unconditionally re-binds every time, and is a no-op
   * safety net when nothing actually changed.
   */
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    controller.attach(playerView)
    if (pipActivity == null) {
      pipActivity = appContext.currentActivity as? androidx.activity.ComponentActivity
      pipActivity?.addOnPictureInPictureModeChangedListener(pipListener)
      pipActivity?.lifecycle?.addObserver(lifecycleObserver)
    }
    updatePictureInPictureParams()
    if (!isTelevision) requestFocus()
  }

  override fun onDetachedFromWindow() {
    // Window detachment is not React view destruction; keep the session and its accounting.
    controllerRef?.detach()
    super.onDetachedFromWindow()
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)
    if (changed) updatePictureInPictureParams()
  }

  private fun dispatch(eventName: String, payload: Map<String, Any>) {
    updatePictureInPictureParams()
    when (eventName) {
      "onPictureInPictureChanged" -> onPictureInPictureChanged(payload)
      "onLoad" -> onLoad(payload)
      "onReady" -> onReady(payload)
      "onPlay" -> onPlay(payload)
      "onPause" -> onPause(payload)
      "onBuffer" -> onBuffer(payload)
      "onProgress" -> onProgress(payload)
      "onRetry" -> onRetry(payload)
      "onEnd" -> onEnd(payload)
      "onTracksChanged" -> onTracksChanged(payload)
      "onError" -> onError(payload)
    }
  }
}
