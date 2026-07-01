import { Module } from '@nestjs/common';
import { GetUserProfileUseCase } from '@/domain/main/application/use-cases/users/get-user-profile';
import { UpdateUserAvatarUseCase } from '@/domain/main/application/use-cases/users/update-user-avatar';
import { DatabaseModule } from '@/infra/database/database.module';
import { EncryptedAvatarStorageService } from '@/infra/storage/encrypted-avatar-storage.service';
import { GetUserAvatarController } from './get-user-avatar.controller';
import { UploadUserAvatarController } from './upload-user-avatar.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [UploadUserAvatarController, GetUserAvatarController],
  providers: [GetUserProfileUseCase, UpdateUserAvatarUseCase, EncryptedAvatarStorageService],
})
export class UserAvatarModule {}
