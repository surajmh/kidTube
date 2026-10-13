import React from 'react';
import type { ChildProfile, PlaybackOverride } from '../../types';
import { overridePresets } from '../../services/playbackOverrideService';
import type { OverridePreset } from '../../services/playbackOverrideService.type';
import { SettingsChoice, SettingsGroup, SettingsToggle } from '../SettingsMenu';

export function OverrideCard({ profile, profileId, activeOverrides, scheduleAccess, setScheduleAccess, onGrantOverride, onRevokeOverride }: {
  profile: ChildProfile; profileId: string; activeOverrides: PlaybackOverride[];
  scheduleAccess: boolean; setScheduleAccess: (value: boolean) => void;
  onGrantOverride: (profileId: string, preset: OverridePreset, grantsScheduleAccess: boolean) => Promise<void>;
  onRevokeOverride: (profileId: string) => Promise<void>;
}) {
  return <SettingsGroup label="Temporary parent override" value={activeOverrides.length ? 'Active' : 'None'} description={`Adds time temporarily. ${profile.name}’s configured limit stays the same.`}>
    <SettingsToggle label="Also allow outside allowed hours" value={scheduleAccess} onChange={setScheduleAccess} />
    <SettingsChoice label="Add time" value="" options={overridePresets.map((preset) => ({ value: preset.id, label: preset.label }))}
      onChange={(value) => { const preset = overridePresets.find((item) => item.id === value); if (preset) return onGrantOverride(profileId, preset, scheduleAccess); }} />
    {activeOverrides.length > 0 && <SettingsChoice label="End override now" value={false} options={[{ value: false, label: 'Keep override' }, { value: true, label: 'End now' }]} onChange={(end) => end ? onRevokeOverride(profileId) : undefined} />}
  </SettingsGroup>;
}
