import assert from 'node:assert/strict';
import { contentAccessService } from '../src/services/contentAccessService';
import { whitelistService } from '../src/services/whitelistService';
import { kidContentLibraryService } from '../src/services/kidContentLibraryService';
import { defaultCategories } from '../src/parentalControlsTypes';
import { ApprovedChannel, ApprovedVideo } from '../src/types';
import { approvedVideo, channelA, channelB, syncedVideo, videoIds } from './helpers/fakeProvider';

/**
 * The security model must not move.
 *
 * Channel discovery adds rows to the library, but eligibility still comes from
 * the approved channel and the individual-video whitelist, and screens still ask
 * `ContentAccessService` rather than deciding for themselves.
 */

const profileId = 'kid-1';

function approvedChannel(channelId: string, overrides: Partial<ApprovedChannel> = {}): ApprovedChannel {
  return { id: `c-${channelId}`, name: 'Story Time', channelId, approved: true, ...overrides };
}

function hydrate(videos: ApprovedVideo[], channels: ApprovedChannel[]) {
  whitelistService.setContent(videos, channels);
  contentAccessService.hydrate({ approvals: [], rules: {} });
}

describe('an approved channel makes its videos eligible (§8)', () => {
  it('allows a fetched video from an approved channel without individual approval', () => {
    hydrate([syncedVideo(videoIds[0], channelA)], [approvedChannel(channelA)]);
    assert.equal(
      contentAccessService.evaluate(profileId, { videoId: videoIds[0], channelId: channelA }),
      'allowed',
    );
  });

  it('allows a video that has never been seen before, because its channel is approved', () => {
    // The essence of channel approval: the child can open a fresh upload straight away.
    hydrate([], [approvedChannel(channelA)]);
    assert.equal(
      contentAccessService.evaluate(profileId, { videoId: videoIds[3], channelId: channelA }),
      'allowed',
    );
  });

  it('blocks a video whose channel is not approved', () => {
    hydrate([syncedVideo(videoIds[0], channelB)], [approvedChannel(channelA)]);
    assert.equal(
      contentAccessService.evaluate(profileId, { videoId: videoIds[0], channelId: channelB }),
      'not_approved',
    );
  });

  it('blocks every video of a channel the parent removed', () => {
    hydrate([syncedVideo(videoIds[0], channelA)], []);
    assert.equal(
      contentAccessService.evaluate(profileId, { videoId: videoIds[0], channelId: channelA }),
      'not_approved',
    );
  });

  it('blocks a channel that is stored but not approved', () => {
    hydrate([], [approvedChannel(channelA, { approved: false })]);
    assert.equal(
      contentAccessService.evaluate(profileId, { videoId: videoIds[0], channelId: channelA }),
      'not_approved',
    );
  });
});

describe('individual video approval still works (§16)', () => {
  it('allows an individually approved video from an unapproved channel', () => {
    hydrate([approvedVideo(videoIds[0], channelB)], []);
    assert.equal(
      contentAccessService.evaluate(profileId, { videoId: videoIds[0], channelId: channelB }),
      'allowed',
    );
  });

  it('allows both an approved channel and an approved individual video at once', () => {
    hydrate([approvedVideo(videoIds[1], channelB), syncedVideo(videoIds[0], channelA)], [approvedChannel(channelA)]);
    assert.equal(
      contentAccessService.evaluate(profileId, { videoId: videoIds[0], channelId: channelA }),
      'allowed',
    );
    assert.equal(
      contentAccessService.evaluate(profileId, { videoId: videoIds[1], channelId: channelB }),
      'allowed',
    );
    assert.equal(
      contentAccessService.evaluate(profileId, { videoId: videoIds[4], channelId: channelB }),
      'not_approved',
    );
  });
});

describe('per-child restrictions still win', () => {
  it('honours an explicit block on a video from an approved channel', () => {
    hydrate([syncedVideo(videoIds[0], channelA)], [approvedChannel(channelA)]);
    contentAccessService.setRules({
      [profileId]: {
        profileId,
        inheritGlobalApprovals: true,
        blockedCategoryIds: [],
        grantedVideoIds: [],
        grantedChannelIds: [],
        blockedVideoIds: [videoIds[0]],
        blockedChannelIds: [],
      },
    });
    assert.equal(
      contentAccessService.evaluate(profileId, { videoId: videoIds[0], channelId: channelA }),
      'child_blocked',
    );
    // A sibling video from the same channel is unaffected.
    assert.equal(
      contentAccessService.evaluate(profileId, { videoId: videoIds[1], channelId: channelA }),
      'allowed',
    );
  });

  it('honours a disabled category on a fetched video', () => {
    hydrate(
      [{ ...syncedVideo(videoIds[0], channelA), categoryIds: ['other'] }],
      [approvedChannel(channelA)],
    );
    contentAccessService.setRules({
      [profileId]: {
        profileId,
        inheritGlobalApprovals: true,
        blockedCategoryIds: ['other'],
        grantedVideoIds: [],
        grantedChannelIds: [],
        blockedVideoIds: [],
        blockedChannelIds: [],
      },
    });
    assert.equal(
      contentAccessService.evaluate(profileId, { videoId: videoIds[0], channelId: channelA }),
      'category_blocked',
    );
  });
});

describe('Kid Mode never receives what the policy would refuse', () => {
  it('shows only the approved channel’s videos in the child library', () => {
    const videos = [
      syncedVideo(videoIds[0], channelA),
      syncedVideo(videoIds[1], channelB),
      approvedVideo(videoIds[2], channelB),
    ];
    const channels = [approvedChannel(channelA)];
    hydrate(videos, channels);

    const library = kidContentLibraryService.build({
      profileId,
      videos,
      channels,
      categories: defaultCategories,
    });

    assert.deepEqual(library.videos.map((item) => item.youtubeVideoId).sort(), [videoIds[0], videoIds[2]].sort());
    assert.deepEqual(library.channels.map((item) => item.channelId), [channelA]);
    // The blocked ones are only offered as "ask a parent" items, never as playable.
    assert.ok(library.askableVideos.some((item) => item.youtubeVideoId === videoIds[1]));
  });

  it('agrees with the policy for every row it returns', () => {
    const videos = [syncedVideo(videoIds[0], channelA), syncedVideo(videoIds[1], channelB)];
    hydrate(videos, [approvedChannel(channelA)]);

    const library = kidContentLibraryService.build({
      profileId,
      videos,
      channels: [approvedChannel(channelA)],
      categories: defaultCategories,
    });

    for (const item of library.videos) {
      assert.equal(
        contentAccessService.evaluate(profileId, { videoId: item.youtubeVideoId, channelId: item.channelId }),
        'allowed',
      );
    }
  });
});
