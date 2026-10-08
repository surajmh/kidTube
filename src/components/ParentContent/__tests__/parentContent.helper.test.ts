import assert from 'node:assert/strict';
import { ApprovedChannel, ApprovedVideo } from '../../../types';
import type { ContentApproval, ContentCandidate } from '../../../types';
import { fallbackCategoryId } from '../../../constants/parentalControls.constant';
import { ParentFilters } from '../../ParentFilter/parentFilter.type';
import { emptyParentFilters } from '../../ParentFilter/parentFilter.constant';
import {
  applyResultTitle,
  approveLabelFor,
  candidateKey,
  filterChannels,
  filterVideos,
} from '../parentContent.helper';

const channelA = 'UCaaaaaaaaaaaaaaaaaaaaaa';
const allow = () => true;
const deny = () => false;

function video(overrides: Partial<ApprovedVideo> = {}): ApprovedVideo {
  return { id: 'v1', youtubeVideoId: 'vid00000001', title: 'Counting song', approved: true, ...overrides };
}

function channel(overrides: Partial<ApprovedChannel> = {}): ApprovedChannel {
  return { id: 'c1', name: 'Numberblocks', channelId: channelA, approved: true, ...overrides };
}

function filters(overrides: Partial<ParentFilters> = {}): ParentFilters {
  return { ...emptyParentFilters, ...overrides };
}

describe('filterVideos', () => {
  const videos = [
    video({ id: 'v1', title: 'Counting song', categoryIds: ['music'] }),
    video({ id: 'v2', title: 'Alphabet time', channelName: 'Counting Club' }),
  ];

  it('returns everything when nothing is applied', () => {
    assert.equal(filterVideos(videos, filters(), allow).length, 2);
  });

  it('matches title or channel name, ignoring case and surrounding space', () => {
    assert.equal(filterVideos(videos, filters({ query: '  COUNTING ' }), allow).length, 2);
    assert.deepEqual(filterVideos(videos, filters({ query: 'alphabet' }), allow).map((v) => v.id), ['v2']);
  });

  it('narrows by category', () => {
    assert.deepEqual(filterVideos(videos, filters({ categoryId: 'music' }), allow).map((v) => v.id), ['v1']);
  });

  it('treats an uncategorised video as the fallback category', () => {
    // Otherwise blocking the fallback category would not be a real restriction.
    const found = filterVideos(videos, filters({ categoryId: fallbackCategoryId }), allow);
    assert.deepEqual(found.map((v) => v.id), ['v2']);
  });

  it('defers to the access service for a child filter and never widens it', () => {
    assert.equal(filterVideos(videos, filters({ childId: 'kid' }), deny).length, 0);
    assert.equal(filterVideos(videos, filters({ childId: 'kid' }), allow).length, 2);
  });

  it('applies every active filter together', () => {
    const found = filterVideos(videos, filters({ query: 'counting', categoryId: 'music' }), allow);
    assert.deepEqual(found.map((v) => v.id), ['v1']);
  });
});

describe('filterChannels', () => {
  const channels = [channel({ id: 'c1', name: 'Numberblocks' }), channel({ id: 'c2', name: 'Alphablocks', channelId: 'UCbbbbbbbbbbbbbbbbbbbbbb' })];

  it('matches a channel by name', () => {
    assert.deepEqual(filterChannels(channels, filters({ query: 'number' }), allow).map((c) => c.id), ['c1']);
  });

  it('also matches by channel id, so a pasted id finds its channel', () => {
    assert.deepEqual(filterChannels(channels, filters({ query: channelA }), allow).map((c) => c.id), ['c1']);
  });

  it('defers to the access service for a child filter', () => {
    assert.equal(filterChannels(channels, filters({ childId: 'kid' }), deny).length, 0);
  });
});

describe('approveLabelFor', () => {
  const permanent: ContentApproval = {
    id: 'a1',
    profileId: null,
    target: { type: 'video', youtubeVideoId: 'vid00000001' },
    duration: 'permanent',
    grantedAt: '2026-01-01T00:00:00Z',
  };
  const onceOnChannel: ContentApproval = {
    id: 'a2',
    profileId: null,
    target: { type: 'channel', youtubeChannelId: channelA },
    duration: 'once',
    grantedAt: '2026-01-01T00:00:00Z',
    remainingPlays: 1,
  };

  it('describes approvals for the matching video only', () => {
    assert.deepEqual(approveLabelFor([permanent, onceOnChannel], { videoId: 'vid00000001' }), ['Permanent']);
  });

  it('describes approvals for the matching channel only', () => {
    assert.deepEqual(approveLabelFor([permanent, onceOnChannel], { channelId: channelA }), ['1 playback left']);
  });

  it('never matches an approval when the target id is absent', () => {
    assert.deepEqual(approveLabelFor([permanent, onceOnChannel], {}), []);
  });
});

describe('candidate titles', () => {
  const candidate: ContentCandidate = {
    type: 'video',
    title: 'Video abc',
    youtubeVideoId: 'abc',
    source: 'link',
    alreadyKnown: false,
  };

  it('keys on the id when there is one', () => {
    assert.equal(candidateKey(candidate), 'abc');
  });

  it('falls back to the title when there is no id', () => {
    assert.equal(candidateKey({ ...candidate, youtubeVideoId: undefined }), 'Video abc');
  });

  it('applies an edited title without mutating the original', () => {
    const edited = applyResultTitle(candidate, { abc: '  Counting song  ' });
    assert.equal(edited.title, 'Counting song');
    assert.equal(candidate.title, 'Video abc');
  });

  it('keeps the original title when the edit is blank', () => {
    assert.equal(applyResultTitle(candidate, { abc: '   ' }).title, 'Video abc');
    assert.equal(applyResultTitle(candidate, {}).title, 'Video abc');
  });
});
