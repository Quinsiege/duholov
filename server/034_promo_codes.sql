-- 5.x: промокоды — награда (монеты, искры, предметы) по коду: тестировщикам, на стримах, в события. Выполнить в Supabase →
-- SQL Editor (или psql на своём сервере) ДО выкладки функции game с действием promo. Повторный запуск безопасен.
-- Совместима с прежней функцией game: она этих таблиц не знает.
--
-- promo_codes       — коды: code (A–Z, 0–9, дефис, 3–32 знака, в верхнем регистре), reward — награда
--                     ({"zlat":100} — монеты; ещё sparks — искры и предметы ITEMS из www/js/data.js: {"charm3":5}),
--                     max_uses — сколько раз всего можно ввести (null — без ограничения), used — сколько уже ввели,
--                     starts_at / ends_at — с какого и до какого момента действует (null — без ограничения),
--                     active — выключатель, note — заметка для себя.
-- promo_redemptions — кто ввёл: один раз на учётную запись (code, user_id). done — награда точно сохранена в прогрессе
--                     (сервер отмечает после сохранения; пока не отмечено, повторный ввод тем же игроком выдаёт награду
--                     снова — если в прогрессе её нет: прошлое сохранение могло не пройти).
--
--   promo_redeem(code, user) — ввести код: → {"reward": {...}} | {"reward": {...}, "again": true} | {"error": причина},
--                              причина: not_found / inactive / expired / not_started / exhausted / already.
--   promo_done(code, user)   — награда сохранена в прогрессе (после сохранения).
--   promo_add(code, reward, max_uses, ends_at, note, starts_at) — создать код (→ код); promo_off(code) / promo_on(code).
--
-- Создать код — на сервере скриптом (tools/server/duholov-promo):
--   duholov-promo add PLAYTEST 100 --uses 50 --until 2026-12-31 --note "тестировщики Google Play"
--   duholov-promo list
--   duholov-promo off PLAYTEST
-- или в SQL Editor:
--   select promo_add('PLAYTEST', '{"zlat":100}', 50, '2027-01-01 00:00+03', 'тестировщики Google Play');
--   select promo_add('STREAM-1', '{"zlat":50,"sparks":2000,"charm3":5}');  -- без лимита и срока
--   select promo_off('PLAYTEST');
--   select code, reward, used, max_uses, ends_at, active, note from promo_codes order by created_at desc;
--
-- Доступ: только сервер игры (service_role) и владелец базы. Игрокам (anon, authenticated) таблицы и функции недоступны —
-- ни список кодов, ни кто их вводил.

-- награда: объект из известных ключей, значения — целые 1…100 000
create or replace function public.promo_reward_ok(r jsonb) returns boolean
language sql immutable set search_path = public as $$
  select case when jsonb_typeof(r) = 'object' and r <> '{}'::jsonb then not exists (
    select 1 from jsonb_each(r) e
     where e.key not in ('zlat', 'sparks', 'charm', 'charm2', 'charm3', 'honey', 'herb', 'brew', 'deadwater', 'water',
                         'incense', 'farpass', 'gate', 'xpbrew', 'gift')
        or jsonb_typeof(e.value) <> 'number'
        or case when e.value::text ~ '^[1-9][0-9]{0,5}$' then e.value::text::int > 100000 else true end
  ) else false end;
$$;

create table if not exists public.promo_codes (
  code       text primary key check (code ~ '^[A-Z0-9-]{3,32}$'),
  reward     jsonb not null check (public.promo_reward_ok(reward)),
  max_uses   int check (max_uses is null or max_uses > 0),
  used       int not null default 0 check (used >= 0),
  starts_at  timestamptz,
  ends_at    timestamptz,
  active     boolean not null default true,
  note       text,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  code    text not null references public.promo_codes (code) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  at      timestamptz not null default now(),
  done    boolean not null default false,
  primary key (code, user_id)
);
create index if not exists promo_redemptions_user on public.promo_redemptions (user_id);

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
revoke all on public.promo_codes from anon, authenticated;
revoke all on public.promo_redemptions from anon, authenticated;
-- политик для anon/authenticated нет: при включённом RLS строк они не видят и не меняют

-- ввести код: всё в одной транзакции, строка кода заблокирована (for update) — два игрока не превысят лимит,
-- один игрок двумя запросами не получит награду дважды (первичный ключ погашения + on conflict)
create or replace function public.promo_redeem(p_code text, p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  k text := upper(btrim(coalesce(p_code, '')));
  c public.promo_codes%rowtype;
  was boolean;
  n int;
begin
  if p_user is null or k !~ '^[A-Z0-9-]{3,32}$' then return jsonb_build_object('error', 'not_found'); end if;
  select * into c from public.promo_codes where code = k for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  select done into was from public.promo_redemptions where code = k and user_id = p_user;
  if found then
    if was then return jsonb_build_object('error', 'already'); end if;
    return jsonb_build_object('reward', c.reward, 'again', true); -- уже засчитан, но сохранение прогресса не подтверждено
  end if;
  if not c.active then return jsonb_build_object('error', 'inactive'); end if;
  if c.starts_at is not null and now() < c.starts_at then return jsonb_build_object('error', 'not_started'); end if;
  if c.ends_at is not null and now() >= c.ends_at then return jsonb_build_object('error', 'expired'); end if;
  if c.max_uses is not null and c.used >= c.max_uses then return jsonb_build_object('error', 'exhausted'); end if;
  insert into public.promo_redemptions (code, user_id) values (k, p_user) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('error', 'already'); end if;
  update public.promo_codes set used = used + 1 where code = k;
  return jsonb_build_object('reward', c.reward);
end $$;

-- награда сохранена в прогрессе игрока
create or replace function public.promo_done(p_code text, p_user uuid) returns void
language sql security definer set search_path = public as $$
  update public.promo_redemptions set done = true where code = upper(btrim(coalesce(p_code, ''))) and user_id = p_user and not done;
$$;

-- создать код (владелец: SQL Editor или duholov-promo). Код приводится к верхнему регистру, пробелы по краям убираются
create or replace function public.promo_add(p_code text, p_reward jsonb, p_max_uses int default null, p_ends_at timestamptz default null,
                                            p_note text default null, p_starts_at timestamptz default null) returns text
language plpgsql security definer set search_path = public as $$
declare k text := upper(btrim(coalesce(p_code, '')));
begin
  if k !~ '^[A-Z0-9-]{3,32}$' then raise exception 'Код: латинские буквы, цифры и дефис, от 3 до 32 знаков — «%»', p_code; end if;
  if not public.promo_reward_ok(p_reward) then
    raise exception 'Награда: {"zlat":100}, ещё sparks и предметы (charm, charm2, charm3, honey, herb, brew, deadwater, water, incense, farpass, gate, xpbrew, gift), целые 1…100000 — %', p_reward;
  end if;
  if p_max_uses is not null and p_max_uses < 1 then raise exception 'Лимит использований — от 1 (или без лимита)'; end if;
  if p_ends_at is not null and p_ends_at <= now() then raise exception 'Срок действия уже прошёл: %', p_ends_at; end if;
  if p_ends_at is not null and p_starts_at is not null and p_ends_at <= p_starts_at then raise exception 'Код кончается раньше, чем начинается'; end if;
  if exists (select 1 from public.promo_codes where code = k) then raise exception 'Код % уже есть — выбери другой', k; end if;
  insert into public.promo_codes (code, reward, max_uses, starts_at, ends_at, note)
    values (k, p_reward, p_max_uses, p_starts_at, p_ends_at, nullif(btrim(coalesce(p_note, '')), ''));
  return k;
end $$;

-- выключить / включить код → был ли такой код
create or replace function public.promo_off(p_code text) returns boolean
language sql security definer set search_path = public as $$
  with u as (update public.promo_codes set active = false where code = upper(btrim(coalesce(p_code, ''))) returning 1) select exists (select 1 from u);
$$;
create or replace function public.promo_on(p_code text) returns boolean
language sql security definer set search_path = public as $$
  with u as (update public.promo_codes set active = true where code = upper(btrim(coalesce(p_code, ''))) returning 1) select exists (select 1 from u);
$$;

revoke all on function public.promo_reward_ok(jsonb) from public, anon, authenticated;
revoke all on function public.promo_redeem(text, uuid) from public, anon, authenticated;
revoke all on function public.promo_done(text, uuid) from public, anon, authenticated;
revoke all on function public.promo_add(text, jsonb, int, timestamptz, text, timestamptz) from public, anon, authenticated;
revoke all on function public.promo_off(text) from public, anon, authenticated;
revoke all on function public.promo_on(text) from public, anon, authenticated;
grant execute on function public.promo_reward_ok(jsonb) to service_role;
grant execute on function public.promo_redeem(text, uuid) to service_role;
grant execute on function public.promo_done(text, uuid) to service_role;
grant execute on function public.promo_add(text, jsonb, int, timestamptz, text, timestamptz) to service_role;
grant execute on function public.promo_off(text) to service_role;
grant execute on function public.promo_on(text) to service_role;

notify pgrst, 'reload schema';
