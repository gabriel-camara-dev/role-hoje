import { EMPTY, type Observable } from 'rxjs';
import type { DomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';

/** Collects published events instead of pushing them to Redis. */
export class FakeEventBus extends EventBus {
  public events: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    this.events.push(...events);
  }

  stream(): Observable<DomainEvent> {
    return EMPTY;
  }
}
