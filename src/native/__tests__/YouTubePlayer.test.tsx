import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { nativeYouTubePlayerAdapter } from '../YouTubePlayerAdapter';
import { YouTubePlayer } from '../YouTubePlayer';

jest.mock('expo-modules-core', () => {
  const native = require('react-native');
  native.Platform.OS = 'android';
  return { requireNativeViewManager: () => native.View, requireOptionalNativeModule: () => ({}) };
});
jest.mock('../YouTubePlayerAdapter', () => ({ nativeYouTubePlayerAdapter: {
  play: jest.fn(), stop: jest.fn(async () => {}),
} }));

it('ignores rejected start commands after a switch or unmount', async () => {
  const rejects: ((reason: Error) => void)[] = [];
  (nativeYouTubePlayerAdapter.play as jest.Mock).mockImplementation(() =>
    new Promise((_resolve, reject) => rejects.push(reject)));
  const onError = jest.fn();
  const view = render(<YouTubePlayer videoId="aaaaaaaaaaa" onError={onError} />);
  try {
    expect(Platform.OS).toBe('android');
    view.rerender(<YouTubePlayer videoId="bbbbbbbbbbb" onError={onError} />);
    await act(async () => rejects[0](new Error('old video')));
    expect(onError).not.toHaveBeenCalled();
    await act(async () => rejects[1](new Error('current video')));
    expect(onError).toHaveBeenCalledTimes(1);
    view.rerender(<YouTubePlayer videoId="ccccccccccc" onError={onError} />);
    view.unmount();
    await act(async () => rejects[2](new Error('unmounted video')));
    expect(onError).toHaveBeenCalledTimes(1);
  } finally { view.unmount(); }
});
