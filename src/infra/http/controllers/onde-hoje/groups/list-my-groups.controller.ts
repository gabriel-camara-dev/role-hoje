import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListMyGroupsUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/list-my-groups';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { MyGroupDetailsPresenter } from '@/infra/http/presenters/onde-hoje/group-presenter';

@ApiTags('Onde Hoje - Groups')
@ApiBearerAuth()
@Controller('/groups')
export class ListMyGroupsController {
  constructor(@Inject(ListMyGroupsUseCase) private listMyGroupsUseCase: ListMyGroupsUseCase) {}

  @Get('/my')
  @ApiOperation({ summary: 'List groups for the authenticated user' })
  @ApiOkResponse({ description: 'Groups retrieved successfully.' })
  async handle(@CurrentUser() currentUser: UserPayload) {
    const result = await this.listMyGroupsUseCase.execute({
      currentUserPublicId: currentUser.sub,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.groups.map((group) => MyGroupDetailsPresenter.toHTTP(group));
  }
}
