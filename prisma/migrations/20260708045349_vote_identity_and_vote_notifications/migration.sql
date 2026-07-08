-- AlterEnum
ALTER TYPE "social"."NotificationType" ADD VALUE 'PLACE_VOTE';

-- AlterTable
ALTER TABLE "places"."place_votes" ADD COLUMN     "show_identity" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "social"."notifications" ADD COLUMN     "group_key" TEXT;

-- CreateIndex
CREATE INDEX "idx_notification_group_key" ON "social"."notifications"("user_id", "group_key");
