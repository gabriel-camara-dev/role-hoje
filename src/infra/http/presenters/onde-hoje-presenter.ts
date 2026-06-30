import type { Group } from '@/domain/main/enterprise/entities/onde-hoje/groups/group';
import type { Place } from '@/domain/main/enterprise/entities/onde-hoje/places/place';
import type { TodayMapPlace } from '@/domain/main/enterprise/entities/onde-hoje/places/today-map-place';

export class OndeHojePresenter {
  static placeToHTTP(place: Place) {
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
    };
  }

  static todayMapPlaceToHTTP(place: TodayMapPlace) {
    return {
      ...OndeHojePresenter.placeToHTTP(place),
      voteCount: place.voteCount,
      voters: place.voters,
    };
  }

  static groupToHTTP(group: Group) {
    return {
      id: group.publicId,
      name: group.name,
      slug: group.slug,
      description: group.description,
      privacy: group.privacy,
      city: group.city,
      state: group.state,
      membersCount: group.membersCount,
      todayVotesCount: group.todayVotesCount,
    };
  }
}
