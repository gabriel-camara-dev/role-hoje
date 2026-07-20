import { Entity } from '@/core/entities/entity';
import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { Optional } from '@/core/types/optional';

export type GroupPrivacy = 'PUBLIC' | 'PRIVATE';

export interface GroupProps {
  name: string;
  slug: string;
  description: string | null;
  privacy: GroupPrivacy;
  passwordHash: string | null;
  city: string | null;
  state: string | null;
  ownerId: UniqueEntityID;
  createdAt: Date;
}

export class Group extends Entity<GroupProps> {
  get name() {
    return this.props.name;
  }

  get slug() {
    return this.props.slug;
  }

  get description() {
    return this.props.description;
  }

  get privacy() {
    return this.props.privacy;
  }

  get passwordHash() {
    return this.props.passwordHash;
  }

  get city() {
    return this.props.city;
  }

  get state() {
    return this.props.state;
  }

  get ownerId() {
    return this.props.ownerId;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get isPublic() {
    return this.props.privacy === 'PUBLIC';
  }

  /**
   * Ownership lives both in the OWNER membership and in this denormalised
   * column, so handing the group over has to move both.
   */
  handOverTo(ownerId: UniqueEntityID) {
    this.props.ownerId = ownerId;
  }

  static create(props: Optional<GroupProps, 'slug' | 'createdAt'>, id?: UniqueEntityID) {
    return new Group(
      {
        ...props,
        slug: props.slug ?? Group.slugify(props.name),
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    );
  }

  private static slugify(name: string) {
    const base = name
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return `${base}-${Date.now().toString(36)}`;
  }
}
