-- 4.28: кланы мифологий, часть 2 — перенос данных. Выполнить в Supabase → SQL Editor обоих проектов СРАЗУ ПОСЛЕ выкладки
-- функции game с кланами мифологий (031_myth_clans.sql — уже применена). Повторный запуск безопасен (переносит только то,
-- что ещё под старыми id).
--
-- Прежние дружины → кланы мифологий (public.clan_key из 031; data.js, CLAN_OLD): sokol → slavic, medved → celtic, volk → norse.
--   shrine_holds   — знамя Капища; защитники, их срок и версия Капища (ver) не меняются — идущие бои не сбиваются;
--   chat_messages  — канал clan:sokol → clan:slavic и т. п. (переписка клана сохраняется) и клан автора;
--   saves          — клан в сохранении (data.clan). Версия сохранения (rev) не меняется: сервер игры при загрузке и сам
--                    переводит старый id (S.migrate) и даёт тем, кто был в дружине, один бесплатный переход (clanFree) —
--                    и до этой миграции, и после неё;
--   league_queue   — клан в карточке Ловчего, ждущего пару в Лиге.
-- Прежняя функция game после этой миграции работать не должна (она не знает новых id) — поэтому только после выкладки.
-- Бои Лиги, что идут в момент миграции (league_matches.state), не трогаются: у телефона старые id — те же кланы.

begin;

update public.shrine_holds
   set clan = public.clan_key(clan)
 where clan in ('sokol', 'medved', 'volk');

update public.chat_messages
   set channel = 'clan:' || public.clan_key(substr(channel, 6))
 where channel in ('clan:sokol', 'clan:medved', 'clan:volk');

update public.chat_messages
   set clan = public.clan_key(clan)
 where clan in ('sokol', 'medved', 'volk');

update public.saves
   set data = jsonb_set(data, '{clan}', to_jsonb(public.clan_key(data->>'clan')))
 where data->>'clan' in ('sokol', 'medved', 'volk');

update public.league_queue
   set info = jsonb_set(info, '{clan}', to_jsonb(public.clan_key(info->>'clan')))
 where info->>'clan' in ('sokol', 'medved', 'volk');

commit;

notify pgrst, 'reload schema';
