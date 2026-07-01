import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpsertPlaceUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/upsert-place';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { PlacePresenter } from '@/infra/http/presenters/onde-hoje/place-presenter';
import {
  CreatePlaceBodyDto,
  PlaceResponseDto,
} from '@/infra/http/swagger/presenter-schemas/onde-hoje/place-presenter-schema';
import { ZodValidationPipe } from '../../../pipes/zod-validation-pipe';
import { createPlaceSchema, type CreatePlaceBody } from './place-schemas';

@ApiTags('Onde Hoje - Places')
@ApiBearerAuth()
@Controller('/places')
export class UpsertPlaceController {
  constructor(@Inject(UpsertPlaceUseCase) private upsertPlaceUseCase: UpsertPlaceUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Register or update a Google Maps place' })
  @ApiBody({ type: CreatePlaceBodyDto })
  @ApiCreatedResponse({ description: 'Place registered or updated successfully.', type: PlaceResponseDto })
  async handle(
    @CurrentUser() currentUser: UserPayload,
    @Body(new ZodValidationPipe<CreatePlaceBody>(createPlaceSchema)) body: CreatePlaceBody,
  ) {
    const result = await this.upsertPlaceUseCase.execute({
      currentUserPublicId: currentUser.sub,
      ...body,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return PlacePresenter.toHTTP(result.value.place);
  }
}
