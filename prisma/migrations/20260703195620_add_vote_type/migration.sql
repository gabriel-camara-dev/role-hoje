-- CreateEnum
CREATE TYPE "places"."VoteType" AS ENUM ('GENERAL', 'MUSIC', 'FOOD', 'DRINK');

-- AlterTable
ALTER TABLE "places"."place_votes" ADD COLUMN     "vote_type" "places"."VoteType" NOT NULL DEFAULT 'GENERAL';
