import { DomainEvents } from '@/core/events/domain-events';
import { GroupMembersRepository } from '@/domain/main/application/repositories/onde-hoje/group-members-repository';
import type { GroupMember } from '@/domain/main/enterprise/entities/onde-hoje/groups/group-member';

export class InMemoryGroupMembersRepository extends GroupMembersRepository {
  public items: GroupMember[] = [];

  /** Mirrors the natural key the Prisma repository writes against. */
  private indexOf(groupMember: GroupMember) {
    return this.items.findIndex(
      (item) => item.groupId.equals(groupMember.groupId) && item.memberId.equals(groupMember.memberId),
    );
  }

  async findByGroupAndMember(data: { groupId: string; memberId: string }): Promise<GroupMember | null> {
    return (
      this.items.find(
        (item) => item.groupId.toString() === data.groupId && item.memberId.toString() === data.memberId,
      ) ?? null
    );
  }

  async findOwnerByGroupId(groupId: string): Promise<GroupMember | null> {
    return this.items.find((item) => item.groupId.toString() === groupId && item.isOwner) ?? null;
  }

  async findSuccessor(data: { groupId: string; exceptMemberId: string }): Promise<GroupMember | null> {
    return (
      this.items
        .filter(
          (item) =>
            item.groupId.toString() === data.groupId &&
            item.isActive &&
            item.memberId.toString() !== data.exceptMemberId,
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null
    );
  }

  async create(groupMember: GroupMember): Promise<void> {
    this.items.push(groupMember);

    DomainEvents.dispatchEventsForAggregate(groupMember.id);
  }

  async save(groupMember: GroupMember): Promise<void> {
    const index = this.indexOf(groupMember);

    if (index >= 0) {
      this.items[index] = groupMember;
    }

    DomainEvents.dispatchEventsForAggregate(groupMember.id);
  }

  async delete(groupMember: GroupMember): Promise<void> {
    const index = this.indexOf(groupMember);

    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }
}
