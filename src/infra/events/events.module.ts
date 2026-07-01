import { Module } from '@nestjs/common';
import { EventBus } from '@/core/events/event-bus';
import { CacheModule } from '@/infra/cache/cache.module';
import { RedisEventBus } from './redis-event-bus';

@Module({
  imports: [CacheModule],
  providers: [
    RedisEventBus,
    {
      provide: EventBus,
      useExisting: RedisEventBus,
    },
  ],
  exports: [EventBus],
})
export class EventsModule {}
