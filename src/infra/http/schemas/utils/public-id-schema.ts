import { z } from 'zod';

export const publicIdSchema = z.object({
  publicId: z.uuid(),
});

export type PublicIdSchemaType = z.infer<typeof publicIdSchema>;
