import type { PlaybackSettings, SponsorBlockCategory } from '../../types';
import { toggleInList } from './playbackSettings.helper';

export function usePlaybackSettings(settings: PlaybackSettings, onChange: (settings: PlaybackSettings) => void | Promise<void>) {
  function patch(patch: Partial<PlaybackSettings>) {
    return onChange({ ...settings, ...patch });
  }
  function toggleCategory(category: SponsorBlockCategory) {
    return patch({ sponsorBlockCategories: toggleInList(settings.sponsorBlockCategories, category) });
  }
  return { patch, toggleCategory };
}
