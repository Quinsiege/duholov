-- Загрузка мест из pois.csv (build.py) в таблицу pois. Запуск: psql "$DB" -v min=… -f load.sql
-- Новые объекты добавляются, изменившиеся обновляются, исчезнувшие из OSM удаляются —
-- только среди строк импорта; места игроков и правки модераторов (edited) не трогаются.
\set ON_ERROR_STOP on
set statement_timeout = 0;

create temp table imp (id text primary key, name text not null, kind text not null, cat text, lat double precision not null, lng double precision not null);
\copy imp from 'pois.csv' with (format csv)
analyze imp;

-- защита: неполная выгрузка не должна стереть места
select count(*) >= :min as enough from imp \gset
\if :enough
\else
  \echo 'Слишком мало мест в выгрузке — загрузка отменена'
  \quit 3
\endif

begin;
insert into public.pois (id, source, name, kind, cat, lat, lng, imported)
select id, 'osm', name, kind, cat, lat, lng, true from imp
on conflict (id) do update set name = excluded.name, kind = excluded.kind, cat = excluded.cat, lat = excluded.lat, lng = excluded.lng, updated_at = now()
  where pois.imported and not pois.edited
    and (pois.name, pois.kind, pois.cat, pois.lat, pois.lng) is distinct from (excluded.name, excluded.kind, excluded.cat, excluded.lat, excluded.lng);
delete from public.pois p where p.imported and not p.edited and not exists (select 1 from imp where imp.id = p.id);
commit;

select count(*) filter (where imported) as imported, count(*) filter (where imported and kind = 'shrine') as shrines, count(*) as total from public.pois;
