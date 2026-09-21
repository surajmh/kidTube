export type ParentSecurityState = {
  currentPin: string;
  nextPin: string;
  confirmPin: string;
  error: string;
  notice: string;
  saving: boolean;
};

export type ParentSecurityHook = ParentSecurityState & {
  setCurrentPin: (value: string) => void;
  setNextPin: (value: string) => void;
  setConfirmPin: (value: string) => void;
  submit: () => Promise<void>;
};
