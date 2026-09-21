import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../types';
import { ContentRequest, RequestType } from '../phase4Types';
import { colors } from './theme';
import { FocusablePressable } from './tv';

/**
 * Kid-facing "Ask a Parent" surface.
 *
 * There is no browsing and no search here: a child can ask for a saved family
 * library item that is not approved yet, or describe something in their own
 * words. Either way a parent decides.
 */
export function KidRequestsPanel({
  activeProfile,
  askableVideos,
  askableChannels,
  requests,
  onSubmit,
  onRequestVideo,
  onRequestChannel,
}: {
  activeProfile?: ChildProfile;
  askableVideos: ApprovedVideo[];
  askableChannels: ApprovedChannel[];
  requests: ContentRequest[];
  onSubmit: (input: { type: RequestType; title: string }) => Promise<void>;
  onRequestVideo: (video: ApprovedVideo) => Promise<void>;
  onRequestChannel: (channel: ApprovedChannel) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<RequestType>('video');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const profileRequests = activeProfile
    ? requests.filter((request) => request.profileId === activeProfile.id)
    : [];

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'That request did not go through.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Feather name="help-circle" size={26} color={colors.ink} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Ask a Parent</Text>
          <Text style={styles.heroBody}>Found something you would like to watch? Ask your grown-up and they will add it for you.</Text>
        </View>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {askableVideos.length > 0 && (
        <>
          <Text style={styles.listLabel}>A GROWN-UP SAVED THESE</Text>
          {askableVideos.map((video) => (
            <FocusablePressable
              key={video.id}
              accessibilityLabel={`Ask for ${video.title}`}
              style={styles.askRow}
              disabled={busy}
              onPress={() => void run(() => onRequestVideo(video))}
            >
              <View style={styles.askIcon}>
                <Feather name="play" size={18} color={colors.ink} />
              </View>
              <View style={styles.askInfo}>
                <Text style={styles.askTitle} numberOfLines={1}>{video.title}</Text>
                <Text style={styles.askMeta} numberOfLines={1}>{video.channelName ?? 'Saved for you to ask about'}</Text>
              </View>
              <Text style={styles.askAction}>Ask</Text>
            </FocusablePressable>
          ))}
        </>
      )}

      {askableChannels.length > 0 && (
        <>
          <Text style={styles.listLabel}>CHANNELS A GROWN-UP SAVED</Text>
          {askableChannels.map((channel) => (
            <FocusablePressable
              key={channel.id}
              accessibilityLabel={`Ask for ${channel.name}`}
              style={styles.askRow}
              disabled={busy}
              onPress={() => void run(() => onRequestChannel(channel))}
            >
              <View style={styles.askIcon}>
                <Feather name="radio" size={18} color={colors.ink} />
              </View>
              <View style={styles.askInfo}>
                <Text style={styles.askTitle} numberOfLines={1}>{channel.name}</Text>
                <Text style={styles.askMeta} numberOfLines={1}>Channel</Text>
              </View>
              <Text style={styles.askAction}>Ask</Text>
            </FocusablePressable>
          ))}
        </>
      )}

      <Text style={styles.listLabel}>TELL YOUR GROWN-UP</Text>
      <View style={styles.form}>
        <View style={styles.typeRow}>
          {(['video', 'channel'] as RequestType[]).map((option) => (
            <FocusablePressable
              key={option}
              accessibilityLabel={option === 'video' ? 'Request a video' : 'Request a channel'}
              style={[styles.typeChip, type === option && styles.typeChipActive]}
              onPress={() => setType(option)}
            >
              <Feather name={option === 'video' ? 'play-circle' : 'radio'} size={16} color={type === option ? colors.purple : colors.muted} />
              <Text style={[styles.typeText, type === option && styles.typeTextActive]}>{option === 'video' ? 'A video' : 'A channel'}</Text>
            </FocusablePressable>
          ))}
        </View>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={type === 'video' ? 'What is the video called?' : 'What is the channel called?'}
          placeholderTextColor="#B8B1AA"
          style={styles.input}
          maxLength={80}
          accessibilityLabel="What would you like to watch"
        />
        <FocusablePressable
          accessibilityLabel="Send request to your parent"
          style={styles.submit}
          disabled={busy}
          onPress={() => void run(async () => { await onSubmit({ type, title }); setTitle(''); })}
        >
          <Text style={styles.submitText}>Send to my grown-up</Text>
          <Feather name="send" size={17} color="#fff" />
        </FocusablePressable>
      </View>

      <Text style={styles.listLabel}>MY ASKS</Text>
      {profileRequests.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing asked yet</Text>
          <Text style={styles.emptyBody}>When you ask for something, it shows up here.</Text>
        </View>
      ) : (
        profileRequests.map((request) => (
          <View key={request.id} style={styles.requestRow}>
            <View style={[styles.statusDot, request.status === 'approved' ? styles.statusApproved : request.status === 'rejected' ? styles.statusRejected : styles.statusPending]} />
            <View style={styles.askInfo}>
              <Text style={styles.askTitle} numberOfLines={1}>{request.title ?? 'A video'}</Text>
              <Text style={styles.askMeta}>
                {request.status === 'pending' ? 'Waiting for your grown-up' : request.status === 'approved' ? 'Approved — look in your library!' : 'Not this time'}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', backgroundColor: colors.peach, borderRadius: 22, flexDirection: 'row', gap: 14, marginTop: 20, padding: 16 },
  heroIcon: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  heroText: { flex: 1 },
  heroTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  heroBody: { color: '#855A4B', fontSize: 13, lineHeight: 19, marginTop: 4 },
  message: { backgroundColor: colors.lavender, borderRadius: 12, color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 12, padding: 12 },
  listLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 9, marginTop: 24 },
  askRow: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, flexDirection: 'row', marginBottom: 8, minHeight: 70, padding: 10 },
  askIcon: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 12, height: 46, justifyContent: 'center', width: 46 },
  askInfo: { flex: 1, paddingHorizontal: 11 },
  askTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  askMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  askAction: { color: colors.ink, fontSize: 14, fontWeight: '900', paddingHorizontal: 12 },
  form: { backgroundColor: colors.card, borderRadius: 18, padding: 14 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 12, flexDirection: 'row', gap: 6, minHeight: 44, paddingHorizontal: 12 },
  typeChipActive: { backgroundColor: colors.lavender },
  typeText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  typeTextActive: { color: colors.ink },
  input: { backgroundColor: colors.canvas, borderRadius: 13, color: colors.ink, fontSize: 15, height: 50, marginTop: 10, paddingHorizontal: 13 },
  submit: { alignItems: 'center', backgroundColor: colors.purple, borderRadius: 14, flexDirection: 'row', gap: 9, height: 52, justifyContent: 'center', marginTop: 12 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  empty: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 22 },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  emptyBody: { color: colors.muted, fontSize: 13, marginTop: 5, textAlign: 'center' },
  requestRow: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, flexDirection: 'row', marginBottom: 8, minHeight: 62, padding: 10 },
  statusDot: { borderRadius: 7, height: 14, marginHorizontal: 12, width: 14 },
  statusPending: { backgroundColor: colors.yellow },
  statusApproved: { backgroundColor: colors.mintDark },
  statusRejected: { backgroundColor: colors.danger },
});
