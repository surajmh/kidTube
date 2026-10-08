import React from 'react';
import { ActivityIndicator, Modal, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';
import { yt } from '../youtube/theme';
import { DOWNLOAD_COPY } from './playerDownload.constant';
import { downloadView, idleLabel, progressLabel, qualityLabel } from './playerDownload.helper';
import { usePlayerDownload } from './playerDownload.hook';
import styles from './playerDownload.style';
import type { PlayerDownloadProps } from './playerDownload.type';

export function PlayerDownload(props: PlayerDownloadProps) {
  const { item, busy, choices, message, press, choose, cancel } = usePlayerDownload(props);
  const view = downloadView(item);

  if (view === 'ready') {
    return (
      <View style={styles.wrap}>
        <View accessibilityLabel={DOWNLOAD_COPY.downloaded} style={styles.button}>
          <Feather name="check" size={18} color={yt.text} />
          <Text style={styles.label}>{DOWNLOAD_COPY.downloaded}</Text>
        </View>
      </View>
    );
  }
  if (view === 'progress' && item) {
    return (
      <View style={styles.wrap}>
        <View accessibilityLabel={progressLabel(item)} style={[styles.button, styles.disabled]}>
          <ActivityIndicator size="small" color={yt.text} />
          <Text style={styles.label}>{progressLabel(item)}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <FocusablePressable accessibilityLabel={idleLabel(item)} accessibilityState={{ disabled: busy }} disabled={busy}
        style={[styles.button, busy && styles.disabled]} onPress={press}>
        {busy ? <ActivityIndicator size="small" color={yt.text} /> : <Feather name="download" size={18} color={yt.text} />}
        <Text style={styles.label}>{idleLabel(item)}</Text>
      </FocusablePressable>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Modal transparent visible={choices !== null} animationType="fade" onRequestClose={cancel}>
        <View style={styles.scrim}>
          <View style={styles.card}>
            <Text style={styles.title}>{DOWNLOAD_COPY.chooseQuality}</Text>
            {(choices ?? []).map((height) => (
              <FocusablePressable key={height} accessibilityLabel={`Choose ${height}p`} style={styles.row} onPress={() => choose(height)}>
                <Text style={styles.rowText}>{qualityLabel(height)}</Text>
              </FocusablePressable>
            ))}
            <FocusablePressable accessibilityLabel={DOWNLOAD_COPY.cancel} style={styles.cancel} onPress={cancel}>
              <Text style={styles.cancelText}>{DOWNLOAD_COPY.cancel}</Text>
            </FocusablePressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
