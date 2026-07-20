import type { Group } from '@/domain/main/enterprise/entities/onde-hoje/groups/group';
import type { GroupDetails } from '@/domain/main/enterprise/entities/onde-hoje/groups/value-objects/group-details';
import type { GroupMemberInfo } from '@/domain/main/enterprise/entities/onde-hoje/groups/value-objects/group-member-info';
import type { GroupSummary } from '@/domain/main/enterprise/entities/onde-hoje/groups/value-objects/group-summary';
import type { MyGroupDetails } from '@/domain/main/enterprise/entities/onde-hoje/groups/value-objects/my-group-details';

export class GroupPresenter {
  /** A group that was just written: it carries no counts yet. */
  static toHTTP(group: Group) {
    return {
      id: group.id.toString(),
      name: group.name,
      slug: group.slug,
      description: group.description,
      privacy: group.privacy,
      city: group.city,
      state: group.state,
    };
  }
}

export class GroupMemberInfoPresenter {
  static toHTTP(member: GroupMemberInfo) {
    return {
      status: member.status,
      role: member.role,
      user: {
        publicId: member.memberId.toString(),
        name: member.name,
        username: member.username,
        avatarUrl: member.avatarUrl,
      },
    };
  }
}

export class GroupSummaryPresenter {
  static toHTTP(group: GroupSummary) {
    return {
      id: group.groupId.toString(),
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

export class GroupDetailsPresenter {
  /** Without members: the caller decides whether the viewer may see them. */
  static toHTTP(group: GroupDetails) {
    return {
      id: group.groupId.toString(),
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

export class MyGroupDetailsPresenter {
  static toHTTP(myGroup: MyGroupDetails) {
    return {
      ...GroupDetailsPresenter.toHTTP(myGroup.group),
      myRole: myGroup.myRole,
      myStatus: myGroup.myStatus,
      members: myGroup.group.members.map((member) => GroupMemberInfoPresenter.toHTTP(member)),
    };
  }
}
