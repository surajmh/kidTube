import { useCallback, useMemo, useState } from 'react';
import { ApprovalDuration } from '../../phase4Types';
import { DEFAULT_DURATION, DEFAULT_SCOPE, PARENT_REQUESTS_COPY } from './parentRequests.constant';
import { splitByStatus } from './parentRequests.helper';
import { ParentRequestsProps, RequestDecisionInput, RequestScope } from './parentRequests.type';

type UseParentRequestsInput = Pick<ParentRequestsProps, 'requests' | 'onDecide'>;

/**
 * Decision state for the requests list.
 *
 * Duration and scope are held per request rather than globally: a parent often answers several in
 * a row, and carrying one request's choice onto the next would silently widen an approval.
 */
export function useParentRequests({ requests, onDecide }: UseParentRequestsInput) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, ApprovalDuration>>({});
  const [scopes, setScopes] = useState<Record<string, RequestScope>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { pending, resolved } = useMemo(() => splitByStatus(requests), [requests]);

  const durationFor = useCallback(
    (requestId: string) => durations[requestId] ?? DEFAULT_DURATION,
    [durations],
  );
  const scopeFor = useCallback(
    (requestId: string) => scopes[requestId] ?? DEFAULT_SCOPE,
    [scopes],
  );

  const setDuration = useCallback((requestId: string, duration: ApprovalDuration) => {
    setDurations((current) => ({ ...current, [requestId]: duration }));
  }, []);
  const setScope = useCallback((requestId: string, scope: RequestScope) => {
    setScopes((current) => ({ ...current, [requestId]: scope }));
  }, []);

  const toggleOpen = useCallback((requestId: string) => {
    setOpenId((current) => (current === requestId ? null : requestId));
  }, []);

  const decide = useCallback(
    async (input: RequestDecisionInput) => {
      setBusyId(input.request.id);
      setError('');
      try {
        await onDecide(input);
        setOpenId(null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : PARENT_REQUESTS_COPY.decisionFailed);
      } finally {
        setBusyId(null);
      }
    },
    [onDecide],
  );

  return {
    openId,
    toggleOpen,
    busyId,
    error,
    pending,
    resolved,
    durationFor,
    scopeFor,
    setDuration,
    setScope,
    decide,
  };
}
