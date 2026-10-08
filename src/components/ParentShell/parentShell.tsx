import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ParentRequestsPanel } from '../ParentRequests';
import { ParentContentPanel } from '../ParentContent';
import { ParentActivityPanel } from '../ParentActivity';
import { ParentChildrenPanel } from '../ParentChildren';
import { ParentCategoriesPanel } from '../ParentCategories';
import { ParentSecurityPanel } from '../ParentSecurity';
import { ParentDashboard } from '../ParentDashboard';
import { colors } from '../theme';
import { yt } from '../youtube/theme';
import { FocusablePressable } from '../tv';
import styles from './parentShell.style';
import { useParentShell } from './parentShell.hook';
import { SECTIONS } from './parentShell.constant';
import { ParentSection, ParentShellProps } from './parentShell.type';

export type { ParentSection };

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
  playlistsSlot,
  downloadsSlot,
  addContentSlot,
  notice,
}: ParentShellProps) {
  const { pendingCount, contentPage, contentMode, handleScroll } = useParentShell({
    data,
    actions,
    section,
    selectedChannelId,
  });

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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={64}
    >
      <View style={styles.topBar}>
        <View style={styles.heading}>
          <Text style={styles.kicker}>PARENT MODE</Text>
          <Text style={styles.title}>Your family nest</Text>
        </View>
        <FocusablePressable accessibilityLabel="Back to kid mode" style={styles.exitButton} onPress={actions.onExit}>
          <Feather name="log-out" size={16} color={colors.ink} />
          <Text style={styles.exitText}>Back to kid mode</Text>
        </FocusablePressable>
      </View>

      {notice ? (
        <View style={styles.notice} accessibilityLabel={notice}>
          <Feather name="tool" size={14} color={colors.yellow} />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabStrip}>
        {SECTIONS.map((item) => (
          <FocusablePressable
            key={item.id}
            accessibilityLabel={item.label}
            style={[styles.tab, section === item.id && styles.tabActive]}
            onPress={() => setSection(item.id)}
          >
            <Feather name={item.icon} size={16} color={section === item.id ? yt.chipActiveText : colors.muted} />
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
            <ParentDashboard
              profile={data.profiles.find((item) => item.id === data.activeProfileId) ?? data.profiles[0]}
              counts={{ channels: data.channels.length, videos: data.videos.length, categories: data.categories.length, pending: pendingCount }}
              onOpen={setSection}
            />
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
            syncStateFor={actions.syncStateFor}
            channelBusy={actions.channelBusy}
            onOpenChannelVideos={actions.onOpenChannelVideos}
            onRefreshChannel={actions.onRefreshChannel}
            onLoadMoreChannel={actions.onLoadMoreChannel}
            selectedChannelId={selectedChannelId}
            onSelectChannel={actions.onSelectChannel}
            requestsSlot={requestsPanel}
            addContentSlot={addContentSlot}
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

      {section === 'security' ? <ParentSecurityPanel /> : null}

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
      {section === 'playlists' ? playlistsSlot : null}
      {section === 'downloads' ? downloadsSlot : null}

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}
