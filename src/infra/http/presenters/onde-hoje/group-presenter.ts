import type { Group } from '@/domain/main/enterprise/entities/onde-hoje/groups/group';

export class GroupPresenter {
  static toHTTP(group: Group) {
    return {
      id: group.publicId,
      name: group.name,
      slug: group.slug,
      description: group.description,
      privacy: group.privacy,
      city: group.city,
      state: group.state,
      membersCount: group.membersCount,
      todayVotesCount: group.todayVotesCount,
    };
  }
}
