import { useTheme } from '../theme';
import React from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import type { ApprovedChannel, ApprovedVideo } from '../../types';
import type { ChannelMatch, VideoMatch } from '../../services/contentLookupService.type';
import { compactCount, formatLength } from '../../services/contentLookupService.helper';
import { canonicalChannelUrl, canonicalVideoUrl } from '../../services/contentValidation';
import { id } from '../../utils/id';
import { FocusablePressable } from '../tv';

import { ChannelAvatar } from '../youtube/VideoCard';
import { useStyles as useStyles } from './appShell.style';
import { CHANNEL_EXAMPLES, LOOKUP_COPY } from './addContentLookup.constant';
import { useMatchLookup } from './addContentLookup.hook';
import type { ChannelLookupProps, LookupFrameProps, VideoLookupProps } from './addContentModal.type';

/** The channel flow: type or paste anything, pick the match, approve. */
export function ChannelLookup({ existingChannels, onFind, onSave, onCancel, onSwitchToManual }: ChannelLookupProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const copy = LOOKUP_COPY.channel;
  const lookup = useMatchLookup<ChannelMatch>({ find: onFind, keyOf: (match) => match.youtubeChannelId });

  function approve() {
    return lookup.submit(async (match) => {
      const duplicate = existingChannels.find((channel) => channel.channelId === match.youtubeChannelId);
      if (duplicate) throw new Error(`${duplicate.name} is already in your library.`);
      const channel: ApprovedChannel = {
        id: id('channel'),
        name: match.name,
        channelId: match.youtubeChannelId,
        thumbnailUrl: match.thumbnailUrl,
        sourceUrl: canonicalChannelUrl(match.youtubeChannelId),
        approved: lookup.allow,
      };
      await onSave(channel);
    }, copy.pickFirst);
  }

  return (
    <LookupFrame
      copy={copy}
      lookup={lookup}
      examples={CHANNEL_EXAMPLES}
      onCancel={onCancel}
      onApprove={approve}
      onSwitchToManual={onSwitchToManual}
      keyboardType="url"
    >
      {lookup.matches.map((match) => (
        <FocusablePressable
          key={match.youtubeChannelId}
          accessibilityLabel={`Pick ${match.name}`}
          style={[styles.matchCard, lookup.selectedKey === match.youtubeChannelId && styles.matchCardSelected]}
          onPress={() => lookup.select(match.youtubeChannelId)}
        >
          <ChannelAvatar name={match.name} uri={match.thumbnailUrl} size={56} />
          <View style={styles.matchInfo}>
            <View style={styles.matchNameRow}>
              <Text style={styles.matchName} numberOfLines={2}>{match.name}</Text>
              {match.verified ? <Feather name="check-circle" size={14} color={colors.mintDark} /> : null}
            </View>
            <Text style={styles.matchMeta} numberOfLines={1}>{channelFacts(match)}</Text>
          </View>
        </FocusablePressable>
      ))}
    </LookupFrame>
  );
}

/** The video flow, same shape as the channel one. */
export function VideoLookup({ onFind, onSave, onCancel, onSwitchToManual }: VideoLookupProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const copy = LOOKUP_COPY.video;
  const lookup = useMatchLookup<VideoMatch>({ find: onFind, keyOf: (match) => match.youtubeVideoId });

  function approve() {
    return lookup.submit(async (match) => {
      const video: ApprovedVideo = {
        id: id('video'),
        youtubeVideoId: match.youtubeVideoId,
        title: match.title,
        thumbnailUrl: match.thumbnailUrl,
        channelId: match.youtubeChannelId,
        channelName: match.channelName,
        duration: match.durationSeconds,
        sourceUrl: canonicalVideoUrl(match.youtubeVideoId),
        approved: lookup.allow,
      };
      await onSave(video);
    }, copy.pickFirst);
  }

  return (
    <LookupFrame copy={copy} lookup={lookup} onCancel={onCancel} onApprove={approve} onSwitchToManual={onSwitchToManual}>
      {lookup.matches.map((match) => (
        <FocusablePressable
          key={match.youtubeVideoId}
          accessibilityLabel={`Pick ${match.title}`}
          style={[styles.matchCard, lookup.selectedKey === match.youtubeVideoId && styles.matchCardSelected]}
          onPress={() => lookup.select(match.youtubeVideoId)}
        >
          <View style={styles.matchThumbBox}>
            {match.thumbnailUrl ? <Image source={{ uri: match.thumbnailUrl }} style={styles.matchThumb} contentFit="cover" /> : <Feather name="play" size={20} color={colors.ink} />}
            {formatLength(match.durationSeconds) ? (
              <View style={styles.matchDuration}><Text style={styles.matchDurationText}>{formatLength(match.durationSeconds)}</Text></View>
            ) : null}
          </View>
          <View style={styles.matchInfo}>
            <Text style={styles.matchName} numberOfLines={2}>{match.title}</Text>
            {match.channelName ? <Text style={styles.matchMeta} numberOfLines={1}>{match.channelName}</Text> : null}
          </View>
        </FocusablePressable>
      ))}
    </LookupFrame>
  );
}

function channelFacts(match: ChannelMatch) {
  const subscribers = compactCount(match.subscriberCount);
  const videos = compactCount(match.videoCount);
  return [subscribers ? `${subscribers} subscribers` : null, videos ? `${videos} videos` : null].filter(Boolean).join(' · ') || 'YouTube channel';
}

/** The input, example chips, match list, allow toggle and buttons both flows share. */
function LookupFrame({ copy, lookup, examples, keyboardType, onCancel, onApprove, onSwitchToManual, children }: LookupFrameProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { query, changeQuery, busy, saving, error, selected, allow, setAllow } = lookup;
  const approveLabel = allow ? copy.approve : copy.saveOnly;
  return (
    <View>
      <Text style={styles.lookupLabel}>{copy.label}</Text>
      <View style={styles.lookupInputRow}>
        <Feather name="link" size={16} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={changeQuery}
          placeholder={copy.placeholder}
          placeholderTextColor={colors.muted}
          style={styles.lookupInput}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={keyboardType}
          returnKeyType="search"
          onSubmitEditing={() => void lookup.run()}
        />
      </View>
      <FocusablePressable accessibilityLabel={copy.action} disabled={busy || !query.trim()} style={[styles.lookupButton, (busy || !query.trim()) && styles.lookupButtonDisabled]} onPress={() => void lookup.run()}>
        {busy ? <ActivityIndicator size="small" color="#1A1A1A" /> : <Feather name="search" size={16} color="#1A1A1A" />}
        <Text style={styles.lookupButtonText}>{busy ? 'Looking…' : copy.action}</Text>
      </FocusablePressable>

      {examples ? (
        <View>
          <Text style={styles.exampleLabel}>{LOOKUP_COPY.examples}</Text>
          <View style={styles.exampleRow}>
            {examples.map((example) => (
              <FocusablePressable key={example} accessibilityLabel={`Try ${example}`} style={styles.exampleChip} onPress={() => lookup.tryExample(example)}>
                <Text style={styles.exampleChipText}>{example}</Text>
              </FocusablePressable>
            ))}
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.matchList}>{children}</View>

      {selected ? (
        <FocusablePressable accessibilityLabel={copy.allowTitle} style={styles.allowRow} onPress={() => setAllow(!allow)}>
          <View style={[styles.checkbox, allow && styles.checkboxOn]}>{allow ? <Feather name="check" size={14} color="#1A1A1A" /> : null}</View>
          <View style={styles.allowText}>
            <Text style={styles.allowTitle}>{copy.allowTitle}</Text>
            <Text style={styles.allowBody}>{copy.allowBody}</Text>
          </View>
        </FocusablePressable>
      ) : null}

      <View style={styles.actionRow}>
        <FocusablePressable accessibilityLabel={LOOKUP_COPY.cancel} style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>{LOOKUP_COPY.cancel}</Text>
        </FocusablePressable>
        <FocusablePressable accessibilityLabel={approveLabel} disabled={saving} style={[styles.approveButton, saving && styles.lookupButtonDisabled]} onPress={() => void onApprove()}>
          <Feather name="check" size={16} color="#1A1A1A" />
          <Text style={styles.approveText}>{saving ? 'Saving…' : approveLabel}</Text>
        </FocusablePressable>
      </View>

      <Text style={styles.footerNote}>
        {copy.footer}{' '}
        <Text style={styles.footerLink} accessibilityRole="button" onPress={onSwitchToManual}>{LOOKUP_COPY.manual}.</Text>
      </Text>
    </View>
  );
}
