-- 4.15: Лига — рейтинг вместо звёзд (как кубки в Clash Royale): победа +30, поражение −30, лиги — от своего порога.
-- Колонка rating (0..20000) заполняется из звёзд ×100; таблица сезона и место игрока — по рейтингу.
-- Старая колонка stars остаётся (сервер пишет в неё рейтинг / 100) — прежняя версия сервера продолжает работать.
-- Повторный запуск безопасен.
alter table public.league_scores add column if not exists rating int not null default 0;
alter table public.league_scores drop constraint if exists league_scores_rating_check;
alter table public.league_scores add constraint league_scores_rating_check check (rating between 0 and 20000);
update public.league_scores set rating = least(stars * 100, 20000) where rating = 0 and stars > 0;
create index if not exists league_scores_rating_top on public.league_scores (season, rating desc, updated_at);
