import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z
  .object({
    // Environment
    NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['info', 'debug', 'warn', 'error', 'trace']).default('info'),

    // Database
    DATABASE_URL: z.url(),

    // App
    APP_NAME: z.string().default('Backend Template Reborn'),
    APP_PORT: z.coerce.number().default(3000),
    JWT_SECRET: z.string().min(60, 'JWT secret must be at least 60 characters long').optional(),
    JWT_PRIVATE_KEY: z.string().optional(),
    JWT_PUBLIC_KEY: z.string().optional(),
    FRONTEND_URL: z.url().default('http://localhost:5173'),
    HASH_SALT_ROUNDS: z.coerce.number().default(12),

    SENTRY_DSN: z.string().optional(),

    // Redis
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string(),
    REDIS_DB: z.coerce.number().default(0),

    // Resend
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.email(),
  })
  .refine((env) => env.JWT_SECRET || (env.JWT_PRIVATE_KEY && env.JWT_PUBLIC_KEY), {
    message: 'Provide JWT_SECRET or both JWT_PRIVATE_KEY and JWT_PUBLIC_KEY',
    path: ['JWT_SECRET'],
  });

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  const validationDetails = z.treeifyError(_env.error);
  throw new Error(
    `Invalid environment variables. Please check your .env file or environment configuration. Details: ${JSON.stringify(validationDetails)}`,
  );
}

export const env = _env.data;
