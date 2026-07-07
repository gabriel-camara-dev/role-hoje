import { z } from 'zod';

export const createPlaceSchema = z.object({
  googlePlaceId: z.string().min(1),
  name: z.string().min(2),
  googlePlaceName: z.string().trim().min(2).optional(),
  nickname: z.string().trim().min(2).max(80).optional(),
  formattedAddress: z.string().min(3),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  photoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  mapsUrl: z.string().url().optional(),
});

export const listPlacesQuerySchema = z
  .object({
    q: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(100).optional(),
  })
  .refine((query) => query.radiusKm === undefined || (query.latitude !== undefined && query.longitude !== undefined), {
    message: 'latitude and longitude are required when radiusKm is provided',
    path: ['radiusKm'],
  });

export const attendanceEstimateQuerySchema = z.object({
  scheduledAt: z.coerce.date(),
  radiusKm: z.coerce.number().positive().max(100).default(1),
  groupPublicId: z.string().uuid().optional(),
});

export type CreatePlaceBody = z.infer<typeof createPlaceSchema>;
export type ListPlacesQuery = z.infer<typeof listPlacesQuerySchema>;
export type AttendanceEstimateQuery = z.infer<typeof attendanceEstimateQuerySchema>;
