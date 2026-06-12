-- Bring Supabase in sync with the live Prisma/API workspace model.
-- This migration is intentionally idempotent so self-hosted instances that
-- manually applied pieces of the schema can still run it safely.

CREATE TABLE IF NOT EXISTS "pinned_messages" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "pinned_by_id" TEXT NOT NULL,
    "pinned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pinned_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "server_settings" (
    "id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "channel_boards" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "board" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_boards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "channel_docs" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "docs" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_docs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "channel_incidents" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "incident" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_incidents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "channel_canvases" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_canvases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "channel_github" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "pull_requests" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_github_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pinned_messages_channel_id_message_id_key"
ON "pinned_messages"("channel_id", "message_id");
CREATE INDEX IF NOT EXISTS "pinned_messages_channel_id_idx" ON "pinned_messages"("channel_id");

CREATE UNIQUE INDEX IF NOT EXISTS "user_settings_user_id_key" ON "user_settings"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "server_settings_server_id_key" ON "server_settings"("server_id");
CREATE UNIQUE INDEX IF NOT EXISTS "channel_boards_channel_id_key" ON "channel_boards"("channel_id");
CREATE UNIQUE INDEX IF NOT EXISTS "channel_docs_channel_id_key" ON "channel_docs"("channel_id");
CREATE UNIQUE INDEX IF NOT EXISTS "channel_incidents_channel_id_key" ON "channel_incidents"("channel_id");
CREATE UNIQUE INDEX IF NOT EXISTS "channel_canvases_channel_id_key" ON "channel_canvases"("channel_id");
CREATE UNIQUE INDEX IF NOT EXISTS "channel_github_channel_id_key" ON "channel_github"("channel_id");

DO $$
BEGIN
    ALTER TABLE "pinned_messages"
        ADD CONSTRAINT "pinned_messages_channel_id_fkey"
        FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "pinned_messages"
        ADD CONSTRAINT "pinned_messages_message_id_fkey"
        FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "pinned_messages"
        ADD CONSTRAINT "pinned_messages_pinned_by_id_fkey"
        FOREIGN KEY ("pinned_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "user_settings"
        ADD CONSTRAINT "user_settings_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "server_settings"
        ADD CONSTRAINT "server_settings_server_id_fkey"
        FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "channel_boards"
        ADD CONSTRAINT "channel_boards_channel_id_fkey"
        FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "channel_docs"
        ADD CONSTRAINT "channel_docs_channel_id_fkey"
        FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "channel_incidents"
        ADD CONSTRAINT "channel_incidents_channel_id_fkey"
        FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "channel_canvases"
        ADD CONSTRAINT "channel_canvases_channel_id_fkey"
        FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "channel_github"
        ADD CONSTRAINT "channel_github_channel_id_fkey"
        FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
