-- 3.22.2: закрытый контур. Выполнить в Supabase → SQL Editor обоих проектов (схема одна). Повторный запуск безопасен.
-- Хук «Before User Created»: новый пользователь (в том числе анонимный) создаётся, только если при входе передан
-- ключ доступа (user_metadata.access) и он совпадает с private.settings.access_key.
-- Включается только в тестовом проекте: Authentication → Hooks → Before User Created → Postgres → public.before_user_created.
-- Пока ключ не задан, хук никого не останавливает. Ключ задаёт владелец (в репозитории его нет):
--   insert into private.settings (k, v) values ('access_key', '<ключ>') on conflict (k) do update set v = excluded.v;

create schema if not exists private;
create table if not exists private.settings (
  k text primary key,
  v text not null
);
revoke all on schema private from public, anon, authenticated;
revoke all on private.settings from public, anon, authenticated;

create or replace function public.before_user_created(event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  want text;
begin
  select v into want from private.settings where k = 'access_key';
  if want is null or want = '' then return '{}'::jsonb; end if;
  if (event->'user'->'user_metadata'->>'access') is distinct from want then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Закрытый контур: нужен ключ доступа'));
  end if;
  return '{}'::jsonb;
end $$;

revoke execute on function public.before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.before_user_created(jsonb) to supabase_auth_admin;
