export interface DomainEvent<Payload = unknown> {
  eventId: string;
  eventName: string;
  aggregateId?: string;
  occurredAt: Date;
  payload: Payload;
  actorId?: string;
  recipientIds?: string[];
}

export type CreateDomainEventInput<Payload> = Omit<DomainEvent<Payload>, 'eventId' | 'occurredAt'> & {
  eventId?: string;
  occurredAt?: Date;
};

export function createDomainEvent<Payload>(input: CreateDomainEventInput<Payload>): DomainEvent<Payload> {
  return {
    eventId: input.eventId ?? crypto.randomUUID(),
    eventName: input.eventName,
    aggregateId: input.aggregateId,
    occurredAt: input.occurredAt ?? new Date(),
    payload: input.payload,
    actorId: input.actorId,
    recipientIds: input.recipientIds,
  };
}
