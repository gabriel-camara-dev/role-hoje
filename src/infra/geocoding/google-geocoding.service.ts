import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  GeocodingGateway,
  type ReverseGeocodeResult,
} from '@/domain/main/application/gateways/geocoding-gateway';
import { EnvService } from '../env/env.service';

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GoogleGeocodeResponse = {
  status: string;
  results: Array<{
    formatted_address: string;
    address_components: GoogleAddressComponent[];
  }>;
};

@Injectable()
export class GoogleGeocodingService extends GeocodingGateway {
  private readonly logger = new Logger(GoogleGeocodingService.name);

  constructor(@Inject(EnvService) private env: EnvService) {
    super();
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult | null> {
    const apiKey = this.env.get('GOOGLE_MAPS_API_KEY');

    if (!apiKey) {
      return null;
    }

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${latitude},${longitude}`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('language', 'pt-BR');
    url.searchParams.set('region', 'BR');

    try {
      const response = await fetch(url);

      if (!response.ok) {
        this.logger.warn(`Reverse geocode failed with HTTP ${response.status}`);
        return null;
      }

      const data = (await response.json()) as GoogleGeocodeResponse;
      const result = data.results?.[0];

      if (data.status !== 'OK' || !result) {
        return null;
      }

      const component = (type: string) =>
        result.address_components.find((item) => item.types.includes(type))?.long_name ?? null;

      return {
        formattedAddress: result.formatted_address ?? null,
        city: component('administrative_area_level_2') ?? component('locality'),
        state: component('administrative_area_level_1'),
        country: component('country'),
      };
    } catch (error) {
      this.logger.warn(
        `Reverse geocode error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
