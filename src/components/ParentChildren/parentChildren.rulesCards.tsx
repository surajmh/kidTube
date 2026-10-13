import React, { useState } from 'react';
import { Text } from 'react-native';
import type { ApprovedChannel, ApprovedVideo, ChildProfile, ContentApproval, ContentCategory } from '../../types';
import { describeApprovalExpiry, describeApprovalTarget } from '../../services/approvalRules';
import { SettingsChoice, SettingsGroup, SettingsRow, SettingsToggle } from '../SettingsMenu';
import type { CardProps } from './parentChildren.type';

export function CategoriesCard({ profile, profileId, childRules, categories, onToggleCategory }: CardProps & { categories: ContentCategory[]; onToggleCategory: (profileId: string, categoryId: string) => Promise<void> }) {
  return <SettingsGroup label={`Categories for ${profile.name}`} description="Turning off a category blocks its videos for this child only.">
    {categories.map((category) => {
      const enabled = !childRules.blockedCategoryIds.includes(category.id);
      return <SettingsToggle key={category.id} label={category.name} value={enabled} onChange={(next) => next === enabled ? undefined : onToggleCategory(profileId, category.id)} />;
    })}
  </SettingsGroup>;
}

export function ChannelRulesCard({ profile, profileId, childRules, channels, onToggleGrantChannel, onToggleBlockChannel, onToggleInherit }: CardProps & {
  channels: ApprovedChannel[]; onToggleGrantChannel: (profileId: string, channelId: string) => Promise<void>;
  onToggleBlockChannel: (profileId: string, channelId: string) => Promise<void>;
  onToggleInherit: (profileId: string, inherit: boolean) => Promise<void>;
}) {
  return <SettingsGroup label={`Channel rules for ${profile.name}`}>
    <SettingsToggle label="Inherit family approvals" value={childRules.inheritGlobalApprovals} onChange={(next) => onToggleInherit(profileId, next)} />
    {!channels.length && <Text>No channels in the family library yet.</Text>}
    {channels.map((channel) => {
      const granted = childRules.grantedChannelIds.includes(channel.channelId);
      const blocked = childRules.blockedChannelIds.includes(channel.channelId);
      return <SettingsGroup key={channel.id} label={channel.name} value={blocked ? 'Blocked' : granted ? 'Child grant' : 'Family defaults'}>
        <SettingsToggle label={`Allow ${channel.name}`} value={granted} onChange={(next) => next === granted ? undefined : onToggleGrantChannel(profileId, channel.channelId)} />
        <SettingsToggle label={`Block ${channel.name}`} value={blocked} onChange={(next) => next === blocked ? undefined : onToggleBlockChannel(profileId, channel.channelId)} description="A block always wins over approvals." />
      </SettingsGroup>;
    })}
  </SettingsGroup>;
}

export function VideoRulesCard({ profile, profileId, childRules, videos, onToggleGrantVideo, onToggleBlockVideo }: CardProps & {
  videos: ApprovedVideo[]; onToggleGrantVideo: (profileId: string, videoId: string) => Promise<void>;
  onToggleBlockVideo: (profileId: string, videoId: string) => Promise<void>;
}) {
  const [count, setCount] = useState(30);
  return <SettingsGroup label={`Video rules for ${profile.name}`}>
    {!videos.length && <Text>No videos in the family library yet.</Text>}
    {videos.slice(0, count).map((video) => {
      const granted = childRules.grantedVideoIds.includes(video.youtubeVideoId);
      const blocked = childRules.blockedVideoIds.includes(video.youtubeVideoId);
      return <SettingsGroup key={video.id} label={video.title} value={blocked ? 'Blocked' : granted ? 'Child grant' : 'Family defaults'}>
        <SettingsToggle label={`Allow ${video.title}`} value={granted} onChange={(next) => next === granted ? undefined : onToggleGrantVideo(profileId, video.youtubeVideoId)} />
        <SettingsToggle label={`Block ${video.title}`} value={blocked} onChange={(next) => next === blocked ? undefined : onToggleBlockVideo(profileId, video.youtubeVideoId)} description="A block always wins over approvals." />
      </SettingsGroup>;
    })}
    {count < videos.length && <SettingsRow label="More video rules" onPress={() => setCount((value) => value + 30)} />}
  </SettingsGroup>;
}

export function ApprovalsCard({ profile, childApprovals, onRevokeApproval }: { profile: ChildProfile; childApprovals: ContentApproval[]; onRevokeApproval: (approval: ContentApproval) => Promise<void> }) {
  return <SettingsGroup label={`Temporary approvals for ${profile.name}`} value={`${childApprovals.length} active`}>
    {!childApprovals.length && <Text>No temporary approvals. Grants from Requests appear here until they expire.</Text>}
    {childApprovals.map((approval) => <SettingsChoice key={approval.id} label={describeApprovalTarget(approval.target)} value={false}
      description={`${approval.duration.replace('_', ' ')} · ${describeApprovalExpiry(approval)}`}
      options={[{ value: false, label: 'Keep approval' }, { value: true, label: 'Revoke approval' }]}
      onChange={(remove) => remove ? onRevokeApproval(approval) : undefined} />)}
  </SettingsGroup>;
}
