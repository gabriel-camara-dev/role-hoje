import { ForbiddenError } from '../errors/forbidden-error';
import { ListUsersUseCase } from './list-users';
import { makeUser } from '@test/factories/make-user';
import { InMemoryUsersRepository } from '@test/repositories/in-memory-users-repository';

let usersRepository: InMemoryUsersRepository;
let sut: ListUsersUseCase;

describe('List Users', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    sut = new ListUsersUseCase(usersRepository);
  });

  it('lets an admin list users with pagination metadata', async () => {
    usersRepository.items.push(makeUser(), makeUser(), makeUser());

    const result = await sut.execute({ currentUserRole: 'ADMIN', page: 1, limit: 2 });

    expect(result.isSuccess()).toBe(true);
    const { users } = (result as { value: { users: { data: unknown[]; totalCount: number; totalPages: number } } })
      .value;
    expect(users.data).toHaveLength(2);
    expect(users.totalCount).toBe(3);
    expect(users.totalPages).toBe(2);
  });

  it('filters by username', async () => {
    usersRepository.items.push(makeUser({ username: 'ana_costa' }), makeUser({ username: 'bruno' }));

    const result = await sut.execute({ currentUserRole: 'ADMIN', username: 'ana' });

    const { users } = (result as { value: { users: { data: Array<{ username: string }> } } }).value;
    expect(users.data).toHaveLength(1);
    expect(users.data[0].username).toBe('ana_costa');
  });

  it('forbids a non-admin', async () => {
    const result = await sut.execute({ currentUserRole: 'DEFAULT' });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ForbiddenError);
  });
});
