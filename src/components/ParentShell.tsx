import React from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApprovedChannel, ApprovedVideo, ChildProfile, WatchHistory } from '../types';
import { Phase3Settings, ScreenTimeUsage } from '../phase3Types';
import {
  ContentApproval,
  ContentCandidate,
  ContentCategory,
  ContentRequest,
  PlaybackOverride,
  ProfilePolicyOverrides,
} from '../phase4Types';
import { ChildRulesMap } from '../services/childRulesService';
import { ChannelSyncState } from '../services/content/channelSyncRules';
import { OverridePreset } from '../services/playbackOverrideService';
import { ParentSession } from '../services/auth/parentSession';
import { RequestDecisionInput } from './ParentRequestsPanel';
import { ParentRequestsPanel } from './ParentRequestsPanel';
import { ContentTab, ParentContentPanel } from './ParentContentPanel';
import { ParentActivityPanel } from './ParentActivityPanel';
import { ParentChildrenPanel } from './ParentChildrenPanel';
import { ParentCategoriesPanel } from './ParentCategoriesPanel';
import { colors } from './theme';
import { yt } from './youtube/theme';
import { FocusablePressable } from './tv';

export type ParentSection =
  | 'home'
  | 'channels'
  | 'videos'
  | 'categories'
  | 'requests'
  | 'children'
  | 'activity'
  | 'settings';

export type ParentShellData = {
  session: ParentSession | null;
  profiles: ChildProfile[];
  activeProfileId: string;
  channels: ApprovedChannel[];
  videos: ApprovedVideo[];
  categories: ContentCategory[];
  approvals: ContentApproval[];
  requests: ContentRequest[];
  childRules: ChildRulesMap;
  profilePolicies: Record<string, ProfilePolicyOverrides>;
  overrides: PlaybackOverride[];
  settings: Phase3Settings;
  screenTimeUsage: ScreenTimeUsage[];
  history: WatchHistory[];
};

export type ParentShellActions = {
  onExit: () => void;
  onDecideRequest: (input: RequestDecisionInput) => Promise<void>;
  onDeleteRequest: (requestId: string) => Promise<void>;
  onClearResolved: () => Promise<void>;
  onRemoveVideo: (video: ApprovedVideo) => Promise<void>;
  onRemoveChannel: (channel: ApprovedChannel) => Promise<void>;
  onToggleVideoCategory: (video: ApprovedVideo, categoryId: string, assigned: boolean) => Promise<void>;
  onToggleChannelCategory: (channel: ApprovedChannel, categoryId: string, assigned: boolean) => Promise<void>;
  onSearchContent: (query: string) => Promise<ContentCandidate[]>;
  onSaveCandidate: (candidate: ContentCandidate) => Promise<void>;
  onApproveCandidate: (candidate: ContentCandidate) => Promise<void>;
  syncStateFor: (channelId: string) => ChannelSyncState | undefined;
  channelBusy: (channelId: string) => boolean;
  onOpenChannelVideos: (channel: ApprovedChannel) => void;
  onRefreshChannel: (channel: ApprovedChannel) => void;
  onLoadMoreChannel: (channel: ApprovedChannel) => void;
  onSelectChannel: (channelId: string | null) => void;
  onCreateCategory: (name: string) => Promise<void>;
  onRenameCategory: (categoryId: string, name: string) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onSetPolicy: (profileId: string, patch: ProfilePolicyOverrides | null) => Promise<void>;
  onToggleInherit: (profileId: string, inherit: boolean) => Promise<void>;
  onToggleCategoryForChild: (profileId: string, categoryId: string) => Promise<void>;
  onToggleGrantChannel: (profileId: string, channelId: string) => Promise<void>;
  onToggleBlockChannel: (profileId: string, channelId: string) => Promise<void>;
  onToggleGrantVideo: (profileId: string, videoId: string) => Promise<void>;
  onToggleBlockVideo: (profileId: string, videoId: string) => Promise<void>;
  onGrantOverride: (profileId: string, preset: OverridePreset, grantsScheduleAccess: boolean) => Promise<void>;
  onRevokeOverride: (profileId: string) => Promise<void>;
  onRevokeApproval: (approval: ContentApproval) => Promise<void>;
  onProfilesChange: (profiles: ChildProfile[]) => Promise<void>;
  onSettingsChange: (settings: Phase3Settings) => Promise<void>;
  accessFor: (profileId: string, target: { videoId?: string; channelId?: string }) => boolean;
};

/** The nav bar. Children, Activity and Playback are reached from the dashboard instead: they are
 *  occasional tasks, and five destinations is the most a nav bar can carry without crowding. */
const sections: Array<{ id: ParentSection; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'channels', label: 'Channels', icon: 'users' },
  { id: 'videos', label: 'Videos', icon: 'play' },
  { id: 'categories', label: 'Categories', icon: 'grid' },
  { id: 'requests', label: 'Requests', icon: 'inbox' },
];

/** Reached from the dashboard rather than the nav bar. */
const shortcuts: Array<{ id: ParentSection; label: string; hint: string; icon: keyof typeof Feather.glyphMap }> = [
  { id: 'children', label: 'Children', hint: 'Profiles, limits and rules', icon: 'users' },
  { id: 'activity', label: 'Activity', hint: 'What has been watched', icon: 'bar-chart-2' },
  { id: 'settings', label: 'Playback', hint: 'Screen time and bedtime', icon: 'sliders' },
];

export function ParentShell({
  data,
  actions,
  section,
  setSection,
  contentTab,
  selectedChannelId,
  setContentTab,
  profilesSlot,
  settingsSlot,
  manualAddSlot,
  notice,
}: {
  data: ParentShellData;
  actions: ParentShellActions;
  section: ParentSection;
  setSection: (section: ParentSection) => void;
  contentTab: ContentTab;
  selectedChannelId: string | null;
  setContentTab: (tab: ContentTab) => void;
  profilesSlot?: React.ReactNode;
  settingsSlot?: React.ReactNode;
  manualAddSlot?: React.ReactNode;
  /** Metadata provider configuration, shown above the playback settings. */
  /** Startup repair summary, shown only to the parent. */
  notice?: string;
}) {
  const pendingCount = data.requests.filter((request) => request.status === 'pending').length;
  const requestsPanel = (
    <ParentRequestsPanel
      profiles={data.profiles}
      requests={data.requests}
      videos={data.videos}
      channels={data.channels}
      onDecide={actions.onDecideRequest}
      onDelete={actions.onDeleteRequest}
      onClearResolved={actions.onClearResolved}
    />
  );

  /**
   * Infinite scroll for a channel's page.
   *
   * The next page is fetched as the parent nears the end, so approving a channel never triggers a
   * bulk fetch of its whole history. Guarded by the page token so a burst of scroll events cannot
   * queue the same page twice.
   */
  const requestedTokenRef = React.useRef<string | null>(null);
  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!selectedChannelId) return;
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (contentSize.height - (contentOffset.y + layoutMeasurement.height) > 700) return;
    const token = actions.syncStateFor(selectedChannelId)?.nextPageToken;
    if (!token || actions.channelBusy(selectedChannelId)) return;
    if (requestedTokenRef.current === token) return;
    const channel = data.channels.find((item) => item.channelId === selectedChannelId);
    if (!channel) return;
    requestedTokenRef.current = token;
    actions.onLoadMoreChannel(channel);
  }

  const contentPage = section === 'home' || section === 'channels' || section === 'videos' || section === 'categories';
  const contentMode =
    section === 'channels' ? 'channels' : section === 'videos' ? 'videos' : section === 'categories' ? 'categories' : 'dashboard';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={64}
    >
      <View style={styles.topBar}>
        <View>
          <Text style={styles.kicker}>PARENT MODE</Text>
          <Text style={styles.title}>Your family nest</Text>
        </View>
        <FocusablePressable accessibilityLabel="Back to kid mode" style={styles.exitButton} onPress={actions.onExit}>
          <Feather name="log-out" size={16} color={colors.purple} />
          <Text style={styles.exitText}>Back to kid mode</Text>
        </FocusablePressable>
      </View>

      {notice ? (
        <View style={styles.notice} accessibilityLabel={notice}>
          <Feather name="tool" size={14} color={colors.purpleDark} />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabStrip}>
        {sections.map((item) => (
          <FocusablePressable
            key={item.id}
            accessibilityLabel={item.label}
            style={[styles.tab, section === item.id && styles.tabActive]}
            onPress={() => setSection(item.id)}
          >
            <Feather name={item.icon} size={16} color={section === item.id ? colors.purple : colors.muted} />
            <Text style={[styles.tabText, section === item.id && styles.tabTextActive]}>{item.label}</Text>
            {item.id === 'requests' && pendingCount > 0 ? (
              <View style={styles.badge}><Text style={styles.badgeText}>{pendingCount}</Text></View>
            ) : null}
          </FocusablePressable>
        ))}
      </ScrollView>

      {contentPage ? (
        <>
          {section === 'home' ? (
            <View style={styles.statsRow}>
              <Stat value={String(data.channels.length)} label="channels" icon="radio" tint={colors.lavender} />
              <Stat value={String(data.videos.length)} label="videos" icon="play" tint={colors.peach} />
              <Stat value={String(data.categories.length)} label="categories" icon="grid" tint={colors.mint} />
              <Stat value={String(pendingCount)} label="pending" icon="inbox" tint={colors.sky} />
            </View>
          ) : null}

          <ParentContentPanel
            mode={contentMode}
            profiles={data.profiles}
            categories={data.categories}
            channels={data.channels}
            videos={data.videos}
            approvals={data.approvals}
            accessFor={actions.accessFor}
            onRemoveVideo={actions.onRemoveVideo}
            onRemoveChannel={actions.onRemoveChannel}
            onToggleVideoCategory={actions.onToggleVideoCategory}
            onToggleChannelCategory={actions.onToggleChannelCategory}
            onSearch={actions.onSearchContent}
            onSaveCandidate={actions.onSaveCandidate}
            onApproveCandidate={actions.onApproveCandidate}
            syncStateFor={actions.syncStateFor}
            channelBusy={actions.channelBusy}
            onOpenChannelVideos={actions.onOpenChannelVideos}
            onRefreshChannel={actions.onRefreshChannel}
            onLoadMoreChannel={actions.onLoadMoreChannel}
            selectedChannelId={selectedChannelId}
            onSelectChannel={actions.onSelectChannel}
            requestsSlot={requestsPanel}
            manualAddSlot={manualAddSlot}
            categoriesSlot={
              <ParentCategoriesPanel
                categories={data.categories}
                videos={data.videos}
                channels={data.channels}
                onCreate={actions.onCreateCategory}
                onRename={actions.onRenameCategory}
                onDelete={actions.onDeleteCategory}
              />
            }
          />

          {section === 'home' ? (
            <View style={styles.shortcuts}>
              {shortcuts.map((item) => (
                <FocusablePressable
                  key={item.id}
                  accessibilityLabel={item.label}
                  style={styles.shortcut}
                  onPress={() => setSection(item.id)}
                >
                  <Feather name={item.icon} size={18} color={yt.text} />
                  <View style={styles.shortcutText}>
                    <Text style={styles.shortcutLabel}>{item.label}</Text>
                    <Text style={styles.shortcutHint}>{item.hint}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={yt.textDim} />
                </FocusablePressable>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      {section === 'requests' ? requestsPanel : null}

      {section === 'children' ? (
        <ParentChildrenPanel
          profiles={data.profiles}
          initialProfileId={data.activeProfileId}
          channels={data.channels}
          videos={data.videos}
          categories={data.categories}
          approvals={data.approvals}
          rules={data.childRules}
          policyOverrides={data.profilePolicies}
          globalSettings={data.settings}
          overrides={data.overrides}
          onSetPolicy={actions.onSetPolicy}
          onToggleInherit={actions.onToggleInherit}
          onToggleCategory={actions.onToggleCategoryForChild}
          onToggleGrantChannel={actions.onToggleGrantChannel}
          onToggleBlockChannel={actions.onToggleBlockChannel}
          onToggleGrantVideo={actions.onToggleGrantVideo}
          onToggleBlockVideo={actions.onToggleBlockVideo}
          onGrantOverride={actions.onGrantOverride}
          onRevokeOverride={actions.onRevokeOverride}
          onRevokeApproval={actions.onRevokeApproval}
          profilesSlot={profilesSlot}
        />
      ) : null}

      {section === 'activity' ? (
        <ParentActivityPanel
          profiles={data.profiles}
          history={data.history}
          screenTime={data.screenTimeUsage}
          videos={data.videos}
          categories={data.categories}
          requests={data.requests}
          approvals={data.approvals}
        />
      ) : null}

      {section === 'settings' ? settingsSlot : null}

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

function Stat({ value, label, icon, tint }: { value: string; label: string; icon: keyof typeof Feather.glyphMap; tint: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint }]}>
        <Feather name={icon} size={16} color={colors.purple} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: yt.bg, flex: 1 },
  content: { paddingBottom: 32, paddingHorizontal: 16 },

  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14 },
  kicker: { color: yt.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 1.1 },
  title: { color: yt.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.4, marginTop: 2 },
  exitButton: {
    alignItems: 'center',
    backgroundColor: yt.surfaceAlt,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 7,
    minHeight: 36,
    paddingHorizontal: 14,
  },
  exitText: { color: yt.text, fontSize: 13, fontWeight: '600' },

  // Filter-chip navigation, matching Kid Mode: inverted pill for the active section.
  tabStrip: { gap: 8, marginTop: 18, paddingRight: 16 },
  tab: {
    alignItems: 'center',
    backgroundColor: yt.surfaceAlt,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 7,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  tabActive: { backgroundColor: yt.chipActive },
  tabText: { color: yt.text, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: yt.chipActiveText },
  badge: {
    alignItems: 'center',
    backgroundColor: yt.accent,
    borderRadius: 9,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: { color: yt.onAccent, fontSize: 11, fontWeight: '700' },

  notice: {
    alignItems: 'center',
    backgroundColor: yt.surface,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    padding: 12,
  },
  noticeText: { color: yt.text, flex: 1, fontSize: 13, lineHeight: 18 },

  // Counters read as a quiet summary strip, not four competing cards.
  statsRow: { borderTopColor: yt.line, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: 20, paddingTop: 16 },
  statCard: { flex: 1, gap: 2 },
  statIcon: { alignItems: 'center', borderRadius: 8, height: 26, justifyContent: 'center', width: 26 },
  statValue: { color: yt.text, fontSize: 20, fontWeight: '700', marginTop: 8 },
  statLabel: { color: yt.textDim, fontSize: 11 },

  shortcuts: { borderTopColor: yt.line, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 24, paddingTop: 8 },
  shortcut: { alignItems: 'center', borderWidth: 0, flexDirection: 'row', gap: 14, paddingVertical: 14 },
  shortcutText: { flex: 1, gap: 2 },
  shortcutLabel: { color: yt.text, fontSize: 15, fontWeight: '600' },
  shortcutHint: { color: yt.textDim, fontSize: 12.5 },
  bottomSpace: { height: 28 },
});
