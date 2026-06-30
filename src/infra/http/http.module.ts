import { Module } from '@nestjs/common';
import { UsersModule } from './controllers/users/users.module';

@Module({
  imports: [UsersModule],
})
export class HttpModule {}
