import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { FocusablePressable } from './tv';

export type ParentSection = 'content' | 'requests' | 'children' | 'activity' | 'settings';

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

const sections: Array<{ id: ParentSection; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { id: 'content', label: 'Content', icon: 'layers' },
  { id: 'requests', label: 'Requests', icon: 'inbox' },
  { id: 'children', label: 'Children', icon: 'users' },
  { id: 'activity', label: 'Activity', icon: 'bar-chart-2' },
  { id: 'settings', label: 'Playback', icon: 'sliders' },
];

export function ParentShell({
  data,
  actions,
  section,
  setSection,
  contentTab,
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

      {section === 'content' ? (
        <>
          <View style={styles.statsRow}>
            <Stat value={String(data.channels.length)} label="channels" icon="radio" tint={colors.lavender} />
            <Stat value={String(data.videos.length)} label="videos" icon="play" tint={colors.peach} />
            <Stat value={String(data.categories.length)} label="categories" icon="grid" tint={colors.mint} />
            <Stat value={String(pendingCount)} label="pending" icon="inbox" tint={colors.sky} />
          </View>
          <ParentContentPanel
            profiles={data.profiles}
            categories={data.categories}
            channels={data.channels}
            videos={data.videos}
            approvals={data.approvals}
            tab={contentTab}
            onTabChange={setContentTab}
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
  screen: { flex: 1 },
  content: { paddingBottom: 24, paddingHorizontal: 20 },
  topBar: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  kicker: { color: colors.purple, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: 5 },
  exitButton: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 14, flexDirection: 'row', gap: 7, marginTop: 3, minHeight: 46, paddingHorizontal: 12 },
  exitText: { color: colors.purple, fontSize: 12, fontWeight: '800' },
  tabStrip: { gap: 8, marginTop: 22 },
  notice: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 14, flexDirection: 'row', gap: 8, marginTop: 14, padding: 12 },
  noticeText: { color: colors.purpleDark, flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  tab: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, flexDirection: 'row', gap: 7, minHeight: 46, paddingHorizontal: 13 },
  tabActive: { backgroundColor: colors.lavender },
  tabText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  tabTextActive: { color: colors.purple },
  badge: { alignItems: 'center', backgroundColor: colors.purple, borderRadius: 9, minWidth: 19, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  statCard: { backgroundColor: colors.card, borderRadius: 16, flex: 1, padding: 11 },
  statIcon: { alignItems: 'center', borderRadius: 10, height: 30, justifyContent: 'center', width: 30 },
  statValue: { color: colors.ink, fontSize: 21, fontWeight: '800', marginTop: 9 },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 1 },
  bottomSpace: { height: 28 },
});
