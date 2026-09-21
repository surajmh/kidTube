export const PIN_LENGTH = 4;

export const PARENT_SECURITY_COPY = {
  incomplete: 'Fill in all three fields to change the PIN.',
  mismatch: 'The new PIN and its confirmation do not match.',
  unchanged: 'That is already your PIN. Choose a different one.',
  saved: 'PIN changed. Use the new one from now on.',
  failed: 'That PIN could not be saved. Try a different 4-digit PIN.',
} as const;
