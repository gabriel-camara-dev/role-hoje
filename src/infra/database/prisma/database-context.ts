import { AsyncLocalStorage } from 'node:async_hooks';
import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@/@types/prisma/client';
import { PrismaService } from './prisma.service';

interface DatabaseContextStore {
  prismaTransaction: Prisma.TransactionClient;
}

const asyncLocalStorage = new AsyncLocalStorage<DatabaseContextStore>();

/**
 * Gives repositories the Prisma client they should be talking to: the ambient
 * transaction client when one is open, otherwise the plain connection.
 *
 * Repositories read `dbContext.client` instead of the PrismaService directly, so
 * joining a transaction requires no change to any repository method signature.
 */
@Injectable()
export class DatabaseContext {
  // The @Inject() decorator is what keeps PrismaService imported as a value:
  // without it `useImportType` rewrites the import and Nest loses the token.
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  get client(): PrismaService | Prisma.TransactionClient {
    return asyncLocalStorage.getStore()?.prismaTransaction ?? this.prisma;
  }

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    // Already inside a transaction: reuse it instead of opening a nested one
    // (Postgres has no real nested transactions, and Prisma would deadlock on
    // the connection pool).
    if (asyncLocalStorage.getStore()) {
      return work();
    }

    return this.prisma.$transaction((tx) => asyncLocalStorage.run({ prismaTransaction: tx }, work));
  }
}
