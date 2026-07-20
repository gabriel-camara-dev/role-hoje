import { Injectable, Logger } from '@nestjs/common';
import { GeocodingGateway, type ReverseGeocodeResult } from '@/domain/main/application/gateways/geocoding-gateway';

type NominatimAddress = {
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  municipality?: string;
  village?: string;
  state?: string;
  country?: string;
};

type NominatimResponse = {
  error?: string;
  display_name?: string;
  address?: NominatimAddress;
};

// OpenStreetMap Nominatim reverse geocoding: free and keyless. Usage policy
// asks for an identifying User-Agent and rate-limits to ~1 request/second, so
// it is only used as a fallback when the client could not resolve an address.
// https://operations.osmfoundation.org/policies/nominatim/
@Injectable()
export class NominatimGeocodingService extends GeocodingGateway {
  private readonly logger = new Logger(NominatimGeocodingService.name);
  private readonly endpoint = 'https://nominatim.openstreetmap.org/reverse';

  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult | null> {
    const url = new URL(this.endpoint);
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('zoom', '18');

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'onde-hoje-backend/1.0 (reverse geocoding for map votes)',
          'Accept-Language': 'pt-BR',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn(`Reverse geocode failed with HTTP ${response.status}`);
        return null;
      }

      const data = (await response.json()) as NominatimResponse;

      if (data.error || !data.address) {
        return null;
      }

      const address = data.address;

      return {
        formattedAddress: data.display_name ?? null,
        city: address.city ?? address.town ?? address.municipality ?? address.village ?? null,
        state: address.state ?? null,
        country: address.country ?? null,
      };
    } catch (error) {
      this.logger.warn(`Reverse geocode error: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}
