'use strict';
/* Настоящие места из OpenStreetMap: запрос к Overpass API и отбор заметных объектов.
   Используется игрой (pois.js) и панелью модерации. Отбор детерминирован: у всех игроков
   из одних и тех же данных OSM получаются одни и те же Родники и Капища. */

const Osm = {
  OVERPASS: [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ],
  MIN_GAP: 35, // минимум метров между объектами

  // категория → название по умолчанию и может ли объект стать Капищем
  CATS: {
    monument: ['Памятник', 1], memorial: ['Памятный знак', 0], castle: ['Крепость', 1], ruins: ['Руины', 1],
    archaeological_site: ['Древнее место', 1], manor: ['Усадьба', 1], city_gate: ['Городские ворота', 1],
    wayside_cross: ['Поклонный крест', 0], wayside_shrine: ['Часовенка', 0], boundary_stone: ['Межевой камень', 0],
    artwork: ['Арт-объект', 0], attraction: ['Достопримечательность', 1], viewpoint: ['Смотровая площадка', 1],
    museum: ['Музей', 1], place_of_worship: ['Храм', 0], fountain: ['Фонтан', 0], library: ['Библиотека', 0],
    theatre: ['Театр', 1], arts_centre: ['Дом культуры', 0], clock: ['Часы', 0], spring: ['Родник', 0], peak: ['Вершина', 1],
    park: ['Парк', 1], garden: ['Сад', 0], water_tower: ['Водонапорная башня', 1], lighthouse: ['Маяк', 1],
    windmill: ['Мельница', 1], watermill: ['Водяная мельница', 1],
  },

  query(s, w, n, e) {
    const bb = `(${s},${w},${n},${e})`;
    return `[out:json][timeout:25];(
nwr["historic"~"^(monument|memorial|castle|ruins|archaeological_site|manor|city_gate|wayside_cross|wayside_shrine|boundary_stone)$"]${bb};
nwr["tourism"~"^(artwork|attraction|viewpoint|museum)$"]${bb};
nwr["amenity"~"^(place_of_worship|fountain|library|theatre|arts_centre|clock)$"]${bb};
nwr["natural"~"^(spring|peak)$"]${bb};
nwr["leisure"~"^(park|garden)$"]["name"]${bb};
nwr["man_made"~"^(water_tower|lighthouse|windmill|watermill)$"]${bb};
);out center tags 1500;`;
  },

  // Загрузка прямоугольника. Публичные серверы Overpass бывают перегружены: если сервер отказал —
  // сразу спрашиваем следующий, если молчит дольше HEDGE мс — подключаем следующий параллельно; побеждает первый ответ.
  HEDGE: 6000,
  TIMEOUT: 30000,
  fetch(s, w, n, e) {
    const body = 'data=' + encodeURIComponent(this.query(s, w, n, e));
    return new Promise((resolve, reject) => {
      const ctls = [], errs = [];
      let next = 0, running = 0, done = false;
      const finish = (ok, val) => { if (done) return; done = true; ctls.forEach(c => c.abort()); ok ? resolve(val) : reject(val); };
      const launch = () => {
        if (done || next >= this.OVERPASS.length) return;
        const url = this.OVERPASS[next++], host = new URL(url).host, ctl = new AbortController();
        ctls.push(ctl); running++;
        const kill = setTimeout(() => ctl.abort(), this.TIMEOUT);
        const hedge = setTimeout(launch, this.HEDGE);
        fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: ctl.signal })
          .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
          .then(j => finish(true, this.pick(j.elements || [])))
          .catch(err => { errs.push(`${host}: ${err.name === 'AbortError' ? 'нет ответа' : err.message}`); clearTimeout(hedge); launch(); })
          .finally(() => {
            clearTimeout(kill); running--;
            if (!running && next >= this.OVERPASS.length) finish(false, new Error('OpenStreetMap не отвечает (' + errs.join('; ') + ')'));
          });
      };
      launch();
    });
  },

  // FNV-1a → [0, 1)
  hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967296;
  },
  dist(a, b, c, d) {
    const R = 6371000, r = Math.PI / 180;
    const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  },

  // Название для игрока. Памятники в OSM часто подписаны как на табличке («В. Ф. Снегирёву») — добавляем, что это.
  title(cat, t, named) {
    const base = cat === 'memorial' && t.memorial === 'plaque' ? 'Мемориальная доска' : this.CATS[cat][0];
    if (!named) return base;
    if ((cat === 'monument' || cat === 'memorial') && !/памят|мемориал|бюст|стел|обелиск|монумент|скульптур|статуя|знак|доска|крест|камень/i.test(named)) return `${base} ${named}`;
    return String(named);
  },

  // Элементы Overpass → объекты игры: { id, name, kind, cat, lat, lng }
  pick(elements) {
    const cand = [];
    for (const el of elements) {
      const t = el.tags || {};
      const lat = el.lat != null ? el.lat : el.center && el.center.lat, lng = el.lon != null ? el.lon : el.center && el.center.lon;
      if (lat == null || lng == null) continue;
      if (t.access === 'private' || t.disused === 'yes' || t.abandoned === 'yes') continue;
      const cat = [t.historic, t.tourism, t.amenity, t.natural, t.leisure, t.man_made].find(c => c && this.CATS[c]);
      if (!cat) continue;
      const named = t['name:ru'] || t.name;
      if (!named && (cat === 'garden' || cat === 'boundary_stone')) continue; // почти не видны на местности
      const id = `osm:${el.type[0]}${el.id}`;
      const kind = this.CATS[cat][1] && this.hash(id) < 0.45 ? 'shrine' : 'spring';
      // заметнее — важнее: именованные, будущие Капища, крупные объекты (линии и отношения)
      const score = (named ? 2 : 0) + (kind === 'shrine' ? 1 : 0) + (el.type !== 'node' ? 0.5 : 0) + this.hash(id + 's') * 0.1;
      cand.push({ id, name: this.title(cat, t, named).slice(0, 80), kind, cat, lat, lng, score });
    }
    cand.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
    const kept = [];
    for (const c of cand) if (!kept.some(k => this.dist(k.lat, k.lng, c.lat, c.lng) < this.MIN_GAP)) kept.push(c);
    return kept.map(({ score, ...rest }) => rest);
  },
};
