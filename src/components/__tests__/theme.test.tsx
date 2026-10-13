import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider, themes, resolveTheme } from '../theme';
import { PlaybackSettingsPanel } from '../PlaybackSettings/playbackSettings';
import { VideoCard } from '../youtube/VideoCard';
import { defaultPlaybackSettings } from '../../constants/playback.constant';
import { sanitizeSettings } from '../../services/contentValidation';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

it('updates both parent settings and memoized child cards without remounting', () => {
  const onChange = jest.fn();
  const video = { id: 'a', youtubeVideoId: 'aaaaaaaaaaa', title: 'Approved song', approved: true };
  const content = <><PlaybackSettingsPanel settings={defaultPlaybackSettings} usage={[]} profiles={[]} onChange={onChange} /><VideoCard video={video} onPress={jest.fn()} /></>;
  const view = render(<ThemeProvider value={themes.dark}>{content}</ThemeProvider>);
  const color = (text: string) => StyleSheet.flatten(view.getByText(text).props.style).color;
  expect(color('Appearance')).toBe(themes.dark.colors.ink);
  expect(color('Approved song')).toBe(themes.dark.yt.text);
  view.rerender(<ThemeProvider value={themes.light}>{content}</ThemeProvider>);
  expect(color('Appearance')).toBe(themes.light.colors.ink);
  expect(color('Approved song')).toBe(themes.light.yt.text);
  fireEvent.press(view.getByLabelText('dark theme'));
  expect(onChange).toHaveBeenCalledWith({ ...defaultPlaybackSettings, themeMode: 'dark' });
});

it('resolves system appearance and normalizes saved theme preferences', () => {
  expect(resolveTheme('system', 'dark')).toBe('dark');
  expect(resolveTheme('system', 'light')).toBe('light');
  expect(resolveTheme('dark', 'light')).toBe('dark');
  expect(resolveTheme('light', 'dark')).toBe('light');
  expect(resolveTheme(undefined, null)).toBe('light');
  for (const themeMode of ['light', 'dark', 'system'] as const) expect(sanitizeSettings({ themeMode }).themeMode).toBe(themeMode);
  expect(sanitizeSettings({ themeMode: 'unknown' } as never).themeMode).toBe('system');
  expect(sanitizeSettings({}).themeMode).toBe('system');
});
