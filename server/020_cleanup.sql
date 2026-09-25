-- 4.1: ежедневная уборка — то, что игре больше не нужно. Запускает сервер игры по расписанию
-- (cron: select public.duholov_cleanup(); см. tools/server/duholov-cleanup). Повторный запуск безопасен.
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
  -- гости, которые так и не начали игру (нет прогресса), — через 30 дней
  delete from auth.users u where u.is_anonymous and u.created_at < now() - interval '30 days'
    and not exists (select 1 from saves s where s.user_id = u.id);                  get diagnostics n = row_count; r := r || jsonb_build_object('empty_guests', n);
  return r;
end $$;
revoke all on function public.duholov_cleanup() from public, anon, authenticated;
grant execute on function public.duholov_cleanup() to service_role;
