import { randomUUID } from 'node:crypto';

/**
 * The domain's identity for an entity. In this codebase it always carries the
 * row's `publicId`: the `id Int` autoincrement that Prisma uses as the real
 * primary key never leaves the infra layer.
 */
export class UniqueEntityID {
  private value: string;

  constructor(value?: string) {
    this.value = value ?? randomUUID();
  }

  toString() {
    return this.value;
  }

  toValue() {
    return this.value;
  }

  public equals(id: UniqueEntityID) {
    return id.toValue() === this.value;
  }
}
