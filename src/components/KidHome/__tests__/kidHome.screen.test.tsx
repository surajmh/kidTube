import React from 'react';
import { FlatList } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { KidHomeScreen } from '../kidHome';
import { KidHomeProps } from '../kidHome.type';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

it('windows a large video library and routes filtered lists and presses correctly', () => {
  jest.useFakeTimers();
  const videos = Array.from({ length: 1000 }, (_, index) => ({
    id: `v${index}`, youtubeVideoId: `yt${index}`, title: `Video ${index}`, approved: true,
    channelId: index % 2 ? 'other' : 'channel', categoryIds: index < 5 ? ['music'] : [],
  }));
  const props: KidHomeProps = {
    profiles: [], activeProfile: { id: 'kid', name: 'Kid', avatar: '' },
    library: { profileId: 'kid', videos, recentVideos: [videos[9]],
      channels: [{ id: 'c', channelId: 'channel', name: 'Channel', approved: true }],
      categories: [], askableVideos: [], askableChannels: [] },
    tab: 'home', selectedCategoryId: null, selectedChannelId: null,
    notice: '', requests: [], pendingRequestCount: 0,
    onSelectProfile: jest.fn(), onTabChange: jest.fn(), onSelectCategory: jest.fn(),
    onSelectChannel: jest.fn(), onVideoPress: jest.fn(), onParentPress: jest.fn(),
    onSubmitRequest: jest.fn(), onRequestVideo: jest.fn(), onRequestChannel: jest.fn(),
    channelSyncStateFor: () => undefined,
  };
  const view = render(<KidHomeScreen {...props} />);
  const data = () => view.UNSAFE_getByType(FlatList).props.data;
  try {
    expect(data()).toHaveLength(1000);
    expect(view.getAllByLabelText(/^Play Video/).length).toBeLessThan(50);
    fireEvent.press(view.getByLabelText('Play Video 0'));
    expect(props.onVideoPress).toHaveBeenCalledWith(videos[0]);
    view.rerender(<KidHomeScreen {...props} selectedCategoryId="music" />);
    expect(data()).toHaveLength(5);
    view.rerender(<KidHomeScreen {...props} tab="channels" selectedChannelId="channel" />);
    expect(data()).toHaveLength(500);
    view.rerender(<KidHomeScreen {...props} tab="downloads" />);
    expect(data()).toEqual([]);
    fireEvent.press(view.getByLabelText('Search'));
    fireEvent.changeText(view.getByPlaceholderText('Search your videos'), 'Video 999');
    act(() => jest.advanceTimersByTime(250));
    expect(data()).toEqual([videos[999]]);
    fireEvent.press(view.getByLabelText('Play Video 999'));
    expect(props.onVideoPress).toHaveBeenLastCalledWith(videos[999]);
    fireEvent.changeText(view.getByPlaceholderText('Search your videos'), '');
    expect(data()).toHaveLength(0);
    expect(view.queryByLabelText('Play Video 999')).toBeNull();
  } finally {
    view.unmount();
    jest.useRealTimers();
  }
});

it('shows only accessible playlist videos and starts a finite queue from the chosen item', () => {
  const a = { id: 'a', youtubeVideoId: 'aaaaaaaaaaa', title: 'Story A', approved: true };
  const b = { id: 'b', youtubeVideoId: 'bbbbbbbbbbb', title: 'Story B', approved: true };
  const props: KidHomeProps = {
    profiles: [], activeProfile: { id: 'kid', name: 'Kid', avatar: '' },
    library: { profileId: 'kid', videos: [a, b], recentVideos: [], channels: [], categories: [], askableVideos: [], askableChannels: [] },
    playlists: [{ id: 'p', name: 'Stories', videoIds: ['b', 'blocked', 'a'] }], selectedPlaylistId: 'p',
    tab: 'playlists', selectedCategoryId: null, selectedChannelId: null,
    notice: '', requests: [], pendingRequestCount: 0,
    onSelectProfile: jest.fn(), onTabChange: jest.fn(), onSelectCategory: jest.fn(),
    onSelectChannel: jest.fn(), onSelectPlaylist: jest.fn(), onPlayPlaylist: jest.fn(),
    onVideoPress: jest.fn(), onParentPress: jest.fn(), onSubmitRequest: jest.fn(),
    onRequestVideo: jest.fn(), onRequestChannel: jest.fn(), channelSyncStateFor: () => undefined,
  };
  const view = render(<KidHomeScreen {...props} />);
  try {
    expect(view.UNSAFE_getByType(FlatList).props.data).toEqual([b, a]);
    fireEvent.press(view.getByLabelText('Play all'));
    expect(props.onPlayPlaylist).toHaveBeenLastCalledWith([b, a], 'Stories');
    fireEvent.press(view.getByLabelText('Play Story A'));
    expect(props.onPlayPlaylist).toHaveBeenLastCalledWith([a], 'Stories');
    fireEvent.press(view.getByLabelText('All playlists'));
    expect(props.onSelectPlaylist).toHaveBeenCalledWith(null);
    view.rerender(<KidHomeScreen {...props} tab="home" />);
    fireEvent.press(view.getByLabelText('Play Story A'));
    expect(props.onVideoPress).toHaveBeenCalledWith(a);
  } finally { view.unmount(); }
});

describe('Downloads tab', () => {
  const a = { id: 'a', youtubeVideoId: 'aaaaaaaaaaa', title: 'Story A', approved: true };
  const b = { id: 'b', youtubeVideoId: 'bbbbbbbbbbb', title: 'Story B', approved: true };
  const base: KidHomeProps = {
    profiles: [], activeProfile: { id: 'kid', name: 'Kid', avatar: '' },
    library: { profileId: 'kid', videos: [a, b], recentVideos: [], channels: [], categories: [], askableVideos: [], askableChannels: [] },
    tab: 'downloads', selectedCategoryId: null, selectedChannelId: null, notice: '', requests: [], pendingRequestCount: 0,
    onSelectProfile: jest.fn(), onTabChange: jest.fn(), onSelectCategory: jest.fn(), onSelectChannel: jest.fn(),
    onVideoPress: jest.fn(), onParentPress: jest.fn(), onSubmitRequest: jest.fn(), onRequestVideo: jest.fn(),
    onRequestChannel: jest.fn(), channelSyncStateFor: () => undefined,
  };

  it('shows saving and ready items from the downloads prop', () => {
    const downloads = [
      { videoId: a.youtubeVideoId, state: 'ready' as const, expiresAt: Date.now() + 3 * 86_400_000, bytes: 1, percent: 100 },
      { videoId: b.youtubeVideoId, state: 'downloading' as const, expiresAt: Date.now() + 86_400_000, bytes: 1, percent: 41.6 },
    ];
    const view = render(<KidHomeScreen {...base} downloads={downloads} />);
    // The list lives in the header now, so the FlatList itself has nothing to draw.
    expect(view.UNSAFE_getByType(FlatList).props.data).toEqual([]);
    expect(view.getByText('2 downloaded videos')).toBeTruthy();
    expect(view.getByText('Saving… 42%')).toBeTruthy();
    expect(view.getByText('<1 MB · Expires in 3 days')).toBeTruthy();
    // Children get no "…" menu, so they cannot delete anything.
    expect(view.queryByLabelText(/More options/)).toBeNull();
    view.unmount();
  });

  it('shows a friendly empty state', () => {
    const view = render(<KidHomeScreen {...base} downloads={[]} />);
    expect(view.getByText('Nothing downloaded yet')).toBeTruthy();
    expect(view.getByText('Open a video and tap Download to watch it later without internet.')).toBeTruthy();
    view.unmount();
  });

  it('hides the tab when downloads are turned off', () => {
    const view = render(<KidHomeScreen {...base} tab="home" downloadsEnabled={false} />);
    expect(view.queryByLabelText('Downloads')).toBeNull();
    view.rerender(<KidHomeScreen {...base} tab="home" />);
    expect(view.getByLabelText('Downloads')).toBeTruthy();
    view.unmount();
  });
});

it('uses the TV hero and top navigation without changing the mobile layout', () => {
  const { Platform } = require('react-native');
  const tv = jest.spyOn(Platform, 'isTV', 'get');
  const video = { id: 'tv', youtubeVideoId: 'aaaaaaaaaaa', title: 'Approved story', approved: true, channelId: 'channel' };
  const props: KidHomeProps = {
    profiles: [], library: { profileId: 'kid', videos: [video], recentVideos: [video], channels: [{ id: 'c', channelId: 'channel', name: 'Stories', approved: true }], categories: [], askableVideos: [], askableChannels: [] },
    tab: 'home', selectedCategoryId: null, selectedChannelId: null, notice: '', requests: [], pendingRequestCount: 0,
    onSelectProfile: jest.fn(), onTabChange: jest.fn(), onSelectCategory: jest.fn(), onSelectChannel: jest.fn(), onVideoPress: jest.fn(), onParentPress: jest.fn(), onSubmitRequest: jest.fn(), onRequestVideo: jest.fn(), onRequestChannel: jest.fn(), channelSyncStateFor: () => undefined, onBottomNavLayout: jest.fn(),
  };
  tv.mockReturnValue(true);
  const view = render(<KidHomeScreen {...props} />);
  try {
    expect(view.getByTestId('tv-home-feed')).toBeTruthy();
    expect(props.onBottomNavLayout).toHaveBeenCalledWith(0);
    fireEvent.press(view.getByLabelText('Watch featured Approved story'));
    expect(props.onVideoPress).toHaveBeenCalledWith(video);
    fireEvent.press(view.getByLabelText('More like this'));
    expect(props.onSelectChannel).toHaveBeenCalledWith('channel');
    expect(props.onTabChange).toHaveBeenCalledWith('channels');
    fireEvent.press(view.getByLabelText('Open parent mode'));
    expect(props.onParentPress).toHaveBeenCalled();
    view.rerender(<KidHomeScreen {...props} downloadsEnabled={false} />);
    expect(view.queryByLabelText('Downloads')).toBeNull();
    tv.mockReturnValue(false);
    view.unmount();
    const mobile = render(<KidHomeScreen {...props} />);
    try {
      expect(mobile.queryByTestId('tv-home-feed')).toBeNull();
      expect(mobile.queryByText('Watch now')).toBeNull();
      expect(mobile.getByText('Keep watching')).toBeTruthy();
      expect(mobile.getAllByLabelText('Play Approved story').length).toBeGreaterThan(0);
    } finally { mobile.unmount(); }
  } finally { view.unmount(); tv.mockRestore(); }
});
