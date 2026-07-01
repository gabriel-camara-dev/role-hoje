import { Module } from '@nestjs/common';
import { AcceptGroupMemberUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/accept-group-member';
import { CreateGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/create-group';
import { JoinGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/join-group';
import { ListPublicGroupsUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/list-public-groups';
import { DatabaseModule } from '@/infra/database/database.module';
import { EventsModule } from '@/infra/events/events.module';
import { AcceptGroupMemberController } from './accept-group-member.controller';
import { CreateGroupController } from './create-group.controller';
import { JoinGroupController } from './join-group.controller';
import { ListPublicGroupsController } from './list-public-groups.controller';

@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: [ListPublicGroupsController, CreateGroupController, JoinGroupController, AcceptGroupMemberController],
  providers: [ListPublicGroupsUseCase, CreateGroupUseCase, JoinGroupUseCase, AcceptGroupMemberUseCase],
})
export class GroupsModule {}
