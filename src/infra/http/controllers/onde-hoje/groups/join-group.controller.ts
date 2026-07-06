import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JoinGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/join-group';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import {
  joinGroupByIdSchema,
  joinGroupSchema,
  type JoinGroupBody,
  type JoinGroupByIdBody,
} from '@/infra/http/schemas/onde-hoje/groups/group-schemas';
import { GroupMembershipResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/group-presenter-schema';
import { ZodValidationPipe } from '../../../pipes/zod-validation-pipe';

@ApiTags('Onde Hoje - Groups')
@ApiBearerAuth()
@Controller('/groups')
export class JoinGroupController {
  constructor(@Inject(JoinGroupUseCase) private joinGroupUseCase: JoinGroupUseCase) {}

  @Post('/:groupPublicId/join')
  @ApiOperation({ summary: 'Join a public group or request access to a private one' })
  @ApiParam({ name: 'groupPublicId', type: String })
  @ApiCreatedResponse({ description: 'Membership created or updated successfully.', type: GroupMembershipResponseDto })
  async handle(
    @CurrentUser() currentUser: UserPayload,
    @Param('groupPublicId') groupPublicId: string,
    @Body(new ZodValidationPipe<JoinGroupByIdBody>(joinGroupByIdSchema)) body: JoinGroupByIdBody,
  ) {
    const result = await this.joinGroupUseCase.execute({
      currentUserPublicId: currentUser.sub,
      groupPublicId,
      password: body.password,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.membership;
  }

  @Post('/join')
  @ApiOperation({ summary: 'Join a group by name and optional password' })
  @ApiBody({ schema: { properties: { name: { type: 'string' }, password: { type: 'string' } }, required: ['name'] } })
  @ApiCreatedResponse({ description: 'Membership created or updated successfully.', type: GroupMembershipResponseDto })
  async joinByName(
    @CurrentUser() currentUser: UserPayload,
    @Body(new ZodValidationPipe<JoinGroupBody>(joinGroupSchema)) body: JoinGroupBody,
  ) {
    const result = await this.joinGroupUseCase.execute({
      currentUserPublicId: currentUser.sub,
      name: body.name,
      password: body.password,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.membership;
  }
}
