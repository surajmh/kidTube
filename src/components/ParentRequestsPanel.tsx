import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../types';
import {
  ApprovalDuration,
  ContentRequest,
  approvalDurationLabels,
  approvalDurationOrder,
} from '../phase4Types';
import { describeRequestTarget, requestTarget } from '../services/requestService';
import { colors } from './theme';
import { FocusablePressable } from './tv';

export type RequestDecisionInput = {
  request: ContentRequest;
  decision: 'approved' | 'rejected';
  profileId: string | null;
  duration: ApprovalDuration;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function ParentRequestsPanel({
  profiles,
  requests,
  videos,
  channels,
  onDecide,
  onDelete,
  onClearResolved,
}: {
  profiles: ChildProfile[];
  requests: ContentRequest[];
  videos: ApprovedVideo[];
  channels: ApprovedChannel[];
  onDecide: (input: RequestDecisionInput) => Promise<void>;
  onDelete: (requestId: string) => Promise<void>;
  onClearResolved: () => Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, ApprovalDuration>>({});
  const [scopes, setScopes] = useState<Record<string, 'child' | 'family'>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const pending = requests.filter((request) => request.status === 'pending');
  const resolved = requests.filter((request) => request.status !== 'pending');

  function profileName(profileId: string) {
    return profiles.find((profile) => profile.id === profileId)?.name ?? 'Child';
  }

  function durationFor(requestId: string) {
    return durations[requestId] ?? 'permanent';
  }

  function scopeFor(requestId: string) {
    return scopes[requestId] ?? 'child';
  }

  function thumbnailFor(request: ContentRequest) {
    if (request.thumbnailUrl) return request.thumbnailUrl;
    return videos.find((video) => video.youtubeVideoId === request.youtubeVideoId)?.thumbnailUrl;
  }

  async function decide(input: RequestDecisionInput) {
    setBusyId(input.request.id);
    setError('');
    try {
      await onDecide(input);
      setOpenId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That decision could not be saved.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View>
      <View style={styles.intro}>
        <View>
          <Text style={styles.title}>Requests</Text>
          <Text style={styles.subtitle}>What your children asked to watch.</Text>
        </View>
        <View style={[styles.pendingBadge, pending.length === 0 && styles.pendingBadgeEmpty]}>
          <View style={[styles.pendingDot, pending.length === 0 && styles.pendingDotEmpty]} />
          <Text style={[styles.pendingText, pending.length === 0 && styles.pendingTextEmpty]}>
            {pending.length} pending
          </Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {pending.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No open requests</Text>
          <Text style={styles.emptyBody}>When a child asks for something in Kid Mode it lands here for your decision.</Text>
        </View>
      ) : (
        pending.map((request) => {
          const isOpen = openId === request.id;
          const duration = durationFor(request.id);
          const scope = scopeFor(request.id);
          const thumbnail = thumbnailFor(request);
          const hasTarget = requestTarget(request) !== null;
          return (
            <View key={request.id} style={styles.card}>
              <View style={styles.cardHeader}>
                {thumbnail ? (
                  <Image source={{ uri: thumbnail }} style={styles.thumb} />
                ) : (
                  <View style={styles.thumbFallback}>
                    <Feather name={request.type === 'video' ? 'film' : 'radio'} size={20} color={colors.ink} />
                  </View>
                )}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardWho}>{profileName(request.profileId)} requested:</Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>{request.title ?? 'Untitled'}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {request.channelName ? `${request.channelName} · ` : ''}
                    {request.type === 'channel' ? 'Channel' : 'Video'} · {describeRequestTarget(request)}
                  </Text>
                </View>
                <Text style={styles.cardAge}>{timeAgo(request.requestedAt)}</Text>
              </View>

              <View style={styles.actions}>
                <FocusablePressable
                  accessibilityLabel={`Approve ${request.title ?? 'request'}`}
                  style={[styles.approve, isOpen && styles.approveOpen]}
                  disabled={busyId === request.id}
                  onPress={() => setOpenId(isOpen ? null : request.id)}
                >
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.approveText}>{isOpen ? 'Choose how long' : 'Approve'}</Text>
                </FocusablePressable>
                <FocusablePressable
                  accessibilityLabel={`Reject ${request.title ?? 'request'}`}
                  style={styles.reject}
                  disabled={busyId === request.id}
                  onPress={() => void decide({ request, decision: 'rejected', profileId: null, duration: 'once' })}
                >
                  <Feather name="x" size={16} color={colors.danger} />
                  <Text style={styles.rejectText}>Reject</Text>
                </FocusablePressable>
                <FocusablePressable
                  accessibilityLabel="Delete request"
                  style={styles.delete}
                  disabled={busyId === request.id}
                  onPress={() => void onDelete(request.id)}
                >
                  <Feather name="trash-2" size={16} color={colors.muted} />
                </FocusablePressable>
              </View>

              {isOpen && !hasTarget ? (
                <View style={styles.sheet}>
                  <Text style={styles.helper}>
                    This ask has no YouTube link, so there is nothing playable to approve yet. Mark it reviewed, then find it in Content → Parent content search and approve the real video.
                  </Text>
                  <FocusablePressable
                    accessibilityLabel="Mark as reviewed"
                    style={styles.confirm}
                    disabled={busyId === request.id}
                    onPress={() =>
                      void decide({ request, decision: 'approved', profileId: null, duration: 'permanent' })
                    }
                  >
                    <Feather name="check-circle" size={17} color="#fff" />
                    <Text style={styles.confirmText}>Mark as reviewed</Text>
                  </FocusablePressable>
                </View>
              ) : null}

              {isOpen && hasTarget ? (
                <View style={styles.sheet}>
                  <Text style={styles.sheetLabel}>APPROVE FOR</Text>
                  <View style={styles.chipRow}>
                    {approvalDurationOrder.map((option) => (
                      <FocusablePressable
                        key={option}
                        accessibilityLabel={approvalDurationLabels[option]}
                        style={[styles.chip, duration === option && styles.chipActive]}
                        onPress={() => setDurations((current) => ({ ...current, [request.id]: option }))}
                      >
                        <Text style={[styles.chipText, duration === option && styles.chipTextActive]}>
                          {option === 'once' ? 'One playback' : approvalDurationLabels[option]}
                        </Text>
                      </FocusablePressable>
                    ))}
                  </View>
                  <Text style={styles.helper}>
                    {duration === 'once' && 'Playable one time. The approval expires as soon as playback finishes.'}
                    {duration === 'today' && 'Available until the end of today, then it expires automatically.'}
                    {duration === 'seven_days' && 'Available for 7 days, then it expires automatically.'}
                    {duration === 'permanent' && (request.type === 'channel'
                      ? 'Approve channel: every video from this channel becomes eligible under your existing whitelist rules.'
                      : 'Added to the approved library until you remove it.')}
                  </Text>

                  <Text style={styles.sheetLabel}>WHO CAN WATCH IT</Text>
                  <View style={styles.chipRow}>
                    <FocusablePressable
                      accessibilityLabel={`Only ${profileName(request.profileId)}`}
                      style={[styles.chip, scope === 'child' && styles.chipActive]}
                      onPress={() => setScopes((current) => ({ ...current, [request.id]: 'child' }))}
                    >
                      <Text style={[styles.chipText, scope === 'child' && styles.chipTextActive]}>Only {profileName(request.profileId)}</Text>
                    </FocusablePressable>
                    <FocusablePressable
                      accessibilityLabel="All children"
                      style={[styles.chip, scope === 'family' && styles.chipActive]}
                      onPress={() => setScopes((current) => ({ ...current, [request.id]: 'family' }))}
                    >
                      <Text style={[styles.chipText, scope === 'family' && styles.chipTextActive]}>All children</Text>
                    </FocusablePressable>
                  </View>

                  <FocusablePressable
                    accessibilityLabel="Confirm approval"
                    style={styles.confirm}
                    disabled={busyId === request.id}
                    onPress={() =>
                      void decide({
                        request,
                        decision: 'approved',
                        profileId: scope === 'family' ? null : request.profileId,
                        duration,
                      })
                    }
                  >
                    <Feather name="check-circle" size={17} color="#fff" />
                    <Text style={styles.confirmText}>
                      Approve {approvalDurationLabels[duration].toLowerCase()} for {scope === 'family' ? 'all children' : profileName(request.profileId)}
                    </Text>
                  </FocusablePressable>
                </View>
              ) : null}
            </View>
          );
        })
      )}

      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Request history</Text>
        {resolved.length > 0 ? (
          <FocusablePressable accessibilityLabel="Clear resolved requests" style={styles.clearButton} onPress={() => void onClearResolved()}>
            <Text style={styles.clearText}>Clear resolved</Text>
          </FocusablePressable>
        ) : null}
      </View>
      {resolved.length === 0 ? (
        <Text style={styles.helper}>Nothing resolved yet.</Text>
      ) : (
        resolved.map((request) => (
          <View key={request.id} style={styles.historyRow}>
            <Feather
              name={request.status === 'approved' ? 'check-circle' : 'x-circle'}
              size={17}
              color={request.status === 'approved' ? colors.mintDark : colors.danger}
            />
            <View style={styles.cardInfo}>
              <Text style={styles.historyTitleText} numberOfLines={1}>{request.title ?? 'Untitled'}</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {profileName(request.profileId)} · {request.resolvedAt ? timeAgo(request.resolvedAt) : ''}
                {request.resolution ? ` · ${approvalDurationLabels[request.resolution]}` : ''}
              </Text>
            </View>
            <FocusablePressable accessibilityLabel="Delete request" style={styles.delete} onPress={() => void onDelete(request.id)}>
              <Feather name="trash-2" size={15} color={colors.muted} />
            </FocusablePressable>
          </View>
        ))
      )}

      <Text style={styles.footerHint}>
        {channels.length} channels · {videos.length} videos approved locally. Nothing leaves this device.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  pendingBadge: { alignItems: 'center', backgroundColor: colors.sky, borderRadius: 14, flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingVertical: 9 },
  pendingBadgeEmpty: { backgroundColor: colors.mint },
  pendingDot: { backgroundColor: '#3B82F6', borderRadius: 5, height: 10, width: 10 },
  pendingDotEmpty: { backgroundColor: colors.mintDark },
  pendingText: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  pendingTextEmpty: { color: colors.mintDark },
  error: { color: colors.danger, fontSize: 13, marginTop: 12 },
  empty: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, marginTop: 14, padding: 24 },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 20, marginTop: 14, padding: 14 },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row' },
  thumb: { borderRadius: 12, height: 58, width: 58 },
  thumbFallback: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 12, height: 58, justifyContent: 'center', width: 58 },
  cardInfo: { flex: 1, paddingHorizontal: 12 },
  cardWho: { color: colors.ink, fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 4 },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  cardAge: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  approve: { alignItems: 'center', backgroundColor: colors.purple, borderRadius: 13, flex: 1, flexDirection: 'row', gap: 7, height: 48, justifyContent: 'center' },
  approveOpen: { backgroundColor: colors.purpleDark },
  approveText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  reject: { alignItems: 'center', borderRadius: 13, flex: 1, flexDirection: 'row', gap: 7, height: 48, justifyContent: 'center' },
  rejectText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  delete: { alignItems: 'center', height: 48, justifyContent: 'center', width: 46 },
  sheet: { borderTopColor: colors.line, borderTopWidth: 1, marginTop: 14, paddingTop: 14 },
  sheetLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { backgroundColor: colors.canvas, borderRadius: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 11 },
  chipActive: { backgroundColor: colors.lavender },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  chipTextActive: { color: colors.ink },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
  confirm: { alignItems: 'center', backgroundColor: colors.mintDark, borderRadius: 13, flexDirection: 'row', gap: 8, height: 50, justifyContent: 'center', marginTop: 14, paddingHorizontal: 12 },
  confirmText: { color: '#fff', fontSize: 13, fontWeight: '800', flexShrink: 1 },
  historyHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  historyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  clearButton: { borderRadius: 10, minHeight: 40, justifyContent: 'center', paddingHorizontal: 10 },
  clearText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  historyRow: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, flexDirection: 'row', gap: 12, marginTop: 8, minHeight: 62, padding: 10 },
  historyTitleText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  footerHint: { color: colors.muted, fontSize: 12, marginTop: 22, textAlign: 'center' },
});
