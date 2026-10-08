import type { SavedVideo } from '../../services/downloadService.type';

export function downloadStatusText(item: SavedVideo): string {
  if (item.state === 'ready') return 'Ready for travel';
  if (item.state === 'failed') return 'Download failed. Remove it and try saving again.';
  return `${item.state} · ${Math.round(item.percent)}%`;
}
