import { ForbiddenError } from '../errors/forbidden-error';
import { ResourceNotFoundError } from '../errors/resource-not-found-error';
import { UpdateUserUseCase } from './update-user';
import { UserAlreadyExistsError } from './errors/user-already-exists-error';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { makeUser } from '@test/factories/make-user';
import { InMemoryUsersRepository } from '@test/repositories/in-memory-users-repository';

let usersRepository: InMemoryUsersRepository;
let fakeEventBus: FakeEventBus;
let sut: UpdateUserUseCase;

describe('Update User', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    fakeEventBus = new FakeEventBus();
    sut = new UpdateUserUseCase(usersRepository, fakeEventBus);
  });

  it('lets the owner update their name and username, publishing an event', async () => {
    const user = makeUser({ name: 'Ana', username: 'ana' });
    usersRepository.items.push(user);

    const result = await sut.execute({
      currentUserPublicId: user.publicId,
      currentUserRole: 'DEFAULT',
      publicId: user.publicId,
      name: 'Ana Costa',
      username: 'ana_costa',
    });

    expect(result.isSuccess()).toBe(true);
    expect(usersRepository.items[0].name).toBe('Ana Costa');
    expect(usersRepository.items[0].username).toBe('ana_costa');
    expect(fakeEventBus.events).toContainEqual(expect.objectContaining({ eventName: 'user.updated' }));
  });

  it('forbids updating another user without admin', async () => {
    const target = makeUser();
    usersRepository.items.push(target);

    const result = await sut.execute({
      currentUserPublicId: 'other-public-id',
      currentUserRole: 'DEFAULT',
      publicId: target.publicId,
      name: 'Hijack',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ForbiddenError);
  });

  it('rejects a username already taken by someone else', async () => {
    const user = makeUser({ username: 'ana' });
    const other = makeUser({ username: 'bruno' });
    usersRepository.items.push(user, other);

    const result = await sut.execute({
      currentUserPublicId: user.publicId,
      currentUserRole: 'DEFAULT',
      publicId: user.publicId,
      username: 'bruno',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(UserAlreadyExistsError);
  });

  it('fails when the target does not exist', async () => {
    const result = await sut.execute({
      currentUserPublicId: 'admin-public-id',
      currentUserRole: 'ADMIN',
      publicId: 'non-existing-public-id',
      name: 'X',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
