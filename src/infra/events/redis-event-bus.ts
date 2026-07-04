import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { filter, Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import type { EventBus } from '@/core/events/event-bus';
import type { DomainEvent } from '@/core/events/domain-event';
import { RedisService } from '@/infra/cache/redis/redis.service';

const domainEventsChannel = 'domain-events';

@Injectable()
export class RedisEventBus implements EventBus, OnModuleInit {
  private readonly logger = new Logger(RedisEventBus.name);
  private readonly events = new Subject<DomainEvent>();

  constructor(@Inject(RedisService) private redis: RedisService) {}

  async onModuleInit() {
    await this.redis.subscribeToChannel(domainEventsChannel, (message) => {
      try {
        const event = JSON.parse(message) as DomainEvent<string>;

        this.events.next({
          ...event,
          occurredAt: new Date(event.occurredAt),
        });
      } catch (error) {
        this.logger.warn(`Invalid domain event message received: ${String(error)}`);
      }
    });
  }

  async publish(event: DomainEvent) {
    this.events.next(event);

    try {
      await this.redis.publish(domainEventsChannel, JSON.stringify(event));
    } catch (error) {
      this.logger.warn(`Domain event published locally only: ${String(error)}`);
    }
  }

  async publishMany(events: DomainEvent[]) {
    await Promise.all(events.map((event) => this.publish(event)));
  }

  stream(eventName?: string): Observable<DomainEvent> {
    if (!eventName) {
      return this.events.asObservable();
    }

    return this.events.asObservable().pipe(filter((event) => event.eventName === eventName));
  }
}
