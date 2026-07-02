import { z } from 'zod';
import { emailSchema } from '../utils/email';
import { passwordSchema } from '../utils/password';

export const registerSchema = z.object({
  name: z.string().trim().min(4).max(255),
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterSchemaType = z.infer<typeof registerSchema>;
