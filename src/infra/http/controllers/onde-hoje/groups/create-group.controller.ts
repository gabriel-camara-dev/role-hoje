import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/create-group';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { GroupPresenter } from '@/infra/http/presenters/onde-hoje/group-presenter';
import {
  CreateGroupBodyDto,
  GroupResponseDto,
} from '@/infra/http/swagger/presenter-schemas/onde-hoje/group-presenter-schema';
import { ZodValidationPipe } from '../../../pipes/zod-validation-pipe';
import { createGroupSchema, type CreateGroupBody } from './group-schemas';

@ApiTags('Onde Hoje - Groups')
@ApiBearerAuth()
@Controller('/groups')
export class CreateGroupController {
  constructor(@Inject(CreateGroupUseCase) private createGroupUseCase: CreateGroupUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Create a public or private group' })
  @ApiBody({ type: CreateGroupBodyDto })
  @ApiCreatedResponse({ description: 'Group created successfully.', type: GroupResponseDto })
  async handle(
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
}
