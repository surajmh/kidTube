package com.nestling.youtubeplayer

import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException

/**
 * The HTTP transport NewPipeExtractor needs. It is used only to resolve an already-approved
 * video id into short-lived stream URLs; nothing here decides what a child may watch.
 */
class NewPipeDownloader(
  private val client: OkHttpClient = OkHttpClient.Builder()
    .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
    .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
    .build(),
) : Downloader() {

  override fun execute(request: Request): Response {
    val builder = okhttp3.Request.Builder()
      .method(request.httpMethod(), request.dataToSend()?.toRequestBody())
      .url(request.url())
      .addHeader("User-Agent", USER_AGENT)

    request.headers().forEach { (name, values) ->
      builder.removeHeader(name)
      values.forEach { value -> builder.addHeader(name, value) }
    }

    val response = client.newCall(builder.build()).execute()
    if (response.code == HTTP_TOO_MANY_REQUESTS) {
      response.close()
      throw ReCaptchaException("reCaptcha challenge requested", request.url())
    }

    return response.use {
      Response(
        it.code,
        it.message,
        it.headers.toMultimap(),
        it.body?.string(),
        it.request.url.toString(),
      )
    }
  }

  companion object {
    private const val TIMEOUT_SECONDS = 30L
    private const val HTTP_TOO_MANY_REQUESTS = 429

    /**
     * A desktop user agent: YouTube serves the player configuration this extractor expects to
     * browser-shaped clients. It identifies the request, it does not authenticate anything.
     */
    private const val USER_AGENT =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0"
  }
}
