import { useState } from 'react';

export function useFocusablePressable() {
  const [focused, setFocused] = useState(false);
  return { focused, setFocused };
}
