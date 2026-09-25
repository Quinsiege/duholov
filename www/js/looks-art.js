'use strict';
/* 4.6: фон и рамка КАРТОЧКИ Ловчего (плашка профиля ~360×170, скругление ~22px). Наборы — LOOK.bg / LOOK.frame в js/data.js.
   LookArt.cardBg(id)    — полный SVG-документ 360×170 (preserveAspectRatio slice) для background: … center/cover.
                           Левая треть (аватар) и середина (текст) — тихие и тёмные, эффекты — справа и по краю.
   LookArt.cardFrame(id) — полный SVG-документ 120×120 для border-image: url(…) 40 / 18px / 8px round (без fill).
                           Углы 40×40 — орнамент (не искажаются), средние полосы 40 — узор-плитка с периодом 40
                           (стыкуется сама с собой и с углами), центр прозрачный. Край «живой»: завитки, листья,
                           пламя, шипы выступают наружу за кромку карточки (выступ 8px ≈ внешние 18 ед. SVG).
   Стиль «сказочная Навь»: объём градиентами (свет сверху-слева), тёмная обводка, свечение — только радиальными градиентами.
   id приходит и от других игроков: берём только свои ключи (hasOwnProperty); неизвестный фон — «Ночь», рамка — пусто. */

const LookArt = (() => {
  const NS = 'xmlns="http://www.w3.org/2000/svg"';
  const f = v => Math.round(v * 10) / 10;
  const f3 = v => Math.round(v * 1000) / 1000;
  const st = a => a.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op == null ? '' : ` stop-opacity="${op}"`}/>`).join('');
  const lg = (id, a, x1 = 0, y1 = 0, x2 = 1, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${st(a)}</linearGradient>`;
  const rg = (id, a, cx = 0.5, cy = 0.5, r = 0.5) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${st(a)}</radialGradient>`;
  const lgU = (id, a, x1, y1, x2, y2) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${st(a)}</linearGradient>`;
  const rgU = (id, a, cx, cy, r) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${st(a)}</radialGradient>`;
  const glowG = (id, c, o = 0.85) => rg(id, [[0, c, o], [0.4, c, o * 0.4], [1, c, 0]]);
  const op = o => (o < 1 ? ` opacity="${o}"` : '');
  const dots = (a, c, o = 1) => a.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"${op(o)}/>`).join('');
  const spark = (x, y, s, c, o = 1) => {
    const q = f(s * 0.22);
    return `<path d="M${x} ${f(y - s)}L${f(x + q)} ${f(y - q)} ${f(x + s)} ${y} ${f(x + q)} ${f(y + q)} ${x} ${f(y + s)} ${f(x - q)} ${f(y + q)} ${f(x - s)} ${y} ${f(x - q)} ${f(y - q)}Z" fill="${c}"${op(o)}/>`;
  };
  // детерминированный «случай»: одинаковая картинка у всех игроков
  const rnd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  // руны (местные координаты, центр 0,0, высота 3.6)
  const RUNES = [
    'M0-1.8V1.8M0-1.8L1.3-.8M0-.3L1.3.7', 'M-.9-1.8V1.8M.9-1.8V1.8M-.9-1.8L.9 0', 'M0-1.8V1.8M-1.2-.4L1.2.8',
    'M-1.2 1.8L0-1.8 1.2 1.8', 'M.9-1.8L-.9 0 .9 1.8', 'M0-1.8V1.8M-1.2-.6L0-1.8 1.2-.6',
    'M-1.1-1.8L1.1 1.8M1.1-1.8L-1.1 1.8', 'M0-1.8L1.2 0 0 1.8-1.2 0Z', 'M-.8-1.8V1.8M-.8-1.8L.9-.9-.8 0',
    'M0-1.8V1.8M0-.2L-1.3-1.6M0-.2L1.3-1.6', 'M0-1.8L1.1-.6-1 1.8M0-1.8L-1.1-.6 1 1.8', 'M.9-1.8L-.9-.5.9.5-.9 1.8',
  ];
  // спираль воронки: рукав от центра наружу (для «Врат Нави»)
  const arm = (cx, cy, R) => {
    const o = [], w = [];
    for (let k = 0; k <= 18; k++) {
      const t = k / 18, th = t * 4.3, r = 2 + R * t, d = 0.52 * Math.min(1, t * 2.6) + 0.04;
      o.push(`${f(cx + r * Math.cos(th))} ${f(cy + r * Math.sin(th))}`);
      w.push(`${f(cx + r * Math.cos(th - d))} ${f(cy + r * Math.sin(th - d))}`);
    }
    return `M${o.join('L')}L${w.reverse().join('L')}Z`;
  };

  /* ============================ ФОН КАРТОЧКИ 360×170 ============================ */
  // поверх всего — «тишина» слева: затемнение под аватар и текст, к правому краю сходит на нет
  const card = (defs, body) =>
    `<svg ${NS} width="360" height="170" viewBox="0 0 360 170" preserveAspectRatio="xMidYMid slice"><defs>` +
    lg('q', [[0, '#05030d', 0.55], [0.3, '#05030d', 0.38], [0.6, '#05030d', 0.12], [0.8, '#05030d', 0]], 0, 0, 1, 0) + defs +
    `</defs>${body}<rect width="360" height="170" fill="url(#q)"/></svg>`;
  const FULL = f => `<rect width="360" height="170" fill="${f}"/>`;
  // звёзды, гуще к правому краю
  const starField = (seed, k, c, o = 0.85) => {
    const r = rnd(seed), a = [];
    for (let i = 0; i < k; i++) a.push([f(360 * (0.2 + 0.8 * Math.sqrt(r()))), f(6 + 158 * r()), f(0.35 + 0.7 * r() * r())]);
    return dots(a, c, o);
  };
  // лист папоротника вдоль кривой P0-P1-P2: перья с обеих сторон, к кончику короче
  const frond = (x0, y0, x1, y1, x2, y2, n, L) => {
    let d = `M${x0} ${y0}Q${x1} ${y1} ${x2} ${y2}`;
    for (let i = 1; i < n; i++) {
      const t = i / n, u = 1 - t, x = u * u * x0 + 2 * u * t * x1 + t * t * x2, y = u * u * y0 + 2 * u * t * y1 + t * t * y2;
      const dx = u * (x1 - x0) + t * (x2 - x1), dy = u * (y1 - y0) + t * (y2 - y1), m = Math.hypot(dx, dy), l = L * (1 - t * 0.7);
      for (const k of [1, -1]) {
        const c = Math.cos(0.95), sn = Math.sin(0.95) * k, vx = (dx * c - dy * sn) / m, vy = (dx * sn + dy * c) / m;
        d += `M${f(x)} ${f(y)}l${f(vx * l)} ${f(vy * l)}`;
      }
    }
    return d;
  };
  const tree = (x, y, h) => `M${f(x)} ${f(y - h)}L${f(x + h * 0.3)} ${f(y - h * 0.5)}H${f(x + h * 0.14)}L${f(x + h * 0.4)} ${f(y - h * 0.12)}H${f(x + h * 0.08)}V${y}H${f(x - h * 0.08)}V${f(y - h * 0.12)}H${f(x - h * 0.4)}L${f(x - h * 0.14)} ${f(y - h * 0.5)}H${f(x - h * 0.3)}Z`;

  const BG = {
    // Ночь — тёмный лак-фиолет с тонким ромбовым узором и мягким светом справа
    night: () => card(
      lg('b', [[0, '#1b1336'], [0.55, '#241a45'], [1, '#30225f']]) + rgU('g', [[0, '#7c5ce0', 0.42], [1, '#7c5ce0', 0]], 318, 30, 160) +
      `<pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M14 3L25 14 14 25 3 14Z" fill="none" stroke="#c4b5fd" stroke-width=".7" opacity=".08"/><circle cx="14" cy="14" r="1.1" fill="#c4b5fd" opacity=".13"/><circle r="1.1" fill="#c4b5fd" opacity=".13"/></pattern>`,
      FULL('url(#b)') + FULL('url(#p)') + FULL('url(#g)') +
      dots([[300, 24, 0.9], [336, 48, 0.7], [270, 14, 0.6], [346, 16, 0.6], [318, 74, 0.5], [250, 36, 0.5], [340, 124, 0.5], [296, 142, 0.45], [226, 18, 0.45], [206, 150, 0.4]], '#ece8ff', 0.75) +
      spark(318, 32, 3.6, '#f5f3ff', 0.85) + spark(344, 92, 2.2, '#e9e3ff', 0.6)),

    // Сумерки — фиолет сверху, заря снизу справа, месяц, холмы и церквушка на дальнем холме
    dusk: () => card(
      lg('b', [[0, '#1a1238'], [0.4, '#30205a'], [0.72, '#6a2a58'], [1, '#b8582c']], 0, 0, 0, 1) +
      rgU('s', [[0, '#ffc27a', 0.8], [0.4, '#f97316', 0.35], [1, '#f97316', 0]], 300, 178, 175),
      FULL('url(#b)') + FULL('url(#s)') +
      `<path d="M226 100h70M250 110h92M292 92h48M184 118h58" stroke="#fdba8c" stroke-width="3" stroke-linecap="round" opacity=".22"/>` +
      `<path d="M0 138Q40 126 80 134T170 130T260 122Q300 116 360 128V170H0Z" fill="#3a1d48" opacity=".85"/>` +
      `<path d="M300 124V112h-3l5-4.5 5 4.5h-3v12ZM302 107.5c-2.6-2-2.6-4.4 0-6.4 2.6 2 2.6 4.4 0 6.4ZM302 101v-3.4M300.6 99h2.8" fill="#2a1538" stroke="#2a1538" stroke-width=".8"/>` +
      `<rect x="301.2" y="115" width="1.6" height="2.6" fill="#fbbf24" opacity=".85"/>` +
      `<path d="M0 152Q30 145 60 149T130 147T220 145Q280 134 330 142T360 144V170H0Z" fill="#170d24"/>` +
      `<path d="M318 24a14 14 0 1 0 14 21 11.5 11.5 0 1 1-14-21z" fill="#fde7c2" opacity=".9"/>` +
      dots([[282, 20, 0.7], [346, 66, 0.6], [252, 34, 0.55], [230, 12, 0.5], [352, 14, 0.5], [270, 58, 0.45]], '#f5e9ff', 0.75)),

    // Звездопад — глубокая синь, Млечный путь справа, падающая звезда
    stars: () => card(
      rgU('b', [[0, '#2a2766'], [0.5, '#171544'], [1, '#0a0a24']], 300, 30, 330) + rg('m', [[0, '#a5b4fc', 0.28], [1, '#a5b4fc', 0]]) +
      lgU('t', [[0, '#fff'], [0.2, '#c7d2fe', 0.8], [1, '#818cf8', 0]], 290, 36, 356, 2) + glowG('g', '#c7d2fe', 0.9),
      FULL('url(#b)') +
      `<ellipse cx="290" cy="80" rx="150" ry="24" transform="rotate(-24 290 80)" fill="url(#m)"/>` +
      starField(7, 46, '#e0e7ff') +
      spark(330, 30, 4, '#fff') + spark(284, 120, 2.6, '#e0e7ff', 0.9) + spark(346, 104, 2.2, '#e0e7ff', 0.85) + spark(226, 30, 2, '#e0e7ff', 0.7) +
      `<path d="M291.2 37.6L357 1.6 289 34.4Z" fill="url(#t)"/>` +
      `<circle cx="290" cy="36" r="11" fill="url(#g)"/>` + spark(290, 36, 4.4, '#fff') +
      `<path d="M196 30L222 14" stroke="#c7d2fe" stroke-width=".8" stroke-linecap="round" opacity=".45"/>`),

    // Северное сияние — зелёные и фиолетовые ленты-занавеси, заснеженные горы
    aurora: () => card(
      lg('b', [[0, '#081a2e'], [0.6, '#0d1732'], [1, '#100b28']], 0, 0, 0, 1) +
      lgU('a', [[0, '#34d399', 0], [0.6, '#34d399', 0.5], [0.85, '#a7f3d0', 0.75], [1, '#34d399', 0]], 0, 24, 0, 104) +
      lgU('v', [[0, '#a78bfa', 0], [0.6, '#a78bfa', 0.45], [0.85, '#e9d5ff', 0.6], [1, '#c084fc', 0]], 0, 0, 0, 60),
      FULL('url(#b)') +
      dots([[300, 12, 0.6], [340, 20, 0.5], [230, 10, 0.5], [352, 60, 0.45], [190, 16, 0.4], [270, 30, 0.4]], '#ecfdf5', 0.8) +
      `<path d="M110 40C160 10 210 40 250 22S320 0 370 16V36C330 22 300 44 256 42S160 36 110 58Z" fill="url(#v)"/>` +
      `<path d="M96 82C150 40 200 78 250 52S320 22 370 42V76C330 54 300 82 254 80S150 76 96 106Z" fill="url(#a)"/>` +
      `<path d="M96 104C150 72 200 102 252 78S320 52 370 72" fill="none" stroke="#6ee7b7" stroke-width="24" stroke-dasharray=".8 3.4" opacity=".2"/>` +
      `<path d="M110 56C160 30 210 56 252 40S320 18 370 34" fill="none" stroke="#d8b4fe" stroke-width="16" stroke-dasharray=".8 3.6" opacity=".18"/>` +
      `<path d="M140 170L204 128 232 142 280 104 320 134 342 120 360 128V170Z" fill="#0b1528"/>` +
      `<path d="M280 104l-10 8 5-1 5 3 4-3 6 1ZM204 128l-8 5.4 4-.8 4 2 3-2 4 .8ZM342 120l-6 4 3-.4 3 1.6 3-1.6 3 .4Z" fill="#cbd5e1" opacity=".55"/>` +
      `<path d="${tree(236, 170, 26)}${tree(254, 170, 34)}${tree(272, 170, 22)}${tree(310, 170, 30)}${tree(330, 170, 40)}${tree(350, 170, 28)}" fill="#050b17"/>`),

    // Купальская ночь — тёмный лес, справа сияет цвет папоротника, светлячки
    fern: () => {
      const r = rnd(11);
      let trees = '';
      for (let x = 132; x < 372; x += 11 + r() * 8) trees += tree(x, 172, 18 + (x - 120) * 0.16 + r() * 16);
      const ff = [[248, 22], [276, 128], [344, 22], [352, 118], [226, 64], [322, 138], [262, 40], [204, 30], [346, 64], [236, 106], [180, 140], [300, 18]];
      return card(
        rgU('b', [[0, '#1b4a30'], [0.45, '#0e2a1b'], [1, '#04110a']], 314, 66, 300) +
        glowG('g', '#fbbf24', 0.9) + glowG('l', '#d9f99d', 0.9) + `<g id="y"><circle r="4.4" fill="url(#l)"/><circle r="1" fill="#f7fee7"/></g>` +
        lg('f', [[0, '#fff7d6'], [0.35, '#fcd34d'], [0.7, '#f97316'], [1, '#b91c1c']], 0, 0, 0, 1) +
        `<path id="p" d="M0 0C1.8-1.6 2.2-4.6 0-7C-2.2-4.6-1.8-1.6 0 0Z" fill="url(#f)" stroke="#7c1d0c" stroke-width=".35"/>`,
        FULL('url(#b)') +
        `<path d="${trees}" fill="#03100a"/>` +
        `<path d="${frond(262, 172, 274, 122, 306, 92, 11, 11)}${frond(352, 172, 348, 124, 322, 94, 10, 10)}${frond(230, 172, 234, 142, 258, 124, 7, 8)}" fill="none" stroke="#2f7a42" stroke-width="2.4" stroke-linecap="round"/>` +
        `<path d="M314 68V172" stroke="#1f5230" stroke-width="1.8"/>` +
        `<circle cx="314" cy="58" r="46" fill="url(#g)"/>` +
        `<g transform="translate(314 58) scale(2.5)">` + Array.from({ length: 8 }, (_, i) => `<use href="#p" transform="rotate(${i * 45})"/>`).join('') +
        `<circle r="1.9" fill="#fff7d6" stroke="#f59e0b" stroke-width=".4"/></g>` +
        spark(344, 32, 2.4, '#fde68a') + spark(298, 36, 1.8, '#fde68a', 0.85) + spark(348, 84, 1.6, '#fde68a', 0.8) +
        ff.map(([x, y], i) => `<use href="#y" transform="translate(${x} ${y})${i % 3 ? '' : ' scale(1.35)'}"/>`).join(''));
    },

    // Жар — тёмный багрец, отсвет углей снизу справа, искры летят вверх
    embers: () => {
      const r = rnd(5);
      let sp = '';
      for (let i = 0; i < 26; i++) {
        const x = f(360 * (0.3 + 0.7 * Math.sqrt(r()))), y = f(10 + 150 * r()), s = f(0.7 + 1.4 * r() * (y / 170 + 0.3));
        sp += `<use href="#s" transform="translate(${x} ${y}) scale(${s})"/>`;
      }
      return card(
        rgU('b', [[0, '#a5300f'], [0.3, '#5c1612'], [0.7, '#2c0a0e'], [1, '#18060a']], 300, 196, 280) +
        glowG('g', '#fb923c', 0.9) + `<g id="s"><path d="M0 0l-1.4 6" stroke="#f97316" stroke-linecap="round" opacity=".45"/><circle r="3.4" fill="url(#g)"/><circle r=".6" fill="#fef3c7"/></g>` + lgU('h', [[0, '#f97316', 0.6], [1, '#b91c1c', 0]], 0, 170, 0, 90),
        FULL('url(#b)') +
        `<path d="M200 170Q208 150 204 136Q216 148 216 160Q224 140 218 120Q236 142 234 170ZM244 170Q256 146 250 124Q266 140 264 156Q274 134 266 108Q290 136 284 170ZM290 170Q300 140 292 112Q312 132 310 150Q322 124 314 96Q342 128 334 170ZM330 170Q344 146 338 124Q356 140 360 150V170Z" fill="url(#h)"/>` +
        sp);
    },

    // Иней — ледяная синь, морозные перья от краёв (гуще справа), снежинки
    frost: () => {
      const fl = (x, y, s) => `M${x} ${f(y - s)}V${f(y + s)}M${f(x - s * 0.87)} ${f(y - s / 2)}L${f(x + s * 0.87)} ${f(y + s / 2)}M${f(x - s * 0.87)} ${f(y + s / 2)}L${f(x + s * 0.87)} ${f(y - s / 2)}`;
      const P = [[352, 0, 30, 1.25], [324, 0, 8, 1], [296, 0, -12, 0.8], [260, 0, 6, 0.62], [214, 0, -6, 0.45], [360, 26, 72, 1.1], [360, 58, 96, 0.85], [360, 92, 82, 1.05],
        [360, 126, 104, 0.85], [354, 170, 148, 1.2], [326, 170, 172, 0.95], [292, 170, 192, 0.75], [256, 170, 174, 0.55], [214, 170, 186, 0.42],
        [0, 10, -64, 0.55], [0, 160, -116, 0.55], [22, 0, -18, 0.45], [26, 170, 198, 0.45]];
      return card(
        rgU('b', [[0, '#1f4d73'], [0.5, '#123656'], [1, '#0a1f38']], 300, 60, 330) +
        rgU('e', [[0, '#e0f2fe', 0.4], [1, '#e0f2fe', 0]], 360, 0, 130) + rgU('d', [[0, '#e0f2fe', 0.35], [1, '#e0f2fe', 0]], 360, 170, 120) +
        `<path id="r" d="M0 0V40M0 7l-6-5M0 7l6-5M0 15l-5-4.4M0 15l5-4.4M0 23l-4-3.4M0 23l4-3.4M0 31l-2.6-2.4M0 31l2.6-2.4M-7 3.6l-2 2.6M7 3.6l2 2.6" fill="none" stroke="#e0f2fe" stroke-width=".9" stroke-linecap="round"/>`,
        FULL('url(#b)') + FULL('url(#e)') + FULL('url(#d)') +
        `<g opacity=".7">` + P.map(([x, y, a, s]) => `<use href="#r" transform="translate(${x} ${y}) rotate(${a}) scale(${s})"/>`).join('') + `</g>` +
        `<path d="${fl(300, 70, 5)}${fl(334, 104, 3.6)}${fl(262, 30, 3)}${fl(236, 132, 2.6)}${fl(316, 140, 2.2)}${fl(200, 60, 2)}" stroke="#f0f9ff" stroke-width=".9" stroke-linecap="round" opacity=".85"/>` +
        dots([[280, 90, 0.8], [344, 70, 0.7], [250, 70, 0.6], [306, 30, 0.6], [224, 100, 0.5], [270, 150, 0.5]], '#fff', 0.8));
    },

    // Навья луна — луна-затмение справа, фиолетовый венец и лучи, облака
    moon: () => {
      const cx = 314, cy = 62, rays = [];
      for (let i = 0; i < 24; i++) {
        const a = i * 15 * Math.PI / 180, L = i % 2 ? 54 : 80, b = (i % 2 ? 2.6 : 3.4) * Math.PI / 180, P = (r, t) => `${f(cx + r * Math.cos(t))} ${f(cy + r * Math.sin(t))}`;
        rays.push(`M${P(30, a - b)}L${P(L, a)} ${P(30, a + b)}Z`);
      }
      const hx = f(cx + 30 * Math.cos(225 * Math.PI / 180)), hy = f(cy + 30 * Math.sin(225 * Math.PI / 180));
      return card(
        rgU('b', [[0, '#2c1854'], [0.5, '#1a0f36'], [1, '#0c0720']], cx, cy, 300) +
        rgU('k', [[0, '#f5d0fe', 0.95], [0.55, '#c084fc', 0.5], [0.75, '#7c3aed', 0.22], [1, '#7c3aed', 0]], cx, cy, 58) +
        rgU('y', [[0.35, '#e9d5ff', 0.5], [1, '#e9d5ff', 0]], cx, cy, 82) +
        rg('d', [[0, '#2d1c4c'], [1, '#150b28']], 0.4, 0.35, 0.7) + glowG('g', '#fff', 1),
        FULL('url(#b)') + starField(3, 26, '#f5f3ff', 0.75) +
        `<path d="${rays.join('')}" fill="url(#y)"/>` +
        `<circle cx="${cx}" cy="${cy}" r="58" fill="url(#k)"/>` +
        `<circle cx="${cx}" cy="${cy}" r="30" fill="url(#d)" stroke="#f3e8ff" stroke-width="1.6"/>` +
        `<path d="M${f(cx - 30)} ${cy}A30 30 0 0 1 ${cx} ${cy - 30}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>` +
        `<circle cx="${hx}" cy="${hy}" r="9" fill="url(#g)"/>` + spark(hx, hy, 5.6, '#fff') +
        `<path d="M200 128q22-12 44-2q16-12 38 0q18-10 34 2q16-6 50 6M232 146q20-8 40 0q20-10 40 0q16-6 52 4" fill="none" stroke="#8b5cf6" stroke-width="5" stroke-linecap="round" opacity=".22"/>`);
    },

    // Золотая роспись — чёрный лак; справа большой золотой завиток с листьями и ягодами, по верху и низу — травка
    khokhloma: () => {
      const LEAF = 'M0 0c3-5 9-7 16-6-3 5-9 7-16 6z';
      const unit = `<g id="m" fill="none" stroke="url(#o)" stroke-width="1.3" stroke-linecap="round"><path d="M-30 0C-20-6-10-6 0 0S20 6 30 0"/>` +
        `<path d="M-9-4.4c-3-4-9-3.2-9 1 0 3 3.4 4 5 2 1-1.4 0-3-1.4-2.4M12 3.6c1 3.4 4 5 7 5M-22-1.6c-1.6-2.6-1.4-5 0-7" stroke-width="1"/>` +
        `<path d="${LEAF}" transform="translate(4 2.6) rotate(-20) scale(.8)" fill="url(#o)" stroke="#5a3508" stroke-width=".4"/>` +
        `<path d="${LEAF}" transform="translate(20 3) rotate(-160) scale(.6)" fill="url(#o)" stroke="#5a3508" stroke-width=".4"/>` +
        `<g stroke="#f3c451" stroke-width=".6" fill="url(#r)"><circle cx="-3" cy="-4" r="2"/><circle cx="1" cy="-5.6" r="1.8"/><circle cx="0" cy="-1.6" r="1.6"/></g></g>`;
      const berry = (x, y, s) => `<circle cx="${x}" cy="${y}" r="${s}" fill="url(#r)" stroke="#f3c451" stroke-width=".6"/>`;
      let rows = '';
      for (let x = 30; x < 360; x += 60) {
        rows += `<use href="#m" x="${x}" y="25"/><use href="#m" x="${x}" y="146"/>`;
      }
      const lf = (x, y, a, s) => `<path d="${LEAF}" transform="translate(${x} ${y}) rotate(${a}) scale(${s})" fill="url(#o)" stroke="#5a3508" stroke-width=".35"/>`;
      return card(
        rgU('b', [[0, '#2b1409'], [0.5, '#120806'], [1, '#050303']], 300, 80, 300) +
        lg('o', [[0, '#fff4c4'], [0.25, '#f3c451'], [0.5, '#a8731b'], [0.72, '#ecbd4e'], [1, '#6b420e']]) +
        rg('r', [[0, '#ffb4a6'], [0.35, '#e0282e'], [1, '#6e0a0f']], 0.35, 0.32, 0.7) + unit,
        FULL('url(#b)') + `<g opacity=".85">${rows}</g>` +
        `<g fill="none" stroke="url(#o)" stroke-linecap="round"><path d="M372 132C336 134 300 118 298 90C296 64 316 46 338 50" stroke-width="2.4"/>` +
        `<path d="M338 50c12 3 14 20 2 22-8 1.4-11-7-6-11 3-2.4 7-.6 6 2.4M312 122C290 128 262 122 250 106M250 106c-6-8-17-3-14 4 1.4 5 8 5 9 1" stroke-width="1.8"/>` +
        `<path d="M300 104c-10-2-16 2-20 8M296 76c-8-6-16-6-22-2M326 132c4 8 12 12 20 12M272 118c-4 6-4 12 0 18" stroke-width="1.2"/></g>` +
        lf(298, 96, -150, 1.5) + lf(298, 80, -120, 1.3) + lf(306, 58, -70, 1.2) + lf(320, 50, -30, 1) + lf(318, 126, 170, 1.3) + lf(284, 122, 200, 1.1) + lf(262, 116, 150, 1) + lf(340, 132, 10, 1.1) +
        berry(328, 96, 4.8) + berry(338, 90, 4.2) + berry(336, 101, 4.4) + berry(346, 98, 3.8) + berry(343, 108, 3.6) +
        berry(268, 96, 3.4) + berry(275, 90, 3) + berry(276, 99, 2.8));
    },

    // Врата Нави — закрученная фиолетовая воронка справа, рунный круг, отсветы
    gate: () => {
      const cx = 314, cy = 85;
      return card(
        rgU('b', [[0, '#3b1466'], [0.45, '#1a0936'], [1, '#07030f']], cx, cy, 260) +
        rgU('s', [[0, '#fdf4ff', 0.95], [0.25, '#e879f9', 0.6], [0.65, '#7c3aed', 0.4], [1, '#4c1d95', 0.1]], cx, cy, 96) +
        rgU('t', [[0, '#fff', 0.7], [0.4, '#c4b5fd', 0.3], [1, '#6d28d9', 0]], cx, cy, 96) + glowG('g', '#f0abfc', 0.9) +
        `<path id="a" d="${arm(cx, cy, 96)}"/><g id="R">` + Array.from({ length: 24 }, (_, i) => `<path d="${RUNES[i % RUNES.length]}" transform="rotate(${i * 15} ${cx} ${cy}) translate(${cx} ${cy - 64}) scale(1.9)"/>`).join('') + `</g>`,
        FULL('url(#b)') +
        `<g fill="url(#s)">` + [0, 72, 144, 216, 288].map(a => `<use href="#a" transform="rotate(${a} ${cx} ${cy})"/>`).join('') + `</g>` +
        `<g fill="url(#t)" opacity=".6">` + [36, 108, 180, 252, 324].map(a => `<use href="#a" transform="rotate(${a} ${cx} ${cy}) translate(${cx} ${cy}) scale(.8) translate(${-cx} ${-cy})"/>`).join('') + `</g>` +
        `<circle cx="${cx}" cy="${cy}" r="36" fill="url(#g)"/>` +
        `<circle cx="${cx}" cy="${cy}" r="64" fill="none" stroke="#0a0414" stroke-width="14" opacity=".62"/>` +
        `<circle cx="${cx}" cy="${cy}" r="57.2" fill="none" stroke="#a78bfa" stroke-width=".8" opacity=".7"/><circle cx="${cx}" cy="${cy}" r="70.8" fill="none" stroke="#a78bfa" stroke-width=".8" opacity=".7"/>` +
        `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><use href="#R" stroke="#c084fc" stroke-width="1.5" opacity=".4"/><use href="#R" stroke="#f5e8ff" stroke-width=".5"/></g>` +
        dots([[210, 40, 1], [224, 132, 0.8], [196, 96, 0.7], [236, 18, 0.6], [350, 160, 0.7]], '#f0abfc', 0.7));
    },
  };

  /* ============================ РАМКА КАРТОЧКИ (border-image 120×120, срез 40) ============================ */
  // CSS: border-image: url(…) 40 / 18px / 8px round — срез 40 ед. = 18px, выступ наружу 8px ≈ 17.8 ед.
  // Значит, кромка самой карточки проходит на глубине ≈18 ед. от края SVG: 0…18 — зона «наружу» (завитки, листья, шипы),
  // 18…40 — поверх края карточки. Рисуем верхнюю плитку (x 40…80, y — глубина) и левый верхний угол (0…40);
  // остальные стороны — поворотом плитки, остальные углы — отражением угла. Центр 40…80 — пустой.
  // Сплошной обод доходит внутрь до глубины ≥29: его внутренняя дуга в углу (r≤11) закрывает скругление карточки 22px.
  // профиль полосы по глубине: линейный градиент для края и радиальный (центр 40,40) для скруглённого угла
  const prof = (id, s) => {
    const a = s[0][0], T = s[s.length - 1][0];
    return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${a}" x2="0" y2="${T}">${st(s.map(([y, c, o]) => [f3((y - a) / (T - a)), c, o]))}</linearGradient>` +
      `<radialGradient id="${id}r" gradientUnits="userSpaceOnUse" cx="40" cy="40" r="40">${st(s.slice().reverse().map(([y, c, o]) => [f3(1 - y / 40), c, o]))}</radialGradient>`;
  };
  const fill = (v, k) => (v[0] === '#' ? v : `url(#${v}${k ? 'r' : ''})`);
  // полоса глубиной a…b: [край, угол]
  const band = (a, b, v, x = '') => [
    `<path d="M40 ${a}H80V${b}H40Z" fill="${fill(v, 0)}"${x}/>`,
    `<path d="M${a} 40A${f(40 - a)} ${f(40 - a)} 0 0 1 40 ${a}V${b}A${f(40 - b)} ${f(40 - b)} 0 0 0 ${b} 40Z" fill="${fill(v, 1)}"${x}/>`];
  // линия на глубине y: [край, угол]
  const line = (y, s, w, x = '') => [
    `<path d="M40 ${y}H80" fill="none" stroke="${s}" stroke-width="${w}"${x}/>`,
    `<path d="M${y} 40A${f(40 - y)} ${f(40 - y)} 0 0 1 40 ${y}" fill="none" stroke="${s}" stroke-width="${w}"${x}/>`];
  // ряд зерни (точек) с шагом ≈d на глубине y — точки ровно на стыках 40/80
  const beads = (y, c, w, d) => {
    const L = (Math.PI / 2) * (40 - y), g = f3(L / Math.max(1, Math.round(L / d)));
    const [e, k] = line(y, c, w, ` stroke-linecap="round" stroke-dasharray="0 ${d}"`);
    return [e, k.replace(`0 ${d}"`, `0 ${g}"`)];
  };
  // точка дуги угла (центр 40,40, радиус r); φ=0 — левый стык (r→x), φ=90 — верхний стык
  const arcP = (r, φ) => [f(40 - r * Math.cos(φ * Math.PI / 180)), f(40 - r * Math.sin(φ * Math.PI / 180))];
  const CORN = ['', 'matrix(-1 0 0 1 120 0)', 'rotate(180 60 60)', 'matrix(1 0 0 -1 0 120)'];
  const SIDE = ['', 'rotate(90 60 60)', 'rotate(180 60 60)', 'rotate(270 60 60)'];
  // перенос точки левого верхнего угла на остальные углы (для бликов, что не должны вращаться)
  const cornP = [p => p, ([x, y]) => [120 - x, y], ([x, y]) => [120 - x, 120 - y], ([x, y]) => [x, 120 - y]];
  const sideP = [p => p, ([x, y]) => [120 - y, x], ([x, y]) => [120 - x, 120 - y], ([x, y]) => [y, 120 - x]];
  const tr = t => (t ? ` transform="${t}"` : '');
  const U = (id, t, x = '') => `<use href="#${id}" transform="${t}"${x}/>`;
  // сборка документа: parts — массив пар [край, угол]; corners — свои углы вместо отражений (змей)
  const frameDoc = (defs, parts, extra = '', corners) => {
    const e = parts.map(p => p[0]).join(''), c = parts.map(p => p[1]).join('');
    return `<svg ${NS} width="120" height="120" viewBox="0 0 120 120"><defs>${defs}<g id="e">${e}</g><g id="c">${c}</g></defs>` +
      SIDE.map(t => `<use href="#e"${tr(t)}/>`).join('') + (corners || CORN.map(t => `<use href="#c"${tr(t)}/>`).join('')) + extra + `</svg>`;
  };
  // каменья-кабошоны: [светлый, основной, тёмный, глубина]
  const GEMS = { r: ['#ffd1dc', '#f43f5e', '#9f1239', '#4c0519'], s: ['#dbeafe', '#3b82f6', '#1e3a8a', '#0b1a45'], e: ['#d1fae5', '#10b981', '#065f46', '#022c22'] };
  const gemG = k => rg(`j${k}`, [[0, GEMS[k][0]], [0.3, GEMS[k][1]], [0.75, GEMS[k][2]], [1, GEMS[k][3]]], 0.36, 0.32, 0.7);
  const gem = (x, y, s, k) => `<circle cx="${x}" cy="${y}" r="${s}" fill="url(#j${k})" stroke="#2a0f14" stroke-width=".6"/>` +
    `<ellipse cx="${f(x - s * 0.33)}" cy="${f(y - s * 0.38)}" rx="${f(s * 0.36)}" ry="${f(s * 0.2)}" transform="rotate(-35 ${f(x - s * 0.33)} ${f(y - s * 0.38)})" fill="#fff" opacity=".9"/>` +
    `<circle cx="${f(x + s * 0.4)}" cy="${f(y + s * 0.42)}" r="${f(s * 0.14)}" fill="#fff" opacity=".45"/>`;
  const goldR = id => rg(id, [[0, '#fff4c4'], [0.4, '#f3c451'], [0.8, '#a8731b'], [1, '#6b420e']], 0.35, 0.3, 0.75);
  // предмет вдоль направления: (ax,ay) — точка крепления, a — угол (0 — вправо), s — масштаб, len — полудлина фигуры
  const along = (id, ax, ay, a, s, len, x = '') => {
    const r = a * Math.PI / 180;
    return U(id, `translate(${f(ax + Math.cos(r) * len * s)} ${f(ay + Math.sin(r) * len * s)}) rotate(${a}) scale(${s})`, x);
  };

  const FR = {
    none: () => '',

    // Золотая кайма — гладкое золото с бликом, тонкая внутренняя линия, шарики-навершия в углах
    ring: () => frameDoc(
      prof('g', [[12, '#4a2c07'], [12.8, '#8a5a14'], [14, '#fff4c4'], [17, '#f3c451'], [21, '#a8731b'], [25, '#e0ae45'], [28.4, '#6b420e'], [29, '#3b2508']]) + goldR('b'),
      [band(12, 29, 'g'), line(14.6, '#fff', 0.8, ' opacity=".55"'), band(32, 34.4, '#3b2508'), band(32.6, 33.8, '#e9b949')],
      cornP.map(m => { const [x, y] = m([17.4, 17.4]), [u, v] = m([33.4, 33.4]); return `<circle cx="${x}" cy="${y}" r="4.6" fill="url(#b)" stroke="#3b2508" stroke-width=".8"/><circle cx="${u}" cy="${v}" r="3" fill="url(#b)" stroke="#3b2508" stroke-width=".7"/>`; }).join('')),

    // Рунная кайма — золото с высеченными рунами и ромбами, в углах выступают рунные ромбы-накладки
    rune: () => {
      const cut = (d, t) => `<path d="${d}" transform="${t} translate(.25 .35)" stroke="#fff4c4" stroke-width=".55" opacity=".75"/><path d="${d}" transform="${t}" stroke="#4a2c07" stroke-width=".6"/>`;
      const g = '<g fill="none" stroke-linecap="round" stroke-linejoin="round">';
      return frameDoc(
        prof('g', [[11, '#4a2c07'], [12, '#8a5a14'], [13.2, '#fff1b8'], [16.5, '#f3c451'], [21, '#b07a1c'], [25, '#e9b949'], [28.4, '#f0c860'], [30, '#3b2508']]) + goldR('b'),
        [band(11, 30, 'g'), line(14.6, '#5a3508', 0.8), line(26.4, '#5a3508', 0.8), line(15.4, '#fff4c4', 0.5, ' opacity=".6"'), line(27.2, '#fff4c4', 0.5, ' opacity=".6"'),
          [g + cut(RUNES[9], 'translate(49 20.5) scale(2.2)') + cut(RUNES[10], 'translate(71 20.5) scale(2.2)') + `</g>` +
            `<path d="M60 16L64.5 20.5 60 25 55.5 20.5Z" fill="#5a3508" stroke="#fff4c4" stroke-width=".5"/><path d="M60 18.2L62.3 20.5 60 22.8 57.7 20.5Z" fill="#f3c451"/>`,
          `<path d="M22 4.4L39.6 22 22 39.6 4.4 22Z" fill="#3b2508"/><path d="M22 6L38 22 22 38 6 22Z" fill="url(#b)"/>` +
            `<path d="M22 11L33 22 22 33 11 22Z" fill="#5a3508" stroke="#fff4c4" stroke-width=".6"/><path d="M22 14L30 22 22 30 14 22Z" fill="url(#gr)" stroke="#4a2c07" stroke-width=".5"/>` +
            g + cut(RUNES[7], 'translate(22 22) scale(1.4)') + `</g>`]]);
    },

    // Дубовый венок — ветка вьётся волной, листья выходят за край, в углах — пучки с желудями
    oak: () => {
      const L = (x, y, a, s, k) => along('l', x, y, a, s, 5, ` fill="url(#${k})"`);
      const A = (x, y, a, s) => U('n', `translate(${x} ${y}) rotate(${a}) scale(${s})`);
      const tw = 'M40 19C46.7 14 53.3 14 60 19S73.3 24 80 19';
      return frameDoc(
        lg('a', [[0, '#a3d160'], [1, '#3f6e22']]) + lg('b', [[0, '#7aa83e'], [1, '#2a4a17']]) +
        rg('k', [[0, '#f2c98a'], [0.6, '#c0813e'], [1, '#7a4a1c']], 0.35, 0.3, 0.75) +
        `<path id="l" d="M-5 0C-4-1.6-3-1-2.4-2.4C-1.4-1.4-.6-2.8.4-2.6C.8-1.6 1.8-2.8 2.8-2C3-1.2 4.2-1.4 5 0C4.2 1.4 3 1.2 2.8 2C1.8 2.8.8 1.6.4 2.6C-.6 2.8-1.4 1.4-2.4 2.4C-3 1-4 1.6-5 0ZM-4.6 0H3.4" stroke="#1f3510" stroke-width=".35"/>` +
        `<g id="n"><ellipse cy="1" rx="1.9" ry="2.4" fill="url(#k)" stroke="#4a2a0c" stroke-width=".4"/><path d="M-2.3.1a2.3 1.9 0 0 1 4.6 0Z" fill="#6b4a22" stroke="#3a2208" stroke-width=".4"/><path d="M0-1.8V-2.8" stroke="#3a2208" stroke-width=".6"/></g>`,
        [[`<path d="${tw}" fill="none" stroke="#2a1a0a" stroke-width="3.2"/><path d="${tw}" fill="none" stroke="#7a5230" stroke-width="1.8"/>`,
          `<path d="M19 40A21 21 0 0 1 40 19" fill="none" stroke="#2a1a0a" stroke-width="3.2"/><path d="M19 40A21 21 0 0 1 40 19" fill="none" stroke="#7a5230" stroke-width="1.8"/>`],
          [L(50, 15.3, -106, 1.6, 'a') + L(57.5, 17.2, -58, 1.25, 'b') + L(70, 22.7, 74, 1.15, 'b') + L(64, 21.6, 128, 1, 'a') + A(45.5, 13.4, 200, 1.45),
            L(24.6, 24.6, -135, 2, 'a') + L(29, 21, -100, 1.6, 'b') + L(21, 29, -170, 1.6, 'b') + L(34, 19.4, -70, 1.25, 'a') + L(19.4, 34, 160, 1.25, 'a') +
              L(27, 27, 45, 1, 'b') + A(18.6, 23.4, -150, 1.6) + A(23.4, 18.6, -120, 1.6) + A(15.4, 15.4, -135, 1.3)]]);
    },

    // Ледяной узор — ледяная кромка, наружу торчат кристаллы, внутрь — сосульки, в углах — друза
    ice: () => {
      const S = (x, y, a, s) => U('s', `translate(${x} ${y}) rotate(${a}) scale(${s})`);
      return frameDoc(
        prof('i', [[15, '#0c3a5a'], [15.8, '#e0f2fe'], [18, '#b5e3fa'], [20.5, '#3a8fc4'], [22, '#0c3a5a']]) +
        `<g id="s" stroke="#0c3a5a" stroke-width=".35" stroke-linejoin="round"><path d="M0-10L-2.2-2 0 1Z" fill="#effaff"/><path d="M0-10L2.2-2 0 1Z" fill="#7cc4ec"/></g>` +
        glowG('w', '#e0f2fe', 0.4),
        [[S(44, 16, -10, 0.8) + S(49.5, 16, 6, 1.45) + S(55, 16, -4, 0.75) + S(61, 16, 12, 1.1) + S(67.5, 16, -8, 1.5) + S(74, 16, 4, 0.7) + S(77.5, 16, 14, 0.95) +
          S(47, 21, 180, 0.55) + S(58, 21, 176, 0.8) + S(71, 21, 184, 0.6),
          `<circle cx="20" cy="20" r="13" fill="url(#w)"/>` + S(28.5, 23, -18, 1.55) + S(23, 28.5, -72, 1.55) + S(32, 21, 2, 1.05) + S(21, 32, -92, 1.05) +
            S(34, 20, 12, 0.7) + S(20, 34, -102, 0.7) + S(26, 26, -45, 2.1) + S(25, 25, -30, 1.1) + S(25, 25, -60, 1.1) + S(29, 29, 135, 0.7)],
          band(15, 22, 'i'), line(16.6, '#fff', 0.7, ' opacity=".75"'), line(25, '#bae6fd', 0.6, ' stroke-dasharray="1 2" opacity=".7"')],
        cornP.map(m => { const [x, y] = m([12, 12]), [u, v] = m([30, 13]), [p, q] = m([13, 30]); return spark(x, y, 2.6, '#fff') + spark(u, v, 1.6, '#fff', 0.9) + spark(p, q, 1.6, '#fff', 0.9); }).join(''));
    },

    // Огненная кайма — раскалённая кромка, неровные языки пламени пляшут наружу, в углах — вспышка
    flame: () => {
      const T = (x, y, a, s, k) => U('t', `translate(${x} ${y}) rotate(${a}) scale(${s})`, ` fill="url(#${k})"`);
      const row = (k, m) => [[44.5, -8, 1.05], [50, 7, 1.7], [55.5, 0, 0.95], [61, -10, 1.45], [67, 4, 1.15], [72.8, 9, 1.75], [77, -4, 0.8]].map(([x, a, s]) => T(x, 18, a, s * m, k)).join('');
      const cor = (k, m) => [[10, 1.2], [26, 1.55], [45, 2.1], [64, 1.55], [80, 1.2]].map(([φ, s]) => { const [x, y] = arcP(22, φ); return T(x, y, φ - 90, s * m, k); }).join('');
      return frameDoc(
        prof('r', [[17, '#2a0505'], [18.2, '#fdba74'], [20, '#ea580c'], [22, '#7f1d1d'], [23.4, '#2a0505']]) +
        lg('o', [[0, '#dc2626', 0.85], [0.5, '#f97316'], [1, '#fde047']], 0, 0, 0, 1) + lg('y', [[0, '#fcd34d', 0.9], [1, '#fffbe6']], 0, 0, 0, 1) +
        prof('h', [[4, '#f97316', 0], [18, '#f97316', 0.4], [22, '#f97316', 0.35], [32, '#f97316', 0]]) +
        `<path id="t" d="M-3 0C-3.6-3-1-5 0-7.6C.4-8.6.8-9.4 1.8-10C2.8-6.8 4-4 3 0Z" stroke="#7f1d1d" stroke-width=".3"/>`,
        [band(4, 32, 'h'), [row('o', 1), cor('o', 1)], [row('y', 0.55), cor('y', 0.55)], band(17, 23.4, 'r'), line(18.4, '#fef3c7', 0.6, ' opacity=".8"')]);
    },

    // Жемчужная — жемчуг на золотой нити по кромке, в углах самоцвет в оправе с жемчужной подвеской наружу
    pearl: () => {
      const P = (x, y, k) => `<use href="#${k}" x="${x}" y="${y}"/>`;
      let ex = '';
      sideP.forEach(m => [45, 55, 65, 75].forEach(x => { ex += P(...m([x, 18]), 'p'); }));
      cornP.forEach((m, i) => {
        [arcP(22, 20), arcP(22, 70)].forEach(p => { ex += P(...m(p), 'p'); });
        const [x, y] = m([24.4, 24.4]), [u, v] = m([12.6, 12.6]);
        ex += P(u, v, 'p') + `<circle cx="${x}" cy="${y}" r="9.6" fill="url(#q)" stroke="#3b2508" stroke-width=".8"/>` + gem(x, y, 6.6, i % 2 ? 's' : 'r');
      });
      return frameDoc(
        prof('g', [[16.8, '#4a2c07'], [17.4, '#fff1b8'], [18.4, '#e9b949'], [19.4, '#6b420e']]) + gemG('r') + gemG('s') + goldR('q') +
        rg('w', [[0, '#ffffff'], [0.3, '#f7f1e8'], [0.62, '#e8d9dc'], [0.85, '#b8aa94'], [1, '#7d705c']], 0.36, 0.32, 0.7) +
        `<circle id="p" r="4.4" fill="url(#w)" stroke="#4a3b28" stroke-width=".5"/><circle id="d" r="1.6" fill="url(#w)" stroke="#4a3b28" stroke-width=".35"/>` +
        `<circle id="b" r="1.6" fill="#f3c451" stroke="#6b420e" stroke-width=".4"/>`,
        [band(17, 19.4, 'g'), line(28, '#a8731b', 0.6),
          [[40, 50, 60, 70, 80].map(x => P(x, 18, 'b')).join('') + [42.5, 47.5, 52.5, 57.5, 62.5, 67.5, 72.5, 77.5].map(x => P(x, 28, 'd')).join(''),
            [arcP(12, 20), arcP(12, 45), arcP(12, 70)].map(p => P(...p, 'd')).join('') + `<path d="M12.6 12.6L20 20" stroke="#e9b949" stroke-width="1"/>`]], ex);
    },

    // Змей-уроборос — чешуйчатый змей извивается волной вдоль края; в левом верхнем углу голова кусает хвост
    serpent: () => {
      const W = 'M40 13C50 13 50 23 60 23S70 13 80 13', A = r => `M${f(40 - r)} 40A${r} ${r} 0 0 1 40 ${f(40 - r)}`;
      const lay = (d, dh, db) => `<path d="${d}" stroke="#0b2415" stroke-width="12.6"/><path d="${d}" stroke="#2f8a55" stroke-width="11"/>` +
        `<path d="${d}" pathLength="42" stroke="#0b2d1a" stroke-width="8" stroke-dasharray="0 1.15 .7 1.15" opacity=".45"/>` + dh + db;
      const body = [`<g fill="none">` + lay(W, `<path d="${W}" transform="translate(0 -3.2)" stroke="#a7ecb4" stroke-width="2.6" opacity=".7"/>`,
        `<path d="${W}" transform="translate(0 3.8)" stroke="#e2b24a" stroke-width="2.4"/><path d="${W}" transform="translate(0 3.8)" pathLength="42" stroke="#6b420e" stroke-width="2.4" stroke-dasharray="0 1.5 .5 1.5"/>`) + `</g>`,
      `<g fill="none">` + lay(A(27), `<path d="${A(30.2)}" stroke="#a7ecb4" stroke-width="2.6" opacity=".7"/>`,
        `<path d="${A(23.2)}" stroke="#e2b24a" stroke-width="2.4"/><path d="${A(23.2)}" pathLength="42" stroke="#6b420e" stroke-width="2.4" stroke-dasharray="0 1.5 .5 1.5"/>`) +
        `<path d="${[28, 62].map(φ => `M${arcP(31.6, φ - 5).join(' ')}L${arcP(37.4, φ - 9).join(' ')} ${arcP(31.6, φ + 4).join(' ')}Z`).join('')}" fill="#e0a93a" stroke="#3a2208" stroke-width=".4"/></g>`];
      // левый верхний угол: хвост сужается от верхней плитки к пасти, шея поднимается от левой плитки
      const head = `<path d="M40 7.5C33 7.5 27 9 20 12.4C27 13.4 33 18.5 40 18.5Z" fill="#2f8a55" stroke="#0b2415" stroke-width=".7"/>` +
        `<path d="M40 10C34 10 29 11 24 12.4" fill="none" stroke="#a7ecb4" stroke-width="1.4" opacity=".6"/>` +
        `<path d="M7.5 22l-4.4 2 4.4 2.6ZM7.5 29l-4.4 2 4.4 2.6ZM7.5 36l-4.4 2 4.4 2.6Z" fill="#e0a93a" stroke="#3a2208" stroke-width=".4"/>` +
        `<path d="M7.5 40V20C7.5 11 10 5.5 15 5C19 4.6 23 6 26.4 7.6C27.8 8.3 27.8 10 26.4 10.4L18.4 11.8 25 14.4C26.2 15 25.8 17.2 24.4 17.4C21.6 17.8 19.6 18.6 18.5 20.6V40Z" fill="url(#h)" stroke="#0b2415" stroke-width=".8" stroke-linejoin="round"/>` +
        `<path d="M16.2 40V22.6C16.8 21 18 19.8 19.6 19.2" fill="none" stroke="#e2b24a" stroke-width="2.2"/>` +
        `<path d="M10.8 7.2Q6.4 4.4 3.6.8Q8.8 1.8 12.8 5.2Z" fill="#e0a93a" stroke="#3a2208" stroke-width=".45"/>` +
        `<ellipse cx="15" cy="9.6" rx="2.3" ry="1.6" transform="rotate(-15 15 9.6)" fill="#fde047" stroke="#0b2415" stroke-width=".5"/><path d="M15.2 8.2V11" stroke="#0b2415" stroke-width=".7"/>` +
        `<path d="M19.4 11.4l.7 1.6.8-1.4ZM22.6 13.8l.7-1.5.8 1.8Z" fill="#fff"/><circle cx="24.2" cy="8.2" r=".5" fill="#0b2415"/>`;
      return frameDoc(lg('h', [[0, '#a7ecb4'], [0.45, '#3fa066'], [1, '#0f3d25']]) + `<g id="k">${head}</g>`, [body], '',
        U('k', 'translate(0 0)') + CORN.slice(1).map(t => `<use href="#c"${tr(t)}/>`).join(''));
    },

    // Навий шип — тёмно-фиолетовый обод, рваный край: крючья-шипы наружу, мелкие внутрь, светящиеся руны
    thorn: () => {
      const th = (x, s, y = 15.4, k = -1) => `<path d="M${f(x - 4 * s)} ${y}C${f(x - 2 * s)} ${f(y + k * 4 * s)} ${f(x - s)} ${f(y + k * 9 * s)} ${f(x + 1.6 * s)} ${f(y + k * 13 * s)}C${f(x + s)} ${f(y + k * 8 * s)} ${f(x + 2.4 * s)} ${f(y + k * 4 * s)} ${f(x + 4 * s)} ${y}Z"/>`;
      const rune = (x, y, d, s) => `<circle cx="${x}" cy="${y}" r="${6.5 * s}" fill="url(#w)"/><path d="${d}" transform="translate(${x} ${y}) scale(${2 * s})" fill="none" stroke="#fdf4ff" stroke-width=".45" stroke-linecap="round" stroke-linejoin="round"/>`;
      const G = '<g fill="url(#t)" stroke="#0c0418" stroke-width=".45" stroke-linejoin="round">';
      const ct = [[10, 1], [30, 0.9], [60, 0.9], [80, 1]].map(([φ, s]) => { const [x, y] = arcP(25, φ); return `<path d="M-3 0C-1.5-3-.8-7 1.2-10 .8-6 1.8-3 3 0Z" transform="translate(${x} ${y}) rotate(${φ - 90}) scale(${s})"/>`; }).join('');
      return frameDoc(
        prof('v', [[14, '#0c0418'], [15.2, '#a78bfa'], [18.5, '#5b2a9e'], [24.5, '#2e1065'], [29, '#0c0418']]) +
        lg('t', [[0, '#e9d5ff'], [0.45, '#7c4ad0'], [1, '#2e1065']], 1, 0, 0, 1) + glowG('w', '#e879f9', 0.9),
        [[G + th(44, 0.62) + th(51, 1.02) + th(58.5, 0.55) + th(66, 1.05) + th(74, 0.72) + th(48, 0.42, 28.6, 1) + th(68, 0.46, 28.6, 1) + `</g>`,
          G + `<path d="M17 25C14 19 10 13 3.4 3.4 12.4 9.2 18.6 13 25 17Z"/>` + ct + `</g>`],
          band(14, 29, 'v'), line(15.2, '#c4b5fd', 0.5, ' opacity=".6"'),
          [rune(49, 21.5, RUNES[9], 1) + rune(71, 21.5, RUNES[10], 1), rune(26.4, 26.4, RUNES[7], 1.1)]]);
    },

    // Княжий оклад — широкое золото, зернь, скань; наружу — фигурные гребни-кокошники, в углах розетки с самоцветами
    knyaz: () => {
      const fil = `M40 21.5C45 16.5 55 16.5 60 21.5S75 26.5 80 21.5M50 17.1c-2.6-1.2-4.8 1-3.6 3 1 1.4 3 .6 2.6-.8M70 25.9c2.6 1.2 4.8-1 3.6-3-1-1.4-3-.6-2.6.8`;
      const crest = `<path d="M51.4 12.6C52.6 9 56.2 8.6 57.2 6 57.8 4.4 58.8 3.2 60 2.4 61.2 3.2 62.2 4.4 62.8 6 63.8 8.6 67.4 9 68.6 12.6Z" fill="url(#p)" stroke="#3b2508" stroke-width=".6"/>` +
        `<path d="M54.4 12c.4-2 2.4-2.4 3.4-1.4M65.6 12c-.4-2-2.4-2.4-3.4-1.4M44 12.6c-.2-3 2.6-4.6 4.4-3 1.4 1.2.2 3.2-1.2 2.6M76 12.6c.2-3-2.6-4.6-4.4-3-1.4 1.2-.2 3.2 1.2 2.6" fill="none" stroke="#6b3f06" stroke-width=".7" stroke-linecap="round"/>` +
        gem(60, 8.2, 1.9, 'r');
      let ex = '';
      cornP.forEach((m, i) => { const [x, y] = m([23.4, 23.4]); ex += `<use href="#o" x="${x}" y="${y}"/>` + gem(x, y, 6.6, i % 2 ? 'e' : 'r'); });
      return frameDoc(
        prof('g', [[12, '#3b2508'], [12.8, '#8a5a14'], [14, '#fff1b8'], [17, '#f3c451'], [21.5, '#b07a1c'], [25, '#e9b949'], [29, '#a8731b'], [30.4, '#f0c860'], [31, '#3b2508']]) +
        rg('p', [[0, '#fff4c4'], [0.35, '#f3c451'], [0.75, '#a8731b'], [1, '#6b420e']], 0.35, 0.3, 0.75) + gemG('r') + gemG('e') +
        `<g id="o" fill="url(#p)" stroke="#3b2508" stroke-width=".5">` + Array.from({ length: 8 }, (_, k) => `<ellipse cy="-10.6" rx="3.1" ry="4" transform="rotate(${k * 45})"/>`).join('') +
        `<circle r="9.4"/><circle r="8.1" fill="none" stroke="#fff1b8" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="0 6.36"/></g>`,
        [[crest, ''], band(12, 31, 'g'), line(15.2, '#8a5a14', 0.5), line(27.8, '#8a5a14', 0.5), beads(15.2, '#fde68a', 1.9, 3.6), beads(27.8, '#fde68a', 1.9, 3.6),
          [`<path d="${fil}" fill="none" stroke="#fff4c4" stroke-width=".8" opacity=".55" transform="translate(.3 .4)"/><path d="${fil}" fill="none" stroke="#6b3f06" stroke-width=".75" stroke-linecap="round"/>`, line(21.5, '#6b3f06', 0.75)[1]],
          band(31, 32.4, '#7f1d1d')], ex);
    },
  };

  const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  return {
    cardBg(id) { return (own(BG, id) ? BG[id] : BG.night)(); },
    cardFrame(id) { return own(FR, id) ? FR[id]() : ''; },
  };
})();
