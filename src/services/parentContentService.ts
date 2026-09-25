import { channelRepository } from '../repositories/channelRepository';
import { profileRepository } from '../repositories/profileRepository';
import { videoRepository } from '../repositories/videoRepository';
import { settingsRepository } from '../repositories/playbackSettingsRepository';
import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../types';
import { PlaybackSettings } from '../playbackTypes';
import { ContentCandidate } from '../parentalControlsTypes';
import { ParentSession, parentSessionService } from './auth/parentSession';

export class ParentContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParentContentError';
  }
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const parentContentService = {
  /** Every mutation below is refused without a live parent session. */
  async saveProfiles(session: ParentSession, profiles: ChildProfile[]) {
    parentSessionService.require('change child profiles');
    await profileRepository.saveAll(profiles);
    return profiles;
  },

  async saveSettings(session: ParentSession, settings: PlaybackSettings) {
    parentSessionService.require('change playback settings');
    await settingsRepository.save(settings);
    return settings;
  },

  async replaceContent(session: ParentSession, content: { videos: ApprovedVideo[]; channels: ApprovedChannel[] }) {
    parentSessionService.require('change the approved library');
    await videoRepository.saveAll(content.videos);
    await channelRepository.saveAll(content.channels);
    return content;
  },

  async addVideo(session: ParentSession, video: ApprovedVideo, videos: ApprovedVideo[]) {
    parentSessionService.require('approve a video');
    if (!video.youtubeVideoId) throw new ParentContentError('A video needs a YouTube video ID.');
    if (videos.some((item) => item.youtubeVideoId === video.youtubeVideoId)) {
      throw new ParentContentError('That video is already in your library.');
    }
    const next = [{ ...video, candidate: false }, ...videos];
    await videoRepository.saveAll(next);
    return next;
  },

  async addChannel(session: ParentSession, channel: ApprovedChannel, channels: ApprovedChannel[]) {
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
  async addCandidate(session: ParentSession, candidate: ContentCandidate, content: { videos: ApprovedVideo[]; channels: ApprovedChannel[] }) {
    parentSessionService.require('save a content candidate');
    if (candidate.type === 'video') {
      if (!candidate.youtubeVideoId) throw new ParentContentError('That video link is missing an ID.');
      const video: ApprovedVideo = {
        id: newId('video'),
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
      id: newId('channel'),
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

  async removeVideo(session: ParentSession, videoId: string, videos: ApprovedVideo[]) {
    parentSessionService.require('remove a video approval');
    const next = videos.filter((video) => video.id !== videoId);
    await videoRepository.saveAll(next);
    return next;
  },

  async removeChannel(session: ParentSession, channelId: string, channels: ApprovedChannel[]) {
    parentSessionService.require('remove a channel approval');
    const next = channels.filter((channel) => channel.id !== channelId);
    await channelRepository.saveAll(next);
    return next;
  },

  async setVideoApproved(session: ParentSession, videoId: string, approved: boolean, videos: ApprovedVideo[]) {
    parentSessionService.require('change a video approval');
    const next = videos.map((video) => (video.id === videoId ? { ...video, approved, candidate: approved ? false : video.candidate } : video));
    await videoRepository.saveAll(next);
    return next;
  },

  async setChannelApproved(session: ParentSession, channelId: string, approved: boolean, channels: ApprovedChannel[]) {
    parentSessionService.require('change a channel approval');
    const next = channels.map((channel) => (channel.id === channelId ? { ...channel, approved } : channel));
    await channelRepository.saveAll(next);
    return next;
  },

  async setVideoCategories(session: ParentSession, videoId: string, categoryIds: string[], videos: ApprovedVideo[]) {
    parentSessionService.require('change video categories');
    const next = videos.map((video) => (video.id === videoId ? { ...video, categoryIds } : video));
    await videoRepository.saveAll(next);
    return next;
  },

  async setChannelCategories(session: ParentSession, channelId: string, categoryIds: string[], channels: ApprovedChannel[]) {
    parentSessionService.require('change channel categories');
    const next = channels.map((channel) => (channel.id === channelId ? { ...channel, categoryIds } : channel));
    await channelRepository.saveAll(next);
    return next;
  },

  /** Applies a category deletion to every stored membership. */
  async stripCategoryFromContent(session: ParentSession, categoryId: string, content: { videos: ApprovedVideo[]; channels: ApprovedChannel[] }) {
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
