import { Inject, Injectable } from '@nestjs/common';
import type { CreateGroupData, Group } from '@/domain/main/enterprise/entities/onde-hoje/groups/group';
import type {
  AcceptGroupMemberResult,
  GroupsRepository,
  JoinGroupResult,
  ListPublicGroupsQuery,
} from '@/domain/main/application/repositories/onde-hoje/groups-repository';
import { PrismaOndeHojeMapper } from '../../mappers/prisma-onde-hoje-mapper';
import { PrismaService } from '../../prisma.service';
import { slugify } from './onde-hoje-prisma-utils';

@Injectable()
export class PrismaGroupsRepository implements GroupsRepository {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async listPublic(query: ListPublicGroupsQuery): Promise<Group[]> {
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
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

  async join(data: { userId: number; groupPublicId: string }): Promise<JoinGroupResult> {
    const group = await this.prisma.group.findUnique({ where: { publicId: data.groupPublicId } });

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

    const member = await this.prisma.groupMember.upsert({
      where: {
        uq_group_member: {
          groupId: group.id,
          userId: data.userId,
        },
      },
      update: {
        status: group.privacy === 'PUBLIC' ? 'ACTIVE' : 'PENDING',
      },
      create: {
        groupId: group.id,
        userId: data.userId,
        status: group.privacy === 'PUBLIC' ? 'ACTIVE' : 'PENDING',
      },
    });

    return { type: 'joined', membership: { groupPublicId: group.publicId, status: member.status } };
  }

  async acceptMember(data: {
    leaderId: number;
    groupPublicId: string;
    memberPublicId: string;
  }): Promise<AcceptGroupMemberResult> {
    const [group, memberUser] = await Promise.all([
      this.prisma.group.findUnique({ where: { publicId: data.groupPublicId } }),
      this.prisma.user.findUnique({ where: { publicId: data.memberPublicId } }),
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
    };
  }
}
