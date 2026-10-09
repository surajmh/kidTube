import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { ChannelAvatar, Thumbnail, VideoCard } from '../videoCard';
import { useAppStore } from '../../../../store/appStore';
import { ApprovedVideo } from '../../../../types';

it('changes thumbnails immediately, with fallback scoped to the failed source', () => {
  const video: ApprovedVideo = { id: 'a', youtubeVideoId: 'aaaaaaaaaaa', title: 'A', approved: true };
  const view = render(<Thumbnail video={video} />);
  const image = () => view.UNSAFE_getByType(Image);
  expect(image().props.source.uri).toBe('https://i.ytimg.com/vi/aaaaaaaaaaa/hq720.jpg');
  const oldError = image().props.onError;
  act(() => oldError());
  expect(image().props.source.uri).toBe('https://i.ytimg.com/vi/aaaaaaaaaaa/mqdefault.jpg');

  view.rerender(<Thumbnail video={{ ...video, youtubeVideoId: 'bbbbbbbbbbb' }} />);
  expect(image().props.source.uri).toBe('https://i.ytimg.com/vi/bbbbbbbbbbb/hq720.jpg');
  expect(image().props.recyclingKey).toBe('https://i.ytimg.com/vi/bbbbbbbbbbb/hq720.jpg');
  act(() => oldError());
  expect(image().props.source.uri).toBe('https://i.ytimg.com/vi/bbbbbbbbbbb/hq720.jpg');
  act(() => image().props.onError());
  expect(image().props.source.uri).toBe('https://i.ytimg.com/vi/bbbbbbbbbbb/mqdefault.jpg');

  view.rerender(<Thumbnail video={{ ...video, youtubeVideoId: 'bbbbbbbbbbb', thumbnailUrl: 'https://example.com/new.jpg' }} />);
  expect(image().props.source.uri).toBe('https://example.com/new.jpg');
});

it('uses saved channel artwork on video cards and scopes failures to the image URL', () => {
  useAppStore.setState({ channels: [
    { id: 'a', channelId: 'channel-a', name: 'Same name', approved: true, thumbnailUrl: 'https://example.com/a.jpg' },
    { id: 'b', channelId: 'channel-b', name: 'Same name', approved: true, thumbnailUrl: 'https://example.com/b.jpg' },
  ] });
  const video: ApprovedVideo = { id: 'v', youtubeVideoId: 'aaaaaaaaaaa', title: 'Video', channelName: 'Same name', channelId: 'channel-a', approved: true };
  const card = render(<VideoCard video={video} onPress={() => undefined} />);
  expect(card.UNSAFE_getAllByType(Image).map((node) => node.props.source.uri)).toContain('https://example.com/a.jpg');
  card.unmount();

  const view = render(<ChannelAvatar name="Same name" channelId="channel-a" />);
  const oldError = view.UNSAFE_getByType(Image).props.onError;
  act(() => oldError());
  expect(view.queryByText('S')).not.toBeNull();
  view.rerender(<ChannelAvatar name="Same name" channelId="channel-b" />);
  expect(view.UNSAFE_getByType(Image).props.source.uri).toBe('https://example.com/b.jpg');
  act(() => oldError());
  expect(view.UNSAFE_getByType(Image).props.source.uri).toBe('https://example.com/b.jpg');
  act(() => useAppStore.setState({ channels: [] }));
  expect(view.queryByText('S')).not.toBeNull();
  view.rerender(<ChannelAvatar name="Child" />);
  expect(view.queryByText('C')).not.toBeNull();
});
