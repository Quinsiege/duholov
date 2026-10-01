'use strict';
/* 4.28: рисунки духов и богов египетской мифологии — каждый своей функцией (кисть — js/art-kit.js) */

(() => {
  // --- местные помощники (только для египетских духов) ---
  const r1 = n => Math.round(n * 10) / 10;
  const INK = '#1b1030';
  const cl = (cls, d) => (cls ? ` class="${cls}"` : '') + (d ? ` style="animation-delay:-${d}s"` : '');
  const P = (x, y, r, a) => `${r1(x + r * Math.cos(a))} ${r1(y + r * Math.sin(a))}`;
  const ellV = (K, cx, cy, rx, ry, rot, o) => { const e = K.ell(cx, cy, rx, ry, rot); return rot ? K.vol(e.d, { ...o, t: e.t }) : K.vol(e, o); };
  // обрезка по контуру
  const clip = (K, d, inner) => { const i = K.id('c'); K.def(`<clipPath id="${i}"><path d="${d}"/></clipPath>`); return `<g clip-path="url(#${i})">${inner}</g>`; };
  // полосатая ткань (немес, парик, передник): полосы a/b шагом step, наклон rot, мягкий объём и обводка
  const stripes = (K, d, a, b, step = 5, rot = 0, line = '#2a1a06', lw = 2) => {
    let r = `<rect x="-20" y="-20" width="240" height="240" fill="${a}"/>`;
    for (let y = -60; y < 260; y += step * 2) r += `<rect x="-60" y="${y}" width="320" height="${step}" fill="${b}"/>`;
    r = rot ? `<g transform="rotate(${rot} 100 100)">${r}</g>` : r;
    r += `<rect x="-20" y="-20" width="240" height="240" fill="${K.rad([[0, '#fff', 0.35], [0.55, '#fff', 0], [1, '#000', 0.35]], 0.3, 0.2, 0.95)}"/>`;
    return clip(K, d, r) + `<path d="${d}" fill="none" stroke="${line}" stroke-width="${lw}" stroke-linejoin="round"/>`;
  };
  // солнечный шар / диск с лучами
  const sunBall = (K, x, y, r, rays = true) => {
    let s = `<circle class="art-aura" cx="${x}" cy="${y}" r="${r1(r * 1.9)}" fill="${K.rad([[0, '#fff6c2', 0.95], [0.4, '#ffd23f', 0.55], [1, '#ff7a1a', 0]])}"/>`;
    if (rays) {
      let d = '';
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, w = 0.14; d += `M${P(x, y, r * 1.06, a - w)}L${P(x, y, r * (i % 2 ? 1.42 : 1.6), a)}L${P(x, y, r * 1.06, a + w)}Z`; }
      s += `<g class="art-spin-soft"><path d="${d}" fill="#ffd23f" stroke="#c2410c" stroke-width="1" stroke-linejoin="round"/></g>`;
    }
    s += K.vol(K.ell(x, y, r, r), { c1: '#fff0a0', c2: '#f97316', rim: '#fff6c2', rimK: 0.7, tex: false, lw: 2, line: '#9a3412' });
    s += K.gloss(r1(x - r * 0.38), r1(y - r * 0.38), r1(r * 0.3), r1(r * 0.17), -35, 0.6);
    return s;
  };
  // широкое ожерелье-усех: ряды бирюзы, золота, сердолика и лазурита, внизу — подвески-капли
  const collar = (K, cx, cy, rx, ry, n = 4) => {
    const cols = ['#2dd4bf', '#fbbf24', '#dc2626', '#1d4ed8'];
    const ix = rx * 0.52, iy = cy - ry * 0.2, iyc = cy + ry * 0.9, oy = cy + ry * 2;
    const d = `M${r1(cx - rx)} ${cy}Q${cx} ${r1(oy)} ${r1(cx + rx)} ${cy}L${r1(cx + ix)} ${r1(iy)}Q${cx} ${r1(iyc)} ${r1(cx - ix)} ${r1(iy)}Z`;
    let s = K.part(d, '#fbbf24', { line: '#5a3a06', lw: 1.8 });
    const sw = r1((oy - iyc) / 2 / n * 0.8);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, w = ix + (rx - ix) * t, ey = iy + (cy - iy) * t, cy2 = iyc + (oy - iyc) * t;
      s += K.line(`M${r1(cx - w)} ${r1(ey)}Q${cx} ${r1(cy2)} ${r1(cx + w)} ${r1(ey)}`, cols[k % 4], sw);
    }
    for (let i = 1; i < 10; i++) {
      const u = i / 10, x = (1 - u) * (1 - u) * (cx - rx) + 2 * u * (1 - u) * cx + u * u * (cx + rx), y = (1 - u) * (1 - u) * cy + 2 * u * (1 - u) * oy + u * u * cy;
      s += `<ellipse cx="${r1(x)}" cy="${r1(y + 1.6)}" rx="${r1(rx * 0.045 + 0.6)}" ry="${r1(rx * 0.07 + 1)}" fill="${i % 2 ? '#dc2626' : '#2dd4bf'}" stroke="#5a3a06" stroke-width=".8"/>`;
    }
    return s + `<path d="${d}" fill="none" stroke="#5a3a06" stroke-width="1.8" stroke-linejoin="round"/>`;
  };
  // анх — знак жизни
  const ANKH = 'M0 -3C-5.5 -6 -5.5 -15 0 -15C5.5 -15 5.5 -6 0 -3ZM-8 -3H8M0 -3V13';
  const ankh = (K, x, y, s = 1, c = '#fbbf24', line = '#5a3a06') => `<g transform="translate(${x} ${y}) scale(${s})">` + K.line(ANKH, line, 5.4) + K.line(ANKH, c, 3.2) +
    K.line('M-1.8 -12.5C-3.2 -10 -3.2 -7.5 -1.8 -5.5', '#fff7d6', 1.1, { op: 0.85 }) + '</g>';
  // посох-уас: навершие-голова зверя, внизу вилка
  const was = (K, x, y1, y2, c = '#fbbf24') => {
    const d = `M${x} ${y2}V${y1}L${x + 9} ${y1 - 4}L${x + 6} ${y1 - 9}M${x} ${y1 + 2}L${x - 3} ${y1 - 3}M${x} ${y2}l-5 6M${x} ${y2}l5 6`;
    return K.line(d, '#4a2a06', 5.6) + K.line(d, c, 3.2) + K.line(`M${x - 0.8} ${y2 - 4}V${y1 + 6}`, '#fff7d6', 1, { op: 0.7 });
  };
  // иероглифы для неоновых надписей
  const GLYPH = {
    ankh: 'M0 -3C-5 -6 -5 -14 0 -14C5 -14 5 -6 0 -3ZM-7 -3H7M0 -3V12',
    eye: 'M-10 0Q0 -8 10 0Q0 6 -10 0ZM10 0H15M-1 4L-3 12M3 4Q5 11 10 10M-10 -7Q0 -12 10 -7',
    water: 'M-12 0l3 -4l3 4l3 -4l3 4l3 -4l3 4l3 -4l3 4',
    reed: 'M0 10V-8Q5 -6 4 0M0 -8Q-4 -12 -2 -14',
    sun: 'M7 0A7 7 0 1 0 -7 0A7 7 0 1 0 7 0ZM1.6 0A1.6 1.6 0 1 0 -1.6 0A1.6 1.6 0 1 0 1.6 0Z',
    feather: 'M0 12V-12M0 -12C7 -8 7 4 0 10M0 -6L4 -4M0 0L4 2',
    bird: 'M-9 4Q-2 -2 4 -2L9 -6L8 -1Q6 6 -2 6ZM-2 6L-4 11M2 6L2 11',
    ask: 'M-5 -6C-5 -13 5 -13 5 -6C5 -2 0 -1 0 4M0 9V9.5',
  };
  const neon = (K, x, y, g, c, s = 1, d = 0) => `<g transform="translate(${x} ${y}) scale(${s})"><g${cl('art-blink', d)}>` + K.line(GLYPH[g], c, 6, { op: 0.3 }) + K.line(GLYPH[g], c, 3) + K.line(GLYPH[g], '#fffbe6', 1.2) + '</g></g>';
  // око Уаджет
  const wedjat = (K, x, y, s = 1, c = '#1e3a8a') => `<g transform="translate(${x} ${y}) scale(${s})">` + K.line(GLYPH.eye, c, 2.2) + `<circle cx="0" cy="-1" r="3" fill="${c}"/></g>`;
  // лотос: основание (x, y), лепестки веером вверх
  const lotus = (K, x, y, s = 1, rot = 0, c = '#60a5fa') => {
    const pet = 'M0 0C-4 -5 -4 -13 0 -19C4 -13 4 -5 0 0Z', pf = K.lin([c, '#eff6ff']);
    let g = '';
    for (const a of [-62, 62, -36, 36, -14, 14, 0]) g += `<path d="${pet}" transform="rotate(${a})" fill="${pf}" stroke="${K.shade(c, -0.5)}" stroke-width="1.1"/>`;
    g += '<path d="M-8 -1Q0 6 8 -1Q0 2 -8 -1Z" fill="#65a30d" stroke="#1f4a0e" stroke-width="1"/>';
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${g}</g>`;
  };
  // стебель папируса с зонтиком-метёлкой; качается
  const papyrus = (K, x, y, h, lean = 0, d = 0) => {
    const tx = x + lean, ty = y - h, st = `M${x} ${y}Q${r1(x + lean * 0.2)} ${r1(y - h * 0.5)} ${tx} ${ty}`;
    let s = K.line(st, '#1f4a0e', 4.4) + K.line(st, '#65a30d', 2.2), fan = '', dots = '';
    for (let i = 0; i <= 10; i++) { const a = (-165 + i * 15) * Math.PI / 180; fan += `M${tx} ${ty}L${P(tx, ty, 15, a)}`; dots += `<circle cx="${P(tx, ty, 15.5, a).split(' ')[0]}" cy="${P(tx, ty, 15.5, a).split(' ')[1]}" r="1.5" fill="#bef264"/>`; }
    s += K.line(fan, '#1f4a0e', 2.6) + K.line(fan, '#84cc16', 1.3) + dots + `<path d="M${tx - 4} ${ty + 5}L${tx} ${ty - 2}L${tx + 4} ${ty + 5}Z" fill="#3f6212" stroke="#1f4a0e" stroke-width="1"/>`;
    return `<g class="art-sway" style="animation-delay:-${d}s;transform-origin:50% 100%">${s}</g>`;
  };
  // колос: основание (x, y), высота h, поворот
  const wheat = (K, x, y, h, rot = 0) => {
    let s = K.line(`M0 0V${-h}`, '#a16207', 1.8);
    for (let k = 0; k < 4; k++) { const yy = -h + 4 + k * 5; s += `<ellipse cx="-2.6" cy="${yy}" rx="2.1" ry="3.8" transform="rotate(-25 -2.6 ${yy})" fill="#f5c542" stroke="#a16207" stroke-width=".9"/><ellipse cx="2.6" cy="${yy}" rx="2.1" ry="3.8" transform="rotate(25 2.6 ${yy})" fill="#f5c542" stroke="#a16207" stroke-width=".9"/>`; }
    s += `<ellipse cx="0" cy="${-h - 1}" rx="1.9" ry="3.6" fill="#f5c542" stroke="#a16207" stroke-width=".9"/>` + K.line(`M0 ${-h - 3}l-2 -8M0 ${-h - 3}l2 -8`, '#d9a53a', 0.8);
    return `<g transform="translate(${x} ${y}) rotate(${rot})">${s}</g>`;
  };
  // пирамида вдали
  const pyr = (K, x, y, w, h, op = 1) => `<g opacity="${op}"><path d="M${r1(x - w / 2)} ${y}L${x} ${r1(y - h)}L${r1(x + w * 0.1)} ${y}Z" fill="#f1cf86"/><path d="M${x} ${r1(y - h)}L${r1(x + w / 2)} ${y}L${r1(x + w * 0.1)} ${y}Z" fill="#b8843a"/>` +
    `<path d="M${r1(x - w * 0.3)} ${r1(y - h * 0.4)}L${r1(x + w * 0.05)} ${r1(y - h * 0.4)}M${r1(x - w * 0.18)} ${r1(y - h * 0.7)}L${r1(x + w * 0.02)} ${r1(y - h * 0.7)}" stroke="#c99a4a" stroke-width="1" opacity=".7"/>` +
    `<path d="M${r1(x - w / 2)} ${y}L${x} ${r1(y - h)}L${r1(x + w / 2)} ${y}" fill="none" stroke="#7a4a12" stroke-width="1.4" stroke-linejoin="round"/><path d="M${x} ${r1(y - h)}L${r1(x - w * 0.07)} ${r1(y - h * 0.86)}H${r1(x + w * 0.07)}Z" fill="#fde68a"/></g>`;
  // египетское крыло: у плеча — золотые кроющие, дальше бирюза, на концах — лазурит; перья лучами от плеча
  const ewing = (K, W, sx, sy, R1, R2, cols, a0, a1, n) => {
    const [c1, c2, c3] = cols;
    let inner = `<rect x="-20" y="-20" width="240" height="240" fill="${K.lin([K.shade(c3, 0.3), c3, K.shade(c3, -0.25)])}"/><circle cx="${sx}" cy="${sy}" r="${R2}" fill="${c2}"/><circle cx="${sx}" cy="${sy}" r="${R1}" fill="${c1}"/>`;
    let ln = '';
    for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; ln += `M${P(sx, sy, R1 * 0.45, a)}L${P(sx, sy, 220, a)}`; }
    inner += K.line(ln, '#0b1a3a', 1.3, { op: 0.5 });
    inner += `<circle cx="${sx}" cy="${sy}" r="${R1}" fill="none" stroke="#fff7d6" stroke-width="1.6" opacity=".8"/><circle cx="${sx}" cy="${sy}" r="${R2}" fill="none" stroke="#e0f2fe" stroke-width="1.4" opacity=".75"/>`;
    inner += `<rect x="-20" y="-20" width="240" height="240" fill="${K.rad([[0, '#fff', 0.3], [0.6, '#fff', 0], [1, '#000', 0.25]], 0.7, 0.3, 0.9)}"/>`;
    return clip(K, W, inner) + `<path d="${W}" fill="none" stroke="#1e1b4b" stroke-width="2.2" stroke-linejoin="round"/>`;
  };
  // мохнатый контур
  const fur = (cx, cy, rx, ry, n, amp, a0 = -Math.PI / 2) => {
    const pt = (a, k) => `${r1(cx + Math.cos(a) * rx * k)} ${r1(cy + Math.sin(a) * ry * k)}`, st = Math.PI * 2 / n;
    let d = `M${pt(a0, 1)}`;
    for (let i = 0; i < n; i++) { const a = a0 + i * st; d += `Q${pt(a + st * 0.3, 1 + amp * 0.95)} ${pt(a + st * 0.78, 1 + amp)}L${pt(a + st, 1)}`; }
    return d + 'Z';
  };
  // капля
  const drop = (x, y, s, c = '#bfeaff', cls = 'art-float', d = 0) => `<g${cl(cls, d)}><path d="M${x} ${r1(y - s * 1.5)}C${r1(x + s * 0.3)} ${r1(y - s * 0.8)} ${r1(x + s)} ${r1(y - s * 0.3)} ${r1(x + s)} ${r1(y + s * 0.15)}A${s} ${s} 0 0 1 ${r1(x - s)} ${r1(y + s * 0.15)}C${r1(x - s)} ${r1(y - s * 0.3)} ${r1(x - s * 0.3)} ${r1(y - s * 0.8)} ${x} ${r1(y - s * 1.5)}Z" fill="${c}" stroke="#0c4a7a" stroke-width="${r1(Math.max(0.8, s * 0.22))}" stroke-linejoin="round"/><ellipse cx="${r1(x - s * 0.35)}" cy="${y}" rx="${r1(s * 0.22)}" ry="${r1(s * 0.4)}" fill="#fff" opacity=".85"/></g>`;
  // месяц
  const moon = (K, x, y, r, c = '#fef3c7') => `<circle class="art-aura" cx="${x}" cy="${y}" r="${r1(r * 2)}" fill="${K.rad([[0, c, 0.5], [1, c, 0]])}"/><path d="M${r1(x + r * 0.3)} ${r1(y - r)}A${r} ${r} 0 1 0 ${r1(x + r * 0.3)} ${r1(y + r)}A${r1(r * 0.78)} ${r1(r * 0.78)} 0 1 1 ${r1(x + r * 0.3)} ${r1(y - r)}Z" fill="${c}" stroke="#a16207" stroke-width="1.2"/>`;
  // волны Нила полосой снизу
  const nile = (K, y, a = 1) => {
    let w = '';
    for (let x = 0; x < 200; x += 20) w += `Q${x + 10} ${y - 6} ${x + 20} ${y}`;
    const m = K.id('m');
    K.def(`<mask id="${m}" maskUnits="userSpaceOnUse" x="-20" y="-20" width="240" height="240"><ellipse cx="100" cy="${y + 10}" rx="106" ry="34" fill="${K.rad([[0.5, '#fff'], [1, '#000']])}"/></mask>`);
    return `<g opacity="${a}" mask="url(#${m})"><path d="M0 200V${y}${w}V200Z" fill="${K.lin(['#38bdf8', '#0e4a8a'])}" opacity=".85"/>` + K.line(`M0 ${y}${w}`, '#bae6fd', 1.8, { op: 0.8 }) +
      K.line(`M20 ${y + 9}h14M70 ${y + 12}h18M130 ${y + 9}h16M168 ${y + 13}h12`, '#e0f2fe', 1.4, { op: 0.6 }) + '</g>';
  };
  // скарабейский «гребень» надо лбом: зубчики
  const teeth = (x0, x1, y, h, n) => {
    let d = `M${x0} ${y}`;
    const st = (x1 - x0) / n;
    for (let i = 0; i < n; i++) { const x = x0 + i * st; d += `L${r1(x + st * 0.5)} ${r1(y - h * (1 - Math.abs(i - (n - 1) / 2) / n * 0.8))}L${r1(x + st)} ${y}`; }
    return d + 'Z';
  };
  // полосы бинтов (для мумий): кривые поперёк тела, обрезанные по контуру
  const wraps = (K, d, y0, y1, step, c = '#b8a888') => {
    let p = '', q = '';
    for (let y = y0, i = 0; y < y1; y += step, i++) { const k = i % 2 ? 1 : -1; p += `M20 ${y}Q100 ${y + 9 * k} 180 ${y - 5 * k}`; q += `M20 ${y + 2.4}Q100 ${y + 9 * k + 2.4} 180 ${y - 5 * k + 2.4}`; }
    return clip(K, d, K.line(p, c, 1.8) + K.line(q, '#fffaf0', 1.4, { op: 0.7 }));
  };
  // --- помощники для новых духов (5.2) ---
  // лотос, нарисованный тушью по фаянсу (узор на бегемотах): три лепестка и стебель
  const inkLotus = (K, x, y, s = 1, rot = 0, c = '#1e3a8a') => {
    const pet = 'M0 0C-3 -5 -3 -11 0 -15C3 -11 3 -5 0 0Z';
    let g = '';
    for (const a of [-40, 0, 40]) g += `<path d="${pet}" transform="rotate(${a})" fill="${c}" fill-opacity=".18" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"/>`;
    g += `<path d="M0 0V10M-7 10Q0 14 7 10" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`;
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" opacity=".8">${g}</g>`;
  };
  // систр — храмовая погремушка: рукоять, дужка с перекладинами и звенящими дисками
  const sistrum = (K, x, y, s = 1, rot = 0) => {
    const fr = 'M-7 0C-9 -12 -8 -24 0 -26C8 -24 9 -12 7 0Z', bars = 'M-9 -8H9M-9 -17H9';
    let g = K.line('M0 0V20', '#4a2a06', 5.4) + K.line('M0 0V20', '#fbbf24', 3) + K.vol(K.ell(0, 1, 5, 3.2), { c1: '#ffe08a', c2: '#b45309', tex: false, lw: 1.4, line: '#4a2a06' });
    g += K.line(fr, '#4a2a06', 4.6) + K.line(fr, '#fbbf24', 2.6) + K.line(bars, '#4a2a06', 2.6) + K.line(bars, '#fde68a', 1.2);
    for (const [cx, cy] of [[-4, -8], [4, -8], [-4, -17], [4, -17]]) g += `<circle cx="${cx}" cy="${cy}" r="2.3" fill="#fde68a" stroke="#4a2a06" stroke-width=".9"/>`;
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${g}</g>`;
  };
  // скипетр-уадж богинь: стебель папируса с раскрытым зонтиком; x — стебель, y1 — низ зонтика, y2 — низ стебля
  const wadj = (K, x, y1, y2) => {
    const st = `M${x} ${y2}V${y1}`, um = `M${x} ${y1 + 2}C${x - 4} ${y1 - 4} ${x - 12} ${y1 - 12} ${x - 13} ${y1 - 17}Q${x} ${y1 - 24} ${x + 13} ${y1 - 17}C${x + 12} ${y1 - 12} ${x + 4} ${y1 - 4} ${x} ${y1 + 2}Z`;
    return K.line(st, '#14401a', 6.4) + K.line(st, '#4ade80', 3.6) + K.line(`M${x - 0.8} ${y2 - 4}V${y1 + 4}`, '#d9f99d', 1.1, { op: 0.7 }) +
      K.part(um, '#4ade80', { line: '#14401a', lw: 1.8 }) + K.line(`M${x} ${y1}L${x - 8} ${y1 - 15}M${x} ${y1}V${y1 - 18}M${x} ${y1}L${x + 8} ${y1 - 15}`, '#166534', 1.2) +
      K.line(`M${x - 13} ${y1 - 17}Q${x} ${y1 - 24} ${x + 13} ${y1 - 17}`, '#fbbf24', 2.6) + K.line(`M${x - 5} ${y2 - 30}H${x + 5}M${x - 5} ${y2 - 26}H${x + 5}`, '#fbbf24', 2);
  };
  // страусиное перо с загнутым кончиком: основание (x, y), высота h, ширина w
  const plume = (K, x, y, h, w, rot = 0, c = '#f8fafc', vein = '#94a3b8', line = '#475569') => {
    const d = `M0 0C${r1(-w * 0.62)} ${r1(-h * 0.3)} ${r1(-w * 0.62)} ${r1(-h * 0.76)} ${r1(-w * 0.12)} ${-h}C${r1(w * 0.36)} ${r1(-h * 1.03)} ${r1(w * 0.78)} ${r1(-h * 0.9)} ${r1(w * 0.6)} ${r1(-h * 0.72)}C${r1(w * 0.64)} ${r1(-h * 0.42)} ${r1(w * 0.42)} ${r1(-h * 0.12)} 0 0Z`;
    let ln = '';
    for (let k = 1; k <= 4; k++) { const yy = r1(-h * k * 0.18); ln += `M0 ${yy}l${r1(w * 0.4)} ${r1(-h * 0.07)}M0 ${yy}l${r1(-w * 0.4)} ${r1(-h * 0.07)}`; }
    return `<g transform="translate(${x} ${y}) rotate(${rot})">` + K.part(d, c, { line, lw: 1.6 }) + K.line(`M0 0Q${r1(w * 0.1)} ${r1(-h * 0.5)} ${r1(w * 0.12)} ${r1(-h * 0.92)}`, vein, 1.3) + K.line(ln, vein, 1, { op: 0.6 }) + '</g>';
  };
  // звезда о n лучах
  const star = (x, y, r, n = 5, k = 0.45, a0 = -Math.PI / 2) => {
    let d = '';
    for (let i = 0; i < n * 2; i++) d += (i ? 'L' : 'M') + P(x, y, i % 2 ? r * k : r, a0 + i * Math.PI / n);
    return d + 'Z';
  };
  // пушистое облачко
  const cloud = (K, x, y, s = 1, c = '#f8fafc', cls = 'art-float', d = 0) => {
    const p = `M${r1(x - 22 * s)} ${r1(y + 6 * s)}C${r1(x - 30 * s)} ${r1(y + 6 * s)} ${r1(x - 30 * s)} ${r1(y - 6 * s)} ${r1(x - 20 * s)} ${r1(y - 6 * s)}C${r1(x - 18 * s)} ${r1(y - 16 * s)} ${r1(x - 4 * s)} ${r1(y - 18 * s)} ${r1(x + 2 * s)} ${r1(y - 10 * s)}C${r1(x + 8 * s)} ${r1(y - 16 * s)} ${r1(x + 22 * s)} ${r1(y - 12 * s)} ${r1(x + 20 * s)} ${r1(y - 2 * s)}C${r1(x + 30 * s)} ${r1(y - 2 * s)} ${r1(x + 30 * s)} ${r1(y + 8 * s)} ${r1(x + 20 * s)} ${r1(y + 8 * s)}Z`;
    return `<g${cl(cls, d)}>` + K.vol(p, { c1: c, c2: K.shade(c, -0.25), rim: '#ffffff', tex: false, lw: 1.6, line: '#64748b', hiK: 0.3 }) + '</g>';
  };
  // утёнок (на спине у Бегемотихи)
  const duckling = (K, x, y, s = 1, flip = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">` +
    K.vol(K.ell(0, 0, 11, 8.5), { c1: '#fff3b0', c2: '#e0a21a', rim: '#fff7d6', tex: false, lw: 1.8, line: '#7a4a06' }) +
    K.line('M-1 -1Q4 3 8 -1', '#c08a12', 1.4) + K.vol(K.ell(-7, -9, 6.6, 6.2), { c1: '#fff3b0', c2: '#e0a21a', rim: '#fff7d6', tex: false, lw: 1.8, line: '#7a4a06' }) +
    K.part('M-12.5 -9.5L-18 -8L-12.5 -6.4Z', '#fb923c', { line: '#9a3412', lw: 1 }) + `<circle cx="-8.5" cy="-10.5" r="1.5" fill="${INK}"/><circle cx="-9" cy="-11" r=".5" fill="#fff"/>` + '</g>';
  // красная корона Нижнего Египта (дешрет): основание (x, y) — середина низа, высота задника h
  const DESHRET = 'M-15 0L-13 -14H3V-30H11V-14L13 0Z';
  const DESHRET_COIL = 'M-6 -13L-15 -27C-18 -33 -10 -37 -8.6 -31.4C-7.8 -28 -11.6 -27.4 -12.4 -29.6';
  const deshret = (K, x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">` + K.vol(DESHRET, { c1: '#f05252', c2: '#991b1b', rim: '#fde68a', tex: false, lw: 2, line: '#450a0a' }) +
    K.line('M-12 -3H12', '#fbbf24', 1.6, { op: 0.8 }) + K.line(DESHRET_COIL, '#450a0a', 3.4) + K.line(DESHRET_COIL, '#fbbf24', 1.7) + '</g>';
  // кольцо кобры: трубка с чешуйчатым узором; cols — обводка, тело, свет, узор
  const coil = (K, d, w, cols = ['#4a2006', '#e0a028', '#fde68a', '#1d4ed8']) => K.line(d, cols[0], w + 5) + K.line(d, cols[1], w) + K.line(d, cols[2], r1(w * 0.5), { op: 0.75 }) +
    `<path d="${d}" fill="none" stroke="${cols[3]}" stroke-width="${r1(w * 0.36)}" stroke-dasharray="2.4 7" stroke-linecap="round" opacity=".7"/>` + K.line(d, '#fffbe6', 1.6, { op: 0.4 });
  // капюшон кобры: широкий щит, сужается книзу к шее; cx — середина, y0 — верх, w — полуширина, y1 — низ (шея)
  const hoodD = (cx, y0, w, y1) => `M${cx} ${y0}C${cx + w * 0.52} ${y0 - 2} ${cx + w} ${y0 + 8} ${cx + w} ${y0 + 24}C${cx + w} ${y0 + 40} ${cx + w * 0.52} ${r1(y0 + (y1 - y0) * 0.72)} ${cx + 12} ${y1}H${cx - 12}C${cx - w * 0.52} ${r1(y0 + (y1 - y0) * 0.72)} ${cx - w} ${y0 + 40} ${cx - w} ${y0 + 24}C${cx - w} ${y0 + 8} ${cx - w * 0.52} ${y0 - 2} ${cx} ${y0}Z`;
  // инкрустация урея: столбик ячеек посередине капюшона (лазурит, бирюза, сердолик) и золотые рёбра по бокам
  const inlay = (K, cx, y0, y1, w0, w1, step, ribW) => {
    const cols = ['#1d4ed8', '#2dd4bf', '#dc2626'];
    let g = '';
    for (let y = y0, i = 0; y < y1 - 2; y += step, i++) { const w = w0 + (w1 - w0) * (y - y0) / (y1 - y0); g += `<rect x="${r1(cx - w / 2)}" y="${r1(y)}" width="${r1(w)}" height="${r1(step - 1.6)}" rx="1.2" fill="${cols[i % 3]}" stroke="#5a3a06" stroke-width="1"/>`; }
    const rib = `M${cx - 10} ${y0 + 4}Q${cx - ribW * 0.6} ${y0 - 4} ${cx - ribW} ${y0 + 2}M${cx - 10} ${y0 + 16}Q${cx - ribW * 0.6} ${y0 + 10} ${cx - ribW * 0.92} ${y0 + 18}M${cx - 10} ${y0 + 28}Q${cx - ribW * 0.5} ${y0 + 24} ${cx - ribW * 0.7} ${y0 + 32}`;
    return K.mirror(K.line(rib, '#b45309', 1.6, { op: 0.65 })) + g;
  };

  Object.assign(SPIRIT_ART, {
    // Скарабейка: круглый бронзовый жучок-скарабей стоит на задних лапках и держит над головой крошечное солнышко —
    // как на древних амулетах. Надо лбом — зубчатый гребень, по панцирю бирюзовый отлив, внизу — шов надкрылий
    eg_skarab(K) {
      const bronze = { c1: '#f2b845', c2: '#7c2d12', rim: '#5eead4', rimK: 0.55, texK: 0.2, line: '#3b1206' };
      let s = K.aura('#ff9a3d', 94, 112, 0.5);
      // поднятые лапки держат солнышко
      const up = 'M66 104C54 90 60 72 84 58';
      s += K.mirror(K.line(up, '#3b1206', 7.5) + K.line(up, '#b45309', 3.6) + K.line('M84 58l5 -5M83 60l7 0', '#3b1206', 2.6));
      s += sunBall(K, 100, 40, 20);
      // нижние лапки
      s += K.mirror(K.line('M58 140C46 146 38 156 34 170l-6 3M72 164C66 170 62 174 58 179', '#3b1206', 6) + K.line('M58 140C46 146 38 156 34 170M72 164C66 170 62 174 58 179', '#b45309', 2.6));
      // гребень и тельце
      s += K.part(teeth(64, 136, 86, 18, 7), '#9a3412', { line: '#3b1206', lw: 2 });
      s += K.vol(K.ell(100, 126, 52, 48), bronze);
      s += K.line('M56 118C54 138 62 156 78 168', '#5eead4', 3, { op: 0.35 }) + K.line('M144 118C146 138 138 156 122 168', '#5eead4', 2, { op: 0.25 });
      // шлем-щиток надо лбом
      s += K.vol('M58 106C58 84 76 74 100 74C124 74 142 84 142 106C126 97 74 97 58 106Z', { c1: '#ffd07a', c2: '#9a3412', rim: '#fff0a0', tex: false, lw: 2.4, line: '#3b1206' });
      s += K.line('M72 92Q100 84 128 92', '#fff3b0', 1.6, { op: 0.7 });
      // шов надкрылий
      s += K.line('M60 146Q100 158 140 146M100 154V174', '#3b1206', 2.2, { op: 0.7 }) + K.line('M76 160Q74 168 80 172M124 160Q126 168 120 172', '#3b1206', 1.6, { op: 0.5 });
      s += K.gloss(70, 116, 9, 5, -45, 0.35);
      // мордочка
      s += K.eyes(100, 122, 19, 12.5, { iris: '#0f766e', look: [0.05, -0.5] });
      s += K.blush(70, 138, 7) + K.blush(130, 138, 7);
      s += K.mouth('smile', 100, 139, 14);
      s += K.spark(34, 80, 3.6, '#ffd23f', 'art-float') + K.spark(168, 74, 3.2, '#fff3b0', 'art-float') + K.spark(174, 132, 2.6, '#ffd23f') + K.spark(24, 124, 2.4, '#fff3b0');
      return s;
    },

    // Солнцекат: подросший скарабей упирается передними лапками и катит солнце размером с арбуз; надкрылья приоткрыты,
    // из-под них видны прозрачные крылышки, на лбу капля пота, позади — облачка дорожной пыли
    eg_solncekat(K) {
      const bronze = { c1: '#f5c04a', c2: '#7a2a0c', rim: '#5eead4', rimK: 0.6, texK: 0.2, line: '#3b1206' };
      let s = K.aura('#ff8a2a', 96, 112, 0.5);
      // дорога и пыль
      s += K.line('M8 179H192', '#7c2d12', 2, { op: 0.35 });
      s += `<g class="art-float"><circle cx="16" cy="168" r="7" fill="#e7c98f" opacity=".6"/><circle cx="26" cy="162" r="5" fill="#f1dba8" opacity=".55"/><circle cx="8" cy="158" r="4" fill="#f1dba8" opacity=".4"/></g>`;
      // солнце-арбуз
      s += sunBall(K, 142, 134, 44, false);
      s += `<g class="art-spin-soft"><circle cx="142" cy="134" r="30" fill="none" stroke="#fde68a" stroke-width="2" stroke-dasharray="6 6"/><circle cx="142" cy="134" r="16" fill="none" stroke="#fff6c2" stroke-width="1.6" stroke-dasharray="4 5"/></g>`;
      s += K.spark(142, 134, 6, '#fffbe6');
      // прозрачные крылышки
      const wg = 'M50 104C36 90 20 78 6 76C10 90 20 104 40 114Z';
      s += `<g class="art-wing">${K.part(wg, '#fde68a', { line: '#9a3412', lw: 1.4, op: 0.75 })}${K.line('M46 106C34 96 22 88 10 80M40 110C30 104 20 96 12 90', '#c2410c', 1, { op: 0.6 })}</g>`;
      // лапки на земле
      s += K.line('M38 150L22 170l-6 2M50 162L42 178M76 164L82 178', '#3b1206', 6) + K.line('M38 150L22 170M50 162L42 178M76 164L82 178', '#b45309', 2.6);
      // тельце и гребень
      s += K.part(teeth(26, 94, 92, 20, 7), '#9a3412', { line: '#3b1206', lw: 2 });
      s += K.vol(K.ell(60, 128, 44, 42), bronze);
      s += K.vol('M24 110C24 90 40 80 60 80C80 80 96 90 96 110C82 102 38 102 24 110Z', { c1: '#ffd07a', c2: '#9a3412', rim: '#fff0a0', tex: false, lw: 2.4, line: '#3b1206' });
      s += K.line('M26 148Q60 160 94 148M60 156V170', '#3b1206', 2, { op: 0.6 });
      s += K.line('M22 124C22 140 30 152 42 160', '#5eead4', 3, { op: 0.35 });
      // упирается лапками в солнце
      s += K.line('M92 118L104 110M94 142L104 148', '#3b1206', 8) + K.line('M92 118L104 110M94 142L104 148', '#b45309', 4);
      s += ellV(K, 104, 109, 5, 4, 0, { ...bronze, tex: false, lw: 2 }) + ellV(K, 104, 149, 5, 4, 0, { ...bronze, tex: false, lw: 2 });
      // мордочка: упрямо, изо всех сил
      s += K.eyes(60, 124, 16, 11, { iris: '#0f766e', look: [0.8, 0.1] }) + K.line('M38 109L54 115M66 115L82 109', INK, 3.4);
      s += K.blush(36, 138, 6) + K.blush(84, 138, 6);
      s += K.mouth('grin', 62, 138, 16);
      s += drop(96, 100, 4, '#bfeaff', 'art-blink', 0.3);
      s += K.spark(118, 72, 3.6, '#ffd23f', 'art-float') + K.spark(186, 80, 3.2, '#fff3b0', 'art-float') + K.spark(190, 150, 2.6, '#ffd23f');
      return s;
    },

    // Хепри: бог утреннего солнца. Человеческое тело в белом схенти с золотым передником, голова — бирюзовый скарабей
    // с золотым гребнем; за спиной — распахнутые крылья скарабея в египетском узоре, в поднятых руках — восходящее солнце
    eg_khepri(K) {
      const skin = { c1: '#e0935a', c2: '#7c3a12', rim: '#ffe29a', tex: false, line: '#3b1606' };
      let s = K.aura('#ffb020', 100, 100, 0.55);
      // крылья
      const W = 'M86 104C64 92 34 76 6 60Q8 70 16 74Q10 80 14 88Q20 88 24 92Q20 100 26 106Q32 104 38 108Q36 116 44 120Q50 116 56 120Q58 126 66 126C74 124 80 122 86 120Z';
      s += K.mirror(`<g class="art-wing">${ewing(K, W, 86, 112, 30, 54, ['#fbbf24', '#2dd4bf', '#1e40af'], 150, 215, 9)}</g>`);
      // солнце над головой
      s += sunBall(K, 100, 34, 24);
      // руки подняты
      const arm = 'M80 106C66 98 64 74 78 54';
      s += K.mirror(K.line(arm, '#3b1606', 12) + K.line(arm, '#c9743e', 8) + K.line('M76 100C68 90 68 76 76 62', '#f0b07a', 2, { op: 0.6 }) +
        K.line('M69 84l9 2', '#fbbf24', 4) + ellV(K, 78, 54, 6.5, 6, 0, skin));
      // ноги и сандалии
      s += K.mirror(K.vol('M86 160H96V174H86Z', skin) + K.part('M82 174H100Q101 179 96 179H84Q80 179 82 174Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }));
      // торс
      s += K.vol('M76 102C76 96 88 94 100 94C112 94 124 96 124 102C126 118 120 132 116 140H84C80 132 74 118 76 102Z', skin);
      // схенти с передником
      s += K.vol('M80 136H120L130 164Q100 170 70 164Z', { c1: '#ffffff', c2: '#d6c9a8', rim: '#fde68a', tex: false, lw: 2.2, line: '#5a4a2a' });
      s += K.line('M84 142L78 164M92 142L88 166M108 142L112 166M116 142L122 164', '#c9b894', 1.3);
      s += stripes(K, 'M92 140H108L112 168H88Z', '#fbbf24', '#1e40af', 3.4, 0, '#5a3a06', 1.6);
      s += K.line('M80 138H120', '#5a3a06', 5) + K.line('M80 138H120', '#fbbf24', 3);
      s += collar(K, 100, 98, 26, 10, 4);
      // голова-скарабей
      s += K.part(teeth(80, 120, 68, 12, 5), '#fbbf24', { line: '#5a3a06', lw: 1.6 });
      s += K.vol(K.ell(100, 84, 22, 21), { c1: '#5eead4', c2: '#1e3a8a', rim: '#fff0a0', rimK: 0.6, texK: 0.15, line: '#0b1a3a' });
      s += K.vol('M80 80C80 68 88 62 100 62C112 62 120 68 120 80C112 75 88 75 80 80Z', { c1: '#ffe08a', c2: '#b45309', tex: false, lw: 1.8, line: '#5a3a06' });
      s += K.gloss(88, 90, 5, 3, -40, 0.4);
      s += K.eyes(100, 88, 8.5, 6.2, { iris: '#f59e0b', look: [0, -0.4] });
      s += K.mouth('smile', 100, 97, 8);
      s += K.spark(22, 36, 3.6, '#fff3b0', 'art-float') + K.spark(178, 36, 3.6, '#fff3b0', 'art-float') + K.spark(16, 140, 2.8, '#ffd23f') + K.spark(184, 140, 2.8, '#ffd23f') + K.spark(144, 12, 2.4, '#fffbe6');
      return s;
    },

    // Крокодильчик: только что вылупился — на макушке половинка скорлупы. Пухлый, сидит у воды, хвост колечком,
    // светлое брюшко в клеточку, во весь рот улыбка с мелкими зубками; рядом распустился голубой лотос
    eg_kroko(K) {
      const G = { c1: '#86efac', c2: '#0f766e', rim: '#c8f3ff', texK: 0.14, line: '#064e3b' };
      let s = K.aura('#38bdf8', 88, 120, 0.3);
      s += `<ellipse cx="100" cy="176" rx="84" ry="9" fill="${K.rad([[0, '#38bdf8', 0.5], [1, '#0e7490', 0]])}"/>`;
      s += '<g class="art-aura"><ellipse cx="100" cy="176" rx="92" ry="11" fill="none" stroke="#bae6fd" stroke-width="1.4" opacity=".4"/></g>';
      s += K.part('M14 176C14 170 34 168 46 172C46 178 18 180 14 176Z', '#3fa34d', { line: '#14532d', lw: 1.4 }) + lotus(K, 30, 172, 0.85);
      // хвост колечком
      const tail = 'M128 164C156 170 178 160 178 142C178 130 166 126 160 134';
      s += K.line(tail, '#064e3b', 17) + K.line(tail, '#34d399', 12) + `<path d="${tail}" fill="none" stroke="#0f766e" stroke-width="5" stroke-dasharray="2 7" stroke-linecap="round" opacity=".6"/>` + K.line(tail, '#a7f3d0', 2.4, { op: 0.5 });
      // лапки
      s += K.mirror(K.vol(K.ell(78, 172, 14, 7.5), { ...G, tex: false, lw: 2.2 }) + '<g fill="#fff8e6" stroke="#064e3b" stroke-width=".9"><path d="M65 175l-3 4 5-1z"/><path d="M71 178l-1 4 4-3z"/></g>');
      // тельце и брюшко
      s += K.vol(K.ell(100, 140, 40, 34), G);
      s += K.part('M100 116C120 116 128 132 128 146C128 162 116 172 100 172C84 172 72 162 72 146C72 132 80 116 100 116Z', '#ecfccb', { line: '#65a30d', lw: 1.4 });
      s += K.line('M78 132H122M74 146H126M78 160H122M100 118V171', '#a3c96a', 1.5);
      // ручки
      s += ellV(K, 62, 144, 9, 7, 30, { ...G, tex: false, lw: 2.2 }) + ellV(K, 138, 144, 9, 7, -30, { ...G, tex: false, lw: 2.2 });
      // голова с мордой влево
      const head = 'M122 56C146 56 154 78 150 96C146 112 130 118 110 118L64 114C50 113 42 106 44 96C46 86 54 82 66 82L98 76C102 64 110 56 122 56Z';
      s += K.vol(head, G);
      s += '<g fill="#0f766e" opacity=".4"><circle cx="118" cy="78" r="2.4"/><circle cx="128" cy="86" r="2"/><circle cx="140" cy="80" r="2.2"/><circle cx="80" cy="88" r="1.8"/><circle cx="90" cy="84" r="1.6"/></g>';
      s += `<ellipse cx="52" cy="89" rx="2.4" ry="1.7" fill="${INK}"/><ellipse cx="61" cy="87" rx="2.4" ry="1.7" fill="${INK}"/>`;
      // улыбка с зубками
      let tt = '';
      for (let x = 56; x <= 124; x += 9) { const y = 104 + (1 - Math.pow((x - 88) / 40, 2)) * 5; tt += `M${r1(x - 3)} ${r1(y - 0.6)}L${x} ${r1(y + 4)}L${r1(x + 3)} ${r1(y - 0.6)}Z`; }
      s += `<path d="${tt}" fill="#fff" stroke="#064e3b" stroke-width=".8" stroke-linejoin="round"/>`;
      s += K.line('M48 102C66 110 102 112 130 102', INK, 2.8);
      s += K.blush(128, 98, 6);
      // глаза-бугорки
      s += ellV(K, 108, 66, 13, 12, 0, { ...G, texK: 0.1 }) + ellV(K, 134, 64, 14, 13, 0, { ...G, texK: 0.1 });
      s += `<g class="art-eyes">${K.eye(108, 66, 8.5, { iris: '#f5c542', look: [-0.4, 0.2] })}${K.eye(134, 64, 9.5, { iris: '#f5c542', look: [-0.4, 0.2] })}</g>`;
      // скорлупка на макушке
      s += K.g(K.part('M104 50L108 40L114 46L120 36L126 45L132 38L138 49C134 56 108 57 104 50Z', '#fffbeb', { line: '#a8977a', lw: 1.6 }) +
        '<g fill="#d6c7a1"><circle cx="114" cy="50" r="1.6"/><circle cx="126" cy="51" r="1.3"/><circle cx="132" cy="47" r="1"/></g>', 'rotate(-10 120 46)');
      s += drop(170, 100, 3, '#bfeaff', 'art-float', 0.3) + drop(24, 128, 2.4, '#bfeaff', 'art-float', 1) + K.spark(40, 70, 3, '#e0f7ff') + K.spark(176, 50, 2.6, '#e0f7ff', 'art-float');
      return s;
    },

    // Нилозуб: подросший крокодил лежит в реке, притворяясь бревном: над водой — спина с гребнем пластин, морда
    // с хитрой ухмылкой; один глаз дремлет, другой приоткрыт — следит за разливом. На спине вырос лотос, рядом папирус
    eg_nilozub(K) {
      const G = { c1: '#6ee7b7', c2: '#065f46', rim: '#c8f3ff', texK: 0.14, line: '#022c22' };
      let s = K.aura('#2dd4bf', 94, 118, 0.3);
      s += papyrus(K, 172, 160, 96, 4, 0.4) + papyrus(K, 186, 164, 74, -4, 1.1);
      // хвост
      const tail = 'M156 138C172 136 184 124 186 106C188 98 182 94 178 100';
      s += K.line(tail, '#022c22', 15) + K.line(tail, '#34d399', 10) + K.line(tail, '#a7f3d0', 2, { op: 0.5 });
      // спина
      s += K.vol(K.ell(112, 138, 60, 28), G);
      let sc = '';
      for (let i = 0; i < 7; i++) { const x = 76 + i * 13, y = 114 + Math.pow((x - 112) / 60, 2) * 18; sc += K.part(`M${r1(x - 6)} ${r1(y + 4)}Q${x} ${r1(y - 10)} ${r1(x + 6)} ${r1(y + 4)}Z`, '#10b981', { line: '#022c22', lw: 1.6 }); }
      s += sc;
      s += '<g fill="#065f46" opacity=".4"><ellipse cx="96" cy="130" rx="5" ry="3"/><ellipse cx="124" cy="126" rx="6" ry="3.4"/><ellipse cx="146" cy="134" rx="4" ry="2.6"/></g>';
      // лотос на спине
      s += lotus(K, 132, 116, 0.9, 8, '#f472b6');
      // голова
      const head = 'M80 100C98 98 106 110 104 124C102 136 90 142 72 142L22 140C12 139 8 132 10 124C12 116 20 112 30 112L60 106C66 102 72 100 80 100Z';
      s += K.vol(head, G);
      s += `<ellipse cx="18" cy="119" rx="2.4" ry="1.7" fill="${INK}"/><ellipse cx="27" cy="117" rx="2.4" ry="1.7" fill="${INK}"/>`;
      let tt = '';
      for (let x = 22; x <= 88; x += 8.5) { const y = 128 + (x - 22) * 0.06; tt += `M${r1(x - 3)} ${r1(y)}L${x} ${r1(y + 4)}L${r1(x + 3)} ${r1(y)}Z`; }
      s += `<path d="${tt}" fill="#fff" stroke="#022c22" stroke-width=".8" stroke-linejoin="round"/>` + K.line('M14 128C40 130 70 134 96 128', INK, 2.6) + K.line('M96 128l5 -4', INK, 2.4);
      // глаза-бугорки: левый дремлет, правый приоткрыт
      s += ellV(K, 64, 102, 11, 10, 0, { ...G, texK: 0.1 }) + ellV(K, 86, 98, 12, 11, 0, { ...G, texK: 0.1 });
      s += K.closed(64, 103, 0, 5.5, false);
      s += `<g class="art-eyes">${K.eye(86, 99, 7.5, { iris: '#f5c542', lid: 'half', skin: '#34d399', look: [-0.5, 0.2] })}</g>`;
      // вода поверх: тело наполовину в реке
      s += nile(K, 152, 0.92);
      s += '<g class="art-aura"><ellipse cx="60" cy="152" rx="56" ry="5" fill="none" stroke="#e0f2fe" stroke-width="1.4" opacity=".5"/></g>';
      s += drop(40, 90, 3, '#bfeaff', 'art-float', 0.2) + K.spark(150, 70, 3, '#e0f7ff', 'art-float') + K.spark(30, 60, 2.6, '#e0f7ff');
      s += K.line('M44 84q5 -3 9 0M48 74q5 -3 9 0', '#bae6fd', 1.8, { op: 0.7, cls: 'art-blink' });
      return s;
    },

    // Себек: бог-крокодил, владыка Нила. Стоит в реке: зелёное тело в белом схенти, полосатый парик, усех на груди,
    // на голове — солнечный диск с перьями и рогами; в одной руке анх, в другой — посох-уас. Мудрый прищур
    eg_sebek(K) {
      const G = { c1: '#6ee7b7', c2: '#065f46', rim: '#c8f3ff', texK: 0.14, line: '#022c22' };
      let s = K.aura('#2dd4bf', 100, 104, 0.4);
      s += papyrus(K, 16, 170, 70, 6, 0.7) + papyrus(K, 28, 172, 52, -2, 1.5);
      // посох
      s += was(K, 158, 46, 170);
      // ноги
      s += K.mirror(K.vol('M84 156H96V176H84Z', { ...G, tex: false, lw: 2.2 }));
      // схенти
      s += K.vol('M78 124H122L132 160Q100 166 68 160Z', { c1: '#ffffff', c2: '#d6c9a8', rim: '#c8f3ff', tex: false, lw: 2.2, line: '#5a4a2a' });
      s += K.line('M84 130L78 160M92 130L88 162M108 130L112 162M116 130L122 160', '#c9b894', 1.3);
      s += stripes(K, 'M92 128H108L112 164H88Z', '#fbbf24', '#1e40af', 3.4, 0, '#5a3a06', 1.6);
      s += K.line('M78 126H122', '#5a3a06', 5) + K.line('M78 126H122', '#fbbf24', 3);
      // торс
      s += K.vol('M74 96C74 88 86 86 100 86C114 86 126 88 126 96C128 110 122 122 118 128H82C78 122 72 110 74 96Z', G);
      s += K.line('M88 112Q100 116 112 112M90 120Q100 123 110 120', '#065f46', 1.4, { op: 0.5 });
      // руки: левая с анхом, правая держит посох
      s += K.vol('M76 94C66 100 60 112 58 124C62 130 70 130 72 124C72 116 76 108 82 104Z', { ...G, tex: false, lw: 2.2 }) + K.line('M60 112l10 3', '#fbbf24', 3.6);
      s += ankh(K, 60, 144, 1.05);
      s += ellV(K, 62, 128, 7, 6.5, 0, { ...G, tex: false, lw: 2 });
      s += K.vol('M124 94C136 98 146 104 154 110C158 116 154 122 148 120C140 114 132 110 122 108Z', { ...G, tex: false, lw: 2.2 }) + K.line('M138 101l-3 9', '#fbbf24', 3.6);
      s += ellV(K, 156, 114, 7, 6.5, 0, { ...G, tex: false, lw: 2 });
      // парик
      s += K.mirror(stripes(K, 'M80 58L72 104L86 106L92 66Z', '#1e3a8a', '#fbbf24', 3, 0, '#0b1a3a', 1.6));
      s += collar(K, 100, 92, 28, 10, 4);
      // корона: перья, рога, солнечный диск
      s += K.mirror(K.part('M98 40C92 28 92 14 97 4C102 14 102 28 100 40Z', '#f8fafc', { line: '#475569', lw: 1.6 }) + K.line('M96 12l3 2M95 20l4 2M95 28l4 2', '#60a5fa', 1.4));
      s += K.line('M74 44Q86 36 100 44Q114 36 126 44', '#5a3a06', 5) + K.line('M74 44Q86 36 100 44Q114 36 126 44', '#fbbf24', 2.8);
      s += `<circle class="art-aura" cx="100" cy="34" r="16" fill="${K.rad([[0, '#fff6c2', 0.8], [1, '#ffb020', 0]])}"/>` + K.vol(K.ell(100, 34, 9, 9), { c1: '#ffd23f', c2: '#dc2626', tex: false, lw: 1.8, line: '#7a1a08' });
      // голова крокодила в профиль
      const head = 'M112 44C132 46 138 62 134 76C130 88 120 92 106 92L60 90C50 90 44 84 46 78C48 72 54 70 62 70L90 64C92 52 100 44 112 44Z';
      s += K.vol(head, G);
      s += `<ellipse cx="53" cy="76" rx="2.4" ry="1.7" fill="${INK}"/>`;
      let tt = '';
      for (let x = 56; x <= 112; x += 8) { const y = 83.6; tt += `M${r1(x - 2.6)} ${y}L${x} ${y + 3.6}L${r1(x + 2.6)} ${y}Z`; }
      s += `<path d="${tt}" fill="#fff" stroke="#022c22" stroke-width=".8"/>` + K.line('M50 83H118', INK, 2.4) + K.line('M118 83q4 -1 6 -5', INK, 2.2);
      s += '<g fill="#065f46" opacity=".4"><circle cx="76" cy="74" r="1.6"/><circle cx="86" cy="72" r="1.8"/><circle cx="124" cy="70" r="2"/></g>';
      s += ellV(K, 114, 56, 11, 10, 0, { ...G, texK: 0.1 });
      s += `<g class="art-eyes">${K.eye(114, 57, 7, { iris: '#fbbf24', lid: 'half', skin: '#34d399', look: [-0.5, 0.1] })}</g>` + K.line('M121 59L132 61', INK, 2);
      // Нил у ног
      s += nile(K, 168, 0.95);
      s += K.spark(40, 40, 3.4, '#e0f7ff', 'art-float') + K.spark(180, 20, 3, '#fff6c2') + K.spark(184, 96, 2.6, '#e0f7ff', 'art-float') + K.spark(22, 100, 2.4, '#e0f7ff');
      return s;
    },

    // Ибисёнок: пушистый белый птенец священного ибиса с чёрной пушистой головкой и длинным загнутым клювиком.
    // Клювиком «нажимает» на светящийся знак анха — он вспыхивает, как неоновая кнопка; вокруг бегают искорки тока
    eg_ibisenok(K) {
      let s = K.aura('#facc15', 86, 118, 0.35);
      // ножки
      s += K.line('M88 162V177M112 162V177', '#1f2937', 4.4) + K.line('M80 179L88 176L96 179M104 179L112 176L120 179', '#1f2937', 3);
      // тельце-пушок
      s += K.vol(fur(100, 130, 44, 38, 14, 0.1), { c1: '#ffffff', c2: '#a8b3c7', rim: '#fff6b0', line: '#475569', lw: 2.4, texK: 0.15 });
      // крылышки с чёрными кончиками
      s += K.part('M58 118C44 126 42 144 50 156C56 150 60 138 62 126Z', '#e2e8f0', { line: '#475569' }) + K.line('M48 150l-5 4M51 155l-3 5', '#1f2937', 2.6);
      s += K.part('M142 118C156 126 158 144 150 156C144 150 140 138 138 126Z', '#e2e8f0', { line: '#475569' }) + K.line('M152 150l5 4M149 155l3 5', '#1f2937', 2.6);
      s += K.gloss(78, 118, 8, 4, -40, 0.35);
      // головка
      s += K.line('M94 50C88 38 96 32 102 38M102 50C104 38 112 36 114 44', '#111827', 3.4);
      s += K.vol(fur(100, 80, 30, 28, 12, 0.12), { c1: '#6b7280', c2: '#111827', rim: '#fff6b0', line: '#030712', lw: 2.2, texK: 0.08 });
      s += K.gloss(86, 64, 6, 3, -35, 0.3);
      // неоновый анх
      s += `<circle class="art-aura" cx="34" cy="146" r="20" fill="${K.rad([[0, '#fef08a', 0.55], [1, '#facc15', 0]])}"/>` + neon(K, 32, 148, 'ankh', '#facc15', 1.25);
      // клювик
      s += K.part('M92 90C76 96 58 112 48 132C46 137 51 139 53 134C62 116 78 104 100 97Z', '#374151', { line: '#030712', lw: 2 });
      s += K.line('M88 95C74 102 62 114 54 128', '#9ca3af', 1.2, { op: 0.7 });
      s += K.spark(46, 138, 4, '#fffbe6');
      // глазки
      s += K.eyes(100, 76, 13, 9, { iris: '#facc15', look: [-0.6, 0.45] });
      s += K.blush(80, 90, 4.5) + K.blush(122, 88, 4.5);
      // искорки тока
      s += K.line('M160 70l6 5-4 3 6 5M22 96l5 4-3 2 5 4', '#facc15', 2, { cls: 'art-blink' });
      s += K.spark(150, 40, 3.4, '#fef08a', 'art-float') + K.spark(176, 118, 2.8, '#fef08a') + K.spark(60, 44, 2.4, '#fffbe6');
      return s;
    },

    // Ибис-писец: взрослый священный ибис стоит на одной ноге, чёрная шея изогнута, длинный клюв выводит в воздухе
    // неоновые иероглифы (вода, анх, око, перо); под ногами — развёрнутый папирус с записями
    eg_ibis(K) {
      let s = K.aura('#facc15', 92, 108, 0.35);
      // неоновые иероглифы
      s += neon(K, 24, 40, 'eye', '#facc15', 0.95, 0) + neon(K, 54, 20, 'water', '#22d3ee', 0.9, 0.5) + neon(K, 18, 72, 'feather', '#f472b6', 0.9, 1) + neon(K, 22, 124, 'bird', '#facc15', 0.9, 0.8);
      // папирус с записями
      s += K.part('M30 168H96V180H30Z', '#fef3c7', { line: '#92400e', lw: 1.6 }) + K.vol(K.ell(30, 174, 5, 7), { c1: '#fde68a', c2: '#b45309', tex: false, lw: 1.6 }) + K.vol(K.ell(96, 174, 5, 7), { c1: '#fde68a', c2: '#b45309', tex: false, lw: 1.6 });
      s += K.line('M40 172h6M50 172l3 -2 3 2 3 -2M64 171v4M70 172h8M40 177h14M58 177h6M70 177h14', '#7c2d12', 1.3);
      // ноги: одна стоит, другая поджата
      s += K.line('M116 138L116 177M116 177l-8 2M116 177l8 2M124 138L134 154L120 160', '#374151', 3.6);
      // хвост
      s += K.part('M146 112C162 116 178 130 186 148C172 146 158 138 148 130Z', '#111827', { line: '#030712', lw: 1.6 }) + K.line('M156 124C166 130 174 138 180 146', '#4b5563', 1.2);
      // тело
      s += K.vol('M84 112C90 96 124 90 146 102C160 110 166 122 168 132C150 136 138 142 122 142C100 142 82 130 84 112Z', { c1: '#ffffff', c2: '#a8b3c7', rim: '#fff6b0', line: '#334155', lw: 2.4 });
      s += K.part('M100 112C112 104 138 104 158 118C150 126 132 132 112 128Z', '#f1f5f9', { line: '#64748b', lw: 1.6 }) + K.line('M112 116q10 4 18 2M118 122q12 3 22 0', '#94a3b8', 1.2);
      s += K.line('M150 120l10 6M146 124l10 6', '#111827', 3);
      // шея
      const neck = 'M96 112C84 98 100 84 92 70C88 62 86 60 84 58';
      s += K.line(neck, '#030712', 13) + K.line(neck, '#374151', 9) + K.line('M94 108C86 98 98 86 91 72', '#6b7280', 1.6, { op: 0.6 });
      // голова и клюв
      s += K.vol(K.ell(84, 52, 14, 13), { c1: '#4b5563', c2: '#0b0f19', rim: '#fff6b0', line: '#030712', lw: 2.2, tex: false });
      s += K.part('M74 54C58 58 42 76 32 100C30 104 34 106 36 102C46 82 60 66 76 62Z', '#1f2937', { line: '#030712', lw: 1.8 });
      s += K.line('M70 60C56 66 46 78 38 96', '#6b7280', 1.1, { op: 0.8 });
      s += `<circle class="art-aura" cx="33" cy="102" r="10" fill="${K.rad([[0, '#fffbe6', 0.9], [1, '#facc15', 0]])}"/>` + K.spark(33, 102, 5, '#fffbe6');
      s += `<g class="art-eyes">${K.eye(88, 48, 5.5, { iris: '#facc15', look: [-0.6, 0.5] })}</g>` + K.line('M82 41Q88 38 94 41', '#9ca3af', 1.6);
      s += K.line('M160 60l6 5-4 3 6 5', '#facc15', 2, { cls: 'art-blink' }) + K.spark(170, 28, 3, '#fef08a', 'art-float') + K.spark(128, 20, 2.4, '#fffbe6');
      return s;
    },

    // Священный ибис: посланник Тота распахнул крылья (у плеч золото, дальше белые перья с чёрными концами);
    // над головой — лунный диск в серпе месяца, на шее — усех; вокруг кружит свиток света с неоновыми иероглифами
    eg_svibis(K) {
      let s = K.aura('#facc15', 100, 104, 0.45) + K.aura('#e0f2fe', 50, 36, 0.4);
      // свиток света: дальняя половина
      s += K.line('M20 146C20 128 180 128 180 146', '#facc15', 7, { op: 0.25 }) + K.line('M20 146C20 128 180 128 180 146', '#fef08a', 2.4, { op: 0.8 });
      // крылья
      const W = 'M90 96C70 80 40 64 8 60Q12 68 22 72Q14 78 16 88Q24 88 30 92Q24 100 28 108Q36 106 42 110Q40 118 46 124Q54 120 58 124C66 118 78 112 90 110Z';
      s += K.mirror(`<g class="art-wing">${ewing(K, W, 90, 104, 26, 58, ['#fde68a', '#f8fafc', '#1f2937'], 150, 215, 10)}</g>`);
      // хвост и ноги
      s += K.part('M88 150L100 174L112 150Z', '#111827', { line: '#030712', lw: 1.6 }) + K.line('M94 154L90 176M106 154L110 176', '#374151', 3.2);
      // тело
      s += K.vol(K.ell(100, 122, 26, 34), { c1: '#ffffff', c2: '#a8b3c7', rim: '#fff6b0', line: '#334155', lw: 2.4 });
      s += K.line('M88 126q6 4 12 0q6 4 12 0M90 138q5 4 10 0q5 4 10 0', '#94a3b8', 1.3);
      // шея
      s += K.line('M100 96V70', '#030712', 13) + K.line('M100 96V70', '#374151', 9);
      s += collar(K, 100, 92, 18, 7, 3);
      // голова и клюв
      s += K.vol(K.ell(100, 58, 15, 14), { c1: '#4b5563', c2: '#0b0f19', rim: '#fff6b0', line: '#030712', lw: 2.2, tex: false });
      s += K.part('M108 60C124 64 138 78 146 98C148 102 144 104 142 100C132 82 120 72 106 68Z', '#1f2937', { line: '#030712', lw: 1.8 });
      s += K.line('M112 64C124 70 134 82 140 96', '#6b7280', 1.1, { op: 0.8 });
      s += K.spark(144, 102, 4, '#fffbe6');
      s += `<g class="art-eyes">${K.eye(100, 55, 5.8, { iris: '#fde68a', look: [0.5, 0.4] })}</g>` + K.line('M106 57L114 58', '#fbbf24', 1.8);
      // лунная корона
      s += `<circle class="art-aura" cx="100" cy="24" r="18" fill="${K.rad([[0, '#f8fafc', 0.8], [1, '#e0f2fe', 0]])}"/>`;
      s += K.vol(K.ell(100, 24, 10, 10), { c1: '#ffffff', c2: '#94a3b8', rim: '#fff6b0', tex: false, lw: 1.8, line: '#475569' });
      s += K.part('M82 30C86 44 114 44 118 30C112 38 88 38 82 30Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 });
      // свиток света: ближняя половина с иероглифами
      s += K.line('M20 146C20 164 180 164 180 146', '#facc15', 9, { op: 0.25 }) + K.line('M20 146C20 164 180 164 180 146', '#fef08a', 3);
      s += neon(K, 40, 162, 'ankh', '#facc15', 0.55, 0) + neon(K, 70, 168, 'water', '#22d3ee', 0.6, 0.4) + neon(K, 132, 168, 'eye', '#facc15', 0.6, 0.8) + neon(K, 162, 160, 'feather', '#f472b6', 0.6, 1.2);
      s += K.spark(20, 28, 3.4, '#fef08a', 'art-float') + K.spark(180, 28, 3.4, '#fef08a', 'art-float') + K.spark(186, 110, 2.6, '#fffbe6') + K.spark(14, 110, 2.6, '#fffbe6');
      return s;
    },

    // Котёнок Мау: пятнистый бронзовый котёнок египетской мау сидит в папирусе. Большие зелёные глаза с «подводкой»,
    // на лбу — узор-«М», за ухом голубой лотос, в ухе золотая серёжка, хвост в полоску обвил лапки
    eg_kotmau(K) {
      const F = { c1: '#f3dfb0', c2: '#b7843a', rim: '#e4ffb0', texK: 0.1, line: '#4a2c0a' };
      let s = K.aura('#84cc16', 88, 116, 0.35);
      s += papyrus(K, 26, 178, 112, -6, 0) + papyrus(K, 44, 178, 82, 4, 0.8) + papyrus(K, 174, 178, 104, 6, 0.4) + papyrus(K, 158, 178, 74, -4, 1.2);
      // хвост
      const tail = 'M130 162C156 166 172 152 166 132C162 122 152 122 150 130';
      s += K.line(tail, '#4a2c0a', 13) + K.line(tail, '#e6c98a', 9) + `<path d="${tail}" fill="none" stroke="#7a4a1a" stroke-width="9" stroke-dasharray="4 8" opacity=".75"/>`;
      // тело
      s += K.vol('M100 108C126 108 140 128 140 150C140 168 126 176 100 176C74 176 60 168 60 150C60 128 74 108 100 108Z', F);
      s += '<g fill="#7a4a1a" opacity=".75"><ellipse cx="74" cy="140" rx="4" ry="3"/><ellipse cx="68" cy="156" rx="3.4" ry="2.6"/><ellipse cx="128" cy="138" rx="4" ry="3"/><ellipse cx="134" cy="154" rx="3.4" ry="2.6"/><ellipse cx="120" cy="164" rx="3" ry="2.2"/><ellipse cx="80" cy="166" rx="3" ry="2.2"/></g>';
      s += K.part('M88 120Q100 128 112 120Q108 140 100 146Q92 140 88 120Z', '#fbf3dc', { line: '#c9a86a', lw: 1 });
      s += K.mirror(K.vol(K.ell(86, 172, 11, 7), { ...F, tex: false, lw: 2 }) + K.line('M82 176V171M89 176V171', '#7a4a1a', 1.4));
      // уши
      s += K.mirror(K.vol('M64 84C58 66 58 50 64 36C76 42 86 52 92 62Z', { ...F, tex: false, lw: 2.4 }) + K.part('M68 76C65 64 66 54 69 46C75 50 81 56 85 62Z', '#f9a8d4', { line: '#9d174d', lw: 1.2 }));
      // голова
      s += K.vol('M100 52C128 52 144 70 144 92C144 114 126 126 100 126C74 126 56 114 56 92C56 70 72 52 100 52Z', F);
      s += K.line('M84 70L88 60L100 68L112 60L116 70', '#7a4a1a', 2.8);
      s += '<g fill="#7a4a1a" opacity=".7"><ellipse cx="66" cy="84" rx="3" ry="2.2"/><ellipse cx="134" cy="84" rx="3" ry="2.2"/><ellipse cx="94" cy="58" rx="2" ry="1.6"/><ellipse cx="106" cy="58" rx="2" ry="1.6"/></g>';
      s += K.gloss(76, 68, 8, 4, -35, 0.35);
      // лотос за ухом, серёжка
      s += lotus(K, 62, 60, 0.8, -30);
      s += `<circle cx="136" cy="70" r="5" fill="none" stroke="#5a3a06" stroke-width="3.6"/><circle cx="136" cy="70" r="5" fill="none" stroke="#fbbf24" stroke-width="2"/>`;
      // мордочка
      s += K.eyes(100, 90, 19, 12, { iris: '#65a30d', look: [0.1, 0.2] });
      s += K.mirror(K.line('M68 94C62 96 58 100 56 106', '#4a2c0a', 2.4));
      s += K.part('M95 104H105Q100 110 95 104Z', '#f472b6', { line: '#9d174d', lw: 1.2 }) + K.mouth('cat', 100, 110, 12);
      s += K.blush(74, 108, 6) + K.blush(126, 108, 6);
      s += K.mirror(K.line('M80 108Q66 104 54 106M80 112Q68 114 56 120', '#fff', 1.3, { op: 0.85 }));
      s += K.spark(100, 30, 3, '#e4ffb0', 'art-float') + K.spark(186, 50, 2.6, '#e4ffb0') + K.spark(14, 60, 2.6, '#e4ffb0', 'art-float');
      return s;
    },

    // Храмовая кошка: подросшая мау сидит столбиком, как храмовая статуэтка, на корзине с зерном у колосьев.
    // Высокие уши, миндалевидные глаза с чёрной подводкой, на шее — усех с бирюзовым скарабеем, в ухе золотая серьга
    eg_mau(K) {
      const F = { c1: '#f0d9a4', c2: '#a8742c', rim: '#e4ffb0', texK: 0.1, line: '#3b2006' };
      let s = K.aura('#a3e635', 90, 104, 0.35);
      // колосья
      s += wheat(K, 30, 160, 44, -12) + wheat(K, 40, 162, 54, -4) + wheat(K, 52, 160, 40, 8) + wheat(K, 170, 160, 44, 12) + wheat(K, 160, 162, 54, 4) + wheat(K, 148, 160, 40, -8);
      // корзина с зерном
      s += K.vol('M52 150H148L140 180H60Z', { c1: '#e7c98f', c2: '#8a5a2b', rim: '#fff0b0', tex: false, lw: 2.2, line: '#4a2c0a' });
      s += K.line('M56 158H144M58 166H142M60 174H140', '#6b3f14', 1.4, { op: 0.6 }) + K.stitch('M54 154H146', '#5a3414', 2);
      s += `<ellipse cx="100" cy="150" rx="48" ry="7" fill="${K.lin(['#fde68a', '#d4a02a'])}" stroke="#7a4a12" stroke-width="1.6"/>`;
      s += '<g fill="#b8862a"><circle cx="70" cy="150" r="1.4"/><circle cx="84" cy="148" r="1.3"/><circle cx="116" cy="148" r="1.3"/><circle cx="130" cy="151" r="1.4"/><circle cx="100" cy="153" r="1.3"/></g>';
      // хвост
      const tail = 'M120 146C146 148 162 136 158 114C156 104 148 102 146 110';
      s += K.line(tail, '#3b2006', 12) + K.line(tail, '#e6c98a', 8) + `<path d="${tail}" fill="none" stroke="#6b3f14" stroke-width="8" stroke-dasharray="4 7" opacity=".75"/>`;
      // тело
      s += K.vol('M100 70C118 70 128 90 132 112C136 130 134 142 126 150H74C66 142 64 130 68 112C72 90 82 70 100 70Z', F);
      s += '<g fill="#6b3f14" opacity=".7"><ellipse cx="76" cy="118" rx="3.4" ry="2.6"/><ellipse cx="124" cy="116" rx="3.4" ry="2.6"/><ellipse cx="72" cy="134" rx="3" ry="2.2"/><ellipse cx="128" cy="132" rx="3" ry="2.2"/><ellipse cx="80" cy="102" rx="2.6" ry="2"/><ellipse cx="120" cy="102" rx="2.6" ry="2"/></g>';
      // передние лапы
      s += K.mirror(K.vol('M84 104C82 120 82 136 84 150H96C96 136 96 120 94 104Z', { ...F, tex: false, lw: 2.2 }) + K.vol(K.ell(90, 151, 8, 5), { ...F, tex: false, lw: 2 }));
      s += collar(K, 100, 84, 24, 9, 3);
      s += K.vol(K.ell(100, 106, 5.5, 7), { c1: '#5eead4', c2: '#1e3a8a', tex: false, lw: 1.6, line: '#0b1a3a' }) + K.line('M100 100V112M95 106H105', '#0b1a3a', 1, { op: 0.6 });
      // уши
      s += K.mirror(K.vol('M80 54C74 38 74 22 78 10C88 16 96 28 98 40Z', { ...F, tex: false, lw: 2.2 }) + K.part('M82 44C79 34 79 26 81 18C87 22 91 30 93 38Z', '#f9a8d4', { line: '#9d174d', lw: 1.1 }));
      // голова
      s += K.vol('M100 34C118 34 126 46 126 58C126 72 114 82 100 82C86 82 74 72 74 58C74 46 82 34 100 34Z', F);
      s += K.line('M90 46L93 40L100 45L107 40L110 46', '#6b3f14', 2.2);
      s += K.gloss(84, 44, 5, 2.6, -35, 0.35);
      // миндалевидные глаза с подводкой
      s += K.eyes(100, 58, 11, 7, { iris: '#65a30d', lid: 'half', skin: '#e9cf95', look: [0, 0.2] });
      s += K.mirror(K.line('M78 58C74 60 72 62 70 66', INK, 2.2));
      s += K.part('M96.5 67H103.5Q100 71.5 96.5 67Z', '#f472b6', { line: '#9d174d', lw: 1 }) + K.mouth('cat', 100, 72, 9);
      s += K.mirror(K.line('M88 70Q78 68 68 70M88 73Q78 75 70 79', '#fff', 1.2, { op: 0.85 }));
      s += `<circle cx="122" cy="48" r="4" fill="none" stroke="#5a3a06" stroke-width="3.4"/><circle cx="122" cy="48" r="4" fill="none" stroke="#fbbf24" stroke-width="1.8"/>`;
      s += K.spark(40, 30, 3, '#e4ffb0', 'art-float') + K.spark(168, 24, 2.8, '#fde68a') + K.spark(180, 96, 2.4, '#e4ffb0', 'art-float');
      return s;
    },

    // Песчинка: крошечный песчаный вихрь-воронка с круглыми глазками и ручками-завитками, вокруг кружат песчинки;
    // вдали — пирамиды, рядом кроссовка, из которой сыплется песок
    eg_peschinka(K) {
      const sand = { c1: '#fde68a', c2: '#b45309', rim: '#eef0ff', line: '#7c2d12', texK: 0.2 };
      let s = K.aura('#fcd34d', 86, 112, 0.35);
      s += pyr(K, 34, 170, 46, 36, 0.55) + pyr(K, 60, 172, 28, 20, 0.45);
      // кроссовка с песком
      s += K.part('M140 176C138 166 146 160 154 162L166 165C176 165 186 169 188 175C188 179 184 180 176 180H146C142 180 140 179 140 176Z', '#f8fafc', { line: '#334155', lw: 1.8 });
      s += K.line('M141 176H188', '#38bdf8', 3) + K.line('M152 165l6 4M156 163l6 4', '#334155', 1.4) + K.part('M142 166C144 160 152 158 156 162C150 162 146 164 142 166Z', '#e7c98f', { line: '#b45309', lw: 1 });
      s += '<g fill="#e7c98f"><circle cx="136" cy="174" r="1.6"/><circle cx="132" cy="177" r="1.2"/><circle cx="138" cy="178" r="1"/></g>';
      // ручки-завитки
      s += K.mirror(K.line('M56 94C42 98 34 90 38 82C40 78 46 80 44 84', '#7c2d12', 6) + K.line('M56 94C42 98 34 90 38 82C40 78 46 80 44 84', '#fde68a', 3));
      // вихрь
      const body = 'M50 76C48 58 74 50 100 50C126 50 152 58 150 76C148 96 128 110 118 124C110 136 106 150 104 170C103 176 97 176 96 170C94 150 88 136 80 124C70 110 52 96 50 76Z';
      s += K.vol(body, sand);
      s += clip(K, body, K.line('M40 88C76 100 124 100 160 86M52 110C82 120 118 120 146 106M72 132C90 138 110 138 126 130M84 152C94 156 106 156 114 152', '#b45309', 2.6, { op: 0.45 }) +
        K.line('M40 91C76 103 124 103 160 89M52 113C82 123 118 123 146 109M72 135C90 141 110 141 126 133', '#fff7d6', 1.6, { op: 0.7 }));
      s += `<path d="M52 74C60 82 140 82 148 74" fill="none" stroke="#fff7d6" stroke-width="2" opacity=".7"/>`;
      s += K.gloss(70, 62, 8, 4, -20, 0.45);
      // мордочка
      s += K.eyes(100, 76, 16, 10.5, { iris: '#b45309', look: [0.2, 0.2] });
      s += K.blush(74, 90, 5.5) + K.blush(126, 90, 5.5) + K.mouth('o', 100, 88, 12);
      // кружащие песчинки
      let g = '';
      for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180; g += `<circle cx="${P(100, 70, 66, a).split(' ')[0]}" cy="${r1(70 + 16 * Math.sin(a))}" r="${i % 3 ? 1.6 : 2.4}" fill="#fcd34d" stroke="#b45309" stroke-width=".6"/>`; }
      s += `<g class="art-spin-soft">${g}</g>`;
      s += K.line('M18 50q10 -6 20 0M162 40q10 -6 20 0', '#fef3c7', 1.8, { op: 0.6, cls: 'art-float' });
      s += K.spark(170, 120, 3, '#fff7d6', 'art-float') + K.spark(24, 130, 2.6, '#fff7d6');
      return s;
    },

    // Джинн: песчаный дух пустыни — могучий торс вырастает из закрученного вихря. Хохолок-вихор на макушке, острые уши,
    // золотые браслеты и серьги, бирюзовый пояс; одну руку упёр в бок, в другой крутит связку найденных ключей
    eg_djinn(K) {
      const sk = { c1: '#fcd07a', c2: '#b0621a', rim: '#eef0ff', line: '#5a2a06', texK: 0.2 };
      let s = K.aura('#fbbf24', 94, 100, 0.4);
      s += pyr(K, 30, 176, 50, 40, 0.5) + pyr(K, 172, 176, 44, 32, 0.45);
      // вихревой хвост
      const tail = 'M66 108C66 130 84 142 98 150C110 157 110 168 100 172C94 175 88 172 90 166C80 172 86 184 100 182C118 180 124 162 114 150C104 138 132 126 134 108Z';
      s += K.vol(tail, { ...sk, c1: '#fde68a' });
      s += clip(K, tail, K.line('M60 122C80 132 116 132 140 118M70 138C88 146 110 146 130 136M84 158C94 162 106 162 116 156', '#b45309', 2.2, { op: 0.5 }) + K.line('M60 125C80 135 116 135 140 121M70 141C88 149 110 149 130 139', '#fff7d6', 1.4, { op: 0.7 }));
      let g = '';
      for (let i = 0; i < 9; i++) { const a = i * 40 * Math.PI / 180; g += `<circle cx="${r1(100 + 54 * Math.cos(a))}" cy="${r1(150 + 12 * Math.sin(a))}" r="${i % 2 ? 1.5 : 2.2}" fill="#fcd34d" stroke="#b45309" stroke-width=".6"/>`; }
      s += `<g class="art-spin-soft">${g}</g>`;
      // торс и пояс
      s += K.vol('M70 76C70 64 84 60 100 60C116 60 130 64 130 76C132 92 126 106 124 114H76C74 106 68 92 70 76Z', sk);
      s += K.line('M86 84Q100 90 114 84M92 98Q100 101 108 98', '#8a4a10', 1.4, { op: 0.5 });
      s += K.part('M72 104Q100 112 128 104L126 118Q100 124 74 118Z', '#0ea5e9', { line: '#0c4a6e', lw: 1.8 }) + K.stitch('M74 111Q100 118 126 111', '#fde68a', 1.6);
      s += K.rhomb(100, 114, 5, '#fbbf24', '#5a3a06');
      // левая рука в бок
      s += K.vol('M72 72C58 76 48 90 54 102C58 108 68 108 74 104C68 98 68 90 76 86Z', { ...sk, tex: false, lw: 2.2 }) + K.line('M56 88l8 4', '#fbbf24', 3.4);
      // правая рука с ключами
      s += K.vol('M128 72C142 70 152 60 156 46C162 44 166 50 164 56C160 72 148 86 130 90Z', { ...sk, tex: false, lw: 2.2 }) + K.line('M148 64l7 4', '#fbbf24', 3.4);
      s += ellV(K, 160, 46, 7, 6.5, 0, { ...sk, tex: false, lw: 2 });
      s += `<g class="art-sway" style="transform-origin:50% 0%"><circle cx="160" cy="58" r="5" fill="none" stroke="#5a3a06" stroke-width="3"/><circle cx="160" cy="58" r="5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>` +
        K.part('M156 62L152 74L154 76L156 72L158 74L160 70Z', '#e5e7eb', { line: '#475569', lw: 1.2 }) + K.part('M163 62L170 72L168 74L166 71L165 74L162 68Z', '#fbbf24', { line: '#78350f', lw: 1.2 }) + '</g>';
      // голова
      s += K.mirror(K.part('M80 42L64 32L78 54Z', '#f5b964', { line: '#5a2a06', lw: 1.8 }));
      s += K.part('M96 26C90 12 102 2 114 6C124 10 124 22 114 24C118 18 112 12 106 16C102 20 104 24 104 28Z', '#fde68a', { line: '#7c2d12', lw: 1.8 }) + K.line('M95 26H105', '#fbbf24', 4);
      s += K.vol(K.ell(100, 44, 22, 21), sk);
      s += K.gloss(88, 32, 6, 3.2, -35, 0.4);
      s += `<circle cx="79" cy="54" r="3.4" fill="none" stroke="#fbbf24" stroke-width="1.8"/><circle cx="121" cy="54" r="3.4" fill="none" stroke="#fbbf24" stroke-width="1.8"/>`;
      s += K.eyes(100, 42, 9, 6.4, { iris: '#0ea5e9', lid: 'half', skin: '#f0a850', look: [0.5, 0.1] });
      s += K.line('M84 32Q90 28 96 32M104 30Q110 25 116 29', '#7c2d12', 2);
      s += K.mouth('grin', 100, 52, 14);
      s += K.part('M97 62Q100 72 106 66Q102 67 101 62Z', '#7c2d12', { line: '#3b1606', lw: 1 });
      s += K.spark(30, 60, 3, '#fff7d6', 'art-float') + K.spark(180, 110, 2.8, '#fde68a') + K.spark(176, 20, 2.6, '#fff7d6') + K.spark(24, 118, 2.4, '#fde68a', 'art-float');
      return s;
    },

    // Мумийка: круглый малыш в бинтах, проспал три тысячи лет и ещё не проснулся — сонные глазки в щёлочке бинтов,
    // зевает; на макушке торчит хвостик бинта, другой конец размотался и тянется по полу; на груди — анх, над ним месяц
    eg_mumiyka(K) {
      const B = { c1: '#fbf5e6', c2: '#a8977a', rim: '#e9d5ff', line: '#4a3b28', texK: 0.35 };
      const body = 'M100 60C132 60 150 84 150 116C150 150 138 176 100 176C62 176 50 150 50 116C50 84 68 60 100 60Z';
      let s = K.aura('#a78bfa', 86, 118, 0.35);
      s += moon(K, 160, 38, 11);
      // размотанный бинт по полу
      const tr = 'M64 164C44 172 32 164 22 174C18 178 26 182 36 179';
      s += K.line(tr, '#4a3b28', 10) + K.line(tr, '#efe4c8', 7) + K.line(tr, '#b8a888', 1.2, { op: 0.7 });
      // ножки
      s += K.mirror(K.vol(K.ell(80, 174, 13, 7), { ...B, tex: false, lw: 2.2 }));
      // тельце
      s += K.vol(body, B);
      s += wraps(K, body, 66, 176, 12);
      // хвостик бинта на макушке
      s += K.part('M104 64C110 50 124 44 132 48C126 52 118 58 112 66Z', '#f5ecd6', { line: '#4a3b28', lw: 1.8 });
      // щёлочка для глаз
      s += K.part('M58 100Q100 90 142 100L142 122Q100 114 58 122Z', '#2e1f4a', { flat: true, line: '#4a3b28', lw: 1.8 });
      s += K.eyes(100, 110, 18, 9.5, { iris: '#8b5cf6', lid: 'half', skin: '#2e1f4a', look: [0, 0.2] });
      // зевок и румянец
      s += K.mouth('o', 100, 130, 14) + K.blush(70, 132, 6.5) + K.blush(130, 132, 6.5);
      // ручки
      s += ellV(K, 50, 136, 10, 8, 25, { ...B, tex: false, lw: 2.2 }) + ellV(K, 150, 136, 10, 8, -25, { ...B, tex: false, lw: 2.2 });
      s += K.line('M144 142C150 150 148 158 154 162', '#efe4c8', 4) + K.line('M144 142C150 150 148 158 154 162', '#4a3b28', 1, { op: 0.6 });
      s += ankh(K, 100, 158, 0.75, '#fbbf24');
      s += K.line('M150 84q6 -8 12 -4M158 74q6 -8 12 -4', '#e9d5ff', 1.6, { op: 0.6 });
      s += K.spark(30, 60, 3, '#e9d5ff', 'art-float') + K.spark(176, 110, 2.6, '#e9d5ff') + K.spark(38, 100, 2.2, '#fde68a');
      return s;
    },

    // Мумия: подросшая Мумийка — высокая, добрая и рассеянная. Одна рука машет, в другой — рулон бинта, из которого
    // вьётся лента сердечком; один глаз прикрыт сползшим бинтом; на груди бирюзовый скарабей
    eg_mumiya(K) {
      const B = { c1: '#f8f1de', c2: '#9c8a6c', rim: '#e9d5ff', line: '#46382a', texK: 0.35 };
      const body = 'M100 36C124 36 136 54 136 78L138 150C138 166 128 176 100 176C72 176 62 166 62 150L64 78C64 54 76 36 100 36Z';
      let s = K.aura('#8b5cf6', 90, 108, 0.35);
      s += moon(K, 170, 30, 10);
      // лента-сердечко
      s += K.line('M30 136C24 150 34 158 42 154', '#46382a', 6) + K.line('M30 136C24 150 34 158 42 154', '#efe4c8', 4);
      s += `<g class="art-float">${K.part('M48 170C34 160 32 148 40 146C44 145 47 148 48 151C49 148 52 145 56 146C64 148 62 160 48 170Z', '#f472b6', { line: '#9d174d', lw: 1.6 })}</g>`;
      // ножки
      s += K.mirror(K.vol(K.ell(84, 176, 12, 6), { ...B, tex: false, lw: 2 }));
      // тело
      s += K.vol(body, B);
      s += wraps(K, body, 44, 176, 11);
      // размотанный край внизу
      s += K.part('M122 160C136 164 146 172 158 170C150 176 138 178 126 172Z', '#f1e7cc', { line: '#46382a', lw: 1.6 });
      // рука с рулоном
      s += K.vol('M66 96C52 100 40 108 34 118C38 126 46 126 50 120C54 114 60 110 68 110Z', { ...B, tex: false, lw: 2.2 });
      s += K.vol(K.ell(30, 126, 10, 12), { c1: '#fffaf0', c2: '#b8a888', tex: false, lw: 2, line: '#46382a' }) + `<ellipse cx="30" cy="126" rx="4" ry="5" fill="none" stroke="#b8a888" stroke-width="1.4"/>`;
      // машущая рука
      s += `<g class="art-sway" style="transform-origin:0% 100%">${K.vol('M134 90C146 84 154 72 156 60C162 58 166 62 164 68C162 84 152 98 136 106Z', { ...B, tex: false, lw: 2.2 })}${ellV(K, 160, 58, 7, 7, 0, { ...B, tex: false, lw: 2 })}</g>`;
      // щель для глаз и глаз
      s += K.part('M68 70Q100 62 132 70L132 90Q100 84 68 90Z', '#2e1f4a', { flat: true, line: '#46382a', lw: 1.8 });
      s += `<g class="art-eyes">${K.eye(86, 79, 8, { iris: '#14b8a6', look: [0.2, 0.1] })}</g>`;
      s += K.eye(114, 79, 8, { iris: '#14b8a6', look: [0.2, 0.1] });
      s += K.part('M100 64L136 70L134 94L104 88Z', '#f1e7cc', { line: '#46382a', lw: 1.6 }) + K.line('M104 72L132 77M104 80L132 85', '#b8a888', 1.4);
      s += K.mouth('smile', 96, 100, 14) + K.blush(76, 100, 5.5);
      // скарабей на груди
      s += K.vol(K.ell(100, 126, 7, 8.5), { c1: '#5eead4', c2: '#1e3a8a', tex: false, lw: 1.6, line: '#0b1a3a' }) + K.line('M100 119V133M94 126H106', '#0b1a3a', 1, { op: 0.6 }) + K.line('M93 124l-5 -3M107 124l5 -3', '#fbbf24', 2);
      s += K.spark(24, 76, 3, '#e9d5ff', 'art-float') + K.spark(180, 120, 2.6, '#e9d5ff') + K.spark(150, 16, 2.4, '#fde68a');
      return s;
    },

    // Сфинкс: каменный лев с человеческой головой лежит перед пирамидами, передние лапы вытянуты. Полосатый немес
    // с уреем на лбу, подведённые глаза, спокойная улыбка, заплетённая бородка; вокруг — песчаные знаки вопроса
    eg_sfinks(K) {
      const st = { c1: '#f3d9a0', c2: '#a8742c', rim: '#eef0ff', line: '#5a3a10', texK: 0.2 };
      let s = K.aura('#fcd34d', 96, 104, 0.35);
      s += pyr(K, 36, 150, 64, 60, 0.8) + pyr(K, 168, 146, 56, 52, 0.75);
      // задняя часть
      s += K.line('M170 170C186 170 192 158 186 148', '#5a3a10', 6) + K.line('M170 170C186 170 192 158 186 148', '#e7c98f', 3);
      s += K.vol('M112 122C140 112 172 124 176 150C178 166 168 176 150 176H110Z', st);
      // грудь
      s += K.vol('M64 112C64 96 80 90 100 90C120 90 136 96 136 112L140 160C140 170 128 176 100 176C72 176 60 170 60 160Z', st);
      s += K.line('M72 140Q100 146 128 140M76 156Q100 160 124 156', '#a8742c', 1.4, { op: 0.45 });
      // лапы
      s += K.mirror(K.vol('M58 148C52 158 52 172 58 178H92C96 174 96 164 90 156Z', st) + K.line('M68 178V172M76 178V171M84 178V172', '#5a3a10', 1.6));
      // немес
      const nem = 'M70 52C70 34 84 24 100 24C116 24 130 34 130 52L136 72L150 112H122L118 82H82L78 112H50L64 72Z';
      s += stripes(K, nem, '#fbbf24', '#1e3a8a', 4.4, 0, '#2a1a06', 2);
      // лицо
      s += K.vol('M82 52C82 42 90 38 100 38C110 38 118 42 118 52L118 70C118 84 110 92 100 92C90 92 82 84 82 70Z', { c1: '#f3cd8e', c2: '#b07a34', rim: '#eef0ff', tex: false, line: '#5a3a10' });
      s += K.line('M81 44Q100 36 119 44', '#5a3a06', 5) + K.line('M81 44Q100 36 119 44', '#fbbf24', 3);
      // урей
      s += K.part('M96 44C94 36 95 30 100 27C105 30 106 36 104 44Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }) + `<circle cx="100" cy="34" r="1.6" fill="#dc2626"/>`;
      // глаза с подводкой
      s += K.eyes(100, 60, 9, 5.8, { iris: '#1e3a8a', lid: 'half', skin: '#e3b574', look: [0, 0.2] });
      s += K.mirror(K.line('M82 60L76 62', INK, 2.2));
      s += K.line('M100 64V72Q98 74 96 73', '#8a5a1a', 1.6) + K.mouth('smile', 100, 78, 10);
      // бородка
      s += stripes(K, 'M95 90H105L107 104Q100 110 93 104Z', '#1e3a8a', '#fbbf24', 3, 0, '#0b1a3a', 1.4);
      s += collar(K, 100, 100, 22, 7, 3);
      // загадки
      s += neon(K, 164, 70, 'ask', '#fde68a', 1.1, 0) + neon(K, 30, 74, 'ask', '#fde68a', 0.8, 0.7) + neon(K, 176, 30, 'sun', '#fbbf24', 0.8, 1.2);
      s += K.spark(24, 30, 3, '#fff7d6', 'art-float') + K.spark(180, 110, 2.6, '#fde68a');
      return s;
    },

    // Бенну: египетский феникс — огненная цапля с двумя длинными перьями хохолка стоит на золотом камне-бенбен
    // на фоне восходящего солнца; крылья приподняты, кончики перьев горят, вверх летят искры возрождения
    eg_bennu(K) {
      let s = K.aura('#ffb020', 100, 90, 0.5);
      // солнце позади
      let d = '';
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, w = 0.09; d += `M${P(104, 74, 48, a - w)}L${P(104, 74, i % 2 ? 60 : 68, a)}L${P(104, 74, 48, a + w)}Z`; }
      s += `<g class="art-spin-soft"><path d="${d}" fill="#fde68a" stroke="#ea580c" stroke-width="1" opacity=".85"/></g>`;
      s += `<circle cx="104" cy="74" r="46" fill="${K.rad([[0, '#fff6c2'], [0.7, '#fdba74'], [1, '#f97316']])}" stroke="#ea580c" stroke-width="2"/>`;
      // камень-бенбен
      s += K.vol('M62 178L74 150H126L138 178Z', { c1: '#e7c98f', c2: '#8a5a2b', rim: '#ffe29a', tex: false, lw: 2.2, line: '#4a2c0a' });
      s += K.vol('M74 150L100 128L126 150Z', { c1: '#fff0a0', c2: '#d97706', rim: '#fff6c2', tex: false, lw: 2.2, line: '#7a3a06' });
      s += K.line('M70 162H130M66 172H134', '#8a5a2b', 1.2, { op: 0.6 });
      // ноги
      s += K.line('M96 130L92 108M104 130L108 108', '#7c2d12', 4.6) + K.line('M96 130L92 108M104 130L108 108', '#f97316', 2) + K.line('M90 131h12M100 131h12', '#7c2d12', 2.6);
      // крылья
      const W = 'M88 96C70 82 48 76 22 82C30 86 34 90 34 94C26 96 22 102 22 108C30 106 36 108 40 110C36 116 36 120 40 126C54 120 72 112 90 108Z';
      const wing = `<g class="art-wing"><path d="${W}" fill="${K.lin(['#fde68a', '#fb923c', '#c2410c'], 0, 0, 1, 0.4)}" stroke="#7c2d12" stroke-width="2" stroke-linejoin="round"/>` +
        K.line('M84 100C66 90 46 86 28 86M84 104C64 98 46 98 28 104M84 106C66 106 52 112 42 120', '#fff3b0', 1.3, { op: 0.8 }) +
        K.flame(26, 84, 16, 10, '#fff0a0', '#ef4444', { style: 'animation-delay:-.3s' }) + K.flame(26, 108, 14, 9, '#fff0a0', '#ef4444', { style: 'animation-delay:-.8s' }) + '</g>';
      s += wing + `<g transform="translate(200 0) scale(-1 1)">${wing}</g>`;
      // хвост
      s += K.part('M88 104L74 130L84 124L84 136L94 118Z', '#ea580c', { line: '#7c2d12', lw: 1.6 });
      // тело
      s += K.vol(K.ell(100, 98, 22, 18), { c1: '#fed7aa', c2: '#c2410c', rim: '#ffe29a', rimK: 0.7, line: '#7c2d12' });
      s += K.line('M88 98q4 4 8 0q4 4 8 0q4 4 8 0', '#9a3412', 1.2, { op: 0.6 });
      // шея
      const neck = 'M104 88C116 76 104 62 110 50';
      s += K.line(neck, '#7c2d12', 12) + K.line(neck, '#fdba74', 8) + K.line('M106 84C114 76 106 64 110 54', '#fff3b0', 1.6, { op: 0.6 });
      // хохолок
      s += K.line('M106 42C92 34 80 32 64 36M108 40C96 28 84 22 70 22', '#7c2d12', 4.4) + K.line('M106 42C92 34 80 32 64 36M108 40C96 28 84 22 70 22', '#f97316', 2.4);
      s += K.flame(64, 37, 12, 8, '#fff0a0', '#ef4444', { style: 'animation-delay:-.5s' }) + K.flame(70, 23, 12, 8, '#fff0a0', '#ef4444', { style: 'animation-delay:-1s' });
      // голова и клюв
      s += K.vol(K.ell(112, 46, 12, 11), { c1: '#ffedd5', c2: '#ea580c', rim: '#ffe29a', tex: false, line: '#7c2d12', lw: 2 });
      s += K.part('M121 42L160 50L121 52Z', '#fbbf24', { line: '#7a3a06', lw: 1.6 }) + K.line('M122 47L150 50', '#7a3a06', 1);
      s += `<g class="art-eyes">${K.eye(114, 44, 4.6, { iris: '#dc2626', look: [0.6, 0.2] })}</g>` + K.line('M118 46L124 48', INK, 1.4);
      // искры возрождения
      s += K.spark(40, 40, 3.6, '#fff3b0', 'art-float') + K.spark(164, 110, 3.2, '#fff3b0', 'art-float') + K.spark(30, 140, 2.6, '#ffd23f') + K.spark(172, 150, 2.6, '#ffd23f') + K.spark(150, 20, 2.4, '#fffbe6');
      return s;
    },

    // Апоп: огромный змей тьмы свернулся кольцами, фиолетовая чешуя с горящим зигзагом. Поднял голову и хитро
    // косится светящимися глазами на солнышко вдали — облизывается раздвоенным языком
    eg_apop(K) {
      let s = K.aura('#7c3aed', 96, 112, 0.4);
      s += sunBall(K, 164, 34, 13, true);
      const tube = (d, w) => K.line(d, '#12051f', w + 5) + K.line(d, '#6d28d9', w) + K.line(d, '#8b5cf6', w * 0.55, { op: 0.8 }) +
        `<path d="${d}" fill="none" stroke="#f0abfc" stroke-width="2.6" stroke-dasharray="3 9" stroke-linecap="round" opacity=".8"/>` + K.line(d, '#ddd6fe', 1.6, { op: 0.35 });
      // хвост
      s += tube('M150 170C170 176 186 168 188 154', 9) + K.part('M184 152L192 140L192 156Z', '#a78bfa', { line: '#12051f', lw: 1.4 });
      // кольца
      s += tube('M36 166A64 12 0 1 0 164 166A64 12 0 1 0 36 166', 18);
      s += tube('M52 148A48 11 0 1 0 148 148A48 11 0 1 0 52 148', 16);
      s += tube('M68 132A32 9 0 1 0 132 132A32 9 0 1 0 68 132', 14);
      // шея
      s += tube('M114 128C132 110 128 92 110 82C100 76 94 76 94 70', 14);
      s += K.line('M118 118C128 106 124 94 112 86', '#e9d5ff', 3, { op: 0.35 });
      // голова
      s += K.vol('M60 58C60 40 76 32 94 32C112 32 126 42 124 58C122 72 108 80 92 80C74 80 60 72 60 58Z', { c1: '#8b5cf6', c2: '#1e0b36', rim: '#e9d5ff', rimK: 0.6, line: '#12051f' });
      s += K.line('M78 40q4 3 8 0q4 3 8 0q4 3 8 0M84 48q4 3 8 0q4 3 8 0', '#c4b5fd', 1.3, { op: 0.6 });
      s += K.gloss(74, 42, 6, 3, -30, 0.3);
      // глаза косятся на солнце
      s += K.glow(80, 56, 5.5, 6.5, '#facc15') + K.glow(106, 54, 5.5, 6.5, '#facc15');
      s += `<ellipse cx="82" cy="56" rx="1.4" ry="4.4" fill="#12051f"/><ellipse cx="108" cy="54" rx="1.4" ry="4.4" fill="#12051f"/>`;
      s += K.line('M70 46L88 50M98 48L116 42', '#12051f', 3);
      // ухмылка с клыками, язык
      s += K.line('M70 68Q92 78 116 64', '#12051f', 2.6) + `<path d="M76 70.6l2 5 2.4 -4zM106 69l1.4 5 2.6 -4.4z" fill="#fff"/>`;
      s += `<g class="art-sway" style="transform-origin:0% 0%">${K.line('M92 74L94 88M94 88l-4 5M94 88l4 5', '#f43f5e', 2.4)}</g>`;
      s += `<ellipse cx="68" cy="58" rx="1.4" ry="1" fill="#12051f"/><ellipse cx="64" cy="60" rx="1.4" ry="1" fill="#12051f"/>`;
      s += K.spark(24, 40, 3, '#e9d5ff', 'art-float') + K.spark(30, 110, 2.6, '#c4b5fd') + K.spark(180, 96, 2.4, '#e9d5ff', 'art-float') + K.spark(140, 12, 2.2, '#c4b5fd');
      return s;
    },

    // Анубис: бог-шакал в золотом усехе и белом схенти. Высокие уши, подведённые золотые глаза; в одной руке весы
    // истины — на одной чаше пёрышко Маат, на другой сердце, чаши в равновесии; в другой руке посох-уас. Ночь, звёзды
    eg_anubis(K) {
      const blk = { c1: '#4b5563', c2: '#0b0f19', rim: '#e9d5ff', rimK: 0.6, line: '#030712', texK: 0.5 };
      let s = K.aura('#8b5cf6', 98, 104, 0.45);
      s += moon(K, 172, 24, 9);
      // посох
      s += was(K, 158, 44, 172);
      // ноги
      s += K.mirror(K.vol('M86 156H96V174H86Z', { ...blk, tex: false, lw: 2 }) + K.part('M82 174H100Q101 179 96 179H84Q80 179 82 174Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }));
      // схенти
      s += K.vol('M76 122H124L132 158Q100 164 68 158Z', { c1: '#ffffff', c2: '#d6c9a8', rim: '#e9d5ff', tex: false, lw: 2.2, line: '#3b2a0a' });
      s += K.line('M82 128L76 158M90 128L86 160M110 128L114 160M118 128L124 158', '#c9b894', 1.3);
      s += stripes(K, 'M92 126H108L112 162H88Z', '#fbbf24', '#1e3a8a', 3.4, 0, '#5a3a06', 1.6);
      s += K.line('M76 124H124', '#5a3a06', 5) + K.line('M76 124H124', '#fbbf24', 3);
      // торс
      s += K.vol('M74 94C74 86 86 84 100 84C114 84 126 86 126 94C128 108 122 120 118 126H82C78 120 72 108 74 94Z', blk);
      // правая рука с посохом
      s += K.vol('M124 92C136 96 146 102 154 108C158 114 154 120 148 118C140 112 132 108 122 106Z', { ...blk, tex: false, lw: 2.2 }) + K.line('M138 99l-3 9', '#fbbf24', 3.6);
      s += ellV(K, 156, 112, 7, 6.5, 0, { ...blk, tex: false, lw: 2 });
      // весы
      s += K.line('M40 60V70M14 72H66', '#5a3a06', 4.6) + K.line('M40 60V70M14 72H66', '#fbbf24', 2.6);
      s += K.line('M14 72L8 100M14 72L20 100M66 72L60 100M66 72L72 100', '#fbbf24', 1.2);
      s += K.part('M4 100H24Q14 110 4 100Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }) + K.part('M56 100H76Q66 110 56 100Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 });
      s += K.part('M14 99C12 90 13 84 16 80C19 86 19 92 16 99Z', '#f8fafc', { line: '#475569', lw: 1.2 }) + K.line('M15 98V82', '#94a3b8', 0.8);
      s += K.part('M66 99C60 95 58 91 61 89C63 88 65 89 66 91C67 89 69 88 71 89C74 91 72 95 66 99Z', '#ef4444', { line: '#7f1d1d', lw: 1.2 });
      // левая рука держит весы
      s += K.vol('M78 90C66 86 54 76 46 64C42 58 48 52 54 56C62 66 70 74 82 78Z', { ...blk, tex: false, lw: 2.2 }) + K.line('M58 70l6 -6', '#fbbf24', 3.6);
      s += ellV(K, 44, 60, 6.5, 6, 0, { ...blk, tex: false, lw: 2 });
      s += collar(K, 100, 90, 28, 10, 4);
      // уши
      s += K.mirror(K.vol('M78 46L70 8L96 36Z', { ...blk, tex: false, lw: 2.2 }) + K.part('M80 40L75 17L90 35Z', '#4c1d95', { line: '#030712', lw: 1 }));
      // голова шакала
      const head = 'M100 30C118 30 128 42 128 56C128 66 120 74 112 80L106 98C104 102 96 102 94 98L88 80C80 74 72 66 72 56C72 42 82 30 100 30Z';
      s += K.vol(head, blk);
      s += K.line('M82 38Q100 32 118 38', '#fbbf24', 2.4, { op: 0.9 });
      s += K.gloss(84, 42, 6, 3, -35, 0.25);
      s += K.eyes(100, 56, 13, 6.4, { iris: '#fbbf24', lid: 'half', skin: '#1f2937', look: [0, 0.2] });
      s += K.mirror(K.line('M81 57L72 60', '#fbbf24', 2));
      s += K.vol(K.ell(100, 96, 6, 4.5), { c1: '#374151', c2: '#030712', tex: false, lw: 1.6, line: '#000' }) + K.line('M100 100V103', '#9ca3af', 1.2);
      s += K.spark(24, 30, 3.2, '#fde68a', 'art-float') + K.spark(180, 64, 2.8, '#e9d5ff') + K.spark(20, 136, 2.6, '#e9d5ff', 'art-float') + K.spark(184, 140, 2.4, '#fde68a');
      return s;
    },

    // Исида: богиня-чародейка распахнула руки-крылья в бирюзово-золотом узоре. Чёрный парик с золотым обручем,
    // на голове — знак трона, на поясе красный узел-тит; с кончиков крыльев капают слёзы, из которых разливается Нил
    eg_isida(K) {
      const skin = { c1: '#f2c08a', c2: '#a8622a', rim: '#c8f3ff', tex: false, line: '#4a2408' };
      let s = K.aura('#38bdf8', 100, 104, 0.45);
      s += nile(K, 168, 0.9);
      // крылья
      const W = 'M82 100C62 90 34 84 6 90Q10 96 18 100Q12 104 12 116Q18 116 24 120Q20 126 24 136Q30 134 38 138Q38 144 48 148C58 138 70 126 84 116Z';
      s += K.mirror(`<g class="art-wing">${ewing(K, W, 84, 108, 26, 52, ['#fbbf24', '#2dd4bf', '#1d4ed8'], 150, 205, 9)}</g>`);
      // руки вдоль верхнего края крыльев
      s += K.mirror(K.line('M82 98C62 90 36 86 12 90', '#4a2408', 7.5) + K.line('M82 98C62 90 36 86 12 90', '#e7a86a', 4.6) + K.line('M40 88l2 6', '#fbbf24', 3) + K.part(K.ell(12, 90, 4.6, 4), '#e7a86a', { line: '#4a2408', lw: 1.6 }));
      // слёзы-капли
      s += drop(14, 130, 3.4, '#bfeaff', 'art-float', 0) + drop(186, 130, 3.4, '#bfeaff', 'art-float', 0.7) + drop(40, 156, 2.8, '#bfeaff', 'art-float', 1.1) + drop(160, 156, 2.8, '#bfeaff', 'art-float', 0.4);
      // платье
      s += K.vol('M84 100C84 94 92 92 100 92C108 92 116 94 116 100L122 160C124 172 118 178 100 178C82 178 76 172 78 160Z', { c1: '#f0f9ff', c2: '#7dd3fc', rim: '#fde68a', tex: false, lw: 2.2, line: '#0c4a6e' });
      s += K.line('M92 110L88 170M108 110L112 170', '#bae6fd', 1.4);
      // узел Исиды — тит
      s += K.line('M100 116V140M100 132L92 144M100 132L108 144', '#7f1d1d', 5.6) + K.line('M100 116V140M100 132L92 144M100 132L108 144', '#dc2626', 3.4) + `<circle cx="100" cy="114" r="4.4" fill="none" stroke="#7f1d1d" stroke-width="5"/><circle cx="100" cy="114" r="4.4" fill="none" stroke="#dc2626" stroke-width="3"/>`;
      s += collar(K, 100, 96, 22, 9, 4);
      // парик
      s += stripes(K, 'M78 70C76 50 86 38 100 38C114 38 124 50 122 70L124 104L112 104L110 80H90L88 104L76 104Z', '#1e1b4b', '#312e81', 3, 0, '#0b0a1f', 2);
      // лицо
      s += K.vol(K.ell(100, 68, 15, 17), skin);
      s += K.line('M84 54Q100 46 116 54', '#5a3a06', 4.6) + K.line('M84 54Q100 46 116 54', '#fbbf24', 2.6);
      s += K.eyes(100, 68, 6.8, 5, { iris: '#0e7490', lash: true, look: [0, 0.2] });
      s += K.mirror(K.line('M87 69L82 70', INK, 1.8));
      s += K.blush(89, 77, 3.6) + K.blush(111, 77, 3.6) + K.mouth('smile', 100, 78, 8);
      // знак трона на голове
      s += stripes(K, 'M88 40V20H97V30H112V40Z', '#fbbf24', '#1d4ed8', 3, 0, '#5a3a06', 1.8);
      s += K.spark(20, 40, 3.4, '#e0f7ff', 'art-float') + K.spark(180, 40, 3.4, '#e0f7ff', 'art-float') + K.spark(146, 16, 2.6, '#fde68a') + K.spark(54, 16, 2.6, '#fde68a');
      return s;
    },

    // Ра: бог солнца с головой сокола плывёт в золотой ладье. Над головой — огромный солнечный диск, обвитый уреем,
    // лучи медленно вращаются; полосатый парик, усех; в одной руке анх, в другой посох-уас; на носу ладьи — око Уаджет
    eg_ra(K) {
      const skin = { c1: '#e0935a', c2: '#7c3a12', rim: '#ffe29a', tex: false, line: '#3b1606' };
      let s = K.aura('#ffb020', 100, 96, 0.6) + K.aura('#ef4444', 70, 60, 0.3);
      // длинные лучи
      let d = '';
      for (let i = 0; i < 20; i++) { const a = i * Math.PI / 10, w = 0.06; d += `M${P(100, 38, 34, a - w)}L${P(100, 38, i % 2 ? 50 : 62, a)}L${P(100, 38, 34, a + w)}Z`; }
      s += `<g class="art-spin-soft"><path d="${d}" fill="#fde68a" stroke="#ea580c" stroke-width="1" opacity=".9"/></g>`;
      s += sunBall(K, 100, 38, 30, false);
      // урей вокруг диска
      s += K.line('M72 48C78 66 122 66 128 48', '#14532d', 5.4) + K.line('M72 48C78 66 122 66 128 48', '#22c55e', 3);
      s += K.part('M94 62C90 52 94 46 100 44C106 46 110 52 106 62Z', '#22c55e', { line: '#14532d', lw: 1.6 }) + `<circle cx="100" cy="51" r="1.8" fill="#dc2626"/>`;
      // посох и тело
      s += was(K, 152, 60, 152);
      s += K.vol('M76 106C76 98 88 96 100 96C112 96 124 98 124 106C126 122 122 136 118 146H82C78 136 74 122 76 106Z', skin);
      s += K.part('M80 136H120L124 150H76Z', '#fbbf24', { line: '#5a3a06', lw: 1.6 });
      // руки
      s += K.vol('M80 102C70 102 60 104 50 104C44 106 44 114 50 116C60 116 70 114 80 114Z', skin) + K.line('M62 103v12', '#fbbf24', 3.4);
      s += ankh(K, 48, 100, 1.1);
      s += ellV(K, 49, 110, 6.5, 6, 0, skin);
      s += K.vol('M120 102C130 104 140 106 148 106C154 108 154 116 148 118C138 118 128 116 120 114Z', skin) + K.line('M136 105v12', '#fbbf24', 3.4);
      s += ellV(K, 152, 112, 6.5, 6, 0, skin);
      // парик и усех
      s += K.mirror(stripes(K, 'M82 78L76 118L88 120L92 86Z', '#1e3a8a', '#fbbf24', 3, 0, '#0b1a3a', 1.6));
      s += collar(K, 100, 100, 28, 11, 4);
      // голова сокола
      s += K.vol('M100 64C116 64 126 74 126 88C126 100 116 108 104 108C92 108 80 102 78 92C76 82 84 64 100 64Z', { c1: '#fff7e0', c2: '#b45309', rim: '#ffe29a', texK: 0.15, line: '#4a2408' });
      s += K.part('M84 70C92 64 110 62 122 72C118 76 110 78 100 78C92 78 86 76 84 70Z', '#b45309', { line: '#4a2408', lw: 1.4 });
      s += K.vol('M90 80C80 78 68 82 64 94C62 101 65 105 69 103C69 98 72 96 77 97C82 95 87 94 92 92Z', { c1: '#94a3b8', c2: '#1e293b', rim: '#ffe29a', tex: false, lw: 1.8, line: '#0f172a' }) + K.part('M84 79C90 78 94 82 92 90L86 93Z', '#fbbf24', { flat: true, line: '#5a3a06', lw: 1.2 }) + `<ellipse cx="82" cy="86" rx="1.5" ry="1.1" fill="#0f172a"/>`;
      s += `<g class="art-eyes">${K.eye(100, 84, 7.5, { iris: '#f59e0b', look: [-0.5, 0.2] })}${K.eye(118, 83, 6, { iris: '#f59e0b', look: [-0.5, 0.2] })}</g>`;
      s += K.line('M100 92C99 98 96 104 90 108', '#1f2937', 4.4);
      // ладья
      s += K.line('M16 150C8 136 10 122 22 114M184 150C192 136 190 122 178 114', '#5a3a06', 6) + K.line('M16 150C8 136 10 122 22 114M184 150C192 136 190 122 178 114', '#fbbf24', 3.4);
      let fan = '';
      for (const [x, y, k] of [[22, 114, 1], [178, 114, -1]]) for (let i = 0; i <= 6; i++) { const a = (-150 + i * 20) * Math.PI / 180; fan += `M${x} ${y}L${r1(x + k * Math.cos(a) * 12)} ${r1(y + Math.sin(a) * 12)}`; }
      s += K.line(fan, '#5a3a06', 3) + K.line(fan, '#84cc16', 1.6);
      s += nile(K, 170, 0.9);
      s += K.vol('M12 146C40 160 160 160 188 146C184 160 170 172 150 174H50C30 172 16 160 12 146Z', { c1: '#ffe08a', c2: '#b45309', rim: '#fff6c2', tex: false, lw: 2.2, line: '#5a3a06' });
      s += K.line('M26 158Q100 168 174 158', '#1e3a8a', 3) + K.stitch('M30 164Q100 174 170 164', '#dc2626', 1.8);
      s += wedjat(K, 44, 158, 0.6) + wedjat(K, 156, 158, 0.6);
      s += K.spark(20, 40, 4, '#fff3b0', 'art-float') + K.spark(180, 40, 4, '#fff3b0', 'art-float') + K.spark(18, 90, 3, '#ffd23f') + K.spark(184, 90, 3, '#ffd23f') + K.spark(160, 8, 2.6, '#fffbe6') + K.spark(40, 8, 2.6, '#fffbe6');
      return s;
    },

    // Осирис: зеленолицый владыка возрождения в белом саване; на голове корона-атеф с перьями и рогами, заплетённая
    // бородка, скрещённые руки держат посох-крюк и цеп. У ног прорастают колосья, ростки и лотосы
    eg_osiris(K) {
      const G = { c1: '#86efac', c2: '#15803d', rim: '#e4ffb0', tex: false, line: '#052e16' };
      let s = K.aura('#84cc16', 100, 100, 0.5) + K.aura('#fbbf24', 64, 60, 0.3);
      // сад у ног
      s += wheat(K, 22, 176, 44, -14) + wheat(K, 34, 178, 56, -6) + wheat(K, 178, 176, 44, 14) + wheat(K, 166, 178, 56, 6);
      s += K.leaf(46, 176, 22, -120, '#65a30d') + K.leaf(154, 176, 22, -60, '#65a30d') + K.leaf(58, 178, 16, -150, '#84cc16') + K.leaf(142, 178, 16, -30, '#84cc16');
      // саван
      const body = 'M72 100C72 92 86 88 100 88C114 88 128 92 128 100C132 124 126 148 118 168C116 176 110 178 100 178C90 178 84 176 82 168C74 148 68 124 72 100Z';
      s += K.vol(body, { c1: '#ffffff', c2: '#b8c4d6', rim: '#e4ffb0', tex: false, lw: 2.4, line: '#334155' });
      s += clip(K, body, K.line('M60 140Q100 150 140 138M60 152Q100 162 140 150M60 164Q100 174 140 162', '#cbd5e1', 1.6));
      s += K.line('M100 134V176', '#dc2626', 4) + K.stitch('M100 136V174', '#fde68a', 1.4);
      s += lotus(K, 70, 180, 0.9, -10) + lotus(K, 130, 180, 0.9, 10, '#f472b6');
      s += collar(K, 100, 94, 28, 11, 4);
      // скрещённые руки
      s += K.vol('M74 106C86 112 100 118 114 122L110 132C96 128 82 122 70 116Z', G);
      s += K.vol('M126 106C114 112 100 118 86 122L90 132C104 128 118 122 130 116Z', G);
      // посох-крюк
      const crook = 'M86 140L118 96C122 88 132 88 134 94C136 100 130 102 128 98';
      s += K.line(crook, '#0b1a3a', 7.4) + K.line(crook, '#1e3a8a', 5) + `<path d="${crook}" fill="none" stroke="#fbbf24" stroke-width="5" stroke-dasharray="4 4"/>`;
      // цеп
      const flail = 'M116 140L84 96';
      s += K.line(flail, '#0b1a3a', 7) + K.line(flail, '#1e3a8a', 4.6) + `<path d="${flail}" fill="none" stroke="#fbbf24" stroke-width="4.6" stroke-dasharray="4 4"/>`;
      let beads = '';
      for (const [ex, ey] of [[64, 104], [66, 112], [72, 116]]) for (let k = 1; k <= 4; k++) { const t = k / 4; beads += `<circle cx="${r1(84 + (ex - 84) * t)}" cy="${r1(96 + (ey - 96) * t)}" r="2.3" fill="${k % 2 ? '#fbbf24' : '#1e3a8a'}" stroke="#0b1a3a" stroke-width=".8"/>`; }
      s += `<g class="art-sway" style="transform-origin:100% 0%">${beads}</g>`;
      s += ellV(K, 108, 126, 7, 6.5, 0, G) + ellV(K, 92, 126, 7, 6.5, 0, G);
      // голова
      s += K.vol(K.ell(100, 74, 16, 16), { ...G, texK: 0 });
      s += stripes(K, 'M95 88H105L106 104Q106 110 100 110Q96 110 96 106Q99 107 100 104L95 88Z', '#1e3a8a', '#fbbf24', 3, 0, '#0b1a3a', 1.4);
      s += K.eyes(100, 74, 7, 4.8, { iris: '#78350f', lid: 'half', skin: '#4ade80', look: [0, 0.2] });
      s += K.mirror(K.line('M87 75L82 76', INK, 1.8));
      s += K.mouth('smile', 100, 82, 8);
      // корона-атеф
      s += K.mirror(K.part('M86 62C74 50 70 32 74 16C82 28 88 44 92 60Z', '#f8fafc', { line: '#475569', lw: 1.6 }) + K.line('M76 24l6 4M76 34l8 4M80 44l8 4', '#60a5fa', 1.4));
      s += K.line('M66 64Q78 54 92 62', '#5a3a06', 5) + K.line('M66 64Q78 54 92 62', '#fbbf24', 2.8) + K.line('M134 64Q122 54 108 62', '#5a3a06', 5) + K.line('M134 64Q122 54 108 62', '#fbbf24', 2.8);
      s += K.vol('M88 64C86 44 92 22 100 12C108 22 114 44 112 64Z', { c1: '#ffffff', c2: '#cbd5e1', rim: '#e4ffb0', tex: false, lw: 2.2, line: '#334155' });
      s += K.line('M89 63H111', '#fbbf24', 3) + K.vol(K.ell(100, 10, 5, 5), { c1: '#fff0a0', c2: '#f59e0b', tex: false, lw: 1.4, line: '#5a3a06' });
      s += K.part('M97 62C95 56 96 52 100 50C104 52 105 56 103 62Z', '#fbbf24', { line: '#5a3a06', lw: 1.2 });
      s += K.spark(30, 40, 3.6, '#e4ffb0', 'art-float') + K.spark(170, 40, 3.6, '#fde68a', 'art-float') + K.spark(24, 110, 2.8, '#e4ffb0') + K.spark(178, 110, 2.8, '#e4ffb0') + K.spark(150, 16, 2.4, '#fde68a');
      return s;
    },
  });

  // ---------- 5.2: новые духи — третьи стадии, новые семейства, одиночные, легенды ----------
  Object.assign(SPIRIT_ART, {
    // Бастет: богиня-кошка — подросшая Храмовая кошка встала на задние лапы. Пятнистая бронзовая голова с «М» на лбу,
    // зелёные глаза с подводкой, золотая серьга, на макушке бирюзовый скарабей; бирюзовое платье с золотыми поясками,
    // в поднятой лапе звенит систр, на другой — корзинка, из которой выглядывает котёнок; позади колосья
    eg_bastet(K) {
      const F = { c1: '#f0d9a4', c2: '#a8742c', rim: '#e4ffb0', texK: 0.1, line: '#3b2006' };
      const D = { c1: '#86f2df', c2: '#0f766e', rim: '#e4ffb0', tex: false, line: '#073b36', lw: 2.4 };
      let s = K.aura('#84cc16', 100, 102, 0.42) + K.aura('#fde68a', 60, 40, 0.25);
      s += wheat(K, 16, 176, 50, -14) + wheat(K, 28, 178, 64, -5) + wheat(K, 184, 176, 50, 14) + wheat(K, 172, 178, 64, 5);
      // хвост в полоску
      const tail = 'M116 150C140 156 158 144 154 124C152 114 144 112 142 120';
      s += K.line(tail, '#3b2006', 11) + K.line(tail, '#e6c98a', 7) + `<path d="${tail}" fill="none" stroke="#6b3f14" stroke-width="7" stroke-dasharray="4 6" opacity=".75"/>`;
      // ноги в сандалиях
      s += K.mirror(K.vol('M86 162H96V174H86Z', { ...F, tex: false, lw: 2 }) + K.part('M82 174H100Q101 179 96 179H84Q80 179 82 174Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }));
      // платье
      const dress = 'M82 98C82 92 90 90 100 90C110 90 118 92 118 98L126 158C128 168 118 170 100 170C82 170 72 168 74 158Z';
      s += K.vol(dress, D);
      s += clip(K, dress, K.line('M60 124H140M60 150H140', '#fbbf24', 2.8) + K.stitch('M60 137H140', '#fde68a', 1.8) + K.line('M92 100L88 168M108 100L112 168', '#5eead4', 1.2, { op: 0.6 }));
      // левая лапа держит корзинку, из корзинки выглядывает котёнок
      s += K.vol('M84 98C72 98 62 106 56 114C52 120 58 126 62 122C68 116 76 110 88 106Z', { ...F, tex: false, lw: 2.2 });
      s += K.line('M40 142C40 114 74 114 74 142', '#5a3414', 4.4) + K.line('M40 142C40 114 74 114 74 142', '#d9a560', 2.4);
      s += K.part('M49 133L47 121L56 129Z', '#e6c98a', { line: '#3b2006', lw: 1.2 }) + K.part('M65 133L67 121L58 129Z', '#e6c98a', { line: '#3b2006', lw: 1.2 });
      s += K.vol(K.ell(57, 137, 10.5, 9.5), { ...F, tex: false, lw: 2 }) + K.eyes(57, 136, 4.2, 3.2, { iris: '#65a30d', look: [0.4, -0.3] }) + '<path d="M55.6 140h2.8l-1.4 1.6z" fill="#f472b6"/>';
      s += K.vol('M36 142H78L73 164H41Z', { c1: '#f1d49a', c2: '#9a6a2a', rim: '#fff0b0', tex: false, lw: 2, line: '#4a2c0a' }) + K.line('M38 150H76M40 157H74', '#7a4a1a', 1.3, { op: 0.6 }) + K.stitch('M37 145H77', '#5a3414', 1.6);
      s += ellV(K, 57, 120, 6, 5.5, 0, { ...F, tex: false, lw: 2 });
      // правая лапа поднимает систр
      s += K.vol('M116 98C128 98 138 92 146 80C150 74 158 78 156 84C150 98 136 106 120 108Z', { ...F, tex: false, lw: 2.2 });
      s += sistrum(K, 152, 76, 1.15, 8);
      s += ellV(K, 152, 82, 6.5, 6, 0, { ...F, tex: false, lw: 2 });
      // усех и скарабей
      s += collar(K, 100, 94, 22, 8, 3);
      s += K.vol(K.ell(100, 118, 5, 6.5), { c1: '#5eead4', c2: '#1e3a8a', tex: false, lw: 1.6, line: '#0b1a3a' }) + K.line('M100 112V124M95 118H105', '#0b1a3a', 1, { op: 0.6 });
      // уши
      s += K.mirror(K.vol('M80 50C74 34 74 18 78 6C88 12 96 24 98 36Z', { ...F, tex: false, lw: 2.2 }) + K.part('M82 40C79 30 79 22 81 14C87 18 91 26 93 34Z', '#f9a8d4', { line: '#9d174d', lw: 1.1 }));
      // голова
      s += K.vol('M100 30C120 30 128 44 128 58C128 74 116 84 100 84C84 84 72 74 72 58C72 44 80 30 100 30Z', F);
      s += K.line('M89 42L92 36L100 41L108 36L111 42', '#6b3f14', 2.2);
      s += '<g fill="#6b3f14" opacity=".7"><ellipse cx="78" cy="56" rx="2.4" ry="1.8"/><ellipse cx="122" cy="56" rx="2.4" ry="1.8"/><ellipse cx="80" cy="68" rx="2" ry="1.5"/><ellipse cx="120" cy="68" rx="2" ry="1.5"/></g>';
      s += K.gloss(84, 40, 5, 2.6, -35, 0.35);
      s += K.eyes(100, 58, 11.5, 7.4, { iris: '#65a30d', lid: 'half', skin: '#e9cf95', look: [0, 0.2] });
      s += K.mirror(K.line('M77 58C73 60 71 62 69 66', INK, 2.2));
      s += K.part('M96.5 67H103.5Q100 71.5 96.5 67Z', '#f472b6', { line: '#9d174d', lw: 1 }) + K.mouth('cat', 100, 72, 10);
      s += K.blush(82, 70, 4.4) + K.blush(118, 70, 4.4);
      s += K.mirror(K.line('M88 70Q78 68 66 70M88 73Q78 75 68 79', '#fff', 1.2, { op: 0.85 }));
      s += `<circle cx="123" cy="46" r="4" fill="none" stroke="#5a3a06" stroke-width="3.4"/><circle cx="123" cy="46" r="4" fill="none" stroke="#fbbf24" stroke-width="1.8"/>`;
      // скарабей на макушке
      s += K.line('M93 30l-4 -3M107 30l4 -3M94 34l-5 1M106 34l5 1', '#0b1a3a', 1.6) + K.vol(K.ell(100, 30, 6.5, 5), { c1: '#5eead4', c2: '#1e3a8a', tex: false, lw: 1.6, line: '#0b1a3a' }) + K.line('M100 25.5V34.5', '#0b1a3a', 1, { op: 0.6 });
      s += K.spark(30, 30, 3.4, '#e4ffb0', 'art-float') + K.spark(176, 22, 3, '#fde68a', 'art-float') + K.spark(186, 108, 2.6, '#e4ffb0') + K.spark(14, 104, 2.6, '#fde68a');
      return s;
    },

    // Марид: подросший Джинн — сильнейший из джиннов. Могучий торс вырастает из песчаного вихря, что вьётся из
    // золотой лампы; руки скрещены, на запястьях браслеты; белый тюрбан с рубином и пером, бородка, серьги; вокруг — буря
    eg_marid(K) {
      const sk = { c1: '#fcd07a', c2: '#b0621a', rim: '#eef0ff', line: '#5a2a06', texK: 0.18 };
      let s = K.aura('#a5b4fc', 100, 100, 0.42) + K.aura('#fbbf24', 64, 80, 0.3);
      s += pyr(K, 22, 176, 40, 30, 0.45) + pyr(K, 180, 176, 36, 26, 0.4);
      // дальняя половина бури
      s += K.line('M12 100C12 82 188 82 188 100', '#d97706', 7, { op: 0.22 }) + K.line('M12 100C12 82 188 82 188 100', '#fde68a', 2, { op: 0.7 });
      s += cloud(K, 30, 40, 0.7, '#f8fafc', 'art-float', 0.4) + cloud(K, 172, 30, 0.6, '#eef2ff', 'art-float', 1.2);
      // лампа с ручкой
      const lamp = 'M62 166C62 156 80 152 100 152C122 152 138 156 142 162L176 150C180 149 182 152 180 155C170 166 156 172 140 174C128 178 116 178 100 178C76 178 62 176 62 166Z';
      const hnd = 'M64 164C46 164 42 150 52 148C58 147 61 153 58 158';
      s += K.line(hnd, '#5a3a06', 5.4) + K.line(hnd, '#fbbf24', 3);
      s += K.vol(lamp, { c1: '#ffe08a', c2: '#b45309', rim: '#fff6c2', tex: false, lw: 2.2, line: '#5a3a06' });
      s += K.line('M68 168Q100 174 138 168', '#5a3a06', 1.4, { op: 0.6 }) + K.rhomb(100, 165, 4, '#2dd4bf', '#5a3a06') + K.rhomb(84, 164, 2.6, '#dc2626', '#5a3a06') + K.rhomb(116, 164, 2.6, '#dc2626', '#5a3a06');
      // вихрь из лампы
      const tail = 'M64 106C64 122 80 132 92 140C100 146 100 150 96 156H106C108 150 106 144 114 138C126 130 136 120 136 106Z';
      s += K.vol(tail, { ...sk, c1: '#fde68a' });
      s += clip(K, tail, K.line('M56 116C80 126 120 126 144 112M68 132C86 138 112 138 132 128M84 146C94 148 104 148 112 144', '#b45309', 2.2, { op: 0.5 }) + K.line('M56 119C80 129 120 129 144 115M68 135C86 141 112 141 132 131', '#fff7d6', 1.4, { op: 0.7 }));
      // торс и кушак
      s += K.vol('M64 72C64 60 82 56 100 56C118 56 136 60 136 72C138 88 132 102 128 110H72C68 102 62 88 64 72Z', sk);
      s += K.part('M66 100Q100 110 134 100L132 116Q100 124 68 116Z', '#0ea5e9', { line: '#0c4a6e', lw: 1.8 }) + K.stitch('M68 108Q100 116 132 108', '#fde68a', 1.6) + K.rhomb(100, 112, 5.5, '#fbbf24', '#5a3a06');
      // плечи
      s += K.mirror(K.vol('M70 62C56 62 46 74 48 90C50 100 60 104 68 98C64 88 66 78 74 74Z', { ...sk, tex: false, lw: 2.2 }));
      // скрещённые руки с браслетами
      const fa = (d, bx, by) => K.line(d, '#5a2a06', 17) + K.line(d, '#f2b45c', 12.4) + K.line(d, '#ffe2a8', 3, { op: 0.6 }) + K.line(`M${bx} ${by - 7}l1.6 13`, '#5a3a06', 6) + K.line(`M${bx} ${by - 7}l1.6 13`, '#fbbf24', 3.6);
      s += fa('M146 94L80 86', 92, 88) + fa('M54 94L120 84', 106, 87);
      s += K.line('M52 80l8 4M140 84l8 -4', '#fbbf24', 3.4);
      // уши и серьги
      s += K.mirror(K.part('M80 40L60 28L76 52Z', '#f5b964', { line: '#5a2a06', lw: 1.8 }) + `<circle cx="74" cy="54" r="3.6" fill="none" stroke="#5a3a06" stroke-width="3.2"/><circle cx="74" cy="54" r="3.6" fill="none" stroke="#fbbf24" stroke-width="1.8"/>`);
      // голова
      s += K.vol(K.ell(100, 42, 22, 21), sk);
      s += K.eyes(100, 44, 9, 6.2, { iris: '#0ea5e9', lid: 'angry', skin: '#e89a48', look: [0.2, 0.1] });
      s += K.mouth('grin', 100, 53, 13);
      s += K.part('M94 59Q100 76 108 61Q102 63 100 59Z', '#7c2d12', { line: '#3b1606', lw: 1 });
      // тюрбан с рубином и пером
      const tur = 'M76 36C70 18 84 4 100 4C116 4 130 18 124 36C116 30 84 30 76 36Z';
      s += K.vol(tur, { c1: '#ffffff', c2: '#a5b4fc', rim: '#eef0ff', tex: false, lw: 2.2, line: '#312e81' });
      s += clip(K, tur, K.line('M70 14Q100 26 130 10M70 24Q100 34 132 18', '#818cf8', 1.6, { op: 0.6 }));
      s += K.line('M77 34Q100 27 123 34', '#0c4a6e', 5) + K.line('M77 34Q100 27 123 34', '#0ea5e9', 3);
      s += plume(K, 104, 22, 24, 9, 24, '#e0f2fe', '#818cf8', '#312e81');
      s += `<circle cx="100" cy="24" r="7.6" fill="#fbbf24" stroke="#5a3a06" stroke-width="1.6"/>` + K.vol(K.ell(100, 24, 4.6, 5.4), { c1: '#fca5a5', c2: '#991b1b', tex: false, lw: 1.2, line: '#450a0a' });
      // ближняя половина бури с песчинками
      s += K.line('M12 100C12 118 188 118 188 100', '#d97706', 8, { op: 0.22 }) + K.line('M12 100C12 118 188 118 188 100', '#fde68a', 2.6, { op: 0.85 });
      let g = '';
      for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180; g += `<circle cx="${r1(100 + 84 * Math.cos(a))}" cy="${r1(100 + 14 * Math.sin(a))}" r="${i % 3 ? 1.8 : 2.8}" fill="#fcd34d" stroke="#b45309" stroke-width=".6"/>`; }
      s += `<g class="art-spin-soft">${g}</g>`;
      s += K.spark(18, 70, 3, '#fff7d6', 'art-float') + K.spark(184, 132, 2.8, '#fde68a') + K.spark(150, 10, 2.6, '#eef0ff', 'art-float') + K.spark(14, 140, 2.4, '#fde68a');
      return s;
    },

    // Бегемотик: голубой бегемотик-малыш, будто ожившая фаянсовая статуэтка из музея — по коже тушью нарисованы лотосы.
    // Стоит по щиколотку в пруду среди листьев лотоса: глазки-бугорки на макушке, широкая улыбчивая мордочка, носом пускает пузыри
    eg_begemotik(K) {
      const H = { c1: '#8fe3f0', c2: '#0e6f8f', rim: '#c8f3ff', texK: 0.12, line: '#06394d' };
      const M = { c1: '#c2f4fa', c2: '#3c9db5', rim: '#e0fbff', tex: false, line: '#06394d', lw: 2.6 };
      let s = K.aura('#38bdf8', 88, 118, 0.35);
      // пруд и листья лотоса
      s += `<ellipse cx="100" cy="174" rx="88" ry="10" fill="${K.rad([[0, '#38bdf8', 0.55], [1, '#0e7490', 0]])}"/>`;
      s += '<g class="art-aura"><ellipse cx="100" cy="174" rx="94" ry="12" fill="none" stroke="#bae6fd" stroke-width="1.4" opacity=".45"/></g>';
      s += K.part('M6 172C6 165 28 163 40 167C40 174 12 177 6 172Z', '#3fa34d', { line: '#14532d', lw: 1.4 }) + lotus(K, 22, 168, 0.75);
      s += K.part('M160 174C160 168 180 166 194 170C194 176 166 179 160 174Z', '#3fa34d', { line: '#14532d', lw: 1.4 }) + lotus(K, 180, 170, 0.6, 8, '#f472b6');
      // тело с нарисованными лотосами
      const body = K.ell(100, 142, 60, 32);
      s += K.vol(body, H);
      s += clip(K, body, inkLotus(K, 54, 150, 0.9, -20) + inkLotus(K, 146, 150, 0.9, 20) + K.line('M44 164q6 -4 12 0t12 0M132 164q6 -4 12 0t12 0', '#1e3a8a', 1.6, { op: 0.6 }));
      // ножки
      s += K.mirror(K.vol('M62 152C58 164 60 176 70 177H86C93 177 94 166 90 152Z', { ...H, tex: false, lw: 2.4 }) +
        '<g fill="#e0f7fa" stroke="#06394d" stroke-width=".9"><ellipse cx="70" cy="175" rx="3" ry="2"/><ellipse cx="78" cy="176" rx="3" ry="2"/><ellipse cx="86" cy="175" rx="3" ry="2"/></g>');
      // ушки
      s += ellV(K, 66, 62, 10, 8, -35, { ...H, tex: false, lw: 2.2 }) + ellV(K, 134, 62, 10, 8, 35, { ...H, tex: false, lw: 2.2 });
      s += '<ellipse cx="66" cy="63" rx="5" ry="3.4" transform="rotate(-35 66 63)" fill="#f9a8d4"/><ellipse cx="134" cy="63" rx="5" ry="3.4" transform="rotate(35 134 63)" fill="#f9a8d4"/>';
      // голова
      s += K.vol(K.ell(100, 92, 42, 34), H);
      s += inkLotus(K, 100, 70, 0.6);
      s += K.gloss(74, 74, 6, 3.4, -35, 0.3);
      // глаза-бугорки
      s += ellV(K, 80, 77, 15, 13, 0, { ...H, texK: 0.08 }) + ellV(K, 120, 77, 15, 13, 0, { ...H, texK: 0.08 });
      s += K.eyes(100, 78, 20, 10, { iris: '#0e7490', look: [0, 0.3] });
      // широкая мордочка
      s += K.vol('M56 118C56 102 74 98 100 98C126 98 144 102 144 118C144 136 126 146 100 146C74 146 56 136 56 118Z', M);
      s += '<ellipse cx="86" cy="110" rx="4.2" ry="3" fill="#06394d"/><ellipse cx="114" cy="110" rx="4.2" ry="3" fill="#06394d"/><circle cx="84.6" cy="109" r="1" fill="#fff" opacity=".7"/><circle cx="112.6" cy="109" r="1" fill="#fff" opacity=".7"/>';
      s += K.line('M70 126Q100 140 130 126', INK, 3) + '<path d="M79 130L82 135.5L85 130.6ZM115 130.6L118 135.5L121 130Z" fill="#fff" stroke="#06394d" stroke-width=".9" stroke-linejoin="round"/>';
      s += K.blush(64, 122, 6.5) + K.blush(136, 122, 6.5);
      // пузыри
      s += '<g class="art-float"><circle cx="142" cy="96" r="4" fill="#e0f7ff" fill-opacity=".35" stroke="#7dd3fc" stroke-width="1.5"/><circle cx="152" cy="80" r="6" fill="#e0f7ff" fill-opacity=".35" stroke="#7dd3fc" stroke-width="1.6"/><circle cx="149.6" cy="77.6" r="1.7" fill="#fff"/><circle cx="160" cy="60" r="3.6" fill="#e0f7ff" fill-opacity=".35" stroke="#7dd3fc" stroke-width="1.4"/><circle cx="154" cy="46" r="2.4" fill="none" stroke="#7dd3fc" stroke-width="1.2"/></g>';
      s += K.spark(34, 84, 3.2, '#e0f7ff', 'art-float') + K.spark(178, 120, 2.8, '#e0f7ff') + K.spark(24, 128, 2.4, '#bae6fd') + K.spark(60, 36, 2.6, '#e0f7ff', 'art-float');
      return s;
    },

    // Бегемотиха: подросший Бегемотик — большая голубая бегемотиха в реке. Голова в три четверти: довольно прищурилась,
    // за ухом розовый лотос, на огромной морде улыбка с клыками-«пеньками»; на спине, расписанной лотосами, катаются утята
    eg_begemotiha(K) {
      const H = { c1: '#8ad9ea', c2: '#0b5f7c', rim: '#c8f3ff', texK: 0.12, line: '#052f40' };
      const M = { c1: '#bdeef6', c2: '#358fa8', rim: '#e0fbff', tex: false, line: '#052f40', lw: 2.6 };
      let s = K.aura('#2dd4bf', 96, 112, 0.32);
      s += papyrus(K, 182, 160, 100, 6, 0.3) + papyrus(K, 192, 164, 74, -3, 1.0);
      // спина
      const back = K.ell(122, 132, 64, 40);
      s += K.vol(back, H);
      s += clip(K, back, inkLotus(K, 152, 128, 1.1, 15) + inkLotus(K, 120, 140, 0.9, -10) + K.line('M84 154q7 -4 14 0t14 0t14 0t14 0t14 0', '#1e3a8a', 1.6, { op: 0.6 }));
      // утята катаются на спине
      s += duckling(K, 136, 85, 1.1) + duckling(K, 163, 95, 0.9);
      // лотос за ухом, уши
      s += lotus(K, 104, 60, 0.72, 28, '#f472b6');
      s += ellV(K, 56, 62, 9, 7, -35, { ...H, tex: false, lw: 2.2 }) + ellV(K, 96, 58, 9, 7, 25, { ...H, tex: false, lw: 2.2 });
      s += '<ellipse cx="56" cy="63" rx="4.4" ry="3" transform="rotate(-35 56 63)" fill="#f9a8d4"/><ellipse cx="96" cy="59" rx="4.4" ry="3" transform="rotate(25 96 59)" fill="#f9a8d4"/>';
      // голова
      s += K.vol(K.ell(78, 90, 38, 32), H);
      s += K.gloss(60, 72, 6, 3.2, -35, 0.3);
      s += ellV(K, 62, 74, 13, 11.5, 0, { ...H, texK: 0.08 }) + ellV(K, 92, 72, 14, 12.5, 0, { ...H, texK: 0.08 });
      s += `<g class="art-eyes">${K.eye(62, 75, 7.6, { iris: '#0e7490', lid: 'half', skin: '#6cc6da', look: [-0.3, 0.2] })}${K.eye(92, 73, 8.2, { iris: '#0e7490', lid: 'half', skin: '#6cc6da', look: [-0.3, 0.2] })}</g>`;
      // огромная морда
      s += K.vol('M18 118C16 102 32 94 58 94C86 94 106 100 108 116C110 134 92 146 64 146C36 146 20 134 18 118Z', M);
      s += '<ellipse cx="32" cy="106" rx="4" ry="2.8" fill="#052f40"/><ellipse cx="54" cy="103" rx="4.2" ry="3" fill="#052f40"/>';
      s += K.line('M30 126Q64 142 102 124', INK, 3) + '<path d="M41 130.6L44 136L47 131ZM84 130.4L87 135.6L90 129.6Z" fill="#fff" stroke="#052f40" stroke-width=".9" stroke-linejoin="round"/>';
      s += K.blush(98, 116, 5.6) + K.blush(26, 120, 4.6);
      // река
      s += nile(K, 154, 0.9);
      s += '<g class="art-aura"><ellipse cx="68" cy="154" rx="60" ry="5" fill="none" stroke="#e0f2fe" stroke-width="1.4" opacity=".5"/></g>';
      s += drop(20, 80, 3, '#bfeaff', 'art-float', 0.3) + K.spark(118, 40, 3, '#e0f7ff', 'art-float') + K.spark(24, 46, 2.6, '#e0f7ff') + K.spark(186, 40, 2.4, '#e0f7ff', 'art-float');
      return s;
    },

    // Таурт: богиня-бегемотиха стоит на задних лапах. Голубая «фаянсовая» кожа с лотосами, круглый живот, львиные лапы,
    // по спине — хвост крокодила; синий парик, усех, на голове — рога с солнцем и два высоких пера. Одной лапой опирается
    // на скипетр-папирус богинь, в другой держит анх
    eg_taurt(K) {
      const H = { c1: '#8ad9ea', c2: '#0b5f7c', rim: '#c8f3ff', texK: 0.1, line: '#052f40' };
      const M = { c1: '#bdeef6', c2: '#358fa8', rim: '#e0fbff', tex: false, line: '#052f40', lw: 2.4 };
      const L = { c1: '#f6d58e', c2: '#b07a2c', rim: '#c8f3ff', tex: false, line: '#4a2c0a', lw: 2.2 };
      let s = K.aura('#38bdf8', 100, 104, 0.42) + K.aura('#fbbf24', 62, 40, 0.28);
      // хвост крокодила
      const tail = 'M124 100C150 110 164 132 162 152C161 164 168 172 186 172';
      s += K.line(tail, '#064e3b', 17) + K.line(tail, '#34d399', 12) + `<path d="${tail}" fill="none" stroke="#065f46" stroke-width="6" stroke-dasharray="3 6" stroke-linecap="round" opacity=".7"/>` + K.line(tail, '#a7f3d0', 2.4, { op: 0.5 });
      s += K.part('M184 166L196 172L184 178Z', '#34d399', { line: '#064e3b', lw: 1.6 });
      let rg = '';
      for (let i = 0; i < 6; i++) { const t = i / 6, x = 128 + t * 36, y = 101 + t * 40 - Math.sin(t * Math.PI) * 6; rg += `M${r1(x - 3.4)} ${r1(y + 1)}L${r1(x + 1)} ${r1(y - 7)}L${r1(x + 4)} ${r1(y + 2)}Z`; }
      s += K.part(rg, '#10b981', { line: '#064e3b', lw: 1.2 });
      // скипетр-папирус
      s += wadj(K, 40, 92, 176);
      // львиные лапы
      s += K.mirror(K.vol('M78 146C74 158 74 166 76 172H96C98 164 98 154 96 146Z', L) + K.vol(K.ell(86, 174, 13, 5.5), L) + K.line('M80 177V173M86 178V173M92 177V173', '#4a2c0a', 1.4));
      // тело с круглым животом
      const body = 'M100 84C122 84 134 96 138 112C144 132 142 150 130 160C120 168 80 168 70 160C58 150 56 132 62 112C66 96 78 84 100 84Z';
      s += K.vol(body, H);
      s += `<ellipse cx="100" cy="134" rx="30" ry="24" fill="${K.rad([[0, '#e0fbff', 0.55], [1, '#e0fbff', 0]])}"/>`;
      s += clip(K, body, inkLotus(K, 100, 146, 1.2) + inkLotus(K, 72, 128, 0.8, -25) + inkLotus(K, 128, 128, 0.8, 25));
      // лапа на скипетре
      s += K.vol('M70 98C60 100 50 102 42 104C36 106 36 114 42 114C52 114 62 112 72 110Z', { ...H, tex: false, lw: 2.2 }) + ellV(K, 41, 108, 7.4, 7, 0, { ...H, tex: false, lw: 2 }) + K.line('M37 104v8M41 103v10', '#052f40', 1.2, { op: 0.6 });
      // лапа с анхом
      s += K.vol('M130 98C142 104 150 114 154 124C156 130 150 134 146 130C142 122 136 114 128 110Z', { ...H, tex: false, lw: 2.2 });
      s += ankh(K, 151, 142, 1.25);
      s += ellV(K, 150, 130, 7.4, 7, 0, { ...H, tex: false, lw: 2 }) + K.line('M146 126v8M150 125v10', '#052f40', 1.2, { op: 0.6 });
      // парик и усех
      s += stripes(K, 'M64 50C62 34 78 26 100 26C122 26 138 34 136 50L140 94L122 96L118 66H82L78 96L60 94Z', '#1e3a8a', '#fbbf24', 3.2, 0, '#0b1a3a', 1.8);
      s += collar(K, 100, 90, 26, 9, 4);
      // корона: два пера, рога, солнечный диск, модий
      s += plume(K, 92, 30, 44, 12, -9) + plume(K, 108, 30, 44, 12, 9);
      s += `<circle class="art-aura" cx="100" cy="16" r="16" fill="${K.rad([[0, '#fff6c2', 0.8], [1, '#ffb020', 0]])}"/>` + K.vol(K.ell(100, 16, 9, 9), { c1: '#ffd23f', c2: '#dc2626', tex: false, lw: 1.8, line: '#7a1a08' });
      s += K.line('M82 30Q72 14 86 4M118 30Q128 14 114 4', '#3b2a10', 5) + K.line('M82 30Q72 14 86 4M118 30Q128 14 114 4', '#f5f5f4', 2.8);
      // уши и голова
      s += ellV(K, 74, 36, 8, 6, -35, { ...H, tex: false, lw: 2 }) + ellV(K, 126, 36, 8, 6, 35, { ...H, tex: false, lw: 2 });
      s += K.part('M86 28H114L112 35H88Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 });
      s += K.vol(K.ell(100, 58, 30, 26), H);
      s += ellV(K, 88, 48, 10, 9, 0, { ...H, texK: 0.08 }) + ellV(K, 112, 48, 10, 9, 0, { ...H, texK: 0.08 });
      s += K.eyes(100, 49, 12, 7, { iris: '#0e7490', look: [0, 0.3] });
      s += K.vol('M66 80C66 68 80 64 100 64C120 64 134 68 134 80C134 92 120 98 100 98C80 98 66 92 66 80Z', M);
      s += '<ellipse cx="90" cy="72" rx="3.4" ry="2.4" fill="#052f40"/><ellipse cx="110" cy="72" rx="3.4" ry="2.4" fill="#052f40"/>';
      s += K.line('M78 85Q100 96 122 85', INK, 2.8) + '<path d="M83.6 87.8L86 92L88.4 88.8ZM111.6 88.8L114 92L116.4 87.8Z" fill="#fff" stroke="#052f40" stroke-width=".8" stroke-linejoin="round"/>';
      s += K.blush(72, 84, 4.6) + K.blush(128, 84, 4.6);
      s += drop(22, 70, 3, '#bfeaff', 'art-float', 0.2) + drop(180, 92, 2.6, '#bfeaff', 'art-float', 0.9) + K.spark(30, 30, 3.2, '#e0f7ff', 'art-float') + K.spark(172, 30, 3, '#fde68a') + K.spark(184, 132, 2.4, '#e0f7ff');
      return s;
    },

    // Кобрёнок: только что вылупился и уже раздувает капюшончик. Золотой малыш-кобра свернулся колечками на горячем
    // песке; на капюшоне полоски лазурита, бирюзы и сердолика, как у урея на короне; большие глаза, румянец,
    // кончик раздвоенного язычка; рядом — скорлупка, над песком дрожит жаркий воздух
    eg_kobrenok(K) {
      const G = { c1: '#fde68a', c2: '#c2410c', rim: '#ffe29a', texK: 0.16, line: '#5a2a06' };
      let s = K.aura('#ff9a3d', 88, 118, 0.42);
      s += `<ellipse cx="100" cy="174" rx="82" ry="9" fill="${K.rad([[0, '#fcd34d', 0.55], [1, '#d97706', 0]])}"/>`;
      s += K.line('M22 116q4 -6 0 -12t0 -12M180 112q4 -6 0 -12t0 -12M166 52q4 -6 0 -12t0 -12', '#fdba74', 2, { op: 0.7, cls: 'art-blink' });
      // скорлупка
      s += K.part('M18 176C14 166 18 156 24 158L28 151L32 158L38 153L40 162C42 170 38 177 28 178C22 178 19 178 18 176Z', '#fffbeb', { line: '#a8977a', lw: 1.6 }) + '<g fill="#d6c7a1"><circle cx="26" cy="168" r="1.5"/><circle cx="33" cy="172" r="1.2"/></g>';
      // хвостик и кольца
      s += coil(K, 'M146 170C164 174 178 166 180 152', 9) + K.part('M176 153L183 140L186 155Z', '#fbbf24', { line: '#4a2006', lw: 1.4 });
      s += coil(K, 'M46 164A54 12 0 1 0 154 164A54 12 0 1 0 46 164', 18);
      s += coil(K, 'M62 148A38 10 0 1 0 138 148A38 10 0 1 0 62 148', 16);
      s += coil(K, 'M100 126C100 140 112 144 120 150', 16);
      // капюшончик
      const hood = hoodD(100, 68, 50, 132);
      s += K.vol(hood, G);
      s += inlay(K, 100, 86, 132, 16, 10, 8, 44);
      s += K.line('M58 90C60 102 70 112 82 120', '#fff3b0', 2.4, { op: 0.5 });
      // головка
      s += K.vol(K.ell(100, 64, 25, 20), { ...G, c1: '#fff0b0', texK: 0.1 });
      s += K.gloss(86, 54, 6, 3.4, -35, 0.4);
      s += K.eyes(100, 63, 11.5, 8.4, { iris: '#1d4ed8', look: [0, 0.3] });
      s += K.blush(79, 75, 5) + K.blush(121, 75, 5);
      s += K.mouth('smile', 100, 75, 10) + K.line('M100 79V87M100 87l-3 4M100 87l3 4', '#f43f5e', 2.2);
      s += K.spark(34, 66, 3.2, '#fff3b0', 'art-float') + K.spark(160, 84, 2.8, '#ffd23f') + K.spark(184, 128, 2.4, '#fff3b0', 'art-float') + K.spark(60, 30, 2.4, '#ffd23f');
      return s;
    },

    // Урей: подросший Кобрёнок — огненная кобра с короны фараона. Поднялся над кольцами, капюшон раскрыт щитом
    // со вставками лазурита, бирюзы и сердолика, над головой — солнечный диск. Сердито щурится и выдыхает пламя
    // на гирлянду: лампочки справа уже горят, слева ждут своей очереди
    eg_urey(K) {
      const G = { c1: '#fde68a', c2: '#b45309', rim: '#ffe29a', texK: 0.16, line: '#4a2006' };
      let s = K.aura('#ff8a2a', 96, 108, 0.48);
      // гирлянда
      s += K.line('M2 56Q100 104 198 56', '#3b2a10', 1.8);
      for (let i = 0; i < 9; i++) {
        const t = (i + 0.5) / 9, x = r1(2 + 196 * t), y = r1(56 + 96 * t - 96 * t * t), lit = x > 140;
        if (lit) s += `<circle class="art-blink" style="animation-delay:-${r1(i * 0.3)}s" cx="${x}" cy="${r1(y + 8)}" r="9" fill="${K.rad([[0, '#fff6c2', 0.9], [1, '#facc15', 0]])}"/>`;
        s += `<rect x="${r1(x - 2)}" y="${r1(y - 1)}" width="4" height="4" fill="#57534e"/><ellipse cx="${x}" cy="${r1(y + 7.4)}" rx="3.6" ry="4.8" fill="${lit ? '#fde047' : '#cbd5e1'}" stroke="#3b2a10" stroke-width="1.1"${lit ? '' : ' opacity=".8"'}/>`;
      }
      // кольца и шея
      s += coil(K, 'M34 166A66 12 0 1 0 166 166A66 12 0 1 0 34 166', 18);
      s += coil(K, 'M52 150A48 10 0 1 0 148 150A48 10 0 1 0 52 150', 16);
      s += coil(K, 'M100 132C100 144 116 146 122 150', 20);
      // капюшон-щит
      const hood = hoodD(100, 58, 58, 138);
      s += K.vol(hood, G);
      s += inlay(K, 100, 72, 138, 18, 11, 9, 52);
      s += K.line('M48 84C50 100 62 116 80 128', '#fff3b0', 2.6, { op: 0.45 });
      // солнечный диск
      s += sunBall(K, 100, 17, 11, false);
      // голова
      s += K.vol(K.ell(100, 52, 23, 19), { ...G, c1: '#fff0b0', texK: 0.1 });
      s += K.gloss(86, 42, 5.6, 3, -35, 0.4);
      s += K.eyes(96, 50, 9.6, 7.2, { iris: '#1d4ed8', lid: 'angry', skin: '#e9a83a', look: [0.6, 0.1] });
      s += K.g(K.flame(0, 0, 40, 22, '#fff0a0', '#ff5a14'), 'translate(115 63) rotate(100)');
      s += K.mouth('fang', 106, 60, 12);
      s += K.spark(30, 30, 3.2, '#fff3b0', 'art-float') + K.spark(24, 110, 2.6, '#ffd23f') + K.spark(178, 118, 2.6, '#fff3b0', 'art-float') + K.spark(156, 16, 2.4, '#ffd23f');
      return s;
    },

    // Уаджит: богиня-кобра, владычица Нижнего Египта и огненное Око Ра. Золотая кобра поднялась над корзиной-«неб»,
    // за капюшоном распахнуты крылья в египетском узоре, на голове — красная корона дешрет; у корзины качается
    // папирус — знак её болотистой земли, за плечами пляшут языки пламени
    eg_uadjit(K) {
      const G = { c1: '#fde68a', c2: '#b45309', rim: '#ffe29a', texK: 0.14, line: '#4a2006' };
      let s = K.aura('#ff9a3d', 100, 98, 0.55) + K.aura('#ef4444', 62, 48, 0.3);
      s += papyrus(K, 20, 178, 72, -6, 0.4) + papyrus(K, 180, 178, 72, 6, 1.0) + papyrus(K, 34, 178, 50, 5, 1.4) + papyrus(K, 166, 178, 50, -5, 0.8);
      // крылья
      const W = 'M84 96C62 84 34 72 6 66Q10 74 18 78Q12 84 14 94Q22 94 26 98Q22 106 28 112Q34 110 40 114Q38 122 46 126Q52 122 58 126C68 120 76 114 84 112Z';
      s += K.mirror(`<g class="art-wing">${ewing(K, W, 84, 104, 30, 54, ['#fbbf24', '#2dd4bf', '#1d4ed8'], 150, 215, 9)}</g>`);
      // пылающий солнечный диск за головой — Око Ра
      s += sunBall(K, 100, 46, 26, true);
      // корзина-неб
      const neb = 'M48 150H152C152 168 132 178 100 178C68 178 48 168 48 150Z';
      s += K.vol(neb, { c1: '#ffe08a', c2: '#b45309', rim: '#fff6c2', tex: false, lw: 2.2, line: '#5a3a06' });
      s += clip(K, neb, K.line('M40 158L50 166L60 158L70 166L80 158L90 166L100 158L110 166L120 158L130 166L140 158L150 166L160 158', '#1d4ed8', 3.2) + K.line('M40 170H160', '#dc2626', 2.6) + K.line('M40 154H160', '#2dd4bf', 2.4));
      // кольца на корзине и шея
      s += coil(K, 'M58 146A42 9 0 1 0 142 146A42 9 0 1 0 58 146', 15);
      s += coil(K, 'M100 132C100 142 112 144 118 146', 19);
      // капюшон
      const hood = hoodD(100, 64, 54, 136);
      s += K.vol(hood, G);
      s += inlay(K, 100, 78, 136, 16, 10, 8.5, 48);
      s += K.line('M52 88C54 102 66 116 82 126', '#fff3b0', 2.6, { op: 0.45 });
      // голова и красная корона
      s += K.vol(K.ell(100, 60, 22, 18), { ...G, c1: '#fff0b0', texK: 0.1 });
      s += K.eyes(100, 62, 9.4, 6.6, { iris: '#1d4ed8', lash: true, look: [0, 0.25] });
      s += K.mirror(K.line('M87 63L80 65', INK, 1.8));
      s += K.mouth('smile', 100, 71, 9) + K.blush(84, 70, 4) + K.blush(116, 70, 4);
      s += deshret(K, 101, 50, 1.4);
      s += K.spark(24, 30, 3.4, '#fff3b0', 'art-float') + K.spark(178, 30, 3.4, '#fff3b0', 'art-float') + K.spark(14, 132, 2.8, '#ffd23f') + K.spark(188, 132, 2.8, '#ffd23f') + K.spark(140, 10, 2.4, '#fffbe6');
      return s;
    },

    // Гусёнок: круглый пушистый птенец нильского гуся — жёлтый пух, серо-бурая шапочка, у глаз уже проступают
    // рыжие «очки», как у взрослых. Шлёпает оранжевыми лапками и машет крылышками; рядом кружат пёрышко и ветерок
    eg_gusenok(K) {
      const Y = { c1: '#ffe98a', c2: '#d08a16', rim: '#eef0ff', texK: 0.18, line: '#6b3a06' };
      const wing = K.vol('M62 118C46 112 32 120 34 136C42 138 52 134 62 130Z', { ...Y, tex: false, lw: 2.2 });
      let s = K.aura('#a5b4fc', 86, 118, 0.38);
      s += K.line('M28 178q-2 -10 -8 -16M34 178q0 -12 4 -18M166 178q2 -10 8 -16M172 178q0 -12 -4 -18', '#65a30d', 2.6);
      // лапки
      s += K.mirror(K.line('M86 158V170', '#c2410c', 4) + K.part('M86 168L72 177Q79 180 86 177Q93 180 100 177Z', '#fb923c', { line: '#9a3412', lw: 1.6 }));
      // крылышки
      s += `<g class="art-wing">${wing}</g><g transform="translate(200 0) scale(-1 1)"><g class="art-wing" style="animation-delay:-.45s">${wing}</g></g>`;
      // тельце
      const body = fur(100, 132, 42, 36, 18, 0.055);
      s += K.vol(body, Y);
      s += `<ellipse cx="100" cy="142" rx="24" ry="20" fill="${K.rad([[0, '#fffbe6', 0.7], [1, '#fffbe6', 0]])}"/>`;
      // головка с шапочкой
      const head = fur(100, 84, 33, 30, 16, 0.06);
      s += K.vol(head, Y);
      s += clip(K, head, `<ellipse cx="100" cy="52" rx="36" ry="17" fill="#a08060" opacity=".6"/>`);
      s += K.gloss(84, 70, 6, 3.2, -35, 0.4);
      s += '<ellipse cx="86" cy="84" rx="11" ry="9" fill="#c2672c" opacity=".3"/><ellipse cx="114" cy="84" rx="11" ry="9" fill="#c2672c" opacity=".3"/>';
      s += K.eyes(100, 83, 14, 9, { iris: '#7c2d12', look: [0, 0.3] });
      // клювик
      s += K.part('M86 98C86 92 114 92 114 98C114 106 106 110 100 110C94 110 86 106 86 98Z', '#fb923c', { line: '#9a3412', lw: 1.8 }) + K.line('M88 101Q100 105 112 101', '#9a3412', 1.4) + '<circle cx="95" cy="96" r="1.1" fill="#9a3412"/><circle cx="105" cy="96" r="1.1" fill="#9a3412"/>';
      s += K.blush(73, 98, 5.5) + K.blush(127, 98, 5.5);
      // пёрышко и ветерок
      s += `<g class="art-float">${plume(K, 160, 64, 20, 8, 30, '#fffbeb', '#d9a23a', '#7a4a10')}</g>`;
      s += K.line('M16 70q10 -6 18 0 5 4 1 7-4 2-5-2M150 124q8 -5 16 0M24 120q6 -4 12 0', '#e0e7ff', 2, { op: 0.85, cls: 'art-float' });
      s += K.spark(40, 40, 3, '#eef0ff', 'art-float') + K.spark(184, 104, 2.6, '#fde68a') + K.spark(16, 150, 2.4, '#eef0ff');
      return s;
    },

    // Нильский гусь: подросший Гусёнок — гордый гусь, как на древней фреске «Медумские гуси»: песочное тело,
    // рыжие «очки» и пятно на груди, белое плечо и зелёное зеркальце на крыле, розовые лапы.
    // Вскинул дальнее крыло и шипит — сторожит пруд от самокатов
    eg_nilgus(K) {
      const B = { c1: '#f3e6cc', c2: '#9a7a58', rim: '#eef0ff', texK: 0.16, line: '#4a3420' };
      let s = K.aura('#a5b4fc', 94, 108, 0.36);
      s += papyrus(K, 182, 176, 92, 6, 0.6) + papyrus(K, 168, 178, 64, -4, 1.3);
      // поднятое дальнее крыло
      s += `<g class="art-wing" style="animation-delay:-.3s">${K.vol('M112 98C112 72 138 50 168 44C164 58 162 72 154 88C146 98 128 104 112 98Z', { c1: '#c7a27a', c2: '#6b4a2c', rim: '#eef0ff', tex: false, lw: 2, line: '#3b2614' })}` +
        K.line('M120 92C130 76 146 62 162 52M126 96C138 84 150 74 158 66', '#3b2614', 1.2, { op: 0.6 }) + K.part('M114 96C116 84 126 74 138 70C134 80 128 90 114 96Z', '#ffffff', { line: '#6b4a2c', lw: 1.2 }) + '</g>';
      // ноги
      s += K.line('M98 146L94 170M118 146L122 170', '#7c2d12', 5.6) + K.line('M98 146L94 170M118 146L122 170', '#fca5a5', 3.2);
      s += K.part('M94 168L82 177Q88 180 94 177Q100 180 106 177Z', '#fb7185', { line: '#9f1239', lw: 1.4 }) + K.part('M122 168L110 177Q116 180 122 177Q128 180 134 177Z', '#fb7185', { line: '#9f1239', lw: 1.4 });
      // хвост
      s += K.part('M156 116L182 108L177 121L184 130L160 134Z', '#3f3a36', { line: '#1c1917', lw: 1.6 });
      // тело
      s += K.vol('M66 116C66 96 92 86 120 90C146 94 164 108 166 124C168 140 148 152 120 152C92 152 66 138 66 116Z', B);
      s += '<ellipse cx="84" cy="124" rx="8" ry="7" fill="#7c3a12" opacity=".85"/>';
      // сложенное ближнее крыло: бурое, белое плечо, зелёное зеркальце
      s += K.vol('M100 104C118 94 150 98 168 114C160 124 140 132 116 130C104 128 96 118 100 104Z', { c1: '#c7a27a', c2: '#6b4a2c', rim: '#eef0ff', tex: false, lw: 2, line: '#3b2614' });
      s += K.part('M102 106C110 98 128 98 138 104C128 110 112 112 102 106Z', '#ffffff', { line: '#6b4a2c', lw: 1.2 }) + K.part('M136 120C146 116 158 116 164 118C156 124 146 126 138 126Z', '#10b981', { line: '#064e3b', lw: 1.2 });
      s += K.line('M118 116C130 112 146 114 156 118', '#3b2614', 1.2, { op: 0.5 });
      // шея
      const neck = 'M82 106C72 92 78 74 72 58';
      s += K.line(neck, '#4a3420', 17) + K.line(neck, '#e8d6b8', 12.4) + K.line('M78 100C72 90 76 76 72 64', '#fff', 2, { op: 0.4 });
      // голова: рыжие «очки», раскрытый клюв
      s += K.vol(K.ell(68, 46, 19, 16.5), { ...B, texK: 0.1 });
      s += K.gloss(60, 36, 5, 2.8, -35, 0.4);
      s += '<ellipse cx="71" cy="44" rx="11" ry="9" fill="#8a4a1a" opacity=".9"/>';
      s += K.part('M53 42L28 43L32 49L53 49Z', '#fb7185', { line: '#9f1239', lw: 1.6 }) + K.part('M53 52L32 55L37 60L54 56Z', '#fda4af', { line: '#9f1239', lw: 1.4 }) + K.line('M40 52.6L52 52', '#f43f5e', 2);
      s += `<g class="art-eyes">${K.eye(71, 44, 6.8, { iris: '#f59e0b', lid: 'angry', skin: '#8a4a1a', look: [-0.6, 0.1] })}</g>`;
      s += K.line('M22 36q-6 5 0 10M15 31q-10 10 0 20', '#e0e7ff', 2.2, { cls: 'art-blink' });
      s += K.spark(30, 90, 3, '#eef0ff', 'art-float') + K.spark(130, 22, 2.8, '#eef0ff') + K.spark(24, 140, 2.4, '#fde68a', 'art-float');
      return s;
    },

    // Великий Гоготун: первозданный гусь. Стоит на первом холме посреди вод Нуна, распахнув сияющие крылья, и гогочет —
    // от его голоса расходятся волны; у лап трескается золотое яйцо, из которого рвётся свет солнца. На голове — золотой хохолок,
    // за головой — сияние, у глаз — рыжие «очки» всей гусиной семьи
    eg_gogotun(K) {
      const B = { c1: '#fffaf0', c2: '#b8956a', rim: '#eef0ff', texK: 0.14, line: '#4a3420' };
      let s = K.aura('#a5b4fc', 100, 96, 0.45) + K.aura('#fbbf24', 62, 150, 0.4);
      s += nile(K, 170, 0.85);
      // крылья
      const W = 'M80 104C60 84 34 60 8 44Q12 54 20 60Q12 66 14 76Q22 76 26 80Q22 88 28 94Q34 92 40 96Q38 104 46 108Q52 104 58 108C66 108 74 108 82 112Z';
      s += K.mirror(`<g class="art-wing">${ewing(K, W, 82, 108, 28, 54, ['#fde68a', '#f8fafc', '#818cf8'], 150, 224, 9)}</g>`);
      // холм
      s += K.vol('M30 178C48 160 76 150 100 150C124 150 152 160 170 178Z', { c1: '#e7c98f', c2: '#8a5a2b', rim: '#ffe29a', tex: false, lw: 2.2, line: '#4a2c0a' });
      // лапы
      s += K.line('M86 140L82 162M114 140L118 162', '#9a3412', 6) + K.line('M86 140L82 162M114 140L118 162', '#fb923c', 3.6);
      s += K.part('M82 160L70 168Q76 171 82 168Q88 171 94 168Z', '#fb923c', { line: '#9a3412', lw: 1.4 }) + K.part('M118 160L106 168Q112 171 118 168Q124 171 130 168Z', '#fb923c', { line: '#9a3412', lw: 1.4 });
      // тело
      s += K.vol(K.ell(100, 116, 36, 32), B);
      s += K.line('M74 112q6 5 12 0q6 5 12 0q6 5 12 0q6 5 12 0q6 5 12 0', '#c8b08a', 1.3, { op: 0.7 }) + '<ellipse cx="100" cy="124" rx="9" ry="8" fill="#7c3a12" opacity=".8"/>';
      // яйцо, из которого рвётся солнце
      let d = '';
      for (let i = 0; i < 9; i++) { const a = (-160 + i * 17.5) * Math.PI / 180, w = 0.08; d += `M${P(100, 146, 18, a - w)}L${P(100, 146, i % 2 ? 30 : 38, a)}L${P(100, 146, 18, a + w)}Z`; }
      s += `<g class="art-spin-soft"><path d="${d}" fill="#fef08a" stroke="#d97706" stroke-width="1" opacity=".85"/></g>`;
      s += K.vol(K.ell(100, 154, 16, 20), { c1: '#fff6c2', c2: '#d97706', rim: '#fff6c2', tex: false, lw: 2.2, line: '#7a3a06' });
      s += `<path d="M85 148L91 143L95 149L101 142L106 148L113 144L115 148L106 152L101 147L95 153L90 148Z" fill="#fff6c2" stroke="#7a3a06" stroke-width="1.6" stroke-linejoin="round"/>` + K.spark(101, 146, 6, '#fffbe6');
      // сияние за головой
      s += `<circle class="art-aura" cx="94" cy="40" r="26" fill="${K.rad([[0, '#fff6c2', 0.85], [0.6, '#fde68a', 0.4], [1, '#fbbf24', 0]])}"/>` + `<circle cx="94" cy="40" r="22" fill="none" stroke="#fbbf24" stroke-width="1.6" stroke-dasharray="3 4" opacity=".8"/>`;
      // шея
      const neck = 'M100 90C100 76 92 64 94 50';
      s += K.line(neck, '#4a3420', 23) + K.line(neck, '#fffaf0', 18) + K.line('M96 84C96 74 91 66 91 56', '#fff', 2.4, { op: 0.5 });
      // голова в профиль, клюв раскрыт — гогочет
      s += plume(K, 95, 26, 16, 7, -16, '#fde68a', '#d97706', '#7a4a06') + plume(K, 102, 26, 14, 6, 14, '#fde68a', '#d97706', '#7a4a06');
      s += K.vol(K.ell(94, 40, 19, 16.5), { ...B, texK: 0.1 });
      s += K.gloss(86, 30, 5, 2.8, -35, 0.4);
      s += '<ellipse cx="96" cy="38" rx="10.4" ry="8.6" fill="#8a4a1a" opacity=".85"/>';
      s += K.part('M78 35L52 35L56 41L78 42Z', '#fb923c', { line: '#9a3412', lw: 1.6 }) + K.part('M78 46L57 50L62 55L79 50Z', '#fdba74', { line: '#9a3412', lw: 1.4 }) + K.line('M64 46.6L76 45.6', '#f43f5e', 2);
      s += `<g class="art-eyes">${K.eye(97, 38, 6.6, { iris: '#f59e0b', look: [-0.6, 0.1] })}</g>`;
      // голос, что разбудил мир
      s += K.line('M48 30q-7 9 0 18M40 24q-11 15 0 30M32 18q-15 21 0 42', '#e0e7ff', 2.4, { cls: 'art-blink' });
      s += K.spark(150, 20, 3.4, '#fff3b0', 'art-float') + K.spark(186, 112, 3, '#eef0ff') + K.spark(14, 128, 2.8, '#eef0ff', 'art-float') + K.spark(176, 150, 2.6, '#fde68a');
      return s;
    },

    // Ушебти: голубая фаянсовая фигурка-помощник ожила. Спелёнутое тельце, полосатый парик, руки скрещены на груди —
    // в одной мотыга, в другой метла (подметает дворы!); за плечом корзинка, по переду столбик иероглифов-заклинаний,
    // вокруг потрескивают искры волшебства
    eg_ushebti(K) {
      const B = { c1: '#a8d0f7', c2: '#1e3a8a', rim: '#fff6b0', texK: 0.16, line: '#0b1a3a' };
      let s = K.aura('#facc15', 88, 112, 0.35);
      // корзинка за плечом
      s += K.line('M118 70C122 58 142 58 146 70', '#4a2c0a', 4) + K.line('M118 70C122 58 142 58 146 70', '#d9a560', 2);
      s += K.vol('M114 70H150L146 96H118Z', { c1: '#f1d49a', c2: '#9a6a2a', rim: '#fff0b0', tex: false, lw: 2, line: '#4a2c0a' }) + K.line('M116 78H148M117 86H147', '#7a4a1a', 1.2, { op: 0.6 });
      // мотыга и метла
      s += K.line('M84 104L58 60', '#3b2410', 5.4) + K.line('M84 104L58 60', '#c9934e', 3);
      s += K.part('M50 66L58 52L68 58L64 64Z', '#94a3b8', { line: '#1f2937', lw: 1.6 });
      s += K.line('M116 104L140 52', '#3b2410', 5.4) + K.line('M116 104L140 52', '#c9934e', 3);
      s += K.part('M134 50L130 26L158 32L148 54Z', '#f5d48a', { line: '#6b4a10', lw: 1.6 }) + K.line('M136 46L134 30M141 48L142 31M146 50L150 33', '#b8862a', 1.2) + K.line('M133 49L148 53', '#7c2d12', 3);
      // тельце-пелена
      const body = 'M100 74C124 74 134 92 134 114L130 158C128 172 116 178 100 178C84 178 72 172 70 158L66 114C66 92 76 74 100 74Z';
      s += K.vol(body, B);
      s += K.part('M91 118H109L108 172H92Z', '#e0f2fe', { line: '#1e3a8a', lw: 1.4 });
      s += K.line('M95 126h10M100 122v10M94 140q6 -6 12 0M96 150l4 -4 4 4M95 160h10M100 156v8', '#111827', 1.5);
      s += K.line('M74 140C74 156 80 168 90 174', '#fff6b0', 2, { op: 0.4 });
      // скрещённые руки
      const arm = (d) => K.line(d, '#0b1a3a', 13) + K.line(d, '#7fb0ea', 9) + K.line(d, '#d6e9fc', 2, { op: 0.6 });
      s += arm('M76 98L118 108') + arm('M124 98L82 108');
      s += ellV(K, 117, 106, 6.5, 6, 0, { ...B, tex: false, lw: 1.8 }) + ellV(K, 83, 106, 6.5, 6, 0, { ...B, tex: false, lw: 1.8 });
      // парик
      s += stripes(K, 'M70 58C70 36 84 26 100 26C116 26 130 36 130 58L134 94L118 96L114 66H86L82 96L66 94Z', '#111827', '#2563eb', 3.2, 0, '#030712', 1.8);
      // лицо
      s += K.vol(K.ell(100, 62, 17, 19), { c1: '#cfe6fc', c2: '#3b6fb8', rim: '#fff6b0', tex: false, line: '#0b1a3a' });
      s += K.line('M84 46Q100 40 116 46', '#facc15', 2.6);
      s += K.eyes(100, 61, 7.4, 5.8, { iris: '#1e3a8a', look: [0, 0.2] });
      s += K.mirror(K.line('M86.6 62L81 63.4', INK, 1.8));
      s += K.mouth('smile', 100, 71, 9) + K.blush(88, 70, 3.8) + K.blush(112, 70, 3.8);
      // искры волшебства
      s += K.line('M40 104l7 5-4 3 7 6M160 120l6 5-4 3 6 5M30 150l6 4-3 2 6 4', '#facc15', 2.2, { cls: 'art-blink' });
      s += K.spark(36, 80, 3.4, '#fef08a', 'art-float') + K.spark(168, 92, 3, '#fffbe6', 'art-float') + K.spark(172, 150, 2.6, '#fef08a') + K.spark(60, 26, 2.4, '#fffbe6');
      return s;
    },

    // Ба: душа в облике птички с человеческим лицом. Днём прилетела в город и присела на каменный подоконник у цветочного
    // горшка: золотисто-бурые крылья с бирюзовыми кончиками, полосатый парик, ожерелье; за спиной светится окно
    eg_ba(K) {
      const F = { c1: '#f8dca8', c2: '#8a5a2b', rim: '#e9d5ff', texK: 0.3, line: '#3b2410' };
      const skin = { c1: '#f2c08a', c2: '#a8622a', rim: '#e9d5ff', tex: false, line: '#4a2408' };
      let s = K.aura('#a78bfa', 92, 104, 0.38);
      // светящееся окно
      s += K.vol('M58 140V52C58 28 142 28 142 52V140Z', { c1: '#e7d3b5', c2: '#7a6248', rim: '#e9d5ff', tex: false, lw: 2.2, line: '#3b2a1a' });
      s += `<path d="M67 140V56C67 38 133 38 133 56V140Z" fill="${K.lin(['#fff3c4', '#fbbf24', '#f59e0b'])}" stroke="#3b2a1a" stroke-width="1.8"/>`;
      s += K.line('M100 40V140M67 88H133', '#5b4632', 3.2, { op: 0.8 }) + `<rect x="67" y="40" width="66" height="100" fill="${K.rad([[0, '#fff', 0.5], [1, '#fff', 0]], 0.5, 0.4, 0.6)}"/>`;
      // подоконник и цветочный горшок
      s += K.vol('M22 140H178L172 156H28Z', { c1: '#e7d3b5', c2: '#7a6248', rim: '#e9d5ff', tex: false, lw: 2.2, line: '#3b2a1a' });
      s += K.vol('M154 120H176L172 140H158Z', { c1: '#f0a070', c2: '#9a3412', rim: '#ffe29a', tex: false, lw: 1.8, line: '#4a1a06' });
      s += K.leaf(164, 120, 18, -112, '#65a30d') + K.leaf(166, 120, 16, -62, '#84cc16') + `<circle cx="160" cy="102" r="5" fill="#f472b6" stroke="#9d174d" stroke-width="1.4"/><circle cx="160" cy="102" r="1.8" fill="#fde68a"/>`;
      // хвост
      s += K.part('M118 128L150 142L142 148L112 138Z', '#8a5a2b', { line: '#3b2410', lw: 1.6 }) + K.line('M122 134L144 144', '#2dd4bf', 1.8);
      // крылья приоткрыты
      const W = 'M78 100C54 88 26 94 14 118C30 118 40 122 46 128C58 132 72 126 82 118Z';
      const wing = `<g class="art-wing">${K.vol(W, { ...F, texK: 0.2 })}` + K.line('M24 116L40 122M32 108L48 118M44 102L60 114', '#2dd4bf', 2.4) + K.line('M60 104C50 104 40 108 34 112', '#fff3c4', 1.6, { op: 0.6 }) + '</g>';
      s += wing + `<g transform="translate(200 0) scale(-1 1)">${wing}</g>`;
      // тельце и лапки
      s += K.line('M90 134L88 140M110 134L112 140', '#7c2d12', 3.6) + K.line('M81 140H95M105 140H119', '#7c2d12', 2.8);
      s += K.vol(K.ell(100, 114, 29, 25), F);
      s += K.line('M84 116q5 5 10 0q5 5 10 0q5 5 10 0M88 126q4 4 8 0q4 4 8 0q4 4 8 0', '#8a5a2b', 1.3, { op: 0.5 });
      s += collar(K, 100, 96, 19, 7, 3);
      // голова: парик и лицо
      s += stripes(K, 'M76 68C76 48 86 38 100 38C114 38 124 48 124 68L127 96L112 96L110 78H90L88 96L73 96Z', '#1e1b4b', '#fbbf24', 3.2, 0, '#0b0a1f', 1.8);
      s += K.vol(K.ell(100, 72, 17, 18), skin);
      s += K.line('M82 56Q100 49 118 56', '#5a3a06', 4) + K.line('M82 56Q100 49 118 56', '#fbbf24', 2.2);
      s += K.eyes(100, 72, 7.2, 5.8, { iris: '#7c3aed', look: [0, 0.2] });
      s += K.mirror(K.line('M86 73L81 74', INK, 1.7));
      s += K.mouth('smile', 100, 82, 8) + K.blush(88, 81, 3.6) + K.blush(112, 81, 3.6);
      s += K.spark(30, 40, 3.2, '#e9d5ff', 'art-float') + K.spark(176, 46, 2.8, '#fde68a', 'art-float') + K.spark(184, 110, 2.4, '#e9d5ff') + K.spark(18, 96, 2.4, '#fde68a');
      return s;
    },

    // Ихневмон: священный мангуст, гроза змей. Встал столбиком, как боксёр, — кулачки наготове, хвост с чёрной кисточкой;
    // перед ним «змея» — садовый шланг поднял голову-насадку и брызжет водой. Вокруг травинки
    eg_ihnevmon(K) {
      const F = { c1: '#e9dcc2', c2: '#6b5a45', rim: '#e4ffb0', texK: 0.1, line: '#2e2418' };
      let s = K.aura('#84cc16', 90, 110, 0.35);
      s += K.line('M20 178q-2 -12 -8 -18M26 178q0 -14 4 -20M120 178q2 -10 6 -14', '#65a30d', 2.6);
      // хвост с чёрной кисточкой
      const tail = 'M74 160C48 168 28 154 26 130C25 118 30 108 36 102';
      s += K.line(tail, '#2e2418', 15) + K.line(tail, '#c2b293', 10) + K.line('M70 158C50 164 34 152 32 132', '#efe6d2', 2, { op: 0.5 });
      s += K.part('M30 110C24 100 28 88 38 84C42 92 44 100 42 108Z', '#1c1917', { line: '#000', lw: 1.6 });
      // шланг-«змея»
      const hose = 'M190 176H140C128 176 124 166 134 162C146 158 160 168 166 156C172 142 156 130 152 112C150 104 146 98 140 96';
      s += K.line(hose, '#14532d', 12) + K.line(hose, '#22c55e', 8) + K.line(hose, '#bbf7d0', 2, { op: 0.6 });
      s += K.vol('M140 88L126 92L124 100L138 104L146 100Z', { c1: '#fde68a', c2: '#b45309', rim: '#fff6c2', tex: false, lw: 1.8, line: '#5a3a06' });
      s += drop(114, 92, 3, '#bfeaff', 'art-float', 0) + drop(106, 80, 2.4, '#bfeaff', 'art-float', 0.5) + drop(118, 72, 2, '#bfeaff', 'art-float', 1);
      // лапы
      s += K.vol(K.ell(72, 172, 11, 6), { ...F, tex: false, lw: 2 }) + K.vol(K.ell(100, 172, 11, 6), { ...F, tex: false, lw: 2 });
      // тельце столбиком
      const body = 'M86 76C102 76 110 92 110 112C110 134 106 152 100 166H72C66 152 62 134 62 112C62 92 70 76 86 76Z';
      s += K.vol(body, F);
      s += `<ellipse cx="86" cy="128" rx="14" ry="26" fill="${K.rad([[0, '#fbf6ea', 0.8], [1, '#fbf6ea', 0]])}"/>`;
      // кулачки
      s += K.line('M68 104L58 92', '#2e2418', 12) + K.line('M68 104L58 92', '#d6c8aa', 8) + ellV(K, 56, 89, 7, 6.5, 0, { ...F, tex: false, lw: 2 });
      s += K.line('M104 104L116 96', '#2e2418', 12) + K.line('M104 104L116 96', '#d6c8aa', 8) + ellV(K, 118, 94, 7, 6.5, 0, { ...F, tex: false, lw: 2 });
      // голова: круглые ушки, тёмные «очки», острая мордочка
      s += ellV(K, 67, 40, 7.4, 6.6, 0, { ...F, tex: false, lw: 2 }) + ellV(K, 105, 40, 7.4, 6.6, 0, { ...F, tex: false, lw: 2 }) + '<circle cx="67" cy="41" r="3.2" fill="#a08a6a"/><circle cx="105" cy="41" r="3.2" fill="#a08a6a"/>';
      s += K.vol(K.ell(86, 54, 22, 19), { ...F, texK: 0.12 });
      s += `<ellipse cx="77" cy="51" rx="8.4" ry="6.8" fill="#3f3426" opacity=".35"/><ellipse cx="95" cy="51" rx="8.4" ry="6.8" fill="#3f3426" opacity=".35"/>`;
      s += K.vol('M75 60C75 54 97 54 97 60C97 68 91 76 86 77C81 76 75 68 75 60Z', { c1: '#fbf6ea', c2: '#a8977a', rim: '#e4ffb0', tex: false, lw: 1.8, line: '#2e2418' });
      s += K.part('M82 72Q86 69 90 72Q89 76 86 77Q83 76 82 72Z', '#1c1917', { line: '#000', lw: 1 }) + '<circle cx="84.6" cy="72" r="1" fill="#fff" opacity=".7"/>';
      s += K.eyes(86, 50, 8.6, 6.6, { iris: '#78350f', look: [0.6, 0] });
      s += K.line('M72 41L81 44M100 41L91 44', '#2e2418', 2.4);
      s += K.blush(70, 62, 4) + K.blush(102, 62, 4);
      s += K.spark(150, 40, 3, '#e4ffb0', 'art-float') + K.spark(24, 60, 2.6, '#e4ffb0') + K.spark(178, 124, 2.4, '#e4ffb0', 'art-float');
      return s;
    },

    // Абту: бирюзовая священная рыбка, что плывёт впереди ладьи Ра. Круглая, в золотой сеточке чешуи, с золотыми плавниками
    // и большими глазами — зорко высматривает змея Апопа; позади на волнах — крошечная ладья с солнцем
    eg_abtu(K) {
      const T = { c1: '#a7f7e8', c2: '#0e7490', rim: '#c8f3ff', texK: 0.12, line: '#073b4c' };
      const Gf = { c1: '#ffe08a', c2: '#c2410c', rim: '#fff6c2', tex: false, lw: 2, line: '#5a2a06' };
      let s = K.aura('#38bdf8', 92, 106, 0.38);
      s += nile(K, 160, 0.85);
      // ладья с солнцем вдали
      s += sunBall(K, 160, 32, 9, false);
      s += K.part('M138 46Q160 54 182 46L178 52Q160 58 142 52Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }) + K.line('M138 46q-4 -6 0 -10M182 46q4 -6 0 -10', '#5a3a06', 1.8);
      // хвост и плавники
      s += K.vol('M140 104L176 76C184 90 184 120 176 134Z', Gf) + K.line('M146 104L174 84M146 104L178 104M146 104L174 126', '#c2410c', 1.3, { op: 0.6 });
      s += K.vol('M66 70C76 50 108 46 128 62C110 64 90 68 74 76Z', Gf);
      s += K.vol('M84 140C90 156 106 162 118 156C110 150 104 144 100 138Z', Gf);
      // тело
      const body = 'M38 106C38 80 64 64 94 64C124 64 146 84 146 106C146 128 124 146 94 146C64 146 38 132 38 106Z';
      s += K.vol(body, T);
      let net = '';
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const x = 92 + i * 12, y = 80 + j * 13 + (i % 2) * 6.5; net += `M${x - 6} ${y}Q${x} ${y + 7} ${x + 6} ${y}`; }
      s += clip(K, body, K.line(net, '#fbbf24', 1.6, { op: 0.75 }) + K.line('M86 70C78 88 78 122 86 140', '#fbbf24', 2.4));
      s += K.gloss(60, 86, 8, 4.4, -30, 0.4);
      // грудной плавник
      s += `<g class="art-sway" style="transform-origin:0% 50%">${K.vol('M98 110C108 104 122 106 126 114C118 120 106 120 98 116Z', Gf)}</g>`;
      // мордочка
      s += K.eyes(66, 98, 12, 9, { iris: '#0e7490', look: [-0.5, 0] });
      s += K.mouth('o', 44, 108, 12) + K.blush(56, 116, 5);
      // пузырьки
      s += '<g class="art-float"><circle cx="26" cy="82" r="4" fill="#e0f7ff" fill-opacity=".35" stroke="#7dd3fc" stroke-width="1.4"/><circle cx="20" cy="66" r="2.6" fill="none" stroke="#7dd3fc" stroke-width="1.2"/><circle cx="30" cy="54" r="1.8" fill="none" stroke="#7dd3fc" stroke-width="1"/></g>';
      s += K.spark(110, 30, 3, '#e0f7ff', 'art-float') + K.spark(186, 150, 2.6, '#e0f7ff') + K.spark(16, 140, 2.4, '#e0f7ff', 'art-float');
      return s;
    },

    // Серпопард: пятнистый зверь с длинной змеиной шеей, как на древней палетке царя Нармера. Тело уселось внизу,
    // шея выгнулась вверх, и любопытная кошачья мордочка заглядывает в окно второго этажа — что там на ужин?
    eg_serpopard(K) {
      const F = { c1: '#fde68a', c2: '#b7791f', rim: '#e4ffb0', texK: 0.1, line: '#4a2c0a' };
      const spot = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#5a3410" stroke-width="${r1(r * 0.55)}" stroke-dasharray="${r1(r * 1.4)} ${r1(r * 0.8)}"/><circle cx="${x}" cy="${y}" r="${r1(r * 0.4)}" fill="#c47a1a"/>`;
      let s = K.aura('#84cc16', 92, 112, 0.35);
      // окно второго этажа
      s += K.vol('M148 18H196V82H148Z', { c1: '#e7d3b5', c2: '#7a6248', rim: '#e4ffb0', tex: false, lw: 2, line: '#3b2a1a' });
      s += `<rect x="154" y="24" width="36" height="46" fill="${K.lin(['#fff3c4', '#fbbf24'])}" stroke="#3b2a1a" stroke-width="1.6"/>` + K.line('M172 24V70M154 46H190', '#5b4632', 2.4);
      s += K.part('M154 24H164C162 36 160 50 156 62L154 62Z', '#f472b6', { line: '#9d174d', lw: 1.2 }) + K.part('M146 70H198V78H146Z', '#a8896a', { line: '#3b2a1a', lw: 1.6 });
      // хвост
      const tail = 'M40 164C20 164 12 150 16 136C18 128 24 124 28 128';
      s += K.line(tail, '#4a2c0a', 11) + K.line(tail, '#f6d27a', 7) + `<path d="${tail}" fill="none" stroke="#5a3410" stroke-width="7" stroke-dasharray="3 7" opacity=".6"/>`;
      // тело сидит
      const body = 'M64 116C90 112 110 126 110 150C110 168 96 178 72 178C50 178 36 168 36 152C36 132 46 118 64 116Z';
      s += K.vol(body, F);
      s += clip(K, body, spot(54, 140, 4) + spot(72, 132, 3.6) + spot(92, 140, 4) + spot(48, 160, 3.4) + spot(98, 160, 3.4) + spot(66, 152, 3));
      s += K.vol(K.ell(66, 174, 11, 6), { ...F, tex: false, lw: 2 }) + K.vol(K.ell(92, 174, 11, 6), { ...F, tex: false, lw: 2 });
      // змеиная шея
      const neck = 'M84 126C68 100 104 92 106 72C108 58 118 50 128 50';
      s += K.line(neck, '#4a2c0a', 22) + K.line(neck, '#f6d27a', 17) + K.line('M80 120C70 102 98 94 102 76', '#fff3c4', 2.4, { op: 0.6 });
      s += spot(80, 112, 3) + spot(92, 98, 3) + spot(104, 86, 2.8) + spot(108, 70, 2.6);
      // голова у окна
      s += K.mirror(K.vol('M122 38L118 22L132 32Z', { ...F, tex: false, lw: 1.8 })).replace('translate(200 0)', 'translate(286 0)');
      s += K.vol(K.ell(143, 48, 18, 15.5), F);
      s += spot(132, 40, 2.2) + spot(152, 38, 2.2);
      s += K.eyes(146, 47, 7.4, 6, { iris: '#65a30d', look: [0.8, -0.2] });
      s += K.part('M152 54.6H157Q154.5 58 152 54.6Z', '#f472b6', { line: '#9d174d', lw: 0.9 }) + K.mouth('cat', 154, 59, 8);
      s += K.blush(134, 56, 3.6) + K.line('M158 56L166 54M158 59L166 60', '#fff', 1, { op: 0.8 });
      s += K.spark(30, 90, 3, '#e4ffb0', 'art-float') + K.spark(126, 140, 2.6, '#fde68a') + K.spark(60, 40, 2.6, '#e4ffb0', 'art-float') + K.spark(182, 120, 2.4, '#e4ffb0');
      return s;
    },

    // Павиан Тота: священный павиан бога мудрости сидит на каменном постаменте и вскинул лапы — приветствует восходящее
    // солнце; серебристая грива-накидка, розовая мордочка, на голове лунный диск в серпе месяца, за ухом тростниковое перо писца
    eg_pavian(K) {
      const F = { c1: '#c3cbb8', c2: '#45503f', rim: '#fff6b0', texK: 0.2, line: '#1a2218' };
      const pink = { c1: '#f9c0ac', c2: '#b0544a', rim: '#fff6b0', tex: false, line: '#4a1d16' };
      let s = K.aura('#facc15', 96, 104, 0.4);
      // восходящее солнце
      let d = '';
      for (let i = 0; i < 11; i++) { const a = (-180 + i * 18) * Math.PI / 180, w = 0.07; d += `M${P(100, 150, 58, a - w)}L${P(100, 150, i % 2 ? 72 : 84, a)}L${P(100, 150, 58, a + w)}Z`; }
      s += `<g class="art-spin-soft"><path d="${d}" fill="#fef08a" stroke="#ca8a04" stroke-width="1" opacity=".8"/></g>`;
      s += `<path d="M42 150A58 58 0 0 1 158 150Z" fill="${K.rad([[0, '#fffbe6'], [0.6, '#fde68a'], [1, '#f59e0b']], 0.5, 1, 1)}" stroke="#ca8a04" stroke-width="1.6"/>`;
      // постамент
      s += K.vol('M48 150H152V178H48Z', { c1: '#e7d3b5', c2: '#7a6248', rim: '#fff6b0', tex: false, lw: 2.2, line: '#3b2a1a' }) + K.line('M52 158H148', '#5b4632', 1.4, { op: 0.6 }) + neon(K, 100, 168, 'water', '#1e3a8a', 0.8);
      // поднятые лапы
      s += K.mirror(K.vol('M80 112C66 106 56 94 50 76C48 70 56 66 60 72C66 88 76 98 88 102Z', { ...F, tex: false, lw: 2.2 }) + ellV(K, 54, 70, 7.6, 8.2, -15, { ...pink, lw: 1.8 }) + K.line('M50 63v-4M54 62v-5M58 63v-4', '#4a1d16', 1.4));
      // тело
      s += K.vol('M100 104C122 104 132 118 132 134C132 146 122 152 100 152C78 152 68 146 68 134C68 118 78 104 100 104Z', F);
      s += K.mirror(K.vol(K.ell(80, 150, 12, 6.5), { ...F, tex: false, lw: 2 }));
      // серебристая грива-воротник вокруг морды
      s += K.vol(fur(100, 80, 31, 30, 18, 0.12), { c1: '#d9ded2', c2: '#59644f', rim: '#fff6b0', texK: 0.08, line: '#1a2218' });
      // голова: длинная розовая морда, глаза близко посажены под надбровьем
      s += K.vol(K.ell(100, 74, 19, 17), F);
      s += K.vol('M88 70C88 63 112 63 112 70L109 92C108 99 104 102 100 102C96 102 92 99 91 92Z', pink);
      s += K.line('M84 64Q100 57 116 64', '#3a302c', 3.6);
      s += K.eyes(100, 70, 6.6, 4.8, { iris: '#a16207', look: [0, -0.2] });
      s += '<path d="M95 94Q100 90 105 94Q104 98 100 99Q96 98 95 94Z" fill="#4a1d16"/>' + K.line('M100 78V88M94 82V90M106 82V90', '#d98a7a', 1.3, { op: 0.6 });
      s += K.line('M93 105Q100 108 107 105', INK, 2.2) + K.blush(88, 84, 3.6) + K.blush(112, 84, 3.6);
      // перо писца за ухом
      s += K.line('M120 80L142 48', '#3b2410', 4) + K.line('M120 80L142 48', '#e7c98f', 2.2) + K.line('M142 48l2 -3', INK, 2.4);
      // лунный диск в серпе
      s += `<circle class="art-aura" cx="100" cy="36" r="17" fill="${K.rad([[0, '#fffbe6', 0.8], [1, '#facc15', 0]])}"/>`;
      s += K.part('M84 42C86 56 114 56 116 42C110 50 90 50 84 42Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }) + K.vol(K.ell(100, 36, 9, 9), { c1: '#ffffff', c2: '#cbd5e1', rim: '#fff6b0', tex: false, lw: 1.8, line: '#475569' });
      s += K.line('M28 96l6 5-4 3 6 5M166 92l6 5-4 3 6 5', '#facc15', 2, { cls: 'art-blink' }) + K.spark(30, 40, 3, '#fef08a', 'art-float') + K.spark(172, 44, 2.8, '#fffbe6', 'art-float') + K.spark(180, 140, 2.4, '#fef08a');
      return s;
    },

    // Сешат: богиня письма и счёта. Белое платье, поверх — пятнистая шкура леопарда; на голове — семилучевая звезда
    // под перевёрнутой дугой. В одной руке пальмовая ветвь с зарубками-годами, другой тростниковым пером выводит
    // в воздухе светящиеся знаки; у ног — стопка библиотечных книг
    eg_seshat(K) {
      const skin = { c1: '#f2c08a', c2: '#a8622a', rim: '#fff6b0', tex: false, line: '#4a2408' };
      const spot = (x, y) => `<circle cx="${x}" cy="${y}" r="3" fill="none" stroke="#3b2410" stroke-width="1.6" stroke-dasharray="3.4 1.6"/><circle cx="${x}" cy="${y}" r="1.2" fill="#9a5a1a"/>`;
      let s = K.aura('#facc15', 92, 106, 0.42);
      // светящиеся знаки
      s += neon(K, 160, 36, 'ankh', '#facc15', 0.9, 0) + neon(K, 178, 64, 'reed', '#fde68a', 0.9, 0.6) + neon(K, 152, 86, 'water', '#facc15', 0.7, 1.1);
      // стопка книг
      s += K.vol('M130 166H178V178H130Z', { c1: '#93c5fd', c2: '#1d4ed8', rim: '#fff6b0', tex: false, lw: 1.8, line: '#0b1a3a' }) + K.vol('M134 156H174V166H134Z', { c1: '#fca5a5', c2: '#b91c1c', rim: '#fff6b0', tex: false, lw: 1.8, line: '#450a0a' }) + K.vol('M128 147H170V156H128Z', { c1: '#86efac', c2: '#15803d', rim: '#fff6b0', tex: false, lw: 1.8, line: '#052e16' });
      s += K.line('M134 172H174M138 161H170M132 151H166', '#fff', 1, { op: 0.6 });
      // пальмовая ветвь с зарубками
      const rib = 'M42 178C40 140 38 96 50 40C52 34 58 34 58 40';
      s += K.line(rib, '#3b2410', 7) + K.line(rib, '#84cc16', 4.2) + K.line('M38 150h7M38 138h7M38 126h7M39 114h7M40 102h7M42 90h7M44 78h7M46 66h7', '#3b2410', 1.6);
      // ноги
      s += K.mirror(K.vol('M86 162H96V174H86Z', { ...skin, lw: 2 }) + K.part('M82 174H100Q101 179 96 179H84Q80 179 82 174Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }));
      // белое платье и шкура леопарда
      const dress = 'M84 98C84 92 92 90 100 90C108 90 116 92 116 98L124 160C126 168 118 170 100 170C82 170 74 168 76 160Z';
      s += K.vol(dress, { c1: '#ffffff', c2: '#cfc3a6', rim: '#fff6b0', tex: false, lw: 2.2, line: '#4a3a1a' });
      const pelt = 'M82 100C90 94 110 94 118 100L122 138C110 146 90 146 78 138Z';
      s += K.vol(pelt, { c1: '#fde68a', c2: '#c27a1a', rim: '#fff6b0', tex: false, lw: 2, line: '#4a2c0a' });
      s += clip(K, pelt, spot(88, 108) + spot(104, 106) + spot(114, 116) + spot(94, 122) + spot(84, 132) + spot(108, 132) + spot(118, 136));
      s += K.part('M118 138L126 150L120 156L116 142Z', '#fde68a', { line: '#4a2c0a', lw: 1.4 }) + K.line('M120 146l4 3', '#3b2410', 1.6);
      // рука с ветвью
      s += K.vol('M84 100C72 104 62 112 56 122C54 128 62 132 66 126C70 118 78 112 88 110Z', skin) + ellV(K, 56, 122, 6.6, 6.2, 0, skin);
      // рука с пером
      s += K.vol('M116 100C128 102 138 96 144 86C148 80 156 84 154 90C148 104 134 112 120 112Z', skin);
      s += K.line('M148 92L166 66', '#3b2410', 4) + K.line('M148 92L166 66', '#e7c98f', 2.2) + K.line('M166 66l2.4 -3.4', INK, 2.6) + K.spark(170, 60, 4.4, '#fffbe6');
      s += ellV(K, 150, 88, 6.6, 6.2, 0, skin);
      s += collar(K, 100, 96, 20, 7, 3);
      // парик и лицо
      s += stripes(K, 'M78 68C76 50 86 38 100 38C114 38 124 50 122 68L124 100L112 100L110 80H90L88 100L76 100Z', '#111827', '#1f2937', 3, 0, '#030712', 1.8);
      s += K.vol(K.ell(100, 68, 15, 17), skin);
      s += K.line('M84 54Q100 46 116 54', '#5a3a06', 4.4) + K.line('M84 54Q100 46 116 54', '#fbbf24', 2.4);
      s += K.eyes(100, 68, 6.8, 5, { iris: '#7c3aed', lash: true, look: [0.4, 0.1] });
      s += K.mirror(K.line('M87 69L82 70', INK, 1.8));
      s += K.mouth('smile', 100, 78, 8) + K.blush(89, 77, 3.4) + K.blush(111, 77, 3.4);
      // эмблема: семилучевая звезда под дугой
      s += K.line('M100 46V30', '#5a3a06', 4) + K.line('M100 46V30', '#fbbf24', 2.2);
      s += K.part(star(100, 22, 12, 7, 0.5), '#fde68a', { line: '#5a3a06', lw: 1.6 }) + `<circle cx="100" cy="22" r="3.4" fill="#facc15" stroke="#5a3a06" stroke-width="1"/>`;
      s += K.line('M82 18Q100 -4 118 18', '#5a3a06', 5) + K.line('M82 18Q100 -4 118 18', '#fbbf24', 2.8);
      s += K.spark(24, 30, 3, '#fef08a', 'art-float') + K.spark(24, 110, 2.6, '#fffbe6') + K.spark(184, 128, 2.6, '#fef08a', 'art-float');
      return s;
    },

    // Амат: страж суда в Дуате — голова крокодила, грива и передние лапы льва, круп бегемота. Сидит у весов, где пёрышко
    // Маат уравновешивает сердце, и голодно скалится во все зубы — ждёт, не соврёт ли кто
    eg_amat(K) {
      const C = { c1: '#a3e08a', c2: '#1f5a2e', rim: '#e9d5ff', texK: 0.14, line: '#0f2a16' };
      const L = { c1: '#fcd77a', c2: '#a8641a', rim: '#e9d5ff', texK: 0.12, line: '#4a2606' };
      const Hp = { c1: '#a8b4e8', c2: '#3b3f7a', rim: '#e9d5ff', texK: 0.2, line: '#1a1c3a' };
      let s = K.aura('#a78bfa', 94, 110, 0.42);
      // весы истины
      s += K.line('M164 176V58M150 176H178M140 64H188', '#5a3a06', 4.6) + K.line('M164 176V58M150 176H178M140 64H188', '#fbbf24', 2.6);
      s += K.line('M140 64L134 90M140 64L146 90M188 64L182 90M188 64L194 90', '#fbbf24', 1.2);
      s += K.part('M130 90H150Q140 100 130 90Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }) + K.part('M178 90H198Q188 100 178 90Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 });
      s += plume(K, 140, 89, 16, 6, 0, '#f8fafc', '#94a3b8', '#475569');
      s += K.part('M188 89C182 85 180 81 183 79C185 78 187 79 188 81C189 79 191 78 193 79C196 81 194 85 188 89Z', '#ef4444', { line: '#7f1d1d', lw: 1.2 });
      // круп бегемота
      s += K.line('M150 152C160 150 166 158 164 166', '#1a1c3a', 6) + K.line('M150 152C160 150 166 158 164 166', '#8f9bd6', 3);
      s += K.vol(K.ell(120, 148, 36, 28), Hp);
      s += K.vol('M128 162C126 170 128 178 136 178H150C154 172 152 164 148 160Z', { ...Hp, tex: false, lw: 2.2 });
      // львиная грудь и лапы
      s += K.vol('M64 112C70 98 96 96 110 108C118 118 118 136 112 150L104 178H86L80 158C70 150 60 128 64 112Z', L);
      s += K.vol('M62 150C58 160 58 172 62 178H84C86 170 84 160 80 152Z', { ...L, tex: false, lw: 2.2 }) + K.line('M66 178V173M72 178V172M78 178V173', '#4a2606', 1.4);
      s += K.vol('M90 152C88 162 88 172 90 178H108C110 170 108 160 104 152Z', { ...L, tex: false, lw: 2.2 }) + K.line('M94 178V173M100 178V172M106 178V173', '#4a2606', 1.4);
      // грива
      let mn = '';
      for (let i = 0; i < 11; i++) { const a = (-200 + i * 22) * Math.PI / 180; mn += `M${P(82, 86, 22, a - 0.2)}L${P(82, 86, 40, a)}L${P(82, 86, 22, a + 0.2)}Z`; }
      s += K.part(mn, '#f59e0b', { line: '#4a2606', lw: 1.6 });
      s += K.vol(K.ell(82, 86, 30, 27), { ...L, c1: '#fbbf24', c2: '#b45309' });
      // голова крокодила: пасть влево
      const head = 'M96 58C114 60 120 76 116 88C112 98 104 104 92 106L36 104C24 103 18 96 20 88C22 80 28 76 38 76L72 70C76 62 84 58 96 58Z';
      s += K.vol(head, C);
      let tt = '';
      for (let x = 30; x <= 92; x += 8) { const y = 94.5 + (x - 30) * 0.05; tt += `M${r1(x - 3)} ${r1(y)}L${x} ${r1(y + 4.6)}L${r1(x + 3)} ${r1(y)}Z`; }
      s += `<path d="${tt}" fill="#fff" stroke="#0f2a16" stroke-width=".8" stroke-linejoin="round"/>` + K.line('M24 94C46 96 74 98 100 94', INK, 2.6) + K.line('M100 94l6 -4', INK, 2.2);
      s += `<ellipse cx="26" cy="83" rx="2.4" ry="1.7" fill="${INK}"/>` + '<g fill="#1f5a2e" opacity=".4"><circle cx="58" cy="82" r="2"/><circle cx="68" cy="78" r="1.6"/><circle cx="100" cy="76" r="2.2"/></g>';
      s += K.line('M60 104C62 110 70 112 72 106', '#f43f5e', 3);
      // глаз-бугорок
      s += ellV(K, 94, 66, 12, 11, 0, { ...C, texK: 0.1 });
      s += `<g class="art-eyes">${K.eye(94, 67, 7.4, { iris: '#facc15', lid: 'angry', skin: '#4f8a4a', look: [-0.5, 0.2] })}</g>`;
      s += K.spark(30, 40, 3, '#e9d5ff', 'art-float') + K.spark(120, 30, 2.6, '#c4b5fd') + K.spark(14, 140, 2.4, '#e9d5ff', 'art-float') + K.spark(180, 30, 2.4, '#fde68a');
      return s;
    },

    // Гуль: пустынный оборотень из арабских сказок. Под рваным плащом с капюшоном прячется полузверь-гиена: торчат
    // пятнистые уши, светятся зелёные глаза, ухмылка с клычками. Длинными когтистыми пальцами держит вверх ногами
    // зелёную табличку «Выход» — опять всех запутает. Над барханом — месяц
    eg_gul(K) {
      const R = { c1: '#b9b2c8', c2: '#3a3150', rim: '#e9d5ff', texK: 0.45, line: '#14101f' };
      const fur2 = { c1: '#d6c49a', c2: '#6b5a3a', rim: '#e9d5ff', texK: 0.2, line: '#2a2010' };
      let s = K.aura('#8b5cf6', 94, 108, 0.42);
      s += moon(K, 34, 30, 11);
      // бархан
      s += K.vol('M6 178C40 160 80 158 110 166C140 174 170 168 196 160V178Z', { c1: '#e7c98f', c2: '#8a6a3a', rim: '#e9d5ff', tex: false, lw: 2, line: '#4a3a1a' });
      // плащ
      const cloak = 'M100 40C128 40 140 62 140 88C140 110 146 132 154 150L144 146L140 160L130 150L122 166L112 152L100 170L88 152L78 166L70 150L60 160L56 146L46 150C54 132 60 110 60 88C60 62 72 40 100 40Z';
      s += K.vol(cloak, R);
      s += clip(K, cloak, K.line('M70 100Q76 130 70 158M130 100Q124 130 130 158M100 100V168', '#3a3150', 1.6, { op: 0.5 }));
      // уши гиены сквозь капюшон
      s += K.vol('M74 50L64 18L90 40Z', { ...fur2, tex: false, lw: 2 }) + K.vol('M126 50L136 18L110 40Z', { ...fur2, tex: false, lw: 2 });
      s += '<path d="M73 44L67 25L84 39Z M127 44L133 25L116 39Z" fill="#3a2a1a" opacity=".55"/>';
      // тёмный провал капюшона и морда
      s += K.part('M100 50C120 50 128 64 126 80C124 96 114 104 100 104C86 104 76 96 74 80C72 64 80 50 100 50Z', '#1a1428', { flat: true, line: '#14101f', lw: 2 });
      s += K.vol('M86 82C86 76 114 76 114 82C114 92 108 100 100 100C92 100 86 92 86 82Z', fur2);
      s += '<g fill="#5a4a2a" opacity=".7"><circle cx="90" cy="84" r="1.6"/><circle cx="110" cy="84" r="1.6"/><circle cx="94" cy="92" r="1.2"/><circle cx="106" cy="92" r="1.2"/></g>';
      s += K.part('M96 84Q100 81 104 84Q103 88 100 88Q97 88 96 84Z', '#14101f', { line: '#000', lw: 1 });
      s += K.line('M92 94Q100 99 108 94', INK, 2.2) + '<path d="M94 95l1.6 3.6 1.8-3zM104.6 95.8l1.8 3 1.6-3.6z" fill="#fff"/>';
      s += K.glow(88, 68, 5.6, 6.4, '#bef264') + K.glow(112, 68, 5.6, 6.4, '#bef264') + `<ellipse cx="89" cy="68" rx="1.6" ry="4" fill="#14101f"/><ellipse cx="113" cy="68" rx="1.6" ry="4" fill="#14101f"/>`;
      // табличка «Выход» вверх ногами
      s += `<g transform="rotate(180 150 100)">` + K.part('M126 88H174V112H126Z', '#16a34a', { line: '#052e16', lw: 2 }) +
        K.line('M136 106L141 99L146 101L150 94M141 99L138 93M146 101L151 106', '#f0fdf4', 2.2) + '<circle cx="150" cy="91" r="2.2" fill="#f0fdf4"/>' + K.line('M156 100H168M164 96L168 100L164 104', '#f0fdf4', 2.2) + '</g>';
      // когтистые руки
      s += K.line('M60 104C66 114 112 112 126 104', '#14101f', 11) + K.line('M60 104C66 114 112 112 126 104', '#b9b2c8', 7);
      s += K.line('M138 104C134 110 128 110 126 104M126 104l-2 -6M128 105l1 -7M132 105l3 -6', '#14101f', 3.2) + K.line('M128 105l1 -7M132 105l3 -6', '#d6c49a', 1.4);
      s += K.line('M144 120C150 122 162 122 166 118M166 118l3 -5M166 118l5 -1', '#14101f', 3.2);
      s += K.spark(170, 24, 3, '#e9d5ff', 'art-float') + K.spark(20, 100, 2.6, '#c4b5fd') + K.spark(186, 140, 2.4, '#e9d5ff', 'art-float') + K.spark(60, 26, 2.2, '#e9d5ff');
      return s;
    },

    // Бес: бородатый бог-карлик с львиной гривой и ушами, в короне из высоких разноцветных перьев. Пляшет на кривых ножках,
    // бьёт в бубен и показывает язык — так он пугает дурные сны; один кошмарик уже удирает прочь. Ночь, звёзды
    eg_bes(K) {
      const sk = { c1: '#f6c27a', c2: '#9a5420', rim: '#e9d5ff', tex: false, line: '#3b1a06' };
      const M = { c1: '#e8954a', c2: '#7c2d12', rim: '#e9d5ff', texK: 0.25, line: '#3b1206' };
      let s = K.aura('#a78bfa', 94, 108, 0.42);
      // удирающий кошмарик
      s += `<g class="art-float" style="animation-delay:-.6s">` + K.vol('M160 50C174 50 180 60 178 72C177 80 182 86 188 88C178 92 166 90 158 84C150 78 146 70 148 62C150 54 154 50 160 50Z', { c1: '#6b6080', c2: '#1a1428', rim: '#e9d5ff', tex: false, lw: 1.8, line: '#0b0814' }) +
        K.glow(160, 64, 2.6, 3.2, '#f0abfc') + K.glow(170, 63, 2.6, 3.2, '#f0abfc') + K.line('M160 74q5 -4 10 0', '#f0abfc', 1.6) + K.line('M140 58h-8M142 66h-10M144 74h-8', '#c4b5fd', 1.6, { op: 0.7 }) + '</g>';
      // корона из перьев
      const cols = ['#2563eb', '#16a34a', '#dc2626', '#16a34a', '#2563eb'];
      [-28, -14, 0, 14, 28].forEach((a, i) => { s += plume(K, 100, 52, 38, 12, a, K.mix('#ffffff', cols[i], 0.55), cols[i], '#1e1b4b'); });
      s += K.part('M80 52H120L117 60H83Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 });
      // ножки колесом
      s += K.line('M84 150C70 156 72 168 80 174M116 150C130 156 128 168 120 174', '#3b1a06', 12) + K.line('M84 150C70 156 72 168 80 174M116 150C130 156 128 168 120 174', '#e9ac62', 8);
      s += K.vol(K.ell(78, 175, 11, 5.5), { ...sk, lw: 2 }) + K.vol(K.ell(122, 175, 11, 5.5), { ...sk, lw: 2 });
      // хвост и животик в леопардовом передничке
      s += K.line('M120 150C140 158 150 150 150 140', '#3b1a06', 6) + K.line('M120 150C140 158 150 150 150 140', '#e8954a', 3);
      s += K.vol(K.ell(100, 128, 32, 28), sk);
      s += K.part('M74 140Q100 150 126 140L122 160Q100 166 78 160Z', '#fde68a', { line: '#4a2c0a', lw: 1.8 }) + '<g fill="#5a3410"><circle cx="86" cy="150" r="2"/><circle cx="100" cy="154" r="2"/><circle cx="114" cy="150" r="2"/><circle cx="92" cy="158" r="1.6"/><circle cx="108" cy="158" r="1.6"/></g>';
      s += `<circle cx="100" cy="128" r="2" fill="#9a5420"/>` + K.line('M88 118q12 6 24 0', '#9a5420', 1.4, { op: 0.6 });
      // рука в бок
      s += K.vol('M128 112C142 114 150 124 146 134C142 140 134 138 132 132C134 126 130 122 124 122Z', sk);
      // рука с бубном
      s += K.vol('M72 112C62 104 54 92 50 80C48 74 56 70 60 76C64 86 70 96 80 102Z', sk);
      s += `<g class="art-sway" style="transform-origin:50% 100%">` + K.vol(K.ell(46, 66, 18, 18), { c1: '#fff3c4', c2: '#c9934e', rim: '#fff6c2', tex: false, lw: 2.4, line: '#4a2c0a' }) +
        `<circle cx="46" cy="66" r="18" fill="none" stroke="#b45309" stroke-width="4" opacity=".8"/>` + '<g fill="#fbbf24" stroke="#5a3a06" stroke-width=".8"><circle cx="29" cy="62" r="2.6"/><circle cx="63" cy="62" r="2.6"/><circle cx="40" cy="49" r="2.6"/><circle cx="56" cy="82" r="2.6"/></g>' + '</g>';
      s += ellV(K, 54, 78, 6.4, 6, 0, sk);
      // грива и уши
      s += K.vol(fur(100, 80, 38, 34, 16, 0.14), M);
      s += K.mirror(ellV(K, 66, 58, 8, 10, -25, { ...sk, lw: 2 }) + '<ellipse cx="66" cy="59" rx="3.6" ry="5" transform="rotate(-25 66 59)" fill="#c2672c"/>');
      // лицо
      s += K.vol(K.ell(100, 80, 24, 22), sk);
      s += K.vol(fur(100, 104, 20, 14, 10, 0.18), M);
      s += K.eyes(100, 74, 10, 8.4, { iris: '#7c3aed', look: [0.2, 0.1] });
      s += K.line('M82 62Q90 58 96 63M104 63Q110 58 118 62', '#3b1206', 2.6);
      s += K.vol(K.ell(100, 86, 7, 5), { c1: '#f6b066', c2: '#9a5420', tex: false, lw: 1.6, line: '#3b1a06' });
      s += '<path d="M90 94Q100 100 110 94Q108 108 100 110Q92 108 90 94Z" fill="#3a0f1a" stroke="#1b1030" stroke-width="2"/>' + '<path d="M95 99Q100 116 105 99Z" fill="#f472b6" stroke="#9d174d" stroke-width="1.2"/>';
      s += K.blush(80, 88, 4.6) + K.blush(120, 88, 4.6);
      s += K.spark(24, 30, 3, '#e9d5ff', 'art-float') + K.spark(184, 120, 2.6, '#fde68a') + K.spark(20, 128, 2.4, '#e9d5ff', 'art-float') + K.spark(140, 16, 2.4, '#fde68a');
      return s;
    },

    // Ифрит: огненный джинн вырвался из медного кувшина — пробка с печатью Сулеймана отлетела в сторону. Пламенный торс
    // растёт из дымного хвоста, на голове рога и огненная шевелюра; на одной ладони пляшет огонёк, в другой — свёрнутый
    // лаваш с румяными подпалинами: подрабатывает в шаурмичной
    eg_ifrit(K) {
      const sk = { c1: '#fdba74', c2: '#9a1b0b', rim: '#ffe29a', texK: 0.25, line: '#3b0a04' };
      let s = K.aura('#ff7a1a', 96, 104, 0.5) + K.aura('#ef4444', 60, 60, 0.3);
      // огненная шевелюра
      s += K.flame(80, 50, 42, 26, '#ffd23f', '#e8431a', { style: 'animation-delay:-.4s' }) + K.flame(120, 50, 42, 26, '#ffd23f', '#e8431a', { style: 'animation-delay:-.9s' }) + K.flame(100, 44, 54, 32, '#fff0a0', '#ff7a1a');
      // отлетевшая пробка с печатью
      s += `<g class="art-float" style="animation-delay:-.5s"><g transform="rotate(-24 28 108)">` + K.vol('M18 112H38L36 122H20Z', { c1: '#f0a070', c2: '#7c2d12', rim: '#ffe29a', tex: false, lw: 1.8, line: '#3b1206' }) +
        `<circle cx="28" cy="108" r="9" fill="#fbbf24" stroke="#5a3a06" stroke-width="1.6"/>` + K.line(`${star(28, 108, 6.4, 6, 0.58)}`, '#7c2d12', 1.4) + '</g></g>';
      // кувшин
      const jug = 'M72 146C72 140 84 136 100 136C116 136 128 140 128 146C142 150 150 160 148 168C146 176 134 178 100 178C66 178 54 176 52 168C50 160 58 150 72 146Z';
      s += K.line('M140 150C160 148 162 170 144 170', '#5a2006', 6) + K.line('M140 150C160 148 162 170 144 170', '#e0803a', 3);
      s += K.vol(jug, { c1: '#f6a868', c2: '#8a3a12', rim: '#ffe29a', tex: false, lw: 2.2, line: '#3b1206' });
      s += K.line('M60 158Q100 166 140 158', '#fbbf24', 2.4) + K.stitch('M62 166Q100 173 138 166', '#7c2d12', 1.6);
      s += K.vol('M84 132H116L112 142H88Z', { c1: '#f6a868', c2: '#8a3a12', rim: '#ffe29a', tex: false, lw: 2, line: '#3b1206' });
      // дымный хвост
      const tail = 'M64 102C64 120 84 128 94 134L106 134C118 126 136 118 136 102Z';
      s += K.vol(tail, { c1: '#fb923c', c2: '#7f1d1d', rim: '#ffe29a', texK: 0.3, line: '#3b0a04' });
      s += `<g class="art-float"><circle cx="54" cy="122" r="7" fill="#57534e" opacity=".45"/><circle cx="146" cy="118" r="8" fill="#57534e" opacity=".4"/><circle cx="152" cy="104" r="5" fill="#78716c" opacity=".35"/></g>`;
      // торс и пояс
      s += K.vol('M66 74C66 62 82 58 100 58C118 58 134 62 134 74C136 88 130 100 126 106H74C70 100 64 88 66 74Z', sk);
      s += K.part('M68 98Q100 108 132 98L130 112Q100 120 70 112Z', '#fbbf24', { line: '#5a3a06', lw: 1.8 }) + K.rhomb(100, 108, 5, '#dc2626', '#5a3a06');
      s += K.line('M86 80Q100 86 114 80', '#9a1b0b', 1.4, { op: 0.6 });
      // рука с огоньком
      s += K.vol('M68 70C54 66 44 56 40 42C38 36 46 32 50 38C54 50 62 58 72 60Z', { ...sk, tex: false, lw: 2.2 }) + ellV(K, 44, 38, 7, 6.5, 0, { ...sk, tex: false, lw: 2 });
      s += K.flame(44, 32, 26, 16, '#fff0a0', '#ff5a14', { style: 'animation-delay:-.2s' });
      // рука с лавашом
      s += K.vol('M132 70C146 74 154 84 156 96C157 102 150 104 148 98C146 88 138 82 130 80Z', { ...sk, tex: false, lw: 2.2 });
      s += K.vol('M140 102L172 84C178 82 182 90 176 94L146 112Z', { c1: '#fdf0cc', c2: '#c9934e', rim: '#ffe29a', tex: false, lw: 2, line: '#5a3a10' });
      s += '<g fill="#a0522d" opacity=".7"><ellipse cx="156" cy="96" rx="2.6" ry="1.6"/><ellipse cx="166" cy="90" rx="2" ry="1.3"/><ellipse cx="150" cy="103" rx="1.8" ry="1.2"/></g>' + K.part('M174 86C180 80 186 84 182 90Z', '#86efac', { line: '#14532d', lw: 1 });
      s += ellV(K, 150, 102, 6.6, 6.2, 0, { ...sk, tex: false, lw: 2 });
      // голова, рога, уши
      s += K.mirror(K.line('M82 34C72 26 70 14 78 6', '#1c0a04', 7) + K.line('M82 34C72 26 70 14 78 6', '#57534e', 4) + K.part('M80 42L64 34L76 52Z', '#fb923c', { line: '#3b0a04', lw: 1.8 }));
      s += K.vol(K.ell(100, 42, 21, 20), sk);
      s += K.eyes(100, 41, 8.6, 6.2, { iris: '#facc15', lid: 'angry', skin: '#e0703a', look: [0.3, 0.1] });
      s += K.mouth('fang', 100, 50, 14);
      s += `<circle cx="78" cy="52" r="3.4" fill="none" stroke="#fbbf24" stroke-width="1.8"/><circle cx="122" cy="52" r="3.4" fill="none" stroke="#fbbf24" stroke-width="1.8"/>`;
      s += K.spark(20, 100, 3, '#fff3b0', 'art-float') + K.spark(180, 40, 2.8, '#ffd23f') + K.spark(184, 140, 2.6, '#fff3b0', 'art-float') + K.spark(18, 150, 2.4, '#ffd23f');
      return s;
    },

    // Змей Пунта: огромный золотой змей из древней сказки о потерпевшем кораблекрушение — с бородой и бровями из лазурита.
    // Обвил кольцами свой волшебный остров с пальмой и добродушно улыбается; по волнам к нему плывёт надувной круг
    eg_zmeypunta(K) {
      const G = { c1: '#fff09a', c2: '#a16207', rim: '#c8f3ff', texK: 0.14, line: '#3b2a04' };
      const cols = ['#3b2a04', '#e8b828', '#fff3a0', '#1d4ed8'];
      let s = K.aura('#38bdf8', 96, 108, 0.4);
      s += nile(K, 150, 0.9);
      // остров с пальмой
      s += K.vol('M36 158C48 140 76 132 100 132C124 132 152 140 164 158Z', { c1: '#f6dfa4', c2: '#a8742c', rim: '#fff6c2', tex: false, lw: 2, line: '#4a2c0a' });
      const trunk = 'M58 142C54 118 50 96 58 76';
      s += K.line(trunk, '#3b2410', 9) + K.line(trunk, '#b07a3a', 5.6) + K.line('M52 132h7M51 120h7M51 108h7M53 96h7M55 86h6', '#3b2410', 1.4);
      for (const [a, l] of [[-170, 30], [-140, 32], [-100, 26], [-60, 30], [-25, 28], [5, 24]]) s += K.leaf(58, 76, l, a, '#4ade80');
      s += '<circle cx="54" cy="80" r="3.6" fill="#7c4a1a" stroke="#3b2410" stroke-width="1"/><circle cx="62" cy="81" r="3.6" fill="#7c4a1a" stroke="#3b2410" stroke-width="1"/>';
      // кольца вокруг острова
      s += coil(K, 'M30 160A70 13 0 1 0 170 160A70 13 0 1 0 30 160', 17, cols);
      s += coil(K, 'M150 152C164 140 160 124 146 116C136 110 128 100 132 86', 18, cols);
      // надувной круг
      s += `<g class="art-float" style="animation-delay:-.8s"><ellipse cx="174" cy="178" rx="16" ry="7" fill="none" stroke="#7f1d1d" stroke-width="9"/><ellipse cx="174" cy="178" rx="16" ry="7" fill="none" stroke="#fff" stroke-width="6"/><ellipse cx="174" cy="178" rx="16" ry="7" fill="none" stroke="#ef4444" stroke-width="6" stroke-dasharray="12 13"/></g>`;
      // голова: широкие челюсти, чешуйки на темени
      const hd = 'M133 44C152 44 164 56 166 70C168 88 156 102 133 102C110 102 98 88 100 70C102 56 114 44 133 44Z';
      s += K.vol(hd, G);
      s += clip(K, hd, K.line('M114 54q4 4 8 0q4 4 8 0q4 4 8 0q4 4 8 0q4 4 8 0M118 48q4 4 8 0q4 4 8 0q4 4 8 0q4 4 8 0', '#c08a12', 1.4, { op: 0.6 }));
      s += K.gloss(116, 60, 6, 3.2, -35, 0.4);
      // борода из лазурита
      s += stripes(K, 'M124 96H142L144 120Q133 130 122 120Z', '#1d4ed8', '#fbbf24', 3.2, 0, '#0b1a3a', 1.6);
      // брови из лазурита и глаза
      s += K.line('M114 66Q122 58 130 64M136 64Q144 58 152 66', '#0b1a3a', 6) + K.line('M114 66Q122 58 130 64M136 64Q144 58 152 66', '#3b82f6', 3.6);
      s += K.eyes(133, 74, 9.6, 6.6, { iris: '#1d4ed8', lid: 'half', skin: '#f3d36a', look: [-0.3, 0.2] });
      s += K.mouth('smile', 133, 88, 12) + K.blush(116, 86, 4.4) + K.blush(150, 86, 4.4);
      s += '<ellipse cx="128" cy="80" rx="1.4" ry="1" fill="#3b2a04"/><ellipse cx="138" cy="80" rx="1.4" ry="1" fill="#3b2a04"/>';
      s += drop(24, 120, 3, '#bfeaff', 'art-float', 0.4) + K.spark(96, 30, 3, '#e0f7ff', 'art-float') + K.spark(184, 40, 2.8, '#fde68a') + K.spark(184, 110, 2.4, '#e0f7ff');
      return s;
    },

    // Апис: священный бык Мемфиса — чёрный, с белым треугольником на лбу; между рогами солнечный диск с уреем, на спине
    // попона с золотыми крыльями. На шее — шарф болельщика двух цветов: болеет сразу за обе команды. Под копытами — газон
    eg_apis(K) {
      const B = { c1: '#6b7280', c2: '#0b0f19', rim: '#e4ffb0', texK: 0.3, line: '#030712' };
      let s = K.aura('#84cc16', 96, 110, 0.4);
      // газон и флажки
      s += `<ellipse cx="100" cy="176" rx="90" ry="8" fill="${K.rad([[0, '#65a30d', 0.6], [1, '#3f6212', 0]])}"/>`;
      s += K.line('M176 176V132', '#57534e', 2) + K.part('M176 132L194 138L176 144Z', '#ef4444', { line: '#7f1d1d', lw: 1.2 }) + K.line('M186 176V142', '#57534e', 2) + K.part('M186 142L200 147L186 152Z', '#3b82f6', { line: '#1e3a8a', lw: 1.2 });
      // хвост с кисточкой
      s += K.line('M162 108C176 114 178 132 172 146', '#030712', 5) + K.line('M162 108C176 114 178 132 172 146', '#4b5563', 2.4) + K.part('M168 142L176 158L180 144Z', '#111827', { line: '#000', lw: 1.2 });
      // дальние ноги
      s += K.vol('M132 136H146V172H134Z', { ...B, tex: false, lw: 2 }) + K.vol('M80 136H94V172H82Z', { ...B, tex: false, lw: 2 });
      // тело
      s += K.vol('M64 108C66 90 92 84 120 86C146 88 166 98 166 118C166 138 148 148 120 148C96 148 66 140 64 108Z', B);
      // попона с крыльями
      const cloth = 'M96 88C110 86 130 86 146 90L148 128C132 132 112 132 96 128Z';
      s += K.vol(cloth, { c1: '#f87171', c2: '#991b1b', rim: '#fde68a', tex: false, lw: 1.8, line: '#450a0a' });
      s += clip(K, cloth, K.line('M96 98H150M96 120H150', '#fbbf24', 3) + K.line('M100 110Q112 100 122 110Q132 100 144 110', '#fbbf24', 2.4) + K.line('M104 114l4 -4M112 114l3 -5M130 114l3 -5M138 114l4 -4', '#1d4ed8', 2));
      // ближние ноги с копытами
      s += K.vol('M140 136H154V172H142Z', { ...B, tex: false, lw: 2 }) + K.vol('M70 132H86V172H72Z', { ...B, tex: false, lw: 2 });
      s += K.part('M70 172H88L87 178H71Z', '#fbbf24', { line: '#5a3a06', lw: 1.2 }) + K.part('M140 172H156L155 178H141Z', '#fbbf24', { line: '#5a3a06', lw: 1.2 });
      // шарф болельщика
      s += K.part('M50 96C60 108 80 110 92 100L94 108C82 120 58 118 46 104Z', '#ef4444', { line: '#7f1d1d', lw: 1.6 }) + K.part('M70 106L64 128L72 128L76 108Z', '#3b82f6', { line: '#1e3a8a', lw: 1.4 });
      s += K.line('M58 104L62 112M78 106L80 114', '#fff', 2.4) + K.line('M64 128v4M68 128v4M72 128v4', '#1e3a8a', 1.2);
      // голова
      s += K.mirror(K.part('M80 52C68 50 60 44 58 36C64 38 72 40 82 42Z', '#9ca3af', { line: '#030712', lw: 1.6 })).replace('translate(200 0)', 'translate(140 0)');
      s += K.line('M60 46C48 38 46 22 56 14M80 46C92 38 94 22 84 14', '#3b2a10', 6) + K.line('M60 46C48 38 46 22 56 14M80 46C92 38 94 22 84 14', '#f5f5f4', 3.6);
      s += `<circle class="art-aura" cx="70" cy="24" r="16" fill="${K.rad([[0, '#fff6c2', 0.8], [1, '#ffb020', 0]])}"/>` + K.vol(K.ell(70, 24, 10, 10), { c1: '#ffd23f', c2: '#dc2626', tex: false, lw: 1.8, line: '#7a1a08' });
      s += K.part('M66 38C64 32 66 28 70 26C74 28 76 32 74 38Z', '#22c55e', { line: '#14532d', lw: 1.2 });
      s += K.vol('M70 40C88 40 96 54 94 68C92 82 84 94 70 96C56 94 48 82 46 68C44 54 52 40 70 40Z', B);
      s += K.part('M64 48H76L70 58Z', '#f8fafc', { line: '#94a3b8', lw: 1 });
      s += K.vol('M56 80C56 74 84 74 84 80C84 90 78 98 70 98C62 98 56 90 56 80Z', { c1: '#9ca3af', c2: '#374151', rim: '#e4ffb0', tex: false, lw: 1.8, line: '#030712' });
      s += '<ellipse cx="64" cy="86" rx="2.4" ry="1.8" fill="#030712"/><ellipse cx="76" cy="86" rx="2.4" ry="1.8" fill="#030712"/>';
      s += K.eyes(70, 66, 9.4, 6, { iris: '#a16207', look: [0, 0.2] });
      s += K.blush(52, 76, 3.6) + K.blush(88, 76, 3.6);
      s += K.spark(30, 30, 3, '#e4ffb0', 'art-float') + K.spark(120, 40, 2.8, '#fde68a') + K.spark(184, 90, 2.4, '#e4ffb0', 'art-float') + K.spark(24, 140, 2.4, '#e4ffb0');
      return s;
    },

    // Нефертум: юный бог голубого лотоса. Стоит в огромном цветке на воде — ведь солнце впервые взошло из такого лотоса;
    // на голове корона-лотос с двумя высокими перьями, у виска — детская прядь. Нюхает цветок, и вокруг вьётся
    // летний аромат; рядом плавают листья лотоса
    eg_nefertum(K) {
      const skin = { c1: '#f2c08a', c2: '#a8622a', rim: '#e4ffb0', tex: false, line: '#4a2408' };
      let s = K.aura('#84cc16', 92, 104, 0.4) + K.aura('#60a5fa', 56, 150, 0.3);
      s += `<ellipse cx="100" cy="172" rx="90" ry="10" fill="${K.rad([[0, '#38bdf8', 0.5], [1, '#0e7490', 0]])}"/>`;
      s += K.part('M6 172C6 165 28 163 40 167C40 174 12 177 6 172Z', '#3fa34d', { line: '#14532d', lw: 1.4 }) + K.part('M160 174C160 168 180 166 194 170C194 176 166 179 160 174Z', '#3fa34d', { line: '#14532d', lw: 1.4 });
      // аромат
      s += K.line('M134 70C146 62 140 52 152 44C162 38 158 28 168 22M128 82C142 80 146 70 158 70C168 70 170 60 180 58', '#f9a8d4', 2, { op: 0.8, cls: 'art-float' });
      s += K.spark(160, 34, 3, '#fbcfe8', 'art-float') + K.spark(176, 66, 2.6, '#fde68a');
      // дальние лепестки огромного лотоса
      const pet = 'M0 0C-12 -14 -12 -40 0 -56C12 -40 12 -14 0 0Z', pf = K.lin(['#3b82f6', '#bfdbfe', '#eff6ff']);
      for (const a of [-70, 70, -46, 46]) s += `<path d="${pet}" transform="translate(100 172) rotate(${a})" fill="${pf}" stroke="#1e3a8a" stroke-width="1.6"/>`;
      // юный бог
      s += K.vol('M80 120C80 110 90 106 100 106C110 106 120 110 120 120L122 160H78Z', skin);
      s += collar(K, 100, 112, 18, 6, 3);
      // рука с цветком у носа
      s += K.vol('M116 114C126 114 132 104 130 94C130 88 122 86 122 92C122 100 118 104 112 106Z', skin);
      s += lotus(K, 124, 86, 0.7, 30, '#60a5fa') + ellV(K, 126, 92, 5.8, 5.4, 0, skin);
      // машущая рука
      s += `<g class="art-sway" style="transform-origin:100% 100%">${K.vol('M84 114C74 110 66 100 64 88C62 82 70 80 72 86C74 96 80 102 88 106Z', skin)}${ellV(K, 67, 84, 6, 5.6, 0, skin)}</g>`;
      // ближние лепестки
      for (const a of [-24, 24, 0]) s += `<path d="${pet}" transform="translate(100 176) rotate(${a}) scale(.9 .8)" fill="${pf}" stroke="#1e3a8a" stroke-width="1.8"/>`;
      s += '<path d="M66 168Q100 186 134 168Q100 176 66 168Z" fill="#65a30d" stroke="#1f4a0e" stroke-width="1.4"/>';
      // голова с прядью и короной
      s += plume(K, 92, 42, 34, 10, -8) + plume(K, 108, 42, 34, 10, 8);
      s += lotus(K, 100, 46, 1.25, 0, '#3b82f6');
      s += K.line('M84 52C78 60 78 64 82 70', '#5a3a06', 2.4) + `<circle cx="80" cy="74" r="2.6" fill="#fbbf24" stroke="#5a3a06" stroke-width="1"/>` + K.line('M116 52C122 60 122 64 118 70', '#5a3a06', 2.4) + `<circle cx="120" cy="74" r="2.6" fill="#fbbf24" stroke="#5a3a06" stroke-width="1"/>`;
      s += K.vol(K.ell(100, 70, 17, 18), skin);
      s += stripes(K, 'M83 64C82 52 90 46 100 46C110 46 118 52 117 64C112 58 88 58 83 64Z', '#111827', '#1f2937', 3, 0, '#030712', 1.6);
      s += K.line('M84 64C76 74 78 86 86 92C82 84 82 76 86 70', '#111827', 4) + K.line('M84 64C76 74 78 86 86 92', '#374151', 1.4);
      s += K.eyes(101, 72, 6.8, 5.2, { iris: '#1d4ed8', lid: 'half', skin: '#e9ac72', look: [0.6, 0.1] });
      s += K.mouth('smile', 102, 81, 8) + K.blush(90, 80, 3.6) + K.blush(114, 80, 3.6);
      s += K.spark(30, 40, 3, '#e4ffb0', 'art-float') + K.spark(20, 120, 2.6, '#bfdbfe') + K.spark(176, 120, 2.4, '#e4ffb0', 'art-float');
      return s;
    },

    // Тот: бог мудрости с головой ибиса — длинный изогнутый клюв, на голове лунный диск в серпе, полосатый парик.
    // В одной руке палетка писца с красной и чёрной тушью, другой рукой тростниковым пером выводит в воздухе
    // светящиеся иероглифы; у ног развёрнут свиток летописи
    eg_tot(K) {
      const skin = { c1: '#d9935a', c2: '#7c3a12', rim: '#fff6b0', tex: false, line: '#3b1606' };
      const blk = { c1: '#4b5563', c2: '#0b0f19', rim: '#fff6b0', tex: false, line: '#030712' };
      let s = K.aura('#facc15', 100, 102, 0.45) + K.aura('#f8fafc', 52, 30, 0.3);
      // светящиеся иероглифы
      s += neon(K, 170, 40, 'eye', '#facc15', 0.9, 0) + neon(K, 182, 72, 'ankh', '#fde68a', 0.8, 0.5) + neon(K, 22, 40, 'water', '#22d3ee', 0.8, 0.9) + neon(K, 18, 70, 'feather', '#f472b6', 0.8, 1.3);
      // свиток летописи
      s += K.part('M14 168H66V178H14Z', '#fef3c7', { line: '#92400e', lw: 1.6 }) + K.vol(K.ell(14, 173, 4.4, 6), { c1: '#fde68a', c2: '#b45309', tex: false, lw: 1.4 }) + K.vol(K.ell(66, 173, 4.4, 6), { c1: '#fde68a', c2: '#b45309', tex: false, lw: 1.4 });
      s += K.line('M22 172h6M32 172l3 -2 3 2 3 -2M48 171v4M54 172h6M22 176h12M40 176h14', '#7c2d12', 1.2);
      // ноги
      s += K.mirror(K.vol('M86 156H96V172H86Z', skin) + K.part('M82 172H100Q101 178 96 178H84Q80 178 82 172Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }));
      // схенти
      s += K.vol('M78 122H122L130 158Q100 164 70 158Z', { c1: '#ffffff', c2: '#d6c9a8', rim: '#fff6b0', tex: false, lw: 2.2, line: '#4a3a1a' });
      s += K.line('M84 128L78 158M92 128L88 160M108 128L112 160M116 128L122 158', '#c9b894', 1.3);
      s += stripes(K, 'M92 126H108L112 162H88Z', '#fbbf24', '#1e40af', 3.4, 0, '#5a3a06', 1.6);
      s += K.line('M78 124H122', '#5a3a06', 5) + K.line('M78 124H122', '#fbbf24', 3);
      // торс
      s += K.vol('M76 94C76 86 88 84 100 84C112 84 124 86 124 94C126 106 122 118 118 124H82C78 118 74 106 76 94Z', skin);
      // рука с палеткой
      s += K.vol('M78 92C66 96 58 104 54 114C52 120 60 124 64 118C66 110 72 104 82 102Z', skin);
      s += K.vol('M30 112L78 100L80 108L32 120Z', { c1: '#fff7e0', c2: '#c9b48a', rim: '#fff6b0', tex: false, lw: 1.8, line: '#4a3a1a' }) + '<circle cx="40" cy="113.6" r="2.6" fill="#dc2626" stroke="#4a1a06" stroke-width=".8"/><circle cx="48" cy="111.6" r="2.6" fill="#111827" stroke="#000" stroke-width=".8"/>' + K.line('M56 110L72 106', '#7c5a2a', 1.4);
      s += ellV(K, 58, 117, 6.6, 6.2, 0, skin);
      // рука с пером
      s += K.vol('M122 92C134 92 144 84 150 74C154 68 162 72 160 78C154 92 140 102 124 104Z', skin);
      s += K.line('M154 78L170 52', '#3b2410', 4) + K.line('M154 78L170 52', '#e7c98f', 2.2) + K.line('M170 52l2.4 -3.6', INK, 2.6) + K.spark(174, 46, 5, '#fffbe6');
      s += ellV(K, 156, 76, 6.6, 6.2, 0, skin);
      // парик и усех
      s += K.mirror(stripes(K, 'M86 54L80 96L90 98L94 60Z', '#1e3a8a', '#fbbf24', 3, 0, '#0b1a3a', 1.6));
      s += collar(K, 100, 90, 26, 9, 4);
      // голова ибиса и клюв
      s += K.vol(K.ell(100, 56, 16, 15), blk);
      s += K.part('M90 60C76 64 60 80 52 104C50 108 54 110 56 106C64 86 78 72 96 68Z', '#1f2937', { line: '#030712', lw: 1.8 });
      s += K.line('M86 66C74 72 64 84 58 100', '#6b7280', 1.2, { op: 0.8 });
      s += `<g class="art-eyes">${K.eye(98, 53, 6, { iris: '#facc15', look: [-0.5, 0.4] })}</g>` + K.line('M92 46Q98 43 104 46', '#9ca3af', 1.6);
      // лунная корона
      s += `<circle class="art-aura" cx="100" cy="24" r="18" fill="${K.rad([[0, '#f8fafc', 0.8], [1, '#e0f2fe', 0]])}"/>`;
      s += K.part('M82 30C86 46 114 46 118 30C112 38 88 38 82 30Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }) + K.vol(K.ell(100, 24, 10, 10), { c1: '#ffffff', c2: '#94a3b8', rim: '#fff6b0', tex: false, lw: 1.8, line: '#475569' });
      s += K.spark(36, 140, 2.8, '#fef08a', 'art-float') + K.spark(178, 120, 2.6, '#fffbe6') + K.spark(150, 16, 2.4, '#fef08a', 'art-float');
      return s;
    },

    // Сехмет: грозная львиноголовая богиня палящего солнца и покровительница лекарей. Золотая львиная голова с гривой,
    // над ней солнечный диск с уреем; алое платье в узоре перьев; в одной руке скипетр-папирус, на ладони другой —
    // язычок пламени; вокруг дрожит горячий воздух пустыни
    eg_sehmet(K) {
      const L = { c1: '#fcd77a', c2: '#a8641a', rim: '#ffe29a', texK: 0.12, line: '#4a2606' };
      const D = { c1: '#f87171', c2: '#7f1d1d', rim: '#ffe29a', tex: false, line: '#3b0a0a', lw: 2.2 };
      let s = K.aura('#ff7a1a', 100, 100, 0.5) + K.aura('#ef4444', 64, 40, 0.3);
      s += K.line('M20 150q4 -6 0 -12t0 -12M180 148q4 -6 0 -12t0 -12M164 30q4 -6 0 -12t0 -12', '#fdba74', 2, { op: 0.7, cls: 'art-blink' });
      // скипетр-папирус
      s += wadj(K, 46, 64, 176);
      // ноги
      s += K.mirror(K.vol('M86 162H96V174H86Z', L) + K.part('M82 174H100Q101 179 96 179H84Q80 179 82 174Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }));
      // платье в узоре перьев
      const dress = 'M82 98C82 92 90 90 100 90C110 90 118 92 118 98L126 160C128 168 120 170 100 170C80 170 72 168 74 160Z';
      s += K.vol(dress, D);
      let fe = '';
      for (let y = 112; y < 172; y += 10) for (let x = 70 + ((y / 10) % 2) * 6; x < 132; x += 12) fe += `M${x - 5} ${y}Q${x} ${y + 7} ${x + 5} ${y}`;
      s += clip(K, dress, K.line(fe, '#fbbf24', 1.6, { op: 0.75 }));
      // рука со скипетром
      s += K.vol('M84 98C72 100 60 98 52 94C46 92 44 100 50 102C58 106 70 108 84 108Z', L) + ellV(K, 47, 97, 6.6, 6.2, 0, L);
      // рука с пламенем
      s += K.vol('M116 98C128 96 138 88 144 76C148 70 156 74 154 80C148 96 134 106 120 108Z', L);
      s += ellV(K, 150, 76, 7, 6, 0, L) + K.flame(150, 70, 30, 18, '#fff0a0', '#ff5a14', { style: 'animation-delay:-.3s' });
      s += collar(K, 100, 94, 22, 8, 4);
      // солнечный диск с уреем
      s += `<circle class="art-aura" cx="100" cy="18" r="20" fill="${K.rad([[0, '#fff6c2', 0.9], [0.5, '#ffb020', 0.5], [1, '#ff7a1a', 0]])}"/>` + K.vol(K.ell(100, 18, 12, 12), { c1: '#ffd23f', c2: '#dc2626', tex: false, lw: 2, line: '#7a1a08' });
      s += K.part('M96 36C94 28 96 22 100 20C104 22 106 28 104 36Z', '#22c55e', { line: '#14532d', lw: 1.3 }) + '<circle cx="100" cy="26" r="1.5" fill="#dc2626"/>';
      // львиная грива и голова
      s += K.vol(fur(100, 60, 34, 32, 16, 0.14), { c1: '#f59e0b', c2: '#9a3412', rim: '#ffe29a', texK: 0.2, line: '#4a1a06' });
      s += K.mirror(ellV(K, 74, 38, 8, 9, -20, { ...L, tex: false, lw: 2 }) + '<ellipse cx="74" cy="39" rx="3.6" ry="4.6" transform="rotate(-20 74 39)" fill="#c2672c"/>');
      s += K.vol(K.ell(100, 62, 23, 22), L);
      s += K.vol('M88 72C88 66 112 66 112 72C112 82 106 88 100 88C94 88 88 82 88 72Z', { c1: '#fff3c4', c2: '#c9934e', rim: '#ffe29a', tex: false, lw: 1.6, line: '#4a2606' });
      s += K.part('M95 70H105L100 76Z', '#7c2d12', { line: '#3b1206', lw: 1 }) + K.mouth('cat', 100, 79, 10);
      s += '<g fill="#7c2d12" opacity=".6"><circle cx="92" cy="76" r="1"/><circle cx="90" cy="80" r="1"/><circle cx="108" cy="76" r="1"/><circle cx="110" cy="80" r="1"/></g>';
      s += K.eyes(100, 59, 9, 6.4, { iris: '#dc2626', lid: 'angry', skin: '#e0a850', look: [0, 0.2] });
      s += K.mirror(K.line('M84 60L78 62', INK, 2));
      s += K.spark(24, 40, 3.2, '#fff3b0', 'art-float') + K.spark(178, 104, 2.8, '#ffd23f') + K.spark(184, 160, 2.4, '#fff3b0', 'art-float') + K.spark(20, 110, 2.4, '#ffd23f');
      return s;
    },

    // Хатхор: богиня радости и музыки выглядывает из кроны священной смоковницы. Рога коровы обнимают алый солнечный
    // диск, из-под парика торчат коровьи ушки; зелёное платье, ожерелье-менат. Из золотого кувшина поит водой
    // проросшие у корней цветы, в другой руке звенит систр
    eg_hathor(K) {
      const skin = { c1: '#f2c08a', c2: '#a8622a', rim: '#e4ffb0', tex: false, line: '#4a2408' };
      let s = K.aura('#84cc16', 100, 98, 0.45) + K.aura('#fbbf24', 60, 36, 0.3);
      // крона смоковницы
      const crown = fur(100, 52, 92, 44, 22, 0.08);
      s += K.vol(crown, { c1: '#86efac', c2: '#166534', rim: '#e4ffb0', texK: 0.3, line: '#052e16' });
      s += '<g fill="#f59e0b" stroke="#7c2d12" stroke-width=".9"><circle cx="24" cy="56" r="3.4"/><circle cx="40" cy="30" r="3.2"/><circle cx="62" cy="16" r="3"/><circle cx="140" cy="16" r="3"/><circle cx="162" cy="32" r="3.2"/><circle cx="178" cy="58" r="3.4"/><circle cx="34" cy="80" r="3"/><circle cx="168" cy="82" r="3"/></g>';
      // ствол
      s += K.vol('M84 88C86 120 82 150 74 176H126C118 150 114 120 116 88Z', { c1: '#c9934e', c2: '#5a3414', rim: '#e4ffb0', tex: false, lw: 2.2, line: '#2a1606' });
      s += K.line('M90 120Q94 140 88 166M110 120Q106 140 112 166', '#5a3414', 1.6, { op: 0.6 });
      // цветы у корней и струя воды
      s += K.line('M58 120C54 140 52 156 50 168', '#7dd3fc', 3.4, { op: 0.85 }) + K.line('M58 120C54 140 52 156 50 168', '#e0f7ff', 1.2);
      s += `<ellipse cx="48" cy="172" rx="16" ry="4" fill="#38bdf8" opacity=".6"/>` + lotus(K, 38, 176, 0.6, -10, '#f472b6') + lotus(K, 60, 176, 0.55, 10);
      // платье
      const dress = 'M84 104C84 98 92 96 100 96C108 96 116 98 116 104L120 150H80Z';
      s += K.vol(dress, { c1: '#86efac', c2: '#15803d', rim: '#e4ffb0', tex: false, lw: 2.2, line: '#052e16' });
      s += K.line('M92 100L90 150M108 100L110 150', '#fbbf24', 2.4) + K.line('M80 140H120', '#fbbf24', 2.6);
      // рука с кувшином
      s += K.vol('M84 104C72 106 62 110 56 116C52 120 58 126 62 122C68 118 76 116 86 114Z', skin);
      s += K.vol('M50 108C50 100 64 100 66 108L64 120C62 126 52 126 52 120Z', { c1: '#ffe08a', c2: '#b45309', rim: '#fff6c2', tex: false, lw: 1.8, line: '#5a3a06' }) + K.line('M52 108l-4 -6', '#5a3a06', 2.4);
      s += ellV(K, 62, 120, 6.2, 5.8, 0, skin);
      // рука с систром
      s += K.vol('M116 104C128 102 136 94 142 84C146 78 154 82 152 88C146 102 134 112 120 114Z', skin);
      s += sistrum(K, 148, 78, 1.1, 14) + ellV(K, 148, 84, 6.4, 6, 0, skin);
      s += collar(K, 100, 100, 20, 7, 3);
      s += K.line('M88 100C82 116 86 128 92 132', '#1e3a8a', 2) + `<circle cx="92" cy="133" r="3" fill="#2dd4bf" stroke="#0b1a3a" stroke-width="1"/>`;
      // рога, солнце, уши, парик
      s += `<circle class="art-aura" cx="100" cy="30" r="18" fill="${K.rad([[0, '#fff6c2', 0.8], [1, '#ffb020', 0]])}"/>` + K.vol(K.ell(100, 30, 12, 12), { c1: '#ffd23f', c2: '#dc2626', tex: false, lw: 2, line: '#7a1a08' });
      s += K.line('M80 56C66 44 70 22 84 14M120 56C134 44 130 22 116 14', '#3b2a10', 6.4) + K.line('M80 56C66 44 70 22 84 14M120 56C134 44 130 22 116 14', '#f5f5f4', 4);
      s += K.mirror(ellV(K, 72, 66, 10, 5.6, -20, { ...skin, lw: 1.8 }) + '<ellipse cx="72" cy="66" rx="5.4" ry="2.6" transform="rotate(-20 72 66)" fill="#f9a8d4"/>');
      s += stripes(K, 'M80 62C80 50 88 44 100 44C112 44 120 50 120 62L122 98L110 98L108 78H92L90 98L78 98Z', '#1e3a8a', '#0b1a3a', 3, 0, '#030712', 1.8);
      s += K.vol(K.ell(100, 70, 16, 17), skin);
      s += K.line('M84 58Q100 50 116 58', '#5a3a06', 4.4) + K.line('M84 58Q100 50 116 58', '#fbbf24', 2.4);
      s += K.eyes(100, 70, 7, 5.2, { iris: '#15803d', lash: true, look: [0, 0.2] });
      s += K.mirror(K.line('M87 71L82 72', INK, 1.8));
      s += K.mouth('smile', 100, 80, 9) + K.blush(88, 79, 3.6) + K.blush(112, 79, 3.6);
      s += K.spark(30, 110, 3, '#e4ffb0', 'art-float') + K.spark(178, 120, 2.8, '#fde68a', 'art-float') + K.spark(160, 160, 2.4, '#e4ffb0');
      return s;
    },

    // Птах: бог-мастер, покровитель ремесленников. Стоит на постаменте, спелёнутый в белый плащ с узором перьев;
    // зелёное лицо, синяя шапочка, прямая бородка; обеими руками держит тройной скипетр — уас, джед и анх.
    // По бокам парят молоток и резец, и от них сыплются искры мастерства
    eg_ptah(K) {
      const G = { c1: '#a7f3d0', c2: '#047857', rim: '#fff6b0', tex: false, line: '#022c22' };
      let s = K.aura('#facc15', 100, 100, 0.45);
      // постамент
      s += K.vol('M62 166H138L134 178H66Z', { c1: '#fde68a', c2: '#b45309', rim: '#fff6c2', tex: false, lw: 2, line: '#5a3a06' }) + K.line('M66 172H134', '#7a4a06', 1.2, { op: 0.6 });
      // молоток и резец
      s += `<g class="art-float">` + K.line('M24 112L44 92', '#3b2410', 5) + K.line('M24 112L44 92', '#c9934e', 3) + K.vol('M36 84L52 100L46 106L30 90Z', { c1: '#cbd5e1', c2: '#475569', rim: '#fff6b0', tex: false, lw: 1.8, line: '#1e293b' }) + '</g>';
      s += `<g class="art-float" style="animation-delay:-1.1s">` + K.line('M176 112L160 88', '#3b2410', 5) + K.line('M176 112L160 88', '#c9934e', 3) + K.part('M158 90L152 76L162 82Z', '#e2e8f0', { line: '#1e293b', lw: 1.4 }) + '</g>';
      s += K.line('M40 72l5 4-3 2 5 4M154 64l5 4-3 2 5 4', '#facc15', 2, { cls: 'art-blink' }) + K.spark(48, 64, 3.4, '#fffbe6') + K.spark(150, 58, 3, '#fef08a');
      // спелёнутое тело в плаще с перьями
      const body = 'M100 82C118 82 126 94 126 110L122 156C121 164 114 168 100 168C86 168 79 164 78 156L74 110C74 94 82 82 100 82Z';
      s += K.vol(body, { c1: '#ffffff', c2: '#c7d2c4', rim: '#fff6b0', tex: false, lw: 2.4, line: '#1f2a1e' });
      let fe = '';
      for (let y = 112; y < 172; y += 9) for (let x = 72 + ((y - 112) / 9 % 2) * 5; x < 130; x += 10) fe += `M${x - 4} ${y}Q${x} ${y + 6} ${x + 4} ${y}`;
      s += clip(K, body, K.line(fe, '#10b981', 1.4, { op: 0.65 }));
      // голова: шапочка, бородка
      s += collar(K, 100, 84, 22, 7, 3);
      s += stripes(K, 'M95 72H105L106 90Q100 96 94 90Z', '#1d4ed8', '#fbbf24', 3, 0, '#0b1a3a', 1.4);
      // тройной скипетр: уас, джед и анх
      const sh = 'M100 162V89';
      s += K.line(sh, '#5a3a06', 6.4) + K.line(sh, '#fbbf24', 3.6) + K.line('M100 162l-5 6M100 162l5 6', '#5a3a06', 3);
      s += K.vol('M92 113H108V131H92Z', { c1: '#93c5fd', c2: '#1d4ed8', rim: '#fff6b0', tex: false, lw: 1.6, line: '#0b1a3a' }) + K.line('M90 115H110M90 119.4H110M90 123.8H110', '#fbbf24', 2.2);
      s += ankh(K, 100, 99, 0.9);
      s += K.line('M100 87V82L107 79L105 75', '#5a3a06', 5) + K.line('M100 87V82L107 79L105 75', '#fbbf24', 2.8);
      // руки на скипетре
      s += ellV(K, 91, 139, 7.4, 6.6, 0, G) + ellV(K, 109, 139, 7.4, 6.6, 0, G) + K.line('M86 136h10M104 136h10', '#022c22', 1.2, { op: 0.5 });
      s += K.vol(K.ell(100, 58, 17, 18), G);
      s += K.vol('M82 56C82 42 90 36 100 36C110 36 118 42 118 56C112 50 88 50 82 56Z', { c1: '#60a5fa', c2: '#1e3a8a', rim: '#fff6b0', tex: false, lw: 2, line: '#0b1a3a' });
      s += K.eyes(100, 60, 7, 5, { iris: '#1d4ed8', lid: 'half', skin: '#6ee7b7', look: [0, 0.2] });
      s += K.mirror(K.line('M87 61L82 62', INK, 1.8));
      s += K.mouth('smile', 100, 69, 7);
      s += K.spark(24, 30, 3, '#fef08a', 'art-float') + K.spark(178, 30, 2.8, '#fffbe6', 'art-float') + K.spark(20, 150, 2.4, '#fef08a') + K.spark(184, 150, 2.4, '#fffbe6');
      return s;
    },

    // Нефтида: сестра Исиды, владычица сумерек и «госпожа дома» — на голове её знак: дом с корзиной наверху.
    // Тёмное лиловое платье, сложенные за спиной крылья коршуна с золотыми кончиками; в руках масляная лампа —
    // каждый вечер она первой зажигает окна в домах, что дремлют внизу
    eg_neftida(K) {
      const skin = { c1: '#f2c08a', c2: '#a8622a', rim: '#e9d5ff', tex: false, line: '#4a2408' };
      let s = K.aura('#8b5cf6', 100, 102, 0.45);
      s += moon(K, 166, 26, 10);
      // дома с окнами
      const house = (x, w, h, d) => K.vol(`M${x} 178V${178 - h}L${x + w / 2} ${170 - h}L${x + w} ${178 - h}V178Z`, { c1: '#6b5b8a', c2: '#2a1f40', rim: '#e9d5ff', tex: false, lw: 1.6, line: '#120c20' }) +
        `<rect class="art-blink" style="animation-delay:-${d}s" x="${x + w / 2 - 4}" y="${178 - h + 6}" width="8" height="8" fill="#fde68a" stroke="#120c20" stroke-width="1"/>`;
      s += house(8, 26, 30, 0) + house(30, 22, 20, 0.6) + house(150, 24, 26, 0.3) + house(170, 24, 36, 0.9);
      // сложенные крылья коршуна
      const W = 'M86 96C66 100 56 120 58 150C60 160 66 166 72 168C74 146 80 120 92 104Z';
      const wing = K.vol(W, { c1: '#a78bfa', c2: '#2e1065', rim: '#e9d5ff', tex: false, lw: 2, line: '#12051f' }) + K.line('M80 110C70 124 66 140 66 160M86 112C78 128 74 144 74 162', '#c4b5fd', 1.3, { op: 0.6 }) + K.line('M60 150L62 164M66 156L68 166', '#fbbf24', 2.4);
      s += wing + `<g transform="translate(200 0) scale(-1 1)">${wing}</g>`;
      // ноги и платье
      s += K.mirror(K.vol('M86 162H96V174H86Z', skin) + K.part('M82 174H100Q101 179 96 179H84Q80 179 82 174Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }));
      const dress = 'M84 98C84 92 92 90 100 90C108 90 116 92 116 98L124 160C126 168 118 170 100 170C82 170 74 168 76 160Z';
      s += K.vol(dress, { c1: '#a78bfa', c2: '#3b0764', rim: '#e9d5ff', tex: false, lw: 2.2, line: '#12051f' });
      s += clip(K, dress, K.line('M60 128H140M60 150H140', '#fbbf24', 2.2) + K.stitch('M60 139H140', '#fde68a', 1.6));
      // руки с лампой
      s += K.vol('M84 98C76 104 74 114 78 122C82 126 88 124 88 118C86 112 88 106 92 104Z', skin) + K.vol('M116 98C124 104 126 114 122 122C118 126 112 124 112 118C114 112 112 106 108 104Z', skin);
      s += K.vol('M80 124C84 132 116 132 120 124C120 134 110 140 100 140C90 140 80 134 80 124Z', { c1: '#ffe08a', c2: '#b45309', rim: '#fff6c2', tex: false, lw: 2, line: '#5a3a06' }) + K.line('M120 126L130 122', '#5a3a06', 4) + K.line('M120 126L130 122', '#fbbf24', 2.2);
      s += `<circle class="art-aura" cx="131" cy="114" r="14" fill="${K.rad([[0, '#fff6c2', 0.9], [1, '#fbbf24', 0]])}"/>` + K.flame(131, 122, 18, 11, '#fff0a0', '#ff7a1a');
      s += ellV(K, 84, 124, 6, 5.6, 0, skin) + ellV(K, 116, 124, 6, 5.6, 0, skin);
      s += collar(K, 100, 96, 20, 7, 3);
      // парик, лицо и знак на голове
      s += stripes(K, 'M80 64C80 50 88 42 100 42C112 42 120 50 120 64L122 100L110 100L108 80H92L90 100L78 100Z', '#1e1b4b', '#312e81', 3, 0, '#0b0a1f', 1.8);
      s += K.vol(K.ell(100, 68, 15, 17), skin);
      s += K.line('M84 54Q100 46 116 54', '#5a3a06', 4.4) + K.line('M84 54Q100 46 116 54', '#fbbf24', 2.4);
      s += K.eyes(100, 69, 6.8, 5, { iris: '#7c3aed', lid: 'half', skin: '#e9ac72', look: [0, 0.3] });
      s += K.mirror(K.line('M87 70L82 71', INK, 1.8));
      s += K.mouth('smile', 100, 79, 8) + K.blush(89, 78, 3.4) + K.blush(111, 78, 3.4);
      s += K.vol('M86 46V26H114V46Z', { c1: '#c4b5fd', c2: '#5b21b6', rim: '#e9d5ff', tex: false, lw: 2, line: '#1e0b36' }) + K.part('M92 46V32H108V46Z', '#2e1065', { flat: true, line: '#1e0b36', lw: 1.2 });
      s += K.vol('M84 26C84 14 116 14 116 26Z', { c1: '#fde68a', c2: '#b45309', rim: '#fff6c2', tex: false, lw: 2, line: '#5a3a06' }) + K.line('M90 22H110', '#7a4a06', 1.2, { op: 0.6 });
      s += K.spark(24, 30, 3, '#e9d5ff', 'art-float') + K.spark(140, 14, 2.6, '#fde68a') + K.spark(184, 80, 2.4, '#e9d5ff', 'art-float') + K.spark(18, 100, 2.4, '#fde68a');
      return s;
    },

    // Маат: богиня истины и порядка преклонила колени и распахнула разноцветные крылья, будто укрывает весь мир.
    // На голове лента и высокое страусиное перо — то самое, что кладут на весы против сердца; в руке анх;
    // за спиной расходятся лучи ровного, справедливого света
    eg_maat(K) {
      const skin = { c1: '#f2c08a', c2: '#a8622a', rim: '#fff6b0', tex: false, line: '#4a2408' };
      let s = K.aura('#facc15', 100, 104, 0.45) + K.aura('#ffffff', 50, 40, 0.3);
      // лучи справедливого света
      let d = '';
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, w = 0.06; d += `M${P(100, 70, 30, a - w)}L${P(100, 70, i % 2 ? 66 : 82, a)}L${P(100, 70, 30, a + w)}Z`; }
      s += `<g class="art-spin-soft"><path d="${d}" fill="#fef9c3" stroke="#eab308" stroke-width=".8" opacity=".55"/></g>`;
      // крылья
      const W = 'M84 98C64 90 34 90 6 98Q10 104 16 106Q10 112 12 122Q20 122 24 126Q20 134 26 140Q32 138 38 142Q38 150 46 154C58 144 72 130 86 118Z';
      s += K.mirror(`<g class="art-wing">${ewing(K, W, 84, 104, 26, 52, ['#fbbf24', '#ef4444', '#2dd4bf'], 150, 198, 9)}</g>`);
      // руки вдоль крыльев
      s += K.mirror(K.line('M84 98C64 92 38 90 16 96', '#4a2408', 7.4) + K.line('M84 98C64 92 38 90 16 96', '#e7a86a', 4.6) + K.line('M40 91l2 6', '#fbbf24', 3) + K.part(K.ell(14, 96, 4.6, 4.2), '#e7a86a', { line: '#4a2408', lw: 1.6 }));
      s += ankh(K, 12, 114, 1);
      // коленопреклонённое тело
      s += K.vol('M100 120C126 120 140 140 140 160C140 172 128 178 100 178C72 178 60 172 60 160C60 140 74 120 100 120Z', { c1: '#ffffff', c2: '#d6c9a8', rim: '#fff6b0', tex: false, lw: 2.2, line: '#4a3a1a' });
      s += K.line('M70 150Q100 160 130 150M66 164Q100 174 134 164', '#c9b894', 1.4) + K.line('M100 126V178', '#ef4444', 3) + K.stitch('M100 128V176', '#fde68a', 1.4);
      s += K.vol('M84 98C84 92 92 90 100 90C108 90 116 92 116 98L118 128H82Z', { c1: '#ffffff', c2: '#d6c9a8', rim: '#fff6b0', tex: false, lw: 2.2, line: '#4a3a1a' });
      s += K.line('M84 124H116', '#5a3a06', 4.6) + K.line('M84 124H116', '#fbbf24', 2.6);
      s += collar(K, 100, 96, 20, 7, 4);
      // высокое страусиное перо на голове
      s += plume(K, 104, 50, 46, 15, 6, '#ffffff', '#94a3b8', '#334155');
      // парик и лицо
      s += stripes(K, 'M80 64C80 50 88 42 100 42C112 42 120 50 120 64L122 98L110 98L108 78H92L90 98L78 98Z', '#111827', '#1f2937', 3, 0, '#030712', 1.8);
      s += K.vol(K.ell(100, 68, 15, 17), skin);
      s += K.line('M82 54Q100 46 118 54', '#7f1d1d', 4.6) + K.line('M82 54Q100 46 118 54', '#ef4444', 2.6) + K.line('M118 54L124 66', '#ef4444', 2.4);
      s += K.eyes(100, 69, 6.8, 5, { iris: '#0e7490', lash: true, look: [0, 0.2] });
      s += K.mirror(K.line('M87 70L82 71', INK, 1.8));
      s += K.mouth('smile', 100, 79, 8) + K.blush(89, 78, 3.4) + K.blush(111, 78, 3.4);
      s += K.spark(30, 30, 3.2, '#fef08a', 'art-float') + K.spark(170, 30, 3.2, '#fffbe6', 'art-float') + K.spark(184, 160, 2.6, '#fef08a') + K.spark(16, 160, 2.6, '#fffbe6');
      return s;
    },

    // Сет: буйный бог пустынь и бурь с головой загадочного зверя — длинная изогнутая морда, высокие уши с плоскими
    // кончиками, раздвоенный хвост. Стоит на бархане посреди песчаного вихря и копьём отгоняет Апопа: тот высунулся
    // из песка и ошарашенно таращит глаза
    eg_set(K) {
      const sk = { c1: '#f6b090', c2: '#8f2a14', rim: '#eef0ff', texK: 0.15, line: '#3b0f06' };
      let s = K.aura('#a5b4fc', 98, 104, 0.42) + K.aura('#f59e0b', 70, 150, 0.3);
      // песчаный вихрь
      s += `<g class="art-spin-soft">` + K.line('M30 60C10 80 18 120 50 128M170 50C192 74 186 116 156 130M60 24C90 8 130 10 150 28', '#fcd34d', 2.4, { op: 0.6 }) + '</g>';
      let g = '';
      for (let i = 0; i < 10; i++) { const a = i * 36 * Math.PI / 180; g += `<circle cx="${r1(100 + 86 * Math.cos(a))}" cy="${r1(90 + 60 * Math.sin(a))}" r="${i % 3 ? 1.6 : 2.6}" fill="#fcd34d" stroke="#b45309" stroke-width=".6"/>`; }
      s += `<g class="art-spin-soft" style="animation-delay:-1s">${g}</g>`;
      // бархан
      s += K.vol('M40 178C70 160 120 156 160 162C176 166 188 172 196 178Z', { c1: '#f6dfa4', c2: '#a8742c', rim: '#eef0ff', tex: false, lw: 2, line: '#4a2c0a' });
      // Апоп из песка
      s += K.line('M8 178C10 164 22 156 34 160', '#12051f', 13) + K.line('M8 178C10 164 22 156 34 160', '#7c3aed', 8.4) + `<path d="M8 178C10 164 22 156 34 160" fill="none" stroke="#f0abfc" stroke-width="2" stroke-dasharray="2 6" opacity=".8"/>`;
      s += K.vol('M28 152C36 142 54 144 56 156C58 166 48 172 38 170C30 168 24 160 28 152Z', { c1: '#8b5cf6', c2: '#2e1065', rim: '#e9d5ff', tex: false, lw: 2, line: '#12051f' });
      s += K.eye(38, 154, 4.2, { iris: '#facc15', look: [0.4, -0.3] }) + K.eye(48, 152, 4.6, { iris: '#facc15', look: [0.4, -0.3] }) + K.mouth('o', 46, 160, 10);
      // раздвоенный хвост
      s += K.line('M118 132C140 128 156 116 164 98', '#3b0f06', 7) + K.line('M118 132C140 128 156 116 164 98', '#e2856a', 4) + K.line('M164 98L160 86M164 98L174 90', '#3b0f06', 5) + K.line('M164 98L160 86M164 98L174 90', '#e2856a', 2.6);
      // ноги в широкой стойке
      s += K.vol('M84 146L72 170H86L94 148Z', { ...sk, tex: false, lw: 2 }) + K.vol('M108 148L118 170H132L118 146Z', { ...sk, tex: false, lw: 2 });
      s += K.part('M66 170H88Q89 176 84 176H68Q64 176 66 170Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }) + K.part('M114 170H136Q137 176 132 176H116Q112 176 114 170Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 });
      // схенти
      s += K.vol('M80 120H120L128 150Q100 156 72 150Z', { c1: '#ffffff', c2: '#d6c9a8', rim: '#eef0ff', tex: false, lw: 2.2, line: '#4a3a1a' });
      s += stripes(K, 'M92 124H108L111 154H89Z', '#dc2626', '#fbbf24', 3.4, 0, '#5a1a06', 1.6);
      s += K.line('M80 122H120', '#5a3a06', 5) + K.line('M80 122H120', '#fbbf24', 3);
      // торс
      s += K.vol('M78 92C78 84 88 82 100 82C112 82 122 84 122 92C124 104 120 116 116 122H84C80 116 76 104 78 92Z', sk);
      // копьё
      s += K.line('M150 74L60 146', '#3b2410', 5.6) + K.line('M150 74L60 146', '#c9934e', 3.2) + K.part('M64 142L50 156L56 138Z', '#e2e8f0', { line: '#1e293b', lw: 1.6 });
      // руки на копье
      s += K.vol('M80 92C70 98 66 110 70 120C74 126 82 124 82 118C80 110 82 104 88 100Z', { ...sk, tex: false, lw: 2.2 }) + ellV(K, 76, 122, 6.6, 6.2, 0, { ...sk, tex: false, lw: 2 });
      s += K.vol('M120 92C130 94 138 92 142 84C146 78 154 82 150 88C146 98 134 104 120 104Z', { ...sk, tex: false, lw: 2.2 }) + ellV(K, 144, 82, 6.6, 6.2, 0, { ...sk, tex: false, lw: 2 });
      s += K.line('M76 116l4 4M140 80l4 4', '#fbbf24', 3) + collar(K, 100, 88, 22, 8, 3);
      // голова зверя Сета
      s += K.vol('M84 40L80 10H94L92 40Z', { ...sk, tex: false, lw: 2 }) + K.vol('M108 40L106 10H120L116 40Z', { ...sk, tex: false, lw: 2 });
      s += K.part('M82 14H92V22H83Z M108 14H118L117 22H108Z', '#5a1a06', { flat: true, lw: 0 });
      s += K.vol(K.ell(100, 54, 20, 18), sk);
      s += K.vol('M86 58C78 60 66 70 60 82C58 86 62 88 66 86C72 78 82 70 92 68Z', sk);
      s += `<ellipse cx="62" cy="84" rx="2" ry="1.4" fill="${INK}"/>` + K.line('M70 82Q76 78 84 76', INK, 2);
      s += `<g class="art-eyes">${K.eye(96, 52, 6.4, { iris: '#dc2626', lid: 'angry', skin: '#d9775a', look: [-0.6, 0.4] })}${K.eye(110, 52, 5.6, { iris: '#dc2626', lid: 'angry', skin: '#d9775a', look: [-0.6, 0.4] })}</g>`;
      s += K.spark(184, 30, 3, '#eef0ff', 'art-float') + K.spark(20, 40, 2.8, '#fde68a') + K.spark(186, 150, 2.4, '#eef0ff', 'art-float');
      return s;
    },

    // Хнум: бог-гончар с головой барана — длинные волнистые рога расходятся в стороны, бородка заплетена.
    // Сидит за гончарным кругом и лепит из глины барашка — тот как раз открыл глаза; рядом кувшин с водой истоков Нила
    eg_hnum(K) {
      const skin = { c1: '#d9935a', c2: '#7c3a12', rim: '#e4ffb0', tex: false, line: '#3b1606' };
      const wool = { c1: '#f6ead2', c2: '#9a7a52', rim: '#e4ffb0', texK: 0.15, line: '#3b2a14' };
      const clay = { c1: '#fff4e6', c2: '#c98a5a', rim: '#ffffff', tex: false, line: '#6b3410' };
      let s = K.aura('#84cc16', 100, 100, 0.45);
      // кувшин с водой Нила
      s += K.vol('M154 140C154 128 176 128 176 140L174 170C172 178 158 178 156 170Z', { c1: '#93c5fd', c2: '#1d4ed8', rim: '#e4ffb0', tex: false, lw: 2, line: '#0b1a3a' });
      s += K.line('M158 148Q165 152 172 148', '#fbbf24', 2) + drop(166, 122, 3, '#bfeaff', 'art-float', 0.3) + drop(176, 110, 2.4, '#bfeaff', 'art-float', 1);
      // тело
      s += K.vol('M78 96C78 88 88 86 100 86C112 86 122 88 122 96C124 110 122 124 120 134H80C78 124 76 110 78 96Z', skin);
      s += K.vol('M74 130H126L132 166Q100 172 68 166Z', { c1: '#ffffff', c2: '#d6c9a8', rim: '#e4ffb0', tex: false, lw: 2.2, line: '#4a3a1a' });
      s += K.line('M74 132H126', '#5a3a06', 4.6) + K.line('M74 132H126', '#fbbf24', 2.6);
      s += collar(K, 100, 92, 24, 8, 4);
      // гончарный круг
      s += K.vol('M86 158H114L110 176H90Z', { c1: '#c9934e', c2: '#5a3414', rim: '#e4ffb0', tex: false, lw: 2, line: '#2a1606' });
      s += `<g class="art-spin-soft">` + K.vol(K.ell(100, 150, 40, 10), { c1: '#d9a560', c2: '#6b3f14', rim: '#e4ffb0', tex: false, lw: 2.2, line: '#2a1606' }) + K.line('M66 150Q100 158 134 150', '#4a2c0a', 1.2, { op: 0.6 }) + '</g>';
      // руки лепят
      s += K.vol('M80 98C70 108 68 124 72 138C76 144 84 142 84 136C80 126 82 112 88 104Z', skin) + ellV(K, 78, 140, 6.6, 6, 0, skin);
      s += K.vol('M120 98C130 108 132 124 128 138C124 144 116 142 116 136C120 126 118 112 112 104Z', skin) + ellV(K, 122, 140, 6.6, 6, 0, skin);
      // глиняный барашек на круге
      s += K.line('M92 140v8M106 140v8', '#6b3410', 2.6);
      s += K.vol(fur(99, 134, 15, 10.5, 10, 0.18), clay);
      s += K.vol(K.ell(113, 126, 7.6, 7), clay) + K.line('M108 121l-4 -3', '#c98a5a', 2);
      s += K.eye(115, 125, 3, { iris: '#7c2d12', look: [0.4, 0] }) + K.spark(124, 112, 3.6, '#fff6c2');
      // длинные волнистые рога
      const horn = 'M90 50C76 48 66 56 56 50C46 44 38 52 26 46';
      s += K.mirror(K.line(horn, '#3b2a14', 9) + K.line(horn, '#e7d3b5', 5.4) + K.line('M84 49l-2 3M70 53l-2 3M56 50l-2 3M42 49l-2 3', '#9a7a52', 1.4));
      // голова барана
      s += K.vol('M100 34C114 34 120 44 120 56C120 70 112 82 104 88C102 90 98 90 96 88C88 82 80 70 80 56C80 44 86 34 100 34Z', wool);
      s += stripes(K, 'M95 86H105L106 102Q100 108 94 102Z', '#1e3a8a', '#fbbf24', 3, 0, '#0b1a3a', 1.4);
      s += K.vol('M92 76C92 72 108 72 108 76C108 84 104 90 100 90C96 90 92 84 92 76Z', { c1: '#fff4e0', c2: '#b8956a', rim: '#e4ffb0', tex: false, lw: 1.6, line: '#3b2a14' });
      s += '<ellipse cx="97" cy="80" rx="1.6" ry="1.2" fill="#3b2a14"/><ellipse cx="103" cy="80" rx="1.6" ry="1.2" fill="#3b2a14"/>';
      s += K.mirror(K.line('M86 46C80 42 74 46 76 52C78 58 86 58 86 52', '#3b2a14', 4.6) + K.line('M86 46C80 42 74 46 76 52C78 58 86 58 86 52', '#d9c4a0', 2.4));
      s += K.eyes(100, 60, 7.6, 5.4, { iris: '#a16207', lid: 'half', skin: '#e9dcc2', look: [0, 0.4] });
      s += K.line('M95 86Q100 89 105 86', INK, 1.8);
      // солнечный диск
      s += `<circle class="art-aura" cx="100" cy="22" r="15" fill="${K.rad([[0, '#fff6c2', 0.8], [1, '#ffb020', 0]])}"/>` + K.vol(K.ell(100, 22, 9, 9), { c1: '#ffd23f', c2: '#dc2626', tex: false, lw: 1.8, line: '#7a1a08' });
      s += K.spark(30, 100, 3, '#e4ffb0', 'art-float') + K.spark(170, 70, 2.8, '#fde68a') + K.spark(24, 150, 2.4, '#e4ffb0') + K.spark(150, 20, 2.4, '#fde68a', 'art-float');
      return s;
    },

    // Хапи: добродушный толстяк, бог разлива Нила — голубая кожа, круглый живот, на голове пучок папируса, бородка.
    // Стоит по колено в реке и щедро льёт воду из двух кувшинов; там, куда падают струи, зеленеют ростки,
    // из воды выпрыгивает рыбка
    eg_hapi(K) {
      const B = { c1: '#a5e3fc', c2: '#0369a1', rim: '#c8f3ff', texK: 0.16, line: '#062a4a' };
      const jar = { c1: '#ffe08a', c2: '#b45309', rim: '#fff6c2', tex: false, lw: 2, line: '#5a3a06' };
      let s = K.aura('#38bdf8', 100, 104, 0.45);
      // пучок папируса на голове
      for (const [a, h] of [[-38, 34], [-18, 40], [0, 44], [18, 40], [38, 34]]) {
        const t = (a - 90) * Math.PI / 180, x2 = r1(100 + h * Math.cos(t)), y2 = r1(52 + h * Math.sin(t));
        s += K.line(`M100 52L${x2} ${y2}`, '#14532d', 4) + K.line(`M100 52L${x2} ${y2}`, '#4ade80', 2.2) + K.part(`M${x2} ${y2}l-7 -9q7 -5 14 0z`, '#4ade80', { line: '#14532d', lw: 1.4 });
      }
      // струи воды
      s += K.line('M30 92C22 112 22 136 26 160M170 92C178 112 178 136 174 160', '#7dd3fc', 5, { op: 0.8 }) + K.line('M30 92C22 112 22 136 26 160M170 92C178 112 178 136 174 160', '#e0f7ff', 1.6);
      // тело с круглым животом
      s += K.vol(K.ell(100, 126, 38, 36), B);
      s += `<ellipse cx="100" cy="134" rx="22" ry="20" fill="${K.rad([[0, '#e0f7ff', 0.5], [1, '#e0f7ff', 0]])}"/>` + `<circle cx="100" cy="134" r="2.2" fill="#0369a1"/>`;
      s += K.part('M64 146Q100 158 136 146L134 154Q100 166 66 154Z', '#4ade80', { line: '#14532d', lw: 1.6 }) + K.part('M96 154L90 170L100 164L110 170L104 154Z', '#4ade80', { line: '#14532d', lw: 1.4 });
      s += K.line('M70 108Q100 116 130 108', '#0369a1', 1.4, { op: 0.5 });
      // руки с кувшинами
      s += K.vol('M68 108C56 104 46 98 40 90C36 84 44 80 48 86C52 92 60 96 70 98Z', { ...B, tex: false, lw: 2.2 }) + K.vol('M132 108C144 104 154 98 160 90C164 84 156 80 152 86C148 92 140 96 130 98Z', { ...B, tex: false, lw: 2.2 });
      s += `<g transform="rotate(-50 34 82)">${K.vol('M24 78C24 70 44 70 44 78L42 92C40 98 28 98 26 92Z', jar)}${K.line('M26 82Q34 86 42 82', '#1d4ed8', 2)}</g>`;
      s += `<g transform="rotate(50 166 82)">${K.vol('M156 78C156 70 176 70 176 78L174 92C172 98 160 98 158 92Z', jar)}${K.line('M158 82Q166 86 174 82', '#1d4ed8', 2)}</g>`;
      s += ellV(K, 46, 88, 6.4, 6, 0, { ...B, tex: false, lw: 2 }) + ellV(K, 154, 88, 6.4, 6, 0, { ...B, tex: false, lw: 2 });
      // голова
      s += K.vol(K.ell(100, 72, 22, 21), B);
      s += stripes(K, 'M94 90H106L107 104Q100 110 93 104Z', '#1e3a8a', '#fbbf24', 3, 0, '#0b1a3a', 1.4);
      s += K.eyes(100, 70, 8.4, 6.6, { iris: '#0e7490', look: [0, 0.2] });
      s += K.mouth('smile', 100, 82, 11) + K.blush(84, 80, 4.6) + K.blush(116, 80, 4.6);
      // река, ростки и рыбка
      s += nile(K, 162, 0.9);
      s += K.leaf(26, 160, 14, -110, '#84cc16') + K.leaf(28, 160, 12, -70, '#65a30d') + K.leaf(174, 160, 14, -70, '#84cc16') + K.leaf(172, 160, 12, -110, '#65a30d');
      s += `<g class="art-float" style="animation-delay:-.7s">` + K.vol('M120 168C126 160 140 158 146 164C140 170 126 172 120 168Z', { c1: '#fde68a', c2: '#c2410c', rim: '#fff6c2', tex: false, lw: 1.6, line: '#5a2a06' }) + K.part('M146 164L154 158L153 170Z', '#fb923c', { line: '#5a2a06', lw: 1.2 }) + `<circle cx="126" cy="164" r="1.4" fill="${INK}"/>` + '</g>';
      s += K.spark(60, 36, 3, '#e0f7ff', 'art-float') + K.spark(140, 36, 2.8, '#e0f7ff') + K.spark(14, 60, 2.4, '#e0f7ff', 'art-float') + K.spark(186, 56, 2.4, '#e0f7ff');
      return s;
    },

    // Нут: богиня неба выгнулась аркой над спящим городом — ладони касаются земли с одной стороны, ступни с другой.
    // Её тёмно-синее тело усыпано звёздами, длинные волосы свесились вниз; у губ — маленькое вечернее солнце,
    // которое она вот-вот проглотит, чтобы утром родить заново
    eg_nut(K) {
      const N = { c1: '#5b67e0', c2: '#1a1650', rim: '#c4b5fd', texK: 0.8, line: '#0b0a1f', hiK: 0.12 };
      let s = K.aura('#6366f1', 100, 100, 0.45);
      // спящий город под аркой
      let city = '';
      for (const [x, w, h] of [[62, 12, 26], [74, 10, 40], [84, 14, 30], [98, 10, 50], [108, 14, 34], [122, 10, 44], [132, 12, 24]]) city += `M${x} 178V${178 - h}H${x + w}V178Z`;
      s += K.part(city, '#312e81', { flat: true, line: '#0b0a1f', lw: 1.4 });
      let win = '';
      [[66, 160], [77, 146], [78, 160], [88, 156], [101, 136], [101, 150], [112, 152], [125, 142], [125, 158], [135, 164]].forEach(([x, y], i) => { win += `<rect class="art-blink" style="animation-delay:-${r1(i * 0.37)}s" x="${x}" y="${y}" width="4" height="4" fill="#fde68a"/>`; });
      s += win;
      // тело-арка со звёздами
      const arch = 'M20 178C20 70 60 18 100 18C140 18 180 70 180 178H150C150 92 128 50 100 50C72 50 50 92 50 178Z';
      s += K.vol(arch, N);
      let st = '';
      for (let i = 0; i < 26; i++) { const t = i / 25, a = Math.PI * (1 - t), r = 65 + ((i * 7) % 5) * 2.4, x = r1(100 + r * Math.cos(a) * 1.0), y = r1(170 - Math.max(0, (r * 1.9) * Math.sin(a))); if (y > 172) continue; st += `<circle cx="${x}" cy="${Math.max(24, y)}" r="${i % 3 ? 1.3 : 2}" fill="#fde68a"/>`; }
      s += clip(K, arch, st + K.line('M34 150C34 90 66 40 100 36C134 40 166 90 166 150', '#c7d2fe', 1.4, { op: 0.4 }));
      s += K.spark(70, 40, 4, '#fde68a') + K.spark(132, 34, 3.6, '#fffbe6') + K.spark(164, 96, 3.4, '#fde68a') + K.spark(34, 110, 3.4, '#fffbe6');
      // ладони и ступни
      s += K.vol('M20 170C18 176 22 180 30 179H48C52 176 50 170 46 168Z', { ...N, texK: 0.3, lw: 2 }) + K.line('M28 179v-5M34 179v-6M40 179v-5', '#0b0a1f', 1.2);
      s += K.vol('M152 168C150 174 152 180 160 180H182C186 176 182 170 178 168Z', { ...N, texK: 0.3, lw: 2 });
      // волосы и голова у левого края
      s += K.vol('M52 70C40 94 42 126 50 150C55 140 58 126 62 116C64 134 70 144 78 150C78 124 82 100 80 80Z', { c1: '#4c4a8a', c2: '#0b0a1f', rim: '#e9d5ff', tex: false, lw: 2, line: '#05040f' });
      s += K.vol(K.ell(74, 94, 21, 22), { c1: '#dbe1ff', c2: '#5b5fd0', rim: '#e9d5ff', tex: false, line: '#0b0a1f' });
      s += K.line('M56 80Q72 70 92 80', '#fbbf24', 3);
      s += K.eyes(76, 96, 8, 6, { iris: '#7c3aed', lid: 'half', skin: '#b4bdfa', look: [0.6, 0.5] });
      s += K.mouth('o', 79, 106, 9) + K.blush(60, 104, 4) + K.blush(94, 104, 4);
      // вечернее солнце у губ
      s += `<circle class="art-aura" cx="100" cy="122" r="13" fill="${K.rad([[0, '#fff6c2', 0.9], [1, '#ffb020', 0]])}"/>` + K.vol(K.ell(100, 122, 6.6, 6.6), { c1: '#ffd23f', c2: '#f97316', tex: false, lw: 1.4, line: '#9a3412' });
      s += K.spark(18, 40, 3, '#e9d5ff', 'art-float') + K.spark(186, 40, 2.8, '#fde68a', 'art-float') + K.spark(100, 6, 2.6, '#e9d5ff');
      return s;
    },

    // Геб: бог земли прилёг на бок, подперев голову, — колено поднято холмом, на спине и бедре растут травы и деревца,
    // на голове стоит его гусь. Изо всех сил старается не хохотать: щёки надуты, рот зажат ладонью, а земля
    // вокруг уже подрагивает
    eg_geb(K) {
      const G = { c1: '#9ae6a8', c2: '#166534', rim: '#e4ffb0', texK: 0.25, line: '#052e16' };
      let s = K.aura('#84cc16', 100, 112, 0.42);
      // дрожь земли
      s += K.line('M8 178l4 -4 4 4 4 -4 4 4M176 178l4 -4 4 4 4 -4 4 4', '#a16207', 2, { cls: 'art-blink' }) + K.line('M18 150q-4 -4 0 -8M186 140q4 -4 0 -8', '#e4ffb0', 2, { op: 0.7 });
      // дальняя нога вдоль земли
      s += K.vol('M136 148C156 152 176 160 190 166C194 170 192 176 186 176C168 176 150 172 134 168Z', { ...G, texK: 0.15 });
      // поднятое колено-холм
      s += K.vol('M128 128C140 110 156 98 166 100C176 102 178 116 176 130L172 170C172 176 162 178 158 172L150 140C146 146 138 148 130 146Z', G);
      s += K.leaf(160, 100, 14, -120, '#65a30d') + K.leaf(164, 100, 12, -70, '#84cc16') + `<circle cx="168" cy="112" r="3.4" fill="#f472b6" stroke="#9d174d" stroke-width="1"/><circle cx="168" cy="112" r="1.2" fill="#fde68a"/>`;
      // туловище
      const body = 'M60 122C70 108 120 108 140 118C152 124 154 146 140 156C120 166 74 166 60 156C52 148 52 132 60 122Z';
      s += K.vol(body, G);
      s += K.vol('M120 126C134 124 150 132 150 146C150 158 138 164 124 160L118 132Z', { c1: '#ffffff', c2: '#d6c9a8', rim: '#e4ffb0', tex: false, lw: 2, line: '#4a3a1a' });
      // деревца и травы на спине
      for (const [x, y, r] of [[82, 112, 9], [104, 110, 11], [126, 116, 8]]) s += K.line(`M${x} ${y + 4}V${y - 8}`, '#5a3414', 3) + K.vol(K.ell(x, y - 14, r, r * 0.9), { c1: '#86efac', c2: '#15803d', rim: '#e4ffb0', texK: 0.3, lw: 1.6, line: '#052e16' });
      s += K.line('M70 116l-2 -6M74 114l1 -6M94 112l-2 -5M114 112l2 -5', '#4ade80', 1.8);
      // рука-опора
      s += K.vol('M64 128C52 136 44 150 42 166C42 174 52 176 54 170C56 158 62 146 72 138Z', { ...G, texK: 0.15 });
      // голова
      s += stripes(K, 'M24 92C24 72 36 62 52 62C68 62 78 72 78 90L80 118L68 118L66 100H38L36 118L24 118Z', '#1e3a8a', '#fbbf24', 3, 0, '#0b1a3a', 1.6);
      s += K.vol(K.ell(51, 98, 20, 21), G);
      s += stripes(K, 'M46 116H56L57 132Q51 138 45 132Z', '#1e3a8a', '#fbbf24', 3, 0, '#0b1a3a', 1.4);
      s += K.closed(51, 94, 8, 5.4, true) + K.line('M36 88l5 2M66 88l-5 2', INK, 1.6);
      s += `<ellipse cx="37" cy="104" rx="7" ry="5.6" fill="#ff7aa8" opacity=".5"/><ellipse cx="65" cy="104" rx="7" ry="5.6" fill="#ff7aa8" opacity=".5"/>`;
      // ладонь зажимает рот
      s += K.line('M68 134C62 126 58 118 56 112', '#052e16', 11) + K.line('M68 134C62 126 58 118 56 112', '#7fd696', 7);
      s += ellV(K, 52, 109, 9, 7.4, -10, { ...G, texK: 0.1 }) + K.line('M45 106h12M45 110h12', '#052e16', 1.2, { op: 0.5 });
      // гусь на голове
      s += K.vol(K.ell(52, 58, 12, 8), { c1: '#ffffff', c2: '#a8a29e', rim: '#e4ffb0', tex: false, lw: 1.8, line: '#3f3a36' });
      s += K.line('M46 56C42 50 42 44 46 40', '#3f3a36', 6) + K.line('M46 56C42 50 42 44 46 40', '#f5f5f4', 3.6);
      s += K.vol(K.ell(46, 38, 5.4, 4.6), { c1: '#ffffff', c2: '#a8a29e', rim: '#e4ffb0', tex: false, lw: 1.6, line: '#3f3a36' }) + K.part('M41 37L34 39L41 41Z', '#fb923c', { line: '#9a3412', lw: 1 }) + `<circle cx="45" cy="37" r="1.1" fill="${INK}"/>`;
      s += K.line('M58 62l3 3M48 64v4', '#fb923c', 2);
      s += K.spark(100, 40, 3, '#e4ffb0', 'art-float') + K.spark(150, 60, 2.8, '#fde68a') + K.spark(184, 80, 2.4, '#e4ffb0', 'art-float') + K.spark(14, 40, 2.4, '#fde68a');
      return s;
    },

    // Шу: бог воздуха держит на вытянутых руках небо, чтобы оно не упало на землю: над головой — голубая полоса неба
    // с облаками и звёздами. На голове страусиное перо, бородка; к поясу привязан воздушный змей, вокруг гуляет ветер
    eg_shu(K) {
      const skin = { c1: '#e0a06a', c2: '#7c3a12', rim: '#eef0ff', tex: false, line: '#3b1606' };
      let s = K.aura('#a5b4fc', 100, 104, 0.45);
      // ветер
      s += K.line('M14 130q10 -6 18 0 5 4 1 7-4 2-5-2M166 150q10 -6 18 0M20 160q8 -5 16 0', '#e0e7ff', 2, { op: 0.85, cls: 'art-float' });
      // воздушный змей
      s += K.line('M110 124C130 130 146 120 160 104', '#64748b', 1.2);
      s += `<g class="art-sway" style="transform-origin:0% 100%">` + K.vol('M168 80L182 98L166 116L154 98Z', { c1: '#fca5a5', c2: '#dc2626', rim: '#eef0ff', tex: false, lw: 1.8, line: '#7f1d1d' }) + K.line('M168 80V116M154 98H182', '#7f1d1d', 1.2) +
        K.line('M166 116C162 126 172 132 166 142', '#475569', 1.2) + K.part('M164 126l6 2-4 3z M164 136l6 2-4 3z', '#facc15', { line: '#a16207', lw: 0.8 }) + '</g>';
      // ноги в широкой стойке
      s += K.vol('M84 150L76 170H90L94 150Z', skin) + K.vol('M106 150L110 170H124L116 150Z', skin);
      s += K.part('M70 170H92Q93 176 88 176H72Q68 176 70 170Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }) + K.part('M108 170H130Q131 176 126 176H110Q106 176 108 170Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 });
      // схенти
      s += K.vol('M80 122H120L128 154Q100 160 72 154Z', { c1: '#ffffff', c2: '#d6c9a8', rim: '#eef0ff', tex: false, lw: 2.2, line: '#4a3a1a' });
      s += stripes(K, 'M92 126H108L111 158H89Z', '#60a5fa', '#fbbf24', 3.4, 0, '#1e3a8a', 1.6);
      s += K.line('M80 124H120', '#5a3a06', 5) + K.line('M80 124H120', '#fbbf24', 3);
      // торс
      s += K.vol('M78 94C78 86 88 84 100 84C112 84 122 86 122 94C124 106 120 118 116 124H84C80 118 76 106 78 94Z', skin);
      // руки вверх
      s += K.mirror(K.vol('M80 92C70 86 62 74 60 58C60 52 68 50 70 56C72 70 78 80 88 86Z', skin) + ellV(K, 64, 54, 7, 6.4, 0, skin) + K.line('M66 74l8 -2', '#fbbf24', 3.4));
      s += collar(K, 100, 90, 24, 8, 4);
      // небо на руках
      const sky = 'M4 64C26 14 174 14 196 64L184 74C160 34 40 34 16 74Z';
      s += K.vol(sky, { c1: '#bfdbfe', c2: '#1d4ed8', rim: '#eef0ff', tex: false, lw: 2.2, line: '#1e1b4b' });
      s += clip(K, sky, '<g fill="#fde68a"><circle cx="40" cy="40" r="1.8"/><circle cx="78" cy="26" r="1.5"/><circle cx="122" cy="26" r="1.8"/><circle cx="160" cy="40" r="1.5"/><circle cx="100" cy="24" r="1.2"/></g>');
      s += cloud(K, 52, 38, 0.55, '#ffffff', '', 0) + cloud(K, 148, 38, 0.55, '#ffffff', '', 0) + cloud(K, 100, 28, 0.45, '#ffffff', '', 0);
      // голова: перо и бородка
      s += plume(K, 104, 50, 30, 11, 8, '#ffffff', '#94a3b8', '#334155');
      s += stripes(K, 'M80 62C80 50 88 44 100 44C112 44 120 50 120 62L122 94L110 94L108 76H92L90 94L78 94Z', '#1e3a8a', '#0b1a3a', 3, 0, '#030712', 1.8);
      s += stripes(K, 'M95 84H105L106 100Q100 106 94 100Z', '#1e3a8a', '#fbbf24', 3, 0, '#0b1a3a', 1.4);
      s += K.vol(K.ell(100, 68, 15, 17), skin);
      s += K.line('M84 56Q100 48 116 56', '#5a3a06', 4.4) + K.line('M84 56Q100 48 116 56', '#fbbf24', 2.4);
      s += K.eyes(100, 68, 6.8, 5, { iris: '#1d4ed8', look: [0, -0.4] });
      s += K.mirror(K.line('M87 69L82 70', INK, 1.8));
      s += K.mouth('grin', 100, 77, 9);
      s += K.spark(24, 100, 3, '#eef0ff', 'art-float') + K.spark(178, 130, 2.6, '#fde68a') + K.spark(30, 170, 2.4, '#eef0ff');
      return s;
    },

    // Хонсу: юный бог луны, ночной странник. Плывёт по ночному небу в серебряной ладье-полумесяце: на голове лунный диск
    // в серпе, у виска детская прядь, в руке посох-крюк с фонариком — освещает дорогу тем, кто поздно идёт домой
    eg_honsu(K) {
      const skin = { c1: '#f2c08a', c2: '#a8622a', rim: '#e9d5ff', tex: false, line: '#4a2408' };
      const S = { c1: '#f8fafc', c2: '#94a3b8', rim: '#e9d5ff', tex: false, line: '#334155' };
      let s = K.aura('#8b5cf6', 100, 100, 0.45) + K.aura('#e0e7ff', 50, 40, 0.3);
      s += '<g fill="#fde68a"><circle cx="20" cy="60" r="1.6"/><circle cx="36" cy="30" r="1.2"/><circle cx="170" cy="70" r="1.4"/><circle cx="186" cy="110" r="1.2"/><circle cx="160" cy="20" r="1.2"/></g>';
      // облака под ладьёй
      s += cloud(K, 40, 170, 0.8, '#c7d2fe', 'art-float', 0.3) + cloud(K, 160, 168, 0.8, '#c7d2fe', 'art-float', 1.1);
      // посох-крюк с фонариком
      s += K.line('M146 156V46C146 34 160 32 162 42C163 48 158 50 156 46', '#3b2410', 6) + K.line('M146 156V46C146 34 160 32 162 42C163 48 158 50 156 46', '#fbbf24', 3.4);
      s += K.line('M160 50V60', '#57534e', 1.6) + `<circle class="art-aura" cx="160" cy="70" r="16" fill="${K.rad([[0, '#fff6c2', 0.9], [1, '#facc15', 0]])}"/>`;
      s += K.vol('M153 62H167L169 78H151Z', { c1: '#fff3b0', c2: '#f59e0b', rim: '#fff6c2', tex: false, lw: 1.8, line: '#5a3a06' }) + K.part('M151 60H169L165 56H155Z', '#334155', { line: '#0f172a', lw: 1.2 }) + K.line('M160 64V76', '#fbbf24', 1.2);
      // спелёнутое тело
      const body = 'M100 84C116 84 124 94 124 108L122 150H78L76 108C76 94 84 84 100 84Z';
      s += K.vol(body, S);
      s += clip(K, body, K.line('M70 112Q100 120 130 110M70 126Q100 134 130 124M70 140Q100 148 130 138', '#cbd5e1', 1.6));
      // руки: крюк и цеп
      s += ellV(K, 138, 112, 7, 6.4, 0, skin) + K.vol('M120 104C128 106 134 108 138 110L136 118C130 116 124 114 118 112Z', S);
      s += K.line('M84 112L96 104M96 104l-6 10M96 104l-2 12M96 104l3 11', '#1e3a8a', 2.4) + K.vol('M82 104C88 106 92 108 96 110L94 118C88 116 84 114 80 112Z', S) + ellV(K, 82, 112, 6.4, 6, 0, skin);
      s += collar(K, 100, 90, 20, 7, 3);
      // ладья-полумесяц
      s += K.vol('M14 124C36 170 164 170 186 124C190 120 194 124 192 130C176 180 24 180 8 130C6 124 10 120 14 124Z', { c1: '#ffffff', c2: '#94a3b8', rim: '#e9d5ff', tex: false, lw: 2.4, line: '#334155' });
      s += K.line('M30 148Q100 176 170 148', '#c4b5fd', 2, { op: 0.8 }) + K.stitch('M38 156Q100 180 162 156', '#fde68a', 1.6);
      // голова с прядью и лунной короной
      s += K.vol(K.ell(100, 64, 16, 18), skin);
      s += K.vol('M84 62C84 48 90 42 100 42C110 42 116 48 116 62C110 56 90 56 84 62Z', { c1: '#475569', c2: '#0f172a', rim: '#e9d5ff', tex: false, lw: 1.8, line: '#020617' });
      s += K.line('M116 58C124 68 124 82 116 90C122 80 120 70 114 64', '#0f172a', 4) + K.line('M116 58C124 68 124 82 116 90', '#475569', 1.4);
      s += K.eyes(100, 66, 6.6, 5, { iris: '#7c3aed', lid: 'half', skin: '#e9ac72', look: [0.4, 0.2] });
      s += K.mouth('smile', 100, 75, 8) + K.blush(89, 74, 3.4) + K.blush(111, 74, 3.4);
      s += `<circle class="art-aura" cx="100" cy="24" r="18" fill="${K.rad([[0, '#f8fafc', 0.8], [1, '#c7d2fe', 0]])}"/>`;
      s += K.part('M82 30C86 46 114 46 118 30C112 38 88 38 82 30Z', '#e2e8f0', { line: '#475569', lw: 1.4 }) + K.vol(K.ell(100, 24, 10, 10), { c1: '#ffffff', c2: '#a5b4fc', rim: '#e9d5ff', tex: false, lw: 1.8, line: '#475569' });
      s += K.spark(30, 100, 3, '#e9d5ff', 'art-float') + K.spark(178, 30, 2.6, '#fde68a', 'art-float') + K.spark(14, 140, 2.4, '#e9d5ff');
      return s;
    },

    // Амон: сокровенный царь богов. Синекожий, восседает на троне в узоре перьев, ноги на скамеечке; на голове корона
    // из двух высоких перьев, бородка, усех; в одной руке посох-уас, в другой — анх, из которого струится дыхание жизни.
    // Вокруг кружат невидимые ветры — их видно только по золотым искрам
    eg_amon(K) {
      const sk = { c1: '#93c5fd', c2: '#1e3a8a', rim: '#eef0ff', tex: false, line: '#0b1a3a' };
      let s = K.aura('#a5b4fc', 100, 100, 0.6) + K.aura('#fbbf24', 70, 64, 0.35);
      // золотое сияние за головой
      s += `<circle class="art-aura" cx="100" cy="58" r="34" fill="${K.rad([[0, '#fff6c2', 0.8], [0.7, '#fde68a', 0.35], [1, '#fbbf24', 0]])}"/>` + `<circle cx="100" cy="58" r="28" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="4 5" opacity=".8"/>`;
      // ветры
      s += `<g class="art-spin-soft">` + K.line('M18 70C8 100 20 140 52 150M182 64C194 96 182 136 150 150', '#e0e7ff', 2.6, { op: 0.7 }) + K.line('M26 60C18 80 22 100 34 110M174 56C182 76 178 96 166 106', '#fde68a', 1.6, { op: 0.8 }) + '</g>';
      // трон в узоре перьев
      const thr = 'M52 96H148V170H52Z';
      s += K.vol(thr, { c1: '#fde68a', c2: '#b45309', rim: '#fff6c2', tex: false, lw: 2.4, line: '#5a3a06' });
      let fe = '';
      for (let y = 104; y < 172; y += 9) for (let x = 56 + ((y - 104) / 9 % 2) * 5; x < 150; x += 10) fe += `M${x - 4} ${y}Q${x} ${y + 6} ${x + 4} ${y}`;
      s += clip(K, thr, K.line(fe, '#1d4ed8', 1.6, { op: 0.7 }) + K.line('M52 100H148M52 166H148', '#dc2626', 3));
      // скамеечка и ноги
      s += K.vol('M70 168H130V178H70Z', { c1: '#fde68a', c2: '#b45309', rim: '#fff6c2', tex: false, lw: 2, line: '#5a3a06' }) + K.line('M74 173H126', '#1d4ed8', 1.6);
      s += K.mirror(K.vol('M84 142H96V166H84Z', sk) + K.part('M80 166H100Q101 170 96 170H82Q78 170 80 166Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }));
      // схенти на коленях
      s += K.vol('M72 120H128L132 146H68Z', { c1: '#ffffff', c2: '#d6c9a8', rim: '#eef0ff', tex: false, lw: 2.2, line: '#4a3a1a' });
      s += stripes(K, 'M92 122H108L110 146H90Z', '#fbbf24', '#1e40af', 3.4, 0, '#5a3a06', 1.6);
      s += K.line('M74 122H126', '#5a3a06', 5) + K.line('M74 122H126', '#fbbf24', 3);
      // торс с корсетом
      const torso = 'M78 92C78 84 88 82 100 82C112 82 122 84 122 92C124 104 120 116 116 122H84C80 116 76 104 78 92Z';
      s += K.vol(torso, sk);
      s += K.line('M84 100L116 120M116 100L84 120', '#fbbf24', 3) + K.line('M84 100L116 120M116 100L84 120', '#5a3a06', 0.8, { op: 0.6 });
      // посох-уас и рука
      s += was(K, 52, 40, 168);
      s += K.vol('M80 92C70 96 62 104 58 112C56 118 62 122 66 118C70 112 76 106 84 104Z', sk) + ellV(K, 56, 114, 6.6, 6.2, 0, sk);
      // рука с анхом и дыхание жизни
      s += K.vol('M120 92C132 96 140 104 144 114C146 120 140 122 136 118C134 112 128 106 120 104Z', sk);
      s += ankh(K, 146, 132, 1.2) + ellV(K, 142, 118, 6.6, 6.2, 0, sk);
      s += `<g class="art-float">` + K.line('M156 122C168 116 166 104 178 98C186 94 186 84 180 80', '#e0e7ff', 2.4, { op: 0.9 }) + K.spark(180, 78, 3.6, '#fde68a') + K.spark(170, 108, 2.6, '#fffbe6') + '</g>';
      s += collar(K, 100, 88, 26, 9, 4);
      // корона из двух высоких перьев
      const pl = (x) => { const d = `M${x - 6} 34L${x - 5} -4C${x - 4} -12 ${x + 4} -12 ${x + 5} -4L${x + 6} 34Z`; return K.vol(d, { c1: '#fef3c7', c2: '#b45309', rim: '#fff6c2', tex: false, lw: 1.8, line: '#5a3a06' }) + clip(K, d, K.line(`M${x - 8} 26H${x + 8}M${x - 8} 18H${x + 8}M${x - 8} 10H${x + 8}M${x - 8} 2H${x + 8}`, '#dc2626', 2.4) + K.line(`M${x - 8} 22H${x + 8}M${x - 8} 6H${x + 8}`, '#1d4ed8', 2.4)); };
      s += pl(93) + pl(107);
      s += K.vol('M84 30H116L114 42H86Z', { c1: '#fde68a', c2: '#b45309', rim: '#fff6c2', tex: false, lw: 1.8, line: '#5a3a06' }) + K.line('M86 36H114', '#1d4ed8', 2);
      // голова: синее лицо, бородка
      s += K.line('M114 42C122 52 124 66 120 80', '#dc2626', 3) + K.line('M114 42C122 52 124 66 120 80', '#7f1d1d', 0.8);
      s += stripes(K, 'M95 74H105L106 92Q100 98 94 92Z', '#1e3a8a', '#fbbf24', 3, 0, '#0b1a3a', 1.4);
      s += K.vol(K.ell(100, 58, 16, 18), sk);
      s += K.eyes(100, 59, 7, 5.2, { iris: '#fbbf24', look: [0, 0.2] });
      s += K.mirror(K.line('M87 60L82 61', INK, 1.8));
      s += K.mouth('smile', 100, 69, 8);
      s += K.spark(20, 30, 3.6, '#fde68a', 'art-float') + K.spark(180, 30, 3.6, '#eef0ff', 'art-float') + K.spark(14, 160, 2.8, '#fde68a') + K.spark(186, 160, 2.8, '#eef0ff') + K.spark(150, 4, 2.6, '#fde68a');
      return s;
    },

    // Нун: первозданный океан в облике бородатого великана, по пояс поднявшегося из волн. Волосы и борода — струи
    // с пеной, кожа цвета глубокой воды. Обеими руками он держит над собой золотую ладью, в которой рождается солнце,
    // и скарабей катит его в новый день; вокруг кипят волны, пузыри и рыбы
    eg_nun(K) {
      const W = { c1: '#7ff0dc', c2: '#134e4a', rim: '#c8f3ff', texK: 0.2, line: '#042f2e' };
      let s = K.aura('#38bdf8', 100, 104, 0.55) + K.aura('#fbbf24', 64, 34, 0.35);
      // ладья с рождающимся солнцем
      let d = '';
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, w = 0.08; d += `M${P(100, 22, 22, a - w)}L${P(100, 22, i % 2 ? 32 : 40, a)}L${P(100, 22, 22, a + w)}Z`; }
      s += `<g class="art-spin-soft"><path d="${d}" fill="#fde68a" stroke="#ea580c" stroke-width="1" opacity=".9"/></g>`;
      s += sunBall(K, 100, 22, 18, false);
      s += K.vol(K.ell(100, 36, 9, 7), { c1: '#5eead4', c2: '#1e3a8a', tex: false, lw: 1.6, line: '#0b1a3a' }) + K.line('M100 30V42M92 33l-4 -3M108 33l4 -3', '#0b1a3a', 1.2);
      s += K.line('M28 42C20 32 22 22 30 18M172 42C180 32 178 22 170 18', '#5a3a06', 5) + K.line('M28 42C20 32 22 22 30 18M172 42C180 32 178 22 170 18', '#fbbf24', 3);
      s += K.vol('M24 40C44 52 156 52 176 40C172 54 158 62 140 64H60C42 62 28 54 24 40Z', { c1: '#ffe08a', c2: '#b45309', rim: '#fff6c2', tex: false, lw: 2.2, line: '#5a3a06' });
      s += K.line('M36 50Q100 60 164 50', '#1e3a8a', 2.4) + wedjat(K, 46, 54, 0.5) + wedjat(K, 154, 54, 0.5);
      // руки держат ладью
      s += K.mirror(K.vol('M78 106C66 100 58 86 56 70C56 62 66 60 68 68C70 80 76 90 86 96Z', W) + ellV(K, 62, 66, 8, 7, 0, { ...W, texK: 0.1 }));
      // торс
      s += K.vol('M70 112C70 98 84 94 100 94C116 94 130 98 130 112C134 132 132 150 128 166H72C68 150 66 132 70 112Z', W);
      s += K.line('M84 126Q100 132 116 126M86 140Q100 145 114 140', '#134e4a', 1.4, { op: 0.5 });
      // волосы-струи
      s += K.mirror(K.vol('M84 66C70 72 62 88 64 110C66 120 72 126 78 128C74 116 74 104 80 96C78 108 82 118 88 122C86 106 88 92 94 82Z', { c1: '#a7f3d0', c2: '#0f766e', rim: '#ffffff', texK: 0.15, lw: 2, line: '#042f2e' }));
      // голова и борода-волна
      s += K.vol(K.ell(100, 76, 19, 20), W);
      s += K.vol('M84 88C84 104 90 116 100 122C110 116 116 104 116 88C108 94 92 94 84 88Z', { c1: '#d1fae5', c2: '#0f766e', rim: '#ffffff', texK: 0.12, lw: 2, line: '#042f2e' });
      s += K.line('M88 96Q92 104 90 112M100 98V118M112 96Q108 104 110 112', '#0f766e', 1.4, { op: 0.6 });
      s += K.line('M82 66Q100 58 118 66', '#ecfeff', 3, { op: 0.9 });
      s += K.eyes(100, 74, 7.4, 5.6, { iris: '#0e7490', lid: 'half', skin: '#5fd4c0', look: [0, -0.5] });
      s += K.mouth('smile', 100, 86, 8);
      // волны, пузыри, рыбы
      s += nile(K, 150, 0.95);
      s += K.line('M20 150C26 140 38 140 40 148C41 154 34 156 32 151M160 150C166 140 178 140 180 148C181 154 174 156 172 151', '#e0f7ff', 2.6, { op: 0.9 });
      s += '<g class="art-float"><circle cx="40" cy="120" r="3.6" fill="#e0f7ff" fill-opacity=".3" stroke="#7dd3fc" stroke-width="1.3"/><circle cx="160" cy="112" r="4.2" fill="#e0f7ff" fill-opacity=".3" stroke="#7dd3fc" stroke-width="1.3"/><circle cx="168" cy="96" r="2.4" fill="none" stroke="#7dd3fc" stroke-width="1.1"/></g>';
      s += `<g class="art-float" style="animation-delay:-.9s">` + K.vol('M26 172C32 164 46 162 52 168C46 174 32 176 26 172Z', { c1: '#a7f7e8', c2: '#0e7490', rim: '#c8f3ff', tex: false, lw: 1.6, line: '#073b4c' }) + K.part('M52 168L60 162L59 174Z', '#fbbf24', { line: '#5a2a06', lw: 1.1 }) + `<circle cx="32" cy="168" r="1.3" fill="${INK}"/>` + '</g>';
      s += K.spark(14, 80, 3.4, '#e0f7ff', 'art-float') + K.spark(186, 80, 3.4, '#fde68a', 'art-float') + K.spark(186, 140, 2.6, '#e0f7ff') + K.spark(14, 30, 2.6, '#fde68a');
      return s;
    },

    // Гор: бог-сокол, царь неба. Распахнул соколиные крылья, на голове двойная корона Верхнего и Нижнего Египта;
    // под глазом — знаменитая «слеза» ока Уаджет, за спиной сияет огромное око. В одной руке копьё, которым он
    // одолел Сета, в другой — анх; вокруг потрескивают молнии небесного света
    eg_gor(K) {
      const sk = { c1: '#e0935a', c2: '#7c3a12', rim: '#fff6b0', tex: false, line: '#3b1606' };
      const F = { c1: '#fff7e0', c2: '#b45309', rim: '#fff6b0', texK: 0.15, line: '#4a2408' };
      let s = K.aura('#facc15', 100, 96, 0.6) + K.aura('#ffffff', 60, 40, 0.3);
      // огромное сияющее око за спиной
      s += `<g transform="translate(100 66) scale(4.4)"><g class="art-blink">` + K.line(GLYPH.eye, '#facc15', 3, { op: 0.35 }) + K.line(GLYPH.eye, '#fde68a', 1.1) + '</g></g>';
      // соколиные крылья
      const Wg = 'M84 98C62 86 34 72 6 66Q10 74 18 78Q12 84 14 94Q22 94 26 98Q22 106 28 112Q34 110 40 114Q38 122 46 126Q52 122 58 126C68 120 76 114 84 112Z';
      s += K.mirror(`<g class="art-wing">${ewing(K, Wg, 84, 106, 28, 54, ['#fbbf24', '#b45309', '#1e3a8a'], 150, 215, 9)}</g>`);
      // копьё
      s += K.line('M150 176L150 30', '#3b2410', 5.4) + K.line('M150 176L150 30', '#c9934e', 3) + K.part('M150 14L156 32H144Z', '#e2e8f0', { line: '#1e293b', lw: 1.6 });
      // ноги
      s += K.mirror(K.vol('M86 156H96V172H86Z', sk) + K.part('M82 172H100Q101 178 96 178H84Q80 178 82 172Z', '#fbbf24', { line: '#5a3a06', lw: 1.4 }));
      // схенти и корсет из перьев
      s += K.vol('M78 122H122L130 158Q100 164 70 158Z', { c1: '#ffffff', c2: '#d6c9a8', rim: '#fff6b0', tex: false, lw: 2.2, line: '#4a3a1a' });
      s += stripes(K, 'M92 126H108L112 162H88Z', '#fbbf24', '#1e3a8a', 3.4, 0, '#5a3a06', 1.6);
      s += K.line('M78 124H122', '#5a3a06', 5) + K.line('M78 124H122', '#fbbf24', 3);
      const torso = 'M76 94C76 86 88 84 100 84C112 84 124 86 124 94C126 106 122 118 118 124H82C78 118 74 106 76 94Z';
      s += K.vol(torso, sk);
      let fe = '';
      for (let y = 102; y < 126; y += 7) for (let x = 78 + ((y - 102) / 7 % 2) * 4; x < 124; x += 8) fe += `M${x - 3.4} ${y}Q${x} ${y + 5} ${x + 3.4} ${y}`;
      s += clip(K, torso, K.line(fe, '#fbbf24', 1.6, { op: 0.8 }));
      // руки: с анхом и на копье
      s += K.vol('M78 92C66 96 58 106 54 118C52 124 60 128 64 122C66 114 72 106 82 102Z', sk);
      s += ankh(K, 56, 142, 1.2) + ellV(K, 58, 124, 6.6, 6.2, 0, sk);
      s += K.vol('M122 92C134 96 142 100 146 106C150 112 144 116 140 112C136 108 130 106 120 104Z', sk) + ellV(K, 150, 108, 6.6, 6.2, 0, sk);
      s += collar(K, 100, 90, 26, 9, 4);
      // двойная корона
      s += K.vol('M80 50L82 30H98V8H112V30L120 50Z', { c1: '#f05252', c2: '#991b1b', rim: '#fde68a', tex: false, lw: 2, line: '#450a0a' });
      s += K.vol('M90 34C88 22 92 8 99 0C101 -2 103 -2 105 0C110 8 112 22 110 34Z', { c1: '#ffffff', c2: '#cbd5e1', rim: '#fff6b0', tex: false, lw: 2, line: '#334155' });
      s += K.line('M84 32L72 14C70 8 78 4 80 10C81 14 77 15 76 13', '#450a0a', 3.6) + K.line('M84 32L72 14C70 8 78 4 80 10C81 14 77 15 76 13', '#fbbf24', 1.8);
      // соколиная голова
      s += K.vol('M100 46C116 46 126 56 126 70C126 82 116 90 104 90C92 90 80 84 78 74C76 64 84 46 100 46Z', F);
      s += K.part('M84 52C92 46 110 44 122 54C118 58 110 60 100 60C92 60 86 58 84 52Z', '#b45309', { line: '#4a2408', lw: 1.4 });
      s += K.vol('M90 62C80 60 68 64 64 76C62 83 65 87 69 85C69 80 72 78 77 79C82 77 87 76 92 74Z', { c1: '#94a3b8', c2: '#1e293b', rim: '#fff6b0', tex: false, lw: 1.8, line: '#0f172a' }) + K.part('M84 61C90 60 94 64 92 72L86 75Z', '#fbbf24', { flat: true, line: '#5a3a06', lw: 1.2 });
      s += `<g class="art-eyes">${K.eye(101, 66, 7.4, { iris: '#f59e0b', lid: 'angry', skin: '#e9c08a', look: [-0.5, 0.2] })}${K.eye(118, 65, 6, { iris: '#f59e0b', lid: 'angry', skin: '#e9c08a', look: [-0.5, 0.2] })}</g>`;
      s += K.line('M100 74C99 80 96 86 90 90', '#1f2937', 4.4) + K.line('M108 74L114 76', '#1f2937', 2.4);
      // молнии небесного света
      s += K.line('M24 30l7 6-4 3 8 7M170 140l6 5-4 3 7 6M26 150l6 5-4 3 7 6', '#facc15', 2.4, { cls: 'art-blink' });
      s += K.spark(178, 40, 3.8, '#fff3b0', 'art-float') + K.spark(16, 100, 3, '#fffbe6') + K.spark(186, 96, 3, '#fef08a', 'art-float') + K.spark(60, 10, 2.6, '#fffbe6');
      return s;
    },
  });
})();
