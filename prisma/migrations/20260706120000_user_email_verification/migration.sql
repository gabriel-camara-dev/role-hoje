ALTER TABLE "users"."users"
  ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "email_verification_token_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "email_verification_token_expires_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_verification_token_hash_key"
  ON "users"."users"("email_verification_token_hash");

CREATE INDEX IF NOT EXISTS "idx_user_email_verification_token"
  ON "users"."users"("email_verification_token_hash");

UPDATE "users"."users"
SET "email_verified_at" = COALESCE("email_verified_at", "created_at")
WHERE "email_verified_at" IS NULL;
