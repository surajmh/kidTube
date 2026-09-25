import { channelRepository } from '../repositories/channelRepository';
import { videoRepository } from '../repositories/videoRepository';
import { requestRepository } from '../repositories/parentalControlsRepository';
import { ApprovedChannel, ApprovedVideo } from '../types';
import {
  ApprovalDuration,
  ApprovalTarget,
  ContentApproval,
  ContentRequest,
  RequestType,
} from '../parentalControlsTypes';
import { ParentSession, parentSessionService } from './auth/parentSession';
import { approvalService } from './approvalService';

export class RequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestError';
  }
}

export type RequestSubmission = {
  type: RequestType;
  /** Free text from the child. Never a URL. */
  title: string;
  /** Optional: must reference content already known to the parent library. */
  videoId?: string;
  channelId?: string;
  thumbnailUrl?: string;
  channelName?: string;
};

export type RequestDecision = 'approved' | 'rejected';

export type RequestWorkflowInput = {
  request: ContentRequest;
  decision: RequestDecision;
  /** `null` approves for every child. */
  profileId: string | null;
  duration: ApprovalDuration;
  requests: ContentRequest[];
  videos: ApprovedVideo[];
  channels: ApprovedChannel[];
};

export type RequestWorkflowResult = {
  requests: ContentRequest[];
  approvals: ContentApproval[];
  videos: ApprovedVideo[];
  channels: ApprovedChannel[];
};

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function requestTarget(request: ContentRequest): ApprovalTarget | null {
  if (request.type === 'video' && request.youtubeVideoId) return { type: 'video', youtubeVideoId: request.youtubeVideoId };
  if (request.type === 'channel' && request.youtubeChannelId) return { type: 'channel', youtubeChannelId: request.youtubeChannelId };
  return null;
}

export function describeRequestTarget(request: ContentRequest) {
  if (request.youtubeVideoId) return request.youtubeVideoId;
  if (request.youtubeChannelId) return request.youtubeChannelId;
  return 'Free-text request';
}

/** Turns an approved request into whitelist rows so family-wide approvals keep working. */
export function upsertApprovedContent(
  request: ContentRequest,
  videos: ApprovedVideo[],
  channels: ApprovedChannel[],
): { videos: ApprovedVideo[]; channels: ApprovedChannel[] } {
  if (request.type === 'video') {
    const existing = videos.find((video) => video.youtubeVideoId === request.youtubeVideoId);
    if (existing) {
      return {
        videos: videos.map((video) =>
          video.id === existing.id ? { ...video, approved: true, candidate: false, title: video.title || request.title || video.title } : video,
        ),
        channels,
      };
    }
    if (!request.youtubeVideoId) return { videos, channels };
    return {
      videos: [
        {
          id: newId('video'),
          youtubeVideoId: request.youtubeVideoId,
          title: request.title?.trim() || 'Approved video',
          thumbnailUrl: request.thumbnailUrl,
          channelId: undefined,
          channelName: request.channelName,
          approved: true,
        },
        ...videos,
      ],
      channels,
    };
  }

  if (!request.youtubeChannelId) return { videos, channels };
  const existing = channels.find((channel) => channel.channelId === request.youtubeChannelId);
  if (existing) {
    return {
      videos,
      channels: channels.map((channel) => (channel.id === existing.id ? { ...channel, approved: true } : channel)),
    };
  }
  return {
    videos,
    channels: [
      {
        id: newId('channel'),
        name: request.channelName?.trim() || request.title?.trim() || 'Approved channel',
        channelId: request.youtubeChannelId,
        thumbnailUrl: request.thumbnailUrl,
        approved: true,
      },
      ...channels,
    ],
  };
}

export class RequestService {
  pending(requests: ContentRequest[]) {
    return requests.filter((request) => request.status === 'pending');
  }

  pendingCount(requests: ContentRequest[]) {
    return this.pending(requests).length;
  }

  forProfile(requests: ContentRequest[], profileId: string) {
    return requests.filter((request) => request.profileId === profileId);
  }

  /**
   * Child-facing. Content identifiers are accepted only when the parent library
   * already knows about them, so Kid Mode can never introduce arbitrary YouTube
   * content - free-text titles go to a parent for a decision instead.
   */
  async submit(
    profileId: string,
    input: RequestSubmission,
    content: { videos: ApprovedVideo[]; channels: ApprovedChannel[]; requests: ContentRequest[] },
  ): Promise<ContentRequest> {
    const title = input.title.trim().slice(0, 80);
    if (!title) throw new RequestError('Add a name so your grown-up knows what to look for.');

    let youtubeVideoId: string | undefined;
    let youtubeChannelId: string | undefined;

    if (input.videoId) {
      const video = content.videos.find((item) => item.youtubeVideoId === input.videoId);
      if (!video) throw new RequestError('That video is not in your family library yet.');
      youtubeVideoId = video.youtubeVideoId;
    }
    if (input.channelId) {
      const channel = content.channels.find((item) => item.channelId === input.channelId);
      if (!channel) throw new RequestError('That channel is not in your family library yet.');
      youtubeChannelId = channel.channelId;
    }
    if (input.type === 'video' && !youtubeVideoId && input.channelId) {
      throw new RequestError('That request looks like a channel request.');
    }

    const duplicate = content.requests.some(
      (request) =>
        request.profileId === profileId &&
        request.status === 'pending' &&
        (youtubeVideoId ? request.youtubeVideoId === youtubeVideoId : request.title?.toLowerCase() === title.toLowerCase()),
    );
    if (duplicate) throw new RequestError('You already asked for this one. Your grown-up will see it soon.');

    const request: ContentRequest = {
      id: newId('request'),
      profileId,
      type: input.type,
      youtubeVideoId,
      youtubeChannelId,
      title,
      thumbnailUrl: input.thumbnailUrl,
      channelName: input.channelName,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    const next = [request, ...content.requests];
    await requestRepository.saveAll(next);
    return request;
  }

  /** Parent-only. Approves (permanently / temporarily / for one playback) or rejects. */
  async decide(session: ParentSession, input: RequestWorkflowInput): Promise<RequestWorkflowResult> {
    parentSessionService.require('decide a content request');

    const requests = input.requests.map((request) =>
      request.id === input.request.id
        ? {
            ...request,
            status: input.decision,
            resolvedAt: new Date().toISOString(),
            resolution: input.decision === 'approved' ? input.duration : undefined,
          }
        : request,
    );
    await requestRepository.saveAll(requests);

    if (input.decision === 'rejected') {
      return { requests, approvals: approvalService.all(), videos: input.videos, channels: input.channels };
    }

    const target = requestTarget(input.request);
    if (!target) {
      // Free-text request: nothing playable is created, the parent approved the idea.
      return { requests, approvals: approvalService.all(), videos: input.videos, channels: input.channels };
    }

    // Family-wide permanent approval lives in the Phase 1 whitelist, not as a grant.
    if (input.duration === 'permanent' && input.profileId === null) {
      const nextContent = upsertApprovedContent(input.request, input.videos, input.channels);
      await videoRepository.saveAll(nextContent.videos);
      await channelRepository.saveAll(nextContent.channels);
      return { requests, approvals: approvalService.all(), videos: nextContent.videos, channels: nextContent.channels };
    }

    const { approvals } = await approvalService.grant(session, {
      profileId: input.profileId,
      target,
      duration: input.duration,
      requestId: input.request.id,
    });
    return { requests, approvals, videos: input.videos, channels: input.channels };
  }

  /** Parent-only. */
  async deleteRequest(session: ParentSession, requestId: string, requests: ContentRequest[]) {
    parentSessionService.require('delete a content request');
    const next = requests.filter((request) => request.id !== requestId);
    await requestRepository.saveAll(next);
    return next;
  }
  /** Parent-only. Removes a resolved request from the inbox history. */
  async clearResolved(session: ParentSession, requests: ContentRequest[]) {
    parentSessionService.require('clear resolved content requests');
    const next = requests.filter((request) => request.status === 'pending');
    await requestRepository.saveAll(next);
    return next;
  }
}

export const requestService = new RequestService();
