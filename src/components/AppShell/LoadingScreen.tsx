import React from 'react';
import { Image, Text, View } from 'react-native';
import { styles } from './appShell.style';

export function LoadingScreen() {
  return (
    <View style={[styles.safeArea, styles.centered]}>
      <Image source={require('../../../assets/icon.png')} style={styles.logoMark} resizeMode="contain" />
      <Text style={styles.loadingText}>Waking up kidTube…</Text>
    </View>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <Image source={require('../../../assets/icon.png')} style={styles.logoMarkSmall} resizeMode="contain" />
      {!compact && <Text style={styles.brandName}>kidTube</Text>}
    </View>
  );
}
