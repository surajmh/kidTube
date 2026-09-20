package com.nestling.youtubeplayer

import java.io.IOException
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.channel.ChannelInfo
import org.schabi.newpipe.extractor.channel.tabs.ChannelTabInfo
import org.schabi.newpipe.extractor.channel.tabs.ChannelTabs
import org.schabi.newpipe.extractor.exceptions.ContentNotAvailableException
import org.schabi.newpipe.extractor.linkhandler.ListLinkHandler
import org.schabi.newpipe.extractor.stream.StreamInfoItem

/**
 * Channel metadata and uploads, metadata-only.
 *
 * Nothing here approves anything. Listing a channel's uploads produces inert rows; whether any of
 * them may be watched is still decided entirely by the access rules in TypeScript.
 */
object NewPipeChannels {

  private val CHANNEL_ID = Regex("(UC[0-9A-Za-z_-]{22})")
  private val VIDEO_ID = Regex("[?&]v=([A-Za-z0-9_-]{11})")

  /** Any parent-supplied reference resolves to a canonical `UC…` id, or fails. */
  fun resolveChannelId(reference: String): String {
    val info = channelInfo(reference)
    return CHANNEL_ID.find(info.id.orEmpty() + " " + info.url.orEmpty())?.value
      ?: throw MetadataException("CHANNEL_NOT_FOUND", "That channel could not be found on YouTube.")
  }

  fun channel(reference: String): Map<String, Any?> {
    val info = channelInfo(reference)
    val canonical = CHANNEL_ID.find(info.id.orEmpty() + " " + info.url.orEmpty())?.value
      ?: throw MetadataException("CHANNEL_NOT_FOUND", "That channel could not be found on YouTube.")
    return mapOf(
      "youtubeChannelId" to canonical,
      "name" to info.name?.takeIf { it.isNotBlank() },
      "thumbnailUrl" to runCatching { info.avatars.maxByOrNull { it.height }?.url }.getOrNull(),
      "description" to info.description?.takeIf { it.isNotBlank() },
    )
  }

  /**
   * One page of uploads. `pageToken` continues a previous call; without one the listing starts at
   * the newest upload.
   */
  fun channelVideos(channelId: String, pageToken: String?): Map<String, Any?> {
    NewPipeSession.ensureInitialised()

    val continuation = ChannelPageCache.take(pageToken)
    val items: List<StreamInfoItem>
    val nextToken: String?

    if (continuation != null) {
      val more = try {
        ChannelTabInfo.getMoreItems(ServiceList.YouTube, continuation.tab, continuation.page)
      } catch (error: IOException) {
        throw MetadataException("NETWORK", "Could not reach YouTube.")
      } catch (error: Exception) {
        throw MetadataException("UNKNOWN", "Those videos could not be loaded.")
      }
      items = more.items.filterIsInstance<StreamInfoItem>()
      nextToken = ChannelPageCache.put(continuation.tab, more.nextPage)
    } else {
      val info = channelInfo(channelId)
      val tab = videosTab(info)
        ?: throw MetadataException("CHANNEL_NOT_FOUND", "That channel has no videos to show.")
      val tabInfo = try {
        ChannelTabInfo.getInfo(ServiceList.YouTube, tab)
      } catch (error: IOException) {
        throw MetadataException("NETWORK", "Could not reach YouTube.")
      } catch (error: Exception) {
        throw MetadataException("UNKNOWN", "Those videos could not be loaded.")
      }
      items = tabInfo.relatedItems.filterIsInstance<StreamInfoItem>()
      nextToken = ChannelPageCache.put(tab, tabInfo.nextPage)
    }

    return mapOf(
      "channelId" to channelId,
      "nextPageToken" to nextToken,
      // Every row is pinned to the channel that was asked about. A response cannot claim a video
      // belongs to a *different* approved channel and inherit its access.
      "videos" to items.mapNotNull { item -> videoItem(item, channelId) },
    )
  }

  private fun videoItem(item: StreamInfoItem, channelId: String): Map<String, Any?>? {
    val videoId = VIDEO_ID.find(item.url.orEmpty())?.groupValues?.getOrNull(1) ?: return null
    val title = item.name?.takeIf { it.isNotBlank() } ?: return null
    return mapOf(
      "youtubeVideoId" to videoId,
      "youtubeChannelId" to channelId,
      "channelName" to item.uploaderName?.takeIf { it.isNotBlank() },
      "title" to title,
      "thumbnailUrl" to runCatching { item.thumbnails.maxByOrNull { it.height }?.url }.getOrNull(),
      "durationSeconds" to item.duration.takeIf { it > 0 },
      "publishedAt" to runCatching { item.uploadDate?.offsetDateTime()?.toString() }.getOrNull(),
    )
  }

  private fun videosTab(info: ChannelInfo): ListLinkHandler? =
    info.tabs.firstOrNull { tab -> tab.contentFilters.contains(ChannelTabs.VIDEOS) }

  private fun channelInfo(reference: String): ChannelInfo {
    if (reference.isBlank()) {
      throw MetadataException("INVALID_INPUT", "That does not look like a YouTube channel.")
    }
    NewPipeSession.ensureInitialised()
    return try {
      ChannelInfo.getInfo(ServiceList.YouTube, channelUrl(reference))
    } catch (error: ContentNotAvailableException) {
      throw MetadataException("CHANNEL_NOT_FOUND", "That channel could not be found on YouTube.")
    } catch (error: IOException) {
      throw MetadataException("NETWORK", "Could not reach YouTube.")
    } catch (error: Exception) {
      throw MetadataException("UNKNOWN", "That channel could not be loaded.")
    }
  }

  /** Accepts a full URL, a `UC…` id, or an `@handle`. A handle is never treated as an id. */
  private fun channelUrl(reference: String): String {
    val trimmed = reference.trim()
    return when {
      trimmed.startsWith("http://") || trimmed.startsWith("https://") -> trimmed
      CHANNEL_ID.matches(trimmed) -> "https://www.youtube.com/channel/$trimmed"
      trimmed.startsWith("@") -> "https://www.youtube.com/$trimmed"
      else -> "https://www.youtube.com/@$trimmed"
    }
  }
}
