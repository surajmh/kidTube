package com.nestling.youtubeplayer

import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.services.youtube.extractors.YoutubeStreamExtractor
import org.schabi.newpipe.extractor.localization.ContentCountry
import org.schabi.newpipe.extractor.localization.Localization

/**
 * NewPipe keeps its downloader in a static, so initialisation must happen exactly once before any
 * extraction. Both playback resolution and metadata go through here so there is a single init.
 */
object NewPipeSession {
  @Volatile
  private var initialised = false

  fun ensureInitialised() {
    if (initialised) return
    synchronized(this) {
      if (initialised) return
      NewPipe.init(NewPipeDownloader(), Localization("en", "AU"), ContentCountry("AU"))
      // The default client exposes only 360p for made-for-kids videos; iOS supplies the HD renditions.
      YoutubeStreamExtractor.setFetchIosClient(true)
      initialised = true
    }
  }
}
