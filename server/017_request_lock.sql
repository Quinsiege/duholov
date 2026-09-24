-- 4.1: целостность прогресса. Выполнить в Supabase → SQL Editor обоих проектов ДО обновления функции game.
-- Повторный запуск безопасен.
--
-- Раньше сервер читал прогресс, выполнял действие и записывал результат отдельными запросами, а служебные данные
-- (встреча, бой, лимиты) — ещё одним. Два одновременных запроса одного игрока могли оба прочитать прежний прогресс:
-- второй успевал создать запись в общих таблицах (лот аукциона, подарок) и лишь потом узнавал, что прогресс изменился.
-- Так дублировались духи. Теперь:
--   game_begin   — «замок» игрока на время запроса (на всех экземплярах функции) + чтение прогресса и служебных данных;
--   game_commit  — прогресс и служебные данные записываются одной транзакцией, замок снимается;
--   game_release — снять замок без сохранения прогресса (отказ, ошибка), при необходимости сохранив служебные данные.
-- Замок сам истекает через p_ms миллисекунд — если функция упала посреди запроса.

create table if not exists public.save_locks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token   uuid not null,
  until   timestamptz not null
);
alter table public.save_locks enable row level security;   -- политик нет: доступ только у сервера
revoke all on public.save_locks from anon, authenticated;

create or replace function public.game_begin(p_uid uuid, p_token uuid, p_ms int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare got boolean; r jsonb; v jsonb;
begin
  insert into save_locks as l (user_id, token, until) values (p_uid, p_token, now() + p_ms * interval '1 millisecond')
  on conflict (user_id) do update set token = excluded.token, until = excluded.until where l.until < now()
  returning true into got;
  if got is null then return jsonb_build_object('locked', true); end if;
  select to_jsonb(x) into r from (select data, rev, moved_to from saves where user_id = p_uid) x;
  select srv into v from save_srv where user_id = p_uid;
  return jsonb_build_object('row', r, 'srv', coalesce(v, '{}'::jsonb));
end $$;

-- Возвращает новый номер версии прогресса или null, если замок уже не наш или прогресс изменился (тогда замок остаётся —
-- его снимает game_release)
create or replace function public.game_commit(p_uid uuid, p_token uuid, p_rev int, p_data jsonb, p_srv jsonb, p_ver text)
returns int language plpgsql security definer set search_path = public as $$
declare nrev int;
begin
  perform 1 from save_locks where user_id = p_uid and token = p_token for update;
  if not found then return null; end if;
  if p_data is null then
    nrev := p_rev;
  elsif p_rev = 0 then
    insert into saves (user_id, data, rev, app_version) values (p_uid, p_data, 1, p_ver)
    on conflict (user_id) do nothing returning rev into nrev;
  else
    update saves set data = p_data, rev = rev + 1, app_version = p_ver, updated_at = now()
    where user_id = p_uid and rev = p_rev returning rev into nrev;
  end if;
  if nrev is null then return null; end if;
  insert into save_srv (user_id, srv, updated_at) values (p_uid, coalesce(p_srv, '{}'::jsonb), now())
  on conflict (user_id) do update set srv = excluded.srv, updated_at = excluded.updated_at;
  delete from save_locks where user_id = p_uid and token = p_token;
  return nrev;
end $$;

create or replace function public.game_release(p_uid uuid, p_token uuid, p_srv jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_srv is not null and exists (select 1 from save_locks where user_id = p_uid and token = p_token) then
    insert into save_srv (user_id, srv, updated_at) values (p_uid, p_srv, now())
    on conflict (user_id) do update set srv = excluded.srv, updated_at = excluded.updated_at;
  end if;
  delete from save_locks where user_id = p_uid and token = p_token;
end $$;

revoke all on function public.game_begin(uuid, uuid, int) from public, anon, authenticated;
revoke all on function public.game_commit(uuid, uuid, int, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.game_release(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.game_begin(uuid, uuid, int) to service_role;
grant execute on function public.game_commit(uuid, uuid, int, jsonb, jsonb, text) to service_role;
grant execute on function public.game_release(uuid, uuid, jsonb) to service_role;
