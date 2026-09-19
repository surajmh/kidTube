import {
  ChannelPageOptions,
  YouTubeChannel,
  YouTubeContentProvider,
  YouTubeProviderError,
  YouTubeProviderErrorCode,
  YouTubeVideoPage,
  providerErrorMessage,
} from './youtubeContentProvider';
import { isCanonicalChannelId, parseChannelResponse, parseVideoPage, channelPageSize } from './channelSyncRules';

/**
 * RemoteYouTubeContentProvider.
 *
 * Talks to a server/edge endpoint that holds the YouTube Data API key. The client
 * never receives that key (§11): it only knows the endpoint URL, and every request
 * is a plain read of public metadata.
 *
 * `fetchImpl` is injectable so the transport, error mapping and response validation
 * can be tested against fixtures with no network.
 */

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export type RemoteProviderConfig = {
  /** Base URL of the deployed proxy, e.g. https://nestling-yt.example.workers.dev */
  endpointUrl: string;
  /** Optional shared token for the proxy. Never the YouTube API key. */
  token?: string;
};

export const defaultProviderTimeoutMs = 12_000;

export class RemoteYouTubeContentProvider implements YouTubeContentProvider {
  readonly id = 'remote';

  constructor(
    private config: RemoteProviderConfig,
    private fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike,
    private timeoutMs: number = defaultProviderTimeoutMs,
  ) {}

  private buildUrl(path: string, params?: Record<string, string | number | undefined>) {
    const base = this.config.endpointUrl.replace(/\/+$/, '');
    const query = Object.entries(params ?? {})
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    return `${base}${path}${query ? `?${query}` : ''}`;
  }

  private async request(path: string, params?: Record<string, string | number | undefined>): Promise<unknown> {
    if (!this.config.endpointUrl) {
      throw new YouTubeProviderError('NOT_CONFIGURED', providerErrorMessage('NOT_CONFIGURED'));
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timer = setTimeout(() => controller?.abort(), this.timeoutMs);

    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await this.fetchImpl(this.buildUrl(path, params), {
        method: 'GET',
        headers: {
          accept: 'application/json',
          ...(this.config.token ? { authorization: `Bearer ${this.config.token}` } : {}),
        },
        signal: controller?.signal,
      });
    } catch (caught) {
      const aborted = caught instanceof Error && /abort/i.test(caught.message);
      const code: YouTubeProviderErrorCode = aborted ? 'TIMEOUT' : 'NETWORK';
      throw new YouTubeProviderError(code, providerErrorMessage(code), true);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) throw this.errorForStatus(response.status);

    try {
      return await response.json();
    } catch {
      throw new YouTubeProviderError('MALFORMED_RESPONSE', providerErrorMessage('MALFORMED_RESPONSE'));
    }
  }

  /**
   * Maps HTTP status onto the provider taxonomy. Quota and rate limits are
   * separated from real errors because they need different wording and only the
   * former is worth retrying tomorrow rather than in a minute.
   */
  private errorForStatus(status: number): YouTubeProviderError {
    let code: YouTubeProviderErrorCode = 'SERVER';
    let retryable = true;
    if (status === 400) {
      code = 'INVALID_INPUT';
      retryable = false;
    } else if (status === 401 || status === 403) {
      // A 403 from YouTube is almost always quota or a rejected key; both are
      // reported to the parent rather than retried in a loop.
      code = 'QUOTA_EXCEEDED';
      retryable = false;
    } else if (status === 404) {
      code = 'CHANNEL_NOT_FOUND';
      retryable = false;
    } else if (status === 429) {
      code = 'RATE_LIMITED';
      retryable = true;
    } else if (status === 408 || status === 504) {
      code = 'TIMEOUT';
      retryable = true;
    }
    return new YouTubeProviderError(code, providerErrorMessage(code), retryable, status);
  }

  async resolveChannelId(reference: string): Promise<string> {
    const trimmed = reference.trim();
    // A canonical id needs no round trip.
    if (isCanonicalChannelId(trimmed)) return trimmed;

    const params: Record<string, string> = {};
    if (trimmed.startsWith('@')) params.handle = trimmed;
    else if (trimmed.startsWith('/user/')) params.user = trimmed.slice('/user/'.length);
    else params.handle = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;

    const payload = (await this.request('/resolve', params)) as { youtubeChannelId?: unknown } | null;
    const id = typeof payload?.youtubeChannelId === 'string' ? payload.youtubeChannelId.trim() : '';
    if (!id) {
      throw new YouTubeProviderError('CHANNEL_NOT_FOUND', providerErrorMessage('CHANNEL_NOT_FOUND'), false);
    }
    return id;
  }

  async getChannel(channelId: string): Promise<YouTubeChannel> {
    const payload = await this.request(`/channels/${encodeURIComponent(channelId)}`);
    return parseChannelResponse(payload);
  }

  async getChannelVideos(channelId: string, options?: ChannelPageOptions): Promise<YouTubeVideoPage> {
    const payload = await this.request(`/channels/${encodeURIComponent(channelId)}/videos`, {
      pageToken: options?.pageToken,
      maxResults: options?.maxResults ?? channelPageSize,
    });
    return parseVideoPage(payload, channelId);
  }
}
