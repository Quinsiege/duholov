-- 3.17: Аукцион духов. Выполнить в Supabase → SQL Editor. Повторный запуск безопасен.
-- Пишет и читает только сервер игры (Edge Function game). Телефону таблица недоступна.
-- Дух на время продажи хранится в лоте (spirit). Покупка — атомарной сменой status open → sold;
-- деньги продавцу и возврат духа начисляются, когда продавец заходит в аукцион (settled).

create table if not exists public.auction_lots (
  id          uuid primary key default gen_random_uuid(),
  seller_uid  uuid not null references auth.users (id) on delete cascade,
  seller_pid  text not null,
  seller_name text not null check (char_length(seller_name) between 1 and 20),
  spirit      jsonb not null,                               -- упакованный дух (как в посылке)
  sid         text not null,
  el          text not null,
  rar         int  not null check (rar between 1 and 5),
  lvl         int  not null check (lvl between 1 and 50),
  power       int  not null check (power >= 0),
  iv_pct      int  not null check (iv_pct between 0 and 100), -- оценка Ордена, %
  iv_a        int  not null check (iv_a between 0 and 15),
  iv_d        int  not null check (iv_d between 0 and 15),
  iv_s        int  not null check (iv_s between 0 and 15),
  shiny       boolean not null default false,
  cur         text not null check (cur in ('sparks', 'zlat')),
  price       int  not null check (price > 0),
  status      text not null default 'open' check (status in ('open', 'sold', 'cancelled', 'expired')),
  buyer_pid   text,
  buyer_name  text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  closed_at   timestamptz,
  delivered   boolean not null default false,   -- покупатель получил духа
  settled     boolean not null default false    -- продавец получил выручку или духа обратно
);
create index if not exists auction_open_idx on public.auction_lots (status, expires_at, created_at desc);
create index if not exists auction_seller_idx on public.auction_lots (seller_pid, status);
create index if not exists auction_filter_idx on public.auction_lots (status, sid, iv_pct, price);

alter table public.auction_lots enable row level security;   -- политик нет: доступ только у сервера
revoke all on public.auction_lots from anon, authenticated;
