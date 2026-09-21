package com.nestling.youtubeplayer

import java.io.IOException
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.exceptions.ContentNotAvailableException
import org.schabi.newpipe.extractor.stream.StreamInfo

/**
 * Metadata-only extraction.
 *
 * Deliberately separate from playback: nothing here decides what may be watched, and no stream URL
 * is produced. It exists so the library can show real titles, channels and durations without an
 * API key, a quota or a proxy.
 */
object NewPipeMetadata {

  /** Normalised public metadata for one video, shaped for the JS content provider. */
  fun video(videoId: String): Map<String, Any?> {
    if (videoId.isBlank()) {
      throw MetadataException("INVALID_INPUT", "That is not a valid video id.")
    }
    NewPipeSession.ensureInitialised()

    val info = try {
      StreamInfo.getInfo(ServiceList.YouTube, "https://www.youtube.com/watch?v=$videoId")
    } catch (error: ContentNotAvailableException) {
      throw MetadataException("VIDEO_NOT_FOUND", "That video could not be found on YouTube.")
    } catch (error: IOException) {
      throw MetadataException("NETWORK", "Could not reach YouTube.")
    } catch (error: Exception) {
      throw MetadataException("UNKNOWN", "That video could not be loaded.")
    }

    return mapOf(
      "youtubeVideoId" to videoId,
      "title" to info.name?.takeIf { it.isNotBlank() },
      "channelName" to info.uploaderName?.takeIf { it.isNotBlank() },
      "youtubeChannelId" to canonicalChannelId(info.uploaderUrl),
      "durationSeconds" to info.duration.takeIf { it > 0 },
      "thumbnailUrl" to largestThumbnail(info),
      "publishedAt" to runCatching { info.uploadDate?.offsetDateTime()?.toString() }.getOrNull(),
    )
  }

  /** Only a validated `UC…` id is ever treated as a channel's identity. */
  private fun canonicalChannelId(uploaderUrl: String?): String? {
    val match = Regex("(UC[0-9A-Za-z_-]{22})").find(uploaderUrl.orEmpty())
    return match?.value
  }

  private fun largestThumbnail(info: StreamInfo): String? =
    runCatching { info.thumbnails.maxByOrNull { it.height }?.url }.getOrNull()
}

class MetadataException(val code: String, override val message: String) : Exception(message)
