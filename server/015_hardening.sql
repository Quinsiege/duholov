-- 3.23: аудит безопасности — закрываем остатки. Выполнить в Supabase → SQL Editor обоих проектов. Повторный запуск безопасен.

-- 1) Таблица сезона Лиги — только через сервер игры (действие leagueTop): напрямую её больше не читает никто,
--    и наружу не уходят внутренние user_id игроков. Писал в неё и раньше только сервер.
revoke all on public.league_scores from anon, authenticated;
drop policy if exists "league read" on public.league_scores;

-- 2) Политики без прав (прогресс, коды игроков и связи дружбы читает только сервер). Без политик RLS не отдаёт ни строки,
--    даже если права когда-нибудь выдадут по ошибке.
drop policy if exists "saves read own" on public.saves;
drop policy if exists "players read own" on public.players;
drop policy if exists "friend links mine" on public.friend_links;

-- 3) Служебные функции не вызываются через API
revoke execute on function public.poi_submission_guard() from public, anon, authenticated;  -- триггер заявок
revoke execute on function public.pois_mark_edited() from public, anon, authenticated;      -- триггер правок мест
revoke execute on function public.is_admin() from public, anon;                              -- нужна только политикам
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.geo_dist(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.geo_dist(double precision, double precision, double precision, double precision) to authenticated; -- проверка заявки места

-- 4) Фиксированный search_path (функцию нельзя подменить объектом из чужой схемы)
alter function public.geo_dist(double precision, double precision, double precision, double precision) set search_path = '';
alter function public.pois_mark_edited() set search_path = public;
