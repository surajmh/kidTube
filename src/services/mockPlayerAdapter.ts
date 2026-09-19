import { PlayerAdapter } from './playerAdapter';

export class MockPlayerAdapter implements PlayerAdapter {
  private playing = false;
  private position = 0;
  private allowed: string[] = [];

  positionMs() {
    return this.position;
  }

  /** Mirrors the native contract so the mock cannot be more permissive than the real player. */
  async setAllowedVideoIds(videoIds: string[]) {
    this.allowed = [...videoIds];
  }

  async play(videoId: string) {
    if (!this.allowed.includes(videoId)) throw new Error('This video is not in the approved library.');
    this.playing = true;
  }

  allowedVideoIds() {
    return this.allowed;
  }

  async pause() {
    this.playing = false;
  }

  async resume(videoId: string) {
    if (!this.allowed.includes(videoId)) throw new Error('This video is not in the approved library.');
    this.playing = true;
  }

  async seek(position: number) {
    this.position = Math.max(0, position);
  }

  async stop() {
    this.playing = false;
    this.position = 0;
  }

  isPlaying() {
    return this.playing;
  }
}

export const mockPlayerAdapter = new MockPlayerAdapter();
