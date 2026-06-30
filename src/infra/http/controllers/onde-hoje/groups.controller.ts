import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CreateGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/create-group';
import { JoinGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/join-group';
import { ListPublicGroupsUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/list-public-groups';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { OndeHojePresenter } from '@/infra/http/presenters/onde-hoje-presenter';
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
  ) {}

  @Get('/public')
  @Public()
  @ApiOperation({ summary: 'List public groups' })
  async publicGroups(@Query('city') city?: string) {
    const result = await this.listPublicGroupsUseCase.execute({ city });

    return result.value.groups.map((group) => OndeHojePresenter.groupToHTTP(group));
  }

  @Post()
  @ApiOperation({ summary: 'Create a public or private group' })
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

    return OndeHojePresenter.groupToHTTP(result.value.group);
  }

  @Post('/:groupPublicId/join')
  @ApiOperation({ summary: 'Join a public group or request access to a private one' })
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
}
