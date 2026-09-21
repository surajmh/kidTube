import React, { useState } from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';

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

export function FocusablePressable({
  style,
  focusStyle,
  pressedStyle,
  onFocusChange,
  children,
  ...rest
}: FocusablePressableProps) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      {...rest}
      focusable={rest.focusable ?? !rest.disabled}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      onFocus={(event) => {
        setFocused(true);
        onFocusChange?.(true);
        rest.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onFocusChange?.(false);
        rest.onBlur?.(event);
      }}
      style={({ pressed }) => [
        styles.base,
        style,
        focused ? styles.focused : null,
        focused ? focusStyle : null,
        pressed ? (pressedStyle ?? styles.pressed) : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // A transparent border keeps the focus ring from shifting layout.
  base: { borderColor: 'transparent', borderWidth: 2 },
  // A light ring reads on both the dark kid and parent surfaces.
  focused: { borderColor: '#F1F1F1', elevation: 6, shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 10, transform: [{ scale: 1.03 }] },
  pressed: { opacity: 0.82 },
});
