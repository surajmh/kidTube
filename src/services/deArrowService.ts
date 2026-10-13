import type { ApprovedVideo, PlaybackSettings } from '../types';

type Replacement = { title?: string; thumbnailUrl?: string };

/** Only parent-requested previews fetch community metadata. Nothing is applied automatically. */
export async function previewDeArrow(videoId: string, signal?: AbortSignal): Promise<Replacement | null> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error('Invalid video.');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel);
  if (signal?.aborted) cancel();
  const timeout = setTimeout(cancel, 10_000);
  try {
    const response = await fetch(`https://sponsor.ajay.app/api/branding?videoID=${videoId}`, { signal: controller.signal });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Could not load replacements. Try again.');
    const data = await response.json();
    const title = Array.isArray(data?.titles) ? data.titles.find((item: any) => typeof item?.title === 'string' && item.title.trim() && item.title.length <= 500 && item.original === false && item.votes >= 0)?.title : undefined;
    const thumbnail = Array.isArray(data?.thumbnails) ? data.thumbnails.find((item: any) => item?.original === false && Number.isFinite(item.timestamp) && item.timestamp >= 0 && item.votes >= 0) : undefined;
    const thumbnailUrl = thumbnail ? `https://dearrow-thumb.ajay.app/api/v1/getThumbnail?videoID=${videoId}&time=${thumbnail.timestamp}` : undefined;
    return title || thumbnailUrl ? { title, thumbnailUrl } : null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}

export function withDeArrow(video: ApprovedVideo, settings: PlaybackSettings): ApprovedVideo {
  const replacement = settings.deArrowEnabled && settings.deArrowReplacements?.[video.youtubeVideoId];
  return replacement ? { ...video, title: replacement.title || video.title, thumbnailUrl: replacement.thumbnailUrl || video.thumbnailUrl } : video;
}
