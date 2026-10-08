import { useState } from 'react';
import { extractChannelId, extractVideoId } from '../../services/contentValidation';
import { ApprovedChannel, ApprovedVideo } from '../../types';
import { id } from '../../utils/id';
import type { AddContentModalProps, ChannelFormProps, VideoFormProps } from './addContentModal.type';

/** Saving closes the modal; a failed save throws, so the form shows the error and stays open. */
export function useAddContentModal({ onAddChannel, onAddVideo, onClose }: Pick<AddContentModalProps, 'onAddChannel' | 'onAddVideo' | 'onClose'>) {
  const saveChannel = async (channel: ApprovedChannel) => { await onAddChannel(channel); onClose(); };
  const saveVideo = async (video: ApprovedVideo) => { await onAddVideo(video); onClose(); };
  return { saveChannel, saveVideo };
}

/** Both flows start with the lookup and fall back to the plain form on request. */
export function useAddMode() {
  const [mode, setMode] = useState<'lookup' | 'manual'>('lookup');
  return { mode, switchToManual: () => setMode('manual') };
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
