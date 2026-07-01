import { Controller, Inject, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { map } from 'rxjs';
import { EventBus } from '@/core/events/event-bus';

@ApiTags('Realtime')
@ApiBearerAuth()
@Controller('/events')
export class EventsStreamController {
  constructor(@Inject(EventBus) private eventBus: EventBus) {}

  @Sse()
  @ApiOperation({ summary: 'Stream domain events through Server-Sent Events' })
  handle() {
    return this.eventBus.stream().pipe(
      map((event) => ({
        id: event.eventId,
        type: event.eventName,
        data: event,
      })),
    );
  }
}
