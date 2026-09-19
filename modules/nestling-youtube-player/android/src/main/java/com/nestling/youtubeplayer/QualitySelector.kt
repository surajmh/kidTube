package com.nestling.youtubeplayer

enum class PlaybackQuality(val maxHeight: Int?) {
  AUTO(null),
  P720(720),
  P1080(1080),
}

interface QualitySelector {
  fun select(availableHeights: List<Int>, requested: PlaybackQuality = PlaybackQuality.AUTO): Int?
}

class DefaultQualitySelector : QualitySelector {
  override fun select(availableHeights: List<Int>, requested: PlaybackQuality): Int? {
    if (availableHeights.isEmpty()) return null
    val safeHeights = availableHeights.filter { it <= 1080 }
    val candidates = if (requested.maxHeight == null) safeHeights else safeHeights.filter { it <= requested.maxHeight }
    return (candidates.ifEmpty { safeHeights.ifEmpty { availableHeights } }).maxOrNull()
  }
}
