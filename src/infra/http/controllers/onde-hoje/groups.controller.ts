import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { AcceptGroupMemberUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/accept-group-member';
import { CreateGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/create-group';
import { JoinGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/join-group';
import { ListPublicGroupsUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/list-public-groups';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { GroupPresenter } from '@/infra/http/presenters/onde-hoje/group-presenter';
import {
  CreateGroupBodyDto,
  GroupMembershipResponseDto,
  GroupResponseDto,
} from '@/infra/http/swagger/presenter-schemas/onde-hoje/group-presenter-schema';
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe';

const createGroupSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(280).optional(),
  privacy: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
});

type CreateGroupBody = z.infer<typeof createGroupSchema>;

@ApiTags('Onde Hoje - Groups')
@ApiBearerAuth()
@Controller('/groups')
export class GroupsController {
  constructor(
    @Inject(ListPublicGroupsUseCase) private listPublicGroupsUseCase: ListPublicGroupsUseCase,
    @Inject(CreateGroupUseCase) private createGroupUseCase: CreateGroupUseCase,
    @Inject(JoinGroupUseCase) private joinGroupUseCase: JoinGroupUseCase,
    @Inject(AcceptGroupMemberUseCase) private acceptGroupMemberUseCase: AcceptGroupMemberUseCase,
  ) {}

  @Get('/public')
  @Public()
  @ApiOperation({ summary: 'List public groups' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiOkResponse({ description: 'Public groups retrieved successfully.', type: [GroupResponseDto] })
  async publicGroups(@Query('city') city?: string) {
    const result = await this.listPublicGroupsUseCase.execute({ city });

    return result.value.groups.map((group) => GroupPresenter.toHTTP(group));
  }

  @Post()
  @ApiOperation({ summary: 'Create a public or private group' })
  @ApiBody({ type: CreateGroupBodyDto })
  @ApiCreatedResponse({ description: 'Group created successfully.', type: GroupResponseDto })
  async create(
    @CurrentUser() currentUser: UserPayload,
    @Body(new ZodValidationPipe<CreateGroupBody>(createGroupSchema)) body: CreateGroupBody,
  ) {
    const result = await this.createGroupUseCase.execute({
      currentUserPublicId: currentUser.sub,
      ...body,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return GroupPresenter.toHTTP(result.value.group);
  }

  @Post('/:groupPublicId/join')
  @ApiOperation({ summary: 'Join a public group or request access to a private one' })
  @ApiParam({ name: 'groupPublicId', type: String })
  @ApiCreatedResponse({ description: 'Membership created or updated successfully.', type: GroupMembershipResponseDto })
  async join(@CurrentUser() currentUser: UserPayload, @Param('groupPublicId') groupPublicId: string) {
    const result = await this.joinGroupUseCase.execute({
      currentUserPublicId: currentUser.sub,
      groupPublicId,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.membership;
  }

  @Post('/:groupPublicId/members/:userPublicId/accept')
  @ApiOperation({ summary: 'Accept a pending member request. Only the group leader can accept.' })
  @ApiParam({ name: 'groupPublicId', type: String })
  @ApiParam({ name: 'userPublicId', type: String })
  @ApiCreatedResponse({ description: 'Member request accepted successfully.', type: GroupMembershipResponseDto })
  @ApiForbiddenResponse({ description: 'Only the group leader can accept members.' })
  @ApiNotFoundResponse({ description: 'Group or member request not found.' })
  @ApiConflictResponse({ description: 'Member request is not pending.' })
  async acceptMember(
    @CurrentUser() currentUser: UserPayload,
    @Param('groupPublicId') groupPublicId: string,
    @Param('userPublicId') userPublicId: string,
  ) {
    const result = await this.acceptGroupMemberUseCase.execute({
      currentUserPublicId: currentUser.sub,
      groupPublicId,
      memberPublicId: userPublicId,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.membership;
  }
}
