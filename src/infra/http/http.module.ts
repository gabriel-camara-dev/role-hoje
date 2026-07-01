import { Module } from '@nestjs/common';
import { OndeHojeModule } from './controllers/onde-hoje/onde-hoje.module';
import { RealtimeModule } from './controllers/realtime/realtime.module';
import { UsersModule } from './controllers/users/users.module';

@Module({
  imports: [UsersModule, OndeHojeModule, RealtimeModule],
})
export class HttpModule {}
