ALTER TABLE "groups"."groups"
  ADD COLUMN IF NOT EXISTS "password_hash" TEXT;
