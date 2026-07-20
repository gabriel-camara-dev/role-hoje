import { Inject, Injectable } from '@nestjs/common';
import { DomainEvents } from '@/core/events/domain-events';
import type { GroupMembersRepository } from '@/domain/main/application/repositories/onde-hoje/group-members-repository';
import type { GroupMember } from '@/domain/main/enterprise/entities/onde-hoje/groups/group-member';
import { DatabaseContext } from '../../database-context';
import { groupMemberWithIdsInclude, PrismaGroupMemberMapper } from '../../mappers/onde-hoje/prisma-group-member-mapper';

@Injectable()
export class PrismaGroupMembersRepository implements GroupMembersRepository {
  constructor(@Inject(DatabaseContext) private readonly dbContext: DatabaseContext) {}

  /** The row's identity in the database: the natural key behind `uq_group_member`. */
  private whereNaturalKey(groupMember: GroupMember) {
    return {
      group: { publicId: groupMember.groupId.toString() },
      user: { publicId: groupMember.memberId.toString() },
    };
  }

  async findByGroupAndMember(data: { groupId: string; memberId: string }): Promise<GroupMember | null> {
    const member = await this.dbContext.client.groupMember.findFirst({
      where: {
        group: { publicId: data.groupId },
        user: { publicId: data.memberId },
      },
      include: groupMemberWithIdsInclude,
    });

    return member ? PrismaGroupMemberMapper.toDomain(member) : null;
  }

  async findOwnerByGroupId(groupId: string): Promise<GroupMember | null> {
    const owner = await this.dbContext.client.groupMember.findFirst({
      where: { group: { publicId: groupId }, role: 'OWNER' },
      include: groupMemberWithIdsInclude,
    });

    return owner ? PrismaGroupMemberMapper.toDomain(owner) : null;
  }

  async findSuccessor(data: { groupId: string; exceptMemberId: string }): Promise<GroupMember | null> {
    const successor = await this.dbContext.client.groupMember.findFirst({
      where: {
        group: { publicId: data.groupId },
        status: 'ACTIVE',
        user: { publicId: { not: data.exceptMemberId } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: groupMemberWithIdsInclude,
    });

    return successor ? PrismaGroupMemberMapper.toDomain(successor) : null;
  }

  async create(groupMember: GroupMember): Promise<void> {
    await this.dbContext.client.groupMember.create({
      data: PrismaGroupMemberMapper.toPrismaCreate(groupMember),
    });

    DomainEvents.dispatchEventsForAggregate(groupMember.id);
  }

  async save(groupMember: GroupMember): Promise<void> {
    await this.dbContext.client.groupMember.updateMany({
      where: this.whereNaturalKey(groupMember),
      data: { role: groupMember.role, status: groupMember.status },
    });

    DomainEvents.dispatchEventsForAggregate(groupMember.id);
  }

  async delete(groupMember: GroupMember): Promise<void> {
    await this.dbContext.client.groupMember.deleteMany({
      where: this.whereNaturalKey(groupMember),
    });
  }
}
