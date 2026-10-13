import { useTheme } from '../theme';
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';

import { DOWNLOAD_LIST_COPY } from './downloadList.constant';
import useStyles from './downloadList.style';
import type { SheetOption } from './downloadList.type';

/** A bottom sheet of choices, used for the sort order and for a row's "…" menu. */
export function DownloadSheet({ visible, title, options, onClose }: { visible: boolean; title?: string; options: SheetOption[]; onClose: () => void }) {
  const styles = useStyles();
  const { yt } = useTheme();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel={DOWNLOAD_LIST_COPY.cancel} style={styles.scrim} onPress={onClose}>
        <View style={styles.sheet}>
          {title ? <Text style={styles.sheetTitle} numberOfLines={1}>{title}</Text> : null}
          {options.map((option) => (
            <FocusablePressable key={option.label} accessibilityLabel={option.label} style={styles.sheetOption} onPress={option.onPress}>
              <Text style={[styles.sheetText, option.danger && styles.sheetDanger]}>{option.label}</Text>
              {option.selected ? <Feather name="check" size={18} color={yt.text} /> : null}
            </FocusablePressable>
          ))}
          <FocusablePressable accessibilityLabel={DOWNLOAD_LIST_COPY.cancel} style={styles.sheetCancel} onPress={onClose}>
            <Text style={styles.sheetText}>{DOWNLOAD_LIST_COPY.cancel}</Text>
          </FocusablePressable>
        </View>
      </Pressable>
    </Modal>
  );
}
