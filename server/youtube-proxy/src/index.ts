/**
 * Nestling YouTube metadata proxy.
 *
 * The only place the YouTube Data API v3 key exists. The app talks to this
 * endpoint and never receives the key, so the credential cannot be extracted
 * from a device (§11).
 *
 * Metadata only. This service never touches playback: the app plays videos
 * through its own native Media3/ExoPlayer adapter.
 *
 * Routes
 *   GET /health
 *   GET /resolve?handle=@name | ?user=Name      -> { youtubeChannelId }
 *   GET /channels/:id                           -> channel metadata + uploads playlist
 *   GET /channels/:id/videos?pageToken=&maxResults=  -> one page of uploads
 *
 * Quota efficiency (§12): a channel page costs 2 units
 * (channels.list + playlistItems.list) or 3 when durations are added
 * (videos.list). `search.list` is deliberately never used (§4) — the uploads
 * playlist is the documented way to list a channel's own uploads.
 */

type Env = {
  YOUTUBE_API_KEY?: string;
  /** Optional: when set, callers must send Authorization: Bearer <token>. */
  PROXY_TOKEN?: string;
};

type Json = Record<string, unknown>;

const apiBase = 'https://www.googleapis.com/youtube/v3';
const defaultPageSize = 30;
const maxPageSize = 50;

/** Short upstream cache: YouTube metadata changes slowly, so this caps quota use. */
const channelCacheSeconds = 600;
const videoCacheSeconds = 300;

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });

/** Error shape the app understands: { error: { code, message } }. */
const fail = (status: number, code: string, message: string) => json({ error: { code, message } }, status);

const channelIdPattern = /^UC[A-Za-z0-9_-]{22}$/;
const handlePattern = /^@[A-Za-z0-9._-]{3,60}$/;
const legacyNamePattern = /^[A-Za-z0-9._-]{1,60}$/;

/** Trims and collapses a YouTube text field; `undefined` when empty. */
function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function bestThumbnail(thumbnails: unknown): string | undefined {
  if (!thumbnails || typeof thumbnails !== 'object') return undefined;
  const set = thumbnails as Record<string, { url?: unknown } | undefined>;
  for (const size of ['medium', 'high', 'standard', 'default']) {
    const url = text(set[size]?.url);
    if (url) return url;
  }
  return undefined;
}

/** ISO 8601 durations (PT1H2M3S) to seconds. Returns undefined for `P0D`/live. */
export function parseIsoDuration(value: unknown): number | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  const match = raw.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return undefined;
  const [, days, hours, minutes, seconds] = match;
  const total =
    (Number(days ?? 0) * 86400) + (Number(hours ?? 0) * 3600) + (Number(minutes ?? 0) * 60) + Number(seconds ?? 0);
  return Number.isFinite(total) && total > 0 ? total : undefined;
}

async function youTube(
  path: string,
  params: Record<string, string | undefined>,
  apiKey: string,
  cacheSeconds: number,
): Promise<{ ok: true; body: Json } | { ok: false; status: number; code: string; message: string }> {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}?${query}&key=${encodeURIComponent(apiKey)}`, {
      cf: { cacheTtl: cacheSeconds, cacheEverything: true },
    } as RequestInit);
  } catch {
    return { ok: false, status: 502, code: 'UPSTREAM_UNAVAILABLE', message: 'YouTube could not be reached.' };
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { errors?: Array<{ reason?: string }> } } | null;
    const reason = payload?.error?.errors?.[0]?.reason ?? '';
    if (response.status === 403 && /quota/i.test(reason)) {
      return { ok: false, status: 403, code: 'QUOTA_EXCEEDED', message: 'The YouTube data quota for today is used up.' };
    }
    if (response.status === 400 && /keyInvalid|badRequest/i.test(reason)) {
      return { ok: false, status: 500, code: 'BAD_KEY', message: 'The configured YouTube API key was rejected.' };
    }
    if (response.status === 404) {
      return { ok: false, status: 404, code: 'NOT_FOUND', message: 'That channel or video does not exist.' };
    }
    return { ok: false, status: 502, code: 'UPSTREAM_ERROR', message: `YouTube returned ${response.status}.` };
  }

  const body = (await response.json().catch(() => null)) as Json | null;
  if (!body) return { ok: false, status: 502, code: 'MALFORMED_UPSTREAM', message: 'YouTube sent an unreadable response.' };
  return { ok: true, body };
}

function channelFromResource(resource: Json | undefined) {
  const id = text(resource?.id);
  if (!id) return undefined;
  const snippet = (resource?.snippet ?? {}) as Json;
  const details = (resource?.contentDetails ?? {}) as Json;
  const playlists = (details.relatedPlaylists ?? {}) as Json;
  return {
    youtubeChannelId: id,
    name: text(snippet.title) ?? id,
    thumbnailUrl: bestThumbnail(snippet.thumbnails),
    description: text(snippet.description),
    uploadsPlaylistId: text(playlists.uploads),
  };
}

async function resolveChannelId(params: URLSearchParams, apiKey: string) {
  const handle = text(params.get('handle'));
  const user = text(params.get('user'));
  const id = text(params.get('id'));
  if (id) return channelIdPattern.test(id) ? { ok: true as const, id } : { ok: false as const };

  if (handle) {
    const clean = handle.startsWith('@') ? handle : `@${handle}`;
    if (!handlePattern.test(clean) && !legacyNamePattern.test(handle.replace(/^@/, ''))) return { ok: false as const };
    const result = await youTube('/channels', { part: 'id', forHandle: clean }, apiKey, channelCacheSeconds);
    if (!result.ok) return result;
    const first = (result.body.items as Json[] | undefined)?.[0];
    const resolved = text(first?.id);
    return resolved ? { ok: true as const, id: resolved } : { ok: false as const };
  }

  if (user) {
    if (!legacyNamePattern.test(user)) return { ok: false as const };
    const result = await youTube('/channels', { part: 'id', forUsername: user }, apiKey, channelCacheSeconds);
    if (!result.ok) return result;
    const first = (result.body.items as Json[] | undefined)?.[0];
    const resolved = text(first?.id);
    return resolved ? { ok: true as const, id: resolved } : { ok: false as const };
  }

  return { ok: false as const };
}

async function handleChannel(channelId: string, apiKey: string) {
  const result = await youTube('/channels', { part: 'snippet,contentDetails', id: channelId }, apiKey, channelCacheSeconds);
  if (!result.ok) return fail(result.status, result.code, result.message);
  const channel = channelFromResource((result.body.items as Json[] | undefined)?.[0]);
  if (!channel) return fail(404, 'CHANNEL_NOT_FOUND', 'That channel could not be found.');
  return json(channel, 200, { 'cache-control': `public, max-age=${channelCacheSeconds}` });
}

async function handleChannelVideos(channelId: string, params: URLSearchParams, apiKey: string) {
  const channelResult = await youTube(
    '/channels',
    { part: 'contentDetails,snippet', id: channelId },
    apiKey,
    channelCacheSeconds,
  );
  if (!channelResult.ok) return fail(channelResult.status, channelResult.code, channelResult.message);

  const channel = channelFromResource((channelResult.body.items as Json[] | undefined)?.[0]);
  if (!channel) return fail(404, 'CHANNEL_NOT_FOUND', 'That channel could not be found.');
  if (!channel.uploadsPlaylistId) {
    return fail(404, 'CHANNEL_NOT_FOUND', 'That channel has no public uploads.');
  }

  const requested = Number(params.get('maxResults') ?? defaultPageSize);
  const maxResults = String(
    Number.isFinite(requested) && requested > 0 ? Math.min(Math.floor(requested), maxPageSize) : defaultPageSize,
  );
  const pageToken = text(params.get('pageToken'));

  const playlistResult = await youTube(
    '/playlistItems',
    { part: 'contentDetails', playlistId: channel.uploadsPlaylistId, maxResults, pageToken },
    apiKey,
    videoCacheSeconds,
  );
  if (!playlistResult.ok) return fail(playlistResult.status, playlistResult.code, playlistResult.message);

  const items = (playlistResult.body.items as Json[] | undefined) ?? [];
  const videoIds: string[] = [];
  const publishedByVideoId = new Map<string, string>();
  for (const item of items) {
    const details = (item.contentDetails ?? {}) as Json;
    const videoId = text(details.videoId);
    if (!videoId || videoIds.includes(videoId)) continue;
    videoIds.push(videoId);
    const published = text(details.videoPublishedAt);
    if (published) publishedByVideoId.set(videoId, published);
  }

  const nextPageToken = text(playlistResult.body.nextPageToken);

  if (!videoIds.length) {
    return json({ channelId, videos: [], nextPageToken }, 200, { 'cache-control': `public, max-age=${videoCacheSeconds}` });
  }

  // One extra call for titles and durations. playlistItems does not report duration,
  // so videos.list is the only way to get it without a per-video request.
  const videosResult = await youTube(
    '/videos',
    { part: 'snippet,contentDetails', id: videoIds.join(',') },
    apiKey,
    videoCacheSeconds,
  );
  if (!videosResult.ok) return fail(videosResult.status, videosResult.code, videosResult.message);

  const byId = new Map<string, Json>();
  for (const resource of (videosResult.body.items as Json[] | undefined) ?? []) {
    const id = text(resource.id);
    if (id) byId.set(id, resource);
  }

  const videos = videoIds
    .map((videoId) => {
      const resource = byId.get(videoId);
      // A video that disappeared between the two calls (deleted or made private) is
      // skipped rather than returned half-populated.
      if (!resource) return undefined;
      const snippet = (resource.snippet ?? {}) as Json;
      const details = (resource.contentDetails ?? {}) as Json;
      return {
        youtubeVideoId: videoId,
        youtubeChannelId: channel.youtubeChannelId,
        channelName: channel.name,
        title: text(snippet.title) ?? `Video ${videoId}`,
        thumbnailUrl: bestThumbnail(snippet.thumbnails),
        publishedAt: text(snippet.publishedAt) ?? publishedByVideoId.get(videoId),
        durationSeconds: parseIsoDuration(details.duration),
      };
    })
    .filter((video): video is NonNullable<typeof video> => Boolean(video));

  return json(
    { channelId: channel.youtubeChannelId, videos, nextPageToken },
    200,
    { 'cache-control': `public, max-age=${videoCacheSeconds}` },
  );
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'GET') return fail(405, 'METHOD_NOT_ALLOWED', 'Only GET is supported.');

  if (url.pathname === '/health') return json({ ok: true, service: 'nestling-youtube-proxy', version: 1 });

  if (!env.YOUTUBE_API_KEY) {
    return fail(500, 'NOT_CONFIGURED', 'This proxy has no YouTube API key configured.');
  }

  // Optional shared token. It is a proxy credential, never the API key, and it is
  // only enforced when the deployment sets one.
  if (env.PROXY_TOKEN) {
    const header = request.headers.get('authorization') ?? '';
    if (header !== `Bearer ${env.PROXY_TOKEN}`) {
      return fail(401, 'UNAUTHORIZED', 'A valid proxy token is required.');
    }
  }

  if (url.pathname === '/resolve') {
    const resolved = await resolveChannelId(url.searchParams, env.YOUTUBE_API_KEY);
    if (!resolved.ok) {
      if ('status' in resolved) return fail(resolved.status, resolved.code, resolved.message);
      return fail(404, 'CHANNEL_NOT_FOUND', 'That channel could not be found.');
    }
    return json({ youtubeChannelId: resolved.id }, 200, { 'cache-control': `public, max-age=${channelCacheSeconds}` });
  }

  const match = url.pathname.match(/^\/channels\/([^/]+)(\/videos)?$/);
  if (match) {
    const channelId = decodeURIComponent(match[1]);
    if (!channelIdPattern.test(channelId)) return fail(400, 'INVALID_CHANNEL_ID', 'That is not a valid channel ID.');
    return match[2]
      ? handleChannelVideos(channelId, url.searchParams, env.YOUTUBE_API_KEY)
      : handleChannel(channelId, env.YOUTUBE_API_KEY);
  }

  return fail(404, 'NOT_FOUND', 'Unknown route.');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch {
      return fail(500, 'PROXY_ERROR', 'The metadata provider hit an unexpected error.');
    }
  },
};
