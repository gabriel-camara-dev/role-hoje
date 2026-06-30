import { z } from 'zod';

export const limitSchema = z.coerce.number().int().positive().max(100);
