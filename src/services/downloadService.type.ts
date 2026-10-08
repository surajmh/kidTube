export type SavedVideo = {
  videoId: string;
  state: 'preparing' | 'downloading' | 'ready' | 'failed' | 'paused' | 'removing';
  expiresAt: number;
  bytes: number;
  percent: number;
};

export interface DownloadModule {
  getDownloads(): Promise<SavedVideo[]>;
  setDownloadAuthorization(ids: string[], expiresAt: number): Promise<void>;
  downloadVideo(videoId: string, maxHeight: number, expiresAt: number): Promise<{ accepted: boolean }>;
  removeDownload(videoId: string): Promise<void>;
  clearDownloads(): Promise<void>;
}
