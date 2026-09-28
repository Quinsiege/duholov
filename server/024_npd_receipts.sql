-- 4.22.1: чеки самозанятого в «Мой налог» — сервер пробивает их сам (tools/server/duholov-payments)
-- paid_at — когда ЮKassa приняла оплату (captured_at): время продажи в чеке
-- npd_receipt — номер чека в «Мой налог» ('manual' — пробит вручную, автоматом не пробиваем)
-- npd_cancelled — чек аннулирован (возврат средств)
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists npd_receipt text;
alter table public.payments add column if not exists npd_cancelled boolean not null default false;
