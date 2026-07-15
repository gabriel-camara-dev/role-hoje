import { defineConfig } from 'vitest/config';
import { alias, swcPlugin } from './vitest.shared';

// Unit tests: everything named `*.spec.ts`, co-located next to the code under
// test. `*.e2e-spec.ts` does NOT match the default `*.spec.ts` include (hyphen,
// not dot), so the e2e suite stays out of here — see vitest.config.e2e.ts.
export default defineConfig({
  resolve: { alias },
  test: {
    globals: true,
    root: './',
    environment: 'node',
  },
  plugins: [swcPlugin],
});
