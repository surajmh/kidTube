package com.nestling.youtubeplayer

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference

class YouTubePlayerModule : Module() {
  private var activeView: WeakReference<YouTubePlayerView>? = null

  /**
   * The only video ids the native decoder will accept, pushed by JS from `PlaybackPolicy`.
   *
   * Parental rules live in TypeScript, but a JS bug, a stray bridge call or a compromised bundle
   * must not be able to hand the player an arbitrary id: nothing outside this set is ever resolved,
   * so the policy cannot be bypassed from the bridge. It starts empty, which fails closed.
   */
  private var allowedVideoIds: Set<String> = emptySet()

  override fun definition() = ModuleDefinition {
    Name("NestlingYouTubePlayer")

    // Safety net only: stopping on background is always safe, and resuming stays a JS decision so
    // the native player can never bypass the parental playback policy.
    OnActivityEntersBackground {
      activeView?.get()?.pauseForBackground()
    }

    // An Activity recreation must not leave a player (or its Activity context) behind.
    OnActivityDestroys {
      activeView?.get()?.releasePlayer()
    }

    AsyncFunction("setAllowedVideoIds") { videoIds: List<String> ->
      allowedVideoIds = videoIds.toSet()
      mapOf<String, Any?>("accepted" to true, "count" to allowedVideoIds.size)
    }

    AsyncFunction("play") { videoId: String ->
      if (!allowedVideoIds.contains(videoId)) return@AsyncFunction policyBlocked(videoId)
      requireView().controller.play(videoId, true)
      mapOf<String, Any?>("accepted" to true)
    }

    AsyncFunction("pause") {
      requireView().controller.pause()
      mapOf<String, Any?>("accepted" to true)
    }

    AsyncFunction("resume") { videoId: String ->
      if (!allowedVideoIds.contains(videoId)) return@AsyncFunction policyBlocked(videoId)
      requireView().controller.resume(videoId)
      mapOf<String, Any?>("accepted" to true)
    }

    AsyncFunction("seek") { position: Double ->
      requireView().controller.seek(position.toLong())
      mapOf<String, Any?>("accepted" to true)
    }

    AsyncFunction("stop") {
      requireView().controller.stop()
      mapOf<String, Any?>("accepted" to true)
    }

    AsyncFunction("setVolume") { volume: Double ->
      requireView().controller.setVolume(volume.toFloat())
      mapOf<String, Any?>("accepted" to true)
    }

    AsyncFunction("setFullscreen") { fullscreen: Boolean ->
      requireView().controller.setFullscreen(fullscreen)
      mapOf<String, Any?>("accepted" to true)
    }

    View(YouTubePlayerView::class) {
      Events("onLoad", "onReady", "onPlay", "onPause", "onBuffer", "onProgress", "onRetry", "onEnd", "onError")

      // Props are not re-sent when they did not change, so the mounted view is also registered here.
      OnViewDidUpdateProps { view ->
        activeView = WeakReference(view)
      }

      Prop("videoId") { view: YouTubePlayerView, videoId: String? ->
        activeView = WeakReference(view)
        view.setVideo(videoId)
      }

      Prop("autoplay") { view: YouTubePlayerView, autoplay: Boolean? ->
        view.autoplay = autoplay ?: true
      }

      OnViewDestroys { view ->
        view.releasePlayer()
        if (activeView?.get() === view) activeView = null
      }
    }
  }

  private fun requireView(): YouTubePlayerView =
    activeView?.get() ?: throw IllegalStateException("NestlingYouTubePlayer view is not mounted")

  /** Mirrors the JS-side decision without restating any rule: this id is simply not approved. */
  private fun policyBlocked(videoId: String): Map<String, Any?> = mapOf(
    "accepted" to false,
    "code" to "policy_blocked",
    "message" to "This video is not in the approved library for the active profile",
    "videoId" to videoId,
  )
}
