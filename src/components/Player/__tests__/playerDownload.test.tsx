import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { PlayerDownload } from '../playerDownload';
import { PlayerScreen } from '../player';
import { defaultPlaybackSettings } from '../../../constants/playback.constant';
import type { ChildDownloads } from '../../../hooks/useChildDownloads.type';
import type { SavedVideo } from '../../../services/downloadService.type';
import type { ApprovedVideo } from '../../../types';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../../../native', () => ({ isNativeYouTubePlayerAvailable: true, YouTubePlayer: jest.fn(() => null) }));
jest.mock('../player.hook', () => ({ usePlayer: () => ({ isAllowed: true, nativeHandlers: {}, progress: 0, durationMs: 0 }) }));
jest.mock('../playerOptions.hook', () => ({ usePlayerOptions: () => ({ speed: 1, setSpeed: jest.fn(), quality: 0, setQuality: jest.fn(), captionTrack: null, setCaptionTrack: jest.fn(), captionScale: 1, setCaptionScale: jest.fn(), tracks: { captions: [], heights: [] }, setTracks: jest.fn(), optionsOpen: false, setOptionsOpen: jest.fn() }) }));

const video = { id: 'v1', youtubeVideoId: 'yt1', title: 'A video', approved: true } as ApprovedVideo;
const saved = (state: SavedVideo['state'], percent = 0): SavedVideo => ({ videoId: 'yt1', state, expiresAt: 0, bytes: 0, percent });

function make(overrides: Partial<ChildDownloads> = {}): ChildDownloads {
  return { enabled: true, mine: [], itemFor: () => undefined, options: jest.fn(async () => [360]), start: jest.fn(async () => {}), ...overrides };
}

describe('PlayerDownload', () => {
  it('shows Download when nothing is saved', () => {
    const { getByLabelText } = render(<PlayerDownload video={video} downloads={make()} />);
    expect(getByLabelText('Download')).toBeTruthy();
  });

  it('offers a quality popup for several options and starts the chosen one', async () => {
    const downloads = make({ options: jest.fn(async () => [360, 1080, 720]) });
    const { getByLabelText, findByText, queryByText } = render(<PlayerDownload video={video} downloads={downloads} />);
    expect(queryByText('Choose quality')).toBeNull();
    await act(async () => { fireEvent.press(getByLabelText('Download')); });
    expect(await findByText('Choose quality')).toBeTruthy();
    expect(await findByText('1080p · Best')).toBeTruthy();
    await act(async () => { fireEvent.press(getByLabelText('Choose 720p')); });
    expect(downloads.start).toHaveBeenCalledWith(video, 720);
    expect(queryByText('Choose quality')).toBeNull();
  });

  it('starts immediately when there is a single option', async () => {
    const downloads = make();
    const { getByLabelText, queryByText } = render(<PlayerDownload video={video} downloads={downloads} />);
    await act(async () => { fireEvent.press(getByLabelText('Download')); });
    expect(downloads.start).toHaveBeenCalledWith(video, 360);
    expect(queryByText('Choose quality')).toBeNull();
  });

  it('shows progress and is not pressable while downloading', () => {
    const downloads = make({ itemFor: () => saved('downloading', 41.6) });
    const { getByText, queryByLabelText } = render(<PlayerDownload video={video} downloads={downloads} />);
    expect(getByText('Downloading… 42%')).toBeTruthy();
    expect(queryByLabelText('Download')).toBeNull();
  });

  it('shows Getting ready for preparing', () => {
    const { getByText } = render(<PlayerDownload video={video} downloads={make({ itemFor: () => saved('preparing') })} />);
    expect(getByText('Getting ready…')).toBeTruthy();
  });

  it('shows Downloaded when ready', () => {
    const { getByText } = render(<PlayerDownload video={video} downloads={make({ itemFor: () => saved('ready') })} />);
    expect(getByText('Downloaded')).toBeTruthy();
  });

  it('offers Try again after a failure state', () => {
    const { getByLabelText } = render(<PlayerDownload video={video} downloads={make({ itemFor: () => saved('failed') })} />);
    expect(getByLabelText('Try again')).toBeTruthy();
  });

  it.each([
    ['no options', jest.fn(async () => [])],
    ['an error', jest.fn(async () => { throw new Error('boom 500'); })],
  ])('shows a gentle message for %s', async (_name, options) => {
    const downloads = make({ options });
    const { getByLabelText, findByText, queryByText } = render(<PlayerDownload video={video} downloads={downloads} />);
    await act(async () => { fireEvent.press(getByLabelText('Download')); });
    expect(await findByText("Can't download this video right now.")).toBeTruthy();
    expect(queryByText(/boom/)).toBeNull();
    expect(downloads.start).not.toHaveBeenCalled();
  });

  it('ignores a second tap while options are loading', async () => {
    let release: (value: number[]) => void = () => {};
    const options = jest.fn(() => new Promise<number[]>((resolve) => { release = resolve; }));
    const downloads = make({ options });
    const { getByLabelText } = render(<PlayerDownload video={video} downloads={downloads} />);
    await act(async () => { fireEvent.press(getByLabelText('Download')); fireEvent.press(getByLabelText('Download')); });
    expect(options).toHaveBeenCalledTimes(1);
    await act(async () => { release([360]); });
  });
});

describe('PlayerScreen download slot', () => {
  const props = { video, settings: defaultPlaybackSettings, onNextVideo: jest.fn(), onUsageChange: jest.fn(), onBack: jest.fn(), onSaveHistory: jest.fn(), onPlaybackCompleted: jest.fn() };

  it('renders nothing extra when downloads are undefined or disabled', () => {
    expect(render(<PlayerScreen {...props} />).queryByLabelText('Download')).toBeNull();
    expect(render(<PlayerScreen {...props} downloads={make({ enabled: false })} />).queryByLabelText('Download')).toBeNull();
  });

  it('renders the control when enabled', () => {
    expect(render(<PlayerScreen {...props} downloads={make()} />).getByLabelText('Download')).toBeTruthy();
  });
});
