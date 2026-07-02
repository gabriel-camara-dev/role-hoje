import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlaceResponseDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  id!: string;

  @ApiProperty({ type: String, example: 'ChIJN1t_tDeuEmsRUsoyG83frY4' })
  googlePlaceId!: string;

  @ApiProperty({ type: String, example: 'Bar do Centro' })
  name!: string;

  @ApiProperty({ type: String, example: 'Rua das Flores, 123 - Centro' })
  formattedAddress!: string;

  @ApiProperty({ type: Number, example: -23.55052 })
  latitude!: number;

  @ApiProperty({ type: Number, example: -46.633308 })
  longitude!: number;

  @ApiPropertyOptional({ type: String, example: 'Sao Paulo' })
  city?: string | null;

  @ApiPropertyOptional({ type: String, example: 'SP' })
  state?: string | null;

  @ApiPropertyOptional({ type: String, example: 'BR' })
  country?: string | null;

  @ApiPropertyOptional({ type: String, example: 'https://example.com/photo.jpg' })
  photoUrl?: string | null;

  @ApiPropertyOptional({ type: String, example: 'https://example.com' })
  websiteUrl?: string | null;

  @ApiPropertyOptional({ type: String, example: 'https://maps.google.com/?cid=123' })
  mapsUrl?: string | null;

  @ApiPropertyOptional({ type: Number, example: 1.42 })
  distanceKm?: number;
}

export class CreatePlaceBodyDto {
  @ApiProperty({ type: String, example: 'ChIJN1t_tDeuEmsRUsoyG83frY4' })
  googlePlaceId!: string;

  @ApiProperty({ type: String, example: 'Bar do Centro' })
  name!: string;

  @ApiProperty({ type: String, example: 'Rua das Flores, 123 - Centro' })
  formattedAddress!: string;

  @ApiProperty({ type: Number, example: -23.55052 })
  latitude!: number;

  @ApiProperty({ type: Number, example: -46.633308 })
  longitude!: number;

  @ApiPropertyOptional({ type: String, example: 'Sao Paulo' })
  city?: string;

  @ApiPropertyOptional({ type: String, example: 'SP' })
  state?: string;

  @ApiPropertyOptional({ type: String, example: 'BR' })
  country?: string;

  @ApiPropertyOptional({ type: String, example: 'https://example.com/photo.jpg' })
  photoUrl?: string;

  @ApiPropertyOptional({ type: String, example: 'https://example.com' })
  websiteUrl?: string;

  @ApiPropertyOptional({ type: String, example: 'https://maps.google.com/?cid=123' })
  mapsUrl?: string;
}

export class AttendancePlaceSummaryDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  publicId!: string;

  @ApiProperty({ type: String, example: 'Bar do Centro' })
  name!: string;

  @ApiPropertyOptional({ type: Number, example: 0.36 })
  distanceKm?: number;
}

export class AttendanceAttendeeDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  publicId!: string;

  @ApiProperty({ type: String, example: 'Gabriel Silva' })
  name!: string;

  @ApiPropertyOptional({ type: String, example: 'Chego depois das 20h' })
  note?: string | null;

  @ApiProperty({ type: AttendancePlaceSummaryDto })
  place!: AttendancePlaceSummaryDto;
}

export class PlaceAttendanceEstimateResponseDto {
  @ApiProperty({ type: PlaceResponseDto })
  place!: PlaceResponseDto;

  @ApiProperty({ type: Date, example: '2026-06-30T22:00:00.000Z' })
  scheduledAt!: Date;

  @ApiProperty({ type: Number, example: 1 })
  radiusKm!: number;

  @ApiProperty({ enum: ['ACTIVE_VOTES_ON_SCHEDULED_DAY_WITHIN_RADIUS'] })
  analysisBasis!: 'ACTIVE_VOTES_ON_SCHEDULED_DAY_WITHIN_RADIUS';

  @ApiProperty({ type: Number, example: 12 })
  attendeeCount!: number;

  @ApiProperty({ type: Number, example: 3 })
  nearbyPlacesCount!: number;

  @ApiProperty({ type: [AttendanceAttendeeDto] })
  attendees!: AttendanceAttendeeDto[];
}

export class UserVoteHistoryGroupResponseDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  publicId!: string;

  @ApiProperty({ type: String, example: 'Role da Firma' })
  name!: string;

  @ApiProperty({ type: String, example: 'role-da-firma-k3j2' })
  slug!: string;
}

export class UserVoteHistoryItemResponseDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  id!: string;

  @ApiProperty({ type: Date, example: '2026-06-30' })
  day!: Date;

  @ApiPropertyOptional({ type: String, example: 'Chego depois das 20h' })
  note?: string | null;

  @ApiProperty({ type: String, example: 'global' })
  scopeKey!: string;

  @ApiPropertyOptional({
    type: () => UserVoteHistoryGroupResponseDto,
    nullable: true,
    example: {
      publicId: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed',
      name: 'Role da Firma',
      slug: 'role-da-firma-k3j2',
    },
  })
  group?: UserVoteHistoryGroupResponseDto | null;

  @ApiProperty({ type: PlaceResponseDto })
  place!: PlaceResponseDto;
}
