import { ChildProfile } from '../../types';

export type ProfileManagerProps = { profiles: ChildProfile[]; activeProfileId: string; setActiveProfileId: (id: string) => void; onChange: (profiles: ChildProfile[]) => Promise<void>; onDelete: (profile: ChildProfile) => Promise<void> };
