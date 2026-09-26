import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../../types';
import { ContentRequest, RequestType } from '../../parentalControlsTypes';
import { FocusablePressable } from '../tv';
import { ICON } from './kidHome.constant';
import styles from './kidHome.style';

/** Ask a Parent. No browsing and no search: saved-but-unapproved items, or the child's own words. */
export function AskPanel({
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
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const mine = activeProfile ? requests.filter((request) => request.profileId === activeProfile.id) : [];

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
    <View style={styles.ask}>
      <Text style={styles.askTitle}>Ask a grown-up</Text>
      <Text style={styles.askBody}>
        Tell them what you would like to watch. They decide what gets added.
      </Text>

      <View style={styles.askForm}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What would you like to watch?"
          placeholderTextColor={ICON.inkDim}
          style={styles.askInput}
          accessibilityLabel="What would you like to watch?"
        />
        <FocusablePressable
          accessibilityLabel="Send request"
          disabled={busy || !title.trim()}
          style={[styles.askSend, (busy || !title.trim()) && styles.askSendDisabled]}
          onPress={() =>
            run(async () => {
              await onSubmit({ type: 'video', title: title.trim() });
              setTitle('');
            })
          }
        >
          <Text style={styles.askSendText}>Ask</Text>
        </FocusablePressable>
      </View>
      {message ? <Text style={styles.askError}>{message}</Text> : null}

      {askableVideos.length > 0 ? (
        <>
          <Text style={styles.askSection}>Saved videos you can ask for</Text>
          {askableVideos.map((video) => (
            <AskRow
              key={`ask-${video.id}`}
              label={video.title}
              busy={busy}
              onPress={() => run(() => onRequestVideo(video))}
            />
          ))}
        </>
      ) : null}

      {askableChannels.length > 0 ? (
        <>
          <Text style={styles.askSection}>Saved channels you can ask for</Text>
          {askableChannels.map((channel) => (
            <AskRow
              key={`ask-${channel.id}`}
              label={channel.name}
              busy={busy}
              onPress={() => run(() => onRequestChannel(channel))}
            />
          ))}
        </>
      ) : null}

      {mine.length > 0 ? (
        <>
          <Text style={styles.askSection}>What you asked for</Text>
          {mine.map((request) => (
            <View
              key={request.id}
              style={styles.askRow}
            >
              <Text style={styles.askRowLabel} numberOfLines={2}>{request.title}</Text>
              <Text style={styles.askStatus}>{request.status}</Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

function AskRow({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <View style={styles.askRow}>
      <Text style={styles.askRowLabel} numberOfLines={2}>{label}</Text>
      <FocusablePressable
        accessibilityLabel={`Ask for ${label}`}
        disabled={busy}
        style={styles.askRowButton}
        onPress={onPress}
      >
        <Text style={styles.askRowButtonText}>Ask</Text>
      </FocusablePressable>
    </View>
  );
}
