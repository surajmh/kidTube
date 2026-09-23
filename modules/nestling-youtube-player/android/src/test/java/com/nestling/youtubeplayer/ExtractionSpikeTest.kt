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
  /**
   * Answers what the current YouTube + extractor combination offers for adaptive playback:
   * DASH/HLS manifest availability, per-stream delivery methods, rate-bypass presence and the
   * actual fetch rate of the streams the resolver picks today. Run deliberately, like the probe
   * above.
   */
  @Test
  fun probesAdaptiveSurface() {
    NewPipeSession.ensureInitialised()
    val info = org.schabi.newpipe.extractor.stream.StreamInfo.getInfo(
      org.schabi.newpipe.extractor.ServiceList.YouTube,
      "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    )

    println("dashMpdUrl present : ${!info.dashMpdUrl.isNullOrBlank()} (${info.dashMpdUrl?.take(60)})")
    println("hlsUrl present     : ${!info.hlsUrl.isNullOrBlank()} (${info.hlsUrl?.take(60)})")

    fun flags(url: String) = buildList {
      if (url.contains("ratebypass")) add("ratebypass")
      if (url.contains("sparams=")) add("sig-only")
      if (url.contains("range=")) add("range-param")
    }

    info.videoOnlyStreams.forEach {
      println("  videoOnly h=${it.resolution} delivery=${it.deliveryMethod} mime=${it.format?.mimeType} flags=${flags(it.content)}")
    }
    info.videoStreams.forEach {
      println("  muxed     h=${it.resolution} delivery=${it.deliveryMethod} mime=${it.format?.mimeType} flags=${flags(it.content)}")
    }
    info.audioStreams.forEach {
      println("  audio     br=${it.averageBitrate} delivery=${it.deliveryMethod} flags=${flags(it.content)}")
    }

    // Fetch-rate of what the production resolver would actually select (highest progressive video
    // + best audio): if this trickles, that is the stall the child sees a few seconds in.
    val resolver = AuthorizedPlaybackResolver()
    val picked = resolver.resolve("aqz-KE-bpKQ")
    probeStream("picked video", picked.videoUrl)
    probeStream("picked audio", picked.audioUrl)

    probeHls("https://www.youtube.com/watch?v=aqz-KE-bpKQ")
  }

  /** Confirms the HLS ladder is fetchable end to end: master -> media playlist -> segment. */
  private fun probeHls(watchUrl: String) {
    val info = org.schabi.newpipe.extractor.stream.StreamInfo.getInfo(
      org.schabi.newpipe.extractor.ServiceList.YouTube,
      watchUrl,
    )
    val master = info.hlsUrl
    if (master.isNullOrBlank()) {
      println("  hls: no manifest url")
      return
    }
    val text = fetch(master) ?: return
    val variants = Regex("#EXT-X-STREAM-INF:(.*)").findAll(text).map { it.groupValues[1].trim() }.toList()
    println("  hls variants: ${variants.size}")
    variants.take(4).forEach { println("    $it") }
    val firstUri = Regex("^(?!#)(\\S+\\.m3u8\\S*)$", RegexOption.MULTILINE).find(text)?.groupValues?.get(1)
    if (firstUri == null) {
      println("  hls: no variant playlist uri found")
      return
    }
    val media = fetch(resolveRelative(master, firstUri)) ?: return
    val segment = Regex("^(?!#)(\\S+)$", RegexOption.MULTILINE).find(media)?.groupValues?.get(1)
    if (segment == null) {
      println("  hls: no segment uri found")
      return
    }
    probeStream("hls segment", resolveRelative(resolveRelative(master, firstUri), segment))
  }

  private fun resolveRelative(base: String, relative: String): String =
    if (relative.startsWith("http")) relative else base.substringBeforeLast('/') + "/" + relative.trimStart('/')

  private fun fetch(url: String): String? = try {
    probe.newCall(Request.Builder().url(url).build()).execute().use { response ->
      if (!response.isSuccessful) {
        println("  fetch ${url.take(60)}: HTTP ${response.code}")
        null
      } else {
        response.body?.string()
      }
    }
  } catch (error: Exception) {
    println("  fetch ${url.take(60)}: threw ${error.javaClass.simpleName}")
    null
  }

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
