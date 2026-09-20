import { readJson, writeJson } from '../../repositories/storage';
import { YouTubeContentProvider, YouTubeProviderError, providerErrorMessage } from './youtubeContentProvider';
import { RemoteYouTubeContentProvider, RemoteProviderConfig } from './remoteYouTubeContentProvider';
import { nativeYouTubeContentProvider } from './nativeYouTubeContentProvider';
import {
  ContentProviderSettings,
  EndpointValidation,
  emptyProviderSettings,
  isProviderConfigured,
  validateEndpoint,
} from './providerSettingsRules';

/**
 * Content provider settings.
 *
 * Only the endpoint URL and an optional proxy token live here. The YouTube Data
 * API key stays in the deployed endpoint — it is never sent to, stored on, or
 * reachable from the device (§11).
 */

export const contentProviderKey = '@nestling/content-provider';

// Re-exported so callers have one import site for provider configuration.
export { emptyProviderSettings, isProviderConfigured, validateEndpoint };
export type { ContentProviderSettings, EndpointValidation };

export const providerSettingsRepository = {
  get: () => readJson<ContentProviderSettings>(contentProviderKey, emptyProviderSettings),
  save: (settings: ContentProviderSettings) => writeJson(contentProviderKey, settings),
};

/**
 * A provider that is always present but always refuses.
 *
 * Returning this instead of `null` keeps every call site honest: a channel sync
 * fails with a clear "connect a provider" message rather than a null dereference,
 * and nothing accidentally becomes fetchable because configuration is missing.
 */
export class UnconfiguredContentProvider implements YouTubeContentProvider {
  readonly id = 'unconfigured';

  private refuse(): never {
    throw new YouTubeProviderError('NOT_CONFIGURED', providerErrorMessage('NOT_CONFIGURED'), false);
  }

  async resolveChannelId(_reference: string): Promise<string> {
    this.refuse();
  }

  async getChannel(_channelId: string): Promise<never> {
    this.refuse();
  }

  async getChannelVideos(_channelId: string): Promise<never> {
    this.refuse();
  }
}

export const unconfiguredContentProvider = new UnconfiguredContentProvider();

/**
 * The on-device extractor needs no endpoint, key or quota, so it is the default whenever the
 * native build is present. A configured endpoint still takes precedence, which keeps an existing
 * proxy install working; that override goes away with the Worker itself.
 */
export function providerFor(settings: ContentProviderSettings | undefined): YouTubeContentProvider {
  if (settings?.endpointUrl) {
    const config: RemoteProviderConfig = { endpointUrl: settings.endpointUrl, token: settings.token };
    return new RemoteYouTubeContentProvider(config);
  }
  // No endpoint means the extractor, which needs no configuration. It reports NOT_CONFIGURED
  // itself on a build without the native module, so there is nothing to probe up front.
  return nativeYouTubeContentProvider;
}


