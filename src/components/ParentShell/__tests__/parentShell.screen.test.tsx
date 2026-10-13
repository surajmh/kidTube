import React, { useState } from 'react';
import { BackHandler, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ParentShell } from '../parentShell';
import type { ParentSection, ParentShellData, ParentShellActions } from '../parentShell.type';
import { ThemeProvider, themes } from '../../theme';
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

it('offers every parent section as a row and handles remote Back from a section', () => {
  const subscription = jest.spyOn(BackHandler, 'addEventListener');
  const data = { requests: [], channels: [], profiles: [], activeProfileId: '' } as unknown as ParentShellData;
  const actions = { onExit: jest.fn(), onSelectChannel: jest.fn() } as unknown as ParentShellActions;
  function Screen() {
    const [section, setSection] = useState<ParentSection>('home');
    return <ParentShell data={data} actions={actions} section={section} setSection={setSection} contentTab="channels" selectedChannelId={null} setContentTab={jest.fn()} settingsSlot={<Text>Playback preferences</Text>} notice="Repaired local data: duplicate videos." />;
  }
  const view = render(<ThemeProvider value={themes.light}><Screen /></ThemeProvider>);
  try {
    for (const label of ['Children', 'Family settings', 'Channels', 'Videos', 'Categories', 'Requests', 'Playlists', 'Downloads', 'Activity', 'Security']) expect(view.getByLabelText(label)).toBeTruthy();
    expect(view.queryByText('Manage profiles, screen time and settings')).toBeNull();
    view.rerender(<ThemeProvider value={themes.dark}><Screen /></ThemeProvider>);
    expect(view.getByText('Manage profiles, screen time and settings')).toBeTruthy();
    expect(view.getByText('0 pending')).toBeTruthy();
    expect(view.getByText('Repaired local data: duplicate videos.')).toBeTruthy();
    fireEvent.press(view.getByLabelText('Family settings'));
    expect(view.getByText('Playback preferences')).toBeTruthy();
    expect(view.queryByText('Repaired local data: duplicate videos.')).toBeNull();
    fireEvent.press(view.getByLabelText('Back to parent settings'));
    expect(view.queryByText('Playback preferences')).toBeNull();
    expect(view.getByText('Repaired local data: duplicate videos.')).toBeTruthy();
    expect(subscription).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
    fireEvent.press(view.getByLabelText('Dismiss repair message'));
    expect(view.queryByText('Repaired local data: duplicate videos.')).toBeNull();
    fireEvent.press(view.getByLabelText('Back to kid mode'));
    expect(actions.onExit).toHaveBeenCalled();
  } finally { view.unmount(); subscription.mockRestore(); }
});
