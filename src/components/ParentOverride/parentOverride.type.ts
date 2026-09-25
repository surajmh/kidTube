import { ChildProfile } from '../../types';
import { PlaybackSettings } from '../../playbackTypes';
import { PlaybackOverride } from '../../parentalControlsTypes';

export type ParentOverrideProps = {
  visible: boolean;
  profile?: ChildProfile;
  settings: PlaybackSettings;
  overrideSecondsToday: number;
  onClose: () => void;
  onGranted: (overrides: PlaybackOverride[]) => void;
};

export type { PinFailure } from '../shared/pinFailure.helper';
