-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "groups";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "moderation";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "places";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "social";

-- CreateEnum
CREATE TYPE "groups"."GroupPrivacy" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "groups"."GroupMemberRole" AS ENUM ('OWNER', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "groups"."GroupMemberStatus" AS ENUM ('ACTIVE', 'PENDING', 'BLOCKED');

-- CreateEnum
CREATE TYPE "places"."VoteStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "social"."FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "moderation"."ModerationReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "places"."places" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "google_place_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formatted_address" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "photo_url" TEXT,
    "website_url" TEXT,
    "maps_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places"."place_votes" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "note" TEXT,
    "status" "places"."VoteStatus" NOT NULL DEFAULT 'ACTIVE',
    "scope_key" TEXT NOT NULL DEFAULT 'global',
    "user_id" INTEGER NOT NULL,
    "place_id" INTEGER NOT NULL,
    "group_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups"."groups" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "privacy" "groups"."GroupPrivacy" NOT NULL DEFAULT 'PUBLIC',
    "city" TEXT,
    "state" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups"."group_members" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "groups"."GroupMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "groups"."GroupMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."friendships" (
    "id" SERIAL NOT NULL,
    "requester_id" INTEGER NOT NULL,
    "addressee_id" INTEGER NOT NULL,
    "status" "social"."FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation"."moderation_reports" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "moderation"."ModerationReportStatus" NOT NULL DEFAULT 'OPEN',
    "reporter_id" INTEGER NOT NULL,
    "place_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "places_public_id_key" ON "places"."places"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "places_google_place_id_key" ON "places"."places"("google_place_id");

-- CreateIndex
CREATE INDEX "idx_place_city_state" ON "places"."places"("city", "state");

-- CreateIndex
CREATE INDEX "idx_place_coordinates" ON "places"."places"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "place_votes_public_id_key" ON "places"."place_votes"("public_id");

-- CreateIndex
CREATE INDEX "idx_vote_day_status" ON "places"."place_votes"("day", "status");

-- CreateIndex
CREATE INDEX "idx_vote_place_day" ON "places"."place_votes"("place_id", "day");

-- CreateIndex
CREATE INDEX "idx_vote_group_day" ON "places"."place_votes"("group_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "place_votes_user_id_place_id_scope_key_day_key" ON "places"."place_votes"("user_id", "place_id", "scope_key", "day");

-- CreateIndex
CREATE UNIQUE INDEX "groups_public_id_key" ON "groups"."groups"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "groups_slug_key" ON "groups"."groups"("slug");

-- CreateIndex
CREATE INDEX "idx_group_privacy_city" ON "groups"."groups"("privacy", "city");

-- CreateIndex
CREATE INDEX "idx_group_member_user_status" ON "groups"."group_members"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "groups"."group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_friendship_addressee_status" ON "social"."friendships"("addressee_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "friendships_requester_id_addressee_id_key" ON "social"."friendships"("requester_id", "addressee_id");

-- CreateIndex
CREATE UNIQUE INDEX "moderation_reports_public_id_key" ON "moderation"."moderation_reports"("public_id");

-- CreateIndex
CREATE INDEX "idx_moderation_report_status_date" ON "moderation"."moderation_reports"("status", "created_at");

-- AddForeignKey
ALTER TABLE "places"."places" ADD CONSTRAINT "places_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places"."place_votes" ADD CONSTRAINT "place_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places"."place_votes" ADD CONSTRAINT "place_votes_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"."places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places"."place_votes" ADD CONSTRAINT "place_votes_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups"."groups" ADD CONSTRAINT "groups_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups"."group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups"."group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."friendships" ADD CONSTRAINT "friendships_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."friendships" ADD CONSTRAINT "friendships_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation"."moderation_reports" ADD CONSTRAINT "moderation_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation"."moderation_reports" ADD CONSTRAINT "moderation_reports_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"."places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
