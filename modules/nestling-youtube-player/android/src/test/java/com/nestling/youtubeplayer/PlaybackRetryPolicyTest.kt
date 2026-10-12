package com.nestling.youtubeplayer

import org.junit.Assert.*
import org.junit.Test

class PlaybackRetryPolicyTest {
  @Test fun transientFailuresRefreshHdOnceBeforeFallingBack() {
    val policy = PlaybackRetryPolicy()
    for (code in listOf(PlaybackCodes.STREAM_EXPIRED, PlaybackCodes.NETWORK_ERROR)) {
      assertTrue(policy.preferAdaptive(code, 1))
      for (attempt in 2..policy.maxAttempts) assertFalse(policy.preferAdaptive(code, attempt))
    }
    for (code in listOf(PlaybackCodes.PLAYBACK_FAILURE, PlaybackCodes.RESOLVER_UNAVAILABLE, PlaybackCodes.UNSUPPORTED_FORMAT)) {
      assertFalse(policy.preferAdaptive(code, 1))
    }
    assertFalse(policy.isRecoverable(PlaybackCodes.UNSUPPORTED_FORMAT))
    assertEquals(1000L, policy.delayForAttempt(1))
    assertEquals(2000L, policy.delayForAttempt(2))
  }
}
