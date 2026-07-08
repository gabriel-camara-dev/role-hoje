import { z } from 'zod';
import { votingWindowDateSchema } from '@/infra/http/schemas/onde-hoje/map/map-query-schemas';

export const voteTypeSchema = z.enum(['GENERAL', 'MUSIC', 'FOOD', 'DRINK', 'SPORTS']).default('GENERAL');

const voteTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM format')
  .optional();

export const voteSchema = z.object({
  day: votingWindowDateSchema,
  groupPublicId: z.string().uuid().optional(),
  note: z.string().max(240).optional(),
  voteType: voteTypeSchema,
  showIdentity: z.boolean().optional().default(true),
  going: z.boolean().optional().default(true),
  voteTime: voteTimeSchema,
});

export const legacyTodayVoteSchema = z.object({
  day: z.undefined().optional(),
  groupPublicId: z.string().uuid().optional(),
  note: z.string().max(240).optional(),
  voteType: voteTypeSchema,
  showIdentity: z.boolean().optional().default(true),
  going: z.boolean().optional().default(true),
  voteTime: voteTimeSchema,
});

export const myVotesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type VoteBody = z.infer<typeof voteSchema>;
export type LegacyTodayVoteBody = z.infer<typeof legacyTodayVoteSchema>;
export type MyVotesQuery = z.infer<typeof myVotesQuerySchema>;
