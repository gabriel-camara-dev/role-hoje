import { resolve } from 'node:path';
import swc from 'unplugin-swc';

const src = (p = '') => resolve(import.meta.dirname, 'src', p);

// Mirrors the tsconfig `paths` (baseUrl "."). Ordered specific -> general.
// Shared by vitest.config.ts (unit) and vitest.config.e2e.ts (e2e).
export const alias = [
  { find: /^@env\//, replacement: `${src('infra/env')}/` },
  { find: /^@schemas\//, replacement: `${src('infra/http/schemas')}/` },
  { find: /^@controllers\//, replacement: `${src('infra/http/controllers')}/` },
  { find: /^@middlewares\//, replacement: `${src('infra/http/middlewares')}/` },
  { find: /^@http\//, replacement: `${src('infra/http')}/` },
  { find: /^@constants\//, replacement: `${src('core/constants')}/` },
  { find: /^@main\/use-cases\//, replacement: `${src('domain/main/application/use-cases')}/` },
  { find: /^@repositories\/prisma\//, replacement: `${src('infra/database/prisma/repositories')}/` },
  { find: /^@repositories\//, replacement: `${src('domain/main/application/repositories')}/` },
  { find: /^@lib\/prisma\//, replacement: `${src('infra/database/prisma')}/` },
  { find: /^@lib\/logger\//, replacement: `${src('infra/logger')}/` },
  { find: /^@prisma-types\//, replacement: `${src('@types/prisma')}/` },
  { find: /^@tps\//, replacement: `${src('@types')}/` },
  { find: /^@templates\//, replacement: `${src('infra/messaging/templates')}/` },
  { find: /^@utils\//, replacement: `${src('infra/messaging')}/` },
  { find: /^@services\//, replacement: `${src('services')}/` },
  { find: /^@test\//, replacement: `${resolve(import.meta.dirname, 'test')}/` },
  { find: /^@\//, replacement: `${src()}/` },
];

// SWC keeps NestJS decorator metadata working under Vitest.
export const swcPlugin = swc.vite({
  module: { type: 'es6' },
  jsc: {
    target: 'es2021',
    parser: { syntax: 'typescript', decorators: true },
    transform: { legacyDecorator: true, decoratorMetadata: true },
  },
});
