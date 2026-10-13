import { sanitizeSettings } from '../src/services/contentValidation';
import { previewDeArrow, withDeArrow } from '../src/services/deArrowService';
import { defaultPlaybackSettings } from '../src/constants/playback.constant';

const video = { id: 'v', youtubeVideoId: 'aaaaaaaaaaa', title: 'Original', thumbnailUrl: 'https://original', approved: false };
afterEach(() => jest.restoreAllMocks());
it('previews valid community replacements without changing approval or original metadata', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({
    titles: [{ title: 'Bad', original: false, votes: -1 }, { title: 'Original', original: true, votes: 5 }, { title: 'Clear title', original: false, votes: 2, locked: true }],
    thumbnails: [{ original: false, timestamp: -1, votes: 3 }, { original: false, timestamp: 42, votes: 0 }],
  }) } as Response);
  const replacement = await previewDeArrow(video.youtubeVideoId);
  expect(replacement).toEqual({ title: 'Clear title', thumbnailUrl: 'https://dearrow-thumb.ajay.app/api/v1/getThumbnail?videoID=aaaaaaaaaaa&time=42' });
  expect(withDeArrow(video, defaultPlaybackSettings)).toBe(video);
  const settings = { ...defaultPlaybackSettings, deArrowEnabled: true, deArrowReplacements: { [video.youtubeVideoId]: replacement! } };
  expect(withDeArrow(video, settings)).toMatchObject({ title: 'Clear title', approved: false, id: 'v' });
  expect(video.title).toBe('Original');
  expect(withDeArrow({ ...video, youtubeVideoId: 'bbbbbbbbbbb' }, settings).title).toBe('Original');
});
it('rejects invalid ids, handles missing suggestions and HTTP failures', async () => {
  const fetcher = jest.spyOn(global, 'fetch');
  await expect(previewDeArrow('invalid')).rejects.toThrow('Invalid');
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockResolvedValueOnce({ status: 404 } as Response);
  expect(await previewDeArrow(video.youtubeVideoId)).toBeNull();
  fetcher.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
  await expect(previewDeArrow(video.youtubeVideoId)).rejects.toThrow('Could not load');
  fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({ titles: null, thumbnails: [null] }) } as Response);
  expect(await previewDeArrow(video.youtubeVideoId)).toBeNull();
});

it('keeps background audio opt-in and sanitizes saved replacements at the settings boundary', () => {
  const malformed = { backgroundAudioEnabled: 'false', deArrowEnabled: 1, deArrowReplacements: {
    aaaaaaaaaaa: { title: 'Reviewed', thumbnailUrl: 'http://untrusted.example/image' },
    invalid: { title: 'Ignored' },
  } } as unknown as Parameters<typeof sanitizeSettings>[0];
  expect(sanitizeSettings(malformed)).toMatchObject({ backgroundAudioEnabled: false, deArrowEnabled: false,
    deArrowReplacements: { aaaaaaaaaaa: { title: 'Reviewed', thumbnailUrl: undefined } } });
  expect(sanitizeSettings({ backgroundAudioEnabled: true }).backgroundAudioEnabled).toBe(true);
});
