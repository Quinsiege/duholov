'use strict';
/* 4.6: фон и рамка КАРТОЧКИ Ловчего (плашка профиля ~360×170, скругление ~22px). Наборы — LOOK.bg / LOOK.frame в js/data.js.
   LookArt.cardBg(id)    — полный SVG-документ 360×170 (preserveAspectRatio slice) для background: … center/cover.
                           Левая треть (аватар) и середина (текст) — тихие и тёмные, эффекты — справа и по краю.
   LookArt.cardFrame(id) — кайма: полный SVG-документ 120×120 для border-image: url(…) 40 / 22px / 10px round (без fill).
                           Средние полосы 40 — узор-плитка с периодом 40, центр прозрачный; наружу (выступ 10px ≈ внешние
                           18 ед. SVG) выходят гребешки, листья, кристаллы, пламя, шипы.
   LookArt.frameParts(id) — живые украшения поверх карточки: { corner | corners, crest, foot } (или null) — внутренность SVG,
                           встраивается в страницу (Art.cardSkin), поэтому работают CSS-анимации; id — с приставкой __ID__.
   Стиль «сказочная Навь»: объём градиентами (свет сверху-слева), тёмная обводка, свечение — только радиальными градиентами.
   id приходит и от других игроков: берём только свои ключи (hasOwnProperty); неизвестный фон — «Ночь», рамка — пусто. */

const LookArt = (() => {
  const NS = 'xmlns="http://www.w3.org/2000/svg"';
  const f = v => Math.round(v * 10) / 10;
  const f3 = v => Math.round(v * 1000) / 1000;
  const st = a => a.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op == null ? '' : ` stop-opacity="${f3(op)}"`}/>`).join('');
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

  /* ============================ РАМКА КАРТОЧКИ ============================ */
  // Рамка из двух слоёв:
  //  1) кайма — cardFrame(id): SVG 120×120 для CSS border-image: url(…) 40 / 22px / 10px round (в мини-карточке 13px / 6px).
  //     Срез 40 ед. = 22px, выступ наружу 10px ≈ 18 ед. Кромка карточки проходит на глубине ≈18 ед. от края SVG:
  //     0…18 — наружу (гребешки, листья, шипы, пламя), 18…40 — поверх края карточки. Рисуем верхнюю плитку (x 40…80, y — глубина)
  //     и левый верхний угол (0…40); остальные стороны — поворотом плитки, углы — отражением. Центр 40…80 — пустой.
  //     Углы каймы потом закрывают живые угловые украшения, поэтому в углу кайма — просто скруглённый обод.
  //  2) живые части — frameParts(id): { corner | corners, crest, foot } — встроенный SVG поверх карточки (Art.cardSkin),
  //     поэтому в них работают CSS-анимации (art-flicker, art-sway, cf-glint, cf-pulse…). Все id — с приставкой __ID__.
  //     corners [лв, пв, лн, пн] — viewBox 80×80, угол карточки в (18,18)/(62,18)/(18,62)/(62,62); общие <defs> — в левом верхнем
  //     (на них ссылаются и остальные углы, навершие и подвеска: всё это — один документ). crest — 160×64, верхняя кромка по y≈43;
  //     foot — 120×40, нижняя кромка по y≈20 (ниже — наружу, overflow виден). Слой .cf-ov стоит внутри рамки-border 1px,
  //     поэтому наружный край карточки для частей на ≈1px дальше: в углу ≈(17,17), у навершия y≈42, у подвески y≈21.
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
  const tr = t => (t ? ` transform="${t}"` : '');
  const U = (id, t, x = '') => `<use href="#${id}"${tr(t)}${x}/>`;
  // сборка каймы: parts — массив пар [край, угол]
  const frameDoc = (defs, parts, extra = '') => {
    const e = parts.map(p => p[0]).join(''), c = parts.map(p => p[1]).join('');
    return `<svg ${NS} width="120" height="120" viewBox="0 0 120 120"><defs>${defs}<g id="e">${e}</g><g id="c">${c}</g></defs>` +
      SIDE.map(t => `<use href="#e"${tr(t)}/>`).join('') + CORN.map(t => `<use href="#c"${tr(t)}/>`).join('') + extra + `</svg>`;
  };
  // плитка каймы: один мотив через каждые d ед. (x 40…80), f(x) — рисунок мотива в точке x
  const rep = (d, fn, x0 = 40) => { let s = ''; for (let x = x0; x <= 80.01; x += d) s += fn(f(x)); return s; };
  // каменья-кабошоны: [светлый, основной, тёмный, глубина]
  const GEMS = { r: ['#ffd1dc', '#f43f5e', '#9f1239', '#4c0519'], s: ['#dbeafe', '#3b82f6', '#1e3a8a', '#0b1a45'], e: ['#d1fae5', '#10b981', '#065f46', '#022c22'],
    t: ['#e0fffb', '#2dd4bf', '#0f766e', '#042f2e'], a: ['#fef3c7', '#f59e0b', '#9a3412', '#431407'], v: ['#f5e8ff', '#c084fc', '#6b21a8', '#2e1065'] };
  // камень — штамп радиуса 1 (градиент + блики) в <defs>, ставится <use> с масштабом = радиусу
  const gemG = (k, p = '') => rg(`${p}j${k}`, [[0, GEMS[k][0]], [0.3, GEMS[k][1]], [0.75, GEMS[k][2]], [1, GEMS[k][3]]], 0.36, 0.32, 0.7) +
    `<g id="${p}G${k}"><circle r="1" fill="url(#${p}j${k})" stroke="#1b1030" stroke-width=".13"/><ellipse cx="-.33" cy="-.38" rx=".36" ry=".2" transform="rotate(-35 -.33 -.38)" fill="#fff" opacity=".9"/><circle cx=".4" cy=".42" r=".14" fill="#fff" opacity=".45"/></g>`;
  const gem = (x, y, s, k, p = '') => `<use href="#${p}G${k}" transform="translate(${x} ${y}) scale(${s})"/>`;
  const GOLD = [[0, '#fff6d0'], [0.35, '#f5cc62'], [0.75, '#a8731b'], [1, '#5a3508']];
  const goldR = id => rg(id, GOLD, 0.35, 0.3, 0.8);

  // ---------- живые части: помощники ----------
  const I = '__ID__', u = k => `url(#${I}${k})`;
  const dl = d => (d ? ` style="animation-delay:-${String(f(d)).replace(/^0./, '.')}s"` : '');
  const A = (cls, body, d) => `<g class="${cls}"${dl(d)}>${body}</g>`;
  const T = (t, s) => `<g transform="${t}">${s}</g>`;
  const UI = (id, t, x = '') => `<use href="#${I}${id}"${tr(t)}${x}/>`;
  // вспышка-блеск: мягкий ореол и четырёхлучевая искра
  const GW = glowG(I + 'gw', '#fff', 0.95);
  const GLD = GW + `<g id="${I}gl"><circle r="1.1" fill="${u('gw')}"/>${spark(0, 0, 1, '#fff')}</g>`;
  const glint = (x, y, s, d) => A('cf-glint', UI('gl', `translate(${x} ${y}) scale(${s})`), d);
  // зеркально по диагонали угла (x↔y): узор симметричен относительно биссектрисы, свет сверху-слева сохраняется
  const diag = s => `<g id="${I}dg">${s}</g>` + UI('dg', 'matrix(0 1 1 0 0 0)');
  // четыре угла из одного: base — неподвижное тело левого верхнего угла (лежит в его <defs> как #__ID__q, остальные углы
  // берут его <use> с отражением), live(i) — живые детали угла i (в координатах левого верхнего, отражаются так же; свои задержки)
  const MQ = ['', 'matrix(-1 0 0 1 80 0)', 'matrix(1 0 0 -1 0 80)', 'matrix(-1 0 0 -1 80 80)'];
  // defs может быть функцией: её зовут после сборки углов (для штампов, что набираются по ходу, — жемчуг разных размеров)
  const quad = (defs, base, live, under) => {
    const L = MQ.map((t, i) => (under ? `<g${tr(t)}>${under(i)}</g>` : '') + `<use href="#${I}cq"${tr(t)}/>` + (live ? `<g${tr(t)}>${live(i)}</g>` : ''));
    L[0] = `<defs>${typeof defs === 'function' ? defs() : defs}<g id="${I}cq">${base}</g></defs>` + L[0];
    return L;
  };
  // многоугольник по точкам
  const poly = (a, x = '') => `<path d="M${a.map(p => p.join(' ')).join('L')}Z"${x}/>`;
  // поворот местных координат: (x,y) — опора, a — угол в градусах (0 — «вверх» остаётся вверх)
  const rot = (x, y, a) => { const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return (p, q) => [f(x + p * c - q * s), f(y + p * s + q * c)]; };
  // качание вокруг точки (px,py): невидимый круг делает её центром рамки фигуры (transform-box: fill-box)
  const swing = (px, py, R, body, d, cls = 'art-spin-soft') => A(cls, `<circle cx="${px}" cy="${py}" r="${R}" fill="none"/>` + body, d);
  // дубовый лист: черенок в (0,0), кончик в (12,0)
  const OAK = 'M0 0C1-1.6 2-2 3-1.6C3.4-3.2 5-3.8 6-2.8C6.6-4.4 8.4-4.6 9.2-3.2C10.2-3.4 11.6-2 12 0C11.6 2 10.2 3.4 9.2 3.2C8.4 4.6 6.6 4.4 6 2.8C5 3.8 3.4 3.2 3 1.6C2 2 1 1.6 0 0Z';
  const leafDef = id => `<g id="${id}"><path d="${OAK}" stroke="#1f3510" stroke-width=".45" stroke-linejoin="round"/><path d="M.8 0H10.6M3 0l1.4-1.6M3 0l1.4 1.6M6 0l1.4-1.8M6 0l1.4 1.8" fill="none" stroke="#1f3510" stroke-width=".32" opacity=".6"/></g>`;
  // жёлудь: шляпка у (0,0), орех вниз (+y)
  const acornDef = (id, k, m) => `<g id="${id}"><ellipse cy="4.4" rx="3" ry="3.9" fill="url(#${k})" stroke="#3a2208" stroke-width=".45"/><ellipse cx="-1.1" cy="3.8" rx=".8" ry="1.7" fill="#fff" opacity=".35"/>` +
    `<path d="M-3.7 1.7C-3.7-.9-2-2.1 0-2.1S3.7-.9 3.7 1.7C2 2.5-2 2.5-3.7 1.7Z" fill="url(#${m})" stroke="#3a2208" stroke-width=".45"/><path d="M-2.4-.4 2.6 1.2M-3 .8 1.2-1.6M-.8 1.9 2.8-.8" stroke="#3a2208" stroke-width=".3" opacity=".6"/><path d="M0-2V-3.6" stroke="#3a2208" stroke-width=".9" stroke-linecap="round"/></g>`;
  // кристалл льда — штамп полуширины 1 и длины r (опора в 0,0, остриё вверх): левая грань светлая, правая — тень;
  // ставится <use> с поворотом и масштабом = полуширине; kinds — пропорции r
  const CRYS = { k3: 3, k5: 5.5, k7: 7.2, k10: 10 };
  const crysDefs = (p, g1, g2) => Object.keys(CRYS).map(k => { const r = CRYS[k], h = f(-r + 1.3); return `<g id="${p}${k}"><path d="M-1 0V${h}L0 -${r}V0Z" fill="${g1}"/><path d="M1 0V${h}L0 -${r}V0Z" fill="${g2}"/>` +
    `<path d="M-1 0V${h}L0 -${r} 1 ${h}V0" fill="none" stroke="#0a2f4d" stroke-width=".17" stroke-linejoin="round"/><path d="M-.5-.3V${f(-r + 1.7)}" stroke="#fff" stroke-width=".28" stroke-linecap="round" opacity=".75"/></g>`; }).join('');
  // k — вид, (x,y) опора, a — наклон, w — полуширина; сосулька (a=180) отражена, чтобы светлая грань осталась слева
  // кристалл длины L и полуширины ≈w: ближайшая пропорция из CRYS, длина — точная
  const crysAt = (p, x, y, a, w, L) => { const k = Object.keys(CRYS).reduce((b, k) => (Math.abs(CRYS[k] - L / w) < Math.abs(CRYS[b] - L / w) ? k : b)); return cry(p, k, x, y, a, f3(L / CRYS[k])); };
  const cry = (p, k, x, y, a, w) => `<use href="#${p}${k}" transform="translate(${x} ${y}) rotate(${a}) scale(${a === 180 ? -w : w} ${w})"/>`;
  // снежинка радиуса r
  const flakeDef = id => {
    let d = '';
    for (let k = 0; k < 6; k++) { const P = rot(0, 0, k * 60), e = P(0, -10), m = P(0, -5.5), b1 = P(-2.8, -8), b2 = P(2.8, -8); d += `M0 0L${e.join(' ')}M${m.join(' ')}L${b1.join(' ')}M${m.join(' ')}L${b2.join(' ')}`; }
    return `<path id="${id}" d="${d}" fill="none" stroke-linecap="round"/>`;
  };
  const flake = (x, y, r, c = '#fff', w = 1.7) => UI('fl', `translate(${x} ${y}) scale(${f3(r / 10)})`, ` stroke="${c}" stroke-width="${w}"`);
  // руна-штамп со свечением: (k — номер в RUNES), c1 — цвет свечения линии, c2 — сердцевина, g — id градиента ореола
  const runeDef = (k, c1, c2, g) => `<g id="${I}R${k}" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle r="3.4" fill="${u(g)}"/><path d="${RUNES[k]}" stroke="${c1}" stroke-width="1.45"/>` +
    `<path d="${RUNES[k]}" stroke="${c2}" stroke-width=".55"/></g>`;
  const Rn = (k, x, y, s, d) => A('cf-pulse', UI('R' + k, `translate(${x} ${y}) scale(${s})`), d);
  // жемчуг-штампы по радиусам: P(x,y,r) запоминает радиус, pearlDefs() выдаёт нужные <circle>
  const pearls = g => { const R = new Set(); const P = (x, y, r) => { R.add(r); return `<use href="#${I}p${String(r).replace('.', '_')}" x="${x}" y="${y}"/>`; };
    P.defs = () => [...R].map(r => `<circle id="${I}p${String(r).replace('.', '_')}" r="${r}" fill="${g}" stroke="#3b2d4a" stroke-width="${f(Math.max(0.3, r * 0.12))}"/>`).join(''); return P; };
  // язык пламени: основание в (0,0), вверх на 16
  const FLAME = 'M-4.4 0C-6.6-3.2-5-7.4-2.2-10C-2.6-7.4-1.8-5.8-.6-5C-1.4-9.4.8-13.6 3.8-16C2.8-12.4 4.4-9.6 5.2-7C6-4.6 5.8-2 4.2 0Z';
  // жемчуг: перламутровая заливка (лёгкий розово-сиреневый отлив) и капля-подвеска (верх в 0,0, низ ≈14.6·s)
  const pearlG = id => rg(id, [[0, '#ffffff'], [0.28, '#fbf5ee'], [0.6, '#ecdce2'], [0.85, '#b4a4bc'], [1, '#6f6280']], 0.36, 0.32, 0.7);
  const pearl = (x, y, r, g) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${g}" stroke="#3b2d4a" stroke-width="${f(Math.max(0.3, r * 0.12))}"/>`;
  const DROP = 'M0 0C-3.6 4-5 7-5 9.6A5 5 0 0 0 5 9.6C5 7 3.6 4 0 0Z';
  const drop = (x, y, s, g, a = 0) => `<path d="${DROP}" transform="translate(${x} ${y}) rotate(${a}) scale(${s})" fill="${g}" stroke="#3b2d4a" stroke-width="${f(0.5 / s)}"/>`;
  // точки вдоль кубической кривой с равным шагом по длине
  const bzAt = (P, t) => { const v = 1 - t; return [0, 1].map(k => v * v * v * P[0][k] + 3 * v * v * t * P[1][k] + 3 * v * t * t * P[2][k] + t * t * t * P[3][k]); };
  const bzEven = (P, step) => {
    const a = [], N = 120; let prev = bzAt(P, 0), acc = step; a.push(prev.map(f));
    for (let k = 1; k <= N; k++) { const p = bzAt(P, k / N); acc -= Math.hypot(p[0] - prev[0], p[1] - prev[1]); if (acc <= 0) { a.push(p.map(f)); acc += step; } prev = p; }
    if (acc < step * 0.7) a.push(P[3].map(f)); else a[a.length - 1] = P[3].map(f);
    return a;
  };
  // золотая розетка из n лепестков вокруг (x,y)
  const rosette = (x, y, n, R, rx, ry, g) => `<path d="${Array.from({ length: n }, (_, k) => { const P = rot(x, y, k * 360 / n), q = (a, b) => P(a, b).join(' ');
    return `M${q(0, -R + ry)}Q${q(-rx * 1.9, -R)} ${q(0, -R - ry)}Q${q(rx * 1.9, -R)} ${q(0, -R + ry)}`; }).join('')}" fill="${g}" stroke="#2a1804" stroke-width=".6"/>`;
  // змей: полосы поперёк тела s ∈ [1 — спина … −1 — брюхо]; одни и те же у каймы и у живых углов, чтобы стыки не были видны
  const SNAKE = [[1, '#0b2415'], [0.88, '#0b2415'], [0.87, '#4fb574'], [0.52, '#4fb574'], [0.51, '#2f8a55'], [-0.3, '#2f8a55'], [-0.31, '#0b2415'], [-0.35, '#0b2415'],
    [-0.36, '#e2b24a'], [-0.86, '#e2b24a'], [-0.87, '#0b2415'], [-1, '#0b2415']];
  // тело змея вдоль цепочки кубических кривых (ширина w): полосы — обводками смещённых линий, поперёк — пунктиром (кольца чешуи
  // и щитки брюха); спина — слева по ходу движения; sp = [заливка, от, до] — золотые плавники на спине на доле длины от…до
  const tube = (segs, w, sp) => {
    const pts = st => { const p = []; segs.forEach((S, k) => { const c = (a, b) => Math.abs((a[0] - S[0][0]) * (S[3][1] - S[0][1]) - (a[1] - S[0][1]) * (S[3][0] - S[0][0]));
      bzEven(S, st || (c(S[1]) + c(S[2]) < 0.01 ? 99 : 3.2)).slice(k ? 1 : 0).forEach(q => p.push(q)); }); return p; };
    const nrm = p => p.map((_, i) => { const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1; return [dx / m, dy / m]; });
    const off = (p, N, i, s) => [f(p[i][0] - N[i][1] * s * w / 2), f(p[i][1] + N[i][0] * s * w / 2)];
    const p = pts(), N = nrm(p), ln = s => 'M' + p.map((_, i) => off(p, N, i, s).join(' ')).join('L');
    const bd = (a, b, c, x = '') => `<path d="${ln((a + b) / 2)}" fill="none" stroke="${c}" stroke-width="${f((a - b) * w / 2)}" stroke-linejoin="round"${x}/>`;
    let fin = '';
    if (sp) {
      const q = pts(2.8), M = nrm(q), n = q.length;
      for (let i = 1; i < n - 1; i += 3) if (i >= n * sp[1] && i <= n * sp[2]) {
        const b1 = off(q, M, i, 0.86), tp = off(q, M, i, 1.55), t = M[i];
        fin += `M${f(b1[0] + t[0] * 1.8)} ${f(b1[1] + t[1] * 1.8)}L${f(tp[0] + t[0] * 2.2)} ${f(tp[1] + t[1] * 2.2)} ${f(b1[0] - t[0] * 1.6)} ${f(b1[1] - t[1] * 1.6)}Z`;
      }
    }
    return (fin ? `<path d="${fin}" fill="${sp[0]}" stroke="#3a2208" stroke-width=".45" stroke-linejoin="round"/>` : '') +
      `<path d="${ln(0)}" fill="none" stroke="#0b2415" stroke-width="${w}" stroke-linejoin="round"/>` + bd(0.87, 0.52, '#4fb574') + bd(0.51, -0.31, '#2f8a55') + bd(-0.36, -0.86, '#e2b24a') +
      bd(0.52, -0.3, '#154a2c', ' stroke-dasharray=".45 1.77"') + bd(-0.4, -0.82, '#8a5a14', ' stroke-dasharray=".4 1.82"');
  };
  const flameDef = (id, a, b, c) => `<g id="${id}"><path d="${FLAME}" fill="url(#${a})" stroke="#7f1d1d" stroke-width=".35"/><path d="${FLAME}" transform="scale(.66)" fill="url(#${b})"/><path d="${FLAME}" transform="scale(.36)" fill="url(#${c})"/></g>`;

  const FR = {
    none: () => '',

    // Золотая кайма — литой золотой вал с бликом, тёмный желобок и внутренний поясок с зернью
    ring: () => frameDoc(
      prof('g', [[6, '#2a1804'], [7, '#7a4d10'], [8.8, '#fff6d0'], [11.6, '#f7d272'], [16, '#c8922e'], [19.6, '#7a4d10'], [21.8, '#e9b949'], [23, '#fff1b8'],
        [24.2, '#8a5a14'], [25, '#2a1804'], [26, '#2a1804'], [26.8, '#f7d272'], [30, '#b07a1c'], [32.4, '#5a3508'], [33.2, '#2a1804']]),
      [band(6, 33.2, 'g'), line(9.4, '#fff', 1, ' opacity=".75"'), line(22.6, '#fff8dc', 0.6, ' opacity=".6"'), beads(29.4, '#3b2508', 2.4, 4), beads(29, '#fff1b8', 1.4, 4)]),

    // Рунная кайма — два золотых пояска, между ними тёмный желоб с высеченными светящимися рунами и ромбиками
    rune: () => {
      const rn = (x, k) => `<ellipse cx="${x}" cy="20" rx="7" ry="7" fill="url(#w)"/><path d="${RUNES[k]}" transform="translate(${x} 20) scale(2.55)" fill="none" stroke="#2dd4bf" stroke-width=".95" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="${RUNES[k]}" transform="translate(${x} 20) scale(2.55)" fill="none" stroke="#f0fffd" stroke-width=".38" stroke-linecap="round" stroke-linejoin="round"/>`;
      const dia = x => `<path d="M${x} 16L${f(x + 4)} 20 ${x} 24 ${f(x - 4)} 20Z" fill="url(#b)" stroke="#2a1804" stroke-width=".7"/><path d="M${x} 18.1L${f(x + 1.9)} 20 ${x} 21.9 ${f(x - 1.9)} 20Z" fill="#2dd4bf" stroke="#0f3d3a" stroke-width=".4"/><circle cx="${f(x - 0.7)}" cy="19.2" r=".6" fill="#fff"/>`;
      return frameDoc(
        prof('g', [[6, '#2a1804'], [7, '#8a5a14'], [8.4, '#fff4c4'], [10.6, '#e9b949'], [12.4, '#8a5a14'], [13.2, '#1a0d03'], [14.6, '#050201'], [20, '#1d1206'], [26.4, '#2b1a08'],
          [26.8, '#1a0d03'], [27.6, '#a8731b'], [28.8, '#fff1b8'], [31, '#e0ae45'], [32.8, '#6b420e'], [33.6, '#2a1804']]) + goldR('b') + glowG('w', '#2dd4bf', 0.75),
        [band(6, 33.6, 'g'), line(8.6, '#fff', 0.8, ' opacity=".65"'), beads(10.6, '#fff4c4', 1, 3), beads(30.8, '#fff4c4', 1, 3), [rn(50, 9) + rn(70, 7) + dia(40) + dia(60) + dia(80), '']]);
    },

    // Дубовый венок — две ветви свиваются жгутом, наружу — дубовые листья (есть и золотые, осенние), желуди
    oak: () => {
      const L = (x, y, a, s, k) => U('l', `translate(${x} ${y}) rotate(${a}) scale(${s})`, ` fill="url(#${k})"`);
      const tw = ['M40 16.4C46.7 11.8 53.3 11.8 60 16.4S73.3 21 80 16.4', 'M40 21.6C46.7 26.2 53.3 26.2 60 21.6S73.3 17 80 21.6'];
      const bark = d => `<path d="${d}" fill="none" stroke="#2a1406" stroke-width="3.6"/><path d="${d}" fill="none" stroke="#7a5230" stroke-width="2.2"/><path d="${d}" fill="none" stroke="#c9a06a" stroke-width=".6" transform="translate(0 -.5)" opacity=".85"/>`;
      const arc = r => `M${40 - r} 40A${r} ${r} 0 0 1 40 ${40 - r}`;
      return frameDoc(
        lg('a', [[0, '#c5e57a'], [1, '#467a24']]) + lg('b', [[0, '#93c052'], [1, '#2a4d16']]) + lg('y', [[0, '#fde68a'], [1, '#b7791f']]) +
        rg('k', [[0, '#f5d29a'], [0.6, '#c0813e'], [1, '#6b3f16']], 0.35, 0.3, 0.75) + lg('m', [[0, '#8a6a3a'], [1, '#4a3014']]) + leafDef('l') + acornDef('n', 'k', 'm'),
        [[L(52, 23, 70, 0.82, 'b') + L(74, 22, 115, 0.82, 'b') + bark(tw[1]) + bark(tw[0]) +
          L(45, 15.6, -75, 1.25, 'a') + L(56.6, 19.4, -112, 1.1, 'b') + L(66.4, 16.4, -58, 1.28, 'a') + L(77, 18.4, -100, 0.85, 'y') + U('n', 'translate(61 13) rotate(168) scale(1.05)'),
          bark(arc(22.4)) + bark(arc(18.6))]]);
    },

    // Ледяной узор — прозрачная ледяная кромка с морозной «ёлочкой», наружу — частокол кристаллов, внутрь — сосульки
    ice: () => {
      const C = (x, a, w, L, y) => crysAt('', x, y, a, w, L);
      return frameDoc(
        prof('i', [[10, '#0a2f4d'], [10.8, '#f4fcff'], [12.6, '#c6ecff'], [16.5, '#6cc0ea'], [20.6, '#2a7fb8'], [23.4, '#8fd3f5'], [25.6, '#e6f7ff'], [26.6, '#0a2f4d']]) +
        lg('c1', [[0, '#ffffff'], [1, '#b5e3fa']]) + lg('c2', [[0, '#8fd0f2'], [1, '#2a7fb8']]) + glowG('w', '#e0f2fe', 0.55) + crysDefs('', 'url(#c1)', 'url(#c2)'),
        [[[[47, 180, 1.4, 7], [59, 180, 1.8, 10], [72, 180, 1.4, 7.5]].map(([x, a, w, L]) => C(x, a, w, L, 25.4)).join(''),
          ''],
          band(10, 26.6, 'i'), line(11.6, '#fff', 0.7, ' opacity=".8"'),
          [`<path d="M40 18.4H80${rep(4, x => `M${x} 18.4l2.2-2.6M${x} 18.4l2.2 2.6`, 41)}" fill="none" stroke="#fff" stroke-width=".45" stroke-linecap="round" opacity=".7"/>`,
            line(18.4, '#fff', 0.45, ' opacity=".7"')[1]],
          [`<ellipse cx="60" cy="10" rx="20" ry="6" fill="url(#w)"/>` + [[45, 3, 8], [52.5, 3.6, 11.2], [60, 2.4, 6], [67, 3.4, 10], [74.5, 2.6, 7.5]].map(([x, w, L], k) => C(x, k % 2 ? 7 : -6, w, L, 12.4)).join('') +
            spark(57, 6, 1.6, '#fff') + spark(72.5, 4, 1.2, '#fff', 0.8), '']]);
    },

    // Огненная кайма — раскалённая кромка с трещинами лавы, наружу рвутся языки пламени, вокруг — жаркое марево
    flame: () => {
      const F = (x, a, s, y = 14.4) => U('t', `translate(${x} ${y}) rotate(${a}) scale(${s})`);
      return frameDoc(
        prof('r', [[13, '#1a0303'], [14, '#9a3412'], [15.6, '#fed7aa'], [17.4, '#fb923c'], [19.6, '#c2410c'], [22, '#450a0a'], [27.4, '#2a0505'], [29.2, '#9a3412'], [30.2, '#1a0303']]) +
        prof('h', [[0, '#f97316', 0], [9, '#f97316', 0.3], [15, '#ea580c', 0.55], [34, '#ea580c', 0]]) +
        lg('o', [[0, '#fde047'], [0.35, '#f97316'], [1, '#b91c1c', 0.9]], 0, 0, 0, 1) + lg('p', [[0, '#fffbe6'], [1, '#fbbf24']], 0, 0, 0, 1) + lg('q', [[0, '#ffffff'], [1, '#fef3c7']], 0, 0, 0, 1) +
        flameDef('t', 'o', 'p', 'q'),
        [band(0, 34, 'h'),
          [[[44, -8, 0.7], [51, 6, 0.88], [58, -10, 0.64], [65, 8, 0.86], [73, -4, 0.78]].map(([x, a, s]) => F(x, a, s)).join(''), ''],
          band(13, 30.2, 'r'), line(15, '#fef3c7', 0.6, ' opacity=".85"'),
          [`<path d="M41 26.4l3-2.6 2.4 2.2 3.6-3 2 2.6 3.4-2.2 2.4 3 3.2-2.8 2.6 2 2.8-2.6 3 3 2.4-2.4 3 2.2 2.2-1.8" fill="none" stroke="#f97316" stroke-width="1.5" stroke-linejoin="round" opacity=".55"/>` +
            `<path d="M41 26.4l3-2.6 2.4 2.2 3.6-3 2 2.6 3.4-2.2 2.4 3 3.2-2.8 2.6 2 2.8-2.6 3 3 2.4-2.4 3 2.2 2.2-1.8" fill="none" stroke="#fde68a" stroke-width=".5" stroke-linejoin="round"/>`, '']]);
    },

    // Жемчужная — по бархатной ленте в золотых бортиках нанизан крупный жемчуг, внутри — бисерная нить
    pearl: () => {
      const P = (x, y, r) => pearl(x, y, r, 'url(#w)');
      return frameDoc(
        prof('v', [[9, '#2a1804'], [9.8, '#fff1b8'], [11, '#d9a33a'], [11.8, '#2a1804'], [12.4, '#312e81'], [19, '#1e1b4b'], [26, '#141033'], [26.6, '#2a1804'], [27.2, '#fff1b8'], [28.6, '#b07a1c'], [29.4, '#2a1804']]) +
        pearlG('w') + goldR('b'),
        [band(9, 29.4, 'v'), line(14, '#e9b949', 0.7), line(22.6, '#e9b949', 0.5, ' stroke-dasharray="1.2 1.6" opacity=".7"'), beads(31.6, '#3b2d4a', 2.9, 4), beads(31.6, '#f5ecf0', 2.1, 4),
          [[45, 55, 65, 75].map(x => P(x, 14, 4.8)).join('') + [40, 50, 60, 70, 80].map(x => `<circle cx="${x}" cy="14" r="1.5" fill="url(#b)" stroke="#2a1804" stroke-width=".4"/>`).join('') +
            [50, 70].map(x => P(x, 22.6, 1.9) + P(f(x - 3.6), 22.6, 1.2) + P(f(x + 3.6), 22.6, 1.2)).join('') + P(60, 23, 1.3) + P(40, 23, 1.3) + P(80, 23, 1.3), '']]);
    },

    // Змей-уроборос — чешуйчатое тело: спина с гребнем-плавниками наружу, золотое брюхо внутрь; углы — живые (голова, петли)
    serpent: () => frameDoc(
      prof('s', SNAKE.map(([s, c]) => [f(20 - 10 * s), c])) + lg('sp', [[0, '#fde68a'], [1, '#b7791f']]) ,
      [[`<path d="${[45, 55, 65, 75].map(x => `M${x + 2.2} 11.4L${x - 1.8} 5L${x - 2.6} 11.4Z`).join('')}" fill="url(#sp)" stroke="#3a2208" stroke-width=".45" stroke-linejoin="round"/>`, ''],
        [`<path d="M40 10H80V30H40Z" fill="url(#s)"/>` + `<path d="M40 18.9H80" stroke="#154a2c" stroke-width="8.2" stroke-dasharray=".7 2.936"/><path d="M40 26.1H80" stroke="#8a5a14" stroke-width="4.2" stroke-dasharray=".6 3.036"/>` , '']]),

    // Навий шип — тёмно-фиолетовый обод, по нему свиваются два чёрных терновых стебля, наружу — крючья-шипы, в гнёздах тлеют руны
    thorn: () => {
      const th = (x, s, y, k = -1, l = 1) => `M${f(x - 3.4 * s)} ${y}C${f(x - 2 * s)} ${f(y + k * 4 * s)} ${f(x - s * l)} ${f(y + k * 8 * s)} ${f(x + 2 * s * l)} ${f(y + k * 12 * s)}C${f(x + s * l)} ${f(y + k * 7.4 * s)} ${f(x + 2.2 * s)} ${f(y + k * 3.6 * s)} ${f(x + 3.4 * s)} ${y}Z`;
      const vn = d => `<path d="${d}" fill="none" stroke="#07020f" stroke-width="2.6"/><path d="${d}" fill="none" stroke="#a78bfa" stroke-width=".6" transform="translate(-.3 -.7)" opacity=".75"/>`;
      const rn = (x, k) => `<circle cx="${x}" cy="25.2" r="4.4" fill="url(#w)"/><ellipse cx="${x}" cy="25.2" rx="3" ry="2.7" fill="#07020f" stroke="#6d28d9" stroke-width=".5"/>` +
        `<g transform="translate(${x} 25.2) scale(1.25)" fill="none" stroke-linecap="round"><path id="r${k}" d="${RUNES[k]}" stroke="#4ade80" stroke-width=".95"/><use href="#r${k}" stroke="#ecfccb" stroke-width=".35"/></g>`;
      return frameDoc(
        prof('v', [[9, '#0c0418'], [10, '#5b21b6'], [11.4, '#c4b5fd'], [13, '#7c3aed'], [17, '#4c1d95'], [23, '#2e1065'], [27, '#1e0b3d'], [28.6, '#8b5cf6'], [29.6, '#0c0418']]) +
        lg('t', [[0, '#ddd6fe'], [0.25, '#7c3aed'], [0.6, '#2e1065'], [1, '#07020f']], 1, 0, 0, 1) + glowG('w', '#a855f7', 0.9),
        [[`<path d="${th(46, 0.85, 10.6) + th(55, 0.55, 10.6, -1, -1) + th(64, 0.88, 10.6) + th(73, 0.6, 10.6, -1, -1)}" fill="url(#t)" stroke="#07020f" stroke-width=".5" stroke-linejoin="round"/>`, ''],
          band(9, 29.6, 'v'), line(10.8, '#ddd6fe', 0.5, ' opacity=".7"'),
          [rn(50, 9) + rn(70, 6) + vn('M40 18.6C46.7 22.6 53.3 22.6 60 18.6S73.3 14.6 80 18.6') + vn('M40 14.6C46.7 10.6 53.3 10.6 60 14.6S73.3 18.6 80 14.6') +
            `<path d="${th(45, 0.28, 13) + th(50.5, 0.26, 11.4, -1, -1) + th(57, 0.26, 14, 1) + th(63, 0.28, 16.2, -1, -1) + th(68, 0.26, 20.2, 1) + th(75.5, 0.28, 18.6, 1, -1) + th(47, 0.26, 21, 1, -1)}" fill="#07020f"/>`, '']]);
    },

    // Княжий оклад — широкое золото: зернь по бортам, скань-завитки, каменья в кастах, жемчуг на стыках, красная эмаль внутри
    knyaz: () => {
      const fil = `M41 20C44 14.6 50 14.6 52.4 18.4M58.6 21.6C61 25.4 67 25.4 70 20M79 20C76 25.4 70 25.4 67.6 21.6M61.4 18.4C59 14.6 53 14.6 50 20`;
      const cast = (x, k) => `<circle cx="${x}" cy="20" r="5" fill="url(#b)" stroke="#2a1804" stroke-width=".5"/><circle cx="${x}" cy="20" r="4.3" fill="none" stroke="#fff1b8" stroke-width=".9" stroke-linecap="round" stroke-dasharray="0 1.7"/>` + gem(x, 20, 3, k);
      return frameDoc(
        prof('g', [[5, '#2a1804'], [6, '#8a5a14'], [7, '#fff4c4'], [9.6, '#e9b949'], [11, '#2a1804'], [12.6, '#f7d272'], [16, '#fff1b8'], [21, '#c8922e'], [27.8, '#e9b949'], [28.6, '#450a0a'],
          [29.6, '#b91c1c'], [31, '#7f1d1d'], [31.6, '#2a1804'], [32.4, '#fff1b8'], [35, '#6b420e']]) +
        goldR('b') + gemG('r') + gemG('e') + pearlG('w'),
        [[`<path d="M55 5.6C56 3.6 58 3.4 58.8 1.8 59.2 1 59.6.6 60 .4 60.4.6 60.8 1 61.2 1.8 62 3.4 64 3.6 65 5.6Z" fill="url(#b)" stroke="#2a1804" stroke-width=".5"/>` + pearl(60, 2.2, 1.3, 'url(#w)'), ''],
          band(5, 35, 'g'), line(6.6, '#fff', 0.6, ' opacity=".7"'), beads(8.2, '#fff4c4', 1.5, 3), beads(33.2, '#fff4c4', 1.3, 3),
          [`<path d="${fil}" fill="none" stroke="#fff4c4" stroke-width=".9" opacity=".6" transform="translate(.3 .4)"/><path d="${fil}" fill="none" stroke="#5a3508" stroke-width=".85" stroke-linecap="round"/>` +
            cast(50, 'r') + cast(70, 'e') + [40, 60, 80].map(x => pearl(x, 20, 2.1, 'url(#w)')).join(''), '']]);
    },
  };

  /* ---------- живые части рамок ---------- */
  const FP = {
    // Золотая кайма: литые угловые накладки-«луковки» с чеканкой, по краям — завитки аканта; блик-искра бежит по углам
    ring: () => {
      const onion = `<path d="M0-26C1.6-20.5 9.6-16.6 9.6-9.4C9.6-5 5.2-2.6 0-2.6S-9.6-5-9.6-9.4C-9.6-16.6-1.6-20.5 0-26Z" fill="${u('o')}" stroke="#2a1804" stroke-width=".8"/>` +
        `<path d="M0-24.6C3.4-19 5.6-13 4.6-3.6M0-24.6C-3.4-19-5.6-13-4.6-3.6M0-24.6V-2.8M-9.2-8.6Q0-5.2 9.2-8.6M-7.8-14.4Q0-11.8 7.8-14.4" fill="none" stroke="#6b420e" stroke-width=".6" opacity=".85"/>` +
        `<path d="M-2.8-20C-5.8-16.4-7.4-12.6-6.8-8.6" fill="none" stroke="#fffbe6" stroke-width="1.4" stroke-linecap="round" opacity=".85"/>` +
        `<path d="M0-29.4V-33.4" stroke="#2a1804" stroke-width="1.2" stroke-linecap="round"/><circle cy="-28" r="2" fill="${u('b')}" stroke="#2a1804" stroke-width=".55"/>`;
      const scroll = `<path d="M24 13.4C30.6 8.4 39.6 8 46 11.2C50.8 13.6 51.6 19.2 48 21.2C45.2 22.8 41.8 21 42.4 18.2C42.8 16.4 45 15.8 46.2 17C45 13.8 38.6 12.8 33 16C30.6 17.4 28.8 19.4 28 22.4Z" fill="${u('s')}" stroke="#2a1804" stroke-width=".75" stroke-linejoin="round"/>` +
        `<path d="M27 15.6C33 11.2 40 10.8 45 13" fill="none" stroke="#fffbe6" stroke-width=".9" stroke-linecap="round" opacity=".8"/>` +
        `<path d="M30.4 26.6C35.8 24.6 40.8 26.4 40.4 30.4C40.2 32.4 37.6 33 36.8 31.4" fill="none" stroke="#2a1804" stroke-width="2.4" stroke-linecap="round"/><path d="M30.4 26.6C35.8 24.6 40.8 26.4 40.4 30.4C40.2 32.4 37.6 33 36.8 31.4" fill="none" stroke="#f3c451" stroke-width="1.2" stroke-linecap="round"/>`;
      const lobes = [[21, 21, 8.6], [29, 21, 5.4], [21, 29, 5.4], [14.6, 14.6, 5]], Z = 'translate(18 18) scale(1.18) translate(-18 -18)';
      const plate = lobes.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2a1804" stroke="#2a1804" stroke-width="1.6"/>`).join('') +
        lobes.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${u('b')}"/>`).join('') +
        `<circle cx="21" cy="21" r="6.6" fill="none" stroke="#6b420e" stroke-width=".6"/><circle cx="21" cy="21" r="7.6" fill="none" stroke="#fff1b8" stroke-width="1.1" stroke-linecap="round" stroke-dasharray="0 2.4"/>` +
        `<circle cx="21" cy="21" r="4.4" fill="${u('b')}" stroke="#2a1804" stroke-width=".7"/><ellipse cx="19.6" cy="19.4" rx="1.8" ry="1.1" transform="rotate(-40 19.6 19.4)" fill="#fff" opacity=".85"/>`;
      return {
        corners: quad(goldR(I + 'b') + goldR(I + 'o') + lg(I + 's', [[0, '#fff1b8'], [0.45, '#e9b949'], [1, '#8a5a14']], 0, 0, 0.4, 1) + GLD,
          T(Z, diag(scroll) + T('translate(20 20) rotate(-45)', onion) + plate),
          i => T(Z, glint(6.6, 8.6, 4.2, i * 0.7) + glint(20, 20, 2.6, i * 0.7 + 1.4))),
      };
    },

    // Рунная кайма: ромбы-обереги с бирюзовым камнем, по сторонам ромба — пульсирующие руны; навершие — громовой знак в круге
    rune: () => {
      const R = Rn;
      const body = `<path d="M20-1L41 20 20 41-1 20Z" fill="#2a1804"/><path d="M20 1L39 20 20 39 1 20Z" fill="${u('b')}"/>` +
        `<path d="M20 1L39 20 20 39 1 20Z" fill="none" stroke="#fff4c4" stroke-width=".7" stroke-dasharray="0 2.2" stroke-linecap="round"/>` +
        `<path d="M20 6.4L33.6 20 20 33.6 6.4 20Z" fill="#140a03" stroke="#6b420e" stroke-width=".8"/>` +
        `<path d="M20 12.6L27.4 20 20 27.4 12.6 20Z" fill="${u('b')}" stroke="#2a1804" stroke-width=".7"/>` + gem(20, 20, 4.6, 't', I) +
        `<path d="M1 20H-3M20 1V-3" stroke="#2a1804" stroke-width="2.6" stroke-linecap="round"/><circle cx="-3.6" cy="20" r="2.2" fill="${u('b')}" stroke="#2a1804" stroke-width=".6"/><circle cx="20" cy="-3.6" r="2.2" fill="${u('b')}" stroke="#2a1804" stroke-width=".6"/>`;
      // громовой знак: шесть лепестков из дуг радиуса r
      const thunder = r => { let d = ''; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, x = f(r * Math.cos(a)), y = f(r * Math.sin(a)); d += `M0 0A${r} ${r} 0 0 1 ${x} ${y}A${r} ${r} 0 0 1 0 0`; } return d; };
      const th = thunder(10.4);
      return {
        corners: quad(goldR(I + 'b') + gemG('t', I) + glowG(I + 'w', '#2dd4bf', 0.75) + glowG(I + 'a', '#5eead4', 0.55) + GLD + [7, 9, 0, 5].map(k => runeDef(k, '#5eead4', '#f0fffd', 'w')).join(''), body,
          i => R(7, 13.2, 13.2, 1.3, i * 0.5) + R(9, 26.8, 13.2, 1.3, i * 0.5 + 0.55) + R(9, 13.2, 26.8, 1.3, i * 0.5 + 1.1) + R(7, 26.8, 26.8, 1.3, i * 0.5 + 1.65) + glint(18, 18, 3, i * 0.7),
          i => A('art-aura', `<circle cx="20" cy="20" r="26" fill="${u('a')}"/>`, i * 0.6)),
        crest: A('art-aura', `<circle cx="80" cy="28" r="40" fill="${u('a')}"/>`) +
          `<path d="${Array.from({ length: 16 }, (_, k) => { const a = (k * 22.5 - 90) * Math.PI / 180, L = k % 2 ? 26 : 31, b = (k % 2 ? 4.4 : 6) * Math.PI / 180, P = (r, t) => `${f(80 + r * Math.cos(t))} ${f(28 + r * Math.sin(t))}`; return `M${P(18, a - b)}L${P(L, a)} ${P(18, a + b)}Z`; }).join('')}" fill="${u('b')}" stroke="#2a1804" stroke-width=".7" stroke-linejoin="round"/>` +
          `<path d="M34 42C50 42 60 38 64 32L68 42C62 46 52 48 34 47Z" fill="${u('b')}" stroke="#2a1804" stroke-width=".8"/><path d="M126 42C110 42 100 38 96 32L92 42C98 46 108 48 126 47Z" fill="${u('b')}" stroke="#2a1804" stroke-width=".8"/>` +
          `<circle cx="80" cy="28" r="21" fill="#2a1804"/><circle cx="80" cy="28" r="19.8" fill="${u('b')}"/><circle cx="80" cy="28" r="18.8" fill="none" stroke="#fff4c4" stroke-width=".9" stroke-dasharray="0 2.7" stroke-linecap="round"/>` +
          `<circle cx="80" cy="28" r="15.4" fill="#050201" stroke="#6b420e" stroke-width="1"/><circle cx="80" cy="28" r="14.4" fill="${u('w')}"/>` +
          A('art-spin', `<circle cx="80" cy="28" r="12.6" fill="none"/>` + T('translate(80 28)', `<path d="${th}" fill="none" stroke="#2dd4bf" stroke-width="2.2"/><path d="${th}" fill="none" stroke="#f0fffd" stroke-width=".75"/><circle r="10.4" fill="none" stroke="#2dd4bf" stroke-width="1.3"/>`)) +
          glint(72, 16, 4, 0.3) + R(0, 50, 42.6, 1.25, 0.2) + R(5, 110, 42.6, 1.25, 1.2),
      };
    },

    // Дубовый венок: в углах — пышные пучки листьев с желудями (листья качаются), навершие — дубовый венец, на нём синичка
    oak: () => {
      const Lf = (x, y, a, s, k) => UI('l', `translate(${x} ${y}) rotate(${a}) scale(${s})`, ` fill="${u(k)}"`);
      const Lv = (x, y, a, s, k, d) => swing(x, y, f(12 * s + 1), Lf(x, y, a, s, k), d);
      const Ac = (x, y, a, s) => UI('n', `translate(${x} ${y}) rotate(${a}) scale(${s})`);
      const bark = (d, w) => `<path d="${d}" fill="none" stroke="#2a1406" stroke-width="${f(w + 1.6)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#7a5230" stroke-width="${w}" stroke-linecap="round"/>` +
        `<path d="${d}" fill="none" stroke="#c9a06a" stroke-width="${f(w * 0.3)}" stroke-linecap="round" transform="translate(-.4 -.5)" opacity=".85"/>`;
      const half = Lf(25, 15, -150, 1.75, 'b') + Lf(36, 17, -40, 1.45, 'a') + Lf(45, 19.4, -18, 1.15, 'y') + Lf(33, 21, 28, 1.05, 'b');
      // венец: левая ветвь — кривая Безье, листья вдоль неё наружу и внутрь; правая — зеркально
      const B = t => { const v = 1 - t; return [v * v * v * 18 + 3 * v * v * t * 26 + 3 * v * t * t * 54 + t * t * t * 80, v * v * v * 47 + 3 * v * v * t * 22 + 3 * v * t * t * 11 + t * t * t * 11]; };
      const Bd = t => { const v = 1 - t; return Math.atan2(3 * v * v * (22 - 47) + 6 * v * t * (11 - 22), 3 * v * v * (26 - 18) + 6 * v * t * (54 - 26) + 3 * t * t * (80 - 54)) * 180 / Math.PI; };
      let arch = '', live = '';
      [0.08, 0.2, 0.32, 0.44, 0.56, 0.68, 0.8].forEach((t, k) => {
        const [x, y] = B(t), a = Bd(t), s = 1.45 - t * 0.5;
        arch += Lf(f(x), f(y), f(a + 55), f(s * 0.8), 'b');
        if (k % 2) arch += Lf(f(x), f(y), f(a - 50), f(s), k % 3 ? 'a' : 'y'); else live += Lv(f(x), f(y), f(a - 50), f(s), 'a', k * 0.4);
      });
      const bird = `<path d="M5.4-5.6L13.4-1.6 12.6.4 4.4-3Z" fill="#4b6a90" stroke="#1b1030" stroke-width=".45"/><ellipse cy="-6.6" rx="6.4" ry="5.2" fill="${u('tb')}" stroke="#1b1030" stroke-width=".5"/>` +
        `<path d="M-1.4-10.6C3-12 7.4-9.6 7.6-6C6.2-3.6 2-3.4-.8-5Z" fill="${u('tw')}" stroke="#1b1030" stroke-width=".45"/><path d="M1-8.6C3-9.2 5-8.4 6.2-7" stroke="#e0f2fe" stroke-width=".55" fill="none"/>` +
        `<circle cx="-4.2" cy="-11.6" r="3.7" fill="#1b1030"/><ellipse cx="-4.1" cy="-10.7" rx="2.2" ry="1.5" fill="#fff"/><path d="M-4.4-8.4C-4-6.4-3.2-4.4-1.8-2.6" stroke="#1b1030" stroke-width="1.3" stroke-linecap="round" fill="none"/>` +
        `<path d="M-7.6-12.4L-9.9-11.7-7.6-11Z" fill="#1b1030"/><circle cx="-5.4" cy="-12.7" r=".6" fill="#fff"/><path d="M-1.4-1.8-1.8 0M1-1.8 1.2 0" stroke="#5a4a3a" stroke-width=".7"/>`;
      const [bx, by] = B(0.3), bd = 'M18 47C26 22 54 11 80 11';
      return {
        corners: quad(lg(I + 'a', [[0, '#c5e57a'], [1, '#467a24']]) + lg(I + 'b', [[0, '#93c052'], [1, '#2a4d16']]) + lg(I + 'y', [[0, '#fde68a'], [1, '#b7791f']]) +
          rg(I + 'k', [[0, '#f5d29a'], [0.6, '#c0813e'], [1, '#6b3f16']], 0.35, 0.3, 0.75) + lg(I + 'm', [[0, '#8a6a3a'], [1, '#4a3014']]) +
          lg(I + 'tb', [[0, '#fef08a'], [0.6, '#eab308'], [1, '#a16207']]) + lg(I + 'tw', [[0, '#a5c4e6'], [1, '#4b6a90']]) + leafDef(I + 'l') + acornDef(I + 'n', I + 'k', I + 'm'),
          bark('M64 18.6H34C24 18.6 18.6 24 18.6 34V64', 3.2) + bark('M21 21C16.6 16.6 13 13.6 8.4 11.8', 1.6) + diag(half),
          i => Lv(20, 20, -135, 2.2, 'a', i * 0.5) + Lv(i % 2 ? 16 : 29, i % 2 ? 29 : 16, i % 2 ? 190 : -100, 1.6, 'a', i * 0.5 + 0.9) +
            swing(18, 18, 26, `<path d="M18 18L11 14.6M18 18 14.6 11M18 18 12 12" stroke="#4a3014" stroke-width="1" stroke-linecap="round"/>` + Ac(11, 14.6, 118, 1.3) + Ac(14.6, 11, 152, 1.3) + Ac(12, 12, 135, 1.45), i * 0.7)),
        crest: `<g id="${I}oa">${bark(bd, 2.8) + arch}</g>` + UI('oa', 'matrix(-1 0 0 1 160 0)') + T('matrix(-1 0 0 1 160 0)', live) + live +
          Lf(80, 13, -128, 1.5, 'y') + Lf(80, 13, -52, 1.5, 'y') + Ac(74, 12.4, 205, 1.3) + Ac(86, 12.4, 155, 1.3) + Ac(80, 11.6, 180, 1.55) +
          swing(f(160 - bx), f(by - 2.2), 26, T(`translate(${f(160 - bx)} ${f(by - 2.2)}) scale(1.45)`, bird), 0.8),
      };
    },

    // Ледяной узор: из углов наружу — друзы кристаллов с инеем и искрами, навершие — ледяная корона со снежинкой, внизу — сосульки
    ice: () => {
      const C = (x, y, a, w, L) => crysAt(I, x, y, a, w, L), Ci = (x, y, w, L) => C(x, y, 180, w, L);
      const half = C(40, 18.6, 58, 1.4, 7) + C(33, 17.6, 30, 2, 11) + C(27, 17, 8, 2.6, 16) + C(21.5, 17.4, -18, 3.2, 22);
      const lump = poly([[10, 16], [13.4, 10.4], [20, 8.6], [27, 11], [31, 17.6], [28, 24.4], [24, 29], [17.6, 31], [11, 27.6], [8.6, 21]], ` fill="${u('c1')}" stroke="#0a2f4d" stroke-width=".6" stroke-linejoin="round"`) +
        `<path d="M13.4 10.4L19 19 31 17.6M19 19 17.6 31M19 19 8.6 21" fill="none" stroke="#7cc4ec" stroke-width=".6"/>` + poly([[19, 19], [31, 17.6], [28, 24.4], [24, 29], [17.6, 31]], ` fill="${u('c2')}" opacity=".7"`);
      return {
        corners: quad(lg(I + 'c1', [[0, '#ffffff'], [1, '#b5e3fa']]) + lg(I + 'c2', [[0, '#8fd0f2'], [1, '#1f6aa0']]) + glowG(I + 'w', '#bae6fd', 0.8) + GLD + crysDefs(I, u('c1'), u('c2')) + flakeDef(I + 'fl'),
          diag(half) + C(19, 19, -45, 4.6, 31) + C(30, 27, 135, 1.5, 7) + T('translate(19.5 19.5) scale(.74) translate(-19.5 -19.5)', lump),
          i => glint(1.8, 1.8, 3.8, i * 0.6) + glint(15, -1.4, 2.4, i * 0.6 + 1.3) + A('art-blink', flake(5, 34, 2.6), i * 0.4) + A('art-blink', flake(36, 5, 2.2), i * 0.4 + 0.8) + A('art-blink', flake(46, 9, 1.5), i * 0.4 + 0.3),
          i => A('art-aura', `<circle cx="16" cy="16" r="26" fill="${u('w')}"/>`, i * 0.5)),
        crest: A('art-aura', `<circle cx="80" cy="28" r="36" fill="${u('w')}"/>`) +
          C(80, 46, -90, 1.6, 30) + C(80, 46, 90, 1.6, 30) + C(51, 47, -58, 2.2, 13) + C(109, 47, 58, 2.2, 13) + C(59, 46, -36, 3, 21) + C(101, 46, 36, 3, 21) + C(70, 46, -16, 4, 31) + C(90, 46, 16, 4, 31) + C(80, 46, 0, 5.6, 42) +
          C(80, 45.4, -90, 2.2, 22) + C(80, 45.4, 90, 2.2, 22) +
          `<circle cx="80" cy="33" r="8.6" fill="${u('w')}"/>` + A('art-spin', flake(80, 33, 7, '#0a2f4d', 2.6) + flake(80, 33, 7)) +
          glint(80, 6, 4.4, 0.2) + glint(66, 17, 2.6, 1.3) + glint(96, 19, 2.4, 2) + A('art-blink', flake(40, 30, 2.4), 0.5) + A('art-blink', flake(121, 26, 2.8), 1.1),
        foot: Ci(44, 20, 1.8, 10) + Ci(76, 20, 1.9, 11) + Ci(51.5, 20, 2.6, 17) + Ci(68.5, 20, 2.8, 20) + Ci(60, 20, 3.8, 30) + C(60, 21, -76, 1.8, 18) + C(60, 21, 76, 1.8, 18) +
          glint(60, 46, 3, 0.6) + A('art-blink', `<path d="M60 53c-1.4 2-1.8 3-1.8 3.8a1.8 1.8 0 0 0 3.6 0c0-.8-.4-1.8-1.8-3.8Z" fill="${u('c1')}" stroke="#0a2f4d" stroke-width=".4"/>`, 0.4),
      };
    },

    // Огненная кайма: из углов вырывается пламя вокруг раскалённого угля, летят искры; навершие — перо Жар-птицы в огне
    flame: () => {
      const Fl = (x, y, a, s, d) => A('art-flicker', UI('t', `translate(${x} ${y}) rotate(${a}) scale(${s})`), d);
      const FL = [[32, 15.6, 6, 1.08], [23, 16, -16, 1.5]];
      const ember = (x, y, r, d) => A('art-float', A('art-blink', UI('em', `translate(${x} ${y}) scale(${r})`), d), d);
      // перо Жар-птицы: стержень (80,47)→(80,3) чуть изогнут, опахало с зубчиками-бородками, у вершины — «глазок»
      const vane = k => {
        const W = t => (1 + 8.8 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.8)) * (1 - Math.pow(t, 8)) * k, X = t => 80 + 2.6 * t * t, Y = t => 47 - 44 * t;
        const side = m => { const a = []; for (let j = 0; j <= 11; j++) { const t = 0.04 + j * 0.08; a.push([f(X(t) + m * W(t) * 0.9), f(Y(t))]); if (j < 11) a.push([f(X(t + 0.055) + m * (W(t + 0.055) + 1.8 * k)), f(Y(t + 0.075))]); } return a; };
        return [[80, 47]].concat(side(-1), [[f(X(1)), f(Y(1))]], side(1).reverse());
      };
      const fth = poly(vane(1), ` fill="${u('fv')}" stroke="#7f1d1d" stroke-width=".6" stroke-linejoin="round"`) + poly(vane(0.5), ` fill="#b91c1c" opacity=".55"`) +
        `<path d="M80 47Q81 26 82.6 5" fill="none" stroke="#fef3c7" stroke-width=".9" opacity=".9"/><ellipse cx="81.6" cy="15.4" rx="6.2" ry="7.8" fill="#fde047" stroke="#7f1d1d" stroke-width=".55"/>` +
        `<ellipse cx="81.6" cy="16" rx="4.3" ry="5.7" fill="#dc2626"/><ellipse cx="81.6" cy="16.4" rx="2.7" ry="3.7" fill="${u('fe')}"/><ellipse cx="80.6" cy="14.6" rx=".9" ry="1.4" fill="#fff" opacity=".85"/>`;
      return {
        corners: quad(lg(I + 'o', [[0, '#fde047'], [0.35, '#f97316'], [1, '#b91c1c', 0.9]], 0, 0, 0, 1) + lg(I + 'p', [[0, '#fffbe6'], [1, '#fbbf24']], 0, 0, 0, 1) + lg(I + 'q', [[0, '#ffffff'], [1, '#fef3c7']], 0, 0, 0, 1) +
          flameDef(I + 't', I + 'o', I + 'p', I + 'q') + glowG(I + 'h', '#f97316', 0.8) + GLD +
          rg(I + 'e', [[0, '#fff7cc'], [0.3, '#fbbf24'], [0.6, '#ea580c'], [0.85, '#7f1d1d'], [1, '#2a0505']], 0.42, 0.38, 0.62) +
          lg(I + 'fv', [[0, '#fef08a'], [0.35, '#fb923c'], [0.75, '#dc2626'], [1, '#7f1d1d']], 0, 0, 0, 1) + rg(I + 'fe', [[0, '#a5f3fc'], [0.45, '#0e7490'], [1, '#082f49']], 0.4, 0.35, 0.7) +
          `<g id="${I}em"><circle r="2.4" fill="${u('h')}"/><circle r="1" fill="#fef3c7"/></g><g id="${I}ft">${fth}</g>`,
          `<circle cx="19.5" cy="19.5" r="8" fill="${u('e')}" stroke="#1a0303" stroke-width=".8"/><path d="M14 18.6l3.4 1.6 2.6-3.4 2.2 2.6 3.6-.8M19.6 26l.6-3.6 2.4-1.4" fill="none" stroke="#fde68a" stroke-width=".55" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`,
          i => ember(4, 24, 1.1, i * 0.5) + ember(24, 3, 1, i * 0.5 + 0.8) + ember(8, 7, 1.3, i * 0.5 + 1.5),
          i => A('art-aura', `<circle cx="16" cy="16" r="26" fill="${u('h')}"/>`, i * 0.4) +
            FL.map(([x, y, a, s], k) => Fl(x, y, a, s, f(i * 0.3 + k * 0.23)) + Fl(y, x, f(-90 - a), s, f(i * 0.3 + k * 0.23 + 0.5))).join('') + Fl(18, 18, -45, 1.95, i * 0.3 + 0.15)),
        crest: A('art-aura', `<ellipse cx="80" cy="30" rx="44" ry="34" fill="${u('h')}"/>`) +
          [[51, -52, 0.8], [109, 52, 0.8], [60, -34, 1.1], [100, 34, 1.1], [70, -16, 1.6], [90, 16, 1.6], [80, 0, 2.3]].map(([x, a, s], k) => Fl(x, 46, a, s, f(k * 0.21))).join('') +
          swing(80, 47, 46, UI('ft', 'translate(80 47) rotate(-34) scale(.72) translate(-80 -47)') + UI('ft', 'translate(80 47) rotate(30) scale(.66) translate(-80 -47)') + UI('ft'), 0.4) +
          glint(80.6, 14.6, 3.4, 0.9) + ember(42, 30, 1.2, 0.3) + ember(118, 26, 1.1, 1.2) + ember(64, 6, 0.9, 0.7) + ember(98, 4, 1, 1.8),
      };
    },
    // Жемчужная: в углах — золотые розетки с самоцветом в венце жемчуга и жемчужные фестоны, внизу качаются капли;
    // навершие — жемчужный кокошник на бархате, подвеска — жемчужная капля
    pearl: () => {
      const g = u('p'), P = pearls(g);
      const fest = `<path d="M26 11C32 3 42 3 50 9" fill="none" stroke="#e9b949" stroke-width=".6"/>` + bzEven([[26, 11], [32, 3], [42, 3], [50, 9]], 3.5).map(([x, y]) => P(x, y, 1.6)).join('') + P(52, 10.4, 2.1);
      const ring = Array.from({ length: 8 }, (_, k) => { const a = (k * 45 + 22.5) * Math.PI / 180; return P(f(20 + 8.2 * Math.cos(a)), f(20 + 8.2 * Math.sin(a)), 1.6); }).join('');
      const K = [[[42, 47], [42, 31], [56, 23], [66, 17]], [[66, 17], [73, 13], [77.6, 8.6], [80, 3.4]]];
      const kp = K.map(S => bzEven(S, 4.6)).flat().filter((q, k, a) => !k || q[0] !== a[k - 1][0]);
      const kd = 'M42 47C42 31 56 23 66 17C73 13 77.6 8.6 80 3.4C82.4 8.6 87 13 94 17C104 23 118 31 118 47Z';
      const crest = A('art-aura', `<circle cx="80" cy="28" r="34" fill="${u('a')}"/>`) +
          `<path d="${kd}" fill="${u('kv')}" stroke="#2a1804" stroke-width="3.6" stroke-linejoin="round"/><path d="${kd}" fill="none" stroke="${u('b')}" stroke-width="2.2" stroke-linejoin="round"/>` +
          `<path d="M56 44C56 35 64 31 71 33.6M104 44C104 35 96 31 89 33.6M66 22C70 20 74 20 76.4 22.4M94 22C90 20 86 20 83.6 22.4" fill="none" stroke="#f3cf6b" stroke-width=".9" stroke-linecap="round"/>` +
          `<g id="${I}kl">${kp.map(([x, y]) => P(x, y, 2.1)).join('')}</g><use href="#${I}kl" transform="matrix(-1 0 0 1 160 0)"/>` +
          `<circle cx="80" cy="30" r="8.4" fill="${u('b')}" stroke="#2a1804" stroke-width=".7"/>` +
          Array.from({ length: 10 }, (_, k) => { const a = k * 36 * Math.PI / 180; return P(f(80 + 10.4 * Math.cos(a)), f(30 + 10.4 * Math.sin(a)), 1.6); }).join('') +
          gem(80, 30, 6, 's', I) + gem(62, 41, 2.8, 'r', I) + gem(98, 41, 2.8, 'r', I) + P(80, 1.4, 2.8) + P(70, 44, 1.6) + P(90, 44, 1.6) +
          glint(78, 27.6, 3.4, 0.4) + glint(79, 0.4, 3, 1.6) + glint(97, 39.6, 2, 2.3);
      const foot = swing(60, 20, 26, `<path d="M55 20.4H65L62.4 24H57.6Z" fill="${u('b')}" stroke="#2a1804" stroke-width=".6"/>` + P(60, 26.4, 2.1) + drop(60, 28.2, 1.02, g) +
          `<circle cx="58.2" cy="34.6" r="1.1" fill="#fff" opacity=".9"/>`, 0.3) + glint(58.4, 36, 2.6, 1);
      return {
        corners: quad(() => pearlG(I + 'p') + goldR(I + 'b') + gemG('r', I) + gemG('s', I) + GLD + lg(I + 'kv', [[0, '#be123c'], [0.5, '#881337'], [1, '#3b0716']]) + glowG(I + 'a', '#fdf2f8', 0.5) + P.defs(),
          diag(fest) + rosette(20, 20, 8, 10.6, 3.6, 5.4, u('b')) + `<circle cx="20" cy="20" r="10" fill="${u('b')}" stroke="#2a1804" stroke-width=".7"/>` + ring +
            `<circle cx="20" cy="20" r="5.8" fill="#2a1804"/>`,
          i => gem(20, 20, 5, i === 1 || i === 2 ? 's' : 'r', I) + (i < 2
            ? `<path d="M15 15L12.4 12.4" stroke="#e9b949" stroke-width="1.1"/>` + drop(12.4, 12.4, 0.72, g, 135) + glint(6.6, 6.6, 2.4, i * 0.8 + 1.2)
            : swing(9, 17, 19, `<path d="M9 17V10.6" stroke="#e9b949" stroke-width=".8"/>` + P(9, 12.6, 1.6) + drop(9, 10.6, 0.8, g, 180) + `<circle cx="10.4" cy="3.8" r="1" fill="#fff" opacity=".9"/>`, i * 0.6)) +
            glint(17.6, 17.4, 3, i * 0.8)),
        crest, foot,
      };
    },

    // Змей-уроборос: в левом верхнем углу голова с горящим глазом кусает собственный хвост, в остальных — петли-узлы тела;
    // над верхним краем тело змея выгибается дугой с золотым гребнем
    serpent: () => {
      const Y = 17.8, W = 12.3, sp = u('sp');
      const loop = tube([[[64, Y], [50, Y], [33, Y], [Y, Y]], [[Y, Y], [8, Y], [2, 15], [2, 9]], [[2, 9], [2, 2], [9, -0.5], [14, 1.5]]], W, [sp, 0, 0.42]) +
        tube([[[14, 1.5], [18, 3.5], [Y, 8], [Y, Y]], [[Y, Y], [Y, 33], [Y, 50], [Y, 64]]], W, [sp, 0.45, 1]);
      const G = `stroke="#0b2415" stroke-width=".7" stroke-linejoin="round"`;
      const HS = 'translate(30 19) scale(1.35) translate(-30 -19)';
      const head = T(HS, `<path d="M31 13.4L50 11.6 48 27.6 30 26Z" fill="#4a0d12"/>`) +
        tube([[[64, Y], [52, Y], [40, Y], [29, Y]]], W, [sp, 0, 1]) + tube([[[31, 8.6], [23, 10], [Y, 15], [Y, 26]], [[Y, 26], [Y, 40], [Y, 52], [Y, 64]]], W, [sp, 0.3, 1]) + T(HS,
        `<path d="M26 3.4C21-.6 15-2.4 8.4-2.2C13.6-.2 17.6 2.6 21.6 7.4ZM23.6 8.8C19 7.4 13.4 7.6 8 9.6C13.4 10 17.4 11.6 20.8 14Z" fill="${u('hn')}" stroke="#3a2208" stroke-width=".5" stroke-linejoin="round"/>` +
        `<path d="M22.4 24C28 26.6 36 28 47.6 27.4C49.6 27.3 50.2 29.2 48.6 30.2C42 33.6 32 34 25 31.6C22 30.6 20.6 28 22.4 24Z" fill="${u('hd')}" ${G}/>` +
        `<path d="M24.4 30.6C32 32.8 41 32.6 47.6 29.8" fill="none" stroke="#e2b24a" stroke-width="1.3" stroke-linecap="round"/>` +
        `<path d="M20 16C18 7 24 1 32 .4C39 0 45 2.6 51.4 5.6C53.6 6.6 54 9 52 10.2C47 12 42 12.8 36.6 13.2C31 13.6 26 15.4 22.6 19Z" fill="${u('hd')}" ${G}/>` +
        `<path d="M17.4 14C22 12 28 13 31 16.6C32.6 19 32.6 23.4 31 25.6C28.4 29 22.4 29.6 18.6 27.4Z" fill="${u('hd')}" ${G}/>` +
        `<path d="M38 13.1l1 2.7 1-2.9ZM42.4 12.7l1 2.7 1-2.9ZM46.6 12l.9 2.4.9-2.6ZM38 27.7l1-2.7 1 2.8ZM42.4 27.7l1-2.7 1 2.7ZM46.2 27.5l.9-2.3.9 2.3Z" fill="#fffbe6" stroke="#0b2415" stroke-width=".3"/>` +
        `<path d="M24 6.4a1.6 1.6 0 0 0 3.2 0M40.6 6.2a1.5 1.5 0 0 0 3 0M22 21a1.6 1.6 0 0 0 3.2 0M25.4 17a1.6 1.6 0 0 0 3.2 0" fill="none" stroke="#154a2c" stroke-width=".55"/>` +
        `<path d="M27.4 4.8Q33 .8 39.6 4" fill="none" stroke="#0b2415" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="49" cy="6.6" rx="1.1" ry=".65" fill="#0b2415"/>`);
      const eye = A('cf-pulse', `<circle cx="34" cy="7.4" r="7" fill="${u('eg')}"/>`) +
        A('art-eyes', `<ellipse cx="34" cy="7.4" rx="3.1" ry="2.2" fill="${u('ey')}" stroke="#0b2415" stroke-width=".55"/><path d="M34 5.6V9.2" stroke="#0b2415" stroke-width="1"/><circle cx="33" cy="6.6" r=".55" fill="#fff"/>`, 1.2) +
        A('art-flicker', `<path d="${FLAME}" transform="translate(51.4 5.4) rotate(50) scale(.42)" fill="${u('fo')}"/>`) + A('art-float', `<circle cx="57" cy="1" r="1.2" fill="#9ca3af" opacity=".5"/><circle cx="59.6" cy="-2" r="1.6" fill="#9ca3af" opacity=".35"/>`, 0.7);
      return {
        corners: [`<defs>${lg(I + 'sp', [[0, '#fde68a'], [1, '#b7791f']]) + lg(I + 'hd', [[0, '#7fdc9d'], [0.45, '#2f8a55'], [1, '#14532d']], 0, 0, 0.3, 1) +
          lg(I + 'hn', [[0, '#fde68a'], [1, '#a16207']]) + rg(I + 'ey', [[0, '#fffbe6'], [0.45, '#fde047'], [1, '#ea580c']]) + glowG(I + 'eg', '#fde047', 0.75) +
          lg(I + 'fo', [[0, '#fde047'], [0.5, '#f97316'], [1, '#dc2626', 0.8]], 0, 0, 0, 1)}<g id="${I}lp">${loop}</g></defs>` + head + T(HS, eye)]
          .concat(MQ.slice(1).map(t => `<use href="#${I}lp" transform="${t}"/>`)),
        crest: tube([[[140, 43.2], [118, 43.2], [112, 8], [80, 8]], [[80, 8], [48, 8], [42, 43.2], [20, 43.2]]], 11.8, [sp, 0.1, 0.9]),
      };
    },

    // Навий шип: из углов наружу растут чёрные когти-шипы, в гнезде пульсирует руна, клубится навий туман;
    // навершие — рогатая личина-череп с горящими глазами, внизу — шипы с каплей навьего огня
    thorn: () => {
      // коготь: опора (x,y), a — наклон, L — длина, w — полуширина, k — куда загнут кончик (±1)
      const claw = (x, y, a, L, w, k = 1) => {
        const P = rot(x, y, a), h = L * 0.2 * k, q = (...a) => P(...a).join(' ');
        return `<path d="M${q(-w, 0)}C${q(-w * 0.8, -L * 0.45)} ${q(-w * 0.2 + h * 0.5, -L * 0.85)} ${q(h * 1.3, -L)}C${q(w * 0.25 + h * 0.4, -L * 0.7)} ${q(w * 0.9, -L * 0.35)} ${q(w, 0)}Z" fill="${u('t')}" stroke="#07020f" stroke-width=".5" stroke-linejoin="round"/>` +
          `<path d="M${q(-w * 0.5, -L * 0.1)}Q${q(-w * 0.5, -L * 0.5)} ${q(h * 0.5, -L * 0.85)}" fill="none" stroke="#c4b5fd" stroke-width="${f(w * 0.22)}" stroke-linecap="round" opacity=".55"/>`;
      };
      const R = Rn;
      const fog = (x, y, rx, ry, d) => A('art-float', `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${u('fg')}"/>`, d);
      const mote = (x, y, r, d) => A('art-float', A('art-blink', `<circle cx="${x}" cy="${y}" r="${r}" fill="#bbf7d0"/>`, d), d);
      const star = Array.from({ length: 16 }, (_, k) => { const a = (k * 22.5 - 90) * Math.PI / 180, r = k % 2 ? 7.2 : 12.4; return [f(20 + r * Math.cos(a)), f(20 + r * Math.sin(a))]; });
      const skull = 'M80 6C92 6 98 14 97 24C96.6 30 94 33 92 35L91 42C88 45 84 46.4 80 46.4S72 45 69 42L68 35C66 33 63.4 30 63 24C62 14 68 6 80 6Z';
      const sock = 'M67.6 22.6C69.6 18.6 76 18.4 77.6 23C77.2 27.4 71 28.4 67.6 22.6Z';
      return {
        corners: quad(lg(I + 't', [[0, '#ddd6fe'], [0.25, '#7c3aed'], [0.6, '#2e1065'], [1, '#07020f']], 1, 0, 0, 1) + glowG(I + 'w', '#a855f7', 0.85) + glowG(I + 'fg', '#7c3aed', 0.5) +
          rg(I + 'v', [[0, '#6d28d9'], [0.6, '#2e1065'], [1, '#0c0418']], 0.4, 0.35, 0.7) + glowG(I + 'e', '#4ade80', 0.95) + lg(I + 'bn', [[0, '#e4dcf7'], [0.5, '#9483bf'], [1, '#2a1d4a']], 0, 0, 0.4, 1) + [7, 9, 8].map(k => runeDef(k, '#4ade80', '#ecfccb', 'w')).join(''),
          diag(claw(38, 15.4, 14, 11, 2.2) + claw(27.4, 14.6, -12, 21, 3.3, -1)) + claw(17.6, 17.6, -45, 31, 4.6) +
            poly(star, ` fill="${u('v')}" stroke="#07020f" stroke-width=".7" stroke-linejoin="round"`) + `<circle cx="20" cy="20" r="5.6" fill="#07020f" stroke="#7c3aed" stroke-width=".8"/>`,
          i => R([7, 9, 9, 7][i], 20, 20, 1.45, i * 0.55) + mote(4, 30, 0.9, i * 0.5) + mote(34, 4, 0.8, i * 0.5 + 1.2),
          i => fog(i % 2 ? 27 : 6, i % 2 ? 5 : 27, 12, 5.4, i * 0.6) + A('art-aura', `<circle cx="18" cy="18" r="22" fill="${u('w')}"/>`, i * 0.4)),
        crest: fog(56, 36, 18, 7, 0.3) + fog(104, 36, 18, 7, 1.3) + A('art-aura', `<circle cx="80" cy="26" r="30" fill="${u('w')}"/>`) +
          claw(69, 17, -44, 31, 5.8, -1) + claw(91, 17, 44, 31, 5.8, 1) + claw(80, 9, 0, 9, 2) + claw(73.4, 10, -18, 6.6, 1.5, -1) + claw(86.6, 10, 18, 6.6, 1.5) +
          `<path d="${skull}" fill="${u('bn')}" stroke="#07020f" stroke-width=".9" stroke-linejoin="round"/><path d="M68.6 36.4C72 39.6 76 40.6 80 40.6S88 39.6 91.4 36.4" fill="none" stroke="#3b2a5e" stroke-width=".7"/>` +
          `<path d="${sock}" fill="#07020f"/><path d="${sock}" transform="matrix(-1 0 0 1 160 0)" fill="#07020f"/><path d="M80 28.6L82.4 33.4H77.6Z" fill="#07020f"/><path d="M86.6 7.2L84.8 11.4 86.8 14 85.4 17.6M70.4 9.6L72.4 12.6" fill="none" stroke="#2a1d4a" stroke-width=".6" stroke-linejoin="round"/><path d="M66.6 20.6Q72 16.4 78.4 20.4M93.4 20.6Q88 16.4 81.6 20.4" fill="none" stroke="#2a1d4a" stroke-width="1.3" stroke-linecap="round"/>` +
          `<path d="M72.6 38.6V43.4M76.2 39.6V45.2M80 40V45.8M83.8 39.6V45.2M87.4 38.6V43.4" stroke="#3b2a5e" stroke-width=".6"/>` +
          A('cf-pulse', `<circle cx="72.6" cy="23.4" r="6" fill="${u('e')}"/><circle cx="87.4" cy="23.4" r="6" fill="${u('e')}"/>`) +
          A('art-blink', `<circle cx="72.6" cy="23.4" r="2.2" fill="#bbf7d0"/><circle cx="87.4" cy="23.4" r="2.2" fill="#bbf7d0"/><circle cx="72.6" cy="23.4" r="1" fill="#fff"/><circle cx="87.4" cy="23.4" r="1" fill="#fff"/>`, 0.4) +
          R(8, 80, 14.4, 1.25, 0.8) + mote(48, 26, 1, 0.2) + mote(114, 22, 1.1, 1.1) + mote(62, 6, 0.8, 0.7) + mote(100, 4, 0.9, 1.7),
        foot: claw(52.6, 20.4, 160, 9, 1.8, -1) + claw(67.4, 20.4, 200, 9, 1.8) + claw(60, 20.4, 180, 17, 2.8) +
          A('cf-pulse', `<circle cx="60" cy="40" r="6" fill="${u('e')}"/>`) + A('art-float', `<path d="M60 36.4L62.2 40 60 44.6 57.8 40Z" fill="#86efac" stroke="#07020f" stroke-width=".5"/><path d="M60 37.6L60.9 40 60 42.4Z" fill="#fff" opacity=".8"/>`, 0.5),
      };
    },

    // Княжий оклад: в углах — большие розетки с рубином в венце жемчуга, изумруд наружу, золотой акант по краям, сияние;
    // навершие — кокошник-венец с самоцветами и жемчугом, подвеска — изумруд с жемчужной каплей
    knyaz: () => {
      const g = u('p'), P = pearls(g);
      const scroll = `<path d="M24 12.4C30.6 7.4 39.6 7 46 10.2C50.8 12.6 51.6 18.2 48 20.2C45.2 21.8 41.8 20 42.4 17.2C42.8 15.4 45 14.8 46.2 16C45 12.8 38.6 11.8 33 15C30.6 16.4 28.8 18.4 28 21.4Z" fill="${u('s')}" stroke="#2a1804" stroke-width=".75" stroke-linejoin="round"/>` +
        `<path d="M27 14.6C33 10.2 40 9.8 45 12" fill="none" stroke="#fffbe6" stroke-width=".9" stroke-linecap="round" opacity=".8"/>` + P(52.4, 12.4, 1.8) + P(56, 14.6, 1.4);
      const ring = Array.from({ length: 10 }, (_, k) => { const a = k * 36 * Math.PI / 180; return P(f(20 + 8.3 * Math.cos(a)), f(20 + 8.3 * Math.sin(a)), 1.4); }).join('');
      const kd = 'M34 47C34 32 50 22 62 16C70 12 76 7 80 1C84 7 90 12 98 16C110 22 126 32 126 47Z';
      const kp = [[[34, 47], [34, 32], [50, 22], [62, 16]], [[62, 16], [70, 12], [76, 7], [80, 1]]].map(S => bzEven(S, 5)).flat().filter((q, k, a) => !k || q[0] !== a[k - 1][0]);
      const bez = (x, y, r, k) => `<circle cx="${x}" cy="${y}" r="${f(r + 1.3)}" fill="${u('b')}" stroke="#2a1804" stroke-width=".55"/>` + gem(x, y, r, k, I);
      const crest = A('art-aura', `<ellipse cx="80" cy="28" rx="52" ry="36" fill="${u('a')}"/>`) +
          `<path d="${kd}" fill="#2a1804"/><path d="${kd}" fill="${u('b')}" transform="translate(80 47) scale(.96) translate(-80 -47)"/>` +
          `<path d="${kd}" fill="${u('kv')}" stroke="#2a1804" stroke-width=".7" transform="translate(80 48) scale(.74) translate(-80 -48)"/>` +
          `<path d="M50 44C50 34 60 28 68 31M110 44C110 34 100 28 92 31M70 16.4C74 14.4 78 16 78.4 19M90 16.4C86 14.4 82 16 81.6 19" fill="none" stroke="#fde68a" stroke-width=".9" stroke-linecap="round"/>` +
          `<g id="${I}kl">${kp.map(([x, y]) => P(x, y, 1.8)).join('')}</g><use href="#${I}kl" transform="matrix(-1 0 0 1 160 0)"/>` +
          `<circle cx="80" cy="30" r="9.2" fill="${u('b')}" stroke="#2a1804" stroke-width=".7"/>` +
          Array.from({ length: 10 }, (_, k) => { const a = k * 36 * Math.PI / 180; return P(f(80 + 11.4 * Math.cos(a)), f(30 + 11.4 * Math.sin(a)), 1.4); }).join('') +
          gem(80, 30, 6.6, 'r', I) + bez(61, 38, 3.2, 'e') + bez(99, 38, 3.2, 'e') + bez(80, 13, 2.6, 'e') +
          `<path d="M77 1.4C77 -1.6 79-3.2 80-5.2 81-3.2 83-1.6 83 1.4Z" fill="${u('b')}" stroke="#2a1804" stroke-width=".5"/>` + P(80, -6, 2.4) +
          glint(77.8, 27.6, 3.8, 0.3) + glint(60, 36.8, 2.4, 1.2) + glint(79, -7, 2.8, 2) + glint(98.4, 36.6, 2, 2.4);
      const foot = `<path d="M53 20.4H67L63.4 26.6H56.6Z" fill="${u('b')}" stroke="#2a1804" stroke-width=".6"/>` + bez(60, 25.4, 3, 'e') +
          swing(60, 29, 18, `<path d="M60 28.6V32" stroke="#e9b949" stroke-width=".8"/>` + P(60, 32.6, 1.4) + drop(60, 33.8, 0.86, g) + `<circle cx="58.5" cy="39.6" r=".9" fill="#fff" opacity=".9"/>`, 0.4) +
          glint(59, 24.4, 2.2, 0.8);
      return {
        corners: quad(() => goldR(I + 'b') + lg(I + 's', [[0, '#fff1b8'], [0.45, '#e9b949'], [1, '#8a5a14']], 0, 0, 0.4, 1) + gemG('r', I) + gemG('e', I) + pearlG(I + 'p') + GLD +
          glowG(I + 'a', '#fcd34d', 0.7) + lg(I + 'kv', [[0, '#b91c1c'], [1, '#450a0a']]) + P.defs(),
          diag(scroll) + rosette(20, 20, 8, 12.2, 4, 6.2, u('b')) + T('rotate(22.5 20 20)', rosette(20, 20, 8, 10.4, 2.6, 4.4, u('b'))) +
            `<circle cx="20" cy="20" r="10" fill="${u('b')}" stroke="#2a1804" stroke-width=".7"/>` + ring + `<circle cx="20" cy="20" r="6.4" fill="#2a1804"/>` + gem(20, 20, 5.6, 'r', I) +
            `<path d="M8.6 8.6L12 12" stroke="#2a1804" stroke-width="2.4"/>` + bez(6.4, 6.4, 3, 'e') + P(34, 34, 1.8),
          i => glint(17.8, 17.6, 3.4, i * 0.7) + glint(5.4, 5.2, 2.4, i * 0.7 + 1.3) + glint(51.8, 11.6, 1.8, i * 0.7 + 2),
          i => A('art-aura', `<circle cx="18" cy="18" r="26" fill="${u('a')}"/>`, i * 0.5)),
        crest, foot,
      };
    },
  };

  // ужимаем числа: 0.5 → .5
  const mini = s => s.replace(/([^\d.])0\.(?=\d)/g, '$1.');
  const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  return {
    cardBg(id) { return (own(BG, id) ? BG[id] : BG.night)(); },
    cardFrame(id) { return own(FR, id) ? mini(FR[id]()) : ''; },
    // живые части рамки (или null): см. описание выше; id внутри — с приставкой __ID__, её подменяет Art.cardSkin
    frameParts(id) {
      if (!own(FP, id)) return null;
      const P = FP[id](), o = {};
      for (const k in P) o[k] = Array.isArray(P[k]) ? P[k].map(mini) : mini(P[k]);
      return o;
    },
  };
})();
