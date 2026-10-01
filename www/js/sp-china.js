'use strict';
/* 4.28: рисунки духов и богов китайской мифологии — каждый своей функцией (кисть — js/art-kit.js) */

(() => {
  // --- местные помощники (только для духов китайской мифологии) ---
  const r1 = n => Math.round(n * 10) / 10;
  const INK = '#1b1030';
  const cl = (cls, d) => (cls ? ` class="${cls}"` : '') + (d ? ` style="animation-delay:-${d}s"` : '');
  // благовестное облако сянъюнь с завитками: центр (x, y), масштаб s (при s = 1 — ширина ~80)
  const CLOUD = 'M-30 8C-39 8-41-4-32-6C-33-16-19-21-12-12C-8-25 13-25 15-12C21-19 35-15 32-4C41-4 41 8 32 8Z';
  const CURL = 'M-22 3c-1-6 7-8 9-3c1 3-3 5-5 2M4-7c-2-6 7-9 10-4c2 3-2 6-4 3M21 4c0-4 6-5 7-1';
  const cloud = (K, x, y, s, o = {}) => {
    const c1 = o.c1 || '#ffffff', c2 = o.c2 || '#c7d2fe', line = o.line || '#4f46e5';
    return `<g${cl(o.cls, o.d)}${o.op ? ` opacity="${o.op}"` : ''}><g transform="translate(${x} ${y}) scale(${o.flip ? -s : s} ${s})">` +
      `<path d="${CLOUD}" fill="${K.lin([c1, c2])}" stroke="${line}" stroke-width="${r1(2.2 / s)}" stroke-linejoin="round"/>` +
      `<path d="M-30 1C-26-3-20-3-18 1" stroke="#fff" stroke-width="${r1(1.6 / s)}" fill="none" stroke-linecap="round" opacity=".8"/>` +
      `<path d="${CURL}" fill="none" stroke="${line}" stroke-width="${r1(1.5 / s)}" stroke-linecap="round" opacity=".65"/></g></g>`;
  };
  // медная монета с квадратным отверстием
  const coin = (K, x, y, r, o = {}) => {
    const g = K.rad([[0, '#fff7c2'], [0.55, '#fbbf24'], [1, '#b45309']], 0.35, 0.3, 0.85), h = r1(r * 0.27);
    return `<g${cl(o.cls, o.d)}><g transform="translate(${x} ${y}) rotate(${o.rot || 0})"><circle r="${r}" fill="${g}" stroke="#78350f" stroke-width="${r1(Math.max(1, r * 0.13))}"/>` +
      `<circle r="${r1(r * 0.72)}" fill="none" stroke="#b45309" stroke-width="${r1(Math.max(0.6, r * 0.07))}"/>` +
      `<rect x="-${h}" y="-${h}" width="${r1(h * 2)}" height="${r1(h * 2)}" fill="#6b2d0a" stroke="#78350f" stroke-width="${r1(Math.max(0.6, r * 0.08))}"/>` +
      `<path d="M${r1(-r * 0.55)} ${r1(-r * 0.3)}A${r1(r * 0.62)} ${r1(r * 0.62)} 0 0 1 ${r1(-r * 0.15)} ${r1(-r * 0.6)}" stroke="#fff" stroke-width="${r1(Math.max(0.8, r * 0.12))}" fill="none" stroke-linecap="round" opacity=".8"/></g></g>`;
  };
  // красная кисть-подвеска с узелком: верх (x, y), длина len
  const tassel = (K, x, y, len, c = '#dc2626', d = 0) => {
    const k = len;
    return `<g class="art-sway" style="transform-origin:50% 0;animation-delay:-${d}s">` +
      K.line(`M${x} ${y}V${r1(y + k * 0.4)}`, '#991b1b', r1(Math.max(1.2, k * 0.06))) +
      `<circle cx="${x}" cy="${r1(y + k * 0.42)}" r="${r1(Math.max(1.6, k * 0.08))}" fill="#fbbf24" stroke="#78350f" stroke-width="1"/>` +
      K.part(`M${r1(x - k * 0.07)} ${r1(y + k * 0.48)}H${r1(x + k * 0.07)}L${r1(x + k * 0.15)} ${r1(y + k)}H${r1(x - k * 0.15)}Z`, c, { line: '#7f1d1d', lw: 1.3 }) +
      K.line(`M${x} ${r1(y + k * 0.54)}V${r1(y + k * 0.96)}M${r1(x - k * 0.06)} ${r1(y + k * 0.56)}L${r1(x - k * 0.1)} ${r1(y + k * 0.96)}M${r1(x + k * 0.06)} ${r1(y + k * 0.56)}L${r1(x + k * 0.1)} ${r1(y + k * 0.96)}`, '#7f1d1d', 0.8, { op: 0.6 }) + '</g>';
  };
  // жёлтый бумажный талисман-фу с красными знаками-завитками: верх (x, y), ширина w, высота h
  const talisman = (K, x, y, w, h, rot = 0, cls = '') => {
    const g = `<rect x="${r1(-w / 2)}" y="0" width="${w}" height="${h}" rx="1" fill="${K.lin(['#fef9c3', '#fde047', '#eab308'])}" stroke="#a16207" stroke-width="1.2"/>` +
      `<rect x="${r1(-w / 2 + 2)}" y="2" width="${r1(w - 4)}" height="${r1(h - 4)}" fill="none" stroke="#dc2626" stroke-width=".8"/>` +
      K.line(`M0 ${r1(h * 0.1)}v${r1(h * 0.1)}M${r1(-w * 0.24)} ${r1(h * 0.24)}h${r1(w * 0.48)}M${r1(-w * 0.18)} ${r1(h * 0.34)}q${r1(w * 0.18)} ${r1(h * 0.05)} ${r1(w * 0.36)} 0M0 ${r1(h * 0.3)}c${r1(w * 0.26)} ${r1(h * 0.1)} ${r1(-w * 0.26)} ${r1(h * 0.18)} 0 ${r1(h * 0.28)}s${r1(-w * 0.2)} ${r1(h * 0.12)} 0 ${r1(h * 0.18)}M${r1(-w * 0.22)} ${r1(h * 0.64)}l${r1(w * 0.44)} ${r1(h * 0.05)}`, '#dc2626', r1(Math.max(1, w * 0.08))) +
      `<circle cx="0" cy="${r1(h * 0.86)}" r="${r1(w * 0.13)}" fill="none" stroke="#dc2626" stroke-width="1"/>`;
    return `<g${cls ? ` class="${cls}" style="transform-origin:50% 0"` : ''}><g transform="translate(${x} ${y}) rotate(${rot})">${g}</g></g>`;
  };
  // светящаяся жемчужина
  const pearl = (K, x, y, r, c = '#fde047', cls = 'art-float', d = 0) =>
    `<g${cl(cls, d)}><circle class="art-aura" cx="${x}" cy="${y}" r="${r1(r * 2.4)}" fill="${K.rad([[0, '#fffbe6', 0.9], [0.35, c, 0.5], [1, c, 0]])}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${K.rad([[0, '#ffffff'], [0.5, K.shade(c, 0.5)], [1, c]], 0.38, 0.32, 0.8)}" stroke="${K.shade(c, -0.45)}" stroke-width="${r1(Math.max(1, r * 0.12))}"/>` +
    `<ellipse cx="${r1(x - r * 0.32)}" cy="${r1(y - r * 0.35)}" rx="${r1(r * 0.3)}" ry="${r1(r * 0.18)}" transform="rotate(-35 ${r1(x - r * 0.32)} ${r1(y - r * 0.35)})" fill="#fff" opacity=".9"/></g>`;
  // искра-молния (зигзаг): начало (x, y), масштаб s, поворот rot
  const zap = (K, x, y, s, rot = 0, c = '#fde047', d = 0) => `<g class="art-blink"${d ? ` style="animation-delay:-${d}s"` : ''}><g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">` +
    `<path d="M0 0L5-5L1-6L7-13" fill="none" stroke="${c}" stroke-width="${r1(5 / s)}" stroke-linecap="round" stroke-linejoin="round" opacity=".35"/>` +
    `<path d="M0 0L5-5L1-6L7-13" fill="none" stroke="${c}" stroke-width="${r1(2 / s)}" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
  // лисий хвост: основание (x, y), поворот rot (0 — вверх), масштаб sc; o.glow — светится кончик
  const TAIL = 'M93 100C76 82 70 52 80 30C88 14 106 8 115 20C124 34 120 60 110 80C106 90 104 96 107 100Z';
  const TAILTIP = 'M80 30C88 14 106 8 115 20C118 28 117 36 113 42C105 35 92 33 80 30Z';
  const foxTail = (K, x, y, rot, sc, o = {}) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc}) translate(-100 -100)"><g class="art-sway" style="transform-origin:50% 100%;animation-delay:-${o.d || 0}s">` +
    K.vol(TAIL, { c1: o.c1 || '#ffb46a', c2: o.c2 || '#d4500e', rim: o.rim || '#fff3a0', rimK: 0.7, lw: r1(2.4 / sc), texK: 0.18, line: o.line }) +
    (o.glow ? `<circle class="art-aura" cx="100" cy="24" r="22" fill="${K.rad([[0, '#fffbe6', 0.9], [0.4, o.glow, 0.5], [1, o.glow, 0]])}"/>` : '') +
    K.part(TAILTIP, o.tip || '#fff7ed', { line: o.line || '#7c2d12', lw: r1(1.8 / sc) }) +
    K.line('M96 86C88 70 86 52 92 38', '#fff', r1(1.8 / sc), { op: 0.35 }) + '</g></g>';
  // ряд чешуек-дуг от x0 до x1 на высоте y, шаг w
  const scaleRow = (x0, x1, y, w) => { let d = ''; for (let x = x0; x < x1 - 0.1; x += w) d += `M${r1(x)} ${y}q${r1(w / 2)} ${r1(w * 0.55)} ${r1(w)} 0`; return d; };
  // спираль-завиток: центр, шаг, витки
  const spiral = (cx, cy, k, turns) => { let d = ''; for (let i = 0; i <= turns * 24; i++) { const a = i / 24 * Math.PI * 2, r = k * a / Math.PI / 2 * 2; d += (i ? 'L' : 'M') + r1(cx + r * Math.cos(a)) + ' ' + r1(cy + r * Math.sin(a)); } return d; };
  // завиток гривы (кудряшка): круг с закрученной линией
  const curl = (K, x, y, r, c, line) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${K.lin([K.shade(c, 0.3), c, K.shade(c, -0.25)])}" stroke="${line}" stroke-width="1.6"/>` +
    K.line(spiral(x, y, r * 0.3, 1.4), line, 1.2, { op: 0.7 });

  // --- помощники для духов, добавленных при расширении до 63 видов ---
  // полная луна с «морями»: центр (x, y), радиус r
  const moonDisc = (K, x, y, r, o = {}) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${K.rad([[0, '#fffbeb'], [0.75, o.c || '#fef3c7'], [1, o.c2 || '#fde68a']])}" stroke="${o.line || '#eab308'}" stroke-width="1.4"${o.op ? ` opacity="${o.op}"` : ''}/>` +
    `<g fill="${o.c2 || '#fde68a'}" opacity=".6"><circle cx="${r1(x - r * 0.45)}" cy="${r1(y - r * 0.3)}" r="${r1(r * 0.15)}"/><circle cx="${r1(x + r * 0.5)}" cy="${r1(y + r * 0.35)}" r="${r1(r * 0.19)}"/><circle cx="${r1(x + r * 0.32)}" cy="${r1(y - r * 0.52)}" r="${r1(r * 0.09)}"/><circle cx="${r1(x - r * 0.3)}" cy="${r1(y + r * 0.5)}" r="${r1(r * 0.08)}"/></g>`;
  // серп луны: внешний круг (x, y, R) без круга радиуса R·k, сдвинутого на (dx, dy)
  const crescent = (K, x, y, R, o = {}) => {
    const k = o.k || 0.8, dx = o.dx == null ? R * 0.42 : o.dx, dy = o.dy == null ? -R * 0.3 : o.dy, r2 = R * k;
    const d = Math.hypot(dx, dy), a = (R * R - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, R * R - a * a));
    const mx = x + a * dx / d, my = y + a * dy / d, p1 = `${r1(mx + h * dy / d)} ${r1(my - h * dx / d)}`, p2 = `${r1(mx - h * dy / d)} ${r1(my + h * dx / d)}`;
    return `<path${cl(o.cls, o.d)} d="M${p1}A${R} ${R} 0 1 0 ${p2}A${r1(r2)} ${r1(r2)} 0 ${a - d > 0 ? 1 : 0} 1 ${p1}Z" fill="${K.lin(['#fffbeb', o.c || '#fde68a'])}" stroke="${o.line || '#a16207'}" stroke-width="${o.lw || 1.3}" stroke-linejoin="round"/>`;
  };
  // солнце с лучами-треугольниками: центр, радиус
  const sunDisc = (K, x, y, r, n = 12) => {
    let rays = '';
    for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n; rays += `M${r1(x + r * 1.05 * Math.cos(a - 0.15))} ${r1(y + r * 1.05 * Math.sin(a - 0.15))}L${r1(x + r * 1.6 * Math.cos(a))} ${r1(y + r * 1.6 * Math.sin(a))}L${r1(x + r * 1.05 * Math.cos(a + 0.15))} ${r1(y + r * 1.05 * Math.sin(a + 0.15))}Z`; }
    return `<g class="art-spin-soft"><path d="${rays}" fill="#fde68a" stroke="#d97706" stroke-width="1"/></g><circle cx="${x}" cy="${y}" r="${r}" fill="${K.rad([[0, '#fffbe6'], [0.7, '#fde047'], [1, '#f59e0b']])}" stroke="#d97706" stroke-width="1.4"/>`;
  };
  // змеиное тело-трубка по пути d толщиной w: обводка, объёмная заливка, полоса брюшка, узор-крапинки по спине, блик сверху слева
  const tube = (K, d, w, o = {}) => {
    const line = o.line || '#0c4a6e', c1 = o.c1 || '#ffffff', c2 = o.c2 || '#7dd3fc';
    let s = K.line(d, line, w + 5) + K.line(d, K.lin([K.shade(c1, 0.25), c1, c2], 0, 0, 0.25, 1), w);
    if (o.belly) s += K.line(d, o.belly, r1(w * 0.34), { op: 0.85 });
    if (o.dots) s += `<path d="${d}" fill="none" stroke="${o.dots}" stroke-width="${r1(w * 0.3)}" stroke-dasharray="0.1 ${r1(w * 0.62)}" stroke-linecap="round" opacity="${o.dotK || 0.7}"/>`;
    return s + `<g transform="translate(${r1(-w * 0.12)} ${r1(-w * 0.2)})">${K.line(d, '#ffffff', r1(w * 0.16), { op: 0.55 })}</g>`;
  };
  // волны с пенными завитками от x0 до x1, гребни на высоте y (низ закрыт до y + h)
  const waves = (K, x0, x1, y, o = {}) => {
    const n = Math.max(1, Math.round((x1 - x0) / (o.step || 24))), st = (x1 - x0) / n, h = o.h || 16, c1 = o.c1 || '#7dd3fc', c2 = o.c2 || '#0369a1', line = o.line || '#0c4a6e';
    let d = `M${x0} ${y + h}V${y}`, foam = '';
    for (let x = x0; x < x1 - 0.1; x += st) {
      d += `C${r1(x + st * 0.15)} ${r1(y - st * 0.5)} ${r1(x + st * 0.72)} ${r1(y - st * 0.52)} ${r1(x + st * 0.64)} ${r1(y - st * 0.12)}C${r1(x + st * 0.6)} ${r1(y + st * 0.05)} ${r1(x + st * 0.45)} ${r1(y + st * 0.02)} ${r1(x + st * 0.5)} ${r1(y - st * 0.08)}C${r1(x + st * 0.66)} ${r1(y + st * 0.12)} ${r1(x + st * 0.86)} ${r1(y + st * 0.06)} ${r1(x + st)} ${y}`;
      foam += `M${r1(x + st * 0.12)} ${r1(y - st * 0.12)}C${r1(x + st * 0.22)} ${r1(y - st * 0.4)} ${r1(x + st * 0.6)} ${r1(y - st * 0.42)} ${r1(x + st * 0.6)} ${r1(y - st * 0.16)}`;
    }
    d += `V${y + h}Z`;
    return `<path${cl(o.cls, o.d)} d="${d}" fill="${K.lin([c1, c2])}" stroke="${line}" stroke-width="1.8" stroke-linejoin="round"/>` + K.line(foam, '#f0f9ff', 1.6, { op: 0.9 });
  };
  // цветок лотоса: основание (x, y), масштаб s (при s = 1 — высота ~24)
  const lotus = (K, x, y, s, o = {}) => {
    const c = o.c || '#f9a8d4', line = o.line || '#9d174d', gr = K.lin(['#ffffff', c, K.shade(c, -0.12)]);
    const pet = (rot, len, w) => `<path d="M0 0C${-w} ${r1(-len * 0.35)} ${r1(-w * 0.6)} ${r1(-len * 0.8)} 0 ${-len}C${r1(w * 0.6)} ${r1(-len * 0.8)} ${w} ${r1(-len * 0.35)} 0 0Z" transform="rotate(${rot})" fill="${gr}" stroke="${line}" stroke-width="${r1(1.4 / s)}" stroke-linejoin="round"/>`;
    return `<g${cl(o.cls, o.d)}><g transform="translate(${x} ${y}) scale(${s})">${pet(-64, 15, 7)}${pet(64, 15, 7)}${pet(-34, 20, 8)}${pet(34, 20, 8)}${pet(0, 24, 9)}` +
      `<path d="M-14 0Q0 6 14 0" fill="none" stroke="${line}" stroke-width="${r1(1.4 / s)}" stroke-linecap="round"/></g></g>`;
  };
  // персик бессмертия с листиками: центр (x, y), радиус r
  const peach = (K, x, y, r, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})">` +
    `<path d="M0 ${-r}C${r1(r * 0.5)} ${r1(-r * 0.6)} ${r1(r * 1.1)} ${r1(-r * 0.1)} ${r1(r * 0.9)} ${r1(r * 0.5)}C${r1(r * 0.7)} ${r1(r * 1.05)} ${r1(-r * 0.7)} ${r1(r * 1.05)} ${r1(-r * 0.9)} ${r1(r * 0.5)}C${r1(-r * 1.1)} ${r1(-r * 0.1)} ${r1(-r * 0.5)} ${r1(-r * 0.6)} 0 ${-r}Z" fill="${K.rad([[0, '#fff7ed'], [0.45, '#fda4af'], [1, '#e11d48']], 0.35, 0.3, 0.9)}" stroke="#9f1239" stroke-width="${r1(Math.max(1, r * 0.12))}"/>` +
    `<path d="M0 ${r1(-r * 0.85)}Q${r1(-r * 0.25)} 0 0 ${r1(r * 0.85)}" fill="none" stroke="#be123c" stroke-width="${r1(Math.max(0.8, r * 0.08))}" opacity=".55"/>` +
    `<path d="M0 ${-r}C${r1(-r * 0.3)} ${r1(-r * 1.5)} ${r1(-r * 1.1)} ${r1(-r * 1.4)} ${r1(-r * 1.2)} ${r1(-r * 1.1)}C${r1(-r * 0.8)} ${r1(-r * 0.9)} ${r1(-r * 0.3)} ${r1(-r * 0.9)} 0 ${-r}Z" fill="#4ade80" stroke="#14532d" stroke-width="${r1(Math.max(0.8, r * 0.09))}"/></g>`;
  // тыква-горлянка (лекарства, вино): центр нижней груши (x, y), масштаб s; o.ribbon — цвет ленточки
  const gourd = (K, x, y, s, o = {}) => `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${s})">` +
    `<path d="M0 -26C5 -26 7 -22 6 -18C5 -15 3 -14 3 -12C11 -10 16 -3 16 5C16 14 9 19 0 19C-9 19 -16 14 -16 5C-16 -3 -11 -10 -3 -12C-3 -14 -5 -15 -6 -18C-7 -22 -5 -26 0 -26Z" fill="${K.rad([[0, '#fff3c4'], [0.55, o.c || '#f59e0b'], [1, K.shade(o.c || '#f59e0b', -0.4)]], 0.35, 0.3, 0.9)}" stroke="#78350f" stroke-width="${r1(1.6 / s)}"/>` +
    `<path d="M-1 -26V-31" stroke="#5a3208" stroke-width="${r1(2 / s)}" stroke-linecap="round"/><path d="M-4 -12H4" stroke="${o.ribbon || '#dc2626'}" stroke-width="${r1(2.6 / s)}" stroke-linecap="round"/>` +
    `<path d="M2 -12C6 -6 4 0 8 4M0 -12C-2 -6 -6 -4 -6 2" fill="none" stroke="${o.ribbon || '#dc2626'}" stroke-width="${r1(1.8 / s)}" stroke-linecap="round"/>` +
    `<ellipse cx="-6" cy="0" rx="3.4" ry="5" fill="#fff" opacity=".45"/></g>`;

  Object.assign(SPIRIT_ART, {
    // Лисёнок Хули: юный лисий дух — круглый рыжий лисёнок с одним пушистым хвостом (белый кончик), на лбу метка-молния;
    // держит в лапках свою первую жемчужинку, которая пока только потрескивает искорками
    cn_huli(K) {
      const fur = { c1: '#ffb46a', c2: '#d4500e', rim: '#fff3a0', rimK: 0.7, texK: 0.2 }, cream = '#fff7ed', dark = '#7c2d12';
      let s = K.aura('#facc15', 90, 118, 0.32);
      s += foxTail(K, 124, 166, 42, 0.95, { d: 0.4 });
      // уши с тёмными кончиками
      s += K.mirror(K.vol('M66 82C56 64 54 42 62 24C76 32 88 44 96 60Z', fur) + K.part('M69 74C63 60 62 46 66 36C74 42 81 50 87 60Z', '#ffc9b0', { line: '#c2410c', lw: 1.4 }) +
        K.part('M62 24C68 27 74 31 79 36L60 42C59 34 60 29 62 24Z', '#3b1d10', { lw: 0 }));
      // тельце, светлое брюшко, лапки
      s += K.vol('M100 114C124 114 138 134 138 154C138 171 124 179 100 179C76 179 62 171 62 154C62 134 76 114 100 114Z', fur);
      s += K.part('M100 126C113 126 121 140 121 156C121 169 112 175 100 175C88 175 79 169 79 156C79 140 87 126 100 126Z', cream, { flat: true, lw: 0, op: 0.95 });
      s += K.mirror(K.vol(K.ell(80, 174, 12, 7), { ...fur, lw: 2.2, tex: false }) + K.line('M76 170v5M82 171v5', dark, 1.2, { op: 0.6 }));
      // щёчные пучки
      s += K.mirror(K.part('M58 96C46 100 42 110 46 118C50 116 54 118 58 122C56 116 58 108 62 102Z', cream, { line: '#c2410c', lw: 1.6 }));
      // голова и белая мордочка
      s += K.vol('M100 50C130 50 146 68 148 88C149 101 143 111 134 117C122 126 78 126 66 117C57 111 51 101 52 88C54 68 70 50 100 50Z', fur);
      s += K.part('M100 86C112 86 126 95 135 108C127 120 113 124 100 124C87 124 73 120 65 108C74 95 88 86 100 86Z', cream, { flat: true, lw: 0 });
      // метка-молния на лбу
      s += K.part('M101 56L94 67H100L97 76L107 63H101L104 56Z', '#fde047', { line: '#a16207', lw: 1.2 });
      s += K.gloss(76, 66, 8, 4.5, -35, 0.35);
      s += K.eyes(100, 90, 21, 12.5, { iris: '#f59e0b', look: [0.1, 0.35] });
      s += K.blush(68, 108, 7) + K.blush(132, 108, 7);
      s += `<ellipse cx="100" cy="104" rx="5.5" ry="3.8" fill="#2a1208"/><ellipse cx="98.5" cy="102.8" rx="1.8" ry="1" fill="#fff" opacity=".7"/>`;
      s += K.mouth('cat', 100, 110, 12);
      s += K.mirror(K.line('M68 104L52 101M68 109L53 112', dark, 1.3, { op: 0.55 }));
      // жемчужинка в лапках
      s += pearl(K, 100, 145, 8, '#fde047', '');
      s += zap(K, 82, 140, 0.9, -40) + zap(K, 116, 134, 0.9, 30, '#fef08a', 0.6);
      s += K.vol(K.ell(87, 152, 8, 6.5), { ...fur, tex: false, lw: 2 }) + K.vol(K.ell(113, 152, 8, 6.5), { ...fur, tex: false, lw: 2 });
      s += K.spark(30, 70, 3.4, '#fde047', 'art-float') + K.spark(170, 60, 3, '#fef08a') + K.spark(28, 140, 2.6, '#fef08a');
      return s;
    },

    // Хули-цзин: лиса-оборотень «под прикрытием» — в индиговом плаще с золотой каймой и шпилькой с кистью, в лапке круглый
    // шёлковый веер, над другой лапкой искрит лисья жемчужина. Два хвоста за спиной, а третий предательски торчит из-под подола
    cn_hulijing(K) {
      const fur = { c1: '#ffb46a', c2: '#d4500e', rim: '#fff3a0', rimK: 0.7, texK: 0.2 }, cream = '#fff7ed';
      const robe = { c1: '#7c7cf5', c2: '#1e1b4b', rim: '#fde68a', rimK: 0.55, line: '#140f33', texK: 0.2 };
      let s = K.aura('#facc15', 94, 104, 0.3);
      // два хвоста за спиной
      s += foxTail(K, 84, 138, -48, 0.95, { d: 0.2 }) + foxTail(K, 116, 138, 48, 0.95, { d: 0.9 });
      // третий — из-под подола
      s += foxTail(K, 128, 176, 72, 0.7, { d: 0.5 });
      // плащ
      s += K.vol('M100 84C120 84 132 96 136 114C142 138 150 158 156 176C132 183 68 183 44 176C50 158 58 138 64 114C68 96 80 84 100 84Z', robe);
      s += K.part('M100 94L113 179Q100 181 87 179Z', '#fb923c', { line: '#7c2d12', lw: 1.6 });
      s += K.stitch('M100 94L87 179', '#fde047', 2) + K.stitch('M100 94L113 179', '#fde047', 2);
      s += K.line('M45 175Q100 185 155 175', '#fbbf24', 3.4) + K.line('M47 170Q100 180 153 170', '#fde047', 1.2, { op: 0.7 });
      // вышитые молнии по плащу
      s += K.line('M60 150l6-6l-3-1l6-7M140 150l-6-6l3-1l-6-7M70 124l5-5l-3-1l5-6', '#fde047', 1.8, { op: 0.8 });
      // высокий воротник
      s += K.part('M76 90Q100 104 124 90L120 82Q100 94 80 82Z', '#fbbf24', { line: '#78350f', lw: 1.6 });
      // правая лапа (к зрителю слева) поднята — над ней жемчужина
      s += K.vol('M74 104C62 100 50 92 44 80C40 72 48 64 56 70C62 78 70 86 82 92Z', robe);
      s += K.stitch('M44 80C48 74 52 70 56 70', '#fde047', 1.6);
      s += K.vol(K.ell(49, 70, 7, 6.5), { ...fur, tex: false, lw: 2 });
      s += pearl(K, 46, 48, 8.5, '#fde047') + zap(K, 30, 44, 0.9, -60, '#fef08a', 0.3) + zap(K, 58, 36, 0.9, 30, '#fde047', 0.8);
      // левая лапа держит круглый шёлковый веер
      s += K.line('M148 142L150 116', '#78350f', 3);
      s += `<circle cx="152" cy="104" r="17" fill="${K.rad([[0, '#fff7ed'], [1, '#fde2e4']])}" stroke="#b45309" stroke-width="2.2"/>`;
      s += K.line('M140 110C146 104 152 106 158 98M150 104l-4-5M154 102l2-6', '#be185d', 1.6, { op: 0.8 }) + `<circle cx="158" cy="97" r="2.2" fill="#f472b6"/><circle cx="146" cy="99" r="1.8" fill="#f9a8d4"/>`;
      s += tassel(K, 148, 146, 16, '#dc2626', 0.4);
      s += K.vol('M126 102C138 110 146 124 148 136C144 142 136 142 132 138C130 128 124 118 118 110Z', robe);
      s += K.vol(K.ell(146, 140, 7, 6.5), { ...fur, tex: false, lw: 2 });
      // уши и голова
      s += K.mirror(K.vol('M72 52C64 38 62 22 68 8C80 16 90 26 96 38Z', fur) + K.part('M74 46C70 36 69 26 72 18C79 23 85 29 89 37Z', '#ffc9b0', { line: '#c2410c', lw: 1.3 }) +
        K.part('M68 8C74 12 79 15 83 19L67 22C66 16 66 12 68 8Z', '#3b1d10', { lw: 0 }));
      s += K.mirror(K.part('M64 68C54 72 52 80 55 86C58 84 62 86 66 89C64 82 66 76 70 72Z', cream, { line: '#c2410c', lw: 1.4 }));
      s += K.vol('M100 30C124 30 138 44 139 60C140 72 134 82 126 86C116 93 84 93 74 86C66 82 60 72 61 60C62 44 76 30 100 30Z', fur);
      s += K.part('M100 60C110 60 121 68 128 79C121 88 111 91 100 91C89 91 79 88 72 79C79 68 90 60 100 60Z', cream, { flat: true, lw: 0 });
      s += K.part('M101 34L95 43H100L98 50L106 40H101L103 34Z', '#fde047', { line: '#a16207', lw: 1 });
      // шпилька с кистью
      s += K.line('M114 36L134 26', '#fbbf24', 3) + `<circle cx="134" cy="26" r="3.4" fill="#dc2626" stroke="#7f1d1d" stroke-width="1"/>` + tassel(K, 134, 29, 22, '#dc2626', 0.7);
      // хитрый прищур и ухмылка
      s += K.eyes(100, 63, 15, 8.5, { iris: '#f59e0b', lid: 'half', skin: '#f08a3c', lash: true, look: [0.5, 0.25] });
      s += K.mirror(K.line('M86 70l-6 3', '#dc2626', 1.6, { op: 0.8 }));
      s += `<ellipse cx="100" cy="77" rx="4.4" ry="3" fill="#2a1208"/>`;
      s += K.line('M93 82Q100 86 108 80', INK, 2.2);
      s += K.blush(79, 78, 5) + K.blush(121, 78, 5);
      s += K.spark(24, 100, 3, '#fde047') + K.spark(178, 60, 3.2, '#fef08a', 'art-float') + K.spark(172, 150, 2.6, '#fde047');
      return s;
    },

    // Девятихвостая лиса: мудрая белозолотая лиса сидит, девять хвостов раскрыты веером-сиянием, кончики светятся;
    // на лбу — алая метка-пламя, у глаз — красные стрелки, над головой парит лисья жемчужина в молниях
    cn_jiuweihu(K) {
      const fur = { c1: '#fffaf0', c2: '#e8a33c', rim: '#fff3a0', rimK: 0.75, line: '#8a4a0c', texK: 0.18 }, cream = '#ffffff';
      let s = K.aura('#facc15', 100, 104, 0.35);
      // девять хвостов веером
      const fan = [-92, -69, -46, -23, 0, 23, 46, 69, 92];
      fan.forEach((a, i) => { s += foxTail(K, 100, 140, a, Math.abs(a) > 60 ? 1.08 : 1.2, { c1: '#f7a93a', c2: '#a8440a', tip: '#fffbeb', line: '#5a2206', rim: '#ffe08a', d: (i * 0.3) % 2.8 }); });
      fan.forEach((a, i) => { const t = a * Math.PI / 180, L = Math.abs(a) > 60 ? 96 : 106; s += K.spark(r1(100 + L * Math.sin(t)), r1(140 - L * Math.cos(t)), 4.4, i % 2 ? '#fef08a' : '#fffbe6'); });
      // тело сидя
      s += K.vol('M100 96C130 96 146 120 148 146C150 166 138 179 100 179C62 179 50 166 52 146C54 120 70 96 100 96Z', fur);
      s += K.mirror(K.vol(K.ell(62, 166, 16, 13), { ...fur, lw: 2.4 }));
      // передние лапы
      s += K.mirror(K.vol('M78 120C76 140 76 160 76 172C76 178 82 180 88 180C94 180 97 177 97 172C97 158 96 140 95 124Z', fur) + K.line('M82 175v4M88 174v5M93 175v4', '#8a4a0c', 1.3, { op: 0.6 }));
      // пышное жабо на груди
      s += K.part('M68 98Q70 112 78 116Q78 126 88 126Q92 136 100 134Q108 136 112 126Q122 126 122 116Q130 112 132 98Z', cream, { line: '#c2861e', lw: 1.6 });
      s += K.line('M84 112q4 6 8 2M108 114q4 4 8-2M96 124q4 4 8 0', '#e8c890', 1.4);
      // уши, щёчные пучки, голова
      s += K.mirror(K.vol('M72 60C64 44 62 26 68 12C82 20 92 32 97 46Z', fur) + K.part('M74 54C70 42 69 30 72 22C80 28 86 34 90 44Z', '#ffd6c8', { line: '#c2861e', lw: 1.3 }) +
        K.part('M68 12C74 16 79 19 83 23L67 26C66 20 66 16 68 12Z', '#f59e0b', { lw: 0 }));
      s += K.mirror(K.part('M64 80C52 84 48 94 52 102C56 100 60 102 66 106C64 98 66 90 72 86Z', cream, { line: '#c2861e', lw: 1.4 }));
      s += K.vol('M100 42C124 42 138 56 139 72C140 84 132 94 124 98C114 106 86 106 76 98C68 94 60 84 61 72C62 56 76 42 100 42Z', fur);
      s += K.part('M100 74C110 74 121 81 128 92C121 101 111 104 100 104C89 104 79 101 72 92C79 81 90 74 100 74Z', cream, { flat: true, lw: 0 });
      // алая метка-пламя на лбу
      s += K.part('M100 46C104 52 106 56 104 61C103 64 97 64 96 61C94 56 96 52 100 46Z', '#ef4444', { line: '#7f1d1d', lw: 1.2 }) + `<circle cx="100" cy="59" r="1.6" fill="#fde047"/>`;
      s += K.gloss(80, 58, 6, 3.4, -35, 0.4);
      // спокойный мудрый взгляд со стрелками
      s += K.eyes(100, 75, 15, 8.2, { iris: '#facc15', lid: 'half', skin: '#f6d7a0', lash: true, look: [0, 0.25] });
      s += K.mirror(K.line('M86 80Q80 83 74 80', '#dc2626', 1.8));
      s += `<ellipse cx="100" cy="90" rx="4.4" ry="3" fill="#3a1a08"/>`;
      s += K.mouth('cat', 100, 95, 9);
      // жемчужина в молниях над головой
      s += pearl(K, 100, 18, 7.5, '#fde047') + zap(K, 84, 18, 0.8, -70, '#fef08a', 0.4) + zap(K, 112, 10, 0.8, 60, '#fde047', 1.1);
      s += K.spark(20, 170, 3, '#fde047') + K.spark(180, 172, 3, '#fef08a', 'art-float') + K.spark(24, 30, 2.6, '#fef08a') + K.spark(176, 28, 2.6, '#fde047');
      return s;
    },

    // Карпик: пухлый бело-рыжий карпик кои выпрыгнул из пруда — плавнички-ручки, губки «о», короткие усики;
    // вокруг брызги и круги по воде: тренирует прыжок к Вратам дракона
    cn_karpik(K) {
      const koi = { c1: '#ffffff', c2: '#f2c8a6', rim: '#c8f3ff', rimK: 0.8, line: '#9a3412', texK: 0.16 }, org = '#f97316';
      let s = K.aura('#38bdf8', 86, 120, 0.3);
      // вода: круги и брызги
      s += `<ellipse cx="100" cy="174" rx="70" ry="9" fill="${K.rad([[0, '#7dd3fc', 0.6], [1, '#2b8fd6', 0]])}"/>`;
      s += '<g class="art-aura"><ellipse cx="100" cy="174" rx="80" ry="10" fill="none" stroke="#bfeaff" stroke-width="1.6" opacity=".45"/></g>';
      let c = '';
      // хвост
      c += K.part('M120 146C142 152 160 146 174 128C172 144 174 158 184 168C164 170 144 166 126 160Z', org, { line: '#9a3412', lw: 2 });
      c += K.line('M130 154L176 136M132 158L180 162M128 150L170 132', '#fff3e0', 1.2, { op: 0.7 });
      // спинной плавник
      c += K.part('M84 64C88 44 104 34 122 40C116 48 114 56 116 66Z', '#fb923c', { line: '#9a3412', lw: 1.8 }) + K.line('M92 60L100 44M102 62L110 42M110 64L118 44', '#fff3e0', 1.1, { op: 0.7 });
      // тело
      const body = 'M100 58C134 58 152 86 152 116C152 148 130 168 100 168C70 168 48 148 48 116C48 86 66 58 100 58Z';
      c += K.vol(body, koi);
      // рыжие пятна кои
      c += K.part('M68 76C82 60 114 58 130 68C124 82 106 86 96 82C86 92 72 90 68 76Z', org, { line: '#c2410c', lw: 1.2 });
      c += K.part('M132 108C144 104 152 116 148 132C140 134 128 124 132 108Z', org, { line: '#c2410c', lw: 1.2 });
      c += K.part('M56 128C62 124 70 130 68 140C62 144 54 140 56 128Z', '#ef4444', { line: '#b91c1c', lw: 1.2 });
      // чешуя
      c += K.line(scaleRow(66, 134, 146, 11) + scaleRow(72, 128, 156, 11), '#d9a580', 1.4, { op: 0.8 });
      c += K.gloss(72, 90, 9, 5, -40, 0.5);
      // плавнички-ручки
      c += K.mirror(K.part('M52 116C40 112 30 116 26 126C34 128 42 128 50 126Z', '#fdba74', { line: '#9a3412', lw: 1.6 }) + K.line('M48 118L30 124M48 122L32 127', '#fff3e0', 1, { op: 0.7 }));
      // мордочка
      c += K.eyes(100, 102, 20, 12, { iris: '#1e6fd0', look: [0.1, -0.2] });
      c += K.blush(70, 120, 7) + K.blush(130, 120, 7);
      c += `<ellipse cx="100" cy="126" rx="7" ry="6" fill="#f472b6" stroke="${INK}" stroke-width="2.2"/><ellipse cx="100" cy="127" rx="3.2" ry="2.8" fill="#6b1d2a"/>`;
      c += K.mirror(K.line('M92 128C86 132 84 138 86 142', '#9a3412', 1.8));
      s += K.g(c, 'rotate(-8 100 120)', 'art-float');
      // брызги-капли
      s += K.line('M40 160q-6-10-2-18M160 162q6-10 2-18M52 170q-10-4-14-12', '#bfeaff', 2, { op: 0.8 });
      s += `<circle cx="34" cy="138" r="3" fill="#bfeaff" stroke="#0c4a7a" stroke-width="1"/><circle cx="168" cy="134" r="2.4" fill="#bfeaff" stroke="#0c4a7a" stroke-width="1"/>`;
      s += K.spark(30, 60, 3, '#e0f7ff', 'art-float') + K.spark(172, 70, 2.6, '#e0f7ff');
      return s;
    },

    // Золотой карп: подрос и вызолотился — плывёт вверх по водопаду; брови решительно сдвинуты, усы длиннее, хвост веером;
    // вверху справа уже виднеются красные Врата дракона — остался один прыжок
    cn_jinli(K) {
      const gold = { c1: '#fff1a8', c2: '#d97706', rim: '#c8f3ff', rimK: 0.7, line: '#7c2d12', texK: 0.2 };
      let s = K.aura('#38bdf8', 90, 104, 0.3);
      // водопад
      const wf = K.id('wf');
      K.def(`<linearGradient id="${wf}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc" stop-opacity="0"/><stop offset=".25" stop-color="#7dd3fc" stop-opacity=".4"/><stop offset="1" stop-color="#bae6fd" stop-opacity=".45"/></linearGradient>`);
      s += `<path d="M62 0H138Q142 90 146 178H54Q58 90 62 0Z" fill="url(#${wf})"/>`;
      s += K.line('M66 30V170M80 20V176M122 20V176M136 30V170M94 16V60M108 24V70', '#e0f7ff', 2, { op: 0.45 });
      // Врата дракона
      let gt = K.part('M148 34H186V38H148Z', '#b91c1c', { line: '#450a0a', lw: 1.4 }) + K.part('M152 38H157V72H152ZM177 38H182V72H177Z', '#dc2626', { line: '#450a0a', lw: 1.4 });
      gt += K.part('M140 30C150 30 156 22 158 18H176C178 22 184 30 194 30L190 34H144Z', '#0f766e', { line: '#042f2e', lw: 1.4 }) + K.part('M163 42H171V50H163Z', '#fbbf24', { line: '#78350f', lw: 1 });
      s += K.g(gt, '', 'art-float') + `<circle class="art-aura" cx="167" cy="46" r="26" fill="${K.rad([[0, '#fde68a', 0.45], [1, '#fde68a', 0]])}"/>`;
      // хвост веером
      s += K.part('M100 154C90 162 74 166 60 182C80 184 94 180 100 170C106 180 120 184 140 182C126 166 110 162 100 154Z', '#fbbf24', { line: '#7c2d12', lw: 2 });
      s += K.line('M100 162L70 180M100 162L86 182M100 162L114 182M100 162L130 180', '#fff3b0', 1.2, { op: 0.8 });
      // грудные плавники
      s += K.mirror(K.part('M66 96C54 92 42 98 34 110C44 112 56 110 68 108Z', '#fcd34d', { line: '#7c2d12', lw: 1.6 }) + K.line('M62 100L40 108M64 104L44 110', '#fff3b0', 1, { op: 0.8 }));
      // тело
      s += K.vol('M100 30C124 30 138 50 138 76C138 102 128 124 116 140C110 148 108 154 108 160H92C92 154 90 148 84 140C72 124 62 102 62 76C62 50 76 30 100 30Z', gold);
      s += K.line(scaleRow(72, 128, 92, 10) + scaleRow(76, 124, 104, 9.6) + scaleRow(80, 120, 116, 10) + scaleRow(86, 114, 128, 9.3) + scaleRow(92, 108, 140, 8), '#b45309', 1.4, { op: 0.75 });
      s += K.gloss(80, 48, 8, 4.5, -40, 0.5);
      // лицо: решительные брови, губки, длинные усы
      s += K.eyes(100, 58, 14, 9, { iris: '#1e6fd0', lid: 'angry', skin: '#f59e0b', look: [0.1, -0.4] });
      s += `<ellipse cx="100" cy="78" rx="6" ry="5" fill="#f472b6" stroke="${INK}" stroke-width="2"/><ellipse cx="100" cy="79" rx="2.6" ry="2.2" fill="#6b1d2a"/>`;
      s += K.mirror(K.line('M93 80C84 86 76 84 70 76C66 70 70 64 74 68', '#92400e', 2.2));
      s += K.blush(78, 70, 5) + K.blush(122, 70, 5);
      // брызги и пузырьки
      s += `<circle cx="44" cy="150" r="4" fill="none" stroke="#e0f7ff" stroke-width="1.4" class="art-float"/><circle cx="160" cy="130" r="3" fill="none" stroke="#e0f7ff" stroke-width="1.2" class="art-float"/>`;
      s += K.line('M44 176q-8-10-2-20M156 176q8-10 2-20', '#bfeaff', 2, { op: 0.8 });
      s += K.spark(30, 40, 3, '#fde68a') + K.spark(40, 120, 2.6, '#e0f7ff', 'art-float');
      return s;
    },

    // Цзяолун: карп, ставший драконом — золотое змеиное тело кольцами, от карпа остались плавники и хвост-веер;
    // голубая грива, рожки только прорезались, длинные усы-барбели, дерзкий оскал; внизу — волна Врат дракона
    cn_jiaolong(K) {
      const gold = { c1: '#fff1a8', c2: '#d97706', rim: '#c8f3ff', rimK: 0.7, line: '#6b2a06', texK: 0.2 }, blue = '#38bdf8';
      let s = K.aura('#38bdf8', 96, 108, 0.38);
      // волна
      s += K.part('M10 178C20 160 40 156 50 166C54 156 66 152 72 160C80 150 94 150 98 162C100 172 88 176 80 170C84 178 60 182 10 178Z', '#7dd3fc', { line: '#0c4a7a', lw: 1.8 });
      s += K.line('M58 168c4-6 10-6 12 0M84 164c2-4 8-4 8 0', '#e0f7ff', 1.6);
      // тело кольцами
      const body = 'M100 90C132 94 150 110 140 124C130 138 70 124 60 146C52 164 90 174 120 168C146 164 164 156 172 136';
      s += K.line(body, '#6b2a06', 27) + K.line(body, K.lin(['#fff1a8', '#fbbf24', '#d97706']), 22);
      s += K.line(body, '#fff7d6', 8, { op: 0.7 }) + `<path d="${body}" fill="none" stroke="#d97706" stroke-width="8" stroke-dasharray="1.6 5" opacity=".7"/>`;
      s += `<path d="${body}" fill="none" stroke="#b45309" stroke-width="18" stroke-dasharray="2 7" opacity=".25"/>`;
      // плавники-гребни по спине
      const fin = (x, y, r) => K.g(K.part('M0 0C-2-8 2-14 8-16C6-10 8-4 12 0Z', blue, { line: '#0c4a7a', lw: 1.4 }), `translate(${x} ${y}) rotate(${r})`);
      s += fin(128, 94, 10) + fin(146, 108, 50) + fin(96, 124, -150) + fin(68, 132, -120) + fin(150, 160, -30);
      // хвост-веер карпа
      s += K.part('M172 138C166 122 168 108 180 98C182 112 186 118 196 124C188 130 180 134 172 138Z', blue, { line: '#0c4a7a', lw: 1.8 }) + K.line('M174 132L184 106M176 134L192 124', '#e0f7ff', 1.2, { op: 0.8 });
      // лапки с коготками
      s += K.mirror(K.vol('M76 102C66 106 58 114 56 122C60 126 66 126 70 122C72 116 76 112 82 108Z', { ...gold, lw: 2.2 }) + `<path d="M56 120l-5 3l5 1M58 124l-3 5l5-2M64 125l0 5l3-4" fill="#fff" stroke="#6b2a06" stroke-width="1" stroke-linejoin="round"/>`);
      // грудные плавники
      s += K.mirror(K.part('M72 108C58 110 50 120 46 132C56 128 64 124 74 118Z', blue, { line: '#0c4a7a', lw: 1.6 }));
      // грива
      s += K.mirror(K.part('M64 54C50 48 42 56 34 48C38 62 44 68 54 70C44 74 40 82 32 84C44 90 56 86 64 80Z', blue, { line: '#0c4a7a', lw: 1.8 }) + K.line('M60 60C52 60 46 58 42 54M58 76C50 80 44 82 40 82', '#e0f7ff', 1.2, { op: 0.8 }));
      // рожки-почки
      s += K.mirror(K.part('M82 38C78 28 74 22 66 18C72 18 76 20 79 23C79 17 81 13 85 11C87 19 89 27 89 35Z', '#fef3c7', { line: '#78350f', lw: 1.6 }));
      // голова
      s += K.vol('M100 32C120 32 132 44 134 58C142 62 146 72 142 82C138 92 124 96 100 96C76 96 62 92 58 82C54 72 58 62 66 58C68 44 80 32 100 32Z', gold);
      s += K.part('M100 70C118 70 134 74 138 82C134 90 120 94 100 94C80 94 66 90 62 82C66 74 82 70 100 70Z', '#fff3c4', { line: '#b45309', lw: 1.2 });
      s += `<ellipse cx="88" cy="76" rx="3" ry="2" fill="#6b2a06"/><ellipse cx="112" cy="76" rx="3" ry="2" fill="#6b2a06"/>`;
      s += K.gloss(84, 42, 7, 4, -35, 0.45);
      // усы-барбели
      s += K.mirror(K.line('M66 84C50 90 40 80 30 88C22 94 26 104 34 100', '#6b2a06', 3.4) + K.line('M66 84C50 90 40 80 30 88C22 94 26 104 34 100', '#fcd34d', 1.6));
      s += K.eyes(100, 56, 15, 9, { iris: '#0ea5e9', lid: 'angry', skin: '#e8a33c', look: [0, 0.2] });
      s += K.mouth('fang', 100, 84, 20);
      s += K.spark(24, 30, 3, '#e0f7ff', 'art-float') + K.spark(176, 40, 3, '#fde68a') + K.spark(184, 80, 2.4, '#e0f7ff');
      return s;
    },

    // Монетоед: детёныш пиксиу — круглый золотой зверёк с кудрявой гривой, рожками-пупырышками и крошечными крылышками;
    // щёки надуты, пасть раскрыта — сейчас проглотит монетку. Вокруг кружат монеты на ветру
    cn_monetoed(K) {
      const gold = { c1: '#fff3b0', c2: '#d4a017', rim: '#ffffff', rimK: 0.7, line: '#78350f', texK: 0.2 };
      let s = K.aura('#a5b4fc', 88, 118, 0.35);
      s += K.line('M20 110q14-10 26 0t22-2M150 84q14-8 26 2', '#e0e7ff', 2.2, { op: 0.55, cls: 'art-float' });
      // крылышки
      const wing = `<g class="art-wing">` + K.part('M70 128C56 118 40 116 28 122C34 126 36 130 36 134C40 132 46 134 48 138C52 134 58 136 62 140C66 136 70 134 74 134Z', '#fef9e0', { line: '#a16207', lw: 1.6 }) + K.line('M40 126L66 132M50 134L68 136', '#e0c070', 1.1) + '</g>';
      s += K.mirror(wing);
      // хвост-завиток
      s += K.line('M134 164C156 170 170 156 164 142C160 134 150 136 152 144', '#78350f', 9) + K.line('M134 164C156 170 170 156 164 142C160 134 150 136 152 144', '#f59e0b', 5);
      // тело и лапки
      s += K.vol('M100 110C126 110 140 128 140 150C140 168 126 178 100 178C74 178 60 168 60 150C60 128 74 110 100 110Z', gold);
      s += K.part('M100 130C114 130 122 142 122 156C122 168 112 174 100 174C88 174 78 168 78 156C78 142 86 130 100 130Z', '#fff7d6', { flat: true, lw: 0, op: 0.9 });
      s += K.mirror(K.vol(K.ell(78, 174, 12, 7), { ...gold, tex: false, lw: 2 }) + K.line('M72 172v5M78 173v5M84 172v5', '#78350f', 1.2, { op: 0.6 }));
      // кудрявая грива
      for (let i = 0; i < 12; i++) { const a = (-200 + i * 20) * Math.PI / 180; s += curl(K, r1(100 + 52 * Math.cos(a)), r1(86 + 46 * Math.sin(a)), 11, '#f59e0b', '#9a3412'); }
      // рожки
      s += K.mirror(K.part('M80 48C76 38 76 30 80 22C86 28 90 36 92 44Z', '#fef9c3', { line: '#78350f', lw: 1.6 }));
      // голова
      s += K.vol('M100 40C134 40 152 62 152 88C152 110 132 124 100 124C68 124 48 110 48 88C48 62 66 40 100 40Z', gold);
      s += K.gloss(72, 58, 9, 5, -35, 0.45);
      s += K.part('M94 46C96 52 104 52 106 46C104 44 96 44 94 46Z', '#dc2626', { line: '#7f1d1d', lw: 1 });
      s += K.eyes(100, 80, 21, 12.5, { iris: '#b45309', look: [0, 0.6] });
      // надутые щёки и раскрытая пасть
      s += K.blush(64, 100, 10) + K.blush(136, 100, 10);
      s += K.mouth('open', 100, 100, 18);
      // монета в лапках
      s += coin(K, 100, 128, 11);
      s += K.vol(K.ell(86, 134, 8, 6.5), { ...gold, tex: false, lw: 2 }) + K.vol(K.ell(114, 134, 8, 6.5), { ...gold, tex: false, lw: 2 });
      // монеты на ветру
      s += coin(K, 28, 60, 7, { cls: 'art-float', rot: -20 }) + coin(K, 172, 58, 6, { cls: 'art-float', d: 1.2, rot: 15 }) + coin(K, 170, 128, 5, { cls: 'art-float', d: 0.6 });
      s += K.spark(40, 30, 3, '#fde68a') + K.spark(24, 150, 2.6, '#e0e7ff');
      return s;
    },

    // Пиксиу: страж-зверь фэншуя — сидит как статуя у дверей: крылья подняты, кудрявая рыжая грива, рога назад,
    // свирепый, но смешной оскал; передней лапой прижимает к земле большую монету, чтобы ветер её не унёс
    cn_pixiu(K) {
      const gold = { c1: '#fff0a0', c2: '#b8860b', rim: '#ffffff', rimK: 0.65, line: '#5a3208', texK: 0.2 };
      let s = K.aura('#a5b4fc', 96, 104, 0.4);
      // вихри ветра
      s += K.line('M14 150q16-12 30 0t28 0M136 30q14-10 28 0t22 0', '#e0e7ff', 2.2, { op: 0.5, cls: 'art-float' });
      // крылья
      const wing = `<g class="art-wing">` + K.part('M80 108C62 94 42 78 24 54C36 56 44 60 50 64C42 52 40 42 42 30C52 40 60 50 64 58C64 46 68 36 76 28C80 44 82 56 84 68C86 82 90 94 94 102Z', '#fef3c7', { line: '#8a5a0c', lw: 1.8 }) +
        K.line('M32 58C52 76 68 90 86 102M46 36C58 56 72 78 88 98M74 32C78 52 84 76 92 98', '#d4a64a', 1.3) + '</g>';
      s += K.mirror(wing);
      // хвост-пламя
      s += K.line('M140 166C166 168 176 146 166 130C160 120 166 110 176 108', '#5a3208', 10) + K.line('M140 166C166 168 176 146 166 130C160 120 166 110 176 108', '#ea580c', 6);
      s += curl(K, 176, 106, 7, '#f97316', '#7c2d12');
      // тело сидя, задние лапы
      s += K.vol('M100 94C130 94 146 118 148 142C150 164 136 178 100 178C64 178 50 164 52 142C54 118 70 94 100 94Z', gold);
      s += K.mirror(K.vol(K.ell(60, 166, 15, 12), { ...gold, lw: 2.4 }));
      // монета под лапой
      s += coin(K, 138, 160, 17);
      // передние лапы: левая — прямо, правая — на монете
      s += K.vol('M72 118C70 138 70 158 70 170C70 177 76 180 84 180C91 180 94 177 94 170C94 156 93 138 92 122Z', gold) + K.line('M76 175v4M82 174v5M88 175v4', '#5a3208', 1.3, { op: 0.7 });
      s += K.vol('M98 116C110 122 124 132 134 140C138 146 132 152 126 150C114 144 104 138 96 132Z', gold) + K.vol(K.ell(138, 145, 12, 7.5), { ...gold, lw: 2.4 }) + K.line('M132 146v5M138 147v5M144 146v5', '#5a3208', 1.3, { op: 0.7 });
      // грива-кудри
      for (let i = 0; i < 13; i++) { const a = (-210 + i * 20) * Math.PI / 180; s += curl(K, r1(100 + 46 * Math.cos(a)), r1(78 + 40 * Math.sin(a)), 10, '#f97316', '#7c2d12'); }
      // рога назад
      s += K.mirror(K.part('M82 50C74 38 64 30 50 28C58 22 72 24 82 32C86 36 90 42 92 48Z', '#fef9c3', { line: '#5a3208', lw: 1.6 }) + K.line('M60 28l2 4M68 28l1 5M76 32l0 5', '#b8860b', 1));
      // голова
      s += K.vol('M100 42C126 42 142 58 142 78C142 98 126 112 100 112C74 112 58 98 58 78C58 58 74 42 100 42Z', gold);
      s += K.part('M100 80C116 80 128 88 128 98C128 106 116 112 100 112C84 112 72 106 72 98C72 88 84 80 100 80Z', '#fff7d6', { line: '#b8860b', lw: 1.4 });
      s += `<ellipse cx="100" cy="86" rx="8" ry="5.5" fill="#5a1a0a" stroke="${INK}" stroke-width="1.4"/><ellipse cx="97" cy="84.5" rx="2.4" ry="1.2" fill="#fff" opacity=".6"/>`;
      // кудрявые брови и свирепые глаза
      s += K.eyes(100, 66, 17, 9.5, { iris: '#b45309', lid: 'angry', skin: '#e0a830', look: [0.2, 0.2] });
      s += K.mirror(curl(K, 78, 54, 5, '#f97316', '#7c2d12'));
      s += K.mouth('teeth', 100, 97, 30);
      s += K.blush(74, 88, 5) + K.blush(126, 88, 5);
      s += coin(K, 26, 100, 6, { cls: 'art-float', d: 0.8 }) + coin(K, 176, 150, 5, { cls: 'art-float', d: 0.2 });
      s += K.spark(30, 20, 3, '#fde68a') + K.spark(170, 88, 2.6, '#e0e7ff', 'art-float');
      return s;
    },

    // Тяньлу: небесный пиксиу на облаке-сянъюнь — огромные крылья, один витой рог, нефритовая грива языками,
    // на груди ожерелье из старинных монет на красном шнуре, благородный грозный взгляд
    cn_tianlu(K) {
      const gold = { c1: '#fff4c0', c2: '#c08a1a', rim: '#ffffff', rimK: 0.7, line: '#5a3208', texK: 0.2 }, jade = '#10b981';
      let s = K.aura('#a5b4fc', 100, 100, 0.45) + K.aura('#fde68a', 60, 90, 0.3);
      // крылья: большие, с нефритовыми кончиками
      const wd = 'M84 104C62 96 36 80 8 52C20 52 30 56 36 60C26 46 22 34 22 20C34 32 44 42 50 50C48 36 50 24 58 12C64 28 68 40 70 52C72 40 76 32 84 26C86 48 88 72 92 96Z';
      const wing = `<g class="art-wing">` + K.part(wd, '#fef3c7', { line: '#8a5a0c', lw: 1.8 }) +
        K.part('M8 52C20 52 30 56 36 60C26 46 22 34 22 20C28 26 32 32 36 38C40 50 30 52 20 52Z', jade, { line: '#065f46', lw: 1.2 }) +
        K.line('M18 56C42 74 64 88 86 100M36 40C50 62 68 82 88 98M60 22C66 48 76 74 90 96', '#d4a64a', 1.3) + '</g>';
      s += K.mirror(wing);
      // облако под ногами
      s += cloud(K, 100, 170, 2.1, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca' });
      // хвост-языки
      s += K.line('M140 140C168 140 180 118 172 100', '#065f46', 10) + K.line('M140 140C168 140 180 118 172 100', jade, 6);
      s += K.flame(174, 104, 24, 16, '#a7f3d0', jade, { style: 'animation-delay:-.5s' });
      // тело и ноги
      s += K.vol('M100 88C134 88 152 112 152 136C152 154 138 162 100 162C62 162 48 154 48 136C48 112 66 88 100 88Z', gold);
      s += K.mirror(K.vol('M70 130C68 146 68 158 70 166C72 172 86 172 88 166C90 158 90 144 88 132Z', gold) + `<path d="M70 166l-3 5l6-2M76 168l-1 5l4-4M82 168l1 5l3-5" fill="#fff" stroke="#5a3208" stroke-width="1" stroke-linejoin="round"/>`);
      // ожерелье из монет
      s += K.line('M66 110Q100 138 134 110', '#dc2626', 3);
      [[72, 116], [86, 124], [100, 127], [114, 124], [128, 116]].forEach(([x, y]) => { s += coin(K, x, y, 6.5); });
      // нефритовая грива языками
      [[-150, 50], [-120, 46], [-90, 44], [-60, 46], [-30, 50], [-180, 44], [0, 44]].forEach(([a, R], i) => {
        const t = a * Math.PI / 180, x = r1(100 + R * Math.cos(t)), y = r1(72 + R * Math.sin(t) * 0.9);
        s += K.g(K.flame(x, y + 14, 30, 22, '#a7f3d0', '#059669', { style: `animation-delay:-${(i * 0.3).toFixed(1)}s` }), `rotate(${a + 90} ${x} ${y})`);
      });
      // голова
      s += K.vol('M100 38C126 38 142 54 142 74C142 94 126 108 100 108C74 108 58 94 58 74C58 54 74 38 100 38Z', gold);
      s += K.part('M100 76C116 76 128 84 128 94C128 102 116 108 100 108C84 108 72 102 72 94C72 84 84 76 100 76Z', '#fff7d6', { line: '#b8860b', lw: 1.4 });
      s += `<ellipse cx="100" cy="82" rx="7.5" ry="5" fill="#5a1a0a" stroke="${INK}" stroke-width="1.4"/>`;
      // витой рог
      s += K.part('M93 44C93 30 96 16 100 4C104 16 107 30 107 44Z', '#fef9c3', { line: '#5a3208', lw: 1.8 }) + K.line('M94 36L106 32M95 26L105 22M97 16L103 13', '#b8860b', 1.4);
      s += `<circle class="art-aura" cx="100" cy="6" r="10" fill="${K.rad([[0, '#fffbe6', 0.9], [1, '#fde68a', 0]])}"/>`;
      // нефритовая бородка
      s += K.part('M88 106C90 116 96 122 100 124C104 122 110 116 112 106Z', jade, { line: '#065f46', lw: 1.4 });
      s += K.eyes(100, 62, 16, 9, { iris: '#059669', lid: 'angry', skin: '#e0b040', look: [0, 0.2] });
      s += K.mirror(curl(K, 80, 50, 4.6, jade, '#065f46'));
      s += K.mouth('fang', 100, 94, 24);
      s += K.spark(20, 100, 3.4, '#fde68a', 'art-float') + K.spark(180, 100, 3.4, '#fde68a', 'art-float') + K.spark(40, 150, 2.6, '#e0e7ff') + K.spark(160, 20, 2.6, '#fffbe6');
      return s;
    },

    // Прыгунчик: маленький цзянши — в синем халатике с квадратной нашивкой-облачком и в шапочке с красной бусиной;
    // на лбу болтается жёлтый талисман, ручки вытянуты вперёд, ладошки свисают; подпрыгивает, поднимая пыль
    cn_prygun(K) {
      const skin = { c1: '#e2fbe9', c2: '#7fcfa4', rim: '#e9d5ff', rimK: 0.6, line: '#1f4d3a', tex: false };
      const robe = { c1: '#4f63d8', c2: '#141a4a', rim: '#e9d5ff', rimK: 0.55, line: '#0b0f2e', texK: 0.5 };
      let s = K.aura('#c084fc', 86, 116, 0.35);
      // месяц и звёзды
      s += `<path d="M34 24A14 14 0 1 0 48 42A11 11 0 1 1 34 24Z" fill="#fef3c7" stroke="#a16207" stroke-width="1.2"/>`;
      // пыль от прыжка
      s += K.line('M60 182q10-6 20 0M120 182q10-6 20 0', '#c4b5fd', 2, { op: 0.6, cls: 'art-blink' });
      let c = '';
      // башмачки вместе
      c += K.mirror(K.part('M84 164H98V174H80C78 170 80 166 84 164Z', '#1f2937', { line: '#0b0f2e', lw: 1.6 }) + K.line('M80 174H98', '#f8fafc', 2.2));
      // халатик
      c += K.vol('M72 94H128C133 94 137 98 137 104L142 162C142 168 138 170 132 170H68C62 170 58 168 58 162L63 104C63 98 67 94 72 94Z', robe);
      c += K.line('M60 162H140', '#fbbf24', 3) + K.stitch('M62 157H138', '#fde68a', 1.6) + K.line('M100 98V168', '#0b0f2e', 1.6, { op: 0.4 });
      // нашивка с облачком
      c += K.part('M86 118H114V144H86Z', '#1e2560', { line: '#fbbf24', lw: 2 }) + cloud(K, 100, 132, 0.28, { c1: '#fef3c7', c2: '#fbbf24', line: '#92400e' });
      // вытянутые ручки
      c += K.mirror(K.vol('M68 100C54 100 38 100 26 104C22 110 24 118 30 120C42 118 56 116 70 116Z', robe) + K.line('M28 104C24 110 26 116 30 119', '#fbbf24', 3) +
        K.vol('M26 118C22 122 22 130 24 134C27 136 30 134 30 130C31 126 32 122 32 120Z', skin));
      // голова
      c += K.vol('M100 46C126 46 140 62 140 80C140 98 126 106 100 106C74 106 60 98 60 80C60 62 74 46 100 46Z', skin);
      // шапочка чиновника
      c += K.vol('M66 60C66 38 82 28 100 28C118 28 134 38 134 60Z', { c1: '#3a3f55', c2: '#0f111c', rim: '#e9d5ff', line: '#05060c', lw: 2.4, texK: 0.3 });
      c += K.part('M58 62C58 54 142 54 142 62C142 68 58 68 58 62Z', '#1f2233', { line: '#05060c', lw: 2 });
      c += K.line('M76 40L72 56M100 30V56M124 40L128 56', '#dc2626', 1.4, { op: 0.6 });
      c += `<circle cx="100" cy="26" r="5.5" fill="${K.rad([[0, '#fecaca'], [1, '#dc2626']], 0.35, 0.3)}" stroke="#7f1d1d" stroke-width="1.4"/>`;
      // сонные глазки, румянец, ротик «о»
      c += K.eyes(100, 84, 20, 10, { iris: '#6b7280', lid: 'half', skin: '#b8ecd0', look: [0, 0.3] });
      c += K.blush(72, 96, 6) + K.blush(128, 96, 6);
      c += K.mouth('o', 100, 94, 10);
      // талисман на лбу
      c += talisman(K, 100, 60, 16, 30, 6, 'art-sway');
      s += K.g(c, 'translate(0 -6)', 'art-float');
      s += K.spark(170, 40, 3, '#e9d5ff') + K.spark(176, 110, 2.6, '#c084fc', 'art-float') + K.spark(22, 80, 2.4, '#e9d5ff');
      return s;
    },

    // Цзянши: прыгающий дух в полном облачении цинского чиновника — зимняя шапка с красной бахромой и павлиньим пером,
    // халат с журавлём на нашивке и волнами по подолу, длинные чётки; руки вытянуты, талисман трепещет на лбу
    cn_jiangshi(K) {
      const skin = { c1: '#e2fbe9', c2: '#7fcfa4', rim: '#e9d5ff', rimK: 0.6, line: '#1f4d3a', tex: false };
      const robe = { c1: '#4a5fd0', c2: '#10163e', rim: '#e9d5ff', rimK: 0.55, line: '#080b26', texK: 0.5 };
      let s = K.aura('#c084fc', 96, 108, 0.4);
      s += `<circle cx="34" cy="30" r="15" fill="${K.rad([[0, '#fffbe6'], [1, '#fde68a']])}" stroke="#a16207" stroke-width="1.2" opacity=".9"/>`;
      s += K.line('M52 186q12-6 24 0M124 186q12-6 24 0', '#c4b5fd', 2, { op: 0.6, cls: 'art-blink' });
      let c = '';
      c += K.mirror(K.part('M82 166H98V176H78C76 172 78 168 82 166Z', '#111827', { line: '#05060c', lw: 1.6 }) + K.line('M78 176H98', '#f8fafc', 2.4));
      // халат
      c += K.vol('M76 88H124C132 88 138 94 140 102L150 168C150 174 146 176 140 176H60C54 176 50 174 50 168L60 102C62 94 68 88 76 88Z', robe);
      // волны по подолу
      c += K.part('M52 158H148L150 168C150 174 146 176 140 176H60C54 176 50 174 50 168Z', '#2dd4bf', { line: '#080b26', lw: 1.6 });
      c += K.line('M52 164q6-5 12 0t12 0t12 0t12 0t12 0t12 0t12 0t12 0M52 170q6-5 12 0t12 0t12 0t12 0t12 0t12 0t12 0t12 0', '#f0fdfa', 1.3, { op: 0.8 });
      c += K.line('M52 158H148', '#fbbf24', 2.4) + K.line('M100 92V158', '#080b26', 1.6, { op: 0.4 });
      // нашивка с журавлём
      c += K.part('M84 112H116V142H84Z', '#1e2560', { line: '#fbbf24', lw: 2 });
      c += K.part('M92 132C96 126 104 124 110 128C104 128 100 132 98 136Z', '#ffffff', { line: '#94a3b8', lw: 0.8 }) + K.line('M104 126C106 120 104 116 100 116M98 136l-2 4M100 136l2 4', '#e2e8f0', 1.2) + `<circle cx="100" cy="116" r="1.4" fill="#dc2626"/>`;
      // вытянутые руки с белыми обшлагами
      c += K.mirror(K.vol('M66 96C50 96 34 98 20 102C16 108 18 118 24 120C38 118 54 114 70 112Z', robe) + K.part('M16 102C12 104 12 118 16 120L26 119C22 114 22 106 26 102Z', '#f1f5f9', { line: '#64748b', lw: 1.4 }) +
        K.vol('M14 116C10 120 10 130 12 134C15 136 18 134 18 130C19 126 20 122 20 118Z', skin));
      // чётки
      for (let i = 0; i <= 14; i++) { const t = i / 14, x = r1(72 + 56 * t), y = r1(94 + 58 * Math.sin(t * Math.PI)); c += `<circle cx="${x}" cy="${y}" r="${i % 7 === 0 ? 3.4 : 2.4}" fill="${i % 7 === 0 ? '#dc2626' : '#f59e0b'}" stroke="#78350f" stroke-width=".8"/>`; }
      // голова
      c += K.vol('M100 40C122 40 134 54 134 72C134 88 122 98 100 98C78 98 66 88 66 72C66 54 78 40 100 40Z', skin);
      // павлинье перо назад
      c += K.line('M104 22C120 20 140 26 156 42', '#15803d', 3) + `<ellipse cx="156" cy="42" rx="7" ry="5" transform="rotate(40 156 42)" fill="#0d9488" stroke="#064e3b" stroke-width="1.2"/><ellipse cx="156" cy="42" rx="3.4" ry="2.4" transform="rotate(40 156 42)" fill="#1e3a8a"/>`;
      // зимняя шапка: купол с бахромой и загнутые поля
      c += K.vol('M64 54C64 32 80 20 100 20C120 20 136 32 136 54Z', { c1: '#f87171', c2: '#991b1b', rim: '#fde68a', line: '#450a0a', lw: 2.2, tex: false });
      c += K.line('M72 50L80 30M84 52L88 26M100 54V22M116 52L112 26M128 50L120 30', '#7f1d1d', 1.4, { op: 0.7 });
      c += K.part('M58 58C58 48 142 48 142 58L140 64C120 58 80 58 60 64Z', '#111827', { line: '#05060c', lw: 2 });
      c += `<circle cx="100" cy="18" r="5" fill="${K.rad([[0, '#fff7c2'], [1, '#d97706']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.3"/>`;
      c += K.eyes(100, 76, 15, 8, { iris: '#6b7280', lid: 'half', skin: '#b8ecd0', look: [0, 0.3] });
      c += K.blush(78, 86, 5) + K.blush(122, 86, 5);
      c += K.mouth('fang', 100, 87, 12);
      c += talisman(K, 100, 56, 17, 34, -5, 'art-sway');
      s += K.g(c, 'translate(0 -4)', 'art-float');
      s += K.spark(24, 40, 3, '#e9d5ff') + K.spark(180, 120, 2.6, '#c084fc', 'art-float') + K.spark(28, 150, 2.4, '#e9d5ff');
      return s;
    },

    // Фонарик: красный бумажный фонарик с золотыми крышечками и кисточкой — светится изнутри, над крышкой пляшет огонёк;
    // машет ручкой и улыбается. Вдали — ещё фонарики праздничной улицы
    cn_fonarik(K) {
      let s = K.aura('#ff7a1a', 90, 110, 0.4);
      s += K.g(`<circle cx="30" cy="40" r="7" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.2"/><circle cx="30" cy="40" r="14" fill="${K.rad([[0, '#fde68a', 0.5], [1, '#fde68a', 0]])}"/>`, '', 'art-float');
      s += K.g(`<circle cx="176" cy="54" r="6" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.2"/><circle cx="176" cy="54" r="12" fill="${K.rad([[0, '#fde68a', 0.5], [1, '#fde68a', 0]])}"/>`, '', 'art-blink');
      let c = '';
      // дужка и огонёк
      c += K.line('M86 46Q100 24 114 46', '#78350f', 3.4);
      c += K.flame(100, 46, 22, 12, '#fff3b0', '#ff7a1a');
      c += K.part('M78 42H122L126 52H74Z', '#fbbf24', { line: '#78350f', lw: 1.8 });
      // бумажное тело
      c += K.vol('M100 50C140 50 162 76 162 104C162 132 140 156 100 156C60 156 38 132 38 104C38 76 60 50 100 50Z', { c1: '#ff7a6a', c2: '#b91c1c', rim: '#ffe29a', rimK: 0.7, line: '#5c0a0a', texK: 0.25 });
      c += `<ellipse cx="100" cy="108" rx="46" ry="38" fill="${K.rad([[0, '#fde68a', 0.55], [1, '#f97316', 0]])}"/>`;
      c += K.line('M70 54C56 78 56 130 70 152M84 51C78 80 78 128 84 155M116 51C122 80 122 128 116 155M130 54C144 78 144 130 130 152', '#7f1d1d', 1.6, { op: 0.45 });
      c += K.line('M50 72Q100 62 150 72M50 136Q100 146 150 136', '#fbbf24', 2, { op: 0.8 });
      c += K.part('M74 154H126L122 164H78Z', '#fbbf24', { line: '#78350f', lw: 1.8 });
      c += tassel(K, 100, 164, 26, '#dc2626');
      // ручки
      c += K.vol(K.ell(36, 116, 7, 6), { c1: '#ff7a6a', c2: '#b91c1c', line: '#5c0a0a', lw: 2, tex: false });
      c += K.g(K.vol(K.ell(166, 88, 7, 6), { c1: '#ff7a6a', c2: '#b91c1c', line: '#5c0a0a', lw: 2, tex: false }), '', 'art-spin-soft');
      c += K.gloss(66, 74, 10, 5.5, -40, 0.4);
      // мордочка
      c += K.eyes(100, 98, 22, 13, { iris: '#b45309', look: [0.1, 0.2] });
      c += K.blush(66, 118, 8) + K.blush(134, 118, 8);
      c += K.mouth('grin', 100, 116, 18);
      s += K.g(c, '', 'art-float');
      s += K.spark(40, 120, 3, '#ffe08a', 'art-float') + K.spark(164, 140, 2.6, '#ffd23f') + K.spark(160, 20, 2.4, '#fff3b0');
      return s;
    },

    // Небесный фонарь: бумажный фонарь желаний летит над изогнутыми крышами — внутри горит огонь, на бумаге красные
    // строчки мечты; позади в небе — другие фонарики, внизу светятся окна
    cn_kongming(K) {
      let s = K.aura('#ff9a3d', 96, 92, 0.45);
      // крыши с загнутыми углами
      s += K.part('M-4 186V166H70V186Z', '#2a1030', { line: '#12061a', lw: 1.4 }) + K.part('M126 186V160H206V186Z', '#2a1030', { line: '#12061a', lw: 1.4 });
      s += K.part('M-8 166C6 166 12 160 16 150H52C56 160 62 166 78 166C66 170 4 170 -8 166Z', '#4c1d3d', { line: '#12061a', lw: 1.6 });
      s += K.part('M118 160C132 160 138 154 142 144H184C188 154 194 160 208 160C196 164 130 164 118 160Z', '#4c1d3d', { line: '#12061a', lw: 1.6 });
      s += `<path d="M20 172h8v8h-8zM44 172h8v8h-8zM146 168h8v8h-8zM176 168h8v8h-8z" fill="#fde68a"/>`;
      // дальние фонарики
      const mini = (x, y, sc, d) => K.g(`<circle cx="${x}" cy="${y}" r="${r1(12 * sc)}" fill="${K.rad([[0, '#fde68a', 0.6], [1, '#fb923c', 0]])}"/><path d="M${r1(x - 5 * sc)} ${r1(y - 6 * sc)}H${r1(x + 5 * sc)}L${r1(x + 4 * sc)} ${r1(y + 6 * sc)}H${r1(x - 4 * sc)}Z" fill="#fdba74" stroke="#9a3412" stroke-width="1"/>`, '', 'art-float" style="animation-delay:-' + d + 's');
      s += mini(28, 44, 1, 0.5) + mini(174, 30, 0.8, 1.3) + mini(170, 108, 0.7, 0.9) + mini(20, 116, 0.6, 1.7);
      let c = '';
      // огонь под фонарём
      c += `<circle class="art-aura" cx="100" cy="140" r="24" fill="${K.rad([[0, '#fff3b0', 0.9], [0.4, '#ffb020', 0.5], [1, '#ff7a1a', 0]])}"/>`;
      c += K.flame(100, 146, 22, 13, '#fffbe6', '#ff7a1a');
      c += K.line('M70 134L100 142L130 134', '#78350f', 1.2);
      // бумажный купол
      c += K.vol('M60 42C60 22 140 22 140 42L134 130C134 138 66 138 66 130Z', { c1: '#fff4c8', c2: '#f59e0b', rim: '#fff3b0', rimK: 0.8, line: '#9a3412', texK: 0.2 });
      c += `<ellipse cx="100" cy="98" rx="30" ry="36" fill="${K.rad([[0, '#fffbe6', 0.8], [1, '#fde68a', 0]])}"/>`;
      c += K.line('M80 28L84 132M120 28L116 132M100 26V134', '#c2410c', 1.1, { op: 0.35 });
      c += `<ellipse cx="100" cy="132" rx="34" ry="5" fill="none" stroke="#78350f" stroke-width="2.4"/>`;
      // строчки желания
      c += K.line('M124 48v14M118 46v20M124 70v8', '#dc2626', 1.8, { op: 0.8 });
      c += K.line('M76 108l3 3l-3 3M80 114h6', '#dc2626', 1.4, { op: 0.6 });
      c += K.gloss(76, 44, 9, 5, -30, 0.5);
      // мордочка
      c += K.eyes(100, 78, 17, 11, { iris: '#b45309', look: [0, -0.4] });
      c += K.blush(74, 96, 6) + K.blush(126, 96, 6);
      c += K.mouth('smile', 100, 96, 14);
      s += K.g(c, '', 'art-float');
      s += K.spark(48, 20, 3, '#fff3b0') + K.spark(150, 60, 2.6, '#ffe08a', 'art-float') + K.spark(60, 100, 2.4, '#ffd23f');
      return s;
    },

    // Нефритовый зайчонок: белый зайчонок с нефритовыми ушками и нефритовым завитком на лбу — скатился с Луны в сквер;
    // толчёт травки в крышечке от бутылки веточкой-пестиком. Над ним — месяц, вокруг травинки
    cn_zaychonok(K) {
      const fur = { c1: '#ffffff', c2: '#9adfbd', rim: '#e4ffb0', rimK: 0.6, line: '#1f5a3e', tex: false }, jade = '#34d399';
      let s = K.aura('#84cc16', 86, 118, 0.3);
      s += `<circle cx="36" cy="30" r="18" fill="${K.rad([[0, '#fffbe6', 0.8], [1, '#fde68a', 0]])}"/><path d="M34 18A12 12 0 1 0 46 36A9 9 0 1 1 34 18Z" fill="#fef3c7" stroke="#a16207" stroke-width="1.2"/>`;
      // травинки
      s += K.line('M22 178q2-10 -2-18M28 178q0-8 4-14M170 178q-2-10 2-16M178 178q2-8-2-14', '#4d7c0f', 2.4);
      s += K.leaf(160, 170, 14, -60, '#65a30d') + K.leaf(36, 172, 12, -120, '#84cc16');
      // ушки
      s += K.mirror(K.vol('M82 70C74 50 70 26 76 12C84 4 94 12 94 28C94 44 92 58 92 70Z', fur) + K.part('M82 56C78 42 78 28 81 20C85 16 89 20 89 30C89 40 88 50 87 58Z', '#ffc9d6', { line: '#be185d', lw: 1 }) +
        K.part('M76 12C84 4 94 12 94 28C88 24 82 20 76 20C75 17 75 14 76 12Z', jade, { line: '#065f46', lw: 1.2 }));
      // тельце и лапки
      s += K.vol('M100 118C124 118 138 136 138 156C138 172 124 179 100 179C76 179 62 172 62 156C62 136 76 118 100 118Z', fur);
      s += K.mirror(K.vol(K.ell(78, 174, 14, 7), { ...fur, tex: false, lw: 2 }));
      // голова
      s += K.vol('M100 58C130 58 146 78 146 98C146 118 128 130 100 130C72 130 54 118 54 98C54 78 70 58 100 58Z', fur);
      s += K.line(spiral(100, 72, 1.1, 1.6), jade, 2.4) + `<circle cx="100" cy="72" r="1.6" fill="#065f46"/>`;
      s += K.gloss(74, 76, 8, 4.5, -35, 0.45);
      s += K.eyes(100, 96, 20, 12, { iris: '#e11d48', look: [0.1, 0.5] });
      s += K.blush(68, 112, 7) + K.blush(132, 112, 7);
      s += `<path d="M96 108H104L100 112Z" fill="#f472b6" stroke="#9d174d" stroke-width="1" stroke-linejoin="round"/>`;
      s += K.mouth('cat', 100, 114, 10);
      // крышечка-ступка с травками
      s += K.part('M84 146H116L114 162H86Z', '#22c55e', { line: '#14532d', lw: 1.6 }) + K.line('M88 150v10M93 150v10M98 150v10M103 150v10M108 150v10M113 150v10', '#14532d', 0.9, { op: 0.5 });
      s += `<ellipse cx="100" cy="146" rx="16" ry="4" fill="#bbf7d0" stroke="#14532d" stroke-width="1.4"/>`;
      s += K.leaf(92, 145, 9, -150, '#65a30d') + K.leaf(106, 145, 9, -40, '#84cc16');
      // пестик-веточка
      s += K.line('M104 146L128 118', '#78350f', 4) + K.line('M104 146L128 118', '#b45309', 2) + K.leaf(124, 122, 8, -80, '#65a30d');
      s += K.vol(K.ell(86, 146, 7, 6), { ...fur, tex: false, lw: 1.8 }) + K.vol(K.ell(120, 128, 7, 6), { ...fur, tex: false, lw: 1.8 });
      s += K.spark(170, 60, 3, '#e4ffb0', 'art-float') + K.spark(30, 120, 2.6, '#fef3c7') + K.spark(160, 110, 2.4, '#e4ffb0');
      return s;
    },

    // Нефритовый заяц: подросший заяц на фоне полной Луны, одно ухо загнулось; в красном шарфике толчёт пестиком
    // в нефритовой ступке травы бессмертия, рядом — гриб линчжи и травы
    cn_yutu(K) {
      const fur = { c1: '#ffffff', c2: '#9adfbd', rim: '#e4ffb0', rimK: 0.6, line: '#1f5a3e', tex: false }, jade = '#34d399';
      let s = `<circle class="art-aura" cx="100" cy="72" r="80" fill="${K.rad([[0.5, '#fde68a', 0.4], [1, '#fde68a', 0]])}"/>`;
      s += `<circle cx="100" cy="72" r="58" fill="${K.rad([[0, '#fffbeb'], [0.8, '#fef3c7'], [1, '#fde68a']])}" stroke="#eab308" stroke-width="1.4" opacity=".95"/>`;
      s += `<circle cx="72" cy="52" r="8" fill="#fde68a" opacity=".6"/><circle cx="132" cy="92" r="10" fill="#fde68a" opacity=".5"/><circle cx="126" cy="44" r="5" fill="#fde68a" opacity=".6"/>`;
      // ушки: одно торчит, другое загнулось
      s += K.vol('M84 48C78 32 76 14 82 6C90 0 96 10 95 24C94 34 92 42 92 48Z', fur) + K.part('M84 40C81 30 81 18 84 12C88 10 90 16 90 24C90 30 89 36 88 42Z', '#ffc9d6', { line: '#be185d', lw: 1 });
      s += K.part('M82 6C90 0 96 10 95 24C90 20 86 16 81 14C80 10 80 8 82 6Z', jade, { line: '#065f46', lw: 1.2 });
      s += K.vol('M108 46C110 30 114 18 124 12C134 8 142 14 136 22C130 28 120 32 116 48Z', fur) + K.part('M124 12C134 8 142 14 136 22C132 20 128 18 124 18Z', jade, { line: '#065f46', lw: 1.2 });
      // тело
      s += K.vol('M100 96C124 96 136 118 138 140C140 164 128 179 100 179C72 179 60 164 62 140C64 118 76 96 100 96Z', fur);
      s += K.mirror(K.vol(K.ell(80, 175, 14, 6.5), { ...fur, tex: false, lw: 2 }));
      // гриб линчжи
      s += K.line('M42 176C42 168 44 160 48 154', '#78350f', 3) + K.part('M30 156C30 146 42 140 52 142C60 144 64 150 60 156C52 154 40 154 30 156Z', '#b91c1c', { line: '#450a0a', lw: 1.6 }) + K.line('M34 152Q46 146 58 150', '#fbbf24', 1.2, { op: 0.8 });
      s += K.leaf(160, 174, 16, -50, '#65a30d') + K.leaf(166, 176, 12, -20, '#84cc16');
      // голова и шарфик
      s += K.vol('M100 40C124 40 136 54 136 72C136 90 122 100 100 100C78 100 64 90 64 72C64 54 76 40 100 40Z', fur);
      s += K.line('M72 96Q100 110 128 96', '#dc2626', 7) + K.line('M120 102C124 112 122 120 126 128M124 101C130 110 132 116 136 122', '#dc2626', 4);
      s += K.line(spiral(100, 52, 0.9, 1.5), jade, 2.2);
      s += K.eyes(100, 70, 14, 9, { iris: '#e11d48', look: [0.2, 0.6] });
      s += K.blush(78, 82, 5) + K.blush(122, 82, 5);
      s += `<path d="M97 80H103L100 83Z" fill="#f472b6" stroke="#9d174d" stroke-width="1"/>`;
      s += K.mouth('cat', 100, 85, 9);
      // нефритовая ступка
      s += K.vol('M68 132H132C132 154 120 166 100 166C80 166 68 154 68 132Z', { c1: '#a7f3d0', c2: '#047857', rim: '#e4ffb0', line: '#064e3b', texK: 0.15 });
      s += `<ellipse cx="100" cy="132" rx="32" ry="7" fill="#065f46" stroke="#064e3b" stroke-width="1.8"/>`;
      s += K.part('M88 164H112L116 176H84Z', '#10b981', { line: '#064e3b', lw: 1.6 });
      s += K.leaf(84, 131, 10, -160, '#84cc16') + K.leaf(114, 131, 10, -20, '#65a30d');
      s += K.gloss(78, 142, 6, 3, -20, 0.5);
      // пестик в лапах
      s += K.g(K.part('M96 76H106V132H96Z', '#d6b58a', { line: '#6b4423', lw: 1.6 }) + K.part('M93 120H109C109 128 105 134 101 134C97 134 93 128 93 120Z', '#e9d5b0', { line: '#6b4423', lw: 1.6 }), 'rotate(24 101 130)', 'art-spin-soft');
      s += K.vol(K.ell(86, 118, 8, 7), { ...fur, tex: false, lw: 2 }) + K.vol(K.ell(110, 108, 8, 7), { ...fur, tex: false, lw: 2 });
      // «тук-тук»
      s += K.line('M146 120q6 4 6 10M152 114q8 6 8 16', '#fef3c7', 2, { op: 0.8, cls: 'art-blink' });
      s += K.spark(20, 60, 3, '#fef3c7', 'art-float') + K.spark(180, 40, 3, '#e4ffb0') + K.spark(176, 140, 2.4, '#fef3c7');
      return s;
    },

    // Фэнхуан: китайский феникс на ветке утуна — крылья подняты, на кончиках маховых перьев язычки пламени;
    // пятицветный хвост из длинных лент с завитками (красная, бирюзовая, золотая, фиолетовая, синяя), хохолок из трёх
    // закрученных перьев, красная бородка под золотым клювом; позади — тёплое солнце
    cn_fenghuang(K) {
      let s = K.aura('#ff7a1a', 100, 96, 0.4);
      s += `<circle class="art-aura" cx="100" cy="78" r="56" fill="${K.rad([[0, '#fff3b0', 0.85], [0.6, '#fdba74', 0.45], [1, '#f97316', 0]])}"/>`;
      // хвостовые ленты
      const rib = (d, c, dl, o) => `<g class="art-sway" style="transform-origin:${o};animation-delay:-${dl}s">` + K.line(d, K.shade(c, -0.55), 10) + K.line(d, c, 7) + K.line(d, K.shade(c, 0.5), 2.2, { op: 0.8 }) + '</g>';
      s += rib('M98 138C86 158 66 170 44 174C34 176 28 170 32 164C35 160 40 163 38 166', '#8b5cf6', 0.6, '100% 0');
      s += rib('M102 138C114 158 134 170 156 174C166 176 172 170 168 164C165 160 160 163 162 166', '#fbbf24', 1.2, '0 0');
      s += rib('M96 134C76 146 54 140 38 152C26 162 14 160 14 150C14 142 24 142 24 148', '#14b8a6', 0.2, '100% 0');
      s += rib('M104 134C124 146 146 140 162 152C174 162 186 160 186 150C186 142 176 142 176 148', '#ef4444', 0.9, '0 0');
      // ветка утуна с листьями
      const br = 'M2 170C40 160 80 168 120 162C150 158 176 150 198 140';
      s += K.line(br, '#3f2212', 8) + K.line(br, '#8a5a34', 4);
      s += K.leaf(34, 164, 22, 150, '#65a30d') + K.leaf(160, 154, 22, -40, '#4d7c0f') + K.leaf(182, 146, 18, 20, '#84cc16') + K.leaf(58, 166, 16, 110, '#84cc16');
      s += rib('M100 140C98 154 104 166 98 186', '#3b82f6', 0.4, '50% 0');
      // крылья: веер маховых перьев, на кончиках пламя
      const wd = 'M90 104C72 94 52 78 38 58C30 46 24 34 24 20C32 24 36 28 40 32C38 22 40 14 44 8C50 16 54 24 56 30C58 20 62 14 68 10C70 20 72 28 72 36C76 28 80 24 86 22C86 48 90 76 96 98Z';
      const wing = `<g class="art-wing">` + K.part(wd, '#ef4444', { line: '#7f1d1d', lw: 2 }) +
        `<path d="${wd}" fill="${K.lin(['#2dd4bf', '#fbbf24', '#ef4444'], 0.2, 0, 0.7, 1)}" opacity=".85"/>` +
        K.line('M30 30C48 58 70 84 92 100M46 16C56 46 74 76 94 98M68 16C72 44 82 72 95 96', '#fff3b0', 1.3, { op: 0.8 }) +
        K.part('M94 106C80 100 68 92 58 80C66 80 70 82 74 84C70 76 70 70 72 62C78 72 82 80 86 84C86 76 88 70 92 64C96 80 98 94 98 104Z', '#fbbf24', { line: '#92400e', lw: 1.4 }) +
        K.flame(24, 22, 14, 9, '#fff3b0', '#f97316', { style: 'animation-delay:-.3s' }) + K.flame(44, 10, 14, 9, '#fff3b0', '#f97316', { style: 'animation-delay:-.8s' }) + K.flame(68, 12, 14, 9, '#fff3b0', '#f97316', { style: 'animation-delay:-.5s' }) + '</g>';
      s += K.mirror(wing);
      // лапки на ветке
      s += K.mirror(K.line('M94 140L92 160M92 160l-5 3M92 160l0 5M92 160l5 3', '#b45309', 2.4));
      // шея и тело
      s += K.vol('M92 92C90 80 92 68 95 60C98 58 102 58 105 60C108 68 110 80 108 92Z', { c1: '#ffb070', c2: '#dc2626', rim: '#ffe29a', line: '#5c0a0a', tex: false, lw: 2 });
      s += K.vol('M100 80C116 80 124 96 122 112C120 126 112 136 100 142C88 136 80 126 78 112C76 96 84 80 100 80Z', { c1: '#ff8a6a', c2: '#b91c1c', rim: '#ffe29a', rimK: 0.8, line: '#5c0a0a', texK: 0.25 });
      s += `<path d="M100 88C110 92 114 104 112 116C110 126 106 132 100 136C94 132 90 126 88 116C86 104 90 92 100 88Z" fill="${K.lin(['#fff0a0', '#fbbf24', '#f97316'])}" stroke="#b45309" stroke-width="1.2"/>`;
      s += K.line(scaleRow(90, 110, 102, 6.7) + scaleRow(89, 111, 112, 7.3) + scaleRow(91, 109, 122, 6), '#c2410c', 1.2, { op: 0.8 });
            // хохолок: три закрученных пера
      s += K.g(K.line('M97 40C90 28 82 24 76 26C72 28 74 34 78 32', '#0d9488', 2.6) + K.line('M100 38C100 24 104 16 110 14C116 14 116 20 112 21', '#f59e0b', 2.6) + K.line('M103 40C110 30 120 28 126 32C128 36 124 38 122 35', '#dc2626', 2.6) +
        `<circle cx="77" cy="30" r="3" fill="#2dd4bf" stroke="#064e3b"/><circle cx="113" cy="18" r="3" fill="#fde047" stroke="#92400e"/><circle cx="123" cy="34" r="3" fill="#f87171" stroke="#7f1d1d"/>`, '', 'art-spin-soft');
      // голова
      s += K.vol(K.ell(100, 50, 15, 14), { c1: '#ffe08a', c2: '#f97316', rim: '#fff3b0', rimK: 0.7, line: '#7c2d12', texK: 0.2 });
      s += K.mirror(K.line('M88 46Q84 50 86 56', '#0d9488', 2.2));
      s += K.gloss(91, 42, 4, 2.4, -35, 0.5);
      s += K.eyes(100, 49, 7, 5.2, { iris: '#b91c1c', lash: true, look: [0, 0.2] });
      // клюв и бородка
      s += K.part('M100 64C97 66 96 69 97 72C99 71 101 71 103 72C104 69 103 66 100 64Z', '#dc2626', { line: '#7f1d1d', lw: 1 });
      s += `<path d="M95 56Q100 53.5 105 56Q104 63 100 67Q96 63 95 56Z" fill="${K.lin(['#fff3b0', '#f59e0b'])}" stroke="#7a3a08" stroke-width="1.5" stroke-linejoin="round"/>`;
      s += K.blush(89, 58, 3.4) + K.blush(111, 58, 3.4);
      s += K.spark(20, 100, 4, '#fff3b0', 'art-float') + K.spark(180, 100, 4, '#fff3b0', 'art-float') + K.spark(140, 30, 3, '#fde68a') + K.spark(60, 34, 2.6, '#ffe08a');
      return s;
    },

    // Цилинь: добрый зверь на облачке — нефритовое тело в золотой чешуе, оленьи рога, грива и хвост языками пламени,
    // огоньки на локтях, кудрявая бородка; под копытами цветы и травинки стоят не согнувшись
    cn_qilin(K) {
      const sc = { c1: '#b6f5d8', c2: '#0f8a64', rim: '#fde68a', rimK: 0.6, line: '#064e3b', texK: 0.2 };
      let s = K.aura('#84cc16', 96, 104, 0.4);
      // хвост-пламя
      const tl = 'M138 142C164 140 176 120 168 104';
      s += K.line(tl, '#064e3b', 9) + K.line(tl, '#34d399', 5) + K.g(K.flame(168, 108, 28, 20, '#fde68a', '#10b981', { style: 'animation-delay:-.4s' }), 'rotate(10 168 104)');
      // облачко, травинки и цветы
      s += cloud(K, 100, 172, 2, { c1: '#ffffff', c2: '#d9f99d', line: '#3f6212' });
      s += K.line('M40 166v-10M44 166l3-8M160 166v-10M156 166l-3-8', '#4d7c0f', 2);
      const fl = (x, y, c) => `<g fill="${c}" stroke="${K.shade(c, -0.5)}" stroke-width=".8">${[0, 72, 144, 216, 288].map(a => `<circle cx="${r1(x + 3 * Math.cos(a * Math.PI / 180))}" cy="${r1(y + 3 * Math.sin(a * Math.PI / 180))}" r="2.4"/>`).join('')}</g><circle cx="${x}" cy="${y}" r="1.4" fill="#fde68a"/>`;
      s += fl(40, 154, '#f9a8d4') + fl(160, 154, '#fde047');
      // огоньки на локтях
      s += K.mirror(K.g(K.flame(66, 146, 24, 14, '#fde68a', '#10b981', { style: 'animation-delay:-.7s' }), 'rotate(-110 66 146)'));
      // тело с золотой чешуёй
      s += K.vol('M100 94C132 94 150 116 150 140C150 156 136 162 100 162C64 162 50 156 50 140C50 116 68 94 100 94Z', sc);
      s += K.line(scaleRow(64, 136, 124, 12) + scaleRow(58, 142, 136, 12) + scaleRow(62, 138, 148, 12), '#fbbf24', 1.6, { op: 0.8 });
      s += K.part('M84 104H116C116 122 110 134 100 140C90 134 84 122 84 104Z', '#fef3c7', { line: '#b45309', lw: 1.4 }) + K.line('M86 114H114M88 124H112M92 133H108', '#d97706', 1.2, { op: 0.8 });
      // ноги с копытцами
      s += K.mirror(K.vol('M70 136C68 148 68 158 70 166H90C92 158 92 148 90 138Z', sc) + K.part('M68 164H92L94 176H66Z', '#92400e', { line: '#451a03', lw: 1.6 }) + K.line('M80 166V176', '#451a03', 1.4));
      // грива-пламя
      [-170, -140, -110, -70, -40, -10].forEach((a, i) => { const t = a * Math.PI / 180, x = r1(100 + 44 * Math.cos(t)), y = r1(78 + 40 * Math.sin(t)); s += K.g(K.flame(x, y + 12, 30, 22, i % 2 ? '#fde68a' : '#a7f3d0', i % 2 ? '#f59e0b' : '#10b981', { style: `animation-delay:-${(i * 0.35).toFixed(2)}s` }), `rotate(${a + 90} ${x} ${y})`); });
      // оленьи рога
      const ant = 'M86 48C80 34 72 24 62 14M74 30C68 28 62 30 58 34M80 40C74 40 70 44 68 48M66 20C64 14 64 8 66 4';
      s += K.mirror(K.line(ant, '#78350f', 6) + K.line(ant, '#fbbf24', 3));
      // голова
      s += K.vol('M100 44C122 44 134 58 134 74C134 84 138 92 134 100C128 110 114 112 100 112C86 112 72 110 66 100C62 92 66 84 66 74C66 58 78 44 100 44Z', sc);
      s += K.part('M100 86C116 86 130 91 134 99C130 108 116 112 100 112C84 112 70 108 66 99C70 91 84 86 100 86Z', '#e7fbe9', { line: '#0f766e', lw: 1.2 });
      s += `<ellipse cx="92" cy="92" rx="2.4" ry="1.6" fill="#064e3b"/><ellipse cx="108" cy="92" rx="2.4" ry="1.6" fill="#064e3b"/>`;
      s += `<circle cx="100" cy="56" r="4" fill="${K.rad([[0, '#fffbe6'], [1, '#f59e0b']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.2"/>`;
      s += K.gloss(80, 58, 7, 4, -35, 0.4);
      s += K.mirror(K.line('M72 98C62 100 56 96 52 90', '#fbbf24', 2));
      s += K.eyes(100, 72, 15, 9, { iris: '#0f766e', look: [0.1, 0.3] });
      s += K.blush(76, 86, 5) + K.blush(124, 86, 5);
      s += K.mouth('smile', 100, 101, 14);
      s += curl(K, 94, 116, 5, '#34d399', '#064e3b') + curl(K, 106, 116, 5, '#34d399', '#064e3b');
      s += K.spark(24, 60, 3, '#e4ffb0', 'art-float') + K.spark(176, 60, 3, '#fde68a') + K.spark(180, 170, 2.4, '#e4ffb0') + K.spark(20, 120, 2.4, '#fde68a');
      return s;
    },

    // Белый тигр (Байху): страж Запада, повелитель металла — белоснежный тигр с чёрными полосами, на лбу знак-полосы «ван»,
    // ледяные голубые глаза, рычит; шерсть на макушке встала дыбом, вокруг трещат молнии
    cn_baihu(K) {
      const fur = { c1: '#ffffff', c2: '#a9b6ca', rim: '#bae6fd', rimK: 0.75, line: '#1e293b', texK: 0.22 }, st = '#1e293b';
      let s = K.aura('#facc15', 96, 106, 0.32) + K.aura('#38bdf8', 70, 90, 0.25);
      // хвост в полоску
      const tl = 'M140 170C168 176 186 160 180 136C176 122 182 110 190 104';
      s += K.line(tl, st, 12) + K.line(tl, '#f1f5f9', 8) + `<path d="${tl}" fill="none" stroke="${st}" stroke-width="8" stroke-dasharray="4 7"/>`;
      // тело сидя и задние лапы
      s += K.vol('M100 108C132 108 150 132 150 154C150 172 134 179 100 179C66 179 50 172 50 154C50 132 68 108 100 108Z', fur);
      s += K.mirror(K.vol(K.ell(62, 166, 15, 12), { ...fur, lw: 2.4 }) + K.part('M52 136C60 134 66 138 70 144C62 142 56 142 52 146Z', st, { lw: 0 }) + K.part('M50 152C58 150 62 154 64 158C58 157 54 157 50 160Z', st, { lw: 0 }));
      // передние лапы в полосках
      s += K.mirror(K.vol('M76 124C74 142 74 160 74 170C74 177 80 180 88 180C95 180 98 177 98 170C98 156 97 140 96 126Z', fur) + K.line('M76 140l8 2M76 152l9 1', st, 3) + K.line('M80 175v4M86 174v5M92 175v4', st, 1.3, { op: 0.7 }));
      // уши
      s += K.mirror(K.vol(K.ell(62, 50, 14, 13), fur) + `<ellipse cx="62" cy="52" rx="7" ry="7" fill="#fbcfe8" stroke="${st}" stroke-width="1.4"/>`);
      // шерсть дыбом по бокам
      s += K.mirror(K.part('M54 84C40 86 34 98 38 110C42 106 46 108 48 112C46 104 48 96 56 92Z', '#ffffff', { line: st, lw: 1.8 }));
      // голова
      s += K.vol('M100 40C130 40 148 58 150 80C152 96 144 108 134 116C122 124 78 124 66 116C56 108 48 96 50 80C52 58 70 40 100 40Z', fur);
      s += K.line('M84 42l4-9l4 8M96 40l4-10l4 10M108 41l4-9l4 9', '#ffffff', 2.6) + K.line('M84 42l4-9l4 8M96 40l4-10l4 10M108 41l4-9l4 9', st, 1, { op: 0.5 });
      // знак-полосы на лбу и полосы по щекам
      s += K.line('M88 50H112M90 57H110M92 64H108M100 50V64', st, 3.2);
      s += K.mirror(K.part('M52 76C60 74 66 78 70 84C62 82 56 82 52 86Z', st, { lw: 0 }) + K.part('M56 64C62 64 66 66 68 70C62 70 58 70 54 72Z', st, { lw: 0 }) + K.part('M58 100C64 98 70 100 72 104C66 104 62 104 58 106Z', st, { lw: 0 }));
      s += K.gloss(76, 56, 8, 4.5, -35, 0.45);
      // ледяные глаза
      s += K.eyes(100, 78, 19, 9.5, { iris: '#38bdf8', lid: 'angry', skin: '#cbd5e1', look: [0, 0.2] });
      // морда: пушистые подушечки, розовый нос, рык
      s += K.mirror(`<circle cx="90" cy="100" r="11" fill="${K.lin(['#ffffff', '#e2e8f0'])}" stroke="#64748b" stroke-width="1.4"/><circle cx="86" cy="99" r="1" fill="${st}"/><circle cx="90" cy="103" r="1" fill="${st}"/><circle cx="84" cy="104" r="1" fill="${st}"/>`);
      s += `<path d="M93 88H107L100 96Z" fill="#f9a8d4" stroke="#9d174d" stroke-width="1.4" stroke-linejoin="round"/>`;
      s += `<path d="M88 108Q100 104 112 108Q110 121 100 122Q90 121 88 108Z" fill="#6b1d2a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="100" cy="117" rx="5" ry="3" fill="#f47a8f"/>`;
      s += `<path d="M90.5 108.5l2 6l2-6.4ZM109.5 108.5l-2 6l-2-6.4Z" fill="#fff"/>`;
      s += K.mirror(K.line('M78 102L58 98M78 107L60 110', '#64748b', 1.2, { op: 0.7 }));
      // молнии
      s += zap(K, 30, 66, 1.3, -30, '#7dd3fc') + zap(K, 162, 50, 1.3, 20, '#fde047', 0.5) + zap(K, 24, 130, 1.1, 10, '#fde047', 0.9) + zap(K, 168, 124, 1.1, -20, '#7dd3fc', 1.3);
      s += K.spark(40, 30, 3, '#e0f2fe') + K.spark(176, 90, 2.6, '#fef08a', 'art-float');
      return s;
    },

    // Чанъэ: лунная дева на облаке перед полной Луной — белое с лиловым ханьфу, широкие рукава, пояс с лентами,
    // над плечами парит шёлковый шарф-пибо; высокая причёска со шпильками-подвесками, на руках — нефритовый зайчик
    cn_change(K) {
      const skin = '#fde8d8', robe = { c1: '#ffffff', c2: '#c4b5fd', rim: '#fde68a', rimK: 0.6, line: '#4c1d95', texK: 0.35 };
      let s = `<circle class="art-aura" cx="100" cy="70" r="86" fill="${K.rad([[0.5, '#fde68a', 0.35], [1, '#c084fc', 0]])}"/>`;
      s += `<circle cx="100" cy="70" r="58" fill="${K.rad([[0, '#fffbeb'], [0.8, '#fef3c7'], [1, '#fde68a']])}" stroke="#eab308" stroke-width="1.4"/>`;
      s += `<circle cx="72" cy="50" r="8" fill="#fde68a" opacity=".6"/><circle cx="136" cy="92" r="10" fill="#fde68a" opacity=".5"/><circle cx="130" cy="40" r="5" fill="#fde68a" opacity=".6"/>`;
      // облако
      s += cloud(K, 100, 172, 2.1, { c1: '#ffffff', c2: '#ddd6fe', line: '#6d28d9' });
      // шарф-пибо: дуга за спиной и свободные концы
      const pibo = 'M60 116C30 108 18 80 34 56C46 38 70 30 100 30C130 30 154 38 166 56C182 80 170 108 140 116';
      const ends = 'M60 116C44 130 38 150 20 158C28 164 34 170 30 180M140 116C156 130 162 150 180 158C172 164 166 170 170 180';
      s += K.g(K.line(pibo, '#9d174d', 7.4) + K.line(pibo, '#f9a8d4', 4.6) + K.line(pibo, '#fff', 1.2, { op: 0.6 }), '', 'art-float');
      s += K.g(K.line(ends, '#9d174d', 7.4) + K.line(ends, '#f9a8d4', 4.6) + K.line(ends, '#fff', 1.2, { op: 0.6 }), '', 'art-float" style="animation-delay:-1s');
      // волосы сзади
      s += K.part('M78 58C72 80 70 104 76 122C84 118 90 110 92 100H108C110 110 116 118 124 122C130 104 128 80 122 58Z', '#231a3a', { line: '#0f0a1e', lw: 1.6 });
      // платье
      s += K.vol('M100 88C114 88 122 96 126 108C134 132 144 152 156 168C136 178 64 178 44 168C56 152 66 132 74 108C78 96 86 88 100 88Z', robe);
      s += K.line('M84 120C80 140 72 156 64 170M116 120C120 140 128 156 136 170', '#a78bfa', 1.4, { op: 0.8 });
      s += K.stitch('M46 167Q100 180 154 167', '#fbbf24', 2);
      s += K.part('M88 90Q100 100 112 90L110 96Q100 104 90 96Z', '#7c3aed', { line: '#4c1d95', lw: 1.2 });
      // пояс с лентами
      s += K.line('M76 116Q100 124 124 116', '#7c3aed', 7) + K.stitch('M76 116Q100 124 124 116', '#fde68a', 1.6);
      s += K.g(K.line('M97 122C95 140 90 156 88 172M103 122C107 140 112 156 114 172', '#f472b6', 3), '', 'art-sway');
      // рукава
      s += K.mirror(K.vol('M78 98C64 104 56 118 54 136C58 148 70 152 80 146C82 134 86 120 92 110Z', robe) + K.stitch('M56 138C62 146 72 148 80 144', '#fbbf24', 1.6));
      // нефритовый зайчик на руках
      s += K.vol('M92 106C88 100 86 94 88 90C92 90 95 98 96 104Z', { c1: '#ffffff', c2: '#a7f3d0', line: '#1f5a3e', lw: 1.4, tex: false }) + K.vol('M108 106C112 100 114 94 112 90C108 90 105 98 104 104Z', { c1: '#ffffff', c2: '#a7f3d0', line: '#1f5a3e', lw: 1.4, tex: false });
      s += K.vol(K.ell(100, 126, 16, 12), { c1: '#ffffff', c2: '#a7f3d0', line: '#1f5a3e', lw: 1.8, tex: false }) + K.vol(K.ell(100, 110, 11, 9.5), { c1: '#ffffff', c2: '#a7f3d0', line: '#1f5a3e', lw: 1.8, tex: false });
      s += `<circle cx="96" cy="109" r="1.8" fill="#e11d48"/><circle cx="104" cy="109" r="1.8" fill="#e11d48"/><path d="M98.6 113h2.8l-1.4 1.6z" fill="#f472b6"/>`;
      s += K.part(K.ell(84, 130, 6.5, 5.5), skin, { line: '#9a6a4a', lw: 1.4 }) + K.part(K.ell(116, 130, 6.5, 5.5), skin, { line: '#9a6a4a', lw: 1.4 });
      // лицо
      s += K.vol(K.ell(100, 66, 17.5, 19), { c1: skin, c2: '#eab89a', rim: '#fff3d6', tex: false, hiK: 0.18, lw: 2.2, line: '#8a5a3a' });
      // причёска: чёлка, высокий пучок, шпильки с подвесками, цветок
      s += K.part('M82.5 66C80 50 90 44 100 44C110 44 120 50 117.5 66C114 58 108 54 100 54C92 54 86 58 82.5 66Z', '#231a3a', { line: '#0f0a1e', lw: 1.4 });
      s += K.mirror(K.vol(K.ell(82, 40, 8, 8), { c1: '#3a2d58', c2: '#0f0a1e', rim: '#c4b5fd', rimK: 0.4, line: '#0f0a1e', lw: 1.6, tex: false }));
      s += K.vol('M90 46C86 36 90 24 100 20C110 24 114 36 110 46Z', { c1: '#3a2d58', c2: '#0f0a1e', rim: '#c4b5fd', rimK: 0.4, line: '#0f0a1e', lw: 1.8, tex: false });
      s += K.line('M92 30Q100 26 108 30', '#6d5a96', 1.4, { op: 0.8 });
      s += K.line('M110 34L128 26', '#fbbf24', 2.4) + K.line('M124 28V38M120 30V42', '#fbbf24', 1) + `<circle cx="124" cy="40" r="2" fill="#fff8e6" stroke="#b45309" stroke-width=".8"/><circle cx="120" cy="44" r="2" fill="#f9a8d4" stroke="#9d174d" stroke-width=".8"/><circle cx="128" cy="26" r="2.6" fill="#f472b6" stroke="#9d174d" stroke-width="1"/>`;
      s += K.line('M90 34L74 28', '#fbbf24', 2.4) + `<circle cx="74" cy="28" r="2.6" fill="#fde047" stroke="#a16207" stroke-width="1"/>`;
      s += `<g fill="#f9a8d4" stroke="#9d174d" stroke-width=".8"><circle cx="84" cy="48" r="2.6"/><circle cx="88" cy="46" r="2.6"/><circle cx="86" cy="51" r="2.6"/></g><circle cx="86" cy="48.5" r="1.4" fill="#fde047"/>`;
      s += `<path d="M100 56l1.6 2.4l-1.6 2.4l-1.6-2.4z" fill="#e11d48"/>`;
      // спокойное лицо
      s += K.eyes(100, 69, 7.5, 4.8, { iris: '#6d28d9', lid: 'half', skin, lash: true, look: [0, 0.3] });
      s += K.blush(88, 77, 3.6) + K.blush(112, 77, 3.6);
      s += `<path d="M97 79Q100 81.5 103 79Q100 78 97 79Z" fill="#e11d48" stroke="#9f1239" stroke-width="1"/>`;
      s += K.spark(24, 24, 3.4, '#fffbe6', 'art-float') + K.spark(178, 30, 3, '#e9d5ff') + K.spark(20, 120, 2.6, '#e9d5ff') + K.spark(182, 126, 2.6, '#fffbe6', 'art-float');
      return s;
    },

    // Хоу И: великий лучник в красно-золотом доспехе натянул алый лук и целится в последнее, десятое солнце;
    // один глаз зажмурен, другой сердито щурится. Чёрный узел волос с красной повязкой, усы, колчан со стрелами за спиной
    cn_houyi(K) {
      const skin = '#f2c49a', armor = { c1: '#f87171', c2: '#7f1d1d', rim: '#fde68a', rimK: 0.6, line: '#450a0a', texK: 0.25 };
      let s = K.aura('#ff7a1a', 96, 110, 0.4);
      // солнце
      let rays = '';
      for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180; rays += `M${r1(174 + 20 * Math.cos(a - 0.12))} ${r1(24 + 20 * Math.sin(a - 0.12))}L${r1(174 + 30 * Math.cos(a))} ${r1(24 + 30 * Math.sin(a))}L${r1(174 + 20 * Math.cos(a + 0.12))} ${r1(24 + 20 * Math.sin(a + 0.12))}Z`; }
      s += `<g class="art-spin-soft"><path d="${rays}" fill="#fde68a" stroke="#d97706" stroke-width="1"/></g><circle cx="174" cy="24" r="19" fill="${K.rad([[0, '#fffbe6'], [0.7, '#fde047'], [1, '#f59e0b']])}" stroke="#d97706" stroke-width="1.6"/>`;
      // колчан за спиной
      s += K.g(K.part('M52 56H68V112H52Z', '#92400e', { line: '#451a03', lw: 1.6 }) + K.line('M52 64H68M52 104H68', '#fbbf24', 2) +
        K.line('M56 56V40M60 56V36M64 56V42', '#78350f', 1.6) + `<path d="M53 40l3-8l3 8zM57 36l3-8l3 8zM61 42l3-8l3 8z" fill="#fef3c7" stroke="#b45309" stroke-width=".8"/>`, 'rotate(-24 60 84)');
      // ноги и сапоги: широкая стойка
      s += K.mirror(K.vol('M78 140C74 152 70 160 66 168H88C90 160 92 150 94 142Z', { c1: '#64748b', c2: '#1e293b', line: '#0f172a', tex: false }) + K.part('M62 166H90L92 178H58Z', '#1f2937', { line: '#0b0f19', lw: 1.6 }));
      // юбка-доспех
      s += K.vol('M66 130H134L144 160C130 166 70 166 56 160Z', armor);
      s += K.line('M62 142H138M60 152H140', '#fbbf24', 1.4, { op: 0.8 }) + K.line('M80 132V162M100 132V164M120 132V162', '#450a0a', 1.2, { op: 0.5 });
      // торс
      s += K.vol('M100 84C124 84 138 94 140 110L136 136H64L60 110C62 94 76 84 100 84Z', armor);
      s += K.line('M64 134H136', '#fbbf24', 5) + K.rhomb(100, 134, 4, '#ef4444', '#450a0a');
      s += `<circle cx="100" cy="110" r="11" fill="${K.rad([[0, '#fffbe6'], [0.6, '#fbbf24'], [1, '#b45309']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.8"/><circle cx="100" cy="110" r="6" fill="none" stroke="#b45309" stroke-width="1.2"/>`;
      s += K.mirror(K.part('M66 88C72 84 80 84 84 88L80 98C74 98 68 96 66 88Z', '#fbbf24', { line: '#78350f', lw: 1.4 }));
      // левая рука (к зрителю справа) держит лук
      s += K.vol('M122 90C132 80 142 70 150 60C154 56 160 58 160 62C154 74 144 86 132 100Z', armor);
      // лук, тетива, стрела
      const bow = 'M125 18Q168 50 168 103';
      s += K.line(bow, '#450a0a', 6.4) + K.line(bow, '#dc2626', 3.8) + K.line('M152 48Q158 54 160 60', '#fbbf24', 4.4);
      s += K.line('M125 18L88 90L168 103', '#fef3c7', 1.3);
      s += K.line('M80 94L180 43', '#78350f', 2.6) + `<path d="M186 40L176 42L179 48Z" fill="#e2e8f0" stroke="#334155" stroke-width="1.2" stroke-linejoin="round"/>` + `<path d="M80 94l-6-4l10-1zM80 94l-3 6l8-5z" fill="#fef3c7" stroke="#b45309" stroke-width=".8"/>`;
      s += K.part(K.ell(157, 56, 6, 6), skin, { line: '#8a5a3a', lw: 1.6 });
      // правая рука натягивает тетиву
      s += K.vol('M72 92C60 90 48 94 44 102C46 108 54 110 62 106C66 104 70 102 76 102Z', armor);
      s += K.vol('M46 104C54 108 70 100 84 94C88 90 86 86 82 86C70 90 56 94 48 98Z', { c1: skin, c2: '#c98a5e', rim: '#fff3d6', line: '#8a5a3a', tex: false, lw: 2 });
      s += K.part(K.ell(88, 90, 6, 5.5), skin, { line: '#8a5a3a', lw: 1.6 });
      // голова
      s += K.vol(K.ell(100, 64, 17, 18.5), { c1: skin, c2: '#d9a070', rim: '#fff3d6', tex: false, lw: 2.2, line: '#7a4a2a' });
      s += K.part('M83 60C82 44 90 38 100 38C110 38 118 44 117 60C110 52 90 52 83 60Z', '#1f1a24', { line: '#0b0a10', lw: 1.4 });
      s += K.vol(K.ell(100, 32, 7, 6.5), { c1: '#3a3344', c2: '#0b0a10', line: '#0b0a10', lw: 1.6, tex: false }) + K.line('M90 30L110 34', '#fbbf24', 2);
      s += K.line('M83 55Q100 48 117 55', '#dc2626', 4) + K.g(K.line('M84 55C74 56 66 52 58 58M84 56C76 60 70 60 64 66', '#dc2626', 2.6), '', 'art-sway');
      // прицел: левый глаз зажмурен, правый щурится
      s += K.line('M88 64Q93 66 98 63', INK, 2.4) + K.line('M87 58L98 60', INK, 2.4);
      s += K.eye(109, 64, 5, { iris: '#78350f', lid: 'sad', skin, look: [0.8, -0.4] });
      s += K.part('M90 76C94 72 98 73 100 75C102 73 106 72 110 76C106 76 102 78 100 77C98 78 94 76 90 76Z', '#1f1a24', { lw: 0 });
      s += K.line('M95 80H105', INK, 2) + K.part('M94 82Q100 90 106 82Q100 85 94 82Z', '#1f1a24', { lw: 0 });
      s += K.spark(24, 30, 3, '#fff3b0') + K.spark(180, 76, 3, '#ffe08a', 'art-float') + K.spark(20, 140, 2.6, '#ffd23f') + K.spark(184, 150, 2.4, '#fff3b0');
      return s;
    },

    // Цинлун (легенда): Лазурный дракон Востока вьётся в облаках — бирюзовое тело кольцами с золотым брюхом и огненными
    // плавниками, ветвистые золотые рога, пышная грива, длинные усы; тянется лапами к пылающей жемчужине, вокруг — дождь
    cn_qinglong(K) {
      const az = { c1: '#a5f3fc', c2: '#0f766e', rim: '#e0f2fe', rimK: 0.7, line: '#042f2e', texK: 0.22 };
      let s = K.aura('#38bdf8', 100, 100, 0.45) + K.aura('#5eead4', 64, 80, 0.3);
      s += K.line('M20 20l-3 9M44 8l-3 9M150 8l-3 9M188 50l-3 9M12 96l-3 9M190 96l-3 9M30 130l-3 9', '#bae6fd', 1.8, { op: 0.6, cls: 'art-blink' });
      // пылающая жемчужина
      s += K.flame(174, 38, 38, 28, '#fff3b0', '#f97316') + pearl(K, 174, 26, 9, '#fde047', '');
      // тело кольцами: из-за головы — вправо, вниз, по земле влево и вверх к хвосту
      const body = 'M116 92C158 86 190 106 180 134C170 158 130 150 100 160C70 170 30 170 22 146C16 128 26 110 40 104';
      s += cloud(K, 150, 178, 1, { c1: '#ffffff', c2: '#bae6fd', line: '#0369a1', op: 0.9 });
      s += K.line(body, '#042f2e', 30) + K.line(body, K.lin(['#99f6e4', '#14b8a6', '#0f766e']), 24);
      s += `<path d="${body}" fill="none" stroke="#0f766e" stroke-width="20" stroke-dasharray="2 6" opacity=".35"/>`;
      s += K.line(body, '#fde68a', 9) + `<path d="${body}" fill="none" stroke="#b45309" stroke-width="9" stroke-dasharray="1.4 5" opacity=".7"/>`;
      // огненные плавники по спине
      const fin = (x, y, r) => K.g(K.part('M0 0C-2-9 3-16 10-18C8-11 10-5 14 0Z', '#f97316', { line: '#7c2d12', lw: 1.4 }), `translate(${x} ${y}) rotate(${r})`);
      s += fin(146, 76, 0) + fin(180, 96, 50) + fin(194, 128, 100) + fin(150, 162, 170) + fin(96, 176, 180) + fin(50, 178, 200) + fin(8, 144, 260) + fin(22, 110, 300);
      // хвост-кисть
      s += K.g(K.flame(40, 106, 30, 20, '#ccfbf1', '#14b8a6', { style: 'animation-delay:-.6s' }), 'rotate(40 40 104)');
      // облака, сквозь которые вьётся дракон
      s += cloud(K, 176, 140, 0.9, { c1: '#ffffff', c2: '#bae6fd', line: '#0369a1', cls: 'art-float' }) + cloud(K, 40, 160, 0.9, { c1: '#ffffff', c2: '#bae6fd', line: '#0369a1', flip: true, cls: 'art-float', d: 1.2 });
      // передние лапы с когтями
      s += K.mirror(K.vol('M76 102C64 106 54 114 50 124C54 130 62 130 66 124C68 118 74 114 82 110Z', { ...az, lw: 2.2 }) + `<path d="M50 122l-6 2l6 2M52 127l-3 6l6-3M58 129l1 6l3-5" fill="#fff" stroke="#042f2e" stroke-width="1" stroke-linejoin="round"/>`);
      // грива
      s += K.mirror(K.part('M66 50C48 40 36 48 24 38C28 54 36 62 48 64C36 68 30 78 20 80C34 88 50 84 62 78Z', '#0ea5e9', { line: '#0c4a6e', lw: 1.8 }) +
        K.part('M64 58C54 54 48 58 40 54C44 62 50 66 58 66C52 70 48 74 42 76C50 80 58 78 64 74Z', '#5eead4', { line: '#0f766e', lw: 1.2 }));
      // ветвистые рога
      const ant = 'M84 36C78 24 72 14 62 6M74 22C68 18 62 18 56 20M80 30C72 30 66 32 62 36';
      s += K.mirror(K.line(ant, '#78350f', 6.4) + K.line(ant, '#fcd34d', 3.4));
      // голова
      s += K.vol('M100 32C120 32 132 44 134 58C142 62 146 72 142 82C138 92 124 96 100 96C76 96 62 92 58 82C54 72 58 62 66 58C68 44 80 32 100 32Z', az);
      s += K.part('M100 70C118 70 134 74 138 82C134 90 120 94 100 94C80 94 66 90 62 82C66 74 82 70 100 70Z', '#ccfbf1', { line: '#0f766e', lw: 1.2 });
      s += `<ellipse cx="88" cy="75" rx="3" ry="2" fill="#042f2e"/><ellipse cx="112" cy="75" rx="3" ry="2" fill="#042f2e"/>`;
      s += `<circle cx="100" cy="42" r="3.6" fill="${K.rad([[0, '#fffbe6'], [1, '#f59e0b']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1"/>`;
      s += K.gloss(84, 44, 7, 4, -35, 0.45);
      // усы
      const wh = 'M66 84C44 92 30 76 16 86C8 92 12 104 22 100';
      s += K.mirror(K.line(wh, '#042f2e', 3.6) + K.line(wh, '#fde68a', 1.8));
      s += K.part('M92 96C94 106 98 110 100 114C102 110 106 106 108 96Z', '#5eead4', { line: '#0f766e', lw: 1.2 });
      s += K.eyes(100, 56, 15, 9, { iris: '#f59e0b', lid: 'angry', skin: '#2dd4bf', look: [-0.2, 0.1] });
      s += `<path d="M82 84Q100 80 118 84Q114 96 100 97Q86 96 82 84Z" fill="#6b1d2a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="100" cy="92" rx="6" ry="3" fill="#f47a8f"/>`;
      s += `<path d="M85 84.4l2.4 5.6l2.4-6.2ZM115 84.4l-2.4 5.6l-2.4-6.2Z" fill="#fff"/>`;
      s += K.spark(60, 16, 3, '#e0f2fe', 'art-float') + K.spark(180, 20, 3.4, '#fde68a') + K.spark(18, 150, 2.6, '#e0f2fe');
      return s;
    },

    // Сунь Укун (легенда): Царь обезьян стоит на золотом облаке-кувырке — золотой доспех, красный шарф, юбка из тигровой
    // шкуры; в руке посох Цзиньгубан (красный с золотыми концами), другой ладонью прикрыл глаза козырьком и высматривает
    // даль огненно-золотыми глазами. На голове — золотой обруч и два длинных фазаньих пера
    cn_wukong(K) {
      const furC = { c1: '#fcd9a0', c2: '#b8741a', rim: '#fff3b0', rimK: 0.6, line: '#5a2d06', texK: 0.2 };
      const armor = { c1: '#fff1a8', c2: '#c08a1a', rim: '#ffffff', rimK: 0.6, line: '#5a3208', texK: 0.2 }, face = '#fde2c4';
      let s = K.aura('#fbbf24', 100, 100, 0.5) + K.aura('#a5b4fc', 70, 150, 0.3);
      // облако-кувырок с вихревым следом
      s += K.line('M72 178C46 184 22 172 10 154C4 144 12 136 18 142', '#fde68a', 5, { op: 0.7, cls: 'art-float' }) + K.line('M60 170C40 172 26 164 20 156', '#fff7d6', 2.6, { op: 0.7 });
      s += cloud(K, 104, 170, 1.9, { c1: '#fffbeb', c2: '#fcd34d', line: '#b45309' });
      // хвост
      const tl = 'M122 146C150 150 162 128 152 112C146 102 152 94 160 96';
      s += K.line(tl, '#5a2d06', 8) + K.line(tl, '#d9963a', 4.5);
      // посох: красный с золотыми концами
      s += K.line('M24 172L72 18', '#450a0a', 7.4) + K.line('M24 172L72 18', '#dc2626', 5) + K.line('M26 168L70 22', '#fca5a5', 1.4, { op: 0.6 });
      s += K.line('M24 172L30 152M66 38L72 18', '#78350f', 7.4) + K.line('M24 172L30 152M66 38L72 18', '#fcd34d', 5) + K.line('M26 164L28 158M68 30L70 24', '#fffbe6', 1.4);
      // ноги и сапоги
      s += K.mirror(K.vol('M80 142C78 150 78 158 80 164H96C98 158 98 150 96 144Z', { c1: '#fde68a', c2: '#b45309', line: '#5a3208', tex: false }) + K.part('M76 162H98L100 172H72Z', '#1f2937', { line: '#0b0f19', lw: 1.6 }));
      // юбка из тигровой шкуры
      s += K.vol('M66 124H134L142 150C126 158 74 158 58 150Z', { c1: '#fdba74', c2: '#c2410c', rim: '#fff3b0', line: '#5a2d06', tex: false });
      s += K.part('M74 128C78 136 76 144 70 150L66 146C72 140 72 134 70 128Z', '#3b1d10', { lw: 0 }) + K.part('M96 128C98 136 96 146 92 154L88 152C92 144 92 136 90 128Z', '#3b1d10', { lw: 0 }) +
        K.part('M118 128C120 136 118 146 114 154L110 152C114 144 114 136 112 128Z', '#3b1d10', { lw: 0 }) + K.part('M134 132C134 140 136 146 140 150L136 152C132 146 130 140 130 132Z', '#3b1d10', { lw: 0 });
      // торс в золотой кольчуге
      s += K.vol('M100 84C122 84 134 94 136 108L134 128H66L64 108C66 94 78 84 100 84Z', armor);
      s += K.line(scaleRow(72, 128, 100, 8) + scaleRow(70, 130, 110, 8.6) + scaleRow(70, 130, 120, 8.6), '#a16207', 1.2, { op: 0.75 });
      s += K.line('M66 126H134', '#dc2626', 5) + K.rhomb(100, 126, 4.4, '#34d399', '#064e3b');
      // красный шарф с развевающимися концами
      s += K.line('M76 92Q100 102 124 92', '#dc2626', 7);
      s += K.g(K.line('M120 96C136 100 150 92 166 100C158 104 154 110 160 116', '#dc2626', 5) + K.line('M120 96C136 100 150 92 166 100', '#fca5a5', 1.4, { op: 0.7 }), '', 'art-sway');
      // правая рука держит посох
      s += K.vol('M74 92C64 92 56 96 50 100C46 106 50 112 56 110C62 108 68 108 76 106Z', armor);
      s += K.vol(K.ell(47, 102, 7.5, 7), { ...furC, tex: false, lw: 2 });
      // голова
      s += K.mirror(K.vol(K.ell(58, 66, 9, 11), { ...furC, lw: 2 }) + `<ellipse cx="58" cy="67" rx="4.6" ry="6.6" fill="#f4a988" stroke="#5a2d06" stroke-width="1.2"/>`);
      s += K.vol('M100 30C126 30 142 46 142 66C142 86 126 98 100 98C74 98 58 86 58 66C58 46 74 30 100 30Z', furC);
      s += K.part('M100 54C106 46 120 46 124 58C128 72 118 88 100 92C82 88 72 72 76 58C80 46 94 46 100 54Z', face, { line: '#b8741a', lw: 1.4 });
      // золотой обруч и фазаньи перья
      const plume = 'M86 44C76 24 64 10 46 4C40 2 36 8 42 10';
      s += K.mirror(K.line(plume, '#5a1a06', 5) + K.line(plume, '#ea580c', 3.2) + `<path d="${plume}" fill="none" stroke="#fde68a" stroke-width="3.2" stroke-dasharray="2 5"/>`);
      s += K.line('M62 50Q100 36 138 50', '#78350f', 7) + K.line('M62 50Q100 36 138 50', '#fcd34d', 4.2) + K.rhomb(100, 43, 4, '#dc2626', '#78350f');
      // огненно-золотые глаза
      s += K.mirror(`<ellipse cx="89" cy="64" rx="10" ry="7" fill="#fb923c" opacity=".35"/>`);
      s += K.eyes(100, 64, 11, 7, { iris: '#f59e0b', lid: 'angry', skin: '#f6c89c', look: [0.5, -0.1] });
      s += `<circle cx="97" cy="76" r="1.4" fill="#5a2d06"/><circle cx="103" cy="76" r="1.4" fill="#5a2d06"/>`;
      s += K.mouth('grin', 100, 80, 18);
      s += K.blush(82, 76, 4) + K.blush(118, 76, 4);
      // левая ладонь козырьком у лба
      s += K.vol('M124 94C138 88 148 80 152 68C155 62 150 56 144 60C140 68 132 76 120 82Z', armor);
      s += K.vol('M148 66C144 58 136 54 126 52C122 52 120 58 124 60C132 62 138 66 142 70Z', { ...furC, tex: false, lw: 2 });
      s += K.vol(K.ell(124, 55, 8, 5.5, -10).d, { ...furC, tex: false, lw: 2, t: 'rotate(-10 124 55)' });
      s += K.line('M160 40q10-6 20 0M170 60q8-4 16 0M20 70q8-6 16 0', '#e0e7ff', 2, { op: 0.6, cls: 'art-float' });
      s += K.spark(24, 30, 3.4, '#fde68a', 'art-float') + K.spark(180, 84, 3, '#fffbe6') + K.spark(186, 150, 2.6, '#fde68a') + K.spark(40, 110, 2.4, '#fffbe6');
      return s;
    },
  });

  // ===== расширение до 63 видов: новые семьи, третьи стадии, одиночные духи и легенды =====
  Object.assign(SPIRIT_ART, {
    // Чжулун: Свечной дракон с края света — красное тело, как праздничный фонарь-дракон: золотые рёбрышки, кисточки
    // и золотой колпачок (как у Фонарика), внутри кольца — тёплый свет; огненная грива и язычки-плавники, ветвистые рога,
    // лицо почти человечье — с бровями и бородкой; в поднятой лапе горит свеча, глаза сияют, как утро. Слева ночь, справа день
    cn_zhulong(K) {
      const red = { c1: '#ff9a8a', c2: '#b91c1c', rim: '#ffe29a', rimK: 0.75, line: '#4c0808', texK: 0.22 };
      let s = K.aura('#ff7a1a', 100, 104, 0.42) + `<ellipse class="art-aura" cx="104" cy="134" rx="62" ry="28" fill="${K.rad([[0, '#fffbe6', 0.95], [0.45, '#fde047', 0.6], [1, '#fb923c', 0]])}"/>`;
      // ночь слева, день справа
      s += crescent(K, 24, 30, 12, { c: '#e9d5ff', line: '#6d28d9' }) + K.spark(46, 16, 2.6, '#e9d5ff') + K.spark(14, 58, 2.2, '#ffffff', 'art-float');
      s += sunDisc(K, 178, 26, 10);
      // язычки пламени по спине и на кончике хвоста
      const fin = (x, y, r, i) => K.g(K.flame(x, y, 22, 14, '#fff3b0', i % 2 ? '#f97316' : '#ef4444', { style: `animation-delay:-${(i * 0.3).toFixed(1)}s` }), `rotate(${r} ${x} ${y})`);
      s += fin(140, 88, -6, 0) + fin(166, 102, 40, 1) + fin(184, 126, 80, 2) + fin(22, 136, -92, 3);
      s += K.g(K.flame(38, 112, 30, 20, '#fff3b0', '#f97316', { style: 'animation-delay:-.5s' }), 'rotate(42 38 108)');
      // тело-фонарь кольцом: от шеи вправо, вниз, по земле влево и вверх к хвосту
      const body = 'M114 92C152 96 182 116 174 142C166 166 130 168 100 162C72 156 46 166 34 148C26 134 28 118 38 108';
      s += K.line(body, '#4c0808', 31) + K.line(body, K.lin(['#ff8a7a', '#dc2626', '#991b1b']), 25);
      s += K.line(body, '#fde68a', 10, { op: 0.42 });
      s += `<path d="${body}" fill="none" stroke="#78350f" stroke-width="25" stroke-dasharray="4.4 8"/><path d="${body}" fill="none" stroke="#fbbf24" stroke-width="25" stroke-dasharray="2.4 10" stroke-dashoffset="-1"/>`;
      s += K.g(K.part('M-14 -4.5H14V4.5H-14Z', '#fbbf24', { line: '#78350f', lw: 1.4 }), 'translate(37 110) rotate(45)');
      s += tassel(K, 158, 160, 16, '#dc2626', 0.3) + tassel(K, 50, 162, 15, '#dc2626', 1.1);
      // левая передняя лапа с коготками
      s += K.vol('M78 104C66 108 56 116 52 126C56 132 64 132 68 126C70 120 76 116 84 112Z', { ...red, lw: 2.2, tex: false }) +
        `<path d="M52 124l-6 2l6 2M54 129l-3 6l6-3M60 131l1 6l3-5" fill="#fff" stroke="#4c0808" stroke-width="1" stroke-linejoin="round"/>`;
      // огненная грива
      [-168, -140, -112, -68, -40, -12].forEach((a, i) => {
        const t = a * Math.PI / 180, x = r1(100 + 40 * Math.cos(t)), y = r1(66 + 36 * Math.sin(t));
        s += K.g(K.flame(x, y + 12, 28, 20, '#fff3b0', i % 2 ? '#f97316' : '#ef4444', { style: `animation-delay:-${(i * 0.35).toFixed(2)}s` }), `rotate(${a + 90} ${x} ${y})`);
      });
      // ветвистые рога
      const ant = 'M86 40C80 28 74 18 64 10M76 26C70 22 64 22 58 24M82 34C74 34 68 36 64 40';
      s += K.mirror(K.line(ant, '#78350f', 6.4) + K.line(ant, '#fcd34d', 3.4));
      // голова: почти человечье лицо — брови, бородка
      s += K.vol('M100 30C124 30 140 44 140 64C140 82 128 96 100 96C72 96 60 82 60 64C60 44 76 30 100 30Z', red);
      s += K.part('M100 70C116 70 130 76 132 84C128 94 116 98 100 98C84 98 72 94 68 84C70 76 84 70 100 70Z', '#ffd5c2', { line: '#9a3412', lw: 1.2 });
      s += K.part('M88 96C88 108 94 116 100 122C106 116 112 108 112 96Z', '#fde68a', { line: '#b45309', lw: 1.4 }) + K.line('M96 100q0 8 3 14M104 100q0 8-3 14', '#d97706', 1.2, { op: 0.8 });
      s += `<ellipse cx="91" cy="78" rx="2.6" ry="1.8" fill="#7f1d1d"/><ellipse cx="109" cy="78" rx="2.6" ry="1.8" fill="#7f1d1d"/>`;
      s += `<circle cx="100" cy="40" r="4" fill="${K.rad([[0, '#fffbe6'], [1, '#f59e0b']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.2"/>`;
      s += K.gloss(80, 42, 7, 4, -35, 0.45);
      const wh = 'M70 86C52 92 40 82 28 90C20 96 24 106 32 102';
      s += K.mirror(K.line(wh, '#78350f', 3.4) + K.line(wh, '#fcd34d', 1.6));
      // сияющие глаза-«рассвет»
      s += K.mirror(`<circle class="art-aura" cx="85" cy="60" r="13" fill="${K.rad([[0, '#fff3b0', 0.8], [1, '#fbbf24', 0]])}"/>`);
      s += K.eyes(100, 60, 15, 9.5, { iris: '#f59e0b', look: [0.25, 0.1] });
      s += K.mirror(K.part('M73 50C79 42 89 41 96 46C90 47 84 49 79 54Z', '#fbbf24', { line: '#78350f', lw: 1.2 }));
      s += K.mouth('smile', 100, 86, 14);
      // правая лапа поднимает горящую свечу
      s += K.vol('M120 106C130 100 140 92 146 86C150 80 158 82 158 88C152 98 142 108 128 116Z', { ...red, lw: 2.2, tex: false });
      s += `<circle class="art-aura" cx="153" cy="34" r="20" fill="${K.rad([[0, '#fffbe6', 0.9], [0.4, '#fde047', 0.5], [1, '#f97316', 0]])}"/>`;
      s += K.part('M146 50H160V88H146Z', '#ef4444', { line: '#450a0a', lw: 1.6 }) + K.line('M149 54V84', '#fecaca', 1.6, { op: 0.7 });
      s += K.part('M146 50H160V56C158 58 157 62 155 62C153 62 153 57 151 56C149 56 148 60 146 59Z', '#fde68a', { line: '#b45309', lw: 1 }) + K.line('M153 50V45', INK, 1.6);
      s += K.flame(153, 46, 22, 14, '#fffbe6', '#ff7a1a');
      s += K.vol(K.ell(153, 86, 9, 7.5), { ...red, lw: 2, tex: false }) + `<path d="M146 84l-4-3l1 5M150 80l-1-5l3 4M157 80l2-5l0 5" fill="#fff" stroke="#4c0808" stroke-width="1" stroke-linejoin="round"/>`;
      s += K.spark(30, 80, 2.6, '#fde68a', 'art-float') + K.spark(184, 70, 3, '#fff3b0') + K.spark(16, 170, 2.4, '#ffe08a');
      return s;
    },

    // Ту-эр-е: «господин заяц» с пекинских глиняных фигурок — Нефритовый заяц (белый, нефритовые кончики ушей, одно ухо
    // загнулось, красный шарфик) в золотых доспехах и шлеме с алым помпоном, за спиной флажки полководца; сидит верхом
    // на добродушном тигре, в одной лапе нефритовый пестик, в другой — тыква-горлянка с лекарством. Позади — полная Луна
    cn_tuerye(K) {
      const fur = { c1: '#ffffff', c2: '#9adfbd', rim: '#e4ffb0', rimK: 0.6, line: '#1f5a3e', tex: false }, jade = '#34d399';
      const gold = { c1: '#fff1a8', c2: '#c08a1a', rim: '#ffffff', rimK: 0.6, line: '#5a3208', texK: 0.2 };
      const tig = { c1: '#ffc778', c2: '#d9640e', rim: '#e4ffb0', rimK: 0.6, line: '#4a1d06', tex: false }, st = '#2a1006';
      let s = K.aura('#84cc16', 100, 104, 0.32);
      s += `<circle class="art-aura" cx="100" cy="66" r="76" fill="${K.rad([[0.5, '#fde68a', 0.4], [1, '#fde68a', 0]])}"/>` + moonDisc(K, 100, 66, 52);
      // флажки полководца за спиной
      const flags = `<g class="art-sway" style="transform-origin:100% 100%">` +
        K.line('M92 106L56 28M94 106L70 22', '#78350f', 2.6) + K.part('M57.8 31.8L42.5 50.8L66.8 50.8Z', '#22c55e', { line: '#14532d', lw: 1.4 }) +
        K.part('M71.2 26.1L53.1 42.6L77.2 46.6Z', '#ef4444', { line: '#7f1d1d', lw: 1.4 }) + K.line('M54 46L62 44M66 40L72 38', '#fde68a', 1.6) +
        `<path d="M56 28l-2-6l5 4zM70 22l-1-6l4 5z" fill="#fbbf24" stroke="#78350f" stroke-width=".8"/></g>`;
      s += K.mirror(flags);
      // хвост тигра
      const tl = 'M162 150C182 148 190 130 184 116C180 108 186 100 194 102';
      s += K.line(tl, '#4a1d06', 10) + K.line(tl, '#f59e0b', 6) + `<path d="${tl}" fill="none" stroke="${st}" stroke-width="6" stroke-dasharray="3 6"/>`;
      // тигр лежит
      s += K.vol('M38 152C38 134 62 126 100 126C140 126 166 134 168 152C170 168 156 178 134 178H64C48 178 38 168 38 152Z', tig);
      s += K.line('M84 128c4 8 2 14-2 18M110 127c3 8 2 14-2 18M136 130c3 8 1 14-3 18M158 140c1 6-1 10-4 13', st, 3.4);
      s += K.part(K.ell(146, 174, 13, 7), '#f59e0b', { line: '#4a1d06', lw: 2 }) + K.line('M140 172v5M146 173v5M152 172v5', st, 1.2, { op: 0.6 });
      // ножки зайца в сапожках
      s += K.mirror(K.part('M78 146H92V162H76C73 158 74 150 78 146Z', '#1f2937', { line: '#0b0f19', lw: 1.6 }) + K.line('M75 162H92', '#f8fafc', 2.4));
      // голова тигра
      s += K.part(K.ell(28, 122, 8, 8), '#f59e0b', { line: '#4a1d06', lw: 1.8 }) + K.part(K.ell(60, 122, 8, 8), '#f59e0b', { line: '#4a1d06', lw: 1.8 }) + `<circle cx="28" cy="123" r="4" fill="#fbcfe8"/><circle cx="60" cy="123" r="4" fill="#fbcfe8"/>`;
      s += K.vol('M44 116C62 116 72 128 72 142C72 156 60 166 44 166C28 166 16 156 16 142C16 128 26 116 44 116Z', tig);
      s += K.part('M44 140C54 140 62 146 63 154C58 162 52 165 44 165C36 165 30 162 25 154C26 146 34 140 44 140Z', '#fff7ed', { flat: true, lw: 0 });
      s += K.line('M36 124H52M38 129H50M44 122V132', st, 2.4) + K.line('M18 136l7 2M17 145l7 0M70 136l-7 2M71 145l-7 0', st, 2.4);
      s += K.eyes(44, 140, 9, 5.4, { iris: '#65a30d', look: [0.3, 0.2] });
      s += `<path d="M40.5 150H47.5L44 154Z" fill="#9d174d"/>` + K.mouth('cat', 44, 155, 8);
      s += K.part(K.ell(30, 172, 11, 7), '#fbbf24', { line: '#4a1d06', lw: 2 }) + K.part(K.ell(56, 174, 11, 7), '#fbbf24', { line: '#4a1d06', lw: 2 }) + K.line('M26 170v5M31 171v5M52 172v5M57 173v5', st, 1.2, { op: 0.6 });
      // доспех: юбка-пластины, кираса с зерцалом, пояс, наплечники
      s += K.vol('M68 128H132L138 150C120 156 80 156 62 150Z', gold) + K.line(scaleRow(66, 134, 136, 8.5) + scaleRow(64, 136, 144, 9), '#a16207', 1.2, { op: 0.7 });
      s += K.vol('M100 90C120 90 132 100 134 116L130 132H70L66 116C68 100 80 90 100 90Z', gold);
      s += K.line(scaleRow(72, 128, 106, 8) + scaleRow(70, 130, 116, 8.6) + scaleRow(72, 128, 125, 8), '#a16207', 1.2, { op: 0.7 });
      s += `<circle cx="100" cy="110" r="9" fill="${K.rad([[0, '#ffffff'], [0.6, '#cbd5e1'], [1, '#64748b']], 0.35, 0.3)}" stroke="#334155" stroke-width="1.6"/><circle cx="100" cy="110" r="5" fill="none" stroke="#94a3b8" stroke-width="1"/>`;
      s += K.line('M68 131H132', '#dc2626', 5) + K.rhomb(100, 131, 4, jade, '#064e3b');
      s += K.mirror(K.part('M64 94C70 88 80 88 86 92L82 104C74 104 68 100 64 94Z', '#fbbf24', { line: '#78350f', lw: 1.4 }));
      // правая лапа поднимает нефритовый пестик
      s += K.part('M47 34H55V98H47Z', '#e2fbe9', { line: '#1f5a3e', lw: 1.4 }) + K.part('M44 46C44 34 47 26 51 26C55 26 58 34 58 46V54H44Z', jade, { line: '#065f46', lw: 1.6 });
      s += K.vol('M70 98C60 98 54 92 52 84C51 78 56 76 59 80C62 86 66 88 74 90Z', gold) + K.part(K.ell(52, 80, 7, 6.5), '#ffffff', { line: '#1f5a3e', lw: 2 });
      // левая лапа держит тыкву с лекарством
      s += K.vol('M130 98C140 100 148 106 150 114C152 120 146 124 142 120C138 114 134 110 128 108Z', gold);
      s += gourd(K, 151, 142, 0.72, { c: '#fbbf24', rot: 8 }) + K.part(K.ell(146, 120, 7, 6.5), '#ffffff', { line: '#1f5a3e', lw: 2 });
      // красный шарфик
      s += K.line('M74 94Q100 106 126 94', '#dc2626', 6) + K.g(K.line('M120 100C124 108 120 114 126 120', '#dc2626', 4), '', 'art-sway');
      // уши (одно загнулось) и голова
      s += K.vol('M84 52C78 36 76 18 82 10C90 4 96 14 95 28C94 38 92 46 92 52Z', fur) + K.part('M84 44C81 34 81 22 84 16C88 14 90 20 90 28C90 34 89 40 88 46Z', '#ffc9d6', { line: '#be185d', lw: 1 });
      s += K.part('M82 10C90 4 96 14 95 28C90 24 86 20 81 18C80 14 80 12 82 10Z', jade, { line: '#065f46', lw: 1.2 });
      s += K.vol('M108 50C110 34 114 22 124 16C134 12 142 18 136 26C130 32 120 36 116 52Z', fur) + K.part('M124 16C134 12 142 18 136 26C132 24 128 22 124 22Z', jade, { line: '#065f46', lw: 1.2 });
      s += K.vol('M100 46C124 46 136 60 136 78C136 96 122 106 100 106C78 106 64 96 64 78C64 60 76 46 100 46Z', fur);
      // шлем с помпоном и нефритовой бляшкой
      s += K.vol('M68 66C68 46 82 38 100 38C118 38 132 46 132 66C120 60 80 60 68 66Z', gold) + K.line('M68 66C80 60 120 60 132 66', '#b45309', 3);
      s += K.line('M100 38V28', '#b45309', 2.4) + `<circle cx="100" cy="26" r="6" fill="${K.rad([[0, '#fecaca'], [1, '#dc2626']], 0.35, 0.3)}" stroke="#7f1d1d" stroke-width="1.4"/>`;
      s += `<circle cx="100" cy="52" r="5" fill="${K.rad([[0, '#d1fae5'], [1, '#059669']], 0.35, 0.3)}" stroke="#065f46" stroke-width="1.2"/>` + K.line(spiral(100, 52, 0.5, 1.2), '#065f46', 1);
      s += K.eyes(100, 80, 13, 8.5, { iris: '#e11d48', look: [0.1, 0.3] });
      s += K.blush(78, 92, 5) + K.blush(122, 92, 5);
      s += `<path d="M97 90H103L100 93Z" fill="#f472b6" stroke="#9d174d" stroke-width="1"/>` + K.mouth('cat', 100, 95, 9);
      s += K.spark(22, 30, 3, '#fef3c7', 'art-float') + K.spark(178, 40, 3, '#e4ffb0') + K.spark(186, 150, 2.4, '#fef3c7');
      return s;
    },

    // Змейка Сяобай: беленькая змейка с озера Сиху свернулась колечками в лужице; кончиком хвоста держит над головой лист
    // лотоса, как зонтик; на лбу красная точка, глазки-бусины, румянец и раздвоенный язычок. Вокруг — дождик
    cn_xiaobai(K) {
      const sk = { c1: '#ffffff', c2: '#bfe9ff', rim: '#c8f3ff', rimK: 0.8, line: '#0c4a6e', tex: false };
      let s = K.aura('#38bdf8', 88, 118, 0.32);
      s += K.line('M28 26l-4 10M56 12l-4 10M182 74l-4 10M18 84l-4 10M26 128l-4 10M178 120l-4 10', '#bae6fd', 2, { op: 0.75, cls: 'art-blink' });
      // лужица
      s += `<ellipse cx="100" cy="174" rx="74" ry="9" fill="${K.rad([[0, '#7dd3fc', 0.6], [1, '#2b8fd6', 0]])}"/>` + '<g class="art-aura"><ellipse cx="100" cy="174" rx="84" ry="10" fill="none" stroke="#bfeaff" stroke-width="1.6" opacity=".5"/></g>';
      // стебелёк в кончике хвоста
      s += K.line('M158 112C164 86 152 58 124 40', '#14532d', 4.4) + K.line('M158 112C164 86 152 58 124 40', '#4ade80', 2);
      // тело колечками
      const body = 'M100 112C112 106 138 108 140 122C142 136 118 140 100 138C74 136 48 140 46 154C44 168 70 174 100 174C134 174 158 166 160 150C162 134 154 124 158 110';
      s += tube(K, body, 24, { c1: '#ffffff', c2: '#a5dcf5', line: '#0c4a6e', belly: '#e0f7ff', dots: '#7dd3fc' });
      // голова
      s += K.vol('M100 46C128 46 144 62 144 84C144 104 126 118 100 118C74 118 56 104 56 84C56 62 72 46 100 46Z', sk);
      s += K.gloss(76, 64, 9, 5, -35, 0.45);
      s += `<circle cx="100" cy="58" r="3.4" fill="#ef4444" stroke="#991b1b" stroke-width="1"/>`;
      s += K.eyes(100, 84, 19, 12.5, { iris: '#0ea5e9', look: [0.1, 0.25] });
      s += K.blush(66, 102, 7) + K.blush(134, 102, 7);
      s += K.mouth('smile', 100, 101, 14) + `<path d="M100 107v6M100 113l-2.6 3M100 113l2.6 3" stroke="#f472b6" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
      // лист лотоса — зонтик
      const leaf = 'M66 38Q116 -14 166 38Q153.5 31 141 38Q128.5 31 116 38Q103.5 31 91 38Q78.5 31 66 38Z';
      s += `<g class="art-sway" style="transform-origin:50% 100%;animation-delay:-.6s"><g transform="rotate(-8 116 30)">` + K.part(leaf, '#4ade80', { line: '#14532d', lw: 1.8 }) +
        K.line('M116 13L70 37M116 13L91 36M116 13V36M116 13L141 36M116 13L162 37', '#166534', 1.2, { op: 0.55 }) + `<ellipse cx="102" cy="22" rx="10" ry="3.4" transform="rotate(-28 102 22)" fill="#fff" opacity=".4"/>` +
        `<path d="M66 42q-3 5 0 7q3-2 0-7zM166 42q-3 5 0 7q3-2 0-7z" fill="#bae6fd" stroke="#0c4a6e" stroke-width=".8"/></g></g>`;
      s += K.spark(30, 60, 3, '#e0f7ff', 'art-float') + K.spark(176, 30, 2.6, '#e0f7ff') + K.spark(20, 160, 2.4, '#e0f7ff');
      return s;
    },

    // Белая змея: подросшая Сяобай поднялась над озером изящной дугой — белая чешуя с голубым отливом, бирюзовое брюшко,
    // на лбу красная метка-язычок, ресницы; рядом парит жемчужина бессмертия. Позади туманные пики Эмэйшаня, внизу волны и лотосы
    cn_baishe(K) {
      const sk = { c1: '#ffffff', c2: '#a5dcf5', rim: '#c8f3ff', rimK: 0.8, line: '#0c4a6e', tex: false };
      let s = K.aura('#38bdf8', 96, 104, 0.36);
      // горы Эмэйшань в тумане
      s += `<path d="M-4 128L22 84L38 102L64 52L88 92L104 74L124 100L146 60L170 96L186 80L204 104V146H-4Z" fill="${K.lin(['#c7d2fe', '#e0f2fe'])}" opacity=".45"/>`;
      s += K.line('M20 20l-3 8M48 10l-3 8M160 16l-3 8M186 44l-3 8', '#bae6fd', 1.8, { op: 0.7, cls: 'art-blink' });
      // волны
      s += waves(K, -6, 206, 160, { step: 26, h: 26 });
      // тело дугой и кончик хвоста
      s += tube(K, 'M30 150C22 142 26 130 36 132', 13, { c1: '#ffffff', c2: '#a5dcf5', line: '#0c4a6e' });
      const body = 'M30 150C18 162 36 172 66 168C104 162 146 174 164 152C180 130 162 112 134 112C108 112 86 104 88 84C90 70 98 64 100 58';
      s += tube(K, body, 26, { c1: '#ffffff', c2: '#a5dcf5', line: '#0c4a6e', belly: '#ccfbf1', dots: '#7dd3fc' });
      s += lotus(K, 32, 174, 0.8) + lotus(K, 176, 172, 0.72, { d: 0.6 });
      // голова
      s += K.vol('M100 16C122 16 134 28 134 43C134 58 120 68 100 68C80 68 66 58 66 43C66 28 78 16 100 16Z', sk);
      s += K.part('M100 50C112 50 124 54 128 60C122 66 112 68 100 68C88 68 78 66 72 60C76 54 88 50 100 50Z', '#e0f7ff', { line: '#7dd3fc', lw: 1 });
      s += `<circle cx="94" cy="56" r="1.4" fill="#0c4a6e"/><circle cx="106" cy="56" r="1.4" fill="#0c4a6e"/>`;
      s += K.part('M100 20C103 24 104 27 102 30C101 32 99 32 98 30C96 27 97 24 100 20Z', '#ef4444', { line: '#991b1b', lw: 1 });
      s += K.gloss(80, 28, 7, 4, -35, 0.5);
      s += K.eyes(100, 40, 13, 8, { iris: '#0ea5e9', lash: true, look: [0.35, 0.2] });
      s += K.blush(78, 52, 4.4) + K.blush(122, 52, 4.4) + K.mouth('smile', 100, 60, 10);
      // жемчужина бессмертия
      s += pearl(K, 144, 72, 8, '#fde68a');
      s += K.spark(24, 74, 3, '#e0f7ff', 'art-float') + K.spark(180, 100, 2.6, '#fde68a') + K.spark(60, 112, 2.2, '#e0f7ff');
      return s;
    },

    // Бай Сучжэнь: Белая змея в облике дамы — белое платье с бирюзовой каймой, а ниже пояса белый змеиный хвост кольцом;
    // высокая причёска с серебряными шпильками и жемчугом, на лбу красная метка (как у Сяобай); в одной руке масляный
    // зонтик, в другой — гриб линчжи, трава жизни. Позади — Сломанный мост, ивы озера Сиху и дождик
    cn_baisuzhen(K) {
      const skin = '#fde8d8', robe = { c1: '#ffffff', c2: '#bfe3f5', rim: '#c8f3ff', rimK: 0.7, line: '#0c4a6e', texK: 0.18 };
      const hair = { c1: '#3a3350', c2: '#0f0a1e', rim: '#c8f3ff', rimK: 0.4, line: '#0f0a1e', lw: 1.6, tex: false };
      let s = K.aura('#38bdf8', 100, 100, 0.4) + K.aura('#f9a8d4', 60, 70, 0.22);
      // Сломанный мост и ивы
      s += `<g opacity=".8"><path d="M-8 178V146Q40 104 100 132V178H82V162Q78 142 50 140Q22 142 18 162V178Z" fill="${K.lin(['#f1f5f9', '#cbd5e1'])}" stroke="#64748b" stroke-width="1.6" stroke-linejoin="round"/>` +
        K.line('M12 132v-9M32 124v-9M54 121v-9M76 124v-9M96 130v-9', '#94a3b8', 2.4) + K.line('M10 123Q54 101 98 121', '#94a3b8', 2.2) + '</g>';
      s += `<g class="art-sway" style="transform-origin:0 0">` + K.line('M6 -2C12 28 8 58 14 86M20 -2C26 24 24 48 30 68M-2 18C2 42 0 70 4 100', '#4d7c0f', 1.6, { op: 0.85 }) +
        `<g fill="#84cc16" stroke="#3f6212" stroke-width=".7">${[[10, 22], [9, 44], [12, 66], [24, 18], [26, 40], [28, 58], [1, 40], [2, 62], [3, 84]].map(([x, y], i) => `<ellipse cx="${x + 3}" cy="${y}" rx="4.6" ry="1.8" transform="rotate(${i % 2 ? 60 : 120} ${x + 3} ${y})"/>`).join('')}</g></g>`;
      s += K.line('M150 120l-3 8M176 140l-3 8M42 96l-3 8M180 104l-3 8', '#bae6fd', 1.8, { op: 0.75, cls: 'art-blink' });
      // зонтик (за головой)
      let u = `<path d="M-46 8Q0 -42 46 8Q34.5 2 23 8Q11.5 2 0 8Q-11.5 2 -23 8Q-34.5 2 -46 8Z" fill="${K.lin(['#ffe4e6', '#fda4af', '#f472b6'])}" stroke="#9f1239" stroke-width="1.8" stroke-linejoin="round"/>`;
      u += K.line('M0 -17L-40 6M0 -17L-23 7M0 -17V7M0 -17L23 7M0 -17L40 6', '#be123c', 1.2, { op: 0.6 }) + K.line('M-40 3Q0 -24 40 3', '#ffffff', 1.4, { op: 0.6 });
      u += `<g fill="#fff" opacity=".85"><circle cx="-14" cy="-6" r="2.2"/><circle cx="-9" cy="-9" r="1.6"/><circle cx="16" cy="-4" r="2"/></g>` + K.line('M0 -17V-22', '#78350f', 2.4) + K.line('M0 8V60', '#92400e', 2.6);
      s += `<g transform="translate(148 32) rotate(-20)">${u}</g>`;
      // хвост кольцом
      s += tube(K, 'M100 142C76 150 46 156 46 168C46 180 134 182 154 170C170 160 164 144 144 144C130 146 128 158 138 162', 26, { c1: '#ffffff', c2: '#a5dcf5', line: '#0c4a6e', belly: '#ccfbf1', dots: '#7dd3fc' });
      // волосы сзади
      s += K.part('M80 58C74 82 74 106 80 122C88 118 92 110 94 100H106C108 110 112 118 120 122C126 106 126 82 120 58Z', '#1f1a2e', { line: '#0f0a1e', lw: 1.4 });
      // платье
      s += K.vol('M100 84C114 84 124 92 127 104L132 148C120 156 80 156 68 148L73 104C76 92 86 84 100 84Z', robe);
      s += K.line('M90 86L100 102L110 86', '#0ea5e9', 3) + K.stitch('M70 146Q100 156 130 146', '#0ea5e9', 2);
      s += K.line('M74 120Q100 128 126 120', '#0ea5e9', 6) + K.stitch('M74 120Q100 128 126 120', '#fde68a', 1.4);
      s += K.g(K.line('M98 126C96 138 92 146 90 154M102 126C106 138 110 146 112 154', '#f472b6', 2.6), '', 'art-sway');
      // рука с линчжи
      s += K.vol('M78 94C66 100 60 112 60 126C62 136 72 138 80 132C82 122 86 112 92 104Z', robe) + K.stitch('M60 128C64 134 72 136 80 132', '#0ea5e9', 1.6);
      s += K.line('M70 128C66 120 64 112 66 104', '#78350f', 2.6);
      s += K.part('M50 106C50 96 60 92 70 94C78 96 82 102 78 108C70 106 60 106 50 106Z', '#ea580c', { line: '#7c2d12', lw: 1.4 }) + K.line('M56 102Q66 96 76 102', '#fbbf24', 1.2, { op: 0.9 });
      s += K.part(K.ell(70, 130, 5.5, 5), skin, { line: '#9a6a4a', lw: 1.4 });
      // рука с зонтиком
      s += K.vol('M122 94C136 96 152 92 162 84C166 80 170 84 168 90C160 100 142 106 126 106Z', robe) + K.part(K.ell(166, 86, 5.5, 5), skin, { line: '#9a6a4a', lw: 1.4 });
      // лицо и причёска
      s += K.vol(K.ell(100, 64, 16.5, 18), { c1: skin, c2: '#eab89a', rim: '#fff3d6', tex: false, hiK: 0.18, lw: 2.2, line: '#8a5a3a' });
      s += K.part('M83.5 64C81 48 90 42 100 42C110 42 119 48 116.5 64C113 56 107 52 100 52C93 52 87 56 83.5 64Z', '#1f1a2e', { line: '#0f0a1e', lw: 1.4 });
      s += K.mirror(K.vol(K.ell(84, 40, 7.5, 7.5), hair)) + K.vol('M89 44C85 32 90 20 100 17C110 20 115 32 111 44Z', hair);
      s += K.line('M92 28Q100 24 108 28', '#6d6a96', 1.4, { op: 0.8 });
      s += K.line('M108 30L128 20M92 32L74 24', '#e2e8f0', 2.2) + `<circle cx="128" cy="20" r="2.6" fill="#ffffff" stroke="#64748b" stroke-width="1"/><circle cx="74" cy="24" r="2.6" fill="#ffffff" stroke="#64748b" stroke-width="1"/>`;
      s += K.line('M124 22V31', '#e2e8f0', 1) + `<circle cx="124" cy="33" r="1.8" fill="#ffffff" stroke="#64748b" stroke-width=".8"/>`;
      s += `<g fill="#ffffff" stroke="#94a3b8" stroke-width=".8"><circle cx="83" cy="48" r="2.6"/><circle cx="87" cy="46" r="2.6"/><circle cx="85" cy="51" r="2.6"/></g><circle cx="85" cy="48.5" r="1.3" fill="#fde047"/>`;
      s += `<path d="M100 54l1.6 2.4l-1.6 2.4l-1.6-2.4z" fill="#e11d48"/>`;
      s += K.eyes(100, 67, 7.5, 4.8, { iris: '#0ea5e9', lid: 'half', skin, lash: true, look: [0.3, 0.3] });
      s += K.blush(88, 75, 3.6) + K.blush(112, 75, 3.6);
      s += `<path d="M97 77Q100 79.5 103 77Q100 76 97 77Z" fill="#e11d48" stroke="#9f1239" stroke-width="1"/>`;
      s += `<circle cx="83.5" cy="72" r="1.8" fill="#ffffff" stroke="#94a3b8" stroke-width=".7"/><circle cx="116.5" cy="72" r="1.8" fill="#ffffff" stroke="#94a3b8" stroke-width=".7"/>`;
      s += K.spark(20, 120, 3, '#e0f7ff', 'art-float') + K.spark(186, 128, 2.6, '#fbcfe8') + K.spark(60, 20, 2.4, '#e0f7ff');
      return s;
    },

    // Головастик: лунный головастик — круглый сиреневый малыш с хвостиком-плавником и крошечными задними лапками, на спинке
    // золотые крапинки и серпик; плывёт над прудом по лунной дорожке, ротиком «о» ловит лунное «молоко». Рядом кувшинка, пузырьки
    cn_golovastik(K) {
      const sk = { c1: '#ddd6fe', c2: '#7c3aed', rim: '#e9d5ff', rimK: 0.7, line: '#2e1065', texK: 0.45 };
      let s = K.aura('#c084fc', 88, 112, 0.36);
      // луна и лунная дорожка на воде
      s += `<circle class="art-aura" cx="164" cy="32" r="26" fill="${K.rad([[0, '#fef3c7', 0.7], [1, '#fde68a', 0]])}"/>` + moonDisc(K, 164, 32, 15);
      s += `<ellipse cx="100" cy="170" rx="86" ry="12" fill="${K.rad([[0, '#4c1d95', 0.75], [1, '#1e1b4b', 0]])}"/>`;
      s += K.line('M60 162H92M108 162H150M50 168H86M114 168H160M70 174H130', '#fde68a', 2.4, { op: 0.75, cls: 'art-blink' });
      // кувшинка с бутоном
      s += `<path d="M12 170A21 7 0 1 1 54 170L34 168Z" fill="${K.lin(['#86efac', '#15803d'])}" stroke="#14532d" stroke-width="1.4"/>` + lotus(K, 32, 166, 0.55, { c: '#f5d0fe', line: '#86198f' });
      let c = '';
      // хвостик-плавник
      c += K.part('M128 112C150 112 168 124 180 112C186 106 190 116 186 124C176 142 150 142 126 134Z', '#c4b5fd', { line: '#2e1065', lw: 2 });
      c += K.line('M136 122C152 126 166 128 180 118M140 130C154 134 168 132 178 126', '#f5f3ff', 1.2, { op: 0.6 });
      // крошечные задние лапки
      c += K.part('M80 144C78 152 72 156 66 158C70 162 78 162 84 158C86 154 86 148 86 144Z', '#a78bfa', { line: '#2e1065', lw: 1.6 }) + K.part('M112 144C114 152 120 156 126 158C122 162 114 162 108 158C106 154 106 148 106 144Z', '#a78bfa', { line: '#2e1065', lw: 1.6 });
      // круглое тельце-голова
      c += K.vol('M96 56C128 56 146 78 146 104C146 130 126 150 96 150C66 150 46 130 46 104C46 78 64 56 96 56Z', sk);
      c += K.part('M96 112C114 112 128 122 128 134C122 144 110 148 96 148C82 148 70 144 64 134C64 122 78 110 96 112Z', '#f5f3ff', { flat: true, lw: 0, op: 0.7 });
      // золотые крапинки и серпик
      c += crescent(K, 70, 74, 6, { c: '#fde68a', line: '#a16207', lw: 0.9 }) + `<g fill="#fde68a" stroke="#a16207" stroke-width=".8"><circle cx="118" cy="68" r="3.4"/><circle cx="133" cy="85" r="2.4"/><circle cx="57" cy="96" r="2.2"/><circle cx="102" cy="62" r="2"/></g>`;
      c += K.gloss(78, 70, 8, 4.5, -35, 0.4);
      c += K.eyes(96, 98, 18, 12.5, { iris: '#7c3aed', look: [0.2, 0.3] });
      c += K.blush(66, 118, 7) + K.blush(126, 118, 7);
      c += K.mouth('o', 96, 117, 12) + `<circle cx="106" cy="132" r="3" fill="#fffbeb" stroke="#a16207" stroke-width=".8"/>`;
      s += K.g(c, '', 'art-float');
      s += `<g class="art-float" style="animation-delay:-.8s" fill="none" stroke="#e9d5ff" stroke-width="1.3"><circle cx="40" cy="100" r="4"/><circle cx="32" cy="82" r="2.6"/><circle cx="172" cy="96" r="3"/></g>`;
      s += K.spark(30, 40, 3, '#e9d5ff', 'art-float') + K.spark(126, 20, 2.4, '#ffffff') + K.spark(186, 70, 2.2, '#e9d5ff');
      return s;
    },

    // Лунная жаба: пухлая сиреневая жаба с золотыми бородавками-звёздочками сидит перед полной Луной, у которой… откушен
    // краешек; в уголке широкого рта золотые крошки, глаза довольно прищурены. Над ней ветка лунного коричника-гуйхуа
    cn_chanchu(K) {
      const sk = { c1: '#c4b5fd', c2: '#5b21b6', rim: '#e9d5ff', rimK: 0.7, line: '#2e1065', texK: 0.5 };
      const wart = K.rad([[0, '#fffbe6'], [0.5, '#fcd34d'], [1, '#d97706']], 0.35, 0.3);
      let s = K.aura('#c084fc', 96, 108, 0.4);
      // Луна с откушенным краем
      const bite = K.id('bite');
      K.def(`<mask id="${bite}" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200"><rect width="200" height="200" fill="#fff"/><circle cx="146" cy="26" r="13" fill="#000"/><circle cx="159" cy="42" r="11" fill="#000"/><circle cx="134" cy="15" r="10" fill="#000"/></mask>`);
      s += `<circle class="art-aura" cx="100" cy="68" r="78" fill="${K.rad([[0.5, '#fde68a', 0.35], [1, '#fde68a', 0]])}"/>`;
      s += `<g mask="url(#${bite})">${moonDisc(K, 100, 68, 58)}</g>`;
      s += `<g class="art-float" fill="#fde68a" stroke="#a16207" stroke-width=".7"><path d="M150 50l4 1l-1 4z"/><path d="M162 62l3 2l-3 2z"/><path d="M140 40l3 0l-1 3z"/></g>`;
      // ветка коричника-гуйхуа
      s += K.line('M-4 30C20 26 40 34 58 22', '#5b3a1a', 3.4) + K.leaf(28, 30, 15, -64, '#4d7c0f') + K.leaf(46, 28, 13, 36, '#65a30d') + K.leaf(10, 28, 12, 120, '#65a30d');
      s += `<g fill="#fbbf24" stroke="#b45309" stroke-width=".6"><circle cx="20" cy="33" r="2.6"/><circle cx="37" cy="24" r="2.4"/><circle cx="53" cy="29" r="2.6"/><circle cx="14" cy="24" r="2.2"/><circle cx="58" cy="19" r="2"/></g>`;
      // задние лапы сложены по бокам; бугорки глаз (их низ прячется за телом)
      s += K.mirror(K.vol('M58 128C38 128 26 144 30 160C34 172 50 176 64 172C72 160 70 140 58 128Z', sk));
      s += K.mirror(K.vol(K.ell(78, 90, 17, 15), { ...sk, texK: 0.3 }));
      // тело
      s += K.vol('M100 88C136 88 158 112 158 140C158 164 134 176 100 176C66 176 42 164 42 140C42 112 64 88 100 88Z', sk);
      s += K.part('M100 134C122 134 138 146 140 160C134 170 118 175 100 175C82 175 66 170 60 160C62 146 78 134 100 134Z', '#ede9fe', { flat: true, lw: 0, op: 0.85 });
      [[62, 114, 4.2], [138, 112, 4.6], [50, 136, 3.2], [150, 134, 3.4], [100, 104, 2.6], [86, 116, 2.2], [116, 118, 2.4]].forEach(([x, y, r]) => { s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${wart}" stroke="#a16207" stroke-width=".8"/>`; });
      // глаза, довольный прищур
      s += K.eyes(100, 91, 22, 11, { iris: '#f59e0b', lid: 'half', skin: '#9370f0', look: [0, 0.35] });
      // широкий рот с крошками
      s += K.line('M60 124Q100 148 140 124', INK, 3.4) + K.line('M60 124l-4-3M140 124l4-3', INK, 2.4);
      s += `<g fill="#fde68a" stroke="#a16207" stroke-width=".6"><path d="M130 132l5-1l-1 5z"/><path d="M138 138l4 1l-2 3z"/><path d="M68 132l-4 0l2 3z"/></g>`;
      s += K.blush(62, 122, 6) + K.blush(138, 122, 6);
      // передние лапки
      s += K.mirror(K.vol('M76 148C72 158 68 166 62 172C68 177 82 177 88 173C88 165 86 156 86 148Z', { ...sk, texK: 0.3 }) + K.line('M68 172l-3 4M75 174l-1 4M82 174l1 4', '#2e1065', 1.4, { op: 0.6 }));
      s += K.spark(24, 70, 3, '#e9d5ff', 'art-float') + K.spark(178, 96, 2.6, '#fde68a') + K.spark(184, 150, 2.4, '#e9d5ff');
      return s;
    },

    // Цзиньчань: трёхлапая золотая жаба лунного дворца — сидит на золотых слитках перед полной Луной, во рту монета, а с губ
    // свисает нитка монет Лю Хая; на лбу лунный самоцвет, бородавки янтарные, глаза алые. Лап три: две передние
    // и одна задняя сбоку. В углу неба — Северный Ковш из семи звёзд
    cn_jinchan(K) {
      const gold = { c1: '#fde68a', c2: '#b7791f', rim: '#f5d0fe', rimK: 0.55, line: '#5a3208', texK: 0.2 };
      const wart = K.rad([[0, '#fffbe6'], [0.5, '#fb923c'], [1, '#b45309']], 0.35, 0.3);
      let s = K.aura('#c084fc', 100, 104, 0.42) + K.aura('#fde68a', 66, 84, 0.3);
      s += moonDisc(K, 100, 68, 60, { line: '#c084fc' });
      // Северный Ковш
      s += K.line('M8 18L10 32L24 34L25 22ZM25 22L35 15L44 12L54 6', '#e9d5ff', 1, { op: 0.7 });
      [[8, 18], [10, 32], [24, 34], [25, 22], [35, 15], [44, 12], [54, 6]].forEach(([x, y], i) => { s += K.spark(x, y, i === 6 ? 3.4 : 2.6, i % 2 ? '#fffbe6' : '#e9d5ff'); });
      // золотые слитки-юаньбао
      const ingot = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-20 0C-23 -9 -14 -13 -10 -8C-7 -16 7 -16 10 -8C14 -13 23 -9 20 0C12 6 -12 6 -20 0Z" fill="${K.lin(['#fff7c2', '#fbbf24', '#b45309'])}" stroke="#78350f" stroke-width="${r1(1.4 / k)}" stroke-linejoin="round"/><ellipse cx="-3" cy="-10" rx="4" ry="2" fill="#fff" opacity=".6"/></g>`;
      s += ingot(34, 172, 1) + ingot(168, 172, 0.9) + coin(K, 186, 152, 6, { rot: 20 }) + coin(K, 14, 156, 6);
      // одна задняя лапа — сбоку справа; бугорки глаз (низ прячется за телом)
      s += K.vol('M142 130C162 130 174 146 170 162C166 172 152 176 140 172C134 160 134 142 142 130Z', gold) + K.line('M150 174l-2 5M158 172l0 5M165 168l3 4', '#5a3208', 1.4, { op: 0.6 });
      s += K.mirror(K.vol(K.ell(78, 90, 17, 15), gold));
      // тело
      s += K.vol('M100 88C136 88 158 112 158 140C158 164 134 176 100 176C66 176 42 164 42 140C42 112 64 88 100 88Z', gold);
      s += K.part('M100 136C122 136 138 148 140 160C134 170 118 175 100 175C82 175 66 170 60 160C62 148 78 136 100 136Z', '#fff7d6', { flat: true, lw: 0, op: 0.85 });
      [[60, 114, 4.4], [140, 112, 4.6], [50, 138, 3.4], [152, 136, 3.4], [68, 126, 2.4], [132, 126, 2.4], [84, 112, 2.2], [116, 112, 2.2]].forEach(([x, y, r]) => { s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${wart}" stroke="#78350f" stroke-width=".8"/>`; });
      // глаза и лунный самоцвет
      s += K.eyes(100, 91, 22, 11, { iris: '#dc2626', look: [0, 0.3] });
      s += K.rhomb(100, 104, 6, '#a78bfa', '#4c1d95') + `<circle cx="98.6" cy="102.4" r="1.4" fill="#fff" opacity=".8"/>`;
      // рот с монетой и нитка монет Лю Хая
      s += K.line('M60 124Q100 148 140 124', '#5a3208', 3.4);
      s += K.line('M84 136C70 146 62 156 58 168M116 136C130 146 138 156 142 168', '#dc2626', 2);
      s += coin(K, 72, 150, 6, { rot: 10 }) + coin(K, 62, 163, 6, { rot: -15 }) + coin(K, 128, 150, 6, { rot: -10 }) + coin(K, 138, 163, 6, { rot: 15 });
      s += coin(K, 100, 136, 12);
      s += K.blush(62, 122, 6) + K.blush(138, 122, 6);
      // две передние лапы
      s += K.mirror(K.vol('M74 150C70 160 66 168 60 174C66 179 80 179 86 175C86 167 84 158 84 150Z', { ...gold, texK: 0.25 }) + K.line('M66 174l-3 4M73 176l-1 4M80 176l1 4', '#5a3208', 1.4, { op: 0.6 }));
      s += K.spark(184, 30, 3, '#fde68a', 'art-float') + K.spark(180, 110, 2.6, '#e9d5ff') + K.spark(20, 110, 2.6, '#fde68a', 'art-float');
      return s;
    },

    // Малёк Кунь: круглая рыбка из Северной пучины плывёт по облакам — синяя спинка с волнистой чешуёй, белое брюшко,
    // пушистые плавники-крылышки, хвост с завитком ветра; ротиком «о» выпускает облачко. Под ней облако, вокруг завитки ветра
    cn_malyok(K) {
      const fish = { c1: '#dbeafe', c2: '#2563eb', rim: '#eef0ff', rimK: 0.75, line: '#1e3a8a', texK: 0.3 };
      let s = K.aura('#a5b4fc', 88, 116, 0.36);
      s += K.line('M12 70q12-8 24 0t22 0M150 30q12-8 24 0t20 0M158 156q10-6 20 0', '#e0e7ff', 2.2, { op: 0.6, cls: 'art-float' });
      s += cloud(K, 100, 168, 1.9, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca' });
      let c = '';
      // хвост с завитком
      c += K.part('M136 98C144 80 158 68 178 66C172 78 174 92 184 104C168 110 150 106 138 104Z', '#93c5fd', { line: '#1e3a8a', lw: 2 });
      c += K.line('M144 96C154 86 164 78 174 74M146 102C158 102 170 102 178 104', '#eff6ff', 1.2, { op: 0.7 }) + K.line(spiral(170, 84, 1.1, 1.3), '#ffffff', 1.6, { op: 0.8 });
      // спинной плавник
      c += K.part('M80 62C86 46 102 40 116 46C110 52 110 58 112 66Z', '#60a5fa', { line: '#1e3a8a', lw: 1.6 }) + K.line('M90 58L98 46M100 60L106 46', '#eff6ff', 1, { op: 0.7 });
      // тело
      c += K.vol('M96 58C128 58 146 82 146 108C146 134 126 152 96 152C66 152 48 134 48 108C48 82 64 58 96 58Z', fish);
      c += K.part('M96 112C116 112 132 122 136 134C128 146 114 152 96 152C78 152 64 146 56 134C60 122 76 112 96 112Z', '#ffffff', { flat: true, lw: 0, op: 0.8 });
      c += K.line(scaleRow(68, 124, 80, 9.4) + scaleRow(62, 130, 91, 9.7), '#bfdbfe', 1.4, { op: 0.8 });
      c += K.gloss(72, 74, 9, 5, -35, 0.45);
      // плавники-крылышки
      const fin = `<g class="art-wing">` + K.part('M56 118C44 106 28 104 16 112C22 116 22 120 18 124C26 126 28 130 26 134C36 134 44 132 54 128Z', '#ffffff', { line: '#4338ca', lw: 1.6 }) + K.line('M50 118L26 116M50 124L30 128', '#c7d2fe', 1.2) + '</g>';
      c += K.mirror(fin);
      c += K.eyes(96, 98, 18, 12.5, { iris: '#1d4ed8', look: [0, 0.2] });
      c += K.blush(66, 116, 7) + K.blush(126, 116, 7);
      c += K.mouth('o', 96, 117, 12);
      s += K.g(c, '', 'art-float');
      s += cloud(K, 40, 150, 0.32, { c1: '#ffffff', c2: '#e0e7ff', line: '#4338ca', cls: 'art-float', d: 0.7 });
      s += K.spark(30, 40, 3, '#e0e7ff', 'art-float') + K.spark(128, 24, 2.4, '#ffffff') + K.spark(186, 130, 2.4, '#e0e7ff');
      return s;
    },

    // Кунь: исполинская рыба Северной пучины плывёт по небу над крышами — тёмно-синяя спина в звёздных крапинках, белое
    // брюхо в складках, как у кита, длинный плавник-крыло (будущие крылья Пэн), хвост веером; сонный довольный глаз.
    // Внизу крошечный город, вокруг облака и стайка птиц — видно, какая она огромная
    cn_kun(K) {
      const fish = { c1: '#93c5fd', c2: '#1e3a8a', rim: '#eef0ff', rimK: 0.75, line: '#0f1e4a', texK: 0.3 };
      let s = K.aura('#a5b4fc', 98, 96, 0.38);
      // крошечный город и тень от Кунь
      s += `<path d="M0 178V160H14V150H26V164H36V144H50V166H62V156H74V178ZM122 178V158H134V146H148V162H158V150H172V164H186V154H200V178Z" fill="#312e81" stroke="#1e1b4b" stroke-width="1.4" stroke-linejoin="round"/>`;
      s += `<g fill="#fde68a"><rect x="17" y="154" width="3" height="4"/><rect x="40" y="149" width="3" height="4"/><rect x="40" y="157" width="3" height="4"/><rect x="138" y="151" width="3" height="4"/><rect x="162" y="155" width="3" height="4"/><rect x="66" y="161" width="3" height="4"/><rect x="190" y="160" width="3" height="4"/></g>`;
      s += `<ellipse cx="100" cy="176" rx="84" ry="6" fill="#0f172a" opacity=".35"/>`;
      s += cloud(K, 150, 30, 0.75, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca', op: 0.8 }) + K.line('M28 24l4 3l4-3M42 34l3 2l3-2M18 40l3 2l3-2', '#e0e7ff', 1.6, { cls: 'art-float' });
      // хвост веером
      s += K.part('M162 92C170 72 184 60 198 56C192 72 192 88 200 104C188 106 172 102 162 98Z', '#3b82f6', { line: '#0f1e4a', lw: 2 }) + K.line('M168 92C176 80 186 70 194 64M170 96C180 96 190 98 196 100', '#dbeafe', 1.2, { op: 0.7 });
      // спинной плавник
      s += K.part('M108 54C116 40 130 34 142 38C134 44 132 52 134 60Z', '#3b82f6', { line: '#0f1e4a', lw: 1.6 });
      // тело
      s += K.vol('M14 98C20 70 58 50 104 50C140 50 162 66 170 84C174 94 172 104 164 112C148 128 120 134 92 134C52 134 20 122 14 98Z', fish);
      s += K.part('M22 110C38 124 68 132 98 132C128 132 150 126 162 114C148 120 124 124 98 124C64 124 38 120 22 110Z', '#eef2ff', { line: '#a5b4fc', lw: 1.2 });
      s += K.line('M40 118L36 112M58 124L56 116M78 128L77 120M98 129V121M118 128L119 120M138 125L140 117', '#a5b4fc', 1.2, { op: 0.8 });
      s += `<g fill="#ffffff" opacity=".85"><circle cx="70" cy="64" r="1.8"/><circle cx="96" cy="58" r="2.2"/><circle cx="124" cy="64" r="1.6"/><circle cx="142" cy="74" r="2"/><circle cx="110" cy="72" r="1.4"/><circle cx="84" cy="70" r="1.4"/><circle cx="154" cy="88" r="1.6"/></g>`;
      s += K.gloss(50, 70, 10, 5, -30, 0.4);
      // глаз, улыбка, румянец
      s += `<g class="art-eyes">${K.eye(44, 90, 9.5, { iris: '#1d4ed8', lid: 'half', skin: '#5b8de0', look: [-0.3, 0.3] })}</g>`;
      s += K.line('M18 104Q30 112 46 108', INK, 2.6) + K.blush(40, 102, 5);
      // длинный плавник-крыло
      s += `<g class="art-wing" style="transform-origin:0% 0%">` + K.part('M66 112C80 132 104 148 134 152C122 142 112 128 104 116Z', '#60a5fa', { line: '#0f1e4a', lw: 1.8 }) + K.line('M76 118C90 132 106 142 124 148M88 116C98 126 108 134 118 140', '#dbeafe', 1.2, { op: 0.7 }) + '</g>';
      s += cloud(K, 160, 128, 0.85, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca', cls: 'art-float', d: 0.9 }) + cloud(K, 30, 140, 0.7, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca', flip: true, cls: 'art-float', d: 0.3 });
      s += K.spark(176, 120, 2.6, '#e0e7ff') + K.spark(60, 20, 2.6, '#ffffff', 'art-float') + K.spark(186, 20, 2.2, '#e0e7ff');
      return s;
    },

    // Птица Пэн: Кунь обернулась исполинской птицей — синие крылья распахнуты во всю ширь, как тучи, на кончиках завитки
    // облаков; золотая грудь в чешуйках и хохолок, грозный взгляд, золотой клюв; хвост — веер, как у рыбы Кунь. Взлетает
    // на вихре над волнами Северной пучины
    cn_peng(K) {
      const plum = { c1: '#bfdbfe', c2: '#1e3a8a', rim: '#eef0ff', rimK: 0.75, line: '#0f1e4a', texK: 0.3 };
      let s = K.aura('#a5b4fc', 100, 92, 0.42) + K.aura('#fde68a', 54, 74, 0.25);
      // волны и вихрь
      s += waves(K, -4, 204, 168, { step: 26, h: 16, c1: '#93c5fd', c2: '#1e3a8a', line: '#0f1e4a' });
      s += K.line('M56 162C78 150 122 150 144 162M66 148C86 138 114 138 134 148', '#e0e7ff', 2.4, { op: 0.75, cls: 'art-float' });
      // хвост-веер рыбы Кунь
      s += K.part('M100 120C88 136 74 150 58 166C80 166 92 158 100 146C108 158 120 166 142 166C126 150 112 136 100 120Z', '#3b82f6', { line: '#0f1e4a', lw: 2 }) + K.line('M100 136L72 162M100 136L88 164M100 136L112 164M100 136L128 162', '#dbeafe', 1.2, { op: 0.7 });
      // крылья-тучи во всю ширь
      const wd = 'M92 92C78 72 58 56 36 50C24 46 12 46 2 52C8 58 10 64 8 72C16 74 20 78 20 84C28 84 32 88 32 94C40 94 46 98 46 104C54 102 60 104 64 110C72 106 82 106 92 110Z';
      const prim = [[12, 64, 30, 162, '#1e3a8a'], [22, 76, 31, 144, '#2563eb'], [34, 88, 31, 128, '#1e3a8a'], [48, 98, 29, 114, '#2563eb'], [64, 104, 26, 102, '#1e3a8a'], [80, 104, 22, 94, '#2563eb']];
      const wing = `<g class="art-wing">` + prim.map(([x, y, l, r, c]) => K.leaf(x, y, l, r, c)).join('') + K.part(wd, '#2563eb', { line: '#0f1e4a', lw: 2 }) +
        `<path d="${wd}" fill="${K.lin(['#dbeafe', '#60a5fa', '#1e3a8a'], 0, 0, 0.3, 1)}" opacity=".85"/>` +
        K.part('M92 92C78 72 58 56 36 50C30 48 24 48 18 49C30 58 44 64 56 72C68 80 80 90 92 102Z', '#e0e7ff', { line: '#3730a3', lw: 1.4 }) +
        K.line('M10 66L44 70M22 80L52 80M34 92L60 90M48 102L70 98M66 108L80 102', '#eff6ff', 1.4, { op: 0.8 }) +
        K.line(spiral(28, 56, 0.8, 1.2) + spiral(52, 64, 0.8, 1.2), '#4338ca', 1.4, { op: 0.7 }) + '</g>';
      s += K.mirror(wing);
      s += cloud(K, 22, 104, 0.5, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca', cls: 'art-float' }) + cloud(K, 178, 104, 0.5, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca', flip: true, cls: 'art-float', d: 1 });
      // тело с золотой грудью
      s += K.vol('M100 62C116 62 126 78 126 98C126 116 116 128 100 132C84 128 74 116 74 98C74 78 84 62 100 62Z', plum);
      s += `<path d="M100 72C110 76 116 86 115 100C114 112 108 120 100 124C92 120 86 112 85 100C84 86 90 76 100 72Z" fill="${K.lin(['#fff3b0', '#fbbf24', '#d97706'])}" stroke="#92400e" stroke-width="1.2"/>`;
      s += K.line(scaleRow(90, 110, 88, 6.7) + scaleRow(88, 112, 99, 8) + scaleRow(90, 110, 110, 6.7), '#b45309', 1.2, { op: 0.8 });
      // лапы с когтями
      s += K.mirror(K.line('M92 126L88 140M88 140l-5 3M88 140l0 5M88 140l5 2', '#f59e0b', 2.6));
      // хохолок: три золотых пера
      s += K.g(K.leaf(98, 40, 24, -124, '#fbbf24') + K.leaf(102, 40, 24, -56, '#fbbf24') + K.leaf(100, 38, 30, -90, '#f59e0b'), '', 'art-spin-soft');
      // голова
      s += K.vol(K.ell(100, 50, 19, 17), plum);
      s += K.gloss(90, 41, 5, 3, -35, 0.5);
      s += K.eyes(100, 48, 9, 6.4, { iris: '#f59e0b', lid: 'angry', skin: '#4f74c8', look: [0, 0.2] });
      s += `<path d="M92 58Q100 54 108 58Q108 66 100 74Q99 66 92 58Z" fill="${K.lin(['#fff3b0', '#f59e0b'])}" stroke="#7a3a08" stroke-width="1.5" stroke-linejoin="round"/>`;
      s += K.spark(20, 100, 3.4, '#fde68a', 'art-float') + K.spark(180, 100, 3.4, '#fde68a', 'art-float') + K.spark(100, 10, 2.6, '#ffffff') + K.spark(160, 140, 2.4, '#e0e7ff');
      return s;
    },

    // Бифан: одноногий журавль из «Каталога гор и морей» — сине-бирюзовый, в красных пятнах, с белым клювом и алой шапочкой;
    // стоит на единственной ноге среди тлеющих угольков и, раскрыв клюв, выкрикивает «би-фан!» — с клюва срываются огоньки
    cn_bifang(K) {
      const tq = { c1: '#99f6e4', c2: '#0f766e', rim: '#ffe29a', rimK: 0.6, line: '#042f2e', texK: 0.2 };
      let s = K.aura('#ff7a1a', 90, 112, 0.36);
      // угольки и огоньки у ноги
      s += `<ellipse cx="104" cy="176" rx="46" ry="6" fill="${K.rad([[0, '#fb923c', 0.6], [1, '#7c2d12', 0]])}"/>` + `<g stroke="#450a0a" stroke-width="1.2"><circle cx="86" cy="175" r="5" fill="#7c2d12"/><circle cx="122" cy="176" r="4.4" fill="#991b1b"/><circle cx="96" cy="178" r="3.4" fill="#b45309"/></g>`;
      s += K.flame(78, 176, 22, 13, '#fff3b0', '#ff7a1a', { style: 'animation-delay:-.3s' }) + K.flame(132, 176, 26, 15, '#fff3b0', '#ef4444', { style: 'animation-delay:-.8s' }) + K.flame(146, 177, 16, 10, '#fff3b0', '#ff7a1a');
      // единственная нога
      s += K.line('M106 136L104 154L108 172', '#7f1d1d', 6) + K.line('M106 136L104 154L108 172', '#ef4444', 3.4) + K.line('M108 172l-10 3M108 172l2 6M108 172l10 2', '#7f1d1d', 3);
      // хвостик и тело
      s += K.part('M138 118C152 114 166 118 176 128C166 128 160 132 156 140C150 136 144 130 138 128Z', '#134e4a', { line: '#042f2e', lw: 1.6 }) + K.line('M146 122L170 128M146 128L160 136', '#5eead4', 1.1, { op: 0.6 });
      s += K.vol('M104 84C128 84 146 98 146 116C146 132 130 140 110 140C88 140 70 132 70 116C70 102 84 84 104 84Z', tq);
      // сложенное крыло в красных пятнах
      s += K.part('M94 98C114 92 138 98 148 112C152 120 150 128 144 132C128 128 110 120 94 108Z', '#2dd4bf', { line: '#042f2e', lw: 1.6 });
      s += `<g fill="#ef4444" stroke="#7f1d1d" stroke-width=".8"><circle cx="112" cy="104" r="3.4"/><circle cx="126" cy="110" r="3"/><circle cx="138" cy="118" r="2.6"/><circle cx="84" cy="116" r="3.2"/><circle cx="96" cy="126" r="2.8"/><circle cx="118" cy="128" r="2.4"/></g>`;
      s += K.line('M130 112L146 124M122 116L140 128', '#042f2e', 1.2, { op: 0.5 });
      // шея и голова в профиль
      const neck = 'M90 96C78 88 70 76 74 62';
      s += K.line(neck, '#042f2e', 15) + K.line(neck, K.lin(['#99f6e4', '#14b8a6']), 11) + `<g fill="#ef4444" stroke="#7f1d1d" stroke-width=".7"><circle cx="78" cy="80" r="2.2"/><circle cx="74" cy="70" r="1.8"/></g>`;
      s += K.vol(K.ell(76, 54, 16, 14), tq);
      s += K.part('M66 44C68 36 82 34 88 42C82 42 74 44 70 48Z', '#ef4444', { line: '#7f1d1d', lw: 1.2 });
      // раскрытый белый клюв и огоньки
      s += `<path d="M62 50L30 44L60 56Z" fill="${K.lin(['#ffffff', '#e2e8f0'])}" stroke="#334155" stroke-width="1.5" stroke-linejoin="round"/><path d="M61 59L36 62L61 63Z" fill="${K.lin(['#ffffff', '#cbd5e1'])}" stroke="#334155" stroke-width="1.5" stroke-linejoin="round"/>`;
      s += K.g(K.flame(26, 54, 14, 9, '#fff3b0', '#f97316'), 'rotate(-80 26 54)') + K.spark(18, 66, 3, '#fde68a') + K.spark(22, 40, 2.4, '#fff3b0', 'art-float');
      s += `<g class="art-eyes">${K.eye(78, 52, 7, { iris: '#b45309', look: [-0.6, 0] })}</g>` + K.blush(84, 62, 3.6);
      s += K.spark(170, 60, 3, '#ffe08a', 'art-float') + K.spark(40, 120, 2.6, '#ffd23f') + K.spark(178, 160, 2.4, '#fff3b0');
      return s;
    },

    // Суаньни: сын дракона, похожий на львёнка, — рыжий, с бирюзовой гривой-кудряшками, сидит на крышке бронзовой
    // курильницы-дин и блаженно жмурится, вдыхая завитки дыма; лапки сложены, хвост с кисточкой-кудрей
    cn_suanni(K) {
      const fur = { c1: '#ffcf8a', c2: '#d9640e', rim: '#ffe29a', rimK: 0.65, line: '#5a2206', texK: 0.2 };
      const bronze = { c1: '#7fd8c0', c2: '#1f5f52', rim: '#ffe29a', rimK: 0.5, line: '#0b2e27', texK: 0.15 };
      let s = K.aura('#ff9a3d', 92, 108, 0.36);
      // завитки дыма
      const smoke = (d, dl, w) => `<g class="art-float" style="animation-delay:-${dl}s">${K.line(d, '#94a3b8', w + 2.4, { op: 0.35 })}${K.line(d, '#f8fafc', w, { op: 0.9 })}</g>`;
      s += smoke('M50 130C38 116 52 102 42 88C34 76 42 60 56 62C64 64 62 74 54 72', 0.2, 3.2) + smoke('M150 130C162 116 148 102 158 88C166 76 158 60 144 62C136 64 138 74 146 72', 1.1, 3.2);
      s += smoke('M30 120C24 110 30 102 26 92C24 86 28 80 34 82', 0.7, 2.2) + smoke('M170 120C176 110 170 102 174 92C176 86 172 80 166 82', 1.6, 2.2);
      // курильница-дин: ножки, чаша с ушками, крышка
      s += K.mirror(K.part('M66 166L62 180H72L76 168Z', '#1f5f52', { line: '#0b2e27', lw: 1.4 }));
      s += K.mirror(K.part('M56 134C50 132 48 126 51 122C54 120 58 122 59 126Z', '#2a7a68', { line: '#0b2e27', lw: 1.6 }));
      s += K.vol('M52 138H148C148 160 128 172 100 172C72 172 52 160 52 138Z', bronze);
      s += K.line('M58 150Q100 160 142 150', '#fbbf24', 2.4) + K.line('M70 146l6 6l6-6l6 6l6-6l6 6l6-6l6 6l6-6l6 6l6-6', '#fbbf24', 1.2, { op: 0.8 });
      s += K.part('M46 132H154V142H46Z', '#2a7a68', { line: '#0b2e27', lw: 1.6 }) + K.line('M48 136H152', '#fbbf24', 1.4, { op: 0.8 });
      // хвост
      s += K.line('M130 128C152 130 160 112 150 100', '#5a2206', 8) + K.line('M130 128C152 130 160 112 150 100', '#f59e0b', 4.6) + curl(K, 150, 98, 7, '#2dd4bf', '#0b4a3f');
      // тело и лапки
      s += K.vol('M100 92C122 92 136 108 136 124C136 136 124 140 100 140C76 140 64 136 64 124C64 108 78 92 100 92Z', fur);
      s += K.part('M100 104C112 104 120 114 120 126C120 136 112 140 100 140C88 140 80 136 80 126C80 114 88 104 100 104Z', '#fff1d6', { flat: true, lw: 0, op: 0.9 });
      s += K.mirror(K.vol(K.ell(88, 136, 9, 6.5), { ...fur, tex: false, lw: 2 }) + K.line('M84 136v4M89 137v4', '#5a2206', 1.1, { op: 0.6 }));
      // грива-кудряшки
      for (let i = 0; i < 12; i++) { const a = (-200 + i * 20) * Math.PI / 180; s += curl(K, r1(100 + 44 * Math.cos(a)), r1(70 + 38 * Math.sin(a)), 10, i % 2 ? '#2dd4bf' : '#14b8a6', '#0b4a3f'); }
      // голова
      s += K.vol('M100 38C124 38 140 54 140 74C140 94 124 106 100 106C76 106 60 94 60 74C60 54 76 38 100 38Z', fur);
      s += K.part('M100 76C114 76 124 84 124 94C124 102 114 106 100 106C86 106 76 102 76 94C76 84 86 76 100 76Z', '#fff1d6', { line: '#d9a066', lw: 1.2 });
      s += K.gloss(78, 54, 8, 4.5, -35, 0.45);
      s += K.mirror(curl(K, 80, 52, 5, '#2dd4bf', '#0b4a3f'));
      // блаженно зажмурился
      s += K.closed(100, 70, 15, 7, true) + K.blush(74, 84, 6) + K.blush(126, 84, 6);
      s += `<ellipse cx="100" cy="84" rx="6" ry="4.4" fill="#5a1a0a" stroke="${INK}" stroke-width="1.2"/><ellipse cx="98" cy="82.8" rx="2" ry="1.1" fill="#fff" opacity=".6"/>`;
      s += K.mouth('cat', 100, 92, 12);
      s += K.spark(24, 50, 3, '#ffe08a', 'art-float') + K.spark(178, 52, 2.6, '#fff3b0') + K.spark(186, 150, 2.4, '#ffd23f');
      return s;
    },

    // Бяньфу: красная летучая мышь удачи («фу» — и мышь, и счастье) — круглое тельце, большие уши, крылья-перепонки
    // с золотыми косточками, на брюшке золотой медальон-завиток, в лапках красный узелок с кисточкой. Вокруг ещё четыре
    // мышки — вместе пять благ; в небе серп луны
    cn_bianfu(K) {
      const red = { c1: '#ff8a8a', c2: '#b91c1c', rim: '#e9d5ff', rimK: 0.6, line: '#450a0a', texK: 0.3 };
      let s = K.aura('#c084fc', 90, 100, 0.38);
      s += crescent(K, 164, 30, 15, { c: '#fde68a', line: '#a16207' });
      // ещё четыре мышки — вместе пять благ
      const mini = (x, y, k, d) => `<g class="art-float" style="animation-delay:-${d}s"><g transform="translate(${x} ${y}) scale(${k})"><path d="M0 0C-4 -5 -11 -5 -15 -1C-11 0 -10 2 -11 5C-8 3 -6 4 -5 7C-3 4 -1 3 0 5C1 3 3 4 5 7C6 4 8 3 11 5C10 2 11 0 15 -1C11 -5 4 -5 0 0Z" fill="#ef4444" stroke="#450a0a" stroke-width="${r1(1.2 / k)}" stroke-linejoin="round"/><circle cx="0" cy="1" r="3" fill="#ef4444" stroke="#450a0a" stroke-width="${r1(1 / k)}"/></g></g>`;
      s += mini(34, 40, 1.1, 0.2) + mini(170, 76, 0.95, 0.9) + mini(26, 132, 0.9, 1.4) + mini(174, 140, 1.05, 0.5);
      // крылья-перепонки
      const wd = 'M80 96C66 80 46 72 18 78C24 86 26 92 24 102C32 100 38 104 40 112C46 108 54 110 58 116C64 110 72 108 82 110Z';
      const wing = `<g class="art-wing">` + K.part(wd, '#dc2626', { line: '#450a0a', lw: 2 }) + `<path d="${wd}" fill="${K.lin(['#fca5a5', '#dc2626', '#7f1d1d'], 0, 0, 0.3, 1)}" opacity=".8"/>` +
        K.line('M80 98L22 80M80 100L26 102M80 102L42 112M80 104L60 116', '#fbbf24', 1.6, { op: 0.9 }) + '</g>';
      s += K.mirror(wing);
      // уши
      s += K.mirror(K.vol('M70 80C62 66 60 52 64 40C78 44 90 54 96 68Z', red) + K.part('M74 74C68 64 67 54 69 46C78 50 86 58 90 66Z', '#fecdd3', { line: '#9f1239', lw: 1 }));
      // красный узелок с кисточкой в лапках
      s += K.line('M100 120V132', '#991b1b', 2) + K.rhomb(100, 138, 7, '#dc2626', '#450a0a') + K.rhomb(100, 138, 3, '#fbbf24', '#78350f') + tassel(K, 100, 145, 26, '#dc2626', 0.4);
      // тельце
      s += K.vol('M100 62C124 62 136 78 136 96C136 114 122 126 100 126C78 126 64 114 64 96C64 78 76 62 100 62Z', red);
      s += `<circle cx="100" cy="112" r="7" fill="${K.rad([[0, '#fffbe6'], [0.6, '#fbbf24'], [1, '#b45309']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.2"/>` + K.line(spiral(100, 112, 0.6, 1.4), '#92400e', 1.1);
      s += K.mirror(K.part(K.ell(88, 124, 5, 4), '#7f1d1d', { lw: 1.2, line: '#450a0a' }));
      s += K.gloss(80, 74, 8, 4.5, -35, 0.45);
      s += K.eyes(100, 88, 15, 10.5, { iris: '#7c3aed', look: [0.1, 0.2] });
      s += K.blush(74, 100, 5.5) + K.blush(126, 100, 5.5);
      s += `<ellipse cx="100" cy="98" rx="3.4" ry="2.4" fill="#450a0a"/>` + K.mouth('cat', 100, 102, 10) + `<path d="M95.5 102.5l1.4 3.4l1.2-3.2Z" fill="#fff"/>`;
      s += K.spark(60, 18, 2.6, '#e9d5ff', 'art-float') + K.spark(132, 168, 2.4, '#fde68a') + K.spark(186, 108, 2.2, '#e9d5ff');
      return s;
    },

    // Цзинвэй: маленькая упрямая птичка, похожая на воронёнка, — сине-чёрная, с узорной головкой (белая маска, алые и золотые
    // крапинки на темени), белым клювом и красными лапками; летит над морем, раскинув крылья, брови решительно сдвинуты,
    // в клюве камешек; внизу волны, куда падают камешки, вокруг завитки ветра
    cn_jingwei(K) {
      const pl = { c1: '#8b9fc8', c2: '#1e2a4a', rim: '#eef0ff', rimK: 0.7, line: '#0b1120', texK: 0.3 };
      let s = K.aura('#a5b4fc', 92, 100, 0.38);
      s += K.line('M14 40q12-8 24 0t22 0M146 30q12-8 24 0t20 0M156 126q10-6 20 0', '#e0e7ff', 2.2, { op: 0.6, cls: 'art-float' });
      // море и падающие камешки
      s += waves(K, -4, 204, 164, { step: 26, h: 20 });
      s += `<g fill="#9ca3af" stroke="#374151" stroke-width="1"><ellipse cx="62" cy="150" rx="4" ry="3"/><ellipse cx="140" cy="140" rx="3.4" ry="2.6"/></g>` + K.line('M56 160l-4-6M68 160l4-6M134 156l-3-5M146 156l3-5', '#e0f2fe', 1.8);
      // крылья раскинуты
      const wd = 'M84 104C68 96 48 86 22 64C30 64 36 66 40 68C34 60 32 52 34 44C42 52 48 58 54 62C54 54 56 48 60 44C64 56 72 70 86 86Z';
      const wing = `<g class="art-wing">` + K.part(wd, '#334155', { line: '#0b1120', lw: 2 }) + `<path d="${wd}" fill="${K.lin(['#c7d2fe', '#4b5f8f', '#1e2a4a'], 0, 0, 0.3, 1)}" opacity=".85"/>` +
        K.line('M26 66C46 80 64 92 82 100M38 48C50 64 64 80 84 94M60 46C66 62 74 76 86 90', '#f1f5f9', 1.2, { op: 0.6 }) + '</g>';
      s += K.mirror(wing);
      // хвостик и красные лапки
      s += K.part('M92 128C88 140 82 148 74 154C86 156 96 150 100 142C104 150 114 156 126 154C118 148 112 140 108 128Z', '#1e293b', { line: '#0b1120', lw: 1.6 });
      s += K.mirror(K.line('M92 126L88 138M88 138l-4 3M88 138l0 5M88 138l4 3', '#ef4444', 2.6));
      // тельце
      s += K.vol('M100 80C120 80 132 96 132 112C132 126 118 134 100 134C82 134 68 126 68 112C68 96 80 80 100 80Z', pl);
      s += K.part('M100 98C112 98 120 108 120 118C120 128 112 132 100 132C88 132 80 128 80 118C80 108 88 98 100 98Z', '#e2e8f0', { flat: true, lw: 0, op: 0.7 });
      // узорная головка
      s += K.vol('M100 34C122 34 134 48 134 64C134 80 120 90 100 90C80 90 66 80 66 64C66 48 78 34 100 34Z', pl);
      s += K.part('M100 50C114 50 126 58 128 70C120 84 110 88 100 88C90 88 80 84 72 70C74 58 86 50 100 50Z', '#f8fafc', { line: '#64748b', lw: 1 });
      s += `<g stroke="#7f1d1d" stroke-width=".8"><circle cx="100" cy="40" r="3.2" fill="#ef4444"/><circle cx="88" cy="43" r="2.4" fill="#fbbf24"/><circle cx="112" cy="43" r="2.4" fill="#fbbf24"/><circle cx="78" cy="49" r="2" fill="#ef4444"/><circle cx="122" cy="49" r="2" fill="#ef4444"/></g>`;
      s += K.eyes(100, 64, 13, 8.5, { iris: '#b45309', lid: 'angry', skin: '#94a3b8', look: [0, 0.3] });
      s += K.blush(78, 76, 4.6) + K.blush(122, 76, 4.6);
      // белый клюв с камешком
      s += `<path d="M92 76Q100 72 108 76Q106 84 100 88Q94 84 92 76Z" fill="${K.lin(['#ffffff', '#e2e8f0'])}" stroke="#334155" stroke-width="1.4" stroke-linejoin="round"/>`;
      s += `<ellipse cx="100" cy="90" rx="6" ry="4.6" fill="${K.rad([[0, '#e5e7eb'], [1, '#6b7280']], 0.35, 0.3)}" stroke="#374151" stroke-width="1.2"/>`;
      s += K.spark(26, 92, 3, '#e0e7ff', 'art-float') + K.spark(180, 84, 2.6, '#ffffff') + K.spark(40, 20, 2.4, '#e0e7ff');
      return s;
    },

    // Женьшенёк: тысячелетний корень женьшеня в облике румяного малыша — выглядывает из цветочного горшка, на макушке
    // пальчатые листья и гроздь красных ягод, на груди красный нагрудник с золотым ромбом; ручки-корешки машут, а к листику
    // привязана красная нитка, чтобы не удрал
    cn_zhenshenyonok(K) {
      const root = { c1: '#fff1c4', c2: '#c9873a', rim: '#e4ffb0', rimK: 0.6, line: '#5a3208', texK: 0.15 };
      let s = K.aura('#84cc16', 90, 110, 0.34);
      // листья женьшеня и ягоды
      const pal = (x, y, rot) => K.g([-50, -25, 0, 25, 50].map(a => K.leaf(0, 0, a === 0 ? 22 : 18, a - 90, '#65a30d')).join(''), `translate(${x} ${y}) rotate(${rot})`);
      s += K.line('M96 52C86 40 74 32 60 30M104 52C114 40 126 32 140 30M100 50V30', '#3f6212', 2.4);
      s += pal(60, 30, -50) + pal(140, 30, 50) + pal(100, 26, 0);
      s += K.line('M100 50C100 42 100 34 100 24', '#3f6212', 1.6) + `<g stroke="#7f1d1d" stroke-width=".8">${[[100, 20], [96, 24], [104, 24], [100, 27], [93, 19], [107, 19]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${K.rad([[0, '#fecaca'], [1, '#dc2626']], 0.35, 0.3)}"/>`).join('')}</g>`;
      // красная нитка от листика
      s += `<g class="art-sway" style="transform-origin:0 0">` + K.line('M136 34C150 52 140 74 156 92C170 108 164 130 176 146', '#dc2626', 2) + `<circle cx="136" cy="34" r="2.6" fill="#dc2626" stroke="#7f1d1d"/></g>`;
      // ручка-корешок машет
      s += K.line('M68 104C56 96 50 84 46 72', '#5a3208', 8) + K.line('M68 104C56 96 50 84 46 72', '#e8b770', 5) + K.line('M46 72l-6-4M46 72l-2-7M46 72l3-6', '#5a3208', 2);
      // тельце-корень и голова
      s += K.vol('M100 96C120 96 132 110 132 128C132 140 120 146 100 146C80 146 68 140 68 128C68 110 80 96 100 96Z', root);
      s += K.part('M100 104L118 122L100 140L82 122Z', '#dc2626', { line: '#7f1d1d', lw: 1.6 }) + K.rhomb(100, 122, 6, '#fbbf24', '#78350f');
      s += K.vol('M100 46C124 46 140 62 140 80C140 98 124 110 100 110C76 110 60 98 60 80C60 62 76 46 100 46Z', root);
      s += K.line('M70 62C76 60 80 62 84 58M118 58C122 62 126 60 130 62', '#c9873a', 1.2, { op: 0.7 });
      s += K.gloss(76, 62, 8, 4.5, -35, 0.45);
      s += K.eyes(100, 80, 17, 11.5, { iris: '#15803d', look: [0.2, 0.25] });
      s += K.blush(68, 94, 7) + K.blush(132, 94, 7);
      s += K.mouth('grin', 100, 96, 14);
      // корешки-бородка
      s += K.line('M92 108l-3 6M100 110v6M108 108l3 6', '#c9873a', 1.4, { op: 0.8 });
      // цветочный горшок
      s += K.vol('M58 140H142L134 178H66Z', { c1: '#fdba74', c2: '#9a3412', rim: '#e4ffb0', rimK: 0.5, line: '#431407', texK: 0.12 });
      s += K.part('M52 132H148V146H52Z', '#ea580c', { line: '#431407', lw: 1.8 }) + K.line('M66 160Q100 168 134 160', '#fed7aa', 1.6, { op: 0.6 });
      // ручка держится за край горшка
      s += K.part(K.ell(132, 134, 8, 6), '#e8b770', { line: '#5a3208', lw: 1.8 }) + K.line('M128 138l-2 5M133 139l0 5', '#5a3208', 1.2, { op: 0.6 });
      s += K.spark(30, 120, 3, '#e4ffb0', 'art-float') + K.spark(172, 70, 2.6, '#fde68a') + K.spark(24, 40, 2.4, '#e4ffb0');
      return s;
    },

    // Фэйфэй: зверёк из «Каталога гор и морей», похожий на дикого котика, — золотисто-рыжий, с кремовой гривкой-воротником
    // и огромным белым пушистым хвостом; сидит на подушке совершенно безмятежный, вокруг кружат листики и искорки
    cn_feifei(K) {
      const fur = { c1: '#ffe2a8', c2: '#c8862a', rim: '#e4ffb0', rimK: 0.6, line: '#4a2a06', texK: 0.15 };
      let s = K.aura('#84cc16', 92, 110, 0.34);
      // подушка
      s += K.vol('M38 160C38 150 60 146 100 146C140 146 162 150 162 160C162 172 140 178 100 178C60 178 38 172 38 160Z', { c1: '#bbf7d0', c2: '#15803d', rim: '#e4ffb0', line: '#14532d', tex: false, lw: 2.2 });
      s += K.stitch('M46 160Q100 170 154 160', '#fde68a', 1.6) + K.mirror(K.line('M38 160l-8-4M38 160l-8 4', '#fde68a', 2));
      // пушистый белый хвост
      const tail = 'M128 150C146 156 168 150 176 132C184 128 186 118 180 112C184 104 180 94 172 92C170 84 160 80 152 84C144 80 134 86 136 94C138 102 146 104 152 102C158 104 160 112 156 118C158 126 152 134 144 136C138 140 132 140 128 138Z';
      s += K.vol(tail, { c1: '#ffffff', c2: '#cbd5e1', rim: '#e4ffb0', rimK: 0.7, line: '#475569', tex: false });
      s += K.line('M150 92C160 96 166 106 166 118M140 132C150 132 160 126 164 116', '#e2e8f0', 1.6, { op: 0.9 });
      // тельце и лапки
      s += K.vol('M100 96C124 96 136 114 136 132C136 148 124 156 100 156C76 156 64 148 64 132C64 114 76 96 100 96Z', fur);
      s += K.part('M100 110C112 110 120 122 120 134C120 146 112 154 100 154C88 154 80 146 80 134C80 122 88 110 100 110Z', '#fff7e6', { flat: true, lw: 0, op: 0.9 });
      s += K.mirror(K.vol(K.ell(86, 152, 10, 6.5), { ...fur, tex: false, lw: 2 }) + K.line('M82 152v4M88 153v4', '#4a2a06', 1.1, { op: 0.6 }));
      // ушки с кисточками
      s += K.mirror(K.vol('M64 64C58 50 58 38 64 28C74 34 82 42 86 52Z', fur) + K.part('M67 58C64 48 64 40 67 34C73 38 77 44 80 50Z', '#fecdd3', { line: '#9f1239', lw: 1 }) + K.line('M64 28l-2-8M64 28l3-7', '#4a2a06', 1.6));
      // гривка-воротник
      s += K.part('M62 96C60 104 66 108 70 110C72 116 80 118 86 116C90 122 96 122 100 120C104 122 110 122 114 116C120 118 128 116 130 110C134 108 140 104 138 96C128 104 72 104 62 96Z', '#fff7e6', { line: '#c8862a', lw: 1.4 });
      // голова
      s += K.vol('M100 40C126 40 142 56 142 76C142 96 124 106 100 106C76 106 58 96 58 76C58 56 74 40 100 40Z', fur);
      s += K.line('M92 46l2 8M100 44v9M108 46l-2 8', '#a8641a', 2.2, { op: 0.8 });
      s += K.part('M100 78C112 78 124 84 128 94C120 102 110 106 100 106C90 106 80 102 72 94C76 84 88 78 100 78Z', '#fff7e6', { flat: true, lw: 0 });
      s += K.gloss(76, 56, 8, 4.5, -35, 0.45);
      s += K.eyes(100, 74, 17, 11, { iris: '#65a30d', look: [0.15, 0.3] });
      s += K.blush(70, 90, 6.5) + K.blush(130, 90, 6.5);
      s += `<path d="M96 86H104L100 90Z" fill="#f472b6" stroke="#9d174d" stroke-width="1" stroke-linejoin="round"/>` + K.mouth('cat', 100, 92, 11);
      s += K.mirror(K.line('M72 88L56 86M72 92L58 95', '#4a2a06', 1.2, { op: 0.5 }));
      // листики и искорки покоя
      s += K.g(K.leaf(30, 60, 12, -30, '#84cc16') + K.leaf(172, 50, 11, 200, '#65a30d') + K.leaf(28, 120, 10, 20, '#a3e635'), '', 'art-float');
      s += K.spark(176, 150, 3, '#e4ffb0', 'art-float') + K.spark(44, 30, 2.6, '#fde68a') + K.spark(160, 20, 2.4, '#e4ffb0');
      return s;
    },

    // Цзао-ван: бог очага — добродушный усач в чиновничьей шапке с крылышками и жёлтом халате выглядывает из-за кирпичной
    // печки-цзао: в топке пляшет огонь, на плите котёл с паром. В руке горшочек мёда — губы у него намазаны мёдом,
    // и с них капает: доклад Небу будет только сладким
    cn_zaowang(K) {
      const skin = '#f8cfa6', robe = { c1: '#fff1a8', c2: '#d48a0e', rim: '#ffe29a', rimK: 0.6, line: '#5a3208', texK: 0.2 };
      let s = K.aura('#ff9a3d', 96, 104, 0.4);
      // пар от котла
      s += `<g class="art-float">${K.line('M46 112C36 98 50 88 42 74C36 64 44 54 54 58', '#f8fafc', 3.4, { op: 0.85 })}${K.line('M30 110C24 100 34 92 28 82', '#f8fafc', 2.4, { op: 0.75 })}</g>`;
      // шапка-ушамао с крылышками
      s += K.mirror(K.part('M70 34C58 32 44 34 34 38C36 42 44 44 52 42C60 42 66 40 72 40Z', '#1f2937', { line: '#05060c', lw: 1.6 }));
      // туловище в халате за печкой
      s += K.vol('M100 76C126 76 142 90 146 112L150 140H50L54 112C58 90 74 76 100 76Z', robe);
      s += K.part('M84 80L100 104L116 80C110 78 90 78 84 80Z', '#dc2626', { line: '#7f1d1d', lw: 1.4 }) + K.line('M100 104V138', '#b45309', 1.4, { op: 0.6 });
      s += K.line('M60 128H140', '#dc2626', 4) + K.stitch('M62 120Q100 128 138 120', '#fde68a', 1.6);
      // рука с горшочком мёда
      s += K.vol('M136 100C150 104 156 114 154 126C150 132 142 130 140 124C140 118 136 112 130 110Z', robe);
      s += `<path d="M140 104C140 96 160 96 160 104L162 126C162 134 138 134 138 126Z" fill="${K.lin(['#fde68a', '#f59e0b', '#b45309'])}" stroke="#78350f" stroke-width="1.6"/>` + K.part('M138 100H162V106H138Z', '#92400e', { line: '#451a03', lw: 1.2 });
      s += `<path d="M146 106q-2 6 0 10q2 2 3-1q-1-5-3-9z" fill="#fbbf24" stroke="#b45309" stroke-width=".8"/>` + K.part(K.ell(148, 124, 6, 5.5), skin, { line: '#9a5a3a', lw: 1.4 });
      // голова
      s += K.vol(K.ell(100, 56, 22, 22), { c1: skin, c2: '#d99a6a', rim: '#fff3d6', tex: false, lw: 2.2, line: '#7a4a2a' });
      s += K.vol('M74 46C74 26 86 18 100 18C114 18 126 26 126 46C116 40 84 40 74 46Z', { c1: '#4b5563', c2: '#0b0f19', rim: '#fde68a', rimK: 0.4, line: '#05060c', lw: 2, tex: false });
      s += K.line('M74 46C86 40 114 40 126 46', '#fbbf24', 2.4) + K.rhomb(100, 34, 4, '#ef4444', '#450a0a');
      s += K.closed(100, 56, 9, 5.5, true) + K.mirror(K.line('M84 47Q90 44 96 47', '#1f1a24', 2.4));
      s += K.blush(82, 66, 4.6) + K.blush(118, 66, 4.6);
      // усы, бородка и медовые губы
      s += K.part('M88 72C92 68 98 68 100 70C102 68 108 68 112 72C108 72 104 74 100 73C96 74 92 72 88 72Z', '#1f1a24', { lw: 0 });
      s += `<path d="M94 75Q100 80 106 75Q100 77 94 75Z" fill="#fbbf24" stroke="#b45309" stroke-width="1.2"/><path d="M104 77q1 4 0 6q-2 0-1-3z" fill="#fbbf24" stroke="#b45309" stroke-width=".8"/>`;
      s += K.part('M94 80C94 90 98 96 100 100C102 96 106 90 106 80C102 82 98 82 94 80Z', '#1f1a24', { lw: 0 });
      // печка-цзао: кирпичи, топка с огнём, плита и котёл
      s += K.part('M24 136H176V178H24Z', '#b4532a', { line: '#431407', lw: 2 }) + K.line('M24 150H176M24 164H176M44 136V150M84 136V150M124 136V150M164 136V150M64 150V164M104 150V164M144 150V164M44 164V178M84 164V178M124 164V178M164 164V178', '#7c2d12', 1.4, { op: 0.6 });
      s += K.part('M20 128H180V138H20Z', '#9ca3af', { line: '#374151', lw: 1.6 });
      s += `<path d="M78 178V160C78 148 122 148 122 160V178Z" fill="#1c0a05" stroke="#431407" stroke-width="1.6"/><ellipse cx="100" cy="172" rx="22" ry="8" fill="${K.rad([[0, '#fde68a', 0.9], [1, '#f97316', 0]])}"/>`;
      s += K.flame(92, 178, 18, 12, '#fff3b0', '#ff7a1a', { style: 'animation-delay:-.4s' }) + K.flame(108, 178, 22, 13, '#fff3b0', '#ef4444');
      s += K.part('M26 128C26 112 70 112 70 128Z', '#374151', { line: '#0b0f19', lw: 1.6 }) + K.line('M24 128H72', '#1f2937', 3) + K.line('M34 118Q48 112 60 118', '#9ca3af', 1.4, { op: 0.7 });
      s += K.spark(24, 40, 3, '#fff3b0', 'art-float') + K.spark(178, 30, 2.6, '#ffe08a') + K.spark(20, 100, 2.4, '#ffd23f');
      return s;
    },

    // Чжуцюэ: Алая птица Юга — вся из пламени: крылья раскрыты веером огненных перьев, хвост — два длинных огненных
    // пера с завитками, золотая грудка в чешуйках, хохолок из трёх язычков огня, грозный взгляд; позади — жаркое южное солнце
    cn_zhuque(K) {
      const red = { c1: '#ff9a7a', c2: '#c2180c', rim: '#ffe29a', rimK: 0.75, line: '#4c0808', texK: 0.25 };
      let s = `<circle class="art-aura" cx="100" cy="92" r="96" fill="${K.rad([[0.2, '#fde047', 0.45], [0.6, '#f97316', 0.3], [1, '#dc2626', 0]])}"/>`;
      s += `<circle cx="100" cy="88" r="40" fill="${K.rad([[0, '#fffbe6', 0.9], [0.7, '#fde047', 0.5], [1, '#f97316', 0]])}"/>`;
      // хвост: два огненных пера с завитками
      const tail = 'M94 128C82 150 58 162 36 158C22 154 20 140 32 138C40 136 44 144 38 148';
      const tl = K.line(tail, '#4c0808', 11) + K.line(tail, K.lin(['#fde047', '#f97316', '#dc2626']), 7) + K.line(tail, '#fff3b0', 2, { op: 0.8 });
      s += `<g class="art-sway" style="transform-origin:100% 0">${tl}</g><g class="art-sway" style="transform-origin:0 0;animation-delay:-1s"><g transform="translate(200 0) scale(-1 1)">${tl}</g></g>`;
      s += K.flame(100, 170, 34, 18, '#fff3b0', '#ef4444', { style: 'animation-delay:-.6s' });
      // крылья — веер огненных перьев
      const wing = [[-168, 48], [-148, 58], [-128, 64], [-108, 62], [-88, 54]].map(([a, L], i) => K.g(K.flame(92, 96, L, 24, i % 2 ? '#fde047' : '#fff3b0', i % 2 ? '#dc2626' : '#f97316', { style: `animation-delay:-${(i * 0.25).toFixed(2)}s` }), `rotate(${a + 90} 92 96)`)).join('');
      s += K.mirror(`<g class="art-wing">${wing}${K.part('M96 100C84 92 74 84 66 72C74 72 80 74 84 76C82 68 82 62 84 56C90 66 94 76 98 84Z', '#fbbf24', { line: '#92400e', lw: 1.4 })}</g>`);
      // тело
      s += K.vol('M100 68C116 68 124 84 124 100C124 118 114 132 100 136C86 132 76 118 76 100C76 84 84 68 100 68Z', red);
      s += `<path d="M100 78C110 82 116 94 115 106C114 118 108 126 100 130C92 126 86 118 85 106C84 94 90 82 100 78Z" fill="${K.lin(['#fff0a0', '#fbbf24', '#f97316'])}" stroke="#b45309" stroke-width="1.2"/>`;
      s += K.line(scaleRow(90, 110, 94, 6.7) + scaleRow(89, 111, 105, 7.3) + scaleRow(91, 109, 116, 6), '#c2410c', 1.2, { op: 0.8 });
      // хохолок-огоньки и голова
      s += K.g(K.flame(100, 40, 26, 13, '#fff3b0', '#ef4444'), 'rotate(-25 100 40)') + K.flame(100, 38, 30, 14, '#fff3b0', '#f97316', { style: 'animation-delay:-.5s' }) + K.g(K.flame(100, 40, 26, 13, '#fff3b0', '#ef4444', { style: 'animation-delay:-.9s' }), 'rotate(25 100 40)');
      s += K.vol(K.ell(100, 52, 16, 15), red);
      s += K.gloss(91, 44, 4.4, 2.6, -35, 0.5);
      s += K.eyes(100, 50, 7.5, 5.4, { iris: '#facc15', lid: 'angry', skin: '#e0452a', look: [0, 0.2] });
      s += `<path d="M94 60Q100 57 106 60Q105 67 100 72Q95 67 94 60Z" fill="${K.lin(['#fff3b0', '#f59e0b'])}" stroke="#7a3a08" stroke-width="1.5" stroke-linejoin="round"/>`;
      s += K.mirror(K.line('M94 134L92 146M92 146l-4 3M92 146l0 5M92 146l4 3', '#fbbf24', 2.4));
      s += K.spark(18, 100, 3.4, '#fff3b0', 'art-float') + K.spark(182, 100, 3.4, '#fff3b0', 'art-float') + K.spark(40, 20, 2.6, '#fde68a') + K.spark(160, 20, 2.6, '#fde68a');
      return s;
    },

    // Мэн-по: добрая бабушка Мэн у моста Найхэ — седой пучок со шпилькой, морщинки-улыбки, сиреневый халат с фартуком;
    // помешивает черпаком котёл с сиреневым супом забвения, над котлом плывут пар и забытые «?»; рядом стопка мисочек,
    // позади — горбатый мостик в тумане и красный фонарь
    cn_mengpo(K) {
      const skin = '#f6d3b8', robe = { c1: '#d8b4fe', c2: '#6b21a8', rim: '#e9d5ff', rimK: 0.6, line: '#2e1065', texK: 0.45 };
      let s = K.aura('#c084fc', 96, 104, 0.4);
      // мост Найхэ в тумане и фонарь
      s += `<path d="M-6 132Q46 70 112 112V124Q46 88 -6 146Z" fill="#a78bfa" stroke="#4c1d95" stroke-width="1.6" opacity=".55"/>` + K.line('M10 116v-9M30 101v-9M50 92v-9M70 92v-9M90 99v-9', '#6d28d9', 2, { op: 0.6 });
      s += K.line('M160 0V18', '#78350f', 1.6) + `<g class="art-sway" style="transform-origin:50% 0"><ellipse cx="160" cy="30" rx="10" ry="12" fill="${K.rad([[0, '#fde68a'], [0.5, '#ef4444'], [1, '#991b1b']])}" stroke="#450a0a" stroke-width="1.4"/><path d="M154 18H166M154 42H166" stroke="#fbbf24" stroke-width="2.4"/><path d="M160 44V52" stroke="#dc2626" stroke-width="2"/></g>` + `<circle class="art-aura" cx="160" cy="30" r="20" fill="${K.rad([[0, '#fde68a', 0.5], [1, '#f97316', 0]])}"/>`;
      // пар забвения с вопросиками
      const q = (x, y, k, d) => `<g class="art-float" style="animation-delay:-${d}s"><g transform="translate(${x} ${y}) scale(${k})"><path d="M-3 -5C-3 -9 3 -9 3 -5C3 -2 0 -2 0 1" fill="none" stroke="#f5f3ff" stroke-width="2" stroke-linecap="round"/><circle cx="0" cy="4.4" r="1.2" fill="#f5f3ff"/></g></g>`;
      s += `<g class="art-float">${K.line('M120 120C108 104 124 94 114 80C106 68 116 58 128 62', '#e9d5ff', 4, { op: 0.75 })}${K.line('M148 120C156 106 144 98 152 86', '#e9d5ff', 3, { op: 0.7 })}</g>`;
      s += q(136, 74, 1.4, 0.3) + q(120, 50, 1.1, 1.2) + q(150, 98, 1, 0.8);
      // туловище, фартук
      s += K.vol('M80 76C96 70 112 74 120 86L126 138H54L60 92C64 82 70 78 80 76Z', robe);
      s += K.part('M70 98H112L116 138H66Z', '#f5f3ff', { line: '#7c3aed', lw: 1.4 }) + K.line('M68 100Q90 106 114 100', '#7c3aed', 2.4);
      // котёл с супом и черпак
      s += K.vol('M70 128H170C170 156 150 172 120 172C90 172 70 156 70 128Z', { c1: '#6b7280', c2: '#111827', rim: '#e9d5ff', rimK: 0.6, line: '#030712', texK: 0.3 });
      s += `<ellipse cx="120" cy="128" rx="50" ry="9" fill="${K.rad([[0, '#f0abfc'], [0.7, '#a855f7'], [1, '#6b21a8']])}" stroke="#030712" stroke-width="2"/>` + `<g fill="#f5d0fe" opacity=".8"><circle cx="104" cy="127" r="2.4"/><circle cx="134" cy="129" r="1.8"/><circle cx="120" cy="125" r="1.4"/></g>`;
      s += K.mirror(K.line('M72 136l-8 2', '#374151', 4));
      s += K.line('M98 84L122 128', '#78350f', 3.6) + `<ellipse cx="123" cy="128" rx="7" ry="3" fill="#78350f" stroke="#451a03" stroke-width="1"/>`;
      s += K.vol('M82 92C88 96 94 100 98 104C100 110 94 114 90 110C86 104 82 100 78 98Z', robe) + K.part(K.ell(98, 90, 5.5, 5), skin, { line: '#9a6a4a', lw: 1.4 });
      // стопка мисочек
      s += [0, 1, 2].map(i => `<path d="M${26 - i * 0} ${172 - i * 9}H${54}Q${52} ${180 - i * 9} ${40} ${181 - i * 9}Q${28} ${180 - i * 9} ${26} ${172 - i * 9}Z" fill="${K.lin(['#ffffff', '#e0e7ff'])}" stroke="#4c1d95" stroke-width="1.4"/>` + K.line(`M28 ${175 - i * 9}H52`, '#60a5fa', 1.2, { op: 0.7 })).join('');
      // голова: седой пучок, морщинки, добрые глаза
      s += K.vol(K.ell(84, 58, 19, 19), { c1: skin, c2: '#d9a080', rim: '#fff3d6', tex: false, lw: 2.2, line: '#7a4a2a' });
      s += K.part('M66 56C64 40 74 34 84 34C94 34 104 40 102 56C98 48 92 44 84 44C76 44 70 48 66 56Z', '#f1f5f9', { line: '#64748b', lw: 1.4 });
      s += K.vol(K.ell(84, 30, 10, 8), { c1: '#ffffff', c2: '#cbd5e1', line: '#64748b', lw: 1.6, tex: false }) + K.line('M70 26L100 36', '#92400e', 2.4) + `<circle cx="70" cy="26" r="2.4" fill="#ef4444" stroke="#7f1d1d" stroke-width=".8"/>`;
      s += K.closed(84, 60, 7, 4.6, true) + K.line('M70 62l-3-1M70 66l-3 1M98 62l3-1M98 66l3 1', '#9a6a4a', 1, { op: 0.7 });
      s += K.blush(74, 68, 4) + K.blush(94, 68, 4) + K.mouth('smile', 84, 70, 9);
      s += K.spark(24, 60, 3, '#e9d5ff', 'art-float') + K.spark(184, 70, 2.6, '#fde68a') + K.spark(184, 150, 2.4, '#e9d5ff');
      return s;
    },

    // Нянь: новогоднее чудище — сиреневый зверь с золотым рогом, лохматой гривой и клычками; рядом с треском рвутся
    // красные хлопушки, и Нянь отпрянул: глаза круглые, шерсть дыбом, лапы вскинуты, капельки пота. На стене — красный ромб «фу»
    cn_nian(K) {
      const fur = { c1: '#c4b5fd', c2: '#5b21b6', rim: '#e9d5ff', rimK: 0.6, line: '#2e1065', texK: 0.45 };
      let s = K.aura('#c084fc', 96, 108, 0.4) + `<circle class="art-aura" cx="166" cy="70" r="40" fill="${K.rad([[0, '#fde047', 0.4], [1, '#ef4444', 0]])}"/>`;
      // красный ромб «фу» на стене
      s += K.g(K.part('M-14 -14H14V14H-14Z', '#dc2626', { line: '#7f1d1d', lw: 1.6 }) + K.part('M-10 -10H10V10H-10Z', '#dc2626', { line: '#fbbf24', lw: 1.2 }) + K.line('M-5 -5L5 5M5 -5L-5 5M0 -7V7', '#fbbf24', 1.6), 'translate(30 34) rotate(45)');
      // связка хлопушек и вспышки
      s += K.line('M176 0C174 20 178 40 172 60C168 74 170 86 166 96', '#78350f', 1.8);
      [[175, 12, -10], [176, 26, 8], [174, 40, -8], [172, 54, 10], [169, 68, -8]].forEach(([x, y, r]) => { s += K.g(K.part('M-4 -8H4V8H-4Z', '#dc2626', { line: '#450a0a', lw: 1.2 }) + K.line('M-4 -4H4M-4 4H4', '#fbbf24', 1.2), `translate(${x} ${y}) rotate(${r})`); });
      const boom = (x, y, r, d) => `<g class="art-blink" style="animation-delay:-${d}s"><path d="${[...Array(8)].map((_, i) => { const a = i * Math.PI / 4; return `M${r1(x + r * 0.35 * Math.cos(a))} ${r1(y + r * 0.35 * Math.sin(a))}L${r1(x + r * Math.cos(a))} ${r1(y + r * Math.sin(a))}`; }).join('')}" stroke="#fde047" stroke-width="2.6" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="${r1(r * 0.3)}" fill="#fff7c2"/></g>`;
      s += boom(160, 84, 13, 0) + boom(182, 104, 10, 0.5) + boom(150, 106, 8, 0.9);
      // хвост кисточкой
      s += K.line('M60 156C34 160 22 140 30 124', '#2e1065', 9) + K.line('M60 156C34 160 22 140 30 124', '#8b5cf6', 5) + K.g(K.flame(30, 128, 24, 18, '#ddd6fe', '#7c3aed'), 'rotate(-20 30 124)');
      // тело присело, задние лапы
      s += K.vol('M100 106C130 106 146 128 146 150C146 168 130 176 100 176C70 176 54 168 54 150C54 128 70 106 100 106Z', fur);
      s += K.part('M100 122C114 122 124 136 124 152C124 166 114 174 100 174C86 174 76 166 76 152C76 136 86 122 100 122Z', '#ede9fe', { flat: true, lw: 0, op: 0.85 });
      s += K.mirror(K.vol(K.ell(70, 170, 15, 8), { ...fur, tex: false, lw: 2 }) + K.line('M64 168v5M70 169v5M76 168v5', '#2e1065', 1.2, { op: 0.6 }));
      // грива дыбом
      for (let i = 0; i < 11; i++) { const a = (-195 + i * 21) * Math.PI / 180, x = r1(100 + 52 * Math.cos(a)), y = r1(80 + 46 * Math.sin(a)); s += K.g(K.part('M-9 6L0 -16L9 6Z', i % 2 ? '#7c3aed' : '#6d28d9', { line: '#2e1065', lw: 1.6 }), `translate(${x} ${y}) rotate(${r1(-195 + i * 21 + 90)})`); }
      // золотой рог
      s += K.part('M92 38C92 26 96 14 100 6C104 14 108 26 108 38Z', '#fde68a', { line: '#78350f', lw: 1.8 }) + K.line('M94 30L106 28M96 20L104 18', '#b45309', 1.4);
      // голова
      s += K.vol('M100 34C130 34 146 54 146 78C146 100 126 114 100 114C74 114 54 100 54 78C54 54 70 34 100 34Z', fur);
      s += K.part('M100 80C116 80 130 88 132 100C124 110 112 114 100 114C88 114 76 110 68 100C70 88 84 80 100 80Z', '#ede9fe', { flat: true, lw: 0 });
      s += K.gloss(76, 52, 9, 5, -35, 0.4);
      // перепуганные глаза, пот, пасть с клычками
      s += K.eyes(100, 70, 19, 13, { iris: '#ef4444', lid: 'wide', look: [0.6, 0] });
      s += K.mirror(K.line('M78 52L90 48', '#2e1065', 3));
      s += `<ellipse cx="100" cy="88" rx="6" ry="4.4" fill="#ef4444" stroke="${INK}" stroke-width="1.4"/>`;
      s += `<path d="M84 96Q100 92 116 96Q114 110 100 110Q86 110 84 96Z" fill="#3a0f1a" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M88 96.5l2.4 5l2.2-5.4ZM112 96.5l-2.4 5l-2.2-5.4Z" fill="#fff"/><ellipse cx="100" cy="106" rx="5" ry="2.4" fill="#f47a8f"/>`;
      s += `<path d="M140 46q-3 6 0 9q3-2 0-9zM148 60q-2.4 5 0 7q2.4-2 0-7z" fill="#bae6fd" stroke="#0c4a6e" stroke-width=".8"/>`;
      // вскинутые передние лапы
      s += K.vol(K.ell(56, 100, 11, 9.5, -30).d, { ...fur, tex: false, lw: 2, t: 'rotate(-30 56 100)' }) + K.vol(K.ell(144, 104, 11, 9.5, 30).d, { ...fur, tex: false, lw: 2, t: 'rotate(30 144 104)' });
      s += K.spark(26, 90, 3, '#e9d5ff', 'art-float') + K.spark(20, 160, 2.4, '#fde68a') + K.spark(130, 20, 2.4, '#e9d5ff');
      return s;
    },

    // Сечжи: однорогий зверь правосудия — сидит прямо, как каменный страж: сине-серая шерсть, золотая чешуя на груди,
    // тёмная грива и козлиная бородка, копытца; во лбу один длинный золотой рог, на кончике которого трещит молния,
    // взгляд строгий и честный. Вокруг искры тока
    cn_xiezhi(K) {
      const fur = { c1: '#cbd5e1', c2: '#334155', rim: '#fff6b0', rimK: 0.65, line: '#0f172a', texK: 0.25 }, mane = '#1e293b';
      let s = K.aura('#facc15', 96, 106, 0.36);
      // хвост-пламя
      s += K.line('M138 160C164 162 176 140 166 124', '#0f172a', 9) + K.line('M138 160C164 162 176 140 166 124', '#475569', 5) + K.g(K.flame(166, 128, 26, 18, '#fef9c3', '#475569'), 'rotate(14 166 124)');
      // тело сидя, задние лапы
      s += K.vol('M100 100C130 100 146 124 148 146C150 166 136 178 100 178C64 178 50 166 52 146C54 124 70 100 100 100Z', fur);
      s += K.mirror(K.vol(K.ell(62, 166, 15, 12), { ...fur, lw: 2.4 }));
      // золотая чешуя на груди
      s += K.part('M84 108H116C116 128 110 140 100 146C90 140 84 128 84 108Z', '#fde68a', { line: '#92400e', lw: 1.4 }) + K.line(scaleRow(86, 114, 118, 7) + scaleRow(88, 112, 128, 8) + scaleRow(92, 108, 137, 8), '#b45309', 1.2, { op: 0.8 });
      // передние ноги с копытцами
      s += K.mirror(K.vol('M72 124C70 142 70 158 70 166H90C90 156 92 140 92 128Z', fur) + K.part('M68 164H92L94 178H66Z', '#1e293b', { line: '#020617', lw: 1.6 }) + K.line('M80 166V178', '#020617', 1.4));
      // грива кудрями
      for (let i = 0; i < 11; i++) { const a = (-196 + i * 21) * Math.PI / 180; s += curl(K, r1(100 + 44 * Math.cos(a)), r1(80 + 38 * Math.sin(a)), 10, '#334155', '#020617'); }
      // уши
      s += K.mirror(K.part('M64 64C52 60 44 62 38 68C46 72 54 74 64 72Z', '#94a3b8', { line: '#0f172a', lw: 1.6 }));
      // рог с молнией
      s += `<circle class="art-aura" cx="100" cy="10" r="16" fill="${K.rad([[0, '#fffbe6', 0.9], [0.4, '#fde047', 0.5], [1, '#facc15', 0]])}"/>`;
      s += K.part('M93 48C92 34 95 20 100 8C105 20 108 34 107 48Z', '#fde68a', { line: '#78350f', lw: 1.8 }) + K.line('M94 40L106 37M95 30L105 27M97 20L103 18', '#b45309', 1.4);
      s += zap(K, 88, 14, 0.9, -40) + zap(K, 112, 10, 0.9, 40, '#fef08a', 0.5);
      // голова
      s += K.vol('M100 42C124 42 138 58 138 76C138 94 124 106 100 106C76 106 62 94 62 76C62 58 76 42 100 42Z', fur);
      s += K.part('M100 78C114 78 126 85 126 95C126 102 114 106 100 106C86 106 74 102 74 95C74 85 86 78 100 78Z', '#e2e8f0', { line: '#64748b', lw: 1.2 });
      s += `<ellipse cx="100" cy="86" rx="6.4" ry="4.4" fill="#0f172a"/><ellipse cx="98" cy="84.8" rx="2" ry="1.1" fill="#fff" opacity=".6"/>`;
      s += K.gloss(80, 56, 8, 4.4, -35, 0.4);
      s += K.eyes(100, 68, 15, 8.6, { iris: '#facc15', lid: 'angry', skin: '#8a99ae', look: [0, 0.2] });
      s += K.mouth('flat', 100, 96, 12);
      // козлиная бородка
      s += K.part('M92 104C92 116 97 124 100 130C103 124 108 116 108 104Z', mane, { line: '#020617', lw: 1.4 });
      s += zap(K, 26, 70, 1.2, -30) + zap(K, 168, 74, 1.2, 20, '#fde047', 0.6) + zap(K, 24, 140, 1, 10, '#fef08a', 1);
      s += K.spark(40, 30, 3, '#fff6b0') + K.spark(176, 112, 2.6, '#fde047', 'art-float');
      return s;
    },

    // Ту-ди-гун: добрый седой бог местности — круглолицый дедушка с белой бородой и пушистыми бровями, в мягкой шапочке
    // и жёлто-коричневом халате; в одной руке узловатый посох с тыквой-горлянкой, в другой — золотой слиток. У ног сидит
    // рыжий котик (всех котов квартала он знает по именам) и лежит красный мячик — дедушка знает, куда тот закатился
    cn_tudigong(K) {
      const skin = '#f8d0b0', robe = { c1: '#fde68a', c2: '#a16207', rim: '#e4ffb0', rimK: 0.6, line: '#422006', texK: 0.15 };
      let s = K.aura('#84cc16', 96, 106, 0.36);
      // травка и цветы
      s += K.line('M20 178q2-10-2-16M30 178q0-8 4-12M170 178q-2-10 2-14M180 178q2-8-2-12', '#4d7c0f', 2.4) + `<g stroke="#9d174d" stroke-width=".7" fill="#f9a8d4"><circle cx="24" cy="160" r="2.6"/><circle cx="176" cy="164" r="2.6"/></g>`;
      // посох с тыквой
      s += K.line('M44 178C42 150 46 118 40 86C38 76 44 70 50 72', '#5b3a1a', 6) + K.line('M44 178C42 150 46 118 40 86C38 76 44 70 50 72', '#a87447', 3) + gourd(K, 52, 106, 0.6, { c: '#fbbf24', rot: -6 });
      // халат
      s += K.vol('M100 84C122 84 136 96 140 114L148 168C134 176 66 176 52 168L60 114C64 96 78 84 100 84Z', robe);
      s += K.line('M100 90V172', '#78350f', 1.4, { op: 0.4 }) + K.line('M62 132Q100 140 138 132', '#15803d', 6) + K.stitch('M62 132Q100 140 138 132', '#fde68a', 1.4);
      s += K.stitch('M54 166Q100 176 146 166', '#fde68a', 2);
      // руки: левая держит посох, правая — золотой слиток
      s += K.vol('M70 96C60 102 52 110 48 118C50 126 58 126 62 122C66 114 72 108 78 104Z', robe) + K.part(K.ell(50, 118, 6.5, 6), skin, { line: '#9a6a4a', lw: 1.4 });
      s += K.vol('M130 96C142 102 150 112 152 122C150 128 142 128 140 124C138 116 134 110 126 106Z', robe);
      s += `<g transform="translate(150 118)"><path d="M-14 0C-16 -7 -10 -10 -7 -6C-5 -12 5 -12 7 -6C10 -10 16 -7 14 0C8 5 -8 5 -14 0Z" fill="${K.lin(['#fff7c2', '#fbbf24', '#b45309'])}" stroke="#78350f" stroke-width="1.4" stroke-linejoin="round"/></g>` + K.part(K.ell(146, 126, 6.5, 6), skin, { line: '#9a6a4a', lw: 1.4 });
      // голова
      s += K.vol(K.ell(100, 58, 22, 22), { c1: skin, c2: '#dca080', rim: '#fff3d6', tex: false, lw: 2.2, line: '#7a4a2a' });
      s += K.vol('M78 52C78 34 88 28 100 28C112 28 122 34 122 52C114 46 86 46 78 52Z', { c1: '#7f1d1d', c2: '#3b0a0a', rim: '#fde68a', rimK: 0.4, line: '#1c0505', lw: 2, tex: false });
      s += K.line('M78 52C86 46 114 46 122 52', '#fbbf24', 2.4) + `<circle cx="100" cy="30" r="3.4" fill="#fbbf24" stroke="#78350f" stroke-width="1"/>`;
      // белые брови, борода
      s += K.mirror(K.part('M84 56C88 50 96 50 98 54C94 55 90 56 86 60Z', '#ffffff', { line: '#94a3b8', lw: 1.2 }));
      s += K.vol('M80 68C76 84 82 100 90 108C94 116 100 120 100 120C100 120 106 116 110 108C118 100 124 84 120 68C112 76 106 78 100 78C94 78 88 76 80 68Z', { c1: '#ffffff', c2: '#cbd5e1', rim: '#e4ffb0', line: '#64748b', lw: 2, tex: false, shadeK: 0.3 });
      s += K.line('M90 86q-2 10 2 18M100 84q-1 14 0 26M110 86q2 10-2 18', '#cbd5e1', 1.6);
      s += K.mirror(K.part('M100 72C94 68 86 70 82 76C86 78 92 76 100 76Z', '#ffffff', { line: '#94a3b8', lw: 1.2 }));
      s += K.closed(100, 62, 9, 5, true) + K.blush(82, 68, 4.6) + K.blush(118, 68, 4.6);
      s += `<ellipse cx="100" cy="68" rx="4" ry="3.4" fill="${K.rad([[0, '#ffc3a0'], [1, '#d08060']], 0.4, 0.35, 0.7)}" stroke="#7a3a24" stroke-width="1.2"/>`;
      // рыжий котик и мячик
      s += K.vol(K.ell(166, 164, 14, 12), { c1: '#fdba74', c2: '#c2410c', rim: '#e4ffb0', line: '#431407', lw: 2, tex: false });
      s += K.part('M158 152L156 141L165 147ZM174 152L176 141L167 147Z', '#f97316', { line: '#431407', lw: 1.2 });
      s += K.vol(K.ell(166, 150, 11, 10), { c1: '#fdba74', c2: '#c2410c', rim: '#e4ffb0', line: '#431407', lw: 2, tex: false });
      s += K.line('M162 142l2 4M166 141v4M170 142l-2 4', '#9a3412', 1.2) + K.closed(166, 150, 4.4, 2.6, true) + `<path d="M164.6 154h2.8l-1.4 1.6z" fill="#9d174d"/>`;
      s += K.line('M178 168C188 166 190 156 184 152', '#c2410c', 3.4);
      s += `<circle cx="30" cy="170" r="7" fill="${K.rad([[0, '#fecaca'], [0.6, '#ef4444'], [1, '#991b1b']], 0.35, 0.3)}" stroke="#450a0a" stroke-width="1.4"/>` + K.line('M24 166Q30 172 36 166', '#fde68a', 1.2);
      s += K.spark(26, 40, 3, '#e4ffb0', 'art-float') + K.spark(178, 40, 2.6, '#fde68a') + K.spark(184, 110, 2.4, '#e4ffb0');
      return s;
    },

    // Сыбусян: скакун мудреца Цзян Цзыя, «ни на кого из четырёх не похож» — оленьи рога, лошадиная морда с гривой, коровьи
    // копыта и ослиный хвост с кисточкой; на спине красный чепрак с золотой каймой и кисточками, на морде уздечка.
    // Над головой — облачко с вопросиком: кто же он такой?
    cn_sibuxiang(K) {
      const hide = { c1: '#f3d3a6', c2: '#9a6232', rim: '#e4ffb0', rimK: 0.6, line: '#3b2006', texK: 0.15 };
      let s = K.aura('#84cc16', 100, 108, 0.34);
      s += K.line('M14 178q2-10-2-16M24 178q0-8 4-12M176 178q-2-10 2-14M186 178q2-8-2-12', '#4d7c0f', 2.4);
      // ослиный хвост с кисточкой
      s += K.line('M156 106C166 116 168 130 166 146', '#3b2006', 5) + K.line('M156 106C166 116 168 130 166 146', '#b07a44', 2.6) + K.g(K.flame(166, 142, 18, 12, '#57534e', '#1c1917'), 'rotate(180 166 146)');
      // дальние ноги
      s += K.vol('M70 132C68 146 70 158 72 168H84C84 156 84 144 84 132Z', { ...hide, c1: '#d9b080' }) + K.vol('M132 130C134 144 136 158 136 168H148C148 156 146 142 144 130Z', { ...hide, c1: '#d9b080' });
      s += K.part('M70 166H86L87 177H69Z', '#1c1917', { line: '#020617', lw: 1.4 }) + K.part('M134 166H150L151 177H133Z', '#1c1917', { line: '#020617', lw: 1.4 }) + K.line('M78 168V177M142 168V177', '#57534e', 1.2);
      // тело
      s += K.vol('M58 112C58 96 80 88 106 88C136 88 160 96 160 114C160 132 140 140 106 140C76 140 58 130 58 112Z', hide);
      s += K.part('M74 132C88 138 124 140 146 132C130 138 92 140 74 132Z', '#fff7e6', { lw: 0, op: 0.7 });
      // ближние ноги
      s += K.vol('M84 132C84 146 86 158 88 168H100C100 156 100 144 98 132Z', hide) + K.vol('M118 132C120 146 122 158 122 168H134C134 156 132 144 130 132Z', hide);
      s += K.part('M86 166H102L103 178H85Z', '#1c1917', { line: '#020617', lw: 1.4 }) + K.part('M120 166H136L137 178H119Z', '#1c1917', { line: '#020617', lw: 1.4 }) + K.line('M94 168V178M128 168V178', '#57534e', 1.2);
      // красный чепрак с кисточками
      s += K.part('M90 88C104 84 124 84 136 90L140 122C124 128 104 128 88 122Z', '#dc2626', { line: '#7f1d1d', lw: 1.6 }) + K.stitch('M89 120C104 126 124 126 139 120', '#fbbf24', 1.8) + K.part('M104 84C108 78 118 78 122 84L120 90H106Z', '#78350f', { line: '#3b2006', lw: 1.4 });
      s += tassel(K, 90, 122, 14, '#fbbf24', 0.2) + tassel(K, 139, 121, 14, '#fbbf24', 0.8);
      // шея с гривой
      s += K.vol('M62 110C56 96 52 82 50 68L72 62C74 76 78 90 84 102Z', hide);
      s += K.part('M70 60C76 70 80 84 86 98C80 92 74 84 70 76C70 72 68 66 66 62Z', '#1c1917', { line: '#020617', lw: 1.2 });
      // оленьи рога
      const ant = 'M50 42C46 30 40 22 30 16M44 30C38 30 32 32 28 36M48 36C42 38 38 42 36 48M58 40C62 28 70 20 80 16M64 28C70 26 76 28 80 32';
      s += K.line(ant, '#3b2006', 6) + K.line(ant, '#d6b48a', 3);
      // лошадиная морда с уздечкой
      s += K.vol('M52 40C68 40 76 52 74 66C72 76 66 82 60 90C54 98 40 100 32 94C26 88 30 78 34 70C36 58 40 40 52 40Z', hide);
      s += K.part('M40 80C48 80 58 84 60 90C54 98 42 100 34 94C30 90 32 82 40 80Z', '#fde8cc', { line: '#9a6232', lw: 1 }) + `<ellipse cx="40" cy="88" rx="2.4" ry="1.6" fill="#3b2006"/><ellipse cx="50" cy="90" rx="2.4" ry="1.6" fill="#3b2006"/>`;
      s += K.line('M36 70Q52 74 70 66M48 72L46 94', '#dc2626', 2.4) + `<circle cx="70" cy="66" r="2.4" fill="#fbbf24" stroke="#78350f" stroke-width=".8"/>` + tassel(K, 70, 68, 12, '#dc2626', 0.5);
      s += K.part('M66 44C70 34 78 30 84 34C80 40 76 44 70 48Z', hide.c1, { line: '#3b2006', lw: 1.4 }) + K.part('M70 44C74 38 78 36 80 37C78 41 75 43 72 45Z', '#fbcfe8', { lw: 0 });
      s += `<g class="art-eyes">${K.eye(56, 58, 7.5, { iris: '#78350f', look: [-0.3, 0.1] })}</g>` + K.line('M50 48Q56 45 63 49', '#3b2006', 2.2);
      s += K.blush(48, 70, 4.6) + K.line('M40 98Q44 100 48 98', INK, 1.8);
      // облачко с вопросиком
      s += `<g class="art-float"><path d="M104 36C100 26 112 18 120 24C124 14 140 14 142 26C152 26 154 40 144 42H108C100 42 100 38 104 36Z" fill="#ffffff" stroke="#3f6212" stroke-width="1.6"/><path d="M118 28C118 23 126 23 126 28C126 31 122 31 122 35" fill="none" stroke="#3f6212" stroke-width="2.2" stroke-linecap="round"/><circle cx="122" cy="38.6" r="1.4" fill="#3f6212"/><circle cx="100" cy="48" r="3" fill="#fff" stroke="#3f6212" stroke-width="1.2"/><circle cx="92" cy="54" r="2" fill="#fff" stroke="#3f6212" stroke-width="1"/></g>`;
      s += K.spark(170, 60, 3, '#e4ffb0', 'art-float') + K.spark(186, 100, 2.4, '#fde68a') + K.spark(20, 130, 2.4, '#e4ffb0');
      return s;
    },

    // Сюаньу: Чёрная черепаха Севера, обвитая змеёй — тёмный панцирь с золотыми шестигранниками, бирюзовые лапы,
    // черепаха сонно-спокойная; змея обвилась по панцирю и, подняв голову, нетерпеливо её торопит. Внизу волны,
    // в небе — Полярная звезда
    cn_xuanwu(K) {
      const skin = { c1: '#99f6e4', c2: '#0f766e', rim: '#c8f3ff', rimK: 0.7, line: '#042f2e', texK: 0.2 };
      const shell = { c1: '#64748b', c2: '#0b1222', rim: '#c8f3ff', rimK: 0.6, line: '#020617', texK: 0.25 };
      let s = K.aura('#38bdf8', 96, 108, 0.38);
      s += `<circle class="art-aura" cx="40" cy="26" r="16" fill="${K.rad([[0, '#fffbe6', 0.9], [1, '#bae6fd', 0]])}"/>` + K.spark(40, 26, 7, '#fffbe6', '') + K.spark(18, 50, 2.4, '#e0f2fe') + K.spark(70, 14, 2.2, '#e0f2fe');
      s += waves(K, -4, 204, 166, { step: 26, h: 16 });
      // хвост змеи сзади и задняя лапа
      s += tube(K, 'M150 148C168 146 180 134 176 120', 9, { c1: '#5eead4', c2: '#0f766e', line: '#042f2e' });
      s += K.vol(K.ell(146, 158, 15, 9, 20).d, { ...skin, lw: 2, t: 'rotate(20 146 158)' });
      // голова черепахи на шее
      s += K.vol('M64 128C54 124 44 116 40 104C36 92 44 84 54 86C62 88 66 96 70 106C74 112 78 116 82 120Z', skin);
      s += K.vol(K.ell(44, 96, 18, 15), skin);
      s += `<g class="art-eyes">${K.eye(40, 92, 6, { iris: '#0f766e', lid: 'half', skin: '#3fbfa9', look: [-0.4, 0.2] })}${K.eye(54, 92, 6, { iris: '#0f766e', lid: 'half', skin: '#3fbfa9', look: [-0.4, 0.2] })}</g>`;
      s += K.mouth('smile', 46, 104, 10) + K.blush(32, 102, 4) + K.blush(60, 102, 4);
      // панцирь
      const sh = 'M56 140C52 108 78 86 108 86C140 86 160 108 158 140C140 150 74 150 56 140Z';
      s += K.vol(sh, shell);
      s += K.line('M108 94L124 104L122 122L106 130L90 122L90 104ZM108 94V86M124 104L140 96M122 122L140 132M106 130V146M90 122L72 132M90 104L74 96', '#fbbf24', 1.8, { op: 0.85 });
      s += K.part('M52 140C74 152 140 152 162 140L160 148C140 158 74 158 54 148Z', '#334155', { line: '#020617', lw: 1.6 }) + K.stitch('M58 147Q108 158 158 147', '#fbbf24', 1.6);
      // передние лапы
      s += K.vol(K.ell(70, 160, 15, 9, -20).d, { ...skin, lw: 2, t: 'rotate(-20 70 160)' }) + K.line('M60 162l-3 4M66 165l-1 5M73 166l1 5', '#042f2e', 1.3, { op: 0.6 });
      // змея обвивает панцирь и поднимает голову
      const snake = 'M60 132C80 150 120 108 140 104C158 100 160 118 150 124C138 132 128 112 136 86C140 72 150 64 152 58';
      s += tube(K, snake, 13, { c1: '#5eead4', c2: '#0f766e', line: '#042f2e', belly: '#ccfbf1', dots: '#134e4a', dotK: 0.6 });
      s += K.vol('M152 32C166 32 174 42 172 54C170 64 160 70 150 68C140 66 134 58 136 48C138 38 144 32 152 32Z', skin);
      s += K.eyes(154, 48, 6.4, 5, { iris: '#facc15', lid: 'angry', skin: '#2bb59c', look: [-0.6, 0.3] });
      s += `<path d="M146 62v7M146 69l-2.6 3M146 69l2.6 3" stroke="#ef4444" stroke-width="1.6" fill="none" stroke-linecap="round"/>` + K.line('M142 60Q148 64 156 60', INK, 1.8);
      s += K.spark(184, 90, 2.6, '#e0f2fe', 'art-float') + K.spark(20, 136, 2.4, '#e0f2fe');
      return s;
    },

    // Нэчжа: мальчик-бог, рождённый заново из лотоса — два пучка с красными лентами, алая метка во лбу, дерзкая улыбка;
    // красная безрукавка с золотой каймой, юбочка из лепестков лотоса, золотые браслеты. Мчится на двух огненных колёсах:
    // в поднятой руке золотое кольцо цянькунь, в другой — копьё с огненным наконечником, вокруг вьётся алый шёлковый пояс
    cn_nezha(K) {
      const skin = '#fde2c4', sk = { c1: skin, c2: '#e8b48a', rim: '#fff3d6', tex: false, lw: 2.2, line: '#8a5030' };
      const red = { c1: '#ff8a7a', c2: '#b91c1c', rim: '#ffe29a', rimK: 0.7, line: '#450a0a', texK: 0.2 };
      const hair = { c1: '#3a3344', c2: '#0b0a10', rim: '#ffe29a', rimK: 0.35, line: '#0b0a10', lw: 1.8, tex: false };
      let s = K.aura('#ff7a1a', 96, 104, 0.42);
      // алый пояс-хуньтяньлин вьётся за спиной
      const sash = 'M66 96C44 86 28 98 32 114C36 130 22 142 8 138M134 96C156 86 172 98 168 114C164 130 178 142 192 138';
      s += `<g class="art-float">${K.line(sash, '#7f1d1d', 9)}${K.line(sash, '#ef4444', 6.6)}${K.line(sash, '#fecaca', 1.6, { op: 0.7 })}</g>`;
      // копьё с огненным наконечником
      s += K.flame(154, 34, 30, 18, '#fff3b0', '#ff7a1a') + K.line('M154 170V40', '#5a3208', 4.6) + K.line('M154 170V40', '#d97706', 2.4);
      s += K.part('M148 42H160L154 22Z', '#e2e8f0', { line: '#334155', lw: 1.4 }) + K.line('M147 44H161', '#dc2626', 3) + tassel(K, 154, 46, 14, '#dc2626', 0.3);
      // огненные колёса
      const wheel = (x, y, d) => {
        let w = '';
        for (let i = 0; i < 6; i++) w += K.g(K.flame(x, y - 15, 14, 10, '#fff3b0', i % 2 ? '#f97316' : '#ef4444', { style: `animation-delay:-${(d + i * 0.2).toFixed(1)}s` }), `rotate(${i * 60 + 30} ${x} ${y})`);
        w += `<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="#78350f" stroke-width="6"/><circle cx="${x}" cy="${y}" r="13" fill="none" stroke="#fbbf24" stroke-width="3.6"/>`;
        w += K.line(`M${x - 12} ${y}H${x + 12}M${x} ${y - 12}V${y + 12}M${x - 8.5} ${y - 8.5}L${x + 8.5} ${y + 8.5}M${x + 8.5} ${y - 8.5}L${x - 8.5} ${y + 8.5}`, '#b45309', 1.6) + `<circle cx="${x}" cy="${y}" r="4" fill="#fbbf24" stroke="#78350f" stroke-width="1.2"/>`;
        return `<g class="art-spin" style="animation-delay:-${d}s">${w}</g>`;
      };
      s += wheel(80, 164, 0) + wheel(120, 164, 1.5);
      // ножки в красных туфельках
      s += K.mirror(K.vol('M86 134C85 142 84 148 82 152H94C94 146 95 140 96 134Z', sk) + K.part('M80 150H96L97 156H79Z', '#dc2626', { line: '#450a0a', lw: 1.4 }) + K.line('M84 144H94', '#fbbf24', 2));
      // юбочка из лепестков лотоса
      s += `<g transform="rotate(180 100 112)">${lotus(K, 100, 112, 1.25, { c: '#f9a8d4', line: '#9d174d' })}</g>`;
      s += K.part('M74 110C84 106 116 106 126 110L124 120C112 116 88 116 76 120Z', '#22c55e', { line: '#14532d', lw: 1.4 });
      // красная безрукавка
      s += K.vol('M100 82C114 82 122 90 124 102L122 116H78L76 102C78 90 86 82 100 82Z', red) + K.line('M78 114H122M90 84L100 96L110 84', '#fbbf24', 2.2);
      s += K.line('M80 92C92 106 110 106 122 92', '#ef4444', 5) + K.line('M80 92C92 106 110 106 122 92', '#fecaca', 1.4, { op: 0.6 });
      // рука с кольцом цянькунь
      s += K.vol('M80 92C70 86 62 78 56 68C54 62 60 58 64 62C68 70 74 78 84 84Z', sk) + K.line('M60 70L66 66', '#fbbf24', 3);
      s += `<circle class="art-aura" cx="48" cy="52" r="20" fill="${K.rad([[0, '#fffbe6', 0.8], [0.5, '#fde047', 0.4], [1, '#facc15', 0]])}"/><circle cx="48" cy="52" r="13" fill="none" stroke="#78350f" stroke-width="7.4"/><circle cx="48" cy="52" r="13" fill="none" stroke="${K.lin(['#fff7c2', '#fbbf24', '#b45309'])}" stroke-width="5"/>` + `<path d="M38 46A12 12 0 0 1 46 40" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>`;
      s += K.part(K.ell(58, 64, 6, 5.5), skin, { line: '#8a5030', lw: 1.4 });
      // рука с копьём
      s += K.vol('M120 92C132 96 142 102 150 108C154 112 150 118 146 116C138 112 128 106 118 104Z', sk) + K.line('M140 104L144 112', '#fbbf24', 3) + K.part(K.ell(153, 112, 6, 5.5), skin, { line: '#8a5030', lw: 1.4 });
      // голова, пучки с лентами
      s += K.mirror(K.g(K.line('M78 30C70 24 62 26 58 32M80 32C74 34 70 40 70 46', '#dc2626', 2.6), '', 'art-sway') + K.vol(K.ell(80, 32, 10, 10), hair) + K.line('M72 38Q80 42 88 38', '#dc2626', 2.6));
      s += K.vol(K.ell(100, 58, 22, 22), sk);
      s += K.part('M78 56C76 40 88 32 100 32C112 32 124 40 122 56C116 48 108 44 100 46C92 44 84 48 78 56Z', '#1f1a24', { line: '#0b0a10', lw: 1.4 });
      s += K.part('M100 42C103 46 104 49 102 52C101 54 99 54 98 52C96 49 97 46 100 42Z', '#ef4444', { line: '#991b1b', lw: 1 });
      s += K.mirror(K.line('M84 52Q90 49 96 52', '#1f1a24', 2.2));
      s += K.eyes(100, 61, 9.5, 7, { iris: '#b45309', look: [0.25, 0.1] });
      s += K.blush(84, 70, 4.4) + K.blush(116, 70, 4.4) + K.mouth('grin', 100, 72, 12);
      s += K.spark(24, 100, 3, '#fff3b0', 'art-float') + K.spark(180, 70, 2.6, '#ffe08a') + K.spark(30, 170, 2.4, '#ffd23f');
      return s;
    },

    // Чжу Жун: бог огня — могучий бородач в бронзовых доспехах с солнечной бляхой на груди; волосы и борода из живого
    // пламени, красный плащ; в поднятой руке пылающий меч, на другой ладони огненная жемчужина. За спиной вьётся огненный
    // дракон (в «Каталоге гор и морей» Чжу Жун ездит на драконах), под ногами огненное облако
    cn_zhurong(K) {
      const skin = '#f2b07e', sk = { c1: skin, c2: '#c8784a', rim: '#ffe29a', tex: false, lw: 2.2, line: '#6a3018' };
      const bronze = { c1: '#fde68a', c2: '#9a5a0c', rim: '#ffe29a', rimK: 0.7, line: '#3b1d04', texK: 0.25 };
      const red = { c1: '#ff8a7a', c2: '#991b1b', rim: '#ffe29a', rimK: 0.6, line: '#450a0a', texK: 0.25 };
      let s = K.aura('#ff7a1a', 96, 100, 0.45);
      // огненный дракон кольцом за спиной
      const dr = 'M34 156C14 126 28 90 60 82C92 74 104 38 146 34C170 32 184 50 176 66';
      [[40, 120, -110], [52, 84, -70], [104, 52, -50], [140, 30, -10], [174, 44, 40]].forEach(([x, y, r], i) => { s += K.g(K.flame(x, y, 18, 12, '#fff3b0', '#f97316', { style: `animation-delay:-${(i * 0.3).toFixed(1)}s` }), `rotate(${r} ${x} ${y})`); });
      s += K.line(dr, '#450a0a', 21) + K.line(dr, K.lin(['#fdba74', '#ef4444', '#991b1b']), 16) + `<path d="${dr}" fill="none" stroke="#fde047" stroke-width="16" stroke-dasharray="1.6 6" opacity=".45"/>`;
      s += K.vol('M176 58C188 58 196 66 194 76C192 86 182 90 172 88C164 86 160 78 162 70C164 62 168 58 176 58Z', red);
      s += K.line('M182 60C186 52 190 48 196 46M174 58C174 50 176 44 180 40', '#fbbf24', 3) + `<g class="art-eyes">${K.eye(178, 70, 4.6, { iris: '#facc15', lid: 'angry', skin: '#c2302a', look: [-0.5, 0.2] })}</g>` + K.line('M166 80Q172 84 180 82', INK, 1.6);
      // огненное облако
      s += cloud(K, 100, 168, 2.1, { c1: '#fff1d6', c2: '#fb923c', line: '#9a3412' });
      // плащ
      s += K.part('M64 92C48 120 44 150 50 166H150C156 150 152 120 136 92Z', '#dc2626', { line: '#450a0a', lw: 2 }) + K.line('M60 120C58 136 58 150 60 162M140 120C142 136 142 150 140 162', '#7f1d1d', 1.4, { op: 0.6 });
      // ноги и юбка-доспех
      s += K.mirror(K.vol('M80 140C78 148 76 154 74 160H92C92 154 93 148 94 142Z', { c1: '#94a3b8', c2: '#1e293b', line: '#0f172a', tex: false }));
      s += K.vol('M68 128H132L140 152C124 158 76 158 60 152Z', bronze) + K.line(scaleRow(66, 134, 136, 8.5) + scaleRow(64, 136, 145, 9), '#78350f', 1.2, { op: 0.6 });
      // кираса с солнечной бляхой
      s += K.vol('M100 84C124 84 136 94 138 110L134 132H66L62 110C64 94 76 84 100 84Z', bronze);
      s += K.line('M66 130H134', '#dc2626', 5) + sunDisc(K, 100, 108, 8);
      s += K.mirror(K.part('M64 88C70 82 80 82 86 86L82 98C74 98 68 94 64 88Z', '#fbbf24', { line: '#78350f', lw: 1.4 }));
      // рука с пылающим мечом
      s += K.vol('M70 94C60 88 52 78 48 66C46 60 52 56 56 60C60 70 66 78 76 86Z', sk) + K.line('M50 70L58 66', '#fbbf24', 3);
      s += K.g(K.flame(0, -18, 22, 12, '#fff3b0', '#ef4444', { style: 'animation-delay:-.2s' }) + K.flame(0, -40, 20, 11, '#fff3b0', '#f97316', { style: 'animation-delay:-.7s' }) +
        K.part('M-3.4 0V-50L0 -58L3.4 -50V0Z', '#e2e8f0', { line: '#334155', lw: 1.4 }) + K.line('M0 -4V-50', '#94a3b8', 1) + K.part('M-10 0H10V4H-10Z', '#fbbf24', { line: '#78350f', lw: 1.2 }) + K.part('M-2.4 4H2.4V14H-2.4Z', '#7f1d1d', { line: '#450a0a', lw: 1 }), 'translate(50 60) rotate(-14)');
      s += K.part(K.ell(52, 62, 6.5, 6), skin, { line: '#6a3018', lw: 1.4 });
      // рука с огненной жемчужиной
      s += K.vol('M130 94C142 100 148 110 150 120C150 128 142 128 140 122C138 114 134 108 126 104Z', sk) + K.part(K.ell(146, 124, 6.5, 6), skin, { line: '#6a3018', lw: 1.4 });
      s += pearl(K, 150, 108, 7.5, '#fb923c', 'art-float', 0.4);
      // голова: огненные волосы и борода
      [[-50, 22], [-25, 28], [0, 32], [25, 28], [50, 22]].forEach(([a, h], i) => { s += K.g(K.flame(100, 46, h, 16, '#fff3b0', i % 2 ? '#ef4444' : '#f97316', { style: `animation-delay:-${(i * 0.25).toFixed(2)}s` }), `rotate(${a} 100 62)`); });
      s += K.vol(K.ell(100, 64, 17, 18), sk);
      s += [-28, 0, 28].map((a, i) => K.g(K.flame(100, 78, 22, 14, '#fff3b0', '#f97316', { cls: 'art-flicker', style: `animation-delay:-${(i * 0.3).toFixed(1)}s` }), `rotate(${180 + a} 100 78)`)).join('');
      s += K.mirror(K.part('M86 54C90 50 96 50 98 54C94 55 90 56 88 58Z', '#f97316', { line: '#7c2d12', lw: 1 }));
      s += K.eyes(100, 62, 7.4, 5, { iris: '#facc15', lid: 'angry', skin, look: [0, 0.2] });
      s += K.part('M90 74C94 71 98 72 100 73C102 72 106 71 110 74C106 75 102 76 100 75C98 76 94 75 90 74Z', '#ea580c', { line: '#7c2d12', lw: 0.8 });
      s += K.spark(24, 40, 3, '#fff3b0', 'art-float') + K.spark(184, 120, 2.6, '#ffe08a') + K.spark(18, 120, 2.4, '#ffd23f');
      return s;
    },

    // Чжун Куй: грозный усмиритель призраков — огромная чёрная борода, круглые сердитые глаза под кустистыми бровями,
    // чёрная чиновничья шапка с длинными крылышками, красный халат с чёрным поясом; в поднятой руке меч с кисточкой,
    // над плечом вьётся красная летучая мышь удачи, а в углу со всех ног улепётывает крошечный призрак
    cn_zhongkui(K) {
      const skin = '#e9a77c', sk = { c1: skin, c2: '#b8693e', rim: '#e9d5ff', tex: false, lw: 2.2, line: '#5a2a12' };
      const robe = { c1: '#f87171', c2: '#7f1d1d', rim: '#e9d5ff', rimK: 0.6, line: '#3b0707', texK: 0.3 };
      let s = K.aura('#c084fc', 100, 104, 0.42);
      // меч с кисточкой (за головой)
      s += K.g(K.part('M-3.6 0V-62L0 -70L3.6 -62V0Z', '#e2e8f0', { line: '#334155', lw: 1.6 }) + K.line('M0 -4V-62', '#94a3b8', 1.2) + K.part('M-12 0H12V5H-12Z', '#fbbf24', { line: '#78350f', lw: 1.2 }) + K.part('M-2.6 5H2.6V18H-2.6Z', '#1f2937', { line: '#05060c', lw: 1 }) + tassel(K, 0, 18, 16, '#dc2626', 0.5), 'translate(150 74) rotate(16)');
      s += `<circle class="art-aura" cx="168" cy="12" r="12" fill="${K.rad([[0, '#fffbe6', 0.8], [1, '#e9d5ff', 0]])}"/>`;
      // сапоги и халат
      s += K.mirror(K.part('M72 160H96L98 176H66C64 170 66 164 72 160Z', '#111827', { line: '#05060c', lw: 1.6 }) + K.line('M66 176H98', '#f8fafc', 2.4));
      s += K.vol('M100 80C130 80 146 96 150 118L158 164C142 172 58 172 42 164L50 118C54 96 70 80 100 80Z', robe);
      s += K.line('M100 92V168', '#3b0707', 1.6, { op: 0.4 }) + K.line('M60 126Q100 136 140 126', '#111827', 8) + K.rhomb(100, 131, 6, '#fbbf24', '#78350f');
      s += K.part('M84 96H116V118H84Z', '#7f1d1d', { line: '#fbbf24', lw: 1.6 }) + K.line(spiral(100, 107, 0.9, 1.4), '#fbbf24', 1.2);
      // рука с мечом
      s += K.vol('M130 96C142 92 150 84 154 74C156 68 162 68 162 74C160 86 152 98 138 106Z', robe) + K.part(K.ell(156, 76, 7, 6.5), skin, { line: '#5a2a12', lw: 1.6 });
      // рука указывает на призрака
      s += K.vol('M70 98C58 104 48 116 44 128C42 134 48 138 52 134C56 124 64 114 76 108Z', robe) + K.part(K.ell(46, 132, 6.5, 6), skin, { line: '#5a2a12', lw: 1.6 }) + K.line('M42 136L34 142', '#5a2a12', 3.4) + K.line('M42 136L34 142', skin, 1.8);
      // улепётывающий призрачок
      s += `<g class="art-float" style="animation-delay:-.4s">` + K.part('M18 152C18 140 34 136 40 146C44 152 44 160 40 166L36 162L32 168L28 162L24 168L20 162Z', '#ddd6fe', { line: '#4c1d95', lw: 1.6 }) +
        K.line('M44 150l8-2M44 156l9 0M42 162l8 2', '#c4b5fd', 1.6) + `<circle cx="26" cy="150" r="2.4" fill="#1b1030"/><circle cx="34" cy="150" r="2.4" fill="#1b1030"/><ellipse cx="30" cy="157" rx="2.4" ry="3" fill="#1b1030"/><path d="M16 144q-2 4 0 6q2-1 0-6z" fill="#bae6fd"/></g>`;
      // голова: брови, глаза, огромная борода, шапка с крылышками
      s += K.mirror(K.part('M68 52C56 50 42 50 30 54C32 58 40 60 48 58C56 58 62 56 70 56Z', '#111827', { line: '#05060c', lw: 1.6 }));
      s += K.vol(K.ell(100, 60, 22, 21), sk);
      s += K.vol('M76 52C76 30 88 22 100 22C112 22 124 30 124 52C116 46 84 46 76 52Z', { c1: '#4b5563', c2: '#05060c', rim: '#e9d5ff', rimK: 0.4, line: '#05060c', lw: 2, tex: false });
      s += K.line('M76 52C86 46 114 46 124 52', '#fbbf24', 2.4) + `<circle cx="100" cy="30" r="3.6" fill="#ef4444" stroke="#7f1d1d" stroke-width="1"/>`;
      s += K.mirror(K.part('M80 58C84 52 94 52 98 57C92 58 86 60 82 62Z', '#111827', { lw: 0 }));
      s += K.eyes(100, 64, 9, 7.4, { iris: '#facc15', look: [-0.6, 0.2] });
      s += K.vol('M76 70C70 88 74 106 84 116C90 124 100 128 100 128C100 128 110 124 116 116C126 106 130 88 124 70C114 80 106 82 100 82C94 82 86 80 76 70Z', { c1: '#4b5563', c2: '#05060c', rim: '#e9d5ff', rimK: 0.5, line: '#05060c', lw: 2, tex: false });
      s += K.line('M88 92q-3 10 0 20M100 90q-2 14 0 28M112 92q3 10 0 20', '#374151', 1.6);
      s += K.mirror(K.part('M100 76C92 72 82 74 76 80C80 82 88 80 100 80Z', '#111827', { lw: 0 }));
      s += `<ellipse cx="100" cy="74" rx="5" ry="4" fill="${K.rad([[0, '#f4a582'], [1, '#b8693e']], 0.4, 0.35, 0.7)}" stroke="#5a2a12" stroke-width="1.2"/>`;
      s += K.mouth('teeth', 100, 84, 14);
      // красная летучая мышь удачи
      s += `<g class="art-float" style="animation-delay:-1s"><g transform="translate(46 30) scale(1.3)"><path d="M0 0C-4 -5 -11 -5 -15 -1C-11 0 -10 2 -11 5C-8 3 -6 4 -5 7C-3 4 -1 3 0 5C1 3 3 4 5 7C6 4 8 3 11 5C10 2 11 0 15 -1C11 -5 4 -5 0 0Z" fill="#ef4444" stroke="#450a0a" stroke-width="1" stroke-linejoin="round"/><circle cx="0" cy="1" r="3.2" fill="#ef4444" stroke="#450a0a" stroke-width=".9"/><circle cx="-1.2" cy=".4" r=".7" fill="#fff"/><circle cx="1.2" cy=".4" r=".7" fill="#fff"/></g></g>`;
      s += K.spark(184, 110, 3, '#e9d5ff', 'art-float') + K.spark(18, 90, 2.6, '#e9d5ff') + K.spark(180, 170, 2.4, '#fde68a');
      return s;
    },

    // Чжинюй: небесная ткачиха, звезда Вега над головой — причёска с двумя петлями и звёздными шпильками, сиреневое ханьфу
    // в звёздочках; в одной руке золотой челнок, другой она ведёт ленту сотканной ткани — облака и закат струятся по небу.
    // Позади Млечный путь, над ним сороки выстраиваются мостом
    cn_zhinyu(K) {
      const skin = '#fde8d8', robe = { c1: '#ede9fe', c2: '#6366f1', rim: '#e9d5ff', rimK: 0.6, line: '#312e81', texK: 0.55 };
      const hair = { c1: '#3a3350', c2: '#0f0a1e', rim: '#e9d5ff', rimK: 0.4, line: '#0f0a1e', lw: 1.6, tex: false };
      let s = K.aura('#c084fc', 100, 100, 0.42);
      // Млечный путь
      s += `<path d="M-10 92C40 56 120 40 210 10V44C130 72 60 92 -10 124Z" fill="${K.lin(['#ffffff', '#c4b5fd', '#818cf8'], 0, 0, 1, 1)}" opacity=".22"/>`;
      s += `<g fill="#fff">${[...Array(18)].map((_, i) => `<circle cx="${r1(6 + i * 11.4)}" cy="${r1(98 - i * 4.6 + ((i * 37) % 13) - 6)}" r="${i % 3 ? 0.9 : 1.5}" opacity="${i % 2 ? 0.7 : 1}"/>`).join('')}</g>`;
      // сороки мостом
      const magpie = (x, y, k, f, d) => `<g class="art-float" style="animation-delay:-${d}s"><g transform="translate(${x} ${y}) scale(${f * k} ${k})"><path d="M-12 2C-8 -4 4 -6 10 -2L16 -4L12 2C8 6 -4 6 -12 2Z" fill="#111827" stroke="#05060c" stroke-width="1"/><path d="M-2 0C2 -2 6 -2 8 0C6 3 0 3 -2 0Z" fill="#ffffff"/><path d="M-2 -2C-6 -10 2 -14 6 -12C4 -8 2 -4 0 -2Z" fill="#1e293b" stroke="#05060c" stroke-width=".8"/><path d="M-6 -2C-10 -6 -6 -12 -2 -10C-2 -6 -2 -4 -4 -2Z" fill="#ffffff" stroke="#05060c" stroke-width=".8"/><path d="M-12 2L-22 4L-14 0Z" fill="#1e3a8a"/><circle cx="12" cy="-2" r="1" fill="#fff"/></g></g>`;
      s += magpie(30, 40, 1, -1, 0.2) + magpie(62, 26, 1, -1, 0.9) + magpie(138, 26, 1, 1, 0.5) + magpie(170, 40, 1, 1, 1.3);
      // звезда Вега
      s += `<circle class="art-aura" cx="100" cy="0" r="16" fill="${K.rad([[0, '#ffffff', 0.9], [0.4, '#c7d2fe', 0.5], [1, '#818cf8', 0]])}"/>` + K.spark(100, 0, 8, '#ffffff', '') + K.spark(100, 0, 4, '#c7d2fe', 'art-blink');
      // облако под ногами
      s += cloud(K, 100, 170, 2, { c1: '#ffffff', c2: '#ddd6fe', line: '#6d28d9' });
      // лента сотканной ткани — облака и закат
      const silk = 'M150 112C176 120 184 146 164 158C144 170 120 152 96 160C70 168 54 182 28 168C12 160 14 140 30 136';
      s += K.line(silk, '#4c1d95', 15) + K.line(silk, K.lin(['#fda4af', '#fdba74', '#c4b5fd', '#93c5fd'], 0, 0, 1, 0), 12) + `<path d="${silk}" fill="none" stroke="#ffffff" stroke-width="12" stroke-dasharray="2 9" opacity=".35"/>` + K.line(silk, '#fff', 1.4, { op: 0.6 });
      // платье
      s += K.vol('M100 86C114 86 122 94 126 106C134 130 144 150 154 166C134 176 66 176 46 166C56 150 66 130 74 106C78 94 86 86 100 86Z', robe);
      s += `<g fill="#fde68a">${[[80, 120], [116, 128], [92, 146], [124, 154], [70, 156], [104, 132]].map(([x, y]) => `<path d="M${x} ${y - 3}l.8 2.2l2.2 .8l-2.2 .8l-.8 2.2l-.8-2.2l-2.2-.8l2.2-.8z"/>`).join('')}</g>`;
      s += K.stitch('M48 166Q100 178 152 166', '#fde68a', 2) + K.line('M76 114Q100 122 124 114', '#4338ca', 6) + K.stitch('M76 114Q100 122 124 114', '#fde68a', 1.4);
      s += K.part('M88 88Q100 98 112 88L110 94Q100 102 90 94Z', '#4338ca', { line: '#312e81', lw: 1.2 });
      // рука с челноком
      s += K.vol('M78 96C64 102 56 112 52 124C52 132 60 136 66 130C68 120 74 112 86 106Z', robe) + K.stitch('M54 126C56 132 62 134 66 130', '#fde68a', 1.4);
      s += K.g(K.part('M-16 0C-10 -6 10 -6 16 0C10 6 -10 6 -16 0Z', '#fbbf24', { line: '#78350f', lw: 1.4 }) + K.part('M-5 -1.6H5V1.6H-5Z', '#78350f', { lw: 0 }), 'translate(56 124) rotate(-30)') + K.part(K.ell(62, 128, 5, 4.6), skin, { line: '#9a6a4a', lw: 1.3 });
      // рука ведёт ленту
      s += K.vol('M122 96C136 100 146 106 152 114C154 120 148 124 144 120C138 114 130 110 120 108Z', robe) + K.part(K.ell(150, 116, 5, 4.6), skin, { line: '#9a6a4a', lw: 1.3 });
      // лицо и причёска с двумя петлями
      s += K.part('M80 58C74 80 74 100 80 112C88 108 92 102 94 96H106C108 102 112 108 120 112C126 100 126 80 120 58Z', '#1f1a2e', { line: '#0f0a1e', lw: 1.4 });
      s += K.vol(K.ell(100, 64, 16.5, 18), { c1: skin, c2: '#eab89a', rim: '#fff3d6', tex: false, hiK: 0.18, lw: 2.2, line: '#8a5a3a' });
      s += K.part('M83.5 64C81 48 90 42 100 42C110 42 119 48 116.5 64C113 56 107 52 100 52C93 52 87 56 83.5 64Z', '#1f1a2e', { line: '#0f0a1e', lw: 1.4 });
      s += `<path d="M91 46C82 34 86 16 100 12C114 16 118 34 109 46ZM96 40C93 33 95 24 100 22C105 24 107 33 104 40Z" fill-rule="evenodd" fill="${K.lin(['#3a3350', '#0f0a1e'])}" stroke="#0f0a1e" stroke-width="1.8" stroke-linejoin="round"/>` + K.line('M90 26Q92 18 98 15', '#6d6a96', 1.4, { op: 0.8 });
      s += K.line('M90 42L74 52M110 42L126 52', '#fde68a', 2) + K.spark(72, 53, 3.4, '#fde68a', '') + K.spark(128, 53, 3.4, '#fde68a', '');
      s += `<path d="M100 54l1.6 2.4l-1.6 2.4l-1.6-2.4z" fill="#818cf8"/>`;
      s += K.eyes(100, 67, 7.5, 4.8, { iris: '#6366f1', lid: 'half', skin, lash: true, look: [0.3, 0.2] });
      s += K.blush(88, 75, 3.6) + K.blush(112, 75, 3.6);
      s += `<path d="M97 77Q100 79.5 103 77Q100 76 97 77Z" fill="#e11d48" stroke="#9f1239" stroke-width="1"/>`;
      s += K.spark(184, 80, 2.6, '#e9d5ff', 'art-float') + K.spark(16, 70, 2.4, '#e9d5ff');
      return s;
    },

    // Лэй-гун: бог грома — синекожий, с орлиным золотым клювом и огненным хохолком, крылья распахнуты; в одной руке
    // молот, в другой зубило; за спиной дугой — кольцо из пяти громовых барабанов; вокруг молнии, под ногами грозовая туча
    cn_leigong(K) {
      const sk = { c1: '#93c5fd', c2: '#1e3a8a', rim: '#fff6b0', rimK: 0.7, line: '#0b1640', texK: 0.25 };
      let s = K.aura('#facc15', 100, 100, 0.4) + K.aura('#60a5fa', 64, 90, 0.25);
      // кольцо барабанов
      s += K.line('M28 112C22 46 178 46 172 112', '#78350f', 6) + K.line('M28 112C22 46 178 46 172 112', '#fbbf24', 3.4);
      const drum = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${K.rad([[0, '#fca5a5'], [0.6, '#dc2626'], [1, '#7f1d1d']], 0.35, 0.3)}" stroke="#450a0a" stroke-width="1.8"/>` +
        `<circle cx="${x}" cy="${y}" r="${r1(r * 0.72)}" fill="${K.rad([[0, '#fffbeb'], [1, '#fde68a']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.2"/>` + K.line(spiral(x, y, r * 0.09, 1.6), '#b45309', 1.2) +
        `<g fill="#fbbf24" stroke="#78350f" stroke-width=".6">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle cx="${r1(x + r * 0.86 * Math.cos(i * Math.PI / 4))}" cy="${r1(y + r * 0.86 * Math.sin(i * Math.PI / 4))}" r="1.3"/>`).join('')}</g>`;
      s += drum(30, 104, 13) + drum(46, 60, 13) + drum(100, 38, 14) + drum(154, 60, 13) + drum(170, 104, 13);
      // крылья
      const wd = 'M86 92C70 80 52 70 32 70C40 76 42 80 40 86C48 86 52 90 52 96C58 96 62 100 62 106C70 104 78 106 84 110Z';
      s += K.mirror(`<g class="art-wing">` + K.part(wd, '#4f46e5', { line: '#1e1b4b', lw: 1.8 }) + K.line('M38 74L80 96M50 88L82 102M58 100L82 106', '#c7d2fe', 1.3, { op: 0.8 }) + '</g>');
      // грозовая туча под ногами
      s += cloud(K, 100, 168, 2.1, { c1: '#cbd5e1', c2: '#475569', line: '#1e293b' });
      // ноги-лапы с когтями
      s += K.mirror(K.vol('M86 138C84 146 82 152 80 158H94C94 152 95 146 96 140Z', sk) + K.line('M80 158l-6 3M84 159l-2 5M90 159l2 5', '#fbbf24', 2.4));
      // юбка из тигровой шкуры
      s += K.vol('M70 122H130L136 146C120 152 80 152 64 146Z', { c1: '#fdba74', c2: '#c2410c', rim: '#fff6b0', line: '#431407', tex: false });
      s += K.part('M80 124C82 132 80 140 76 146L72 144C76 138 76 130 74 124Z', '#1c0a05', { lw: 0 }) + K.part('M102 124C104 132 102 142 98 148L94 147C98 140 98 132 96 124Z', '#1c0a05', { lw: 0 }) + K.part('M124 124C126 132 124 140 120 146L116 144C120 138 120 130 118 124Z', '#1c0a05', { lw: 0 });
      // синий могучий торс
      s += K.vol('M100 80C122 80 134 92 134 108L130 126H70L66 108C66 92 78 80 100 80Z', sk);
      s += K.line('M88 98Q100 104 112 98M86 110Q100 116 114 110', '#1e3a8a', 1.6, { op: 0.6 }) + K.line('M70 124H130', '#fbbf24', 4);
      // рука с молотом
      s += K.vol('M70 90C58 84 50 74 46 62C44 56 50 52 54 56C58 66 64 74 74 82Z', sk) + K.line('M48 66L56 62', '#fbbf24', 3);
      s += K.g(K.part('M-3 0V-30H3V0Z', '#92400e', { line: '#451a03', lw: 1.2 }) + K.part('M-12 -42H12V-28H-12Z', '#fbbf24', { line: '#78350f', lw: 1.6 }) + K.line('M-12 -35H12', '#b45309', 1.2), 'translate(50 60) rotate(-20)') + K.part(K.ell(50, 60, 6.5, 6), '#93c5fd', { line: '#0b1640', lw: 1.6 });
      // рука с зубилом
      s += K.vol('M130 90C142 92 150 98 156 106C158 112 152 116 148 112C142 106 136 102 128 100Z', sk);
      s += K.g(K.part('M0 -4H26L32 0L26 4H0Z', '#e2e8f0', { line: '#334155', lw: 1.4 }) + K.part('M-6 -5H2V5H-6Z', '#92400e', { line: '#451a03', lw: 1.2 }), 'translate(152 110) rotate(-28)') + K.part(K.ell(152, 110, 6.5, 6), '#93c5fd', { line: '#0b1640', lw: 1.6 });
      // голова-птица: хохолок, клюв, грозные глаза
      s += K.g(K.flame(100, 36, 24, 14, '#fff3b0', '#ef4444') + K.g(K.flame(100, 38, 20, 12, '#fff3b0', '#f97316'), 'rotate(-30 100 44)') + K.g(K.flame(100, 38, 20, 12, '#fff3b0', '#f97316'), 'rotate(30 100 44)'), '', '');
      s += K.vol(K.ell(100, 58, 20, 19), sk);
      s += K.gloss(88, 48, 5, 3, -35, 0.5);
      s += K.eyes(100, 54, 9, 6.6, { iris: '#facc15', lid: 'angry', skin: '#3b5fb0', look: [0, 0.2] });
      s += `<path d="M90 64Q100 58 110 64Q110 74 100 82Q98 74 90 64Z" fill="${K.lin(['#fff3b0', '#f59e0b'])}" stroke="#7a3a08" stroke-width="1.6" stroke-linejoin="round"/>`;
      s += zap(K, 18, 140, 1.4, -10) + zap(K, 180, 140, 1.4, 20, '#fde047', 0.6) + zap(K, 100, 14, 1, 0, '#fef08a', 1);
      s += K.spark(14, 40, 3, '#fff6b0', 'art-float') + K.spark(186, 30, 2.6, '#fde047');
      return s;
    },

    // Эрлан-шэнь: трёхглазый бог-воитель — во лбу третий глаз, из которого бьёт луч, видящий сквозь любые превращения;
    // золотой шлем «три горы» с фениксовыми крылышками и алым помпоном, серебряные доспехи с золотой каймой, синий плащ;
    // в руке трёхзубый обоюдоострый клинок саньцзянь, у ног лает верный небесный пёс
    cn_erlang(K) {
      const skin = '#f8d4b4', sk = { c1: skin, c2: '#d9a57e', rim: '#fff6b0', tex: false, lw: 2.2, line: '#7a4a2a' };
      const silver = { c1: '#ffffff', c2: '#8a9ab0', rim: '#fff6b0', rimK: 0.7, line: '#1e293b', texK: 0.2 };
      const gold = { c1: '#fff1a8', c2: '#c08a1a', rim: '#ffffff', rimK: 0.6, line: '#5a3208', tex: false };
      let s = K.aura('#facc15', 100, 100, 0.42) + K.aura('#ffffff', 50, 52, 0.3);
      // лучи третьего глаза
      s += `<g class="art-blink">${[-60, -40, -20, 0, 20, 40, 60].map(a => { const t = (a - 90) * Math.PI / 180; return `<path d="M${r1(100 + 14 * Math.cos(t - 0.05))} ${r1(46 + 14 * Math.sin(t - 0.05))}L${r1(100 + 44 * Math.cos(t))} ${r1(46 + 44 * Math.sin(t))}L${r1(100 + 14 * Math.cos(t + 0.05))} ${r1(46 + 14 * Math.sin(t + 0.05))}Z" fill="#fef9c3" opacity=".75"/>`; }).join('')}</g>`;
      // синий плащ
      s += K.part('M66 90C48 120 42 150 46 172H154C158 150 152 120 134 90Z', '#2563eb', { line: '#0c1a4a', lw: 2 }) + K.line('M56 130C54 146 54 160 56 170M144 130C146 146 146 160 144 170', '#1e3a8a', 1.4, { op: 0.6 });
      // клинок саньцзянь
      s += K.line('M156 176V40', '#450a0a', 4.6) + K.line('M156 176V40', '#b91c1c', 2.6);
      s += K.part('M148 44H164V48H148Z', '#fbbf24', { line: '#78350f', lw: 1.2 }) + K.part('M152 44C150 34 150 26 146 18C152 22 154 30 155 38ZM160 44C162 34 162 26 166 18C160 22 158 30 157 38ZM153 44C153 30 154 16 156 6C158 16 159 30 159 44Z', '#e2e8f0', { line: '#334155', lw: 1.3 });
      s += tassel(K, 156, 50, 14, '#dc2626', 0.6);
      // ноги и сапоги
      s += K.mirror(K.vol('M80 142C78 150 76 158 74 164H94C94 156 94 150 94 144Z', silver) + K.part('M70 162H96L98 176H66Z', '#1f2937', { line: '#0b0f19', lw: 1.6 }));
      // доспехи
      s += K.vol('M68 128H132L140 154C124 160 76 160 60 154Z', silver) + K.line(scaleRow(66, 134, 136, 8.5) + scaleRow(64, 136, 145, 9), '#64748b', 1.2, { op: 0.6 });
      s += K.vol('M100 82C122 82 134 92 136 108L132 130H68L64 108C66 92 78 82 100 82Z', silver);
      s += K.line('M68 128H132', '#fbbf24', 5) + K.rhomb(100, 128, 4.4, '#ef4444', '#450a0a') + K.line('M76 92Q100 104 124 92', '#fbbf24', 3);
      s += `<circle cx="100" cy="108" r="10" fill="${K.rad([[0, '#fffbe6'], [0.6, '#fbbf24'], [1, '#b45309']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.6"/>` + K.line(spiral(100, 108, 0.7, 1.4), '#92400e', 1.2);
      s += K.mirror(K.part('M62 88C68 80 80 80 86 86L82 98C72 98 66 94 62 88Z', '#fbbf24', { line: '#78350f', lw: 1.4 }));
      // руки: одна держит клинок, другая на поясе
      s += K.vol('M132 92C142 96 150 104 154 112C156 118 150 122 146 118C142 112 136 106 128 102Z', silver) + K.part(K.ell(155, 112, 6.5, 6), skin, { line: '#7a4a2a', lw: 1.4 });
      s += K.vol('M68 92C58 100 54 112 58 124C62 128 68 126 70 122C68 114 70 106 76 100Z', silver) + K.part(K.ell(64, 124, 6.5, 6), skin, { line: '#7a4a2a', lw: 1.4 });
      // небесный пёс у ног
      const dog = K.lin(['#6b7280', '#111827']);
      s += `<g transform="translate(32 160)"><path d="M-14 14C-16 4 -10 -4 0 -4C10 -4 16 4 14 14Z" fill="${dog}" stroke="#030712" stroke-width="1.6"/><path d="M-12 8C-20 6 -24 0 -22 -6" fill="none" stroke="#111827" stroke-width="3.4" stroke-linecap="round"/>` +
        `<path d="M-6 -4C-10 -14 -6 -22 2 -22C10 -22 13 -14 10 -6Z" fill="${dog}" stroke="#030712" stroke-width="1.6"/><path d="M8 -17C14 -22 21 -25 24 -21C25 -17 18 -12 10 -10Z" fill="${dog}" stroke="#030712" stroke-width="1.4"/><circle cx="23.4" cy="-21.4" r="1.8" fill="#030712"/>` +
        `<path d="M-6 -18L-10 -28L-1 -21ZM4 -21L6 -31L9 -20Z" fill="#111827" stroke="#030712" stroke-width="1"/><path d="M-4 4C-2 0 2 0 4 4C2 8 -2 8 -4 4Z" fill="#f1f5f9"/><circle cx="3" cy="-15" r="2" fill="#facc15"/><circle cx="3.4" cy="-15.4" r=".7" fill="#fff"/>` +
        `<path d="M13 -11L21 -15" stroke="#7f1d1d" stroke-width="1.6" stroke-linecap="round"/></g>`;
      s += K.line('M58 128q6-4 10 0M60 120q8-6 14 0', '#f8fafc', 1.8, { op: 0.8, cls: 'art-blink' });
      // голова: шлем «три горы» с крылышками
      s += K.mirror(K.part('M78 46C66 42 56 34 50 24C60 26 68 30 74 36C72 28 72 22 76 16C80 26 84 34 86 42Z', '#fbbf24', { line: '#78350f', lw: 1.4 }));
      s += K.vol(K.ell(100, 62, 18, 19), sk);
      s += K.vol('M80 56C78 40 88 30 100 30C112 30 122 40 120 56C112 50 88 50 80 56Z', gold);
      s += K.part('M88 34L92 22L96 32L100 16L104 32L108 22L112 34Z', '#fbbf24', { line: '#78350f', lw: 1.4 }) + `<circle cx="100" cy="14" r="4" fill="#dc2626" stroke="#7f1d1d" stroke-width="1"/>`;
      s += K.line('M80 56C88 50 112 50 120 56', '#b45309', 2.6);
      // третий глаз во лбу
      s += `<ellipse cx="100" cy="47" rx="3.4" ry="5.4" fill="#fffbe6" stroke="${INK}" stroke-width="1.4"/><ellipse cx="100" cy="47.4" rx="1.8" ry="3.2" fill="#f59e0b"/><circle cx="100" cy="47.6" r="1.1" fill="${INK}"/>`;
      s += K.eyes(100, 64, 8, 5.6, { iris: '#78350f', lid: 'angry', skin, look: [0.3, 0.1] });
      s += K.blush(88, 72, 3.6) + K.blush(112, 72, 3.6) + K.line('M95 76Q100 78 105 76', INK, 2);
      s += K.spark(24, 40, 3, '#fff6b0', 'art-float') + K.spark(184, 100, 2.6, '#fde047') + K.spark(18, 110, 2.4, '#fff6b0');
      return s;
    },

    // Гуань Юй: полководец, ставший богом верности и чести — красное лицо, длинная чёрная борода до пояса, «фениксовы»
    // глаза полуприкрыты под густыми бровями; зелёная повязка-футоу с алым помпоном, зелёный халат поверх золотых доспехов;
    // держит алебарду «Зелёный дракон, полумесяц»: широкий серебряный клинок с головой дракона и алой кистью
    cn_guanyu(K) {
      const face = '#d9483b', fc = { c1: '#f07a62', c2: '#a8281d', rim: '#fff6b0', tex: false, lw: 2.2, line: '#4a0e08' };
      const robe = { c1: '#86efac', c2: '#14532d', rim: '#fff6b0', rimK: 0.6, line: '#052e16', texK: 0.25 };
      const gold = { c1: '#fff1a8', c2: '#c08a1a', rim: '#ffffff', rimK: 0.6, line: '#5a3208', texK: 0.2 };
      let s = K.aura('#facc15', 100, 100, 0.4) + K.aura('#4ade80', 60, 80, 0.22);
      // алебарда «Зелёный дракон»
      s += K.line('M150 178L160 22', '#450a0a', 5) + K.line('M150 178L160 22', '#7f1d1d', 3);
      s += K.part('M160 26C176 28 186 42 184 60C182 72 174 80 164 82C170 70 170 56 162 46Z', '#e2e8f0', { line: '#334155', lw: 1.6 }) + K.line('M166 34C176 40 180 52 176 66', '#ffffff', 1.4, { op: 0.8 });
      s += K.part('M154 46C150 40 152 32 158 30C164 30 166 36 164 42C162 46 158 48 154 46Z', '#22c55e', { line: '#052e16', lw: 1.4 }) + `<circle cx="158" cy="37" r="1.4" fill="#facc15"/>` + K.part('M158 20L162 8L166 20Z', '#e2e8f0', { line: '#334155', lw: 1.2 });
      s += tassel(K, 158, 50, 18, '#dc2626', 0.2);
      // сапоги, доспехи, зелёный халат
      s += K.mirror(K.part('M72 160H96L98 176H66C64 170 66 164 72 160Z', '#111827', { line: '#05060c', lw: 1.6 }));
      s += K.vol('M100 84C130 84 146 100 150 120L158 166C142 172 58 172 42 166L50 120C54 100 70 84 100 84Z', robe);
      s += K.part('M84 92H116L118 166H82Z', '#fbbf24', { line: '#78350f', lw: 1.4 }) + K.line(scaleRow(86, 114, 104, 7) + scaleRow(86, 114, 116, 7) + scaleRow(85, 115, 128, 7.5) + scaleRow(84, 116, 140, 8) + scaleRow(84, 116, 152, 8), '#a16207', 1.1, { op: 0.75 });
      s += K.line('M58 132Q100 142 142 132', '#78350f', 7) + K.rhomb(100, 137, 6, '#22c55e', '#052e16');
      s += K.stitch('M46 164Q100 176 154 164', '#fde68a', 2);
      // руки
      s += K.vol('M130 98C142 100 150 108 154 118C156 124 150 128 146 124C142 116 136 110 126 108Z', robe) + K.part(K.ell(154, 120, 7, 6.5), face, { line: '#4a0e08', lw: 1.4 });
      s += K.vol('M70 98C58 104 52 116 52 128C54 134 62 134 64 128C64 118 70 110 78 106Z', robe) + K.part(K.ell(58, 130, 7, 6.5), face, { line: '#4a0e08', lw: 1.4 });
      // голова
      s += K.vol(K.ell(100, 60, 19, 20), fc);
      s += K.vol('M80 56C78 38 88 28 100 28C112 28 122 38 120 56C112 48 88 48 80 56Z', { c1: '#4ade80', c2: '#14532d', rim: '#fff6b0', rimK: 0.4, line: '#052e16', lw: 2, tex: false });
      s += K.line('M80 56C88 48 112 48 120 56', '#fbbf24', 2.4) + `<circle cx="100" cy="30" r="5" fill="${K.rad([[0, '#fecaca'], [1, '#dc2626']], 0.35, 0.3)}" stroke="#7f1d1d" stroke-width="1.2"/>`;
      s += K.g(K.line('M120 46C130 50 134 58 132 68', '#16a34a', 3), '', 'art-sway');
      // брови-«шелкопряды», полуприкрытые глаза
      s += K.mirror(K.part('M80 52C84 46 92 46 97 52C92 51 86 52 82 56Z', '#111827', { lw: 0 }));
      s += K.eyes(100, 60, 8.5, 5, { iris: '#78350f', lid: 'half', skin: face, look: [0.2, 0.3] });
      // длинная борода и усы
      s += K.vol('M84 72C78 92 82 116 92 132C96 140 100 146 100 146C100 146 104 140 108 132C118 116 122 92 116 72C110 78 106 80 100 80C94 80 90 78 84 72Z', { c1: '#4b5563', c2: '#05060c', rim: '#fff6b0', rimK: 0.4, line: '#05060c', lw: 2, tex: false });
      s += K.line('M92 92q-3 14 1 30M100 88q-1 20 0 44M108 92q3 14-1 30', '#374151', 1.6);
      s += K.mirror(K.part('M100 74C94 71 86 73 82 78C86 79 92 77 100 77Z', '#111827', { lw: 0 }));
      s += `<ellipse cx="100" cy="70" rx="4" ry="3" fill="#b8352a"/>`;
      s += K.spark(24, 40, 3, '#fff6b0', 'art-float') + K.spark(20, 120, 2.6, '#fde047') + K.spark(184, 120, 2.4, '#fff6b0');
      return s;
    },

    // Таоте: ненасытное чудище с древних бронзовых сосудов — от него осталась одна голова: бронзово-бирюзовая маска
    // с золотыми узорами «облаков и грома», рога-завитки, выпученные глаза в золотых ободках и огромная пасть с зубами;
    // маленькими лапками он держит пирожок-баоцзы. Вокруг — узор громовых спиралей и искры
    cn_taotie(K) {
      const br = { c1: '#7ff0d6', c2: '#0f5f56', rim: '#fff6b0', rimK: 0.65, line: '#042f2e', texK: 0.25 };
      let s = K.aura('#facc15', 100, 100, 0.38) + K.aura('#2dd4bf', 60, 86, 0.25);
      // громовые спирали-лэйвэнь
      const lw = (x, y, k) => `<path d="M${x} ${y}h${6 * k}v${6 * k}h${-4 * k}v${-3 * k}h${2 * k}" fill="none" stroke="#fde68a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
      s += `<g class="art-blink">${lw(16, 24, 1.4)}${lw(170, 30, 1.2)}${lw(14, 150, 1.2)}${lw(176, 150, 1.4)}${lw(30, 90, 1)}${lw(168, 96, 1)}</g>`;
      // рога-завитки
      const horn = 'M66 58C52 50 38 54 30 66C22 80 30 96 44 96C56 96 60 84 54 78C50 74 44 76 44 82';
      s += K.mirror(K.line(horn, '#042f2e', 15) + K.line(horn, K.lin(['#fde68a', '#d4a017', '#8a5a0c']), 10.6) + K.line(horn, '#fff7c2', 2.6, { op: 0.7 }));
      // уши
      s += K.mirror(K.part('M58 96C46 96 38 104 38 114C46 116 54 112 60 106Z', '#2a9d8a', { line: '#042f2e', lw: 1.8 }));
      // маска-голова
      s += K.vol('M100 50C134 50 152 70 152 98C152 122 138 140 120 148C112 152 88 152 80 148C62 140 48 122 48 98C48 70 66 50 100 50Z', br);
      // золотые узоры «облака и гром»
      s += K.mirror(K.line(spiral(70, 128, 1.1, 1.5), '#fbbf24', 1.6, { op: 0.85 }) + K.line('M58 80C64 70 74 66 84 68M56 104C60 112 64 116 70 118', '#fbbf24', 1.6, { op: 0.8 }));
      s += K.line('M100 54V74M92 58L100 66L108 58', '#fbbf24', 2.2) + K.rhomb(100, 78, 5, '#fbbf24', '#78350f');
      // брови-языки и глаза
      s += K.mirror(K.part('M66 70C74 62 86 62 94 70C86 70 78 72 72 78Z', '#134e4a', { line: '#042f2e', lw: 1.2 }));
      s += K.mirror(`<circle cx="80" cy="88" r="13" fill="${K.rad([[0, '#fff7c2'], [1, '#d4a017']])}" stroke="#78350f" stroke-width="1.8"/>`);
      s += K.eyes(100, 88, 20, 10, { iris: '#dc2626', look: [0.3, 0.3] });
      // ноздри
      s += `<ellipse cx="93" cy="104" rx="3.4" ry="2.4" fill="#042f2e"/><ellipse cx="107" cy="104" rx="3.4" ry="2.4" fill="#042f2e"/>`;
      // огромная пасть
      s += `<path d="M64 112Q100 106 136 112Q132 146 100 148Q68 146 64 112Z" fill="#4a0d16" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><ellipse cx="100" cy="136" rx="16" ry="6" fill="#f47a8f"/>`;
      let t = 'M66 112.5';
      for (let i = 0; i < 7; i++) t += `L${r1(70 + i * 10)} 121L${r1(75 + i * 10)} 112.5`;
      s += `<path d="${t}Z" fill="#fff"/><path d="M76 146l4-8l4 8ZM116 146l4-8l4 8Z" fill="#fff" stroke="${INK}" stroke-width=".8"/>`;
      // лапки с пирожком-баоцзы
      s += `<g class="art-float" style="animation-delay:-.5s"><path d="M86 160C86 150 114 150 114 160C114 168 86 168 86 160Z" fill="${K.rad([[0, '#ffffff'], [1, '#e7d8c0']], 0.4, 0.3)}" stroke="#78350f" stroke-width="1.6"/>` + K.line('M92 154Q100 150 108 154M96 152L100 156L104 152', '#c9a77a', 1.2) + '</g>';
      s += K.mirror(K.vol('M72 146C70 154 72 162 80 166C86 166 90 160 88 154C84 152 80 150 78 146Z', { ...br, lw: 2, tex: false }) + `<path d="M80 166l-2 4M84 166l0 4M88 164l2 3" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`);
      s += K.blush(60, 112, 6) + K.blush(140, 112, 6);
      s += zap(K, 30, 46, 1.1, -30) + zap(K, 166, 60, 1.1, 20, '#fde047', 0.6) + K.spark(186, 120, 2.6, '#fff6b0', 'art-float') + K.spark(16, 120, 2.4, '#fde047');
      return s;
    },

    // Принцесса Тешань: хозяйка волшебного пальмового веера — высокая причёска со шпилькой-фениксом, сиреневый халат
    // с летящими рукавами, гордая усмешка; взмахивает огромным зелёным веером-листом, и от него закручивается ветер,
    // а огоньки Огненных гор внизу гнутся и гаснут, превращаясь в дымок
    cn_tieshan(K) {
      const skin = '#fde3cf', robe = { c1: '#e9d5ff', c2: '#7e22ce', rim: '#eef0ff', rimK: 0.6, line: '#3b0764', texK: 0.35 };
      let s = K.aura('#a5b4fc', 100, 100, 0.42) + K.aura('#84cc16', 54, 58, 0.22);
      // ветер от веера
      s += `<g class="art-float">${K.line('M126 70C148 60 170 70 168 90C166 104 150 104 150 94C150 86 160 86 160 92', '#e0e7ff', 3, { op: 0.8 })}${K.line('M132 96C156 96 178 108 186 126', '#e0e7ff', 2.4, { op: 0.7 })}${K.line('M126 112C146 118 160 132 162 150', '#e0e7ff', 2, { op: 0.6 })}</g>`;
      // огоньки Огненных гор гнутся и гаснут
      s += K.part('M120 178L136 150L148 164L162 140L178 162L196 150L204 178Z', '#7c2d12', { line: '#431407', lw: 1.6 });
      s += K.g(K.flame(146, 168, 18, 12, '#fff3b0', '#ef4444'), 'rotate(50 146 168)') + K.g(K.flame(172, 166, 16, 11, '#fff3b0', '#f97316', { style: 'animation-delay:-.5s' }), 'rotate(60 172 166)');
      s += K.line('M184 150C190 142 186 134 192 128M160 140C166 132 162 124 168 118', '#cbd5e1', 2, { op: 0.7, cls: 'art-float' });
      // халат
      s += K.vol('M100 86C114 86 122 94 126 106C134 130 142 150 150 168C130 176 70 176 50 168C58 150 66 130 74 106C78 94 86 86 100 86Z', robe);
      s += K.stitch('M52 167Q100 178 148 167', '#fde68a', 2) + K.line('M76 116Q100 124 124 116', '#4c1d95', 6) + K.stitch('M76 116Q100 124 124 116', '#fde68a', 1.4);
      s += K.part('M88 88Q100 98 112 88L110 94Q100 102 90 94Z', '#4c1d95', { line: '#2e1065', lw: 1.2 });
      s += K.g(K.line('M98 122C94 140 88 154 84 168M102 122C106 140 112 154 116 168', '#f472b6', 2.6), '', 'art-sway');
      // свободная рука в бок
      s += K.vol('M78 96C64 104 58 116 60 128C62 134 70 134 72 130C72 120 76 112 84 106Z', robe) + K.part(K.ell(68, 130, 5.5, 5), skin, { line: '#9a6a4a', lw: 1.4 });
      // огромный пальмовый веер
      const fan = 'M0 0C-30 -6 -50 -26 -52 -52C-50 -78 -28 -96 0 -98C28 -96 50 -78 52 -52C50 -26 30 -6 0 0Z';
      let f = K.part(fan, '#4ade80', { line: '#14532d', lw: 2 });
      f += K.line([-70, -50, -30, -10, 10, 30, 50, 70].map(a => { const t = (a - 90) * Math.PI / 180; return `M0 -4L${r1(50 * Math.cos(t))} ${r1(-50 + 46 * Math.sin(t))}`; }).join(''), '#166534', 1.4, { op: 0.7 });
      f += K.line('M-46 -60Q-48 -80 -30 -92', '#ffffff', 2, { op: 0.45 }) + K.part('M-4 0H4V30H-4Z', '#92400e', { line: '#451a03', lw: 1.2 }) + tassel(K, 0, 30, 14, '#dc2626', 0.4);
      s += `<g class="art-spin-soft" style="transform-origin:50% 100%"><g transform="translate(132 104) rotate(28) scale(.86)">${f}</g></g>`;
      s += K.vol('M122 96C134 100 142 104 148 108C152 112 148 118 144 116C138 112 130 108 120 106Z', robe) + K.part(K.ell(146, 112, 5.5, 5), skin, { line: '#9a6a4a', lw: 1.4 });
      // лицо и причёска со шпилькой-фениксом
      s += K.part('M80 58C76 78 76 96 80 106C88 102 92 98 94 92H106C108 98 112 102 120 106C124 96 124 78 120 58Z', '#1f1a2e', { line: '#0f0a1e', lw: 1.4 });
      s += K.vol(K.ell(100, 64, 16.5, 18), { c1: skin, c2: '#eab89a', rim: '#fff3d6', tex: false, hiK: 0.18, lw: 2.2, line: '#8a5a3a' });
      s += K.part('M83.5 64C81 48 90 42 100 42C110 42 119 48 116.5 64C113 56 107 52 100 52C93 52 87 56 83.5 64Z', '#1f1a2e', { line: '#0f0a1e', lw: 1.4 });
      s += K.vol('M86 46C80 30 88 16 100 14C112 16 120 30 114 46Z', { c1: '#3a3350', c2: '#0f0a1e', rim: '#c4b5fd', rimK: 0.4, line: '#0f0a1e', lw: 1.8, tex: false });
      s += K.line('M90 26Q100 22 110 26', '#6d6a96', 1.4, { op: 0.8 }) + K.line('M108 26L130 14', '#fbbf24', 2.4) + K.part('M128 16C134 8 142 8 146 12C140 12 136 16 134 20Z', '#fbbf24', { line: '#78350f', lw: 1 }) + `<circle cx="130" cy="14" r="2.4" fill="#ef4444" stroke="#7f1d1d" stroke-width=".8"/>`;
      s += K.eyes(100, 67, 7.5, 4.8, { iris: '#7e22ce', lid: 'angry', skin, lash: true, look: [0.5, 0.1] });
      s += K.blush(88, 75, 3.6) + K.blush(112, 75, 3.6);
      s += `<path d="M96 77Q100 80 105 76Q100 77.5 96 77Z" fill="#be123c" stroke="#9f1239" stroke-width="1"/>`;
      s += K.spark(24, 40, 3, '#e0e7ff', 'art-float') + K.spark(28, 150, 2.6, '#e0e7ff') + K.spark(180, 30, 2.4, '#ffffff');
      return s;
    },

    // Шэнь-нун: божественный земледелец — крепкий бородач с бычьими рожками, в накидке и юбке из листьев, босиком;
    // за спиной бамбуковая корзина с травами, грибом линчжи и женьшенем, а сам он задумчиво пробует на вкус веточку
    // с цветком — сто трав перепробовал! Под ногами всходят ростки
    cn_shennong(K) {
      const skin = '#e6a878', sk = { c1: skin, c2: '#b06a3c', rim: '#e4ffb0', tex: false, lw: 2.2, line: '#5a2a10' };
      let s = K.aura('#84cc16', 100, 104, 0.4);
      s += K.line('M18 178q2-10-2-16M28 178q0-8 4-12M172 178q-2-10 2-14M182 178q2-8-2-12', '#4d7c0f', 2.4) + K.leaf(40, 176, 12, -70, '#84cc16') + K.leaf(160, 176, 12, -110, '#65a30d');
      // корзина с травами за спиной
      s += K.leaf(52, 52, 22, -120, '#65a30d') + K.leaf(56, 54, 20, -80, '#84cc16') + K.leaf(146, 50, 22, -60, '#65a30d') + K.leaf(142, 54, 18, -100, '#a3e635');
      s += K.part('M128 46C128 36 146 34 150 44C146 44 138 46 136 52Z', '#c2410c', { line: '#7c2d12', lw: 1.4 }) + `<g stroke="#7f1d1d" stroke-width=".7" fill="#dc2626"><circle cx="64" cy="40" r="2.6"/><circle cx="60" cy="44" r="2.4"/><circle cx="67" cy="45" r="2.4"/></g>`;
      s += K.part('M60 62C60 56 140 56 140 62L132 108C126 114 74 114 68 108Z', '#b07a32', { line: '#4a2a08', lw: 2 });
      s += K.line('M66 66L80 110M82 64L96 112M98 64L112 112M114 64L126 106M134 66L120 110M118 64L104 112M102 64L88 112M86 64L74 108', '#6b4210', 1.3, { op: 0.55 });
      s += K.part('M56 54H144V64H56Z', '#8a5a1a', { line: '#4a2a08', lw: 1.6 }) + K.line('M58 59H142', '#d6a85a', 1.4, { op: 0.8 });
      // юбка из листьев, ноги
      s += K.mirror(K.vol('M82 148C80 156 78 162 76 168H92C92 162 93 156 94 150Z', sk) + K.part(K.ell(84, 170, 10, 5), skin, { line: '#5a2a10', lw: 1.6 }));
      [[70, 128, 116], [84, 130, 100], [100, 132, 90], [116, 130, 80], [130, 128, 64]].forEach(([x, y, r]) => { s += K.leaf(x, y, 30, r, '#4d7c0f'); });
      // торс, накидка из листьев
      s += K.vol('M100 80C122 80 134 92 136 108L132 132H68L64 108C66 92 78 80 100 80Z', sk);
      s += K.line('M84 100Q100 106 116 100M86 114Q100 120 114 114', '#8a4a20', 1.4, { op: 0.5 });
      [[72, 84, 150], [84, 82, 120], [100, 80, 90], [116, 82, 60], [128, 84, 30], [66, 96, 160], [134, 96, 20]].forEach(([x, y, r]) => { s += K.leaf(x, y, 24, r, '#65a30d'); });
      s += K.line('M68 130H132', '#78350f', 4) + K.line('M68 130H132', '#a16207', 2);
      // руки: одна несёт веточку ко рту, другая на поясе
      s += K.vol('M74 92C62 98 56 108 58 118C62 122 68 120 70 114C70 106 74 100 80 96Z', sk);
      s += K.vol('M128 92C138 98 140 86 136 76C134 70 128 70 126 74C126 82 124 86 120 90Z', sk) + K.part(K.ell(130, 72, 6.5, 6), skin, { line: '#5a2a10', lw: 1.6 });
      s += K.line('M128 70L112 58', '#4d7c0f', 2) + K.leaf(118, 62, 10, -150, '#84cc16') + K.leaf(124, 66, 9, -30, '#65a30d') + `<g fill="#f9a8d4" stroke="#9d174d" stroke-width=".7"><circle cx="110" cy="56" r="2.4"/><circle cx="113" cy="54" r="2.4"/><circle cx="111" cy="59" r="2.4"/></g><circle cx="111.4" cy="56.4" r="1.2" fill="#fde047"/>`;
      // голова с рожками и бородой
      s += K.mirror(K.part('M82 44C76 38 70 28 72 18C78 24 84 30 88 38Z', '#f5e6c8', { line: '#5a3a10', lw: 1.6 }));
      s += K.vol(K.ell(100, 58, 19, 20), sk);
      s += K.part('M82 52C80 40 88 34 100 34C112 34 120 40 118 52C112 46 106 44 100 44C94 44 88 46 82 52Z', '#3b2412', { line: '#1c0f06', lw: 1.4 });
      s += K.vol('M84 66C80 80 86 92 94 98C96 100 100 104 100 104C100 104 104 100 106 98C114 92 120 80 116 66C110 72 106 74 100 74C94 74 90 72 84 66Z', { c1: '#7a5230', c2: '#2e1a0a', rim: '#e4ffb0', rimK: 0.4, line: '#1c0f06', lw: 1.8, tex: false });
      s += K.mirror(K.line('M86 52Q91 49 96 52', '#3b2412', 2.2));
      s += K.eyes(100, 59, 8, 5.4, { iris: '#4d7c0f', lid: 'half', skin, look: [0.6, -0.2] });
      s += K.blush(86, 66, 3.6) + K.blush(114, 66, 3.6) + `<ellipse cx="104" cy="72" rx="3.4" ry="2.2" fill="#7f1d1d"/>`;
      s += K.spark(24, 90, 3, '#e4ffb0', 'art-float') + K.spark(178, 120, 2.6, '#fde68a') + K.spark(20, 140, 2.4, '#e4ffb0');
      return s;
    },

    // Си-ван-му: Владычица Запада с горы Куньлунь — на голове убор-шэн (перекладина с двумя дисками), высокая причёска,
    // малиново-розовое платье с золотом и нефритовой подвеской; в руках золотое блюдо с тремя персиками бессмертия,
    // на плече её вестница — синяя птица цинняо. Позади нефритовые пики Куньлуня и ветка персика в цвету
    cn_xiwangmu(K) {
      const skin = '#fde8d8', robe = { c1: '#fbcfe8', c2: '#9d174d', rim: '#e4ffb0', rimK: 0.6, line: '#4a0a26', texK: 0.25 };
      const hair = { c1: '#3a3350', c2: '#0f0a1e', rim: '#e4ffb0', rimK: 0.4, line: '#0f0a1e', lw: 1.6, tex: false };
      let s = K.aura('#84cc16', 100, 100, 0.38) + K.aura('#f9a8d4', 64, 70, 0.25);
      // нефритовые пики Куньлуня в облаках
      s += `<path d="M-4 132L22 70L36 92L54 52L74 96L90 80L104 108V140H-4ZM96 140L118 96L134 110L154 60L174 94L190 76L204 120V140Z" fill="${K.lin(['#a7f3d0', '#047857'])}" stroke="#064e3b" stroke-width="1.4" stroke-linejoin="round" opacity=".55"/>`;
      s += cloud(K, 36, 120, 0.7, { c1: '#ffffff', c2: '#d1fae5', line: '#047857', op: 0.85 }) + cloud(K, 166, 118, 0.6, { c1: '#ffffff', c2: '#d1fae5', line: '#047857', flip: true, op: 0.85 });
      // ветка персика в цвету
      s += K.line('M-4 26C20 20 36 28 52 18', '#5b3a1a', 3.4) + K.leaf(24, 24, 12, -60, '#65a30d') + K.leaf(42, 24, 11, 40, '#4d7c0f');
      s += `<g fill="#fbcfe8" stroke="#be185d" stroke-width=".7"><circle cx="12" cy="22" r="3"/><circle cx="34" cy="18" r="3"/><circle cx="50" cy="22" r="2.6"/></g>` + peach(K, 30, 34, 6);
      // платье
      s += K.vol('M100 88C116 88 124 96 128 108C136 132 146 152 156 170C136 180 64 180 44 170C54 152 64 132 72 108C76 96 84 88 100 88Z', robe);
      s += K.stitch('M46 169Q100 182 154 169', '#fbbf24', 2) + K.line('M84 120C80 140 72 156 64 170M116 120C120 140 128 156 136 170', '#f9a8d4', 1.4, { op: 0.8 });
      s += K.part('M88 90Q100 100 112 90L110 96Q100 104 90 96Z', '#fbbf24', { line: '#78350f', lw: 1.2 });
      s += K.line('M100 100V120', '#fbbf24', 1.6) + `<circle cx="100" cy="124" r="5" fill="${K.rad([[0, '#d1fae5'], [1, '#059669']], 0.35, 0.3)}" stroke="#064e3b" stroke-width="1.2"/>` + tassel(K, 100, 129, 14, '#dc2626', 0.4);
      // рукава и блюдо с персиками
      s += K.mirror(K.vol('M78 98C66 106 60 118 62 130C66 138 76 138 82 132C84 122 86 112 92 104Z', robe) + K.stitch('M62 132C66 138 76 138 82 132', '#fbbf24', 1.6));
      s += `<ellipse cx="100" cy="136" rx="30" ry="7" fill="${K.lin(['#fff7c2', '#fbbf24', '#b45309'])}" stroke="#78350f" stroke-width="1.8"/>`;
      s += peach(K, 86, 124, 9, -10) + peach(K, 114, 124, 9, 10) + peach(K, 100, 118, 10);
      s += K.part(K.ell(74, 134, 6, 5.4), skin, { line: '#9a6a4a', lw: 1.4 }) + K.part(K.ell(126, 134, 6, 5.4), skin, { line: '#9a6a4a', lw: 1.4 });
      // лицо, причёска и убор-шэн
      s += K.part('M80 58C74 80 76 98 80 106C88 102 92 96 94 90H106C108 96 112 102 120 106C124 98 126 80 120 58Z', '#1f1a2e', { line: '#0f0a1e', lw: 1.4 });
      s += K.vol(K.ell(100, 64, 16.5, 18), { c1: skin, c2: '#eab89a', rim: '#fff3d6', tex: false, hiK: 0.18, lw: 2.2, line: '#8a5a3a' });
      s += K.part('M83.5 64C81 48 90 42 100 42C110 42 119 48 116.5 64C113 56 107 52 100 52C93 52 87 56 83.5 64Z', '#1f1a2e', { line: '#0f0a1e', lw: 1.4 });
      s += K.vol('M88 46C84 34 90 24 100 22C110 24 116 34 112 46Z', hair);
      s += K.part('M64 38H136V44H64Z', '#fbbf24', { line: '#78350f', lw: 1.4 });
      s += K.mirror(`<circle cx="62" cy="41" r="8" fill="${K.rad([[0, '#d1fae5'], [0.6, '#10b981'], [1, '#065f46']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.8"/><circle cx="62" cy="41" r="3" fill="#fbbf24" stroke="#78350f" stroke-width="1"/>`);
      s += `<path d="M100 54l1.6 2.4l-1.6 2.4l-1.6-2.4z" fill="#e11d48"/>`;
      s += K.eyes(100, 67, 7.5, 4.8, { iris: '#059669', lid: 'half', skin, lash: true, look: [0.2, 0.3] });
      s += K.blush(88, 75, 3.6) + K.blush(112, 75, 3.6) + `<path d="M97 77Q100 79.5 103 77Q100 76 97 77Z" fill="#e11d48" stroke="#9f1239" stroke-width="1"/>`;
      // синяя птица-вестница на плече
      s += `<g class="art-float" style="animation-delay:-.6s"><g transform="translate(140 84)">` + K.part('M-10 4C-10 -6 0 -12 8 -8C14 -4 14 4 8 8C2 12 -8 10 -10 4Z', '#38bdf8', { line: '#0c4a6e', lw: 1.4 }) + K.part('M-8 4L-22 10L-10 0Z', '#0ea5e9', { line: '#0c4a6e', lw: 1.2 }) +
        K.part('M2 -10C2 -18 10 -20 14 -16C16 -12 12 -8 8 -8Z', '#38bdf8', { line: '#0c4a6e', lw: 1.2 }) + `<path d="M14 -14l5 1l-5 2z" fill="#fbbf24" stroke="#78350f" stroke-width=".6"/><circle cx="10" cy="-15" r="1.4" fill="${INK}"/><path d="M6 -18C6 -24 10 -26 12 -24" fill="none" stroke="#0ea5e9" stroke-width="1.6"/></g></g>`;
      s += K.spark(178, 40, 3, '#fde68a', 'art-float') + K.spark(20, 150, 2.6, '#e4ffb0') + K.spark(186, 150, 2.4, '#fbcfe8');
      return s;
    },

    // Мацзу: морская богиня-хранительница — красное платье с золотом, корона-фэнгуань с жемчужными подвесками, добрая
    // улыбка; в поднятой руке горит красный фонарь, чей свет ведёт корабли, в другой — нефритовый жезл-жуи. Стоит на волнах,
    // за ней спешит к берегу джонка с красным парусом
    cn_mazu(K) {
      const skin = '#fde8d8', robe = { c1: '#fca5a5', c2: '#991b1b', rim: '#c8f3ff', rimK: 0.6, line: '#450a0a', texK: 0.2 };
      let s = K.aura('#38bdf8', 100, 100, 0.4) + `<circle class="art-aura" cx="148" cy="40" r="34" fill="${K.rad([[0, '#fde68a', 0.6], [1, '#f97316', 0]])}"/>`;
      // джонка с красным парусом
      s += `<g class="art-float" style="animation-delay:-.8s">` + K.part('M150 150H190L184 160H156Z', '#92400e', { line: '#451a03', lw: 1.4 }) + K.line('M170 150V118', '#451a03', 2) + K.part('M171 120C180 124 184 136 182 146H171Z', '#dc2626', { line: '#7f1d1d', lw: 1.2 }) + K.line('M172 128H180M172 136H182', '#7f1d1d', 1, { op: 0.6 }) + '</g>';
      // волны
      s += waves(K, -4, 204, 156, { step: 26, h: 24 });
      // платье
      s += K.vol('M100 86C114 86 122 94 126 106C134 130 142 148 150 162C132 172 68 172 50 162C58 148 66 130 74 106C78 94 86 86 100 86Z', robe);
      s += K.part('M86 100H114L118 164H82Z', '#fbbf24', { line: '#78350f', lw: 1.4 }) + K.line('M90 116Q100 120 110 116M88 132Q100 136 112 132M86 148Q100 152 114 148', '#b45309', 1.4, { op: 0.7 });
      s += K.stitch('M52 161Q100 172 148 161', '#fbbf24', 2) + K.part('M88 88Q100 98 112 88L110 94Q100 102 90 94Z', '#fbbf24', { line: '#78350f', lw: 1.2 });
      // рука с жезлом-жуи
      s += K.vol('M78 96C64 104 58 116 60 128C64 134 72 134 76 128C76 118 80 110 88 104Z', robe);
      s += K.line('M64 132C60 120 62 108 58 98', '#047857', 4) + K.line('M64 132C60 120 62 108 58 98', '#34d399', 2) + K.part('M50 96C50 86 62 84 64 92C64 98 58 100 54 98C52 100 50 98 50 96Z', '#34d399', { line: '#065f46', lw: 1.4 });
      s += K.part(K.ell(66, 128, 5.5, 5), skin, { line: '#9a6a4a', lw: 1.4 });
      // поднятая рука с фонарём
      s += K.vol('M122 96C132 90 140 80 144 70C146 64 152 64 152 70C150 82 142 94 130 104Z', robe) + K.part(K.ell(148, 66, 5.5, 5), skin, { line: '#9a6a4a', lw: 1.4 });
      s += K.line('M148 60V46', '#78350f', 1.6) + `<g class="art-sway" style="transform-origin:50% 0"><ellipse cx="148" cy="34" rx="11" ry="13" fill="${K.rad([[0, '#fff7c2'], [0.45, '#ef4444'], [1, '#991b1b']])}" stroke="#450a0a" stroke-width="1.4"/><path d="M141 21H155M141 47H155" stroke="#fbbf24" stroke-width="2.6"/>` + K.line('M140 30Q148 26 156 30M140 38Q148 42 156 38', '#7f1d1d', 1, { op: 0.6 }) + '</g>';
      s += K.line('M148 21V14', '#78350f', 1.6);
      // лицо и корона-фэнгуань
      s += K.part('M80 60C76 78 78 94 82 102C88 98 92 94 94 88H106C108 94 112 98 118 102C122 94 124 78 120 60Z', '#1f1a2e', { line: '#0f0a1e', lw: 1.4 });
      s += K.vol(K.ell(100, 64, 16.5, 18), { c1: skin, c2: '#eab89a', rim: '#fff3d6', tex: false, hiK: 0.18, lw: 2.2, line: '#8a5a3a' });
      s += K.part('M83.5 64C81 48 90 42 100 42C110 42 119 48 116.5 64C113 56 107 52 100 52C93 52 87 56 83.5 64Z', '#1f1a2e', { line: '#0f0a1e', lw: 1.4 });
      s += K.vol('M78 46C78 28 88 20 100 20C112 20 122 28 122 46C112 40 88 40 78 46Z', { c1: '#fff1a8', c2: '#c08a1a', rim: '#ffffff', rimK: 0.6, line: '#5a3208', lw: 2, tex: false });
      s += K.mirror(K.part('M86 30C80 22 72 20 66 24C72 26 76 30 80 36Z', '#fbbf24', { line: '#78350f', lw: 1.2 }) + K.line('M80 46V56M76 45V53', '#fde68a', 1.2) + `<circle cx="80" cy="57" r="1.8" fill="#fff" stroke="#94a3b8" stroke-width=".6"/><circle cx="76" cy="54" r="1.6" fill="#fff" stroke="#94a3b8" stroke-width=".6"/>`);
      s += K.rhomb(100, 30, 5, '#ef4444', '#7f1d1d') + `<circle cx="100" cy="18" r="3.4" fill="#ffffff" stroke="#94a3b8" stroke-width="1"/>`;
      s += `<path d="M100 54l1.6 2.4l-1.6 2.4l-1.6-2.4z" fill="#e11d48"/>`;
      s += K.eyes(100, 67, 7.5, 4.8, { iris: '#0369a1', lid: 'half', skin, lash: true, look: [0.3, 0.2] });
      s += K.blush(88, 75, 3.6) + K.blush(112, 75, 3.6) + K.mouth('smile', 100, 76, 7);
      s += K.spark(24, 40, 3, '#e0f7ff', 'art-float') + K.spark(184, 100, 2.6, '#fde68a') + K.spark(20, 120, 2.4, '#e0f7ff');
      return s;
    },

    // Чжу Бацзе: бывший небесный маршал, а ныне свин-паломник — круглый, розовый, с ушами-лопухами и пятачком, в чёрной
    // монашеской шапочке и синем халате с поясом на толстом животе; через плечо грабли-девятизубец, в лапе огромный ломоть
    // арбуза (на щеке прилипли семечки), глаза блаженно зажмурены. Внизу волны Небесной реки
    cn_bajie(K) {
      const pig = { c1: '#ffd6e2', c2: '#e2708f', rim: '#c8f3ff', rimK: 0.65, line: '#5a1a2a', texK: 0.15 };
      const robe = { c1: '#7aa2f7', c2: '#1e2a6a', rim: '#c8f3ff', rimK: 0.55, line: '#0b1238', texK: 0.25 };
      let s = K.aura('#38bdf8', 98, 106, 0.38);
      s += waves(K, -4, 204, 160, { step: 26, h: 20, c1: '#93c5fd', c2: '#1e3a8a', line: '#0b1238' });
      // грабли-девятизубец через плечо
      s += K.line('M40 176L150 30', '#3b2006', 5) + K.line('M40 176L150 30', '#a87447', 3);
      s += K.g(K.part('M-24 -5H24V5H-24Z', '#cbd5e1', { line: '#334155', lw: 1.4 }) + K.line([...Array(9)].map((_, i) => `M${-22 + i * 5.5} 5V16`).join(''), '#94a3b8', 2.6) + K.line([...Array(9)].map((_, i) => `M${-22 + i * 5.5} 5V16`).join(''), '#334155', 0.8, { op: 0.6 }), 'translate(150 30) rotate(37)');
      // ножки
      s += K.mirror(K.part('M74 150H92V166H70C68 160 70 154 74 150Z', '#111827', { line: '#05060c', lw: 1.6 }));
      // синий халат, толстый живот, пояс
      s += K.vol('M100 84C130 84 150 102 154 126C158 150 140 164 100 164C60 164 42 150 46 126C50 102 70 84 100 84Z', robe);
      s += K.vol(K.ell(100, 130, 30, 26), pig);
      s += K.line('M100 120C104 124 104 130 100 132', '#c2557a', 1.6, { op: 0.7 }) + K.line('M58 112Q100 124 142 112', '#fbbf24', 5) + K.line('M70 100L100 116L130 100', '#0b1238', 2, { op: 0.5 });
      // лапа с арбузом
      s += K.vol('M70 100C58 106 50 116 50 128C52 134 60 134 62 130C62 120 66 112 76 106Z', robe);
      s += K.g(K.part('M-20 0A20 20 0 0 0 20 0Z', '#ef4444', { line: '#14532d', lw: 2.2 }) + K.line('M-19 2A19 19 0 0 0 19 2', '#22c55e', 3) + `<g fill="#1c1917"><ellipse cx="-8" cy="6" rx="1.2" ry="2"/><ellipse cx="0" cy="9" rx="1.2" ry="2"/><ellipse cx="8" cy="6" rx="1.2" ry="2"/><ellipse cx="-4" cy="13" rx="1.2" ry="2"/><ellipse cx="5" cy="13" rx="1.2" ry="2"/></g>`, 'translate(52 118) rotate(-30)');
      s += K.part(K.ell(56, 132, 7, 6.5), '#ffc4d4', { line: '#5a1a2a', lw: 1.6 });
      // рука на граблях
      s += K.vol('M130 100C140 96 146 88 148 78C150 72 156 72 156 78C156 90 148 102 136 110Z', robe) + K.part(K.ell(150, 76, 7, 6.5), '#ffc4d4', { line: '#5a1a2a', lw: 1.6 });
      // голова: уши-лопухи, пятачок, шапочка
      s += K.mirror(K.vol('M66 52C52 46 40 50 34 62C42 68 54 70 66 66Z', pig));
      s += K.vol('M100 34C128 34 144 52 144 72C144 92 126 104 100 104C74 104 56 92 56 72C56 52 72 34 100 34Z', pig);
      s += K.vol('M74 46C74 30 86 22 100 22C114 22 126 30 126 46C116 40 84 40 74 46Z', { c1: '#4b5563', c2: '#05060c', rim: '#c8f3ff', rimK: 0.4, line: '#05060c', lw: 2, tex: false });
      s += K.closed(100, 62, 16, 7, true) + K.blush(72, 76, 7) + K.blush(128, 76, 7);
      s += `<ellipse cx="100" cy="80" rx="14" ry="10" fill="${K.rad([[0, '#ffe4ec'], [1, '#f08aa6']], 0.4, 0.35)}" stroke="#5a1a2a" stroke-width="2"/><ellipse cx="95" cy="80" rx="2.6" ry="3.6" fill="#5a1a2a"/><ellipse cx="105" cy="80" rx="2.6" ry="3.6" fill="#5a1a2a"/>`;
      s += K.mouth('smile', 100, 92, 16) + `<g fill="#1c1917"><ellipse cx="124" cy="86" rx="1.2" ry="2" transform="rotate(20 124 86)"/><ellipse cx="128" cy="90" rx="1.2" ry="2" transform="rotate(-10 128 90)"/></g>`;
      s += K.spark(24, 40, 3, '#e0f7ff', 'art-float') + K.spark(184, 110, 2.6, '#fde68a') + K.spark(24, 120, 2.4, '#e0f7ff');
      return s;
    },

    // Паньгу (легенда): первый великан — рогатый, с гривой и бородой, в юбке из листьев и шкуре через плечо; одной рукой
    // заносит исполинский топор, другой упирается в небо. Яйцо хаоса раскололось: вверху светлое небо с Солнцем и Луной
    // (они родились из его глаз), внизу тёмная земля с горами и рекой, по краям — осколки скорлупы
    cn_pangu(K) {
      const skin = '#e8a574', sk = { c1: skin, c2: '#a8603a', rim: '#e4ffb0', tex: false, lw: 2.4, line: '#4a2410' };
      let s = K.aura('#84cc16', 100, 100, 0.42) + K.aura('#fde68a', 70, 60, 0.3);
      // небо и земля из яйца хаоса
      s += `<path d="M8 104C8 50 48 12 100 12C152 12 192 50 192 104Z" fill="${K.lin(['#fffbeb', '#fde68a', '#bae6fd'])}" opacity=".85"/>`;
      s += `<path d="M8 104C8 150 48 180 100 180C152 180 192 150 192 104Z" fill="${K.lin(['#3f6212', '#1a2e05'])}" opacity=".9"/>`;
      s += `<path d="M8 120L30 96L44 112L62 88L80 114H120L138 90L156 112L170 94L192 118V132H8Z" fill="${K.lin(['#84cc16', '#365314'])}" stroke="#1a2e05" stroke-width="1.4" stroke-linejoin="round"/>` + K.line('M70 178C80 160 120 156 130 132', '#7dd3fc', 4, { op: 0.8 });
      // осколки скорлупы
      s += K.mirror(K.part('M2 70L14 60L10 76L22 82L4 96Z', '#f5f5f4', { line: '#57534e', lw: 1.6 }) + K.part('M4 130L18 136L8 146L14 160L2 156Z', '#e7e5e4', { line: '#57534e', lw: 1.4 }));
      s += sunDisc(K, 34, 34, 10) + crescent(K, 170, 80, 11, { c: '#e0e7ff', line: '#4338ca' });
      // топор за головой
      s += K.line('M128 132L150 30', '#3b2006', 6.4) + K.line('M128 132L150 30', '#a87447', 3.8);
      s += K.part('M146 24C160 10 182 12 190 26C184 34 182 46 186 56C170 56 156 46 148 36Z', '#e2e8f0', { line: '#334155', lw: 2 }) + K.line('M156 28C166 22 178 22 184 28', '#ffffff', 1.6, { op: 0.8 }) + K.part('M144 34L152 26L156 40L148 44Z', '#78350f', { line: '#3b2006', lw: 1.2 });
      // ноги и юбка из листьев
      s += K.mirror(K.vol('M80 146C78 156 76 164 74 172H94C94 164 95 156 96 148Z', sk) + K.part(K.ell(82, 174, 12, 5), skin, { line: '#4a2410', lw: 1.6 }));
      [[66, 132, 112], [80, 134, 100], [96, 136, 90], [112, 134, 80], [128, 132, 68]].forEach(([x, y, r]) => { s += K.leaf(x, y, 28, r, '#4d7c0f'); });
      // торс, шкура через плечо
      s += K.vol('M100 78C124 78 138 90 140 110L136 136H64L60 110C62 90 76 78 100 78Z', sk);
      s += K.line('M84 98Q100 104 116 98M86 112Q100 118 114 112M100 104V124', '#8a4a20', 1.6, { op: 0.5 });
      s += K.part('M64 84C78 80 96 92 104 108C110 120 108 132 100 136H76C70 120 64 100 64 84Z', '#a16207', { line: '#422006', lw: 1.6 }) + `<g fill="#422006" opacity=".6"><circle cx="76" cy="100" r="3"/><circle cx="88" cy="112" r="2.6"/><circle cx="80" cy="124" r="2.8"/></g>`;
      s += K.line('M64 134H136', '#78350f', 4);
      // рука упирается в небо
      s += K.vol('M68 92C56 84 48 70 46 54C46 48 52 46 56 50C58 62 64 74 74 84Z', sk) + K.part('M44 48C40 40 42 30 48 28C50 34 52 38 54 40C56 34 60 30 64 32C62 38 60 44 58 50Z', skin, { line: '#4a2410', lw: 1.6 });
      // рука с топором
      s += K.vol('M132 92C142 96 148 104 150 114C150 120 144 122 140 118C138 112 134 106 128 102Z', sk) + K.part(K.ell(141, 118, 7.5, 7), skin, { line: '#4a2410', lw: 1.6 });
      // голова: рога, грива, борода
      s += K.mirror(K.part('M82 44C72 36 66 24 68 12C74 20 82 28 90 34Z', '#f5f0e0', { line: '#57534e', lw: 1.6 }) + K.line('M72 22l4 2M74 30l4 1', '#a8a29e', 1.2));
      s += K.vol('M100 34C126 34 140 52 140 74C140 92 128 100 118 104C112 96 88 96 82 104C72 100 60 92 60 74C60 52 74 34 100 34Z', { c1: '#4b3a2a', c2: '#1c120a', rim: '#e4ffb0', rimK: 0.5, line: '#120a04', tex: false, lw: 2 });
      s += K.vol(K.ell(100, 62, 18, 19), sk);
      s += K.vol('M84 70C80 86 86 100 94 108C96 110 100 114 100 114C100 114 104 110 106 108C114 100 120 86 116 70C110 76 106 78 100 78C94 78 90 76 84 70Z', { c1: '#5a4430', c2: '#1c120a', rim: '#e4ffb0', rimK: 0.4, line: '#120a04', lw: 1.8, tex: false });
      s += K.mirror(K.part('M84 54C88 50 94 50 97 54C93 55 89 56 86 58Z', '#1c120a', { lw: 0 }));
      s += K.eyes(100, 62, 8, 5.6, { iris: '#a16207', lid: 'angry', skin, look: [0, 0.1] });
      s += `<ellipse cx="100" cy="72" rx="3.6" ry="2.6" fill="#7f3a1a"/>`;
      s += K.spark(20, 60, 3.4, '#fffbe6', 'art-float') + K.spark(180, 66, 3, '#e0e7ff') + K.spark(100, 6, 2.6, '#fde68a') + K.spark(184, 150, 2.4, '#e4ffb0', 'art-float');
      return s;
    },

    // Нюйва (легенда): богиня-прародительница со змеиным золотисто-бирюзовым хвостом — высокая причёска с золотыми
    // шпильками, тёплое платье; обеими руками поднимает к трещине в небе сияющий пятицветный камень, и за ней встаёт
    // радуга. Внизу у хвоста машут ручками крошечные глиняные человечки, которых она вылепила
    cn_nuwa(K) {
      const skin = '#fde3cf', robe = { c1: '#fef3c7', c2: '#d97706', rim: '#fff6b0', rimK: 0.6, line: '#5a2a06', texK: 0.2 };
      let s = K.aura('#facc15', 100, 96, 0.45) + K.aura('#f472b6', 60, 60, 0.22);
      // радуга
      ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#8b5cf6'].forEach((c, i) => { s += K.line(`M${10 + i * 5} 150A${90 - i * 5} ${90 - i * 5} 0 0 1 ${190 - i * 5} 150`, c, 4.6, { op: 0.45 }); });
      // трещина в небе
      s += `<path d="M58 12L70 22L64 28L80 34L74 40L92 44" fill="none" stroke="#1e1b4b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M58 12L70 22L64 28L80 34L74 40L92 44" fill="none" stroke="#a5b4fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      // змеиный хвост кольцом
      const tail = 'M100 132C76 138 44 146 42 160C40 174 92 178 128 172C158 166 176 150 166 134C158 122 140 126 144 138C146 146 156 146 158 140';
      s += tube(K, tail, 26, { c1: '#fde68a', c2: '#0d9488', line: '#042f2e', belly: '#fef3c7', dots: '#0f766e', dotK: 0.55 });
      // глиняные человечки
      const clay = (x, y, k, d) => `<g class="art-float" style="animation-delay:-${d}s"><g transform="translate(${x} ${y}) scale(${k})"><path d="M-6 0C-7 -8 -4 -12 0 -12C4 -12 7 -8 6 0Z" fill="${K.lin(['#f5d0a0', '#c98a4a'])}" stroke="#7a4a1a" stroke-width="1.2"/><circle cx="0" cy="-16" r="5" fill="${K.lin(['#f5d0a0', '#c98a4a'])}" stroke="#7a4a1a" stroke-width="1.2"/><path d="M-6 -8L-11 -14M6 -8L10 -12" stroke="#c98a4a" stroke-width="2.4" stroke-linecap="round"/><circle cx="-1.8" cy="-17" r=".9" fill="#3b2006"/><circle cx="1.8" cy="-17" r=".9" fill="#3b2006"/><path d="M-1.6 -14Q0 -13 1.6 -14" stroke="#3b2006" stroke-width=".8" fill="none"/></g></g>`;
      s += clay(26, 178, 1, 0.2) + clay(186, 176, 0.9, 0.9) + clay(14, 172, 0.8, 1.4);
      // платье-торс
      s += K.vol('M100 84C114 84 124 92 127 104L132 142C120 150 80 150 68 142L73 104C76 92 86 84 100 84Z', robe);
      s += K.line('M90 86L100 100L110 86', '#0d9488', 3) + K.line('M72 120Q100 128 128 120', '#0d9488', 6) + K.stitch('M72 120Q100 128 128 120', '#fde68a', 1.4);
      s += K.stitch('M70 140Q100 150 130 140', '#0d9488', 2);
      // руки подняты к камню
      s += K.mirror(K.vol('M84 94C68 88 58 74 62 58C64 48 72 38 80 32C84 30 88 34 86 38C80 44 74 52 74 62C74 74 80 82 90 88Z', robe) + K.stitch('M64 60C64 52 70 44 76 38', '#0d9488', 1.6) + K.part(K.ell(84, 33, 5.5, 5), skin, { line: '#9a6a4a', lw: 1.4 }));
      // лицо и причёска
      s += K.part('M80 58C74 80 76 98 80 108C88 104 92 98 94 92H106C108 98 112 104 120 108C124 98 126 80 120 58Z', '#1f1a2e', { line: '#0f0a1e', lw: 1.4 });
      s += K.vol(K.ell(100, 66, 16.5, 18), { c1: skin, c2: '#eab89a', rim: '#fff3d6', tex: false, hiK: 0.18, lw: 2.2, line: '#8a5a3a' });
      s += K.part('M83.5 66C81 50 90 44 100 44C110 44 119 50 116.5 66C113 58 107 54 100 54C93 54 87 58 83.5 66Z', '#1f1a2e', { line: '#0f0a1e', lw: 1.4 });
      s += K.vol('M89 48C85 38 90 28 100 26C110 28 115 38 111 48Z', { c1: '#3a3350', c2: '#0f0a1e', rim: '#fde68a', rimK: 0.4, line: '#0f0a1e', lw: 1.8, tex: false });
      s += K.part('M88 44C92 38 108 38 112 44L110 48C104 44 96 44 90 48Z', '#fbbf24', { line: '#78350f', lw: 1.2 }) + K.mirror(K.line('M90 44L76 40', '#fbbf24', 2) + `<circle cx="76" cy="40" r="2.4" fill="#22c55e" stroke="#065f46" stroke-width=".8"/>`);
      s += `<path d="M100 56l1.6 2.4l-1.6 2.4l-1.6-2.4z" fill="#e11d48"/>`;
      s += K.eyes(100, 68, 7.5, 4.8, { iris: '#0d9488', lid: 'half', skin, lash: true, look: [0, -0.6] });
      s += K.blush(88, 77, 3.6) + K.blush(112, 77, 3.6) + K.mouth('smile', 100, 78, 7);
      // пятицветный камень над головой
      s += `<circle class="art-aura" cx="100" cy="20" r="28" fill="${K.rad([[0, '#ffffff', 0.95], [0.35, '#fde68a', 0.6], [1, '#f472b6', 0]])}"/>`;
      const gem = [['#ef4444', 'M100 20L100 6L113 13Z'], ['#facc15', 'M100 20L113 13L113 27Z'], ['#22c55e', 'M100 20L113 27L100 34Z'], ['#3b82f6', 'M100 20L100 34L87 27Z'], ['#f8fafc', 'M100 20L87 27L87 13Z'], ['#a855f7', 'M100 20L87 13L100 6Z']];
      s += `<g class="art-spin-soft">${gem.map(([c, d]) => `<path d="${d}" fill="${c}" stroke="#1e1b4b" stroke-width="1.2" stroke-linejoin="round"/>`).join('')}<path d="M100 6L113 13L113 27L100 34L87 27L87 13Z" fill="none" stroke="#1e1b4b" stroke-width="2"/><path d="M91 14L98 10" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".9"/></g>`;
      s += zap(K, 72, 22, 0.9, -50, '#fef08a') + zap(K, 128, 18, 0.9, 50, '#fde047', 0.5);
      s += K.spark(20, 40, 3.4, '#fde68a', 'art-float') + K.spark(180, 60, 3, '#f9a8d4') + K.spark(160, 14, 2.6, '#ffffff') + K.spark(20, 120, 2.4, '#a5f3fc', 'art-float');
      return s;
    },

    // Нефритовый император (легенда): владыка Небесной канцелярии на золотом троне среди облаков — корона-мянь с плоской
    // доской и нитями жемчуга, жёлтое императорское одеяние с драконьим узором, длинная чёрная борода в три пряди; держит
    // нефритовую табличку-хубань. За ним сияющий нимб с двенадцатью самоцветами — по числу зверей великого забега
    cn_yudi(K) {
      const skin = '#f8d4b4', sk = { c1: skin, c2: '#d9a57e', rim: '#fff6b0', tex: false, lw: 2.2, line: '#7a4a2a' };
      const robe = { c1: '#fff3b0', c2: '#ca8a04', rim: '#eef0ff', rimK: 0.6, line: '#5a3208', texK: 0.25 };
      let s = K.aura('#a5b4fc', 100, 96, 0.42) + K.aura('#fde68a', 70, 70, 0.35);
      // нимб с двенадцатью самоцветами
      s += `<circle class="art-aura" cx="100" cy="64" r="54" fill="none" stroke="#fde68a" stroke-width="3" opacity=".8"/><circle cx="100" cy="64" r="47" fill="${K.rad([[0, '#fffbe6', 0.7], [1, '#fde68a', 0.1]])}"/>`;
      const gc = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f8fafc', '#fbbf24'];
      s += gc.map((c, i) => { const a = (i * 30 - 90) * Math.PI / 180; return K.rhomb(r1(100 + 54 * Math.cos(a)), r1(64 + 54 * Math.sin(a)), 4, c, '#5a3208'); }).join('');
      // облака и трон
      s += K.part('M48 70C48 50 60 40 72 44L76 120H48Z', '#fbbf24', { line: '#78350f', lw: 1.8 }) + K.part('M152 70C152 50 140 40 128 44L124 120H152Z', '#fbbf24', { line: '#78350f', lw: 1.8 });
      s += K.mirror(K.line(spiral(58, 56, 0.9, 1.3), '#b45309', 1.4) + K.part('M44 116H82V128H44Z', '#d97706', { line: '#78350f', lw: 1.6 }));
      s += cloud(K, 100, 172, 2.2, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca' }) + cloud(K, 30, 150, 0.7, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca', cls: 'art-float' }) + cloud(K, 172, 150, 0.7, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca', flip: true, cls: 'art-float', d: 1 });
      // ленты-пибо на ветру
      s += `<g class="art-sway" style="transform-origin:50% 0">${K.line('M70 96C46 108 34 132 16 136M130 96C154 108 166 132 184 136', '#7c3aed', 4.6)}${K.line('M70 96C46 108 34 132 16 136M130 96C154 108 166 132 184 136', '#c4b5fd', 1.6, { op: 0.8 })}</g>`;
      // одеяние
      s += K.vol('M100 84C126 84 140 98 144 118L152 164C134 172 66 172 48 164L56 118C60 98 74 84 100 84Z', robe);
      s += K.part('M86 92H114L118 166H82Z', '#dc2626', { line: '#7f1d1d', lw: 1.4 }) + K.line('M90 110Q100 114 110 110M88 130Q100 134 112 130M86 150Q100 154 114 150', '#fbbf24', 1.4, { op: 0.8 });
      s += K.mirror(K.line(spiral(70, 140, 1, 1.4), '#b45309', 1.4, { op: 0.8 }) + K.line('M62 120C70 116 76 120 74 128', '#b45309', 1.6, { op: 0.7 }));
      s += K.stitch('M50 163Q100 174 150 163', '#dc2626', 2) + K.part('M86 86Q100 96 114 86L112 92Q100 100 88 92Z', '#dc2626', { line: '#7f1d1d', lw: 1.2 });
      // рукава и табличка-хубань
      s += K.mirror(K.vol('M74 96C62 104 58 116 62 128C68 134 80 132 86 124C86 114 88 106 92 100Z', robe));
      s += K.part('M94 92H106V134H94Z', '#d1fae5', { line: '#065f46', lw: 1.6 }) + K.line('M97 98V128', '#6ee7b7', 1.4, { op: 0.8 });
      s += K.part(K.ell(91, 124, 5.5, 5), skin, { line: '#7a4a2a', lw: 1.4 }) + K.part(K.ell(109, 124, 5.5, 5), skin, { line: '#7a4a2a', lw: 1.4 });
      // голова, борода в три пряди
      s += K.vol(K.ell(100, 60, 17, 18), sk);
      s += K.part('M84 58C82 46 90 40 100 40C110 40 118 46 116 58C110 52 90 52 84 58Z', '#1f1a24', { line: '#0b0a10', lw: 1.4 });
      s += K.mirror(K.part('M86 54C90 51 95 51 97 54C93 55 90 56 88 57Z', '#1f1a24', { lw: 0 }));
      s += K.eyes(100, 60, 7.4, 4.8, { iris: '#78350f', lid: 'half', skin, look: [0, 0.3] });
      s += K.part('M90 72C93 70 98 70 100 71C102 70 107 70 110 72C106 73 102 74 100 73C98 74 94 73 90 72Z', '#1f1a24', { lw: 0 });
      s += K.line('M100 76C100 88 98 96 100 104M92 74C90 82 88 88 86 94M108 74C110 82 112 88 114 94', '#1f1a24', 3);
      // корона-мянь: доска и нити жемчуга
      s += K.part('M86 40C86 32 114 32 114 40V44H86Z', '#1f2937', { line: '#05060c', lw: 1.6 }) + K.line('M90 40H110', '#fbbf24', 2);
      s += K.part('M68 28L132 24L134 32L66 36Z', '#1f2937', { line: '#05060c', lw: 1.6 }) + K.line('M70 30L130 26', '#fbbf24', 1.4);
      s += `<g fill="#fffbe6" stroke="#b45309" stroke-width=".5">${[70, 78, 86, 114, 122, 130].map(x => { const y0 = r1(36 - (x - 66) * 0.06); return [0, 1, 2, 3].map(k => `<circle cx="${x}" cy="${r1(y0 + 2 + k * 4)}" r="1.5"/>`).join(''); }).join('')}</g>`;
      s += K.line('M70 36V48M78 35.6V48M86 35.2V48M114 33.6V46M122 33.2V46M130 32.8V46', '#b45309', 0.6, { op: 0.8 });
      s += `<circle cx="100" cy="30" r="3.4" fill="${K.rad([[0, '#d1fae5'], [1, '#059669']], 0.35, 0.3)}" stroke="#065f46" stroke-width="1"/>`;
      s += K.spark(22, 40, 3.4, '#fde68a', 'art-float') + K.spark(178, 40, 3.4, '#fde68a', 'art-float') + K.spark(100, 6, 2.6, '#ffffff') + K.spark(184, 110, 2.4, '#e0e7ff');
      return s;
    },
  });
})();
