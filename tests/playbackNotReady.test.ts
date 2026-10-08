import assert from 'node:assert/strict';
import { PlaybackPolicyService, describePlaybackDecision } from '../src/services/playbackPolicyService';

describe('playback before the library has loaded', () => {
  it('blocks with a neutral reason, not a screen-time message', () => {
    const decision = new PlaybackPolicyService().canPlay({ profileId: 'kid', videoId: 'aaaaaaaaaaa' });
    assert.deepEqual(decision, { allowed: false, reason: 'NOT_READY' });
    assert.doesNotMatch(describePlaybackDecision(decision), /screen time/i);
  });
});
