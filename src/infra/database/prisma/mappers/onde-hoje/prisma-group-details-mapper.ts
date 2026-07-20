import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { GroupMemberRole } from '@/domain/main/enterprise/entities/onde-hoje/groups/group-member';
import type { GroupMemberStatus } from '@/domain/main/enterprise/entities/onde-hoje/groups/group-membership';
import { GroupDetails } from '@/domain/main/enterprise/entities/onde-hoje/groups/value-objects/group-details';
import { GroupMemberInfo } from '@/domain/main/enterprise/entities/onde-hoje/groups/value-objects/group-member-info';
import { GroupSummary } from '@/domain/main/enterprise/entities/onde-hoje/groups/value-objects/group-summary';

interface RawCounts {
  _count: { members: number; votes: number };
}

interface RawGroupFields {
  publicId: string;
  name: string;
  slug: string;
  description: string | null;
  privacy: 'PUBLIC' | 'PRIVATE';
  city: string | null;
  state: string | null;
}

export interface RawMemberWithUser {
  role: GroupMemberRole;
  status: GroupMemberStatus;
  user: {
    publicId: string;
    name: string;
    username: string;
    avatarUpdatedAt: Date | null;
  };
}

export type RawGroupSummary = RawGroupFields & RawCounts;
export type RawGroupDetails = RawGroupSummary & { members: RawMemberWithUser[] };

export class PrismaGroupDetailsMapper {
  static memberToDomain(raw: RawMemberWithUser): GroupMemberInfo {
    return GroupMemberInfo.create({
      memberId: new UniqueEntityID(raw.user.publicId),
      name: raw.user.name,
      username: raw.user.username,
      avatarUrl: raw.user.avatarUpdatedAt ? `/users/${raw.user.publicId}/avatar` : null,
      role: raw.role,
      status: raw.status,
    });
  }

  /**
   * `todayVotesCount` is passed in rather than read off `_count.votes`: the card
   * counts the members' activity, which includes the public votes they cast
   * outside the group, and no relation count on Group can express that.
   */
  static summaryToDomain(raw: RawGroupSummary, todayVotesCount: number): GroupSummary {
    return GroupSummary.create({
      groupId: new UniqueEntityID(raw.publicId),
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      privacy: raw.privacy,
      city: raw.city,
      state: raw.state,
      membersCount: raw._count.members,
      todayVotesCount,
    });
  }

  static detailsToDomain(raw: RawGroupDetails, todayVotesCount: number): GroupDetails {
    return GroupDetails.create({
      groupId: new UniqueEntityID(raw.publicId),
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      privacy: raw.privacy,
      city: raw.city,
      state: raw.state,
      members: raw.members.map((member) => PrismaGroupDetailsMapper.memberToDomain(member)),
      membersCount: raw._count.members,
      todayVotesCount,
    });
  }
}
