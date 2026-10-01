'use strict';
/* 4.28: рисунки духов и богов скандинавской мифологии — каждый своей функцией (кисть — js/art-kit.js) */

(() => {
  // --- местные помощники (внутри замыкания, чтобы не столкнуться с другими файлами) ---
  const f = n => (Math.round(n * 100) / 100).toString();
  // градиент детали по цвету — один на рисунок
  const L = (K, c) => { K._g = K._g || {}; return K._g[c] || (K._g[c] = K.lin([K.shade(c, 0.3), c, K.shade(c, -0.3)], 0, 0, 0.3, 1)); };
  const P = (K, d, c, o = {}) => `<path${o.cls ? ` class="${o.cls}"` : ''} d="${d}" fill="${L(K, c)}"${o.lw === 0 ? '' : ` stroke="${o.line || K.shade(c, -0.55)}" stroke-width="${o.lw || 2}" stroke-linejoin="round"`}${o.op ? ` opacity="${o.op}"` : ''}/>`;
  const clip = (K, d) => { const i = K.id('cp'); K.def(`<clipPath id="${i}"><path d="${d}"/></clipPath>`); return `url(#${i})`; };
  // зигзаг северного узора: от x0 до x1 по высоте y, шаг st, размах h
  const zig = (x0, x1, y, st, h) => { let d = `M${x0} ${f(y + h / 2)}`, up = true; for (let x = x0 + st / 2; x <= x1; x += st / 2, up = !up) d += `L${f(x)} ${f(y + (up ? -h / 2 : h / 2))}`; return d; };
  // пушистый контур (шерсть, снег, облако): эллипс с n выпуклостями высотой b
  const fluff = (cx, cy, rx, ry, n, b, a0 = 0) => {
    let d = '';
    for (let i = 0; i <= n; i++) {
      const a = (a0 + i * 360 / n) * Math.PI / 180, x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
      if (!i) { d = `M${f(x)} ${f(y)}`; continue; }
      const m = (a0 + (i - 0.5) * 360 / n) * Math.PI / 180;
      d += `Q${f(cx + (rx + b * 2) * Math.cos(m))} ${f(cy + (ry + b * 2) * Math.sin(m))} ${f(x)} ${f(y)}`;
    }
    return d + 'Z';
  };
  // снежинка
  const flake = (x, y, r, c = '#ffffff', cls = 'art-float', w = 1.6, op = 0.9) => {
    let d = '';
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.PI / 6, cx = Math.cos(a), sy = Math.sin(a), bx = x + r * 0.55 * cx, by = y + r * 0.55 * sy;
      d += `M${x} ${y}L${f(x + r * cx)} ${f(y + r * sy)}`;
      for (const s of [0.7, -0.7]) d += `M${f(bx)} ${f(by)}L${f(bx + r * 0.32 * Math.cos(a + s))} ${f(by + r * 0.32 * Math.sin(a + s))}`;
    }
    return `<path${cls ? ` class="${cls}"` : ''} d="${d}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none" opacity="${op}"/>`;
  };
  // руны Старшего футарка (высота 10, центр 0 0)
  const RUNES = {
    f: 'M-1.5 5V-5M-1.5 -1.5L2.5 -4.5M-1.5 1.5L2.5 -1.5', u: 'M-2 5V-5L2 -1.5V5', th: 'M-2 -5V5M-2 -2.5L1.8 0L-2 2.5', a: 'M-1.5 5V-5M-1.5 -5L2.5 -2M-1.5 -1.5L2.5 1.5',
    r: 'M-2 5V-5L2 -2.5L-2 0L2 5', k: 'M2 -4L-2 0L2 4', h: 'M-2 -5V5M2 -5V5M-2 -1.5L2 1.5', t: 'M0 -5V5M-3 -2L0 -5L3 -2', z: 'M0 5V-5M-3 -4L0 -1L3 -4',
    s: 'M1.5 -5L-2 -1.5L2 1.5L-1.5 5', o: 'M0 -5L3.5 -1.5L-3 4.5M0 -5L-3.5 -1.5L3 4.5', b: 'M-2 -5V5M-2 -5L2 -2.5L-2 0L2 2.5L-2 5', g: 'M-3 -5L3 5M3 -5L-3 5',
    l: 'M-1.5 5V-5L2.5 -2', i: 'M0 -5V5', n: 'M0 -5V5M-2.5 -1.5L2.5 1.5', e: 'M-2.5 5V-5L0 -1L2.5 -5V5', d: 'M-3 -5V5L3 -5V5Z', j: 'M-1 -5L-3 -2L-1 1M1 -1L3 2L1 5',
    m: 'M-2.5 5V-5M2.5 5V-5M-2.5 -5L2.5 -1M2.5 -5L-2.5 -1', w: 'M-1.5 5V-5L2 -2.5L-1.5 0', ng: 'M0 -4L3 0L0 4L-3 0Z',
  };
  const rune = (x, y, h, key, c, w = 1.6, glow) => {
    const k = h / 10, d = RUNES[key];
    return `<g transform="translate(${x} ${y}) scale(${f(k)})">` + (glow ? `<path d="${d}" fill="none" stroke="${glow}" stroke-width="${f(w * 3.2 / k)}" stroke-linecap="round" stroke-linejoin="round" opacity=".35"/>` : '') +
      `<path d="${d}" fill="none" stroke="${c}" stroke-width="${f(w / k)}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  };
  // ледяной кристалл-призма: основание (x, y), высота h, ширина w, поворот
  const crystal = (K, x, y, h, w, rot = 0, c = '#bfe9ff', line = '#1e5f96') => {
    const d = `M0 0L${f(-w / 2)} ${f(-h * 0.18)}L${f(-w / 2)} ${f(-h * 0.78)}L0 ${-h}L${f(w / 2)} ${f(-h * 0.78)}L${f(w / 2)} ${f(-h * 0.18)}Z`;
    return `<g transform="translate(${x} ${y}) rotate(${rot})">` + P(K, d, c, { line, lw: 1.8 }) +
      `<path d="M0 0L0 ${-h}L${f(-w / 2)} ${f(-h * 0.78)}L${f(-w / 2)} ${f(-h * 0.18)}Z" fill="#fff" opacity=".45"/>` + K.line(`M${f(-w * 0.28)} ${f(-h * 0.25)}V${f(-h * 0.7)}`, '#fff', 1.4, { op: 0.9 }) + '</g>';
  };
  // ель: вершина (x, y), высота h
  const fir = (K, x, y, h, c = '#2f7a3a') => {
    const w = h * 0.62, d = `M${x} ${y}L${f(x + w * 0.32)} ${f(y + h * 0.34)}L${f(x + w * 0.18)} ${f(y + h * 0.34)}L${f(x + w * 0.44)} ${f(y + h * 0.68)}L${f(x + w * 0.26)} ${f(y + h * 0.68)}L${f(x + w * 0.5)} ${f(y + h)}L${f(x - w * 0.5)} ${f(y + h)}L${f(x - w * 0.26)} ${f(y + h * 0.68)}L${f(x - w * 0.44)} ${f(y + h * 0.68)}L${f(x - w * 0.18)} ${f(y + h * 0.34)}L${f(x - w * 0.32)} ${f(y + h * 0.34)}Z`;
    return K.line(`M${x} ${f(y + h)}v${f(h * 0.14)}`, '#5a3414', Math.max(2, h * 0.1)) + P(K, d, c, { lw: 1.6 });
  };
  // глаз козла: янтарная радужка и горизонтальный зрачок; brow: 'angry' — сердитая бровь (для левого глаза, правый зеркалит)
  const goatEye = (K, x, y, r, o = {}) => {
    const iris = o.iris || '#f5b82e';
    let s = `<ellipse cx="${x}" cy="${y}" rx="${f(r * 0.9)}" ry="${f(r)}" fill="#fff" stroke="${K.INK}" stroke-width="${f(Math.max(1.3, r * 0.14))}"/>` +
      `<ellipse cx="${x}" cy="${f(y + r * 0.08)}" rx="${f(r * 0.72)}" ry="${f(r * 0.78)}" fill="${K.rad([[0, K.shade(iris, 0.4)], [0.6, iris], [1, K.shade(iris, -0.4)]], 0.5, 0.6, 0.6)}"/>` +
      `<rect x="${f(x - r * 0.52)}" y="${f(y - r * 0.12)}" width="${f(r * 1.04)}" height="${f(r * 0.36)}" rx="${f(r * 0.18)}" fill="${K.INK}"/>` +
      `<circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.38)}" r="${f(r * 0.24)}" fill="#fff"/><circle cx="${f(x + r * 0.32)}" cy="${f(y + r * 0.42)}" r="${f(r * 0.11)}" fill="#fff" opacity=".9"/>`;
    if (o.flip != null) s += K.line(o.flip ? `M${f(x - r * 1.1)} ${f(y - r * 1.05)}L${f(x + r * 1.05)} ${f(y - r * 1.5)}` : `M${f(x - r * 1.05)} ${f(y - r * 1.5)}L${f(x + r * 1.1)} ${f(y - r * 1.05)}`, K.INK, Math.max(2.2, r * 0.3));
    return s;
  };
  // молния-зигзаг: центр (x, y), размер k, поворот
  const bolt = (K, x, y, k, rot = 0, cls = 'art-blink') => `<g class="${cls}"><g transform="translate(${x} ${y}) rotate(${rot}) scale(${f(k)})">` +
    `<path d="M2 -10L-5 1H0L-3 10L6 -2H1L4 -10Z" fill="#fff6b0" stroke="#fde047" stroke-width="${f(4 / k)}" stroke-linejoin="round" opacity=".45"/>` +
    `<path d="M2 -10L-5 1H0L-3 10L6 -2H1L4 -10Z" fill="#fde047" stroke="#a16207" stroke-width="${f(1.4 / k)}" stroke-linejoin="round"/></g></g>`;
  // ворон в профиль, смотрит вправо: x0 — сдвиг; o.eye — параметры глаза
  const raven = (K, x0, o = {}) => {
    const fe = { c1: '#56647e', c2: '#101828', rim: '#c7d2fe', line: '#0a0f1a', tex: o.tex };
    let s = P(K, `M${x0 + 40} 118 L${x0 + 14} 146 L${x0 + 22} 148 L${x0 + 18} 158 L${x0 + 34} 146 L${x0 + 50} 128Z`, '#1e293b', { line: '#0a0f1a' });
    s += K.line(`M${x0 + 50} 128 V140 M${x0 + 58} 128 V140`, '#0a0f1a', 3.4) + K.line(`M${x0 + 44} 141 h14 M${x0 + 52} 141 h14`, '#0a0f1a', 2.6);
    s += K.vol(`M${x0 + 34} 120 C${x0 + 26} 100 ${x0 + 32} 78 ${x0 + 50} 72 C${x0 + 66} 68 ${x0 + 76} 80 ${x0 + 76} 96 C${x0 + 76} 114 ${x0 + 66} 128 ${x0 + 50} 130 C${x0 + 42} 131 ${x0 + 37} 127 ${x0 + 34} 120Z`, fe);
    s += K.part(`M${x0 + 38} 92 C${x0 + 50} 84 ${x0 + 66} 90 ${x0 + 70} 104 C${x0 + 68} 118 ${x0 + 56} 128 ${x0 + 40} 126 C${x0 + 34} 116 ${x0 + 34} 102 ${x0 + 38} 92Z`, '#2c3850', { line: '#0a0f1a', lw: 1.8 });
    s += K.line(`M${x0 + 44} 104 q8 4 16 0 M${x0 + 44} 112 q8 4 16 0 M${x0 + 44} 120 q6 3 12 0`, '#8b9ac0', 1.3, { op: 0.7 });
    s += K.vol(K.ell(x0 + 60, 66, 16, 15), { ...fe, tex: false });
    s += K.line(`M${x0 + 70} 78 l-3 7 l5 -2 l-2 7 l5 -4`, '#0a0f1a', 2.2);
    s += `<path d="M${x0 + 72} 58 C${x0 + 82} 57 ${x0 + 92} 62 ${x0 + 98} 70 C${x0 + 90} 73 ${x0 + 80} 75 ${x0 + 72} 74Z" fill="${K.lin(['#94a3b8', '#334155', '#0f172a'])}" stroke="#0a0f1a" stroke-width="2" stroke-linejoin="round"/>` + K.line(`M${x0 + 74} 66 L${x0 + 94} 69`, '#0a0f1a', 1.4) + K.line(`M${x0 + 76} 61 Q${x0 + 86} 61 ${x0 + 92} 65`, '#e2e8f0', 1.4, { op: 0.7 });
    s += K.eye(x0 + 63, 62, 6.4, { iris: '#93c5fd', look: [0.6, 0], ...(o.eye || {}) });
    s += K.gloss(x0 + 52, 58, 4, 2.4, -35, 0.4);
    return s;
  };
  // синие огоньки над курганами (курганный огонь)
  const wisp = (K, x, y, h, d) => `<g class="art-float" style="animation-delay:${d}s"><circle cx="${x}" cy="${f(y - h * 0.35)}" r="${f(h * 0.7)}" fill="${K.rad([[0, '#a5f3fc', 0.6], [1, '#22d3ee', 0]])}"/>` + K.flame(x, y, h, h * 0.62, '#e0fbff', '#22d3ee', { style: `animation-delay:${d}s` }) + '</g>';

  // --- помощники духов расширения (63 вида) ---
  // сияние-градиент: один на рисунок для каждого ключа
  const RG = (K, key, stops) => { K._r = K._r || {}; return K._r[key] || (K._r[key] = K.rad(stops)); };
  // пятиконечная звезда (путь): центр, радиус, k — толщина лучей
  const star5 = (x, y, r, k = 0.45) => {
    let d = '';
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * k : r; d += (i ? 'L' : 'M') + f(x + rr * Math.cos(a)) + ' ' + f(y + rr * Math.sin(a)); }
    return d + 'Z';
  };
  // искра Муспельхейма: звёздочка с ореолом, мерцает
  const ember = (K, x, y, r, d = 0) => `<g class="art-blink" style="animation-delay:${d}s"><circle cx="${x}" cy="${y}" r="${f(r * 2.3)}" fill="${RG(K, 'ember', [[0, '#fff3b0', 0.75], [1, '#ff9a3d', 0]])}"/>` +
    `<path d="${star5(x, y, r, 0.5)}" fill="#fff3b0" stroke="#f97316" stroke-width="${f(Math.max(0.8, r * 0.2))}" stroke-linejoin="round"/></g>`;
  // толстая конечность-штрих: обводка, заливка и блик по середине (руки, лапы, хвосты)
  const limb = (K, d, c, w, line, hi = 0.45) => K.line(d, line, w + 5) + K.line(d, c, w) + (hi ? K.line(d, K.shade(c, 0.45), f(Math.max(1.4, w * 0.22)), { op: hi }) : '');
  // коса «колоском»: верх (x, y), n звеньев с шагом st, ширина w; на конце — золотое кольцо (ring: true)
  const plait = (K, x, y, n, st, w, c, line, ring = true) => {
    let s = '';
    for (let i = 0; i < n; i++) { const cy = y + i * st, cx = x + (i % 2 ? 1 : -1) * w * 0.16; s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(w * 0.56)}" ry="${f(st * 0.78)}" transform="rotate(${i % 2 ? 30 : -30} ${f(cx)} ${f(cy)})" fill="${L(K, c)}" stroke="${line}" stroke-width="1.3"/>`; }
    return s + (ring ? `<rect x="${f(x - w * 0.55)}" y="${f(y + n * st - st * 0.35)}" width="${f(w * 1.1)}" height="5" rx="2" fill="${L(K, '#fbbf24')}" stroke="#713f12" stroke-width="1.2"/>` : '');
  };
  // круглый щит викинга: центр, радиус, цвета секторов по очереди; обод с заклёпками и железный умбон
  const vshield = (K, x, y, r, cols, n = 8) => {
    let s = `<circle cx="${x}" cy="${y}" r="${r}" fill="${cols[0]}"/>`;
    for (let i = 0; i < n; i++) {
      if (i % cols.length === 0) continue;
      const a0 = (i * 360 / n - 90) * Math.PI / 180, a1 = ((i + 1) * 360 / n - 90) * Math.PI / 180;
      s += `<path d="M${x} ${y}L${f(x + r * Math.cos(a0))} ${f(y + r * Math.sin(a0))}A${r} ${r} 0 0 1 ${f(x + r * Math.cos(a1))} ${f(y + r * Math.sin(a1))}Z" fill="${cols[i % cols.length]}"/>`;
    }
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${RG(K, 'shield', [[0, '#ffffff', 0.3], [0.55, '#ffffff', 0], [1, '#000000', 0.3]])}"/>`;
    s += `<circle cx="${x}" cy="${y}" r="${f(r - 1.6)}" fill="none" stroke="#5a3414" stroke-width="3.2"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${K.INK}" stroke-width="2.2"/>`;
    for (let i = 0; i < 8; i++) { const a = (i * 45 + 22.5) * Math.PI / 180; s += `<circle cx="${f(x + (r - 1.6) * Math.cos(a))}" cy="${f(y + (r - 1.6) * Math.sin(a))}" r="1.1" fill="#e5e7eb"/>`; }
    return s + `<circle cx="${x}" cy="${y}" r="${f(r * 0.27)}" fill="${RG(K, 'boss', [[0, '#f1f5f9'], [0.6, '#94a3b8'], [1, '#334155']])}" stroke="${K.INK}" stroke-width="1.6"/>`;
  };
  // спираль-вихрь (путь): центр, начальный радиус, обороты, направление, ky — сжатие по вертикали (водоворот в перспективе)
  const swirl = (x, y, r, turns = 1.5, dir = 1, ky = 1) => {
    let d = '';
    for (let i = 0; i <= 28; i++) { const t = i / 28, a = dir * t * turns * 2 * Math.PI, rr = r * (1 - t * 0.82); d += (i ? 'L' : 'M') + f(x + rr * Math.cos(a)) + ' ' + f(y + rr * Math.sin(a) * ky); }
    return d;
  };
  // пузырёк с бликом (вода)
  const bub = (x, y, r, d = 0) => `<g class="art-float" style="animation-delay:${d}s"><circle cx="${x}" cy="${y}" r="${r}" fill="#e0f7ff" fill-opacity=".18" stroke="#e0f7ff" stroke-opacity=".9" stroke-width="${f(Math.max(1, r * 0.18))}"/>` +
    `<path d="M${f(x - r * 0.55)} ${f(y - r * 0.1)}Q${f(x - r * 0.5)} ${f(y - r * 0.6)} ${f(x - r * 0.05)} ${f(y - r * 0.6)}" fill="none" stroke="#fff" stroke-width="${f(Math.max(1, r * 0.2))}" stroke-linecap="round"/></g>`;
  // нота-восьмушка
  const note = (x, y, s, c, d = 0) => `<g class="art-float" style="animation-delay:${d}s"><ellipse cx="${x}" cy="${y}" rx="${f(s * 0.6)}" ry="${f(s * 0.44)}" transform="rotate(-25 ${x} ${y})" fill="${c}" stroke="#1b1030" stroke-width=".8"/>` +
    `<path d="M${f(x + s * 0.52)} ${y}V${f(y - s * 1.9)}q${f(s * 0.3)} ${f(s * 0.5)} ${f(s * 0.9)} ${f(s * 0.8)}" stroke="${c}" stroke-width="${f(s * 0.22)}" fill="none" stroke-linecap="round"/></g>`;
  // перистый лист ясеня: основание (x, y), длина, поворот
  const ashLeaf = (K, x, y, len, rot, c = '#65a30d') => {
    let s = K.line(`M0 0 H${len}`, K.shade(c, -0.5), 1.4);
    for (let i = 1; i <= 3; i++) { const t = f(len * i / 4); s += K.leaf(t, 0, f(len * 0.3), -55, c) + K.leaf(t, 0, f(len * 0.3), 55, c); }
    return `<g transform="translate(${x} ${y}) rotate(${rot})">${s + K.leaf(len, 0, f(len * 0.34), 0, c)}</g>`;
  };
  // ромашка: центр, радиус
  const daisy = (x, y, r, rot = 0) => {
    let p = '';
    for (let i = 0; i < 10; i++) p += `<ellipse cx="${x}" cy="${f(y - r * 0.62)}" rx="${f(r * 0.24)}" ry="${f(r * 0.55)}" transform="rotate(${i * 36 + rot} ${x} ${y})"/>`;
    return `<g fill="#ffffff" stroke="#94a3b8" stroke-width=".7">${p}</g><circle cx="${x}" cy="${y}" r="${f(r * 0.34)}" fill="#facc15" stroke="#a16207" stroke-width=".8"/>`;
  };
  // облачко (плоское, светлое)
  const cloud = (x, y, w, c = '#f8fafc', op = 0.95) => `<path d="${fluff(x, y, w, w * 0.3, 7, w * 0.07)}" fill="${c}" opacity="${op}" stroke="#94a3b8" stroke-width="1.2"/>`;
  // колос пшеницы: основание (x, y), длина, поворот
  const wheat = (K, x, y, len, rot) => {
    let s = '';
    for (let i = 0; i < 5; i++) { const yy = f(-i * len / 5), y2 = f(-i * len / 5 - 1.6); s += `<ellipse cx="-2" cy="${yy}" rx="2" ry="3.4" transform="rotate(-25 -2 ${yy})"/><ellipse cx="2" cy="${y2}" rx="2" ry="3.4" transform="rotate(25 2 ${y2})"/>`; }
    return `<g transform="translate(${x} ${y}) rotate(${rot})" fill="${L(K, '#facc15')}" stroke="#a16207" stroke-width=".7">${s}<ellipse cx="0" cy="${f(-len - 2)}" rx="1.6" ry="3"/></g>`;
  };
  // чайка сидит: точка опоры (x, y) — лапки, k — масштаб, смотрит вправо (flip — влево)
  const gull = (K, x, y, k = 1, flip = false) => {
    let g = K.line('M-3 0 V-6 M3 0 V-6', '#f97316', 1.8) + `<path d="M-14 -14 C-14 -24 -2 -28 8 -24 C14 -22 16 -16 12 -10 C6 -6 -8 -6 -14 -14Z" fill="${L(K, '#f8fafc')}" stroke="#334155" stroke-width="1.6"/>` +
      `<path d="M-16 -16 C-8 -22 4 -22 8 -16 C2 -12 -8 -10 -16 -16Z" fill="${L(K, '#94a3b8')}" stroke="#334155" stroke-width="1.3"/>` + `<circle cx="10" cy="-27" r="7" fill="${L(K, '#ffffff')}" stroke="#334155" stroke-width="1.6"/>` +
      `<path d="M16 -27 L23 -25 L16 -23Z" fill="#facc15" stroke="#a16207" stroke-width="1"/><circle cx="12" cy="-28.4" r="1.5" fill="${K.INK}"/>`;
    return `<g transform="translate(${x} ${y}) scale(${flip ? -k : k} ${k})">${g}</g>`;
  };
  // светящийся самоцвет-ромб с бликом
  const gem = (K, x, y, r, c, line) => `<circle class="art-aura" cx="${x}" cy="${y}" r="${f(r * 2)}" fill="${K.rad([[0, '#ffffff', 0.8], [0.4, c, 0.45], [1, c, 0]])}"/>` + K.rhomb(x, y, r, c, line) +
    `<path d="M${x} ${f(y - r)}L${f(x - r * 0.45)} ${f(y - r * 0.1)}L${x} ${f(y + r * 0.1)}Z" fill="#fff" opacity=".7"/>`;

  Object.assign(SPIRIT_ART, {
    // Ниссе: крошечный скандинавский домовой — огромный красный колпак набок с помпоном, пухлый нос-картошка, белая бородка,
    // серая вязаная рубашка с северным узором, деревянные башмачки. В руках — миска рождественской каши с тающим кусочком масла
    no_nisse(K) {
      const skin = '#f6c9a0', wool = { c1: '#a9b8cc', c2: '#3b4a63', rim: '#ffd9a0', tex: false };
      let s = K.aura('#ff9a3d', 90, 118, 0.45);
      // деревянные башмачки
      s += K.mirror(K.vol('M62 170 C62 162 72 160 82 162 C90 164 93 170 91 175 C89 180 68 180 64 177 C62 175 62 172 62 170Z', { c1: '#e0ad6e', c2: '#8a531f', rim: '#ffe7b0', tex: false, lw: 2.2 }));
      // вязаная рубашка с узором
      const body = 'M100 106 C130 106 146 124 148 146 C150 164 134 172 100 172 C66 172 50 164 52 146 C54 124 70 106 100 106Z';
      s += K.vol(body, wool);
      s += `<g clip-path="${clip(K, body)}">` + P(K, 'M40 148 H160 V162 H40Z', '#c81e1e', { lw: 0 }) + K.line(zig(40, 160, 155, 8, 6), '#f8fafc', 1.8) + '</g>';
      s += K.line('M52 148 Q100 154 148 148 M52 162 Q100 168 148 162', '#7f1d1d', 1.4, { op: 0.6 });
      // уши и лицо
      s += K.mirror(K.part(K.ell(75, 100, 5.5, 7), '#f0b890', { line: '#7a4a2a' }));
      s += K.vol(K.ell(100, 98, 25, 23), { c1: skin, c2: '#d8946a', rim: '#ffe7c0', tex: false, hiK: 0.18 });
      // колпак: высокий, свесился вправо, с помпоном
      s += K.vol('M72 90 C70 60 86 34 112 24 C128 18 148 22 160 40 C150 36 140 38 136 44 C138 60 134 78 130 90Z', { c1: '#f05252', c2: '#8a1616', rim: '#ffd9a0', tex: false, lw: 2.6 });
      s += K.line('M84 80 C84 60 94 44 110 34', '#fff', 2, { op: 0.35 });
      s += K.vol(fluff(160, 44, 8, 8, 9, 1.4), { c1: '#ffffff', c2: '#cbd5e1', rim: '#ffe7c0', tex: false, lw: 2, line: '#64748b', shadeK: 0.3 });
      s += P(K, 'M69 88 Q100 78 131 88 Q134 95 129 98 Q100 89 71 98 Q66 95 69 88Z', '#b91c1c', { line: '#5a0f0f' });
      s += K.stitch('M73 91 Q100 83 127 91', '#fde68a', 1.6);
      // глаза, румянец
      s += K.eyes(100, 104, 11, 7.2, { iris: '#3b82f6', look: [0.1, 0.25] });
      s += K.blush(81, 112, 5.5) + K.blush(119, 112, 5.5);
      // борода, усы, нос
      s += K.vol('M78 108 C72 122 76 138 88 142 C94 148 106 148 112 142 C124 138 128 122 122 108 C116 116 108 118 100 118 C92 118 84 116 78 108Z', { c1: '#ffffff', c2: '#c6cedb', rim: '#fff0c0', tex: false, lw: 2.2, line: '#5f6b80', shadeK: 0.3 });
      s += K.line('M88 126 q-2 7 1 12 M100 124 v14 M112 126 q2 7 -1 12', '#b4bece', 1.6);
      s += K.mirror(K.part('M100 117 C94 113 84 113 79 119 C81 123 87 123 91 121 C95 121 98 120 100 119Z', '#ffffff', { line: '#5f6b80', lw: 1.5 }));
      s += K.mouth('smile', 100, 125, 8);
      s += `<ellipse cx="100" cy="113" rx="7" ry="6" fill="${K.rad([[0, '#ffc3a0'], [1, '#e0765a']], 0.4, 0.35, 0.7)}" stroke="#7a3a24" stroke-width="1.6"/><ellipse cx="97.6" cy="111" rx="2.2" ry="1.4" fill="#fff" opacity=".7"/>`;
      // рукава
      s += K.vol('M62 122 C52 132 54 146 66 152 C72 150 76 146 76 142 C70 138 70 130 72 124Z', wool);
      s += `<g transform="translate(200 0) scale(-1 1)">${K.vol('M62 122 C52 132 54 146 66 152 C72 150 76 146 76 142 C70 138 70 130 72 124Z', wool)}</g>`;
      // миска каши с маслом и ложкой; пар
      s += K.line('M92 136 C88 128 96 124 92 116 M106 136 C102 128 110 124 106 116', '#fff', 1.8, { op: 0.55, cls: 'art-float' });
      s += K.line('M114 146 L134 126', '#8a531f', 3.4) + `<ellipse cx="136" cy="124" rx="4" ry="5.5" transform="rotate(45 136 124)" fill="#c98a4a" stroke="#5a3414" stroke-width="1.4"/>`;
      s += P(K, 'M70 145 Q100 140 130 145 Q128 166 100 168 Q72 166 70 145Z', '#b7773a', { line: '#5a3414', lw: 2 });
      s += K.line('M76 156 Q100 162 124 156', '#7c4a1d', 1.4, { op: 0.7 });
      s += `<ellipse cx="100" cy="145" rx="30" ry="5.5" fill="${K.lin(['#fffaf0', '#f3e2b8'])}" stroke="#5a3414" stroke-width="1.8"/>`;
      s += `<path d="M93 140 L104 138.5 L108 143 L97 145Z" fill="#fde047" stroke="#a16207" stroke-width="1.2" stroke-linejoin="round"/><path d="M104 142 q2 3 5 3" stroke="#fde047" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      s += K.mirror(K.part(K.ell(70, 150, 7, 6), skin, { line: '#7a4a2a' }));
      // снежинки и искорки очага
      s += flake(30, 70, 6) + flake(174, 108, 5, '#fff', 'art-float') + flake(26, 140, 4, '#fff', '');
      s += K.spark(170, 150, 3, '#ffd166') + K.spark(40, 104, 2.6, '#ffe08a', 'art-float');
      return s;
    },

    // Томте: подрос — седой хранитель усадьбы. Колпак свесился влево, борода до пояса, серый армяк с красной каймой и узором,
    // в руке фонарь с живым огоньком, другой рукой гладит кота, который греется у его ног
    no_tomte(K) {
      const skin = '#f6c9a0', coat = { c1: '#9aa6b8', c2: '#2f3a4f', rim: '#ffd9a0', tex: false };
      let s = K.aura('#ffb347', 94, 108, 0.42);
      // свет фонаря
      s += `<circle class="art-aura" cx="158" cy="150" r="40" fill="${K.rad([[0, '#fff3c0', 0.85], [0.35, '#ffcf60', 0.45], [1, '#ff9a3d', 0]])}"/>`;
      // сапоги
      s += K.mirror(K.vol('M70 168 C70 162 78 160 88 162 C94 164 96 170 94 175 C92 180 72 180 70 176Z', { c1: '#5a4030', c2: '#1f140c', tex: false, lw: 2.2, rim: '#ffd9a0' }));
      // армяк
      const coatD = 'M100 92 C126 92 142 110 148 134 C154 156 156 166 152 172 C132 178 68 178 48 172 C44 166 46 156 52 134 C58 110 74 92 100 92Z';
      s += K.vol(coatD, coat);
      s += `<g clip-path="${clip(K, coatD)}">` + P(K, 'M30 160 H170 V180 H30Z', '#c81e1e', { lw: 0 }) + K.line(zig(30, 170, 167, 8, 6), '#f8fafc', 1.8) + '</g>';
      s += K.line('M49 160 Q100 168 151 160', '#5a0f0f', 1.6, { op: 0.6 });
      s += K.line('M52 138 Q100 148 148 138', '#6b4226', 6) + K.line('M52 138 Q100 148 148 138', '#a8764a', 2);
      // кот у ног: серый, щурится от удовольствия
      const cat = { c1: '#b8c0cc', c2: '#4b5563', rim: '#fde68a', tex: false, lw: 2.2 };
      s += K.line('M58 172 C70 176 76 168 70 160', '#4b5563', 7) + K.line('M58 172 C70 176 76 168 70 160', '#9aa3b0', 3.4);
      s += K.vol('M30 176 C26 160 30 146 44 144 C58 146 62 160 58 176Z', cat);
      s += K.line('M36 152 q4 2 8 0 M34 160 q5 2 10 0', '#4b5563', 1.6, { op: 0.7 });
      s += K.part('M30 134 L28 118 L40 128Z M54 134 L56 118 L44 128Z', '#9aa3b0', { line: '#374151', lw: 1.8 }) + K.part('M31 131 L30 122 L37 128Z M53 131 L54 122 L47 128Z', '#f9a8d4', { lw: 0 });
      s += K.vol(K.ell(42, 138, 14, 11), cat);
      s += K.closed(42, 138, 5, 3, true) + K.mouth('cat', 42, 143, 6) + K.line('M28 142 l-8 -1 M28 145 l-8 2 M56 142 l8 -1 M56 145 l8 2', '#374151', 1);
      // левая рука гладит кота
      s += K.vol('M62 104 C50 110 44 120 44 128 C48 132 54 132 58 128 C60 122 64 116 70 112Z', coat);
      s += K.part(K.ell(48, 128, 7, 5.5), skin, { line: '#7a4a2a' });
      // правая рука с фонарём
      s += K.vol('M136 104 C150 108 160 118 162 130 C158 136 150 136 146 132 C144 124 138 118 130 116Z', coat);
      s += K.part(K.ell(156, 134, 6.5, 6), skin, { line: '#7a4a2a' });
      s += K.line('M156 134 V140', '#3a2a1a', 2);
      s += P(K, 'M147 146 L156 139 L165 146Z', '#1f2937', { lw: 1.6, line: '#0b0f17' });
      s += `<rect x="148" y="146" width="16" height="20" rx="2" fill="#fff3c0" stroke="#1f2937" stroke-width="2"/>`;
      s += K.flame(156, 163, 14, 9, '#fffbe6', '#ff9a1a');
      s += K.line('M148 156 H164 M156 146 V166', '#1f2937', 1.4, { op: 0.8 }) + P(K, 'M146 166 H166 V170 H146Z', '#1f2937', { lw: 1.4, line: '#0b0f17' });
      // голова
      s += K.mirror(K.part(K.ell(78, 84, 5, 6.5), '#f0b890', { line: '#7a4a2a' }));
      s += K.vol(K.ell(100, 82, 22, 21), { c1: skin, c2: '#d0906a', rim: '#ffe7c0', tex: false, hiK: 0.18 });
      // колпак свесился влево
      s += K.vol('M130 76 C132 48 118 22 92 14 C74 10 56 18 44 34 C56 30 66 32 70 38 C68 52 70 64 70 76Z', { c1: '#f05252', c2: '#8a1616', rim: '#ffd9a0', tex: false, lw: 2.6 });
      s += K.vol(fluff(44, 38, 8, 8, 9, 1.4), { c1: '#ffffff', c2: '#cbd5e1', tex: false, lw: 2, line: '#64748b', shadeK: 0.3 });
      s += P(K, 'M67 74 Q100 64 133 74 Q136 81 131 84 Q100 75 69 84 Q64 81 67 74Z', '#b91c1c', { line: '#5a0f0f' });
      s += K.stitch('M71 77 Q100 69 129 77', '#fde68a', 1.6);
      // сонные добрые глаза
      s += K.eyes(100, 90, 10, 6.4, { iris: '#7a5a3a', lid: 'half', skin, look: [0, 0.3] });
      s += K.blush(82, 97, 5) + K.blush(118, 97, 5);
      // длинная борода
      s += K.vol('M76 92 C68 110 70 132 80 146 C86 156 94 162 100 170 C106 162 114 156 120 146 C130 132 132 110 124 92 C116 102 108 104 100 104 C92 104 84 102 76 92Z', { c1: '#ffffff', c2: '#c6cedb', rim: '#fff0c0', tex: false, lw: 2.4, line: '#5f6b80', shadeK: 0.3 });
      s += K.line('M86 112 q-4 14 2 28 M100 108 q-2 22 0 52 M114 112 q4 14 -2 28', '#b4bece', 1.8);
      s += K.mirror(K.part('M100 103 C93 99 82 99 76 107 C78 111 85 111 89 109 C94 108 98 106 100 105Z', '#ffffff', { line: '#5f6b80', lw: 1.5 }));
      s += `<ellipse cx="100" cy="99" rx="8" ry="7" fill="${K.rad([[0, '#ffc3a0'], [1, '#e0765a']], 0.4, 0.35, 0.7)}" stroke="#7a3a24" stroke-width="1.6"/><ellipse cx="97.4" cy="96.6" rx="2.4" ry="1.5" fill="#fff" opacity=".7"/>`;
      s += flake(24, 64, 6) + flake(176, 76, 5) + flake(178, 116, 3.6, '#fff', '') + flake(120, 22, 4, '#fff', 'art-float');
      s += K.spark(176, 140, 2.6, '#ffe08a') + K.spark(138, 168, 2.4, '#ffd166', 'art-float');
      return s;
    },

    // Инеёнок: малыш-ётун из Нифльхейма — снежно-ледяной колобок с короной из льдинок, большими голубыми глазами.
    // Дует морозным дыханием и выводит в воздухе руну Альгиз; на пузике — снежинка
    no_ineyonok(K) {
      const ice = { c1: '#f3fbff', c2: '#6fb7e4', rim: '#ffffff', rimK: 0.7 };
      let s = K.aura('#38bdf8', 94, 120, 0.4);
      // корона из льдинок
      s += crystal(K, 66, 100, 18, 9, -48) + crystal(K, 134, 100, 18, 9, 48) + crystal(K, 80, 88, 28, 12, -24) + crystal(K, 120, 88, 28, 12, 24) + crystal(K, 100, 84, 38, 15, 0);
      // ножки
      s += K.mirror(K.vol(K.ell(76, 172, 15, 8.5), { ...ice, c1: '#d6effd', c2: '#3a8fc8', tex: false, lw: 2.2 }));
      const body = 'M100 80 C140 80 160 108 158 138 C156 166 134 178 100 178 C66 178 44 166 42 138 C40 108 60 80 100 80Z';
      s += K.vol(body, { ...ice, line: '#1e5f96' });
      // иней по краю и снежинка на пузике
      s += K.line('M50 150 l6 -3 l-2 6 M150 150 l-6 -3 l2 6 M60 96 l5 4 M140 96 l-5 4', '#ffffff', 1.6, { op: 0.8 });
      s += flake(100, 160, 10, '#ffffff', '', 2, 0.85);
      s += K.gloss(70, 100, 11, 6, -35, 0.5);
      // лапка машет
      s += K.vol('M48 124 C36 118 30 106 34 98 C40 92 48 98 50 108Z', { ...ice, tex: false, lw: 2.2, line: '#1e5f96' });
      s += K.vol('M150 132 C160 136 164 146 160 152 C154 156 148 150 146 142Z', { ...ice, tex: false, lw: 2.2, line: '#1e5f96' });
      // мордочка
      s += K.eyes(100, 120, 21, 13.5, { iris: '#0ea5e9', look: [0.25, 0.15] });
      s += `<ellipse cx="68" cy="138" rx="9" ry="5.5" fill="#f9a8d4" opacity=".45"/><ellipse cx="132" cy="138" rx="9" ry="5.5" fill="#f9a8d4" opacity=".45"/>`;
      s += K.mouth('o', 104, 136, 14);
      // морозное дыхание с руной
      s += K.line('M110 141 C124 146 140 140 150 128 C158 118 172 120 172 130 C172 138 162 140 160 132', '#e0f2fe', 4.4, { op: 0.75, cls: 'art-float' });
      s += flake(150, 112, 5, '#ffffff') + flake(178, 150, 4, '#e0f2fe') + flake(128, 158, 3.4, '#ffffff', '');
      s += `<circle class="art-aura" cx="172" cy="86" r="14" fill="${K.rad([[0, '#e0f7ff', 0.8], [1, '#7dd3fc', 0]])}"/>` + rune(172, 86, 16, 'z', '#ffffff', 2, '#7dd3fc');
      s += K.spark(30, 70, 3.4, '#e0f2fe', 'art-float') + K.spark(24, 150, 2.6, '#ffffff');
      return s;
    },

    // Ётун: подросший ледяной великан — гранёное ледяное тело, рога-сосульки, борода из сосулек (весной капает).
    // Сердито хмурится, а через плечо на шнурках несёт коньки — катки он обожает
    no_jotun(K) {
      const ice = { c1: '#d7efff', c2: '#2f7fb8', rim: '#ffffff', rimK: 0.65, line: '#123d63' };
      let s = K.aura('#38bdf8', 96, 108, 0.42);
      // коньки за плечом
      const skate = (x, y, c) => P(K, `M${x} ${y} H${x + 13} V${y + 16} H${x + 22} Q${x + 27} ${y + 20} ${x + 22} ${y + 24} H${x}Z`, c, { line: '#334155', lw: 1.8 }) +
        K.line(`M${x + 3} ${y + 5} h7 M${x + 3} ${y + 10} h7`, '#94a3b8', 1.2) + K.line(`M${x - 2} ${y + 29} H${x + 26}`, '#e2e8f0', 2.6) + K.line(`M${x + 3} ${y + 24} V${y + 29} M${x + 19} ${y + 24} V${y + 29}`, '#64748b', 1.8);
      s += K.line('M156 64 L166 88 M156 64 L176 84', '#f8fafc', 1.6);
      s += skate(170, 84, '#e2e8f0') + skate(160, 88, '#ffffff');
      // рога-сосульки
      s += K.mirror(K.part('M72 70 C58 62 50 46 52 28 C60 40 70 50 82 56Z', '#e0f7ff', { line: '#123d63', lw: 2 }) + K.line('M60 44 C62 52 68 58 76 62', '#ffffff', 1.4, { op: 0.8 }));
      // ноги
      s += K.mirror(K.vol(K.ell(72, 172, 18, 9), { ...ice, tex: false, lw: 2.2 }));
      const body = 'M100 56 C132 56 150 74 154 102 C158 130 160 156 154 172 C138 180 62 180 46 172 C40 156 42 130 46 102 C50 74 68 56 100 56Z';
      s += K.vol(body, ice);
      // грани льда
      s += K.line('M58 92 L76 106 L68 134 L52 150 M142 92 L124 108 L132 136 L148 150 M76 106 L100 100 L124 108 M68 134 L100 146 L132 136', '#ffffff', 1.4, { op: 0.45 });
      s += K.gloss(68, 76, 10, 5.5, -35, 0.45);
      s += flake(100, 156, 9, '#ffffff', '', 2, 0.8);
      // левая рука — кулак
      s += K.vol('M52 104 C40 112 36 132 40 146 C44 152 54 152 56 146 C56 134 58 122 62 114Z', { ...ice, tex: false, lw: 2.4 });
      s += K.vol(K.ell(47, 150, 10, 9), { ...ice, tex: false, lw: 2.2 });
      // правая рука поднята, держит шнурки коньков
      s += K.vol('M146 106 C158 98 164 84 162 70 C158 64 150 64 148 70 C148 80 144 90 136 98Z', { ...ice, tex: false, lw: 2.4 });
      s += K.vol(K.ell(155, 64, 9, 8.5), { ...ice, tex: false, lw: 2.2 });
      // борода-сосульки, с кончиков капает
      s += P(K, 'M76 114 Q100 126 124 114 L121 126 L116 142 L111 128 L106 150 L100 130 L94 150 L89 128 L84 142 L79 126Z', '#eef9ff', { line: '#123d63', lw: 1.8 });
      s += K.line('M84 128 L84 138 M100 132 V146 M116 128 V138', '#ffffff', 1.2, { op: 0.8 });
      s += `<path class="art-float" d="M94 156 q-3 5 0 7 q3 -2 0 -7Z M106 158 q-3 5 0 7 q3 -2 0 -7Z" fill="#7dd3fc" stroke="#1e5f96" stroke-width="1"/>`;
      // лицо: сердитые брови, стиснутые зубы
      s += K.eyes(100, 88, 18, 10.5, { iris: '#0369a1', lid: 'angry', skin: '#a8d8f6', look: [0, 0.25] });
      s += K.mouth('teeth', 100, 108, 24);
      s += flake(26, 70, 6) + flake(30, 136, 4.4) + flake(180, 140, 4, '#e0f2fe', '');
      s += K.spark(118, 30, 3.4, '#e0f2fe', 'art-float') + K.spark(22, 104, 2.6, '#ffffff');
      return s;
    },

    // Хримтурс: инеистый великан из рода Имира — огромная шуба из снега, корона из ледяных кристаллов, светящиеся глаза,
    // борода-сосульки до пояса. Опирается на ледяной посох, а над ладонью у него кружит снежинка; у ног — замёрзший фонтан
    no_hrimthurs(K) {
      const fur = { c1: '#eaf4ff', c2: '#4a6fa8', rim: '#e0f7ff', rimK: 0.7, line: '#12254a' };
      let s = K.aura('#67e8f9', 100, 100, 0.45) + K.aura('#1e40af', 62, 96, 0.25);
      // ледяной посох
      s += K.line('M40 178 L48 44', '#12254a', 8) + K.line('M40 178 L48 44', '#9cc9f0', 4.4) + K.line('M41 170 L48 50', '#ffffff', 1.2, { op: 0.8 });
      s += `<circle class="art-aura" cx="49" cy="32" r="20" fill="${K.rad([[0, '#e0fbff', 0.9], [0.4, '#67e8f9', 0.5], [1, '#67e8f9', 0]])}"/>`;
      s += crystal(K, 49, 50, 30, 14, 0, '#c9f3ff') + crystal(K, 46, 48, 16, 8, -30, '#c9f3ff') + crystal(K, 52, 48, 16, 8, 30, '#c9f3ff');
      // шуба
      const robe = 'M100 64 C132 64 156 74 166 94 C174 116 176 148 182 176 C140 182 60 182 18 176 C24 148 26 116 34 94 C44 74 68 64 100 64Z';
      s += K.vol(robe, fur);
      s += K.line('M40 118 l10 8 l-4 12 l8 10 M160 118 l-10 8 l4 12 l-8 10 M30 156 l12 -4 M170 156 l-12 -4', '#ffffff', 1.6, { op: 0.6 }) + flake(48, 104, 6, '#ffffff', '', 1.4, 0.6) + flake(152, 150, 6, '#ffffff', '', 1.4, 0.6) + flake(58, 160, 5, '#ffffff', '', 1.4, 0.5);
      s += K.vol(fluff(100, 174, 80, 6, 16, 1.6), { c1: '#ffffff', c2: '#b8cde6', tex: false, lw: 2, line: '#12254a', shadeK: 0.3 });
      // пояс с рунами
      s += K.line('M34 132 Q100 146 166 132', '#12254a', 9) + K.line('M34 132 Q100 146 166 132', '#6d8fc4', 5);
      s += rune(62, 138, 9, 'h', '#e0fbff', 1.4, '#67e8f9') + rune(138, 138, 9, 'i', '#e0fbff', 1.4, '#67e8f9') + rune(80, 141, 9, 'n', '#e0fbff', 1.4, '#67e8f9') + rune(120, 141, 9, 'j', '#e0fbff', 1.4, '#67e8f9');
      // наплечья из льдинок
      s += crystal(K, 40, 90, 22, 10, -40) + crystal(K, 48, 84, 28, 11, -18) + crystal(K, 160, 90, 22, 10, 40) + crystal(K, 152, 84, 28, 11, 18);
      // рукава и руки
      s += K.vol('M52 86 C38 98 34 114 38 126 C42 132 52 130 54 124 C56 114 60 104 66 98Z', fur);
      s += K.vol(K.ell(44, 126, 10, 9), { c1: '#b9dcf7', c2: '#3f79b8', tex: false, lw: 2.2, line: '#12254a' });
      s += K.vol('M148 86 C162 94 170 106 168 118 C164 124 156 124 152 118 C152 108 146 100 138 96Z', fur);
      s += K.vol(K.ell(162, 120, 10, 9), { c1: '#b9dcf7', c2: '#3f79b8', tex: false, lw: 2.2, line: '#12254a' });
      s += `<circle class="art-aura" cx="166" cy="98" r="14" fill="${K.rad([[0, '#e0fbff', 0.8], [1, '#67e8f9', 0]])}"/>`;
      s += `<g class="art-spin-soft">${flake(166, 98, 10, '#ffffff', '', 2.2, 1)}</g>`;
      // меховой ворот
      s += K.vol(fluff(100, 84, 36, 12, 12, 1.8), { c1: '#ffffff', c2: '#b8cde6', tex: false, lw: 2, line: '#12254a', shadeK: 0.3 });
      // лицо
      s += K.vol(K.ell(100, 62, 21, 22), { c1: '#b9dcf7', c2: '#4a86c4', tex: false, rim: '#e0fbff', lw: 2.4, line: '#12254a' });
      // корона из кристаллов
      s += crystal(K, 74, 50, 14, 8, -38) + crystal(K, 126, 50, 14, 8, 38) + crystal(K, 86, 44, 22, 10, -16) + crystal(K, 114, 44, 22, 10, 16) + crystal(K, 100, 42, 32, 13, 0);
      // брови-иней и светящиеся глаза
      s += K.line('M84 54 Q91 50 97 56 M116 54 Q109 50 103 56', '#ffffff', 3.2);
      s += K.glow(91, 61, 4, 3.2, '#67e8f9') + K.glow(109, 61, 4, 3.2, '#67e8f9');
      // борода-сосульки
      s += K.vol('M78 70 C72 96 80 124 90 150 L94 136 L100 160 L106 136 L110 150 C120 124 128 96 122 70 C114 80 108 82 100 82 C92 82 86 80 78 70Z', { c1: '#ffffff', c2: '#a8c8ea', rim: '#e0fbff', tex: false, lw: 2.2, line: '#12254a', shadeK: 0.3 });
      s += K.line('M90 92 q-2 20 2 40 M100 90 v50 M110 92 q2 20 -2 40', '#8fb3dc', 1.6);
      s += K.mirror(K.part('M100 78 C92 74 82 74 76 82 C78 86 86 86 90 84 C94 83 98 81 100 80Z', '#ffffff', { line: '#12254a', lw: 1.5 }));
      // зевает — изо рта клубится морозный пар
      s += `<ellipse cx="100" cy="85" rx="4.6" ry="4" fill="#12254a"/>`;
      s += K.line('M104 84 C114 76 116 64 128 60 C136 58 140 64 136 68', '#e0f2fe', 2.6, { op: 0.7, cls: 'art-float' });
      // замёрзший фонтанчик у ног
      s += `<ellipse cx="146" cy="176" rx="22" ry="5" fill="${K.lin(['#e0fbff', '#7dd3fc'])}" stroke="#12254a" stroke-width="1.6"/>` + crystal(K, 146, 176, 16, 6, 0, '#e0fbff') + crystal(K, 140, 176, 10, 5, -30, '#e0fbff') + crystal(K, 152, 176, 10, 5, 30, '#e0fbff');
      s += flake(20, 60, 7) + flake(182, 58, 6) + flake(22, 150, 4.6, '#e0f2fe', '') + flake(180, 150, 4.6, '#e0f2fe');
      s += K.spark(140, 20, 3.4, '#e0fbff') + K.spark(64, 20, 2.8, '#ffffff', 'art-float');
      return s;
    },

    // Троллёнок: каменный малыш с моховой шапочкой и цветочком на макушке, большими ушами и носом-картошкой.
    // На теле — трещинки и пятнышки лишайника, сзади — коровий хвост с кисточкой; в лапках бережёт шишку
    no_trollenok(K) {
      const stone = { c1: '#cdc6bc', c2: '#5c554d', rim: '#e4ffb0', line: '#2e2a25' };
      let s = K.aura('#84cc16', 90, 120, 0.35);
      // хвост с кисточкой
      s += K.line('M146 160 C168 166 180 150 176 132', '#2e2a25', 7) + K.line('M146 160 C168 166 180 150 176 132', '#8a8277', 3.6);
      s += P(K, 'M170 134 C164 124 170 114 178 112 C186 116 188 126 182 134Z', '#4d6b2a', { line: '#1f2e10' });
      // уши
      s += K.mirror(K.vol('M52 116 C38 108 28 96 24 82 C38 86 50 94 60 104Z', { ...stone, tex: false, lw: 2.2 }) + K.line('M34 90 C42 96 48 102 54 108', '#8a8277', 1.6));
      // ножки
      s += K.mirror(K.vol(K.ell(76, 173, 15, 8), { ...stone, tex: false, lw: 2.2 }));
      const body = 'M100 74 C138 74 156 104 156 134 C156 162 134 178 100 178 C66 178 44 162 44 134 C44 104 62 74 100 74Z';
      s += K.vol(body, stone);
      // трещинки и лишайник
      s += K.line('M54 140 l8 3 l3 7 M148 120 l-7 4 l-2 7 M70 90 l6 5', '#3f3a34', 1.6, { op: 0.7 });
      s += `<g fill="#a3b86c" opacity=".75"><circle cx="60" cy="158" r="3"/><circle cx="66" cy="163" r="2"/><circle cx="142" cy="150" r="3.4"/><circle cx="136" cy="156" r="2"/><circle cx="130" cy="92" r="2.2"/></g>`;
      // моховая шапочка с цветком
      s += K.vol('M62 96 C58 78 78 64 100 64 C122 64 142 78 138 96 C130 90 124 96 116 91 C108 97 100 91 92 95 C84 91 76 97 70 91 C66 94 64 97 62 96Z', { c1: '#a3e635', c2: '#3f6212', rim: '#e4ffb0', lw: 2.2 });
      s += K.line('M104 66 C104 58 108 52 112 48', '#3f6212', 2) + K.leaf(104, 60, 10, -150, '#65a30d');
      s += `<g fill="#fdf4ff" stroke="#be185d" stroke-width=".8">${[0, 72, 144, 216, 288].map(a => `<circle cx="${f(112 + 3.4 * Math.cos(a * Math.PI / 180))}" cy="${f(46 + 3.4 * Math.sin(a * Math.PI / 180))}" r="2.6"/>`).join('')}</g><circle cx="112" cy="46" r="1.8" fill="#fde047"/>`;
      s += K.gloss(70, 108, 8, 4.5, -35, 0.35);
      // мордочка
      s += K.eyes(100, 110, 20, 12, { iris: '#65a30d', look: [0.1, 0.2] });
      s += K.blush(68, 134, 7) + K.blush(132, 134, 7);
      s += `<ellipse cx="100" cy="130" rx="14" ry="11.5" fill="${K.rad([[0, '#e6c3b4'], [0.7, '#b98f80'], [1, '#8a6456']], 0.4, 0.35, 0.7)}" stroke="#2e2a25" stroke-width="2"/><ellipse cx="95" cy="125.6" rx="4" ry="2.4" fill="#fff" opacity=".6"/>`;
      s += K.mouth('smile', 100, 147, 20) + `<path d="M91.5 148.4 l1.6 -4.4 l2.4 4.8Z M108.5 148.4 l-1.6 -4.4 l-2.4 4.8Z" fill="#fffbeb" stroke="#2e2a25" stroke-width=".8"/>`;
      // лапки с шишкой
      const cone = `<ellipse cx="100" cy="166" rx="9" ry="12" fill="${K.lin(['#b7773a', '#6b3a15'])}" stroke="#3b1d0c" stroke-width="1.6"/>` + K.line('M92 160 q8 4 16 0 M91 166 q9 4 18 0 M92 172 q8 4 16 0', '#3b1d0c', 1.2);
      s += cone + K.mirror(K.vol(K.ell(84, 164, 8, 7), { ...stone, tex: false, lw: 2 }));
      s += K.spark(30, 70, 3, '#e4ffb0', 'art-float') + K.spark(168, 88, 2.6, '#d9f99d') + K.spark(26, 146, 2.4, '#e4ffb0');
      return s;
    },

    // Тролль: сидит под аркой каменного моста — лохматый, с носом-баклажаном, большими ушами и клыками из-под губы.
    // Требует плату за проход — и довольно протягивает ладонь с печеньем; коровий хвост с кисточкой, в волосах веточки
    no_troll(K) {
      const skin = { c1: '#aebb8e', c2: '#3f4a2a', rim: '#e4ffb0', line: '#1f2612' };
      let s = K.aura('#84cc16', 96, 118, 0.3);
      // каменный мост
      s += P(K, 'M0 58 Q100 22 200 58 L200 82 L184 82 C172 50 28 50 16 82 L0 82Z', '#9ca3af', { line: '#374151', lw: 2.2 });
      s += K.line('M20 52 L24 66 M44 42 L46 58 M70 36 L70 52 M100 34 V48 M130 36 L130 52 M156 42 L154 58 M180 52 L176 66', '#4b5563', 1.6, { op: 0.8 });
      s += K.line('M6 60 Q100 26 194 60', '#4b5563', 1.4, { op: 0.6 });
      s += `<path d="M24 78 C40 58 160 58 176 78" fill="none" stroke="#1f2937" stroke-width="3" opacity=".35"/>`;
      // хвост
      s += K.line('M46 162 C24 168 16 150 22 136', '#1f2612', 7) + K.line('M46 162 C24 168 16 150 22 136', '#8a9870', 3.6);
      s += P(K, 'M16 138 C12 128 18 118 26 116 C32 120 34 130 28 138Z', '#5a3a1a', { line: '#2a1a08' });
      // уши
      s += K.mirror(K.vol('M50 104 C36 102 26 110 24 122 C34 124 46 120 54 114Z', { ...skin, tex: false, lw: 2.2 }));
      // ноги
      s += K.mirror(K.vol(K.ell(72, 173, 18, 8), { ...skin, tex: false, lw: 2.2 }) + K.line('M60 176 v-4 M68 178 v-4 M76 178 v-4', '#1f2612', 1.4));
      const body = 'M100 64 C140 64 160 94 162 130 C164 162 144 178 100 178 C56 178 36 162 38 130 C40 94 60 64 100 64Z';
      s += K.vol(body, skin);
      s += `<path d="M100 146 C124 146 136 156 136 166 C130 176 70 176 64 166 C64 156 76 146 100 146Z" fill="#c9d4a6" opacity=".55"/>`;
      // лохматые волосы с веточками
      s += K.vol('M60 92 C54 76 66 60 84 58 C88 50 100 48 106 54 C116 50 130 56 134 64 C146 68 148 82 140 92 C134 84 128 90 122 84 C116 92 108 84 100 90 C92 84 86 92 78 86 C72 92 66 88 60 92Z', { c1: '#8a6a44', c2: '#3a2610', rim: '#e4ffb0', lw: 2.2, line: '#1f1206' });
      s += K.line('M122 60 L132 44 M128 50 L136 48', '#5a3414', 2.2) + K.leaf(132, 44, 10, -60, '#65a30d') + K.leaf(76, 62, 9, -130, '#84cc16');
      // глаза и нос-баклажан
      s += K.eyes(100, 98, 19, 9.5, { iris: '#a16207', look: [0.3, 0.25] });
      s += K.line('M76 86 Q82 82 90 86 M124 86 Q118 82 110 86', '#3a2610', 3);
      s += K.vol('M100 100 C110 100 114 110 114 120 C116 134 108 142 100 142 C92 142 84 136 86 124 C86 110 90 100 100 100Z', { c1: '#c7b08a', c2: '#6b5a3a', rim: '#e4ffb0', tex: false, lw: 2.2, line: '#1f2612' });
      s += `<g fill="#6b5a3a"><circle cx="96" cy="128" r="1.4"/><circle cx="104" cy="118" r="1.2"/><circle cx="107" cy="132" r="1.3"/></g>` + K.gloss(95, 110, 3.4, 2, -35, 0.5);
      // рот с клыками
      s += K.line('M80 150 Q100 158 120 148', K.INK, 3);
      s += `<path d="M86 152 l2 -8 l4 9Z M114 151 l-2 -8 l-4 9Z" fill="#fffbeb" stroke="${K.INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
      s += K.blush(70, 128, 7) + K.blush(130, 128, 7);
      // левая лапа на колене
      s += K.vol('M50 124 C42 134 42 148 50 156 C56 160 64 156 64 150 C60 142 58 134 60 128Z', { ...skin, tex: false, lw: 2.2 });
      // правая — протягивает печенье
      s += K.vol('M146 118 C160 124 170 138 168 150 C162 156 152 154 148 146 C150 138 146 130 138 126Z', { ...skin, tex: false, lw: 2.2 });
      s += K.vol('M144 152 C150 148 164 148 172 152 C172 158 164 162 156 162 C150 162 144 158 144 152Z', { ...skin, tex: false, lw: 2 });
      s += `<circle cx="158" cy="144" r="10" fill="${K.lin(['#f2c27a', '#b7773a'])}" stroke="#5a3414" stroke-width="1.8"/><g fill="#4a2a10"><circle cx="154" cy="141" r="1.6"/><circle cx="161" cy="140" r="1.4"/><circle cx="159" cy="147" r="1.6"/><circle cx="153" cy="148" r="1.2"/></g>`;
      s += K.spark(174, 128, 3, '#fde68a') + K.spark(184, 104, 2.4, '#fef3c7', 'art-float') + K.spark(18, 104, 2.6, '#e4ffb0', 'art-float');
      return s;
    },

    // Горный тролль: великан-гора в снежной шапке — на плечах растут ели, по бокам мох и трещины, из подбородка свисает
    // моховая борода, клыки торчат вверх. Он задремал — сонные веки, а на снежной макушке уселась пичужка
    no_bergtroll(K) {
      const rock = { c1: '#b4bcc8', c2: '#3b4452', rim: '#e4ffb0', rimK: 0.5, line: '#1c222c' };
      let s = K.aura('#84cc16', 100, 104, 0.35) + K.aura('#94a3b8', 70, 100, 0.25);
      // руки-валуны
      s += K.mirror(K.vol('M50 118 C34 128 26 148 30 164 C34 176 48 178 56 170 C58 156 60 140 64 128Z', { ...rock, lw: 2.4 }) + K.vol(K.ell(40, 168, 15, 11), { ...rock, tex: false, lw: 2.2 }) + K.line('M30 166 q4 4 8 0 M38 172 q4 4 8 0', '#1c222c', 1.4, { op: 0.6 }));
      const body = 'M100 30 C112 30 122 42 130 56 L148 80 C164 102 172 140 176 176 C130 181 70 181 24 176 C28 140 36 102 52 80 L70 56 C78 42 88 30 100 30Z';
      s += K.vol(body, rock);
      // снежная шапка
      s += K.vol('M100 30 C112 30 122 42 130 56 C122 52 118 60 110 54 C104 60 96 60 90 54 C82 60 78 52 70 56 C78 42 88 30 100 30Z', { c1: '#ffffff', c2: '#c8d3e2', rim: '#ffffff', tex: false, lw: 2, line: '#1c222c', shadeK: 0.3 });
      // ели на плечах
      s += fir(K, 150, 70, 30, '#2f7a3a') + fir(K, 162, 88, 24, '#276b33') + fir(K, 138, 80, 18, '#3a8a44') + fir(K, 50, 72, 28, '#2f7a3a') + fir(K, 38, 92, 22, '#276b33') + fir(K, 62, 84, 16, '#3a8a44');
      // мох, трещины, камешки
      s += `<g fill="#6b8e3a" opacity=".85"><ellipse cx="64" cy="150" rx="12" ry="6"/><ellipse cx="140" cy="160" rx="14" ry="6"/><ellipse cx="150" cy="126" rx="6" ry="4"/></g>`;
      s += K.line('M80 138 l8 6 l-2 8 M126 132 l-6 8 l4 8 M60 112 l6 4', '#1c222c', 1.6, { op: 0.6 });
      // сонное лицо
      s += K.eyes(100, 80, 15, 8.5, { iris: '#65a30d', lid: 'half', skin: '#8f99a8', look: [0, 0.3] });
      s += K.line('M80 70 Q88 66 95 70 M120 70 Q112 66 105 70', '#1c222c', 3.2);
      s += K.vol(K.ell(100, 100, 14, 12), { ...rock, c1: '#c9ced6', tex: false, lw: 2.2 });
      // моховая борода, рот с клыками
      s += K.vol('M72 118 C70 132 76 146 84 152 L88 144 L94 156 L100 146 L106 156 L112 144 L116 152 C124 146 130 132 128 118 C118 124 82 124 72 118Z', { c1: '#84cc16', c2: '#2f5a12', rim: '#e4ffb0', lw: 2, line: '#1c2a0c' });
      s += K.line('M82 118 Q100 124 118 118', K.INK, 3);
      s += `<path d="M86 120 l2 -9 l4 10Z M114 120 l-2 -9 l-4 10Z" fill="#fffbeb" stroke="${K.INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
      // пичужка на макушке и «хр-р»
      s += `<g class="art-float">` + K.vol(K.ell(116, 34, 7, 6), { c1: '#fca5a5', c2: '#b91c1c', tex: false, lw: 1.6, line: '#450a0a' }) + `<path d="M122 32 l5 1.4 l-5 1.6Z" fill="#fbbf24" stroke="#78350f" stroke-width=".8"/><circle cx="118.6" cy="32" r="1.2" fill="${K.INK}"/>` + K.line('M110 36 l-5 2', '#7f1d1d', 2) + '</g>';
      s += K.line('M140 42 q4 -3 8 0 M150 32 q5 -4 10 0 M162 20 q6 -5 12 0', '#e2e8f0', 2, { op: 0.7, cls: 'art-float' });
      s += K.spark(26, 50, 3, '#e4ffb0', 'art-float') + K.spark(180, 110, 2.6, '#d9f99d') + K.spark(20, 120, 2.4, '#ffffff');
      return s;
    },
    // Воронёнок: пушистый вороний птенец с хохолком и огромными глазами. Через плечо — сумка вестника с руной Ансуз
    // (мечтает служить Одину), крылышки хлопают, а у лап — собранные сокровища: монетка, пуговица и ключик
    no_voronenok(K) {
      const fe = { c1: '#5a6886', c2: '#101828', rim: '#c7d2fe', line: '#0a0f1a' };
      let s = K.aura('#a5b4fc', 90, 118, 0.4);
      s += K.line('M16 96 q10 -8 20 0 t20 0 M150 60 q8 -6 16 0 t16 0', '#c7d2fe', 2, { op: 0.5, cls: 'art-float' });
      // хвост и лапки
      s += P(K, 'M84 162 L76 182 L90 176 L100 184 L110 176 L124 182 L116 162Z', '#1e293b', { line: '#0a0f1a' });
      s += K.mirror(K.line('M86 168 V178 M86 178 l-6 3 M86 178 v4 M86 178 l6 3', '#0a0f1a', 4) + K.line('M86 168 V178 M86 178 l-6 3 M86 178 v4 M86 178 l6 3', '#64748b', 2));
      // крылышки машут
      const wing = `<g class="art-wing">` + K.vol('M56 116 C40 108 24 114 18 128 C26 130 30 136 28 144 C36 142 42 146 44 152 C52 144 60 134 62 124Z', { ...fe, tex: false, lw: 2.2 }) +
        K.line('M26 132 q10 0 20 -8 M32 142 q8 -2 16 -10', '#8b9ac0', 1.4, { op: 0.7 }) + '</g>';
      s += K.mirror(wing);
      // хохолок
      s += K.part('M94 76 C88 62 90 50 97 42 C100 52 102 62 104 74Z', '#334155', { line: '#0a0f1a' }) + K.part('M102 76 C106 64 112 56 122 54 C118 62 112 70 108 78Z', '#334155', { line: '#0a0f1a' }) + K.part('M92 78 C84 70 78 66 70 66 C74 72 80 78 88 82Z', '#334155', { line: '#0a0f1a' });
      // тельце и пушистое брюшко
      const body = 'M100 70 C138 70 158 100 156 134 C154 162 132 178 100 178 C68 178 46 162 44 134 C42 100 62 70 100 70Z';
      s += K.vol(body, fe);
      s += `<path d="${fluff(100, 152, 30, 20, 10, 1.4)}" fill="#3b4760" opacity=".8"/>`;
      s += K.gloss(70, 92, 10, 5.5, -35, 0.35);
      // сумка вестника
      s += K.line('M52 110 Q92 142 136 150', '#3b1d0c', 6) + K.line('M52 110 Q92 142 136 150', '#9a5a2e', 3.4);
      s += P(K, 'M124 142 H152 V160 Q138 166 124 160Z', '#a0692c', { line: '#3b1d0c' }) + P(K, 'M122 140 H154 L150 152 H126Z', '#7c4a1d', { line: '#3b1d0c' });
      s += rune(138, 150, 8, 'a', '#fde68a', 1.4);
      // глаза, клюв, румянец
      s += K.eyes(100, 108, 21, 13.5, { iris: '#7a4a2a', look: [0.2, 0.15] });
      s += K.blush(70, 126, 6) + K.blush(130, 126, 6);
      s += `<path d="M86 122 C92 116 108 116 114 122 C112 132 106 140 100 146 C94 140 88 132 86 122Z" fill="${K.lin(['#94a3b8', '#475569', '#1e293b'])}" stroke="#0a0f1a" stroke-width="2" stroke-linejoin="round"/>`;
      s += K.line('M88 127 Q100 132 112 127', '#0a0f1a', 1.6) + K.line('M91 121 Q96 119 101 120', '#f1f5f9', 1.6, { op: 0.8 });
      // сокровища у лап
      s += `<circle cx="42" cy="172" r="7" fill="${K.lin(['#fde68a', '#d97706'])}" stroke="#78350f" stroke-width="1.6"/>` + K.line('M39 172 h6', '#92400e', 1.4) + K.spark(38, 166, 4, '#fffbe6');
      s += `<circle cx="160" cy="174" r="6" fill="#60a5fa" stroke="#1e3a8a" stroke-width="1.6"/><g fill="#1e3a8a"><circle cx="158" cy="172" r="1"/><circle cx="162" cy="172" r="1"/><circle cx="158" cy="176" r="1"/><circle cx="162" cy="176" r="1"/></g>`;
      s += `<g transform="rotate(-20 58 176)"><circle cx="52" cy="176" r="4.4" fill="none" stroke="#d97706" stroke-width="2.4"/><path d="M56 176 H68 M64 176 v4 M67 176 v3" stroke="#d97706" stroke-width="2.4" stroke-linecap="round"/></g>`;
      s += K.spark(170, 96, 3, '#e0e7ff') + K.spark(28, 70, 2.6, '#fde68a', 'art-float') + K.spark(176, 150, 2.4, '#e0e7ff', 'art-float');
      return s;
    },

    // Хугин и Мунин: два ворона Одина сидят на рунном камне и смотрят друг на друга. Хугин (Мысль) — над ним светится руна
    // Ансуз, знак мудрости; Мунин (Память) прикрыл глаза, вспоминает, и держит свиток со всем, что видел за день
    no_huginmunin(K) {
      let s = K.aura('#a5b4fc', 96, 104, 0.42);
      s += K.line('M14 50 q10 -8 20 0 t20 0 M146 36 q8 -6 16 0 t16 0', '#c7d2fe', 2, { op: 0.45, cls: 'art-float' });
      // рунный камень
      const stone = 'M36 178 C34 158 46 140 100 138 C154 140 166 158 164 178Z';
      s += K.vol(stone, { c1: '#a3adbd', c2: '#3b4452', rim: '#c7d2fe', tex: false, line: '#1c222c' });
      s += K.line('M44 162 Q100 150 156 162', '#1c222c', 1.4, { op: 0.5 }) + K.line('M44 172 Q100 160 156 172', '#1c222c', 1.4, { op: 0.5 });
      ['h', 'u', 'g', 'i', 'n', 'm', 'u', 'n', 'i', 'n'].forEach((r, i) => { s += rune(f(56 + i * 9.8), f(163 - Math.sin((i + 0.5) / 10 * Math.PI) * 6), 7, r, '#e0e7ff', 1.3, '#a5b4fc'); });
      s += `<path d="M58 146 q6 -4 12 0" stroke="#6b8e3a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      // Хугин — слева, смотрит вправо
      s += raven(K, -6, {});
      // Мунин — справа (зеркально), глаза прикрыты
      s += `<g transform="translate(200 0) scale(-1 1)">${raven(K, -6, { eye: { lid: 'half', skin: '#2c3850', look: [0.4, 0.3] } })}</g>`;
      // руна Мысли над Хугином
      s += `<circle class="art-aura" cx="62" cy="30" r="15" fill="${K.rad([[0, '#fef9c3', 0.9], [0.5, '#fde68a', 0.4], [1, '#fde68a', 0]])}"/>` + `<g class="art-float">${rune(62, 30, 16, 'a', '#fffbe6', 2.2, '#fde047')}</g>`;
      // свиток Памяти у Мунина
      s += `<g transform="rotate(-12 150 136)">` + P(K, 'M136 128 H162 V142 H136Z', '#fef3c7', { line: '#78350f', lw: 1.6 }) + `<ellipse cx="136" cy="135" rx="3" ry="7.5" fill="#f3d9a6" stroke="#78350f" stroke-width="1.6"/><ellipse cx="162" cy="135" rx="3" ry="7.5" fill="#f3d9a6" stroke="#78350f" stroke-width="1.6"/>` +
        K.line('M142 132 h14 M142 136 h10 M142 140 h12', '#92400e', 1.1) + '</g>';
      s += `<g class="art-float" style="animation-delay:-1s">${rune(142, 26, 11, 'o', '#e0e7ff', 1.6, '#a5b4fc')}</g>`;
      s += K.spark(100, 60, 3.4, '#fde68a') + K.spark(24, 104, 2.6, '#e0e7ff', 'art-float') + K.spark(180, 100, 2.6, '#e0e7ff') + K.spark(100, 20, 2.4, '#ffffff', 'art-float');
      return s;
    },

    // Громушка: пушистый козлёнок-громовичок — рожки-пеньки с искрами, чёлка-молния, вислые ушки, колокольчик на ошейнике.
    // Смешная бородка и копытца; вокруг проскакивают разряды
    no_gromushka(K) {
      const wool = { c1: '#ffffff', c2: '#b8b2aa', rim: '#fff6b0', line: '#3f3a34' };
      let s = K.aura('#facc15', 90, 118, 0.42);
      // шерстяное тельце и ножки
      s += K.mirror(K.vol('M76 150 H90 V172 Q83 178 76 172Z', { ...wool, tex: false, lw: 2 }) + P(K, 'M75 168 H91 V176 Q83 181 75 176Z', '#57534e', { lw: 1.6 }));
      s += K.vol(fluff(100, 146, 40, 22, 12, 1.8), { ...wool, texK: 0.25 });
      // ушки
      s += K.mirror(K.vol('M66 94 C54 88 40 90 32 98 C40 106 54 108 66 104Z', { ...wool, tex: false, lw: 2 }) + K.part('M60 97 C52 94 44 95 39 99 C46 103 54 103 60 101Z', '#fbcfe8', { lw: 0 }));
      // рожки с искрами
      s += K.mirror(K.part('M84 72 C80 62 82 52 88 46 C92 54 94 62 94 70Z', '#e7d6a8', { line: '#6b5a2a' }) + K.line('M84 62 l8 -2 M83 56 l7 -2', '#a8905a', 1.2));
      s += bolt(K, 80, 38, 0.7, -20) + bolt(K, 120, 38, 0.7, 20);
      // голова
      s += K.vol('M100 64 C128 64 142 84 140 106 C138 126 122 140 100 140 C78 140 62 126 60 106 C58 84 72 64 100 64Z', wool);
      // чёлка-молния
      s += `<path d="M90 64 L110 62 L102 74 L112 73 L94 92 L99 79 L89 81Z" fill="${K.lin(['#fff6b0', '#facc15', '#ca8a04'])}" stroke="#854d0e" stroke-width="1.6" stroke-linejoin="round"/>`;
      s += K.eyes(100, 100, 19, 11.5, { iris: '#f59e0b', look: [0.1, 0.2] });
      s += K.blush(72, 118, 6) + K.blush(128, 118, 6);
      // мордочка
      s += `<ellipse cx="100" cy="122" rx="15" ry="10" fill="${K.rad([[0, '#fde2e4'], [1, '#f4b6c2']], 0.45, 0.35, 0.7)}" stroke="#3f3a34" stroke-width="1.8"/>`;
      s += `<ellipse cx="95" cy="119" rx="2" ry="1.4" fill="#7a3a44"/><ellipse cx="105" cy="119" rx="2" ry="1.4" fill="#7a3a44"/>` + K.mouth('cat', 100, 125, 12);
      s += K.part('M95 138 C96 146 98 150 100 154 C102 150 104 146 105 138Z', '#f5f5f4', { line: '#3f3a34', lw: 1.6 });
      // ошейник с колокольчиком
      s += K.line('M72 134 Q100 146 128 134', '#b91c1c', 4.4) + `<circle cx="116" cy="146" r="5.4" fill="${K.lin(['#fef08a', '#ca8a04'])}" stroke="#713f12" stroke-width="1.5"/><circle cx="116" cy="148.6" r="1.2" fill="#713f12"/>`;
      s += bolt(K, 30, 128, 0.8, -10) + bolt(K, 172, 120, 0.8, 15);
      s += K.spark(40, 70, 3.4, '#fef08a', 'art-float') + K.spark(164, 80, 3, '#fffbe6') + K.spark(160, 164, 2.6, '#fde047', 'art-float');
      return s;
    },

    // Тангниостр («Скрежещущий зубами»): козёл громовой колесницы — длинная морда, рога назад с кольцами,
    // янтарные глаза с поперечным зрачком, стиснутые зубы и борода. На груди — красная упряжь с золотыми бляхами, у копыт искрит
    no_tanngnjost(K) {
      const coat = { c1: '#e7e5e4', c2: '#6b645c', rim: '#fff6b0', line: '#2a2622' };
      let s = K.aura('#facc15', 96, 110, 0.42);
      // ноги
      s += K.mirror(K.vol('M72 140 H90 V170 H72Z', { ...coat, tex: false, lw: 2.2 }) + P(K, 'M70 166 H92 V176 Q81 181 70 176Z', '#3f3a34', { lw: 1.6 }) + K.line('M81 168 V178', '#1c1917', 1.4));
      // туловище
      s += K.vol('M100 96 C136 96 158 118 158 142 C158 160 140 166 100 166 C60 166 42 160 42 142 C42 118 64 96 100 96Z', coat);
      // упряжь
      s += K.line('M46 130 Q100 158 154 130', '#5a0f0f', 10) + K.line('M46 130 Q100 158 154 130', '#c81e1e', 6);
      [62, 80, 120, 138].forEach(x => { const y = 130 + 28 * (1 - Math.pow((x - 100) / 54, 2)) * 0.5; s += `<circle cx="${x}" cy="${f(y)}" r="3.2" fill="${K.lin(['#fef08a', '#ca8a04'])}" stroke="#713f12" stroke-width="1.2"/>`; });
      // рога назад с кольцами
      const horn = 'M86 58 C76 40 60 28 38 28 C48 34 56 40 62 48 C68 58 74 66 82 70Z';
      s += K.mirror(K.part(horn, '#d9c79c', { line: '#5a4a24' }) + K.line('M76 46 l-6 6 M68 38 l-5 6 M60 33 l-4 5', '#8a7644', 1.6));
      // уши
      s += K.mirror(K.vol('M70 72 C58 68 46 72 40 80 C48 86 60 86 70 82Z', { ...coat, tex: false, lw: 2 }));
      // голова
      s += K.vol('M100 50 C120 50 132 64 132 82 C132 104 124 124 116 136 C110 144 90 144 84 136 C76 124 68 104 68 82 C68 64 80 50 100 50Z', coat);
      s += `<path d="M100 54 C106 54 110 62 108 72 C106 82 104 96 100 108 C96 96 94 82 92 72 C90 62 94 54 100 54Z" fill="#ffffff" opacity=".7"/>`;
      // морда
      s += `<path d="M84 118 C84 110 116 110 116 118 C116 132 110 142 100 142 C90 142 84 132 84 118Z" fill="${K.lin(['#a8a29e', '#57534e'])}" stroke="#2a2622" stroke-width="1.8"/>`;
      s += `<path d="M92 118 q2 3 5 2 M108 118 q-2 3 -5 2" stroke="#1c1917" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      // стиснутые зубы
      s += `<path d="M88 128 Q100 134 112 128 Q111 137 100 137 Q89 137 88 128Z" fill="#fffbeb" stroke="${K.INK}" stroke-width="2" stroke-linejoin="round"/>` + K.line('M92 130 V136 M96 131 V137 M100 131.4 V137 M104 131 V137 M108 130 V136 M89 132.6 Q100 135.6 111 132.6', K.INK, 1.1);
      // борода
      s += K.vol('M90 140 C90 154 94 166 100 176 C106 166 110 154 110 140 Q100 146 90 140Z', { c1: '#ffffff', c2: '#a8a29e', tex: false, lw: 1.8, line: '#2a2622', shadeK: 0.3 });
      // глаза с поперечным зрачком и сердитыми бровями
      s += `<g class="art-eyes">${goatEye(K, 86, 82, 8.5, { flip: 0 }) + goatEye(K, 114, 82, 8.5, { flip: 1 })}</g>`;
      s += bolt(K, 60, 176, 0.6, 30) + bolt(K, 140, 176, 0.6, -30) + bolt(K, 30, 100, 0.9, -15) + bolt(K, 172, 96, 0.9, 15);
      s += K.spark(24, 60, 3, '#fef08a', 'art-float') + K.spark(178, 150, 2.6, '#fffbe6');
      return s;
    },

    // Тангриснир («Скалящий зубы»): старший козёл Тора стоит на грозовой туче. Могучие закрученные рога, из них бьют молнии,
    // длинная борода, светящиеся янтарные глаза, оскал. Золотая упряжь с рунными бляхами и бубенцом — готов мчать колесницу
    no_tanngrisnir(K) {
      const coat = { c1: '#fbf7ea', c2: '#6b645c', rim: '#fff6b0', rimK: 0.75, line: '#2a2622' };
      let s = K.aura('#facc15', 100, 96, 0.5) + K.aura('#6366f1', 70, 150, 0.3);
      // молнии из-за рогов
      s += K.line('M40 20 L30 44 L40 44 L26 74', '#fde047', 3.2, { cls: 'art-blink' }) + K.line('M160 20 L170 44 L160 44 L174 74', '#fde047', 3.2, { cls: 'art-blink' });
      // грозовая туча
      s += K.vol(fluff(100, 170, 84, 12, 14, 2.4), { c1: '#8b93c9', c2: '#2e3160', rim: '#fde047', rimK: 0.5, tex: false, lw: 2.2, line: '#161838' });
      // ноги
      s += K.mirror(K.vol('M70 132 H88 V164 H70Z', { ...coat, tex: false, lw: 2.2 }) + P(K, 'M68 160 H90 V170 Q79 175 68 170Z', '#44403c', { lw: 1.6 }));
      // туловище, грудь
      s += K.vol('M100 88 C140 88 162 110 162 136 C162 156 142 164 100 164 C58 164 38 156 38 136 C38 110 60 88 100 88Z', coat);
      // золотая упряжь с рунами и бубенцом
      s += K.line('M42 122 Q100 156 158 122', '#713f12', 12) + K.line('M42 122 Q100 156 158 122', '#eab308', 8) + K.line('M42 122 Q100 156 158 122', '#fef08a', 1.6, { op: 0.8 });
      [[58, 't'], [78, 'h'], [122, 'r'], [142, 'u']].forEach(([x, r]) => { const y = 122 + 34 * (1 - Math.pow((x - 100) / 58, 2)) * 0.5; s += K.rhomb(x, f(y), 6, '#fde68a', '#713f12') + rune(x, f(y), 6, r, '#713f12', 1.2); });
      s += `<circle cx="100" cy="148" r="7.5" fill="${K.lin(['#fef08a', '#ca8a04'])}" stroke="#713f12" stroke-width="1.8"/><circle cx="100" cy="151.6" r="1.6" fill="#713f12"/>`;
      // закрученные рога
      const horn = 'M84 52 C70 30 40 26 30 48 C24 64 40 80 54 74 C64 70 62 58 52 58';
      s += K.mirror(K.line(horn, '#4a3a1a', 15) + K.line(horn, '#e0cc98', 11) + K.line(horn, '#fff3c4', 3, { op: 0.6 }) + K.line('M72 40 l-4 8 M58 34 l0 9 M44 38 l3 8 M34 50 l7 4 M36 64 l8 -2', '#8a7644', 1.6));
      // уши
      s += K.mirror(K.vol('M72 68 C60 64 48 68 42 76 C50 82 62 82 72 78Z', { ...coat, tex: false, lw: 2 }));
      // голова
      s += K.vol('M100 44 C120 44 132 58 132 76 C132 98 124 116 116 128 C110 136 90 136 84 128 C76 116 68 98 68 76 C68 58 80 44 100 44Z', coat);
      s += `<path d="M100 48 C106 48 110 56 108 66 C106 76 104 88 100 100 C96 88 94 76 92 66 C90 56 94 48 100 48Z" fill="#ffffff" opacity=".7"/>`;
      s += `<path d="M84 110 C84 102 116 102 116 110 C116 124 110 134 100 134 C90 134 84 124 84 110Z" fill="${K.lin(['#b5aea6', '#57534e'])}" stroke="#2a2622" stroke-width="1.8"/>`;
      s += `<path d="M92 110 q2 3 5 2 M108 110 q-2 3 -5 2" stroke="#1c1917" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      // оскал
      s += K.mouth('fang', 100, 120, 20);
      // борода
      s += K.vol('M88 132 C88 150 94 164 100 174 C106 164 112 150 112 132 Q100 140 88 132Z', { c1: '#ffffff', c2: '#a8a29e', tex: false, lw: 1.8, line: '#2a2622', shadeK: 0.3 });
      // светящиеся глаза
      s += `<circle class="art-blink" cx="86" cy="76" r="12" fill="${K.rad([[0, '#fef08a', 0.7], [1, '#facc15', 0]])}"/><circle class="art-blink" cx="114" cy="76" r="12" fill="${K.rad([[0, '#fef08a', 0.7], [1, '#facc15', 0]])}"/>`;
      s += `<g class="art-eyes">${goatEye(K, 86, 76, 8.5, { flip: 0, iris: '#facc15' }) + goatEye(K, 114, 76, 8.5, { flip: 1, iris: '#facc15' })}</g>`;
      s += bolt(K, 22, 110, 1, -20) + bolt(K, 178, 104, 1, 20) + bolt(K, 100, 16, 0.8, 0);
      s += K.spark(40, 146, 3, '#fef08a', 'art-float') + K.spark(164, 148, 3, '#fffbe6', 'art-float');
      return s;
    },

    // Курганник: маленький дух старого кургана выглядывает из каменной двери в холме, на голове — великоватый железный шлем.
    // Держит монетку из своего «клада» (три монетки и бутылочная крышка), над курганом парят синие курганные огоньки, сбоку рунный камень
    no_kurgannik(K) {
      let s = K.aura('#c084fc', 94, 120, 0.35);
      // месяц
      s += `<path d="M34 28 A16 16 0 1 0 52 50 A12 12 0 0 1 34 28Z" fill="#fef9c3" opacity=".85"/>`;
      // курган
      const mound = 'M6 178 C16 128 56 96 100 96 C144 96 184 128 194 178Z';
      s += K.vol(mound, { c1: '#5e8a2c', c2: '#132208', rim: '#e9d5ff', rimK: 0.45, tex: false, line: '#0b1405' });
      s += K.line('M24 150 l2 -6 l2 6 M40 130 l2 -6 l2 6 M160 132 l2 -6 l2 6 M176 154 l2 -6 l2 6 M60 112 l2 -5 l2 5', '#86b34a', 1.6);
      s += `<g fill="#f9a8d4"><circle cx="30" cy="160" r="2.4"/><circle cx="170" cy="164" r="2.4"/></g><g fill="#fde68a"><circle cx="52" cy="136" r="2"/><circle cx="152" cy="116" r="2"/></g>`;
      // рунный камень
      s += K.vol('M30 138 C28 120 32 106 40 104 C48 106 52 120 50 138Z', { c1: '#a3adbd', c2: '#3b4452', rim: '#e9d5ff', tex: false, lw: 2, line: '#1c222c' });
      s += rune(40, 118, 10, 'o', '#a5f3fc', 1.4, '#22d3ee') + rune(40, 130, 7, 'h', '#a5f3fc', 1.2);
      // каменная дверь и дух (крупнее, чтобы читался в маленькой карточке)
      let g = '';
      const door = 'M66 178 V144 C66 118 134 118 134 144 V178Z';
      g += `<path d="${door}" fill="#0b0a1f"/>` + `<path d="${door}" fill="none" stroke="#1c222c" stroke-width="13"/>` + `<path d="${door}" fill="none" stroke="#8a93a3" stroke-width="10" stroke-dasharray="14 3"/>`;
      // дух в шлеме
      const body = 'M75 150 C75 128 86 116 100 116 C114 116 125 128 125 150 L126 172 Q119 164 113 171 Q106 178 100 171 Q94 164 87 171 Q81 178 74 172Z';
      g += K.vol(body, { c1: '#b9c6d8', c2: '#3b4a63', rim: '#a5f3fc', rimK: 0.6, tex: false, line: '#141a26', lw: 2.4 });
      g += K.vol('M76 138 C74 116 86 106 100 106 C114 106 126 116 124 138 C116 134 84 134 76 138Z', { c1: '#9aa3ad', c2: '#3a3f47', rim: '#e9d5ff', tex: false, lw: 2.2, line: '#141a26' });
      g += `<g fill="#b45309" opacity=".7"><circle cx="86" cy="122" r="2"/><circle cx="114" cy="126" r="1.6"/><circle cx="108" cy="114" r="1.2"/></g>`;
      g += P(K, 'M74 134 Q100 128 126 134 L126 140 Q100 134 74 140Z', '#6b7280', { line: '#141a26', lw: 1.6 }) + P(K, 'M97.5 134 H102.5 V152 Q100 154 97.5 152Z', '#6b7280', { line: '#141a26', lw: 1.4 });
      g += K.glow(88, 146, 5.4, 6.4, '#67e8f9') + K.glow(112, 146, 5.4, 6.4, '#67e8f9');
      g += `<ellipse cx="100" cy="162" rx="3.4" ry="4.2" fill="#141a26"/>`;
      g += `<ellipse cx="80" cy="158" rx="5" ry="3" fill="#c4b5fd" opacity=".4"/><ellipse cx="120" cy="158" rx="5" ry="3" fill="#c4b5fd" opacity=".4"/>`;
      // ручки: одна держится за косяк, другая показывает монетку
      g += K.vol(K.ell(70, 156, 7, 6), { c1: '#b9c6d8', c2: '#3b4a63', tex: false, lw: 2, line: '#141a26' });
      g += `<circle cx="136" cy="146" r="7" fill="${K.lin(['#fde68a', '#d97706'])}" stroke="#78350f" stroke-width="1.6"/>` + rune(136, 146, 7, 'f', '#92400e', 1.2) + K.spark(141, 140, 3.6, '#fffbe6');
      g += K.vol(K.ell(130, 154, 7, 6), { c1: '#b9c6d8', c2: '#3b4a63', tex: false, lw: 2, line: '#141a26' });
      s += K.g(g, 'translate(100 178) scale(1.24) translate(-100 -178)');
      // клад у порога
      s += `<ellipse cx="38" cy="176" rx="6" ry="3" fill="#fbbf24" stroke="#78350f" stroke-width="1.4"/><ellipse cx="46" cy="172" rx="6" ry="3" fill="#fcd34d" stroke="#78350f" stroke-width="1.4"/>`;
      s += `<ellipse cx="156" cy="175" rx="6" ry="3" fill="#fbbf24" stroke="#78350f" stroke-width="1.4"/>`;
      s += `<path d="M162 176 l1.6 -4 l2 3 l2 -3.4 l2 3.4 l2 -3 l1.6 4Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.2" stroke-linejoin="round"/>`;
      // курганные огоньки
      s += wisp(K, 20, 80, 14, -0.3) + wisp(K, 178, 70, 14, -1.1) + wisp(K, 160, 104, 11, -0.7);
      s += K.spark(80, 40, 2.6, '#fef9c3') + K.spark(160, 30, 2.4, '#e9d5ff', 'art-float');
      return s;
    },

    // Драугр: хранитель кургана в старом очковом шлеме с ржавчиной, синие огни глаз, седая всклокоченная борода, рваный плащ.
    // На руке круглый щит с руной, а другой рукой он крепко придерживает сундук «бюро находок» — зонтик, варежка, ключи и золото
    no_draugr(K) {
      const skin = '#9fb4c6';
      let s = K.aura('#c084fc', 96, 106, 0.38);
      s += wisp(K, 22, 64, 14, -0.4) + wisp(K, 180, 50, 12, -1.2);
      // рваный плащ
      s += K.vol('M64 82 C44 110 34 146 26 176 L38 170 L46 178 L56 168 L66 178 L134 178 L144 168 L154 178 L162 170 L174 176 C166 146 156 110 136 82Z', { c1: '#3f5a6a', c2: '#0f1a22', rim: '#a5f3fc', rimK: 0.45, line: '#070d12' });
      // кольчужное тело
      const body = 'M100 84 C124 84 140 98 144 120 C148 144 150 162 148 176 H52 C50 162 52 144 56 120 C60 98 76 84 100 84Z';
      s += K.vol(body, { c1: '#9aa7b8', c2: '#2a3444', rim: '#a5f3fc', tex: false, line: '#10161f' });
      s += `<g clip-path="${clip(K, body)}" opacity=".45">` + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => K.line(`M40 ${96 + i * 9} q5 4 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0`, '#10161f', 1.2)).join('') + '</g>';
      s += K.line('M54 146 Q100 156 146 146', '#3b2412', 8) + K.line('M54 146 Q100 156 146 146', '#6b4226', 4.4) + `<rect x="94" y="147" width="12" height="10" rx="2" fill="none" stroke="#a16207" stroke-width="2.4"/>`;
      // голова
      s += K.vol(K.ell(100, 70, 20, 21), { c1: skin, c2: '#4a6172', rim: '#a5f3fc', tex: false, lw: 2.2, line: '#10161f' });
      // борода
      s += K.vol('M80 78 C78 96 86 110 92 118 L96 106 L100 122 L104 106 L108 118 C114 110 122 96 120 78 C112 88 88 88 80 78Z', { c1: '#e2e8f0', c2: '#8b95a5', tex: false, lw: 2, line: '#10161f', shadeK: 0.3 });
      s += K.line('M90 92 q-2 10 2 18 M100 92 v20 M110 92 q2 10 -2 18', '#94a3b8', 1.4);
      s += K.mouth('frown', 100, 84, 12);
      // очковый шлем с ржавчиной
      s += K.vol('M76 70 C74 46 86 34 100 34 C114 34 126 46 124 70Z', { c1: '#b8bec8', c2: '#3a3f47', rim: '#a5f3fc', tex: false, lw: 2.4, line: '#10161f' });
      s += K.line('M100 36 V66', '#3a3f47', 3) + K.line('M76 62 Q100 56 124 62', '#3a3f47', 4);
      s += `<g fill="#b45309" opacity=".75"><circle cx="86" cy="48" r="2.4"/><circle cx="112" cy="44" r="1.8"/><circle cx="118" cy="56" r="2"/><circle cx="90" cy="40" r="1.2"/></g>`;
      s += `<path d="M78 64 C78 58 98 58 98 64 C98 72 94 76 88 76 C82 76 78 72 78 64Z M102 64 C102 58 122 58 122 64 C122 72 118 76 112 76 C106 76 102 72 102 64Z" fill="#141a26" stroke="#6b7280" stroke-width="3"/>`;
      s += K.glow(88, 68, 4.4, 4.4, '#67e8f9') + K.glow(112, 68, 4.4, 4.4, '#67e8f9');
      // щит на левой руке
      s += K.vol('M62 96 C50 104 44 118 46 130 C50 136 58 134 60 128 C60 118 64 110 70 104Z', { c1: '#9aa7b8', c2: '#2a3444', tex: false, lw: 2.2, line: '#10161f' });
      s += `<circle cx="46" cy="134" r="24" fill="${K.lin(['#b45309', '#7c2d12'])}" stroke="#10161f" stroke-width="2.4"/>`;
      s += `<path d="M46 110 A24 24 0 0 1 70 134 L46 134Z M46 158 A24 24 0 0 1 22 134 L46 134Z" fill="#1e3a5f" opacity=".85"/>`;
      s += `<circle cx="46" cy="134" r="24" fill="none" stroke="#6b7280" stroke-width="3"/><circle cx="46" cy="134" r="7" fill="${K.lin(['#e2e8f0', '#475569'])}" stroke="#10161f" stroke-width="1.8"/>`;
      s += rune(34, 122, 9, 'z', '#fde68a', 1.6) + rune(58, 146, 9, 'o', '#fde68a', 1.6);
      // сундук находок
      s += P(K, 'M104 150 H164 V178 H104Z', '#8a5a2c', { line: '#2a1606', lw: 2.2 }) + K.line('M104 162 H164', '#2a1606', 1.6) + K.line('M114 150 V178 M154 150 V178', '#52330f', 3);
      s += `<rect x="129" y="158" width="10" height="9" rx="1.6" fill="#fbbf24" stroke="#78350f" stroke-width="1.4"/>`;
      s += `<path d="M112 150 C112 140 122 134 124 144" fill="none" stroke="#1e3a8a" stroke-width="3.4" stroke-linecap="round"/>` + K.line('M124 144 V150', '#1e3a8a', 3.4);
      s += P(K, 'M136 150 C134 140 140 134 146 136 C150 132 156 136 154 142 C156 146 154 150 152 150Z', '#dc2626', { line: '#7f1d1d', lw: 1.6 }) + K.line('M138 146 H152', '#fef2f2', 1.6);
      s += `<ellipse cx="160" cy="148" rx="5" ry="2.4" fill="#fbbf24" stroke="#78350f" stroke-width="1.2"/>` + K.spark(162, 142, 3.6, '#fffbe6');
      // правая рука придерживает сундук
      s += K.vol('M138 98 C150 106 156 122 154 138 C150 144 142 144 140 138 C140 126 136 116 130 108Z', { c1: '#9aa7b8', c2: '#2a3444', tex: false, lw: 2.2, line: '#10161f' });
      s += K.vol(K.ell(148, 144, 8, 7), { c1: skin, c2: '#4a6172', tex: false, lw: 2, line: '#10161f' });
      s += K.spark(170, 96, 2.6, '#e9d5ff') + K.spark(20, 170, 2.4, '#a5f3fc', 'art-float');
      return s;
    },
    // Фенрир: исполинский волк сидит под луной. Густой воротник, острые уши, янтарные глаза, клыки напоказ.
    // Его держит волшебная лента Глейпнир — тонкая, светящаяся, а на ней отпечатки кошачьих лапок (из их шума её и соткали)
    no_fenrir(K) {
      const fur = { c1: '#7b8aa3', c2: '#151d2e', rim: '#e9d5ff', rimK: 0.6, line: '#0a0f1a' };
      let s = K.aura('#c084fc', 96, 100, 0.4);
      s += `<circle cx="150" cy="40" r="22" fill="${K.rad([[0, '#fefce8'], [0.7, '#fde68a'], [1, '#fbbf24']])}" opacity=".9"/><circle cx="143" cy="34" r="4" fill="#fbbf24" opacity=".35"/><circle cx="156" cy="48" r="3" fill="#fbbf24" opacity=".35"/>`;
      // хвост
      s += K.vol('M140 176 C166 178 186 164 184 140 C182 124 170 118 162 126 C170 136 168 150 154 158 C146 162 138 166 136 172Z', { ...fur, lw: 2.2 });
      // туловище
      s += K.vol('M100 94 C132 94 150 118 152 146 C154 166 140 178 100 178 C60 178 46 166 48 146 C50 118 68 94 100 94Z', fur);
      // светлая грудь
      s += P(K, 'M76 104 C80 130 88 150 94 160 L100 152 L106 160 C112 150 120 130 124 104 Q100 112 76 104Z', '#b8c2d4', { line: '#0a0f1a', lw: 1.8 });
      s += K.line('M88 124 l4 6 l4 -6 M104 124 l4 6 l4 -6 M94 140 l6 6 l6 -6', '#6b7a94', 1.4);
      // передние лапы
      s += K.mirror(K.vol('M74 128 C72 144 72 160 74 172 C80 180 94 180 94 172 C94 158 94 142 92 130Z', { ...fur, tex: false, lw: 2.2 }) + K.line('M80 174 v5 M86 174 v5', '#0a0f1a', 1.6));
      // уши
      s += K.mirror(K.vol('M64 66 C58 48 58 30 64 16 C76 26 86 38 90 52Z', { ...fur, tex: false, lw: 2.2 }) + K.part('M66 58 C64 46 64 36 67 28 C74 36 80 44 82 52Z', '#8b6aa8', { lw: 0 }));
      // голова с щеками-вихрами
      s += K.vol('M100 42 C124 42 140 54 146 72 L156 78 L146 84 L154 94 L142 96 C138 110 124 124 100 126 C76 124 62 110 58 96 L46 94 L54 84 L44 78 L54 72 C60 54 76 42 100 42Z', fur);
      s += K.line('M92 44 l4 -6 l4 6 M100 44 l6 -5 l2 7', '#151d2e', 2);
      // морда
      s += P(K, 'M82 98 C82 86 118 86 118 98 C120 112 110 122 100 122 C90 122 80 112 82 98Z', '#aab4c6', { line: '#0a0f1a', lw: 1.8 });
      s += `<path d="M92 92 Q100 88 108 92 Q106 99 100 101 Q94 99 92 92Z" fill="#0a0f1a"/><ellipse cx="97" cy="92.4" rx="2.6" ry="1.2" fill="#fff" opacity=".5"/>` + K.line('M100 101 V106', '#0a0f1a', 1.8);
      s += K.mouth('fang', 100, 108, 18);
      // глаза
      s += `<circle class="art-blink" cx="84" cy="76" r="11" fill="${K.rad([[0, '#fde68a', 0.6], [1, '#fbbf24', 0]])}"/><circle class="art-blink" cx="116" cy="76" r="11" fill="${K.rad([[0, '#fde68a', 0.6], [1, '#fbbf24', 0]])}"/>`;
      s += K.eyes(100, 76, 16, 8.4, { iris: '#fbbf24', lid: 'angry', skin: '#2a3450', look: [0, 0.2] });
      s += K.gloss(78, 54, 7, 3.6, -35, 0.3);
      // Глейпнир: светящаяся лента на шее и лапах, конец вьётся
      const rib = 'M64 116 Q100 136 136 116 M132 120 C140 140 120 148 96 150 C74 152 66 162 82 168 C100 174 120 164 124 172 M76 166 C58 170 36 160 30 142 C26 128 40 122 44 134';
      s += K.line(rib, '#c4b5fd', 7, { op: 0.35 }) + K.line(rib, '#f5f3ff', 3) + K.line(rib, '#c4b5fd', 1, { op: 0.9 });
      // кошачьи следы на ленте
      const paw = (x, y) => `<g fill="#8b5cf6"><ellipse cx="${x}" cy="${y}" rx="2.2" ry="1.8"/><circle cx="${f(x - 2.2)}" cy="${f(y - 2.6)}" r=".9"/><circle cx="${x}" cy="${f(y - 3.2)}" r=".9"/><circle cx="${f(x + 2.2)}" cy="${f(y - 2.6)}" r=".9"/></g>`;
      s += paw(90, 128) + paw(112, 128) + paw(108, 151) + paw(40, 154) + paw(30, 138);
      s += K.spark(52, 124, 3.4, '#f5f3ff') + K.spark(138, 132, 3, '#f5f3ff') + K.spark(24, 60, 2.6, '#e9d5ff', 'art-float') + K.spark(178, 100, 2.4, '#e9d5ff', 'art-float');
      return s;
    },

    // Слейпнир: восьминогий конь Одина скачет по облакам. Серый в яблоках, голубая грива и хвост развеваются по ветру,
    // синий чепрак с золотой каймой и руной, на боку светится руна Райдо — «путь»
    no_sleipnir(K) {
      const coat = { c1: '#f8fafc', c2: '#7b8799', rim: '#eef0ff', rimK: 0.7, line: '#1e2433' };
      let s = K.aura('#a5b4fc', 98, 104, 0.42);
      s += K.line('M6 70 q12 -8 24 0 t24 0 M4 132 q10 -6 20 0 t20 0 M160 150 q8 -6 16 0 t16 0', '#e0e7ff', 2.2, { op: 0.5, cls: 'art-float' });
      // облака под копытами
      s += `<path d="${fluff(56, 172, 30, 6, 7, 1.8)}" fill="#e0e7ff" opacity=".75"/><path d="${fluff(140, 172, 32, 6, 7, 1.8)}" fill="#e0e7ff" opacity=".75"/>`;
      // ноги: дальние темнее
      const leg = (d, c, hx, hy) => K.line(d, '#1e2433', 10.5) + K.line(d, c, 7) + `<ellipse cx="${hx}" cy="${hy}" rx="5.4" ry="4" fill="#334155" stroke="#1e2433" stroke-width="1.6"/>`;
      s += leg('M56 116 L40 132 L24 140', '#9aa4b4', 22, 141) + leg('M82 124 L88 150 L86 170', '#9aa4b4', 86, 172) + leg('M122 116 L142 124 L160 120', '#9aa4b4', 162, 119) + leg('M140 120 L152 144 L156 164', '#9aa4b4', 156, 166);
      // хвост
      s += K.vol('M54 102 C38 94 22 100 8 90 C16 106 28 110 38 114 C28 118 18 124 8 122 C22 134 42 130 54 118Z', { c1: '#e0e7ff', c2: '#6366f1', rim: '#ffffff', tex: false, lw: 2, line: '#1e1b4b' });
      s += K.line('M44 104 C32 102 22 102 14 98 M44 118 C34 122 24 124 16 124', '#ffffff', 1.4, { op: 0.7 });
      // туловище
      const body = 'M58 96 C66 86 90 84 112 86 C130 88 146 96 146 112 C146 128 132 136 110 136 C92 138 70 138 58 130 C48 122 48 104 58 96Z';
      s += K.vol(body, coat);
      s += `<g fill="#ffffff" opacity=".55"><circle cx="72" cy="104" r="5"/><circle cx="84" cy="118" r="4"/><circle cx="126" cy="116" r="4.4"/><circle cx="66" cy="122" r="3.4"/><circle cx="118" cy="126" r="3"/></g>`;
      // чепрак
      s += P(K, 'M84 88 Q100 84 118 88 L116 116 Q100 120 86 116Z', '#3b5bdb', { line: '#1e1b4b', lw: 1.8 }) + K.stitch('M86 112 Q100 116 115 112', '#fde68a', 1.6) + K.line('M85 90 Q100 86 117 90', '#fde68a', 2);
      s += rune(101, 101, 12, 'o', '#fde68a', 1.6);
      s += `<circle class="art-aura" cx="68" cy="112" r="9" fill="${K.rad([[0, '#e0e7ff', 0.8], [1, '#818cf8', 0]])}"/>` + rune(68, 112, 12, 'r', '#ffffff', 1.8, '#818cf8');
      // ближние ноги
      s += leg('M60 126 L50 152 L38 166', '#e2e8f0', 36, 168) + leg('M70 128 L70 154 L66 172', '#e2e8f0', 66, 174) + leg('M122 126 L130 152 L142 164', '#e2e8f0', 144, 165) + leg('M134 126 L138 154 L132 172', '#e2e8f0', 132, 174);
      // шея
      s += K.vol('M114 100 C120 80 132 62 144 52 C154 48 164 56 162 66 C156 80 146 94 140 110Z', coat);
      // голова
      s += K.part('M144 42 L140 26 L154 36Z', '#cbd5e1', { line: '#1e2433' });
      s += K.vol('M140 44 C152 36 166 40 172 52 C178 62 184 72 182 80 C180 88 170 90 164 84 C158 78 150 70 142 64 C136 58 134 50 140 44Z', coat);
      s += `<ellipse cx="174" cy="81" rx="8" ry="6.4" transform="rotate(-30 174 81)" fill="#94a3b8" opacity=".75"/><ellipse cx="177" cy="80" rx="1.8" ry="1.2" fill="#1e2433"/>` + K.line('M168 88 Q174 88 178 85', '#1e2433', 1.6);
      s += K.eye(157, 55, 6.4, { iris: '#6366f1', look: [0.5, 0.1], lash: true });
      // грива
      s += K.vol('M146 38 C130 36 118 50 110 66 C102 80 90 88 76 90 C90 80 92 70 96 60 C102 46 120 32 146 38Z', { c1: '#e0e7ff', c2: '#6366f1', rim: '#ffffff', tex: false, lw: 2, line: '#1e1b4b' });
      s += K.part('M146 38 C140 40 136 46 136 52 C142 50 146 46 148 42Z', '#c7d2fe', { line: '#1e1b4b', lw: 1.4 });
      s += K.line('M134 42 C122 48 114 62 106 74 M122 44 C112 52 104 66 94 78', '#ffffff', 1.4, { op: 0.7 });
      s += K.spark(30, 40, 3.4, '#e0e7ff', 'art-float') + K.spark(180, 24, 3, '#ffffff') + K.spark(100, 160, 2.4, '#e0e7ff');
      return s;
    },

    // Ёрмунганд: мировой змей свернулся кольцом вокруг Мидгарда и закусил собственный хвост. Внутри кольца — крошечный мир:
    // море, остров с горами, домиками и деревом. Змей дремлет, прикрыв глаз; снизу кольцо уходит в волны фьорда
    no_jormungand(K) {
      const cx = 100, cy = 100, R = 62, pt = (a, r = R) => `${f(cx + r * Math.cos(a * Math.PI / 180))} ${f(cy + r * Math.sin(a * Math.PI / 180))}`;
      let s = K.aura('#2dd4bf', 100, 100, 0.4);
      // Мидгард внутри кольца
      const world = K.ell(100, 100, 40, 40);
      s += `<path d="${world}" fill="${K.rad([[0, '#7dd3fc'], [0.8, '#0284c7'], [1, '#075985']], 0.4, 0.35, 0.7)}" stroke="#0c4a6e" stroke-width="2"/>`;
      s += `<g clip-path="${clip(K, world)}">` + P(K, 'M60 128 C66 110 76 104 84 96 L92 84 L100 94 L108 80 L118 96 C128 104 136 116 140 128Z', '#65a30d', { line: '#1a2e05', lw: 1.8 }) +
        `<path d="M92 84 L96 90 L100 94 L96 92 L88 90Z M108 80 L113 88 L110 87 L104 88Z" fill="#fff"/>` +
        P(K, 'M78 112 H86 V120 H78Z', '#ef4444', { lw: 1.2 }) + P(K, 'M76 113 L82 106 L88 113Z', '#7f1d1d', { lw: 1.2 }) + P(K, 'M112 114 H120 V122 H112Z', '#fbbf24', { lw: 1.2 }) + P(K, 'M110 115 L116 108 L122 115Z', '#7f1d1d', { lw: 1.2 }) +
        K.line('M98 120 V106', '#5a3414', 2.4) + `<circle cx="98" cy="104" r="7" fill="${L(K, '#15803d')}" stroke="#14532d" stroke-width="1.4"/>` +
        K.line('M64 134 q6 -3 12 0 t12 0 t12 0 t12 0 t12 0 t12 0', '#e0f2fe', 1.4, { op: 0.8 }) + '</g>';
      // тело-кольцо
      const arc = `M${pt(-112)} A${R} ${R} 0 1 0 ${pt(-66)}`;
      s += K.line(arc, '#083b37', 27) + K.line(arc, '#2dd4bf', 21) + K.line(`M${pt(-112, R - 3)} A${R - 3} ${R - 3} 0 1 0 ${pt(-66, R - 3)}`, '#99f6e4', 5, { op: 0.6 });
      s += `<path d="M${pt(-112, R + 6)} A${R + 6} ${R + 6} 0 1 0 ${pt(-66, R + 6)}" fill="none" stroke="#115e59" stroke-width="1.6" stroke-dasharray="5 4"/>`;
      s += `<path d="M${pt(-112, R - 8)} A${R - 8} ${R - 8} 0 1 0 ${pt(-66, R - 8)}" fill="none" stroke="#fde047" stroke-width="4" stroke-dasharray="6 2.4" opacity=".95"/>`;
      s += `<path d="M${pt(-112, R + 13)} A${R + 13} ${R + 13} 0 1 0 ${pt(-70, R + 13)}" fill="none" stroke="#f59e0b" stroke-width="4.4" stroke-dasharray="3 7" stroke-linecap="round"/>`;
      // хвост сужается и уходит в пасть
      s += `<path d="M${pt(-112, R + 10.5)} Q${pt(-102, R + 6)} ${pt(-94, R + 1)} Q${pt(-102, R - 6)} ${pt(-112, R - 10.5)}Z" fill="#2dd4bf" stroke="#083b37" stroke-width="2.4" stroke-linejoin="round"/>`;
      // голова: смотрит влево, пасть сомкнута на хвосте, глаз сонный
      s += K.part('M122 28 l4 -9 l3 8 M131 28 l5 -8 l2 9 M112 30 l3 -8 l3 8', '#f59e0b', { line: '#7c2d12', lw: 1.4 });
      s += K.vol('M140 40 C140 28 128 24 114 26 C102 28 94 32 92 38 C92 44 100 48 112 50 C126 54 140 52 140 40Z', { c1: '#5eead4', c2: '#0f5d57', rim: '#ccfbf1', tex: false, lw: 2.4, line: '#083b37' });
      s += K.line('M94 41 Q106 44 122 44', '#083b37', 2) + `<path d="M98 41 l2 3 l2 -3 M106 42.6 l2 3 l2 -3" fill="#fff" stroke="#083b37" stroke-width=".8"/>`;
      s += `<ellipse cx="99" cy="34" rx="1.8" ry="1.2" fill="#083b37"/>`;
      s += K.eye(122, 34, 6, { iris: '#facc15', lid: 'half', skin: '#2dd4bf', look: [-0.6, 0.2] });
      s += K.gloss(126, 30, 4, 2, -20, 0.5);
      s += K.line('M146 24 l6 0 l-6 6 l6 0 M156 12 l5 0 l-5 5 l5 0', '#ccfbf1', 1.8, { op: 0.8, cls: 'art-float' });
      // волны фьорда перед нижней частью кольца
      s += `<path d="M10 168 q10 -7 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 Q192 176 186 184 Q100 192 14 184 Q8 176 10 168Z" fill="${K.lin(['#38bdf8', '#0c4a6e'])}" opacity=".85"/>`;
      s += K.line('M10 168 q10 -7 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0', '#e0f2fe', 2, { op: 0.9 }) + K.line('M40 178 q6 -4 12 0 M120 180 q6 -4 12 0', '#e0f2fe', 1.4, { op: 0.6 });
      s += `<g class="art-float"><circle cx="26" cy="150" r="3" fill="none" stroke="#e0f2fe" stroke-width="1.4"/><circle cx="176" cy="142" r="2.4" fill="none" stroke="#e0f2fe" stroke-width="1.4"/></g>`;
      s += K.spark(20, 40, 3, '#ccfbf1', 'art-float') + K.spark(178, 90, 2.6, '#ffffff') + K.spark(26, 100, 2.4, '#ccfbf1');
      return s;
    },

    // Локи: бог хитрости и огня. Рыжие волосы полыхают, как пламя, одна бровь лукаво приподнята, на губах — ухмылка.
    // Зелёный кафтан с золотой каймой, в поднятой ладони пляшет огонёк, в другой руке — рыболовная сеть (её придумал Локи),
    // а рядом из брызг выпрыгивает лосось — его любимое обличье
    no_loki(K) {
      const skin = '#f5d0b0', green = { c1: '#4ade80', c2: '#14532d', rim: '#ffe29a', line: '#052e16' };
      let s = K.aura('#f97316', 94, 100, 0.42) + K.aura('#22c55e', 60, 130, 0.25);
      // лосось в прыжке
      s += K.line('M10 150 q8 -18 22 -26', '#e0f2fe', 1.6, { op: 0.6 });
      s += `<g class="art-float"><g transform="translate(32 112) rotate(-38)">` +
        P(K, 'M-17 0 L-30 -10 L-26 0 L-30 10Z', '#e0788a', { line: '#4c0519', lw: 1.4 }) + P(K, 'M-6 -7 L0 -15 L8 -8Z', '#e0788a', { line: '#4c0519', lw: 1.2 }) +
        `<path d="M-20 0 C-10 -11 12 -12 23 -2 C25 0 25 2 23 3 C12 12 -10 11 -20 0Z" fill="${K.lin(['#9fb3c8', '#f7a1b0', '#ffe4e8'])}" stroke="#4c0519" stroke-width="1.6" stroke-linejoin="round"/>` +
        K.line('M11 -7 Q8 0 11 6', '#4c0519', 1.2) + `<g fill="#475569" opacity=".6"><circle cx="-6" cy="-4" r="1"/><circle cx="0" cy="-6" r="1"/><circle cx="-11" cy="-2" r="1"/></g>` +
        `<circle cx="16" cy="-2" r="2.4" fill="#fff" stroke="${K.INK}" stroke-width=".8"/><circle cx="16.6" cy="-2" r="1.3" fill="${K.INK}"/>` + K.line('M-14 2 Q2 7 18 4', '#fff', 1.2, { op: 0.7 }) + '</g></g>';
      s += `<g class="art-float" style="animation-delay:-.6s" fill="#7dd3fc"><circle cx="54" cy="96" r="2"/><circle cx="12" cy="100" r="1.6"/><circle cx="8" cy="136" r="1.8"/></g>`;
      // плащ
      s += K.vol('M68 86 C50 112 42 150 36 176 C80 182 120 182 164 176 C158 150 150 112 132 86Z', { c1: '#166534', c2: '#022c16', rim: '#fbbf24', rimK: 0.45, line: '#021a0d' });
      s += K.line('M38 172 C80 178 120 178 162 172', '#fbbf24', 2.4);
      // кафтан
      const body = 'M100 84 C118 84 130 96 134 116 C138 140 140 160 138 176 H62 C60 160 62 140 66 116 C70 96 82 84 100 84Z';
      s += K.vol(body, green);
      s += K.line('M100 88 V176', '#052e16', 1.6, { op: 0.6 }) + K.line('M84 92 L100 112 L116 92', '#fbbf24', 3) + K.stitch('M63 168 H137', '#fbbf24', 2);
      s += K.line('M66 138 Q100 146 134 138', '#713f12', 6) + K.line('M66 138 Q100 146 134 138', '#eab308', 3);
      s += `<path d="M94 140 C94 136 106 136 106 140 C106 146 94 146 94 140Z" fill="#eab308" stroke="#713f12" stroke-width="1.4"/>` + K.line('M96 141 q2 -3 4 0 q2 3 4 0', '#713f12', 1.2);
      // левая рука с сетью
      s += K.vol('M70 96 C58 104 50 118 50 132 C54 138 62 136 64 130 C66 120 70 110 76 104Z', green);
      s += K.part(K.ell(56, 134, 6.5, 6), skin, { line: '#7a4a2a', lw: 1.6 });
      s += `<g transform="rotate(-10 48 152)">` + `<path d="M40 138 L62 138 L58 168 L44 168Z" fill="#fef3c7" opacity=".25" stroke="#d6b88a" stroke-width="1.6"/>` +
        K.line('M40 138 L58 168 M47 138 L60 158 M54 138 L62 148 M62 138 L44 168 M55 138 L42 158 M48 138 L41 148', '#d6b88a', 1.1) + '</g>';
      // правая рука поднята с огоньком
      s += K.vol('M130 96 C142 92 152 84 156 74 C162 72 168 78 166 84 C160 96 148 106 134 110Z', green);
      s += K.part(K.ell(160, 76, 7, 6.5), skin, { line: '#7a4a2a', lw: 1.6 });
      s += `<circle class="art-aura" cx="160" cy="60" r="20" fill="${K.rad([[0, '#fff3b0', 0.9], [0.4, '#fb923c', 0.5], [1, '#f97316', 0]])}"/>`;
      s += K.flame(160, 72, 30, 18, '#fff3b0', '#f97316');
      // пламенные волосы
      s += K.flame(76, 64, 34, 20, '#ffb020', '#c2330f', { style: 'animation-delay:-.4s' }) + K.flame(124, 64, 34, 20, '#ffb020', '#c2330f', { style: 'animation-delay:-.9s' });
      s += K.flame(86, 50, 38, 22, '#ffd23f', '#e8431a', { style: 'animation-delay:-1.2s' }) + K.flame(114, 50, 38, 22, '#ffd23f', '#e8431a', { style: 'animation-delay:-.2s' }) + K.flame(100, 46, 42, 24, '#fff0a0', '#f97316');
      s += K.vol('M80 76 C74 94 76 106 70 116 C80 114 84 104 84 92Z', { c1: '#fb923c', c2: '#9a2a0c', tex: false, lw: 1.8, line: '#4a0f06' });
      s += K.vol('M120 76 C126 94 124 106 130 116 C120 114 116 104 116 92Z', { c1: '#fb923c', c2: '#9a2a0c', tex: false, lw: 1.8, line: '#4a0f06' });
      // лицо
      s += K.vol(K.ell(100, 68, 18, 20), { c1: skin, c2: '#d8946a', rim: '#fff3d6', tex: false, hiK: 0.18, lw: 2.2, line: '#7a4a2a' });
      s += K.part('M82 64 C80 50 90 44 100 44 C112 44 122 50 118 64 C114 56 108 52 100 54 C92 52 86 56 82 64Z', '#ea580c', { line: '#7c2d12', lw: 1.8 });
      // лукавые глаза: одна бровь выше
      s += K.eyes(100, 69, 8, 5.4, { iris: '#22c55e', look: [0.7, 0.1], lash: true });
      s += K.line('M85 58 Q90 53 96 59', '#9a3412', 2.4) + K.line('M104 62 Q110 61 116 58', '#9a3412', 2.4);
      s += K.line('M91 80 Q100 84 110 77', K.INK, 2.2) + K.line('M109 75 q3 1 2 4', K.INK, 1.4);
      s += K.part('M96 86 Q100 94 104 86 Q100 88 96 86Z', '#ea580c', { line: '#7c2d12', lw: 1.2 });
      s += K.blush(88, 76, 3.6) + K.blush(112, 76, 3.6);
      s += K.spark(176, 40, 3, '#fff3b0', 'art-float') + K.spark(140, 30, 2.6, '#ffd166') + K.spark(180, 120, 2.6, '#86efac', 'art-float');
      return s;
    },

    // Фрейя: богиня любви и весны. Золотые косы, венок из цветов, на груди сияет ожерелье Брисингамен.
    // За плечами раскинут плащ из соколиных перьев, у ног сидят её кошки, что возят колесницу, а вокруг распускаются цветы
    no_freya(K) {
      const skin = '#fbe0c8', gold = '#fbbf24';
      let s = K.aura('#f472b6', 94, 100, 0.38) + K.aura('#84cc16', 64, 140, 0.28);
      // соколиный плащ-крылья
      const feather = (a, len, c) => `<g transform="translate(86 98) rotate(${a})">` + P(K, `M0 0 C${f(len * 0.3)} -9 ${f(len * 0.75)} -9 ${len} 0 C${f(len * 0.75)} 8 ${f(len * 0.3)} 8 0 0Z`, c, { line: '#3b1d0c', lw: 1.6 }) +
        K.line(`M4 0 H${f(len - 4)}`, '#5a3414', 1.2, { op: 0.8 }) + K.line([0.35, 0.5, 0.65, 0.8].map(k => `M${f(len * k)} -6 l3 12`).join(' '), '#6b3a15', 2, { op: 0.55 }) + '</g>';
      const wing = `<g class="art-wing">` + feather(152, 50, '#e8c48e') + feather(168, 64, '#c9955a') + feather(184, 74, '#e8c48e') + feather(200, 74, '#c9955a') + feather(216, 64, '#e8c48e') + feather(232, 50, '#c9955a') +
        K.vol(K.ell(80, 100, 16, 12), { c1: '#e8c48e', c2: '#8a5a2c', rim: '#fde68a', tex: false, lw: 1.8, line: '#3b1d0c' }) + K.line('M70 96 q6 4 12 0 M72 104 q6 4 12 0', '#6b3a15', 1.4, { op: 0.6 }) + '</g>';
      s += K.mirror(wing);
      // волосы сзади
      s += K.vol('M76 50 C62 64 62 96 68 118 L132 118 C138 96 138 64 124 50 C116 42 84 42 76 50Z', { c1: '#fde68a', c2: '#b7791f', rim: '#fff6c2', tex: false, lw: 2, line: '#713f12' });
      // платье
      const dress = 'M100 88 C116 88 126 100 130 118 C136 142 146 160 150 176 C120 182 80 182 50 176 C54 160 64 142 70 118 C74 100 84 88 100 88Z';
      s += K.vol(dress, { c1: '#6ee7a0', c2: '#166534', rim: '#fde68a', line: '#052e16' });
      s += K.line('M52 170 Q100 180 148 170', gold, 4) + K.stitch('M52 170 Q100 180 148 170', '#fef3c7', 1.4);
      s += K.line('M100 100 V174', '#fde68a', 2, { op: 0.6 });
      const bloom = (x, y, c, r = 3.2) => `<g fill="${c}" stroke="${K.shade(c, -0.45)}" stroke-width=".7">${[0, 72, 144, 216, 288].map(a => `<circle cx="${f(x + r * 0.7 * Math.cos(a * Math.PI / 180))}" cy="${f(y + r * 0.7 * Math.sin(a * Math.PI / 180))}" r="${f(r * 0.6)}"/>`).join('')}</g><circle cx="${x}" cy="${y}" r="${f(r * 0.35)}" fill="#fde68a"/>`;
      s += bloom(80, 150, '#f9a8d4') + bloom(120, 150, '#f9a8d4') + bloom(100, 132, '#fef9c3') + bloom(92, 164, '#fef9c3') + bloom(110, 166, '#f9a8d4');
      // руки: правая держит цветущую ветку
      s += K.vol('M76 98 C66 108 62 122 64 134 C68 138 74 136 76 132 C76 122 80 112 84 106Z', { c1: '#6ee7a0', c2: '#166534', tex: false, lw: 2, line: '#052e16' });
      s += K.part(K.ell(70, 136, 6, 5.6), skin, { line: '#9a6a4a', lw: 1.5 });
      s += K.vol('M124 98 C134 104 142 112 146 122 C144 128 138 128 134 124 C130 116 126 110 118 106Z', { c1: '#6ee7a0', c2: '#166534', tex: false, lw: 2, line: '#052e16' });
      s += K.line('M144 124 C150 112 156 104 164 98', '#65a30d', 2) + bloom(164, 96, '#f472b6', 4) + bloom(156, 104, '#fef9c3', 3) + K.leaf(150, 114, 9, -30, '#65a30d');
      s += K.part(K.ell(143, 124, 6, 5.6), skin, { line: '#9a6a4a', lw: 1.5 });
      // Брисингамен
      for (let i = 0; i < 9; i++) { const a = (20 + i * 17.5) * Math.PI / 180; s += `<circle cx="${f(100 + 17 * Math.cos(a))}" cy="${f(90 + 9 * Math.sin(a))}" r="2.2" fill="#f59e0b" stroke="#78350f" stroke-width=".8"/>`; }
      s += `<circle class="art-aura" cx="100" cy="104" r="10" fill="${K.rad([[0, '#fff7cc', 0.9], [1, gold, 0]])}"/>` + K.rhomb(100, 104, 5.4, gold, '#78350f') + `<circle cx="100" cy="104" r="2" fill="#f97316"/>`;
      // лицо
      s += K.vol(K.ell(100, 66, 17, 19), { c1: skin, c2: '#e8b48a', rim: '#fff3d6', tex: false, hiK: 0.18, lw: 2.2, line: '#8a5a3a' });
      s += K.part('M83 64 C82 50 90 46 100 46 C110 46 118 50 117 64 C112 56 106 54 100 55 C94 54 88 56 83 64Z', '#fcd34d', { line: '#8a4a08', lw: 1.6 });
      // косы
      const braid = x => [0, 1, 2, 3, 4].map(i => `<ellipse cx="${x}" cy="${86 + i * 9}" rx="5.4" ry="5.6" fill="${L(K, '#fcd34d')}" stroke="#8a4a08" stroke-width="1.4"/>`).join('') + K.line(`M${x} 128 l-3 8 M${x} 128 l0 9 M${x} 128 l3 8`, '#fcd34d', 2);
      s += braid(80) + braid(120) + `<circle cx="80" cy="126" r="2.6" fill="#16a34a"/><circle cx="120" cy="126" r="2.6" fill="#16a34a"/>`;
      // венок
      for (let a = -165; a <= -15; a += 15) { const t = a * Math.PI / 180; s += K.leaf(f(100 + 20 * Math.cos(t)), f(56 + 14 * Math.sin(t)), 8, a + 60, '#4d7c0f'); }
      s += bloom(84, 48, '#f9a8d4', 4) + bloom(100, 42, '#fef9c3', 4.6) + bloom(116, 48, '#f9a8d4', 4) + bloom(92, 44, '#c4b5fd', 3) + bloom(108, 44, '#c4b5fd', 3);
      s += K.eyes(100, 68, 8, 5.6, { iris: '#0ea5e9', lid: 'half', skin, lash: true, look: [0, 0.3] });
      s += K.blush(88, 76, 3.8) + K.blush(112, 76, 3.8) + K.mouth('smile', 100, 78, 9);
      // кошки у ног
      const cat = (x, c1, c2, flip) => {
        let c = K.vol(`M${x - 14} 178 C${x - 16} 162 ${x - 10} 150 ${x} 150 C${x + 10} 150 ${x + 16} 162 ${x + 14} 178Z`, { c1, c2, rim: '#fde68a', tex: false, lw: 2, line: '#1f2937' });
        c += K.line(`M${x + 12} 176 C${x + 26} 178 ${x + 28} 164 ${x + 20} 160`, c2, 4.4);
        c += K.part(`M${x - 11} 138 L${x - 12} 124 L${x - 3} 132Z M${x + 11} 138 L${x + 12} 124 L${x + 3} 132Z`, c1, { line: '#1f2937', lw: 1.6 });
        c += K.vol(K.ell(x, 140, 12, 10), { c1, c2, rim: '#fde68a', tex: false, lw: 2, line: '#1f2937' });
        c += K.line(`M${x - 4} 132 l1 4 M${x} 131 v4 M${x + 4} 132 l-1 4 M${x - 8} 158 q8 3 16 0 M${x - 9} 166 q9 3 18 0`, c2, 1.4, { op: 0.8 });
        c += K.eyes(x, 140, 4.6, 3.4, { iris: '#84cc16', look: [0, 0.2] }) + K.mouth('cat', x, 145, 5) + K.line(`M${x - 6} 143 l-7 -1 M${x + 6} 143 l7 -1`, '#1f2937', 0.9);
        return flip ? `<g transform="translate(${2 * x} 0) scale(-1 1)">${c}</g>` : c;
      };
      s += cat(36, '#b8c0cc', '#4b5563', true) + cat(164, '#e7d3b8', '#8a6a44', false);
      s += bloom(20, 176, '#f472b6', 3.6) + bloom(58, 178, '#fde68a', 3) + bloom(182, 176, '#c4b5fd', 3.6);
      s += K.spark(28, 40, 3, '#fbcfe8', 'art-float') + K.spark(172, 44, 3, '#fef9c3') + K.spark(150, 70, 2.4, '#fbcfe8', 'art-float');
      return s;
    },

    // Тор (легенда): громовержец — рыжая борода, заплетённая в две косы с золотыми кольцами, шлем с крылышками,
    // кольчуга, красный плащ, пояс силы Мегингьёрд, железные рукавицы. Над головой поднят молот Мьёльнир с узором — в нём гремят молнии
    no_thor(K) {
      const skin = '#f3c9a4', mail = { c1: '#b6c2d2', c2: '#28324a', rim: '#fde047', line: '#0f1522', tex: false }, iron = { c1: '#8792a6', c2: '#1f2735', rim: '#fde047', tex: false, lw: 2.2, line: '#0b0f17' };
      let s = K.aura('#facc15', 100, 96, 0.55) + K.aura('#6366f1', 70, 60, 0.3);
      // грозовая туча
      s += `<g opacity=".85">` + K.vol(fluff(52, 30, 30, 12, 8, 2.2), { c1: '#6b73a8', c2: '#23264a', tex: false, lw: 1.8, line: '#12142a', rimK: 0.4 }) + '</g>';
      s += K.line('M40 42 L34 56 L42 56 L36 70', '#fde047', 2.6, { cls: 'art-blink' });
      // плащ
      s += K.vol('M58 84 C36 110 26 150 20 178 C70 184 130 184 180 178 C174 150 164 110 142 84Z', { c1: '#ef4444', c2: '#5a0a0a', rim: '#fde047', rimK: 0.45, line: '#2a0505' });
      // кольчуга
      const body = 'M100 82 C130 82 150 96 154 120 C158 146 156 164 150 178 H50 C44 164 42 146 46 120 C50 96 70 82 100 82Z';
      s += K.vol(body, mail);
      s += `<g clip-path="${clip(K, body)}" opacity=".4">` + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => K.line(`M36 ${88 + i * 8} q4 4 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0`, '#0f1522', 1.1)).join('') + '</g>';
      s += P(K, 'M50 164 Q100 172 150 164 L152 178 H48Z', '#1e3a8a', { line: '#0f1522' }) + K.stitch('M50 168 Q100 176 150 168', '#fde047', 1.6);
      // пояс силы
      s += K.line('M46 142 Q100 156 154 142', '#713f12', 14) + K.line('M46 142 Q100 156 154 142', '#eab308', 10) + K.line('M50 139 Q100 152 150 139 M50 146 Q100 159 150 146', '#fef08a', 1.2, { op: 0.8 });
      s += `<circle cx="100" cy="149" r="8.5" fill="${K.lin(['#fef08a', '#ca8a04'])}" stroke="#713f12" stroke-width="2"/>` + rune(100, 149, 9, 't', '#713f12', 1.6);
      // левая рука — железный кулак на поясе
      s += K.vol('M52 96 C38 106 34 124 38 140 C42 146 52 146 54 140 C54 126 58 112 64 104Z', mail);
      s += K.vol(K.ell(46, 144, 10, 9), iron) + K.line('M40 140 h12 M40 145 h12', '#0b0f17', 1.2, { op: 0.7 });
      // правая рука поднята с Мьёльниром
      s += K.vol('M142 100 C154 92 162 78 162 62 C160 56 152 54 150 60 C148 74 142 86 132 94Z', mail);
      s += `<circle class="art-aura" cx="160" cy="28" r="30" fill="${K.rad([[0, '#fff7cc', 0.9], [0.4, '#fde047', 0.45], [1, '#facc15', 0]])}"/>`;
      s += K.line('M157 64 L160 36', '#3b1d0c', 7) + K.line('M157 64 L160 36', '#8a5a2c', 4) + K.line('M157.4 60 l3 -1.6 M157.8 54 l3 -1.6 M158.3 48 l3 -1.6', '#3b1d0c', 1.2);
      s += `<g transform="rotate(-8 160 26)">` + K.vol('M136 14 H184 C187 14 188 16 188 18 V36 C188 38 187 40 184 40 H136 C133 40 132 38 132 36 V18 C132 16 133 14 136 14Z', { c1: '#dfe6ef', c2: '#475569', rim: '#fde047', rimK: 0.8, tex: false, lw: 2.4, line: '#0b0f17' }) +
        K.line('M140 20 q6 7 0 14 M180 20 q-6 7 0 14 M148 27 H172', '#1e293b', 1.6) + K.line('M150 20 q10 7 20 0 M150 34 q10 -7 20 0', '#1e293b', 1.4) + `<circle cx="160" cy="27" r="3" fill="#fde047" stroke="#713f12" stroke-width="1"/>` + '</g>';
      s += K.vol(K.ell(158, 64, 10, 9), iron);
      s += K.line('M134 12 l-10 -8 M188 8 l10 -6 M190 30 l8 4', '#fde047', 2.2, { cls: 'art-blink' });
      // шлем с крылышками
      s += K.mirror(`<g class="art-wing">` + K.part('M76 52 C66 44 58 32 56 20 C62 26 66 30 70 32 C66 26 64 20 66 14 C72 22 78 34 82 44Z', '#f1f5f9', { line: '#334155', lw: 1.6 }) + '</g>');
      // лицо, волосы
      s += K.mirror(K.part('M78 60 C70 70 68 86 72 98 L84 94 C80 84 80 72 84 64Z', '#ea580c', { line: '#7c2d12', lw: 1.8 }));
      s += K.vol(K.ell(100, 66, 19, 20), { c1: skin, c2: '#d8946a', rim: '#fff3d6', tex: false, hiK: 0.18, lw: 2.2, line: '#7a4a2a' });
      s += K.vol('M78 60 C76 40 88 30 100 30 C112 30 124 40 122 60Z', { c1: '#e2e8f0', c2: '#475569', rim: '#fde047', rimK: 0.7, tex: false, lw: 2.4, line: '#0f1522' });
      s += P(K, 'M76 56 Q100 50 124 56 L124 63 Q100 57 76 63Z', '#eab308', { line: '#713f12', lw: 1.6 }) + K.rhomb(100, 56, 3.2, '#ef4444', '#713f12');
      // борода в две косы
      s += K.vol('M80 74 C78 92 86 104 94 108 L100 112 L106 108 C114 104 122 92 120 74 C112 84 88 84 80 74Z', { c1: '#fb923c', c2: '#9a3412', rim: '#fde047', tex: false, lw: 2, line: '#4a1506' });
      const braid = x => [0, 1, 2].map(i => `<ellipse cx="${x}" cy="${112 + i * 8}" rx="5" ry="5" fill="${L(K, '#f97316')}" stroke="#4a1506" stroke-width="1.4"/>`).join('') + `<rect x="${x - 5.5}" y="${f(131)}" width="11" height="5" rx="2" fill="${L(K, '#fbbf24')}" stroke="#713f12" stroke-width="1.2"/>` + K.line(`M${x} 136 l-3 6 M${x} 136 v7 M${x} 136 l3 6`, '#f97316', 2);
      s += braid(92) + braid(108);
      s += K.mirror(K.part('M100 82 C94 78 84 78 78 84 C80 88 86 88 90 86 C94 86 98 85 100 84Z', '#f97316', { line: '#4a1506', lw: 1.5 }));
      s += `<ellipse cx="100" cy="78" rx="5" ry="4" fill="#e89a78" stroke="#7a3a24" stroke-width="1.4"/>`;
      s += K.eyes(100, 68, 8.5, 5.4, { iris: '#2563eb', lid: 'angry', skin, look: [0.2, 0.1] });
      s += K.line('M84 60 L96 64 M116 60 L104 64', '#9a3412', 3);
      s += bolt(K, 22, 110, 1, -18) + bolt(K, 180, 110, 1, 18) + bolt(K, 30, 164, 0.7, 20);
      s += K.spark(186, 64, 3.4, '#fffbe6', 'art-float') + K.spark(14, 82, 2.6, '#fef08a');
      return s;
    },

    // Один (легенда): Всеотец-странник — широкополая шляпа, повязка на глазу, отданном за мудрость, второй глаз светится золотом.
    // Длинная седая борода, синий плащ с золотой каймой, брошь с руной, в руке копьё Гунгнир с рунами на наконечнике.
    // На плечах — вороны Хугин и Мунин, вокруг медленно кружат руны
    no_odin(K) {
      const skin = '#eec5a0', cloak = { c1: '#5667a8', c2: '#121838', rim: '#fde68a', rimK: 0.5, line: '#080b1c' };
      let s = K.aura('#a5b4fc', 100, 98, 0.5) + K.aura('#fbbf24', 50, 70, 0.25);
      // кружащие руны
      let rr = '';
      ['f', 'u', 'th', 'a', 'r', 'k', 'g', 'h', 'n', 'i', 's', 't'].forEach((r, i) => { const a = (i * 30 - 90) * Math.PI / 180; rr += rune(f(100 + 88 * Math.cos(a)), f(98 + 80 * Math.sin(a)), 9, r, '#e0e7ff', 1.3, '#818cf8'); });
      s += `<g class="art-spin-soft" opacity=".8">${rr}</g>`;
      // копьё Гунгнир
      s += K.line('M156 178 L156 36', '#2a1606', 7) + K.line('M156 178 L156 36', '#9a6a3a', 3.6);
      s += `<circle class="art-aura" cx="156" cy="24" r="18" fill="${K.rad([[0, '#fff7cc', 0.85], [1, '#fbbf24', 0]])}"/>`;
      s += K.vol('M156 4 C162 14 164 26 160 38 H152 C148 26 150 14 156 4Z', { c1: '#f1f5f9', c2: '#64748b', rim: '#fde68a', rimK: 0.8, tex: false, lw: 2, line: '#0f172a' });
      s += rune(156, 24, 9, 'g', '#1e40af', 1.3) + P(K, 'M148 38 H164 V43 H148Z', '#fbbf24', { line: '#78350f', lw: 1.4 });
      // плащ
      s += K.vol('M62 70 C38 100 28 146 22 178 C70 184 130 184 178 178 C172 146 162 100 138 70Z', cloak);
      s += K.line('M24 172 C70 180 130 180 176 172', '#fbbf24', 2.6) + K.stitch('M26 166 C70 174 130 174 174 166', '#fde68a', 1.4);
      // серая рубаха
      s += K.vol('M100 92 C116 92 124 104 126 124 C128 146 128 164 126 178 H74 C72 164 72 146 74 124 C76 104 84 92 100 92Z', { c1: '#cbd5e1', c2: '#475569', rim: '#fde68a', tex: false, line: '#0f172a' });
      s += K.line('M76 150 Q100 158 124 150', '#3b1d0c', 6) + K.line('M76 150 Q100 158 124 150', '#8a5a2c', 3);
      // полы плаща
      s += K.vol('M72 86 C60 112 56 144 58 178 H40 C36 140 44 106 62 78Z', cloak) + K.vol('M128 86 C140 112 144 144 142 178 H160 C164 140 156 106 138 78Z', cloak);
      // рука на копье
      s += K.vol('M136 96 C148 100 156 106 158 116 C154 122 146 122 142 118 C140 112 136 108 128 106Z', cloak);
      s += K.vol(K.ell(156, 114, 7.5, 7), { c1: skin, c2: '#b07c58', tex: false, lw: 2, line: '#6a4428' });
      // борода
      s += K.vol('M78 76 C70 100 74 128 84 146 C90 156 96 162 100 170 C104 162 110 156 116 146 C126 128 130 100 122 76 C114 88 86 88 78 76Z', { c1: '#ffffff', c2: '#b8c2d0', rim: '#fff0c0', tex: false, lw: 2.4, line: '#475569', shadeK: 0.3 });
      s += K.line('M88 100 q-4 16 2 34 M100 96 q-2 30 0 64 M112 100 q4 16 -2 34', '#a3aec0', 1.8);
      s += `<rect x="94" y="136" width="12" height="6" rx="2" fill="${L(K, '#fbbf24')}" stroke="#78350f" stroke-width="1.2"/>`;
      // брошь
      s += `<circle cx="70" cy="92" r="7" fill="${L(K, '#fbbf24')}" stroke="#78350f" stroke-width="1.6"/>` + rune(70, 92, 8, 'o', '#78350f', 1.3);
      // лицо
      s += K.vol(K.ell(100, 70, 18, 19), { c1: skin, c2: '#c98f68', rim: '#fff3d6', tex: false, hiK: 0.16, lw: 2.2, line: '#6a4428' });
      s += K.line('M90 76 q-3 4 -1 8 M110 76 q3 4 1 8', '#b07c58', 1.2, { op: 0.6 });
      // повязка и золотой глаз
      s += K.line('M80 60 L118 82', '#1f2937', 2.4) + `<ellipse cx="91" cy="71" rx="6.4" ry="5.4" fill="#1f2937" stroke="#0b0f17" stroke-width="1.4"/>`;
      s += `<circle class="art-blink" cx="110" cy="71" r="10" fill="${K.rad([[0, '#fde68a', 0.7], [1, '#fbbf24', 0]])}"/>` + K.eye(110, 71, 5.4, { iris: '#f59e0b', lid: 'half', skin, look: [-0.2, 0.2] });
      s += K.line('M84 64 Q90 61 96 64 M104 64 Q110 61 117 64', '#f8fafc', 3);
      // усы и нос
      s += K.mirror(K.part('M100 84 C92 80 82 80 76 88 C78 92 86 92 90 90 C94 88 98 87 100 86Z', '#ffffff', { line: '#475569', lw: 1.5 }));
      s += `<path d="M100 72 C104 76 106 80 104 84 C102 86 98 86 96 84 C94 80 96 76 100 72Z" fill="#d9a07a" stroke="#6a4428" stroke-width="1.4"/>`;
      // шляпа странника
      s += K.vol('M74 58 C72 38 86 24 100 24 C114 24 128 38 126 58Z', { c1: '#7c86a0', c2: '#1f2433', rim: '#fde68a', tex: false, lw: 2.4, line: '#0b0f17' });
      s += K.line('M74 52 Q100 46 126 52', '#3b1d0c', 5);
      s += K.vol('M46 62 C56 52 144 52 154 62 C150 68 132 66 100 66 C68 66 50 68 46 62Z', { c1: '#8b95ad', c2: '#1f2433', rim: '#fde68a', tex: false, lw: 2.2, line: '#0b0f17' });
      // вороны на плечах
      s += `<g transform="translate(34 30) scale(.44)">${raven(K, 0, { eye: { iris: '#fde68a' } })}</g>`;
      s += `<g transform="translate(200 0) scale(-1 1)"><g transform="translate(40 32) scale(.42)">${raven(K, 0, { eye: { iris: '#fde68a', lid: 'half', skin: '#2c3850' } })}</g></g>`;
      s += K.spark(20, 40, 3, '#fde68a', 'art-float') + K.spark(184, 150, 2.6, '#e0e7ff') + K.spark(26, 150, 2.6, '#e0e7ff', 'art-float');
      return s;
    },
    // --- конец ---
  });

  // ===== расширение до 63 видов: новые духи, чудовища и боги =====
  Object.assign(SPIRIT_ART, {
    // Искрёнок: искорка из огненного Муспельхейма — круглый огненный колобок с хохолком из трёх языков пламени,
    // большими глазами и румянцем. В ладошках бережёт звёздочку (из таких искр боги сделали звёзды), вокруг мерцают искры
    no_iskryonok(K) {
      const hand = { c1: '#ffd27a', c2: '#e05a14', rim: '#ffe29a', tex: false, lw: 2, line: '#6b1d06' };
      let s = K.aura('#ff9a3d', 92, 118, 0.5);
      s += ember(K, 26, 76, 5, -0.2) + ember(K, 174, 70, 5.6, -0.9) + ember(K, 22, 138, 4, -1.4) + ember(K, 178, 132, 4.4, -0.5) + ember(K, 150, 32, 3.6, -1.1) + ember(K, 50, 36, 3.2, -0.7);
      // хохолок пламени
      s += K.flame(76, 96, 36, 26, '#ffd23f', '#e8431a', { style: 'animation-delay:-.5s' }) + K.flame(124, 96, 36, 26, '#ffd23f', '#e8431a', { style: 'animation-delay:-1s' });
      s += K.flame(100, 90, 64, 46, '#fff3b0', '#f97316');
      // ножки-угольки
      s += K.mirror(K.vol(K.ell(80, 172, 13, 8), { c1: '#ffb347', c2: '#b4380f', rim: '#ffe29a', tex: false, lw: 2.2, line: '#5a1a06' }));
      // тельце-огонёк
      const body = 'M100 82 C138 82 154 108 154 134 C154 160 132 178 100 178 C68 178 46 160 46 134 C46 108 62 82 100 82Z';
      s += K.vol(body, { c1: '#ffc65a', c2: '#e8480f', rim: '#ffe29a', rimK: 0.7, line: '#6b1d06' });
      s += `<ellipse cx="100" cy="150" rx="30" ry="22" fill="${K.rad([[0, '#fff7d6', 0.7], [1, '#ffd166', 0]])}"/>`;
      s += K.line('M56 120 q-5 -10 3 -19 M144 120 q5 -10 -3 -19', '#fff3b0', 2.4, { op: 0.7 });
      s += K.gloss(72, 102, 10, 5.5, -35, 0.5);
      // мордочка
      s += K.eyes(100, 122, 19, 12.5, { iris: '#c2410c', look: [0.1, 0.25] });
      s += K.blush(69, 140, 7.5) + K.blush(131, 140, 7.5);
      s += K.mouth('open', 100, 139, 12);
      // ручки со звёздочкой
      s += K.mirror(K.vol('M50 132 C42 146 50 164 72 168 C80 168 86 164 86 158 C76 158 64 152 60 138Z', hand));
      s += `<circle class="art-aura" cx="100" cy="162" r="19" fill="${K.rad([[0, '#fffbe6', 0.95], [0.5, '#fde047', 0.5], [1, '#fde047', 0]])}"/>`;
      s += `<path d="${star5(100, 162, 11.5, 0.48)}" fill="${K.lin(['#fffbe6', '#fde047', '#f59e0b'])}" stroke="#92400e" stroke-width="1.8" stroke-linejoin="round"/>`;
      s += K.mirror(K.part(K.ell(85, 161, 6.5, 6), '#ffd27a', { line: '#6b1d06', lw: 1.6 }));
      return s;
    },

    // Муспель: подросший Искрёнок — юный огненный великан. Тело из раскалённой магмы в пластинах тёмного базальта
    // со светящимися швами, грива и бородка из пламени, обсидиановые рожки. Хвастается мускулами, кулаки пылают,
    // а под ногами тает снег — лужица, пар и капли
    no_muspel(K) {
      const rock = '#3a2a26', magma = { c1: '#ffc06a', c2: '#c2410c', rim: '#ffe29a', line: '#3b0d04' };
      let s = K.aura('#ff9a3d', 96, 110, 0.48);
      s += ember(K, 30, 40, 4.4, -0.6) + ember(K, 172, 30, 4, -1.3) + ember(K, 184, 100, 3.4, -0.2);
      // талый снег: лужица, пар, капли и снежинки
      s += `<ellipse cx="100" cy="176" rx="72" ry="8" fill="${K.lin(['#bae6fd', '#38bdf8'])}" opacity=".8" stroke="#0c4a6e" stroke-width="1.4"/>`;
      s += K.line('M38 166 C32 156 42 150 36 140 M162 166 C168 156 158 150 164 140', '#ffffff', 2.4, { op: 0.6, cls: 'art-float' });
      s += flake(20, 118, 6, '#e0f2fe') + flake(182, 128, 5, '#e0f2fe', '');
      s += `<path class="art-float" d="M24 150 q-3 5 0 7 q3 -2 0 -7Z M176 152 q-3 5 0 7 q3 -2 0 -7Z" fill="#7dd3fc" stroke="#0c4a6e" stroke-width="1"/>`;
      // ноги
      s += K.mirror(K.vol('M68 136 H94 V170 Q81 178 68 170Z', { ...magma, tex: false, lw: 2.2 }) + P(K, 'M64 164 H96 V174 Q80 180 64 174Z', rock, { line: '#140806', lw: 1.8 }));
      // туловище в базальтовых пластинах со светящимися швами
      const body = 'M100 86 C134 86 152 106 154 130 C156 152 144 166 100 168 C56 166 44 152 46 130 C48 106 66 86 100 86Z';
      s += K.vol(body, magma);
      s += `<g clip-path="${clip(K, body)}">` + P(K, 'M48 100 L78 94 L84 118 L54 126Z M122 94 L152 100 L146 126 L116 118Z M68 134 L96 126 L98 152 L70 158Z M104 126 L132 134 L130 158 L102 152Z M82 160 H118 L114 172 H86Z', rock, { line: '#140806', lw: 1.6 }) + '</g>';
      s += K.line('M84 118 L96 126 L98 152 M116 118 L104 126 L102 152 M70 158 L82 160 M130 158 L118 160', '#fde047', 1.8, { op: 0.9, cls: 'art-blink' });
      // руки: показывает мускулы, кулаки пылают
      s += K.mirror(limb(K, 'M56 108 Q28 112 30 84', '#f97316', 17, '#3b0d04') + P(K, 'M36 100 L48 98 L50 108 L38 110Z', rock, { line: '#140806', lw: 1.4 }) +
        K.flame(30, 70, 30, 20, '#fff3b0', '#f97316', { style: 'animation-delay:-.7s' }) + K.vol(K.ell(30, 80, 12, 11), { ...magma, tex: false, lw: 2.2 }));
      // грива из пламени и обсидиановые рожки
      s += K.flame(100, 60, 52, 42, '#fff3b0', '#f97316') + K.flame(72, 66, 36, 28, '#ffd23f', '#e8431a', { style: 'animation-delay:-.4s' }) + K.flame(128, 66, 36, 28, '#ffd23f', '#e8431a', { style: 'animation-delay:-.9s' }) +
        K.flame(60, 82, 24, 18, '#ffd23f', '#c2330f', { style: 'animation-delay:-1.2s' }) + K.flame(140, 82, 24, 18, '#ffd23f', '#c2330f', { style: 'animation-delay:-.2s' });
      s += K.mirror(K.part('M80 62 C68 56 64 44 68 32 C74 42 80 48 90 52Z', rock, { line: '#140806', lw: 1.8 }) + K.line('M71 44 C73 50 77 54 83 56', '#a8a29e', 1.4, { op: 0.7 }));
      // голова
      s += K.vol(K.ell(100, 80, 30, 27), magma);
      s += P(K, 'M80 62 L92 57 L91 66 L82 69Z M108 57 L120 62 L118 69 L109 66Z', rock, { line: '#140806', lw: 1.2 });
      // бородка-пламя, сердитые брови, зубастая ухмылка
      s += `<g transform="rotate(180 100 104)">${K.flame(100, 104, 24, 30, '#ffd23f', '#e8431a', { style: 'animation-delay:-.3s' })}</g>`;
      s += K.eyes(100, 82, 13, 8.8, { iris: '#facc15', lid: 'angry', skin: '#e2621c', look: [0, 0.2] });
      s += K.mouth('teeth', 100, 95, 20);
      s += K.gloss(78, 70, 5, 3, -35, 0.4);
      return s;
    },

    // Логи: сам огонь в облике великана — тело из языков пламени, корона из огня, раскалённые добела глаза и широкая ухмылка.
    // Держит деревянное корыто, у которого уже откушен угол, — тот самый спор с Локи «кто больше съест»; по подолу пляшет пламя
    no_logi(K) {
      const flameV = { c1: '#ffc35a', c2: '#e2521a', rim: '#ffe29a', rimK: 0.7, tex: false, lw: 2.2, line: '#4a1004' };
      let s = K.aura('#ff9a3d', 100, 100, 0.55) + K.aura('#fde047', 60, 70, 0.32);
      s += ember(K, 22, 40, 5, -0.3) + ember(K, 180, 34, 5.4, -1.2) + ember(K, 14, 96, 4, -0.8) + ember(K, 188, 92, 4, -0.4);
      // языки пламени за спиной — огненный силуэт великана
      [[40, 172, 66, 36, -0.3], [160, 172, 66, 36, -1], [50, 134, 72, 38, -0.7], [150, 134, 72, 38, -0.1], [70, 106, 64, 34, -1.2], [130, 106, 64, 34, -0.5]].forEach(([x, y, h, w, d]) => { s += K.flame(x, y, h, w, '#ffd23f', '#e8431a', { style: `animation-delay:${d}s` }); });
      // огненное тело
      const body = 'M100 86 C128 86 146 102 152 126 C158 150 162 166 168 178 H32 C38 166 42 150 48 126 C54 102 72 86 100 86Z';
      s += K.vol(body, { c1: '#ffd46a', c2: '#d9380c', rim: '#ffe29a', rimK: 0.7, line: '#4a1004' });
      s += `<ellipse cx="100" cy="140" rx="40" ry="36" fill="${K.rad([[0, '#fff7d6', 0.85], [0.55, '#ffd166', 0.4], [1, '#ffd166', 0]])}"/>`;
      s += K.line('M70 120 q-6 -12 2 -22 M130 120 q6 -12 -2 -22 M86 164 q-4 -10 2 -18 M114 164 q4 -10 -2 -18', '#fff3b0', 2.4, { op: 0.7 });
      // пламя по подолу
      [[38, 22, -0.2], [62, 28, -0.9], [86, 24, -0.5], [114, 24, -1.3], [138, 28, -0.4], [162, 22, -1]].forEach(([x, h, d]) => { s += K.flame(x, 182, h, f(h * 0.8), '#fff3b0', '#f97316', { style: `animation-delay:${d}s` }); });
      // руки
      s += limb(K, 'M64 102 C44 112 44 130 56 142', '#f97316', 14, '#4a1004') + limb(K, 'M136 102 C158 112 156 132 138 146', '#f97316', 14, '#4a1004');
      // корыто с откушенным углом: щепки сыплются, край обуглен и горит
      let tr = P(K, 'M58 122 H116 A9 9 0 0 0 127 130 A8 8 0 0 0 136 140 L132 152 H64Z', '#b07a42', { line: '#3b1d0c', lw: 2.2 });
      tr += K.line('M60 123 H116', '#5a3414', 3) + K.line('M62 132 H127 M63 142 H133', '#5a3414', 1.4, { op: 0.7 });
      tr += K.line('M116 122 A9 9 0 0 0 127 130 A8 8 0 0 0 136 140', '#1c0a04', 2.6);
      tr += K.flame(124, 130, 13, 9, '#fff3b0', '#f97316', { style: 'animation-delay:-.6s' }) + K.flame(133, 140, 11, 8, '#fff3b0', '#f97316', { style: 'animation-delay:-1.1s' });
      s += K.g(tr, 'rotate(-12 98 137)');
      s += `<g class="art-float" fill="#8a5a2c" stroke="#3b1d0c" stroke-width="1"><rect x="146" y="150" width="6" height="3.4" rx="1" transform="rotate(30 149 151)"/><rect x="154" y="162" width="5" height="3" rx="1" transform="rotate(-20 156 163)"/><rect x="142" y="168" width="4.4" height="3" rx="1"/></g>`;
      s += K.vol(K.ell(58, 142, 10, 9), flameV) + K.vol(K.ell(137, 146, 10, 9), flameV);
      // корона из пламени и голова
      s += K.flame(100, 50, 50, 36, '#fff3b0', '#f97316') + K.flame(79, 54, 34, 24, '#ffd23f', '#e8431a', { style: 'animation-delay:-.4s' }) + K.flame(121, 54, 34, 24, '#ffd23f', '#e8431a', { style: 'animation-delay:-.8s' });
      s += K.vol(K.ell(100, 72, 29, 27), { ...flameV, lw: 2.4 });
      s += `<ellipse cx="89" cy="70" rx="8" ry="9" fill="#5a1406"/><ellipse cx="111" cy="70" rx="8" ry="9" fill="#5a1406"/>`;
      s += K.glow(89, 70, 4.8, 5.8, '#fff3b0') + K.glow(111, 70, 4.8, 5.8, '#fff3b0');
      s += K.line('M77 57 L95 63 M123 57 L105 63', '#5a1406', 3.4);
      s += K.mouth('teeth', 100, 84, 28);
      s += K.gloss(82, 58, 6, 3.4, -35, 0.45);
      return s;
    },

    // Двергёнок: малыш-дверг из подгорных кузниц — железный шлем с кристаллом-огоньком, рыжая бородка с золотой бусиной,
    // синяя рубашка и кожаный фартук с инструментами в кармашке. Поднял крошечный молоточек — летят искры, в другой руке самоцвет
    no_dvergyonok(K) {
      const skin = '#f3c9a4', tunic = { c1: '#8fb3e0', c2: '#2b4a7a', rim: '#fff6b0', line: '#0f1e36' }, iron = { c1: '#d5dde8', c2: '#4b5563', rim: '#fff6b0', tex: false, lw: 2.4, line: '#1f2530' };
      let s = K.aura('#facc15', 90, 118, 0.42);
      // сапожки
      s += K.mirror(K.vol('M68 168 C68 162 76 160 86 162 C92 164 94 170 92 175 C90 180 70 180 68 176Z', { c1: '#8a5a34', c2: '#3b2210', rim: '#fff6b0', tex: false, lw: 2.2, line: '#1f1206' }));
      // тельце, фартук с кармашком
      const body = 'M100 106 C130 106 146 124 146 146 C146 166 130 176 100 176 C70 176 54 166 54 146 C54 124 70 106 100 106Z';
      s += K.vol(body, tunic);
      s += P(K, 'M76 126 Q100 121 124 126 L126 170 Q100 176 74 170Z', '#a0692c', { line: '#3b1d0c', lw: 2 });
      s += K.stitch('M78 130 Q100 125 122 130', '#fde68a', 1.4);
      s += K.line('M95 150 V140 M104 150 L108 141', '#cbd5e1', 2.6) + `<circle cx="108.6" cy="138.6" r="2.8" fill="none" stroke="#cbd5e1" stroke-width="2"/>`;
      s += P(K, 'M88 148 H112 V162 Q100 166 88 162Z', '#7c4a1d', { line: '#3b1d0c', lw: 1.6 });
      // левая ручка с самоцветом
      s += K.vol('M62 126 C52 132 46 142 48 152 C52 156 58 156 60 152 C60 144 64 138 70 134Z', { ...tunic, tex: false, lw: 2.2 });
      s += K.part(K.ell(54, 154, 7, 6), skin, { line: '#7a4a2a', lw: 1.6 });
      s += gem(K, 50, 143, 8, '#67e8f9', '#0e7490');
      // правая ручка с молоточком
      s += K.line('M146 116 L160 82', '#3b1d0c', 6) + K.line('M146 116 L160 82', '#c08a4a', 3.2);
      s += K.g(K.vol('M150 70 H174 C176 70 177 71 177 73 V83 C177 85 176 86 174 86 H150 C148 86 147 85 147 83 V73 C147 71 148 70 150 70Z', iron), 'rotate(22 162 78)');
      s += K.vol('M138 128 C150 124 156 116 156 106 C152 100 146 100 144 106 C142 112 136 116 130 118Z', { ...tunic, tex: false, lw: 2.2 });
      s += K.part(K.ell(152, 104, 7, 6.5), skin, { line: '#7a4a2a', lw: 1.6 });
      s += K.spark(184, 62, 4.6, '#fde047') + K.spark(180, 96, 3, '#fffbe6', 'art-float') + bolt(K, 138, 58, 0.55, -20);
      // голова
      s += K.mirror(K.part(K.ell(70, 96, 5, 6.5), '#f0b890', { line: '#7a4a2a' }));
      s += K.vol(K.ell(100, 94, 30, 27), { c1: skin, c2: '#d8946a', rim: '#ffe7c0', tex: false, hiK: 0.18 });
      // железный шлем с кристаллом-огоньком
      s += gem(K, 100, 46, 7.5, '#fde047', '#854d0e');
      s += K.vol('M68 90 C66 64 82 52 100 52 C118 52 134 64 132 90 C122 85 112 83 100 83 C88 83 78 85 68 90Z', iron);
      s += P(K, 'M66 86 Q100 75 134 86 L134 93 Q100 82 66 93Z', '#6b7280', { line: '#1f2530', lw: 1.8 });
      s += `<g fill="#e5e7eb" stroke="#1f2530" stroke-width=".8"><circle cx="72" cy="88" r="1.8"/><circle cx="86" cy="83.6" r="1.8"/><circle cx="114" cy="83.6" r="1.8"/><circle cx="128" cy="88" r="1.8"/></g>`;
      s += K.gloss(82, 66, 7, 3.6, -35, 0.45);
      // лицо
      s += K.eyes(100, 98, 14, 8.6, { iris: '#2563eb', look: [0.15, 0.2] });
      s += K.blush(74, 110, 5.5) + K.blush(126, 110, 5.5);
      // рыжая бородка с косичкой и золотой бусиной
      s += K.vol('M76 108 C72 120 78 132 90 136 L100 142 L110 136 C122 132 128 120 124 108 C116 116 108 118 100 118 C92 118 84 116 76 108Z', { c1: '#fdba74', c2: '#c2410c', rim: '#fff0c0', tex: false, lw: 2, line: '#5a1a06', shadeK: 0.35 });
      s += `<ellipse cx="100" cy="146" rx="3.6" ry="4" fill="${L(K, '#f59e0b')}" stroke="#5a1a06" stroke-width="1.2"/><circle cx="100" cy="152" r="3" fill="${L(K, '#fbbf24')}" stroke="#713f12" stroke-width="1.2"/>`;
      s += K.mirror(K.part('M100 118 C94 114 85 114 80 120 C82 124 88 124 92 122 C96 122 98 121 100 120Z', '#fb923c', { line: '#5a1a06', lw: 1.5 }));
      s += `<ellipse cx="100" cy="111" rx="7" ry="6" fill="${K.rad([[0, '#ffc3a0'], [1, '#e0765a']], 0.4, 0.35, 0.7)}" stroke="#7a3a24" stroke-width="1.6"/><ellipse cx="97.6" cy="109" rx="2.2" ry="1.4" fill="#fff" opacity=".7"/>`;
      s += K.mouth('smile', 100, 127, 9);
      return s;
    },

    // Дверг: подгорный мастер-кузнец — железный шлем с кристаллом, рыжая борода в две косы с золотыми кольцами,
    // синяя рубаха и кожаный фартук. Над наковальней занёс молот, клещами держит раскалённый ключ — летят искры
    no_dverg(K) {
      const skin = '#f0c29a', tunic = { c1: '#86aee0', c2: '#22406e', rim: '#fff6b0', line: '#0f1e36' }, iron = { c1: '#d5dde8', c2: '#4b5563', rim: '#fff6b0', tex: false, lw: 2.4, line: '#1f2530' };
      let s = K.aura('#facc15', 96, 106, 0.45);
      // тело и фартук
      const body = 'M100 84 C132 84 150 102 152 126 C154 148 150 166 146 176 H54 C50 166 46 148 48 126 C50 102 68 84 100 84Z';
      s += K.vol(body, tunic);
      s += P(K, 'M72 108 Q100 102 128 108 L134 176 H66Z', '#a0692c', { line: '#3b1d0c', lw: 2 }) + K.line('M72 108 L66 92 M128 108 L134 92', '#3b1d0c', 3);
      // молот занесён над головой
      s += K.line('M144 80 L160 30', '#3b1d0c', 7.5) + K.line('M144 80 L160 30', '#a0692c', 4);
      s += K.g(K.vol('M146 18 H178 C181 18 182 20 182 22 V36 C182 38 181 40 178 40 H146 C143 40 142 38 142 36 V22 C142 20 143 18 146 18Z', iron) + K.line('M150 22 V36 M174 22 V36', '#1f2530', 1.4, { op: 0.6 }), 'rotate(18 162 29)');
      s += limb(K, 'M134 104 Q162 100 152 70', '#5a86c4', 15, '#0f1e36');
      s += K.vol(K.ell(151, 67, 9.5, 9), { c1: skin, c2: '#c98060', rim: '#fff3d6', tex: false, lw: 2, line: '#6a4428' });
      s += K.spark(188, 50, 4, '#fde047') + K.spark(132, 22, 3, '#fffbe6', 'art-float');
      // голова и шлем
      s += K.mirror(K.part(K.ell(76, 68, 5, 6.5), '#e8a880', { line: '#7a4a2a' }));
      s += K.vol(K.ell(100, 66, 25, 23), { c1: skin, c2: '#d0906a', rim: '#ffe7c0', tex: false, hiK: 0.18 });
      s += gem(K, 100, 30, 7, '#fde047', '#854d0e');
      s += K.vol('M74 64 C72 42 86 32 100 32 C114 32 128 42 126 64 C118 60 110 58 100 58 C90 58 82 60 74 64Z', iron);
      s += P(K, 'M72 60 Q100 51 128 60 L128 67 Q100 58 72 67Z', '#6b7280', { line: '#1f2530', lw: 1.6 });
      s += `<g fill="#e5e7eb" stroke="#1f2530" stroke-width=".8"><circle cx="78" cy="61.6" r="1.6"/><circle cx="92" cy="58" r="1.6"/><circle cx="108" cy="58" r="1.6"/><circle cx="122" cy="61.6" r="1.6"/></g>`;
      // сосредоточенные глаза, нос, рыжая борода в две косы
      s += K.eyes(100, 73, 10, 6.8, { iris: '#1d4ed8', lid: 'angry', skin, look: [0.2, 0.6] });
      const beard = { c1: '#fdba74', c2: '#c2410c', rim: '#fff0c0', tex: false, lw: 2, line: '#5a1a06', shadeK: 0.35 };
      s += K.vol('M80 78 C76 94 82 106 92 110 L100 114 L108 110 C118 106 124 94 120 78 C112 88 88 88 80 78Z', beard);
      s += plait(K, 91, 114, 4, 7, 9.4, '#f59e0b', '#5a1a06') + plait(K, 109, 114, 4, 7, 9.4, '#f59e0b', '#5a1a06');
      s += K.mirror(K.part('M100 89 C94 85 84 85 79 91 C81 95 87 95 91 93 C95 93 98 92 100 91Z', '#fb923c', { line: '#5a1a06', lw: 1.5 }));
      s += `<ellipse cx="100" cy="83" rx="6" ry="5.2" fill="${K.rad([[0, '#ffc3a0'], [1, '#e0765a']], 0.4, 0.35, 0.7)}" stroke="#7a3a24" stroke-width="1.5"/>`;
      // наковальня
      const anvil = 'M58 140 H138 C150 140 164 142 178 148 C164 150 150 152 138 152 H126 L120 162 V166 H134 V178 H62 V166 H76 V162 L70 152 H58 C54 152 54 140 58 140Z';
      s += K.vol(anvil, { c1: '#9aa3b2', c2: '#1f2530', rim: '#fff6b0', tex: false, lw: 2.4, line: '#0b0f17' });
      s += K.line('M60 143 H136', '#e5e7eb', 1.6, { op: 0.6 });
      // раскалённый ключ и искры
      s += `<circle class="art-aura" cx="106" cy="134" r="24" fill="${K.rad([[0, '#fff3b0', 0.9], [0.4, '#fb923c', 0.5], [1, '#f97316', 0]])}"/>`;
      const key = '<circle cx="96" cy="135" r="5"/><path d="M101 135 H124 M116 135 V140 M121 135 V139"/>';
      s += `<g fill="none" stroke="#7c2d12" stroke-width="5.6" stroke-linecap="round">${key}</g><g fill="none" stroke="#fdba74" stroke-width="3" stroke-linecap="round">${key}</g>`;
      s += K.spark(132, 116, 4.4, '#fde047') + K.spark(78, 116, 3.4, '#fffbe6') + K.spark(120, 104, 2.6, '#fde047', 'art-float') + bolt(K, 172, 120, 0.7, 20) + bolt(K, 28, 104, 0.7, -15);
      // левая рука с клещами
      s += limb(K, 'M66 104 Q40 112 54 132', '#5a86c4', 15, '#0f1e36');
      s += K.line('M58 132 L92 135 M58 137 L92 139', '#1f2530', 3.4);
      s += K.vol(K.ell(55, 134, 9, 8.5), { c1: skin, c2: '#c98060', rim: '#fff3d6', tex: false, lw: 2, line: '#6a4428' });
      return s;
    },

    // Эйтри: величайший мастер двергов — седая с рыжиной борода в три косы с золотыми кольцами, шлем с золотым обручем
    // и самоцветом, плащ с меховым воротом. В руке — новенький Мьёльнир с короткой рукоятью (Локи-муха помешал ковать),
    // по молоту бегут молнии; над другой ладонью сияет кольцо Драупнир, а вокруг кружат восемь новых колечек
    no_eitri(K) {
      const skin = '#eec5a0', iron = { c1: '#d5dde8', c2: '#4b5563', rim: '#fff6b0', tex: false, lw: 2.4, line: '#1f2530' }, cloak = { c1: '#a8744c', c2: '#3a2414', rim: '#fff6b0', tex: false, lw: 2.2, line: '#140a04' };
      let s = K.aura('#facc15', 100, 98, 0.5) + K.aura('#fb923c', 64, 150, 0.32);
      // плащ
      s += K.vol('M100 72 C136 72 160 90 166 116 C172 142 174 162 178 178 H22 C26 162 28 142 34 116 C40 90 64 72 100 72Z', { c1: '#8a5a3a', c2: '#2a1a0e', rim: '#fff6b0', line: '#140a04' });
      s += K.stitch('M28 172 Q100 182 172 172', '#fbbf24', 2);
      // рубаха, фартук, пояс
      s += K.vol('M100 90 C120 90 132 102 134 124 C136 148 136 164 134 178 H66 C64 164 64 148 66 124 C68 102 80 90 100 90Z', { c1: '#7fa6d8', c2: '#22406e', rim: '#fff6b0', tex: false, line: '#0f1e36' });
      s += P(K, 'M74 120 Q100 114 126 120 L130 178 H70Z', '#9a6430', { line: '#3b1d0c', lw: 2 });
      s += K.line('M66 138 Q100 146 134 138', '#3b1d0c', 8) + K.line('M66 138 Q100 146 134 138', '#7c4a1d', 4.6);
      // меховой ворот
      s += K.vol(fluff(100, 90, 36, 10, 12, 1.6), { c1: '#f5f5f4', c2: '#8a8178', rim: '#fff6b0', tex: false, lw: 2, line: '#292524', shadeK: 0.3 });
      // левая рука: над ладонью — кольцо Драупнир и восемь новых колечек
      s += K.vol('M66 98 C52 102 42 108 38 118 C42 124 50 124 54 118 C56 112 62 108 72 106Z', cloak);
      s += K.vol(K.ell(42, 120, 9, 7.5), { c1: skin, c2: '#c98f68', tex: false, lw: 2, line: '#6a4428' });
      s += `<circle class="art-aura" cx="40" cy="90" r="24" fill="${RG(K, 'gold', [[0, '#fffbe6', 0.95], [0.45, '#fde047', 0.5], [1, '#facc15', 0]])}"/>`;
      s += `<circle cx="40" cy="90" r="10.5" fill="none" stroke="#713f12" stroke-width="7.4"/><circle cx="40" cy="90" r="10.5" fill="none" stroke="${K.lin(['#fef9c3', '#facc15', '#a16207'])}" stroke-width="4.6"/><path d="M31.6 84.6 A10.5 10.5 0 0 1 40 79.5" fill="none" stroke="#fff" stroke-width="1.6" opacity=".85"/>`;
      let rings = '';
      for (let i = 0; i < 8; i++) { const a = (i * 45 - 90) * Math.PI / 180, x = f(40 + 22 * Math.cos(a)), y = f(90 + 22 * Math.sin(a)); rings += `<circle cx="${x}" cy="${y}" r="3.4" fill="none" stroke="#713f12" stroke-width="2.8"/><circle cx="${x}" cy="${y}" r="3.4" fill="none" stroke="#fde047" stroke-width="1.5"/>`; }
      s += `<g class="art-spin-soft">${rings}</g>`;
      // правая рука с Мьёльниром
      s += K.vol('M134 98 C150 102 160 112 162 124 C158 130 150 130 146 124 C144 116 138 110 128 106Z', cloak);
      s += K.line('M158 148 V110', '#3b1d0c', 8) + K.line('M158 148 V110', '#8a5a2c', 4.6) + K.line('M155 132 l6 3 M155 138 l6 3 M155 144 l6 3', '#3b1d0c', 1.3);
      s += `<circle cx="158" cy="152" r="4" fill="none" stroke="#3b1d0c" stroke-width="2.4"/>`;
      s += `<circle class="art-aura" cx="158" cy="96" r="30" fill="${RG(K, 'bolt', [[0, '#fffbe6', 0.85], [0.4, '#fde047', 0.4], [1, '#facc15', 0]])}"/>`;
      s += K.vol('M140 82 H176 C179 82 180 84 180 86 V106 C180 108 179 110 176 110 H140 C137 110 136 108 136 106 V86 C136 84 137 82 140 82Z', { c1: '#e5e9f0', c2: '#4b5563', rim: '#fde047', rimK: 0.8, tex: false, lw: 2.4, line: '#0b0f17' });
      s += K.line('M142 88 q5 8 0 16 M174 88 q-5 8 0 16 M148 96 H168', '#1e293b', 1.5) + K.line('M150 88 q8 6 16 0 M150 104 q8 -6 16 0', '#1e293b', 1.3) + `<circle cx="158" cy="96" r="3" fill="#fde047" stroke="#713f12" stroke-width="1"/>`;
      s += K.vol(K.ell(158, 124, 8.5, 8), { c1: skin, c2: '#c98f68', tex: false, lw: 2, line: '#6a4428' });
      s += K.line('M136 78 l-8 -8 l6 0 l-8 -10 M180 78 l8 -8 l-6 0 l8 -10', '#fde047', 2.4, { cls: 'art-blink' }) + bolt(K, 184, 128, 0.8, 18);
      // голова, шлем с золотым обручем
      s += K.mirror(K.part(K.ell(78, 66, 4.6, 6), '#e8b48a', { line: '#7a4a2a' }));
      s += K.vol(K.ell(100, 64, 21, 20), { c1: skin, c2: '#c98f68', rim: '#fff3d6', tex: false, hiK: 0.16, lw: 2.2, line: '#6a4428' });
      s += K.vol('M78 58 C76 38 88 28 100 28 C112 28 124 38 122 58 C114 54 108 53 100 53 C92 53 86 54 78 58Z', iron);
      s += P(K, 'M76 54 Q100 46 124 54 L124 61 Q100 53 76 61Z', '#eab308', { line: '#713f12', lw: 1.6 });
      s += gem(K, 100, 51, 5, '#67e8f9', '#0e7490');
      // мудрые глаза под седыми бровями
      s += K.eyes(100, 68, 8, 5.4, { iris: '#1d4ed8', lid: 'half', skin, look: [0, 0.2] });
      s += K.line('M84 62 Q90 59 96 62 M116 62 Q110 59 104 62', '#f8fafc', 3.2);
      // борода в три косы
      s += plait(K, 100, 146, 3, 7.4, 11, '#f1ece6', '#57534e');
      s += K.vol('M80 72 C72 96 76 120 86 136 C90 142 96 146 100 150 C104 146 110 142 114 136 C124 120 128 96 120 72 C112 82 88 82 80 72Z', { c1: '#f8fafc', c2: '#b8aa9c', rim: '#fff0c0', tex: false, lw: 2.2, line: '#57534e', shadeK: 0.3 });
      s += K.line('M88 90 q-4 16 2 34 M100 88 q-2 26 0 54 M112 90 q4 16 -2 34', '#e0a070', 2, { op: 0.85 });
      s += `<rect x="94" y="120" width="12" height="6" rx="2" fill="${L(K, '#fbbf24')}" stroke="#713f12" stroke-width="1.2"/>`;
      s += K.mirror(K.part('M100 86 C93 82 82 82 77 89 C79 93 86 93 90 91 C94 90 98 89 100 88Z', '#ffffff', { line: '#57534e', lw: 1.5 }));
      s += `<ellipse cx="100" cy="79" rx="6.4" ry="5.6" fill="${K.rad([[0, '#ffc3a0'], [1, '#d98060']], 0.4, 0.35, 0.7)}" stroke="#7a3a24" stroke-width="1.6"/>`;
      s += K.spark(178, 152, 3, '#fffbe6', 'art-float') + K.spark(22, 150, 2.8, '#fde047');
      return s;
    },

    // Медвежонок: пухлый бурый медвежонок мечтает стать берсерком — на лапе круглый деревянный щит с жёлто-красной росписью,
    // в другой лапе деревянный меч. На носу капля мёда (нашёл у кофейни), рядом горшочек с мёдом
    no_medvezhonok(K) {
      const fur = { c1: '#c8925e', c2: '#5a3418', rim: '#e4ffb0', line: '#2a1606' }, furS = { ...fur, tex: false, lw: 2.2 };
      let s = K.aura('#84cc16', 90, 120, 0.36);
      s += K.leaf(22, 176, 16, -60, '#65a30d') + K.leaf(28, 177, 13, -112, '#84cc16') + K.leaf(184, 176, 15, -120, '#65a30d');
      // горшочек с мёдом
      s += P(K, 'M150 154 C146 164 148 176 160 177 C172 176 174 164 170 154Z', '#c2712d', { line: '#4a2a10', lw: 1.8 }) + P(K, 'M147 149 H173 V155 H147Z', '#9a4a1d', { line: '#4a2a10', lw: 1.6 });
      s += `<path d="M152 151 C152 158 155 160 155 166 C155 170 159 170 159 166 C159 160 161 156 163 151Z" fill="#fbbf24" stroke="#a16207" stroke-width="1"/>`;
      // лапки
      s += K.mirror(K.vol(K.ell(78, 170, 15, 9), furS) + `<g fill="#3b2412"><ellipse cx="78" cy="172" rx="6" ry="4"/><circle cx="70" cy="166" r="2.2"/><circle cx="78" cy="164" r="2.2"/><circle cx="86" cy="166" r="2.2"/></g>`);
      // тельце и светлое брюшко
      const body = 'M100 98 C136 98 152 122 152 146 C152 166 134 178 100 178 C66 178 48 166 48 146 C48 122 64 98 100 98Z';
      s += K.vol(body, fur);
      s += `<ellipse cx="100" cy="152" rx="26" ry="21" fill="#ecc9a0" opacity=".85"/>`;
      // ушки и голова
      s += K.mirror(K.vol(K.ell(68, 62, 14, 13), furS) + `<ellipse cx="68" cy="63" rx="7.5" ry="7" fill="#e8a890"/>`);
      s += K.vol(K.ell(100, 92, 37, 31), fur);
      s += `<ellipse cx="100" cy="111" rx="18" ry="13" fill="${K.lin(['#f6e2c6', '#d9b48c'])}" stroke="#2a1606" stroke-width="1.8"/>`;
      s += `<ellipse cx="100" cy="103" rx="7.5" ry="5.4" fill="#2a1606"/><ellipse cx="97.6" cy="101.4" rx="2.6" ry="1.4" fill="#fff" opacity=".6"/>`;
      s += `<path d="M105 105 q3 4 1.4 8 q-2.4 1 -3.4 -2.6Z" fill="#fbbf24" stroke="#a16207" stroke-width=".8"/>`;
      s += K.line('M100 108 V112', '#2a1606', 1.8) + K.mouth('cat', 100, 112, 12);
      s += K.eyes(100, 88, 17, 10.5, { iris: '#7c4a1d', look: [0.15, 0.25] });
      s += K.blush(69, 106, 6.5) + K.blush(131, 106, 6.5);
      s += K.gloss(76, 74, 8, 4, -35, 0.35);
      // лапа со щитом
      s += K.vol('M60 122 C50 130 46 142 48 152 C52 156 58 156 60 152 C60 144 64 136 68 130Z', furS);
      s += vshield(K, 50, 146, 22, ['#fbbf24', '#dc2626']);
      // лапа с деревянным мечом
      s += K.line('M148 126 L166 86', '#4a2a10', 8) + K.line('M148 126 L166 86', '#e2b97e', 4.6) + K.line('M150 120 L163 92', '#fff7e6', 1.4, { op: 0.6 });
      s += K.line('M139 121 L157 129', '#4a2a10', 6.4) + K.line('M139 121 L157 129', '#a0692c', 3.2);
      s += K.vol('M136 124 C146 126 152 132 152 140 C148 146 140 146 136 142 C134 136 132 130 128 128Z', furS);
      s += K.vol(K.ell(146, 136, 8.5, 8), furS);
      return s;
    },

    // Берсерк: подросший Медвежонок — воин в «медвежьей рубахе»: на голове медвежья голова-капюшон с ушами и мордой,
    // шкура свисает плащом с когтистыми лапами. Свирепо вытаращил глаза и грызёт край щита — как шахматный берсерк с острова Льюис
    no_berserk(K) {
      const pelt = { c1: '#b07a4a', c2: '#3f2412', rim: '#e4ffb0', line: '#1f1206' }, peltS = { ...pelt, tex: false, lw: 2.2 }, skin = '#f0c29a';
      let s = K.aura('#84cc16', 96, 106, 0.34);
      // шкура-плащ и свисающие лапы с когтями
      s += K.vol('M100 44 C140 44 160 72 166 106 C172 140 176 160 180 178 H20 C24 160 28 140 34 106 C40 72 60 44 100 44Z', pelt);
      s += K.mirror(K.vol('M40 112 C30 130 28 150 32 166 C38 172 48 170 50 162 C50 148 50 132 54 116Z', peltS) + K.line('M34 168 l-2 6 M40 170 l-1 6 M46 168 l0 6', '#f5f5f4', 2.2));
      // сапоги
      s += K.mirror(P(K, 'M68 162 H94 V176 Q81 181 68 176Z', '#4b3a2a', { line: '#1f1206', lw: 1.8 }));
      // лицо и борода по бокам
      s += K.vol(K.ell(100, 84, 24, 23), { c1: skin, c2: '#c98060', rim: '#fff3d6', tex: false, hiK: 0.16, lw: 2.2, line: '#6a4428' });
      s += K.mirror(K.vol('M80 92 C70 98 66 110 70 120 C78 118 86 110 88 100Z', { c1: '#a0632e', c2: '#4a2410', tex: false, lw: 1.8, line: '#1f1206' }));
      // медвежья голова-капюшон: уши, морда, клыки над лбом
      s += K.mirror(K.vol(K.ell(68, 42, 12, 11), peltS) + `<ellipse cx="68" cy="43" rx="6" ry="5.4" fill="#6b4226"/>`);
      s += K.vol('M70 76 C64 52 80 34 100 34 C120 34 136 52 130 76 C122 70 112 68 100 68 C88 68 78 70 70 76Z', pelt);
      s += `<ellipse cx="100" cy="58" rx="14" ry="10" fill="${K.lin(['#dcb88e', '#a07850'])}" stroke="#1f1206" stroke-width="1.8"/><ellipse cx="100" cy="53" rx="6" ry="4" fill="#1f1206"/><ellipse cx="98" cy="52" rx="2" ry="1" fill="#fff" opacity=".5"/>`;
      s += K.closed(100, 46, 16, 4);
      s += K.mirror(`<path d="M78 72 l2 6 l2 -6Z M86 69.6 l1.6 5.6 l1.8 -5.6Z" fill="#fffbeb" stroke="${K.INK}" stroke-width=".8"/>`);
      // свирепые глаза и нос
      s += K.eyes(100, 82, 10.5, 7.2, { iris: '#65a30d', lid: 'angry', skin, look: [0, 0.1] });
      s += `<ellipse cx="100" cy="92" rx="4.6" ry="3.8" fill="#d98060" stroke="#7a3a24" stroke-width="1.2"/>`;
      // щит, край которого он грызёт
      s += vshield(K, 100, 142, 42, ['#f5e6c8', '#dc2626']);
      s += `<path d="M86 95 H114 V101 H86Z" fill="#fffbeb" stroke="${K.INK}" stroke-width="1.6" stroke-linejoin="round"/>` + K.line('M91 95 V101 M96 95 V101 M100 95 V101 M104 95 V101 M109 95 V101', K.INK, 1);
      s += `<path d="M88 102.6 H112 V107 H88Z" fill="#fffbeb" stroke="${K.INK}" stroke-width="1.4" stroke-linejoin="round"/>` + K.line('M94 102.6 V107 M100 102.6 V107 M106 102.6 V107', K.INK, 1);
      s += K.mirror(K.part('M100 96 C94 92 84 92 79 98 C81 102 87 102 91 100 C95 100 98 99 100 98Z', '#8a5228', { line: '#1f1206', lw: 1.5 }));
      // руки держат щит
      s += K.mirror(K.vol(K.ell(60, 134, 9, 10), { c1: skin, c2: '#c98060', tex: false, lw: 2, line: '#6a4428' }) + K.line('M56 128 h7 M55 133 h8 M56 138 h7', '#6a4428', 1.2));
      s += K.spark(30, 60, 3, '#e4ffb0', 'art-float') + K.spark(172, 52, 2.6, '#d9f99d');
      return s;
    },

    // Бёдвар Бьярки: герой конунга Хрольва Жердинки дремлет, опершись на меч, — кольчуга, медвежья накидка, ожерелье из когтей,
    // за плечом щит с той же жёлто-красной росписью. А позади встаёт на дыбы огромный светящийся дух-медведь: это он бьётся, пока хозяин спит
    no_bodvar(K) {
      const skin = '#eec5a0', mail = { c1: '#b6c2d2', c2: '#2e3a4e', rim: '#e4ffb0', tex: false, line: '#10161f' }, pelt = { c1: '#a87444', c2: '#3b2412', rim: '#e4ffb0', line: '#1f1206' };
      let s = K.aura('#84cc16', 100, 96, 0.45);
      // дух-медведь встаёт на дыбы
      const bearD = 'M100 8 C114 8 126 16 130 28 C138 20 152 22 154 32 C156 42 150 48 144 50 C152 56 158 62 162 68 C172 58 180 48 184 38 C192 40 196 50 194 60 C190 78 178 92 166 102 C170 124 172 148 170 170 H30 C28 148 30 124 34 102 C22 92 10 78 6 60 C4 50 8 40 16 38 C20 48 28 58 38 68 C42 62 48 56 56 50 C50 48 44 42 46 32 C48 22 62 20 70 28 C74 16 86 8 100 8Z';
      s += `<path class="art-aura" d="${bearD}" fill="none" stroke="#bef264" stroke-width="10" opacity=".3" stroke-linejoin="round"/>`;
      s += `<path d="${bearD}" fill="${K.rad([[0, '#ecfccb', 0.8], [0.55, '#a3e635', 0.5], [1, '#4d7c0f', 0.35]], 0.5, 0.35, 0.75)}" stroke="#ecfccb" stroke-width="2.6" stroke-linejoin="round"/>`;
      s += K.mirror(K.line('M9 44 l-4 -6 M13 40 l-2 -7 M18 38 l1 -7', '#f7fee7', 2.4) + `<ellipse cx="62" cy="30" rx="6" ry="5.4" fill="#3f6212" opacity=".55"/>` + `<ellipse cx="14" cy="50" rx="6" ry="5" fill="#3f6212" opacity=".4"/>`);
      s += K.line('M58 96 q10 8 20 4 M142 96 q-10 8 -20 4 M40 72 q8 10 18 14 M160 72 q-8 10 -18 14', '#ecfccb', 1.8, { op: 0.6 });
      s += `<ellipse cx="100" cy="44" rx="17" ry="12" fill="#f7fee7" opacity=".7" stroke="#3f6212" stroke-width="1.6"/><ellipse cx="100" cy="38" rx="7" ry="4.8" fill="#1a2e05"/><ellipse cx="98" cy="36.6" rx="2.4" ry="1.2" fill="#fff" opacity=".6"/>`;
      s += K.line('M100 43 V47 M92 49 Q100 54 108 49', '#1a2e05', 2.2);
      s += K.glow(82, 26, 5.4, 4.4, '#fef9c3') + K.glow(118, 26, 5.4, 4.4, '#fef9c3');
      s += K.line('M71 17 L89 23 M129 17 L111 23', '#1a2e05', 2.8, { op: 0.7 });
      // герой — чуть меньше и ниже, чтобы морда духа была видна
      s += `<g transform="translate(100 178) scale(.88) translate(-100 -178)">`;
      // щит за плечом
      s += vshield(K, 146, 116, 24, ['#fbbf24', '#dc2626']);
      // медвежья накидка и кольчуга
      s += K.vol('M100 82 C128 82 146 98 152 122 C158 146 160 164 162 178 H38 C40 164 42 146 48 122 C54 98 72 82 100 82Z', pelt);
      const body = 'M100 92 C118 92 130 104 132 124 C134 148 134 164 132 178 H68 C66 164 66 148 68 124 C70 104 82 92 100 92Z';
      s += K.vol(body, mail);
      s += `<g clip-path="${clip(K, body)}" opacity=".4">` + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => K.line(`M60 ${98 + i * 8} q4 4 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0`, '#10161f', 1.1)).join('') + '</g>';
      s += K.line('M68 152 Q100 160 132 152', '#3b2412', 7) + K.line('M68 152 Q100 160 132 152', '#8a5a2c', 3.6);
      // меч остриём вниз
      s += P(K, 'M95 124 H105 L104 168 L100 176 L96 168Z', '#e2e8f0', { line: '#1e293b', lw: 1.8 }) + K.line('M100 126 V166', '#94a3b8', 1.4);
      s += P(K, 'M80 116 H120 Q122 120 120 124 H80 Q78 120 80 116Z', '#eab308', { line: '#713f12', lw: 1.6 });
      s += P(K, 'M96 100 H104 V116 H96Z', '#5a3414', { line: '#1f1206', lw: 1.4 }) + `<circle cx="100" cy="98" r="5" fill="${L(K, '#fbbf24')}" stroke="#713f12" stroke-width="1.4"/>`;
      // руки на рукояти
      s += K.mirror(K.vol('M68 100 C62 108 64 116 72 118 C80 117 88 113 92 109 C86 104 78 102 68 100Z', { ...pelt, tex: false, lw: 2 }));
      s += K.vol(K.ell(100, 108, 10, 7), { c1: skin, c2: '#c98f68', tex: false, lw: 2, line: '#6a4428' });
      // голова: длинные волосы, борода, дремлет
      s += K.vol('M80 56 C74 74 74 92 80 102 L120 102 C126 92 126 74 120 56Z', { c1: '#a0632e', c2: '#3b1d0c', rim: '#e4ffb0', tex: false, lw: 2, line: '#1f1206' });
      s += K.vol(K.ell(100, 66, 18, 19), { c1: skin, c2: '#c98f68', rim: '#fff3d6', tex: false, hiK: 0.16, lw: 2.2, line: '#6a4428' });
      s += K.part('M82 62 C80 48 90 44 100 44 C110 44 120 48 118 62 C112 56 106 54 100 55 C94 54 88 56 82 62Z', '#8a5228', { line: '#3b1d0c', lw: 1.6 });
      s += K.closed(100, 68, 7.6, 4.8);
      s += K.vol('M84 74 C82 88 90 96 100 100 C110 96 118 88 116 74 C110 80 90 80 84 74Z', { c1: '#b8763a', c2: '#4a2410', tex: false, lw: 2, line: '#1f1206' });
      s += K.mirror(K.part('M100 78 C94 75 86 75 82 80 C84 83 90 83 93 81 C96 81 98 80 100 80Z', '#8a5228', { line: '#1f1206', lw: 1.3 }));
      s += `<ellipse cx="100" cy="74" rx="4.4" ry="3.6" fill="#d98a6a" stroke="#7a3a24" stroke-width="1.2"/>`;
      // ожерелье из медвежьих когтей
      for (let i = 0; i < 7; i++) { const a = (35 + i * 18.3) * Math.PI / 180, x = f(100 + 24 * Math.cos(a)), y = f(96 + 9 * Math.sin(a)); s += `<path d="M${x} ${y} l-2.2 1 l2.2 6.4 l2.2 -6.4Z" fill="#fffbeb" stroke="${K.INK}" stroke-width=".8" stroke-linejoin="round"/>`; }
      s += '</g>';
      // сон: «з-з»
      s += K.line('M130 74 l6 0 l-6 6 l6 0 M140 62 l5 0 l-5 5 l5 0', '#f7fee7', 2, { cls: 'art-float' });
      return s;
    },

    // Глам: знаменитый драугр из «Саги о Греттире» — серо-синий великан с всклокоченными седыми космами из-под мятого
    // ржавого шлема и глазами, что светятся, как луна в тучах. Сидит верхом на коньке торфяной крыши и барабанит пятками;
    // за спиной огромная луна в тучах, вокруг — синие курганные огоньки
    no_glam(K) {
      const skin = '#9fb4c6', skinV = { c1: skin, c2: '#4a6172', rim: '#a5f3fc', tex: false, lw: 2.2, line: '#10161f' };
      let s = K.aura('#c084fc', 100, 100, 0.42);
      // луна в тучах
      s += `<circle cx="146" cy="40" r="30" fill="${K.rad([[0, '#fefce8'], [0.7, '#fef3c7'], [1, '#fde68a']])}"/><circle cx="138" cy="32" r="5" fill="#fde68a" opacity=".5"/><circle cx="158" cy="50" r="4" fill="#fde68a" opacity=".5"/>`;
      s += `<path d="${fluff(170, 66, 24, 6, 6, 1.6)}" fill="#4b5563" opacity=".9"/><path d="${fluff(120, 20, 20, 5, 6, 1.4)}" fill="#4b5563" opacity=".75"/>`;
      s += wisp(K, 22, 72, 14, -0.4) + wisp(K, 30, 118, 10, -1.2) + wisp(K, 180, 110, 12, -0.8);
      // дом: фронтон с горящим окошком
      s += P(K, 'M58 178 V152 L100 128 L142 152 V178Z', '#7c5a3a', { line: '#2a1a0e', lw: 2 }) + K.line('M68 148 V178 M80 141 V178 M92 134 V178 M108 134 V178 M120 141 V178 M132 148 V178', '#3f2a18', 1.4, { op: 0.8 });
      s += `<circle cx="100" cy="162" r="7.5" fill="#fde68a" stroke="#2a1a0e" stroke-width="2"/>` + K.line('M92.5 162 H107.5 M100 154.5 V169.5', '#2a1a0e', 1.4);
      // торфяная крыша с травой и цветами
      s += P(K, 'M100 118 L8 172 L16 180 L100 132 L184 180 L192 172Z', '#4d7c0f', { line: '#1a2e05', lw: 2.2 });
      s += K.line('M22 166 l2 -5 l2 5 M42 154 l2 -5 l2 5 M62 142 l2 -5 l2 5 M136 142 l2 -5 l2 5 M156 154 l2 -5 l2 5 M176 166 l2 -5 l2 5', '#a3e635', 1.6);
      s += `<g fill="#f9a8d4"><circle cx="34" cy="160" r="2"/><circle cx="166" cy="160" r="2"/></g>`;
      // ноги свесились по скатам, пятки стучат
      s += limb(K, 'M88 122 Q70 130 56 144', '#475569', 15, '#10161f') + limb(K, 'M112 122 Q130 130 144 144', '#475569', 15, '#10161f');
      s += `<g class="art-sway"><path d="M42 140 C36 148 40 158 52 158 C62 158 64 150 58 142Z" fill="${L(K, '#4a3426')}" stroke="#140a04" stroke-width="1.8" stroke-linejoin="round"/></g>`;
      s += `<g class="art-sway" style="animation-delay:-1.4s"><path d="M158 140 C164 148 160 158 148 158 C138 158 136 150 142 142Z" fill="${L(K, '#4a3426')}" stroke="#140a04" stroke-width="1.8" stroke-linejoin="round"/></g>`;
      // рваный плащ и тело
      s += K.vol('M100 62 C126 62 142 76 146 98 C150 114 148 124 146 130 L136 124 L128 132 L118 124 L108 132 L100 124 L92 132 L82 124 L72 132 L64 124 L54 130 C52 124 50 114 54 98 C58 76 74 62 100 62Z', { c1: '#4b6577', c2: '#0f1a22', rim: '#a5f3fc', rimK: 0.45, line: '#070d12' });
      s += K.vol('M100 74 C114 74 122 86 124 100 C126 112 122 120 100 122 C78 120 74 112 76 100 C78 86 86 74 100 74Z', { c1: '#8a98a8', c2: '#2a3444', rim: '#a5f3fc', tex: false, line: '#10161f' });
      s += K.line('M78 108 Q100 116 122 108', '#3b2412', 6) + K.line('M78 108 Q100 116 122 108', '#6b4226', 3);
      // руки упёрлись в конёк
      s += limb(K, 'M66 82 Q46 106 62 136', skin, 13, '#10161f') + limb(K, 'M134 82 Q154 106 138 136', skin, 13, '#10161f');
      s += K.vol(K.ell(62, 138, 9, 8), skinV) + K.vol(K.ell(138, 138, 9, 8), skinV);
      // седые космы торчат из-под шлема
      s += K.mirror(K.part('M80 44 L64 40 L72 48 L58 50 L70 56 L60 62 L74 62 L68 70 L82 64Z', '#94a3b8', { line: '#1e293b', lw: 1.8 }));
      // голова и мятый ржавый шлем
      s += K.vol(K.ell(100, 56, 22, 22), skinV);
      s += K.vol('M78 52 C76 32 88 22 100 22 C108 22 114 26 118 30 L113 36 L121 38 C123 42 123 46 122 52Z', { c1: '#b8bec8', c2: '#3a3f47', rim: '#a5f3fc', tex: false, lw: 2.4, line: '#10161f' });
      s += K.line('M77 48 Q100 42 123 48', '#3a3f47', 4) + `<g fill="#b45309" opacity=".75"><circle cx="86" cy="34" r="2.4"/><circle cx="106" cy="29" r="1.8"/><circle cx="116" cy="44" r="2"/></g>`;
      // глаза-луны, борода, оскал
      s += K.glow(91, 58, 5.4, 5.8, '#67e8f9') + K.glow(109, 58, 5.4, 5.8, '#67e8f9');
      s += K.line('M82 50 L96 54 M118 50 L104 54', '#10161f', 3);
      s += K.vol('M82 64 C80 80 88 92 94 98 L98 90 L100 102 L102 90 L106 98 C112 92 120 80 118 64 C110 72 90 72 82 64Z', { c1: '#e2e8f0', c2: '#8b95a5', tex: false, lw: 2, line: '#10161f', shadeK: 0.3 });
      s += K.mouth('teeth', 100, 68, 16);
      return s;
    },

    // Хресвельг: великан в обличье исполинского орла сидит на скале у края неба — тёмно-сизые перья с золотыми кончиками,
    // золотой клюв, глаза светятся. Крылья раскинуты во всю ширь, на маховых перьях горят руны, от взмахов по бокам
    // закручиваются вихри — так рождаются все ветры мира
    no_hresvelg(K) {
      const fe = { c1: '#6b7a96', c2: '#0f172a', rim: '#c7d2fe', line: '#070b14' };
      let s = K.aura('#a5b4fc', 100, 98, 0.5);
      // вихри и потоки ветра
      s += K.line(swirl(24, 140, 14, 1.6, 1), '#e0e7ff', 2.4, { op: 0.75, cls: 'art-spin-soft' }) + K.line(swirl(176, 140, 14, 1.6, -1), '#e0e7ff', 2.4, { op: 0.75, cls: 'art-spin-soft' });
      s += K.line('M4 120 q10 -7 20 0 t20 0 M156 120 q10 -7 20 0 t20 0 M30 22 q8 -6 16 0 t16 0 M138 18 q8 -6 16 0 t16 0', '#c7d2fe', 2, { op: 0.6, cls: 'art-float' });
      // скала на краю неба и облака
      s += `<path d="${fluff(30, 172, 30, 6, 6, 1.8)}" fill="#e0e7ff" opacity=".8"/><path d="${fluff(170, 172, 30, 6, 6, 1.8)}" fill="#e0e7ff" opacity=".8"/>`;
      s += K.vol('M52 178 C54 164 66 156 82 158 C94 152 108 152 120 158 C136 156 148 164 150 178Z', { c1: '#9aa3b2', c2: '#2b3240', rim: '#c7d2fe', tex: false, line: '#141821' });
      // хвост веером
      s += P(K, 'M86 140 L74 170 L87 166 L93 174 L100 166 L107 174 L113 166 L126 170 L114 140Z', '#1e293b', { line: '#070b14' });
      // крылья с рунами на маховых перьях
      const wing = `<g class="art-wing">` + K.vol('M84 98 C70 78 52 56 26 36 C24 44 20 48 12 50 C20 56 20 62 10 66 C20 70 20 76 10 82 C22 84 24 90 16 98 C28 98 32 104 26 112 C40 110 46 116 42 124 C56 118 70 116 86 120Z', fe) +
        K.line('M28 50 L74 100 M22 66 L72 106 M20 82 L72 110 M28 98 L76 114', '#94a3b8', 1.4, { op: 0.55 }) +
        K.line('M14 50 l-4 1 M12 66 l-4 1 M12 82 l-4 1 M18 98 l-4 2 M28 112 l-4 3', '#fbbf24', 3) +
        `<circle cx="52" cy="72" r="9" fill="${RG(K, 'rune', [[0, '#fef9c3', 0.8], [1, '#fbbf24', 0]])}"/>` + rune(52, 72, 9, 'a', '#fde68a', 1.4) + rune(42, 92, 8, 'r', '#fde68a', 1.3) + '</g>';
      s += K.mirror(wing);
      // тело с пёстрой грудью
      const body = 'M100 74 C120 74 134 90 136 110 C138 132 126 150 100 152 C74 150 62 132 64 110 C66 90 80 74 100 74Z';
      s += K.vol(body, fe);
      s += `<g clip-path="${clip(K, body)}">` + [0, 1, 2, 3, 4].map(i => K.line(`M70 ${f(102 + i * 10)} q5 5 10 0 t10 0 t10 0 t10 0 t10 0 t10 0`, '#a5b4fc', 1.6, { op: 0.55 })).join('') + '</g>';
      // лапы с золотыми когтями
      s += K.mirror(K.line('M88 146 V156', '#b45309', 6) + K.line('M88 146 V156', '#fbbf24', 3.4) + `<path d="M78 162 C80 156 84 154 88 156 C92 154 96 156 98 162" fill="none" stroke="#451a03" stroke-width="2.4" stroke-linecap="round"/><path d="M79 162 l-1 4 M88 158 l0 5 M97 162 l1 4" stroke="#fde68a" stroke-width="2" stroke-linecap="round"/>`);
      // голова с хохолком
      s += K.mirror(K.part('M92 48 C86 44 80 40 76 32 C84 34 90 38 96 44Z', '#334155', { line: '#070b14', lw: 1.6 })) + K.part('M96 46 C94 40 96 34 100 28 C104 34 106 40 104 46Z', '#475569', { line: '#070b14', lw: 1.6 });
      s += K.vol(K.ell(100, 64, 23, 21), { ...fe, tex: false, lw: 2.4 });
      s += `<path d="M84 72 Q100 80 116 72 Q114 84 100 86 Q86 84 84 72Z" fill="#94a3b8" opacity=".5"/>`;
      // светящиеся глаза и брови
      s += K.glow(88, 60, 4.6, 4.2, '#fde68a') + K.glow(112, 60, 4.6, 4.2, '#fde68a');
      s += K.line('M78 51 L94 56 M122 51 L106 56', '#070b14', 3.4);
      // крючковатый клюв
      s += `<path d="M90 66 C94 62 106 62 110 66 C112 72 108 80 100 92 C92 80 88 72 90 66Z" fill="${K.lin(['#fde68a', '#f59e0b', '#b45309'])}" stroke="#451a03" stroke-width="2" stroke-linejoin="round"/>` + K.line('M93 72 Q100 76 107 72', '#451a03', 1.6) + K.line('M95 66 Q100 65 104 66', '#fffbeb', 1.4, { op: 0.8 });
      s += K.gloss(84, 52, 5, 2.8, -35, 0.4);
      return s;
    },

    // Ложколиз: тощий исландский йольский парень-тролль — бурая шерстяная шапка с длинной кистью в серебряной трубочке,
    // латаная куртка, красный шарф, огромные уши и длинный нос. Длинным языком облизывает деревянную поварёшку,
    // рядом в котелке над огнём пыхтит каша, а вокруг падает декабрьский снег
    no_lozhkoliz(K) {
      const skinV = { c1: '#ecd2b4', c2: '#a67c56', rim: '#ffe7c0', tex: false, lw: 2.2, line: '#5a3a22' }, wool = { c1: '#a8876a', c2: '#3f2c20', rim: '#ffe29a', tex: false, line: '#1f140c' };
      let s = K.aura('#ff9a3d', 92, 110, 0.42);
      s += flake(24, 40, 6) + flake(178, 26, 5, '#fff', '') + flake(18, 112, 4.4, '#fff', 'art-float') + flake(186, 100, 4);
      // котелок с кашей над огнём
      s += K.flame(146, 180, 18, 14, '#fff3b0', '#f97316', { style: 'animation-delay:-.4s' }) + K.flame(162, 180, 22, 15, '#ffd23f', '#e8431a') + K.flame(178, 180, 16, 12, '#fff3b0', '#f97316', { style: 'animation-delay:-.9s' });
      s += K.vol('M138 146 H186 C188 160 180 170 162 170 C144 170 136 160 138 146Z', { c1: '#6b7280', c2: '#111827', rim: '#ffe29a', tex: false, lw: 2.2, line: '#030712' });
      s += `<ellipse cx="162" cy="146" rx="24" ry="5.4" fill="${K.lin(['#fffaf0', '#f3e2b8'])}" stroke="#030712" stroke-width="2"/>`;
      s += K.line('M154 140 C150 132 158 128 154 120 M170 140 C166 132 174 128 170 120', '#fff', 2, { op: 0.6, cls: 'art-float' });
      // ноги в кожаных башмаках
      s += K.mirror(K.line('M90 160 V172', '#5a3a22', 5) + K.vol('M78 172 C78 166 86 165 94 167 C98 168 100 172 98 176 C96 179 80 179 78 176Z', { c1: '#c8a07a', c2: '#5a3a22', rim: '#ffe29a', tex: false, lw: 2, line: '#2a1a0e' }));
      // латаная шерстяная куртка
      const body = 'M100 100 C116 100 124 112 126 130 C128 148 126 160 124 166 H76 C74 160 72 148 74 130 C76 112 84 100 100 100Z';
      s += K.vol(body, wool);
      s += P(K, 'M80 140 H92 V152 H80Z', '#6b8e5a', { line: '#1f140c', lw: 1.4 }) + K.stitch('M81 141 H91 V151 H81Z', '#fde68a', 1) + P(K, 'M108 134 H118 V144 H108Z', '#8a5a3a', { line: '#1f140c', lw: 1.4 });
      s += K.line('M76 158 H124', '#2a1a0e', 1.4, { op: 0.6 });
      // красный шарф
      s += P(K, 'M76 100 Q100 110 124 100 L126 108 Q100 118 74 108Z', '#ef4444', { line: '#7f1d1d', lw: 1.6 }) + P(K, 'M110 110 L118 110 L120 130 L112 130Z', '#ef4444', { line: '#7f1d1d', lw: 1.4 }) + K.line('M113 130 v4 M116 130 v4 M119 130 v3', '#7f1d1d', 1.4);
      // поварёшка в руках
      s += K.line('M58 168 L126 94', '#4a2a10', 7) + K.line('M58 168 L126 94', '#d6a76a', 4) + K.line('M61 162 L122 96', '#fff7e6', 1.2, { op: 0.6 });
      s += `<ellipse cx="132" cy="86" rx="9" ry="12.5" transform="rotate(42 132 86)" fill="${K.lin(['#e9c48e', '#b07a42'])}" stroke="#4a2a10" stroke-width="2"/><ellipse cx="132" cy="85" rx="5.4" ry="8" transform="rotate(42 132 85)" fill="#fef3c7" stroke="#b07a42" stroke-width="1"/>`;
      s += limb(K, 'M78 112 Q60 132 70 152', '#8a6a50', 9, '#1f140c', 0.3) + limb(K, 'M122 110 Q122 124 104 118', '#8a6a50', 9, '#1f140c', 0.3);
      s += K.vol(K.ell(70, 155, 7, 6.4), skinV) + K.vol(K.ell(103, 118, 7, 6.4), skinV);
      // огромные уши и голова
      s += K.mirror(K.vol('M74 68 C60 60 48 62 42 70 C50 78 62 80 74 76Z', skinV) + `<path d="M70 70 C60 66 52 67 48 71 C54 75 62 76 70 74Z" fill="#e8a890" opacity=".7"/>`);
      s += K.vol(K.ell(100, 72, 27, 28), skinV);
      // шапка с длинной кистью в серебряной трубочке
      s += K.vol('M72 64 C68 38 84 24 100 24 C118 24 132 36 128 62 C118 56 108 54 100 54 C92 54 82 56 72 64Z', { ...wool, c1: '#8a6a50', lw: 2.4 });
      s += K.line('M118 30 C140 26 150 36 152 50', '#1f140c', 6) + K.line('M118 30 C140 26 150 36 152 50', '#8a6a50', 3.4);
      s += P(K, 'M148 48 H156 V55 H148Z', '#cbd5e1', { line: '#334155', lw: 1.2 }) + `<path d="M147 55 L157 55 L160 72 L144 72Z" fill="#1f140c"/>` + K.line('M148 57 L146 70 M152 57 V71 M156 57 L158 70', '#4b3a2a', 1);
      s += K.stitch('M74 60 Q100 50 126 58', '#ef4444', 1.8);
      // глаза косятся на поварёшку, длинный нос, язык тянется лизнуть
      s += K.eyes(100, 67, 11.5, 8, { iris: '#65a30d', look: [0.8, 0.35] });
      s += K.blush(80, 84, 5) + K.blush(120, 84, 5);
      s += K.vol('M98 70 C103 72 107 80 105 86 C103 90 98 90 96 86 C94 80 94 75 98 70Z', { ...skinV, lw: 1.8 });
      s += K.mouth('open', 104, 92, 11) + K.line('M108 97 C116 100 122 96 127 89', '#f472b6', 4.4) + K.line('M108 97 C116 100 122 96 127 89', '#fbcfe8', 1.4, { op: 0.8 });
      return s;
    },

    // Рататоск: рыжая белка с Мирового ясеня — огромный пушистый хвост, кисточки на ушах, хитрая ухмылка с двумя зубками.
    // Сидит на ветке и прижимает к груди свиток с ехидной вестью под красной печатью; вокруг — перистые листья ясеня
    no_ratatosk(K) {
      const fur = { c1: '#fbbf6a', c2: '#b4410c', rim: '#e4ffb0', line: '#3b1505' }, furS = { ...fur, tex: false, lw: 2.2 };
      let s = K.aura('#84cc16', 92, 112, 0.36);
      // ветка ясеня с листьями
      s += ashLeaf(K, 34, 164, 40, -150, '#65a30d') + ashLeaf(K, 180, 150, 34, -40, '#4d7c0f');
      s += K.vol('M0 168 C40 160 100 160 200 150 L200 166 C120 172 60 176 0 182Z', { c1: '#a07850', c2: '#3f2a18', rim: '#e4ffb0', tex: false, lw: 2.2, line: '#1f1206' });
      s += K.line('M20 173 q10 -3 20 0 M70 170 q12 -3 24 0 M132 164 q12 -3 24 0', '#2a1a0e', 1.4, { op: 0.6 });
      // пушистый хвост
      s += K.vol('M116 160 C162 160 186 122 178 84 C172 54 144 34 118 48 C134 52 148 64 150 84 C152 108 136 124 114 134Z', fur);
      s += K.line('M126 152 C154 148 170 118 166 88 C162 66 148 54 132 54', '#ffe0b0', 3, { op: 0.65 }) + K.line('M150 140 l8 4 M164 116 l9 0 M166 92 l8 -4', '#7c2d12', 1.6, { op: 0.5 });
      // тельце и брюшко
      const body = 'M100 96 C122 96 134 114 134 136 C134 156 122 168 100 168 C78 168 66 156 66 136 C66 114 78 96 100 96Z';
      s += K.vol(body, fur);
      s += `<ellipse cx="100" cy="144" rx="19" ry="21" fill="#fef3c7" opacity=".92"/>`;
      s += K.mirror(K.vol(K.ell(82, 166, 12, 6), furS));
      // ушки с кисточками и голова
      s += K.mirror(K.vol('M80 64 C74 56 74 48 77 40 C86 43 92 50 96 58Z', furS) + K.part('M77 42 C73 36 74 30 78 26 C80 31 83 35 82 41Z', '#7c2d12', { line: '#3b1505', lw: 1.2 }));
      s += K.vol(K.ell(100, 80, 29, 25), fur);
      s += `<ellipse cx="100" cy="92" rx="16" ry="11" fill="#fef3c7"/>`;
      s += K.gloss(80, 64, 6, 3, -35, 0.4);
      // хитрая мордочка
      s += K.eyes(100, 76, 14, 9.6, { iris: '#7c2d12', look: [0.3, 0.2] });
      s += K.line('M80 64 Q87 61 93 65 M120 62 Q113 60 107 64', '#7c2d12', 2.4);
      s += K.blush(76, 90, 5.5) + K.blush(124, 90, 5.5);
      s += `<ellipse cx="100" cy="88" rx="4.6" ry="3.4" fill="#3b1505"/>`;
      s += K.mouth('cat', 100, 92, 12) + `<path d="M97 95 h6 v5 h-6Z" fill="#fff" stroke="${K.INK}" stroke-width="1"/>` + K.line('M100 95 v5', K.INK, 0.8);
      // свиток с вестью под красной печатью
      s += `<g transform="rotate(-14 100 130)">` + P(K, 'M84 122 H116 V138 H84Z', '#fef3c7', { line: '#78350f', lw: 1.6 }) + `<ellipse cx="84" cy="130" rx="3.4" ry="8.4" fill="#f3d9a6" stroke="#78350f" stroke-width="1.6"/><ellipse cx="116" cy="130" rx="3.4" ry="8.4" fill="#f3d9a6" stroke="#78350f" stroke-width="1.6"/>` +
        K.line('M90 126 h18 M90 130 h14 M90 134 h16', '#92400e', 1.1) + `<circle cx="100" cy="140" r="4.4" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.2"/>` + '</g>';
      s += K.mirror(K.vol(K.ell(80, 132, 6.5, 6), furS));
      // болтает без умолку
      s += K.line('M66 70 l-8 -4 M64 78 l-9 0 M66 86 l-8 4', '#fef3c7', 2, { cls: 'art-blink' });
      return s;
    },

    // Дочь Эгира: одна из девяти дочерей морского великана — девочка-волна. Волосы — синяя волна с пенным гребнем
    // и завитком, заколка-ракушка, платье из прибоя с пенной оборкой. Машет рукой и брызгает, вокруг пузырьки, рядом прыгает рыбка
    no_dochegira(K) {
      const water = { c1: '#8fdcff', c2: '#0b5f9e', rim: '#e0f7ff', line: '#06395e' }, skin = { c1: '#f2fcff', c2: '#a7dbf0', rim: '#ffffff', tex: false, lw: 2.2, line: '#0b4a75' };
      let s = K.aura('#38bdf8', 94, 112, 0.42);
      // волосы-волна и завиток гребня с пеной
      s += K.vol('M64 122 C44 98 46 56 74 40 C96 28 124 30 140 44 C160 62 158 102 136 122Z', { ...water, c1: '#5ec8f2', c2: '#0a4f86' });
      s += K.vol('M128 40 C150 30 174 42 172 66 C170 86 148 92 140 80 C134 70 142 60 152 66 C148 54 138 50 128 54Z', { ...water, c1: '#7dd3fc', c2: '#0a4f86', tex: false, lw: 2.2 });
      s += `<path d="${fluff(100, 36, 32, 6, 9, 1.5, 180)}" fill="#ffffff" opacity=".9"/><g fill="#fff"><circle cx="158" cy="36" r="4.4"/><circle cx="168" cy="44" r="3.4"/><circle cx="149" cy="33" r="3"/></g>`;
      // платье-прибой с пенной оборкой
      const dress = 'M100 98 C116 98 126 110 130 128 C134 146 144 160 160 170 C140 178 120 176 100 178 C80 176 60 178 40 170 C56 160 66 146 70 128 C74 110 84 98 100 98Z';
      s += K.vol(dress, water);
      s += K.line('M76 140 q12 -6 24 0 t24 0 M70 156 q15 -6 30 0 t30 0', '#e0f7ff', 1.8, { op: 0.6 });
      s += K.line('M40 170 q10 -8 20 -2 t20 0 t20 0 t20 0 t20 0 t20 2', '#ffffff', 5, { op: 0.92 }) + `<g fill="#fff"><circle cx="48" cy="175" r="3"/><circle cx="76" cy="177" r="2.6"/><circle cx="124" cy="177" r="2.6"/><circle cx="152" cy="175" r="3"/></g>`;
      // руки: одна машет и брызгает, другая придерживает платье
      s += limb(K, 'M76 110 Q56 100 54 80', '#d6f3ff', 9, '#0b4a75', 0.3) + K.vol(K.ell(54, 76, 7, 6.6), skin);
      s += `<g class="art-blink" fill="#bae6fd" stroke="#0b4a75" stroke-width=".8"><path d="M44 60 q-3 5 0 7 q3 -2 0 -7Z"/><path d="M58 56 q-3 5 0 7 q3 -2 0 -7Z"/><path d="M36 72 q-3 5 0 7 q3 -2 0 -7Z"/></g>`;
      s += limb(K, 'M124 112 Q138 124 128 140', '#d6f3ff', 9, '#0b4a75', 0.3) + K.vol(K.ell(126, 142, 7, 6.6), skin);
      // лицо и чёлка-волна
      s += K.vol(K.ell(100, 80, 24, 23), skin);
      s += K.part('M76 76 C76 58 90 52 102 54 C114 52 126 60 124 76 C118 68 110 66 104 70 C98 64 86 66 76 76Z', '#38a5e0', { line: '#06395e', lw: 1.8 });
      // заколка-ракушка
      s += `<g transform="translate(80 62) rotate(-24) scale(.95)"><path d="M0 0L-4 -2C-11 -4 -12 -12 -7 -15C-3 -18 3 -18 7 -15C12 -12 11 -4 4 -2Z" fill="${K.lin(['#ffe4ec', '#f9a8d4', '#ec4899'])}" stroke="#9d174d" stroke-width="1.4" stroke-linejoin="round"/><path d="M0 -1L-8 -13M0 -1L-3 -16.5M0 -1L3 -16.5M0 -1L8 -13" stroke="#9d174d" stroke-width=".9" opacity=".6"/></g>`;
      s += K.eyes(100, 84, 10.5, 8, { iris: '#0ea5e9', look: [0.1, 0.2], lash: true });
      s += K.blush(82, 94, 5) + K.blush(118, 94, 5) + K.mouth('smile', 100, 96, 9);
      // пузырьки и рыбка
      s += bub(24, 122, 5, -0.3) + bub(178, 112, 4, -1) + bub(30, 150, 3.4, -0.6) + bub(170, 140, 3, -1.4);
      s += `<g class="art-float" style="animation-delay:-.7s"><g transform="translate(168 92) rotate(-30)"><path d="M-11 0 L-19 -6 L-17 0 L-19 6Z" fill="#fb923c" stroke="#7c2d12" stroke-width="1.2" stroke-linejoin="round"/><path d="M-12 0 C-6 -7 8 -7 13 0 C8 7 -6 7 -12 0Z" fill="${K.lin(['#fed7aa', '#fb923c', '#ea580c'])}" stroke="#7c2d12" stroke-width="1.4"/><circle cx="7" cy="-1" r="1.6" fill="${K.INK}"/></g></g>`;
      return s;
    },

    // Вардёгер: норвежский дух-двойник, что приходит раньше хозяина, — полупрозрачный сиреневый призрак в жёлтой рыбацкой
    // зюйдвестке, с пуговицами плаща. Звенит связкой ключей у двери с горящим окошком, позади — призрачные следы,
    // а часы над дверью показывают: до прихода хозяина ещё полчаса
    no_vardoger(K) {
      let s = K.aura('#c084fc', 92, 112, 0.42);
      // дверь с горящим окошком и часы над ней
      s += P(K, 'M128 72 H180 V178 H128Z', '#5b4636', { line: '#1c120a', lw: 2.2 }) + P(K, 'M134 78 H174 V178 H134Z', '#7c5a3a', { line: '#1c120a', lw: 1.6 });
      s += `<rect x="143" y="90" width="22" height="26" rx="3" fill="${K.lin(['#fff7cc', '#fbbf24'])}" stroke="#1c120a" stroke-width="2"/>` + K.line('M154 90 V116 M143 103 H165', '#1c120a', 1.6);
      s += `<circle cx="141" cy="136" r="3" fill="#fbbf24" stroke="#713f12" stroke-width="1.2"/>` + K.line('M139 152 h30 M139 166 h30', '#3f2a18', 1.4, { op: 0.6 });
      s += `<circle cx="154" cy="50" r="14" fill="#fefce8" stroke="#1c120a" stroke-width="2.4"/>` + K.line('M154 50 V61 M154 50 L161 44', '#1c120a', 2.2) + `<circle cx="154" cy="50" r="1.6" fill="#1c120a"/>` + K.line('M154 38 v2 M166 50 h-2 M154 62 v-2 M142 50 h2', '#1c120a', 1.4);
      // призрачные следы
      s += `<g fill="#c4b5fd" opacity=".55">` + [[20, 176], [36, 171], [50, 177]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="2.6"/>`).join('') + '</g>';
      // дух-двойник
      const body = 'M88 56 C112 56 126 76 126 102 L128 160 Q120 152 112 160 Q104 168 96 160 Q88 152 80 160 Q72 168 64 160 L58 150 C54 130 52 112 54 98 C56 74 66 56 88 56Z';
      s += `<g opacity=".93">` + K.vol(body, { c1: '#ece6ff', c2: '#5b3fb0', rim: '#e9d5ff', line: '#2e1065' }) + '</g>';
      s += P(K, 'M58 100 Q88 112 122 100 L123 108 Q88 120 57 108Z', '#a78bfa', { line: '#2e1065', lw: 1.4 });
      s += K.line('M90 112 V152', '#2e1065', 1.6, { op: 0.45 }) + `<g fill="#fbbf24" stroke="#713f12" stroke-width="1"><circle cx="96" cy="120" r="2.6"/><circle cx="96" cy="133" r="2.6"/><circle cx="96" cy="146" r="2.6"/></g>`;
      // рука со связкой ключей
      s += limb(K, 'M118 114 Q132 118 136 130', '#c4b5fd', 10, '#2e1065', 0.4) + K.vol(K.ell(136, 132, 6.6, 6), { c1: '#ece6ff', c2: '#7c5fd0', tex: false, lw: 1.8, line: '#2e1065' });
      s += `<circle cx="138" cy="142" r="5" fill="none" stroke="#fbbf24" stroke-width="2"/>` + K.line('M136 146 L132 158 M132 158 h-3 M133 154 h-3 M140 146 L142 158 M142 158 h3 M142 154 h2.6', '#fbbf24', 2);
      s += K.line('M120 150 l-6 2 M122 160 l-6 4 M152 146 l6 -2', '#fde68a', 1.8, { cls: 'art-blink' });
      // рыбацкая зюйдвестка
      s += K.vol('M58 60 C58 40 72 30 88 30 C104 30 116 40 118 58 C126 60 132 64 132 70 C114 74 66 74 46 70 C46 66 50 62 58 60Z', { c1: '#fde68a', c2: '#b45309', rim: '#fff7cc', tex: false, lw: 2.4, line: '#451a03' });
      s += K.line('M60 60 Q88 52 116 58', '#92400e', 2, { op: 0.6 });
      // лицо: тёмные глазки, ротик «о»
      s += `<g class="art-eyes"><ellipse cx="78" cy="88" rx="5" ry="6.6" fill="#2e1065"/><ellipse cx="98" cy="88" rx="5" ry="6.6" fill="#2e1065"/><circle cx="76.4" cy="85.4" r="1.9" fill="#fff"/><circle cx="96.4" cy="85.4" r="1.9" fill="#fff"/></g>`;
      s += K.mouth('o', 88, 97, 11);
      s += `<ellipse cx="70" cy="98" rx="5" ry="3" fill="#f0abfc" opacity=".45"/><ellipse cx="106" cy="98" rx="5" ry="3" fill="#f0abfc" opacity=".45"/>`;
      s += K.spark(28, 60, 3, '#e9d5ff', 'art-float') + K.spark(24, 120, 2.4, '#e9d5ff');
      return s;
    },

    // Гуллинкамби: золотогребенный петух на коньке Вальхаллы, крытой щитами. Золотой гребень, красная бородка, огненно-рыжая грудь,
    // хвост из изумрудных и синих перьев дугой. Задрав голову, кукарекает навстречу рассвету — звонкие волны летят по двору
    no_gullinkambi(K) {
      const gold = { c1: '#fbbf24', c2: '#b4410c', rim: '#eef0ff', line: '#451a03' };
      let s = K.aura('#a5b4fc', 92, 108, 0.42);
      // рассвет
      s += `<circle cx="40" cy="146" r="42" fill="${K.rad([[0, '#fff7cc', 0.9], [0.5, '#fde68a', 0.45], [1, '#fbbf24', 0]])}"/>`;
      // хвост — дуги изумрудных и синих перьев
      [['M78 128 C56 116 40 92 46 62', '#047857'], ['M80 132 C52 128 30 106 30 76', '#1d4ed8'], ['M82 136 C56 140 34 128 22 104', '#0f766e'], ['M76 124 C64 104 62 80 72 58', '#4338ca']].forEach(([d, c]) => { s += K.line(d, '#0b1020', 10) + K.line(d, c, 6.4) + K.line(d, K.shade(c, 0.5), 1.6, { op: 0.7 }); });
      // крыша Вальхаллы из щитов
      const sh = (x, y, c) => `<circle cx="${x}" cy="${y}" r="14" fill="${L(K, c)}" stroke="${K.INK}" stroke-width="1.8"/><path d="M${x - 13} ${y}H${x + 13}" stroke="#7c2d12" stroke-width="1.6" opacity=".5"/><circle cx="${x}" cy="${y}" r="4" fill="${L(K, '#cbd5e1')}" stroke="${K.INK}" stroke-width="1.2"/>`;
      s += [[16, 176, '#fbbf24'], [40, 170, '#dc2626'], [64, 166, '#fbbf24'], [88, 164, '#dc2626'], [112, 164, '#fbbf24'], [136, 166, '#dc2626'], [160, 170, '#fbbf24'], [184, 176, '#dc2626']].map(([x, y, c]) => sh(x, y, c)).join('');
      // ноги на коньке
      s += K.mirror(K.line('M92 152 L90 160', '#b45309', 4.4) + K.line('M84 162 L90 159 L96 162 M90 159 V164', '#b45309', 2.6));
      // тело и крыло
      const body = 'M70 120 C70 98 88 86 108 88 C128 90 140 106 138 126 C136 146 120 156 100 156 C80 156 70 142 70 120Z';
      s += K.vol(body, gold);
      s += `<g class="art-wing">` + K.vol('M80 114 C94 104 116 106 124 120 C122 134 108 144 92 142 C84 136 78 124 80 114Z', { c1: '#f59e0b', c2: '#7c2d12', rim: '#eef0ff', tex: false, lw: 2, line: '#451a03' }) + K.line('M90 120 q12 4 26 2 M88 128 q12 4 24 2 M90 136 q10 2 18 0', '#78350f', 1.4, { op: 0.7 }) + '</g>';
      // шея и голова: кукарекает, задрав клюв
      s += K.vol('M110 98 C108 80 114 64 126 56 C134 52 142 56 144 64 C146 74 138 86 130 98Z', gold);
      s += `<circle class="art-aura" cx="134" cy="40" r="16" fill="${K.rad([[0, '#fff7cc', 0.8], [1, '#fde047', 0]])}"/>` + K.part('M120 46 C118 38 124 32 128 38 C128 30 136 28 138 34 C140 28 148 30 146 38 C152 38 152 46 146 48 C138 52 126 52 120 46Z', '#fde047', { line: '#92400e', lw: 1.8 });
      s += K.vol(K.ell(134, 56, 13, 12), gold);
      s += P(K, 'M144 52 L162 44 L148 56Z', '#fbbf24', { line: '#78350f', lw: 1.6 }) + P(K, 'M145 58 L160 61 L144 62Z', '#f59e0b', { line: '#78350f', lw: 1.4 });
      s += `<path d="M138 64 C136 72 140 78 144 76 C148 72 146 66 142 62Z" fill="${L(K, '#ef4444')}" stroke="#7f1d1d" stroke-width="1.4"/>`;
      s += K.eye(134, 52, 5.2, { iris: '#b45309', look: [0.6, -0.3] });
      // звонкое «кукареку»
      s += K.line('M166 36 q6 8 0 16 M174 30 q9 12 0 24 M182 24 q12 16 0 32', '#e0e7ff', 2.4, { cls: 'art-blink' });
      s += K.spark(150, 100, 3, '#fef9c3', 'art-float') + K.spark(178, 120, 2.6, '#ffffff');
      return s;
    },

    // Светлый альв: житель Альвхейма «прекраснее солнца на вид» — маленький сияющий альв с длинными острыми ушами,
    // светлыми волосами, что струятся вверх, как лучи, и звёздочкой во лбу. Парит в ореоле солнечных лучей и держит
    // в ладонях стеклянный фонарик с пойманным солнечным зайчиком
    no_svetlyalv(K) {
      const skin = { c1: '#fffaf0', c2: '#e8c9a0', rim: '#fff6b0', tex: false, lw: 2.2, line: '#8a5a20' };
      let s = K.aura('#facc15', 96, 100, 0.5) + K.aura('#ffffff', 52, 80, 0.35);
      let rays = '';
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, R = i % 2 ? 56 : 68; rays += `<path d="M${f(100 + 32 * Math.cos(a - 0.09))} ${f(78 + 32 * Math.sin(a - 0.09))}L${f(100 + R * Math.cos(a))} ${f(78 + R * Math.sin(a))}L${f(100 + 32 * Math.cos(a + 0.09))} ${f(78 + 32 * Math.sin(a + 0.09))}Z"/>`; }
      s += `<g class="art-spin" fill="#fde68a" stroke="#d97706" stroke-width=".8" opacity=".85">${rays}</g>`;
      let b = '';
      // ножки в остроносых башмачках
      b += K.mirror(K.line('M92 158 V168', '#8a5a20', 4) + P(K, 'M84 168 C84 164 90 163 96 165 L100 170 C96 172 86 172 84 168Z', '#fbbf24', { line: '#78350f', lw: 1.4 }));
      // туника
      const robe = 'M100 98 C114 98 122 110 124 126 C126 142 132 152 138 160 C124 166 76 166 62 160 C68 152 74 142 76 126 C78 110 86 98 100 98Z';
      b += K.vol(robe, { c1: '#ffffff', c2: '#c9a24a', rim: '#fff6b0', line: '#6b4f12' });
      b += K.line('M64 158 Q100 168 136 158', '#fbbf24', 3) + K.stitch('M66 154 Q100 163 134 154', '#f59e0b', 1.4) + K.line('M78 122 Q100 128 122 122', '#fbbf24', 3);
      // руки держат фонарик с солнечным зайчиком
      b += K.mirror(limb(K, 'M80 108 Q70 124 88 134', '#fff7e6', 8, '#7a5a18', 0.3));
      b += `<circle class="art-aura" cx="100" cy="134" r="20" fill="${K.rad([[0, '#ffffff', 0.95], [0.4, '#fde047', 0.6], [1, '#facc15', 0]])}"/>`;
      b += `<circle cx="100" cy="134" r="10" fill="${K.rad([[0, '#ffffff'], [0.6, '#fef08a'], [1, '#facc15']])}" stroke="#a16207" stroke-width="1.8"/>` + P(K, 'M94 122 H106 V125 H94Z', '#fbbf24', { line: '#78350f', lw: 1.2 }) + `<path d="${star5(100, 134, 5, 0.45)}" fill="#fff" opacity=".9"/>`;
      b += K.mirror(K.vol(K.ell(89, 134, 5.6, 5), skin));
      // длинные острые уши
      b += K.mirror(K.vol('M80 76 C66 72 50 62 40 48 C56 52 70 58 82 66Z', skin));
      // волосы-лучи струятся вверх
      b += K.vol('M76 80 C70 62 74 46 84 36 C82 46 86 52 90 54 C88 40 94 28 102 20 C102 32 106 42 110 48 C112 38 118 32 126 30 C120 40 124 54 124 80Z', { c1: '#fffbe6', c2: '#eab308', rim: '#ffffff', tex: false, lw: 2, line: '#8a5a20' });
      // голова и звёздочка во лбу
      b += K.vol(K.ell(100, 78, 23, 22), skin);
      b += K.part('M78 76 C78 62 90 56 100 57 C112 56 122 62 122 76 C116 68 108 65 100 68 C92 65 84 68 78 76Z', '#fde68a', { line: '#8a5a20', lw: 1.6 });
      b += `<path d="${star5(100, 62, 5, 0.45)}" fill="#fffbe6" stroke="#ca8a04" stroke-width="1.2"/>`;
      b += K.eyes(100, 82, 9.5, 7.6, { iris: '#ca8a04', look: [0, 0.2], lash: true });
      b += K.blush(84, 92, 4.6) + K.blush(116, 92, 4.6) + K.mouth('smile', 100, 93, 8);
      s += `<g class="art-float">${b}</g>`;
      s += K.spark(30, 50, 3.6, '#fef9c3') + K.spark(172, 44, 3.2, '#ffffff', 'art-float') + K.spark(24, 130, 2.6, '#fde047') + K.spark(178, 128, 2.8, '#fef9c3', 'art-float');
      return s;
    },

    // Айтварас: литовский дух-богач — огненный змей с головой петуха: алый гребень и бородка, золотой клюв, огненные крылышки.
    // Длинное чешуйчатое тело извивается в небе, хвост пылает, а из колец сыплются монетки — богатство хозяину
    no_aitvaras(K) {
      let s = K.aura('#ff9a3d', 96, 104, 0.5);
      s += ember(K, 22, 38, 4.4, -0.4) + ember(K, 186, 96, 4, -1.1) + ember(K, 176, 24, 3.4, -0.7);
      // пылающий хвост
      s += `<g transform="rotate(-64 48 156)">${K.flame(48, 156, 36, 24, '#fff3b0', '#f97316')}</g><g transform="rotate(-96 54 162)">${K.flame(54, 162, 24, 16, '#ffd23f', '#e8431a', { style: 'animation-delay:-.6s' })}</g>`;
      // огненный гребень вдоль спины
      [[100, 71, 0, 18], [78, 73, -25, 16], [47, 100, -80, 15], [160, 146, 80, 15], [152, 126, 50, 12]].forEach(([x, y, r, h], i) => { s += `<g transform="rotate(${r} ${x} ${y})">${K.flame(x, y, h, f(h * 0.7), '#ffd23f', '#e8431a', { style: `animation-delay:-${f(i * 0.3)}s` })}</g>`; });
      // змеиное тело: изгибы, кольца чешуи и светлое брюхо
      const bodyD = 'M126 76 C96 84 64 80 58 104 C52 126 84 132 112 132 C142 132 154 150 136 164 C118 176 78 172 52 158';
      s += K.line(bodyD, '#4a1004', 27) + K.line(bodyD, '#f26a1b', 22) + `<path d="${bodyD}" fill="none" stroke="#9a1f0a" stroke-width="22" stroke-dasharray="2 8" opacity=".3"/>` + K.line(bodyD, '#ffd27a', 7, { op: 0.85 });
      // огненное крыло
      const wingD = 'M104 86 C88 72 86 50 96 34 C102 48 108 56 116 60 C114 46 120 36 130 32 C128 50 126 68 116 84Z';
      s += `<g class="art-wing">` + K.vol(wingD, { c1: '#ffd23f', c2: '#c2330f', rim: '#ffe29a', tex: false, lw: 2.2, line: '#4a1004' }) + K.line('M104 78 C98 66 98 52 100 44 M112 76 C114 64 118 52 124 42', '#fff3b0', 1.6, { op: 0.7 }) + '</g>';
      // монетки сыплются
      s += `<g class="art-float">` + [[172, 168, 6], [186, 154, 5], [178, 140, 4.4], [160, 176, 5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${L(K, '#fbbf24')}" stroke="#78350f" stroke-width="1.4"/><path d="M${f(x - r * 0.5)} ${y}h${r}" stroke="#92400e" stroke-width="1.2"/>`).join('') + '</g>' + K.spark(182, 168, 3.4, '#fffbe6');
      // голова петуха
      s += K.part('M124 50 C120 40 126 34 131 40 C131 30 140 28 142 36 C146 30 154 32 152 42 C156 44 154 50 150 52Z', '#ef4444', { line: '#7f1d1d', lw: 1.8 });
      s += K.vol(K.ell(138, 64, 16, 15), { c1: '#ffc35a', c2: '#c2410c', rim: '#ffe29a', tex: false, lw: 2.4, line: '#4a1004' });
      s += P(K, 'M150 60 L170 64 L151 70Z', '#fde047', { line: '#78350f', lw: 1.6 }) + P(K, 'M151 70 L166 70 L150 74Z', '#f59e0b', { line: '#78350f', lw: 1.4 });
      s += `<path d="M146 76 C144 84 148 90 152 88 C156 84 154 78 150 74Z" fill="${L(K, '#ef4444')}" stroke="#7f1d1d" stroke-width="1.4"/>`;
      s += K.eye(140, 60, 5.6, { iris: '#facc15', lid: 'angry', skin: '#e2621c', look: [0.6, 0] });
      s += K.gloss(130, 56, 4, 2.2, -35, 0.5);
      return s;
    },

    // Нёкк: водяной скрипач шведских рек — юноша с длинными мокрыми бирюзовыми волосами и кувшинкой в чёлке, в накидке из тины.
    // Сидит на камне посреди речки, блаженно прикрыв глаза, и играет на скрипке; по воде круги, рядом кувшинки, над ним плывут ноты
    no_nokk(K) {
      const skin = { c1: '#e6fbf6', c2: '#8fc9bf', rim: '#ccfbf1', tex: false, lw: 2.2, line: '#134e4a' }, hair = { c1: '#5eead4', c2: '#134e4a', rim: '#ccfbf1', tex: false, lw: 2.2, line: '#042f2e' };
      const lily = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">` + [-60, -30, 0, 30, 60].map(a => `<ellipse cx="0" cy="-6" rx="3" ry="7" transform="rotate(${a})" fill="#fdf2f8" stroke="#9d4b73" stroke-width="1"/>`).join('') + '<circle r="2.6" fill="#fcd34d" stroke="#a16207" stroke-width=".8"/></g>';
      let s = K.aura('#2dd4bf', 94, 104, 0.42);
      // речка, круги по воде и кувшинки
      s += `<path d="M0 150 q12.5 -6 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 V186 H0Z" fill="${K.lin(['#5eead4', '#0f766e'])}" opacity=".85"/>`;
      s += K.line('M0 150 q12.5 -6 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0', '#ccfbf1', 2, { op: 0.9 });
      s += `<g class="art-aura"><ellipse cx="100" cy="168" rx="62" ry="7" fill="none" stroke="#ccfbf1" stroke-width="1.4" opacity=".6"/><ellipse cx="100" cy="170" rx="84" ry="10" fill="none" stroke="#ccfbf1" stroke-width="1.2" opacity=".35"/></g>`;
      const pad = (x, y, r) => `<path d="M${x} ${y}L${f(x + r * 0.2)} ${f(y - r * 0.45)}A${r} ${f(r * 0.45)} 0 1 1 ${f(x - r * 0.35)} ${f(y - r * 0.42)}Z" fill="${L(K, '#3fa34d')}" stroke="#14532d" stroke-width="1.4"/>`;
      s += pad(26, 166, 16) + pad(176, 164, 14) + lily(30, 160, 0.9);
      // камень
      s += K.vol('M54 162 C52 142 70 130 100 130 C130 130 148 142 146 162 C130 170 70 170 54 162Z', { c1: '#a3adbd', c2: '#3b4452', rim: '#ccfbf1', tex: false, line: '#1c222c' });
      s += K.line('M64 140 q12 -7 24 -2', '#4d7c0f', 4);
      // длинные мокрые волосы сзади
      s += K.vol('M80 52 C64 66 60 98 66 132 L84 132 C80 110 80 86 88 72Z', hair) + K.vol('M118 52 C134 66 138 98 132 132 L114 132 C118 110 118 86 110 72Z', hair);
      s += `<g class="art-blink" fill="#a5f3fc" stroke="#134e4a" stroke-width=".8"><path d="M66 138 q-3 5 0 7 q3 -2 0 -7Z"/><path d="M132 138 q-3 5 0 7 q3 -2 0 -7Z"/></g>`;
      // тело в накидке из тины
      const body = 'M100 84 C120 84 132 98 134 116 C136 128 134 136 132 142 H68 C66 136 64 128 66 116 C68 98 80 84 100 84Z';
      s += K.vol(body, { c1: '#5eead4', c2: '#115e59', rim: '#ccfbf1', line: '#042f2e' });
      s += K.line('M74 100 C78 116 76 130 80 140 M126 100 C122 116 124 130 120 140', '#99f6e4', 1.6, { op: 0.6 }) + K.leaf(84, 106, 12, 70, '#4d7c0f') + K.leaf(118, 114, 12, 110, '#4d7c0f');
      // голова, чёлка и кувшинка
      s += K.vol(K.ell(99, 66, 21, 21), skin);
      s += K.part('M78 62 C78 48 90 42 100 43 C112 42 122 50 120 64 C114 56 108 54 102 58 C96 52 86 54 78 62Z', '#2dd4bf', { line: '#042f2e', lw: 1.8 });
      s += lily(84, 50, 0.8);
      s += K.closed(99, 68, 8, 5, true);
      s += K.blush(86, 76, 4.4) + K.blush(112, 76, 4.4) + K.mouth('smile', 99, 78, 8);
      // смычок и правая рука
      s += K.line('M56 126 L152 90', '#3b1d0c', 3) + K.line('M58 129 L152 93', '#fef3c7', 1.2);
      s += limb(K, 'M78 96 Q62 110 70 124', '#5eead4', 9, '#042f2e', 0.3) + K.vol(K.ell(69, 124, 6.4, 6), skin);
      // скрипка на плече
      s += `<g transform="translate(120 100) rotate(58)">` + P(K, 'M0 -16 C8 -16 10 -10 8 -6 C12 -2 12 8 8 12 C6 18 -6 18 -8 12 C-12 8 -12 -2 -8 -6 C-10 -10 -8 -16 0 -16Z', '#b45309', { line: '#451a03', lw: 1.8 }) +
        K.line('M-4 -2 q-1 4 0 8 M4 -2 q1 4 0 8', '#451a03', 1.2) + P(K, 'M-2 -16 H2 V-42 H-2Z', '#1c1917', { line: '#0c0a09', lw: 1 }) + `<circle cx="0" cy="-45" r="3.4" fill="#78350f" stroke="#451a03" stroke-width="1.2"/>` + K.line('M-1 -40 V12 M1 -40 V12', '#fef3c7', 0.6) + '</g>';
      // левая рука на грифе
      s += limb(K, 'M122 94 Q138 96 148 84', '#5eead4', 9, '#042f2e', 0.3) + K.vol(K.ell(149, 82, 6.4, 6), skin);
      // ноты
      s += note(36, 70, 8, '#ccfbf1', -0.2) + note(166, 44, 9, '#99f6e4', -1) + note(40, 116, 7, '#5eead4', -0.6);
      return s;
    },

    // Кракен: норвежское морское чудище величиной с остров — розово-красный спрут с огромными добродушными глазами поднимается
    // из моря. Одним щупальцем бережно держит рыбацкую лодочку, другим — сеть, полную рыбы; вокруг пена и пузыри
    no_kraken(K) {
      const skinV = { c1: '#fda4af', c2: '#9f1239', rim: '#c8f3ff', line: '#3f0716' };
      const tent = (d, w) => limb(K, d, '#f43f5e', w, '#3f0716', 0.35) + `<path d="${d}" fill="none" stroke="#ffe4e6" stroke-width="${f(w * 0.34)}" stroke-dasharray="0.1 ${f(w * 0.72)}" stroke-linecap="round"/>`;
      let s = K.aura('#38bdf8', 96, 100, 0.42);
      // щупальца позади
      s += tent('M70 140 C46 132 28 112 30 88 C32 72 46 68 52 78', 13) + tent('M130 140 C154 132 172 112 170 88 C168 72 154 68 148 78', 13);
      // голова-мантия
      const head = 'M100 24 C134 24 150 54 148 90 C146 118 132 138 100 140 C68 138 54 118 52 90 C50 54 66 24 100 24Z';
      s += K.vol(head, skinV);
      s += `<g fill="#9f1239" opacity=".4"><circle cx="76" cy="56" r="5"/><circle cx="122" cy="48" r="4"/><circle cx="132" cy="74" r="5.4"/><circle cx="68" cy="84" r="3.4"/><circle cx="104" cy="40" r="3"/><circle cx="90" cy="66" r="2.4"/></g>`;
      s += K.gloss(78, 44, 10, 5.5, -35, 0.45);
      s += K.eyes(100, 96, 20, 12.5, { iris: '#f59e0b', look: [0.1, 0.25] });
      s += K.blush(72, 116, 6) + K.blush(128, 116, 6) + K.mouth('o', 100, 114, 14);
      // море
      s += `<path d="M0 138 q12.5 -8 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 V186 H0Z" fill="${K.lin(['#38bdf8', '#0c4a6e'])}"/>` + K.line('M0 138 q12.5 -8 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0', '#e0f2fe', 2.4);
      s += K.line('M20 162 q8 -4 16 0 M84 172 q8 -4 16 0 M150 166 q8 -4 16 0', '#e0f2fe', 1.4, { op: 0.6 });
      // щупальце с сетью, полной рыбы
      s += tent('M66 162 C44 156 30 132 34 110 C36 98 30 90 22 88', 12);
      const fish = (x, y, c, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-7 0 L-12 -4 L-11 0 L-12 4Z" fill="${c}" stroke="#1e3a5f" stroke-width="1"/><path d="M-8 0 C-4 -5 5 -5 8 0 C5 5 -4 5 -8 0Z" fill="${L(K, c)}" stroke="#1e3a5f" stroke-width="1.2"/><circle cx="4" cy="-1" r="1.2" fill="${K.INK}"/></g>`;
      s += fish(18, 104, '#fb923c', -20) + fish(28, 114, '#facc15', 15) + fish(16, 118, '#38bdf8', 5);
      s += `<path d="M8 90 C6 108 12 126 22 128 C34 126 38 108 34 90" fill="#fef3c7" fill-opacity=".15" stroke="#d6b88a" stroke-width="1.8"/>` + K.line('M10 98 L32 118 M8 108 L28 126 M14 92 L34 104 M34 98 L12 120 M32 110 L16 126 M24 90 L8 106', '#d6b88a', 1.1);
      // щупальце с лодочкой
      s += tent('M136 162 C158 154 174 128 170 98 C168 82 172 70 180 64', 12);
      s += K.line('M173 58 V30', '#5a3414', 2.2) + `<path d="M175 32 L175 54 L190 52Z" fill="${L(K, '#f8fafc')}" stroke="#334155" stroke-width="1.4" stroke-linejoin="round"/>`;
      s += P(K, 'M156 58 H190 L184 68 H162Z', '#a0692c', { line: '#3b1d0c', lw: 1.8 });
      // пена и пузыри
      s += `<g fill="#fff" opacity=".9"><ellipse cx="66" cy="160" rx="9" ry="3"/><ellipse cx="136" cy="160" rx="9" ry="3"/></g>`;
      s += bub(44, 52, 4.4, -0.3) + bub(158, 112, 3.6, -1) + bub(110, 170, 3, -0.6);
      return s;
    },

    // Лингбакр: кит величиной с остров — на спине у него растут трава и лиловый вереск, стоят рунный камень и берёзка,
    // а мореходы привязали к «острову» свою ладью. Кит дремлет, улыбается и пускает фонтан, хвост поднимается из волн
    no_lyngbakr(K) {
      const whale = { c1: '#9cc2ea', c2: '#1e3a6e', rim: '#c8f3ff', line: '#0b1a33' };
      let s = K.aura('#38bdf8', 96, 108, 0.4);
      // хвост поднимается из волн
      s += K.vol('M30 134 C26 116 16 104 8 96 C18 96 26 100 30 106 C30 92 36 82 46 76 C46 90 44 106 42 124Z', whale);
      // фонтан
      s += `<g class="art-float">` + K.line('M134 74 C132 56 122 44 108 42 M134 74 C136 56 146 44 160 42 M134 74 V34', '#e0f7ff', 3.4, { op: 0.9 }) + `<g fill="#bae6fd" stroke="#0c4a6e" stroke-width=".8"><path d="M106 46 q-3 5 0 7 q3 -2 0 -7Z"/><path d="M162 46 q-3 5 0 7 q3 -2 0 -7Z"/><path d="M134 26 q-3 5 0 7 q3 -2 0 -7Z"/></g></g>`;
      // спина-остров
      const body = 'M22 140 C26 110 54 86 98 82 C136 78 168 94 180 118 C186 130 184 140 180 144Z';
      s += K.vol(body, whale);
      // трава и лиловый вереск
      s += P(K, 'M32 114 C46 94 72 84 98 82 C128 80 154 90 168 108 C160 102 148 100 140 104 C130 96 116 98 108 102 C96 94 82 98 74 102 C62 96 50 102 44 108 C40 106 36 108 32 114Z', '#65a30d', { line: '#1a2e05', lw: 1.8 });
      [[46, 104], [58, 95], [88, 90], [104, 93], [146, 96], [158, 103]].forEach(([x, y], i) => { s += `<g fill="${i % 2 ? '#c084fc' : '#a855f7'}" stroke="#581c87" stroke-width=".6"><circle cx="${x}" cy="${y}" r="2.6"/><circle cx="${x + 3}" cy="${y - 3}" r="2.2"/><circle cx="${x - 3}" cy="${y - 3.4}" r="2"/><circle cx="${x}" cy="${y - 6}" r="1.8"/></g>`; });
      // рунный камень и берёзка
      s += K.vol('M64 98 C62 84 66 74 72 74 C78 74 82 84 80 98Z', { c1: '#cbd5e1', c2: '#475569', rim: '#c8f3ff', tex: false, lw: 1.8, line: '#1e293b' }) + rune(72, 86, 9, 'l', '#e0f2fe', 1.3, '#38bdf8');
      s += P(K, 'M120 94 V64 H125 V94Z', '#f8fafc', { line: '#334155', lw: 1.4 }) + K.line('M120 72 h3 M122 80 h3 M120 88 h2.6', '#1e293b', 1.4);
      s += K.vol(K.ell(122, 56, 13, 12), { c1: '#a3e635', c2: '#3f6212', rim: '#c8f3ff', tex: false, lw: 1.8, line: '#1a2e05' }) + K.leaf(110, 52, 8, -150, '#84cc16') + K.leaf(134, 50, 8, -30, '#84cc16');
      // сонный глаз и улыбка у воды
      s += K.eye(156, 120, 6.6, { iris: '#1d4ed8', lid: 'half', skin: '#6f98c8', look: [0.3, 0.3] });
      s += K.line('M146 132 Q162 138 178 130', K.INK, 2.4) + K.line('M118 136 h36 M122 140 h30', '#dbeafe', 1.4, { op: 0.6 });
      // море
      s += `<path d="M0 134 q12.5 -7 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 V186 H0Z" fill="${K.lin(['#38bdf8', '#0c4a6e'])}" opacity=".9"/>` + K.line('M0 134 q12.5 -7 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0', '#e0f2fe', 2.2);
      // ладья мореходов на привязи
      s += K.line('M58 146 Q70 140 78 126', '#d6b88a', 1.4);
      s += K.line('M40 148 V112', '#5a3414', 2.2) + `<path d="M28 116 H52 V138 H28Z" fill="#f8fafc" stroke="#334155" stroke-width="1.4"/><path d="M28 122 H52 M28 130 H52" stroke="#dc2626" stroke-width="3.4"/>`;
      s += P(K, 'M18 146 H64 C62 154 54 158 40 158 C28 158 20 154 18 146Z', '#a0692c', { line: '#3b1d0c', lw: 1.8 }) + K.line('M14 140 C16 146 20 146 20 146 M68 140 C66 146 62 146 62 146', '#3b1d0c', 2.4);
      s += bub(176, 156, 4, -0.4) + bub(100, 166, 3, -1.2);
      return s;
    },

    // Хульдра: лесная красавица норвежских сказок — длинные каштановые волосы с венком из брусники и белых цветов,
    // зелёный бунад с красным расшитым корсажем и белым фартуком. Стоит среди берёз и играет на берестяном рожке-луре,
    // а из-под подола выглядывает и покачивается коровий хвостик с кисточкой
    no_huldra(K) {
      const skin = { c1: '#fde5cf', c2: '#e0a882', rim: '#fff3d6', tex: false, lw: 2.2, line: '#8a5a3a' }, hair = { c1: '#c2672e', c2: '#5a1f08', rim: '#e4ffb0', tex: false, lw: 2.2, line: '#2a0d04' };
      const sleeve = { c1: '#ffffff', c2: '#cbd5e1', rim: '#fff3d6', tex: false, lw: 1.8, line: '#64748b' };
      let s = K.aura('#84cc16', 94, 104, 0.4);
      // берёзы по бокам
      const birch = x => P(K, `M${x - 6} 178 V10 H${x + 6} V178Z`, '#f8fafc', { line: '#475569', lw: 1.6 }) + K.line(`M${x - 6} 40 h6 M${x} 70 h6 M${x - 6} 104 h5 M${x} 138 h6`, '#1e293b', 2.4);
      s += birch(20) + birch(180) + K.leaf(26, 30, 14, -30, '#84cc16') + K.leaf(14, 56, 12, -150, '#65a30d') + K.leaf(174, 36, 14, -150, '#84cc16') + K.leaf(186, 66, 12, -30, '#65a30d');
      // коровий хвостик с кисточкой покачивается
      s += `<g class="art-sway">` + K.line('M116 162 C134 168 146 158 144 146', '#2a0d04', 6.4) + K.line('M116 162 C134 168 146 158 144 146', '#e0b48a', 3.2) + P(K, 'M138 148 C134 138 140 130 148 130 C154 134 154 144 148 150Z', '#7c3a12', { line: '#2a0d04', lw: 1.6 }) + '</g>';
      // длинные волосы сзади
      s += K.vol('M76 58 C60 82 58 120 64 148 L136 148 C142 120 140 82 124 58 C114 46 86 46 76 58Z', hair);
      // бунад: платье, фартук, расшитый корсаж
      const dress = 'M100 98 C116 98 126 108 128 124 C132 144 140 160 146 172 C120 180 80 180 54 172 C60 160 68 144 72 124 C74 108 84 98 100 98Z';
      s += K.vol(dress, { c1: '#4ade80', c2: '#14532d', rim: '#e4ffb0', line: '#052e16' });
      s += K.line('M56 168 Q100 178 144 168', '#dc2626', 3.4) + K.stitch('M58 163 Q100 172 142 163', '#fde68a', 1.4);
      s += P(K, 'M88 124 H112 L116 168 H84Z', '#f8fafc', { line: '#64748b', lw: 1.4 }) + K.stitch('M86 160 H114', '#dc2626', 1.4);
      s += P(K, 'M82 100 Q100 106 118 100 L120 124 Q100 130 80 124Z', '#b91c1c', { line: '#450a0a', lw: 1.6 }) + K.stitch('M84 106 Q100 111 116 106', '#fde68a', 1.4) + K.rhomb(100, 116, 3.6, '#fde68a', '#713f12');
      // левая рука держит фартук
      s += K.vol('M80 102 C70 108 66 118 70 128 C74 132 80 130 82 124Z', sleeve) + K.vol(K.ell(74, 132, 6, 5.6), skin);
      // голова и чёлка
      s += K.vol(K.ell(100, 76, 20, 21), skin);
      s += K.part('M80 72 C80 56 92 50 100 52 C110 50 122 56 120 72 C114 64 106 62 100 66 C94 62 86 64 80 72Z', '#9a3412', { line: '#2a0d04', lw: 1.6 });
      // венок из брусники и белых цветов
      for (let a = -160; a <= -20; a += 20) { const t = a * Math.PI / 180; s += K.leaf(f(100 + 21 * Math.cos(t)), f(64 + 13 * Math.sin(t)), 8, a + 70, '#4d7c0f'); }
      s += [[82, 57], [94, 51], [106, 51], [118, 57]].map(([x, y], i) => i % 2 ? `<g fill="#dc2626" stroke="#7f1d1d" stroke-width=".6"><circle cx="${x}" cy="${y}" r="2.6"/><circle cx="${f(x + 3.4)}" cy="${f(y + 1.4)}" r="2.2"/><circle cx="${f(x - 2.6)}" cy="${y + 2}" r="2"/></g>` :
        `<g fill="#fff" stroke="#9ca3af" stroke-width=".6">${[0, 72, 144, 216, 288].map(d => `<circle cx="${f(x + 2.6 * Math.cos(d * Math.PI / 180))}" cy="${f(y + 2.6 * Math.sin(d * Math.PI / 180))}" r="1.9"/>`).join('')}</g><circle cx="${x}" cy="${y}" r="1.3" fill="#fde047"/>`).join('');
      // играет, прикрыв глаза
      s += K.closed(100, 78, 7.4, 4.4, true) + K.blush(86, 86, 4.6) + K.blush(114, 86, 4.6);
      // правая рука и берестяной рожок-лур
      s += K.vol('M120 102 C134 100 142 92 140 80 C136 76 130 78 130 84 C130 90 124 94 116 96Z', sleeve);
      s += P(K, 'M103 86 L160 33 L169 42 L108 91Z', '#f8fafc', { line: '#475569', lw: 1.6 }) + K.line('M116 78 l6 6 M128 66 l6 7 M142 53 l7 7 M154 42 l7 7', '#1e293b', 2.4);
      s += `<ellipse cx="166" cy="37" rx="9" ry="5.4" transform="rotate(-42 166 37)" fill="#e2e8f0" stroke="#475569" stroke-width="1.8"/>`;
      s += K.vol(K.ell(134, 80, 6, 5.6), skin);
      s += note(176, 62, 8, '#d9f99d', -0.3) + note(154, 18, 7, '#f7fee7', -1) + K.spark(40, 120, 2.6, '#e4ffb0', 'art-float');
      return s;
    },

    // Гуллинбурсти: золотой вепрь Фрейра, выкованный двергами, мчится по ночному небу — золотая щетина на загривке сияет
    // лучами, как солнце, клык, сердитый глаз, на боку — пластина с рунами (работа двергов), под копытами облака и искры
    no_gullinbursti(K) {
      const gold = { c1: '#fde68a', c2: '#a16207', rim: '#fff6b0', line: '#422006' };
      let s = K.aura('#facc15', 98, 100, 0.5);
      // облака под копытами
      s += `<path d="${fluff(56, 170, 40, 7, 8, 1.8)}" fill="#c7d2fe" opacity=".55"/><path d="${fluff(150, 168, 36, 6, 7, 1.6)}" fill="#c7d2fe" opacity=".5"/>`;
      // сияющая щетина-лучи на загривке
      let mane = '';
      for (let i = 0; i < 11; i++) {
        const a = (-168 + i * 15) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), Lk = i % 2 ? 20 : 30;
        const bx = 94 + 48 * c, by = 110 + 28 * sn, tx = 94 + (48 + Lk) * c, ty = 110 + (28 + Lk) * sn, px = -sn * 5.5, py = c * 5.5;
        mane += `<path d="M${f(bx - px)} ${f(by - py)}L${f(tx)} ${f(ty)}L${f(bx + px)} ${f(by + py)}Z"/>`;
      }
      s += `<ellipse class="art-aura" cx="94" cy="96" rx="76" ry="56" fill="${K.rad([[0.3, '#fef9c3', 0.7], [1, '#facc15', 0]])}"/>`;
      s += `<g fill="${K.lin(['#fffbe6', '#fde047', '#f59e0b'])}" stroke="#a16207" stroke-width="1.4" stroke-linejoin="round">${mane}</g>`;
      // дальние ноги и хвостик-завиток
      s += limb(K, 'M70 128 L54 156', '#b4870f', 10, '#422006', 0.3) + limb(K, 'M124 130 L146 152', '#b4870f', 10, '#422006', 0.3);
      s += K.line('M48 106 C38 102 36 92 44 90 C50 90 50 98 44 100', '#422006', 4.6) + K.line('M48 106 C38 102 36 92 44 90 C50 90 50 98 44 100', '#fbbf24', 2.2);
      // тело и пластина с рунами
      s += K.vol(K.ell(94, 112, 50, 30), gold);
      s += P(K, 'M70 104 H116 V122 H70Z', '#fef3c7', { line: '#713f12', lw: 1.6 }) + K.stitch('M72 106.4 H114 M72 119.6 H114', '#b45309', 1);
      s += rune(81, 113, 9, 'f', '#92400e', 1.4) + rune(93, 113, 9, 'r', '#92400e', 1.4) + rune(105, 113, 9, 'ng', '#92400e', 1.4);
      // ближние ноги с копытцами
      s += limb(K, 'M76 134 L64 162', '#eab308', 11, '#422006', 0.4) + limb(K, 'M118 136 L136 162', '#eab308', 11, '#422006', 0.4);
      s += `<g fill="#422006"><ellipse cx="63" cy="165" rx="6.4" ry="4"/><ellipse cx="137" cy="165" rx="6.4" ry="4"/><ellipse cx="53" cy="159" rx="5.4" ry="3.4"/><ellipse cx="147" cy="155" rx="5.4" ry="3.4"/></g>`;
      // голова: ухо, пятачок, клык, сердитый глаз
      s += K.part('M138 94 L142 72 L154 90Z', '#eab308', { line: '#422006', lw: 1.8 });
      s += K.vol('M132 94 C148 86 166 90 176 102 C182 110 186 120 180 126 C170 134 150 134 140 128 C132 120 128 102 132 94Z', gold);
      s += `<ellipse cx="181" cy="116" rx="6.4" ry="8.4" fill="${K.lin(['#fde68a', '#d97706'])}" stroke="#422006" stroke-width="1.8"/><g fill="#422006"><ellipse cx="180" cy="113" rx="1.4" ry="2"/><ellipse cx="182.4" cy="119" rx="1.4" ry="2"/></g>`;
      s += `<path d="M166 126 C170 132 176 130 177 120 C173 124 170 125 167 122Z" fill="#fffbeb" stroke="#422006" stroke-width="1.2"/>` + K.line('M156 124 Q162 128 168 126', '#422006', 1.8);
      s += K.eye(156, 104, 5.8, { iris: '#b45309', lid: 'angry', skin: '#eab308', look: [0.6, 0.1] });
      // искры под копытами
      s += K.spark(42, 150, 3.4, '#fffbe6') + K.spark(160, 150, 3, '#fde047', 'art-float') + bolt(K, 20, 120, 0.7, -15) + bolt(K, 186, 82, 0.7, 20);
      return s;
    },

    // Йольский кот: исполинский чёрный кот из исландских сказок сидит на заснеженной крыше под месяцем, глаза горят жёлтым.
    // Проверяет, всем ли подарили обновку: лапой поднял новенький полосатый носок. Из трубы вьётся дымок, падает снег
    no_yolskiykot(K) {
      const fur = { c1: '#5b6478', c2: '#0b0f1a', rim: '#e9d5ff', line: '#05070d' }, furS = { ...fur, tex: false, lw: 2.2 };
      let s = K.aura('#c084fc', 98, 100, 0.42);
      // месяц и снег
      s += `<path d="M32 20 A18 18 0 1 0 52 44 A13 13 0 0 1 32 20Z" fill="#fef9c3" opacity=".9"/>`;
      s += flake(170, 28, 6) + flake(64, 36, 4.4, '#fff', '') + flake(188, 64, 4.4) + flake(112, 14, 4, '#fff', 'art-float');
      // труба с дымком
      s += P(K, 'M16 114 H40 V158 H16Z', '#9a3412', { line: '#3b1505', lw: 2 }) + K.line('M16 126 H40 M16 138 H40 M28 114 V126 M22 126 V138 M34 138 V150', '#3b1505', 1.2, { op: 0.6 }) + `<path d="${fluff(28, 112, 15, 4, 6, 1.4)}" fill="#fff"/>`;
      s += K.line('M28 104 C22 94 34 88 28 78 C24 70 32 64 30 58', '#e2e8f0', 3.4, { op: 0.5, cls: 'art-float' });
      // заснеженная крыша
      s += P(K, 'M0 162 L100 150 L200 162 V186 H0Z', '#475569', { line: '#0f172a', lw: 2 }) + `<path d="M0 158 Q50 146 100 145 Q150 146 200 158 L200 166 Q150 156 100 155 Q50 156 0 166Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.2"/>`;
      // хвост обвивает лапы
      s += limb(K, 'M128 160 C156 162 168 146 160 128 C156 120 148 120 148 128', '#2b3242', 13, '#05070d', 0.25);
      // тело и лапы
      const body = 'M100 84 C136 84 154 110 154 136 C154 156 136 166 100 166 C64 166 46 156 46 136 C46 110 64 84 100 84Z';
      s += K.vol(body, fur);
      s += `<ellipse cx="100" cy="134" rx="22" ry="20" fill="#7c8597" opacity=".35"/>`;
      s += K.mirror(K.vol(K.ell(80, 162, 12, 7), furS));
      // уши и голова
      s += K.mirror(K.vol('M62 66 L60 24 L94 48Z', furS) + `<path d="M66 58 L65 34 L86 49Z" fill="#f9a8d4" opacity=".8"/>`);
      s += K.vol(K.ell(100, 70, 42, 32), fur);
      // горящие глаза со зрачками-щёлками
      const eyeG = K.rad([[0, '#fffbe6'], [0.6, '#fde047'], [1, '#eab308']]);
      s += `<circle class="art-blink" cx="80" cy="68" r="16" fill="${RG(K, 'eyeg', [[0, '#fef08a', 0.7], [1, '#facc15', 0]])}"/><circle class="art-blink" cx="120" cy="68" r="16" fill="${RG(K, 'eyeg', [])}"/>`;
      s += `<g class="art-eyes"><ellipse cx="80" cy="68" rx="10" ry="11" fill="${eyeG}" stroke="#05070d" stroke-width="2"/><ellipse cx="120" cy="68" rx="10" ry="11" fill="${eyeG}" stroke="#05070d" stroke-width="2"/>` +
        `<ellipse cx="80" cy="69" rx="2.6" ry="8" fill="#05070d"/><ellipse cx="120" cy="69" rx="2.6" ry="8" fill="#05070d"/><circle cx="76.6" cy="63" r="2.4" fill="#fff"/><circle cx="116.6" cy="63" r="2.4" fill="#fff"/></g>`;
      // нос, рот, усы
      s += `<path d="M95 82 H105 L100 88Z" fill="#f472b6" stroke="#05070d" stroke-width="1.2"/>` + K.mouth('cat', 100, 90, 14);
      s += K.line('M66 84 l-22 -3 M66 89 l-22 3 M134 84 l22 -3 M134 89 l22 3', '#cbd5e1', 1.4, { op: 0.8 });
      // лапа поднимает новенький полосатый носок
      s += limb(K, 'M136 122 Q154 112 150 92', '#2b3242', 12, '#05070d', 0.25);
      const sock = 'M156 94 H174 V122 C184 124 188 136 180 142 C172 147 156 142 156 130Z';
      s += `<g class="art-sway" style="animation-delay:-.8s"><path d="${sock}" fill="#fff"/><g clip-path="${clip(K, sock)}">` + K.line('M150 101 H190 M150 110 H190 M150 119 H190 M150 128 H190', '#dc2626', 4) + `<path d="M168 134 C174 130 184 130 190 136 L190 150 H164Z" fill="#16a34a"/></g>` + `<path d="${sock}" fill="none" stroke="#05070d" stroke-width="2" stroke-linejoin="round"/>` + P(K, 'M155 90 H175 V98 H155Z', '#16a34a', { line: '#05070d', lw: 1.6 }) + '</g>';
      s += K.vol(K.ell(154, 92, 9.5, 8.5), furS) + K.line('M150 88 v6 M155 87 v7', '#05070d', 1.2, { op: 0.6 });
      return s;
    },

    // Хримфакси: конь Ночи — тёмно-синий скакун с инеистой серебряной гривой, в которой мерцают звёзды. Стоит на ночных облаках,
    // низко склонив голову: пена с серебряных удил падает каплями росы на траву. Над спиной — тонкий месяц
    no_hrimfaxi(K) {
      const coat = { c1: '#7c83e8', c2: '#1e1b4b', rim: '#e0f2fe', rimK: 0.6, line: '#0b0a24' }, frost = { c1: '#ffffff', c2: '#93c5fd', rim: '#ffffff', tex: false, lw: 2, line: '#1e3a8a' };
      let s = K.aura('#c084fc', 98, 104, 0.42);
      // месяц и звёзды
      s += `<path d="M138 16 A20 20 0 1 0 160 44 A15 15 0 0 1 138 16Z" fill="#fef9c3" opacity=".92"/>`;
      s += K.spark(30, 30, 3.4, '#e0f2fe') + K.spark(180, 72, 3, '#ffffff', 'art-float') + K.spark(88, 24, 2.6, '#e0f2fe', 'art-float') + K.spark(186, 118, 2.6, '#e9d5ff');
      // облака
      s += `<path d="${fluff(100, 174, 86, 8, 12, 2)}" fill="#c7d2fe" opacity=".5"/>`;
      // инеистый хвост
      s += K.vol('M154 94 C172 100 184 120 186 146 C178 140 172 136 168 128 C170 142 166 154 158 160 C158 140 154 120 148 104Z', frost);
      // дальние ноги
      s += limb(K, 'M134 118 L136 142 L132 164', '#2c2a7a', 8, '#0b0a24', 0.2) + limb(K, 'M90 118 L88 142 L86 164', '#2c2a7a', 8, '#0b0a24', 0.2);
      // тело
      const body = 'M156 100 C156 82 136 76 110 76 C84 76 66 84 64 100 C62 116 76 128 110 130 C140 130 156 118 156 100Z';
      s += K.vol(body, coat);
      s += `<g fill="#e0f2fe" opacity=".75"><circle cx="122" cy="90" r="1.6"/><circle cx="138" cy="104" r="1.2"/><circle cx="104" cy="112" r="1.4"/><circle cx="92" cy="94" r="1"/></g>`;
      // ближние ноги с серебряными копытами
      s += limb(K, 'M146 116 L150 142 L148 164', '#4648b8', 9, '#0b0a24', 0.3) + limb(K, 'M78 116 L74 142 L72 164', '#4648b8', 9, '#0b0a24', 0.3);
      s += `<g fill="${L(K, '#cbd5e1')}" stroke="#0b0a24" stroke-width="1.4"><ellipse cx="148" cy="167" rx="7" ry="4"/><ellipse cx="72" cy="167" rx="7" ry="4"/><ellipse cx="132" cy="166" rx="6" ry="3.4"/><ellipse cx="86" cy="166" rx="6" ry="3.4"/></g>`;
      // шея к опущенной голове
      s += K.vol('M94 80 C72 80 56 92 46 110 L38 120 L58 132 C64 118 74 108 96 106Z', coat);
      // голова, склонённая к траве
      s += K.part('M50 112 L52 94 L62 108Z', '#4648b8', { line: '#0b0a24', lw: 1.6 });
      s += K.vol('M44 110 C56 112 62 124 58 138 C54 150 46 160 38 164 C30 167 20 162 21 153 C22 140 28 124 36 114 C38 111 41 110 44 110Z', coat);
      s += `<ellipse cx="30" cy="157" rx="9" ry="7" transform="rotate(-25 30 157)" fill="#a5b4fc" opacity=".55"/><ellipse cx="26" cy="158" rx="1.8" ry="1.3" fill="#0b0a24"/>`;
      s += K.eye(47, 128, 5, { iris: '#a5b4fc', lid: 'half', skin: '#4648b8', look: [-0.3, 0.4] });
      // инеистая грива и чёлка со звёздами
      s += K.vol('M102 80 C94 66 82 60 70 64 C74 68 76 72 74 76 C68 70 56 70 48 78 C54 82 56 86 54 90 C48 88 40 92 36 102 C42 104 44 108 42 112 C36 114 32 120 32 126 C42 120 50 112 58 104 C68 94 82 88 98 88Z', frost);
      s += K.line('M92 80 C80 72 66 74 56 84 M80 86 C66 86 52 96 44 108', '#93c5fd', 1.4, { op: 0.7 });
      s += K.part('M42 112 C34 116 30 124 32 132 C36 126 42 122 48 120Z', '#ffffff', { line: '#1e3a8a', lw: 1.3 });
      s += K.spark(76, 66, 3, '#fef9c3') + K.spark(52, 84, 2.4, '#ffffff', 'art-float') + K.spark(98, 64, 2.2, '#e0f2fe');
      // серебряная уздечка и удила
      s += K.line('M24 150 L52 130 M34 162 L56 136', '#e2e8f0', 2) + `<circle cx="27" cy="155" r="3.2" fill="none" stroke="#e2e8f0" stroke-width="2"/>`;
      // капли росы падают на траву
      s += `<g class="art-float" fill="#bae6fd" stroke="#1e3a8a" stroke-width=".8"><path d="M26 164 q-3 5 0 7 q3 -2 0 -7Z"/><path d="M34 170 q-2.4 4 0 5.6 q2.4 -1.6 0 -5.6Z"/></g>`;
      s += K.line('M16 178 l3 -9 M22 178 l1 -11 M28 178 l-1 -8 M34 178 l2 -10 M40 178 l-2 -8', '#65a30d', 2) + K.spark(42, 168, 2.6, '#ffffff');
      return s;
    },

    // Тюр: однорукий бог отваги и честного слова — шлем с наносником и золотым обручем, короткая борода, кольчуга,
    // красный плащ полощется на ветру. Единственной рукой вскинул меч с руной Тейваз, правый рукав перехвачен кожаным наручем
    // (руку он отдал Фенриру в залог), за спиной щит с той же руной, а у ног волчонок — Тюр один не боялся его кормить
    no_tyr(K) {
      const skin = '#f0c29a', skinV = { c1: skin, c2: '#c98060', rim: '#fff3d6', tex: false, lw: 2, line: '#6a4428' }, mail = { c1: '#c6d0de', c2: '#334155', rim: '#eef0ff', tex: false, line: '#0f172a' };
      let s = K.aura('#a5b4fc', 98, 100, 0.48) + K.aura('#ef4444', 50, 70, 0.2);
      s += K.line('M6 60 q12 -8 24 0 t24 0 M148 152 q10 -7 20 0 t20 0 M4 112 q10 -6 20 0', '#e0e7ff', 2, { op: 0.55, cls: 'art-float' });
      // плащ полощется на ветру
      s += K.vol('M72 84 C58 110 52 150 48 178 H150 C166 152 180 124 190 98 C176 106 160 102 146 86Z', { c1: '#ef4444', c2: '#5a0a0a', rim: '#eef0ff', rimK: 0.45, line: '#2a0505' });
      s += K.line('M150 122 q14 -4 26 -16 M146 148 q16 -6 30 -22', '#fca5a5', 1.6, { op: 0.5 });
      // щит за спиной с руной Тейваз
      s += `<circle cx="134" cy="106" r="23" fill="${L(K, '#b91c1c')}" stroke="${K.INK}" stroke-width="2.2"/><circle cx="134" cy="106" r="20.4" fill="none" stroke="#fbbf24" stroke-width="2.4"/>` + rune(134, 106, 22, 't', '#fde047', 3, '#facc15');
      // кольчуга, туника, пояс
      const body = 'M96 84 C118 84 130 98 132 118 C134 142 134 160 132 178 H62 C60 160 60 142 62 118 C64 98 76 84 96 84Z';
      s += K.vol(body, mail);
      s += `<g clip-path="${clip(K, body)}" opacity=".4">` + [0, 1, 2, 3, 4, 5, 6, 7].map(i => K.line(`M56 ${90 + i * 8} q4 4 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0`, '#0f172a', 1.1)).join('') + '</g>';
      s += P(K, 'M61 150 Q96 158 133 150 L134 178 H60Z', '#b91c1c', { line: '#450a0a', lw: 1.8 }) + K.stitch('M62 170 H132', '#fde68a', 1.6);
      s += K.line('M62 146 Q96 154 132 146', '#3b1d0c', 8) + K.line('M62 146 Q96 154 132 146', '#8a5a2c', 4.4) + `<rect x="90" y="146" width="12" height="10" rx="2" fill="${L(K, '#fbbf24')}" stroke="#713f12" stroke-width="1.4"/>`;
      // правый рукав, перехваченный кожаным наручем
      s += K.vol('M66 94 C54 104 48 120 50 134 C54 140 62 138 64 132 C64 120 68 108 74 100Z', mail);
      s += P(K, 'M48 130 C50 126 62 126 64 130 L64 140 C60 145 52 145 48 140Z', '#7c4a1d', { line: '#2a1606', lw: 1.6 }) + K.stitch('M50 135.6 H62', '#fde68a', 1.2);
      // единственная рука вскинула меч с руной Тейваз
      s += limb(K, 'M126 96 Q150 94 152 74', '#c6d0de', 13, '#0f172a', 0.3);
      s += `<circle class="art-aura" cx="166" cy="34" r="26" fill="${K.rad([[0, '#ffffff', 0.85], [0.4, '#e0e7ff', 0.4], [1, '#a5b4fc', 0]])}"/>`;
      s += `<g transform="translate(156 62) rotate(24)">` + P(K, 'M-4.4 0 V-46 L0 -56 L4.4 -46 V0Z', '#e2e8f0', { line: '#1e293b', lw: 1.8 }) + K.line('M0 -4 V-44', '#94a3b8', 1.4) + rune(0, -24, 12, 't', '#4338ca', 1.6) +
        P(K, 'M-13 0 H13 V4.4 H-13Z', '#fbbf24', { line: '#713f12', lw: 1.4 }) + P(K, 'M-2.6 4.4 V16 H2.6 V4.4Z', '#5a3414', { line: '#1f1206', lw: 1.2 }) + `<circle cx="0" cy="18.6" r="3.4" fill="${L(K, '#fbbf24')}" stroke="#713f12" stroke-width="1.2"/></g>`;
      s += K.vol(K.ell(152, 71, 8, 7.4), skinV);
      // голова: короткая борода, шлем с наносником
      s += K.vol(K.ell(96, 66, 19, 20), { ...skinV, hiK: 0.16, lw: 2.2 });
      s += K.vol('M78 80 C76 94 86 102 96 104 C106 102 116 94 114 80 C108 86 84 86 78 80Z', { c1: '#a0632e', c2: '#4a2410', tex: false, lw: 2, line: '#1f1206' });
      s += K.line('M91 88 Q96 90 101 88', K.INK, 2);
      s += K.eyes(96, 69, 8.4, 5.4, { iris: '#2563eb', lid: 'angry', skin, look: [0.5, -0.2] });
      s += K.vol('M76 62 C74 40 86 30 96 26 C106 30 118 40 116 62 C108 58 102 57 96 57 C90 57 84 58 76 62Z', { c1: '#e2e8f0', c2: '#475569', rim: '#eef0ff', tex: false, lw: 2.4, line: '#0f172a' });
      s += P(K, 'M74 58 Q96 50 118 58 L118 64 Q96 56 74 64Z', '#fbbf24', { line: '#713f12', lw: 1.4 }) + P(K, 'M94 58 H98 V77 Q96 79 94 77Z', '#cbd5e1', { line: '#0f172a', lw: 1.3 });
      // волчонок у ног с ленточкой Глейпнир
      const pup = { c1: '#b4bfd2', c2: '#334155', rim: '#eef0ff', tex: false, lw: 2, line: '#0f172a' };
      s += K.line('M44 172 C56 174 62 164 56 156', '#0f172a', 7) + K.line('M44 172 C56 174 62 164 56 156', '#64748b', 3.6);
      s += K.vol('M20 177 C16 160 22 148 33 146 C45 148 50 160 47 177Z', pup);
      s += K.part('M23 132 L21 116 L32 127Z M43 132 L45 116 L34 127Z', '#94a3b8', { line: '#0f172a', lw: 1.4 });
      s += K.vol(K.ell(33, 135, 13, 11), pup);
      s += `<ellipse cx="33" cy="141" rx="6.4" ry="4.4" fill="#e2e8f0"/><ellipse cx="33" cy="138.4" rx="2.6" ry="1.8" fill="#0f172a"/>`;
      s += K.eyes(33, 132, 5.2, 3.8, { iris: '#fbbf24', look: [0.5, -0.6] });
      s += K.line('M23 147 Q33 153 43 147', '#c4b5fd', 3) + `<path d="M33 151 l-5 -3 l0 6Z M33 151 l5 -3 l0 6Z" fill="#c4b5fd" stroke="#6d28d9" stroke-width=".8"/>`;
      return s;
    },

    // Хеймдалль: страж богов у радужного моста Биврёст — белый плащ, золотой доспех, шлем с закрученными бараньими рогами.
    // В руке огромный рог Гьяллархорн с золотыми кольцами, другую ладонь приложил к уху — слышит, как растёт трава у ног;
    // улыбается золотыми зубами (его прозвали Золотозубым)
    no_heimdall(K) {
      const skin = '#f3d2b0', skinV = { c1: skin, c2: '#c98f68', rim: '#fff3d6', tex: false, lw: 2, line: '#6a4428' }, white = { c1: '#ffffff', c2: '#94a3b8', rim: '#eef0ff', line: '#334155' };
      let s = K.aura('#a5b4fc', 98, 100, 0.48);
      // радуга-мост Биврёст
      ['#ef4444', '#f97316', '#facc15', '#4ade80', '#38bdf8', '#a78bfa'].forEach((c, i) => { const r = 90 - i * 6; s += `<path d="M${100 - r} 178 A${r} ${r} 0 0 1 ${100 + r} 178" fill="none" stroke="${c}" stroke-width="6.6" opacity=".85"/>`; });
      s += `<path d="M10 178 A90 90 0 0 1 190 178" fill="none" stroke="#fff" stroke-width="1.4" opacity=".6"/>`;
      // белый плащ и золотой доспех
      s += K.vol('M68 84 C50 110 42 150 38 178 H162 C158 150 150 110 132 84Z', white);
      s += K.line('M42 172 Q100 182 158 172', '#fbbf24', 2.6);
      const body = 'M100 86 C120 86 132 100 134 120 C136 144 136 162 134 178 H66 C64 162 64 144 66 120 C68 100 80 86 100 86Z';
      s += K.vol(body, { c1: '#fde68a', c2: '#a16207', rim: '#eef0ff', line: '#422006' });
      s += `<g clip-path="${clip(K, body)}" opacity=".45">` + [0, 1, 2, 3, 4, 5, 6].map(i => K.line(`M${60 + (i % 2) * 5} ${96 + i * 10} q5 6 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0`, '#713f12', 1.3)).join('') + '</g>';
      s += K.line('M66 148 Q100 156 134 148', '#422006', 8) + K.line('M66 148 Q100 156 134 148', '#f8fafc', 4.4) + K.rhomb(100, 153, 5, '#38bdf8', '#0c4a6e');
      // рог Гьяллархорн в правой руке
      s += K.vol('M64 132 C40 126 24 104 26 74 C28 60 38 50 46 46 C42 62 42 80 50 98 C56 110 64 118 74 122Z', { c1: '#fff7e6', c2: '#c8a26a', rim: '#eef0ff', tex: false, lw: 2.4, line: '#5a3a14' });
      s += K.line('M36 100 C44 98 50 96 54 92 M30 78 C38 78 44 76 48 72', '#d97706', 4) + K.line('M36 100 C44 98 50 96 54 92 M30 78 C38 78 44 76 48 72', '#fde047', 1.6);
      s += `<ellipse cx="42" cy="46" rx="11" ry="6" transform="rotate(-30 42 46)" fill="${L(K, '#fbbf24')}" stroke="#5a3a14" stroke-width="2"/><ellipse cx="42" cy="46" rx="7" ry="3.4" transform="rotate(-30 42 46)" fill="#5a3a14"/>`;
      s += K.vol('M70 94 C60 104 58 116 62 126 C66 130 72 128 74 124 C74 114 76 106 80 100Z', { ...white, tex: false, lw: 2 }) + K.vol(K.ell(66, 128, 8, 7.4), skinV);
      // голова и шлем с бараньими рогами
      s += K.vol(K.ell(100, 66, 19, 20), { ...skinV, hiK: 0.16, lw: 2.2 });
      s += K.vol('M80 60 C78 40 88 30 100 30 C112 30 122 40 120 60 C112 56 106 55 100 55 C94 55 88 56 80 60Z', { ...white, tex: false, lw: 2.4 });
      s += P(K, 'M78 56 Q100 48 122 56 L122 62 Q100 54 78 62Z', '#fbbf24', { line: '#713f12', lw: 1.4 });
      s += K.mirror(K.line('M82 46 C70 40 60 46 62 56 C64 64 74 64 74 56 C74 52 70 50 68 52', '#5a3a14', 7) + K.line('M82 46 C70 40 60 46 62 56 C64 64 74 64 74 56 C74 52 70 50 68 52', '#fbbf24', 4) + K.line('M80 45 C70 41 63 46 64 54', '#fff7cc', 1.4, { op: 0.7 }));
      // зоркие глаза и золотозубая улыбка
      s += K.eyes(100, 68, 8, 5.4, { iris: '#0ea5e9', look: [0.6, -0.1] });
      s += `<path d="M90 78 Q100 89 110 78Z" fill="${L(K, '#fde047')}" stroke="${K.INK}" stroke-width="2" stroke-linejoin="round"/>` + K.line('M95 79 v4.6 M100 79.4 v5.4 M105 79 v4.6', '#a16207', 1);
      s += K.blush(86, 76, 4) + K.blush(114, 76, 4);
      // ладонь у уха
      s += limb(K, 'M130 96 Q156 94 132 72', '#f8fafc', 12, '#334155', 0.3) + K.vol(K.ell(127, 67, 7.6, 8), skinV);
      // трава у ног растёт — и он это слышит
      s += K.line('M160 178 l-3 -12 M166 178 l0 -16 M172 178 l3 -12', '#65a30d', 2.6) + K.leaf(166, 162, 8, -90, '#84cc16');
      s += K.line('M152 152 q-4 -6 0 -12 M144 148 q-6 -9 0 -18', '#e0e7ff', 1.8, { cls: 'art-blink' });
      return s;
    },

    // Бальдр: светлейший и добрейший из асов — золотые кудри, тонкий золотой обруч, белые одежды с золотой каймой.
    // За спиной сияет солнечный круг, в руках — охапка ромашек (на Севере ромашку зовут «ресницами Бальдра»),
    // и ромашки распускаются у его ног
    no_baldr(K) {
      const skin = { c1: '#fff1e0', c2: '#e8b48a', rim: '#fff6b0', tex: false, lw: 2.2, line: '#8a5a3a' }, robe = { c1: '#ffffff', c2: '#d6c08a', rim: '#fff6b0', line: '#6b4f12' };
      const hair = { c1: '#fde68a', c2: '#b7791f', rim: '#fff6b0', tex: false, lw: 2, line: '#713f12' };
      let s = K.aura('#facc15', 100, 96, 0.55) + K.aura('#ffffff', 56, 70, 0.4);
      // солнечный круг с лучами
      let rays = '';
      for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, R = i % 2 ? 62 : 74; rays += `<path d="M${f(100 + 40 * Math.cos(a - 0.07))} ${f(70 + 40 * Math.sin(a - 0.07))}L${f(100 + R * Math.cos(a))} ${f(70 + R * Math.sin(a))}L${f(100 + 40 * Math.cos(a + 0.07))} ${f(70 + 40 * Math.sin(a + 0.07))}Z"/>`; }
      s += `<g class="art-spin" fill="#fde68a" opacity=".8">${rays}</g>`;
      s += `<circle cx="100" cy="70" r="42" fill="${K.rad([[0, '#fffbe6'], [0.7, '#fde68a'], [1, '#f59e0b']])}" stroke="#d97706" stroke-width="2"/>`;
      // белые одежды с золотой каймой
      const body = 'M100 88 C122 88 134 104 138 124 C142 146 150 164 156 178 H44 C50 164 58 146 62 124 C66 104 78 88 100 88Z';
      s += K.vol(body, robe);
      s += K.line('M46 172 Q100 182 154 172', '#fbbf24', 4) + K.stitch('M48 166 Q100 175 152 166', '#d97706', 1.6) + K.line('M100 96 V170', '#fbbf24', 3) + K.stitch('M100 100 V168', '#fff7cc', 1.2);
      // охапка ромашек в руках
      s += K.line('M94 146 L98 124 M100 148 V120 M106 146 L102 124', '#4d7c0f', 2.2);
      s += daisy(88, 116, 8, 5) + daisy(112, 116, 8, 15) + daisy(100, 106, 9, 0) + daisy(94, 126, 6.4, 10) + daisy(106, 126, 6.4, 20) + K.leaf(86, 128, 9, 150, '#65a30d') + K.leaf(114, 128, 9, 30, '#65a30d');
      s += K.mirror(K.vol('M70 98 C58 108 56 124 66 136 C74 142 84 142 92 138 C86 132 80 124 78 106Z', { ...robe, tex: false, lw: 2 }) + K.vol(K.ell(92, 138, 7, 6.4), skin));
      // золотые кудри и лицо
      s += K.vol('M76 70 C70 48 84 36 100 36 C116 36 130 48 124 70 C130 80 126 92 118 96 L82 96 C74 92 70 80 76 70Z', hair);
      s += K.vol(K.ell(100, 70, 19, 20), skin);
      s += K.vol(fluff(100, 53, 19, 6, 9, 1.6), hair);
      s += K.line('M82 58 Q100 52 118 58', '#fbbf24', 3) + K.rhomb(100, 55, 3.6, '#fffbe6', '#a16207');
      s += K.eyes(100, 72, 8, 5.6, { iris: '#38bdf8', look: [0, 0.2], lash: true });
      s += K.blush(87, 80, 4) + K.blush(113, 80, 4) + K.mouth('smile', 100, 82, 9);
      // ромашки у ног
      s += daisy(30, 172, 7) + daisy(50, 177, 6, 10) + daisy(150, 177, 6, 20) + daisy(170, 172, 7, 5);
      s += K.spark(24, 120, 3, '#fef9c3', 'art-float') + K.spark(178, 118, 3, '#ffffff');
      return s;
    },

    // Фригг: царица Асгарда, жена Одина — серебряная корона с сапфиром, белое покрывало, синее платье в звёздах.
    // Сидит в резном кресле и прядёт облака: на прялке — пушистая кудель-облако, нить бежит к веретену,
    // а готовые облачка уплывают в небо. На поясе — связка ключей хозяйки чертога
    no_frigg(K) {
      const skin = { c1: '#fde7d2', c2: '#d9a07a', rim: '#fff3d6', tex: false, lw: 2.2, line: '#7a4a2a' }, dressV = { c1: '#818cf8', c2: '#1e1b6b', rim: '#eef0ff', line: '#0b0a2e' };
      let s = K.aura('#a5b4fc', 100, 100, 0.5);
      // облачка уплывают в небо
      s += `<g class="art-float">${cloud(162, 34, 18)}</g><g class="art-float" style="animation-delay:-1.2s">${cloud(182, 72, 12)}</g><g class="art-float" style="animation-delay:-.6s">${cloud(132, 16, 10)}</g>`;
      // спинка резного кресла
      s += P(K, 'M62 52 C62 40 76 34 100 34 C124 34 138 40 138 52 L140 136 H60Z', '#5b3a8c', { line: '#1e0b3a', lw: 2.2 }) + K.stitch('M66 52 C68 42 80 38 100 38 C120 38 132 42 134 52', '#fbbf24', 1.6);
      // прялка: посох с облаком-куделью
      s += K.line('M30 178 L42 60', '#3b1d0c', 6) + K.line('M30 178 L42 60', '#a0692c', 3) + P(K, 'M22 178 H40 L38 172 H24Z', '#7c4a1d', { line: '#3b1d0c', lw: 1.4 });
      s += K.vol(fluff(44, 50, 18, 16, 9, 1.8), { c1: '#ffffff', c2: '#c7d2fe', rim: '#ffffff', tex: false, lw: 1.8, line: '#64748b', shadeK: 0.25 });
      // платье сидящей царицы
      const body = 'M100 84 C120 84 132 98 136 118 C150 126 162 140 168 160 C170 170 166 178 158 178 H42 C34 178 30 170 32 160 C38 140 50 126 64 118 C68 98 80 84 100 84Z';
      s += K.vol(body, dressV);
      s += `<g fill="#e0e7ff" opacity=".85">` + [[80, 140], [112, 150], [142, 162], [60, 160], [96, 166]].map(([x, y]) => `<path d="${star5(x, y, 3.4, 0.45)}"/>`).join('') + '</g>';
      s += K.line('M36 174 Q100 184 164 174', '#fbbf24', 3);
      // пояс со связкой ключей
      s += K.line('M68 118 Q100 126 132 118', '#e2e8f0', 4) + `<circle cx="118" cy="128" r="4.4" fill="none" stroke="#fbbf24" stroke-width="2"/>` + K.line('M116 132 L112 148 M112 148 h-4 M113 144 h-3.4 M120 132 L124 146 M124 146 h4 M123.4 142 h3.4', '#fbbf24', 2);
      // нить от кудели к руке и к веретену
      s += K.line('M58 54 Q96 66 128 106', '#e0e7ff', 1.4, { op: 0.9 }) + K.line('M134 112 L144 146', '#e0e7ff', 1.2);
      s += `<g class="art-spin-soft">` + K.line('M144 140 V172', '#5a3414', 3) + `<ellipse cx="144" cy="152" rx="4.6" ry="7" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/><ellipse cx="144" cy="166" rx="7" ry="3" fill="${L(K, '#fbbf24')}" stroke="#713f12" stroke-width="1.2"/></g>`;
      // руки: одна придерживает прялку, другая тянет нить
      s += K.vol('M68 98 C56 104 46 110 40 118 C42 124 48 126 52 122 C56 116 64 110 74 106Z', { ...dressV, tex: false, lw: 2 }) + K.vol(K.ell(38, 120, 6.4, 6), skin);
      s += K.vol('M132 98 C142 102 146 108 146 116 C142 120 136 118 134 114 C132 110 128 108 124 106Z', { ...dressV, tex: false, lw: 2 }) + K.vol(K.ell(134, 112, 6.4, 6), skin);
      // голова: покрывало, серебряная корона с сапфиром
      s += K.vol('M76 66 C74 48 86 40 100 40 C114 40 126 48 124 66 C128 86 126 104 120 114 L80 114 C74 104 72 86 76 66Z', { c1: '#ffffff', c2: '#c7d2fe', rim: '#eef0ff', tex: false, lw: 2, line: '#475569' });
      s += K.vol(K.ell(100, 72, 21, 22), skin);
      s += K.part('M80 70 C80 55 90 51 100 51 C110 51 120 55 120 70 C114 63 106 61 100 63 C94 61 86 63 80 70Z', '#d6a76a', { line: '#713f12', lw: 1.4 });
      s += P(K, 'M80 52 L84 38 L91 47 L100 30 L109 47 L116 38 L120 52Z', '#e2e8f0', { line: '#334155', lw: 1.6 }) + K.rhomb(100, 45, 3.8, '#3b82f6', '#1e3a8a');
      s += K.eyes(100, 75, 8.6, 6, { iris: '#4f46e5', lid: 'half', skin: '#fde7d2', look: [0, 0.3] });
      s += K.blush(86, 84, 4) + K.blush(114, 84, 4) + K.mouth('smile', 100, 86, 9);
      return s;
    },

    // Фрейр: бог солнца, дождя и урожая — золотисто-русая борода, венок из колосьев, зелёный кафтан с золотой каймой
    // и меховой ворот. В одной руке сноп пшеницы, на ладони другой — крошечный сложенный корабль Скидбладнир, что вмещает
    // всех богов; над ним солнце и тучка с тёплым дождиком
    no_freyr(K) {
      const skin = { c1: '#f5d2b0', c2: '#c98f68', rim: '#fff3d6', tex: false, lw: 2.2, line: '#6a4428' }, green = { c1: '#86efac', c2: '#14532d', rim: '#e4ffb0', line: '#052e16' };
      let s = K.aura('#84cc16', 98, 100, 0.48) + K.aura('#facc15', 44, 40, 0.32);
      // солнце и тучка с тёплым дождиком
      let rays = '';
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; rays += `M${f(36 + 20 * Math.cos(a))} ${f(36 + 20 * Math.sin(a))}L${f(36 + 27 * Math.cos(a))} ${f(36 + 27 * Math.sin(a))}`; }
      s += `<g class="art-spin-soft">` + K.line(rays, '#fbbf24', 3) + `<circle cx="36" cy="36" r="15" fill="${K.rad([[0, '#fffbe6'], [0.6, '#fde047'], [1, '#f59e0b']])}" stroke="#b45309" stroke-width="1.8"/></g>`;
      s += `<g class="art-float">${cloud(160, 30, 20, '#e2e8f0')}` + K.line('M150 44 l-3 8 M160 46 l-3 8 M170 44 l-3 8 M155 58 l-3 8 M165 58 l-3 8', '#7dd3fc', 2.2) + '</g>';
      // плащ
      s += K.vol('M68 84 C50 110 42 150 38 178 H162 C158 150 150 110 132 84Z', { c1: '#fbbf24', c2: '#7c4a0a', rim: '#e4ffb0', line: '#3b1d0c' });
      // кафтан
      const body = 'M100 86 C120 86 132 100 134 120 C136 144 136 162 134 178 H66 C64 162 64 144 66 120 C68 100 80 86 100 86Z';
      s += K.vol(body, green);
      s += K.line('M100 92 V178', '#fbbf24', 3) + K.stitch('M68 172 H132', '#fbbf24', 2);
      s += K.line('M66 142 Q100 150 134 142', '#3b1d0c', 7) + K.line('M66 142 Q100 150 134 142', '#a16207', 3.6) + K.rhomb(100, 147, 5, '#fde047', '#713f12');
      // меховой ворот
      s += K.vol(fluff(100, 88, 32, 9, 11, 1.5), { c1: '#f5f5f4', c2: '#a8a29e', rim: '#fff6b0', tex: false, lw: 1.8, line: '#44403c', shadeK: 0.3 });
      // сноп пшеницы в левой руке
      let sheaf = '';
      for (let i = 0; i < 7; i++) { const x0 = 38 + i * 3, a = -14 + i * 4.6; sheaf += K.line(`M${f(x0 + 4)} 172 L${f(x0 + 2 + (i - 3) * 3)} 104`, '#ca8a04', 1.8) + wheat(K, f(x0 + 2 + (i - 3) * 3), 104, 18, a); }
      s += sheaf + P(K, 'M38 138 H64 V145 H38Z', '#a16207', { line: '#422006', lw: 1.4 });
      s += K.vol('M68 96 C58 104 52 116 52 128 C56 134 64 134 66 128 C66 118 70 110 76 104Z', { ...green, tex: false, lw: 2 }) + K.vol(K.ell(58, 134, 7.4, 6.8), skin);
      // корабль Скидбладнир на ладони
      s += limb(K, 'M130 96 Q150 104 152 128', '#4ade80', 12, '#052e16', 0.3);
      s += `<circle class="art-aura" cx="154" cy="116" r="22" fill="${K.rad([[0, '#fffbe6', 0.9], [0.45, '#fde047', 0.4], [1, '#facc15', 0]])}"/>`;
      s += K.line('M153 120 V94', '#5a3414', 1.8) + `<path d="M154 96 H170 V114 H154Z" fill="#f8fafc" stroke="#334155" stroke-width="1.2"/><path d="M154 101 H170 M154 107 H170" stroke="#dc2626" stroke-width="2.4"/>`;
      s += P(K, 'M136 118 H170 C168 124 162 128 153 128 C144 128 138 124 136 118Z', '#a0692c', { line: '#3b1d0c', lw: 1.6 }) + K.line('M136 118 C132 114 132 108 136 106 M170 118 C174 114 174 108 170 106', '#3b1d0c', 2.2);
      s += K.vol(K.ell(153, 132, 8, 6), skin);
      // голова, борода, венок из колосьев
      s += K.vol(K.ell(100, 66, 19, 20), { ...skin, hiK: 0.16 });
      s += K.vol('M80 74 C78 92 88 102 100 106 C112 102 122 92 120 74 C112 82 88 82 80 74Z', { c1: '#fcd34d', c2: '#a16207', rim: '#fff6b0', tex: false, lw: 2, line: '#422006' });
      s += K.mirror(K.part('M100 82 C94 78 86 78 81 84 C83 87 89 87 92 85 C95 85 98 84 100 84Z', '#eab308', { line: '#422006', lw: 1.3 }));
      s += K.part('M82 62 C80 48 90 44 100 44 C110 44 120 48 118 62 C112 56 106 54 100 55 C94 54 88 56 82 62Z', '#d97706', { line: '#422006', lw: 1.6 });
      for (let i = 0; i < 7; i++) { const a = -150 + i * 20; s += wheat(K, f(100 + 19 * Math.cos(a * Math.PI / 180)), f(52 + 10 * Math.sin(a * Math.PI / 180)), 12, a + 90); }
      s += K.eyes(100, 68, 8, 5.4, { iris: '#15803d', look: [0.3, 0.2] });
      s += K.blush(86, 76, 4) + K.blush(114, 76, 4) + K.mouth('smile', 100, 88, 8);
      // цветы у ног
      s += daisy(30, 174, 6, 10) + daisy(172, 174, 6) + K.leaf(40, 178, 10, -60, '#65a30d') + K.leaf(160, 178, 10, -120, '#65a30d');
      return s;
    },

    // Хель: владычица Хельхейма — одна половина её лица, волос и платья светлая, как иней, другая тёмная, как ночь.
    // Железная корона с бледными кристаллами, глаза светятся холодным голубым. Стоит в тёмных вратах своего царства
    // с фонарём, где горит холодный синий огонь, а над ладонью другой руки парит звёздочка
    no_hel(K) {
      const pale = { c1: '#f8fafc', c2: '#94a3b8', rim: '#e9d5ff', tex: false, lw: 2, line: '#1e1b4b' }, dark = { c1: '#5b57b8', c2: '#120f33', rim: '#e9d5ff', tex: false, lw: 2, line: '#05040f' };
      const half = () => clip(K, 'M-20 -20 H100 V220 H-20Z');
      let s = K.aura('#c084fc', 100, 100, 0.48) + K.aura('#22d3ee', 56, 70, 0.22);
      // тёмные врата Хельхейма с рунами
      s += P(K, 'M22 178 V72 C22 34 58 12 100 12 C142 12 178 34 178 72 V178 H160 V74 C160 46 134 30 100 30 C66 30 40 46 40 74 V178Z', '#312e81', { line: '#0b0a24', lw: 2.2 });
      s += rune(31, 100, 10, 'h', '#a5f3fc', 1.4, '#22d3ee') + rune(31, 130, 10, 'e', '#a5f3fc', 1.4, '#22d3ee') + rune(169, 100, 10, 'l', '#a5f3fc', 1.4, '#22d3ee') + rune(169, 130, 10, 'i', '#a5f3fc', 1.4, '#22d3ee');
      // волосы: светлая и тёмная половины
      const hairD = 'M74 60 C64 84 62 118 68 146 L132 146 C138 118 136 84 126 60 C118 44 82 44 74 60Z';
      s += K.vol(hairD, dark) + `<g clip-path="${half()}">${K.vol(hairD, pale)}</g>`;
      // платье: светлая половина в инее, тёмная — в звёздах
      const robe = 'M100 84 C122 84 136 100 140 122 C146 148 152 166 156 178 H44 C48 166 54 148 60 122 C64 100 78 84 100 84Z';
      s += K.vol(robe, { ...dark, lw: 3 }) + `<g clip-path="${half()}">${K.vol(robe, { ...pale, lw: 3 })}</g>`;
      s += `<g fill="#e9d5ff">` + [[118, 120], [130, 146], [112, 160], [140, 168]].map(([x, y]) => `<path d="${star5(x, y, 3.2, 0.45)}"/>`).join('') + '</g>';
      s += flake(78, 126, 5, '#64748b', '', 1.2, 0.7) + flake(68, 154, 4.4, '#64748b', '', 1.2, 0.7) + flake(88, 166, 3.6, '#64748b', '', 1.2, 0.6);
      s += K.line('M100 88 V178', '#a5f3fc', 2, { op: 0.8 }) + K.line('M46 172 Q100 182 154 172', '#a5f3fc', 2.4);
      // рука с фонарём холодного огня
      s += K.vol('M68 96 C58 106 52 118 52 128 C56 132 62 132 64 128 C66 118 70 110 76 104Z', pale) + K.vol(K.ell(56, 130, 6.4, 6), pale);
      s += K.line('M56 134 V142', '#334155', 1.6) + `<circle class="art-aura" cx="56" cy="156" r="18" fill="${K.rad([[0, '#e0fbff', 0.8], [0.4, '#22d3ee', 0.4], [1, '#22d3ee', 0]])}"/>`;
      s += P(K, 'M48 146 L56 141 L64 146Z', '#1e293b', { line: '#0b0f17', lw: 1.4 }) + `<rect x="49" y="146" width="14" height="18" rx="2" fill="#cffafe" fill-opacity=".5" stroke="#1e293b" stroke-width="1.8"/>` + K.flame(56, 162, 13, 8, '#e0fbff', '#22d3ee') + P(K, 'M47 164 H65 V168 H47Z', '#1e293b', { lw: 1.2, line: '#0b0f17' });
      // рука со звёздочкой
      s += K.vol('M132 96 C142 106 148 118 148 128 C144 132 138 132 136 128 C134 118 130 110 124 104Z', dark) + K.vol(K.ell(144, 130, 6.4, 6), dark);
      s += `<g class="art-float"><circle cx="146" cy="114" r="11" fill="${K.rad([[0, '#ffffff', 0.9], [0.5, '#e9d5ff', 0.5], [1, '#c084fc', 0]])}"/><path d="${star5(146, 114, 5.4, 0.45)}" fill="#fff"/></g>`;
      // лицо: половина светлая, половина тёмная, глаза светятся
      const face = K.ell(100, 70, 19, 20);
      s += K.vol(face, { ...dark, c1: '#4c4a9e', lw: 2.2 }) + `<g clip-path="${half()}">${K.vol(face, { ...pale, c1: '#ffffff', c2: '#cbd5e1', lw: 2.2 })}</g>`;
      s += K.glow(92, 72, 4, 4.6, '#22d3ee') + K.glow(108, 72, 4, 4.6, '#a5f3fc');
      s += K.line('M94 83 Q100 86 106 83', '#7c3aed', 2);
      // железная корона с бледными кристаллами
      s += P(K, 'M80 54 Q100 46 120 54 L120 60 Q100 52 80 60Z', '#334155', { line: '#0b0a24', lw: 1.6 });
      s += crystal(K, 86, 54, 12, 6, -14, '#e9d5ff', '#3b0764') + crystal(K, 114, 54, 12, 6, 14, '#e9d5ff', '#3b0764') + crystal(K, 100, 52, 18, 8, 0, '#cffafe', '#155e75');
      return s;
    },

    // Ньёрд: бог моря, ветров и богатых уловов — морская зелёная борода с ракушкой, бирюзовый плащ в волнах и рыбацкий свитер.
    // Стоит босиком в прибое и опирается на рулевое весло, а на протянутой руке сидит чайка — он кормит её крошками;
    // ещё одна чайка кружит над ним
    no_njord(K) {
      const skin = { c1: '#f5d2b0', c2: '#c98f68', rim: '#c8f3ff', tex: false, lw: 2.2, line: '#6a4428' }, sea = { c1: '#5eead4', c2: '#0f4c5c', rim: '#c8f3ff', line: '#042f2e' };
      const beardV = { c1: '#f0fdfa', c2: '#5eb8a8', rim: '#ffffff', tex: false, lw: 2, line: '#134e4a' };
      let s = K.aura('#38bdf8', 98, 100, 0.48);
      // чайка кружит
      s += `<g class="art-float">` + K.line('M146 30 q8 -8 16 0 q8 -8 16 0', '#334155', 4.4) + K.line('M146 30 q8 -8 16 0 q8 -8 16 0', '#f8fafc', 2.2) + '</g>';
      // рулевое весло
      s += K.line('M44 176 L56 34', '#3b1d0c', 7) + K.line('M44 176 L56 34', '#b07a42', 4) + P(K, 'M34 172 C32 152 38 140 46 138 C52 140 56 152 52 172Z', '#a0692c', { line: '#3b1d0c', lw: 1.8 });
      // плащ в волнах
      s += K.vol('M68 84 C52 110 44 150 40 178 H160 C156 150 148 110 132 84Z', sea);
      s += K.line('M48 150 q8 -6 16 0 t16 0 M140 150 q8 -6 16 0 M144 120 q6 -5 12 0', '#ccfbf1', 1.8, { op: 0.6 });
      // рыбацкий свитер с узором, пояс
      const body = 'M100 86 C120 86 132 100 134 120 C136 144 136 162 134 178 H66 C64 162 64 144 66 120 C68 100 80 86 100 86Z';
      s += K.vol(body, { c1: '#e0f2fe', c2: '#4b7a99', rim: '#c8f3ff', tex: false, line: '#0c2a3e' });
      s += `<g clip-path="${clip(K, body)}">` + K.line(zig(60, 140, 112, 8, 6), '#0f4c5c', 1.8) + K.line(zig(60, 140, 124, 8, 6), '#0f4c5c', 1.8) + K.line(zig(60, 140, 160, 8, 6), '#0f4c5c', 1.8) + '</g>';
      s += K.line('M66 140 Q100 148 134 140', '#3b1d0c', 7) + K.line('M66 140 Q100 148 134 140', '#a16207', 3.6) + K.rhomb(100, 144, 5, '#fbbf24', '#713f12');
      // рука на весле
      s += K.vol('M70 96 C60 104 54 114 52 124 C56 128 62 128 64 124 C66 116 70 110 76 104Z', { ...sea, tex: false, lw: 2 }) + K.vol(K.ell(52, 124, 7.4, 7), skin);
      // протянутая рука с чайкой и крошками
      s += limb(K, 'M130 96 Q154 102 164 118', '#5eead4', 12, '#042f2e', 0.3) + K.vol(K.ell(166, 120, 8.4, 7), skin);
      s += gull(K, 164, 115, 0.9) + `<g fill="#fde68a" stroke="#a16207" stroke-width=".5"><circle cx="176" cy="118" r="1.6"/><circle cx="180" cy="114" r="1.3"/><circle cx="183" cy="119" r="1.4"/></g>`;
      // голова: морская борода, волосы-волны
      s += K.vol(K.ell(100, 66, 19, 20), { ...skin, hiK: 0.16 });
      s += K.mirror(K.vol('M82 56 C74 64 72 76 76 86 C80 80 82 72 86 66Z', beardV));
      s += K.part('M80 60 C78 44 90 36 100 36 C112 36 122 44 120 60 C114 52 106 50 100 52 C94 50 86 52 80 60Z', '#ccfbf1', { line: '#134e4a', lw: 1.6 });
      s += K.vol('M80 74 C76 94 86 106 100 110 C114 106 124 94 120 74 C112 84 88 84 80 74Z', beardV);
      s += K.line('M90 88 q-2 8 2 14 M100 88 v18 M110 88 q2 8 -2 14', '#5eb8a8', 1.4, { op: 0.8 });
      s += `<g transform="translate(110 102) rotate(10) scale(.6)"><path d="M0 0L-4 -2C-11 -4 -12 -12 -7 -15C-3 -18 3 -18 7 -15C12 -12 11 -4 4 -2Z" fill="${K.lin(['#fff7ed', '#fdba74'])}" stroke="#7c2d12" stroke-width="2" stroke-linejoin="round"/></g>`;
      s += K.mirror(K.part('M100 82 C94 78 86 78 81 84 C83 87 89 87 92 85 C95 85 98 84 100 84Z', '#e0fdf8', { line: '#134e4a', lw: 1.3 }));
      s += K.eyes(100, 68, 8, 5.4, { iris: '#0d9488', look: [0.7, 0] });
      s += K.blush(86, 76, 3.8) + K.blush(114, 76, 3.8);
      // прибой у ног
      s += `<path d="M0 160 q12.5 -7 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 V186 H0Z" fill="${K.lin(['#38bdf8', '#0c4a6e'])}" opacity=".92"/>` + K.line('M0 160 q12.5 -7 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0', '#e0f2fe', 2.4);
      s += `<g fill="#fff" opacity=".85"><ellipse cx="80" cy="162" rx="9" ry="2.6"/><ellipse cx="122" cy="162" rx="9" ry="2.6"/></g>` + bub(160, 172, 3.4, -0.4) + bub(24, 172, 3, -1);
      return s;
    },

    // Скади: великанша-охотница, богиня зимы и лыж — белая меховая накидка с капюшоном, тёмная коса летит по ветру,
    // за спиной колчан со стрелами, в руке лук. Мчится на лыжах с горы — из-под лыж взлетает снежная пыль,
    // позади снежные вершины
    no_skadi(K) {
      const skin = { c1: '#fde7d2', c2: '#d9a07a', rim: '#c8f3ff', tex: false, lw: 2.2, line: '#7a4a2a' }, furV = { c1: '#ffffff', c2: '#93b4d6', rim: '#c8f3ff', tex: false, line: '#1e3a5f' };
      const navy = { c1: '#60a5fa', c2: '#172554', rim: '#c8f3ff', line: '#0b1533' };
      let s = K.aura('#38bdf8', 98, 100, 0.45);
      // снежные вершины и склон
      s += P(K, 'M0 122 L36 58 L58 92 L86 42 L120 98 L150 62 L200 126 V142 H0Z', '#c7d9ee', { line: '#1e3a5f', lw: 1.8 }) + `<path d="M28 72 L36 58 L44 70 L40 68 L36 74 L32 70Z M78 56 L86 42 L94 54 L89 52 L86 58 L82 54Z M142 74 L150 62 L158 72 L153 70 L150 76 L146 72Z" fill="#fff"/>`;
      s += `<path d="M0 154 L200 130 V186 H0Z" fill="${K.lin(['#ffffff', '#cfe3f5'])}" stroke="#94a3b8" stroke-width="1.4"/>`;
      s += flake(20, 30, 5) + flake(178, 30, 4.4, '#fff', '') + flake(112, 20, 3.6);
      // снежная пыль из-под лыж
      s += `<g class="art-float" fill="#fff" stroke="#cbd5e1" stroke-width=".8"><circle cx="24" cy="148" r="7"/><circle cx="12" cy="138" r="4.4"/><circle cx="34" cy="136" r="3.6"/><circle cx="8" cy="152" r="3.4"/></g>`;
      let g = '';
      // лыжи
      g += P(K, 'M34 162 H164 C172 162 178 158 180 150 C185 155 184 166 172 168 H34Z', '#a0692c', { line: '#3b1d0c', lw: 1.8 }) + K.line('M40 165 H160', '#fde68a', 1.2, { op: 0.6 });
      // коса летит по ветру
      g += K.g(plait(K, 84, 60, 6, 7, 10, '#8a4a1d', '#2a1206', false) + `<circle cx="84" cy="102" r="4" fill="#60a5fa" stroke="#172554" stroke-width="1.4"/>`, 'rotate(104 84 60)');
      // колчан со стрелами за спиной
      g += `<g transform="rotate(-30 78 96)">` + P(K, 'M71 76 H87 V118 H71Z', '#7c4a1d', { line: '#2a1606', lw: 1.6 }) + K.stitch('M71 84 H87 M71 110 H87', '#fde68a', 1.2) + K.line('M75 76 V62 M79 76 V60 M83 76 V63', '#3b1d0c', 1.8) +
        `<path d="M72 64 l3 -9 l3 9Z M76 62 l3 -9 l3 9Z M80 65 l3 -9 l3 9Z" fill="#ef4444" stroke="#7f1d1d" stroke-width=".9"/></g>`;
      // меховая накидка и тело
      g += K.vol('M100 80 C126 80 140 98 142 120 C144 140 138 152 130 156 H70 C62 152 56 140 58 120 C60 98 74 80 100 80Z', navy);
      g += K.vol('M64 96 C52 112 48 130 52 146 C60 140 66 128 70 112Z', furV) + K.stitch('M70 150 H130', '#e0f2fe', 1.6);
      g += K.line('M58 132 Q100 140 142 132', '#e2e8f0', 4) + K.rhomb(100, 136, 4.6, '#38bdf8', '#0c4a6e');
      // сапожки на лыжах
      g += K.mirror(P(K, 'M76 150 H96 V160 Q86 164 76 160Z', '#1e293b', { line: '#020617', lw: 1.6 }));
      // рука с луком
      g += limb(K, 'M134 98 Q156 100 152 112', '#3b82f6', 11, '#0b1533', 0.3);
      g += K.line('M156 62 C176 82 176 136 156 158', '#5a3414', 5) + K.line('M156 62 C176 82 176 136 156 158', '#c08a4a', 2.6) + K.line('M156 62 L156 158', '#e2e8f0', 1.2);
      g += K.vol(K.ell(158, 110, 7.4, 7), skin);
      // голова в меховом капюшоне
      g += K.vol(fluff(100, 66, 26, 26, 12, 1.8), furV);
      g += K.vol(K.ell(100, 68, 17, 18), skin);
      g += K.part('M84 64 C84 54 92 50 100 50 C108 50 116 54 116 64 C110 58 104 57 100 58 C96 57 90 58 84 64Z', '#8a4a1d', { line: '#2a1206', lw: 1.4 });
      g += K.eyes(100, 70, 7.4, 5.2, { iris: '#1d4ed8', lid: 'angry', skin: '#fde7d2', look: [0.7, 0] });
      g += K.blush(88, 78, 3.6) + K.blush(112, 78, 3.6) + K.mouth('smile', 102, 80, 8);
      s += K.g(g, 'rotate(-6 100 160)');
      s += K.line('M180 92 l12 -2 M176 104 l14 0 M180 116 l12 2', '#e0f2fe', 2, { op: 0.7, cls: 'art-float' });
      return s;
    },

    // Идунн: хранительница золотых яблок молодости — медная коса через плечо, в косе яблоневый цвет, весенне-зелёное платье
    // с белым фартуком. На руке корзинка с сияющими золотыми яблоками, одно она протягивает тебе; над ней ветка яблони
    // в цвету с золотыми яблоками, а на ветке поёт дрозд
    no_idunn(K) {
      const skin = { c1: '#fde7d2', c2: '#e0a882', rim: '#e4ffb0', tex: false, lw: 2.2, line: '#8a5a3a' }, dressV = { c1: '#bef264', c2: '#3f6212', rim: '#e4ffb0', line: '#1a2e05' };
      const apple = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${RG(K, 'apple', [[0, '#fffbe6'], [0.45, '#fde047'], [1, '#d97706']])}" stroke="#713f12" stroke-width="1.4"/>` + K.line(`M${x} ${f(y - r)} q1 ${f(-r * 0.5)} 3 ${f(-r * 0.6)}`, '#5a3414', 1.4) +
        `<ellipse cx="${f(x + r * 0.6)}" cy="${f(y - r * 0.95)}" rx="${f(r * 0.45)}" ry="${f(r * 0.22)}" transform="rotate(-30 ${f(x + r * 0.6)} ${f(y - r * 0.95)})" fill="#65a30d"/><circle cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.22)}" fill="#fff" opacity=".8"/>`;
      const blossom = (x, y, r) => `<g fill="#fdf2f8" stroke="#db2777" stroke-width=".6">${[0, 72, 144, 216, 288].map(a => `<circle cx="${f(x + r * 0.7 * Math.cos(a * Math.PI / 180))}" cy="${f(y + r * 0.7 * Math.sin(a * Math.PI / 180))}" r="${f(r * 0.6)}"/>`).join('')}</g><circle cx="${x}" cy="${y}" r="${f(r * 0.35)}" fill="#fde047"/>`;
      let s = K.aura('#84cc16', 98, 104, 0.45) + K.aura('#facc15', 44, 138, 0.3);
      // ветка яблони в цвету с золотыми яблоками и дроздом
      s += K.line('M0 30 C40 22 80 32 120 22 C150 14 176 20 200 12', '#3b1d0c', 7) + K.line('M0 30 C40 22 80 32 120 22 C150 14 176 20 200 12', '#8a5a2c', 3.4);
      s += K.leaf(30, 26, 12, 60, '#65a30d') + K.leaf(96, 28, 12, 120, '#4d7c0f') + K.leaf(140, 18, 12, 70, '#65a30d') + K.leaf(176, 16, 11, 110, '#4d7c0f');
      s += blossom(20, 22, 5) + blossom(74, 26, 5.4) + blossom(120, 18, 5) + blossom(186, 10, 5);
      s += K.line('M58 30 V38 M160 18 V26', '#5a3414', 1.4) + apple(58, 44, 7) + apple(160, 32, 7);
      s += `<g transform="translate(100 24)"><ellipse cx="0" cy="-6" rx="9" ry="6.4" fill="${L(K, '#a16207')}" stroke="#3b1d0c" stroke-width="1.4"/><path d="M-8 -6 L-16 -2 L-8 -2Z" fill="#78350f" stroke="#3b1d0c" stroke-width="1"/><circle cx="6" cy="-10" r="5" fill="${L(K, '#a16207')}" stroke="#3b1d0c" stroke-width="1.4"/><path d="M10 -10 L16 -11 L10 -8Z" fill="#fbbf24"/><circle cx="7" cy="-11" r="1.2" fill="${K.INK}"/><ellipse cx="2" cy="-4" rx="4" ry="3" fill="#fde68a" opacity=".8"/></g>`;
      s += note(118, 48, 6, '#f7fee7', -0.4) + note(132, 56, 5, '#d9f99d', -1.1);
      // платье и белый фартук
      const dress = 'M100 90 C118 90 128 104 132 122 C136 144 144 162 150 176 C124 182 76 182 50 176 C56 162 64 144 68 122 C72 104 82 90 100 90Z';
      s += K.vol(dress, dressV);
      s += P(K, 'M86 118 H114 L120 172 H80Z', '#ffffff', { line: '#64748b', lw: 1.4 }) + K.stitch('M82 166 H118', '#f472b6', 1.4);
      s += K.line('M54 170 Q100 180 146 170', '#fbbf24', 3) + blossom(66, 150, 3.4) + blossom(134, 154, 3.4) + blossom(60, 166, 3) + blossom(140, 168, 3);
      // корзинка с золотыми яблоками на левой руке
      s += K.vol('M72 100 C60 108 54 120 56 132 C60 136 66 136 68 132 C68 122 72 114 78 108Z', { ...dressV, tex: false, lw: 2 });
      s += `<circle class="art-aura" cx="56" cy="138" r="26" fill="${K.rad([[0, '#fffbe6', 0.8], [0.5, '#fde047', 0.35], [1, '#facc15', 0]])}"/>`;
      s += apple(46, 134, 7) + apple(58, 130, 7.4) + apple(68, 136, 6.6);
      s += K.line('M36 136 C36 118 76 118 76 136', '#78350f', 3.4) + P(K, 'M34 136 H78 L72 156 H40Z', '#c08a4a', { line: '#5a3414', lw: 1.8 }) + K.line('M36 142 H76 M38 148 H74 M47 136 L49 156 M56 136 V156 M65 136 L63 156', '#7c4a1d', 1.2, { op: 0.8 });
      s += K.vol(K.ell(62, 136, 6, 5.6), skin);
      // правая рука протягивает яблоко
      s += limb(K, 'M128 100 Q148 106 150 124', '#a3e635', 11, '#1a2e05', 0.3) + K.vol(K.ell(150, 128, 7.4, 7), skin);
      s += `<circle class="art-aura" cx="152" cy="118" r="16" fill="${K.rad([[0, '#fffbe6', 0.9], [1, '#fde047', 0]])}"/>` + apple(152, 118, 9);
      // голова, медная коса через плечо с яблоневым цветом
      s += K.vol(K.ell(100, 70, 19, 20), skin);
      s += K.part('M80 68 C78 52 90 46 100 46 C112 46 122 52 120 68 C114 60 106 58 100 60 C94 58 86 60 80 68Z', '#c2410c', { line: '#431407', lw: 1.6 });
      s += plait(K, 116, 86, 5, 7, 9, '#ea580c', '#431407', false) + blossom(117, 124, 4) + blossom(88, 50, 4.6) + blossom(110, 48, 4);
      s += K.eyes(100, 72, 8, 5.8, { iris: '#65a30d', look: [0.4, 0.2], lash: true });
      s += K.blush(87, 80, 4.2) + K.blush(113, 80, 4.2) + K.mouth('smile', 100, 82, 9);
      return s;
    },

    // Валькирия: дева-воительница Одина летит над облаками — за спиной большие лебединые крылья, на голове шлем
    // с крылышками, две золотые косы, кольчуга и алая юбка. В одной руке копьё с алым флажком, в другой — круглый щит
    no_valkiriya(K) {
      const skin = { c1: '#fde7d2', c2: '#d9a07a', rim: '#eef0ff', tex: false, lw: 2.2, line: '#7a4a2a' }, mail = { c1: '#dbe3ee', c2: '#475569', rim: '#eef0ff', tex: false, line: '#0f172a' };
      const featherV = { c1: '#ffffff', c2: '#a5b4fc', rim: '#eef0ff', tex: false, lw: 2.2, line: '#334155' };
      let s = K.aura('#a5b4fc', 100, 100, 0.5) + K.aura('#ffffff', 56, 80, 0.3);
      // облака
      s += cloud(40, 170, 34, '#eef2ff') + cloud(160, 172, 30, '#eef2ff');
      // лебединые крылья
      const wing = `<g class="art-wing">` + K.vol('M80 96 C62 72 40 54 12 46 C18 56 18 62 10 68 C20 72 22 78 12 86 C24 88 26 94 18 102 C30 102 34 108 28 116 C42 114 48 120 44 128 C58 120 70 114 82 112Z', featherV) +
        K.line('M24 58 C46 70 62 86 76 102 M20 76 C40 84 58 96 74 106 M22 94 C38 98 54 104 70 110', '#94a3b8', 1.4, { op: 0.7 }) + '</g>';
      s += K.mirror(wing);
      // копьё с алым флажком
      s += K.line('M150 176 L166 26', '#3b1d0c', 5) + K.line('M150 176 L166 26', '#a0692c', 2.6) + P(K, 'M166 10 L171 26 L161 26Z', '#e2e8f0', { line: '#1e293b', lw: 1.6 });
      s += `<path class="art-sway" d="M164 30 C176 28 184 34 192 30 C186 38 178 40 166 40Z" fill="${L(K, '#ef4444')}" stroke="#7f1d1d" stroke-width="1.4" stroke-linejoin="round"/>`;
      // алая юбка и кольчуга
      s += K.vol('M74 120 C66 140 60 160 58 176 H142 C140 160 134 140 126 120Z', { c1: '#f87171', c2: '#7f1d1d', rim: '#eef0ff', line: '#450a0a' });
      s += K.stitch('M60 170 H140', '#fde68a', 1.8);
      const body = 'M100 84 C118 84 128 96 130 112 C132 124 130 130 126 134 H74 C70 130 68 124 70 112 C72 96 82 84 100 84Z';
      s += K.vol(body, mail);
      s += `<g clip-path="${clip(K, body)}" opacity=".4">` + [0, 1, 2, 3, 4, 5].map(i => K.line(`M64 ${90 + i * 8} q4 4 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0`, '#0f172a', 1.1)).join('') + '</g>';
      s += K.line('M72 128 Q100 136 128 128', '#78350f', 6) + K.line('M72 128 Q100 136 128 128', '#fbbf24', 3);
      // рука с копьём
      s += limb(K, 'M128 96 Q148 104 154 122', '#dbe3ee', 11, '#0f172a', 0.3) + K.vol(K.ell(155, 124, 7.4, 7), skin);
      // рука со щитом
      s += limb(K, 'M72 96 Q56 106 54 124', '#dbe3ee', 11, '#0f172a', 0.3) + vshield(K, 50, 130, 24, ['#f1f5f9', '#dc2626']);
      // золотые косы
      s += plait(K, 84, 84, 6, 7.4, 9, '#fcd34d', '#8a4a08') + plait(K, 116, 84, 6, 7.4, 9, '#fcd34d', '#8a4a08');
      // голова и шлем с крылышками
      s += K.vol(K.ell(100, 70, 18, 19), skin);
      s += K.part('M82 70 C82 58 90 54 100 54 C110 54 118 58 118 70 C112 64 106 62 100 64 C94 62 88 64 82 70Z', '#fcd34d', { line: '#8a4a08', lw: 1.4 });
      s += K.mirror(`<g class="art-wing">` + K.part('M82 54 C70 48 62 38 60 26 C66 32 70 34 74 36 C70 30 68 24 70 18 C76 26 82 38 86 48Z', '#ffffff', { line: '#334155', lw: 1.6 }) + '</g>');
      s += K.vol('M82 60 C80 42 90 34 100 34 C110 34 120 42 118 60 C112 56 106 55 100 55 C94 55 88 56 82 60Z', { c1: '#f1f5f9', c2: '#64748b', rim: '#eef0ff', tex: false, lw: 2.2, line: '#0f172a' });
      s += P(K, 'M80 56 Q100 49 120 56 L120 62 Q100 55 80 62Z', '#fbbf24', { line: '#713f12', lw: 1.4 });
      s += K.eyes(100, 72, 7.6, 5.4, { iris: '#0ea5e9', lid: 'angry', skin: '#fde7d2', look: [0.3, 0] });
      s += K.blush(88, 80, 3.6) + K.blush(112, 80, 3.6) + K.mouth('smile', 100, 82, 8);
      s += K.spark(30, 30, 3.4, '#ffffff', 'art-float') + K.spark(110, 18, 2.6, '#e0e7ff');
      return s;
    },

    // Норны: Урд, Верданди и Скульд — Было, Есть и Будет — у колодца судьбы под корнями Мирового древа.
    // Седая Урд держит клубок, юная Верданди прядёт из него нить, а Скульд под вуалью вырезает руны на дощечке;
    // в светящемся колодце плавает лебедь — от лебедей этого колодца пошли все лебеди на свете
    no_norny(K) {
      const skinV = { c1: '#fde7d2', c2: '#d9a07a', rim: '#e9d5ff', tex: false, lw: 2, line: '#7a4a2a' };
      let s = K.aura('#c084fc', 100, 100, 0.48) + K.aura('#fbbf24', 50, 150, 0.25);
      // корни Мирового древа аркой
      s += K.line('M0 40 C30 20 60 34 80 18 C90 10 110 10 120 18 C140 34 170 20 200 40', '#3b1d0c', 13) + K.line('M0 40 C30 20 60 34 80 18 C90 10 110 10 120 18 C140 34 170 20 200 40', '#8a5a2c', 7);
      s += K.line('M20 34 C16 50 20 64 12 76 M180 34 C184 50 180 64 188 76', '#3b1d0c', 7) + K.line('M20 34 C16 50 20 64 12 76 M180 34 C184 50 180 64 188 76', '#8a5a2c', 3.4);
      // светящийся колодец судьбы
      s += `<ellipse cx="100" cy="166" rx="56" ry="12" fill="${K.rad([[0, '#fffbe6', 0.9], [0.5, '#fde047', 0.5], [1, '#c084fc', 0.2]])}" stroke="#3b0764" stroke-width="2"/>`;
      s += K.line('M58 168 q14 -4 28 0 t28 0 t28 0', '#fff7cc', 1.4, { op: 0.8 });
      // Урд — седая, слева
      s += K.vol('M50 92 C66 92 74 106 76 124 C78 144 80 160 82 172 H18 C20 160 22 144 24 124 C26 106 34 92 50 92Z', { c1: '#c4b5fd', c2: '#3b2a6b', rim: '#e9d5ff', line: '#1e1038' });
      s += K.vol('M36 80 C34 64 42 56 50 56 C58 56 66 64 64 80 C62 92 38 92 36 80Z', { c1: '#f8fafc', c2: '#94a3b8', rim: '#e9d5ff', tex: false, lw: 1.8, line: '#334155' });
      s += K.vol(K.ell(50, 80, 11, 12), skinV) + K.closed(50, 81, 4.6, 3, true) + K.line('M44 74 q3 -2 5 0 M51 74 q3 -2 5 0', '#94a3b8', 1.6) + K.mouth('smile', 50, 86, 5);
      s += `<circle cx="52" cy="122" r="9" fill="${L(K, '#fbbf24')}" stroke="#713f12" stroke-width="1.6"/>` + K.line('M45 118 q7 5 14 0 M44 124 q8 5 16 0 M47 129 q5 3 10 0', '#a16207', 1.1) + K.vol(K.ell(42, 128, 5.4, 5), skinV);
      // Скульд — под вуалью, справа
      s += K.vol('M150 92 C166 92 174 106 176 124 C178 144 180 160 182 172 H118 C120 160 122 144 124 124 C126 106 134 92 150 92Z', { c1: '#818cf8', c2: '#1e1b6b', rim: '#e9d5ff', line: '#0b0a2e' });
      s += K.vol('M136 82 C134 62 142 54 150 54 C158 54 166 62 164 82 C166 96 162 104 158 108 H142 C138 104 134 96 136 82Z', { c1: '#e0e7ff', c2: '#6366f1', rim: '#e9d5ff', tex: false, lw: 1.8, line: '#1e1b6b' });
      s += K.vol(K.ell(150, 80, 11, 12), skinV) + K.eyes(150, 81, 4.4, 3.4, { iris: '#7c3aed', look: [-0.4, 0.4], lash: true }) + K.mouth('smile', 150, 87, 5);
      s += P(K, 'M140 110 L162 128 L158 133 L136 115Z', '#c08a4a', { line: '#5a3414', lw: 1.4 }) + rune(144, 116, 6, 'f', '#3b1d0c', 1.2) + rune(150, 121, 6, 'u', '#3b1d0c', 1.2) + rune(156, 126, 6, 'th', '#3b1d0c', 1.2);
      s += K.vol(K.ell(160, 132, 5.4, 5), skinV);
      // Верданди — в центре, прядёт нить
      s += K.vol('M100 84 C120 84 130 100 132 120 C134 144 136 160 138 174 H62 C64 160 66 144 68 120 C70 100 80 84 100 84Z', { c1: '#ddd6fe', c2: '#4c1d95', rim: '#fde68a', line: '#2e1065' });
      s += K.stitch('M66 168 H134', '#fbbf24', 1.8) + K.line('M70 118 Q100 126 130 118', '#fbbf24', 3);
      s += K.vol('M80 66 C76 52 86 42 100 42 C114 42 124 52 120 66 C126 84 122 100 116 106 H84 C78 100 74 84 80 66Z', { c1: '#fde68a', c2: '#b7791f', rim: '#fff6b0', tex: false, lw: 2, line: '#713f12' });
      s += K.vol(K.ell(100, 70, 15, 16), skinV) + K.eyes(100, 72, 6.4, 4.8, { iris: '#a16207', look: [0, 0.4], lash: true }) + K.blush(90, 79, 3) + K.blush(110, 79, 3) + K.mouth('smile', 100, 80, 6);
      s += rune(100, 52, 8, 'd', '#fde047', 1.4, '#fbbf24');
      // нить судьбы: от клубка Урд через руки Верданди к Скульд
      s += K.line('M58 120 C72 112 84 104 94 108 C104 112 112 104 120 106 C130 108 136 112 140 116', '#fde047', 2.2) + K.line('M58 120 C72 112 84 104 94 108 C104 112 112 104 120 106 C130 108 136 112 140 116', '#fffbe6', 0.8);
      s += K.mirror(K.vol(K.ell(92, 108, 5.6, 5.2), skinV));
      // лебедь на воде
      s += `<g class="art-float"><path d="M106 166 C110 158 124 158 128 164 C124 170 110 170 106 166Z" fill="#fff" stroke="#475569" stroke-width="1.4"/><path d="M110 164 C106 156 104 148 110 146 C114 146 114 150 112 152" fill="none" stroke="#475569" stroke-width="3.4" stroke-linecap="round"/><path d="M110 164 C106 156 104 148 110 146 C114 146 114 150 112 152" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M112 148 l4 1 l-4 1.4Z" fill="#f97316"/></g>`;
      return s;
    },

    // Мимир: мудрейший из мудрых поднимается из своего каменного колодца — седая борода стекает прямо в воду, синий плащ,
    // обруч с голубым камнем. Он пьёт мудрость из рога и опирается на край колодца; на камнях светятся руны,
    // вода закручивается светящимися кругами
    no_mimir(K) {
      const skinV = { c1: '#f3d2b0', c2: '#b8876a', rim: '#c8f3ff', tex: false, lw: 2.2, line: '#6a4428' }, beard = { c1: '#ffffff', c2: '#a7c4dc', rim: '#e0f7ff', tex: false, lw: 2.2, line: '#334155', shadeK: 0.3 };
      let s = K.aura('#38bdf8', 100, 100, 0.5) + K.aura('#ffffff', 46, 70, 0.25);
      s += K.line(swirl(26, 60, 12, 1.4, 1), '#bae6fd', 2, { op: 0.6, cls: 'art-spin-soft' }) + K.line(swirl(176, 54, 12, 1.4, -1), '#bae6fd', 2, { op: 0.6, cls: 'art-spin-soft' });
      // плечи и плащ над водой
      s += K.vol('M100 70 C130 70 150 86 154 108 C156 118 156 126 154 132 H46 C44 126 44 118 46 108 C50 86 70 70 100 70Z', { c1: '#60a5fa', c2: '#0c2a5e', rim: '#c8f3ff', line: '#06172e' });
      s += K.stitch('M60 92 Q100 82 140 92', '#e2e8f0', 1.6);
      // рука с рогом
      s += K.vol('M132 92 C144 96 150 104 150 114 C146 118 140 118 138 114 C136 108 132 104 126 102Z', { c1: '#60a5fa', c2: '#0c2a5e', rim: '#c8f3ff', tex: false, lw: 2, line: '#06172e' });
      s += K.vol('M136 84 C150 70 168 66 180 72 L174 84 C164 82 154 86 146 96Z', { c1: '#fff7e6', c2: '#c8a26a', rim: '#c8f3ff', tex: false, lw: 2, line: '#5a3a14' }) + K.line('M156 76 l4 9 M166 72 l3 9', '#d97706', 2.4) + `<ellipse cx="177" cy="78" rx="4" ry="7" transform="rotate(20 177 78)" fill="#bae6fd" stroke="#5a3a14" stroke-width="1.6"/>`;
      s += `<path class="art-float" d="M176 92 q-3 5 0 7 q3 -2 0 -7Z" fill="#bae6fd" stroke="#0c4a6e" stroke-width=".8"/>`;
      s += K.vol(K.ell(146, 112, 7.4, 7), skinV);
      // голова: седые волосы, обруч, мудрые глаза
      s += K.vol('M74 60 C70 40 84 28 100 28 C116 28 130 40 126 60 C130 74 126 86 120 92 H80 C74 86 70 74 74 60Z', beard);
      s += K.vol(K.ell(100, 60, 19, 20), skinV);
      s += K.line('M80 46 Q100 38 120 46', '#fbbf24', 3.4) + K.rhomb(100, 42, 4.6, '#38bdf8', '#0c4a6e');
      s += K.eyes(100, 62, 8, 5.4, { iris: '#0369a1', lid: 'half', skin: '#f3d2b0', look: [0.2, 0.3] });
      s += K.line('M84 54 Q91 50 97 54 M116 54 Q109 50 103 54', '#ffffff', 3.4);
      s += `<ellipse cx="100" cy="72" rx="5" ry="4" fill="#d9a07a" stroke="#6a4428" stroke-width="1.2"/>`;
      // борода стекает в воду
      s += K.vol('M80 70 C74 92 80 118 88 136 L100 148 L112 136 C120 118 126 92 120 70 C112 80 88 80 80 70Z', beard);
      s += K.line('M90 88 q-4 18 2 40 M100 86 v52 M110 88 q4 18 -2 40', '#a7c4dc', 1.6);
      s += K.mirror(K.part('M100 78 C93 74 83 74 78 81 C80 85 87 85 91 83 C95 82 98 81 100 80Z', '#ffffff', { line: '#334155', lw: 1.4 }));
      // каменный колодец с рунами
      s += `<ellipse cx="100" cy="134" rx="62" ry="12" fill="${K.rad([[0, '#e0f7ff', 0.95], [0.5, '#38bdf8', 0.7], [1, '#0c4a6e', 0.9]])}"/>`;
      s += K.line(swirl(100, 134, 40, 1.2, 1, 0.26), '#e0f7ff', 1.8, { op: 0.8 });
      s += K.vol('M38 134 C38 142 40 166 44 176 H156 C160 166 162 142 162 134 C152 146 48 146 38 134Z', { c1: '#9aa3b2', c2: '#2b3240', rim: '#c8f3ff', tex: false, line: '#141821' });
      s += K.line('M42 154 Q100 166 158 154 M46 168 Q100 178 154 168 M70 146 V160 M100 148 V164 M130 146 V160 M56 160 V172 M86 164 V176 M116 164 V176 M146 160 V172', '#141821', 1.4, { op: 0.6 });
      s += rune(56, 152, 8, 'm', '#a5f3fc', 1.4, '#22d3ee') + rune(85, 156, 8, 'i', '#a5f3fc', 1.4, '#22d3ee') + rune(115, 156, 8, 'm', '#a5f3fc', 1.4, '#22d3ee') + rune(144, 152, 8, 'r', '#a5f3fc', 1.4, '#22d3ee');
      s += `<path d="M38 134 C48 146 152 146 162 134" fill="none" stroke="#c8f3ff" stroke-width="2" opacity=".7"/>`;
      // рука на краю колодца
      s += K.vol(K.ell(60, 138, 8, 6.6), skinV);
      s += bub(30, 112, 4, -0.4) + bub(172, 120, 3.4, -1) + bub(150, 30, 3, -0.7);
      return s;
    },

    // Соль: богиня Солнца мчит по небу — за ней сияет огромный золотой диск с узорами-спиралями, как у древней колесницы
    // из Трундхольма, волосы струятся языками пламени, в руках поводья солнечных коней. Спешит не зря: внизу за ней
    // гонится волк Сколль — пока, к счастью, совсем маленький
    no_sol(K) {
      const skinV = { c1: '#fff1e0', c2: '#e0a070', rim: '#ffe29a', tex: false, lw: 2.2, line: '#8a4a1a' }, dressV = { c1: '#fde68a', c2: '#c2410c', rim: '#ffe29a', line: '#5a1406' };
      let s = K.aura('#ff9a3d', 100, 96, 0.55);
      // солнечный диск с узорами-спиралями
      s += `<circle class="art-aura" cx="100" cy="76" r="70" fill="${K.rad([[0.4, '#fff3b0', 0.8], [1, '#fbbf24', 0]])}"/>`;
      s += `<circle cx="100" cy="76" r="56" fill="${K.rad([[0, '#fffbe6'], [0.55, '#fde047'], [1, '#f59e0b']])}" stroke="#b45309" stroke-width="2.4"/>`;
      s += `<circle cx="100" cy="76" r="48" fill="none" stroke="#d97706" stroke-width="1.6" opacity=".8"/><circle cx="100" cy="76" r="44" fill="none" stroke="#d97706" stroke-width="1" opacity=".7"/>`;
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, x = f(100 + 50 * Math.cos(a)), y = f(76 + 50 * Math.sin(a)); s += K.line(swirl(+x, +y, 4, 1.3, 1), '#b45309', 1.2, { op: 0.8 }); }
      // поводья солнечных коней
      s += K.line('M66 122 C40 116 20 108 2 112 M70 126 C44 122 22 118 2 124', '#7c2d12', 2.2);
      // платье
      const dress = 'M100 92 C118 92 128 106 130 124 C134 146 142 162 150 176 H50 C58 162 66 146 70 124 C72 106 82 92 100 92Z';
      s += K.vol(dress, dressV);
      s += K.line('M54 170 Q100 180 146 170', '#fbbf24', 3.4) + K.stitch('M56 164 Q100 173 144 164', '#fff7cc', 1.4);
      s += K.line('M72 124 Q100 132 128 124', '#7c2d12', 5) + K.line('M72 124 Q100 132 128 124', '#fde047', 2.6) + `<circle cx="100" cy="129" r="5" fill="${L(K, '#fde047')}" stroke="#7c2d12" stroke-width="1.4"/>`;
      // руки держат поводья
      s += K.mirror(K.vol('M74 100 C64 108 60 118 64 126 C68 130 74 128 76 124 C76 116 80 110 84 106Z', { ...dressV, tex: false, lw: 2 }));
      s += K.vol(K.ell(66, 124, 6.4, 6), skinV) + K.vol(K.ell(134, 124, 6.4, 6), skinV) + K.line('M134 124 C110 132 90 132 70 126', '#7c2d12', 2);
      // волосы — языки пламени
      s += K.flame(78, 74, 34, 22, '#ffd23f', '#e8431a', { style: 'animation-delay:-.4s' }) + K.flame(122, 74, 34, 22, '#ffd23f', '#e8431a', { style: 'animation-delay:-.9s' }) + K.flame(100, 52, 36, 26, '#fff3b0', '#f97316');
      s += K.vol('M80 66 C76 82 74 98 78 110 L88 104 C86 92 86 80 88 70Z', { c1: '#fb923c', c2: '#9a2a0c', tex: false, lw: 1.8, line: '#4a0f06' }) + K.vol('M120 66 C124 82 126 98 122 110 L112 104 C114 92 114 80 112 70Z', { c1: '#fb923c', c2: '#9a2a0c', tex: false, lw: 1.8, line: '#4a0f06' });
      // лицо и венец-лучи
      s += K.vol(K.ell(100, 72, 18, 19), skinV);
      s += K.part('M82 70 C82 56 90 52 100 52 C110 52 118 56 118 70 C112 64 106 62 100 64 C94 62 88 64 82 70Z', '#f97316', { line: '#7c2d12', lw: 1.4 });
      s += `<path d="M84 56 L88 46 L92 54 L100 40 L108 54 L112 46 L116 56Z" fill="${L(K, '#fde047')}" stroke="#92400e" stroke-width="1.4" stroke-linejoin="round"/>`;
      s += K.eyes(100, 74, 7.6, 5.6, { iris: '#ea580c', look: [-0.4, 0.2], lash: true });
      s += K.blush(88, 82, 4) + K.blush(112, 82, 4) + K.mouth('smile', 100, 84, 8);
      // волк Сколль гонится, совсем маленький
      const wolf = { c1: '#94a3b8', c2: '#1e293b', rim: '#ffe29a', tex: false, lw: 1.8, line: '#0f172a' };
      s += `<g class="art-float">` + K.vol('M14 168 C14 158 24 152 36 154 C44 155 48 160 46 166 C44 172 20 174 14 168Z', wolf) + K.line('M14 162 C8 158 6 152 10 148', '#1e293b', 4) +
        K.line('M20 170 l-2 6 M28 172 l0 6 M38 170 l2 6', '#1e293b', 2.6) + K.vol('M40 150 C46 144 56 146 58 154 C58 158 52 160 46 160 C42 160 38 156 40 150Z', wolf) +
        K.part('M42 148 L42 140 L48 146Z', '#64748b', { line: '#0f172a', lw: 1.2 }) + `<circle cx="51" cy="151" r="1.6" fill="${K.INK}"/><path d="M56 157 q2 4 -1 6 q-2 -1 -1 -5Z" fill="#f472b6"/>` + '</g>';
      return s;
    },

    // Сурт (легенда): владыка огненного Муспельхейма — исполин в доспехах из чёрного обсидиана, по которым бегут огненные
    // трещины; корона из рогов и пламени, глаза-угли, борода из огня. Вздымает пылающий меч, что сияет ярче солнца;
    // позади огненный плащ и дымящиеся вулканы
    no_surt(K) {
      const obs = { c1: '#57534e', c2: '#0c0a09', rim: '#ffb347', rimK: 0.75, line: '#000000' }, obsS = { ...obs, tex: false, lw: 2.4 };
      let s = K.aura('#ff9a3d', 100, 98, 0.6) + K.aura('#dc2626', 70, 130, 0.35);
      // вулканы Муспельхейма
      s += P(K, 'M0 178 L22 120 L34 126 L52 178Z', '#292524', { line: '#0c0a09', lw: 1.8 }) + P(K, 'M148 178 L168 116 L180 122 L200 178Z', '#292524', { line: '#0c0a09', lw: 1.8 });
      s += K.flame(28, 122, 18, 12, '#fff3b0', '#f97316', { style: 'animation-delay:-.5s' }) + K.flame(174, 118, 20, 13, '#fff3b0', '#f97316', { style: 'animation-delay:-1.1s' });
      s += K.line('M28 126 L22 150 L30 168 M174 122 L180 146 L172 170', '#f97316', 2.4, { op: 0.9 });
      // огненный плащ за спиной
      [[46, 152, 72, 40, -0.3], [154, 152, 72, 40, -0.9], [58, 114, 66, 36, -1.2], [142, 114, 66, 36, -0.5]].forEach(([x, y, h, w, d]) => { s += K.flame(x, y, h, w, '#ffd23f', '#c2330f', { style: `animation-delay:${d}s` }); });
      // доспех из обсидиана с огненными трещинами
      const body = 'M100 80 C128 80 146 94 152 116 C158 142 162 162 166 178 H34 C38 162 42 142 48 116 C54 94 72 80 100 80Z';
      s += K.vol(body, obs);
      const cracks = 'M60 100 L74 116 L68 134 L80 150 L74 176 M140 100 L126 118 L132 136 L120 152 L128 176 M74 116 L96 120 M126 118 L104 122 M100 160 L96 168 L104 176';
      s += `<g clip-path="${clip(K, body)}">` + K.line(cracks, '#7c2d12', 6) + K.line(cracks, '#fde047', 2.2, { cls: 'art-blink' }) + '</g>';
      // пояс с раскалённой пряжкой-руной
      s += K.line('M48 142 Q100 154 152 142', '#1c1917', 11) + K.line('M48 142 Q100 154 152 142', '#44403c', 7) + `<circle cx="100" cy="149" r="9" fill="${K.rad([[0, '#fffbe6'], [0.5, '#fde047'], [1, '#ea580c']])}" stroke="#000" stroke-width="2"/>` + rune(100, 149, 9, 's', '#7c2d12', 1.6);
      // левый кулак в огне
      s += K.vol('M56 94 C42 104 36 120 38 136 C42 142 52 142 54 136 C54 124 58 112 66 104Z', obsS);
      s += K.flame(45, 132, 26, 18, '#fff3b0', '#f97316', { style: 'animation-delay:-.7s' }) + K.vol(K.ell(45, 140, 10.4, 9.6), obsS) + K.line('M38 138 h14 M38 143 h14', '#f97316', 1.4, { op: 0.8 });
      // пылающий меч ярче солнца
      s += `<circle class="art-aura" cx="176" cy="52" r="34" fill="${K.rad([[0, '#ffffff', 0.9], [0.35, '#fde047', 0.55], [1, '#f97316', 0]])}"/>`;
      s += `<g transform="translate(160 98) rotate(28)"><path d="M-7 0 C-10 -20 -6 -40 -9 -58 C-4 -64 -2 -72 0 -82 C2 -72 4 -64 9 -58 C6 -40 10 -20 7 0Z" fill="${K.lin(['#fffbe6', '#fde047', '#f97316'])}" stroke="#9a3412" stroke-width="2" stroke-linejoin="round"/>` +
        `<path d="M-2.4 -4 C-3 -24 -1 -44 0 -70 C1 -44 3 -24 2.4 -4Z" fill="#ffffff" opacity=".9"/>` + P(K, 'M-16 0 H16 V6 H-16Z', '#1c1917', { line: '#000', lw: 1.6 }) + K.line('M-14 3 H14', '#f97316', 1.4) + P(K, 'M-3 6 V20 H3 V6Z', '#44403c', { line: '#000', lw: 1.2 }) + `<circle cx="0" cy="23" r="4.4" fill="${L(K, '#ea580c')}" stroke="#000" stroke-width="1.4"/></g>`;
      s += K.vol('M138 92 C152 92 162 100 162 110 C158 116 150 116 146 112 C144 106 140 102 132 100Z', obsS) + K.vol(K.ell(154, 110, 10, 9.4), obsS);
      // голова: корона из рогов и пламени, глаза-угли, огненная борода
      s += K.flame(100, 52, 40, 30, '#fff3b0', '#f97316') + K.flame(80, 56, 28, 20, '#ffd23f', '#e8431a', { style: 'animation-delay:-.4s' }) + K.flame(120, 56, 28, 20, '#ffd23f', '#e8431a', { style: 'animation-delay:-.9s' });
      s += K.mirror(K.part('M80 58 C66 50 60 36 64 22 C70 32 78 40 88 46Z', '#1c1917', { line: '#000', lw: 1.8 }) + K.line('M68 32 C70 40 76 46 84 50', '#f97316', 1.4, { op: 0.8 }));
      s += K.vol(K.ell(100, 70, 22, 22), { ...obsS, c1: '#78716c' });
      s += K.line('M84 80 L92 84 M116 80 L108 84', '#f97316', 1.6, { op: 0.8 });
      s += `<g transform="rotate(180 100 88)">${K.flame(100, 88, 30, 34, '#fff3b0', '#f97316', { style: 'animation-delay:-.2s' })}</g>`;
      s += K.glow(91, 68, 4.4, 4, '#fde047') + K.glow(109, 68, 4.4, 4, '#fde047');
      s += K.line('M80 58 L95 63 M120 58 L105 63', '#000', 3.4);
      s += K.mouth('teeth', 100, 80, 18);
      s += P(K, 'M80 54 L84 42 L90 50 L95 38 L100 48 L105 38 L110 50 L116 42 L120 54Z', '#1c1917', { line: '#000', lw: 1.6 }) + `<g fill="#fde047">` + [[84, 46], [95, 42], [105, 42], [116, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8"/>`).join('') + '</g>';
      s += ember(K, 20, 40, 4.4, -0.4) + ember(K, 30, 90, 3.6, -1.1) + ember(K, 186, 140, 3.6, -0.7) + ember(K, 136, 20, 3.2, -1.4);
      return s;
    },

    // Нидхёгг (легенда): исполинский дракон у корней Мирового древа — тёмно-фиолетовая чешуя с переливом, шипы по хребту,
    // рога, перепончатые крылья и зелёные светящиеся глаза. Свернулся кольцами внизу и, ворча, грызёт толстый корень,
    // а наверху из-за корня выглядывает белка Рататоск с очередной ехидной запиской
    no_nidhogg(K) {
      const wingV = { c1: '#7c3aed', c2: '#1e1048', rim: '#e9d5ff', tex: false, lw: 2.2, line: '#0b0520' }, headV = { c1: '#a78bfa', c2: '#2e1065', rim: '#e9d5ff', tex: false, lw: 2.4, line: '#0b0520' };
      let s = K.aura('#c084fc', 100, 100, 0.55) + K.aura('#a3e635', 56, 80, 0.2);
      // корни Мирового древа спускаются сверху
      const rootA = 'M0 18 C18 34 32 60 40 84 C44 98 48 114 56 132 C60 142 66 150 74 156', rootB = 'M150 0 C152 24 164 40 178 54 C188 64 192 80 196 96';
      s += K.line(rootA, '#1f1206', 24) + K.line(rootA, '#8a5a2c', 18) + K.line(rootA, '#b08a64', 4, { op: 0.6 }) + K.line('M26 50 C18 58 10 60 4 60 M60 140 C68 138 76 140 82 146', '#5a3414', 4);
      s += K.line(rootB, '#1f1206', 16) + K.line(rootB, '#8a5a2c', 11) + K.line('M170 46 C176 40 184 38 192 40', '#5a3414', 3.4);
      s += rune(26, 40, 8, 'ng', '#d9f99d', 1.3, '#84cc16') + rune(176, 52, 7, 'j', '#d9f99d', 1.2, '#84cc16');
      // перепончатые крылья
      s += K.vol('M118 116 C104 88 100 58 110 30 C116 40 124 46 132 46 C128 56 130 64 138 68 C134 78 138 86 146 90 C138 98 134 106 134 118Z', { ...wingV, c1: '#5b21b6' });
      s += K.vol('M126 120 C132 88 148 56 178 34 C176 46 180 54 190 56 C180 64 180 74 190 80 C178 84 176 94 184 102 C170 104 160 112 154 124Z', wingV) + K.line('M128 118 L176 40 M134 118 L186 78 M140 120 L182 102', '#c4b5fd', 1.4, { op: 0.6 });
      // тело-кольца с шипами
      const bodyD = 'M108 108 C120 122 130 128 146 132 C172 136 188 152 174 168 C160 182 120 178 100 172 C80 166 64 170 46 176';
      s += K.line(bodyD, '#0b0520', 36) + K.line(bodyD, '#6d28d9', 30) + `<path d="${bodyD}" fill="none" stroke="#a78bfa" stroke-width="30" stroke-dasharray="3 9" opacity=".35"/>` + K.line(bodyD, '#ddd6fe', 6, { op: 0.6 });
      s += `<g fill="${L(K, '#c4b5fd')}" stroke="#0b0520" stroke-width="1.4" stroke-linejoin="round"><path d="M152 116 L160 102 L164 120Z"/><path d="M172 124 L184 114 L182 130Z"/><path d="M190 146 L200 140 L194 156Z"/><path d="M128 112 L132 98 L138 114Z"/></g>`;
      s += `<path d="M46 176 C38 172 30 174 26 178 C30 166 38 160 48 164Z" fill="${L(K, '#7c3aed')}" stroke="#0b0520" stroke-width="2" stroke-linejoin="round"/>`;
      // лапа с когтями держит корень
      s += limb(K, 'M132 142 C110 144 88 134 72 124', '#6d28d9', 13, '#0b0520', 0.3) + K.vol(K.ell(70, 122, 9, 8), headV);
      s += K.line('M66 116 C60 114 56 116 54 120 M66 122 C60 122 56 126 56 130 M70 128 C66 130 64 134 64 138', '#0b0520', 5) + K.line('M66 116 C60 114 56 116 54 120 M66 122 C60 122 56 126 56 130 M70 128 C66 130 64 134 64 138', '#f5f3ff', 2.6);
      // рога, гребень и голова в профиль: пасть сомкнута на корне
      s += K.part('M100 66 C110 52 124 44 142 40 C130 50 120 58 112 72Z', '#e9d5ff', { line: '#2e1065', lw: 1.6 }) + K.part('M90 64 C94 50 102 40 116 30 C110 42 106 54 102 66Z', '#ddd6fe', { line: '#2e1065', lw: 1.6 });
      s += `<g fill="${L(K, '#c4b5fd')}" stroke="#0b0520" stroke-width="1.3" stroke-linejoin="round"><path d="M108 104 L128 102 L114 112Z"/><path d="M112 96 L130 90 L118 104Z"/></g>`;
      s += K.vol('M36 104 L62 106 L94 112 C90 120 76 124 62 122 C50 120 40 114 36 104Z', headV);
      s += K.vol('M28 84 C34 70 56 62 78 62 C98 62 114 72 118 88 C120 98 116 106 108 110 L92 104 L62 98 L32 96 C26 94 26 88 28 84Z', headV);
      s += `<g fill="#fff" stroke="#0b0520" stroke-width=".9" stroke-linejoin="round"><path d="M38 96 l2.4 5.4 l2.6 -5.2Z M50 97 l2.4 5.4 l2.6 -5.2Z M62 98 l2.4 5.4 l2.6 -5.2Z M74 100 l2.4 5 l2.6 -4.6Z"/><path d="M44 105 l2.4 -5 l2.6 5.2Z M56 106 l2.4 -5 l2.6 5.2Z M68 108 l2.4 -5 l2.6 5Z"/></g>`;
      s += `<ellipse cx="34" cy="86" rx="2.8" ry="1.8" fill="#0b0520"/>` + K.line('M50 70 C62 66 76 66 88 70', '#ddd6fe', 1.6, { op: 0.6 });
      s += `<circle class="art-aura" cx="84" cy="78" r="13" fill="${K.rad([[0, '#ecfccb', 0.8], [1, '#a3e635', 0]])}"/>` + K.glow(84, 78, 5.2, 4.4, '#a3e635') + K.line('M70 70 L96 74', '#0b0520', 4);
      s += `<g class="art-float" fill="#c4b5fd" opacity=".6"><circle cx="22" cy="80" r="4.4"/><circle cx="14" cy="72" r="3.2"/><circle cx="8" cy="64" r="2.4"/></g>`;
      // белка Рататоск выглядывает из-за корня с запиской
      s += `<g transform="translate(160 22) scale(.55)">` + K.vol('M14 16 C30 16 36 -4 28 -18 C24 -26 14 -26 12 -18 C20 -16 24 -8 20 0Z', { c1: '#fbbf6a', c2: '#b4410c', rim: '#e4ffb0', tex: false, lw: 2.4, line: '#3b1505' }) +
        K.vol(K.ell(0, 0, 14, 12), { c1: '#fbbf6a', c2: '#b4410c', rim: '#e4ffb0', tex: false, lw: 2.4, line: '#3b1505' }) + K.part('M-10 -8 L-12 -20 L-4 -11Z M10 -8 L12 -20 L4 -11Z', '#f59e0b', { line: '#3b1505', lw: 1.6 }) +
        K.eyes(0, -1, 5.4, 4, { iris: '#7c2d12', look: [-0.5, 0.3] }) + `<rect x="-20" y="8" width="16" height="10" rx="2" fill="#fef3c7" stroke="#78350f" stroke-width="1.6"/>` + K.line('M-17 11 h10 M-17 14 h8', '#92400e', 1.2) + '</g>';
      s += K.line('M144 22 l-6 -3 M143 28 l-7 0', '#fef3c7', 1.6, { cls: 'art-blink' });
      return s;
    },

    // Иггдрасиль (легенда): дух Мирового ясеня — в густой кроне светятся девять миров-шариков, на макушке сидит орёл,
    // по стволу бежит белка. В стволе — доброе древнее лицо с моховой бородой, а у корней мерцают три источника:
    // золотой источник судьбы Урд, синий колодец Мимира и кипящий Хвергельмир
    no_yggdrasil(K) {
      const bark = { c1: '#b08a64', c2: '#3b2412', rim: '#e4ffb0', line: '#1f1206' }, leafV = { c1: '#86efac', c2: '#14532d', rim: '#e4ffb0', line: '#052e16' };
      const orb = (x, y, r, c, d) => `<g class="art-blink" style="animation-delay:-${d}s"><circle cx="${x}" cy="${y}" r="${f(r * 2)}" fill="${K.rad([[0, '#ffffff', 0.7], [0.4, c, 0.4], [1, c, 0]])}"/></g><circle cx="${x}" cy="${y}" r="${r}" fill="${K.rad([[0, '#ffffff'], [0.5, c], [1, K.shade(c, -0.35)]], 0.35, 0.3, 0.75)}" stroke="${K.shade(c, -0.6)}" stroke-width="1.4"/>`;
      let s = K.aura('#84cc16', 100, 96, 0.58) + K.aura('#fde68a', 70, 56, 0.3);
      // корни и три источника
      s += K.vol('M66 146 C50 156 30 164 10 176 H190 C170 164 150 156 134 146Z', { ...bark, tex: false });
      s += K.line('M74 152 C60 162 44 170 26 176 M100 156 V178 M126 152 C140 162 156 170 174 176', '#1f1206', 1.8, { op: 0.6 });
      s += `<ellipse cx="34" cy="176" rx="18" ry="5" fill="${K.rad([[0, '#fffbe6'], [0.6, '#fde047'], [1, '#b45309']])}" stroke="#713f12" stroke-width="1.6"/>`;
      s += `<ellipse cx="100" cy="178" rx="18" ry="5" fill="${K.rad([[0, '#e0f7ff'], [0.6, '#38bdf8'], [1, '#0c4a6e']])}" stroke="#0c4a6e" stroke-width="1.6"/>`;
      s += `<ellipse cx="166" cy="176" rx="18" ry="5" fill="${K.rad([[0, '#99f6e4'], [0.6, '#0f766e'], [1, '#042f2e']])}" stroke="#042f2e" stroke-width="1.6"/>` + bub(160, 168, 2.6, -0.3) + bub(170, 164, 2, -1);
      // ствол с корой
      s += K.vol('M74 160 C80 136 82 112 78 88 L122 88 C118 112 120 136 126 160Z', bark);
      s += K.line('M86 96 C84 112 88 128 84 150 M114 96 C116 112 112 128 116 150 M100 140 V156', '#3b2412', 1.6, { op: 0.6 });
      // крона
      s += K.vol(fluff(100, 58, 86, 48, 14, 3.4), leafV);
      s += `<path d="${fluff(100, 50, 60, 30, 11, 2.4)}" fill="#bbf7d0" opacity=".35"/>`;
      s += ashLeaf(K, 20, 100, 24, 110, '#4d7c0f') + ashLeaf(K, 180, 100, 24, 70, '#4d7c0f');
      // девять миров
      s += orb(100, 22, 7, '#fbbf24', 0) + orb(60, 34, 5.6, '#fef9c3', 0.3) + orb(140, 34, 5.6, '#4ade80', 0.6) + orb(32, 62, 5.6, '#bae6fd', 0.9) + orb(168, 62, 5.6, '#fb923c', 1.2) +
        orb(76, 74, 5, '#38bdf8', 0.5) + orb(124, 74, 5, '#a78bfa', 0.8) + orb(52, 94, 4.6, '#e0f2fe', 1.1) + orb(148, 94, 4.6, '#7c3aed', 1.4);
      // орёл на макушке
      s += `<g transform="translate(100 8)">` + `<path d="M-14 2 C-10 -4 -4 -6 0 -4 C4 -6 10 -4 14 2 C8 0 4 2 0 4 C-4 2 -8 0 -14 2Z" fill="${L(K, '#78350f')}" stroke="#1f1206" stroke-width="1.2"/><circle cx="0" cy="-6" r="3.4" fill="#f8fafc" stroke="#1f1206" stroke-width="1"/><path d="M2 -6 L6 -5 L2 -4Z" fill="#fbbf24"/></g>`;
      // доброе лицо в стволе с моховой бородой
      s += K.closed(100, 110, 9, 5.4, true) + K.line('M84 101 Q90 97 96 101 M116 101 Q110 97 104 101', '#3b2412', 2.4);
      s += `<ellipse cx="100" cy="120" rx="5" ry="4" fill="${L(K, '#8a5a2c')}" stroke="#1f1206" stroke-width="1.4"/>` + K.mouth('smile', 100, 128, 12);
      s += K.vol(fluff(100, 142, 16, 7, 8, 1.4), { c1: '#a3e635', c2: '#3f6212', rim: '#e4ffb0', tex: false, lw: 1.6, line: '#1a2e05' });
      s += K.blush(84, 120, 4.4) + K.blush(116, 120, 4.4);
      // белка бежит по стволу
      s += `<g class="art-float"><g transform="translate(124 124) rotate(-70) scale(.42)">` + K.vol('M14 16 C30 16 36 -4 28 -18 C24 -26 14 -26 12 -18 C20 -16 24 -8 20 0Z', { c1: '#fbbf6a', c2: '#b4410c', rim: '#e4ffb0', tex: false, lw: 3, line: '#3b1505' }) +
        K.vol(K.ell(0, 0, 14, 11), { c1: '#fbbf6a', c2: '#b4410c', rim: '#e4ffb0', tex: false, lw: 3, line: '#3b1505' }) + K.part('M-8 -9 L-6 -20 L0 -11Z', '#f59e0b', { line: '#3b1505', lw: 2 }) + `<circle cx="-6" cy="-2" r="2.4" fill="${K.INK}"/></g></g>`;
      s += K.spark(18, 140, 3, '#e4ffb0', 'art-float') + K.spark(184, 140, 3, '#fde68a') + K.spark(100, 96, 2.4, '#ffffff', 'art-float');
      return s;
    },
    // --- конец расширения ---
  });
})();
