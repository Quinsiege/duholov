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
})();
