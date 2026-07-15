import { TransactionRepository } from '@/domain/main/application/repositories/transaction-repository';

/**
 * Unit tests hold state in arrays, so there is nothing to roll back — the work
 * just runs. Keeps use cases that depend on TransactionRepository testable
 * without a database.
 */
export class InMemoryTransactionRepository extends TransactionRepository {
  async transaction<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}
