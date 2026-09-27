-- 4.16: Лига — бои с живыми Ловчими в реальном времени (вместо турнира с соперниками-машинами).
-- Выполнить в Supabase → SQL Editor обоих проектов ДО обновления функции game. Повторный запуск безопасен.
--
-- league_queue   — кто сейчас ищет соперника: рейтинг, окно поиска (lo..hi — кого готов принять; его считает сервер игры
--                  по времени ожидания), заявка (имя, облик, лига, сила и бойцы — сервер игры считает их из сохранения),
--                  когда игрок последний раз спрашивал (seen: молчит дольше 8 с — в пару не попадает).
-- league_matches — бой двух Ловчих: состояние (state — ведёт только сервер игры, GameCore.pvp), версия для записи без
--                  гонок, итог (status = 'done') и отметки «итог засчитан в прогресс» у каждой стороны.
-- league_find    — встать в очередь (или обновить заявку) и атомарно найти пару. Своя строка блокируется, соперник
--                  выбирается FOR UPDATE SKIP LOCKED: двое не заберут одного соперника, никто не окажется в двух боях.
--                  Пара — только взаимная: соперник в моём окне, я — в его. Только живые игроки, ботов нет.
-- league_put     — записать бой, только если версия не изменилась (иначе сервер перечитает бой и повторит ход);
--                  при итоге — сразу новые рейтинг и лига обоим в таблице сезона (у кого есть строка).
-- Доставка: база сама рассылает каждое изменение боя обоим — Realtime broadcast в личные закрытые каналы
-- league:<user_id> (realtime.send). Читать канал может только его хозяин (политика на realtime.messages); писать
-- в каналы телефоны не могут вовсе (политики на запись нет) — подделать ход соперника через Realtime нельзя.
-- Если Realtime старый (без закрытых каналов и realtime.send) — рассылка молча пропускается, телефоны опрашивают сервер.
-- Телефону таблицы недоступны: всё — через сервер игры (service_role).

create table if not exists public.league_queue (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  pid      text not null,
  season   text not null check (season ~ '^\d{4}-\d{2}$'),
  rating   int  not null check (rating between 0 and 20000),
  lo       int  not null,
  hi       int  not null,
  info     jsonb not null,
  avoid    text,                              -- код прошлого соперника: сразу снова в пару не ставим (кроме долгого ожидания)
  since    timestamptz not null default now(),
  seen     timestamptz not null default now(),
  match_id uuid
);
create index if not exists league_queue_find on public.league_queue (season, rating) where match_id is null;

create table if not exists public.league_matches (
  id         uuid primary key default gen_random_uuid(),
  season     text not null,
  a_uid      uuid not null references auth.users (id) on delete cascade,
  b_uid      uuid not null references auth.users (id) on delete cascade,
  ver        int  not null default 0,
  state      jsonb not null,
  status     text not null default 'live' check (status in ('live', 'done')),
  a_settled  boolean not null default false,
  b_settled  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists league_matches_a on public.league_matches (a_uid, status);
create index if not exists league_matches_b on public.league_matches (b_uid, status);
create index if not exists league_matches_old on public.league_matches (created_at);

alter table public.league_queue enable row level security;   -- политик нет: доступ только у сервера
alter table public.league_matches enable row level security;
revoke all on public.league_queue, public.league_matches from anon, authenticated;

-- Встать в очередь и найти пару. Ответ: { match } — бой (новый или уже идущий), или { wait, n } — ждём (n — сколько
-- Ловчих сейчас в поиске этого сезона). p_now — часы сервера игры (мс): от них считается начало боя.
create or replace function public.league_find(p_uid uuid, p_pid text, p_season text, p_rating int, p_lo int, p_hi int,
  p_info jsonb, p_avoid text, p_wide boolean, p_now bigint default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m uuid; me public.league_queue; o public.league_queue; n int;
begin
  -- уже в бою — вернуть его (телефон мог не узнать о паре)
  select id into m from league_matches where status = 'live' and (a_uid = p_uid or b_uid = p_uid) order by created_at desc limit 1;
  if m is not null then return jsonb_build_object('match', m); end if;
  -- изредка — уборка: брошенные заявки и старые бои
  if random() < 0.01 then
    delete from league_queue where seen < now() - interval '1 hour';
    delete from league_matches where created_at < now() - interval '30 days';
  end if;
  -- заявка: время ожидания сохраняется, пока игрок спрашивает (перерыв дольше 15 с — ожидание сначала).
  -- Пока эту строку держит чужой поиск, ждём его; если он успел поставить нас в пару — заявку не трогаем
  insert into league_queue as q (user_id, pid, season, rating, lo, hi, info, avoid, since, seen, match_id)
  values (p_uid, p_pid, p_season, p_rating, p_lo, p_hi, p_info, p_avoid, now(), now(), null)
  on conflict (user_id) do update set pid = excluded.pid, season = excluded.season, rating = excluded.rating, lo = excluded.lo, hi = excluded.hi,
    info = excluded.info, avoid = excluded.avoid, seen = now(), match_id = null,
    since = case when q.match_id is not null or q.seen < now() - interval '15 seconds' then now() else q.since end
  where q.match_id is null or not exists (select 1 from league_matches x where x.id = q.match_id and x.status = 'live');
  select * into me from league_queue where user_id = p_uid for update;
  if me.match_id is not null and exists (select 1 from league_matches x where x.id = me.match_id and x.status = 'live') then
    return jsonb_build_object('match', me.match_id);
  end if;
  -- соперник: свободен, на связи, того же сезона; взаимно попадаем в окна друг друга; ближайший по рейтингу,
  -- при равенстве — кто дольше ждёт. Чужие строки, занятые другим поиском, пропускаем (SKIP LOCKED)
  select * into o from league_queue q
   where q.user_id <> p_uid and q.match_id is null and q.season = p_season
     and q.seen > now() - interval '8 seconds'
     and q.rating between p_lo and p_hi and p_rating between q.lo and q.hi
     and (p_wide or ((p_avoid is null or q.pid <> p_avoid) and (q.avoid is null or q.avoid <> p_pid)))
   order by abs(q.rating - p_rating), q.since
   limit 1
   for update skip locked;
  if not found then
    select count(*) into n from league_queue where season = p_season and match_id is null and seen > now() - interval '8 seconds';
    return jsonb_build_object('wait', true, 'n', n);
  end if;
  insert into league_matches (season, a_uid, b_uid, state)
  values (p_season, o.user_id, p_uid, jsonb_build_object('init', true, 'season', p_season,
    'at', coalesce(p_now, floor(extract(epoch from clock_timestamp()) * 1000)::bigint), 'a', o.info, 'b', p_info))
  returning id into m;
  update league_queue set match_id = m where user_id in (p_uid, o.user_id);
  return jsonb_build_object('match', m);
end $$;

-- Отменить поиск. Если пара уже составлена — отменять поздно: { match } (бой начинается)
create or replace function public.league_cancel(p_uid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.league_queue;
begin
  delete from league_queue q where q.user_id = p_uid
     and (q.match_id is null or not exists (select 1 from league_matches x where x.id = q.match_id and x.status = 'live'));
  select * into r from league_queue where user_id = p_uid;
  if found then return jsonb_build_object('match', r.match_id); end if;
  return '{}'::jsonb;
end $$;

-- Записать бой (ход, итог). Возвращает новую версию или null (бой уже изменился или закончен)
create or replace function public.league_put(p_id uuid, p_ver int, p_state jsonb, p_done boolean)
returns int language plpgsql security definer set search_path = public as $$
declare m public.league_matches;
begin
  update league_matches set state = p_state, ver = ver + 1, updated_at = now(), status = case when p_done then 'done' else 'live' end
   where id = p_id and ver = p_ver and status = 'live'
  returning * into m;
  if not found then return null; end if;
  if p_done then
    delete from league_queue where match_id = p_id;
    -- таблица сезона — сразу обоим (у кого есть строка): рейтинг и лига из итога боя; прогресс каждого догонит её сам
    update league_scores s set rating = x.pts, stars = least(1000, x.pts / 100), rank = x.rk, updated_at = now()
      from (values (m.a_uid, (p_state #>> '{over,d,a,pts}')::int, (p_state #>> '{over,d,a,rank}')::int),
                   (m.b_uid, (p_state #>> '{over,d,b,pts}')::int, (p_state #>> '{over,d,b,rank}')::int)) as x(uid, pts, rk)
     where s.user_id = x.uid and s.season = m.season and x.pts between 0 and 20000 and x.rk between 0 and 9;
  end if;
  return m.ver;
end $$;

-- Итог засчитан в прогресс игрока (повторный зачёт исключает и сам прогресс — номер боя хранится в нём)
create or replace function public.league_settled(p_id uuid, p_uid uuid)
returns void language sql security definer set search_path = public as $$
  update public.league_matches set a_settled = a_settled or a_uid = p_uid, b_settled = b_settled or b_uid = p_uid
   where id = p_id and status = 'done';
$$;

-- Рассылка: новый бой («found») и каждое его изменение («pvp») — обоим в личные каналы league:<user_id>
create or replace function public.league_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare msg jsonb; ev text;
begin
  msg := jsonb_build_object('id', new.id, 'ver', new.ver, 'st', new.state);
  ev := case when tg_op = 'INSERT' then 'found' else 'pvp' end;
  begin
    perform realtime.send(msg, ev, 'league:' || new.a_uid::text, true);
    perform realtime.send(msg, ev, 'league:' || new.b_uid::text, true);
  exception when others then null; -- Realtime без закрытых каналов: телефоны узнают о бое опросом
  end;
  return null;
end $$;
drop trigger if exists league_push on public.league_matches;
create trigger league_push after insert or update of state on public.league_matches
  for each row execute function public.league_push();

-- Закрытые каналы Realtime: слушать league:<user_id> может только сам игрок; писать в них — никто, кроме базы
do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists "league: свой канал" on realtime.messages';
    execute $p$create policy "league: свой канал" on realtime.messages for select to authenticated
      using (realtime.topic() = 'league:' || (select auth.uid())::text and realtime.messages.extension = 'broadcast')$p$;
  end if;
end $$;

revoke all on function public.league_find(uuid, text, text, int, int, int, jsonb, text, boolean, bigint) from public, anon, authenticated;
revoke all on function public.league_cancel(uuid) from public, anon, authenticated;
revoke all on function public.league_put(uuid, int, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.league_settled(uuid, uuid) from public, anon, authenticated;
revoke all on function public.league_push() from public, anon, authenticated;
grant execute on function public.league_find(uuid, text, text, int, int, int, jsonb, text, boolean, bigint) to service_role;
grant execute on function public.league_cancel(uuid) to service_role;
grant execute on function public.league_put(uuid, int, jsonb, boolean) to service_role;
grant execute on function public.league_settled(uuid, uuid) to service_role;
