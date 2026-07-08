-- CreateEnum
CREATE TYPE "social"."NotificationType" AS ENUM ('GROUP_INVITE', 'GROUP_INVITE_ACCEPTED', 'GROUP_JOIN_REQUEST', 'GROUP_MEMBER_ACCEPTED', 'FRIEND_REQUEST', 'FRIEND_ACCEPTED');

-- AlterEnum
ALTER TYPE "groups"."GroupMemberStatus" ADD VALUE 'INVITED';

-- DropForeignKey
ALTER TABLE "authentication_audit"."authentication_audit" DROP CONSTRAINT "authentication_audit_user_id_fkey";

-- CreateTable
CREATE TABLE "social"."notifications" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "actor_id" INTEGER,
    "type" "social"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_public_id_key" ON "social"."notifications"("public_id");

-- CreateIndex
CREATE INDEX "idx_notification_user_read" ON "social"."notifications"("user_id", "read_at", "created_at");

-- AddForeignKey
ALTER TABLE "authentication_audit"."authentication_audit" ADD CONSTRAINT "authentication_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "social"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
