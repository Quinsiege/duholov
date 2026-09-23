-- Духолов 2.1: реальные объекты на карте, модерация заявок с фото, прогресс игроков на сервере.
-- Supabase → SQL Editor → вставить целиком и выполнить (скрипт можно запускать повторно).

create extension if not exists pgcrypto with schema extensions;

/* ---------- расстояние между точками, м ---------- */
create or replace function public.geo_dist(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable parallel safe as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)));
$$;

/* ---------- администрация (модераторы) ---------- */
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security; -- через API таблица недоступна никому

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

/* ---------- объекты на карте: Родники и Капища ---------- */
create table if not exists public.pois (
  id         text primary key,                     -- osm:n123 / osm:w456 / usr:<uuid заявки>
  source     text not null check (source in ('osm', 'player')),
  name       text not null check (char_length(name) between 1 and 80),
  kind       text not null check (kind in ('spring', 'shrine')),
  cat        text,
  lat        double precision not null check (lat between -90 and 90),
  lng        double precision not null check (lng between -180 and 180),
  photo      text,                                 -- путь в хранилище poi-photos
  active     boolean not null default true,
  submission uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pois_geo on public.pois (lat, lng);
alter table public.pois enable row level security;
grant select on public.pois to anon, authenticated;
grant update (name, kind, active, updated_at) on public.pois to authenticated;

drop policy if exists "pois read" on public.pois;
create policy "pois read" on public.pois for select to anon, authenticated using (active or public.is_admin());
drop policy if exists "pois admin update" on public.pois;
create policy "pois admin update" on public.pois for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- какие квадраты карты уже заполнены из OpenStreetMap (пишет только серверная функция)
create table if not exists public.osm_tiles (
  id         text primary key,
  count      int not null default 0,
  fetched_at timestamptz not null default now()
);
alter table public.osm_tiles enable row level security;

/* ---------- заявки игроков ---------- */
create table if not exists public.poi_submissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author      text check (char_length(author) <= 20),
  name        text not null check (char_length(name) between 3 and 60),
  descr       text check (char_length(descr) <= 300),
  kind        text not null check (kind in ('spring', 'shrine')),
  lat         double precision not null check (lat between -90 and 90),    -- где стоит объект
  lng         double precision not null check (lng between -180 and 180),
  photo_lat   double precision not null,                                   -- геометка снимка (GPS в момент съёмки)
  photo_lng   double precision not null,
  accuracy    real not null check (accuracy > 0 and accuracy <= 50),
  shot_at     timestamptz not null,
  photo       text not null,                                               -- <user_id>/<uuid>.jpg в poi-photos
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason      text check (char_length(reason) <= 200),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  -- объект должен находиться там же, где сделан снимок
  constraint geotag_match check (public.geo_dist(lat, lng, photo_lat, photo_lng) <= 50)
);
create index if not exists poi_submissions_queue on public.poi_submissions (status, created_at);
create index if not exists poi_submissions_user on public.poi_submissions (user_id, created_at desc);
alter table public.poi_submissions enable row level security;
grant select, insert on public.poi_submissions to authenticated;

drop policy if exists "subs read own or admin" on public.poi_submissions;
create policy "subs read own or admin" on public.poi_submissions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "subs insert own" on public.poi_submissions;
create policy "subs insert own" on public.poi_submissions for insert to authenticated
  with check (user_id = auth.uid());

-- защита заявки: свежий снимок, свой файл, не больше 5 заявок в сутки
create or replace function public.poi_submission_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.status := 'pending'; new.reason := null; new.reviewed_by := null; new.reviewed_at := null;
  new.created_at := now();
  if new.shot_at < now() - interval '2 hours' or new.shot_at > now() + interval '5 minutes' then
    raise exception 'Снимок должен быть сделан только что';
  end if;
  if split_part(new.photo, '/', 1) <> auth.uid()::text then
    raise exception 'Чужой файл снимка';
  end if;
  if (select count(*) from public.poi_submissions where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Не больше 5 заявок в сутки';
  end if;
  return new;
end $$;
drop trigger if exists poi_submission_guard on public.poi_submissions;
create trigger poi_submission_guard before insert on public.poi_submissions
  for each row execute function public.poi_submission_guard();

-- решение модератора: одобренная заявка сразу становится объектом на карте
create or replace function public.moderate(p_id uuid, p_approve boolean, p_reason text default null,
                                           p_name text default null, p_kind text default null)
returns void language plpgsql security definer set search_path = public as $$
declare s public.poi_submissions;
begin
  if not public.is_admin() then raise exception 'Нет прав модератора'; end if;
  select * into s from public.poi_submissions where id = p_id for update;
  if not found then raise exception 'Заявка не найдена'; end if;
  if s.status <> 'pending' then raise exception 'Заявка уже рассмотрена'; end if;
  update public.poi_submissions set
    status = case when p_approve then 'approved' else 'rejected' end,
    reason = left(p_reason, 200),
    name = coalesce(nullif(trim(p_name), ''), name),
    kind = coalesce(p_kind, kind),
    reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_id returning * into s;
  if p_approve then
    insert into public.pois (id, source, name, kind, cat, lat, lng, photo, submission)
    values ('usr:' || s.id, 'player', s.name, s.kind, 'player', s.lat, s.lng, s.photo, s.id)
    on conflict (id) do update set active = true, name = excluded.name, kind = excluded.kind, updated_at = now();
  end if;
end $$;
revoke all on function public.moderate(uuid, boolean, text, text, text) from public, anon;
grant execute on function public.moderate(uuid, boolean, text, text, text) to authenticated;

/* ---------- хранилище снимков ---------- */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('poi-photos', 'poi-photos', true, 1048576, array['image/jpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "poi photos upload own" on storage.objects;
create policy "poi photos upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'poi-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "poi photos admin delete" on storage.objects;
create policy "poi photos admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'poi-photos' and public.is_admin());

/* ---------- прогресс игроков ---------- */
create table if not exists public.saves (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  data        jsonb not null,
  rev         int not null default 1,
  app_version text,
  moved_to    uuid,                               -- прогресс перенесён на другое устройство
  updated_at  timestamptz not null default now()
);
alter table public.saves enable row level security;
grant select, delete on public.saves to authenticated;

drop policy if exists "saves read own" on public.saves;
create policy "saves read own" on public.saves for select to authenticated using (user_id = auth.uid());
drop policy if exists "saves delete own" on public.saves;
create policy "saves delete own" on public.saves for delete to authenticated using (user_id = auth.uid());

-- запись с защитой от затирания: p_base — версия, на которой основано изменение
create or replace function public.put_save(p_data jsonb, p_base int, p_ver text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cur_rev int; cur_moved uuid;
begin
  if auth.uid() is null then raise exception 'Нет входа'; end if;
  if jsonb_typeof(p_data) <> 'object' or pg_column_size(p_data) > 700000 then raise exception 'Некорректное сохранение'; end if;
  select rev, moved_to into cur_rev, cur_moved from public.saves where user_id = auth.uid() for update;
  if not found then
    insert into public.saves (user_id, data, rev, app_version) values (auth.uid(), p_data, 1, left(p_ver, 20));
    return jsonb_build_object('ok', true, 'rev', 1);
  end if;
  if cur_moved is not null then return jsonb_build_object('ok', false, 'moved', true); end if;
  if cur_rev <> p_base then return jsonb_build_object('ok', false, 'rev', cur_rev); end if;
  update public.saves set data = p_data, rev = cur_rev + 1, app_version = left(p_ver, 20), updated_at = now()
    where user_id = auth.uid();
  return jsonb_build_object('ok', true, 'rev', cur_rev + 1);
end $$;
revoke all on function public.put_save(jsonb, int, text) from public, anon;
grant execute on function public.put_save(jsonb, int, text) to authenticated;

/* ---------- перенос прогресса на другое устройство ---------- */
create table if not exists public.transfer_codes (
  code_hash  text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null
);
alter table public.transfer_codes enable row level security;

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
  insert into public.transfer_codes values (encode(digest(raw, 'sha256'), 'hex'), auth.uid(), now() + interval '24 hours');
  return substr(raw, 1, 4) || '-' || substr(raw, 5, 4) || '-' || substr(raw, 9, 4);
end $$;
revoke all on function public.make_transfer_code() from public, anon;
grant execute on function public.make_transfer_code() to authenticated;

create or replace function public.claim_transfer(p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  raw text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  src uuid; d jsonb; cur_rev int;
begin
  if auth.uid() is null then raise exception 'Нет входа'; end if;
  select user_id into src from public.transfer_codes
    where code_hash = encode(digest(raw, 'sha256'), 'hex') and expires_at > now();
  if src is null then raise exception 'Код не найден или устарел'; end if;
  if src = auth.uid() then raise exception 'Это код этого же устройства'; end if;
  select data into d from public.saves where user_id = src and moved_to is null for update;
  if d is null then raise exception 'Прогресс по коду не найден'; end if;
  select rev into cur_rev from public.saves where user_id = auth.uid() for update;
  insert into public.saves (user_id, data, rev, app_version) values (auth.uid(), d, coalesce(cur_rev, 0) + 1, 'transfer')
    on conflict (user_id) do update set data = excluded.data, rev = excluded.rev, moved_to = null, updated_at = now();
  update public.saves set moved_to = auth.uid(), updated_at = now() where user_id = src;
  delete from public.transfer_codes where user_id = src;
  -- таблица Лиги переходит вместе с прогрессом
  delete from public.league_scores where user_id = auth.uid();
  update public.league_scores set user_id = auth.uid() where user_id = src;
  return jsonb_build_object('data', d, 'rev', coalesce(cur_rev, 0) + 1);
end $$;
revoke all on function public.claim_transfer(text) from public, anon;
grant execute on function public.claim_transfer(text) to authenticated;
