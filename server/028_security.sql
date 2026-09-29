-- 4.26: исправления по аудиту безопасности. Повторный запуск безопасен. Совместима с функцией game 4.25 (прежняя версия
-- продолжает работать), поэтому применять можно до выкладки новой функции: сначала dt-db, затем бэкап и supabase-db.

/* ---------- 1. Перенос прогресса: без гонки с действием на старом устройстве (дюп духов и предметов) ----------
   claim_transfer не ждал замка игрока и не менял версию прогресса источника: если перенос успевал между записью лота
   (или подарка) и сохранением прогресса, дух оставался и в лоте, и в перенесённой копии. Теперь перенос берёт замки
   обоих игроков (как game_begin) и повышает rev источника, а game_commit не пишет в перенесённый прогресс. */
create or replace function public.claim_transfer(p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  raw text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  src uuid; d jsonb; cur_rev int; tok uuid := gen_random_uuid(); got boolean;
begin
  if auth.uid() is null then return jsonb_build_object('error', 'Нет входа'); end if;
  delete from public.transfer_attempts where at < now() - interval '1 day';
  if (select count(*) from public.transfer_attempts where user_id = auth.uid() and at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('error', 'Слишком много неверных кодов — попробуй через час');
  end if;
  select user_id into src from public.transfer_codes
    where code_hash = encode(digest(raw, 'sha256'), 'hex') and expires_at > now();
  if src is null then
    insert into public.transfer_attempts (user_id) values (auth.uid());
    return jsonb_build_object('error', 'Код не найден или устарел');
  end if;
  if src = auth.uid() then return jsonb_build_object('error', 'Это код этого же устройства'); end if;
  -- замки обоих игроков: пока на одном из устройств идёт действие, переносить нельзя
  insert into public.save_locks as l (user_id, token, until) values (src, tok, now() + interval '30 seconds')
    on conflict (user_id) do update set token = excluded.token, until = excluded.until where l.until < now()
    returning true into got;
  if got is null then return jsonb_build_object('error', 'На старом устройстве идёт действие — повтори через минуту'); end if;
  got := null;
  insert into public.save_locks as l (user_id, token, until) values (auth.uid(), tok, now() + interval '30 seconds')
    on conflict (user_id) do update set token = excluded.token, until = excluded.until where l.until < now()
    returning true into got;
  if got is null then
    delete from public.save_locks where user_id = src and token = tok;
    return jsonb_build_object('error', 'На этом устройстве идёт действие — повтори через минуту');
  end if;
  select data into d from public.saves where user_id = src and moved_to is null for update;
  if d is null then
    delete from public.save_locks where user_id in (src, auth.uid()) and token = tok;
    return jsonb_build_object('error', 'Прогресс по коду не найден');
  end if;
  select rev into cur_rev from public.saves where user_id = auth.uid() for update;
  insert into public.saves (user_id, data, rev, app_version) values (auth.uid(), d, coalesce(cur_rev, 0) + 1, 'transfer')
    on conflict (user_id) do update set data = excluded.data, rev = excluded.rev, moved_to = null, updated_at = now();
  update public.saves set moved_to = auth.uid(), rev = rev + 1, updated_at = now() where user_id = src;
  delete from public.transfer_codes where user_id = src;
  delete from public.save_srv where user_id = auth.uid();
  update public.save_srv set user_id = auth.uid() where user_id = src;
  delete from public.players where user_id = auth.uid();
  update public.players set user_id = auth.uid() where user_id = src;
  delete from public.league_scores where user_id = auth.uid();
  update public.league_scores set user_id = auth.uid() where user_id = src;
  update public.payments set user_id = auth.uid() where user_id = src;
  -- 4.26: и способы входа (Google, Telegram…) — иначе вход через них вёл бы в перенесённую (пустую) учётную запись
  delete from public.auth_links where user_id = auth.uid() and (provider, subject) in (select provider, subject from public.auth_links where user_id = src);
  update public.auth_links set user_id = auth.uid() where user_id = src;
  delete from public.save_locks where user_id in (src, auth.uid()) and token = tok;
  return jsonb_build_object('data', d, 'rev', coalesce(cur_rev, 0) + 1);
end $$;
revoke all on function public.claim_transfer(text) from public, anon;
grant execute on function public.claim_transfer(text) to authenticated;

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
    -- 4.26: в перенесённый на другое устройство прогресс не пишем
    update saves set data = p_data, rev = rev + 1, app_version = p_ver, updated_at = now()
    where user_id = p_uid and rev = p_rev and moved_to is null returning rev into nrev;
  end if;
  if nrev is null then return null; end if;
  insert into save_srv (user_id, srv, updated_at) values (p_uid, coalesce(p_srv, '{}'::jsonb), now())
  on conflict (user_id) do update set srv = excluded.srv, updated_at = excluded.updated_at;
  delete from save_locks where user_id = p_uid and token = p_token;
  return nrev;
end $$;
revoke all on function public.game_commit(uuid, uuid, int, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.game_commit(uuid, uuid, int, jsonb, jsonb, text) to service_role;

/* ---------- 2. Казна: возвраты ----------
   Статуса 'refunded' не было в ограничении — запись возврата падала (ЮKassa повторяла уведомление без конца,
   чек «Мой налог» не аннулировался). debited — начисленные по вернувшемуся платежу монеты списаны (действие payRefund). */
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('new', 'pending', 'waiting_for_capture', 'succeeded', 'canceled', 'failed', 'refunded'));
alter table public.payments add column if not exists debited boolean not null default false;

/* ---------- 3. Капища на карте: без точного времени ----------
   Защитника ставят, только стоя рядом, — точное время выдавало, кто и когда был у Капища. Время — с точностью до часа. */
create or replace function public.shrines_in_box(s double precision, w double precision, n double precision, e double precision)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', poi_id, 'clan', clan, 'since', date_trunc('hour', since), 'holders', live)), '[]'::jsonb)
  from (select poi_id, clan, since,
               (select coalesce(jsonb_agg((h - 'pid') || jsonb_build_object('t', ((h->>'t')::bigint / 3600000) * 3600000)), '[]'::jsonb)
                  from jsonb_array_elements(holders) h
                 where coalesce((h->>'t')::bigint, 0) >= (extract(epoch from now() - interval '72 hours') * 1000)::bigint) live
          from public.shrine_holds
         where lat >= s and lat < n and lng >= w and lng < e and jsonb_array_length(holders) > 0
           and n - s <= 0.2 and e - w <= 0.4
         limit 500) t
  where jsonb_array_length(live) > 0;
$$;
revoke all on function public.shrines_in_box(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.shrines_in_box(double precision, double precision, double precision, double precision) to authenticated;

/* ---------- 4. Снимки мест: не больше 5 файлов в сутки и только «<id игрока>/<id>.jpg» ----------
   Счёт — функцией с правами владельца: подзапрос в самой политике видел бы файлы через RLS игрока (то есть ни одного). */
create or replace function public.photo_quota_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select count(*) < 5 from storage.objects
   where bucket_id = 'poi-photos' and name like auth.uid()::text || '/%' and created_at > now() - interval '1 day';
$$;
revoke all on function public.photo_quota_ok() from public, anon;
grant execute on function public.photo_quota_ok() to authenticated;
drop policy if exists "poi photos upload own" on storage.objects;
create policy "poi photos upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'poi-photos' and (storage.foldername(name))[1] = auth.uid()::text
              and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9-]{6,64}\.jpg$'
              and public.photo_quota_ok());

/* ---------- 5. Заявки мест: игрок должен быть там, где снимал (по данным сервера игры), и с 5 уровня ----------
   Координаты заявки пишет сам телефон; теперь сервер сверяет их с последним местом игрока, которое видел он сам
   (save_srv.srv.pos — его пишет функция game). srv_dist — это расстояние; его видит модератор. */
alter table public.poi_submissions add column if not exists srv_dist int;
create or replace function public.poi_submission_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare p jsonb; lvl int;
begin
  new.user_id := auth.uid();
  new.status := 'pending'; new.reason := null; new.reviewed_by := null; new.reviewed_at := null;
  new.created_at := now();
  if new.shot_at < now() - interval '2 hours' or new.shot_at > now() + interval '5 minutes' then
    raise exception 'Снимок должен быть сделан только что';
  end if;
  if new.photo !~ '^[0-9a-f-]{36}/[A-Za-z0-9-]{6,64}\.jpg$' or split_part(new.photo, '/', 1) <> auth.uid()::text then
    raise exception 'Чужой или неверный файл снимка';
  end if;
  if char_length(coalesce(new.name, '')) > 80 or char_length(coalesce(new.descr, '')) > 300 then
    raise exception 'Слишком длинное название или описание';
  end if;
  if (select count(*) from public.poi_submissions where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Не больше 5 заявок в сутки';
  end if;
  select (data->>'level')::int into lvl from public.saves where user_id = auth.uid() and moved_to is null;
  if coalesce(lvl, 0) < 5 then raise exception 'Предлагать места можно с 5 уровня'; end if;
  select srv->'pos' into p from public.save_srv where user_id = auth.uid();
  if p is null or coalesce((p->>'t')::bigint, 0) < (extract(epoch from now() - interval '20 minutes') * 1000)::bigint then
    raise exception 'Сервер игры давно не видел тебя на карте — вернись на карту и попробуй ещё раз';
  end if;
  new.srv_dist := round(public.geo_dist((p->>'lat')::float8, (p->>'lng')::float8, new.photo_lat, new.photo_lng));
  if new.srv_dist > 300 then raise exception 'Снимок сделан далеко от места, где сервер видел тебя'; end if;
  return new;
end $$;
revoke execute on function public.poi_submission_guard() from public, anon, authenticated;

/* ---------- 6. Совместные разломы: закрытый канал Realtime raid:<код> — только участники комнаты ----------
   Раньше канал raid-<код> был открыт: зная код, кто угодно слал ложное здоровье босса, «конец боя» и чужой урон. */
create or replace function public.raid_member(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.raid_rooms r join public.players p on p.user_id = auth.uid()
    where r.code = p_code and r.status <> 'closed' and r.created_at > now() - interval '2 hours'
      and r.members @> jsonb_build_array(jsonb_build_object('pid', p.pid)));
$$;
revoke all on function public.raid_member(text) from public, anon;
grant execute on function public.raid_member(text) to authenticated;
do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists "raid: участники читают" on realtime.messages';
    execute $p$create policy "raid: участники читают" on realtime.messages for select to authenticated
      using (realtime.messages.extension = 'broadcast' and realtime.topic() like 'raid:%'
             and public.raid_member(substr(realtime.topic(), 6)))$p$;
    execute 'drop policy if exists "raid: участники пишут" on realtime.messages';
    execute $p$create policy "raid: участники пишут" on realtime.messages for insert to authenticated
      with check (realtime.messages.extension = 'broadcast' and realtime.topic() like 'raid:%'
                  and public.raid_member(substr(realtime.topic(), 6)))$p$;
  end if;
end $$;

/* ---------- 7. Вход через бота Telegram: кто нажал «Запустить» — только он может подтвердить кнопкой ---------- */
alter table public.tg_login add column if not exists asked_tg bigint;

/* ---------- 8. Модератор — только со вторым фактором (код из приложения-аутентификатора, aal2) ---------- */
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
     and coalesce(auth.jwt()->>'aal', '') = 'aal2';
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

/* ---------- 9. Лишние права и мёртвые объекты ---------- */
-- места: модератор добавляет и правит только содержательные поля (не id, не источник, не путь снимка)
revoke insert, update on public.pois from authenticated;
grant insert (id, source, cat, lat, lng, name, kind, active, updated_at) on public.pois to authenticated;
grant update (name, kind, active, updated_at) on public.pois to authenticated;
drop function if exists public.put_save(jsonb, int, text);
drop function if exists public.register_pid(text);
drop function if exists public.add_friend(text, text, int);
drop table if exists public.osm_tiles;

/* ---------- 10. Уборка (152-ФЗ): не хранить дольше нужного ---------- */
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
  delete from auth.users u where u.is_anonymous and u.created_at < now() - interval '30 days'
    and not exists (select 1 from saves s where s.user_id = u.id);                  get diagnostics n = row_count; r := r || jsonb_build_object('empty_guests', n);
  return r;
end $$;
revoke all on function public.duholov_cleanup() from public, anon, authenticated;
grant execute on function public.duholov_cleanup() to service_role;

/* ---------- 11. Лига: каждому — свой вид боя ----------
   Рассылка отдавала обоим полное состояние: энергию, силу атаки и готовность приёма соперника (модифицированный телефон
   видел их до решения о щите). Теперь каждому своя копия без скрытого о сопернике (как PvP.mask в league.js). */
create or replace function public.pvp_mask(st jsonb, seat text) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare foe text := case seat when 'a' then 'b' else 'a' end; x jsonb := st; t jsonb;
begin
  if st is null then return st; end if;
  if st ? 'init' then -- первая запись боя: 'a' / 'b' — сведения о командах
    if jsonb_typeof(st->foe->'team') = 'array' then
      select coalesce(jsonb_agg(f - 'atk' - 'emul' - 'move2' - 'en' order by i), '[]'::jsonb) into t
        from jsonb_array_elements(st->foe->'team') with ordinality as e(f, i);
      x := jsonb_set(x, array[foe, 'team'], t);
    end if;
    return x;
  end if;
  if st->'s'->foe is null then return st; end if;
  select coalesce(jsonb_agg((f - 'atk' - 'emul') || jsonb_build_object('en', 0, 'move2', false) order by i), '[]'::jsonb) into t
    from jsonb_array_elements(coalesce(st->'s'->foe->'team', '[]'::jsonb)) with ordinality as e(f, i);
  x := jsonb_set(x, array['s', foe], (x->'s'->foe) || jsonb_build_object('team', t, 'cd', 0, 'tok', 0, 'tokAt', 0, 'hits', 0, 'rej', 0));
  if x->'pause'->>'k' = 'charge' then
    if x->'pause'->>'by' = seat then x := jsonb_set(x, '{pause,sh}', 'null'::jsonb);
    else x := jsonb_set(x, '{pause,taps}', 'null'::jsonb); end if;
  end if;
  return x;
end $$;
revoke all on function public.pvp_mask(jsonb, text) from public, anon, authenticated;

create or replace function public.league_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare ev text;
begin
  ev := case when tg_op = 'INSERT' then 'found' else 'pvp' end;
  begin
    perform realtime.send(jsonb_build_object('id', new.id, 'ver', new.ver, 'st', public.pvp_mask(new.state, 'a')), ev, 'league:' || new.a_uid::text, true);
    perform realtime.send(jsonb_build_object('id', new.id, 'ver', new.ver, 'st', public.pvp_mask(new.state, 'b')), ev, 'league:' || new.b_uid::text, true);
  exception when others then null; -- Realtime без закрытых каналов: телефоны узнают о бое опросом
  end;
  return null;
end $$;
revoke all on public.league_matches from anon, authenticated;

notify pgrst, 'reload schema';
