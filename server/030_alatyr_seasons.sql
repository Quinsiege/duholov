-- 4.28: сезоны Алатыря. Выполнить в Supabase → SQL Editor обоих проектов (сначала тестовый, потом боевой) ДО выкладки
-- функции game с сезонами. Повторный запуск безопасен. Совместима с прежней функцией 4.28 (029): alatyr_add и alatyr_open
-- не меняются, новые таблица и функции ей не мешают; ключи сезона Лиги 'ГГГГ-ММ' по-прежнему принимаются.
--
-- Сезон s: камень — 6 + s граней (по одной на открытую мифологию), грани и их цены считает сервер игры по
-- Rules.ALATYR_WORLD (www/js/rules.js). Собраны все грани — финал: FINALE.DAYS дней во всех Разломах Кощей, победы над ним
-- считаются здесь. Орден одолел его goal раз — Кощей раскалывает камень раньше (с ближайшего полного часа), иначе — в конце
-- финала. Раскол открывает сезон s + 1: новая мифология и новый сезон Лиги (ключ 'A<сезон>').
--
-- alatyr_seasons — строка на сезон: start_total — общий счёт осколков (alatyr_world.total) на начало сезона (грани сезона
--                  считаются от него), from_ms — начало (мс UTC; у первого — время миграции), finale_from/finale_to — финал,
--                  kills/goal — победы над Кощеем и цель, broken_ms — раскол (с него идёт сезон s + 1).
--   alatyr_finale(s, from, to, goal) — все грани сезона s собраны: записать финал; повтор ничего не меняет (false);
--   alatyr_kill(s, n, now)           — атомарно +n побед над Кощеем, пока финал сезона s идёт → { kills, prev, goal } или null;
--                                      раскол по цели назначает тот запрос, что перешагнул goal (prev < goal ≤ kills);
--   alatyr_break(s, at)              — раскол: сезон s кончается в at (не позже конца финала), тут же пишется строка сезона
--                                      s + 1 со счётом камня на этот момент; повтор ничего не меняет (false).
-- Писать может только сервер игры (service_role). Читать сезоны могут все (anon, authenticated) — только эти поля.
--
-- Ещё: alatyr_roads.road — любая мифология (ключ латиницей), не только первые семь; сезон Лиги (league_scores,
-- league_queue) — 'ГГГГ-ММ' (до 4.28) или 'A<номер>' (сезоны Алатыря).

create table if not exists public.alatyr_seasons (
  season      int primary key check (season >= 1),
  start_total bigint not null default 0 check (start_total >= 0),
  from_ms     bigint not null,
  finale_from bigint,
  finale_to   bigint,
  kills       bigint not null default 0 check (kills >= 0),
  goal        bigint not null default 0 check (goal >= 0),
  broken_ms   bigint,
  created_at  timestamptz not null default now(),
  check (finale_to is null or (finale_from is not null and finale_to > finale_from))
);
-- первый сезон — с нуля: грани 4.28 до сезонов (029) — это и есть его грани (сквозные номера 0…6)
insert into public.alatyr_seasons (season, start_total, from_ms)
  values (1, 0, floor(extract(epoch from now()) * 1000)::bigint) on conflict (season) do nothing;

alter table public.alatyr_seasons enable row level security;
revoke all on public.alatyr_seasons from anon, authenticated;
grant select (season, start_total, from_ms, finale_from, finale_to, kills, goal, broken_ms) on public.alatyr_seasons to anon, authenticated;
drop policy if exists "alatyr_seasons: читают все" on public.alatyr_seasons;
create policy "alatyr_seasons: читают все" on public.alatyr_seasons for select to anon, authenticated using (true);

-- дороги — любой мифологии (новые приходят с сезонами)
alter table public.alatyr_roads drop constraint if exists alatyr_roads_road_check;
alter table public.alatyr_roads add constraint alatyr_roads_road_check check (road ~ '^[a-z]{2,16}$');

-- сезон Лиги: 'ГГГГ-ММ' (до 4.28) или 'A<номер>'. Прежние проверки (без имени в 022 и supabase.sql) снимаются по содержимому
do $$
declare c record;
begin
  for c in select conrelid::regclass as t, conname from pg_constraint
            where contype = 'c' and conrelid in ('public.league_scores'::regclass, 'public.league_queue'::regclass)
              and pg_get_constraintdef(oid) like '%season%~%'
  loop
    execute format('alter table %s drop constraint %I', c.t, c.conname);
  end loop;
end $$;
alter table public.league_scores add constraint league_scores_season_check check (season ~ '^(\d{4}-\d{2}|A\d{1,4})$');
alter table public.league_queue add constraint league_queue_season_check check (season ~ '^(\d{4}-\d{2}|A\d{1,4})$');

-- все грани сезона p_season собраны: финал с p_from по p_to (мс). true — записан сейчас, false — уже был (или сезон расколот)
create or replace function public.alatyr_finale(p_season int, p_from bigint, p_to bigint, p_goal bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if p_season is null or p_season < 1 or p_from is null or p_to is null or p_to <= p_from or p_to - p_from > 30 * 86400000::bigint then return false; end if;
  update public.alatyr_seasons set finale_from = p_from, finale_to = p_to, goal = greatest(1, coalesce(p_goal, 1))
   where season = p_season and finale_from is null and broken_ms is null
  returning true into ok;
  return coalesce(ok, false);
end $$;

-- +p_n побед над Кощеем в финале сезона p_season (p_now — часы сервера игры, мс; бой мог начаться в финале и кончиться
-- чуть позже — запас 15 минут) → { kills, prev, goal } или null (финала нет, он не начался или давно кончился)
create or replace function public.alatyr_kill(p_season int, p_n int, p_now bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k bigint; g bigint;
begin
  if p_n is null or p_n < 1 or p_n > 3 or p_now is null then return null; end if;
  update public.alatyr_seasons set kills = kills + p_n
   where season = p_season and finale_from is not null
     and p_now >= finale_from - 900000 and p_now < coalesce(broken_ms, finale_to) + 900000
  returning kills, goal into k, g;
  if k is null then return null; end if;
  return jsonb_build_object('kills', k, 'prev', k - p_n, 'goal', g);
end $$;

-- раскол: сезон p_season кончается в p_at (мс; не раньше начала финала и не позже его конца), с этого момента — сезон
-- p_season + 1 со счётом камня на сейчас. true — записано сейчас, false — уже было (или финала нет)
create or replace function public.alatyr_break(p_season int, p_at bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare b bigint; t bigint;
begin
  if p_season is null or p_season < 1 or p_at is null then return false; end if;
  update public.alatyr_seasons set broken_ms = least(greatest(p_at, finale_from), finale_to)
   where season = p_season and finale_from is not null and broken_ms is null
  returning broken_ms into b;
  if b is null then return false; end if;
  select total into t from public.alatyr_world where id = 1;
  insert into public.alatyr_seasons (season, start_total, from_ms) values (p_season + 1, coalesce(t, 0), b)
    on conflict (season) do nothing;
  return true;
end $$;

revoke all on function public.alatyr_finale(int, bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.alatyr_kill(int, int, bigint) from public, anon, authenticated;
revoke all on function public.alatyr_break(int, bigint) from public, anon, authenticated;
grant execute on function public.alatyr_finale(int, bigint, bigint, bigint) to service_role;
grant execute on function public.alatyr_kill(int, int, bigint) to service_role;
grant execute on function public.alatyr_break(int, bigint) to service_role;

notify pgrst, 'reload schema';
