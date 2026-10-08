import assert from 'node:assert/strict';
import type { ApprovedVideo } from '../src/types';

const mockGetVideoMetadata = jest.fn();
jest.mock('../src/native/YouTubePlayerModule', () => ({ __esModule: true, default: { getVideoMetadata: (id: string) => mockGetVideoMetadata(id) } }));

import { enrichLibrary } from '../src/services/content/nativeVideoMetadata';

const video = (n: number) => ({ id: `v${n}`, youtubeVideoId: `yt${n}`, title: 't', approved: true }) as ApprovedVideo;

describe('enrichLibrary retry cooldown', () => {
  it('does not ask again for a video nothing could be learned about, and does not let it starve others', async () => {
    mockGetVideoMetadata.mockImplementation(async (videoId: string) =>
      videoId === 'yt1' ? { failed: true } : { title: 'Real', channelName: 'Chan', durationSeconds: 60 },
    );
    const library = [video(1), video(2)];

    const first = await enrichLibrary(library, 1, 1);
    assert.equal(first, null); // limit 1 picked only the unresolvable video
    expect(mockGetVideoMetadata.mock.calls.map(([id]) => id)).toEqual(['yt1']);

    const second = await enrichLibrary(library, 1, 1);
    expect(mockGetVideoMetadata.mock.calls.map(([id]) => id)).toEqual(['yt1', 'yt2']); // yt1 is cooling down
    assert.equal(second?.[1].title, 'Real');
  });
});
