import type { AggregateRoot } from '../entities/aggregate-root';
import type { UniqueEntityID } from '../entities/unique-entity-id';
import type { DomainEvent } from './domain-event';

type DomainEventCallback<T extends DomainEvent = DomainEvent> = (event: T) => void;

/**
 * In-process registry that fans a persisted aggregate's domain events out to the
 * subscribers registered for them. A repository calls
 * {@link dispatchEventsForAggregate} right after it saves an aggregate; the
 * subscribers turn those facts into side effects (notifications, SSE, ...).
 */
export class DomainEvents {
  private static handlersMap: Record<string, DomainEventCallback[]> = {};
  private static markedAggregates: AggregateRoot<unknown>[] = [];

  /** Tests flip this off to assert on aggregate state without side effects firing. */
  public static shouldRun = true;

  public static markAggregateForDispatch(aggregate: AggregateRoot<unknown>) {
    const alreadyMarked = Boolean(DomainEvents.findMarkedAggregateByID(aggregate.id));

    if (!alreadyMarked) {
      DomainEvents.markedAggregates.push(aggregate);
    }
  }

  public static dispatchEventsForAggregate(id: UniqueEntityID) {
    const aggregate = DomainEvents.findMarkedAggregateByID(id);

    if (aggregate) {
      DomainEvents.dispatchAggregateEvents(aggregate);
      aggregate.clearEvents();
      DomainEvents.removeAggregateFromMarkedDispatchList(aggregate);
    }
  }

  public static register<T extends DomainEvent>(callback: DomainEventCallback<T>, eventClassName: string) {
    const wasRegisteredBefore = eventClassName in DomainEvents.handlersMap;

    if (!wasRegisteredBefore) {
      DomainEvents.handlersMap[eventClassName] = [];
    }

    DomainEvents.handlersMap[eventClassName].push(callback as DomainEventCallback);
  }

  public static clearHandlers() {
    DomainEvents.handlersMap = {};
  }

  public static clearMarkedAggregates() {
    DomainEvents.markedAggregates = [];
  }

  private static dispatchAggregateEvents(aggregate: AggregateRoot<unknown>) {
    for (const event of aggregate.domainEvents) {
      DomainEvents.dispatch(event);
    }
  }

  private static removeAggregateFromMarkedDispatchList(aggregate: AggregateRoot<unknown>) {
    const index = DomainEvents.markedAggregates.findIndex((candidate) => candidate.equals(aggregate));

    DomainEvents.markedAggregates.splice(index, 1);
  }

  private static findMarkedAggregateByID(id: UniqueEntityID): AggregateRoot<unknown> | undefined {
    return DomainEvents.markedAggregates.find((aggregate) => aggregate.id.equals(id));
  }

  private static dispatch(event: DomainEvent) {
    if (!DomainEvents.shouldRun) {
      return;
    }

    const eventClassName = event.constructor.name;
    const handlers = DomainEvents.handlersMap[eventClassName];

    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }
  }
}
