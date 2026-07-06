import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { DeleteExpiredUnverifiedUsersUseCase } from '@/domain/main/application/use-cases/users/delete-expired-unverified-users';

const intervalInMs = 60_000;

@Injectable()
export class ExpiredUnverifiedUsersCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpiredUnverifiedUsersCleanupService.name);
  private interval?: NodeJS.Timeout;

  constructor(
    @Inject(DeleteExpiredUnverifiedUsersUseCase)
    private deleteExpiredUnverifiedUsersUseCase: DeleteExpiredUnverifiedUsersUseCase,
  ) {}

  onModuleInit() {
    void this.runCleanup();
    this.interval = setInterval(() => this.runCleanup(), intervalInMs);
    this.interval.unref();
  }

  onModuleDestroy() {
    clearInterval(this.interval);
  }

  private async runCleanup() {
    try {
      const { deletedCount } = await this.deleteExpiredUnverifiedUsersUseCase.execute();

      if (deletedCount > 0) {
        this.logger.log(`Removed ${deletedCount} unverified account(s) with an expired confirmation link.`);
      }
    } catch (error) {
      this.logger.error('Failed to clean up expired unverified users', error instanceof Error ? error.stack : error);
    }
  }
}
