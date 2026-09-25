/**
 * Adds a value to a list, or removes it if already present.
 *
 * Returns a new array rather than mutating, because the settings object is spread into a patch
 * and a mutated array would be the same reference the caller is comparing against.
 */
export function toggleInList<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
