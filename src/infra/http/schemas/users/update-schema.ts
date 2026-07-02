import { z } from 'zod';
import { emailSchema } from '../utils/email';
import { passwordSchema } from '../utils/password';

export const updateSchema = z
  .object({
    name: z.string().trim().min(4).max(255).optional(),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9_]+$/, 'Username can contain only lowercase letters, numbers and underscores')
      .optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateSchemaType = z.infer<typeof updateSchema>;
