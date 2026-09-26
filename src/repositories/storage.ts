import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageKeys = {
  profiles: '@nestling/profiles',
  channels: '@nestling/channels',
  videos: '@nestling/videos',
  history: '@nestling/history',
  screenTime: '@nestling/screen-time',
} as const;

/**
 * One-shot cache for `primeStorage`: cold start reads a dozen-plus keys at once, and this lets
 * each repository's own `readJson` call be served from that single batch instead of a separate
 * native round trip per key. Entries are consumed on read, so anything read outside a priming
 * pass (the common case) always goes straight to `AsyncStorage` as before.
 */
const primed = new Map<string, string | null>();

/** Loads `keys` in one native call so the `readJson` calls that follow don't each do their own. */
export async function primeStorage(keys: string[]): Promise<void> {
  const missing = keys.filter((key) => !primed.has(key));
  if (!missing.length) return;
  const pairs = await AsyncStorage.multiGet(missing);
  for (const [key, value] of pairs) primed.set(key, value);
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = primed.has(key) ? primed.get(key)! : await AsyncStorage.getItem(key);
    primed.delete(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
