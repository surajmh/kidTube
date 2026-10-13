import React from 'react';
import { Modal } from 'react-native';
import { SettingsRow, SettingsScreen } from '../SettingsMenu';
import { DOWNLOAD_LIST_COPY } from './downloadList.constant';
import type { SheetOption } from './downloadList.type';

export function DownloadSheet({ visible, title, options, onClose }: { visible: boolean; title?: string; options: SheetOption[]; onClose: () => void }) {
  if (!visible) return null;
  return <Modal visible onRequestClose={onClose} animationType="none">
    <SettingsScreen title={title ?? 'Downloads'} onBack={onClose}>
      {options.map((option) => <SettingsRow key={option.label} label={option.label} selected={option.selected} onPress={option.onPress} />)}
      <SettingsRow label={DOWNLOAD_LIST_COPY.cancel} onPress={onClose} />
    </SettingsScreen>
  </Modal>;
}
