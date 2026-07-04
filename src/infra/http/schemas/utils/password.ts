import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
