import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';
import useStyles from './parentContent.style';
import { CHANNEL_BANNER } from './parentContent.constant';

/** An empty-state style nudge at the top of Channels; its button opens the add form. */
export function ParentContentBanner({ onAdd }: { onAdd: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.banner}>
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle}>{CHANNEL_BANNER.title}</Text>
        <Text style={styles.bannerBody}>{CHANNEL_BANNER.body}</Text>
        <FocusablePressable accessibilityLabel={CHANNEL_BANNER.action} style={styles.bannerButton} onPress={onAdd}>
          <Text style={styles.bannerButtonText}>{CHANNEL_BANNER.action}</Text>
          <Feather name="arrow-right" size={15} color="#1A1A1A" />
        </FocusablePressable>
      </View>
      <View style={styles.bannerArt}>
        <Feather name="tv" size={34} color="#1A1A1A" />
      </View>
    </View>
  );
}
