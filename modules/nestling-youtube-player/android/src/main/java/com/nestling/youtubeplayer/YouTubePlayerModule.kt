package com.nestling.youtubeplayer

import android.util.Log
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class YouTubePlayerModule : Module() {
  private val main = Handler(Looper.getMainLooper())
  @Volatile private var downloadIds: Set<String> = emptySet()
  @Volatile private var parentUntil = 0L
  private fun canDownload(videoId: String) = System.currentTimeMillis() < parentUntil && videoId in downloadIds

  private var activeView: WeakReference<YouTubePlayerView>? = null

  /**
   * NewPipe extraction is blocking network work with a 30s timeout. On the default async queue it
   * would also stall every later player command behind it, so metadata runs here instead, where
   * calls can execute concurrently — the downloader, session init and page cache are all
   * thread-safe.
   */
  private val metadataScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

  /**
   * The only video ids the native decoder will accept, pushed by JS from `PlaybackPolicy`.
   *
   * Parental rules live in TypeScript, but a JS bug, a stray bridge call or a compromised bundle
   * must not be able to hand the player an arbitrary id: nothing outside this set is ever resolved,
   * so the policy cannot be bypassed from the bridge. It starts empty, which fails closed.
   */
  private var allowedVideoIds: Set<String> = emptySet()

  /**
   * A play() that arrives before the view has mounted is held here until it does.
   * Fabric mounts the view asynchronously, so the JS effect that starts playback regularly runs
   * before the view registers itself, and the request would otherwise be lost.
   */
  private var pendingPlayVideoId: String? = null

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

    // Milliseconds since boot, including sleep. Unlike the wall clock it cannot be moved by changing
    // the date, so the PIN lockout measures its delay with it.
    Function("getElapsedRealtime") { SystemClock.elapsedRealtime().toDouble() }

    AsyncFunction("setDownloadAuthorization") { videoIds: List<String>, expiresAt: Double ->
      downloadIds = videoIds.filter { it.matches(Regex("[A-Za-z0-9_-]{11}")) }.toSet()
      parentUntil = if (expiresAt.isFinite()) expiresAt.toLong().coerceAtMost(System.currentTimeMillis() + 30 * 60 * 1000) else 0L
    }
    AsyncFunction("getDownloads") { promise: Promise ->
      main.post {
        try { promise.resolve(OfflineDownloads.list(requireNotNull(appContext.reactContext))) }
        catch (error: Exception) { promise.reject("E_DOWNLOAD", "Could not read saved videos.", error) }
      }
    }
    AsyncFunction("downloadVideo") { videoId: String, maxHeight: Int, expiresAt: Double, promise: Promise ->
      if (!canDownload(videoId)) { promise.reject("E_PARENT", "An approved video and parent mode are required.", null); return@AsyncFunction }
      if (maxHeight !in listOf(144, 240, 360, 480, 720, 1080) || !expiresAt.isFinite() || expiresAt <= System.currentTimeMillis() || expiresAt > System.currentTimeMillis() + 31L * 24 * 60 * 60 * 1000) {
        promise.reject("E_DOWNLOAD", "Invalid download quality or expiry.", null); return@AsyncFunction
      }
      val context = requireNotNull(appContext.reactContext)
      metadataScope.launch {
        try {
          val info = AuthorizedPlaybackResolver(quality = PlaybackQuality.AUTO).resolve(videoId)
          main.post {
            try { OfflineDownloads.add(context, info, maxHeight, expiresAt.toLong(), { canDownload(videoId) }, promise) }
            catch (error: Exception) { promise.reject("E_DOWNLOAD", "Could not prepare the download.", error) }
          }
        } catch (error: Exception) { promise.reject("E_DOWNLOAD", "Could not reach this video. Try again when connected.", error) }
      }
    }
    AsyncFunction("removeDownload") { videoId: String, promise: Promise ->
      if (System.currentTimeMillis() >= parentUntil) { promise.reject("E_PARENT", "Parent mode is required.", null); return@AsyncFunction }
      main.post {
        try { OfflineDownloads.remove(requireNotNull(appContext.reactContext), videoId); promise.resolve(null) }
        catch (error: Exception) { promise.reject("E_DOWNLOAD", "Could not remove this download.", error) }
      }
    }
    AsyncFunction("clearDownloads") { promise: Promise ->
      downloadIds = emptySet(); parentUntil = 0L
      main.post {
        try {
          activeView?.get()?.controller?.stop()
          OfflineDownloads.clear(requireNotNull(appContext.reactContext))
          promise.resolve(null)
        } catch (error: Exception) { promise.reject("E_DOWNLOAD", "Could not clear downloads.", error) }
      }
    }

    AsyncFunction("setAllowedVideoIds") { videoIds: List<String> ->
      allowedVideoIds = videoIds.toSet()
      main.post {
        activeView?.get()?.let { view ->
          if (view.currentVideoId != null && view.currentVideoId !in allowedVideoIds) view.controller.stop()
        }
      }
      mapOf<String, Any?>("accepted" to true, "count" to allowedVideoIds.size)
    }

    /**
     * Metadata only: no stream is resolved and nothing is approved by calling this. It is safe to
     * ask about any id, because knowing a video's title grants no access to playing it.
     */
    AsyncFunction("getVideoMetadata") { videoId: String, promise: Promise ->
      metadataAsync(promise) { NewPipeMetadata.video(videoId) }
    }

    AsyncFunction("resolveChannelId") { reference: String, promise: Promise ->
      metadataAsync(promise) { mapOf("youtubeChannelId" to NewPipeChannels.resolveChannelId(reference)) }
    }

    AsyncFunction("getChannel") { reference: String, promise: Promise ->
      metadataAsync(promise) { NewPipeChannels.channel(reference) }
    }

    AsyncFunction("getChannelVideos") { channelId: String, pageToken: String?, promise: Promise ->
      metadataAsync(promise) { NewPipeChannels.channelVideos(channelId, pageToken) }
    }

    /**
     * PBKDF2-HMAC-SHA256 for the parent PIN. Produces a digest byte-identical to the pure-TypeScript
     * fallback in `src/services/auth/pinHash.ts`, and runs on the IO dispatcher so the Hermes JS
     * thread — and the PIN modal — never freeze during the 25k derivation rounds.
     */
    AsyncFunction("derivePinHash") { pin: String, saltHex: String, iterations: Int, promise: Promise ->
      metadataAsync(promise) { mapOf("hash" to derivePinHashHex(pin, saltHex, iterations)) }
    }

    AsyncFunction("play") { videoId: String ->
      if (!allowedVideoIds.contains(videoId)) return@AsyncFunction policyBlocked(videoId)
      val view = activeView?.get()
      if (view == null) {
        pendingPlayVideoId = videoId
        return@AsyncFunction mapOf<String, Any?>("accepted" to true, "pending" to true)
      }
      try {
        view.controller.play(videoId, true)
      } catch (error: Throwable) {
        Log.e(TAG, "play($videoId) failed", error)
        throw error
      }
      mapOf<String, Any?>("accepted" to true)
    }

    AsyncFunction("pause") {
      requireView().controller.pause()
      mapOf<String, Any?>("accepted" to true)
    }

    AsyncFunction("resume") { videoId: String ->
      if (!allowedVideoIds.contains(videoId)) return@AsyncFunction policyBlocked(videoId)
      val view = activeView?.get()
      if (view == null) {
        // Backgrounding can tear down and rebuild the underlying SurfaceView-hosting view without
        // React ever re-applying props, which is the only thing that re-registers `activeView`.
        // Falling back to `play()`'s own pending-queue path lets it recover the same way a fresh
        // mount does, instead of a hard, unrecoverable failure.
        pendingPlayVideoId = videoId
        return@AsyncFunction mapOf<String, Any?>("accepted" to true, "pending" to true)
      }
      try {
        view.controller.resume(videoId)
      } catch (error: Throwable) {
        Log.e(TAG, "resume($videoId) failed", error)
        throw error
      }
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

    /**
     * Resolves a video's stream ahead of playing it (typically "up next"), so switching to it
     * later skips the resolve latency. Gated by the same allow list as `play`/`resume` — this
     * must never become a way to reach unapproved content, even speculatively.
     */
    AsyncFunction("prefetch") { videoId: String ->
      if (!allowedVideoIds.contains(videoId)) return@AsyncFunction policyBlocked(videoId)
      ResolvedStreamCache.prefetch(videoId)
      mapOf<String, Any?>("accepted" to true)
    }

    View(YouTubePlayerView::class) {
      Events("onLoad", "onReady", "onPlay", "onPause", "onBuffer", "onProgress", "onRetry", "onEnd", "onError", "onTracksChanged")

      // Props are not re-sent when they did not change, so the mounted view is also registered here.
      OnViewDidUpdateProps { view ->
        registerView(view)
      }

      Prop("videoId") { view: YouTubePlayerView, videoId: String? ->
        registerView(view)
        view.setVideo(videoId)
      }

      Prop("playbackSpeed") { view: YouTubePlayerView, speed: Double -> view.playbackSpeed = speed.toFloat() }
      Prop("qualityHeight") { view: YouTubePlayerView, height: Int -> view.qualityHeight = height }
      Prop("maxQualityHeight") { view: YouTubePlayerView, height: Int -> view.maxQualityHeight = height }
      Prop("captionTrack") { view: YouTubePlayerView, track: String? -> view.captionTrack = track }
      Prop("captionScale") { view: YouTubePlayerView, scale: Double -> view.setCaptionScale(scale.toFloat()) }

      Prop("autoplay") { view: YouTubePlayerView, autoplay: Boolean? ->
        view.autoplay = autoplay ?: true
      }

      OnViewDestroys { view ->
        view.releasePlayer()
        if (activeView?.get() === view) activeView = null
      }
    }
  }

  /** Metadata failures cross the bridge as data, not exceptions, so JS can classify them. */
  private inline fun metadataCall(body: () -> Map<String, Any?>): Map<String, Any?> = try {
    body()
  } catch (error: MetadataException) {
    mapOf("failed" to true, "code" to error.code, "message" to error.message)
  }

  /** Settles the promise off the shared async queue so a slow fetch never blocks the player. */
  private fun metadataAsync(promise: Promise, body: () -> Map<String, Any?>) {
    metadataScope.launch {
      try {
        promise.resolve(metadataCall(body))
      } catch (error: Throwable) {
        promise.reject("E_METADATA", error.message, error)
      }
    }
  }

  private fun derivePinHashHex(pin: String, saltHex: String, iterations: Int): String {
    val salt = saltHex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
    val spec = PBEKeySpec(pin.toCharArray(), salt, iterations, 256)
    return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
      .generateSecret(spec)
      .encoded
      .joinToString("") { "%02x".format(it.toInt() and 0xff) }
  }

  /** Registers the mounted view and starts any play request that arrived before it existed. */
  private fun registerView(view: YouTubePlayerView) {
    activeView = WeakReference(view)
    val pending = pendingPlayVideoId ?: return
    pendingPlayVideoId = null
    if (allowedVideoIds.contains(pending)) view.controller.play(pending, true)
  }

  private fun requireView(): YouTubePlayerView =
    activeView?.get() ?: throw IllegalStateException("NestlingYouTubePlayer view is not mounted")

  private companion object {
    const val TAG = "YouTubePlayerModule"
  }

  /** Mirrors the JS-side decision without restating any rule: this id is simply not approved. */
  private fun policyBlocked(videoId: String): Map<String, Any?> = mapOf(
    "accepted" to false,
    "code" to "policy_blocked",
    "message" to "This video is not in the approved library for the active profile",
    "videoId" to videoId,
  )
}
