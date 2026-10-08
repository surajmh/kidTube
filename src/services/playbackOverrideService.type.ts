export type OverridePresetId = 'fifteen_minutes' | 'thirty_minutes' | 'until_bedtime';

export type OverridePreset = {
  id: OverridePresetId;
  label: string;
  additionalSeconds: number | null;
  untilBedtime: boolean;
};
