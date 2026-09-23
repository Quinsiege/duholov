-- Духолов 3.0: все действия игрока выполняет сервер игры (Edge Function «game», server/game).
-- Прогресс, подарки, посылки с духами, таблицу Лиги и дружбу пишет только она (секретным ключом);
-- телефону остаются чтение своих данных и SQL-функции переноса прогресса.
-- Выполнить после 004_friends.sql (скрипт можно запускать повторно).

/* ---------- служебные данные сервера: встреча, бой, позиция, лимиты ---------- */
create table if not exists public.save_srv (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  srv        jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.save_srv enable row level security; -- телефону недоступна

/* ---------- подарки друзьям ---------- */
create table if not exists public.gifts (
  id         uuid primary key default gen_random_uuid(),
  from_pid   text not null,
  to_pid     text not null,
  from_name  text not null,
  contents   jsonb not null,
  created_at timestamptz not null default now(),
  opened_at  timestamptz
);
create index if not exists gifts_inbox on public.gifts (to_pid) where opened_at is null;
alter table public.gifts enable row level security;

/* ---------- посылки с духами (обмен) ---------- */
create table if not exists public.trades (
  code       text primary key check (code ~ '^[A-Z2-9]{10}$'),
  from_pid   text not null,
  from_name  text not null,
  spirit     jsonb not null,
  created_at timestamptz not null default now(),
  taken_by   text,
  taken_at   timestamptz
);
alter table public.trades enable row level security;

/* ---------- телефон больше не пишет прогресс сам ---------- */
revoke execute on function public.put_save(jsonb, int, text) from authenticated;
revoke delete on public.saves from authenticated;
drop policy if exists "saves delete own" on public.saves;
-- строки таблицы Лиги пишет сервер после турнира
revoke insert, update on public.league_scores from authenticated;
drop policy if exists "league insert own" on public.league_scores;
drop policy if exists "league update own" on public.league_scores;
-- дружбу и коды игроков тоже ведёт сервер
revoke execute on function public.add_friend(text, text, int) from authenticated;
revoke execute on function public.register_pid(text) from authenticated;
