import { Inject, Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { todayDateOnly } from '@/core/date/date-only';
import type { CreateGroupData, Group } from '@/domain/main/enterprise/entities/onde-hoje/groups/group';
import type {
  AcceptGroupMemberResult,
  GroupsRepository,
  InviteGroupMemberResult,
  JoinGroupResult,
  LeaveGroupResult,
  ListPublicGroupsQuery,
  MutateGroupMemberResult,
  MyGroupItem,
  PublicGroupItem,
  RespondGroupInviteResult,
} from '@/domain/main/application/repositories/onde-hoje/groups-repository';
import { PrismaOndeHojeMapper } from '../../mappers/prisma-onde-hoje-mapper';
import { PrismaService } from '../../prisma.service';
import { slugify } from './onde-hoje-prisma-utils';

@Injectable()
export class PrismaGroupsRepository implements GroupsRepository {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async listPublic(query: ListPublicGroupsQuery): Promise<Group[]> {
    const todayDate = todayDateOnly();
    const groups = await this.prisma.group.findMany({
      where: {
        privacy: 'PUBLIC',
        ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return Promise.all(
      groups.map(async (group) => {
        const [membersCount, todayVotesCount] = await Promise.all([
          this.prisma.groupMember.count({ where: { groupId: group.id, status: 'ACTIVE' } }),
          this.prisma.placeVote.count({ where: { groupId: group.id, day: todayDate, status: 'ACTIVE' } }),
        ]);

        return PrismaOndeHojeMapper.groupToDomain({
          ...group,
          _count: { members: membersCount, votes: todayVotesCount },
        });
      }),
    );
  }

  async create(data: CreateGroupData): Promise<Group> {
    const group = await this.prisma.group.create({
      data: {
        ...data,
        slug: `${slugify(data.name)}-${Date.now().toString(36)}`,
        members: {
          create: {
            userId: data.createdById,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        },
      },
    });

    return PrismaOndeHojeMapper.groupToDomain(group);
  }

  async listMine(userId: number): Promise<MyGroupItem[]> {
    const todayDate = todayDateOnly();
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    publicId: true,
                    name: true,
                    username: true,
                    avatarUpdatedAt: true,
                  },
                },
              },
              orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      memberships.map(async (membership) => {
        const [membersCount, todayVotesCount] = await Promise.all([
          this.prisma.groupMember.count({ where: { groupId: membership.group.id, status: 'ACTIVE' } }),
          this.prisma.placeVote.count({ where: { groupId: membership.group.id, day: todayDate, status: 'ACTIVE' } }),
        ]);

        return {
          ...PrismaOndeHojeMapper.groupToDomain({
            ...membership.group,
            _count: { members: membersCount, votes: todayVotesCount },
          }),
          myRole: membership.role,
          myStatus: membership.status,
          members: membership.group.members.map((member) => ({
            role: member.role,
            status: member.status,
            user: {
              publicId: member.user.publicId,
              name: member.user.name,
              username: member.user.username,
              avatarUrl: member.user.avatarUpdatedAt ? `/users/${member.user.publicId}/avatar` : null,
            },
          })),
        };
      }),
    );
  }

  async getPublic(groupPublicId: string): Promise<PublicGroupItem | null> {
    const todayDate = todayDateOnly();
    const group = await this.prisma.group.findFirst({
      where: {
        publicId: groupPublicId,
        privacy: 'PUBLIC',
      },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: {
                publicId: true,
                name: true,
                username: true,
                avatarUpdatedAt: true,
              },
            },
          },
          orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        },
      },
    });

    if (!group) {
      return null;
    }

    const [membersCount, todayVotesCount] = await Promise.all([
      this.prisma.groupMember.count({ where: { groupId: group.id, status: 'ACTIVE' } }),
      this.prisma.placeVote.count({ where: { groupId: group.id, day: todayDate, status: 'ACTIVE' } }),
    ]);

    return {
      ...PrismaOndeHojeMapper.groupToDomain({
        ...group,
        _count: { members: membersCount, votes: todayVotesCount },
      }),
      members: group.members.map((member) => ({
        role: member.role,
        status: member.status,
        user: {
          publicId: member.user.publicId,
          name: member.user.name,
          username: member.user.username,
          avatarUrl: member.user.avatarUpdatedAt ? `/users/${member.user.publicId}/avatar` : null,
        },
      })),
    };
  }

  async join(data: {
    userId: number;
    groupPublicId?: string;
    name?: string;
    password?: string;
  }): Promise<JoinGroupResult> {
    const group = data.groupPublicId
      ? await this.prisma.group.findUnique({ where: { publicId: data.groupPublicId } })
      : data.name
        ? await this.prisma.group.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' } } })
        : null;

    if (!group) {
      return { type: 'not_found' };
    }

    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        uq_group_member: {
          groupId: group.id,
          userId: data.userId,
        },
      },
    });

    if (existingMember?.status === 'BLOCKED') {
      return { type: 'blocked' };
    }

    const canEnterPrivateWithPassword = Boolean(
      group.privacy === 'PRIVATE' &&
        group.passwordHash &&
        data.password &&
        (await compare(data.password, group.passwordHash)),
    );
    const status = group.privacy === 'PUBLIC' || canEnterPrivateWithPassword ? 'ACTIVE' : 'PENDING';

    const member = await this.prisma.groupMember.upsert({
      where: {
        uq_group_member: {
          groupId: group.id,
          userId: data.userId,
        },
      },
      update: {
        status,
      },
      create: {
        groupId: group.id,
        userId: data.userId,
        status,
      },
    });

    const owner = await this.prisma.groupMember.findFirst({
      where: { groupId: group.id, role: 'OWNER' },
      select: { user: { select: { publicId: true } } },
    });

    return {
      type: 'joined',
      membership: { groupPublicId: group.publicId, status: member.status },
      groupName: group.name,
      ownerPublicId: owner?.user.publicId ?? '',
    };
  }

  async acceptMember(data: {
    leaderId: number;
    groupPublicId: string;
    memberUsername: string;
  }): Promise<AcceptGroupMemberResult> {
    const [group, memberUser] = await Promise.all([
      this.prisma.group.findUnique({ where: { publicId: data.groupPublicId } }),
      this.prisma.user.findUnique({ where: { username: data.memberUsername } }),
    ]);

    if (!group || !memberUser) {
      return { type: 'not_found' };
    }

    const leaderMembership = await this.prisma.groupMember.findUnique({
      where: {
        uq_group_member: {
          groupId: group.id,
          userId: data.leaderId,
        },
      },
    });

    if (leaderMembership?.role !== 'OWNER' || leaderMembership.status !== 'ACTIVE') {
      return { type: 'forbidden' };
    }

    const member = await this.prisma.groupMember.findUnique({
      where: {
        uq_group_member: {
          groupId: group.id,
          userId: memberUser.id,
        },
      },
    });

    if (!member) {
      return { type: 'not_found' };
    }

    if (member.status !== 'PENDING') {
      return { type: 'not_pending' };
    }

    const acceptedMember = await this.prisma.groupMember.update({
      where: {
        uq_group_member: {
          groupId: group.id,
          userId: memberUser.id,
        },
      },
      data: { status: 'ACTIVE' },
    });

    return {
      type: 'accepted',
      membership: {
        groupPublicId: group.publicId,
        status: acceptedMember.status,
      },
      memberPublicId: memberUser.publicId,
      groupName: group.name,
    };
  }

  async inviteMember(data: {
    leaderId: number;
    groupPublicId: string;
    memberUsername: string;
  }): Promise<InviteGroupMemberResult> {
    const [group, memberUser] = await Promise.all([
      this.prisma.group.findUnique({ where: { publicId: data.groupPublicId } }),
      this.prisma.user.findUnique({ where: { username: data.memberUsername } }),
    ]);

    if (!group || !memberUser) {
      return { type: 'not_found' };
    }

    // Any active member can invite friends; the invite still needs acceptance.
    const inviterMembership = await this.prisma.groupMember.findUnique({
      where: { uq_group_member: { groupId: group.id, userId: data.leaderId } },
    });

    if (inviterMembership?.status !== 'ACTIVE') {
      return { type: 'forbidden' };
    }

    const existing = await this.prisma.groupMember.findUnique({
      where: {
        uq_group_member: {
          groupId: group.id,
          userId: memberUser.id,
        },
      },
    });

    if (existing?.status === 'ACTIVE') {
      return { type: 'already_member' };
    }

    if (existing?.status === 'BLOCKED') {
      return { type: 'forbidden' };
    }

    // The membership stays as INVITED until the invited person accepts.
    // It never grants access on its own.
    const member = await this.prisma.groupMember.upsert({
      where: {
        uq_group_member: {
          groupId: group.id,
          userId: memberUser.id,
        },
      },
      update: { status: 'INVITED' },
      create: {
        groupId: group.id,
        userId: memberUser.id,
        status: 'INVITED',
      },
    });

    return {
      type: 'invited',
      membership: { groupPublicId: group.publicId, status: member.status },
      invitedUserPublicId: memberUser.publicId,
      invitedUserName: memberUser.name,
      groupName: group.name,
    };
  }

  async respondInvite(data: {
    userId: number;
    groupPublicId: string;
    action: 'accept' | 'decline';
  }): Promise<RespondGroupInviteResult> {
    const group = await this.prisma.group.findUnique({ where: { publicId: data.groupPublicId } });

    if (!group) {
      return { type: 'not_found' };
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: { uq_group_member: { groupId: group.id, userId: data.userId } },
    });

    if (membership?.status !== 'INVITED') {
      return { type: 'not_invited' };
    }

    if (data.action === 'decline') {
      await this.prisma.groupMember.delete({ where: { id: membership.id } });
      return { type: 'declined', groupPublicId: group.publicId };
    }

    const [accepted, owner, memberUser] = await Promise.all([
      this.prisma.groupMember.update({
        where: { id: membership.id },
        data: { status: 'ACTIVE' },
      }),
      this.prisma.groupMember.findFirst({
        where: { groupId: group.id, role: 'OWNER' },
        select: { user: { select: { publicId: true } } },
      }),
      this.prisma.user.findUnique({ where: { id: data.userId }, select: { name: true } }),
    ]);

    return {
      type: 'accepted',
      membership: { groupPublicId: group.publicId, status: accepted.status },
      groupName: group.name,
      ownerPublicId: owner?.user.publicId ?? '',
      memberName: memberUser?.name ?? '',
    };
  }

  async removeMember(data: {
    leaderId: number;
    groupPublicId: string;
    memberUsername: string;
  }): Promise<MutateGroupMemberResult> {
    const access = await this.findOwnerAccess(data.leaderId, data.groupPublicId, data.memberUsername);

    if (access.type !== 'ok') {
      return access;
    }

    if (access.memberUser.id === data.leaderId) {
      return { type: 'forbidden' };
    }

    const deleted = await this.prisma.groupMember.deleteMany({
      where: {
        groupId: access.group.id,
        userId: access.memberUser.id,
      },
    });

    return deleted.count > 0 ? { type: 'removed' } : { type: 'not_found' };
  }

  async leave(data: { userId: number; groupPublicId: string }): Promise<LeaveGroupResult> {
    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.groupMember.findFirst({
        where: {
          userId: data.userId,
          group: { publicId: data.groupPublicId },
        },
        include: { group: true },
      });

      if (membership?.status !== 'ACTIVE') {
        return { type: 'not_found' };
      }

      if (membership.role !== 'OWNER') {
        await tx.groupMember.delete({ where: { id: membership.id } });
        return { type: 'left' };
      }

      const successor = await tx.groupMember.findFirst({
        where: {
          groupId: membership.groupId,
          status: 'ACTIVE',
          userId: { not: data.userId },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });

      if (!successor) {
        await tx.group.delete({ where: { id: membership.groupId } });
        return { type: 'deleted' };
      }

      await tx.groupMember.update({
        where: { id: successor.id },
        data: { role: 'OWNER' },
      });
      await tx.group.update({
        where: { id: membership.groupId },
        data: { createdById: successor.userId },
      });
      await tx.groupMember.delete({ where: { id: membership.id } });

      return { type: 'left' };
    });
  }

  private async findOwnerAccess(leaderId: number, groupPublicId: string, memberUsername: string) {
    const [group, memberUser] = await Promise.all([
      this.prisma.group.findUnique({ where: { publicId: groupPublicId } }),
      this.prisma.user.findUnique({ where: { username: memberUsername } }),
    ]);

    if (!group || !memberUser) {
      return { type: 'not_found' as const };
    }

    const leaderMembership = await this.prisma.groupMember.findUnique({
      where: {
        uq_group_member: {
          groupId: group.id,
          userId: leaderId,
        },
      },
    });

    if (leaderMembership?.role !== 'OWNER' || leaderMembership.status !== 'ACTIVE') {
      return { type: 'forbidden' as const };
    }

    return { type: 'ok' as const, group, memberUser };
  }
}
