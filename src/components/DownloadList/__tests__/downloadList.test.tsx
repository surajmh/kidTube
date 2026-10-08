import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

import { DownloadList } from '../downloadList';
import type { DownloadEntry } from '../downloadList.type';

const now = Date.now();
const video = (id: string, title: string) => ({ id, youtubeVideoId: id, title, channelName: 'Super Simple', duration: 135, approved: true });
const entry = (id: string, title: string, state: DownloadEntry['item']['state'] = 'ready', percent = 100, bytes = 52 * 1048576): DownloadEntry => ({
  video: video(id, title),
  item: { videoId: id, state, expiresAt: now + 7 * 86_400_000, bytes, percent },
});

describe('DownloadList', () => {
  it('counts the videos and shows title, channel, length and size for each', () => {
    const { getByText, getAllByText } = render(<DownloadList entries={[entry('a', 'Baby Shark'), entry('b', 'ABC Song')]} />);
    expect(getByText('2 downloaded videos')).toBeTruthy();
    expect(getByText('Baby Shark')).toBeTruthy();
    expect(getAllByText('52 MB · Expires in 7 days')).toHaveLength(2);
    expect(getAllByText('2:15')).toHaveLength(2);
    expect(getAllByText('Super Simple')).toHaveLength(2);
  });

  it('uses the singular for one video', () => {
    expect(render(<DownloadList entries={[entry('a', 'Baby Shark')]} />).getByText('1 downloaded video')).toBeTruthy();
  });

  it('shows a progress ring with the percent while saving, and a check once saved', () => {
    const { getByLabelText, queryByLabelText } = render(<DownloadList entries={[entry('a', 'Saving one', 'downloading', 42), entry('b', 'Done one')]} />);
    expect(getByLabelText('Saving 42 percent')).toBeTruthy();
    expect(getByLabelText('Saved')).toBeTruthy();
    expect(queryByLabelText('Getting ready')).toBeNull();
  });

  it('gives children no menu, and lets them play a finished video', () => {
    const onPlay = jest.fn();
    const { queryByLabelText, getByLabelText } = render(<DownloadList entries={[entry('a', 'Baby Shark')]} onPlay={onPlay} />);
    expect(queryByLabelText('More options for Baby Shark')).toBeNull();
    fireEvent.press(getByLabelText('Play Baby Shark'));
    expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ youtubeVideoId: 'a' }));
  });

  it('does not let a video that is still saving be played', () => {
    const { queryByLabelText } = render(<DownloadList entries={[entry('a', 'Still saving', 'downloading', 10)]} onPlay={jest.fn()} />);
    expect(queryByLabelText('Play Still saving')).toBeNull();
  });

  it('gives parents a "…" menu whose delete asks for the right video', () => {
    const onDelete = jest.fn();
    const { getByLabelText } = render(<DownloadList entries={[entry('a', 'Baby Shark'), entry('b', 'ABC Song')]} onDelete={onDelete} />);
    fireEvent.press(getByLabelText('More options for ABC Song'));
    fireEvent.press(getByLabelText('Delete download'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ item: expect.objectContaining({ videoId: 'b' }) }));
  });

  it('words the menu as cancel while a video is still saving', () => {
    const { getByLabelText } = render(<DownloadList entries={[entry('a', 'Saving one', 'downloading', 30)]} onDelete={jest.fn()} />);
    fireEvent.press(getByLabelText('More options for Saving one'));
    expect(getByLabelText('Cancel download')).toBeTruthy();
  });

  it('sorts from the Sort sheet', () => {
    const { getByLabelText, getAllByText } = render(
      <DownloadList entries={[entry('a', 'Zebra song', 'ready', 100, 10), entry('b', 'Apple song', 'ready', 100, 5)]} />,
    );
    const order = () => getAllByText(/song$/).map((node) => node.props.children);
    fireEvent.press(getByLabelText('Sort downloads'));
    fireEvent.press(getByLabelText('Name A–Z'));
    expect(order()).toEqual(['Apple song', 'Zebra song']);
    fireEvent.press(getByLabelText('Sort downloads'));
    fireEvent.press(getByLabelText('Largest first'));
    expect(order()).toEqual(['Zebra song', 'Apple song']);
  });

  it('hides the header for a per-child list', () => {
    expect(render(<DownloadList entries={[entry('a', 'Baby Shark')]} showHeader={false} />).queryByText('1 downloaded video')).toBeNull();
  });

  it('marks a video that has left the library', () => {
    const { getByText } = render(<DownloadList entries={[{ item: entry('a', 'x').item }]} />);
    expect(getByText('Removed from library')).toBeTruthy();
  });
});
