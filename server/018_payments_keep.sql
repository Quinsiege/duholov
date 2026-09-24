-- 4.1: записи о платежах не удаляются вместе с учётной записью (нужны для налогового учёта и возвратов).
-- Выполнить на сервере игры: docker exec -i supabase-db psql -U supabase_admin -d postgres < server/018_payments_keep.sql
-- (и в тестовом проекте — SQL Editor). Повторный запуск безопасен.
alter table public.payments alter column user_id drop not null;
alter table public.payments drop constraint if exists payments_user_id_fkey;
alter table public.payments add constraint payments_user_id_fkey foreign key (user_id) references auth.users (id) on delete set null;
-- уведомления ЮKassa ищут платёж по его номеру в ЮKassa
create index if not exists payments_ext_id on public.payments (ext_id);
