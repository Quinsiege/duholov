-- 3.15: покупки златников за рубли (ЮKassa: карта, СБП, SberPay, T-Pay, ЮMoney, баланс телефона).
-- Пишет и читает только сервер игры (Edge Function game, секретный ключ). Телефону таблица недоступна.
-- Златники начисляет действие payClaim: номер оплаты запоминается в прогрессе (paid), поэтому
-- начисление ровно одно, даже если отметка credited не успела записаться.

create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  pack        text not null,
  zlat        int not null check (zlat > 0),
  amount      numeric(10, 2) not null check (amount > 0),
  provider    text not null default 'yookassa',
  ext_id      text unique,                       -- номер платежа у ЮKassa
  status      text not null default 'new'
              check (status in ('new', 'pending', 'waiting_for_capture', 'succeeded', 'canceled', 'failed')),
  method      text,                              -- bank_card, sbp, sberbank, tinkoff_bank, yoo_money, mobile_balance…
  credited    boolean not null default false,    -- златники уже начислены в прогресс
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;   -- политик нет: доступ только у сервера
revoke all on public.payments from anon, authenticated;
