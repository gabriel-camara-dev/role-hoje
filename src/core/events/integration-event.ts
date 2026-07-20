/**
 * The cross-process event envelope carried by the {@link EventBus} (Redis
 * pub/sub → SSE). Distinct from a {@link DomainEvent}: a domain event is an
 * in-process fact an aggregate raised, whereas an integration event is the
 * serialisable message other instances and the browser receive.
 */
export interface IntegrationEvent<Payload = unknown> {
  eventId: string;
  eventName: string;
  aggregateId?: string;
  occurredAt: Date;
  payload: Payload;
  actorId?: string;
  recipientIds?: string[];
}

export type CreateIntegrationEventInput<Payload> = Omit<IntegrationEvent<Payload>, 'eventId' | 'occurredAt'> & {
  eventId?: string;
  occurredAt?: Date;
};

export function createIntegrationEvent<Payload>(
  input: CreateIntegrationEventInput<Payload>,
): IntegrationEvent<Payload> {
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
