import React from 'react';
import { View } from 'react-native';
import { SettingsGroup, SettingsTime } from '../SettingsMenu';
import { DEFAULT_WINDOW, DAY_LABELS } from './parentChildren.constant';

export function AllowedWindowEditor({ schedules, onChange }: {
  schedules: Record<string, { startMinutes: number; endMinutes: number }[]>;
  onChange: (schedules: Record<string, { startMinutes: number; endMinutes: number }[]>) => void | Promise<void>;
}) {
  return <View>{DAY_LABELS.map(({ value: day, label }) => {
    const window = schedules[String(day)]?.[0] ?? DEFAULT_WINDOW;
    const update = (field: 'startMinutes' | 'endMinutes', value: number) => onChange({ ...schedules, [String(day)]: [{ ...window, [field]: value }] });
    return <SettingsGroup key={day} label={label}>
      <SettingsTime label={`${label} start`} value={window.startMinutes} onChange={(value) => update('startMinutes', value)} />
      <SettingsTime label={`${label} end`} value={window.endMinutes} onChange={(value) => update('endMinutes', value)} />
    </SettingsGroup>;
  })}</View>;
}
