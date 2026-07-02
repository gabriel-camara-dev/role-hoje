UPDATE "users"."users"
SET "username" = lower(regexp_replace(split_part("email", '@', 1), '[^a-z0-9_]', '_', 'g')) || '_' || "id"
WHERE "username" IS NULL OR "username" = '';

ALTER TABLE "users"."users"
  ALTER COLUMN "username" SET NOT NULL;
