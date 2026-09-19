# Nestling YouTube metadata proxy

A single Cloudflare Worker that turns a YouTube Data API v3 key into three
read-only endpoints. Nestling never sees the key: it only knows this Worker's URL.

This exists because the app needs a channel's uploaded videos (see
`PHASE-6-CHANNEL-DISCOVERY.md`), and the YouTube Data API requires an API key for
that. Putting the key in the mobile app would mean shipping a credential that can
be extracted from a device and used against your quota by anyone.

**Metadata only.** This Worker never resolves playback streams. Video playback
stays inside the app's own native Media3/ExoPlayer adapter.

## Endpoints

| Route | Returns |
| --- | --- |
| `GET /health` | `{ ok: true, ... }` |
| `GET /resolve?handle=@name` | `{ youtubeChannelId }` |
| `GET /resolve?user=LegacyName` | `{ youtubeChannelId }` |
| `GET /channels/:id` | name, thumbnail, `uploadsPlaylistId` |
| `GET /channels/:id/videos?pageToken=&maxResults=` | one page of videos + `nextPageToken` |

Only the `channels`, `playlistItems` and `videos` resources are used.
`search.list` is deliberately never called: Google documents the uploads playlist
as the reliable way to list a channel's own uploads, and search costs 100 quota
units per call instead of 1.

## Deploy

1. **Get an API key.** In the [Google Cloud console](https://console.cloud.google.com/):
   create a project, enable **YouTube Data API v3**, then create an **API key**.
   Restrict the key to *YouTube Data API v3* so it cannot be used for anything else.
   You do **not** need OAuth — this reads public data only.

2. **Deploy the Worker.**

   ```bash
   cd server/youtube-proxy
   npx wrangler login
   npx wrangler secret put YOUTUBE_API_KEY   # paste the key from step 1
   npx wrangler deploy
   ```

   `wrangler deploy` prints the URL, e.g.
   `https://nestling-youtube-proxy.<your-subdomain>.workers.dev`.

3. **(Optional) Require a token.** If you would rather the endpoint not be open to
   anyone who learns the URL:

   ```bash
   npx wrangler secret put PROXY_TOKEN      # any long random string
   ```

   Then paste the same value into the app's *Provider token* field. This token is
   a proxy credential, not the API key — leaking it costs you quota calls, not your
   Google project.

4. **Check it.**

   ```bash
   curl https://<your-worker-url>/health
   curl "https://<your-worker-url>/resolve?handle=@MrBeast"
   ```

5. **Connect the app.** Open Nestling → Parent Mode → **Playback** → *Metadata
   provider*, paste the Worker URL, and press **Connect**. Then approve a channel:
   its uploads are fetched immediately.

## Quota

The free tier is 10,000 units per day.

| Action | Cost |
| --- | --- |
| Load a channel page | 2 units (3 when durations are fetched) |
| `Load more` | 3 units per 30 videos |
| Refresh | 3 units |

Results are cached at the edge for 5–10 minutes, and the app itself will not
re-fetch a channel it already loaded within six hours unless you press **Refresh**.
That is roughly a full channel refresh for a few hundred channels per day.

If the quota runs out, the app says so and keeps showing every video it has
already cached — nothing is lost.

## Local development

```bash
cd server/youtube-proxy
echo 'YOUTUBE_API_KEY="your-key"' > .dev.vars   # git-ignored
npx wrangler dev
```
