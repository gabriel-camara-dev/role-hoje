import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { ListFriendsUseCase } from './list-friends';
import { makeFriendship } from '@test/factories/make-friendship';
import { makeUser } from '@test/factories/make-user';
import { InMemoryFriendshipsRepository } from '@test/repositories/in-memory-friendships-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let usersRepository: InMemoryOndeHojeUsersRepository;
let friendshipsRepository: InMemoryFriendshipsRepository;
let sut: ListFriendsUseCase;

function friendsOf(result: unknown) {
  return (result as { value: { friends: Array<{ status: string; direction: string; friend: { publicId: string } }> } })
    .value.friends;
}

describe('List Friends', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    friendshipsRepository = new InMemoryFriendshipsRepository(usersRepository);
    sut = new ListFriendsUseCase(friendshipsRepository, usersRepository);
  });

  it('lists a sent request as direction "sent"', async () => {
    const me = makeUser();
    const other = makeUser();
    usersRepository.items.push(me, other);
    friendshipsRepository.items.push(
      makeFriendship({
        requesterId: new UniqueEntityID(me.publicId),
        addresseeId: new UniqueEntityID(other.publicId),
        status: 'PENDING',
      }),
    );

    const friends = friendsOf(await sut.execute({ currentUserPublicId: me.publicId }));

    expect(friends).toHaveLength(1);
    expect(friends[0]).toMatchObject({ status: 'PENDING', direction: 'sent' });
    expect(friends[0].friend.publicId).toBe(other.publicId);
  });

  it('lists a received request as direction "received"', async () => {
    const me = makeUser();
    const other = makeUser();
    usersRepository.items.push(me, other);
    friendshipsRepository.items.push(
      makeFriendship({
        requesterId: new UniqueEntityID(other.publicId),
        addresseeId: new UniqueEntityID(me.publicId),
        status: 'PENDING',
      }),
    );

    const friends = friendsOf(await sut.execute({ currentUserPublicId: me.publicId }));

    expect(friends[0]).toMatchObject({ status: 'PENDING', direction: 'received' });
    expect(friends[0].friend.publicId).toBe(other.publicId);
  });

  it('does not list friendships the user is not part of', async () => {
    const me = makeUser();
    const a = makeUser();
    const b = makeUser();
    usersRepository.items.push(me, a, b);
    friendshipsRepository.items.push(
      makeFriendship({
        requesterId: new UniqueEntityID(a.publicId),
        addresseeId: new UniqueEntityID(b.publicId),
        status: 'ACCEPTED',
      }),
    );

    expect(friendsOf(await sut.execute({ currentUserPublicId: me.publicId }))).toEqual([]);
  });

  it('fails for an unknown authenticated user', async () => {
    const result = await sut.execute({ currentUserPublicId: 'non-existing-public-id' });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
