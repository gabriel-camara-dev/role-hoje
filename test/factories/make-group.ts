import { faker } from '@faker-js/faker';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { Group, type GroupProps } from '@/domain/main/enterprise/entities/onde-hoje/groups/group';

export function makeGroup(override: Partial<GroupProps> = {}, id?: UniqueEntityID) {
  return Group.create(
    {
      name: faker.company.name(),
      description: faker.lorem.sentence(),
      privacy: 'PUBLIC',
      passwordHash: null,
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      ownerId: new UniqueEntityID(),
      ...override,
    },
    id,
  );
}
