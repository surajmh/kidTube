import { Feather } from '@expo/vector-icons';

export const avatarOptions = ['sun', 'cloud', 'moon', 'star'];

export const avatarIcons: Record<string, keyof typeof Feather.glyphMap> = {
  sun: 'sun',
  cloud: 'cloud',
  moon: 'moon',
  star: 'star',
};
