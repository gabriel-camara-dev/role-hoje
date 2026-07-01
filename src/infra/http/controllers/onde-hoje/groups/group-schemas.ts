import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(280).optional(),
  privacy: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
});

export type CreateGroupBody = z.infer<typeof createGroupSchema>;
