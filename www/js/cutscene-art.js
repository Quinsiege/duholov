'use strict';
/* 4.6: рисунки кат-сцен обучения: наставник Велимир и Ловчий-игрок (кисть — js/art-kit.js) и ночной двор, где всё начинается.
   Велимир и Ловчий рисуются во viewBox 0 0 200 240 (по пояс, низ обрезан краем): Велимир стоит слева и смотрит вправо,
   Ловчий — справа и смотрит влево. Свет — сверху слева (и тёплый рефлекс от фонаря/оберега), лунный ободок — справа снизу. */

const CutArt = {
  _n: 0,
  // клочки меха (или бахрома) вдоль овала: n пучков, основание на расстоянии off от края, длина L±, ширина w;
  // sign = 1 — наружу, -1 — внутрь; a0…a1 — дуга (радианы, 0 — справа, по часовой). Возвращает один путь из подпутей
  _tufts(cx, cy, rx, ry, n, off, L, w, seed, sign = 1, a0 = 0, a1 = Math.PI * 2) {
    const f = Math.round; // мех — органика, целых координат хватает
    let r = seed, d = '';
    const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) {
      const t = a0 + (i + 0.5 + (rnd() - 0.5) * 0.5) * (a1 - a0) / n, c = Math.cos(t), s = Math.sin(t);
      const px = cx + rx * c, py = cy + ry * s, nl = Math.hypot(ry * c, rx * s);
      const nx = sign * ry * c / nl, ny = sign * rx * s / nl, tx = -ny, ty = nx;
      const l = L * (0.75 + rnd() * 0.5), ww = w * (0.8 + rnd() * 0.4), curl = (rnd() - 0.3) * l * 0.5;
      const bx = px + nx * off, by = py + ny * off;
      const b1x = bx - tx * ww / 2, b1y = by - ty * ww / 2, b2x = bx + tx * ww / 2, b2y = by + ty * ww / 2;
      const ex = bx + nx * l + tx * curl, ey = by + ny * l + ty * curl + l * 0.18;
      // пухлый клочок: бока выгнуты наружу, кончик чуть заострён и завит
      d += `M${f(b1x)} ${f(b1y)}C${f(b1x + nx * l * 0.62 - tx * ww * 0.32)} ${f(b1y + ny * l * 0.62 - ty * ww * 0.32)} ${f(ex - tx * ww * 0.45 - nx * l * 0.12)} ${f(ey - ty * ww * 0.45 - ny * l * 0.12)} ${f(ex)} ${f(ey)}` +
        `Q${f(b2x + nx * l * 0.62 + tx * ww * 0.34)} ${f(b2y + ny * l * 0.62 + ty * ww * 0.34)} ${f(b2x)} ${f(b2y)}Z`;
    }
    return d;
  },
  // готовый svg: vol в art-kit рассчитан на 200×200 — тени/ободки дотягиваем до низа 240
  _wrap(K, s, vb, pre) {
    const id = pre + (++this._n);
    return `<svg class="art" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg"><defs>${K.defs.join('')}</defs><g class="vm-breath">${s}</g></svg>`
      .replace(/height="240"/g, 'height="300"').replace(/__ID__/g, id);
  },
  // маленький круглый оберег — как Art.charm('charm3'), в точке (x, y) радиусом R
  _charm(K, x, y, R) {
    const f = K.f, a = '#fde047', b = '#a16207', c = '#fffbeb';
    const L = R * 0.55, dx = R * 0.375, dy = R * 0.275;
    return `<path d="M${f(x)} ${f(y - R - 1)} L${f(x - R * 0.24)} ${f(y - R * 1.28)} M${f(x)} ${f(y - R - 1)} L${f(x + R * 0.24)} ${f(y - R * 1.28)}" stroke="${b}" stroke-width="${f(R * 0.1)}" stroke-linecap="round"/>` +
      `<circle cx="${f(x)}" cy="${f(y)}" r="${R}" fill="${K.rad([[0, c], [0.45, a], [1, b]], 0.35, 0.3, 0.8)}" stroke="${b}" stroke-width="${f(R * 0.1)}"/>` +
      `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R * 0.68)}" fill="none" stroke="${c}" stroke-width="${f(R * 0.065)}" stroke-dasharray="${f(R * 0.15)} ${f(R * 0.12)}" opacity=".9"/>` +
      `<path d="M${f(x)} ${f(y - L)}V${f(y + L)}M${f(x - dx)} ${f(y - dy)}L${f(x + dx)} ${f(y + dy)}M${f(x + dx)} ${f(y - dy)}L${f(x - dx)} ${f(y + dy)}" stroke="${c}" stroke-width="${f(R * 0.1)}" stroke-linecap="round"/>` +
      `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R * 0.175)}" fill="${c}"/><circle cx="${f(x)}" cy="${f(y - R * 1.12)}" r="${f(R * 0.15)}" fill="${a}" stroke="${b}" stroke-width="${f(R * 0.07)}"/>` +
      `<path d="M${f(x - R * 0.72)} ${f(y - R * 0.38)} Q${f(x - R * 0.5)} ${f(y - R * 0.8)} ${f(x - R * 0.05)} ${f(y - R * 0.88)}" stroke="#fff" stroke-width="${f(R * 0.09)}" fill="none" stroke-linecap="round" opacity=".7"/>`;
  },

  // Велимир — старший Ловчий Ордена Оберега: зелёный плащ с глубоким капюшоном и меховой опушкой, седая борода,
  // добрые янтарные глаза, оберег Ордена (цветок папоротника) на груди, посох с фонарём. Смотрит вправо — на игрока.
  // mini — тот же рисунок, но кадр «голова и плечи» (для медальона в подсказках)
  velimir(mini) {
    const K = ArtKit.make({ el: 'forest', id: 'velimir' }), f = K.f;
    const RIM = '#d4ecff', GL = '#062516', skin = '#ecb994', skinD = '#c47f5c', brow = '#8a4a2c';
    let s = '';
    // свет фонаря за спиной
    s += `<circle class="art-aura" cx="27" cy="64" r="58" fill="${K.rad([[0, '#fff1b8', 0.8], [0.3, '#fbbf24', 0.32], [1, '#f59e0b', 0]])}"/>`;

    // плащ: тяжёлый, до земли, складки падают от плеч
    const CLOAK = 'M4 240C6 204 18 174 48 158C64 151 84 148 100 148H124C146 149 164 155 178 166C192 180 198 208 198 240Z';
    s += K.vol(CLOAK, { c1: '#2a9f5c', c2: '#0a3620', rim: RIM, rimK: 0.4, tex: false, line: '#03170c', lw: 2.4 });
    s += K.line('M62 168C58 192 60 216 66 240M170 172C176 196 176 220 172 240M188 196C191 212 191 228 190 240M26 190C22 206 20 222 21 240', GL, 3.2, { op: 0.55 });
    s += K.line('M58 170C54 194 56 216 61 238M166 172C171 196 171 218 168 238M30 186C27 202 25 220 26 238', '#6fdc9d', 1.2, { op: 0.3 });
    // кафтан под плащом: винный, с вышитой планкой
    s += K.part('M86 150H140C146 180 150 210 154 240H74C78 210 82 180 86 150Z', '#7a1f2e', { line: '#3b0a14', lw: 1.6 });
    s += K.line('M113 152V240', '#3b0a14', 6) + K.line('M113 152V240', '#a1283b', 4) + K.stitch('M113 153V240', '#f3cf6b', 1.3);
    // края плаща — золотое шитьё с ромбами-оберегами
    const LE = 'M86 150C82 180 78 210 74 240', RE = 'M140 150C145 180 150 210 154 240';
    [LE, RE].forEach(p => { s += K.line(p, '#7a4a0c', 11) + K.line(p, '#e8b64a', 9.6) + K.line(p, '#0e3b24', 6.4) + K.stitch(p, '#f3cf6b', 1.3); });
    [[85, 160], [81.4, 184], [78, 208], [75.2, 230], [141, 160], [145, 184], [149.4, 208], [152.8, 230]].forEach(([x, y]) => { s += K.rhomb(x, y, 2.6, '#fde68a', '#7a4a0c'); });

    // цепь и оберег Ордена — цветок папоротника (борода ляжет поверх)
    if (!mini) {
      s += `<path d="M90 150C92 180 101 204 111 214M136 150C134 180 125 204 115 214" fill="none" stroke="#7a4a0c" stroke-width="3.2" stroke-dasharray="2.6 1.4"/>` +
        `<path d="M90 150C92 180 101 204 111 214M136 150C134 180 125 204 115 214" fill="none" stroke="#f3cf6b" stroke-width="1.8" stroke-dasharray="2.6 1.4"/>`;
      s += `<circle class="art-aura" cx="113" cy="225" r="26" fill="${K.rad([[0, '#fde68a', 0.65], [0.45, '#fbbf24', 0.2], [1, '#fbbf24', 0]])}"/>`;
      s += `<circle cx="113" cy="225" r="12.5" fill="${K.lin(['#fff6c4', '#f3cf6b', '#c0841f', '#7c3f0a'], 0.2, 0, 0.8, 1)}" stroke="#4a1f06" stroke-width="1.6"/>`;
      s += `<circle cx="113" cy="225" r="9.6" fill="#5b1a0c"/><circle cx="113" cy="225" r="9.6" fill="none" stroke="#fde68a" stroke-width=".8" stroke-dasharray="1.6 1.2"/>`;
      const petals = odd => [0, 1, 2, 3].map(k => { const a = (k * 90 + (odd ? 45 : 0)) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), p = (x, y) => `${f(113 + x * c - y * sn)} ${f(225 + x * sn + y * c)}`;
        return `M${p(0, -8.6)}C${p(2.6, -5.6)} ${p(2.4, -2.6)} ${p(0, 0)}C${p(-2.4, -2.6)} ${p(-2.6, -5.6)} ${p(0, -8.6)}Z`; }).join('');
      s += `<path d="${petals(false)}" fill="#fde047"/><path d="${petals(true)}" fill="#fb923c"/>`;
      s += `<circle cx="113" cy="225" r="2.8" fill="${K.rad([[0, '#ffffff'], [0.5, '#fff3b0'], [1, '#f59e0b']])}"/>`;
      s += `<path d="M104.5 219Q107 214.6 112 213.8" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".75"/>`;
    }

    // посох с фонарём, рука на посохе — только в полном рисунке (в медальон не попадают)
    const SLV = 'M84 152C76 154 70 158 66 163L45 178C39 190 35 206 39 222C45 229 57 227 65 219C68 206 71 196 88 186Z';
    if (!mini) {
      // посох: узловатое дерево, навершие-крюк, на крюке — фонарь
      const ST = 'M36 240C38 190 42 120 47 46C48 36 44 28 36 27C28 26 23 32 26 38';
      s += K.line(ST, '#241208', 8.4) + K.line(ST, '#7a4a22', 5.4) + K.line('M34.8 238C36.8 190 40.8 120 45.6 48C46.6 38 42 30.4 36 29.6', '#c89458', 1.4, { op: 0.7 });
      s += K.part(K.ell(41.6, 112, 3.8, 2.6) + K.ell(38.8, 196, 3.6, 2.4), '#6b3f1d', { line: '#241208', lw: 1.2 });
      s += K.line('M41 104l-5 -6M38.4 188l6 -5', '#241208', 2.2) + K.line('M41 104l-5 -6M38.4 188l6 -5', '#7a4a22', 1.2);
      // фонарь
      s += K.line('M26 38V44', '#3b2412', 1.6) + `<circle cx="26.5" cy="45.4" r="2.2" fill="none" stroke="#3b2412" stroke-width="1.4"/>`;
      s += K.part('M26.5 47.6L39 56H14ZM15 77H38L35 81.4H18Z', '#8a5a2b', { line: '#2a160a', lw: 1.4 }) + K.line('M18 55.4H35', '#e2a857', 1, { op: 0.8 });
      s += `<path d="M16 56H37L35 77H18Z" fill="${K.rad([[0, '#fffbe6'], [0.45, '#fde68a'], [1, '#f59e0b']], 0.5, 0.65, 0.65)}"/>`;
      s += `<circle class="art-blink" cx="26.5" cy="67" r="9" fill="${K.rad([[0, '#ffffff', 0.9], [1, '#fde68a', 0]])}"/>`;
      s += K.flame(26.5, 74, 14, 8, '#fff3b0', '#fb923c');
      s += `<path d="M16 56H37L35 77H18Z" fill="none" stroke="#2a160a" stroke-width="1.6" stroke-linejoin="round"/>` + K.line('M21.5 56.4L22.3 76.6M31.5 56.4L30.7 76.6', '#3b2412', 1.1, { op: 0.8 }) + K.line('M18.6 58.4L19.4 70', '#fff', 1, { op: 0.7 });
      s += `<circle cx="26.5" cy="83.6" r="1.8" fill="#8a5a2b" stroke="#2a160a" stroke-width="1"/>`;

      // рукав: рука поднята к посоху, широкий рукав свисает колоколом
      s += K.vol(SLV, { c1: '#2a9f5c', c2: '#0a3620', rim: RIM, rimK: 0.45, tex: false, line: '#03170c', lw: 2.2 });
      s += K.line('M52 180C48 194 46 208 46 222M60 176C58 190 56 204 55 218M70 172C68 184 66 196 64 206', GL, 2.2, { op: 0.5 });
      s += K.line('M48 184C45 196 43 208 43 218', '#6fdc9d', 1.1, { op: 0.35 });
      // обшлаг: тёмный зев рукава и золотое шитьё поперёк
      s += `<path d="M44 177C46 168 56 161 66 162C62 170 54 176 44 177Z" fill="#031a0d"/>`;
      const CF = 'M44.6 179C52 176 60 170 66.6 163';
      // рука на посохе: запястье из рукава, узловатые пальцы обхватывают древко
      const hand = { line: '#7a3f22', lw: 1.2 };
      s += K.part('M60 166C56 160 48 156 42 156L40 172C46 175 52 175 56 174Z', '#e0a67e', hand);
      s += K.line(CF, '#7a4a0c', 7.4) + K.line(CF, '#e8b64a', 5.6) + K.stitch('M45.6 178.4C52 175.6 59.6 170 65.6 164', '#fff3b0', 1.1);
      s += K.part('M50 149C45 144 38 145 36 149C35 151 37 152.6 39 151.6C42 150 46 150.4 48.6 153Z', '#eab28a', hand);
      let fd = '', jd = '', hd = '';
      [[152.4, 48.4], [157.6, 49.4], [162.8, 49.6], [167.8, 48.6]].forEach(([y, x2], i) => {
        const x1 = 33.6 + (i === 0 || i === 3 ? 1 : 0), h = 4.9;
        fd += `M${x2} ${f(y - h / 2)}C${f(x2 - 5)} ${f(y - h / 2 - 0.6)} ${f(x1 + 2)} ${f(y - h / 2 - 0.4)} ${f(x1)} ${f(y - 0.4)}C${f(x1 - 0.6)} ${f(y + 1.4)} ${f(x1 + 1)} ${f(y + h / 2)} ${f(x1 + 3)} ${f(y + h / 2)}C${f(x1 + 6)} ${f(y + h / 2 + 0.2)} ${f(x2 - 3)} ${f(y + h / 2 + 0.3)} ${x2} ${f(y + h / 2)}Z`;
        jd += `M${f(x1 + 5.4)} ${f(y - 1.8)}q.8 1.8 0 3.6M${f(x1 + 10.4)} ${f(y - 1.6)}q.7 1.6 0 3.2`;
        hd += K.ell(x1 + 2.2, f(y - 0.9), 1.6, 1);
      });
      s += K.part(fd, '#ecb48c', hand);
      s += K.line(jd, '#a8653e', 0.8, { op: 0.8 }) + `<path d="${hd}" fill="#fff" opacity=".35"/>`;
    }

    // капюшон — глубокий, с остриём, чуть откинутым назад
    const HOOD = 'M84 20C106 18 130 26 144 40C156 52 162 68 162 88C164 116 158 138 148 156H66C54 138 48 114 50 90C51 62 62 36 84 20Z';
    s += K.vol(HOOD, { c1: '#34b56c', c2: '#0b3d25', rim: RIM, rimK: 0.5, tex: false, line: '#03170c', lw: 2.4 });
    s += K.line('M150 60C157 82 158 106 153 132M60 74C55 96 56 116 62 136M136 40C146 50 153 62 157 76', GL, 2.8, { op: 0.5 });
    s += K.line('M64 66C60 86 60 104 64 122M88 26C79 34 72 44 67 56', '#7fe6a8', 1.4, { op: 0.35 });
    s += K.stitch('M86 23C82 34 82 44 84 53', '#f3cf6b', 1.4);

    // глубина капюшона и лицо
    const hole = K.ell(108, 98, 33, 45);
    s += `<path d="${hole}" fill="${K.rad([[0, '#2c2616'], [0.65, '#0d170f'], [1, '#030605']], 0.64, 0.52, 0.62)}"/>`;
    const FACE = 'M113 60C131 60 141 77 141 97C141 117 131 133 113 135C96 133 87 118 87 97C87 77 96 60 113 60Z';
    s += K.vol(FACE, { c1: skin, c2: skinD, rim: '#ffe6d2', rimK: 0.3, tex: false, line: '#6e3a20', lw: 1.4, shadeK: 0.3, hiK: 0.14 });
    // тень капюшона на лбу и тёплый рефлекс фонаря на левой щеке
    s += `<path d="M87 94C87 72 99 60 113 60C130 60 141 73 141 94C134 78 122 72 112 72C100 72 91 80 87 94Z" fill="#3a1a0c" opacity=".38"/>`;
    s += `<ellipse cx="92" cy="106" rx="10" ry="20" fill="${K.rad([[0, '#ffb057', 0.55], [1, '#ffb057', 0]])}"/>`;
    s += K.line('M100 76Q112 71.6 127 75.6M103 81Q113 78 124 80.6', '#a8603c', 1, { op: 0.5 });
    // румянец
    const BL = K.rad([[0, '#f2766a', 0.6], [1, '#f2766a', 0]]);
    s += `<ellipse cx="100" cy="111" rx="8" ry="5" fill="${BL}"/><ellipse cx="131" cy="110" rx="6" ry="4.2" fill="${BL}" opacity=".85"/>`;

    // глаза: миндаль с тёплой янтарной радужкой, блики, мягкие веки — добрый внимательный взгляд вправо
    const IRIS = K.rad([[0, '#fff3c0'], [0.4, '#f6b93b'], [0.82, '#b45f10'], [1, '#5e2a06']], 0.46, 0.42, 0.58), EG = K.rad([[0, '#ffd66b', 0.45], [1, '#ffd66b', 0]]);
    const eye = (x, y, w, h, out) => {
      const d = `M${f(x - w)} ${f(y + 0.4)}Q${f(x - w * 0.15)} ${f(y - h * 1.3)} ${f(x + w)} ${f(y - 0.5)}Q${f(x + w * 0.1)} ${f(y + h * 1.05)} ${f(x - w)} ${f(y + 0.4)}Z`;
      const c = K.id('ec'); K.def(`<clipPath id="${c}"><path d="${d}"/></clipPath>`);
      const ix = x + w * 0.3, iy = y + 0.1, ir = h * 0.98;
      let e = `<path d="${d}" fill="#fbf2e2"/><g clip-path="url(#${c})">` +
        `<circle cx="${f(ix)}" cy="${f(iy)}" r="${f(ir)}" fill="${IRIS}"/>` +
        `<circle cx="${f(ix)}" cy="${f(iy + 0.2)}" r="${f(ir * 0.44)}" fill="#1f0d04"/>` +
        `<ellipse cx="${f(x)}" cy="${f(y - h * 1.05)}" rx="${f(w * 1.2)}" ry="${f(h * 0.7)}" fill="#4a200e" opacity=".32"/></g>` +
        `<circle cx="${f(ix - ir * 0.36)}" cy="${f(iy - ir * 0.36)}" r="${f(ir * 0.34)}" fill="#fff"/><circle cx="${f(ix + ir * 0.4)}" cy="${f(iy + ir * 0.34)}" r="${f(ir * 0.15)}" fill="#fff" opacity=".85"/>`;
      const ox = out < 0 ? x - w : x + w;
      e += K.line(`M${f(x - w - 0.4)} ${f(y + 0.9)}Q${f(x - w * 0.15)} ${f(y - h * 1.38)} ${f(x + w + 0.4)} ${f(y - 0.7)}`, '#3a1a0c', 1.7);
      e += K.line(`M${f(ox)} ${f(y + (out < 0 ? 0.6 : -0.6))}l${f(out * 1.8)} -1.2`, '#3a1a0c', 1.3);
      e += K.line(`M${f(x - w * 0.75)} ${f(y + h * 0.62)}Q${f(x)} ${f(y + h * 1.2)} ${f(x + w * 0.8)} ${f(y + h * 0.5)}`, '#9a5536', 0.9, { op: 0.75 });
      return e;
    };
    s += `<g class="art-eyes">${eye(104, 97, 6.4, 4.5, -1)}${eye(127.4, 96.6, 5.3, 4.2, 1)}</g>`;
    s += `<ellipse class="art-blink" cx="106" cy="97" rx="7" ry="5.4" fill="${EG}"/><ellipse class="art-blink" cx="129" cy="96.6" rx="6" ry="5" fill="${EG}"/>`;
    // морщинки: складка века, «гусиные лапки», мешочки под глазами
    s += K.line('M97.6 91.2Q104 87.2 111 90.2M121.8 90.4Q127.4 87.4 133.2 90', brow, 0.9, { op: 0.6 });
    s += K.line('M96.4 96.4l-5 -2.6M96.2 99l-5.6 .4M96.8 101.4l-4.6 3M134.2 95.6l4 -2.2M134.4 98.2l4.4 .4M133.8 100.6l3.6 2.6', brow, 0.95, { op: 0.7 });
    s += K.line('M99 104.4Q104.6 107.6 110.6 104.6M122.6 103.8Q127.4 106.8 132 103.8', '#b36c4a', 0.9, { op: 0.55 });
    // кустистые брови — вскинуты по-доброму
    const BR = { line: '#6b7785', lw: 0.9 };
    s += K.part('M112.6 88.4C109 83.6 100 83 94.6 85.4C91.4 86.8 89.4 89.4 87.6 93C90.4 91.6 91.4 91.8 92.4 92.8C93.4 90.6 95.2 90.4 96.6 91.4C98.4 89.4 101.2 89.2 103.6 90.2C106.6 89.2 110 89.4 112.6 91Z', '#f1f5f9', BR);
    s += K.part('M120.6 88.4C124.4 84 131.8 83.8 136 86.2C138.4 87.6 139.6 89.6 140.4 92.6C138.6 91.4 137.6 91.4 136.8 92.2C136 90.2 134.2 90 133 90.8C131.2 89 128.6 88.8 126.4 89.6C124.4 88.8 122.4 88.8 120.6 90Z', '#e8edf2', BR);
    s += K.line('M110.6 88.2Q103 85.8 95.4 88.6M106 87Q99 86.8 92.4 90.6M122.4 88.2Q129 85.6 136 88M125 87.2Q132 86.6 138.4 90', '#b6c2cf', 0.8);
    // нос — крупный, «картошкой», с румяным кончиком
    s += K.part('M115.8 98.6C117 104.6 119 107.8 122.2 109.6C127.4 110.8 128.4 116.8 124.4 119.8C122.2 121.8 118.4 121.2 116.4 119.2C113.4 121.2 109.4 119.6 110 116.2C110.6 113.4 113.6 112 115 110C115.2 106 115.2 102.2 115.8 98.6Z', '#e9a883', { line: '#7a3f22', lw: 1.2 });
    s += `<ellipse cx="122.4" cy="115" rx="4.4" ry="3.4" fill="${K.rad([[0, '#f06a5a', 0.45], [1, '#f06a5a', 0]])}"/>` +
      `<ellipse cx="121.8" cy="112.6" rx="2.2" ry="1.4" fill="#fff" opacity=".55"/><ellipse cx="118.4" cy="118.4" rx="1.4" ry=".9" fill="#5a2210" opacity=".75"/>`;

    // меховая опушка капюшона — объёмные клочки: тёмный подшёрсток, светлые кончики, прядки внутрь
    const T = this._tufts.bind(this);
    s += `<path d="${hole}" fill="none" stroke="#8f7a62" stroke-width="12"/>`;
    s += `<path d="${T(108, 98, 33, 45, 24, 2, 10, 12, 7)}" fill="#4a3624"/>`;
    s += `<path d="${hole}" fill="none" stroke="#4a3624" stroke-width="3" opacity=".6"/>`;
    s += `<path d="${T(108, 98, 33, 45, 24, 0.5, 8, 11, 13) + T(108, 98, 33, 45, 18, 1.5, 5.4, 9.5, 17, -1)}" fill="${K.lin(['#fbf3e3', '#dccab0', '#a38a6c'], 0.1, 0, 0.9, 1)}"/>`;
    s += `<path d="${hole}" fill="none" stroke="#7d654c" stroke-width="7" stroke-dasharray=".7 2.6" opacity=".45" transform="translate(108 98) scale(1.12) translate(-108 -98)"/>`;
    s += `<path d="${T(108, 98, 33, 45, 10, 2.4, 6, 7.6, 23, 1, Math.PI * 0.9, Math.PI * 1.65)}" fill="#fffaf0" opacity=".8"/>`;

    // борода — длинная, до груди, пряди сходятся к кончику
    const BEARD = 'M87 100C85 116 79 128 75 142C71 156 70 168 74 178C77 186 82 191 88 193C91 194 94 193 96 191C99 198 103 204 107 208C109 211 111 214 112 218C114 213 117 209 121 205C124 201 127 197 130 194C134 196 138 196 141 193C147 186 151 178 151 166C152 150 148 126 142 100C138 118 128 128 117 129C104 130 92 120 87 100Z';
    s += K.vol(BEARD, { c1: '#ffffff', c2: '#95a3b5', rim: '#dbeafe', rimK: 0.55, tex: false, line: '#566271', lw: 1.6, shadeK: 0.45, hiK: 0.32 });
    s += `<ellipse cx="84" cy="152" rx="12" ry="28" fill="${K.rad([[0, '#ffc27a', 0.32], [1, '#ffc27a', 0]])}"/>`;
    // пряди тремя прядями-локонами: левый, средний (до кончика), правый
    let hs = '', hw = '';
    [[82, 99, 88, 190, -4], [99, 127, 112, 214, 0], [127, 146, 137, 190, 4]].forEach(([xa, xb, ex, ey, bend], li) => {
      for (let i = 0; i < 5; i++) {
        const x0 = xa + (xb - xa) * (i + 0.5) / 5, y0 = 134 + Math.abs(x0 - 116) * -0.25 + (i % 2) * 4, x1 = ex + (i - 2) * 1.6;
        const r = Math.round, p = `M${r(x0)} ${r(y0)}C${r(x0 + bend)} ${r(y0 + 24)} ${r(x1 + bend * 2 + (i - 2) * 2)} ${r(ey - 26)} ${r(x1)} ${r(ey - 2 - Math.abs(i - 2) * 2)}`;
        if ((i + li) % 2) hw += p; else hs += p;
      }
    });
    s += K.line(hs, '#8a98aa', 1.1, { op: 0.8 }) + K.line(hw, '#ffffff', 1.4, { op: 0.85 });
    s += K.line('M99 150C96 166 94 180 95 190M126 150C129 166 130 180 130 192', '#7d8b9e', 1.8, { op: 0.55 });
    s += K.line('M104 150C102 170 104 190 110 206M86 140C82 156 80 170 82 182', '#fff', 2.4, { op: 0.5 });
    s += K.line('M84 188C82 184 86 181 89 184M136 188C139 184 135 181 132 184', '#6b7888', 1.2, { op: 0.8 });
    s += `<ellipse cx="116" cy="135" rx="17" ry="4.5" fill="#5b6778" opacity=".22"/>`;
    // рот с доброй улыбкой прячется под усами
    s += `<path d="M108.4 128.6Q116 135.6 124 128.2Q116 131 108.4 128.6Z" fill="#5a2216"/><path d="M111 131.6Q116 135.4 121.4 131.2Q116 133.2 111 131.6Z" fill="#d98a78"/>`;
    // усы — два пышных крыла
    const MU = { line: '#5d6977', lw: 1.1 };
    s += K.part('M117 119C110 116.6 100 118 94 124C90 128.4 86 133 79 134C82.6 138.4 90.6 139 97.4 135C103.4 131.4 109.4 127.4 117 126Z', '#f4f7fa', MU);
    s += K.part('M117 119C123.4 116.8 131 118 135 122C138.2 126 141 130 146 131C143 135.4 136 135.4 132 131.6C128.4 128.2 123.4 126 117 126Z', '#e6ebf0', MU);
    s += K.line('M113 121C105 121 97 126 90 132M114 124C107 124 101 129 94 134M121 121C127 121 133 125 138 130', '#aab6c4', 0.8);

    // тёплый отсвет фонаря по левому краю фигуры
    const cl = K.id('lc'); K.def(`<clipPath id="${cl}"><path d="${CLOAK}"/><path d="${HOOD}"/><path d="${SLV}"/></clipPath>`);
    s += `<rect clip-path="url(#${cl})" x="0" y="0" width="200" height="250" fill="${K.rad([[0, '#ffc46b', 0.5], [0.55, '#ffa94d', 0.12], [1, '#ffa94d', 0]], 0.13, 0.26, 0.55)}"/>`;
    // светлячки
    s += K.spark(12, 104, 2.6, '#fde68a', 'art-float') + K.spark(172, 30, 2.8, '#bbf7d0') + K.spark(186, 112, 2, '#fde68a');
    if (!mini) s += K.spark(60, 128, 2.2, '#fff3b0', 'art-blink');
    return this._wrap(K, s, mini ? '52 42 116 116' : '0 0 200 240', 'vm');
  },

  // Ловчий-игрок: молодой, лёгкий, в плаще с глубоким капюшоном (лицо в тени — только глаза и контур подбородка),
  // шарф-оберег, наплечная сумка с оберегами, в руке — золотой оберег, на застёжке — эмблема. Смотрит влево — на Велимира.
  // look: { cloak, eyes, emblem } — цвета только #rrggbb, эмблема — готовой разметкой Art.emblem
  hero(look) {
    look = look || {};
    const HEX = /^#[0-9a-f]{6}$/i;
    const cloak = HEX.test(look.cloak) ? look.cloak : '#6d28d9', eyes = HEX.test(look.eyes) ? look.eyes : '#5eead4';
    const K = ArtKit.make({ el: 'shadow', id: 'hero' }), f = K.f, sh = K.shade;
    const C1 = sh(cloak, 0.16), C2 = sh(cloak, -0.45), CL = sh(cloak, -0.72), CH = sh(cloak, 0.45), RIM = '#e4dcff';
    const linen = '#f6efe0', red = '#c0262d', VO = { c1: C1, c2: C2, rim: RIM, rimK: 0.5, texK: 0.18, line: CL };
    let s = '';
    // сияние оберега в руке
    s += `<circle class="art-aura" cx="45" cy="146" r="44" fill="${K.rad([[0, '#fff3b0', 0.75], [0.3, '#fbbf24', 0.3], [1, '#f59e0b', 0]])}"/>`;

    // хвост шарфа вьётся за спиной по ветру
    let tail = K.part('M140 134C152 127 160 138 172 132C180 128 186 121 193 123C190 131 192 139 197 145C187 146 181 150 173 153C160 157 152 146 142 151Z', linen, { line: '#8a7a66', lw: 1.3 });
    tail += K.line('M176 130C178 136 180 142 181 149M182 126.4C184 132 186 138 187 146', red, 2.2) + K.line('M194 124.6L199 122M194.6 130.6L199.6 130M195.6 137L200 138.6M197 143L200.6 146.6', '#d9cdb6', 1.2);
    tail += K.line('M146 142C156 140 162 144 172 140', '#d0c2a8', 1, { op: 0.8 });
    s += `<g class="art-sway">${tail}</g>`;

    // плащ — лёгкий, полы расходятся книзу
    const CLOAK = 'M50 240C50 206 56 172 70 150C80 142 94 138 108 138C124 138 138 142 150 150C166 172 174 206 180 240Z';
    s += K.vol(CLOAK, { ...VO, lw: 2.2 });
    s += K.line('M64 176C60 198 58 220 58 240M160 174C166 196 170 218 172 240M148 190C150 208 152 226 152 240', CL, 2.6, { op: 0.45 });
    s += K.line('M68 172C64 194 62 216 62 236M156 176C161 196 164 216 166 234', CH, 1.2, { op: 0.3 });
    // рубаха и пояс
    s += K.part('M97 146H119C123 180 127 210 129 240H87C89 210 93 180 97 146Z', '#2b2340', { line: '#120c20', lw: 1.4 });
    s += K.part('M89 211H128L129 221H88Z', '#6b3f1d', { line: '#2a160a', lw: 1.2 }) + K.stitch('M90 216H127', '#e2a857', 1) + K.part('M104 209.6H113V222.4H104Z', '#f3cf6b', { line: '#7a4a0c', lw: 1.2 });
    const LE = 'M97 146C93 180 89 210 87 240', RE = 'M119 146C123 180 127 210 129 240';
    const edge = p => K.line(p, CL, 5.4) + K.line(p, C1, 3.8) + K.stitch(p, '#f3cf6b', 1.2);
    s += edge(LE) + edge(RE);

    // ремень через грудь и сумка с оберегами
    const STR = 'M80 150C98 172 124 190 150 204';
    s += K.line(STR, '#2a160a', 8) + K.line(STR, '#8a5a2b', 5.6) + K.stitch(STR, '#f3cf6b', 1);
    s += K.part('M111 175L120 180.6L117.2 185L108.2 179.4Z', '#f3cf6b', { line: '#7a4a0c', lw: 1.1 });
    s += K.vol('M134 198C150 194 168 196 177 202L179 230C165 237 146 237 132 231Z', { c1: '#a86a36', c2: '#5a3416', rim: '#fde7c8', rimK: 0.45, tex: false, line: '#2a160a', lw: 1.8, shadeK: 0.5 });
    s += K.part('M132 197C150 191 170 193 179 202L177 215C166 221 150 222 135 217Z', '#8a5428', { line: '#2a160a', lw: 1.6 });
    s += K.stitch('M136 213C150 217 164 216 175 211', '#f3cf6b', 1.1) + K.rhomb(156, 209, 3.6, '#f3cf6b', '#7a4a0c') + K.rhomb(156, 209, 1.4, '#c0262d', '#7a2a0c');
    // обереги на шнурках у сумки
    s += K.line('M140 216V224M149 218.6V229M167 217V222', '#3b2412', 1);
    s += `<circle cx="140" cy="226.4" r="3.4" fill="${K.rad([[0, '#ffedd5'], [0.5, '#fb923c'], [1, '#9a3412']], 0.35, 0.3, 0.8)}" stroke="#7c2d12" stroke-width=".9"/>` +
      `<circle cx="149" cy="231.4" r="3" fill="${K.rad([[0, '#ffffff'], [0.5, '#e2e8f0'], [1, '#475569']], 0.35, 0.3, 0.8)}" stroke="#334155" stroke-width=".9"/>` +
      `<circle cx="167" cy="224.6" r="3.2" fill="${K.rad([[0, '#f5f3ff'], [0.5, '#c084fc'], [1, '#581c87']], 0.35, 0.3, 0.8)}" stroke="#3b0764" stroke-width=".9"/>`;

    // капюшон: округлый, кончик свисает на спину
    const HOOD = 'M84 30C100 16 126 12 144 20C158 26 168 40 174 60C177 70 178 78 176 88C170 81 164 77 159 75C160 97 156 118 146 138H72C60 120 56 98 58 78C60 56 68 40 84 30Z';
    s += K.vol(HOOD, { ...VO, rimK: 0.55, lw: 2.2 });
    s += K.line('M150 44C156 70 154 100 146 124M160 36C166 48 170 62 172 78M120 22C132 30 140 40 144 52', CL, 2.2, { op: 0.45 });
    s += K.line('M66 64C62 82 62 102 68 120M90 30C80 38 72 48 68 58', CH, 1.4, { op: 0.4 });
    // глубина капюшона, лицо в тени: светятся глаза, оберег снизу чуть высвечивает скулу и подбородок
    const hole = K.ell(93, 84, 25, 32);
    s += `<path d="${hole}" fill="${K.rad([[0, sh(cloak, -0.8)], [0.6, '#08051a'], [1, '#020110']], 0.4, 0.62, 0.6)}"/>`;
    s += `<path d="M73 82C73 68 81 59 93 59C106 59 113 70 113 84C113 99 106 110 95 112.4C88 113.4 82 110.6 78 104.6C75 98.6 73 90 73 82Z" fill="${K.lin(['#040210', '#0c0718', sh(cloak, -0.68), '#4a2a2a'])}"/>`;
    s += K.line('M75.6 97C78.6 105.4 85 110.8 93 111.4C99 111.8 104 109.6 107.4 105.4', '#f5c99a', 1.3, { op: 0.6 });
    s += `<ellipse cx="84" cy="108" rx="13" ry="6.5" fill="${K.rad([[0, '#fbbf24', 0.32], [1, '#fbbf24', 0]])}"/>`;
    // светящиеся глаза — смотрят влево, решительно (верхнее веко прямее и ниже к переносице)
    const eg = (x, y, w, h, inL) => {
      const d = inL
        ? `M${f(x - w)} ${f(y + h * 0.2)}Q${f(x + w * 0.2)} ${f(y - h * 1.4)} ${f(x + w)} ${f(y - h * 0.5)}Q${f(x + w * 0.1)} ${f(y + h * 1.2)} ${f(x - w)} ${f(y + h * 0.2)}Z`
        : `M${f(x + w)} ${f(y + h * 0.2)}Q${f(x - w * 0.2)} ${f(y - h * 1.4)} ${f(x - w)} ${f(y - h * 0.5)}Q${f(x - w * 0.1)} ${f(y + h * 1.2)} ${f(x + w)} ${f(y + h * 0.2)}Z`;
      return `<ellipse class="art-blink" cx="${f(x)}" cy="${f(y)}" rx="${f(w * 2.4)}" ry="${f(h * 3)}" fill="${K.rad([[0, eyes, 0.7], [0.5, eyes, 0.22], [1, eyes, 0]])}"/>` +
        `<path d="${d}" fill="${K.rad([[0, '#ffffff'], [0.35, sh(eyes, 0.5)], [1, eyes]], 0.4, 0.5, 0.7)}"/>` +
        `<ellipse cx="${f(x - w * 0.3)}" cy="${f(y)}" rx="${f(w * 0.36)}" ry="${f(h * 0.5)}" fill="#fff" opacity=".95"/>`;
    };
    s += `<g class="art-eyes">${eg(83, 85, 4.2, 2.8, false)}${eg(101.4, 84.4, 5.6, 3.3, true)}</g>`;
    // кайма капюшона — толстый вышитый отворот
    s += `<path d="${hole}" fill="none" stroke="${CL}" stroke-width="6"/><path d="${hole}" fill="none" stroke="${C1}" stroke-width="4"/>` +
      `<path d="${hole}" fill="none" stroke="${CH}" stroke-width="1.2" stroke-dasharray="30 200" stroke-dashoffset="-96" opacity=".7"/>` + K.stitch(hole, '#f3cf6b', 1.1);

    // шарф-оберег: белёный лён с красной вышивкой
    s += K.vol('M68 132C88 123 128 123 150 132C152 140 148 148 142 153C120 146 96 146 74 153C68 148 66 140 68 132Z', { c1: '#fffdf6', c2: '#c9bca4', rim: '#ffffff', rimK: 0.3, tex: false, line: '#6f6150', lw: 1.5, shadeK: 0.45 });
    s += K.line('M71 139C93 132.6 123 132.6 147 139', red, 3.2) + K.line('M71 135.6C93 129 123 129 147 135.6M71 142.4C93 136 123 136 147 142.4', red, 0.9);
    [[77, 137.4], [89, 134.8], [101, 133.8], [113, 133.6], [125, 134.2], [137, 136]].forEach(([x, y]) => { s += K.rhomb(x, y, 2.4, linen, '#8a1519'); });
    s += K.line('M84 147C96 143 120 143 134 148', '#b3a58c', 1, { op: 0.8 });
    // конец шарфа спереди — с бахромой
    s += K.part('M79 145C77 161 75 177 78 193L93 191C91 175 91 161 93 147Z', linen, { line: '#6f6150', lw: 1.3 });
    s += K.line('M77.4 181L92 179.6M77.6 185.4L92.2 184', red, 1.8) + K.rhomb(85.4, 168, 2.6, red, '#8a1519');
    s += K.line('M79 193.4V199M82.6 193V199.4M86.2 192.6V199M89.8 192.2V198.4', '#d9cdb6', 1.2);

    // застёжка плаща с эмблемой игрока
    s += K.line('M95 158L99 160M123 158L119 160', '#a16207', 2);
    s += `<circle cx="109" cy="160" r="10.6" fill="${K.lin(['#fff6c4', '#f3cf6b', '#b7791f', '#7c3f0a'], 0.2, 0, 0.8, 1)}" stroke="#4a1f06" stroke-width="1.4"/>` +
      `<circle cx="109" cy="160" r="8.2" fill="#241a45" stroke="#7a4a0c" stroke-width=".8"/>`;
    s += `<g transform="translate(70.4 95.2) scale(.772)">${Art.emblem(look.emblem)}</g>`;
    s += `<path d="M100.6 155.4Q103 151.4 107.6 150.6" stroke="#fff" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".7"/>`;

    // рука поднята — рукав плаща, кожаный наруч, перчатка с оберегом
    s += K.vol('M80 206C70 197 60 185 54.6 173L65.4 162.9C73 170 86 181 97 190Z', { ...VO, lw: 1.8 });
    s += K.line('M72 190C76 188 80 186 84 186M64 180C67 178 70 176 73 176', CL, 1.4, { op: 0.5 });
    s += K.line('M91.4 184C90.4 196 89.6 206 89 214', CL, 5.4) + K.line('M91.4 184C90.4 196 89.6 206 89 214', C1, 3.8) + K.stitch('M91.4 184C90.4 196 89.6 206 89 214', '#f3cf6b', 1.2);
    s += K.part('M52.4 172.2L63.6 163.8L69.6 171.8L58.4 180.2Z', '#6b3f1d', { line: '#2a160a', lw: 1.3 }) + K.line('M55.2 175.4L66.4 167M57.6 178.2L68.4 170.2', '#e2a857', 0.9, { op: 0.9 });
    const GV = { line: '#2a160a', lw: 1.2 };
    s += K.part('M63 165C61 157 55 152 49 153C45 154 44 158 46 162C48 166 51 170 55 172Z', '#8a5a2b', GV);
    s += this._charm(K, 45, 146, 12);
    s += K.part('M48.4 163C44 162.4 40.6 160 39.6 156.6C39.2 155 40.6 154 42 154.8C44.4 156.4 47 157.4 50 157.4Z', '#9c6632', GV);
    s += K.part('M54.6 152.6C56.6 151 59 151.8 59.2 154C59.4 156 58 157.4 56 157Z', '#9c6632', GV) + K.part('M55.6 147C57.6 145.6 60 146.6 60 148.8C60 150.8 58.4 152 56.6 151.4Z', '#9c6632', GV);
    s += K.spark(28, 126, 2.8, '#fff3b0', 'art-float') + K.spark(64, 124, 2.2, '#fde68a');

    // тёплый отсвет оберега на плаще и капюшоне
    const cl = K.id('lc'); K.def(`<clipPath id="${cl}"><path d="${CLOAK}"/><path d="${HOOD}"/></clipPath>`);
    s += `<rect clip-path="url(#${cl})" x="0" y="0" width="200" height="250" fill="${K.rad([[0, '#ffcf6b', 0.45], [0.5, '#ffb347', 0.1], [1, '#ffb347', 0]], 0.22, 0.6, 0.5)}"/>`;
    s += K.spark(188, 60, 2.4, '#e9d5ff') + K.spark(20, 196, 2, sh(eyes, 0.4), 'art-blink');
    return this._wrap(K, s, '0 0 200 240', 'hr');
  },

  // ночной двор: панельки с тёплыми окнами, тополя, мигающий фонарь у подъезда, лужа, в которой светится дух
  yard() {
    let seed = 42; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647, f = n => n.toFixed(1);
    const block = (x, top, w, fill) => {
      let s = `<rect x="${x}" y="${top}" width="${w}" height="${300 - top}" fill="${fill}"/><rect x="${x}" y="${top}" width="${w}" height="3" fill="#2a1a58"/>`;
      for (let yy = top + 12; yy < 250; yy += 16) for (let xx = x + 8; xx < x + w - 10; xx += 15) {
        const lit = r();
        if (lit > 0.74) s += `<rect x="${xx}" y="${yy}" width="7" height="9" rx="1" fill="${lit > 0.95 ? '#7dd3fc' : lit > 0.86 ? '#fcd34d' : '#fbbf24'}" opacity="${f(0.6 + r() * 0.4)}"/>`;
        else s += `<rect x="${xx}" y="${yy}" width="7" height="9" rx="1" fill="#0d0826"/>`;
      }
      return s + `<path d="M${x + w * 0.3} ${top} v-12 l-6 -6 M${x + w * 0.3} ${top - 12} l6 -6 M${x + w * 0.72} ${top} v-8" stroke="#1d1240" stroke-width="2" fill="none"/>`;
    };
    const poplar = (x, h) => `<path d="M${x} 262 C${x - 16} ${262 - h * 0.4} ${x - 10} ${262 - h * 0.9} ${x} ${262 - h} C${x + 10} ${262 - h * 0.9} ${x + 16} ${262 - h * 0.4} ${x} 262Z" fill="#0a0620"/><path d="M${x} 262 v12" stroke="#0a0620" stroke-width="3"/>`;
    return `<svg class="ts-yard" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>
      <radialGradient id="tyL"><stop offset="0" stop-color="#fde68a" stop-opacity=".75"/><stop offset=".35" stop-color="#fbbf24" stop-opacity=".25"/><stop offset="1" stop-color="#fbbf24" stop-opacity="0"/></radialGradient>
      <radialGradient id="tyP"><stop offset="0" stop-color="#a5f3fc" stop-opacity=".95"/><stop offset=".4" stop-color="#22d3ee" stop-opacity=".45"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>
      <linearGradient id="tyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1036"/><stop offset="1" stop-color="#07041a"/></linearGradient></defs>
      ${block(-10, 92, 130, '#140b30')}${block(250, 70, 160, '#120a2c')}${block(110, 132, 150, '#1a0f3a')}
      ${poplar(96, 120)}${poplar(236, 96)}${poplar(360, 110)}
      <rect x="0" y="262" width="400" height="38" fill="url(#tyG)"/><rect x="0" y="262" width="400" height="2" fill="#3b2a6e" opacity=".8"/>
      <g class="ty-lamp"><circle cx="318" cy="186" r="60" fill="url(#tyL)"/><path d="M318 186 V270" stroke="#0a0620" stroke-width="4"/><path d="M306 182 h24 l-4 -8 h-16z" fill="#0a0620"/><ellipse cx="318" cy="186" rx="8" ry="3" fill="#fef3c7"/></g>
      <ellipse cx="318" cy="275" rx="46" ry="6" fill="#fbbf24" opacity=".12"/>
      <ellipse cx="248" cy="282" rx="30" ry="6" fill="#0e1a3a"/><ellipse class="ty-puddle" cx="248" cy="281" rx="30" ry="9" fill="url(#tyP)"/>
      <circle cx="244" cy="279" r="1.6" fill="#fff"/><circle cx="252" cy="279" r="1.6" fill="#fff"/></svg>`;
  },
};
