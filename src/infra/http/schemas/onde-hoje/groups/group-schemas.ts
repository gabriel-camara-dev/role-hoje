import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(280).optional(),
  privacy: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  password: z.string().min(4).max(80).optional(),
});

export const joinGroupSchema = z.object({
  name: z.string().min(2).max(80),
  password: z.string().max(80).optional(),
});

export const joinGroupByIdSchema = z
  .object({
    password: z.string().max(80).optional(),
  })
  .default({});

export type CreateGroupBody = z.infer<typeof createGroupSchema>;
export type JoinGroupByIdBody = z.infer<typeof joinGroupByIdSchema>;
export type JoinGroupBody = z.infer<typeof joinGroupSchema>;
