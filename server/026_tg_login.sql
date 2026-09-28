-- 4.23: вход через бота Telegram на телефоне — открывается приложение Telegram, а не страница входа.
-- tg_login: одноразовый код входа (живёт 15 минут, только для игрока, который его получил); бот отмечает, кто подтвердил.
-- tg_chats: кто писал боту (для duholov-alerts-setup — с включённым приёмником сообщений getUpdates не работает).
create table if not exists public.tg_login (
  code         text primary key,
  user_id      uuid not null,
  tg_id        bigint,
  tg_name      text,
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz
);
alter table public.tg_login enable row level security;   -- политик нет: доступ только у сервера
revoke all on public.tg_login from anon, authenticated;

create table if not exists public.tg_chats (
  chat_id  bigint primary key,
  name     text,
  username text,
  last_at  timestamptz not null default now()
);
alter table public.tg_chats enable row level security;
revoke all on public.tg_chats from anon, authenticated;
