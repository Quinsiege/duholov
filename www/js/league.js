'use strict';
/* Лига Ордена. 4.16: бои с ЖИВЫМИ Ловчими в реальном времени — соперников-машин в Лиге больше нет.
   Поиск — среди Ловчих своей лиги; кто у самой границы («осталось чуть-чуть»), ищет и в соседней; чем дольше ждёшь,
   тем шире круг (League.window). Пару составляет база атомарно (league_find, SKIP LOCKED — 022_league_pvp.sql).
   Бой целиком ведёт сервер игры (PvP ниже + GameCore.pvp): телефон присылает только намерения — удар, приём, щит,
   смена духа; сервер проверяет частоту, энергию и перезарядки, двигает время боя, хранит его в базе и рассылает
   обоим через Supabase Realtime (запасной путь — опрос). Итог — рейтинг обоим по разнице рейтингов (как Эло;
   на верхних лигах медленнее), опыт, награды за лиги и раны — засчитывает сервер ровно один раз (GameCore.leagueSettle).
   Сезон — 4.28: сезон Алатыря (до 4.28 — календарный месяц); в новом рейтинг сверх SOFT срезается наполовину, за высшую
   лигу прошлого сезона — сундук.
   Звёзды старых сохранений переводятся в рейтинг ×100.
   Экран (3.21): герб ранга и место в таблице, вкладки «Бой», «Таблица» (живая, с текущими уровнями — leagueTop)
   и «Лиги»; строка таблицы открывает карточку Ловчего. Поиск и сам бой — league-battle.js. */

// pts — с какого рейтинга начинается лига
const LEAGUE_RANKS = [
  { name: ru`Дерево`, pts: 0 },
  { name: ru`Медь`, pts: 300, reward: { charm: 10, sparks: 500 } },
  { name: ru`Бронза`, pts: 600, reward: { honey: 5, sparks: 800 } },
  { name: ru`Железо`, pts: 1000, reward: { charm2: 5, water: 5 } },
  { name: ru`Серебро`, pts: 1500, reward: { charm2: 8, sparks: 1500 } },
  { name: ru`Золото`, pts: 2100, reward: { charm3: 3, incense: 1 } },
  { name: ru`Платина`, pts: 2800, reward: { charm2: 10, sparks: 3000 } },
  { name: ru`Изумруд`, pts: 3600, reward: { charm3: 5, water: 10 } },
  { name: ru`Алмаз`, pts: 4500, reward: { incense: 3, sparks: 5000 } },
  { name: ru`Легенда`, pts: 5500, reward: { charm3: 10, sparks: 8000 } },
];

/* 5.0: значок лиги — медальон: кольцо-оправа из материала лиги, в центре огранённый кристалл Алатыря (общий для всех
   мифологий). Чем выше лига, тем богаче: гладкое кольцо (Дерево, Медь) → бусины и зубцы (Бронза, Железо) → лучи-звезда
   за кольцом (4 у Серебра, 8 у Золота) → лавры (Платина, Изумруд) → крылья (Алмаз, Легенда) → венец и сияние (Легенда);
   кристалл растёт от осколка до полного камня, граней всё больше. id градиентов у каждого значка свои (seq). */
const LeagueBadge = (() => {
  let seq = 0;
  const CX = 170, CY = 212, R = 118, r = 90, RAD = Math.PI / 180;
  const f = n => +n.toFixed(1);
  const P = (d, a) => [f(CX + d * Math.sin(a * RAD)), f(CY - d * Math.cos(a * RAD))]; // угол a — от 12 часов по часовой
  const pts = a => a.map(p => p.join(',')).join(' ');
  const mix = (a, b, t) => '#' + [1, 3, 5].map(k => Math.round(parseInt(a.slice(k, k + 2), 16) * (1 - t) + parseInt(b.slice(k, k + 2), 16) * t).toString(16).padStart(2, '0')).join('');
  const GOLD = ['#fff6c8', '#fbd34d', '#d99a17', '#8a5206'];
  // m — металл оправы (свет → тень), fld — поле (центр, край), o — контур, g — отблеск, cs — тень граней кристалла
  const MAT = [
    { m: ['#f4c088', '#c9813f', '#8f4e1f', '#58290b'], fld: ['#6a3d18', '#1e0f04'], o: '#2a1405', g: '#f59e0b' }, // Дерево
    { m: ['#ffdcc6', '#f39664', '#c65c2e', '#702a10'], fld: ['#6b2c14', '#1f0904'], o: '#2e0f04', g: '#fb923c' }, // Медь
    { m: ['#f6da9c', '#c99545', '#8a5a22', '#442806'], fld: ['#4d3514', '#140d03'], o: '#1f1203', g: '#e0a650' }, // Бронза
    { m: ['#dfe3ea', '#8f97a3', '#4f5663', '#23272e'], fld: ['#39404c', '#0d1014'], o: '#090b0e', g: '#94a3b8', cs: '#646b78' }, // Железо
    { m: ['#ffffff', '#e4eaf2', '#a9b5c6', '#65728a'], fld: ['#3a4d6e', '#111a2b'], o: '#172033', g: '#dbe4f0', cs: '#76839a' }, // Серебро
    { m: GOLD, fld: ['#8a4c08', '#2a1402'], o: '#3a1f02', g: '#fbbf24' }, // Золото
    { m: ['#ffffff', '#eaf3fc', '#b7cae0', '#6f86a6'], fld: ['#2b5282', '#0b1830'], o: '#122038', g: '#bae6fd', cs: '#7890b4' }, // Платина
    { m: GOLD, fld: ['#19c48d', '#053d2c'], o: '#2f1a02', g: '#34d399', gem: ['#bbf7d0', '#10b981', '#064e3b'] }, // Изумруд
    { m: ['#f2fcff', '#a5e9fc', '#38bdf8', '#0c4a6e'], fld: ['#1f6fb0', '#061631'], o: '#051a33', g: '#67e8f9', cs: '#4f8fc4' }, // Алмаз
    { m: GOLD, fld: ['#8b46f0', '#1b0540'], o: '#2a0a45', g: '#e9b8ff', cs: '#8e74b8', gem: ['#f3e8ff', '#a855f7', '#3b0764'] }, // Легенда
  ];
  const lin = (id, c, x2 = .35, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${c.map((s, k) => `<stop offset="${f(k / (c.length - 1))}" stop-color="${s}"/>`).join('')}</linearGradient>`;
  const circ = (d, a) => `<circle cx="${CX}" cy="${CY}" r="${d}" ${a}/>`;
  const star = (x, y, s, o = 1) => `<path d="M${x} ${f(y - s)}L${f(x + s * .2)} ${f(y - s * .2)}L${f(x + s)} ${y}L${f(x + s * .2)} ${f(y + s * .2)}L${x} ${f(y + s)}L${f(x - s * .2)} ${f(y + s * .2)}L${f(x - s)} ${y}L${f(x - s * .2)} ${f(y - s * .2)}Z" fill="#fff" opacity="${o}"/>`;
  const gem = (p, s, id, o) => { const q = [...Array(8)].map((_, k) => [f(p[0] + s * Math.cos((k * 45 + 22.5) * RAD)), f(p[1] + s * Math.sin((k * 45 + 22.5) * RAD))]);
    return `<polygon points="${pts(q)}" fill="url(#${id}j)" stroke="${o}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="${f(p[0] - s * .3)}" cy="${f(p[1] - s * .32)}" r="${f(s * .28)}" fill="#fff" opacity=".85"/>`; };
  // лучи за кольцом: n лучей, длинные L1 и короткие L2 через один, w — полуширина у основания (градусы); свет — одна сторона
  const rays = (n, L1, L2, w, lite, dark, o, off = 0) => {
    let s = '';
    for (let k = 0; k < n; k++) {
      const a = off + k * 360 / n, L = k % 2 ? L2 : L1, ww = k % 2 ? w * .8 : w, c = P(R - 30, a), t = P(L, a), b1 = P(R + 2, a - ww), b2 = P(R + 2, a + ww);
      s += `<polygon points="${pts([c, b1, t, b2])}" fill="none" stroke="${o}" stroke-width="7" stroke-linejoin="round"/><polygon points="${pts([c, b1, t])}" fill="${lite}"/><polygon points="${pts([c, b2, t])}" fill="${dark}"/>`;
    }
    return s;
  };
  // лавровая ветвь слева (от низа к 10 часам), справа — зеркально
  const laurel = (fill, o) => {
    const Rl = R + 11, leaf = (p, rot, L) => { const W = L * .32;
      return `<g transform="translate(${p}) rotate(${f(rot)})"><path d="M0 0C${f(L * .3)} ${f(-W)} ${f(L * .75)} ${f(-W * .8)} ${L} 0C${f(L * .75)} ${f(W * .8)} ${f(L * .3)} ${f(W)} 0 0Z" fill="${fill}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/><path d="M3 0H${f(L * .78)}" stroke="${o}" stroke-width="1.6" opacity=".45"/></g>`; };
    let s = `<path d="M${P(Rl, 188)}A${Rl} ${Rl} 0 0 1 ${P(Rl, 302)}" fill="none" stroke="${o}" stroke-width="7" stroke-linecap="round"/><path d="M${P(Rl, 188)}A${Rl} ${Rl} 0 0 1 ${P(Rl, 302)}" fill="none" stroke="${fill}" stroke-width="3.5" stroke-linecap="round"/>`;
    for (let k = 0; k < 7; k++) { const a = 192 + 108 * k / 6, L = 40 - k * 1.8; s += leaf(P(Rl + 1, a), a - 42, L) + leaf(P(Rl - 2, a + 6), a + 6, L * .82); }
    s += leaf(P(Rl, 302), 300, 30);
    return s + `<g transform="translate(${2 * CX} 0) scale(-1 1)">${s}</g>`;
  };
  // крылья: перья (Легенда) или кристаллические осколки (Алмаз), от спины медальона наружу и вверх
  const wings = (kind, id, o) => {
    const one = (th, L, W, fill, dark) => `<g transform="translate(${CX - 50} ${CY - 26}) rotate(${th})">` + (kind === 'feather'
      ? `<path d="M0 ${f(-W)}C${f(L * .45)} ${f(-W * 1.35)} ${f(L * .88)} ${f(-W * .95)} ${L} 0C${f(L * .8)} ${f(W * .6)} ${f(L * .4)} ${f(W)} 0 ${f(W)}Z" fill="${fill}" stroke="${o}" stroke-width="4.5" stroke-linejoin="round"/><path d="M8 0H${f(L * .84)}" stroke="${o}" stroke-width="2.4" opacity=".45" stroke-linecap="round"/><path d="M${f(L * .22)} ${f(-W * .6)}C${f(L * .5)} ${f(-W * .9)} ${f(L * .75)} ${f(-W * .55)} ${f(L * .88)} ${f(-W * .2)}" stroke="#fff" stroke-width="2.6" fill="none" opacity=".6" stroke-linecap="round"/>`
      : `<polygon points="0,${f(-W * .45)} ${f(L * .34)},${f(-W)} ${L},0 ${f(L * .34)},${f(W)} 0,${f(W * .45)}" fill="none" stroke="${o}" stroke-width="7" stroke-linejoin="round"/><polygon points="0,${f(-W * .45)} ${f(L * .34)},${f(-W)} ${L},0 ${f(L * .34)},0" fill="${fill}"/><polygon points="0,${f(W * .45)} ${f(L * .34)},${f(W)} ${L},0 ${f(L * .34)},0" fill="${dark}"/><path d="M${f(L * .34)} ${f(-W)}L${f(L * .34)} ${f(W)}M${f(L * .34)} 0H${f(L * .9)}" stroke="#fff" stroke-width="1.8" opacity=".6"/>`) + '</g>';
    let s = '';
    // маховые — веером вверх к углам, поверх — кроющие покороче
    [[256, 112], [237, 124], [217, 124], [197, 112], [177, 98], [158, 82]].forEach(([th, L]) => { s += one(th, L, 15, `url(#${id}w)`, '#1f86c9'); });
    [[246, 66], [224, 70], [202, 64], [180, 56]].forEach(([th, L]) => { s += one(th, L, 13, kind === 'feather' ? `url(#${id}m)` : '#ffffff', '#7dd3fc'); });
    return s + `<g transform="translate(${2 * CX} 0) scale(-1 1)">${s}</g>`;
  };
  // кристалл Алатыря: 1 — вытянутый осколок, дальше больше граней и площадка сверху; на Легенде — знак Алатыря на площадке
  const crystal = (i, id, M) => {
    const N = [4, 5, 6, 6, 8, 8, 10, 10, 12, 12][i], s = [38, 43, 46, 50, 53, 55, 57, 59, 61, 63][i];
    const st = [1.5, 1.36, 1.3, 1.26, 1.22, 1.2, 1.19, 1.18, 1.17, 1.16][i], tilt = [16, -10, 0, 0, 0, 0, 0, 0, 0, 0][i];
    const cy = CY + 2, jit = i === 0 ? [1, .7, 1, .78] : i === 1 ? [1, .86, .96, .92, .84] : null;
    const V = (d, a) => [f(CX + d * Math.sin(a * RAD)), f(cy - d * Math.cos(a * RAD) * st)];
    const out = [...Array(N)].map((_, k) => V(s * (jit ? jit[k] : 1), k * 360 / N));
    const tr = i < 2 ? 0 : i < 4 ? .42 : .48, inn = tr ? out.map((_, k) => V(s * tr, k * 360 / N)) : null, apex = [CX - 3, cy - 8];
    const sh = M.cs || mix('#6f6252', M.g, .4), light = a => .5 + .5 * Math.cos((a - 315) * RAD);
    let faces = '', seams = '';
    for (let k = 0; k < N; k++) {
      const k1 = (k + 1) % N, am = (k + .5) * 360 / N, t = Math.min(1, .1 + .88 * light(am) + (k % 2 ? 0 : .07));
      faces += `<polygon points="${pts(inn ? [inn[k], out[k], out[k1], inn[k1]] : [apex, out[k], out[k1]])}" fill="${mix(sh, '#ffffff', t)}"/>`;
      seams += `M${inn ? inn[k] : apex}L${out[k]}`;
      if (i >= 5) { const mo = [f((out[k][0] + out[k1][0]) / 2), f((out[k][1] + out[k1][1]) / 2)]; seams += `M${inn[k]}L${mo}L${inn[k1]}`; }
    }
    const e0 = out[N - 1], e1 = out[0], ins = (p, t) => [f(p[0] + (CX - p[0]) * t), f(p[1] + (cy - p[1]) * t)];
    // звезда Алатыря на площадке Легенды
    const rune = i === 9 ? `<polygon points="${pts([...Array(16)].map((_, k) => V(k % 2 ? 7.5 : 19, k * 22.5)))}" fill="url(#${id}m)" stroke="#6b3a05" stroke-width="2.4" stroke-linejoin="round"/><circle cx="${CX}" cy="${cy}" r="4" fill="#fff6c8" stroke="#6b3a05" stroke-width="1.6"/>` : '';
    return `<g transform="rotate(${tilt} ${CX} ${cy})">
      <polygon points="${pts(out)}" fill="#000" opacity=".4" transform="translate(4 8)"/>${faces}
      ${inn ? `<polygon points="${pts(inn)}" fill="url(#${id}t)"/>` : ''}
      <path d="${seams}" fill="none" stroke="${mix(sh, '#000000', .35)}" stroke-width="1.6" opacity=".6" stroke-linecap="round"/>
      ${inn ? `<polygon points="${pts(inn)}" fill="none" stroke="${mix(sh, '#000000', .3)}" stroke-width="1.8" opacity=".6" stroke-linejoin="round"/>` : ''}${rune}
      <polygon points="${pts(out)}" fill="none" stroke="#221833" stroke-width="5" stroke-linejoin="round"/>
      <path d="M${ins(e0, .14)}L${ins(e1, .14)}" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>
      ${i >= 3 ? star(e1[0], f(e1[1] + 3), 12 + i * 1.5) : ''}</g>`;
  };

  return i => {
    const M = MAT[i], id = 'lb' + (++seq), o = M.o;
    const defs = lin(id + 'm', M.m) + `<linearGradient id="${id}n" x1="0" y1="1" x2=".2" y2="0"><stop offset="0" stop-color="${M.m[0]}"/><stop offset=".55" stop-color="${M.m[2]}"/><stop offset="1" stop-color="${M.m[3]}"/></linearGradient>`
      + `<radialGradient id="${id}f" cx=".42" cy=".36" r=".72"><stop offset="0" stop-color="${M.fld[0]}"/><stop offset="1" stop-color="${M.fld[1]}"/></radialGradient>`
      + `<radialGradient id="${id}h"><stop offset=".35" stop-color="${M.g}" stop-opacity="${i === 9 ? .9 : .6}"/><stop offset="1" stop-color="${M.g}" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="${id}c"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".4" stop-color="${M.g}" stop-opacity=".45"/><stop offset="1" stop-color="${M.g}" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="${id}t" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${mix('#e9dfc8', M.g, .25)}"/></radialGradient>`
      + (M.gem ? `<radialGradient id="${id}j" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${M.gem[0]}"/><stop offset=".45" stop-color="${M.gem[1]}"/><stop offset="1" stop-color="${M.gem[2]}"/></radialGradient>` : '')
      + (i === 9 ? lin(id + 'w', ['#fff6c8', '#fbd34d', '#d99a17', '#9333ea'], 1, 0) + lin(id + 'v', ['#e9d5ff', '#8b5cf6', '#3b0764'], .2) : i === 8 ? lin(id + 'w', ['#ffffff', '#bff0ff', '#5cc9f5'], 1, .3) : '');
    let back = '', rim = '', deco = '', field = '', front = '';
    const M_ = `url(#${id}m)`;
    // сияние и лучи
    if (i >= 5) back += circ(i === 9 ? 170 : 166, `fill="url(#${id}h)"`);
    if (i === 9) back += rays(8, 174, 150, 10, '#fde68a', '#a855f7', o);
    else if (i === 8) back += rays(8, 170, 150, 11, '#e0f7ff', '#38bdf8', o);
    else if (i >= 5) back += rays(8, i === 5 ? 170 : 160, i === 5 ? 144 : 134, i === 5 ? 13 : 11, i === 6 ? '#ffffff' : '#fff1b0', i === 6 ? '#8ea4c2' : '#c98a12', o);
    else if (i === 4) back += rays(4, 168, 168, 13, '#ffffff', '#8d9ab0', o);
    // лавры и крылья
    if (i === 6) back += laurel(M_, o);
    if (i === 7) back += laurel(`url(#${id}m)`, o);
    if (i === 8) back += wings('shard', id, o);
    if (i === 9) back += wings('feather', id, o);
    // край оправы: бусины (Бронза), зубцы (Железо)
    if (i === 2) for (let k = 0; k < 20; k++) { const p = P(R + 1, k * 18); rim += `<circle cx="${p[0]}" cy="${p[1]}" r="11" fill="${M_}" stroke="${o}" stroke-width="4.5"/>`; }
    if (i === 3) for (let k = 0; k < 12; k++) { const a = k * 30; rim += `<polygon points="${pts([P(R - 4, a - 9), P(R + 17, a - 6), P(R + 17, a + 6), P(R - 4, a + 9)])}" fill="${M_}" stroke="${o}" stroke-width="4.5" stroke-linejoin="round"/>`; }
    // кольцо: объём — сверху светлее, у поля обратный скос; Алмаз — из граней
    let ring = circ(R, `fill="${M_}" stroke="${o}" stroke-width="6"`);
    if (i === 8) {
      ring = circ(R, `fill="${M.m[2]}" stroke="${o}" stroke-width="6"`);
      for (let k = 0; k < 24; k++) {
        const a0 = k * 15, a1 = a0 + 15, am = a0 + 7.5, O0 = P(R - 2, a0), O1 = P(R - 2, a1), I0 = P(r + 2, a0), I1 = P(r + 2, a1), Mp = P((R + r) / 2, am);
        const L = d => mix(M.m[3], M.m[0], Math.max(0, Math.min(1, .5 + .5 * Math.cos((d - 315) * RAD))));
        ring += `<polygon points="${pts([O0, O1, Mp])}" fill="${L(am)}"/><polygon points="${pts([O1, I1, Mp])}" fill="${L(am + 90)}"/><polygon points="${pts([I1, I0, Mp])}" fill="${L(am + 180)}"/><polygon points="${pts([I0, O0, Mp])}" fill="${L(am - 90)}"/>`;
      }
      ring += circ(R, `fill="none" stroke="${o}" stroke-width="6"`);
    } else ring += circ(r + 10, `fill="url(#${id}n)"`) + circ(r + 10, `fill="none" stroke="${o}" stroke-width="1.6" opacity=".4"`);
    ring += `<path d="M${P(R - 7, 250)}A${R - 7} ${R - 7} 0 0 1 ${P(R - 7, 350)}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/>`;
    // узор оправы
    if (i === 0) { // дерево: волокна, сучки, кованые уголки
      deco += [112, 106.5, 101].map((d, k) => circ(d, `fill="none" stroke="#4a2208" stroke-width="2" opacity=".5" stroke-dasharray="${['70 9 34 14 96 7', '40 12 88 6 52 16', '110 10 30 8 64 12'][k]}"`)).join('');
      [70, 205, 300].forEach(a => { const p = P(106, a); deco += `<ellipse cx="${p[0]}" cy="${p[1]}" rx="8" ry="4.5" transform="rotate(${a} ${p[0]} ${p[1]})" fill="#5a2c0e" stroke="#2a1405" stroke-width="1.6"/><ellipse cx="${p[0]}" cy="${p[1]}" rx="13" ry="7.5" transform="rotate(${a} ${p[0]} ${p[1]})" fill="none" stroke="#4a2208" stroke-width="1.4" opacity=".6"/>`; });
      [45, 135, 225, 315].forEach(a => { deco += `<g transform="translate(${P(R - 14, a)}) rotate(${a})"><rect x="-13" y="-25" width="26" height="42" rx="5" fill="url(#${id}i)" stroke="${o}" stroke-width="3.5"/><circle cy="-12" r="4" fill="#cbd2dc" stroke="#16191e" stroke-width="1.8"/><circle cy="5" r="4" fill="#cbd2dc" stroke="#16191e" stroke-width="1.8"/></g>`; });
    }
    if (i === 1) { // медь: патина и заклёпки
      [[25, 16], [118, 12], [168, 18], [242, 14], [300, 10], [338, 12]].forEach(([a, w]) => { const p = P(104, a); deco += `<ellipse cx="${p[0]}" cy="${p[1]}" rx="${w}" ry="6" transform="rotate(${a} ${p[0]} ${p[1]})" fill="#5cc2a4" opacity=".6"/><ellipse cx="${f(p[0] + 2)}" cy="${f(p[1] + 1)}" rx="${f(w * .45)}" ry="2.5" transform="rotate(${a} ${p[0]} ${p[1]})" fill="#a7f3d0" opacity=".55"/>`; });
      for (let k = 0; k < 8; k++) { const p = P(104, k * 45 + 22.5); deco += `<circle cx="${p[0]}" cy="${p[1]}" r="5.5" fill="#ffc8a8" stroke="${o}" stroke-width="2.2"/><circle cx="${f(p[0] - 1.5)}" cy="${f(p[1] - 1.5)}" r="1.8" fill="#fff"/>`; }
    }
    if (i === 2) { // бронза: литой поясок
      deco += circ(104, `fill="none" stroke="${o}" stroke-width="2" opacity=".45" stroke-dasharray="14 7"`);
      for (let k = 0; k < 10; k++) { const p = P(104, k * 36); deco += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#f6da9c" stroke="${o}" stroke-width="2"/>`; }
    }
    if (i === 3) for (let k = 0; k < 12; k++) { const p = P(104, k * 30 + 15); deco += `<circle cx="${p[0]}" cy="${p[1]}" r="5.5" fill="#6b7280" stroke="${o}" stroke-width="2.2"/><circle cx="${f(p[0] - 1.6)}" cy="${f(p[1] - 1.6)}" r="1.8" fill="#e5e7eb"/>`; }
    if (i === 4 || i === 6) { // серебро и платина: гравировка
      deco += circ(110, `fill="none" stroke="${o}" stroke-width="1.4" opacity=".4"`) + circ(104, `fill="none" stroke="${o}" stroke-width="2" opacity=".35" stroke-dasharray="2 6" stroke-linecap="round"`);
      for (let k = 0; k < 4; k++) { const p = P(104, k * 90 + 45); deco += `<path d="M${p[0]} ${f(p[1] - 7)}L${f(p[0] + 7)} ${p[1]}L${p[0]} ${f(p[1] + 7)}L${f(p[0] - 7)} ${p[1]}Z" fill="${i === 6 ? '#e0f2fe' : '#ffffff'}" stroke="${o}" stroke-width="2"/>`; }
    }
    if (i === 5) for (let k = 0; k < 24; k++) { const p = P(104, k * 15); deco += `<circle cx="${p[0]}" cy="${p[1]}" r="3.4" fill="#fff3b8" stroke="${o}" stroke-width="1.4"/>`; }
    if (i === 7) for (let k = 0; k < 8; k++) deco += gem(P(104, k * 45), 9, id, o);
    if (i === 9) {
      deco += circ(104, `fill="none" stroke="${o}" stroke-width="17"`) + circ(104, `fill="none" stroke="url(#${id}v)" stroke-width="12"`);
      for (let k = 0; k < 16; k++) { const p = P(104, k * 22.5 + 11.25); deco += `<circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="#fde68a"/>`; }
      [90, 180, 270].forEach(a => { deco += gem(P(104, a), 9, id, o); });
    }
    // поле: у Изумруда, Алмаза и Легенды — огранка
    field = circ(r, `fill="url(#${id}f)" stroke="${o}" stroke-width="4.5"`);
    if (i >= 7) { const n = i === 7 ? 8 : 12; for (let k = 0; k < n; k++) field += `<polygon points="${pts([[CX, CY], P(r - 3, k * 360 / n), P(r - 3, (k + 1) * 360 / n)])}" fill="${k % 2 ? '#fff' : '#000'}" opacity="${k % 2 ? .08 : .14}"/>`; }
    field += circ(r - 3, `fill="none" stroke="#000" stroke-width="6" opacity=".25"`);
    if (i >= 2) field += circ(i >= 7 ? 82 : 30 + i * 5, `fill="url(#${id}c)" opacity="${f(.3 + i * .06)}"`);
    // искры
    if (i >= 5) [[CX - 118, CY - 104, 12], [CX + 124, CY - 88, 9], [CX + 112, CY + 118, 10], [CX - 60, CY + 50, 6], [CX + 52, CY - 56, 5]].slice(0, i >= 8 ? 5 : 3).forEach(([x, y, s]) => { front += star(f(x), f(y), s + (i - 5) * 1.5, .95); });
    // венец Легенды
    if (i === 9) front += `<path d="M116 110L119 60L137 84L148 46L160 80L170 26L180 80L192 46L203 84L221 60L224 110Q170 98 116 110Z" fill="url(#${id}m)" stroke="${o}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M118 104Q170 92 222 104" fill="none" stroke="#fff6c8" stroke-width="3" opacity=".7"/>
      ${[[119, 60, 6], [148, 46, 6.5], [170, 26, 8], [192, 46, 6.5], [221, 60, 6]].map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s}" fill="#fff6c8" stroke="${o}" stroke-width="3"/>`).join('')}
      ${gem([170, 78], 9, id, o)}${gem([141, 90], 6, id, o)}${gem([199, 90], 6, id, o)}`;
    // у крылатых (Алмаз, Легенда) медальон чуть меньше — крыльям нужно место по бокам
    const sc = s => i >= 8 ? `<g transform="translate(${CX} ${CY}) scale(.86) translate(${-CX} ${-CY})">${s}</g>` : s;
    const iron = i === 0 ? lin(id + 'i', ['#d1d5db', '#6b7280', '#2b2f36']) : '';
    return `<svg class="lg-badge-pic" viewBox="0 0 340 400" aria-hidden="true"><defs>${defs}${iron}</defs>${back}${rim}${sc(ring + deco + field + crystal(i, id, M) + front)}</svg>`;
  };
})();

const League = {
  TICKETS: 10, // 4.16: боёв в день — жетон тратится за сыгранный бой
  XP_RUNS: 5,  // опыт дают первые пять боёв дня; дальше — только рейтинг
  XP: { win: 500, draw: 300, loss: 150 }, // сдавшийся или пропавший из боя опыта не получает
  SAME: 3,     // с одним и тем же соперником рейтинг меняют только первые три боя за день (против сговора)
  // 4.16: рейтинг — как у Эло: изменение = K × (итог − ожидаемый итог), ожидание — по разнице рейтингов (шкала 400).
  // Победа над равным: +KW/2, поражение от равного: −KL/2. На нижних лигах победа весит больше поражения (подъём
  // идёт и при половине побед), с «Платины» — поровну и всё медленнее: наверх пробиваются только сильнейшие.
  KW: [60, 60, 56, 52, 48, 44, 40, 36, 32, 28],
  KL: [20, 28, 34, 40, 42, 42, 40, 36, 32, 28],
  SOFT: 1500,        // 4.16: в новом сезоне рейтинг сверх этого (лига «Серебро») срезается наполовину
  MAXPTS: 20000,
  LEVEL: 5,    // с какого уровня Ловчего открыта Лига (проверяет сервер; 4.16: было 10, 5.1.11: снова 5)
  tab: 'play',
  TABS: ['play', 'table', 'ranks'],

  /* 4.28: сезон Лиги — сезон Алатыря (Ev.alaSeason): начинается, когда Кощей раскалывает камень. Ключ — 'A<номер>'
     (до 4.28 сезон был календарным месяцем, 'ГГГГ-ММ': первый ключ 'A1' закрывает последний месячный сезон — с наградой) */
  season(t = U.now()) { return 'A' + (typeof Ev !== 'undefined' && Ev.alaSeason ? Ev.alaSeason(t) : 1); },
  seasonNum(key) { const m = /^A(\d+)$/.exec(String(key || '')); return m ? +m[1] : 0; },
  seasonName(key = this.season()) { const n = this.seasonNum(key); return n ? ru`Сезон ${n}` : String(key || ''); },
  // что осталось до конца сезона: раскол назначен — через сколько; финал — «финал: Кощей»; иначе — грани камня
  seasonLeft() {
    const now = U.now(), e = Ev.alaEnd(), fin = Ev.finale(now), I = typeof Alatyr !== 'undefined' ? Alatyr.info : null;
    if (fin) return (Ev.ala.brk ? ru`раскол через ${this.left(e - now)}` : ru`финал: Кощей · ещё ${this.left(e - now)}`);
    if (!I) return ru`до раскола Алатыря`;
    const st = Ev.alaStage(I.total, now);
    return ru`грани ${st.n}/${st.K} до раскола`;
  },
  reset(p) { return p > this.SOFT ? this.SOFT + Math.floor((p - this.SOFT) / 2) : p; },
  // 4.15: звёзды старого сохранения — в рейтинг ×100; 4.16: новый сезон — срез и сундук за высшую лигу прошлого;
  // новый день — снова жетоны; турнир с машинами (run) больше не нужен
  norm(L) {
    L = L || { season: this.season(), pts: 0, best: 0, peak: 0, tickets: this.TICKETS, n: 0, day: U.today(), got: {} };
    if (L.pts == null) {
      L.pts = U.clamp(Math.floor((+L.stars || 0) * 100), 0, this.MAXPTS); delete L.stars;
      L.tickets = Math.max(+L.tickets || 0, this.TICKETS);
    }
    if ('run' in L) delete L.run;
    if (L.peak == null) L.peak = this.rank(L.pts);
    if (L.n == null) L.n = Math.max(0, this.TICKETS - (+L.tickets || 0));
    if (L.season !== this.season()) {
      if (L.peak > 0) L.prize = { season: L.season, rank: L.peak }; // сундук за прошлый сезон забирает сервер (leaguePrize)
      L.season = this.season(); L.pts = this.reset(L.pts); L.got = {}; L.peak = this.rank(L.pts);
    }
    if (L.day !== U.today()) { L.day = U.today(); L.tickets = this.TICKETS; L.n = 0; }
    return L;
  },
  st() { return (S.d.league = this.norm(S.d.league)); },                                      // сервер
  view() { return this.norm(S.d.league ? JSON.parse(JSON.stringify(S.d.league)) : null); },   // телефон
  rank(pts) { let r = 0; LEAGUE_RANKS.forEach((x, i) => { if (pts >= x.pts) r = i; }); return r; },
  // рейтинг из чужого сохранения (карточка Ловчего): старые звёзды ×100, прошлый сезон — со срезом
  ratingOf(L) {
    if (!L || typeof L !== 'object') return 0;
    let p = L.pts != null ? +L.pts || 0 : (+L.stars || 0) * 100;
    if (L.season !== this.season()) p = this.reset(p);
    return U.clamp(Math.floor(p), 0, this.MAXPTS);
  },
  // 4.16: изменение рейтинга: me, opp — рейтинги до боя, score — 1 победа, 0.5 ничья, 0 поражение
  delta(me, opp, score) {
    const r = this.rank(me), E = 1 / (1 + Math.pow(10, (opp - me) / 400));
    let d = Math.round((score >= E ? this.KW[r] : this.KL[r]) * (score - E));
    if (score === 1) d = Math.max(1, d);
    if (score === 0) d = Math.min(-1, d);
    const pts = U.clamp(me + d, 0, this.MAXPTS);
    return { d: pts - me, pts, rank: this.rank(pts) };
  },
  // 4.16: кого ищем. Своя лига; у границы (ближе NEAR) — и соседняя; после 15 с — ±1 лига, после 30 с — ±2, после 60 с — все
  // 5.1.11: соперник — в пределах ±RANGE очков рейтинга от Ловчего (независимо от лиг и времени ожидания); пара — взаимная
  RANGE: 150,
  window(pts) {
    pts = Math.max(0, Math.round(+pts || 0));
    const lo = Math.max(0, pts - this.RANGE), hi = Math.min(this.MAXPTS, pts + this.RANGE);
    return { a: this.rank(lo), b: this.rank(hi), w: 0, lo, hi };
  },
  // сундук за высшую лигу прошлого сезона
  prize(r) { return r > 0 ? { sparks: 400 * r, charm2: 2 * r, charm3: Math.floor(r / 2) } : null; },

  // 5.0: значок лиги — медальон из материала лиги с кристаллом Алатыря в центре (инлайн-SVG 340×400, LeagueBadge)
  badge(i) { return LeagueBadge(U.clamp(i | 0, 0, LEAGUE_RANKS.length - 1)); },
  // значок рейтинга — кубок
  cup() { return '<svg class="lg-cup" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v3.5a5 5 0 0 1-10 0z" fill="#fcd34d" stroke="#92400e" stroke-width="1.2"/><path d="M7 5.5H4.5a3 3 0 0 0 3 4M17 5.5h2.5a3 3 0 0 1-3 4" fill="none" stroke="#fcd34d" stroke-width="1.6"/><path d="M12 12.5v3.5M8.5 20h7l-.8-3.5H9.3z" fill="#f59e0b" stroke="#92400e" stroke-width="1.1"/></svg>'; },
  rwLine(i) { const x = LEAGUE_RANKS[i]; return x.reward ? UI.rwText(x.reward) + (i % 3 === 0 ? ' + ' + ru`амулет` : '') + (i === 9 ? ' + ' + ru`эмблема «Венец»` : '') : ''; },

  // «6 дн 11 ч», «5 ч 12 мин», «12 мин 05 с»
  left(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60;
    return d ? ru`${d} дн ${h} ч` : h ? ru`${h} ч ${m} мин` : ru`${m} мин ${String(s % 60).padStart(2, '0')} с`;
  },
  toMidnight() { return 86400000 - U.local().getTime() % 86400000; },

  // Таблица сезона — только с сервера игры (текущие уровни и имена, коды для карточки)
  async top() {
    return Game.act('leagueTop', { board: true }); // таблицу напрямую не читает никто (3.23): только через сервер игры
  },

  // 4.16: итоги боёв, которые сервер засчитал без экрана (телефон закрылся посреди боя), и сундук за прошлый сезон
  showDone(r) {
    if (!r) return;
    if (r.prize) UI.modal({ title: ru`Итоги сезона`, html: `<div class="lg-prize"><span class="lg-badge">${this.badge(r.prize.rank)}</span><p>${ru`В прошлом сезоне ты дошёл до лиги «${LEAGUE_RANKS[r.prize.rank].name}». Награда Ордена:`}</p><div class="res-rw">${r.prize.got.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${I18N.back(x.label)}</div>`).join('')}</div></div>`, buttons: [{ label: ru`Забрать`, cls: 'primary' }] });
    (r.done || []).forEach(x => UI.toast(x.win ? ru`Бой с ${U.esc(x.foe.name)} засчитан: победа, рейтинг +${x.d}` : x.draw ? ru`Бой с ${U.esc(x.foe.name)} засчитан: ничья` : ru`Бой с ${U.esc(x.foe.name)} засчитан: поражение, рейтинг −${Math.abs(x.d)}`, x.win ? 'good' : ''));
  },

  screen() {
    Sfx.init();
    let L = this.view(), r = this.rank(L.pts);
    const next = LEAGUE_RANKS[r + 1], base = LEAGUE_RANKS[r].pts, cup = this.cup();
    const prog = next ? Math.min(100, (L.pts - base) / (next.pts - base) * 100) : 100;
    // 4.14.1: Лига — в композиции карточки духа: сверху (≤30%) знак ранга в волшебном круге, справа сезон, ранг, «ЗВЁЗДЫ ··· N»,
    // путь до следующего ранга отдельным блоком и место в таблице; ниже вкладки, содержимое вкладки листается внутри панели
    const scr = UI.screen(ru`Лига Ордена`, `
      <div class="det det2 lg2 r${r}">
        <div class="dt-hero">
          <div class="det-art lg2-crest">${this.badge(r)}</div>
          <div class="dt-info">
            <div class="det-hp">${this.seasonName()} · <b class="lgx-ends"></b></div>
            <div class="lg2-rank${LEAGUE_RANKS[r].name.length > 10 ? ' long' : ''}">${LEAGUE_RANKS[r].name}</div>
            <div class="det-power"><small>${ru`РЕЙТИНГ`}</small><b>${cup}${U.fmtNum(L.pts)}</b></div>
            <div class="det-lvl"><span>${next ? ru`до лиги «${next.name}» — <b>${U.fmtNum(next.pts)}</b>, ещё ${U.fmtNum(next.pts - L.pts)}` : ru`высшая лига!`}</span><div class="arc"><i style="width:${prog}%"></i></div></div>
            <div class="lgx-place">${Cloud.enabled() ? ru`Ищу тебя в таблице…` : ''}</div>
          </div>
        </div>
        <div class="seg dt-tabs lgx-tabs"><button data-tab="play">${ru`Бой`}</button><button data-tab="table">${ru`Таблица`}</button><button data-tab="ranks">${ru`Лиги`}</button></div>
        <div class="dt-panel"><div class="lgx-pane"></div></div>
      </div>`, 'league-screen det-screen');
    const body = scr.querySelector('.screen-body'), pane = scr.querySelector('.lgx-pane');
    let data = null, moves = {}, prevPos = null, loading = false, live = null;

    // 4.16: вкладка «Бой» — команда, жетоны и поиск живого соперника; идущий бой (телефон закрывали) — «Вернуться в бой»
    const renderPlay = () => {
      const team = S.team(), locked = S.d.level < this.LEVEL, power = team.reduce((a, x) => a + S.power(x), 0);
      const cards = UI.teamCards(team); // 5.1.5: три карточки в ряд, пустые места — «+ Выбрать духа»
      const ko = team.some(x => !S.alive(x));
      const btn = locked ? ru`Лига откроется на ${this.LEVEL} уровне` : team.length < 3 ? ru`Нужно три духа` : ko ? ru`В команде дух без сил` : L.tickets > 0 ? ru`Найти соперника` : ru`Жетоны кончились — приходи завтра`;
      pane.innerHTML = `
        ${locked ? `<div class="lgx-card lgx-lock"><b>${ru`Лига откроется на ${this.LEVEL} уровне Ловчего`}</b><small>${ru`Сейчас у тебя ${S.d.level}-й. Лови духов, проходи источники и разломы — опыт придёт быстро.`}</small></div>` : ''}
        ${live ? `<div class="lgx-card lgx-livebout"><div class="row-main"><b>${ru`Бой ещё идёт!`}</b><small>${ru`Соперник ждёт. Не вернёшься — через ${PvP.IDLE / 1000} с тебе засчитают поражение.`}</small></div><button class="btn primary small lg-back">${ru`В бой`}</button></div>` : ''}
        <div class="lg2-tix"><span>${ru`Жетоны`}</span><i class="lg2-pips">${Array.from({ length: this.TICKETS }, (_, i) => `<i class="${i < L.tickets ? 'on' : ''}"></i>`).join('')}</i><b>${L.tickets} / ${this.TICKETS}</b></div>
        <div class="lg2-tix-s">${ru`жетоны обновятся через ${'<b class="lgx-mid"></b>'}`}</div>
        <div class="pf-mh lg2-th"><span>${ru`Команда на бой`}</span>${power ? `<b>${ru`сила ${U.fmtNum(power)}`}</b>` : ''}<button class="lg2-edit team-edit">${ru`Изменить`}</button></div>
        <div class="lg2-team">${cards}</div>
        <div class="lg2-rule">${ru`Соперник — живой Ловчий с рейтингом ±${this.RANGE} от твоего. Рейтинг зависит от силы соперника · опыт — за первые ${this.XP_RUNS} боёв дня`}</div>
        <button class="btn primary wide lg-go" ${!locked && !ko && L.tickets > 0 && team.length === 3 ? '' : 'disabled'}>${btn}</button>`;
    };

    const who = x => `${U.esc(x.name)}${CLANS[x.clan] ? `<i class="lgx-clan" style="background:${CLANS[x.clan].color}" title="${CLANS[x.clan].name}"></i>` : ''}`;
    const move = x => { const d = x.pid && moves[x.pid]; return d && Date.now() - d.t < 20000 ? `<span class="lgx-move ${d.d > 0 ? 'up' : 'down'}">${d.d > 0 ? '▲' : '▼'}${Math.abs(d.d)}</span>` : ''; };
    const renderTable = () => {
      if (!Cloud.enabled()) { pane.innerHTML = `<div class="lgx-card"><small>${ru`Общая таблица всех Ловчих появится, когда к игре подключат облачный сервер.`}</small></div>`; return; }
      const head = `<div class="lgx-live"><i></i>${ru`Обновляется в реальном времени`}${data ? `<span>${ru`${data.total} ${U.plural(data.total, ru`Ловчий`, ru`Ловчих`, ru`Ловчих`)} в сезоне`}</span>` : ''}</div>`;
      if (!data) { pane.innerHTML = head + `<div class="lgx-card"><small>${ru`Загружаю таблицу…`}</small></div>`; return; }
      if (data.error) { pane.innerHTML = head + `<div class="lgx-card"><small>${ru`Таблица недоступна: ${U.esc(data.error)}`}</small></div>`; return; }
      const rows = data.rows, tier = data.tier || { rank: r, rows: [] };
      if (!rows.length) { pane.innerHTML = head + `<div class="lgx-card"><small>${ru`В этом сезоне ещё никто не сыграл в Лиге — будь первым!`}</small></div>`; return; }
      // пьедестал — тройка лучших в твоём ранге; ниже — остальные из топ-50 сезона (с их местом в сезоне)
      const key = x => x.pid || x.name, onPod = new Set(tier.rows.map(key));
      const seat = x => rows.findIndex(y => key(y) === key(x)) + 1;
      const pod = [1, 0, 2].filter(i => tier.rows[i]).map(i => { const x = tier.rows[i], p = seat(x); return `
        <button class="lgx-pod p${i + 1} ${x.me ? 'me' : ''}" data-pid="${U.esc(x.pid || '')}" data-name="${U.esc(x.name)}">
          <div class="lgx-pod-ava">${Art.avatar(x.look || undefined)}<span>${i + 1}</span></div>
          <b>${who(x)}</b><small>${p ? ru`${p}-е место` + ' · ' : ''}${ru`ур. ${x.lvl}`}</small>
          <div class="lgx-pod-base">${cup}${U.fmtNum(x.pts)}${move(x)}</div></button>`; }).join('');
      const list = rows.map((x, j) => ({ x, j })).filter(o => !onPod.has(key(o.x))).map(({ x, j }) => `
        <button class="lgx-row ${x.me ? 'me' : ''}" data-pid="${U.esc(x.pid || '')}" data-name="${U.esc(x.name)}">
          <b class="lgx-pos">${j + 1}</b><div class="fr-ava">${Art.avatar(x.look || undefined)}</div>
          <div class="row-main"><b>${who(x)}</b><small>${LEAGUE_RANKS[x.rank].name} · ${ru`ур. ${x.lvl}`}</small></div>
          ${move(x)}<span class="lgx-stars">${cup}${U.fmtNum(x.pts)}</span></button>`).join('');
      const mine = !rows.some(x => x.me) && data.me ? `<div class="lgx-row me lgx-mine"><b class="lgx-pos">${data.me.place}</b><div class="row-main"><b>${ru`Ты`}</b><small>${LEAGUE_RANKS[r].name} · ${ru`ур. ${S.d.level}`}</small></div><span class="lgx-stars">${cup}${U.fmtNum(data.me.pts)}</span></div>` : '';
      pane.innerHTML = head + (pod ? `<div class="lgx-sub"><span class="lg-badge sm">${this.badge(tier.rank)}</span>${ru`Лучшие в лиге «${LEAGUE_RANKS[tier.rank].name}»`}</div><div class="lgx-podium">${pod}</div>` : '')
        + (list ? `<div class="lgx-sub">${ru`Топ-50 сезона`}</div><div class="list lgx-list">${list}</div>` : '') + mine
        + `<div class="q-note">${ru`Нажми на Ловчего, чтобы открыть его карточку.`}</div>`;
    };

    const renderRanks = () => {
      pane.innerHTML = `<div class="lgx-ladder">${LEAGUE_RANKS.map((x, i) => `
        <div class="lgx-rung ${i < r ? 'past' : i === r ? 'cur' : ''}">
          <span class="lg-badge">${this.badge(i)}</span>
          <div class="row-main"><b>${x.name}${i === r ? ` <span class="lgx-you">${ru`ты здесь`}</span>` : ''}</b><small>${ru`от ${U.fmtNum(x.pts)}`}${x.reward ? ' · ' + this.rwLine(i) : ' · ' + ru`начало пути`}</small></div>
          ${L.got[i] ? `<span class="q-ok" title="${ru`Получено в этом сезоне`}">✓</span>` : i > r ? `<span class="lgx-need">${ru`ещё ${U.fmtNum(x.pts - L.pts)}`}</span>` : ''}
        </div>`).join('')}</div>
        <div class="q-note">${ru`Рейтинг зависит от соперника: победа над сильным даёт много, над слабым — мало; поражение от слабого стоит дороже. В твоей лиге победа над равным — +${Math.round(this.KW[r] / 2)}, поражение — −${Math.round(this.KL[r] / 2)}; чем выше лига, тем медленнее подъём. Из лиги можно выпасть. Награду за лигу дают один раз за сезон. В начале нового сезона рейтинг сверх ${U.fmtNum(this.SOFT)} срезается наполовину, а за высшую лигу прошлого сезона Орден дарит сундук. В лигах «${LEAGUE_RANKS[3].name}», «${LEAGUE_RANKS[6].name}» и «${LEAGUE_RANKS[9].name}» — ещё и амулет.`}</div>`;
    };

    const place = () => {
      const el = scr.querySelector('.lgx-place'); if (!el || !data || data.error) return;
      const i = data.rows.findIndex(x => x.me);
      el.innerHTML = i >= 0 ? ru`<b>${i + 1}-е место</b> из ${data.total} в сезоне` : data.me ? ru`<b>${data.me.place}-е место</b> из ${data.total} в сезоне`
        : ru`Сыграй бой, чтобы попасть в таблицу`;
    };
    const render = () => {
      U.$$('[data-tab]', scr).forEach(b => b.classList.toggle('on', b.dataset.tab === this.tab));
      if (this.tab === 'table') renderTable(); else if (this.tab === 'ranks') renderRanks(); else renderPlay();
      tick();
    };
    const show = (t, dir) => { this.tab = t; render(); UI.slideIn(pane, dir); };
    // таблица — сразу и потом каждые 5 секунд, пока экран открыт; перерисовка — только если что-то изменилось
    const load = async () => {
      if (loading || !Cloud.enabled()) return;
      loading = true;
      let d;
      try { d = await this.top(); } catch (e) { d = data && !data.error ? data : { error: e.message }; }
      loading = false;
      if (!scr.isConnected) return;
      if (!d.error) {
        const pos = {}; d.rows.forEach((x, i) => { if (x.pid) pos[x.pid] = i; });
        if (prevPos) Object.keys(pos).forEach(p => { if (prevPos[p] != null && prevPos[p] !== pos[p]) moves[p] = { d: prevPos[p] - pos[p], t: Date.now() }; });
        prevPos = pos;
      }
      const changed = JSON.stringify(d) !== JSON.stringify(data) || Object.values(moves).some(m => Date.now() - m.t < 25000);
      data = d; place();
      if (changed && this.tab === 'table') renderTable();
    };
    const tick = () => {
      const e = scr.querySelector('.lgx-ends'); if (e) e.textContent = this.seasonLeft();
      const m = scr.querySelector('.lgx-mid'); if (m) m.textContent = this.left(this.toMidnight());
    };
    // 4.16: при входе — засчитать бои, закончившиеся без экрана, сундук сезона и идущий бой
    const state = async () => {
      if (!Game.on() || S.d.level < this.LEVEL) return;
      const st = await Game.act('leagueState', { board: true }).catch(() => null);
      if (!st || !scr.isConnected) return;
      this.showDone(st);
      live = st.live;
      L = this.view(); r = this.rank(L.pts);
      if (this.tab === 'play') renderPlay();
    };

    scr.addEventListener('click', async e => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { if (tb.dataset.tab !== this.tab) { Sfx.play('tap'); show(tb.dataset.tab, Math.sign(this.TABS.indexOf(tb.dataset.tab) - this.TABS.indexOf(this.tab))); } return; }
      if (e.target.closest('.team-edit, .team-slot')) { UI.pickTeam(() => { if (scr.isConnected && this.tab === 'play') renderPlay(); }); return; }
      const row = e.target.closest('[data-pid]');
      if (row) {
        const x = data && data.rows && data.rows.concat(data.tier ? data.tier.rows : []).find(y => y.pid && y.pid === row.dataset.pid);
        if (x) Friends.card(x.pid, { name: x.name, look: x.look }); else UI.toast(ru`Карточка откроется после обновления сервера`); return; }
      if (e.target.closest('.lg-back')) { UI.closeScreen(scr); LeagueBattle.resume(live); return; }
      if (e.target.closest('.lg-go')) { if (S.team().length < 3) return; UI.closeScreen(scr); LeagueBattle.search(); }
    });
    UI.swipeTabs(body, this.TABS, () => this.tab, show);
    render(); load(); state();
    if (typeof Alatyr !== 'undefined') Alatyr.refresh().then(() => { if (scr.isConnected) tick(); }); // 4.28: грани камня — до конца сезона
    let n = 0;
    const t = setInterval(() => {
      if (!scr.isConnected) { clearInterval(t); return; }
      tick();
      // жетоны вернулись в полночь — перерисовать вкладку боя
      if (L.day !== U.today()) { L = this.view(); r = this.rank(L.pts); if (this.tab === 'play') renderPlay(); }
      if (++n % 5 === 0 && !document.hidden) load();
    }, 1000);
  },
};

/* ---------- 4.16: бой Лиги — движок сервера ----------
   Состояние боя — простой объект (хранится в базе, league_matches.state); меняет его только сервер игры.
   Время — «ленивое»: сервер не тикает сам, а при каждом запросе любого из двух Ловчих досчитывает бой до текущего
   момента (advance): истёкшие решения о щите и о смене духа — автоходом, время боя, пропавший Ловчий.
   s.a / s.b — стороны: имя, облик, рейтинг, бойцы (сила и здоровье — с сервера, из сохранения), щиты, перезарядка
   смены (cd), «ведро» быстрых ударов (tok — не чаще RATE в секунду), когда последний раз был на связи (seen).
   pause — приём (k: 'charge': мини-игра атакующего и решение защитника о щите) или вынужденная смена духа (k: 'switch').
   log — последние события (удары, приёмы, щиты, смены) — по ним телефон соперника показывает, что происходит. */
const PvP = {
  COUNT: 5000,        // мс от подбора до начала боя: оба телефона успевают узнать о бое
  TIME: 150,          // секунд боя (паузы на приёмы и смену не считаются)
  CAP_MS: 6 * 60000,  // и не дольше 6 минут по часам
  FAST: 6,            // сила быстрого удара (как в поединках)
  RATE: 2, BURST: 3,  // быстрые удары: не чаще двух в секунду, запас — на неровную сеть
  MAX_TAPS: 6,        // больше ударов в одном ходе телефон не присылает — это подделка
  MINI: 2200,         // мс мини-игры приёма
  DECIDE: 3000,       // мс на решение о щите; потом приём срабатывает сам
  TAPS_PER_S: 7, TAPS_MAX: 12,
  SWITCH_CD: 25000,   // перезарядка добровольной смены
  SWITCH_T: 6000,     // мс на выбор духа после поражения бойца; потом — первый живой
  IDLE: 20000,        // нет вестей 20 с — поражение
  SEEN_EVERY: 5000,   // отметку «на связи» пишем не чаще раза в 5 с
  LOG: 16,

  other(s) { return s === 'a' ? 'b' : 'a'; },
  r3(x) { return Math.round(x * 1000) / 1000; },
  // урон — как в поединках, но без погоды: у двух Ловчих она разная
  dmg(att, def, power, ae, de) { return Math.floor(0.5 * power * (att / def) * 1.2 * Raid.eff(ae, de)) + 1; },
  // боец из духа Ловчего (сервер, при постановке в очередь): здоровье — текущее (раны общие на всю игру)
  fighter(sp) {
    const x = S.battle(sp), max = Math.round(x.hp * Duel.HPX);
    return { uid: sp.uid, sid: sp.sid, lvl: sp.lvl, nick: sp.nick || null, shiny: !!sp.shiny, dark: !!(sp.dark && !sp.purified), move2: !!sp.move2,
      el: SP[sp.sid].el, atk: this.r3(x.atk), def: this.r3(x.def), max, cur: Math.max(1, Math.round(max * S.hpNow(sp))), en: 0, emul: x.energy || 1, power: x.power };
  },
  // новая запись боя (league_find кладёт { init, a, b, at, season }) → полное состояние
  ensure(x) {
    if (!x || !x.init) return x;
    const t0 = x.at + this.COUNT;
    const side = i => ({ pid: i.pid, name: i.name, look: i.look || null, lvl: i.lvl, pts: i.pts, rank: i.rank, clan: i.clan || null, power: i.power,
      team: i.team.map(f => ({ ...f, cur: Math.min(f.cur, f.max), en: 0 })), idx: 0, sh: 2, cd: 0, tok: this.BURST, tokAt: t0, seen: x.at, hits: 0, rej: 0 });
    return { v: 1, season: x.season, t0, at: t0, clock: 0, pause: null, over: null, n: 0, log: [], s: { a: side(x.a), b: side(x.b) } };
  },
  cur(st, side) { const x = st.s[side]; return x.team[x.idx]; },
  log(st, e) { st.n++; st.log.push({ n: st.n, ...e }); if (st.log.length > this.LOG) st.log.splice(0, st.log.length - this.LOG); },
  share(x) { return x.team.reduce((a, f) => a + Math.max(0, f.cur) / f.max, 0) / x.team.length; },

  // досчитать бой до момента now (только сервер)
  advance(st, now) {
    for (let g = 0; g < 20 && !st.over; g++) {
      if (now < st.t0) return;
      const ia = now - st.s.a.seen > this.IDLE, ib = now - st.s.b.seen > this.IDLE;
      if (ia || ib) { const lost = ia && ib ? (st.s.a.seen <= st.s.b.seen ? 'a' : 'b') : ia ? 'a' : 'b'; return this.end(st, this.other(lost), 'idle', now); }
      if (st.pause) {
        if (now < st.pause.until) return;
        const t = st.pause.until;
        if (st.pause.k === 'charge') this.resolve(st, t);
        else { st.pause.who.forEach(s => { const x = st.s[s]; x.idx = Math.max(0, x.team.findIndex(f => f.cur > 0)); this.log(st, { t, s, e: 'switch', i: x.idx, auto: 1 }); }); st.pause = null; st.at = t; }
        continue;
      }
      const dt = Math.max(0, now - st.at) / 1000;
      if (st.clock + dt >= this.TIME || now - st.t0 >= this.CAP_MS) {
        st.clock = Math.min(this.TIME, st.clock + dt); st.at = now;
        const a = this.share(st.s.a), b = this.share(st.s.b);
        return this.end(st, Math.abs(a - b) < 0.001 ? null : a > b ? 'a' : 'b', 'time', now);
      }
      st.clock += dt; st.at = now;
      return;
    }
  },
  end(st, win, why, now) {
    const a = st.s.a, b = st.s.b, sc = s => (win === s ? 1 : win ? 0 : 0.5);
    st.pause = null;
    // рейтинг обоим — в той же записи, что и итог (атомарно): от рейтингов на момент подбора
    st.over = { win, why, t: now, d: { a: League.delta(a.pts, b.pts, sc('a')), b: League.delta(b.pts, a.pts, sc('b')) } };
    this.log(st, { t: now, e: 'end', s: win, why });
  },
  refill(x, now) { x.tok = Math.min(this.BURST, x.tok + Math.max(0, now - x.tokAt) / 1000 * this.RATE); x.tokAt = now; },
  fast(st, me, now) {
    const foe = this.other(me), m = this.cur(st, me), f = this.cur(st, foe);
    m.en = Math.min(100, m.en + 7 * (m.emul || 1));
    const d = this.dmg(m.atk, f.def, this.FAST, m.el, f.el);
    f.cur -= d;
    st.s[me].hits++;
    this.log(st, { t: now, s: me, e: 'hit', d });
    if (f.cur <= 0) this.faint(st, foe, now);
  },
  resolve(st, now) {
    const p = st.pause, att = st.s[p.by], dfn = st.s[this.other(p.by)], m = att.team[att.idx], f = dfn.team[dfn.idx];
    const mult = 0.55 + 0.45 * Math.min(1, (p.taps || 0) / this.TAPS_MAX);
    const sh = !!p.sh && dfn.sh > 0;
    const d = sh ? 1 : this.dmg(m.atk, f.def, MOVES[p.kind].power * mult, m.el, f.el);
    if (sh) dfn.sh--;
    f.cur -= d;
    st.pause = null; st.at = now;
    this.log(st, { t: now, s: p.by, e: 'charged', kind: p.kind, d, sh: sh ? 1 : 0 });
    if (f.cur <= 0) this.faint(st, this.other(p.by), now);
  },
  faint(st, side, now) {
    const x = st.s[side];
    x.team[x.idx].cur = 0;
    this.log(st, { t: now, s: side, e: 'ko', i: x.idx });
    if (!x.team.some(f => f.cur > 0)) return this.end(st, this.other(side), 'ko', now);
    if (st.pause && st.pause.k === 'switch') { if (!st.pause.who.includes(side)) st.pause.who.push(side); }
    else st.pause = { k: 'switch', who: [side], t: now, until: now + this.SWITCH_T };
  },

  /* Ход Ловчего. { ok } — применён, { ign } — не ко времени (бой на паузе, мало энергии, перезарядка: на неровной сети
     так бывает у честного телефона — ход просто не засчитан), { bad } — такого честный телефон не присылает (подделка):
     сервер отклоняет весь запрос. */
  act(st, me, x, now) {
    const bad = m => ({ bad: m }), ign = m => ({ ign: m });
    if (!x || typeof x !== 'object' || typeof x.t !== 'string') return bad(ru`Неизвестный ход`);
    const my = st.s[me], p = st.pause, busy = !!st.over || now < st.t0;
    switch (x.t) {
      case 'sync': return { ok: 1 };
      case 'hit': {
        const n = x.n;
        if (!Number.isInteger(n) || n < 1 || n > this.MAX_TAPS) return bad(ru`Слишком много ударов сразу`);
        if (busy || p) { my.rej += n; return ign('pause'); }
        this.refill(my, now);
        const k = Math.min(n, Math.floor(my.tok + 1e-9));
        my.tok -= k; my.rej += n - k;
        let i = 0;
        for (; i < k && !st.pause && !st.over; i++) this.fast(st, me, now);
        my.rej += k - i; // бой встал на паузу посреди пачки — остальные удары не засчитаны
        return { ok: 1, got: i };
      }
      case 'charge': {
        const kind = x.kind === 'charge' || x.kind === 'charge2' ? x.kind : null;
        if (!kind) return bad(ru`Неизвестный приём`);
        const m = this.cur(st, me);
        if (kind === 'charge2' && !m.move2) return bad(ru`Этот приём не выучен`);
        if (busy || p) return ign('pause');
        if (m.en < MOVES[kind].cost) return ign('energy');
        m.en -= MOVES[kind].cost;
        st.pause = { k: 'charge', by: me, kind, t: now, until: now + this.DECIDE, taps: null, sh: null };
        this.log(st, { t: now, s: me, e: 'charge', kind });
        return { ok: 1 };
      }
      case 'taps': {
        const n = x.n;
        if (!Number.isInteger(n) || n < 0 || n > this.TAPS_MAX) return bad(ru`Неверный приём`);
        if (!p || p.k !== 'charge' || p.by !== me || p.taps != null) return ign('late');
        p.taps = Math.min(n, Math.floor((now - p.t) / 1000 * this.TAPS_PER_S)); // быстрее человеческой руки не бывает
        if (p.sh != null) this.resolve(st, now);
        return { ok: 1 };
      }
      case 'shield': {
        if (!p || p.k !== 'charge' || p.by === me || p.sh != null) return ign('late');
        p.sh = !!x.on && my.sh > 0;
        if (p.taps != null) this.resolve(st, now);
        return { ok: 1 };
      }
      case 'switch': {
        const i = x.i;
        if (!Number.isInteger(i) || i < 0 || i >= my.team.length || my.team[i].cur <= 0) return bad(ru`Этого духа не выпустить`);
        if (p && p.k === 'switch' && p.who.includes(me)) {
          my.idx = i;
          p.who = p.who.filter(s => s !== me);
          this.log(st, { t: now, s: me, e: 'switch', i });
          if (!p.who.length) { st.pause = null; st.at = now; }
          return { ok: 1 };
        }
        if (busy || p || i === my.idx) return ign('pause');
        if (now < my.cd) return ign('cd');
        my.idx = i; my.cd = now + this.SWITCH_CD;
        this.log(st, { t: now, s: me, e: 'switch', i });
        return { ok: 1 };
      }
      case 'quit':
        if (st.over) return ign('over');
        this.end(st, this.other(me), 'quit', now);
        return { ok: 1 };
    }
    return bad(ru`Неизвестный ход`);
  },

  // 4.26: бой для телефона Ловчего seat (ответы сервера) — в том же виде, что в базе, но без скрытого: энергии, атаки, второго
  // приёма и перезарядок духов соперника, его счётчиков ударов, а в паузе приёма — чужого решения (щит у атакующего, сила
  // приёма у защищающегося), пока оно не раскрыто. Защита духа (def) остаётся: по ней телефон заранее показывает свой урон
  mask(st, seat) {
    if (!st || !st.s || !st.s[seat]) return st;
    const x = JSON.parse(JSON.stringify(st)), foe = x.s[this.other(seat)], p = x.pause;
    if (foe) {
      foe.team = (foe.team || []).map(f => { const { atk, emul, ...o } = f; return { ...o, en: 0, move2: false }; });
      Object.assign(foe, { cd: 0, tok: 0, tokAt: 0, hits: 0, rej: 0 });
    }
    if (p && p.k === 'charge') { if (p.by === seat) p.sh = null; else p.taps = null; }
    return x;
  },
  // Бой глазами Ловчего seat: «я» и «соперник»; энергию и показатели духов соперника не показываем
  view(st, seat, now) {
    const rel = s => (s === seat ? 'me' : s ? 'foe' : null), p = st.pause, o = st.over;
    const active = !o && !p && now >= st.t0;
    const side = (x, mine) => ({ name: x.name, look: x.look, lvl: x.lvl, pts: x.pts, rank: x.rank, clan: x.clan, power: x.power, idx: x.idx, sh: x.sh, cd: mine ? x.cd : 0,
      recv: mine ? x.hits + x.rej : 0, // сколько быстрых ударов сервер уже получил (засчитал или отклонил) — для подсказки телефона
      team: x.team.map(f => ({ sid: f.sid, lvl: f.lvl, nick: f.nick, shiny: f.shiny, dark: f.dark, el: f.el, max: f.max, cur: Math.max(0, f.cur), power: f.power, move2: mine ? f.move2 : false, en: mine ? f.en : 0 })) });
    return {
      seat, n: st.n, t0: st.t0, left: Math.max(0, this.TIME - st.clock - (active ? Math.max(0, now - st.at) / 1000 : 0)),
      pause: p ? { k: p.k, by: rel(p.by), kind: p.kind, t: p.t, until: p.until, done: p.k === 'charge' ? (p.by === seat ? p.taps != null : p.sh != null) : false, who: p.who ? p.who.map(rel) : null } : null,
      over: o ? { win: rel(o.win), why: o.why, d: o.d ? o.d[seat] : null } : null,
      me: side(st.s[seat], true), foe: side(st.s[this.other(seat)], false),
      log: st.log.map(e => ({ ...e, s: rel(e.s) })),
    };
  },
};
