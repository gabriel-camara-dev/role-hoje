import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ListUsersUseCase } from '@/domain/main/application/use-cases/users/list-users';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import {
  listUsersQuerySchema,
  type ListUsersQuerySchemaType,
} from '@/infra/http/schemas/users/list-users-query-schema';
import { ListUsersResponseDto } from '@/infra/http/swagger/presenter-schemas/user-presenter-schema';
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe';
import { UserPresenter } from '../../presenters/user-presenter';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('/users')
export class ListUsersController {
  constructor(@Inject(ListUsersUseCase) private listUsersUseCase: ListUsersUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List users' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'email', required: false })
  @ApiOkResponse({ description: 'Users retrieved successfully.', type: ListUsersResponseDto })
  async handle(
    @CurrentUser() currentUser: UserPayload,
    @Query(new ZodValidationPipe<ListUsersQuerySchemaType>(listUsersQuerySchema)) query: ListUsersQuerySchemaType,
  ) {
    const result = await this.listUsersUseCase.execute({ ...query, currentUserRole: currentUser.role });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    const { users } = result.value;

    return {
      currentPage: users.currentPage,
      totalCount: users.totalCount,
      totalPages: users.totalPages,
      data: UserPresenter.toHTTP(users.data),
    };
  }
}
