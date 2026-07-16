-- Pelli — rooms and anonymous participants.
-- Paste this whole file into the Supabase SQL editor and run it. Safe to re-run.

-- A room is just a code. Everything else hangs off it.
create table if not exists public.rooms (
  code       text primary key,
  status     text not null default 'waiting'
             check (status in ('waiting', 'watching', 'ended')),
  created_at timestamptz not null default now()
);

-- The film, and the last playback snapshot. Kept on the room so a refresh or a
-- late join lands in the right place; live sync rides Realtime broadcast on top
-- (see hooks/use-playback-sync.ts). Added separately so this file re-runs clean
-- over an earlier install.
alter table public.rooms add column if not exists video_url  text;
alter table public.rooms add column if not exists video_name text;
alter table public.rooms add column if not exists video_path text;
alter table public.rooms
  add column if not exists playback_position double precision not null default 0;
alter table public.rooms
  add column if not exists is_playing boolean not null default false;
alter table public.rooms
  add column if not exists playback_updated_at timestamptz;

-- A participant is a name and a color. No account, no PII.
create table if not exists public.participants (
  id        uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(code) on delete cascade,
  name      text not null check (char_length(trim(name)) between 1 and 24),
  color     text not null,
  role      text not null check (role in ('host', 'guest')),
  joined_at timestamptz not null default now()
);

create index if not exists participants_room_code_idx
  on public.participants (room_code);

-- Exactly one host per room.
create unique index if not exists participants_one_host_per_room
  on public.participants (room_code)
  where role = 'host';

-- Row level security -------------------------------------------------------
-- Pelli rooms are deliberately public-by-code: holding the code IS the
-- credential, the same way a shared calendar link works. There is no account
-- to scope rows to, and the only data stored is a display name and a color.
-- So these policies are permissive by design, not by omission. Guessing a room
-- means guessing 1 of ~729M codes.

alter table public.rooms        enable row level security;
alter table public.participants enable row level security;

drop policy if exists "rooms readable"     on public.rooms;
drop policy if exists "rooms insertable"   on public.rooms;
drop policy if exists "rooms updatable"    on public.rooms;

create policy "rooms readable"   on public.rooms for select using (true);
create policy "rooms insertable" on public.rooms for insert with check (true);
create policy "rooms updatable"  on public.rooms for update using (true) with check (true);

drop policy if exists "participants readable"   on public.participants;
drop policy if exists "participants insertable" on public.participants;
drop policy if exists "participants deletable"  on public.participants;

create policy "participants readable"   on public.participants for select using (true);
create policy "participants insertable" on public.participants for insert with check (true);
create policy "participants deletable"  on public.participants for delete using (true);

-- Chat ---------------------------------------------------------------------
-- Messages persist so history survives a refresh or a late join. Author name
-- and color are denormalized onto the row so a message still renders correctly
-- even if the participant row is later removed.
create table if not exists public.messages (
  id             uuid primary key default gen_random_uuid(),
  room_code      text not null references public.rooms(code) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  author_name    text not null check (char_length(trim(author_name)) between 1 and 24),
  author_color   text not null,
  body           text not null check (char_length(trim(body)) between 1 and 500),
  created_at     timestamptz not null default now()
);

create index if not exists messages_room_created_idx
  on public.messages (room_code, created_at);

-- Reactions are persisted for the Movie Night Summary's "top reactions"
-- (Feature 6). The floating animation itself rides Realtime broadcast; these
-- rows are the tally, not the delivery mechanism.
create table if not exists public.reactions (
  id             uuid primary key default gen_random_uuid(),
  room_code      text not null references public.rooms(code) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  emoji          text not null check (char_length(emoji) between 1 and 8),
  created_at     timestamptz not null default now()
);

create index if not exists reactions_room_idx on public.reactions (room_code);

alter table public.messages  enable row level security;
alter table public.reactions enable row level security;

drop policy if exists "messages readable"   on public.messages;
drop policy if exists "messages insertable" on public.messages;
create policy "messages readable"   on public.messages for select using (true);
create policy "messages insertable" on public.messages for insert with check (true);

drop policy if exists "reactions readable"   on public.reactions;
drop policy if exists "reactions insertable" on public.reactions;
create policy "reactions readable"   on public.reactions for select using (true);
create policy "reactions insertable" on public.reactions for insert with check (true);

-- Storage ------------------------------------------------------------------
-- Uploaded films live in a public `movies` bucket. Public read is intentional:
-- the object path contains the room code, which is the credential, and a
-- <video> tag needs a directly fetchable URL anyway. Same trust model as the
-- rooms table.
insert into storage.buckets (id, name, public)
values ('movies', 'movies', true)
on conflict (id) do update set public = true;

drop policy if exists "movies readable"   on storage.objects;
drop policy if exists "movies uploadable" on storage.objects;

create policy "movies readable"
  on storage.objects for select
  using (bucket_id = 'movies');

create policy "movies uploadable"
  on storage.objects for insert
  with check (bucket_id = 'movies');

-- Realtime -----------------------------------------------------------------
-- The lobby streams participant inserts so the host watches their person
-- arrive; Feature 3 broadcasts playback over the same publication.
--
-- The SQL editor runs this file as one transaction, so anything that raises in
-- here would roll back the tables above with it. Hence: create the publication
-- if the project doesn't have one, and swallow anything unexpected — Realtime
-- is an enhancement, and it must never be the reason the schema fails to land.
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'participants'
  ) then
    alter publication supabase_realtime add table public.participants;
  end if;

  -- Chat is delivered live via postgres_changes on this table.
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
exception
  when others then
    raise warning 'Realtime publication not configured (%). Tables are still created; enable Realtime for rooms/participants in the dashboard.', sqlerrm;
end $$;

-- PostgREST caches the schema; nudge it so the new tables are visible at once
-- instead of after the next automatic reload.
notify pgrst, 'reload schema';
