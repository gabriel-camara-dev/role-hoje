import { z } from 'zod';
import { dateOnlySchema } from '../map/map-query-schemas';

export const voteSchema = z.object({
  day: dateOnlySchema.optional(),
  groupPublicId: z.string().uuid().optional(),
  note: z.string().max(240).optional(),
});

export const legacyTodayVoteSchema = voteSchema.extend({
  day: z.undefined().optional(),
});

export const myVotesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type VoteBody = z.infer<typeof voteSchema>;
export type LegacyTodayVoteBody = z.infer<typeof legacyTodayVoteSchema>;
export type MyVotesQuery = z.infer<typeof myVotesQuerySchema>;
