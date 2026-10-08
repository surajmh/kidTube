import { useState } from 'react';
import type { ResolvedChannel } from '../../services/channelSyncService.type';
import { extractChannelId, extractVideoId } from '../../services/contentValidation';
import { ApprovedChannel, ApprovedVideo } from '../../types';
import { id } from '../../utils/id';
import type { ChannelFormProps, ChannelLookupFormProps, VideoFormProps } from './manualAddContent.type';

export function useManualAddSection({ onAddChannel, onAddVideo }: { onAddChannel: (channel: ApprovedChannel) => Promise<void>; onAddVideo: (video: ApprovedVideo) => Promise<void> }) {
  const [adding, setAdding] = useState<'channel' | 'video' | null>(null);
  const cancel = () => setAdding(null);
  const saveChannel = async (channel: ApprovedChannel) => { await onAddChannel(channel); setAdding(null); };
  const saveVideo = async (video: ApprovedVideo) => { await onAddVideo(video); setAdding(null); };
  return { adding, setAdding, cancel, saveChannel, saveVideo };
}

export function useChannelAddFlow() {
  const [mode, setMode] = useState<'lookup' | 'manual'>('lookup');
  return { mode, switchToManual: () => setMode('manual') };
}

export function useChannelLookupForm({ existingChannels, onSave, onLookup }: Pick<ChannelLookupFormProps, 'existingChannels' | 'onSave' | 'onLookup'>) {
  const [input, setInput] = useState('');
  const [resolved, setResolved] = useState<ResolvedChannel | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function lookUp() {
    setBusy(true);
    setError('');
    setResolved(null);
    try {
      setResolved(await onLookup(input));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That channel could not be looked up.');
    } finally {
      setBusy(false);
    }
  }
  const duplicate = resolved ? existingChannels.find((channel) => channel.channelId === resolved.youtubeChannelId) : undefined;
  async function save() {
    if (!resolved) { setError('Look up the channel first.'); return; }
    if (duplicate) { setError(`${duplicate.name} is already in your library.`); return; }
    await onSave({ id: id('channel'), name: resolved.name, channelId: resolved.youtubeChannelId, thumbnailUrl: resolved.thumbnailUrl, sourceUrl: `https://www.youtube.com/channel/${resolved.youtubeChannelId}`, approved: true });
  }
  function changeInput(value: string) {
    setInput(value); setResolved(null); setError('');
  }
  return { input, changeInput, resolved, error, busy, lookUp, save };
}

export function useChannelForm(onSave: ChannelFormProps['onSave']) {
  const [name, setName] = useState(''); const [channelId, setChannelId] = useState(''); const [sourceUrl, setSourceUrl] = useState(''); const [thumbnailUrl, setThumbnailUrl] = useState(''); const [error, setError] = useState('');
  async function save() {
    // A pasted channel URL normalizes to the same id as typing it by hand.
    const resolvedChannelId = extractChannelId(channelId) ?? extractChannelId(sourceUrl) ?? '';
    if (!name.trim() || !resolvedChannelId) { setError('Add a name and a valid channel ID (UC…) or channel URL.'); return; }
    await onSave({ id: id('channel'), name: name.trim(), channelId: resolvedChannelId, thumbnailUrl: thumbnailUrl.trim() || undefined, sourceUrl: sourceUrl.trim() || undefined, approved: true });
  }
  return { name, setName, channelId, setChannelId, sourceUrl, setSourceUrl, thumbnailUrl, setThumbnailUrl, error, save };
}

export function useVideoForm(onSave: VideoFormProps['onSave']) {
  const [title, setTitle] = useState(''); const [videoInput, setVideoInput] = useState(''); const [channelName, setChannelName] = useState(''); const [channelId, setChannelId] = useState(''); const [duration, setDuration] = useState(''); const [thumbnailUrl, setThumbnailUrl] = useState(''); const [error, setError] = useState('');
  async function save() {
    const youtubeVideoId = extractVideoId(videoInput);
    if (!title.trim() || !youtubeVideoId) { setError('Add a title and a valid video ID or YouTube URL.'); return; }
    await onSave({ id: id('video'), youtubeVideoId, title: title.trim(), thumbnailUrl: thumbnailUrl.trim() || undefined, channelId: channelId.trim() || undefined, channelName: channelName.trim() || undefined, duration: duration ? Number(duration) * 60 : undefined, sourceUrl: videoInput.trim(), approved: true });
  }
  return { title, setTitle, videoInput, setVideoInput, channelName, setChannelName, channelId, setChannelId, duration, setDuration, thumbnailUrl, setThumbnailUrl, error, save };
}
