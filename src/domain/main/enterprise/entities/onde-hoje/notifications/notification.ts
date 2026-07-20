import { Entity } from '@/core/entities/entity';
import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { Optional } from '@/core/types/optional';

export type NotificationType =
  | 'GROUP_INVITE'
  | 'GROUP_INVITE_ACCEPTED'
  | 'GROUP_JOIN_REQUEST'
  | 'GROUP_MEMBER_ACCEPTED'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'PLACE_VOTE';

/** The person who triggered a notification, denormalised for display. */
export interface NotificationActor {
  publicId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface NotificationProps {
  recipientId: UniqueEntityID;
  actor: NotificationActor | null;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  /** Set to a `groupKey` when this row aggregates repeated events (e.g. votes). */
  groupKey: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export class Notification extends Entity<NotificationProps> {
  get recipientId() {
    return this.props.recipientId;
  }

  get actor() {
    return this.props.actor;
  }

  get type() {
    return this.props.type;
  }

  get title() {
    return this.props.title;
  }

  get body() {
    return this.props.body;
  }

  get data() {
    return this.props.data;
  }

  get groupKey() {
    return this.props.groupKey;
  }

  get readAt() {
    return this.props.readAt;
  }

  get isRead() {
    return this.props.readAt !== null;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  read() {
    this.props.readAt = new Date();
  }

  static create(
    props: Optional<NotificationProps, 'actor' | 'body' | 'data' | 'groupKey' | 'readAt' | 'createdAt'>,
    id?: UniqueEntityID,
  ) {
    return new Notification(
      {
        ...props,
        actor: props.actor ?? null,
        body: props.body ?? null,
        data: props.data ?? null,
        groupKey: props.groupKey ?? null,
        readAt: props.readAt ?? null,
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    );
  }
}
