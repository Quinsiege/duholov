-- 3.27: вход через сервисы (Google, Яндекс, VK, Telegram). Выполнить в Supabase → SQL Editor обоих проектов. Повторный запуск безопасен.
-- Игрок всегда входит гостем (анонимно), а привязка сервиса запоминается здесь: сервис + номер пользователя в нём → учётная запись игры.
-- Вход с нового устройства: сервер игры проверяет вход у сервиса, находит здесь учётную запись и выдаёт одноразовый вход в неё.
-- Пишет и читает только сервер игры (Edge Function game): у клиентов прав нет.

create table if not exists public.auth_links (
  provider   text not null check (provider in ('google', 'yandex', 'vk', 'telegram')),
  subject    text not null check (char_length(subject) between 1 and 128),  -- номер пользователя в сервисе
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text,                                                        -- как его зовут в сервисе (для списка привязок)
  created_at timestamptz not null default now(),
  primary key (provider, subject)
);
create index if not exists auth_links_user on public.auth_links (user_id);

alter table public.auth_links enable row level security;   -- политик нет: доступ только у сервера
revoke all on public.auth_links from anon, authenticated;
