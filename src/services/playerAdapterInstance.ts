import { nativeYouTubePlayerAdapter } from '../native/YouTubePlayerAdapter';
import { ResumablePlayerAdapter } from './playerAdapter';

export const playerAdapter: ResumablePlayerAdapter = nativeYouTubePlayerAdapter;
