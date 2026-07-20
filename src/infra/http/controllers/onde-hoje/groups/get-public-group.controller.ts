import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { GroupDetailsPresenter, GroupMemberInfoPresenter } from '@/infra/http/presenters/onde-hoje/group-presenter';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { GetPublicGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/get-public-group';
import { PublicGroupResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/group-presenter-schema';
import { OptionalViewerResolver } from '../map/optional-viewer';

@ApiTags('Onde Hoje - Groups')
@ApiBearerAuth()
@Controller('/groups')
export class GetPublicGroupController {
  constructor(
    @Inject(GetPublicGroupUseCase) private getPublicGroupUseCase: GetPublicGroupUseCase,
    @Inject(OptionalViewerResolver) private optionalViewerResolver: OptionalViewerResolver,
  ) {}

  @Get('/:groupPublicId')
  @Public()
  @ApiOperation({ summary: 'Show a public group with its members' })
  @ApiParam({ name: 'groupPublicId', type: String })
  @ApiOkResponse({ description: 'Public group retrieved successfully.', type: PublicGroupResponseDto })
  async handle(@Req() request: Request, @Param('groupPublicId') groupPublicId: string) {
    const viewerPublicId = await this.optionalViewerResolver.getPublicId(request);
    const result = await this.getPublicGroupUseCase.execute({ groupPublicId });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return {
      ...GroupDetailsPresenter.toHTTP(result.value.group),
      members: viewerPublicId
        ? result.value.group.members.map((member) => GroupMemberInfoPresenter.toHTTP(member))
        : [],
    };
  }
}
