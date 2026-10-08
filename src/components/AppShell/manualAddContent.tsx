import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { FocusablePressable } from '../tv';
import { colors } from '../theme';
import { ChannelAvatar } from '../youtube/VideoCard';
import { styles } from './appShell.style';
import { AddButton, Field, FormCard } from './appFormControls';
import { useChannelAddFlow, useChannelForm, useChannelLookupForm, useManualAddSection, useVideoForm } from './manualAddContent.hook';
import type { ChannelAddFlowProps, ChannelFormProps, ChannelLookupFormProps, ManualAddSectionProps, VideoFormProps } from './manualAddContent.type';

export function ManualAddSection({ channels, onAddChannel, onAddVideo, onLookupChannel }: ManualAddSectionProps) {
  const { adding, setAdding, cancel, saveChannel, saveVideo } = useManualAddSection({ onAddChannel, onAddVideo });
  return (
    <View style={styles.manualSection}>
      <Text style={styles.listLabel}>ADD CONTENT</Text>
      {adding === 'channel' ? <ChannelAddFlow existingChannels={channels} onCancel={cancel} onSave={saveChannel} onLookupChannel={onLookupChannel} /> : null}
      {adding === 'video' ? <VideoForm channels={channels} onCancel={cancel} onSave={saveVideo} /> : null}
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
function ChannelAddFlow({ existingChannels, onCancel, onSave, onLookupChannel }: ChannelAddFlowProps) {
  const { mode, switchToManual } = useChannelAddFlow();
  if (mode === 'manual') return <ChannelForm onCancel={onCancel} onSave={onSave} />;
  return <ChannelLookupForm existingChannels={existingChannels} onCancel={onCancel} onSave={onSave} onLookup={onLookupChannel} onSwitchToManual={switchToManual} />;
}

function ChannelLookupForm({ existingChannels, onCancel, onSave, onLookup, onSwitchToManual }: ChannelLookupFormProps) {
  const { input, changeInput, resolved, error, busy, lookUp, save } = useChannelLookupForm({ existingChannels, onSave, onLookup });
  return (
    <FormCard title="Add approved channel" subtitle="Paste a channel link, @handle or UC… ID. kidTube looks it up and fills in the name and thumbnail." onCancel={onCancel} onSave={save}>
      <View style={styles.lookupRow}>
        <View style={styles.lookupTextArea}><Field label="YouTube channel link, handle or ID" value={input} onChangeText={changeInput} placeholder="https://youtube.com/@channel…" autoCapitalize="none" keyboardType="url" /></View>
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

function ChannelForm({ onCancel, onSave }: ChannelFormProps) {
  const { name, setName, channelId, setChannelId, sourceUrl, setSourceUrl, thumbnailUrl, setThumbnailUrl, error, save } = useChannelForm(onSave);
  return <FormCard title="Add approved channel" subtitle="This lets videos from this channel appear in Kid Mode." onCancel={onCancel} onSave={save}>
    <Field label="Channel name" value={name} onChangeText={setName} placeholder="e.g. Bluey" />
    <Field label="YouTube channel URL" value={sourceUrl} onChangeText={setSourceUrl} placeholder="Optional — for your reference" keyboardType="url" />
    <Field label="Channel ID" value={channelId} onChangeText={setChannelId} placeholder="UC…" autoCapitalize="none" />
    <Field label="Thumbnail URL" value={thumbnailUrl} onChangeText={setThumbnailUrl} placeholder="Optional" keyboardType="url" />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </FormCard>;
}

function VideoForm({ channels, onCancel, onSave }: VideoFormProps) {
  const { title, setTitle, videoInput, setVideoInput, channelName, setChannelName, channelId, setChannelId, duration, setDuration, thumbnailUrl, setThumbnailUrl, error, save } = useVideoForm(onSave);
  return <FormCard title="Add approved video" subtitle="Paste a video ID or URL. kidTube never searches or browses YouTube on its own." onCancel={onCancel} onSave={save}>
    <Field label="Video title" value={title} onChangeText={setTitle} placeholder="e.g. A calm morning song" />
    <Field label="YouTube video URL or ID" value={videoInput} onChangeText={setVideoInput} placeholder="https://youtu.be/…" autoCapitalize="none" keyboardType="url" />
    <View style={styles.twoFields}><View style={styles.halfField}><Field label="Channel name" value={channelName} onChangeText={setChannelName} placeholder="Optional" /></View><View style={styles.halfField}><Field label="Channel ID" value={channelId} onChangeText={setChannelId} placeholder="Optional" autoCapitalize="none" /></View></View>
    {channels.length > 0 && <Text style={styles.helperText}>Tip: use a saved channel’s ID so its approved videos stay connected.</Text>}
    <View style={styles.twoFields}><View style={styles.halfField}><Field label="Duration (minutes)" value={duration} onChangeText={setDuration} placeholder="e.g. 5" keyboardType="number-pad" /></View><View style={styles.halfField}><Field label="Thumbnail URL" value={thumbnailUrl} onChangeText={setThumbnailUrl} placeholder="Optional" keyboardType="url" /></View></View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </FormCard>;
}
