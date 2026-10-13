import React from 'react';
import { Modal } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SettingsChoice, SettingsGroup, SettingsText } from './settingsMenu';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

it('opens one submenu at a time and Back returns to the containing menu without changing a value', () => {
  const onChange = jest.fn();
  const view = render(<SettingsGroup label="Playback"><SettingsChoice label="Quality" value={720} options={[{ value: 720, label: '720p' }]} onChange={onChange} /></SettingsGroup>);
  expect(view.queryByLabelText('Quality')).toBeNull();
  fireEvent.press(view.getByLabelText('Playback'));
  fireEvent.press(view.getByLabelText('Quality'));
  expect(view.getByLabelText('Quality: 720p').props.accessibilityState.selected).toBe(true);
  expect(view.getByLabelText('Quality: 720p').props.accessibilityRole).toBe('radio');
  fireEvent(view.UNSAFE_getAllByType(Modal).at(-1)!, 'requestClose');
  expect(view.queryByLabelText('Quality: 720p')).toBeNull();
  expect(view.getByLabelText('Quality')).toBeTruthy();
  fireEvent.press(view.getByLabelText('Back from Playback'));
  expect(view.queryByLabelText('Quality')).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
});

it('waits for a save, blocks duplicate selections and keeps the submenu open on failure', async () => {
  let reject!: (error: Error) => void;
  const onChange = jest.fn(() => new Promise<void>((_, fail) => { reject = fail; }));
  const view = render(<SettingsChoice label="Theme" value="light" options={[{ value: 'dark', label: 'Dark' }]} onChange={onChange} />);
  fireEvent.press(view.getByLabelText('Theme'));
  fireEvent.press(view.getByLabelText('Theme: Dark'));
  fireEvent.press(view.getByLabelText('Theme: Dark'));
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(view.getByLabelText('Back from Theme').props.accessibilityState.disabled).toBe(true);
  await act(async () => reject(new Error('Storage unavailable')));
  expect(view.getByText('Storage unavailable')).toBeTruthy();
  expect(view.getByLabelText('Theme: Dark').props.accessibilityState.disabled).toBe(false);
});

it('closes a choice submenu after a successful save and never renders a PIN in its summary', async () => {
  const onChange = jest.fn(async () => undefined);
  const view = render(<><SettingsChoice label="Quality" value={360} options={[{ value: 720, label: '720p' }]} onChange={onChange} /><SettingsText label="PIN" value="5678" onChange={jest.fn()} secureTextEntry /></>);
  expect(view.queryByText('5678')).toBeNull();
  fireEvent.press(view.getByLabelText('Quality'));
  await act(async () => fireEvent.press(view.getByLabelText('Quality: 720p')));
  expect(view.queryByLabelText('Quality: 720p')).toBeNull();
  expect(onChange).toHaveBeenCalledWith(720);
});
