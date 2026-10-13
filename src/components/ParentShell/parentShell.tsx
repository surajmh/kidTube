import { useTheme } from '../theme';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ParentRequestsPanel } from '../ParentRequests';
import { ParentContentPanel } from '../ParentContent';
import { ParentActivityPanel } from '../ParentActivity';
import { ParentChildrenPanel } from '../ParentChildren';
import { ParentCategoriesPanel } from '../ParentCategories';
import { ParentSecurityPanel } from '../ParentSecurity';
import { SettingsRow } from '../SettingsMenu';

import useStyles from './parentShell.style';
import { useParentShell } from './parentShell.hook';
import { SETTINGS_SECTIONS } from './parentShell.constant';
import { FocusablePressable } from '../tv';
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
  const styles = useStyles();
  const { dark } = useTheme();
  const [dismissedNotice, setDismissedNotice] = useState<string | null>(null);
  const { pendingCount, contentPage, contentMode, handleScroll } = useParentShell({
    data,
    actions,
    section,
    selectedChannelId,
  });

  const lastSection = useRef<ParentSection>('children');
  useEffect(() => {
    if (section === 'home') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedChannelId) actions.onSelectChannel(null);
      else setSection('home');
      return true;
    });
    return () => subscription.remove();
  }, [section, selectedChannelId, actions, setSection]);

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
      <Text accessibilityRole="header" style={styles.title}>{section === 'home' ? 'Parent settings' : SETTINGS_SECTIONS.find((item) => item.id === section)?.label}</Text>
      <SettingsRow label={section === 'home' ? 'Back to kid mode' : 'Back to parent settings'} onPress={section === 'home' ? actions.onExit : () => setSection('home')} preferred={section !== 'home'} icon={section === 'home' ? 'home' : 'arrow-left'} tone="cyan" highlighted description={dark && section === 'home' ? 'Exit settings and return to the kid experience' : undefined} />

      {section === 'home' ? SETTINGS_SECTIONS.map((item) => (
        <SettingsRow key={item.id} label={item.label} icon={item.icon} tone={item.tone} description={dark ? item.description : undefined} badge={item.id === 'requests'} preferred={lastSection.current === item.id}
          value={item.id === 'requests' ? `${pendingCount} pending` : undefined}
          onPress={() => { lastSection.current = item.id; setSection(item.id); }} />
      )) : null}

      {contentPage && section !== 'home' ? (
        <>
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

      {section === 'home' && notice && notice !== dismissedNotice ? (
        <View style={styles.notice} accessibilityLabel={notice}>
          <View style={styles.noticeIcon}><Feather name="tool" size={21} color={dark ? '#F4BD43' : '#B56800'} /></View>
          <Text style={styles.noticeText}>{notice}</Text>
          <FocusablePressable accessibilityLabel="Dismiss repair message" style={styles.dismissNotice} onPress={() => setDismissedNotice(notice)}><Feather name="x" size={18} color={dark ? '#E0C68C' : '#956000'} /></FocusablePressable>
        </View>
      ) : null}

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}
