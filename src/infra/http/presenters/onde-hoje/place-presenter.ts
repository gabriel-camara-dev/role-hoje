import { formatDateOnly } from '@/core/date/date-only';
import type { PlaceAttendanceEstimate } from '@/domain/main/enterprise/entities/onde-hoje/places/place-attendance-estimate';
import type { UserVoteHistoryItem } from '@/domain/main/enterprise/entities/onde-hoje/places/place-history';
import type { Place, PlaceFields } from '@/domain/main/enterprise/entities/onde-hoje/places/place';

export class PlacePresenter {
  /** Read models: listings, vote history, attendance — these carry `distanceKm`. */
  static toHTTP(place: PlaceFields) {
    return {
      id: place.publicId,
      googlePlaceId: place.googlePlaceId,
      name: place.name,
      googlePlaceName: place.googlePlaceName,
      nickname: place.nickname,
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

  /** A just-written place: no distance, since a write has no query origin. */
  static entityToHTTP(place: Place) {
    return {
      id: place.publicId,
      googlePlaceId: place.googlePlaceId,
      name: place.name,
      googlePlaceName: place.googlePlaceName,
      nickname: place.nickname,
      formattedAddress: place.formattedAddress,
      latitude: place.latitude,
      longitude: place.longitude,
      city: place.city,
      state: place.state,
      country: place.country,
      photoUrl: place.photoUrl,
      websiteUrl: place.websiteUrl,
      mapsUrl: place.mapsUrl,
    };
  }

  static userVoteHistoryToHTTP(vote: UserVoteHistoryItem) {
    return {
      id: vote.votePublicId,
      day: formatDateOnly(vote.day),
      note: vote.note,
      voteType: vote.voteType,
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
