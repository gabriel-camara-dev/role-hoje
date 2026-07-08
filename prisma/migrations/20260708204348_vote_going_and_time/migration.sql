-- AlterTable
ALTER TABLE "places"."place_votes" ADD COLUMN     "going" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "vote_time" TEXT;
