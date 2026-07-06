export interface ReverseGeocodeResult {
  formattedAddress: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

export abstract class GeocodingGateway {
  abstract reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult | null>;
}
