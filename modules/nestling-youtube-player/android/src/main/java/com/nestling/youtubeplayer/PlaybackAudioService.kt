package com.nestling.youtubeplayer

import android.content.Intent
import androidx.media3.common.ForwardingPlayer
import androidx.media3.common.Player
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

/** One session exposes transport controls for the currently authorized video, never a new queue. */
class PlaybackAudioService : MediaSessionService() {
  private var session: MediaSession? = null
  override fun onCreate() {
    super.onCreate()
    val controller = activeController
    // Let Media3's onStartCommand acknowledge and stop stale foreground self-starts.
    // Stopping in onCreate skips that acknowledgement and crashes after playback closes.
    if (controller == null || controller.isDestroyed()) return
    val transport = object : ForwardingPlayer(controller.player) {
      override fun play() { controller.remotePlay() }
      override fun pause() { controller.remotePause() }
      override fun setPlayWhenReady(value: Boolean) { if (value) play() else pause() }
      override fun getAvailableCommands(): Player.Commands = super.getAvailableCommands().buildUpon()
        .remove(Player.COMMAND_CHANGE_MEDIA_ITEMS).remove(Player.COMMAND_SET_MEDIA_ITEM)
        .remove(Player.COMMAND_SEEK_TO_NEXT).remove(Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM)
        .remove(Player.COMMAND_SEEK_TO_PREVIOUS).remove(Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM).build()
    }
    session = MediaSession.Builder(this, transport).build().also { addSession(it) }
  }
  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session
  override fun onTaskRemoved(rootIntent: Intent?) {
    activeController?.stop()
    stopSelf()
  }
  override fun onDestroy() {
    session?.let { removeSession(it); it.release() }
    session = null
    super.onDestroy()
  }
  companion object { var activeController: ExoPlayerController? = null }
}
