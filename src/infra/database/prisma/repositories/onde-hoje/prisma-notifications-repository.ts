import { Inject, Injectable } from '@nestjs/common';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { Prisma } from '@/@types/prisma/client';
import type {
  NotificationsRepository,
  UpsertAggregatedNotificationData,
} from '@/domain/main/application/repositories/onde-hoje/notifications-repository';
import {
  Notification,
  type NotificationActor,
} from '@/domain/main/enterprise/entities/onde-hoje/notifications/notification';
import { DatabaseContext } from '../../database-context';

const actorSelect = {
  select: { publicId: true, name: true, username: true, avatarUpdatedAt: true },
} as const;

const withRelations = {
  user: { select: { publicId: true } },
  actor: actorSelect,
} satisfies Prisma.NotificationInclude;

type NotificationRow = Prisma.NotificationGetPayload<{ include: typeof withRelations }>;

@Injectable()
export class PrismaNotificationsRepository implements NotificationsRepository {
  constructor(@Inject(DatabaseContext) private readonly dbContext: DatabaseContext) {}

  async findById(id: string): Promise<Notification | null> {
    const notification = await this.dbContext.client.notification.findUnique({
      where: { publicId: id },
      include: withRelations,
    });

    return notification ? PrismaNotificationsRepository.toDomain(notification) : null;
  }

  async create(notification: Notification): Promise<void> {
    await this.dbContext.client.notification.create({
      data: {
        publicId: notification.id.toString(),
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: (notification.data ?? undefined) as Prisma.InputJsonValue | undefined,
        groupKey: notification.groupKey,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
        user: { connect: { publicId: notification.recipientId.toString() } },
        ...(notification.actor ? { actor: { connect: { publicId: notification.actor.publicId } } } : {}),
      },
    });
  }

  async save(notification: Notification): Promise<void> {
    await this.dbContext.client.notification.update({
      where: { publicId: notification.id.toString() },
      data: {
        title: notification.title,
        body: notification.body,
        data: (notification.data ?? undefined) as Prisma.InputJsonValue | undefined,
        readAt: notification.readAt,
      },
    });
  }

  async findManyByRecipientId(recipientPublicId: string, limit = 30, offset = 0): Promise<Notification[]> {
    const notifications = await this.dbContext.client.notification.findMany({
      where: { user: { publicId: recipientPublicId } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: withRelations,
    });

    return notifications.map(PrismaNotificationsRepository.toDomain);
  }

  async countUnread(recipientPublicId: string): Promise<number> {
    return this.dbContext.client.notification.count({
      where: { user: { publicId: recipientPublicId }, readAt: null },
    });
  }

  async markAllRead(recipientPublicId: string): Promise<number> {
    const result = await this.dbContext.client.notification.updateMany({
      where: { user: { publicId: recipientPublicId }, readAt: null },
      data: { readAt: new Date() },
    });

    return result.count;
  }

  async findLatestByGroupKey(recipientPublicId: string, groupKey: string): Promise<Notification | null> {
    const notification = await this.dbContext.client.notification.findFirst({
      where: { user: { publicId: recipientPublicId }, groupKey },
      orderBy: { createdAt: 'desc' },
      include: withRelations,
    });

    return notification ? PrismaNotificationsRepository.toDomain(notification) : null;
  }

  async upsertAggregated(data: UpsertAggregatedNotificationData): Promise<Notification> {
    const existing = await this.dbContext.client.notification.findFirst({
      where: { user: { publicId: data.recipientPublicId }, groupKey: data.groupKey },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    // Bumping createdAt + clearing readAt resurfaces the aggregated notification
    // to the top and marks it unread again, like a "N people liked" toast.
    const notification = existing
      ? await this.dbContext.client.notification.update({
          where: { id: existing.id },
          data: {
            title: data.title,
            data: (data.data ?? undefined) as Prisma.InputJsonValue | undefined,
            readAt: null,
            createdAt: new Date(),
          },
          include: withRelations,
        })
      : await this.dbContext.client.notification.create({
          data: {
            user: { connect: { publicId: data.recipientPublicId } },
            type: data.type,
            groupKey: data.groupKey,
            title: data.title,
            data: (data.data ?? undefined) as Prisma.InputJsonValue | undefined,
          },
          include: withRelations,
        });

    return PrismaNotificationsRepository.toDomain(notification);
  }

  private static toDomain(row: NotificationRow): Notification {
    const actor: NotificationActor | null = row.actor
      ? {
          publicId: row.actor.publicId,
          name: row.actor.name,
          username: row.actor.username,
          avatarUrl: row.actor.avatarUpdatedAt ? `/users/${row.actor.publicId}/avatar` : null,
        }
      : null;

    return Notification.create(
      {
        recipientId: new UniqueEntityID(row.user.publicId),
        actor,
        type: row.type,
        title: row.title,
        body: row.body,
        data: (row.data as Record<string, unknown> | null) ?? null,
        groupKey: row.groupKey,
        readAt: row.readAt,
        createdAt: row.createdAt,
      },
      new UniqueEntityID(row.publicId),
    );
  }
}
