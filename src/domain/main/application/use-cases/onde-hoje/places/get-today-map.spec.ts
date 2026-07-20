import type { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import type { TodayMapPlace } from '../../../../enterprise/entities/onde-hoje/places/today-map-place';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { GetTodayMapUseCase } from './get-today-map';

let todayMap: ReturnType<typeof vi.fn>;
let sut: GetTodayMapUseCase;

describe('Get Today Map', () => {
  beforeEach(() => {
    todayMap = vi.fn(async () => [] as TodayMapPlace[]);
    sut = new GetTodayMapUseCase({ todayMap } as unknown as PlacesRepository);
  });

  it('returns the places for a valid query', async () => {
    const places = [{ publicId: 'place-1' }] as unknown as TodayMapPlace[];
    todayMap.mockResolvedValue(places);

    const result = await sut.execute({ city: 'Niteroi' });

    expect(result.isSuccess()).toBe(true);
    expect((result as { value: { places: TodayMapPlace[] } }).value.places).toBe(places);
  });

  it('fails when the group is not found (repo returns null)', async () => {
    todayMap.mockResolvedValue(null);

    const result = await sut.execute({ groupPublicId: 'ghost-group' });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
