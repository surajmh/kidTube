import { ChildProfile } from '../../types';
import { Phase3Settings } from '../../phase3Types';
import { PlaybackOverride } from '../../phase4Types';

export type ParentOverrideProps = {
  visible: boolean;
  profile?: ChildProfile;
  settings: Phase3Settings;
  overrideSecondsToday: number;
  onClose: () => void;
  onGranted: (overrides: PlaybackOverride[]) => void;
};

export type { PinFailure } from '../shared/pinFailure.helper';
