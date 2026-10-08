export type SavedVideo = {
  videoId: string;
  state: 'preparing' | 'downloading' | 'ready' | 'failed' | 'paused' | 'removing';
  expiresAt: number;
  bytes: number;
  percent: number;
};

export interface DownloadModule {
  getDownloads(): Promise<SavedVideo[]>;
  /** Allows saving exactly these videos for a few minutes. Used just before a child's save. */
  setDownloadAuthorization(ids: string[], expiresAt: number): Promise<void>;
  /** Allows removing downloads while the parent session lasts. */
  setParentAuthorization?(expiresAt: number): Promise<void>;
  /** Heights a video can really be saved at; absent on builds older than child downloads. */
  getDownloadOptions?(videoId: string): Promise<{ heights?: number[] }>;
  downloadVideo(videoId: string, maxHeight: number, expiresAt: number): Promise<{ accepted: boolean }>;
  removeDownload(videoId: string): Promise<void>;
  clearDownloads(): Promise<void>;
}

/** Video id -> the children who saved it. One file on the device can have several owners. */
export type DownloadOwners = Record<string, string[]>;

export type SaveDownloadInput = {
  profileId: string;
  video: import('../types').ApprovedVideo;
  height: number;
  settings: import('../types').PlaybackSettings;
};

/** A saved video as the parent list shows it: who has it, plus what the device reports. */
export type ParentDownloadRow = { profileId: string; video: import('../types').ApprovedVideo | undefined; item: SavedVideo };
