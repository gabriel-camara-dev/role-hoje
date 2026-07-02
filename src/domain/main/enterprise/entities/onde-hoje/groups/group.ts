export type GroupPrivacy = 'PUBLIC' | 'PRIVATE';

export interface Group {
  id: number;
  publicId: string;
  name: string;
  slug: string;
  description: string | null;
  privacy: GroupPrivacy;
  passwordHash?: string | null;
  city: string | null;
  state: string | null;
  membersCount?: number;
  todayVotesCount?: number;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  privacy: GroupPrivacy;
  passwordHash?: string | null;
  city?: string;
  state?: string;
  createdById: number;
}
