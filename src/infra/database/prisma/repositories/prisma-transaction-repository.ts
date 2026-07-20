import { Inject, Injectable } from '@nestjs/common';
import { TransactionRepository } from '@/domain/main/application/repositories/transaction-repository';
import { DatabaseContext } from '../database-context';

@Injectable()
export class PrismaTransactionRepository extends TransactionRepository {
  constructor(@Inject(DatabaseContext) private readonly dbContext: DatabaseContext) {
    super();
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    return this.dbContext.runInTransaction(work);
  }
}
