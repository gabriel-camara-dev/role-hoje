import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminTopPlaceResponseDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  publicId!: string;

  @ApiProperty({ type: String, example: 'Bar do Centro' })
  name!: string;

  @ApiPropertyOptional({ type: String, example: 'Sao Paulo' })
  city?: string | null;

  @ApiProperty({ type: Number, example: 12 })
  votesCount!: number;
}

export class AdminDashboardResponseDto {
  @ApiProperty({ type: Number, example: 120 })
  usersCount!: number;

  @ApiProperty({ type: Number, example: 42 })
  placesCount!: number;

  @ApiProperty({ type: Number, example: 8 })
  groupsCount!: number;

  @ApiProperty({ type: Number, example: 31 })
  todayVotesCount!: number;

  @ApiProperty({ type: Number, example: 2 })
  openReportsCount!: number;

  @ApiProperty({ type: [AdminTopPlaceResponseDto] })
  topPlaces!: AdminTopPlaceResponseDto[];
}
