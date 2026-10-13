import { useRef, useState } from 'react';
import type { View } from 'react-native';

export function useSettingsMenu() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function close() {
    if (busy) return;
    setOpen(false);
    setError('');
    requestAnimationFrame(() => trigger.current?.focus());
  }
  async function choose(action: () => void | Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
      setOpen(false);
      requestAnimationFrame(() => trigger.current?.focus());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save. Try again.');
    } finally { setBusy(false); }
  }
  return { open, setOpen, trigger, close, busy, error, choose };
}
