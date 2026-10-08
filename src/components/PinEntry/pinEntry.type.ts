export type PinEntryProps = {
  pin: string;
  onChange: (pin: string) => void;
  onSubmit: () => void;
  error?: string;
  helper?: string;
  busy?: boolean;
  submitLabel?: string;
};
