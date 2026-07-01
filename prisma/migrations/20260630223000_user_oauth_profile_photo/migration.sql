ALTER TABLE "users"."users"
  ALTER COLUMN "cpf" DROP NOT NULL,
  ALTER COLUMN "password_hash" DROP NOT NULL,
  ADD COLUMN "google_id" TEXT,
  ADD COLUMN "avatar_encrypted_path" TEXT,
  ADD COLUMN "avatar_iv" TEXT,
  ADD COLUMN "avatar_auth_tag" TEXT,
  ADD COLUMN "avatar_mime_type" TEXT,
  ADD COLUMN "avatar_original_name" TEXT,
  ADD COLUMN "avatar_updated_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_google_id_key" ON "users"."users"("google_id");
