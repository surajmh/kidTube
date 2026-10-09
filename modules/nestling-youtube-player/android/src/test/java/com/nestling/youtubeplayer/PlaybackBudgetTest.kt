package com.nestling.youtubeplayer

import org.junit.Assert.*
import org.junit.Test

class PlaybackBudgetTest {
  @Test fun budgetsCountPlayingTimeAndCannotBeExtendedByDelayedAcknowledgments() {
    val budget = PlaybackBudget()
    assertFalse(budget.allowed("video", 0, 1000))
    budget.authorize("video", 0, 2000, 10000, 0, 1000)
    budget.sample(0, true)
    assertEquals(500L, budget.sample(500, true))
    // A bridge refresh acknowledges zero, so it cannot add the already played 500ms again.
    budget.authorize("video", 0, 2000, 10000, 500, 1500)
    assertEquals(1500L, budget.remaining(500, 1500))
    assertEquals(500L, budget.sample(1000, false))
    assertEquals(0L, budget.sample(5000, true))
    assertEquals(1000L, budget.sample(6000, true))
    assertFalse(budget.allowed("video", 6000, 7000))
  }

  @Test fun bedtimeStillStopsWhilePausedAndClockRewindDoesNotExtendIt() {
    val budget = PlaybackBudget()
    budget.authorize("video", 0, 60000, 3000, 0, 1000)
    budget.sample(0, true)
    budget.sample(500, false)
    budget.authorize("video", 500, 59500, 3000, 500, 100)
    assertEquals(1500L, budget.remaining(500, 100))
    assertFalse(budget.allowed("video", 2000, 1600))
    assertFalse(budget.allowed("other", 500, 100))
  }

  @Test fun aNewVideoHasItsOwnCounterAndZeroAuthorizationFailsClosed() {
    val budget = PlaybackBudget()
    budget.authorize("one", 0, 1000, 10000, 0, 1000)
    budget.sample(0, true); budget.sample(500, true)
    budget.authorize("two", 0, 1000, 10000, 500, 1500)
    assertEquals(0L, budget.playedMs)
    assertFalse(budget.allowed("one", 500, 1500))
    budget.authorize("two", 0, 0, 10000, 500, 1500)
    assertFalse(budget.allowed("two", 500, 1500))
  }

  @Test fun aRecreatedControllerContinuesTheAcknowledgedCounterWithoutGrantingExtraTime() {
    val budget = PlaybackBudget()
    budget.authorize("video", 4000, 1000, 10000, 500, 1500)
    assertEquals(4000L, budget.playedMs)
    assertEquals(1000L, budget.remaining(500, 1500))
    budget.sample(500, true)
    budget.sample(1500, true)
    assertFalse(budget.allowed("video", 1500, 2500))
  }
  @Test fun anExpiredAuthorizationIsRenewableAndIsNotAnExhaustedDailyLimit() {
    val budget = PlaybackBudget()
    budget.authorize("video", 0, 86_400_000, 901_000, 0, 1000)
    budget.sample(0, true)
    budget.sample(900_000, true)
    assertEquals("authorization_expired", budget.rejectionCode("video", 900_000, 901_000))
    budget.authorize("video", 900_000, 86_400_000, 10_000_000, 900_000, 901_000)
    assertTrue(budget.allowed("video", 900_000, 901_000))
    budget.sample(1_800_000, true)
    assertTrue(budget.allowed("video", 1_800_000, 1_801_000))
    budget.authorize("video", 1_800_000, 0, 10_000_000, 1_800_000, 1_801_000)
    assertEquals("policy_blocked", budget.rejectionCode("video", 1_800_000, 1_801_000))
    assertEquals("policy_blocked", budget.rejectionCode("unapproved", 20_000_000, 20_001_000))
  }
}
