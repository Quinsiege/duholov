-- Духолов: схема облака (Supabase → SQL Editor → вставить и выполнить)
-- Перед этим: Authentication → Sign In / Providers → включить «Anonymous sign-ins».

create table if not exists public.league_scores (
  user_id    uuid not null references auth.users (id) on delete cascade,
  season     text not null check (season ~ '^\d{4}-\d{2}$'),
  name       text not null check (char_length(name) between 1 and 20),
  stars      int  not null check (stars between 0 and 1000),
  rank       int  not null check (rank between 0 and 9),
  level      int  not null check (level between 1 and 40),
  look       jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, season)
);

create index if not exists league_scores_top on public.league_scores (season, stars desc, updated_at);

alter table public.league_scores enable row level security;

-- права для Data API (строки всё равно ограничены правилами RLS ниже)
grant select on public.league_scores to anon, authenticated;
grant insert, update on public.league_scores to authenticated;

-- читать таблицу могут все игроки
drop policy if exists "league read" on public.league_scores;
create policy "league read" on public.league_scores
  for select to anon, authenticated using (true);

-- писать — только свою строку
drop policy if exists "league insert own" on public.league_scores;
create policy "league insert own" on public.league_scores
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "league update own" on public.league_scores;
create policy "league update own" on public.league_scores
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
