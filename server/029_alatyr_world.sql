-- 4.28: общий Алатырь — все Ловчие вместе собирают бел-горюч камень. Выполнить в Supabase → SQL Editor обоих проектов
-- (сначала тестовый, потом боевой) ДО выкладки функции game 4.28. Повторный запуск безопасен.
--
-- alatyr_world — общий счёт осколков Алатыря, найденных всеми Ловчими за всё время (одна строка, id = 1).
-- alatyr_roads — распутанные дороги: грань n (с нуля, по всем виткам), её мифология, счёт, на котором грань собрана,
--                начало и конец события дороги (мс UTC). В эти 72 часа духи этой мифологии встречаются чаще.
-- Вехи (сколько стоит грань, какая мифология, когда начинается событие) считает сервер игры по Rules.ALATYR_WORLD
-- (www/js/rules.js) — их легко поправить без миграции:
--   alatyr_add(n)  — атомарно прибавить n осколков, вернуть счёт до и после; вехи между ними отмечает сервер игры
--                    (перешагнуть веху может только один запрос — у него prev < порог ≤ total);
--   alatyr_open(…) — записать дорогу грани n; повтор той же грани ничего не меняет (возвращает false).
-- Писать может только сервер игры (service_role). Читать счёт и дороги могут все (anon, authenticated) — только эти поля.

create table if not exists public.alatyr_world (
  id         int primary key default 1 check (id = 1),
  total      bigint not null default 0 check (total >= 0),
  updated_at timestamptz not null default now()
);
insert into public.alatyr_world (id) values (1) on conflict (id) do nothing;

create table if not exists public.alatyr_roads (
  n          int primary key check (n >= 0),
  road       text not null check (road in ('slavic', 'greek', 'norse', 'celtic', 'egypt', 'china', 'aztec')),
  goal       bigint not null check (goal >= 0),
  from_ms    bigint not null,
  to_ms      bigint not null check (to_ms > from_ms),
  created_at timestamptz not null default now()
);

alter table public.alatyr_world enable row level security;
alter table public.alatyr_roads enable row level security;
revoke all on public.alatyr_world, public.alatyr_roads from anon, authenticated;
grant select (total, updated_at) on public.alatyr_world to anon, authenticated;
grant select (n, road, goal, from_ms, to_ms) on public.alatyr_roads to anon, authenticated;
drop policy if exists "alatyr_world: читают все" on public.alatyr_world;
create policy "alatyr_world: читают все" on public.alatyr_world for select to anon, authenticated using (true);
drop policy if exists "alatyr_roads: читают все" on public.alatyr_roads;
create policy "alatyr_roads: читают все" on public.alatyr_roads for select to anon, authenticated using (true);

-- +p_n осколков (1…10 за раз: больше за один запрос Ловчему не выпасть) → { total, prev }
create or replace function public.alatyr_add(p_n int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t bigint;
begin
  if p_n is null or p_n < 1 or p_n > 10 then return null; end if;
  insert into public.alatyr_world (id) values (1) on conflict (id) do nothing;
  update public.alatyr_world set total = total + p_n, updated_at = now() where id = 1 returning total into t;
  return jsonb_build_object('total', t, 'prev', t - p_n);
end $$;

-- дорога грани p_n распутана: событие с p_from по p_to (мс). true — записана сейчас, false — уже была
create or replace function public.alatyr_open(p_n int, p_road text, p_goal bigint, p_from bigint, p_to bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if p_n is null or p_n < 0 or p_from is null or p_to is null or p_to <= p_from or p_to - p_from > 14 * 86400000::bigint then return false; end if;
  insert into public.alatyr_roads (n, road, goal, from_ms, to_ms) values (p_n, p_road, greatest(0, coalesce(p_goal, 0)), p_from, p_to)
    on conflict (n) do nothing returning true into ok;
  return coalesce(ok, false);
end $$;

revoke all on function public.alatyr_add(int) from public, anon, authenticated;
revoke all on function public.alatyr_open(int, text, bigint, bigint, bigint) from public, anon, authenticated;
grant execute on function public.alatyr_add(int) to service_role;
grant execute on function public.alatyr_open(int, text, bigint, bigint, bigint) to service_role;

notify pgrst, 'reload schema';
