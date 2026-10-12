package com.nestling.youtubeplayer

import java.io.InterruptedIOException
import okhttp3.Call
import okhttp3.EventListener
import okhttp3.OkHttpClient
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.schabi.newpipe.extractor.downloader.Request

class NewPipeDownloaderTest {
  @Test fun iosClientKeepsKidsHdStreamsWithoutChangingOtherClients() {
    val ios = """{"context":{"client":{"clientName":"IOS","clientVersion":"21.03.2"}},"videoId":"approved-id"}""".toByteArray()
    val adapted = String(NewPipeDownloader.compatibleIosBody(ios)!!, Charsets.UTF_8)
    assertTrue(adapted.contains("\"clientVersion\":\"20.10.4\""))
    assertTrue(adapted.contains("\"videoId\":\"approved-id\""))
    val android = """{"context":{"client":{"clientName":"ANDROID","clientVersion":"21.03.2"}}}""".toByteArray()
    org.junit.Assert.assertArrayEquals(android, NewPipeDownloader.compatibleIosBody(android))
    org.junit.Assert.assertNull(NewPipeDownloader.compatibleIosBody(null))
  }

  @Test
  fun interruptedExtractionDoesNotStartAnotherHttpCall() {
    var started = 0
    val client = OkHttpClient.Builder()
      .eventListener(object : EventListener() {
        override fun callStart(call: Call) { started++ }
      })
      .build()
    val downloader = NewPipeDownloader(client)
    val request = Request.Builder().get("https://example.invalid/").build()
    Thread.currentThread().interrupt()
    try {
      downloader.execute(request)
      fail("Cancelled extraction must not continue HTTP work")
    } catch (expected: InterruptedIOException) {
      assertEquals(0, started)
      assertTrue(Thread.currentThread().isInterrupted)
    } finally {
      Thread.interrupted()
    }
  }
}
