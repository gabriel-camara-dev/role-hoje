ALTER TABLE "social"."friendships"
ADD COLUMN "pair_key" TEXT;

UPDATE "social"."friendships"
SET "pair_key" = LEAST("requester_id", "addressee_id") || ':' || GREATEST("requester_id", "addressee_id");

WITH ranked_friendships AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "pair_key"
      ORDER BY
        CASE "status"
          WHEN 'BLOCKED' THEN 1
          WHEN 'ACCEPTED' THEN 2
          ELSE 3
        END,
        "updated_at" DESC,
        "id" DESC
    ) AS "row_number"
  FROM "social"."friendships"
)
DELETE FROM "social"."friendships"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_friendships
  WHERE "row_number" > 1
);

ALTER TABLE "social"."friendships"
ALTER COLUMN "pair_key" SET NOT NULL;

CREATE UNIQUE INDEX "friendships_pair_key_key" ON "social"."friendships"("pair_key");
