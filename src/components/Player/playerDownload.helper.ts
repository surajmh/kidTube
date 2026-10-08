import type { SavedVideo } from '../../services/downloadService.type';
import { DOWNLOAD_COPY, QUALITY_LABELS } from './playerDownload.constant';

export function qualityLabel(height: number): string {
  const tier = QUALITY_LABELS.find((entry) => height >= entry.min);
  return `${height}p · ${tier?.label ?? ''}`.trim();
}

export type DownloadView = 'idle' | 'progress' | 'ready';

export function downloadView(item?: SavedVideo): DownloadView {
  if (item?.state === 'ready') return 'ready';
  if (item && item.state !== 'failed' && item.state !== 'removing') return 'progress';
  return 'idle';
}

export function progressLabel(item: SavedVideo): string {
  if (item.state === 'preparing') return DOWNLOAD_COPY.preparing;
  return `Downloading… ${Math.round(item.percent)}%`;
}

export function idleLabel(item?: SavedVideo): string {
  return item?.state === 'failed' ? DOWNLOAD_COPY.tryAgain : DOWNLOAD_COPY.download;
}
