import type { Observable } from 'rxjs';
import type { IntegrationEvent } from './integration-event';

/**
 * Cross-process transport for integration events: Redis pub/sub between
 * instances, and the source the SSE endpoint streams to the browser. Domain
 * events (in-process, via {@link DomainEvents}) are a separate concern; a
 * subscriber bridges the two by publishing an integration event here.
 */
export abstract class EventBus {
  abstract publish(event: IntegrationEvent): Promise<void>;
  abstract publishMany(events: IntegrationEvent[]): Promise<void>;
  abstract stream(eventName?: string): Observable<IntegrationEvent>;
}
