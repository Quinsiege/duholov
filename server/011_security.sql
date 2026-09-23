-- 3.16: защита от взлома, перебора и кражи аккаунтов.
-- Выполнить целиком в Supabase → SQL Editor. Повторный запуск безопасен.

/* ---------- 1. Права на таблицы: телефону — только то, что он действительно читает ----------
   Прогресс, друзья, подарки, посылки, коды переноса и служебные таблицы пишет и читает только
   сервер игры (секретный ключ). Раньше их закрывали лишь правила RLS; теперь закрыты и сами права. */
revoke all on public.saves, public.save_srv, public.transfer_codes, public.friend_links, public.players,
              public.gifts, public.trades, public.admins, public.osm_tiles
  from anon, authenticated;

-- таблица Лиги: только чтение (пишет сервер игры)
revoke all on public.league_scores from anon, authenticated;
grant select on public.league_scores to anon, authenticated;

-- места на карте: читают все, правят модераторы (правило is_admin() уже стоит)
revoke all on public.pois from anon, authenticated;
grant select on public.pois to anon, authenticated;
grant insert, update on public.pois to authenticated;

-- заявки мест: игрок читает свои и подаёт новые; решение — только через moderate()
revoke all on public.poi_submissions from anon, authenticated;
grant select, insert on public.poi_submissions to authenticated;

/* ---------- 2. Заявки мест: путь снимка — строго «<id игрока>/<id>.jpg» ----------
   Иначе строку пути можно было записать так, что она вырвется из атрибута разметки у модератора
   и у игроков рядом с одобренным местом. */
create or replace function public.poi_submission_guard() returns trigger
language plpgsql security definer set search_path = public as $$
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
  return new;
end $$;

-- уже сохранённые пути, не похожие на путь снимка, убираем (снимок просто не покажется)
update public.poi_submissions set photo = '00000000-0000-0000-0000-000000000000/removed.jpg'
  where photo !~ '^[0-9a-f-]{36}/[A-Za-z0-9-]{6,64}\.jpg$';
update public.pois set photo = null where photo is not null and photo !~ '^[0-9a-f-]{36}/[A-Za-z0-9-]{6,64}\.jpg$';

/* ---------- 3. Перенос прогресса ----------
   • код живёт 30 минут (было 24 часа) — меньше времени выманить его обманом;
   • не больше 10 неудачных попыток ввода в час на игрока (перебор);
   • вместе с прогрессом переходят код игрока (друзья, дружины) и оплаты Казны. */
create table if not exists public.transfer_attempts (
  user_id uuid not null,
  at      timestamptz not null default now()
);
create index if not exists transfer_attempts_idx on public.transfer_attempts (user_id, at);
alter table public.transfer_attempts enable row level security;
revoke all on public.transfer_attempts from anon, authenticated;

create or replace function public.make_transfer_code() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea := gen_random_bytes(12);
  raw text := '';
begin
  if auth.uid() is null then raise exception 'Нет входа'; end if;
  if not exists (select 1 from public.saves where user_id = auth.uid() and moved_to is null) then
    raise exception 'Прогресс ещё не сохранён на сервере';
  end if;
  for i in 0..11 loop raw := raw || substr(alphabet, (get_byte(b, i) % 32) + 1, 1); end loop;
  delete from public.transfer_codes where user_id = auth.uid() or expires_at < now();
  insert into public.transfer_codes values (encode(digest(raw, 'sha256'), 'hex'), auth.uid(), now() + interval '30 minutes');
  return substr(raw, 1, 4) || '-' || substr(raw, 5, 4) || '-' || substr(raw, 9, 4);
end $$;
revoke all on function public.make_transfer_code() from public, anon;
grant execute on function public.make_transfer_code() to authenticated;

-- Ошибки возвращаются в ответе ({ error }), а не исключением: иначе откатилась бы и запись о неудачной попытке
create or replace function public.claim_transfer(p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  raw text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  src uuid; d jsonb; cur_rev int;
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
  select data into d from public.saves where user_id = src and moved_to is null for update;
  if d is null then return jsonb_build_object('error', 'Прогресс по коду не найден'); end if;
  select rev into cur_rev from public.saves where user_id = auth.uid() for update;
  insert into public.saves (user_id, data, rev, app_version) values (auth.uid(), d, coalesce(cur_rev, 0) + 1, 'transfer')
    on conflict (user_id) do update set data = excluded.data, rev = excluded.rev, moved_to = null, updated_at = now();
  update public.saves set moved_to = auth.uid(), updated_at = now() where user_id = src;
  delete from public.transfer_codes where user_id = src;
  -- серверные отметки (бои, ограничения частоты) тоже переходят
  delete from public.save_srv where user_id = auth.uid();
  update public.save_srv set user_id = auth.uid() where user_id = src;
  -- код игрока: друзья, подарки и защитники на Капищах остаются при нём
  delete from public.players where user_id = auth.uid();
  update public.players set user_id = auth.uid() where user_id = src;
  -- таблица Лиги и оплаты Казны переходят вместе с прогрессом
  delete from public.league_scores where user_id = auth.uid();
  update public.league_scores set user_id = auth.uid() where user_id = src;
  update public.payments set user_id = auth.uid() where user_id = src;
  return jsonb_build_object('data', d, 'rev', coalesce(cur_rev, 0) + 1);
end $$;
revoke all on function public.claim_transfer(text) from public, anon;
grant execute on function public.claim_transfer(text) to authenticated;
