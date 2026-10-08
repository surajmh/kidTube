import type { ApprovedVideo } from '../types';
import type { SavedVideo } from '../services/downloadService.type';

/** What the kid screens need to offer, show and start downloads for the active child. */
export type ChildDownloads = {
  /** False when a parent has switched saving off, or there is no child selected. */
  enabled: boolean;
  /** This child's downloads, in whatever state the device reports. */
  mine: SavedVideo[];
  /** The device's record of this video if this child has it, otherwise undefined. */
  itemFor: (video: ApprovedVideo) => SavedVideo | undefined;
  /** Qualities worth offering for a video: real ones, within the parent's ceiling. */
  options: (video: ApprovedVideo) => Promise<number[]>;
  /** Saves the video for this child at the chosen height. */
  start: (video: ApprovedVideo, height: number) => Promise<void>;
};
