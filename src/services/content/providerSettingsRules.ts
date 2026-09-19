/**
 * Provider settings rules.
 *
 * Pure: no storage, no network. `providerSettings.ts` wraps these with the
 * repository, so the validation a parent's endpoint URL must pass is testable on
 * its own.
 */

export type ContentProviderSettings = {
  /** Base URL of the deployed metadata endpoint. Empty means "not connected". */
  endpointUrl: string;
  /** Optional proxy credential. Never the YouTube Data API key. */
  token?: string;
};

export const emptyProviderSettings: ContentProviderSettings = { endpointUrl: '' };

export type EndpointValidation = { ok: true; settings: ContentProviderSettings } | { ok: false; error: string };

const schemePattern = /^([a-z][a-z0-9+.-]*):\/\//i;
const hostPattern = /^[A-Za-z0-9.-]+$/;

/**
 * Validates and normalises a parent-entered endpoint.
 *
 * HTTPS only: the provider URL is how channel data leaves the device, so a
 * plaintext endpoint is refused rather than silently accepted. Query strings and
 * fragments are dropped — the client appends its own path and parameters.
 */
export function validateEndpoint(endpointUrl: string, token?: string): EndpointValidation {
  const raw = (endpointUrl ?? '').trim();
  if (!raw) return { ok: false, error: 'Enter the URL of your metadata provider.' };

  const schemeMatch = raw.match(schemePattern);
  if (!schemeMatch) {
    return { ok: false, error: 'Include the scheme, for example https://example.workers.dev.' };
  }
  if (schemeMatch[1].toLowerCase() !== 'https') {
    return { ok: false, error: 'Use an https:// URL so channel data is not sent in the clear.' };
  }

  const remainder = raw.slice(schemeMatch[0].length);
  const [beforeFragment] = remainder.split('#');
  const [authority, ...pathParts] = beforeFragment.split('?')[0].split('/');

  if (!authority) return { ok: false, error: 'That URL is missing a host.' };
  if (authority.includes('@')) {
    return { ok: false, error: 'Remove the credentials from the URL — this endpoint needs no user name.' };
  }

  const [host, port, ...rest] = authority.split(':');
  if (rest.length) return { ok: false, error: 'That does not look like a valid host name.' };
  if (!hostPattern.test(host) || !host.includes('.')) {
    return { ok: false, error: 'That does not look like a valid host name.' };
  }
  if (port !== undefined && !/^[0-9]{1,5}$/.test(port)) {
    return { ok: false, error: 'That port number is not valid.' };
  }

  const path = pathParts.filter(Boolean).join('/');
  const trimmedToken = token?.trim();
  return {
    ok: true,
    settings: {
      // Trailing slashes and case are normalised so two spellings of one endpoint
      // cannot look like two different providers.
      endpointUrl: `https://${`${host}${port ? `:${port}` : ''}`.toLowerCase()}${path ? `/${path}` : ''}`,
      token: trimmedToken ? trimmedToken : undefined,
    },
  };
}

/** Parent-facing summary of the active provider, for the settings list. */
export function describeProvider(settings: ContentProviderSettings | undefined): string {
  if (!settings?.endpointUrl) return 'Not connected';
  const host = settings.endpointUrl.replace(/^https:\/\//, '').split('/')[0];
  return settings.token ? `${host} · token set` : host;
}

export function isProviderConfigured(settings: ContentProviderSettings | undefined): boolean {
  return Boolean(settings?.endpointUrl);
}
