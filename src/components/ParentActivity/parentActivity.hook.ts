import { useMemo } from 'react';
import { activityService } from '../../services/activityService';
import { ParentActivityProps } from './parentActivity.type';

/**
 * One summary per child.
 *
 * The aggregation itself lives in activityService; this only keeps it from re-running on every
 * render, which matters because it walks the whole watch history for each profile.
 */
export function useActivitySummaries({
  profiles,
  history,
  screenTime,
  videos,
  categories,
  requests,
  approvals,
}: ParentActivityProps) {
  return useMemo(
    () =>
      profiles.map((profile) =>
        activityService.summarize({
          profileId: profile.id,
          history,
          screenTime,
          videos,
          categories,
          requests,
          approvals,
        }),
      ),
    [profiles, history, screenTime, videos, categories, requests, approvals],
  );
}
