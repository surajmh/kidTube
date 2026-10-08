import { ChildProfile } from '../../types';
import type { PlaybackSettings } from '../../types';
import type { PlaybackOverride } from '../../types';

export type ParentOverrideProps = {
  visible: boolean;
  profile?: ChildProfile;
  settings: PlaybackSettings;
  overrideSecondsToday: number;
  onClose: () => void;
  onGranted: (overrides: PlaybackOverride[]) => void;
};

export type { PinFailure } from '../shared/pinFailure.type';

export type UseParentOverrideInput = Pick<ParentOverrideProps, 'profile' | 'settings' | 'onClose' | 'onGranted'>;
