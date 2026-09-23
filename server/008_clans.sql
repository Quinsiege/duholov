-- 3.5.0: Дружины. Капище, на котором стоят защитники, принадлежит их дружине.
-- Пишет только сервер игры (Edge Function game); телефон читает сводку через shrines_in_box — без кодов игроков.

create table if not exists public.shrine_holds (
  poi_id     text primary key,
  clan       text not null check (clan in ('sokol', 'medved', 'volk')),
  lat        double precision not null,
  lng        double precision not null,
  holders    jsonb not null default '[]',  -- [{ pid, name, sp, t }] — до 6 защитников
  ver        int not null default 1,       -- растёт при каждом изменении (бой проверяет, что защитники те же)
  since      timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shrine_holds enable row level security;
revoke all on public.shrine_holds from anon, authenticated;
create index if not exists shrine_holds_geo on public.shrine_holds (lat, lng);
create index if not exists shrine_holds_holders on public.shrine_holds using gin (holders jsonb_path_ops);

-- Поставить защитника: Капище свободно или своей дружины, не больше 6, от игрока — один дух
create or replace function public.shrine_defend(p_poi text, p_lat double precision, p_lng double precision, p_clan text, p_holder jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.shrine_holds; n int;
begin
  insert into public.shrine_holds (poi_id, clan, lat, lng, holders) values (p_poi, p_clan, p_lat, p_lng, '[]')
    on conflict (poi_id) do nothing;
  select * into r from public.shrine_holds where poi_id = p_poi for update;
  n := jsonb_array_length(r.holders);
  if n > 0 and r.clan <> p_clan then return false; end if;
  if n >= 6 then return false; end if;
  if r.holders @> jsonb_build_array(jsonb_build_object('pid', p_holder->>'pid')) then return false; end if;
  update public.shrine_holds
     set clan = p_clan, holders = r.holders || jsonb_build_array(p_holder), ver = r.ver + 1,
         since = case when n = 0 then now() else r.since end, updated_at = now()
   where poi_id = p_poi;
  return true;
end $$;

-- Защитники побеждены: Капище свободно (если с начала боя на нём ничего не менялось)
create or replace function public.shrine_defeat(p_poi text, p_ver int)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.shrine_holds set holders = '[]', ver = ver + 1, updated_at = now() where poi_id = p_poi and ver = p_ver;
  return found;
end $$;

-- Для карты: занятые Капища в прямоугольнике, защитники без кодов игроков
create or replace function public.shrines_in_box(s double precision, w double precision, n double precision, e double precision)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', poi_id, 'clan', clan, 'since', since,
           'holders', (select coalesce(jsonb_agg(h - 'pid'), '[]'::jsonb) from jsonb_array_elements(holders) h))), '[]'::jsonb)
  from (select * from public.shrine_holds
         where lat >= s and lat < n and lng >= w and lng < e and jsonb_array_length(holders) > 0
           and n - s <= 0.2 and e - w <= 0.4
         limit 500) t;
$$;

revoke all on function public.shrine_defend(text, double precision, double precision, text, jsonb) from public, anon, authenticated;
revoke all on function public.shrine_defeat(text, int) from public, anon, authenticated;
grant execute on function public.shrine_defend(text, double precision, double precision, text, jsonb) to service_role;
grant execute on function public.shrine_defeat(text, int) to service_role;
revoke all on function public.shrines_in_box(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.shrines_in_box(double precision, double precision, double precision, double precision) to authenticated;
