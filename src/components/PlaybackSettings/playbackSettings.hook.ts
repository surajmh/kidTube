import { useState } from 'react';
import type { PlaybackSettings, SponsorBlockCategory } from '../../types';
import { parseTime } from '../shared/time.helper';
import { DEFAULT_SETTINGS_WINDOW } from './playbackSettings.constant';
import { toggleInList } from './playbackSettings.helper';

export function usePlaybackSettings(settings: PlaybackSettings, onChange: (settings: PlaybackSettings) => void) {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const dayWindows = settings.schedules[String(selectedDay)] ?? [];
  const currentWindow = dayWindows[0] ?? DEFAULT_SETTINGS_WINDOW;

  function patch(patch: Partial<PlaybackSettings>) {
    onChange({ ...settings, ...patch });
  }

  function updateWindow(field: 'startMinutes' | 'endMinutes', value: string) {
    const parsed = parseTime(value);
    if (parsed === null) return;
    patch({ schedules: { ...settings.schedules, [String(selectedDay)]: [{ ...currentWindow, [field]: parsed }] } });
  }

  function toggleCategory(category: SponsorBlockCategory) {
    patch({ sponsorBlockCategories: toggleInList(settings.sponsorBlockCategories, category) });
  }

  return { selectedDay, setSelectedDay, currentWindow, patch, updateWindow, toggleCategory };
}
