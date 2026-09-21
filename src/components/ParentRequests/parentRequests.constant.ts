import { ApprovalDuration } from '../../phase4Types';
import { RequestScope } from './parentRequests.type';

/**
 * Defaults for a decision the parent has not adjusted.
 *
 * Narrow on purpose: an approval applies to the child who asked unless the parent widens it, so
 * answering quickly cannot accidentally grant something to every child.
 */
export const DEFAULT_DURATION: ApprovalDuration = 'permanent';
export const DEFAULT_SCOPE: RequestScope = 'child';

export const PARENT_REQUESTS_COPY = {
  decisionFailed: 'That decision could not be saved.',
  unknownChild: 'Child',
} as const;
