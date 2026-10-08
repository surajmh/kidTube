import { channelRepository } from '../repositories/channelRepository';
import { profileRepository } from '../repositories/profileRepository';
import { videoRepository } from '../repositories/videoRepository';
import { settingsRepository } from '../repositories/playbackSettingsRepository';
import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../types';
import { sanitizeSettings } from './contentValidation';
import type { PlaybackSettings } from '../types';
import type { ContentCandidate } from '../types';
import { parentSessionService } from './auth/parentSession';
import { id } from '../utils/id';

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

  async addVideo(video: ApprovedVideo, videos: ApprovedVideo[]) {
    parentSessionService.require('approve a video');
    if (!video.youtubeVideoId) throw new ParentContentError('A video needs a YouTube video ID.');
    if (videos.some((item) => item.youtubeVideoId === video.youtubeVideoId)) {
      throw new ParentContentError('That video is already in your library.');
    }
    const next = [{ ...video, candidate: false }, ...videos];
    await videoRepository.saveAll(next);
    return next;
  },

  async addChannel(channel: ApprovedChannel, channels: ApprovedChannel[]) {
    parentSessionService.require('approve a channel');
    if (!channel.channelId) throw new ParentContentError('A channel needs a YouTube channel ID.');
    if (channels.some((item) => item.channelId === channel.channelId)) {
      throw new ParentContentError('That channel is already in your library.');
    }
    const next = [{ ...channel, approved: true }, ...channels];
    await channelRepository.saveAll(next);
    return next;
  },

  /**
   * Adds an unapproved library row from a parent search result. Candidates are
   * never playable - children can only ask for them.
   */
  async addCandidate(candidate: ContentCandidate, content: { videos: ApprovedVideo[]; channels: ApprovedChannel[] }) {
    parentSessionService.require('save a content candidate');
    if (candidate.type === 'video') {
      if (!candidate.youtubeVideoId) throw new ParentContentError('That video link is missing an ID.');
      const video: ApprovedVideo = {
        id: id('video'),
        youtubeVideoId: candidate.youtubeVideoId,
        title: candidate.title,
        thumbnailUrl: candidate.thumbnailUrl,
        channelName: candidate.channelName,
        sourceUrl: `https://www.youtube.com/watch?v=${candidate.youtubeVideoId}`,
        approved: false,
        candidate: true,
      };
      const videos = [video, ...content.videos.filter((item) => item.youtubeVideoId !== candidate.youtubeVideoId)];
      await videoRepository.saveAll(videos);
      return { videos, channels: content.channels };
    }
    if (!candidate.youtubeChannelId) throw new ParentContentError('That channel link is missing an ID.');
    const channel: ApprovedChannel = {
      id: id('channel'),
      name: candidate.title,
      channelId: candidate.youtubeChannelId,
      thumbnailUrl: candidate.thumbnailUrl,
      sourceUrl: `https://www.youtube.com/channel/${candidate.youtubeChannelId}`,
      approved: false,
    };
    const channels = [channel, ...content.channels.filter((item) => item.channelId !== candidate.youtubeChannelId)];
    await channelRepository.saveAll(channels);
    return { videos: content.videos, channels };
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

  async setVideoApproved(videoId: string, approved: boolean, videos: ApprovedVideo[]) {
    parentSessionService.require('change a video approval');
    const next = videos.map((video) => (video.id === videoId ? { ...video, approved, candidate: approved ? false : video.candidate } : video));
    await videoRepository.saveAll(next);
    return next;
  },

  async setChannelApproved(channelId: string, approved: boolean, channels: ApprovedChannel[]) {
    parentSessionService.require('change a channel approval');
    const next = channels.map((channel) => (channel.id === channelId ? { ...channel, approved } : channel));
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
