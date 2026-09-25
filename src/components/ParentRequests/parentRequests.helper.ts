import { ApprovedVideo, ChildProfile } from '../../types';
import { ContentRequest } from '../../parentalControlsTypes';
import { PARENT_REQUESTS_COPY } from './parentRequests.constant';

const MINUTE_MS = 60_000;

/** Coarse relative time. Requests are answered in minutes or hours, so precision past that is noise. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / MINUTE_MS);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Waiting requests and answered ones, in one pass. */
export function splitByStatus(requests: ContentRequest[]): {
  pending: ContentRequest[];
  resolved: ContentRequest[];
} {
  const pending: ContentRequest[] = [];
  const resolved: ContentRequest[] = [];
  for (const request of requests) {
    (request.status === 'pending' ? pending : resolved).push(request);
  }
  return { pending, resolved };
}

/** A child's name, or a neutral fallback if the profile has since been deleted. */
export function profileNameFor(profiles: ChildProfile[], profileId: string): string {
  return profiles.find((profile) => profile.id === profileId)?.name ?? PARENT_REQUESTS_COPY.unknownChild;
}

/**
 * A thumbnail for the request, preferring the one captured when it was made.
 *
 * Falling back to the library lets a request the child described by hand still show artwork once
 * the same video exists locally.
 */
export function thumbnailFor(request: ContentRequest, videos: ApprovedVideo[]): string | undefined {
  if (request.thumbnailUrl) return request.thumbnailUrl;
  return videos.find((video) => video.youtubeVideoId === request.youtubeVideoId)?.thumbnailUrl;
}
