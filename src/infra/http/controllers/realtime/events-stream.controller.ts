import { Controller, Inject, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { filter, map } from 'rxjs';
import { EventBus } from '@/core/events/event-bus';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';

@ApiTags('Realtime')
@ApiBearerAuth()
@Controller('/events')
export class EventsStreamController {
  constructor(@Inject(EventBus) private eventBus: EventBus) {}

  @Sse()
  @ApiOperation({ summary: 'Stream domain events through Server-Sent Events' })
  handle(@CurrentUser() currentUser: UserPayload) {
    return this.eventBus.stream().pipe(
      filter((event) => event.recipientIds?.includes(currentUser.sub) === true),
      map((event) => ({
        id: event.eventId,
        type: event.eventName,
        data: event,
      })),
    );
  }
}
