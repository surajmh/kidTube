import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ContentCandidate } from '../../types';
import { colors } from '../theme';
import { FocusablePressable } from '../tv';
import styles from './parentContent.style';
import { PARENT_CONTENT_COPY } from './parentContent.constant';
import type { UseParentContent } from './parentContent.type';

/** Dashboard-only link lookup. Results stay unplayable until the parent approves them. */
export function ParentContentSearch({
  content,
  onSaveCandidate,
  onApproveCandidate,
}: {
  content: UseParentContent;
  onSaveCandidate: (candidate: ContentCandidate) => Promise<void>;
  onApproveCandidate: (candidate: ContentCandidate) => Promise<void>;
}) {
  const { searchQuery, setSearchQuery, results, searchError, searching, notice, titled, runSearch } = content;
  return (
    <View style={styles.searchCard}>
      <View style={styles.searchHeader}>
        <View style={styles.searchIcon}><Feather name="search" size={18} color={colors.ink} /></View>
        <View style={styles.searchHeaderText}>
          <Text style={styles.searchTitle}>{PARENT_CONTENT_COPY.searchTitle}</Text>
          <Text style={styles.searchBody}>
            Only available in Parent Mode. Results are never playable until you approve them, and Kid Mode has no search at all.
          </Text>
        </View>
      </View>
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={PARENT_CONTENT_COPY.searchPlaceholder}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        style={styles.input}
        accessibilityLabel="Paste a YouTube link to approve"
      />
      <FocusablePressable accessibilityLabel="Look up link" style={styles.lookup} disabled={searching} onPress={() => void runSearch()}>
        <Feather name="link" size={16} color="#fff" />
        <Text style={styles.lookupText}>{searching ? 'Looking up…' : 'Look up link'}</Text>
      </FocusablePressable>
      {searchError ? <Text style={styles.error}>{searchError}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {results?.map((candidate) => {
        const key = candidate.youtubeVideoId ?? candidate.youtubeChannelId ?? candidate.title;
        return (
          <View key={`${candidate.type}-${key}`} style={styles.resultRow}>
            <View style={styles.thumbFallback}>
              <Feather name={candidate.type === 'video' ? 'film' : 'radio'} size={18} color={colors.ink} />
            </View>
            <View style={styles.rowInfo}>
              <TextInput
                value={titled(candidate).title}
                onChangeText={(value) => content.setResultTitle(candidate, value)}
                style={styles.resultTitleInput}
                accessibilityLabel="Approved title"
                maxLength={80}
              />
              <Text style={styles.rowMeta} numberOfLines={1}>
                {candidate.type === 'video' ? candidate.youtubeVideoId : candidate.youtubeChannelId}
                {candidate.alreadyKnown ? ' · already in your library' : ''}
              </Text>
            </View>
            <FocusablePressable
              accessibilityLabel="Save for children to ask about"
              style={styles.resultAction}
              onPress={() =>
                void onSaveCandidate(titled(candidate)).then(() =>
                  content.setNotice('Saved as an ask-a-parent item. It stays unplayable until you approve it.'),
                )
              }
            >
              <Text style={styles.resultActionText}>Save</Text>
            </FocusablePressable>
            <FocusablePressable
              accessibilityLabel="Approve for everyone"
              style={styles.resultApprove}
              onPress={() =>
                void onApproveCandidate(titled(candidate)).then(() => content.setNotice('Approved into the family library.'))
              }
            >
              <Text style={styles.resultApproveText}>Approve</Text>
            </FocusablePressable>
          </View>
        );
      })}
    </View>
  );
}
