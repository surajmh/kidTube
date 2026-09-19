import AsyncStorage from '@react-native-async-storage/async-storage';
import { SponsorBlockCategory } from '../phase3Types';

export type SponsorSegment = {
  uuid?: string;
  category: SponsorBlockCategory | string;
  start: number;
  end: number;
  actionType?: string;
};

type CachedSegments = {
  fetchedAt: number;
  segments: SponsorSegment[];
};

const cachePrefix = '@nestling/sponsorblock/';
const defaultBaseUrl = 'https://sponsor.ajay.app/api/skipSegments';

export class SponsorBlockService {
  private memoryCache = new Map<string, CachedSegments>();
  private readonly cacheTtlMs = 24 * 60 * 60 * 1000;

  constructor(private readonly baseUrl = defaultBaseUrl) {}

  private async readCache(videoId: string): Promise<CachedSegments | null> {
    try {
      const value = await AsyncStorage.getItem(`${cachePrefix}${videoId}`);
      if (!value) return null;
      const parsed = JSON.parse(value) as CachedSegments;
      if (!Number.isFinite(parsed.fetchedAt) || !Array.isArray(parsed.segments)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async getSegments(videoId: string): Promise<SponsorSegment[]> {
    const normalizedId = videoId.trim();
    if (!normalizedId) return [];

    const cached = this.memoryCache.get(normalizedId) ?? await this.readCache(normalizedId);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      this.memoryCache.set(normalizedId, cached);
      return cached.segments;
    }

    try {
      const categories = ['sponsor', 'intro', 'outro', 'selfpromo', 'interaction', 'music'];
      const url = `${this.baseUrl}?videoID=${encodeURIComponent(normalizedId)}&categories=${encodeURIComponent(JSON.stringify(categories))}`;
      const response = await fetch(url);
      if (!response.ok) return cached?.segments ?? [];
      const segments = (await response.json()) as SponsorSegment[];
      const next = { fetchedAt: Date.now(), segments: Array.isArray(segments) ? segments : [] };
      this.memoryCache.set(normalizedId, next);
      await AsyncStorage.setItem(`${cachePrefix}${normalizedId}`, JSON.stringify(next));
      return next.segments;
    } catch {
      // SponsorBlock is an enhancement. Playback continues when it is unavailable.
      return cached?.segments ?? [];
    }
  }

  async getSkippableSegments(videoId: string, categories: SponsorBlockCategory[]) {
    const allowed = new Set(categories);
    return (await this.getSegments(videoId)).filter((segment) => allowed.has(segment.category as SponsorBlockCategory));
  }

  isInsideSegment(position: number, segments: SponsorSegment[]) {
    return segments.find((segment) => position >= segment.start && position < segment.end);
  }

  clearMemory(videoId?: string) {
    if (videoId) this.memoryCache.delete(videoId);
    else this.memoryCache.clear();
  }
}

export const sponsorBlockService = new SponsorBlockService();
