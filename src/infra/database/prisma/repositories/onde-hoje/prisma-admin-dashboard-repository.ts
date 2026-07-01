import { Inject, Injectable } from '@nestjs/common';
import type { AdminDashboard } from '@/domain/main/enterprise/entities/onde-hoje/admin/admin-dashboard';
import type { AdminDashboardRepository } from '@/domain/main/application/repositories/onde-hoje/admin-dashboard-repository';
import { PrismaService } from '../../prisma.service';
import { todayDate } from './onde-hoje-prisma-utils';

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
}
