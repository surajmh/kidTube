import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SponsorBlockCategory } from '../types';
import type { SponsorSegment, CachedSegments } from './sponsorBlockService.type';

const cachePrefix = '@nestling/sponsorblock/';
const defaultBaseUrl = 'https://sponsor.ajay.app/api/skipSegments';
const fetchTimeoutMs = 5000;

export class SponsorBlockService {
  private memoryCache = new Map<string, CachedSegments>();
  private readonly cacheTtlMs = 24 * 60 * 60 * 1000;
  private inFlight = new Map<string, Promise<SponsorSegment[]>>();

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

    // Reuse the outstanding request if one is already running for this video,
    // so a re-mount or double check cannot stack duplicate network calls.
    const pending = this.inFlight.get(normalizedId);
    if (pending) return pending;

    const request = this.fetchSegments(normalizedId, cached?.segments ?? []);
    this.inFlight.set(normalizedId, request);
    try {
      return await request;
    } finally {
      this.inFlight.delete(normalizedId);
    }
  }

  private async fetchSegments(videoId: string, fallback: SponsorSegment[]): Promise<SponsorSegment[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), fetchTimeoutMs);
    try {
      const categories = ['sponsor', 'intro', 'outro', 'selfpromo', 'interaction', 'music'];
      const url = `${this.baseUrl}?videoID=${encodeURIComponent(videoId)}&categories=${encodeURIComponent(JSON.stringify(categories))}`;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return fallback;
      const segments = (await response.json()) as SponsorSegment[];
      const next = { fetchedAt: Date.now(), segments: Array.isArray(segments) ? segments : [] };
      this.memoryCache.set(videoId, next);
      await AsyncStorage.setItem(`${cachePrefix}${videoId}`, JSON.stringify(next));
      return next.segments;
    } catch {
      // SponsorBlock is an enhancement. Playback continues when it is unavailable.
      return fallback;
    } finally {
      clearTimeout(timer);
    }
  }

  async getSkippableSegments(videoId: string, categories: SponsorBlockCategory[], offline = false) {
    const allowed = new Set(categories);
    const segments = offline ? (this.memoryCache.get(videoId) ?? await this.readCache(videoId))?.segments ?? [] : await this.getSegments(videoId);
    return segments.filter((segment) => allowed.has(segment.category as SponsorBlockCategory));
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
