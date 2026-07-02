import { z } from 'zod';
import { emailSchema } from '../utils/email';

export const authenticateSchema = z.object({
  login: emailSchema,
  password: z.string().min(6),
});

export type AuthenticateSchemaType = z.infer<typeof authenticateSchema>;
