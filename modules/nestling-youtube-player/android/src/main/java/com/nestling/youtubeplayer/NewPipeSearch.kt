package com.nestling.youtubeplayer

import java.io.IOException
import org.schabi.newpipe.extractor.InfoItem
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.channel.ChannelInfoItem
import org.schabi.newpipe.extractor.search.SearchInfo
import org.schabi.newpipe.extractor.services.youtube.linkHandler.YoutubeSearchQueryHandlerFactory
import org.schabi.newpipe.extractor.stream.StreamInfoItem

/**
 * Parent-only name lookup, metadata-only.
 *
 * It exists so a parent who does not have a link can type a channel or video name and pick the
 * right match. Results are inert rows: nothing here approves anything, and Kid Mode never calls it.
 */
object NewPipeSearch {

  private val CHANNEL_ID = Regex("(UC[0-9A-Za-z_-]{22})")
  private val VIDEO_ID = Regex("[?&]v=([A-Za-z0-9_-]{11})")
  private const val MAX_RESULTS = 6

  fun channels(query: String): Map<String, Any?> {
    val results = search(query, YoutubeSearchQueryHandlerFactory.CHANNELS)
      .filterIsInstance<ChannelInfoItem>()
      .mapNotNull { item ->
        // Only a validated UC… id is ever treated as a channel's identity.
        val id = CHANNEL_ID.find(item.url.orEmpty())?.value ?: return@mapNotNull null
        val name = item.name?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
        mapOf(
          "youtubeChannelId" to id,
          "name" to name,
          "thumbnailUrl" to runCatching { item.thumbnails.maxByOrNull { it.height }?.url }.getOrNull(),
          "description" to item.description?.takeIf { it.isNotBlank() },
          "subscriberCount" to item.subscriberCount.takeIf { it >= 0 },
          "videoCount" to item.streamCount.takeIf { it >= 0 },
          "verified" to item.isVerified,
        )
      }
      .take(MAX_RESULTS)
    return mapOf("results" to results)
  }

  fun videos(query: String): Map<String, Any?> {
    val results = search(query, YoutubeSearchQueryHandlerFactory.VIDEOS)
      .filterIsInstance<StreamInfoItem>()
      .mapNotNull { item ->
        val videoId = VIDEO_ID.find(item.url.orEmpty())?.groupValues?.getOrNull(1) ?: return@mapNotNull null
        val title = item.name?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
        mapOf(
          "youtubeVideoId" to videoId,
          "title" to title,
          "channelName" to item.uploaderName?.takeIf { it.isNotBlank() },
          "youtubeChannelId" to CHANNEL_ID.find(item.uploaderUrl.orEmpty())?.value,
          "durationSeconds" to item.duration.takeIf { it > 0 },
          "thumbnailUrl" to runCatching { item.thumbnails.maxByOrNull { it.height }?.url }.getOrNull(),
          "publishedAt" to runCatching { item.uploadDate?.offsetDateTime()?.toString() }.getOrNull(),
        )
      }
      .take(MAX_RESULTS)
    return mapOf("results" to results)
  }

  private fun search(query: String, filter: String): List<InfoItem> {
    if (query.isBlank()) throw MetadataException("INVALID_INPUT", "Type a name to look for.")
    NewPipeSession.ensureInitialised()
    return try {
      val service = ServiceList.YouTube
      val handler = service.searchQHFactory.fromQuery(query.trim(), listOf(filter), "")
      SearchInfo.getInfo(service, handler).relatedItems
    } catch (error: IOException) {
      throw MetadataException("NETWORK", "Could not reach YouTube.")
    } catch (error: Exception) {
      throw MetadataException("UNKNOWN", "That could not be looked up right now.")
    }
  }
}
