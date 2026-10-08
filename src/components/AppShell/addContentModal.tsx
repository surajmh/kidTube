import React from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusablePressable } from '../tv';
import { colors } from '../theme';
import { styles } from './appShell.style';
import { Field, FormCard } from './appFormControls';
import { ChannelLookup, VideoLookup } from './addContentLookup';
import { LOOKUP_COPY } from './addContentLookup.constant';
import { useAddContentModal, useAddMode, useChannelForm, useVideoForm } from './addContentModal.hook';
import type { AddContentModalProps, ChannelAddFlowProps, ChannelFormProps, VideoAddFlowProps, VideoFormProps } from './addContentModal.type';

/** Full-screen form for adding one channel or video, closed from the corner button. */
export function AddContentModal({ kind, channels, onAddChannel, onAddVideo, onFindChannels, onFindVideos, onClose }: AddContentModalProps) {
  const { saveChannel, saveVideo } = useAddContentModal({ onAddChannel, onAddVideo, onClose });
  const copy = LOOKUP_COPY[kind];
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.addModal} edges={['top', 'bottom']}>
        <View style={styles.addModalHeader}>
          <View style={styles.addHero}>
            <View style={styles.addHeroArt}>
              <Feather name={kind === 'channel' ? 'tv' : 'play-circle'} size={32} color="#1A1A1A" />
            </View>
            <View style={styles.addHeroText}>
              <Text style={styles.addModalTitle}>{copy.title}</Text>
              <Text style={styles.addHeroBody}>{copy.subtitle}</Text>
            </View>
          </View>
          <FocusablePressable accessibilityLabel="Close" style={styles.addModalClose} onPress={onClose}>
            <Feather name="x" size={22} color={colors.ink} />
          </FocusablePressable>
        </View>
        <ScrollView contentContainerStyle={styles.addModalBody} keyboardShouldPersistTaps="handled">
          {kind === 'channel' ? <ChannelAddFlow existingChannels={channels} onFind={onFindChannels} onSave={saveChannel} onCancel={onClose} /> : null}
          {kind === 'video' ? <VideoAddFlow channels={channels} onFind={onFindVideos} onSave={saveVideo} onCancel={onClose} /> : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ChannelAddFlow({ existingChannels, onFind, onSave, onCancel }: ChannelAddFlowProps) {
  const { mode, switchToManual } = useAddMode();
  if (mode === 'manual') return <ChannelForm onSave={onSave} />;
  return <ChannelLookup existingChannels={existingChannels} onFind={onFind} onSave={onSave} onCancel={onCancel} onSwitchToManual={switchToManual} />;
}

function VideoAddFlow({ channels, onFind, onSave, onCancel }: VideoAddFlowProps) {
  const { mode, switchToManual } = useAddMode();
  if (mode === 'manual') return <VideoForm channels={channels} onSave={onSave} />;
  return <VideoLookup onFind={onFind} onSave={onSave} onCancel={onCancel} onSwitchToManual={switchToManual} />;
}

/** Fallback for when the lookup cannot reach YouTube: every detail typed by hand. */
function ChannelForm({ onSave }: ChannelFormProps) {
  const { name, setName, channelId, setChannelId, sourceUrl, setSourceUrl, thumbnailUrl, setThumbnailUrl, error, save } = useChannelForm(onSave);
  return <FormCard subtitle="This lets videos from this channel appear in Kid Mode." onSave={save}>
    <Field label="Channel name" value={name} onChangeText={setName} placeholder="e.g. Bluey" />
    <Field label="YouTube channel URL" value={sourceUrl} onChangeText={setSourceUrl} placeholder="Optional — for your reference" keyboardType="url" />
    <Field label="Channel ID" value={channelId} onChangeText={setChannelId} placeholder="UC…" autoCapitalize="none" />
    <Field label="Thumbnail URL" value={thumbnailUrl} onChangeText={setThumbnailUrl} placeholder="Optional" keyboardType="url" />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </FormCard>;
}

function VideoForm({ channels, onSave }: VideoFormProps) {
  const { title, setTitle, videoInput, setVideoInput, channelName, setChannelName, channelId, setChannelId, duration, setDuration, thumbnailUrl, setThumbnailUrl, error, save } = useVideoForm(onSave);
  return <FormCard subtitle="Paste a video ID or URL and type its title." onSave={save}>
    <Field label="Video title" value={title} onChangeText={setTitle} placeholder="e.g. A calm morning song" />
    <Field label="YouTube video URL or ID" value={videoInput} onChangeText={setVideoInput} placeholder="https://youtu.be/…" autoCapitalize="none" keyboardType="url" />
    <View style={styles.twoFields}><View style={styles.halfField}><Field label="Channel name" value={channelName} onChangeText={setChannelName} placeholder="Optional" /></View><View style={styles.halfField}><Field label="Channel ID" value={channelId} onChangeText={setChannelId} placeholder="Optional" autoCapitalize="none" /></View></View>
    {channels.length > 0 && <Text style={styles.helperText}>Tip: use a saved channel’s ID so its approved videos stay connected.</Text>}
    <View style={styles.twoFields}><View style={styles.halfField}><Field label="Duration (minutes)" value={duration} onChangeText={setDuration} placeholder="e.g. 5" keyboardType="number-pad" /></View><View style={styles.halfField}><Field label="Thumbnail URL" value={thumbnailUrl} onChangeText={setThumbnailUrl} placeholder="Optional" keyboardType="url" /></View></View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </FormCard>;
}
