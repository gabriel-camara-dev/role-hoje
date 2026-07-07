export interface Place {
  id: number;
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
  distanceKm?: number;
}

export interface CreatePlaceData {
  googlePlaceId: string;
  name: string;
  googlePlaceName?: string;
  nickname?: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  photoUrl?: string;
  websiteUrl?: string;
  mapsUrl?: string;
  createdById: number;
}
