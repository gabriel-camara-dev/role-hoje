import type { GeocodingGateway } from '../../../gateways/geocoding-gateway';
import type { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import type { Place } from '../../../../enterprise/entities/onde-hoje/places/place';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { UpsertPlaceUseCase } from './upsert-place';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { makePlace } from '@test/factories/make-place';
import { makeUser } from '@test/factories/make-user';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let usersRepository: InMemoryOndeHojeUsersRepository;
let upsert: ReturnType<typeof vi.fn>;
let reverseGeocode: ReturnType<typeof vi.fn>;
let sut: UpsertPlaceUseCase;

const baseRequest = {
  googlePlaceId: 'g-1',
  name: 'Bar',
  formattedAddress: 'Rua X, 10',
  latitude: -22.9,
  longitude: -43.1,
};

/** The entity the use case handed to the repository. */
function upsertedPlace(): Place {
  return upsert.mock.calls[0][0] as Place;
}

describe('Upsert Place', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    upsert = vi.fn(async () => makePlace());
    reverseGeocode = vi.fn(async () => null);
    sut = new UpsertPlaceUseCase(
      { upsert } as unknown as PlacesRepository,
      usersRepository,
      { reverseGeocode } as unknown as GeocodingGateway,
      new FakeEventBus(),
    );
  });

  it('upserts the place with the creator and publishes an event', async () => {
    const user = makeUser();
    usersRepository.items.push(user);

    const result = await sut.execute({ currentUserPublicId: user.publicId, ...baseRequest, city: 'Rio', state: 'RJ' });

    expect(result.isSuccess()).toBe(true);
    expect(upsertedPlace().createdById?.toString()).toBe(user.publicId);
    expect(upsertedPlace().city).toBe('Rio');
    expect(upsertedPlace().state).toBe('RJ');
    // City/state already present, so no reverse geocoding is attempted.
    expect(reverseGeocode).not.toHaveBeenCalled();
  });

  it('reverse-geocodes to fill a missing city/state', async () => {
    const user = makeUser();
    usersRepository.items.push(user);
    reverseGeocode.mockResolvedValue({ city: 'Niteroi', state: 'RJ', country: 'BR', formattedAddress: 'Resolved' });

    await sut.execute({ currentUserPublicId: user.publicId, ...baseRequest });

    expect(reverseGeocode).toHaveBeenCalledWith(-22.9, -43.1);
    expect(upsertedPlace().city).toBe('Niteroi');
    expect(upsertedPlace().state).toBe('RJ');
  });

  it('keeps the client address for a normal place even after geocoding', async () => {
    const user = makeUser();
    usersRepository.items.push(user);
    reverseGeocode.mockResolvedValue({ city: 'Niteroi', state: 'RJ', country: 'BR', formattedAddress: 'Resolved' });

    await sut.execute({ currentUserPublicId: user.publicId, ...baseRequest });

    // Not a map-click, so the original formattedAddress is preserved.
    expect(upsertedPlace().formattedAddress).toBe('Rua X, 10');
  });

  it('adopts the geocoded address for a map-click place', async () => {
    const user = makeUser();
    usersRepository.items.push(user);
    reverseGeocode.mockResolvedValue({ city: 'Niteroi', state: 'RJ', country: 'BR', formattedAddress: 'Resolved' });

    await sut.execute({ currentUserPublicId: user.publicId, ...baseRequest, googlePlaceId: 'map-click:abc' });

    expect(upsertedPlace().formattedAddress).toBe('Resolved');
  });

  it('lets a nickname win over the name for display', async () => {
    const user = makeUser();
    usersRepository.items.push(user);

    await sut.execute({
      currentUserPublicId: user.publicId,
      ...baseRequest,
      city: 'Rio',
      state: 'RJ',
      nickname: '  Bar do Zé  ',
    });

    expect(upsertedPlace().name).toBe('Bar do Zé');
    expect(upsertedPlace().nickname).toBe('Bar do Zé');
  });

  it('fails for an unknown authenticated user', async () => {
    const result = await sut.execute({ currentUserPublicId: 'non-existing-public-id', ...baseRequest });

    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
    expect(upsert).not.toHaveBeenCalled();
  });
});
