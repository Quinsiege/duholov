'use strict';
/* 4.6: духи стихии тока — каждый нарисован своей функцией (кисть — js/art-kit.js) */

Object.assign(SPIRIT_ART, (() => {
  const r1 = n => Math.round(n * 10) / 10;
  // дуга сигнала Wi‑Fi: центр, радиус, полуугол раскрытия
  const arc = (cx, cy, r, a = 46) => {
    const s = Math.sin(a * Math.PI / 180) * r, c = Math.cos(a * Math.PI / 180) * r;
    return `M${r1(cx - s)} ${r1(cy - c)}A${r} ${r} 0 0 1 ${r1(cx + s)} ${r1(cy - c)}`;
  };
  // волна сигнала: мягкое свечение + яркая нить, мигают по очереди
  const waves = (K, cx, cy, rs, c, hi, w = 3.4) => rs.map((r, i) =>
    `<g class="art-blink" style="animation-delay:${r1(i * 0.3)}s">${K.line(arc(cx, cy, r), c, w * 2.6, { op: 0.28 })}${K.line(arc(cx, cy, r), hi, w)}</g>`).join('');
  // молния-зигзаг со свечением
  const bolt = (K, d, w = 3, cls = 'art-blink', delay = 0) =>
    `<g class="${cls}" style="animation-delay:${delay}s">${K.line(d, '#facc15', w * 3, { op: 0.3 })}${K.line(d, '#fff7c2', w)}</g>`;
  // мотылёк
  const moth = (K, x, y, rot, delay) => K.g(
    `<path d="M0 0C-7-8-13-5-11 1-9 5-4 4 0 0ZM0 0C7-8 13-5 11 1 9 5 4 4 0 0Z" fill="#fef3c7" stroke="#92400e" stroke-width="1"/><circle cx="-6" cy="-1" r="1.4" fill="#d97706"/><circle cx="6" cy="-1" r="1.4" fill="#d97706"/><path d="M0-3V4" stroke="#78350f" stroke-width="1.8" stroke-linecap="round"/>`,
    `translate(${x} ${y}) rotate(${rot})`, 'art-float" style="animation-delay:' + delay + 's');
  // свой clipPath (для узоров внутри фигуры)
  const clip = (K, d) => { const i = K.id('c'); K.def(`<clipPath id="${i}"><path d="${d}"/></clipPath>`); return `url(#${i})`; };

  return {
    // Вайфайка: пухлая светящаяся «луковка» с бусиной-антенной, над которой мерцают дуги сигнала
    vayfayka(K) {
      const body = 'M100 56 C106 68 120 72 134 82 C152 95 160 114 157 136 C154 160 132 176 100 176 C68 176 46 160 43 136 C40 114 48 95 66 82 C80 72 94 68 100 56Z';
      let s = K.aura('#67e8f9', 86, 112, 0.42);
      // дуги сигнала
      s += waves(K, 100, 46, [13, 23, 33], '#67e8f9', '#e0fbff', 3.6);
      // ножки
      s += K.mirror(K.vol(K.ell(80, 172, 15, 8), { c1: '#a78bfa', c2: '#4c1d95', tex: false, lw: 2.4 }));
      // тело-луковка
      s += K.vol(body, { c1: '#c4b5fd', c2: '#6d28d9', rim: '#a5f3fc', rimK: 0.75, texK: 0.2 });
      // свет изнутри
      s += `<ellipse cx="100" cy="138" rx="46" ry="32" fill="${K.rad([[0, '#e0fbff', 0.55], [1, '#67e8f9', 0]])}"/>`;
      // вышивка: «ёлочка» по макушке и пояс с оберегом
      s += K.line('M84 74 l6 4 M92 70 l6 4 M116 74 l-6 4 M108 70 l-6 4', '#e0fbff', 2, { op: 0.8 });
      s += K.stitch('M52 156 Q100 180 148 156', '#67e8f9', 2.6);
      s += K.rhomb(100, 166, 5, '#fde68a');
      s += K.gloss(74, 96, 11, 6, -40, 0.4);
      // поднятая ручка — машет, приветствует
      s += K.vol(K.ell(36, 130, 9.5, 14), { c1: '#c4b5fd', c2: '#6d28d9', tex: false, lw: 2.4, t: 'rotate(-52 36 130)', cls: 'art-spin-soft' });
      s += K.line('M20 112 q-5 4 -3 10 M14 106 q-8 8 -4 18', '#a5f3fc', 1.8, { cls: 'art-blink' });
      // мордочка
      s += K.eyes(100, 122, 21, 13.5, { iris: '#7c3aed', look: [0.05, 0.2] });
      s += K.blush(68, 142, 8) + K.blush(132, 142, 8);
      s += K.mouth('smile', 100, 141, 14);
      // антенна-росток с бусиной-передатчиком
      s += K.line('M100 60 Q96 54 100 48', '#4c1d95', 3.4);
      s += `<circle class="art-aura" cx="100" cy="46" r="11" fill="${K.rad([[0, '#fff', 1], [0.4, '#67e8f9', 0.8], [1, '#67e8f9', 0]])}"/>`;
      s += `<circle cx="100" cy="46" r="4.6" fill="#cffafe" stroke="#0e7490" stroke-width="1.6"/>`;
      // вторая ручка — у животика
      s += K.vol(K.ell(150, 148, 10, 13), { c1: '#c4b5fd', c2: '#6d28d9', tex: false, lw: 2.4, t: 'rotate(30 150 148)' });
      // мерцание вокруг
      s += K.spark(30, 72, 4, '#a5f3fc', 'art-float') + K.spark(170, 84, 3.6, '#e0fbff') + K.spark(174, 132, 3, '#fde68a', 'art-float') + K.spark(24, 148, 2.6, '#a5f3fc');
      return s;
    },

    // Сетевик: паучок-связист — брюшко с вышитыми ромбами, восемь лапок, сияющая паутина за спиной, клубок светящейся нити
    setevik(K) {
      const cx = 100, cy = 96, P = (r, a) => `${r1(cx + r * Math.cos(a))} ${r1(cy + r * Math.sin(a))}`;
      let s = K.aura('#22d3ee', 92, 100, 0.3);
      // паутина: лучи и провисающие витки
      const A = [...Array(8)].map((_, i) => (i * 45 - 67.5) * Math.PI / 180);
      let web = A.map(a => `M${cx} ${cy}L${P(88, a)}`).join('');
      for (const r of [28, 48, 68, 86]) {
        web += `M${P(r, A[0])}`;
        for (let i = 1; i <= 8; i++) { const a0 = A[i - 1], a1 = A[i % 8]; web += `Q${P(r * 0.84, (a0 + a1 + (i === 8 ? Math.PI * 2 : 0)) / 2)} ${P(r, a1)}`; }
      }
      s += `<g class="art-blink" style="animation-duration:3.2s">${K.line(web, '#22d3ee', 4.5, { op: 0.18 })}${K.line(web, '#a5f3fc', 1.4, { op: 0.8 })}</g>`;
      // лапки: тёмные, в полоску, с суставами-бусинами
      const legs = 'M76 104 Q44 58 30 40 M70 118 Q34 92 14 118 M70 136 Q30 132 20 170 M80 152 Q54 158 46 180';
      let L = K.line(legs, '#1e0b4b', 9) + K.line(legs, '#7c3aed', 5) + K.stitch(legs, '#22d3ee', 1.6);
      for (const [x, y] of [[42, 58], [30, 104], [32, 142], [58, 162]]) L += `<circle cx="${x}" cy="${y}" r="4.6" fill="#c4b5fd" stroke="#1e0b4b" stroke-width="1.8"/>`;
      L += `<circle class="art-blink" cx="30" cy="40" r="5" fill="${K.rad([[0, '#fff'], [0.5, '#67e8f9'], [1, '#22d3ee', 0]])}"/>`;
      s += K.mirror(L);
      // брюшко
      s += K.vol(K.ell(100, 94, 40, 34), { c1: '#8b5cf6', c2: '#2e1065', rim: '#67e8f9', rimK: 0.7, texK: 0.22 });
      s += K.line('M74 86 l8 6 M74 100 l8 -6 M126 86 l-8 6 M126 100 l-8 -6', '#67e8f9', 2.2, { op: 0.8 });
      s += K.rhomb(100, 82, 8, '#22d3ee', '#1e0b4b') + K.rhomb(100, 100, 5, '#fde68a', '#1e0b4b') + K.rhomb(88, 92, 3, '#a5f3fc', '#1e0b4b') + K.rhomb(112, 92, 3, '#a5f3fc', '#1e0b4b');
      s += K.gloss(80, 76, 9, 4.5, -30, 0.35);
      // родовая антенна с дугами сигнала
      s += waves(K, 100, 52, [10, 18], '#22d3ee', '#e0fbff', 3);
      s += K.line('M100 61 Q103 56 100 52', '#1e0b4b', 3) + `<circle cx="100" cy="52" r="4" fill="#cffafe" stroke="#0e7490" stroke-width="1.5"/>`;
      // голова
      s += K.vol(K.ell(100, 138, 38, 31), { c1: '#a78bfa', c2: '#4c1d95', rim: '#67e8f9', rimK: 0.65, texK: 0.18 });
      s += K.gloss(78, 120, 8, 4.5, -35, 0.35);
      // малые глазки-бусинки и хитрый прищур
      for (const x of [86, 114]) s += `<circle cx="${x}" cy="116" r="3.6" fill="#1b1030"/><circle cx="${x - 1}" cy="115" r="1.2" fill="#fff"/>`;
      s += K.eyes(100, 136, 16, 11, { iris: '#22d3ee', lid: 'half', look: [0.6, 0.15] });
      s += K.blush(72, 150, 6) + K.blush(128, 150, 6);
      s += K.mouth('cat', 100, 153, 16);
      s += '<path d="M93 155.5l1.6 4 1.6-3.6zM103.8 155.9l1.6 3.6 1.6-4z" fill="#fff" stroke="#1b1030" stroke-width=".8"/>';
      // клубок светящейся нити в лапках
      s += K.line('M110 176 Q140 186 170 170', '#a5f3fc', 1.8, { op: 0.8 });
      s += `<circle class="art-aura" cx="100" cy="174" r="16" fill="${K.rad([[0, '#e0fbff', 0.9], [0.45, '#22d3ee', 0.6], [1, '#22d3ee', 0]])}"/>`;
      s += `<circle cx="100" cy="174" r="9.5" fill="#67e8f9" stroke="#0e7490" stroke-width="2"/>` + K.line('M92 170 Q100 164 108 172 M91 176 Q100 168 109 177 M94 181 Q102 174 108 180', '#e0fbff', 1.4);
      s += K.mirror(K.vol(K.ell(84, 172, 7, 8), { c1: '#a78bfa', c2: '#4c1d95', tex: false, lw: 2 }));
      s += K.spark(170, 36, 3.6, '#a5f3fc') + K.spark(18, 80, 3, '#e0fbff', 'art-float') + K.spark(184, 126, 2.8, '#fde68a', 'art-float');
      return s;
    },

    // Громовик: грозный дух высоковольтных линий — на грозовой туче, изоляторы на плечах, провода-волосы, рога-дуги сигнала, молния в кулаке
    gromovik(K) {
      let s = K.aura('#facc15', 98, 100, 0.4) + K.aura('#a78bfa', 70, 150, 0.35);
      // молнии за спиной
      s += bolt(K, 'M40 70 L26 96 L40 98 L20 134', 3) + bolt(K, 'M156 118 L174 136 L162 140 L182 168', 2.6, 'art-blink', 0.6);
      // провода-волосы с искрами на концах
      const wires = 'M84 46 C72 30 60 22 42 20 M94 40 C92 28 96 20 90 8 M108 40 C114 28 126 20 144 14 M116 48 C132 38 148 38 164 30';
      s += K.line(wires, '#111827', 7) + K.line(wires, '#6b7280', 2.2);
      s += bolt(K, 'M42 20 l-6 -4 l2 6 l-8 -2', 2) + bolt(K, 'M90 8 l4 -4 l1 5 l5 -3', 2, 'art-blink', 0.4) + bolt(K, 'M144 14 l6 -6 l0 6 l7 -3', 2, 'art-blink', 0.8) + bolt(K, 'M164 30 l8 -2 l-4 5 l8 1', 2, 'art-blink', 1.1);
      // рога — дуги сигнала, как у Вайфайки, но из фиолетового стекла
      s += K.mirror(K.part('M78 56 C60 50 52 34 58 16 C64 30 72 40 86 44Z', '#a78bfa', { line: '#3b0764', lw: 2.4 }) + K.line('M64 26 C66 36 72 42 80 46', '#e9d5ff', 1.6, { op: 0.8 }));
      // грозовая туча под ногами
      const cloud = 'M40 176 C22 176 20 154 38 152 C36 138 56 132 66 142 C72 130 92 130 98 140 C106 128 128 130 134 142 C144 132 164 138 162 152 C180 152 180 176 162 176Z';
      s += K.vol(cloud, { c1: '#a697d6', c2: '#241046', rim: '#fef08a', rimK: 0.55, hiK: 0.2, texK: 0.15 });
      // руки: левая опущена, правая вскинута с молнией
      s += K.vol('M58 96 C36 102 26 124 30 148 L50 150 C48 132 54 118 66 110Z', { c1: '#fde68a', c2: '#a16207', lw: 2.6 });
      s += K.vol('M138 102 C160 104 180 88 180 64 L158 60 C158 72 150 80 136 82Z', { c1: '#fde68a', c2: '#a16207', lw: 2.6 });
      // торс
      const torso = 'M52 92 C62 84 80 84 100 86 C120 84 138 84 148 92 C156 106 150 126 138 142 C130 154 120 162 100 164 C80 162 70 154 62 142 C50 126 44 106 52 92Z';
      s += K.vol(torso, { c1: '#fef08a', c2: '#ca8a04', rim: '#e9d5ff', rimK: 0.65 });
      s += K.stitch('M66 96 Q100 110 134 96', '#7c3aed', 2.4);
      // кушак с кистями
      s += K.part('M60 138 Q100 156 140 138 L136 150 Q100 168 64 150Z', '#7c3aed', { line: '#2e1065', lw: 2 }) + K.stitch('M64 145 Q100 162 136 145', '#fde68a', 1.8);
      s += K.line('M124 157 l-3 13 M128 156 l1 13', '#7c3aed', 3) + `<circle cx="126" cy="156" r="3.4" fill="#fde68a" stroke="#2e1065" stroke-width="1.2"/>`;
      s += K.rhomb(100, 124, 14, '#c4b5fd', '#3b0764');
      s += `<path d="M102 113 L94 126 H101 L97 135 L107 121 H100Z" fill="#fef08a" stroke="#3b0764" stroke-width="1.4" stroke-linejoin="round"/>`;
      s += K.gloss(70, 104, 10, 5, -30, 0.35);
      // наплечники-изоляторы: гирлянда стеклянных тарелок на стержне, медный колпачок
      const glass = K.lin(['#f5f3ff', '#c4b5fd', '#6d28d9']);
      let ins = K.part('M34 104 Q50 94 66 104 Q50 111 34 104Z', '#6b7280', { lw: 1.6, line: '#1f2937' }) + K.line('M50 102 V72', '#374151', 3.4);
      for (const y of [97, 89, 81]) ins += `<ellipse cx="50" cy="${y}" rx="12" ry="4" fill="${glass}" stroke="#2e1065" stroke-width="1.6"/>` + K.line(`M42 ${y - 1} Q46 ${r1(y - 2.4)} 50 ${r1(y - 2.4)}`, '#fff', 1.2, { op: 0.85 });
      ins += K.part('M45 76 H55 V71 Q50 67 45 71Z', '#d97706', { lw: 1.4, line: '#2e1065' });
      s += K.mirror(ins);
      // голова
      s += K.vol(K.ell(100, 64, 30, 27), { c1: '#fef08a', c2: '#ca8a04', rim: '#e9d5ff', rimK: 0.7, texK: 0.2 });
      s += K.gloss(84, 48, 7, 4, -35, 0.35);
      s += K.eyes(100, 64, 13, 10, { iris: '#7c3aed', lid: 'angry', look: [0, 0.25] });
      s += K.mouth('teeth', 100, 79, 20);
      s += K.line('M72 70 l6 2 l-3 4 M128 70 l-6 2 l3 4', '#7c3aed', 2);
      // молния в кулаке
      s += `<path class="art-blink" d="M178 10 L160 46 L172 46 L154 84 L188 34 L174 34 L190 10Z" fill="${K.rad([[0, '#fff', 0.8], [1, '#facc15', 0]])}"/>`;
      s += K.part('M178 10 L160 46 L172 46 L154 84 L188 34 L174 34 L190 10Z', '#fde047', { line: '#854d0e', lw: 2 });
      s += K.vol(K.ell(168, 60, 12, 11), { c1: '#fde68a', c2: '#a16207', tex: false, lw: 2.4 });
      s += K.vol(K.ell(40, 154, 12, 11), { c1: '#fde68a', c2: '#a16207', tex: false, lw: 2.4 });
      s += K.spark(20, 60, 4, '#fef08a') + K.spark(184, 96, 3.4, '#e9d5ff', 'art-float') + K.spark(24, 168, 3, '#fef08a', 'art-float');
      return s;
    },

    // Трамвайник: добрый последний трамвай — фары-глаза, дуга на проводе, резной подзор под окнами, звонок, месяц на маршрутном табло
    tramvaynik(K) {
      const body = 'M56 62 C56 48 70 44 100 44 C130 44 144 48 144 62 L152 158 C152 170 144 174 132 174 H68 C56 174 48 170 48 158Z';
      let s = K.aura('#fde047', 88, 110, 0.3);
      // контактный провод и дуга-токоприёмник
      s += K.line('M4 18 Q100 24 196 16', '#0f172a', 2.6) + K.line('M4 18 Q100 24 196 16', '#94a3b8', 1);
      s += K.line('M84 48 L95 24 M116 48 L105 24', '#1f2937', 4) + K.line('M84 48 L95 24 M116 48 L105 24', '#9ca3af', 1.4);
      s += K.line('M86 22 H114', '#b45309', 4.6) + K.line('M87 21 H113', '#fcd34d', 1.4);
      s += `<circle class="art-blink" cx="100" cy="20" r="10" fill="${K.rad([[0, '#fff'], [0.4, '#fde047', 0.8], [1, '#facc15', 0]])}"/>` + K.spark(100, 20, 5, '#fffbe6');
      // колёса и рельсы
      s += K.line('M72 176 L62 196 M128 176 L138 196', '#94a3b8', 3);
      s += K.mirror(K.part('M58 170 A14 14 0 0 1 86 170 V178 H58Z', '#374151', { lw: 2 }) + `<circle cx="72" cy="172" r="3.4" fill="#fde047"/>`);
      // корпус
      s += K.vol(body, { c1: '#f99a9a', c2: '#a51818', rim: '#fde68a', rimK: 0.6, texK: 0.15 });
      // маршрутное табло с месяцем
      s += K.part('M74 49 H126 Q128 49 128 51 V59 Q128 61 126 61 H74 Q72 61 72 59 V51 Q72 49 74 49Z', '#1f2937', { lw: 1.8, line: '#0f172a' });
      s += `<path class="art-blink" d="M104 51.5 A5 5 0 1 0 104 58.5 A4 4 0 1 1 104 51.5Z" fill="#fde047"/>` + K.spark(112, 54, 2, '#fde047') + K.spark(88, 55, 1.6, '#fef9c3');
      // лобовые окна с тёплым светом и отблеском
      const glass = K.rad([[0, '#fff7cc'], [0.6, '#fcd34d'], [1, '#d97706']], 0.5, 0.7, 0.8);
      s += `<path d="M62 66 H97 V98 H59Z M103 66 H138 L141 98 H103Z" fill="${glass}" stroke="#7f1d1d" stroke-width="2.4" stroke-linejoin="round"/>`;
      s += K.line('M66 92 L80 70 M72 94 L84 74 M108 92 L122 70', '#fff', 2.2, { op: 0.45 });
      // резной подзор-наличник
      let sc = 'M56 100 H144';
      for (let x = 56; x < 144; x += 11) sc += ` M${x} 100 q5.5 9 11 0`;
      s += K.part('M55 98 H145 L146 104 H54Z', '#fff7ed', { line: '#7f1d1d', lw: 1.6 });
      s += K.line(sc.replace('M56 100 H144', ''), '#fff7ed', 2.4);
      for (let x = 61.5; x < 144; x += 11) s += `<circle cx="${r1(x)}" cy="106" r="1.6" fill="#fff7ed"/>`;
      // жёлтая полоса с вышивкой
      s += K.part('M52 114 H148 L149 120 H51Z', '#fde047', { line: '#854d0e', lw: 1.4 });
      s += K.stitch('M54 117 H146', '#b91c1c', 1.4);
      // фары-глаза в хромовых ободках
      for (const x of [72, 128]) s += `<circle cx="${x}" cy="134" r="22" fill="${K.rad([[0, '#fffbe6', 0.7], [1, '#fde047', 0]])}"/><circle cx="${x}" cy="134" r="16.5" fill="${K.lin(['#f8fafc', '#94a3b8', '#475569'])}" stroke="#1f2937" stroke-width="2"/>`;
      s += K.eyes(100, 134, 28, 12, { iris: '#f59e0b', look: [0.05, 0.1] });
      s += K.blush(58, 156, 6) + K.blush(142, 156, 6);
      s += K.mouth('smile', 100, 148, 22);
      // бампер
      s += K.part('M54 162 H146 Q150 162 150 166 Q150 170 146 170 H54 Q50 170 50 166 Q50 162 54 162Z', '#4b5563', { lw: 1.8 });
      s += K.gloss(66, 56, 6, 3, -20, 0.4);
      // звонок на кронштейне
      s += K.line('M143 82 H156 V88', '#374151', 2.4);
      s += K.g(K.part('M156 88 C148 88 148 98 146 104 H166 C164 98 164 88 156 88Z', '#fbbf24', { line: '#78350f', lw: 1.8 }) + `<circle cx="156" cy="106" r="2.6" fill="#b45309"/>` + K.line('M151 94 Q152 90 155 90', '#fff', 1.4, { op: 0.8 }), '', 'art-spin-soft');
      s += K.line('M170 92 q4 4 0 8 M175 89 q6 7 0 14', '#fde68a', 1.8, { cls: 'art-blink' });
      s += K.spark(30, 60, 3.4, '#fde68a') + K.spark(174, 142, 3, '#fff', 'art-float') + K.spark(24, 120, 2.6, '#fde047', 'art-float');
      return s;
    },

    // Фонарник: высокий тонкий фонарщик в пелерине, голова — старинный фонарь с тёплым светом, шест с огоньком, мотыльки
    fonarnik(K) {
      let s = K.aura('#fde047', 70, 56, 0.5) + K.aura('#f59e0b', 90, 120, 0.15);
      // шест фонарщика с огоньком на крюке
      s += K.line('M156 178 L148 30', '#3b1d0a', 6) + K.line('M156 178 L148 30', '#a16207', 2.4);
      s += K.line('M148 30 Q147 16 138 18 Q132 20 134 28', '#1f2937', 3);
      s += K.flame(134, 34, 16, 10, '#fff3b0', '#f59e0b');
      // сапожки
      s += K.mirror(K.vol(K.ell(89, 175, 9, 5), { c1: '#475569', c2: '#0f172a', tex: false, lw: 2 }));
      // левый рукав
      s += K.vol('M86 88 C78 104 72 124 70 142 L82 144 C84 128 88 112 94 100Z', { c1: '#64748b', c2: '#1e293b', lw: 2.4 });
      // длинное пальто
      const coat = 'M88 84 C82 104 76 140 62 172 Q100 182 138 172 C124 140 118 104 112 84Z';
      s += K.vol(coat, { c1: '#6b7a90', c2: '#1e293b', rim: '#fde68a', rimK: 0.7, texK: 0.15 });
      s += K.line('M100 112 V172', '#0f172a', 1.6, { op: 0.6 });
      for (const y of [120, 134, 148, 162]) s += `<circle cx="100" cy="${y}" r="2.6" fill="#fcd34d" stroke="#78350f" stroke-width="1"/>`;
      s += K.stitch('M66 168 Q100 178 134 168', '#fcd34d', 2);
      // пелерина с вышитым краем
      const cape = 'M86 84 Q100 80 114 84 C122 92 128 102 130 112 Q100 122 70 112 C72 102 78 92 86 84Z';
      s += K.vol(cape, { c1: '#7b8aa0', c2: '#334155', rim: '#fde68a', rimK: 0.75, tex: false, lw: 2.4 });
      s += K.stitch('M73 110 Q100 119 127 110', '#fcd34d', 2) + K.rhomb(100, 106, 4, '#fde047');
      // правый рукав тянется к шесту
      s += K.vol('M112 90 C126 94 140 100 148 106 L144 116 C132 112 120 108 110 106Z', { c1: '#64748b', c2: '#1e293b', lw: 2.4 });
      s += K.vol(K.ell(151, 110, 6.5, 7.5), { c1: '#fde7c8', c2: '#b7835a', tex: false, lw: 2 }) + K.vol(K.ell(75, 148, 6.5, 7.5), { c1: '#fde7c8', c2: '#b7835a', tex: false, lw: 2 });
      // голова-фонарь: крыша-луковка, стекло со светом, донце
      s += K.part('M84 80 H116 L112 88 H88Z', '#334155', { line: '#0f172a' });
      s += `<path d="M74 44 H126 L118 80 H82Z" fill="${K.rad([[0, '#fffbe6'], [0.45, '#fde047'], [1, '#f59e0b']], 0.5, 0.45, 0.7)}" stroke="#0f172a" stroke-width="2.6" stroke-linejoin="round"/>`;
      s += `<ellipse class="art-blink" cx="100" cy="60" rx="20" ry="16" fill="${K.rad([[0, '#fff', 0.9], [1, '#fff', 0]])}" style="animation-duration:2.6s"/>`;
      s += K.line('M78 48 L84 76 M122 48 L116 76', '#0f172a', 1.6, { op: 0.5 });
      s += K.vol('M70 44 C82 38 94 28 100 14 C106 28 118 38 130 44Z', { c1: '#64748b', c2: '#1e293b', rim: '#fde68a', rimK: 0.8, tex: false, lw: 2.4 });
      s += K.stitch('M76 42 Q100 34 124 42', '#fcd34d', 1.6);
      s += `<circle cx="100" cy="12" r="4" fill="#fcd34d" stroke="#0f172a" stroke-width="1.6"/>`;
      // мордочка в огне: тёмные глазки, сонный прищур, улыбка
      s += `<g class="art-eyes"><ellipse cx="90" cy="60" rx="4.2" ry="5.6" fill="#3b1d0a"/><ellipse cx="110" cy="60" rx="4.2" ry="5.6" fill="#3b1d0a"/><circle cx="88.8" cy="58.2" r="1.6" fill="#fff"/><circle cx="108.8" cy="58.2" r="1.6" fill="#fff"/></g>`;
      s += K.line('M85 55 Q90 53 95 55 M105 55 Q110 53 115 55', '#3b1d0a', 1.8);
      s += `<path d="M95 69 Q100 73 105 69" stroke="#3b1d0a" stroke-width="2" fill="none" stroke-linecap="round"/>` + K.blush(84, 67, 4) + K.blush(116, 67, 4);
      // мотыльки
      s += moth(K, 44, 40, -20, 0) + moth(K, 160, 62, 15, -0.8) + moth(K, 52, 92, 10, -1.5);
      s += K.spark(30, 66, 2.6, '#fde68a') + K.spark(128, 20, 2.4, '#fff7cc');
      return s;
    },

    // Метровик: усатый машинист подземки в фуражке с налобным фонарём — приложил ладонь к уху, слушает рельсы; за ним тоннель и знак «М»
    metrovik(K) {
      let s = '';
      // тоннель: тёмная арка с кольцами тюбингов и огоньками
      s += `<path d="M26 178 V98 C26 50 60 24 100 24 C140 24 174 50 174 98 V178Z" fill="${K.rad([[0, '#1e3a8a', 0.5], [1, '#050b24', 0.85]], 0.5, 0.55, 0.6)}"/>`;
      s += K.line('M26 178 V98 C26 50 60 24 100 24 C140 24 174 50 174 98 V178', '#3b5fc0', 6, { op: 0.55 }) + K.stitch('M34 178 V98 C34 56 64 32 100 32 C136 32 166 56 166 98 V178', '#93c5fd', 1.6);
      for (const [x, y] of [[44, 58], [100, 28], [156, 58]]) s += `<circle class="art-blink" cx="${x}" cy="${y}" r="3" fill="#fde047"/>`;
      // рельсы уходят в тоннель
      s += K.line('M40 182 L88 116 M160 182 L112 116', '#94a3b8', 2.4) + K.line('M52 170 H148 M66 152 H134 M78 136 H122', '#475569', 2.4, { op: 0.7 });
      // знак метро на столбе
      s += K.line('M38 178 V52', '#1f2937', 4) + K.line('M38 178 V52', '#64748b', 1.4);
      s += `<circle class="art-aura" cx="38" cy="40" r="22" fill="${K.rad([[0, '#ef4444', 0.6], [1, '#ef4444', 0]])}"/>`;
      s += `<circle cx="38" cy="40" r="13" fill="${K.lin(['#fca5a5', '#ef4444', '#991b1b'])}" stroke="#450a0a" stroke-width="2"/>` + K.line('M31 46 V34 L38 42 L45 34 V46', '#fff', 2.6);
      // сапоги
      s += K.mirror(K.vol(K.ell(82, 174, 14, 7), { c1: '#334155', c2: '#020617', tex: false, lw: 2.2 }));
      // туловище в кителе
      const body = 'M64 110 C64 98 80 94 100 94 C120 94 136 98 136 110 L144 160 C144 172 128 176 100 176 C72 176 56 172 56 160Z';
      s += K.vol(body, { c1: '#6f9ae8', c2: '#1e3a8a', rim: '#fde68a', rimK: 0.55, texK: 0.18 });
      s += K.line('M100 104 V174', '#172554', 1.8) + K.line('M86 104 L100 118 L114 104', '#ef4444', 2.6);
      for (const y of [126, 142, 158]) s += `<circle cx="92" cy="${y}" r="2.4" fill="#fcd34d" stroke="#78350f" stroke-width=".9"/><circle cx="108" cy="${y}" r="2.4" fill="#fcd34d" stroke="#78350f" stroke-width=".9"/>`;
      s += K.stitch('M60 150 Q100 162 140 150', '#ef4444', 2);
      s += K.line('M116 126 V120 L120 124 L124 120 V126', '#ef4444', 1.8);
      // левая рука с сигнальным фонариком
      s += K.vol('M72 104 C56 110 46 126 44 142 L58 146 C60 132 66 124 76 118Z', { c1: '#6f9ae8', c2: '#1e3a8a', lw: 2.4 });
      s += `<circle class="art-aura" cx="51" cy="164" r="16" fill="${K.rad([[0, '#fca5a5', 0.7], [1, '#ef4444', 0]])}"/>`;
      s += K.line('M47 156 V152 Q47 148 51 148 Q55 148 55 152 V156', '#1f2937', 1.8);
      s += K.part('M43 156 H59 V172 H43Z', '#1f2937', { lw: 1.6 }) + `<rect x="46" y="159" width="10" height="10" rx="1.5" fill="${K.rad([[0, '#fff'], [0.5, '#f87171'], [1, '#b91c1c']])}"/>`;
      s += K.vol(K.ell(51, 147, 7.5, 7), { c1: '#dbeafe', c2: '#3b5fc0', tex: false, lw: 2 });
      // голова, чуть склонённая к рельсам
      let h = K.vol(K.ell(100, 82, 34, 27), { c1: '#bfdbfe', c2: '#3b5fc0', rim: '#fde68a', rimK: 0.6, texK: 0.15 });
      h += K.glow(86, 86, 5.5, 4.6, '#fde047') + K.glow(114, 86, 5.5, 4.6, '#fde047');
      h += K.line('M78 76 Q86 73 94 77 M106 77 Q114 73 122 76', '#1e3a8a', 3);
      h += `<ellipse cx="100" cy="95" rx="5.5" ry="4.5" fill="${K.lin(['#dbeafe', '#93c5fd', '#3b82f6'])}" stroke="#1e3a8a" stroke-width="1.6"/>`;
      h += `<path d="M100 99 C92 95 80 97 72 106 C82 104 90 107 100 103 C110 107 118 104 128 106 C120 97 108 95 100 99Z" fill="${K.lin(['#f8fafc', '#cbd5e1'])}" stroke="#334155" stroke-width="1.6" stroke-linejoin="round"/>`;
      // фуражка: тулья, красный околыш, лакированный козырёк, фонарь-налобник
      h += K.vol('M64 66 C62 48 80 38 100 38 C120 38 138 48 136 66Z', { c1: '#3b5fc0', c2: '#0b1640', tex: false, lw: 2.4 });
      h += K.part('M64 60 H136 V69 H64Z', '#ef4444', { line: '#450a0a', lw: 1.8 });
      h += `<path d="M60 69 Q100 82 140 69 Q100 75 60 69Z" fill="#0f172a" stroke="#020617" stroke-width="2" stroke-linejoin="round"/>`;
      h += `<path d="M96 58 L18 8 L6 30Z" fill="${K.lin(['#fef9c3', '#fef9c3'], 1, 0, 0, 0)}" opacity=".18" class="art-blink"/>`;
      h += `<circle cx="100" cy="58" r="9" fill="#e5e7eb" stroke="#1f2937" stroke-width="2"/><circle cx="100" cy="58" r="5.5" fill="${K.rad([[0, '#fff'], [0.6, '#fef08a'], [1, '#f59e0b']])}"/>`;
      h += `<circle class="art-aura" cx="100" cy="58" r="14" fill="${K.rad([[0, '#fffbe6', 0.8], [1, '#fde047', 0]])}"/>`;
      s += K.g(h, 'rotate(7 100 96)');
      // правая рука у уха
      s += K.vol('M132 114 C146 112 154 100 152 88 L140 86 C140 96 136 102 128 104Z', { c1: '#6f9ae8', c2: '#1e3a8a', lw: 2.4 });
      s += K.vol(K.ell(143, 82, 8, 10), { c1: '#dbeafe', c2: '#3b5fc0', tex: false, lw: 2.2 });
      s += K.line('M156 70 q4 6 0 12 M162 66 q6 10 0 20', '#93c5fd', 1.8, { cls: 'art-blink' });
      return s;
    },

    // Самокатник: вихрастый дух в лаптях мчится на самокате, шарф с оберегами по ветру, на руле — звоночек и мигающая батарейка
    samokatnik(K) {
      let s = K.aura('#6ee7b7', 84, 120, 0.3);
      // полосы скорости
      s += K.line('M8 104 H40 M14 124 H46 M4 146 H34', '#a7f3d0', 3, { op: 0.6, cls: 'art-blink' });
      // шарф по ветру
      s += `<g class="art-wing">${K.part('M90 124 C72 116 54 124 30 112 C40 124 36 132 22 138 C48 140 66 134 92 138Z', '#fde047', { line: '#854d0e', lw: 2 })}${K.stitch('M84 131 C66 128 50 132 36 128', '#dc2626', 1.8)}${K.rhomb(30, 127, 3, '#dc2626', '#854d0e')}</g>`;
      // вихры, зачёсанные ветром назад
      const hair = 'M96 88 C80 66 58 66 40 76 C58 78 70 86 80 98Z M108 82 C98 56 74 48 54 52 C72 60 84 70 90 90Z M122 88 C122 64 104 50 84 46 C100 58 106 70 106 88Z';
      s += K.part(hair, '#a7f3d0', { line: '#065f46', lw: 2.4 });
      s += K.line('M70 72 C80 74 86 82 88 90 M82 58 C92 64 98 74 100 84', '#fde047', 2, { op: 0.8 });
      // самокат: колёса, дека, руль
      for (const x of [52, 148]) s += `<circle cx="${x}" cy="170" r="10.5" fill="#1f2937" stroke="#030712" stroke-width="2"/><circle cx="${x}" cy="170" r="4.5" fill="#6ee7b7" stroke="#065f46" stroke-width="1.4"/>` + K.line(`M${x - 22} 168 H${x - 14} M${x - 24} 174 H${x - 16}`, '#a7f3d0', 1.8, { op: 0.6 });
      s += K.line('M148 168 L152 88', '#111827', 7) + K.line('M148 168 L152 88', '#64748b', 2.6);
      s += K.part('M40 158 H142 Q150 158 150 164 Q150 168 144 168 H44 Q36 168 36 162 Q36 158 40 158Z', '#065f46', { lw: 2 });
      s += K.stitch('M46 163 H138', '#fde047', 1.6);
      s += K.line('M138 88 H166', '#111827', 7) + K.line('M160 88 H168', '#6ee7b7', 6);
      // батарейка: одно деление, и то мигает красным
      s += K.part('M144 110 H159 V136 H144Z', '#1f2937', { lw: 1.6 }) + `<rect x="148" y="107" width="7" height="3" rx="1" fill="#1f2937"/>`;
      s += `<rect x="146.5" y="113" width="10" height="4.5" rx="1" fill="#374151"/><rect x="146.5" y="119.5" width="10" height="4.5" rx="1" fill="#374151"/><rect x="146.5" y="126" width="10" height="4.5" rx="1" fill="#374151"/>`;
      s += `<rect class="art-blink" x="146.5" y="130.5" width="10" height="3.5" rx="1" fill="#ef4444" style="animation-duration:.9s"/>`;
      // звоночек
      s += `<circle cx="147" cy="81" r="6" fill="${K.lin(['#fef9c3', '#fbbf24', '#b45309'])}" stroke="#78350f" stroke-width="1.6"/>` + K.line('M156 74 q4 3 0 7 M160 70 q7 6 0 14', '#fde047', 1.6, { cls: 'art-blink' });
      // задняя ручка
      s += K.line('M104 122 Q124 104 140 90', '#065f46', 10) + K.line('M104 122 Q124 104 140 90', '#34d399', 6);
      // лапти на деке
      for (const x of [74, 102]) s += `<ellipse cx="${x}" cy="154" rx="12" ry="6" fill="${K.lin(['#fde68a', '#d4a24c', '#92400e'])}" stroke="#78350f" stroke-width="1.8"/>` + K.line(`M${x - 8} 151 l5 6 M${x - 3} 150 l5 7 M${x + 2} 150 l5 7 M${x - 7} 157 l5 -6 M${x - 1} 157 l5 -7 M${x + 5} 157 l3 -5`, '#92400e', 1);
      // тельце-капля, наклонённое вперёд
      const body = 'M72 150 C58 140 56 116 66 100 C76 84 100 78 118 88 C134 98 138 122 128 140 C120 152 108 158 92 158 C84 158 78 155 72 150Z';
      s += K.vol(body, { c1: '#6ee7b7', c2: '#047857', rim: '#fef08a', rimK: 0.7, texK: 0.22 });
      s += K.stitch('M66 138 Q96 156 126 136', '#fde047', 2.2);
      s += K.gloss(78, 104, 9, 5, -40, 0.4);
      // чубчик впереди
      s += K.part('M110 86 C104 74 90 72 80 78 C90 80 96 86 98 94Z', '#a7f3d0', { line: '#065f46', lw: 2 });
      // мордочка в профиль-три четверти: смотрит вперёд, азартно
      s += K.eyes(112, 114, 11, 9.5, { iris: '#047857', look: [0.8, 0] });
      s += K.blush(128, 128, 5.5);
      s += K.mouth('grin', 118, 128, 14);
      // передняя ручка на руле
      s += K.line('M124 140 Q148 128 150 94', '#065f46', 10) + K.line('M124 140 Q148 128 150 94', '#6ee7b7', 6);
      s += `<circle cx="151" cy="89" r="6" fill="#6ee7b7" stroke="#065f46" stroke-width="2"/>`;
      s += K.spark(176, 150, 3, '#fde047', 'art-float') + K.spark(178, 60, 3.4, '#a7f3d0') + K.spark(24, 176, 2.4, '#fde68a');
      return s;
    },

    // Хозяйка Медной горы: малахитовое платье с узором камня, самоцветный кокошник, медная коса, каменный цветок в руке, ящерка у ног
    mednaya(K) {
      let s = K.aura('#34d399', 98, 104, 0.45) + K.aura('#f59e0b', 46, 40, 0.35);
      // кокошник
      s += K.vol('M64 70 C60 42 76 18 100 12 C124 18 140 42 136 70 Q100 58 64 70Z', { c1: '#fcd34d', c2: '#b45309', rim: '#a7f3d0', rimK: 0.7, tex: false, lw: 2.4 });
      s += K.stitch('M70 64 C68 44 80 26 100 21 C120 26 132 44 130 64', '#fef3c7', 1.8);
      for (const [x, y, c] of [[76, 50, '#ef4444'], [84, 36, '#60a5fa'], [116, 36, '#60a5fa'], [124, 50, '#ef4444'], [92, 28, '#34d399'], [108, 28, '#34d399']]) s += `<circle cx="${x}" cy="${y}" r="3.4" fill="${c}" stroke="#78350f" stroke-width="1.2"/><circle cx="${x - 1}" cy="${y - 1}" r="1" fill="#fff"/>`;
      s += `<path d="M100 26 C107 34 107 42 100 46 C93 42 93 34 100 26Z" fill="${K.lin(['#a7f3d0', '#10b981', '#065f46'])}" stroke="#78350f" stroke-width="1.6"/>` + K.spark(100, 30, 3, '#fff');
      // медные волосы за головой
      s += K.part('M78 78 C74 58 86 50 100 50 C114 50 126 58 122 78 C120 88 112 94 100 94 C88 94 80 88 78 78Z', '#ea580c', { line: '#7c2d12', lw: 2 });
      // левый рукав и рука
      s += K.vol('M84 98 C72 104 64 118 62 134 L78 138 C78 124 82 116 90 110Z', { c1: '#34d399', c2: '#065f46', lw: 2.4 });
      // платье-колокол
      const dress = 'M84 94 C74 96 68 104 66 118 C60 140 48 162 38 176 Q100 186 162 176 C152 162 140 140 134 118 C132 104 126 96 116 94 Q100 100 84 94Z';
      s += K.vol(dress, { c1: '#34d399', c2: '#065f46', rim: '#fde68a', rimK: 0.6, tex: false });
      // малахитовый узор: концентрические волны камня
      let mal = '';
      for (const [x, y, n] of [[70, 168, 5], [132, 140, 4], [96, 124, 3]]) for (let i = 1; i <= n; i++) mal += `<ellipse cx="${x}" cy="${y}" rx="${i * 8}" ry="${r1(i * 5.5)}" transform="rotate(-18 ${x} ${y})" fill="none" stroke="${i % 2 ? '#064e3b' : '#a7f3d0'}" stroke-width="${i % 2 ? 2.2 : 1.2}" opacity="${i % 2 ? 0.5 : 0.45}"/>`;
      s += `<g clip-path="${clip(K, dress)}">${mal}</g>`;
      // золотая планка с ромбами и подол
      s += K.part('M96 100 H104 L108 180 H92Z', '#f59e0b', { line: '#78350f', lw: 1.4 });
      for (const y of [112, 130, 148, 166]) s += K.rhomb(100, y, 4, '#ef4444', '#78350f');
      s += K.stitch('M42 172 Q100 184 158 172', '#fcd34d', 2.4);
      // лицо
      s += K.vol(K.ell(100, 74, 20, 23), { c1: '#fdeee4', c2: '#d9a58a', rim: '#a7f3d0', rimK: 0.6, tex: false, lw: 2.2 });
      s += K.part('M79 70 C80 54 90 50 100 53 C110 50 120 54 121 70 C114 62 106 58 100 62 C94 58 86 62 79 70Z', '#ea580c', { line: '#7c2d12', lw: 1.8 });
      s += K.eyes(100, 77, 8.5, 6.8, { iris: '#10b981', lash: true, look: [0.25, 0.2] });
      s += K.line('M87 68 Q91 66 95 68 M105 68 Q109 66 113 68', '#9a3412', 1.6);
      s += K.blush(87, 87, 4) + K.blush(113, 87, 4);
      s += K.mouth('smile', 100, 88, 8);
      // ожерелье
      s += K.line('M86 98 Q100 108 114 98', '#fcd34d', 2.2);
      for (const [x, y] of [[90, 101.5], [100, 104], [110, 101.5]]) s += `<circle cx="${x}" cy="${y}" r="2.4" fill="#ef4444" stroke="#78350f" stroke-width=".9"/>`;
      // медная коса через плечо
      let braid = '';
      const cu = K.lin(['#fdba74', '#ea580c', '#9a3412']);
      for (const [x, y] of [[80, 92], [77, 103], [74, 114], [72, 125], [71, 136], [71, 147]]) braid += `<ellipse cx="${x}" cy="${y}" rx="7" ry="6.5" fill="${cu}" stroke="#7c2d12" stroke-width="1.6"/><path d="M${x - 4} ${y - 2}Q${x} ${y + 2} ${x + 4} ${y - 1}" stroke="#fed7aa" stroke-width="1.2" fill="none" opacity=".8"/>`;
      s += braid + K.part('M65 154 L71 152 L77 154 L74 160 L68 160Z', '#10b981', { lw: 1.4 }) + K.line('M68 160 L66 170 M71 160 V171 M74 160 L76 170', '#ea580c', 2);
      s += K.vol(K.ell(70, 140, 6.5, 7.5), { c1: '#fdeee4', c2: '#d9a58a', tex: false, lw: 2 });
      // правый рукав, рука с каменным цветком
      s += K.vol('M116 98 C130 100 142 110 146 124 L134 132 C130 122 122 116 112 112Z', { c1: '#34d399', c2: '#065f46', lw: 2.4 });
      s += `<circle class="art-aura" cx="148" cy="104" r="24" fill="${K.rad([[0, '#d1fae5', 0.9], [0.4, '#34d399', 0.5], [1, '#34d399', 0]])}"/>`;
      const pet = K.lin(['#a7f3d0', '#10b981', '#065f46']);
      for (const a of [-162, -126, -90, -54, -18]) s += `<path transform="translate(148 110) rotate(${a})" d="M0 0Q8-8 18 0Q8 8 0 0Z" fill="${pet}" stroke="#064e3b" stroke-width="1.5"/>`;
      s += `<circle cx="148" cy="108" r="4.6" fill="#fcd34d" stroke="#78350f" stroke-width="1.4"/>`;
      s += K.vol(K.ell(144, 122, 7, 6.5), { c1: '#fdeee4', c2: '#d9a58a', tex: false, lw: 2 });
      // ящерка с коронкой
      let liz = K.line('M150 176 C160 180 172 176 174 168 C176 162 170 160 168 164', '#047857', 5) + K.line('M150 176 C160 180 172 176 174 168', '#6ee7b7', 1.6);
      liz += K.line('M138 172 l-4 5 M144 168 l2 -6 M150 174 l2 5', '#065f46', 2.6);
      liz += `<ellipse cx="143" cy="171" rx="10" ry="5.5" transform="rotate(-20 143 171)" fill="${K.lin(['#6ee7b7', '#10b981', '#065f46'])}" stroke="#064e3b" stroke-width="1.6"/>`;
      liz += `<ellipse cx="131" cy="165" rx="6.5" ry="5" transform="rotate(-25 131 165)" fill="${K.lin(['#6ee7b7', '#10b981', '#065f46'])}" stroke="#064e3b" stroke-width="1.6"/><circle cx="129" cy="163.5" r="1.7" fill="#fde047"/><circle cx="129" cy="163.5" r=".7" fill="#1b1030"/>`;
      liz += `<path d="M127 160 l1-4 2 2 1.5-3 1.5 3 2-2 0 4Z" fill="#fcd34d" stroke="#78350f" stroke-width=".8" stroke-linejoin="round"/>`;
      s += liz;
      s += K.spark(36, 70, 4, '#fde68a') + K.spark(170, 60, 3.4, '#a7f3d0', 'art-float') + K.spark(28, 138, 3, '#6ee7b7', 'art-float') + K.spark(176, 150, 2.6, '#fde047');
      return s;
    },
  };
})());
