import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { GroupMember, type GroupMemberRole } from '@/domain/main/enterprise/entities/onde-hoje/groups/group-member';
import type { GroupMemberStatus } from '@/domain/main/enterprise/entities/onde-hoje/groups/group-membership';
import type { Prisma } from '@/@types/prisma/client';

export interface RawGroupMemberWithIds {
  role: GroupMemberRole;
  status: GroupMemberStatus;
  createdAt: Date;
  group: { publicId: string };
  user: { publicId: string };
}

/** The domain speaks publicIds, so every membership read resolves both sides. */
export const groupMemberWithIdsInclude = {
  group: { select: { publicId: true } },
  user: { select: { publicId: true } },
} satisfies Prisma.GroupMemberInclude;

export class PrismaGroupMemberMapper {
  static toDomain(raw: RawGroupMemberWithIds): GroupMember {
    return GroupMember.create({
      groupId: new UniqueEntityID(raw.group.publicId),
      memberId: new UniqueEntityID(raw.user.publicId),
      role: raw.role,
      status: raw.status,
      createdAt: raw.createdAt,
    });
  }

  static toPrismaCreate(groupMember: GroupMember): Prisma.GroupMemberCreateInput {
    return {
      role: groupMember.role,
      status: groupMember.status,
      createdAt: groupMember.createdAt,
      group: { connect: { publicId: groupMember.groupId.toString() } },
      user: { connect: { publicId: groupMember.memberId.toString() } },
    };
  }
}
