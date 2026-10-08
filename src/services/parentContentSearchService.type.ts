import type { ApprovedChannel,ApprovedVideo } from '../types';
import type { ContentCandidate } from '../types';

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
