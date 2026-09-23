-- 3.4.0: места по всей России. Объекты OpenStreetMap раз в неделю загружает в pois импорт
-- (.github/workflows/places.yml, tools/osm-import). Правки модераторов импорт не трогает.

-- imported — строку ведёт импорт (обновляет и удаляет, если объект исчез из OSM)
-- edited   — место правил модератор (или это место игрока): импорт его больше не меняет
alter table public.pois add column if not exists imported boolean not null default false;
alter table public.pois add column if not exists edited boolean not null default false;

-- всё, что уже есть в таблице (места игроков, правки модераторов, первые объекты Москвы), — сохраняем как есть
update public.pois set edited = true where not imported and not edited;

-- любая запись из игры или панели модерации (вошедший пользователь) помечает место как исправленное
create or replace function public.pois_mark_edited() returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then new.edited := true; end if;
  return new;
end $$;
drop trigger if exists pois_edited on public.pois;
create trigger pois_edited before insert or update on public.pois for each row execute function public.pois_mark_edited();

-- быстрый поиск «есть ли тут загруженные места» (сервер игры проверяет объекты по базе)
create index if not exists pois_imported_geo on public.pois (lat, lng) where imported;
