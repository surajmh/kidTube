import type { ResolvedChannel } from '../../services/channelSyncService.type';
import { ApprovedChannel, ApprovedVideo } from '../../types';

export type ManualAddSectionProps = { channels: ApprovedChannel[]; onAddChannel: (channel: ApprovedChannel) => Promise<void>; onAddVideo: (video: ApprovedVideo) => Promise<void>; onLookupChannel: (input: string) => Promise<ResolvedChannel> };
export type ChannelAddFlowProps = { existingChannels: ApprovedChannel[]; onCancel: () => void; onSave: (channel: ApprovedChannel) => Promise<void>; onLookupChannel: (input: string) => Promise<ResolvedChannel> };
export type ChannelLookupFormProps = { existingChannels: ApprovedChannel[]; onCancel: () => void; onSave: (channel: ApprovedChannel) => Promise<void>; onLookup: (input: string) => Promise<ResolvedChannel>; onSwitchToManual: () => void };
export type ChannelFormProps = { onCancel: () => void; onSave: (channel: ApprovedChannel) => Promise<void> };
export type VideoFormProps = { channels: ApprovedChannel[]; onCancel: () => void; onSave: (video: ApprovedVideo) => Promise<void> };
