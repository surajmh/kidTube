import assert from 'node:assert/strict';
import type { ContentApproval, PlaybackOverride } from '../../../types';
import type { ChildRulesMap } from '../../../services/childRulesService.type';
import {
  activeOverridesFor,
  approvalsFor,
  childRulesFor,
  minutesToTime,
  shiftWindow,
  windowForDay,
} from '../parentChildren.helper';
import { DEFAULT_WINDOW } from '../parentChildren.constant';

describe('minutesToTime', () => {
  it('formats midnight and noon the way a clock does, not as 0:00', () => {
    assert.equal(minutesToTime(0), '12:00 AM');
    assert.equal(minutesToTime(12 * 60), '12:00 PM');
  });

  it('formats morning and evening', () => {
    assert.equal(minutesToTime(9 * 60 + 5), '9:05 AM');
    assert.equal(minutesToTime(19 * 60 + 30), '7:30 PM');
  });

  it('wraps rather than producing an impossible time', () => {
    assert.equal(minutesToTime(24 * 60), '12:00 AM');
    assert.equal(minutesToTime(-60), '11:00 PM');
  });
});

describe('childRulesFor', () => {
  it('returns the stored rules when they exist', () => {
    const rules = {
      kid: {
        profileId: 'kid',
        inheritGlobalApprovals: false,
        blockedCategoryIds: ['music'],
        grantedVideoIds: [],
        grantedChannelIds: [],
        blockedVideoIds: [],
        blockedChannelIds: [],
      },
    } as unknown as ChildRulesMap;
    assert.equal(childRulesFor(rules, 'kid').inheritGlobalApprovals, false);
  });

  it('defaults a child with no rules to inheriting everything', () => {
    // An absent rule set must mean one thing everywhere, or a permission gap hides in the ambiguity.
    const fallback = childRulesFor({} as ChildRulesMap, 'kid');
    assert.equal(fallback.profileId, 'kid');
    assert.equal(fallback.inheritGlobalApprovals, true);
    assert.deepEqual(fallback.blockedCategoryIds, []);
    assert.deepEqual(fallback.blockedVideoIds, []);
  });
});

describe('activeOverridesFor', () => {
  const now = new Date('2026-02-01T12:00:00Z');
  function override(profileId: string, expiresAt: string): PlaybackOverride {
    return { profileId, additionalSeconds: 900, expiresAt, grantsScheduleAccess: false } as PlaybackOverride;
  }

  it('keeps only unexpired overrides belonging to this child', () => {
    const found = activeOverridesFor(
      [
        override('kid', '2026-02-01T12:30:00Z'),
        override('kid', '2026-02-01T11:30:00Z'),
        override('other', '2026-02-01T12:30:00Z'),
      ],
      'kid',
      now,
    );
    assert.equal(found.length, 1);
    assert.equal(found[0].expiresAt, '2026-02-01T12:30:00Z');
  });

  it('treats an override expiring exactly now as expired', () => {
    assert.equal(activeOverridesFor([override('kid', now.toISOString())], 'kid', now).length, 0);
  });
});

describe('approvalsFor', () => {
  it('returns only approvals granted to this child, not family-wide ones', () => {
    const approvals = [
      { id: 'a1', profileId: 'kid' },
      { id: 'a2', profileId: null },
      { id: 'a3', profileId: 'other' },
    ] as ContentApproval[];
    assert.deepEqual(approvalsFor(approvals, 'kid').map((a) => a.id), ['a1']);
  });
});

describe('allowed-window editing', () => {
  it('falls back to a plausible window for a day with none set', () => {
    assert.deepEqual(windowForDay({}, 3), DEFAULT_WINDOW);
  });

  it('uses the stored window when there is one', () => {
    const schedules = { '3': [{ startMinutes: 60, endMinutes: 120 }] };
    assert.deepEqual(windowForDay(schedules, 3), { startMinutes: 60, endMinutes: 120 });
  });

  it('shifts one edge without touching the other', () => {
    const next = shiftWindow({ '1': [{ startMinutes: 600, endMinutes: 700 }] }, 1, 'startMinutes', 30);
    assert.deepEqual(next['1'], [{ startMinutes: 630, endMinutes: 700 }]);
  });

  it('wraps backwards past midnight instead of clamping at zero', () => {
    // Stepping back from 00:15 should reach the previous evening: that is how bedtime is expressed.
    const next = shiftWindow({ '1': [{ startMinutes: 15, endMinutes: 700 }] }, 1, 'startMinutes', -30);
    assert.equal(next['1'][0].startMinutes, 24 * 60 - 15);
  });

  it('wraps forwards past midnight', () => {
    const next = shiftWindow({ '1': [{ startMinutes: 0, endMinutes: 23 * 60 + 50 }] }, 1, 'endMinutes', 30);
    assert.equal(next['1'][0].endMinutes, 20);
  });

  it('leaves other days untouched', () => {
    const schedules = { '1': [{ startMinutes: 60, endMinutes: 120 }], '2': [{ startMinutes: 300, endMinutes: 400 }] };
    const next = shiftWindow(schedules, 1, 'startMinutes', 15);
    assert.deepEqual(next['2'], schedules['2']);
  });
});
