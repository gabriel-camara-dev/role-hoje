import { Inject, Injectable } from '@nestjs/common';
import { addDaysToDateOnly, formatDateOnly } from '@/core/date/date-only';
import type { AdminDashboard } from '@/domain/main/enterprise/entities/onde-hoje/admin/admin-dashboard';
import type {
  AdminAbuseReport,
  AdminAuthActivity,
  AdminDailyPoint,
  AdminOverview,
} from '@/domain/main/enterprise/entities/onde-hoje/admin/admin-insights';
import type { AdminDashboardRepository } from '@/domain/main/application/repositories/onde-hoje/admin-dashboard-repository';
import { PrismaService } from '../../prisma.service';
import { toDateKey, todayDate } from './onde-hoje-prisma-utils';

const DAILY_WINDOW_DAYS = 14;

@Injectable()
export class PrismaAdminDashboardRepository implements AdminDashboardRepository {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async getDashboard(): Promise<AdminDashboard> {
    const day = todayDate();
    const [usersCount, placesCount, groupsCount, todayVotesCount, openReportsCount, topPlaces] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.place.count({ where: { isActive: true } }),
      this.prisma.group.count(),
      this.prisma.placeVote.count({ where: { day, status: 'ACTIVE' } }),
      this.prisma.moderationReport.count({ where: { status: 'OPEN' } }),
      this.prisma.place.findMany({
        where: {
          votes: {
            some: { day, status: 'ACTIVE' },
          },
        },
        include: {
          _count: {
            select: {
              votes: {
                where: { day, status: 'ACTIVE' },
              },
            },
          },
        },
        take: 10,
      }),
    ]);

    return {
      usersCount,
      placesCount,
      groupsCount,
      todayVotesCount,
      openReportsCount,
      topPlaces: topPlaces
        .map((place) => ({
          publicId: place.publicId,
          name: place.name,
          city: place.city,
          votesCount: place._count.votes,
        }))
        .sort((a, b) => b.votesCount - a.votesCount),
    };
  }

  async getOverview(): Promise<AdminOverview> {
    const today = todayDate();
    const last7DaysStart = addDaysToDateOnly(today, -6);
    const windowStart = addDaysToDateOnly(today, -(DAILY_WINDOW_DAYS - 1));

    const [
      usersTotal,
      usersNewToday,
      usersNewLast7Days,
      usersActiveToday,
      usersActiveLast7Days,
      usersVerified,
      usersWithGoogle,
      usersAdmins,
      votesActiveTotal,
      votesToday,
      votesCancelledTotal,
      votesLast7Days,
      placesActiveTotal,
      placesNewToday,
      groupsTotal,
      groupsNewToday,
      friendshipsAccepted,
      friendshipsPending,
      reportsOpen,
      reportsTotal,
      voteTypesTodayRaw,
      votesPerDayRaw,
      signupRows,
      votesTodayCities,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { createdAt: { gte: last7DaysStart } } }),
      this.prisma.user.count({ where: { lastLogin: { gte: today } } }),
      this.prisma.user.count({ where: { lastLogin: { gte: last7DaysStart } } }),
      this.prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
      this.prisma.user.count({ where: { googleId: { not: null } } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.placeVote.count({ where: { status: 'ACTIVE' } }),
      this.prisma.placeVote.count({ where: { status: 'ACTIVE', day: today } }),
      this.prisma.placeVote.count({ where: { status: 'CANCELLED' } }),
      this.prisma.placeVote.count({ where: { status: 'ACTIVE', day: { gte: last7DaysStart } } }),
      this.prisma.place.count({ where: { isActive: true } }),
      this.prisma.place.count({ where: { createdAt: { gte: today } } }),
      this.prisma.group.count(),
      this.prisma.group.count({ where: { createdAt: { gte: today } } }),
      this.prisma.friendship.count({ where: { status: 'ACCEPTED' } }),
      this.prisma.friendship.count({ where: { status: 'PENDING' } }),
      this.prisma.moderationReport.count({ where: { status: 'OPEN' } }),
      this.prisma.moderationReport.count(),
      this.prisma.placeVote.groupBy({
        by: ['voteType'],
        where: { status: 'ACTIVE', day: today },
        _count: true,
      }),
      this.prisma.placeVote.groupBy({
        by: ['day'],
        where: { status: 'ACTIVE', day: { gte: windowStart } },
        _count: true,
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: windowStart } },
        select: { createdAt: true },
      }),
      this.prisma.placeVote.findMany({
        where: { status: 'ACTIVE', day: today },
        select: { place: { select: { city: true } } },
      }),
    ]);

    const votesByDay = new Map(votesPerDayRaw.map((row) => [toDateKey(row.day), row._count]));
    const signupsByDay = new Map<string, number>();
    for (const row of signupRows) {
      const key = toDateKey(row.createdAt);
      signupsByDay.set(key, (signupsByDay.get(key) ?? 0) + 1);
    }

    const votesPerDay: AdminDailyPoint[] = [];
    const signupsPerDay: AdminDailyPoint[] = [];
    for (let index = 0; index < DAILY_WINDOW_DAYS; index++) {
      const key = formatDateOnly(addDaysToDateOnly(windowStart, index));
      votesPerDay.push({ day: key, count: votesByDay.get(key) ?? 0 });
      signupsPerDay.push({ day: key, count: signupsByDay.get(key) ?? 0 });
    }

    const cityCounts = new Map<string, number>();
    for (const vote of votesTodayCities) {
      const city = vote.place.city;
      if (city) {
        cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
      }
    }
    const topCitiesToday = [...cityCounts.entries()]
      .map(([city, votes]) => ({ city, votes }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 5);

    return {
      users: {
        total: usersTotal,
        newToday: usersNewToday,
        newLast7Days: usersNewLast7Days,
        activeToday: usersActiveToday,
        activeLast7Days: usersActiveLast7Days,
        verified: usersVerified,
        withGoogle: usersWithGoogle,
        admins: usersAdmins,
      },
      votes: {
        activeTotal: votesActiveTotal,
        today: votesToday,
        cancelledTotal: votesCancelledTotal,
        last7Days: votesLast7Days,
      },
      places: {
        activeTotal: placesActiveTotal,
        newToday: placesNewToday,
      },
      groups: {
        total: groupsTotal,
        newToday: groupsNewToday,
      },
      friendships: {
        accepted: friendshipsAccepted,
        pending: friendshipsPending,
      },
      reports: {
        open: reportsOpen,
        total: reportsTotal,
      },
      voteTypesToday: voteTypesTodayRaw
        .map((row) => ({ voteType: row.voteType, count: row._count }))
        .sort((a, b) => b.count - a.count),
      votesPerDay,
      signupsPerDay,
      topCitiesToday,
    };
  }

  async getAbuseReport(): Promise<AdminAbuseReport> {
    const today = todayDate();

    const [topVotersRaw, topCancellersRaw, heavyVotersRaw, suspiciousUsers, reportedRaw, recentReports] =
      await Promise.all([
        this.prisma.placeVote.groupBy({
          by: ['userId'],
          where: { status: 'ACTIVE', day: today },
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 10,
        }),
        this.prisma.placeVote.groupBy({
          by: ['userId'],
          where: { status: 'CANCELLED', day: today },
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 10,
        }),
        this.prisma.placeVote.groupBy({
          by: ['userId'],
          where: { status: 'ACTIVE' },
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 10,
        }),
        this.prisma.user.findMany({
          where: { loginAttempts: { gt: 0 } },
          orderBy: { loginAttempts: 'desc' },
          take: 10,
          select: { publicId: true, name: true, username: true, loginAttempts: true, lastLogin: true },
        }),
        this.prisma.moderationReport.groupBy({
          by: ['placeId'],
          where: { status: 'OPEN', placeId: { not: null } },
          _count: { placeId: true },
          orderBy: { _count: { placeId: 'desc' } },
          take: 10,
        }),
        this.prisma.moderationReport.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            publicId: true,
            reason: true,
            status: true,
            createdAt: true,
            place: { select: { name: true } },
            reporter: { select: { name: true } },
          },
        }),
      ]);

    const voterUserIds = [
      ...new Set([...topVotersRaw, ...topCancellersRaw, ...heavyVotersRaw].map((row) => row.userId)),
    ];
    const voterUsers = await this.prisma.user.findMany({
      where: { id: { in: voterUserIds } },
      select: { id: true, publicId: true, name: true, username: true },
    });
    const userById = new Map(voterUsers.map((user) => [user.id, user]));

    const placeIds = reportedRaw.map((row) => row.placeId).filter((id): id is number => id !== null);
    const reportedPlacesData = await this.prisma.place.findMany({
      where: { id: { in: placeIds } },
      select: { id: true, publicId: true, name: true, city: true },
    });
    const placeById = new Map(reportedPlacesData.map((place) => [place.id, place]));

    return {
      topVotersToday: topVotersRaw.map((row) => {
        const user = userById.get(row.userId);
        return {
          publicId: user?.publicId ?? '',
          name: user?.name ?? 'Desconhecido',
          username: user?.username ?? '',
          votesCount: row._count.userId,
        };
      }),
      topCancellersToday: topCancellersRaw.map((row) => {
        const user = userById.get(row.userId);
        return {
          publicId: user?.publicId ?? '',
          name: user?.name ?? 'Desconhecido',
          username: user?.username ?? '',
          cancelledCount: row._count.userId,
        };
      }),
      heavyVotersAllTime: heavyVotersRaw.map((row) => {
        const user = userById.get(row.userId);
        return {
          publicId: user?.publicId ?? '',
          name: user?.name ?? 'Desconhecido',
          username: user?.username ?? '',
          votesCount: row._count.userId,
        };
      }),
      suspiciousLogins: suspiciousUsers.map((user) => ({
        publicId: user.publicId,
        name: user.name,
        username: user.username,
        loginAttempts: user.loginAttempts,
        lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
      })),
      reportedPlaces: reportedRaw.map((row) => {
        const place = row.placeId !== null ? placeById.get(row.placeId) : undefined;
        return {
          publicId: place?.publicId ?? '',
          name: place?.name ?? 'Local removido',
          city: place?.city ?? null,
          openReports: row._count.placeId,
        };
      }),
      recentReports: recentReports.map((report) => ({
        publicId: report.publicId,
        reason: report.reason,
        status: report.status,
        placeName: report.place?.name ?? null,
        reporterName: report.reporter.name,
        createdAt: report.createdAt.toISOString(),
      })),
    };
  }

  async getAuthActivity(): Promise<AdminAuthActivity> {
    const today = todayDate();
    const last7DaysStart = addDaysToDateOnly(today, -6);
    const windowStart = addDaysToDateOnly(today, -(DAILY_WINDOW_DAYS - 1));

    const [
      loginsToday,
      failedToday,
      unknownUserToday,
      blockedToday,
      uniqueUsersTodayRows,
      successRows,
      statusBreakdownRaw,
      topFailedIpsRaw,
      recentAttempts,
    ] = await Promise.all([
      this.prisma.authenticationAudit.count({ where: { status: 'SUCCESS', createdAt: { gte: today } } }),
      this.prisma.authenticationAudit.count({ where: { status: 'INCORRECT_PASSWORD', createdAt: { gte: today } } }),
      this.prisma.authenticationAudit.count({ where: { status: 'USER_NOT_EXISTS', createdAt: { gte: today } } }),
      this.prisma.authenticationAudit.count({ where: { status: 'BLOCKED', createdAt: { gte: today } } }),
      this.prisma.authenticationAudit.findMany({
        where: { status: 'SUCCESS', createdAt: { gte: today }, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.authenticationAudit.findMany({
        where: { status: 'SUCCESS', createdAt: { gte: windowStart } },
        select: { createdAt: true },
      }),
      this.prisma.authenticationAudit.groupBy({
        by: ['status'],
        where: { createdAt: { gte: last7DaysStart } },
        _count: true,
      }),
      this.prisma.authenticationAudit.groupBy({
        by: ['ipAddress'],
        where: { status: { not: 'SUCCESS' }, createdAt: { gte: last7DaysStart }, ipAddress: { not: null } },
        _count: { ipAddress: true },
        orderBy: { _count: { ipAddress: 'desc' } },
        take: 10,
      }),
      this.prisma.authenticationAudit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          status: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
    ]);

    const loginsByDay = new Map<string, number>();
    for (const row of successRows) {
      const key = toDateKey(row.createdAt);
      loginsByDay.set(key, (loginsByDay.get(key) ?? 0) + 1);
    }
    const loginsPerDay: AdminDailyPoint[] = [];
    for (let index = 0; index < DAILY_WINDOW_DAYS; index++) {
      const key = formatDateOnly(addDaysToDateOnly(windowStart, index));
      loginsPerDay.push({ day: key, count: loginsByDay.get(key) ?? 0 });
    }

    return {
      loginsToday,
      failedToday,
      unknownUserToday,
      blockedToday,
      uniqueUsersToday: uniqueUsersTodayRows.length,
      loginsPerDay,
      statusBreakdown: statusBreakdownRaw
        .map((row) => ({ status: row.status, count: row._count }))
        .sort((a, b) => b.count - a.count),
      topFailedIps: topFailedIpsRaw
        .filter((row): row is typeof row & { ipAddress: string } => row.ipAddress !== null)
        .map((row) => ({ ipAddress: row.ipAddress, attempts: row._count.ipAddress })),
      recentAttempts: recentAttempts.map((attempt) => ({
        status: attempt.status,
        ipAddress: attempt.ipAddress,
        userAgent: attempt.userAgent,
        userName: attempt.user?.name ?? null,
        createdAt: attempt.createdAt.toISOString(),
      })),
    };
  }
}
