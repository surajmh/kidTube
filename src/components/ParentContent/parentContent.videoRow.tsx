import { SettingsChoice, SettingsGroup } from '../SettingsMenu';
import React from 'react';
import { ApprovedVideo } from '../../types';
import type { ContentApproval, ContentCategory } from '../../types';

import { CategoryEditor } from './parentContent.categoryEditor';
import { useVideoRow } from './parentContent.row.hook';

/** One row of the Videos tab. Memoized for the same reason as the channel row. */
export const ParentVideoRow = React.memo(function ParentVideoRow({
  video,
  approvals,
  categories,
  onToggleCategory,
  onRemove,
}: {
  video: ApprovedVideo;
  approvals: ContentApproval[];
  categories: ContentCategory[];
  expanded: boolean;
  onToggleExpanded: (id: string) => void;
  onToggleCategory: (video: ApprovedVideo, categoryId: string, assigned: boolean) => void;
  onRemove: (video: ApprovedVideo) => void;
}) {
  const expiry = useVideoRow(approvals, video);

  return <SettingsGroup label={video.title} value={video.approved ? 'Approved' : 'Not individually approved'} description={[video.channelName, ...expiry].filter(Boolean).join(' · ')}>
    <CategoryEditor item={video} categories={categories} onToggle={onToggleCategory} />
    <SettingsChoice label={`Remove ${video.title}`} value={false} options={[{ value: false, label: 'Keep video' }, { value: true, label: 'Remove video' }]} onChange={(remove) => remove ? onRemove(video) : undefined} />
  </SettingsGroup>;
});
