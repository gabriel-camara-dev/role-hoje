import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ListPublicGroupsUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/list-public-groups';
import { Public } from '@/infra/auth/public';
import { GroupPresenter } from '@/infra/http/presenters/onde-hoje/group-presenter';
import { GroupResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/group-presenter-schema';

@ApiTags('Onde Hoje - Groups')
@ApiBearerAuth()
@Controller('/groups')
export class ListPublicGroupsController {
  constructor(@Inject(ListPublicGroupsUseCase) private listPublicGroupsUseCase: ListPublicGroupsUseCase) {}

  @Get('/public')
  @Public()
  @ApiOperation({ summary: 'List public groups' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiOkResponse({ description: 'Public groups retrieved successfully.', type: [GroupResponseDto] })
  async handle(@Query('city') city?: string) {
    const result = await this.listPublicGroupsUseCase.execute({ city });

    return result.value.groups.map((group) => GroupPresenter.toHTTP(group));
  }
}
