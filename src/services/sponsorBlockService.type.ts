import type { SponsorBlockCategory } from '../types';

export type SponsorSegment = {
  uuid?: string;
  category: SponsorBlockCategory | string;
  start: number;
  end: number;
  actionType?: string;
};

export type CachedSegments = {
  fetchedAt: number;
  segments: SponsorSegment[];
};
