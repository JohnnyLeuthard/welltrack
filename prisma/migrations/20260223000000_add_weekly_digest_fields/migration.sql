-- AlterTable
ALTER TABLE "users" ADD COLUMN "weekly_digest_opt_in" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "weekly_digest_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_weekly_digest_token_key" ON "users"("weekly_digest_token");
