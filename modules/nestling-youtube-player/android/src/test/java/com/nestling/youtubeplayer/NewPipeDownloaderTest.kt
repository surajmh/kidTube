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
