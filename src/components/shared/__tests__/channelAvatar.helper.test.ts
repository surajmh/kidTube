import { channelAvatarUri } from '../channelAvatar.helper';
import { ApprovedChannel } from '../../../types';

const channels: ApprovedChannel[] = [
  { id: 'a', name: 'Blender', channelId: 'UC-blender', thumbnailUrl: 'https://x/blender.jpg', approved: true },
  { id: 'b', name: 'No art', channelId: 'UC-noart', approved: true },
];

describe('channelAvatarUri', () => {
  it('joins a video to its channel artwork', () => {
    expect(channelAvatarUri(channels, { channelId: 'UC-blender' })).toBe('https://x/blender.jpg');
  });

  it('returns undefined for a video approved on its own, with no channel record', () => {
    expect(channelAvatarUri(channels, { channelId: undefined })).toBeUndefined();
    expect(channelAvatarUri(channels, { channelId: 'UC-unknown' })).toBeUndefined();
  });

  it('returns undefined when the channel is known but has no artwork', () => {
    // Undefined is the fallback signal, so this must not become null or an empty string.
    expect(channelAvatarUri(channels, { channelId: 'UC-noart' })).toBeUndefined();
  });

  it('survives an empty library', () => {
    expect(channelAvatarUri([], { channelId: 'UC-blender' })).toBeUndefined();
  });
});
