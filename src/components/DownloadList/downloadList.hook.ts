import { useMemo, useState } from 'react';
import { sortEntries } from './downloadList.helper';
import type { DownloadEntry, DownloadSort } from './downloadList.type';

/** Sort order and which sheet (sort or one row's menu) is open. */
export function useDownloadList(entries: DownloadEntry[]) {
  const [sort, setSort] = useState<DownloadSort>('recent');
  const [sortOpen, setSortOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<DownloadEntry | null>(null);
  const sorted = useMemo(() => sortEntries(entries, sort), [entries, sort]);
  return {
    sorted,
    sort,
    chooseSort: (next: DownloadSort) => { setSort(next); setSortOpen(false); },
    sortOpen,
    openSort: () => setSortOpen(true),
    closeSort: () => setSortOpen(false),
    menuFor,
    openMenu: (entry: DownloadEntry) => setMenuFor(entry),
    closeMenu: () => setMenuFor(null),
  };
}
