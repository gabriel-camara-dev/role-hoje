import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GroupResponseDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  id!: string;

  @ApiProperty({ type: String, example: 'Role da Firma' })
  name!: string;

  @ApiProperty({ type: String, example: 'role-da-firma-k3j2' })
  slug!: string;

  @ApiPropertyOptional({ type: String, example: 'Grupo para combinar onde ir hoje' })
  description?: string | null;

  @ApiProperty({ enum: ['PUBLIC', 'PRIVATE'], example: 'PUBLIC' })
  privacy!: 'PUBLIC' | 'PRIVATE';

  @ApiPropertyOptional({ type: String, example: 'Sao Paulo' })
  city?: string | null;

  @ApiPropertyOptional({ type: String, example: 'SP' })
  state?: string | null;

  @ApiPropertyOptional({ type: Number, example: 24 })
  membersCount?: number;

  @ApiPropertyOptional({ type: Number, example: 8 })
  todayVotesCount?: number;
}

export class CreateGroupBodyDto {
  @ApiProperty({ type: String, example: 'Role da Firma' })
  name!: string;

  @ApiPropertyOptional({ type: String, example: 'Grupo para combinar onde ir hoje' })
  description?: string;

  @ApiProperty({ enum: ['PUBLIC', 'PRIVATE'], example: 'PUBLIC' })
  privacy!: 'PUBLIC' | 'PRIVATE';

  @ApiPropertyOptional({ type: String, example: 'Sao Paulo' })
  city?: string;

  @ApiPropertyOptional({ type: String, example: 'SP' })
  state?: string;
}

export class GroupMembershipResponseDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  groupPublicId!: string;

  @ApiProperty({ enum: ['ACTIVE', 'PENDING', 'BLOCKED'], example: 'ACTIVE' })
  status!: 'ACTIVE' | 'PENDING' | 'BLOCKED';
}
