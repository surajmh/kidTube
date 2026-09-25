import { ApprovedChannel, ApprovedVideo } from '../types';
import { ContentCandidate } from '../parentalControlsTypes';
import { ParentSession, parentSessionService } from './auth/parentSession';

/**
 * ParentContentSearch.
 *
 * This module is deliberately separate from `KidContentLibraryService` and is
 * only reachable after Parent Mode has been unlocked: every entry point requires
 * a live `ParentSession`. Results are inert `ContentCandidate` values - they are
 * never playable and never enter the child library until a parent explicitly
 * approves them.
 *
 * The bundled provider resolves pasted YouTube links/IDs locally, so the app
 * stays keyless and offline. A networked provider can be dropped in later behind
 * the same interface.
 */
export interface ContentSearchProvider {
  id: string;
  label: string;
  description: string;
  search(query: string, context: SearchContext): Promise<ContentCandidate[]>;
}

export type SearchContext = {
  videos: ApprovedVideo[];
  channels: ApprovedChannel[];
};

export class ContentSearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentSearchError';
  }
}

const videoIdPattern = /^[A-Za-z0-9_-]{6,}$/;
const channelIdPattern = /^UC[A-Za-z0-9_-]{10,}$/;

export function parseVideoCandidate(query: string, context: SearchContext): ContentCandidate | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{6,})(?:[?&#/]|$)/);
  const id = match?.[1] ?? (videoIdPattern.test(trimmed) && !trimmed.startsWith('@') ? trimmed : '');
  if (!id) return null;
  const known = context.videos.find((video) => video.youtubeVideoId === id);
  return {
    type: 'video',
    youtubeVideoId: id,
    title: known?.title ?? `Video ${id}`,
    channelName: known?.channelName,
    thumbnailUrl: known?.thumbnailUrl,
    source: match ? 'link' : 'id',
    alreadyKnown: Boolean(known),
  };
}

export function parseChannelCandidate(query: string, context: SearchContext): ContentCandidate | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/channel\/(UC[A-Za-z0-9_-]{10,})/);
  const id = match?.[1] ?? (channelIdPattern.test(trimmed) ? trimmed : '');
  if (!id) return null;
  const known = context.channels.find((channel) => channel.channelId === id);
  return {
    type: 'channel',
    youtubeChannelId: id,
    title: known?.name ?? `Channel ${id}`,
    thumbnailUrl: known?.thumbnailUrl,
    source: match ? 'link' : 'id',
    alreadyKnown: Boolean(known),
  };
}

/**
 * Local provider: the parent pastes a YouTube video or channel link/ID and picks
 * a title. No network calls, no API keys, no scraping.
 */
export class LinkEntryProvider implements ContentSearchProvider {
  readonly id = 'link-entry';
  readonly label = 'Paste a link';
  readonly description = 'Paste a YouTube video or channel link. kidTube reads the ID from the link — nothing is uploaded.';

  async search(query: string, context: SearchContext): Promise<ContentCandidate[]> {
    const video = parseVideoCandidate(query, context);
    const channel = parseChannelCandidate(query, context);
    return [video, channel].filter((candidate): candidate is ContentCandidate => candidate !== null);
  }
}

export class ParentContentSearchService {
  constructor(private provider: ContentSearchProvider = new LinkEntryProvider()) {}

  activeProvider() {
    return { id: this.provider.id, label: this.provider.label, description: this.provider.description };
  }

  setProvider(provider: ContentSearchProvider) {
    this.provider = provider;
  }

  /** Parent-only: refuses without a live parent session. */
  async search(session: ParentSession, query: string, context: SearchContext): Promise<ContentCandidate[]> {
    parentSessionService.require('search for content to approve');
    return this.provider.search(query, context);
  }

  /** Parent-only helper that keeps the "no arbitrary IDs" rule in one place. */
  assertNotPlayable(candidate: ContentCandidate) {
    if (!candidate.youtubeVideoId && !candidate.youtubeChannelId) {
      throw new ContentSearchError('That link did not contain a YouTube video or channel ID.');
    }
  }
}

export const parentContentSearchService = new ParentContentSearchService();
