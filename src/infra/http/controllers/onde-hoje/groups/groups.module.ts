import { Module } from '@nestjs/common';
import { AcceptGroupMemberUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/accept-group-member';
import { CreateGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/create-group';
import { GetPublicGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/get-public-group';
import { InviteGroupMemberUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/invite-group-member';
import { JoinGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/join-group';
import { LeaveGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/leave-group';
import { ListMyGroupsUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/list-my-groups';
import { ListPublicGroupsUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/list-public-groups';
import { RemoveGroupMemberUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/remove-group-member';
import { PasswordHasher } from '@/domain/main/application/use-cases/users/password-hasher';
import { BcryptPasswordHasher } from '@/infra/auth/bcrypt-password-hasher';
import { CacheModule } from '@/infra/cache/cache.module';
import { DatabaseModule } from '@/infra/database/database.module';
import { EnvModule } from '@/infra/env/env.module';
import { EventsModule } from '@/infra/events/events.module';
import { AcceptGroupMemberController } from './accept-group-member.controller';
import { CreateGroupController } from './create-group.controller';
import { GetPublicGroupController } from './get-public-group.controller';
import { InviteGroupMemberController } from './invite-group-member.controller';
import { JoinGroupController } from './join-group.controller';
import { LeaveGroupController } from './leave-group.controller';
import { ListMyGroupsController } from './list-my-groups.controller';
import { ListPublicGroupsController } from './list-public-groups.controller';
import { RemoveGroupMemberController } from './remove-group-member.controller';
import { OptionalViewerResolver } from '../map/optional-viewer';

@Module({
  imports: [DatabaseModule, EventsModule, EnvModule, CacheModule],
  controllers: [
    ListPublicGroupsController,
    ListMyGroupsController,
    GetPublicGroupController,
    CreateGroupController,
    JoinGroupController,
    LeaveGroupController,
    AcceptGroupMemberController,
    InviteGroupMemberController,
    RemoveGroupMemberController,
  ],
  providers: [
    ListPublicGroupsUseCase,
    ListMyGroupsUseCase,
    GetPublicGroupUseCase,
    CreateGroupUseCase,
    JoinGroupUseCase,
    LeaveGroupUseCase,
    AcceptGroupMemberUseCase,
    InviteGroupMemberUseCase,
    RemoveGroupMemberUseCase,
    OptionalViewerResolver,
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
  ],
})
export class GroupsModule {}
