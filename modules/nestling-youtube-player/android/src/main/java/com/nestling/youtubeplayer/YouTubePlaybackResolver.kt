package com.nestling.youtubeplayer

import android.util.Log
import java.io.IOException
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.exceptions.ContentNotAvailableException
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException
import org.schabi.newpipe.extractor.localization.ContentCountry
import org.schabi.newpipe.extractor.localization.Localization
import org.schabi.newpipe.extractor.stream.AudioStream
import org.schabi.newpipe.extractor.stream.DeliveryMethod
import org.schabi.newpipe.extractor.stream.StreamInfo
import org.schabi.newpipe.extractor.stream.StreamType
import org.schabi.newpipe.extractor.stream.VideoStream

/**
 * Resolves an approved video ID into short-lived, authorized playback data.
 *
 * The caller is responsible for approval: the React Native layer only passes a video ID that
 * already satisfied `ContentAccessService`, and this resolver never decides what may be watched.
 * Resolved URLs are short-lived and are never persisted.
 */
interface YouTubePlaybackResolver {
  fun resolve(videoId: String): PlaybackInfo
}

/**
 * Resolves playback through NewPipeExtractor.
 *
 * Prefers an adaptive video-only + audio pair (which is the only way to reach 720p/1080p) and
 * falls back to a muxed progressive stream, which tops out at 360p.
 */
class AuthorizedPlaybackResolver(
  private val qualitySelector: QualitySelector = DefaultQualitySelector(),
  private val quality: PlaybackQuality = PlaybackQuality.AUTO,
) : YouTubePlaybackResolver {

  override fun resolve(videoId: String): PlaybackInfo {
    if (videoId.isBlank()) {
      throw PlaybackException(PlaybackCodes.INVALID_VIDEO_ID, "No video was requested.")
    }
    ensureInitialised()

    val info = try {
      StreamInfo.getInfo(ServiceList.YouTube, WATCH_URL_PREFIX + videoId)
    } catch (error: ContentNotAvailableException) {
      Log.w(TAG, "resolve($videoId) unavailable", error)
      // Covers private, deleted, paid, age-restricted and geo-blocked content: all terminal.
      throw PlaybackException(PlaybackCodes.VIDEO_UNAVAILABLE, UNAVAILABLE_MESSAGE)
    } catch (error: ReCaptchaException) {
      Log.w(TAG, "resolve($videoId) recaptcha", error)
      throw PlaybackException(PlaybackCodes.NETWORK_ERROR, RETRY_MESSAGE)
    } catch (error: IOException) {
      Log.w(TAG, "resolve($videoId) io", error)
      throw PlaybackException(PlaybackCodes.NETWORK_ERROR, RETRY_MESSAGE)
    } catch (error: Exception) {
      Log.w(TAG, "resolve($videoId) failed", error)
      throw PlaybackException(PlaybackCodes.PLAYBACK_FAILURE, UNAVAILABLE_MESSAGE)
    }

    if (info.streamType != StreamType.VIDEO_STREAM) {
      // Live streams and audio-only content are out of scope for this player.
      throw PlaybackException(PlaybackCodes.UNSUPPORTED_FORMAT, UNAVAILABLE_MESSAGE)
    }

    val durationMs = info.duration.takeIf { it > 0 }?.times(1000L)
    val audio = bestAudio(info.audioStreams)
    val adaptive = bestVideo(info.videoOnlyStreams)

    if (adaptive != null && audio != null) {
      return PlaybackInfo(
        videoId = videoId,
        durationMs = durationMs,
        videoUrl = adaptive.content,
        audioUrl = audio.content,
        mimeType = adaptive.format?.mimeType,
        height = heightOf(adaptive),
      )
    }

    val muxed = bestVideo(info.videoStreams)
      ?: throw PlaybackException(PlaybackCodes.UNSUPPORTED_FORMAT, UNAVAILABLE_MESSAGE)

    return PlaybackInfo(
      videoId = videoId,
      durationMs = durationMs,
      videoUrl = muxed.content,
      mimeType = muxed.format?.mimeType,
      height = heightOf(muxed),
    )
  }

  /**
   * Best stream ExoPlayer can fetch directly, capped by the module's existing quality policy.
   * Without the cap YouTube happily hands back a 2160p rendition a phone cannot use.
   */
  private fun bestVideo(streams: List<VideoStream>?): VideoStream? {
    val usable = streams.orEmpty().filter(::isDirectUrl)
    if (usable.isEmpty()) return null
    val target = qualitySelector.select(usable.mapNotNull(::heightOf), quality)
    return usable.firstOrNull { heightOf(it) == target }
      ?: usable.maxByOrNull { heightOf(it) ?: 0 }
  }

  private fun bestAudio(streams: List<AudioStream>?): AudioStream? =
    streams.orEmpty().filter(::isDirectUrl).maxByOrNull { it.averageBitrate }

  private fun isDirectUrl(stream: org.schabi.newpipe.extractor.stream.Stream): Boolean =
    stream.isUrl && stream.deliveryMethod == DeliveryMethod.PROGRESSIVE_HTTP && !stream.content.isNullOrBlank()

  /** `getResolution()` looks like "1080p60"; only the leading number is meaningful here. */
  private fun heightOf(stream: VideoStream): Int? =
    stream.resolution?.takeWhile { it.isDigit() }?.toIntOrNull()

  private companion object {
    const val TAG = "NestlingResolver"
    const val WATCH_URL_PREFIX = "https://www.youtube.com/watch?v="
    const val UNAVAILABLE_MESSAGE = "This video can't be played right now."
    const val RETRY_MESSAGE = "Couldn't reach the video. Trying again may help."

    @Volatile
    private var initialised = false

    /** NewPipe keeps its downloader in a static, so this must happen once before any extraction. */
    fun ensureInitialised() {
      if (initialised) return
      synchronized(this) {
        if (initialised) return
        NewPipe.init(NewPipeDownloader(), Localization("en", "AU"), ContentCountry("AU"))
        initialised = true
      }
    }
  }
}

class PlaybackException(val code: String, override val message: String) : Exception(message)
