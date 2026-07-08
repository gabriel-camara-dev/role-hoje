import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@/@types/prisma/client';
import type {
  Notification,
  NotificationActor,
} from '@/domain/main/enterprise/entities/onde-hoje/notifications/notification';
import type {
  CreateNotificationData,
  NotificationsRepository,
} from '@/domain/main/application/repositories/onde-hoje/notifications-repository';
import { PrismaService } from '../../prisma.service';

type NotificationWithActor = Prisma.NotificationGetPayload<{
  include: {
    actor: {
      select: { publicId: true; name: true; username: true; avatarUpdatedAt: true };
    };
  };
}>;

@Injectable()
export class PrismaNotificationsRepository implements NotificationsRepository {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  private static actorSelect = {
    select: { publicId: true, name: true, username: true, avatarUpdatedAt: true },
  } as const;

  async create(data: CreateNotificationData): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.recipientId,
        actorId: data.actorId ?? null,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        data: (data.data ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      include: { actor: PrismaNotificationsRepository.actorSelect },
    });

    return PrismaNotificationsRepository.toDomain(notification);
  }

  async listForUser(userId: number, limit = 30): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { actor: PrismaNotificationsRepository.actorSelect },
    });

    return notifications.map(PrismaNotificationsRepository.toDomain);
  }

  async countUnread(userId: number): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: number, publicId: string): Promise<boolean> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, publicId, readAt: null },
      data: { readAt: new Date() },
    });

    return result.count > 0;
  }

  async markAllRead(userId: number): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return result.count;
  }

  private static toDomain(notification: NotificationWithActor): Notification {
    const actor: NotificationActor | null = notification.actor
      ? {
          publicId: notification.actor.publicId,
          name: notification.actor.name,
          username: notification.actor.username,
          avatarUrl: notification.actor.avatarUpdatedAt ? `/users/${notification.actor.publicId}/avatar` : null,
        }
      : null;

    return {
      publicId: notification.publicId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: (notification.data as Record<string, unknown> | null) ?? null,
      read: notification.readAt !== null,
      createdAt: notification.createdAt,
      actor,
    };
  }
}
