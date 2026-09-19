import { profilePolicyRepository } from '../repositories/phase4Repository';
import { Phase3Settings, ScheduleWindow } from '../phase3Types';
import { ProfilePolicyOverrides } from '../phase4Types';
import { ParentSession, parentSessionService } from './auth/parentSession';

export type ProfilePolicyMap = Record<string, ProfilePolicyOverrides>;

/**
 * Global Phase 3 settings remain the family default; a profile may override any
 * of them. Any field the profile does not set falls back to the global value.
 */
export function mergeProfilePolicy(base: Phase3Settings, override?: ProfilePolicyOverrides): Phase3Settings {
  if (!override) return base;
  return {
    ...base,
    autoplay: override.autoplay ?? base.autoplay,
    sponsorBlockEnabled: override.sponsorBlockEnabled ?? base.sponsorBlockEnabled,
    screenTimeWarningsEnabled: override.screenTimeWarningsEnabled ?? base.screenTimeWarningsEnabled,
    dailyLimitMinutes:
      override.dailyLimitMinutes === undefined ? base.dailyLimitMinutes : override.dailyLimitMinutes,
    allowedHoursEnabled: override.allowedHoursEnabled ?? base.allowedHoursEnabled,
    schedules: (override.schedules ?? base.schedules) as Record<string, ScheduleWindow[]>,
    bedtimeEnabled: override.bedtimeEnabled ?? base.bedtimeEnabled,
    bedtimeStartMinutes: override.bedtimeStartMinutes ?? base.bedtimeStartMinutes,
    bedtimeEndMinutes: override.bedtimeEndMinutes ?? base.bedtimeEndMinutes,
  };
}

export function describeProfilePolicy(base: Phase3Settings, override?: ProfilePolicyOverrides) {
  const limit = override?.dailyLimitMinutes === undefined ? base.dailyLimitMinutes : override.dailyLimitMinutes;
  const hours = override?.allowedHoursEnabled ?? base.allowedHoursEnabled;
  const autoplay = override?.autoplay ?? base.autoplay;
  return {
    dailyLimitMinutes: limit,
    allowedHoursEnabled: hours,
    autoplay,
    bedtimeEnabled: override?.bedtimeEnabled ?? base.bedtimeEnabled,
  };
}

export class ProfilePolicyService {
  private policies: ProfilePolicyMap = {};

  hydrate(policies: ProfilePolicyMap) {
    this.policies = policies;
  }

  all() {
    return this.policies;
  }

  get(profileId: string) {
    return this.policies[profileId];
  }

  isCustomised(profileId: string) {
    return Boolean(this.policies[profileId]);
  }

  effectiveSettings(profileId: string, base: Phase3Settings) {
    return mergeProfilePolicy(base, this.policies[profileId]);
  }

  /** Parent-only. Pass `null` to fall back to the family defaults for this child. */
  async update(session: ParentSession, profileId: string, patch: ProfilePolicyOverrides | null): Promise<ProfilePolicyMap> {
    parentSessionService.require("change a child's playback policy");
    const next = { ...this.policies };
    if (patch === null) delete next[profileId];
    else next[profileId] = { ...this.policies[profileId], ...patch };
    this.policies = next;
    await profilePolicyRepository.saveAll(next);
    return next;
  }

  async reset(session: ParentSession, profileId: string) {
    return this.update(session, profileId, null);
  }
}

export const profilePolicyService = new ProfilePolicyService();
