-- 4.16: Аукцион — залог и подсказка цены; Капища — защитники уходят по сроку.
-- Выполнить до выкладки сервера игры 4.16 (serve.js зовёт shrine_defend с новыми параметрами и пишет deposit).
-- Повторный запуск безопасен.

-- ---------- Аукцион ----------
-- Залог продавца (Rules.auctionDeposit): списан при выставлении, возвращается вместе с выручкой, если духа купили
alter table public.auction_lots add column if not exists deposit int not null default 0;
do $$ begin
  alter table public.auction_lots add constraint auction_lots_deposit_chk check (deposit >= 0);
exception when duplicate_object then null; end $$;
-- Подсказка цены: недавние сделки с духом вида sid (lotsRecent в serve.js)
create index if not exists auction_sold_idx on public.auction_lots (sid, closed_at desc) where status = 'sold';

-- ---------- Капища ----------
-- Защитник ({ pid, name, sp, t }) стоит не дольше Rules.HOLD.MAX_H часов: t — когда встал (мс). p_cutoff — раньше
-- этого момента защитник уже ушёл; такие убираются перед проверками. p_max — защитников на Капище (HOLD_MAX).
drop function if exists public.shrine_defend(text, double precision, double precision, text, jsonb);
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
  if n > 0 and r.clan <> p_clan then return false; end if;
  if n >= p_max then return false; end if;
  if live @> jsonb_build_array(jsonb_build_object('pid', p_holder->>'pid')) then return false; end if;
  update public.shrine_holds
     set clan = p_clan, holders = live || jsonb_build_array(p_holder), ver = r.ver + 1,
         since = case when n = 0 then now() else r.since end, updated_at = now()
   where poi_id = p_poi;
  return true;
end $$;

-- Уборка: ушедшие по сроку защитники — из всех Капищ (зовёт tools/server/duholov-cleanup раз в день;
-- до уборки их не видят ни бои, ни дань, ни карта)
create or replace function public.shrine_prune(p_cutoff bigint)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.shrine_holds s
     set holders = coalesce((select jsonb_agg(h) from jsonb_array_elements(s.holders) h where coalesce((h->>'t')::bigint, 0) >= p_cutoff), '[]'::jsonb),
         ver = ver + 1, updated_at = now()
   where exists (select 1 from jsonb_array_elements(s.holders) h where coalesce((h->>'t')::bigint, 0) < p_cutoff);
  get diagnostics n = row_count;
  return n;
end $$;

-- Для карты: занятые Капища в прямоугольнике, только защитники на посту (72 ч = Rules.HOLD.MAX_H), без кодов игроков
create or replace function public.shrines_in_box(s double precision, w double precision, n double precision, e double precision)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', poi_id, 'clan', clan, 'since', since, 'holders', live)), '[]'::jsonb)
  from (select poi_id, clan, since,
               (select coalesce(jsonb_agg(h - 'pid'), '[]'::jsonb) from jsonb_array_elements(holders) h
                 where coalesce((h->>'t')::bigint, 0) >= (extract(epoch from now() - interval '72 hours') * 1000)::bigint) live
          from public.shrine_holds
         where lat >= s and lat < n and lng >= w and lng < e and jsonb_array_length(holders) > 0
           and n - s <= 0.2 and e - w <= 0.4
         limit 500) t
  where jsonb_array_length(live) > 0;
$$;

revoke all on function public.shrine_defend(text, double precision, double precision, text, jsonb, bigint, int) from public, anon, authenticated;
grant execute on function public.shrine_defend(text, double precision, double precision, text, jsonb, bigint, int) to service_role;
revoke all on function public.shrine_prune(bigint) from public, anon, authenticated;
grant execute on function public.shrine_prune(bigint) to service_role;
revoke all on function public.shrines_in_box(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.shrines_in_box(double precision, double precision, double precision, double precision) to authenticated;
