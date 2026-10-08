import type { ApprovalDuration, ContentCategory } from '../types';

export const defaultCategories: ContentCategory[] = [
  { id: 'educational', name: 'Educational', icon: 'book-open', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'music', name: 'Music', icon: 'music', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'stories', name: 'Stories', icon: 'book', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'animals', name: 'Animals', icon: 'feather', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'numbers', name: 'Numbers', icon: 'hash', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'alphabet', name: 'Alphabet', icon: 'type', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'other', name: 'Other', icon: 'grid', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
];

/** Folder every uncategorised item belongs to, so "Other" is a real restriction. */
export const fallbackCategoryId = 'other';

export const approvalDurationLabels: Record<ApprovalDuration, string> = {
  once: 'One playback',
  today: 'Today',
  seven_days: '7 days',
  permanent: 'Permanently',
};

export const approvalDurationOrder: ApprovalDuration[] = ['once', 'today', 'seven_days', 'permanent'];
