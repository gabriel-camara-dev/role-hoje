import { UserRole as PrismaUserRole } from '@/@types/prisma/enums';

export const USER_ROLES = PrismaUserRole;
export type UserRole = (typeof PrismaUserRole)[keyof typeof PrismaUserRole];
