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
    view.rerender(<KidHomeScreen {...props} tab="recent" />);
    expect(data()).toEqual([videos[9]]);
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
