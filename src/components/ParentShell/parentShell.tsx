import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ParentRequestsPanel } from '../ParentRequests';
import { ParentContentPanel } from '../ParentContent';
import { ParentActivityPanel } from '../ParentActivity';
import { ParentChildrenPanel } from '../ParentChildren';
import { ParentCategoriesPanel } from '../ParentCategories';
import { colors } from '../theme';
import { yt } from '../youtube/theme';
import { FocusablePressable } from '../tv';
import styles from './parentShell.style';
import { useParentShell } from './parentShell.hook';
import { SECTIONS, SHORTCUTS } from './parentShell.constant';
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
  manualAddSlot,
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
        <View>
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
              {SHORTCUTS.map((item) => (
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
        <Feather name={icon} size={16} color={colors.ink} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
