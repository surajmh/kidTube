import { screenTimeRepository } from '../repositories/playbackSettingsRepository';
import { playbackPolicy } from './playbackPolicyService';
import { pruneUsageRecords } from './screenTimeAccounting';

/**
 * Screen time is kept accurate in memory on every progress tick, but only written to storage on a
 * debounce (and on lifecycle transitions). Writing the full record set on every 500ms tick was
 * churning the bridge and the storage layer for no benefit.
 */
const flushIntervalMs = 10_000;

export class ScreenTimeService {
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  /** Credits played seconds and returns the profile's new total for today. */
  recordPlaybackSeconds(profileId: string, seconds: number) {
    const total = playbackPolicy.addPlaybackSeconds(profileId, seconds);
    if (seconds > 0) {
      this.dirty = true;
      this.scheduleFlush();
    }
    return total;
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, flushIntervalMs);
  }

  /** Persists pending usage. Safe to call at any time. */
  async flush() {
    if (!this.dirty) return;
    this.dirty = false;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    const records = pruneUsageRecords(playbackPolicy.records());
    playbackPolicy.replaceRecords(records);
    await screenTimeRepository.saveAll(records);
  }
}

export const screenTimeService = new ScreenTimeService();
