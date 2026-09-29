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
})();
