-- 4.1: ошибки из браузеров игроков (www/js/errors.js → POST /functions/v1/game/log). Пишет только сервер игры,
-- читает владелец (SQL). Хранятся 14 дней. Выполнить на сервере игры и в тестовом проекте. Повторный запуск безопасен.
create table if not exists public.client_errors (
  id    bigint generated always as identity primary key,
  at    timestamptz not null default now(),
  v     text,          -- версия игры
  page  text,
  msg   text not null,
  src   text,
  line  int,
  stack text,
  ua    text
);
create index if not exists client_errors_at on public.client_errors (at desc);
alter table public.client_errors enable row level security;   -- политик нет: доступ только у сервера
revoke all on public.client_errors from anon, authenticated;
