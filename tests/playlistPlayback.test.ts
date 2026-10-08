import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nextQueuedVideo, playlistService, playlistVideos, shuffleVideos } from '../src/services/playlistService';
import { parentSessionService } from '../src/services/auth/parentSession';
import { ApprovedVideo } from '../src/types';
import { accountPlayheadSample } from '../src/services/screenTimeAccounting';
import { sanitizeSettings } from '../src/services/contentValidation';
import { storageKeys } from '../src/repositories/storage';
import { contentAccessService } from '../src/services/contentAccessService';
import { whitelistService } from '../src/services/whitelistService';
import { kidContentLibraryService } from '../src/services/kidContentLibraryService';
import { defaultCategories } from '../src/parentalControlsTypes';

it('keeps curated queues ordered, restricted to the child library, and finite', async () => {
  await AsyncStorage.clear();
  const a: ApprovedVideo = { id: 'a', youtubeVideoId: 'aaaaaaaaaaa', title: 'A', approved: true };
  const b: ApprovedVideo = { id: 'b', youtubeVideoId: 'bbbbbbbbbbb', title: 'B', approved: true };
  const c: ApprovedVideo = { id: 'c', youtubeVideoId: 'ccccccccccc', title: 'C', approved: false };
  const videos = [a, b, c];
  const session = parentSessionService.grant();
  try {
    const [playlist] = await playlistService.save(session, { id: '', name: ' Learning ', videoIds: ['b', 'c', 'a', 'b'] }, [], videos);
    assert.equal(playlist.name, 'Learning');
    assert.deepEqual((await playlistService.getAll())[0].videoIds, ['b', 'c', 'a']);
    whitelistService.setContent(videos, []);
    contentAccessService.hydrate({ approvals: [], rules: {} });
    const childLibrary = kidContentLibraryService.build({ profileId: 'kid', videos, channels: [], categories: defaultCategories, history: [] });
    assert.deepEqual(playlistVideos(playlist, childLibrary.videos), [b, a]);
    assert.equal(contentAccessService.evaluate('kid', { videoId: c.youtubeVideoId }), 'not_approved');
    assert.equal(nextQueuedVideo(playlist.videoIds, 'b', childLibrary.videos), a);
    assert.equal(nextQueuedVideo(playlist.videoIds, 'a', childLibrary.videos), undefined);
    assert.equal(nextQueuedVideo(playlist.videoIds, 'missing', childLibrary.videos), undefined);
    assert.deepEqual(shuffleVideos([a, b], () => 0), [b, a]);
    assert.deepEqual(videos, [a, b, c]);
    await assert.rejects(playlistService.save(session, { ...playlist, name: ' ' }, [playlist], videos));
    await assert.rejects(playlistService.save(session, { ...playlist, videoIds: ['missing'] }, [playlist], videos));
    assert.equal((await playlistService.getAll()).length, 1);
    await playlistService.remove(session, playlist.id, [playlist]);
    assert.deepEqual(await playlistService.getAll(), []);
    parentSessionService.end();
    await assert.rejects(playlistService.save(session, playlist, [], videos), /Parent PIN required/);
    await assert.rejects(playlistService.remove(session, playlist.id, [playlist]), /Parent PIN required/);
    await AsyncStorage.setItem(storageKeys.playlists, JSON.stringify([null, { id: 'bad', name: 3 }, { id: 'ok', name: 'Valid', videoIds: ['a', null, 'a'] }]));
    assert.deepEqual(await playlistService.getAll(), [{ id: 'ok', name: 'Valid', videoIds: ['a'] }]);
  } finally {
    parentSessionService.end();
    contentAccessService.hydrate({ approvals: [], rules: {} });
    whitelistService.setContent([], []);
  }
});

it('counts actual viewing time at different speeds and rejects invalid quality settings', () => {
  for (const speed of [0.25, 0.5, 1, 1.5, 2]) {
    assert.equal(accountPlayheadSample(0, 1000 * speed, true, { playbackSpeed: speed }).seconds, 1);
    assert.equal(accountPlayheadSample(0, 6000 * speed, true, { playbackSpeed: speed }).seconds, 0);
    assert.equal(accountPlayheadSample(0, 1000, false, { playbackSpeed: speed }).seconds, 0);
  }
  assert.equal(accountPlayheadSample(0, 1000, true, { playbackSpeed: 0 }).seconds, 0);
  assert.equal(accountPlayheadSample(0, 1000, true, { playbackSpeed: NaN }).seconds, 0);
  assert.equal(sanitizeSettings({ maxQualityHeight: 720 }).maxQualityHeight, 720);
  assert.equal(sanitizeSettings({ maxQualityHeight: 4000 }).maxQualityHeight, 1080);
});
