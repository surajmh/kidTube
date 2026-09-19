import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageKeys = {
  profiles: '@nestling/profiles',
  channels: '@nestling/channels',
  videos: '@nestling/videos',
  history: '@nestling/history',
  screenTime: '@nestling/screen-time',
} as const;

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
