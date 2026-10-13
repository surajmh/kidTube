import { SettingsChoice, SettingsGroup, SettingsRow } from '../SettingsMenu';
import React from 'react';
import { ApprovedChannel, ApprovedVideo } from '../../types';
import type { ContentApproval, ContentCategory } from '../../types';
import { describeSyncAge } from '../../services/content/channelSyncRules';
import type { ChannelSyncState } from '../../services/content/channelSyncRules.type';

import { CategoryEditor } from './parentContent.categoryEditor';
import { useChannelRow } from './parentContent.row.hook';
import { categoryNames } from './parentContent.helper';

/**
 * One row of the Channels tab. Memoized so toggling `expanded` on one channel, or any other local
 * panel state (search text, filters), does not force every other row to re-render and re-run its
 * category/expiry derivations too.
 */
export const ParentChannelRow = React.memo(function ParentChannelRow({
  channel,
  videos,
  approvals,
  categories,
  syncState,
  onOpenChannel,
  onToggleCategory,
  onRemove,
}: {
  channel: ApprovedChannel;
  videos: ApprovedVideo[];
  approvals: ContentApproval[];
  categories: ContentCategory[];
  expanded: boolean;
  syncState: ChannelSyncState | undefined;
  onOpenChannel: (channel: ApprovedChannel) => void;
  onToggleExpanded: (id: string) => void;
  onToggleCategory: (channel: ApprovedChannel, categoryId: string, assigned: boolean) => void;
  onRemove: (channel: ApprovedChannel) => void;
}) {
  const { expiry, channelVideos } = useChannelRow(approvals, videos, channel.channelId);

  const details = channel.approved
    ? [describeSyncAge(syncState), ...categoryNames(channel.categoryIds, categories)].join(' · ')
    : `${channel.channelId} · awaiting approval`;

  return <SettingsGroup label={channel.name} value={channel.approved ? 'Approved' : 'Not approved'} description={[details, ...expiry].join(' · ')}>
    {channel.approved && <SettingsRow label={`Open ${channel.name}`} onPress={() => onOpenChannel(channel)} />}
    <CategoryEditor item={channel} categories={categories} onToggle={onToggleCategory} />
    <SettingsChoice label={`Remove ${channel.name}`} value={false} options={[{ value: false, label: 'Keep channel' }, { value: true, label: 'Remove channel' }]} onChange={(remove) => remove ? onRemove(channel) : undefined} />
  </SettingsGroup>;
});
