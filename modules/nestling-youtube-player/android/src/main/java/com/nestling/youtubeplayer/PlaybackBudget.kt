package com.nestling.youtubeplayer

/** Monotonic playback accounting; seeks and speed changes cannot change elapsed listening time. */
class PlaybackBudget {
  var videoId = ""
    private set
  var playedMs = 0L
    private set
  private var capMs = 0L
  private var deadline = 0L
  private var wallDeadline = 0L
  private var sampledAt = 0L
  private var playing = false

  fun authorize(id: String, acknowledgedMs: Long, remainingMs: Long, stopAt: Long, now: Long, wallNow: Long) {
    if (videoId != id) { videoId = id; playedMs = 0L; playing = false; sampledAt = now }
    playedMs = maxOf(playedMs, acknowledgedMs.coerceAtLeast(0))
    capMs = acknowledgedMs.coerceAtLeast(0) + remainingMs.coerceAtLeast(0)
    val nextDeadline = now + (stopAt - wallNow).coerceAtLeast(0)
    deadline = if (wallDeadline == stopAt && deadline > 0) minOf(deadline, nextDeadline) else nextDeadline
    wallDeadline = stopAt
  }

  fun sample(now: Long, isPlaying: Boolean): Long {
    val elapsed = if (playing) (now - sampledAt).coerceAtLeast(0) else 0L
    val counted = minOf(elapsed, (capMs - playedMs).coerceAtLeast(0), (deadline - sampledAt).coerceAtLeast(0))
    playedMs += counted
    sampledAt = now
    playing = isPlaying
    return counted
  }

  fun rejectionCode(id: String, now: Long, wallNow: Long) =
    if (id == videoId && timeExpired(now, wallNow)) "authorization_expired" else "policy_blocked"

  fun timeExpired(now: Long, wallNow: Long) = now >= deadline || wallNow >= wallDeadline
  fun remaining(now: Long, wallNow: Long) = minOf(capMs - playedMs, deadline - now, wallDeadline - wallNow).coerceAtLeast(0)
  fun allowed(id: String, now: Long, wallNow: Long) = id == videoId && remaining(now, wallNow) > 0
}
