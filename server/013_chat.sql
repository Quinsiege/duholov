-- 3.18: Чат Ордена с категориями. Выполнить в Supabase → SQL Editor. Повторный запуск безопасен.
-- Пишет и читает только сервер игры (Edge Function game): он проверяет уровень, дружину, частоту,
-- чистит текст и не пропускает ссылки. Телефону таблицы недоступны.

create table if not exists public.chat_messages (
  id         bigint generated always as identity primary key,
  channel    text not null check (channel in ('all', 'trade', 'raid', 'help', 'clan:sokol', 'clan:medved', 'clan:volk')),
  uid        uuid not null references auth.users (id) on delete cascade,
  pid        text not null,
  name       text not null check (char_length(name) between 1 and 20),
  lvl        int  not null check (lvl between 1 and 50),
  clan       text,
  text       text not null check (char_length(text) between 1 and 200),
  hidden     boolean not null default false,          -- скрыто по жалобам или модератором
  created_at timestamptz not null default now()
);
create index if not exists chat_channel_idx on public.chat_messages (channel, id desc);

-- жалобы: один игрок — одна жалоба на сообщение; после трёх разных жалоб сообщение скрывается
create table if not exists public.chat_reports (
  message_id  bigint not null references public.chat_messages (id) on delete cascade,
  reporter    text not null,
  created_at  timestamptz not null default now(),
  primary key (message_id, reporter)
);

alter table public.chat_messages enable row level security;   -- политик нет: доступ только у сервера
alter table public.chat_reports enable row level security;
revoke all on public.chat_messages, public.chat_reports from anon, authenticated;
