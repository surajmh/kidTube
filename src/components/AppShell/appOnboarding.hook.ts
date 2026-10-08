import { useState } from 'react';
import { avatarOptions } from '../Avatar';
import type { PinSetupProps, ProfileSetupProps } from './appOnboarding.type';

export function usePinSetup(onSubmit: PinSetupProps['onSubmit']) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (pin.length !== 4) {
      setError('Choose exactly 4 numbers for your parent PIN.');
      return;
    }
    setBusy(true);
    try {
      const message = await onSubmit(pin);
      if (message) setError(message);
      else setPin('');
    } finally {
      setBusy(false);
    }
  }
  return { pin, setPin, error, busy, submit };
}

export function useProfileSetup(onSubmit: ProfileSetupProps['onSubmit']) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(avatarOptions[0]);
  const [error, setError] = useState('');
  const submit = () => name.trim() ? onSubmit(name, avatar) : setError('Give this profile a name first.');
  return { name, setName, avatar, setAvatar, error, submit };
}
