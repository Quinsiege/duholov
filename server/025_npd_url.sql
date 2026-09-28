-- 4.22.1: ссылка на чек «Мой налог» — игрок видит её в Казне («Мои покупки и чеки»); заполняет tools/server/duholov-payments
alter table public.payments add column if not exists npd_url text;
