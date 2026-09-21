import assert from 'node:assert/strict';
import { YouTubeProviderError, classifyProviderError } from '../src/services/content/youtubeContentProvider';
import { nativeYouTubeContentProvider } from '../src/services/content/nativeYouTubeContentProvider';
import { channelA } from './helpers/fakeProvider';

/**
 * The metadata boundary after the HTTP proxy was removed.
 *
 * There is no endpoint, key or quota to configure any more: metadata comes from the on-device
 * extractor. What still has to hold is that a build without it refuses loudly rather than quietly
 * behaving as though nothing is approved, and that provider failures never leak technical detail.
 */
describe('metadata provider boundary', () => {
  it('is the on-device extractor', () => {
    assert.equal(nativeYouTubeContentProvider.id, 'native-extractor');
  });

  it('fails closed when the native module is absent', async () => {
    // Nothing injects the module here, which is the case for a JS-only build.
    await assert.rejects(() => nativeYouTubeContentProvider.getChannelVideos(channelA), (error: unknown) => {
      assert.equal((error as YouTubeProviderError).code, 'NOT_CONFIGURED');
      return true;
    });
    await assert.rejects(() => nativeYouTubeContentProvider.getChannel(channelA), (error: unknown) => {
      assert.equal((error as YouTubeProviderError).code, 'NOT_CONFIGURED');
      return true;
    });
    await assert.rejects(() => nativeYouTubeContentProvider.resolveChannelId('@someone'), (error: unknown) => {
      assert.equal((error as YouTubeProviderError).code, 'NOT_CONFIGURED');
      return true;
    });
  });

  it('classifies a raw Error without leaking its message', () => {
    const classified = classifyProviderError(new Error('ECONNREFUSED at 10.0.0.1'));
    assert.equal(classified.code, 'UNKNOWN');
    assert.equal(classified.message.includes('ECONNREFUSED'), false);
  });
});
