import { defineConfig } from 'vitest/config';
import { alias, swcPlugin } from './vitest.shared';

export default defineConfig({
  resolve: { alias },
  test: {
    include: ['**/*.e2e-spec.ts'],
    globals: true,
    root: './',
    environment: 'node',
    setupFiles: ['./test/setup-e2e.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    // Each file gets its own throwaway database (see test/setup-e2e.ts), but
    // Redis is shared and flushed per file — so files still run one at a time.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
  },
  plugins: [swcPlugin],
});
