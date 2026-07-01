import {
  type CanActivate,
  Controller,
  Get,
  Inject,
  Injectable,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthenticateUserWithGoogleUseCase } from '@/domain/main/application/use-cases/users/authenticate-user-with-google';
import { UpdateUserAvatarUseCase } from '@/domain/main/application/use-cases/users/update-user-avatar';
import type { User } from '@/domain/main/enterprise/entities/user';
import type { GoogleOAuthUser } from '@/infra/auth/google-strategy';
import { Public } from '@/infra/auth/public';
import { EnvService } from '@/infra/env/env.service';
import { AuthenticateUserResponseDto } from '@/infra/http/swagger/presenter-schemas/user-presenter-schema';
import { EncryptedAvatarStorageService } from '@/infra/storage/encrypted-avatar-storage.service';
import { UserPresenter } from '../../presenters/user-presenter';

type GoogleOAuthRequest = Request & {
  user: GoogleOAuthUser;
};

@Injectable()
export class GoogleOAuthConfiguredGuard implements CanActivate {
  constructor(@Inject(EnvService) private env: EnvService) {}

  canActivate() {
    if (!this.env.get('GOOGLE_CLIENT_ID') || !this.env.get('GOOGLE_CLIENT_SECRET')) {
      throw new ServiceUnavailableException('Google OAuth is not configured');
    }

    return true;
  }
}

@ApiTags('Auth')
@Controller('/sessions/google')
export class GoogleOAuthController {
  constructor(
    @Inject(AuthenticateUserWithGoogleUseCase)
    private authenticateUserWithGoogleUseCase: AuthenticateUserWithGoogleUseCase,
    @Inject(UpdateUserAvatarUseCase) private updateUserAvatarUseCase: UpdateUserAvatarUseCase,
    @Inject(EncryptedAvatarStorageService) private encryptedAvatarStorage: EncryptedAvatarStorageService,
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(EnvService) private env: EnvService,
  ) {}

  @Get()
  @Public()
  @UseGuards(GoogleOAuthConfiguredGuard, AuthGuard('google'))
  @ApiOperation({ summary: 'Start Google OAuth login' })
  async redirectToGoogle() {}

  @Get('/callback')
  @Public()
  @UseGuards(GoogleOAuthConfiguredGuard, AuthGuard('google'))
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiOkResponse({ description: 'User authenticated with Google successfully.', type: AuthenticateUserResponseDto })
  async callback(@Req() request: GoogleOAuthRequest, @Res() response: Response) {
    const result = await this.authenticateUserWithGoogleUseCase.execute(request.user);
    const user = await this.importGoogleAvatarIfMissing(result.value.user, request.user.pictureUrl);
    const token = await this.jwtService.signAsync({ sub: user.publicId, role: user.role }, { expiresIn: '1d' });
    const frontendCallbackUrl = new URL('/auth/google/callback', this.env.get('FRONTEND_URL'));
    const encodedUser = Buffer.from(JSON.stringify(UserPresenter.toHTTP(user))).toString('base64url');

    frontendCallbackUrl.hash = new URLSearchParams({
      token,
      user: encodedUser,
    }).toString();

    return response.redirect(frontendCallbackUrl.toString());
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
