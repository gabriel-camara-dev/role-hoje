import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlaceResponseDto } from './place-presenter-schema';

export class MapVoterResponseDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  publicId!: string;

  @ApiProperty({ type: String, example: 'Gabriel Silva' })
  name!: string;

  @ApiProperty({ type: String, example: 'gabriel' })
  username!: string;

  @ApiPropertyOptional({ type: String, example: 'Chego depois das 20h' })
  note?: string | null;
}

export class TodayMapPlaceResponseDto extends PlaceResponseDto {
  @ApiProperty({ type: Number, example: 8 })
  voteCount!: number;

  @ApiProperty({ type: [MapVoterResponseDto] })
  voters!: MapVoterResponseDto[];
}

export class MapHistoryDayResponseDto {
  @ApiProperty({ type: Date, example: '2026-06-30' })
  day!: Date;

  @ApiProperty({ type: [TodayMapPlaceResponseDto] })
  places!: TodayMapPlaceResponseDto[];
}

export class VoteTodayBodyDto {
  @ApiPropertyOptional({ type: String, example: '2026-07-04', description: 'Date to vote for. Defaults to today.' })
  day?: string;

  @ApiPropertyOptional({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  groupPublicId?: string;

  @ApiPropertyOptional({ type: String, example: 'Chego depois das 20h' })
  note?: string;
}

export class VoteTodayResponseDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  publicId!: string;

  @ApiProperty({ type: Date, example: '2026-06-30' })
  day!: Date;

  @ApiProperty({ type: String, example: 'ACTIVE' })
  status!: string;
}
