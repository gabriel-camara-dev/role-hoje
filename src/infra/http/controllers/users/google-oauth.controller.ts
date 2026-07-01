import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticateUserWithGoogleUseCase } from '@/domain/main/application/use-cases/users/authenticate-user-with-google';
import { UpdateUserAvatarUseCase } from '@/domain/main/application/use-cases/users/update-user-avatar';
import type { User } from '@/domain/main/enterprise/entities/user';
import type { GoogleOAuthUser } from '@/infra/auth/google-strategy';
import { Public } from '@/infra/auth/public';
import { AuthenticateUserResponseDto } from '@/infra/http/swagger/presenter-schemas/user-presenter-schema';
import { EncryptedAvatarStorageService } from '@/infra/storage/encrypted-avatar-storage.service';
import { UserPresenter } from '../../presenters/user-presenter';

type GoogleOAuthRequest = Request & {
  user: GoogleOAuthUser;
};

@ApiTags('Auth')
@Controller('/sessions/google')
export class GoogleOAuthController {
  constructor(
    @Inject(AuthenticateUserWithGoogleUseCase)
    private authenticateUserWithGoogleUseCase: AuthenticateUserWithGoogleUseCase,
    @Inject(UpdateUserAvatarUseCase) private updateUserAvatarUseCase: UpdateUserAvatarUseCase,
    @Inject(EncryptedAvatarStorageService) private encryptedAvatarStorage: EncryptedAvatarStorageService,
    @Inject(JwtService) private jwtService: JwtService,
  ) {}

  @Get()
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Start Google OAuth login' })
  async redirectToGoogle() {}

  @Get('/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiOkResponse({ description: 'User authenticated with Google successfully.', type: AuthenticateUserResponseDto })
  async callback(@Req() request: GoogleOAuthRequest) {
    const result = await this.authenticateUserWithGoogleUseCase.execute(request.user);
    const user = await this.importGoogleAvatarIfMissing(result.value.user, request.user.pictureUrl);
    const token = await this.jwtService.signAsync({ sub: user.publicId, role: user.role }, { expiresIn: '1d' });

    return {
      token,
      user: UserPresenter.toHTTP(user),
    };
  }

  private async importGoogleAvatarIfMissing(user: User, pictureUrl?: string): Promise<User> {
    if (!pictureUrl || user.avatarUpdatedAt) {
      return user;
    }

    try {
      const storedAvatar = await this.encryptedAvatarStorage.storeFromUrl(pictureUrl, 'google-avatar');
      const result = await this.updateUserAvatarUseCase.execute({
        currentUserPublicId: user.publicId,
        encryptedPath: storedAvatar.encryptedPath,
        iv: storedAvatar.iv,
        authTag: storedAvatar.authTag,
        mimeType: storedAvatar.mimeType,
        originalName: storedAvatar.originalName,
      });

      return result.isSuccess() ? result.value.user : user;
    } catch {
      return user;
    }
  }
}
