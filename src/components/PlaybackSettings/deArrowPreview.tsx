import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { ApprovedVideo, PlaybackSettings } from '../../types';
import { previewDeArrow } from '../../services/deArrowService';
import useStyles from './playbackSettings.style';

export function DeArrowPreview({ videos, settings, onChange }: { videos: ApprovedVideo[]; settings: PlaybackSettings; onChange: (settings: PlaybackSettings) => void }) {
  const styles = useStyles();
  const [page, setPage] = useState(0);
  const [preview, setPreview] = useState<{ id: string; replacement: { title?: string; thumbnailUrl?: string } }>();
  const [busy, setBusy] = useState(false);
  const [thumbnailReady, setThumbnailReady] = useState(false);
  const [message, setMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const video = videos.find((item) => item.youtubeVideoId === preview?.id);
  async function load(item: ApprovedVideo) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setPreview(undefined); setMessage('');
    try {
      const replacement = await previewDeArrow(item.youtubeVideoId, controller.signal);
      if (request.current !== controller || controller.signal.aborted) return;
      if (replacement) { setPreview({ id: item.youtubeVideoId, replacement }); setThumbnailReady(!replacement.thumbnailUrl); }
      else setMessage('No community replacements available for this video.');
    } catch {
      if (request.current === controller && !controller.signal.aborted) setMessage('Could not load replacements. Try again.');
      else if (request.current === controller) setMessage('Preview timed out. Try again.');
    } finally { if (request.current === controller) setBusy(false); }
  }
  function restore(item: ApprovedVideo) {
    const next = { ...settings.deArrowReplacements };
    delete next[item.youtubeVideoId];
    onChange({ ...settings, deArrowReplacements: next });
  }
  function save(replacement?: { title?: string; thumbnailUrl?: string }) {
    if (!video) return;
    const next = { ...settings.deArrowReplacements };
    if (replacement) next[video.youtubeVideoId] = replacement;
    else delete next[video.youtubeVideoId];
    onChange({ ...settings, deArrowReplacements: next });
    setPreview(undefined);
  }
  return <View style={styles.card}>
    <Text style={styles.cardTitle}>DeArrow previews</Text>
    <Text style={styles.helper}>Community suggestions can contain unsuitable text or images. Preview each replacement before approving it. Approved choices stay fixed until you review them again.</Text>
    {!videos.length && <Text style={styles.helper}>Add videos to preview replacements.</Text>}
    {videos.slice(page * 10, page * 10 + 10).map((item) => <View key={item.id}><Pressable accessibilityRole="button" accessibilityLabel={`Preview replacements for ${item.title}`} disabled={busy} onPress={() => void load(item)} style={styles.toggleRow}><Text style={styles.rowLabel}>{item.title}{settings.deArrowReplacements?.[item.youtubeVideoId] ? ' · Replacement approved' : ''}</Text></Pressable>{settings.deArrowReplacements?.[item.youtubeVideoId] && <Pressable accessibilityRole="button" accessibilityLabel={`Restore original for ${item.title}`} onPress={() => restore(item)} style={styles.toggleRow}><Text>Restore original</Text></Pressable>}</View>)}
    <View style={styles.limitWrap}>
      {page > 0 && <Pressable accessibilityRole="button" onPress={() => setPage(page - 1)}><Text>Previous videos</Text></Pressable>}
      {(page + 1) * 10 < videos.length && <Pressable accessibilityRole="button" onPress={() => setPage(page + 1)}><Text>More videos</Text></Pressable>}
    </View>
    {busy && <Text style={styles.helper}>Loading preview…</Text>}
    {!!message && <Text accessibilityRole="alert" style={styles.helper}>{message}</Text>}
    {video && preview && <>
      <Text style={styles.cardTitle}>Original</Text><Text>{video.title}</Text>
      {!!video.thumbnailUrl && <Image source={{ uri: video.thumbnailUrl }} style={{ width: 240, height: 135 }} />}
      <Text style={styles.cardTitle}>Replacement</Text><Text>{preview.replacement.title || video.title}</Text>
      {!!preview.replacement.thumbnailUrl && <Image source={{ uri: preview.replacement.thumbnailUrl }} style={{ width: 240, height: 135 }} onLoad={() => setThumbnailReady(true)} onError={() => { setPreview((current) => current ? { ...current, replacement: { title: current.replacement.title } } : current); setThumbnailReady(true); setMessage('Replacement image unavailable. You can still approve the title.'); }} />}
      <Pressable accessibilityRole="button" disabled={!thumbnailReady || (!preview.replacement.title && !preview.replacement.thumbnailUrl)} style={styles.toggleRow} onPress={() => save(preview.replacement)}><Text>Approve this replacement</Text></Pressable>
      <Pressable accessibilityRole="button" style={styles.toggleRow} onPress={() => save()}><Text>Use original title and thumbnail</Text></Pressable>
      <Pressable accessibilityRole="button" style={styles.toggleRow} onPress={() => setPreview(undefined)}><Text>Cancel preview</Text></Pressable>
    </>}
  </View>;
}
