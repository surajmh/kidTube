import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { defaultPlaybackSettings } from '../../../constants/playback.constant';
import { PlaybackSettingsPanel } from '../playbackSettings';
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
function mount(settings = defaultPlaybackSettings) {
  const onChange = jest.fn();
  return { ...render(<PlaybackSettingsPanel settings={settings} usage={[]} profiles={[]} onChange={onChange} />), onChange };
}
it('picks retention and toggles downloads through nested rows', async () => {
  const view = mount();
  fireEvent.press(view.getByLabelText('Downloads'));
  fireEvent.press(view.getByLabelText('Keep downloads for'));
  await act(async () => fireEvent.press(view.getByLabelText('Keep downloads for: 30 days')));
  expect(view.onChange).toHaveBeenLastCalledWith({ ...defaultPlaybackSettings, downloadRetentionDays: 30 });
  fireEvent.press(view.getByLabelText('Let children save videos for offline'));
  await act(async () => fireEvent.press(view.getByLabelText('Let children save videos for offline: Off')));
  expect(view.onChange).toHaveBeenLastCalledWith({ ...defaultPlaybackSettings, downloadsEnabled: false });
});
it('hides retention when downloads are off', () => {
  const view = mount({ ...defaultPlaybackSettings, downloadsEnabled: false });
  fireEvent.press(view.getByLabelText('Downloads'));
  expect(view.queryByLabelText('Keep downloads for')).toBeNull();
});
it('changes allowed hours with a remote-friendly minute submenu', async () => {
  const view = mount();
  fireEvent.press(view.getByLabelText('Allowed hours'));
  fireEvent.press(view.getByLabelText('Mon'));
  fireEvent.press(view.getByLabelText('Mon start'));
  fireEvent.press(view.getByLabelText('Mon start minute'));
  await act(async () => fireEvent.press(view.getByLabelText('Mon start minute: 17')));
  expect(view.onChange.mock.calls.at(-1)[0].schedules['1'][0].startMinutes).toBe(16 * 60 + 17);
});
