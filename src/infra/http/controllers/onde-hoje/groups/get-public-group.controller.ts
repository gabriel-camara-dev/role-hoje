import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GroupPresenter } from '@/infra/http/presenters/onde-hoje/group-presenter';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { GetPublicGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/get-public-group';
import { PublicGroupResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/group-presenter-schema';

@ApiTags('Onde Hoje - Groups')
@ApiBearerAuth()
@Controller('/groups')
export class GetPublicGroupController {
  constructor(@Inject(GetPublicGroupUseCase) private getPublicGroupUseCase: GetPublicGroupUseCase) {}

  @Get('/:groupPublicId')
  @Public()
  @ApiOperation({ summary: 'Show a public group with its members' })
  @ApiParam({ name: 'groupPublicId', type: String })
  @ApiOkResponse({ description: 'Public group retrieved successfully.', type: PublicGroupResponseDto })
  async handle(@Param('groupPublicId') groupPublicId: string) {
    const result = await this.getPublicGroupUseCase.execute({ groupPublicId });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return {
      ...GroupPresenter.toHTTP(result.value.group),
      members: result.value.group.members,
    };
  }
}
