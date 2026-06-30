import { Module } from '@nestjs/common';
import { OndeHojeModule } from './controllers/onde-hoje/onde-hoje.module';
import { UsersModule } from './controllers/users/users.module';

@Module({
  imports: [UsersModule, OndeHojeModule],
})
export class HttpModule {}
