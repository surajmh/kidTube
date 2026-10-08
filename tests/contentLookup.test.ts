import assert from 'node:assert/strict';
import { compactCount, formatLength, isExactChannelReference } from '../src/services/contentLookupService.helper';

describe('isExactChannelReference', () => {
  it('treats links, handles and ids as exact', () => {
    for (const input of ['https://youtube.com/@blippi', 'youtube.com/@blippi', 'www.youtube.com/channel/UCaaaaaaaaaaaaaaaaaaaaaa', '@Cocomelon', 'UCaaaaaaaaaaaaaaaaaaaaaa']) {
      assert.equal(isExactChannelReference(input), true, input);
    }
  });

  it('treats names, even single words, as something to search for', () => {
    for (const input of ['Super Simple Songs', 'cocomelon', 'blippi', '']) {
      assert.equal(isExactChannelReference(input), false, input);
    }
  });
});

describe('compactCount', () => {
  it('shortens big numbers and hides unknown ones', () => {
    assert.equal(compactCount(1_234_567), '1.2M');
    assert.equal(compactCount(20_000_000), '20M');
    assert.equal(compactCount(1_200), '1.2K');
    assert.equal(compactCount(850), '850');
    assert.equal(compactCount(undefined), null);
    assert.equal(compactCount(-1), null);
  });
});

describe('formatLength', () => {
  it('formats m:ss and h:mm:ss', () => {
    assert.equal(formatLength(125), '2:05');
    assert.equal(formatLength(3725), '1:02:05');
    assert.equal(formatLength(0), null);
    assert.equal(formatLength(undefined), null);
  });
});
