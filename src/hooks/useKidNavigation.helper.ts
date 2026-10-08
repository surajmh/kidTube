export type ParentBackAction = 'close-channel' | 'go-home' | 'leave';

/** Back in Parent Mode goes up one level at a time: an open channel page, then the sub-menu, then out. */
export function parentBackAction(channelOpen: boolean, section: string): ParentBackAction {
  if (channelOpen) return 'close-channel';
  return section === 'home' ? 'leave' : 'go-home';
}
