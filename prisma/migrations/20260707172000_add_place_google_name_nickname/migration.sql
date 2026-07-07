ALTER TABLE "places"."places"
  ADD COLUMN "google_place_name" TEXT,
  ADD COLUMN "nickname" TEXT;

UPDATE "places"."places"
SET "google_place_name" = "name"
WHERE "google_place_name" IS NULL;
