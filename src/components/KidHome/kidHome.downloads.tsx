import React from 'react';
import { View } from 'react-native';
import type { SavedVideo } from '../../services/downloadService.type';
import type { ApprovedVideo } from '../../types';
import { DownloadList, entriesFor } from '../DownloadList';
import { KID_COPY } from './kidHome.constant';
import { Empty } from './kidHome.primitives';
import useStyles from './kidHome.style';

/** The Downloads tab: this child's saved videos as one list, or a gentle empty state. */
export function DownloadsSection({ downloads, videos, onPlay }: { downloads: SavedVideo[]; videos: ApprovedVideo[]; onPlay: (video: ApprovedVideo) => void }) {
  const styles = useStyles();
  const entries = entriesFor(downloads, videos, true);
  if (!entries.length) {
    return <Empty icon="download" title={KID_COPY.downloadsEmptyTitle} body={KID_COPY.downloadsEmptyBody} />;
  }
  return <View style={styles.downloadsWrap}><DownloadList entries={entries} onPlay={onPlay} /></View>;
}
