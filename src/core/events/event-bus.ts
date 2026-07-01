import type { Observable } from 'rxjs';
import type { DomainEvent } from './domain-event';

export abstract class EventBus {
  abstract publish(event: DomainEvent): Promise<void>;
  abstract publishMany(events: DomainEvent[]): Promise<void>;
  abstract stream(eventName?: string): Observable<DomainEvent>;
}
