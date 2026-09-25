import assert from 'node:assert/strict';
import { act, renderHook } from '@testing-library/react-native';
import { ChildProfile } from '../../../types';
import { PlaybackSettings } from '../../../playbackTypes';
import { ContentApproval, PlaybackOverride } from '../../../parentalControlsTypes';
import { ChildRulesMap } from '../../../services/childRulesService';
import { useParentChildren } from '../parentChildren.hook';

const milo: ChildProfile = { id: 'milo', name: 'Milo', avatar: 'sun' };
const ada: ChildProfile = { id: 'ada', name: 'Ada', avatar: 'star' };

const globalSettings = {
  dailyLimitMinutes: 60,
  bedtimeMinutes: 19 * 60,
  autoplay: true,
  sponsorBlock: true,
  warnBeforeEnd: true,
  allowedWindows: {},
} as unknown as PlaybackSettings;

type Input = Parameters<typeof useParentChildren>[0];

function setup(overrides: Partial<Input> = {}) {
  const onSetPolicy = jest.fn(async () => {});
  const props: Input = {
    profiles: [milo, ada],
    initialProfileId: 'milo',
    rules: {} as ChildRulesMap,
    policyOverrides: {},
    globalSettings,
    overrides: [],
    approvals: [],
    onSetPolicy,
    ...overrides,
  };
  const view = renderHook((next: Input) => useParentChildren(next), { initialProps: props });
  return { ...view, onSetPolicy };
}

describe('useParentChildren', () => {
  it('starts on the requested child', () => {
    assert.equal(setup().result.current.profile?.id, 'milo');
  });

  it('falls back to the first profile when none was requested', () => {
    assert.equal(setup({ initialProfileId: '' }).result.current.profile?.id, 'milo');
  });

  it('falls back rather than showing nothing when the selected child is gone', () => {
    // A deleted child must not leave the panel stuck on an id that no longer exists.
    const { result } = setup({ initialProfileId: 'deleted' });
    assert.equal(result.current.profile?.id, 'milo');
  });

  it('copes with no profiles at all', () => {
    const { result } = setup({ profiles: [], initialProfileId: '' });
    assert.equal(result.current.profile, undefined);
    assert.equal(result.current.profileId, '');
  });

  it('switches every derived value together when the child changes', () => {
    const approvals = [
      { id: 'a1', profileId: 'milo' },
      { id: 'a2', profileId: 'ada' },
    ] as ContentApproval[];
    const { result } = setup({ approvals });
    assert.deepEqual(result.current.childApprovals.map((a) => a.id), ['a1']);

    act(() => result.current.setSelectedId('ada'));
    assert.equal(result.current.profile?.id, 'ada');
    assert.deepEqual(result.current.childApprovals.map((a) => a.id), ['a2']);
  });

  it('defaults a child with no stored rules to inheriting', () => {
    assert.equal(setup().result.current.childRules.inheritGlobalApprovals, true);
    assert.equal(setup().result.current.childRules.profileId, 'milo');
  });

  it('excludes expired overrides from the live list', () => {
    const overrides = [
      { profileId: 'milo', additionalSeconds: 900, expiresAt: '2000-01-01T00:00:00Z', grantsScheduleAccess: false },
      { profileId: 'milo', additionalSeconds: 900, expiresAt: '2999-01-01T00:00:00Z', grantsScheduleAccess: false },
    ] as PlaybackOverride[];
    assert.equal(setup({ overrides }).result.current.activeOverrides.length, 1);
  });

  it('routes a policy patch to the selected child', async () => {
    const { result, onSetPolicy } = setup();
    act(() => result.current.setSelectedId('ada'));
    await act(async () => {
      await result.current.patch({ dailyLimitMinutes: 30 });
    });
    expect(onSetPolicy).toHaveBeenCalledWith('ada', { dailyLimitMinutes: 30 });
  });

  it('toggles schedule access', () => {
    const { result } = setup();
    assert.equal(result.current.scheduleAccess, false);
    act(() => result.current.toggleScheduleAccess());
    assert.equal(result.current.scheduleAccess, true);
  });

  it('keeps derived values stable when unrelated state changes', () => {
    const { result } = setup();
    const before = result.current.childRules;
    act(() => result.current.toggleScheduleAccess());
    assert.equal(result.current.childRules, before);
  });
});
