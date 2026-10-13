package com.nestling.youtubeplayer

import java.io.StringReader
import java.io.StringWriter
import okio.ByteString.Companion.encodeUtf8
import javax.xml.parsers.DocumentBuilderFactory
import javax.xml.transform.TransformerFactory
import javax.xml.transform.dom.DOMSource
import javax.xml.transform.stream.StreamResult
import org.schabi.newpipe.extractor.services.youtube.dashmanifestcreators.YoutubeProgressiveDashManifestCreator
import org.schabi.newpipe.extractor.stream.AudioStream
import org.schabi.newpipe.extractor.stream.VideoStream
import org.w3c.dom.Element
import org.xml.sax.InputSource

/** Put the extracted MP4 renditions in one DASH ladder so Media3 can adapt within the parent cap. */
object ProgressiveDashManifest {
  fun create(videos: List<VideoStream>, audio: AudioStream, durationSeconds: Long): String {
    val parser = DocumentBuilderFactory.newInstance().newDocumentBuilder()
    val sources = videos.map { Triple(it.content, it.itagItem, "") } +
      Triple(audio.content, audio.itagItem, audio.audioLocale?.language.orEmpty())
    val documents = sources.map { (url, itag, _) ->
      parser.parse(InputSource(StringReader(YoutubeProgressiveDashManifestCreator.fromProgressiveStreamingUrl(url, requireNotNull(itag) { "Missing stream index" }, durationSeconds))))
    }
    val manifest = parser.newDocument()
    manifest.appendChild(manifest.importNode(documents.first().documentElement, true))
    val period = manifest.getElementsByTagName("Period").item(0)
    while (period.firstChild != null) period.removeChild(period.firstChild)
    val groups = mutableMapOf<String, Element>()
    documents.forEachIndexed { index, document ->
      val original = document.getElementsByTagName("AdaptationSet").item(0) as Element
      val representation = document.getElementsByTagName("Representation").item(0)
      val language = sources[index].third
      val key = original.getAttribute("mimeType") + language
      val group = groups.getOrPut(key) {
        (manifest.importNode(original, false) as Element).also {
          it.setAttribute("id", groups.size.toString())
          if (language.isNotEmpty()) it.setAttribute("lang", language)
          period.appendChild(it)
        }
      }
      group.appendChild(manifest.importNode(representation, true))
    }
    val output = StringWriter()
    TransformerFactory.newInstance().newTransformer().transform(DOMSource(manifest), StreamResult(output))
    return "data:application/dash+xml;base64," + output.toString().encodeUtf8().base64()
  }
}
