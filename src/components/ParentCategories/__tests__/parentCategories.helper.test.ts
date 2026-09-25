import assert from 'node:assert/strict';
import { ApprovedChannel, ApprovedVideo } from '../../../types';
import { fallbackCategoryId } from '../../../parentalControlsTypes';
import { categoryCounts } from '../parentCategories.helper';

const videos = [
  { id: 'v1', youtubeVideoId: 'a', title: 'A', approved: true, categoryIds: ['music'] },
  { id: 'v2', youtubeVideoId: 'b', title: 'B', approved: true, categoryIds: ['music', 'stories'] },
  { id: 'v3', youtubeVideoId: 'c', title: 'C', approved: true },
] as ApprovedVideo[];

const channels = [
  { id: 'c1', name: 'One', channelId: 'UC1', approved: true, categoryIds: ['music'] },
  { id: 'c2', name: 'Two', channelId: 'UC2', approved: true },
] as ApprovedChannel[];

describe('categoryCounts', () => {
  it('counts videos and channels in a category', () => {
    assert.deepEqual(categoryCounts('music', videos, channels), { videos: 2, channels: 1 });
  });

  it('counts content that belongs to several categories in each of them', () => {
    assert.equal(categoryCounts('stories', videos, channels).videos, 1);
  });

  it('counts uncategorised content toward the fallback category', () => {
    // The count is what tells a parent whether blocking a category restricts anything, so
    // uncategorised content must not simply vanish from the totals.
    assert.deepEqual(categoryCounts(fallbackCategoryId, videos, channels), { videos: 1, channels: 1 });
  });

  it('is zero for a category nothing uses', () => {
    assert.deepEqual(categoryCounts('animals', videos, channels), { videos: 0, channels: 0 });
  });

  it('handles empty libraries', () => {
    assert.deepEqual(categoryCounts('music', [], []), { videos: 0, channels: 0 });
  });
});
