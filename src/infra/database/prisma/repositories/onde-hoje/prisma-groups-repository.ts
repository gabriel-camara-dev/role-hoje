import { Inject, Injectable } from '@nestjs/common';
import { todayDateOnly } from '@/core/date/date-only';
import type {
  GroupsRepository,
  ListPublicGroupsQuery,
} from '@/domain/main/application/repositories/onde-hoje/groups-repository';
import type { Group } from '@/domain/main/enterprise/entities/onde-hoje/groups/group';
import type { GroupDetails } from '@/domain/main/enterprise/entities/onde-hoje/groups/value-objects/group-details';
import type { GroupSummary } from '@/domain/main/enterprise/entities/onde-hoje/groups/value-objects/group-summary';
import { MyGroupDetails } from '@/domain/main/enterprise/entities/onde-hoje/groups/value-objects/my-group-details';
import { DatabaseContext } from '../../database-context';
import { PrismaGroupDetailsMapper } from '../../mappers/onde-hoje/prisma-group-details-mapper';
import { groupWithOwnerInclude, PrismaGroupMapper } from '../../mappers/onde-hoje/prisma-group-mapper';

@Injectable()
export class PrismaGroupsRepository implements GroupsRepository {
  constructor(@Inject(DatabaseContext) private readonly dbContext: DatabaseContext) {}

  /** Active members and today's active votes, counted by the database itself. */
  private countsSelect() {
    return {
      select: {
        members: { where: { status: 'ACTIVE' as const } },
        votes: { where: { day: todayDateOnly(), status: 'ACTIVE' as const } },
      },
    };
  }

  /**
   * Public votes cast today by each group's active members, keyed by group
   * publicId. These sit outside `Group.votes` (which only holds votes scoped to
   * the group), but they are still the members showing up somewhere today — the
   * same rule the "next 7 days" dialog uses. One query for every group asked
   * about, so a listing does not fan out.
   */
  private async memberPublicVotesToday(groupPublicIds: string[]): Promise<Map<string, number>> {
    if (groupPublicIds.length === 0) {
      return new Map();
    }

    const memberships = await this.dbContext.client.groupMember.findMany({
      where: { status: 'ACTIVE', group: { publicId: { in: groupPublicIds } } },
      select: {
        group: { select: { publicId: true } },
        user: {
          select: {
            _count: {
              select: {
                placeVotes: { where: { day: todayDateOnly(), status: 'ACTIVE' as const, groupId: null } },
              },
            },
          },
        },
      },
    });

    const counts = new Map<string, number>();

    for (const membership of memberships) {
      const current = counts.get(membership.group.publicId) ?? 0;
      counts.set(membership.group.publicId, current + membership.user._count.placeVotes);
    }

    return counts;
  }

  /** Votes scoped to the group plus its members' public ones — the two sets are disjoint. */
  private todayVotesCountOf(raw: { publicId: string; _count: { votes: number } }, memberVotes: Map<string, number>) {
    return raw._count.votes + (memberVotes.get(raw.publicId) ?? 0);
  }

  private membersInclude() {
    return {
      include: {
        user: { select: { publicId: true, name: true, username: true, avatarUpdatedAt: true } },
      },
      orderBy: [{ status: 'asc' as const }, { updatedAt: 'desc' as const }],
    };
  }

  async findById(id: string): Promise<Group | null> {
    const group = await this.dbContext.client.group.findUnique({
      where: { publicId: id },
      include: groupWithOwnerInclude,
    });

    return group ? PrismaGroupMapper.toDomain(group) : null;
  }

  async findByName(name: string): Promise<Group | null> {
    const group = await this.dbContext.client.group.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      include: groupWithOwnerInclude,
    });

    return group ? PrismaGroupMapper.toDomain(group) : null;
  }

  async findPublicDetailsById(id: string): Promise<GroupDetails | null> {
    const group = await this.dbContext.client.group.findFirst({
      where: { publicId: id, privacy: 'PUBLIC' },
      include: {
        members: { where: { status: 'ACTIVE' }, ...this.membersInclude() },
        _count: this.countsSelect(),
      },
    });

    if (!group) {
      return null;
    }

    const memberVotes = await this.memberPublicVotesToday([group.publicId]);

    return PrismaGroupDetailsMapper.detailsToDomain(group, this.todayVotesCountOf(group, memberVotes));
  }

  async findManyPublicSummaries(query: ListPublicGroupsQuery): Promise<GroupSummary[]> {
    const groups = await this.dbContext.client.group.findMany({
      where: {
        privacy: 'PUBLIC',
        ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: this.countsSelect() },
    });

    const memberVotes = await this.memberPublicVotesToday(groups.map((group) => group.publicId));

    return groups.map((group) =>
      PrismaGroupDetailsMapper.summaryToDomain(group, this.todayVotesCountOf(group, memberVotes)),
    );
  }

  async findManyDetailsByMemberId(memberId: string): Promise<MyGroupDetails[]> {
    const memberships = await this.dbContext.client.groupMember.findMany({
      where: { user: { publicId: memberId } },
      orderBy: { updatedAt: 'desc' },
      include: {
        group: {
          include: {
            members: this.membersInclude(),
            _count: this.countsSelect(),
          },
        },
      },
    });

    const memberVotes = await this.memberPublicVotesToday(memberships.map((membership) => membership.group.publicId));

    return memberships.map((membership) =>
      MyGroupDetails.create({
        group: PrismaGroupDetailsMapper.detailsToDomain(
          membership.group,
          this.todayVotesCountOf(membership.group, memberVotes),
        ),
        myRole: membership.role,
        myStatus: membership.status,
      }),
    );
  }

  async create(group: Group): Promise<void> {
    await this.dbContext.client.group.create({ data: PrismaGroupMapper.toPrismaCreate(group) });
  }

  async save(group: Group): Promise<void> {
    await this.dbContext.client.group.update({
      where: { publicId: group.id.toString() },
      data: PrismaGroupMapper.toPrismaUpdate(group),
    });
  }

  async delete(group: Group): Promise<void> {
    await this.dbContext.client.group.delete({ where: { publicId: group.id.toString() } });
  }
}
