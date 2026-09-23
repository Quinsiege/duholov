#!/usr/bin/env python3
"""Места для «Духолова» из выгрузки OpenStreetMap.

Вход:  объекты в GeoJSON Sequence (osmium export -a type,id) после фильтра filter.txt.
Выход: CSV id,name,kind,cat,lat,lng для таблицы pois (загрузка — load.sql).

Правила отбора те же, что у телефона (www/js/osm.js): категории, названия, будущие Капища
по хэшу id, не ближе 35 м друг к другу. Сверх того — у каждого населённого пункта есть место:
если рядом с центром деревни нет ни одного объекта, там появляется Родник «Околица …»,
а в сёлах и городках с двумя и более местами одно обязательно становится Капищем.

    python3 build.py objects.geojsonseq pois.csv [мин. число мест]
"""
import csv
import json
import math
import re
import sys
from collections import defaultdict

# категория → название по умолчанию и может ли объект стать Капищем (как в osm.js)
CATS = {
    'monument': ('Памятник', 1), 'memorial': ('Памятный знак', 0), 'castle': ('Крепость', 1), 'ruins': ('Руины', 1),
    'archaeological_site': ('Древнее место', 1), 'manor': ('Усадьба', 1), 'city_gate': ('Городские ворота', 1),
    'wayside_cross': ('Поклонный крест', 0), 'wayside_shrine': ('Часовенка', 0), 'boundary_stone': ('Межевой камень', 0),
    'artwork': ('Арт-объект', 0), 'attraction': ('Достопримечательность', 1), 'viewpoint': ('Смотровая площадка', 1),
    'museum': ('Музей', 1), 'place_of_worship': ('Храм', 0), 'fountain': ('Фонтан', 0), 'library': ('Библиотека', 0),
    'theatre': ('Театр', 1), 'arts_centre': ('Дом культуры', 0), 'clock': ('Часы', 0), 'spring': ('Родник', 0), 'peak': ('Вершина', 1),
    'park': ('Парк', 1), 'garden': ('Сад', 0), 'water_tower': ('Водонапорная башня', 1), 'lighthouse': ('Маяк', 1),
    'windmill': ('Мельница', 1), 'watermill': ('Водяная мельница', 1),
    # 3.4: то, что есть почти в каждом селе
    'community_centre': ('Дом культуры', 1), 'post_office': ('Почта', 0), 'station': ('Станция', 1), 'halt': ('Платформа', 0),
}
KEYS = ('historic', 'tourism', 'amenity', 'natural', 'leisure', 'man_made', 'railway')
NEED_NAME = {'garden', 'boundary_stone', 'park', 'station', 'halt'}  # без названия почти не видны на местности
MIN_GAP = 35
# населённые пункты: радиус, в котором уже должно быть место; радиус, в котором должно быть Капище
PLACES = {'city': (3000, 0), 'town': (1500, 2500), 'village': (700, 1500), 'hamlet': (400, 0)}
SETTLEMENT_WORD = {'city': 'Центр', 'town': 'Центр', 'village': 'Околица', 'hamlet': 'Околица'}
MARK = re.compile(r'памят|мемориал|бюст|стел|обелиск|монумент|скульптур|статуя|знак|доска|крест|камень', re.IGNORECASE)


def fnv(s):
    """FNV-1a → [0, 1), как Osm.hash в игре."""
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h / 4294967296


def dist(a, b, c, d):
    r = math.pi / 180
    x = math.sin((c - a) * r / 2) ** 2 + math.cos(a * r) * math.cos(c * r) * math.sin((d - b) * r / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(min(1.0, x)))


def title(cat, tags, named):
    base = 'Мемориальная доска' if cat == 'memorial' and tags.get('memorial') == 'plaque' else CATS[cat][0]
    if not named:
        return base
    if cat in ('monument', 'memorial') and not MARK.search(named):
        return f'{base} {named}'
    # почты в OSM часто подписаны индексом, станции — только названием посёлка
    if cat == 'post_office' and not re.search(r'почт', named, re.IGNORECASE):
        return f'{base} {named}'
    if cat in ('station', 'halt') and not re.search(r'станц|платф|вокзал|остановоч|разъезд|\bо\.\s?п\.', named, re.IGNORECASE):
        return f'{base} {named}'
    return named


def center(geom):
    """Центр рамки объекта (для точки — сама точка)."""
    if not geom:
        return None
    if geom['type'] == 'Point':
        return geom['coordinates'][1], geom['coordinates'][0]
    lo = [180.0, 90.0, -180.0, -90.0]

    def walk(c):
        if isinstance(c[0], (int, float)):
            lo[0], lo[1], lo[2], lo[3] = min(lo[0], c[0]), min(lo[1], c[1]), max(lo[2], c[0]), max(lo[3], c[1])
        else:
            for x in c:
                walk(x)
    walk(geom['coordinates'])
    if lo[0] > lo[2]:
        return None
    return (lo[1] + lo[3]) / 2, (lo[0] + lo[2]) / 2


class Grid:
    """Сетка для поиска соседей: ячейка cell градусов."""
    def __init__(self, cell):
        self.cell, self.m = cell, defaultdict(list)

    def key(self, lat, lng):
        return int(math.floor(lat / self.cell)), int(math.floor(lng / self.cell))

    def add(self, o):
        self.m[self.key(o['lat'], o['lng'])].append(o)

    def near(self, lat, lng, r):
        dy = int(math.ceil(r / 111320 / self.cell))
        dx = int(math.ceil(r / (111320 * max(0.1, math.cos(math.radians(lat)))) / self.cell))
        ky, kx = self.key(lat, lng)
        for y in range(ky - dy, ky + dy + 1):
            for x in range(kx - dx, kx + dx + 1):
                for o in self.m.get((y, x), ()):
                    if dist(lat, lng, o['lat'], o['lng']) <= r:
                        yield o


def main():
    src, out = sys.argv[1], sys.argv[2]
    need = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    cand, settlements, seen = [], [], set()
    with open(src, encoding='utf-8') as f:
        for line in f:
            line = line.strip().lstrip('\x1e')
            if not line:
                continue
            ft = json.loads(line)
            t = ft.get('properties') or {}
            typ, oid = t.get('@type'), t.get('@id')
            if not typ or oid is None:
                continue
            id_ = f'osm:{typ[0]}{oid}'
            if id_ in seen:
                continue
            c = center(ft.get('geometry'))
            if not c:
                continue
            lat, lng = c
            named = (t.get('name:ru') or t.get('name') or '').strip()
            if typ == 'node' and t.get('place') in PLACES and named:
                seen.add(id_)
                settlements.append({'id': id_, 'type': t['place'], 'name': named, 'lat': lat, 'lng': lng})
                continue
            if t.get('access') == 'private' or t.get('disused') == 'yes' or t.get('abandoned') == 'yes':
                continue
            cat = next((t[k] for k in KEYS if t.get(k) in CATS), None)
            if not cat or (cat in NEED_NAME and not named):
                continue
            seen.add(id_)
            kind = 'shrine' if CATS[cat][1] and fnv(id_) < 0.45 else 'spring'
            score = (2 if named else 0) + (1 if kind == 'shrine' else 0) + (0.5 if typ != 'node' else 0) + fnv(id_ + 's') * 0.1
            cand.append({'id': id_, 'name': title(cat, t, named)[:80], 'kind': kind, 'cat': cat, 'lat': lat, 'lng': lng, 'score': score})

    # не ближе 35 м друг к другу: сначала заметные (именованные, будущие Капища, крупные)
    cand.sort(key=lambda o: (-o['score'], o['id']))
    fine = Grid(0.001)
    kept = []
    for o in cand:
        if any(True for _ in fine.near(o['lat'], o['lng'], MIN_GAP)):
            continue
        fine.add(o)
        kept.append(o)

    # у каждого населённого пункта — хотя бы одно место
    grid = Grid(0.01)
    for o in kept:
        grid.add(o)
    order = {'city': 0, 'town': 1, 'village': 2, 'hamlet': 3}
    settlements.sort(key=lambda s: (order[s['type']], s['id']))
    added = 0
    for s in settlements:
        if any(True for _ in grid.near(s['lat'], s['lng'], PLACES[s['type']][0])):
            continue
        o = {'id': s['id'], 'name': f"{SETTLEMENT_WORD[s['type']]} «{s['name']}»"[:80], 'kind': 'spring', 'cat': 'settlement',
             'lat': s['lat'], 'lng': s['lng'], 'score': 0}
        grid.add(o)
        kept.append(o)
        added += 1

    # в сёлах и городках с двумя и более местами — хотя бы одно Капище (у Капищ открываются Разломы)
    promoted = 0
    for s in settlements:
        r = PLACES[s['type']][1]
        if not r:
            continue
        around = list(grid.near(s['lat'], s['lng'], r))
        if len(around) < 2 or any(o['kind'] == 'shrine' for o in around):
            continue
        best = min(around, key=lambda o: (-CATS.get(o['cat'], ('', 0))[1], -o['score'], o['id']))
        best['kind'] = 'shrine'
        promoted += 1

    kept.sort(key=lambda o: o['id'])
    with open(out, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        for o in kept:
            w.writerow([o['id'], o['name'], o['kind'], o['cat'], f"{o['lat']:.7f}", f"{o['lng']:.7f}"])

    by_kind = defaultdict(int)
    by_cat = defaultdict(int)
    for o in kept:
        by_kind[o['kind']] += 1
        by_cat[o['cat']] += 1
    print(f'Мест: {len(kept)} (Родников {by_kind["spring"]}, Капищ {by_kind["shrine"]})')
    print(f'Населённых пунктов: {len(settlements)}, из них без объектов OSM — место у центра: {added}; Капищ назначено: {promoted}')
    print('По категориям: ' + ', '.join(f'{k} {v}' for k, v in sorted(by_cat.items(), key=lambda x: -x[1])))
    if len(kept) < need:
        sys.exit(f'Слишком мало мест: {len(kept)} < {need} — выгрузка неполная, в базу не загружаю')


if __name__ == '__main__':
    main()
