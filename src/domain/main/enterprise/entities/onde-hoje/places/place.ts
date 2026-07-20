import { Entity } from '@/core/entities/entity';
import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { Optional } from '@/core/types/optional';

/**
 * A place as read models carry it: plain data, keyed by publicId. Listings and
 * map projections build on this instead of on the {@link Place} entity, so a
 * query can attach derived fields (like {@link distanceKm}) without pretending
 * to be the aggregate.
 */
export interface PlaceFields {
  publicId: string;
  googlePlaceId: string;
  name: string;
  googlePlaceName: string | null;
  nickname: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
  country: string | null;
  photoUrl: string | null;
  websiteUrl: string | null;
  mapsUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Relative to the query's origin, so it only exists on a located search. */
  distanceKm?: number;
}

export interface PlaceProps {
  googlePlaceId: string;
  name: string;
  googlePlaceName: string | null;
  nickname: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
  country: string | null;
  photoUrl: string | null;
  websiteUrl: string | null;
  mapsUrl: string | null;
  /** Null once the creator deletes their account: the row survives (onDelete: SetNull). */
  createdById: UniqueEntityID | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Place extends Entity<PlaceProps> {
  get publicId() {
    return this.id.toString();
  }

  get googlePlaceId() {
    return this.props.googlePlaceId;
  }

  get name() {
    return this.props.name;
  }

  get googlePlaceName() {
    return this.props.googlePlaceName;
  }

  get nickname() {
    return this.props.nickname;
  }

  get formattedAddress() {
    return this.props.formattedAddress;
  }

  get latitude() {
    return this.props.latitude;
  }

  get longitude() {
    return this.props.longitude;
  }

  get city() {
    return this.props.city;
  }

  get state() {
    return this.props.state;
  }

  get country() {
    return this.props.country;
  }

  get photoUrl() {
    return this.props.photoUrl;
  }

  get websiteUrl() {
    return this.props.websiteUrl;
  }

  get mapsUrl() {
    return this.props.mapsUrl;
  }

  get createdById() {
    return this.props.createdById;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  /** A map-click place carries no Google identity of its own. */
  get isMapClick() {
    return this.props.googlePlaceId.startsWith('map-click:');
  }

  /** Fills in the location a client-side geocode could not resolve. */
  locateAt(data: { city?: string | null; state?: string | null; country?: string | null; formattedAddress?: string }) {
    this.props.city = data.city ?? this.props.city;
    this.props.state = data.state ?? this.props.state;
    this.props.country = data.country ?? this.props.country;

    if (data.formattedAddress) {
      this.props.formattedAddress = data.formattedAddress;
    }
  }

  static create(props: Optional<PlaceProps, 'createdAt' | 'updatedAt'>, id?: UniqueEntityID) {
    const now = new Date();
    const nickname = cleanOptionalText(props.nickname);
    const googlePlaceName = cleanOptionalText(props.googlePlaceName);

    return new Place(
      {
        ...props,
        nickname,
        // A place falls back to its Google name, and to whatever the client sent.
        googlePlaceName: googlePlaceName ?? props.name,
        // What people see: their own nickname wins over Google's name.
        name: nickname ?? googlePlaceName ?? props.name,
        createdAt: props.createdAt ?? now,
        updatedAt: props.updatedAt ?? now,
      },
      id,
    );
  }
}

function cleanOptionalText(value?: string | null) {
  const trimmed = value?.trim();

  return trimmed || null;
}
