import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { Redis } from 'ioredis';
import { Client } from 'pg';

config({ path: '.env', override: true });
config({ path: '.env.test', override: true });

const baseDatabaseUrl = process.env.DATABASE_URL;

if (!baseDatabaseUrl) {
  throw new Error('Please provide a DATABASE_URL environment variable');
}

// 05-nest-clean isolates each test file with a unique *schema* (`?schema=<uuid>`).
// That can't work here: this datasource is multiSchema (users, places, groups, ...),
// so the connection's `schema` param controls nothing and every file would land on
// the same six schemas. A throwaway *database* per file gives the same isolation.
const databaseName = `test_${randomUUID().replaceAll('-', '')}`;

function databaseUrlFor(name: string) {
  const url = new URL(baseDatabaseUrl as string);
  url.pathname = `/${name}`;
  return url.toString();
}

const databaseUrl = databaseUrlFor(databaseName);

// Assigned at module scope, NOT inside beforeAll: Vitest evaluates the test
// file's imports before any hook runs, and `@/infra/env/env` parses and freezes
// `process.env` the moment it is imported (PrismaService reads `env.DATABASE_URL`).
// Setting this later would leave the app pointing at the real database.
process.env.DATABASE_URL = databaseUrl;

const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB ?? 0),
});

// CREATE/DROP DATABASE can't run against the database being created, so these
// go through a plain pg connection to the original (base) database.
async function withAdminClient(run: (client: Client) => Promise<void>) {
  const client = new Client({ connectionString: baseDatabaseUrl });
  await client.connect();

  try {
    await run(client);
  } finally {
    await client.end();
  }
}

beforeAll(async () => {
  await withAdminClient(async (client) => {
    await client.query(`CREATE DATABASE "${databaseName}"`);
  });

  execSync('pnpm prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'ignore',
  });

  await redis.flushdb();
});

afterAll(async () => {
  await redis.quit();

  await withAdminClient(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  });
});
