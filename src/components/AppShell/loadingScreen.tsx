import React from 'react';
import { Image, Text, View } from 'react-native';
import { useStyles as useStyles } from './appShell.style';
import { PrimaryButton } from './appFormControls';
import { appIcon, loadingCopy } from './loadingScreen.constant';
import type { LoadingScreenProps } from './loadingScreen.type';

/** Shown while the library loads; if storage could not be read it offers a retry instead of a spinner. */
export function LoadingScreen({ onRetry }: LoadingScreenProps) {
  const styles = useStyles();
  return (
    <View style={[styles.safeArea, styles.centered]}>
      <Image source={appIcon} style={styles.logoMark} resizeMode="contain" />
      <Text style={styles.loadingText}>{onRetry ? loadingCopy.failed : loadingCopy.loading}</Text>
      {onRetry && <PrimaryButton label={loadingCopy.retry} onPress={onRetry} />}
    </View>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.brandRow}>
      <Image source={appIcon} style={styles.logoMarkSmall} resizeMode="contain" />
      {!compact && <Text style={styles.brandName}>kidTube</Text>}
    </View>
  );
}
