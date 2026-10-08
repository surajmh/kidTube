import { nativeYouTubePlayerAdapter } from '../native/YouTubePlayerAdapter';
import type { ResumablePlayerAdapter } from './playerAdapter.type';

export const playerAdapter: ResumablePlayerAdapter = nativeYouTubePlayerAdapter;
