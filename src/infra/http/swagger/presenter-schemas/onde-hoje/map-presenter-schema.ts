import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlaceResponseDto } from './place-presenter-schema';

export class MapVoterFriendshipResponseDto {
  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'BLOCKED'], example: 'PENDING' })
  status!: 'PENDING' | 'ACCEPTED' | 'BLOCKED';

  @ApiProperty({ enum: ['sent', 'received'], example: 'sent' })
  direction!: 'sent' | 'received';
}

export class MapVoterResponseDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  publicId!: string;

  @ApiProperty({ type: String, example: 'Gabriel Silva' })
  name!: string;

  @ApiPropertyOptional({ type: String, example: 'gabriel' })
  username?: string | null;

  @ApiPropertyOptional({ type: String, example: '/users/018f4a2c-87b7-7cc4-9f93-0faaf26cfbed/avatar' })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ type: String, example: 'Chego depois das 20h' })
  note?: string | null;

  @ApiProperty({ enum: ['GENERAL', 'MUSIC', 'FOOD', 'DRINK', 'SPORTS'], example: 'MUSIC' })
  voteType!: 'GENERAL' | 'MUSIC' | 'FOOD' | 'DRINK' | 'SPORTS';

  @ApiPropertyOptional({ type: MapVoterFriendshipResponseDto })
  friendship?: MapVoterFriendshipResponseDto;
}

export class TodayMapPlaceResponseDto extends PlaceResponseDto {
  @ApiProperty({ type: Number, example: 8 })
  voteCount!: number;

  @ApiProperty({ enum: ['GENERAL', 'MUSIC', 'FOOD', 'DRINK', 'SPORTS'], example: 'MUSIC' })
  dominantVoteType!: 'GENERAL' | 'MUSIC' | 'FOOD' | 'DRINK' | 'SPORTS';

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

  @ApiPropertyOptional({ enum: ['GENERAL', 'MUSIC', 'FOOD', 'DRINK', 'SPORTS'], example: 'MUSIC' })
  voteType?: 'GENERAL' | 'MUSIC' | 'FOOD' | 'DRINK' | 'SPORTS';
}

export class VoteTodayResponseDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  publicId!: string;

  @ApiProperty({ type: Date, example: '2026-06-30' })
  day!: Date;

  @ApiProperty({ type: String, example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ enum: ['GENERAL', 'MUSIC', 'FOOD', 'DRINK', 'SPORTS'], example: 'MUSIC' })
  voteType!: 'GENERAL' | 'MUSIC' | 'FOOD' | 'DRINK' | 'SPORTS';
}
