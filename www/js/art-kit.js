'use strict';
/* 4.6: набор кисти для духов «сказочной Нави».
   Каждый дух рисуется своей функцией в js/sp-*.js: SPIRIT_ART[id] = K => '...svg внутри viewBox 0 0 200 200...'.
   Земля — y≈178, центр — x=100. Свет — сверху слева (тёплый), лунный ободок — справа снизу (холодный, цвета стихии).
   K собирает <defs> сам: всё, что нужно из градиентов и масок, создают функции ниже. Идентификаторы — через K.id(),
   в них стоит __ID__ — Art подменяет его на уникальный номер для каждого рисунка. */

const SPIRIT_ART = {};

const ArtKit = (() => {
  const f = n => (Math.round(n * 100) / 100).toString();
  function shade(hex, amt) { // amt < 0 — темнее, > 0 — светлее
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  const mix = (a, b, t) => {
    const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    const c = [16, 8, 0].map(s => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t));
    return '#' + ((1 << 24) + (c[0] << 16) + (c[1] << 8) + c[2]).toString(16).slice(1);
  };
  const INK = '#1b1030';
  // стихии: цвет ободка (лунный свет с оттенком стихии) и фактура тела
  const EL = {
    fire: { rim: '#ffe29a', glow: '#ff9a3d' },
    water: { rim: '#c8f3ff', glow: '#38bdf8' },
    forest: { rim: '#e4ffb0', glow: '#84cc16' },
    wind: { rim: '#eef0ff', glow: '#a5b4fc' },
    current: { rim: '#fff6b0', glow: '#facc15' },
    shadow: { rim: '#e9d5ff', glow: '#c084fc' },
  };
  const TEX = {
    fire: ['30', '<circle cx="6" cy="8" r="1.4" fill="#fff3b0"/><circle cx="21" cy="19" r="1" fill="#fde68a"/><path d="M14 28c-2-4 2-5 0-9 3 2 3 6 0 9z" fill="#fff3b0" opacity=".7"/>', 0.35],
    water: ['34', '<path d="M0 10q8.5-5 17 0t17 0M0 27q8.5-5 17 0t17 0" fill="none" stroke="#fff" stroke-width="1.3"/><circle cx="26" cy="18" r="2" fill="none" stroke="#fff" stroke-width=".9"/>', 0.2],
    forest: ['32', '<path d="M6 22q4-10 12-10-2 8-12 10zM6 22l7-6" fill="#14532d" stroke="#14532d" stroke-width=".8"/><circle cx="24" cy="8" r="1.8" fill="#14532d"/><circle cx="27" cy="26" r="1.2" fill="#14532d"/>', 0.18],
    wind: ['38', '<path d="M2 12q10-6 18 0 5 4 1 7-4 2-5-2M18 30q8-5 16 0" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>', 0.24],
    current: ['30', '<path d="M4 6l6 5-4 3 7 6M20 18l5 4-3 2 5 4" fill="none" stroke="#fffbe6" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/>', 0.28],
    shadow: ['36', '<circle cx="5" cy="7" r=".9" fill="#fff"/><circle cx="23" cy="13" r=".6" fill="#fff"/><circle cx="14" cy="28" r=".8" fill="#fff"/><circle cx="31" cy="30" r=".5" fill="#fff"/><path d="M29 4l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="#e9d5ff"/>', 0.7],
  };

  // K — кисть для одного рисунка
  function make(sp) {
    const defs = [], el = sp.el, E = EL[el] || EL.wind;
    let n = 0, texId = '';
    const id = (name = 'x') => `__ID__${name}${++n}`;
    const K = {
      sp, el, E, INK, f, shade, mix, defs,
      id,
      def(s) { defs.push(s); return K; },
      // линейный градиент: цвета сверху вниз (или по вектору), возвращает url(#…)
      lin(stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) {
        const i = id('l');
        defs.push(`<linearGradient id="${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map((c, k) => `<stop offset="${f(k / (stops.length - 1))}" stop-color="${c}"/>`).join('')}</linearGradient>`);
        return `url(#${i})`;
      },
      // радиальный градиент: [[offset, цвет, прозрачность], …]
      rad(stops, cx = 0.5, cy = 0.5, r = 0.5) {
        const i = id('r');
        defs.push(`<radialGradient id="${i}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`);
        return `url(#${i})`;
      },
      // объёмная фигура: заливка со светом сверху слева, тень снизу, фактура стихии, лунный ободок справа, мягкий свет, обводка.
      // o: { c1 светлый, c2 основной/тёмный, rim, tex: true|false, line: цвет обводки, lw: толщина, shadeK: сила тени 0…1, cls, t: transform }
      vol(d, o = {}) {
        const c1 = o.c1 || '#ffffff', c2 = o.c2 || shade(c1, -0.35), line = o.line || shade(c2, -0.55), lw = o.lw == null ? 3 : o.lw;
        const rim = o.rim || E.rim, k = id('v');
        defs.push(`<radialGradient id="${k}f" cx=".34" cy=".26" r=".9"><stop offset="0" stop-color="${shade(c1, 0.25)}"/><stop offset=".45" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>` +
          `<radialGradient id="${k}s" cx=".5" cy="1" r=".7"><stop offset="0" stop-color="${shade(c2, -0.55)}" stop-opacity="${o.shadeK == null ? 0.6 : o.shadeK}"/><stop offset="1" stop-color="${shade(c2, -0.55)}" stop-opacity="0"/></radialGradient>` +
          `<clipPath id="${k}c"><path d="${d}"/></clipPath>` +
          `<mask id="${k}r" maskUnits="userSpaceOnUse" x="-20" y="-20" width="240" height="240"><path d="${d}" fill="#fff"/><path d="${d}" fill="#000" transform="translate(-6 -5)"/></mask>` +
          `<mask id="${k}l" maskUnits="userSpaceOnUse" x="-20" y="-20" width="240" height="240"><path d="${d}" fill="#fff"/><path d="${d}" fill="#000" transform="translate(5 7)"/></mask>`);
        let s = `<g${o.cls ? ` class="${o.cls}"` : ''}${o.t ? ` transform="${o.t}"` : ''}><path d="${d}" fill="url(#${k}f)"/>`;
        if (o.tex !== false && TEX[el]) {
          if (!texId) { texId = id('t'); defs.push(`<pattern id="${texId}" width="${TEX[el][0]}" height="${TEX[el][0]}" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">${TEX[el][1]}</pattern>`); }
          s += `<rect clip-path="url(#${k}c)" x="-20" y="-20" width="240" height="240" fill="url(#${texId})" opacity="${o.texK == null ? TEX[el][2] : o.texK}"/>`;
        }
        s += `<rect clip-path="url(#${k}c)" x="-20" y="-20" width="240" height="240" fill="url(#${k}s)"/>` +
          `<rect mask="url(#${k}r)" x="-20" y="-20" width="240" height="240" fill="${rim}" opacity="${o.rimK == null ? 0.6 : o.rimK}"/>` +
          `<rect mask="url(#${k}l)" x="-20" y="-20" width="240" height="240" fill="#fff" opacity="${o.hiK == null ? 0.22 : o.hiK}"/>`;
        if (lw) s += `<path d="${d}" fill="none" stroke="${line}" stroke-width="${lw}" stroke-linejoin="round" stroke-linecap="round"/>`;
        return s + '</g>';
      },
      // плоская деталь с лёгким объёмом (градиент сверху вниз) и обводкой
      part(d, c, o = {}) {
        const fill = o.flat ? c : K.lin([shade(c, 0.3), c, shade(c, -0.3)], 0, 0, 0.3, 1);
        return `<path${o.cls ? ` class="${o.cls}"` : ''} d="${d}" fill="${fill}"${o.lw === 0 ? '' : ` stroke="${o.line || shade(c, -0.55)}" stroke-width="${o.lw || 2}" stroke-linejoin="round" stroke-linecap="round"`}${o.op ? ` opacity="${o.op}"` : ''}/>`;
      },
      // линия (прядь, ус, стебель, ветка)
      line(d, c, w = 3, o = {}) {
        return `<path${o.cls ? ` class="${o.cls}"` : ''} d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o.op ? ` opacity="${o.op}"` : ''}/>`;
      },
      // блик-капля на теле
      gloss(x, y, rx = 10, ry = 6, rot = -35, a = 0.5) {
        return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="#fff" opacity="${a}"/><circle cx="${f(x + rx * 1.1)}" cy="${f(y - ry * 0.9)}" r="${f(Math.max(1.5, ry * 0.35))}" fill="#fff" opacity="${f(a + 0.15)}"/>`;
      },
      // глаз: o.iris — цвет радужки, o.look — [dx, dy] взгляд (-1…1), o.lid: 'half' | 'angry' | 'sad' | 'wide', o.lash — ресницы
      eye(x, y, r, o = {}) {
        const iris = o.iris || '#5b3a1a', [lx, ly] = o.look || [0.12, 0.12], ix = x + r * 0.28 * lx, iy = y + r * 0.3 * ly;
        let s = `<ellipse cx="${x}" cy="${y}" rx="${f(r * 0.86)}" ry="${f(r * 1.04)}" fill="#fff" stroke="${INK}" stroke-width="${f(Math.max(1.3, r * 0.14))}"/>` +
          `<ellipse cx="${f(ix)}" cy="${f(iy)}" rx="${f(r * 0.6)}" ry="${f(r * 0.72)}" fill="${K.rad([[0, shade(iris, 0.35)], [0.6, iris], [1, shade(iris, -0.45)]], 0.5, 0.65, 0.6)}"/>` +
          `<ellipse cx="${f(ix)}" cy="${f(iy + r * 0.05)}" rx="${f(r * 0.3)}" ry="${f(r * 0.4)}" fill="${INK}"/>` +
          `<path d="M${f(x - r * 0.8)} ${f(y - r * 0.25)} Q${x} ${f(y - r * 1.15)} ${f(x + r * 0.8)} ${f(y - r * 0.25)} Q${x} ${f(y - r * 0.65)} ${f(x - r * 0.8)} ${f(y - r * 0.25)}Z" fill="${INK}" opacity=".16"/>` +
          `<circle cx="${f(ix - r * 0.25)}" cy="${f(iy - r * 0.3)}" r="${f(r * 0.28)}" fill="#fff"/><circle cx="${f(ix + r * 0.28)}" cy="${f(iy + r * 0.36)}" r="${f(r * 0.13)}" fill="#fff" opacity=".9"/>`;
        if (o.lid === 'half') s += `<path d="M${f(x - r * 0.95)} ${f(y - r * 0.05)} Q${x} ${f(y - r * 1.4)} ${f(x + r * 0.95)} ${f(y - r * 0.05)}Z" fill="${o.skin || '#000'}" opacity="${o.skin ? 1 : 0.35}"/><path d="M${f(x - r * 0.95)} ${f(y - r * 0.05)} Q${x} ${f(y - r * 0.3)} ${f(x + r * 0.95)} ${f(y - r * 0.05)}" stroke="${INK}" stroke-width="${f(r * 0.18)}" fill="none" stroke-linecap="round"/>`;
        if (o.lid === 'angry') s += `<path d="M${f(x - r * 1.05)} ${f(y - r * 1.2)} L${f(x + r * 1.05)} ${f(y - r * 0.25)} L${f(x + r * 1.05)} ${f(y - r * 1.4)}Z" fill="${o.skin || INK}"/><path d="M${f(x - r * 1.05)} ${f(y - r * 1.2)} L${f(x + r * 1.05)} ${f(y - r * 0.25)}" stroke="${INK}" stroke-width="${f(r * 0.24)}" stroke-linecap="round"/>`;
        if (o.lid === 'sad') s += `<path d="M${f(x - r * 1.05)} ${f(y - r * 0.3)} L${f(x + r * 1.05)} ${f(y - r * 1.2)} L${f(x - r * 1.05)} ${f(y - r * 1.4)}Z" fill="${o.skin || INK}"/><path d="M${f(x - r * 1.05)} ${f(y - r * 0.3)} L${f(x + r * 1.05)} ${f(y - r * 1.2)}" stroke="${INK}" stroke-width="${f(r * 0.2)}" stroke-linecap="round"/>`;
        if (o.lash) s += `<path d="M${f(x + r * 0.55)} ${f(y - r * 0.8)} l${f(r * 0.45)} ${f(-r * 0.35)} M${f(x + r * 0.78)} ${f(y - r * 0.45)} l${f(r * 0.48)} ${f(-r * 0.12)}" stroke="${INK}" stroke-width="${f(r * 0.16)}" stroke-linecap="round"/>`;
        return s;
      },
      // пара глаз: cx — середина, dx — половина расстояния; o.mirrorLook — зрачки смотрят к центру
      // брови: 'angry' — к переносице вниз, 'sad' — домиком; правый глаз получает зеркальную бровь
      eyes(cx, y, dx, r, o = {}) {
        const flip = { angry: 'sad', sad: 'angry' }[o.lid];
        const s = K.eye(cx - dx, y, r, o) + K.eye(cx + dx, y, r, flip ? { ...o, lid: flip } : o);
        return `<g class="art-eyes">${s}</g>`;
      },
      // закрытые глаза-дуги (спит, блаженствует) — o.up: улыбающиеся дуги
      closed(cx, y, dx, r, up = false) {
        const one = x => `<path d="M${f(x - r * 0.9)} ${y} Q${x} ${f(y + (up ? -r : r) * 0.85)} ${f(x + r * 0.9)} ${y}" stroke="${INK}" stroke-width="${f(Math.max(2.4, r * 0.3))}" fill="none" stroke-linecap="round"/>`;
        return one(cx - dx) + one(cx + dx);
      },
      // светящиеся глаза без зрачков (духи тьмы, призраки)
      glow(x, y, rx, ry, c) {
        const g = K.rad([[0, '#fff'], [0.35, c], [1, c, 0]]);
        return `<ellipse class="art-blink" cx="${x}" cy="${y}" rx="${f(rx * 2.2)}" ry="${f(ry * 2.4)}" fill="${g}" opacity=".6"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}"/><ellipse cx="${x}" cy="${f(y - ry * 0.15)}" rx="${f(rx * 0.5)}" ry="${f(ry * 0.45)}" fill="#fff"/>`;
      },
      // рот: 'smile' | 'grin' | 'o' | 'cat' | 'teeth' | 'fang' | 'flat' | 'open' | 'frown'
      mouth(type, x, y, w = 12) {
        const h = w * 0.5;
        switch (type) {
          case 'smile': return `<path d="M${f(x - w / 2)} ${y} Q${x} ${f(y + h * 1.1)} ${f(x + w / 2)} ${y}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
          case 'grin': return `<path d="M${f(x - w / 2)} ${y} Q${x} ${f(y + h * 1.6)} ${f(x + w / 2)} ${y}Z" fill="#6b1d2a" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M${f(x - w * 0.25)} ${f(y + h * 0.8)} Q${x} ${f(y + h * 0.35)} ${f(x + w * 0.25)} ${f(y + h * 0.8)}" fill="#f47a8f"/>`;
          case 'open': return `<ellipse cx="${x}" cy="${f(y + h * 0.5)}" rx="${f(w * 0.32)}" ry="${f(h * 0.8)}" fill="#6b1d2a" stroke="${INK}" stroke-width="2.2"/><ellipse cx="${x}" cy="${f(y + h * 0.95)}" rx="${f(w * 0.18)}" ry="${f(h * 0.3)}" fill="#f47a8f"/>`;
          case 'o': return `<ellipse cx="${x}" cy="${f(y + 3)}" rx="${f(w * 0.2)}" ry="${f(w * 0.26)}" fill="${INK}"/>`;
          case 'cat': return `<path d="M${f(x - w / 2)} ${y} Q${f(x - w / 4)} ${f(y + h * 0.9)} ${x} ${y} Q${f(x + w / 4)} ${f(y + h * 0.9)} ${f(x + w / 2)} ${y}" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
          case 'flat': return `<path d="M${f(x - w / 2)} ${y} H${f(x + w / 2)}" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`;
          case 'frown': return `<path d="M${f(x - w / 2)} ${f(y + h * 0.6)} Q${x} ${f(y - h * 0.4)} ${f(x + w / 2)} ${f(y + h * 0.6)}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
          case 'teeth': case 'fang': {
            let s = `<path d="M${f(x - w / 2)} ${y} Q${x} ${f(y + h * 1.9)} ${f(x + w / 2)} ${y}Z" fill="#3a0f1a" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
            if (type === 'fang') return s + `<path d="M${f(x - w * 0.3)} ${f(y + 0.5)} l${f(w * 0.1)} ${f(h * 0.7)} l${f(w * 0.1)} ${f(-h * 0.7)}Z M${f(x + w * 0.1)} ${f(y + 0.5)} l${f(w * 0.1)} ${f(h * 0.7)} l${f(w * 0.1)} ${f(-h * 0.7)}Z" fill="#fff"/>`;
            let t = `M${f(x - w * 0.45)} ${f(y + 0.5)}`;
            for (let i = 0; i < 5; i++) { const xx = x - w * 0.45 + i * w * 0.18; t += ` L${f(xx + w * 0.09)} ${f(y + h * 0.55)} L${f(xx + w * 0.18)} ${f(y + 0.5)}`; }
            return s + `<path d="${t}Z" fill="#fff"/>`;
          }
        }
        return '';
      },
      blush(x, y, r = 7) { return `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${f(r * 0.6)}" fill="#ff7aa8" opacity=".45"/>`; },
      // сияние позади духа
      aura(c = E.glow, r = 90, cy = 110, a = 0.5) { return `<circle class="art-aura" cx="100" cy="${cy}" r="${r}" fill="${K.rad([[0.25, c, a], [1, c, 0]])}"/>`; },
      // вышитая полоса-орнамент по пути (пояс, ворот, подол): ромбы и точки вдоль линии
      stitch(d, c = '#fde68a', w = 2) {
        return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-dasharray="${f(w * 2.2)} ${f(w * 1.6)}" stroke-linecap="round"/>`;
      },
      // ромб-оберег
      rhomb(x, y, r, c = '#fde68a', stroke = INK) { return `<path d="M${x} ${f(y - r)}L${f(x + r)} ${y}L${x} ${f(y + r)}L${f(x - r)} ${y}Z" fill="${c}" stroke="${stroke}" stroke-width="${f(Math.max(1, r * 0.25))}" stroke-linejoin="round"/>`; },
      // язык пламени: основание (x, y), высота h, ширина w
      flame(x, y, h, w, c1 = '#ffd23f', c2 = '#ff7a1a', o = {}) {
        const outer = `M${x} ${f(y - h)} C${f(x + w * 0.55)} ${f(y - h * 0.62)} ${f(x + w * 0.62)} ${f(y - h * 0.2)} ${f(x + w * 0.42)} ${f(y - h * 0.02)} C${f(x + w * 0.2)} ${f(y + h * 0.1)} ${f(x - w * 0.2)} ${f(y + h * 0.1)} ${f(x - w * 0.42)} ${f(y - h * 0.02)} C${f(x - w * 0.62)} ${f(y - h * 0.2)} ${f(x - w * 0.4)} ${f(y - h * 0.55)} ${f(x - w * 0.1)} ${f(y - h * 0.5)} C${f(x - w * 0.12)} ${f(y - h * 0.72)} ${f(x - w * 0.02)} ${f(y - h * 0.86)} ${x} ${f(y - h)}Z`;
        const inner = `M${x} ${f(y - h * 0.62)} C${f(x + w * 0.3)} ${f(y - h * 0.38)} ${f(x + w * 0.3)} ${f(y - h * 0.08)} ${x} ${f(y - h * 0.02)} C${f(x - w * 0.3)} ${f(y - h * 0.08)} ${f(x - w * 0.26)} ${f(y - h * 0.34)} ${x} ${f(y - h * 0.62)}Z`;
        return `<g class="${o.cls || 'art-flicker'}"${o.style ? ` style="${o.style}"` : ''}><path d="${outer}" fill="${K.lin([c1, c2], 0, 0, 0, 1)}"/><path d="${inner}" fill="#fff6c2" opacity=".9"/></g>`;
      },
      // лист
      leaf(x, y, len, rot, c = '#65a30d') {
        return `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0 Q${f(len * 0.45)} ${f(-len * 0.42)} ${len} 0 Q${f(len * 0.45)} ${f(len * 0.42)} 0 0Z" fill="${K.lin([shade(c, 0.3), c, shade(c, -0.25)])}" stroke="${shade(c, -0.55)}" stroke-width="1.5"/><path d="M${f(len * 0.08)} 0 H${f(len * 0.85)}" stroke="${shade(c, -0.5)}" stroke-width="1"/></g>`;
      },
      // искра-звёздочка
      spark(x, y, r, c = '#fde68a', cls = 'art-blink') {
        return `<path class="${cls}" d="M${x} ${f(y - r)}L${f(x + r * 0.25)} ${f(y - r * 0.25)}L${f(x + r)} ${y}L${f(x + r * 0.25)} ${f(y + r * 0.25)}L${x} ${f(y + r)}L${f(x - r * 0.25)} ${f(y + r * 0.25)}L${f(x - r)} ${y}L${f(x - r * 0.25)} ${f(y - r * 0.25)}Z" fill="${c}"/>`;
      },
      // путь-овал (для vol/part): центр, радиусы, поворот
      ell(cx, cy, rx, ry, rot = 0) {
        const d = `M${f(cx - rx)} ${cy}A${rx} ${ry} 0 1 0 ${f(cx + rx)} ${cy}A${rx} ${ry} 0 1 0 ${f(cx - rx)} ${cy}Z`;
        return rot ? { d, t: `rotate(${rot} ${cx} ${cy})` } : d;
      },
      // группа с поворотом/сдвигом
      g(s, t, cls) { return `<g${t ? ` transform="${t}"` : ''}${cls ? ` class="${cls}"` : ''}>${s}</g>`; },
      // симметрия: копия относительно x=100
      mirror(s) { return `${s}<g transform="translate(200 0) scale(-1 1)">${s}</g>`; },
    };
    return K;
  }

  // готовый svg: тень на земле + тело; scale — размер по стадии развития
  function render(sp) {
    const draw = SPIRIT_ART[sp.id];
    if (!draw) return null;
    const K = make(sp);
    const body = draw(K);
    // 0.88 — запас по краям: короны, пламя и крылья не наползают на подписи в карточках и списках
    const scale = 0.88 * (sp.stage === 3 ? 1 : sp.stage === 2 ? 0.92 : (sp.evo ? 0.82 : 0.94));
    const g = '__ID__gs';
    return `<svg class="art" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs>` +
      `<radialGradient id="${g}"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".6" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
      K.defs.join('') + `</defs>` +
      `<ellipse class="art-shadow" cx="100" cy="181" rx="${f(58 * scale)}" ry="${f(11 * scale)}" fill="url(#${g})"/>` +
      `<g class="art-body" transform="translate(100 180) scale(${scale}) translate(-100 -180)">${body}</g></svg>`;
  }

  return { make, render, shade, mix, EL };
})();
