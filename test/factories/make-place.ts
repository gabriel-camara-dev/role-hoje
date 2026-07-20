import { faker } from '@faker-js/faker';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { Place, type PlaceProps } from '@/domain/main/enterprise/entities/onde-hoje/places/place';

export function makePlace(override: Partial<PlaceProps> = {}, id?: UniqueEntityID) {
  return Place.create(
    {
      googlePlaceId: `g-${faker.string.alphanumeric(8)}`,
      name: faker.company.name(),
      googlePlaceName: null,
      nickname: null,
      formattedAddress: faker.location.streetAddress(),
      latitude: faker.location.latitude(),
      longitude: faker.location.longitude(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      country: 'BR',
      photoUrl: null,
      websiteUrl: null,
      mapsUrl: null,
      createdById: new UniqueEntityID(),
      ...override,
    },
    id,
  );
}
