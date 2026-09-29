-- 4.28: кланы мифологий, часть 1 — схема. Выполнить в Supabase → SQL Editor обоих проектов (сначала тестовый, потом боевой)
-- ДО выкладки функции game с кланами мифологий. Повторный запуск безопасен.
--
-- Дружины (Сокол, Медведь, Волк) стали кланами мифологий: ключ клана = ключ мифологии ('slavic', 'greek', 'norse', 'celtic',
-- 'egypt', 'china', 'aztec', в сезоне 2 — 'japan' и т. д.; data.js, CLANS). Прежние дружины переходят в кланы
-- (data.js, CLAN_OLD): sokol → slavic, medved → celtic, volk → norse.
--
-- Эта миграция только РАСШИРЯЕТ проверки и ничего не переименовывает — её можно применить, пока работает прежняя функция game
-- и прежние клиенты (они пишут старые id, и старые id по-прежнему принимаются):
--   shrine_holds.clan        — любой ключ латиницей (старые id и все мифологии, в том числе будущих сезонов);
--   chat_messages.channel    — 'all', 'trade', 'raid', 'help' и 'clan:<ключ>' (clan:sokol… и clan:slavic…);
--   clan_key(id)             — ключ клана по любому id (старый → его мифология, остальное как есть);
--   shrine_defend(…)         — «своё Капище» сравнивает по clan_key: пока в базе есть Капища со старыми id, защитник
--                              клана 'slavic' встаёт к защитникам 'sokol' (и наоборот). Для прежней функции game ничего не меняется.
-- Перенос данных (sokol → slavic и т. п. в Капищах, чате и сохранениях) — 032_myth_clans_data.sql, сразу после выкладки.
-- До неё новая функция game понимает старые id сама (clanOf, clanIds в data.js).

-- ---------- ключ клана по любому id ----------
create or replace function public.clan_key(p text) returns text
language sql immutable set search_path = public as $$
  select case p when 'sokol' then 'slavic' when 'medved' then 'celtic' when 'volk' then 'norse' else p end;
$$;
revoke all on function public.clan_key(text) from public, anon, authenticated;
grant execute on function public.clan_key(text) to service_role;

-- ---------- Капища: клан — любая мифология ----------
-- прежняя проверка (без имени в 008: clan in ('sokol', 'medved', 'volk')) снимается по содержимому
do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where contype = 'c' and conrelid = 'public.shrine_holds'::regclass and pg_get_constraintdef(oid) like '%clan%'
  loop
    execute format('alter table public.shrine_holds drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.shrine_holds add constraint shrine_holds_clan_check check (clan ~ '^[a-z]{2,16}$');

-- ---------- чат: канал клана — любой мифологии ----------
-- прежняя проверка (без имени в 013: channel in ('all', …, 'clan:sokol', 'clan:medved', 'clan:volk')) — по содержимому
do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where contype = 'c' and conrelid = 'public.chat_messages'::regclass and pg_get_constraintdef(oid) like '%channel%'
  loop
    execute format('alter table public.chat_messages drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.chat_messages add constraint chat_messages_channel_check
  check (channel in ('all', 'trade', 'raid', 'help') or channel ~ '^clan:[a-z]{2,16}$');

-- ---------- поставить защитника: «свой клан» — по clan_key ----------
-- как в 023, но Капище старой дружины и её клан мифологии — одно знамя (пока 032 не перенесла id)
create or replace function public.shrine_defend(p_poi text, p_lat double precision, p_lng double precision, p_clan text, p_holder jsonb,
  p_cutoff bigint, p_max int)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.shrine_holds; live jsonb; n int;
begin
  insert into public.shrine_holds (poi_id, clan, lat, lng, holders) values (p_poi, p_clan, p_lat, p_lng, '[]')
    on conflict (poi_id) do nothing;
  select * into r from public.shrine_holds where poi_id = p_poi for update;
  select coalesce(jsonb_agg(h), '[]'::jsonb) into live from jsonb_array_elements(r.holders) h
   where coalesce((h->>'t')::bigint, 0) >= p_cutoff;
  n := jsonb_array_length(live);
  if n > 0 and public.clan_key(r.clan) <> public.clan_key(p_clan) then return false; end if;
  if n >= p_max then return false; end if;
  if live @> jsonb_build_array(jsonb_build_object('pid', p_holder->>'pid')) then return false; end if;
  update public.shrine_holds
     set clan = p_clan, holders = live || jsonb_build_array(p_holder), ver = r.ver + 1,
         since = case when n = 0 then now() else r.since end, updated_at = now()
   where poi_id = p_poi;
  return true;
end $$;
revoke all on function public.shrine_defend(text, double precision, double precision, text, jsonb, bigint, int) from public, anon, authenticated;
grant execute on function public.shrine_defend(text, double precision, double precision, text, jsonb, bigint, int) to service_role;

notify pgrst, 'reload schema';
