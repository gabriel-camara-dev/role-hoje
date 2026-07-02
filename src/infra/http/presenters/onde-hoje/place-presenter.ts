import type { PlaceAttendanceEstimate } from '@/domain/main/enterprise/entities/onde-hoje/places/place-attendance-estimate';
import type { UserVoteHistoryItem } from '@/domain/main/enterprise/entities/onde-hoje/places/place-history';
import type { Place } from '@/domain/main/enterprise/entities/onde-hoje/places/place';

export class PlacePresenter {
  static toHTTP(place: Place) {
    return {
      id: place.publicId,
      googlePlaceId: place.googlePlaceId,
      name: place.name,
      formattedAddress: place.formattedAddress,
      latitude: place.latitude,
      longitude: place.longitude,
      city: place.city,
      state: place.state,
      country: place.country,
      photoUrl: place.photoUrl,
      websiteUrl: place.websiteUrl,
      mapsUrl: place.mapsUrl,
      distanceKm: place.distanceKm,
    };
  }

  static userVoteHistoryToHTTP(vote: UserVoteHistoryItem) {
    return {
      id: vote.votePublicId,
      day: formatDateOnly(vote.day),
      note: vote.note,
      scopeKey: vote.scopeKey,
      group: vote.group,
      place: PlacePresenter.toHTTP(vote.place),
    };
  }

  static attendanceEstimateToHTTP(estimate: PlaceAttendanceEstimate) {
    return {
      place: PlacePresenter.toHTTP(estimate.place),
      scheduledAt: estimate.scheduledAt,
      radiusKm: estimate.radiusKm,
      analysisBasis: estimate.analysisBasis,
      attendeeCount: estimate.attendeeCount,
      nearbyPlacesCount: estimate.nearbyPlacesCount,
      attendees: estimate.attendees,
    };
  }
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
