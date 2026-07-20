import type { PlaceFields } from './place';

export interface PlaceAttendanceEstimate {
  place: PlaceFields;
  scheduledAt: Date;
  radiusKm: number;
  analysisBasis: 'ACTIVE_VOTES_ON_SCHEDULED_DAY_WITHIN_RADIUS';
  attendeeCount: number;
  nearbyPlacesCount: number;
  attendees: Array<{
    publicId: string;
    name: string;
    note: string | null;
    place: Pick<PlaceFields, 'publicId' | 'name' | 'distanceKm'>;
  }>;
}
