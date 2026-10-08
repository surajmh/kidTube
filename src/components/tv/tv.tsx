import React from 'react';
import { Pressable } from 'react-native';
import { useFocusablePressable } from './tv.hook';
import styles from './tv.style';
import type { FocusablePressableProps } from './tv.type';

export function FocusablePressable({
  style,
  focusStyle,
  pressedStyle,
  onFocusChange,
  children,
  ...rest
}: FocusablePressableProps) {
  const { focused, setFocused } = useFocusablePressable();
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
