import React from 'react';
import type { ChildProfile, PlaybackSettings, ProfilePolicyOverrides } from '../../types';
import { describeProfilePolicy } from '../../services/profilePolicyService';
import { SettingsChoice, SettingsGroup, SettingsTime, SettingsToggle } from '../SettingsMenu';
import { LIMIT_OPTIONS } from './parentChildren.constant';
import { AllowedWindowEditor } from './parentChildren.allowedWindow';

export function LimitsCard({ profile, profileId, override, summary, globalSettings, patch, onSetPolicy }: {
  profile: ChildProfile; profileId: string; override: ProfilePolicyOverrides | undefined;
  summary: ReturnType<typeof describeProfilePolicy>; globalSettings: PlaybackSettings;
  patch: (patch: ProfilePolicyOverrides) => Promise<void>;
  onSetPolicy: (profileId: string, patch: ProfilePolicyOverrides | null) => Promise<void>;
}) {
  return <SettingsGroup label={`${profile.name}’s playback limits`} value={override ? 'Custom' : 'Family defaults'}>
    {override && <SettingsChoice label="Use family defaults" value={false} options={[{ value: false, label: 'Keep custom limits' }, { value: true, label: 'Reset to family defaults' }]} onChange={(reset) => reset ? onSetPolicy(profileId, null) : undefined} />}
    <SettingsChoice<number | null> label="Daily limit" value={summary.dailyLimitMinutes} options={[...LIMIT_OPTIONS.map((value) => ({ value, label: `${value} min` })), { value: null, label: 'Unlimited' }]} onChange={(dailyLimitMinutes) => patch({ dailyLimitMinutes })} />
    <SettingsToggle label="Autoplay" value={summary.autoplay} onChange={(autoplay) => patch({ autoplay })} />
    <SettingsGroup label="Allowed hours" value={summary.allowedHoursEnabled ? 'Daily window' : 'Any time'}>
      <SettingsToggle label="Limit to a daily window" value={summary.allowedHoursEnabled} onChange={(allowedHoursEnabled) => patch({ allowedHoursEnabled, schedules: override?.schedules ?? globalSettings.schedules })} />
      <AllowedWindowEditor schedules={override?.schedules ?? globalSettings.schedules} onChange={(schedules) => patch({ schedules })} />
    </SettingsGroup>
    <SettingsGroup label="Bedtime" value={summary.bedtimeEnabled ? 'On' : 'Off'}>
      <SettingsToggle label="Pause during bedtime" value={summary.bedtimeEnabled} onChange={(bedtimeEnabled) => patch({ bedtimeEnabled })} />
      <SettingsTime label="Bedtime starts" value={override?.bedtimeStartMinutes ?? globalSettings.bedtimeStartMinutes} onChange={(bedtimeStartMinutes) => patch({ bedtimeStartMinutes })} />
      <SettingsTime label="Available again" value={override?.bedtimeEndMinutes ?? globalSettings.bedtimeEndMinutes} onChange={(bedtimeEndMinutes) => patch({ bedtimeEndMinutes })} />
    </SettingsGroup>
  </SettingsGroup>;
}
