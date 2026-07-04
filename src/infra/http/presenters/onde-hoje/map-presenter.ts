import type { PlaceHistoryDay } from '@/domain/main/enterprise/entities/onde-hoje/places/place-history';
import type { TodayMapPlace } from '@/domain/main/enterprise/entities/onde-hoje/places/today-map-place';
import { PlacePresenter } from './place-presenter';

export class MapPresenter {
  static todayPlaceToHTTP(place: TodayMapPlace) {
    return {
      ...PlacePresenter.toHTTP(place),
      voteCount: place.voteCount,
      dominantVoteType: place.dominantVoteType,
      voters: place.voters,
    };
  }

  static historyDayToHTTP(historyDay: PlaceHistoryDay) {
    return {
      day: historyDay.day,
      places: historyDay.places.map((place) => MapPresenter.todayPlaceToHTTP(place)),
    };
  }
}
