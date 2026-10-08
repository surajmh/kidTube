import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { Thumbnail } from '../videoCard';
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
