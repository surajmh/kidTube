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

/** The failure half of a PIN check, as the session service reports it. */
export type PinFailure = {
  reason: 'mismatch' | 'locked' | 'not-set';
  attemptsRemaining: number;
  retryAfterMs: number;
};
