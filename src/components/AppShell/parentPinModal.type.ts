import type { ParentSignInResult } from '../../services/auth/parentSession.type';

export type ParentPinModalProps = {
  visible: boolean;
  lockRemainingMs: number;
  resetting: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => Promise<ParentSignInResult>;
  onReset: () => void;
};
