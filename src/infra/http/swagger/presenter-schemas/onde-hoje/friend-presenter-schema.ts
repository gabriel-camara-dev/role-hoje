import { ApiProperty } from '@nestjs/swagger';

export class FriendUserResponseDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  publicId!: string;

  @ApiProperty({ type: String, example: 'Gabriel Silva' })
  name!: string;

  @ApiProperty({ type: String, example: 'gabriel' })
  username!: string | null;
}

export class FriendListItemResponseDto {
  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'BLOCKED'], example: 'ACCEPTED' })
  status!: 'PENDING' | 'ACCEPTED' | 'BLOCKED';

  @ApiProperty({ enum: ['sent', 'received'], example: 'received' })
  direction!: 'sent' | 'received';

  @ApiProperty({ type: FriendUserResponseDto })
  friend!: FriendUserResponseDto;
}

export class FriendshipStatusResponseDto {
  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'BLOCKED'], example: 'PENDING' })
  status!: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
}
