import { Module } from '@nestjs/common';
import { ListMyVoteHistoryUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-my-vote-history';
import { CancelVoteUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/cancel-vote';
import { VoteTodayUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/vote-today';
import { CacheModule } from '@/infra/cache/cache.module';
import { DatabaseModule } from '@/infra/database/database.module';
import { EventsModule } from '@/infra/events/events.module';
import { ListMyVoteHistoryController } from './list-my-vote-history.controller';
import { VotePlaceController } from './vote-place.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, EventsModule, CacheModule, NotificationsModule],
  controllers: [ListMyVoteHistoryController, VotePlaceController],
  providers: [CancelVoteUseCase, ListMyVoteHistoryUseCase, VoteTodayUseCase],
})
export class VotesModule {}
