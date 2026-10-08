export interface PlayerAdapter {
  /**
   * Publishes the ids the player may decode. The native side refuses anything else, so this is the
   * data half of the security boundary rather than a hint.
   */
  setAllowedVideoIds(videoIds: string[]): Promise<void>;
  play(videoId: string): Promise<void>;
  pause(): Promise<void>;
  seek(position: number): Promise<void>;
  stop(): Promise<void>;
  /**
   * Best-effort, optional: resolves a video's stream ahead of actually playing it. Never required
   * for correctness — a caller that skips it, or an adapter that doesn't implement it, just gets
   * the normal resolve latency when `play`/`resume` is eventually called.
   */
  prefetch?(videoId: string): Promise<void>;
}

export interface ResumablePlayerAdapter extends PlayerAdapter {
  resume(videoId: string): Promise<void>;
}
