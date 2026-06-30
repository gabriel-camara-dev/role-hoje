import { z } from 'zod';
import { cpfSchema } from '../utils/cpf';
import { emailSchema } from '../utils/email';
import { passwordSchema } from '../utils/password';

export const registerSchema = z.object({
  name: z.string().trim().min(4).max(255),
  username: z.string().trim().min(3).max(60),
  email: emailSchema,
  cpf: cpfSchema,
  password: passwordSchema,
});

export type RegisterSchemaType = z.infer<typeof registerSchema>;
