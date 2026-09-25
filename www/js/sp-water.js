'use strict';
/* 4.6: духи стихии воды — каждый нарисован своей функцией (кисть — js/art-kit.js) */

(() => {
  // --- местные помощники (только для духов воды) ---
  const r1 = n => Math.round(n * 10) / 10;
  const INK = '#1b1030';
  const cl = (cls, d) => (cls ? ` class="${cls}"` : '') + (d ? ` style="animation-delay:-${d}s"` : '');
  // пузырёк с бликом
  const bubble = (x, y, r, d = 0) => `<g${cl('art-float', d)}><circle cx="${x}" cy="${y}" r="${r}" fill="#e0f7ff" fill-opacity=".16" stroke="#e0f7ff" stroke-opacity=".85" stroke-width="${r1(Math.max(1, r * 0.16))}"/>` +
    `<path d="M${r1(x - r * 0.6)} ${r1(y - r * 0.05)}Q${r1(x - r * 0.55)} ${r1(y - r * 0.6)} ${r1(x - r * 0.05)} ${r1(y - r * 0.62)}" fill="none" stroke="#fff" stroke-width="${r1(Math.max(1, r * 0.2))}" stroke-linecap="round"/></g>`;
  // капля: центр округлой части (x, y), радиус s, носик вверх
  const dropD = (x, y, s) => `M${x} ${r1(y - s * 1.5)}C${r1(x + s * 0.3)} ${r1(y - s * 0.8)} ${r1(x + s)} ${r1(y - s * 0.3)} ${r1(x + s)} ${r1(y + s * 0.15)}A${s} ${s} 0 0 1 ${r1(x - s)} ${r1(y + s * 0.15)}C${r1(x - s)} ${r1(y - s * 0.3)} ${r1(x - s * 0.3)} ${r1(y - s * 0.8)} ${x} ${r1(y - s * 1.5)}Z`;
  const drop = (x, y, s, c = '#bfeaff', cls = 'art-blink', d = 0) => `<g${cl(cls, d)}><path d="${dropD(x, y, s)}" fill="${c}" stroke="#0c4a7a" stroke-width="${r1(Math.max(0.8, s * 0.22))}" stroke-linejoin="round"/>` +
    `<ellipse cx="${r1(x - s * 0.35)}" cy="${y}" rx="${r1(s * 0.22)}" ry="${r1(s * 0.4)}" fill="#fff" opacity=".85"/></g>`;
  // снежинка о шести лучах
  const snow = (x, y, r, c = '#e0f2fe', cls = 'art-spin-soft', d = 0) => {
    let p = '';
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.PI / 6;
      const P = (t, off = 0) => `${r1(x + Math.cos(a + off) * t)} ${r1(y + Math.sin(a + off) * t)}`;
      p += `M${x} ${y}L${P(r)}M${P(r * 0.55)}L${P(r * 0.85, 0.42)}M${P(r * 0.55)}L${P(r * 0.85, -0.42)}`;
    }
    return `<g${cl(cls, d)}><path d="${p}" stroke="${c}" stroke-width="${r1(Math.max(1, r * 0.17))}" stroke-linecap="round" fill="none"/><circle cx="${x}" cy="${y}" r="${r1(r * 0.2)}" fill="#fff"/></g>`;
  };
  // нота (без текста — просто фигура)
  const note = (x, y, s, c, d = 0) => `<g${cl('art-float', d)}><ellipse cx="${x}" cy="${y}" rx="${r1(s * 0.58)}" ry="${r1(s * 0.42)}" transform="rotate(-25 ${x} ${y})" fill="${c}"/>` +
    `<path d="M${r1(x + s * 0.5)} ${y}V${r1(y - s * 1.9)}q${r1(s * 0.3)} ${r1(s * 0.5)} ${r1(s * 0.9)} ${r1(s * 0.8)}" stroke="${c}" stroke-width="${r1(s * 0.2)}" fill="none" stroke-linecap="round"/></g>`;
  // лист кувшинки на воде (с вырезом)
  const padD = (cx, cy, rx, ry) => `M${cx} ${cy}L${r1(cx + rx * 0.17)} ${r1(cy - ry * 0.98)}A${rx} ${ry} 0 1 1 ${r1(cx - rx * 0.34)} ${r1(cy - ry * 0.94)}Z`;
  const pad = (K, cx, cy, rx, ry, c = '#3fa34d') => K.part(padD(cx, cy, rx, ry), c, { line: '#14532d', lw: 1.6 }) +
    K.line(`M${cx} ${cy}l${r1(-rx * 0.6)} ${r1(ry * 0.3)}M${cx} ${cy}l${r1(rx * 0.6)} ${r1(ry * 0.3)}M${cx} ${cy}l0 ${r1(ry * 0.8)}`, '#1f6f3a', 1, { op: 0.6 });
  // цветок кувшинки: основание (x, y), лепестки веером вверх
  const lily = (K, x, y, s, rot = 0) => {
    const pet = 'M0 0C-3.5 -4 -3.5 -11 0 -15C3.5 -11 3.5 -4 0 0Z', pf = K.lin(['#ffffff', '#fdf2f8', '#f9a8d4']);
    let g = '';
    for (const a of [-78, 78, -52, 52, -26, 26, 0]) g += `<path d="${pet}" transform="rotate(${a})" fill="${pf}" stroke="#9d4b73" stroke-width="1.1"/>`;
    g += '<circle cy="-6" r="2.6" fill="#fcd34d" stroke="#a16207" stroke-width="1"/>';
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${g}</g>`;
  };
  // ракушка-гребешок: основание (x, y), веер вверх
  const shell = (K, x, y, s, rot, c) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0L-4 -2C-11 -4 -12 -12 -7 -15C-3 -18 3 -18 7 -15C12 -12 11 -4 4 -2Z" fill="${K.lin([K.shade(c, 0.45), c, K.shade(c, -0.2)])}" stroke="#7a3b2e" stroke-width="1.4" stroke-linejoin="round"/>` +
    '<path d="M0 -1L-8 -13M0 -1L-3 -16.5M0 -1L3 -16.5M0 -1L8 -13" stroke="#7a3b2e" stroke-width=".9" opacity=".55"/></g>';
  // мохнатый контур: овал с загнутыми пучками шерсти
  const fur = (cx, cy, rx, ry, n, amp, a0 = -Math.PI / 2) => {
    const pt = (a, k) => `${r1(cx + Math.cos(a) * rx * k)} ${r1(cy + Math.sin(a) * ry * k)}`, st = Math.PI * 2 / n;
    let d = `M${pt(a0, 1)}`;
    for (let i = 0; i < n; i++) { const a = a0 + i * st; d += `Q${pt(a + st * 0.3, 1 + amp * 0.95)} ${pt(a + st * 0.78, 1 + amp)}L${pt(a + st, 1)}`; }
    return d + 'Z';
  };
  // клуб пара
  const puff = (K, x, y, r, a = 0.5, d = 0) => {
    const g = K.rad([[0, '#ffffff', 0.95], [0.6, '#f8fafc', 0.7], [1, '#e2e8f0', 0]]);
    return `<g${cl('art-float', d)} opacity="${a}"><circle cx="${x}" cy="${y}" r="${r}" fill="${g}"/><circle cx="${r1(x - r * 0.85)}" cy="${r1(y + r * 0.3)}" r="${r1(r * 0.75)}" fill="${g}"/><circle cx="${r1(x + r * 0.9)}" cy="${r1(y + r * 0.25)}" r="${r1(r * 0.8)}" fill="${g}"/></g>`;
  };
  // дубовый лист: основание (x, y), длина len, поворот rot
  const oakD = 'M0 0C3 -4 6 -3 8 -6C11 -4 13 -8 16 -8C19 -6 21 -9 24 -7C27 -5 30 -5 34 0C30 5 27 5 24 7C21 9 19 6 16 8C13 8 11 4 8 6C6 3 3 4 0 0Z';
  const oak = (x, y, len, rot, c) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${r1(len / 34)})"><path d="${oakD}" fill="${c}" stroke="#1f3d0c" stroke-width="1.4" stroke-linejoin="round"/><path d="M2 0H30" stroke="#1f3d0c" stroke-width="1"/></g>`;
  // коса из звеньев
  const braid = (K, x, y, n, step, dx, c, line) => {
    const g = K.lin([K.shade(c, 0.35), c, K.shade(c, -0.3)]);
    let s = '';
    for (let i = 0; i < n; i++) {
      const cx = r1(x + dx * i), cy = r1(y + step * i), w = r1(6.4 - i * 0.35);
      s += `<path d="M${r1(cx - w)} ${cy}C${r1(cx - w)} ${r1(cy - 6)} ${r1(cx + w)} ${r1(cy - 6)} ${r1(cx + w)} ${cy}C${r1(cx + w)} ${r1(cy + 5)} ${cx} ${r1(cy + 7)} ${cx} ${r1(cy + 7)}C${cx} ${r1(cy + 7)} ${r1(cx - w)} ${r1(cy + 5)} ${r1(cx - w)} ${cy}Z" fill="${g}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>`;
    }
    return s;
  };
  const ellP = (K, cx, cy, rx, ry, rot, c, o) => { const e = K.ell(cx, cy, rx, ry, rot); return rot ? K.g(K.part(e.d, c, o), e.t) : K.part(e, c, o); };
  const ellV = (K, cx, cy, rx, ry, rot, o) => { const e = K.ell(cx, cy, rx, ry, rot); return rot ? K.vol(e.d, { ...o, t: e.t }) : K.vol(e, o); };

  Object.assign(SPIRIT_ART, {
    // Капелька: любопытная капля после дождя — прозрачная, с бликами; держит зонтик-листик и смотрит на дождь
    kapelka(K) {
      const body = 'M92 26C98 48 124 70 140 92C156 114 156 150 136 166C122 178 78 178 64 166C44 150 44 114 60 92C76 70 94 50 92 26Z';
      const water = { c1: '#bdf0ff', c2: '#2b8fd6', rim: '#e0f7ff', line: '#0f4f86' };
      let s = K.aura('#7dd3fc', 84, 124, 0.32);
      // лужица и круги по воде
      s += `<ellipse cx="100" cy="174" rx="66" ry="9" fill="${K.rad([[0, '#7dd3fc', 0.6], [1, '#2b8fd6', 0]])}"/>`;
      s += '<g class="art-aura"><ellipse cx="100" cy="174" rx="76" ry="10" fill="none" stroke="#bfeaff" stroke-width="1.6" opacity=".45"/><ellipse cx="100" cy="175" rx="94" ry="13" fill="none" stroke="#bfeaff" stroke-width="1.2" opacity=".22"/></g>';
      // косой дождик
      s += K.line('M28 30l-3 9M52 12l-3 9M20 72l-3 9M40 54l-2 6M184 96l-3 9M176 124l-2 6', '#bfeaff', 1.8, { op: 0.55 });
      // зонтик-листик: черенок и купол
      s += K.line('M152 34C156 62 160 92 158 122', '#1f5f2a', 5.5) + K.line('M152 34C156 62 160 92 158 122', '#7ad35f', 2.6);
      const canopy = 'M114 42C118 16 178 6 192 38C186 36 180 38 176 44C170 38 162 38 158 44C152 38 144 38 140 44C134 38 126 38 122 44C120 42 117 41 114 42Z';
      s += K.g(K.part(canopy, '#5cc45a', { line: '#1f5f2a', lw: 2.4 }) +
        K.line('M153 20L176 44M153 20L158 44M153 20L140 44M153 20L122 44M153 20L190 38M153 20L115 42', '#2f7d34', 1.3, { op: 0.8 }) +
        '<path d="M128 26C138 18 150 15 160 16" stroke="#e4ffb0" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>' +
        `<circle cx="160" cy="16" r="2.2" fill="#2f7d34"/>`, 'rotate(10 152 36)');
      // хохолок-завиток на макушке
      s += K.line('M92 28C84 22 84 12 92 11C97 11 98 16 95 18', '#0f4f86', 6.4) + K.line('M92 28C84 22 84 12 92 11C97 11 98 16 95 18', '#bdf0ff', 3.2);
      // тельце-капля
      s += K.vol(body, { ...water, rimK: 0.8, hiK: 0.3, texK: 0.16 });
      // прозрачность: свет собирается у донышка, блик-рефлекс по левому краю, пузырьки внутри
      s += `<ellipse cx="100" cy="154" rx="40" ry="17" fill="${K.rad([[0, '#f0fcff', 0.85], [1, '#bdf0ff', 0]])}"/>`;
      s += K.line('M60 116C56 132 58 146 68 158', '#fff', 4.5, { op: 0.5 }) + K.line('M130 150C126 158 118 164 110 166', '#fff', 2.4, { op: 0.45 });
      s += '<g fill="none" stroke="#fff" opacity=".6"><circle cx="122" cy="148" r="3.2" stroke-width="1.2"/><circle cx="131" cy="136" r="2" stroke-width="1"/><circle cx="114" cy="160" r="1.6" stroke-width="1"/></g>';
      s += K.gloss(80, 84, 10, 5.5, -55, 0.65) + K.spark(116, 70, 4, '#fff');
      // мордочка: брови домиком от любопытства, взгляд вверх — на дождь
      s += K.line('M72 101q8-6 16-3M108 98q8-3 16 3', INK, 2.6);
      s += K.eyes(98, 124, 19, 13, { iris: '#1e6fd0', look: [0.45, -0.55] });
      s += K.blush(68, 142, 8) + K.blush(130, 142, 8);
      s += K.mouth('open', 99, 142, 12);
      // ручки: левая — у щеки, правая держит черенок
      s += ellV(K, 52, 136, 8, 6.5, 30, { ...water, tex: false, lw: 2.2 });
      s += ellV(K, 157, 121, 8.5, 7, -20, { ...water, tex: false, lw: 2.2 });
      // капли с зонтика, пузырьки
      s += drop(194, 58, 2.8, '#bfeaff', 'art-float', 0.4) + drop(120, 58, 2.2, '#bfeaff', 'art-blink', 1);
      s += bubble(30, 112, 6, 0.4) + bubble(38, 148, 3.5, 1.2) + bubble(178, 146, 4.5, 0.8);
      return s;
    },

    // Лужница: растекается по тротуару и отражает ночное небо — звёзды, месяц, облачко в теле; озорно подмигивает, плещет ручками
    luzhnica(K) {
      const body = 'M100 64C130 64 146 88 148 114C150 130 160 136 174 142C190 150 186 172 164 175C140 179 60 179 36 175C14 172 10 150 26 142C40 136 50 130 52 114C54 88 70 64 100 64Z';
      let s = K.aura('#38bdf8', 90, 128, 0.3);
      // круги по воде и отбрызги
      s += '<g class="art-aura"><ellipse cx="100" cy="176" rx="98" ry="11" fill="none" stroke="#bae6fd" stroke-width="1.5" opacity=".35"/></g>';
      s += '<ellipse cx="12" cy="178" rx="8" ry="2.8" fill="#7dd3fc" stroke="#0b3766" stroke-width="1.4"/><ellipse cx="190" cy="176" rx="7" ry="2.6" fill="#7dd3fc" stroke="#0b3766" stroke-width="1.4"/>';
      // водяные ручки плещут вверх (из-за тела)
      s += K.mirror(K.part('M58 120C44 116 32 104 28 90C26 82 33 78 37 85C40 96 48 104 60 108Z', '#7dd3fc', { line: '#0b3766', lw: 2.4 }) +
        '<path d="M33 86C31 90 33 96 37 100" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>');
      // тело-лужа
      s += K.vol(body, { c1: '#a5e4fd', c2: '#1d6fb8', rim: '#bae6fd', rimK: 0.75, line: '#0b3766', texK: 0.18 });
      // в луже отражается ночное небо
      const cid = K.id('c');
      K.def(`<clipPath id="${cid}"><path d="${body}"/></clipPath>`);
      s += `<g clip-path="url(#${cid})"><path d="M0 142C40 132 160 132 200 142V200H0Z" fill="${K.lin(['#1e3a8a', '#0f1d4d'])}" opacity=".6"/>` +
        '<path d="M50 166c0-5 6-7 9-4 2-5 10-5 11 1 4 0 6 4 3 6H52c-2 0-3-1-2-3Z" fill="#e0f2fe" opacity=".55"/>' +
        '<path d="M146 146a8 8 0 1 0 7 12a6.5 6.5 0 1 1-7-12Z" fill="#fef9c3"/>' +
        '<ellipse cx="108" cy="164" rx="22" ry="3.5" fill="none" stroke="#fff" stroke-width="1.2" opacity=".35"/><ellipse cx="108" cy="164" rx="36" ry="6.5" fill="none" stroke="#fff" stroke-width="1" opacity=".2"/>' +
        K.spark(32, 156, 2.6, '#fff') + K.spark(90, 150, 2, '#fde68a') + K.spark(126, 170, 2.2, '#fff') + K.spark(172, 158, 2.4, '#fff') + K.spark(64, 150, 1.6, '#fff') + '</g>';
      s += K.line('M28 146C40 140 50 136 55 126', '#fff', 2.4, { op: 0.5 }) + K.gloss(78, 84, 10, 5.5, -40, 0.5);
      // лист-беретик на макушке и капелька на нём
      s += K.g(pad(K, 112, 66, 20, 6.5, '#4fb85a'), 'rotate(-10 112 66)');
      s += drop(104, 58, 3.2, '#bfeaff', 'art-float', 0.5);
      // мордочка: подмигивает и дразнится языком
      s += K.line('M70 88q10-9 22-3M110 94q9-3 18 2', INK, 2.8);
      s += `<g class="art-eyes">${K.eye(82, 106, 12, { iris: '#1d4ed8', look: [0.35, 0.1] })}</g>`;
      s += K.line('M108 108Q117 98 126 108', INK, 3.4) + K.line('M126 108l4 2M125 103l4-1', INK, 1.8);
      s += K.blush(68, 122, 7) + K.blush(134, 122, 7);
      s += K.mouth('grin', 102, 122, 16);
      s += `<path d="M103 130q1 8 6 8t6-9" fill="#f47a8f" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M109 131v4" stroke="#c24466" stroke-width="1.2" stroke-linecap="round"/>`;
      // брызги и пузырьки
      s += drop(22, 74, 3.2, '#bfeaff', 'art-float', 0) + drop(36, 64, 2.4, '#bfeaff', 'art-float', 0.6) + drop(178, 74, 3.2, '#bfeaff', 'art-float', 0.3) + drop(164, 64, 2.4, '#bfeaff', 'art-float', 0.9);
      s += bubble(152, 38, 5, 0.2) + bubble(168, 50, 3, 1.1) + bubble(42, 40, 3.6, 0.7);
      return s;
    },

    // Водяной: пузатый ворчливый дед-лягушка, борода из тины, венец из ракушек, посох-рогоз и утопленный телефон
    vodyanoy(K) {
      const skin = { c1: '#7ee8bf', c2: '#0f766e', rim: '#c8f3ff', line: '#063b36', texK: 0.14 };
      const body = 'M100 60C142 58 166 84 170 118C174 152 150 176 100 176C50 176 26 152 30 118C34 84 58 58 100 60Z';
      let s = K.aura('#2dd4bf', 92, 112, 0.28);
      // пруд под ногами, кувшинки
      s += `<ellipse cx="100" cy="175" rx="88" ry="11" fill="${K.rad([[0, '#38bdf8', 0.5], [1, '#0f766e', 0]])}"/>`;
      s += '<g class="art-aura"><ellipse cx="100" cy="175" rx="94" ry="12" fill="none" stroke="#a7f3d0" stroke-width="1.4" opacity=".35"/></g>';
      s += pad(K, 172, 174, 18, 6) + lily(K, 174, 171, 0.8);
      // посох-рогоз с листьями
      s += K.part('M30 176C22 150 14 132 8 118C18 128 28 146 34 172Z', '#65a30d', { line: '#1f4a0e', lw: 1.5 });
      s += K.line('M30 178C26 140 24 90 26 48', '#2c4a12', 5.5) + K.line('M30 178C26 140 24 90 26 48', '#8bb33f', 2.6);
      s += K.line('M26 28V14', '#2c4a12', 2.2) + K.part('M26 26C31 26 32 34 32 44C32 56 30 62 26 62C22 62 20 56 20 44C20 34 21 26 26 26Z', '#8a5a2b', { line: '#3b220e', lw: 1.8 });
      s += K.part('M36 176C40 156 50 146 60 140C52 150 44 160 40 176Z', '#4d8c16', { line: '#1f4a0e', lw: 1.4 });
      // перепончатые лапы
      s += K.mirror(K.vol(K.ell(70, 172, 17, 7), { ...skin, tex: false, lw: 2.4 }) +
        '<g fill="#5fd4a5" stroke="#063b36" stroke-width="1.6"><circle cx="54" cy="174" r="3.4"/><circle cx="62" cy="178" r="3.4"/><circle cx="73" cy="179" r="3.4"/></g>');
      // пузо
      s += K.vol(body, skin);
      s += '<g fill="#0f766e" opacity=".45"><ellipse cx="46" cy="104" rx="6" ry="4.5"/><ellipse cx="154" cy="100" rx="7" ry="5"/><ellipse cx="38" cy="132" rx="4" ry="3"/><ellipse cx="162" cy="130" rx="4.5" ry="3.4"/><ellipse cx="148" cy="80" rx="3.5" ry="2.6"/></g>';
      s += K.part('M100 104C130 104 148 124 148 146C148 166 128 174 100 174C72 174 52 166 52 146C52 124 70 104 100 104Z', '#bdf3d9', { line: '#0f766e', lw: 1.6 });
      s += K.line('M60 136Q100 146 140 136M56 152Q100 162 144 152M62 166Q100 174 138 166', '#6cc9a0', 1.6, { op: 0.75 });
      // левая лапа держит посох
      s += K.vol('M52 98C42 100 34 106 28 114L36 124C40 118 46 114 56 114Z', { ...skin, tex: false, lw: 2.4 });
      s += ellV(K, 29, 118, 10, 9, 0, { ...skin, tex: false, lw: 2.4 });
      s += '<g fill="#5fd4a5" stroke="#063b36" stroke-width="1.6"><circle cx="22" cy="111" r="3.4"/><circle cx="19" cy="119" r="3.4"/><circle cx="23" cy="127" r="3.4"/></g>';
      // правая лапа поднята: утопленный телефон, вернёт — если попросить вежливо
      s += K.vol('M146 104C156 98 162 90 166 80L178 86C174 98 166 110 154 118Z', { ...skin, tex: false, lw: 2.4 });
      s += K.g(`<rect x="161" y="36" width="22" height="40" rx="4.5" fill="#1f2937" stroke="#0b0f19" stroke-width="2"/><rect x="164" y="40" width="16" height="30" rx="2" fill="${K.lin(['#99f6e4', '#0e7490'])}"/>` +
        K.line('M168 42l4 9-3 5 5 9', '#fff', 1.2, { op: 0.8 }) + '<circle cx="176" cy="48" r="1.6" fill="#fff" opacity=".8"/><circle cx="167" cy="62" r="1.2" fill="#fff" opacity=".8"/>' +
        K.line('M158 44c6-5 12 2 18-2 4-2 7 1 9 6', '#4d7c0f', 2.6), 'rotate(14 172 58)');
      s += ellV(K, 171, 82, 10, 9, 0, { ...skin, tex: false, lw: 2.4 });
      s += '<g fill="#5fd4a5" stroke="#063b36" stroke-width="1.6"><circle cx="161" cy="75" r="3.4"/><circle cx="181" cy="74" r="3.2"/></g>';
      // глаза-бугры
      s += K.vol(K.ell(68, 62, 21, 19), { ...skin, texK: 0.1 }) + K.vol(K.ell(132, 62, 21, 19), { ...skin, texK: 0.1 });
      s += K.eyes(100, 64, 32, 12, { iris: '#f5c542', lid: 'half', skin: '#5fd4a5', look: [0, 0.3] });
      // кустистые брови из тины — нахмурены
      s += K.mirror(K.line('M48 50Q64 40 88 56', '#1d3a0c', 7) + K.line('M51 49Q64 42 86 55', '#8bb33f', 2.6));
      // ноздри, широкий ворчливый рот
      s += `<ellipse cx="94" cy="84" rx="2" ry="1.4" fill="${INK}"/><ellipse cx="106" cy="84" rx="2" ry="1.4" fill="${INK}"/>`;
      s += K.line('M62 98C74 90 88 88 100 88C112 88 126 90 138 98M62 98q-3 2-3 7M138 98q3 2 3 7', INK, 3.4);
      // борода из тины
      s += K.part('M74 98C72 114 74 130 78 146C80 154 84 150 85 144C86 156 90 166 94 158C96 152 97 162 100 172C103 162 104 152 106 158C110 166 114 156 115 144C116 150 120 154 122 146C126 130 128 114 126 98C112 104 88 104 74 98Z', '#7aa84a', { line: '#27461a', lw: 2 });
      s += K.line('M85 106C83 122 86 134 85 144M93 108C92 126 95 146 94 158M100 108C100 130 101 150 100 170M107 108C108 126 105 146 106 158M115 106C117 122 114 134 115 144', '#3f6b2a', 1.6);
      s += K.line('M80 106C79 118 81 128 81 136M96 112C96 126 98 138 97 150M104 112C104 128 103 142 103 156M119 106C120 118 118 128 118 136', '#c5e39a', 1.1, { op: 0.8 });
      s += '<g fill="#bef264" stroke="#27461a" stroke-width=".8"><circle cx="92" cy="126" r="2"/><circle cx="110" cy="132" r="1.6"/><circle cx="96" cy="144" r="1.5"/><circle cx="120" cy="120" r="1.8"/><circle cx="58" cy="118" r="1.6"/><circle cx="142" cy="140" r="1.7"/></g>';
      // висячие усы-сомы
      s += K.mirror(K.line('M90 90C76 92 62 100 54 114C50 122 52 132 46 138', '#27461a', 3.4) + K.line('M90 90C76 92 62 100 54 114', '#8bb33f', 1.2));
      // венец из ракушек и жемчуга
      s += K.line('M80 54Q100 44 120 54', '#e9d5a1', 5) + K.line('M80 54Q100 44 120 54', '#7a3b2e', 1, { op: 0.4 });
      s += shell(K, 86, 53, 0.95, -24, '#fde68a') + shell(K, 114, 53, 0.95, 24, '#fde68a') + shell(K, 100, 50, 1.3, 0, '#f9a8d4');
      s += '<g fill="#fff" stroke="#7a3b2e" stroke-width=".9"><circle cx="92.5" cy="51" r="2.4"/><circle cx="107.5" cy="51" r="2.4"/><circle cx="100" cy="27.5" r="2.2"/></g>';
      // пузыри и капли с телефона
      s += drop(188, 92, 2.6, '#bfeaff', 'art-float', 0.3) + drop(184, 106, 2, '#bfeaff', 'art-blink', 0.8);
      s += bubble(50, 24, 4, 0.2) + bubble(40, 76, 3, 1) + bubble(150, 20, 3.4, 0.6);
      return s;
    },

    // Русалка: сидит на камне набережной под полной луной, поёт; длинные зелёные волосы, венок из кувшинок, хвост с плавником
    rusalka(K) {
      const skin = { c1: '#fff6f1', c2: '#cfa99d', rim: '#c8f3ff', tex: false, line: '#3d2a2e', lw: 2.4 };
      const tail = 'M80 122C74 142 82 162 102 168C124 174 146 164 158 148L150 142C138 154 124 156 114 148C120 140 120 130 116 122Z';
      let s = K.aura('#2dd4bf', 94, 100, 0.42);
      // полная луна за головой
      s += `<circle class="art-aura" cx="100" cy="60" r="60" fill="${K.rad([[0.45, '#fef3c7', 0.45], [1, '#fef3c7', 0]])}"/>`;
      s += `<circle cx="100" cy="60" r="40" fill="${K.rad([[0, '#fffdf2'], [0.75, '#fdf0c2'], [1, '#f0d585']], 0.4, 0.35, 0.7)}"/>`;
      s += '<g fill="#e3c775" opacity=".45"><circle cx="76" cy="44" r="5"/><circle cx="128" cy="40" r="4"/><circle cx="130" cy="78" r="6"/><circle cx="70" cy="72" r="3.5"/></g>';
      s += K.spark(24, 26, 3.4, '#fff') + K.spark(176, 22, 3, '#fef3c7') + K.spark(160, 50, 2, '#fff') + K.spark(36, 90, 2.2, '#fff');
      // волосы сзади — льются до самой воды
      s += K.vol('M98 38C72 36 58 54 60 80C62 104 50 118 40 132C30 146 34 160 22 168C40 170 54 158 60 146C62 158 60 166 54 174C72 170 80 156 82 140C84 124 86 110 84 98L116 96C124 104 128 116 126 128C136 118 138 100 132 84C128 62 124 40 98 38Z',
        { c1: '#6ee7b7', c2: '#0b5f58', rim: '#c8f3ff', line: '#053d38', texK: 0.12 });
      s += K.line('M66 70C66 96 56 116 46 132M74 98C74 124 70 146 60 164M128 88C132 102 130 114 126 124', '#a7f3d0', 1.6, { op: 0.5 });
      // камень набережной
      s += K.vol('M40 178C36 162 50 150 70 148C86 146 96 152 112 150C134 146 158 156 162 178Z', { c1: '#7c8aa5', c2: '#27324a', tex: false, line: '#141b2b', rimK: 0.5 });
      s += K.line('M60 152c4 4 2 10 6 14M142 156c-2 5 1 9-2 13', '#0d9488', 2.2, { op: 0.7 });
      // хвост с чешуёй и плавник
      s += K.vol(tail, { c1: '#99f6e4', c2: '#0d9488', line: '#064e47', texK: 0.1 });
      const tc = K.id('c');
      K.def(`<clipPath id="${tc}"><path d="${tail}"/></clipPath>`);
      let sc = '';
      for (let r = 0; r < 6; r++) for (let x = 72 + (r % 2) * 4; x < 160; x += 8) sc += `M${x} ${130 + r * 8}q4 5 8 0`;
      s += `<path clip-path="url(#${tc})" d="${sc}" fill="none" stroke="#ccfbf1" stroke-width="1.2" opacity=".55"/>`;
      s += `<g class="art-sway">${K.part('M152 146C160 130 170 118 186 112C181 124 183 132 190 138C180 138 170 144 162 154Z', '#5eead4', { line: '#064e47', lw: 2, op: 0.95 })}` +
        K.line('M156 146L182 118M158 148L186 134M160 151L176 144', '#ccfbf1', 1.2, { op: 0.8 }) + '</g>';
      // оборка на поясе — переход рубахи в хвост
      s += K.part('M78 122C90 128 108 128 120 120L119 130C106 137 90 137 79 131Z', '#a7f3d0', { line: '#064e47', lw: 1.6 });
      // рубаха с вышитым воротом
      s += K.vol('M98 88C106 88 114 92 118 100C120 110 116 118 114 124L84 124C82 118 78 110 80 100C84 92 90 88 98 88Z', { c1: '#ffffff', c2: '#b8c6e0', tex: false, line: '#0f4a44', lw: 2.2 });
      s += K.stitch('M88 93Q98 102 108 93', '#0d9488', 1.8) + K.rhomb(98, 104, 2.6, '#fde68a', '#0f4a44');
      // руки: левая опирается о камень, правая у груди — поёт
      s += K.vol('M80 98C72 110 66 124 64 140L72 142C74 128 80 116 88 108Z', skin) + ellP(K, 68, 143, 7, 5, 0, '#fbe6de', { line: '#3d2a2e', lw: 2 });
      s += '<circle cx="54" cy="150" r="3.6" fill="#fff" stroke="#0f4a44" stroke-width="1"/><circle class="art-aura" cx="54" cy="150" r="8" fill="' + K.rad([[0, '#fff', 0.7], [1, '#a5f3fc', 0]]) + '"/>';
      s += K.vol('M116 98C124 106 128 116 126 126L118 126C118 118 116 110 112 104Z', skin) + ellP(K, 122, 128, 6.5, 5, 0, '#fbe6de', { line: '#3d2a2e', lw: 2 });
      // голова, чёлка набок и лёгкие пряди спереди
      s += K.vol(K.ell(98, 70, 23, 22), skin);
      s += K.part('M75 72C72 52 86 42 100 44C113 44 123 52 122 66C116 57 106 54 96 57C88 60 80 65 75 72Z', '#34d399', { line: '#053d38', lw: 2 });
      s += K.line('M100 46C94 50 88 56 84 62', '#a7f3d0', 1.4, { op: 0.8 });
      s += K.line('M77 66C72 82 77 96 71 110', '#0b5f58', 3.6) + K.line('M120 64C125 78 123 90 128 100', '#0b5f58', 3.6);
      // венок из кувшинок
      s += K.leaf(84, 50, 12, 200, '#22c55e') + K.leaf(112, 50, 12, -20, '#22c55e');
      s += lily(K, 80, 52, 0.62, -40) + lily(K, 116, 52, 0.62, 40) + lily(K, 98, 46, 0.78, 0);
      // мечтательное лицо: глаза подняты к луне, поёт
      s += K.line('M84 64q6-3 11 0M103 64q6-3 11 0', '#0b5f58', 1.8);
      s += K.eyes(99, 74, 9.5, 7.6, { iris: '#22d3ee', lash: true, look: [0.3, -0.6] });
      s += K.blush(84, 84, 5) + K.blush(114, 84, 5);
      s += `<ellipse cx="99" cy="87" rx="2.8" ry="3.4" fill="#6b1d2a" stroke="${INK}" stroke-width="1.6"/>`;
      // вода с лунной дорожкой
      s += `<path d="M6 172Q21 166 36 172T66 172T96 172T126 172T156 172T186 172L194 172V186H6Z" fill="${K.lin(['#2dd4bf', '#0b4f6c'])}" opacity=".78"/>`;
      s += K.line('M86 177H114M91 181H109M96 185H104', '#fef3c7', 2, { op: 0.85 }) + K.line('M20 178q8-3 16 0M160 178q8-3 16 0', '#ccfbf1', 1.4, { op: 0.6 });
      // песня — ноты и пузырьки
      s += note(150, 44, 6, '#a5f3fc', 0.2) + note(168, 80, 5, '#99f6e4', 1) + note(34, 54, 5, '#a5f3fc', 0.6);
      s += bubble(186, 100, 3.4, 0.4) + bubble(18, 110, 3, 1.3);
      return s;
    },

    // Банник: мохнатый хозяин бани сидит в шайке, в клубах пара, с дубовым веником; полотенце на голове, румяный и разомлевший
    bannik(K) {
      const fl = { c1: '#f7bf97', c2: '#9a4a2a', line: '#4a1e0c' };
      const wood = { c1: '#e0a468', c2: '#7a4220', rim: '#ffe0b0', tex: false, line: '#3d1d08' };
      let s = puff(K, 36, 56, 16, 0.5, 0) + puff(K, 166, 124, 14, 0.45, 1.2) + puff(K, 40, 104, 12, 0.4, 0.6) + puff(K, 168, 30, 10, 0.3, 1.6);
      // задний край шайки и вода в ней
      s += '<ellipse cx="100" cy="126" rx="62" ry="8" fill="#5a2e14" stroke="#3d1d08" stroke-width="2"/><ellipse cx="100" cy="127.5" rx="55" ry="5.5" fill="#7dd3fc" opacity=".85"/>';
      // мохнатое тело
      s += K.vol(fur(100, 96, 50, 46, 14, 0.13), { ...fl, texK: 0.12 });
      // веник: прутья и дубовые листья
      s += K.line('M150 104L166 56M154 104L170 58M146 102L162 56', '#6b3a1a', 3.2) + K.line('M152 84l8 3', '#e9d5a1', 4);
      s += oak(166, 58, 38, -128, '#3f6b12') + oak(168, 58, 40, -74, '#3f6b12') + oak(166, 58, 44, -104, '#4d7c0f') + oak(168, 58, 34, -52, '#65a30d') + oak(165, 58, 34, -150, '#65a30d') + oak(167, 58, 38, -90, '#65a30d');
      // шайка: клёпки, обручи, ушки
      s += K.mirror('<path d="M32 110C32 105 50 105 50 110V132H32Z" fill="#c98a50" stroke="#3d1d08" stroke-width="2" stroke-linejoin="round"/><ellipse cx="41" cy="116" rx="4" ry="3" fill="#3d1d08"/>');
      s += K.vol('M38 126C38 133 162 133 162 126L152 174C132 180 68 180 48 174Z', wood);
      s += K.line('M62 133L64 176M84 134L85 178M116 134L115 178M138 133L136 176', '#5a2e14', 1.6, { op: 0.55 });
      s += K.line('M42 146C80 154 120 154 158 146M47 164C80 171 120 171 153 164', '#4b5563', 4.5) + K.line('M42 145C80 153 120 153 158 145M47 163C80 170 120 170 153 163', '#cbd5e1', 1.4, { op: 0.8 });
      // ручки: левая держится за край шайки, правая — за веник
      s += K.part(fur(58, 126, 11, 9, 7, 0.22), '#e9a57c', { line: '#4a1e0c', lw: 2.2 }) + K.part(fur(150, 102, 11, 10, 7, 0.22), '#e9a57c', { line: '#4a1e0c', lw: 2.2 });
      // полотенце-рушник на голове с красной вышивкой
      s += K.vol('M56 66C54 42 76 28 100 28C124 28 146 42 144 66C130 58 116 56 100 56C84 56 70 58 56 66Z', { c1: '#ffffff', c2: '#c9ced8', tex: false, line: '#4b5060', rim: '#e0f7ff' });
      s += K.part('M124 34C138 26 152 30 156 44C152 42 146 44 142 48C140 40 134 36 126 38Z', '#f1f5f9', { line: '#4b5060', lw: 2 });
      s += K.part('M142 46C152 50 158 60 156 74L146 72C148 62 146 54 140 50Z', '#f1f5f9', { line: '#4b5060', lw: 2 }) + K.line('M147 67l9 1.5', '#dc2626', 2.4);
      s += K.stitch('M60 58C78 50 122 50 140 58', '#dc2626', 2.4) + K.line('M62 52C80 44 120 44 138 52', '#dc2626', 1.2);
      s += K.rhomb(84, 46, 3, '#dc2626', '#7f1d1d') + K.rhomb(100, 44, 3.6, '#dc2626', '#7f1d1d') + K.rhomb(116, 46, 3, '#dc2626', '#7f1d1d');
      // сонные глаза, белые кустистые брови
      s += K.eyes(100, 80, 17, 8.5, { iris: '#7c3a1a', lid: 'half', skin: '#eaa57b' });
      s += K.mirror(K.line('M70 68Q80 61 92 68', '#6b3a22', 7) + K.line('M70 68Q80 61 92 68', '#f8fafc', 4.4));
      // борода-облако поверх края шайки, усы, нос-картошка, румянец
      s += '<ellipse cx="68" cy="96" rx="11" ry="7" fill="#ff4d4d" opacity=".42"/><ellipse cx="132" cy="96" rx="11" ry="7" fill="#ff4d4d" opacity=".42"/>';
      s += K.vol(fur(100, 124, 30, 24, 10, 0.15, -Math.PI / 2 + 0.2), { c1: '#ffffff', c2: '#b8bcc6', tex: false, line: '#5b5f6b', rim: '#e0f7ff' });
      s += K.line('M88 118c2 8 0 16 4 22M104 120c-2 8 2 14 0 22M116 116c2 6 0 12 3 18', '#9ca3af', 1.4, { op: 0.8 });
      s += K.mirror(K.part('M100 104C92 100 80 102 70 112C80 117 94 114 100 108Z', '#f1f5f9', { line: '#5b5f6b', lw: 1.8 }));
      s += K.vol(K.ell(100, 98, 9, 8), { c1: '#ffa08a', c2: '#d2402f', tex: false, lw: 2.2, rim: '#ffe0d0' });
      // капли пота, пар поднимается
      s += drop(60, 76, 2.8, '#e0f7ff', 'art-blink', 0.3) + drop(142, 84, 2.4, '#e0f7ff', 'art-blink', 1);
      s += K.line('M70 136c-6-10 6-16 0-26M132 138c6-10-6-16 0-26M100 186c-5-8 5-12 0-20', '#ffffff', 3, { op: 0.45, cls: 'art-float' });
      s += puff(K, 164, 164, 12, 0.5, 0.9) + puff(K, 34, 168, 10, 0.45, 0.3);
      return s;
    },

    // Алконост: райская птица радости с девичьим ликом в короне, радужные крылья вразлёт, стоит на морской волне
    alkonost(K) {
      let s = K.aura('#67e8f9', 96, 100, 0.45);
      s += `<circle class="art-aura" cx="100" cy="66" r="46" fill="${K.rad([[0.2, '#fde047', 0.45], [1, '#fde047', 0]])}"/>`;
      // хвостовые перья веером вниз
      s += K.mirror(K.part('M96 148C82 160 60 168 30 168C42 177 70 178 98 158Z', '#22d3ee', { line: '#083a4a', lw: 1.8 }) +
        K.part('M98 152C88 166 74 176 54 184C70 187 88 178 100 160Z', '#0891b2', { line: '#083a4a', lw: 1.8 }) +
        '<ellipse cx="40" cy="170" rx="6" ry="3.8" fill="#fde047" stroke="#083a4a" stroke-width="1.2"/><ellipse cx="40" cy="170" rx="2.8" ry="2" fill="#7c3aed"/>');
      // радужные крылья (машут от плеча)
      const wing = K.part('M88 112C76 84 50 50 16 26C18 44 16 52 22 62C18 72 20 80 28 88C26 98 32 106 42 110C44 118 54 122 64 122C74 124 82 120 88 112Z', '#8b5cf6', { line: '#2e1065', lw: 2 }) +
        K.line('M84 110L26 40M82 112L28 70M80 114L38 98M78 116L56 118', '#ddd6fe', 1.2, { op: 0.6 }) +
        K.part('M88 110C78 88 58 62 32 44C32 58 30 64 36 72C34 80 38 88 46 92C46 100 54 106 62 108C70 114 80 114 88 110Z', '#22d3ee', { line: '#083a4a', lw: 1.6 }) +
        K.part('M88 108C80 92 68 78 50 66C50 76 50 80 56 86C56 92 62 98 70 100C74 106 82 108 88 108Z', '#4ade80', { line: '#14532d', lw: 1.5 }) +
        K.part('M88 106C84 96 76 88 66 82C66 90 70 96 76 100C80 104 84 106 88 106Z', '#fde047', { line: '#854d0e', lw: 1.4 }) +
        '<g fill="#fde047" stroke="#2e1065" stroke-width=".8"><circle cx="18" cy="30" r="2.2"/><circle cx="21" cy="62" r="2"/><circle cx="27" cy="88" r="2"/><circle cx="41" cy="110" r="2"/></g>';
      s += K.mirror(K.g(wing, null, 'art-wing'));
      // волосы за головой
      s += K.vol('M100 48C82 48 76 60 77 74C78 88 72 100 62 110C72 113 80 106 84 98L116 98C120 106 128 113 138 110C128 100 122 88 123 74C124 60 118 48 100 48Z', { c1: '#2fb4d4', c2: '#0b4a5e', line: '#062a36', texK: 0.12 });
      // тело-птица с золотой грудкой
      s += K.vol('M100 90C124 90 136 110 134 128C132 146 118 156 100 158C82 156 68 146 66 128C64 110 76 90 100 90Z', { c1: '#a5f3fc', c2: '#0e7490', line: '#083a4a' });
      const bc = K.id('c');
      K.def(`<clipPath id="${bc}"><path d="M100 90C124 90 136 110 134 128C132 146 118 156 100 158C82 156 68 146 66 128C64 110 76 90 100 90Z"/></clipPath>`);
      let fe = '';
      for (let r = 0; r < 6; r++) for (let x = 60 + (r % 2) * 5; x < 140; x += 10) fe += `M${x} ${104 + r * 9}q5 7 10 0`;
      s += `<path clip-path="url(#${bc})" d="${fe}" fill="none" stroke="#083a4a" stroke-width="1.3" opacity=".35"/>`;
      s += K.part('M86 102C92 114 108 114 114 102C120 118 118 140 100 152C82 140 80 118 86 102Z', '#fcd34d', { line: '#854d0e', lw: 1.6 });
      s += K.line('M88 116q4 4 8 0q4 4 8 0q4 4 8 0M88 126q4 4 8 0q4 4 8 0q4 4 8 0M92 136q4 4 8 0q4 4 8 0', '#b45309', 1.2, { op: 0.7 });
      // шея с жемчужным ожерельем
      s += K.part('M93 84H107V96C104 98 96 98 93 96Z', '#ffe2cc', { line: '#7a3b1e', lw: 1.6 });
      s += '<g fill="#fff" stroke="#083a4a" stroke-width=".8"><circle cx="90" cy="96" r="2"/><circle cx="95" cy="98.5" r="2"/><circle cx="100" cy="99.5" r="2.2"/><circle cx="105" cy="98.5" r="2"/><circle cx="110" cy="96" r="2"/></g>';
      // лапки на гребне волны
      s += K.line('M93 154L91 165M107 154L109 165M91 165l-5 3M91 165l0 4M109 165l5 3M109 165l0 4', '#d97706', 2.6);
      // девичий лик
      s += K.vol(K.ell(100, 68, 19, 20), { c1: '#fff1e6', c2: '#e0a88a', tex: false, line: '#5a2a14', lw: 2.4 });
      s += K.part('M80 66C80 54 90 50 100 52C110 50 120 54 120 66C112 60 106 60 100 63C94 60 88 60 80 66Z', '#1797b8', { line: '#062a36', lw: 1.8 });
      s += K.closed(100, 72, 8, 5.5, true) + K.line('M86 71l-3-2M114 71l3-2', INK, 1.6);
      s += K.blush(88, 79, 4.5) + K.blush(112, 79, 4.5) + K.mouth('smile', 100, 80, 8);
      // царская корона с каменьями
      s += K.part('M80 54L83 32L92 44L100 20L108 44L117 32L120 54Q100 48 80 54Z', '#fcd34d', { line: '#7c4a03', lw: 2 });
      s += K.stitch('M82 51Q100 46 118 51', '#fff7d6', 1.4);
      s += `<circle cx="100" cy="40" r="3.4" fill="#e11d48" stroke="#7c4a03" stroke-width="1"/><circle cx="87" cy="46" r="2.2" fill="#22d3ee" stroke="#7c4a03" stroke-width=".8"/><circle cx="113" cy="46" r="2.2" fill="#22d3ee" stroke="#7c4a03" stroke-width=".8"/>`;
      s += '<g fill="#fff" stroke="#7c4a03" stroke-width=".8"><circle cx="83" cy="31" r="2.2"/><circle cx="100" cy="19" r="2.4"/><circle cx="117" cy="31" r="2.2"/></g>';
      // морская волна с барашком
      s += K.part('M6 188C8 168 22 150 44 148C60 146 70 156 66 166C62 160 54 160 52 166C50 172 58 176 70 174C84 172 92 164 106 164C124 164 138 172 156 170C172 168 184 160 194 154V190H6Z', '#38bdf8', { line: '#063a5c', lw: 2 });
      s += K.line('M20 164C28 152 50 146 62 156M40 176C36 168 44 162 50 166M110 170C124 170 140 176 156 176M160 176C172 174 182 168 190 164', '#fff', 2, { op: 0.75 });
      s += '<g fill="#fff"><circle cx="70" cy="150" r="2"/><circle cx="76" cy="156" r="1.4"/><circle cx="196" cy="150" r="1.6"/><circle cx="184" cy="152" r="1.2"/></g>';
      s += K.spark(24, 124, 3, '#fde047') + K.spark(176, 120, 3, '#fde047') + K.spark(148, 22, 2.4, '#fff') + K.spark(52, 20, 2.4, '#fff');
      return s;
    },

    // Снегурка: девочка из снега на коньках — голубая шубка с узором, кокошник со снежинкой, коса с лентой, варежки
    snegurka(K) {
      const coat = { c1: '#a8dcfb', c2: '#1f7fc4', line: '#0b3a66', texK: 0.14 };
      let s = snow(28, 40, 8, '#e0f2fe', 'art-spin-soft', 0) + snow(172, 30, 6.5, '#e0f2fe', 'art-spin-soft', 0.8) + snow(20, 98, 5, '#bfdbfe', 'art-spin-soft', 1.5) + snow(182, 124, 6, '#e0f2fe', 'art-spin-soft', 0.4);
      // волосы за головой
      s += K.vol('M100 48C80 48 72 62 74 78C74 90 78 98 84 102L116 102C122 98 126 90 126 78C128 62 120 48 100 48Z', { c1: '#eef6ff', c2: '#8fb3dc', line: '#34507a', tex: false });
      // коньки: левый стоит на льду, правый отведён назад
      const skate = (x, y) => `<path d="M${x - 4} ${y + 7}H${x + 20}q4 0 5-3" stroke="#475569" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M${x - 4} ${y + 7}H${x + 20}q4 0 5-3" stroke="#e2e8f0" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
        `<path d="M${x + 2} ${y + 3}v4M${x + 14} ${y + 3}v4" stroke="#475569" stroke-width="2"/>` +
        K.part(`M${x} ${y - 12}V${y}C${x} ${y + 4} ${x + 18} ${y + 4} ${x + 18} ${y}L${x + 16} ${y - 12}Z`, '#f8fafc', { line: '#334155', lw: 1.8 }) + K.line(`M${x + 3} ${y - 9}h10M${x + 3} ${y - 5}h11`, '#38bdf8', 1.4);
      s += K.g(skate(138, 172), 'rotate(-28 148 168)') + skate(84, 176);
      // шубка
      s += K.vol('M100 90C112 90 120 96 122 106L148 154C152 164 140 170 100 170C60 170 48 164 52 154L78 106C80 96 88 90 100 90Z', coat);
      s += K.stitch('M58 150C80 155 120 155 142 150', '#e0f2fe', 1.8);
      s += K.rhomb(72, 132, 4, '#e0f2fe', '#0b3a66') + K.rhomb(128, 132, 4, '#e0f2fe', '#0b3a66') + K.rhomb(80, 116, 3, '#e0f2fe', '#0b3a66') + K.rhomb(120, 116, 3, '#e0f2fe', '#0b3a66');
      s += snow(64, 144, 3.6, '#e0f2fe', null) + snow(136, 144, 3.6, '#e0f2fe', null);
      // меховая опушка: подол и полочка
      s += K.part('M96 97C98 96 102 96 104 97L109 156H91Z', '#f8fafc', { line: '#64748b', lw: 1.6 }) + K.stitch('M92 104L88 150M108 104L112 150', '#bfdbfe', 1.4);
      s += '<g fill="#38bdf8" stroke="#0b3a66" stroke-width=".8"><circle cx="100" cy="108" r="2"/><circle cx="100" cy="122" r="2"/><circle cx="100" cy="136" r="2"/></g>';
      s += K.part('M52 160C57 156 61 161 66 158C72 163 78 158 84 162C90 158 96 163 100 160C104 163 110 158 116 162C122 158 128 163 134 158C139 161 143 156 148 160C152 164 150 169 146 171C130 175 70 175 54 171C50 169 48 164 52 160Z', '#f8fafc', { line: '#64748b', lw: 1.8 });
      // рукава: левая рука в сторону-вниз, правая вверх — ловит равновесие
      s += K.vol('M82 98C72 100 60 108 48 118C44 122 48 130 54 128C66 122 76 116 86 112Z', { ...coat, texK: 0.1 });
      s += K.vol('M118 98C128 96 140 88 150 80C154 76 160 82 156 88C146 98 134 108 116 112Z', { ...coat, texK: 0.1 });
      s += ellP(K, 50, 124, 6.5, 8, 35, '#f8fafc', { line: '#64748b', lw: 1.6 }) + ellP(K, 154, 84, 6.5, 8, -45, '#f8fafc', { line: '#64748b', lw: 1.6 });
      s += ellP(K, 42, 131, 8, 7.5, 0, '#bfdbfe', { line: '#1e3a8a', lw: 2 }) + ellP(K, 161, 77, 8, 7.5, 0, '#bfdbfe', { line: '#1e3a8a', lw: 2 });
      s += snow(42, 131, 3.8, '#fff', null) + snow(161, 77, 3.8, '#fff', null);
      // голова и чёлка
      s += K.vol(K.ell(100, 72, 21, 21), { c1: '#fdfcff', c2: '#c7d7ee', tex: false, line: '#314a70', lw: 2.4, rim: '#e0f2fe' });
      s += K.part('M79 68C77 56 88 50 100 52C112 50 123 56 121 68C116 62 108 58 100 61C92 58 84 62 79 68Z', '#dbeafe', { line: '#34507a', lw: 1.8 });
      // коса через плечо с голубой лентой
      s += braid(K, 119, 96, 6, 9, 0.6, '#dbeafe', '#34507a');
      s += K.part('M122 148C114 140 108 150 116 153ZM122 148C130 140 136 150 128 153Z', '#38bdf8', { line: '#0b3a66', lw: 1.4 }) + K.line('M121 150l-3 10M123 150l4 9', '#38bdf8', 2.2);
      // кокошник со снежинкой и жемчугом, поднизь на лбу
      s += K.part('M72 64C70 42 84 24 100 20C116 24 130 42 128 64C120 58 110 56 100 56C90 56 80 58 72 64Z', '#cfeeff', { line: '#1e4f86', lw: 2.2 });
      s += K.line('M77 60C77 44 87 31 100 27C113 31 123 44 123 60', '#fff', 1.6, { op: 0.85 });
      s += snow(100, 40, 8, '#1e6fb8', null) + K.rhomb(84, 48, 3, '#38bdf8', '#1e4f86') + K.rhomb(116, 48, 3, '#38bdf8', '#1e4f86');
      s += '<g fill="#fff" stroke="#1e4f86" stroke-width=".8"><circle cx="72.5" cy="52" r="1.8"/><circle cx="75.5" cy="40" r="1.8"/><circle cx="82.5" cy="30" r="1.8"/><circle cx="91.5" cy="23" r="1.8"/><circle cx="100" cy="20" r="2.2"/><circle cx="108.5" cy="23" r="1.8"/><circle cx="117.5" cy="30" r="1.8"/><circle cx="124.5" cy="40" r="1.8"/><circle cx="127.5" cy="52" r="1.8"/></g>';
      s += '<g fill="#fff" stroke="#1e4f86" stroke-width=".6"><circle cx="82" cy="60" r="1.3"/><circle cx="87" cy="58.6" r="1.3"/><circle cx="93" cy="57.6" r="1.3"/><circle cx="100" cy="57.2" r="1.4"/><circle cx="107" cy="57.6" r="1.3"/><circle cx="113" cy="58.6" r="1.3"/><circle cx="118" cy="60" r="1.3"/></g>';
      // личико: большие глаза, румянец с мороза
      s += K.eyes(100, 77, 9.5, 7, { iris: '#0284c7', lash: true, look: [0.1, 0.15] });
      s += '<ellipse cx="84" cy="85" rx="5.5" ry="3.4" fill="#ff7aa8" opacity=".6"/><ellipse cx="116" cy="85" rx="5.5" ry="3.4" fill="#ff7aa8" opacity=".6"/>';
      s += K.mouth('smile', 100, 86, 8);
      // снежинки впереди, искры льда
      s += snow(30, 156, 4.5, '#e0f2fe', 'art-blink', 0.5) + snow(172, 156, 4, '#e0f2fe', 'art-blink', 1.1);
      s += K.spark(76, 186, 2.6, '#fff') + K.spark(160, 176, 2.2, '#e0f2fe') + K.spark(56, 72, 2.2, '#fff');
      return s;
    },

    // Берегиня: дева с воздетыми руками (как на вышивке-обереге) в кокошнике, у реки среди рогоза; подол растворяется в воде
    bereginya(K) {
      const skin = { c1: '#fff1e6', c2: '#e0a283', tex: false, line: '#6b3420', lw: 2 };
      let s = K.aura('#38bdf8', 96, 96, 0.45);
      // солнечный венец-оберег за головой
      s += `<circle cx="100" cy="64" r="44" fill="${K.rad([[0.4, '#fef08a', 0.5], [1, '#fef08a', 0]])}"/>`;
      s += '<circle cx="100" cy="64" r="33" fill="none" stroke="#fde68a" stroke-width="2.6"/>' + K.stitch(K.ell(100, 64, 28, 28), '#fef9c3', 1.4);
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; s += K.rhomb(r1(100 + Math.cos(a) * 38), r1(64 + Math.sin(a) * 38), 2.6, '#fde047', '#854d0e'); }
      // рогоз по берегам
      s += K.mirror(K.part('M28 176C20 150 12 130 6 118C16 128 26 146 32 172Z', '#4d8c16', { line: '#1f4a0e', lw: 1.4 }) +
        K.line('M24 176C22 140 22 110 24 86M36 176C36 150 38 128 40 114', '#2c4a12', 2.6) +
        K.part('M24 64C28 64 29 72 29 78C29 86 27 90 24 90C21 90 19 86 19 78C19 72 20 64 24 64Z', '#8a5a2b', { line: '#3b220e', lw: 1.4 }) +
        K.part('M40 96C43 96 44 102 44 107C44 113 42 116 40 116C38 116 36 113 36 107C36 102 37 96 40 96Z', '#8a5a2b', { line: '#3b220e', lw: 1.4 }) +
        K.part('M30 176C34 150 44 132 54 124C46 136 38 152 36 174Z', '#65a30d', { line: '#1f4a0e', lw: 1.4 }));
      // воздетые руки: широкие рукава с красными обшлагами, открытые ладони
      s += K.mirror(K.vol('M88 100C78 90 68 72 62 52L42 58C46 80 58 100 76 112C80 114 86 112 88 108Z', { c1: '#ffffff', c2: '#b9cfe0', tex: false, line: '#3a4a5c' }) +
        K.part('M63 55L41 61L39 53L61 47Z', '#dc2626', { line: '#7f1d1d', lw: 1.4 }) + K.stitch('M60 51L42 56', '#fde047', 1.2) +
        K.vol('M44 52C40 44 40 34 43 28C45 24 50 24 51 28C52 24 56 24 57 29C58 34 59 38 61 40C64 38 67 41 65 45C63 49 58 53 52 54Z', { ...skin, c1: '#ffe6d6', c2: '#d98f6c' }) +
        K.line('M49 30V38M54 30V39', '#b07050', 1, { op: 0.7 }));
      // волосы за головой
      s += K.vol('M100 50C84 50 78 62 80 76C80 86 84 94 88 96L112 96C116 94 120 86 120 76C122 62 116 50 100 50Z', { c1: '#e9c989', c2: '#9a6a2a', tex: false, line: '#4a2e0e' });
      // сарафан поверх рубахи
      s += K.vol('M100 88C112 88 120 94 121 104C124 124 136 148 150 172H50C64 148 76 124 79 104C80 94 88 88 100 88Z', { c1: '#6cc3f0', c2: '#0369a1', line: '#06304f', texK: 0.16 });
      s += K.part('M82 96C90 92 110 92 118 96C116 104 108 108 100 108C92 108 84 104 82 96Z', '#f8fafc', { line: '#3a4a5c', lw: 1.6 });
      s += K.stitch('M85 98C92 104 108 104 115 98', '#dc2626', 1.6) + K.rhomb(100, 101, 3.4, '#dc2626', '#7f1d1d') + '<circle cx="100" cy="101" r="1" fill="#fde047"/>';
      s += K.part('M96 108H104L110 170H90Z', '#fde047', { line: '#854d0e', lw: 1.4 });
      s += '<g fill="#dc2626" stroke="#7f1d1d" stroke-width=".8"><circle cx="100" cy="116" r="2"/><circle cx="100.5" cy="126" r="2"/><circle cx="101" cy="136" r="2"/><circle cx="101.5" cy="146" r="2"/></g>';
      s += K.stitch('M62 152C80 157 120 157 138 152', '#fde047', 2.4);
      s += K.rhomb(70, 150, 3.4, '#dc2626', '#fde047') + K.rhomb(84, 153, 3.4, '#dc2626', '#fde047') + K.rhomb(116, 153, 3.4, '#dc2626', '#fde047') + K.rhomb(130, 150, 3.4, '#dc2626', '#fde047');
      // две косы по плечам
      s += braid(K, 85, 94, 5, 9, -0.6, '#e0b565', '#4a2e0e') + braid(K, 115, 94, 5, 9, 0.6, '#e0b565', '#4a2e0e');
      s += '<path d="M79 136l-4 8M83 136l2 8M117 136l-2 8M121 136l4 8" stroke="#dc2626" stroke-width="2.4" stroke-linecap="round"/>';
      // голова, пробор
      s += K.vol(K.ell(100, 72, 19, 20), { ...skin, lw: 2.4 });
      s += K.part('M81 74C80 60 90 54 100 56C110 54 120 60 119 74C113 66 106 62 100 62C94 62 87 66 81 74Z', '#d9b36e', { line: '#4a2e0e', lw: 1.6 });
      // высокий золотой кокошник с синим очельем
      s += K.part('M76 66C74 50 86 34 100 14C114 34 126 50 124 66C116 60 108 58 100 58C92 58 84 60 76 66Z', '#facc15', { line: '#6b4a05', lw: 2.2 });
      s += K.part('M82 60C82 48 90 38 100 26C110 38 118 48 118 60C112 57 106 56 100 56C94 56 88 57 82 60Z', '#0369a1', { line: '#06304f', lw: 1.4 });
      s += K.rhomb(100, 44, 5.4, '#fde047', '#6b4a05') + K.rhomb(100, 44, 2, '#dc2626', '#7f1d1d') + K.rhomb(89, 52, 2.4, '#7dd3fc', '#06304f') + K.rhomb(111, 52, 2.4, '#7dd3fc', '#06304f');
      s += '<circle cx="100" cy="12" r="3" fill="#fff" stroke="#6b4a05" stroke-width="1"/>';
      s += '<g fill="#fff" stroke="#6b4a05" stroke-width=".6"><circle cx="83" cy="63" r="1.3"/><circle cx="88" cy="61.6" r="1.3"/><circle cx="94" cy="60.8" r="1.3"/><circle cx="100" cy="60.5" r="1.4"/><circle cx="106" cy="60.8" r="1.3"/><circle cx="112" cy="61.6" r="1.3"/><circle cx="117" cy="63" r="1.3"/></g>';
      // спокойное лицо
      s += K.line('M87 67q5-3 10-1M103 66q5-2 10 1', '#8a5a2b', 1.8) + K.eyes(100, 76, 8.5, 6.5, { iris: '#0284c7', lash: true, look: [0, 0.2] });
      s += K.blush(86, 84, 4.5) + K.blush(114, 84, 4.5) + K.mouth('smile', 100, 85, 6.5);
      // река — подол уходит в воду
      s += `<path d="M4 166C24 158 44 170 70 164C94 158 116 170 140 164C160 158 178 164 196 158V190H4Z" fill="${K.lin(['#7dd3fc', '#0369a1'])}" opacity=".92"/>`;
      s += K.line('M14 176C30 170 46 180 64 174C82 168 98 178 116 172C134 166 152 176 170 170M30 186C46 182 60 188 76 184M120 186C136 182 152 188 170 184', '#e0f2fe', 1.8, { op: 0.6 });
      // капли силы поднимаются к ладоням
      s += K.mirror(`<circle class="art-aura" cx="50" cy="14" r="9" fill="${K.rad([[0, '#fff'], [0.4, '#7dd3fc', 0.8], [1, '#38bdf8', 0]])}"/>` + drop(50, 16, 3, '#e0f7ff', 'art-float', 0));
      s += drop(34, 150, 2.4, '#e0f7ff', 'art-float', 0.7) + drop(166, 146, 2.4, '#e0f7ff', 'art-float', 1.2);
      return s;
    },

    // Индрик-зверь: всем зверям отец — могучий зверь с витым рогом, под землёй прочищает реки; солнце-венец, струи, узоры
    indrik(K) {
      const hide = { c1: '#eef0ff', c2: '#4338ca', rim: '#a5f3fc', rimK: 0.8, line: '#1e1b5a', texK: 0.16 };
      const far = { c1: '#a9b1f5', c2: '#2e2790', rim: '#67e8f9', rimK: 0.5, line: '#15123f', texK: 0.1 };
      let s = K.aura('#38bdf8', 98, 104, 0.55);
      // подземный пласт и светящаяся подземная река
      s += `<path d="M0 166C40 160 160 160 200 166V200H0Z" fill="${K.lin(['#312e81', '#140f3a'])}" opacity=".9"/>`;
      s += K.line('M0 186C30 180 60 190 100 184C140 178 170 188 200 182', '#67e8f9', 6, { op: 0.3 }) + K.line('M0 186C30 180 60 190 100 184C140 178 170 188 200 182', '#e0f7ff', 1.6, { op: 0.9 });
      s += K.rhomb(24, 176, 2.6, '#67e8f9', '#1e1b5a') + K.rhomb(170, 194, 2.2, '#a5f3fc', '#1e1b5a') + K.rhomb(120, 194, 1.8, '#67e8f9', '#1e1b5a');
      // солнце-венец за головой: «ходит под землёй, как солнце по небу»
      s += `<circle class="art-aura" cx="158" cy="52" r="46" fill="${K.rad([[0.3, '#fde68a', 0.55], [1, '#fde68a', 0]])}"/>`;
      s += '<circle cx="158" cy="52" r="33" fill="none" stroke="#fcd34d" stroke-width="2.6"/><circle cx="158" cy="52" r="28" fill="none" stroke="#fef3c7" stroke-width="1.2" stroke-dasharray="2 3"/>';
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; s += K.line(`M${r1(158 + Math.cos(a) * 36)} ${r1(52 + Math.sin(a) * 36)}L${r1(158 + Math.cos(a) * 42)} ${r1(52 + Math.sin(a) * 42)}`, '#fde68a', 2.2, { op: 0.9 }); }
      // родники бьют из-под земли
      const spray = 'M24 168C22 152 24 140 30 128M24 168C20 154 14 146 6 140M24 168C26 156 32 150 40 146M182 170C182 154 178 142 172 132M182 170C186 156 192 148 198 142';
      s += K.line(spray, '#38bdf8', 5, { op: 0.45 }) + K.line(spray, '#e0f7ff', 1.6, { op: 0.9 });
      s += drop(30, 122, 2.8, '#bfeaff', 'art-float', 0) + drop(6, 134, 2.2, '#bfeaff', 'art-float', 0.7) + drop(42, 140, 2, '#bfeaff', 'art-float', 1.2) + drop(172, 126, 2.6, '#bfeaff', 'art-float', 0.4) + drop(197, 136, 2, '#bfeaff', 'art-float', 1);
      // хвост-поток
      s += K.part('M50 104C34 92 16 98 14 116C12 134 26 146 14 164C34 162 44 146 42 130C40 118 44 112 52 112Z', '#67e8f9', { line: '#1e1b5a', lw: 2 });
      s += K.line('M44 102C28 100 20 112 20 124C20 138 26 148 20 158M36 116C32 126 34 136 30 146', '#fff', 1.4, { op: 0.7 }) + K.line('M20 158c-4-2-4-8 1-8', '#fff', 1.4, { op: 0.7 });
      // дальние ноги
      s += K.vol('M68 126C64 142 66 156 70 168H84C82 156 82 144 86 132Z', far) + K.vol('M124 130C122 146 124 158 126 168H140C138 156 138 144 140 132Z', far);
      s += K.part('M68 164H86L88 172H66ZM124 164H142L144 172H122Z', '#b8913a', { line: '#3b2a08', lw: 1.6 });
      // ближние ноги: задняя упирается, передняя поднята — зверь ступает
      s += K.vol('M46 118C40 134 44 152 50 168H66C64 154 66 140 72 126Z', hide);
      s += K.vol('M130 116C140 126 150 132 158 136C166 140 168 148 164 154L156 163L146 159L154 150C150 146 142 142 132 138Z', hide);
      s += K.part('M48 164H68L70 174H46ZM145 158L157 163L152 172L140 167Z', '#fcd34d', { line: '#6b4a05', lw: 1.8 });
      s += K.line('M50 160c-4 4-8 6-10 12M66 160c4 4 6 8 6 12M126 160c-3 4-6 7-7 12M140 160c3 4 5 8 5 12M146 156c-4 3-9 3-13 1', '#a5f3fc', 2.4, { op: 0.9 });
      // могучее тело с попоной
      s += K.vol('M50 104C56 88 80 82 104 84C124 84 140 88 150 102C158 114 156 132 146 142C134 150 116 146 100 146C82 148 62 146 52 136C42 128 44 114 50 104Z', hide);
      s += K.part('M68 90C82 84 104 84 118 88L114 118C100 122 84 122 72 118Z', '#3730a3', { line: '#1e1b5a', lw: 1.8 });
      s += K.stitch('M70 94C84 89 104 89 116 92', '#fcd34d', 2) + K.stitch('M73 114C86 118 100 118 113 114', '#fcd34d', 2);
      s += K.rhomb(94, 103, 7, '#fcd34d', '#6b4a05') + K.rhomb(94, 103, 3, '#67e8f9', '#1e1b5a');
      s += '<g fill="#fcd34d" stroke="#6b4a05" stroke-width=".8"><circle cx="76" cy="121" r="2"/><circle cx="86" cy="123" r="2"/><circle cx="97" cy="123" r="2"/><circle cx="108" cy="121" r="2"/></g>';
      // светящиеся узоры-завитки
      const curl = 'M56 126m-8 0a8 8 0 1 1 8 8a5 5 0 1 1-5-5a2.5 2.5 0 1 1 2.5 2.5';
      s += K.line(curl, '#67e8f9', 5, { op: 0.3 }) + K.line(curl, '#e0f7ff', 1.8);
      // мощная шея
      s += K.vol('M122 98C126 80 134 64 146 52L170 62C168 80 162 100 154 118C144 124 128 116 122 98Z', { ...hide, texK: 0.12 });
      s += K.line('M146 104m-6 0a6 6 0 1 1 6 6a3.8 3.8 0 1 1-3.8-3.8', '#e0f7ff', 1.6, { op: 0.9 });
      // грива-волна
      s += K.part('M152 28C134 28 122 42 118 56C114 70 104 78 88 82C96 90 110 90 118 86C112 96 102 102 92 106C108 108 122 102 130 94C128 104 122 112 114 118C130 116 140 106 146 92C150 78 152 62 160 48C164 40 160 30 152 28Z', '#67e8f9', { line: '#1e1b5a', lw: 1.8 });
      s += K.line('M148 36C134 46 128 60 120 72M142 62C136 78 126 88 112 96M144 80C140 94 132 104 120 112', '#fff', 1.4, { op: 0.75 }) + K.line('M92 106c-4-4 0-10 5-7M88 82c-3-5 3-9 6-5', '#fff', 1.4, { op: 0.75 });
      // ухо, голова, борода
      s += K.part('M148 46C142 38 142 28 146 22C152 28 156 36 156 44Z', '#c7cdfb', { line: '#1e1b5a', lw: 1.8 });
      s += K.vol('M142 52C146 38 160 30 172 36C180 42 186 52 192 62C198 72 196 84 186 86C176 88 166 82 156 78C146 74 138 64 142 52Z', { ...hide, texK: 0.1 });
      s += K.part('M184 86C188 100 182 114 166 124C170 114 166 104 158 80Z', '#67e8f9', { line: '#1e1b5a', lw: 1.6 }) + K.line('M178 90C180 102 176 110 170 116', '#fff', 1.2, { op: 0.7 });
      s += K.line('M154 48Q165 42 177 50', INK, 3.2) + K.glow(166, 55, 4.2, 3.4, '#a5f3fc');
      s += `<ellipse cx="190" cy="72" rx="2.2" ry="1.5" fill="${INK}"/>` + K.line('M194 80Q186 83 178 81', INK, 1.8);
      // витой рог с сиянием и золотым венцом у основания
      s += `<circle class="art-aura" cx="177" cy="4" r="13" fill="${K.rad([[0, '#fff', 0.9], [1, '#67e8f9', 0]])}"/>`;
      s += K.part('M154 42C158 28 166 12 178 0C174 14 170 28 168 44Z', '#f0f4ff', { line: '#1e1b5a', lw: 1.8 });
      s += K.line('M156 36L167 33M159 28L170 23M163 20L172 14M167 12L175 6', '#6366f1', 1.4, { op: 0.8 });
      s += K.part('M152 44C156 40 166 40 170 44L168 49C162 47 158 47 154 49Z', '#fcd34d', { line: '#6b4a05', lw: 1.4 }) + '<circle cx="161" cy="44.5" r="1.8" fill="#e11d48"/>';
      s += K.spark(118, 30, 3, '#fff') + K.spark(40, 60, 2.6, '#a5f3fc') + K.spark(100, 64, 2.2, '#fde68a') + K.spark(194, 100, 2.4, '#fff');
      return s;
    },
  });
})();
