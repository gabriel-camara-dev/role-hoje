import { ForbiddenError } from '../errors/forbidden-error';
import { ResourceNotFoundError } from '../errors/resource-not-found-error';
import { DeleteUserUseCase } from './delete-user';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { makeUser } from '@test/factories/make-user';
import { InMemoryUsersRepository } from '@test/repositories/in-memory-users-repository';

let usersRepository: InMemoryUsersRepository;
let fakeEventBus: FakeEventBus;
let sut: DeleteUserUseCase;

describe('Delete User', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    fakeEventBus = new FakeEventBus();
    sut = new DeleteUserUseCase(usersRepository, fakeEventBus);
  });

  it('lets the owner delete their own account and publishes an event', async () => {
    const user = makeUser();
    usersRepository.items.push(user);

    const result = await sut.execute({
      currentUserPublicId: user.publicId,
      currentUserRole: 'DEFAULT',
      publicId: user.publicId,
    });

    expect(result.isSuccess()).toBe(true);
    expect(usersRepository.items).toHaveLength(0);
    expect(fakeEventBus.events).toContainEqual(expect.objectContaining({ eventName: 'user.deleted' }));
  });

  it('lets an admin delete another user', async () => {
    const target = makeUser();
    usersRepository.items.push(target);

    const result = await sut.execute({
      currentUserPublicId: 'admin-public-id',
      currentUserRole: 'ADMIN',
      publicId: target.publicId,
    });

    expect(result.isSuccess()).toBe(true);
    expect(usersRepository.items).toHaveLength(0);
  });

  it('forbids deleting someone else without admin', async () => {
    const target = makeUser();
    usersRepository.items.push(target);

    const result = await sut.execute({
      currentUserPublicId: 'other-public-id',
      currentUserRole: 'DEFAULT',
      publicId: target.publicId,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ForbiddenError);
    expect(usersRepository.items).toHaveLength(1);
  });

  it('fails when the target does not exist', async () => {
    const result = await sut.execute({
      currentUserPublicId: 'admin-public-id',
      currentUserRole: 'ADMIN',
      publicId: 'non-existing-public-id',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
