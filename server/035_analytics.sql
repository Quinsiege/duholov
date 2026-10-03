-- 5.1.22: своя аналитика игры — без сторонних сервисов (Firebase, AppMetrica, Amplitude…): события остаются на сервере
-- игры в России (152-ФЗ). Что хранится:
--   an_events   — события. Сервер игры (src 's', GameCore.anTrack): новый Ловчий (reg), первое место в Атласе (place), шаг
--                 обучения (tut: s — пройдено шагов из n), уровень (lvl), первые успехи (first: k — счётчик), шаг Кампании
--                 (camp: k — пройдено шагов), «начать заново» (reset). Телефон (src 'c', www/js/metrics.js): запуск (boot),
--                 карта готова (ready), шаги знакомства новичка (onb). Параметры — несколько чисел и коротких латинских строк.
--   an_sessions — сессии телефона: начало и сколько секунд игра была на экране (строку обновляют пачки телефона).
--   an_days     — дни активности Ловчих (по Москве): первый запрос дня к серверу игры — DAU и удержание по когортам.
-- Ни IP, ни User-Agent, ни имени, ни места: только id учётной записи, версия игры и грубая платформа (web/pwa/apk/play/
-- rustore — android/ios/desktop).
-- Пишет только сервер игры (функция game → an_put, ключ сервера). Читает владелец в панели модерации (вкладка «Аналитика»):
-- an_activity, an_retention, an_funnel, an_saves, an_saves_rows — только модератору со вторым фактором (is_admin(), как moderate).
-- Хранение: события и сессии — 90 дней, дни активности — 400 дней (an_cleanup — из ежедневной duholov_cleanup, cron).
-- Удаление учётной записи удаляет и её аналитику (внешние ключи on delete cascade) — и гостей без прогресса через 30 дней.
-- Выполнить на сервере игры: сначала тестовый контур (dt-db), потом бэкап (duholov-backup) и боевая база (supabase-db);
-- после — notify pgrst, 'reload schema'. Повторный запуск безопасен.
-- Пока миграции нет, игра работает как раньше: сервер молча не пишет события (одно предупреждение в журнал функции),
-- телефон перестаёт их слать до перезапуска, вкладка «Аналитика» просит применить этот файл.

/* ---------- таблицы ---------- */
create table if not exists public.an_events (
  id  bigint generated always as identity primary key,
  at  timestamptz not null default now(),
  uid uuid not null references auth.users (id) on delete cascade,
  ev  text not null check (ev ~ '^[a-z][a-z0-9_]{1,23}$'),
  src text not null check (src in ('s', 'c')),                 -- s — сервер игры, c — телефон
  p   jsonb check (p is null or (jsonb_typeof(p) = 'object' and pg_column_size(p) <= 1000)),
  v   text check (char_length(v) <= 20),                       -- версия игры
  pf  text check (char_length(pf) <= 20),                      -- платформа
  sid text check (char_length(sid) <= 24)                      -- сессия телефона
);
create index if not exists an_events_at on public.an_events using brin (at);   -- уборка и выборки по времени
create index if not exists an_events_ev on public.an_events (ev, at);          -- воронка
create index if not exists an_events_uid on public.an_events (uid, at);        -- удаление учётной записи, события игрока

create table if not exists public.an_sessions (
  uid     uuid not null references auth.users (id) on delete cascade,
  id      text not null check (id ~ '^[A-Za-z0-9_-]{8,24}$'),
  started timestamptz not null,
  last_at timestamptz not null default now(),
  dur     int not null default 0 check (dur between 0 and 86400),   -- секунд на экране
  v       text check (char_length(v) <= 20),
  pf      text check (char_length(pf) <= 20),
  primary key (uid, id)
);
create index if not exists an_sessions_started on public.an_sessions (started);

create table if not exists public.an_days (
  uid uuid not null references auth.users (id) on delete cascade,
  day date not null,                -- день по Москве
  reg date,                         -- день создания Ловчего (по Москве) — когорта
  lvl smallint,                     -- уровень и шаг обучения на первом запросе дня
  tut smallint,
  v   text check (char_length(v) <= 20),
  primary key (uid, day)
);
create index if not exists an_days_day on public.an_days (day);
create index if not exists an_days_reg on public.an_days (reg) where reg is not null;

alter table public.an_events enable row level security;     -- политик нет: доступ только у сервера и функций ниже
alter table public.an_sessions enable row level security;
alter table public.an_days enable row level security;
revoke all on public.an_events, public.an_sessions, public.an_days from anon, authenticated;

/* ---------- значения из jsonb без ошибок: не число — null ---------- */
create or replace function public.an_n(x jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(x) = 'number' then (x #>> '{}')::numeric end
$$;
create or replace function public.an_i(x jsonb, lo int, hi int) returns int
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(x) = 'number' then least(greatest(round((x #>> '{}')::numeric), lo), hi)::int end
$$;
-- миллисекунды с 1970 года → время
create or replace function public.an_ts(x jsonb) returns timestamptz
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(x) = 'number' then to_timestamp(least(greatest((x #>> '{}')::double precision, 0), 4102444800000) / 1000) end
$$;
revoke all on function public.an_n(jsonb), public.an_i(jsonb, int, int), public.an_ts(jsonb) from public, anon, authenticated;

/* ---------- запись: только сервер игры ----------
   p_src 's' | 'c'; p_ev — [{ e, t (мс), p, s }] (не больше 60); p_sess — { id, t0 (мс), d (секунд) }; p_day — { t, reg (мс),
   lvl, tut } — день активности (повтор за тот же день ничего не меняет). Время — не старше 3 суток и не из будущего.
   Сервер проверяет всё и сам (Metrics.clean), здесь — вторая проверка: мусор пропускается, а не роняет запись */
create or replace function public.an_put(p_uid uuid, p_src text, p_v text default null, p_pf text default null,
                                         p_ev jsonb default null, p_sess jsonb default null, p_day jsonb default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  n int := 0;
  v_lo timestamptz := now() - interval '3 days';
  v_hi timestamptz := now() + interval '5 minutes';
  v_v text := nullif(left(coalesce(p_v, ''), 20), '');
  v_pf text := nullif(left(coalesce(p_pf, ''), 20), '');
  v_t timestamptz;
begin
  if p_uid is null or p_src is null or p_src not in ('s', 'c') then return 0; end if;
  if jsonb_typeof(p_ev) = 'array' then
    insert into an_events (at, uid, ev, src, p, v, pf, sid)
    select case when public.an_ts(x.e->'t') between v_lo and v_hi then least(public.an_ts(x.e->'t'), now()) else now() end,
           p_uid, x.e->>'e', p_src,
           case when jsonb_typeof(x.e->'p') = 'object' and pg_column_size(x.e->'p') <= 600 then x.e->'p' end,
           v_v, v_pf,
           case when coalesce(x.e->>'s', '') ~ '^[A-Za-z0-9_-]{8,24}$' then x.e->>'s' end
      from jsonb_array_elements(p_ev) with ordinality as x(e, i)
     where x.i <= 60 and jsonb_typeof(x.e) = 'object' and coalesce(x.e->>'e', '') ~ '^[a-z][a-z0-9_]{1,23}$';
    get diagnostics n = row_count;
  end if;
  if jsonb_typeof(p_sess) = 'object' and coalesce(p_sess->>'id', '') ~ '^[A-Za-z0-9_-]{8,24}$' then
    v_t := public.an_ts(p_sess->'t0');
    if v_t is null or v_t < v_lo or v_t > v_hi then v_t := now(); end if;
    insert into an_sessions as s (uid, id, started, last_at, dur, v, pf)
    values (p_uid, p_sess->>'id', least(v_t, now()), now(), coalesce(public.an_i(p_sess->'d', 0, 86400), 0), v_v, v_pf)
    on conflict (uid, id) do update
      set last_at = now(), dur = greatest(s.dur, excluded.dur), v = coalesce(excluded.v, s.v), pf = coalesce(excluded.pf, s.pf);
  end if;
  if jsonb_typeof(p_day) = 'object' then
    v_t := public.an_ts(p_day->'t');
    if v_t is null or v_t < v_lo or v_t > v_hi then v_t := now(); end if;
    insert into an_days (uid, day, reg, lvl, tut, v)
    values (p_uid, (v_t at time zone 'Europe/Moscow')::date, (public.an_ts(p_day->'reg') at time zone 'Europe/Moscow')::date,
            public.an_i(p_day->'lvl', 0, 10000), public.an_i(p_day->'tut', 0, 10000), v_v)
    on conflict (uid, day) do nothing;
  end if;
  return n;
end $$;
revoke all on function public.an_put(uuid, text, text, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.an_put(uuid, text, text, text, jsonb, jsonb, jsonb) to service_role;

/* ---------- уборка: события и сессии — 90 дней, дни активности — 400 ---------- */
create or replace function public.an_cleanup() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb := '{}'; n int;
begin
  delete from an_events where at < now() - interval '90 days';        get diagnostics n = row_count; r := r || jsonb_build_object('an_events', n);
  delete from an_sessions where started < now() - interval '90 days'; get diagnostics n = row_count; r := r || jsonb_build_object('an_sessions', n);
  delete from an_days where day < (now() at time zone 'Europe/Moscow')::date - 400;
                                                                       get diagnostics n = row_count; r := r || jsonb_build_object('an_days', n);
  return r;
end $$;
revoke all on function public.an_cleanup() from public, anon, authenticated;
grant execute on function public.an_cleanup() to service_role;

-- ежедневная уборка (028_security.sql, п. 10) — та же, плюс аналитика (an_cleanup)
create or replace function public.duholov_cleanup() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb := '{}'; n int;
begin
  delete from gifts where opened_at < now() - interval '30 days';                   get diagnostics n = row_count; r := r || jsonb_build_object('gifts', n);
  delete from trades where taken_at < now() - interval '30 days';                   get diagnostics n = row_count; r := r || jsonb_build_object('trades', n);
  delete from auction_lots where status <> 'open' and settled and closed_at < now() - interval '30 days';
                                                                                    get diagnostics n = row_count; r := r || jsonb_build_object('lots', n);
  delete from raid_rooms where created_at < now() - interval '1 day';               get diagnostics n = row_count; r := r || jsonb_build_object('rooms', n);
  delete from chat_messages where created_at < now() - interval '7 days';           get diagnostics n = row_count; r := r || jsonb_build_object('chat', n);
  delete from shrine_holds where holders = '[]'::jsonb;                              get diagnostics n = row_count; r := r || jsonb_build_object('holds', n);
  delete from order_players where week < (select max(week) - 12 from order_players); get diagnostics n = row_count; r := r || jsonb_build_object('order', n);
  delete from transfer_codes where expires_at < now();                              get diagnostics n = row_count; r := r || jsonb_build_object('codes', n);
  delete from transfer_attempts where at < now() - interval '1 day';
  delete from save_locks where until < now() - interval '1 hour';
  delete from client_errors where at < now() - interval '14 days';                  get diagnostics n = row_count; r := r || jsonb_build_object('errors', n);
  -- 4.26: коды входа ботом — сутки; место и трек игрока, которого сервер не видел сутки, — не храним
  delete from tg_login where created_at < now() - interval '1 day';                 get diagnostics n = row_count; r := r || jsonb_build_object('tg_login', n);
  update save_srv set srv = srv - 'pos' - 'spd' where updated_at < now() - interval '1 day' and (srv ? 'pos' or srv ? 'spd');
                                                                                    get diagnostics n = row_count; r := r || jsonb_build_object('pos', n);
  delete from league_queue where seen < now() - interval '1 hour';
  -- журнал входов GoTrue (IP, браузер) — 90 дней
  delete from auth.audit_log_entries where created_at < now() - interval '90 days'; get diagnostics n = row_count; r := r || jsonb_build_object('audit', n);
  -- 5.1.22: аналитика (035_analytics.sql)
  r := r || public.an_cleanup();
  delete from auth.users u where u.is_anonymous and u.created_at < now() - interval '30 days'
    and not exists (select 1 from saves s where s.user_id = u.id);                  get diagnostics n = row_count; r := r || jsonb_build_object('empty_guests', n);
  return r;
end $$;
revoke all on function public.duholov_cleanup() from public, anon, authenticated;
grant execute on function public.duholov_cleanup() to service_role;

/* ---------- отчёты для панели модерации (www/js/admin.js, вкладка «Аналитика») ----------
   Только модератору со вторым фактором (is_admin()). Дни — по Москве. Отчёты читают только свои таблицы, сохранения
   (saves — уровень, шаг обучения, даты) и время первого входа гостей (auth.users) — без имён и почт. */

-- Активность за p_days дней: DAU (дни активности), новые Ловчие, сессии (сколько, медиана длины, секунд всего), WAU/MAU,
-- длина сессий (медиана, квартили, распределение) и платформы и версии игроков
create or replace function public.an_activity(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Moscow')::date;
  d0 date;
  t0 timestamptz;
begin
  if not public.is_admin() then raise exception 'Нет прав модератора'; end if;
  p_days := least(greatest(coalesce(p_days, 30), 1), 120);
  d0 := today - (p_days - 1);
  t0 := d0::timestamp at time zone 'Europe/Moscow';
  return jsonb_build_object(
    'today', today,
    'since', (select min(day) from an_days),
    'sesSince', (select min(started) from an_sessions),
    'days', (select coalesce(jsonb_agg(jsonb_build_object('d', g.d, 'dau', coalesce(a.dau, 0), 'new', coalesce(a.nw, 0),
                      'ses', coalesce(s.n, 0), 'su', coalesce(s.u, 0), 'med', s.med, 'sec', coalesce(s.sec, 0)) order by g.d), '[]'::jsonb)
               from (select d0 + i as d from generate_series(0, p_days - 1) i) g
               left join (select day, count(*) dau, count(*) filter (where reg = day) nw
                            from an_days where day >= d0 group by day) a on a.day = g.d
               left join (select (started at time zone 'Europe/Moscow')::date as day, count(*) n, count(distinct uid) u,
                                 percentile_cont(0.5) within group (order by dur) med, sum(dur) sec
                            from an_sessions where started >= t0 group by 1) s on s.day = g.d),
    'wau', (select count(distinct uid) from an_days where day > today - 7),
    'mau', (select count(distinct uid) from an_days where day > today - 30),
    'ses', (select jsonb_build_object('n', count(*), 'users', count(distinct uid), 'avg', round(avg(dur)),
                     'med', percentile_cont(0.5) within group (order by dur),
                     'p25', percentile_cont(0.25) within group (order by dur),
                     'p75', percentile_cont(0.75) within group (order by dur))
              from an_sessions where started >= t0),
    'hist', (select coalesce(jsonb_object_agg(h.b, h.n), '{}'::jsonb) from (
               select case when dur < 60 then 0 when dur < 180 then 1 when dur < 300 then 2 when dur < 600 then 3
                           when dur < 1200 then 4 when dur < 1800 then 5 when dur < 3600 then 6 else 7 end as b, count(*) n
                 from an_sessions where started >= t0 group by 1) h),
    'pf', (select coalesce(jsonb_object_agg(x.k, x.n), '{}'::jsonb) from (
             select coalesce(pf, '?') as k, count(distinct uid) n from an_sessions where started >= t0 group by 1) x),
    'ver', (select coalesce(jsonb_object_agg(x.k, x.n), '{}'::jsonb) from (
              select coalesce(v, '?') as k, count(distinct uid) n from an_sessions where last_at >= now() - interval '7 days' group by 1) x)
  );
end $$;

-- Удержание по когортам дня создания Ловчего (за p_days дней, но не раньше первого дня данных): размер когорты и сколько
-- из неё играли ровно на 1, 3, 7, 14 и 30-й день (день, который ещё не наступил, панель не показывает)
create or replace function public.an_retention(p_days int default 45) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Moscow')::date;
  d0 date;
begin
  if not public.is_admin() then raise exception 'Нет прав модератора'; end if;
  p_days := least(greatest(coalesce(p_days, 45), 1), 400);
  -- первый день данных неполный (сервер начал писать посреди дня) — когорты с дня после него
  d0 := greatest(today - p_days, (select min(day) + 1 from an_days));
  return jsonb_build_object('today', today, 'from', d0, 'rows', (
    select coalesce(jsonb_agg(jsonb_build_object('reg', c.reg, 'n', c.n, 'd1', c.d1, 'd3', c.d3, 'd7', c.d7, 'd14', c.d14, 'd30', c.d30)
                              order by c.reg desc), '[]'::jsonb)
      from (select y.reg, count(*) n, count(*) filter (where y.r1) d1, count(*) filter (where y.r3) d3, count(*) filter (where y.r7) d7,
                   count(*) filter (where y.r14) d14, count(*) filter (where y.r30) d30
              from (select x.reg,
                           exists (select 1 from an_days a where a.uid = x.uid and a.day = x.reg + 1) r1,
                           exists (select 1 from an_days a where a.uid = x.uid and a.day = x.reg + 3) r3,
                           exists (select 1 from an_days a where a.uid = x.uid and a.day = x.reg + 7) r7,
                           exists (select 1 from an_days a where a.uid = x.uid and a.day = x.reg + 14) r14,
                           exists (select 1 from an_days a where a.uid = x.uid and a.day = x.reg + 30) r30
                      from (select distinct uid, reg from an_days where reg >= d0 and reg <= today) x) y
             group by y.reg) c));
end $$;

-- Воронка новичка за p_days дней.
--   pre  — до создания Ловчего, от гостей, впервые открывших игру за период (анонимный вход при первом запуске): open,
--          onb:0 (стартовый экран), onb:book (книга-вступление), onb:2 (имя), reg. med — медиана секунд от первого запуска.
--   post — после, от создавших Ловчего за период: reg, onb:4 («Весь мир — твой»), onb:go («В путь»), place (место в Атласе),
--          tut:k (пройдено k шагов обучения), lvl:k (уровень k), camp:k (k шагов Кампании), d1 (вернулся на следующий день).
--          med — медиана секунд от создания Ловчего, in30 — дошли за первые 30 минут, nq — из тех, кто не вернулся
--          после дня регистрации (quit — их число среди создавших Ловчего больше двух суток назад, quitBase).
--   first — сколько минут новички провели в игре за первые сутки (по сессиям телефона): корзины 0: <1, 1: 1–3, 2: 3–5,
--          3: 5–10, 4: 10–20, 5: 20–30, 6: 30+; firstN — сколько новичков с сессиями (создали Ловчего больше суток назад)
create or replace function public.an_funnel(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t0 timestamptz;
begin
  if not public.is_admin() then raise exception 'Нет прав модератора'; end if;
  p_days := least(greatest(coalesce(p_days, 30), 1), 90);
  t0 := now() - make_interval(days => p_days);
  return (
    with
    e as materialized (
      select uid, ev, p, at from an_events
       where at >= t0 - interval '1 day' and ev in ('onb', 'reg', 'place', 'tut', 'lvl', 'camp')),
    g as materialized (select u.id as uid, u.created_at as t from auth.users u where u.created_at >= t0),
    r as materialized (select uid, min(at) as t from e where ev = 'reg' and at >= t0 group by uid),
    q as materialized (
      select r.uid from r where r.t < now() - interval '2 days'
         and not exists (select 1 from an_days d where d.uid = r.uid and d.day > (r.t at time zone 'Europe/Moscow')::date)),
    pre as (
      select g.uid, 'open'::text as k, g.t from g
      union all
      select e.uid, 'onb:' || (e.p->>'k'), min(e.at) from e join g using (uid)
       where e.ev = 'onb' and e.p->>'k' in ('0', 'book', '2') group by e.uid, e.p->>'k'
      union all
      select r.uid, 'reg', r.t from r join g using (uid)),
    post as (
      select r.uid, 'reg'::text as k, r.t from r
      union all
      select e.uid, 'onb:' || (e.p->>'k'), min(e.at) from e join r using (uid)
       where e.ev = 'onb' and e.p->>'k' in ('4', 'go') group by e.uid, e.p->>'k'
      union all
      select e.uid, 'place', min(e.at) from e join r using (uid) where e.ev = 'place' group by e.uid
      union all
      select e.uid, 'tut:' || k.k, min(e.at) from e join r using (uid) cross join generate_series(1, 40) as k(k)
       where e.ev = 'tut' and public.an_n(e.p->'s') >= k.k group by e.uid, k.k
      union all
      select e.uid, 'lvl:' || k.k, min(e.at) from e join r using (uid) cross join (values (2), (3), (5), (10), (15)) as k(k)
       where e.ev = 'lvl' and public.an_n(e.p->'l') >= k.k group by e.uid, k.k
      union all
      select e.uid, 'camp:' || k.k, min(e.at) from e join r using (uid) cross join (values (1), (3), (5), (9)) as k(k)
       where e.ev = 'camp' and public.an_n(e.p->'k') >= k.k group by e.uid, k.k
      union all
      select d.uid, 'd1', min(d.day::timestamp at time zone 'Europe/Moscow') from an_days d join r using (uid)
       where d.day = (r.t at time zone 'Europe/Moscow')::date + 1 group by d.uid),
    pre_agg as (
      select x.k, count(distinct x.uid) n, percentile_cont(0.5) within group (order by extract(epoch from x.t - g.t)::float8) med
        from pre x join g using (uid) group by x.k),
    post_agg as (
      select x.k, count(distinct x.uid) n, percentile_cont(0.5) within group (order by extract(epoch from x.t - r.t)::float8) med,
             count(distinct x.uid) filter (where x.t - r.t <= interval '30 minutes') in30,
             count(distinct x.uid) filter (where q.uid is not null) nq
        from post x join r using (uid) left join q using (uid) group by x.k),
    a as (
      select r.uid, sum(s.dur) sec from r join an_sessions s on s.uid = r.uid
         and s.started >= r.t - interval '1 hour' and s.started < r.t + interval '1 day'
       where r.t < now() - interval '1 day' group by r.uid)
    select jsonb_build_object(
      'from', t0,
      'guests', (select count(*) from g),
      'reg', (select count(*) from r),
      'quit', (select count(*) from q),
      'quitBase', (select count(*) from r where r.t < now() - interval '2 days'),
      'pre', coalesce((select jsonb_object_agg(k, jsonb_build_object('n', n, 'med', med)) from pre_agg), '{}'::jsonb),
      'post', coalesce((select jsonb_object_agg(k, jsonb_build_object('n', n, 'med', med, 'in30', in30, 'nq', nq)) from post_agg), '{}'::jsonb),
      'tutN', (select max(public.an_n(p->'n')) from e where ev = 'tut'),
      'tutIds', coalesce((select jsonb_object_agg(z.s, z.id) from (
                   select distinct on (public.an_n(p->'s')) public.an_n(p->'s') as s, p->>'id' as id
                     from e where ev = 'tut' and public.an_n(p->'s') is not null
                    order by public.an_n(p->'s'), at desc) z), '{}'::jsonb),
      'first', coalesce((select jsonb_object_agg(h.b, h.n) from (
                  select case when sec < 60 then 0 when sec < 180 then 1 when sec < 300 then 2 when sec < 600 then 3
                              when sec < 1200 then 4 when sec < 1800 then 5 else 6 end as b, count(*) n
                    from a group by 1) h), '{}'::jsonb),
      'firstN', (select count(*) from a))
  );
end $$;

-- Ретроспектива по сохранениям — картина сразу, ещё до накопления событий: дата создания Ловчего (data.created), последнее
-- сохранение (updated_at — последний запрос, менявший прогресс), шаг обучения (data.tut: номер текущего шага, 0 — пройдено),
-- уровень и шаг Кампании. Перенесённые на другое устройство сохранения не считаются.
--   tot   — всего Ловчих, активных за 1/7/30 дней, новых за 7/30 дней, прошедших обучение; guests30 — гостей за 30 дней,
--           так и не создавших Ловчего;
--   weeks — недели создания: сколько, прошли обучение, медиана уровня, активны за 7 дней и «возвращаемость» (rolling
--           retention): eN — сколько Ловчих могли дожить до дня N, rN — из них были в игре на N-й день или позже;
--   levels — уровни: всего и активных за p_idle дней (остальные — ушедшие);
--   idleTut / idleCamp — где остановились ушедшие (нет сохранений p_idle дней): шаг обучения (0 — пройдено) и шаг Кампании;
--   day0* — ушли в первые сутки (создали Ловчего больше двух суток назад, последнее сохранение — в первые 24 часа):
--           шаг обучения, уровень и сколько минут прошло от создания до последнего сохранения (корзины как у an_funnel, 6: 30–60,
--           7: 60+)
create or replace function public.an_saves(p_idle int default 7) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Moscow')::date;
  idle timestamptz;
begin
  if not public.is_admin() then raise exception 'Нет прав модератора'; end if;
  p_idle := least(greatest(coalesce(p_idle, 7), 1), 90);
  idle := now() - make_interval(days => p_idle);
  return (
    with
    s as materialized (
      select x.reg_at, (x.reg_at at time zone 'Europe/Moscow')::date as reg,
             sv.updated_at as last_at, (sv.updated_at at time zone 'Europe/Moscow')::date as lday,
             coalesce(public.an_i(j.level, 1, 1000), 1) as lvl, coalesce(public.an_i(j.tut, 0, 1000), 0) as tut,
             public.an_i(j.camp->'ch', 0, 1000) as ch, public.an_i(j.camp->'s', 0, 1000) as cs
        from saves sv
        cross join lateral jsonb_to_record(sv.data) as j(created jsonb, level jsonb, tut jsonb, camp jsonb)
        cross join lateral (select public.an_ts(j.created) as reg_at) x
       where sv.moved_to is null),
    tot as (
      select count(*) n,
             count(*) filter (where last_at >= now() - interval '1 day') a1,
             count(*) filter (where last_at >= now() - interval '7 days') a7,
             count(*) filter (where last_at >= now() - interval '30 days') a30,
             count(*) filter (where reg > today - 7) n7,
             count(*) filter (where reg > today - 30) n30,
             count(*) filter (where tut = 0) tdone,
             min(reg) as since
        from s),
    wk as (
      select date_trunc('week', reg::timestamp)::date as w, count(*) n,
             count(*) filter (where tut = 0) tdone,
             percentile_cont(0.5) within group (order by lvl) lvl,
             count(*) filter (where last_at >= now() - interval '7 days') a7,
             count(*) filter (where reg + 1 <= today) e1,   count(*) filter (where reg + 1 <= today and lday - reg >= 1) r1,
             count(*) filter (where reg + 3 <= today) e3,   count(*) filter (where reg + 3 <= today and lday - reg >= 3) r3,
             count(*) filter (where reg + 7 <= today) e7,   count(*) filter (where reg + 7 <= today and lday - reg >= 7) r7,
             count(*) filter (where reg + 14 <= today) e14, count(*) filter (where reg + 14 <= today and lday - reg >= 14) r14,
             count(*) filter (where reg + 30 <= today) e30, count(*) filter (where reg + 30 <= today and lday - reg >= 30) r30
        from s where reg is not null
       group by 1 order by 1 desc limit 52),
    d0 as (select * from s where reg_at < now() - interval '2 days' and last_at < reg_at + interval '1 day')
    select jsonb_build_object(
      'today', today, 'idle', p_idle,
      'tot', (select to_jsonb(tot) from tot),
      'guests30', (select count(*) from auth.users u where u.is_anonymous and u.created_at >= now() - interval '30 days'
                      and not exists (select 1 from saves x where x.user_id = u.id)),
      'weeks', coalesce((select jsonb_agg(to_jsonb(wk) order by wk.w desc) from wk), '[]'::jsonb),
      'levels', coalesce((select jsonb_agg(jsonb_build_object('l', z.lvl, 'n', z.n, 'act', z.act) order by z.lvl) from (
                   select lvl, count(*) n, count(*) filter (where last_at >= idle) act from s group by lvl) z), '[]'::jsonb),
      'idleTut', coalesce((select jsonb_object_agg(z.tut, z.n) from (
                    select tut, count(*) n from s where last_at < idle group by tut) z), '{}'::jsonb),
      'idleCamp', coalesce((select jsonb_agg(jsonb_build_object('ch', z.ch, 's', z.cs, 'n', z.n) order by z.ch nulls first, z.cs nulls first) from (
                     select ch, cs, count(*) n from s where last_at < idle and tut = 0 group by ch, cs) z), '[]'::jsonb),
      'day0', (select count(*) from d0),
      'day0Base', (select count(*) from s where reg_at < now() - interval '2 days'),
      'day0Tut', coalesce((select jsonb_object_agg(z.tut, z.n) from (select tut, count(*) n from d0 group by tut) z), '{}'::jsonb),
      'day0Lvl', coalesce((select jsonb_object_agg(z.lvl, z.n) from (select lvl, count(*) n from d0 group by lvl) z), '{}'::jsonb),
      'day0Min', coalesce((select jsonb_object_agg(z.b, z.n) from (
                    select case when m < 1 then 0 when m < 3 then 1 when m < 5 then 2 when m < 10 then 3 when m < 20 then 4
                                when m < 30 then 5 when m < 60 then 6 else 7 end as b, count(*) n
                      from (select extract(epoch from last_at - reg_at)::float8 / 60 as m from d0) y group by 1) z), '{}'::jsonb))
  );
end $$;

-- Сохранения построчно (для выгрузки CSV в панели): создание, последнее сохранение, уровень, шаг обучения, Кампания,
-- поймано духов, версия игры. Без имён и id — p_limit самых новых Ловчих
create or replace function public.an_saves_rows(p_limit int default 5000) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Нет прав модератора'; end if;
  p_limit := least(greatest(coalesce(p_limit, 5000), 1), 20000);
  return (
    select coalesce(jsonb_agg(jsonb_build_object('reg', z.reg_at, 'last', z.updated_at, 'lvl', z.lvl, 'tut', z.tut, 'ch', z.ch, 's', z.cs,
                                                 'caught', z.caught, 'v', z.v) order by z.reg_at desc nulls last), '[]'::jsonb)
      from (select public.an_ts(j.created) as reg_at, sv.updated_at, sv.app_version as v,
                   coalesce(public.an_i(j.level, 1, 1000), 1) as lvl, coalesce(public.an_i(j.tut, 0, 1000), 0) as tut,
                   public.an_i(j.camp->'ch', 0, 1000) as ch, public.an_i(j.camp->'s', 0, 1000) as cs,
                   public.an_i(j.stats->'caught', 0, 1000000000) as caught
              from saves sv
              cross join lateral jsonb_to_record(sv.data) as j(created jsonb, level jsonb, tut jsonb, camp jsonb, stats jsonb)
             where sv.moved_to is null
             order by 1 desc nulls last
             limit p_limit) z
  );
end $$;

revoke all on function public.an_activity(int), public.an_retention(int), public.an_funnel(int), public.an_saves(int),
  public.an_saves_rows(int) from public, anon;
grant execute on function public.an_activity(int), public.an_retention(int), public.an_funnel(int), public.an_saves(int),
  public.an_saves_rows(int) to authenticated;
