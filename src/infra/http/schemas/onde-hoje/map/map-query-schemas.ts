import { z } from 'zod';

export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const todayMapQuerySchema = z.object({
  city: z.string().min(1).optional(),
  groupPublicId: z.string().uuid().optional(),
  day: dateOnlySchema.optional(),
});

export const topPlacesQuerySchema = z.object({
  city: z.string().min(1).optional(),
  groupPublicId: z.string().uuid().optional(),
  day: dateOnlySchema.optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export const historyQuerySchema = z
  .object({
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    city: z.string().min(1).optional(),
    groupPublicId: z.string().uuid().optional(),
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
export type HistoryQuery = z.infer<typeof historyQuerySchema>;

export function parseDateOnly(value?: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export function todayDate() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);

  return copy;
}

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
}
