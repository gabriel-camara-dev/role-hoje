import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { RejectFriendshipUseCase } from './reject-friendship';
import { makeFriendship } from '@test/factories/make-friendship';
import { makeUser } from '@test/factories/make-user';
import { InMemoryFriendshipsRepository } from '@test/repositories/in-memory-friendships-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let usersRepository: InMemoryOndeHojeUsersRepository;
let friendshipsRepository: InMemoryFriendshipsRepository;
let sut: RejectFriendshipUseCase;

function setUpPendingRequest() {
  const requester = makeUser();
  const addressee = makeUser();
  usersRepository.items.push(requester, addressee);

  friendshipsRepository.items.push(
    makeFriendship({
      requesterId: new UniqueEntityID(requester.publicId),
      addresseeId: new UniqueEntityID(addressee.publicId),
      status: 'PENDING',
    }),
  );

  return { requester, addressee };
}

describe('Reject Friendship', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    friendshipsRepository = new InMemoryFriendshipsRepository(usersRepository);
    sut = new RejectFriendshipUseCase(friendshipsRepository, usersRepository);
  });

  it('lets the addressee reject a pending request, dropping it', async () => {
    const { requester, addressee } = setUpPendingRequest();

    const result = await sut.execute({
      currentUserPublicId: addressee.publicId,
      requesterUsername: requester.username,
    });

    expect(result.isSuccess()).toBe(true);
    expect(friendshipsRepository.items).toHaveLength(0);
  });

  it('does not let the requester reject their own request', async () => {
    const { requester } = setUpPendingRequest();

    const result = await sut.execute({
      currentUserPublicId: requester.publicId,
      requesterUsername: requester.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
    expect(friendshipsRepository.items).toHaveLength(1);
  });

  it('does not reject an already accepted friendship', async () => {
    const { requester, addressee } = setUpPendingRequest();
    friendshipsRepository.items[0].accept();

    const result = await sut.execute({
      currentUserPublicId: addressee.publicId,
      requesterUsername: requester.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
    expect(friendshipsRepository.items).toHaveLength(1);
  });

  it('fails when there is no request between the two', async () => {
    const addressee = makeUser();
    const requester = makeUser();
    usersRepository.items.push(addressee, requester);

    const result = await sut.execute({
      currentUserPublicId: addressee.publicId,
      requesterUsername: requester.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
