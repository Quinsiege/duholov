'use strict';
/* 5.1: Атлас мира — старинная карта Ордена. Реального GPS больше нет: Ловчий сам выбирает, куда шагнуть через Врата Перепутицы.
   5.1.6: шаг 1 — один глобус на ночном небе (ортографическая проекция, всё рисуется кодом в SVG): его крутят пальцем (по двум осям,
   с инерцией, наклон к полюсам ограничен), в покое он сам медленно вращается, при выборе материка плавно доворачивается к нему.
   Шаг 2 — тот же глобус приближается к материку: его места (или «Своё место» — точка на настоящей карте) и «Шагнуть во Врата» → Walk.teleport.
   Перепроекция — только когда вид изменился (перетаскивание, инерция, доворот, самовращение), одним кадром requestAnimationFrame.
   Открывается: пока у Ловчего нет места в мире игры (Walk.placed() — нет S.d.atlasV: новичок после книги-вступления, до обучения,
   или первый вход после 5.1) — сам, без выхода (Walk.ensurePlaced, main.js); дальше — меню «Атлас мира» и кнопка-глобус на карте.
   Перезарядка Врат (Rules.MOVE.TP_CD) и предмет «Врата Перепутицы» (Rules.MOVE.TP_ITEM) — решает сервер; Атлас только показывает
   и передаёт { first } или { item: true }. Модуль движения Walk (walk.js) может ещё не быть — тогда всё проверяется через typeof. */

const Atlas = {
  TILT: 62,     // наклон глобуса к полюсам — не больше, градусы
  SPIN: 0.004,  // самовращение в покое, градусов за миллисекунду (4°/с)
  // материки: label — точка подписи [долгота, широта] (к ней глобус доворачивается при выборе),
  // myths — мифологии, которые здесь «родом» (показываются только открытые — MYTH_KEYS), polys — очертания «долгота,широта …»
  LANDS: WORLD_LANDS, // 5.1.15: данные — в data.js (нужны и серверу)
  // места: [ключ, город, где именно появится Ловчий (площадь, улица), широта, долгота] — точка на суше, не в воде
  PLACES: {
    europe: [
      ['moscow', ru`Москва`, ru`Красная площадь`, 55.7539, 37.6208],
      ['spb', ru`Санкт-Петербург`, ru`Дворцовая площадь`, 59.9390, 30.3158],
      ['kazan', ru`Казань`, ru`Улица Баумана`, 55.7887, 49.1221],
      ['istanbul', ru`Стамбул`, ru`Площадь Султанахмет`, 41.0058, 28.9768],
      ['london', ru`Лондон`, ru`Трафальгарская площадь`, 51.5080, -0.1281],
      ['dublin', ru`Дублин`, ru`Улица О’Коннелла`, 53.3510, -6.2605],
      ['paris', ru`Париж`, ru`Марсово поле`, 48.8556, 2.2986],
      ['berlin', ru`Берлин`, ru`Бранденбургские ворота`, 52.5163, 13.3777],
      ['prague', ru`Прага`, ru`Староместская площадь`, 50.0875, 14.4213],
      ['rome', ru`Рим`, ru`Колизей`, 41.8902, 12.4922],
      ['athens', ru`Афины${''}`, ru`Площадь Синтагма`, 37.9755, 23.7348], // ключ «Афины{0}»: «Афины» в словаре — богиня (data.js)
      ['madrid', ru`Мадрид`, ru`Пуэрта-дель-Соль`, 40.4169, -3.7035],
      ['oslo', ru`Осло`, ru`Улица Карла Юхана`, 59.9133, 10.7389],
      ['stockholm', ru`Стокгольм`, ru`Старый город Гамла Стан`, 59.3251, 18.0710],
      ['reykjavik', ru`Рейкьявик`, ru`Церковь Хадльгримскиркья`, 64.1417, -21.9266],
    ],
    asia: [
      ['ekb', ru`Екатеринбург`, ru`Площадь 1905 года`, 56.8380, 60.5975],
      ['nsk', ru`Новосибирск`, ru`Площадь Ленина`, 55.0302, 82.9204],
      ['irk', ru`Иркутск`, ru`130-й квартал`, 52.2775, 104.2860],
      ['vvo', ru`Владивосток`, ru`Центральная площадь`, 43.1155, 131.8855],
      ['almaty', ru`Алматы`, ru`Площадь Республики`, 43.2380, 76.9454],
      ['tashkent', ru`Ташкент`, ru`Сквер Амира Темура`, 41.3111, 69.2797],
      ['dubai', ru`Дубай`, ru`Бурдж-Халифа`, 25.1972, 55.2744],
      ['delhi', ru`Нью-Дели`, ru`Ворота Индии`, 28.6129, 77.2295],
      ['beijing', ru`Пекин`, ru`Площадь Тяньаньмэнь`, 39.9055, 116.3976],
      ['shanghai', ru`Шанхай`, ru`Улица Нанкин-лу`, 31.2355, 121.4747],
      ['seoul', ru`Сеул`, ru`Площадь Кванхвамун`, 37.5720, 126.9769],
      ['tokyo', ru`Токио`, ru`Перекрёсток Сибуя`, 35.6595, 139.7005],
      ['bangkok', ru`Бангкок`, ru`Площадь Санам Луанг`, 13.7550, 100.4930],
      ['singapore', ru`Сингапур`, ru`Орчард-роуд`, 1.3048, 103.8318],
      ['jakarta', ru`Джакарта`, ru`Площадь Мердека`, -6.1754, 106.8272],
    ],
    africa: [
      ['cairo', ru`Каир`, ru`Площадь Тахрир`, 30.0444, 31.2357],
      ['giza', ru`Гиза`, ru`Плато пирамид`, 29.9773, 31.1325],
      ['luxor', ru`Луксор`, ru`Карнакский храм`, 25.7188, 32.6573],
      ['marrakesh', ru`Марракеш`, ru`Площадь Джемаа-эль-Фна`, 31.6258, -7.9891],
      ['tunis', ru`Тунис`, ru`Проспект Хабиба Бургибы`, 36.8008, 10.1815],
      ['dakar', ru`Дакар`, ru`Площадь Независимости`, 14.6675, -17.4318],
      ['lagos', ru`Лагос`, ru`Остров Лагос`, 6.4550, 3.3940],
      ['addis', ru`Аддис-Абеба`, ru`Площадь Мескель`, 9.0108, 38.7613],
      ['nairobi', ru`Найроби`, ru`Проспект Кениаты`, -1.2864, 36.8172],
      ['zanzibar', ru`Занзибар`, ru`Каменный город`, -6.1622, 39.1890],
      ['capetown', ru`Кейптаун`, ru`Гринмаркет-сквер`, -33.9209, 18.4204],
      ['joburg', ru`Йоханнесбург`, ru`Площадь Нельсона Манделы`, -26.1076, 28.0567],
    ],
    namerica: [
      ['nyc', ru`Нью-Йорк`, ru`Таймс-сквер`, 40.7580, -73.9855],
      ['dc', ru`Вашингтон`, ru`Национальная аллея`, 38.8895, -77.0230],
      ['chicago', ru`Чикаго`, ru`Миллениум-парк`, 41.8826, -87.6226],
      ['nola', ru`Новый Орлеан`, ru`Площадь Джексона`, 29.9574, -90.0629],
      ['la', ru`Лос-Анджелес`, ru`Голливудский бульвар`, 34.1016, -118.3267],
      ['sf', ru`Сан-Франциско`, ru`Юнион-сквер`, 37.7880, -122.4075],
      ['vancouver', ru`Ванкувер`, ru`Робсон-сквер`, 49.2820, -123.1210],
      ['toronto', ru`Торонто`, ru`Площадь Натана Филлипса`, 43.6525, -79.3832],
      ['montreal', ru`Монреаль`, ru`Площадь Армс`, 45.5046, -73.5566],
      ['mexico', ru`Мехико`, ru`Площадь Сокало`, 19.4326, -99.1332],
      ['teotihuacan', ru`Теотиуакан`, ru`Дорога мёртвых`, 19.6925, -98.8438],
      ['chichen', ru`Чичен-Ица`, ru`Пирамида Кукулькана`, 20.6843, -88.5678],
      ['havana', ru`Гавана`, ru`Старая площадь`, 23.1361, -82.3506],
    ],
    samerica: [
      ['bogota', ru`Богота`, ru`Площадь Боливара`, 4.5981, -74.0760],
      ['quito', ru`Кито`, ru`Площадь Независимости`, -0.2201, -78.5123],
      ['lima', ru`Лима`, ru`Главная площадь`, -12.0464, -77.0305],
      ['cusco', ru`Куско`, ru`Площадь Армас`, -13.5167, -71.9787],
      ['machu', ru`Мачу-Пикчу`, ru`Город инков в горах`, -13.1631, -72.5450],
      ['manaus', ru`Манаус`, ru`Театр Амазонас`, -3.1302, -60.0234],
      ['rio', ru`Рио-де-Жанейро`, ru`Набережная Копакабаны`, -22.9711, -43.1822],
      ['saopaulo', ru`Сан-Паулу`, ru`Проспект Паулиста`, -23.5614, -46.6559],
      ['baires', ru`Буэнос-Айрес`, ru`Майская площадь`, -34.6083, -58.3712],
      ['santiago', ru`Сантьяго`, ru`Площадь Армас`, -33.4378, -70.6505],
      ['ushuaia', ru`Ушуая`, ru`Город на краю света`, -54.8060, -68.3050],
    ],
    oceania: [
      ['sydney', ru`Сидней`, ru`Сиднейский оперный театр`, -33.8587, 151.2140],
      ['melbourne', ru`Мельбурн`, ru`Федерейшн-сквер`, -37.8180, 144.9691],
      ['brisbane', ru`Брисбен`, ru`Саут-Бэнк`, -27.4785, 153.0230],
      ['perth', ru`Перт`, ru`Кингс-парк`, -31.9610, 115.8330],
      ['adelaide', ru`Аделаида`, ru`Рандл-молл`, -34.9225, 138.6030],
      ['darwin', ru`Дарвин`, ru`Митчелл-стрит`, -12.4630, 130.8410],
      ['uluru', ru`Улуру`, ru`У подножия Красной скалы`, -25.3530, 131.0350],
      ['hobart', ru`Хобарт`, ru`Саламанка-плейс`, -42.8870, 147.3320],
      ['auckland', ru`Окленд`, ru`Куин-стрит`, -36.8485, 174.7633],
      ['wellington', ru`Веллингтон`, ru`Куба-стрит`, -41.2924, 174.7760],
      ['queenstown', ru`Квинстаун`, ru`Город у Южных Альп`, -45.0312, 168.6626],
    ],
  },

  el: null, opts: null, step: 1, land: null, pick: null, sel: null,
  G: null,      // глобус на экране: svg, размер, радиус, центр, поворот и ссылки на его части
  view: null,   // { lng, lat } — точка земли в центре глобуса
  _s: 0,        // приближение: 0 — весь глобус, 1 — материк во всё окно (шаг 2)
  GATE_MS: 1300, // сколько портал Врат раскрывается, даже если сервер ответил раньше

  /* ---------- состояние Врат (модуль движения Walk — от помощника «Движение») ---------- */
  walk() { return typeof Walk !== 'undefined' ? Walk : null; },
  placed() { const w = this.walk(); try { return !w || !w.placed || !!w.placed(); } catch (e) { return true; } },
  cd() { const w = this.walk(); try { return (w && w.cooldownLeft && w.cooldownLeft()) || 0; } catch (e) { return 0; } },
  itemKey() { return (typeof Rules !== 'undefined' && Rules.MOVE && Rules.MOVE.TP_ITEM) || 'gate'; },
  items() { const w = this.walk(); if (w && w.gates) return w.gates(); return (S.d && S.d.items && S.d.items[this.itemKey()]) || 0; },
  cdMin() { return Math.max(1, Math.ceil(this.cd() / 60000)); },
  tpMin() { return Math.round(((typeof Rules !== 'undefined' && Rules.MOVE && Rules.MOVE.TP_CD) || 30 * 60000) / 60000); },

  /* ---------- глобус: ортографическая проекция ---------- */
  ring(str) { return str.split(' ').map(p => p.split(',').map(Number)); },
  // точка в [долгота, широта] внутри очертания (чётно-нечётное правило)
  inPoly(r, x, y) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; },
  // точка земли — единичный вектор: x — к долготе 0, y — к 90° в. д., z — к северному полюсу
  vec(lng, lat) { const r = Math.PI / 180, f = lat * r, l = lng * r, c = Math.cos(f); return [c * Math.cos(l), c * Math.sin(l), Math.sin(f)]; },
  // поворот вида с центром (lng, lat): строки — «вправо», «вверх», «к зрителю»
  mat(lng, lat) {
    const r = Math.PI / 180, sl = Math.sin(lng * r), cl = Math.cos(lng * r), sf = Math.sin(lat * r), cf = Math.cos(lat * r);
    return [-sl, cl, 0, -cl * sf, -sl * sf, cf, cl * cf, sl * cf, sf];
  },
  // [вправо, вверх, глубина] в радиусах глобуса; глубина < 0 — точка на обратной стороне
  rot(M, v) { return [M[0] * v[0] + M[1] * v[1], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]]; },
  // точка на глобусе (в радиусах от центра, «вверх» — плюс) → [долгота, широта]; мимо глобуса — null
  unproj(M, e, u) {
    const q = e * e + u * u; if (q > 1) return null;
    const d = Math.sqrt(1 - q), X = e * M[0] + u * M[3] + d * M[6], Y = e * M[1] + u * M[4] + d * M[7], Z = u * M[5] + d * M[8];
    return [Math.atan2(Y, X) * 180 / Math.PI, Math.asin(Math.max(-1, Math.min(1, Z))) * 180 / Math.PI];
  },
  clampLat(f) { return Math.max(-this.TILT, Math.min(this.TILT, f)); },
  // вся геометрия — один раз: очертания, сетка, города и подписи как векторы на сфере
  geo() {
    if (this._geo) return this._geo;
    const V = (lng, lat) => this.vec(lng, lat), grat = [], eq = [];
    for (let lng = -180; lng < 180; lng += 20) { const a = []; for (let lat = -80; lat <= 80; lat += 5) a.push(V(lng, lat)); grat.push(a); }
    for (let lat = -60; lat <= 60; lat += 20) { if (!lat) continue; const a = []; for (let lng = -180; lng <= 180; lng += 5) a.push(V(lng, lat)); grat.push(a); }
    for (let lng = -180; lng <= 180; lng += 5) eq.push(V(lng, 0));
    const rings = this.LANDS.map(l => l.polys.map(s => this.ring(s)));
    return this._geo = { rings, grat, eq: [eq],
      lands: rings.map(rs => rs.map(r => r.map(p => V(p[0], p[1])))),
      cities: this.LANDS.map(l => (this.PLACES[l.id] || []).map(p => V(p[4], p[3]))),
      label: this.LANDS.map(l => V(l.label[0], l.label[1])) };
  },
  // точка на краю глобуса между видимой и скрытой (проекция линейна — пересечение с «глубиной 0» точное)
  cut(a, b) { const t = a[2] / (a[2] - b[2]), e = a[0] + (b[0] - a[0]) * t, u = a[1] + (b[1] - a[1]) * t, k = 1 / (Math.hypot(e, u) || 1); return [e * k, u * k]; },
  // замкнутое очертание: видимая часть, а где оно уходит за край — дугой по краю глобуса (без хорд через шар)
  ringPath(ring, M, R, cx, cy) {
    const n = ring.length, P = ring.map(v => this.rot(M, v)), pt = (e, u) => (cx + R * e).toFixed(1) + ' ' + (cy - R * u).toFixed(1);
    let vis = 0; for (const p of P) if (p[2] >= 0) vis++;
    if (!vis) return '';
    if (vis === n) return 'M' + P.map(p => pt(p[0], p[1])).join('L') + 'Z';
    let s = 0; while (!(P[s][2] >= 0 && P[(s + n - 1) % n][2] < 0)) s++; // начало — там, где очертание выходит из-за края
    const out = []; let ex = null;
    for (let k = 0; k < n; k++) {
      const i = (s + k) % n, a = P[i], b = P[(i + 1) % n];
      if (a[2] >= 0) { out.push(pt(a[0], a[1])); if (b[2] < 0) { const X = this.cut(a, b); out.push(pt(X[0], X[1])); ex = Math.atan2(X[1], X[0]); } }
      else if (b[2] >= 0) {
        const X = this.cut(a, b), a1 = Math.atan2(X[1], X[0]);
        if (ex != null) {
          let da = a1 - ex; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
          const st = Math.ceil(Math.abs(da) / 0.14);
          for (let q = 1; q < st; q++) { const g = ex + da * q / st; out.push(pt(Math.cos(g), Math.sin(g))); }
        }
        out.push(pt(X[0], X[1]));
      }
    }
    return 'M' + out.join('L') + 'Z';
  },
  // линии сетки: только видимые куски, обрезанные точно по краю
  linePath(lines, M, R, cx, cy) {
    const pt = (e, u) => (cx + R * e).toFixed(1) + ' ' + (cy - R * u).toFixed(1);
    let d = '';
    for (const L of lines) {
      let on = false, prev = null;
      for (const v of L) {
        const p = this.rot(M, v);
        if (p[2] >= 0) {
          if (on) d += 'L' + pt(p[0], p[1]);
          else { if (prev) { const X = this.cut(prev, p); d += 'M' + pt(X[0], X[1]) + 'L' + pt(p[0], p[1]); } else d += 'M' + pt(p[0], p[1]); on = true; }
        } else if (on) { const X = this.cut(prev, p); d += 'L' + pt(X[0], X[1]); on = false; }
        prev = p;
      }
    }
    return d;
  },

  /* ---------- глобус на экране: висит прямо на ночном небе — без диска, обода и подложки ---------- */
  // вода — полупрозрачное стекло (небо и туманы просвечивают), по краю — дымка атмосферы, свет сверху слева, тень к краю справа снизу
  globe() {
    const lbl = this.LANDS.map(l => {
      // длинное название — в две строки, по пробелу ближе к середине (на любом языке)
      const sm = l.id === 'europe' || l.cold, nm = l.name, mid = nm.length / 2;
      let cut = -1; for (let i = 0; i < nm.length; i++) if (nm[i] === ' ' && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
      const lines = nm.length > 10 && cut > 0 ? [nm.slice(0, cut), nm.slice(cut + 1)] : [nm];
      return `<text class="at-lbl${sm ? ' sm' : ''}${l.cold ? ' cold' : ''}" data-l="${l.id}">${lines.map((t, i) => `<tspan x="0" dy="${i ? '1.1em' : lines.length > 1 ? '-0.2em' : '0.35em'}">${U.esc(t)}</tspan>`).join('')}</text>`;
    }).join('');
    return `<svg class="at-svg" viewBox="0 0 390 400" aria-hidden="true"><defs>
      <radialGradient id="atAir" cx="50%" cy="50%" r="50%"><stop offset=".84" stop-color="#38bdf8" stop-opacity="0"/><stop offset=".888" stop-color="#7dd3fc" stop-opacity=".5"/>
        <stop offset=".93" stop-color="#818cf8" stop-opacity=".16"/><stop offset="1" stop-color="#818cf8" stop-opacity="0"/></radialGradient>
      <radialGradient id="atSea" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#2563eb" stop-opacity=".46"/><stop offset=".72" stop-color="#1d4ed8" stop-opacity=".5"/>
        <stop offset=".94" stop-color="#1e3a8a" stop-opacity=".62"/><stop offset="1" stop-color="#93c5fd" stop-opacity=".62"/></radialGradient>
      <radialGradient id="atLight" cx="34%" cy="28%" r="78%"><stop offset="0" stop-color="#e0f2fe" stop-opacity=".2"/><stop offset=".36" stop-color="#0b1030" stop-opacity="0"/>
        <stop offset=".72" stop-color="#050a24" stop-opacity=".3"/><stop offset="1" stop-color="#03061a" stop-opacity=".66"/></radialGradient>
      <radialGradient id="atSpec" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="atLand" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#a7f3d0" stop-opacity=".62"/><stop offset=".55" stop-color="#5eead4" stop-opacity=".42"/><stop offset="1" stop-color="#0d9488" stop-opacity=".34"/></linearGradient>
      <linearGradient id="atLandOn" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#fef3c7" stop-opacity=".9"/><stop offset=".55" stop-color="#fcd34d" stop-opacity=".66"/><stop offset="1" stop-color="#d97706" stop-opacity=".52"/></linearGradient>
      </defs>
      <circle class="at-air" fill="url(#atAir)"/><circle class="at-sea" fill="url(#atSea)"/>
      <path class="at-grat"/><path class="at-eq"/>
      <g class="at-lands">${this.LANDS.map(l => `<g class="at-land${l.cold ? ' cold' : ''}" data-l="${l.id}"><path class="h"/><path class="f"/></g>`).join('')}</g>
      <circle class="at-light" fill="url(#atLight)"/><ellipse class="at-spec" fill="url(#atSpec)"/>
      <path class="at-cities"/><path class="at-cities on"/>
      <g class="at-me"><g class="at-mek"><circle class="w" r="7"/><path d="M0 -5l4 5-4 5-4-5z"/></g></g>
      <g class="at-pts"></g><g class="at-lbls">${lbl}</g></svg>`;
  },
  // размер окна глобуса (viewBox = пиксели, 1:1); true — если изменился
  measure() {
    const G = this.G, b = G.svg.getBoundingClientRect(), W = Math.max(1, Math.round(b.width)), H = Math.max(1, Math.round(b.height));
    if (W === G.W && H === G.H) return false;
    G.W = W; G.H = H; G.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    return true;
  },
  // перерисовать глобус под текущий вид: шаг 1 — весь шар по центру окна, шаг 2 (this._s → 1) — места материка во всё окно
  draw() {
    const G = this.G; if (!G) return;
    const v = this.view, s = this._s, W = G.W || 390, H = G.H || 400, R1 = Math.max(40, Math.min(W, H) / 2 / 1.14);
    v.lng = ((v.lng % 360) + 540) % 360 - 180;
    let R = R1, cx = W / 2, cy = H / 2;
    if (s > 0 && this._fit) {
      const f = this._fit, Rf = Math.max(R1, Math.min(R1 * 9, (W - 64) / Math.max(.01, f[2] - f[0]), (H - 72) / Math.max(.01, f[3] - f[1])));
      R = R1 * Math.pow(Rf / R1, s);
      cx -= (f[0] + f[2]) / 2 * R * s; cy += ((f[1] + f[3]) / 2 * R + 8) * s;
    }
    const M = G.M = this.mat(v.lng, v.lat), geo = this.geo(), A = (el, o) => { for (const k in o) el.setAttribute(k, o[k]); };
    G.R = R; G.cx = cx; G.cy = cy;
    const c = { cx: cx.toFixed(1), cy: cy.toFixed(1) };
    A(G.sea, { ...c, r: R.toFixed(1) }); A(G.light, { ...c, r: R.toFixed(1) }); A(G.air, { ...c, r: (R * 1.13).toFixed(1) });
    A(G.spec, { cx: (cx - R * .4).toFixed(1), cy: (cy - R * .5).toFixed(1), rx: (R * .36).toFixed(1), ry: (R * .16).toFixed(1), transform: `rotate(-32 ${(cx - R * .4).toFixed(1)} ${(cy - R * .5).toFixed(1)})` });
    G.grat.setAttribute('d', this.linePath(geo.grat, M, R, cx, cy));
    G.eq.setAttribute('d', this.linePath(geo.eq, M, R, cx, cy));
    geo.lands.forEach((rs, i) => { const d = rs.map(r => this.ringPath(r, M, R, cx, cy)).join(''); G.lands[i][1].setAttribute('d', d); G.lands[i][0].setAttribute('d', this.LANDS[i].id === this.land ? d : ''); });
    // города: у выбранного материка — ярче
    if (s < 1) {
      let a = '', b = '';
      geo.cities.forEach((cs, i) => { const on = this.LANDS[i].id === this.land, r = on ? 2.6 : 1.6;
        for (const w of cs) { const p = this.rot(M, w); if (p[2] < .06) continue;
          const x = cx + R * p[0], y = cy - R * p[1], t = `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
          if (on) b += t; else a += t; } });
      G.dots.setAttribute('d', a); G.dotsOn.setAttribute('d', b);
    }
    // подписи материков — прямо на глобусе; у края гаснут
    G.lblXY = geo.label.map((w, i) => { const p = this.rot(M, w), el = G.lbls[i];
      if (p[2] < .12 || s >= 1) { el.style.opacity = 0; return null; }
      const x = cx + R * p[0], y = cy - R * p[1];
      el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`); el.style.opacity = Math.min(1, (p[2] - .12) * 4).toFixed(2);
      return [x, y]; });
    // где Ловчий сейчас
    const w = this.walk(), me = w && this.placed() && w.pos, mp = me && isFinite(me.lat) ? this.rot(M, this.vec(me.lng, me.lat)) : null;
    if (mp && mp[2] > .05) { G.me.style.display = ''; G.me.setAttribute('transform', `translate(${(cx + R * mp[0]).toFixed(1)} ${(cy - R * mp[1]).toFixed(1)})`); } else G.me.style.display = 'none';
    // шаг 2: места материка
    const li = this.LANDS.findIndex(l => l.id === this.land), cs = li >= 0 ? geo.cities[li] : [];
    G.ptsXY = G.ptEls.map((el, i) => { const p = cs[i] && this.rot(M, cs[i]);
      if (!p || p[2] < 0) { el.style.display = 'none'; return null; }
      const x = cx + R * p[0], y = cy - R * p[1]; el.style.display = ''; el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      return [x, y]; });
  },

  /* ---------- вращение: кадр рисуется, только когда вид изменился ---------- */
  calm() { return document.body.classList.contains('calm'); },
  still() { // «Меньше движения», экономия батареи или системная настройка — глобус сам не вращается
    if (this._rm === undefined) this._rm = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    return this.calm() || document.body.classList.contains('eco') || !!(this._rm && this._rm.matches);
  },
  ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  kick() { if (!this._raf && this.el) this._raf = requestAnimationFrame(t => this.frame(t)); },
  spins(now) { return this.step === 1 && !this.land && !this._drag && !this._tw && !this.pick && now - (this._touchT || 0) > 2500 && !this.still(); },
  frame(now) {
    this._raf = 0;
    if (!this.el || !this.G) return;
    const dt = Math.min(48, Math.max(0, now - (this._ft || now))), v = this.view;
    this._ft = now;
    let dirty = this._dirty, more = false;
    this._dirty = false;
    if (now < (this._boxT || 0)) { dirty = this.measure() || dirty; more = true; } // окно глобуса меняет размер (панель растёт или сжимается)
    if (this._tw) { const w = this._tw, e = this.ease(Math.min(1, (now - w.t0) / w.ms)); v.lng = w.l0 + w.dl * e; v.lat = w.f0 + w.df * e; if (e >= 1) this._tw = null; dirty = true; }
    if (this._sw) { const w = this._sw, e = this.ease(Math.min(1, (now - w.t0) / w.ms)); this._s = w.s0 + w.ds * e; if (e >= 1) this._sw = null; dirty = true; }
    if (!this._tw && !this._drag && (this._vx || this._vy)) { // инерция после броска
      v.lng += this._vx * dt; v.lat = this.clampLat(v.lat + this._vy * dt);
      const k = Math.pow(.9955, dt); this._vx *= k; this._vy *= k;
      if (Math.hypot(this._vx, this._vy) < .0008) this._vx = this._vy = 0;
      dirty = true;
    } else if (this.spins(now)) { v.lng -= this.SPIN * dt; dirty = true; more = true; }
    if (dirty) this.draw();
    if (more || this._tw || this._sw || this._vx || this._vy) this.kick();
  },
  // плавно повернуть глобус к точке (кратчайшим путём по долготе)
  turn(lng, lat, ms = 750) {
    const v = this.view, dl = (((lng - v.lng) % 360) + 540) % 360 - 180;
    this._vx = this._vy = 0;
    this._tw = { t0: performance.now(), ms: this.calm() ? 1 : ms, l0: v.lng, dl, f0: v.lat, df: this.clampLat(lat) - v.lat };
    this.kick();
  },
  zoom(s, ms = 800) { this._sw = { t0: performance.now(), ms: this.calm() ? 1 : ms, s0: this._s, ds: s - this._s }; this.kick(); },
  boxAnim(ms) { this._boxT = performance.now() + ms; this.kick(); },
  // палец или мышь: тянуть — вращать (по двум осям, наклон ограничен), отпустить — инерция, коснуться — выбрать
  bind() {
    const svg = this.G.svg;
    svg.addEventListener('pointerdown', e => {
      if (this._busy || this._drag || (e.pointerType === 'mouse' && e.button)) return;
      try { svg.setPointerCapture(e.pointerId); } catch (x) { /* и так дойдёт */ }
      this._drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), moved: false, hist: [] };
      this._tw = null; this._vx = this._vy = 0; this._touchT = performance.now();
    });
    svg.addEventListener('pointermove', e => {
      const d = this._drag; if (!d || d.id !== e.pointerId || !this.G) return;
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 7) return;
      const k = 180 / Math.PI / this.G.R, dx = (e.clientX - d.x) * k, dy = (e.clientY - d.y) * k, now = performance.now();
      d.moved = true; d.x = e.clientX; d.y = e.clientY;
      this.view.lng -= dx; this.view.lat = this.clampLat(this.view.lat + dy);
      d.hist.push([now, -dx, dy]); while (d.hist.length > 1 && now - d.hist[0][0] > 90) d.hist.shift();
      this._dirty = true; this.kick();
    });
    const up = e => {
      const d = this._drag; if (!d || d.id !== e.pointerId) return;
      const now = performance.now();
      this._drag = null; this._touchT = now;
      if (!d.moved) { if (e.type === 'pointerup' && now - d.t0 < 700) { const b = svg.getBoundingClientRect(); this.tap(e.clientX - b.left, e.clientY - b.top); } }
      else if (!this.calm()) {
        const h = d.hist;
        if (h.length && now - h[h.length - 1][0] < 70) { const span = Math.max(16, now - h[0][0]); this._vx = h.reduce((a, q) => a + q[1], 0) / span; this._vy = h.reduce((a, q) => a + q[2], 0) / span; }
      }
      clearTimeout(this._spinT); this._spinT = setTimeout(() => this.kick(), 2600); // самовращение вернётся само
      this.kick();
    };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  },
  // касание: шаг 1 — материк (по подписи или по очертанию под пальцем), шаг 2 — ближайшее место
  tap(x, y) {
    const G = this.G; if (!G || !G.M) return;
    const near = (pts, r) => { let best = -1, bd = r; pts.forEach((q, i) => { if (q) { const d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; best = i; } } }); return best; };
    if (this.step === 2) { const i = near(G.ptsXY, 28); if (i >= 0) this.choose(i); return; }
    let i = near(G.lblXY, 30);
    if (i < 0) {
      const ll = this.unproj(G.M, (x - G.cx) / G.R, (G.cy - y) / G.R); if (!ll) return;
      const geo = this.geo();
      i = geo.rings.findIndex(rs => rs.some(r => this.inPoly(r, ll[0], ll[1])));
      if (i < 0 && ll[1] < -64) i = this.LANDS.findIndex(l => l.cold);
      if (i < 0) { // рядом с берегом или у островов — ближайший материк, если он недалеко
        const w = this.vec(ll[0], ll[1]); let bd = Math.cos(14 * Math.PI / 180);
        geo.label.forEach((q, k) => { const dot = q[0] * w[0] + q[1] * w[1] + q[2] * w[2]; if (dot > bd) { bd = dot; i = k; } });
      }
    }
    if (i >= 0) this.select(this.LANDS[i].id, true);
  },

  // значок меню и кнопки на карте: старинный глобус на золотой подставке (в стиле значков UI.menuIcon)
  icon() {
    const p = 'ati' + (this._iN = (this._iN || 0) + 1);
    return `<svg class="mi art" viewBox="0 0 100 100" aria-hidden="true"><defs>
      <radialGradient id="${p}s" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#93c5fd"/><stop offset=".5" stop-color="#2563eb"/><stop offset="1" stop-color="#172554"/></radialGradient>
      <linearGradient id="${p}a" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="#fff7d1"/><stop offset=".35" stop-color="#f7d77e"/><stop offset=".75" stop-color="#d59a36"/><stop offset="1" stop-color="#8a5a14"/></linearGradient>
      <linearGradient id="${p}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a7f3d0"/><stop offset="1" stop-color="#10b981"/></linearGradient>
      <clipPath id="${p}c"><circle cx="48" cy="43" r="29"/></clipPath></defs>
      <ellipse cx="50" cy="93" rx="26" ry="5" fill="#000" opacity=".3"/>
      <path d="M36 90h28l-4-9H40z" fill="url(#${p}a)" stroke="#4a2c06" stroke-width="2.6" stroke-linejoin="round"/><path d="M48 72v10" stroke="#4a2c06" stroke-width="5"/><path d="M48 72v10" stroke="url(#${p}a)" stroke-width="2.4"/>
      <circle cx="48" cy="43" r="29" fill="url(#${p}s)" stroke="#172554" stroke-width="3"/>
      <g clip-path="url(#${p}c)" fill="url(#${p}g)" stroke="#065f46" stroke-width="1.6" stroke-linejoin="round">
        <path d="M24 26c6-4 13-3 15 2s-2 8 1 12-3 9-8 8-4-7-9-9-5-9 1-13z"/><path d="M50 22c8-3 18 0 22 6s0 7-5 8-7 6-11 4 1-6-4-8-8-7-2-10z"/><path d="M52 44c5-1 9 2 9 7s-4 9-3 13-4 5-6 1-1-8-3-11 0-9 3-10z"/></g>
      <path d="M22 43h52M48 14v58" stroke="#bfdbfe" stroke-width="1" opacity=".45" clip-path="url(#${p}c)"/>
      <path d="M17 58A33 33 0 0 1 72 17" fill="none" stroke="#4a2c06" stroke-width="7" stroke-linecap="round"/><path d="M17 58A33 33 0 0 1 72 17" fill="none" stroke="url(#${p}a)" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M72 17A33 33 0 0 1 81 43A33 33 0 0 1 64 72" fill="none" stroke="#4a2c06" stroke-width="7" stroke-linecap="round"/><path d="M72 17A33 33 0 0 1 81 43A33 33 0 0 1 64 72" fill="none" stroke="url(#${p}a)" stroke-width="4.2" stroke-linecap="round"/>
      <ellipse cx="38" cy="31" rx="9" ry="4.5" transform="rotate(-35 38 31)" fill="#fff" opacity=".45"/>
      <path d="M84 12Q84 17 89 17Q84 17 84 22Q84 17 79 17Q84 17 84 12Z" fill="#fff7d1"/></svg>`;
  },
  // маленький значок Врат (арка с вихрем) — если у предмета нет своей картинки
  gateIcon() {
    const it = this.itemKey();
    if (typeof ITEMS !== 'undefined' && ITEMS[it] && typeof Art !== 'undefined' && Art.item) { try { const s = Art.item(it); if (s && s.length > 40) return s; } catch (e) { /* своя арка ниже */ } }
    return `<svg class="at-gi" viewBox="0 0 40 40" aria-hidden="true"><path d="M8 36V18a12 12 0 0 1 24 0v18" fill="#1e1b4b" stroke="#f3cf6b" stroke-width="3" stroke-linejoin="round"/>
      <path d="M20 12c5 1 7 6 4 10s-9 3-9-1 5-5 6-2" fill="none" stroke="#5eead4" stroke-width="2.2" stroke-linecap="round"/><path d="M5 36h30" stroke="#f3cf6b" stroke-width="3" stroke-linecap="round"/></svg>`;
  },

  /* ---------- экран ---------- */
  // opts: first — первое появление (даром; закрыть нельзя, пока место не выбрано)
  open(opts = {}) {
    if (this.el) return;
    if (!opts.first && this.walk() && !this.placed()) opts = { ...opts, first: true }; // места ещё нет — это и есть первое появление (даром)
    try { Sfx.init(); Sfx.play('tap'); } catch (e) { /* без звука */ }
    this.opts = opts; this.step = 1; this.land = null; this.pick = null; this.sel = null;
    this._s = 0; this._fit = null; this._tw = this._sw = null; this._vx = this._vy = 0; this._drag = null; this._touchT = 0; this._ft = 0;
    // глобус сначала смотрит туда, где Ловчий сейчас (новичок — на Старый Свет)
    const w = this.walk(), p = w && this.placed() && w.pos;
    this.view = p && isFinite(p.lat) && isFinite(p.lng) ? { lng: p.lng + 12, lat: this.clampLat(p.lat * .55) } : { lng: 32, lat: 22 };
    const story = opts.first;
    const el = this.el = U.el(`<div class="atlas${opts.first ? ' first' : ''}" role="dialog" aria-modal="true" aria-label="${ru`Атлас мира`}">
      <i class="at-fog f1"></i><i class="at-fog f2"></i>
      <div class="at-head">
        <button class="btn-round at-back" aria-label="${ru`Назад`}">${UI.I.back}</button>
        <div class="at-ttl"><small>${ru`Орден Оберега`}</small><h2>${ru`Атлас мира`}</h2></div>
        ${opts.first ? '' : `<button class="btn-round at-x" aria-label="${ru`Закрыть`}">${UI.I.close}</button>`}
      </div>
      ${story ? `<p class="at-story">${ru`Врата Перепутицы открыты. Куда шагнёшь, Ловчий?`}</p>` : ''}
      <div class="at-map">${this.globe()}</div>
      <div class="at-panel"></div>
    </div>`);
    document.body.appendChild(el); // сцена для Stage (stage.js): через COVER_MS карта, HUD и погода под ней не рисуются
    // пока Атлас открыт, ни под ним, ни поверх — ничего чужого: подсказки обучения, чужие всплывашки, плашка обновления (style.css, body.atlas-on)
    document.body.classList.add('atlas-on');
    const svg = el.querySelector('.at-svg'), q = s => svg.querySelector(s);
    this.G = { svg, W: 0, H: 0, R: 100, cx: 0, cy: 0, M: null,
      air: q('.at-air'), sea: q('.at-sea'), light: q('.at-light'), spec: q('.at-spec'), grat: q('.at-grat'), eq: q('.at-eq'),
      lands: [...svg.querySelectorAll('.at-land')].map(g => [g.querySelector('.h'), g.querySelector('.f')]),
      dots: q('.at-cities:not(.on)'), dotsOn: q('.at-cities.on'), lbls: [...svg.querySelectorAll('.at-lbl')], me: q('.at-mek'), pts: q('.at-pts'),
      ptEls: [], ptsXY: [], lblXY: [] };
    this.bind();
    el.querySelector('.at-back').onclick = () => { Sfx.play('tap'); this.back(); };
    const x = el.querySelector('.at-x'); if (x) x.onclick = () => { Sfx.play('tap'); this.close(); };
    this.layer = () => this.back();
    UI.pushLayer(this.layer);
    this.key = e => { if (e.key === 'Escape') this.back(); };
    document.addEventListener('keydown', this.key);
    this.rs = () => { if (this.G && this.measure()) { this._dirty = true; this.kick(); } };
    addEventListener('resize', this.rs);
    this.tmr = setInterval(() => this.status(), 15000);
    this.panel();
    this.measure(); this.draw(); this.kick();
    requestAnimationFrame(() => el.classList.add('in'));
  },
  // «Назад»: выбор точки → места → материки → закрыть (первое появление закрыть нельзя)
  back() {
    if (!this.el || this._busy) return;
    if (this.el.querySelector('.at-cd')) { this.el.querySelector('.at-cd')._no(); return; }
    if (this.pick) { this.pickClose(); return; }
    if (this.step === 2) { this.toWorld(); return; }
    if (this.opts.first) { UI.toast(ru`Сначала выбери, куда шагнуть`, 'at-t'); return; }
    this.close();
  },
  close() {
    const el = this.el; if (!el) return;
    this.el = null;
    clearInterval(this.tmr); cancelAnimationFrame(this._raf); this._raf = 0; clearTimeout(this._spinT);
    document.removeEventListener('keydown', this.key);
    removeEventListener('resize', this.rs);
    if (this.layer) { UI.popLayer(this.layer); this.layer = null; }
    if (this.pick) { clearTimeout(this.pick.t); this.pick = null; }
    if (this.pmap) { try { this.pmap.remove(); } catch (e) { /* уже убрана */ } this.pmap = null; }
    this.G = null; this._drag = null;
    document.body.classList.remove('atlas-on');
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  },

  // состояние Врат для подписи: открыты / сколько ждать / сколько предметов
  status() {
    if (!this.el) return;
    const s = this.el.querySelector('.at-gates'); if (!s) return;
    const cd = this.cd(), n = this.items();
    s.classList.toggle('rest', cd > 0);
    s.innerHTML = cd > 0 ? `${this.gateIcon()}<span>${ru`Врата откроются через ${this.cdMin()} мин`}${n ? ` · ${ru`у тебя ${n}`}` : ''}</span>` : `${this.gateIcon()}<span>${ru`Врата открыты`}</span>`;
  },

  /* ---------- нижняя панель: шаг 1 — материки, шаг 2 — места ---------- */
  panel() {
    const P = this.el.querySelector('.at-panel'), first = this.opts.first;
    const gates = first ? '' : '<p class="at-gates"></p>';
    if (this.pick) {
      // «Своё место»: та же панель шага 2 — материк, Врата, подсказка строкой и список: выбранная точка, затем крупнейшие города на карте
      const L = this.LANDS.find(l => l.id === this.land);
      P.innerHTML = `<div class="at-lh"><b>${U.esc(L.name)}</b><small>${ru`Своё место`}</small></div>${gates}
        <p class="at-phint">${ru`Приблизь карту и коснись улицы, где хочешь появиться.`}</p><div class="at-list"></div>`;
      const ls = P.querySelector('.at-list');
      ls.onclick = e => {
        const b = e.target.closest('.at-pl'), pk = this.pick; if (!b || !pk || this._busy) return;
        if (b.dataset.pin) { const ll = pk.ll; if (ll) { Sfx.play('tap'); this.go(ll.lat, ll.lng, '', '', this.pickNear(ll.lat, ll.lng)); } return; }
        this.pickCity(+b.dataset.c);
      };
      ls.onscroll = () => this.more(ls);
      this.pickList();
    } else if (this.step === 1) {
      // панель одной высоты при любом материке: вкладки — лента, описание — в окне постоянной высоты (длинное прокручивается внутри)
      const tabs = this.LANDS.filter(l => !l.cold).map(l => `<button data-l="${l.id}">${U.esc(l.name)}</button>`).join('');
      P.innerHTML = `<div class="seg dt-tabs at-tabs">${tabs}</div><div class="at-info"></div><div class="at-foot">${UI.rune(ru`Выбрать место`, 'at-go', UI.I.pin)}${gates}</div>`;
      P.querySelector('.at-go').onclick = () => { Sfx.play('tap'); this.toLand(); };
      P.querySelector('.at-tabs').onclick = e => { const c = e.target.closest('[data-l]'); if (c) this.select(c.dataset.l); };
      const box = P.querySelector('.at-info'); box.onscroll = () => this.more(box);
      this.info(true);
    } else {
      // места — списком, как задания: строка без подложки, светящаяся точка, город и место в нём, справа — сколько до него и «›».
      // Касание строки — сразу во Врата (точка на глобусе подсвечивается); «Своё место» — последней строкой
      const list = this.PLACES[this.land] || [], L = this.LANDS.find(l => l.id === this.land);
      const w = this.walk(), me = w && this.placed() && w.pos && isFinite(w.pos.lat) ? w.pos : null;
      const km = p => this.kmHtml(me, p[3], p[4]);
      const chev = '<svg class="at-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
      P.innerHTML = `<div class="at-lh"><b>${U.esc(L.name)}</b><small>${ru`Куда шагнуть?`}</small></div>${gates}
        <div class="at-list">${list.map((p, i) => `<button class="at-pl${this.sel === i ? ' on' : ''}" data-i="${i}"><i class="at-dot"></i><span><b>${U.esc(p[1])}</b><small>${U.esc(p[2])}</small></span>${km(p)}${chev}</button>`).join('')}
          <button class="at-pl own" data-own="1"><i class="at-dot">${UI.I.pin}</i><span><b>${ru`Своё место`}</b><small>${ru`Любая точка на настоящей карте`}</small></span>${chev}</button></div>`;
      P.querySelector('.at-list').onclick = e => {
        const b = e.target.closest('.at-pl'); if (!b || this._busy) return;
        if (b.dataset.own) { Sfx.play('tap'); this.pickOpen(); return; }
        const i = +b.dataset.i, p = list[i]; if (!p) return;
        this.choose(i); // точка на глобусе подсвечивается сразу, шаг во Врата — после подтверждения
        this.go(p[3], p[4], p[1], p[2]);
      };
      const ls = P.querySelector('.at-list'); ls.onscroll = () => this.more(ls);
      setTimeout(() => this.more(ls), 750); // после того как панель вырастет
    }
    this.status();
  },
  // сколько до места от Ловчего; он уже здесь (ближе километра) — «ты здесь»
  kmHtml(me, lat, lng) { if (!me) return ''; const d = U.dist(me.lat, me.lng, lat, lng); return `<em>${d < 1000 ? ru`ты здесь` : U.fmtDist(d)}</em>`; },
  // окно с прокруткой: пока ниже есть ещё — низ растворяется
  more(el) { if (el && el.isConnected) el.classList.toggle('more', el.scrollHeight - el.scrollTop - el.clientHeight > 4); },
  // описание выбранного материка (шаг 1) — меняется только содержимое окна постоянной высоты, вкладки остаются на месте
  info(now) {
    const P = this.el && this.el.querySelector('.at-panel'), box = P && P.querySelector('.at-info'); if (!box) return;
    const L = this.land && this.LANDS.find(l => l.id === this.land), first = this.opts.first;
    P.querySelectorAll('.at-tabs [data-l]').forEach(b => b.classList.toggle('on', b.dataset.l === this.land));
    const myths = L ? L.myths.filter(m => MYTH_KEYS.includes(m) && MYTHS[m]).map(m => `<span class="at-myth" style="--c:${MYTHS[m].color}">${MYTHS[m].name}</span>`).join('') : '';
    box.className = 'at-info' + (L ? '' : ' hint');
    box.innerHTML = L ? `<h3>${U.esc(L.name)}</h3>${myths ? `<div class="at-myths">${myths}</div>` : ''}<p>${L.text}</p>${L.cold ? '' : `<small>✦ ${ru`Каждый дух водится только у себя на родине — здесь встретишь духов этих мифологий.`}</small>`}`
      : `<p>${first ? ru`Поверни глобус пальцем и коснись материка — там и начнётся твой путь Ловчего.` : ru`Поверни глобус пальцем и коснись материка, чтобы выбрать, куда шагнуть.`}</p>`;
    box.scrollTop = 0; this.more(box);
    P.querySelector('.at-go').disabled = !L || !!L.cold;
    // лента вкладок прокручивается только внутри себя — выбранная вкладка к середине (scrollIntoView сдвигал весь Атлас)
    const strip = P.querySelector('.at-tabs'), b = strip.querySelector('.on');
    if (b) strip.scrollTo({ left: Math.max(0, b.offsetLeft - (strip.clientWidth - b.offsetWidth) / 2), behavior: now || this.calm() ? 'auto' : 'smooth' });
  },
  select(id, fromMap) {
    const L = this.LANDS.find(l => l.id === id); if (!L || !this.el || this.step !== 1) return;
    if (this.land === id && fromMap && !L.cold) { Sfx.play('tap'); this.toLand(); return; } // второе касание — к местам
    Sfx.play('tap');
    this.land = id;
    this.el.classList.add('picked');
    this.G.svg.querySelectorAll('.at-land, .at-lbl').forEach(g => g.classList.toggle('on', g.dataset.l === id));
    this.turn(L.label[0], L.label[1]);
    this.info();
    this._dirty = true; this.kick();
  },

  /* ---------- шаг 2: глобус приближается к материку, его места — светящиеся точки ---------- */
  toLand() {
    if (!this.land || this.step === 2 || !this.el) return;
    const li = this.LANDS.findIndex(l => l.id === this.land), L = this.LANDS[li]; if (!L || L.cold) return;
    this.step = 2; this.sel = null;
    this.el.classList.add('s2');
    this.panel();
    // центр — середина мест материка на сфере; рамка мест в радиусах глобуса — под неё подбирается приближение (draw)
    const V = this.geo().cities[li], c = V.reduce((a, v) => [a[0] + v[0], a[1] + v[1], a[2] + v[2]], [0, 0, 0]);
    const lng = Math.atan2(c[1], c[0]) * 180 / Math.PI, lat = this.clampLat(Math.atan2(c[2], Math.hypot(c[0], c[1])) * 180 / Math.PI);
    const M = this.mat(lng, lat), P = V.map(v => this.rot(M, v));
    this._fit = [Math.min(...P.map(p => p[0])), Math.min(...P.map(p => p[1])), Math.max(...P.map(p => p[0])), Math.max(...P.map(p => p[1]))];
    this.turn(lng, lat, 850); this.zoom(1, 850); this.boxAnim(950);
    this.points();
  },
  toWorld() {
    if (this.step === 1 || !this.el) return;
    this.step = 1; this.sel = null;
    this.el.classList.remove('s2');
    this.panel();
    const L = this.LANDS.find(l => l.id === this.land);
    if (L) this.turn(L.label[0], L.label[1], 800);
    this.zoom(0, 800); this.boxAnim(950);
    this.G.pts.innerHTML = ''; this.G.ptEls = []; this.G.ptsXY = [];
    this._dirty = true; this.kick();
  },
  // места материка — светящиеся точки на глобусе (положение — в draw)
  points() {
    const G = this.G; if (!G || this.step !== 2) return;
    const list = this.PLACES[this.land] || [];
    G.pts.innerHTML = list.map((p, i) => `<g class="at-pt${this.sel === i ? ' on' : ''}" data-i="${i}" style="animation-delay:${350 + i * 40}ms">
      <circle class="gl" r="9"/><circle class="c" r="4.2"/><circle class="ring" r="11"/><text class="nm" y="-15">${U.esc(p[1])}</text></g>`).join('');
    G.ptEls = [...G.pts.children];
    G.pts.classList.remove('shown');
    clearTimeout(this._ptT); this._ptT = setTimeout(() => { if (this.G) this.G.pts.classList.add('shown'); }, 1400);
    this._dirty = true; this.kick();
  },
  choose(i) {
    const list = this.PLACES[this.land] || []; if (!list[i] || !this.el) return;
    Sfx.play('tap');
    this.sel = i;
    const G = this.G;
    if (G) {
      G.ptEls.forEach(p => p.classList.toggle('on', +p.dataset.i === i));
      G.pts.classList.add('shown'); // иначе переставленная точка проявилась бы заново
      if (G.ptEls[i]) G.pts.appendChild(G.ptEls[i]); // выбранная точка — поверх соседних
    }
    this.el.querySelectorAll('.at-pl').forEach(b => b.classList.toggle('on', +b.dataset.i === i && !b.dataset.own));
    // список прокручивается только внутри себя
    const b = this.el.querySelector(`.at-pl[data-i="${i}"]`), ls = b && b.parentNode;
    if (b) {
      const top = b.offsetTop - 4, bot = b.offsetTop + b.offsetHeight + 4, how = this.calm() ? 'auto' : 'smooth';
      if (top < ls.scrollTop) ls.scrollTo({ top, behavior: how }); else if (bot > ls.scrollTop + ls.clientHeight) ls.scrollTo({ top: bot - ls.clientHeight, behavior: how });
    }
  },

  /* ---------- «Своё место»: настоящая карта на месте глобуса шага 2 ---------- */
  // 5.1.12: карта встаёт в то же окно и на тот же вид, что глобус шага 2 (рамка — видимая часть глобуса), панель — та же, что на шаге 2:
  // материк, Врата, подсказка строкой и список — 10 крупнейших городов в видимой части карты (слой places тех же плиток Protomaps,
  // обновляется при сдвиге и приближении), а коснулся карты — золотой пин и первой строкой «выбранная точка».
  // Шаг — касанием строки, через то же подтверждение, что у мест шага 2
  NEED: 13,  // с этого приближения касание — уже улица (дальше не приближаем)
  CITIES: 10, // сколько городов в списке
  pickOpen() {
    if (typeof L === 'undefined') { UI.toast(ru`Карта не загрузилась — проверь связь`, 'at-t'); return; }
    if (this.pick || !this.el || !this.G || this.step !== 2) return;
    // глобус мог ещё доворачиваться — сразу в конечный вид шага 2: с него снимается рамка карты
    const v = this.view, tw = this._tw, sw = this._sw;
    if (tw) { v.lng = tw.l0 + tw.dl; v.lat = tw.f0 + tw.df; this._tw = null; }
    if (sw) { this._s = sw.s0 + sw.ds; this._sw = null; }
    this.measure(); this.draw();
    const box = U.el('<div class="at-pmap"></div>');
    this.el.querySelector('.at-map').appendChild(box);
    this.pick = { box, ll: null, mk: null, cities: [], all: [], seen: new Map(), sel: null, seq: 0, get: null, fail: false, t: 0, busy: true, marks: null };
    this.el.classList.add('own');
    this.panel();
    const m = this.pmap = L.map(box, { zoomControl: false, minZoom: 1.5, maxZoom: 18, zoomSnap: 0, zoomDelta: 1, wheelPxPerZoomLevel: 90, worldCopyJump: true, attributionControl: true });
    m.attributionControl.setPrefix(false);
    const vw = this.pickView(box);
    if (vw) m.setView(vw.c, vw.z, { animate: false }); else m.fitBounds(this.placesBox(), { padding: [32, 36], animate: false });
    this.pickTiles(m, box); // слой — когда вид уже задан
    this.pick.marks = L.layerGroup().addTo(m);
    m.on('click', e => this.pickTap(e));
    m.on('moveend', () => this.pickSoon(300));
    this.pickSoon(0);
    requestAnimationFrame(() => m.invalidateSize());
  },
  pickClose() {
    const pk = this.pick; if (!pk) return;
    this.pick = null; clearTimeout(pk.t); clearTimeout(pk.showT);
    const m = this.pmap; this.pmap = null;
    if (this.el) { this.el.classList.remove('own', 'own-in'); this.panel(); }
    pk.box.classList.remove('in');
    setTimeout(() => { if (m) { try { m.remove(); } catch (e) { /* уже убрана */ } } pk.box.remove(); }, 320);
  },
  // карта проявляется плавно, когда плитки нарисованы (глобус под ней в это время ещё виден и гаснет вместе с её появлением)
  pickShow() {
    const pk = this.pick; if (!pk || pk.shown || !this.el) return;
    pk.shown = true; clearTimeout(pk.showT);
    pk.box.classList.add('in'); this.el.classList.add('own-in');
  },
  // рамка мест материка — запасной вид
  placesBox() {
    const list = this.PLACES[this.land] || [];
    return list.length ? [[Math.min(...list.map(p => p[3])), Math.min(...list.map(p => p[4]))], [Math.max(...list.map(p => p[3])), Math.max(...list.map(p => p[4]))]] : [[-30, -30], [50, 60]];
  },
  // вид карты = вид глобуса шага 2: очертания материка и его места, как они стоят на глобусе в окне, переносятся на карту (Меркатор)
  // с тем же центром и масштабом — наименьшими квадратами (места весомее); места, не влезшие в окно с отступом, — чуть отдаляем
  pickView(box) {
    const G = this.G, li = this.LANDS.findIndex(l => l.id === this.land); if (!G || !G.M || li < 0) return null;
    const sb = G.svg.getBoundingClientRect(), b = box.getBoundingClientRect(), bw = b.width, bh = b.height, ox = sb.left - b.left, oy = sb.top - b.top;
    if (bw < 20 || bh < 20) return null;
    const c0 = this.unproj(G.M, 0, 0), lng0 = c0 ? c0[0] : this.view.lng;
    const merc = (lng, lat) => { const r = Math.max(-85, Math.min(85, lat)) * Math.PI / 180, l = lng0 + ((lng - lng0) % 360 + 540) % 360 - 180; // долгота — рядом с центром (через 180°)
      return [(l + 180) / 360, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2]; };
    const P = [], list = this.PLACES[this.land] || [];
    const add = (lng, lat, w) => { const p = this.rot(G.M, this.vec(lng, lat)); if (p[2] <= .02) return; const X = merc(lng, lat); P.push({ X: X[0], Y: X[1], x: G.cx + G.R * p[0] + ox, y: G.cy - G.R * p[1] + oy, w }); };
    this.geo().rings[li].forEach(r => r.forEach(q => add(q[0], q[1], 1)));
    list.forEach(p => add(p[4], p[3], 4));
    if (P.length < 3) return null;
    const sw = P.reduce((a, q) => a + q.w, 0), mean = k => P.reduce((a, q) => a + q.w * q[k], 0) / sw;
    const mX = mean('X'), mY = mean('Y'), mx = mean('x'), my = mean('y');
    let num = 0, den = 0;
    for (const q of P) { const X = q.X - mX, Y = q.Y - mY; num += q.w * (X * (q.x - mx) + Y * (q.y - my)); den += q.w * (X * X + Y * Y); }
    if (!(den > 0) || !(num > 0)) return null;
    let s = num / den, tx = mx - s * mX, ty = my - s * mY; // x = s·X + tx, y = s·Y + ty (точки окна карты)
    // места — внутри окна с отступом (Меркатор к полюсам растягивает — иначе север материка мог бы уйти за край)
    const PAD = 12; let k = 1;
    list.forEach(p => { const X = merc(p[4], p[3]), x = s * X[0] + tx - bw / 2, y = s * X[1] + ty - bh / 2;
      if (Math.abs(x) > 1) k = Math.min(k, (bw / 2 - PAD) / Math.abs(x)); if (Math.abs(y) > 1) k = Math.min(k, (bh / 2 - PAD) / Math.abs(y)); });
    if (k < 1 && k > 0) { s *= k; tx = bw / 2 + k * (tx - bw / 2); ty = bh / 2 + k * (ty - bh / 2); }
    const Xc = (bw / 2 - tx) / s, Yc = (bh / 2 - ty) / s;
    const z = Math.log2(s / 256), lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * Yc))) * 180 / Math.PI, lng = Xc * 360 - 180;
    return isFinite(z) && isFinite(lat) && isFinite(lng) ? { c: [lat, lng], z: Math.max(1.5, Math.min(18, z)) } : null;
  },
  // карта игры: те же плитки Protomaps и облик (Карта Нави, время суток и сезон — как сейчас на карте), подписи на языке игрока;
  // без неё или если плитки не читаются — OSM (подписи — местные)
  pickTiles(m, box) {
    const pk = this.pick;
    pk.showT = setTimeout(() => this.pickShow(), 6000); // плитки так и не нарисовались — всё равно показать (касаться можно)
    if (typeof protomapsL !== 'undefined' && typeof NavMap !== 'undefined' && typeof MapView !== 'undefined' && MapView.tilesUrl) {
      try {
        const lk = MapView.look(), th = NavMap.far(lk.phase, lk.season, lk.snow);
        const lay = pk.lay = protomapsL.leafletLayer({ url: MapView.tilesUrl(), attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://protomaps.com">Protomaps</a>', ...th });
        lay.once('load', () => this.pickShow());
        lay.addTo(m);
        // города для списка — из того же файла карты, но своим чтением (источник карты отменяет чтение плиток другого масштаба —
        // её плитки рисовались бы пустыми) и только слой places
        const src = lay.views && lay.views.get('') && lay.views.get('').tileCache.source;
        pk.get = src && src.p ? this.placesGetter(src.p, MapView.tilesUrl()) : null;
        box.classList.add('vec'); box.style.background = th.backgroundColor;
        if (document.fonts) Promise.all(["500 12px 'Rubik'", "700 12px 'Rubik'"].map(f => document.fonts.load(f).catch(() => {})))
          .then(() => { if (this.pick === pk && pk.lay === lay) { lay.clearLayout(); lay.rerenderTiles(); } });
        return;
      } catch (e) { pk.get = null; pk.lay = null; }
    }
    this.pickOsm(m, box);
  },
  pickOsm(m, box) {
    const pk = this.pick; if (!pk) return;
    if (pk.lay) { try { m.removeLayer(pk.lay); } catch (e) { /* уже убран */ } pk.lay = null; }
    box.classList.remove('vec'); box.style.background = '';
    const t = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' });
    t.once('load', () => this.pickShow());
    t.addTo(m);
  },
  pickSoon(ms) { const pk = this.pick; if (!pk) return; clearTimeout(pk.t); pk.t = setTimeout(() => this.pickFind(), ms); },
  // города в видимой части карты: из плиток (слой places), не вышло — места Атласа, попавшие в рамку
  async pickFind() {
    const pk = this.pick, m = this.pmap; if (!pk || !m) return;
    const seq = ++pk.seq, b = m.getBounds(), B = { s: b.getSouth(), w: b.getWest(), n: b.getNorth(), e: b.getEast() };
    let all = null;
    if (pk.get && !pk.fail) {
      try { all = await this.tileCities(pk.get, B, m.getZoom()); }
      catch (e) { pk.fail = true; if (this.pick === pk && this.pmap) this.pickOsm(this.pmap, pk.box); } // плитки не читаются — карта OSM
    }
    if (this.pick !== pk || seq !== pk.seq) return; // карту уже сдвинули — ответ устарел
    if (!all) all = this.atlasCities(B);
    all.forEach(c => pk.seen.set(c.key, c));
    pk.all = all; pk.cities = this.topCities(all, B, this.CITIES); pk.busy = false;
    this.pickList(); this.pickMarks();
  },
  // чтение слоя places: плитка из файла карты (PMTiles; заголовок и каталог — общие с картой), разбирается только этот слой;
  // кэш — по плиткам (лишь точки мест, немного памяти), на весь сеанс
  placesGetter(pm, url) {
    if (this._pg && this._pg.url === url) return this._pg.get;
    const cache = new Map();
    const get = ({ z, x, y }) => {
      const k = `${z}/${x}/${y}`;
      if (!cache.has(k)) {
        const pr = pm.getZxy(z, x, y).then(r => (r && r.data ? this.mvtPlaces(r.data) : []));
        pr.catch(() => cache.delete(k)); // не вышло — в другой раз заново
        cache.set(k, pr);
        if (cache.size > 400) cache.delete(cache.keys().next().value);
      }
      return cache.get(k);
    };
    this._pg = { url, get };
    return get;
  },
  // слой places из плитки MVT (protobuf): точки [{ props, x, y }], x, y — доли плитки (0…1, запас по краям — за пределами); прочие слои пропускаются
  mvtPlaces(buf) {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength), td = new TextDecoder();
    let p = 0;
    const vint = () => { let r = 0, m = 1, c; do { c = b[p++]; r += (c & 127) * m; m *= 128; } while (c & 128 && p < b.length); return r; };
    const zz = n => (n % 2 ? -(n + 1) / 2 : n / 2);
    const skip = w => { if (w === 0) vint(); else if (w === 1) p += 8; else if (w === 2) { const l = vint(); p += l; } else if (w === 5) p += 4; else p = b.length; };
    const out = [];
    while (p < b.length) {
      const t = vint(), w = t % 8;
      if (Math.floor(t / 8) !== 3 || w !== 2) { skip(w); continue; }
      const end = vint() + p; let name = '', ext = 4096; const keys = [], vals = [], feats = [];
      while (p < end) { // слой: имя, ключи, значения, размер, объекты (объекты разбираются, только если это places)
        const t2 = vint(), f2 = Math.floor(t2 / 8), w2 = t2 % 8;
        if (w2 === 2 && (f2 === 1 || f2 === 3)) { const l = vint(), v = td.decode(b.subarray(p, p + l)); p += l; if (f2 === 1) name = v; else keys.push(v); }
        else if (w2 === 2 && f2 === 2) { const l = vint(); feats.push([p, p + l]); p += l; }
        else if (w2 === 2 && f2 === 4) {
          const ve = vint() + p; let v = null;
          while (p < ve) {
            const t3 = vint(), f3 = Math.floor(t3 / 8), w3 = t3 % 8;
            if (f3 === 1 && w3 === 2) { const l = vint(); v = td.decode(b.subarray(p, p + l)); p += l; }
            else if (f3 === 2 && w3 === 5) { v = dv.getFloat32(p, true); p += 4; }
            else if (f3 === 3 && w3 === 1) { v = dv.getFloat64(p, true); p += 8; }
            else if ((f3 === 4 || f3 === 5) && w3 === 0) v = vint();
            else if (f3 === 6 && w3 === 0) v = zz(vint());
            else if (f3 === 7 && w3 === 0) v = !!vint();
            else skip(w3);
          }
          vals.push(v); p = ve;
        } else if (f2 === 5 && w2 === 0) ext = vint() || 4096;
        else skip(w2);
      }
      if (name === 'places') for (const [a, e] of feats) {
        p = a; const props = {}; let x = null, y = null;
        while (p < e) {
          const t4 = vint(), f4 = Math.floor(t4 / 8), w4 = t4 % 8;
          if (f4 === 2 && w4 === 2) { const pe = vint() + p; while (p < pe) { const ki = vint(), vi = vint(); if (keys[ki] != null) props[keys[ki]] = vals[vi]; } }
          else if (f4 === 4 && w4 === 2) { const ge = vint() + p, cmd = vint(); if (cmd % 8 === 1 && cmd >= 8) { x = zz(vint()); y = zz(vint()); } p = ge; }
          else skip(w4);
        }
        if (x != null) out.push({ props, x: x / ext, y: y / ext });
      }
      p = end;
    }
    return out;
  },
  // плитки, покрывающие рамку B: на мелких масштабах — на уровень подробнее карты (там есть все крупные города), вблизи — те же, что у карты;
  // плиток не больше 24 (иначе — уровнем мельче). Точка города — в своей плитке (из запаса по краям не берём — без повторов)
  async tileCities(get, B, Z) {
    const ty = lat => { const r = Math.max(-85.05, Math.min(85.05, lat)) * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2; };
    let dz = Math.max(2, Math.min(15, Z < 8 ? Math.floor(Z) + 1 : Math.round(Z) - 1)), n, x0, x1, y0, y1;
    for (;; dz--) {
      n = 1 << dz; x0 = Math.floor((B.w + 180) / 360 * n); x1 = Math.floor((B.e + 180) / 360 * n);
      y0 = Math.max(0, Math.floor(ty(B.n) * n)); y1 = Math.min(n - 1, Math.floor(ty(B.s) * n));
      if ((x1 - x0 + 1) * (y1 - y0 + 1) <= 24 || dz <= 1) break;
    }
    const jobs = [];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) jobs.push(get({ z: dz, x: ((x % n) + n) % n, y }).then(d => ({ d, x, y })));
    const res = await Promise.allSettled(jobs), ok = res.filter(r => r.status === 'fulfilled').map(r => r.value);
    if (!ok.length && jobs.length) throw new Error('tiles');
    const lg = (typeof I18N !== 'undefined' && I18N.lang) || 'ru';
    const keys = [`name:${lg}`, lg === 'ru' ? '' : 'name:en', 'name'].filter(Boolean); // как подписи карты (NavMap.theme)
    const out = [];
    for (const { d, x, y } of ok) for (const f of d || []) {
      const pr = f.props || {};
      if (pr.kind !== 'locality' || !(f.x >= 0 && f.x < 1 && f.y >= 0 && f.y < 1)) continue;
      let name = ''; for (const k of keys) if (pr[k] && String(pr[k]).trim()) { name = String(pr[k]).trim(); break; }
      if (!name) continue;
      const lng = (x + f.x) / n * 360 - 180, lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + f.y) / n))) * 180 / Math.PI;
      const c = { key: pr.wikidata || `${name}@${lat.toFixed(2)},${lng.toFixed(2)}`, name, lat, lng, pop: +pr.population || 0, rank: +pr.population_rank || 0, minz: pr.min_zoom == null ? 99 : +pr.min_zoom, cap: pr.capital === 'yes' };
      c.note = this.cityNote(c);
      out.push(c);
    }
    return out;
  },
  // запасные города — места Атласа в рамке (долгота — в той же «копии мира», что и рамка)
  atlasCities(B) {
    const out = [];
    Object.values(this.PLACES).forEach(l => l.forEach(p => {
      for (const k of [0, 360, -360]) { const lng = p[4] + k; if (lng >= B.w && lng <= B.e) { out.push({ key: 'at:' + p[0], name: p[1], note: p[2], lat: p[3], lng, pop: 0, rank: 0, minz: 99 }); break; } }
    }));
    return out;
  },
  // n крупнейших в рамке B { s, w, n, e }: по населению, затем по рангу и по тому, с какого масштаба город виден; без повторов
  topCities(all, B, n = this.CITIES) {
    const seen = new Set();
    return all.filter(c => c.lat >= B.s && c.lat <= B.n && c.lng >= B.w && c.lng <= B.e)
      .sort((a, b) => (b.pop - a.pop) || (b.rank - a.rank) || (a.minz - b.minz))
      .filter(c => !seen.has(c.key) && seen.add(c.key)).slice(0, n);
  },
  // подпись города: столица, сколько жителей
  cityNote(c) {
    const p = c.pop, lg = (typeof I18N !== 'undefined' && I18N.lang) || 'ru', f = (x, d) => { try { return x.toLocaleString(lg, { maximumFractionDigits: d }); } catch (e) { return String(+x.toFixed(d)); } };
    const people = p >= 1e6 ? ru`${f(p / 1e6, p >= 1e7 ? 0 : 1)} млн жителей` : p >= 1000 ? ru`${f(Math.round(p / 1000), 0)} тыс. жителей` : '';
    return [c.cap ? ru`Столица` : '', people].filter(Boolean).join(' · ');
  },
  // ближайший к точке город (ближе 60 км): из всех, что уже были на карте, иначе — из мест Атласа
  pickNear(lat, lng) {
    let near = null, nd = 60000;
    const see = (name, la, ln) => { const d = U.dist(lat, lng, la, ln); if (d < nd) { nd = d; near = name; } };
    if (this.pick) this.pick.seen.forEach(c => see(c.name, c.lat, c.lng));
    if (!near) Object.values(this.PLACES).forEach(l => l.forEach(p => see(p[1], p[3], p[4])));
    return near;
  },
  // список: выбранная точка (если есть) — первой, затем города; как места шага 2 — точка, название, подпись, сколько до него и «›»
  pickList() {
    const pk = this.pick, ls = pk && this.el && this.el.querySelector('.at-panel .at-list'); if (!ls) return;
    const w = this.walk(), me = w && this.placed() && w.pos && isFinite(w.pos.lat) ? w.pos : null;
    const km = (lat, lng) => this.kmHtml(me, lat, lng);
    const chev = '<svg class="at-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    let h = '';
    if (pk.ll) {
      const ll = pk.ll, near = this.pickNear(ll.lat, ll.lng);
      h += `<button class="at-pl own" data-pin="1"><i class="at-dot">${UI.I.pin}</i><span><b>${ru`Своё место`} — ${ru`выбранная точка`}</b>
        <small>${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}${near ? ` · ${ru`рядом: ${U.esc(near)}`}` : ''}</small></span>${km(ll.lat, ll.lng)}${chev}</button>`;
    }
    h += pk.cities.map((c, i) => `<button class="at-pl${pk.sel === c.key ? ' on' : ''}" data-c="${i}"><i class="at-dot"></i><span><b>${U.esc(c.name)}</b>${c.note ? `<small>${U.esc(c.note)}</small>` : ''}</span>${km(c.lat, c.lng)}${chev}</button>`).join('');
    if (!pk.cities.length) h += `<p class="at-pnone">${pk.busy ? ru`Ищу города на карте…` : ru`Здесь на карте нет городов — сдвинь карту или коснись её.`}</p>`;
    ls.innerHTML = h;
    ls.scrollTop = 0; this.more(ls);
  },
  // города списка — золотые точки на карте, как места на глобусе; касание точки — как касание строки
  pickMarks() {
    const pk = this.pick; if (!pk || !pk.marks) return;
    pk.marks.clearLayers();
    pk.cities.forEach((c, i) => {
      const mk = L.marker([c.lat, c.lng], { keyboard: false, icon: L.divIcon({ className: 'at-mpt' + (pk.sel === c.key ? ' on' : ''), iconSize: [22, 22], iconAnchor: [11, 11], html: '<i></i>' }) });
      mk.on('click', () => this.pickCity(i));
      pk.marks.addLayer(mk);
    });
  },
  // город: карта — к нему, и то же подтверждение, что у мест шага 2 (шаг — в центр города)
  pickCity(i) {
    const pk = this.pick, c = pk && pk.cities[i]; if (!c || this._busy || !this.pmap || this.el.querySelector('.at-cd:not(.out)')) return;
    Sfx.play('tap');
    pk.sel = c.key;
    this.el.querySelectorAll('.at-panel .at-pl[data-c]').forEach(b => b.classList.toggle('on', +b.dataset.c === i));
    this.pickMarks();
    this.pmap.panTo([c.lat, c.lng], { animate: !this.calm() });
    this.go(c.lat, ((c.lng + 540) % 360) - 180, c.name, c.note);
  },
  // касание карты — золотой пин и строка «выбранная точка»; издалека карта ещё и приближается к пину (улицу видно вблизи)
  pickTap(e) {
    const m = this.pmap, pk = this.pick; if (!m || !pk || this._busy) return;
    Sfx.play('tap');
    const z = m.getZoom();
    pk.ll = e.latlng.wrap();
    if (pk.mk) pk.mk.setLatLng(e.latlng);
    else pk.mk = L.marker(e.latlng, { interactive: false, keyboard: false, zIndexOffset: 1000, icon: L.divIcon({ className: 'at-pin', iconSize: [34, 44], iconAnchor: [17, 42], html: '<i></i>' }) }).addTo(m);
    const hint = this.el.querySelector('.at-phint');
    if (z < this.NEED - .01) {
      m.setView(e.latlng, Math.min(this.NEED + 1, z + 4), { animate: !this.calm() });
      if (hint) hint.textContent = z + 4 >= this.NEED ? ru`Теперь коснись улицы, где хочешь появиться.` : ru`Ещё ближе — выбери улицу.`;
    }
    this.pickList();
  },

  /* ---------- окно над Атласом: подтверждение шага и перезарядка ---------- */
  // 5.2: на весь экран — матовое полупрозрачное стекло (Атлас под ним размыт); посередине одним блоком — значок Врат, заголовок,
  // куда и сразу под ним кнопки. main — текст, btns — кнопки, after — строка под кнопками, bind(box, end) — действия кнопок;
  // end(v) закрывает окно и отвечает v. «Назад», Esc — это «нет»
  askBox(main, btns, after, bind) {
    return new Promise(res => {
      const box = U.el(`<div class="at-cd" role="dialog" aria-modal="true"><div class="at-cdb"><div class="at-cdm">${main}<div class="at-cdk">${btns}</div>${after}</div></div></div>`);
      // матовое стекло: сам Атлас под окном размывается (backdrop-filter внутри Атласа — он сам под стеклом — не срабатывает)
      const eco = document.body.classList.contains('eco'), calm = document.body.classList.contains('calm'), F = 'blur(14px) saturate(1.35)';
      const under = eco || !Element.prototype.animate ? [] : [...this.el.children].filter(c => !c.classList.contains('at-cd'));
      let anims = under.map(c => c.animate([{ filter: 'none' }, { filter: F }], { duration: calm ? 0 : 320, easing: 'ease-out', fill: 'forwards' }));
      const unblur = () => {
        anims.forEach(a => a.cancel());
        anims = under.filter(c => c.isConnected).map(c => c.animate([{ filter: F }, { filter: 'none' }], { duration: calm ? 0 : 240, easing: 'ease-in' }));
      };
      let over = false;
      const end = v => { if (over) return; over = true; box.classList.add('out'); unblur(); setTimeout(() => box.remove(), 260); res(v); };
      box._no = () => end(false);
      bind(box, end);
      this.el.appendChild(box);
      requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('in')));
    });
  },
  // значок Врат в золотом кольце: frac — сколько кольца залито (1 — Врата открыты)
  gateRing(frac) {
    const R = 26, C = 2 * Math.PI * R;
    return `<div class="at-cdr"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${R}" class="bg"/><circle cx="32" cy="32" r="${R}" class="fg" stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}"/></svg>${this.gateIcon()}</div>`;
  },
  // 5.2: куда шагнуть — крупно город, под ним место; «Своё место» — «выбранная точка», её координаты и ближайший город из Атласа
  whereHtml(lat, lng, name, place, near) {
    if (name) return `<div class="at-okw"><span class="at-okc">${U.esc(name)}</span>${place ? `<span class="at-okp">${U.esc(place)}</span>` : ''}</div>`;
    if (near === undefined) { let nd = 60000; near = null; // ближе 60 км
      Object.values(this.PLACES).forEach(l => l.forEach(p => { const d = U.dist(lat, lng, p[3], p[4]); if (d < nd) { nd = d; near = p[1]; } })); }
    return `<div class="at-okw own"><span class="at-okc">${ru`Выбранная точка на карте`}</span>
      <span class="at-okp at-okll">${lat.toFixed(4)}, ${lng.toFixed(4)}${near ? ` · ${ru`рядом: ${U.esc(near)}`}` : ''}</span></div>`;
  },
  // 5.2: Врата открыты (или первый шаг, даром) — подтвердить переход: куда; под кнопками — когда Врата откроются снова
  askGo(where) {
    const first = !!this.opts.first;
    return this.askBox(`${this.gateRing(1)}<small class="at-cdt">${ru`Врата Перепутицы`}</small><b>${first ? ru`Начать путь здесь?` : ru`Шагнуть во Врата?`}</b>${where}`,
      `${UI.rune(ru`Шагнуть`, 'at-ok')}${UI.glass(ru`Отмена`, 'at-no')}`,
      first ? '' : `<p class="at-okn">${ru`Следующий переход — через ${this.tpMin()} мин`}</p>`, (box, end) => {
        box.querySelector('.at-ok').onclick = () => end(true); // звук шага — портал Врат
        box.querySelector('.at-no').onclick = () => { Sfx.play('tap'); end(false); };
      });
  },
  /* ---------- перезарядка: ждать или открыть Врата предметом (это окно и есть подтверждение шага) ---------- */
  askItem(where = '') {
    const n = this.items(), cd = this.cd(), full = this.tpMin() * 60000, frac = Math.max(0, Math.min(1, 1 - cd / full));
    return this.askBox(`${this.gateRing(frac)}<small class="at-cdt">${ru`Врата Перепутицы`}</small><b>${ru`Врата отдыхают`}</b>${where}
      <p class="at-okn rest">${ru`Врата откроются через ${this.cdMin()} мин`}</p>`,
      `${n ? UI.rune(ru`Использовать Врата Перепутицы (у тебя ${n})`, 'at-use') : typeof Shop !== 'undefined' ? UI.glass(ru`В Лавку`, 'at-shop') : ''}${UI.glass(ru`Подождать`, 'at-wait')}`,
      n ? '' : `<p class="small at-oks">${ru`Врата Перепутицы открываются сразу — их можно купить в Лавке.`}</p>`, (box, end) => {
        const use = box.querySelector('.at-use'); if (use) use.onclick = () => { Sfx.play('tap'); end(true); };
        box.querySelector('.at-wait').onclick = () => { Sfx.play('tap'); end(false); };
        const shop = box.querySelector('.at-shop'); if (shop) shop.onclick = () => { Sfx.play('tap'); end(false); if (!this.opts.first) { this.close(); Shop.screen(); } };
      });
  },

  /* ---------- шаг во Врата: вспышка, затемнение — и Ловчий уже на новом месте ---------- */
  // name, place — город и место в нём (строка списка); без name — «Своё место», точка на настоящей карте (near — город рядом с ней)
  async go(lat, lng, name, place, near) {
    if (this._busy || !this.el || this.el.querySelector('.at-cd:not(.out)')) return; // окно подтверждения или «Врата отдыхают» уже открыто
    const w = this.walk();
    if (!w || !w.teleport) { UI.toast(ru`Врата Перепутицы пока закрыты — обнови игру`, 'at-t'); return; }
    const first = !!this.opts.first, opt = { first }, where = this.whereHtml(lat, lng, name, place, near);
    // 5.2: шаг — только после подтверждения. Врата отдыхают — сразу окно перезарядки (оно же и подтверждение, одно окно)
    if (!first && this.cd() > 0) {
      const use = await this.askItem(where);
      if (!use || !this.el) return;
      opt.item = true;
    } else if (!(await this.askGo(where)) || !this.el) return;
    if (this._busy) return;
    this._busy = true;
    const gate = this.gate(name), t0 = Date.now();
    let r;
    try { r = await w.teleport(lat, lng, opt); } catch (e) { r = { ok: false, error: e && e.message }; }
    await new Promise(ok => setTimeout(ok, Math.max(0, this.GATE_MS - (Date.now() - t0)))); // портал успевает раскрыться
    if (!r || !r.ok) {
      this._busy = false;
      gate.fail();
      const msg = r && r.error ? (typeof I18N !== 'undefined' && I18N.back ? I18N.back(r.error) : r.error) : ru`Врата не открылись. Попробуй ещё раз.`;
      UI.toast(U.esc(msg), 'at-t');
      this.status();
      return;
    }
    try { Sfx.play('reward'); U.vibrate([40, 40, 90]); } catch (e) { /* без звука */ }
    gate.flash(() => { this._busy = false; this.close(); });
  },
  // портал поверх всего: руны кружатся, вихрь втягивает свет; flash — вспышка и растворение, fail — врата схлопываются
  gate(name) {
    const runes = Array.from({ length: 24 }, (_, i) => { const a = i * 15; return `<path transform="rotate(${a}) translate(0 -86)" d="${['M0-6v12M0-6l4 4M0 0l4 4', 'M-3-6v12M-3-6l6 4-6 4', 'M0-6v12M-4-2l8 4', 'M-3-6l3 6-3 6M3-6l-3 6 3 6', 'M0-6l4 6-4 6-4-6z', 'M-3-6v12M-3 0h6M3-6v12'][i % 6]}"/>`; }).join('');
    const g = U.el(`<div class="at-gate" aria-live="polite"><i class="ag-veil"></i>
      <div class="ag-portal"><i class="ag-glow"></i><i class="ag-vortex"></i><i class="ag-vortex v2"></i><i class="ag-core"></i>
        <svg class="ag-ring" viewBox="-100 -100 200 200" aria-hidden="true"><circle r="96" class="o"/><circle r="76" class="i"/><g class="rn">${runes}</g></svg>
        <svg class="ag-ring r2" viewBox="-100 -100 200 200" aria-hidden="true"><circle r="66" class="d"/></svg></div>
      <div class="ag-txt"><small>${ru`Врата Перепутицы`}</small><b>${name ? ru`Шаг — и перед тобой ${U.esc(name)}` : ru`Шаг — и ты на месте`}</b></div><i class="ag-flash"></i></div>`);
    document.body.appendChild(g);
    try { Sfx.play('portal'); } catch (e) { /* без звука */ }
    requestAnimationFrame(() => requestAnimationFrame(() => g.classList.add('open')));
    const calm = document.body.classList.contains('calm');
    return {
      fail() { g.classList.add('fail'); setTimeout(() => g.remove(), calm ? 0 : 500); },
      flash(then) {
        g.classList.add('flash');
        setTimeout(() => { then(); g.classList.add('out'); setTimeout(() => g.remove(), calm ? 0 : 900); }, calm ? 0 : 420);
      },
    };
  },

  /* ---------- глобус на карте: справа вверху, под погодой и плашками недели (без подложки, как они) ---------- */
  // 5.2: значок как у плашки недели — золотой круг с тёмным рисунком (настольный глобус), справа подпись «Атлас»;
  // пока Врата отдыхают — вокруг значка убывает тонкое золотое кольцо, в подписи — минуты
  hudIcon() {
    const p = 'ahi' + (this._iN = (this._iN || 0) + 1);
    return `<svg class="ab-g" viewBox="0 0 24 24" aria-hidden="true"><defs>
      <radialGradient id="${p}s" cx=".34" cy=".28" r=".8"><stop offset="0" stop-color="#fff6d6"/><stop offset=".4" stop-color="#f3cf6b"/><stop offset="1" stop-color="#a8741f"/></radialGradient>
      <clipPath id="${p}c"><circle cx="12" cy="11" r="6"/></clipPath></defs>
      <circle cx="12" cy="12" r="12" fill="url(#${p}s)"/>
      <g fill="none" stroke="#1b1030" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="11" r="6" fill="#1b1030" fill-opacity=".12" stroke-width="1.5"/>
        <g clip-path="url(#${p}c)" transform="rotate(-22 12 11)" stroke-width="1.15"><ellipse cx="12" cy="11" rx="2.9" ry="6"/><path d="M12 3v16M4 8.9h16M4 13.1h16"/></g>
        <path d="M4.9 13.6A7.6 7.6 0 0 0 18.6 7M12 18.6v2M9.6 20.6h4.8" stroke-width="1.5"/></g></svg>`;
  },
  mountHud() {
    const col = U.$('#hud .hud-right'); if (!col || U.$('#atlasBtn')) return;
    const R = 13, C = (2 * Math.PI * R).toFixed(1);
    const b = U.el(`<button id="atlasBtn" class="atlas-btn ab2" aria-label="${ru`Атлас мира`}"><span class="ab-i">${this.hudIcon()}
      <svg class="ab-ring" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="${R}" class="bg"/><circle cx="15" cy="15" r="${R}" class="fg" stroke-dasharray="0 ${C}"/></svg></span>
      <span class="ab-t">${ru`Атлас мира`}</span><span class="ab-m"></span></button>`);
    b.onclick = () => { Sfx.init(); this.open(); };
    col.appendChild(b);
    const tick = () => {
      const cd = this.cd(), on = cd > 0 && this.placed();
      b.classList.toggle('rest', on);
      if (!on) return;
      const frac = Math.max(0, Math.min(1, cd / (this.tpMin() * 60000)));
      b.querySelector('.fg').setAttribute('stroke-dasharray', `${(C * frac).toFixed(1)} ${C}`);
      b.querySelector('.ab-m').textContent = ru`${this.cdMin()} мин`;
    };
    tick();
    // 5.2: значок — в HUD карты: под полноэкранной сценой (stage.js) не обновляется, сцена закрылась — сразу
    setInterval(() => { if (Stage.idle()) tick(); }, 20000);
    Stage.on(busy => { if (!busy) tick(); });
    document.addEventListener('duholov:teleported', () => setTimeout(tick, 100));
  },
};
