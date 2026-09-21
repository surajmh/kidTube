import { useCallback, useMemo, useState } from 'react';
import { ProfilePolicyOverrides } from '../../phase4Types';
import { describeProfilePolicy } from '../../services/profilePolicyService';
import { activeOverridesFor, approvalsFor, childRulesFor } from './parentChildren.helper';
import { ParentChildrenProps } from './parentChildren.type';

type UseParentChildrenInput = Pick<
  ParentChildrenProps,
  'profiles' | 'initialProfileId' | 'rules' | 'policyOverrides' | 'globalSettings' | 'overrides' | 'approvals' | 'onSetPolicy'
>;

/**
 * Which child is being edited, and everything that follows from it.
 *
 * Every derived value is keyed on the selected profile, so switching child recomputes the rules,
 * policy summary, live overrides and approvals together and cannot leave one showing another
 * child's state.
 */
export function useParentChildren({
  profiles,
  initialProfileId,
  rules,
  policyOverrides,
  globalSettings,
  overrides,
  approvals,
  onSetPolicy,
}: UseParentChildrenInput) {
  const [selectedId, setSelectedId] = useState(initialProfileId || profiles[0]?.id || '');
  const [scheduleAccess, setScheduleAccess] = useState(false);

  // Falling back to the first profile keeps the panel usable if the selected child is deleted.
  const profile = useMemo(
    () => profiles.find((item) => item.id === selectedId) ?? profiles[0],
    [profiles, selectedId],
  );
  const profileId = profile?.id ?? '';

  const childRules = useMemo(() => childRulesFor(rules, profileId), [rules, profileId]);
  const override = policyOverrides[profileId];
  const summary = useMemo(
    () => describeProfilePolicy(globalSettings, override),
    [globalSettings, override],
  );
  const activeOverrides = useMemo(
    () => activeOverridesFor(overrides, profileId),
    [overrides, profileId],
  );
  const childApprovals = useMemo(() => approvalsFor(approvals, profileId), [approvals, profileId]);

  const patch = useCallback(
    (patchValue: ProfilePolicyOverrides) => onSetPolicy(profileId, patchValue),
    [onSetPolicy, profileId],
  );

  const toggleScheduleAccess = useCallback(() => setScheduleAccess((value) => !value), []);

  return {
    selectedId,
    setSelectedId,
    scheduleAccess,
    setScheduleAccess,
    toggleScheduleAccess,
    profile,
    profileId,
    childRules,
    override,
    summary,
    activeOverrides,
    childApprovals,
    patch,
  };
}
