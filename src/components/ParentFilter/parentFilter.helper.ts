import { ParentFilters } from './parentFilter.type';

/** How many filters are narrowing the list, for the badge on the trigger. */
export function activeFilterCount(filters: ParentFilters): number {
  return (filters.query.trim() ? 1 : 0) + (filters.childId ? 1 : 0) + (filters.categoryId ? 1 : 0);
}
