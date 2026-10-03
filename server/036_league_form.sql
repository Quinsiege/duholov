-- 5.1.37: Лига — подбор соперника по форме дня. Выполнить в Supabase → SQL Editor (или psql на своём сервере): сначала
-- тестовый контур, потом боевой. Повторный запуск безопасен. Подпись league_find не меняется — совместима и с прежней
-- функцией game (её заявки без формы дня подбираются как раньше), и с новой; порядок выкладки любой.
--
-- Форма дня — доля побед Ловчего в сегодняшних боях Лиги (не больше 10 боёв — жетонов в день), сглаженная:
-- (побед + 1) / (побед + поражений + 2): без боёв — 0,5; 2 победы из 5 — 0,43; 5 из 5 — 0,86. Её и допуск считает
-- сервер игры и кладёт в заявку: info.day = { w, l, f — форма, t — допуск }. Допуск растёт со временем ожидания
-- (League.formTol: первые 3 с — 0,15, до 6 с — 0,3, потом — любая форма), чтобы живой соперник успел найтись раньше
-- Ловчего Ордена (бот — через 10 с).
-- Пара — только если разница форм не больше допуска обоих (как и окна рейтинга — взаимно). Среди подходящих — сначала
-- ближе по форме (шагами по 0,1), потом по рейтингу, потом кто дольше ждёт. Заявка без info.day — форма 0,5, допуск — любой.

create or replace function public.league_find(p_uid uuid, p_pid text, p_season text, p_rating int, p_lo int, p_hi int,
  p_info jsonb, p_avoid text, p_wide boolean, p_now bigint default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m uuid; me public.league_queue; o public.league_queue; n int;
  mf numeric := coalesce((p_info #>> '{day,f}')::numeric, 0.5);
  mt numeric := coalesce((p_info #>> '{day,t}')::numeric, 1);
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
  -- соперник: свободен, на связи, того же сезона; взаимно попадаем в окна рейтинга друг друга; разница форм дня — в
  -- допуске обоих; ближе по форме, потом по рейтингу, при равенстве — кто дольше ждёт. Занятые строки пропускаем
  select * into o from league_queue q
   where q.user_id <> p_uid and q.match_id is null and q.season = p_season
     and q.seen > now() - interval '8 seconds'
     and q.rating between p_lo and p_hi and p_rating between q.lo and q.hi
     and (p_wide or ((p_avoid is null or q.pid <> p_avoid) and (q.avoid is null or q.avoid <> p_pid)))
     and abs(coalesce((q.info #>> '{day,f}')::numeric, 0.5) - mf) <= least(coalesce((q.info #>> '{day,t}')::numeric, 1), mt) + 0.0001
   order by round(abs(coalesce((q.info #>> '{day,f}')::numeric, 0.5) - mf) * 10), abs(q.rating - p_rating), q.since
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

notify pgrst, 'reload schema';
