import { EMPTY, type Observable } from 'rxjs';
import { EventBus } from '@/core/events/event-bus';
import type { IntegrationEvent } from '@/core/events/integration-event';

/** Collects published integration events instead of pushing them to Redis. */
export class FakeEventBus extends EventBus {
  public events: IntegrationEvent[] = [];

  async publish(event: IntegrationEvent): Promise<void> {
    this.events.push(event);
  }

  async publishMany(events: IntegrationEvent[]): Promise<void> {
    this.events.push(...events);
  }

  stream(): Observable<IntegrationEvent> {
    return EMPTY;
  }
}
