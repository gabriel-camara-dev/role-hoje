import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@/@types/prisma/enums';

export class CreateUserBodyDto {
  @ApiProperty({ type: String, example: 'Gabriel Silva' })
  name!: string;

  @ApiProperty({ type: String, example: 'gabriel' })
  username!: string;

  @ApiProperty({ type: String, example: 'gabriel@example.com' })
  email!: string;

  @ApiPropertyOptional({ type: String, example: '12345678901' })
  cpf?: string | null;

  @ApiProperty({ type: String, example: 'strong-password' })
  password!: string;
}

export class AuthenticateUserBodyDto {
  @ApiProperty({ type: String, example: 'gabriel@example.com' })
  login!: string;

  @ApiProperty({ type: String, example: 'strong-password' })
  password!: string;
}

export class UpdateUserBodyDto {
  @ApiPropertyOptional({ type: String, example: 'Gabriel Silva' })
  name?: string;

  @ApiPropertyOptional({ type: String, example: 'gabriel' })
  username?: string;

  @ApiPropertyOptional({ type: String, example: 'gabriel@example.com' })
  email?: string;

  @ApiPropertyOptional({ type: String, example: '12345678901' })
  cpf?: string;

  @ApiPropertyOptional({ type: String, example: 'new-strong-password' })
  password?: string;
}

export class UserResponseDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' })
  id!: string;

  @ApiProperty({ type: String, example: 'Gabriel Silva' })
  name!: string;

  @ApiProperty({ type: String, example: 'gabriel' })
  username!: string;

  @ApiProperty({ type: String, example: 'gabriel@example.com' })
  email!: string;

  @ApiProperty({ type: String, example: '12345678901' })
  cpf!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.DEFAULT })
  role!: UserRole;

  @ApiPropertyOptional({ type: String, example: '/users/018f4a2c-87b7-7cc4-9f93-0faaf26cfbed/avatar' })
  avatarUrl?: string | null;

  @ApiProperty({ type: Date, example: '2026-06-30T14:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ type: Date, example: '2026-06-30T14:00:00.000Z' })
  updatedAt!: Date;
}

export class ListUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data!: UserResponseDto[];

  @ApiProperty({ type: Number, example: 1 })
  totalPages!: number;

  @ApiProperty({ type: Number, example: 25 })
  totalCount!: number;

  @ApiProperty({ type: Number, example: 1 })
  currentPage!: number;
}

export class AuthenticateUserResponseDto {
  @ApiProperty({ type: String, example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  token!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
