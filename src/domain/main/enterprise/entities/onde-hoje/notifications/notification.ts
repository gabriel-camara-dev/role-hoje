export type NotificationType =
  | 'GROUP_INVITE'
  | 'GROUP_INVITE_ACCEPTED'
  | 'GROUP_JOIN_REQUEST'
  | 'GROUP_MEMBER_ACCEPTED'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED';

export interface NotificationActor {
  publicId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface Notification {
  publicId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: Date;
  actor: NotificationActor | null;
}
