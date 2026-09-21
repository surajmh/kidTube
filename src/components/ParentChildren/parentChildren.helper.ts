import { ContentApproval, PlaybackOverride } from '../../phase4Types';
import { ChildRulesMap } from '../../services/childRulesService';
import { DEFAULT_WINDOW, MINUTES_IN_DAY } from './parentChildren.constant';

/** One day's allowed-viewing window, in minutes from midnight. */
export type TimeWindow = { startMinutes: number; endMinutes: number };
export type ScheduleMap = Record<string, TimeWindow[]>;

/** Minutes from midnight as a 12-hour clock time. */
export function minutesToTime(value: number): string {
  const normalised = ((value % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hour = Math.floor(normalised / 60);
  const minute = normalised % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/**
 * A child with no stored rules inherits everything.
 *
 * Returning a filled record rather than undefined keeps every caller from re-deciding what an
 * absent rule set means, which is the kind of gap a permission bug hides in.
 */
export function childRulesFor(rules: ChildRulesMap, profileId: string): ChildRulesMap[string] {
  return (
    rules[profileId] ?? {
      profileId,
      inheritGlobalApprovals: true,
      blockedCategoryIds: [],
      grantedVideoIds: [],
      grantedChannelIds: [],
      blockedVideoIds: [],
      blockedChannelIds: [],
    }
  );
}

/** Overrides for this child that have not expired. Expiry is evaluated now, never cached. */
export function activeOverridesFor(
  overrides: PlaybackOverride[],
  profileId: string,
  now: Date = new Date(),
): PlaybackOverride[] {
  return overrides.filter(
    (item) => item.profileId === profileId && new Date(item.expiresAt).getTime() > now.getTime(),
  );
}

/** Approvals granted specifically to this child, not the family-wide ones. */
export function approvalsFor(approvals: ContentApproval[], profileId: string): ContentApproval[] {
  return approvals.filter((approval) => approval.profileId === profileId);
}

/** The window being edited for a day, falling back to a sensible default. */
export function windowForDay(schedules: ScheduleMap, day: number): TimeWindow {
  return schedules[String(day)]?.[0] ?? DEFAULT_WINDOW;
}

/**
 * Moves one edge of a day's window, wrapping around midnight.
 *
 * Wrapping rather than clamping is deliberate: stepping back from 00:15 should reach the previous
 * evening, which is how a bedtime window is actually expressed.
 */
export function shiftWindow(
  schedules: ScheduleMap,
  day: number,
  field: keyof TimeWindow,
  deltaMinutes: number,
): ScheduleMap {
  const current = windowForDay(schedules, day);
  const value = (current[field] + deltaMinutes + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  return { ...schedules, [String(day)]: [{ ...current, [field]: value }] };
}
