-- Духолов 2.1 (дополнение): объекты OpenStreetMap загружает сам телефон игрока (публичные серверы Overpass
-- отвечают серверам Supabase медленно или отказывают), а в таблице pois остаются только места игроков
-- и правки модераторов к объектам OSM. Выполнить после 002_objects_and_saves.sql.

-- игроки должны видеть и скрытые модератором объекты, чтобы убрать их со своей карты
drop policy if exists "pois read" on public.pois;
create policy "pois read" on public.pois for select to anon, authenticated using (true);

-- модератор может добавить правку к объекту OSM (скрыть, переименовать, сменить тип)
grant insert on public.pois to authenticated;
drop policy if exists "pois admin insert" on public.pois;
create policy "pois admin insert" on public.pois for insert to authenticated with check (public.is_admin());

-- Таблица osm_tiles и функция poi-tiles больше не используются (их можно удалить вручную).
