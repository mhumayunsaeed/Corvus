-- ─────────────────────────────────────────────────────────────────
-- Supabase Realtime Authorization (optional hardening)
-- ─────────────────────────────────────────────────────────────────
--
-- By default the app uses PUBLIC broadcast topics (channel:<id>, dm:<id>,
-- user:<id>). Topic names are unguessable cuids, but any authenticated client
-- that learns a topic name could subscribe to it.
--
-- To lock receive-side access down, set REALTIME_PRIVATE_CHANNELS=true on the
-- API and apply the policies below. They run against `realtime.messages`, which
-- Supabase consults for private channels. Clients must call
-- `supabase.realtime.setAuth(<access_token>)` (the app already authenticates the
-- Supabase client) so `auth.uid()` is available here.
--
-- Corvus links Supabase Auth to public.users by normalized unique email during
-- token exchange, so these checks use the signed JWT email claim.

alter table realtime.messages enable row level security;

-- Allow a user to RECEIVE broadcasts on a server channel topic only if they are
-- a member of that channel's server.
create policy "receive channel broadcasts for members"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and (
    -- channel:<channelId>
    case
      when realtime.topic() like 'channel:%' then exists (
        select 1
        from public.channels c
        join public.server_members sm on sm.server_id = c.server_id
        join public.users u on u.id = sm.user_id
        where c.id = split_part(realtime.topic(), ':', 2)
          and lower(u.email) = lower(auth.jwt() ->> 'email')
      )
      -- dm:<conversationId>
      when realtime.topic() like 'dm:%' then exists (
        select 1
        from public.dm_participants p
        join public.users u on u.id = p.user_id
        where p.conversation_id = split_part(realtime.topic(), ':', 2)
          and lower(u.email) = lower(auth.jwt() ->> 'email')
      )
      -- user:<userId> — only the user themselves
      when realtime.topic() like 'user:%' then exists (
        select 1 from public.users u
        where u.id = split_part(realtime.topic(), ':', 2)
          and lower(u.email) = lower(auth.jwt() ->> 'email')
      )
      else false
    end
  )
);

-- Allow clients to SEND (e.g. typing) on channel/dm topics they can receive.
create policy "send typing on accessible topics"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and case
    when realtime.topic() like 'channel:%' then exists (
      select 1
      from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      join public.users u on u.id = sm.user_id
      where c.id = split_part(realtime.topic(), ':', 2)
        and lower(u.email) = lower(auth.jwt() ->> 'email')
    )
    when realtime.topic() like 'dm:%' then exists (
      select 1
      from public.dm_participants p
      join public.users u on u.id = p.user_id
      where p.conversation_id = split_part(realtime.topic(), ':', 2)
        and lower(u.email) = lower(auth.jwt() ->> 'email')
    )
    else false
  end
);
