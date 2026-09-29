-- 5.x: цена граней Алатыря растёт с числом активных Ловчих. Выполнить в Supabase → SQL Editor обоих проектов (сначала
-- тестовый, потом боевой) ДО выкладки функции game с ценами граней. Повторный запуск безопасен. Совместима с функцией 5.0.0:
-- она этих таблицы и функций не знает и считает грани по базовым ценам, как прежде.
--
-- Цена грани = базовая цена (Rules.alaGoal, www/js/rules.js) × (1 + 0,1 × N), N — Ловчие 20+ уровня, игравшие за последние
-- 14 дней; не дороже 2 × цены предыдущей грани и не дешевле базовой (Rules.alaPriceNew). Цена фиксируется, когда грань
-- открывается (собрана предыдущая или начался сезон; первая грань — при первом запуске новой функции), и больше не меняется.
--
-- alatyr_goals        — зафиксированные цены: n — сквозной номер грани (Rules.alaBase), goal — цена в осколках, players — N,
--                       mul — множитель, created_at — когда зафиксирована.
--   alatyr_goal(n, goal, players, mul) — записать цену грани n, если её ещё нет (первый записавший побеждает);
--                                        → цена, что лежит в базе (своя или записанная раньше);
--   alatyr_active(level, days)          — сколько Ловчих уровня level+ играли за последние days дней (сохранение не перенесено;
--                                        активность — последний запрос к серверу игры: save_srv.updated_at, иначе saves.updated_at).
-- Писать и считать может только сервер игры (service_role). Читать цены могут все (anon, authenticated) — только эти поля.

create table if not exists public.alatyr_goals (
  n          int primary key check (n >= 0),
  goal       bigint not null check (goal > 0),
  players    int not null default 0 check (players >= 0),
  mul        numeric(8, 3) not null default 1 check (mul >= 1),
  created_at timestamptz not null default now()
);

alter table public.alatyr_goals enable row level security;
revoke all on public.alatyr_goals from anon, authenticated;
grant select (n, goal, players, mul, created_at) on public.alatyr_goals to anon, authenticated;
drop policy if exists "alatyr_goals: читают все" on public.alatyr_goals;
create policy "alatyr_goals: читают все" on public.alatyr_goals for select to anon, authenticated using (true);

-- цена грани p_n: записать, если её ещё нет → цена в базе
create or replace function public.alatyr_goal(p_n int, p_goal bigint, p_players int, p_mul numeric) returns bigint
language plpgsql security definer set search_path = public as $$
declare g bigint;
begin
  if p_n is null or p_n < 0 or p_goal is null or p_goal < 1 or p_goal > 100000000 then return null; end if;
  insert into public.alatyr_goals (n, goal, players, mul)
    values (p_n, p_goal, greatest(0, coalesce(p_players, 0)), greatest(1, least(1000, coalesce(p_mul, 1))))
    on conflict (n) do nothing;
  select goal into g from public.alatyr_goals where n = p_n;
  return g;
end $$;

-- сколько Ловчих уровня p_level+ играли за последние p_days дней
create or replace function public.alatyr_active(p_level int default 20, p_days int default 14) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int
    from public.saves s
    left join public.save_srv v on v.user_id = s.user_id
   where s.moved_to is null
     and coalesce(v.updated_at, s.updated_at) > now() - make_interval(days => greatest(1, least(365, coalesce(p_days, 14))))
     and case when s.data->>'level' ~ '^\d{1,4}$' then (s.data->>'level')::int else 0 end >= coalesce(p_level, 20);
$$;

revoke all on function public.alatyr_goal(int, bigint, int, numeric) from public, anon, authenticated;
revoke all on function public.alatyr_active(int, int) from public, anon, authenticated;
grant execute on function public.alatyr_goal(int, bigint, int, numeric) to service_role;
grant execute on function public.alatyr_active(int, int) to service_role;

notify pgrst, 'reload schema';
