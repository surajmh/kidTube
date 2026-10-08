import { useEffect, useState } from 'react';

export function usePagedGrid<T>(items: T[], pageSize: number) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  // Growing the window is per-list; a changed item count (new filter, new library) starts fresh.
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items.length, pageSize]);

  const visible = visibleCount >= items.length ? items : items.slice(0, visibleCount);
  const remaining = items.length - visible.length;
  const showMore = () => setVisibleCount((count) => count + pageSize);

  return { visible, remaining, showMore };
}
