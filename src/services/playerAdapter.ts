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
}

export interface ResumablePlayerAdapter extends PlayerAdapter {
  resume(videoId: string): Promise<void>;
}
