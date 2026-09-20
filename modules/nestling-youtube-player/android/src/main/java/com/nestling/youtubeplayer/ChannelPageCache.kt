package com.nestling.youtubeplayer

import java.util.UUID
import org.schabi.newpipe.extractor.Page
import org.schabi.newpipe.extractor.linkhandler.ListLinkHandler

/**
 * Bridges NewPipe's pagination to the string page tokens the JS provider interface uses.
 *
 * NewPipe continues a listing with a `Page` object (and the tab handler it came from), neither of
 * which serialises to a token. They are held here and handed out as opaque ids instead.
 *
 * ponytail: bounded LRU, in memory only. A token that has been evicted or that did not survive a
 * process restart simply reports "no more pages", which callers already handle as the end of a
 * channel — so the worst case is a re-sync from page one, never a wrong or partial result.
 */
object ChannelPageCache {
  private const val MAX_ENTRIES = 64

  data class Continuation(val tab: ListLinkHandler, val page: Page)

  private val entries = object : LinkedHashMap<String, Continuation>(16, 0.75f, true) {
    override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Continuation>?): Boolean =
      size > MAX_ENTRIES
  }

  @Synchronized
  fun put(tab: ListLinkHandler, page: Page?): String? {
    if (page == null) return null
    val token = UUID.randomUUID().toString()
    entries[token] = Continuation(tab, page)
    return token
  }

  @Synchronized
  fun take(token: String?): Continuation? {
    if (token.isNullOrBlank()) return null
    return entries[token]
  }
}
