-- 4.23.1: сведения о боте Telegram (имя) — записывает служба duholov-tg-poll: сервер игры сам до Telegram не достучится
create table if not exists public.tg_meta (
  k text primary key,
  v text
);
alter table public.tg_meta enable row level security;   -- политик нет: доступ только у сервера
revoke all on public.tg_meta from anon, authenticated;
