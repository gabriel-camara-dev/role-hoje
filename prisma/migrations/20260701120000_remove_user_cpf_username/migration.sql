DROP INDEX IF EXISTS "users"."users_username_key";
DROP INDEX IF EXISTS "users"."users_cpf_key";

ALTER TABLE "users"."users"
  DROP COLUMN IF EXISTS "username",
  DROP COLUMN IF EXISTS "cpf";
