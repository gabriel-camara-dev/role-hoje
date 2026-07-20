import { z } from 'zod';
import {
  addDaysToDateOnly,
  addMonthsToDateOnly,
  parseDateOnly as parseDateOnlyUtc,
  todayDateOnly,
} from '@/core/date/date-only';

export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const votingWindowDateSchema = dateOnlySchema.refine(
  (value) => {
    const day = parseDateOnly(value);

    return Boolean(day && day >= todayDate() && day <= maxVotingDate());
  },
  {
    message: 'Date must be today or up to one month in the future',
  },
);

export const todayMapQuerySchema = z.object({
  city: z.string().min(1).optional(),
  groupPublicId: z.string().uuid().optional(),
  day: votingWindowDateSchema.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  myGroups: z.string().optional(),
});

export const topPlacesQuerySchema = z.object({
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  groupPublicId: z.string().uuid().optional(),
  day: votingWindowDateSchema.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  myGroups: z.string().optional(),
});

export const globalTopPlacesQuerySchema = z.object({
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const historyQuerySchema = z
  .object({
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    city: z.string().min(1).optional(),
    groupPublicId: z.string().uuid().optional(),
    memberVotes: z.string().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(100).optional(),
  })
  .refine((query) => query.radiusKm === undefined || (query.latitude !== undefined && query.longitude !== undefined), {
    message: 'latitude and longitude are required when radiusKm is provided',
    path: ['radiusKm'],
  })
  .refine(
    (query) => {
      const from = parseDateOnly(query.from) ?? addDays(todayDate(), -6);
      const to = parseDateOnly(query.to) ?? todayDate();

      return from <= to && daysBetween(from, to) <= 31;
    },
    {
      message: 'Date range must be ordered and have at most 31 days',
      path: ['to'],
    },
  );

export type TodayMapQuery = z.infer<typeof todayMapQuerySchema>;
export type TopPlacesQuery = z.infer<typeof topPlacesQuerySchema>;
export type GlobalTopPlacesQuery = z.infer<typeof globalTopPlacesQuerySchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;

export function parseDateOnly(value?: string) {
  return parseDateOnlyUtc(value);
}

export function todayDate() {
  return todayDateOnly();
}

export function addDays(date: Date, days: number) {
  return addDaysToDateOnly(date, days);
}

export function maxVotingDate() {
  return addMonthsToDateOnly(todayDate(), 1);
}

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
}
