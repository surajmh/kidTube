package com.nestling.youtubeplayer

import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.Request
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Spike harness, not a regression test: it talks to the live network, so it is expected to be run
 * deliberately rather than in CI. It answers the only question that matters before the rest of the
 * phase is built — does extraction yield stream URLs that actually serve bytes at a usable rate?
 */
class ExtractionSpikeTest {

  private val probe = OkHttpClient.Builder()
    .connectTimeout(20, TimeUnit.SECONDS)
    .readTimeout(20, TimeUnit.SECONDS)
    .build()

  @Test
  fun resolvesAndServesBytes() {
    val resolver = AuthorizedPlaybackResolver()
    var usable = 0

    for ((id, label) in SAMPLES) {
      println("\n--- $label ($id) ---")
      val info = try {
        resolver.resolve(id)
      } catch (error: PlaybackException) {
        println("  RESOLVE FAILED: ${error.code} — ${error.message}")
        continue
      }

      val mode = if (info.audioUrl != null) "adaptive video+audio (merge path)" else "muxed progressive"
      println("  mode      : $mode")
      println("  height    : ${info.height ?: "unknown"}")
      println("  mime      : ${info.mimeType ?: "unknown"}")
      println("  duration  : ${info.durationMs?.div(1000) ?: "unknown"}s")

      val videoUrl = info.videoUrl
      if (videoUrl == null) {
        println("  NO VIDEO URL")
        continue
      }
      if (probeStream("video", videoUrl) && probeStream("audio", info.audioUrl)) usable++
    }

    println("\n==== $usable of ${SAMPLES.size} samples fully usable ====")
    assertTrue("no sample produced a fetchable stream", usable > 0)
  }

  /** A stream that 403s or trickles is the documented poToken/throttling failure mode. */
  private fun probeStream(label: String, url: String?): Boolean {
    if (url == null) return true
    val started = System.nanoTime()
    return try {
      probe.newCall(
        Request.Builder().url(url).header("Range", "bytes=0-262143").build(),
      ).execute().use { response ->
        val bytes = response.body?.bytes()?.size ?: 0
        val seconds = (System.nanoTime() - started) / 1_000_000_000.0
        val kbps = if (seconds > 0) (bytes / 1024.0 / seconds).toInt() else 0
        val ok = response.isSuccessful && bytes > 0
        println("  $label probe: HTTP ${response.code}, $bytes bytes, ~$kbps KB/s ${if (ok) "OK" else "FAILED"}")
        ok
      }
    } catch (error: Exception) {
      println("  $label probe: threw ${error.javaClass.simpleName} — ${error.message}")
      false
    }
  }

  @Test
  fun readsMetadata() {
    for ((id, label) in SAMPLES) {
      val meta = NewPipeMetadata.video(id)
      println("\n--- $label ---")
      println("  title    : ${meta["title"]}")
      println("  channel  : ${meta["channelName"]} (${meta["youtubeChannelId"]})")
      println("  duration : ${meta["durationSeconds"]}s")
      println("  published: ${meta["publishedAt"]}")
      println("  thumb    : ${(meta["thumbnailUrl"] as? String)?.take(60)}")
      assertTrue("no title for $id", (meta["title"] as? String).isNullOrBlank().not())
    }
  }

  @Suppress("UNCHECKED_CAST")
  @Test
  fun listsChannelUploadsAcrossPages() {
    val canonical = NewPipeChannels.resolveChannelId("@BlenderOfficial")
    println("\nresolved handle -> $canonical")
    assertTrue("handle did not resolve to a UC id", canonical.startsWith("UC"))

    val channel = NewPipeChannels.channel(canonical)
    println("channel: ${channel["name"]}  thumb=${(channel["thumbnailUrl"] as? String)?.take(50)}")
    assertTrue("channel has no name", (channel["name"] as? String).isNullOrBlank().not())

    val first = NewPipeChannels.channelVideos(canonical, null)
    val firstVideos = first["videos"] as List<Map<String, Any?>>
    val token = first["nextPageToken"] as? String
    println("page 1: ${firstVideos.size} videos, nextPageToken=${token != null}")
    firstVideos.take(3).forEach { println("   - ${it["title"]} (${it["durationSeconds"]}s)") }
    assertTrue("page 1 returned nothing", firstVideos.isNotEmpty())

    // Every row must be pinned to the channel that was asked about.
    assertTrue(
      "a row was attributed to another channel",
      firstVideos.all { it["youtubeChannelId"] == canonical },
    )

    if (token == null) {
      println("channel fits in one page; pagination not exercised")
      return
    }
    val second = NewPipeChannels.channelVideos(canonical, token)
    val secondVideos = second["videos"] as List<Map<String, Any?>>
    println("page 2: ${secondVideos.size} videos")
    assertTrue("page 2 returned nothing", secondVideos.isNotEmpty())

    val firstIds = firstVideos.map { it["youtubeVideoId"] }.toSet()
    val overlap = secondVideos.count { it["youtubeVideoId"] in firstIds }
    println("overlap with page 1: $overlap")
    assertTrue("page 2 repeated page 1 -- the token did not advance", overlap < secondVideos.size)
  }

  private companion object {
    val SAMPLES = listOf(
      "jNQXAC9IVRw" to "Me at the zoo (oldest, low-res only)",
      "aqz-KE-bpKQ" to "Big Buck Bunny (Creative Commons, HD)",
      "dQw4w9WgXcQ" to "Licensed music video (restriction check)",
    )
  }
}
