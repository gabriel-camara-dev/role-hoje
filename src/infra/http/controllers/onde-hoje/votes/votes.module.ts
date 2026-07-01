import { Module } from '@nestjs/common';
import { ListMyVoteHistoryUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-my-vote-history';
import { VoteTodayUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/vote-today';
import { DatabaseModule } from '@/infra/database/database.module';
import { EventsModule } from '@/infra/events/events.module';
import { ListMyVoteHistoryController } from './list-my-vote-history.controller';
import { VotePlaceController } from './vote-place.controller';

@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: [ListMyVoteHistoryController, VotePlaceController],
  providers: [ListMyVoteHistoryUseCase, VoteTodayUseCase],
})
export class VotesModule {}
