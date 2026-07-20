export abstract class TransactionRepository {
  abstract transaction<T>(work: () => Promise<T>): Promise<T>;
}
