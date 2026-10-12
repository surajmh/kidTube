import { ChannelSyncService } from '../src/services/channelSyncService';
import { nativeYouTubeContentProvider } from '../src/services/content/nativeYouTubeContentProvider';
import { contentAccessService } from '../src/services/contentAccessService';
import { whitelistService } from '../src/services/whitelistService';
import { parentSessionService } from '../src/services/auth/parentSession';
import { channelSyncRepository } from '../src/repositories/channelSyncRepository';
import { defaultChildContentRules } from '../src/utils/parentalControls.helper';
import { channel, channelA, channelB, video, videoIds } from './helpers/fakeProvider';

const approved = { id: 'channel', channelId: channelA, name: 'Story Time', approved: true };

describe('browsing an already permitted channel', () => {
  let service: ChannelSyncService;
  beforeEach(() => {
    parentSessionService.end();
    whitelistService.setContent([], [approved]);
    contentAccessService.hydrate({});
    service = new ChannelSyncService();
    jest.spyOn(channelSyncRepository, 'saveAll').mockResolvedValue(undefined);
    jest.spyOn(nativeYouTubeContentProvider, 'getChannel').mockResolvedValue(channel());
    jest.spyOn(nativeYouTubeContentProvider, 'getChannelVideos').mockResolvedValue({ channelId: channelA, videos: [video(0)], nextPageToken: 'older' });
  });
  afterEach(() => jest.restoreAllMocks());

  it('fetches uploads without a parent PIN and inherits channel approval', async () => {
    const first = await service.browse('kid', { channelId: channelA, videos: [] });
    expect(first.videos[0]).toMatchObject({ youtubeVideoId: videoIds[0], approved: false, syncedFromChannel: true });
    expect(contentAccessService.evaluate('kid', { videoId: videoIds[0], channelId: channelA })).toBe('allowed');
    expect(first.uploads).toHaveLength(1);
    const cached = await service.browse('kid', { channelId: channelA, videos: first.videos });
    expect(cached.fetched).toBe(false);
    expect(nativeYouTubeContentProvider.getChannelVideos).toHaveBeenCalledTimes(1);

    jest.mocked(nativeYouTubeContentProvider.getChannelVideos).mockResolvedValue({ channelId: channelA, videos: [video(1)] });
    const next = await service.browse('kid', { channelId: channelA, videos: first.videos, mode: 'more' });
    expect(nativeYouTubeContentProvider.getChannelVideos).toHaveBeenLastCalledWith(channelA, { pageToken: 'older' });
    expect(next.videos).toHaveLength(2);
    expect(next.state.nextPageToken).toBeUndefined();
    await service.browse('kid', { channelId: channelA, videos: next.videos, mode: 'more' });
    expect(nativeYouTubeContentProvider.getChannelVideos).toHaveBeenCalledTimes(2);
  });

  it('refuses unapproved, blocked, and category-blocked channels before making a request', async () => {
    await expect(service.browse('kid', { channelId: channelB, videos: [] })).rejects.toThrow('not available');
    contentAccessService.setRules({ kid: { ...defaultChildContentRules('kid'), blockedChannelIds: [channelA] } });
    await expect(service.browse('kid', { channelId: channelA, videos: [] })).rejects.toThrow('not available');
    whitelistService.setContent([], [{ ...approved, categoryIds: ['music'] }]);
    contentAccessService.setRules({ kid: { ...defaultChildContentRules('kid'), blockedCategoryIds: ['music'] } });
    await expect(service.browse('kid', { channelId: channelA, videos: [] })).rejects.toThrow('not available');
    expect(nativeYouTubeContentProvider.getChannelVideos).not.toHaveBeenCalled();
  });

  it('discards a pending page if the channel is revoked', async () => {
    jest.mocked(nativeYouTubeContentProvider.getChannelVideos).mockImplementation(async () => {
      whitelistService.setContent([], []);
      return { channelId: channelA, videos: [video(0)] };
    });
    await expect(service.browse('kid', { channelId: channelA, videos: [] })).rejects.toThrow('not available');
    expect(channelSyncRepository.saveAll).not.toHaveBeenCalled();
  });

  it('rejects another channel’s page and backs off automatic scroll retries', async () => {
    jest.mocked(nativeYouTubeContentProvider.getChannelVideos).mockResolvedValue({ channelId: channelB, videos: [video(0, channelB)] });
    const result = await service.browse('kid', { channelId: channelA, videos: [] });
    expect(result.error?.code).toBe('MALFORMED_RESPONSE');
    expect(result.videos).toEqual([]);
    await service.browse('kid', { channelId: channelA, videos: [], mode: 'more' });
    expect(nativeYouTubeContentProvider.getChannelVideos).toHaveBeenCalledTimes(1);
  });

  it('keeps approval-changing operations protected by Parent Mode', async () => {
    await expect(service.sync({} as never, { channel: approved, videos: [] })).rejects.toThrow('Parent PIN');
    await expect(service.removeChannelContent({} as never, channelA, { channels: [approved], videos: [] })).rejects.toThrow('Parent PIN');
  });
});
