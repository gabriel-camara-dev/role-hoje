import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { RemoveFriendshipUseCase } from './remove-friendship';
import { makeFriendship } from '@test/factories/make-friendship';
import { makeUser } from '@test/factories/make-user';
import { InMemoryFriendshipsRepository } from '@test/repositories/in-memory-friendships-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let usersRepository: InMemoryOndeHojeUsersRepository;
let friendshipsRepository: InMemoryFriendshipsRepository;
let sut: RemoveFriendshipUseCase;

function setUpFriendship(status: 'PENDING' | 'ACCEPTED') {
  const user = makeUser();
  const friend = makeUser();
  usersRepository.items.push(user, friend);

  friendshipsRepository.items.push(
    makeFriendship({
      requesterId: new UniqueEntityID(user.publicId),
      addresseeId: new UniqueEntityID(friend.publicId),
      status,
    }),
  );

  return { user, friend };
}

describe('Remove Friendship', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    friendshipsRepository = new InMemoryFriendshipsRepository(usersRepository);
    sut = new RemoveFriendshipUseCase(friendshipsRepository, usersRepository);
  });

  it('removes an accepted friendship', async () => {
    const { user, friend } = setUpFriendship('ACCEPTED');

    const result = await sut.execute({
      currentUserPublicId: user.publicId,
      friendUsername: friend.username,
    });

    expect(result.isSuccess()).toBe(true);
    expect(friendshipsRepository.items).toHaveLength(0);
  });

  it('removes the friendship regardless of who requested it', async () => {
    const { user, friend } = setUpFriendship('ACCEPTED');

    // The friend (the addressee) removes it, not the original requester.
    const result = await sut.execute({
      currentUserPublicId: friend.publicId,
      friendUsername: user.username,
    });

    expect(result.isSuccess()).toBe(true);
    expect(friendshipsRepository.items).toHaveLength(0);
  });

  it('fails when the two are not connected', async () => {
    const user = makeUser();
    const stranger = makeUser();
    usersRepository.items.push(user, stranger);

    const result = await sut.execute({
      currentUserPublicId: user.publicId,
      friendUsername: stranger.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('fails for an unknown friend username', async () => {
    const user = makeUser();
    usersRepository.items.push(user);

    const result = await sut.execute({
      currentUserPublicId: user.publicId,
      friendUsername: 'ghost',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
