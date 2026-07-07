import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserVoteHistoryItemResponseDto } from './place-presenter-schema';

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

class AdminOverviewUsersDto {
  @ApiProperty({ type: Number, example: 120 }) total!: number;
  @ApiProperty({ type: Number, example: 4 }) newToday!: number;
  @ApiProperty({ type: Number, example: 18 }) newLast7Days!: number;
  @ApiProperty({ type: Number, example: 23 }) activeToday!: number;
  @ApiProperty({ type: Number, example: 57 }) activeLast7Days!: number;
  @ApiProperty({ type: Number, example: 88 }) verified!: number;
  @ApiProperty({ type: Number, example: 40 }) withGoogle!: number;
  @ApiProperty({ type: Number, example: 2 }) admins!: number;
}

class AdminOverviewVotesDto {
  @ApiProperty({ type: Number, example: 540 }) activeTotal!: number;
  @ApiProperty({ type: Number, example: 31 }) today!: number;
  @ApiProperty({ type: Number, example: 12 }) cancelledTotal!: number;
  @ApiProperty({ type: Number, example: 190 }) last7Days!: number;
}

class AdminOverviewPlacesDto {
  @ApiProperty({ type: Number, example: 42 }) activeTotal!: number;
  @ApiProperty({ type: Number, example: 3 }) newToday!: number;
}

class AdminOverviewGroupsDto {
  @ApiProperty({ type: Number, example: 8 }) total!: number;
  @ApiProperty({ type: Number, example: 1 }) newToday!: number;
}

class AdminOverviewFriendshipsDto {
  @ApiProperty({ type: Number, example: 65 }) accepted!: number;
  @ApiProperty({ type: Number, example: 9 }) pending!: number;
}

class AdminOverviewReportsDto {
  @ApiProperty({ type: Number, example: 2 }) open!: number;
  @ApiProperty({ type: Number, example: 14 }) total!: number;
}

class AdminDailyPointDto {
  @ApiProperty({ type: String, example: '2026-07-07' }) day!: string;
  @ApiProperty({ type: Number, example: 12 }) count!: number;
}

class AdminVoteTypeCountDto {
  @ApiProperty({ type: String, example: 'FOOD' }) voteType!: string;
  @ApiProperty({ type: Number, example: 9 }) count!: number;
}

class AdminCityVotesDto {
  @ApiProperty({ type: String, example: 'Sao Paulo' }) city!: string;
  @ApiProperty({ type: Number, example: 21 }) votes!: number;
}

export class AdminOverviewResponseDto {
  @ApiProperty({ type: AdminOverviewUsersDto }) users!: AdminOverviewUsersDto;
  @ApiProperty({ type: AdminOverviewVotesDto }) votes!: AdminOverviewVotesDto;
  @ApiProperty({ type: AdminOverviewPlacesDto }) places!: AdminOverviewPlacesDto;
  @ApiProperty({ type: AdminOverviewGroupsDto }) groups!: AdminOverviewGroupsDto;
  @ApiProperty({ type: AdminOverviewFriendshipsDto }) friendships!: AdminOverviewFriendshipsDto;
  @ApiProperty({ type: AdminOverviewReportsDto }) reports!: AdminOverviewReportsDto;
  @ApiProperty({ type: [AdminVoteTypeCountDto] }) voteTypesToday!: AdminVoteTypeCountDto[];
  @ApiProperty({ type: [AdminDailyPointDto] }) votesPerDay!: AdminDailyPointDto[];
  @ApiProperty({ type: [AdminDailyPointDto] }) signupsPerDay!: AdminDailyPointDto[];
  @ApiProperty({ type: [AdminCityVotesDto] }) topCitiesToday!: AdminCityVotesDto[];
}

class AdminVoterStatDto {
  @ApiProperty({ type: String, example: '018f4a2c-87b7-7cc4-9f93-0faaf26cfbed' }) publicId!: string;
  @ApiProperty({ type: String, example: 'Maria Silva' }) name!: string;
  @ApiProperty({ type: String, example: 'maria' }) username!: string;
  @ApiProperty({ type: Number, example: 7 }) votesCount!: number;
}

class AdminCancellerStatDto {
  @ApiProperty({ type: String }) publicId!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) username!: string;
  @ApiProperty({ type: Number, example: 5 }) cancelledCount!: number;
}

class AdminSuspiciousLoginDto {
  @ApiProperty({ type: String }) publicId!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) username!: string;
  @ApiProperty({ type: Number, example: 4 }) loginAttempts!: number;
  @ApiPropertyOptional({ type: String, example: '2026-07-07T12:00:00.000Z' }) lastLogin?: string | null;
}

class AdminReportedPlaceDto {
  @ApiProperty({ type: String }) publicId!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiPropertyOptional({ type: String }) city?: string | null;
  @ApiProperty({ type: Number, example: 3 }) openReports!: number;
}

class AdminRecentReportDto {
  @ApiProperty({ type: String }) publicId!: string;
  @ApiProperty({ type: String, example: 'Local ofensivo' }) reason!: string;
  @ApiProperty({ type: String, example: 'OPEN' }) status!: string;
  @ApiPropertyOptional({ type: String }) placeName?: string | null;
  @ApiProperty({ type: String, example: 'Joao' }) reporterName!: string;
  @ApiProperty({ type: String, example: '2026-07-07T12:00:00.000Z' }) createdAt!: string;
}

export class AdminAbuseReportResponseDto {
  @ApiProperty({ type: [AdminVoterStatDto] }) topVotersToday!: AdminVoterStatDto[];
  @ApiProperty({ type: [AdminCancellerStatDto] }) topCancellersToday!: AdminCancellerStatDto[];
  @ApiProperty({ type: [AdminVoterStatDto] }) heavyVotersAllTime!: AdminVoterStatDto[];
  @ApiProperty({ type: [AdminSuspiciousLoginDto] }) suspiciousLogins!: AdminSuspiciousLoginDto[];
  @ApiProperty({ type: [AdminReportedPlaceDto] }) reportedPlaces!: AdminReportedPlaceDto[];
  @ApiProperty({ type: [AdminRecentReportDto] }) recentReports!: AdminRecentReportDto[];
}

class AdminAuthStatusCountDto {
  @ApiProperty({ type: String, example: 'SUCCESS' }) status!: string;
  @ApiProperty({ type: Number, example: 42 }) count!: number;
}

class AdminAuthIpStatDto {
  @ApiProperty({ type: String, example: '203.0.113.7' }) ipAddress!: string;
  @ApiProperty({ type: Number, example: 12 }) attempts!: number;
}

class AdminAuthAttemptDto {
  @ApiProperty({ type: String, example: 'SUCCESS' }) status!: string;
  @ApiPropertyOptional({ type: String, example: '203.0.113.7' }) ipAddress?: string | null;
  @ApiPropertyOptional({ type: String }) userAgent?: string | null;
  @ApiPropertyOptional({ type: String, example: 'Maria Silva' }) userName?: string | null;
  @ApiProperty({ type: String, example: '2026-07-07T12:00:00.000Z' }) createdAt!: string;
}

export class AdminAuthActivityResponseDto {
  @ApiProperty({ type: Number, example: 42 }) loginsToday!: number;
  @ApiProperty({ type: Number, example: 5 }) failedToday!: number;
  @ApiProperty({ type: Number, example: 2 }) unknownUserToday!: number;
  @ApiProperty({ type: Number, example: 1 }) blockedToday!: number;
  @ApiProperty({ type: Number, example: 30 }) uniqueUsersToday!: number;
  @ApiProperty({ type: [AdminDailyPointDto] }) loginsPerDay!: AdminDailyPointDto[];
  @ApiProperty({ type: [AdminAuthStatusCountDto] }) statusBreakdown!: AdminAuthStatusCountDto[];
  @ApiProperty({ type: [AdminAuthIpStatDto] }) topFailedIps!: AdminAuthIpStatDto[];
  @ApiProperty({ type: [AdminAuthAttemptDto] }) recentAttempts!: AdminAuthAttemptDto[];
}

class AdminUserSummaryDto {
  @ApiProperty({ type: String }) publicId!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) username!: string;
  @ApiProperty({ type: String }) email!: string;
  @ApiProperty({ type: String, example: 'DEFAULT' }) role!: string;
  @ApiPropertyOptional({ type: String }) lastLogin?: string | null;
  @ApiProperty({ type: String }) createdAt!: string;
  @ApiProperty({ type: Boolean }) emailVerified!: boolean;
}

export class AdminUserHistoryResponseDto {
  @ApiProperty({ type: AdminUserSummaryDto }) user!: AdminUserSummaryDto;
  @ApiProperty({ type: [UserVoteHistoryItemResponseDto] }) votes!: UserVoteHistoryItemResponseDto[];
}
