import React, { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusablePressable } from './tv.hook';
import useStyles from './tv.style';
import type { FocusablePressableProps } from './tv.type';

export const FocusablePressable = forwardRef<View, FocusablePressableProps>(function FocusablePressable({
  style,
  focusStyle,
  pressedStyle,
  onFocusChange,
  children,
  ...rest
}, ref) {
  const styles = useStyles();
  const { focused, setFocused } = useFocusablePressable();
  return (
    <Pressable
      ref={ref}
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
});
