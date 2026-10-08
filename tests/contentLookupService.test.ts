import assert from 'node:assert/strict';

const mockNative = {
  searchChannels: jest.fn(),
  searchVideos: jest.fn(),
  getVideoMetadata: jest.fn(),
};
jest.mock('../src/native/YouTubePlayerModule', () => ({
  __esModule: true,
  default: {
    searchChannels: (q: string) => mockNative.searchChannels(q),
    searchVideos: (q: string) => mockNative.searchVideos(q),
    getVideoMetadata: (id: string) => mockNative.getVideoMetadata(id),
  },
}));

import { contentLookupService } from '../src/services/contentLookupService';
import { parentSessionService } from '../src/services/auth/parentSession';

const channelId = 'UCaaaaaaaaaaaaaaaaaaaaaa';

describe('contentLookupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    parentSessionService.grant();
  });
  afterEach(() => parentSessionService.end());

  it('refuses without a parent session', async () => {
    parentSessionService.end();
    await assert.rejects(contentLookupService.findVideos('anything'), /Parent PIN required/);
  });

  it('searches channels by name and keeps only well-formed matches', async () => {
    mockNative.searchChannels.mockResolvedValue({
      results: [
        { youtubeChannelId: channelId, name: 'Blippi', subscriberCount: 5, verified: true },
        { youtubeChannelId: 'not-an-id', name: 'Impostor' },
        { youtubeChannelId: 'UCbbbbbbbbbbbbbbbbbbbbbb' },
      ],
    });
    const matches = await contentLookupService.findChannels(parentSessionService.current()!, 'blippi');
    expect(matches).toEqual([expect.objectContaining({ youtubeChannelId: channelId, name: 'Blippi', verified: true })]);
  });

  it('says so when nothing matches a channel name', async () => {
    mockNative.searchChannels.mockResolvedValue({ results: [] });
    await assert.rejects(contentLookupService.findChannels(parentSessionService.current()!, 'zzzz'), /No channel found/);
  });

  it('turns a native failure into a readable error', async () => {
    mockNative.searchVideos.mockResolvedValue({ failed: true, message: 'Could not reach YouTube.' });
    await assert.rejects(contentLookupService.findVideos('baby songs'), /Could not reach YouTube/);
  });

  it('reads the video straight from a pasted link instead of searching', async () => {
    mockNative.getVideoMetadata.mockResolvedValue({ title: 'Morning song', channelName: 'Songs', durationSeconds: 90 });
    const matches = await contentLookupService.findVideos('https://youtu.be/aaaaaaaaaaa');
    expect(mockNative.searchVideos).not.toHaveBeenCalled();
    expect(matches).toEqual([expect.objectContaining({ youtubeVideoId: 'aaaaaaaaaaa', title: 'Morning song', durationSeconds: 90 })]);
  });

  it('searches videos by title', async () => {
    mockNative.searchVideos.mockResolvedValue({ results: [{ youtubeVideoId: 'aaaaaaaaaaa', title: 'Morning song' }, { title: 'no id' }] });
    const matches = await contentLookupService.findVideos('morning song');
    expect(matches.map((match) => match.youtubeVideoId)).toEqual(['aaaaaaaaaaa']);
  });
});
