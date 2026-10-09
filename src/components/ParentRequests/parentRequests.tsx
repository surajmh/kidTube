import { useTheme } from '../theme';
import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import type { ContentRequest } from '../../types';
import { approvalDurationLabels, approvalDurationOrder } from '../../constants/parentalControls.constant';
import { describeRequestTarget, requestTarget } from '../../services/requestService';

import { FocusablePressable } from '../tv';
import useStyles from './parentRequests.style';
import { useParentRequests } from './parentRequests.hook';
import { profileNameFor, thumbnailFor as thumbnailForRequest, timeAgo } from './parentRequests.helper';
import { ParentRequestsProps, RequestDecisionInput } from './parentRequests.type';

export type { RequestDecisionInput };

export function ParentRequestsPanel({
  profiles,
  requests,
  videos,
  channels,
  onDecide,
  onDelete,
  onClearResolved,
}: ParentRequestsProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const {
    openId,
    toggleOpen,
    busyId,
    error,
    pending,
    resolved,
    durationFor,
    scopeFor,
    setDuration,
    setScope,
    decide,
  } = useParentRequests({ requests, onDecide });

  function profileName(profileId: string) {
    return profileNameFor(profiles, profileId);
  }

  function thumbnailFor(request: ContentRequest) {
    return thumbnailForRequest(request, videos);
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
                  onPress={() => toggleOpen(request.id)}
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
                        onPress={() => setDuration(request.id, option)}
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
                      onPress={() => setScope(request.id, 'child')}
                    >
                      <Text style={[styles.chipText, scope === 'child' && styles.chipTextActive]}>Only {profileName(request.profileId)}</Text>
                    </FocusablePressable>
                    <FocusablePressable
                      accessibilityLabel="All children"
                      style={[styles.chip, scope === 'family' && styles.chipActive]}
                      onPress={() => setScope(request.id, 'family')}
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
