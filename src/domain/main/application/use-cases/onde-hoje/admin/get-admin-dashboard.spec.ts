import { ForbiddenError } from '../../errors/forbidden-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { GetAdminDashboardUseCase } from './get-admin-dashboard';
import { makeUser } from '@test/factories/make-user';
import { InMemoryAdminDashboardRepository } from '@test/repositories/in-memory-admin-dashboard-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let usersRepository: InMemoryOndeHojeUsersRepository;
let dashboardRepository: InMemoryAdminDashboardRepository;
let sut: GetAdminDashboardUseCase;

describe('Get Admin Dashboard', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    dashboardRepository = new InMemoryAdminDashboardRepository();
    sut = new GetAdminDashboardUseCase(dashboardRepository, usersRepository);
  });

  it('returns the dashboard for an admin', async () => {
    const admin = makeUser({ role: 'ADMIN' });
    usersRepository.items.push(admin);

    const result = await sut.execute({ currentUserPublicId: admin.publicId });

    expect(result.isSuccess()).toBe(true);
    expect((result as { value: { dashboard: unknown } }).value.dashboard).toBe(dashboardRepository.dashboard);
  });

  it('forbids a non-admin', async () => {
    const user = makeUser({ role: 'DEFAULT' });
    usersRepository.items.push(user);

    const result = await sut.execute({ currentUserPublicId: user.publicId });

    expect((result as { value: unknown }).value).toBeInstanceOf(ForbiddenError);
  });

  it('fails for an unknown authenticated user', async () => {
    const result = await sut.execute({ currentUserPublicId: 'non-existing-public-id' });

    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
