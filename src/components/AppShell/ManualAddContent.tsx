import React, { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { FocusablePressable } from '../tv';
import { colors } from '../theme';
import { ChannelAvatar } from '../youtube/VideoCard';
import { ResolvedChannel } from '../../services/channelSyncService';
import { extractChannelId, extractVideoId } from '../../services/contentValidation';
import { ApprovedChannel, ApprovedVideo } from '../../types';
import { id } from '../../utils/id';
import { styles } from './appShell.style';
import { AddButton, Field, FormCard } from './AppFormControls';

export function ManualAddSection({ channels, onAddChannel, onAddVideo, onLookupChannel }: { channels: ApprovedChannel[]; onAddChannel: (channel: ApprovedChannel) => Promise<void>; onAddVideo: (video: ApprovedVideo) => Promise<void>; onLookupChannel: (input: string) => Promise<ResolvedChannel> }) {
  const [adding, setAdding] = useState<'channel' | 'video' | null>(null);
  return (
    <View style={styles.manualSection}>
      <Text style={styles.listLabel}>ADD CONTENT</Text>
      {adding === 'channel' ? <ChannelAddFlow existingChannels={channels} onCancel={() => setAdding(null)} onSave={async (channel) => { await onAddChannel(channel); setAdding(null); }} onLookupChannel={onLookupChannel} /> : null}
      {adding === 'video' ? <VideoForm channels={channels} onCancel={() => setAdding(null)} onSave={async (video) => { await onAddVideo(video); setAdding(null); }} /> : null}
      {!adding && (
        <View style={styles.addActions}>
          <AddButton label="Add channel" icon="radio" onPress={() => setAdding('channel')} />
          <AddButton label="Add video" icon="play-circle" onPress={() => setAdding('video')} />
        </View>
      )}
    </View>
  );
}

/**
 * Channel lookup by text: one pasted link, @handle or UC… id resolves the real
 * name and thumbnail on-device. The full manual form stays available as a
 * fallback — e.g. when the native extractor can't reach YouTube.
 */
function ChannelAddFlow({ existingChannels, onCancel, onSave, onLookupChannel }: { existingChannels: ApprovedChannel[]; onCancel: () => void; onSave: (channel: ApprovedChannel) => Promise<void>; onLookupChannel: (input: string) => Promise<ResolvedChannel> }) {
  const [mode, setMode] = useState<'lookup' | 'manual'>('lookup');
  if (mode === 'manual') return <ChannelForm onCancel={onCancel} onSave={onSave} />;
  return <ChannelLookupForm existingChannels={existingChannels} onCancel={onCancel} onSave={onSave} onLookup={onLookupChannel} onSwitchToManual={() => setMode('manual')} />;
}

function ChannelLookupForm({ existingChannels, onCancel, onSave, onLookup, onSwitchToManual }: { existingChannels: ApprovedChannel[]; onCancel: () => void; onSave: (channel: ApprovedChannel) => Promise<void>; onLookup: (input: string) => Promise<ResolvedChannel>; onSwitchToManual: () => void }) {
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
  return (
    <FormCard title="Add approved channel" subtitle="Paste a channel link, @handle or UC… ID. kidTube looks it up and fills in the name and thumbnail." onCancel={onCancel} onSave={async () => {
      if (!resolved) { setError('Look up the channel first.'); return; }
      if (duplicate) { setError(`${duplicate.name} is already in your library.`); return; }
      await onSave({ id: id('channel'), name: resolved.name, channelId: resolved.youtubeChannelId, thumbnailUrl: resolved.thumbnailUrl, sourceUrl: `https://www.youtube.com/channel/${resolved.youtubeChannelId}`, approved: true });
    }}>
      <View style={styles.lookupRow}>
        <View style={styles.lookupTextArea}><Field label="YouTube channel link, handle or ID" value={input} onChangeText={(value) => { setInput(value); setResolved(null); setError(''); }} placeholder="https://youtube.com/@channel…" autoCapitalize="none" keyboardType="url" /></View>
        <FocusablePressable accessibilityLabel="Look up channel" disabled={busy || !input.trim()} style={styles.smallAction} onPress={() => void lookUp()}>
          {busy ? <ActivityIndicator size="small" color={colors.ink} /> : <Text style={styles.smallActionText}>Look up</Text>}
        </FocusablePressable>
      </View>
      {resolved ? (
        <View style={styles.resolvedRow}>
          <ChannelAvatar name={resolved.name} uri={resolved.thumbnailUrl} size={42} />
          <View style={styles.profileRowInfo}>
            <Text style={styles.rowTitle}>{resolved.name}</Text>
            <Text style={styles.rowSubtitle}>{resolved.youtubeChannelId}</Text>
          </View>
        </View>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <FocusablePressable accessibilityLabel="Add manually instead" onPress={onSwitchToManual}>
        <Text style={styles.manualFormLink}>Add manually instead</Text>
      </FocusablePressable>
    </FormCard>
  );
}

function ChannelForm({ onCancel, onSave }: { onCancel: () => void; onSave: (channel: ApprovedChannel) => Promise<void> }) {
  const [name, setName] = useState(''); const [channelId, setChannelId] = useState(''); const [sourceUrl, setSourceUrl] = useState(''); const [thumbnailUrl, setThumbnailUrl] = useState(''); const [error, setError] = useState('');
  return <FormCard title="Add approved channel" subtitle="This lets videos from this channel appear in Kid Mode." onCancel={onCancel} onSave={async () => { // A pasted channel URL normalizes to the same id as typing it by hand.
    const resolvedChannelId = extractChannelId(channelId) ?? extractChannelId(sourceUrl) ?? ''; if (!name.trim() || !resolvedChannelId) { setError('Add a name and a valid channel ID (UC…) or channel URL.'); return; } await onSave({ id: id('channel'), name: name.trim(), channelId: resolvedChannelId, thumbnailUrl: thumbnailUrl.trim() || undefined, sourceUrl: sourceUrl.trim() || undefined, approved: true }); }}>
    <Field label="Channel name" value={name} onChangeText={setName} placeholder="e.g. Bluey" />
    <Field label="YouTube channel URL" value={sourceUrl} onChangeText={setSourceUrl} placeholder="Optional — for your reference" keyboardType="url" />
    <Field label="Channel ID" value={channelId} onChangeText={setChannelId} placeholder="UC…" autoCapitalize="none" />
    <Field label="Thumbnail URL" value={thumbnailUrl} onChangeText={setThumbnailUrl} placeholder="Optional" keyboardType="url" />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </FormCard>;
}

function VideoForm({ channels, onCancel, onSave }: { channels: ApprovedChannel[]; onCancel: () => void; onSave: (video: ApprovedVideo) => Promise<void> }) {
  const [title, setTitle] = useState(''); const [videoInput, setVideoInput] = useState(''); const [channelName, setChannelName] = useState(''); const [channelId, setChannelId] = useState(''); const [duration, setDuration] = useState(''); const [thumbnailUrl, setThumbnailUrl] = useState(''); const [error, setError] = useState('');
  return <FormCard title="Add approved video" subtitle="Paste a video ID or URL. kidTube never searches or browses YouTube on its own." onCancel={onCancel} onSave={async () => { const youtubeVideoId = extractVideoId(videoInput); if (!title.trim() || !youtubeVideoId) { setError('Add a title and a valid video ID or YouTube URL.'); return; } await onSave({ id: id('video'), youtubeVideoId, title: title.trim(), thumbnailUrl: thumbnailUrl.trim() || undefined, channelId: channelId.trim() || undefined, channelName: channelName.trim() || undefined, duration: duration ? Number(duration) * 60 : undefined, sourceUrl: videoInput.trim(), approved: true }); }}>
    <Field label="Video title" value={title} onChangeText={setTitle} placeholder="e.g. A calm morning song" />
    <Field label="YouTube video URL or ID" value={videoInput} onChangeText={setVideoInput} placeholder="https://youtu.be/…" autoCapitalize="none" keyboardType="url" />
    <View style={styles.twoFields}><View style={styles.halfField}><Field label="Channel name" value={channelName} onChangeText={setChannelName} placeholder="Optional" /></View><View style={styles.halfField}><Field label="Channel ID" value={channelId} onChangeText={setChannelId} placeholder="Optional" autoCapitalize="none" /></View></View>
    {channels.length > 0 && <Text style={styles.helperText}>Tip: use a saved channel’s ID so its approved videos stay connected.</Text>}
    <View style={styles.twoFields}><View style={styles.halfField}><Field label="Duration (minutes)" value={duration} onChangeText={setDuration} placeholder="e.g. 5" keyboardType="number-pad" /></View><View style={styles.halfField}><Field label="Thumbnail URL" value={thumbnailUrl} onChangeText={setThumbnailUrl} placeholder="Optional" keyboardType="url" /></View></View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </FormCard>;
}
