import type { ChildProfile } from '../../types';
import type { ParentSection } from '../ParentShell/parentShell.type';

export type DashboardCounts = { channels: number; videos: number; categories: number; pending: number };

export type ParentDashboardProps = {
  /** The child whose view the parent is managing, if any profile exists. */
  profile?: ChildProfile;
  counts: DashboardCounts;
  onOpen: (section: ParentSection) => void;
};
