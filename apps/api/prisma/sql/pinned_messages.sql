-- Channel pinned messages.
-- Preferred activation: `pnpm --filter @corvus/api db:push` (applies the schema
-- and regenerates the Prisma client). Run this SQL only if applying manually
-- (e.g. in the Supabase SQL editor); then run `pnpm --filter @corvus/api db:generate`.

CREATE TABLE IF NOT EXISTS pinned_messages (
    id            text        PRIMARY KEY,
    channel_id    text        NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    message_id    text        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    pinned_by_id  text        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    pinned_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (channel_id, message_id)
);

CREATE INDEX IF NOT EXISTS pinned_messages_channel_id_idx ON pinned_messages (channel_id);
