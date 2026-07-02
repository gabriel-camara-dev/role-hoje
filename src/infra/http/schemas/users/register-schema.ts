import { z } from 'zod';
import { emailSchema } from '../utils/email';
import { passwordSchema } from '../utils/password';

export const registerSchema = z.object({
  name: z.string().trim().min(4).max(255),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Username can contain only lowercase letters, numbers and underscores'),
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterSchemaType = z.infer<typeof registerSchema>;
