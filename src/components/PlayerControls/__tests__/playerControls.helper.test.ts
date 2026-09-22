import { elapsedSeconds, progressFromTouch, seekTarget } from '../playerControls.helper';

describe('seekTarget', () => {
  it('moves forward and back by the delta', () => {
    expect(seekTarget(30_000, 10_000, 120_000)).toBe(40_000);
    expect(seekTarget(30_000, -10_000, 120_000)).toBe(20_000);
  });

  it('clamps instead of refusing when the skip runs off either end', () => {
    // Pressing back-10 in the first seconds is normal, not an error.
    expect(seekTarget(3_000, -10_000, 120_000)).toBe(0);
    expect(seekTarget(118_000, 10_000, 120_000)).toBe(120_000);
  });

  it('returns 0 rather than NaN when the duration is unknown', () => {
    expect(seekTarget(5_000, 10_000, 0)).toBe(0);
    expect(seekTarget(5_000, 10_000, Number.NaN)).toBe(0);
  });
});

describe('progressFromTouch', () => {
  it('maps a touch to its fraction of the bar', () => {
    expect(progressFromTouch(50, 200)).toBe(0.25);
  });

  it('clamps a touch that leaves the bar during a drag', () => {
    expect(progressFromTouch(-30, 200)).toBe(0);
    expect(progressFromTouch(400, 200)).toBe(1);
  });

  it('survives being measured before layout', () => {
    expect(progressFromTouch(50, 0)).toBe(0);
  });
});

describe('elapsedSeconds', () => {
  it('derives the label from the same progress the bar draws', () => {
    expect(elapsedSeconds(0.5, 120_000)).toBe(60);
  });

  it('clamps out-of-range progress and unknown durations', () => {
    expect(elapsedSeconds(1.4, 120_000)).toBe(120);
    expect(elapsedSeconds(-0.2, 120_000)).toBe(0);
    expect(elapsedSeconds(0.5, 0)).toBe(0);
  });
});
