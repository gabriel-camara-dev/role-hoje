import { z } from 'zod';

export const authenticateSchema = z.object({
  login: z.string().trim().toLowerCase().min(3),
  password: z.string().min(6),
});

export type AuthenticateSchemaType = z.infer<typeof authenticateSchema>;
