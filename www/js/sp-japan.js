'use strict';
/* 4.28: рисунки духов и богов японской мифологии (сезон 2) — каждый своей функцией (кисть — js/art-kit.js) */

(() => {
  // --- местные помощники (только для духов японской мифологии) ---
  const r1 = n => Math.round(n * 10) / 10;
  const INK = '#1b1030';
  const cl = (cls, d) => (cls ? ` class="${cls}"` : '') + (d ? ` style="animation-delay:-${d}s"` : '');
  // искра-молния (зигзаг): начало (x, y), масштаб s, поворот rot
  const zap = (K, x, y, s, rot = 0, c = '#fde047', d = 0) => `<g class="art-blink"${d ? ` style="animation-delay:-${d}s"` : ''}><g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">` +
    `<path d="M0 0L5-5L1-6L7-13" fill="none" stroke="${c}" stroke-width="${r1(5 / s)}" stroke-linecap="round" stroke-linejoin="round" opacity=".35"/>` +
    `<path d="M0 0L5-5L1-6L7-13" fill="none" stroke="${c}" stroke-width="${r1(2 / s)}" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
  // спираль-завиток: центр, шаг, витки
  const spiral = (cx, cy, k, turns, a0 = 0) => { let d = ''; for (let i = 0; i <= turns * 24; i++) { const a = i / 24 * Math.PI * 2, r = k * a / Math.PI; d += (i ? 'L' : 'M') + r1(cx + r * Math.cos(a + a0)) + ' ' + r1(cy + r * Math.sin(a + a0)); } return d; };
  // лепесток сакуры: центр (x, y), размер r, поворот
  const petal = (x, y, r, rot = 0, c = '#fbcfe8', cls = 'art-float', d = 0) =>
    `<g${cl(cls, d)}><path transform="translate(${x} ${y}) rotate(${rot}) scale(${r1(r / 10)})" d="M0 10C-7 6-8-2-4-8C-2-10 0-9 0-6.5C0-9 2-10 4-8C8-2 7 6 0 10Z" fill="${c}" stroke="#be185d" stroke-width="${r1(12 / r)}" stroke-linejoin="round"/></g>`;
  // снежинка: центр, радиус
  const flake = (x, y, r, c = '#f0f9ff', cls = 'art-blink', d = 0) => {
    let p = '';
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + 0.26, bx = x + r * 0.58 * Math.cos(a), by = y + r * 0.58 * Math.sin(a);
      p += `M${x} ${y}L${r1(x + r * Math.cos(a))} ${r1(y + r * Math.sin(a))}M${r1(bx)} ${r1(by)}L${r1(bx + r * 0.32 * Math.cos(a + 0.9))} ${r1(by + r * 0.32 * Math.sin(a + 0.9))}M${r1(bx)} ${r1(by)}L${r1(bx + r * 0.32 * Math.cos(a - 0.9))} ${r1(by + r * 0.32 * Math.sin(a - 0.9))}`;
    }
    return `<g${cl(cls, d)}><path d="${p}" fill="none" stroke="#0369a1" stroke-width="${r1(Math.max(2.2, r * 0.34))}" stroke-linecap="round" opacity=".35"/><path d="${p}" fill="none" stroke="${c}" stroke-width="${r1(Math.max(1.1, r * 0.15))}" stroke-linecap="round"/></g>`;
  };
  // кленовый лист момидзи: центр, размер, поворот
  const maple = (K, x, y, r, rot, c, cls = 'art-float', d = 0) =>
    `<g${cl(cls, d)}><g transform="translate(${x} ${y}) rotate(${rot}) scale(${r1(r / 10)})"><path d="M0-10L2.2-4.5L7.5-7L5.5-1.5L10 .5L4.5 2.5L5.5 7.5L.8 4.8V10H-.8V4.8L-5.5 7.5L-4.5 2.5L-10 .5L-5.5-1.5L-7.5-7L-2.2-4.5Z" fill="${c}" stroke="${K.shade(c, -0.5)}" stroke-width="${r1(12 / r)}" stroke-linejoin="round"/>` +
    `<path d="M0 6V-6M0 1L5-3M0 1L-5-3" stroke="${K.shade(c, -0.4)}" stroke-width="${r1(8 / r)}" fill="none" opacity=".7"/></g></g>`;
  // облако-кумо с завитками: центр (x, y), масштаб s (при s = 1 — ширина ~80)
  const KUMO = 'M-34 8C-42 8-43-3-35-5C-37-15-25-19-18-12C-16-23 1-27 8-17C14-25 30-21 30-10C38-11 43 0 36 8Z';
  const kumo = (K, x, y, s, o = {}) => {
    const c1 = o.c1 || '#ffffff', c2 = o.c2 || '#c7d2fe', line = o.line || '#4338ca';
    return `<g${cl(o.cls, o.d)}${o.op ? ` opacity="${o.op}"` : ''}><g transform="translate(${x} ${y}) scale(${o.flip ? -s : s} ${s})">` +
      `<path d="${KUMO}" fill="${K.lin([c1, c2])}" stroke="${line}" stroke-width="${r1(2.2 / s)}" stroke-linejoin="round"/>` +
      `<path d="M-34 1C-30-3-24-3-22 1" stroke="#fff" stroke-width="${r1(1.6 / s)}" fill="none" stroke-linecap="round" opacity=".7"/>` +
      `<path d="M-20 2c-2-5 4-8 7-4c2 3-1 5-3 3M5-8c-1-5 6-7 8-3c1 2-1 4-3 3M22 1c0-4 6-5 7-1" fill="none" stroke="${line}" stroke-width="${r1(1.4 / s)}" stroke-linecap="round" opacity=".6"/></g></g>`;
  };
  // запятая-томоэ (единичный радиус 10): голова внизу, хвост дугой по краю
  const COMMA = 'M-4.4-4.6A9.6 9.6 0 0 1 9.2 2.6A6.6 6.6 0 0 0 4.4-4.6A4.4 4.4 0 0 1-4.4-4.6Z';
  const tomoe = (x, y, r, c = '#1f2937', rot = 0) =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${r1(r / 10)})" fill="${c}">${[0, 120, 240].map(a => `<path d="${COMMA}" transform="rotate(${a}) translate(0 -1)"/>`).join('')}</g>`;
  // барабан-тайко: красный обод с заклёпками, кожа с томоэ
  const taiko = (K, x, y, r) => {
    let studs = '';
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; studs += `<circle cx="${r1(x + r * 1.08 * Math.cos(a))}" cy="${r1(y + r * 1.08 * Math.sin(a))}" r="${r1(r * 0.07)}" fill="#fde68a"/>`; }
    return `<circle cx="${x}" cy="${y}" r="${r1(r * 1.22)}" fill="${K.rad([[0, '#f87171'], [0.7, '#b91c1c'], [1, '#7f1d1d']], 0.35, 0.3)}" stroke="#450a0a" stroke-width="1.6"/>` + studs +
      `<circle cx="${x}" cy="${y}" r="${r}" fill="${K.rad([[0, '#fffbeb'], [0.7, '#fde7c2'], [1, '#e8b980']], 0.4, 0.35)}" stroke="#78350f" stroke-width="1.4"/>` + tomoe(x, y, r * 0.78, '#1f2937', 15);
  };
  // магатама — изогнутая бусина-запятая
  const magatama = (x, y, r, rot, c = '#10b981') => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${r1(r / 10)})"><path d="${COMMA}" fill="${c}" stroke="#064e3b" stroke-width="${r1(12 / r)}" stroke-linejoin="round"/><circle cx="0" cy="-.6" r="1.5" fill="#ecfdf5"/></g>`;
  // ряд волн сэйгайха: от x0 до x1 на уровне y, радиус r
  const seigaiha = (x0, x1, y, r) => { let d = ''; for (let x = x0; x <= x1; x += r * 2) for (const k of [1, 0.66, 0.33]) d += `M${r1(x - r * k)} ${y}A${r1(r * k)} ${r1(r * k)} 0 0 1 ${r1(x + r * k)} ${y}`; return d; };
  // ряд чешуек-дуг
  const scaleRow = (x0, x1, y, w) => { let d = ''; for (let x = x0; x < x1 - 0.1; x += w) d += `M${r1(x)} ${y}q${r1(w / 2)} ${r1(w * 0.55)} ${r1(w)} 0`; return d; };
  // блуждающий огонёк ониби (голубое пламя)
  const onibi = (K, x, y, h, d = 0, c2 = '#8b5cf6') => K.g(K.flame(x, y, h, h * 0.66, '#eef2ff', c2, { style: `animation-delay:-${d}s` }) +
    `<circle class="art-aura" cx="${x}" cy="${r1(y - h * 0.35)}" r="${r1(h * 0.7)}" fill="${K.rad([[0, '#e0e7ff', 0.6], [1, c2, 0]])}"/>`, '', 'art-float');
  // помпон-бонтэн ямабуси
  const pom = (K, x, y, r = 5.4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${K.rad([[0, '#fff1c2'], [0.5, '#fb923c'], [1, '#c2410c']], 0.35, 0.3)}" stroke="#7c2d12" stroke-width="1.2"/>` +
    `<path d="M${r1(x - r * 0.5)} ${r1(y - r * 0.2)}l${r1(r * 0.3)} ${r1(-r * 0.3)}M${r1(x + r * 0.1)} ${r1(y + r * 0.4)}l${r1(r * 0.3)} ${r1(-r * 0.3)}" stroke="#7c2d12" stroke-width=".8" opacity=".6"/>`;
  // токин — маленькая шапочка ямабуси: центр низа (x, y), ширина w
  const tokin = (K, x, y, w) => { const h = w * 0.55; return K.part(`M${r1(x - w / 2)} ${y}L${r1(x - w * 0.36)} ${r1(y - h)}H${r1(x + w * 0.36)}L${r1(x + w / 2)} ${y}Q${x} ${r1(y + w * 0.16)} ${r1(x - w / 2)} ${y}Z`, '#1f2937', { line: '#020617', lw: 1.4 }) +
    K.line(`M${r1(x - w * 0.17)} ${r1(y - h + 1)}L${r1(x - w * 0.2)} ${r1(y + 1)}M${x} ${r1(y - h)}V${r1(y + 2)}M${r1(x + w * 0.17)} ${r1(y - h + 1)}L${r1(x + w * 0.2)} ${r1(y + 1)}`, '#64748b', 1, { op: 0.9 }); };
  // тигровая набедренная повязка: область d, полосы
  const tigerStripes = (K, pts) => pts.map(([x, y, r]) => K.g(K.part('M0 0C3 4 3 10 -1 14L-4 12C-1 8 -1 4 -3 0Z', '#1c1917', { lw: 0 }), `translate(${x} ${y}) rotate(${r})`)).join('');

  // --- 4.x: помощники для новых духов ---
  // лисий огонёк кицунэ-би (тёплое пламя с ореолом): основание (x, y), высота h
  const kbi = (K, x, y, h, d = 0) => K.g(`<circle class="art-aura" cx="${x}" cy="${r1(y - h * 0.35)}" r="${r1(h * 0.75)}" fill="${K.rad([[0, '#fff3b0', 0.65], [1, '#fb923c', 0]])}"/>` +
    K.flame(x, y, h, h * 0.66, '#fff7c2', '#f97316', { style: `animation-delay:-${d}s` }), '', 'art-float');
  // ворота-тории: середина cx, верх top, ширина w, высота h
  const torii = (K, cx, top, w, h, op = 1) => {
    // дальние ворота (op ≤ 0.8) — плоской заливкой: так рисунок легче
    const red = '#e0301e', ln = { line: '#4a0b06', lw: 1.6, flat: op <= 0.8 }, x0 = cx - w / 2, x1 = cx + w / 2, px = r1(w * 0.32), bot = top + h;
    let t = '';
    for (const sx of [-1, 1]) {
      const x = cx + sx * px;
      t += K.part(`M${r1(x - 5)} ${top + 12}H${r1(x + 5)}L${r1(x + 6.5)} ${bot}H${r1(x - 6.5)}Z`, red, ln);
      t += K.part(`M${r1(x - 7.5)} ${bot - 9}H${r1(x + 7.5)}V${bot}H${r1(x - 7.5)}Z`, '#1f2937', { line: '#020617', lw: 1.4 });
    }
    t += K.part(`M${r1(x0 + w * 0.06)} ${top + 27}H${r1(x1 - w * 0.06)}V${top + 34}H${r1(x0 + w * 0.06)}Z`, red, ln);
    t += K.part(`M${cx - 4} ${top + 12}H${cx + 4}V${top + 27}H${cx - 4}Z`, red, ln);
    t += K.part(`M${r1(x0 + 2)} ${top + 4}Q${cx} ${top + 14} ${r1(x1 - 2)} ${top + 4}L${r1(x1 - 5)} ${top + 13}Q${cx} ${top + 22} ${r1(x0 + 5)} ${top + 13}Z`, red, ln);
    t += K.part(`M${r1(x0 - 3)} ${top - 2}Q${cx} ${top + 10} ${r1(x1 + 3)} ${top - 2}L${r1(x1 + 1)} ${top + 4}Q${cx} ${top + 15} ${r1(x0 - 1)} ${top + 4}Z`, '#1f2937', { line: '#020617', lw: 1.4 });
    return `<g${op < 1 ? ` opacity="${op}"` : ''}>${t}</g>`;
  };
  // косматый контур (грива, шерсть): овал (cx, cy, rx, ry) с n загнутыми пучками высотой amp
  const shag = (cx, cy, rx, ry, n, amp, a0 = -Math.PI / 2) => {
    const pt = (a, k) => `${r1(cx + Math.cos(a) * rx * k)} ${r1(cy + Math.sin(a) * ry * k)}`, st = Math.PI * 2 / n;
    let d = `M${pt(a0, 1)}`;
    for (let i = 0; i < n; i++) { const a = a0 + i * st; d += `Q${pt(a + st * 0.3, 1 + amp * 0.95)} ${pt(a + st * 0.78, 1 + amp)}L${pt(a + st, 1)}`; }
    return d + 'Z';
  };
  // лента или труба вдоль гладкой кривой через точки pts [[x, y], …]: ширина w — число или функция от доли пути t (0…1),
  // seg — сколько отрезков на каждый участок кривой. Возвращает замкнутый путь d (для K.vol / K.part)
  // гладкая кривая (Катмулл — Ром) через точки pts: массив точек [x, y]
  const curve = (pts, seg = 6) => {
    const P = [], n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      for (let k = 0; k < seg; k++) {
        const t = k / seg, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
        P.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    P.push(pts[n - 1]);
    return P;
  };
  // нормаль к кривой P в точке i (единичная, «влево» по ходу)
  const normal = (P, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len]; };
  const tube = (pts, w, seg = 6) => {
    const P = curve(pts, seg);
    const L = [], R = [], m = P.length;
    for (let i = 0; i < m; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(m - 1, i + 1)], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len, h = (typeof w === 'function' ? w(i / (m - 1)) : w) / 2;
      L.push(`${r1(P[i][0] + nx * h)} ${r1(P[i][1] + ny * h)}`); R.push(`${r1(P[i][0] - nx * h)} ${r1(P[i][1] - ny * h)}`);
    }
    return `M${L.join('L')}L${R.reverse().join('L')}Z`;
  };
  // белый голубь: центр (x, y), масштаб k, flip — смотрит влево
  const dove = (K, x, y, k = 1, flip = false, cls = 'art-float', d = 0) => {
    const sw = w => r1(w / k);
    return `<g${cl(cls, d)}><g transform="translate(${x} ${y}) scale(${flip ? -k : k} ${k})">` +
      `<path d="M-12 2C-10-6-2-10 6-8C10-12 16-12 18-8C20-6 18-2 14-1C14 6 6 10-2 9C-8 8-14 8-20 12C-18 6-14 4-12 2Z" fill="${K.lin(['#ffffff', '#cbd5e1'])}" stroke="#334155" stroke-width="${sw(1.4)}" stroke-linejoin="round"/>` +
      `<path d="M-6-2C-14-14-6-24 8-22C4-16 2-8 2-2Z" fill="${K.lin(['#ffffff', '#e2e8f0'])}" stroke="#334155" stroke-width="${sw(1.2)}" stroke-linejoin="round"/>` +
      `<path d="M18-6l5 1.2l-5 1.4Z" fill="#f59e0b" stroke="#92400e" stroke-width="${sw(0.6)}"/><circle cx="14" cy="-7" r="1.3" fill="${INK}"/></g></g>`;
  };
  // цветок сливы-умэ: центр (x, y), радиус r
  const ume = (x, y, r, c = '#fbcfe8', cls = '', d = 0) => {
    let p = '';
    for (let i = 0; i < 5; i++) { const a = (i * 72 - 90) * Math.PI / 180; p += `<circle cx="${r1(x + r * 0.55 * Math.cos(a))}" cy="${r1(y + r * 0.55 * Math.sin(a))}" r="${r1(r * 0.52)}"/>`; }
    return `<g${cl(cls, d)}><g fill="${c}" stroke="#9d174d" stroke-width="${r1(Math.max(0.8, r * 0.1))}">${p}</g><circle cx="${x}" cy="${y}" r="${r1(r * 0.26)}" fill="#fde047" stroke="#a16207" stroke-width=".6"/></g>`;
  };
  // колос риса: основание (x, y), длина len, поворот rot — стебель дугой и зёрна вдоль него
  const riceEar = (x, y, len, rot, c = '#fbbf24') => {
    const B = t => [2 * (1 - t) * t * len * 0.35 + t * t * len * 0.15, -(2 * (1 - t) * t * len * 0.55 + t * t * len)];
    let g = `<path d="M0 0Q${r1(len * 0.35)} ${r1(-len * 0.55)} ${r1(len * 0.15)} ${-len}" fill="none" stroke="#a16207" stroke-width="1.6" stroke-linecap="round"/>`;
    for (let i = 4; i <= 11; i++) {
      const t = i / 11, [px, py] = B(t), side = i % 2 ? 1 : -1;
      g += `<ellipse cx="${r1(px + side * 2.6)}" cy="${r1(py)}" rx="2" ry="3.6" transform="rotate(${side * 30} ${r1(px + side * 2.6)} ${r1(py)})" fill="${c}" stroke="#92400e" stroke-width=".8"/>`;
    }
    return `<g transform="translate(${x} ${y}) rotate(${rot})">${g}</g>`;
  };
  // бумажная лента-сидэ (зигзаг из бумаги) на священной верёвке: верх (x, y), масштаб k
  const shide = (x, y, k = 1, d = 0) => {
    let p = '';
    for (let i = 0; i < 4; i++) { const ox = i % 2 ? 4 : 0, oy = i * 5.4; p += `M${r1(x + ox * k)} ${r1(y + oy * k)}h${r1(7 * k)}v${r1(5.4 * k)}h${r1(-7 * k)}Z`; }
    return `<g class="art-sway" style="transform-origin:50% 0${d ? `;animation-delay:-${d}s` : ''}"><path d="${p}" fill="#ffffff" stroke="#64748b" stroke-width="1" stroke-linejoin="round"/></g>`;
  };
  // кончик или край фигуры другим цветом: фигура d, закрашиваемая область area (путь) — цвет c
  const tipFill = (K, d, area, c) => { const i = K.id('c'); K.def(`<clipPath id="${i}"><path d="${d}"/></clipPath>`); return `<path clip-path="url(#${i})" d="${area}" fill="${c}"/>`; };
  // жемчужина-хосю (луковка с огоньком): центр округлой части (x, y), радиус r
  const hoju = (K, x, y, r, c = '#fde68a') => `<circle class="art-aura" cx="${x}" cy="${r1(y - r * 0.3)}" r="${r1(r * 2.4)}" fill="${K.rad([[0, '#fffbe6', 0.85], [0.45, c, 0.4], [1, c, 0]])}"/>` +
    K.flame(x, r1(y - r * 0.8), r * 1.9, r * 1.5, '#fffbe6', '#fb923c') +
    `<path d="M${x} ${r1(y - r * 1.55)}C${r1(x + r * 0.25)} ${r1(y - r * 1.1)} ${r1(x + r)} ${r1(y - r * 0.65)} ${r1(x + r)} ${r1(y + r * 0.05)}A${r} ${r} 0 0 1 ${r1(x - r)} ${r1(y + r * 0.05)}C${r1(x - r)} ${r1(y - r * 0.65)} ${r1(x - r * 0.25)} ${r1(y - r * 1.1)} ${x} ${r1(y - r * 1.55)}Z" fill="${K.rad([[0, '#ffffff'], [0.55, '#fff7ed'], [1, c]], 0.38, 0.35)}" stroke="#9a3412" stroke-width="${r1(Math.max(1.2, r * 0.14))}"/>` +
    `<ellipse cx="${r1(x - r * 0.35)}" cy="${r1(y - r * 0.25)}" rx="${r1(r * 0.22)}" ry="${r1(r * 0.4)}" fill="#fff" opacity=".9"/>`;
  // пушистый лисий хвост: основание (bx, by), длина L, ширина w, поворот rot; кончик другого цвета
  const foxTail = (K, bx, by, L, w, rot, fur, tip) => {
    const h = w / 2, tY = by - L, ty = r1(by - L * 0.74);
    const d = `M${r1(bx - h * 0.45)} ${by}C${r1(bx - h * 1.1)} ${r1(by - L * 0.2)} ${r1(bx - h * 1.15)} ${r1(by - L * 0.55)} ${r1(bx - h * 0.75)} ${r1(by - L * 0.78)}C${r1(bx - h * 0.45)} ${r1(by - L * 0.92)} ${r1(bx - h * 0.15)} ${r1(tY + 4)} ${bx} ${tY}` +
      `C${r1(bx + h * 0.25)} ${r1(tY + L * 0.08)} ${r1(bx + h * 0.7)} ${r1(by - L * 0.86)} ${r1(bx + h * 0.9)} ${r1(by - L * 0.7)}C${r1(bx + h * 1.15)} ${r1(by - L * 0.45)} ${r1(bx + h)} ${r1(by - L * 0.15)} ${r1(bx + h * 0.45)} ${by}Z`;
    const cut = `M${r1(bx - w)} ${r1(tY - 10)}H${r1(bx + w)}V${ty}Q${r1(bx + h)} ${r1(ty + 7)} ${bx} ${ty}T${r1(bx - w)} ${ty}Z`;
    return K.g(K.vol(d, fur) + tipFill(K, d, cut, tip) + `<path d="${d}" fill="none" stroke="${fur.line}" stroke-width="2.6" stroke-linejoin="round"/>` +
      K.line(`M${r1(bx - h * 0.3)} ${r1(by - L * 0.3)}Q${r1(bx - h * 0.1)} ${r1(by - L * 0.5)} ${r1(bx - h * 0.35)} ${r1(by - L * 0.62)}`, '#ffffff', 1.6, { op: 0.6 }), `rotate(${rot} ${bx} ${by})`);
  };

  Object.assign(SPIRIT_ART, {
    // ===================== ВЕТЕР: тэнгу =====================

    // Коноха-тэнгу: круглый птенчик-тэнгу в индиговых пёрышках, на лбу — чёрная шапочка-токин, на плечах — накидка
    // из листьев; в лапке веер-лист яцудэ, которым он учится поднимать ветер. Крылышки ещё маленькие, клювик жёлтый
    jp_konoha(K) {
      const fea = { c1: '#b4bcff', c2: '#3730a3', rim: '#eef0ff', rimK: 0.7, line: '#1e1b4b', texK: 0.2 };
      let s = K.aura('#a5b4fc', 88, 118, 0.32);
      s += K.line('M16 76q14-10 28 0t24-2M136 40q14-8 28 2M148 160q12-8 26 0', '#e0e7ff', 2.2, { op: 0.6, cls: 'art-float' });
      // крылышки
      const wing = '<g class="art-wing">' + K.part('M70 128C54 112 34 108 20 116C28 120 30 124 30 128C36 126 42 128 44 132C48 128 54 130 58 134C62 130 68 132 72 134Z', '#6366f1', { line: '#1e1b4b', lw: 1.8 }) +
        K.line('M32 120L64 128M44 128L66 132', '#c7d2fe', 1.2) + '</g>';
      s += K.mirror(wing);
      // лапки
      s += K.mirror(K.line('M86 168v10M86 178l-6 2M86 178l5 3', '#ea580c', 3));
      // тельце и светлая грудка
      s += K.vol('M100 108C126 108 140 126 140 148C140 166 126 176 100 176C74 176 60 166 60 148C60 126 74 108 100 108Z', fea);
      s += K.part('M100 132C114 132 122 144 122 156C122 168 112 174 100 174C88 174 78 168 78 156C78 144 86 132 100 132Z', '#e0e7ff', { flat: true, lw: 0, op: 0.85 });
      s += K.line(scaleRow(84, 116, 150, 8) + scaleRow(88, 112, 160, 8), '#a5b4fc', 1.2, { op: 0.8 });
      // накидка из листьев
      s += K.part('M60 120C74 112 88 112 100 114C112 112 126 112 140 120L144 136C130 130 116 128 100 130C84 128 70 130 56 136Z', '#4d7c0f', { line: '#1a2e05', lw: 1.6 });
      [[60, 132, 16, 112], [72, 130, 19, 102], [86, 129, 19, 95], [100, 129, 19, 90], [114, 129, 19, 85], [128, 130, 19, 78], [140, 132, 16, 68]].forEach(([x, y, l, r], i) => { s += K.leaf(x, y, l, r, i % 2 ? '#65a30d' : '#84cc16'); });
      s += K.leaf(72, 118, 14, -165, '#a3e635') + K.leaf(128, 118, 14, -15, '#a3e635');
      // хохолок и голова
      s += K.part('M92 50C88 38 92 28 100 22C100 30 104 36 110 40Z', '#6366f1', { line: '#1e1b4b', lw: 1.6 });
      s += K.vol('M100 40C130 40 146 58 146 80C146 102 128 116 100 116C72 116 54 102 54 80C54 58 70 40 100 40Z', fea);
      s += K.part('M100 66C118 66 132 76 134 92C130 106 116 114 100 114C84 114 70 106 66 92C68 76 82 66 100 66Z', '#e0e7ff', { flat: true, lw: 0, op: 0.9 });
      s += tokin(K, 100, 52, 26);
      s += K.gloss(72, 60, 8, 4.5, -35, 0.4);
      s += K.eyes(100, 82, 19, 11.5, { iris: '#4338ca', look: [0.1, 0.3] });
      s += K.blush(70, 100, 6) + K.blush(130, 100, 6);
      // клювик
      s += K.part('M91 96Q100 92 109 96L100 110Z', '#f59e0b', { line: '#7c2d12', lw: 1.6 }) + K.line('M94 98Q100 100 106 98', '#7c2d12', 1, { op: 0.6 });
      // веер-лист яцудэ
      let fan = K.line('M142 146L156 100', '#4d7c0f', 3);
      [-176, -147, -118, -90, -62, -33, -4].forEach((a, i) => { fan += K.leaf(156, 100, i === 3 ? 30 : 25, a, i % 2 ? '#65a30d' : '#4d7c0f'); });
      fan += `<circle cx="156" cy="100" r="3.4" fill="#4d7c0f" stroke="#1a2e05" stroke-width="1"/>`;
      s += K.g(fan, '', 'art-spin-soft');
      s += K.vol(K.ell(142, 146, 7, 6.5), { ...fea, tex: false, lw: 2 }) + K.vol(K.ell(58, 146, 7, 6.5), { ...fea, tex: false, lw: 2 });
      s += K.spark(30, 40, 3, '#e0e7ff', 'art-float') + K.spark(178, 128, 2.6, '#eef0ff') + K.spark(22, 150, 2.4, '#e0e7ff');
      return s;
    },

    // Карасу-тэнгу: вороний тэнгу в одеянии горного отшельника ямабуси — белая куртка с оранжевыми помпонами, индиговые
    // хакама, чёрные крылья раскрыты, на лбу токин; жёлтый вороний клюв, строгий взгляд. В руке посох с кольцами, на ногах — гэта на одном зубце
    jp_karasu(K) {
      const fea = { c1: '#6b7a99', c2: '#0f172a', rim: '#c7d2fe', rimK: 0.75, line: '#020617', texK: 0.2 };
      const robe = { c1: '#ffffff', c2: '#c7d2fe', rim: '#eef0ff', rimK: 0.5, line: '#1e1b4b', texK: 0.2 };
      const hak = { c1: '#818cf8', c2: '#1e1b4b', rim: '#eef0ff', rimK: 0.5, line: '#0f0a2e', texK: 0.2 };
      let s = K.aura('#a5b4fc', 96, 100, 0.34);
      s += K.line('M10 150q16-12 32 0t28-2M136 22q14-8 30 2M150 172q12-8 30 0', '#e0e7ff', 2.2, { op: 0.6, cls: 'art-float' });
      // крылья
      const wd = 'M82 98C64 84 42 74 16 76C10 78 8 84 14 86C8 90 8 96 16 96C10 102 12 108 20 106C16 112 20 118 28 114C26 122 32 126 40 120C42 128 50 130 54 122C58 126 66 124 68 116Z';
      s += K.mirror('<g class="art-wing">' + K.part(wd, '#334155', { line: '#020617', lw: 2 }) + K.line('M22 84C40 86 56 94 74 106M20 100C36 100 52 106 70 112M34 114C46 114 56 116 66 118', '#94a3b8', 1.3, { op: 0.8 }) + '</g>');
      // посох с кольцами
      s += K.line('M158 178L162 36', '#451a03', 5) + K.line('M158 178L162 36', '#a16207', 2.6);
      s += K.line('M162 38C152 38 150 22 162 18C174 22 172 38 162 38', '#78350f', 4) + K.line('M162 38C152 38 150 22 162 18C174 22 172 38 162 38', '#fbbf24', 2.2);
      s += `<g class="art-sway" style="transform-origin:50% 0"><circle cx="153" cy="36" r="3.4" fill="none" stroke="#fbbf24" stroke-width="1.8"/><circle cx="171" cy="36" r="3.4" fill="none" stroke="#fbbf24" stroke-width="1.8"/></g>`;
      // гэта на одном зубце
      s += K.mirror(K.part('M68 170H94V174H68Z', '#a16207', { line: '#451a03', lw: 1.4 }) + K.part('M78 174H84V180H78Z', '#78350f', { line: '#451a03', lw: 1.2 }) + K.line('M74 170L81 164L88 170', '#dc2626', 1.8));
      // хакама
      s += K.vol('M66 130H134L142 168H108L100 150L92 168H58Z', hak);
      s += K.line('M84 134L78 166M116 134L122 166', '#0f0a2e', 1.2, { op: 0.5 });
      // куртка ямабуси
      s += K.vol('M100 82C120 82 132 92 134 108L134 136H66L66 108C68 92 80 82 100 82Z', robe);
      s += K.line('M86 86L100 108L114 86', '#1e1b4b', 1.6, { op: 0.6 });
      s += K.line('M66 132H134', '#1e1b4b', 5) + K.line('M66 132H134', '#6366f1', 2);
      s += K.line('M88 98V124M112 98V124', '#78350f', 1.4) + pom(K, 88, 100) + pom(K, 112, 100) + pom(K, 88, 116) + pom(K, 112, 116);
      // руки
      s += K.vol('M72 92C62 98 56 108 56 122C58 128 66 128 68 122C68 112 72 104 80 98Z', robe);
      s += K.vol(K.ell(62, 126, 7, 6.5), { ...fea, tex: false, lw: 2 });
      s += K.vol('M128 92C140 96 150 102 156 110C158 116 152 120 148 116C142 110 134 106 124 102Z', robe);
      s += K.vol(K.ell(158, 112, 7, 6.5), { ...fea, tex: false, lw: 2 });
      // голова ворона: пёрышки по бокам, токин, клюв
      s += K.mirror(K.part('M72 54C60 50 52 40 54 28C62 36 70 40 78 42Z', '#1e293b', { line: '#020617', lw: 1.4 }));
      s += K.vol(K.ell(100, 58, 30, 27), fea);
      s += K.gloss(80, 42, 7, 4, -35, 0.4);
      s += tokin(K, 100, 38, 24);
      s += K.eyes(100, 54, 14, 8.5, { iris: '#f59e0b', lid: 'angry', skin: '#334155', look: [0, 0.2] });
      s += K.part('M86 64Q100 58 114 64Q112 78 102 92Q100 95 98 90Q90 78 86 64Z', '#fbbf24', { line: '#78350f', lw: 1.8 });
      s += K.line('M88 68Q100 72 112 68', '#78350f', 1.4, { op: 0.8 }) + `<ellipse cx="94" cy="66" rx="1.4" ry="1" fill="#78350f"/><ellipse cx="106" cy="66" rx="1.4" ry="1" fill="#78350f"/>`;
      s += K.gloss(94, 70, 3, 1.6, -30, 0.5);
      s += K.spark(28, 40, 3, '#e0e7ff', 'art-float') + K.spark(184, 70, 2.6, '#eef0ff') + K.spark(22, 170, 2.4, '#e0e7ff');
      return s;
    },

    // Дайтэнгу: великий горный тэнгу — красное лицо с длинным носом, белая грива и борода, грозные белые брови, токин;
    // белое одеяние ямабуси с помпонами и лиловые хакама, огромные крылья. Поднял веер из перьев — вокруг закручиваются вихри
    jp_daitengu(K) {
      const face = { c1: '#ff8f80', c2: '#c2181b', rim: '#ffe29a', rimK: 0.6, line: '#5c0a0a', tex: false, lw: 2.2 };
      const robe = { c1: '#ffffff', c2: '#cbd5e1', rim: '#eef0ff', rimK: 0.5, line: '#1e1b4b', texK: 0.2 };
      const hak = { c1: '#a78bfa', c2: '#3b0764', rim: '#eef0ff', rimK: 0.5, line: '#1e0535', texK: 0.2 };
      let s = K.aura('#a5b4fc', 100, 100, 0.42);
      // вихри
      s += K.g(K.line(spiral(28, 40, 1.6, 2.2), '#e0e7ff', 2.2), '', 'art-spin') + K.g(K.line(spiral(176, 150, 1.4, 2), '#e0e7ff', 2), '', 'art-spin');
      s += K.line('M6 120q18-12 36 0t30-2M130 176q20-10 40 0', '#e0e7ff', 2.4, { op: 0.6, cls: 'art-float' });
      // огромные крылья
      const wd = 'M80 94C60 72 36 56 8 54C2 56 2 64 8 66C0 72 2 80 10 80C4 86 6 94 14 92C8 100 12 106 20 102C18 112 26 116 32 108C32 118 40 122 46 114C48 124 58 126 60 116C64 120 72 118 72 110Z';
      s += K.mirror('<g class="art-wing">' + K.part(wd, '#475569', { line: '#0b1120', lw: 2 }) + K.part('M76 96C60 80 42 70 22 66C34 76 46 84 56 96C62 102 68 106 74 108Z', '#64748b', { line: '#0b1120', lw: 1.2 }) +
        K.line('M14 72C36 74 56 84 74 100M14 88C32 90 50 98 70 108M24 104C38 104 52 110 64 114', '#cbd5e1', 1.3, { op: 0.75 }) + '</g>');
      // одеяние до земли и хакама
      s += K.vol('M100 80C122 80 136 92 140 110L150 176H50L60 110C64 92 78 80 100 80Z', robe);
      s += K.vol('M56 138H144L152 178H48Z', hak) + K.line('M76 140L70 178M100 140V178M124 140L130 178', '#1e0535', 1.2, { op: 0.45 });
      s += K.line('M56 138H144', '#3b0764', 5) + K.stitch('M56 138H144', '#fde68a', 1.6);
      s += K.line('M84 84L100 110L116 84', '#1e1b4b', 1.6, { op: 0.6 });
      s += K.line('M86 96V132M114 96V132', '#78350f', 1.4) + pom(K, 86, 98, 6) + pom(K, 114, 98, 6) + pom(K, 86, 114, 6) + pom(K, 114, 114, 6) + pom(K, 86, 130, 5.4) + pom(K, 114, 130, 5.4);
      // левая рука (к зрителю слева) с чётками
      s += K.vol('M70 92C58 100 52 114 52 130C54 136 62 136 64 130C64 118 68 108 78 100Z', robe);
      s += K.part(K.ell(58, 134, 7, 6.5), '#ff8f80', { line: '#5c0a0a', lw: 1.6 });
      let beads = '';
      for (let i = 0; i < 9; i++) beads += `<circle cx="${r1(58 + 7 * Math.sin(i * 0.7))}" cy="${r1(140 + i * 3.2)}" r="2.2" fill="#78350f" stroke="#451a03" stroke-width=".7"/>`;
      s += beads;
      // правая рука поднимает веер из перьев
      s += K.vol('M128 92C140 86 150 76 156 64C160 58 166 62 164 68C160 80 150 94 136 102Z', robe);
      let fan = K.line('M162 70L164 84', '#78350f', 4) + K.line('M162 70L164 84', '#fbbf24', 2);
      const fd = 'M162 70C140 58 134 30 146 14C154 4 172 4 182 12C194 26 188 56 162 70Z';
      fan += K.part(fd, '#fef3c7', { line: '#78350f', lw: 1.8 });
      fan += `<path d="${fd}" fill="${K.lin(['#78350f', '#fef3c7', '#fef3c7'], 0, 0, 0, 1)}" opacity=".35"/>`;
      fan += K.line('M162 68L142 24M162 68L152 12M162 68L166 8M162 68L180 14M162 68L188 30', '#a16207', 1.3, { op: 0.9 });
      fan += `<circle cx="162" cy="68" r="4" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.2"/>`;
      s += K.g(fan, '', 'art-spin-soft');
      s += K.part(K.ell(160, 66, 7, 6.5), '#ff8f80', { line: '#5c0a0a', lw: 1.6 });
      // белая грива
      s += K.part('M68 46C56 58 54 84 60 104C68 100 74 94 80 88H120C126 94 132 100 140 104C146 84 144 58 132 46C122 34 78 34 68 46Z', '#f8fafc', { line: '#64748b', lw: 1.8 });
      s += K.line('M66 60C62 74 62 88 66 98M134 60C138 74 138 88 134 98M72 52C68 62 68 72 70 80M128 52C132 62 132 72 130 80', '#94a3b8', 1.3, { op: 0.8 });
      // лицо
      s += K.vol(K.ell(100, 64, 21, 22), face);
      s += tokin(K, 100, 44, 22);
      // борода и усы
      s += K.part('M80 74C80 94 90 112 100 120C110 112 120 94 120 74C112 82 88 82 80 74Z', '#f8fafc', { line: '#64748b', lw: 1.6 });
      s += K.line('M90 88C92 98 96 106 100 112M110 88C108 98 104 106 100 112M100 86V104', '#94a3b8', 1.2, { op: 0.8 });
      s += K.part('M84 78C88 74 96 74 100 78C104 74 112 74 116 78C112 82 104 82 100 80C96 82 88 82 84 78Z', '#ffffff', { line: '#64748b', lw: 1.2 });
      // грозные брови и глаза
      s += K.eyes(100, 60, 9, 5.8, { iris: '#f59e0b', lid: 'angry', skin: '#e0312f', look: [0.3, 0.2] });
      s += K.mirror(K.part('M78 50C84 48 90 50 94 54C88 54 84 54 80 56Z', '#ffffff', { line: '#64748b', lw: 1.2 }));
      // длинный нос
      s += K.vol('M95 70C110 64 124 56 138 50C142 50 143 54 140 57C128 66 114 76 101 82C96 80 93 74 95 70Z', { ...face, lw: 2 });
      s += K.gloss(118, 64, 7, 2, -28, 0.5);
      s += K.spark(24, 18, 3, '#e0e7ff', 'art-float') + K.spark(120, 16, 2.6, '#eef0ff') + K.spark(20, 170, 2.6, '#e0e7ff');
      return s;
    },

    // ===================== ЛЕС: тануки =====================

    // Танучок: круглый детёныш тануки в тёмной «маске» вокруг глаз, на макушке — зелёный листик для превращений;
    // сидит и стучит лапками в пузико-барабан («пон-поко!»), пушистый полосатый хвост
    jp_tanuchok(K) {
      const fur = { c1: '#e6bd92', c2: '#7a4f2c', rim: '#e4ffb0', rimK: 0.55, line: '#3b2410', texK: 0.16 }, dark = '#4a2f1a', cream = '#fbf0dc';
      let s = K.aura('#84cc16', 86, 118, 0.3);
      // хвост
      const tl = 'M124 164C148 170 168 156 166 134C164 118 152 110 142 116C148 122 150 132 144 140C138 148 128 150 122 156Z';
      s += K.vol(tl, { ...fur, c1: '#d6a77a', texK: 0.12 }) + K.line('M152 124C156 130 156 136 152 142M160 132C162 138 160 146 156 150', dark, 3, { op: 0.8 });
      // ушки
      s += K.mirror(K.vol(K.ell(64, 56, 13, 12), { ...fur, c1: '#8a5a34', c2: '#3b2410' }) + `<ellipse cx="65" cy="58" rx="6.5" ry="6" fill="#d9a07a" stroke="#3b2410" stroke-width="1.2"/>`);
      // тельце, пузико-барабан, лапки
      s += K.vol('M100 106C128 106 142 126 142 148C142 168 128 177 100 177C72 177 58 168 58 148C58 126 72 106 100 106Z', fur);
      s += K.part('M100 122C117 122 127 136 127 152C127 166 115 174 100 174C85 174 73 166 73 152C73 136 83 122 100 122Z', cream, { line: '#b8864f', lw: 1.6 });
      s += K.gloss(88, 134, 7, 4, -30, 0.55);
      s += K.mirror(K.vol(K.ell(78, 174, 13, 6.5), { ...fur, c1: '#6b4423', c2: '#2a180a', tex: false, lw: 2 }));
      // лапки стучат
      s += K.vol(K.ell(80, 148, 8.5, 7.5), { ...fur, c1: '#6b4423', c2: '#2a180a', tex: false, lw: 2 }) + K.vol(K.ell(120, 142, 8.5, 7.5), { ...fur, c1: '#6b4423', c2: '#2a180a', tex: false, lw: 2 });
      s += K.line('M62 134q-7 5-6 13M56 128q-10 8-8 20M138 128q7 5 6 13M144 122q10 8 8 20', '#fef3c7', 2, { op: 0.8, cls: 'art-blink' });
      // голова
      s += K.vol('M100 42C130 42 148 60 148 84C148 106 130 120 100 120C70 120 52 106 52 84C52 60 70 42 100 42Z', fur);
      s += K.part('M100 56C108 56 112 62 112 70C108 74 92 74 88 70C88 62 92 56 100 56Z', cream, { flat: true, lw: 0, op: 0.9 });
      // «маска» вокруг глаз
      s += K.mirror(K.part('M58 84C60 72 72 68 84 72C92 76 94 88 88 96C80 102 66 100 60 94C58 92 57 88 58 84Z', dark, { lw: 0 }));
      s += K.part('M100 90C112 90 122 98 122 106C122 114 112 118 100 118C88 118 78 114 78 106C78 98 88 90 100 90Z', cream, { flat: true, lw: 0 });
      s += K.gloss(72, 56, 8, 4.5, -35, 0.4);
      s += K.eyes(100, 84, 21, 11, { iris: '#a16207', look: [0.1, 0.4] });
      s += `<ellipse cx="100" cy="100" rx="6" ry="4.2" fill="#1c1208"/><ellipse cx="98.4" cy="98.8" rx="2" ry="1.1" fill="#fff" opacity=".7"/>`;
      s += K.mouth('cat', 100, 106, 12);
      s += K.blush(74, 104, 5) + K.blush(126, 104, 5);
      // листик на макушке
      s += K.line('M100 44C98 38 96 34 92 32', '#3f6212', 2) + K.leaf(92, 44, 28, -150, '#65a30d');
      s += K.spark(30, 44, 3, '#e4ffb0', 'art-float') + K.spark(174, 74, 2.6, '#fef3c7') + K.spark(26, 168, 2.4, '#e4ffb0');
      return s;
    },

    // Тануки: весельчак-тануки как статуэтка у дверей раменной — огромная соломенная шляпа с листиком, круглый живот,
    // в одной лапе бутылочка рамунэ со стеклянным шариком, в другой — книжечка-счёт на шнурке; полосатый хвост
    jp_tanuki(K) {
      const fur = { c1: '#dcac80', c2: '#6b4423', rim: '#e4ffb0', rimK: 0.55, line: '#3b2410', texK: 0.16 }, dark = '#4a2f1a', cream = '#fbf0dc';
      const paw = { ...fur, c1: '#6b4423', c2: '#2a180a', tex: false, lw: 2 };
      let s = K.aura('#84cc16', 94, 108, 0.32);
      // хвост
      const tl = 'M130 160C156 166 176 150 172 126C170 110 156 104 148 112C154 118 156 128 150 136C144 144 134 146 128 152Z';
      s += K.vol(tl, { ...fur, c1: '#d6a77a', texK: 0.12 }) + K.line('M158 118C162 124 162 132 158 138M166 128C168 134 166 142 162 146', dark, 3, { op: 0.8 });
      // ноги
      s += K.mirror(K.vol(K.ell(78, 172, 15, 8), paw));
      // тело и живот
      s += K.vol('M100 80C130 80 150 104 152 134C154 162 136 176 100 176C64 176 46 162 48 134C50 104 70 80 100 80Z', fur);
      s += K.part('M100 108C124 108 138 124 138 144C138 162 122 172 100 172C78 172 62 162 62 144C62 124 76 108 100 108Z', cream, { line: '#b8864f', lw: 1.6 });
      s += K.gloss(84, 122, 9, 5, -30, 0.55);
      s += `<circle cx="100" cy="146" r="2" fill="#b8864f"/>`;
      // правая лапа (к зрителю слева) держит книжечку-счёт
      s += K.vol('M66 96C56 102 50 112 50 124C52 130 60 130 62 124C62 114 66 106 74 102Z', fur);
      s += K.line('M56 128L46 140', '#78350f', 1.4);
      s += K.g(K.part('M30 138H54V168H30Z', '#fef3c7', { line: '#78350f', lw: 1.6 }) + K.line('M34 146H50M34 152H50M34 158H46', '#a16207', 1.2) +
        `<circle cx="46" cy="162" r="3" fill="none" stroke="#dc2626" stroke-width="1.4"/>` + K.part('M30 138H54V142H30Z', '#1e3a8a', { line: '#78350f', lw: 1.2 }), '', 'art-sway" style="transform-origin:50% 0');
      s += K.vol(K.ell(56, 126, 8, 7), paw);
      // левая лапа держит бутылочку рамунэ
      s += K.vol('M134 96C144 102 150 110 152 122C150 128 142 128 140 122C140 114 136 108 128 102Z', fur);
      s += `<path d="M144 102H160V144Q160 150 152 150Q144 150 144 144Z" fill="${K.lin(['#a5f3fc', '#5eead4', '#0d9488'], 0, 0, 1, 0)}" stroke="#134e4a" stroke-width="1.6" opacity=".92"/>`;
      s += K.part('M146 88H158L160 102H144Z', '#99f6e4', { line: '#134e4a', lw: 1.4 }) + `<circle cx="152" cy="96" r="4" fill="${K.rad([[0, '#ffffff'], [1, '#bae6fd']], 0.35, 0.3)}" stroke="#0e7490" stroke-width="1"/>`;
      s += K.part('M146 82H158V88H146Z', '#3b82f6', { line: '#1e3a8a', lw: 1.2 }) + K.line('M148 108V142', '#fff', 2, { op: 0.6 });
      s += `<circle cx="150" cy="130" r="1.4" fill="#fff" opacity=".8"/><circle cx="154" cy="120" r="1" fill="#fff" opacity=".8"/>`;
      s += K.vol(K.ell(144, 124, 8, 7), paw);
      // голова
      s += K.mirror(K.vol(K.ell(66, 54, 12, 11), { ...fur, c1: '#8a5a34', c2: '#3b2410' }));
      s += K.vol('M100 40C128 40 142 56 142 74C142 92 126 102 100 102C74 102 58 92 58 74C58 56 72 40 100 40Z', fur);
      s += K.mirror(K.part('M62 74C64 64 74 60 84 64C92 68 94 78 88 86C80 92 68 90 64 84C62 82 61 78 62 74Z', dark, { lw: 0 }));
      s += K.part('M100 76C112 76 122 84 122 90C122 98 112 102 100 102C88 102 78 98 78 90C78 84 88 76 100 76Z', cream, { flat: true, lw: 0 });
      s += K.eyes(100, 74, 18, 9.5, { iris: '#a16207', look: [0.1, 0.3] });
      s += `<ellipse cx="100" cy="86" rx="5.4" ry="3.8" fill="#1c1208"/><ellipse cx="98.6" cy="85" rx="1.8" ry="1" fill="#fff" opacity=".7"/>`;
      s += K.mouth('smile', 100, 92, 16);
      s += K.blush(74, 90, 5) + K.blush(126, 90, 5);
      // соломенная шляпа с листиком
      const hat = 'M34 56Q100 8 166 56Q138 64 100 64Q62 64 34 56Z';
      s += K.part(hat, '#e8c07a', { line: '#78350f', lw: 2 });
      s += K.line('M100 22L64 58M100 22L82 62M100 22V64M100 22L118 62M100 22L136 58M100 22L50 56M100 22L150 56', '#b88a3e', 1.2, { op: 0.8 });
      s += K.line('M58 46Q100 38 142 46', '#92400e', 1.4, { op: 0.8 }) + K.line('M46 52Q100 46 154 52', '#92400e', 1.2, { op: 0.6 });
      s += K.gloss(78, 38, 9, 3, -20, 0.4);
      s += K.leaf(100, 24, 26, -130, '#65a30d');
      s += K.spark(24, 30, 3, '#e4ffb0', 'art-float') + K.spark(180, 40, 2.6, '#fef3c7') + K.spark(20, 110, 2.4, '#e4ffb0');
      return s;
    },

    // Великий тануки: предводитель восьмисот восьми тануки — могучий тануки в зелёной накидке-хаори с золотыми гербами-листьями,
    // большой лист на голове; одной лапой замахнулся ударить в живот-барабан, в другой держит огромный лист, как веер. Вокруг — листопад
    jp_ootanuki(K) {
      const fur = { c1: '#d9a676', c2: '#5b3a1e', rim: '#e4ffb0', rimK: 0.55, line: '#2a180a', texK: 0.16 }, dark = '#3f2612', cream = '#fbf0dc';
      const paw = { ...fur, c1: '#6b4423', c2: '#2a180a', tex: false, lw: 2 };
      const haori = { c1: '#4ade80', c2: '#14532d', rim: '#e4ffb0', rimK: 0.6, line: '#052e16', texK: 0.2 };
      let s = K.aura('#84cc16', 100, 100, 0.42);
      // листопад позади
      s += maple(K, 26, 30, 9, -20, '#f97316', 'art-float', 0.3) + maple(K, 178, 24, 8, 30, '#dc2626', 'art-float', 1.1) + maple(K, 16, 106, 7, 10, '#facc15', 'art-float', 0.7);
      // хвост
      const tl = 'M132 156C164 164 188 144 184 116C182 98 166 90 156 98C164 106 166 118 158 128C150 138 138 140 130 146Z';
      s += K.vol(tl, { ...fur, c1: '#d6a77a', texK: 0.12 }) + K.line('M166 104C170 112 170 120 166 128M176 116C178 124 176 134 170 140', dark, 3.4, { op: 0.8 });
      // ноги
      s += K.mirror(K.vol(K.ell(76, 172, 18, 9), paw));
      // тело
      s += K.vol('M100 74C134 74 156 100 158 132C160 162 140 177 100 177C60 177 40 162 42 132C44 100 66 74 100 74Z', fur);
      s += K.part('M100 106C126 106 142 124 142 146C142 164 124 174 100 174C76 174 58 164 58 146C58 124 74 106 100 106Z', cream, { line: '#b8864f', lw: 1.6 });
      s += K.gloss(82, 122, 10, 5.5, -30, 0.55);
      s += `<circle cx="100" cy="146" r="2.2" fill="#b8864f"/>`;
      // хаори с гербами
      s += K.vol('M100 76C74 76 54 88 48 108L40 168C48 174 58 176 68 174L70 124C76 112 86 104 98 100Z', haori) + K.vol('M100 76C126 76 146 88 152 108L160 168C152 174 142 176 132 174L130 124C124 112 114 104 102 100Z', haori);
      s += K.line('M98 100C86 104 76 112 70 124L68 174M102 100C114 104 124 112 130 124L132 174', '#fde68a', 2.4);
      const mon = (x, y) => `<circle cx="${x}" cy="${y}" r="7" fill="#fef3c7" stroke="#a16207" stroke-width="1.4"/>` + K.leaf(x - 4.5, y + 3, 10, -40, '#15803d');
      s += mon(58, 120) + mon(142, 120);
      // правая лапа замахнулась
      s += K.vol('M58 98C46 94 38 84 36 70C36 64 42 62 46 66C48 76 54 84 64 88Z', haori);
      s += K.vol(K.ell(40, 64, 10, 9), paw);
      s += K.line('M26 52q-6 6-4 14M22 44q-10 10-8 24', '#fef3c7', 2.2, { op: 0.8, cls: 'art-blink' });
      // левая лапа держит огромный лист
      s += K.vol('M142 98C154 104 160 114 160 126C158 132 150 132 148 126C148 118 144 110 136 104Z', haori);
      s += K.g(K.line('M154 128L170 92', '#3f6212', 3) + K.leaf(170, 92, 46, -100, '#65a30d') + K.leaf(170, 92, 30, -60, '#84cc16'), '', 'art-sway" style="transform-origin:0% 100%');
      s += K.vol(K.ell(154, 128, 9, 8), paw);
      // голова
      s += K.mirror(K.vol(K.ell(64, 44, 13, 12), { ...fur, c1: '#8a5a34', c2: '#2a180a' }) + `<ellipse cx="65" cy="46" rx="6" ry="5.5" fill="#d9a07a" stroke="#2a180a" stroke-width="1.2"/>`);
      s += K.vol('M100 30C130 30 146 46 146 66C146 86 128 98 100 98C72 98 54 86 54 66C54 46 70 30 100 30Z', fur);
      s += K.mirror(K.part('M58 66C60 54 72 50 84 54C94 58 96 70 90 78C82 86 68 84 62 78C60 76 57 70 58 66Z', dark, { lw: 0 }));
      s += K.part('M100 70C114 70 124 78 124 86C124 94 114 98 100 98C86 98 76 94 76 86C76 78 86 70 100 70Z', cream, { flat: true, lw: 0 });
      s += K.mirror(K.part('M74 50C80 46 88 46 94 50C88 52 82 52 76 54Z', '#f5e1c4', { line: '#3f2612', lw: 1 }));
      s += K.eyes(100, 66, 20, 9.5, { iris: '#ca8a04', lid: 'angry', skin: '#3f2612', look: [0, 0.3] });
      s += `<ellipse cx="100" cy="80" rx="6" ry="4.2" fill="#1c1208"/><ellipse cx="98.4" cy="78.8" rx="2" ry="1.1" fill="#fff" opacity=".7"/>`;
      s += K.mouth('grin', 100, 86, 18);
      // большой лист на голове
      s += K.leaf(78, 34, 44, -18, '#4d7c0f') + K.leaf(100, 32, 30, -60, '#65a30d');
      // кружатся листья
      s += maple(K, 34, 146, 7, 40, '#ef4444', 'art-float', 0.9) + maple(K, 172, 168, 7.5, -30, '#f59e0b', 'art-float', 0.2) + maple(K, 120, 12, 6, 15, '#f97316', 'art-float', 1.4);
      s += K.spark(186, 76, 3, '#e4ffb0') + K.spark(14, 176, 2.6, '#fef3c7', 'art-float');
      return s;
    },

    // ===================== ТЕНЬ: кошки =====================

    // Котёнок Тама: белый трёхцветный котёнок с рыжим и чёрным пятнышками, красный ошейник с золотым колокольчиком;
    // старательно стоит на задних лапках, растопырив передние для равновесия. Над ним — тонкий месяц
    jp_tama(K) {
      const fur = { c1: '#ffffff', c2: '#b8b4d8', rim: '#e9d5ff', rimK: 0.7, line: '#2e1065', texK: 0.3 };
      const org = '#fb923c', blk = '#292524';
      let s = K.aura('#c084fc', 86, 118, 0.32);
      s += `<path d="M160 18A14 14 0 1 0 172 40A11 11 0 1 1 160 18Z" fill="#fef3c7" stroke="#a16207" stroke-width="1.2"/>`;
      // хвост
      const tl = 'M126 166C150 166 162 150 158 130C156 120 162 112 168 114';
      s += K.line(tl, '#2e1065', 11) + K.line(tl, '#f5f3ff', 7.4) + K.line('M158 130C156 120 162 112 168 114', org, 7.4);
      // задние лапки
      s += K.mirror(K.vol(K.ell(84, 174, 11, 6.5), { ...fur, tex: false, lw: 2 }));
      // тельце
      s += K.vol('M100 112C120 112 132 128 132 148C132 166 120 176 100 176C80 176 68 166 68 148C68 128 80 112 100 112Z', fur);
      s += K.part('M114 124C124 128 130 138 130 148C122 146 114 138 112 130Z', org, { lw: 0, op: 0.95 });
      // передние лапки растопырены
      s += K.mirror(K.vol('M80 134C70 136 58 132 48 124C44 120 48 114 54 118C62 124 70 126 80 126Z', fur) + K.vol(K.ell(46, 119, 7.5, 7), { ...fur, tex: false, lw: 2 }) + `<circle cx="44" cy="121" r="1.6" fill="#f9a8d4"/>`);
      // уши
      s += K.mirror(K.vol('M60 72C56 56 58 40 64 30C76 36 86 46 92 56Z', fur) + K.part('M65 64C63 54 64 44 67 38C74 42 80 48 84 56Z', '#fbcfe8', { line: '#be185d', lw: 1.2 }));
      s += K.part('M136 30C140 40 142 56 140 72L108 56C114 46 124 36 136 30Z', blk, { lw: 0, op: 0.9 });
      // голова
      s += K.vol('M100 44C130 44 148 62 148 86C148 108 128 122 100 122C72 122 52 108 52 86C52 62 70 44 100 44Z', fur);
      s += K.part('M58 76C60 60 74 48 92 46C92 58 84 68 72 74C66 78 60 80 58 76Z', org, { lw: 0, op: 0.95 });
      s += K.part('M140 70C138 58 128 50 116 48C118 56 124 64 134 70C136 72 140 74 140 70Z', blk, { lw: 0, op: 0.85 });
      s += K.gloss(78, 58, 7, 4, -35, 0.35);
      s += K.eyes(100, 86, 21, 12, { iris: '#16a34a', look: [0.1, 0.4] });
      s += `<path d="M96 100H104L100 104Z" fill="#f472b6" stroke="#9d174d" stroke-width="1.2" stroke-linejoin="round"/>`;
      s += K.mouth('cat', 100, 106, 12);
      s += K.blush(70, 104, 6) + K.blush(130, 104, 6);
      s += K.mirror(K.line('M68 100L50 96M68 106L52 110', '#6b7280', 1.3, { op: 0.6 }));
      // ошейник с колокольчиком
      s += K.line('M74 118Q100 128 126 118', '#b91c1c', 6) + K.line('M74 118Q100 128 126 118', '#f87171', 2, { op: 0.6 });
      s += `<circle cx="100" cy="130" r="6.4" fill="${K.rad([[0, '#fffbe6'], [0.5, '#fbbf24'], [1, '#b45309']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.4"/><path d="M94 129H106M100 131V136" stroke="#78350f" stroke-width="1.2"/><circle cx="100" cy="134" r="1.3" fill="#78350f"/>`;
      s += K.spark(28, 40, 3, '#e9d5ff', 'art-float') + K.spark(176, 80, 2.6, '#f5f3ff') + K.spark(24, 150, 2.4, '#e9d5ff') + K.spark(140, 16, 2, '#fef3c7');
      return s;
    },

    // Бакэнэко: серая полосатая кошка-оборотень танцует на задних лапах — на голове синее полотенце-тэнугуи в горошек,
    // лапы подняты в танце, хвост изогнут; хитрый прищур. Рядом светится бумажный фонарь-андон, из которого она лакомилась маслом
    jp_bakeneko(K) {
      const fur = { c1: '#f1f5f9', c2: '#8b93b0', rim: '#e9d5ff', rimK: 0.7, line: '#1e1b3a', texK: 0.3 }, st = '#475569';
      let s = K.aura('#c084fc', 94, 104, 0.34);
      // фонарь-андон
      s += `<circle class="art-aura" cx="32" cy="138" r="30" fill="${K.rad([[0, '#fde68a', 0.6], [1, '#f59e0b', 0]])}"/>`;
      s += K.part('M18 116H46V160H18Z', '#fef3c7', { line: '#78350f', lw: 1.8 }) + `<rect x="18" y="116" width="28" height="44" fill="${K.rad([[0, '#fff7c2', 0.9], [1, '#fbbf24', 0.2]])}"/>`;
      s += K.line('M18 130H46M18 146H46M32 116V160', '#92400e', 1.2, { op: 0.7 }) + K.line('M16 116H48M16 160H48M18 160L16 176M46 160L48 176', '#451a03', 2.6);
      s += K.flame(32, 146, 14, 9, '#fff7c2', '#f97316');
      // хвост
      const tl = 'M122 150C150 152 166 134 160 112C156 98 164 88 174 90';
      s += K.line(tl, '#1e1b3a', 11) + K.line(tl, '#cbd5e1', 7.4) + `<path d="${tl}" fill="none" stroke="${st}" stroke-width="7.4" stroke-dasharray="4 7"/>`;
      // опорная нога и поднятая нога
      s += K.vol('M84 146C80 156 80 166 82 174H96C98 166 98 156 96 148Z', fur) + K.vol(K.ell(88, 175, 11, 6), { ...fur, tex: false, lw: 2 });
      s += K.vol('M110 144C120 148 128 152 134 150C140 148 142 154 138 158C130 164 118 162 106 156Z', fur) + K.vol(K.ell(138, 154, 7, 6.5), { ...fur, tex: false, lw: 2 });
      // тело
      s += K.vol('M100 92C120 92 132 108 132 128C132 146 120 158 100 158C80 158 68 146 68 128C68 108 80 92 100 92Z', fur);
      s += K.part('M100 108C110 108 116 118 116 130C116 142 108 150 100 150C92 150 84 142 84 130C84 118 90 108 100 108Z', '#ffffff', { flat: true, lw: 0, op: 0.8 });
      s += K.line('M70 116l10 3M68 128l10 1M130 116l-10 3M132 128l-10 1', st, 3);
      // лапы в танце
      s += K.vol('M74 106C60 100 48 90 42 78C40 72 46 68 50 72C56 82 64 90 78 96Z', fur) + K.vol(K.ell(44, 72, 7.5, 7), { ...fur, tex: false, lw: 2 });
      s += K.vol('M126 104C138 102 148 96 154 86C158 80 164 84 162 90C156 102 144 110 128 114Z', fur) + K.vol(K.ell(158, 86, 7.5, 7), { ...fur, tex: false, lw: 2 });
      s += K.line('M50 86l6 2M150 94l5-4', st, 2.4);
      // уши
      s += K.mirror(K.vol('M64 50C60 36 62 22 68 12C78 18 88 28 92 38Z', fur) + K.part('M68 44C66 36 67 28 70 22C76 26 81 31 84 38Z', '#fbcfe8', { line: '#be185d', lw: 1.2 }));
      // голова
      s += K.vol('M100 28C126 28 142 44 142 64C142 84 124 96 100 96C76 96 58 84 58 64C58 44 74 28 100 28Z', fur);
      s += K.mirror(K.line('M64 60l9 2M62 70l9 0', st, 3));
      // полотенце-тэнугуи в горошек
      const tw = 'M58 54C58 32 78 18 100 18C122 18 142 32 142 54C130 44 116 40 100 40C84 40 70 44 58 54Z';
      s += K.part(tw, '#3b82f6', { line: '#1e3a8a', lw: 1.8 });
      s += `<g fill="#eff6ff"><circle cx="80" cy="30" r="2"/><circle cx="96" cy="26" r="2"/><circle cx="112" cy="27" r="2"/><circle cx="126" cy="33" r="2"/><circle cx="70" cy="42" r="2"/><circle cx="88" cy="36" r="2"/><circle cx="104" cy="34" r="2"/><circle cx="120" cy="38" r="2"/><circle cx="134" cy="44" r="2"/></g>`;
      s += K.g(K.part('M138 46C148 40 156 42 162 36C160 46 152 52 142 52Z', '#3b82f6', { line: '#1e3a8a', lw: 1.4 }) + K.part('M140 50C150 52 156 58 164 58C158 64 148 62 140 56Z', '#60a5fa', { line: '#1e3a8a', lw: 1.4 }), '', 'art-sway');
      s += `<circle cx="140" cy="50" r="4" fill="#2563eb" stroke="#1e3a8a" stroke-width="1.2"/>`;
      // хитрый прищур
      s += K.eyes(100, 66, 17, 9.5, { iris: '#eab308', lid: 'half', skin: '#dfe3ee', look: [0.4, 0.2] });
      s += `<path d="M96 78H104L100 82Z" fill="#f472b6" stroke="#9d174d" stroke-width="1.2" stroke-linejoin="round"/>`;
      s += K.mouth('cat', 100, 84, 14);
      s += K.mirror(K.line('M72 78L52 74M72 84L54 88', '#6b7280', 1.3, { op: 0.6 }));
      s += K.blush(76, 80, 5) + K.blush(124, 80, 5);
      s += K.spark(176, 20, 3, '#e9d5ff', 'art-float') + K.spark(24, 30, 2.6, '#f5f3ff') + K.spark(182, 170, 2.4, '#e9d5ff');
      return s;
    },

    // Нэкомата: большая мудрая кошка сидит, лиловая с белым; раздвоенный хвост поднят двумя дугами, и на кончике каждого горит
    // голубой огонёк ониби; вокруг плавают блуждающие огоньки. Лиловая лента с серебряным колокольчиком, спокойный мудрый взгляд
    jp_nekomata(K) {
      const fur = { c1: '#faf5ff', c2: '#a78bda', rim: '#e9d5ff', rimK: 0.75, line: '#2e1065', texK: 0.3 }, mk = '#7c3aed';
      let s = K.aura('#c084fc', 100, 100, 0.42);
      // раздвоенный хвост с огоньками
      const t1 = 'M120 150C150 150 158 120 146 96C138 80 142 62 154 54', t2 = 'M122 150C160 156 184 130 180 100C178 84 184 70 190 62';
      s += K.line(t1, '#2e1065', 12) + K.line(t1, '#ede9fe', 8.4) + K.line('M146 96C138 80 142 62 154 54', mk, 8.4);
      s += K.line(t2, '#2e1065', 12) + K.line(t2, '#ede9fe', 8.4) + K.line('M180 100C178 84 184 70 190 62', mk, 8.4);
      s += onibi(K, 155, 56, 26, 0.2) + onibi(K, 190, 64, 22, 0.9);
      // тело сидя
      s += K.vol('M100 96C130 96 146 120 148 146C150 166 138 178 100 178C62 178 50 166 52 146C54 120 70 96 100 96Z', fur);
      s += K.mirror(K.vol(K.ell(64, 166, 15, 12), { ...fur, lw: 2.4 }));
      s += K.part('M58 128C64 124 72 126 76 132C68 132 62 134 58 138Z', mk, { lw: 0, op: 0.7 }) + K.part('M142 128C136 124 128 126 124 132C132 132 138 134 142 138Z', mk, { lw: 0, op: 0.7 });
      // передние лапы
      s += K.mirror(K.vol('M78 120C76 140 76 160 76 170C76 177 82 180 88 180C94 180 97 177 97 170C97 156 96 140 95 124Z', fur) + K.line('M82 175v4M88 174v5M93 175v4', '#6b21a8', 1.3, { op: 0.6 }));
      // грудка
      s += K.part('M76 102Q78 116 86 120Q88 130 100 128Q112 130 114 120Q122 116 124 102Z', '#ffffff', { line: '#c4b5fd', lw: 1.4 });
      // уши
      s += K.mirror(K.vol('M64 58C58 42 58 24 64 12C78 18 88 30 94 42Z', fur) + K.part('M67 50C64 40 64 30 67 22C74 26 80 32 84 40Z', '#f5d0fe', { line: '#a21caf', lw: 1.2 }) +
        K.part('M64 12C70 15 75 18 80 22L63 26C62 20 62 16 64 12Z', mk, { lw: 0 }));
      // голова
      s += K.vol('M100 38C128 38 146 54 146 76C146 96 128 108 100 108C72 108 54 96 54 76C54 54 72 38 100 38Z', fur);
      s += K.part('M100 42C106 42 110 48 110 56C106 60 94 60 90 56C90 48 94 42 100 42Z', mk, { lw: 0, op: 0.8 }) + K.mirror(K.line('M62 66l10 2M60 76l10 0', mk, 3, { op: 0.8 }));
      s += K.gloss(78, 54, 7, 4, -35, 0.4);
      s += K.eyes(100, 74, 17, 9.5, { iris: '#a855f7', lid: 'half', skin: '#ece4fb', lash: true, look: [0, 0.3] });
      s += `<path d="M96 86H104L100 90Z" fill="#f472b6" stroke="#9d174d" stroke-width="1.2" stroke-linejoin="round"/>`;
      s += K.mouth('cat', 100, 92, 12);
      s += K.mirror(K.line('M72 88L50 84M72 94L52 98', '#7c3aed', 1.3, { op: 0.6 }));
      s += K.blush(76, 90, 5) + K.blush(124, 90, 5);
      // лента с колокольчиком
      s += K.line('M72 106Q100 118 128 106', '#7c3aed', 6) + K.stitch('M72 106Q100 118 128 106', '#e9d5ff', 1.4);
      s += `<circle cx="100" cy="120" r="6" fill="${K.rad([[0, '#ffffff'], [0.6, '#cbd5e1'], [1, '#64748b']], 0.35, 0.3)}" stroke="#334155" stroke-width="1.3"/><path d="M94.5 119H105.5" stroke="#334155" stroke-width="1.1"/><circle cx="100" cy="123" r="1.2" fill="#334155"/>`;
      // блуждающие огоньки
      s += onibi(K, 26, 60, 18, 0.5) + onibi(K, 36, 120, 14, 1.3) + onibi(K, 160, 20, 12, 1.7);
      s += K.spark(60, 18, 3, '#e9d5ff', 'art-float') + K.spark(18, 170, 2.6, '#f5f3ff');
      return s;
    },

    // ===================== ВОДА: каппа =====================

    // Каппёнок: маленький зелёный каппа с блюдцем воды на макушке (в блюдце плещется вода), чёлка-венчик вокруг блюдца,
    // жёлтый клювик и панцирь за спиной; держит обеими лапками огурчик. Под ним лужица с пузырьками
    jp_kappyonok(K) {
      const skin = { c1: '#bbf7d0', c2: '#16a34a', rim: '#c8f3ff', rimK: 0.75, line: '#064e3b', texK: 0.16 };
      const shell = { c1: '#bef264', c2: '#3f6212', rim: '#c8f3ff', rimK: 0.6, line: '#1a2e05', tex: false };
      let s = K.aura('#38bdf8', 86, 120, 0.3);
      s += `<ellipse cx="100" cy="176" rx="66" ry="8" fill="${K.rad([[0, '#7dd3fc', 0.6], [1, '#2b8fd6', 0]])}"/>`;
      s += '<g class="art-aura"><ellipse cx="100" cy="176" rx="76" ry="9" fill="none" stroke="#bfeaff" stroke-width="1.6" opacity=".45"/></g>';
      // панцирь за спиной
      s += K.vol('M100 104C134 104 150 126 150 150C150 168 134 178 100 178C66 178 50 168 50 150C50 126 66 104 100 104Z', shell);
      s += K.line('M56 134L66 140L64 154M144 134L134 140L136 154M58 162L66 154M142 162L134 154', '#1a2e05', 1.6, { op: 0.6 });
      // тельце и желтоватый живот-пластрон
      s += K.vol('M100 112C124 112 136 128 136 148C136 166 124 176 100 176C76 176 64 166 64 148C64 128 76 112 100 112Z', skin);
      s += K.part('M100 122C114 122 122 134 122 150C122 164 112 172 100 172C88 172 78 164 78 150C78 134 86 122 100 122Z', '#fef9c3', { line: '#a3a34a', lw: 1.4 });
      s += K.line('M82 140H118M80 152H120M84 164H116', '#ca8a04', 1.2, { op: 0.6 });
      // лапки-перепонки
      s += K.mirror(K.part('M72 168C66 170 62 176 64 180H88C88 176 84 170 78 168Z', '#4ade80', { line: '#064e3b', lw: 1.6 }) + K.line('M70 176l-2 4M76 174v6M82 176l2 4', '#064e3b', 1, { op: 0.6 }));
      // огурчик в лапках
      s += K.g(K.part('M70 142C70 134 132 132 132 140C132 148 70 150 70 142Z', '#22c55e', { line: '#14532d', lw: 1.8 }) + K.line('M76 138H126', '#86efac', 1.6, { op: 0.8 }) +
        `<g fill="#14532d"><circle cx="82" cy="142" r="1"/><circle cx="94" cy="144" r="1"/><circle cx="106" cy="141" r="1"/><circle cx="118" cy="143" r="1"/></g>` + `<ellipse cx="132" cy="140" rx="2" ry="4" fill="#bbf7d0" stroke="#14532d" stroke-width="1"/>`, 'rotate(-6 100 142)');
      s += K.vol(K.ell(72, 142, 8, 7.5), { ...skin, tex: false, lw: 2 }) + K.vol(K.ell(128, 138, 8, 7.5), { ...skin, tex: false, lw: 2 });
      // голова
      s += K.vol('M100 46C130 46 148 64 148 88C148 110 128 124 100 124C72 124 52 110 52 88C52 64 70 46 100 46Z', skin);
      // чёлка-венчик
      s += K.part('M54 80C52 60 70 44 100 44C130 44 148 60 146 80C142 74 136 70 130 72C128 64 120 60 112 64C108 58 92 58 88 64C80 60 72 64 70 72C64 70 58 74 54 80Z', '#0f5132', { line: '#052e16', lw: 1.6 });
      s += K.line('M70 70C74 64 80 62 86 64M114 64C120 62 126 64 130 70', '#34d399', 1.2, { op: 0.6 });
      // блюдце с водой
      s += `<ellipse cx="100" cy="46" rx="27" ry="8.4" fill="${K.lin(['#ffffff', '#e2e8f0'])}" stroke="#334155" stroke-width="1.8"/>`;
      s += `<ellipse cx="100" cy="45" rx="21" ry="5.6" fill="${K.lin(['#bae6fd', '#38bdf8'])}" stroke="#0369a1" stroke-width="1"/><path d="M86 44Q92 42 98 44" stroke="#fff" stroke-width="1.4" fill="none" opacity=".9"/>`;
      s += `<g class="art-float"><path d="M114 34C114 30 116 27 118 24C120 27 122 30 122 34C122 37 120 38 118 38C116 38 114 37 114 34Z" fill="#bae6fd" stroke="#0369a1" stroke-width="1.2"/></g>`;
      s += K.eyes(100, 86, 20, 11.5, { iris: '#0369a1', look: [0.1, 0.4] });
      s += K.blush(70, 102, 6) + K.blush(130, 102, 6);
      // жёлтый клювик
      s += K.part('M86 100Q100 94 114 100Q112 110 100 112Q88 110 86 100Z', '#fbbf24', { line: '#92400e', lw: 1.6 }) + K.line('M88 102Q100 106 112 102', '#92400e', 1.2, { op: 0.8 });
      s += `<circle cx="42" cy="150" r="3" fill="none" stroke="#e0f7ff" stroke-width="1.4" class="art-float"/><circle cx="158" cy="130" r="2.4" fill="none" stroke="#e0f7ff" stroke-width="1.2" class="art-float"/>`;
      s += K.spark(30, 60, 3, '#e0f7ff', 'art-float') + K.spark(172, 70, 2.6, '#e0f7ff');
      return s;
    },

    // Каппа: взрослый каппа-сумоист в стойке сико — ноги широко, одна перепончатая лапа поднята, другая упёрта в колено;
    // тёмно-синий пояс-маваси с бахромой, из-за пояса торчит огурец; за спиной большой панцирь, на макушке блюдце с водой
    jp_kappa(K) {
      const skin = { c1: '#a7f3c0', c2: '#15803d', rim: '#c8f3ff', rimK: 0.75, line: '#052e16', texK: 0.16 };
      const shell = { c1: '#bef264', c2: '#365314', rim: '#c8f3ff', rimK: 0.6, line: '#1a2e05', tex: false };
      let s = K.aura('#38bdf8', 94, 106, 0.34);
      s += '<g class="art-aura"><ellipse cx="100" cy="176" rx="80" ry="10" fill="none" stroke="#bfeaff" stroke-width="1.8" opacity=".5"/><ellipse cx="100" cy="176" rx="60" ry="6" fill="none" stroke="#bfeaff" stroke-width="1.4" opacity=".4"/></g>';
      // панцирь за спиной
      s += K.vol('M100 76C136 76 156 100 156 128C156 150 142 162 128 164H72C58 162 44 150 44 128C44 100 64 76 100 76Z', shell);
      s += K.line('M50 112L62 118L60 136L48 142M150 112L138 118L140 136L152 142M62 118L76 108M138 118L124 108', '#1a2e05', 1.8, { op: 0.6 });
      // ноги в стойке
      s += K.mirror(K.vol('M80 146C70 150 62 160 60 172H84C86 164 88 158 94 154Z', skin) + K.part('M54 170C50 172 48 178 50 181H84C84 176 80 172 74 170Z', '#4ade80', { line: '#052e16', lw: 1.6 }) + K.line('M58 176l-2 4M66 174v7M74 175l2 5', '#052e16', 1, { op: 0.6 }));
      // тело
      s += K.vol('M100 84C124 84 140 98 142 120C144 140 136 152 124 156H76C64 152 56 140 58 120C60 98 76 84 100 84Z', skin);
      s += K.part('M100 94C116 94 126 106 126 122C126 136 116 144 100 144C84 144 74 136 74 122C74 106 84 94 100 94Z', '#fef9c3', { line: '#a3a34a', lw: 1.4 });
      s += K.line('M80 110H120M78 124H122', '#ca8a04', 1.2, { op: 0.6 });
      // маваси и бахрома
      s += K.vol('M58 136Q100 146 142 136L140 154Q100 162 60 154Z', { c1: '#6366f1', c2: '#1e1b4b', rim: '#c8f3ff', rimK: 0.5, line: '#0f0a2e', tex: false });
      s += K.line('M84 156V172M90 157V174M96 158V175M104 158V175M110 157V174M116 156V172', '#312e81', 2.4);
      s += K.g(K.part('M118 134C122 126 134 118 140 120C144 124 132 134 124 142Z', '#22c55e', { line: '#14532d', lw: 1.6 }) + `<ellipse cx="140" cy="120" rx="3" ry="2" fill="#bbf7d0" stroke="#14532d" stroke-width="1"/>`, '');
      // рука вверх и рука на колене
      s += K.vol('M66 100C56 94 48 82 46 66C46 60 52 58 56 62C58 74 64 84 74 92Z', skin);
      s += K.part('M42 64C38 56 40 46 46 44C48 40 54 40 56 44C60 42 64 46 62 52C64 56 62 62 58 64Z', '#4ade80', { line: '#052e16', lw: 1.6 }) + K.line('M48 46L50 58M54 46L54 58M60 50L57 60', '#052e16', 1, { op: 0.6 });
      s += K.vol('M134 100C146 108 152 124 150 142C148 148 140 148 140 142C140 128 136 118 128 110Z', skin) + K.vol(K.ell(144, 146, 8, 7), { ...skin, tex: false, lw: 2 });
      // голова
      s += K.vol('M100 30C126 30 142 46 142 66C142 86 124 98 100 98C76 98 58 86 58 66C58 46 74 30 100 30Z', skin);
      s += K.part('M58 60C56 42 74 28 100 28C126 28 144 42 142 60C140 66 138 70 134 70C132 62 126 56 118 58C114 50 106 48 100 50C94 48 86 50 82 58C74 56 68 62 66 70C62 70 58 66 58 60Z', '#0f5132', { line: '#052e16', lw: 1.6 });
      s += K.line('M60 64C60 70 62 76 64 80M140 64C140 70 138 76 136 80', '#0f5132', 3);
      s += `<ellipse cx="100" cy="30" rx="26" ry="8" fill="${K.lin(['#ffffff', '#e2e8f0'])}" stroke="#334155" stroke-width="1.8"/>`;
      s += `<ellipse cx="100" cy="29" rx="20" ry="5.2" fill="${K.lin(['#bae6fd', '#38bdf8'])}" stroke="#0369a1" stroke-width="1"/><path d="M86 28Q92 26 98 28" stroke="#fff" stroke-width="1.4" fill="none" opacity=".9"/>`;
      s += K.eyes(100, 66, 16, 9.5, { iris: '#0369a1', lid: 'angry', skin: '#4ade80', look: [0, 0.2] });
      s += K.part('M86 78Q100 72 114 78Q112 90 100 92Q88 90 86 78Z', '#fbbf24', { line: '#92400e', lw: 1.6 }) + K.line('M88 81Q100 85 112 81', '#92400e', 1.2, { op: 0.8 });
      s += K.blush(76, 80, 5) + K.blush(124, 80, 5);
      s += `<circle cx="30" cy="120" r="3.4" fill="none" stroke="#e0f7ff" stroke-width="1.4" class="art-float"/><circle cx="172" cy="96" r="2.6" fill="none" stroke="#e0f7ff" stroke-width="1.2" class="art-float"/>`;
      s += K.line('M20 176q10-8 20 0M160 176q10-8 20 0', '#bfeaff', 2, { op: 0.7 });
      s += K.spark(176, 40, 3, '#e0f7ff', 'art-float') + K.spark(26, 30, 2.6, '#e0f7ff');
      return s;
    },

    // ===================== ОГОНЬ: дарума =====================

    // Дарумка: красная неваляшка-дарума покачивается — белое лицо, брови-журавли и усы-черепаха, один глаз нарисован,
    // второй ещё пустой; на боках золотые узоры. Рядом стоит кисточка с тушью, которой однажды дорисуют второй глаз
    jp_darumka(K) {
      const red = { c1: '#ff7b6b', c2: '#c0161b', rim: '#ffe29a', rimK: 0.7, line: '#5c0a0a', texK: 0.25 };
      let s = K.aura('#ff9a3d', 86, 124, 0.32);
      // кисточка
      s += K.line('M150 176L174 110', '#78350f', 5) + K.line('M150 176L174 110', '#d6a756', 2.6) + K.line('M162 144L166 134', '#78350f', 1.2);
      s += K.part('M171 112C170 104 174 96 180 92C182 100 180 108 177 114Z', '#1f2937', { line: '#020617', lw: 1.2 });
      s += `<ellipse cx="150" cy="177" rx="12" ry="3.4" fill="#1f2937" opacity=".5"/>`;
      let c = '';
      const body = 'M100 70C130 70 150 94 151 126C152 158 132 178 100 178C68 178 48 158 49 126C50 94 70 70 100 70Z';
      c += K.vol(body, red);
      // золотые узоры
      c += K.line('M62 152C70 146 76 150 76 156C76 162 68 162 68 156M138 152C130 146 124 150 124 156C124 162 132 162 132 156', '#fbbf24', 2.4);
      c += K.line('M66 168Q84 160 100 168Q116 160 134 168', '#fbbf24', 2.6) + K.line('M78 176Q100 166 122 176', '#fde68a', 1.6, { op: 0.8 });
      c += K.line('M56 118C58 106 62 98 68 92', '#fde68a', 2.4, { op: 0.8 });
      // лицо
      c += K.part('M100 86C120 86 134 100 134 118C134 134 120 144 100 144C80 144 66 134 66 118C66 100 80 86 100 86Z', '#fff7ed', { line: '#7f1d1d', lw: 1.8 });
      c += K.gloss(78, 80, 9, 5, -35, 0.45);
      // брови-журавли
      c += K.mirror(K.line('M72 102C76 94 84 92 92 98', INK, 3.6) + K.line('M74 100L70 96', INK, 2.4));
      // один глаз нарисован, второй пустой
      c += K.eye(86, 112, 8, { iris: '#1f2937', look: [0.2, 0.2] });
      c += `<ellipse cx="114" cy="112" rx="6.9" ry="8.3" fill="#fff" stroke="${INK}" stroke-width="1.6"/><ellipse cx="114" cy="112" rx="3.6" ry="4.6" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="1.6 1.6"/>`;
      // усы-черепаха и борода-завитки
      c += K.line('M84 128C88 124 96 124 100 128C104 124 112 124 116 128', INK, 3);
      c += K.line('M74 126C70 132 72 138 78 138M126 126C130 132 128 138 122 138', '#475569', 2.2, { op: 0.8 });
      c += K.mouth('smile', 100, 132, 9);
      c += K.blush(76, 124, 5.4) + K.blush(124, 124, 5.4);
      s += K.g(c, '', 'art-sway" style="transform-origin:50% 100%');
      s += K.spark(30, 60, 3.2, '#ffe29a', 'art-float') + K.spark(170, 70, 2.8, '#fff3b0') + K.spark(24, 150, 2.4, '#ffd23f', 'art-float');
      return s;
    },

    // Дарума: желание сбылось — у большой даруму оба глаза нарисованы, решительный взгляд, золотые брови и борода; на животе
    // золотой знак удачи и пояс облаков. За спиной — тёплый храмовый костёр донто-яки, вокруг летят искры и золотые монетки удачи
    jp_daruma(K) {
      const red = { c1: '#ff6a5a', c2: '#9f1015', rim: '#ffe29a', rimK: 0.75, line: '#4a0707', texK: 0.25 };
      let s = K.aura('#ff9a3d', 100, 108, 0.42);
      // костёр позади
      s += K.flame(46, 176, 64, 40, '#fff3b0', '#f97316', { style: 'animation-delay:-.3s' }) + K.flame(154, 176, 60, 38, '#fff3b0', '#ef4444', { style: 'animation-delay:-.8s' });
      s += K.flame(70, 116, 70, 52, '#ffe29a', '#f97316', { style: 'animation-delay:-.5s' }) + K.flame(130, 114, 74, 54, '#ffe29a', '#ef4444', { style: 'animation-delay:-1.1s' });
      s += K.line('M20 178L64 166M180 178L136 166M30 172L70 176M170 172L130 176', '#78350f', 5) + K.line('M20 178L64 166M180 178L136 166', '#b45309', 2);
      const body = 'M100 58C136 58 158 86 159 122C160 158 136 178 100 178C64 178 40 158 41 122C42 86 64 58 100 58Z';
      s += K.vol(body, red);
      // золотой пояс облаков и знак удачи
      s += K.line('M48 150Q64 140 78 150T108 150T138 150T156 146', '#fbbf24', 3.2) + K.line('M52 162Q70 152 84 162T114 162T148 160', '#fde68a', 2, { op: 0.8 });
      s += `<circle cx="100" cy="158" r="11" fill="${K.rad([[0, '#fffbe6'], [0.6, '#fbbf24'], [1, '#b45309']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.6"/>`;
      s += [0, 72, 144, 216, 288].map(a => `<circle cx="${r1(100 + 4.8 * Math.cos((a - 90) * Math.PI / 180))}" cy="${r1(158 + 4.8 * Math.sin((a - 90) * Math.PI / 180))}" r="3.6" fill="#dc2626" stroke="#7f1d1d" stroke-width=".9"/>`).join('') + `<circle cx="100" cy="158" r="2.2" fill="#fde68a" stroke="#b45309" stroke-width=".8"/>`;
      s += K.line('M52 110C54 96 60 86 68 78M148 110C146 96 140 86 132 78', '#fde68a', 2.4, { op: 0.7 });
      // лицо
      s += K.part('M100 74C122 74 138 90 138 110C138 128 122 140 100 140C78 140 62 128 62 110C62 90 78 74 100 74Z', '#fff7ed', { line: '#7f1d1d', lw: 2 });
      s += K.gloss(74, 72, 10, 5.5, -35, 0.45);
      // золотые брови-журавли
      s += K.mirror(K.line('M68 92C72 82 82 80 92 86', '#78350f', 5.4) + K.line('M68 92C72 82 82 80 92 86', '#fbbf24', 3));
      s += K.eyes(100, 104, 14, 8.6, { iris: '#1f2937', lid: 'angry', skin: '#fde2cf', look: [0, 0.2] });
      // золотая борода
      s += K.line('M80 122C84 116 94 116 100 122C106 116 116 116 120 122', '#78350f', 5.4) + K.line('M80 122C84 116 94 116 100 122C106 116 116 116 120 122', '#fbbf24', 3);
      s += K.line('M70 118C64 126 68 136 76 136M130 118C136 126 132 136 124 136', '#78350f', 4) + K.line('M70 118C64 126 68 136 76 136M130 118C136 126 132 136 124 136', '#fbbf24', 2.2);
      s += K.line('M94 130Q100 134 106 130', INK, 2.6);
      s += K.blush(74, 118, 5.4) + K.blush(126, 118, 5.4);
      // искры и монетки удачи
      const coin = (x, y, r, d) => `<g class="art-float" style="animation-delay:-${d}s"><circle cx="${x}" cy="${y}" r="${r}" fill="${K.rad([[0, '#fff7c2'], [0.55, '#fbbf24'], [1, '#b45309']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="${r1(r * 0.35)}" fill="none" stroke="#78350f" stroke-width="1"/></g>`;
      s += coin(24, 60, 6, 0.4) + coin(178, 50, 5.4, 1.2) + coin(176, 118, 4.6, 0.8);
      s += K.spark(40, 24, 3, '#ffe29a', 'art-float') + K.spark(158, 20, 2.8, '#fff3b0') + K.spark(18, 120, 2.6, '#ffd23f');
      return s;
    },

    // ===================== ТОК: райдзю =====================

    // Громушка: детёныш райдзю свернулся в маленькой дождевой тучке — жёлтая шёрстка с голубыми полосками-молниями, большие ушки,
    // хвостик-молния с пушистым кончиком; вокруг потрескивают искорки и падают капли
    jp_gromushka(K) {
      const fur = { c1: '#fff4b0', c2: '#e0a91a', rim: '#fff6b0', rimK: 0.7, line: '#5a3a06', texK: 0.2 }, blue = '#3b82f6';
      let s = K.aura('#facc15', 88, 116, 0.34);
      // хвост-молния
      const tl = 'M122 146L148 132L138 124L166 104L152 98L176 74L160 72L168 60';
      s += K.line(tl, '#5a3a06', 11) + K.line(tl, '#fde047', 7) + K.line(tl, '#fff', 2, { op: 0.6 });
      s += `<circle class="art-aura" cx="168" cy="60" r="12" fill="${K.rad([[0, '#fffbe6', 0.9], [0.5, '#facc15', 0.4], [1, '#facc15', 0]])}"/>`;
      // ушки
      s += K.mirror(K.vol('M62 70C54 54 54 34 62 20C76 28 88 42 94 56Z', fur) + K.part('M66 62C62 50 62 38 66 30C73 36 80 44 84 54Z', '#bfdbfe', { line: '#1d4ed8', lw: 1.2 }));
      // тельце
      s += K.vol('M100 104C126 104 140 122 140 144C140 160 126 168 100 168C74 168 60 160 60 144C60 122 74 104 100 104Z', fur);
      s += K.line('M68 124l8 4l-4 3l8 5M132 124l-8 4l4 3l-8 5', blue, 2.4);
      // голова
      s += K.vol('M100 42C130 42 148 60 148 84C148 106 128 120 100 120C72 120 52 106 52 84C52 60 70 42 100 42Z', fur);
      s += K.part('M100 46L94 58H100L96 68L108 54H102L106 46Z', blue, { line: '#1e3a8a', lw: 1.2 });
      s += K.mirror(K.line('M56 82l8 2l-4 3l8 3', blue, 2.4));
      s += K.part('M100 90C114 90 126 98 132 108C124 118 112 120 100 120C88 120 76 118 68 108C74 98 86 90 100 90Z', '#fffbe6', { flat: true, lw: 0 });
      s += K.gloss(74, 58, 8, 4.5, -35, 0.4);
      s += K.eyes(100, 84, 20, 12, { iris: '#2563eb', look: [0.1, 0.4] });
      s += `<ellipse cx="100" cy="100" rx="5" ry="3.4" fill="#3b2a06"/>`;
      s += K.mouth('cat', 100, 106, 11);
      s += K.blush(70, 104, 6.4) + K.blush(130, 104, 6.4);
      s += zap(K, 64, 104, 0.7, -30, '#fde047', 0.3) + zap(K, 130, 102, 0.7, 20, '#fef08a', 0.9);
      // лапки на краю тучки
      s += K.mirror(K.vol(K.ell(82, 148, 8, 6.5), { ...fur, tex: false, lw: 2 }));
      // тучка
      s += kumo(K, 100, 166, 1.55, { c1: '#f1f5f9', c2: '#94a3b8', line: '#334155' });
      s += K.line('M72 182l-2 6M100 184l-2 6M128 182l-2 6', '#93c5fd', 2.2, { op: 0.8, cls: 'art-blink' });
      s += K.spark(28, 50, 3.2, '#fef08a', 'art-float') + K.spark(172, 112, 2.6, '#fde047') + K.spark(22, 130, 2.4, '#fef08a');
      return s;
    },

    // Райдзю: громовой зверь спрыгнул на землю с молнией — синий волкоподобный зверь в жёлтых полосах-молниях, грива из молний,
    // хвост раздвоенной молнией, когти-искры; за ним бьёт молния, а на стволе дерева слева светятся свежие следы когтей
    jp_raiju(K) {
      const fur = { c1: '#9ec5ff', c2: '#1e3a8a', rim: '#fff6b0', rimK: 0.8, line: '#0b1640', texK: 0.25 }, yel = '#fde047';
      let s = K.aura('#facc15', 96, 106, 0.38);
      // молния позади
      s += `<g class="art-blink"><path d="M150 0L130 50L146 52L120 104L136 106L108 160" fill="none" stroke="#fef08a" stroke-width="10" stroke-linejoin="round" opacity=".35"/><path d="M150 0L130 50L146 52L120 104L136 106L108 160" fill="none" stroke="#fffbe6" stroke-width="3.4" stroke-linejoin="round"/></g>`;
      // ствол дерева со следами когтей
      s += K.part('M4 20C10 60 10 120 4 180H26C22 120 22 60 26 20Z', '#78716c', { line: '#292524', lw: 1.8 }) + K.line('M10 40C12 70 12 110 10 150M20 60C20 90 20 130 18 170', '#57534e', 1.2, { op: 0.8 });
      s += `<g class="art-blink" style="animation-delay:-.6s">` + K.line('M10 90l10 14M12 84l10 14M14 78l10 14', '#fde047', 2.4) + '</g>';
      s += K.line('M22 34C30 28 36 22 40 12', '#44403c', 3) + K.leaf(40, 12, 14, -40, '#65a30d') + K.leaf(32, 24, 12, -10, '#84cc16') + K.leaf(8, 22, 12, -130, '#4d7c0f');
      // хвост-молния
      const tl = 'M134 150L160 140L150 132L176 118L164 112L186 96', t2 = 'M160 140L182 144L176 136L196 136';
      s += K.line(tl, '#0b1640', 11) + K.line(tl, yel, 7) + K.line(t2, '#0b1640', 9) + K.line(t2, yel, 5);
      // задние лапы и тело
      s += K.vol('M100 104C134 104 154 128 154 152C154 170 138 178 100 178C62 178 46 170 46 152C46 128 66 104 100 104Z', fur);
      s += K.mirror(K.vol(K.ell(60, 166, 16, 12), { ...fur, lw: 2.4 }));
      s += K.line('M58 132l10 4l-5 4l10 6M142 132l-10 4l5 4l-10 6M84 160l6-6l2 6l6-6M116 160l-6-6l-2 6l-6-6', yel, 3);
      // передние лапы с когтями
      s += K.mirror(K.vol('M80 120C70 134 62 150 58 164C56 174 62 180 70 180C78 180 84 176 86 170C88 156 92 140 96 126Z', fur) +
        `<path d="M58 175l-5 4l6 0M66 179l-1 5l4-4M75 179l2 5l2-5" fill="#fffbe6" stroke="#0b1640" stroke-width="1" stroke-linejoin="round"/>` + K.line('M70 146l8 3l-4 3l8 4', yel, 2.6));
      s += K.part('M84 112Q100 126 116 112L112 146Q100 152 88 146Z', '#dbeafe', { line: '#3b62c4', lw: 1.4 }) + K.line('M92 124l4 6l4-6l4 6l4-6M94 136l3 4l3-4l3 4l3-4', '#93c5fd', 1.2);
      // грива из молний
      [-160, -130, -100, -80, -50, -20].forEach((a, i) => {
        const t = a * Math.PI / 180, x = r1(100 + 50 * Math.cos(t)), y = r1(76 + 42 * Math.sin(t));
        s += K.g(`<path d="M0 0L8-10L2-12L12-26L-2-12L4-10Z" fill="${yel}" stroke="#a16207" stroke-width="1.4" stroke-linejoin="round"/>`, `translate(${x} ${y}) rotate(${a + 90})`, i % 2 ? 'art-blink' : '');
      });
      // уши
      s += K.mirror(K.vol('M64 58C58 44 58 28 64 16C76 24 86 36 92 48Z', fur) + K.part('M68 50C65 42 65 32 68 26C74 30 79 36 82 44Z', '#fde68a', { line: '#a16207', lw: 1.2 }));
      // голова
      s += K.vol('M100 40C130 40 148 58 148 80C148 100 132 112 116 116C108 120 92 120 84 116C68 112 52 100 52 80C52 58 70 40 100 40Z', fur);
      s += K.part('M100 44L93 58H100L95 70L109 54H102L106 44Z', yel, { line: '#a16207', lw: 1.2 });
      s += K.mirror(K.line('M56 76l10 2l-5 4l10 3', yel, 2.6));
      s += K.part('M100 86C116 86 128 94 132 104C126 114 114 118 100 118C86 118 74 114 68 104C72 94 84 86 100 86Z', '#dbeafe', { flat: true, lw: 0 });
      s += K.gloss(76, 54, 8, 4.5, -35, 0.4);
      s += K.eyes(100, 76, 17, 10, { iris: '#facc15', lid: 'angry', skin: '#3b62c4', look: [0, 0.2] });
      s += `<ellipse cx="100" cy="94" rx="5.6" ry="3.6" fill="#0b1640"/>`;
      s += K.mouth('fang', 100, 102, 18);
      s += zap(K, 36, 30, 1.2, -20, yel, 0.4) + zap(K, 176, 60, 1.1, 30, '#fef08a', 1.1) + zap(K, 30, 132, 1, 10, yel, 0.7);
      s += K.spark(60, 14, 3, '#fef08a', 'art-float') + K.spark(186, 170, 2.4, '#fffbe6');
      return s;
    },

    // ===================== РЕДКИЕ =====================

    // Ака-они: пухлый красный великан-они — жёлтые рожки, чёрные кудри, набедренная повязка из тигровой шкуры, через плечо
    // железная палица-канабо с шипами; улыбается во весь клык, а от макушки отскакивают жареные бобы Сэцубуна
    jp_akaoni(K) {
      const skin = { c1: '#ff8a7a', c2: '#b91c1c', rim: '#ffe29a', rimK: 0.7, line: '#4a0707', texK: 0.22 };
      let s = K.aura('#ff7a3d', 96, 106, 0.38);
      // палица-канабо
      const club = 'M140 30C150 26 162 28 166 34L150 124C148 128 142 128 140 124Z';
      s += K.g(K.part(club, '#64748b', { line: '#0f172a', lw: 2 }) + `<path d="${club}" fill="${K.lin(['#cbd5e1', '#475569', '#1e293b'], 0, 0, 1, 0)}" opacity=".6"/>` +
        [[146, 44], [158, 44], [144, 62], [155, 62], [143, 80], [153, 80], [142, 98], [151, 98]].map(([x, y]) => `<path d="M${x} ${y}l3-3l3 3l-3 3z" fill="#e2e8f0" stroke="#0f172a" stroke-width="1"/>`).join('') +
        K.line('M143 116L149 116', '#fbbf24', 3), 'rotate(18 145 124)');
      // ноги
      s += K.mirror(K.vol('M76 146C72 156 70 164 70 172H94C94 164 94 156 94 148Z', skin) + K.vol(K.ell(80, 174, 13, 6.5), { ...skin, tex: false, lw: 2 }));
      // тело
      s += K.vol('M100 76C134 76 154 100 154 128C154 150 136 160 100 160C64 160 46 150 46 128C46 100 66 76 100 76Z', skin);
      s += K.gloss(70, 94, 9, 5, -35, 0.4);
      s += K.line('M88 112Q100 118 112 112', '#7f1d1d', 1.6, { op: 0.6 }) + `<circle cx="100" cy="124" r="2" fill="#7f1d1d"/>`;
      // тигровая повязка
      s += K.vol('M52 134Q100 146 148 134L146 158Q100 168 54 158Z', { c1: '#fde047', c2: '#d97706', rim: '#fff3b0', rimK: 0.5, line: '#5a2d06', tex: false });
      s += tigerStripes(K, [[62, 140, -10], [80, 144, -5], [98, 146, 0], [116, 144, 5], [134, 140, 10]]);
      // руки: левая держит палицу, правая машет
      s += K.vol('M134 92C146 96 152 106 152 118C150 124 142 124 140 118C140 110 136 104 128 100Z', skin) + K.vol(K.ell(146, 120, 9, 8), { ...skin, tex: false, lw: 2 });
      s += K.vol('M66 94C54 90 44 80 40 66C38 60 44 56 48 60C52 72 60 80 72 84Z', skin) + K.vol(K.ell(42, 60, 9, 8), { ...skin, tex: false, lw: 2 });
      // голова
      s += K.mirror(K.vol(K.ell(60, 62, 8, 10), { ...skin, lw: 2 }));
      s += K.vol('M100 26C128 26 144 42 144 62C144 82 126 96 100 96C74 96 56 82 56 62C56 42 72 26 100 26Z', skin);
      // кудри
      s += K.part('M60 52C58 32 76 18 100 18C124 18 142 32 140 52C136 46 130 44 126 46C124 38 116 36 110 40C106 34 94 34 90 40C84 36 76 38 74 46C70 44 64 46 60 52Z', '#1c1917', { line: '#000', lw: 1.6 });
      s += K.line(spiral(78, 32, 0.7, 1.4) + spiral(100, 26, 0.7, 1.4) + spiral(122, 32, 0.7, 1.4), '#57534e', 1.2, { op: 0.9 });
      // рожки
      s += K.mirror(K.part('M78 26C74 16 74 8 78 2C84 8 88 16 88 24Z', '#fde68a', { line: '#78350f', lw: 1.6 }) + K.line('M76 14L84 16M76 20L86 22', '#b45309', 1, { op: 0.8 }));
      s += K.eyes(100, 62, 16, 10, { iris: '#ca8a04', look: [0.2, 0.2] });
      s += K.mirror(K.line('M76 48L92 52', '#1c1917', 4));
      s += `<ellipse cx="100" cy="76" rx="6" ry="4" fill="#991b1b"/>`;
      s += `<path d="M82 82Q100 78 118 82Q114 94 100 95Q86 94 82 82Z" fill="#6b1d2a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="100" cy="90" rx="6" ry="2.6" fill="#f47a8f"/>`;
      s += `<path d="M85 82.4l2.4 5.6l2.4-6.2ZM115 82.4l-2.4 5.6l-2.4-6.2Z" fill="#fff"/>`;
      s += K.blush(74, 78, 5) + K.blush(126, 78, 5);
      // бобы Сэцубуна
      const bean = (x, y, r, d) => `<g class="art-float" style="animation-delay:-${d}s"><ellipse cx="${x}" cy="${y}" rx="4.6" ry="3.6" transform="rotate(${r} ${x} ${y})" fill="${K.rad([[0, '#fef3c7'], [1, '#d6a756']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.2"/><path d="M${x - 1.6} ${y - 1}q1.6 1 3.2 0" stroke="#78350f" stroke-width=".8" fill="none"/></g>`;
      s += bean(58, 8, 20, 0.2) + bean(122, 6, -30, 0.9) + bean(30, 32, 50, 1.4) + bean(170, 150, 10, 0.6) + bean(24, 150, -20, 1.1);
      s += K.spark(92, 6, 3, '#fff3b0') + K.spark(184, 90, 2.6, '#ffe29a', 'art-float');
      return s;
    },

    // Юки-онна: снежная дева в белом кимоно с голубыми снежинками и бледно-голубым поясом-оби, длинные чёрные волосы
    // струятся на ветру; подол растворяется в метели. Спокойный взгляд, лёгкое морозное дыхание, вокруг кружат снежинки
    jp_yukionna(K) {
      const skin = '#f5f8ff', robe = { c1: '#ffffff', c2: '#bae6fd', rim: '#e0f2fe', rimK: 0.6, line: '#0c4a6e', texK: 0.2 };
      let s = K.aura('#38bdf8', 100, 100, 0.36) + K.aura('#ffffff', 60, 80, 0.2);
      // волосы сзади — струятся по ветру
      s += K.g(K.part('M78 46C66 66 62 96 58 124C54 146 44 158 30 168C48 170 62 162 72 148C80 136 84 118 88 100H112C116 118 120 136 128 148C138 162 152 170 170 168C156 158 146 146 142 124C138 96 134 66 122 46Z', '#1e1b3a', { line: '#0b0a1f', lw: 1.6 }) +
        K.line('M70 80C66 104 62 130 50 152M130 80C134 104 138 130 150 152', '#4c4a7a', 1.4, { op: 0.7 }), '', 'art-sway" style="transform-origin:50% 0');
      // кимоно, подол тает в метели
      s += K.vol('M100 84C114 84 124 92 128 106C134 128 142 150 150 166C140 170 132 168 124 172C116 168 108 174 100 170C92 174 84 168 76 172C68 168 60 170 50 166C58 150 66 128 72 106C76 92 86 84 100 84Z', robe);
      s += K.line('M80 116C76 136 70 154 64 166M120 116C124 136 130 154 136 166', '#7dd3fc', 1.4, { op: 0.7 });
      s += K.line('M100 90L92 170', '#0c4a6e', 1.4, { op: 0.5 }) + K.line('M88 88L100 104L112 88', '#7dd3fc', 2.4);
      s += flake(78, 150, 5, '#7dd3fc', '') + flake(124, 140, 4.4, '#7dd3fc', '') + flake(94, 128, 3.6, '#7dd3fc', '') + flake(112, 160, 3.6, '#7dd3fc', '');
      // оби
      s += K.part('M74 112Q100 120 126 112L125 124Q100 132 75 124Z', '#7dd3fc', { line: '#0c4a6e', lw: 1.6 }) + K.line('M76 118Q100 126 124 118', '#e0f2fe', 1.4);
      // рукава
      s += K.mirror(K.vol('M76 96C62 104 56 120 56 138C62 148 74 150 82 144C82 130 86 116 92 108Z', robe) + K.line('M58 140C64 146 74 148 80 142', '#7dd3fc', 1.6));
      s += K.part(K.ell(96, 116, 5.5, 4.6), skin, { line: '#64748b', lw: 1.3 }) + K.part(K.ell(104, 116, 5.5, 4.6), skin, { line: '#64748b', lw: 1.3 });
      // лицо и чёлка
      s += K.vol(K.ell(100, 64, 18, 20), { c1: skin, c2: '#c7d7ee', rim: '#e0f2fe', tex: false, hiK: 0.2, lw: 2.2, line: '#475569' });
      s += K.part('M81 64C78 44 88 38 100 38C112 38 122 44 119 64C114 54 108 50 100 50C92 50 86 54 81 64Z', '#1e1b3a', { line: '#0b0a1f', lw: 1.4 });
      s += K.line('M100 40C98 46 96 50 92 54M100 40C104 46 106 50 110 52', '#4c4a7a', 1.2, { op: 0.7 });
      s += K.line('M84 46C80 56 80 70 82 80M116 46C120 56 120 70 118 80', '#1e1b3a', 3.4);
      s += K.eyes(100, 67, 7.5, 4.8, { iris: '#0ea5e9', lid: 'half', skin, lash: true, look: [0.4, 0.3] });
      s += K.blush(88, 76, 3.4) + K.blush(112, 76, 3.4);
      s += `<path d="M97 79Q100 81 103 79Q100 78 97 79Z" fill="#7dd3fc" stroke="#0369a1" stroke-width="1"/>`;
      // морозное дыхание
      s += K.g(K.line('M106 80C116 78 124 82 132 78', '#e0f2fe', 2, { op: 0.8 }) + flake(138, 76, 4.4) + flake(148, 86, 3.2), '', 'art-float');
      // снежинки и сугроб
      s += `<path d="M20 180C40 170 60 176 80 172C100 176 120 170 140 174C160 170 176 174 186 180Z" fill="${K.lin(['#ffffff', '#dbeafe'])}" stroke="#93c5fd" stroke-width="1.4"/>`;
      s += flake(26, 40, 7, '#f0f9ff', 'art-blink', 0.2) + flake(172, 30, 6, '#f0f9ff', 'art-blink', 0.9) + flake(20, 110, 5, '#f0f9ff', 'art-float', 0.5) + flake(182, 120, 5.4, '#f0f9ff', 'art-float', 1.2) + flake(150, 8, 3.6);
      return s;
    },

    // Момотаро: мальчик из персика — белая повязка-хатимаки с персиком, красная безрукавка-дзимбаори поверх синего кимоно,
    // в одной руке знамя с персиком (на древке сидит фазан), в другой — палочка с тремя колобками кибиданго; у ног верный пёсик,
    // позади — огромный расколотый персик с листьями
    jp_momotaro(K) {
      const skin = '#fcd9b8', face = { c1: skin, c2: '#e8b48a', rim: '#fff3d6', tex: false, lw: 2.2, line: '#7a4a2a' };
      const kim = { c1: '#93c5fd', c2: '#1e40af', rim: '#e4ffb0', rimK: 0.5, line: '#0b1f5c', texK: 0.2 };
      const vest = { c1: '#f87171', c2: '#991b1b', rim: '#fde68a', rimK: 0.6, line: '#450a0a', texK: 0.2 };
      let s = K.aura('#84cc16', 96, 104, 0.34);
      // огромный персик позади
      s += `<circle class="art-aura" cx="100" cy="104" r="84" fill="${K.rad([[0.4, '#fecdd3', 0.45], [1, '#fb7185', 0]])}"/>`;
      const peach = 'M100 44C88 28 60 28 46 52C32 76 36 118 56 144C70 162 88 168 100 168C112 168 130 162 144 144C164 118 168 76 154 52C140 28 112 28 100 44Z';
      s += K.vol(peach, { c1: '#fff1f2', c2: '#fb7185', rim: '#fff1f2', rimK: 0.6, line: '#881337', tex: false, hiK: 0.3 });
      s += K.line('M100 46C92 74 92 124 100 166', '#e11d48', 2.2, { op: 0.45 }) + K.gloss(62, 64, 10, 5, -40, 0.5);
      s += K.line('M100 44C100 36 102 30 106 26', '#78350f', 3) + K.leaf(104, 30, 26, -160, '#65a30d') + K.leaf(104, 30, 26, -20, '#4d7c0f');
      // знамя с персиком и фазан
      s += K.line('M40 178L40 22', '#451a03', 4.6) + K.line('M40 178L40 22', '#a16207', 2.4);
      s += K.g(K.part('M42 28H70V92H42Z', '#fff7ed', { line: '#7c2d12', lw: 1.8 }) + K.part('M42 28H70V34H42Z', '#dc2626', { line: '#7c2d12', lw: 1.2 }) +
        `<path d="M56 50C50 50 46 56 48 62C50 70 56 72 56 74C56 72 62 70 64 62C66 56 62 50 56 50Z" fill="#fb7185" stroke="#881337" stroke-width="1.4"/>` + K.leaf(56, 50, 9, -60, '#65a30d') +
        K.line('M46 82H66M48 88H64', '#1f2937', 1.6, { op: 0.8 }), '', 'art-sway" style="transform-origin:0% 0%');
      // фазан на древке
      s += K.line('M44 20C54 16 64 18 72 12', '#065f46', 3.4) + K.line('M44 20C54 16 64 18 72 12', '#34d399', 1.6);
      s += K.vol(K.ell(40, 16, 9, 7), { c1: '#6ee7b7', c2: '#047857', rim: '#e4ffb0', line: '#022c22', tex: false, lw: 1.6 });
      s += K.vol(K.ell(34, 8, 5, 5), { c1: '#86efac', c2: '#065f46', rim: '#e4ffb0', line: '#022c22', tex: false, lw: 1.4 }) + `<path d="M29 8L25 10L29 11Z" fill="#fbbf24" stroke="#78350f" stroke-width=".8"/><circle cx="33" cy="7" r="1.8" fill="#dc2626"/><circle cx="33" cy="7" r=".8" fill="${INK}"/>`;
      // ноги в хакама и соломенные сандалии
      s += K.mirror(K.vol('M82 146C80 154 78 162 78 170H96C98 162 98 154 98 148Z', kim) + K.part('M74 168H98L99 176H72Z', '#e8c07a', { line: '#78350f', lw: 1.4 }));
      // кимоно
      s += K.vol('M100 90C120 90 132 100 134 116L136 152H64L66 116C68 100 80 90 100 90Z', kim);
      s += K.line('M88 92L100 114L112 92', '#fff7ed', 3);
      // безрукавка-дзимбаори
      s += K.vol('M84 92C74 94 66 102 64 116L62 150H82L88 108Z', vest) + K.vol('M116 92C126 94 134 102 136 116L138 150H118L112 108Z', vest);
      s += K.stitch('M84 94L82 148M116 94L118 148', '#fde68a', 1.6);
      s += `<circle cx="72" cy="124" r="5" fill="#fff7ed" stroke="#450a0a" stroke-width="1.2"/><circle cx="128" cy="124" r="5" fill="#fff7ed" stroke="#450a0a" stroke-width="1.2"/>`;
      s += K.part('M68 124C66 121 68 118 72 120C76 118 78 121 76 124C75 127 72 128 72 129C72 128 69 127 68 124Z', '#fb7185', { lw: 0 }) + K.part('M124 124C122 121 124 118 128 120C132 118 134 121 132 124C131 127 128 128 128 129C128 128 125 127 124 124Z', '#fb7185', { lw: 0 });
      // пояс и мешочек кибиданго
      s += K.line('M66 134H134', '#fbbf24', 5) + K.line('M66 134H134', '#b45309', 1.2, { op: 0.6 });
      s += K.part('M108 136C104 140 104 150 110 154C116 156 122 150 120 142C118 138 114 136 108 136Z', '#f5e1c4', { line: '#78350f', lw: 1.4 }) + K.line('M108 138Q114 136 118 140', '#dc2626', 1.6);
      // рука со знаменем
      s += K.vol('M70 100C60 104 52 108 46 112C42 116 44 122 50 120C56 118 64 114 74 110Z', kim) + K.part(K.ell(44, 116, 6.5, 6), skin, { line: '#7a4a2a', lw: 1.6 });
      // рука с кибиданго
      s += K.vol('M130 100C142 104 150 110 154 120C156 126 150 128 146 124C142 116 136 112 126 108Z', kim);
      s += K.line('M152 124L166 90', '#a16207', 2);
      s += [[163, 96], [159, 106], [155, 116]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="5.6" fill="${K.rad([[0, '#fffbeb'], [1, i === 1 ? '#fde68a' : '#f5deb3']], 0.35, 0.3)}" stroke="#92400e" stroke-width="1.3"/>`).join('');
      s += K.part(K.ell(150, 124, 6.5, 6), skin, { line: '#7a4a2a', lw: 1.6 });
      // пёсик у ног
      const dog = { c1: '#ffffff', c2: '#e8c49a', rim: '#fff3d6', rimK: 0.5, line: '#7c4a1a', tex: false, lw: 1.8 };
      s += K.line('M148 166C156 160 160 152 156 146', '#7c4a1a', 6) + K.line('M148 166C156 160 160 152 156 146', '#f3c58f', 3.4);
      s += K.vol('M128 158C140 154 152 158 154 168C154 176 146 179 136 179C126 179 120 176 120 170C120 164 122 160 128 158Z', dog);
      s += K.part('M122 142L124 132L130 140Z', '#e8b07a', { line: '#7c4a1a', lw: 1.4 }) + K.part('M142 140L148 132L148 144Z', '#e8b07a', { line: '#7c4a1a', lw: 1.4 });
      s += K.vol(K.ell(134, 150, 13, 11), dog);
      s += `<ellipse cx="134" cy="155" rx="6" ry="4" fill="#fff7ed"/><ellipse cx="134" cy="153" rx="2.2" ry="1.6" fill="#1f2937"/><circle cx="129" cy="148" r="1.8" fill="#1f2937"/><circle cx="139" cy="148" r="1.8" fill="#1f2937"/>` + K.mouth('cat', 134, 156, 6);
      // голова
      s += K.vol(K.ell(100, 64, 20, 21), face);
      s += K.part('M80 62C78 44 88 38 100 38C112 38 122 44 120 62C114 54 108 52 100 52C92 52 86 54 80 62Z', '#1f1a24', { line: '#0b0a10', lw: 1.4 });
      s += K.vol(K.ell(100, 32, 8, 6.5), { c1: '#3a3344', c2: '#0b0a10', line: '#0b0a10', lw: 1.6, tex: false }) + K.line('M92 30H108', '#dc2626', 2);
      // хатимаки с персиком
      s += K.line('M80 52Q100 44 120 52', '#f8fafc', 5.4) + K.line('M80 52Q100 44 120 52', '#cbd5e1', 1, { op: 0.8 });
      s += `<path d="M100 42C96 42 94 46 95 49C96 52 99 53 100 54C101 53 104 52 105 49C106 46 104 42 100 42Z" fill="#fb7185" stroke="#881337" stroke-width="1.1"/>`;
      s += K.g(K.line('M120 52C128 50 132 54 138 50M120 54C126 58 130 58 136 62', '#f8fafc', 3.4), '', 'art-sway');
      s += K.eyes(100, 68, 8.5, 5.6, { iris: '#78350f', look: [0.1, 0.2] });
      s += K.mirror(K.line('M86 58L96 59', '#1f1a24', 2.2));
      s += K.mouth('smile', 100, 78, 10);
      s += K.blush(86, 76, 4) + K.blush(114, 76, 4);
      s += petal(22, 60, 5, 20, '#fbcfe8', 'art-float', 0.4) + petal(180, 40, 5, -30, '#fbcfe8', 'art-float', 1.1) + petal(182, 110, 4.4, 60, '#fecdd3', 'art-float', 0.7);
      s += K.spark(176, 16, 3, '#e4ffb0') + K.spark(16, 130, 2.6, '#fef3c7', 'art-float');
      return s;
    },

    // ===================== ЭПИЧЕСКИЕ =====================

    // Райдзин: бог грома на чёрной грозовой туче — за спиной дуга из красных барабанов-тайко с узором томоэ, в руках
    // палочки-бати; светлая голубоватая кожа, дикая золотая грива, рожки, тигровая повязка и развевающийся шарф; из барабанов бьют молнии
    jp_raijin(K) {
      const skin = { c1: '#dbeafe', c2: '#6f93d8', rim: '#fff6b0', rimK: 0.7, line: '#1e2a5c', texK: 0.2 };
      let s = K.aura('#facc15', 100, 100, 0.42) + K.aura('#60a5fa', 70, 60, 0.25);
      // дуга барабанов
      s += `<path d="M14 108A86 86 0 0 1 186 108" fill="none" stroke="#450a0a" stroke-width="6"/><path d="M14 108A86 86 0 0 1 186 108" fill="none" stroke="#dc2626" stroke-width="3"/>`;
      for (let i = 0; i < 8; i++) { const a = (190 + i * 22.9) * Math.PI / 180; s += taiko(K, r1(100 + 86 * Math.cos(a)), r1(108 + 86 * Math.sin(a)), 11.5); }
      s += zap(K, 10, 60, 1.3, -40, '#fde047', 0.2) + zap(K, 180, 30, 1.3, 20, '#fef08a', 0.9) + zap(K, 40, 8, 1.1, -10, '#fef08a', 1.4);
      // грозовая туча
      s += kumo(K, 100, 170, 2.2, { c1: '#64748b', c2: '#1e293b', line: '#0f172a' });
      // ноги в стойке
      s += K.mirror(K.vol('M78 140C70 146 64 154 62 164H84C86 158 90 152 94 148Z', skin) + K.vol(K.ell(72, 164, 12, 6), { ...skin, tex: false, lw: 2 }));
      // тело
      s += K.vol('M100 84C122 84 136 96 138 114C140 132 132 144 122 148H78C68 144 60 132 62 114C64 96 78 84 100 84Z', skin);
      s += K.line('M84 104Q92 108 98 104M102 104Q108 108 116 104', '#3b5bb0', 1.6, { op: 0.6 }) + `<circle cx="100" cy="124" r="2" fill="#3b5bb0"/>`;
      // тигровая повязка
      s += K.vol('M64 132Q100 142 136 132L134 152Q100 160 66 152Z', { c1: '#fde047', c2: '#d97706', rim: '#fff3b0', rimK: 0.5, line: '#5a2d06', tex: false });
      s += tigerStripes(K, [[74, 136, -8], [90, 139, -4], [106, 140, 2], [122, 138, 8]]);
      // шарф
      const sc = 'M60 92C44 88 34 76 24 82C18 86 20 94 28 92M140 92C156 88 166 76 176 82C182 86 180 94 172 92';
      s += K.g(K.line('M62 96Q100 80 138 96', '#065f46', 6.4) + K.line(sc, '#065f46', 6.4) + K.line('M62 96Q100 80 138 96', '#34d399', 3.6) + K.line(sc, '#34d399', 3.6), '', 'art-float');
      // руки с палочками
      s += K.vol('M68 94C56 88 48 78 46 64C46 58 52 56 56 60C58 72 64 80 74 86Z', skin) + K.vol('M132 94C144 88 152 78 154 64C154 58 148 56 144 60C142 72 136 80 126 86Z', skin);
      s += K.line('M50 60L30 38', '#78350f', 5) + K.line('M50 60L30 38', '#d6a756', 2.6) + `<circle cx="29" cy="37" r="3.4" fill="#fde68a" stroke="#78350f" stroke-width="1.2"/>`;
      s += K.line('M150 60L170 38', '#78350f', 5) + K.line('M150 60L170 38', '#d6a756', 2.6) + `<circle cx="171" cy="37" r="3.4" fill="#fde68a" stroke="#78350f" stroke-width="1.2"/>`;
      s += K.vol(K.ell(51, 60, 8, 7.5), { ...skin, tex: false, lw: 2 }) + K.vol(K.ell(149, 60, 8, 7.5), { ...skin, tex: false, lw: 2 });
      // дикая золотая грива
      [-170, -145, -120, -95, -70, -45, -20].forEach((a, i) => {
        const t = a * Math.PI / 180, x = r1(100 + 30 * Math.cos(t)), y = r1(56 + 28 * Math.sin(t));
        s += K.g(K.flame(x, y + 10, 30, 20, '#fffbe6', '#eab308', { style: `animation-delay:-${(i * 0.3).toFixed(1)}s` }), `rotate(${a + 90} ${x} ${y})`);
      });
      // голова
      s += K.vol('M100 36C122 36 134 50 134 66C134 84 120 94 100 94C80 94 66 84 66 66C66 50 78 36 100 36Z', skin);
      s += K.mirror(K.part('M84 40C82 32 84 24 88 18C92 24 94 32 92 40Z', '#fef3c7', { line: '#78350f', lw: 1.4 }));
      s += K.mirror(K.part('M76 52C82 46 90 46 96 50L94 54C88 52 82 52 78 56Z', '#eab308', { line: '#78350f', lw: 1 }));
      s += K.eyes(100, 62, 14, 8.4, { iris: '#f59e0b', lid: 'angry', skin: '#a9c2ee', look: [0, 0.2] });
      s += `<ellipse cx="100" cy="74" rx="4.4" ry="3" fill="#3b5bb0"/>`;
      s += `<path d="M84 80Q100 76 116 80Q112 92 100 93Q88 92 84 80Z" fill="#6b1d2a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M86 80.4H114L112 84H88Z" fill="#fff"/><ellipse cx="100" cy="89" rx="5" ry="2.2" fill="#f47a8f"/>`;
      s += K.blush(78, 76, 4.4) + K.blush(122, 76, 4.4);
      s += K.spark(100, 10, 3.4, '#fef08a', 'art-float') + K.spark(186, 130, 2.6, '#fffbe6') + K.spark(14, 130, 2.6, '#fef08a');
      return s;
    },

    // Фудзин: бог ветра на облаке — зелёная кожа, огненно-рыжие вихры, рожки, широкая ухмылка; над головой обеими руками держит
    // раздутый мешок ветров, из его горловин вырываются закрученные потоки; тигровая повязка и развевающийся шарф
    jp_fujin(K) {
      const skin = { c1: '#bbf7d0', c2: '#2f9e5f', rim: '#eef0ff', rimK: 0.7, line: '#063b22', texK: 0.2 };
      let s = K.aura('#a5b4fc', 100, 100, 0.42) + K.aura('#ffffff', 60, 50, 0.2);
      // мешок ветров
      const bag = 'M24 60C18 40 30 20 56 14C76 10 90 18 100 18C110 18 124 10 144 14C170 20 182 40 176 60C168 54 156 52 146 58C136 50 118 46 100 48C82 46 64 50 54 58C44 52 32 54 24 60Z';
      s += K.g(K.vol(bag, { c1: '#f8fafc', c2: '#a5b4fc', rim: '#ffffff', rimK: 0.6, line: '#312e81', texK: 0.3 }) +
        K.line('M40 34C56 26 74 28 88 32M112 32C126 28 144 26 160 34', '#6366f1', 1.4, { op: 0.6 }), '', 'art-spin-soft');
      // горловины и потоки ветра
      s += K.mirror(K.part('M26 60C22 64 18 70 20 76C26 76 30 72 32 66Z', '#c7d2fe', { line: '#312e81', lw: 1.6 }));
      s += K.mirror(K.line('M30 50C26 56 26 64 30 70', '#7f1d1d', 4.4) + K.line('M30 50C26 56 26 64 30 70', '#ef4444', 2.4) + K.g(K.line('M28 70C24 76 26 82 22 88', '#ef4444', 2.4), '', 'art-sway'));
      s += K.g(K.line('M20 76C8 90 10 110 24 114C34 116 38 106 30 102C24 100 22 106 26 108', '#e0e7ff', 3) + K.line('M18 80C4 100 2 130 14 146', '#e0e7ff', 2, { op: 0.7 }), '', 'art-float');
      s += K.g(K.line('M180 76C192 90 190 110 176 114C166 116 162 106 170 102C176 100 178 106 174 108', '#e0e7ff', 3) + K.line('M182 80C196 100 198 130 186 146', '#e0e7ff', 2, { op: 0.7 }), '', 'art-float" style="animation-delay:-1.2s');
      // облако
      s += kumo(K, 100, 170, 2.2, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca' });
      // ноги
      s += K.mirror(K.vol('M78 140C70 146 64 154 62 164H84C86 158 90 152 94 148Z', skin) + K.vol(K.ell(72, 164, 12, 6), { ...skin, tex: false, lw: 2 }));
      // тело
      s += K.vol('M100 86C122 86 136 98 138 116C140 134 132 146 122 150H78C68 146 60 134 62 116C64 98 78 86 100 86Z', skin);
      s += K.line('M84 106Q92 110 98 106M102 106Q108 110 116 106', '#1f7a47', 1.6, { op: 0.6 }) + `<circle cx="100" cy="126" r="2" fill="#1f7a47"/>`;
      s += K.vol('M64 134Q100 144 136 134L134 154Q100 162 66 154Z', { c1: '#fde047', c2: '#d97706', rim: '#fff3b0', rimK: 0.5, line: '#5a2d06', tex: false });
      s += tigerStripes(K, [[74, 138, -8], [90, 141, -4], [106, 142, 2], [122, 140, 8]]);
      const sc = 'M62 98C46 102 40 118 28 122C22 124 20 132 28 132M138 98C154 102 160 118 172 122C178 124 180 132 172 132';
      s += K.g(K.line(sc, '#7f1d1d', 6.4) + K.line(sc, '#f87171', 3.6), '', 'art-float');
      // руки держат мешок над головой
      s += K.vol('M68 96C58 86 48 74 40 62C36 56 42 50 48 54C54 64 62 76 74 88Z', skin) + K.vol('M132 96C142 86 152 74 160 62C164 56 158 50 152 54C146 64 138 76 126 88Z', skin);
      s += K.vol(K.ell(42, 56, 8.5, 8), { ...skin, tex: false, lw: 2 }) + K.vol(K.ell(158, 56, 8.5, 8), { ...skin, tex: false, lw: 2 });
      // рыжие вихры
      [-160, -130, -100, -80, -50, -20].forEach((a, i) => {
        const t = a * Math.PI / 180, x = r1(100 + 28 * Math.cos(t)), y = r1(60 + 26 * Math.sin(t));
        s += K.g(K.part('M0 0C-6-8-6-18 2-24C0-16 6-10 8 0Z', i % 2 ? '#f97316' : '#dc2626', { line: '#5c0a0a', lw: 1.4 }), `translate(${x} ${y}) rotate(${a + 90})`);
      });
      // голова
      s += K.vol('M100 40C122 40 134 54 134 70C134 88 120 98 100 98C80 98 66 88 66 70C66 54 78 40 100 40Z', skin);
      s += K.mirror(K.part('M86 44C84 36 86 28 90 22C94 28 96 36 94 44Z', '#fef3c7', { line: '#78350f', lw: 1.4 }));
      s += K.mirror(K.part('M76 56C82 50 90 50 96 54L94 58C88 56 82 56 78 60Z', '#dc2626', { line: '#5c0a0a', lw: 1 }));
      s += K.eyes(100, 66, 14, 8.4, { iris: '#dc2626', lid: 'angry', skin: '#8fdcae', look: [-0.3, 0.2] });
      s += `<ellipse cx="100" cy="78" rx="4.4" ry="3" fill="#1f7a47"/>`;
      s += K.mouth('grin', 100, 84, 22);
      s += `<path d="M91 84.6H109L108 87H92Z" fill="#fff"/>`;
      s += K.blush(78, 80, 4.4) + K.blush(122, 80, 4.4);
      s += petal(100, 6, 4.4, 30, '#fbcfe8', 'art-float', 0.3) + petal(186, 150, 4.4, -20, '#fbcfe8', 'art-float', 1.1);
      s += K.spark(18, 170, 2.6, '#eef0ff') + K.spark(184, 170, 2.6, '#eef0ff', 'art-float');
      return s;
    },

    // ===================== ЛЕГЕНДЫ =====================

    // Аматэрасу (легенда): богиня Солнца выходит из небесной пещеры — за ней огромный солнечный диск с лучами, по бокам
    // расступаются скалы; белое с алым древнее одеяние с золотой каймой, длинные чёрные волосы, золотой венец с солнцем,
    // ожерелье из зелёных магатама; в руках сияет священное зеркало Ята-но кагами
    jp_amaterasu(K) {
      const skin = '#fde8d8';
      const robe = { c1: '#ffffff', c2: '#fcd9b0', rim: '#fff3b0', rimK: 0.6, line: '#7c2d12', texK: 0.3 };
      const red = { c1: '#fb7185', c2: '#b91c1c', rim: '#fff3b0', rimK: 0.6, line: '#4a0707', texK: 0.25 };
      let s = K.aura('#ff9a3d', 100, 96, 0.5);
      // солнечный диск с лучами
      let rays = '';
      for (let i = 0; i < 16; i++) { const a = i * 22.5 * Math.PI / 180, L = i % 2 ? 84 : 94; rays += `M${r1(100 + 58 * Math.cos(a - 0.09))} ${r1(76 + 58 * Math.sin(a - 0.09))}L${r1(100 + L * Math.cos(a))} ${r1(76 + L * Math.sin(a))}L${r1(100 + 58 * Math.cos(a + 0.09))} ${r1(76 + 58 * Math.sin(a + 0.09))}Z`; }
      s += `<g class="art-spin-soft"><path d="${rays}" fill="#fde68a" stroke="#f59e0b" stroke-width="1.2" opacity=".9"/></g>`;
      s += `<circle cx="100" cy="76" r="60" fill="${K.rad([[0, '#fffbe6'], [0.6, '#fde047'], [1, '#f97316']])}" stroke="#ea580c" stroke-width="2"/>`;
      s += `<circle cx="100" cy="76" r="50" fill="none" stroke="#fff7c2" stroke-width="1.6" stroke-dasharray="3 5" opacity=".9"/>`;
      // скалы небесной пещеры
      s += K.part('M0 200V110C8 100 16 104 20 96C26 86 34 92 38 100C44 116 40 140 46 160C50 176 44 190 40 200Z', '#57534e', { line: '#1c1917', lw: 2 }) + K.line('M10 120L22 130M18 150L30 160M28 108L34 118', '#292524', 1.6, { op: 0.8 });
      s += K.part('M200 200V110C192 100 184 104 180 96C174 86 166 92 162 100C156 116 160 140 154 160C150 176 156 190 160 200Z', '#57534e', { line: '#1c1917', lw: 2 }) + K.line('M190 120L178 130M182 150L170 160M172 108L166 118', '#292524', 1.6, { op: 0.8 });
      // священная верёвка симэнава с бумажными зигзагами сидэ
      s += K.line('M20 96Q100 120 180 96', '#78350f', 6) + K.line('M20 96Q100 120 180 96', '#e8c07a', 3.6) + `<path d="M20 96Q100 120 180 96" fill="none" stroke="#b88a3e" stroke-width="3.6" stroke-dasharray="3 3"/>`;
      s += [[46, 104], [154, 104]].map(([x, y]) => `<path class="art-sway" style="transform-origin:50% 0" d="M${x} ${y}h6l-4 6h6l-4 6h6l-4 6" fill="none" stroke="#f8fafc" stroke-width="3" stroke-linejoin="round"/>`).join('');
      // алая юбка-хакама и белое одеяние
      s += K.vol('M66 130H134L148 176C132 182 68 182 52 176Z', red);
      s += K.line('M84 134L76 178M100 134V180M116 134L124 178', '#7f1d1d', 1.4, { op: 0.5 });
      s += K.vol('M100 88C118 88 128 98 132 112L136 134H64L68 112C72 98 82 88 100 88Z', robe);
      s += K.line('M86 90L100 112L114 90', '#dc2626', 3) + K.line('M86 90L100 112L114 90', '#fbbf24', 1.2);
      s += K.line('M64 132H136', '#fbbf24', 4.4) + K.rhomb(100, 132, 4.4, '#dc2626', '#78350f');
      // широкие рукава с алой каймой
      s += K.mirror(K.vol('M74 96C56 104 46 124 46 150C52 160 66 162 76 156C76 138 80 118 88 108Z', robe) + K.line('M48 152C56 160 68 160 76 154', '#dc2626', 3.6) + K.stitch('M48 152C56 160 68 160 76 154', '#fbbf24', 1.2));
      // ожерелье магатама
      s += K.line('M84 96Q100 116 116 96', '#78350f', 1.2);
      s += magatama(88, 103, 4.2, -40) + magatama(100, 108, 4.6, 0, '#34d399') + magatama(112, 103, 4.2, 40);
      // священное зеркало
      s += `<circle class="art-aura" cx="100" cy="128" r="30" fill="${K.rad([[0, '#fffbe6', 0.9], [0.4, '#fde68a', 0.5], [1, '#fde68a', 0]])}"/>`;
      s += `<circle cx="100" cy="128" r="15" fill="${K.rad([[0, '#fffbe6'], [0.6, '#fbbf24'], [1, '#92400e']], 0.35, 0.3)}" stroke="#78350f" stroke-width="2"/>`;
      s += `<circle cx="100" cy="128" r="10.5" fill="${K.rad([[0, '#ffffff'], [0.7, '#fef3c7'], [1, '#fde68a']], 0.4, 0.35)}" stroke="#b45309" stroke-width="1.2"/>`;
      s += `<path d="M94 122L98 118M96 126L103 119" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
      s += K.part(K.ell(86, 134, 6, 5.4), skin, { line: '#9a6a4a', lw: 1.4 }) + K.part(K.ell(114, 134, 6, 5.4), skin, { line: '#9a6a4a', lw: 1.4 });
      // волосы сзади
      s += K.part('M78 52C70 76 68 104 74 124C82 118 88 108 90 96H110C112 108 118 118 126 124C132 104 130 76 122 52Z', '#1f1a24', { line: '#0b0a10', lw: 1.6 });
      // лицо
      s += K.vol(K.ell(100, 66, 17.5, 19), { c1: skin, c2: '#eab89a', rim: '#fff3d6', tex: false, hiK: 0.18, lw: 2.2, line: '#8a5a3a' });
      s += K.part('M82.5 66C80 48 90 42 100 42C110 42 120 48 117.5 66C114 56 108 52 100 52C92 52 86 56 82.5 66Z', '#1f1a24', { line: '#0b0a10', lw: 1.4 });
      s += K.line('M84 58C80 70 80 84 84 94M116 58C120 70 120 84 116 94', '#1f1a24', 3.4);
      // золотой венец с солнцем
      s += K.part('M80 46L84 32L92 40L100 26L108 40L116 32L120 46Q100 40 80 46Z', '#fbbf24', { line: '#78350f', lw: 1.6 });
      s += `<circle cx="100" cy="36" r="4.6" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.2"/><circle cx="99" cy="35" r="1.4" fill="#fff" opacity=".8"/>`;
      s += K.line('M80 46C74 52 72 60 72 68M120 46C126 52 128 60 128 68', '#fbbf24', 1.6) + `<circle cx="72" cy="70" r="2" fill="#34d399" stroke="#064e3b" stroke-width=".8"/><circle cx="128" cy="70" r="2" fill="#34d399" stroke="#064e3b" stroke-width=".8"/>`;
      s += `<circle cx="100" cy="54" r="1.8" fill="#dc2626"/>`;
      s += K.eyes(100, 68, 7.5, 4.8, { iris: '#b45309', lid: 'half', skin, lash: true, look: [0, 0.3] });
      s += K.blush(88, 76, 3.6) + K.blush(112, 76, 3.6);
      s += `<path d="M96.5 79Q100 82 103.5 79Q100 78 96.5 79Z" fill="#e11d48" stroke="#9f1239" stroke-width="1"/>`;
      s += K.spark(20, 20, 3.6, '#fffbe6', 'art-float') + K.spark(180, 22, 3.4, '#fde68a') + K.spark(62, 16, 2.6, '#fff3b0', 'art-float') + K.spark(144, 12, 2.6, '#fde68a');
      return s;
    },

    // Сусаноо (легенда): бог бурь и морей над штормовыми волнами сэйгайха — тёмно-синий древний доспех с золотой каймой,
    // волосы собраны в петли мидзура с лентами, густые брови и короткая борода; высоко поднял священный меч Кусанаги,
    // по клинку пробегает молния. Позади грозовые тучи, дождь и гребень большой волны
    jp_susanoo(K) {
      const skin = '#f2c49a';
      const arm = { c1: '#60a5fa', c2: '#172554', rim: '#e0f2fe', rimK: 0.7, line: '#0a1033', texK: 0.25 };
      let s = K.aura('#38bdf8', 100, 100, 0.48) + K.aura('#a5b4fc', 70, 50, 0.25);
      // грозовые тучи и дождь
      s += kumo(K, 40, 26, 1.1, { c1: '#94a3b8', c2: '#334155', line: '#0f172a', cls: 'art-float' }) + kumo(K, 164, 36, 1, { c1: '#94a3b8', c2: '#334155', line: '#0f172a', flip: true, cls: 'art-float', d: 1.1 });
      s += K.line('M20 44l-4 10M36 46l-4 10M52 44l-4 10M150 54l-4 10M166 56l-4 10M182 52l-4 10', '#bae6fd', 1.8, { op: 0.7, cls: 'art-blink' });
      // волосы сзади — развеваются
      s += K.g(K.part('M76 50C60 60 52 80 48 100C60 94 70 90 78 84ZM124 50C140 60 148 80 152 100C140 94 130 90 122 84Z', '#1f1a24', { line: '#0b0a10', lw: 1.6 }), '', 'art-sway" style="transform-origin:50% 0');
      // ноги и сапоги
      s += K.mirror(K.vol('M80 140C76 150 74 158 74 166H94C96 158 96 150 96 142Z', { c1: '#e2e8f0', c2: '#64748b', line: '#1e293b', tex: false }) + K.part('M70 164H96L98 174H66Z', '#1f2937', { line: '#0b0f19', lw: 1.6 }));
      // нижняя юбка доспеха
      s += K.vol('M64 124H136L146 156C130 162 70 162 54 156Z', arm);
      s += K.line(scaleRow(62, 138, 136, 9.5) + scaleRow(58, 142, 146, 10.5), '#bfdbfe', 1.2, { op: 0.8 });
      s += K.line('M56 154Q100 162 144 154', '#fbbf24', 3);
      // торс в пластинчатом доспехе
      s += K.vol('M100 82C124 82 138 92 140 108L136 128H64L60 108C62 92 76 82 100 82Z', arm);
      s += K.line('M68 98H132M66 108H134M66 118H134', '#bfdbfe', 1.3, { op: 0.8 }) + K.line('M80 90V126M100 88V128M120 90V126', '#0a1033', 1, { op: 0.4 });
      s += K.line('M64 126H136', '#fbbf24', 5) + K.rhomb(100, 126, 4.4, '#dc2626', '#78350f');
      s += magatama(100, 90, 4.4, 0, '#34d399');
      s += K.mirror(K.part('M62 86C68 80 78 80 84 86L80 98C72 98 64 96 62 86Z', '#fbbf24', { line: '#78350f', lw: 1.4 }));
      // левая рука опущена
      s += K.vol('M68 94C56 102 50 116 50 130C52 136 60 136 62 130C62 118 66 108 76 100Z', arm) + K.part(K.ell(56, 134, 7, 6.5), skin, { line: '#8a5a3a', lw: 1.6 });
      // правая рука поднимает меч
      s += K.vol('M130 94C140 84 148 72 152 58C154 52 160 52 162 58C160 74 150 90 136 102Z', arm);
      const blade = 'M154 52L178 4L184 8L160 56Z';
      s += K.part(blade, '#e2e8f0', { line: '#1e293b', lw: 1.6 }) + `<path d="${blade}" fill="${K.lin(['#ffffff', '#94a3b8'], 0, 0, 1, 0)}" opacity=".7"/>` + K.line('M158 50L180 8', '#fff', 1.2);
      s += zap(K, 170, 30, 0.9, 20, '#fef08a', 0.2) + zap(K, 184, 16, 0.8, -30, '#e0f2fe', 0.8);
      s += K.part('M146 52L166 60L168 56L148 48Z', '#fbbf24', { line: '#78350f', lw: 1.4 }) + K.line('M150 58L158 62', '#78350f', 1.2);
      s += K.line('M152 60L144 76', '#1e293b', 5.4) + K.line('M152 60L144 76', '#475569', 3);
      s += K.part(K.ell(152, 62, 7, 6.5), skin, { line: '#8a5a3a', lw: 1.6 });
      // голова
      s += K.vol(K.ell(100, 62, 18, 19.5), { c1: skin, c2: '#d9a070', rim: '#fff3d6', tex: false, lw: 2.2, line: '#7a4a2a' });
      s += K.part('M82 58C80 40 90 34 100 34C110 34 120 40 118 58C112 50 106 46 100 46C94 46 88 50 82 58Z', '#1f1a24', { line: '#0b0a10', lw: 1.4 });
      s += K.line('M100 36C96 42 92 46 86 50M100 36C104 42 108 46 114 48', '#4b4458', 1.2, { op: 0.7 });
      // причёска мидзура
      s += K.mirror(K.vol('M82 56C72 56 66 64 68 74C70 82 78 84 82 78C78 74 78 66 84 62Z', { c1: '#3a3344', c2: '#0b0a10', rim: '#93c5fd', rimK: 0.4, line: '#0b0a10', lw: 1.6, tex: false }) + K.line('M70 64L78 66', '#dc2626', 2.4));
      // брови, глаза, борода
      s += K.mirror(K.part('M84 54C88 50 94 50 98 54L97 57C93 55 89 55 85 57Z', '#1f1a24', { lw: 0 }));
      s += K.eyes(100, 62, 7.5, 5, { iris: '#0ea5e9', lid: 'angry', skin, look: [0.4, -0.2] });
      s += K.part('M84 70C84 80 90 88 100 90C110 88 116 80 116 70C112 76 106 80 100 78C94 80 88 76 84 70Z', '#1f1a24', { line: '#0b0a10', lw: 1.2 });
      s += K.part('M90 72C94 70 98 71 100 73C102 71 106 70 110 72C106 74 102 75 100 74C98 75 94 74 90 72Z', '#1f1a24', { lw: 0 });
      s += K.line('M95 78H105', '#e7b58e', 2);
      // волны сэйгайха
      s += `<path d="M0 200V170H200V200Z" fill="${K.lin(['#3b82f6', '#1e3a8a'])}"/>`;
      s += `<path d="${seigaiha(0, 200, 180, 10)}" fill="none" stroke="#bfdbfe" stroke-width="1.6" opacity=".9"/>`;
      s += `<path d="${seigaiha(10, 200, 192, 10)}" fill="none" stroke="#93c5fd" stroke-width="1.4" opacity=".8"/>`;
      s += K.part('M0 172C10 162 20 166 26 172C32 164 44 164 50 172C56 164 68 164 74 172C80 164 92 164 98 172C104 164 116 164 122 172C128 164 140 164 146 172C152 164 164 164 170 172C176 164 188 164 200 170V176H0Z', '#60a5fa', { line: '#0a1033', lw: 1.6 });
      s += K.line('M6 168q6-4 12 0M54 168q6-4 12 0M102 168q6-4 12 0M150 168q6-4 12 0', '#f0f9ff', 1.6, { op: 0.9 });
      const crest = K.part('M0 174C-2 150 12 134 32 134C46 136 50 150 42 156C36 160 30 156 32 150C24 150 18 158 18 174Z', '#3b82f6', { line: '#0a1033', lw: 1.8 }) +
        K.line('M6 160C8 146 18 138 30 138', '#e0f2fe', 2) + `<g fill="#f0f9ff"><circle cx="34" cy="132" r="2.2"/><circle cx="42" cy="136" r="1.8"/><circle cx="26" cy="130" r="1.6"/></g>`;
      s += K.g(crest, '', 'art-float') + K.g(`<g transform="translate(200 0) scale(-1 1)">${crest}</g>`, '', 'art-float" style="animation-delay:-1.2s');
      s += K.spark(16, 80, 3, '#e0f2fe', 'art-float') + K.spark(110, 14, 2.6, '#fef08a') + K.spark(190, 170, 2.4, '#e0f2fe');
      return s;
    },
  });

  // ===================== 4.x: новые духи японской мифологии (до 63 видов) =====================
  Object.assign(SPIRIT_ART, {
    // ===================== ТРЕТЬИ СТАДИИ ПРЕЖНИХ СЕМЕЙ =====================

    // Кюсэмбо: вожак девяти тысяч каппа — могучий каппа в синей безрукавке с волнами, на голове блюдце с водой и белая повязка-хатимаки;
    // за спиной огромный панцирь, за поясом огурец, на шее свисток спасателя; одна рука упёрта в бок, другая подняла боевой веер-гумбай
    jp_kyusenbo(K) {
      const skin = { c1: '#a7f3c0', c2: '#15803d', rim: '#c8f3ff', rimK: 0.75, line: '#052e16', texK: 0.16 };
      const shell = { c1: '#bef264', c2: '#365314', rim: '#c8f3ff', rimK: 0.6, line: '#1a2e05', tex: false };
      const vest = { c1: '#60a5fa', c2: '#1e3a8a', rim: '#c8f3ff', rimK: 0.55, line: '#0b1640', texK: 0.2 };
      let s = K.aura('#38bdf8', 100, 100, 0.44);
      s += '<g class="art-aura"><ellipse cx="100" cy="176" rx="86" ry="10" fill="none" stroke="#bfeaff" stroke-width="1.8" opacity=".5"/><ellipse cx="100" cy="176" rx="64" ry="6" fill="none" stroke="#bfeaff" stroke-width="1.4" opacity=".4"/></g>';
      // панцирь за спиной
      s += K.vol('M100 64C142 64 166 92 166 124C166 150 150 164 132 166H68C50 164 34 150 34 124C34 92 58 64 100 64Z', shell);
      s += K.line('M40 104L54 112L52 134L38 142M160 104L146 112L148 134L162 142M54 112L70 98M146 112L130 98M52 134L64 150M148 134L136 150', '#1a2e05', 1.8, { op: 0.6 });
      // ноги в стойке
      s += K.mirror(K.vol('M80 146C70 150 62 160 60 172H84C86 164 88 158 94 154Z', skin) + K.part('M52 170C48 172 46 178 48 181H84C84 176 80 172 74 170Z', '#4ade80', { line: '#052e16', lw: 1.6 }) +
        K.line('M56 176l-2 4M64 174v7M72 175l2 5', '#052e16', 1, { op: 0.6 }));
      // тело и пластрон
      s += K.vol('M100 80C126 80 142 96 144 118C146 140 136 154 122 158H78C64 154 54 140 56 118C58 96 74 80 100 80Z', skin);
      s += K.part('M100 92C116 92 126 104 126 120C126 136 116 146 100 146C84 146 74 136 74 120C74 104 84 92 100 92Z', '#fef9c3', { line: '#a3a34a', lw: 1.4 });
      s += K.line('M80 108H120M78 122H122M82 136H118', '#ca8a04', 1.2, { op: 0.6 });
      // безрукавка с волнами
      s += K.vol('M82 84C68 88 60 100 58 116L56 150H80L88 100Z', vest) + K.vol('M118 84C132 88 140 100 142 116L144 150H120L112 100Z', vest);
      s += K.line('M60 128q5-5 10 0t10 0M58 140q5-5 10 0t10 0M120 128q5-5 10 0t10 0M122 140q5-5 10 0t10 0M62 116q5-5 10 0M128 116q5-5 10 0', '#e0f2fe', 1.4, { op: 0.85 });
      // пояс и огурец
      s += K.vol('M56 142Q100 152 144 142L142 158Q100 166 58 158Z', { c1: '#f8fafc', c2: '#94a3b8', rim: '#c8f3ff', rimK: 0.4, line: '#334155', tex: false });
      s += K.g(K.part('M70 140C74 132 88 126 94 129C96 133 86 142 78 148Z', '#22c55e', { line: '#14532d', lw: 1.6 }) + `<ellipse cx="93" cy="128.5" rx="3" ry="2" fill="#bbf7d0" stroke="#14532d" stroke-width="1"/>` +
        K.line('M75 141L89 132', '#86efac', 1.2, { op: 0.8 }), 'rotate(-6 80 140)');
      // свисток спасателя на шнурке
      s += K.line('M84 86Q100 108 116 86', '#dc2626', 2);
      s += `<path d="M93 104H106A5 5 0 0 1 106 114H98L93 110Z" fill="${K.lin(['#ffffff', '#94a3b8'])}" stroke="#1e293b" stroke-width="1.4" stroke-linejoin="round"/><circle cx="104" cy="109" r="1.8" fill="#1e293b"/>`;
      // рука упёрта в бок
      s += K.vol('M68 90C54 96 46 108 46 122C46 132 52 138 60 138L66 132C60 128 58 120 62 110C64 104 68 100 76 96Z', skin) + K.vol(K.ell(62, 135, 8, 7), { ...skin, tex: false, lw: 2 });
      // рука с веером-гумбаем
      const fan = 'M166 4C182 4 191 16 190 28C189 40 181 48 172 50L170 62H162L160 50C151 48 143 40 142 28C141 16 150 4 166 4Z';
      s += K.g(K.part(fan, '#1f2937', { line: '#020617', lw: 1.8 }) + `<path d="${fan}" fill="none" stroke="#fbbf24" stroke-width="1.6" transform="translate(166 30) scale(.88) translate(-166 -30)"/>` +
        `<circle cx="166" cy="27" r="13" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.2"/>` + tomoe(166, 27, 9.5, '#fde68a', 20) +
        K.line('M166 62V84', '#451a03', 4.6) + K.line('M166 62V84', '#a16207', 2.4) + K.line('M166 84C162 90 164 96 160 100', '#dc2626', 2), '', 'art-sway" style="transform-origin:47% 69%');
      s += K.vol('M132 96C144 92 152 84 158 72C160 66 168 66 168 72C166 84 156 96 140 104Z', skin) + K.vol(K.ell(165, 70, 7.5, 7), { ...skin, tex: false, lw: 2 });
      // голова
      s += K.vol('M100 26C126 26 142 42 142 62C142 82 124 94 100 94C76 94 58 82 58 62C58 42 74 26 100 26Z', skin);
      s += K.part('M58 56C56 38 74 24 100 24C126 24 144 38 142 56C140 62 138 66 134 66C132 58 126 52 118 54C114 46 106 44 100 46C94 44 86 46 82 54C74 52 68 58 66 66C62 66 58 62 58 56Z', '#0f5132', { line: '#052e16', lw: 1.6 });
      s += K.line('M60 60C60 68 62 74 64 78M140 60C140 68 138 74 136 78', '#0f5132', 3);
      // повязка-хатимаки с концами по ветру
      s += K.line('M59 50Q100 38 141 50', '#334155', 7.4) + K.line('M59 50Q100 38 141 50', '#f8fafc', 5);
      s += K.g(K.line('M141 50C150 46 156 50 164 44M141 52C148 56 154 58 160 64', '#334155', 4.6) + K.line('M141 50C150 46 156 50 164 44M141 52C148 56 154 58 160 64', '#f8fafc', 2.8), '', 'art-sway');
      s += `<circle cx="100" cy="44" r="4.4" fill="#dc2626" stroke="#7f1d1d" stroke-width="1"/>`;
      // блюдце с водой
      s += `<ellipse cx="100" cy="26" rx="26" ry="8" fill="${K.lin(['#ffffff', '#e2e8f0'])}" stroke="#334155" stroke-width="1.8"/>`;
      s += `<ellipse cx="100" cy="25" rx="20" ry="5.2" fill="${K.lin(['#bae6fd', '#38bdf8'])}" stroke="#0369a1" stroke-width="1"/><path d="M86 24Q92 22 98 24" stroke="#fff" stroke-width="1.4" fill="none" opacity=".9"/>`;
      s += K.eyes(100, 64, 16, 9.5, { iris: '#0369a1', lid: 'angry', skin: '#4ade80', look: [0.1, 0.2] });
      s += K.part('M86 76Q100 70 114 76Q112 88 100 90Q88 88 86 76Z', '#fbbf24', { line: '#92400e', lw: 1.6 }) + K.line('M88 79Q100 83 112 79', '#92400e', 1.2, { op: 0.8 });
      s += K.blush(76, 78, 5) + K.blush(124, 78, 5);
      s += `<circle cx="26" cy="96" r="3.4" fill="none" stroke="#e0f7ff" stroke-width="1.4" class="art-float"/><circle cx="34" cy="70" r="2.4" fill="none" stroke="#e0f7ff" stroke-width="1.2" class="art-float" style="animation-delay:-.8s"/>`;
      s += K.line('M14 176q10-8 20 0M166 176q10-8 20 0', '#bfeaff', 2, { op: 0.7 });
      s += K.spark(30, 30, 3, '#e0f7ff', 'art-float') + K.spark(184, 112, 2.6, '#e0f7ff') + K.spark(18, 140, 2.4, '#e0f7ff');
      return s;
    },

    // Нуэ: химера в чёрной грозовой туче — красная обезьянья морда в серой косматой гриве, горящие жёлтые глаза и клыки; круглое бурое
    // тело тануки, полосатые тигриные лапы с когтями, а вместо хвоста — зелёная змея с собственной хитрой мордочкой; вокруг бьют молнии
    jp_nue(K) {
      const fur = { c1: '#c99a62', c2: '#4a2f16', rim: '#fff6b0', rimK: 0.7, line: '#24150a', texK: 0.2 };
      const tig = { c1: '#fcd34d', c2: '#c2620a', rim: '#fff6b0', rimK: 0.6, line: '#4a2306', tex: false, lw: 2.2 };
      const snake = { c1: '#bef264', c2: '#3f6212', rim: '#fff6b0', rimK: 0.6, line: '#1a2e05', tex: false, lw: 2 };
      let s = K.aura('#facc15', 100, 100, 0.4) + K.aura('#312e81', 76, 150, 0.3);
      // молнии
      const bolt = (d, dl) => `<g class="art-blink" style="animation-delay:-${dl}s"><path d="${d}" fill="none" stroke="#fef08a" stroke-width="8" stroke-linejoin="round" opacity=".35"/><path d="${d}" fill="none" stroke="#fffbe6" stroke-width="2.8" stroke-linejoin="round"/></g>`;
      s += bolt('M30 22L20 46L32 46L18 76', 0.2) + bolt('M184 124L174 146L186 146L174 172', 0.9);
      // змея-хвост
      const sn = 'M136 142C160 140 172 122 168 100C165 84 172 68 180 62';
      s += K.line(sn, '#1a2e05', 15) + K.line(sn, '#84cc16', 11) + K.line(sn, '#d9f99d', 3.4, { op: 0.8 });
      s += `<path d="${sn}" fill="none" stroke="#3f6212" stroke-width="11" stroke-dasharray="3 6" opacity=".55"/>`;
      s += K.vol('M172 48C182 42 196 46 196 56C196 64 188 68 180 66C174 64 168 60 168 55C168 51 170 49 172 48Z', snake);
      s += K.g(K.line('M169 58L158 61M158 61l-4-3M158 61l-4 3', '#dc2626', 1.6), '', 'art-blink');
      s += `<circle cx="182" cy="52" r="3.6" fill="#fde047" stroke="#1a2e05" stroke-width="1.2"/><ellipse cx="181.5" cy="52" rx="1.1" ry="2.6" fill="#1a2e05"/>`;
      // грозовая туча
      s += kumo(K, 100, 168, 2.15, { c1: '#64748b', c2: '#1e293b', line: '#0f172a' });
      // задние тигриные лапы по бокам
      s += K.mirror(K.vol(K.ell(58, 150, 16, 14), tig) + tigerStripes(K, [[46, 144, -50], [54, 139, -25], [64, 138, -5]]));
      // тело тануки
      s += K.vol('M100 92C130 92 148 114 148 138C148 156 134 164 100 164C66 164 52 156 52 138C52 114 70 92 100 92Z', fur);
      s += K.part('M100 116C114 116 122 128 122 142C122 154 112 160 100 160C88 160 78 154 78 142C78 128 86 116 100 116Z', '#ecd2b0', { line: '#a37a52', lw: 1.4 });
      // передние тигриные лапы с когтями
      s += K.mirror(K.vol('M70 112C62 126 58 142 58 158C58 168 64 174 72 174C79 174 83 169 83 162C83 150 84 136 88 124Z', tig) +
        tigerStripes(K, [[60, 132, -95], [59, 144, -95], [60, 156, -95]]) + `<path d="M60 170l-5 4l6 0M67 174l-1 5l4-4M76 173l2 5l2-5" fill="#fffbe6" stroke="#4a2306" stroke-width="1" stroke-linejoin="round"/>`);
      // косматая грива
      s += K.vol(shag(100, 66, 42, 38, 13, 0.24), { c1: '#cbbcae', c2: '#5e4c40', rim: '#fff6b0', rimK: 0.5, line: '#2a1f1a', texK: 0.12 });
      // обезьяньи уши и голова
      s += K.mirror(K.vol(K.ell(64, 70, 9, 10.5), { ...fur, c1: '#e7a99b', c2: '#9c4b3e', tex: false, lw: 2 }) + `<ellipse cx="64" cy="71" rx="4.6" ry="6" fill="#f8b4a8" stroke="#24150a" stroke-width="1"/>`);
      s += K.vol('M100 38C122 38 136 52 136 70C136 88 122 100 100 100C78 100 64 88 64 70C64 52 78 38 100 38Z', { ...fur, c1: '#ddd0c4', c2: '#7a6758', line: '#2a1f1a' });
      // красная морда
      s += K.vol('M100 50C110 44 123 48 126 59C129 72 119 92 100 95C81 92 71 72 74 59C77 48 90 44 100 50Z', { c1: '#ff9a88', c2: '#c4362f', rim: '#fff6b0', rimK: 0.5, line: '#4a0f0b', tex: false, lw: 2 });
      s += K.mirror(K.part('M78 58Q88 50 98 57L97 61Q88 56 80 61Z', '#3a1410', { lw: 0 }));
      s += K.glow(88, 67, 5.5, 6.5, '#fde047') + K.glow(112, 67, 5.5, 6.5, '#fde047');
      s += `<ellipse cx="96" cy="79" rx="1.9" ry="1.4" fill="#4a0f0b"/><ellipse cx="104" cy="79" rx="1.9" ry="1.4" fill="#4a0f0b"/>`;
      s += K.mouth('fang', 100, 84, 16);
      s += K.part('M92 38C94 30 100 26 106 28C102 30 100 34 101 39Z', '#cbbcae', { line: '#2a1f1a', lw: 1.4 });
      s += zap(K, 26, 120, 1.2, -20, '#fde047', 0.4) + zap(K, 150, 22, 1.1, 30, '#fef08a', 1.1) + zap(K, 60, 18, 0.9, -10, '#fde047', 0.7);
      s += K.spark(130, 12, 3, '#fef08a', 'art-float') + K.spark(14, 160, 2.4, '#fffbe6');
      return s;
    },

    // ===================== ОГОНЬ: лисы Инари =====================

    // Кицунёнок: круглый белый лисёнок святилища Инари — большие уши с рыжими кончиками, красные метки на лбу и над глазами,
    // красный нагрудник; в лапках мешочек жареного тофу с рисом (инари-дзуси), а на кончике пушистого хвоста горит огонёк кицунэ-би
    jp_kitsunyonok(K) {
      const fur = { c1: '#ffffff', c2: '#efc49c', rim: '#ffe29a', rimK: 0.7, line: '#6b2a0e', texK: 0.16 }, org = '#fb923c', red = '#dc2626';
      const paw = { ...fur, c1: '#fed7aa', c2: '#ea7a2c', tex: false, lw: 2 };
      let s = K.aura('#ff9a3d', 86, 118, 0.3);
      // хвост с огоньком на кончике
      s += foxTail(K, 128, 166, 84, 46, 32, fur, org);
      s += kbi(K, 172, 94, 24, 0.3);
      // задние лапки и тельце
      s += K.mirror(K.vol(K.ell(78, 174, 12, 6.5), paw));
      s += K.vol('M100 108C126 108 140 126 140 148C140 166 126 177 100 177C74 177 60 166 60 148C60 126 74 108 100 108Z', fur);
      s += K.part('M100 126C114 126 124 138 124 152C124 166 114 173 100 173C86 173 76 166 76 152C76 138 86 126 100 126Z', '#fffaf3', { flat: true, lw: 0, op: 0.9 });
      // красный нагрудник
      s += K.part('M70 112Q100 124 130 112L124 134Q100 148 76 134Z', red, { line: '#7f1d1d', lw: 1.8 }) + K.stitch('M79 133Q100 145 121 133', '#fde68a', 1.4);
      // мешочек жареного тофу с рисом
      s += K.part('M82 146C84 138 90 142 94 138C98 142 102 137 106 140C110 137 114 141 118 140C120 142 120 145 118 147H82Z', '#ffffff', { line: '#a8a29e', lw: 1.2 });
      s += K.part('M80 146H120L117 162C116 167 84 167 83 162Z', '#e3a04a', { line: '#7c2d12', lw: 1.8 });
      s += `<g fill="#b45309" opacity=".55"><circle cx="90" cy="152" r="1.3"/><circle cx="99" cy="156" r="1.1"/><circle cx="108" cy="151" r="1.3"/><circle cx="112" cy="159" r="1"/><circle cx="88" cy="160" r="1"/></g>`;
      s += K.vol(K.ell(80, 153, 8, 7.5), paw) + K.vol(K.ell(120, 153, 8, 7.5), paw);
      // пушистые щёчки и ушки
      s += K.mirror(K.vol('M62 86C54 94 46 102 44 110C52 109 57 111 61 109C59 115 63 119 69 117L72 100Z', { ...fur, tex: false, lw: 2 }));
      const ear = 'M62 68C56 50 56 30 64 16C78 26 88 40 94 52Z';
      s += K.mirror(K.vol(ear, fur) + tipFill(K, ear, 'M40 0H100V30Q86 36 76 30T40 34Z', org) + `<path d="${ear}" fill="none" stroke="${fur.line}" stroke-width="2.6" stroke-linejoin="round"/>` +
        K.part('M67 60C63 48 63 39 66 33C72 38 79 44 83 50Z', '#fed7aa', { line: '#c2410c', lw: 1.2 }));
      // голова
      s += K.vol('M100 40C130 40 148 58 148 82C148 104 128 118 100 118C72 118 52 104 52 82C52 58 70 40 100 40Z', fur);
      s += K.part('M100 88C116 88 128 96 132 106C124 116 112 118 100 118C88 118 76 116 68 106C72 96 84 88 100 88Z', '#fffaf3', { flat: true, lw: 0 });
      s += K.gloss(74, 56, 8, 4.5, -35, 0.45);
      // красные метки Инари: огонёк на лбу и стрелки над глазами
      s += K.part('M100 48C95 54 95 60 100 64C105 60 105 54 100 48Z', red, { line: '#7f1d1d', lw: 1 });
      s += K.mirror(K.line('M72 68Q78 63 86 65', red, 3));
      s += K.eyes(100, 84, 20, 11.5, { iris: '#d97706', look: [0.1, 0.4] });
      s += `<ellipse cx="100" cy="101" rx="4.6" ry="3.2" fill="#3b1d0e"/><ellipse cx="98.8" cy="100" rx="1.6" ry=".9" fill="#fff" opacity=".7"/>`;
      s += K.mouth('cat', 100, 106, 11);
      s += K.blush(70, 102, 6) + K.blush(130, 102, 6);
      s += kbi(K, 30, 112, 15, 0.8);
      s += K.spark(30, 46, 3, '#ffe29a', 'art-float') + K.spark(150, 30, 2.6, '#fff3b0') + K.spark(24, 160, 2.4, '#ffd23f') + K.spark(180, 150, 2.4, '#fff3b0', 'art-float');
      return s;
    },

    // Кицунэ: белая лиса-вестница Инари сидит перед алыми тории — красные метки у глаз и на лбу, красный нагрудник с золотой каймой,
    // в зубах золотой ключ от рисового амбара с алой кисточкой; два пушистых хвоста с рыжими кончиками, над ними пляшут огоньки кицунэ-би
    jp_kitsune(K) {
      const fur = { c1: '#ffffff', c2: '#e9bf98', rim: '#ffe29a', rimK: 0.7, line: '#5c210a', texK: 0.16 }, org = '#fb923c', red = '#dc2626';
      let s = K.aura('#ff9a3d', 94, 106, 0.34);
      s += torii(K, 100, 20, 176, 158, 0.92);
      // два хвоста
      s += foxTail(K, 122, 160, 84, 44, 16, fur, org) + foxTail(K, 124, 162, 80, 42, 50, fur, org);
      s += kbi(K, 145, 80, 20, 0.2) + kbi(K, 185, 110, 18, 0.9);
      // тело
      s += K.vol('M100 96C122 96 136 114 138 140C140 162 132 176 100 177C68 176 60 162 62 140C64 114 78 96 100 96Z', fur);
      s += K.mirror(K.line('M66 152Q74 142 84 144', '#d6a27a', 1.6, { op: 0.7 }));
      // передние лапы
      s += K.mirror(K.vol('M80 124C79 142 79 160 80 170C80 176 85 179 90 179C95 179 98 176 97 170C96 156 95 140 95 126Z', fur) + K.line('M84 175v4M89 174v5M94 175v4', '#5c210a', 1.2, { op: 0.6 }));
      // грудка и нагрудник
      s += K.part('M76 102Q78 116 86 120Q88 130 100 128Q112 130 114 120Q122 116 124 102Z', '#ffffff', { line: '#e7c8a8', lw: 1.4 });
      s += K.part('M72 104Q100 118 128 104L122 126Q100 138 78 126Z', red, { line: '#7f1d1d', lw: 1.8 }) + K.stitch('M80 125Q100 136 120 125', '#fde68a', 1.4);
      // щёки, уши, голова
      s += K.mirror(K.vol('M66 72C58 80 50 88 48 96C56 95 60 97 64 95C62 101 66 105 72 103L76 88Z', { ...fur, tex: false, lw: 2 }));
      const ear = 'M66 50C60 34 60 16 66 4C80 14 90 28 94 40Z';
      s += K.mirror(K.vol(ear, fur) + tipFill(K, ear, 'M44 -10H100V16Q88 22 80 16T44 20Z', org) + `<path d="${ear}" fill="none" stroke="${fur.line}" stroke-width="2.6" stroke-linejoin="round"/>` +
        K.part('M69 44C66 34 66 26 68 20C74 24 80 30 84 36Z', '#fed7aa', { line: '#c2410c', lw: 1.2 }));
      s += K.vol('M100 30C124 30 140 46 140 64C140 72 138 78 134 84C126 94 114 104 104 108C101 109 99 109 96 108C86 104 74 94 66 84C62 78 60 72 60 64C60 46 76 30 100 30Z', fur);
      s += K.part('M100 72C110 72 120 78 126 86C118 96 110 104 102 107H98C90 104 82 96 74 86C80 78 90 72 100 72Z', '#fffaf3', { flat: true, lw: 0 });
      s += K.gloss(78, 44, 7, 4, -35, 0.45);
      s += K.part('M100 35C96 40 96 45 100 49C104 45 104 40 100 35Z', red, { line: '#7f1d1d', lw: 1 });
      s += K.mirror(K.line('M80 60Q72 56 69 48', red, 2.6));
      s += K.eyes(100, 62, 15, 8.2, { iris: '#f59e0b', lid: 'half', skin: '#fdf3e7', lash: true, look: [0, 0.3] });
      s += `<ellipse cx="100" cy="92" rx="4.4" ry="3" fill="#3b1d0e"/><ellipse cx="98.8" cy="91" rx="1.5" ry=".8" fill="#fff" opacity=".7"/>`;
      s += K.blush(78, 80, 4.6) + K.blush(122, 80, 4.6);
      // золотой ключ в зубах
      s += K.line('M70 100H128', '#78350f', 5.4) + K.line('M70 100H128', '#fbbf24', 3);
      s += K.part('M70 100V109H75V105H79V100Z', '#fbbf24', { line: '#78350f', lw: 1.3 });
      s += `<circle cx="134" cy="100" r="6.4" fill="none" stroke="#78350f" stroke-width="5"/><circle cx="134" cy="100" r="6.4" fill="none" stroke="#fbbf24" stroke-width="2.6"/>`;
      s += K.g(K.line('M139 104C142 110 140 116 136 120', red, 2.2) + `<path d="M133 118l3 10l4-9Z" fill="${red}" stroke="#7f1d1d" stroke-width="1"/>`, '', 'art-sway');
      s += kbi(K, 24, 92, 16, 1.3);
      s += K.spark(28, 150, 2.6, '#fff3b0', 'art-float') + K.spark(176, 30, 3, '#ffe29a');
      return s;
    },

    // Тэнко: тысячелетняя небесная лиса — золотая шерсть, четыре хвоста веером с белыми кончиками и огоньками, на шее толстая священная
    // верёвка симэнава с золотым бубенцом и алыми кистями; сидит на тёплом облаке, а между лап у неё сияет жемчужина хоси-но тама
    jp_tenko(K) {
      const fur = { c1: '#ffe9a8', c2: '#dd9418', rim: '#fff3b0', rimK: 0.75, line: '#6b2a0e', texK: 0.2 }, wht = '#fffaf0', red = '#dc2626';
      let s = K.aura('#ff9a3d', 100, 100, 0.46) + K.aura('#fde047', 66, 74, 0.24);
      // четыре хвоста веером
      const tf = { ...fur, c1: '#ffd36b', c2: '#cf7f0e', rimK: 0.6 };
      s += K.mirror(foxTail(K, 100, 150, 92, 46, -66, tf, wht) + foxTail(K, 100, 150, 102, 48, -26, tf, wht));
      s += kbi(K, 16, 112, 20, 0.2) + kbi(K, 55, 58, 20, 0.9) + kbi(K, 145, 58, 20, 0.5) + kbi(K, 184, 112, 20, 1.3);
      // тёплое облако
      s += kumo(K, 100, 172, 2.1, { c1: '#fffbeb', c2: '#fcd9a8', line: '#9a3412' });
      // тело
      s += K.vol('M100 90C126 90 142 110 144 138C146 162 136 176 100 177C64 176 54 162 56 138C58 110 74 90 100 90Z', fur);
      s += K.mirror(K.line('M62 152Q70 140 82 142', '#a8650c', 1.6, { op: 0.7 }));
      s += K.part('M76 98Q78 112 86 116Q88 126 100 124Q112 126 114 116Q122 112 124 98Z', wht, { line: '#e7c27a', lw: 1.4 });
      // передние лапы и жемчужина хоси-но тама между ними
      s += K.mirror(K.vol('M76 120C74 140 73 158 74 168C74 175 79 178 84 178C89 178 92 175 91 168C90 154 90 138 91 122Z', fur) + K.line('M78 174v4M83 173v5M88 174v4', '#6b2a0e', 1.2, { op: 0.6 }));
      s += hoju(K, 100, 160, 13);
      // священная верёвка с бубенцом
      const rope = 'M68 98Q100 116 132 98';
      s += K.line(rope, '#78350f', 9) + K.line(rope, '#f3d38a', 6) + `<path d="${rope}" fill="none" stroke="#b88a3e" stroke-width="6" stroke-dasharray="3 4"/>`;
      s += K.mirror(K.g(K.line('M80 106C80 112 78 116 80 122', red, 2.4) + `<path d="M77 120l3 9l4-8Z" fill="${red}" stroke="#7f1d1d" stroke-width="1"/>`, '', 'art-sway'));
      s += `<circle cx="100" cy="113" r="6.4" fill="${K.rad([[0, '#fffbe6'], [0.55, '#fbbf24'], [1, '#b45309']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.4"/><path d="M94 112H106M100 114V119" stroke="#78350f" stroke-width="1.2"/>`;
      // щёки, уши, голова
      s += K.mirror(K.vol('M64 64C56 72 48 80 46 90C54 89 58 91 62 89C60 95 64 99 70 97L74 82Z', { ...fur, tex: false, lw: 2 }));
      const ear = 'M64 44C58 28 58 10 64 -2C78 8 88 22 92 34Z';
      s += K.mirror(K.vol(ear, fur) + tipFill(K, ear, 'M40 -20H100V10Q88 16 80 10T40 14Z', wht) + `<path d="${ear}" fill="none" stroke="${fur.line}" stroke-width="2.6" stroke-linejoin="round"/>` +
        K.part('M67 38C64 28 64 20 66 14C72 18 78 24 82 30Z', '#fecaca', { line: '#c2410c', lw: 1.2 }));
      s += K.vol('M100 24C124 24 140 40 140 58C140 66 138 72 134 78C126 88 114 98 104 102C101 103 99 103 96 102C86 98 74 88 66 78C62 72 60 66 60 58C60 40 76 24 100 24Z', fur);
      s += K.part('M100 66C110 66 120 72 126 80C118 90 110 98 102 101H98C90 98 82 90 74 80C80 72 90 66 100 66Z', wht, { flat: true, lw: 0 });
      s += K.gloss(78, 38, 7, 4, -35, 0.45);
      s += K.part('M100 28C95 34 95 40 100 45C105 40 105 34 100 28Z', red, { line: '#7f1d1d', lw: 1 }) + `<circle cx="100" cy="38" r="1.6" fill="#fde68a"/>`;
      s += K.mirror(K.line('M80 54Q72 50 69 42', red, 2.6) + K.line('M82 60Q76 62 72 60', red, 2));
      s += K.eyes(100, 56, 15, 8, { iris: '#ea580c', lid: 'half', skin: '#fdeab5', lash: true, look: [0, 0.3] });
      s += `<ellipse cx="100" cy="86" rx="4.4" ry="3" fill="#3b1d0e"/><ellipse cx="98.8" cy="85" rx="1.5" ry=".8" fill="#fff" opacity=".7"/>`;
      s += K.mouth('cat', 100, 91, 11);
      s += K.blush(78, 74, 4.6) + K.blush(122, 74, 4.6);
      s += K.spark(100, 6, 3.4, '#fff3b0', 'art-float') + K.spark(30, 30, 2.8, '#ffe29a') + K.spark(170, 30, 2.8, '#fff3b0') + K.spark(14, 160, 2.4, '#ffd23f', 'art-float') + K.spark(186, 160, 2.4, '#ffe29a');
      return s;
    },

    // ===================== ЛЕС: горный волк =====================

    // Инучок: круглый серо-голубой волчонок — белая мордочка и грудка, тёмная полоска на лбу, острые ушки, пушистый хвост с тёмным
    // кончиком; задрал голову и старательно учится выть на тонкий месяц (дуги «у-у-у» бегут к луне), у лап трава и сосновая веточка
    jp_inuchok(K) {
      const fur = { c1: '#dfe6ef', c2: '#5d6b82', rim: '#e4ffb0', rimK: 0.42, line: '#1c2433', texK: 0.16 }, wht = '#f8fafc';
      const paw = { ...fur, tex: false, lw: 2 };
      let s = K.aura('#84cc16', 86, 118, 0.3);
      s += `<path d="M164 14A15 15 0 1 0 180 38A12 12 0 1 1 164 14Z" fill="#fef3c7" stroke="#a16207" stroke-width="1.2"/>`;
      // хвост
      s += foxTail(K, 126, 166, 70, 42, 40, fur, '#334155');
      // трава и опавшие листья
      s += K.line('M22 178l3-12l3 12M30 178l4-16l2 16M170 178l3-12l3 12M178 178l4-15l2 15', '#4d7c0f', 2.2);
      s += K.leaf(36, 172, 14, -150, '#65a30d') + K.leaf(160, 172, 13, -20, '#84cc16') + K.g(K.leaf(22, 128, 12, -60, '#a3e635'), '', 'art-float');
      // задние лапки, тело, грудка
      s += K.mirror(K.vol(K.ell(78, 174, 12, 6.5), paw));
      s += K.vol('M100 108C126 108 140 126 140 148C140 166 126 177 100 177C74 177 60 166 60 148C60 126 74 108 100 108Z', fur);
      s += K.part('M100 118C114 118 122 132 122 148C122 164 112 173 100 173C88 173 78 164 78 148C78 132 86 118 100 118Z', wht, { flat: true, lw: 0, op: 0.95 });
      // передние лапки
      s += K.mirror(K.vol('M82 140C80 152 80 162 82 170C84 176 92 176 94 170C95 162 95 152 94 142Z', paw) + K.line('M85.5 172v3M89.5 172v3', '#1c2433', 1, { op: 0.6 }));
      // пушистые щёки и ушки
      s += K.mirror(K.vol('M60 92C52 100 46 108 46 116C53 114 57 116 61 114C60 120 64 123 70 121L72 104Z', { ...fur, tex: false, lw: 2 }));
      const ear = 'M64 70C58 54 60 36 68 24C80 34 88 46 92 58Z';
      s += K.mirror(K.vol(ear, fur) + K.part('M68 62C65 52 66 43 70 36C76 42 81 49 84 56Z', '#f5c6cf', { line: '#9f5060', lw: 1.2 }));
      // голова
      s += K.vol('M100 44C130 44 148 62 148 86C148 106 130 120 100 120C70 120 52 106 52 86C52 62 70 44 100 44Z', fur);
      s += K.part('M100 84C116 84 128 94 130 106C124 116 112 120 100 120C88 120 76 116 70 106C72 94 84 84 100 84Z', wht, { flat: true, lw: 0 });
      s += K.part('M100 48C96 56 96 66 100 72C104 66 104 56 100 48Z', '#475569', { lw: 0, op: 0.5 });
      s += K.gloss(74, 60, 8, 4.5, -35, 0.4);
      s += K.eyes(100, 84, 19, 11, { iris: '#b45309', look: [0.3, -0.5] });
      s += `<ellipse cx="100" cy="98" rx="6" ry="4.2" fill="#1c2433"/><ellipse cx="98.4" cy="96.8" rx="2" ry="1.1" fill="#fff" opacity=".7"/>`;
      s += K.mouth('o', 100, 104, 12);
      s += K.blush(72, 104, 5.6) + K.blush(128, 104, 5.6);
      // «у-у-у» к месяцу
      s += K.g(K.line('M146 58Q154 52 152 42M152 64Q164 56 162 40M158 72Q176 60 172 40', '#eef2ff', 2.2, { op: 0.75 }), '', 'art-blink');
      s += K.spark(24, 40, 3, '#e4ffb0', 'art-float') + K.spark(34, 100, 2.4, '#fef3c7') + K.spark(186, 120, 2.4, '#e4ffb0', 'art-float');
      return s;
    },

    // Окури-ину: поджарый серый горный волк на ночной тропе — белое жабо, тёмная спина, внимательные жёлтые глаза, хвост трубой;
    // в зубах держит палочку с бумажным фонариком, чтобы проводить путника до дома. Позади месяц и тёмные горы, вокруг светлячки
    jp_okuriinu(K) {
      const fur = { c1: '#aab6c8', c2: '#2c3648', rim: '#e4ffb0', rimK: 0.42, line: '#121826', texK: 0.18 }, wht = '#eef2f7';
      let s = K.aura('#84cc16', 92, 108, 0.3);
      s += `<path d="M160 12A16 16 0 1 0 177 38A13 13 0 1 1 160 12Z" fill="#fef3c7" stroke="#a16207" stroke-width="1.2"/>`;
      s += `<path d="M0 132L30 94L52 116L78 82L108 114L136 88L166 120L200 98V170H0Z" fill="${K.lin(['#3b4a63', '#1e293b'])}" opacity=".5"/>`;
      // хвост трубой
      s += foxTail(K, 128, 150, 78, 40, 56, fur, '#1e293b');
      // задние лапы
      s += K.mirror(K.vol('M70 132C62 142 58 156 58 168C58 175 64 178 70 178C76 178 80 175 80 168C80 158 82 148 86 140Z', fur));
      // тело
      s += K.vol('M100 92C126 92 144 108 146 128C148 146 138 156 122 158H78C62 156 52 146 54 128C56 108 74 92 100 92Z', fur);
      s += K.part('M74 100C86 94 114 94 126 100C118 106 82 106 74 100Z', '#1e293b', { lw: 0, op: 0.35 });
      // передние лапы
      s += K.mirror(K.vol('M80 130C79 146 79 160 80 170C80 176 85 179 90 179C95 179 98 176 97 170C96 158 95 146 95 134Z', fur) + K.line('M84 175v4M89 174v5M94 175v4', '#121826', 1.2, { op: 0.6 }));
      // белое жабо
      s += K.part(shag(100, 116, 24, 18, 9, 0.22), wht, { line: '#94a3b8', lw: 1.4 });
      // уши и щёки
      const ear = 'M68 52C62 36 64 18 72 6C84 16 92 30 94 42Z';
      s += K.mirror(K.vol(ear, fur) + K.part('M72 44C69 34 70 25 74 18C80 24 85 31 87 38Z', '#d8b4bc', { line: '#7b4652', lw: 1.2 }));
      s += K.mirror(K.vol('M66 66C56 72 50 80 48 90C56 88 60 90 64 88C62 94 66 98 72 96L76 82Z', { ...fur, tex: false, lw: 2 }));
      // голова с длинной мордой
      s += K.vol('M100 30C124 30 138 46 138 64C138 74 134 82 128 88C122 96 112 104 104 108H96C88 104 78 96 72 88C66 82 62 74 62 64C62 46 76 30 100 30Z', fur);
      s += K.part('M100 70C112 70 122 78 126 88C120 98 110 104 102 107H98C90 104 80 98 74 88C78 78 88 70 100 70Z', wht, { flat: true, lw: 0 });
      s += K.part('M100 34C96 42 96 52 100 58C104 52 104 42 100 34Z', '#1e293b', { lw: 0, op: 0.45 });
      s += K.gloss(80, 44, 6, 3.5, -35, 0.35);
      s += K.eyes(100, 60, 15, 8.4, { iris: '#facc15', lid: 'angry', skin: '#8d98aa', look: [-0.3, 0.2] });
      s += `<ellipse cx="100" cy="91" rx="5" ry="3.4" fill="#121826"/><ellipse cx="98.6" cy="90" rx="1.7" ry=".9" fill="#fff" opacity=".7"/>`;
      // палочка с фонариком в зубах
      s += K.line('M50 100H124', '#451a03', 4.6) + K.line('M50 100H124', '#a16207', 2.4);
      s += `<circle class="art-aura" cx="52" cy="124" r="24" fill="${K.rad([[0, '#fde68a', 0.7], [1, '#f59e0b', 0]])}"/>`;
      s += K.g(K.line('M52 100V110', '#451a03', 1.4) + K.part('M45 110H59V113H45Z', '#1f2937', { line: '#020617', lw: 1 }) +
        `<ellipse cx="52" cy="124" rx="10" ry="12" fill="${K.rad([[0, '#fffbe6'], [0.6, '#fde68a'], [1, '#f59e0b']], 0.45, 0.4)}" stroke="#92400e" stroke-width="1.4"/>` +
        K.line('M43 118Q52 116 61 118M42 124H62M43 130Q52 132 61 130', '#b45309', 1, { op: 0.7 }) + K.part('M46 135H58V138H46Z', '#1f2937', { line: '#020617', lw: 1 }), '', 'art-sway" style="transform-origin:50% 0');
      // светлячки
      for (const [x, y, d] of [[24, 60, 0.2], [176, 70, 0.9], [150, 150, 0.5], [30, 160, 1.3]]) s += `<g class="art-blink" style="animation-delay:-${d}s"><circle cx="${x}" cy="${y}" r="6" fill="${K.rad([[0, '#ecfccb', 0.9], [1, '#a3e635', 0]])}"/><circle cx="${x}" cy="${y}" r="1.8" fill="#f7fee7"/></g>`;
      return s;
    },

    // Огути-но Магами: волк-ками горного святилища Мицуминэ — могучий тёмно-синий волк с белой гривой, похожей на языки пламени,
    // горящие золотые глаза и белые клыки; сидит на скале перед тремя горными вершинами, на шее красно-белый священный шнур,
    // рядом парит бумажный оберег-офуда от пожаров и воров
    jp_oguchi(K) {
      const fur = { c1: '#7b8aa6', c2: '#151d30', rim: '#e4ffb0', rimK: 0.5, line: '#0a0f1c', texK: 0.2 };
      const mane = { c1: '#ffffff', c2: '#b6c2d6', rim: '#e4ffb0', rimK: 0.5, line: '#334155', texK: 0.1 };
      let s = K.aura('#84cc16', 100, 100, 0.44) + K.aura('#e0f2fe', 64, 72, 0.2);
      // три вершины Мицуминэ и сосны
      s += `<path d="M0 142L34 74L56 106L100 36L144 106L166 74L200 142V176H0Z" fill="${K.lin(['#4b6a5a', '#1f3a2c'])}" stroke="#0f2418" stroke-width="2" opacity=".85"/>`;
      s += `<path d="M88 55L100 36L112 55L106 52L100 58L94 52ZM27 88L34 74L41 88L37 86L34 90L31 86ZM159 88L166 74L173 88L169 86L166 90L163 86Z" fill="#f1f5f9" opacity=".9"/>`;
      const pine = (x, y, k) => K.part(`M${x} ${y - 30 * k}L${r1(x + 9 * k)} ${r1(y - 14 * k)}H${r1(x + 5 * k)}L${r1(x + 12 * k)} ${y}H${r1(x - 12 * k)}L${r1(x - 5 * k)} ${r1(y - 14 * k)}H${r1(x - 9 * k)}Z`, '#2f5d3a', { line: '#0f2418', lw: 1.4 });
      s += pine(18, 150, 1.1) + pine(36, 156, 0.8) + pine(182, 150, 1.1) + pine(164, 156, 0.8);
      // скала
      s += K.vol('M28 180C26 162 40 150 60 148H140C160 150 174 162 172 180Z', { c1: '#a8a29e', c2: '#44403c', rim: '#e4ffb0', rimK: 0.4, line: '#1c1917', tex: false });
      s += K.line('M48 160L60 166M140 158L150 168M96 152L104 158', '#292524', 1.6, { op: 0.6 });
      // хвост
      s += foxTail(K, 136, 150, 84, 44, 62, fur, '#e2e8f0');
      // задние лапы
      s += K.mirror(K.vol(K.ell(62, 150, 16, 12), fur));
      // тело
      s += K.vol('M100 86C130 86 148 106 148 132C148 150 136 158 100 158C64 158 52 150 52 132C52 106 70 86 100 86Z', fur);
      // передние лапы с когтями
      s += K.mirror(K.vol('M74 116C72 134 72 150 73 160C73 167 78 170 84 170C90 170 93 167 92 160C91 148 91 134 92 120Z', fur) +
        `<path d="M75 166l-2 5M80 168l-1 5M86 168l1 5" stroke="#e2e8f0" stroke-width="1.6" stroke-linecap="round"/>`);
      // грива языками пламени
      s += K.vol(shag(100, 84, 50, 42, 11, 0.34, -Math.PI / 2 + 0.15), mane);
      // красно-белый шнур
      const cord = 'M64 106Q100 126 136 106';
      s += K.line(cord, '#7f1d1d', 7.4) + K.line(cord, '#ffffff', 5) + `<path d="${cord}" fill="none" stroke="#dc2626" stroke-width="5" stroke-dasharray="4 4"/>`;
      s += K.g(K.line('M100 120C98 128 102 132 100 140', '#dc2626', 2.4) + `<path d="M96 138l4 10l4-10Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1"/>`, '', 'art-sway');
      // уши
      const ear = 'M70 46C64 32 66 16 72 6C84 14 92 26 94 38Z';
      s += K.mirror(K.vol(ear, fur) + K.part('M73 40C71 31 72 22 75 16C80 21 85 27 87 34Z', '#c9a3ad', { line: '#5b2b38', lw: 1.2 }));
      // голова
      s += K.vol('M100 26C124 26 138 42 138 60C138 70 134 78 128 84C122 92 112 100 104 104H96C88 100 78 92 72 84C66 78 62 70 62 60C62 42 76 26 100 26Z', fur);
      s += K.part('M100 66C112 66 122 74 126 84C120 94 110 100 102 103H98C90 100 80 94 74 84C78 74 88 66 100 66Z', '#cbd5e1', { flat: true, lw: 0 });
      s += K.mirror(K.part('M74 50C80 44 90 44 96 50L94 54C88 50 82 50 76 54Z', '#f1f5f9', { line: '#334155', lw: 1 }));
      s += K.glow(87, 60, 6, 5, '#fde68a') + K.glow(113, 60, 6, 5, '#fde68a');
      s += `<ellipse cx="100" cy="84" rx="5.4" ry="3.6" fill="#0a0f1c"/>`;
      s += `<path d="M86 92Q100 88 114 92Q110 102 100 103Q90 102 86 92Z" fill="#6b1d2a" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M88 92.4l2.4 5.6l2.4-5.6ZM112 92.4l-2.4 5.6l-2.4-5.6Z" fill="#fff"/>`;
      // бумажный оберег-офуда
      s += K.g(K.g(K.part('M158 24H180V70H158Z', '#fffbeb', { line: '#78350f', lw: 1.6 }) + `<circle cx="169" cy="34" r="5" fill="#dc2626" opacity=".85"/>` +
        K.line('M164 44q5 2 10 0M163 51q6 3 12 0M164 58q5 2 10 0M169 44V64', '#1f2937', 1.6, { op: 0.85 }), 'rotate(10 169 47)'), '', 'art-float');
      s += K.spark(20, 30, 3, '#e4ffb0', 'art-float') + K.spark(136, 18, 2.6, '#f1f5f9') + K.spark(186, 110, 2.4, '#e4ffb0');
      return s;
    },

    // ===================== ВОДА: сом намадзу =====================

    // Сомёнок: круглый сомёнок-малыш сидит в лужице рисового поля — сине-серая спинка, светлое пузико, широкая улыбка и две длинные
    // усы-завитушки, плавнички как ручки, хвостик загнут вбок; вокруг подрагивают черточки — он чует толчки раньше всех
    jp_somyonok(K) {
      const skin = { c1: '#b9dbe6', c2: '#2f5d73', rim: '#c8f3ff', rimK: 0.75, line: '#0f2a38', texK: 0.18 };
      let s = K.aura('#38bdf8', 86, 120, 0.3);
      s += `<ellipse cx="100" cy="176" rx="70" ry="8" fill="${K.rad([[0, '#7dd3fc', 0.6], [1, '#2b8fd6', 0]])}"/>`;
      s += '<g class="art-aura"><ellipse cx="100" cy="176" rx="80" ry="9" fill="none" stroke="#bfeaff" stroke-width="1.6" opacity=".45"/></g>';
      // ростки риса
      s += [[22, 0], [34, 1], [166, 1], [178, 0]].map(([x, k]) => K.line(`M${x} 178C${x} 168 ${x - 2} 160 ${x - 6} ${152 + k * 4}M${x} 178C${x + 1} 168 ${x + 4} 160 ${x + 8} ${154 + k * 4}M${x} 178V${156 + k * 6}`, '#65a30d', 2.2)).join('');
      // сам сомёнок (чуть крупнее, как другие малыши)
      let b = '';
      // хвостик
      b += K.vol('M128 162C144 162 156 152 162 140C166 132 174 132 176 140C178 154 164 170 140 172Z', { ...skin, tex: false, lw: 2.2 });
      b += K.line('M164 142L170 150M158 150L166 156', '#0f2a38', 1.2, { op: 0.6 });
      // тело
      b += K.vol('M100 76C128 74 150 88 152 114C154 148 132 176 100 176C68 176 46 148 48 114C50 88 72 74 100 76Z', skin);
      b += K.part('M100 118C122 118 136 132 136 148C136 164 120 173 100 173C80 173 64 164 64 148C64 132 78 118 100 118Z', '#eef6f2', { line: '#9fbcc6', lw: 1.4 });
      b += `<g fill="#2f5d73" opacity=".35"><circle cx="70" cy="96" r="3"/><circle cx="130" cy="94" r="3.4"/><circle cx="62" cy="114" r="2.2"/><circle cx="140" cy="112" r="2.4"/></g>`;
      // спинной плавничок
      b += K.part('M92 77C94 66 102 60 110 60C106 66 106 72 108 78Z', '#5f93a8', { line: '#0f2a38', lw: 1.6 });
      // плавнички-ручки
      b += K.mirror(K.vol('M54 130C44 132 36 140 34 148C42 150 50 146 56 140Z', { ...skin, tex: false, lw: 2 }) + K.line('M40 145L50 138', '#0f2a38', 1, { op: 0.5 }));
      b += K.gloss(74, 90, 8, 4.5, -35, 0.45);
      b += K.eyes(100, 102, 23, 11, { iris: '#0369a1', look: [0, 0.3] });
      // широкая улыбка и усы
      b += K.mouth('smile', 100, 122, 34);
      b += K.mirror(K.line('M80 124C66 120 52 124 46 136C42 144 48 152 54 148', '#0f2a38', 3.4) + K.line('M90 132C88 138 84 142 80 142', '#0f2a38', 2));
      b += K.blush(70, 120, 6) + K.blush(130, 120, 6);
      s += K.g(b, 'translate(100 177) scale(1.14) translate(-100 -177)');
      // дрожь — чует толчки
      s += K.g(K.line('M40 84l-8-5M36 96h-9M160 84l8-5M164 96h9', '#bae6fd', 2.2, { op: 0.85 }), '', 'art-blink');
      s += `<circle cx="34" cy="60" r="3.6" fill="none" stroke="#e0f7ff" stroke-width="1.4" class="art-float"/><circle cx="168" cy="52" r="2.6" fill="none" stroke="#e0f7ff" stroke-width="1.2" class="art-float" style="animation-delay:-.7s"/>`;
      s += K.spark(30, 30, 3, '#e0f7ff', 'art-float') + K.spark(176, 110, 2.4, '#e0f7ff');
      return s;
    },

    // Намадзу: большой сом поднимается из закрученного ила — тёмно-синяя спина в пятнышках, светлое брюхо, хитрая широкая ухмылка
    // и длинные усы волнами; одним плавником машет, хвост бьёт по земле — от удара бегут трещины и подпрыгивают камешки
    jp_namazu(K) {
      const skin = { c1: '#9cc7d6', c2: '#1f4b63', rim: '#c8f3ff', rimK: 0.75, line: '#0b2230', texK: 0.2 };
      let s = K.aura('#38bdf8', 94, 106, 0.34);
      // трещины в земле и ил
      s += K.line('M6 178L20 170L26 178L40 168M194 178L180 170L174 178L160 168M14 162L24 166', '#3f2a14', 2.2, { op: 0.8 });
      s += `<ellipse cx="100" cy="170" rx="72" ry="12" fill="${K.rad([[0, '#8b7355'], [0.7, '#5b4632'], [1, '#3f2a14']], 0.5, 0.4)}" stroke="#2a1d10" stroke-width="2"/>`;
      s += K.line('M50 168Q76 160 100 168T150 168M64 174Q90 170 112 175', '#a68b6a', 1.6, { op: 0.8 });
      // хвост бьёт
      s += K.vol('M138 164C158 160 168 146 170 128C170 118 178 110 186 114C190 132 184 158 158 172Z', { ...skin, tex: false, lw: 2.2 });
      s += K.line('M176 118L182 126M172 128L180 134', '#0b2230', 1.2, { op: 0.6 });
      // тело-столбик
      s += K.vol('M62 168C58 136 64 112 78 98H122C136 112 142 136 138 168Z', skin);
      s += K.part('M100 112C116 112 126 128 126 146C126 160 116 168 100 168C84 168 74 160 74 146C74 128 84 112 100 112Z', '#eef6f2', { line: '#9fbcc6', lw: 1.4 });
      s += K.line('M84 132H116M80 146H120M84 160H116', '#9fbcc6', 1.2, { op: 0.7 });
      // плавник машет
      s += K.vol('M66 112C54 106 44 94 40 80C46 78 54 84 62 96C64 100 66 104 70 108Z', { ...skin, tex: false, lw: 2 }) + K.line('M46 84L58 98M44 90L56 102', '#0b2230', 1.2, { op: 0.5 });
      s += K.vol('M134 114C144 120 150 130 150 140C144 142 138 136 132 128Z', { ...skin, tex: false, lw: 2 });
      // голова
      s += K.vol('M100 34C134 34 154 52 154 74C154 96 132 110 100 110C68 110 46 96 46 74C46 52 66 34 100 34Z', skin);
      s += `<g fill="#1f4b63" opacity=".4"><circle cx="78" cy="46" r="3.4"/><circle cx="122" cy="44" r="3"/><circle cx="100" cy="40" r="2.6"/><circle cx="62" cy="62" r="2.4"/><circle cx="140" cy="60" r="2.8"/></g>`;
      s += K.part('M90 36C92 26 100 20 108 20C104 26 104 30 106 36Z', '#5f93a8', { line: '#0b2230', lw: 1.6 });
      s += K.gloss(70, 52, 9, 4.5, -30, 0.45);
      s += K.eyes(100, 66, 26, 9.5, { iris: '#0369a1', lid: 'half', skin: '#6fa3b8', look: [0.4, 0.2] });
      s += K.mouth('grin', 100, 84, 40);
      // усы волнами
      s += K.mirror(K.line('M64 86C48 90 36 100 34 114C32 126 40 132 46 126C50 122 46 116 42 120', '#0b2230', 3.6) + K.line('M84 96C82 104 78 108 72 110', '#0b2230', 2.2));
      // камешки и пузырьки
      for (const [x, y, d] of [[24, 140, 0.2], [180, 92, 0.8], [30, 110, 1.3]]) s += `<g class="art-float" style="animation-delay:-${d}s"><ellipse cx="${x}" cy="${y}" rx="5" ry="3.6" fill="${K.rad([[0, '#d6d3d1'], [1, '#78716c']], 0.35, 0.3)}" stroke="#292524" stroke-width="1.2"/></g>`;
      s += `<circle cx="160" cy="40" r="3.6" fill="none" stroke="#e0f7ff" stroke-width="1.4" class="art-float"/><circle cx="174" cy="24" r="2.4" fill="none" stroke="#e0f7ff" stroke-width="1.2" class="art-float" style="animation-delay:-.6s"/>`;
      s += K.spark(30, 30, 3, '#e0f7ff', 'art-float') + K.spark(186, 150, 2.4, '#e0f7ff');
      return s;
    },

    // Великий намадзу: исполинский сом под Японией — на голове у него лежит священный камень-канамэиси, обвязанный верёвкой с сидэ,
    // и сом ворчливо косится на него снизу; тело кольцом уходит за спину, хвост поднят над волнами, длинные усы струятся, как течение
    jp_oonamazu(K) {
      const skin = { c1: '#8fbfd1', c2: '#163a4f', rim: '#c8f3ff', rimK: 0.75, line: '#071a26', texK: 0.2 };
      let s = K.aura('#38bdf8', 100, 100, 0.44);
      // кольцо тела за спиной и хвост
      s += K.vol('M40 150C22 128 24 92 46 70C70 46 118 40 150 58C172 70 182 92 176 110L156 104C160 90 152 76 136 70C112 60 78 66 62 84C48 100 48 126 60 142Z', skin);
      s += K.vol('M158 104C168 86 172 64 166 44C164 36 172 30 180 34C190 48 190 82 176 110Z', { ...skin, tex: false, lw: 2.2 });
      s += K.part('M166 44C164 36 172 30 180 34C186 42 188 52 188 62C182 54 174 48 166 44Z', '#5f93a8', { line: '#071a26', lw: 1.4 });
      s += `<g fill="#163a4f" opacity=".4"><circle cx="58" cy="78" r="3"/><circle cx="84" cy="58" r="3.4"/><circle cx="118" cy="54" r="3"/><circle cx="146" cy="66" r="2.6"/><circle cx="44" cy="112" r="2.6"/></g>`;
      // волны
      s += `<path d="M0 200V164H200V200Z" fill="${K.lin(['#3b82f6', '#1e3a8a'])}"/>`;
      s += `<path d="${seigaiha(0, 200, 178, 10)}" fill="none" stroke="#bfdbfe" stroke-width="1.6" opacity=".9"/>`;
      s += K.part('M0 166C10 156 20 160 26 166C32 158 44 158 50 166C56 158 68 158 74 166C80 158 92 158 98 166C104 158 116 158 122 166C128 158 140 158 146 166C152 158 164 158 170 166C176 158 188 158 200 164V172H0Z', '#60a5fa', { line: '#0a1033', lw: 1.6 });
      // голова и брюхо
      s += K.vol('M100 72C138 72 162 94 162 122C162 152 136 170 100 170C64 170 38 152 38 122C38 94 62 72 100 72Z', skin);
      s += K.part('M100 132C124 132 142 142 146 156C134 166 118 170 100 170C82 170 66 166 54 156C58 142 76 132 100 132Z', '#eef6f2', { line: '#9fbcc6', lw: 1.4 });
      s += `<g fill="#163a4f" opacity=".4"><circle cx="70" cy="92" r="3"/><circle cx="130" cy="90" r="3.4"/><circle cx="52" cy="112" r="2.4"/><circle cx="148" cy="110" r="2.6"/></g>`;
      s += K.gloss(66, 98, 9, 4.5, -30, 0.45);
      // ворчливые глаза — косятся на камень
      s += K.eyes(100, 112, 30, 10, { iris: '#0369a1', lid: 'angry', skin: '#6aa3bb', look: [0.1, -0.7] });
      s += K.mouth('frown', 100, 136, 30);
      // усы-течения
      s += K.mirror(K.line('M70 138C52 140 36 150 30 164C26 174 34 182 42 176C46 172 42 166 38 170', '#071a26', 4) + K.line('M70 138C52 140 36 150 30 164', '#5f93a8', 1.4, { op: 0.8 }));
      // камень-канамэиси с верёвкой и сидэ
      s += K.vol('M64 72C60 54 74 38 100 36C126 38 140 54 136 72C128 80 72 80 64 72Z', { c1: '#d6d3d1', c2: '#57534e', rim: '#c8f3ff', rimK: 0.4, line: '#1c1917', tex: false });
      s += K.line('M74 50L82 56M118 46L124 54M96 44L100 48', '#44403c', 1.4, { op: 0.6 });
      const rope = 'M64 62Q100 74 136 62';
      s += K.line(rope, '#78350f', 7) + K.line(rope, '#f3d38a', 4.4) + `<path d="${rope}" fill="none" stroke="#b88a3e" stroke-width="4.4" stroke-dasharray="3 3"/>`;
      s += shide(82, 67, 1, 0.2) + shide(114, 67, 1, 0.9);
      // дрожь и пузырьки
      s += K.g(K.line('M26 60l-8-4M22 72h-9M188 140l8-4', '#bae6fd', 2.2, { op: 0.85 }), '', 'art-blink');
      s += `<circle cx="22" cy="130" r="3.6" fill="none" stroke="#e0f7ff" stroke-width="1.4" class="art-float"/><circle cx="34" cy="146" r="2.4" fill="none" stroke="#e0f7ff" stroke-width="1.2" class="art-float" style="animation-delay:-.6s"/>`;
      s += K.spark(24, 30, 3, '#e0f7ff', 'art-float') + K.spark(100, 14, 2.6, '#fef08a') + K.spark(190, 160, 2.4, '#e0f7ff');
      return s;
    },

    // ===================== НЕОБЫЧНЫЕ: ёкаи и цукумогами =====================

    // Каса-обакэ: столетний бумажный зонтик-цукумогами — алый сложенный купол с белой полосой «змеиный глаз», один огромный глаз,
    // ухмылка с длинным розовым языком; скачет на единственной ноге-ручке в деревянной гэта, вокруг вихри ветра и капли дождя
    jp_kasaobake(K) {
      const paper = { c1: '#f86b6b', c2: '#8c0d18', rim: '#eef0ff', rimK: 0.6, line: '#4a0710', texK: 0.22 };
      let s = K.aura('#a5b4fc', 88, 106, 0.32);
      s += K.g(K.line(spiral(30, 50, 1.4, 2), '#e0e7ff', 2), '', 'art-spin') + K.g(K.line(spiral(172, 120, 1.2, 1.8), '#e0e7ff', 2), '', 'art-spin');
      s += K.line('M8 104q14-10 28 0t24-2M140 30q14-8 28 2M150 160q12-8 26 0', '#e0e7ff', 2.2, { op: 0.6, cls: 'art-float' });
      s += K.line('M40 20l-3 9M168 64l-3 9M26 142l-3 9M178 92l-2 6', '#bfdbfe', 1.8, { op: 0.6 });
      let b = '';
      // нога-ручка в гэта
      b += K.line('M100 140V164', '#451a03', 7) + K.line('M100 140V164', '#b45309', 4);
      b += K.part('M84 170H116V174H84Z', '#d6a756', { line: '#5a3a14', lw: 1.4 }) + K.part('M88 174H94V179H88ZM106 174H112V179H106Z', '#a16207', { line: '#5a3a14', lw: 1.2 });
      b += K.part(K.ell(100, 166, 10, 5), '#fcd9b8', { line: '#7a4a2a', lw: 1.4 }) + K.line('M92 168L100 162L108 168', '#dc2626', 2);
      // купол
      const dome = 'M100 14C114 40 134 90 154 136Q142 146 128 142Q114 150 100 144Q86 150 72 142Q58 146 46 136C66 90 86 40 100 14Z';
      b += K.vol(dome, paper) + tipFill(K, dome, 'M0 92H200V104H0Z', '#fff7ed');
      b += K.line('M100 16L128 142M100 16L100 144M100 16L72 142M100 16L114 146M100 16L86 146', '#5c0a12', 1.2, { op: 0.45 });
      b += `<path d="${dome}" fill="none" stroke="${paper.line}" stroke-width="3" stroke-linejoin="round"/>`;
      b += K.part('M95 8H105L104 16H96Z', '#1f2937', { line: '#020617', lw: 1.2 }) + K.line('M100 8C94 0 106 0 100 8', '#78350f', 1.6);
      // один большой глаз и язык
      b += `<g class="art-eyes">${K.eye(100, 70, 13, { iris: '#7c3aed', look: [0.3, 0.2] })}</g>`;
      b += K.mouth('grin', 100, 112, 32);
      b += K.g(K.part('M104 120C106 132 112 142 120 144C127 145 129 137 124 133C118 130 113 124 111 117Z', '#f47a8f', { line: '#9f1239', lw: 1.6 }) + K.line('M109 124Q114 134 121 139', '#c24466', 1.2), '', 'art-sway');
      b += K.blush(80, 104, 5) + K.blush(120, 104, 5);
      s += K.g(b, '', 'art-float');
      s += K.spark(26, 80, 3, '#e0e7ff', 'art-float') + K.spark(176, 30, 2.6, '#eef0ff') + K.spark(20, 170, 2.4, '#e0e7ff');
      return s;
    },

    // Тётин-обакэ: старый красный бумажный фонарь раменной висит на бамбуковой жерди — треснул поперёк, и вышла пасть с длинным
    // языком; светится изнутри, один глаз открыт, другим подмигивает; от фонаря расходятся лучики тёплого света
    jp_chochin(K) {
      const paper = { c1: '#ff9b8a', c2: '#b81d1d', rim: '#fff6b0', rimK: 0.6, line: '#4a0707', texK: 0.2 };
      let s = K.aura('#facc15', 92, 104, 0.4);
      // лучики света
      let rays = '';
      for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180 + 0.26; rays += `M${r1(100 + 66 * Math.cos(a))} ${r1(100 + 70 * Math.sin(a))}L${r1(100 + 84 * Math.cos(a))} ${r1(100 + 88 * Math.sin(a))}`; }
      s += K.g(K.line(rays, '#fde047', 3, { op: 0.6 }), '', 'art-blink');
      // жердь
      s += K.line('M6 14L194 24', '#451a03', 6) + K.line('M6 14L194 24', '#a16207', 3) + K.line('M60 17V21M140 21V25', '#451a03', 1.4);
      let b = K.line('M100 19V30', '#1f2937', 2);
      b += `<circle cx="100" cy="24" r="4" fill="none" stroke="#1f2937" stroke-width="2"/>`;
      b += K.part('M78 30H122L118 40H82Z', '#1f2937', { line: '#020617', lw: 1.4 });
      // бумажное тело
      const body = 'M100 38C136 38 152 68 152 100C152 134 136 160 100 160C64 160 48 134 48 100C48 68 64 38 100 38Z';
      b += K.vol(body, paper);
      b += `<ellipse cx="100" cy="100" rx="40" ry="46" fill="${K.rad([[0, '#fff7c2', 0.7], [0.6, '#fde047', 0.25], [1, '#f97316', 0]])}"/>`;
      let ribs = '';
      for (let y = 50; y <= 150; y += 10) { const hw = Math.sqrt(Math.max(0, 1 - ((y - 100) / 62) ** 2)) * 52; ribs += `M${r1(100 - hw)} ${y}Q100 ${y + 4} ${r1(100 + hw)} ${y}`; }
      b += K.line(ribs, '#7f1d1d', 1.2, { op: 0.45 });
      b += K.part('M82 158H118L122 168H78Z', '#1f2937', { line: '#020617', lw: 1.4 });
      // пасть-трещина и язык
      b += K.part('M56 110L64 114L70 109L78 116L86 110L94 117L102 110L110 117L118 110L126 116L134 109L144 112C136 132 120 142 100 142C80 142 64 132 56 110Z', '#3a0f1a', { line: INK, lw: 2 });
      b += `<ellipse cx="100" cy="128" rx="26" ry="9" fill="${K.rad([[0, '#fb923c', 0.9], [1, '#7c2d12', 0]])}"/>`;
      b += K.g(K.part('M90 132C88 148 94 166 106 172C114 176 121 170 117 162C111 154 108 144 108 132Z', '#f47a8f', { line: '#9f1239', lw: 1.6 }) + K.line('M99 138Q102 154 110 164', '#c24466', 1.2), '', 'art-sway');
      // глаза: один смотрит, другой подмигивает
      b += `<g class="art-eyes">${K.eye(78, 82, 11, { iris: '#ca8a04', look: [0.3, 0.2] })}</g>`;
      b += K.line('M112 84Q122 76 132 84', INK, 3.4) + K.line('M131 82l5-3M132 86l5 0', INK, 1.8);
      b += K.blush(68, 100, 5.4) + K.blush(132, 100, 5.4);
      s += K.g(b, '', 'art-sway" style="transform-origin:50% 0');
      s += K.spark(24, 60, 3, '#fef08a', 'art-float') + K.spark(178, 70, 2.6, '#fffbe6') + K.spark(30, 160, 2.4, '#fef08a') + K.spark(172, 150, 2.6, '#fde047', 'art-float');
      return s;
    },

    // Иттан-момэн: длинная лента белого хлопка змейкой летит в сумерках над черепичными крышами — на верхнем конце сонные глазки
    // и две крошечные «ручки», которыми она держит стащенное с балкона синее полотенце-тэнугуи в горошек; нижний конец растрёпан
    jp_ittanmomen(K) {
      const cloth = { c1: '#ffffff', c2: '#b4bfd4', rim: '#eef0ff', rimK: 0.6, line: '#3d4a6e', lw: 2.2, texK: 0.18 };
      let s = K.aura('#a5b4fc', 96, 100, 0.32) + K.aura('#fdba74', 50, 170, 0.18);
      // крыши
      s += `<path d="M0 164L20 152H56L74 164V180H0Z" fill="#3b3560" opacity=".75"/><path d="M146 168L162 158H192L200 164V180H146Z" fill="#3b3560" opacity=".75"/>`;
      s += K.line('M2 160H72M148 164H198', '#7c6fb0', 1.6, { op: 0.6 });
      s += K.line('M20 84q14-10 28 0M150 132q14-8 28 2M160 20q12-8 26 0', '#e0e7ff', 2, { op: 0.6, cls: 'art-float' });
      // лента трепещет на ветру и перекручивается на повороте (изнанка чуть голубее)
      const pa = [[38, 42], [84, 34], [128, 44], [150, 66]], pb = [[150, 66], [146, 94], [112, 108], [70, 114], [48, 138], [66, 160], [112, 166], [148, 154]];
      s += K.vol(tube(pb, t => 3 + Math.min(1, t * 5) * 17 + 3 * Math.sin(t * 22), 6), { ...cloth, c1: '#eef2ff', c2: '#a3afcc' });
      s += K.vol(tube(pa, t => 24 - 20 * t * t + 2.5 * Math.sin(t * 12), 6), cloth);
      s += K.line('M114 42l4 14M96 104l2 12M60 140l12 4M96 160l2 12', '#c7d2fe', 1.4, { op: 0.8 });
      // растрёпанный конец
      s += K.line('M148 146l7-5M150 152l9-1M150 158l7 4M147 162l4 7', '#3d4a6e', 1.4);
      // ручки с полотенцем
      s += K.g(K.part('M80 52H102V88H80Z', '#3b82f6', { line: '#1e3a8a', lw: 1.6 }) +
        `<g fill="#eff6ff"><circle cx="85" cy="60" r="1.8"/><circle cx="95" cy="64" r="1.8"/><circle cx="87" cy="72" r="1.8"/><circle cx="97" cy="78" r="1.8"/><circle cx="85" cy="84" r="1.8"/></g>` +
        K.line('M80 58H102M80 82H102', '#bfdbfe', 1.2, { op: 0.8 }), '', 'art-sway" style="transform-origin:50% 0');
      s += K.vol('M76 46C72 52 74 58 80 58C84 56 84 50 82 46Z', { ...cloth, tex: false, lw: 1.8 }) + K.vol('M104 48C108 52 108 58 102 59C98 57 98 52 100 48Z', { ...cloth, tex: false, lw: 1.8 });
      // сонные глазки
      s += K.eyes(56, 40, 10, 5.6, { iris: '#6366f1', lid: 'half', skin: '#eef2ff', look: [0.3, 0.2] });
      s += K.blush(44, 48, 3.6) + K.blush(70, 48, 3.6);
      s += `<path d="${spiral(176, 96, 1.1, 1.8)}" fill="none" stroke="#e0e7ff" stroke-width="2" class="art-spin"/>`;
      s += K.spark(26, 18, 3, '#eef0ff', 'art-float') + K.spark(186, 40, 2.6, '#eef0ff') + K.spark(14, 120, 2.4, '#fde68a');
      return s;
    },

    // Кодама: дух старого священного дерева — светлый зеленоватый призрачок с ростком-листиками на макушке выглядывает из дупла,
    // сложив ладошки рупором: кричит «ау!» и сам себе отвечает эхом. Ствол перевязан священной верёвкой с сидэ, у корней мох
    jp_kodama(K) {
      const bark = { c1: '#b07a4a', c2: '#3f2612', rim: '#e4ffb0', rimK: 0.45, line: '#1f1206', tex: false };
      const ghost = { c1: '#ffffff', c2: '#9ee089', rim: '#e4ffb0', rimK: 0.7, line: '#2d5016', texK: 0.12 };
      let s = K.aura('#84cc16', 92, 104, 0.34);
      // крона
      s += K.leaf(40, 40, 26, -150, '#4d7c0f') + K.leaf(34, 56, 22, 170, '#65a30d') + K.leaf(160, 40, 26, -30, '#4d7c0f') + K.leaf(166, 56, 22, 10, '#65a30d');
      // ствол аркой
      s += K.vol('M26 180C28 130 32 82 48 50C64 22 136 22 152 50C168 82 172 130 174 180Z', bark);
      s += K.line('M40 170C40 130 44 96 54 70M160 170C160 130 156 96 146 70M70 36C82 30 118 30 130 36', '#1f1206', 1.6, { op: 0.5 });
      s += K.line('M36 120q6-4 4-10M164 110q-6-4-4-10M150 150q-6-4-4-10', '#6b4423', 2, { op: 0.6 });
      // дупло со свечением
      s += `<path d="M56 180C56 140 62 100 78 80C90 66 110 66 122 80C138 100 144 140 144 180Z" fill="${K.rad([[0, '#d9f99d', 0.5], [0.5, '#1f2d14'], [1, '#0d1508']], 0.5, 0.55, 0.6)}" stroke="#1f1206" stroke-width="2.4"/>`;
      // священная верёвка с сидэ
      const rope = 'M40 62Q100 82 160 62';
      s += K.line(rope, '#78350f', 7) + K.line(rope, '#f3d38a', 4.4) + `<path d="${rope}" fill="none" stroke="#b88a3e" stroke-width="4.4" stroke-dasharray="3 3"/>`;
      s += shide(62, 70, 1, 0.3) + shide(134, 70, 1, 1.1);
      // мох у корней
      s += K.part('M24 180C30 170 44 168 54 174C60 168 70 170 72 178Z', '#65a30d', { line: '#1a2e05', lw: 1.4 }) + K.part('M128 178C132 170 142 168 148 174C156 168 170 170 176 180Z', '#65a30d', { line: '#1a2e05', lw: 1.4 });
      // дух
      const g = 'M100 92C122 92 132 110 132 130C132 150 130 164 134 176C124 173 118 178 110 173C104 178 96 178 90 173C82 178 76 173 66 176C70 164 68 150 68 130C68 110 78 92 100 92Z';
      s += K.g(K.vol(g, ghost) +
        K.line('M100 94C100 86 98 80 94 76', '#3f6212', 2.2) + K.leaf(94, 78, 18, -140, '#84cc16') + K.leaf(96, 80, 16, -40, '#65a30d') +
        K.gloss(84, 108, 6, 3.5, -35, 0.5) +
        K.eyes(100, 124, 12.5, 8.4, { iris: '#4d7c0f', look: [0, 0.2] }) +
        K.mouth('o', 100, 140, 13) + K.blush(80, 138, 4.6) + K.blush(120, 138, 4.6) +
        K.vol(K.ell(85, 146, 6.5, 6), { ...ghost, tex: false, lw: 1.8 }) + K.vol(K.ell(115, 146, 6.5, 6), { ...ghost, tex: false, lw: 1.8 }), '', 'art-float');
      // эхо
      s += K.g(K.line('M172 96q8 10 0 20M180 90q12 16 0 32M188 84q16 22 0 44', '#f7fee7', 2.2, { op: 0.8 }), '', 'art-blink');
      s += K.g(K.line('M28 96q-8 10 0 20M20 90q-12 16 0 32M12 84q-16 22 0 44', '#f7fee7', 2.2, { op: 0.8 }), '', 'art-blink" style="animation-delay:-.8s');
      s += K.spark(100, 10, 3, '#e4ffb0', 'art-float') + K.spark(60, 104, 2, '#f7fee7') + K.spark(140, 110, 2, '#f7fee7');
      return s;
    },

    // Дзасики-вараси: дух-ребёнок старого дома — стрижка-«каппа» с ровной чёлкой, румяные щёки, красное кимоно в белых цветочках
    // с жёлтым поясом; прижимает к груди вышитый мячик тэмари. Позади светится бумажная ширма сёдзи, на татами — следы маленьких ног
    jp_zashiki(K) {
      const kim = { c1: '#fb7185', c2: '#9f1239', rim: '#e9d5ff', rimK: 0.6, line: '#3b0718', texK: 0.24 };
      const skin = '#fde8d8', hair = '#1f1a2e';
      let s = K.aura('#c084fc', 92, 104, 0.32);
      // сёдзи
      s += K.part('M30 18H170V160H30Z', '#3b2a1a', { line: '#1c120a', lw: 2 });
      s += `<rect x="36" y="24" width="128" height="130" fill="${K.rad([[0, '#fef3c7', 0.95], [0.7, '#e9d5ff', 0.85], [1, '#a78bfa', 0.75]], 0.5, 0.45)}"/>`;
      s += K.line('M68 24V154M100 24V154M132 24V154M36 56H164M36 88H164M36 120H164', '#5b4632', 2.2, { op: 0.85 });
      // татами
      s += K.part('M0 160H200V182H0Z', '#c9c48a', { line: '#5b5a2a', lw: 1.6 }) + K.line('M0 166H200', '#2f4a2a', 3) + K.line('M60 166V182M140 166V182', '#8a8650', 1.2, { op: 0.6 });
      // следы маленьких ног
      const foot = (x, y, r) => `<g transform="rotate(${r} ${x} ${y})" fill="#f5f3ff" opacity=".7"><ellipse cx="${x}" cy="${y}" rx="3" ry="4.4"/><circle cx="${x - 2}" cy="${y - 6.4}" r="1"/><circle cx="${x}" cy="${y - 7}" r="1"/><circle cx="${x + 2}" cy="${y - 6.4}" r="1"/></g>`;
      s += foot(26, 176, -20) + foot(40, 172, -10) + foot(170, 176, 15);
      // волосы сзади
      s += K.part('M56 102C52 70 60 38 100 30C140 38 148 70 144 102C138 106 130 104 126 98L74 98C70 104 62 106 56 102Z', hair, { line: '#0b0814', lw: 1.6 });
      // ножки
      s += K.mirror(K.part('M84 168H96V174H84Z', skin, { line: '#7a4a2a', lw: 1.2 }) + K.part(K.ell(89, 176, 8, 3.6), '#f8fafc', { line: '#64748b', lw: 1.2 }));
      // кимоно
      s += K.vol('M100 102C116 102 126 112 128 126L136 170H64L72 126C74 112 84 102 100 102Z', kim);
      const flower = (x, y) => `<g fill="#fff1f2">${[0, 72, 144, 216, 288].map(a => `<circle cx="${r1(x + 3 * Math.cos(a * Math.PI / 180))}" cy="${r1(y + 3 * Math.sin(a * Math.PI / 180))}" r="1.8"/>`).join('')}</g><circle cx="${x}" cy="${y}" r="1.2" fill="#fbbf24"/>`;
      s += flower(78, 150) + flower(120, 156) + flower(96, 162) + flower(84, 132) + flower(126, 136);
      s += K.line('M88 104L100 120L112 104', '#fff7ed', 3.4);
      // жёлтый пояс с бантом
      s += K.part('M72 124Q100 132 128 124L129 134Q100 142 71 134Z', '#fbbf24', { line: '#78350f', lw: 1.6 });
      s += K.g(K.part('M128 128C138 120 146 124 144 132C146 140 138 142 128 134Z', '#fbbf24', { line: '#78350f', lw: 1.4 }) + K.part('M130 134C134 144 132 152 128 156C126 150 126 142 127 136Z', '#f59e0b', { line: '#78350f', lw: 1.2 }), '', 'art-sway');
      // рукава и мячик тэмари
      s += K.mirror(K.vol('M76 108C64 112 58 124 58 138C60 146 70 148 80 144L86 122Z', kim));
      s += `<circle cx="100" cy="134" r="13" fill="${K.rad([[0, '#ffffff'], [1, '#e2e8f0']], 0.35, 0.3)}" stroke="#334155" stroke-width="1.6"/>`;
      s += K.line('M88 128L112 140M88 140L112 128M100 121V147M87 134H113', '#dc2626', 1.6, { op: 0.9 }) + K.line('M92 124L108 144M92 144L108 124', '#2563eb', 1.4, { op: 0.9 });
      s += `<circle cx="100" cy="134" r="4" fill="#22c55e" stroke="#14532d" stroke-width="1"/>`;
      s += K.part(K.ell(86, 140, 5.6, 5), skin, { line: '#7a4a2a', lw: 1.3 }) + K.part(K.ell(114, 140, 5.6, 5), skin, { line: '#7a4a2a', lw: 1.3 });
      // голова
      s += K.vol('M100 40C122 40 138 56 138 76C138 94 122 106 100 106C78 106 62 94 62 76C62 56 78 40 100 40Z', { c1: skin, c2: '#efb9a0', rim: '#f5e8ff', rimK: 0.5, tex: false, lw: 2.2, line: '#7a4a2a' });
      s += K.part('M61 74C58 48 76 34 100 34C124 34 142 48 139 74Q120 66 100 66Q80 66 61 74Z', hair, { line: '#0b0814', lw: 1.4 });
      s += K.line('M80 40Q88 38 96 42M110 40Q118 40 124 46', '#4c4470', 1.4, { op: 0.8 });
      s += K.eyes(100, 82, 14, 8.6, { iris: '#4c1d95', look: [0.2, 0.3] });
      s += K.mouth('smile', 100, 96, 10);
      s += K.blush(78, 92, 6.4) + K.blush(122, 92, 6.4) + K.blush(78, 92, 3.6) + K.blush(122, 92, 3.6);
      s += K.spark(18, 40, 2.8, '#e9d5ff', 'art-float') + K.spark(184, 30, 2.6, '#f5f3ff') + K.spark(186, 120, 2.4, '#e9d5ff', 'art-float');
      return s;
    },

    // Амабиэ: морская дева из моря у Кумамото — длинные розовые волосы до самых волн, птичий клювик, круглые глаза, тело в зелёной
    // чешуе и три хвоста-ножки; стоит на гребне волны и машет плавничками, вокруг сияние и пузырьки — её рисунок оберегает от хвори
    jp_amabie(K) {
      const sc = { c1: '#b8f5dc', c2: '#0f766e', rim: '#c8f3ff', rimK: 0.75, line: '#053b36', texK: 0.2 };
      const hair = { c1: '#fbcfe8', c2: '#be185d', rim: '#c8f3ff', rimK: 0.5, line: '#500724', texK: 0.12 };
      let s = K.aura('#38bdf8', 96, 104, 0.4) + K.aura('#fef9c3', 56, 70, 0.22);
      // волны
      s += `<path d="M0 200V166H200V200Z" fill="${K.lin(['#38bdf8', '#1e40af'])}"/>`;
      s += `<path d="${seigaiha(-6, 206, 182, 9)}" fill="none" stroke="#bfdbfe" stroke-width="1.4" opacity=".85"/>`;
      s += K.part('M0 168C14 158 26 162 34 168C42 160 56 160 64 168C72 160 86 160 94 168C102 160 116 160 124 168C132 160 146 160 154 168C162 160 176 160 184 168C190 164 196 164 200 166V174H0Z', '#7dd3fc', { line: '#0c3a66', lw: 1.6 });
      // длинные волосы сзади
      s += K.vol('M66 60C52 80 48 112 46 140C44 156 36 166 26 172C42 174 56 166 62 152C66 140 70 120 74 100H126C130 120 134 140 138 152C144 166 158 174 174 172C164 166 156 156 154 140C152 112 148 80 134 60Z', hair);
      s += K.line('M60 100C58 124 54 146 42 162M140 100C142 124 146 146 158 162', '#9d174d', 1.4, { op: 0.6 });
      // три хвоста-ножки
      const fin = 'M100 146C96 156 90 164 82 170C90 172 96 170 100 166C104 170 110 172 118 170C110 164 104 156 100 146Z';
      s += K.g(K.vol(fin, { ...sc, tex: false, lw: 2 }), 'translate(-26 0) rotate(18 100 146)') + K.g(K.vol(fin, { ...sc, tex: false, lw: 2 }), 'translate(26 0) rotate(-18 100 146)') + K.vol(fin, { ...sc, tex: false, lw: 2 });
      // чешуйчатое тело
      s += K.vol('M100 92C120 92 130 108 130 126C130 144 118 154 100 154C82 154 70 144 70 126C70 108 80 92 100 92Z', sc);
      s += K.line(scaleRow(76, 124, 116, 8) + scaleRow(72, 128, 128, 8) + scaleRow(76, 124, 140, 8), '#ccfbf1', 1.3, { op: 0.9 });
      // плавнички-ручки машут
      s += K.g(K.vol('M72 108C60 104 50 94 46 82C52 80 60 86 66 96Z', { ...sc, tex: false, lw: 2 }), '', 'art-sway');
      s += K.vol('M128 108C140 104 150 94 154 82C148 80 140 86 134 96Z', { ...sc, tex: false, lw: 2 });
      // голова
      s += K.vol('M100 36C124 36 138 52 138 72C138 90 122 102 100 102C78 102 62 90 62 72C62 52 76 36 100 36Z', { ...sc, c1: '#e6fff6', c2: '#5fb8a4', texK: 0.1 });
      s += K.part('M64 70C60 44 78 30 100 30C122 30 140 44 136 70C130 58 118 50 100 52C82 50 70 58 64 70Z', hair.c1, { line: hair.line, lw: 1.6 });
      s += K.line('M74 50Q86 44 98 48M104 46Q118 44 128 54', '#be185d', 1.4, { op: 0.7 });
      s += K.eyes(100, 72, 15, 9, { iris: '#0d9488', look: [0, 0.3] });
      s += K.part('M94 86Q100 82 106 86L100 96Z', '#fbbf24', { line: '#92400e', lw: 1.4 });
      s += K.blush(78, 86, 5) + K.blush(122, 86, 5);
      // пузырьки и сияние
      s += `<circle cx="30" cy="120" r="4" fill="none" stroke="#e0f7ff" stroke-width="1.4" class="art-float"/><circle cx="170" cy="110" r="3" fill="none" stroke="#e0f7ff" stroke-width="1.2" class="art-float" style="animation-delay:-.7s"/><circle cx="160" cy="140" r="2.2" fill="none" stroke="#e0f7ff" stroke-width="1" class="art-float" style="animation-delay:-1.2s"/>`;
      s += K.spark(30, 30, 3.2, '#fef9c3', 'art-float') + K.spark(172, 40, 2.8, '#e0f7ff') + K.spark(100, 14, 2.4, '#fef9c3');
      return s;
    },

    // ===================== РЕДКИЕ =====================

    // Кинтаро: румяный мальчик-силач с горы Асигара едет верхом на чёрном медведе с белым полумесяцем на груди — стрижка-шапочка
    // с хохолком, красный нагрудник с золотым кругом и знаком «золото», над плечом огромный топор-масакари; вокруг кружат листья
    jp_kintaro(K) {
      const skin = { c1: '#ffc4ae', c2: '#e0645a', rim: '#e4ffb0', rimK: 0.45, line: '#6b1d14', tex: false, lw: 2.2 };
      const face = { ...skin, c1: '#ffdccb', c2: '#ef8f7a' };
      const bear = { c1: '#6b5a50', c2: '#140f0c', rim: '#e4ffb0', rimK: 0.5, line: '#0a0706', texK: 0.16 };
      let s = K.aura('#84cc16', 96, 104, 0.34);
      s += `<path d="M0 124L36 80L60 104L92 64L128 106L160 78L200 118V160H0Z" fill="${K.lin(['#4d7c5a', '#1f3a2c'])}" opacity=".5"/>`;
      // топор-масакари
      s += K.line('M80 112L46 24', '#451a03', 6.4) + K.line('M80 112L46 24', '#b45309', 3.6);
      s += K.part('M44 14L56 42L40 52C28 48 20 36 22 24C26 16 34 12 44 14Z', '#e2e8f0', { line: '#1e293b', lw: 1.8 }) + `<path d="M44 14L56 42L40 52C28 48 20 36 22 24C26 16 34 12 44 14Z" fill="${K.lin(['#ffffff', '#64748b'], 0, 0, 1, 0)}" opacity=".5"/>`;
      s += K.line('M26 24C24 34 30 44 38 48', '#ffffff', 1.6, { op: 0.8 }) + K.part('M44 26L52 22L56 32L48 36Z', '#78350f', { line: '#451a03', lw: 1.2 });
      // медведь: дальние лапы, тело, ближние лапы
      const leg = x => `M${x} 150C${x - 4} 160 ${x - 4} 170 ${x} 176C${x + 2} 180 ${x + 20} 180 ${x + 22} 176C${x + 24} 170 ${x + 24} 160 ${x + 20} 150Z`;
      s += K.vol(leg(60), bear) + K.vol(leg(122), bear);
      s += K.vol('M28 136C28 112 58 100 98 100C138 100 164 110 170 130C174 150 160 162 138 164H56C38 162 28 152 28 136Z', bear);
      s += K.vol(leg(38), bear) + K.vol(leg(140), bear);
      s += K.line('M42 177l1 3M49 177v3M56 177l-1 3M144 177l1 3M151 177v3M158 177l-1 3', '#f1f5f9', 1.4);
      s += K.part('M30 126C24 122 22 116 26 112C30 116 32 120 34 124Z', '#2a201a', { line: '#0a0706', lw: 1.2 });
      s += K.part('M132 138Q150 152 170 140Q150 146 132 138Z', '#f8fafc', { line: '#64748b', lw: 1 });
      // голова медведя
      s += K.vol(K.ell(146, 84, 8.5, 8.5), bear) + K.vol(K.ell(180, 84, 8.5, 8.5), bear) + `<circle cx="146" cy="85" r="3.4" fill="#4a3a30"/><circle cx="180" cy="85" r="3.4" fill="#4a3a30"/>`;
      s += K.vol('M163 80C180 80 192 92 192 107C192 122 180 132 163 132C146 132 134 122 134 107C134 92 146 80 163 80Z', bear);
      s += K.part(K.ell(166, 116, 13, 9.5), '#b39a88', { line: '#0a0706', lw: 1.6 });
      s += `<ellipse cx="166" cy="111" rx="4.4" ry="3.2" fill="#0a0706"/><ellipse cx="165" cy="110" rx="1.4" ry=".8" fill="#fff" opacity=".6"/>`;
      s += K.eyes(163, 100, 11, 4.8, { iris: '#78350f', look: [0.3, 0.1] });
      s += K.line('M160 120Q166 125 172 120', '#0a0706', 1.6) + K.blush(150, 114, 3.6) + K.blush(180, 112, 3.6);
      // Кинтаро: нога, тельце, нагрудник
      s += K.vol('M92 116C88 126 86 136 88 144C90 150 98 150 100 144C100 136 100 126 100 118Z', skin) + K.vol(K.ell(92, 148, 7, 5), { ...skin, lw: 2 });
      s += K.vol('M100 64C116 64 126 76 126 92C126 108 118 120 100 120C82 120 74 108 74 92C74 76 84 64 100 64Z', skin);
      s += K.part('M100 68L124 94L100 122L76 94Z', '#dc2626', { line: '#7f1d1d', lw: 1.8 });
      s += `<circle cx="100" cy="95" r="10.5" fill="${K.rad([[0, '#fffbe6'], [0.6, '#fbbf24'], [1, '#b45309']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.4"/>`;
      s += K.line('M93 94L100 88L107 94M95 96.5H105M94 100H106M100 96.5V106M96.5 102.5L97.5 104.5M103.5 102.5L102.5 104.5M93 106.5H107', '#7f1d1d', 1.4);
      // руки: правая держит топор, левая — за шерсть медведя
      s += K.vol('M82 72C74 70 68 74 64 80C62 86 68 90 72 86C76 82 80 80 86 80Z', skin) + K.vol(K.ell(67, 82, 7, 6.5), { ...skin, lw: 2 });
      s += K.vol('M118 74C126 80 132 90 132 102L126 106C124 96 120 88 112 82Z', skin) + K.vol(K.ell(129, 106, 7, 6.5), { ...skin, lw: 2 });
      // голова
      s += K.vol('M100 18C124 18 140 34 140 54C140 72 124 84 100 84C76 84 60 72 60 54C60 34 76 18 100 18Z', face);
      s += K.part('M60 56C56 32 76 14 100 14C124 14 144 32 140 56C134 46 126 42 116 42H84C74 42 66 46 60 56Z', '#1c1917', { line: '#000', lw: 1.6 });
      s += K.part('M92 16C92 8 100 2 108 6C104 8 102 12 104 16Z', '#1c1917', { line: '#000', lw: 1.4 });
      s += K.line('M74 26Q86 20 98 22', '#57534e', 1.4, { op: 0.8 });
      s += K.eyes(100, 58, 13, 8, { iris: '#3b2a1a', look: [0.2, 0.2] });
      s += K.mirror(K.line('M84 46L94 47', '#1c1917', 2.6));
      s += K.mouth('grin', 100, 70, 14);
      s += K.blush(80, 68, 5.6) + K.blush(120, 68, 5.6);
      // листья
      s += K.g(K.leaf(176, 30, 14, 30, '#84cc16'), '', 'art-float') + K.g(K.leaf(12, 100, 13, -40, '#65a30d'), '', 'art-float" style="animation-delay:-1s') + K.g(K.leaf(150, 14, 11, 120, '#a3e635'), '', 'art-float" style="animation-delay:-.5s');
      s += K.spark(130, 40, 2.6, '#e4ffb0', 'art-float') + K.spark(12, 160, 2.4, '#e4ffb0');
      return s;
    },

    // Урасима Таро: молодой рыбак едет по волнам на спасённой черепахе — синяя куртка, белая повязка, за спиной бамбуковая удочка;
    // на коленях держит чёрную лаковую шкатулку-таматэбако с алым шнуром (открывать нельзя!); вокруг пена, пузырьки и рыбка-тай
    jp_urashima(K) {
      const shell = { c1: '#a3c46a', c2: '#3d5a1e', rim: '#c8f3ff', rimK: 0.6, line: '#1a2e05', tex: false };
      const tsk = { c1: '#c2e8a8', c2: '#4d7c3a', rim: '#c8f3ff', rimK: 0.6, line: '#1a3a0e', tex: false, lw: 2 };
      const coat = { c1: '#7dd3fc', c2: '#0c4a8a', rim: '#c8f3ff', rimK: 0.55, line: '#062a4f', texK: 0.2 };
      const skin = { c1: '#ffe2c4', c2: '#e3a882', rim: '#c8f3ff', rimK: 0.4, line: '#7a4a2a', tex: false, lw: 2.2 };
      let s = K.aura('#38bdf8', 96, 100, 0.36);
      // удочка
      s += K.line('M128 110L180 14', '#365314', 4.4) + K.line('M128 110L180 14', '#a3c46a', 2.2) + K.line('M180 14C186 30 188 52 184 70', '#e0f2fe', 1, { op: 0.8 });
      s += K.line('M184 70q3 5-1 7', '#94a3b8', 1.6);
      // ласты и голова черепахи
      s += K.vol('M140 148C156 146 172 150 182 158C172 166 156 166 144 160Z', tsk) + K.vol('M60 154C46 158 32 166 26 176C38 178 52 172 64 164Z', tsk);
      s += K.vol('M52 136C42 128 26 128 18 136C12 144 18 156 30 156C40 156 48 150 54 144Z', tsk);
      s += K.eye(28, 140, 5, { iris: '#1e3a1a', look: [-0.4, 0.1] }) + K.line('M18 148Q24 152 30 150', '#1a3a0e', 1.6) + K.blush(34, 148, 3.4);
      // панцирь
      s += K.vol('M38 150C38 126 64 112 100 112C136 112 162 126 162 150C162 160 140 166 100 166C60 166 38 160 38 150Z', shell);
      s += K.line('M84 116L76 134L92 148L108 148L124 134L116 116M76 134L50 136M124 134L150 136M92 148L86 164M108 148L114 164', '#1a2e05', 1.6, { op: 0.6 });
      s += K.line('M42 150Q100 166 158 150', '#fde68a', 2, { op: 0.6 });
      // Урасима: колени, тело
      s += K.vol('M66 128C74 118 126 118 134 128C132 140 68 140 66 128Z', { ...coat, c1: '#475569', c2: '#0f172a' });
      s += K.vol('M100 70C118 70 128 82 130 98L132 126H68L70 98C72 82 82 70 100 70Z', coat);
      s += K.line('M88 72L100 92L112 72', '#f8fafc', 3) + K.line('M70 112H130', '#f8fafc', 3.4) + K.line('M70 112H130', '#94a3b8', 1, { op: 0.6 });
      s += K.line('M76 86q6 4 4 10M124 86q-6 4-4 10', '#bae6fd', 1.2, { op: 0.7 });
      // руки и шкатулка-таматэбако
      s += K.mirror(K.vol('M74 84C66 92 64 104 68 116L78 118C76 106 78 96 84 90Z', coat));
      s += K.part('M80 108H120V132H80Z', '#1f2937', { line: '#020617', lw: 1.8 }) + K.part('M78 104H122V112H78Z', '#111827', { line: '#020617', lw: 1.6 });
      s += K.line('M84 120q8-6 16 0t16 0M84 126q8-4 16 0t16 0', '#fbbf24', 1.2, { op: 0.8 });
      s += K.line('M100 104V132M78 108H122', '#dc2626', 2.4) + K.part('M94 100C92 96 98 94 100 98C102 94 108 96 106 100C104 104 100 104 100 104C100 104 96 104 94 100Z', '#dc2626', { line: '#7f1d1d', lw: 1 });
      s += K.vol(K.ell(78, 120, 6, 5.6), skin) + K.vol(K.ell(122, 120, 6, 5.6), skin);
      // голова
      s += K.vol('M100 26C120 26 134 40 134 58C134 76 120 88 100 88C80 88 66 76 66 58C66 40 80 26 100 26Z', skin);
      s += K.part('M66 56C64 36 78 22 100 22C122 22 136 36 134 56C128 48 118 44 100 44C82 44 72 48 66 56Z', '#1c1917', { line: '#000', lw: 1.4 });
      s += K.part('M94 22C94 14 106 14 106 22Z', '#1c1917', { line: '#000', lw: 1.2 });
      s += K.line('M66 48Q100 38 134 48', '#475569', 6) + K.line('M66 48Q100 38 134 48', '#f8fafc', 4);
      s += K.g(K.line('M134 48C142 46 146 50 152 46M134 50C140 54 144 54 148 58', '#f8fafc', 2.6), '', 'art-sway');
      s += K.eyes(100, 60, 12, 7.6, { iris: '#3b2a1a', look: [0, 0.3] });
      s += K.mouth('smile', 100, 74, 12);
      s += K.blush(80, 70, 5) + K.blush(120, 70, 5);
      // волны и пена
      s += `<path d="M0 200V164H200V200Z" fill="${K.lin(['#38bdf8', '#1e3a8a'])}"/>`;
      s += `<path d="${seigaiha(0, 200, 182, 9)}" fill="none" stroke="#bfdbfe" stroke-width="1.4" opacity=".85"/>`;
      s += K.part('M0 166C12 158 22 162 30 168C40 160 52 160 60 168C70 160 82 162 90 168C100 160 112 160 120 168C130 160 142 162 150 168C160 160 172 160 180 168C188 162 196 162 200 164V174H0Z', '#7dd3fc', { line: '#0c3a66', lw: 1.6 });
      // рыбка-тай
      s += K.g(K.part('M26 92C34 84 48 84 54 92C48 100 34 100 26 92Z', '#f87171', { line: '#7f1d1d', lw: 1.4 }) + K.part('M26 92L18 86L20 92L18 98Z', '#ef4444', { line: '#7f1d1d', lw: 1.2 }) + `<circle cx="47" cy="90" r="1.6" fill="${INK}"/>`, '', 'art-float');
      s += `<circle cx="40" cy="60" r="3.4" fill="none" stroke="#e0f7ff" stroke-width="1.4" class="art-float"/><circle cx="160" cy="96" r="2.6" fill="none" stroke="#e0f7ff" stroke-width="1.2" class="art-float" style="animation-delay:-.8s"/>`;
      s += K.spark(30, 30, 3, '#e0f7ff', 'art-float') + K.spark(150, 40, 2.4, '#e0f7ff');
      return s;
    },

    // Иссумбоси: мальчик ростом с вершок плывёт по реке в лаковой чашке для риса — зелёное кимоно с алым поясом, хохолок на макушке;
    // поднял меч-иголку с красной ниткой, другой рукой держит весло-палочку для еды; рядом парит золотой волшебный молоточек, сыплющий искры
    jp_issunboshi(K) {
      const kim = { c1: '#86efac', c2: '#166534', rim: '#fff6b0', rimK: 0.55, line: '#052e16', texK: 0.2 };
      const skin = { c1: '#ffe2c8', c2: '#e8a882', rim: '#fff6b0', rimK: 0.45, line: '#7a4a2a', tex: false, lw: 2.2 };
      let s = K.aura('#facc15', 96, 100, 0.36);
      // река
      s += `<ellipse cx="100" cy="172" rx="94" ry="13" fill="${K.rad([[0, '#7dd3fc', 0.6], [1, '#2563eb', 0]])}"/>`;
      s += '<g class="art-aura"><ellipse cx="100" cy="172" rx="80" ry="9" fill="none" stroke="#bfeaff" stroke-width="1.6" opacity=".5"/></g>';
      // палочка-весло
      s += K.line('M156 58L126 178', '#78350f', 6.4) + K.line('M156 58L126 178', '#e8c07a', 3.8);
      // внутренность чашки
      s += `<ellipse cx="100" cy="128" rx="62" ry="10" fill="${K.lin(['#7f1d1d', '#dc2626'])}" stroke="#450a0a" stroke-width="1.6"/>`;
      // тельце
      s += K.vol('M100 80C118 80 128 92 130 108L132 132H68L70 108C72 92 82 80 100 80Z', kim);
      s += K.line('M88 82L100 100L112 82', '#f8fafc', 3.4) + K.line('M70 118H130', '#dc2626', 4) + K.line('M70 118H130', '#fca5a5', 1.2, { op: 0.7 });
      s += K.line('M76 96q6 4 4 10M124 96q-6 4-4 10', '#bbf7d0', 1.2, { op: 0.7 });
      // правая рука поднимает иголку
      s += K.vol('M74 92C64 88 58 80 56 70C56 64 62 62 66 66C68 74 72 80 80 84Z', kim) + K.vol(K.ell(60, 64, 6.4, 6), skin);
      s += K.line('M62 70L34 14', '#334155', 4.6) + K.line('M62 70L34 14', '#e2e8f0', 2.6) + `<ellipse cx="36" cy="18" rx="2.4" ry="4.4" transform="rotate(-27 36 18)" fill="none" stroke="#334155" stroke-width="1.6"/>`;
      s += K.g(K.line('M36 18C26 26 30 38 20 46C14 50 16 58 10 62', '#dc2626', 1.8), '', 'art-sway');
      s += zap(K, 40, 30, 0.8, -20, '#fde047', 0.3) + zap(K, 26, 10, 0.7, 30, '#fef08a', 1);
      // левая рука держит весло
      s += K.vol('M126 92C134 94 140 98 144 104L140 110C136 106 130 102 122 100Z', kim) + K.vol(K.ell(143, 106, 6.4, 6), skin);
      // лаковая чашка-лодка
      s += K.vol('M38 128Q100 142 162 128C160 156 136 176 100 176C64 176 40 156 38 128Z', { c1: '#4b5563', c2: '#0b0f19', rim: '#fff6b0', rimK: 0.5, line: '#020617', tex: false });
      s += K.line('M38 128Q100 142 162 128', '#dc2626', 2.4) + K.line('M56 150q8-6 16 0t16 0M112 150q8-6 16 0t16 0', '#fbbf24', 1.4, { op: 0.9 });
      s += K.part('M84 174H116L112 180H88Z', '#1f2937', { line: '#020617', lw: 1.2 });
      // голова
      s += K.vol('M100 28C120 28 134 42 134 60C134 78 120 90 100 90C80 90 66 78 66 60C66 42 80 28 100 28Z', skin);
      s += K.part('M66 58C64 38 78 24 100 24C122 24 136 38 134 58C128 50 118 46 100 46C82 46 72 50 66 58Z', '#1c1917', { line: '#000', lw: 1.4 });
      s += K.part('M94 26C92 16 100 10 108 12C104 14 102 18 104 26Z', '#1c1917', { line: '#000', lw: 1.2 }) + K.line('M95 22H105', '#dc2626', 2);
      s += K.eyes(100, 62, 12.5, 8, { iris: '#3b2a1a', look: [-0.3, -0.1] });
      s += K.mirror(K.line('M84 50L94 52', '#1c1917', 2.6));
      s += K.mouth('smile', 100, 76, 11);
      s += K.blush(80, 72, 5) + K.blush(120, 72, 5);
      // волшебный молоточек
      const mallet = K.part('M150 28H186V52H150Z', '#fbbf24', { line: '#78350f', lw: 1.8 }) + K.part('M146 30C142 34 142 46 146 50H150V30Z', '#f59e0b', { line: '#78350f', lw: 1.4 }) +
        K.part('M190 30C194 34 194 46 190 50H186V30Z', '#f59e0b', { line: '#78350f', lw: 1.4 }) + K.line('M168 52V84', '#78350f', 5) + K.line('M168 52V84', '#fbbf24', 2.6) +
        `<circle cx="168" cy="40" r="6" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.2"/>` + tomoe(168, 40, 4.6, '#fde68a', 0) + K.line('M168 84C164 90 166 94 162 98', '#dc2626', 2);
      s += K.g(K.g(mallet, 'rotate(-24 168 56)'), '', 'art-float');
      s += K.spark(146, 18, 3.4, '#fde047') + K.spark(190, 70, 3, '#fef08a', 'art-float') + K.spark(176, 96, 2.4, '#fde047') + K.spark(14, 120, 2.6, '#fef08a', 'art-float');
      return s;
    },

    // Баку: пухлый лиловый пожиратель кошмаров сидит на полосатой подушке — короткий хобот, белые бивни, кудрявая грива, тигриные
    // полосатые лапы; блаженно зажмурившись, втягивает хоботом тёмный клубок дурного сна с сердитыми глазками; вокруг звёзды и месяц
    jp_baku(K) {
      const fur = { c1: '#ddd6fe', c2: '#5b3fa8', rim: '#e9d5ff', rimK: 0.7, line: '#22104a', texK: 0.3 };
      const tig = { c1: '#fde68a', c2: '#d97706', rim: '#e9d5ff', rimK: 0.5, line: '#4a2306', tex: false, lw: 2 };
      let s = K.aura('#c084fc', 94, 104, 0.36);
      s += `<path d="M30 18A14 14 0 1 0 42 40A11 11 0 1 1 30 18Z" fill="#fef3c7" stroke="#a16207" stroke-width="1.2"/>`;
      // подушка
      s += K.vol('M28 164C28 152 60 146 100 146C140 146 172 152 172 164C172 176 140 180 100 180C60 180 28 176 28 164Z', { c1: '#e0f2fe', c2: '#64748b', rim: '#e9d5ff', rimK: 0.4, line: '#1e293b', tex: false });
      s += K.line('M40 158Q100 150 160 158M36 168Q100 160 164 168', '#6366f1', 2, { op: 0.6 });
      // задние лапы
      s += K.mirror(K.vol(K.ell(66, 160, 15, 11), tig) + tigerStripes(K, [[56, 154, -40], [64, 151, -15], [72, 152, 10]]));
      // тело
      s += K.vol('M100 90C130 90 148 110 148 136C148 158 132 168 100 168C68 168 52 158 52 136C52 110 70 90 100 90Z', fur);
      s += K.part('M100 116C116 116 126 128 126 142C126 156 114 164 100 164C86 164 74 156 74 142C74 128 84 116 100 116Z', '#f5f3ff', { line: '#a78bfa', lw: 1.4 });
      // передние лапы
      s += K.mirror(K.vol('M70 112C62 124 60 136 62 146C64 154 74 156 80 150C82 140 82 128 84 118Z', tig) + tigerStripes(K, [[62, 128, -95], [62, 138, -95]]));
      // кудрявая грива
      s += K.vol(shag(100, 70, 46, 40, 12, 0.22), { c1: '#a78bfa', c2: '#3b1d7a', rim: '#e9d5ff', rimK: 0.5, line: '#1a0b3a', texK: 0.2 });
      s += K.line(spiral(66, 50, 0.7, 1.3) + spiral(134, 50, 0.7, 1.3, 3) + spiral(60, 90, 0.6, 1.2) + spiral(140, 90, 0.6, 1.2, 3), '#ede9fe', 1.4, { op: 0.8 });
      // уши
      s += K.mirror(K.vol('M64 64C52 62 44 72 46 84C48 92 58 94 64 88Z', fur));
      // голова
      s += K.vol('M100 40C124 40 140 56 140 76C140 94 124 104 100 104C76 104 60 94 60 76C60 56 76 40 100 40Z', fur);
      s += K.gloss(80, 54, 7, 4, -35, 0.45);
      s += K.closed(100, 68, 16, 8, true);
      s += K.blush(76, 80, 5.4) + K.blush(124, 80, 5.4);
      // мордочка, бивни и хобот, что тянется к клубку
      s += K.part(K.ell(100, 88, 15, 10), '#ede9fe', { line: '#5b3fa8', lw: 1.4 });
      s += K.mirror(K.part('M88 94C82 100 82 108 86 112C87 106 90 101 94 98Z', '#ffffff', { line: '#64748b', lw: 1.2 }));
      s += K.vol(tube([[100, 92], [102, 108], [116, 114], [130, 104], [138, 86], [144, 72]], t => 15 - 7 * t, 5), fur);
      s += K.line('M96 104h9M104 112l5-7M118 112l3-8M130 102l-6-5', '#5b3fa8', 1.2, { op: 0.6 });
      s += `<ellipse cx="144" cy="71" rx="4.4" ry="3.2" transform="rotate(-30 144 71)" fill="#22104a"/>`;
      // кошмар-клубок
      const nm = shag(164, 40, 20, 16, 9, 0.28, 0.3);
      s += K.g(`<path d="${nm}" fill="${K.rad([[0, '#4c1d95'], [1, '#0f0520']], 0.4, 0.4)}" stroke="#05010d" stroke-width="2" stroke-linejoin="round"/>` +
        K.line(spiral(164, 40, 0.8, 1.6), '#7c3aed', 1.6, { op: 0.8 }) +
        K.line('M154 34L160 37M174 34L168 37', '#f87171', 2.2) + `<circle cx="158" cy="40" r="2" fill="#f87171"/><circle cx="170" cy="40" r="2" fill="#f87171"/>`, '', 'art-spin-soft');
      s += K.g(K.line('M152 56Q150 62 146 66', '#c4b5fd', 2.2, { op: 0.7 }) + `<circle cx="151" cy="60" r="2" fill="#7c3aed"/>`, '', 'art-blink');
      s += K.spark(20, 80, 3, '#e9d5ff', 'art-float') + K.spark(184, 90, 2.6, '#f5f3ff') + K.spark(60, 14, 2.4, '#fef3c7') + K.spark(180, 140, 2.4, '#e9d5ff', 'art-float');
      return s;
    },

    // Камаитати: ласка-вихрь — гибкая рыже-кремовая ласка стоит на закрученном смерче, вместо передних лап у неё блестящие серпы;
    // хитро прищурилась и вот-вот налетит. В вихре кружат листья, а снизу выглядывает вторая ласка с горшочком целебной мази
    jp_kamaitachi(K) {
      const fur = { c1: '#f6d3a4', c2: '#8a4e14', rim: '#eef0ff', rimK: 0.65, line: '#3a1f06', texK: 0.2 };
      let s = K.aura('#a5b4fc', 94, 104, 0.36);
      // смерч
      const funnel = 'M30 118C66 108 134 108 170 118C164 128 146 134 130 136C138 142 134 152 120 156C124 164 114 172 100 178C88 172 80 164 86 156C70 152 64 142 72 136C54 134 36 128 30 118Z';
      s += K.part(funnel, '#e0e7ff', { line: '#6366f1', lw: 1.8, op: 0.9 });
      s += K.g(K.line('M44 120Q100 132 156 120M70 138Q100 146 130 138M88 156Q100 162 114 156', '#818cf8', 1.8, { op: 0.8 }), '', 'art-float');
      s += K.g(K.line(spiral(24, 70, 1.3, 2) + spiral(176, 60, 1.2, 1.9), '#e0e7ff', 2), '', 'art-spin');
      // хвост
      s += K.vol(tube([[118, 118], [146, 110], [164, 88], [160, 64], [174, 48]], t => 18 - 8 * t, 5), fur);
      s += K.part('M168 54C170 48 176 44 180 46C180 52 176 56 170 58Z', '#3a1f06', { lw: 0 });
      // задние лапки на вихре
      s += K.mirror(K.vol(K.ell(86, 118, 10, 6), { ...fur, tex: false, lw: 2 }));
      // тело
      s += K.vol('M100 64C118 64 130 80 130 98C130 112 120 122 100 122C80 122 70 112 70 98C70 80 82 64 100 64Z', fur);
      s += K.part('M100 76C110 76 116 88 116 100C116 112 108 118 100 118C92 118 84 112 84 100C84 88 90 76 100 76Z', '#fff7ed', { line: '#d6a77a', lw: 1.2 });
      // лапы-серпы
      const sickle = 'M60 58C44 46 40 24 52 10C50 26 56 42 70 52Z';
      s += K.mirror(K.vol('M78 84C70 80 64 72 62 62L70 58C72 66 76 72 84 76Z', fur) + K.part(sickle, '#e2e8f0', { line: '#1e293b', lw: 1.8 }) +
        `<path d="${sickle}" fill="${K.lin(['#ffffff', '#64748b'], 0, 0, 1, 0)}" opacity=".5"/>` + K.line('M54 16C50 30 54 42 64 50', '#ffffff', 1.4, { op: 0.9 }) +
        K.part('M60 54L68 50L72 58L64 62Z', '#78350f', { line: '#451a03', lw: 1.2 }));
      // голова
      s += K.mirror(K.vol(K.ell(80, 32, 7, 7), fur) + `<ellipse cx="80" cy="33" rx="3.4" ry="3.4" fill="#f5c6a5"/>`);
      s += K.vol('M100 24C118 24 130 36 130 50C130 64 118 74 100 74C82 74 70 64 70 50C70 36 82 24 100 24Z', fur);
      s += K.part('M100 50C112 50 120 58 122 66C116 72 108 74 100 74C92 74 84 72 78 66C80 58 88 50 100 50Z', '#fff7ed', { flat: true, lw: 0 });
      s += K.mirror(K.part('M72 46C78 40 88 40 94 46C90 54 80 54 72 50Z', '#6b3a0e', { lw: 0, op: 0.55 }));
      s += K.eyes(100, 48, 12, 7, { iris: '#7c2d12', lid: 'angry', skin: '#c88b4e', look: [0.3, 0.2] });
      s += `<ellipse cx="100" cy="60" rx="3.6" ry="2.6" fill="#3a1f06"/>`;
      s += K.mouth('cat', 100, 64, 10) + `<path d="M102 64.6l1.6 3.4l1.4-3.6Z" fill="#fff"/>`;
      s += K.mirror(K.line('M86 60L72 58M86 64L74 66', '#3a1f06', 1.2, { op: 0.6 }));
      // вторая ласка с горшочком мази
      s += K.g(K.vol(K.ell(146, 150, 11, 10), { ...fur, tex: false, lw: 1.8 }) + K.eyes(146, 149, 4.4, 2.6, { iris: '#7c2d12', look: [-0.3, 0.2] }) + `<ellipse cx="146" cy="154" rx="1.6" ry="1.2" fill="#3a1f06"/>` +
        K.part('M128 152C126 160 130 166 138 166C146 166 148 160 146 152Z', '#c2410c', { line: '#431407', lw: 1.4 }) + K.part('M126 150H148V154H126Z', '#7c2d12', { line: '#431407', lw: 1 }) + K.leaf(134, 150, 10, -60, '#65a30d'), '', 'art-float');
      // листья в вихре
      s += K.g(K.leaf(40, 100, 12, -30, '#84cc16'), '', 'art-spin-soft') + K.g(K.leaf(166, 104, 11, 200, '#f59e0b'), '', 'art-spin-soft') + K.g(K.leaf(30, 150, 10, 40, '#65a30d'), '', 'art-float');
      s += K.spark(140, 16, 3, '#eef0ff', 'art-float') + K.spark(20, 30, 2.6, '#e0e7ff');
      return s;
    },

    // Рокурокуби: девушка в лиловом кимоно с узором-асанохой спит, сидя у фонаря-андона, а её шея вытянулась длинной петлёй — голова
    // с причёской и шпилькой-кандзаси парит под потолком и с любопытством заглядывает к нам; в круглом окне — месяц и звёзды
    jp_rokurokubi(K) {
      const kim = { c1: '#c4b5fd', c2: '#4c1d95', rim: '#e9d5ff', rimK: 0.6, line: '#1e0b3a', texK: 0.3 };
      const skin = { c1: '#fff4f0', c2: '#e3b4b0', rim: '#e9d5ff', rimK: 0.5, line: '#6b3a3a', tex: false, lw: 2.2 };
      let s = K.aura('#c084fc', 94, 104, 0.34);
      // круглое окно с месяцем
      s += `<circle cx="46" cy="52" r="32" fill="${K.lin(['#312e81', '#1e1b4b'])}" stroke="#3b2a1a" stroke-width="5"/>`;
      s += `<path d="M38 36A13 13 0 1 0 50 58A10 10 0 1 1 38 36Z" fill="#fef3c7"/>` + K.line('M46 20V84M14 52H78', '#3b2a1a', 2.4, { op: 0.9 });
      s += K.spark(62, 38, 2.4, '#fff') + K.spark(30, 70, 2, '#fff');
      // фонарь-андон
      s += `<circle class="art-aura" cx="28" cy="140" r="26" fill="${K.rad([[0, '#fde68a', 0.6], [1, '#f59e0b', 0]])}"/>`;
      s += K.part('M16 118H40V160H16Z', '#fef3c7', { line: '#78350f', lw: 1.8 }) + `<rect x="16" y="118" width="24" height="42" fill="${K.rad([[0, '#fff7c2', 0.9], [1, '#fbbf24', 0.2]])}"/>`;
      s += K.line('M16 132H40M16 146H40', '#92400e', 1.2, { op: 0.7 }) + K.line('M14 118H42M14 160H42M16 160L14 178M40 160L42 178', '#451a03', 2.6);
      // тело сидит
      s += K.vol('M100 110C122 110 134 124 136 142L146 178H54L64 142C66 124 78 110 100 110Z', kim);
      s += K.line('M74 150l8 8l8-8l8 8l8-8l8 8l8-8M78 166l8 8l8-8l8 8l8-8l8 8', '#ede9fe', 1.2, { op: 0.6 });
      s += K.part('M66 138Q100 146 134 138L135 148Q100 156 65 148Z', '#f472b6', { line: '#831843', lw: 1.6 });
      s += K.mirror(K.vol('M74 118C62 124 58 138 60 152C66 160 78 160 86 154C84 142 86 130 92 122Z', kim));
      s += K.part(K.ell(92, 156, 6, 5), skin.c1, { line: skin.line, lw: 1.3 }) + K.part(K.ell(108, 156, 6, 5), skin.c1, { line: skin.line, lw: 1.3 });
      s += K.line('M90 112L100 124L110 112', '#fdf2f8', 3.4);
      // длинная шея петлёй
      s += K.vol(tube([[100, 120], [99, 98], [112, 82], [148, 86], [166, 66], [154, 44], [134, 48]], 11, 6), skin);
      // голова
      s += K.part('M106 46C102 26 114 14 128 14C142 14 154 26 150 46C146 40 140 36 128 36C116 36 110 40 106 46Z', '#1f1a24', { line: '#0b0a10', lw: 1.4 });
      s += K.vol(K.ell(128, 42, 12, 9), { c1: '#3a3344', c2: '#0b0a10', line: '#0b0a10', lw: 1.6, tex: false });
      s += K.line('M118 30L146 22', '#fbbf24', 2.4) + `<circle cx="146" cy="22" r="3" fill="#f472b6" stroke="#831843" stroke-width="1"/>` + K.g(K.line('M146 25V34', '#fbbf24', 1) + `<circle cx="146" cy="36" r="1.8" fill="#f9a8d4"/>`, '', 'art-sway');
      s += K.vol('M128 36C142 36 150 46 150 58C150 70 140 78 128 78C116 78 106 70 106 58C106 46 114 36 128 36Z', skin);
      s += K.part('M106 56C104 42 114 34 128 34C142 34 152 42 150 56C144 48 138 44 128 44C118 44 112 48 106 56Z', '#1f1a24', { line: '#0b0a10', lw: 1.2 });
      s += K.eyes(128, 60, 9, 6, { iris: '#7c3aed', lash: true, look: [-0.5, 0.4] });
      s += K.mouth('smile', 128, 70, 8);
      s += K.blush(114, 68, 4) + K.blush(142, 68, 4);
      s += K.spark(184, 110, 2.8, '#e9d5ff', 'art-float') + K.spark(176, 18, 2.4, '#f5f3ff') + K.spark(14, 96, 2.2, '#e9d5ff');
      return s;
    },

    // Ванюдо: пылающее колесо от повозки — по ободу пляшут языки пламени, спицы вращаются, а в ступице суровое лицо старика с
    // густыми бровями, усами и бородой; катится по ночной улице Киото, рассыпая искры
    jp_wanyudo(K) {
      const wood = { c1: '#d08a4a', c2: '#5a2a0c', rim: '#ffe29a', rimK: 0.6, line: '#2a1206', texK: 0.25 };
      const face = { c1: '#ffd6b0', c2: '#d9774a', rim: '#ffe29a', rimK: 0.5, line: '#5a1f08', tex: false, lw: 2.4 };
      let s = K.aura('#ff7a3d', 100, 104, 0.44);
      // дорога и искры
      s += K.line('M10 178H190', '#78350f', 2.4, { op: 0.5 }) + K.line('M20 174l10-2M150 174l14-2M40 170l8-1', '#f97316', 2, { op: 0.6 });
      // языки пламени по ободу
      for (let i = 0; i < 11; i++) {
        const a = (200 + i * 14) * Math.PI / 180, x = r1(100 + 66 * Math.cos(a)), y = r1(106 + 66 * Math.sin(a)), h = 30 + (i % 3) * 8;
        s += K.g(K.flame(x, y + 8, h, h * 0.7, '#fff3b0', i % 2 ? '#f97316' : '#ef4444', { style: `animation-delay:-${(i * 0.17).toFixed(2)}s` }), `rotate(${r1((a * 180 / Math.PI + 90) * 0.55)} ${x} ${y})`);
      }
      // колесо: обод и спицы вращаются
      let w = K.vol('M34 106A66 66 0 1 0 166 106A66 66 0 1 0 34 106ZM48 106A52 52 0 1 1 152 106A52 52 0 1 1 48 106Z', wood);
      for (let i = 0; i < 8; i++) w += K.g(K.part('M96 52H104V76H96Z', '#a0571e', { line: '#2a1206', lw: 1.6 }), `rotate(${i * 45} 100 106)`);
      for (let i = 0; i < 16; i++) { const a = i * 22.5 * Math.PI / 180; w += `<circle cx="${r1(100 + 59 * Math.cos(a))}" cy="${r1(106 + 59 * Math.sin(a))}" r="1.8" fill="#fbbf24" stroke="#2a1206" stroke-width=".8"/>`; }
      s += K.g(w, '', 'art-spin');
      // ступица-лицо
      s += K.vol(K.ell(100, 106, 32, 32), face);
      s += K.mirror(K.part('M70 92C76 82 88 82 96 90L94 96C88 92 80 92 74 98Z', '#f1f5f9', { line: '#475569', lw: 1.4 }));
      s += K.eyes(100, 102, 12, 7.4, { iris: '#b91c1c', lid: 'angry', skin: '#f3b088', look: [0, 0.2] });
      s += `<ellipse cx="100" cy="112" rx="4.4" ry="3.2" fill="#c2410c"/>`;
      s += K.part('M76 120C80 134 90 142 100 144C110 142 120 134 124 120C116 126 108 126 100 124C92 126 84 126 76 120Z', '#e2e8f0', { line: '#475569', lw: 1.4 });
      s += K.part('M82 118C88 114 96 114 100 118C104 114 112 114 118 118C112 122 104 122 100 120C96 122 88 122 82 118Z', '#f8fafc', { line: '#475569', lw: 1.2 });
      s += K.mouth('teeth', 100, 124, 14);
      s += K.spark(20, 120, 3, '#ffe29a', 'art-float') + K.spark(184, 130, 2.6, '#fff3b0', 'art-float') + K.spark(30, 30, 2.4, '#ffd23f') + K.spark(170, 26, 2.4, '#ffe29a');
      return s;
    },

    // Нурарихён: хитрый старичок с огромной головой-тыковкой, белые кустистые брови и бородка; в дорогом лиловом хаори с золотыми
    // гербами сидит на красной подушке-дзабутоне и с довольным видом прихлёбывает чай из чашки-юноми, над чашкой вьётся пар
    jp_nurarihyon(K) {
      const robe = { c1: '#a78bfa', c2: '#2e1065', rim: '#e9d5ff', rimK: 0.6, line: '#14052e', texK: 0.25 };
      const skin = { c1: '#fde7d4', c2: '#d4a184', rim: '#e9d5ff', rimK: 0.5, line: '#6b4430', tex: false, lw: 2.2 };
      let s = K.aura('#c084fc', 94, 100, 0.34);
      s += `<path d="M168 16A13 13 0 1 0 180 38A10 10 0 1 1 168 16Z" fill="#fef3c7" stroke="#a16207" stroke-width="1.2"/>`;
      // подушка-дзабутон
      s += K.vol('M30 168C30 156 62 150 100 150C138 150 170 156 170 168C170 178 138 182 100 182C62 182 30 178 30 168Z', { c1: '#fca5a5', c2: '#991b1b', rim: '#e9d5ff', rimK: 0.4, line: '#450a0a', tex: false });
      s += K.mirror(K.part('M34 160L26 154L30 164Z', '#fbbf24', { line: '#78350f', lw: 1 }));
      // тело в хаори
      s += K.vol('M100 98C128 98 146 116 150 140L156 170H44L50 140C54 116 72 98 100 98Z', robe);
      s += K.part('M88 100L100 140L112 100Z', '#475569', { line: '#14052e', lw: 1.4 }) + K.line('M90 100L100 128L110 100', '#e2e8f0', 2.4);
      const mon = (x, y) => `<circle cx="${x}" cy="${y}" r="6.4" fill="#fde68a" stroke="#78350f" stroke-width="1.2"/>` + tomoe(x, y, 4.6, '#78350f', 10);
      s += mon(68, 126) + mon(132, 126);
      s += K.line('M60 150Q100 160 140 150', '#fbbf24', 1.6, { op: 0.7 });
      // руки с чашкой
      s += K.mirror(K.vol('M70 106C58 114 54 128 56 142C62 150 76 150 84 144C84 132 86 120 92 114Z', robe));
      s += K.part('M86 118H114L111 140C110 144 90 144 89 140Z', '#a8a29e', { line: '#44403c', lw: 1.6 }) + `<ellipse cx="100" cy="118" rx="14" ry="3.4" fill="#84cc16" stroke="#44403c" stroke-width="1.4"/>`;
      s += K.line('M89 128H111', '#57534e', 1.2, { op: 0.6 });
      s += K.part(K.ell(86, 134, 6, 5.4), skin.c1, { line: skin.line, lw: 1.3 }) + K.part(K.ell(114, 134, 6, 5.4), skin.c1, { line: skin.line, lw: 1.3 });
      s += K.g(K.line('M94 112C90 104 98 100 94 92M104 112C100 104 108 100 104 92', '#f5f3ff', 2, { op: 0.75 }), '', 'art-float');
      // голова-тыковка
      s += K.vol('M100 6C126 6 142 22 140 42C139 52 132 58 132 66C132 74 138 80 136 90C132 102 118 108 100 108C82 108 68 102 64 90C62 80 68 74 68 66C68 58 61 52 60 42C58 22 74 6 100 6Z', skin);
      s += K.gloss(80, 20, 9, 5, -35, 0.5);
      s += K.line('M84 40Q100 34 116 40M88 48Q100 44 112 48', '#b88468', 1.4, { op: 0.7 });
      s += K.mirror(K.part('M74 70C80 62 90 62 96 68C90 70 82 70 76 74Z', '#ffffff', { line: '#94a3b8', lw: 1.2 }));
      s += K.eyes(100, 78, 12, 6.6, { iris: '#7c3aed', lid: 'half', skin: '#f3d6c2', look: [0.3, 0.2] });
      s += K.mouth('smile', 100, 92, 12);
      s += K.part('M94 96C94 104 98 110 100 112C102 110 106 104 106 96C102 98 98 98 94 96Z', '#ffffff', { line: '#94a3b8', lw: 1.2 });
      s += K.blush(80, 88, 4.6) + K.blush(120, 88, 4.6);
      s += K.spark(24, 40, 2.8, '#e9d5ff', 'art-float') + K.spark(180, 110, 2.4, '#f5f3ff') + K.spark(18, 120, 2.4, '#e9d5ff');
      return s;
    },

    // ===================== ЭПИЧЕСКИЕ =====================

    // Инари: ками риса и достатка стоит в тоннеле алых тории — белое одеяние с широкими рукавами и алыми шнурами, красные хакама,
    // золотой венец; на плече большой сноп спелого риса, на ладони сияет жемчужина-хосю. У ног сидят две белые лисы-вестницы
    // в красных нагрудниках: одна держит в зубах ключ, другая — свиток
    jp_inari(K) {
      const robe = { c1: '#ffffff', c2: '#e2d6bf', rim: '#e4ffb0', rimK: 0.5, line: '#5c3a1a', texK: 0.16 };
      const red = { c1: '#fb7185', c2: '#a3121c', rim: '#e4ffb0', rimK: 0.5, line: '#4a0707', texK: 0.2 };
      const skin = { c1: '#fff1e6', c2: '#e8b89a', rim: '#e4ffb0', rimK: 0.4, line: '#7a4a2a', tex: false, lw: 2.2 };
      const fx = { c1: '#ffffff', c2: '#e9bf98', rim: '#e4ffb0', rimK: 0.5, line: '#5c210a', tex: false, lw: 2 };
      let s = K.aura('#84cc16', 100, 100, 0.4) + K.aura('#fbbf24', 70, 76, 0.22);
      // тоннель тории
      s += torii(K, 100, 44, 120, 112, 0.7) + torii(K, 100, 14, 186, 164, 1);
      // белые лисы у ног
      let fox = K.part('M22 168C10 162 6 148 12 136C16 146 20 152 26 156Z', '#ffffff', { line: '#5c210a', lw: 1.6 }) + tipFill(K, 'M22 168C10 162 6 148 12 136C16 146 20 152 26 156Z', 'M0 120H40V142Q30 146 20 140T0 144Z', '#fb923c');
      fox += K.vol('M34 140C46 140 52 152 52 164C52 174 46 178 34 178C22 178 16 174 16 164C16 152 22 140 34 140Z', fx);
      fox += K.vol('M22 120L20 102L32 114Z', fx) + K.vol('M46 120L48 102L36 114Z', fx);
      fox += K.vol('M34 110C44 110 50 118 50 128C50 136 42 142 34 144C26 142 18 136 18 128C18 118 24 110 34 110Z', fx);
      fox += K.part('M24 140Q34 146 44 140L41 150Q34 154 27 150Z', '#dc2626', { line: '#7f1d1d', lw: 1.2 });
      fox += K.line('M25 126l5 2M43 126l-5 2', INK, 2) + `<circle cx="34" cy="135" r="1.8" fill="#3b1d0e"/>` + K.line('M27 122l3-3M41 122l-3-3', '#dc2626', 1.4);
      s += K.mirror(fox);
      s += K.line('M24 138H46', '#fbbf24', 2.4) + `<circle cx="22" cy="138" r="3" fill="none" stroke="#fbbf24" stroke-width="1.6"/>`;
      s += K.part('M154 134H178V142H154Z', '#fef3c7', { line: '#78350f', lw: 1.2 }) + K.line('M156 136h20M156 140h16', '#78350f', 0.8, { op: 0.6 });
      // красные хакама и белое одеяние
      s += K.vol('M68 128H132L144 178H56Z', red) + K.line('M84 132L78 178M100 132V178M116 132L122 178', '#7f1d1d', 1.4, { op: 0.5 });
      s += K.vol('M100 80C118 80 128 90 132 104L136 134H64L68 104C72 90 82 80 100 80Z', robe);
      s += K.line('M88 82L100 104L112 82', '#dc2626', 3) + K.line('M66 132H134', '#fbbf24', 4) + K.rhomb(100, 132, 4, '#dc2626', '#78350f');
      // широкие рукава с алыми шнурами
      s += K.mirror(K.vol('M74 88C56 96 46 116 46 142C52 152 66 154 76 148C76 130 80 112 88 102Z', robe) + K.stitch('M48 144C56 152 66 152 74 148', '#dc2626', 1.8));
      // сноп риса на плече
      let sheaf = '';
      for (const dx of [-6, -2, 2, 6, 10]) sheaf += K.line(`M${124 + dx} 132L${154 + dx} 52`, '#a16207', 2.2);
      sheaf += K.line('M126 106L144 112', '#dc2626', 4.4);
      sheaf += riceEar(148, 54, 30, -20) + riceEar(152, 52, 34, 30) + riceEar(158, 52, 32, 70) + riceEar(163, 56, 28, 110) + riceEar(144, 58, 26, -60);
      s += K.g(sheaf, '', 'art-sway" style="transform-origin:0% 100%');
      s += K.vol(K.ell(130, 122, 7, 6.5), skin);
      // жемчужина на ладони
      s += hoju(K, 62, 108, 9) + K.vol(K.ell(64, 124, 7.5, 6.5), skin);
      // волосы, лицо, венец
      s += K.part('M76 50C68 74 66 100 72 120C80 114 86 104 88 94H112C114 104 120 114 128 120C134 100 132 74 124 50Z', '#1f1a24', { line: '#0b0a10', lw: 1.6 });
      s += K.vol(K.ell(100, 62, 17.5, 19.5), skin);
      s += K.part('M82.5 62C80 44 90 38 100 38C110 38 120 44 117.5 62C114 52 108 48 100 48C92 48 86 52 82.5 62Z', '#1f1a24', { line: '#0b0a10', lw: 1.4 });
      s += K.part('M80 44L86 30L94 38L100 24L106 38L114 30L120 44Q100 38 80 44Z', '#fbbf24', { line: '#78350f', lw: 1.6 });
      s += `<circle cx="100" cy="34" r="3.6" fill="#dc2626" stroke="#7f1d1d" stroke-width="1"/>` + riceEar(86, 40, 12, -30, '#fde68a') + riceEar(114, 40, 12, 30, '#fde68a');
      s += K.eyes(100, 64, 7.5, 4.8, { iris: '#b45309', lid: 'half', skin: '#fff1e6', lash: true, look: [0, 0.3] });
      s += `<circle cx="100" cy="52" r="1.8" fill="#dc2626"/>`;
      s += K.blush(88, 72, 3.6) + K.blush(112, 72, 3.6);
      s += `<path d="M96.5 76Q100 79 103.5 76Q100 75 96.5 76Z" fill="#e11d48" stroke="#9f1239" stroke-width="1"/>`;
      s += K.spark(20, 100, 2.8, '#e4ffb0', 'art-float') + K.spark(180, 100, 2.6, '#fde68a') + K.spark(66, 6, 2.4, '#fde68a', 'art-float');
      return s;
    },

    // Хатиман: бог лучников и защитник воинов в старинном индиговом доспехе с алой шнуровкой и большими наплечниками, шлем с золотыми
    // рогами-кувагата, на груди золотой герб-томоэ; левой рукой держит высокий лук-юми, на поднятой правой сидит белый голубь-вестник,
    // второй голубь летит рядом; вокруг вихри и пёрышки
    jp_hachiman(K) {
      const arm = { c1: '#818cf8', c2: '#1e1b4b', rim: '#eef0ff', rimK: 0.65, line: '#0b0a26', texK: 0.2 };
      const skin = { c1: '#ffe2c8', c2: '#e3a882', rim: '#eef0ff', rimK: 0.4, line: '#7a4a2a', tex: false, lw: 2.2 };
      let s = K.aura('#a5b4fc', 100, 100, 0.42) + K.aura('#ffffff', 60, 60, 0.18);
      s += K.g(K.line(spiral(178, 124, 1.3, 2), '#e0e7ff', 2), '', 'art-spin') + K.line('M150 176q16-10 32 0M58 8q14-8 28 0', '#e0e7ff', 2.2, { op: 0.6, cls: 'art-float' });
      const feather = (x, y, r, d) => `<g class="art-float" style="animation-delay:-${d}s"><path transform="translate(${x} ${y}) rotate(${r})" d="M0 0C-4-6-4-14 0-20C4-14 4-6 0 0ZM0 0V4" fill="#ffffff" stroke="#64748b" stroke-width="1"/></g>`;
      s += feather(184, 80, 30, 0.3) + feather(70, 14, -40, 1.1) + feather(178, 150, 70, 0.7);
      // лук-юми
      const bow = 'M42 10C14 56 14 128 36 180';
      s += K.line('M42 10L36 180', '#e5e7eb', 1.2, { op: 0.9 }) + K.line(bow, '#020617', 6.4) + K.line(bow, '#7f1d1d', 3.4);
      s += K.line('M33 34l4 2M23 70l4 1M20 100h4M22 140l4-1M28 164l4-2', '#f5f5f4', 3);
      // ноги в поножах
      s += K.mirror(K.vol('M78 150C76 158 76 166 76 172H94C96 166 96 158 96 152Z', arm) + K.part('M70 170H96L98 178H68Z', '#3f2a14', { line: '#1c120a', lw: 1.4 }));
      // юбка из пластин
      s += K.vol('M62 124H138L148 156H52Z', arm);
      s += K.line('M60 132H140M57 140H143M55 148H145', '#dc2626', 2) + K.line('M82 124L78 156M100 124V156M118 124L122 156', '#0b0a26', 1.4, { op: 0.6 });
      // корпус и герб
      s += K.vol('M100 76C120 76 132 86 134 102L136 128H64L66 102C68 86 80 76 100 76Z', arm);
      s += K.line('M68 104H132M67 114H133M66 124H134', '#dc2626', 2) + K.line('M68 109H132M67 119H133', '#f8fafc', 1.2, { op: 0.6 });
      s += `<circle cx="100" cy="94" r="10" fill="${K.rad([[0, '#fffbe6'], [0.6, '#fbbf24'], [1, '#b45309']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.4"/>` + tomoe(100, 94, 7.4, '#78350f', 15);
      // наплечники о-содэ
      s += K.mirror(K.vol('M72 80L44 88L48 128L74 122Z', arm) + K.line('M46 98L72 92M47 108L73 102M48 118L74 112', '#dc2626', 2) + K.line('M44 88L72 80', '#fbbf24', 2.4));
      // левая рука держит лук
      s += K.vol('M52 104C44 108 36 112 30 116C26 120 30 126 34 124C40 122 48 118 56 114Z', arm) + K.vol(K.ell(31, 120, 7, 7), skin);
      // правая рука поднята, на ней голубь
      s += K.vol('M140 94C148 86 154 76 156 66C158 60 164 60 166 66C164 78 156 92 146 102Z', arm) + K.vol(K.ell(160, 64, 7, 6.5), skin);
      s += dove(K, 162, 46, 1.05, false, '');
      s += dove(K, 168, 18, 0.85, true, 'art-float', 0.5);
      // голова и шлем
      s += K.mirror(K.vol('M76 46L60 66L70 72L80 56Z', arm));
      s += K.vol(K.ell(100, 58, 17, 18), skin);
      s += K.vol('M74 50C74 28 86 18 100 18C114 18 126 28 126 50Z', arm);
      s += K.line('M76 46H124', '#fbbf24', 3);
      s += K.mirror(K.part('M92 30C84 22 78 12 80 2C86 10 92 18 98 26Z', '#fbbf24', { line: '#78350f', lw: 1.4 }));
      s += `<circle cx="100" cy="32" r="5" fill="${K.rad([[0, '#fffbe6'], [1, '#d97706']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.2"/>`;
      s += K.eyes(100, 60, 7.6, 5, { iris: '#1e3a8a', lid: 'angry', skin: '#ffe2c8', look: [0.3, 0] });
      s += K.part('M90 70C94 68 98 69 100 71C102 69 106 68 110 70C106 72 102 73 100 72C98 73 94 72 90 70Z', '#1f1a24', { lw: 0 });
      s += K.line('M96 76H104', '#c08060', 1.6);
      s += K.spark(130, 10, 2.8, '#eef0ff', 'art-float') + K.spark(14, 30, 2.4, '#e0e7ff');
      return s;
    },

    // Эбису: весёлый толстячок-бог рыбаков сидит на прибрежном камне — высокая чёрная шапка-эбоси, бирюзовое одеяние с белыми
    // гербами-волнами, большие счастливые мочки ушей, смеётся во весь рот; на плече удочка, под рукой огромная красная рыба-тай,
    // вокруг волны и золотые монетки-кобан
    jp_ebisu(K) {
      const robe = { c1: '#5eead4', c2: '#0e5a66', rim: '#c8f3ff', rimK: 0.6, line: '#04262c', texK: 0.2 };
      const skin = { c1: '#ffe9d2', c2: '#e8b088', rim: '#c8f3ff', rimK: 0.4, line: '#7a4a2a', tex: false, lw: 2.2 };
      const fish = { c1: '#ffa08f', c2: '#c2121c', rim: '#fff3b0', rimK: 0.6, line: '#5a0a10', texK: 0.15 };
      let s = K.aura('#38bdf8', 100, 100, 0.42) + K.aura('#fde68a', 64, 76, 0.2);
      // удочка
      s += K.line('M134 104L186 12', '#365314', 4.4) + K.line('M134 104L186 12', '#d6b45a', 2.2) + K.line('M186 12C192 50 192 100 188 138', '#e0f2fe', 1, { op: 0.8 });
      // волны и камень
      s += `<path d="M0 200V166H200V200Z" fill="${K.lin(['#38bdf8', '#1e3a8a'])}"/>` + `<path d="${seigaiha(0, 200, 184, 9)}" fill="none" stroke="#bfdbfe" stroke-width="1.4" opacity=".85"/>`;
      s += K.vol('M30 178C28 160 44 150 70 148H130C156 150 172 160 170 178Z', { c1: '#a8a29e', c2: '#44403c', rim: '#c8f3ff', rimK: 0.4, line: '#1c1917', tex: false });
      s += K.part('M0 170C14 162 26 166 34 170M166 170C174 164 188 162 200 168', '#7dd3fc', { line: '#0c3a66', lw: 1.4 });
      // ноги-хакама и круглое тело
      s += K.vol('M52 150C52 136 74 128 100 128C126 128 148 136 148 150C148 162 128 168 100 168C72 168 52 162 52 150Z', { ...robe, c1: '#a5b4fc', c2: '#312e81', line: '#14123a' });
      s += K.vol('M100 76C130 76 148 98 148 124C148 142 130 150 100 150C70 150 52 142 52 124C52 98 70 76 100 76Z', robe);
      const mon = (x, y) => `<circle cx="${x}" cy="${y}" r="6.4" fill="#f0fdfa" stroke="#04262c" stroke-width="1.2"/><path d="M${x - 4} ${y + 1}q2-3 4 0t4 0" fill="none" stroke="#0e7490" stroke-width="1.4"/>`;
      s += mon(128, 128) + mon(72, 140);
      s += K.line('M86 80L100 100L114 80', '#f8fafc', 3.4);
      // правая рука с удочкой
      s += K.vol('M136 92C146 98 150 108 146 116C140 120 132 116 130 110Z', robe) + K.vol(K.ell(138, 106, 7.5, 7), skin);
      // рыба-тай под левой рукой
      const tai = 'M22 114C28 96 56 90 76 100C86 104 94 110 98 114C94 118 86 124 76 128C56 138 28 132 22 114Z';
      s += K.part('M38 100L44 86L50 98L56 84L62 96L68 86L72 100Z', '#ef4444', { line: '#5a0a10', lw: 1.4 });
      s += K.part('M96 114L114 98L110 114L114 130Z', '#ef4444', { line: '#5a0a10', lw: 1.6 });
      s += K.vol(tai, fish);
      s += K.line(scaleRow(50, 86, 108, 6) + scaleRow(46, 84, 118, 6), '#fde68a', 1.1, { op: 0.8 });
      s += K.line('M40 100Q46 114 40 128', '#5a0a10', 1.4, { op: 0.6 }) + `<circle cx="32" cy="110" r="3.4" fill="#fff" stroke="#5a0a10" stroke-width="1"/><circle cx="32.6" cy="110" r="1.8" fill="${INK}"/>`;
      s += K.line('M22 116h6', '#5a0a10', 1.4) + K.part('M60 124L66 132L72 124Z', '#ef4444', { line: '#5a0a10', lw: 1.2 });
      s += K.vol('M66 88C56 92 52 100 54 108L68 112C66 104 70 96 76 92Z', robe) + K.vol(K.ell(64, 106, 7.5, 7), skin);
      // голова
      s += K.mirror(K.vol(K.ell(66, 56, 6, 10), skin));
      s += K.vol('M100 24C124 24 136 40 136 58C136 78 122 90 100 90C78 90 64 78 64 58C64 40 76 24 100 24Z', skin);
      s += K.part('M78 34C74 16 86 2 100 0C114 0 124 10 122 22C128 24 130 30 122 36Q100 30 78 34Z', '#1f2937', { line: '#020617', lw: 1.6 }) + K.line('M100 2C98 14 104 24 112 30', '#475569', 1.2, { op: 0.8 });
      s += K.line('M78 36Q100 30 122 36', '#475569', 3);
      s += K.mirror(K.line('M76 44Q84 38 92 44', '#1f1a24', 2.6));
      s += K.closed(100, 54, 12, 6, true);
      s += K.mouth('grin', 100, 66, 22);
      s += K.part('M96 78C96 84 98 86 100 88C102 86 104 84 104 78Z', '#1f1a24', { lw: 0 });
      s += K.blush(76, 66, 6) + K.blush(124, 66, 6);
      // монетки-кобан
      const koban = (x, y, d) => `<g class="art-float" style="animation-delay:-${d}s"><ellipse cx="${x}" cy="${y}" rx="5" ry="7.4" fill="${K.rad([[0, '#fff7c2'], [0.55, '#fbbf24'], [1, '#b45309']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.2"/><path d="M${x - 3} ${y - 3}h6M${x - 3} ${y}h6M${x - 3} ${y + 3}h6" stroke="#b45309" stroke-width=".8"/></g>`;
      s += koban(22, 54, 0.3) + koban(160, 84, 1.1) + koban(14, 150, 0.7);
      s += K.spark(40, 20, 2.8, '#e0f7ff', 'art-float') + K.spark(150, 40, 2.4, '#fde68a');
      return s;
    },

    // Рюдзин: царь-дракон морей поднимается из волн — бирюзовое змеиное тело кольцом с золотыми шипами по хребту, белая грива,
    // оленьи рога, золотая корона и длинные усы; в трёхпалых лапах сияют две жемчужины — прилива (белая) и отлива (синяя)
    jp_ryujin(K) {
      const sc = { c1: '#7ff0dc', c2: '#0b5c56', rim: '#c8f3ff', rimK: 0.7, line: '#032b28', texK: 0.22 };
      const pts = [[100, 64], [120, 84], [128, 104], [104, 118], [62, 116], [38, 138], [60, 162], [110, 164], [152, 150], [186, 162]];
      const w = t => (t < 0.15 ? 18 + 60 * t : 27 - 21 * (t - 0.15) / 0.85);
      let s = K.aura('#38bdf8', 100, 100, 0.44) + K.aura('#5eead4', 60, 60, 0.2);
      s += kumo(K, 34, 26, 0.7, { c1: '#ffffff', c2: '#bae6fd', line: '#0c4a6e', cls: 'art-float' }) + kumo(K, 170, 30, 0.6, { c1: '#ffffff', c2: '#bae6fd', line: '#0c4a6e', flip: true, cls: 'art-float', d: 1 });
      // шипы по хребту
      const P = curve(pts, 6);
      let sp = '';
      for (let i = 3; i < P.length - 6; i += 3) {
        let [nx, ny] = normal(P, i); if (ny > 0) { nx = -nx; ny = -ny; }
        const h = w(i / (P.length - 1)) / 2, [x, y] = P[i], tx = -ny, ty = nx;
        sp += `M${r1(x + nx * h - tx * 4)} ${r1(y + ny * h - ty * 4)}L${r1(x + nx * (h + 9))} ${r1(y + ny * (h + 9))}L${r1(x + nx * h + tx * 4)} ${r1(y + ny * h + ty * 4)}Z`;
      }
      s += K.part(sp, '#fbbf24', { line: '#78350f', lw: 1.2 });
      // тело
      s += K.vol(tube(pts, w, 6), sc);
      s += K.part(tube(pts, t => w(t) * 0.38, 6), '#ccfbf1', { lw: 0, op: 0.55 });
      // лапы с жемчужинами
      const pearl = (x, y, c, d) => `<circle class="art-aura" cx="${x}" cy="${y}" r="16" fill="${K.rad([[0, '#ffffff', 0.9], [0.4, c, 0.5], [1, c, 0]])}" style="animation-delay:-${d}s"/><circle cx="${x}" cy="${y}" r="8" fill="${K.rad([[0, '#ffffff'], [0.6, c], [1, K.shade(c, -0.4)]], 0.35, 0.3)}" stroke="#0c2a4a" stroke-width="1.4"/><circle cx="${x - 2.6}" cy="${y - 2.6}" r="2" fill="#fff"/>`;
      s += K.vol('M74 112C62 108 50 98 44 86C42 80 48 76 52 80C58 90 66 98 78 102Z', { ...sc, tex: false, lw: 2 }) + pearl(40, 74, '#f0f9ff', 0.2);
      s += K.line('M38 84l-2 6M44 86l1 6M50 82l4 4', '#fbbf24', 2.2);
      s += K.vol('M128 98C140 96 152 90 158 78C162 72 168 76 166 82C160 96 146 106 132 108Z', { ...sc, tex: false, lw: 2 }) + pearl(164, 66, '#60a5fa', 0.9);
      s += K.line('M158 78l-4 4M164 80l-1 6M170 76l2 6', '#fbbf24', 2.2);
      // грива, рога, корона
      s += K.vol(shag(100, 52, 34, 30, 10, 0.32), { c1: '#ffffff', c2: '#7fd6c8', rim: '#c8f3ff', rimK: 0.5, line: '#0b4a44', texK: 0.12 });
      s += K.mirror(K.line('M84 30C80 20 76 12 70 6M79 20L69 18M75 13L78 4', '#78350f', 5) + K.line('M84 30C80 20 76 12 70 6M79 20L69 18M75 13L78 4', '#fbbf24', 2.6));
      // голова
      s += K.vol('M100 24C120 24 132 36 132 52C132 62 128 68 122 72C116 80 108 84 100 84C92 84 84 80 78 72C72 68 68 62 68 52C68 36 80 24 100 24Z', sc);
      s += K.part('M100 58C114 58 122 66 122 74C116 82 108 86 100 86C92 86 84 82 78 74C78 66 86 58 100 58Z', '#ccfbf1', { line: '#0b5c56', lw: 1.4 });
      s += `<ellipse cx="93" cy="67" rx="2.4" ry="1.8" fill="#032b28"/><ellipse cx="107" cy="67" rx="2.4" ry="1.8" fill="#032b28"/>`;
      s += K.mouth('fang', 100, 76, 18);
      s += K.g(K.mirror(K.line('M80 72C62 74 48 66 38 52C32 44 36 36 44 38', '#78350f', 3.6) + K.line('M80 72C62 74 48 66 38 52C32 44 36 36 44 38', '#fde68a', 1.8)), '', 'art-float');
      s += K.mirror(K.part('M78 40C84 34 92 34 96 40L94 44C90 40 84 40 80 44Z', '#ffffff', { line: '#0b4a44', lw: 1 }));
      s += K.eyes(100, 50, 12.5, 7.4, { iris: '#facc15', lid: 'angry', skin: '#2bb8a6', look: [0, 0.2] });
      s += K.part('M86 26L90 14L96 22L100 10L104 22L110 14L114 26Q100 22 86 26Z', '#fbbf24', { line: '#78350f', lw: 1.4 }) + `<circle cx="100" cy="19" r="2.4" fill="#ef4444"/>`;
      // волны
      s += `<path d="M0 200V170H200V200Z" fill="${K.lin(['#3b82f6', '#1e3a8a'])}"/>` + `<path d="${seigaiha(0, 200, 186, 9)}" fill="none" stroke="#bfdbfe" stroke-width="1.4" opacity=".85"/>`;
      s += K.part('M0 172C12 162 24 166 32 172C42 164 54 164 62 172C72 164 84 166 92 172C102 164 114 164 122 172C132 164 144 166 152 172C162 164 174 164 182 172C188 168 194 166 200 168V178H0Z', '#7dd3fc', { line: '#0c3a66', lw: 1.6 });
      s += K.spark(14, 70, 2.6, '#e0f7ff', 'art-float') + K.spark(186, 110, 2.4, '#fef08a');
      return s;
    },

    // Тэндзин: ками учёности — придворный в чёрном одеянии сокутай и высокой шапке-каммури с поднятой лентой, в руках дощечка-сяку;
    // у ног прилёг его чёрный бык с белой мордой, справа цветёт ветка сливы-умэ, слева на шнурке висят деревянные дощечки-эма
    // с желаниями школьников, а в небе вспыхивают молнии
    jp_tenjin(K) {
      const robe = { c1: '#6b7280', c2: '#0b0f19', rim: '#fff6b0', rimK: 0.6, line: '#020617', texK: 0.2 };
      const skin = { c1: '#fff0e2', c2: '#e3b494', rim: '#fff6b0', rimK: 0.4, line: '#7a4a2a', tex: false, lw: 2.2 };
      const ox = { c1: '#74747e', c2: '#121218', rim: '#fff6b0', rimK: 0.55, line: '#050508', texK: 0.15 };
      let s = K.aura('#facc15', 100, 100, 0.4) + K.aura('#fbcfe8', 60, 60, 0.16);
      const bolt = (d, dl) => `<g class="art-blink" style="animation-delay:-${dl}s"><path d="${d}" fill="none" stroke="#fef08a" stroke-width="7" stroke-linejoin="round" opacity=".35"/><path d="${d}" fill="none" stroke="#fffbe6" stroke-width="2.6" stroke-linejoin="round"/></g>`;
      s += bolt('M168 4L158 26L170 26L156 52', 0.3) + bolt('M30 60L22 80L32 80L22 100', 1.1);
      // ветка сливы
      s += K.line('M204 70C186 78 176 92 170 112M184 84C190 92 198 94 204 92M176 100C168 96 162 88 162 78', '#3f2a14', 4) + K.line('M162 78C160 70 164 62 170 58', '#3f2a14', 2.6);
      s += ume(170, 58, 7, '#fbcfe8') + ume(162, 80, 6.4, '#ffffff') + ume(188, 86, 7, '#fbcfe8') + ume(172, 110, 6.6, '#fbcfe8') + ume(196, 96, 5.4, '#ffffff') + ume(150, 30, 5, '#fbcfe8', 'art-float');
      // дощечки-эма
      s += K.line('M4 16Q34 24 64 16', '#dc2626', 1.6);
      const ema = (x, y, r) => K.g(K.g(K.part(`M${x - 9} ${y}L${x} ${y - 6}L${x + 9} ${y}V${y + 12}H${x - 9}Z`, '#e8c07a', { line: '#78350f', lw: 1.3 }) + K.line(`M${x - 5} ${y + 3}h10M${x - 5} ${y + 7}h7`, '#1f2937', 1, { op: 0.8 }), `rotate(${r} ${x} ${y - 6})`), '', 'art-sway');
      s += ema(16, 26, -6) + ema(36, 29, 4) + ema(56, 26, -3);
      // одеяние сокутай
      s += K.vol('M100 74C126 74 142 92 148 116L164 172H36L52 116C58 92 74 74 100 74Z', robe);
      s += K.line('M84 78Q100 90 116 78', '#e2e8f0', 3) + K.line('M58 118Q100 128 142 118', '#fbbf24', 3) + K.line('M70 118v6M86 120v6M100 121v6M114 120v6M130 118v6', '#e2e8f0', 2);
      s += K.mirror(K.vol('M74 84C56 92 46 114 44 140C50 150 64 152 76 146C76 128 80 110 88 100Z', robe));
      // руки с дощечкой-сяку
      s += K.part('M95 84H105L104 122H96Z', '#e8c07a', { line: '#78350f', lw: 1.4 });
      s += K.part(K.ell(94, 112, 6, 5.4), skin.c1, { line: skin.line, lw: 1.3 }) + K.part(K.ell(106, 112, 6, 5.4), skin.c1, { line: skin.line, lw: 1.3 });
      // голова и шапка-каммури
      s += K.vol(K.ell(100, 58, 16.5, 18), skin);
      s += K.part('M82 50C82 34 90 26 100 26C110 26 118 34 118 50Q100 44 82 50Z', '#111827', { line: '#020617', lw: 1.4 });
      s += K.part('M92 30C92 16 108 16 108 30Z', '#111827', { line: '#020617', lw: 1.4 });
      s += K.g(K.part('M104 18C110 6 122 0 132 2C126 6 116 12 108 22Z', '#1f2937', { line: '#020617', lw: 1.2 }), '', 'art-sway');
      s += K.eyes(100, 60, 7.4, 4.6, { iris: '#3b2a1a', lid: 'half', skin: '#fff0e2', look: [0, 0.3] });
      s += K.mirror(K.line('M86 50L95 52', '#1f1a24', 2));
      s += K.part('M90 70C94 68 98 69 100 71C102 69 106 68 110 70C106 71 102 72 100 72C98 72 94 71 90 70Z', '#1f1a24', { lw: 0 });
      s += K.part('M97 74C97 80 99 84 100 86C101 84 103 80 103 74Z', '#1f1a24', { lw: 0 });
      // бык прилёг и дремлет
      s += K.vol('M52 160C52 146 72 138 102 138C132 138 150 146 150 160C150 172 132 178 102 178C72 178 52 172 52 160Z', ox);
      s += K.part('M150 154C158 150 162 156 158 162C156 166 152 166 150 164Z', '#121218', { line: '#050508', lw: 1.2 });
      s += K.vol('M64 164C56 166 52 172 56 178H80C80 172 76 166 70 164Z', ox) + K.line('M60 177h16', '#44403c', 1.4);
      s += K.part('M30 132C24 124 24 114 30 108C30 116 34 124 38 130Z', '#f5f5f4', { line: '#44403c', lw: 1.2 }) + K.part('M54 130C58 122 58 112 52 106C54 114 52 122 48 128Z', '#f5f5f4', { line: '#44403c', lw: 1.2 });
      s += K.vol(K.ell(24, 140, 7, 4.6, -20).d, { ...ox, tex: false, lw: 1.6, t: 'rotate(-20 24 140)' }) + K.vol(K.ell(60, 138, 7, 4.6, 20).d, { ...ox, tex: false, lw: 1.6, t: 'rotate(20 60 138)' });
      s += K.vol('M42 128C56 128 66 138 66 152C66 164 56 172 42 172C28 172 18 164 18 152C18 138 28 128 42 128Z', ox);
      s += K.part('M42 156C52 156 58 162 58 168C54 174 48 176 42 176C36 176 30 174 26 168C26 162 32 156 42 156Z', '#f1f5f9', { line: '#050508', lw: 1.4 });
      s += `<ellipse cx="37" cy="166" rx="1.8" ry="1.3" fill="#050508"/><ellipse cx="47" cy="166" rx="1.8" ry="1.3" fill="#050508"/>`;
      s += K.closed(42, 146, 9, 4, false) + K.blush(30, 154, 3.4) + K.blush(54, 154, 3.4);
      s += K.spark(16, 120, 2.6, '#fef08a', 'art-float') + K.spark(120, 12, 2.4, '#fffbe6');
      return s;
    },

    // Кагуцути: бог огня — пухлый малыш из живого пламени: волосы — языки огня, в груди светится ядро, хитрая улыбка; вместо ножек пламя,
    // в ручках деревянные колотушки-хёсиги, с которыми зимой обходят улицы с криком «Берегись огня!»; вокруг кружат искры
    jp_kagutsuchi(K) {
      const fire = { c1: '#fff3b0', c2: '#e2541b', rim: '#ffe29a', rimK: 0.6, line: '#6b1d06', texK: 0.3 };
      let s = K.aura('#ff7a3d', 100, 104, 0.5) + K.aura('#fde047', 70, 100, 0.25);
      // огненный ореол
      for (let i = 0; i < 9; i++) {
        const a = (180 + i * 22.5) * Math.PI / 180, x = r1(100 + 62 * Math.cos(a)), y = r1(104 + 58 * Math.sin(a)), h = 34 + (i % 2) * 12;
        s += K.g(K.flame(x, y + 10, h, h * 0.66, '#fff3b0', i % 2 ? '#f97316' : '#dc2626', { style: `animation-delay:-${(i * 0.21).toFixed(2)}s` }), `rotate(${r1((a * 180 / Math.PI + 90) * 0.7)} ${x} ${y})`);
      }
      // тело-пламя
      s += K.vol('M100 56C128 56 146 78 146 104C146 126 136 142 124 152C128 160 126 170 118 176C116 168 110 164 104 166C104 172 100 178 94 178C94 172 90 166 84 166C80 170 74 172 70 174C74 166 74 158 76 152C62 142 54 126 54 104C54 78 72 56 100 56Z', fire);
      s += `<circle class="art-aura" cx="100" cy="126" r="17" fill="${K.rad([[0, '#ffffff', 0.95], [0.5, '#fde047', 0.6], [1, '#f97316', 0]])}"/>`;
      // волосы-пламя
      s += K.flame(100, 66, 50, 34, '#fff3b0', '#ef4444', { style: 'animation-delay:-.2s' }) + K.flame(76, 72, 34, 24, '#fff3b0', '#f97316', { style: 'animation-delay:-.6s' }) + K.flame(124, 72, 34, 24, '#fff3b0', '#f97316', { style: 'animation-delay:-.9s' });
      // лицо
      s += K.gloss(80, 76, 7, 4, -35, 0.5);
      s += K.eyes(100, 94, 15, 9.5, { iris: '#b45309', look: [0.2, 0.2] });
      s += K.mirror(K.line('M80 80Q86 76 94 80', '#7c2d12', 2.6));
      s += K.mouth('grin', 100, 108, 16);
      s += K.blush(78, 106, 6) + K.blush(122, 106, 6);
      // ручки с колотушками
      s += K.mirror(K.vol('M64 112C56 108 50 100 48 92C50 86 56 86 58 92C60 98 64 102 70 104Z', { ...fire, tex: false, lw: 2 }));
      s += K.mirror(K.part('M44 64H54V100H44Z', '#d6a756', { line: '#5a3a14', lw: 1.6 }) + K.line('M46 70V96', '#f5deb3', 1.2, { op: 0.8 }));
      s += K.line('M49 100C60 116 140 116 151 100', '#f8fafc', 2.2) + K.line('M49 100C60 116 140 116 151 100', '#94a3b8', 1, { op: 0.6 });
      s += K.mirror(K.vol(K.ell(53, 92, 6.6, 6.4), { ...fire, tex: false, lw: 2 }));
      s += K.g(K.line('M38 58l-6-4M36 66h-8M162 58l6-4M164 66h8', '#fff3b0', 2.2), '', 'art-blink');
      s += K.spark(24, 30, 3, '#ffe29a', 'art-float') + K.spark(176, 26, 2.8, '#fff3b0') + K.spark(18, 140, 2.4, '#ffd23f', 'art-float') + K.spark(182, 146, 2.4, '#ffe29a');
      return s;
    },

    // Такэмикадзути: бог грома и мечей из Касимы сидит, скрестив ноги, на острие огромного меча, воткнутого рукоятью в священный камень
    // посреди волн; волосы собраны в узел с золотым обручем, белое одеяние с синими латами, руки скрещены, вокруг трещат молнии.
    // Из-под камня-канамэиси торчат усы и хвост придавленного намадзу
    jp_takemikazuchi(K) {
      const arm = { c1: '#a5b4fc', c2: '#1e1b4b', rim: '#fff6b0', rimK: 0.65, line: '#0b0a26', texK: 0.22 };
      const robe = { c1: '#ffffff', c2: '#c7d2fe', rim: '#fff6b0', rimK: 0.5, line: '#1e1b4b', texK: 0.18 };
      const skin = { c1: '#ffe2c8', c2: '#e0a07a', rim: '#fff6b0', rimK: 0.4, line: '#7a4a2a', tex: false, lw: 2.2 };
      let s = K.aura('#facc15', 100, 96, 0.44) + K.aura('#60a5fa', 64, 70, 0.22);
      s += zap(K, 20, 70, 1.4, -20, '#fde047', 0.2) + zap(K, 172, 40, 1.3, 25, '#fef08a', 0.9) + zap(K, 30, 20, 1.1, 10, '#fef08a', 1.4) + zap(K, 178, 112, 1.1, -15, '#fde047', 0.6);
      // волны
      s += `<path d="M0 200V164H200V200Z" fill="${K.lin(['#3b82f6', '#1e3a8a'])}"/>` + `<path d="${seigaiha(0, 200, 180, 10)}" fill="none" stroke="#bfdbfe" stroke-width="1.6" opacity=".9"/>`;
      s += K.part('M0 166C10 156 20 160 26 166C32 158 44 158 50 166C56 158 68 158 74 166C80 158 92 158 98 166C104 158 116 158 122 166C128 158 140 158 146 166C152 158 164 158 170 166C176 158 188 158 200 164V172H0Z', '#60a5fa', { line: '#0a1033', lw: 1.6 });
      // усы и хвост намадзу
      s += K.line('M68 160C54 164 42 156 34 162C28 166 30 174 36 172', '#163a4f', 3.4) + K.line('M132 160C148 164 158 156 166 162', '#163a4f', 3.4);
      s += K.part('M150 152C160 146 170 146 176 152C170 154 166 158 164 164Z', '#5f93a8', { line: '#071a26', lw: 1.6 });
      // камень-канамэиси
      s += K.vol('M62 166C58 150 74 140 100 140C126 140 142 150 138 166Z', { c1: '#d6d3d1', c2: '#57534e', rim: '#fff6b0', rimK: 0.4, line: '#1c1917', tex: false });
      const rope = 'M64 154Q100 164 136 154';
      s += K.line(rope, '#78350f', 6) + K.line(rope, '#f3d38a', 3.8) + `<path d="${rope}" fill="none" stroke="#b88a3e" stroke-width="3.8" stroke-dasharray="3 3"/>`;
      s += shide(78, 158, 0.85, 0.3) + shide(116, 158, 0.85, 1);
      // меч остриём вверх
      const blade = 'M91 146L92 128L100 116L108 128L109 146Z';
      s += K.part(blade, '#e2e8f0', { line: '#1e293b', lw: 1.6 }) + `<path d="${blade}" fill="${K.lin(['#ffffff', '#94a3b8'], 0, 0, 1, 0)}" opacity=".6"/>` + K.line('M100 122V144', '#ffffff', 1.4);
      s += K.part('M82 144H118V150H82Z', '#fbbf24', { line: '#78350f', lw: 1.4 });
      // скрещённые ноги: колени в стороны, стопы в середине
      const leg = { ...arm, c1: '#c7d2fe', c2: '#312e81' };
      s += K.mirror(K.vol('M100 102C84 100 64 104 56 112C52 120 58 126 68 126C80 126 92 124 100 122Z', leg));
      s += K.part(K.ell(92, 122, 7, 4.6), skin.c1, { line: skin.line, lw: 1.4 }) + K.part(K.ell(108, 120, 7, 4.6), skin.c1, { line: skin.line, lw: 1.4 });
      // торс с латами и наплечниками
      s += K.vol('M100 54C118 54 128 64 130 78L132 108H68L70 78C72 64 82 54 100 54Z', robe);
      s += K.vol('M76 66H124L128 106H72Z', arm) + K.line('M74 78H126M73 90H127M72 102H128', '#fbbf24', 1.6, { op: 0.8 });
      s += K.line('M88 56L100 68L112 56', '#fbbf24', 2.6) + K.rhomb(100, 84, 5, '#60a5fa', '#78350f');
      s += K.mirror(K.vol('M76 60L56 66L58 86L76 82Z', arm) + K.line('M56 66L76 60', '#fbbf24', 2.2));
      // левая рука на колене, правая поднята с молнией
      s += K.vol('M66 78C58 86 56 98 60 110L70 110C68 100 70 92 76 86Z', robe) + K.vol(K.ell(64, 112, 6.6, 6.2), skin);
      s += K.vol('M134 78C144 72 150 62 152 50C154 44 160 44 162 50C160 64 152 78 140 88Z', robe) + K.vol(K.ell(157, 48, 6.6, 6.2), skin);
      s += `<g class="art-blink"><path d="M150 44L162 26L156 26L166 8L172 8L164 22L170 22L156 44Z" fill="#fde047" stroke="#a16207" stroke-width="1.6" stroke-linejoin="round"/></g>`;
      // голова
      s += K.vol(K.ell(100, 18, 9, 8), { c1: '#3a3344', c2: '#0b0a10', line: '#0b0a10', lw: 1.6, tex: false });
      s += K.vol(K.ell(100, 38, 19, 21), skin);
      s += K.part('M80.5 38C78 20 88 14 100 14C112 14 122 20 119.5 38C114 30 108 26 100 26C92 26 86 30 80.5 38Z', '#1f1a24', { line: '#0b0a10', lw: 1.2 });
      s += K.line('M81 28Q100 20 119 28', '#fbbf24', 3.4) + K.rhomb(100, 23, 3.8, '#60a5fa', '#78350f');
      s += K.mirror(K.part('M83 34C88 30 94 30 97 34L96 38C92 35 88 35 84 38Z', '#1f1a24', { lw: 0 }));
      s += K.eyes(100, 42, 8.6, 5.6, { iris: '#1e3a8a', lid: 'angry', skin: '#ffe2c8', look: [0.2, 0.1] });
      s += K.part('M86 50C86 60 92 66 100 66C108 66 114 60 114 50C110 55 105 57 100 56C95 57 90 55 86 50Z', '#1f1a24', { line: '#0b0a10', lw: 1 });
      s += K.line('M95 55H105', '#e0a07a', 1.8);
      s += zap(K, 54, 60, 0.8, -40, '#fde047', 0.5) + zap(K, 140, 100, 0.8, 30, '#fef08a', 1.2);
      s += K.spark(130, 8, 3, '#fef08a', 'art-float') + K.spark(184, 160, 2.4, '#e0f2fe');
      return s;
    },

    // Кагуя-химэ: лунная принцесса в многослойном кимоно сиреневых и розовых оттенков, длинные чёрные волосы до земли, высокие
    // нарисованные брови-точки и золотое украшение с жемчугом; держит веер-хиоги с цветными шнурами. За ней огромная полная луна,
    // по бокам стебли бамбука, у ног светится расколотый стебель, в котором её нашли; вокруг вьётся небесное покрывало-хагоромо
    jp_kaguya(K) {
      const robe = { c1: '#e9d5ff', c2: '#6d28d9', rim: '#e9d5ff', rimK: 0.6, line: '#2e1065', texK: 0.3 };
      const skin = { c1: '#fff7f5', c2: '#ecc8c8', rim: '#e9d5ff', rimK: 0.4, line: '#7a4a5a', tex: false, lw: 2.2 };
      const bam = { c1: '#bef264', c2: '#3f6212', rim: '#e9d5ff', rimK: 0.4, line: '#1a2e05', tex: false, lw: 1.8 };
      let s = K.aura('#c084fc', 100, 100, 0.44);
      // полная луна
      s += `<circle cx="100" cy="72" r="62" fill="${K.rad([[0, '#fffbeb'], [0.7, '#fef3c7'], [1, '#fde68a']])}" stroke="#d6b45a" stroke-width="2"/>`;
      s += `<g fill="#e9d29a" opacity=".45"><circle cx="70" cy="50" r="8"/><circle cx="134" cy="40" r="5"/><circle cx="140" cy="96" r="9"/><circle cx="62" cy="100" r="5"/></g>`;
      // бамбук по бокам
      for (const x of [16, 184]) s += K.vol(`M${x - 7} 0H${x + 7}V182H${x - 7}Z`, bam) + K.line(`M${x - 7} 40H${x + 7}M${x - 7} 88H${x + 7}M${x - 7} 136H${x + 7}`, '#1a2e05', 1.6);
      s += K.leaf(22, 40, 22, -30, '#65a30d') + K.leaf(22, 88, 20, 20, '#84cc16') + K.leaf(178, 46, 22, -150, '#65a30d') + K.leaf(178, 100, 20, 160, '#84cc16');
      // небесное покрывало сзади
      s += K.part(tube([[64, 118], [36, 92], [44, 48], [100, 26], [156, 48], [164, 92], [140, 124]], 9, 6), '#fdf2f8', { line: '#be185d', lw: 1.4, op: 0.9 });
      // волосы до земли
      s += K.part('M78 46C66 80 60 130 56 176H144C140 130 134 80 122 46Z', '#1f1a2e', { line: '#0b0814', lw: 1.6 });
      // многослойное кимоно
      s += K.vol('M100 84C122 84 134 98 138 116L152 176H48L62 116C66 98 78 84 100 84Z', robe);
      s += K.line('M50 170H150', '#f9a8d4', 3) + K.line('M52 164H148', '#fdf2f8', 2.4) + K.line('M54 158H146', '#a3e635', 2);
      s += K.line('M88 86L100 108L112 86', '#fdf2f8', 3.4) + K.line('M86 86L100 112L114 86', '#f472b6', 1.6);
      s += `<g fill="#fdf2f8" opacity=".75"><circle cx="76" cy="140" r="2"/><circle cx="124" cy="132" r="2"/><circle cx="100" cy="150" r="2"/><circle cx="86" cy="120" r="1.6"/><circle cx="118" cy="148" r="1.6"/></g>`;
      // рукава со слоями
      s += K.mirror(K.vol('M76 92C58 100 50 120 50 144C56 152 70 154 80 148C80 130 84 112 92 104Z', robe) + K.line('M52 146C60 154 70 154 78 150', '#f9a8d4', 2.4) + K.line('M54 140C62 148 72 148 80 144', '#a3e635', 1.6));
      // веер-хиоги
      s += K.part('M100 122L80 96Q100 86 120 96Z', '#fef3c7', { line: '#92400e', lw: 1.4 }) + K.line('M100 122L86 94M100 122L94 90M100 122L100 89M100 122L106 90M100 122L114 94', '#d6b45a', 1);
      s += K.part('M90 98Q100 94 110 98L106 104Q100 101 94 104Z', '#f472b6', { lw: 0, op: 0.8 });
      s += K.g(K.line('M82 98C76 108 80 118 74 128M118 98C124 108 120 118 126 128', '#f472b6', 1.6) + K.line('M84 98C80 110 84 120 80 132', '#a3e635', 1.4), '', 'art-sway');
      s += K.part(K.ell(92, 120, 5.4, 4.6), skin.c1, { line: skin.line, lw: 1.2 }) + K.part(K.ell(108, 120, 5.4, 4.6), skin.c1, { line: skin.line, lw: 1.2 });
      // голова
      s += K.vol(K.ell(100, 60, 17, 19), skin);
      s += K.part('M82.5 62C80 42 90 36 100 36C110 36 120 42 117.5 62C116 52 108 46 100 46C92 46 84 52 82.5 62Z', '#1f1a2e', { line: '#0b0814', lw: 1.4 });
      s += K.line('M84 54C80 68 80 82 84 92M116 54C120 68 120 82 116 92', '#1f1a2e', 3.4);
      s += K.eyes(100, 64, 7.4, 4.8, { iris: '#7c3aed', lid: 'half', skin: '#fff7f5', lash: true, look: [0, 0.3] });
      s += K.blush(88, 72, 3.6) + K.blush(112, 72, 3.6);
      s += `<path d="M97 76Q100 78.5 103 76Q100 75 97 76Z" fill="#e11d48" stroke="#9f1239" stroke-width="1"/>`;
      // золотое украшение с жемчугом
      s += K.part('M84 40Q100 30 116 40L114 44Q100 36 86 44Z', '#fbbf24', { line: '#78350f', lw: 1.4 });
      s += `<g fill="#ffffff" stroke="#a16207" stroke-width=".8"><circle cx="90" cy="38" r="2.2"/><circle cx="100" cy="34" r="2.6"/><circle cx="110" cy="38" r="2.2"/></g>`;
      s += K.g(K.line('M116 42V54M84 42V54', '#fbbf24', 1) + `<circle cx="116" cy="56" r="1.8" fill="#f9a8d4"/><circle cx="84" cy="56" r="1.8" fill="#f9a8d4"/>`, '', 'art-sway');
      // светящийся расколотый стебель
      s += `<circle class="art-aura" cx="40" cy="146" r="22" fill="${K.rad([[0, '#fef9c3', 0.9], [1, '#a3e635', 0]])}"/>`;
      s += K.vol('M32 178V146L48 140V178Z', bam) + `<path d="M32 146L48 140" stroke="#fef9c3" stroke-width="3" stroke-linecap="round"/>` + K.line('M32 164H48', '#1a2e05', 1.4);
      s += K.g(K.leaf(150, 150, 12, 40, '#84cc16'), '', 'art-float') + K.g(K.leaf(60, 20, 11, 120, '#a3e635'), '', 'art-float" style="animation-delay:-1s');
      s += K.spark(176, 150, 2.8, '#fef9c3', 'art-float') + K.spark(30, 120, 2.2, '#e9d5ff') + K.spark(160, 14, 2.4, '#fef9c3');
      return s;
    },

    // Окунинуси: добрый хозяин земли Идзумо — юноша с петлями волос-мидзура, светлое древнее одеяние с коричневой накидкой и бусами-
    // магатама; на плече огромный холщовый мешок, на руке сидит белый заяц из Инабы; рядом рогоз с пушистыми початками, пыльцой которого
    // бог вылечил зайца, а от мизинца тянется красная нить добрых союзов
    jp_okuninushi(K) {
      const robe = { c1: '#fffbeb', c2: '#d6c39a', rim: '#e4ffb0', rimK: 0.5, line: '#5c3a1a', texK: 0.16 };
      const cape = { c1: '#c98a4a', c2: '#5a2a0c', rim: '#e4ffb0', rimK: 0.55, line: '#2a1206', texK: 0.2 };
      const skin = { c1: '#ffe6cf', c2: '#e3ae88', rim: '#e4ffb0', rimK: 0.4, line: '#7a4a2a', tex: false, lw: 2.2 };
      const hare = { c1: '#ffffff', c2: '#d6d3e0', rim: '#e4ffb0', rimK: 0.4, line: '#4b4560', tex: false, lw: 1.8 };
      let s = K.aura('#84cc16', 100, 100, 0.42) + K.aura('#fde68a', 64, 70, 0.18);
      // рогоз
      for (const [x, h, d] of [[16, 96, 0], [30, 74, 0.6], [44, 108, 1.2]]) {
        s += K.line(`M${x} 180V${180 - h}`, '#4d7c0f', 2.6) + K.part(`M${x - 4} ${180 - h}C${x - 4} ${180 - h - 22} ${x + 4} ${180 - h - 22} ${x + 4} ${180 - h}Z`, '#8a5a2b', { line: '#3b220e', lw: 1.4 });
        s += K.g(`<circle cx="${x + 6}" cy="${180 - h - 14}" r="1.6" fill="#fde047"/><circle cx="${x - 6}" cy="${180 - h - 6}" r="1.2" fill="#fde047"/>`, '', `art-float" style="animation-delay:-${d}s`);
      }
      s += K.leaf(30, 176, 30, -110, '#65a30d') + K.leaf(46, 178, 26, -70, '#4d7c0f');
      // мешок за спиной
      s += K.vol('M122 40C152 28 184 48 186 84C188 114 168 132 142 130C124 128 114 112 114 94C114 70 112 50 122 40Z', { c1: '#f3e2c0', c2: '#a8875a', rim: '#e4ffb0', rimK: 0.45, line: '#4a3418', texK: 0.2 });
      s += K.part('M120 36C126 30 136 30 140 36L136 44C132 40 126 40 124 44Z', '#e8d3a8', { line: '#4a3418', lw: 1.4 }) + K.line('M118 44Q130 50 142 44', '#78350f', 3);
      s += K.part('M150 92L166 88L168 104L152 106Z', '#d9c39a', { line: '#4a3418', lw: 1.2 }) + K.line('M152 96l12-2M153 101l12-2', '#4a3418', 0.8, { op: 0.6 });
      // одеяние: штаны и рубаха
      s += K.mirror(K.vol('M76 140C74 154 74 166 76 176H98V142Z', robe) + K.line('M74 166H98', '#dc2626', 2.4) + K.part('M70 174H98L99 180H68Z', '#78350f', { line: '#2a1206', lw: 1.2 }));
      s += K.vol('M100 80C118 80 128 92 130 108L132 144H68L70 108C72 92 82 80 100 80Z', robe);
      s += K.vol('M80 84C70 90 66 104 66 120L68 146H84L90 100Z', cape) + K.vol('M120 84C130 90 134 104 134 120L132 146H116L110 100Z', cape);
      s += K.line('M68 128H132', '#65a30d', 4) + K.line('M68 128H132', '#bef264', 1.4);
      s += K.line('M84 90Q100 108 116 90', '#3f6212', 1.2) + magatama(88, 97, 3.6, -40) + magatama(100, 102, 4.2, 0, '#34d399') + magatama(112, 97, 3.6, 40);
      // левая рука держит мешок, правая — с зайцем
      s += K.vol('M126 90C132 80 132 66 128 54L120 52C122 64 120 76 114 84Z', robe) + K.vol(K.ell(124, 52, 6.6, 6.2), skin);
      s += K.vol('M74 92C62 98 54 108 50 120C50 126 56 128 60 124C64 114 70 106 80 100Z', robe) + K.vol(K.ell(56, 124, 6.6, 6.2), skin);
      // белый заяц на руке
      s += K.vol('M38 120C36 108 46 100 58 102C68 104 72 114 68 122C62 126 46 128 38 120Z', hare);
      s += K.vol('M38 90C34 78 36 64 42 58C46 66 46 80 44 92Z', hare) + K.part('M40 86C38 78 39 70 42 65C44 72 44 80 43 87Z', '#fbcfe8', { lw: 0 });
      s += K.vol('M48 90C48 78 52 66 58 62C60 70 58 82 54 92Z', hare) + K.part('M50 86C50 78 53 70 57 66C58 73 56 80 53 87Z', '#fbcfe8', { lw: 0 });
      s += K.vol('M30 100C30 90 38 84 48 86C58 88 60 98 56 106C50 112 34 110 30 100Z', hare);
      s += K.eye(40, 96, 4, { iris: '#be185d', look: [-0.2, 0.2] }) + `<ellipse cx="32" cy="101" rx="1.4" ry="1" fill="#f472b6"/>` + K.blush(42, 104, 3);
      // красная нить
      s += K.g(K.line('M60 128C64 146 84 156 104 152C124 148 136 160 150 170', '#ef4444', 1.8) + K.part('M146 166C150 160 158 162 156 168C160 170 158 176 152 174Z', '#ef4444', { line: '#7f1d1d', lw: 1 }), '', 'art-sway');
      // голова с мидзура
      s += K.mirror(K.vol('M80 50C70 50 64 58 66 68C68 76 76 78 80 72C76 68 76 60 82 56Z', { c1: '#3a3344', c2: '#0b0a10', rim: '#e4ffb0', rimK: 0.35, line: '#0b0a10', lw: 1.6, tex: false }) + K.line('M68 58L76 60', '#65a30d', 2.2));
      s += K.vol(K.ell(100, 56, 17, 19), skin);
      s += K.part('M83 54C81 38 90 32 100 32C110 32 119 38 117 54C112 46 106 42 100 42C94 42 88 46 83 54Z', '#1f1a24', { line: '#0b0a10', lw: 1.4 });
      s += K.line('M84 44Q100 38 116 44', '#65a30d', 2.6);
      s += K.eyes(100, 58, 7.8, 5, { iris: '#78350f', look: [-0.3, 0.2] });
      s += K.mirror(K.line('M87 48L96 49', '#1f1a24', 2));
      s += K.mouth('smile', 100, 68, 9);
      s += K.blush(88, 66, 3.8) + K.blush(112, 66, 3.8);
      s += K.spark(100, 12, 2.8, '#e4ffb0', 'art-float') + K.spark(186, 150, 2.4, '#fde68a');
      return s;
    },

    // Амэ-но Удзумэ: весёлая богиня зари пляшет на перевёрнутой кадке у небесной пещеры — круглые румяные щёки, смеющиеся глаза-дуги,
    // волосы в пучке с венком из лиан; в поднятой руке ветка сакаки с бубенцами, в другой — развевающаяся лента; одна нога в прыжке.
    // Из-за скалы пещеры пробиваются первые лучи солнца
    jp_uzume(K) {
      const robe = { c1: '#ffe0c2', c2: '#e2541b', rim: '#ffe29a', rimK: 0.6, line: '#5a1a06', texK: 0.25 };
      const skin = { c1: '#fff1e6', c2: '#efb898', rim: '#ffe29a', rimK: 0.4, line: '#7a3a2a', tex: false, lw: 2.2 };
      let s = K.aura('#ff9a3d', 100, 100, 0.42);
      // лучи из-за скалы и скала пещеры
      let rays = '';
      for (let i = 0; i < 8; i++) { const a = (156 + i * 13) * Math.PI / 180, L = i < 5 ? 110 : 64; rays += `M${r1(186 + 30 * Math.cos(a))} ${r1(64 + 30 * Math.sin(a))}L${r1(186 + L * Math.cos(a - 0.06))} ${r1(64 + L * Math.sin(a - 0.06))}L${r1(186 + L * Math.cos(a + 0.06))} ${r1(64 + L * Math.sin(a + 0.06))}Z`; }
      s += K.g(`<path d="${rays}" fill="#fde68a" opacity=".45"/>`, '', 'art-blink');
      s += `<circle cx="196" cy="64" r="26" fill="${K.rad([[0, '#fffbe6'], [0.6, '#fde047'], [1, '#f97316']])}"/>`;
      s += K.part('M200 0V200H176C170 160 180 130 172 100C166 80 176 50 168 20C166 10 170 4 176 0Z', '#57534e', { line: '#1c1917', lw: 2 }) + K.line('M178 40L190 46M174 120L188 126M180 160L192 164', '#292524', 1.6, { op: 0.8 });
      // перевёрнутая кадка
      s += K.vol('M52 178L58 148H142L148 178Z', { c1: '#e8b86a', c2: '#8a5a24', rim: '#ffe29a', rimK: 0.5, line: '#3b2410', tex: false });
      s += K.line('M55 162H145M57 154H143M54 172H146', '#5a3a14', 2.4) + K.line('M80 148L78 178M100 148V178M120 148L122 178', '#5a3a14', 1, { op: 0.5 });
      // ноги: опорная и поднятая
      s += K.vol('M86 128C84 136 84 142 86 148H98V130Z', skin) + K.part(K.ell(90, 148, 8, 3.4), skin.c1, { line: skin.line, lw: 1.3 });
      // платье
      s += K.vol('M100 76C118 76 128 88 130 102L136 134C120 140 80 140 64 134L70 102C72 88 82 76 100 76Z', robe);
      s += K.line('M66 128Q100 136 134 128', '#fde047', 3) + K.line('M88 78L100 96L112 78', '#fff7ed', 3);
      s += K.part('M70 112Q100 118 130 112L131 120Q100 126 69 120Z', '#7c2d12', { line: '#3b1206', lw: 1.2 }) + K.line('M72 116Q100 122 128 116', '#65a30d', 1.6, { op: 0.9 });
      // нога поднята в пляске: колено в сторону
      s += K.vol('M112 126C120 118 130 112 138 114C144 116 144 124 140 128L136 140C134 144 128 144 128 140L130 128C124 128 118 132 114 136Z', skin);
      s += K.part(K.ell(133, 143, 7, 3.6, -15).d, skin.c1, { line: skin.line, lw: 1.3 }).replace('<path', `<path transform="rotate(-15 133 143)"`);
      // лента
      s += K.g(K.part(tube([[130, 96], [150, 104], [166, 92], [178, 110], [170, 132]], 7, 5), '#fef3c7', { line: '#c2410c', lw: 1.2 }), '', 'art-sway');
      // руки: левая с веткой сакаки и бубенцами, правая с лентой
      s += K.vol('M74 86C64 78 58 66 56 52C56 46 62 44 66 48C68 60 72 70 80 78Z', robe) + K.vol(K.ell(60, 46, 6.4, 6), skin);
      s += K.line('M58 50L44 12', '#3f6212', 3) + K.leaf(50, 30, 16, -150, '#4d7c0f') + K.leaf(48, 24, 14, -40, '#65a30d') + K.leaf(46, 16, 12, -110, '#84cc16');
      s += K.g([[40, 22], [56, 36], [42, 36]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${K.rad([[0, '#fffbe6'], [0.6, '#fbbf24'], [1, '#b45309']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1"/><path d="M${x - 2.6} ${y}h5.2" stroke="#78350f" stroke-width=".8"/>`).join(''), '', 'art-sway');
      s += K.vol('M126 86C136 90 142 96 146 104L140 108C136 102 130 98 122 96Z', robe) + K.vol(K.ell(142, 106, 6, 5.6), skin);
      // голова: щёки-яблочки, пучок с венком
      s += K.vol(K.ell(100, 30, 11, 9), { c1: '#3a3344', c2: '#0b0a10', line: '#0b0a10', lw: 1.6, tex: false });
      s += K.vol('M100 34C118 34 128 46 128 60C128 74 116 84 100 84C84 84 72 74 72 60C72 46 82 34 100 34Z', skin);
      s += K.part('M73 58C71 42 84 32 100 32C116 32 129 42 127 58C122 50 114 46 100 46C86 46 78 50 73 58Z', '#1f1a24', { line: '#0b0a10', lw: 1.2 });
      s += K.line('M74 44Q100 30 126 44', '#4d7c0f', 3.4) + [80, 92, 108, 120].map((x, i) => K.leaf(x, i % 2 ? 36 : 38, 9, i % 2 ? -60 : -120, '#65a30d')).join('');
      s += `<ellipse cx="92" cy="48" rx="2.6" ry="1.6" fill="#3b2a3a"/><ellipse cx="108" cy="48" rx="2.6" ry="1.6" fill="#3b2a3a"/>`;
      s += K.closed(100, 60, 9, 5, true);
      s += `<path d="M96 72Q100 76 104 72Q100 70 96 72Z" fill="#e11d48" stroke="#9f1239" stroke-width="1"/>`;
      s += K.blush(82, 68, 7) + K.blush(118, 68, 7) + K.blush(82, 68, 4) + K.blush(118, 68, 4);
      s += K.spark(24, 80, 3, '#ffe29a', 'art-float') + K.spark(20, 150, 2.4, '#fff3b0') + K.spark(150, 20, 2.6, '#ffe29a', 'art-float');
      return s;
    },

    // Ятагарасу: трёхлапый небесный ворон — чёрное оперение с сине-фиолетовым отливом, широко раскрытые крылья, золотые глаза; стоит
    // тремя лапами на вершине горы Кумано перед огромным алым солнцем, внизу клубятся облака, вокруг вьётся ветер
    jp_yatagarasu(K) {
      const fea = { c1: '#56638a', c2: '#0b0f1e', rim: '#c7d2fe', rimK: 0.7, line: '#020617', texK: 0.2 };
      let s = K.aura('#a5b4fc', 100, 100, 0.42);
      // алое солнце
      s += `<circle class="art-aura" cx="100" cy="76" r="70" fill="${K.rad([[0.5, '#fca5a5', 0.5], [1, '#ef4444', 0]])}"/>`;
      s += `<circle cx="100" cy="76" r="54" fill="${K.rad([[0, '#fecaca'], [0.55, '#ef4444'], [1, '#b91c1c']], 0.45, 0.4)}" stroke="#7f1d1d" stroke-width="2"/>`;
      // горы Кумано и облака
      s += `<path d="M0 150L30 118L52 138L78 112L100 132L122 108L150 136L172 116L200 144V180H0Z" fill="${K.lin(['#3f5f50', '#1a2e24'])}" stroke="#0f1f18" stroke-width="2"/>`;
      s += kumo(K, 34, 150, 0.8, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca', cls: 'art-float' }) + kumo(K, 168, 154, 0.75, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca', flip: true, cls: 'art-float', d: 1.1 });
      // скала-вершина
      s += K.vol('M64 178C62 160 76 148 100 148C124 148 138 160 136 178Z', { c1: '#a8a29e', c2: '#44403c', rim: '#c7d2fe', rimK: 0.4, line: '#1c1917', tex: false });
      // крылья
      const wd = 'M80 98C60 78 36 66 8 66C2 68 2 76 8 78C0 84 2 92 10 92C4 98 6 106 14 104C8 112 12 118 20 114C18 124 26 128 32 120C32 130 40 134 46 126C48 136 58 138 60 128C64 132 72 130 72 122Z';
      s += K.mirror('<g class="art-wing">' + K.part(wd, '#2b3350', { line: '#020617', lw: 2 }) + K.part('M76 100C60 84 42 76 22 72C34 82 46 90 56 100C62 106 68 110 74 112Z', '#3d4870', { line: '#020617', lw: 1.2 }) +
        K.line('M14 74C36 76 56 86 74 102M14 90C32 92 50 100 70 110M24 106C38 106 52 112 64 116', '#a5b4fc', 1.3, { op: 0.75 }) + '</g>');
      // хвост
      s += K.part('M84 140L76 168L92 160L100 172L108 160L124 168L116 140Z', '#1e2540', { line: '#020617', lw: 1.6 });
      // три лапы
      for (const x of [86, 100, 114]) s += K.line(`M${x} 130V152`, '#f59e0b', 4) + K.line(`M${x} 152l-6 4M${x} 152v6M${x} 152l6 4`, '#b45309', 2.4);
      // тело
      s += K.vol('M100 70C122 70 136 88 136 110C136 128 122 140 100 140C78 140 64 128 64 110C64 88 78 70 100 70Z', fea);
      s += K.line(scaleRow(80, 120, 108, 8) + scaleRow(84, 116, 120, 8), '#8b9ac8', 1.2, { op: 0.7 });
      // голова
      s += K.vol('M100 26C118 26 130 38 130 54C130 70 118 80 100 80C82 80 70 70 70 54C70 38 82 26 100 26Z', fea);
      s += K.part('M88 30C90 20 98 14 106 14C102 20 104 24 108 28Z', '#2b3350', { line: '#020617', lw: 1.4 });
      s += K.gloss(84, 38, 6, 3.5, -35, 0.4);
      s += K.glow(87, 50, 5, 5.4, '#fbbf24') + K.glow(113, 50, 5, 5.4, '#fbbf24');
      s += K.part('M90 60Q100 54 110 60Q108 72 100 82Q92 72 90 60Z', '#1f2937', { line: '#020617', lw: 1.6 }) + K.line('M93 62Q100 64 107 62', '#f59e0b', 1.6);
      s += K.g(K.line(spiral(28, 30, 1.2, 1.8) + spiral(174, 26, 1.1, 1.8), '#e0e7ff', 2), '', 'art-spin');
      s += K.spark(150, 10, 2.8, '#eef0ff', 'art-float') + K.spark(14, 46, 2.4, '#fde68a');
      return s;
    },

    // Ямата-но Ороти: восьмиглавый змей — тёмно-зелёное тело-холм, на спине растут кипарисы и мох, восемь шей веером, у каждой головы
    // красные глаза; одни головы ещё сердито шипят, другие, наевшись угощения из восьми чанов, уже клюют носом и сопят «з-з-з»
    jp_orochi(K) {
      const sc = { c1: '#86ad6e', c2: '#1a2e14', rim: '#e9d5ff', rimK: 0.6, line: '#0a1406', texK: 0.2 };
      let s = K.aura('#c084fc', 100, 104, 0.42) + K.aura('#4d7c0f', 70, 150, 0.25);
      s += kumo(K, 30, 22, 0.7, { c1: '#64748b', c2: '#1e293b', line: '#0f172a', cls: 'art-float' }) + kumo(K, 172, 18, 0.65, { c1: '#64748b', c2: '#1e293b', line: '#0f172a', flip: true, cls: 'art-float', d: 1 });
      const A = [-168, -146, -124, -102, -78, -56, -34, -12];
      const H = A.map(a => [r1(100 + 80 * Math.cos(a * Math.PI / 180)), r1(120 + 76 * Math.sin(a * Math.PI / 180))]);
      // шеи
      const order = [0, 7, 1, 6, 2, 5, 3, 4];
      for (const i of order) {
        const a = A[i] * Math.PI / 180, [hx, hy] = H[i], bx = r1(100 + 34 * Math.cos(a)), by = 132;
        const mx = r1((bx + hx) / 2 + 10 * Math.sin(a)), my = r1((by + hy) / 2 + 6);
        s += K.part(tube([[bx, by], [mx, my], [hx, hy + 6]], t => 18 - 6 * t, 5), '#5f8a4a', { line: '#0a1406', lw: 2 });
        s += K.line(`M${bx} ${by}Q${mx} ${my} ${hx} ${hy + 6}`, '#c5dba4', 3, { op: 0.45 });
      }
      // головы
      for (const i of order) {
        const [hx, hy] = H[i], sleepy = i % 2 === 1;
        s += K.vol(K.ell(hx, hy, 14, 11.5), { ...sc, tex: false, lw: 2 });
        s += K.part(`M${hx - 9} ${r1(hy - 9)}L${hx - 6} ${r1(hy - 17)}L${hx - 3} ${r1(hy - 10)}ZM${hx + 9} ${r1(hy - 9)}L${hx + 6} ${r1(hy - 17)}L${hx + 3} ${r1(hy - 10)}Z`, '#e7e5e4', { line: '#0a1406', lw: 1 });
        if (sleepy) s += K.closed(hx, hy - 1, 5, 3, false) + `<path d="M${hx + 12} ${hy - 16}h5l-5 5h5" fill="none" stroke="#e9d5ff" stroke-width="1.4" class="art-blink"/>`;
        else s += K.glow(hx - 5, hy - 2, 2.6, 3, '#f87171') + K.glow(hx + 5, hy - 2, 2.6, 3, '#f87171');
        s += `<ellipse cx="${hx - 2.4}" cy="${r1(hy + 5)}" rx="1" ry=".8" fill="#0a1406"/><ellipse cx="${hx + 2.4}" cy="${r1(hy + 5)}" rx="1" ry=".8" fill="#0a1406"/>`;
        if (!sleepy) s += K.line(`M${hx} ${r1(hy + 10)}v5M${hx} ${r1(hy + 15)}l-2 2M${hx} ${r1(hy + 15)}l2 2`, '#dc2626', 1.2);
      }
      // тело-холм с кипарисами и мхом
      s += K.vol('M20 178C22 152 50 132 100 130C150 132 178 152 180 178Z', sc);
      s += `<g fill="#a3c46a" opacity=".55"><ellipse cx="60" cy="152" rx="10" ry="4"/><ellipse cx="128" cy="146" rx="12" ry="4.4"/><ellipse cx="100" cy="164" rx="9" ry="3.4"/><ellipse cx="156" cy="166" rx="8" ry="3"/></g>`;
      const cyp = (x, y, k) => K.part(`M${x} ${y - 24 * k}C${r1(x + 7 * k)} ${r1(y - 14 * k)} ${r1(x + 8 * k)} ${r1(y - 4 * k)} ${r1(x + 5 * k)} ${y}H${r1(x - 5 * k)}C${r1(x - 8 * k)} ${r1(y - 4 * k)} ${r1(x - 7 * k)} ${r1(y - 14 * k)} ${x} ${y - 24 * k}Z`, '#2f5d3a', { line: '#0f2418', lw: 1.2 });
      s += cyp(44, 154, 0.9) + cyp(80, 140, 1) + cyp(118, 138, 1.1) + cyp(150, 150, 0.9);
      // чаны с угощением
      const vat = x => K.vol(`M${x - 14} 160H${x + 14}L${x + 12} 180H${x - 12}Z`, { c1: '#e8b86a', c2: '#8a5a24', rim: '#e9d5ff', rimK: 0.4, line: '#3b2410', tex: false, lw: 1.8 }) +
        K.line(`M${x - 13} 166H${x + 13}M${x - 12.5} 174H${x + 12.5}`, '#5a3a14', 1.8) + `<ellipse cx="${x}" cy="160" rx="14" ry="3.4" fill="#fef3c7" stroke="#3b2410" stroke-width="1.4"/>`;
      s += vat(30) + vat(170);
      s += K.spark(100, 10, 2.8, '#e9d5ff', 'art-float') + K.spark(14, 110, 2.4, '#f5f3ff') + K.spark(188, 104, 2.4, '#e9d5ff');
      return s;
    },

    // Канаяго-ками: богиня кузнецов прилетела на белой цапле — сидит на спине большой птицы с распахнутыми крыльями; поднимает
    // раскалённый докрасна кузнечный молот, вокруг летят искры; кимоно цвета ржавчины с золотыми узорами, волосы под белым платком;
    // внизу пышет жаром глиняная плавильная печь-татара
    jp_kanayago(K) {
      const robe = { c1: '#f0a46a', c2: '#7c2d12', rim: '#fff6b0', rimK: 0.6, line: '#3a1206', texK: 0.25 };
      const skin = { c1: '#fff0e2', c2: '#e6b08a', rim: '#fff6b0', rimK: 0.4, line: '#7a4a2a', tex: false, lw: 2.2 };
      const fea = { c1: '#ffffff', c2: '#c4cede', rim: '#fff6b0', rimK: 0.55, line: '#334155', texK: 0.16 };
      let s = K.aura('#facc15', 100, 100, 0.42) + K.aura('#f97316', 60, 160, 0.3);
      // печь-татара
      s += K.vol('M66 180L72 150H128L134 180Z', { c1: '#d6a77a', c2: '#6b3a1a', rim: '#fff6b0', rimK: 0.4, line: '#2a1206', tex: false });
      s += `<ellipse cx="100" cy="166" rx="10" ry="7" fill="${K.rad([[0, '#fffbe6'], [0.5, '#fb923c'], [1, '#9a3412']])}" stroke="#2a1206" stroke-width="1.4"/>`;
      s += K.flame(86, 152, 22, 14, '#fff3b0', '#f97316', { style: 'animation-delay:-.3s' }) + K.flame(100, 152, 30, 18, '#fff3b0', '#ef4444') + K.flame(114, 152, 22, 14, '#fff3b0', '#f97316', { style: 'animation-delay:-.7s' });
      // крылья цапли
      const wd = 'M84 112C64 96 40 88 10 92C4 94 4 100 10 102C2 106 4 114 12 114C6 120 10 126 18 124C14 132 22 136 28 130C28 138 36 142 42 134C46 142 56 142 58 134C64 136 72 132 74 126Z';
      s += K.mirror('<g class="art-wing">' + K.part(wd, '#ffffff', { line: '#334155', lw: 2 }) + K.line('M18 98C40 98 60 106 76 118M18 112C36 112 54 118 70 126', '#cbd5e1', 1.4, { op: 0.9 }) +
        K.line('M10 96l6 2M12 108l6 2M18 120l6 1', '#1f2937', 2) + '</g>');
      // тело цапли, шея и голова
      s += K.vol('M100 104C124 104 140 116 140 130C140 144 122 150 100 150C78 150 60 144 60 130C60 116 76 104 100 104Z', fea);
      s += K.vol(tube([[70, 118], [52, 100], [44, 76], [52, 58]], 11, 5), fea);
      s += K.vol(K.ell(54, 54, 10, 8), { ...fea, tex: false });
      s += K.part('M46 54L18 60L46 58Z', '#facc15', { line: '#78350f', lw: 1.2 }) + `<circle cx="52" cy="52" r="2" fill="${INK}"/><circle cx="51.4" cy="51.4" r=".7" fill="#fff"/>`;
      s += K.g(K.line('M58 48C66 42 74 44 80 38M58 50C66 48 72 50 78 46', '#1f2937', 1.6), '', 'art-sway');
      // богиня на спине цапли
      s += K.vol('M100 70C116 70 126 80 128 94L132 118H68L72 94C74 80 84 70 100 70Z', robe);
      s += K.line('M88 72L100 90L112 72', '#fde68a', 3) + K.line('M70 108H130', '#fbbf24', 4);
      s += K.line('M76 96q6-4 12 0M112 96q6-4 12 0M84 112q6-4 12 0', '#fde68a', 1.4, { op: 0.8 });
      s += K.vol('M74 78C64 84 60 96 62 108C66 114 74 114 78 108C76 98 78 90 84 84Z', robe) + K.vol(K.ell(70, 110, 6, 5.6), skin);
      s += K.part('M62 108C58 112 60 118 66 118C72 118 74 112 70 108Z', '#1f2937', { line: '#020617', lw: 1.2 }) + `<g fill="#9ca3af"><circle cx="64" cy="114" r=".8"/><circle cx="67" cy="112" r=".8"/></g>`;
      // поднятый молот
      s += K.vol('M126 80C136 72 142 60 144 46C146 40 152 40 154 46C152 62 144 78 132 88Z', robe) + K.vol(K.ell(149, 44, 6.4, 6), skin);
      s += K.line('M149 50L149 14', '#451a03', 5) + K.line('M149 50L149 14', '#a16207', 2.6);
      s += `<rect x="134" y="4" width="30" height="16" rx="3" fill="${K.lin(['#fde68a', '#f97316', '#b91c1c'])}" stroke="#450a0a" stroke-width="1.8"/>`;
      s += `<circle class="art-aura" cx="149" cy="12" r="18" fill="${K.rad([[0, '#fff3b0', 0.8], [1, '#f97316', 0]])}"/>`;
      // голова в белом платке
      s += K.vol(K.ell(100, 50, 16, 17.5), skin);
      s += K.part('M82 50C80 32 90 26 100 26C110 26 120 32 118 50C114 40 108 36 100 36C92 36 86 40 82 50Z', '#f8fafc', { line: '#64748b', lw: 1.4 });
      s += K.line('M84 46C80 56 80 64 84 70M116 46C120 56 120 64 116 70', '#1f1a24', 3);
      s += K.g(K.part('M116 34C124 34 130 40 132 46C126 44 120 42 116 40Z', '#f8fafc', { line: '#64748b', lw: 1.2 }), '', 'art-sway');
      s += K.eyes(100, 52, 7.2, 4.8, { iris: '#c2410c', look: [0.4, -0.3] });
      s += K.mouth('smile', 100, 62, 8);
      s += K.blush(88, 60, 3.6) + K.blush(112, 60, 3.6);
      // искры
      for (const [x, y, d] of [[166, 30, 0.2], [128, 22, 0.8], [176, 54, 1.3], [118, 6, 0.5], [30, 150, 0.9], [170, 140, 0.4]]) s += K.spark(x, y, 3.2, d > 1 ? '#fde047' : '#fff3b0', 'art-blink');
      return s;
    },

    // ===================== ЛЕГЕНДЫ =====================

    // Цукуёми (легенда): бог Луны стоит на облаке над ночным морем — за ним огромный серебряный серп и кольцо из восьми лунных фаз
    // («цуки-ёми» — «счёт месяцев»); длинные серебристые волосы, венец-полумесяц, белое одеяние под тёмно-синим плащом в звёздах,
    // в ладонях светится лунная жемчужина; по воде бежит лунная дорожка
    jp_tsukuyomi(K) {
      const robe = { c1: '#ffffff', c2: '#c7d2fe', rim: '#e9d5ff', rimK: 0.6, line: '#1e1b4b', texK: 0.25 };
      const cloak = { c1: '#6366f1', c2: '#1e1b4b', rim: '#e9d5ff', rimK: 0.65, line: '#0b0a26', texK: 0.35 };
      const skin = { c1: '#fff7f5', c2: '#d9c6d8', rim: '#e9d5ff', rimK: 0.4, line: '#5b4a6a', tex: false, lw: 2.2 };
      const hair = { c1: '#ffffff', c2: '#a5b4fc', rim: '#e9d5ff', rimK: 0.5, line: '#3730a3', texK: 0.1 };
      let s = K.aura('#c084fc', 100, 96, 0.5) + K.aura('#e0e7ff', 70, 62, 0.25);
      // большой серп луны
      const mk = K.id('m');
      K.def(`<mask id="${mk}" maskUnits="userSpaceOnUse" x="-20" y="-20" width="240" height="240"><circle cx="100" cy="62" r="66" fill="#fff"/><circle cx="128" cy="48" r="58" fill="#000"/></mask>`);
      s += `<circle class="art-aura" cx="70" cy="70" r="70" fill="${K.rad([[0.3, '#e0e7ff', 0.45], [1, '#a5b4fc', 0]])}"/>`;
      s += `<g mask="url(#${mk})"><circle cx="100" cy="62" r="66" fill="${K.rad([[0, '#ffffff'], [0.6, '#eef2ff'], [1, '#c7d2fe']], 0.25, 0.5)}" stroke="#6366f1" stroke-width="3"/></g>`;
      s += kumo(K, 26, 112, 0.7, { c1: '#c7d2fe', c2: '#4338ca', line: '#1e1b4b', cls: 'art-float' }) + kumo(K, 176, 104, 0.65, { c1: '#c7d2fe', c2: '#4338ca', line: '#1e1b4b', flip: true, cls: 'art-float', d: 1.2 });
      // кольцо лунных фаз
      for (let i = 0; i < 8; i++) {
        const a = (i * 45 - 90) * Math.PI / 180, x = r1(100 + 64 * Math.cos(a)), y = r1(60 + 58 * Math.sin(a)), k = i / 8, dx = r1((k < 0.5 ? 1 - 4 * k : 4 * k - 3) * 7);
        const id = K.id('m');
        K.def(`<clipPath id="${id}"><circle cx="${x}" cy="${y}" r="6"/></clipPath>`);
        s += `<g class="art-blink" style="animation-delay:-${(i * 0.2).toFixed(1)}s"><circle cx="${x}" cy="${y}" r="6" fill="#fef9c3" stroke="#a5b4fc" stroke-width="1.2"/>` + (i ? `<circle clip-path="url(#${id})" cx="${r1(x + (k < 0.5 ? -dx : dx))}" cy="${y}" r="6" fill="#312e81" opacity=".85"/>` : '') + '</g>';
      }
      // ночное море с лунной дорожкой
      s += `<path d="M0 200V164H200V200Z" fill="${K.lin(['#312e81', '#0b0a26'])}"/>`;
      s += K.g(K.line('M92 170h16M86 178h28M94 186h12M80 194h40', '#e0e7ff', 2, { op: 0.8 }), '', 'art-blink');
      s += K.line('M10 172q8-4 16 0M40 182q8-4 16 0M150 176q8-4 16 0M176 188q8-4 16 0', '#a5b4fc', 1.6, { op: 0.7 });
      // облако под ногами
      s += kumo(K, 100, 168, 1.6, { c1: '#ffffff', c2: '#c7d2fe', line: '#3730a3' });
      // волосы сзади
      s += K.vol('M76 48C64 74 60 110 62 140C70 136 78 128 84 116L116 116C122 128 130 136 138 140C140 110 136 74 124 48Z', hair);
      // плащ в звёздах и белое одеяние
      s += K.vol('M100 80C124 80 138 94 142 114L154 164H46L58 114C62 94 76 80 100 80Z', cloak);
      s += `<g fill="#e0e7ff">${[[64, 140], [80, 120], [72, 156], [128, 126], [138, 150], [120, 158], [90, 150], [112, 140]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4"/>`).join('')}</g>`;
      s += K.spark(66, 128, 3, '#e0e7ff') + K.spark(132, 138, 3, '#e0e7ff');
      s += K.vol('M100 84C112 84 120 92 122 104L126 164H74L78 104C80 92 88 84 100 84Z', robe);
      s += K.line('M88 86L100 106L112 86', '#6366f1', 3) + K.line('M76 126Q100 132 124 126', '#c7d2fe', 4) + K.line('M76 126Q100 132 124 126', '#6366f1', 1.2);
      s += K.line('M84 136L82 164M100 134V164M116 136L118 164', '#a5b4fc', 1.2, { op: 0.6 });
      // рукава
      s += K.mirror(K.vol('M78 90C60 98 50 118 50 142C56 152 70 154 80 148C80 130 84 112 92 102Z', cloak) + K.stitch('M52 144C60 152 70 152 78 148', '#e0e7ff', 1.4));
      // лунная жемчужина в ладонях
      s += `<circle class="art-aura" cx="100" cy="112" r="24" fill="${K.rad([[0, '#ffffff', 0.95], [0.4, '#e0e7ff', 0.5], [1, '#a5b4fc', 0]])}"/>`;
      s += `<circle cx="100" cy="112" r="9" fill="${K.rad([[0, '#ffffff'], [0.7, '#e0e7ff'], [1, '#a5b4fc']], 0.35, 0.3)}" stroke="#4338ca" stroke-width="1.4"/><path d="M97 106a7 7 0 1 0 9 9a5.4 5.4 0 1 1-9-9Z" fill="#a5b4fc" opacity=".8"/>`;
      s += K.part(K.ell(88, 120, 6, 5.2), skin.c1, { line: skin.line, lw: 1.3 }) + K.part(K.ell(112, 120, 6, 5.2), skin.c1, { line: skin.line, lw: 1.3 });
      // ожерелье магатама
      s += K.line('M86 88Q100 100 114 88', '#3730a3', 1.2) + magatama(91, 93, 3.4, -30, '#e0e7ff') + magatama(109, 93, 3.4, 30, '#e0e7ff');
      // голова
      s += K.vol(K.ell(100, 60, 17, 19), skin);
      s += K.part('M82.5 60C80 40 90 34 100 34C110 34 120 40 117.5 60C114 50 108 46 100 46C92 46 86 50 82.5 60Z', '#f8fafc', { line: '#3730a3', lw: 1.4 });
      s += K.line('M84 52C80 66 80 80 84 92M116 52C120 66 120 80 116 92', '#eef2ff', 4) + K.line('M84 52C80 66 80 80 84 92M116 52C120 66 120 80 116 92', '#a5b4fc', 1.2, { op: 0.8 });
      // венец-полумесяц
      s += `<path d="M90 30A12 12 0 0 0 110 30A14 14 0 0 1 90 30Z" fill="#e0e7ff" stroke="#4338ca" stroke-width="1.4"/>` + K.line('M84 40Q100 32 116 40', '#c7d2fe', 2.6) + `<circle cx="100" cy="36" r="2.4" fill="#a5b4fc" stroke="#3730a3" stroke-width=".8"/>`;
      s += K.eyes(100, 62, 7.5, 4.8, { iris: '#818cf8', lid: 'half', skin: '#fff7f5', lash: true, look: [0, 0.3] });
      s += K.blush(88, 70, 3.4) + K.blush(112, 70, 3.4);
      s += `<path d="M97 75Q100 77 103 75" stroke="#7c3aed" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
      s += K.spark(18, 40, 3, '#ffffff', 'art-float') + K.spark(182, 24, 2.6, '#e0e7ff') + K.spark(176, 120, 2.4, '#ffffff', 'art-float') + K.spark(20, 120, 2.2, '#e0e7ff');
      return s;
    },

    // Идзанаги (легенда): бог-прародитель стоит на Небесном плавучем мосту — радужной дуге среди облаков; древние петли волос-мидзура
    // с бусинами, короткая борода, золотой обруч, белое одеяние с синей накидкой и магатама; держит драгоценное копьё Нубоко, его остриё
    // опущено в море, и с наконечника падают капли — из них рождается первый островок Оногоро
    jp_izanagi(K) {
      const robe = { c1: '#ffffff', c2: '#cbd5e1', rim: '#eef0ff', rimK: 0.55, line: '#1e293b', texK: 0.22 };
      const cape = { c1: '#60a5fa', c2: '#1e3a8a', rim: '#eef0ff', rimK: 0.6, line: '#0b1640', texK: 0.25 };
      const skin = { c1: '#ffe6cf', c2: '#dba27c', rim: '#eef0ff', rimK: 0.4, line: '#7a4a2a', tex: false, lw: 2.2 };
      let s = K.aura('#a5b4fc', 100, 96, 0.5) + K.aura('#fde68a', 64, 60, 0.2);
      s += kumo(K, 30, 30, 0.8, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca', cls: 'art-float' }) + kumo(K, 172, 40, 0.75, { c1: '#ffffff', c2: '#c7d2fe', line: '#4338ca', flip: true, cls: 'art-float', d: 1.2 });
      s += K.g(K.line(spiral(20, 96, 1.2, 1.8) + spiral(184, 90, 1.1, 1.8), '#e0e7ff', 2), '', 'art-spin');
      // море и островок
      s += `<path d="M0 200V170H200V200Z" fill="${K.lin(['#38bdf8', '#1e3a8a'])}"/>` + `<path d="${seigaiha(0, 200, 186, 9)}" fill="none" stroke="#bfdbfe" stroke-width="1.4" opacity=".8"/>`;
      s += K.part('M138 176C142 166 154 162 164 164C172 166 178 172 180 176Z', '#84cc16', { line: '#1a2e05', lw: 1.6 }) + K.leaf(156, 166, 10, -100, '#4d7c0f') + K.leaf(160, 166, 9, -60, '#65a30d');
      s += '<g class="art-aura"><ellipse cx="160" cy="177" rx="26" ry="4" fill="none" stroke="#e0f2fe" stroke-width="1.4" opacity=".7"/></g>';
      // радужный мост
      const arc = 'M-6 168Q100 92 206 168';
      ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#8b5cf6'].forEach((c, i) => { s += `<path d="${arc}" transform="translate(0 ${i * 4.4})" fill="none" stroke="${c}" stroke-width="4.6" opacity=".92"/>`; });
      s += `<path d="${arc}" fill="none" stroke="#1e293b" stroke-width="1.4" transform="translate(0 -2.4)"/><path d="${arc}" fill="none" stroke="#1e293b" stroke-width="1.4" transform="translate(0 24.4)"/>`;
      // копьё Нубоко и капли
      s += K.line('M58 34L150 160', '#451a03', 5) + K.line('M58 34L150 160', '#d6a756', 2.6);
      s += K.part('M146 150L162 172L150 162Z', '#e2e8f0', { line: '#1e293b', lw: 1.4 }) + K.part('M144 148L152 144L156 152L148 156Z', '#fbbf24', { line: '#78350f', lw: 1.2 });
      s += magatama(66, 44, 4.4, 20, '#34d399') + magatama(76, 58, 4, -20, '#60a5fa') + `<circle cx="58" cy="34" r="4.4" fill="${K.rad([[0, '#fffbe6'], [1, '#d97706']], 0.35, 0.3)}" stroke="#78350f" stroke-width="1.2"/>`;
      s += [[164, 176, 0.1], [160, 168, 0.6], [166, 158, 1.2]].map(([x, y, d]) => `<g class="art-blink" style="animation-delay:-${d}s"><path d="M${x} ${y - 7}C${x + 3} ${y - 3} ${x + 4} ${y} ${x} ${y + 2}C${x - 4} ${y} ${x - 3} ${y - 3} ${x} ${y - 7}Z" fill="#bae6fd" stroke="#0c4a6e" stroke-width="1"/></g>`).join('');
      // ноги на мосту
      s += K.mirror(K.vol('M82 118C80 124 80 130 82 134H96V120Z', robe) + K.part('M76 132H97L98 138H74Z', '#3f2a14', { line: '#1c120a', lw: 1.2 }));
      // небесные ленты за спиной
      s += K.g(K.part(tube([[76, 70], [54, 58], [40, 72], [22, 62], [10, 70]], 5, 5), '#fef3c7', { line: '#a16207', lw: 1.2 }) + K.part(tube([[124, 70], [146, 60], [160, 74], [178, 64], [190, 72]], 5, 5), '#fef3c7', { line: '#a16207', lw: 1.2 }), '', 'art-float');
      // одеяние и накидка
      s += K.vol('M100 62C118 62 128 74 130 90L134 124H66L70 90C72 74 82 62 100 62Z', robe);
      s += K.vol('M84 66C72 70 66 82 64 98L60 128H78L88 86Z', cape) + K.vol('M116 66C128 70 134 82 136 98L140 128H122L112 86Z', cape);
      s += K.line('M68 108H132', '#fbbf24', 4) + K.rhomb(100, 108, 4.4, '#dc2626', '#78350f');
      s += K.line('M86 68Q100 82 114 68', '#78350f', 1.2) + magatama(90, 74, 3.4, -30) + magatama(100, 78, 4, 0, '#34d399') + magatama(110, 74, 3.4, 30);
      // руки держат копьё
      s += K.vol('M74 72C64 66 60 58 60 50L68 48C70 56 74 60 82 64Z', robe) + K.vol(K.ell(64, 46, 6.6, 6.2), skin);
      s += K.vol('M126 74C126 84 120 90 112 92L108 86C114 84 118 80 118 74Z', robe) + K.vol(K.ell(108, 88, 6.6, 6.2), skin);
      // голова с мидзура
      s += K.mirror(K.vol('M82 30C72 30 66 38 68 48C70 56 78 58 82 52C78 48 78 40 84 36Z', { c1: '#3a3344', c2: '#0b0a10', rim: '#eef0ff', rimK: 0.35, line: '#0b0a10', lw: 1.6, tex: false }) + `<circle cx="70" cy="40" r="2.6" fill="#34d399" stroke="#064e3b" stroke-width=".8"/>`);
      s += K.vol(K.ell(100, 36, 16.5, 18), skin);
      s += K.part('M83 34C81 18 90 12 100 12C110 12 119 18 117 34C112 26 106 22 100 22C94 22 88 26 83 34Z', '#1f1a24', { line: '#0b0a10', lw: 1.4 });
      s += K.line('M84 24Q100 16 116 24', '#fbbf24', 3) + K.rhomb(100, 19, 3.4, '#60a5fa', '#78350f');
      s += K.mirror(K.part('M86 32C90 28 95 28 98 32L97 35C94 32 90 32 87 35Z', '#1f1a24', { lw: 0 }));
      s += K.eyes(100, 38, 7, 4.6, { iris: '#1e3a8a', lid: 'angry', skin: '#ffe6cf', look: [0.4, 0.3] });
      s += K.part('M88 44C88 54 94 60 100 60C106 60 112 54 112 44C108 48 104 50 100 49C96 50 92 48 88 44Z', '#1f1a24', { line: '#0b0a10', lw: 1 });
      s += K.line('M95 49H105', '#dba27c', 1.6);
      s += K.spark(100, 4, 3, '#fde68a', 'art-float') + K.spark(130, 22, 2.6, '#ffffff') + K.spark(14, 150, 2.4, '#e0e7ff');
      return s;
    },

    // Идзанами (легенда): богиня-прародительница и владычица Ёми — длинные чёрные волосы с серебряными подвесками, тёмный венец
    // с лиловыми камнями, многослойное одеяние глубокого фиолетового цвета с розовыми узорами; в ладонях бережно держит светящийся
    // шар с первыми зелёными островами Японии. Позади — каменные врата Ёми в лиловом тумане, вокруг парят огоньки и лепестки персика
    jp_izanami(K) {
      const robe = { c1: '#c084fc', c2: '#3b0764', rim: '#f5d0fe', rimK: 0.65, line: '#1a0330', texK: 0.3 };
      const inner = { c1: '#fdf2f8', c2: '#f0abfc', rim: '#f5d0fe', rimK: 0.5, line: '#701a75', texK: 0.2 };
      const skin = { c1: '#fff5f7', c2: '#dcc0cc', rim: '#f5d0fe', rimK: 0.4, line: '#6b4058', tex: false, lw: 2.2 };
      let s = K.aura('#c084fc', 100, 96, 0.5) + K.aura('#f472b6', 64, 110, 0.22);
      // каменные врата Ёми
      s += K.vol('M14 180C12 120 22 60 56 30C80 10 120 10 144 30C178 60 188 120 186 180H156C156 130 148 84 126 62C112 50 88 50 74 62C52 84 44 130 44 180Z', { c1: '#7c6f8a', c2: '#1f1630', rim: '#f5d0fe', rimK: 0.4, line: '#0c0814', tex: false });
      s += K.line('M28 120L40 128M24 80L36 90M170 110L158 120M176 150L162 156M60 36L68 46M140 36L132 46', '#0c0814', 1.6, { op: 0.6 });
      s += `<path d="M44 180C44 130 52 84 74 62C88 50 112 50 126 62C148 84 156 130 156 180Z" fill="${K.rad([[0, '#a855f7', 0.55], [0.6, '#3b0764', 0.8], [1, '#1a0330', 0.95]], 0.5, 0.45)}"/>`;
      // огоньки Ёми
      s += onibi(K, 30, 60, 18, 0.2) + onibi(K, 172, 66, 16, 0.9) + onibi(K, 24, 140, 14, 1.4) + onibi(K, 178, 146, 15, 0.6);
      // ореол
      s += `<circle cx="100" cy="60" r="34" fill="none" stroke="#f5d0fe" stroke-width="2" stroke-dasharray="2 5" opacity=".8" class="art-aura"/>`;
      // волосы сзади до пола
      s += K.part('M76 46C64 80 58 130 54 176H146C142 130 136 80 124 46Z', '#1a1426', { line: '#08060d', lw: 1.6 });
      s += K.line('M66 96C62 120 60 146 58 170M134 96C138 120 140 146 142 170', '#5b4a7a', 1.4, { op: 0.7 });
      // многослойное одеяние
      s += K.vol('M100 82C122 82 134 96 138 114L150 178H50L62 114C66 96 78 82 100 82Z', robe);
      s += K.line('M52 172H148', '#f9a8d4', 3) + K.line('M53 166H147', '#fdf2f8', 2) + K.line('M88 84L100 106L112 84', '#fdf2f8', 3.4) + K.line('M86 84L100 110L114 84', '#f472b6', 1.6);
      s += K.line('M64 150q6-6 12 0t12 0M112 150q6-6 12 0t12 0M70 132q6-6 12 0M118 132q6-6 12 0', '#f9a8d4', 1.4, { op: 0.8 });
      s += K.part('M70 120Q100 128 130 120L131 130Q100 138 69 130Z', '#f472b6', { line: '#701a75', lw: 1.4 });
      // рукава
      s += K.mirror(K.vol('M76 90C58 98 48 118 48 144C54 154 68 156 80 150C80 130 84 112 92 102Z', robe) + K.line('M50 146C58 154 68 154 78 150', '#f9a8d4', 2.6));
      // шар с островами в ладонях
      s += `<circle class="art-aura" cx="100" cy="112" r="26" fill="${K.rad([[0, '#ecfeff', 0.9], [0.45, '#a5f3fc', 0.45], [1, '#a5f3fc', 0]])}"/>`;
      s += `<circle cx="100" cy="112" r="12" fill="${K.rad([[0, '#e0f2fe'], [0.7, '#38bdf8'], [1, '#0369a1']], 0.35, 0.3)}" stroke="#0c4a6e" stroke-width="1.4"/>`;
      s += K.part('M93 112C95 108 99 108 100 111C98 114 95 115 93 112ZM102 106C105 104 109 106 108 110C106 112 103 110 102 106ZM100 117C103 115 107 116 107 119C104 121 101 120 100 117Z', '#84cc16', { line: '#1a2e05', lw: 0.8 });
      s += `<circle cx="96" cy="107" r="2.2" fill="#fff" opacity=".85"/>`;
      s += K.part(K.ell(87, 122, 6, 5.2), skin.c1, { line: skin.line, lw: 1.3 }) + K.part(K.ell(113, 122, 6, 5.2), skin.c1, { line: skin.line, lw: 1.3 });
      // голова
      s += K.vol(K.ell(100, 60, 17, 19), skin);
      s += K.part('M82.5 60C80 40 90 34 100 34C110 34 120 40 117.5 60C114 50 108 46 100 46C92 46 86 50 82.5 60Z', '#1a1426', { line: '#08060d', lw: 1.4 });
      s += K.line('M84 52C80 66 80 80 84 92M116 52C120 66 120 80 116 92', '#1a1426', 3.4);
      s += K.part('M82 42L86 28L94 36L100 22L106 36L114 28L118 42Q100 36 82 42Z', '#2e1065', { line: '#0c0420', lw: 1.6 });
      s += `<circle cx="100" cy="32" r="3.6" fill="#e879f9" stroke="#701a75" stroke-width="1"/><circle cx="88" cy="38" r="2" fill="#f0abfc"/><circle cx="112" cy="38" r="2" fill="#f0abfc"/>`;
      s += K.g(K.line('M82 44V60M118 44V60', '#e2e8f0', 1.2) + `<circle cx="82" cy="62" r="2.2" fill="#f5d0fe" stroke="#701a75" stroke-width=".8"/><circle cx="118" cy="62" r="2.2" fill="#f5d0fe" stroke="#701a75" stroke-width=".8"/>`, '', 'art-sway');
      s += K.eyes(100, 62, 7.5, 4.8, { iris: '#a21caf', lid: 'half', skin: '#fff5f7', lash: true, look: [0, 0.35] });
      s += K.blush(88, 70, 3.6) + K.blush(112, 70, 3.6);
      s += `<path d="M96.5 75Q100 78 103.5 75Q100 74 96.5 75Z" fill="#be185d" stroke="#831843" stroke-width="1"/>`;
      // лепестки персика
      s += petal(30, 104, 5, 20, '#fbcfe8', 'art-float', 0.3) + petal(170, 104, 5, -30, '#fbcfe8', 'art-float', 1.1) + petal(150, 20, 4.4, 60, '#f9a8d4', 'art-float', 0.7) + petal(46, 18, 4.4, -40, '#fbcfe8', 'art-float', 1.5);
      s += K.spark(100, 8, 3, '#f5d0fe', 'art-float') + K.spark(14, 30, 2.4, '#ffffff') + K.spark(188, 30, 2.4, '#f5d0fe');
      return s;
    },
  });
})();
