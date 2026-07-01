export type GroupPrivacy = 'PUBLIC' | 'PRIVATE';

export interface Group {
  id: number;
  publicId: string;
  name: string;
  slug: string;
  description: string | null;
  privacy: GroupPrivacy;
  city: string | null;
  state: string | null;
  membersCount?: number;
  todayVotesCount?: number;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  privacy: GroupPrivacy;
  city?: string;
  state?: string;
  createdById: number;
}
