import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { NotificationDispatcher } from '../../../use-cases/onde-hoje/notifications/notification-dispatcher';
import { SendNotificationUseCase } from '../../../use-cases/onde-hoje/notifications/send-notification';
import { OnGroupMemberAccepted } from './on-group-member-accepted';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { addMember, makeGroupWithOwner, makeOutsider } from '@test/factories/make-group-scenario';
import { InMemoryGroupMembersRepository } from '@test/repositories/in-memory-group-members-repository';
import { InMemoryGroupsRepository } from '@test/repositories/in-memory-groups-repository';
import { InMemoryNotificationsRepository } from '@test/repositories/in-memory-notifications-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';
import { waitFor } from '@test/utils/wait-for';

let usersRepository: InMemoryOndeHojeUsersRepository;
let groupMembersRepository: InMemoryGroupMembersRepository;
let groupsRepository: InMemoryGroupsRepository;
let notificationsRepository: InMemoryNotificationsRepository;

describe('On Group Member Accepted', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    groupMembersRepository = new InMemoryGroupMembersRepository();
    groupsRepository = new InMemoryGroupsRepository(groupMembersRepository, usersRepository);
    notificationsRepository = new InMemoryNotificationsRepository();

    const dispatcher = new NotificationDispatcher(
      notificationsRepository,
      usersRepository,
      new FakeEventBus(),
      new SendNotificationUseCase(notificationsRepository),
    );

    // The constructor registers the handler on the DomainEvents registry.
    new OnGroupMemberAccepted(groupsRepository, dispatcher);
  });

  it('sends a notification to the member when their request is accepted', async () => {
    const { owner, group } = makeGroupWithOwner({ usersRepository, groupsRepository, groupMembersRepository });
    const candidate = makeOutsider({ usersRepository, groupsRepository, groupMembersRepository });
    const membership = addMember(
      { usersRepository, groupsRepository, groupMembersRepository },
      { groupId: group.id, user: candidate, status: 'PENDING' },
    );

    // The membership transition raises the event; save() dispatches it.
    membership.acceptRequest(new UniqueEntityID(owner.publicId));
    await groupMembersRepository.save(membership);

    await waitFor(() => {
      expect(notificationsRepository.items).toHaveLength(1);
      expect(notificationsRepository.items[0].type).toBe('GROUP_MEMBER_ACCEPTED');
      expect(notificationsRepository.items[0].recipientId.toString()).toBe(candidate.publicId);
    });
  });
});
