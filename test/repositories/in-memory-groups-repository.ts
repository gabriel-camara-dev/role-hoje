import {
  GroupsRepository,
  type ListPublicGroupsQuery,
} from '@/domain/main/application/repositories/onde-hoje/groups-repository';
import type { Group } from '@/domain/main/enterprise/entities/onde-hoje/groups/group';
import { GroupDetails } from '@/domain/main/enterprise/entities/onde-hoje/groups/value-objects/group-details';
import { GroupMemberInfo } from '@/domain/main/enterprise/entities/onde-hoje/groups/value-objects/group-member-info';
import { GroupSummary } from '@/domain/main/enterprise/entities/onde-hoje/groups/value-objects/group-summary';
import { MyGroupDetails } from '@/domain/main/enterprise/entities/onde-hoje/groups/value-objects/my-group-details';
import type { InMemoryGroupMembersRepository } from './in-memory-group-members-repository';
import type { InMemoryOndeHojeUsersRepository } from './in-memory-onde-hoje-users-repository';

export class InMemoryGroupsRepository extends GroupsRepository {
  public items: Group[] = [];

  /**
   * Stands in for the `place_vote` rows that feed `todayVotesCount`. Push a
   * group id per vote counted for today; it goes away once places is split and
   * a real PlaceVotesRepository exists to read from.
   */
  public todayVotes: string[] = [];

  constructor(
    private groupMembersRepository: InMemoryGroupMembersRepository,
    private usersRepository: InMemoryOndeHojeUsersRepository,
  ) {
    super();
  }

  private membersCountOf(groupId: string) {
    return this.groupMembersRepository.items.filter((item) => item.groupId.toString() === groupId && item.isActive)
      .length;
  }

  private todayVotesCountOf(groupId: string) {
    return this.todayVotes.filter((id) => id === groupId).length;
  }

  private memberInfosOf(groupId: string, onlyActive: boolean) {
    return this.groupMembersRepository.items
      .filter((item) => item.groupId.toString() === groupId && (!onlyActive || item.isActive))
      .flatMap((item) => {
        const user = this.usersRepository.items.find((candidate) => candidate.publicId === item.memberId.toString());

        if (!user) {
          return [];
        }

        return [
          GroupMemberInfo.create({
            memberId: item.memberId,
            name: user.name,
            username: user.username,
            avatarUrl: null,
            role: item.role,
            status: item.status,
          }),
        ];
      });
  }

  private detailsOf(group: Group, onlyActiveMembers: boolean) {
    const groupId = group.id.toString();

    return GroupDetails.create({
      groupId: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      privacy: group.privacy,
      city: group.city,
      state: group.state,
      members: this.memberInfosOf(groupId, onlyActiveMembers),
      membersCount: this.membersCountOf(groupId),
      todayVotesCount: this.todayVotesCountOf(groupId),
    });
  }

  async findById(id: string): Promise<Group | null> {
    return this.items.find((group) => group.id.toString() === id) ?? null;
  }

  async findByName(name: string): Promise<Group | null> {
    return this.items.find((group) => group.name.toLowerCase() === name.toLowerCase()) ?? null;
  }

  async findPublicDetailsById(id: string): Promise<GroupDetails | null> {
    const group = this.items.find((item) => item.id.toString() === id && item.isPublic);

    return group ? this.detailsOf(group, true) : null;
  }

  async findManyPublicSummaries(query: ListPublicGroupsQuery): Promise<GroupSummary[]> {
    return this.items
      .filter((group) => group.isPublic && (!query.city || group.city?.toLowerCase() === query.city.toLowerCase()))
      .map((group) =>
        GroupSummary.create({
          groupId: group.id,
          name: group.name,
          slug: group.slug,
          description: group.description,
          privacy: group.privacy,
          city: group.city,
          state: group.state,
          membersCount: this.membersCountOf(group.id.toString()),
          todayVotesCount: this.todayVotesCountOf(group.id.toString()),
        }),
      );
  }

  async findManyDetailsByMemberId(memberId: string): Promise<MyGroupDetails[]> {
    return this.groupMembersRepository.items
      .filter((membership) => membership.memberId.toString() === memberId)
      .flatMap((membership) => {
        const group = this.items.find((item) => item.id.equals(membership.groupId));

        if (!group) {
          return [];
        }

        return [
          MyGroupDetails.create({
            group: this.detailsOf(group, false),
            myRole: membership.role,
            myStatus: membership.status,
          }),
        ];
      });
  }

  async create(group: Group): Promise<void> {
    this.items.push(group);
  }

  async save(group: Group): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(group.id));

    if (index >= 0) {
      this.items[index] = group;
    }
  }

  async delete(group: Group): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(group.id));

    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }
}
