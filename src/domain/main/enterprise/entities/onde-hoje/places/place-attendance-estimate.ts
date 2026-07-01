import type { Place } from './place';

export interface PlaceAttendanceEstimate {
  place: Place;
  scheduledAt: Date;
  radiusKm: number;
  analysisBasis: 'ACTIVE_VOTES_ON_SCHEDULED_DAY_WITHIN_RADIUS';
  attendeeCount: number;
  nearbyPlacesCount: number;
  attendees: Array<{
    publicId: string;
    name: string;
    username: string;
    note: string | null;
    place: Pick<Place, 'publicId' | 'name' | 'distanceKm'>;
  }>;
}
