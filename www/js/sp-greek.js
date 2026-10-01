'use strict';
/* 4.28: рисунки духов и богов греческой мифологии — каждый своей функцией (кисть — js/art-kit.js) */

(() => {
  const f = n => (Math.round(n * 100) / 100).toString();
  // греческий меандр: полоса «ключей» от x шириной w, верх — y, высота h
  const grKey = (K, x, y, w, h, c, lw = 1.6) => {
    let d = `M${f(x)} ${f(y + h)}H${f(x + w)}`;
    for (let a = x + h * 0.15; a + h * 0.85 <= x + w; a += h * 1.1) d += `M${f(a)} ${f(y + h)}V${f(y)}H${f(a + h * 0.8)}V${f(y + h * 0.66)}H${f(a + h * 0.36)}V${f(y + h * 0.36)}`;
    return K.line(d, c, lw);
  };
  // лавровый (или оливковый) венок по дуге эллипса: листья парами вдоль стебля
  const grLaurel = (K, cx, cy, rx, ry, a0, a1, n, c = '#fbbf24', sz = 6, line) => {
    const ln = line || K.shade(c, -0.55);
    let s = '', st = '';
    for (let i = 0; i < n; i++) {
      const t = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180, x = cx + rx * Math.cos(t), y = cy + ry * Math.sin(t);
      st += `${i ? 'L' : 'M'}${f(x)} ${f(y)}`;
      const tan = Math.atan2(ry * Math.cos(t), -rx * Math.sin(t)) * 180 / Math.PI * (a1 > a0 ? 1 : -1);
      for (const side of [-1, 1]) {
        const r = tan + side * 38, lx = x + Math.cos(r * Math.PI / 180) * sz * 0.8, ly = y + Math.sin(r * Math.PI / 180) * sz * 0.8;
        s += `<ellipse cx="${f(lx)}" cy="${f(ly)}" rx="${f(sz)}" ry="${f(sz * 0.42)}" transform="rotate(${f(r)} ${f(lx)} ${f(ly)})" fill="${K.shade(c, side > 0 ? 0.12 : -0.08)}" stroke="${ln}" stroke-width="1"/>`;
      }
    }
    return K.line(st, ln, 1.4) + s;
  };
  // язык пламени, повёрнутый наружу: основание (x, y), угол a (градусы, 0 — вправо)
  const grFl = (K, x, y, h, w, a, c1, c2, d = 0) => K.g(K.flame(x, y, h, w, c1, c2, { style: `animation-delay:${d}s` }), `rotate(${f(a + 90)} ${f(x)} ${f(y)})`);
  // обрезка по контуру
  const grClip = (K, d, inner) => { const i = K.id('c'); K.def(`<clipPath id="${i}"><path d="${d}"/></clipPath>`); return `<g clip-path="url(#${i})">${inner}</g>`; };
  // буква «Z» сна
  const grZ = (x, y, k, c, d) => `<g class="art-float" style="animation-delay:${d}s"><path d="M${x} ${y}h${f(6 * k)}l${f(-6 * k)} ${f(7 * k)}h${f(6 * k)}" fill="none" stroke="${c}" stroke-width="${f(1.8 * k)}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  // молния Зевса: веретено с изломом, центр (x, y), длина L, поворот r
  const grBolt = (K, x, y, L, r, c1 = '#fff7c2', c2 = '#facc15') => {
    const h = L / 2, d = `M0 ${f(-h)}L${f(L * 0.13)} ${f(-h * 0.2)}L${f(L * 0.03)} ${f(-h * 0.14)}L${f(L * 0.1)} ${f(h * 0.45)}L0 ${f(h)}L${f(-L * 0.1)} ${f(h * 0.22)}L${f(-L * 0.02)} ${f(h * 0.16)}L${f(-L * 0.11)} ${f(-h * 0.45)}Z`;
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${r})"><path class="art-blink" d="${d}" fill="none" stroke="${c2}" stroke-width="7" stroke-linejoin="round" opacity=".35"/><path d="${d}" fill="${K.lin([c1, c2, K.shade(c2, -0.2)])}" stroke="${K.shade(c2, -0.55)}" stroke-width="1.8" stroke-linejoin="round"/><path d="M${f(-L * 0.02)} ${f(-h * 0.7)}L${f(L * 0.06)} ${f(-h * 0.2)}" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".9"/></g>`;
  };
  // волна с пенными завитками по низу: от x0 до x1 на высоте y
  const grWaves = (K, x0, x1, y, c1 = '#38bdf8', c2 = '#0c4a6e', step = 24) => {
    let d = `M${x0} ${y}`, foam = '';
    for (let x = x0; x < x1; x += step) { d += `C${f(x + step * 0.3)} ${f(y - 12)} ${f(x + step * 0.75)} ${f(y - 10)} ${f(x + step * 0.7)} ${f(y - 2)}Q${f(x + step * 0.6)} ${f(y + 3)} ${f(x + step * 0.5)} ${f(y - 1)}Q${f(x + step * 0.8)} ${f(y + 4)} ${f(x + step)} ${y}`; foam += `M${f(x + step * 0.2)} ${f(y - 5)}C${f(x + step * 0.35)} ${f(y - 11)} ${f(x + step * 0.7)} ${f(y - 10)} ${f(x + step * 0.68)} ${f(y - 3)}`; }
    d += `C${f(x1 - 10)} ${y + 22} ${f(x0 + 10)} ${y + 22} ${x0} ${y}Z`;
    return `<path d="${d}" fill="${K.lin([c1, c2])}" stroke="${K.shade(c2, -0.4)}" stroke-width="2" stroke-linejoin="round"/>` + K.line(foam, '#ecfeff', 2.2, { op: 0.9 });
  };

  // нотка
  const grNote = (x, y, k, c, d) => `<g class="art-float" style="animation-delay:${d}s"><g transform="translate(${x} ${y}) scale(${k})"><path d="M3.4 0V-15Q9 -12 10 -6" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="0" cy="0" rx="4.4" ry="3.2" transform="rotate(-22)" fill="${c}"/></g></g>`;
  // свирель Пана: тростинки убывающей длины, связанные шнуром; (x, y) — левый верхний угол, w — ширина тростинки
  const grSyrinx = (K, x, y, lens, w, t) => {
    let s = '';
    lens.forEach((L, i) => {
      const xx = x + i * w;
      s += `<path d="M${f(xx)} ${y}H${f(xx + w)}V${f(y + L)}Q${f(xx + w / 2)} ${f(y + L + 2)} ${f(xx)} ${f(y + L)}Z" fill="${K.lin(['#f5e1a4', '#d9b25c', '#a67c2e'], 0, 0, 1, 0)}" stroke="#6b4a14" stroke-width="1.2" stroke-linejoin="round"/>` +
        `<ellipse cx="${f(xx + w / 2)}" cy="${y}" rx="${f(w * 0.3)}" ry="1" fill="#4a2c0a"/>`;
    });
    const W = lens.length * w;
    s += K.line(`M${f(x - 1)} ${y + 5}H${f(x + W + 1)}M${f(x - 1)} ${y + 10}H${f(x + W + 1)}`, '#b91c1c', 2);
    return K.g(s, t);
  };

  // лунный серп: круг (cx, cy, r) минус круг, сдвинутый на (dx, dy)
  const grMoon = (K, cx, cy, r, dx, dy, c1 = '#f8fafc', c2 = '#cbd5e1', op = 1) => {
    const i = K.id('m');
    K.def(`<mask id="${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200"><rect width="200" height="200" fill="#000"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/><circle cx="${cx + dx}" cy="${cy + dy}" r="${f(r * 0.92)}" fill="#000"/></mask>`);
    return `<g mask="url(#${i})" opacity="${op}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${K.rad([[0, c1], [1, c2]], 0.3, 0.7, 0.8)}"/><circle cx="${cx}" cy="${cy}" r="${f(r - 1)}" fill="none" stroke="${K.shade(c2, -0.4)}" stroke-width="2"/></g>`;
  };

  // ---------- помощники новых видов (расширение до 63) ----------
  // пятиконечная звезда: центр (x, y), радиус r
  const grStar = (x, y, r, c, line = '#78350f', cls = '') => {
    let d = '';
    for (let i = 0; i < 10; i++) { const a = (-90 + i * 36) * Math.PI / 180, rr = i % 2 ? r * 0.44 : r; d += `${i ? 'L' : 'M'}${f(x + rr * Math.cos(a))} ${f(y + rr * Math.sin(a))}`; }
    return `<path${cls ? ` class="${cls}"` : ''} d="${d}Z" fill="${c}" stroke="${line}" stroke-width="${f(Math.max(0.8, r * 0.14))}" stroke-linejoin="round"/>`;
  };
  // созвездие: тонкие линии между точками и звёздочки в них ([x, y, r])
  const grConst = (K, pts, c = '#e0e7ff', op = 0.5) => K.line(pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(''), c, 1.1, { op }) +
    pts.map(([x, y, r = 2.6], i) => K.spark(x, y, r, c, i % 2 ? 'art-blink' : '')).join('');
  // шестерёнка: центр, радиус, число зубцов; cls — например art-spin (вращение вокруг своего центра)
  const grGear = (K, cx, cy, r, n, c, line, cls) => {
    let d = '';
    const P = (a, rr) => `${f(cx + rr * Math.cos(a))} ${f(cy + rr * Math.sin(a))}`;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, w = Math.PI / n; d += `${i ? 'L' : 'M'}${P(a - w * 0.62, r * 0.78)}L${P(a - w * 0.4, r)}L${P(a + w * 0.4, r)}L${P(a + w * 0.62, r * 0.78)}`; }
    return `<g${cls ? ` class="${cls}"` : ''}><path d="${d}Z" fill="${K.lin([K.shade(c, 0.35), c, K.shade(c, -0.3)])}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="${f(r * 0.34)}" fill="${K.shade(c, -0.4)}" stroke="${line}" stroke-width="1.2"/></g>`;
  };
  // гребень волны с пенным завитком: основание (x, y), размер k, поворот r
  const grCrest = (K, x, y, k, r, c1 = '#7dd3fc', c2 = '#0c4a6e') => K.g(`<path d="M-12 8 C-12 -6 0 -16 14 -14 C20 -13 24 -8 22 -3 C20 -8 14 -9 11 -6 C8 -3 10 2 15 2 C10 8 0 10 -12 8Z" fill="${K.lin(['#ecfeff', c1, c2])}" stroke="${K.shade(c2, -0.35)}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M-6 2 C-6 -6 2 -11 10 -10" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`, `translate(${f(x)} ${f(y)}) rotate(${r}) scale(${k})`);
  // облако из клубов: путь для K.vol, низ — y, от x0 до x1, высота h
  const grCloudD = (x0, x1, y, h) => {
    const n = Math.max(2, Math.round((x1 - x0) / (h * 0.9))), w = (x1 - x0) / n;
    let d = `M${f(x0)} ${y}`;
    for (let i = 0; i < n; i++) { const a = x0 + i * w, hh = h * (i % 2 ? 0.8 : 1); d += `C${f(a - w * 0.1)} ${f(y - hh)} ${f(a + w * 1.1)} ${f(y - hh)} ${f(a + w)} ${f(y - hh * 0.25)}`; }
    return d + `C${f(x1 + h * 0.4)} ${f(y + h * 0.2)} ${f(x1)} ${f(y + h * 0.35)} ${f(x1 - h * 0.3)} ${f(y + h * 0.3)}H${f(x0 + h * 0.3)}C${f(x0)} ${f(y + h * 0.35)} ${f(x0 - h * 0.4)} ${f(y + h * 0.2)} ${f(x0)} ${y}Z`;
  };
  // пушистый край (руно, пена): эллипс с полукруглыми завитками по контуру — путь для K.vol
  const grFluffD = (cx, cy, rx, ry, n, a0 = 0) => {
    const P = i => { const t = (a0 + i * 360 / n) * Math.PI / 180; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]; };
    let d = '';
    for (let i = 0; i <= n; i++) {
      const [x, y] = P(i);
      if (!i) { d += `M${f(x)} ${f(y)}`; continue; }
      const [px, py] = P(i - 1), r = Math.hypot(x - px, y - py) * 0.6;
      d += `A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y)}`;
    }
    return d + 'Z';
  };
  // завитки шерсти внутри руна: маленькие спиральки в точках
  const grCurls = (K, pts, c, w = 1.4) => K.line(pts.map(([x, y, r = 4]) => `M${f(x - r)} ${y}a${r} ${r} 0 1 1 ${f(r * 1.4)} ${f(r * 0.9)}`).join(''), c, w, { op: 0.75 });
  // гранат: центр (x, y), радиус r; open — надрезан, видны зёрнышки
  const grPome = (K, x, y, r, open) => {
    let s = `<path d="M${f(x - r * 0.3)} ${f(y - r * 0.82)} L${f(x - r * 0.24)} ${f(y - r * 1.28)} L${x} ${f(y - r * 1.04)} L${f(x + r * 0.24)} ${f(y - r * 1.28)} L${f(x + r * 0.3)} ${f(y - r * 0.82)}Z" fill="#b91c1c" stroke="#450a0a" stroke-width="1.1" stroke-linejoin="round"/>` +
      `<circle cx="${x}" cy="${y}" r="${r}" fill="${K.rad([[0, '#fb7185'], [0.6, '#dc2626'], [1, '#7f1d1d']], 0.35, 0.3, 0.8)}" stroke="#450a0a" stroke-width="${f(Math.max(1.2, r * 0.12))}"/>`;
    if (open) {
      s += `<ellipse cx="${f(x + r * 0.08)}" cy="${f(y + r * 0.12)}" rx="${f(r * 0.6)}" ry="${f(r * 0.5)}" fill="#fde2e2" stroke="#7f1d1d" stroke-width="1"/>`;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (i * i + j * j < 2) s += `<circle cx="${f(x + r * 0.08 + i * r * 0.28)}" cy="${f(y + r * 0.12 + j * r * 0.22)}" r="${f(r * 0.12)}" fill="#e11d48"/>`;
    }
    return s + `<ellipse cx="${f(x - r * 0.4)}" cy="${f(y - r * 0.38)}" rx="${f(r * 0.24)}" ry="${f(r * 0.14)}" transform="rotate(-35 ${f(x - r * 0.4)} ${f(y - r * 0.38)})" fill="#fff" opacity=".5"/>`;
  };
  // колос пшеницы: основание (x, y), длина стебля L, поворот r
  const grWheat = (K, x, y, L, r, c = '#facc15') => {
    let s = K.line(`M0 0 V${-L}`, '#a16207', 1.6);
    for (let i = 0; i < 5; i++) { const yy = f(-L + 4 + i * 4.4); s += `<ellipse cx="-2.6" cy="${yy}" rx="2.4" ry="4" transform="rotate(-25 -2.6 ${yy})" fill="${c}" stroke="#92400e" stroke-width=".8"/><ellipse cx="2.6" cy="${yy}" rx="2.4" ry="4" transform="rotate(25 2.6 ${yy})" fill="${c}" stroke="#92400e" stroke-width=".8"/>`; }
    s += `<ellipse cx="0" cy="${-L - 1}" rx="2.2" ry="4" fill="${c}" stroke="#92400e" stroke-width=".8"/>` + K.line(`M0 ${-L - 4} V${-L - 12}`, '#d4a017', 0.8);
    return K.g(s, `translate(${f(x)} ${f(y)}) rotate(${r})`);
  };
  // лира из панциря черепахи: центр (x, y), размер k, поворот r
  const grLyre = (K, x, y, k, r = 0) => K.g(
    `<ellipse cx="0" cy="16" rx="15" ry="9" fill="${K.lin(['#d9a05a', '#7c4a1d'])}" stroke="#3b1d0c" stroke-width="1.6"/>` + K.line('M-8 12 L-4 20 M0 10 V22 M8 12 L4 20', '#3b1d0c', 1, { op: 0.6 }) +
    K.line('M-10 12 C-22 0 -18 -18 -9 -26 M10 12 C22 0 18 -18 9 -26', '#78350f', 5.4) + K.line('M-10 12 C-22 0 -18 -18 -9 -26 M10 12 C22 0 18 -18 9 -26', '#fcd34d', 3.2) +
    K.line('M-13 -21 H13', '#78350f', 3.6) + K.line('M-13 -21 H13', '#fde68a', 1.8) + K.line('M-5 -21 L-4 12 M-1.6 -21 L-1.4 12 M1.6 -21 L1.4 12 M5 -21 L4 12', '#fff7c2', 0.9),
    `translate(${f(x)} ${f(y)}) rotate(${r}) scale(${k})`);
  // закрученный рог барана из точки (x, y): k — размер, dir — 1 (завиток влево) или -1 (вправо)
  const grRamHorn = (K, x, y, k, dir, c = '#f3e3c0', line = '#6b4a24') => {
    const d = 'M0 0 C-12 -12 -30 -8 -31 8 C-32 22 -18 30 -8 24 C0 18 -4 8 -13 10';
    return K.g(K.line(d, line, 11) + K.line(d, c, 7.6) + `<path d="${d}" fill="none" stroke="${K.shade(c, -0.35)}" stroke-width="7.6" stroke-dasharray="1.3 3.6" opacity=".7"/>` + K.line('M-4 -4 C-14 -12 -26 -8 -28 2', '#fff', 1.6, { op: 0.6 }),
      `translate(${f(x)} ${f(y)}) scale(${f(k * dir)} ${f(k)})`);
  };

  Object.assign(SPIRIT_ART, {
    // Химерёнок: пушистый львёнок с гривкой из язычков пламени; из-за плеча выглядывает сонная козья головка с рожками,
    // хвост — зелёная змейка с раздвоенным язычком. В лапках — печёный каштан с жаровни, от него идёт пар
    gr_himerenok(K) {
      const fur = { c1: '#ffc46b', c2: '#d9661f', rim: '#ffe29a', rimK: 0.7, texK: 0.18 };
      let s = K.aura('#ff8a1a', 94, 112, 0.5);
      // хвост-змейка
      const tail = 'M128 168 C152 180 180 170 178 148 C176 132 164 126 160 112';
      s += K.line(tail, '#14532d', 12) + K.line(tail, '#4ade80', 8) + `<path d="${tail}" fill="none" stroke="#166534" stroke-width="8" stroke-dasharray="2 5" opacity=".45"/>` + K.line('M136 172 C156 178 174 168 174 150', '#d9f99d', 2, { op: 0.8 });
      let sn = K.vol(K.ell(158, 104, 12, 9.5), { c1: '#86efac', c2: '#15803d', tex: false, lw: 2.2, line: '#14532d' });
      sn += K.eyes(159, 101, 4.6, 3.4, { iris: '#facc15', look: [-0.6, 0.2] }) + K.line('M147 108 L140 111 M140 111 l-4 -3 M140 111 l-3 4', '#ef4444', 1.6) + K.line('M149 107 Q153 110 157 108', '#14532d', 1.4);
      s += K.g(sn, 'rotate(-14 158 104)');
      // грива из язычков пламени
      for (const [a, h, d] of [[-172, 30, -0.2], [-150, 36, -0.7], [-128, 40, -1.1], [-104, 44, -0.4], [-76, 44, -0.9], [-52, 40, -0.3], [-30, 36, -1.3], [-8, 30, -0.6]]) {
        const t = a * Math.PI / 180;
        s += grFl(K, 100 + 36 * Math.cos(t), 92 + 30 * Math.sin(t), h, h * 0.62, a, '#ffd23f', '#e8431a', d);
      }
      // козья головка из-за плеча: шея, рожки, ушки, бородка
      let g = K.line('M64 146 C54 140 44 134 40 126', '#8a7a62', 12) + K.line('M64 146 C54 140 44 134 40 126', '#e7dcc8', 8);
      g += K.part('M32 112 C24 104 24 92 32 86 C32 94 36 102 40 106Z', '#d6c7a8', { line: '#6b5a44', lw: 1.6 }) + K.part('M44 110 C44 100 48 92 56 90 C52 96 50 104 50 110Z', '#d6c7a8', { line: '#6b5a44', lw: 1.6 });
      g += K.part('M26 120 C18 118 14 122 12 126 C18 128 24 126 28 124Z', '#f3e3c8', { line: '#6b5a44', lw: 1.4 }) + `<path d="M24 121 C19 121 17 123 16 125 C20 125 23 124 25 123Z" fill="#f9a8a0" opacity=".7"/>`;
      g += K.vol(K.ell(38, 122, 14, 12.5), { c1: '#fff6e6', c2: '#d9b98a', rim: '#ffe29a', tex: false, lw: 2.2, line: '#6b4a24' });
      g += K.part('M34 133 L38 142 L42 133Z', '#f3e3c8', { line: '#6b5a44', lw: 1.2 });
      g += K.closed(38, 120, 5.4, 3, true) + K.blush(29, 126, 3.4) + K.blush(47, 126, 3.4) + `<ellipse cx="38" cy="129" rx="3" ry="1.6" fill="#c98a6a"/>`;
      s += g;
      // тельце, светлое брюшко, задние лапки
      s += K.vol('M100 118 C134 118 148 140 146 158 C144 174 126 179 100 179 C74 179 56 174 54 158 C52 140 66 118 100 118Z', fur);
      s += `<ellipse cx="100" cy="158" rx="26" ry="18" fill="#fff0d0" opacity=".75"/>`;
      s += K.mirror(K.vol(K.ell(76, 174, 14, 7.5), { ...fur, tex: false, lw: 2.4 }) + K.line('M70 176 V181 M76 177 V182 M82 176 V181', '#9a3a0c', 1.4));
      // ушки и голова
      s += K.mirror(K.vol(K.ell(68, 66, 11, 10), { ...fur, tex: false, lw: 2.4 }) + `<ellipse cx="68" cy="67" rx="5.5" ry="5" fill="#f9a8a0"/>`);
      s += K.vol(K.ell(100, 94, 40, 34), fur);
      s += K.flame(100, 64, 20, 14, '#fff0a0', '#ff7a1a', { style: 'animation-delay:-.5s' });
      s += K.gloss(78, 76, 10, 5.5, -35, 0.35);
      // мордочка
      s += K.eyes(100, 90, 18, 11.5, { iris: '#e8741a', look: [0.05, 0.25] });
      s += K.blush(70, 106, 7) + K.blush(130, 106, 7);
      s += `<ellipse cx="100" cy="111" rx="16" ry="10" fill="#fff4dc" stroke="#b45309" stroke-width="1.2"/>`;
      s += `<path d="M94 103 Q100 100 106 103 Q104 108 100 109 Q96 108 94 103Z" fill="#6b2a14" stroke="${K.INK}" stroke-width="1.4" stroke-linejoin="round"/>` + K.mouth('cat', 100, 110, 11);
      s += K.mirror('<circle cx="90" cy="112" r=".9" fill="#b45309"/><circle cx="87" cy="115" r=".9" fill="#b45309"/><circle cx="92" cy="116" r=".9" fill="#b45309"/>');
      // каштан с жаровни в лапках
      s += `<g class="art-float">` + K.line('M96 142 C92 136 100 132 96 126 M104 142 C108 136 100 132 104 126', '#fff', 1.6, { op: 0.5 }) + `</g>`;
      s += K.part('M88 160 C86 150 94 144 100 144 C106 144 114 150 112 160 Q100 166 88 160Z', '#8b4513', { line: '#3b1d0c', lw: 1.8 });
      s += K.part('M93 150 Q100 146 107 150 L104 154 Q100 151 96 154Z', '#fde7b0', { line: '#8b4513', lw: 1 }) + `<ellipse cx="94" cy="155" rx="2.4" ry="1.4" fill="#fff" opacity=".4"/>`;
      s += K.mirror(K.vol(K.ell(84, 158, 9.5, 8), { ...fur, tex: false, lw: 2.2, t: 'rotate(-25 84 158)' }));
      // искорки от чиха
      s += K.spark(62, 122, 3.4, '#ffe08a', 'art-float') + K.spark(138, 124, 3, '#fff3b0', 'art-float') + K.spark(24, 70, 3, '#ffd23f') + K.spark(178, 72, 3.4, '#ffe08a') + K.spark(186, 118, 2.4, '#ffb347');
      return s;
    },

    // Химера: подросший Химерёнок — сидящий лев с огненной гривой и клыкастой ухмылкой; из спины на шее поднимается
    // сердитая коза с ребристыми рогами, хвост стал шипящим змеем. Спорят обо всём, но в лапах у льва — общий гирос
    // в бумажке с меандром (только о нём они и договорились). Из пасти вьётся дымок
    gr_himera(K) {
      const fur = { c1: '#ffb04a', c2: '#b8410c', rim: '#ffe29a', rimK: 0.75, texK: 0.2 };
      const goat = { c1: '#faf6ee', c2: '#a8987e', rim: '#ffe29a', tex: false, lw: 2.2, line: '#5a4a34' };
      let s = K.aura('#ff6a1a', 98, 104, 0.55);
      // хвост-змей слева
      const tail = 'M62 166 C32 174 14 154 20 132 C26 112 20 98 30 84';
      s += K.line(tail, '#14532d', 15) + K.line(tail, '#4ade80', 10) + `<path d="${tail}" fill="none" stroke="#166534" stroke-width="10" stroke-dasharray="2.4 6" opacity=".45"/>` + K.line('M56 170 C34 174 22 158 24 140', '#d9f99d', 2.2, { op: 0.8 });
      // коза на шее из спины
      s += K.line('M130 124 C140 108 146 94 150 80', '#6b5a44', 17) + K.line('M130 124 C140 108 146 94 150 80', '#efe6d6', 12.5);
      // спор: сердитые завитки над козой и змеем
      s += K.line('M176 50 l4 -5 l-1 5 l5 -3', '#fde68a', 1.8, { cls: 'art-blink' }) + K.line('M12 46 l5 4 l-4 1 l5 4', '#fde68a', 1.8, { cls: 'art-blink' });
      // львиное тело и задние лапы
      s += K.mirror(K.vol('M42 172 C36 152 48 138 66 140 C80 142 86 156 82 170 C80 178 70 180 58 180 C48 180 44 178 42 172Z', { ...fur, lw: 2.6 }) + K.line('M50 177 V181 M57 178 V182 M64 177 V181', '#7a2a08', 1.4));
      s += K.vol('M100 104 C134 104 152 128 152 152 C152 170 134 179 100 179 C66 179 48 170 48 152 C48 128 66 104 100 104Z', fur);
      s += `<ellipse cx="100" cy="156" rx="30" ry="20" fill="#fff0d0" opacity=".55"/>`;
      // грива-пламя: внешний и внутренний венцы
      for (let i = 0; i < 12; i++) {
        const a = -200 + i * 20, t = a * Math.PI / 180;
        s += grFl(K, 100 + 32 * Math.cos(t), 80 + 28 * Math.sin(t), 36 + (i % 2) * 8, 26, a, '#ffc233', '#c2330f', -i * 0.17);
      }
      for (let i = 0; i < 9; i++) {
        const a = -180 + i * 22.5, t = a * Math.PI / 180;
        s += grFl(K, 100 + 30 * Math.cos(t), 80 + 26 * Math.sin(t), 24, 17, a, '#fff0a0', '#ff8a1a', -i * 0.23);
      }
      let sn = K.vol('M20 72 C20 60 30 54 40 56 C50 58 56 66 54 74 C52 81 44 84 34 82 C26 81 20 78 20 72Z', { c1: '#86efac', c2: '#15803d', tex: false, lw: 2.4, line: '#14532d' });
      sn += K.eyes(35, 66, 5.2, 4, { iris: '#facc15', lid: 'angry', look: [0.5, 0.2] });
      sn += `<path d="M40 76 Q48 73 55 77 Q49 84 40 80Z" fill="#6b1d2a" stroke="${K.INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M44 75.6 l1.4 3.6 l1.4 -3.3Z M50 75.8 l1.2 3.4 l1.4 -3Z" fill="#fff"/>`;
      sn += K.line('M54 78 L63 82 M63 82 l3 -4 M63 82 l4 2', '#ef4444', 1.6);
      s += sn;
      s += K.part('M146 58 C138 42 144 26 160 22 C154 32 152 44 157 56Z', '#d6c7a8', { line: '#6b5a44', lw: 1.8 }) + K.line('M146 46 l6 -2 M145 38 l7 -1 M149 30 l6 1', '#8a7a62', 1.2);
      s += K.part('M158 56 C160 42 170 32 184 34 C176 40 170 48 168 60Z', '#d6c7a8', { line: '#6b5a44', lw: 1.8 }) + K.line('M163 46 l6 2 M168 39 l5 3', '#8a7a62', 1.2);
      s += K.part('M166 68 C176 64 184 68 188 74 C180 76 172 74 166 72Z', '#efe6d6', { line: '#6b5a44', lw: 1.4 });
      s += K.vol(K.ell(154, 68, 15, 14), goat);
      s += K.part('M146 80 L152 96 L158 80Z', '#e7dcc8', { line: '#6b5a44', lw: 1.4 });
      s += K.eyes(153, 65, 6, 4.2, { iris: '#d4a017', lid: 'angry', skin: '#efe6d6', look: [-0.7, 0.2] });
      s += `<circle cx="149" cy="76" r="1.1" fill="#5a4a34"/><circle cx="156" cy="76" r="1.1" fill="#5a4a34"/>` + K.mouth('frown', 152, 80, 8);
      // голова льва
      s += K.mirror(K.vol(K.ell(74, 56, 9, 8.5), { ...fur, tex: false, lw: 2.2 }) + `<ellipse cx="74" cy="57" rx="4.5" ry="4" fill="#f9a8a0"/>`);
      s += K.vol(K.ell(100, 80, 34, 30), fur);
      s += K.gloss(82, 64, 8, 4.5, -35, 0.35);
      s += K.eyes(100, 75, 14, 9, { iris: '#ffb020', lid: 'angry', skin: '#e88a2e', look: [0, 0.3] });
      s += `<ellipse cx="100" cy="95" rx="16" ry="10" fill="#fff4dc" stroke="#b45309" stroke-width="1.2"/>`;
      s += `<path d="M94 87 Q100 84 106 87 Q104 92 100 93 Q96 92 94 87Z" fill="#6b2a14" stroke="${K.INK}" stroke-width="1.4" stroke-linejoin="round"/>`;
      s += K.mouth('fang', 100, 97, 14);
      s += `<g class="art-float">` + K.line('M114 92 C122 88 120 80 128 78 C134 76 134 70 130 68', '#e5e7eb', 2, { op: 0.5 }) + `</g>`;
      // гирос в бумажке с меандром
      const pita = 'M83 124 Q100 116 117 124 L103 168 Q100 172 97 168Z';
      s += K.part(pita, '#f3d19a', { line: '#8a5a24', lw: 1.8 });
      s += grClip(K, pita, `<rect x="80" y="138" width="40" height="34" fill="#f8fafc"/>` + grKey(K, 82, 139, 36, 6, '#2563eb', 1.3));
      s += K.line('M84 138 H116', '#94a3b8', 1.2);
      s += K.line('M86 124 L84 108 M92 122 L93 106 M110 122 L114 108', '#8a5a0c', 4.6) + K.line('M86 124 L84 108 M92 122 L93 106 M110 122 L114 108', '#fcd34d', 3);
      s += `<circle cx="99" cy="119" r="5" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.2"/><circle cx="108" cy="121" r="4" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.2"/>` + K.line('M84 124 q4 -5 8 0 q4 -5 8 0 q4 -5 8 0 q4 -5 8 0', '#4d7c0f', 2.4) + `<path d="M90 118 q4 -4 8 0 q-4 3 -8 0z" fill="#8b4a2b"/>`;
      s += K.mirror(K.vol(K.ell(80, 132, 10, 8.5), { ...fur, tex: false, lw: 2.2, t: 'rotate(-20 80 132)' }));
      s += K.spark(24, 110, 3.4, '#ffe08a', 'art-float') + K.spark(180, 112, 3, '#fff3b0', 'art-float') + K.spark(100, 14, 3.2, '#ffe08a') + K.spark(186, 150, 2.4, '#ffb347');
      return s;
    },

    // Цербер: трёхголовый пёс, страж ворот Аида. Средняя голова настороже — глаза горят, левая сладко спит («z-z»),
    // правая с довольным видом жуёт медовую лепёшку. На шеях — ошейники с золотыми шипами, между головами тлеют
    // язычки подземного пламени, хвост кончается огоньком
    gr_kerber(K) {
      const fur = { c1: '#7a5442', c2: '#1f120c', rim: '#ffb347', rimK: 0.7, texK: 0.25 };
      let s = K.aura('#ff6a1a', 98, 104, 0.45);
      // хвост с огоньком
      const tail = 'M140 164 C164 172 180 158 176 136';
      s += K.line(tail, '#150b07', 12) + K.line(tail, '#5a3a2c', 7) + K.g(K.flame(176, 138, 26, 18, '#fff0a0', '#ff6a1a', { style: 'animation-delay:-.4s' }), 'rotate(-8 176 138)');
      // подземное пламя между головами
      s += K.flame(74, 76, 40, 24, '#ffd23f', '#d9290f', { style: 'animation-delay:-.7s' }) + K.flame(126, 76, 40, 24, '#ffd23f', '#d9290f', { style: 'animation-delay:-.2s' });
      // тело и лапы
      s += K.mirror(K.vol('M44 172 C38 154 48 140 64 142 C78 144 84 156 80 170 C78 178 70 180 58 180 C50 180 46 178 44 172Z', { ...fur, lw: 2.6 }));
      s += K.vol('M100 104 C134 104 154 126 154 150 C154 170 136 179 100 179 C64 179 46 170 46 150 C46 126 66 104 100 104Z', fur);
      s += `<path d="M100 118 C114 118 122 134 120 152 C118 166 110 172 100 172 C90 172 82 166 80 152 C78 134 86 118 100 118Z" fill="${K.lin(['#c49a7a', '#8a5a3a'])}" opacity=".85"/>`;
      const leg = 'M80 140 C79 152 78 162 76 168 C72 172 72 180 84 180 C94 180 99 178 98 170 C97 162 97 152 97 142Z';
      s += K.mirror(K.vol(leg, { ...fur, lw: 2.4 }) + K.line('M82 175 V180 M88 174 V180 M94 175 V179', '#0f0805', 1.6));
      s += `<ellipse cx="100" cy="150" rx="40" ry="22" fill="${K.rad([[0, '#ff8a2a', 0.35], [1, '#ff5a14', 0]])}"/>`;
      // шеи
      s += K.line('M72 118 C62 108 56 100 52 92', '#150b07', 26) + K.line('M72 118 C62 108 56 100 52 92', '#5a3a2c', 21);
      s += K.line('M128 118 C138 108 144 100 148 92', '#150b07', 26) + K.line('M128 118 C138 108 144 100 148 92', '#5a3a2c', 21);
      // голова: уши торчком, морда, нос, рыжие брови; face — лицо поверх
      const head = (x, y, r, face) => {
        let h = `<path d="M${f(x - r * 0.85)} ${f(y - r * 0.2)} L${f(x - r * 0.8)} ${f(y - r * 1.45)} L${f(x - r * 0.18)} ${f(y - r * 0.8)}Z M${f(x + r * 0.85)} ${f(y - r * 0.2)} L${f(x + r * 0.8)} ${f(y - r * 1.45)} L${f(x + r * 0.18)} ${f(y - r * 0.8)}Z" fill="#3a2419" stroke="#0f0805" stroke-width="2" stroke-linejoin="round"/>` +
          `<path d="M${f(x - r * 0.72)} ${f(y - r * 0.4)} L${f(x - r * 0.7)} ${f(y - r * 1.12)} L${f(x - r * 0.36)} ${f(y - r * 0.78)}Z M${f(x + r * 0.72)} ${f(y - r * 0.4)} L${f(x + r * 0.7)} ${f(y - r * 1.12)} L${f(x + r * 0.36)} ${f(y - r * 0.78)}Z" fill="#ff8a5a" opacity=".8"/>`;
        h += K.vol(K.ell(x, y, r, r * 0.9), fur);
        h += `<ellipse cx="${x}" cy="${f(y + r * 0.42)}" rx="${f(r * 0.56)}" ry="${f(r * 0.4)}" fill="${K.lin(['#d9b08c', '#a0704c'])}" stroke="#3a2419" stroke-width="1.4"/>`;
        h += `<ellipse cx="${f(x - r * 0.36)}" cy="${f(y - r * 0.5)}" rx="${f(r * 0.14)}" ry="${f(r * 0.08)}" fill="#d9a066"/><ellipse cx="${f(x + r * 0.36)}" cy="${f(y - r * 0.5)}" rx="${f(r * 0.14)}" ry="${f(r * 0.08)}" fill="#d9a066"/>`;
        h += `<ellipse cx="${x}" cy="${f(y + r * 0.22)}" rx="${f(r * 0.2)}" ry="${f(r * 0.14)}" fill="#120a06"/><ellipse cx="${f(x - r * 0.06)}" cy="${f(y + r * 0.18)}" rx="${f(r * 0.07)}" ry="${f(r * 0.04)}" fill="#fff" opacity=".6"/>`;
        return h + face;
      };
      // ошейник с золотыми шипами
      const collar = (x, y, w) => K.part(`M${x - w} ${y - 3} Q${x} ${y + 5} ${x + w} ${y - 3} L${x + w} ${y + 4} Q${x} ${y + 12} ${x - w} ${y + 4}Z`, '#b91c1c', { line: '#450a0a', lw: 1.6 }) +
        [-0.7, -0.35, 0, 0.35, 0.7].map(k => `<path d="M${f(x + k * w - 2.6)} ${f(y + 4 + (1 - k * k) * 4)} l2.6 ${f(-6)} l2.6 6Z" fill="#fcd34d" stroke="#78350f" stroke-width="1"/>`).join('');
      s += collar(56, 106, 16) + collar(144, 106, 16);
      // левая голова спит
      s += head(50, 88, 20, K.closed(50, 84, 8, 4.4, false) + K.line('M45 102 Q50 105 55 102', K.INK, 1.8) + grZ(18, 56, 1, '#fde68a', -0.3) + grZ(10, 42, 0.7, '#fde68a', -1.1));
      // правая голова жуёт медовую лепёшку
      s += head(150, 88, 20, K.closed(150, 84, 8, 4.4, true) + K.blush(136, 94, 3.8) + K.blush(164, 94, 3.8) +
        `<ellipse cx="156" cy="104" rx="11" ry="6.5" fill="${K.lin(['#fcd98a', '#d98f2b'])}" stroke="#7c3a0a" stroke-width="1.6"/>` + K.line('M149 102 L162 106 M151 106 L160 100', '#a8601a', 1, { op: 0.7 }) +
        `<path d="M160 109 q1.4 5 0 7 q-1.6 -2 0 -7z" fill="#fbbf24" stroke="#b45309" stroke-width=".8"/>`);
      // средняя голова настороже
      s += collar(100, 92, 20);
      s += head(100, 66, 26, K.eyes(100, 60, 10, 6.8, { iris: '#ff9d1a', lid: 'angry', skin: '#4a2e22', look: [0, 0.3] }) + K.mouth('fang', 100, 80, 13));
      s += `<circle class="art-blink" cx="90" cy="60" r="9" fill="${K.rad([[0, '#ffd23f', 0.5], [1, '#ff6a1a', 0]])}"/><circle class="art-blink" cx="110" cy="60" r="9" fill="${K.rad([[0, '#ffd23f', 0.5], [1, '#ff6a1a', 0]])}"/>`;
      s += K.gloss(88, 46, 6, 3.2, -35, 0.3);
      s += K.spark(24, 120, 3.4, '#ffd23f', 'art-float') + K.spark(178, 60, 3, '#ffe08a', 'art-float') + K.spark(100, 14, 3, '#fff3b0') + K.spark(186, 110, 2.4, '#ffb347');
      return s;
    },

    // Гиппокампчик: морской жеребёнок в мраморной чаше фонтана с меандром. Ушки, плавник-чёлка, плавники-щёчки,
    // чешуйчатая грудка; передними копытцами держит монетку с совой Афины, рыбий хвостик с веером выгибается из воды
    gr_gippokampik(K) {
      const sk = { c1: '#8ef0e6', c2: '#0e8a9a', rim: '#c8f3ff', rimK: 0.7, texK: 0.2 };
      const fin = K.lin(['#bae6fd', '#38bdf8', '#0369a1']);
      let s = K.aura('#38bdf8', 92, 104, 0.45);
      // задний край чаши и вода
      s += `<ellipse cx="100" cy="150" rx="74" ry="16" fill="${K.lin(['#f1f5f9', '#94a3b8'])}" stroke="#475569" stroke-width="2"/>`;
      s += `<ellipse cx="100" cy="152" rx="66" ry="11" fill="${K.lin(['#7dd3fc', '#0369a1'])}"/>`;
      // хвостик с веером
      const tail = 'M122 152 C142 146 154 130 152 116 C150 106 142 104 138 110';
      s += K.line(tail, '#0b4f5c', 14) + K.line(tail, '#2cc5c0', 10) + `<path d="${tail}" fill="none" stroke="#0e7490" stroke-width="10" stroke-dasharray="2 5" opacity=".4"/>`;
      s += `<path d="M138 110 C128 98 130 86 138 80 C140 88 146 92 154 92 C152 100 146 106 138 110Z" fill="${fin}" stroke="#0c4a6e" stroke-width="1.8" stroke-linejoin="round"/>` + K.line('M138 108 L136 86 M138 108 L144 90 M138 108 L150 96', '#e0f2fe', 1.1, { op: 0.8 });
      // грудка из воды
      s += K.vol('M78 154 C74 134 78 116 88 106 L112 106 C122 116 126 134 122 154Z', sk);
      s += K.line('M88 124 q4 4 8 0 q4 4 8 0 q4 4 8 0 M86 136 q4 4 7 0 q4 4 7 0 q4 4 7 0 q4 4 7 0', '#e0fbff', 1.4, { op: 0.7 });
      s += `<ellipse cx="100" cy="151" rx="28" ry="5" fill="none" stroke="#e0f2fe" stroke-width="1.6" opacity=".8"/>`;
      // ушки, плавник-чёлка, плавники-щёчки
      s += K.mirror(K.vol('M70 60 C64 48 66 36 72 30 C78 38 84 46 84 56Z', { ...sk, tex: false, lw: 2.2 }) + `<path d="M72 52 C70 46 71 40 73 36 C76 42 79 47 80 53Z" fill="#f9a8d4" opacity=".7"/>`);
      s += K.mirror(`<path d="M72 84 C58 78 48 82 44 92 C52 92 60 96 66 98Z" fill="${fin}" stroke="#0c4a6e" stroke-width="1.6" stroke-linejoin="round"/>` + K.line('M70 88 L50 88 M70 90 L54 94', '#e0f2fe', 1, { op: 0.8 }));
      s += K.vol('M100 44 C124 44 134 60 132 78 C131 92 124 102 116 110 C112 116 106 118 100 118 C94 118 88 116 84 110 C76 102 69 92 68 78 C66 60 76 44 100 44Z', sk);
      s += `<path d="M88 50 C86 36 92 26 100 20 C100 28 104 32 110 30 C112 40 110 48 106 52Z" fill="${fin}" stroke="#0c4a6e" stroke-width="1.8" stroke-linejoin="round"/>` + K.line('M96 50 L98 28 M101 50 L106 34', '#e0f2fe', 1.1, { op: 0.8 });
      s += K.gloss(80, 58, 8, 4.5, -35, 0.4);
      // мордочка
      s += `<ellipse cx="100" cy="103" rx="18" ry="13" fill="${K.lin(['#e6fffb', '#a5f3eb'])}" stroke="#0e7490" stroke-width="1.6"/>`;
      s += `<ellipse cx="93" cy="101" rx="2.2" ry="1.6" fill="#0b4f5c"/><ellipse cx="107" cy="101" rx="2.2" ry="1.6" fill="#0b4f5c"/>` + K.mouth('smile', 100, 108, 10);
      s += K.eyes(100, 76, 16, 11, { iris: '#0ea5e9', lash: true, look: [0, 0.25] });
      s += K.blush(76, 94, 5.5) + K.blush(124, 94, 5.5);
      // копытца на краю чаши и монетка с совой
      s += `<circle class="art-aura" cx="100" cy="152" r="14" fill="${K.rad([[0, '#fff7c2', 0.8], [1, '#fbbf24', 0]])}"/>`;
      s += `<circle cx="100" cy="152" r="8" fill="${K.lin(['#fde68a', '#d4a017'])}" stroke="#78350f" stroke-width="1.6"/><circle cx="100" cy="152" r="5.6" fill="none" stroke="#b45309" stroke-width=".8"/>`;
      s += `<circle cx="98" cy="150.5" r="1.3" fill="#78350f"/><circle cx="102" cy="150.5" r="1.3" fill="#78350f"/><path d="M99 153l1 1.6 1-1.6z" fill="#78350f"/>`;
      s += K.mirror(K.vol(K.ell(86, 154, 8, 6.5), { c1: '#1fb5b0', c2: '#0b4f5c', tex: false, lw: 2, t: 'rotate(-20 86 154)' }));
      // передний край чаши с меандром
      s += K.vol('M26 150 C28 168 58 179 100 179 C142 179 172 168 174 150 C160 160 134 166 100 166 C66 166 40 160 26 150Z', { c1: '#ffffff', c2: '#94a3b8', rim: '#c8f3ff', tex: false, lw: 2.2, line: '#475569' });
      s += grKey(K, 58, 167, 84, 6, '#0e7490', 1.3);
      // брызги и пузырьки
      s += `<g class="art-float"><circle cx="40" cy="120" r="3.4" fill="none" stroke="#e0f2fe" stroke-width="1.4"/><circle cx="160" cy="70" r="2.6" fill="none" stroke="#e0f2fe" stroke-width="1.2"/><circle cx="34" cy="96" r="2" fill="none" stroke="#bae6fd" stroke-width="1"/></g>`;
      s += `<path class="art-blink" d="M52 142q2 4 0 6q-2-2 0-6zM150 142q2 4 0 6q-2-2 0-6z" fill="#7dd3fc"/>`;
      s += K.spark(26, 64, 3.4, '#e0f2fe') + K.spark(174, 44, 3, '#fff') + K.spark(180, 126, 2.4, '#bae6fd', 'art-float');
      return s;
    },

    // Гиппокамп: морской конь из упряжки Посейдона скачет по волнам в профиль — зубчатый плавник-грива вдоль шеи,
    // золотая узда, передние ноги в галопе с плавниками вместо копыт, длинный чешуйчатый рыбий хвост с веером
    gr_gippokamp(K) {
      const sk = { c1: '#6ee7d8', c2: '#0f5f7a', rim: '#c8f3ff', rimK: 0.7, texK: 0.22 };
      const fin = K.lin(['#bae6fd', '#38bdf8', '#0c4a6e']);
      let s = K.aura('#38bdf8', 96, 100, 0.45);
      // хвост
      const tail = 'M116 116 C134 140 158 150 172 132 C180 120 174 102 162 104';
      s += K.line(tail, '#0b3d4f', 24) + K.line(tail, '#1fb5b0', 19) + `<path d="${tail}" fill="none" stroke="#0e6f7a" stroke-width="19" stroke-dasharray="3 6" opacity=".4"/>` + K.line('M122 132 C138 148 158 152 170 140', '#bff5ee', 3, { op: 0.6 });
      s += `<path d="M162 104 C152 88 156 72 166 64 C168 74 176 80 188 80 C186 92 176 102 162 104Z" fill="${fin}" stroke="#0c4a6e" stroke-width="2" stroke-linejoin="round"/>` + K.line('M163 102 L166 72 M163 102 L176 80 M163 102 L184 88', '#e0f2fe', 1.2, { op: 0.8 });
      // зубчатая грива-плавник
      s += `<path d="M80 44 L90 26 L96 42 L108 30 L110 48 L124 42 L120 58 L136 58 L128 72 L142 78 L130 88 L140 98 L124 100Z" fill="${fin}" stroke="#0c4a6e" stroke-width="2" stroke-linejoin="round"/>`;
      // тело
      s += K.vol('M84 66 C104 68 124 88 128 108 C132 128 120 140 102 140 C88 140 78 130 74 118 C70 106 72 90 76 80Z', sk);
      s += K.line('M92 104 q4 4 8 0 q4 4 8 0 q4 4 8 0 M88 118 q4 4 8 0 q4 4 8 0 q4 4 8 0', '#e0fbff', 1.4, { op: 0.7 });
      // ноги в галопе с плавниками
      const leg = (d, fx, fy, r) => K.line(d, '#0b3d4f', 13) + K.line(d, '#2cc5c0', 9) + K.g(`<path d="M0 0 C-10 -6 -18 -2 -22 6 C-14 6 -8 8 -4 12Z" fill="${fin}" stroke="#0c4a6e" stroke-width="1.6" stroke-linejoin="round"/>`, `translate(${fx} ${fy}) rotate(${r})`);
      s += leg('M88 122 C80 128 68 130 58 124', 58, 124, 10) + leg('M100 134 C98 146 90 154 78 156', 78, 156, -20);
      // голова в профиль
      s += `<path d="M78 40 L84 20 L92 40Z" fill="#2cc5c0" stroke="#0b3d4f" stroke-width="2" stroke-linejoin="round"/><path d="M81 38 L84 26 L88 38Z" fill="#f9a8d4" opacity=".7"/>`;
      s += K.vol('M76 36 C88 36 96 46 96 58 L94 86 C92 94 82 96 74 92 C66 88 58 88 48 88 C38 88 30 82 32 74 C34 66 44 60 52 56 C58 44 66 36 76 36Z', sk);
      s += `<path d="M86 62 C96 58 104 62 106 70 C100 70 94 74 90 78Z" fill="${fin}" stroke="#0c4a6e" stroke-width="1.6" stroke-linejoin="round"/>`;
      s += K.gloss(66, 46, 7, 4, -30, 0.4);
      s += `<ellipse cx="39" cy="73" rx="2.8" ry="2" fill="#0b3d4f"/>` + K.line('M36 82 Q42 86 49 83', K.INK, 2);
      s += `<g class="art-eyes">${K.eye(70, 60, 9, { iris: '#0ea5e9', look: [-0.6, 0.1], lash: true })}</g>` + K.blush(60, 76, 5);
      // золотая узда
      s += K.line('M48 62 L56 88 M52 64 C66 68 82 68 94 60', '#78350f', 4.4) + K.line('M48 62 L56 88 M52 64 C66 68 82 68 94 60', '#fcd34d', 2.4);
      s += `<circle cx="56" cy="86" r="3.6" fill="none" stroke="#fcd34d" stroke-width="2"/>` + K.line('M59 86 C80 96 100 80 112 70', '#fcd34d', 1.6, { op: 0.9 });
      // волны и брызги
      s += grWaves(K, 0, 200, 164);
      s += `<g class="art-float"><path d="M42 150q3 6 0 9q-3-3 0-9zM150 146q3 6 0 9q-3-3 0-9z" fill="#bae6fd"/><circle cx="30" cy="136" r="2.4" fill="none" stroke="#e0f2fe" stroke-width="1.2"/></g>`;
      s += K.spark(24, 40, 3.4, '#e0f2fe') + K.spark(180, 40, 3, '#fff', 'art-float') + K.spark(140, 20, 2.4, '#bae6fd');
      return s;
    },

    // Сатирёнок: козлоногий малыш на мраморной ступеньке амфитеатра — кудряшки с плющом, рожки-пенёчки, ушки торчком
    // в стороны, мохнатые штанишки и копытца, хвостик. Надул щёки и дудит в свирель, вокруг летят нотки
    gr_satirenok(K) {
      const skin = '#f6c9a0', sk = { c1: skin, c2: '#d0906a', rim: '#fff0c0', tex: false, hiK: 0.2, lw: 2.4, line: '#7a4a2a' };
      const fur = { c1: '#a8744a', c2: '#4a2c14', rim: '#e4ffb0', rimK: 0.5, texK: 0.15 };
      let s = K.aura('#84cc16', 92, 110, 0.4);
      // ступенька амфитеатра
      s += K.vol('M30 168 H170 V182 H30Z', { c1: '#ffffff', c2: '#a3adbd', rim: '#e4ffb0', tex: false, lw: 1.8, line: '#64748b' }) + grKey(K, 40, 172, 120, 6, '#94a3b8', 1.2);
      // хвостик
      s += K.part('M126 148 C140 144 148 134 146 124 C140 130 134 132 126 134Z', '#8a5a2e', { line: '#3b1d0c', lw: 1.6 });
      // ножки: мохнатые бёдрышки и копытца
      const leg = 'M72 146 C64 150 62 158 66 164 L68 166 H86 L88 160 C90 152 84 146 78 144Z';
      s += K.mirror(K.vol(leg, { ...fur, lw: 2.2 }) + K.part('M67 162 H87 L87 169 H67Z', '#2a1a10', { line: '#0f0805', lw: 1.6 }) + K.line('M77 162 V169', '#57534e', 1.2));
      // тельце: голое сверху, мохнатое снизу, поясок из листьев
      const body = K.ell(100, 138, 30, 25);
      s += K.vol(body, sk);
      s += grClip(K, body, `<path d="M60 142 Q66 134 72 142 Q78 134 84 142 Q90 134 96 142 Q102 134 108 142 Q114 134 120 142 Q126 134 132 142 Q138 134 144 142 V180 H60Z" fill="${K.lin(['#b07a4c', '#5a3418'])}" stroke="#3b1d0c" stroke-width="1.6" stroke-linejoin="round"/>`);
      s += K.leaf(84, 140, 13, 160, '#65a30d') + K.leaf(116, 140, 13, 20, '#65a30d') + K.leaf(100, 142, 11, 90, '#84cc16');
      // ушки в стороны и рожки
      s += K.mirror(K.vol('M70 76 C58 70 46 72 40 78 C48 86 60 88 70 86Z', sk) + `<path d="M64 78 C56 76 50 77 46 79 C52 83 58 84 64 83Z" fill="#f9a8b4" opacity=".7"/>`);
      s += K.mirror(K.part('M84 54 C82 46 84 40 88 36 C92 42 93 48 93 54Z', '#efe2c4', { line: '#6b5a44', lw: 1.8 }) + K.line('M85 48 H91 M86 43 H90', '#a8987e', 1));
      // голова и кудряшки
      s += K.vol(K.ell(100, 82, 32, 29), sk);
      for (let i = 0; i < 9; i++) {
        const t = (-170 + i * 20) * Math.PI / 180, x = 100 + 29 * Math.cos(t), y = 74 + 22 * Math.sin(t);
        s += K.vol(K.ell(+f(x), +f(y), 8, 7.4), { c1: '#a8744a', c2: '#4a2c14', tex: false, lw: 1.8, rimK: 0.4, hiK: 0.3 });
      }
      s += K.leaf(76, 56, 12, -150, '#65a30d') + K.leaf(124, 56, 12, -30, '#65a30d') + `<circle cx="100" cy="50" r="3" fill="#312e81"/><circle cx="104" cy="53" r="2.6" fill="#4338ca"/><circle cx="97" cy="54" r="2.6" fill="#4338ca"/>`;
      s += K.gloss(80, 70, 6, 3.4, -35, 0.35);
      // мордочка: брови домиком, надутые щёки
      s += K.eyes(100, 86, 13, 9.5, { iris: '#65a30d', look: [0, -0.2] });
      s += K.line('M81 72 Q87 69 92 72 M108 72 Q113 69 119 72', '#5a3418', 2.2);
      s += `<ellipse cx="78" cy="100" rx="9" ry="7" fill="#ff7aa8" opacity=".45"/><ellipse cx="122" cy="100" rx="9" ry="7" fill="#ff7aa8" opacity=".45"/>`;
      // свирель у рта и ладошки
      s += grSyrinx(K, 84, 102, [30, 26, 22, 18, 14], 6.4);
      s += K.vol(K.ell(81, 116, 6.5, 6), { ...sk, lw: 2 }) + K.vol(K.ell(119, 116, 6.5, 6), { ...sk, lw: 2 });
      // нотки
      s += grNote(150, 76, 1, '#d9f99d', -0.3) + grNote(166, 110, 0.75, '#fde68a', -1.2) + grNote(40, 60, 0.7, '#d9f99d', -2);
      s += K.spark(30, 110, 3, '#e4ffb0') + K.spark(174, 44, 2.6, '#fde68a', 'art-float');
      return s;
    },

    // Сатир: подросший козлоногий весельчак из свиты Диониса — венок из плюща, изогнутые рожки, подмигивает и
    // широко ухмыляется, бородка клинышком. Через плечо — пятнистая шкурка оленёнка (небрида), в поднятой руке
    // гроздь винограда, в опущенной — свирель. Отплясывает, звенят нотки
    gr_satir(K) {
      const skin = '#f0b98a', sk = { c1: skin, c2: '#c47e52', rim: '#fff0c0', tex: false, hiK: 0.18, lw: 2.4, line: '#6b3a1a' };
      const fur = { c1: '#a8703e', c2: '#4a2a10', rim: '#ffe0a8', rimK: 0.35, texK: 0.1 };
      let s = K.aura('#84cc16', 96, 104, 0.4);
      s += K.part('M122 126 C136 122 146 112 146 102 C138 108 130 110 122 112Z', '#6b4220', { line: '#2a1a0c', lw: 1.6 });
      // ноги с коленками назад и копыта
      const leg = 'M80 134 C72 142 70 154 76 160 C78 164 76 168 74 172 H88 C90 166 90 162 92 156 C96 148 96 140 94 132Z';
      s += K.mirror(K.vol(leg, { ...fur, lw: 2.4 }) + K.part('M72 170 H90 V178 H72Z', '#2a1a10', { line: '#0f0805', lw: 1.6 }) + K.line('M81 170 V178', '#57534e', 1.2));
      s += K.vol('M76 116 H124 C130 124 130 136 124 142 Q112 136 100 144 Q88 136 76 142 C70 136 70 124 76 116Z', fur);
      // торс и небрида
      s += K.vol('M82 84 C76 94 74 108 78 122 H122 C126 108 124 94 118 84 Q100 78 82 84Z', sk);
      s += K.part('M80 86 C94 90 112 110 124 124 L116 130 C104 116 90 102 78 96Z', '#d9a066', { line: '#7a4a1c', lw: 1.6 });
      s += '<g fill="#fff4dc">' + [[88, 94], [98, 102], [106, 112], [114, 120], [94, 98]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${i % 2 ? 1.8 : 2.4}" ry="1.6"/>`).join('') + '</g>';
      // левая рука со свирелью
      const armL = 'M82 90 C72 100 66 112 64 124';
      s += K.line(armL, '#6b3a1a', 11) + K.line(armL, skin, 7.5);
      s += grSyrinx(K, 44, 112, [28, 24, 20, 16, 12], 5.6, 'rotate(-14 64 126)');
      s += K.vol(K.ell(64, 126, 6.5, 6), sk);
      // правая рука с гроздью винограда
      const armR = 'M118 90 C130 86 138 76 140 64';
      s += K.line(armR, '#6b3a1a', 11) + K.line(armR, skin, 7.5);
      s += K.line('M146 30 Q148 26 152 24', '#65a30d', 2.2) + K.leaf(150, 30, 14, -30, '#65a30d');
      [[4, 36], [3, 44], [2, 51], [1, 57]].forEach(([n, y]) => { for (let i = 0; i < n; i++) s += `<circle cx="${f(146 + (i - (n - 1) / 2) * 7.4)}" cy="${y}" r="4.4" fill="${K.rad([[0, '#c4b5fd'], [0.6, '#7c3aed'], [1, '#3b0764']], 0.35, 0.3, 0.8)}" stroke="#2e1065" stroke-width="1.1"/>`; });
      s += K.vol(K.ell(140, 64, 6.5, 6), sk);
      // уши, рожки, голова
      s += K.mirror(K.vol('M78 58 C66 52 56 52 50 56 C56 64 66 68 78 66Z', sk) + `<path d="M72 59 C66 57 60 57 56 58 C60 62 66 63 72 63Z" fill="#f9a8b4" opacity=".7"/>`);
      s += K.mirror(K.part('M86 42 C80 32 80 22 86 14 C88 24 94 30 96 38Z', '#efe2c4', { line: '#6b5a44', lw: 1.8 }) + K.line('M84 32 l6 -1 M84 25 l5 0', '#a8987e', 1));
      s += K.vol(K.ell(100, 60, 24, 23), sk);
      for (let i = 0; i < 8; i++) {
        const t = (-165 + i * 21.4) * Math.PI / 180;
        s += K.vol(K.ell(+f(100 + 22 * Math.cos(t)), +f(52 + 17 * Math.sin(t)), 6.4, 6), { c1: '#8a5a2e', c2: '#3b2412', tex: false, lw: 1.6, rimK: 0.4, hiK: 0.3 });
      }
      s += grLaurel(K, 100, 48, 24, 13, -175, -5, 7, '#65a30d', 5);
      s += `<circle cx="78" cy="50" r="2.4" fill="#312e81"/><circle cx="122" cy="50" r="2.4" fill="#312e81"/>`;
      // подмигивает и ухмыляется, бородка клинышком
      s += `<g class="art-eyes">${K.eye(91, 62, 6.8, { iris: '#65a30d', look: [0.3, 0.1] })}</g>` + K.line('M103 62 Q109 57 115 62', K.INK, 2.6);
      s += K.line('M84 52 Q90 49 96 52 M104 53 Q110 50 116 54', '#3b2412', 2);
      s += K.blush(84, 72, 4.4) + K.blush(117, 72, 4.4);
      s += K.mouth('grin', 100, 72, 14);
      s += K.part('M95 82 L100 94 L105 82Z', '#6b4220', { line: '#2a1a0c', lw: 1.4 });
      s += grNote(34, 80, 0.9, '#d9f99d', -0.5) + grNote(172, 92, 0.8, '#fde68a', -1.4) + grNote(26, 150, 0.7, '#fde68a', -2.1);
      s += K.spark(170, 140, 3, '#e4ffb0') + K.spark(24, 30, 2.6, '#fde68a', 'art-float');
      return s;
    },

    // Пан: козлоногий бог лесов и пастбищ. Большие рога изгибаются назад, сосновый венок с шишками, длинная козлиная
    // борода, на плечах шкура, лукавый прищур. Обеими руками держит большую тростниковую свирель; по бокам — тростник,
    // вокруг разлетаются нотки. Сразу видно: вот-вот сыграет так, что сквер пустится в пляс
    gr_pan(K) {
      const skin = '#e2a877', sk = { c1: skin, c2: '#a8683e', rim: '#fff0c0', tex: false, hiK: 0.18, lw: 2.4, line: '#5a2e12' };
      const fur = { c1: '#8a5a30', c2: '#35200c', rim: '#ffe0a8', rimK: 0.35, texK: 0.12 };
      let s = K.aura('#65a30d', 98, 100, 0.45);
      // тростник
      const reed = (x, h, d) => `<g class="art-sway" style="animation-delay:${d}s;transform-origin:50% 100%">` + K.line(`M${x} 180 Q${x + 2} ${180 - h / 2} ${x} ${180 - h}`, '#3f6212', 3.4) + K.line(`M${x} 180 Q${x + 2} ${180 - h / 2} ${x} ${180 - h}`, '#84cc16', 1.6) +
        `<ellipse cx="${x}" cy="${180 - h + 8}" rx="3.6" ry="9" fill="${K.lin(['#a16207', '#57300a'])}" stroke="#3b1d0c" stroke-width="1.2"/>` + K.leaf(x, 180 - h * 0.45, 22, -60, '#65a30d') + '</g>';
      s += reed(16, 110, -0.2) + reed(30, 86, -1) + reed(184, 104, -0.6) + reed(170, 80, -1.4);
      s += K.part('M124 124 C140 120 150 108 150 96 C142 102 132 106 124 108Z', '#4a2c14', { line: '#1a0e05', lw: 1.6 });
      // ноги и копыта
      const leg = 'M76 130 C66 140 62 154 70 162 C72 166 70 170 68 174 H86 C88 168 88 164 90 158 C96 148 96 136 92 128Z';
      s += K.mirror(K.vol(leg, { ...fur, lw: 2.4 }) + K.part('M66 172 H88 V180 H66Z', '#1c120a', { line: '#0f0805', lw: 1.6 }) + K.line('M77 172 V180', '#57534e', 1.2) +
        K.line('M72 146 l-5 3 M74 156 l-6 2 M70 138 l-5 1', '#2a180a', 1.6));
      s += K.vol('M70 110 H130 C138 120 138 134 130 142 Q116 134 100 144 Q84 134 70 142 C62 134 62 120 70 110Z', fur);
      // торс
      s += K.vol('M76 78 C68 90 66 104 72 116 H128 C134 104 132 90 124 78 Q100 70 76 78Z', sk);
      s += K.line('M88 96 Q94 100 100 96 Q106 100 112 96', '#a8683e', 1.6, { op: 0.7 });
      // козья шкура на плечах
      s += K.part('M68 84 C76 74 92 72 100 76 C108 72 124 74 132 84 C130 92 124 94 120 90 C112 84 88 84 80 90 C76 94 70 92 68 84Z', '#c9b8a0', { line: '#5a4a34', lw: 1.8 });
      s += '<g fill="#8a7a62">' + [[78, 82], [90, 79], [112, 79], [124, 82]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="2"/>`).join('') + '</g>';
      // рога
      s += K.mirror(K.part('M84 38 C74 24 58 16 42 22 C34 26 34 36 42 38 C48 30 60 30 70 36 C74 40 78 44 80 48Z', '#e7d7b8', { line: '#5a4a34', lw: 2 }) + K.line('M72 30 l-2 6 M62 26 l0 7 M52 24 l2 6', '#a8987e', 1.4));
      // уши и голова
      s += K.mirror(K.vol('M74 56 C62 50 50 50 44 54 C50 62 62 66 74 64Z', sk) + `<path d="M68 57 C62 55 56 55 51 56 C56 60 62 61 68 61Z" fill="#f9a8b4" opacity=".6"/>`);
      s += K.vol('M100 30 C120 30 130 44 129 58 C128 72 118 82 100 82 C82 82 72 72 71 58 C70 44 80 30 100 30Z', sk);
      s += K.part('M74 50 C74 36 86 28 100 28 C114 28 126 36 126 50 C120 42 112 40 106 44 C102 40 98 40 94 44 C88 40 80 42 74 50Z', '#4a2c14', { line: '#1a0e05', lw: 1.6 });
      // сосновый венок с шишками
      s += grLaurel(K, 100, 42, 28, 14, -178, -2, 9, '#3f6212', 5.4);
      s += K.mirror(`<ellipse cx="72" cy="48" rx="4" ry="5.4" fill="${K.lin(['#b45309', '#57300a'])}" stroke="#3b1d0c" stroke-width="1.1"/>` + K.line('M69 46 H75 M69 50 H75', '#3b1d0c', 0.9));
      s += K.gloss(84, 46, 6, 3.2, -30, 0.3);
      // лукавый прищур: одна бровь вскинута
      s += K.eyes(100, 58, 11, 7, { iris: '#84cc16', lid: 'half', skin, look: [0.5, 0.1] });
      s += K.line('M80 46 Q88 42 95 47 M105 49 Q112 50 120 48', '#2a180a', 2.6);
      // борода
      s += K.vol('M84 74 C84 90 92 106 100 116 C108 106 116 90 116 74Z', { c1: '#8a5a2e', c2: '#3b2412', tex: false, lw: 2, line: '#1a0e05' });
      s += K.line('M94 86 Q96 98 100 108 M106 86 Q104 98 100 108', '#2a180a', 1.4, { op: 0.6 });
      // большая свирель и руки
      s += grSyrinx(K, 72, 70, [38, 34, 30, 26, 22, 18, 14], 8);
      s += K.vol(K.ell(70, 84, 8, 7.5), sk) + K.vol(K.ell(130, 84, 8, 7.5), sk);
      s += K.line('M60 64 q-6 -6 -12 -2 M140 64 q6 -6 12 -2 M56 72 q-8 -2 -12 4 M144 72 q8 -2 12 4', '#d9f99d', 1.8, { op: 0.7, cls: 'art-blink' });
      s += grNote(46, 110, 1, '#d9f99d', -0.3) + grNote(156, 120, 0.9, '#fde68a', -1.1) + grNote(150, 20, 0.8, '#d9f99d', -1.8) + grNote(40, 20, 0.7, '#fde68a', -2.4);
      s += K.spark(100, 12, 3.2, '#e4ffb0') + K.spark(186, 150, 2.6, '#fde68a', 'art-float');
      return s;
    },

    // Артемида: богиня охоты и луны. За спиной — серебряный лунный серп, волосы собраны в узел с серпиком-диадемой,
    // короткий зелёный хитон с золотым меандром, колчан со стрелами за плечом, золотой лук в руке, сандалии с
    // оплёткой. Другой рукой гладит серебряную лань с золотыми рожками (Керинейская лань — её любимица)
    gr_artemida(K) {
      const skin = '#fde2c4', sk = { c1: skin, c2: '#e0a880', rim: '#fff3d6', tex: false, lw: 2.2, line: '#8a5a3a' };
      const silver = { c1: '#ffffff', c2: '#9aa8bd', rim: '#e0f2fe', rimK: 0.7, tex: false, lw: 2.2, line: '#475569' };
      let s = K.aura('#84cc16', 96, 104, 0.35);
      s += `<circle class="art-aura" cx="118" cy="52" r="50" fill="${K.rad([[0, '#f1f5f9', 0.55], [1, '#cbd5e1', 0]])}"/>`;
      s += grMoon(K, 118, 52, 40, 16, -10, '#ffffff', '#cbd5e1', 0.95);
      // колчан за плечом
      s += K.g(K.line('M0 -30 l-4 -12 M5 -30 l0 -13 M10 -30 l4 -12', '#78350f', 1.6) + `<path d="M-6 -44 l2 -8 l3 8Z M3 -45 l2 -8 l3 8Z M12 -44 l2 -8 l3 8Z" fill="#f8fafc" stroke="#64748b" stroke-width="1"/>` +
        K.part('M-6 -30 H16 V26 Q5 32 -6 26Z', '#a0592a', { line: '#451a03', lw: 1.8 }) + K.line('M-6 -22 H16 M-6 18 H16', '#fbbf24', 2.4), 'translate(96 88) rotate(-24)');
      // золотой лук
      s += K.line('M148 34 C174 64 174 128 148 160', '#78350f', 6.4) + K.line('M148 34 C174 64 174 128 148 160', '#fcd34d', 3.6) + K.line('M148 34 L148 160', '#f8fafc', 1.2, { op: 0.9 });
      s += `<circle cx="148" cy="34" r="3" fill="#fcd34d" stroke="#78350f" stroke-width="1.2"/><circle cx="148" cy="160" r="3" fill="#fcd34d" stroke="#78350f" stroke-width="1.2"/>`;
      // лань
      s += K.line('M28 140 L25 175 M38 142 L37 177 M54 142 L56 177 M64 138 L68 175', '#475569', 5.4) + K.line('M28 140 L25 175 M38 142 L37 177 M54 142 L56 177 M64 138 L68 175', '#e2e8f0', 3.2);
      s += `<path d="M22 176h6v3h-6zM34 178h6v3h-6zM53 178h6v3h-6zM65 176h6v3h-6z" fill="#334155"/>`;
      s += K.part('M18 126 C12 124 10 118 14 114 C18 118 22 120 24 124Z', '#ffffff', { line: '#64748b', lw: 1.4 });
      s += K.vol(K.ell(44, 132, 27, 15), silver);
      s += '<g fill="#fff" opacity=".9">' + [[34, 126], [44, 124], [54, 128], [40, 134], [50, 136]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8"/>`).join('') + '</g>';
      s += K.line('M62 128 C66 120 66 112 62 106', '#475569', 13) + K.line('M62 128 C66 120 66 112 62 106', '#eef2f7', 9.5);
      s += K.line('M54 90 C52 80 46 74 40 72 M50 82 L42 82 M54 90 C58 80 62 74 68 72 M60 80 L66 84', '#92400e', 3.6) + K.line('M54 90 C52 80 46 74 40 72 M50 82 L42 82 M54 90 C58 80 62 74 68 72 M60 80 L66 84', '#fcd34d', 2);
      s += K.vol('M48 92 C38 86 34 88 32 92 C36 96 42 98 48 96Z', silver) + K.vol('M58 100 C50 96 52 88 62 88 C70 90 78 96 78 102 C78 108 70 110 64 108 C58 106 58 104 58 100Z', silver);
      s += `<g class="art-eyes">${K.eye(63, 96, 4.4, { iris: '#1e3a8a', lash: true, look: [0.6, 0.2] })}</g><ellipse cx="76" cy="102" rx="2.4" ry="1.8" fill="#334155"/>` + K.blush(68, 104, 2.6);
      // ноги в сандалиях
      s += K.line('M106 138 L104 172 M122 138 L124 172', '#8a5a3a', 9) + K.line('M106 138 L104 172 M122 138 L124 172', skin, 6.4);
      s += K.line('M101 158 L108 164 M108 158 L101 164 M101 166 L108 170 M120 158 L128 164 M128 158 L120 164 M120 166 L128 170', '#b45309', 1.4);
      s += K.part('M96 172 C98 168 106 168 110 172 L110 177 H96Z', '#b45309', { line: '#451a03', lw: 1.4 }) + K.part('M118 172 C122 168 130 168 132 172 L132 177 H118Z', '#b45309', { line: '#451a03', lw: 1.4 });
      // хитон с меандром и поясом
      const chiton = 'M100 76 Q114 70 128 76 C132 96 136 116 140 140 Q114 148 88 140 C92 116 96 96 100 76Z';
      s += K.vol(chiton, { c1: '#bef264', c2: '#3f6212', rim: '#f1f5f9', rimK: 0.6, texK: 0.2, lw: 2.2, line: '#1a2e05' });
      s += grClip(K, chiton, `<path d="M80 131 Q114 140 150 131 V150 H80Z" fill="#f8fafc"/>` + K.g(grKey(K, 84, 133, 60, 6, '#b45309', 1.3), 'rotate(0)'));
      s += K.line('M104 84 C102 104 100 120 98 138 M120 84 C124 104 126 120 130 138 M112 108 V140', '#1a2e05', 1.4, { op: 0.4 });
      s += K.line('M98 104 Q114 110 132 104', '#b45309', 4.4) + K.line('M98 104 Q114 110 132 104', '#fcd34d', 2.2);
      // руки: одна гладит лань, другая держит лук
      const armL = 'M102 84 C92 92 82 94 72 92';
      s += K.line(armL, '#8a5a3a', 9) + K.line(armL, skin, 6.4) + K.vol(K.ell(70, 91, 6, 5.4), sk);
      const armR = 'M126 82 C136 90 142 96 148 98';
      s += K.line(armR, '#8a5a3a', 9) + K.line(armR, skin, 6.4) + K.vol(K.ell(149, 98, 6, 6.4), sk);
      // голова: волосы, узел, серп-диадема
      s += K.part('M94 50 C92 64 94 76 98 82 L130 82 C134 76 136 64 134 50Z', '#9a3412', { line: '#431407', lw: 1.8 });
      s += K.vol(K.ell(114, 56, 18, 19), sk);
      s += K.vol(K.ell(114, 32, 11, 8.5), { c1: '#c2410c', c2: '#7c2d12', tex: false, lw: 2, line: '#431407' });
      s += K.part('M96 56 C94 42 104 36 114 36 C124 36 134 42 132 56 C126 48 120 46 114 48 C108 46 102 48 96 56Z', '#b4441a', { line: '#431407', lw: 1.8 });
      s += grMoon(K, 114, 38, 7, 3, -3, '#ffffff', '#cbd5e1');
      s += K.eyes(114, 59, 7.4, 5.4, { iris: '#65a30d', lash: true, look: [-0.5, 0.1] });
      s += K.blush(103, 67, 3.6) + K.blush(125, 67, 3.6) + K.mouth('smile', 114, 67, 8);
      // серебряные искорки
      s += K.spark(170, 22, 3.6, '#f8fafc') + K.spark(24, 56, 3, '#e2e8f0', 'art-float') + K.spark(184, 110, 2.6, '#f8fafc') + K.spark(84, 18, 2.4, '#e2e8f0', 'art-float');
      return s;
    },

    // Гарпёнок: пушистый лиловый птенчик с девчачьим личиком — каре с пёрышками-хохолком, крылышки-коротышки машут,
    // оранжевые лапки. Во рту — утащенная картошинка фри, под крылом — целый красный пакетик. Рядом свистит ветерок
    gr_garpyonok(K) {
      const fe = { c1: '#ece8ff', c2: '#7c6fcf', rim: '#eef0ff', rimK: 0.7, texK: 0.22 };
      const skin = '#fde2c4';
      let s = K.aura('#a5b4fc', 92, 110, 0.45);
      // ветерок
      s += K.line('M14 96 Q34 88 50 96 T78 96 M20 120 Q34 114 46 120', '#eef0ff', 2, { op: 0.5, cls: 'art-float' });
      // хвостик
      s += K.part('M124 160 C140 164 152 158 158 148 C148 150 140 150 132 148Z', '#a79ae8', { line: '#3b2f86', lw: 1.6 }) + K.part('M126 154 C142 152 150 142 152 132 C144 138 136 140 128 140Z', '#c4b8f5', { line: '#3b2f86', lw: 1.6 });
      // лапки
      s += K.mirror(K.line('M84 164 V174 M84 174 l-7 5 M84 174 l0 7 M84 174 l7 5', '#9a3412', 5) + K.line('M84 164 V174 M84 174 l-7 5 M84 174 l0 7 M84 174 l7 5', '#fb923c', 3));
      // крылышки
      const wing = K.g(K.vol('M68 124 C54 116 42 118 36 128 C42 130 44 134 42 140 C48 140 52 144 52 150 C60 146 66 140 70 134Z', { ...fe, texK: 0.1 }) + K.line('M44 130 L60 128 M48 140 L62 134', '#6d5fc2', 1.4, { op: 0.7 }), '', 'art-wing');
      s += K.mirror(wing);
      // пушистое тельце
      s += K.vol('M100 104 C124 104 138 122 136 142 C134 162 120 172 100 172 C80 172 66 162 64 142 C62 122 76 104 100 104Z', fe);
      s += K.line('M82 132 q6 5 12 0 q6 5 12 0 q6 5 12 0 M86 146 q7 5 14 0 q7 5 14 0 M92 159 q8 4 16 0', '#fff', 1.8, { op: 0.75 });
      // пакетик фри под крылом
      s += K.part('M140 132 L164 132 L160 164 L144 164Z', '#ef4444', { line: '#7f1d1d', lw: 1.8 });
      s += K.line('M146 132 L148 164 M152 132 V164 M158 132 L156 164', '#fff', 1.6, { op: 0.8 });
      s += K.line('M144 132 L142 116 M149 132 L150 112 M154 132 L156 118 M159 132 L162 114', '#92400e', 4.4) + K.line('M144 132 L142 116 M149 132 L150 112 M154 132 L156 118 M159 132 L162 114', '#fde047', 2.8);
      s += K.vol('M136 128 C146 124 152 128 154 134 C148 140 140 140 134 138Z', { ...fe, texK: 0.1, lw: 2 });
      // головка: каре, хохолок из перьев
      s += K.part('M72 88 C70 64 84 54 100 54 C116 54 130 64 128 88 C130 102 124 112 120 116 L80 116 C76 112 70 102 72 88Z', '#6d4fc2', { line: '#2e1a6b', lw: 2 });
      s += K.g(K.part('M96 58 C90 44 92 34 98 28 C100 38 104 46 102 58Z', '#c4b8f5', { line: '#3b2f86', lw: 1.6 }) + K.part('M102 58 C104 44 112 36 120 34 C116 42 112 50 108 60Z', '#a79ae8', { line: '#3b2f86', lw: 1.6 }) + K.part('M94 60 C86 50 78 48 72 50 C78 54 84 58 88 64Z', '#ece8ff', { line: '#3b2f86', lw: 1.6 }), '', 'art-sway');
      s += K.vol(K.ell(100, 88, 22, 21), { c1: skin, c2: '#e8b48a', rim: '#fff3d6', tex: false, lw: 2.2, line: '#8a5a3a' });
      s += K.part('M78 84 C78 68 88 62 100 62 C112 62 122 68 122 84 C116 76 108 74 100 76 C92 74 84 76 78 84Z', '#7c5fd6', { line: '#2e1a6b', lw: 1.8 });
      s += K.eyes(100, 90, 9, 7, { iris: '#8b5cf6', lash: true, look: [0.2, 0.2] });
      s += K.blush(86, 100, 4) + K.blush(114, 100, 4);
      // картошинка во рту
      s += K.line('M100 102 Q103 104 106 102', K.INK, 2) + K.g(K.part('M-2 -1 H14 V3 H-2Z', '#fde047', { line: '#92400e', lw: 1.2 }), 'translate(104 101) rotate(-18)');
      s += K.spark(30, 60, 3.2, '#eef0ff') + K.spark(172, 76, 3, '#fff', 'art-float') + K.spark(24, 150, 2.4, '#c7d2fe') + K.spark(178, 176, 2.2, '#eef0ff');
      return s;
    },

    // Гарпия: крылатая похитительница в полёте — широко раскинутые лиловые крылья, растрёпанные ветром волосы,
    // перьевая «юбочка»-хвост; в когтях — чужая соломенная шляпа, рядом улетает бумажная салфетка. Ухмыляется
    gr_garpiya(K) {
      const fe = { c1: '#d9d4fb', c2: '#4c3fa8', rim: '#eef0ff', rimK: 0.7, texK: 0.2 };
      const skin = '#fde2c4';
      let s = K.aura('#a5b4fc', 96, 100, 0.45);
      s += K.line('M20 150 Q46 140 70 150 M130 150 Q156 140 180 150 M150 30 Q166 24 182 30', '#eef0ff', 2, { op: 0.45, cls: 'art-float' });
      // крылья
      const wing = K.g(K.vol('M80 98 C60 78 36 58 6 44 C10 56 14 62 20 66 C12 68 10 74 12 78 C20 78 26 80 30 84 C24 88 24 94 26 98 C36 96 44 98 50 104 C48 110 50 114 54 116 C62 112 72 110 80 112Z', fe) +
        K.line('M14 62 C34 70 56 86 76 104 M16 78 C36 84 56 94 74 106 M28 96 C42 98 56 104 70 110', '#3b2f86', 1.4, { op: 0.55 }) + K.line('M40 62 C54 72 66 84 76 96', '#fff', 1.6, { op: 0.5 }), '', 'art-wing');
      s += K.mirror(wing);
      // хвост-юбочка из перьев
      s += K.part('M82 138 C78 152 76 162 80 170 C86 164 90 160 94 152 C96 162 98 168 100 174 C102 168 104 162 106 152 C110 160 114 164 120 170 C124 162 122 152 118 138Z', '#8b80e0', { line: '#2e2470', lw: 1.8 });
      // лапы со шляпой
      s += K.line('M90 148 L88 160 M110 148 L112 160', '#9a3412', 5) + K.line('M90 148 L88 160 M110 148 L112 160', '#fb923c', 3);
      s += `<ellipse cx="100" cy="172" rx="30" ry="6.5" fill="${K.lin(['#fde68a', '#d4a24c'])}" stroke="#78350f" stroke-width="1.8"/>` + K.part('M84 170 C84 158 90 154 100 154 C110 154 116 158 116 170Z', '#fcd34d', { line: '#78350f', lw: 1.8 });
      s += K.line('M84 166 Q100 170 116 166', '#1d4ed8', 4) + K.line('M86 160 L114 160 M88 156 L112 156', '#b45309', 0.8, { op: 0.5 });
      s += K.line('M88 160 l-5 4 M88 160 l1 6 M112 160 l5 4 M112 160 l-1 6', '#fb923c', 2.6);
      // улетающая салфетка
      s += K.g(K.part('M0 0 L16 -4 L20 12 L4 16Z', '#ffffff', { line: '#94a3b8', lw: 1.2 }) + K.line('M4 4 L16 1 M5 9 L17 6', '#cbd5e1', 1), 'translate(152 108) rotate(14)', 'art-float');
      // тело
      s += K.vol('M100 80 C120 80 132 96 130 116 C128 136 116 148 100 152 C84 148 72 136 70 116 C68 96 80 80 100 80Z', fe);
      s += K.line('M84 114 q5 5 10 0 q6 5 12 0 q5 5 10 0 M88 128 q6 5 12 0 q6 5 12 0 M92 140 q8 4 16 0', '#fff', 1.6, { op: 0.7 });
      s += K.part('M76 88 C84 78 116 78 124 88 C126 98 120 104 114 100 C110 106 104 106 100 102 C96 106 90 106 86 100 C80 104 74 98 76 88Z', '#ece8ff', { line: '#2e2470', lw: 1.8 });
      s += K.part('M84 92 C92 88 108 88 116 92 C114 98 108 98 104 96 C102 100 98 100 96 96 C92 98 86 98 84 92Z', '#b4a9f0', { line: '#2e2470', lw: 1.2 });
      // волосы, растрёпанные ветром
      s += K.part('M80 58 C80 40 92 32 106 34 C122 36 132 44 150 40 C142 48 146 52 156 56 C144 60 142 66 150 74 C136 74 130 80 124 84 C120 76 112 72 100 72 C90 72 82 76 78 82 C74 74 76 66 80 58Z', '#5b3fb8', { line: '#241359', lw: 2 });
      s += K.line('M110 40 C126 42 138 46 146 44 M120 60 C132 60 140 62 146 64', '#8b72e0', 1.6, { op: 0.8 });
      s += K.vol(K.ell(100, 62, 19, 19), { c1: skin, c2: '#e8b48a', rim: '#fff3d6', tex: false, lw: 2.2, line: '#8a5a3a' });
      s += K.part('M81 58 C82 46 92 40 102 40 C112 40 120 46 120 56 C112 50 104 52 98 50 C92 54 86 54 81 58Z', '#6d4fc2', { line: '#241359', lw: 1.6 });
      s += K.eyes(100, 64, 7.6, 5.8, { iris: '#7c3aed', lid: 'angry', skin, look: [0.4, 0.2], lash: true });
      s += K.blush(88, 72, 3.4) + K.blush(112, 72, 3.4) + K.line('M93 74 Q100 79 108 72', K.INK, 2.2);
      s += K.spark(30, 30, 3.2, '#eef0ff') + K.spark(176, 96, 3, '#fff', 'art-float') + K.spark(22, 128, 2.4, '#c7d2fe');
      return s;
    },

    // Аэлло: старшая из гарпий, «Вихрь». Огромные грозовые крылья с завитками бури, венец из перьев, длинные волосы
    // закручены смерчем, на груди — пёрышко-оберег. Под ней крутится маленький смерч, а в нём уносится зонтик кафе
    gr_aello(K) {
      const fe = { c1: '#b8c2fb', c2: '#26216e', rim: '#e0e7ff', rimK: 0.75, texK: 0.22 };
      const skin = '#fbe0c8';
      let s = K.aura('#818cf8', 100, 96, 0.5);
      // смерч
      let tw = '';
      for (let i = 0; i < 6; i++) { const y = 136 + i * 8, w = 34 - i * 5; tw += `M${100 - w} ${y}Q100 ${y + 6} ${100 + w} ${y}Q100 ${y - 5} ${100 - w + 6} ${y}`; }
      s += `<g class="art-float">` + K.line(tw, '#c7d2fe', 2.4, { op: 0.75 }) + '</g>';
      // зонтик кафе в вихре
      s += K.g(K.part('M-20 0 Q0 -18 20 0 Q14 -3 10 0 Q5 -3 0 0 Q-5 -3 -10 0 Q-14 -3 -20 0Z', '#ef4444', { line: '#7f1d1d', lw: 1.6 }) + K.line('M-10 0 Q-6 -12 0 -14 M10 0 Q6 -12 0 -14', '#fff', 1.4, { op: 0.8 }) + K.line('M0 -14 V16', '#78350f', 2), 'translate(158 150) rotate(-30)', 'art-float');
      // грозовые крылья
      const wing = K.g(K.vol('M82 92 C62 66 36 40 2 28 C8 42 12 50 18 56 C8 58 4 66 6 72 C16 72 22 74 26 80 C16 84 14 92 16 98 C28 96 36 98 42 104 C36 110 36 118 40 122 C52 116 62 114 70 116 C68 122 70 128 74 130 C78 122 82 116 86 112Z', fe) +
        K.line('M10 44 C34 58 58 80 80 104 M12 70 C36 78 58 92 78 108 M24 96 C44 100 60 108 74 116', '#1e1b4b', 1.4, { op: 0.55 }) +
        K.line('M46 70 C40 62 48 54 54 60 C58 64 54 70 50 68 M30 88 C26 82 32 76 37 80', '#eef0ff', 1.8, { op: 0.8 }), '', 'art-wing');
      s += K.mirror(wing);
      // платье из перьев
      s += K.vol('M100 78 C122 78 134 96 132 118 C130 138 120 150 124 166 C112 160 106 168 100 176 C94 168 88 160 76 166 C80 150 70 138 68 118 C66 96 78 78 100 78Z', fe);
      s += K.line('M82 108 q6 5 12 0 q6 5 12 0 q6 5 12 0 M80 124 q7 5 14 0 q6 5 12 0 q7 5 14 0 M86 140 q7 5 14 0 q7 5 14 0 M92 156 q8 4 16 0', '#e0e7ff', 1.6, { op: 0.65 });
      s += K.line('M84 176 l-3 6 M84 176 l1 7 M116 176 l3 6 M116 176 l-1 7', '#fb923c', 2.6) + K.line('M86 162 L84 176 M114 162 L116 176', '#9a3412', 4.4);
      // пёрышко-оберег на груди
      s += K.g(K.part('M0 -10 C6 -4 6 6 0 12 C-6 6 -6 -4 0 -10Z', '#fde68a', { line: '#92400e', lw: 1.4 }) + K.line('M0 -8 V12', '#92400e', 1), 'translate(100 96)');
      // волосы-смерч
      s += K.part('M78 56 C70 70 66 86 58 96 C50 104 38 104 34 96 C44 98 50 92 52 84 C56 70 62 50 76 40 C88 32 112 32 124 40 C138 50 144 70 148 84 C150 92 156 98 166 96 C162 104 150 104 142 96 C134 86 130 70 122 56Z', '#2e2a8a', { line: '#0f0c3a', lw: 2 });
      s += K.line('M60 90 C62 76 66 62 74 52 M140 90 C138 76 134 62 126 52', '#818cf8', 1.8, { op: 0.8 });
      s += K.vol(K.ell(100, 60, 20, 21), { c1: skin, c2: '#e0a880', rim: '#fff3d6', tex: false, lw: 2.2, line: '#7a4a2a' });
      s += K.part('M80 56 C80 42 90 36 100 36 C110 36 120 42 120 56 C114 48 108 46 100 48 C92 46 86 48 80 56Z', '#3730a3', { line: '#0f0c3a', lw: 1.8 });
      // венец из перьев
      for (const [x, r, c] of [[84, -30, '#c7d2fe'], [92, -14, '#eef0ff'], [100, 0, '#fde68a'], [108, 14, '#eef0ff'], [116, 30, '#c7d2fe']]) {
        s += K.g(K.part('M0 0 C-5 -8 -4 -18 0 -24 C4 -18 5 -8 0 0Z', c, { line: '#312e81', lw: 1.4 }) + K.line('M0 -2 V-20', '#312e81', 0.9), `translate(${x} 42) rotate(${r})`);
      }
      s += `<circle cx="100" cy="42" r="3" fill="#fbbf24" stroke="#78350f" stroke-width="1.2"/>`;
      s += K.eyes(100, 62, 8, 6, { iris: '#4f46e5', lid: 'angry', skin, look: [0, 0.2], lash: true });
      s += K.blush(88, 70, 3.4) + K.blush(112, 70, 3.4) + K.mouth('grin', 100, 72, 11);
      // завитки ветра
      s += K.line('M20 150 C30 140 44 146 40 154 C36 160 28 156 32 150 M168 40 C178 30 192 36 188 44 C184 50 176 46 180 40', '#e0e7ff', 2, { op: 0.6, cls: 'art-float' });
      s += K.spark(100, 12, 3.6, '#eef0ff') + K.spark(186, 120, 3, '#fff', 'art-float') + K.spark(14, 118, 2.6, '#c7d2fe') + K.spark(40, 20, 2.4, '#eef0ff');
      return s;
    },

    // Гермес: вестник богов в полёте-беге. Шляпа-петас с крылышками, крылатые сандалии, короткий хитон с золотым меандром,
    // развевающийся плащ. В одной руке — кадуцей (золотой жезл с двумя змейками и крыльями), под мышкой — посылка
    // с сургучной печатью: доставит раньше, чем её отправят. За спиной — полосы скорости
    gr_germes(K) {
      const skin = '#f8d2ae', sk = { c1: skin, c2: '#d8a07a', rim: '#fff3d6', tex: false, lw: 2.2, line: '#8a5a3a' };
      const wingW = (x, y, k, r) => K.g(`<path d="M0 0 C-6 -8 -16 -12 -26 -10 C-20 -6 -18 -4 -16 -1 C-22 0 -24 3 -24 6 C-16 4 -8 4 0 4Z" fill="${K.lin(['#ffffff', '#c7d2fe'])}" stroke="#3730a3" stroke-width="1.4" stroke-linejoin="round"/>` + K.line('M-4 1 L-20 -6 M-4 3 L-18 4', '#818cf8', 1), `translate(${x} ${y}) rotate(${r}) scale(${k})`, 'art-wing');
      let s = K.aura('#a5b4fc', 96, 100, 0.45);
      // полосы скорости
      s += K.line('M6 70 H44 M14 100 H40 M4 130 H36 M20 160 H48', '#eef0ff', 2.4, { op: 0.5, cls: 'art-float' });
      // плащ
      s += K.vol('M92 76 C74 80 50 88 20 82 C28 92 32 100 26 110 C42 106 54 110 60 120 C70 112 82 104 94 96Z', { c1: '#fca5a5', c2: '#991b1b', rim: '#fde68a', rimK: 0.6, tex: false, lw: 2.2, line: '#450a0a' });
      s += K.line('M32 86 C50 92 70 94 88 86 M40 106 C56 104 72 100 88 94', '#450a0a', 1.4, { op: 0.4 });
      // ноги в беге и крылатые сандалии
      const lb = 'M96 120 C88 130 82 138 78 144 C74 148 68 150 62 150';
      const lf = 'M108 122 C114 134 120 146 118 168';
      s += K.line(lb, '#8a5a3a', 10.5) + K.line(lb, skin, 7.6) + K.line(lf, '#8a5a3a', 10.5) + K.line(lf, skin, 7.6);
      s += K.part('M52 146 C56 144 64 146 66 150 L64 154 H50Z', '#b45309', { line: '#451a03', lw: 1.4 }) + K.part('M112 166 C118 164 126 166 128 172 L126 176 H110Z', '#b45309', { line: '#451a03', lw: 1.4 });
      s += K.line('M60 144 L68 152 M66 142 L60 150 M114 156 L122 162 M122 156 L114 162', '#b45309', 1.3);
      s += wingW(62, 146, 0.8, -10) + wingW(114, 164, 0.85, 0);
      // хитон
      const ch = 'M88 78 Q102 72 116 78 L122 122 Q104 132 84 122Z';
      s += K.vol(ch, { c1: '#ffffff', c2: '#a5b4fc', rim: '#fde68a', tex: false, lw: 2.2, line: '#312e81' });
      s += grClip(K, ch, `<path d="M80 114 Q104 124 126 114 V140 H80Z" fill="#4f46e5"/>` + grKey(K, 84, 116, 38, 5.6, '#fcd34d', 1.2));
      s += K.line('M92 84 L90 118 M110 84 L114 118', '#6366f1', 1.2, { op: 0.4 }) + K.line('M86 100 Q104 106 120 100', '#b45309', 3.6) + K.line('M86 100 Q104 106 120 100', '#fcd34d', 1.8);
      // кадуцей
      s += K.line('M144 40 V160', '#78350f', 5.4) + K.line('M144 40 V160', '#fcd34d', 3.2);
      s += K.line('M144 128 C132 120 132 108 144 100 C156 92 156 80 144 72 C134 66 136 56 142 52', '#14532d', 4.4) + K.line('M144 128 C132 120 132 108 144 100 C156 92 156 80 144 72 C134 66 136 56 142 52', '#4ade80', 2.6);
      s += K.line('M144 128 C156 120 156 108 144 100 C132 92 132 80 144 72 C154 66 152 56 146 52', '#14532d', 4.4) + K.line('M144 128 C156 120 156 108 144 100 C132 92 132 80 144 72 C154 66 152 56 146 52', '#86efac', 2.6);
      s += `<circle cx="141" cy="51" r="2.6" fill="#4ade80" stroke="#14532d" stroke-width="1"/><circle cx="147" cy="51" r="2.6" fill="#86efac" stroke="#14532d" stroke-width="1"/>`;
      s += K.mirror('') + wingW(144, 40, 0.9, 0) + K.g(wingW(0, 0, 0.9, 0), 'translate(144 40) scale(-1 1)');
      s += `<circle cx="144" cy="38" r="4" fill="${K.lin(['#fff7c2', '#f59e0b'])}" stroke="#78350f" stroke-width="1.4"/>`;
      // рука с кадуцеем
      const aR = 'M114 84 C124 90 132 92 140 90';
      s += K.line(aR, '#8a5a3a', 9.5) + K.line(aR, skin, 6.8) + K.vol(K.ell(143, 90, 6, 6.4), sk);
      // посылка под мышкой
      const aL = 'M90 84 C84 94 80 102 80 110';
      s += K.g(K.part('M-14 -11 H14 V11 H-14Z', '#d6a86a', { line: '#6b4220', lw: 1.8 }) + K.line('M0 -11 V11 M-14 0 H14', '#b91c1c', 1.8) + `<circle cx="0" cy="0" r="4" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.2"/>` + K.line('M-10 -7 H-4 M-10 -4 H-6', '#6b4220', 1), 'translate(72 112) rotate(-8)');
      s += K.line(aL, '#8a5a3a', 9.5) + K.line(aL, skin, 6.8) + K.vol(K.ell(82, 112, 6, 6), sk);
      // голова: кудри, петас с крылышками
      s += K.vol(K.ell(104, 58, 18, 19), sk);
      for (const [x, y] of [[88, 60], [90, 70], [118, 58], [118, 68]]) s += K.vol(K.ell(x, y, 5.4, 5.6), { c1: '#d9a45a', c2: '#7c4a14', tex: false, lw: 1.6 });
      s += wingW(76, 40, 0.85, 12) + K.g(wingW(0, 0, 0.85, 12), 'translate(132 40) scale(-1 1)');
      s += `<ellipse cx="104" cy="44" rx="32" ry="7.5" fill="${K.lin(['#e0e7ff', '#6366f1'])}" stroke="#1e1b4b" stroke-width="2"/>`;
      s += K.vol('M86 44 C86 30 94 24 104 24 C114 24 122 30 122 44 Q104 48 86 44Z', { c1: '#e0e7ff', c2: '#4f46e5', rim: '#fde68a', tex: false, lw: 2, line: '#1e1b4b' });
      s += K.line('M87 40 Q104 44 121 40', '#fcd34d', 2.4);
      s += K.eyes(106, 60, 7, 5.4, { iris: '#1d4ed8', look: [0.6, 0.1] });
      s += K.blush(94, 68, 3.4) + K.blush(118, 68, 3.4) + K.mouth('smile', 106, 68, 9);
      s += K.spark(176, 24, 3.2, '#fde68a') + K.spark(180, 120, 2.8, '#eef0ff', 'art-float') + K.spark(60, 20, 2.4, '#eef0ff');
      return s;
    },

    // Циклопчик: круглый малыш-кузнец с одним огромным глазом и сросшейся бровкой, хохолок на макушке, кожаный фартучек.
    // Поднял молоточек — от удара летят искры, в другой ручке держит свою первую маленькую молнию и очень ей гордится
    gr_ciklopchik(K) {
      const sk = { c1: '#c3cff5', c2: '#5563a8', rim: '#fff6b0', rimK: 0.6, texK: 0.18 };
      let s = K.aura('#facc15', 92, 112, 0.42);
      // ножки
      s += K.mirror(K.vol(K.ell(80, 173, 14, 7.5), { ...sk, tex: false, lw: 2.2 }));
      // ушки и тело
      s += K.mirror(K.vol(K.ell(60, 116, 8, 10), { ...sk, tex: false, lw: 2.2 }) + `<ellipse cx="60" cy="116" rx="3.6" ry="5.4" fill="#f9a8d4" opacity=".6"/>`);
      s += K.vol('M100 76 C134 76 146 106 144 134 C142 162 126 176 100 176 C74 176 58 162 56 134 C54 106 66 76 100 76Z', sk);
      s += K.part('M96 80 C92 70 96 62 104 60 C100 66 102 72 108 76Z', '#2e3a78', { line: '#141a3f', lw: 1.6 });
      s += K.gloss(78, 96, 10, 5.5, -35, 0.35);
      // фартучек на лямке
      s += K.line('M72 128 L128 128', '#6b3a1a', 3) + K.vol('M74 132 H126 C128 148 126 162 120 172 H80 C74 162 72 148 74 132Z', { c1: '#b97a4a', c2: '#5a2e12', rim: '#fff6b0', tex: false, lw: 2.2, line: '#3b1d0c' });
      s += K.stitch('M78 136 H122', '#fcd34d', 1.4) + K.part('M92 146 H108 V158 H92Z', '#8a5230', { line: '#3b1d0c', lw: 1.4 });
      // один большой глаз со сросшейся бровкой
      s += `<g class="art-eyes">${K.eye(100, 104, 19, { iris: '#eab308', look: [0.4, 0.1] })}</g>`;
      s += K.part('M74 84 Q100 72 126 84 Q126 89 122 90 Q100 80 78 90 Q74 89 74 84Z', '#2e3a78', { line: '#141a3f', lw: 1.4 });
      s += K.blush(72, 124, 6) + K.blush(128, 124, 6);
      s += `<path d="M90 118 Q100 128 110 118Z" fill="#6b1d2a" stroke="${K.INK}" stroke-width="2" stroke-linejoin="round"/><path d="M97 118.4 h6 v3.4 h-6z" fill="#fff"/>`;
      // ручка с молоточком
      s += K.line('M138 128 C146 122 150 114 152 106', '#2e3a78', 10) + K.line('M138 128 C146 122 150 114 152 106', '#a3b1e8', 7);
      s += K.line('M150 110 L162 80', '#5a2e12', 5) + K.line('M150 110 L162 80', '#b97a4a', 3);
      s += K.g(K.part('M-9 -6 H9 V6 H-9Z', '#64748b', { line: '#1e293b', lw: 1.8 }) + K.line('M-8 -3 H8', '#e2e8f0', 1.4, { op: 0.8 }), 'translate(163 77) rotate(22)');
      s += K.vol(K.ell(151, 108, 6.6, 6.2), { ...sk, tex: false, lw: 2 });
      s += K.spark(178, 64, 5, '#fde047') + K.spark(174, 94, 3.4, '#fff7c2', 'art-float') + K.spark(184, 80, 2.6, '#facc15');
      // первая молния в другой ручке
      s += K.line('M62 128 C54 124 50 118 48 110', '#2e3a78', 10) + K.line('M62 128 C54 124 50 118 48 110', '#a3b1e8', 7);
      s += `<circle class="art-aura" cx="42" cy="92" r="20" fill="${K.rad([[0, '#fff7c2', 0.8], [1, '#facc15', 0]])}"/>` + grBolt(K, 42, 92, 38, 14);
      s += K.vol(K.ell(48, 110, 6.6, 6.2), { ...sk, tex: false, lw: 2 });
      s += K.spark(24, 60, 3, '#fde047', 'art-float') + K.spark(160, 150, 2.4, '#fff7c2') + K.spark(30, 150, 2.6, '#fde047');
      return s;
    },

    // Циклоп: могучий кузнец громовых стрел. Один сердитый сосредоточенный глаз, короткая борода, кожаный фартук.
    // Молот занесён над головой, клещами держит на наковальне раскалённую молнию — она сыплет искрами
    gr_ciklop(K) {
      const sk = { c1: '#b3c1ee', c2: '#3c4787', rim: '#fff6b0', rimK: 0.6, texK: 0.2 };
      let s = K.aura('#facc15', 98, 100, 0.45);
      // молот над головой
      s += K.line('M150 64 L160 18', '#3b1d0c', 7) + K.line('M150 64 L160 18', '#b97a4a', 4.4);
      s += K.g(K.vol('M-16 -9 H16 V9 H-16Z', { c1: '#94a3b8', c2: '#334155', rim: '#fff6b0', tex: false, lw: 2.2, line: '#0f172a' }) + K.line('M-14 -5 H14', '#f1f5f9', 1.6, { op: 0.8 }), 'translate(161 16) rotate(12)');
      s += K.line('M180 6 q6 8 2 16 M186 20 q4 6 0 12', '#fde68a', 2, { op: 0.7, cls: 'art-blink' });
      // ноги
      s += K.mirror(K.vol('M68 150 H92 V172 C92 178 84 180 76 180 C66 180 62 176 64 170Z', { ...sk, lw: 2.4 }));
      // тело и руки
      s += K.vol('M64 80 C54 96 54 126 62 148 H138 C146 126 146 96 136 80 Q100 68 64 80Z', sk);
      s += K.line('M84 96 Q92 102 100 96 Q108 102 116 96', '#2e3a78', 1.6, { op: 0.6 });
      const aR = 'M132 86 C144 88 150 78 150 64';
      s += K.line(aR, '#1e2654', 17) + K.line(aR, '#9fb0e4', 13) + K.vol(K.ell(150, 62, 9, 8.5), { ...sk, tex: false, lw: 2.2 });
      // фартук
      s += K.line('M66 108 L134 108', '#3b1d0c', 3) + K.vol('M68 112 H132 C136 130 136 146 132 160 H68 C64 146 64 130 68 112Z', { c1: '#a86a3a', c2: '#4a240c', rim: '#fff6b0', tex: false, lw: 2.2, line: '#2a1206' });
      s += K.stitch('M72 116 H128', '#fcd34d', 1.4);
      // голова: уши, лысинка с пучком, борода, один глаз
      s += K.mirror(K.vol(K.ell(72, 54, 7, 9), { ...sk, tex: false, lw: 2 }));
      s += K.vol(K.ell(100, 52, 27, 26), sk);
      s += K.part('M94 28 C90 18 96 10 106 10 C100 16 104 22 110 26Z', '#1e2654', { line: '#0b1030', lw: 1.6 });
      s += K.gloss(84, 36, 7, 4, -30, 0.35);
      s += K.vol('M76 60 C76 78 86 92 100 94 C114 92 124 78 124 60 C118 70 110 74 100 74 C90 74 82 70 76 60Z', { c1: '#3a4a8a', c2: '#141a3f', tex: false, lw: 2, line: '#0b1030' });
      s += `<g class="art-eyes">${K.eye(100, 50, 13.5, { iris: '#eab308', look: [0.3, 0.6], lid: 'half', skin: '#9fb0e4' })}</g>`;
      s += K.part('M78 36 Q100 26 122 36 Q122 41 118 42 Q100 34 82 42 Q78 41 78 36Z', '#1e2654', { line: '#0b1030', lw: 1.4 });
      s += K.mouth('flat', 100, 80, 12);
      // наковальня с раскалённой молнией
      s += `<circle class="art-aura" cx="104" cy="138" r="34" fill="${K.rad([[0, '#fff7c2', 0.7], [0.5, '#facc15', 0.3], [1, '#facc15', 0]])}"/>`;
      s += K.vol('M58 146 H136 C146 146 156 142 164 134 C158 150 146 158 136 158 H124 L120 166 H132 V180 H68 V166 H80 L76 158 H64 C58 158 56 150 58 146Z', { c1: '#64748b', c2: '#0f172a', rim: '#fff6b0', rimK: 0.7, tex: false, lw: 2.4, line: '#020617' });
      s += K.line('M62 148 H134', '#cbd5e1', 1.6, { op: 0.7 });
      s += grBolt(K, 100, 138, 50, 78);
      // рука с клещами
      s += K.line('M68 86 C58 100 58 118 66 128', '#1e2654', 17) + K.line('M68 86 C58 100 58 118 66 128', '#9fb0e4', 13);
      s += K.line('M68 130 L82 138 M68 130 L84 132', '#1e293b', 4) + K.line('M68 130 L82 138 M68 130 L84 132', '#94a3b8', 2);
      s += K.vol(K.ell(66, 128, 9, 8.5), { ...sk, tex: false, lw: 2.2 });
      // искры от удара
      s += K.spark(130, 118, 5, '#fde047') + K.spark(140, 128, 3, '#fff7c2', 'art-float') + K.spark(84, 118, 3.6, '#fde047', 'art-float') + K.spark(40, 150, 3, '#facc15') + K.spark(178, 110, 2.6, '#fde047') + K.spark(24, 70, 2.6, '#fff7c2');
      return s;
    },

    // Пегас: белый крылатый конь на грозовом облаке — большие крылья распахнуты, золотая грива искрит электричеством,
    // одно копыто поднято. В зубах несёт сияющую молнию Зевса, будто пёс палочку. Хвост — золотой шлейф
    gr_pegas(K) {
      const wh = { c1: '#ffffff', c2: '#a8b4c8', rim: '#fff6b0', rimK: 0.7, tex: false, lw: 2.4, line: '#334155' };
      const wingD = 'M0 0 C4 -20 20 -48 58 -72 C54 -62 54 -56 56 -50 C48 -48 46 -44 46 -38 C40 -36 38 -32 40 -26 C32 -24 30 -18 32 -12 C22 -10 14 -6 10 4Z';
      const wing = (t, op) => K.g(K.g(K.vol(wingD, { ...wh, texK: 0.1 }) + K.line('M8 -4 C22 -30 36 -50 54 -66 M12 -2 C22 -18 34 -28 44 -38 M14 2 C22 -8 28 -14 36 -18', '#94a3b8', 1.3, { op: 0.8 }), '', 'art-wing'), t) .replace('<g', `<g opacity="${op}"`);
      let s = K.aura('#facc15', 96, 100, 0.4);
      // дальнее крыло
      s += wing('translate(132 94) rotate(8)', 0.8);
      // хвост
      s += K.part('M158 108 C178 108 190 126 186 150 C182 140 174 136 168 134 C172 142 170 150 164 154 C164 142 160 132 152 124Z', '#fde68a', { line: '#a16207', lw: 1.8 });
      // задние ноги на облаке
      s += K.line('M146 128 L150 164 M136 134 L134 166', '#334155', 13) + K.line('M146 128 L150 164 M136 134 L134 166', '#eef2f7', 9.5);
      // грозовое облако
      s += K.vol('M20 176 C12 176 10 164 20 160 C18 148 32 142 40 150 C44 138 62 136 68 148 C76 140 92 142 94 152 C104 144 120 146 122 156 C130 146 148 146 152 156 C160 150 176 152 176 162 C188 162 190 176 180 178Z', { c1: '#f1f5f9', c2: '#7c8aa6', rim: '#fff6b0', rimK: 0.6, tex: false, lw: 2.2, line: '#475569' });
      s += K.line('M60 176 l6 -8 l-3 -1 l6 -8 M130 178 l5 -7 l-3 -1 l5 -7', '#facc15', 2.2, { cls: 'art-blink' });
      // тело и передние ноги
      s += K.vol('M92 96 C110 90 140 90 156 100 C168 108 168 126 156 134 C140 142 110 142 96 136 C84 130 80 110 92 96Z', wh);
      s += K.line('M104 136 C100 146 94 152 84 150', '#334155', 13) + K.line('M104 136 C100 146 94 152 84 150', '#eef2f7', 9.5);
      s += K.line('M116 138 L114 160', '#334155', 13) + K.line('M116 138 L114 160', '#eef2f7', 9.5);
      s += `<path d="M76 145l9 -1 2 10 -10 1zM108 158h12l1 7h-14zM144 160h12l1 7h-14zM128 162h12l1 7h-14z" fill="#fcd34d" stroke="#78350f" stroke-width="1.4" stroke-linejoin="round"/>`;
      // шея и голова
      s += K.vol('M76 60 C96 58 110 70 118 90 L124 104 L92 118 C88 104 84 92 80 84Z', wh);
      // искрящая грива
      s += K.part('M80 38 L90 30 L92 42 L102 38 L102 50 L112 50 L108 62 L120 66 L112 74 L124 82 L114 88 L122 98 L110 96 C104 80 96 64 80 52Z', '#fde047', { line: '#a16207', lw: 1.8 });
      s += K.line('M92 44 L96 50 L93 52 L98 58 M106 66 L110 72 L107 74 L112 80', '#fff7c2', 1.4, { cls: 'art-blink' });
      s += `<path d="M78 40 L84 22 L92 40Z" fill="#fff" stroke="#334155" stroke-width="2" stroke-linejoin="round"/><path d="M81 38 L84 27 L88 38Z" fill="#fbcfe8"/>`;
      s += K.vol('M76 36 C88 36 96 46 96 58 L94 86 C92 94 82 96 74 92 C66 88 58 88 48 88 C38 88 30 82 32 74 C34 66 44 60 52 56 C58 44 66 36 76 36Z', wh);
      s += K.part('M66 38 C70 30 80 28 86 34 C80 36 76 40 74 46Z', '#fde047', { line: '#a16207', lw: 1.4 });
      s += `<ellipse cx="39" cy="73" rx="2.8" ry="2" fill="#475569"/>` + K.blush(58, 78, 5);
      s += `<g class="art-eyes">${K.eye(70, 60, 9, { iris: '#0ea5e9', look: [-0.6, 0.1], lash: true })}</g>`;
      // молния в зубах
      s += grBolt(K, 40, 86, 50, 84);
      s += K.line('M34 84 Q40 88 48 86', K.INK, 2);
      // ближнее крыло
      s += wing('translate(112 98) rotate(-14)', 1);
      s += K.spark(24, 30, 3.6, '#fde047') + K.spark(18, 110, 3, '#fff7c2', 'art-float') + K.spark(186, 60, 2.6, '#fde047') + K.spark(100, 14, 2.4, '#fff7c2', 'art-float');
      return s;
    },

    // Зевс (легенда): царь богов восседает на грозовых облаках. Белоснежные кудри и пышная борода-облако, золотой лавровый
    // венок, суровый золотой взгляд. Гиматий с золотым меандром через плечо; в поднятой руке — сияющая молния,
    // у ног на облаке сидит его верный орёл. Вокруг бьют молнии
    gr_zeus(K) {
      const skin = '#f5c9a0', sk = { c1: skin, c2: '#c98a5e', rim: '#fff6b0', tex: false, lw: 2.4, line: '#7a4a2a' };
      const cloud = { c1: '#f8fafc', c2: '#7c8aa6', rim: '#fff6b0', rimK: 0.6, tex: false, lw: 2.2, line: '#475569' };
      let s = K.aura('#facc15', 100, 96, 0.55) + K.aura('#fff7c2', 60, 70, 0.35);
      // молнии в небе
      s += K.line('M22 20 l10 16 l-6 2 l10 18 M182 84 l-8 14 l6 2 l-8 16', '#fde047', 2.6, { cls: 'art-blink' });
      // облака позади
      s += K.vol('M14 130 C4 122 10 106 24 110 C28 96 46 96 50 108 C56 100 66 104 66 112 L66 140 H14Z', cloud) + K.vol('M186 130 C196 122 190 106 176 110 C172 96 154 96 150 108 C144 100 134 104 134 112 L134 140 H186Z', cloud);
      // тело: обнажённое плечо, гиматий
      s += K.vol('M58 96 C48 118 48 146 54 166 H146 C152 146 152 118 142 96 Q100 82 58 96Z', sk);
      s += K.line('M110 112 Q120 118 132 112', '#a8683e', 1.6, { op: 0.6 });
      const him = 'M56 98 C70 92 86 90 96 94 C110 116 126 140 148 158 L150 168 H52 C46 146 48 118 56 98Z';
      s += K.vol(him, { c1: '#ffffff', c2: '#b8c2d4', rim: '#fff6b0', tex: false, lw: 2.4, line: '#475569' });
      s += grClip(K, him, K.line('M88 92 C104 118 122 142 146 162', '#b45309', 9) + K.line('M88 92 C104 118 122 142 146 162', '#fcd34d', 6) + K.stitch('M88 92 C104 118 122 142 146 162', '#92400e', 1.6));
      s += K.line('M62 110 C66 130 64 150 60 166 M74 104 C82 124 84 146 82 166 M92 120 C100 138 104 154 104 166', '#94a3b8', 1.6, { op: 0.6 });
      // рука с молнией
      const aR = 'M138 104 C152 96 158 80 160 62';
      s += K.line(aR, '#7a4a2a', 17) + K.line(aR, skin, 13);
      s += `<circle class="art-aura" cx="164" cy="38" r="30" fill="${K.rad([[0, '#fffbe6', 0.9], [0.4, '#fde047', 0.5], [1, '#facc15', 0]])}"/>`;
      s += grBolt(K, 164, 36, 70, 18);
      s += K.vol(K.ell(160, 60, 9.5, 9), sk);
      // облака спереди и орёл
      s += K.vol('M30 182 C14 182 12 164 28 162 C28 148 48 144 54 156 C62 144 82 146 84 158 C94 148 112 150 114 160 C122 150 142 150 146 162 C156 152 176 156 174 168 C190 168 190 184 176 184Z', cloud);
      let e = K.part('M-12 4 C-18 -6 -14 -20 0 -22 C14 -20 18 -6 12 4 C8 12 -8 12 -12 4Z', '#8a5a2e', { line: '#3b1d0c', lw: 1.6 });
      e += K.part('M-12 2 C-22 -4 -26 -14 -22 -20 C-16 -12 -12 -8 -8 -4Z M12 2 C22 -4 26 -14 22 -20 C16 -12 12 -8 8 -4Z', '#6b4220', { line: '#3b1d0c', lw: 1.4 });
      e += K.vol(K.ell(0, -26, 9, 8.5), { c1: '#ffffff', c2: '#cbd5e1', tex: false, lw: 1.8, line: '#475569' });
      e += `<path d="M-3 -24 Q6 -26 8 -20 Q4 -18 0 -20Z" fill="#fcd34d" stroke="#78350f" stroke-width="1.2"/>` + `<circle cx="-2" cy="-28" r="2" fill="${K.INK}"/><circle cx="-2.6" cy="-28.6" r=".7" fill="#fff"/>`;
      e += K.line('M-6 12 l-2 4 M-2 12 v4 M6 12 l2 4 M2 12 v4', '#f59e0b', 1.8);
      s += K.g(e, 'translate(44 150)');
      // левая рука на колене-облаке
      s += K.line('M62 104 C52 118 52 132 60 142', '#7a4a2a', 17) + K.line('M62 104 C52 118 52 132 60 142', skin, 13) + K.vol(K.ell(62, 144, 9.5, 9), sk);
      // голова: кудри, борода-облако, венок
      s += K.vol(K.ell(100, 58, 24, 25), sk);
      for (const [x, y, r] of [[76, 48, 9], [80, 34, 9], [92, 26, 9.5], [108, 26, 9.5], [120, 34, 9], [124, 48, 9], [74, 62, 7.5], [126, 62, 7.5]]) s += K.vol(K.ell(x, y, r, r * 0.95), { c1: '#ffffff', c2: '#b8c2d4', tex: false, lw: 2, line: '#475569', rimK: 0.5 });
      s += K.part('M80 50 C80 38 90 32 100 32 C110 32 120 38 120 50 C114 44 106 42 100 44 C94 42 86 44 80 50Z', '#f1f5f9', { line: '#64748b', lw: 1.6 });
      s += grLaurel(K, 100, 44, 26, 16, -172, -8, 9, '#fbbf24', 5.2, '#92400e');
      const beard = 'M72 64 C62 82 64 102 72 114 C70 124 80 130 88 126 C92 134 100 136 106 130 C114 134 122 128 122 120 C132 114 138 96 128 64 C120 76 110 80 100 80 C90 80 80 76 72 64Z';
      s += K.vol(beard, { c1: '#ffffff', c2: '#b8c2d4', rim: '#fff6b0', rimK: 0.7, shadeK: 0.35, tex: false, lw: 2.4, line: '#475569' });
      s += K.line('M84 92 q-4 12 0 22 M100 90 q-3 16 1 32 M116 92 q4 12 0 22', '#a8b4c8', 2);
      s += K.mirror(K.part('M100 76 C92 72 80 74 74 82 C74 86 78 88 82 86 C88 82 94 82 100 82Z', '#ffffff', { line: '#64748b', lw: 1.6 }));
      s += K.eyes(100, 60, 10, 6.4, { iris: '#f59e0b', lid: 'angry', skin, look: [0.2, 0.2] });
      s += `<circle class="art-blink" cx="90" cy="60" r="7" fill="${K.rad([[0, '#fde047', 0.45], [1, '#facc15', 0]])}"/><circle class="art-blink" cx="110" cy="60" r="7" fill="${K.rad([[0, '#fde047', 0.45], [1, '#facc15', 0]])}"/>`;
      s += K.mirror(K.part('M98 52 C94 46 86 45 80 49 C84 50 86 52 88 55 C92 52 96 53 98 52Z', '#ffffff', { line: '#64748b', lw: 1.4 }));
      s += `<ellipse cx="100" cy="70" rx="5" ry="4" fill="${K.rad([[0, '#ffc3a0'], [1, '#d08060']], 0.4, 0.35, 0.7)}" stroke="#7a3a24" stroke-width="1.4"/>`;
      s += K.spark(40, 30, 3.6, '#fde047') + K.spark(186, 130, 3, '#fff7c2', 'art-float') + K.spark(12, 90, 2.8, '#fde047') + K.spark(128, 12, 2.6, '#fff7c2', 'art-float');
      return s;
    },

    // Онейрик: маленький сон-облачко, сбежавший из пещеры Гипноса. Пушистый, сонно зевает, машет крылышками-пёрышками,
    // обнимает красный мак (цветок сна) и сидит на подушке с кисточками. Над ним — пузырь со сном: прыгает барашек
    gr_oneirik(K) {
      const cl = { c1: '#d9ccff', c2: '#5b3aa8', rim: '#f5d0fe', rimK: 0.7, texK: 0.5 };
      let s = K.aura('#a78bfa', 90, 112, 0.45);
      // подушка с кисточками
      s += K.vol('M52 160 C52 150 70 148 100 148 C130 148 148 150 148 160 C148 172 130 176 100 176 C70 176 52 172 52 160Z', { c1: '#fbcfe8', c2: '#9d4f9a', rim: '#f5d0fe', tex: false, lw: 2.2, line: '#4a1d4a' });
      s += K.stitch('M58 160 Q100 168 142 160', '#fde68a', 1.4) + K.mirror(K.line('M52 160 l-8 -4 M52 160 l-8 4 M52 160 l-9 0', '#fde68a', 2));
      let c = '';
      // крылышки
      const wing = K.g(K.part('M62 108 C50 96 36 94 28 100 C34 104 36 108 34 114 C40 114 44 118 44 124 C52 120 58 116 64 116Z', '#f5f3ff', { line: '#5b3aa8', lw: 1.6 }) + K.line('M58 108 L36 102 M58 112 L40 114', '#c4b5fd', 1.2), '', 'art-wing');
      c += K.mirror(wing);
      // тело-облачко
      const body = 'M62 140 C50 138 46 126 54 118 C50 104 62 92 76 96 C80 82 96 76 108 82 C120 74 138 82 138 96 C150 96 158 108 152 120 C160 128 156 142 146 142 C140 150 126 154 116 150 C106 156 92 156 84 150 C74 154 62 150 62 140Z';
      c += K.vol(body, cl);
      c += K.gloss(78, 100, 9, 5, -35, 0.4);
      // зевает, глаза слипаются
      c += K.eyes(104, 110, 14, 8.4, { iris: '#a855f7', lid: 'half', look: [0, 0.3] });
      c += K.blush(84, 122, 5.4) + K.blush(124, 122, 5.4) + K.mouth('o', 104, 118, 12);
      // мак в лапках
      c += K.line('M96 150 C92 144 86 142 80 140', '#3f6212', 2.4) + K.leaf(90, 146, 10, 200, '#65a30d');
      c += `<g transform="translate(76 138)">` + [0, 72, 144, 216, 288].map(a => `<ellipse cx="${f(5 * Math.cos(a * Math.PI / 180))}" cy="${f(5 * Math.sin(a * Math.PI / 180))}" rx="6" ry="5" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.1"/>`).join('') + `<circle r="3" fill="#1c1917"/></g>`;
      c += K.vol(K.ell(92, 146, 6, 5), { ...cl, tex: false, lw: 1.8 }) + K.vol(K.ell(106, 146, 6, 5), { ...cl, tex: false, lw: 1.8 });
      s += K.g(c, '', 'art-float');
      // пузырь-сон с барашком
      s += `<circle cx="150" cy="80" r="3" fill="#f5d0fe" opacity=".7"/><circle cx="156" cy="68" r="4.4" fill="#f5d0fe" opacity=".7"/>`;
      s += `<circle cx="160" cy="42" r="20" fill="${K.rad([[0, '#faf5ff', 0.9], [1, '#c4b5fd', 0.6]])}" stroke="#a78bfa" stroke-width="1.6"/>`;
      s += `<g class="art-float"><path d="M150 44 C148 38 154 34 158 37 C160 32 168 33 168 39 C172 40 172 46 168 47 C166 51 156 51 154 48 C150 49 148 47 150 44Z" fill="#fff" stroke="#6b7280" stroke-width="1.2"/><ellipse cx="170" cy="40" rx="3.6" ry="3" fill="#374151"/>` + K.line('M155 49 V54 M165 49 V54', '#374151', 1.6) + '</g>';
      s += K.line('M144 58 H176', '#a78bfa', 1.2, { op: 0.6 });
      s += grZ(30, 58, 1, '#e9d5ff', -0.4) + grZ(20, 44, 0.7, '#e9d5ff', -1.2);
      s += K.spark(28, 150, 3, '#fde68a') + K.spark(176, 120, 2.8, '#f5d0fe', 'art-float') + K.spark(100, 30, 2.4, '#fde68a');
      return s;
    },

    // Онейр: крылатый дух сновидений. Полупрозрачное тело тает дымным завитком, большие крылья ночной бабочки со
    // звёздами и «глазками», на голове — венок из маков. Держит рог — из рога вылетают пузыри-сны с картинками:
    // месяц, рыбка, звёздочка. Вещий ли сон — не знает и сам
    gr_oneir(K) {
      const cl = { c1: '#b3a3f7', c2: '#2e1a66', rim: '#f5d0fe', rimK: 0.7, texK: 0.55 };
      let s = K.aura('#8b5cf6', 96, 104, 0.45);
      // крылья ночной бабочки
      const wing = K.g(K.vol('M84 92 C64 60 36 44 14 50 C8 64 16 80 30 90 C18 96 16 112 24 124 C40 128 58 120 70 110 C76 104 80 98 84 92Z', { c1: '#7c6cf0', c2: '#1b1147', rim: '#f5d0fe', rimK: 0.6, texK: 0.7 }) +
        `<circle cx="38" cy="72" r="9" fill="${K.rad([[0, '#fde68a'], [0.5, '#f472b6'], [1, '#6d28d9']])}" stroke="#1b1147" stroke-width="1.4"/><circle cx="38" cy="72" r="3" fill="#1b1147"/>` +
        `<circle cx="38" cy="112" r="5.4" fill="#f9a8d4" stroke="#1b1147" stroke-width="1.2"/>` + K.line('M80 94 C60 76 40 66 22 60 M76 102 C58 104 40 110 28 118', '#c4b5fd', 1.3, { op: 0.6 }), '', 'art-wing');
      s += K.mirror(wing);
      // тело с дымным хвостом
      const body = 'M100 70 C120 70 132 86 130 106 C128 124 122 136 116 148 C110 158 112 168 122 176 C104 178 92 170 90 160 C88 150 80 140 74 124 C66 104 76 70 100 70Z';
      s += K.g(K.vol(body, cl) + K.line('M92 88 C88 110 90 132 100 152 M110 86 C114 104 114 120 110 136', '#c4b5fd', 1.4, { op: 0.4 }), '', 'art-float');
      // голова: лицо в тени, венок из маков
      s += K.vol(K.ell(100, 58, 22, 21), cl);
      s += K.part('M84 60 C84 48 92 44 100 44 C108 44 116 48 116 60 C116 70 108 76 100 76 C92 76 84 70 84 60Z', '#1b1147', { line: '#0b0620', lw: 1.6 });
      s += K.glow(92, 60, 4.6, 5.8, '#e9d5ff') + K.glow(108, 60, 4.6, 5.8, '#e9d5ff');
      s += K.line('M96 70 Q100 72 104 70', '#c4b5fd', 1.6);
      for (const [x, y] of [[82, 44], [92, 38], [108, 38], [118, 44]]) s += `<g transform="translate(${x} ${y})">` + [0, 90, 180, 270].map(a => `<ellipse cx="${f(3.4 * Math.cos(a * Math.PI / 180))}" cy="${f(3.4 * Math.sin(a * Math.PI / 180))}" rx="4" ry="3.4" fill="#ef4444" stroke="#7f1d1d" stroke-width="1"/>`).join('') + `<circle r="2" fill="#1c1917"/></g>`;
      s += K.leaf(100, 38, 9, -90, '#65a30d');
      // рог с пузырями-снами
      s += K.line('M122 96 C132 100 138 104 142 110', '#1b1147', 10) + K.line('M122 96 C132 100 138 104 142 110', '#9b87f5', 7);
      s += K.part('M134 118 C142 110 150 104 162 98 C166 94 170 96 168 102 C162 112 154 124 142 130 C138 128 134 124 134 118Z', '#f5e6c8', { line: '#6b4a24', lw: 1.8 }) + K.line('M142 112 l6 6 M148 106 l6 6 M154 102 l5 5', '#c9a36a', 1.4);
      s += K.vol(K.ell(142, 114, 7, 6.5), { ...cl, tex: false, lw: 2 });
      const bub = (x, y, r, inner, d) => `<g class="art-float" style="animation-delay:${d}s"><circle cx="${x}" cy="${y}" r="${r}" fill="${K.rad([[0, '#faf5ff', 0.85], [1, '#c4b5fd', 0.5]])}" stroke="#e9d5ff" stroke-width="1.4"/>${inner}<circle cx="${x - r * 0.4}" cy="${y - r * 0.4}" r="${f(r * 0.2)}" fill="#fff"/></g>`;
      s += bub(170, 78, 11, grMoon(K, 170, 78, 6, 3, -2, '#fde68a', '#f59e0b'), -0.3);
      s += bub(182, 48, 9, `<path d="M176 48 Q182 42 188 48 Q182 54 176 48Z M176 48 L172 44 V52Z" fill="#fb923c" stroke="#9a3412" stroke-width=".8"/>`, -1.1);
      s += bub(156, 26, 8, K.spark(156, 26, 4.4, '#fde68a', ''), -1.8);
      // левая рука
      s += K.line('M78 96 C68 104 62 114 60 124', '#1b1147', 10) + K.line('M78 96 C68 104 62 114 60 124', '#9b87f5', 7) + K.vol(K.ell(60, 126, 6.5, 6), { ...cl, tex: false, lw: 2 });
      s += K.spark(22, 150, 3, '#fde68a') + K.spark(40, 20, 2.8, '#f5d0fe', 'art-float') + K.spark(176, 150, 2.6, '#fde68a');
      return s;
    },

    // Морфей: бог сновидений, сын Гипноса. Звёздный плащ-хитон цвета ночного неба с серебряными звёздами и меандром,
    // тёмные кудри, крылышки на висках, мечтательный полуприкрытый взгляд. В одной руке — букет маков, в другой на
    // палочке — маска строгого учителя в очках (он может присниться кем угодно). За спиной месяц, вокруг «з-з-з»
    gr_morfey(K) {
      const skin = '#f3d6c0', sk = { c1: skin, c2: '#c89a86', rim: '#f5d0fe', tex: false, lw: 2.2, line: '#6b4a5a' };
      const robe = { c1: '#6a5ae0', c2: '#150d3a', rim: '#f5d0fe', rimK: 0.6, texK: 0.6, lw: 2.4, line: '#0b0620' };
      let s = K.aura('#7c3aed', 98, 100, 0.5);
      s += grMoon(K, 148, 42, 26, 10, -8, '#fef3c7', '#fbbf24', 0.9);
      // туман сна внизу
      for (const [x, y, r, d] of [[40, 172, 26, -0.3], [160, 172, 26, -1.1], [100, 182, 34, -0.7]]) s += `<ellipse class="art-float" style="animation-delay:${d}s" cx="${x}" cy="${y}" rx="${f(r * 1.5)}" ry="${f(r * 0.5)}" fill="${K.rad([[0, '#c4b5fd', 0.55], [1, '#818cf8', 0]])}"/>`;
      // хитон-плащ
      const cloak = 'M80 78 Q100 70 120 78 C132 100 142 136 152 172 Q126 180 100 176 Q74 180 48 172 C58 136 68 100 80 78Z';
      s += K.vol(cloak, robe);
      s += grClip(K, cloak, `<path d="M40 162 Q100 176 160 162 V190 H40Z" fill="#0b0620"/>` + grKey(K, 44, 165, 112, 6, '#c4b5fd', 1.2));
      s += K.line('M90 86 C86 116 80 144 74 170 M110 86 C116 116 122 144 128 170 M100 90 V174', '#0b0620', 1.8, { op: 0.4 });
      for (const [x, y, r] of [[70, 130, 3.4], [128, 118, 3], [96, 148, 3.6], [116, 156, 2.6], [84, 104, 2.4]]) s += K.spark(x, y, r, '#e9d5ff', '');
      // руки: мак и маска учителя
      const aL = 'M82 88 C70 98 60 106 54 112';
      s += K.line(aL, '#0b0620', 12) + K.line(aL, '#4c3fc0', 9);
      for (const [x, y, r] of [[40, 86, -20], [52, 80, 0], [62, 88, 20]]) {
        s += K.line(`M52 112 L${x} ${y}`, '#3f6212', 2.2);
        s += `<g transform="translate(${x} ${y}) rotate(${r})">` + [0, 72, 144, 216, 288].map(a => `<ellipse cx="${f(4.4 * Math.cos(a * Math.PI / 180))}" cy="${f(4.4 * Math.sin(a * Math.PI / 180))}" rx="5.4" ry="4.4" fill="#ef4444" stroke="#7f1d1d" stroke-width="1"/>`).join('') + `<circle r="2.6" fill="#1c1917"/></g>`;
      }
      s += K.vol(K.ell(53, 113, 6.5, 6), sk);
      const aR = 'M118 88 C130 98 140 104 146 108';
      s += K.line(aR, '#0b0620', 12) + K.line(aR, '#4c3fc0', 9);
      s += K.line('M148 108 L160 76', '#78350f', 2.6);
      s += K.g(K.part('M-15 -2 C-15 -14 -8 -20 0 -20 C8 -20 15 -14 15 -2 C15 10 8 18 0 18 C-8 18 -15 10 -15 -2Z', '#fef3c7', { line: '#6b4a24', lw: 1.8 }) +
        `<circle cx="-6" cy="-4" r="5" fill="#e0f2fe" stroke="${K.INK}" stroke-width="1.8"/><circle cx="6" cy="-4" r="5" fill="#e0f2fe" stroke="${K.INK}" stroke-width="1.8"/>` + K.line('M-1 -4 H1', K.INK, 1.8) +
        `<circle cx="-6" cy="-4" r="1.6" fill="${K.INK}"/><circle cx="6" cy="-4" r="1.6" fill="${K.INK}"/>` + K.line('M-11 -12 L-2 -10 M11 -12 L2 -10', K.INK, 1.8) +
        K.part('M-8 6 C-4 4 -1 5 0 6 C1 5 4 4 8 6 C6 9 2 8 0 7 C-2 8 -6 9 -8 6Z', '#57534e', { line: '#1c1917', lw: 1 }) + K.line('M-4 12 H4', K.INK, 1.6), 'translate(162 64) rotate(10)');
      s += K.vol(K.ell(147, 109, 6.5, 6), sk);
      // голова
      s += K.vol(K.ell(100, 54, 20, 21), sk);
      for (const [x, y, r] of [[82, 50, 7], [84, 38, 7.5], [94, 31, 7.5], [106, 31, 7.5], [116, 38, 7.5], [118, 50, 7]]) s += K.vol(K.ell(x, y, r, r), { c1: '#4c3fc0', c2: '#120a38', tex: false, lw: 1.8, line: '#0b0620', rimK: 0.5 });
      s += K.part('M82 50 C82 40 90 36 100 36 C110 36 118 40 118 50 C112 44 106 44 100 46 C94 44 88 44 82 50Z', '#2e2480', { line: '#0b0620', lw: 1.4 });
      const tw = K.g(K.part('M0 0 C-6 -6 -14 -10 -22 -8 C-18 -4 -16 -2 -14 0 C-18 2 -20 4 -20 8 C-12 6 -6 4 0 4Z', '#f5f3ff', { line: '#4c1d95', lw: 1.4 }) + K.line('M-4 1 L-18 -5 M-4 3 L-16 5', '#c4b5fd', 1), 'translate(80 46) rotate(-10)', 'art-wing');
      s += tw + `<g transform="translate(200 0) scale(-1 1)">${tw}</g>`;
      s += K.closed(100, 58, 7.5, 4.6, false) + K.line('M88 52 Q93 50 97 52 M103 52 Q107 50 112 52', '#2e2480', 1.8);
      s += K.blush(88, 64, 3.6) + K.blush(112, 64, 3.6) + K.mouth('smile', 100, 66, 8);
      s += grZ(26, 48, 1.1, '#e9d5ff', -0.2) + grZ(16, 30, 0.8, '#e9d5ff', -1) + grZ(180, 110, 0.9, '#e9d5ff', -1.6);
      s += K.spark(100, 10, 3.4, '#fde68a') + K.spark(184, 150, 2.8, '#f5d0fe', 'art-float') + K.spark(16, 130, 2.6, '#fde68a');
      return s;
    },

    // Медуза: горгона-модница. Вместо волос — клубок любопытных змеек с мордочками и язычками, на глазах — большие тёмные
    // очки (чтобы ненароком никого не окаменить), сиреневая улыбка, золотые серьги, хитон с меандром и брошью.
    // Рядом на капители колонны — её старый знакомый, каменный голубь
    gr_meduza(K) {
      const skin = '#a7dcb8', sk = { c1: skin, c2: '#4f9a72', rim: '#e9d5ff', tex: false, lw: 2.2, line: '#1f5a44' };
      const sn = { c1: '#86efac', c2: '#166534', rim: '#e9d5ff', rimK: 0.5, tex: false, lw: 2, line: '#0f3d20' };
      let s = K.aura('#a78bfa', 96, 104, 0.45);
      // колонна с каменным голубем
      s += K.vol('M150 132 H176 V180 H150Z', { c1: '#f1f5f9', c2: '#94a3b8', rim: '#e9d5ff', tex: false, lw: 2, line: '#475569' }) + K.line('M156 134 V178 M163 134 V178 M170 134 V178', '#94a3b8', 1.2);
      s += K.part('M142 124 C146 118 180 118 184 124 C184 130 180 132 176 132 H150 C146 132 142 130 142 124Z', '#e2e8f0', { line: '#475569', lw: 1.8 }) + `<circle cx="148" cy="126" r="3" fill="none" stroke="#64748b" stroke-width="1.2"/><circle cx="178" cy="126" r="3" fill="none" stroke="#64748b" stroke-width="1.2"/>`;
      s += K.vol('M150 118 C148 106 156 98 166 100 C170 92 180 92 180 100 C182 104 178 106 176 106 C178 112 174 118 166 120 Z', { c1: '#d6d3d1', c2: '#78716c', rim: '#e9d5ff', tex: false, lw: 1.8, line: '#44403c' });
      s += `<circle cx="174" cy="98" r="1.4" fill="#44403c"/><path d="M180 99 l4 1.4 l-4 1.2z" fill="#a8a29e" stroke="#44403c" stroke-width=".8"/>` + K.line('M154 110 q6 3 12 0', '#78716c', 1.2);
      // бюст в хитоне
      const bust = 'M54 134 C58 114 76 106 100 106 C124 106 142 114 146 134 L150 180 H50Z';
      s += K.vol(bust, { c1: '#a78bfa', c2: '#3b0764', rim: '#e9d5ff', rimK: 0.6, texK: 0.4, lw: 2.4, line: '#1e0b36' });
      s += K.part('M80 108 Q100 128 120 108 Q112 106 100 106 Q88 106 80 108Z', skin, { line: '#1f5a44', lw: 1.8 });
      s += K.line('M80 108 Q100 130 120 108', '#b45309', 5) + K.line('M80 108 Q100 130 120 108', '#fcd34d', 3);
      s += `<circle cx="100" cy="122" r="5" fill="${K.lin(['#fde68a', '#d4a017'])}" stroke="#78350f" stroke-width="1.4"/><circle cx="100" cy="122" r="2" fill="#7c3aed"/>`;
      s += grClip(K, bust, grKey(K, 44, 168, 112, 7, '#fcd34d', 1.4)) + K.line('M70 140 C68 154 66 166 64 178 M130 140 C132 154 134 166 136 178', '#1e0b36', 1.6, { op: 0.4 });
      s += K.line('M92 100 V110 M108 100 V110', '#1f5a44', 10) + K.line('M92 100 V110 M108 100 V110', skin, 7);
      // змейки: за головой и над ней
      const snake = (d, hx, hy, r, d2) => `<g class="art-sway" style="animation-delay:${d2}s;transform-origin:50% 100%">` + K.line(d, '#0f3d20', 10) + K.line(d, '#4ade80', 6.4) + `<path d="${d}" fill="none" stroke="#166534" stroke-width="6.4" stroke-dasharray="1.6 4" opacity=".45"/>` +
        K.g(K.vol(K.ell(0, 0, 7.4, 6), sn) + `<circle cx="-2.4" cy="-1.4" r="1.6" fill="${K.INK}"/><circle cx="2.4" cy="-1.4" r="1.6" fill="${K.INK}"/><circle cx="-2.8" cy="-1.9" r=".5" fill="#fff"/><circle cx="2" cy="-1.9" r=".5" fill="#fff"/>` + K.line('M0 5 V9 M0 9 l-2 2 M0 9 l2 2', '#ef4444', 1.1), `translate(${hx} ${hy}) rotate(${r})`) + '</g>';
      s += snake('M80 64 C66 56 58 60 52 70', 50, 72, -40, -0.2) + snake('M120 64 C134 56 142 60 148 70', 150, 72, 40, -0.9);
      s += snake('M84 52 C72 40 70 28 60 24', 58, 22, -20, -0.5) + snake('M116 52 C128 40 130 28 140 24', 142, 22, 20, -1.3);
      s += snake('M94 46 C90 34 90 22 84 14', 84, 12, -8, -0.7) + snake('M106 46 C110 34 110 22 116 14', 116, 12, 8, -1.6);
      s += snake('M100 46 C100 34 100 20 100 8', 100, 6, 0, -1.1);
      // голова
      s += K.vol(K.ell(100, 76, 25, 26), sk);
      s += K.part('M76 72 C74 56 86 48 100 48 C114 48 126 56 124 72 C118 62 110 58 100 60 C90 58 82 62 76 72Z', '#22c55e', { line: '#0f3d20', lw: 1.8 });
      s += K.line('M84 58 q4 3 8 0 M108 58 q4 3 8 0', '#86efac', 1.4, { op: 0.8 });
      // серьги
      s += K.mirror(`<circle cx="75" cy="88" r="3.4" fill="#fcd34d" stroke="#78350f" stroke-width="1.2"/><path d="M75 91 l-3 6 h6z" fill="#fcd34d" stroke="#78350f" stroke-width="1.1"/>`);
      // тёмные очки
      s += K.line('M77 74 L72 72 M123 74 L128 72', '#1e0b36', 2.4);
      s += K.mirror(`<path d="M78 70 C78 66 81 64 86 64 H96 C98 64 99 66 99 68 C99 76 95 82 88 82 C82 82 78 78 78 70Z" fill="${K.lin(['#4c1d95', '#0b0620'])}" stroke="#0b0620" stroke-width="2"/><path d="M82 68 L88 67 L84 74Z" fill="#fff" opacity=".45"/>`);
      s += K.line('M99 68 Q100 66 101 68', '#0b0620', 2);
      s += K.blush(82, 88, 4) + K.blush(118, 88, 4);
      s += `<path d="M91 92 Q100 99 109 92 Q100 95 91 92Z" fill="#a855f7" stroke="#581c87" stroke-width="1.6" stroke-linejoin="round"/>`;
      s += K.spark(24, 110, 3.2, '#e9d5ff') + K.spark(30, 150, 2.6, '#fde68a', 'art-float') + K.spark(182, 70, 2.8, '#e9d5ff') + K.spark(170, 40, 2.4, '#fde68a', 'art-float');
      return s;
    },

    // Посейдон (легенда): владыка морей поднимается из волн. Бирюзовые кудри и борода, будто пена прибоя, золотая
    // зубчатая корона, суровый взгляд. Морской плащ через плечо с ракушкой-застёжкой, в руке — золотой трезубец,
    // над другой ладонью бьёт источник-водоворот, рядом из волны выпрыгивает дельфин
    gr_poseidon(K) {
      const skin = '#e8b894', sk = { c1: skin, c2: '#b07a58', rim: '#c8f3ff', tex: false, lw: 2.4, line: '#6b3a24' };
      const hair = { c1: '#a7f3e4', c2: '#0f766e', rim: '#c8f3ff', rimK: 0.7, tex: false, lw: 2.2, line: '#064e46' };
      let s = K.aura('#38bdf8', 100, 96, 0.55) + K.aura('#5eead4', 60, 72, 0.3);
      // трезубец
      s += K.line('M152 34 V176', '#78350f', 6) + K.line('M152 34 V176', '#fcd34d', 3.6);
      s += K.part('M136 16 L140 34 Q152 42 164 34 L168 16 L162 26 L160 36 Q152 38 144 36 L142 26Z', '#fcd34d', { line: '#78350f', lw: 1.8 });
      s += K.part('M148 36 L152 4 L156 36Z', '#fde68a', { line: '#78350f', lw: 1.6 }) + `<path d="M133 18 L136 10 L140 20Z M164 20 L168 10 L171 18Z" fill="#fde68a" stroke="#78350f" stroke-width="1.4" stroke-linejoin="round"/>`;
      s += `<circle cx="152" cy="42" r="3.4" fill="#38bdf8" stroke="#0c4a6e" stroke-width="1.2"/>` + K.spark(152, 8, 4, '#fff');
      // тело
      s += K.vol('M56 100 C48 120 48 146 52 168 H148 C152 146 152 120 144 100 Q100 86 56 100Z', sk);
      s += K.line('M72 114 Q80 120 90 114 M110 114 Q120 120 128 114 M100 124 V150', '#8a5238', 1.6, { op: 0.5 });
      // морской плащ через плечо
      const cape = 'M100 92 C116 90 134 94 146 102 C150 124 150 146 148 168 H112 C120 148 122 126 112 108Z';
      s += K.vol(cape, { c1: '#5eead4', c2: '#0c4a6e', rim: '#c8f3ff', rimK: 0.6, texK: 0.25, lw: 2.2, line: '#062e3f' });
      s += K.line('M118 112 C126 132 128 150 126 168', '#fcd34d', 2.2, { op: 0.9 });
      s += K.g(K.part('M0 8 L-9 -4 C-6 -9 6 -9 9 -4Z', '#fbcfe8', { line: '#9d174d', lw: 1.4 }) + K.line('M0 7 L-5 -5 M0 7 L0 -7 M0 7 L5 -5', '#db2777', 1), 'translate(112 104)');
      // рука с трезубцем
      const aR = 'M138 104 C148 100 150 92 150 84';
      s += K.line(aR, '#6b3a24', 17) + K.line(aR, skin, 13) + K.vol(K.ell(151, 82, 9, 9.5), sk);
      // рука с источником
      const aL = 'M62 104 C50 108 42 100 40 90';
      s += K.line(aL, '#6b3a24', 17) + K.line(aL, skin, 13);
      s += `<g class="art-float">` + K.line('M40 80 C30 70 50 62 40 52 C32 44 44 36 40 28', '#0c4a6e', 7) + K.line('M40 80 C30 70 50 62 40 52 C32 44 44 36 40 28', '#7dd3fc', 4.4) + `<circle cx="32" cy="30" r="2.4" fill="#bae6fd"/><circle cx="48" cy="24" r="2" fill="#bae6fd"/><circle cx="40" cy="18" r="1.6" fill="#e0f2fe"/></g>`;
      s += K.vol(K.ell(40, 86, 10, 7.5), sk);
      // голова: волосы-прибой, корона, борода
      s += K.vol('M68 58 C62 40 74 24 96 22 C120 20 134 36 132 58 C140 66 138 80 128 82 L72 82 C62 80 60 66 68 58Z', hair);
      s += K.vol(K.ell(100, 58, 23, 24), sk);
      s += K.part('M78 54 C78 40 88 34 100 34 C112 34 122 40 122 54 C116 46 108 44 100 46 C92 44 84 46 78 54Z', '#5eead4', { line: '#064e46', lw: 1.6 });
      s += K.part('M76 38 L78 22 L86 32 L92 16 L100 30 L108 16 L114 32 L122 22 L124 38 Q100 32 76 38Z', '#fcd34d', { line: '#78350f', lw: 1.8 });
      s += `<circle cx="100" cy="34" r="2.6" fill="#38bdf8" stroke="#0c4a6e" stroke-width="1"/><circle cx="86" cy="35" r="1.8" fill="#fff8e6"/><circle cx="114" cy="35" r="1.8" fill="#fff8e6"/>`;
      const beard = 'M74 64 C66 82 68 102 76 114 C76 124 86 128 92 124 C96 132 104 132 108 124 C116 128 124 122 124 114 C132 102 134 82 126 64 C118 76 110 80 100 80 C90 80 82 76 74 64Z';
      s += K.vol(beard, { ...hair, shadeK: 0.4 });
      s += K.line('M86 90 C82 98 88 104 84 112 M100 88 C96 98 104 108 100 118 M114 90 C118 98 112 104 116 112', '#ccfbf1', 1.8, { op: 0.8 });
      s += K.mirror(K.part('M100 76 C92 72 82 74 76 82 C78 86 82 86 84 84 C90 80 94 80 100 82Z', '#99f6e4', { line: '#064e46', lw: 1.4 }));
      s += K.eyes(100, 60, 9.5, 6.4, { iris: '#0891b2', lid: 'angry', skin, look: [-0.2, 0.2] });
      s += K.mirror(K.part('M98 52 C94 48 86 47 80 50 C84 51 86 53 88 56 C92 53 96 54 98 52Z', '#5eead4', { line: '#064e46', lw: 1.2 }));
      s += `<ellipse cx="100" cy="70" rx="4.6" ry="3.6" fill="${K.rad([[0, '#f5c6a0'], [1, '#c0805e']], 0.4, 0.35, 0.7)}" stroke="#6b3a24" stroke-width="1.3"/>`;
      // дельфин из волны
      let dl = K.vol('M-22 6 C-16 -8 0 -14 14 -8 C20 -6 24 -2 28 -2 C24 2 20 4 16 4 C8 10 -8 12 -22 6Z', { c1: '#bae6fd', c2: '#1e5a8a', rim: '#c8f3ff', tex: false, lw: 1.8, line: '#0c2e4f' });
      dl += K.part('M-2 -10 L4 -20 L8 -8Z', '#3b82c4', { line: '#0c2e4f', lw: 1.4 }) + K.part('M-22 6 L-32 0 L-30 12Z', '#3b82c4', { line: '#0c2e4f', lw: 1.4 });
      dl += `<circle cx="16" cy="-4" r="1.6" fill="${K.INK}"/>` + K.line('M20 1 Q24 2 27 0', K.INK, 1);
      s += K.g(dl, 'translate(40 144) rotate(-24)', 'art-float');
      // волны
      s += grWaves(K, 0, 200, 162, '#38bdf8', '#0c4a6e', 25);
      s += K.spark(20, 100, 3.4, '#e0f2fe') + K.spark(180, 90, 3, '#fff', 'art-float') + K.spark(120, 12, 2.6, '#bae6fd') + K.spark(66, 20, 2.6, '#e0f2fe', 'art-float');
      return s;
    },
  });

  // ---------- расширение до 63 видов: третьи стадии, новые семьи, одиночные, легенды ----------
  Object.assign(SPIRIT_ART, {
    // Арион: подросший Гиппокамп вышел на берег — бессмертный конь Посейдона несётся галопом по гребням волн.
    // Шкура морской бирюзы, грива и хвост — пенные волны с завитками, золотая узда и золотые копыта, а у бабок
    // остались плавнички — память о рыбьем хвосте. Из-под копыт летят брызги
    gr_arion(K) {
      const sk = { c1: '#6ee0d4', c2: '#0a3a55', rim: '#c8f3ff', rimK: 0.7, texK: 0.22 };
      const fin = K.lin(['#bae6fd', '#38bdf8', '#0c4a6e']);
      let s = K.aura('#38bdf8', 100, 100, 0.5);
      // хвост — закрученная волна
      s += `<path d="M156 104 C172 88 198 94 196 118 C194 136 176 142 166 132 C176 132 184 124 180 114 C176 104 164 106 162 116 C158 112 156 108 156 104Z" fill="${fin}" stroke="#062e3f" stroke-width="2" stroke-linejoin="round"/>`;
      s += grCrest(K, 182, 140, 0.9, 20) + K.line('M170 98 C184 94 192 104 190 116', '#ecfeff', 2, { op: 0.8 });
      // ноги в галопе: дальние — темнее
      const hoof = (x, y, r) => K.g(`<path d="M-6 -3 H6 L7 5 H-7Z" fill="${K.lin(['#fde68a', '#d4a017'])}" stroke="#78350f" stroke-width="1.4" stroke-linejoin="round"/>`, `translate(${x} ${y}) rotate(${r})`);
      const finlet = (x, y, r) => K.g(`<path d="M0 0 C-8 -2 -14 2 -16 8 C-10 7 -5 8 -1 10Z" fill="${fin}" stroke="#0c4a6e" stroke-width="1.2" stroke-linejoin="round"/>`, `translate(${x} ${y}) rotate(${r})`);
      const leg = (d, c) => K.line(d, '#062e3f', 13) + K.line(d, c, 9.4);
      s += leg('M94 118 C82 126 70 124 64 116 C60 112 56 114 54 120', '#1f9e98') + finlet(58, 116, 30) + hoof(53, 123, 70);
      s += leg('M148 130 C152 144 160 152 172 156', '#1f9e98') + finlet(166, 152, -150) + hoof(176, 157, -70);
      // волны под копытами
      s += grWaves(K, 0, 200, 170, '#38bdf8', '#0c4a6e', 25);
      // тело
      s += K.vol('M86 96 C106 88 140 88 158 98 C172 106 172 126 160 134 C144 144 110 144 96 138 C82 132 78 110 86 96Z', sk);
      s += K.line('M110 128 q4 4 8 0 q4 4 8 0 q4 4 8 0 M120 116 q4 4 8 0 q4 4 8 0', '#e0fbff', 1.4, { op: 0.6 });
      s += leg('M102 134 C98 148 90 156 78 160', '#2cc5c0') + finlet(84, 157, 160) + hoof(74, 161, 75);
      s += leg('M136 136 L134 164', '#2cc5c0') + finlet(134, 156, 180) + hoof(134, 167, 0);
      // шея
      s += K.vol('M74 58 C96 56 112 70 120 90 L126 104 L92 118 C88 104 82 92 78 84Z', sk);
      // грива из пенных гребней
      for (const [x, y, k, r] of [[86, 40, 1.05, -40], [100, 50, 1.1, -20], [112, 64, 1.1, 0], [121, 80, 1, 18], [128, 96, 0.9, 34]]) s += grCrest(K, x, y, k, r);
      // голова в профиль, ушко
      s += `<path d="M78 40 L84 18 L92 40Z" fill="#2cc5c0" stroke="#062e3f" stroke-width="2" stroke-linejoin="round"/><path d="M81 38 L84 25 L88 38Z" fill="#f9a8d4" opacity=".7"/>`;
      s += K.vol('M76 36 C88 36 96 46 96 58 L94 86 C92 94 82 96 74 92 C66 88 58 88 48 88 C38 88 30 82 32 74 C34 66 44 60 52 56 C58 44 66 36 76 36Z', sk);
      s += grCrest(K, 70, 40, 0.8, -60);
      s += K.gloss(64, 46, 6, 3.4, -30, 0.4);
      s += `<ellipse cx="39" cy="73" rx="2.8" ry="2" fill="#062e3f"/>` + K.line('M35 82 Q42 86 50 83', K.INK, 2);
      s += `<g class="art-eyes">${K.eye(70, 60, 9, { iris: '#0ea5e9', look: [-0.7, 0.1], lid: 'angry', skin: '#5fd0c5' })}</g>`;
      // золотая узда
      s += K.line('M48 62 L56 88 M52 64 C66 68 82 68 94 60', '#78350f', 4.4) + K.line('M48 62 L56 88 M52 64 C66 68 82 68 94 60', '#fcd34d', 2.4);
      s += `<circle cx="56" cy="86" r="3.6" fill="none" stroke="#fcd34d" stroke-width="2"/><circle cx="94" cy="60" r="2.6" fill="#fcd34d" stroke="#78350f" stroke-width="1"/>`;
      // брызги и искры
      s += `<g class="art-float"><path d="M64 166q3 -7 6 -2q-2 4 -6 2zM166 162q3 -7 6 -2q-2 4 -6 2zM120 168q2 -6 5 -2q-2 3 -5 2z" fill="#e0f2fe"/><circle cx="58" cy="150" r="2.4" fill="none" stroke="#e0f2fe" stroke-width="1.2"/><circle cx="182" cy="150" r="2" fill="none" stroke="#e0f2fe" stroke-width="1"/></g>`;
      s += K.spark(22, 40, 3.6, '#e0f2fe') + K.spark(150, 30, 3, '#fff', 'art-float') + K.spark(24, 120, 2.6, '#bae6fd') + K.spark(186, 64, 2.6, '#e0f2fe', 'art-float');
      return s;
    },

    // Бронт: старший из киклопов, «Гром». Могучий синий великан с одним горящим глазом, борода заплетена в косу с
    // золотыми кольцами, над макушкой клубится грозовая туча с молниями. Кожаный фартук с золотым меандром, золотые
    // наручи. Поднял над головой только что выкованную молнию для Зевса, другой рукой опирается на огромный молот
    gr_bront(K) {
      const sk = { c1: '#a8b8f0', c2: '#2a3270', rim: '#fff6b0', rimK: 0.65, texK: 0.2 };
      const gold = '#fcd34d';
      let s = K.aura('#facc15', 100, 100, 0.5);
      // грозовая туча над головой
      s += `<g class="art-blink">${grBolt(K, 44, 52, 22, 18)}</g><g class="art-blink" style="animation-delay:-.8s">${grBolt(K, 150, 54, 20, -16)}</g>`;
      s += K.vol(grCloudD(30, 168, 40, 26), { c1: '#b4c0d6', c2: '#2b3550', rim: '#fff6b0', rimK: 0.55, tex: false, lw: 2.2, line: '#1e293b' });
      // молот у ног
      s += K.line('M46 124 L40 160', '#3b1d0c', 7) + K.line('M46 124 L40 160', '#b97a4a', 4.4);
      s += K.g(K.vol('M-17 -10 H17 V10 H-17Z', { c1: '#94a3b8', c2: '#334155', rim: '#fff6b0', tex: false, lw: 2.2, line: '#0f172a' }) + K.line('M-15 -6 H15', '#f1f5f9', 1.6, { op: 0.8 }) + `<rect x="-5" y="-11" width="10" height="22" fill="#64748b" stroke="#0f172a" stroke-width="1.4"/>`, 'translate(40 166) rotate(-8)');
      // ноги в сандалиях
      s += K.mirror(K.vol('M66 146 H92 V172 C92 178 84 180 76 180 C66 180 62 176 64 170Z', { ...sk, lw: 2.4 }) + K.line('M66 166 L90 172 M66 172 L90 166', '#78350f', 2));
      // тело
      s += K.vol('M58 82 C46 98 46 128 56 150 H144 C154 128 154 98 142 82 Q100 70 58 82Z', sk);
      s += K.line('M80 96 Q90 102 100 96 Q110 102 120 96', '#1e2654', 1.6, { op: 0.6 });
      // фартук с меандром и пояс
      const apron = 'M64 116 H136 C140 132 140 148 136 164 H64 C60 148 60 132 64 116Z';
      s += K.vol(apron, { c1: '#a86a3a', c2: '#4a240c', rim: '#fff6b0', tex: false, lw: 2.2, line: '#2a1206' });
      s += grClip(K, apron, `<rect x="56" y="150" width="88" height="16" fill="#3b1a08"/>` + grKey(K, 62, 152, 76, 7, gold, 1.4));
      s += K.line('M58 114 Q100 120 142 114', '#78350f', 6) + K.line('M58 114 Q100 120 142 114', gold, 3.6);
      s += `<circle cx="100" cy="117" r="5" fill="${K.lin(['#fef3c7', '#d4a017'])}" stroke="#78350f" stroke-width="1.4"/>` + grBolt(K, 100, 117, 9, 20);
      // рука с молотом
      const aL = 'M64 90 C52 102 46 112 46 124';
      s += K.line(aL, '#1e2654', 18) + K.line(aL, '#9fb0ea', 14) + K.part('M38 112 L54 114 L53 122 L38 120Z', gold, { line: '#78350f', lw: 1.4 });
      s += K.vol(K.ell(46, 126, 9, 8.5), { ...sk, tex: false, lw: 2.2 });
      // рука с молнией над головой
      s += `<circle class="art-aura" cx="166" cy="40" r="32" fill="${K.rad([[0, '#fffbe6', 0.9], [0.4, '#fde047', 0.5], [1, '#facc15', 0]])}"/>`;
      s += grBolt(K, 168, 36, 64, 18);
      const aR = 'M136 90 C150 86 160 76 164 62';
      s += K.line(aR, '#1e2654', 18) + K.line(aR, '#9fb0ea', 14) + K.part('M156 66 L172 70 L169 78 L154 74Z', gold, { line: '#78350f', lw: 1.4 });
      s += K.vol(K.ell(164, 60, 9.5, 9), { ...sk, tex: false, lw: 2.2 });
      // голова: уши, пучок с кольцом, коса-борода, один глаз
      s += K.mirror(K.vol(K.ell(72, 58, 7, 9), { ...sk, tex: false, lw: 2 }) + `<circle cx="70" cy="64" r="2.6" fill="none" stroke="${gold}" stroke-width="1.6"/>`);
      s += K.vol(K.ell(100, 54, 28, 27), sk);
      s += K.part('M92 30 C88 18 96 10 106 12 C100 16 102 22 108 28Z', '#1e2654', { line: '#0b1030', lw: 1.6 }) + `<ellipse cx="99" cy="28" rx="7" ry="3" fill="${gold}" stroke="#78350f" stroke-width="1.2"/>`;
      s += K.gloss(84, 38, 7, 4, -30, 0.35);
      const beard = 'M72 58 C68 80 78 96 90 102 C90 110 94 118 100 124 C106 118 110 110 110 102 C122 96 132 80 128 58 C120 72 110 76 100 76 C90 76 80 72 72 58Z';
      s += K.vol(beard, { c1: '#3a4a8a', c2: '#141a3f', tex: false, lw: 2, line: '#0b1030' });
      s += K.line('M82 84 q-2 6 2 12 M118 84 q2 6 -2 12 M94 106 L106 110 M94 112 L105 116', '#8fa2e0', 1.4, { op: 0.6 }) + `<rect x="91" y="102" width="18" height="4.4" rx="2.2" fill="${gold}" stroke="#78350f" stroke-width="1"/><rect x="94" y="116" width="12" height="4" rx="2" fill="${gold}" stroke="#78350f" stroke-width="1"/>`;
      s += `<circle class="art-blink" cx="100" cy="50" r="22" fill="${K.rad([[0, '#fde047', 0.45], [1, '#facc15', 0]])}"/>`;
      s += `<g class="art-eyes">${K.eye(100, 50, 15, { iris: '#facc15', look: [0.5, -0.5], lid: 'angry', skin: '#a8b8f0' })}</g>`;
      s += K.part('M74 34 Q100 22 126 34 Q126 40 121 41 Q100 31 79 41 Q74 40 74 34Z', '#1e2654', { line: '#0b1030', lw: 1.4 });
      s += K.mouth('teeth', 100, 80, 14);
      // искры
      s += K.spark(186, 90, 3.4, '#fde047', 'art-float') + K.spark(140, 14, 3, '#fff7c2') + K.spark(20, 80, 3, '#fde047') + K.spark(24, 140, 2.6, '#fff7c2', 'art-float') + K.spark(180, 140, 2.6, '#facc15');
      return s;
    },

    // Кентаврёнок: пухлый жеребёнок-кентавр — каштановая шкурка в светлых яблоках, белые носочки, хвост-метёлка;
    // спереди — мальчишеский торсик с большой лохматой головой в веночке. В одной руке игрушечный лук с ленточкой,
    // другой замахнулся шишкой — сейчас метко закинет её в урну. Вокруг кружат листочки
    gr_kentavrenok(K) {
      const coat = { c1: '#ecbf90', c2: '#8a5226', rim: '#e4ffb0', rimK: 0.55, texK: 0.14 };
      const skin = '#f9d2ac', sk = { c1: skin, c2: '#d8946a', rim: '#fff0c0', tex: false, lw: 2.2, line: '#7a4a2a' };
      const hair = '#7a4520';
      let s = K.aura('#84cc16', 92, 112, 0.42);
      s += K.g(K.leaf(24, 64, 12, -30, '#84cc16') + K.leaf(178, 56, 11, 200, '#65a30d'), '', 'art-float');
      // хвост-метёлка
      s += K.part('M150 128 C166 120 182 132 180 150 C179 162 172 172 160 176 C166 166 166 156 160 148 C161 158 157 167 149 171 C151 158 150 145 143 136Z', hair, { line: '#3b2412', lw: 1.8 });
      s += K.line('M156 132 C168 136 174 146 172 158', '#b07040', 1.4, { op: 0.7 });
      // ноги: дальние темнее, ближние — в белых носочках
      const leg = (x, c1, sock) => K.vol(`M${x - 7} 146 C${x - 8} 156 ${x - 7} 165 ${x - 6} 171 H${x + 6} C${x + 7} 165 ${x + 8} 156 ${x + 7} 146Z`, { ...coat, c1, tex: false, lw: 2 }) +
        (sock ? `<path d="M${x - 6.6} 162 H${x + 6.6} L${x + 6.2} 171 H${x - 6.2}Z" fill="#fff8ee" stroke="#7a4a2a" stroke-width="1.2" stroke-linejoin="round"/>` : '') +
        K.part(`M${x - 7.4} 170 H${x + 7.4} L${x + 7} 178 H${x - 7}Z`, '#4a2c14', { line: '#1a0e05', lw: 1.4 });
      s += leg(100, '#c8925e', false) + leg(152, '#c8925e', false);
      // туловище жеребёнка в светлых яблоках
      s += K.vol(K.ell(118, 138, 42, 24), coat);
      s += '<g fill="#fff6e6" opacity=".6">' + [[124, 128, 4], [138, 136, 3.4], [150, 127, 3], [132, 147, 2.6], [148, 144, 2.4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('') + '</g>';
      s += leg(88, coat.c1, true) + leg(140, coat.c1, true);
      // торсик с пояском из листьев
      s += K.vol('M72 142 C68 128 70 112 76 104 C82 99 96 98 102 103 C108 110 108 128 106 142Z', sk);
      s += K.line('M70 136 Q88 143 108 136', '#3f6212', 5) + K.leaf(78, 139, 10, 150, '#65a30d') + K.leaf(98, 139, 10, 30, '#84cc16');
      // игрушечный лук с ленточкой
      s += K.line('M58 90 C42 104 42 140 58 154', '#5a3412', 5.4) + K.line('M58 90 C42 104 42 140 58 154', '#d9a05a', 3.2) + K.line('M58 90 L58 154', '#fff8ee', 1.2);
      s += K.part('M47 120 L39 115 L40 126Z M47 123 L41 131 L46 133Z', '#ef4444', { line: '#7f1d1d', lw: 1 });
      // ручки: левая держит лук, правая замахнулась шишкой
      const aL = 'M78 108 C70 112 64 118 60 124';
      s += K.line(aL, '#7a4a2a', 9.5) + K.line(aL, skin, 6.6) + K.vol(K.ell(57, 124, 6, 6.4), sk);
      const aR = 'M100 108 C110 104 118 98 122 90';
      s += K.line(aR, '#7a4a2a', 9.5) + K.line(aR, skin, 6.6);
      s += `<g transform="translate(129 80) rotate(20)"><ellipse rx="7" ry="9.5" fill="${K.lin(['#c2691a', '#6b3410'])}" stroke="#3b1d0c" stroke-width="1.6"/>` + K.line('M-6 -4 L6 -1 M-6 2 L6 5 M-5 7 L5 9 M0 -9 V9', '#3b1d0c', 1, { op: 0.7 }) + '</g>';
      s += K.vol(K.ell(123, 89, 6, 6.4), sk);
      // ушки, голова, лохматая шевелюра с вихром и веночек
      s += K.vol(K.ell(59, 78, 6, 8), sk) + K.vol(K.ell(117, 78, 6, 8), sk) + `<ellipse cx="59" cy="78" rx="2.6" ry="4.4" fill="#f9a8b4" opacity=".7"/><ellipse cx="117" cy="78" rx="2.6" ry="4.4" fill="#f9a8b4" opacity=".7"/>`;
      s += K.vol(K.ell(88, 72, 30, 28), sk);
      s += K.part('M86 42 C84 32 90 24 100 24 C95 29 95 35 97 42Z', hair, { line: '#3b2412', lw: 1.6 });
      s += K.part('M59 72 C55 52 70 39 88 39 C106 39 121 51 117 72 C113 63 106 59 99 61 C95 55 87 55 81 59 C74 57 65 62 59 72Z', hair, { line: '#3b2412', lw: 1.8 });
      s += K.line('M70 52 Q76 48 82 50 M94 47 Q102 46 108 52', '#b07040', 1.4, { op: 0.7 });
      s += grLaurel(K, 88, 48, 28, 11, -172, -8, 7, '#65a30d', 4.6);
      s += K.gloss(70, 66, 5, 2.8, -35, 0.35);
      // мордочка
      s += K.eyes(88, 78, 12.5, 9.6, { iris: '#7a4a1a', look: [0.35, 0.1] });
      s += K.blush(68, 91, 5.4) + K.blush(108, 91, 5.4) + '<g fill="#c47a4a" opacity=".7"><circle cx="71" cy="86" r=".9"/><circle cx="74" cy="88" r=".9"/><circle cx="102" cy="88" r=".9"/><circle cx="105" cy="86" r=".9"/></g>';
      s += K.mouth('smile', 88, 92, 11);
      s += K.spark(30, 104, 3, '#e4ffb0') + K.spark(172, 98, 2.6, '#fde68a', 'art-float') + K.spark(140, 40, 2.4, '#e4ffb0');
      return s;
    },

    // Кентавр: подросший Кентаврёнок — вольный получеловек-полуконь с лесистого Пелиона. Взвился на дыбы, растрёпанная
    // шевелюра летит по ветру, на голове — венок из сосновых веток. Над головой победно вскинул лук, другой рукой тянется
    // к колчану за спиной и громко хохочет. Каштановая шкура в яблоках, белые носочки, хвост хлещет по ветру
    gr_kentavr(K) {
      const coat = { c1: '#dca06a', c2: '#5e3416', rim: '#e4ffb0', rimK: 0.55, texK: 0.15 };
      const skin = '#eebc90', sk = { c1: skin, c2: '#c07e52', rim: '#fff0c0', tex: false, lw: 2.2, line: '#6b3a1a' };
      const hair = '#4a2a12';
      let s = K.aura('#65a30d', 96, 104, 0.42);
      // хвост
      s += K.part('M156 118 C174 104 194 112 192 132 C190 146 180 154 170 156 C176 146 176 136 170 130 C172 140 166 148 158 150 C162 138 160 128 150 124Z', hair, { line: '#1e0f05', lw: 1.8 });
      s += K.line('M166 116 C180 116 188 126 186 140', '#8a5a30', 1.4, { op: 0.7 });
      // задние ноги на земле
      const hind = (x, c1, sock) => K.vol(`M${x - 13} 128 C${x - 15} 144 ${x - 6} 150 ${x - 6} 160 C${x - 6} 165 ${x - 7} 169 ${x - 7} 171 H${x + 6} C${x + 7} 165 ${x + 8} 156 ${x + 10} 146 C${x + 12} 138 ${x + 10} 128 ${x + 2} 124Z`, { ...coat, c1, lw: 2.2 }) +
        (sock ? `<path d="M${x - 6.4} 162 H${x + 6.6} L${x + 6.2} 171 H${x - 7}Z" fill="#fff8ee" stroke="#6b3a1a" stroke-width="1.2" stroke-linejoin="round"/>` : '') +
        K.part(`M${x - 8.4} 170 H${x + 7.4} L${x + 7.8} 178 H${x - 8.8}Z`, '#2a1a10', { line: '#0f0805', lw: 1.4 });
      s += hind(140, '#b47a48', false);
      // туловище на дыбах
      const body = K.ell(124, 122, 44, 23, 22);
      s += K.vol(body.d, { ...coat, t: body.t });
      s += K.g('<g fill="#fff6e6" opacity=".55">' + [[130, 112, 4], [146, 120, 3.4], [154, 110, 3], [136, 128, 2.6], [112, 114, 2.4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('') + '</g>', body.t);
      s += hind(158, coat.c1, true);
      // передние ноги поджаты в воздухе: предплечье вперёд, пясть вниз
      const fl = (d, c, hx, hy) => K.line(d, '#4a2810', 13) + K.line(d, c, 9.4) + K.part(`M${hx - 6} ${hy - 3} H${hx + 6} L${hx + 7} ${hy + 5} H${hx - 7}Z`, '#2a1a10', { line: '#0f0805', lw: 1.3 });
      s += fl('M92 120 L66 108 L60 124', '#b47a48', 60, 126);
      s += fl('M102 130 L76 124 L72 142', coat.c1, 72, 144);
      s += `<path d="M66.4 135 H77.6 L77 142 H66.6Z" fill="#fff8ee" stroke="#6b3a1a" stroke-width="1.1"/>`;
      // колчан за плечом
      s += K.g(K.part('M-7 -26 H7 V22 Q0 27 -7 22Z', '#8a4a1c', { line: '#3b1d0c', lw: 1.6 }) + K.line('M-7 -18 H7 M-7 14 H7', '#fcd34d', 2) +
        `<path d="M-6 -27 l-1 -9 l4 3Z M0 -27 l0 -10 l3 4Z M5 -27 l2 -9 l2 5Z" fill="#f8fafc" stroke="#64748b" stroke-width="1"/>`, 'translate(126 88) rotate(34)');
      // торс с поясом из листьев
      s += K.vol('M80 120 C74 106 74 90 80 80 C86 74 102 72 110 78 C116 88 116 106 112 118Z', sk);
      s += K.line('M88 92 Q96 96 104 92', '#a8683e', 1.4, { op: 0.6 }) + K.line('M78 116 Q96 124 114 114', '#3f6212', 5) + K.leaf(86, 120, 11, 150, '#65a30d') + K.leaf(106, 118, 11, 20, '#84cc16');
      // рука к колчану
      const aR = 'M108 82 C120 80 128 74 132 66';
      s += K.line(aR, '#6b3a1a', 10) + K.line(aR, skin, 7) + K.vol(K.ell(133, 64, 6, 6.2), sk);
      // лук над головой
      s += K.line('M66 14 C46 26 46 58 66 70', '#4a2810', 5.6) + K.line('M66 14 C46 26 46 58 66 70', '#c98a3c', 3.4) + K.line('M66 14 L66 70', '#fff8ee', 1.2);
      const aL = 'M82 84 C70 76 60 60 56 46';
      s += K.line(aL, '#6b3a1a', 10) + K.line(aL, skin, 7) + K.vol(K.ell(54, 43, 6.2, 6.4), sk);
      // голова: шевелюра по ветру, венок из сосновых веток
      s += K.part('M78 48 C80 32 96 26 108 30 C118 27 128 29 138 35 C131 37 129 40 133 44 C125 44 123 47 127 52 C120 52 117 55 119 61 C113 56 106 52 98 52 C90 52 84 54 78 48Z', '#5a3418', { line: '#1e0f05', lw: 1.8 });
      s += K.line('M110 34 C120 34 128 36 134 38 M114 44 C120 44 124 46 126 50', '#a8703e', 1.4, { op: 0.8 });
      s += K.vol(K.ell(96, 54, 20, 20), sk);
      s += K.part('M76 52 C76 38 86 32 98 32 C110 32 118 38 118 50 C112 44 104 42 98 44 C90 42 82 46 76 52Z', hair, { line: '#1e0f05', lw: 1.6 });
      s += grLaurel(K, 97, 40, 21, 9, -176, -4, 7, '#3f6212', 4.6, '#1a2e05');
      s += K.eyes(96, 56, 8.2, 6.2, { iris: '#65a30d', lid: 'angry', skin, look: [-0.4, -0.2] });
      s += K.blush(84, 64, 3.4) + K.blush(108, 64, 3.4) + K.mouth('grin', 96, 64, 12);
      s += K.spark(28, 94, 3, '#e4ffb0') + K.spark(178, 70, 2.8, '#fde68a', 'art-float') + K.spark(24, 156, 2.4, '#e4ffb0', 'art-float') + K.spark(150, 16, 2.4, '#fde68a');
      return s;
    },

    // Хирон: мудрейший из кентавров, учитель героев. Спокойно стоит: шкура в серебристых яблоках, длинный хвост, белая
    // борода до пояса, венок из дубовых листьев с жёлудем, добрый сонный прищур. Через плечо — белый гиматий с меандром,
    // за спиной — большой золотой лук. В одной руке свиток с уроками, в другой — пучок целебных трав. Позади сияет
    // созвездие Стрельца
    gr_hiron(K) {
      const coat = { c1: '#d2a476', c2: '#4a2c14', rim: '#e4ffb0', rimK: 0.55, texK: 0.12 };
      const skin = '#e8b48c', sk = { c1: skin, c2: '#b8805a', rim: '#fff0c0', tex: false, lw: 2.2, line: '#5a3418' };
      const white = { c1: '#ffffff', c2: '#b8c2d4', rim: '#e4ffb0', rimK: 0.5, tex: false, lw: 2.2, line: '#475569' };
      let s = K.aura('#84cc16', 100, 100, 0.45) + `<circle class="art-aura" cx="154" cy="40" r="38" fill="${K.rad([[0, '#f1f5f9', 0.4], [1, '#cbd5e1', 0]])}"/>`;
      // созвездие Стрельца
      s += grConst(K, [[130, 30, 3], [146, 22], [162, 30, 3.2], [182, 22], [178, 44, 2.8], [160, 50], [142, 46], [130, 30, 3]], '#f8fafc', 0.5);
      // хвост
      s += K.part('M164 124 C182 120 192 136 190 156 C188 168 180 176 170 178 C176 168 176 156 170 148 C170 160 166 170 158 174 C160 160 160 144 154 134Z', '#6b4a2e', { line: '#2a1a0c', lw: 1.8 });
      s += K.line('M170 130 C180 138 184 150 182 164', '#d6cbb8', 1.6, { op: 0.7 });
      // ноги
      const leg = (x, c1, sock) => K.vol(`M${x - 8} 140 C${x - 9} 152 ${x - 7} 163 ${x - 7} 171 H${x + 7} C${x + 7} 163 ${x + 9} 152 ${x + 8} 140Z`, { ...coat, c1, tex: false, lw: 2.2 }) +
        (sock ? `<path d="M${x - 7.4} 162 H${x + 7.4} L${x + 7} 171 H${x - 7}Z" fill="#f8fafc" stroke="#5a3418" stroke-width="1.2" stroke-linejoin="round"/>` : '') +
        K.part(`M${x - 8.4} 170 H${x + 8.4} L${x + 8} 178 H${x - 8}Z`, '#2a1a10', { line: '#0f0805', lw: 1.4 });
      s += leg(102, '#b08458', false) + leg(160, '#b08458', false);
      // туловище
      s += K.vol('M78 128 C78 112 98 106 124 108 C150 108 170 114 172 132 C174 148 160 156 128 156 C100 156 80 150 78 128Z', coat);
      s += '<g fill="#eef2f7" opacity=".6">' + [[124, 120, 4.4], [142, 126, 3.6], [158, 118, 3.2], [134, 140, 3], [152, 142, 2.6], [112, 132, 2.4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('') + '</g>';
      s += leg(90, coat.c1, true) + leg(146, coat.c1, true);
      // большой золотой лук за спиной
      s += K.line('M60 52 C86 30 128 50 132 92', '#78350f', 5.4) + K.line('M60 52 C86 30 128 50 132 92', '#fcd34d', 3.2) + K.line('M60 52 L132 92', '#f8fafc', 1, { op: 0.8 });
      // торс и гиматий с меандром
      s += K.vol('M72 134 C68 116 70 98 78 88 C86 82 106 82 114 88 C120 100 120 118 116 134Z', sk);
      const him = 'M70 96 C76 86 88 84 94 88 C104 104 112 120 118 136 L76 140 C72 124 70 110 70 96Z';
      s += K.vol(him, white);
      s += grClip(K, him, K.line('M90 86 C100 104 110 120 118 138', '#b45309', 6) + K.stitch('M90 86 C100 104 110 120 118 138', '#fcd34d', 1.6));
      s += K.line('M78 104 C80 116 80 126 78 136 M86 100 C90 114 92 126 92 138', '#94a3b8', 1.4, { op: 0.6 });
      // свиток в руке
      const aL = 'M76 96 C66 104 60 112 58 120';
      s += K.line(aL, '#5a3418', 10) + K.line(aL, skin, 7);
      s += K.part('M36 116 H62 V146 H36Z', '#fef3c7', { line: '#92400e', lw: 1.6 }) + K.line('M40 124 H58 M40 129 H56 M40 134 H58 M40 139 H52', '#a16207', 1.2, { op: 0.8 }) + grStar(52, 139, 3, '#fbbf24', '#92400e');
      s += `<rect x="32" y="112" width="34" height="6" rx="3" fill="${K.lin(['#d9a05a', '#8a5a24'])}" stroke="#5a3412" stroke-width="1.4"/><rect x="32" y="144" width="34" height="6" rx="3" fill="${K.lin(['#d9a05a', '#8a5a24'])}" stroke="#5a3412" stroke-width="1.4"/>`;
      s += K.vol(K.ell(58, 118, 6.4, 6.6), sk);
      // пучок целебных трав
      const aR = 'M112 94 C122 92 130 86 134 78';
      s += K.line(aR, '#5a3418', 10) + K.line(aR, skin, 7);
      s += K.line('M136 76 C136 64 132 56 126 50 M136 76 C138 62 142 54 148 48 M136 76 C140 68 146 66 152 64', '#3f6212', 2);
      s += K.leaf(130, 60, 9, -120, '#65a30d') + K.leaf(144, 58, 9, -60, '#84cc16') + K.leaf(148, 68, 8, -20, '#65a30d');
      s += '<g fill="#f8fafc" stroke="#7c3aed" stroke-width=".8">' + [[126, 50], [148, 48], [152, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('') + '</g>' + '<g fill="#fcd34d">' + [[126, 50], [148, 48], [152, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2"/>`).join('') + '</g>';
      s += K.vol(K.ell(135, 77, 6.4, 6.6), sk);
      // голова: белые волосы, дубовый венок, длинная борода
      s += K.vol(K.ell(94, 58, 20, 21), sk);
      s += K.part('M74 60 C70 42 80 32 94 32 C108 32 118 42 114 60 C110 50 104 46 94 46 C84 46 78 50 74 60Z', '#f1f5f9', { line: '#64748b', lw: 1.6 });
      s += grLaurel(K, 94, 44, 22, 10, -176, -4, 7, '#4d7c0f', 5, '#1a2e05') + `<ellipse cx="94" cy="34" rx="3.4" ry="4.2" fill="${K.lin(['#d9a05a', '#8a5a24'])}" stroke="#3b1d0c" stroke-width="1"/><path d="M90.6 32 Q94 28 97.4 32Z" fill="#5a3412"/>`;
      const beard = 'M76 62 C70 80 74 100 84 112 C88 120 94 124 96 128 C98 124 104 120 108 112 C116 100 118 80 112 62 C106 70 100 72 94 72 C88 72 82 70 76 62Z';
      s += K.vol(beard, { ...white, shadeK: 0.35 });
      s += K.line('M86 86 q-3 10 0 20 M94 84 q-2 14 1 28 M102 86 q3 10 0 20', '#a8b4c8', 1.6);
      s += K.part('M94 70 C88 66 80 68 76 74 C78 77 82 77 84 75 C88 72 91 72 94 74Z', '#ffffff', { line: '#64748b', lw: 1.3 }) + K.part('M94 70 C100 66 108 68 112 74 C110 77 106 77 104 75 C100 72 97 72 94 74Z', '#ffffff', { line: '#64748b', lw: 1.3 });
      s += K.eyes(94, 58, 8.4, 6, { iris: '#65a30d', lid: 'half', skin, look: [0.3, 0.2] });
      s += K.line('M80 50 Q86 47 91 50 M97 50 Q102 47 108 50', '#f8fafc', 2.4) + K.blush(80, 66, 3.4) + K.blush(108, 66, 3.4);
      s += K.spark(24, 70, 3, '#e4ffb0') + K.spark(184, 110, 2.8, '#f8fafc', 'art-float') + K.spark(26, 168, 2.4, '#e4ffb0', 'art-float') + K.spark(100, 12, 2.6, '#f8fafc');
      return s;
    },

    // Автоматончик: самоходный треножник из мастерской Гефеста — пузатый бронзовый котелок с личиком, ушки — ручки-кольца,
    // на крышке крутится шестерёнка, по брюшку бежит меандр. Три ножки-лапки на золотых колёсиках; сбоку пыхтит
    // пар — едет, куда позовут
    gr_avtomatonchik(K) {
      const br = { c1: '#f8cc8a', c2: '#a0612a', rim: '#fff6b0', rimK: 0.65, texK: 0.18, line: '#4a2408' };
      const wheel = (x, y, r) => `<g class="art-spin"><circle cx="${x}" cy="${y}" r="${r}" fill="${K.lin(['#fff3b0', '#e8a317', '#a16207'])}" stroke="#4a2408" stroke-width="1.8"/>` +
        K.line(`M${f(x - r * 0.75)} ${y}H${f(x + r * 0.75)}M${x} ${f(y - r * 0.75)}V${f(y + r * 0.75)}`, '#7c4318', 1.4) + `<circle cx="${x}" cy="${y}" r="${f(r * 0.3)}" fill="#7c4318"/></g>`;
      let s = K.aura('#facc15', 92, 112, 0.42);
      // пар
      s += `<g class="art-float"><circle cx="160" cy="76" r="7" fill="#fff" opacity=".45"/><circle cx="170" cy="64" r="5.4" fill="#fff" opacity=".4"/><circle cx="176" cy="52" r="4" fill="#fff" opacity=".35"/></g>`;
      // задняя ножка и передние лапки на колёсиках
      s += K.line('M100 146 V160', '#4a2408', 9) + K.line('M100 146 V160', '#c98a4a', 5.6) + wheel(100, 166, 8);
      const legL = 'M76 138 C72 148 66 154 62 160';
      s += K.line(legL, '#4a2408', 10) + K.line(legL, '#e0a35a', 6.6) + K.line('M124 138 C128 148 134 154 138 160', '#4a2408', 10) + K.line('M124 138 C128 148 134 154 138 160', '#e0a35a', 6.6);
      s += wheel(60, 168, 10) + wheel(140, 168, 10);
      // ручки-кольца
      s += K.mirror(`<circle cx="51" cy="100" r="9" fill="none" stroke="#4a2408" stroke-width="6"/><circle cx="51" cy="100" r="9" fill="none" stroke="#f6c66a" stroke-width="3.2"/>`);
      // шестерёнка на крышке
      s += grGear(K, 100, 48, 13, 8, '#fcd34d', '#78350f', 'art-spin');
      // котелок, крышка и обод
      const body = 'M54 96 C54 82 76 76 100 76 C124 76 146 82 146 96 C146 126 128 152 100 152 C72 152 54 126 54 96Z';
      s += K.vol(body, br);
      s += grClip(K, body, `<rect x="40" y="128" width="120" height="13" fill="#7c3a10"/>` + grKey(K, 58, 130, 86, 8, '#fde68a', 1.4));
      s += K.vol('M62 84 C64 66 82 58 100 58 C118 58 136 66 138 84Z', { ...br, texK: 0.1 });
      s += K.vol(K.ell(100, 84, 46, 8), { c1: '#fde7a8', c2: '#b7791f', rim: '#fff6b0', tex: false, lw: 2, line: '#4a2408' });
      s += K.gloss(74, 98, 9, 5, -35, 0.4);
      // личико
      s += K.eyes(100, 106, 18, 11.5, { iris: '#ea580c', look: [0.2, 0.2] });
      s += K.blush(72, 120, 6) + K.blush(128, 120, 6) + K.mouth('smile', 100, 120, 12);
      s += K.spark(28, 70, 3.4, '#fde047') + K.spark(172, 112, 3, '#fff7c2', 'art-float') + K.spark(26, 130, 2.6, '#facc15', 'art-float') + K.spark(100, 22, 3, '#fff7c2');
      return s;
    },

    // Автоматон: подросший Автоматончик — медный слуга-механизм Гефеста. Корпус-бочонок с заклёпками и меандром, в круглом
    // окошке на груди крутится шестерёнка, голова-шлем с медным гребнем, светящимися глазами и решёткой рта, на макушке
    // трубочка с паром. Одной рукой держит метлу — подметает перроны, другой приветливо машет
    gr_avtomaton(K) {
      const br = { c1: '#f0b66e', c2: '#7c4318', rim: '#fff6b0', rimK: 0.65, texK: 0.2, line: '#3b1d08' };
      const dark = '#3b1d08';
      let s = K.aura('#facc15', 96, 104, 0.45);
      // пар из трубочки
      s += `<g class="art-float"><circle cx="132" cy="20" r="6.4" fill="#fff" opacity=".45"/><circle cx="142" cy="12" r="4.6" fill="#fff" opacity=".4"/><circle cx="124" cy="10" r="3.6" fill="#fff" opacity=".35"/></g>`;
      // метла
      s += K.line('M46 44 L60 148', '#4a2408', 5.4) + K.line('M46 44 L60 148', '#c98a3c', 3.2);
      s += K.part('M53 144 C48 154 44 166 42 178 H78 C74 166 70 154 66 144Z', '#e0bb63', { line: '#6b4a14', lw: 1.6 }) + K.line('M50 160 L48 176 M56 154 L56 177 M63 154 L67 177', '#a67c2e', 1.2) + K.line('M52 149 H67', '#b91c1c', 3.4);
      // ноги на шарнирах
      s += K.mirror(K.vol('M76 136 H94 V164 H76Z', { ...br, tex: false, lw: 2.2 }) + `<circle cx="85" cy="150" r="5.4" fill="${K.lin(['#fde68a', '#a16207'])}" stroke="${dark}" stroke-width="1.4"/>` +
        K.vol('M70 172 C70 164 76 162 86 162 C94 162 98 166 98 172 V178 H70Z', { ...br, tex: false, lw: 2.2 }));
      // корпус-бочонок с заклёпками
      const body = 'M68 84 C62 98 62 124 70 138 H130 C138 124 138 98 132 84 Q100 74 68 84Z';
      s += K.vol(body, br);
      s += '<g fill="#fde68a" stroke="#5a3412" stroke-width=".8">' + [[70, 94], [130, 94], [67, 108], [133, 108], [69, 122], [131, 122]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9"/>`).join('') + '</g>';
      s += grClip(K, body, `<rect x="60" y="124" width="80" height="12" fill="#5a2c0c"/>` + grKey(K, 66, 126, 68, 7, '#fcd34d', 1.3));
      // окошко с шестерёнкой
      s += `<circle cx="100" cy="104" r="15" fill="#2a1406" stroke="${dark}" stroke-width="2"/>` + grGear(K, 100, 104, 12, 9, '#fcd34d', '#78350f', 'art-spin');
      s += `<circle cx="100" cy="104" r="15" fill="none" stroke="#fde68a" stroke-width="2.4"/><path d="M89 97 A13 13 0 0 1 103 91" stroke="#fff" stroke-width="2" fill="none" opacity=".55"/>`;
      // рука с метлой
      s += K.line('M70 90 C60 92 54 98 54 106', dark, 11) + K.line('M70 90 C60 92 54 98 54 106', '#e0a35a', 7.4) + `<circle cx="68" cy="90" r="5" fill="${K.lin(['#fde68a', '#a16207'])}" stroke="${dark}" stroke-width="1.4"/>`;
      s += K.vol(K.ell(55, 106, 6.6, 7), { ...br, tex: false, lw: 2 });
      // рука машет
      s += K.line('M130 90 C144 88 150 80 152 68', dark, 11) + K.line('M130 90 C144 88 150 80 152 68', '#e0a35a', 7.4) + `<circle cx="132" cy="90" r="5" fill="${K.lin(['#fde68a', '#a16207'])}" stroke="${dark}" stroke-width="1.4"/>`;
      s += K.vol('M146 66 C144 56 148 50 154 50 C160 50 162 56 160 66 C158 70 148 70 146 66Z', { ...br, tex: false, lw: 2 }) + K.line('M150 52 V44 M155 51 V43', dark, 3.4) + K.line('M150 52 V44 M155 51 V43', '#e0a35a', 1.8);
      s += K.line('M164 48 q5 4 4 10 M170 44 q7 6 5 15', '#fde68a', 1.6, { op: 0.8, cls: 'art-blink' });
      // голова-шлем: гребень, трубочка, болты-ушки
      s += K.part('M76 46 C72 26 88 14 100 14 C112 14 128 26 124 46 C118 36 110 30 100 30 C90 30 82 36 76 46Z', '#c2410c', { line: dark, lw: 1.8 }) + K.line('M84 24 L88 34 M92 18 L94 30 M100 16 V30 M108 18 L106 30 M116 24 L112 34', '#7c2d12', 1.3);
      s += K.part('M118 40 L124 22 H132 L128 42Z', '#7c4318', { line: dark, lw: 1.6 });
      s += K.mirror(`<circle cx="76" cy="58" r="5" fill="${K.lin(['#fde68a', '#a16207'])}" stroke="${dark}" stroke-width="1.4"/>`);
      s += K.vol(K.ell(100, 58, 24, 22), br);
      s += K.part('M80 56 C80 48 90 44 100 44 C110 44 120 48 120 56 C120 66 112 72 100 72 C88 72 80 66 80 56Z', '#3b1d08', { line: '#1a0c02', lw: 1.6 });
      s += K.glow(91, 55, 4.4, 5, '#fde047') + K.glow(109, 55, 4.4, 5, '#fde047');
      s += K.line('M92 65 H108 M94 68.4 H106', '#fde68a', 1.4);
      s += K.gloss(84, 46, 6, 3.2, -30, 0.4);
      s += K.spark(24, 80, 3.4, '#fde047') + K.spark(178, 100, 3, '#fff7c2', 'art-float') + K.spark(168, 150, 2.6, '#facc15') + K.spark(26, 30, 2.6, '#fff7c2', 'art-float');
      return s;
    },

    // Талос: медный великан, страж Крита. Шлем с высоким алым гребнем и глазами-огнями, мускулистый бронзовый панцирь,
    // юбка из кожаных полос, поножи. Одной рукой занёс над головой валун, другой держит круглый щит с критской
    // двойной секирой-лабрисом. По телу бежит единственная жила с золотым ихором, а на щиколотке — медный гвоздь,
    // что закрывает её
    gr_talos(K) {
      const br = { c1: '#e89a4c', c2: '#5c2c0c', rim: '#fff6b0', rimK: 0.7, texK: 0.22, line: '#2a1406' };
      const dark = '#2a1406';
      let s = K.aura('#facc15', 100, 100, 0.5);
      // валун над головой
      s += K.vol('M140 34 C138 20 150 10 164 12 C178 12 190 22 188 38 C186 52 174 58 160 56 C146 56 140 46 140 34Z', { c1: '#c4b8a8', c2: '#57534e', rim: '#fff6b0', rimK: 0.5, tex: false, lw: 2.4, line: '#292524' });
      s += K.line('M150 26 l8 4 l6 -6 M168 42 l8 -2 M152 44 l6 2', '#78716c', 1.6);
      // ноги с поножами
      const leg = 'M72 132 H96 V166 C96 172 92 174 86 174 H74 C70 174 70 170 70 166Z';
      s += K.mirror(K.vol(leg, { ...br, tex: false }) + K.vol('M70 146 C70 140 74 138 84 138 C92 138 98 140 98 146 V164 C90 168 78 168 70 164Z', { c1: '#fde68a', c2: '#a16207', rim: '#fff6b0', tex: false, lw: 2, line: dark }) +
        K.part('M66 172 H100 V180 H66Z', '#5a2c0c', { line: dark, lw: 1.4 }));
      // юбка из полос
      s += '<g>' + [72, 82, 92, 102, 112, 122].map(x => K.part(`M${x} 118 H${x + 9} L${x + 9} 138 Q${x + 4.5} 141 ${x} 138Z`, '#b45309', { line: dark, lw: 1.4 })).join('') + '</g>';
      // панцирь
      const torso = 'M60 70 C54 86 58 108 72 122 H128 C142 108 146 86 140 70 Q100 56 60 70Z';
      s += K.vol(torso, br);
      s += K.line('M84 84 Q92 90 100 84 Q108 90 116 84 M88 100 H98 M102 100 H112 M90 110 H98 M102 110 H110 M100 90 V118', '#7c3a10', 1.8, { op: 0.65 });
      s += K.line('M58 118 Q100 128 142 118', dark, 6) + K.line('M58 118 Q100 128 142 118', '#fcd34d', 3.4);
      // жила с ихором и гвоздь на щиколотке
      const vein = 'M110 66 C116 82 120 100 118 120 C120 136 122 152 120 166';
      s += K.line(vein, '#fde047', 6, { op: 0.35, cls: 'art-blink' }) + K.line(vein, '#fff7c2', 2);
      s += `<circle cx="120" cy="168" r="4.4" fill="${K.lin(['#fef3c7', '#b45309'])}" stroke="${dark}" stroke-width="1.6"/>` + K.line('M117 168 H123 M120 165 V171', dark, 1.2);
      // рука с валуном
      const aR = 'M134 76 C146 72 152 62 154 50';
      s += K.line(aR, dark, 19) + K.line(aR, '#e0a35a', 15) + K.vol(K.ell(154, 50, 10, 9.5), { ...br, tex: false });
      // наплечники
      s += K.mirror(K.vol(K.ell(66, 74, 13, 10, -20).d, { ...br, tex: false, t: 'rotate(-20 66 74)' }));
      // рука со щитом
      s += K.line('M66 80 C56 92 52 104 52 114', dark, 19) + K.line('M66 80 C56 92 52 104 52 114', '#e0a35a', 15);
      s += K.vol(K.ell(46, 124, 28, 28), { c1: '#fde68a', c2: '#a16207', rim: '#fff6b0', rimK: 0.7, tex: false, lw: 2.6, line: dark });
      s += `<circle cx="46" cy="124" r="20" fill="${K.rad([[0, '#b91c1c'], [1, '#6b1010']])}" stroke="${dark}" stroke-width="1.8"/>`;
      s += K.line('M46 106 V144', dark, 4.4) + K.line('M46 106 V144', '#fde68a', 2.2);
      s += K.part('M44 114 C36 108 28 112 28 121 C28 130 36 134 44 128Z M48 114 C56 108 64 112 64 121 C64 130 56 134 48 128Z', '#fcd34d', { line: dark, lw: 1.4 });
      // голова в шлеме
      s += K.part('M74 34 C72 14 88 4 100 4 C112 4 128 14 126 34 C118 24 110 20 100 20 C90 20 82 24 74 34Z', '#dc2626', { line: dark, lw: 1.8 }) + K.line('M82 16 L86 26 M90 10 L92 22 M100 7 V20 M110 10 L108 22 M118 16 L114 26', '#7f1d1d', 1.3);
      s += K.vol('M80 50 C78 34 88 24 100 24 C112 24 122 34 120 50 L118 66 C114 70 108 70 104 66 L100 58 L96 66 C92 70 86 70 82 66Z', br);
      s += K.part('M86 46 H114 V50 H104 V62 H96 V50 H86Z', '#1a0c02', { line: dark, lw: 1.2 });
      s += K.glow(92, 48, 3.6, 2.6, '#fff7c2') + K.glow(108, 48, 3.6, 2.6, '#fff7c2');
      s += K.gloss(88, 32, 5.4, 3, -30, 0.45);
      s += K.spark(22, 70, 3.4, '#fde047') + K.spark(180, 90, 3, '#fff7c2', 'art-float') + K.spark(186, 140, 2.6, '#facc15') + K.spark(20, 170, 2.6, '#fff7c2', 'art-float');
      return s;
    },

    // Златорунчик: крылатый ягнёнок с шерстью из чистого золота — круглое руно в завитках, кудрявый чубчик, ушки в стороны,
    // крошечные завитые рожки, белые крылышки машут. Стоит на облачке, вокруг гуляет ветерок и блестят искорки
    gr_zlatorunchik(K) {
      const gold = { c1: '#fff1b8', c2: '#d4a017', rim: '#eef0ff', rimK: 0.7, texK: 0.15, line: '#8a5a0c' };
      const face = { c1: '#fff8e7', c2: '#e8c49a', rim: '#eef0ff', tex: false, lw: 2.2, line: '#8a5a24' };
      let s = K.aura('#a5b4fc', 92, 112, 0.45);
      s += K.line('M14 96 Q28 88 42 96 T70 96 M20 124 Q32 118 44 124', '#eef0ff', 2, { op: 0.5, cls: 'art-float' });
      // облачко
      s += K.vol(grCloudD(46, 154, 174, 16), { c1: '#ffffff', c2: '#a5b4fc', rim: '#eef0ff', tex: false, lw: 2, line: '#6366f1' });
      // крылышки
      const wing = K.g(K.vol('M70 118 C60 104 44 96 26 98 C20 102 20 110 30 112 C26 118 30 126 40 124 C40 132 48 134 54 130 C60 132 66 132 70 128Z', { c1: '#ffffff', c2: '#c7d2fe', rim: '#fde68a', rimK: 0.5, tex: false, lw: 2, line: '#4338ca' }) +
        K.line('M66 120 L32 104 M66 124 L38 118 M66 127 L50 128', '#a5b4fc', 1.3), '', 'art-wing');
      s += K.mirror(wing);
      // ножки с копытцами
      s += K.mirror(K.vol('M80 148 H92 V166 H80Z', { ...face, lw: 2 }) + K.part('M79 164 H93 V172 H79Z', '#5a3412', { line: '#2a1406', lw: 1.4 }));
      // руно
      s += K.vol(grFluffD(100, 132, 40, 26, 14, 8), gold);
      s += grCurls(K, [[84, 128], [100, 136, 4.4], [116, 126], [92, 146, 3.6], [110, 148, 3.6], [74, 140, 3.4], [126, 140, 3.4]], '#b7791f');
      // ушки
      s += K.mirror(K.vol(K.ell(68, 86, 13, 6.4, -24).d, { ...face, t: 'rotate(-24 68 86)' }) + `<ellipse cx="68" cy="86" rx="7" ry="3" transform="rotate(-24 68 86)" fill="#f9a8b4" opacity=".7"/>`);
      // голова, чубчик и крошечные завитые рожки
      s += K.vol(K.ell(100, 86, 26, 24), face);
      s += K.vol(grFluffD(100, 64, 16, 9, 9, 10), { ...gold, texK: 0.1 });
      s += K.mirror(K.line('M84 68 C76 66 74 57 80 54 C85 52 89 57 85 60', '#8a5a24', 5.4) + K.line('M84 68 C76 66 74 57 80 54 C85 52 89 57 85 60', '#f6e7c4', 3.2));
      s += K.gloss(84, 74, 5.4, 3, -35, 0.4);
      s += K.eyes(100, 88, 11, 8.6, { iris: '#6366f1', look: [0.2, 0.2], lash: true });
      s += `<path d="M96 99 Q100 97 104 99 Q102 102 100 102 Q98 102 96 99Z" fill="#f9a8b4" stroke="#8a5a24" stroke-width="1.2"/>` + K.mouth('cat', 100, 104, 9);
      s += K.blush(80, 98, 4.6) + K.blush(120, 98, 4.6);
      s += K.spark(30, 60, 3.4, '#fde68a') + K.spark(172, 76, 3, '#fff7c2', 'art-float') + K.spark(174, 132, 2.6, '#fde68a') + K.spark(100, 30, 2.6, '#fff', 'art-float');
      return s;
    },

    // Златорунный овен: подросший Златорунчик — летучий овен с золотым руном. Летит над облаками, поджав ножки, большие
    // крылья подняты, рога закручены, на спине — алая попона с меандром и кистями: садись, прокатит над городом.
    // За ним вьются вихри ветра
    gr_zlatorun(K) {
      const gold = { c1: '#fde68a', c2: '#b7791f', rim: '#eef0ff', rimK: 0.7, texK: 0.15, line: '#78450a' };
      const face = { c1: '#fff4dc', c2: '#dcb48a', rim: '#eef0ff', tex: false, lw: 2.2, line: '#7a4a1a' };
      const wingS = { c1: '#ffffff', c2: '#c7d2fe', rim: '#fde68a', rimK: 0.5, texK: 0.08, lw: 2.2, line: '#3730a3' };
      const wingD = 'M0 -2 C6 -30 30 -58 66 -66 C72 -60 70 -50 60 -46 C66 -38 60 -30 50 -30 C54 -20 46 -14 36 -16 C38 -6 28 -2 18 -4 C14 2 6 4 0 4Z';
      // крыло: точка крепления (0, 0) — справа в своей системе (art-wing машет вокруг правого края)
      const wing = (t, op) => K.g(K.g(K.g(K.vol(wingD, wingS) + K.line('M4 -2 C16 -30 36 -50 60 -58 M6 0 C20 -18 36 -30 54 -38 M8 0 C20 -8 32 -14 42 -22 M10 0 C18 -2 24 -6 30 -10', '#a5b4fc', 1.3, { op: 0.8 }), 'scale(-1 1)'), '', 'art-wing'), t).replace('<g', `<g opacity="${op}"`);
      let s = K.aura('#a5b4fc', 96, 104, 0.45);
      // вихри ветра позади
      s += K.line('M150 150 C164 140 180 146 176 158 C172 166 162 162 166 154 M160 40 C172 30 188 36 184 46', '#eef0ff', 2, { op: 0.6, cls: 'art-float' });
      // облака внизу
      s += K.vol(grCloudD(24, 104, 176, 16), { c1: '#ffffff', c2: '#a5b4fc', rim: '#eef0ff', tex: false, lw: 2, line: '#6366f1' }) + K.vol(grCloudD(118, 184, 174, 13), { c1: '#ffffff', c2: '#a5b4fc', rim: '#eef0ff', tex: false, lw: 2, line: '#6366f1' });
      // дальнее крыло
      s += wing('translate(126 90) rotate(-34) scale(-1 1)', 0.8);
      // поджатые ножки
      const leg = (d) => K.line(d, '#7a4a1a', 10) + K.line(d, '#f3d9b0', 6.6);
      s += leg('M150 126 C162 132 170 132 176 126') + K.part('M174 120 L182 124 L178 131 L172 128Z', '#5a3412', { line: '#2a1406', lw: 1.2 });
      s += leg('M82 128 C74 136 70 140 74 148') + K.part('M70 146 L78 146 L78 153 L70 153Z', '#5a3412', { line: '#2a1406', lw: 1.2 });
      // руно-туловище и попона
      s += K.vol(grFluffD(114, 112, 46, 28, 16, 5), gold);
      s += grCurls(K, [[96, 126], [112, 132, 4.4], [130, 126], [146, 116], [100, 106, 3.6], [140, 102, 3.4]], '#a16207');
      const cloth = 'M96 90 C110 84 128 84 140 90 L144 112 C130 118 108 118 94 112Z';
      s += K.vol(cloth, { c1: '#f87171', c2: '#991b1b', rim: '#fde68a', tex: false, lw: 2, line: '#450a0a' });
      s += grClip(K, cloth, grKey(K, 94, 104, 52, 6, '#fde68a', 1.2));
      s += '<g fill="#fcd34d" stroke="#78350f" stroke-width=".8">' + [[96, 116], [120, 120], [144, 116]].map(([x, y]) => `<path d="M${x} ${y - 2} l3 7 h-6Z"/>`).join('') + '</g>';
      s += leg('M90 130 C84 140 82 146 88 152') + K.part('M84 150 L92 150 L92 157 L84 157Z', '#5a3412', { line: '#2a1406', lw: 1.2 });
      // ближнее крыло
      s += wing('translate(112 94) rotate(-6) scale(-1 1)', 1);
      // голова: уши, рога, мордочка
      s += K.vol(K.ell(52, 78, 12, 5.6, 30).d, { ...face, t: 'rotate(30 52 78)' });
      s += K.vol('M76 64 C88 64 94 74 92 86 C90 98 82 106 70 108 C58 110 46 104 44 94 C42 84 50 76 58 72 C62 66 68 64 76 64Z', face);
      s += K.vol(grFluffD(78, 66, 14, 8, 8, 0), { ...gold, texK: 0.1 });
      s += grRamHorn(K, 84, 66, 0.72, -1, '#f3e3c0', '#6b4a24');
      s += K.gloss(66, 76, 4.6, 2.6, -30, 0.4);
      s += `<g class="art-eyes">${K.eye(70, 84, 7.4, { iris: '#6366f1', look: [-0.6, 0.1], lash: true })}</g>`;
      s += `<path d="M46 96 Q49 94 52 96 Q51 99 49 99 Q47 99 46 96Z" fill="#f9a8b4" stroke="#7a4a1a" stroke-width="1.1"/>` + K.line('M48 101 Q53 105 58 101', K.INK, 2.2);
      s += K.blush(64, 96, 4);
      s += K.spark(24, 40, 3.4, '#fde68a') + K.spark(186, 100, 3, '#fff7c2', 'art-float') + K.spark(30, 140, 2.6, '#eef0ff', 'art-float') + K.spark(100, 14, 2.6, '#fde68a');
      return s;
    },

    // Хрисомалл: тот самый овен Золотого руна. Стоит на вершине облака, сияющее руно спадает плащом, огромные закрученные
    // рога, глаза светятся, за спиной — величественные золотые крылья, как на гербе. Над ним мерцает созвездие Овна,
    // по руну пробегают искры
    gr_hrisomall(K) {
      const gold = { c1: '#fde68a', c2: '#92400e', rim: '#fff7c2', rimK: 0.75, texK: 0.18, line: '#5a2c06' };
      const face = { c1: '#fff1d0', c2: '#d4a26a', rim: '#fff7c2', tex: false, lw: 2.4, line: '#6b3a10' };
      const wingS = { c1: '#fff7c2', c2: '#d4a017', rim: '#ffffff', rimK: 0.6, texK: 0.1, lw: 2.2, line: '#78350f' };
      const wingD = 'M0 0 C-6 -26 -2 -56 18 -82 C20 -70 24 -64 28 -60 C30 -70 36 -76 44 -80 C42 -68 44 -60 48 -56 C52 -64 58 -68 66 -68 C62 -56 62 -48 64 -42 C68 -48 74 -50 80 -50 C70 -30 52 -14 32 -6 C20 -2 10 0 0 0Z';
      const wing = K.g(K.g(K.vol(wingD, wingS) + K.line('M6 -6 C8 -34 14 -56 22 -72 M12 -6 C20 -30 32 -48 44 -66 M18 -4 C34 -22 48 -36 62 -56 M24 -4 C42 -14 58 -28 74 -44', '#b45309', 1.3, { op: 0.7 }), 'scale(-1 1)'), '', 'art-wing');
      let s = K.aura('#facc15', 100, 100, 0.5) + K.aura('#c7d2fe', 70, 70, 0.35);
      // созвездие Овна
      s += grConst(K, [[124, 22, 3.2], [146, 16], [166, 24, 3], [180, 40, 2.6]], '#fff7c2', 0.6);
      // крылья-герб
      s += K.mirror(K.g(wing, 'translate(76 100) rotate(-14)'));
      // облако-вершина
      s += K.vol(grCloudD(26, 174, 172, 20), { c1: '#ffffff', c2: '#a5b4fc', rim: '#fff7c2', tex: false, lw: 2.2, line: '#4338ca' });
      // ноги
      s += K.mirror(K.vol('M76 140 H92 V164 H76Z', { ...face, lw: 2.2 }) + K.part('M75 162 H93 V172 H75Z', '#fcd34d', { line: '#78350f', lw: 1.4 }));
      // сияющее руно
      s += K.vol(grFluffD(100, 128, 48, 32, 18, 0), gold);
      s += grCurls(K, [[80, 120], [100, 128, 4.6], [120, 120], [90, 142, 4], [112, 144, 4], [68, 134, 3.6], [132, 134, 3.6], [100, 108, 3.6]], '#92400e');
      s += K.spark(76, 112, 3.4, '#fff', 'art-blink') + K.spark(126, 140, 3, '#fff', 'art-blink') + K.spark(104, 150, 2.6, '#fff7c2', 'art-blink');
      // голова: уши, большие рога, чёлка из руна
      s += K.mirror(K.vol(K.ell(66, 76, 13, 6, -20).d, { ...face, t: 'rotate(-20 66 76)' }) + `<ellipse cx="66" cy="76" rx="7" ry="2.6" transform="rotate(-20 66 76)" fill="#f9a8b4" opacity=".6"/>`);
      s += K.vol('M100 50 C118 50 126 64 124 80 C122 96 112 108 100 110 C88 108 78 96 76 80 C74 64 82 50 100 50Z', face);
      s += K.vol(grFluffD(100, 54, 20, 10, 10, 8), gold);
      s += grRamHorn(K, 86, 60, 0.95, 1, '#fde68a', '#5a2c06') + grRamHorn(K, 114, 60, 0.95, -1, '#fde68a', '#5a2c06');
      s += K.gloss(88, 66, 5, 2.8, -30, 0.4);
      // светящиеся глаза, нос
      s += K.glow(90, 80, 4.6, 5.4, '#fff7c2') + K.glow(110, 80, 4.6, 5.4, '#fff7c2');
      s += `<path d="M94 98 Q100 95 106 98 Q104 102 100 102 Q96 102 94 98Z" fill="#e8a4a0" stroke="#6b3a10" stroke-width="1.3"/>` + K.line('M95 106 Q100 109 105 106', K.INK, 2);
      s += K.spark(22, 50, 3.6, '#fde68a') + K.spark(182, 70, 3, '#fff7c2', 'art-float') + K.spark(20, 120, 2.6, '#fff', 'art-float') + K.spark(186, 128, 2.6, '#fde68a');
      return s;
    },

    // Пирауста: крылатая зверушка-огонёк из медных плавилен Кипра. Пухлое тельце цвета раскалённого угля, четыре лапки,
    // две пары стрекозиных крылышек, усики с огоньками на концах, как у спичек. Порхает над медным тиглем с пламенем —
    // своим домиком: без огня ей никак
    gr_pirausta(K) {
      const ember = { c1: '#ffd27a', c2: '#d9461a', rim: '#ffe29a', rimK: 0.7, texK: 0.25, line: '#5a1406' };
      let s = K.aura('#ff8a1a', 94, 108, 0.5);
      // медный тигель с пламенем
      s += K.flame(82, 152, 40, 26, '#ffd23f', '#e8431a', { style: 'animation-delay:-.4s' }) + K.flame(120, 152, 44, 28, '#ffd23f', '#e8431a', { style: 'animation-delay:-.9s' }) + K.flame(100, 150, 50, 30, '#fff0a0', '#ff7a1a', { style: 'animation-delay:-.2s' });
      const pot = 'M54 148 H146 C146 166 128 178 100 178 C72 178 54 166 54 148Z';
      s += K.vol(pot, { c1: '#f0a46a', c2: '#7c2d12', rim: '#ffe29a', tex: false, lw: 2.2, line: '#3b1206' });
      s += grClip(K, pot, grKey(K, 62, 158, 76, 7, '#fde68a', 1.3));
      s += K.vol(K.ell(100, 148, 46, 6), { c1: '#fbbf7a', c2: '#9a3412', rim: '#ffe29a', tex: false, lw: 2, line: '#3b1206' });
      // стрекозиные крылышки (крепление — справа)
      const wing = (t, d, k) => K.g(`<g class="art-wing" style="animation-delay:${d}s"><path d="M0 0 C-10 -14 -30 -22 -46 -18 C-50 -10 -40 -2 -26 2 C-16 4 -6 4 0 0Z" fill="${K.rad([[0, '#fff7d6', 0.85], [1, '#ffb347', 0.55]])}" stroke="#9a3412" stroke-width="1.6" stroke-linejoin="round"/>` +
        K.line('M-4 -1 C-16 -8 -28 -12 -40 -13 M-10 -4 L-20 -16 M-22 -8 L-32 -18 M-14 0 L-26 -2', '#c2410c', 1, { op: 0.7 }) + '</g>', `${t} scale(${k})`);
      s += K.mirror(wing('translate(76 84) rotate(-14)', 0, 1) + wing('translate(78 100) rotate(22)', -0.45, 0.8));
      // хвостик-пламя
      s += K.g(K.flame(126, 118, 26, 16, '#fff0a0', '#ff6a1a', { style: 'animation-delay:-.7s' }), 'rotate(120 126 118)');
      // лапки
      s += K.line('M84 118 l-6 14 M94 124 l-2 14 M106 124 l2 14 M116 118 l6 14', '#5a1406', 4.4) + K.line('M84 118 l-6 14 M94 124 l-2 14 M106 124 l2 14 M116 118 l6 14', '#ff9a4a', 2.4);
      // тельце
      s += K.vol(K.ell(100, 96, 30, 29), ember);
      s += `<ellipse cx="100" cy="108" rx="18" ry="12" fill="${K.rad([[0, '#fff3b0', 0.85], [1, '#ffd27a', 0]])}"/>`;
      // усики с огоньками
      s += K.line('M90 70 C86 58 80 50 72 46 M110 70 C114 58 120 50 128 46', '#5a1406', 2.6);
      s += K.flame(72, 48, 16, 10, '#fff0a0', '#ff6a1a', { style: 'animation-delay:-.3s' }) + K.flame(128, 48, 16, 10, '#fff0a0', '#ff6a1a', { style: 'animation-delay:-1s' });
      s += `<circle cx="72" cy="46" r="3" fill="#7c2d12"/><circle cx="128" cy="46" r="3" fill="#7c2d12"/>`;
      s += K.gloss(84, 80, 7, 4, -35, 0.4);
      s += K.eyes(100, 94, 12.5, 9.6, { iris: '#ea580c', look: [0.1, 0.25] });
      s += K.blush(78, 106, 5) + K.blush(122, 106, 5) + K.mouth('smile', 100, 108, 10);
      s += K.spark(30, 60, 3.4, '#ffd23f', 'art-float') + K.spark(172, 60, 3, '#ffe08a') + K.spark(26, 120, 2.6, '#fff3b0') + K.spark(176, 118, 2.6, '#ffb347', 'art-float');
      return s;
    },

    // Этна: нимфа огнедышащей горы. Причёска — настоящий вулкан: тёмный конус с кратером, по нему сбегают огненные
    // ручейки, над макушкой клубится пар. Платье из застывшей лавы с горячими трещинками, на щеках — веснушки-угольки.
    // Сонно напевает колыбельную (под её горой спит Тифон и стучит кузня Гефеста) и греет в ладонях горячий камешек
    gr_etna(K) {
      const skin = '#ffd7b8', sk = { c1: skin, c2: '#e09a72', rim: '#ffe29a', tex: false, lw: 2.2, line: '#7c3a1a' };
      const rock = { c1: '#8a7a70', c2: '#2a1d18', rim: '#ffb347', rimK: 0.75, texK: 0.2, lw: 2.4, line: '#140c08' };
      let s = K.aura('#ff7a1a', 94, 104, 0.5);
      // пар над кратером
      s += `<g class="art-float"><circle cx="90" cy="18" r="9" fill="#e5e7eb" opacity=".6"/><circle cx="106" cy="12" r="7" fill="#e5e7eb" opacity=".5"/><circle cx="118" cy="20" r="5.4" fill="#e5e7eb" opacity=".45"/></g>`;
      // волосы-вулкан
      s += K.vol('M52 114 C54 94 64 70 78 46 L84 30 H116 L122 46 C136 70 146 94 148 114 C140 106 132 104 124 104 H76 C68 104 60 106 52 114Z', rock);
      s += `<ellipse class="art-blink" cx="100" cy="32" rx="20" ry="7" fill="${K.rad([[0, '#fff3b0', 0.9], [1, '#ff6a1a', 0]])}"/>` + K.part('M84 32 Q100 26 116 32 Q100 38 84 32Z', '#ff8a1a', { line: '#7c1d0a', lw: 1.6 });
      const lava = 'M90 34 C88 48 78 58 72 76 M110 34 C114 50 124 60 130 80 M100 36 C100 44 98 48 100 54';
      s += K.line(lava, '#ff9a2a', 6, { op: 0.4 }) + K.line(lava, '#ffd23f', 2.6);
      // платье из остывающей лавы с огненным пояском
      const dress = 'M74 108 C62 130 58 156 56 176 H144 C142 156 138 130 126 108 Q100 98 74 108Z';
      s += K.vol(dress, { c1: '#d0703e', c2: '#4a160a', rim: '#ffd23f', rimK: 0.7, texK: 0.25, lw: 2.4, line: '#2a0a04' });
      const cr = 'M68 146 l8 4 l4 -6 l8 6 M132 142 l-8 6 l-5 -5 l-8 6 M88 164 l6 -6 l6 4 l8 -4 M64 168 l8 -3 M138 166 l-8 -4';
      s += K.line(cr, '#ffb020', 6, { op: 0.4 }) + K.line(cr, '#fff3b0', 2.2);
      s += K.line('M70 138 Q100 146 130 138', '#7c1d0a', 6) + K.line('M70 138 Q100 146 130 138', '#ffb020', 3.4);
      // ручки и горячий камешек
      s += K.line('M78 112 C76 120 80 128 88 130 M122 112 C124 120 120 128 112 130', '#2a0a04', 10) + K.line('M78 112 C76 120 80 128 88 130 M122 112 C124 120 120 128 112 130', '#b85a32', 6.6);
      s += `<circle class="art-aura" cx="100" cy="128" r="16" fill="${K.rad([[0, '#fff3b0', 0.9], [1, '#ff7a1a', 0]])}"/>` + K.vol(K.ell(100, 128, 9, 7), { c1: '#ffb347', c2: '#c2330f', rim: '#fff3b0', tex: false, lw: 1.8, line: '#5a1406' });
      s += K.vol(K.ell(88, 130, 6.6, 6), sk) + K.vol(K.ell(112, 130, 6.6, 6), sk);
      // лицо и чёлка
      s += K.vol(K.ell(100, 80, 27, 26), sk);
      s += K.part('M73 78 C71 60 86 52 100 52 C114 52 129 60 127 78 C120 66 110 62 100 64 C90 62 80 66 73 78Z', '#4a3a32', { line: '#140c08', lw: 1.6 });
      s += K.line('M82 60 C90 56 96 56 100 58', '#ff9a2a', 1.6, { op: 0.8 });
      s += K.closed(100, 84, 10, 5.4, true) + `<g fill="#c2410c" opacity=".75"><circle cx="80" cy="92" r="1.2"/><circle cx="84" cy="95" r="1.2"/><circle cx="116" cy="95" r="1.2"/><circle cx="120" cy="92" r="1.2"/></g>`;
      s += K.blush(82, 94, 5.4) + K.blush(118, 94, 5.4) + K.mouth('o', 100, 92, 9);
      // колыбельная
      s += grNote(152, 70, 0.9, '#ffd23f', -0.3) + grNote(164, 104, 0.7, '#fde68a', -1.2) + grNote(40, 74, 0.8, '#ffd23f', -2);
      s += K.spark(30, 132, 3, '#ffd23f') + K.spark(172, 142, 2.6, '#ffe08a', 'art-float') + K.spark(160, 36, 2.4, '#fff3b0');
      return s;
    },

    // Нереида: одна из пятидесяти дочерей морского старца Нерея. Сидит на спине прыгающего дельфина: длинные волосы
    // цвета волны с нитями жемчуга, венок из ракушек, в поднятой руке — сияющая жемчужина. Внизу плещутся волны
    gr_nereida(K) {
      const skin = '#fde2cc', sk = { c1: skin, c2: '#e0a888', rim: '#c8f3ff', tex: false, lw: 2.2, line: '#8a4a3a' };
      const dol = { c1: '#b4e0f8', c2: '#1e5a8a', rim: '#c8f3ff', rimK: 0.7, texK: 0.2, lw: 2.4, line: '#0c2e4f' };
      let s = K.aura('#38bdf8', 94, 104, 0.45);
      s += grWaves(K, 0, 200, 166, '#38bdf8', '#0c4a6e', 25);
      // волосы позади
      s += K.part('M90 44 C78 50 76 66 82 80 C86 92 84 104 92 112 C96 98 100 90 104 86 C112 96 128 104 144 106 C134 96 130 84 128 72 C126 54 114 42 100 40 C96 40 92 42 90 44Z', '#2dd4bf', { line: '#0f5f5a', lw: 1.8 });
      s += K.line('M118 60 C124 78 132 92 142 102', '#ccfbf1', 1.6, { op: 0.8 }) + '<g fill="#fff" stroke="#94a3b8" stroke-width=".6">' + [[122, 70], [126, 80], [131, 89], [137, 97]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('') + '</g>';
      // дельфин
      s += K.part('M120 106 L134 84 L140 110Z', '#3b82c4', { line: '#0c2e4f', lw: 1.8 });
      s += K.vol('M28 124 C32 116 42 112 52 112 C74 100 112 94 136 110 C148 118 156 128 162 136 L178 128 C176 136 174 142 176 152 L162 146 C150 148 136 142 124 136 C104 134 80 134 60 132 C48 132 38 130 28 124Z', dol);
      s += `<path d="M40 126 C60 132 100 134 140 140" fill="none" stroke="#f0f9ff" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
      s += K.part('M78 130 L66 150 L92 136Z', '#3b82c4', { line: '#0c2e4f', lw: 1.6 });
      s += `<g class="art-eyes">${K.eye(50, 117, 4.4, { iris: '#0c4a6e', look: [-0.5, 0] })}</g>` + K.line('M30 125 Q38 128 46 125', K.INK, 1.6) + K.blush(56, 124, 3);
      // платье, торс, руки
      s += K.vol('M86 98 C82 110 82 124 86 134 C96 138 108 138 118 132 C118 120 116 108 112 98Z', { c1: '#f0fdfa', c2: '#5eead4', rim: '#c8f3ff', tex: false, lw: 2, line: '#0f5f5a' });
      s += K.vol('M88 100 C84 88 86 76 92 70 C96 66 106 66 110 70 C116 78 116 90 112 100Z', sk);
      s += K.line('M88 100 Q100 106 112 100', '#f9a8d4', 3) + '<g fill="#fff" stroke="#94a3b8" stroke-width=".6">' + [92, 97, 102, 107].map(x => `<circle cx="${x}" cy="${x === 92 || x === 107 ? 101 : 103}" r="1.7"/>`).join('') + '</g>';
      s += K.line('M90 80 C82 88 80 98 82 106', '#8a4a3a', 8.4) + K.line('M90 80 C82 88 80 98 82 106', skin, 5.6) + K.vol(K.ell(82, 108, 5, 5), sk);
      s += K.line('M110 78 C120 70 126 58 128 46', '#8a4a3a', 8.4) + K.line('M110 78 C120 70 126 58 128 46', skin, 5.6) + K.vol(K.ell(128, 44, 5, 5.2), sk);
      // жемчужина
      s += `<circle class="art-aura" cx="132" cy="34" r="16" fill="${K.rad([[0, '#ffffff', 0.9], [1, '#a5f3fc', 0]])}"/><circle cx="132" cy="34" r="7" fill="${K.rad([[0, '#ffffff'], [0.7, '#f5f3ff'], [1, '#c4b5fd']], 0.35, 0.3)}" stroke="#7c86a8" stroke-width="1.2"/>`;
      // голова, чёлка, венок из ракушек
      s += K.vol(K.ell(100, 54, 17, 17), sk);
      s += K.part('M83 54 C82 42 90 36 100 36 C110 36 118 42 117 54 C112 46 106 44 100 46 C94 44 88 46 83 54Z', '#2dd4bf', { line: '#0f5f5a', lw: 1.6 });
      for (const [x, y, r, c] of [[86, 40, -30, '#fbcfe8'], [100, 35, 0, '#fde68a'], [114, 40, 30, '#fbcfe8']]) s += K.g(K.part('M0 4 L-6 -3 C-4 -8 4 -8 6 -3Z', c, { line: '#9d174d', lw: 1.1 }) + K.line('M0 3 L-3 -5 M0 3 L0 -6 M0 3 L3 -5', '#db2777', 0.8), `translate(${x} ${y}) rotate(${r})`);
      s += K.eyes(100, 56, 6.6, 5, { iris: '#0891b2', lash: true, look: [0.4, -0.3] });
      s += K.blush(90, 62, 3) + K.blush(110, 62, 3) + K.mouth('smile', 100, 63, 7);
      // пузырьки и брызги
      s += `<g class="art-float"><circle cx="24" cy="96" r="3.4" fill="none" stroke="#e0f2fe" stroke-width="1.4"/><circle cx="34" cy="80" r="2.2" fill="none" stroke="#bae6fd" stroke-width="1.1"/><circle cx="176" cy="110" r="2.8" fill="none" stroke="#e0f2fe" stroke-width="1.2"/></g>`;
      s += K.spark(22, 40, 3.2, '#e0f2fe') + K.spark(176, 64, 3, '#fff', 'art-float') + K.spark(60, 20, 2.4, '#bae6fd');
      return s;
    },

    // Алкиона: царевна, ставшая зимородком. Круглая птичка — синяя спинка с бирюзовыми крапинками, рыжая грудка, белое
    // горлышко, длинный тёмный клювик, на макушке — крошечная золотая корона. Сидит на плавучем гнезде с яйцами посреди
    // тихого моря: пока она высиживает птенцов, ветры стихают — вокруг гладь и тёплое солнце
    gr_alkiona(K) {
      const blue = { c1: '#7dd3fc', c2: '#1d4ed8', rim: '#c8f3ff', rimK: 0.7, texK: 0.18, lw: 2.4, line: '#0c1f5c' };
      let s = K.aura('#38bdf8', 92, 108, 0.45) + `<circle class="art-aura" cx="152" cy="42" r="30" fill="${K.rad([[0, '#fff7c2', 0.8], [1, '#fde68a', 0]])}"/>`;
      s += `<circle cx="152" cy="42" r="12" fill="${K.lin(['#fff7c2', '#fbbf24'])}" stroke="#b45309" stroke-width="1.6"/>`;
      // гладкое море
      s += `<ellipse cx="100" cy="168" rx="92" ry="13" fill="${K.lin(['#7dd3fc', '#0369a1'])}" stroke="#0c4a6e" stroke-width="2"/>` + K.line('M24 166 Q38 162 52 166 M146 168 Q160 164 174 168 M76 175 Q90 172 104 175', '#e0f2fe', 1.6, { op: 0.8 });
      // плавучее гнездо с яйцами
      s += `<ellipse cx="74" cy="148" rx="7" ry="9" fill="#f0f9ff" stroke="#64748b" stroke-width="1.4"/><ellipse cx="128" cy="149" rx="7" ry="9" fill="#e0f2fe" stroke="#64748b" stroke-width="1.4"/>`;
      s += K.vol('M50 148 C52 166 74 172 100 172 C126 172 148 166 150 148 C130 158 70 158 50 148Z', { c1: '#d9a066', c2: '#6b3a10', rim: '#c8f3ff', tex: false, lw: 2, line: '#3b1d0c' });
      s += K.line('M58 154 L74 162 M70 152 L86 164 M92 156 L106 166 M114 156 L126 164 M130 154 L142 160 M62 160 L80 157 M118 162 L140 156', '#7c4a1d', 1.4, { op: 0.8 });
      // хвостик
      s += K.part('M122 126 C138 124 154 128 164 136 C156 139 152 143 150 150 C142 146 132 142 120 140Z', '#1e40af', { line: '#0c1f5c', lw: 1.8 }) + K.line('M128 132 C140 132 150 135 158 138', '#38bdf8', 2, { op: 0.8 });
      // тельце, рыжая грудка, крыло
      const body = K.ell(102, 122, 36, 30);
      s += K.vol(body, blue);
      s += grClip(K, body, `<path d="M60 124 C70 132 90 136 106 134 C120 132 132 128 142 122 V160 H60Z" fill="${K.lin(['#fdba74', '#ea580c'])}"/>`) + K.line('M66 126 C80 134 100 136 112 134', '#7c2d12', 1.4, { op: 0.5 });
      s += K.vol('M110 100 C130 98 142 110 140 126 C138 136 128 140 118 136 C110 130 106 114 110 100Z', { ...blue, c1: '#38bdf8' });
      s += '<g fill="#a5f3fc">' + [[122, 108], [130, 114], [124, 120], [132, 124], [120, 128]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8"/>`).join('') + '</g>';
      // голова: рыжие щёчки, белое горлышко, клюв, корона
      s += K.vol(K.ell(94, 82, 26, 24), blue);
      s += `<path d="M80 96 C86 104 100 106 110 100 C106 108 94 110 84 106Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/>`;
      s += `<ellipse cx="114" cy="90" rx="7" ry="5" fill="#fb923c" opacity=".85"/><ellipse cx="74" cy="88" rx="5" ry="4" fill="#fb923c" opacity=".85"/>`;
      s += K.part('M72 88 L38 96 L72 96Z', '#1f2937', { line: '#0b0f1a', lw: 1.8 }) + K.line('M70 92 L44 95', '#64748b', 1.2);
      s += K.part('M84 60 L86 50 L92 56 L96 46 L100 56 L106 50 L108 60Z', '#fcd34d', { line: '#78350f', lw: 1.4 }) + `<circle cx="96" cy="56" r="1.8" fill="#ef4444"/>`;
      s += K.gloss(84, 70, 5.4, 3, -35, 0.45);
      s += K.eyes(96, 82, 9.6, 7.4, { iris: '#0c4a6e', lash: true, look: [-0.4, 0.1] });
      s += K.spark(28, 60, 3, '#e0f2fe') + K.spark(184, 96, 2.6, '#fff', 'art-float') + K.spark(24, 132, 2.6, '#bae6fd', 'art-float') + K.spark(110, 22, 2.4, '#fde68a');
      return s;
    },

    // Лета: дух подземной реки забвения. Полупрозрачная дева из сиреневой воды — волосы стекают струями, а вместо ног
    // течёт река. В ладонях — чаша с водой забвения, глаза сонные, рот удивлённо «ой» — опять что-то забыла. Вокруг
    // плывут забытые вещи: зонтик, перчатка, ключи и телефон
    gr_leta(K) {
      const wt = { c1: '#dfe3ff', c2: '#4338ca', rim: '#a5f3fc', rimK: 0.75, texK: 0.55, line: '#1e1b4b' };
      const fl = (inner, t, d) => `<g class="art-float" style="animation-delay:${d}s"><g transform="${t}">${inner}</g></g>`;
      let s = K.aura('#a78bfa', 94, 104, 0.45);
      // забытые вещи: зонтик и ключи (позади)
      s += fl(K.part('M-18 0 Q0 -20 18 0 Q12 -4 6 0 Q0 -4 -6 0 Q-12 -4 -18 0Z', '#f472b6', { line: '#831843', lw: 1.4 }) + K.line('M0 -1 V18 Q0 23 -5 22', '#334155', 2), 'translate(36 50) rotate(-20)', -0.2);
      s += fl(`<circle cx="0" cy="0" r="6" fill="none" stroke="#fbbf24" stroke-width="2.4"/>` + K.line('M4 4 L14 14 M10 10 L13 7 M12 12 L15 9 M-4 5 L-8 18 M-7 13 L-10 13', '#fbbf24', 2.4), 'translate(30 128)', -1.1);
      // поток-река
      s += K.vol('M72 98 C64 118 64 138 72 150 C82 164 104 166 122 160 C140 156 156 162 170 176 C146 182 108 182 82 176 C60 170 48 150 52 128 C54 114 62 104 72 98Z', wt);
      s += K.line('M70 156 C90 168 120 164 140 166 M64 140 C70 150 80 156 92 158', '#eef2ff', 1.8, { op: 0.6 });
      // струящиеся волосы
      s += K.part('M80 46 C70 60 66 80 70 100 C72 112 66 122 62 128 C76 124 82 112 84 100 L116 100 C118 112 124 124 138 128 C134 122 128 112 130 100 C134 80 130 60 120 46 C112 38 88 38 80 46Z', '#a5b4fc', { line: '#312e81', lw: 1.8 });
      s += K.line('M74 70 C72 86 74 100 70 116 M126 70 C128 86 126 100 130 116', '#e0e7ff', 1.6, { op: 0.7 });
      // тело
      s += K.vol('M78 96 C72 108 72 124 78 136 C88 142 112 142 122 136 C128 124 128 108 122 96 Q100 88 78 96Z', wt);
      // чаша забвения
      s += K.part('M82 122 H118 C116 132 108 136 100 136 C92 136 84 132 82 122Z', '#c4b5fd', { line: '#312e81', lw: 1.8 }) + K.line('M100 136 V142 M92 143 H108', '#312e81', 2.4);
      s += `<ellipse cx="100" cy="122" rx="17" ry="3.4" fill="${K.lin(['#a5f3fc', '#67e8f9'])}" stroke="#312e81" stroke-width="1.2"/>` + `<g class="art-float"><circle cx="96" cy="114" r="2" fill="#e0f2fe" opacity=".8"/><circle cx="104" cy="108" r="1.4" fill="#e0f2fe" opacity=".7"/></g>`;
      s += K.vol(K.ell(84, 124, 5.6, 5.4), { ...wt, tex: false, lw: 1.8 }) + K.vol(K.ell(116, 124, 5.6, 5.4), { ...wt, tex: false, lw: 1.8 });
      // лицо
      s += K.vol(K.ell(100, 70, 22, 22), { ...wt, texK: 0.3 });
      s += K.part('M78 68 C78 54 88 48 100 48 C112 48 122 54 122 68 C116 60 108 58 100 60 C92 58 84 60 78 68Z', '#c7d2fe', { line: '#312e81', lw: 1.6 });
      s += K.eyes(100, 72, 9, 6.6, { iris: '#22d3ee', lid: 'half', skin: '#d6dcff', look: [0, 0.3] });
      s += K.blush(86, 82, 3.6) + K.blush(114, 82, 3.6) + K.mouth('o', 100, 80, 8);
      // забытые вещи: перчатка и телефон (спереди)
      s += fl(K.part('M-8 10 V-6 C-8 -12 -2 -12 -2 -6 V-10 C-2 -15 4 -15 4 -10 V-6 C4 -10 10 -10 10 -5 V4 C10 12 4 14 -2 14 C-6 14 -8 12 -8 10Z M-8 0 C-14 -2 -16 4 -10 8', '#38bdf8', { line: '#0c4a6e', lw: 1.4 }), 'translate(168 104) rotate(16)', -0.6);
      s += fl(K.part('M-9 -15 H9 Q12 -15 12 -12 V12 Q12 15 9 15 H-9 Q-12 15 -12 12 V-12 Q-12 -15 -9 -15Z', '#334155', { line: '#0f172a', lw: 1.4 }) + `<rect x="-9" y="-11" width="18" height="21" rx="2" fill="${K.lin(['#a5f3fc', '#6366f1'])}"/><circle cx="0" cy="12.6" r="1.2" fill="#94a3b8"/>`, 'translate(164 48) rotate(14)', -1.5);
      s += K.spark(176, 150, 2.8, '#e9d5ff') + K.spark(24, 96, 2.6, '#e9d5ff', 'art-float') + K.spark(100, 24, 2.6, '#a5f3fc');
      return s;
    },

    // Аскалаф: садовник Аида, ставший совой-болтуном. Круглая серо-бурая сова с ушками-перьями, огромными янтарными
    // глазами и клювиком, раскрытым на «Ух!». Сидит на коньке черепичной крыши, под крылом — надкушенный гранат (тот
    // самый!), позади — ночная луна
    gr_askalaf(K) {
      const fe = { c1: '#c9bcae', c2: '#4a3f38', rim: '#e9d5ff', rimK: 0.6, texK: 0.35, line: '#1f1712' };
      let s = K.aura('#c084fc', 92, 106, 0.42);
      s += grMoon(K, 152, 42, 22, 9, -6, '#fef3c7', '#fbbf24', 0.95);
      // черепичная крыша
      s += K.vol('M8 168 L100 152 L192 168 V182 H8Z', { c1: '#f08a5a', c2: '#7c2d12', rim: '#e9d5ff', tex: false, lw: 2.2, line: '#3b1206' });
      s += K.line('M26 172 Q34 166 42 170 M54 168 Q62 162 70 166 M84 164 Q92 158 100 162 M114 164 Q122 158 130 162 M144 166 Q152 162 160 168 M170 170 Q178 166 186 172', '#5a1a0a', 1.4, { op: 0.7 });
      // ушки-перья
      s += K.mirror(K.part('M74 64 L64 36 L88 56Z', '#6b5a4e', { line: '#1f1712', lw: 1.8 }));
      // тело
      s += K.vol('M100 54 C132 54 146 84 144 114 C142 144 126 160 100 160 C74 160 58 144 56 114 C54 84 68 54 100 54Z', fe);
      s += K.line('M84 128 l6 5 l6 -5 M104 128 l6 5 l6 -5 M92 142 l6 5 l6 -5 M76 140 l4 4 l4 -4 M116 140 l4 4 l4 -4', '#5a4a40', 1.6, { op: 0.75 });
      // крылья
      s += K.vol('M62 100 C52 116 54 138 66 150 C72 140 74 124 72 108Z', { ...fe, c1: '#a8998a', texK: 0.2 }) + K.vol('M138 100 C148 116 146 138 134 150 C128 140 126 124 128 108Z', { ...fe, c1: '#a8998a', texK: 0.2 });
      // гранат под крылом
      s += grPome(K, 144, 140, 11, true);
      // лапки
      s += K.line('M88 158 l-4 8 M92 158 v9 M96 158 l4 8 M104 158 l-4 8 M108 158 v9 M112 158 l4 8', '#c2410c', 2.6);
      // лицевой диск и глаза
      s += `<ellipse cx="84" cy="90" rx="19" ry="18" fill="#efe6da" opacity=".9"/><ellipse cx="116" cy="90" rx="19" ry="18" fill="#efe6da" opacity=".9"/>`;
      s += K.line('M68 72 Q84 66 98 80 M132 72 Q116 66 102 80', '#3a2e26', 3);
      s += K.eyes(100, 90, 16, 11.4, { iris: '#f59e0b', look: [0.4, 0.1] });
      // клюв, раскрытый на «Ух!»
      s += K.part('M94 104 L100 100 L106 104 L100 112Z', '#f59e0b', { line: '#78350f', lw: 1.4 }) + `<path d="M96 106 Q100 110 104 106 L100 112Z" fill="#7f1d1d"/>`;
      s += K.line('M118 112 l8 -3 M120 118 l9 0 M118 124 l8 3', '#fde68a', 2, { cls: 'art-blink' });
      s += K.blush(76, 104, 4) + K.blush(124, 104, 4);
      s += K.spark(24, 60, 3, '#e9d5ff') + K.spark(30, 132, 2.6, '#fde68a', 'art-float') + K.spark(180, 96, 2.6, '#e9d5ff', 'art-float') + K.spark(110, 24, 2.4, '#fde68a');
      return s;
    },

    // Халкотавр: медный огнедышащий бык, выкованный Гефестом для царя Колхиды. Туловище из клёпаных бронзовых листов,
    // в боку — топка с решёткой, где гудит огонь, глаза горят, из ноздрей вырывается пламя. Медные рога, золотые копыта
    // звенят по брусчатке, хвост с огоньком, со спины валит пар
    gr_halkotavr(K) {
      const br = { c1: '#f0a85a', c2: '#6b3410', rim: '#ffe29a', rimK: 0.7, texK: 0.2, line: '#2a1206' };
      const dark = '#2a1206';
      let s = K.aura('#ff6a1a', 96, 110, 0.5);
      // брусчатка
      s += '<g>' + [[14, 30], [48, 34], [86, 32], [122, 34], [160, 28]].map(([x, w]) => `<rect x="${x}" y="170" width="${w}" height="11" rx="4" fill="${K.lin(['#a8a29e', '#57534e'])}" stroke="#292524" stroke-width="1.4"/>`).join('') + '</g>';
      // пар со спины
      s += `<g class="art-float"><circle cx="136" cy="70" r="7" fill="#f1f5f9" opacity=".5"/><circle cx="146" cy="58" r="5.4" fill="#f1f5f9" opacity=".45"/><circle cx="154" cy="46" r="4" fill="#f1f5f9" opacity=".4"/></g>`;
      // хвост с огоньком
      s += K.line('M164 116 C178 118 184 130 182 144', dark, 5) + K.line('M164 116 C178 118 184 130 182 144', '#c98a4a', 2.8) + K.g(K.flame(182, 146, 18, 12, '#fff0a0', '#ff6a1a', { style: 'animation-delay:-.6s' }), 'rotate(180 182 146)');
      // ноги: дальние, затем ближние
      const leg = (x, c1) => K.vol(`M${x - 9} 136 H${x + 9} L${x + 8} 166 H${x - 8}Z`, { ...br, c1, tex: false, lw: 2.2 }) + K.part(`M${x - 10} 164 H${x + 10} L${x + 10} 176 H${x - 10}Z`, '#fcd34d', { line: '#78350f', lw: 1.6 }) + K.line(`M${x} 165 V176`, '#78350f', 1.2);
      s += leg(96, '#c47a3a') + leg(156, '#c47a3a');
      // туловище из листов с заклёпками
      const body = 'M62 98 C84 84 132 82 156 94 C172 102 176 128 164 142 C150 154 108 156 82 150 C64 146 54 128 58 112 C59 106 60 102 62 98Z';
      s += K.vol(body, br);
      s += grClip(K, body, K.line('M96 84 V156 M132 84 V156 M58 122 H176', '#7c3a10', 1.6) + '<g fill="#fde68a" stroke="#5a2c0c" stroke-width=".7">' + [[92, 96], [92, 112], [92, 140], [136, 96], [136, 112], [136, 140], [70, 118], [160, 118]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8"/>`).join('') + '</g>');
      // топка в боку
      s += `<circle class="art-aura" cx="114" cy="122" r="17" fill="${K.rad([[0, '#fff3b0', 0.9], [0.5, '#ff8a1a', 0.6], [1, '#ff5a14', 0]])}"/>`;
      s += `<circle cx="114" cy="122" r="11" fill="${K.rad([[0, '#fff3b0'], [0.5, '#ffb020'], [1, '#d9290f']])}" stroke="${dark}" stroke-width="2"/>` + K.line('M106 116 V128 M111 113 V131 M117 113 V131 M122 116 V128', dark, 1.8);
      s += leg(76, br.c1) + leg(140, br.c1);
      // голова: рога, уши, морда с пламенем
      s += K.part('M58 66 C50 54 36 50 26 54 C34 56 40 62 44 70Z', '#fcd34d', { line: '#78350f', lw: 1.8 }) + K.part('M80 62 C84 50 96 44 108 46 C100 50 94 56 90 66Z', '#fcd34d', { line: '#78350f', lw: 1.8 });
      s += K.vol(K.ell(46, 78, 9, 5, -30).d, { ...br, tex: false, lw: 2, t: 'rotate(-30 46 78)' }) + K.vol(K.ell(92, 74, 9, 5, 30).d, { ...br, tex: false, lw: 2, t: 'rotate(30 92 74)' });
      s += K.vol('M44 86 C44 72 56 64 68 64 C82 64 92 74 92 88 C92 102 84 112 72 116 C62 120 50 118 44 110 C40 104 42 94 44 86Z', br);
      s += K.vol('M40 102 C40 94 50 90 60 92 C70 94 76 100 74 108 C72 116 62 120 52 118 C44 117 40 110 40 102Z', { c1: '#f6c088', c2: '#9a4a14', rim: '#ffe29a', tex: false, lw: 2, line: dark });
      s += `<ellipse cx="48" cy="104" rx="3" ry="2.4" fill="${dark}"/><ellipse cx="62" cy="106" rx="3" ry="2.4" fill="${dark}"/><circle cx="56" cy="114" r="4.4" fill="none" stroke="#fcd34d" stroke-width="2"/>`;
      s += K.glow(58, 82, 4.2, 4, '#ffd23f') + K.glow(78, 82, 4.2, 4, '#ffd23f') + K.line('M50 74 L64 80 M86 74 L72 80', dark, 2.6);
      s += K.gloss(60, 70, 5.4, 3, -30, 0.4);
      // огонь из ноздрей
      s += grFl(K, 42, 106, 30, 18, 200, '#fff0a0', '#ff5a14', -0.2) + grFl(K, 44, 110, 24, 14, 160, '#ffd23f', '#e8431a', -0.7);
      s += K.spark(22, 60, 3.4, '#ffd23f', 'art-float') + K.spark(178, 64, 3, '#ffe08a') + K.spark(24, 146, 2.6, '#fff3b0', 'art-float') + K.spark(110, 30, 2.6, '#ffb347');
      return s;
    },

    // Тифон: огнедышащий великан, отец Цербера и Химеры. Зевс придавил его горой Этной — и вот он высунулся из кратера:
    // насупленный, руки скрещены, огненная шевелюра, вместо ног — два змеиных хвоста свесились через край, а за плечами
    // веером торчат шесть драконьих головок, каждая со своим огоньком. Над вулканом клубится пар
    gr_tifon(K) {
      const sk = { c1: '#f6a066', c2: '#7c1d0a', rim: '#ffe29a', rimK: 0.7, texK: 0.2, line: '#3b0a04' };
      const sn = { c1: '#86efac', c2: '#14532d', rim: '#ffe29a', rimK: 0.5, tex: false, lw: 2, line: '#052e16' };
      let s = K.aura('#ff6a1a', 100, 100, 0.5);
      // пар
      s += `<g class="art-float"><circle cx="34" cy="96" r="8" fill="#e5e7eb" opacity=".45"/><circle cx="168" cy="92" r="7" fill="#e5e7eb" opacity=".4"/><circle cx="176" cy="78" r="5" fill="#e5e7eb" opacity=".35"/></g>`;
      // драконьи головки веером за плечами
      const dh = (a, L, d) => {
        const t = a * Math.PI / 180, bx = 100 + 22 * Math.cos(t), by = 100 + 16 * Math.sin(t), hx = 100 + L * Math.cos(t), hy = 96 + L * 0.9 * Math.sin(t);
        const neck = `M${f(bx)} ${f(by)} Q${f((bx + hx) / 2 + 8 * Math.sin(t))} ${f((by + hy) / 2)} ${f(hx)} ${f(hy)}`;
        let h = K.line(neck, '#052e16', 11) + K.line(neck, '#4ade80', 7.4);
        h += K.g(K.vol(K.ell(0, 0, 10, 8), sn) + `<circle cx="-3.4" cy="-1.6" r="2.2" fill="#fff"/><circle cx="3.4" cy="-1.6" r="2.2" fill="#fff"/><circle cx="-3" cy="-1.2" r="1.2" fill="${K.INK}"/><circle cx="3.8" cy="-1.2" r="1.2" fill="${K.INK}"/>` +
          K.part('M-7 -6 L-9 -13 L-3 -8Z M7 -6 L9 -13 L3 -8Z', '#fde68a', { line: '#78350f', lw: 1 }) + K.line('M-3 4 Q0 6 3 4', '#052e16', 1.4), `translate(${f(hx)} ${f(hy)}) rotate(${f(a + 90)})`);
        return h + K.g(K.flame(0, -10, 14, 9, '#fff0a0', '#ff6a1a', { style: `animation-delay:${d}s` }), `translate(${f(hx)} ${f(hy)}) rotate(${f(a + 90)})`);
      };
      for (const [a, L, d] of [[-166, 74, -0.2], [-140, 78, -0.9], [-114, 76, -0.5], [-66, 76, -1.2], [-40, 78, -0.4], [-14, 74, -0.8]]) s += dh(a, L, d);
      // вулкан Этна
      const vol = 'M8 180 L60 126 H140 L192 180Z';
      s += K.vol(vol, { c1: '#8a7a70', c2: '#2a1d18', rim: '#ffb347', rimK: 0.7, texK: 0.2, lw: 2.4, line: '#140c08' });
      const lava = 'M70 128 C66 146 52 158 44 176 M132 128 C138 148 150 160 158 176 M100 130 C100 146 96 160 98 176';
      s += K.line(lava, '#ff9a2a', 7, { op: 0.4 }) + K.line(lava, '#ffd23f', 2.6);
      // змеиные хвосты через край
      for (const d of ['M78 130 C64 134 50 140 44 152 C40 160 46 166 54 162 C60 158 56 150 50 152', 'M122 130 C136 134 150 140 156 152 C160 160 154 166 146 162 C140 158 144 150 150 152']) {
        s += K.line(d, '#052e16', 14) + K.line(d, '#4ade80', 10) + `<path d="${d}" fill="none" stroke="#166534" stroke-width="10" stroke-dasharray="2 5" opacity=".45"/>`;
      }
      // торс из кратера
      s += K.vol('M66 130 C62 112 66 96 74 88 Q100 78 126 88 C134 96 138 112 134 130Z', sk);
      s += `<ellipse cx="100" cy="128" rx="40" ry="8" fill="${K.rad([[0, '#fff3b0', 0.9], [0.5, '#ff8a1a', 0.7], [1, '#ff5a14', 0]])}"/>` + K.part('M58 128 Q100 120 142 128 Q100 136 58 128Z', '#ff8a1a', { line: '#7c1d0a', lw: 1.6 });
      // скрещённые руки
      s += K.vol('M70 104 C82 100 110 102 124 112 C128 116 124 122 118 120 C104 114 86 112 72 114 C66 114 64 106 70 104Z', { ...sk, tex: false });
      s += K.vol('M130 102 C118 98 90 100 76 110 C72 114 76 120 82 118 C96 112 114 110 128 112 C134 112 136 104 130 102Z', { ...sk, tex: false });
      // голова: огненная шевелюра, рожки, уши
      for (const [x, h, a, d] of [[78, 26, -30, -0.3], [88, 32, -12, -0.8], [100, 36, 0, -0.1], [112, 32, 12, -0.6], [122, 26, 30, -1]]) s += K.g(K.flame(x, 48, h, h * 0.66, '#ffd23f', '#e8431a', { style: `animation-delay:${d}s` }), `rotate(${a} ${x} 48)`);
      s += K.mirror(K.part('M78 64 L64 56 L76 74Z', '#f6a066', { line: '#3b0a04', lw: 1.8 }));
      s += K.vol(K.ell(100, 66, 24, 22), sk);
      s += K.mirror(K.part('M86 48 C82 40 84 34 88 30 C90 36 92 40 94 46Z', '#fde68a', { line: '#78350f', lw: 1.4 }));
      s += K.eyes(100, 64, 9.4, 6.6, { iris: '#facc15', lid: 'angry', skin: '#f6a066', look: [0, 0.3] });
      s += K.mouth('teeth', 100, 78, 14) + `<path d="M86 76 q-4 -2 -6 0 M114 76 q4 -2 6 0" stroke="${K.INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      s += K.spark(24, 30, 3.4, '#ffd23f', 'art-float') + K.spark(176, 30, 3, '#ffe08a') + K.spark(20, 128, 2.6, '#fff3b0') + K.spark(182, 124, 2.6, '#ffb347', 'art-float');
      return s;
    },

    // Гидра: Лернейская гидра в болотной заводи с камышами. Круглое чешуйчатое тело наполовину в воде, из него тянутся
    // семь шей с головками — у каждой свой характер: одна спит, другая ворчит, третья хохочет, четвёртая брызгается.
    // Средняя, бессмертная, — с золотым гребнем: она и решает, кому первой пить
    gr_gidra(K) {
      const sc = { c1: '#7af0c0', c2: '#065f46', rim: '#c8f3ff', rimK: 0.7, texK: 0.22, line: '#022c22' };
      const hd = { c1: '#86efac', c2: '#0f6b4a', rim: '#c8f3ff', rimK: 0.6, tex: false, lw: 2, line: '#022c22' };
      let s = K.aura('#38bdf8', 100, 104, 0.45);
      // камыши
      const reed = (x, h, d) => `<g class="art-sway" style="animation-delay:${d}s">` + K.line(`M${x} 176 Q${x + 2} ${176 - h / 2} ${x} ${176 - h}`, '#14532d', 3) + K.line(`M${x} 176 Q${x + 2} ${176 - h / 2} ${x} ${176 - h}`, '#65a30d', 1.4) + `<ellipse cx="${x}" cy="${176 - h + 7}" rx="3.2" ry="8" fill="${K.lin(['#a16207', '#57300a'])}" stroke="#3b1d0c" stroke-width="1.1"/></g>`;
      s += reed(18, 84, -0.3) + reed(30, 64, -1.1) + reed(182, 80, -0.7) + reed(170, 60, -1.5);
      // шеи и головы: [угол, длина, лицо]
      const heads = [[-168, 66, 'sleep'], [-142, 74, 'grump'], [-116, 76, 'laugh'], [-64, 76, 'spit'], [-38, 74, 'grump2'], [-12, 66, 'happy']];
      const neckOf = (a, L) => { const t = a * Math.PI / 180, bx = 100 + 26 * Math.cos(t), by = 128 + 12 * Math.sin(t), hx = 100 + L * Math.cos(t), hy = 120 + L * 0.82 * Math.sin(t); return [`M${f(bx)} ${f(by)} Q${f((bx + hx) / 2 - 10 * Math.sin(t))} ${f((by + hy) / 2 - 6)} ${f(hx)} ${f(hy)}`, hx, hy]; };
      const head = (x, y, face, k = 1, crest) => {
        let h = '';
        if (crest) h += K.part(`M${f(x - 10)} ${f(y - 8)} L${f(x - 6)} ${f(y - 20)} L${x} ${f(y - 12)} L${f(x + 6)} ${f(y - 22)} L${f(x + 10)} ${f(y - 8)}Z`, '#fcd34d', { line: '#78350f', lw: 1.4 });
        else h += K.part(`M${f(x - 4)} ${f(y - 9 * k)} L${x} ${f(y - 16 * k)} L${f(x + 4)} ${f(y - 9 * k)}Z`, '#34d399', { line: '#022c22', lw: 1.2 });
        h += K.vol(K.ell(x, y, 12 * k, 10 * k), hd) + `<ellipse cx="${x}" cy="${f(y + 5 * k)}" rx="${f(7 * k)}" ry="${f(3.4 * k)}" fill="#d1fae5" opacity=".7"/>`;
        const ex = 4.6 * k, ey = y - 2 * k, er = 3.4 * k;
        if (face === 'sleep') h += K.closed(x, ey, ex, er) + grZ(x + 12, y - 18, 0.7, '#e0f2fe', -0.6);
        else if (face === 'laugh') h += K.closed(x, ey, ex, er, true) + K.mouth('grin', x, y + 4 * k, 9 * k);
        else h += `<g class="art-eyes">${K.eye(x - ex, ey, er, { iris: '#facc15', lid: face.startsWith('grump') ? 'angry' : undefined, skin: '#86efac' })}${K.eye(x + ex, ey, er, { iris: '#facc15', lid: face.startsWith('grump') ? 'sad' : undefined, skin: '#86efac' })}</g>`;
        if (face.startsWith('grump')) h += K.mouth('frown', x, y + 5 * k, 7 * k);
        if (face === 'happy') h += K.mouth('smile', x, y + 4 * k, 7 * k);
        if (face === 'spit') h += K.mouth('o', x, y + 2 * k, 7 * k) + `<g class="art-float"><circle cx="${f(x + 4)}" cy="${f(y - 24)}" r="2.4" fill="#bae6fd"/><circle cx="${f(x + 10)}" cy="${f(y - 30)}" r="1.8" fill="#e0f2fe"/></g>`;
        return h;
      };
      for (const [a, L] of heads) { const [d] = neckOf(a, L); s += K.line(d, '#022c22', 12) + K.line(d, '#34d399', 8.4); }
      // тело в воде
      s += K.vol(K.ell(100, 138, 46, 30), sc);
      s += K.line('M70 128 q5 5 10 0 q5 5 10 0 q5 5 10 0 q5 5 10 0 q5 5 10 0 M76 142 q5 5 10 0 q5 5 10 0 q5 5 10 0 q5 5 10 0', '#d1fae5', 1.4, { op: 0.6 });
      for (const [a, L, face] of heads) { const [, hx, hy] = neckOf(a, L); s += head(hx, hy, face); }
      // средняя бессмертная голова
      s += K.line('M100 116 C98 96 102 76 100 58', '#022c22', 13) + K.line('M100 116 C98 96 102 76 100 58', '#34d399', 9.4);
      s += head(100, 50, 'boss', 1.25, true);
      s += K.mouth('smile', 100, 58, 9);
      // заводь
      s += `<ellipse cx="100" cy="166" rx="88" ry="14" fill="${K.lin(['#38bdf8', '#0c4a6e'])}" stroke="#062e3f" stroke-width="2" opacity=".92"/>` + K.line('M34 162 Q46 158 58 162 M82 168 Q96 164 110 168 M140 162 Q152 158 164 162', '#e0f2fe', 1.6, { op: 0.8 });
      s += K.spark(24, 30, 3.2, '#e0f2fe') + K.spark(178, 26, 3, '#fff', 'art-float') + K.spark(100, 12, 2.6, '#bae6fd');
      return s;
    },

    // Сцилла: морская дева из пещеры у пролива. По пояс — девушка с длинными тёмно-бирюзовыми волосами в водорослях
    // и коралловой короной, ниже — венок из шести щенячьих голов, а дальше — рыбий хвост. Строгим жестом «стоп!»
    // останавливает лодки, а щенки дружно облаивают каждого, кто спешит
    gr_scilla(K) {
      const skin = '#cfe9dc', sk = { c1: skin, c2: '#7ab89a', rim: '#c8f3ff', tex: false, lw: 2.2, line: '#1f4a3a' };
      const fish = { c1: '#5eead4', c2: '#134e4a', rim: '#c8f3ff', rimK: 0.7, texK: 0.22, lw: 2.4, line: '#042f2e' };
      let s = K.aura('#38bdf8', 96, 104, 0.45);
      // скала с тёмной пещерой сбоку
      s += K.vol('M4 176 C4 134 14 96 38 78 C52 68 66 74 72 90 C78 106 76 140 80 176Z', { c1: '#7c8aa0', c2: '#1e293b', rim: '#c8f3ff', rimK: 0.45, tex: false, lw: 2.2, line: '#0f172a' });
      s += `<path d="M18 176 C18 146 26 124 40 118 C52 114 60 126 60 146 V176Z" fill="${K.lin(['#0b1222', '#1e293b'])}"/>` + K.line('M30 92 l8 6 M44 84 l2 8 M58 100 l-6 4', '#475569', 1.6);
      // рыбий хвост
      const tail = 'M110 146 C132 156 150 164 164 156 C172 150 170 140 162 138';
      s += K.line(tail, '#042f2e', 18) + K.line(tail, '#2dd4bf', 13.6) + `<path d="${tail}" fill="none" stroke="#0f766e" stroke-width="13.6" stroke-dasharray="2.4 5" opacity=".45"/>`;
      s += `<path d="M162 138 C154 126 158 114 168 108 C170 116 176 120 186 120 C184 130 174 138 162 138Z" fill="${K.lin(['#99f6e4', '#14b8a6', '#134e4a'])}" stroke="#042f2e" stroke-width="2" stroke-linejoin="round"/>`;
      // волны
      s += grWaves(K, 0, 200, 168, '#38bdf8', '#0c4a6e', 25);
      // волосы позади
      s += K.part('M82 40 C70 54 68 76 72 96 C74 106 70 114 64 120 C80 118 86 108 88 98 L112 98 C114 108 120 118 136 120 C130 114 126 106 128 96 C132 76 130 54 118 40 C108 30 92 30 82 40Z', '#0f766e', { line: '#042f2e', lw: 1.8 });
      s += K.line('M74 66 C70 84 74 98 68 112 M126 66 C130 84 126 98 132 112', '#134e4a', 2.6, { op: 0.8 }) + K.leaf(70, 104, 10, 110, '#4d7c0f') + K.leaf(130, 104, 10, 70, '#4d7c0f');
      // торс
      s += K.vol('M84 112 C80 98 82 86 88 78 C94 74 106 74 112 78 C118 86 120 98 116 112Z', sk);
      s += K.part('M86 88 C91 84 96 86 100 90 C104 86 109 84 114 88 C114 96 107 98 100 96 C93 98 86 96 86 88Z', '#f9a8d4', { line: '#9d174d', lw: 1.4 });
      // юбка из шести щенячьих голов: дальний ряд, затем ближний
      const pup = (x, y, r, c, bark, tilt) => {
        const ear = (ex, a) => `<ellipse cx="${f(ex)}" cy="${f(y - r * 0.15)}" rx="${f(r * 0.4)}" ry="${f(r * 0.72)}" transform="rotate(${a} ${f(ex)} ${f(y - r * 0.15)})" fill="${K.shade(c, -0.35)}" stroke="#1c1917" stroke-width="1.6"/>`;
        let p = ear(x - r * 0.8, -22) + ear(x + r * 0.8, 22);
        p += K.vol(K.ell(x, y, r, r * 0.9), { c1: c, c2: K.shade(c, -0.45), rim: '#c8f3ff', tex: false, lw: 1.9, line: '#1c1917' });
        p += `<ellipse cx="${x}" cy="${f(y + r * 0.36)}" rx="${f(r * 0.46)}" ry="${f(r * 0.32)}" fill="#f5f5f4"/><ellipse cx="${x}" cy="${f(y + r * 0.18)}" rx="${f(r * 0.17)}" ry="${f(r * 0.12)}" fill="#1c1917"/>`;
        p += `<circle cx="${f(x - r * 0.36)}" cy="${f(y - r * 0.14)}" r="${f(r * 0.16)}" fill="#1c1917"/><circle cx="${f(x + r * 0.36)}" cy="${f(y - r * 0.14)}" r="${f(r * 0.16)}" fill="#1c1917"/><circle cx="${f(x - r * 0.4)}" cy="${f(y - r * 0.2)}" r="${f(r * 0.06)}" fill="#fff"/><circle cx="${f(x + r * 0.32)}" cy="${f(y - r * 0.2)}" r="${f(r * 0.06)}" fill="#fff"/>`;
        p += bark ? `<ellipse cx="${x}" cy="${f(y + r * 0.66)}" rx="${f(r * 0.22)}" ry="${f(r * 0.18)}" fill="#7f1d1d"/>` : K.line(`M${f(x - r * 0.2)} ${f(y + r * 0.6)} Q${x} ${f(y + r * 0.72)} ${f(x + r * 0.2)} ${f(y + r * 0.6)}`, '#1c1917', 1.2);
        return tilt ? K.g(p, `rotate(${tilt} ${x} ${y})`) : p;
      };
      s += pup(70, 118, 11, '#a8a29e', true, -16) + pup(130, 118, 11, '#d6a76c', false, 16) + pup(87, 116, 11, '#e7d3b0', false, -6) + pup(113, 116, 11, '#8a6a52', true, 6);
      s += pup(80, 136, 12.4, '#c8a27a', true, -8) + pup(120, 136, 12.4, '#e7e5e4', true, 8);
      s += K.line('M50 112 l-8 -5 M48 122 l-10 0 M150 112 l8 -5 M152 122 l10 0', '#e0f2fe', 2, { cls: 'art-blink' });
      // рука «стоп!» и рука на бедре
      s += K.line('M114 82 C126 76 134 66 136 54', '#1f4a3a', 8.4) + K.line('M114 82 C126 76 134 66 136 54', skin, 5.8);
      s += K.vol('M130 52 C128 42 132 36 138 36 C144 36 146 42 144 52 C142 56 132 56 130 52Z', sk) + K.line('M133 38 V32 M137 37 V30 M141 38 V32', '#1f4a3a', 3.6) + K.line('M133 38 V32 M137 37 V30 M141 38 V32', skin, 2);
      s += K.line('M86 82 C78 88 76 96 80 102', '#1f4a3a', 8.4) + K.line('M86 82 C78 88 76 96 80 102', skin, 5.8);
      // голова, коралловая корона
      s += K.vol(K.ell(100, 56, 18, 18), sk);
      s += K.part('M82 56 C80 42 90 36 100 36 C110 36 120 42 118 56 C112 48 106 46 100 48 C94 46 88 48 82 56Z', '#0f766e', { line: '#042f2e', lw: 1.6 });
      s += K.line('M90 38 L88 28 M88 32 L84 30 M100 36 V24 M100 29 L104 26 M110 38 L112 28 M112 32 L116 30', '#fb7185', 3.4) + K.line('M90 38 L88 28 M100 36 V24 M110 38 L112 28', '#fecdd3', 1.2);
      s += K.eyes(100, 58, 7, 5.2, { iris: '#0d9488', lid: 'angry', skin, look: [0.3, 0.1] });
      s += K.blush(89, 65, 3) + K.blush(111, 65, 3) + K.mouth('smile', 100, 66, 7);
      s += K.spark(24, 36, 3, '#e0f2fe') + K.spark(178, 40, 2.8, '#fff', 'art-float') + K.spark(184, 90, 2.4, '#bae6fd');
      return s;
    },

    // Каркин: исполинский рак, которого Гера послала на помощь Гидре. Широкий рыжий панцирь в бугорках, глаза на стебельках,
    // восемь ножек на песке. Одну огромную клешню грозно поднял, а в другой держит пляжный шлёпанец — опять кого-то
    // ущипнул за пятку. Над ним мерцает созвездие Рака, вокруг пузырьки
    gr_karkin(K) {
      const sh = { c1: '#ffa07a', c2: '#9f1d1d', rim: '#c8f3ff', rimK: 0.7, texK: 0.2, lw: 2.4, line: '#450a0a' };
      let s = K.aura('#38bdf8', 96, 106, 0.45);
      s += grConst(K, [[30, 30, 2.6], [46, 22], [56, 36, 3], [44, 48], [70, 26, 2.4]], '#e0f2fe', 0.5);
      // песок с ракушками и морской звездой
      s += K.vol('M6 180 C20 160 60 154 100 154 C140 154 180 160 194 180Z', { c1: '#fde7b0', c2: '#c8954a', rim: '#c8f3ff', tex: false, lw: 2, line: '#7c4a1d' });
      s += grStar(170, 168, 7, '#fb923c', '#9a3412') + `<path d="M26 170 l6 -6 l6 6Z" fill="#fbcfe8" stroke="#9d174d" stroke-width="1"/>`;
      // ножки
      const legs = 'M64 132 L44 140 L36 156 M66 140 L50 152 L46 166 M72 146 L62 158 L60 170 M136 132 L156 140 L164 156 M134 140 L150 152 L154 166 M128 146 L138 158 L140 170';
      s += K.line(legs, '#450a0a', 7) + K.line(legs, '#f87150', 4.2);
      // клешня-рука со шлёпанцем
      s += K.line('M62 120 C50 118 42 112 38 104', '#450a0a', 11) + K.line('M62 120 C50 118 42 112 38 104', '#f87150', 7.4);
      s += K.g(K.part('M-6 -14 C2 -18 8 -10 6 -2 C4 8 -2 16 -8 14 C-14 12 -14 2 -12 -6 C-11 -10 -9 -12 -6 -14Z', '#f472b6', { line: '#831843', lw: 1.6 }) + K.line('M-8 -4 L-2 -10 L2 -2', '#fde68a', 2), 'translate(26 88) rotate(-20)');
      s += K.vol('M30 104 C24 96 26 86 34 84 C40 82 46 88 44 96 L48 92 C50 98 46 106 38 108 C34 108 32 106 30 104Z', sh);
      // большая клешня
      s += K.line('M138 118 C152 110 158 98 160 84', '#450a0a', 13) + K.line('M138 118 C152 110 158 98 160 84', '#f87150', 9);
      s += K.vol('M148 84 C140 70 146 52 160 46 C170 42 182 48 182 58 C176 56 168 58 166 66 C172 66 178 70 178 76 C172 86 158 90 148 84Z', sh);
      s += K.line('M166 66 C164 60 168 56 174 58', '#450a0a', 1.6);
      // панцирь
      s += K.vol('M52 120 C52 102 74 90 100 90 C126 90 148 102 148 120 C148 140 128 152 100 152 C72 152 52 140 52 120Z', sh);
      s += '<g fill="#ffd0b8" opacity=".75">' + [[78, 106, 3], [92, 100, 2.6], [110, 100, 2.6], [124, 106, 3], [70, 120, 2.4], [130, 120, 2.4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('') + '</g>';
      // глаза на стебельках
      s += K.line('M88 96 L82 72 M112 96 L118 72', '#450a0a', 6.4) + K.line('M88 96 L82 72 M112 96 L118 72', '#f87150', 3.6);
      s += `<g class="art-eyes">${K.eye(82, 66, 9, { iris: '#0ea5e9', look: [0.3, 0.3] })}${K.eye(118, 66, 9, { iris: '#0ea5e9', look: [-0.2, 0.3] })}</g>`;
      s += K.blush(78, 130, 5) + K.blush(122, 130, 5) + K.mouth('grin', 100, 128, 14);
      s += `<g class="art-float"><circle cx="24" cy="128" r="3.4" fill="none" stroke="#e0f2fe" stroke-width="1.4"/><circle cx="182" cy="112" r="2.6" fill="none" stroke="#e0f2fe" stroke-width="1.2"/><circle cx="174" cy="128" r="2" fill="none" stroke="#bae6fd" stroke-width="1"/></g>`;
      s += K.spark(150, 22, 3, '#e0f2fe') + K.spark(110, 40, 2.4, '#fff', 'art-float');
      return s;
    },

    // Харон: угрюмый перевозчик через подземную реку Стикс. Стоит в узкой лодке с фонарём на носу, в тёмном плаще
    // с капюшоном; из тени светятся глаза, длинная седая борода. Одной рукой опирается на шест, другой строго
    // показывает монетку-обол — без неё не повезёт. Вокруг стелется туман
    gr_haron(K) {
      const robe = { c1: '#8a94b0', c2: '#1a1830', rim: '#e9d5ff', rimK: 0.6, texK: 0.5, lw: 2.4, line: '#0b0a16' };
      let s = K.aura('#c084fc', 96, 100, 0.45);
      // шест
      s += K.line('M150 20 L128 170', '#2a1406', 6) + K.line('M150 20 L128 170', '#8a5a30', 3.6);
      // плащ с капюшоном
      s += K.vol('M74 70 C64 96 60 124 62 150 H138 C140 124 136 96 126 70 Q100 58 74 70Z', robe);
      s += K.line('M88 80 C84 104 82 128 82 150 M112 80 C116 104 118 128 118 150', '#0b0a16', 1.6, { op: 0.5 });
      // рука с шестом
      s += K.line('M124 84 C132 90 136 96 140 100', '#0b0a16', 11) + K.line('M124 84 C132 90 136 96 140 100', '#5a6180', 7.4) + K.vol(K.ell(140, 100, 6.4, 6.6), { c1: '#d8cfc4', c2: '#8a7f74', rim: '#e9d5ff', tex: false, lw: 2, line: '#3a322a' });
      // капюшон и лицо в тени
      s += K.vol('M68 64 C66 40 82 26 100 26 C118 26 134 40 132 64 C130 78 122 88 100 90 C78 88 70 78 68 64Z', robe);
      s += `<ellipse cx="100" cy="60" rx="21" ry="20" fill="${K.rad([[0, '#2a2440'], [1, '#0b0a16']])}"/>`;
      s += K.glow(92, 56, 4, 3.4, '#a5f3fc') + K.glow(108, 56, 4, 3.4, '#a5f3fc') + K.line('M86 50 L96 53 M114 50 L104 53', '#a5f3fc', 1.8, { op: 0.8 });
      s += K.vol('M86 66 C84 84 90 102 100 114 C110 102 116 84 114 66 C108 72 92 72 86 66Z', { c1: '#f1f5f9', c2: '#94a3b8', rim: '#e9d5ff', tex: false, lw: 2, line: '#475569' });
      s += K.line('M94 76 q-1 12 2 22 M106 76 q1 12 -2 22', '#a8b4c8', 1.4);
      // рука с оболом
      s += K.line('M78 86 C68 90 62 86 60 78', '#0b0a16', 11) + K.line('M78 86 C68 90 62 86 60 78', '#5a6180', 7.4) + K.vol(K.ell(60, 76, 6.4, 6.6), { c1: '#d8cfc4', c2: '#8a7f74', rim: '#e9d5ff', tex: false, lw: 2, line: '#3a322a' });
      s += `<circle class="art-aura" cx="58" cy="62" r="12" fill="${K.rad([[0, '#fff7c2', 0.8], [1, '#fbbf24', 0]])}"/><circle cx="58" cy="62" r="7" fill="${K.lin(['#fde68a', '#d4a017'])}" stroke="#78350f" stroke-width="1.6"/><circle cx="58" cy="62" r="4.4" fill="none" stroke="#b45309" stroke-width=".9"/>`;
      // лодка с фонарём
      s += K.vol('M20 136 C30 150 40 158 60 160 H146 C162 160 174 150 182 140 C170 146 156 148 140 148 H64 C46 148 32 144 20 136Z', { c1: '#7c5a44', c2: '#2a1a10', rim: '#e9d5ff', tex: false, lw: 2.2, line: '#120a04' });
      s += K.line('M40 150 H164', '#a8836a', 1.4, { op: 0.6 }) + K.line('M22 136 C20 124 24 116 30 110', '#2a1a10', 4) + K.line('M30 110 L40 112', '#2a1a10', 2.4);
      s += `<circle class="art-aura" cx="40" cy="124" r="15" fill="${K.rad([[0, '#fff7c2', 0.85], [1, '#fbbf24', 0]])}"/>`;
      s += K.line('M40 112 V116', '#1c1917', 1.6) + K.part('M34 116 H46 L44 132 H36Z', '#fde68a', { line: '#44403c', lw: 1.6 }) + K.part('M33 114 H47 L45 117 H35Z M34 131 H46 L45 134 H35Z', '#44403c', { line: '#1c1917', lw: 1 });
      // река Стикс и туман
      s += grWaves(K, 0, 200, 166, '#7c6cf0', '#1e1b4b', 25);
      for (const [x, y, r, d] of [[36, 170, 24, -0.4], [164, 172, 26, -1.2]]) s += `<ellipse class="art-float" style="animation-delay:${d}s" cx="${x}" cy="${y}" rx="${f(r * 1.5)}" ry="${f(r * 0.4)}" fill="${K.rad([[0, '#c4b5fd', 0.5], [1, '#818cf8', 0]])}"/>`;
      s += K.spark(176, 40, 3, '#e9d5ff') + K.spark(24, 70, 2.6, '#fde68a', 'art-float') + K.spark(180, 110, 2.4, '#e9d5ff', 'art-float');
      return s;
    },

    // Минотавр: человек-бык из Лабиринта. Большая лобастая бычья голова с кудрявым чубом, золотым кольцом в носу и
    // крутыми рогами, растерянно сведённые брови. В одной руке — клубок красной нити Ариадны (нить тянется по земле),
    // в другой — схема метро, в которой он опять запутался. Позади темнеет узор лабиринта
    gr_minotavr(K) {
      const fur = { c1: '#b07a58', c2: '#3b1d10', rim: '#e9d5ff', rimK: 0.6, texK: 0.25, lw: 2.4, line: '#1a0c06' };
      const skin = '#c8906a', sk = { c1: skin, c2: '#7c4a2e', rim: '#e9d5ff', tex: false, lw: 2.4, line: '#2a1408' };
      let s = K.aura('#c084fc', 100, 100, 0.45);
      // лабиринт позади
      let lab = '';
      for (let i = 0; i < 4; i++) { const r = 30 + i * 14; lab += `M${100 - r} 112 A${r} ${r} 0 1 1 ${100 + r} 112 `; }
      s += K.line(lab + 'M100 82 V54 M58 112 H44 M142 112 H156', '#a78bfa', 4, { op: 0.35 });
      // нить по земле
      s += K.line('M44 140 C34 150 30 164 44 172 C60 180 90 170 110 176 C130 182 150 172 168 178', '#dc2626', 2.4);
      // ноги в сандалиях и юбка
      s += K.mirror(K.vol('M74 140 H94 V170 H74Z', { ...sk, lw: 2.2 }) + K.part('M70 168 H98 V178 H70Z', '#7c4a1d', { line: '#2a1408', lw: 1.4 }) + K.line('M74 156 L94 162 M74 162 L94 156', '#7c4a1d', 1.6));
      s += K.vol('M68 122 H132 L138 150 Q100 158 62 150Z', { c1: '#f8fafc', c2: '#a8b4c8', rim: '#e9d5ff', tex: false, lw: 2.2, line: '#334155' });
      s += K.line('M84 126 L82 152 M100 126 V154 M116 126 L118 152', '#94a3b8', 1.4) + K.line('M66 124 Q100 132 134 124', '#7f1d1d', 6) + K.line('M66 124 Q100 132 134 124', '#ef4444', 3.4);
      // торс
      s += K.vol('M64 78 C56 92 58 112 68 126 H132 C142 112 144 92 136 78 Q100 64 64 78Z', sk);
      s += K.line('M86 92 Q93 98 100 92 Q107 98 114 92 M92 108 H108 M94 116 H106', '#7c4a2e', 1.6, { op: 0.6 });
      // руки: клубок и схема метро
      s += K.line('M66 84 C56 98 52 110 50 122', '#2a1408', 15) + K.line('M66 84 C56 98 52 110 50 122', skin, 11);
      s += K.vol(K.ell(46, 132, 13, 13), { c1: '#f87171', c2: '#7f1d1d', rim: '#e9d5ff', tex: false, lw: 2, line: '#450a0a' }) + K.line('M36 126 C42 132 50 136 58 134 M38 136 C44 140 52 140 56 138 M40 122 C46 124 52 128 56 126', '#fecaca', 1.3, { op: 0.8 });
      s += K.vol(K.ell(54, 122, 8, 7.4), sk);
      s += K.line('M134 84 C144 96 148 106 148 116', '#2a1408', 15) + K.line('M134 84 C144 96 148 106 148 116', skin, 11);
      s += K.g(K.part('M-22 -16 H22 V16 H-22Z', '#f8fafc', { line: '#334155', lw: 1.6 }) + K.line('M-22 -5 H22 M-7 -16 V16 M8 -16 V16 M-22 6 H22', '#cbd5e1', 0.8) +
        K.line('M-18 -10 L-4 -10 L4 0 L18 0', '#ef4444', 2.2) + K.line('M-14 12 L-6 4 L6 4 L12 -12', '#2563eb', 2.2) + K.line('M-20 4 H-2 L10 12 H20', '#16a34a', 2.2) + `<circle cx="4" cy="0" r="2.4" fill="#fff" stroke="#1f2937" stroke-width="1.2"/>`, 'translate(156 110) rotate(10)');
      s += K.vol(K.ell(148, 120, 8, 7.4), sk);
      // бычья голова
      s += K.mirror(K.part('M74 52 C62 48 50 40 44 26 C54 32 64 34 76 38Z', '#f5ecd8', { line: '#5a4a34', lw: 2 }) + K.line('M52 34 l4 -4 M60 38 l3 -5', '#a8987e', 1.2));
      s += K.mirror(K.vol(K.ell(66, 62, 12, 6.4, -20).d, { ...fur, tex: false, t: 'rotate(-20 66 62)' }));
      s += K.vol('M100 34 C122 34 134 50 132 68 C130 82 124 90 118 94 C114 102 108 106 100 106 C92 106 86 102 82 94 C76 90 70 82 68 68 C66 50 78 34 100 34Z', fur);
      s += K.vol('M82 86 C82 78 90 74 100 74 C110 74 118 78 118 86 C118 98 110 106 100 106 C90 106 82 98 82 86Z', { c1: '#e8c0a0', c2: '#9a6a4a', rim: '#e9d5ff', tex: false, lw: 2, line: '#2a1408' });
      s += `<ellipse cx="93" cy="88" rx="3" ry="2.2" fill="#2a1408"/><ellipse cx="107" cy="88" rx="3" ry="2.2" fill="#2a1408"/>` + `<path d="M93 92 C93 102 107 102 107 92" fill="none" stroke="#fcd34d" stroke-width="3" stroke-linecap="round"/><path d="M93 92 C93 102 107 102 107 92" fill="none" stroke="#92400e" stroke-width="1" opacity=".6"/>`;
      s += K.part('M90 38 C92 30 100 28 104 32 C108 28 114 32 112 40 C106 38 96 40 90 38Z', '#2a1408', { line: '#120804', lw: 1.4 });
      s += K.eyes(100, 60, 11, 7, { iris: '#7c3aed', lid: 'sad', skin: '#a8724e', look: [0.6, 0.4] });
      s += K.spark(24, 40, 3, '#e9d5ff') + K.spark(178, 40, 2.8, '#fde68a', 'art-float') + K.spark(180, 160, 2.4, '#e9d5ff');
      return s;
    },

    // Стимфалийская птица: птица с медными перьями-стрелами с озера Стимфал. Распахнула острые бронзовые крылья,
    // на голове — гребень из медных пёрышек, сердитый взгляд, клюв-наконечник, хвост веером. Вниз планируют
    // обронённые перья и блестят, будто монетки
    gr_stimfalida(K) {
      const br = { c1: '#f2a456', c2: '#6b2a08', rim: '#eef0ff', rimK: 0.7, texK: 0.2, lw: 2.4, line: '#2a1206' };
      const feather = (x, y, L, a, c = '#e08a3c') => K.g(`<path d="M0 0 C${f(L * 0.18)} ${f(-L * 0.12)} ${f(L * 0.6)} ${f(-L * 0.12)} ${L} 0 C${f(L * 0.6)} ${f(L * 0.12)} ${f(L * 0.18)} ${f(L * 0.12)} 0 0Z" fill="${K.lin([K.shade(c, 0.35), c, K.shade(c, -0.35)], 0, 0, 0, 1)}" stroke="#2a1206" stroke-width="1.4" stroke-linejoin="round"/>` + K.line(`M${f(L * 0.08)} 0 H${f(L * 0.9)}`, '#7c3a10', 1), `translate(${x} ${y}) rotate(${a})`);
      let s = K.aura('#a5b4fc', 98, 100, 0.45);
      // обронённые перья-монетки
      s += `<g class="art-float">${feather(40, 160, 22, 160, '#fbbf24')}${feather(158, 166, 20, 20, '#fbbf24')}</g>` + K.spark(54, 170, 3, '#fde68a') + K.spark(142, 174, 2.6, '#fff7c2');
      // хвост веером
      for (const a of [60, 75, 90, 105, 120]) s += feather(100, 128, 40, a);
      // крылья — веер острых медных перьев
      let w = '';
      [[212, 54], [200, 62], [188, 64], [176, 60], [164, 54], [152, 46]].forEach(([a, L], i) => { w += feather(80, 96 + i * 1.6, L, a, i % 2 ? '#c8662a' : '#e8954a'); });
      w += K.vol('M86 86 C72 78 56 80 44 88 C54 96 66 104 84 106Z', { ...br, texK: 0.15 }) + K.line('M80 90 C70 88 60 89 52 92 M80 98 C70 97 62 98 56 100', '#fff3c0', 1.2, { op: 0.6 });
      s += K.mirror(K.g(w, '', 'art-wing'));
      // лапы
      s += K.line('M90 132 l-4 14 M86 146 l-6 4 M86 146 l0 7 M86 146 l6 4 M110 132 l4 14 M114 146 l-6 4 M114 146 l0 7 M114 146 l6 4', '#2a1206', 4.6) + K.line('M90 132 l-4 14 M86 146 l-6 4 M86 146 l0 7 M86 146 l6 4 M110 132 l4 14 M114 146 l-6 4 M114 146 l0 7 M114 146 l6 4', '#fcd34d', 2.4);
      // тело с чешуйками перьев
      s += K.vol(K.ell(100, 106, 28, 30), br);
      s += K.line('M84 108 q4 5 8 0 q4 5 8 0 q4 5 8 0 q4 5 8 0 M88 120 q4 5 8 0 q4 5 8 0 q4 5 8 0 M94 131 q3 4 6 0 q3 4 6 0', '#fff3c0', 1.4, { op: 0.6 });
      // голова, гребень, клюв
      for (const [a, L] of [[-120, 26], [-100, 30], [-80, 26]]) s += feather(100, 62, L, a, '#fbbf24');
      s += K.vol(K.ell(100, 74, 19, 18), br);
      s += K.eyes(100, 72, 8, 6, { iris: '#ef4444', lid: 'angry', skin: '#e89a52', look: [0, 0.3] });
      s += K.part('M92 82 L100 98 L108 82 Q100 78 92 82Z', '#94a3b8', { line: '#1e293b', lw: 1.6 }) + K.line('M95 84 L100 94', '#f1f5f9', 1.2, { op: 0.8 });
      s += K.spark(24, 40, 3.2, '#eef0ff') + K.spark(176, 40, 3, '#fde68a', 'art-float') + K.spark(100, 14, 2.6, '#eef0ff');
      return s;
    },

    // Афина: богиня мудрости и ремёсел. Золотой коринфский шлем сдвинут на макушку, над ним — высокий бело-синий гребень,
    // на плечах — золотая эгида в чешуйках с медальоном-горгонейоном, длинный белый пеплос с меандром. В руке — копьё
    // с сияющим наконечником, другой рукой опирается на круглый щит с совой, а на плече сидит живая сова
    gr_afina(K) {
      const skin = '#f8d8bc', sk = { c1: skin, c2: '#d8a07a', rim: '#fff6b0', tex: false, lw: 2.2, line: '#7a4a2a' };
      const robe = { c1: '#ffffff', c2: '#94a3b8', rim: '#fff6b0', rimK: 0.55, tex: false, lw: 2.4, line: '#334155' };
      const gold = { c1: '#fde68a', c2: '#a16207', rim: '#fff6b0', tex: false, lw: 2, line: '#5a3a06' };
      let s = K.aura('#facc15', 98, 100, 0.45);
      // копьё
      s += K.line('M150 28 V176', '#5a3412', 5) + K.line('M150 28 V176', '#c98a3c', 3);
      s += `<circle class="art-aura" cx="150" cy="20" r="15" fill="${K.rad([[0, '#fffbe6', 0.9], [1, '#facc15', 0]])}"/>` + K.part('M150 4 L157 22 L150 30 L143 22Z', '#f1f5f9', { line: '#334155', lw: 1.6 });
      // волосы позади
      s += K.part('M82 58 C76 76 76 94 80 106 L120 106 C124 94 124 76 118 58Z', '#6b3a1a', { line: '#2a1406', lw: 1.6 });
      // пеплос
      const dress = 'M78 94 C70 118 64 146 60 174 H140 C136 146 130 118 122 94 Q100 86 78 94Z';
      s += K.vol(dress, robe);
      s += grClip(K, dress, `<rect x="50" y="160" width="100" height="20" fill="#475569"/>` + grKey(K, 58, 163, 84, 8, '#fcd34d', 1.4));
      s += K.line('M92 104 C88 126 86 148 84 172 M108 104 C112 126 114 148 116 172 M100 108 V172', '#64748b', 1.4, { op: 0.5 });
      // рука с копьём
      s += K.line('M120 98 C132 102 140 104 146 104', '#7a4a2a', 9) + K.line('M120 98 C132 102 140 104 146 104', skin, 6.4) + K.vol(K.ell(149, 104, 6, 6.4), sk);
      // щит с совой
      s += K.vol(K.ell(52, 146, 27, 27), { c1: '#f1f5f9', c2: '#475569', rim: '#fff6b0', tex: false, lw: 2.4, line: '#1e293b' });
      s += `<circle cx="52" cy="146" r="21" fill="none" stroke="#fcd34d" stroke-width="2.4"/>`;
      s += K.part('M42 140 L42 130 L48 136 H56 L62 130 L62 140 C64 150 60 158 52 160 C44 158 40 150 42 140Z', '#fcd34d', { line: '#78350f', lw: 1.4 }) + `<circle cx="47" cy="142" r="3.4" fill="#fff" stroke="#78350f" stroke-width="1"/><circle cx="57" cy="142" r="3.4" fill="#fff" stroke="#78350f" stroke-width="1"/><circle cx="47" cy="142" r="1.4" fill="#1e293b"/><circle cx="57" cy="142" r="1.4" fill="#1e293b"/><path d="M50.6 146 L52 149 L53.4 146Z" fill="#b45309"/>`;
      // рука на щите
      s += K.line('M80 98 C70 106 64 114 62 122', '#7a4a2a', 9) + K.line('M80 98 C70 106 64 114 62 122', skin, 6.4) + K.vol(K.ell(61, 124, 6, 6), sk);
      // эгида с чешуйками, змейками по краю и горгонейоном
      const aeg = 'M72 94 C82 86 118 86 128 94 C130 106 120 114 100 116 C80 114 70 106 72 94Z';
      s += K.vol(aeg, gold);
      s += grClip(K, aeg, K.line('M74 100 q4 4 8 0 q4 4 8 0 q4 4 8 0 q4 4 8 0 q4 4 8 0 q4 4 8 0 q4 4 8 0 M80 108 q4 4 8 0 q4 4 8 0 q4 4 8 0 q4 4 8 0 q4 4 8 0', '#a16207', 1.2, { op: 0.7 }));
      s += K.line('M76 110 q-3 4 0 7 M86 114 q-3 4 0 7 M114 114 q3 4 0 7 M124 110 q3 4 0 7', '#15803d', 2);
      s += `<circle cx="100" cy="102" r="6.4" fill="#86efac" stroke="#78350f" stroke-width="1.6"/>` + K.line('M95 98 q-3 -3 0 -5 M100 96 v-4 M105 98 q3 -3 0 -5', '#15803d', 1.2) + `<circle cx="98" cy="102" r="1" fill="#1e293b"/><circle cx="102" cy="102" r="1" fill="#1e293b"/>`;
      // сова на плече
      s += K.part('M66 82 L63 71 L70 77Z M80 82 L83 71 L76 77Z', '#8a7a6a', { line: '#2a1f18', lw: 1.2 });
      s += K.vol(K.ell(73, 84, 10, 10), { c1: '#d6c8b8', c2: '#5a4a3e', rim: '#fff6b0', tex: false, lw: 1.8, line: '#2a1f18' });
      s += `<circle cx="69" cy="82" r="3.6" fill="#fff" stroke="#2a1f18" stroke-width="1"/><circle cx="77" cy="82" r="3.6" fill="#fff" stroke="#2a1f18" stroke-width="1"/><circle cx="69.6" cy="82.4" r="1.8" fill="#f59e0b"/><circle cx="77.6" cy="82.4" r="1.8" fill="#f59e0b"/><circle cx="69.6" cy="82.4" r=".8" fill="#1e293b"/><circle cx="77.6" cy="82.4" r=".8" fill="#1e293b"/><path d="M71.6 86 L73 89 L74.4 86Z" fill="#f59e0b"/>`;
      // гребень, голова, шлем
      s += K.part('M78 34 C76 14 88 4 100 4 C112 4 124 14 122 34 C116 26 108 22 100 22 C92 22 84 26 78 34Z', '#f8fafc', { line: '#1e293b', lw: 1.8 }) + K.line('M84 18 L88 28 M92 10 L94 24 M100 7 V22 M108 10 L106 24 M116 18 L112 28', '#3b82f6', 1.6);
      s += K.vol(K.ell(100, 64, 19, 19), sk);
      s += K.vol('M80 52 C78 36 88 28 100 28 C112 28 122 36 120 52 C114 48 106 46 100 46 C94 46 86 48 80 52Z', gold);
      s += `<path d="M86 40 Q91 37 96 40 L95 45 Q91 43 87 45Z M104 40 Q109 37 114 40 L113 45 Q109 43 105 45Z" fill="#3b2a06"/>` + K.line('M100 34 V48', '#5a3a06', 1.4);
      s += K.part('M80 52 C82 58 86 60 90 58 C88 54 86 52 84 50Z M120 52 C118 58 114 60 110 58 C112 54 114 52 116 50Z', '#6b3a1a', { line: '#2a1406', lw: 1.2 });
      s += K.eyes(100, 66, 7.4, 5.6, { iris: '#64748b', lash: true, look: [0.3, 0.1] });
      s += K.blush(88, 73, 3.4) + K.blush(112, 73, 3.4) + K.mouth('smile', 100, 74, 8);
      s += K.spark(24, 60, 3.2, '#fde047') + K.spark(178, 80, 3, '#fff7c2', 'art-float') + K.spark(176, 140, 2.6, '#facc15') + K.spark(26, 100, 2.4, '#fff7c2', 'art-float');
      return s;
    },

    // Аполлон: сияющий бог света, музыки и поэзии. За головой — солнечный венец из лучей, золотые кудри в лавровом
    // венке, белый хитон с меандром и оранжевый гиматий через плечо, за спиной — колчан с золотыми стрелами.
    // Перебирает струны лиры, зажмурившись от удовольствия, — вокруг разлетаются золотые нотки
    gr_apollon(K) {
      const skin = '#fcdcb8', sk = { c1: skin, c2: '#dca27a', rim: '#fff6b0', tex: false, lw: 2.2, line: '#8a5030' };
      let s = K.aura('#facc15', 100, 100, 0.5);
      // солнечные лучи
      let rays = '';
      for (let i = 0; i < 16; i++) { const a = i * 22.5 * Math.PI / 180, r1 = 28, r2 = i % 2 ? 44 : 54, w = 0.13; rays += `M${f(100 + r1 * Math.cos(a - w))} ${f(56 + r1 * Math.sin(a - w))}L${f(100 + r2 * Math.cos(a))} ${f(56 + r2 * Math.sin(a))}L${f(100 + r1 * Math.cos(a + w))} ${f(56 + r1 * Math.sin(a + w))}Z`; }
      s += `<g class="art-aura"><path d="${rays}" fill="${K.rad([[0.45, '#fff7c2'], [1, '#facc15']])}" stroke="#d4a017" stroke-width="1.2" stroke-linejoin="round"/></g>`;
      // ноги в сандалиях
      s += K.line('M90 140 L88 172 M110 140 L112 172', '#8a5030', 9) + K.line('M90 140 L88 172 M110 140 L112 172', skin, 6.4);
      s += K.part('M80 172 C82 168 90 168 94 172 L94 177 H80Z', '#b45309', { line: '#451a03', lw: 1.4 }) + K.part('M106 172 C110 168 118 168 120 172 L120 177 H106Z', '#b45309', { line: '#451a03', lw: 1.4 });
      s += K.line('M85 156 L93 162 M93 156 L85 162 M107 156 L115 162 M115 156 L107 162', '#b45309', 1.4);
      // колчан за спиной
      s += K.g(K.part('M-6 -24 H6 V20 Q0 24 -6 20Z', '#a0592a', { line: '#451a03', lw: 1.6 }) + K.line('M-6 -16 H6 M-6 12 H6', '#fcd34d', 2) + `<path d="M-5 -25 l-1 -8 l4 3Z M0 -25 v-9 l3 4Z M5 -25 l2 -8 l2 5Z" fill="#fde68a" stroke="#78350f" stroke-width="1"/>`, 'translate(128 82) rotate(28)');
      // хитон и гиматий
      const ch = 'M80 88 Q100 82 120 88 L128 144 Q100 152 72 144Z';
      s += K.vol(ch, { c1: '#ffffff', c2: '#cbd5e1', rim: '#fff6b0', tex: false, lw: 2.2, line: '#475569' });
      s += grClip(K, ch, `<rect x="66" y="134" width="70" height="16" fill="#b45309"/>` + grKey(K, 72, 136, 58, 7, '#fde68a', 1.3));
      s += K.vol('M78 90 C88 86 96 88 102 94 C112 112 122 128 130 144 L118 146 C108 128 96 114 82 106 C78 102 76 96 78 90Z', { c1: '#fdba74', c2: '#c2410c', rim: '#fff6b0', tex: false, lw: 2, line: '#7c2d12' });
      // лира и руки
      s += K.line('M82 94 C72 102 70 112 74 120', '#8a5030', 9) + K.line('M82 94 C72 102 70 112 74 120', skin, 6.4);
      s += grLyre(K, 74, 120, 1.15, -10);
      s += K.vol(K.ell(72, 126, 6, 6), sk);
      s += K.line('M118 96 C112 106 100 112 90 114', '#8a5030', 9) + K.line('M118 96 C112 106 100 112 90 114', skin, 6.4) + K.vol(K.ell(87, 114, 6, 5.6), sk);
      // голова: золотые кудри, лавровый венок
      for (const [x, y] of [[82, 52], [80, 64], [85, 42], [115, 42], [118, 52], [120, 64], [93, 36], [107, 36]]) s += K.vol(K.ell(x, y, 6.6, 6.4), { c1: '#fde68a', c2: '#c27c0e', tex: false, lw: 1.6, line: '#78450a', rimK: 0.4 });
      s += K.vol(K.ell(100, 58, 19, 20), sk);
      s += K.part('M82 54 C82 42 90 38 100 38 C110 38 118 42 118 54 C112 48 106 46 100 48 C94 46 88 48 82 54Z', '#fcd34d', { line: '#78450a', lw: 1.4 });
      s += grLaurel(K, 100, 44, 22, 10, -174, -6, 8, '#4d7c0f', 4.8, '#1a2e05');
      s += K.closed(100, 60, 7.4, 4.6, true) + K.blush(88, 67, 3.4) + K.blush(112, 67, 3.4) + K.mouth('smile', 100, 68, 8);
      s += grNote(152, 112, 1, '#fde047', -0.3) + grNote(166, 140, 0.8, '#fff7c2', -1.2) + grNote(32, 78, 0.9, '#fde047', -2);
      s += K.spark(24, 30, 3.2, '#fde047') + K.spark(176, 24, 3, '#fff7c2', 'art-float') + K.spark(30, 160, 2.6, '#facc15', 'art-float');
      return s;
    },

    // Арес: неистовый бог войны. Вместо гребня на шлеме полыхает настоящее пламя, тёмно-бронзовый панцирь, алый плащ,
    // на шее — полосатый шарф болельщика. В одной руке копьё, в другой — щит с огненным знаком. Кричит так, что
    // из-под шлема валит пар, — опять заспорил на трибуне
    gr_ares(K) {
      const skin = '#eeae86', sk = { c1: skin, c2: '#c07850', rim: '#ffe29a', tex: false, lw: 2.2, line: '#6b2e14' };
      const bronze = { c1: '#d9a35a', c2: '#4a2408', rim: '#ffe29a', rimK: 0.7, texK: 0.2, lw: 2.4, line: '#1a0a02' };
      let s = K.aura('#ff6a1a', 100, 100, 0.5);
      // алый плащ
      s += K.vol('M76 82 C60 102 46 132 38 168 C60 160 80 166 100 160 C120 166 140 160 162 168 C154 132 140 102 124 82Z', { c1: '#f87171', c2: '#7f1d1d', rim: '#ffe29a', tex: false, lw: 2.2, line: '#450a0a' });
      // копьё
      s += K.line('M156 22 L146 176', '#2a1406', 5) + K.line('M156 22 L146 176', '#8a5a30', 3) + K.part('M157 4 L163 22 L156 28 L150 21Z', '#e2e8f0', { line: '#1e293b', lw: 1.6 });
      // ноги с поножами
      s += K.mirror(K.line('M88 140 L86 170', '#6b2e14', 10) + K.line('M88 140 L86 170', skin, 7) + K.vol('M80 148 C80 144 84 142 88 142 C92 142 95 144 95 148 V166 C90 168 84 168 80 166Z', { c1: '#fde68a', c2: '#a16207', rim: '#ffe29a', tex: false, lw: 1.8, line: '#3b1d0c' }) + K.part('M78 170 H96 V178 H78Z', '#5a2c0c', { line: '#1a0a02', lw: 1.4 }));
      // юбка из полос
      s += [76, 86, 96, 106, 116].map(x => K.part(`M${x} 122 H${x + 9} L${x + 9} 142 Q${x + 4.5} 145 ${x} 142Z`, '#b91c1c', { line: '#450a0a', lw: 1.3 })).join('');
      // панцирь
      s += K.vol('M70 86 C64 98 66 114 76 126 H124 C134 114 136 98 130 86 Q100 74 70 86Z', bronze);
      s += K.line('M88 98 Q94 104 100 98 Q106 104 112 98 M92 110 H98 M102 110 H108 M100 100 V124', '#2a1406', 1.6, { op: 0.6 });
      // шарф болельщика
      const scarf = 'M76 84 C88 92 112 92 124 84 L126 92 C112 100 88 100 74 92Z';
      s += K.vol(scarf, { c1: '#fca5a5', c2: '#b91c1c', rim: '#ffe29a', tex: false, lw: 1.8, line: '#450a0a' });
      s += grClip(K, scarf, '<g fill="#fde047">' + [80, 92, 104, 116].map(x => `<rect x="${x}" y="80" width="6" height="22"/>`).join('') + '</g>');
      s += K.vol('M110 94 L119 96 L117 124 L108 122Z', { c1: '#fca5a5', c2: '#b91c1c', rim: '#ffe29a', tex: false, lw: 1.8, line: '#450a0a' }) + '<path d="M109.4 104 L117.8 105 L117.6 109 L109.2 108Z M108.8 114 L117.2 115 L117 119 L108.6 118Z" fill="#fde047"/>' + K.line('M109 124 l-1 4 M112 124 v4 M115 124 l1 4', '#fde047', 1.4);
      // рука с копьём
      s += K.line('M128 92 C138 98 144 102 150 104', '#6b2e14', 11) + K.line('M128 92 C138 98 144 102 150 104', skin, 7.6) + K.vol(K.ell(150, 104, 7, 7.4), sk);
      // щит с огнём
      s += K.line('M72 92 C62 104 58 114 58 122', '#6b2e14', 11) + K.line('M72 92 C62 104 58 114 58 122', skin, 7.6);
      s += K.vol(K.ell(50, 134, 28, 28), { c1: '#ef4444', c2: '#7f1d1d', rim: '#ffe29a', tex: false, lw: 2.4, line: '#1a0a02' });
      s += `<circle cx="50" cy="134" r="22" fill="none" stroke="#fcd34d" stroke-width="2.6"/>` + K.flame(50, 148, 26, 18, '#fff0a0', '#ff8a1a', { style: 'animation-delay:-.5s' });
      // огненный гребень и голова в шлеме
      for (const [x, h, a, d] of [[84, 22, -24, -0.3], [92, 30, -10, -0.9], [100, 34, 0, -0.1], [108, 30, 10, -0.6], [116, 22, 24, -1.1]]) s += K.g(K.flame(x, 34, h, h * 0.62, '#ffd23f', '#e8431a', { style: `animation-delay:${d}s` }), `rotate(${a} ${x} 34)`);
      s += K.vol(K.ell(100, 62, 19, 19), sk);
      s += K.vol('M78 60 C76 40 86 30 100 30 C114 30 124 40 122 60 L118 74 C116 64 112 56 100 56 C88 56 84 64 82 74Z', bronze);
      s += K.line('M80 54 Q100 46 120 54', '#fcd34d', 2.4);
      s += `<g class="art-float"><circle cx="70" cy="50" r="5" fill="#f1f5f9" opacity=".6"/><circle cx="64" cy="40" r="3.6" fill="#f1f5f9" opacity=".5"/><circle cx="130" cy="50" r="5" fill="#f1f5f9" opacity=".6"/><circle cx="136" cy="40" r="3.6" fill="#f1f5f9" opacity=".5"/></g>`;
      s += K.eyes(100, 64, 7.4, 5.4, { iris: '#b45309', lid: 'angry', skin, look: [0.2, 0.1] });
      s += K.mouth('teeth', 100, 72, 11);
      s += K.spark(22, 40, 3.4, '#ffd23f', 'art-float') + K.spark(180, 70, 3, '#ffe08a') + K.spark(184, 150, 2.6, '#fff3b0', 'art-float');
      return s;
    },

    // Афродита: богиня любви и красоты, рождённая из морской пены. Стоит в огромной перламутровой раковине, длинные
    // золотисто-розовые волосы струятся до колен, розовый хитон и жемчужная диадема. В одной руке — роза, в другой —
    // замочек-сердечко с ключиком для моста влюблённых. Рядом порхает голубка, вокруг плывут сердечки и пена
    gr_afrodita(K) {
      const skin = '#fde4d0', sk = { c1: skin, c2: '#e8a890', rim: '#fff0f5', tex: false, lw: 2.2, line: '#9a4a4a' };
      const heart = (x, y, r, c, cls = '') => `<path${cls ? ` class="${cls}"` : ''} d="M${x} ${f(y + r * 0.9)} C${f(x - r * 1.5)} ${f(y - r * 0.1)} ${f(x - r * 0.9)} ${f(y - r * 1.1)} ${x} ${f(y - r * 0.35)} C${f(x + r * 0.9)} ${f(y - r * 1.1)} ${f(x + r * 1.5)} ${f(y - r * 0.1)} ${x} ${f(y + r * 0.9)}Z" fill="${c}" stroke="${K.shade(c, -0.5)}" stroke-width="1.2" stroke-linejoin="round"/>`;
      let s = K.aura('#f472b6', 98, 100, 0.42);
      // раковина-гребешок
      let sd = 'M20 170', rr = '';
      for (let i = 1; i <= 9; i++) {
        const P = j => { const a = Math.PI * (1 + j / 9); return [100 + 80 * Math.cos(a), 170 + 72 * Math.sin(a)]; };
        const [x, y] = P(i), [px, py] = P(i - 1), r = Math.hypot(x - px, y - py) * 0.6;
        sd += `A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y)}`;
        if (i < 9) rr += `M100 172 L${f(x)} ${f(y)}`;
      }
      sd += 'Q100 180 20 170Z';
      s += K.vol(sd, { c1: '#fff1f5', c2: '#f9a8d4', rim: '#c8f3ff', rimK: 0.6, tex: false, lw: 2.4, line: '#9d174d' }) + K.line(rr, '#f472b6', 1.6, { op: 0.6 });
      // волосы позади
      s += K.part('M82 46 C70 60 66 84 70 108 C72 124 66 136 60 144 C76 142 84 130 86 116 L114 116 C118 132 128 142 146 144 C136 134 130 122 130 108 C134 84 130 60 118 46 C110 36 90 36 82 46Z', '#f6b98a', { line: '#9a4a1a', lw: 1.8 });
      s += K.line('M74 70 C70 90 74 108 68 128 M126 70 C130 90 126 108 134 128', '#fde2b8', 1.8, { op: 0.8 });
      // хитон
      const dress = 'M80 90 C74 114 70 140 68 168 H132 C130 140 126 114 120 90 Q100 84 80 90Z';
      s += K.vol(dress, { c1: '#fff0f6', c2: '#f472b6', rim: '#c8f3ff', tex: false, lw: 2.2, line: '#831843' });
      s += K.line('M92 100 C88 124 86 146 84 166 M108 100 C112 124 114 146 116 166', '#db2777', 1.4, { op: 0.4 });
      s += '<g fill="#fff" stroke="#c4b5fd" stroke-width=".7">' + [[88, 92], [94, 96], [100, 97], [106, 96], [112, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('') + '</g>';
      // пена у ног
      s += `<g class="art-float"><circle cx="70" cy="166" r="7" fill="#fff" opacity=".85"/><circle cx="84" cy="170" r="6" fill="#fff" opacity=".9"/><circle cx="118" cy="170" r="6" fill="#fff" opacity=".9"/><circle cx="132" cy="166" r="7" fill="#fff" opacity=".85"/><circle cx="100" cy="172" r="5" fill="#fff" opacity=".9"/></g>`;
      // рука с замочком-сердечком
      s += K.line('M82 96 C72 106 66 116 64 124', '#9a4a4a', 8.4) + K.line('M82 96 C72 106 66 116 64 124', skin, 5.8);
      s += K.line('M58 120 C58 110 70 110 70 120', '#94a3b8', 2.6) + heart(64, 130, 9, '#fbbf24') + `<circle cx="64" cy="128" r="1.6" fill="#78350f"/><path d="M63.2 129 h1.6 l.6 4 h-2.8z" fill="#78350f"/>`;
      s += K.vol(K.ell(64, 122, 5.6, 5.4), sk);
      // рука с розой
      s += K.line('M118 94 C128 86 134 76 136 66', '#9a4a4a', 8.4) + K.line('M118 94 C128 86 134 76 136 66', skin, 5.8);
      s += K.line('M138 64 L140 46', '#3f6212', 2) + K.leaf(139, 56, 8, -20, '#65a30d');
      s += `<circle cx="140" cy="42" r="7.4" fill="${K.rad([[0, '#fda4af'], [1, '#be123c']])}" stroke="#881337" stroke-width="1.4"/>` + K.line('M136 42 Q140 36 144 42 Q140 46 137 40 M138 44 Q142 46 144 40', '#881337', 1, { op: 0.8 });
      s += K.vol(K.ell(136, 64, 5.6, 5.4), sk);
      // голубка
      s += `<g class="art-float" style="animation-delay:-.7s">` + K.part('M160 70 C164 62 174 60 180 64 C176 66 174 70 176 74 C170 76 164 76 160 70Z', '#ffffff', { line: '#64748b', lw: 1.4 }) + K.part('M168 66 C164 56 168 48 176 46 C176 54 174 60 170 66Z', '#f1f5f9', { line: '#64748b', lw: 1.2 }) + `<circle cx="162" cy="68" r="1" fill="#1e293b"/><path d="M159 69 L155 70 L159 71Z" fill="#fb923c"/></g>`;
      // голова, чёлка, жемчужная диадема
      s += K.vol(K.ell(100, 60, 19, 19), sk);
      s += K.part('M81 60 C80 46 90 40 100 40 C110 40 120 46 119 60 C114 52 106 48 100 50 C94 48 86 52 81 60Z', '#f6b98a', { line: '#9a4a1a', lw: 1.6 });
      s += '<g fill="#fff" stroke="#c4b5fd" stroke-width=".7">' + [[86, 46], [92, 42], [100, 40.6], [108, 42], [114, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2"/>`).join('') + '</g>' + `<circle cx="100" cy="40" r="3.4" fill="#f9a8d4" stroke="#9d174d" stroke-width="1"/>`;
      s += K.eyes(100, 62, 7.4, 5.8, { iris: '#0891b2', lash: true, look: [0.3, 0.1] });
      s += K.blush(88, 70, 3.8) + K.blush(112, 70, 3.8) + K.mouth('smile', 100, 70, 8);
      s += heart(30, 60, 5, '#f472b6', 'art-float') + heart(172, 110, 4.4, '#fda4af', 'art-blink') + heart(34, 110, 3.6, '#fbcfe8', 'art-blink');
      s += K.spark(60, 24, 3, '#fff0f5') + K.spark(176, 150, 2.6, '#e0f2fe', 'art-float');
      return s;
    },

    // Гера: царица Олимпа. За её спиной раскрыт павлиний хвост — на перьях сто глаз великана Аргуса, сбоку выглядывает
    // сам павлин. Высокая золотая корона-полос с покрывалом, синее царское платье с меандром, в одной руке скипетр
    // с кукушкой, в другой — гранат. Стоит на облаках, вокруг вьётся небесный ветер
    gr_gera(K) {
      const skin = '#fbe0c8', sk = { c1: skin, c2: '#dca482', rim: '#eef0ff', tex: false, lw: 2.2, line: '#7a4a2a' };
      let s = K.aura('#a5b4fc', 100, 100, 0.45);
      // павлиний хвост веером
      let fan = '';
      for (let i = 0; i < 13; i++) {
        const a = -168 + i * 13, t = a * Math.PI / 180, ex = 100 + 70 * Math.cos(t), ey = 112 + 66 * Math.sin(t);
        fan += K.line(`M100 112 L${f(ex)} ${f(ey)}`, '#0f766e', 1.4);
        fan += `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="14" ry="9" transform="rotate(${a} ${f(ex)} ${f(ey)})" fill="${K.lin(['#5eead4', '#0d9488'])}" stroke="#134e4a" stroke-width="1.4"/>`;
        fan += `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="7" ry="5.4" transform="rotate(${a} ${f(ex)} ${f(ey)})" fill="#fcd34d" stroke="#92400e" stroke-width=".9"/><ellipse cx="${f(ex)}" cy="${f(ey)}" rx="4.6" ry="3.6" transform="rotate(${a} ${f(ex)} ${f(ey)})" fill="#1d4ed8"/><circle cx="${f(ex)}" cy="${f(ey)}" r="2" fill="#0b1640"/>`;
      }
      s += `<g class="art-aura">${fan}</g>`;
      // облака под ногами
      s += K.vol(grCloudD(28, 172, 176, 18), { c1: '#ffffff', c2: '#a5b4fc', rim: '#eef0ff', tex: false, lw: 2, line: '#4338ca' });
      // покрывало позади
      s += K.part('M80 44 C68 70 64 110 66 150 L134 150 C136 110 132 70 120 44Z', '#c7d2fe', { line: '#4338ca', lw: 1.6, op: 0.85 });
      // царское платье
      const dress = 'M78 92 C70 116 66 144 64 168 H136 C134 144 130 116 122 92 Q100 84 78 92Z';
      s += K.vol(dress, { c1: '#818cf8', c2: '#1e1b4b', rim: '#eef0ff', rimK: 0.6, texK: 0.2, lw: 2.4, line: '#0f0c3a' });
      s += grClip(K, dress, `<rect x="60" y="152" width="80" height="18" fill="#0f0c3a"/>` + grKey(K, 66, 156, 68, 8, '#fcd34d', 1.4));
      s += K.line('M78 96 Q100 104 122 96', '#78350f', 5) + K.line('M78 96 Q100 104 122 96', '#fcd34d', 3) + K.line('M92 104 C88 126 86 146 84 166 M108 104 C112 126 114 146 116 166', '#312e81', 1.4, { op: 0.5 });
      // павлин сбоку
      s += K.line('M60 150 C48 132 46 112 54 98', '#134e4a', 9) + K.line('M60 150 C48 132 46 112 54 98', '#2563eb', 6);
      s += K.vol(K.ell(56, 94, 7, 6.4), { c1: '#60a5fa', c2: '#1e3a8a', rim: '#eef0ff', tex: false, lw: 1.6, line: '#0b1640' }) + `<path d="M50 94 L44 96 L50 98Z" fill="#94a3b8" stroke="#334155" stroke-width=".8"/><circle cx="54" cy="92" r="1.6" fill="#0b1640"/><path d="M52 90 C51 87 52 85 54 86" fill="none" stroke="#fff" stroke-width="1.6"/>` + K.line('M56 88 L54 78 M58 88 L60 78 M57 88 V76', '#1e3a8a', 1) + `<circle cx="54" cy="78" r="1.6" fill="#2dd4bf"/><circle cx="60" cy="78" r="1.6" fill="#2dd4bf"/><circle cx="57" cy="76" r="1.6" fill="#2dd4bf"/>`;
      // скипетр с кукушкой
      s += K.line('M144 40 V170', '#78350f', 5) + K.line('M144 40 V170', '#fcd34d', 3);
      s += K.part('M138 40 C138 32 146 28 152 32 L158 30 L154 36 C154 42 148 44 142 42Z', '#a8a29e', { line: '#292524', lw: 1.4 }) + `<circle cx="147" cy="34" r="1.2" fill="#1c1917"/>`;
      s += K.line('M120 98 C130 102 136 104 140 106', '#7a4a2a', 8.4) + K.line('M120 98 C130 102 136 104 140 106', skin, 5.8) + K.vol(K.ell(143, 106, 5.6, 6), sk);
      // гранат в руке
      s += K.line('M80 98 C72 106 68 114 68 120', '#7a4a2a', 8.4) + K.line('M80 98 C72 106 68 114 68 120', skin, 5.8);
      s += grPome(K, 64, 128, 9, false) + K.vol(K.ell(68, 120, 5.6, 5.4), sk);
      // голова и корона-полос
      s += K.vol(K.ell(100, 62, 19, 19), sk);
      s += K.part('M81 62 C80 48 90 42 100 42 C110 42 120 48 119 62 C114 54 106 50 100 52 C94 50 86 54 81 62Z', '#3b2a1a', { line: '#1a0e05', lw: 1.6 });
      s += K.vol('M82 46 L84 24 Q100 18 116 24 L118 46 Q100 40 82 46Z', { c1: '#fde68a', c2: '#a16207', rim: '#eef0ff', tex: false, lw: 2, line: '#5a3a06' });
      s += K.line('M84 30 Q100 25 116 30', '#78350f', 1.2) + `<circle cx="100" cy="34" r="3.4" fill="#2dd4bf" stroke="#134e4a" stroke-width="1"/><circle cx="90" cy="35" r="2" fill="#ef4444"/><circle cx="110" cy="35" r="2" fill="#ef4444"/>`;
      s += K.eyes(100, 64, 7.4, 5.6, { iris: '#4338ca', lash: true, look: [-0.2, 0.1] });
      s += K.blush(88, 71, 3.4) + K.blush(112, 71, 3.4) + K.mouth('smile', 100, 72, 7);
      s += K.line('M18 150 C28 140 42 146 38 154 M166 30 C176 22 190 28 186 36', '#eef0ff', 2, { op: 0.6, cls: 'art-float' });
      s += K.spark(24, 30, 3, '#eef0ff') + K.spark(180, 120, 2.6, '#fde68a', 'art-float');
      return s;
    },

    // Гефест: бог огня и кузнечного дела. Коренастый бородач в войлочном колпаке-пилосе и кожаном фартуке, одно плечо
    // открыто. Молот на плече, в клещах — раскалённая подкова, позади пылает горн. Одна нога в золотой скобе его же
    // работы, а у ног суетится маленький самоходный треножник-помощник
    gr_gefest(K) {
      const skin = '#e4a27a', sk = { c1: skin, c2: '#b06a44', rim: '#ffe29a', tex: false, lw: 2.4, line: '#5a2a12' };
      let s = K.aura('#ff7a1a', 100, 102, 0.5);
      // горн позади
      s += K.vol('M120 178 V120 C120 104 136 96 152 96 C168 96 184 104 184 120 V178Z', { c1: '#a8a29e', c2: '#44403c', rim: '#ffe29a', tex: false, lw: 2.2, line: '#1c1917' });
      s += `<path d="M134 178 V136 C134 126 142 120 152 120 C162 120 170 126 170 136 V178Z" fill="#1c1210"/>`;
      s += K.flame(144, 176, 40, 22, '#ffd23f', '#e8431a', { style: 'animation-delay:-.3s' }) + K.flame(160, 176, 34, 20, '#ffd23f', '#e8431a', { style: 'animation-delay:-.8s' }) + K.flame(152, 176, 48, 24, '#fff0a0', '#ff7a1a');
      s += K.line('M128 106 L132 100 M152 92 V86 M176 106 L172 100', '#78716c', 2);
      // ноги: одна в золотой скобе
      s += K.vol('M72 146 H92 V172 H72Z', { ...sk, lw: 2.2 }) + K.vol('M104 146 H124 V172 H104Z', { ...sk, lw: 2.2 });
      s += K.line('M106 150 V170 M122 150 V170', '#78350f', 3.6) + K.line('M106 150 V170 M122 150 V170', '#fcd34d', 2) + `<rect x="102" y="152" width="24" height="5" rx="2.4" fill="#fcd34d" stroke="#78350f" stroke-width="1.2"/><rect x="102" y="162" width="24" height="5" rx="2.4" fill="#fcd34d" stroke="#78350f" stroke-width="1.2"/>`;
      s += K.part('M68 170 H96 V178 H68Z M100 170 H128 V178 H100Z', '#5a2c0c', { line: '#1c0e04', lw: 1.4 });
      // торс и туника-эксомида
      s += K.vol('M62 86 C54 100 56 128 64 148 H136 C144 128 146 100 138 86 Q100 72 62 86Z', sk);
      s += K.vol('M64 98 C80 92 94 94 104 90 C118 86 130 84 138 88 C144 104 142 128 136 148 H64 C58 130 58 112 64 98Z', { c1: '#d6c3a5', c2: '#6b5a44', rim: '#ffe29a', tex: false, lw: 2.2, line: '#2a2014' });
      s += K.vol('M70 112 H130 C134 128 132 140 128 152 H72 C68 140 66 128 70 112Z', { c1: '#a86a3a', c2: '#4a240c', rim: '#ffe29a', tex: false, lw: 2.2, line: '#2a1206' });
      s += K.stitch('M74 116 H126', '#fcd34d', 1.4);
      // рука с клещами и подковой
      s += K.line('M64 96 C54 108 50 120 50 130', '#5a2a12', 16) + K.line('M64 96 C54 108 50 120 50 130', skin, 12);
      s += K.line('M47 128 L30 128 M50 133 L32 136', '#1e293b', 3.4) + K.line('M47 128 L30 128 M50 133 L32 136', '#94a3b8', 1.6);
      s += `<circle class="art-aura" cx="24" cy="132" r="14" fill="${K.rad([[0, '#fff3b0', 0.9], [1, '#ff7a1a', 0]])}"/>` + K.line('M18 124 C13 130 15 140 24 140 C33 140 35 130 30 124', '#c2330f', 5.6) + K.line('M18 124 C13 130 15 140 24 140 C33 140 35 130 30 124', '#ffd23f', 3);
      s += K.vol(K.ell(50, 132, 8, 8), sk);
      // молот на плече
      s += K.line('M134 96 C142 90 144 80 140 70', '#5a2a12', 16) + K.line('M134 96 C142 90 144 80 140 70', skin, 12);
      s += K.line('M138 72 L112 34', '#3b1d0c', 6) + K.line('M138 72 L112 34', '#b97a4a', 3.6);
      s += K.g(K.vol('M-15 -9 H15 V9 H-15Z', { c1: '#94a3b8', c2: '#334155', rim: '#ffe29a', tex: false, lw: 2.2, line: '#0f172a' }) + K.line('M-13 -5 H13', '#f1f5f9', 1.6, { op: 0.8 }), 'translate(110 32) rotate(-34)');
      s += K.vol(K.ell(139, 70, 8.4, 8), sk);
      // голова: колпак-пилос, борода, брови
      s += K.vol(K.ell(100, 62, 21, 21), sk);
      s += K.vol('M78 52 C78 32 88 18 100 14 C112 18 122 32 122 52 Q100 46 78 52Z', { c1: '#c2643a', c2: '#5a1e08', rim: '#ffe29a', tex: false, lw: 2, line: '#2a0c02' });
      s += K.line('M79 50 Q100 44 121 50', '#2a0c02', 3);
      s += K.vol('M78 64 C76 84 86 98 100 100 C114 98 124 84 122 64 C116 74 108 78 100 78 C92 78 84 74 78 64Z', { c1: '#4a3428', c2: '#140c08', tex: false, lw: 2, line: '#0a0604' });
      s += K.line('M88 84 q-2 6 0 10 M100 86 v10 M112 84 q2 6 0 10', '#6b4e3e', 1.4);
      s += K.eyes(100, 62, 8, 5.6, { iris: '#ea580c', lid: 'angry', skin, look: [-0.5, 0.4] });
      s += `<ellipse cx="100" cy="72" rx="4.4" ry="3.4" fill="${K.rad([[0, '#f0b48a'], [1, '#b06a44']], 0.4, 0.35, 0.7)}" stroke="#5a2a12" stroke-width="1.2"/>`;
      // треножник-помощник (анимация — на внешней группе, сдвиг — на внутренней)
      s += K.g(K.g(K.line('M-14 10 L-20 22 M14 10 L20 22 M0 12 V22', '#4a2408', 4) + `<circle cx="-20" cy="24" r="4" fill="#fcd34d" stroke="#4a2408" stroke-width="1.2"/><circle cx="20" cy="24" r="4" fill="#fcd34d" stroke="#4a2408" stroke-width="1.2"/>` +
        K.vol('M-18 0 C-18 -8 -8 -12 0 -12 C8 -12 18 -8 18 0 C18 10 10 16 0 16 C-10 16 -18 10 -18 0Z', { c1: '#f8cc8a', c2: '#a0612a', rim: '#ffe29a', tex: false, lw: 1.8, line: '#4a2408' }) +
        `<circle cx="-5" cy="0" r="3" fill="#fff" stroke="${K.INK}" stroke-width="1"/><circle cx="5" cy="0" r="3" fill="#fff" stroke="${K.INK}" stroke-width="1"/><circle cx="-4.6" cy=".6" r="1.5" fill="${K.INK}"/><circle cx="5.4" cy=".6" r="1.5" fill="${K.INK}"/>` + K.line('M-3 7 Q0 9 3 7', K.INK, 1.2), 'translate(42 162) scale(.72)'), '', 'art-float');
      s += K.spark(22, 40, 3.4, '#ffd23f', 'art-float') + K.spark(176, 60, 3, '#ffe08a') + K.spark(66, 22, 2.6, '#fff3b0') + K.spark(160, 80, 2.6, '#ffb347', 'art-float');
      return s;
    },

    // Деметра: богиня урожая и плодородия. Венок из колосьев, золотое платье с зелёной каймой и светлое покрывало,
    // добрая сонная улыбка. В одной руке — рог изобилия, из которого сыплются яблоки, груши и виноград, в другой —
    // сноп пшеницы с маками. У ног колышется спелое поле
    gr_demetra(K) {
      const skin = '#f8d6b4', sk = { c1: skin, c2: '#d8a07a', rim: '#fff0c0', tex: false, lw: 2.2, line: '#7a4a2a' };
      let s = K.aura('#facc15', 100, 100, 0.42) + K.aura('#84cc16', 70, 150, 0.3);
      // покрывало позади
      s += K.part('M80 44 C68 70 64 110 66 150 L134 150 C136 110 132 70 120 44Z', '#fef9e7', { line: '#a16207', lw: 1.6 });
      // платье
      const dress = 'M78 92 C70 116 66 144 64 170 H136 C134 144 130 116 122 92 Q100 84 78 92Z';
      s += K.vol(dress, { c1: '#fef08a', c2: '#b45309', rim: '#e4ffb0', rimK: 0.6, texK: 0.15, lw: 2.4, line: '#5a2c06' });
      s += grClip(K, dress, `<rect x="60" y="156" width="80" height="16" fill="#3f6212"/>` + K.line('M62 164 q4 -5 8 0 q4 -5 8 0 q4 -5 8 0 q4 -5 8 0 q4 -5 8 0 q4 -5 8 0 q4 -5 8 0 q4 -5 8 0 q4 -5 8 0', '#bef264', 1.6));
      s += K.line('M78 98 Q100 106 122 98', '#3f6212', 4.4) + K.line('M92 104 C88 126 86 146 84 166 M108 104 C112 126 114 146 116 166', '#a16207', 1.4, { op: 0.5 });
      // рог изобилия с плодами
      s += K.line('M80 98 C72 108 68 118 70 126', '#7a4a2a', 8.4) + K.line('M80 98 C72 108 68 118 70 126', skin, 5.8);
      s += `<circle cx="34" cy="100" r="7" fill="${K.rad([[0, '#fca5a5'], [1, '#b91c1c']], 0.35, 0.3, 0.8)}" stroke="#7f1d1d" stroke-width="1.2"/><circle cx="48" cy="94" r="6.4" fill="${K.rad([[0, '#fde68a'], [1, '#ca8a04']], 0.35, 0.3, 0.8)}" stroke="#713f12" stroke-width="1.2"/>`;
      s += [[28, 112], [34, 116], [30, 120], [36, 122], [32, 127]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${K.rad([[0, '#c4b5fd'], [1, '#5b21b6']], 0.35, 0.3, 0.8)}" stroke="#2e1065" stroke-width=".9"/>`).join('') + K.leaf(40, 104, 9, -60, '#65a30d');
      s += K.vol('M40 104 C48 110 58 116 70 120 C78 124 82 132 78 140 C72 148 60 144 54 136 C46 126 40 114 40 104Z', { c1: '#fcd34d', c2: '#92400e', rim: '#e4ffb0', tex: false, lw: 2, line: '#451a03' });
      s += K.line('M48 112 C52 118 58 122 64 124 M56 130 C60 134 66 136 72 136', '#78350f', 1.4, { op: 0.7 }) + `<ellipse cx="44" cy="106" rx="8" ry="5" transform="rotate(-40 44 106)" fill="#78350f"/>`;
      s += `<path d="M44 96 C44 88 52 86 54 92 C58 98 54 104 48 104 C44 104 42 100 44 96Z" fill="${K.lin(['#d9f99d', '#65a30d'])}" stroke="#3f6212" stroke-width="1.2"/>`;
      s += K.vol(K.ell(70, 128, 5.6, 5.4), sk);
      // сноп пшеницы с маками
      s += K.line('M120 98 C130 102 136 106 140 112', '#7a4a2a', 8.4) + K.line('M120 98 C130 102 136 106 140 112', skin, 5.8);
      for (const [a, L] of [[-20, 50], [-6, 58], [8, 56], [22, 48]]) s += grWheat(K, 142, 118, L, a);
      for (const [x, y] of [[128, 76], [156, 74]]) s += `<g transform="translate(${x} ${y})">` + [0, 72, 144, 216, 288].map(a => `<ellipse cx="${f(3.4 * Math.cos(a * Math.PI / 180))}" cy="${f(3.4 * Math.sin(a * Math.PI / 180))}" rx="4" ry="3.4" fill="#ef4444" stroke="#7f1d1d" stroke-width=".9"/>`).join('') + `<circle r="1.8" fill="#1c1917"/></g>`;
      s += K.line('M134 110 Q142 114 150 110', '#b91c1c', 3.4) + K.vol(K.ell(142, 112, 5.6, 5.4), sk);
      // голова и венок из колосьев
      s += K.vol(K.ell(100, 62, 19, 19), sk);
      s += K.part('M81 62 C80 48 90 42 100 42 C110 42 120 48 119 62 C114 54 106 50 100 52 C94 50 86 54 81 62Z', '#8a5a2e', { line: '#3b2412', lw: 1.6 });
      for (let i = 0; i < 5; i++) s += grWheat(K, 86 + i * 7, 48 + Math.abs(i - 2) * 2, 8 + (2 - Math.abs(i - 2)) * 3, (i - 2) * 16);
      s += K.eyes(100, 64, 7.4, 5.6, { iris: '#a16207', lid: 'half', skin, look: [0.1, 0.2] });
      s += K.blush(88, 71, 3.6) + K.blush(112, 71, 3.6) + K.mouth('smile', 100, 72, 8);
      // спелое поле у ног
      const ear = K.lin(['#fde68a', '#eab308', '#a16207']);
      for (let i = 0; i < 9; i++) {
        const x = 14 + i * 21.5, h = 22 + (i % 3) * 5, r = i % 2 ? 6 : -6;
        s += `<g class="art-sway" style="animation-delay:${f(-i * 0.3)}s"><g transform="translate(${f(x)} 182) rotate(${r})">` + K.line(`M0 0 V${-h + 10}`, '#a16207', 1.6) +
          `<ellipse cx="0" cy="${-h + 2}" rx="4" ry="9" fill="${ear}" stroke="#92400e" stroke-width="1"/>` + K.line(`M-3 ${-h - 3} l3 2 l3 -2 M-3.4 ${-h + 2} l3.4 2 l3.4 -2 M-3 ${-h + 7} l3 2 l3 -2 M0 ${-h - 7} V${-h - 14}`, '#92400e', 0.9) + '</g></g>';
      }
      s += K.spark(24, 40, 3, '#fde68a') + K.spark(178, 40, 2.8, '#e4ffb0', 'art-float') + K.spark(184, 120, 2.4, '#fde68a');
      return s;
    },

    // Дионис: весёлый бог виноградной лозы и театра. Тёмные кудри в венке из плюща с гроздьями винограда, лиловый
    // гиматий, в руке — тирс (посох с шишкой на конце, обвитый плющом), в другой — смеющаяся театральная маска.
    // У ног сидит пятнистый пантерёнок, по земле вьётся виноградная лоза
    gr_dionis(K) {
      const skin = '#f6d0b0', sk = { c1: skin, c2: '#d0946e', rim: '#fff0c0', tex: false, lw: 2.2, line: '#7a4030' };
      const grapes = (x, y, k) => [[0, 0], [-1, 0], [1, 0], [-0.5, 1], [0.5, 1], [0, 2]].map(([i, j]) => `<circle cx="${f(x + i * 6.4 * k)}" cy="${f(y + j * 5.6 * k)}" r="${f(3.8 * k)}" fill="${K.rad([[0, '#c4b5fd'], [0.6, '#7c3aed'], [1, '#3b0764']], 0.35, 0.3, 0.8)}" stroke="#2e1065" stroke-width="1"/>`).join('');
      let s = K.aura('#84cc16', 98, 100, 0.42) + K.aura('#a855f7', 56, 72, 0.25);
      // тирс, обвитый плющом
      s += K.line('M148 32 V176', '#3f6212', 5) + K.line('M148 32 V176', '#bef264', 3);
      s += K.line('M148 44 C140 54 156 62 148 72 C140 82 156 90 148 100', '#15803d', 2) + K.leaf(144, 52, 8, 200, '#65a30d') + K.leaf(152, 66, 8, -20, '#84cc16') + K.leaf(144, 84, 8, 200, '#65a30d') + K.leaf(152, 96, 7, -20, '#84cc16');
      s += `<ellipse cx="148" cy="24" rx="7.4" ry="11" fill="${K.lin(['#d9a05a', '#7c4a1d'])}" stroke="#3b1d0c" stroke-width="1.6"/>` + K.line('M142 18 L154 22 M141 24 L155 28 M142 30 L154 33 M148 14 V34', '#3b1d0c', 1, { op: 0.6 });
      // лоза у ног
      s += K.line('M6 172 C26 160 46 178 68 168 C90 158 112 178 134 168 C156 158 176 172 196 164', '#4d7c0f', 3);
      s += K.leaf(30, 166, 10, -30, '#65a30d') + K.leaf(96, 170, 10, 200, '#84cc16') + K.leaf(160, 162, 10, -40, '#65a30d') + grapes(64, 170, 0.8) + grapes(128, 168, 0.8);
      // гиматий
      const dress = 'M78 92 C70 116 66 144 64 170 H136 C134 144 130 116 122 92 Q100 84 78 92Z';
      s += K.vol(dress, { c1: '#d8b4fe', c2: '#581c87', rim: '#e4ffb0', rimK: 0.55, texK: 0.15, lw: 2.4, line: '#2e1065' });
      s += K.vol('M80 94 C92 90 104 94 110 102 C116 120 120 140 124 168 H104 C102 140 96 118 82 106Z', { c1: '#f3e8ff', c2: '#a78bfa', rim: '#e4ffb0', tex: false, lw: 2, line: '#4c1d95' });
      s += K.line('M88 100 Q100 106 112 100', '#65a30d', 3);
      // пантерёнок
      s += K.line('M60 170 C70 172 78 166 76 158', '#3b2412', 5) + K.line('M60 170 C70 172 78 166 76 158', '#f5c46a', 3);
      s += K.vol(K.ell(46, 162, 16, 13), { c1: '#fcd88a', c2: '#b7791f', rim: '#e4ffb0', tex: false, lw: 2, line: '#3b2412' });
      s += K.part('M32 134 L34 124 L40 130Z M48 130 L54 124 L54 134Z', '#e8b04a', { line: '#3b2412', lw: 1.4 });
      s += K.vol(K.ell(43, 140, 12, 11), { c1: '#fde4a8', c2: '#c8892a', rim: '#e4ffb0', tex: false, lw: 2, line: '#3b2412' });
      s += '<g fill="#3b2412">' + [[38, 156], [50, 154], [44, 166], [56, 164], [34, 166], [36, 134], [50, 134]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8"/>`).join('') + '</g>';
      s += `<ellipse cx="43" cy="145" rx="5" ry="3.4" fill="#fff4dc"/><path d="M41 143 h4 l-2 2.4z" fill="#3b2412"/>` + `<g class="art-eyes">${K.eye(38.5, 139, 3.2, { iris: '#65a30d' })}${K.eye(47.5, 139, 3.2, { iris: '#65a30d' })}</g>`;
      // рука с маской
      s += K.line('M80 98 C70 92 64 84 62 74', '#7a4030', 8.4) + K.line('M80 98 C70 92 64 84 62 74', skin, 5.8);
      s += K.g(K.part('M-14 -6 C-14 -18 -6 -22 0 -22 C6 -22 14 -18 14 -6 C14 8 8 16 0 16 C-8 16 -14 8 -14 -6Z', '#fef3c7', { line: '#78350f', lw: 1.6 }) +
        `<path d="M-9 -8 Q-6 -12 -3 -8 Q-6 -6 -9 -8Z M3 -8 Q6 -12 9 -8 Q6 -6 3 -8Z" fill="#1c1917"/>` + `<path d="M-8 2 Q0 12 8 2 Q0 6 -8 2Z" fill="#7f1d1d" stroke="#1c1917" stroke-width="1.2"/>` + K.line('M-14 -6 L-20 0 M14 -6 L20 0', '#dc2626', 2), 'translate(58 60) rotate(-12)');
      s += K.vol(K.ell(62, 76, 5.6, 5.4), sk);
      // рука с тирсом
      s += K.line('M120 98 C130 102 138 106 144 108', '#7a4030', 8.4) + K.line('M120 98 C130 102 138 106 144 108', skin, 5.8) + K.vol(K.ell(147, 108, 5.6, 6), sk);
      // голова: кудри, венок из плюща с виноградом
      for (const [x, y] of [[82, 56], [80, 68], [86, 44], [114, 44], [118, 56], [120, 68]]) s += K.vol(K.ell(x, y, 6.6, 6.4), { c1: '#5a3a2a', c2: '#1c0f08', tex: false, lw: 1.6, line: '#0a0503', rimK: 0.4 });
      s += K.vol(K.ell(100, 62, 19, 19), sk);
      s += K.part('M81 60 C80 46 90 40 100 40 C110 40 120 46 119 60 C114 52 106 48 100 50 C94 48 86 52 81 60Z', '#3b2418', { line: '#0a0503', lw: 1.6 });
      for (const [x, y, a] of [[84, 46, -150], [94, 40, -110], [106, 40, -70], [116, 46, -30]]) s += K.leaf(x, y, 10, a, '#4d7c0f');
      s += grapes(80, 50, 0.72) + grapes(120, 50, 0.72);
      s += K.eyes(100, 64, 7.4, 5.6, { iris: '#7c3aed', lid: 'half', skin, look: [0.3, 0.1] });
      s += K.blush(88, 71, 3.6) + K.blush(112, 71, 3.6) + K.mouth('grin', 100, 71, 10);
      s += K.spark(24, 40, 3, '#e4ffb0') + K.spark(178, 50, 2.8, '#e9d5ff', 'art-float') + K.spark(180, 130, 2.4, '#e4ffb0');
      return s;
    },

    // Прометей: добрый титан, подаривший людям огонь. Могучий, с кудрявой бородой, в простом хитоне через плечо, на
    // запястье — разбитый браслет цепи. Высоко поднял полый стебель-нартекс, на конце которого пылает огонь, а на другой
    // ладони стоит маленький глиняный человечек и машет ему. Внизу тёплым светом горят окна города
    gr_prometey(K) {
      const skin = '#e8a882', sk = { c1: skin, c2: '#b06a48', rim: '#ffe29a', tex: false, lw: 2.4, line: '#5a2a14' };
      let s = K.aura('#ff8a1a', 100, 100, 0.48);
      // город с окнами
      let city = '';
      for (const [x, w, h] of [[2, 26, 34], [26, 22, 46], [48, 26, 28], [128, 24, 40], [150, 22, 26], [170, 28, 44]]) {
        city += `<rect x="${x}" y="${178 - h}" width="${w}" height="${h}" fill="#2a2240" stroke="#120e22" stroke-width="1.6"/>`;
        for (let yy = 178 - h + 6; yy < 172; yy += 10) for (let xx = x + 4; xx < x + w - 5; xx += 8) city += `<rect class="${(xx + yy) % 3 ? '' : 'art-blink'}" x="${xx}" y="${yy}" width="4" height="5" fill="${(xx + yy) % 4 ? '#fde68a' : '#475569'}"/>`;
      }
      s += city;
      // хитон через плечо, ноги
      s += K.mirror(K.line('M88 140 L86 170', '#5a2a14', 10) + K.line('M88 140 L86 170', skin, 7) + K.part('M78 168 H96 V178 H78Z', '#7c4a1d', { line: '#2a1406', lw: 1.4 }));
      s += K.vol('M64 84 C56 100 58 124 66 146 H134 C142 124 144 100 136 84 Q100 70 64 84Z', sk);
      const ch = 'M62 104 C76 96 88 92 96 84 C110 84 128 86 136 92 C142 110 140 130 134 148 H66 C60 132 58 118 62 104Z';
      s += K.vol(ch, { c1: '#fdba74', c2: '#9a3412', rim: '#ffe29a', tex: false, lw: 2.2, line: '#451a03' });
      s += grClip(K, ch, `<rect x="56" y="136" width="90" height="14" fill="#7c2d12"/>` + grKey(K, 62, 138, 78, 7, '#fde68a', 1.3));
      s += K.line('M60 116 Q100 126 140 116', '#451a03', 5) + K.line('M60 116 Q100 126 140 116', '#fbbf24', 2.6);
      // рука с глиняным человечком
      s += K.line('M66 92 C56 104 52 116 52 124', '#5a2a14', 15) + K.line('M66 92 C56 104 52 116 52 124', skin, 11);
      s += `<rect x="44" y="118" width="16" height="7" rx="2" fill="#94a3b8" stroke="#334155" stroke-width="1.4"/>` + K.line('M44 125 l-4 6 M60 125 l3 5', '#64748b', 2);
      s += K.vol(K.ell(52, 132, 10, 6), sk);
      s += K.g(K.vol('M-6 0 C-6 -10 6 -10 6 0 L5 10 H-5Z', { c1: '#e8a27a', c2: '#9a5a3a', rim: '#ffe29a', tex: false, lw: 1.4, line: '#4a2410' }) + K.vol(K.ell(0, -14, 5.4, 5.4), { c1: '#e8a27a', c2: '#9a5a3a', rim: '#ffe29a', tex: false, lw: 1.4, line: '#4a2410' }) +
        K.line('M-5 -4 L-11 -12 M5 -4 L9 2', '#9a5a3a', 2.6) + `<circle cx="-2" cy="-15" r=".9" fill="${K.INK}"/><circle cx="2" cy="-15" r=".9" fill="${K.INK}"/>` + K.line('M-1.6 -11.6 Q0 -10.4 1.6 -11.6', K.INK, 0.9), 'translate(52 120)');
      // рука с огнём
      s += K.line('M134 92 C146 84 152 70 152 54', '#5a2a14', 15) + K.line('M134 92 C146 84 152 70 152 54', skin, 11);
      s += K.line('M152 60 L156 26', '#3f6212', 6) + K.line('M152 60 L156 26', '#a3e635', 3.4);
      s += `<circle class="art-aura" cx="156" cy="20" r="24" fill="${K.rad([[0, '#fff3b0', 0.95], [0.4, '#ffb020', 0.6], [1, '#ff6a1a', 0]])}"/>`;
      s += K.flame(156, 26, 36, 22, '#ffd23f', '#e8431a', { style: 'animation-delay:-.4s' }) + K.flame(156, 26, 24, 14, '#fff6c2', '#ffb020');
      s += K.vol(K.ell(152, 58, 8.4, 8), sk);
      s += `<rect x="142" y="64" width="18" height="7" rx="2" fill="#94a3b8" stroke="#334155" stroke-width="1.4" transform="rotate(-10 151 67)"/>` + K.line('M160 66 l5 4 l-2 4', '#64748b', 2);
      // голова: кудри и борода
      for (const [x, y] of [[80, 54], [82, 42], [92, 34], [108, 34], [118, 42], [120, 54]]) s += K.vol(K.ell(x, y, 8, 7.6), { c1: '#8a4a24', c2: '#3b1406', tex: false, lw: 1.8, line: '#1a0804', rimK: 0.4 });
      s += K.vol(K.ell(100, 60, 21, 21), sk);
      s += K.part('M80 56 C80 44 90 38 100 38 C110 38 120 44 120 56 C114 50 106 48 100 50 C94 48 86 50 80 56Z', '#6b3416', { line: '#1a0804', lw: 1.6 });
      s += K.vol('M78 62 C76 82 86 96 100 98 C114 96 124 82 122 62 C116 72 108 76 100 76 C92 76 84 72 78 62Z', { c1: '#8a4a24', c2: '#2a0e04', tex: false, lw: 2, line: '#1a0804' });
      s += grCurls(K, [[88, 84, 3.4], [100, 88, 3.4], [110, 82, 3.4]], '#c27c4a', 1.2);
      s += K.eyes(100, 60, 8.4, 6, { iris: '#ea580c', look: [0.6, -0.5] }) + K.line('M86 50 Q91 47 96 50 M104 50 Q109 47 114 50', '#2a0e04', 2.4);
      s += K.mouth('smile', 100, 72, 10) + K.blush(84, 68, 3.6) + K.blush(116, 68, 3.6);
      s += K.spark(24, 40, 3.4, '#ffd23f', 'art-float') + K.spark(110, 14, 3, '#ffe08a') + K.spark(184, 70, 2.6, '#fff3b0', 'art-float');
      return s;
    },

    // Геракл: величайший из героев. Голову, как капюшон, покрывает шкура Немейского льва — с гривой и клыками, лапы
    // завязаны на груди. Могучий, с короткой бородкой и весёлой улыбкой; в одной руке — сучковатая дубина, а на плече
    // он легко держит пианино, которое несёт соседям на пятый этаж
    gr_gerakl(K) {
      const skin = '#eaa87e', sk = { c1: skin, c2: '#b8704a', rim: '#fff0c0', tex: false, lw: 2.4, line: '#5a2a12' };
      const lion = { c1: '#fcd34d', c2: '#a16207', rim: '#e4ffb0', rimK: 0.6, texK: 0.15, lw: 2.2, line: '#4a2a04' };
      let s = K.aura('#84cc16', 100, 102, 0.45);
      // львиная шкура-плащ за спиной
      s += K.vol('M70 70 C56 96 50 132 52 168 H148 C150 132 144 96 130 70Z', lion);
      // пианино на плече
      s += K.g(K.vol('M-30 -26 H30 V20 H-30Z', { c1: '#a0643a', c2: '#3b1d0c', rim: '#e4ffb0', tex: false, lw: 2.2, line: '#1a0a02' }) +
        `<rect x="-30" y="-4" width="60" height="10" fill="#f8fafc" stroke="#1a0a02" stroke-width="1.4"/>` + K.line('M-22 -4 V6 M-14 -4 V6 M-6 -4 V6 M2 -4 V6 M10 -4 V6 M18 -4 V6 M26 -4 V6', '#94a3b8', 0.9) +
        '<g fill="#1a0a02">' + [-25, -17, -1, 7, 15].map(x => `<rect x="${x}" y="-4" width="4" height="6"/>`).join('') + '</g>' +
        `<rect x="-26" y="-22" width="52" height="14" rx="2" fill="none" stroke="#c98a4a" stroke-width="1.2"/>` + K.line('M-26 20 V28 M26 20 V28', '#1a0a02', 4), 'translate(144 44) rotate(-12)');
      // ноги
      s += K.mirror(K.vol('M74 138 H94 V170 H74Z', { ...sk, lw: 2.2 }) + K.part('M70 168 H98 V178 H70Z', '#7c4a1d', { line: '#2a1406', lw: 1.4 }) + K.line('M76 152 L92 158 M76 158 L92 152', '#7c4a1d', 1.6));
      // торс и туника
      s += K.vol('M60 84 C52 100 54 124 64 140 H136 C146 124 148 100 140 84 Q100 70 60 84Z', sk);
      s += K.line('M84 96 Q92 102 100 96 Q108 102 116 96 M90 110 H98 M102 110 H110 M100 98 V124', '#9a5a3a', 1.6, { op: 0.6 });
      s += K.vol('M64 122 H136 L140 146 Q100 154 60 146Z', { c1: '#c08a5a', c2: '#5a3412', rim: '#e4ffb0', tex: false, lw: 2.2, line: '#2a1406' });
      s += K.line('M62 124 Q100 132 138 124', '#3b1d0c', 5) + K.line('M62 124 Q100 132 138 124', '#fbbf24', 2.6);
      // лапы льва, завязанные на груди
      s += K.vol('M70 76 C80 82 90 90 96 96 C92 100 86 100 82 96 C76 90 70 84 66 80Z', lion) + K.vol('M130 76 C120 82 110 90 104 96 C108 100 114 100 118 96 C124 90 130 84 134 80Z', lion);
      s += `<circle cx="100" cy="96" r="5" fill="${K.lin(['#fde68a', '#a16207'])}" stroke="#4a2a04" stroke-width="1.4"/>` + K.line('M92 100 l-2 4 M95 101 v4 M105 101 v4 M108 100 l2 4', '#fff7d6', 1.6);
      // рука с дубиной
      s += K.line('M62 90 C52 104 50 116 52 126', '#5a2a12', 16) + K.line('M62 90 C52 104 50 116 52 126', skin, 12);
      s += K.vol('M46 128 C44 116 52 112 58 116 L66 172 C66 180 50 180 46 172 C42 164 50 160 46 150Z', { c1: '#b07a48', c2: '#4a2a10', rim: '#e4ffb0', tex: false, lw: 2.2, line: '#2a1406' });
      s += '<g fill="#7c4a1d" stroke="#2a1406" stroke-width="1">' + [[50, 140], [60, 150], [52, 162], [62, 168]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`).join('') + '</g>';
      s += K.vol(K.ell(53, 124, 8.4, 8), sk);
      // рука, держащая пианино
      s += K.line('M136 88 C144 80 146 70 142 60', '#5a2a12', 16) + K.line('M136 88 C144 80 146 70 142 60', skin, 12) + K.vol(K.ell(141, 60, 8.4, 8), sk);
      // голова в львиной шкуре: шкура спадает по бокам, сверху — львиная морда с гривой
      s += K.vol('M74 92 C66 76 68 54 78 42 L122 42 C132 54 134 76 126 92 C120 84 114 80 100 80 C86 80 80 84 74 92Z', lion);
      s += K.vol(K.ell(100, 70, 18, 19), sk);
      s += K.vol('M83 84 C84 92 92 96 100 96 C108 96 116 92 117 84 C110 88 106 88 100 88 C94 88 90 88 83 84Z', { c1: '#6b3e1e', c2: '#2a1406', tex: false, lw: 1.6, line: '#120802' });
      s += K.eyes(100, 68, 7.4, 5.6, { iris: '#7c4a1a', look: [0.4, 0] }) + K.line('M86 58 Q92 55 97 58 M103 58 Q108 55 114 58', '#2a1406', 2.4);
      s += K.mouth('grin', 100, 78, 11);
      let mane = '';
      for (let i = 0; i < 12; i++) { const a = (-200 + i * 20) * Math.PI / 180; mane += `<ellipse cx="${f(100 + 22 * Math.cos(a))}" cy="${f(38 + 18 * Math.sin(a))}" rx="9" ry="7" transform="rotate(${f(-200 + i * 20)} ${f(100 + 22 * Math.cos(a))} ${f(38 + 18 * Math.sin(a))})" fill="${K.lin(['#f59e0b', '#a16207'])}" stroke="#4a2a04" stroke-width="1.4"/>`; }
      s += mane;
      s += K.vol('M84 38 C84 26 92 20 100 20 C108 20 116 26 116 38 C116 48 110 56 100 56 C90 56 84 48 84 38Z', { ...lion, c1: '#fde68a' });
      s += K.mirror(K.part('M86 26 L84 16 L93 21Z', '#f59e0b', { line: '#4a2a04', lw: 1.2 }));
      s += K.closed(100, 36, 6, 3.4) + `<path d="M95 42 Q100 39 105 42 Q103 46 100 46 Q97 46 95 42Z" fill="#4a2a04"/>` + K.line('M100 46 V49 M96 50 Q100 52 104 50', '#4a2a04', 1.4) + `<path d="M92 54 l2.4 6 l2.4 -5 M108 54 l-2.4 6 l-2.4 -5" fill="#fff" stroke="#4a2a04" stroke-width=".9"/>`;
      s += K.spark(24, 50, 3, '#e4ffb0') + K.spark(26, 100, 2.6, '#fde68a', 'art-float') + K.spark(184, 110, 2.6, '#e4ffb0', 'art-float');
      return s;
    },

    // Персей: герой в крылатых сандалиях Гермеса. Летит над облаками: развевается синий плащ, на голове — крылатый
    // серебряный шлем, в одной руке — изогнутый меч-харпа, в другой — зеркальный щит Афины, в котором отражается кто-то
    // в тёмных очках и со змейками вместо волос. Сам он, на всякий случай, смотрит только в отражение
    gr_persey(K) {
      const skin = '#f6cfac', sk = { c1: skin, c2: '#d0946e', rim: '#eef0ff', tex: false, lw: 2.2, line: '#7a4030' };
      const wingW = (x, y, k, r) => K.g(K.g(`<path d="M0 0 C-6 -8 -16 -12 -26 -10 C-20 -6 -18 -4 -16 -1 C-22 0 -24 3 -24 6 C-16 4 -8 4 0 4Z" fill="${K.lin(['#ffffff', '#c7d2fe'])}" stroke="#3730a3" stroke-width="1.4" stroke-linejoin="round"/>` + K.line('M-4 1 L-20 -6 M-4 3 L-18 4', '#818cf8', 1), '', 'art-wing'), `translate(${x} ${y}) rotate(${r}) scale(${k})`);
      let s = K.aura('#a5b4fc', 100, 100, 0.45);
      // облака и ветер
      s += K.vol(grCloudD(20, 96, 176, 16), { c1: '#ffffff', c2: '#a5b4fc', rim: '#eef0ff', tex: false, lw: 2, line: '#4338ca' }) + K.vol(grCloudD(120, 184, 172, 14), { c1: '#ffffff', c2: '#a5b4fc', rim: '#eef0ff', tex: false, lw: 2, line: '#4338ca' });
      s += K.line('M6 70 H34 M10 98 H30 M164 150 H192', '#eef0ff', 2.4, { op: 0.5, cls: 'art-float' });
      // плащ
      s += K.vol('M88 84 C104 84 126 92 150 88 C166 86 176 92 186 98 C174 104 168 112 170 124 C156 116 142 116 128 122 C118 110 104 100 92 96Z', { c1: '#60a5fa', c2: '#1e3a8a', rim: '#eef0ff', tex: false, lw: 2.2, line: '#0b1640' });
      // ноги в полёте с крылатыми сандалиями
      const lb = 'M94 134 C90 146 92 154 104 160', lf = 'M108 134 C116 144 126 148 138 146';
      s += K.line(lb, '#7a4030', 10) + K.line(lb, skin, 7) + K.line(lf, '#7a4030', 10) + K.line(lf, skin, 7);
      s += K.part('M100 156 C106 154 112 158 112 164 H100Z', '#b45309', { line: '#451a03', lw: 1.4 }) + K.part('M136 140 C142 140 146 146 144 152 L134 150Z', '#b45309', { line: '#451a03', lw: 1.4 });
      s += wingW(104, 156, 0.7, -20) + wingW(136, 144, 0.7, -40);
      // туника
      const ch = 'M86 86 Q100 80 114 86 L120 134 Q100 142 80 134Z';
      s += K.vol(ch, { c1: '#ffffff', c2: '#a5b4fc', rim: '#fde68a', tex: false, lw: 2.2, line: '#312e81' });
      s += grClip(K, ch, `<rect x="74" y="124" width="52" height="14" fill="#1e3a8a"/>` + grKey(K, 80, 126, 40, 6, '#fcd34d', 1.2)) + K.line('M84 104 Q100 110 116 104', '#78350f', 4) + K.line('M84 104 Q100 110 116 104', '#fcd34d', 2);
      // рука с харпой
      s += K.line('M114 90 C126 84 134 74 138 62', '#7a4030', 8.4) + K.line('M114 90 C126 84 134 74 138 62', skin, 5.8);
      s += K.line('M140 60 L146 44', '#3b1d0c', 4) + K.line('M140 60 L146 44', '#b45309', 2.4);
      s += K.part('M146 46 L152 18 C160 16 168 22 166 30 C162 26 158 26 156 30 L150 48Z', '#e2e8f0', { line: '#334155', lw: 1.6 }) + K.line('M151 40 L155 22', '#fff', 1.2, { op: 0.8 });
      s += K.vol(K.ell(139, 62, 5.6, 5.8), sk);
      // зеркальный щит с отражением
      s += K.line('M86 92 C76 98 70 104 66 108', '#7a4030', 8.4) + K.line('M86 92 C76 98 70 104 66 108', skin, 5.8);
      s += K.vol(K.ell(52, 112, 27, 27), { c1: '#f8fafc', c2: '#64748b', rim: '#eef0ff', rimK: 0.7, tex: false, lw: 2.6, line: '#1e293b' });
      s += `<circle cx="52" cy="112" r="21" fill="${K.lin(['#e0f2fe', '#94a3b8', '#e2e8f0'], 0, 0, 1, 1)}" stroke="#fcd34d" stroke-width="2"/>`;
      s += `<g opacity=".8">` + K.line('M42 104 q-4 -4 -2 -8 M46 100 q-2 -6 2 -8 M52 99 v-8 M58 100 q2 -6 -2 -8 M62 104 q4 -4 2 -8', '#16a34a', 2) + `<circle cx="52" cy="110" r="9" fill="#86efac"/>` + `<rect x="45" y="106" width="6" height="4" rx="1.6" fill="#1e1b4b"/><rect x="53" y="106" width="6" height="4" rx="1.6" fill="#1e1b4b"/>` + K.line('M48 114 Q52 116 56 114', '#7c3aed', 1.2) + '</g>';
      s += `<path d="M36 100 L44 94 L40 104Z" fill="#fff" opacity=".7"/>`;
      // голова в крылатом шлеме
      s += K.vol(K.ell(100, 62, 18, 18), sk);
      for (const [x, y] of [[84, 66], [116, 66]]) s += K.vol(K.ell(x, y, 5.4, 6), { c1: '#a8703e', c2: '#4a2a10', tex: false, lw: 1.6, line: '#2a1406', rimK: 0.4 });
      s += wingW(82, 48, 0.85, 14) + K.g(wingW(0, 0, 0.85, 14), 'translate(118 48) scale(-1 1)');
      s += K.vol('M82 58 C80 42 90 34 100 34 C110 34 120 42 118 58 C112 54 106 52 100 52 C94 52 88 54 82 58Z', { c1: '#f1f5f9', c2: '#64748b', rim: '#eef0ff', tex: false, lw: 2, line: '#1e293b' });
      s += K.line('M100 36 V52', '#fcd34d', 2) + K.line('M83 56 Q100 50 117 56', '#fcd34d', 1.8);
      s += K.eyes(100, 64, 7, 5.4, { iris: '#1d4ed8', look: [-0.9, 0.3] });
      s += K.blush(89, 71, 3.2) + K.blush(111, 71, 3.2) + K.mouth('smile', 100, 72, 7);
      s += K.spark(24, 30, 3.2, '#eef0ff') + K.spark(176, 60, 3, '#fde68a', 'art-float') + K.spark(100, 14, 2.6, '#eef0ff');
      return s;
    },

    // Одиссей: хитроумный царь Итаки. Бородатый мореход в войлочной шапке-пилосе с красной полосой, синем плаще и тунике.
    // Стоит на носу корабля с нарисованным глазом, опирается на весло, а на плече у него — завязанный мешок Эола, из
    // которого так и рвутся ветры. Хитро подмигивает
    gr_odissey(K) {
      const skin = '#e8b08a', sk = { c1: skin, c2: '#b8784e', rim: '#c8f3ff', tex: false, lw: 2.2, line: '#5a2e14' };
      let s = K.aura('#38bdf8', 98, 100, 0.45);
      // весло
      s += K.line('M150 34 L134 168', '#3b1d0c', 5) + K.line('M150 34 L134 168', '#c98a4a', 3);
      s += K.g(K.part('M-7 -18 C-8 -6 -6 8 0 16 C6 8 8 -6 7 -18Z', '#c98a4a', { line: '#3b1d0c', lw: 1.6 }), 'translate(133 162) rotate(7)');
      // плащ
      s += K.vol('M74 84 C64 104 58 130 56 156 H144 C142 130 136 104 126 84Z', { c1: '#60a5fa', c2: '#1e3a5f', rim: '#c8f3ff', tex: false, lw: 2.2, line: '#0b1a30' });
      // туника и пояс
      const ch = 'M80 88 Q100 82 120 88 L126 140 Q100 148 74 140Z';
      s += K.vol(ch, { c1: '#f8fafc', c2: '#94a3b8', rim: '#c8f3ff', tex: false, lw: 2.2, line: '#334155' });
      s += K.line('M76 110 Q100 118 124 110', '#5a2e14', 5) + K.line('M76 110 Q100 118 124 110', '#d97706', 2.6) + `<circle cx="84" cy="88" r="4" fill="#fcd34d" stroke="#78350f" stroke-width="1.2"/>`;
      // корабль с глазом
      s += K.vol('M6 140 C4 126 10 112 22 104 C20 116 24 126 34 132 H186 C184 148 170 164 150 166 H44 C24 166 10 156 6 140Z', { c1: '#c08a5a', c2: '#4a2a10', rim: '#c8f3ff', tex: false, lw: 2.4, line: '#1a0e05' });
      s += K.line('M30 142 H184 M36 152 H176', '#3b1d0c', 1.4, { op: 0.6 });
      s += `<path d="M30 140 Q40 132 52 140 Q40 148 30 140Z" fill="#fff" stroke="#1a0e05" stroke-width="1.6"/><circle cx="41" cy="140" r="4" fill="#1d4ed8"/><circle cx="41" cy="140" r="1.8" fill="#0b1640"/>`;
      s += K.line('M22 104 C18 96 20 88 28 86', '#4a2a10', 5) + K.line('M22 104 C18 96 20 88 28 86', '#c08a5a', 3);
      // волны
      s += grWaves(K, 0, 200, 170, '#38bdf8', '#0c4a6e', 25);
      // мешок ветров на плече
      s += K.line('M80 94 C70 90 64 82 62 72', '#5a2e14', 8.4) + K.line('M80 94 C70 90 64 82 62 72', skin, 5.8);
      s += K.vol('M44 74 C38 60 46 46 60 44 C72 44 80 54 76 66 C74 74 66 80 56 80 C50 80 46 78 44 74Z', { c1: '#d9a066', c2: '#6b3a10', rim: '#c8f3ff', tex: false, lw: 2, line: '#2a1406' });
      s += K.line('M58 44 C56 38 60 34 64 36', '#94a3b8', 2.4) + `<g class="art-float">` + K.line('M64 32 C72 24 84 30 78 36 C74 40 70 36 72 32 M50 34 C42 28 34 34 40 38', '#eef0ff', 2, { op: 0.8 }) + '</g>';
      s += K.vol(K.ell(62, 72, 5.6, 5.6), sk);
      // голова: пилос с полосой, борода, подмигивает
      s += K.vol(K.ell(100, 62, 19, 19), sk);
      s += K.vol('M78 54 C78 38 88 24 100 20 C112 24 122 38 122 54 Q100 48 78 54Z', { c1: '#e8d2a8', c2: '#8a6a3a', rim: '#c8f3ff', tex: false, lw: 2, line: '#3b2a10' });
      s += K.line('M79 50 Q100 44 121 50', '#b91c1c', 3.4);
      s += K.vol('M80 64 C78 82 88 94 100 96 C112 94 122 82 120 64 C114 72 108 76 100 76 C92 76 86 72 80 64Z', { c1: '#8a5a30', c2: '#2a1406', tex: false, lw: 2, line: '#120802' });
      s += `<g class="art-eyes">${K.eye(93, 62, 5.6, { iris: '#0e7490', look: [0.4, 0.1] })}</g>` + K.line('M102 62 Q107 58 112 62', K.INK, 2.4);
      s += K.line('M88 54 Q93 51 98 54 M102 52 Q108 49 113 53', '#3b2412', 2) + K.mouth('smile', 100, 74, 9) + K.blush(112, 70, 3.4);
      s += K.spark(24, 30, 3, '#e0f2fe') + K.spark(180, 70, 2.8, '#fff', 'art-float') + K.spark(178, 110, 2.4, '#bae6fd');
      return s;
    },

    // Персефона: дочь Деметры и царица подземного мира. Платье и корона поделены надвое: слева — весна, нежная зелень и
    // цветы, справа — подземная ночь, тёмный бархат со звёздами и аметистами. В ладонях — надрезанный гранат,
    // у ног слева распускаются цветы, справа мерцают тёмные кристаллы
    gr_persefona(K) {
      const skin = '#f8dccc', sk = { c1: skin, c2: '#d8a08a', rim: '#e9d5ff', tex: false, lw: 2.2, line: '#7a4050' };
      const flower = (x, y, r, c) => `<g transform="translate(${x} ${y})">` + [0, 72, 144, 216, 288].map(a => `<ellipse cx="${f(r * 0.7 * Math.cos(a * Math.PI / 180))}" cy="${f(r * 0.7 * Math.sin(a * Math.PI / 180))}" rx="${f(r * 0.7)}" ry="${f(r * 0.5)}" transform="rotate(${a} ${f(r * 0.7 * Math.cos(a * Math.PI / 180))} ${f(r * 0.7 * Math.sin(a * Math.PI / 180))})" fill="${c}" stroke="${K.shade(c, -0.5)}" stroke-width=".8"/>`).join('') + `<circle r="${f(r * 0.35)}" fill="#fde047"/></g>`;
      const crystal = (x, y, h, a) => K.g(K.part(`M0 0 L-5 -${f(h * 0.7)} L0 -${h} L5 -${f(h * 0.7)}Z`, '#a855f7', { line: '#2e1065', lw: 1.4 }) + K.line(`M0 -${h} V0`, '#e9d5ff', 1, { op: 0.6 }), `translate(${x} ${y}) rotate(${a})`);
      let s = `<circle class="art-aura" cx="70" cy="104" r="80" fill="${K.rad([[0.25, '#84cc16', 0.4], [1, '#84cc16', 0]])}"/><circle class="art-aura" cx="130" cy="104" r="80" fill="${K.rad([[0.25, '#a855f7', 0.45], [1, '#a855f7', 0]])}"/>`;
      // волосы позади
      s += K.part('M82 46 C70 62 66 88 70 112 C72 126 66 136 60 142 C76 140 84 128 86 116 L114 116 C116 128 124 140 140 142 C134 136 128 126 130 112 C134 88 130 62 118 46 C110 36 90 36 82 46Z', '#4a2a3a', { line: '#1a0a12', lw: 1.8 });
      s += flower(72, 100, 6, '#f9a8d4') + flower(68, 122, 5, '#fde68a');
      // платье надвое: весна и подземная ночь
      const dress = 'M78 92 C70 116 66 144 64 170 H136 C134 144 130 116 122 92 Q100 84 78 92Z';
      s += grClip(K, 'M0 0 H100 V200 H0Z', K.vol(dress, { c1: '#ecfccb', c2: '#4d7c0f', rim: '#e9d5ff', tex: false, lw: 2.4, line: '#1a2e05' }) + flower(80, 130, 5, '#f9a8d4') + flower(90, 150, 4.4, '#fbcfe8') + flower(76, 160, 4, '#fde68a') + K.leaf(86, 110, 9, 60, '#65a30d'));
      s += grClip(K, 'M100 0 H200 V200 H100Z', K.vol(dress, { c1: '#7c3aed', c2: '#1e0b36', rim: '#e9d5ff', rimK: 0.6, texK: 0.7, lw: 2.4, line: '#0b0418' }) + K.spark(116, 130, 3, '#e9d5ff', '') + K.spark(110, 152, 2.4, '#fde68a', '') + K.spark(124, 160, 2, '#e9d5ff', ''));
      s += K.line('M100 90 V170', '#fcd34d', 1.6, { op: 0.8 }) + K.line('M78 98 Q100 106 122 98', '#78350f', 4.4) + K.line('M78 98 Q100 106 122 98', '#fcd34d', 2.4);
      // руки с гранатом
      s += K.line('M80 98 C76 110 80 118 90 120 M120 98 C124 110 120 118 110 120', '#7a4050', 8.4) + K.line('M80 98 C76 110 80 118 90 120 M120 98 C124 110 120 118 110 120', skin, 5.8);
      s += grPome(K, 100, 120, 11, true) + K.vol(K.ell(89, 124, 5.4, 5), sk) + K.vol(K.ell(111, 124, 5.4, 5), sk);
      // у ног: цветы и кристаллы
      s += flower(34, 170, 7, '#f9a8d4') + flower(52, 176, 6, '#fde68a') + flower(20, 178, 5, '#c4b5fd') + K.leaf(40, 178, 10, -60, '#65a30d');
      s += crystal(158, 178, 22, -10) + crystal(170, 178, 16, 14) + crystal(146, 178, 14, -24) + K.spark(176, 158, 2.6, '#e9d5ff');
      // голова и корона: цветы слева, кристаллы справа
      s += K.vol(K.ell(100, 62, 19, 19), sk);
      s += K.part('M81 62 C80 48 90 42 100 42 C110 42 120 48 119 62 C114 54 106 50 100 52 C94 50 86 54 81 62Z', '#4a2a3a', { line: '#1a0a12', lw: 1.6 });
      s += flower(84, 46, 5, '#f9a8d4') + flower(93, 41, 5, '#fde68a') + crystal(106, 44, 14, 6) + crystal(114, 48, 11, 24);
      s += K.eyes(100, 64, 7.4, 5.6, { iris: '#7c3aed', lid: 'half', skin, look: [0.1, 0.2] });
      s += K.blush(88, 71, 3.6) + K.blush(112, 71, 3.6) + K.mouth('smile', 100, 72, 7);
      s += K.spark(30, 40, 3, '#e4ffb0') + K.spark(172, 40, 3, '#e9d5ff', 'art-float') + K.spark(24, 120, 2.4, '#fde68a', 'art-float');
      return s;
    },

    // Аид (легенда): владыка подземного царства, брат Зевса и Посейдона. Высокий тёмный воротник-крылья, чёрная борода
    // с серебром, железная корона с аметистами, глаза горят лиловым огнём. В руке — двузубец, на другой ладони тает
    // шлем-невидимка (и сама ладонь становится прозрачной). У ног — сокровища недр: золотые монеты и самоцветы, а рядом
    // сидит маленький трёхголовый щенок. Позади колышется подземное лиловое пламя
    gr_aid(K) {
      const skin = '#d8d0e4', sk = { c1: skin, c2: '#8a7fa6', rim: '#e9d5ff', tex: false, lw: 2.4, line: '#2a2040' };
      const robe = { c1: '#5b4a8a', c2: '#0b0618', rim: '#e9d5ff', rimK: 0.6, texK: 0.75, lw: 2.4, line: '#05030c' };
      let s = K.aura('#a855f7', 100, 100, 0.6) + K.aura('#c084fc', 60, 64, 0.35);
      // подземное пламя позади
      for (const [x, h, d] of [[30, 70, -0.2], [52, 90, -0.8], [148, 90, -0.5], [170, 70, -1.1]]) s += K.flame(x, 176, h, h * 0.5, '#e9d5ff', '#7c3aed', { style: `animation-delay:${d}s` });
      // двузубец
      s += K.line('M152 34 V178', '#05030c', 6) + K.line('M152 34 V178', '#6b5a8a', 3.4);
      s += K.part('M140 14 L142 36 Q152 44 162 36 L164 14 L158 24 L157 34 Q152 36 147 34 L146 24Z', '#9ca3af', { line: '#1e1b2e', lw: 1.8 });
      s += `<circle class="art-blink" cx="140" cy="14" r="5" fill="${K.rad([[0, '#f5d0fe', 0.9], [1, '#a855f7', 0]])}"/><circle class="art-blink" cx="164" cy="14" r="5" fill="${K.rad([[0, '#f5d0fe', 0.9], [1, '#a855f7', 0]])}"/>`;
      // воротник-крылья и мантия
      s += K.vol('M100 76 C84 70 66 56 52 34 C56 52 54 64 46 72 C58 76 66 84 70 94Z', robe) + K.vol('M100 76 C116 70 134 56 148 34 C144 52 146 64 154 72 C142 76 134 84 130 94Z', robe);
      const gown = 'M72 86 C60 112 54 146 50 176 H150 C146 146 140 112 128 86 Q100 74 72 86Z';
      s += K.vol(gown, robe);
      s += grClip(K, gown, `<rect x="40" y="162" width="120" height="18" fill="#2e1065"/>` + grKey(K, 50, 165, 100, 8, '#c084fc', 1.4));
      s += K.line('M100 92 V172', '#a855f7', 2.4, { op: 0.7 }) + K.line('M86 96 C82 122 80 148 78 172 M114 96 C118 122 120 148 122 172', '#05030c', 1.6, { op: 0.5 });
      s += '<g fill="#c084fc">' + [[100, 110], [100, 130], [100, 150]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`).join('') + '</g>';
      // сокровища у ног
      s += '<g>' + [[118, 174], [126, 170], [134, 175], [122, 166]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="3" fill="${K.lin(['#fde68a', '#d4a017'])}" stroke="#78350f" stroke-width="1.1"/>`).join('') + '</g>';
      s += K.part('M136 176 L140 160 L146 152 L150 162 L148 176Z', '#a855f7', { line: '#2e1065', lw: 1.4 }) + K.part('M148 176 L152 166 L158 162 L160 170 L158 178Z', '#38bdf8', { line: '#0c4a6e', lw: 1.4 }) + K.spark(146, 158, 2.4, '#fff', 'art-blink');
      // трёхголовый щенок
      const ph = (x, y, r) => `<path d="M${f(x - r * 0.8)} ${f(y - r * 0.3)} L${f(x - r * 0.9)} ${f(y - r * 1.2)} L${f(x - r * 0.2)} ${f(y - r * 0.8)}Z M${f(x + r * 0.8)} ${f(y - r * 0.3)} L${f(x + r * 0.9)} ${f(y - r * 1.2)} L${f(x + r * 0.2)} ${f(y - r * 0.8)}Z" fill="#3a2419" stroke="#0f0805" stroke-width="1.2" stroke-linejoin="round"/>` +
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${K.lin(['#7a5442', '#2a1810'])}" stroke="#0f0805" stroke-width="1.4"/><ellipse cx="${x}" cy="${f(y + r * 0.4)}" rx="${f(r * 0.5)}" ry="${f(r * 0.34)}" fill="#c49a7a"/><circle cx="${f(x - r * 0.36)}" cy="${f(y - r * 0.1)}" r="${f(r * 0.17)}" fill="#ffb020"/><circle cx="${f(x + r * 0.36)}" cy="${f(y - r * 0.1)}" r="${f(r * 0.17)}" fill="#ffb020"/><ellipse cx="${x}" cy="${f(y + r * 0.26)}" rx="${f(r * 0.16)}" ry="${f(r * 0.1)}" fill="#0f0805"/>`;
      s += `<ellipse cx="50" cy="168" rx="16" ry="9" fill="${K.lin(['#5a3a2c', '#1f120c'])}" stroke="#0f0805" stroke-width="1.6"/>` + ph(38, 152, 7) + ph(62, 152, 7) + ph(50, 146, 8.4) + K.line('M66 168 C72 166 74 160 72 156', '#2a1810', 3);
      // рука со шлемом-невидимкой
      s += K.line('M74 94 C64 104 60 114 60 122', '#05030c', 11) + K.line('M74 94 C64 104 60 114 60 122', '#3b2a5e', 7.4);
      s += `<g opacity=".55">` + K.vol(K.ell(60, 126, 6, 6), sk) + `</g>`;
      s += `<g class="art-blink" opacity=".75">` + K.vol('M44 112 C42 96 50 88 60 88 C70 88 78 96 76 112 L74 120 C70 122 66 120 64 116 L60 110 L56 116 C54 120 50 122 46 120Z', { c1: '#c4b5fd', c2: '#312e81', rim: '#f5d0fe', tex: false, lw: 1.8, line: '#1e1b4b' }) + K.part('M52 88 C52 80 60 76 66 80 C62 82 60 86 60 88Z', '#a855f7', { line: '#1e1b4b', lw: 1.2 }) + '</g>';
      s += K.spark(46, 96, 2.6, '#fff', 'art-blink') + K.spark(74, 104, 2.2, '#f5d0fe', 'art-blink');
      // рука с двузубцем
      s += K.line('M126 94 C136 98 144 100 148 102', '#05030c', 11) + K.line('M126 94 C136 98 144 100 148 102', '#3b2a5e', 7.4) + K.vol(K.ell(151, 102, 6.4, 6.6), sk);
      // голова: волосы, корона, борода, глаза-огни
      s += K.vol(K.ell(100, 62, 20, 21), sk);
      s += K.part('M80 62 C78 46 88 38 100 38 C112 38 122 46 120 62 C114 54 106 50 100 52 C94 50 86 54 80 62Z', '#1a1428', { line: '#05030c', lw: 1.6 });
      s += K.vol('M78 66 C74 86 82 104 94 112 L100 120 L106 112 C118 104 126 86 122 66 C116 76 108 80 100 80 C92 80 84 76 78 66Z', { c1: '#3a3050', c2: '#0b0618', tex: false, lw: 2.2, line: '#05030c' });
      s += K.line('M88 84 q-2 10 2 18 M100 86 v22 M112 84 q2 10 -2 18', '#94a3b8', 1.4, { op: 0.8 });
      s += K.vol('M80 44 L78 26 L86 34 L92 20 L100 32 L108 20 L114 34 L122 26 L120 44 Q100 38 80 44Z', { c1: '#9ca3af', c2: '#1f2937', rim: '#e9d5ff', tex: false, lw: 1.8, line: '#05030c' });
      s += `<circle cx="100" cy="38" r="3.4" fill="#a855f7" stroke="#2e1065" stroke-width="1.2"/><circle cx="88" cy="39" r="2.2" fill="#c084fc"/><circle cx="112" cy="39" r="2.2" fill="#c084fc"/>`;
      s += K.glow(92, 62, 4.4, 3.6, '#c084fc') + K.glow(108, 62, 4.4, 3.6, '#c084fc') + K.line('M84 54 L96 58 M116 54 L104 58', '#05030c', 2.6);
      s += K.spark(22, 30, 3.4, '#e9d5ff') + K.spark(180, 120, 3, '#c084fc', 'art-float') + K.spark(100, 10, 2.6, '#f5d0fe');
      return s;
    },

    // Гея (легенда): Мать-Земля, прародительница богов и титанов. Её волосы — пышная крона из листвы с цветами, а сама
    // она по пояс поднимается из зелёного холма, где растут деревца, цветы и бежит ручей. Добрая улыбка, венок из
    // цветов, на плече сидит птичка, в ладонях светится первый росток — так она чувствует каждую травинку в асфальте
    gr_geya(K) {
      const skin = '#eeb88e', sk = { c1: skin, c2: '#b8784e', rim: '#fff0c0', tex: false, lw: 2.4, line: '#5a2e14' };
      const flower = (x, y, r, c) => `<g transform="translate(${x} ${y})">` + [0, 72, 144, 216, 288].map(a => `<circle cx="${f(r * 0.62 * Math.cos(a * Math.PI / 180))}" cy="${f(r * 0.62 * Math.sin(a * Math.PI / 180))}" r="${f(r * 0.48)}" fill="${c}" stroke="${K.shade(c, -0.5)}" stroke-width=".8"/>`).join('') + `<circle r="${f(r * 0.34)}" fill="#fde047"/></g>`;
      let s = K.aura('#84cc16', 100, 100, 0.6) + K.aura('#fde68a', 60, 70, 0.3);
      // крона-волосы
      s += K.vol(grFluffD(100, 72, 74, 58, 16, 0), { c1: '#a3e635', c2: '#1a4d0a', rim: '#e4ffb0', rimK: 0.6, texK: 0.25, lw: 2.4, line: '#0f2a05' });
      s += grCurls(K, [[46, 60, 5], [70, 34, 5], [130, 34, 5], [154, 60, 5], [40, 96, 5], [160, 96, 5]], '#14532d', 1.6);
      s += flower(54, 44, 6, '#f9a8d4') + flower(146, 44, 6, '#fde68a') + flower(36, 80, 5, '#c4b5fd') + flower(164, 80, 5, '#f9a8d4') + flower(100, 18, 6, '#fb7185') + flower(72, 24, 4.4, '#fde68a') + flower(128, 24, 4.4, '#c4b5fd');
      // торс в платье из коры и листьев
      s += K.vol('M72 88 C64 104 62 124 66 140 H134 C138 124 136 104 128 88 Q100 78 72 88Z', { c1: '#a3734a', c2: '#3f2a14', rim: '#e4ffb0', tex: false, lw: 2.4, line: '#1a0e05' });
      s += K.leaf(80, 100, 14, 30, '#65a30d') + K.leaf(120, 100, 14, 150, '#65a30d') + K.leaf(100, 112, 12, 90, '#84cc16');
      // холм с деревцами, цветами и ручьём
      const hill = 'M0 182 C10 150 50 132 100 132 C150 132 190 150 200 182Z';
      s += K.vol(hill, { c1: '#bef264', c2: '#3f6212', rim: '#e4ffb0', rimK: 0.55, texK: 0.2, lw: 2.4, line: '#1a2e05' });
      s += grClip(K, hill, K.line('M120 132 C110 146 130 156 116 168 C108 174 112 180 104 186', '#38bdf8', 5) + K.line('M120 132 C110 146 130 156 116 168 C108 174 112 180 104 186', '#bae6fd', 2));
      for (const [x, y, r] of [[30, 160, 9], [170, 158, 10], [56, 146, 7]]) s += K.line(`M${x} ${y + r} v8`, '#5a3412', 3) + K.vol(K.ell(x, y, r, r), { c1: '#86efac', c2: '#166534', rim: '#e4ffb0', tex: false, lw: 1.8, line: '#052e16' });
      s += flower(80, 160, 4.4, '#f9a8d4') + flower(92, 172, 4, '#fde68a') + flower(146, 168, 4.4, '#c4b5fd') + flower(42, 176, 3.6, '#fb7185');
      // руки с ростком
      s += K.line('M74 94 C68 108 72 120 86 124 M126 94 C132 108 128 120 114 124', '#5a2e14', 10) + K.line('M74 94 C68 108 72 120 86 124 M126 94 C132 108 128 120 114 124', skin, 7);
      s += `<circle class="art-aura" cx="100" cy="114" r="18" fill="${K.rad([[0, '#fefce8', 0.95], [0.5, '#bef264', 0.5], [1, '#84cc16', 0]])}"/>`;
      s += K.line('M100 124 C100 116 98 110 100 104', '#3f6212', 2.4) + K.leaf(100, 108, 10, -150, '#84cc16') + K.leaf(100, 106, 10, -30, '#65a30d');
      s += K.vol(K.ell(88, 124, 7, 6), sk) + K.vol(K.ell(112, 124, 7, 6), sk);
      // птичка на плече
      s += K.g(K.vol(K.ell(0, 0, 8, 6.4), { c1: '#7dd3fc', c2: '#1d4ed8', rim: '#e4ffb0', tex: false, lw: 1.6, line: '#0c1f5c' }) + `<circle cx="-3" cy="-2" r="1.4" fill="${K.INK}"/><path d="M-8 -1 L-12 0 L-8 1.4Z" fill="#fb923c"/>` + K.part('M2 -2 C6 -6 10 -4 10 0 C8 2 4 2 2 1Z', '#38bdf8', { line: '#0c1f5c', lw: 1 }), 'translate(128 84)');
      // голова и венок
      s += K.vol(K.ell(100, 64, 21, 21), sk);
      s += K.part('M79 62 C78 46 88 40 100 40 C112 40 122 46 121 62 C116 52 108 48 100 50 C92 48 84 52 79 62Z', '#3f6212', { line: '#0f2a05', lw: 1.6 });
      s += flower(84, 46, 5, '#f9a8d4') + flower(94, 41, 5, '#fde68a') + flower(106, 41, 5, '#fb7185') + flower(116, 46, 5, '#c4b5fd');
      s += K.eyes(100, 66, 8, 6, { iris: '#65a30d', lid: 'half', skin, look: [0, 0.3] });
      s += K.blush(86, 74, 4) + K.blush(114, 74, 4) + K.mouth('smile', 100, 76, 9);
      const bfly = (x, y, c) => `<g transform="translate(${x} ${y})">` + K.part('M0 0 C-4 -9 -12 -9 -11 -2 C-10 2 -4 2 0 0Z M0 0 C4 -9 12 -9 11 -2 C10 2 4 2 0 0Z', c, { line: K.shade(c, -0.55), lw: 1 }) +
        K.part('M0 0 C-3 5 -8 7 -8 3 C-8 1 -4 0 0 0Z M0 0 C3 5 8 7 8 3 C8 1 4 0 0 0Z', K.shade(c, -0.15), { line: K.shade(c, -0.55), lw: 1 }) + K.line('M0 -3 V4 M0 -3 l-2 -4 M0 -3 l2 -4', '#3b1d0c', 1.1) + '</g>';
      s += `<g class="art-float">${bfly(172, 118, '#f9a8d4')}</g><g class="art-float" style="animation-delay:-1.2s">${bfly(28, 118, '#fde68a')}</g>`;
      s += K.spark(20, 30, 3, '#fde68a') + K.spark(180, 30, 3, '#e4ffb0', 'art-float') + K.spark(186, 136, 2.6, '#fde68a');
      return s;
    },

    // Уран (легенда): первозданное Небо, муж Геи и дед Зевса. За спиной раскинут небесный свод: слева — день с солнцем
    // и облаками, справа — ночь с месяцем и созвездиями. Волосы и борода — белые облака, на голове — венец из звёзд,
    // глаза светятся. В ладонях — сияющая небесная сфера с кольцами, внизу вьются ветра и облака
    gr_uran(K) {
      const skin = '#f1e4d6', sk = { c1: skin, c2: '#b8a0a0', rim: '#eef0ff', tex: false, lw: 2.4, line: '#4a3a5a' };
      const cloud = { c1: '#ffffff', c2: '#a5b4fc', rim: '#eef0ff', rimK: 0.6, tex: false, lw: 2.2, line: '#4338ca' };
      let s = K.aura('#a5b4fc', 100, 100, 0.6);
      // небесный свод: день и ночь
      const dome = 'M14 150 C14 84 52 30 100 30 C148 30 186 84 186 150Z';
      s += `<path d="${dome}" fill="${K.lin(['#bae6fd', '#60a5fa', '#312e81', '#0b0a2a'], 0, 0, 1, 0)}" stroke="#1e1b4b" stroke-width="2.4"/>`;
      s += grClip(K, dome, K.vol(grCloudD(20, 70, 120, 14), { ...cloud, lw: 1.6 }) + K.vol(grCloudD(36, 80, 72, 10), { ...cloud, lw: 1.4 }) + grConst(K, [[128, 56, 2.6], [146, 50], [160, 62, 2.8], [170, 84], [150, 96, 2.4]], '#fef9c3', 0.6) + K.spark(122, 98, 2.4, '#fff', 'art-blink') + K.spark(176, 118, 2, '#fff', 'art-blink'));
      s += `<circle class="art-aura" cx="46" cy="96" r="16" fill="${K.rad([[0, '#fff7c2', 0.9], [1, '#fbbf24', 0]])}"/><circle cx="46" cy="96" r="9" fill="${K.lin(['#fff7c2', '#fbbf24'])}" stroke="#b45309" stroke-width="1.6"/>`;
      s += grMoon(K, 154, 100, 11, 5, -3, '#fef3c7', '#fbbf24');
      // одеяние: от дня к ночи
      const robe = 'M72 88 C62 114 58 146 56 172 H144 C142 146 138 114 128 88 Q100 78 72 88Z';
      s += K.vol(robe, { c1: '#93c5fd', c2: '#1e1b4b', rim: '#fde68a', rimK: 0.5, texK: 0.3, lw: 2.4, line: '#0b0a2a' });
      s += grClip(K, robe, K.spark(80, 140, 2.6, '#fef9c3', '') + K.spark(118, 152, 2.4, '#fef9c3', '') + K.spark(96, 162, 2, '#fff', '') + K.spark(128, 128, 2, '#fff', ''));
      s += K.line('M74 96 Q100 104 126 96', '#78350f', 4.4) + K.line('M74 96 Q100 104 126 96', '#fde68a', 2.4);
      // облака и ветра внизу
      s += K.vol(grCloudD(16, 90, 178, 16), cloud) + K.vol(grCloudD(110, 186, 178, 16), cloud);
      s += K.line('M8 140 C18 130 32 136 28 144 M172 138 C182 128 196 134 192 142', '#eef0ff', 2, { op: 0.7, cls: 'art-float' });
      // руки и небесная сфера
      s += K.line('M74 96 C66 108 70 120 84 126 M126 96 C134 108 130 120 116 126', '#0b0a2a', 11) + K.line('M74 96 C66 108 70 120 84 126 M126 96 C134 108 130 120 116 126', '#4f46e5', 7.4);
      s += `<circle class="art-aura" cx="100" cy="118" r="22" fill="${K.rad([[0, '#fffbe6', 0.9], [0.5, '#fde68a', 0.5], [1, '#fde68a', 0]])}"/>`;
      s += `<circle cx="100" cy="118" r="12" fill="${K.rad([[0, '#e0f2fe'], [1, '#3b82f6']], 0.35, 0.3, 0.8)}" stroke="#1e3a8a" stroke-width="1.6"/>` + K.line('M88 118 H112 M100 106 V130', '#bfdbfe', 1, { op: 0.8 });
      s += `<g class="art-spin-soft"><ellipse cx="100" cy="118" rx="20" ry="7" fill="none" stroke="#fcd34d" stroke-width="2.6" transform="rotate(-20 100 118)"/><ellipse cx="100" cy="118" rx="7" ry="20" fill="none" stroke="#fde68a" stroke-width="2" transform="rotate(-20 100 118)"/></g>`;
      s += K.vol(K.ell(86, 126, 6.4, 6), sk) + K.vol(K.ell(114, 126, 6.4, 6), sk);
      // голова: облачные волосы и борода, звёздный венец
      s += K.vol(grFluffD(100, 56, 30, 26, 12, 0), cloud);
      s += K.vol(K.ell(100, 62, 19, 20), sk);
      s += K.vol('M80 66 C76 86 86 102 100 106 C114 102 124 86 120 66 C114 76 108 80 100 80 C92 80 86 76 80 66Z', { ...cloud, shadeK: 0.3 });
      s += K.vol(grFluffD(100, 76, 12, 4, 8, 0), { ...cloud, lw: 1.4 });
      s += K.part('M82 56 C82 46 90 42 100 42 C110 42 118 46 118 56 C112 50 106 48 100 50 C94 48 88 50 82 56Z', '#f8fafc', { line: '#6366f1', lw: 1.4 });
      for (const [x, y, r] of [[82, 34, 4.4], [91, 28, 5], [100, 25, 6], [109, 28, 5], [118, 34, 4.4]]) s += grStar(x, y, r, '#fde68a', '#92400e', 'art-blink');
      s += K.glow(92, 64, 4, 3.6, '#e0f2fe') + K.glow(108, 64, 4, 3.6, '#e0f2fe');
      s += K.spark(20, 24, 3, '#fde68a') + K.spark(184, 24, 3, '#e0f2fe', 'art-float') + K.spark(100, 12, 2.6, '#fff');
      return s;
    },
  });
})();
