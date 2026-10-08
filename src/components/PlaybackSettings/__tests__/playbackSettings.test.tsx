import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { defaultPlaybackSettings } from '../../../constants/playback.constant';
import { PlaybackSettingsPanel } from '../playbackSettings';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

function mount(settings = defaultPlaybackSettings) {
  const onChange = jest.fn();
  const view = render(<PlaybackSettingsPanel settings={settings} usage={[]} profiles={[]} onChange={onChange} />);
  return { ...view, onChange };
}

it('picks retention and toggles downloads', () => {
  const { getByLabelText, getByText, onChange } = mount();
  fireEvent.press(getByLabelText('Keep downloads 30 days'));
  expect(onChange).toHaveBeenLastCalledWith({ ...defaultPlaybackSettings, downloadRetentionDays: 30 });
  fireEvent.press(getByText('Let children save videos for offline'));
  expect(onChange).toHaveBeenLastCalledWith({ ...defaultPlaybackSettings, downloadsEnabled: false });
});

it('hides retention when downloads are off', () => {
  const { queryByLabelText } = mount({ ...defaultPlaybackSettings, downloadsEnabled: false });
  expect(queryByLabelText('Keep downloads 7 days')).toBeNull();
});
