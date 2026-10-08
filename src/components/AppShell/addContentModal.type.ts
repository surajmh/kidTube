import type { KeyboardTypeOptions } from 'react-native';
import type React from 'react';
import type { ChannelMatch, VideoMatch } from '../../services/contentLookupService.type';
import { ApprovedChannel, ApprovedVideo } from '../../types';

export type AddContentKind = 'channel' | 'video';

export type AddContentModalProps = {
  kind: AddContentKind;
  channels: ApprovedChannel[];
  onAddChannel: (channel: ApprovedChannel) => Promise<void>;
  onAddVideo: (video: ApprovedVideo) => Promise<void>;
  onFindChannels: (query: string) => Promise<ChannelMatch[]>;
  onFindVideos: (query: string) => Promise<VideoMatch[]>;
  onClose: () => void;
};

export type ChannelAddFlowProps = {
  existingChannels: ApprovedChannel[];
  onFind: AddContentModalProps['onFindChannels'];
  onSave: (channel: ApprovedChannel) => Promise<void>;
  onCancel: () => void;
};
export type VideoAddFlowProps = {
  channels: ApprovedChannel[];
  onFind: AddContentModalProps['onFindVideos'];
  onSave: (video: ApprovedVideo) => Promise<void>;
  onCancel: () => void;
};

export type ChannelLookupProps = {
  existingChannels: ApprovedChannel[];
  onFind: AddContentModalProps['onFindChannels'];
  onSave: (channel: ApprovedChannel) => Promise<void>;
  onCancel: () => void;
  onSwitchToManual: () => void;
};
export type VideoLookupProps = {
  onFind: AddContentModalProps['onFindVideos'];
  onSave: (video: ApprovedVideo) => Promise<void>;
  onCancel: () => void;
  onSwitchToManual: () => void;
};

export type ChannelFormProps = { onSave: (channel: ApprovedChannel) => Promise<void> };
export type VideoFormProps = { channels: ApprovedChannel[]; onSave: (video: ApprovedVideo) => Promise<void> };

/** Wording for one kind of lookup. */
export type LookupCopy = {
  label: string;
  placeholder: string;
  action: string;
  allowTitle: string;
  allowBody: string;
  approve: string;
  saveOnly: string;
  footer: string;
};

/** The part of a lookup's state the shared frame draws. */
export type LookupView = {
  query: string;
  changeQuery: (value: string) => void;
  busy: boolean;
  saving: boolean;
  error: string;
  selected: unknown;
  allow: boolean;
  setAllow: (allow: boolean) => void;
  run: () => Promise<void>;
  tryExample: (text: string) => void;
};

export type LookupFrameProps = {
  copy: LookupCopy;
  lookup: LookupView;
  examples?: readonly string[];
  keyboardType?: KeyboardTypeOptions;
  onCancel: () => void;
  onApprove: () => Promise<void>;
  onSwitchToManual: () => void;
  children: React.ReactNode;
};
