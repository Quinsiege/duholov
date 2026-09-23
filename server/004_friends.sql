-- Духолов 2.2: взаимная дружба через сервер.
-- Код дружбы содержит pid игрока (случайный идентификатор прогресса). Когда игрок Б добавляет код игрока А,
-- на сервере появляется связь «Б → А»; игра А видит её и добавляет Б к себе — дружба становится взаимной.
-- Выполнить после 003_osm_on_clients.sql (скрипт можно запускать повторно).

/* ---------- чей это pid ---------- */
create table if not exists public.players (
  pid        text primary key check (pid ~ '^[a-z0-9]{8,40}$'),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.players enable row level security; -- пишется только через функции ниже
grant select on public.players to authenticated;
-- игрок видит только свою строку (нужно правилу доступа к friend_links)
drop policy if exists "players read own" on public.players;
create policy "players read own" on public.players for select to authenticated using (user_id = auth.uid());

-- Закрепить pid своего прогресса за своим входом. 'taken' — pid уже принадлежит другому игроку.
create or replace function public.register_pid(p_pid text) returns text
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  if auth.uid() is null then raise exception 'Нет входа'; end if;
  if p_pid !~ '^[a-z0-9]{8,40}$' then raise exception 'Некорректный код игрока'; end if;
  select user_id into owner from public.players where pid = p_pid;
  if owner = auth.uid() then return 'ok'; end if;
  if owner is not null then return 'taken'; end if;
  -- на этом входе начали новую игру: у прогресса новый pid
  delete from public.players where user_id = auth.uid();
  insert into public.players (pid, user_id) values (p_pid, auth.uid());
  return 'ok';
end $$;
revoke all on function public.register_pid(text) from public, anon;
grant execute on function public.register_pid(text) to authenticated;

/* ---------- связи дружбы ---------- */
create table if not exists public.friend_links (
  from_pid   text not null references public.players (pid) on delete cascade on update cascade,
  to_pid     text not null check (to_pid ~ '^[a-z0-9]{8,40}$'),
  from_name  text not null check (char_length(from_name) between 1 and 20),
  from_level int  not null default 1 check (from_level between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (from_pid, to_pid),
  check (from_pid <> to_pid)
);
create index if not exists friend_links_to on public.friend_links (to_pid);
alter table public.friend_links enable row level security;
grant select on public.friend_links to authenticated;

-- видны только связи, где я — одна из сторон
drop policy if exists "friend links mine" on public.friend_links;
create policy "friend links mine" on public.friend_links for select to authenticated
  using (exists (select 1 from public.players p where p.user_id = auth.uid() and p.pid in (from_pid, to_pid)));

-- «Я добавил друга по коду». Не больше 50 новых друзей в сутки.
create or replace function public.add_friend(p_to text, p_name text, p_level int) returns void
language plpgsql security definer set search_path = public as $$
declare me text;
begin
  select pid into me from public.players where user_id = auth.uid();
  if me is null then raise exception 'Сначала сохрани прогресс на сервере'; end if;
  if p_to !~ '^[a-z0-9]{8,40}$' or p_to = me then raise exception 'Некорректный код дружбы'; end if;
  if not exists (select 1 from public.friend_links where from_pid = me and to_pid = p_to)
     and (select count(*) from public.friend_links where from_pid = me and created_at > now() - interval '1 day') >= 50 then
    raise exception 'Не больше 50 новых друзей в сутки';
  end if;
  insert into public.friend_links (from_pid, to_pid, from_name, from_level)
  values (me, p_to, left(coalesce(nullif(trim(p_name), ''), 'Ловчий'), 20), greatest(1, least(40, coalesce(p_level, 1))))
  -- повторное добавление обновляет время: друг, который меня удалил, снова получит меня в ответ
  on conflict (from_pid, to_pid) do update set from_name = excluded.from_name, from_level = excluded.from_level, created_at = now();
end $$;
revoke all on function public.add_friend(text, text, int) from public, anon;
grant execute on function public.add_friend(text, text, int) to authenticated;

/* ---------- перенос прогресса забирает и pid (дружба сохраняется) ---------- */
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
  -- таблица Лиги и код игрока переходят вместе с прогрессом
  delete from public.league_scores where user_id = auth.uid();
  update public.league_scores set user_id = auth.uid() where user_id = src;
  delete from public.players where user_id = auth.uid();
  update public.players set user_id = auth.uid() where user_id = src;
  return jsonb_build_object('data', d, 'rev', coalesce(cur_rev, 0) + 1);
end $$;
revoke all on function public.claim_transfer(text) from public, anon;
grant execute on function public.claim_transfer(text) to authenticated;
