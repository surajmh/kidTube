package com.nestling.youtubeplayer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ResolvedStreamCacheTest {
  @Test
  fun reuseExpiryInvalidationAndLruBound() {
    val info = PlaybackInfo(videoId = "replay", videoUrl = "https://example.invalid/video")
    ResolvedStreamCache.put(info)
    assertEquals(info, ResolvedStreamCache.getIfFresh("replay"))
    assertEquals(info, ResolvedStreamCache.getIfFresh("replay"))
    assertNull(ResolvedStreamCache.getIfFresh("replay", atMs = Long.MAX_VALUE))
    assertNull(ResolvedStreamCache.getIfFresh("replay"))
    ResolvedStreamCache.put(info)
    ResolvedStreamCache.invalidate("replay")
    assertNull(ResolvedStreamCache.getIfFresh("replay"))

    for (id in 0..7) ResolvedStreamCache.put(info.copy(videoId = "$id"))
    ResolvedStreamCache.getIfFresh("0") // Recently read entries survive eviction.
    ResolvedStreamCache.put(info.copy(videoId = "8"))
    assertNull(ResolvedStreamCache.getIfFresh("1"))
    assertEquals("0", ResolvedStreamCache.getIfFresh("0")?.videoId)
    for (id in 0..8) ResolvedStreamCache.invalidate("$id")
  }
}
