-- Run this after schema.sql. Every row should say OK.
-- If anything says MISSING, schema.sql did not land — re-run it and read the
-- error rather than assuming it worked.

select
  'rooms table'        as check,
  case when to_regclass('public.rooms') is not null
       then 'OK' else 'MISSING' end as result
union all
select
  'participants table',
  case when to_regclass('public.participants') is not null
       then 'OK' else 'MISSING' end
union all
select
  'RLS on rooms',
  case when (select relrowsecurity from pg_class where oid = 'public.rooms'::regclass)
       then 'OK' else 'MISSING' end
union all
select
  'RLS on participants',
  case when (select relrowsecurity from pg_class where oid = 'public.participants'::regclass)
       then 'OK' else 'MISSING' end
union all
select
  'realtime: rooms',
  case when exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then 'OK' else 'MISSING' end
union all
select
  'realtime: participants',
  case when exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'participants'
  ) then 'OK' else 'MISSING' end;
