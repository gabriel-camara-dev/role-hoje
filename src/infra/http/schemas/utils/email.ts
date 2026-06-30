import { z } from 'zod';

export const emailSchema = z.email().trim().toLowerCase();
