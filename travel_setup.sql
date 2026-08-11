-- ============================================================
-- Travel tracker — one-time setup for Samir & Mina
-- Paste ALL of this into: Supabase dashboard → SQL Editor → New query → Run
-- ============================================================

create table if not exists travel_countries (
  id           bigint generated always as identity primary key,
  country_id   text not null,          -- ISO numeric id from the world map (e.g. '840')
  country_name text not null,
  person       text not null,          -- 'samir' | 'mina'
  created_at   timestamptz default now(),
  unique (country_id, person)
);

create table if not exists travel_flights (
  id         bigint generated always as identity primary key,
  date       date,
  year       int  not null,
  person     text not null,            -- 'samir' | 'mina'
  from_name  text,
  to_name    text,
  km         numeric not null default 0,
  note       text,
  created_at timestamptz default now()
);

-- Row Level Security on, with permissive policies (same posture as the other apps)
alter table travel_countries enable row level security;
alter table travel_flights   enable row level security;

drop policy if exists "anon all countries" on travel_countries;
drop policy if exists "anon all flights"   on travel_flights;
create policy "anon all countries" on travel_countries for all using (true) with check (true);
create policy "anon all flights"   on travel_flights   for all using (true) with check (true);

-- Make sure the API roles can reach the tables
grant all on travel_countries to anon, authenticated;
grant all on travel_flights   to anon, authenticated;
