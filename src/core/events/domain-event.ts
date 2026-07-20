import type { UniqueEntityID } from '../entities/unique-entity-id';

/**
 * A fact an aggregate raised in-process. Dispatched synchronously by
 * {@link DomainEvents} after the aggregate is persisted, to whichever
 * subscribers registered for it.
 *
 * Not to be confused with an IntegrationEvent, which is the serialisable
 * message the {@link EventBus} carries across processes and to the browser.
 */
export interface DomainEvent {
  occurredAt: Date;
  getAggregateId(): UniqueEntityID;
}
