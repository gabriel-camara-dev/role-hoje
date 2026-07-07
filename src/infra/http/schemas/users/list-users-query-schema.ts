import { z } from 'zod';
import { limitSchema } from '../utils/limit';
import { pageSchema } from '../utils/page';

export const listUsersQuerySchema = z
  .object({
    page: pageSchema.default(1),
    limit: limitSchema.optional(),
    pageSize: limitSchema.optional(),
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().min(1).optional(),
    username: z.string().trim().min(1).optional(),
  })
  .transform(({ page, limit, pageSize, ...filters }) => ({
    ...filters,
    page,
    limit: limit ?? pageSize ?? 10,
  }));

export type ListUsersQuerySchemaType = z.infer<typeof listUsersQuerySchema>;
