import React from 'react';
import { SettingsChoice } from '../SettingsMenu';
import { CHANNEL_SORT_LABELS } from './parentContent.constant';
import type { ChannelSort } from './parentContent.type';

export function ChannelListHeader({ count, sort, onToggleSort }: { count: number; sort: ChannelSort; onToggleSort: () => void }) {
  return <SettingsChoice label={`Sort ${count} channels`} value={sort} options={(['recent', 'name'] as const).map((value) => ({ value, label: CHANNEL_SORT_LABELS[value] }))} onChange={(next) => next === sort ? undefined : onToggleSort()} />;
}
