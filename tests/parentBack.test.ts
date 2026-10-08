import assert from 'node:assert/strict';
import { parentBackAction } from '../src/hooks/useKidNavigation.helper';

describe('parentBackAction', () => {
  it('closes an open channel page first', () => {
    assert.equal(parentBackAction(true, 'home'), 'close-channel');
    assert.equal(parentBackAction(true, 'children'), 'close-channel');
  });

  it('returns from a sub-menu to parent home', () => {
    for (const section of ['children', 'activity', 'requests', 'settings', 'playlists', 'downloads', 'security']) {
      assert.equal(parentBackAction(false, section), 'go-home');
    }
  });

  it('leaves Parent Mode only from the top level', () => {
    assert.equal(parentBackAction(false, 'home'), 'leave');
  });
});
