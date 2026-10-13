import { useTheme } from '../theme';
import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';

import { DOWNLOAD_LIST_COPY, SORT_LABELS, SORT_ORDER } from './downloadList.constant';
import { isWorking } from './downloadList.helper';
import { useDownloadList } from './downloadList.hook';
import useStyles from './downloadList.style';
import type { DownloadListProps } from './downloadList.type';
import { DownloadRow } from './downloadRow';
import { DownloadSheet } from './downloadSheet';

/** The saved-video list: a count and sort control, then one card per video. */
export function DownloadList({ entries, showHeader = true, onDelete, onPlay, busyId }: DownloadListProps) {
  const styles = useStyles();
  const { yt } = useTheme();
  const list = useDownloadList(entries);
  const menuEntry = list.menuFor;
  const deleteLabel = menuEntry && isWorking(menuEntry.item) ? DOWNLOAD_LIST_COPY.cancelSaving : DOWNLOAD_LIST_COPY.deleteReady;
  return (
    <View>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={styles.count}>{DOWNLOAD_LIST_COPY.count(entries.length)}</Text>
          <FocusablePressable accessibilityLabel="Sort downloads" style={styles.sortPill} onPress={list.openSort}>
            <Text style={styles.sortText}>{DOWNLOAD_LIST_COPY.sort}</Text>
            <Feather name="sliders" size={16} color={yt.text} />
            <Feather name="chevron-down" size={18} color={yt.text} />
          </FocusablePressable>
        </View>
      ) : null}
      {list.sorted.map((entry) => (
        <DownloadRow
          key={entry.item.videoId}
          entry={entry}
          busy={busyId === entry.item.videoId}
          onPlay={onPlay}
          onMenu={onDelete ? list.openMenu : undefined}
        />
      ))}
      <DownloadSheet
        visible={list.sortOpen}
        options={SORT_ORDER.map((key) => ({ label: SORT_LABELS[key], selected: key === list.sort, onPress: () => list.chooseSort(key) }))}
        onClose={list.closeSort}
      />
      <DownloadSheet
        visible={menuEntry !== null && Boolean(onDelete)}
        title={menuEntry?.video?.title}
        options={menuEntry ? [{ label: deleteLabel, danger: true, onPress: () => { list.closeMenu(); onDelete?.(menuEntry); } }] : []}
        onClose={list.closeMenu}
      />
    </View>
  );
}
