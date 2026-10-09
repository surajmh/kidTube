package com.nestling.youtubeplayer

import android.content.Context
import org.json.JSONObject

/** Native journal survives process death while React is asleep. Values are absolute daily totals. */
object PlaybackUsage {
  private fun prefs(context: Context) = context.applicationContext.getSharedPreferences("playback-usage", Context.MODE_PRIVATE)
  fun usedMs(context: Context, profile: String, date: String): Long = prefs(context).getLong(JSONObject().put("profileId", profile).put("date", date).toString(), 0)
  @Synchronized fun record(context: Context, profile: String, date: String, minimumMs: Long, deltaMs: Long = 0) {
    val store = prefs(context)
    val key = JSONObject().put("profileId", profile).put("date", date).toString()
    val value = maxOf(store.getLong(key, 0), minimumMs) + deltaMs
    val editor = store.edit().putLong(key, value)
    // Retain the same 30-day window as the JS usage store.
    val cutoff = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Calendar.getInstance().apply { add(java.util.Calendar.DAY_OF_YEAR, -29) }.time)
    for (old in store.all.keys) if (JSONObject(old).optString("date") < cutoff) editor.remove(old)
    editor.apply()
  }
  fun records(context: Context): List<Map<String, Any>> = prefs(context).all.map { (key, value) ->
    val target = JSONObject(key)
    mapOf("profileId" to target.getString("profileId"), "date" to target.getString("date"), "secondsWatched" to (value as Long) / 1000.0)
  }
  fun clear(context: Context) { prefs(context).edit().clear().apply() }
}
