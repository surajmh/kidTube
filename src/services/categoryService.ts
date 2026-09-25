import { categoryRepository } from '../repositories/parentalControlsRepository';
import { ApprovedChannel, ApprovedVideo } from '../types';
import { ContentCategory, defaultCategories } from '../parentalControlsTypes';
import { ParentSession, parentSessionService } from './auth/parentSession';

export class CategoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CategoryError';
  }
}

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export class CategoryService {
  private categories: ContentCategory[] = defaultCategories;

  hydrate(categories: ContentCategory[]) {
    this.categories = categories.length ? categories : defaultCategories;
  }

  all() {
    return this.categories;
  }

  byId(categoryId?: string) {
    if (!categoryId) return undefined;
    return this.categories.find((category) => category.id === categoryId);
  }

  namesFor(categoryIds?: string[]) {
    return (categoryIds ?? [])
      .map((id) => this.byId(id)?.name)
      .filter((name): name is string => Boolean(name));
  }

  /** Parent-only. */
  async create(session: ParentSession, name: string): Promise<ContentCategory> {
    parentSessionService.require('create a content category');
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) throw new CategoryError('Give the category a name.');
    const base = slugify(trimmed) || 'category';
    let id = base;
    let suffix = 2;
    while (this.categories.some((category) => category.id === id)) {
      id = `${base}-${suffix++}`;
    }
    const category: ContentCategory = {
      id,
      name: trimmed,
      icon: 'tag',
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    this.categories = [...this.categories, category];
    await categoryRepository.saveAll(this.categories);
    return category;
  }

  /** Parent-only. */
  async rename(session: ParentSession, categoryId: string, name: string) {
    parentSessionService.require('rename a content category');
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) throw new CategoryError('Give the category a name.');
    this.categories = this.categories.map((category) =>
      category.id === categoryId ? { ...category, name: trimmed } : category,
    );
    await categoryRepository.saveAll(this.categories);
    return this.categories;
  }

  /** Parent-only. Returns the remaining categories; callers unassign the removed id. */
  async remove(session: ParentSession, categoryId: string) {
    parentSessionService.require('delete a content category');
    const category = this.byId(categoryId);
    if (!category) throw new CategoryError('That category no longer exists.');
    if (category.isDefault) throw new CategoryError('Default categories cannot be deleted.');
    this.categories = this.categories.filter((item) => item.id !== categoryId);
    await categoryRepository.saveAll(this.categories);
    return this.categories;
  }
}

export const categoryService = new CategoryService();

/** Removes a deleted category id from stored content memberships. */
export function stripCategory(categoryIds: string[] | undefined, removedId: string) {
  if (!categoryIds?.length) return categoryIds;
  return categoryIds.filter((id) => id !== removedId);
}

export function toggleCategoryId(categoryIds: string[] | undefined, categoryId: string) {
  const current = categoryIds ?? [];
  return current.includes(categoryId)
    ? current.filter((id) => id !== categoryId)
    : [...current, categoryId];
}

export function withVideoCategories(video: ApprovedVideo, categoryIds: string[]): ApprovedVideo {
  return { ...video, categoryIds };
}

export function withChannelCategories(channel: ApprovedChannel, categoryIds: string[]): ApprovedChannel {
  return { ...channel, categoryIds };
}
