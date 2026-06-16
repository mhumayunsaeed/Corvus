-- Pre-launch waiting list. Captures interested users before the product is
-- generally available. Signups are public/unauthenticated and go through the
-- API (src/routes/waitlist.ts), which connects as the Postgres role and so
-- bypasses RLS — no policies are required for the app to write here.
--
-- Idempotent: safe to re-run on every deploy.

CREATE TABLE IF NOT EXISTS "waitlist_entries" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_entries_email_key"
ON "waitlist_entries"("email");

CREATE INDEX IF NOT EXISTS "waitlist_entries_created_at_idx"
ON "waitlist_entries"("created_at");
