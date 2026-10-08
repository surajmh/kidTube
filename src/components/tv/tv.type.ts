import type React from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

/**
 * Remote-friendly pressable.
 *
 * Android TV users move focus with the D-pad: every interactive element in
 * Phase 4 goes through this component so focus is always visible and no
 * interaction requires a touch screen.
 */
export type FocusablePressableProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  focusStyle?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  onFocusChange?: (focused: boolean) => void;
  children?: React.ReactNode;
};
