-- 3.7.0: совместные разломы через сервер. Комнату (код, участников, начало боя) ведёт сервер игры —
-- число союзников для урона и наград он берёт отсюда, а не со слов телефона. Телефону доступа нет.

create table if not exists public.raid_rooms (
  code       text primary key,
  host_pid   text not null,
  rift       jsonb not null,                -- { id, tier, boss, poi: { id, lat, lng, name }, … }
  members    jsonb not null default '[]',   -- [{ pid, name, look, lvl, power, sid }] — до 4
  status     text not null default 'lobby' check (status in ('lobby', 'started', 'closed')),
  created_at timestamptz not null default now(),
  started_at timestamptz
);
alter table public.raid_rooms enable row level security;
revoke all on public.raid_rooms from anon, authenticated;
create index if not exists raid_rooms_created on public.raid_rooms (created_at);

-- Войти в комнату (или обновить свои данные, если уже внутри): атомарно, не больше 4
create or replace function public.raid_room_join(p_code text, p_member jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.raid_rooms;
begin
  select * into r from public.raid_rooms where code = p_code for update;
  if not found or r.status = 'closed' or r.created_at < now() - interval '2 hours' then
    return jsonb_build_object('error', 'Разлом с таким кодом не найден');
  end if;
  if r.members @> jsonb_build_array(jsonb_build_object('pid', p_member->>'pid')) then
    update public.raid_rooms
       set members = (select jsonb_agg(case when m->>'pid' = p_member->>'pid' then p_member else m end) from jsonb_array_elements(r.members) m)
     where code = p_code;
  else
    if r.status <> 'lobby' then return jsonb_build_object('error', 'Бой уже начался'); end if;
    if jsonb_array_length(r.members) >= 4 then return jsonb_build_object('error', 'В разломе уже 4 Ловчих'); end if;
    update public.raid_rooms set members = r.members || jsonb_build_array(p_member) where code = p_code;
  end if;
  return (select to_jsonb(x) from public.raid_rooms x where code = p_code);
end $$;

-- Выйти из комнаты; хозяин, ушедший до начала боя, закрывает её
create or replace function public.raid_room_leave(p_code text, p_pid text)
returns void language sql security definer set search_path = public as $$
  update public.raid_rooms
     set members = coalesce((select jsonb_agg(m) from jsonb_array_elements(members) m where m->>'pid' <> p_pid), '[]'::jsonb),
         status = case when host_pid = p_pid and status = 'lobby' then 'closed' else status end
   where code = p_code;
$$;

revoke all on function public.raid_room_join(text, jsonb) from public, anon, authenticated;
revoke all on function public.raid_room_leave(text, text) from public, anon, authenticated;
grant execute on function public.raid_room_join(text, jsonb) to service_role;
grant execute on function public.raid_room_leave(text, text) to service_role;
