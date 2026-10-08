import { useState } from 'react';
import { ChildProfile } from '../../types';
import type { ContentRequest } from '../../types';

export function useAskPanel(activeProfile: ChildProfile | undefined, requests: ContentRequest[]) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const mine = activeProfile ? requests.filter((request) => request.profileId === activeProfile.id) : [];

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'That request did not go through.');
    } finally {
      setBusy(false);
    }
  }

  return { title, setTitle, message, busy, mine, run };
}
