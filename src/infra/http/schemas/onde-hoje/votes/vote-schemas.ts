import { z } from 'zod';
import { votingWindowDateSchema } from '@/infra/http/schemas/onde-hoje/map/map-query-schemas';

export const voteTypeSchema = z.enum(['GENERAL', 'MUSIC', 'FOOD', 'DRINK', 'SPORTS']).default('GENERAL');

export const voteSchema = z.object({
  day: votingWindowDateSchema,
  groupPublicId: z.string().uuid().optional(),
  note: z.string().max(240).optional(),
  voteType: voteTypeSchema,
});

export const legacyTodayVoteSchema = z.object({
  day: z.undefined().optional(),
  groupPublicId: z.string().uuid().optional(),
  note: z.string().max(240).optional(),
  voteType: voteTypeSchema,
});

export const myVotesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type VoteBody = z.infer<typeof voteSchema>;
export type LegacyTodayVoteBody = z.infer<typeof legacyTodayVoteSchema>;
export type MyVotesQuery = z.infer<typeof myVotesQuerySchema>;
