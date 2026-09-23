-- 3.1.0: общее дело Ордена — все Ловчие неделю вместе копят очки.
-- Строки пишет и читает только сервер игры (Edge Function game); телефону доступа нет.

create table if not exists public.order_players (
  week int not null,             -- номер недели (Ev.week)
  pid text not null,             -- код игрока
  name text not null default '',
  n int not null default 0 check (n >= 0),
  updated_at timestamptz not null default now(),
  primary key (week, pid)
);
alter table public.order_players enable row level security;
revoke all on public.order_players from anon, authenticated;
create index if not exists order_players_top on public.order_players (week, n desc);

-- Итоги недели: число участников, сумма очков, десятка лучших и вклад игрока p_pid
create or replace function public.order_stats(p_week int, p_pid text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'players', (select count(*) from public.order_players where week = p_week and n > 0),
    'total', (select coalesce(sum(n), 0) from public.order_players where week = p_week),
    'mine', (select n from public.order_players where week = p_week and pid = p_pid),
    'top', coalesce((select jsonb_agg(t) from (
      select pid, name, n from public.order_players where week = p_week and n > 0 order by n desc, updated_at limit 10) t), '[]'::jsonb)
  );
$$;
revoke all on function public.order_stats(int, text) from public, anon, authenticated;
grant execute on function public.order_stats(int, text) to service_role;
