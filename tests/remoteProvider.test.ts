import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RemoteYouTubeContentProvider } from '../src/services/content/remoteYouTubeContentProvider';
import { YouTubeProviderError, classifyProviderError } from '../src/services/content/youtubeContentProvider';
import { validateEndpoint } from '../src/services/content/providerSettingsRules';
import { UnconfiguredContentProvider, providerFor } from '../src/services/content/providerSettings';
import { channelA, fakeFetch } from './helpers/fakeProvider';

const endpointUrl = 'https://proxy.example.workers.dev';

function provider(handler: Parameters<typeof fakeFetch>[0], token?: string) {
  return new RemoteYouTubeContentProvider({ endpointUrl, token }, fakeFetch(handler));
}

describe('transport (§11)', () => {
  it('never sends anything but the request and the optional proxy token', async () => {
    const seen: Array<{ url: string; headers?: Record<string, string> }> = [];
    const client = provider((url, init) => {
      seen.push({ url, headers: init?.headers });
      return { body: { youtubeChannelId: channelA, name: 'Story Time' } };
    });

    await client.getChannel(channelA);

    assert.equal(seen.length, 1);
    assert.equal(seen[0].url, `${endpointUrl}/channels/${channelA}`);
    // The only credential in flight is the proxy token — never a YouTube API key.
    assert.deepEqual(Object.keys(seen[0].headers ?? {}).sort(), ['accept']);
    assert.equal(JSON.stringify(seen[0]).includes('key='), false);
  });

  it('sends the proxy token as a bearer header when one is configured', async () => {
    const seen: Array<Record<string, string> | undefined> = [];
    const client = provider((_url, init) => {
      seen.push(init?.headers);
      return { body: { youtubeChannelId: channelA, name: 'Story Time' } };
    }, 'secret-token');

    await client.getChannel(channelA);
    assert.equal(seen[0]?.authorization, 'Bearer secret-token');
  });

  it('passes the page token and page size through', async () => {
    const urls: string[] = [];
    const client = provider((url) => {
      urls.push(url);
      return { body: { channelId: channelA, videos: [] } };
    });

    await client.getChannelVideos(channelA, { pageToken: 'CAoQAA', maxResults: 20 });
    assert.match(urls[0], /pageToken=CAoQAA/);
    assert.match(urls[0], /maxResults=20/);
  });

  it('resolves a handle through the provider rather than guessing an id', async () => {
    const urls: string[] = [];
    const client = provider((url) => {
      urls.push(url);
      return { body: { youtubeChannelId: channelA } };
    });

    const id = await client.resolveChannelId('@MrBeast');
    assert.equal(id, channelA);
    assert.match(urls[0], /handle=%40MrBeast/);
  });

  it('skips the round trip for an id it can already trust', async () => {
    let calls = 0;
    const client = provider(() => {
      calls += 1;
      return { body: { youtubeChannelId: channelA } };
    });
    assert.equal(await client.resolveChannelId(channelA), channelA);
    assert.equal(calls, 0);
  });

  it('resolves a legacy /user/ name through the provider', async () => {
    const urls: string[] = [];
    const client = provider((url) => {
      urls.push(url);
      return { body: { youtubeChannelId: channelA } };
    });
    await client.resolveChannelId('/user/OldChannel');
    assert.match(urls[0], /user=OldChannel/);
  });
});

describe('status mapping (§13)', () => {
  const cases: Array<{ status: number; code: string; retryable: boolean }> = [
    { status: 400, code: 'INVALID_INPUT', retryable: false },
    { status: 401, code: 'QUOTA_EXCEEDED', retryable: false },
    { status: 403, code: 'QUOTA_EXCEEDED', retryable: false },
    { status: 404, code: 'CHANNEL_NOT_FOUND', retryable: false },
    { status: 429, code: 'RATE_LIMITED', retryable: true },
    { status: 500, code: 'SERVER', retryable: true },
    { status: 504, code: 'TIMEOUT', retryable: true },
  ];

  for (const testCase of cases) {
    it(`maps ${testCase.status} to ${testCase.code}`, async () => {
      const client = provider(() => ({ status: testCase.status }));
      await assert.rejects(
        () => client.getChannel(channelA),
        (error: unknown) => {
          assert.ok(error instanceof YouTubeProviderError);
          assert.equal(error.code, testCase.code);
          assert.equal(error.retryable, testCase.retryable);
          assert.equal(error.status, testCase.status);
          // Every failure carries parent-facing copy, never a raw stack or status code.
          assert.ok(error.message.length > 0);
          assert.equal(error.message.includes(String(testCase.status)), false);
          return true;
        },
      );
    });
  }

  it('maps a network failure and a timeout', async () => {
    const offline = provider(() => ({ throws: new Error('Network request failed') }));
    await assert.rejects(() => offline.getChannel(channelA), (error: unknown) => {
      assert.equal((error as YouTubeProviderError).code, 'NETWORK');
      return true;
    });

    const aborted = provider(() => ({ throws: new Error('Aborted') }));
    await assert.rejects(() => aborted.getChannel(channelA), (error: unknown) => {
      assert.equal((error as YouTubeProviderError).code, 'TIMEOUT');
      return true;
    });
  });

  it('maps an unreadable body rather than returning undefined', async () => {
    const client = provider(() => ({ invalidJson: true }));
    await assert.rejects(() => client.getChannel(channelA), (error: unknown) => {
      assert.equal((error as YouTubeProviderError).code, 'MALFORMED_RESPONSE');
      return true;
    });
  });

  it('maps a well-formed response that is missing the channel', async () => {
    const client = provider(() => ({ body: { hello: 'world' } }));
    await assert.rejects(() => client.getChannel(channelA), (error: unknown) => {
      assert.equal((error as YouTubeProviderError).code, 'CHANNEL_NOT_FOUND');
      return true;
    });
  });

  it('maps a resolve that returns no channel', async () => {
    const client = provider(() => ({ body: {} }));
    await assert.rejects(() => client.resolveChannelId('@Nobody'), (error: unknown) => {
      assert.equal((error as YouTubeProviderError).code, 'CHANNEL_NOT_FOUND');
      return true;
    });
  });
});

describe('configuration boundary (§11)', () => {
  it('refuses with NOT_CONFIGURED when no endpoint is set', async () => {
    const client = new UnconfiguredContentProvider();
    await assert.rejects(() => client.getChannel(channelA), (error: unknown) => {
      assert.equal((error as YouTubeProviderError).code, 'NOT_CONFIGURED');
      return true;
    });
    await assert.rejects(() => client.getChannelVideos(channelA), (error: unknown) => {
      assert.equal((error as YouTubeProviderError).code, 'NOT_CONFIGURED');
      return true;
    });
  });

  it('builds a remote provider only when an endpoint is configured', () => {
    // Without an endpoint the on-device extractor is used; it needs no configuration at all.
    assert.equal(providerFor(undefined).id, 'native-extractor');
    assert.equal(providerFor({ endpointUrl: '' }).id, 'native-extractor');
    assert.equal(providerFor({ endpointUrl }).id, 'remote');
  });

  it('still fails closed when neither an endpoint nor a native build is present', async () => {
    // Nothing injects the native module here, which is the case on a JS-only build. Missing
    // configuration must refuse loudly rather than quietly make content fetchable.
    const provider = providerFor(undefined);
    await assert.rejects(() => provider.getChannelVideos(channelA), (error: unknown) => {
      assert.equal((error as YouTubeProviderError).code, 'NOT_CONFIGURED');
      return true;
    });
    await assert.rejects(() => provider.resolveChannelId('@someone'), (error: unknown) => {
      assert.equal((error as YouTubeProviderError).code, 'NOT_CONFIGURED');
      return true;
    });
  });

  it('classifies a raw Error without leaking its message', () => {
    const classified = classifyProviderError(new Error('ECONNREFUSED at 10.0.0.1'));
    assert.equal(classified.code, 'UNKNOWN');
    assert.equal(classified.message.includes('ECONNREFUSED'), false);
  });
});

describe('endpoint validation', () => {
  it('accepts and normalises an https endpoint', () => {
    const result = validateEndpoint('https://Proxy.Example.Workers.dev/');
    assert.ok(result.ok);
    assert.equal(result.settings.endpointUrl, 'https://proxy.example.workers.dev');
    assert.equal(result.settings.token, undefined);
  });

  it('keeps a sub-path so a proxy behind a route still works', () => {
    const result = validateEndpoint('https://example.com/nestling/youtube');
    assert.ok(result.ok);
    assert.equal(result.settings.endpointUrl, 'https://example.com/nestling/youtube');
  });

  it('drops a query string and fragment', () => {
    const result = validateEndpoint('https://example.com/api?token=abc#frag');
    assert.ok(result.ok);
    assert.equal(result.settings.endpointUrl, 'https://example.com/api');
  });

  it('refuses plaintext, missing hosts and junk', () => {
    assert.equal(validateEndpoint('http://example.com').ok, false);
    assert.equal(validateEndpoint('example.com').ok, false);
    assert.equal(validateEndpoint('https://').ok, false);
    assert.equal(validateEndpoint('https://user:pass@example.com').ok, false);
    assert.equal(validateEndpoint('https://localhost').ok, false);
    assert.equal(validateEndpoint('').ok, false);
  });

  it('stores a trimmed token and omits an empty one', () => {
    const withToken = validateEndpoint('https://example.com', '  abc123  ');
    assert.ok(withToken.ok);
    assert.equal(withToken.settings.token, 'abc123');

    const withoutToken = validateEndpoint('https://example.com', '   ');
    assert.ok(withoutToken.ok);
    assert.equal(withoutToken.settings.token, undefined);
  });
});
