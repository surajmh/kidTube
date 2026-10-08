import { channelRepository } from '../repositories/channelRepository';
import { profileRepository } from '../repositories/profileRepository';
import { videoRepository } from '../repositories/videoRepository';
import { settingsRepository } from '../repositories/playbackSettingsRepository';
import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../types';
import { sanitizeSettings } from './contentValidation';
import type { PlaybackSettings } from '../types';
import { parentSessionService } from './auth/parentSession';

export class ParentContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParentContentError';
  }
}

export const parentContentService = {
  /** Every mutation below is refused without a live parent session. */
  async saveProfiles(profiles: ChildProfile[]) {
    parentSessionService.require('change child profiles');
    await profileRepository.saveAll(profiles);
    return profiles;
  },

  async saveSettings(settings: PlaybackSettings) {
    parentSessionService.require('change playback settings');
    const next = sanitizeSettings(settings);
    await settingsRepository.save(next);
    return next;
  },

  async replaceContent(content: { videos: ApprovedVideo[]; channels: ApprovedChannel[] }) {
    parentSessionService.require('change the approved library');
    await videoRepository.saveAll(content.videos);
    await channelRepository.saveAll(content.channels);
    return content;
  },

  async removeVideo(videoId: string, videos: ApprovedVideo[]) {
    parentSessionService.require('remove a video approval');
    const next = videos.filter((video) => video.id !== videoId);
    await videoRepository.saveAll(next);
    return next;
  },

  async removeChannel(channelId: string, channels: ApprovedChannel[]) {
    parentSessionService.require('remove a channel approval');
    const next = channels.filter((channel) => channel.id !== channelId);
    await channelRepository.saveAll(next);
    return next;
  },

  async setVideoCategories(videoId: string, categoryIds: string[], videos: ApprovedVideo[]) {
    parentSessionService.require('change video categories');
    const next = videos.map((video) => (video.id === videoId ? { ...video, categoryIds } : video));
    await videoRepository.saveAll(next);
    return next;
  },

  async setChannelCategories(channelId: string, categoryIds: string[], channels: ApprovedChannel[]) {
    parentSessionService.require('change channel categories');
    const next = channels.map((channel) => (channel.id === channelId ? { ...channel, categoryIds } : channel));
    await channelRepository.saveAll(next);
    return next;
  },

  /** Applies a category deletion to every stored membership. */
  async stripCategoryFromContent(categoryId: string, content: { videos: ApprovedVideo[]; channels: ApprovedChannel[] }) {
    parentSessionService.require('change video categories');
    const videos = content.videos.map((video) =>
      video.categoryIds?.includes(categoryId)
        ? { ...video, categoryIds: video.categoryIds.filter((id) => id !== categoryId) }
        : video,
    );
    const channels = content.channels.map((channel) =>
      channel.categoryIds?.includes(categoryId)
        ? { ...channel, categoryIds: channel.categoryIds.filter((id) => id !== categoryId) }
        : channel,
    );
    await videoRepository.saveAll(videos);
    await channelRepository.saveAll(channels);
    return { videos, channels };
  },
};
