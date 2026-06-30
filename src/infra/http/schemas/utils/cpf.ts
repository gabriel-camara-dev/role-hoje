import { z } from 'zod';

export const cpfSchema = z.string().trim().min(11).max(14);
