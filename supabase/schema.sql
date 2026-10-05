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

-- Room capacity ------------------------------------------------------------
-- A room holds at most 5 people, host included (keep in step with
-- MAX_PARTICIPANTS in constants/room.ts). Enforced here rather than only in the
-- app because the check-then-insert in code is racy: two people joining a room
-- at 4/5 would both pass it. Locking the room row serializes concurrent joins,
-- so exactly one of them gets the last seat.
--
-- security definer so the lock and count work regardless of who is inserting.
create or replace function public.enforce_room_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seated integer;
begin
  perform 1 from public.rooms where code = new.room_code for update;

  select count(*) into seated
  from public.participants
  where room_code = new.room_code;

  if seated >= 5 then
    raise exception 'room_full: this room holds at most 5 people'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists participants_capacity on public.participants;
create trigger participants_capacity
  before insert on public.participants
  for each row execute function public.enforce_room_capacity();

-- One color and one name per room, for the same reason: the app checks, but
-- only the database can make two simultaneous joins agree. Guarded so that
-- leftover test rows which already collide can never roll back the whole file.
do $$
begin
  create unique index if not exists participants_room_color_uniq
    on public.participants (room_code, color);
exception
  when others then
    raise warning 'Per-room color uniqueness not enforced (%). Existing rows probably collide; the app still checks in code.', sqlerrm;
end $$;

do $$
begin
  create unique index if not exists participants_room_name_uniq
    on public.participants (room_code, lower(name));
exception
  when others then
    raise warning 'Per-room name uniqueness not enforced (%). Existing rows probably collide; the app still checks in code.', sqlerrm;
end $$;

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
-- Films no longer live in Supabase. They are in a private Cloudflare R2 bucket,
-- reached only through presigned URLs the server mints for the room's host
-- (upload) and members (watch) — see services/storage.ts.
--
-- Earlier versions had a public `movies` bucket here that any anonymous client
-- could write to. These two statements close it: with its policies gone, nobody
-- can read or add to it through the API. Existing objects can be deleted from
-- the dashboard (Storage -> movies). Guarded, like every optional block here,
-- so a permissions hiccup can never roll back the tables above.
do $$
begin
  drop policy if exists "movies readable"   on storage.objects;
  drop policy if exists "movies uploadable" on storage.objects;
exception
  when others then
    raise warning 'Could not drop the old movies policies (%). Remove them in the dashboard: Storage -> Policies.', sqlerrm;
end $$;

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
