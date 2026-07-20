import { ResourceNotFoundError } from '../errors/resource-not-found-error';
import { UpdateUserAvatarUseCase } from './update-user-avatar';
import { makeUser } from '@test/factories/make-user';
import { InMemoryUsersRepository } from '@test/repositories/in-memory-users-repository';

let usersRepository: InMemoryUsersRepository;
let sut: UpdateUserAvatarUseCase;

const avatar = {
  encryptedPath: 'enc/path',
  iv: 'iv',
  authTag: 'tag',
  mimeType: 'image/png',
  originalName: 'me.png',
};

describe('Update User Avatar', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    sut = new UpdateUserAvatarUseCase(usersRepository);
  });

  it('stores the encrypted avatar fields and stamps the update time', async () => {
    const user = makeUser({ avatarUpdatedAt: null });
    usersRepository.items.push(user);

    const result = await sut.execute({ currentUserPublicId: user.publicId, ...avatar });

    expect(result.isSuccess()).toBe(true);
    expect(usersRepository.items[0].avatarEncryptedPath).toBe('enc/path');
    expect(usersRepository.items[0].avatarMimeType).toBe('image/png');
    expect(usersRepository.items[0].avatarUpdatedAt).not.toBeNull();
  });

  it('fails for an unknown authenticated user', async () => {
    const result = await sut.execute({ currentUserPublicId: 'non-existing-public-id', ...avatar });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
