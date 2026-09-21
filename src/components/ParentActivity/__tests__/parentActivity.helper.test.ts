import assert from 'node:assert/strict';
import { barWidthPercent } from '../parentActivity.helper';

describe('barWidthPercent', () => {
  it('scales a value against the largest one', () => {
    assert.equal(barWidthPercent(5, 10), 50);
    assert.equal(barWidthPercent(10, 10), 100);
  });

  it('never divides by zero on an empty week', () => {
    assert.equal(barWidthPercent(0, 0), 0);
    assert.equal(barWidthPercent(3, 0), 100, 'the only value fills the track');
  });

  it('clamps rather than overflowing the track', () => {
    assert.equal(barWidthPercent(20, 10), 100);
  });

  it('treats a missing or negative value as empty', () => {
    assert.equal(barWidthPercent(0, 10), 0);
    assert.equal(barWidthPercent(-5, 10), 0);
    assert.equal(barWidthPercent(Number.NaN, 10), 0);
  });
});
