import { Module } from '@nestjs/common';
import { EventsModule } from '@/infra/events/events.module';
import { EventsStreamController } from './events-stream.controller';

@Module({
  imports: [EventsModule],
  controllers: [EventsStreamController],
})
export class RealtimeModule {}
