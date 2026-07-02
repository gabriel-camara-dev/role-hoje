ALTER TABLE "users"."users"
  ADD COLUMN IF NOT EXISTS "username" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"."users"("username");
