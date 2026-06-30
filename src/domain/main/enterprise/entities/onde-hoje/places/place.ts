export interface Place {
  id: number;
  publicId: string;
  googlePlaceId: string;
  name: string;
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
}

export interface CreatePlaceData {
  googlePlaceId: string;
  name: string;
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

