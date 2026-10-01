'use strict';
/* Процедурная SVG-графика: духи, предметы, иконки. Всё рисуется кодом — без картинок. */

const Art = (() => {
  let seq = 0;

  const SH = {
    round: { d: 'M100 63 C132 63 158 86 158 115 C158 146 132 167 100 167 C68 167 42 146 42 115 C42 86 68 63 100 63Z', top: 63, face: 106, mid: 118, hw: 50, bw: 58, bottom: 167, ex: 21, er: 11, beard: 48 },
    blob:  { d: 'M100 60 C140 58 162 92 162 124 C162 152 144 168 100 168 C56 168 38 152 38 124 C38 92 60 62 100 60Z', top: 60, face: 108, mid: 120, hw: 52, bw: 62, bottom: 168, ex: 22, er: 11, beard: 48 },
    ghost: { d: 'M100 50 C140 50 155 85 155 115 L155 158 Q146 174 135 160 Q123 174 111 160 Q100 174 89 160 Q77 174 65 160 Q54 174 45 158 L45 115 C45 85 60 50 100 50Z', top: 50, face: 100, mid: 112, hw: 48, bw: 55, bottom: 166, ex: 19, er: 10, beard: 50 },
    tall:  { d: 'M62 84 C62 58 80 45 100 45 C120 45 138 58 138 84 L138 156 Q138 170 124 170 L76 170 Q62 170 62 156Z', top: 45, face: 88, mid: 112, hw: 36, bw: 38, bottom: 170, ex: 15, er: 9, beard: 55 },
    drop:  { d: 'M100 40 C120 75 150 100 150 130 C150 158 128 172 100 172 C72 172 50 158 50 130 C50 100 80 75 100 40Z', top: 62, face: 126, mid: 132, hw: 30, bw: 50, bottom: 172, ex: 17, er: 10, beard: 40 },
    wisp:  { d: 'M100 40 C116 66 150 82 148 124 C146 156 125 172 100 172 C75 172 54 156 52 124 C50 96 72 90 78 68 C88 80 92 62 100 40Z', top: 60, face: 122, mid: 128, hw: 34, bw: 48, bottom: 172, ex: 17, er: 10, beard: 40 },
    box:   { d: 'M70 64 H130 Q150 64 150 84 V142 Q150 162 130 162 H70 Q50 162 50 142 V84 Q50 64 70 64Z', top: 64, face: 100, mid: 114, hw: 46, bw: 50, bottom: 162, ex: 22, er: 11, beard: 48 },
    bird:  { d: 'M100 96 C136 96 150 118 148 138 C146 160 124 171 100 171 C76 171 54 160 52 138 C50 118 64 96 100 96Z', head: 'M70 80 A30 30 0 1 0 130 80 A30 30 0 1 0 70 80Z', top: 50, face: 78, mid: 132, hw: 28, bw: 48, bottom: 171, ex: 12, er: 8, beard: 40 },
    robe:  { d: 'M100 92 C124 92 146 142 158 172 L42 172 C54 142 76 92 100 92Z', head: 'M72 72 A28 28 0 1 0 128 72 A28 28 0 1 0 72 72Z', top: 44, face: 72, mid: 136, hw: 27, bw: 50, bottom: 172, ex: 11, er: 8, beard: 66 },
    bag:   { d: 'M62 72 Q81 64 100 71 Q119 64 138 72 L150 158 Q150 170 136 170 L64 170 Q50 170 50 158Z', top: 70, face: 108, mid: 126, hw: 40, bw: 48, bottom: 170, ex: 17, er: 10, beard: 40,
      detail: '<path d="M70 84 L76 150 M128 90 Q122 120 132 152 M92 150 Q100 140 108 152" stroke="#000" stroke-opacity=".12" stroke-width="3" fill="none" stroke-linecap="round"/>' },
  };

  const BACK = ['aura', 'unihorn', 'heads3', 'cattail', 'backpack', 'handlebar', 'tail', 'wings', 'mane', 'halo', 'hair', 'ripples', 'flame', 'horns', 'ears', 'antlers', 'sprout', 'antenna', 'wifi', 'crest', 'pantograph', 'handles', 'sign', 'wheat', 'steam'];

  function shade(hex, amt) { // amt < 0 — темнее, > 0 — светлее
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  const mirror = s => `${s}<g transform="translate(200 0) scale(-1 1)">${s}</g>`;
  const DARK = '#1b1030';

  /* ---------------- ГЛАЗА И РОТ ---------------- */
  // 4.6: белок с тенью от века и обводкой, цветная радужка с ободком, зрачок, два блика
  function eye(x, y, r, iris = '#5b3a1a') {
    const f = n => n.toFixed(2);
    return `<ellipse cx="${x}" cy="${y}" rx="${f(r * 0.84)}" ry="${f(r * 1.02)}" fill="#fff" stroke="${DARK}" stroke-width="${f(Math.max(1.2, r * 0.13))}"/>` +
      `<path d="M${f(x - r * 0.78)} ${f(y - r * 0.2)} Q${x} ${f(y - r * 1.12)} ${f(x + r * 0.78)} ${f(y - r * 0.2)} Q${x} ${f(y - r * 0.6)} ${f(x - r * 0.78)} ${f(y - r * 0.2)}Z" fill="#b9addb" opacity=".5"/>` +
      `<ellipse cx="${f(x + r * 0.1)}" cy="${f(y + r * 0.14)}" rx="${f(r * 0.58)}" ry="${f(r * 0.7)}" fill="${iris}" stroke="${DARK}" stroke-opacity=".6" stroke-width="${f(r * 0.12)}"/>` +
      `<ellipse cx="${f(x + r * 0.1)}" cy="${f(y + r * 0.42)}" rx="${f(r * 0.4)}" ry="${f(r * 0.3)}" fill="#fff" opacity=".22"/>` +
      `<ellipse cx="${f(x + r * 0.12)}" cy="${f(y + r * 0.18)}" rx="${f(r * 0.3)}" ry="${f(r * 0.4)}" fill="${DARK}"/>` +
      `<circle cx="${f(x - r * 0.14)}" cy="${f(y - r * 0.2)}" r="${f(r * 0.27)}" fill="#fff"/><circle cx="${f(x + r * 0.36)}" cy="${f(y + r * 0.46)}" r="${f(r * 0.12)}" fill="#fff" opacity=".9"/>`;
  }
  function glowEye(x, y, r, col, fid) {
    return `<ellipse cx="${x}" cy="${y}" rx="${r * 1.05}" ry="${r * 0.7}" fill="${col}" filter="url(#${fid})"/>` +
      `<ellipse cx="${x}" cy="${y}" rx="${r * 0.62}" ry="${r * 0.4}" fill="#fff" opacity=".9"/>`;
  }
  function face(L, sh, fid) {
    const y = sh.face, dx = sh.ex, r = sh.er, ec = L.eye || L.c3, ir = L.iris || shade(L.c2, -0.35);
    let s = '<g class="art-eyes">';
    switch (L.eyes) {
      case 'big': s += eye(100 - dx, y, r * 1.3, ir) + eye(100 + dx, y, r * 1.3, ir); break;
      case 'sleepy':
        [100 - dx, 100 + dx].forEach(x => { s += `<path d="M${x - r * 0.85} ${y} Q${x} ${y + r * 0.8} ${x + r * 0.85} ${y}" stroke="${DARK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`; });
        break;
      case 'angry':
        s += eye(100 - dx, y, r, ir) + eye(100 + dx, y, r, ir);
        s += `<path d="M${100 - dx - r * 1.1} ${y - r * 1.35} L${100 - dx + r * 0.9} ${y - r * 0.6}" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/>`;
        s += `<path d="M${100 + dx + r * 1.1} ${y - r * 1.35} L${100 + dx - r * 0.9} ${y - r * 0.6}" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/>`;
        break;
      case 'glow': s += glowEye(100 - dx, y, r, ec, fid) + glowEye(100 + dx, y, r, ec, fid); break;
      case 'one':
        s += `<ellipse cx="100" cy="${y}" rx="${r * 1.9}" ry="${r * 1.6}" fill="#fff" stroke="${DARK}" stroke-width="2"/>` +
          `<ellipse cx="100" cy="${y + 1}" rx="${r * 0.7}" ry="${r * 1.2}" fill="${ec}"/><ellipse cx="100" cy="${y + 1}" rx="${r * 0.25}" ry="${r * 0.9}" fill="${DARK}"/>` +
          `<circle cx="${100 - r * 0.5}" cy="${y - r * 0.6}" r="${r * 0.3}" fill="#fff"/>` +
          `<path d="M${100 - r * 2} ${y - r * 2} Q100 ${y - r * 2.9} ${100 + r * 2} ${y - r * 2}" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
        break;
      case 'many':
        [[-0.55, -5, 0.6], [0.55, -5, 0.6], [-1.35, 4, 0.48], [1.35, 4, 0.48], [0, 6, 0.4]].forEach(([k, oy, rs]) => { s += glowEye(100 + dx * k, y + oy, r * rs, ec, fid); });
        break;
      default: s += eye(100 - dx, y, r, ir) + eye(100 + dx, y, r, ir);
    }
    s += '</g>';
    const my = y + r + 9;
    switch (L.mouth) {
      case 'smile': s += `<path d="M93 ${my} Q100 ${my + 7} 107 ${my}" stroke="${DARK}" stroke-width="3" fill="none" stroke-linecap="round"/>`; break;
      case 'o': s += `<ellipse cx="100" cy="${my + 2}" rx="4" ry="5" fill="${DARK}"/>`; break;
      case 'cat': s += `<path d="M92 ${my} Q96 ${my + 5} 100 ${my} Q104 ${my + 5} 108 ${my}" stroke="${DARK}" stroke-width="3" fill="none" stroke-linecap="round"/>`; break;
      case 'teeth': {
        s += `<path d="M86 ${my - 2} Q100 ${my + 16} 114 ${my - 2} Z" fill="#2a0f14"/>`;
        let tp = `M87 ${my - 2}`;
        for (let i = 0; i < 5; i++) { const x = 87 + i * 5.4; tp += ` L${x + 2.7} ${my + 4} L${x + 5.4} ${my - 2}`; }
        s += `<path d="${tp} Z" fill="#fff"/>`;
        break;
      }
      case 'beak': s += `<path d="M92 ${y + 7} L108 ${y + 7} L100 ${y + 19} Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.5" stroke-linejoin="round"/>`; break;
    }
    return s;
  }

  /* ---------------- ДЕТАЛИ ---------------- */
  function feat(name, L, sh, ids) {
    const t = sh.top, f = sh.face, m = sh.mid, b = sh.bottom, hw = sh.hw, bw = sh.bw, c1 = L.c1, c2 = L.c2, c3 = L.c3;
    switch (name) {
      case 'aura':
        return `<circle class="art-aura" cx="100" cy="112" r="94" fill="url(#${ids.a})"/>`;
      case 'flame':
        return `<g class="art-flicker"><path d="M100 ${t - 40} C114 ${t - 22} 124 ${t - 8} 120 ${t + 6} C116 ${t + 20} 84 ${t + 20} 80 ${t + 6} C76 ${t - 8} 92 ${t - 16} 100 ${t - 40}Z" fill="${c3}"/>` +
          `<path d="M100 ${t - 22} C108 ${t - 12} 112 ${t - 2} 110 ${t + 6} C107 ${t + 14} 93 ${t + 14} 90 ${t + 6} C88 ${t - 2} 94 ${t - 8} 100 ${t - 22}Z" fill="#fff6c2"/></g>`;
      case 'mane': {
        let p = '', R = hw + 24, r = hw + 6, cy = f + 6, n = 16;
        for (let i = 0; i < n * 2; i++) {
          const a = Math.PI * i / n, rr = i % 2 ? r : R;
          p += `${i ? 'L' : 'M'}${(100 + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
        }
        return `<path class="art-flicker" d="${p}Z" fill="${c3}" stroke="${shade(c3, -0.25)}" stroke-width="2" stroke-linejoin="round"/>`;
      }
      case 'horns':
        return mirror(`<path d="M${100 - hw * 0.55} ${t + 14} Q${100 - hw * 0.98} ${t - 14} ${100 - hw * 0.78} ${t - 32} Q${100 - hw * 0.5} ${t - 8} ${100 - hw * 0.18} ${t + 10}Z" fill="#fde68a" stroke="${shade('#fde68a', -0.45)}" stroke-width="2" stroke-linejoin="round"/>`);
      case 'ears':
        return mirror(`<path d="M${100 - hw * 0.85} ${t + 24} L${100 - hw * 0.98} ${t - 18} L${100 - hw * 0.28} ${t + 8}Z" fill="${c2}" stroke="${shade(c2, -0.4)}" stroke-width="2" stroke-linejoin="round"/>` +
          `<path d="M${100 - hw * 0.8} ${t + 16} L${100 - hw * 0.88} ${t - 6} L${100 - hw * 0.46} ${t + 10}Z" fill="${c3}" opacity=".75"/>`);
      case 'sprout':
        return `<path d="M100 ${t + 8} Q97 ${t - 10} 101 ${t - 22}" stroke="#3f6212" stroke-width="4" fill="none" stroke-linecap="round"/>` +
          `<path d="M101 ${t - 20} Q88 ${t - 40} 74 ${t - 26} Q90 ${t - 12} 101 ${t - 20}Z" fill="${c3}" stroke="#3f6212" stroke-width="1.5"/>` +
          `<path d="M101 ${t - 20} Q116 ${t - 42} 130 ${t - 30} Q114 ${t - 12} 101 ${t - 20}Z" fill="${c3}" stroke="#3f6212" stroke-width="1.5"/>`;
      case 'antlers':
        return mirror(`<path d="M${100 - hw * 0.4} ${t + 10} L${100 - hw * 0.8} ${t - 22} L${100 - hw * 1.3} ${t - 42} M${100 - hw * 0.8} ${t - 22} L${100 - hw * 0.5} ${t - 46} M${100 - hw * 1.05} ${t - 32} L${100 - hw * 1.55} ${t - 26}" stroke="${c3}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
      case 'antenna':
        return `<path d="M100 ${t + 6} V${t - 24}" stroke="${shade(c2, -0.3)}" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="${t - 28}" r="6.5" fill="${c3}" filter="url(#${ids.f})"/><circle cx="100" cy="${t - 28}" r="4" fill="#fff"/>`;
      case 'wifi': {
        const cy = t - 28;
        return [14, 23].map((r, i) => `<path class="art-blink" style="animation-delay:${i * 0.25}s" d="M${100 - r * 0.72} ${cy - r * 0.7} A${r} ${r} 0 0 1 ${100 + r * 0.72} ${cy - r * 0.7}" stroke="${c3}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`).join('');
      }
      case 'unihorn': // единственный витой рог (Индрик-зверь)
        return `<path d="M91 ${t + 12} L100 ${t - 40} L109 ${t + 12}Z" fill="#e0f2fe" stroke="${shade(c2, -0.2)}" stroke-width="2.2" stroke-linejoin="round"/>` +
          `<path d="M93.5 ${t + 1}l12 -4M95.5 ${t - 11}l9 -3.5M97.5 ${t - 23}l5.5 -2.5" stroke="${shade(c2, -0.2)}" stroke-width="1.6" stroke-linecap="round"/>`;
      case 'crest':
        return [-1, 0, 1].map(i => `<path d="M${100 + i * 6} ${t + 8} Q${100 + i * 14} ${t - 14} ${100 + i * 22} ${t - 24}" stroke="${c3}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="${100 + i * 22}" cy="${t - 25}" r="4.5" fill="${c1}"/>`).join('');
      case 'wings': {
        const x = 100 - bw + 14;
        const w = `<path class="art-wing" d="M${x} ${m - 8} C${x - 44} ${m - 64} ${x - 80} ${m - 36} ${x - 74} ${m} C${x - 58} ${m - 8} ${x - 54} ${m + 12} ${x - 38} ${m + 14} C${x - 30} ${m + 8} ${x - 18} ${m + 24} ${x} ${m + 16}Z" fill="${c2}" stroke="${c3}" stroke-width="3" stroke-linejoin="round"/>`;
        return mirror(w);
      }
      case 'tail': {
        const x = 100 + bw * 0.4, y = m + 22;
        return `<g class="art-sway">` +
          `<path d="M${x} ${y} C${x + 40} ${y + 20} ${x + 58} ${y - 8} ${x + 64} ${y - 50}" stroke="${c3}" stroke-width="11" fill="none" stroke-linecap="round"/>` +
          `<path d="M${x} ${y} C${x + 30} ${y + 34} ${x + 64} ${y + 20} ${x + 76} ${y - 12}" stroke="${c1}" stroke-width="9" fill="none" stroke-linecap="round"/>` +
          `<path d="M${x} ${y} C${x + 24} ${y + 44} ${x + 56} ${y + 44} ${x + 72} ${y + 26}" stroke="${c2}" stroke-width="8" fill="none" stroke-linecap="round"/></g>`;
      }
      case 'hair':
        return mirror(`<path d="M100 ${t - 4} C${100 - hw - 26} ${t - 2} ${100 - bw - 22} ${b - 34} ${100 - bw - 12} ${b + 2} Q${100 - bw} ${b - 10} ${100 - bw + 14} ${b - 2} C${100 - bw + 4} ${f + 10} ${100 - hw * 0.4} ${t + 22} 100 ${t + 16}Z" fill="${c3}" stroke="${shade(c3, -0.3)}" stroke-width="2"/>`);
      case 'ripples':
        return `<ellipse cx="100" cy="${b - 2}" rx="${bw + 16}" ry="10" fill="none" stroke="${c3}" stroke-width="2.5" opacity=".75"/><ellipse cx="100" cy="${b - 1}" rx="${bw + 34}" ry="15" fill="none" stroke="${c3}" stroke-width="2" opacity=".4"/>`;
      case 'pantograph':
        return `<path d="M100 ${t + 2} L84 ${t - 16} L106 ${t - 32}" stroke="#334155" stroke-width="3.5" fill="none" stroke-linejoin="round"/><path d="M82 ${t - 33} H126" stroke="#334155" stroke-width="4" stroke-linecap="round"/><circle class="art-blink" cx="118" cy="${t - 37}" r="3.5" fill="${c3}" filter="url(#${ids.f})"/>`;

      // ----- передний план -----
      case 'cheeks':
        return `<ellipse cx="${100 - sh.ex - sh.er * 0.95}" cy="${f + sh.er * 0.95}" rx="${sh.er * 0.62}" ry="${sh.er * 0.4}" fill="#ff7aa8" opacity=".55"/><ellipse cx="${100 + sh.ex + sh.er * 0.95}" cy="${f + sh.er * 0.95}" rx="${sh.er * 0.62}" ry="${sh.er * 0.4}" fill="#ff7aa8" opacity=".55"/>`;
      case 'beard': {
        const w = Math.max(hw * 0.62, 16), len = sh.beard, y = f + 8;
        return `<path d="M${100 - w} ${y} Q${100 - w * 0.8} ${y + len * 0.85} 100 ${y + len} Q${100 + w * 0.8} ${y + len * 0.85} ${100 + w} ${y} Q100 ${y + 16} ${100 - w} ${y}Z" fill="${c3}" stroke="${shade(c3, -0.3)}" stroke-width="2"/>` +
          `<path d="M100 ${y + 4} Q${100 - w * 0.4} ${y - 4} ${100 - w * 0.85} ${y + 6} M100 ${y + 4} Q${100 + w * 0.4} ${y - 4} ${100 + w * 0.85} ${y + 6}" stroke="${shade(c3, -0.15)}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      }
      // 4.0: шапочка-жёлудь (Желудок)
      case 'acorn':
        return `<path d="M${100 - hw * 0.95} ${t + 16} Q${100 - hw * 0.95} ${t - 14} 100 ${t - 16} Q${100 + hw * 0.95} ${t - 14} ${100 + hw * 0.95} ${t + 16} Q100 ${t + 6} ${100 - hw * 0.95} ${t + 16}Z" fill="#92400e" stroke="#451a03" stroke-width="3" stroke-linejoin="round"/>` +
          `<path d="M${100 - hw * 0.6} ${t + 4} L${100 - hw * 0.2} ${t - 10} M${100 - hw * 0.2} ${t + 8} L${100 + hw * 0.2} ${t - 12} M${100 + hw * 0.2} ${t + 8} L${100 + hw * 0.6} ${t - 8} M${100 - hw * 0.6} ${t - 6} L${100 - hw * 0.2} ${t + 8} M${100 + hw * 0.2} ${t - 10} L${100 + hw * 0.6} ${t + 4}" stroke="#b45309" stroke-width="2" opacity=".7"/>` +
          `<path d="M99 ${t - 15} Q98 ${t - 26} 106 ${t - 30}" stroke="#451a03" stroke-width="4.5" fill="none" stroke-linecap="round"/>` +
          `<ellipse cx="${100 - hw * 0.45}" cy="${t - 4}" rx="7" ry="3" transform="rotate(-20 ${100 - hw * 0.45} ${t - 4})" fill="#fff" opacity=".3"/>`;
      case 'hat':
        return `<path d="M${100 - hw * 0.8} ${t + 16} Q${100 - hw * 0.6} ${t - 8} ${100 - hw * 0.2} ${t - 26} Q${100 + hw * 0.1} ${t - 44} ${100 + hw * 0.5} ${t - 34} Q${100 + hw * 0.3} ${t - 22} ${100 + hw * 0.8} ${t + 16}Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="2" stroke-linejoin="round"/>` +
          `<path d="M${100 - hw * 0.86} ${t + 16} Q100 ${t + 2} ${100 + hw * 0.86} ${t + 16} Q100 ${t + 28} ${100 - hw * 0.86} ${t + 16}Z" fill="#fef3c7" stroke="#a16207" stroke-width="1.5"/>` +
          `<circle cx="${100 + hw * 0.52}" cy="${t - 36}" r="6" fill="#fef3c7"/>`;
      case 'crown': {
        const w = hw * 0.62;
        return `<path d="M${100 - w} ${t + 8} L${100 - w} ${t - 16} L${100 - w / 2} ${t - 4} L100 ${t - 24} L${100 + w / 2} ${t - 4} L${100 + w} ${t - 16} L${100 + w} ${t + 8}Z" fill="#fbbf24" stroke="#92400e" stroke-width="2" stroke-linejoin="round"/><circle cx="100" cy="${t - 1}" r="4" fill="#e11d48"/>`;
      }
      case 'leaves': {
        const leaf = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0 Q12 -11 26 0 Q12 11 0 0Z" fill="#4ade80" stroke="#166534" stroke-width="1.5"/><path d="M2 0 H22" stroke="#166534" stroke-width="1"/></g>`;
        return leaf(100 - bw + 4, m + 12, -150) + leaf(100 + bw - 6, m - 2, -20) + leaf(100 - hw * 0.2, t + 6, -110);
      }
      case 'bolt': {
        const bolt = `<path class="art-blink" d="M0 0 L12 0 L5 13 L14 13 L-3 34 L3 18 L-6 18Z" fill="#fde047" stroke="#a16207" stroke-width="1.5" stroke-linejoin="round" transform="translate(${100 - bw - 18} ${f - 4}) rotate(-12)"/>`;
        return mirror(bolt);
      }
      case 'swirl':
        return `<g class="art-spin-soft" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8">` +
          `<path d="M${100 - bw - 10} ${m + 20} q-14 -22 6 -34 q18 -8 20 10"/>` +
          `<path d="M${100 + bw + 8} ${m - 14} q14 22 -6 34 q-18 8 -20 -10"/>` +
          `<path d="M${100 - 30} ${b + 4} q30 10 60 0" opacity=".6"/></g>`;
      case 'bubbles':
        return [[bw + 8, -18, 6], [bw + 20, -40, 4], [-bw - 10, -6, 5], [-bw - 2, -30, 3]].map(([dx, dy, r]) =>
          `<g class="art-float"><circle cx="${100 + dx}" cy="${f + dy}" r="${r}" fill="none" stroke="${c3}" stroke-width="2"/><circle cx="${100 + dx - r * 0.35}" cy="${f + dy - r * 0.35}" r="${r * 0.3}" fill="#fff"/></g>`).join('');
      case 'whiskers':
        return mirror(`<path d="M${100 - sh.ex - 6} ${f + 16} q-20 -6 -36 2 M${100 - sh.ex - 6} ${f + 20} q-18 4 -32 14" stroke="${c3}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
      case 'cables':
        return `<path d="M${100 - bw + 16} ${b - 4} q-8 18 4 30" stroke="#1e293b" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="${100 - bw + 14}" y="${b + 24}" width="11" height="8" rx="2" fill="${c3}"/>` +
          `<path d="M${100 + bw - 18} ${b - 4} q10 14 2 26" stroke="#1e293b" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="${100 + bw - 22}" y="${b + 20}" width="11" height="8" rx="2" fill="#f472b6"/>`;
      case 'stripe':
        return `<rect x="${100 - bw}" y="${f + 26}" width="${bw * 2}" height="10" fill="${c3}" opacity=".95"/>` +
          `<circle cx="${100 - bw + 13}" cy="${b - 13}" r="6" fill="#fef9c3" stroke="${shade(c2, -0.3)}" stroke-width="1.5"/><circle cx="${100 + bw - 13}" cy="${b - 13}" r="6" fill="#fef9c3" stroke="${shade(c2, -0.3)}" stroke-width="1.5"/>`;
      case 'lamp':
        return `<rect x="94" y="${t - 12}" width="12" height="16" fill="${c2}"/>` +
          `<circle class="art-flicker" cx="100" cy="${t - 27}" r="28" fill="${c3}" opacity=".35" filter="url(#${ids.f})"/>` +
          `<path d="M80 ${t - 12} L120 ${t - 12} L111 ${t - 40} L89 ${t - 40}Z" fill="#334155" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>` +
          `<path class="art-flicker" d="M86 ${t - 15} L114 ${t - 15} L107 ${t - 36} L93 ${t - 36}Z" fill="#fef9c3"/>` +
          `<path d="M84 ${t - 40} L116 ${t - 40} L100 ${t - 52}Z" fill="#0f172a"/>`;
      case 'bag': {
        const x = 100 + bw - 2, y = b - 34;
        return `<path d="M${x - 18} ${y - 8} Q${x - 30} ${y + 28} ${x} ${y + 30} Q${x + 30} ${y + 28} ${x + 18} ${y - 8} Q${x} ${y} ${x - 18} ${y - 8}Z" fill="#78716c" stroke="#292524" stroke-width="2"/>` +
          `<path d="M${x - 16} ${y - 9} L${x - 6} ${y - 22} L${x} ${y - 12} L${x + 8} ${y - 24} L${x + 16} ${y - 9}" fill="#78716c" stroke="#292524" stroke-width="2" stroke-linejoin="round"/>` +
          `<path d="M${x - 17} ${y - 6} Q${x} ${y + 2} ${x + 17} ${y - 6}" stroke="#d6d3d1" stroke-width="3" fill="none"/>` +
          `<path d="M${x - 8} ${y + 12} l4 4 m4 -6 l-3 5" stroke="#292524" stroke-width="2" fill="none"/>`;
      }
      case 'bones': {
        let s = `<path d="M100 104 V160" stroke="#e2e8f0" stroke-width="3.5" opacity=".8" stroke-linecap="round"/>`;
        for (let i = 0; i < 4; i++) { const y = 112 + i * 12, w = 20 - i * 1.5 + i * 3; s += `<path d="M${100 - w} ${y + 4} Q100 ${y - 4} ${100 + w} ${y + 4}" stroke="#e2e8f0" stroke-width="3.5" fill="none" opacity=".8" stroke-linecap="round"/>`; }
        return s;
      }
      case 'cobweb': {
        const cx = 100 - bw + 10, cy = t + 18;
        let s = `<g stroke="#fff" stroke-width="1.3" fill="none" opacity=".6">`;
        [200, 235, 270, 305].forEach(a => { const r = a * Math.PI / 180; s += `<path d="M${cx} ${cy} L${(cx + Math.cos(r) * 28).toFixed(1)} ${(cy + Math.sin(r) * 28).toFixed(1)}"/>`; });
        [10, 19].forEach(rr => { s += `<path d="M${(cx + Math.cos(200 * Math.PI / 180) * rr).toFixed(1)} ${(cy + Math.sin(200 * Math.PI / 180) * rr).toFixed(1)} Q${cx - rr * 0.6} ${cy - rr * 0.6} ${(cx + Math.cos(270 * Math.PI / 180) * rr).toFixed(1)} ${(cy + Math.sin(270 * Math.PI / 180) * rr).toFixed(1)} Q${cx + rr * 0.3} ${cy - rr * 0.9} ${(cx + Math.cos(305 * Math.PI / 180) * rr).toFixed(1)} ${(cy + Math.sin(305 * Math.PI / 180) * rr).toFixed(1)}"/>`; });
        return s + `</g>`;
      }
      case 'drops':
        return [[-bw - 8, m - 20], [bw + 6, m + 4], [-bw + 4, b - 8]].map(([dx, y]) =>
          `<path class="art-float" d="M0 -9 C4 -3 7 1 7 4 A7 7 0 0 1 -7 4 C-7 1 -4 -3 0 -9Z" fill="#7dd3fc" stroke="#0369a1" stroke-width="1.2" transform="translate(${100 + dx} ${y})"/>`).join('');
      // ----- v1.3 -----
      case 'handles':
        return mirror(`<path d="M${100 - hw * 0.78} ${t + 8} C${100 - hw * 0.85} ${t - 34} ${100 - hw * 0.05} ${t - 34} ${100 - hw * 0.12} ${t + 8}" fill="none" stroke="${shade(c2, -0.2)}" stroke-width="7" stroke-linecap="round"/>` +
          `<path d="M${100 - hw * 0.78} ${t + 8} C${100 - hw * 0.85} ${t - 34} ${100 - hw * 0.05} ${t - 34} ${100 - hw * 0.12} ${t + 8}" fill="none" stroke="${c1}" stroke-width="3" stroke-linecap="round"/>`);
      case 'steam':
        return `<g class="art-float" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6">` +
          [78, 100, 122].map((x, i) => `<path d="M${x} ${t - 4 - (i % 2) * 6} q-8 -10 0 -20 q8 -10 0 -20"/>`).join('') + '</g>';
      case 'broom': {
        const x0 = 100 + bw - 10, y0 = m + 34, x1 = 100 + bw + 14, y1 = m - 40;
        return `<path d="M${x0} ${y0} L${x1} ${y1}" stroke="#92400e" stroke-width="5" stroke-linecap="round"/>` +
          `<g transform="translate(${x1} ${y1}) rotate(18)"><ellipse cx="0" cy="-22" rx="13" ry="20" fill="#4ade80" stroke="#166534" stroke-width="1.5"/>` +
          `<path d="M0 2 L-10 -34 M0 2 L-3 -40 M0 2 L5 -38 M0 2 L11 -30" stroke="#166534" stroke-width="2" stroke-linecap="round"/></g>`;
      }
      case 'halo': {
        let rays = '';
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * Math.PI * 2, r1 = hw + 26, r2 = hw + 40;
          rays += `<path d="M${(100 + Math.cos(a) * r1).toFixed(1)} ${(f + Math.sin(a) * r1).toFixed(1)} L${(100 + Math.cos(a) * r2).toFixed(1)} ${(f + Math.sin(a) * r2).toFixed(1)}"/>`;
        }
        return `<g class="art-spin-soft"><circle cx="100" cy="${f}" r="${hw + 26}" fill="${c3}" opacity=".6"/><g stroke="${c3}" stroke-width="4" stroke-linecap="round">${rays}</g></g>`;
      }
      case 'wheat': {
        let grains = '';
        for (let k = 0; k < 5; k++) {
          const y = t - 22 - k * 6, x = 100 - hw * 0.72 - k * 2.2;
          grains += `<ellipse cx="${x - 4}" cy="${y}" rx="3.5" ry="6" transform="rotate(-30 ${x - 4} ${y})" fill="${c3}"/><ellipse cx="${x + 4}" cy="${y}" rx="3.5" ry="6" transform="rotate(30 ${x + 4} ${y})" fill="${c3}"/>`;
        }
        return mirror(`<path d="M${100 - hw * 0.4} ${t + 8} Q${100 - hw * 0.6} ${t - 14} ${100 - hw * 0.82} ${t - 50}" stroke="#a16207" stroke-width="3" fill="none"/>${grains}`);
      }
      case 'sign':
        return `<path d="M100 ${t + 2} V${t - 18}" stroke="#334155" stroke-width="4"/><circle cx="100" cy="${t - 31}" r="15" fill="${c3}" stroke="#fff" stroke-width="2.5"/>` +
          `<path d="M91 ${t - 24} V${t - 38} L100 ${t - 29} L109 ${t - 38} V${t - 24}" stroke="#fff" stroke-width="3.2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
      case 'heads3': {
        const hx = 100 - bw - 14, hy = t - 4, dark = shade(c2, -0.3);
        return mirror(`<path d="M${100 - bw * 0.5} ${t + 36} Q${100 - bw - 6} ${t + 26} ${hx} ${hy}" stroke="${dark}" stroke-width="22" stroke-linecap="round" fill="none"/>` +
          `<path d="M${100 - bw * 0.5} ${t + 36} Q${100 - bw - 6} ${t + 26} ${hx} ${hy}" stroke="${c1}" stroke-width="15" stroke-linecap="round" fill="none"/>` +
          `<path d="M${hx - 8} ${hy - 14} L${hx - 12} ${hy - 30} L${hx - 1} ${hy - 17}Z" fill="#fde68a" stroke="${dark}" stroke-width="1.5"/>` +
          `<circle cx="${hx}" cy="${hy}" r="19" fill="${c1}" stroke="${dark}" stroke-width="3"/>` +
          `<ellipse cx="${hx - 6}" cy="${hy - 3}" rx="4" ry="3" fill="${c3}" filter="url(#${ids.f})"/><ellipse cx="${hx + 6}" cy="${hy - 3}" rx="4" ry="3" fill="${c3}" filter="url(#${ids.f})"/>` +
          `<path d="M${hx - 8} ${hy + 8} L${hx - 4} ${hy + 12} L${hx} ${hy + 8} L${hx + 4} ${hy + 12} L${hx + 8} ${hy + 8}" stroke="#fff" stroke-width="2" fill="none"/>`);
      }
      // ----- v1.7 -----
      case 'cattail':
        return `<g class="art-sway"><path d="M${100 + bw * 0.55} ${b - 14} C${100 + bw + 34} ${b - 8} ${100 + bw + 36} ${m - 40} ${100 + bw + 12} ${m - 56}" stroke="${shade(c2, -0.2)}" stroke-width="14" fill="none" stroke-linecap="round"/>` +
          `<path d="M${100 + bw * 0.55} ${b - 14} C${100 + bw + 34} ${b - 8} ${100 + bw + 36} ${m - 40} ${100 + bw + 12} ${m - 56}" stroke="${c1}" stroke-width="8" fill="none" stroke-linecap="round"/></g>`;
      case 'snout': {
        const y = f + sh.er + 10, rx = hw * 0.42, ry = hw * 0.28;
        return `<ellipse cx="100" cy="${y}" rx="${rx}" ry="${ry}" fill="${c3}" stroke="${shade(c3, -0.35)}" stroke-width="2"/>` +
          `<ellipse cx="100" cy="${y - ry * 0.45}" rx="${rx * 0.32}" ry="${ry * 0.3}" fill="${DARK}"/>` +
          `<path d="M100 ${y - ry * 0.15} V${y + ry * 0.35} M${100 - rx * 0.4} ${y + ry * 0.45} Q100 ${y + ry * 0.75} ${100 + rx * 0.4} ${y + ry * 0.45}" stroke="${DARK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
      }
      case 'handlebar':
        return `<path d="M${100 + hw * 0.45} ${t + 6} L${100 + hw * 0.7} ${t - 34}" stroke="#334155" stroke-width="6" stroke-linecap="round"/>` +
          `<path d="M${100 + hw * 0.4} ${t - 36} H${100 + hw * 1.05}" stroke="#1f2937" stroke-width="7" stroke-linecap="round"/>`;
      case 'wheels':
        return [-1, 1].map(k => `<circle cx="${100 + k * bw * 0.62}" cy="${b + 2}" r="15" fill="#1f2937" stroke="${c3}" stroke-width="3"/><circle cx="${100 + k * bw * 0.62}" cy="${b + 2}" r="5" fill="${c3}"/>`).join('');
      case 'backpack': {
        const w = bw * 1.05, x = 100 + bw * 0.15, y = t - 10;
        return `<rect x="${x}" y="${y}" width="${w}" height="${w * 0.95}" rx="8" fill="${c3}" stroke="${shade(c2, -0.3)}" stroke-width="3"/>` +
          `<path d="M${x + 8} ${y + 14} H${x + w - 8}" stroke="${c1}" stroke-width="5"/><path d="M${x + w / 2 - 8} ${y + 26} h16" stroke="${c2}" stroke-width="3" stroke-linecap="round"/>`;
      }
      case 'runes': {
        const g = (x, y) => `<path class="art-blink" d="M${x - 5} ${y - 8} L${x} ${y + 8} L${x + 5} ${y - 8} M${x - 4} ${y - 1} H${x + 4}" stroke="${c3}" stroke-width="2.2" fill="none" stroke-linecap="round" filter="url(#${ids.f})"/>`;
        return g(100 - bw * 0.52, m + 18) + g(100 + bw * 0.52, m + 24);
      }
    }
    return '';
  }

  // 4.6: фактура стихии — узор внутри силуэта духа
  const TEX = {
    fire: ['30', '<circle cx="6" cy="8" r="1.4" fill="#fff3b0"/><circle cx="21" cy="19" r="1" fill="#fde68a"/><path d="M14 28c-2-4 2-5 0-9 3 2 3 6 0 9z" fill="#fff3b0" opacity=".7"/>', '.4'],
    water: ['34', '<path d="M0 10q8.5-5 17 0t17 0M0 27q8.5-5 17 0t17 0" fill="none" stroke="#fff" stroke-width="1.3"/><circle cx="26" cy="18" r="2" fill="none" stroke="#fff" stroke-width=".9"/>', '.22'],
    forest: ['32', '<path d="M6 22q4-10 12-10-2 8-12 10zM6 22l7-6" fill="#14532d" stroke="#14532d" stroke-width=".8"/><circle cx="24" cy="8" r="1.8" fill="#14532d"/><circle cx="27" cy="26" r="1.2" fill="#14532d"/>', '.2'],
    wind: ['38', '<path d="M2 12q10-6 18 0 5 4 1 7-4 2-5-2M18 30q8-5 16 0" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>', '.26'],
    current: ['30', '<path d="M4 6l6 5-4 3 7 6M20 18l5 4-3 2 5 4" fill="none" stroke="#fffbe6" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/>', '.32'],
    shadow: ['36', '<circle cx="5" cy="7" r=".9" fill="#fff"/><circle cx="23" cy="13" r=".6" fill="#fff"/><circle cx="14" cy="28" r=".8" fill="#fff"/><circle cx="31" cy="30" r=".5" fill="#fff"/><path d="M29 4l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="#e9d5ff"/>', '.75'],
  };
  const cache = {};
  const SPARKLES = [[26, 40, 1], [172, 58, 0.8], [160, 150, 0.65], [36, 140, 0.55]].map(([x, y, k], i) =>
    `<path class="art-blink" style="animation-delay:${i * 0.4}s" d="M${x} ${y - 12 * k} L${x + 3 * k} ${y - 3 * k} L${x + 12 * k} ${y} L${x + 3 * k} ${y + 3 * k} L${x} ${y + 12 * k} L${x - 3 * k} ${y + 3 * k} L${x - 12 * k} ${y} L${x - 3 * k} ${y - 3 * k}Z" fill="#fde047" stroke="#fff" stroke-width="1"/>`).join('');
  function shinyHue(sid) { return 90 + Math.round(U.h('shinyhue', sid) * 180); }
  // 4.17: рисунки духов картинками (img/spirits/<id>.webp, 400×400, прозрачный фон) — у кого уже есть; остальные рисуются SVG, как прежде.
  // Список (id → метка содержимого) пишет tools/art/spirit-pics.mjs.
  // Сияющий — бело-радужный перламутр: фигура почти белая, по ней мягко переливается радуга, бежит блик, вокруг ореол и искры; омрачённый — тёмный
  // холодный лиловый тон, тёмное свечение и дым Нави у ног. Перелив и тон ложатся только на фигуру (маска — сама картинка), стили — .sp-pic в style.css
  const PICS = {}; // tools/art/spirit-pics.mjs
  const picUrl = sid => PICS[sid] ? `img/spirits/${sid}.webp?v=${PICS[sid]}` : null;
  // solo — картинка без слоёв (списки, карта, фото с поимки): лиловый — самим фильтром, перламутр — анимацией оттенка (.sp-pearl в style.css)
  const elColor = sid => ELEMENTS[SP[sid].el].color;
  const glow = () => ''; // 4.17: без свечения по стихии — только контур стикера
  // почти чёрная кайма по контуру — дух вырезан, как стикер
  const EDGE = '#15121c';
  const edge = solo => { const w = solo ? .6 : .9; return `drop-shadow(${w}px 0 0 ${EDGE}) drop-shadow(-${w}px 0 0 ${EDGE}) drop-shadow(0 ${w}px 0 ${EDGE}) drop-shadow(0 -${w}px 0 ${EDGE}) `; };
  const picFilter = (sid, shiny, dark, solo) => dark ? (solo ? 'sepia(.7) hue-rotate(215deg) saturate(1.6) ' : '') + 'brightness(.62) saturate(.5) contrast(1.2) ' + edge(solo) + 'drop-shadow(0 0 5px rgba(147, 51, 234, .95))'
    : (shiny ? 'grayscale(.4) contrast(.85) brightness(1.2) ' + (solo ? 'saturate(1.2) hue-rotate(30deg) ' : '') : '') + edge(solo) + glow(sid, solo); // сияющий: лёгкое серебро поверх своего цвета
  const picImg = (sid, shiny, dark, cls) => {
    const solo = cls === 'art', pearl = solo && shiny && !dark, fl = pearl ? '' : picFilter(sid, shiny, dark, solo);
    return `<img class="${cls}${pearl ? ' sp-pearl' : ''}" src="${picUrl(sid)}" alt="" draggable="false" decoding="async"${fl ? ` style="filter:${fl}"` : pearl ? ` style="--gl:${elColor(sid)}"` : ''}>`;
  };
  const over = svg => `<svg class="stk" viewBox="0 0 200 200">${svg}</svg>`;
  const SHINE = [[26, 40, 1], [172, 58, .8], [160, 150, .65], [36, 140, .55], [100, 18, .9], [186, 110, .6], [16, 96, .7]].map(([x, y, k], i) =>
    `<path class="art-blink" style="animation-delay:${i * .4}s" d="M${x} ${y - 12 * k} L${x + 3 * k} ${y - 3 * k} L${x + 12 * k} ${y} L${x + 3 * k} ${y + 3 * k} L${x} ${y + 12 * k} L${x - 3 * k} ${y + 3 * k} L${x - 12 * k} ${y} L${x - 3 * k} ${y - 3 * k}Z" fill="${['#fbcfe8', '#bae6fd', '#e9d5ff', '#a7f3d0', '#fff'][i % 5]}" stroke="#fff" stroke-width="1"/>`).join(''); // перламутровые искры
  // Омрачённый: по фигуре редко мерцают очень мелкие звёздочки Нави (места — свои у каждого вида духа; маска — силуэт)
  const navStarsSvg = {};
  const navStars = (sid, mask) => `<i class="sp-stars" style="${mask}">${navStarsSvg[sid] || (navStarsSvg[sid] = (() => {
    const r = U.rng('navstars:' + sid);
    let g = '';
    for (let i = 0; i < 7; i++) {
      const x = 40 + r() * 120, y = 36 + r() * 128, k = .2 + r() * .16, q = 2.4 * k, e = 12 * k;
      g += `<path style="animation-delay:${(r() * 3.2).toFixed(2)}s;animation-duration:${(2.2 + r() * 1.6).toFixed(2)}s" d="M${x} ${y - e}L${x + q} ${y - q}L${x + e} ${y}L${x + q} ${y + q}L${x} ${y + e}L${x - q} ${y + q}L${x - e} ${y}L${x - q} ${y - q}Z"/>`;
    }
    return `<svg viewBox="0 0 200 200" aria-hidden="true">${g}</svg>`;
  })())}</i>`;
  function pic(sid, shiny, dark) {
    const u = picUrl(sid), mask = `-webkit-mask-image:url('${u}');mask-image:url('${u}')`; // маска — в разметке: адрес от страницы, а не от style.css
    return `<span class="art art-stack sp-pic${shiny ? ' sp-shiny' : ''}${dark ? ' sp-dark' : ''}" style="aspect-ratio:1">` +
      picImg(sid, shiny, dark, 'stk') +
      (shiny || dark ? `<i class="stk sp-tint" style="${mask}"></i>` : '') + (shiny ? `<i class="stk sp-sheen" style="${mask}"></i>` + over(SHINE) : '') +
      (dark ? navStars(sid, mask) : '') + '</span>';
  }
  // shiny — сияющий вариант (другой оттенок и искры), dark — омрачённый Навью
  function spirit(sid, shiny, dark) {
    if (!cache[sid]) cache[sid] = ArtKit.render(SP[sid]) || build(SP[sid]); // 4.6: новый рисунок, если он уже есть
    let s = cache[sid].replace(/__ID__/g, 'a' + (++seq));
    const filters = [];
    if (shiny) filters.push(`hue-rotate(${shinyHue(sid)}deg) saturate(1.3) brightness(1.05)`);
    if (dark) filters.push('saturate(.7) brightness(.85) contrast(1.1)');
    if (filters.length) s = s.replace('<g class="art-body"', `<g class="art-body" style="filter:${filters.join(' ')}"`);
    if (shiny) s = s.replace(/<\/svg>$/, SPARKLES + '</svg>');
    return s;
  }
  const of = sp => spirit(sp.sid, sp.shiny, sp.dark);

  // Лёгкая версия для карты и списков: SVG один раз кодируется в data-URL и дальше
  // рисуется как обычная картинка — вместо сотен DOM-узлов на каждого духа
  const imgCache = {};
  function img(sid, shiny, dark) {
    if (PICS[sid]) return picImg(sid, shiny, dark, 'art');
    const k = sid + (shiny ? ':s' : '') + (dark ? ':d' : '');
    if (!imgCache[k]) imgCache[k] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(spirit(sid, shiny, dark));
    return `<img class="art" src="${imgCache[k]}" alt="" draggable="false">`;
  }
  const imgOf = sp => img(sp.sid, sp.shiny, sp.dark);

  function amulet(id) {
    const a = AMULETS[id];
    return `<svg class="art" viewBox="0 0 100 100"><path d="M30 8 Q50 30 70 8" stroke="#a8a29e" stroke-width="3" fill="none"/>` +
      `<circle cx="50" cy="58" r="34" fill="${shade(a.color, -0.55)}" stroke="${a.color}" stroke-width="5"/>` +
      `<circle cx="50" cy="58" r="25" fill="none" stroke="${a.color}" stroke-opacity=".5" stroke-width="2" stroke-dasharray="4 4"/>` +
      `<g transform="translate(29 37) scale(1.75)"><path d="${a.glyph}" fill="${a.color}"/></g>` +
      `<circle cx="50" cy="22" r="5" fill="${a.color}"/></svg>`;
  }

  function build(sp) {
    const L = sp.look, sh = SH[L.shape];
    const ids = { b: '__ID__b', a: '__ID__a', f: '__ID__f', s: '__ID__s', g: '__ID__g' };
    const all = [...(L.back || []), ...(L.feats || [])];
    const back = BACK.filter(k => all.includes(k));
    const front = all.filter(k => !BACK.includes(k));
    const scale = sp.stage === 3 ? 1 : sp.stage === 2 ? 0.9 : (sp.evo ? 0.78 : 0.92);
    const stroke = shade(L.c2, -0.5), rim = shade(L.c3, 0.35), tex = TEX[sp.el];
    // часть тела: defs=true — маски/обрезка для defs, иначе — сами слои
    function part(k, d, defs) {
      const id = '__ID__' + k;
      if (defs) return `<clipPath id="${id}c"><path d="${d}"/></clipPath>` +
        `<mask id="${id}r" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200"><path d="${d}" fill="#fff"/><path d="${d}" fill="#000" transform="translate(-7 -5)"/></mask>` +
        `<mask id="${id}l" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200"><path d="${d}" fill="#fff"/><path d="${d}" fill="#000" transform="translate(6 8)"/></mask>`;
      return `<path d="${d}" fill="url(#${ids.b})"/>` +
        (tex ? `<rect clip-path="url(#${id}c)" width="200" height="200" fill="url(#__ID__t)" opacity="${tex[2]}"/>` : '') +
        `<rect clip-path="url(#${id}c)" x="20" y="${sh.top - 10}" width="160" height="${sh.bottom - sh.top + 24}" fill="url(#${ids.s})"/>` +
        `<rect mask="url(#${id}r)" width="200" height="200" fill="${rim}" opacity=".55"/>` +
        `<rect mask="url(#${id}l)" width="200" height="200" fill="#fff" opacity=".2"/>` +
        `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="3.2" stroke-linejoin="round"/>`;
    }
    // заливки деталей → градиенты (один на цвет), у каждой фигуры — свой по её рамке
    const grads = [], gid = {};
    const vol = str => str.replace(/fill="(#[0-9a-fA-F]{6})"/g, (m, c) => {
      if (!gid[c]) { gid[c] = '__ID__v' + grads.length; grads.push(`<linearGradient id="${gid[c]}" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${shade(c, 0.32)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.28)}"/></linearGradient>`); }
      return `fill="url(#${gid[c]})"`;
    });
    let s = `<svg class="art" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><radialGradient id="${ids.b}" cx=".36" cy=".28" r=".85"><stop offset="0" stop-color="${shade(L.c1, 0.15)}"/><stop offset=".55" stop-color="${L.c1}"/><stop offset="1" stop-color="${L.c2}"/></radialGradient>` +
      `<radialGradient id="${ids.a}"><stop offset=".3" stop-color="${L.c3}" stop-opacity=".55"/><stop offset="1" stop-color="${L.c3}" stop-opacity="0"/></radialGradient>` +
      `<filter id="${ids.f}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3"/></filter>` +
      `<radialGradient id="${ids.s}" cx=".5" cy="1" r=".62"><stop offset="0" stop-color="${shade(L.c2, -0.55)}" stop-opacity=".62"/><stop offset="1" stop-color="${shade(L.c2, -0.55)}" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="${ids.g}"><stop offset="0" stop-color="#000" stop-opacity=".42"/><stop offset=".6" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
      (tex ? `<pattern id="__ID__t" width="${tex[0]}" height="${tex[0]}" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">${tex[1]}</pattern>` : '') +
      part('d', sh.d, true) + (sh.head ? part('h', sh.head, true) : '') + `</defs>` +
      `<ellipse class="art-shadow" cx="100" cy="180" rx="${56 * scale}" ry="${11 * scale}" fill="url(#${ids.g})"/>` +
      `<g class="art-body" transform="translate(100 176) scale(${scale}) translate(-100 -176)">`;
    back.forEach(k => { s += vol(feat(k, L, sh, ids)); });
    s += part('d', sh.d);
    if (sh.detail) s += sh.detail;
    if (sh.head) s += part('h', sh.head);
    const hy = sh.head ? sh.face - 16 : sh.top + (sh.face - sh.top) * 0.45;
    s += `<ellipse cx="${100 - (sh.head ? sh.hw : sh.bw) * 0.42}" cy="${hy}" rx="${sh.head ? 7 : 12}" ry="${sh.head ? 4.5 : 7}" transform="rotate(-35 ${100 - (sh.head ? sh.hw : sh.bw) * 0.42} ${hy})" fill="#fff" opacity=".42"/>` +
      `<circle cx="${100 - (sh.head ? sh.hw : sh.bw) * 0.42 + (sh.head ? 9 : 15)}" cy="${hy - (sh.head ? 5 : 8)}" r="${sh.head ? 2 : 3}" fill="#fff" opacity=".6"/>`;
    s += face(L, sh, ids.f);
    front.forEach(k => { s += vol(feat(k, L, sh, ids)); });
    if (grads.length) s = s.replace('</defs>', grads.join('') + '</defs>');
    s += `</g></svg>`;
    return s;
  }

  /* ---------------- ПРЕДМЕТЫ ---------------- */
  // оберег: [металл, тень, блик, камень]
  const CHARM_COL = {
    charm:  ['#e38a4c', '#6e2d0c', '#ffe2c2', '#4ade80'],
    charm2: ['#d4dbe6', '#3b4656', '#ffffff', '#38bdf8'],
    charm3: ['#f7c948', '#7a4a0c', '#fff7d1', '#ef4444'],
    rift:   ['#b48cf5', '#3b0764', '#f5f3ff', '#2dd4bf'],
  };
  // четырёхлучевой блик
  const glint = (x, y, r, f = '#fff', o = 1) => { const w = r * .16; return `<path d="M${x} ${y - r}Q${x + w} ${y - w} ${x + r} ${y}Q${x + w} ${y + w} ${x} ${y + r}Q${x - w} ${y + w} ${x - r} ${y}Q${x - w} ${y - w} ${x} ${y - r}Z" fill="${f}" opacity="${o}"/>`; };
  const floor = (rx, cy = 93) => `<ellipse cx="50" cy="${cy}" rx="${rx}" ry="4.5" fill="#000" opacity=".32"/>`;

  // Оберег: медальон на красной нити, в центре — громовой знак и камень
  function charm(type = 'charm') {
    const [a, b, c, g] = CHARM_COL[type] || CHARM_COL.charm, k = 'c' + (++seq), o = shade(b, -0.4);
    let pet = '';
    for (let i = 0; i < 6; i++) pet += `<path d="M50 56Q42.5 46 50 35Q57.5 46 50 56Z" transform="rotate(${i * 60} 50 56)"/>`;
    return `<svg class="art" viewBox="0 0 100 100"><defs>` +
      `<linearGradient id="${k}r" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${c}"/><stop offset=".45" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>` +
      `<radialGradient id="${k}f" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="${c}"/><stop offset=".45" stop-color="${a}"/><stop offset="1" stop-color="${shade(a, -0.45)}"/></radialGradient>` +
      `<radialGradient id="${k}g" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${g}"/><stop offset="1" stop-color="${shade(g, -0.6)}"/></radialGradient></defs>` +
      `<path d="M44 16C38 2 62 2 56 16" fill="none" stroke="#5a0b0b" stroke-width="6.5" stroke-linecap="round"/><path d="M44 16C38 2 62 2 56 16" fill="none" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>` +
      `<g stroke="#14532d" stroke-width="1.8" stroke-linejoin="round"><path d="M45 19C36 17 30 11 29 5C37 6 43 11 45 19Z" fill="#4ade80"/><path d="M55 19C64 17 70 11 71 5C63 6 57 11 55 19Z" fill="#22c55e"/></g>` +
      `<circle cx="50" cy="17" r="5" fill="none" stroke="${o}" stroke-width="6"/><circle cx="50" cy="17" r="5" fill="none" stroke="${a}" stroke-width="2.6"/>` +
      `<circle cx="50" cy="57" r="38" fill="url(#${k}r)" stroke="${o}" stroke-width="3.2"/>` +
      `<circle cx="50" cy="57" r="34.5" fill="none" stroke="${c}" stroke-width="3.8" stroke-dasharray="0 18.064" stroke-dashoffset="-9.03" stroke-linecap="round"/>` +
      `<circle cx="50" cy="57" r="29" fill="url(#${k}f)" stroke="${o}" stroke-width="2.2"/>` +
      `<path d="M23 54A27 27 0 0 1 77 54" fill="none" stroke="${b}" stroke-width="3" opacity=".35"/>` +
      `<g fill="${b}" opacity=".55" transform="translate(1 1.6)">${pet}</g><g fill="${c}" stroke="${o}" stroke-width="1.3">${pet}</g>` +
      `<circle cx="50" cy="56" r="22" fill="none" stroke="${c}" stroke-width="4" stroke-dasharray="0 23.038" stroke-linecap="round"/>` +
      `<circle cx="50" cy="56" r="7" fill="url(#${k}g)" stroke="${o}" stroke-width="2"/><circle cx="47.8" cy="53.6" r="2" fill="#fff" opacity=".9"/>` +
      `<path d="M17 50A34 34 0 0 1 36 26" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>` +
      glint(28, 32, 8) + `</svg>`;
  }
  function item(key) {
    if (key.startsWith('charm')) return charm(key);
    const k = 'i' + (++seq), svg = s => `<svg class="art" viewBox="0 0 100 100">${s}</svg>`;
    switch (key) {
      // Подарок: узелок из красного сукна с вышитым ромбом, перевязан золотой лентой
      case 'gift': return svg(`<defs><radialGradient id="${k}a" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ff7a66"/><stop offset=".5" stop-color="#dc2626"/><stop offset="1" stop-color="#6b1010"/></radialGradient>` +
        `<linearGradient id="${k}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a78"/><stop offset="1" stop-color="#a51b1b"/></linearGradient>` +
        `<linearGradient id="${k}c" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#fff7d1"/><stop offset=".45" stop-color="#f7d77e"/><stop offset="1" stop-color="#b8801f"/></linearGradient></defs>` +
        floor(31) +
        `<g fill="url(#${k}b)" stroke="#4a0a0a" stroke-width="3" stroke-linejoin="round"><path d="M48 42C38 38 24 32 18 20C15 13 22 9 28 12C38 17 46 26 52 38Z"/><path d="M52 42C62 38 76 32 82 20C85 13 78 9 72 12C62 17 54 26 48 38Z"/><path d="M39 46Q38 36 50 34Q62 36 61 46Z"/></g>` +
        `<path d="M22 17Q33 21 42 33M78 17Q67 21 58 33" stroke="#fff" stroke-width="2.2" fill="none" opacity=".35" stroke-linecap="round"/>` +
        `<path d="M40 42C20 44 11 60 14 75C17 90 34 95 50 95C66 95 83 90 86 75C89 60 80 44 60 42Z" fill="url(#${k}a)" stroke="#4a0a0a" stroke-width="3" stroke-linejoin="round"/>` +
        `<path d="M16 67Q50 79 84 67M17 80Q50 92 83 80" stroke="#f7d77e" stroke-width="2.4" fill="none"/>` +
        `<g fill="#fff1d6" stroke="#8a1414" stroke-width="1">` + [[23, 73.5], [36, 77.5], [50, 79], [64, 77.5], [77, 73.5]].map(([x, y]) => `<path d="M${x} ${y - 4.5}l4 4.5-4 4.5-4-4.5Z"/>`).join('') + `</g>` +
        `<path d="M34 50Q30 60 34 68M66 50Q70 60 66 68" stroke="#4a0a0a" stroke-width="2" fill="none" opacity=".3"/>` +
        `<ellipse cx="27" cy="58" rx="4.5" ry="8" transform="rotate(30 27 58)" fill="#fff" opacity=".35"/>` +
        `<g fill="url(#${k}c)" stroke="#5a3505" stroke-width="2.4" stroke-linejoin="round"><path d="M37 40Q50 47 63 40Q64 45 62 48Q50 54 38 48Q36 45 37 40Z"/>` +
        `<path d="M48 46L39 64L44.5 61.5L47 67L52 47ZM52 46L61 64L55.5 61.5L53 67L48 47Z"/>` +
        `<path d="M50 44C40 31 25 35 29 46C32 54 44 51 50 44ZM50 44C60 31 75 35 71 46C68 54 56 51 50 44Z"/><circle cx="50" cy="45" r="5.5"/></g>` +
        `<path d="M33 41Q37 37 43 40M67 41Q63 37 57 40" stroke="#fff" stroke-width="1.8" fill="none" opacity=".75" stroke-linecap="round"/>` + glint(74, 58, 6, '#fff', .9));
      // Мёд: глиняный горшочек с расписным пояском, мёд переливается через край, торчит мешалка
      case 'honey': return svg(`<defs><radialGradient id="${k}a" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#f09a5c"/><stop offset=".5" stop-color="#b4501f"/><stop offset="1" stop-color="#4a1805"/></radialGradient>` +
        `<linearGradient id="${k}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe98f"/><stop offset=".5" stop-color="#ffbe2e"/><stop offset="1" stop-color="#e07f00"/></linearGradient>` +
        `<linearGradient id="${k}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f6d8a8"/><stop offset="1" stop-color="#b07a44"/></linearGradient></defs>` +
        floor(32) +
        `<path d="M28 36C11 46 11 77 25 87C33 93 67 93 75 87C89 77 89 46 72 36Z" fill="url(#${k}a)" stroke="#3a1204" stroke-width="3" stroke-linejoin="round"/>` +
        `<path d="M16 66Q50 80 84 66M17 74Q50 88 83 74" stroke="#ffe2b0" stroke-width="2.2" fill="none"/>` +
        `<g fill="#ffe2b0">` + [[24, 72], [37, 76.5], [50, 78], [63, 76.5], [76, 72]].map(([x, y]) => `<path d="M${x} ${y - 3.2}l3.2 3.2-3.2 3.2-3.2-3.2Z"/>`).join('') + `</g>` +
        `<ellipse cx="27" cy="60" rx="4.5" ry="9" transform="rotate(20 27 60)" fill="#fff" opacity=".3"/>` +
        `<ellipse cx="50" cy="33" rx="27" ry="8" fill="#c8662e" stroke="#3a1204" stroke-width="3"/>` +
        `<path d="M58 32L80 7" stroke="#4a2a0e" stroke-width="9" stroke-linecap="round"/><path d="M58 32L80 7" stroke="url(#${k}c)" stroke-width="4.6" stroke-linecap="round"/><circle cx="80.5" cy="6.5" r="4" fill="#d9a066" stroke="#4a2a0e" stroke-width="2"/>` +
        `<path d="M25 33C25 26 75 26 75 33V41Q75 47 72 47Q69 47 69 41V38Q66 38 64 40V53Q64 58 60 58Q56 58 56 53V40Q50 41 44 40V47Q44 51 41 51Q38 51 38 47V40Q33 40 31 42V44Q31 49 28 49Q25 49 25 44Z" fill="url(#${k}b)" stroke="#7a3d00" stroke-width="2.4" stroke-linejoin="round"/>` +
        `<path d="M31 31Q50 27 67 30" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".75"/><ellipse cx="58.5" cy="51" rx="1.3" ry="3" fill="#fff" opacity=".8"/><ellipse cx="40" cy="45" rx="1.1" ry="2.2" fill="#fff" opacity=".8"/>` +
        glint(22, 22, 7, '#fff7d1'));
      // Живая вода: пузатая склянка с бирюзовым светом, пробка под сургучом, красная нить на горлышке
      case 'water': return svg(`<defs><radialGradient id="${k}a"><stop offset="0" stop-color="#2dd4bf" stop-opacity=".55"/><stop offset="1" stop-color="#2dd4bf" stop-opacity="0"/></radialGradient>` +
        `<linearGradient id="${k}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b5fff3"/><stop offset=".4" stop-color="#2dd4bf"/><stop offset="1" stop-color="#0b5e58"/></linearGradient>` +
        `<radialGradient id="${k}c" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#e6fffb" stop-opacity=".5"/><stop offset="1" stop-color="#5eead4" stop-opacity=".15"/></radialGradient>` +
        `<linearGradient id="${k}d" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e2ad6e"/><stop offset="1" stop-color="#8a5a2b"/></linearGradient>` +
        `<linearGradient id="${k}e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7d1"/><stop offset=".5" stop-color="#f7d77e"/><stop offset="1" stop-color="#a86f1c"/></linearGradient></defs>` +
        `<circle class="art-aura" cx="50" cy="64" r="44" fill="url(#${k}a)"/>` + floor(28, 95) +
        `<path d="M42 24H58V41C71 45 79 55 79 67C79 83 66 94 50 94C34 94 21 83 21 67C21 55 29 45 42 41Z" fill="url(#${k}c)"/>` +
        `<path d="M24.5 59Q37 53 50 57Q63 61 75.5 56C76 59 76 64 76 67C76 81 64 91 50 91C36 91 24 81 24 67C24 64 24 61 24.5 59Z" fill="url(#${k}b)"/>` +
        `<path d="M24.5 59Q37 53 50 57Q63 61 75.5 56" stroke="#d9fffa" stroke-width="2" fill="none"/>` +
        `<g fill="#fff"><circle cx="38" cy="77" r="3" opacity=".85"/><circle cx="59" cy="70" r="2.2" opacity=".85"/><circle cx="54" cy="83" r="1.6" opacity=".7"/></g>` + glint(62, 80, 6, '#fff', .9) +
        `<path d="M42 24H58V41C71 45 79 55 79 67C79 83 66 94 50 94C34 94 21 83 21 67C21 55 29 45 42 41Z" fill="none" stroke="#073b3a" stroke-width="3.2" stroke-linejoin="round"/>` +
        `<path d="M28 64Q28 52 38 47" stroke="#fff" stroke-width="3.6" fill="none" stroke-linecap="round" opacity=".85"/><circle cx="29" cy="71" r="1.8" fill="#fff" opacity=".8"/><path d="M45 27V38" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>` +
        `<rect x="39" y="34" width="22" height="7" rx="3.5" fill="url(#${k}e)" stroke="#5a3505" stroke-width="2.2"/>` +
        `<rect x="41" y="10" width="18" height="16" rx="3" fill="url(#${k}d)" stroke="#3a1f08" stroke-width="2.5"/>` +
        `<path d="M39 13Q50 4 61 13V17Q55 14 50 17Q45 14 39 17Z" fill="#dc2626" stroke="#5a0b0b" stroke-width="2.2" stroke-linejoin="round"/>` +
        `<path d="M42 30H58" stroke="#5a0b0b" stroke-width="4.5" stroke-linecap="round"/><path d="M42 30H58M58 30L62 36" stroke="#ef4444" stroke-width="2.2" fill="none" stroke-linecap="round"/><ellipse cx="62.5" cy="39" rx="2.4" ry="3.6" fill="#ef4444" stroke="#5a0b0b" stroke-width="1.4"/>` +
        glint(80, 30, 8, '#d9fffa') + glint(18, 40, 5, '#d9fffa', .9));
      // 4.15: Мёртвая вода — тот же флакон, что у Живой воды, но вода тёмно-синяя и печать тёмная
      case 'deadwater': {
        const pal = [['#2dd4bf', '#6366f1'], ['#b5fff3', '#c7d2fe'], ['#0b5e58', '#1e1b4b'], ['#e6fffb', '#e0e7ff'], ['#5eead4', '#818cf8'], ['#073b3a', '#1e1b4b'],
          ['#d9fffa', '#e0e7ff'], ['#dc2626', '#334155'], ['#ef4444', '#64748b'], ['#5a0b0b', '#0f172a']];
        return pal.reduce((x, [c1, c2]) => x.split(c1).join(c2), item('water'));
      }
      // 4.15: Подорожник — широкий лист с продольными жилками
      case 'herb': return svg(`<defs><radialGradient id="${k}a"><stop offset="0" stop-color="#84cc16" stop-opacity=".5"/><stop offset="1" stop-color="#84cc16" stop-opacity="0"/></radialGradient>` +
        `<linearGradient id="${k}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9f99d"/><stop offset=".45" stop-color="#65a30d"/><stop offset="1" stop-color="#1a3d06"/></linearGradient></defs>` +
        `<circle class="art-aura" cx="50" cy="56" r="44" fill="url(#${k}a)"/>` + floor(26, 94) +
        `<path d="M50 90C50 80 48 72 45 66" stroke="#3f6212" stroke-width="5" stroke-linecap="round" fill="none"/>` +
        `<path d="M46 68C22 62 16 34 34 16C46 6 66 10 74 24C84 42 72 66 46 68Z" fill="url(#${k}b)" stroke="#1a3d06" stroke-width="3" stroke-linejoin="round"/>` +
        `<g fill="none" stroke="#ecfccb" stroke-width="2.2" stroke-linecap="round" opacity=".85"><path d="M47 66C44 48 48 28 58 14"/><path d="M47 66C36 52 32 36 36 22"/><path d="M47 66C58 54 68 40 70 26"/></g>` +
        `<path d="M32 26C38 18 48 15 56 17" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>` + glint(76, 18, 6, '#ecfccb') + glint(20, 50, 4, '#ecfccb', .8));
      // 4.15: Целебный отвар — глиняный горшочек с зелёным варевом и паром
      case 'brew': return svg(`<defs><radialGradient id="${k}a"><stop offset="0" stop-color="#4ade80" stop-opacity=".45"/><stop offset="1" stop-color="#4ade80" stop-opacity="0"/></radialGradient>` +
        `<linearGradient id="${k}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0b27a"/><stop offset=".5" stop-color="#b45f2a"/><stop offset="1" stop-color="#5c2a0e"/></linearGradient>` +
        `<radialGradient id="${k}c" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#bbf7d0"/><stop offset=".6" stop-color="#22c55e"/><stop offset="1" stop-color="#14532d"/></radialGradient></defs>` +
        `<circle class="art-aura" cx="50" cy="60" r="44" fill="url(#${k}a)"/>` + floor(28, 95) +
        `<g fill="none" stroke="#e2f5e9" stroke-width="3" stroke-linecap="round" opacity=".8"><path d="M40 30C34 24 44 18 38 10"/><path d="M52 28C46 22 56 16 50 8"/><path d="M64 30C58 24 68 18 62 10"/></g>` +
        `<path d="M24 46H76C78 52 80 58 80 64C80 82 66 93 50 93C34 93 20 82 20 64C20 58 22 52 24 46Z" fill="url(#${k}b)" stroke="#3b1706" stroke-width="3" stroke-linejoin="round"/>` +
        `<ellipse cx="50" cy="46" rx="27" ry="7" fill="url(#${k}c)" stroke="#3b1706" stroke-width="3"/>` +
        `<path d="M21 60Q50 70 79 60" stroke="#f7d77e" stroke-width="3" fill="none" opacity=".9"/><g fill="#f7d77e"><circle cx="34" cy="66" r="2"/><circle cx="50" cy="69" r="2"/><circle cx="66" cy="66" r="2"/></g>` +
        `<path d="M28 72C29 80 34 85 40 88" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".45"/>` + glint(78, 40, 6, '#bbf7d0'));
      // 4.16: Настой опыта — пузатая склянка с янтарным медовым настоем, пробка с сургучом, над горлышком звёздочки
      case 'xpbrew': return svg(`<defs><radialGradient id="${k}a"><stop offset="0" stop-color="#fbbf24" stop-opacity=".5"/><stop offset="1" stop-color="#fbbf24" stop-opacity="0"/></radialGradient>` +
        `<radialGradient id="${k}b" cx=".38" cy=".35" r=".8"><stop offset="0" stop-color="#fff3c4"/><stop offset=".45" stop-color="#f59e0b"/><stop offset="1" stop-color="#7c2d12"/></radialGradient>` +
        `<linearGradient id="${k}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a16207"/><stop offset=".5" stop-color="#fde68a"/><stop offset="1" stop-color="#854d0e"/></linearGradient></defs>` +
        `<circle class="art-aura" cx="50" cy="62" r="44" fill="url(#${k}a)"/>` + floor(28, 95) +
        `<path d="M42 22H58V38C72 43 80 54 80 66C80 82 67 93 50 93C33 93 20 82 20 66C20 54 28 43 42 38Z" fill="url(#${k}b)" stroke="#431407" stroke-width="3" stroke-linejoin="round"/>` +
        `<path d="M24 64Q50 74 76 64" stroke="#fde68a" stroke-width="2.6" fill="none" opacity=".85"/>` +
        `<rect x="39" y="12" width="22" height="12" rx="4" fill="url(#${k}c)" stroke="#431407" stroke-width="2.6"/>` +
        `<circle cx="61" cy="24" r="5" fill="#b91c1c" stroke="#450a0a" stroke-width="1.8"/>` +
        `<path d="M30 70C31 79 36 84 42 87" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>` +
        glint(72, 16, 6, '#fde68a') + glint(28, 24, 4, '#fff', .9) + glint(50, 58, 5, '#fff', .8));
      // Златник: толстая золотая монета с бисерным ободком и чеканным солнцем
      case 'zlat': {
        let rays = '', rib = '';
        for (let i = 0; i < 12; i++) rays += `<path d="M50 23.5L54 33H46Z" transform="rotate(${i * 30} 50 46)"/>`;
        for (let x = 16; x <= 84; x += 6) { const y = (46 + Math.sqrt(1600 - (x - 50) ** 2)).toFixed(1); rib += `M${x} ${y}v7`; }
        return svg(`<defs><radialGradient id="${k}a" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#fff7d1"/><stop offset=".35" stop-color="#f7d77e"/><stop offset=".75" stop-color="#e0a83c"/><stop offset="1" stop-color="#b07418"/></radialGradient>` +
          `<linearGradient id="${k}b" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".5" stop-color="#d59a36"/><stop offset="1" stop-color="#8a5a14"/></linearGradient>` +
          `<linearGradient id="${k}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5a14"/><stop offset=".3" stop-color="#d59a36"/><stop offset="1" stop-color="#6b4210"/></linearGradient></defs>` +
          floor(34, 94) +
          `<path d="M10 46V54A40 40 0 0 0 90 54V46Z" fill="url(#${k}c)" stroke="#4a2a04" stroke-width="3" stroke-linejoin="round"/><path d="${rib}" stroke="#5a3505" stroke-width="1.6" opacity=".6"/>` +
          `<circle cx="50" cy="46" r="40" fill="url(#${k}b)" stroke="#4a2a04" stroke-width="3"/>` +
          `<circle cx="50" cy="46" r="35.5" fill="none" stroke="#fff4c4" stroke-width="2.8" stroke-dasharray="0 5.576" stroke-linecap="round"/>` +
          `<circle cx="50" cy="46" r="31" fill="url(#${k}a)" stroke="#9a6414" stroke-width="2"/>` +
          `<g fill="#8a5a14" opacity=".55" transform="translate(1 1.5)">${rays}<circle cx="50" cy="46" r="10"/></g>` +
          `<g fill="#ffe9a0" stroke="#8a5a14" stroke-width="1.6" stroke-linejoin="round">${rays}<circle cx="50" cy="46" r="10"/></g><circle cx="50" cy="46" r="4.5" fill="#f5c451" stroke="#8a5a14" stroke-width="1.6"/>` +
          `<path d="M16 40A34 34 0 0 1 36 15" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".75"/>` + glint(75, 19, 10));
      }
      // 5.1: Врата Перепутицы — золотое рунное кольцо на каменном подножии, внутри — воронка дорог (бирюза в фиолет)
      case 'gate': {
        const arm = a => `<path d="M50 46C50 33 60 25 71 27" transform="rotate(${a} 50 46)"/>`;
        return svg(`<defs><radialGradient id="${k}a" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#f0fdfa"/><stop offset=".2" stop-color="#5eead4"/><stop offset=".55" stop-color="#7c3aed"/><stop offset="1" stop-color="#1e0b3d"/></radialGradient>` +
          `<linearGradient id="${k}b" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".45" stop-color="#f3cf6b"/><stop offset="1" stop-color="#b8741a"/></linearGradient>` +
          `<linearGradient id="${k}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b7bb0"/><stop offset="1" stop-color="#3b2d5c"/></linearGradient></defs>` +
          floor(32, 94) +
          `<path d="M26 92L33 80H67L74 92Z" fill="url(#${k}c)" stroke="#1e0b3d" stroke-width="2.6" stroke-linejoin="round"/><path d="M34 84H66" stroke="#c4b5fd" stroke-width="1.6" opacity=".6"/>` +
          `<circle cx="50" cy="46" r="31" fill="url(#${k}a)"/>` +
          `<g class="art-gate-spin" fill="none" stroke="#ccfbf1" stroke-width="2.6" stroke-linecap="round" opacity=".85">${[0, 90, 180, 270].map(arm).join('')}</g>` +
          `<g class="art-gate-spin" fill="none" stroke="#a78bfa" stroke-width="1.6" stroke-linecap="round" opacity=".7">${[45, 135, 225, 315].map(arm).join('')}</g>` +
          `<circle cx="50" cy="46" r="6" fill="#fff" opacity=".95"/><circle cx="50" cy="46" r="10" fill="#fff" opacity=".25"/>` +
          `<circle cx="50" cy="46" r="34" fill="none" stroke="#3a1d06" stroke-width="10.5"/><circle cx="50" cy="46" r="34" fill="none" stroke="url(#${k}b)" stroke-width="6.5"/>` +
          `<circle cx="50" cy="46" r="34" fill="none" stroke="#fff4c4" stroke-width="2.4" stroke-dasharray="0 8.9" stroke-linecap="round"/>` +
          `<path d="M50 7l5 6-5 6-5-6Z" fill="url(#${k}b)" stroke="#3a1d06" stroke-width="2"/><path d="M40 78l4-6h12l4 6" fill="url(#${k}b)" stroke="#3a1d06" stroke-width="2.2" stroke-linejoin="round"/>` +
          `<path d="M21 33A32 32 0 0 1 37 16" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>` +
          glint(80, 18, 7) + glint(20, 70, 5, '#ccfbf1', .9));
      }
      // Дальний пропуск: грамота Ордена на свитке с печатью Разлома
      case 'farpass': return svg(`<defs><linearGradient id="${k}a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f3d58f"/><stop offset=".45" stop-color="#fff6dc"/><stop offset="1" stop-color="#e8c47a"/></linearGradient>` +
        `<linearGradient id="${k}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3cf"/><stop offset=".5" stop-color="#e9c27a"/><stop offset="1" stop-color="#9a6528"/></linearGradient>` +
        `<linearGradient id="${k}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7d1"/><stop offset=".5" stop-color="#f7d77e"/><stop offset="1" stop-color="#8a5a14"/></linearGradient>` +
        `<radialGradient id="${k}d" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#d8b4fe"/><stop offset=".5" stop-color="#7c3aed"/><stop offset="1" stop-color="#2e0752"/></radialGradient></defs>` +
        floor(30, 95) +
        `<rect x="22" y="15" width="56" height="68" fill="url(#${k}a)" stroke="#5a3505" stroke-width="3"/>` +
        `<path d="M31 28H41M59 28H69" stroke="#b91c1c" stroke-width="2.4" stroke-linecap="round"/><g fill="#b91c1c">` + [44, 50, 56].map(x => `<path d="M${x} 24.5l3 3.5-3 3.5-3-3.5Z"/>`).join('') + `</g>` +
        `<path d="M31 39H69M31 47H66M31 55H54" stroke="#a0703a" stroke-width="3" stroke-linecap="round" opacity=".7"/>` +
        `<g stroke="#5a3505" stroke-width="2.6"><rect x="15" y="8" width="70" height="13" rx="6.5" fill="url(#${k}b)"/><rect x="15" y="78" width="70" height="13" rx="6.5" fill="url(#${k}b)"/>` +
        `<g fill="url(#${k}c)"><circle cx="12" cy="14.5" r="5.5"/><circle cx="88" cy="14.5" r="5.5"/><circle cx="12" cy="84.5" r="5.5"/><circle cx="88" cy="84.5" r="5.5"/></g></g>` +
        `<path d="M20 11.5H80M20 81.5H80" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".65"/>` +
        `<path d="M56 76L48 98L54 94.5L57 99.5L61.5 78ZM66 78L72 98L67 95L63 99L60 78Z" fill="#dc2626" stroke="#5a0b0b" stroke-width="2.2" stroke-linejoin="round"/>` +
        `<circle cx="62" cy="69" r="14.5" fill="none" stroke="#240541" stroke-width="6.5" stroke-dasharray="0 5.69" stroke-linecap="round"/><circle cx="62" cy="69" r="14" fill="url(#${k}d)" stroke="#240541" stroke-width="2.4"/><circle cx="62" cy="69" r="9.5" fill="none" stroke="#e9d5ff" stroke-width="1.6" opacity=".45"/>` +
        `<path d="M64 58L57.5 68.5L62.5 70L58.5 80.5L67.5 67L62.5 65.5L67 58Z" fill="#5eead4" stroke="#0b3b44" stroke-width="1.2" stroke-linejoin="round"/><circle cx="57" cy="63.5" r="2.2" fill="#fff" opacity=".7"/>`);
      // Ладан: лаковая кадильница с золотой крышкой, из-под крышки тлеют угольки, вьётся дымок
      case 'incense': return svg(`<defs><radialGradient id="${k}a" cx=".35" cy=".25" r=".85"><stop offset="0" stop-color="#c9a5ff"/><stop offset=".5" stop-color="#7c3aed"/><stop offset="1" stop-color="#2e0752"/></radialGradient>` +
        `<linearGradient id="${k}b" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#fff7d1"/><stop offset=".45" stop-color="#f7d77e"/><stop offset="1" stop-color="#8a5a14"/></linearGradient>` +
        `<radialGradient id="${k}c"><stop offset="0" stop-color="#fff4c2"/><stop offset=".5" stop-color="#fb923c"/><stop offset="1" stop-color="#c2410c"/></radialGradient></defs>` +
        `<g class="art-float" fill="none" stroke-linecap="round"><path d="M50 27C38 21 41 12 49 9C56 6 55 1 51 -1M58 30C68 24 70 16 64 11" stroke="#8b5cf6" stroke-width="11" opacity=".45"/>` +
        `<path d="M50 27C38 21 41 12 49 9C56 6 55 1 51 -1M58 30C68 24 70 16 64 11" stroke="#ede9fe" stroke-width="5" opacity=".9"/></g>` +
        floor(30, 94) +
        `<g fill="url(#${k}b)" stroke="#4a2a04" stroke-width="2.6"><path d="M28 82L24 94H36L38 84ZM72 82L76 94H64L62 84Z"/></g>` +
        `<path d="M17 60H83C83 77 70 89 50 89C30 89 17 77 17 60Z" fill="url(#${k}a)" stroke="#1e0536" stroke-width="3" stroke-linejoin="round"/>` +
        `<g fill="#f7d77e" stroke="#8a5a14" stroke-width=".8">` + [[29, 71], [39.5, 75], [50, 76.5], [60.5, 75], [71, 71]].map(([x, y]) => `<path d="M${x} ${y - 4}l3.5 4-3.5 4-3.5-4Z"/>`).join('') + `</g>` +
        `<ellipse cx="29" cy="68" rx="3" ry="6" transform="rotate(35 29 68)" fill="#fff" opacity=".35"/>` +
        `<path d="M24 58C24 42 36 34 50 34C64 34 76 42 76 58Z" fill="url(#${k}b)" stroke="#4a2a04" stroke-width="3" stroke-linejoin="round"/>` +
        `<g fill="url(#${k}c)" stroke="#5a2a04" stroke-width="1.4" class="art-blink"><path d="M34 52a4 4 0 0 1 8 0Z"/><path d="M46 52a4 4 0 0 1 8 0Z"/><path d="M58 52a4 4 0 0 1 8 0Z"/><circle cx="50" cy="42" r="2.6"/></g>` +
        `<rect x="14" y="56" width="72" height="8" rx="4" fill="url(#${k}b)" stroke="#4a2a04" stroke-width="2.6"/>` +
        `<circle cx="50" cy="30" r="5.5" fill="url(#${k}b)" stroke="#4a2a04" stroke-width="2.6"/>` +
        `<path d="M31 50Q33 41 42 37" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".75"/>`);
      // 4.16: Осколок Алатыря — бел-горюч камень: гранёный белый осколок с золотой руной и тёплым свечением
      case 'alatyr': return svg(`<defs><radialGradient id="${k}a"><stop offset="0" stop-color="#fde68a" stop-opacity=".6"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>` +
        `<linearGradient id="${k}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#f1ece0"/><stop offset="1" stop-color="#b9ab8c"/></linearGradient>` +
        `<linearGradient id="${k}c" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf5"/><stop offset="1" stop-color="#d9cfb8"/></linearGradient></defs>` +
        `<circle class="art-aura" cx="50" cy="54" r="44" fill="url(#${k}a)"/>` + floor(24, 94) +
        `<path d="M50 8L74 30L68 76L46 92L26 70L30 28Z" fill="url(#${k}b)" stroke="#5b4a2a" stroke-width="3" stroke-linejoin="round"/>` +
        `<path d="M50 8L54 44L46 92M54 44L74 30M54 44L26 70M30 28L54 44" stroke="#8a7a58" stroke-width="1.6" fill="none" opacity=".55"/>` +
        `<path d="M50 8L74 30L54 44Z" fill="url(#${k}c)" opacity=".9"/>` +
        `<path class="art-blink" d="M46 50V70M46 50L38 58M46 50L54 58M40 66H52" stroke="#f59e0b" stroke-width="3.4" stroke-linecap="round" fill="none"/>` +
        `<path d="M34 32L46 20" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9"/>` + glint(72, 18, 8, '#fff7d1') + glint(24, 50, 5, '#fff7d1', .9));
      // 4.16: Эссенция Рода — светящаяся сфера, в которой кружат цвета всех шести стихий
      case 'rod': return svg(`<defs><radialGradient id="${k}a"><stop offset="0" stop-color="#c4b5fd" stop-opacity=".55"/><stop offset="1" stop-color="#c4b5fd" stop-opacity="0"/></radialGradient>` +
        `<radialGradient id="${k}b" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#e9d5ff"/><stop offset=".75" stop-color="#8b5cf6"/><stop offset="1" stop-color="#3b0764"/></radialGradient></defs>` +
        `<circle class="art-aura" cx="50" cy="52" r="46" fill="url(#${k}a)"/>` + floor(22, 95) +
        `<circle cx="50" cy="52" r="32" fill="url(#${k}b)" stroke="#2e1065" stroke-width="3"/>` +
        `<g fill="none" stroke-width="4" stroke-linecap="round" opacity=".9">` +
        ['#ff7a3d', '#38bdf8', '#84cc16', '#a5b4fc', '#facc15', '#c084fc'].map((c, i) => `<path d="M50 52m0 -22a22 22 0 0 1 19 11" stroke="${c}" transform="rotate(${i * 60} 50 52)"/>`).join('') + `</g>` +
        `<circle cx="50" cy="52" r="8" fill="#fff" opacity=".9"/><path d="M34 40Q38 30 48 28" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>` +
        glint(78, 22, 8, '#f5f3ff') + glint(20, 76, 5, '#f5f3ff', .9));
      // Искры: сияющая золотая звезда-искра — валюта
      case 'sparks': {
        const st = 'M50 3C53 38 62 47 97 50C62 53 53 62 50 97C47 62 38 53 3 50C38 47 47 38 50 3Z';
        return svg(`<defs><radialGradient id="${k}a"><stop offset="0" stop-color="#fff3b0" stop-opacity=".9"/><stop offset=".45" stop-color="#fbbf24" stop-opacity=".35"/><stop offset="1" stop-color="#fbbf24" stop-opacity="0"/></radialGradient>` +
          `<linearGradient id="${k}b" x1=".2" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#fffdf2"/><stop offset=".45" stop-color="#ffe27a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>` +
          `<clipPath id="${k}c"><path d="${st}"/></clipPath></defs>` +
          `<circle cx="50" cy="50" r="48" fill="url(#${k}a)"/>` +
          `<path d="M50 17C52 44 56 48 83 50C56 52 52 56 50 83C48 56 44 52 17 50C44 48 48 44 50 17Z" transform="rotate(45 50 50)" fill="#f7c948" stroke="#7a4a0c" stroke-width="2.6" stroke-linejoin="round"/>` +
          `<path d="${st}" fill="url(#${k}b)"/>` +
          `<path d="M50 50L50 0H100ZM50 50H100V100ZM50 50V100H0ZM50 50H0V0Z" fill="#b8740f" opacity=".3" clip-path="url(#${k}c)"/>` +
          `<path d="${st}" fill="none" stroke="#7a4a0c" stroke-width="3" stroke-linejoin="round"/>` +
          `<circle cx="50" cy="50" r="7" fill="#fff" opacity=".9"/>` + glint(50, 50, 16, '#fff', .85) + glint(80, 20, 8) + glint(22, 80, 5, '#fff', .9));
      }
    }
    return '';
  }
  // 4.14: кокон — шёлковый кокон из переплетённых нитей; сквозь шёлк светится дух (глаза), по поясу — руны,
  // вокруг — искры. Цвет — по дальности (2 / 5 / 10 км), у 10 км — золотые нити
  function cocoon(km) {
    const col = (COCOON_TIERS[km] || COCOON_TIERS[2]).color, id = 'cc' + (++seq), gold = km >= 10;
    const edge = shade(col, -0.55), mid = shade(col, -0.15), thr = gold ? '#fde68a' : shade(col, 0.55);
    const body = 'M50 9 C70 9 83 30 83 55 C83 80 69 97 50 97 C31 97 17 80 17 55 C17 30 30 9 50 9Z';
    const threads = [
      'M20 36 C38 44 62 44 80 34', 'M17 52 C38 62 64 62 83 50', 'M19 70 C38 80 64 80 81 68', 'M27 86 C42 92 58 92 73 86',
      'M30 17 C40 40 42 70 36 94', 'M70 17 C60 40 58 70 64 94', 'M50 9 C46 36 54 66 50 97',
    ];
    const star = (x, y, r) => `<path d="M${x} ${y - r} L${x + r * .28} ${y - r * .28} L${x + r} ${y} L${x + r * .28} ${y + r * .28} L${x} ${y + r} L${x - r * .28} ${y + r * .28} L${x - r} ${y} L${x - r * .28} ${y - r * .28}Z" fill="#fff"/>`;
    return `<svg class="art" viewBox="0 0 100 106"><defs>
      <radialGradient id="${id}b" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="${shade(col, 0.6)}"/><stop offset=".45" stop-color="${col}"/><stop offset="1" stop-color="${edge}"/></radialGradient>
      <radialGradient id="${id}g" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="${shade(col, 0.4)}" stop-opacity=".7"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}a" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${col}" stop-opacity=".55"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>
      <clipPath id="${id}c"><path d="${body}"/></clipPath></defs>
      <ellipse cx="50" cy="56" rx="50" ry="50" fill="url(#${id}a)"/>
      <ellipse cx="50" cy="100" rx="27" ry="5" fill="#000" opacity=".3"/>
      <path d="${body}" fill="url(#${id}b)" stroke="${edge}" stroke-width="2.4"/>
      <g clip-path="url(#${id}c)">
        <ellipse cx="50" cy="58" rx="24" ry="28" fill="url(#${id}g)"/>
        <g fill="#1b1030" opacity=".55"><ellipse cx="42" cy="56" rx="3.2" ry="4.2"/><ellipse cx="58" cy="56" rx="3.2" ry="4.2"/></g>
        <g fill="#fff" opacity=".9"><circle cx="42.8" cy="54.6" r="1.2"/><circle cx="58.8" cy="54.6" r="1.2"/></g>
        <g fill="none" stroke-linecap="round">${threads.map((d, i) => `<path d="${d}" stroke="${i < 4 ? thr : mid}" stroke-width="${i < 4 ? 2.4 : 1.6}" opacity="${i < 4 ? .75 : .55}"/>`).join('')}</g>
        <path d="M19 74 C38 83 64 83 81 72" stroke="${gold ? '#f59e0b' : edge}" stroke-width="6" fill="none" opacity=".55"/>
        <g stroke="${gold ? '#fffbeb' : '#fff'}" stroke-width="1.2" fill="none" opacity=".85" stroke-linecap="round">
          <path d="M31 76 l2 3 2-3"/><path d="M44 79 v4 M42 81 h4"/><path d="M55 79 l3 3 M58 79 l-3 3"/><path d="M66 76 l2 3 2-3"/></g>
      </g>
      <path d="M36 18 C28 26 24 36 24 46" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" opacity=".5"/>
      <circle cx="31" cy="26" r="2.6" fill="#fff" opacity=".75"/>
      <g opacity=".9">${star(86, 22, 5)}${star(12, 40, 3.4)}${star(88, 72, 3)}</g></svg>`;
  }

  /* ---------------- ИКОНКИ СТИХИЙ ---------------- */
  const EL_PATH = {
    fire: 'M12 3 C15 7 18 9 17 14 C16.5 18 14 20 12 20 C9 20 7 18 7 15 C7 12 9 11 10 8 C11 10 12 10 12 3Z',
    water: 'M12 3 C15 8 18 11 18 15 A6 6 0 0 1 6 15 C6 11 9 8 12 3Z',
    forest: 'M5 19 C5 10 11 5 19 5 C19 13 14 19 5 19Z M5 19 L13 11',
    wind: 'M3 9 H14 A3 3 0 1 0 11 6 M3 13 H18 A3 3 0 1 1 15 16 M3 17 H9',
    current: 'M13 2 L5 13 H11 L10 22 L19 10 H13Z',
    shadow: 'M15 3 A9 9 0 1 0 21 15 A7 7 0 1 1 15 3Z',
  };
  function elIcon(el, size = 18) {
    const E = ELEMENTS[el], stroke = el === 'wind' || el === 'forest';
    return `<svg class="el-ico" width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="${E.color}"/><g transform="translate(3.6 3.6) scale(.7)"><path d="${EL_PATH[el]}" fill="${stroke ? 'none' : '#1b1030'}" stroke="#1b1030" stroke-width="${stroke ? 2.4 : 1}" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
  }

  /* ---------------- ОБЪЕКТЫ КАРТЫ ---------------- */
  // 5.1.5: Источник — общий для всех мифологий: каменная чаша-исток на постаменте, из неё бьёт светящаяся вода Перепутицы,
  // над струёй парит осколок Алатыря. used — вода на исходе (струи нет, осколок потускнел и опустился);
  // invaded — Навь: вода темнеет до лилового, осколок чернеет и трескается, постамент обвивают щупальца, из воды смотрят глаза
  function springIcon(used, invaded) {
    const w = invaded ? '#e879f9' : used ? '#94a3b8' : '#5eead4', id = 'sp' + (++seq);
    const deep = invaded ? '#4a044e' : used ? '#334155' : '#0e7490', line = invaded ? '#1a0826' : '#1e1b2e';
    const stone = invaded ? ['#a08cc0', '#5b4478', '#2a1840'] : used ? ['#cfccd9', '#8f8aa3', '#4a4560'] : ['#f1eef9', '#a8a1c4', '#4f4868'];
    const cry = invaded ? ['#f5d0fe', '#7e22ce', '#2e1065'] : used ? ['#eceef2', '#b8b4aa', '#77736a'] : ['#ffffff', '#f3eee2', '#b9ab8c'];
    const gold = used ? '#c8c2ae' : invaded ? '#e9a8f5' : '#f3cf6b';
    // брызги-лепестки по бокам струи: тонкий серп от вершины к кромке чаши
    const petal = s => `<path d="M40 41C${40 - s * 12} 38 ${40 - s * 22} 46 ${40 - s * 25} 61C${40 - s * 19} 51 ${40 - s * 11} 45.5 40 46Z" fill="url(#${id}j)" stroke="${shade(w, -0.45)}" stroke-width="1" stroke-linejoin="round"/>` +
      `<path d="M${40 - s * 3} 42.5C${40 - s * 12} 41 ${40 - s * 19} 47 ${40 - s * 22} 56" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".75"/>`;
    return `<svg viewBox="0 0 80 110" class="art"><defs>` +
      `<linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${w}" stop-opacity="${used ? 0.25 : 0.7}"/><stop offset="1" stop-color="${w}" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${stone[0]}"/><stop offset=".45" stop-color="${stone[1]}"/><stop offset="1" stop-color="${stone[2]}"/></linearGradient>` +
      `<linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${stone[0]}"/><stop offset="1" stop-color="${stone[1]}"/></linearGradient>` +
      `<radialGradient id="${id}w" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fff" stop-opacity="${used ? 0.35 : 0.95}"/><stop offset=".4" stop-color="${w}"/><stop offset="1" stop-color="${deep}"/></radialGradient>` +
      `<linearGradient id="${id}j" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${w}"/><stop offset=".65" stop-color="${shade(w, 0.55)}"/><stop offset="1" stop-color="#fff"/></linearGradient>` +
      `<radialGradient id="${id}a"><stop offset="0" stop-color="${w}" stop-opacity=".55"/><stop offset="1" stop-color="${w}" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="${id}h"><stop offset="0" stop-color="${invaded ? '#f0abfc' : '#fff7d1'}" stop-opacity=".95"/><stop offset="1" stop-color="${invaded ? '#c026d3' : '#fde68a'}" stop-opacity="0"/></radialGradient>` +
      `<linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cry[0]}"/><stop offset=".5" stop-color="${cry[1]}"/><stop offset="1" stop-color="${cry[2]}"/></linearGradient></defs>` +
      (used ? '' : `<circle class="art-aura" cx="40" cy="42" r="38" fill="url(#${id}a)"/>`) +
      `<ellipse cx="40" cy="104.5" rx="29" ry="5" fill="#000" opacity=".35"/>` +
      `<rect class="beam" x="30" y="0" width="20" height="66" rx="10" fill="url(#${id})"/>` +
      // постамент: плита и ножка с сияющим камнем-искрой
      `<path d="M15 98Q15 94 19 94H61Q65 94 65 98V101Q65 104 61 104H19Q15 104 15 101Z" fill="url(#${id}s)" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/>` +
      `<path d="M19 96.6H61" stroke="#fff" stroke-width="1.2" opacity=".5" stroke-linecap="round"/>` +
      `<path d="M29 94C32.5 90 34 86.5 33 82H47C46 86.5 47.5 90 51 94Z" fill="url(#${id}s)" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/>` +
      `<path d="M40 84.6l2.8 3.4-2.8 3.4-2.8-3.4Z" fill="${used ? '#cbd5e1' : w}" stroke="${line}" stroke-width="1.1"${used ? '' : ' class="art-blink"'}/>` +
      // чаша: тело с золотой волной по поясу, кромка, вода
      `<path d="M8.5 64C9.5 77 23.5 84.5 40 84.5C56.5 84.5 70.5 77 71.5 64Z" fill="url(#${id}s)" stroke="${line}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="M15.5 72q4-3.2 8.1 0t8.1 0 8.1 0 8.1 0 8.1 0 8.1 0" fill="none" stroke="${gold}" stroke-width="1.7" stroke-linecap="round"/>` +
      `<path d="M14 67.5C17 75 25 79.5 33 80.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".4"/>` +
      `<ellipse cx="40" cy="64" rx="32" ry="8.2" fill="url(#${id}t)" stroke="${line}" stroke-width="2.6"/>` +
      (used
        ? `<ellipse cx="40" cy="64.6" rx="26.5" ry="5.4" fill="#2b2740"/><ellipse cx="40" cy="66" rx="15" ry="3" fill="url(#${id}w)"/>` +
          `<circle class="art-float" cx="36" cy="64" r="1.6" fill="#cbd5e1" opacity=".8"/><circle class="art-float" style="animation-delay:1.1s" cx="44.5" cy="63.4" r="1.2" fill="#e2e8f0" opacity=".7"/>`
        : `<ellipse cx="40" cy="64.6" rx="26.5" ry="5.4" fill="url(#${id}w)"/><ellipse cx="29" cy="63.4" rx="6.5" ry="1.4" fill="#fff" opacity=".7"/>`) +
      // струя: бьёт из середины чаши к осколку, по бокам — брызги
      (used ? '' : petal(1) + petal(-1) +
        `<path class="art-flicker" d="M35 65.5C36 57 36.5 47 37.5 38Q40 30 42.5 38C43.5 47 44 57 45 65.5Z" fill="url(#${id}j)" stroke="${shade(w, -0.45)}" stroke-width="1.3" stroke-linejoin="round"/>` +
        `<circle class="art-float" cx="17" cy="50" r="2" fill="${w}"/><circle class="art-float" style="animation-delay:.8s" cx="63" cy="47" r="1.7" fill="${w}"/><circle class="art-float" style="animation-delay:1.5s" cx="52" cy="36" r="1.3" fill="#fff" opacity=".9"/>`) +
      // осколок Алатыря парит над струёй (у иссякшего — опустился к самой воде и потускнел)
      `<g class="art-float" style="animation-duration:3.2s"${used ? ' opacity=".75"' : ''}><g${used ? ' transform="translate(40 36) scale(.82) translate(-40 -18)"' : ''}>` +
        (used ? '' : `<circle cx="40" cy="18" r="17" fill="url(#${id}h)"/>`) +
        `<path d="M40 1.5L51 10.5L48.5 27L40 34.5L31.5 27L29.5 10.5Z" fill="url(#${id}c)" stroke="${invaded ? '#1a0826' : '#4a3d24'}" stroke-width="2.2" stroke-linejoin="round"/>` +
        `<path d="M40 1.5L51 10.5L41.5 15.5Z" fill="#fff" opacity="${invaded ? 0.4 : 0.9}"/>` +
        `<path d="M40 1.5L41.5 15.5L40 34.5M41.5 15.5L31.5 27M41.5 15.5L29.5 10.5M41.5 15.5L48.5 27" stroke="${invaded ? '#f0abfc' : '#8a7a58'}" stroke-width="1" fill="none" opacity=".55"/>` +
        `<path d="M33 12L37 7" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity="${invaded ? 0.5 : 0.95}"/>` +
        (invaded ? `<path d="M45 9L41.5 16L45 20L40.5 28" stroke="#f0abfc" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : '') +
      `</g></g>` +
      (used ? '' : glint(55, 7, 5, invaded ? '#f5d0fe' : '#fff7d1', .95) + glint(24, 28, 3.2, '#fff', .85)) +
      // захвачен Навью: тёмные щупальца обвивают постамент, из воды смотрят глаза
      (invaded ? `<g class="art-flicker" fill="#3b0764" stroke="#1a0826" stroke-width="1.2" opacity=".92"><path d="M8 102C1 85 13 75 9 55C23 68 27 85 21 102Z"/><path d="M72 102C79 85 67 75 71 55C57 68 53 85 59 102Z"/></g>` +
        `<ellipse cx="33.5" cy="65.6" rx="3.4" ry="2" fill="#f43f5e" stroke="#1a0826" stroke-width=".8"/><ellipse cx="46.5" cy="65.6" rx="3.4" ry="2" fill="#f43f5e" stroke="#1a0826" stroke-width=".8"/>` +
        `<circle cx="33.5" cy="65.2" r=".8" fill="#fff"/><circle cx="46.5" cy="65.2" r=".8" fill="#fff"/>` : '') + `</svg>`;
  }
  // 4.6: разлом — каменные врата-кольцо с рунами, внутри закручивается воронка Нави
  function riftIcon(tier, myth) {
    const col = tier === 3 ? '#fbbf24' : tier === 2 ? '#f472b6' : '#a78bfa', id = 'rf' + (++seq);
    // 4.28: свой Разлом у каждой мифологии (js/places-art.js)
    if (myth && myth !== 'slavic' && typeof PLACE_ART !== 'undefined' && PLACE_ART[myth]) return PLACE_ART[myth].rift(tier, col, id);
    let stones = '', arms = '';
    for (let i = 0; i < 12; i++) {
      const a = i * 30, g = i % 3 === 0;
      stones += `<g transform="rotate(${a} 50 50)"><path d="M43 5.5 Q50 3.5 57 5.5 L55.5 15 Q50 14 44.5 15Z" fill="${g ? '#57534e' : '#44403c'}" stroke="#1c1917" stroke-width="1.4" stroke-linejoin="round"/>` +
        (g ? `<path d="M48 8.5l2 3.5 2-3.5" stroke="${col}" stroke-width="1.4" fill="none" stroke-linecap="round" class="art-blink" style="animation-delay:${i * 0.2}s"/>` : '') + '</g>';
    }
    for (let i = 0; i < 4; i++) arms += `<path d="M50 50 C60 44 66 32 58 22" transform="rotate(${i * 90} 50 50)" stroke="${col}" stroke-width="${3 - i * 0.2}" fill="none" stroke-linecap="round" opacity=".85"/>`;
    return `<svg viewBox="0 0 100 100" class="art"><defs><radialGradient id="${id}"><stop offset="0" stop-color="#05010d"/><stop offset=".45" stop-color="#2e0a5c"/><stop offset=".8" stop-color="${col}" stop-opacity=".9"/><stop offset="1" stop-color="${col}" stop-opacity=".2"/></radialGradient>` +
      `<radialGradient id="${id}h"><stop offset=".55" stop-color="${col}" stop-opacity=".5"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs>` +
      `<ellipse cx="50" cy="92" rx="36" ry="7" fill="#000" opacity=".35"/>` +
      `<circle class="art-aura" cx="50" cy="50" r="50" fill="url(#${id}h)"/>` +
      `<circle cx="50" cy="50" r="37" fill="url(#${id})"/>` +
      `<g class="art-spin">${arms}<circle cx="50" cy="50" r="6" fill="#fff" opacity=".85"/></g>` +
      `<circle cx="50" cy="50" r="37" fill="none" stroke="#1c1917" stroke-width="2"/>` + stones + `</svg>`;
  }

  /* ---------------- ПОГОДА, ЛУНА, ЗНАКИ ---------------- */
  const CLOUD = 'M7 19h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.8 9.6 4.7 4.7 0 0 0 7 19z';
  const WX = {
    clear: '<circle cx="12" cy="12" r="4.5" fill="#fde047" stroke="#f59e0b"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="#fde047"/>',
    partly: '<circle cx="9" cy="8" r="3.5" fill="#fde047" stroke="#f59e0b"/><path d="M9 1.5v1.5M2.5 8H4M4.4 3.4l1 1M13.6 3.4l-1 1" stroke="#fde047"/><path d="M9 21h8a3.5 3.5 0 0 0 .3-7A4.8 4.8 0 0 0 8 12.8 4.1 4.1 0 0 0 9 21z" fill="#e2e8f0" stroke="#94a3b8"/>',
    overcast: `<path d="${CLOUD}" fill="#cbd5e1" stroke="#64748b"/>`,
    fog: '<path d="M4 8h16M2 12h20M5 16h14M8 20h8" stroke="#cbd5e1"/>',
    rain: `<path d="M7 15h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.8 5.6 4.7 4.7 0 0 0 7 15z" fill="#cbd5e1" stroke="#64748b"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" stroke="#38bdf8"/>`,
    snow: `<path d="M7 14h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.8 4.6 4.7 4.7 0 0 0 7 14z" fill="#e2e8f0" stroke="#94a3b8"/><path d="M8 17v4M6 19h4M16 17v4M14 19h4M12 18v3" stroke="#f8fafc"/>`,
    storm: `<path d="M7 14h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.8 4.6 4.7 4.7 0 0 0 7 14z" fill="#94a3b8" stroke="#475569"/><path d="M13 14l-3 4h3l-2 4" stroke="#fde047"/>`,
    windy: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8" stroke="#a5b4fc"/>',
  };
  function wxIcon(key, size = 18) {
    return `<svg class="wx-ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${WX[key] || WX.clear}</svg>`;
  }
  function moonIcon(ev, size = 18) {
    return ev === 'full'
      ? `<svg class="wx-ico" width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#fef9c3" stroke="#fde68a"/><circle cx="9" cy="10" r="1.8" fill="#e7e0b0"/><circle cx="14.5" cy="14" r="2.3" fill="#e7e0b0"/></svg>`
      : `<svg class="wx-ico" width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#1e1b3a" stroke="#a78bfa" stroke-width="1.5"/></svg>`;
  }
  /* 5.1.21: Знаки Ордена — медальон на ленте Ордена: металлический обод с бусинами (не получен — тёмное железо, затем бронза,
     серебро, золото), в нём эмаль цвета знака и цветной рисунок того, за что знак — где можно, те же рисунки, что в сумке
     и на карте (оберег, источник, разлом, капище, кокон…). Чем выше ступень, тем богаче: серебро — зубцы вокруг обода,
     золото — лучи и камень наверху; звёзды ступени — на ободе снизу. Не полученный знак — серый и приглушённый */
  const mgrad = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const mrad = (id, stops, cx = 0.36, cy = 0.3, r = 0.8) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</radialGradient>`;
  // четырёхлучевая искра с вогнутыми гранями
  const msparkD = (x, y, r) => `M${x} ${y - r}C${x + r * 0.12} ${y - r * 0.3} ${x + r * 0.3} ${y - r * 0.12} ${x + r} ${y}C${x + r * 0.3} ${y + r * 0.12} ${x + r * 0.12} ${y + r * 0.3} ${x} ${y + r}` +
    `C${x - r * 0.12} ${y + r * 0.3} ${x - r * 0.3} ${y + r * 0.12} ${x - r} ${y}C${x - r * 0.3} ${y - r * 0.12} ${x - r * 0.12} ${y - r * 0.3} ${x} ${y - r}Z`;
  // пятиконечная звезда
  const mstarD = (x, y, R, r = R * 0.45) => Array.from({ length: 10 }, (_, i) => { const a = (i * 36 - 90) * Math.PI / 180, q = i % 2 ? r : R; return `${i ? 'L' : 'M'}${(x + q * Math.cos(a)).toFixed(2)} ${(y + q * Math.sin(a)).toFixed(2)}`; }).join('') + 'Z';
  const msvg = s => `<svg viewBox="0 0 100 100">${s}</svg>`;
  const MEDAL_ART = {
    catcher: () => item('charm'),
    springs: () => springIcon(false, false),
    raids: () => riftIcon(2),
    duels: () => shrineIcon(2, false),
    dex: () => item('farpass'),
    trade: () => item('zlat'),
    hatch: () => cocoon(5),
    evolve: () => item('xpbrew'),
    alatyr: () => item('alatyr'),
    // Странник — бегущий Ловчий в профиле, подробно: каждая часть тела — объёмная форма со своей тенью и бликом (как у духов);
    // лицо (глаз с радужкой и бликом, ресницы, бровь, нос, открытый рот, ухо, румянец), волосы прядями назад; рубаха со складками,
    // вышитыми воротом, планкой и подолом, кушак узлом с кистями; кожаная сумка со строчкой и пряжкой на ремне через грудь;
    // сапоги с отворотом, ремешком и прошитой подошвой; шарф с полосами и бахромой; тропинка с травой, тень, ветер и пыль
    walker: () => {
      const k = 'mw' + (++seq), INK = '#1b1030', f2 = n => (+n).toFixed(2);
      let cid = 0;
      // капсула от (x1, y1) до (x2, y2): толщина w1 → w2, концы скруглены
      const cap = (x1, y1, x2, y2, w1, w2) => {
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, r1 = w1 / 2, r2 = w2 / 2;
        const p = (x, y, r, s) => `${f2(x + nx * r * s)} ${f2(y + ny * r * s)}`;
        return `M${p(x1, y1, r1, 1)} L${p(x2, y2, r2, 1)} A${f2(r2)} ${f2(r2)} 0 0 0 ${p(x2, y2, r2, -1)} L${p(x1, y1, r1, -1)} A${f2(r1)} ${f2(r1)} 0 0 0 ${p(x1, y1, r1, 1)}Z`;
      };
      // объём части: заливка, тень снизу справа и блик сверху слева — масками по самой форме (как K.vol)
      const vol = (d, c, dk, lt) => {
        const id = `${k}v${++cid}`, M = (n, t) => `<mask id="${id}${n}" maskUnits="userSpaceOnUse" x="-20" y="-20" width="140" height="140"><path d="${d}" fill="#fff"/><path d="${d}" fill="#000" transform="${t}"/></mask>`;
        return `<defs>${M('s', 'translate(-2.4 -2.6)')}${M('h', 'translate(1.5 1.9)')}</defs><path d="${d}" fill="${c}"/>` +
          `<rect x="-20" y="-20" width="140" height="140" fill="${dk}" mask="url(#${id}s)"/><rect x="-20" y="-20" width="140" height="140" fill="${lt}" opacity=".5" mask="url(#${id}h)"/>`;
      };
      // слой: общий контур всех частей (без швов на суставах), затем объём каждой части
      const layer = parts => `<path d="${parts.map(q => q[0]).join(' ')}" fill="${INK}" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round"/>` + parts.map(q => vol(...q)).join('');
      const SK = ['#f3b483', '#c8794a', '#ffe1c4'], SHN = ['#2f6fe0', '#1e3a8a', '#a5c8ff'], SHF = ['#1e40af', '#14215c', '#5b8def'];
      const PN = ['#8a5426', '#57301a', '#c99060'], PF = ['#6b3f1d', '#3b1f0d', '#a8743f'], BT = ['#4a2a14', '#24120a', '#8b5a2b'], RD = ['#dc2626', '#8f1414', '#fca5a5'];
      const line = (d, c, w, o = '') => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${o}/>`;
      // кулак: ладонь, четыре согнутых пальца, большой палец
      const fist = (x, y, a) => `<g transform="rotate(${a} ${x} ${y})">` + layer([[`M${x - 4.6} ${y - 1.5} C${x - 4.6} ${y - 4.6} ${x - 1} ${y - 5.2} ${x + 2.2} ${y - 4.6} C${x + 5} ${y - 4} ${x + 5.6} ${y - 1} ${x + 5.2} ${y + 1.6} C${x + 4.8} ${y + 4.4} ${x + 1.6} ${y + 5} ${x - 1.4} ${y + 4.6} C${x - 4} ${y + 4.2} ${x - 4.6} ${y + 1.6} ${x - 4.6} ${y - 1.5}Z`, ...SK]]) +
        line(`M${x + 1.4} ${y - 3.4} C${x + 3.6} ${y - 3} ${x + 4.2} ${y - 1.4} ${x + 4} ${y - 0.2} M${x + 1.2} ${y - 0.6} C${x + 3.4} ${y - 0.2} ${x + 4} ${y + 1.2} ${x + 3.8} ${y + 2.4} M${x + 0.8} ${y + 2.2} C${x + 2.8} ${y + 2.6} ${x + 3.2} ${y + 3.6} ${x + 3} ${y + 4.2}`, '#9a4d22', 1.05) +
        line(`M${x - 2.6} ${y - 3.6} C${x - 0.6} ${y - 5.6} ${x + 2.2} ${y - 5} ${x + 2.6} ${y - 3}`, INK, 1.4) + `</g>`;
      // клуб пыли: светлый шар с тенью
      const puff = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${k}d)" stroke="#78716c" stroke-width="1.3"/>`;
      return msvg(`<defs>${mrad(k + 'd', ['#ffffff', '#e7e5e4', '#a8a29e'], 0.35, 0.3, 0.75)}${mgrad(k + 'f', ['#fca5a5', '#dc2626', '#991b1b'], 1, 0)}` +
          `${mgrad(k + 'h', ['#a8703c', '#6b3a17', '#3b1f0d'], 1, 1)}${mgrad(k + 'b', ['#c47a35', '#92551f', '#5c3412'], 1, 1)}${mgrad(k + 'g', ['#d6b072', '#a8823e', '#7a5a22'], 0, 1)}</defs>` +
        // тропинка с травой и тень
        `<ellipse cx="47" cy="90.6" rx="40" ry="5.6" fill="url(#${k}g)" stroke="#5c4415" stroke-width="1.6"/><path d="M14 89.5 C24 88 36 87.6 48 88 C60 88.4 72 89.2 82 90.4" stroke="#e8cf98" stroke-width="1.3" fill="none" opacity=".7"/>` +
        line('M9.5 88.8 l1.4 -4.6 1.2 4.6 M12.6 88.6 l1.8 -3.6 0.6 3.6 M80.4 90.2 l1.6 -4.4 1 4.4 M83.6 90.6 l1.2 -3.2 0.8 3.2', '#4d7c0f', 1.6) +
        `<ellipse cx="48" cy="89.8" rx="22" ry="2.8" fill="#000" opacity=".32"/>` +
        // ветер позади
        line('M2 29 H19 M0 39.5 H13 M4 50 H20 M1 61 H12', '#e0f2fe', 3.4, ' opacity=".85"') + line('M6 34 H14 M6 56 H15', '#e0f2fe', 2, ' opacity=".5"') +
        // пыль и камешки из-под задней ноги
        puff(9, 83.5, 3.2) + puff(15.6, 87.2, 4.4) + puff(7, 89.4, 2.6) + puff(22.4, 89.8, 2.8) +
        `<circle cx="20.6" cy="81.4" r="1" fill="#57534e"/><circle cx="25" cy="83.6" r=".8" fill="#57534e"/><circle cx="12.4" cy="78.6" r=".9" fill="#57534e"/>` +
        // шарф: два конца по ветру, полосы и бахрома
        layer([['M56.6 28.6 C47 22.4 37.4 27.6 23.4 20 C26.4 29.6 34 34.6 43.6 35.6 C48.4 36.1 52.6 35 55.8 32.6Z', '#dc2626', '#8f1414', '#fca5a5'],
          ['M54.6 33 C47.6 33.6 41.6 37.8 32.4 37.4 C36.6 41 43.6 41.4 49.6 39 C52.2 37.9 54 36.2 54.6 33Z', '#b91c1c', '#7f1d1d', '#f87171']]) +
        line('M30.4 22.6 C31.2 26.4 33.4 29.6 36.6 31.6 M35.6 23.8 C36.2 27 37.8 29.8 40.4 31.8', '#fde68a', 1.7) + line('M38.2 37.6 C39.6 38.8 41.6 39.4 43.4 39.4', '#fde68a', 1.5) +
        line('M24.6 20.8 L20.6 18.4 M25.2 23.4 L20.8 22.6 M26.2 26 L21.8 26.6 M27.8 28.4 L23.8 30.2 M33 37.6 L29.8 38.8 M34.6 39.4 L31.8 41.4', '#dc2626', 1.5) +
        // дальняя рука — назад
        layer([[cap(54.5, 34, 43, 43, 8.6, 7.4), ...SHF], [cap(43, 43, 35.6, 38.6, 7.4, 6.6), ...SHF], [cap(38.2, 40, 35.8, 38.6, 7.2, 7), ...RD]]) +
        line('M45.4 40.4 C46.6 42.6 46.4 44.4 45 45.6', '#14215c', 1.3) + fist(32.6, 36.6, 20) +
        // дальняя нога — отталкивается; сапог носком назад
        layer([[cap(46, 54, 37, 69.5, 12.4, 10), ...PF], [cap(37, 69.5, 30.6, 74.6, 10, 9), ...PF]]) +
        line('M42.6 60.4 C41 62.6 40.6 64.6 41 66.6', '#3b1f0d', 1.3) +
        layer([[cap(32.4, 72.6, 27, 77.6, 9.8, 9.4), ...BT], ['M30.4 74 C29 77 27.4 79.6 25.4 81.6 C21.8 82.8 17.4 83.4 14 82.6 C12 82.1 12.1 79.9 14 79.3 C17.6 78.2 20.4 76.6 22.4 73.4Z', ...BT]]) +
        line('M12.4 81.8 C16.4 84 22.6 84.2 27.2 82.6', '#0d0603', 2.6) + line('M14.8 81.4 C18 82.4 22 82.6 25.4 81.6', '#d6a85c', 0.8, ' stroke-dasharray="1.4 1.2"') +
        line('M33.6 71.2 L29.4 75.6', '#7a4a22', 2.6) +
        // сумка на бедре (сзади): клапан, строчка, пряжка
        layer([['M30 48.4 C30 46.4 31.6 45.2 33.6 45.2 H40.8 C42.6 45.2 43.6 46.4 43.6 48 V55.6 C43.6 57.4 42.4 58.6 40.6 58.6 H33.2 C31.3 58.6 30 57.4 30 55.6Z', '#a8632a', '#5c3412', '#d99a5b']]) +
        line('M31.6 56.6 H42', '#f3d9a6', 0.8, ' stroke-dasharray="1.3 1.1"') +
        layer([['M30 48.4 C30 46.4 31.6 45.2 33.6 45.2 H40.8 C42.6 45.2 43.6 46.4 43.6 48 V51.4 C39.2 53.8 34.6 53.8 30 51.4Z', '#7a4116', '#4a2409', '#b8743a']]) +
        line('M31.4 49.6 C35 51.4 38.8 51.4 42.2 49.6', '#f3d9a6', 0.8, ' stroke-dasharray="1.3 1.1"') +
        `<rect x="35.2" y="50.4" width="3.8" height="3.4" rx=".9" fill="#fbbf24" stroke="${INK}" stroke-width="1.1"/><rect x="36.4" y="51.4" width="1.4" height="1.4" fill="#78350f"/>` +
        // рубаха: складки, вышитые ворот, планка и подол
        layer([['M52 28.6 C58.5 26.6 64.8 28.8 64.6 34.2 L61 50.4 C59 57.6 52.6 60.6 45.4 58.6 C40.2 57.2 39 52.4 40.6 47.4 L46 33 C47 30.2 49.2 29.2 52 28.6Z', ...SHN]]) +
        line('M45.6 39.6 C47.4 42.2 48.2 45.2 47.8 48.2 M55.4 41 C54.6 44 54.8 47 56 49.4 M50.6 36.4 C51.6 38.6 51.8 40.6 51.2 42.6', '#1e3a8a', 1.3) +
        line('M51.4 30 C55 28.8 59.2 29.2 62.6 31.2', '#dc2626', 3.2) + line('M52.6 29.8 l1 1.5 M55.2 29.2 l1 1.5 M57.8 29.3 l1 1.5 M60.4 29.9 l.9 1.5', '#fde68a', 1) +
        line('M60 31.6 L57.8 39.4', '#dc2626', 3) + line('M59.6 33.2 l-1.4 .4 M59.2 35 l-1.4 .4 M58.7 36.8 l-1.4 .4', '#fde68a', 1) +
        line('M40.8 54.4 C45.8 57.6 53 58.8 58.6 56', '#dc2626', 3.2) + line('M42.4 55.4 C47 57.8 52.6 58.4 57 56.6', '#fde68a', 1.1, ' stroke-dasharray="1.4 1.4"') +
        // ремень сумки через грудь (со строчкой)
        line('M61.8 31 L41.6 49.6', INK, 4.8) + line('M61.8 31 L41.6 49.6', '#8a4f1c', 3) + line('M61.2 31.6 L42.2 49.1', '#f3d9a6', 0.7, ' stroke-dasharray="1.2 1.1"') +
        // кушак: узел сзади, концы с кистями
        line('M41.4 48.8 C46 51 52.2 52.4 58.8 51.4', INK, 6.2) + line('M41.4 48.8 C46 51 52.2 52.4 58.8 51.4', '#dc2626', 4.2) + line('M42.4 48.6 C46.6 50.6 52.4 51.8 58 51', '#fca5a5', 1, ' opacity=".7"') +
        line('M42.4 50.4 C39.6 53.4 37.6 56.4 35.6 59.6 M43.6 51.4 C41.6 55 40.6 58 39.8 61', INK, 3.6) + line('M42.4 50.4 C39.6 53.4 37.6 56.4 35.6 59.6 M43.6 51.4 C41.6 55 40.6 58 39.8 61', '#ef4444', 2) +
        `<circle cx="42.2" cy="50.4" r="2.6" fill="#dc2626" stroke="${INK}" stroke-width="1.5"/>` +
        line('M35.6 59.6 l-1 2.6 M35.6 59.6 l.2 2.8 M35.6 59.6 l1.2 2.4 M39.8 61 l-.8 2.6 M39.8 61 l.4 2.6 M39.8 61 l1.4 2.2', '#fbbf24', 1) +
        // шея; пряди волос — за головой
        layer([[cap(59.8, 25.6, 58.2, 30.4, 6.4, 6.8), ...SK]]) +
        layer([['M56.4 9.2 C52.4 7 48.4 7.8 44.4 5.4 C47.4 9.6 51.4 11.2 55.4 11.8Z', '#6b3a17', '#3b1f0d', '#a8703c'], ['M55 13 C50.6 12.2 47 13.8 43.4 12.4 C46.4 16 50.6 16.8 54.6 16.4Z', '#6b3a17', '#3b1f0d', '#a8703c'],
          ['M55.4 17.2 C51.8 17.6 49.2 19.8 46.2 19.4 C48.6 22.2 52.6 22.2 55.8 20.4Z', '#6b3a17', '#3b1f0d', '#a8703c']]) +
        // голова: лицо, нос, ухо, волосы
        layer([['M52 19 A10 10 0 1 0 72 19 A10 10 0 1 0 52 19Z', ...SK], ['M71.6 16.8 C74.8 18.8 74.6 21.2 71.8 21.8Z', ...SK], ['M64.8 26.4 C67.6 28 70.6 27.2 72 24.2 L70 23 Z', ...SK]]) +
        layer([['M53.6 17.6 C52.8 9 59.4 4.6 66.8 5.8 C72 6.6 74.4 10.2 73.6 13.6 C70 11.4 64.8 11.6 62.2 15 C60.8 17.6 59.4 20.4 56.8 21.4 C55.2 21.2 53.8 19.6 53.6 17.6Z', '#6b3a17', '#3b1f0d', '#a8703c']]) +
        line('M59.6 8.6 C62.8 7.2 66.4 7.4 69.2 9.2 M56.4 12.6 C57.6 10.8 59.2 9.6 61.2 9', '#c08046', 1.4) + line('M64 12.6 C66 11.8 68.2 11.9 70 12.8', '#4a2810', 1.2) +
        `<ellipse cx="59.6" cy="19.8" rx="2.3" ry="3.1" fill="#f3b483" stroke="${INK}" stroke-width="1.6"/>` + line('M59.6 18.4 C60.6 19.4 60.6 20.6 59.6 21.4', '#a65a2a', 1) +
        // глаз: белок, радужка, зрачок, блик, ресницы; бровь
        `<path d="M65.4 17 C66.4 15.2 69 14.8 70.4 16.7 C69.4 18.6 66.8 18.9 65.4 17Z" fill="#fff" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>` +
        `<circle cx="68.1" cy="16.9" r="1.55" fill="#5b3a1a"/><circle cx="68.3" cy="17" r=".8" fill="${INK}"/><circle cx="68.7" cy="16.3" r=".45" fill="#fff"/>` +
        line('M65.2 16.8 C66.4 14.8 69.4 14.4 70.9 16.4', INK, 1.7) + line('M70.6 15.9 l1.3 -.8', INK, 1) +
        line('M64.8 13.2 C66.8 11.9 69.6 11.9 71.3 13.1', '#4a2810', 1.9) +
        // открытый рот с зубами и языком, румянец, щека
        `<path d="M67.6 23.4 C69.4 25.8 72.2 25.6 73.2 22.8 C71.2 23.7 69.4 23.8 67.6 23.4Z" fill="#7f1d1d" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
        line('M68.6 23.8 L72.4 23.3', '#fff', 1) + `<ellipse cx="70.4" cy="24.8" rx="1.2" ry=".6" fill="#f472b6"/>` +
        `<ellipse cx="66.4" cy="21.2" rx="2.4" ry="1.4" fill="#ff7aa8" opacity=".45"/>` +
        // ближняя нога — колено вверх; сапог носком вперёд: отворот, ремешок с пряжкой, прошитая подошва, каблук
        layer([[cap(48.5, 55, 64.5, 61.5, 13, 10.4), ...PN], [cap(64.5, 61.5, 61.6, 70.6, 10.2, 9.4), ...PN]]) +
        line('M59.6 57.6 C61.6 59.4 62.4 61.4 62.2 63.6 M53.6 56.4 C55.2 58 56.4 59.6 56.8 61.4', '#57301a', 1.3) +
        layer([[cap(61.8, 70, 59.8, 77.4, 9.8, 9.6), ...BT], ['M55.2 73.6 L64.4 75 C65.4 77.8 67.8 79.2 71.6 80.2 C75.2 81.2 76.2 83.8 74.2 85.6 H56.6 C54.8 85.6 54 84.6 54.2 83Z', ...BT]]) +
        layer([[cap(56.6, 71.4, 66, 72.6, 3.6, 3.6), '#7a4a22', '#4a2a14', '#b07a45']]) +
        `<rect x="57.4" y="77.2" width="7.6" height="2.2" rx=".8" fill="#2a1508" stroke="${INK}" stroke-width=".9"/><rect x="60.2" y="76.8" width="2.6" height="3" rx=".5" fill="#fbbf24" stroke="${INK}" stroke-width=".9"/>` +
        line('M54.4 85.2 H74.2', '#0d0603', 2.8) + line('M56.4 84 H72.4', '#d6a85c', 0.8, ' stroke-dasharray="1.4 1.2"') +
        `<path d="M54.2 83.2 V88.2 H59.6 V85.6" fill="#24120a" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><ellipse cx="68.6" cy="80" rx="3.6" ry="1.4" fill="#fff" opacity=".3"/>` +
        // ближняя рука — вперёд и вверх: складки у локтя, вышитый обшлаг, кулак
        layer([[cap(59.4, 33.4, 70, 43.6, 9, 7.8), ...SHN], [cap(70, 43.6, 76.4, 36.2, 7.8, 7), ...SHN], [cap(74.4, 38.6, 76.8, 35.8, 7.6, 7.4), ...RD]]) +
        line('M66.6 42 C68 44.2 70.4 45.2 72.6 44.6 M63.4 37.4 C64.6 39 65 40.6 64.6 42', '#1e3a8a', 1.3) + line('M74.2 36.4 l1.6 1.6', '#fde68a', 1) +
        fist(79.2, 33.4, -35));
    },
    // Странник миров — глобус Атласа
    myths: () => { const k = 'mm' + (++seq); return msvg(`<defs>${mrad(k + 'o', ['#bae6fd', '#0ea5e9', '#0c4a6e'])}${mgrad(k + 'l', ['#bbf7d0', '#22c55e', '#166534'])}<clipPath id="${k}c"><circle cx="50" cy="50" r="36"/></clipPath></defs>` +
      `<circle cx="50" cy="50" r="36" fill="url(#${k}o)"/>` +
      `<g clip-path="url(#${k}c)" fill="url(#${k}l)" stroke="#14532d" stroke-width="2.2" stroke-linejoin="round"><path d="M20 33 C29 22 44 24 46 33 C48 42 37 46 35 54 C33 63 22 61 17 52 C14 44 15 39 20 33Z"/>` +
      `<path d="M56 22 C67 18 80 27 80 38 C80 47 69 45 65 51 C61 57 67 65 74 67 C67 78 54 76 54 65 C54 56 58 50 56 42 C54 34 49 27 56 22Z"/><path d="M33 71 C40 68 47 72 45 79 C41 84 31 81 33 71Z"/></g>` +
      `<g clip-path="url(#${k}c)" fill="none" stroke="#e0f2fe" stroke-opacity=".55" stroke-width="1.7"><ellipse cx="50" cy="50" rx="16" ry="36"/><path d="M14 50 H86 M18 33 H82 M18 67 H82"/></g>` +
      `<circle cx="50" cy="50" r="36" fill="none" stroke="#082f49" stroke-width="3.2"/><ellipse cx="37" cy="31" rx="11" ry="6" transform="rotate(-30 37 31)" fill="#fff" opacity=".35"/>`); },
    // Очиститель — светлый щит Ордена с солнцем
    purify: () => { const k = 'mp' + (++seq); let rays = '', sr = '';
      for (let i = 0; i < 12; i++) rays += `<path d="M50 3 L54.5 17 L45.5 17Z" transform="rotate(${i * 30} 50 50)"/>`;
      for (let i = 0; i < 8; i++) sr += `<path d="M50 32 V27" transform="rotate(${i * 45} 50 47)"/>`;
      return msvg(`<defs>${mgrad(k + 's', ['#ffffff', '#e2e8f0', '#94a3b8'], 1, 1)}${mgrad(k + 'f', ['#60a5fa', '#2563eb', '#1e3a8a'])}${mrad(k + 'g', ['#fff7c2', '#fbbf24', '#b45309'])}</defs>` +
      `<g fill="#fde68a" opacity=".6">${rays}</g>` +
      `<path d="M50 11 L83 21 V45 C83 68 67 82 50 91 C33 82 17 68 17 45 V21Z" fill="url(#${k}s)" stroke="#1e293b" stroke-width="3.2" stroke-linejoin="round"/>` +
      `<path d="M50 20 L75 28 V45 C75 63 63 74 50 81 C37 74 25 63 25 45 V28Z" fill="url(#${k}f)" stroke="#1e3a8a" stroke-width="1.8" stroke-linejoin="round"/>` +
      `<g stroke="#fde047" stroke-width="3.4" stroke-linecap="round">${sr}</g><circle cx="50" cy="47" r="11" fill="url(#${k}g)" stroke="#78350f" stroke-width="2.4"/>` +
      `<ellipse cx="38" cy="31" rx="8" ry="4" transform="rotate(-30 38 31)" fill="#fff" opacity=".35"/>`); },
    // Меткий глаз — мишень, в яблочко
    throws: () => { const k = 'mt' + (++seq); return msvg(`<defs>${mrad(k + 'r', ['#fca5a5', '#dc2626', '#7f1d1d'])}${mrad(k + 'w', ['#ffffff', '#f8fafc', '#cbd5e1'])}${mrad(k + 'g', ['#fff7c2', '#facc15', '#a16207'])}</defs>` +
      `<circle cx="50" cy="52" r="37" fill="url(#${k}r)" stroke="#450a0a" stroke-width="3.2"/><circle cx="50" cy="52" r="27.5" fill="url(#${k}w)" stroke="#450a0a" stroke-width="2"/>` +
      `<circle cx="50" cy="52" r="18" fill="url(#${k}r)" stroke="#450a0a" stroke-width="2"/><circle cx="50" cy="52" r="8.5" fill="url(#${k}g)" stroke="#450a0a" stroke-width="2.2"/>` +
      `<path d="${msparkD(64, 38, 10)}" fill="#fff7c2" stroke="#a16207" stroke-width="1.6"/><ellipse cx="36" cy="34" rx="10" ry="5" transform="rotate(-30 36 34)" fill="#fff" opacity=".3"/>`); },
    // Искатель сияния — переливчатая искра сияющего духа
    shiny: () => { const k = 'ms' + (++seq); return msvg(`<defs>${mgrad(k + 'a', ['#f0abfc', '#a5f3fc', '#fde68a', '#f9a8d4'], 1, 1)}</defs>` +
      `<path d="${msparkD(47, 53, 38)}" fill="url(#${k}a)" stroke="#4c1d95" stroke-width="3" stroke-linejoin="round"/><path d="${msparkD(47, 53, 15)}" fill="#fff" opacity=".8"/>` +
      `<path d="${msparkD(80, 19, 12)}" fill="#a5f3fc" stroke="#4c1d95" stroke-width="2.2" stroke-linejoin="round"/><path d="${msparkD(19, 21, 8)}" fill="#f9a8d4" stroke="#4c1d95" stroke-width="2" stroke-linejoin="round"/>`); },
    // Верность — листок календаря с огоньком серии
    streak: () => { const k = 'mk' + (++seq); return msvg(`<defs>${mgrad(k + 'p', ['#ffffff', '#f1f5f9', '#cbd5e1'])}${mgrad(k + 'h', ['#fca5a5', '#dc2626', '#991b1b'])}${mgrad(k + 'f', ['#fef08a', '#f97316', '#dc2626'])}</defs>` +
      `<rect x="15" y="19" width="70" height="70" rx="10" fill="url(#${k}p)" stroke="#1e293b" stroke-width="3.2"/>` +
      `<path d="M15 39 V29 A10 10 0 0 1 25 19 H75 A10 10 0 0 1 85 29 V39Z" fill="url(#${k}h)" stroke="#1e293b" stroke-width="3.2" stroke-linejoin="round"/>` +
      `<rect x="28" y="10" width="8" height="18" rx="4" fill="#64748b" stroke="#1e293b" stroke-width="2.6"/><rect x="64" y="10" width="8" height="18" rx="4" fill="#64748b" stroke="#1e293b" stroke-width="2.6"/>` +
      `<path d="M50 44 C61 54 67 62 65 73 C63 81 57 85 50 85 C42 85 36 80 35 72 C34 64 39 58 44 54 C44 60 46 63 49 64 C48 57 48 50 50 44Z" fill="url(#${k}f)" stroke="#7c2d12" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="M50 62 C55 67 57 72 55 77 C53 81 47 81 45 77 C43 73 46 68 50 62Z" fill="#fff7c2"/>`); },
    // Соратник — рукопожатие соратников: синий и красный рукава с золотыми обшлагами; пальцы ближней руки обхватывают ладонь
    // соратника, сверху лежит его большой палец; над руками — искры общего дела
    order: () => { const k = 'mo' + (++seq), ln = 'stroke="#6b2a0e" stroke-width="2.4" stroke-linejoin="round"';
      const fing = (y, h, x2) => `<path d="M50 ${y} H${x2} A${h / 2} ${h / 2} 0 0 1 ${x2} ${y + h} H50Z" fill="url(#${k}l)" ${ln}/>`;
      return msvg(`<defs>${mgrad(k + 'b', ['#93c5fd', '#2563eb', '#1e3a8a'], 1, 1)}${mgrad(k + 'r', ['#fca5a5', '#dc2626', '#7f1d1d'], 1, 1)}${mgrad(k + 'g', ['#fff7c2', '#fbbf24', '#b45309'])}` +
        `${mrad(k + 'l', ['#ffeedd', '#f7c393', '#d48a52'])}${mrad(k + 'd', ['#f0c193', '#d68e55', '#9e5524'])}</defs>` +
      `<path d="${msparkD(50, 12, 8.5)}" fill="url(#${k}g)" stroke="#78350f" stroke-width="1.8" stroke-linejoin="round"/><path d="${msparkD(31, 17, 5)}" fill="#fde68a" stroke="#78350f" stroke-width="1.4"/><path d="${msparkD(69, 17, 5)}" fill="#fde68a" stroke="#78350f" stroke-width="1.4"/>` +
      // дальняя рука (справа): рукав, обшлаг, ладонь
      `<g transform="translate(50 54) scale(1.25) translate(-50 -54)"><path d="M86 43.5 L80 40 L74 62 L82.5 65.5Z" fill="url(#${k}r)" stroke="#450a0a" stroke-width="2.4" stroke-linejoin="round"/>` +
      `<path d="M80 40 L72 38.5 L66 60.5 L74 62Z" fill="url(#${k}g)" stroke="#78350f" stroke-width="2.2" stroke-linejoin="round"/>` +
      `<path d="M72 38.5 C64 36 54 36.5 46 40 L41 46 L45 60 C52 63 60 62.5 66 60.5Z" fill="url(#${k}d)" ${ln}/>` +
      // ближняя рука (слева): рукав, обшлаг, ладонь и четыре пальца, обхватившие ладонь соратника
      `<path d="M14 50 L20 46.5 L26 68 L17.5 71.5Z" fill="url(#${k}b)" stroke="#172554" stroke-width="2.4" stroke-linejoin="round"/>` +
      `<path d="M20 46.5 L28 44.5 L34 66.5 L26 68Z" fill="url(#${k}g)" stroke="#78350f" stroke-width="2.2" stroke-linejoin="round"/>` +
      `<path d="M28 44.5 C36 42 46 42 53 44.5 L57 66.5 C50 69 40 69 34 66.5Z" fill="url(#${k}l)" ${ln}/>` +
      fing(44.5, 6, 64) + fing(50.5, 6, 66.5) + fing(56.5, 6, 65.5) + fing(62.5, 5.2, 62) +
      // большой палец соратника — поверх ближней руки
      `<path d="M70 41 C62 33.5 48 32 40 37 C39 39.2 40.6 41.2 43.2 41 C50 40.5 58 42 64 46.5Z" fill="url(#${k}d)" ${ln}/>` +
      `<ellipse cx="40" cy="52" rx="4" ry="6" transform="rotate(-12 40 52)" fill="#fff" opacity=".28"/></g>`); },
    // Землепроходец — сложенная карта землепроходца: земля, река, горы, пройденный путь пунктиром и булавка там, куда дошёл
    lands: () => { const k = 'ml' + (++seq), map = 'M12 23 L37 16 L63 23 L88 16 V78 L63 85 L37 78 L12 85Z';
      return msvg(`<defs>${mgrad(k + 'p', ['#fffbeb', '#fde68a', '#d6a85c'], 1, 1)}${mgrad(k + 'l', ['#bbf7d0', '#4ade80', '#15803d'], 1, 1)}${mrad(k + 'r', ['#fca5a5', '#ef4444', '#991b1b'])}<clipPath id="${k}c"><path d="${map}"/></clipPath></defs>` +
      `<path d="${map}" fill="url(#${k}p)"/><path d="M37 16 L63 23 V85 L37 78Z" fill="#92400e" opacity=".16"/>` +
      `<g clip-path="url(#${k}c)"><path d="M8 50 C16 40 28 38 34 44 C40 50 50 46 56 38 C62 30 76 30 84 38 C92 46 92 60 84 66 C76 72 66 66 58 70 C50 74 40 80 30 76 C20 72 6 66 8 50Z" fill="url(#${k}l)" stroke="#166534" stroke-width="2.2" stroke-linejoin="round"/>` +
      `<path d="M20 88 C26 76 17 67 25 59 C31 53 29 45 37 39" stroke="#38bdf8" stroke-width="4" fill="none" stroke-linecap="round"/>` +
      `<path d="M65 63 L71 53 L77 63Z M73 63 L79 55 L85 63Z" fill="#d6d3d1" stroke="#44403c" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<path d="M20 72 C28 66 34 66 40 60 C46 54 52 54 60 51" stroke="#b91c1c" stroke-width="3" stroke-dasharray="4.5 3.5" fill="none" stroke-linecap="round"/></g>` +
      `<path d="${map}" fill="none" stroke="#78350f" stroke-width="3" stroke-linejoin="round"/><path d="M37 16 V78 M63 23 V85" stroke="#78350f" stroke-width="1.8" opacity=".7"/>` +
      `<ellipse cx="60" cy="53" rx="4.5" ry="1.8" fill="#78350f" opacity=".4"/>` +
      `<path d="M60 52 C55 44 49 39 49 33 A11 11 0 0 1 71 33 C71 39 65 44 60 52Z" fill="url(#${k}r)" stroke="#7f1d1d" stroke-width="2.6" stroke-linejoin="round"/><circle cx="60" cy="33" r="4.2" fill="#fff"/>`); },
  };
  // знаки стихий: крупный знак стихии
  const MEDAL_EL = {
    fire: () => { const k = 'me' + (++seq); return msvg(`<defs>${mgrad(k + 'a', ['#fef08a', '#fb923c', '#dc2626'])}</defs>` +
      `<path d="M50 7 C62 23 81 38 81 61 C81 79 67 93 50 93 C33 93 19 79 19 61 C19 45 29 36 34 25 C38 35 40 41 46 45 C44 31 44 19 50 7Z" fill="url(#${k}a)" stroke="#7c2d12" stroke-width="3.2" stroke-linejoin="round"/>` +
      `<path d="M50 45 C60 55 66 64 64 74 C62 82 56 87 50 87 C43 87 37 82 37 74 C37 65 44 61 46 55 C48 59 49 61 50 45Z" fill="#fff7c2"/>`); },
    water: () => { const k = 'me' + (++seq); return msvg(`<defs>${mrad(k + 'a', ['#e0f2fe', '#38bdf8', '#075985'])}</defs>` +
      `<path d="M50 7 C50 7 81 44 81 62 A31 31 0 0 1 19 62 C19 44 50 7 50 7Z" fill="url(#${k}a)" stroke="#0c4a6e" stroke-width="3.2" stroke-linejoin="round"/>` +
      `<path d="M33 62 C33 52 40 44 44 40" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/><circle cx="62" cy="74" r="5" fill="#fff" opacity=".45"/>`); },
    forest: () => { const k = 'me' + (++seq); return msvg(`<defs>${mgrad(k + 'a', ['#d9f99d', '#65a30d', '#365314'], 1, 1)}</defs>` +
      `<path d="M15 85 C15 41 45 13 87 13 C87 55 59 85 15 85Z" fill="url(#${k}a)" stroke="#1a2e05" stroke-width="3.2" stroke-linejoin="round"/>` +
      `<path d="M19 81 C38 62 58 42 82 18 M41 60 L39 43 M53 48 L54 32 M47 54 L63 55 M35 66 L50 69" stroke="#1a2e05" stroke-width="2.6" stroke-linecap="round" fill="none"/>`); },
    wind: () => { const k = 'me' + (++seq), sw = d => `<path d="${d}" stroke="#312e81" stroke-width="11" stroke-linecap="round" fill="none"/><path d="${d}" stroke="url(#${k}a)" stroke-width="6.5" stroke-linecap="round" fill="none"/>`;
      return msvg(`<defs>${mgrad(k + 'a', ['#ffffff', '#c7d2fe', '#818cf8'], 1, 0)}</defs>` + sw('M12 36 H58 A12 12 0 1 0 46 24') + sw('M12 54 H74 A13 13 0 1 1 61 67') + sw('M22 72 H42')); },
    current: () => { const k = 'me' + (++seq); return msvg(`<defs>${mgrad(k + 'a', ['#fef9c3', '#facc15', '#ca8a04'], 1, 1)}</defs>` +
      `<path d="M58 5 L21 56 H46 L37 95 L81 39 H55 L67 5Z" fill="url(#${k}a)" stroke="#713f12" stroke-width="3.2" stroke-linejoin="round"/><path d="M58 12 L33 49" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`); },
    shadow: () => { const k = 'me' + (++seq); return msvg(`<defs>${mrad(k + 'a', ['#f5d0fe', '#c084fc', '#6b21a8'])}</defs>` +
      `<path d="M62 9 A41 41 0 1 0 90 66 A33 33 0 1 1 62 9Z" fill="url(#${k}a)" stroke="#2e1065" stroke-width="3.2" stroke-linejoin="round"/>` +
      `<path d="${mstarD(73, 30, 8)}" fill="#fde68a" stroke="#2e1065" stroke-width="1.8" stroke-linejoin="round"/><path d="${mstarD(84, 50, 5)}" fill="#fde68a" stroke="#2e1065" stroke-width="1.5" stroke-linejoin="round"/>`); },
  };
  const MEDAL_ENAMEL = { catcher: '#0f766e', walker: '#3f6212', springs: '#0e7490', raids: '#4c1d95', duels: '#7f1d1d', dex: '#78350f', myths: '#1e3a8a',
    purify: '#a16207', trade: '#9a3412', throws: '#1e3a8a', hatch: '#6b21a8', evolve: '#86198f', shiny: '#312e81', streak: '#155e75', order: '#3b0764', alatyr: '#1e1b4b', lands: '#0c4a6e',
    'el:fire': '#7c2d12', 'el:water': '#0c4a6e', 'el:forest': '#14532d', 'el:wind': '#312e81', 'el:current': '#713f12', 'el:shadow': '#2e1065' };
  // металл ступени: 0 — не получен (железо), 1 — бронза, 2 — серебро, 3 — золото
  const MEDAL_METAL = [
    { hi: '#9ca3af', mid: '#4b5563', lo: '#1f2937', line: '#0b0f17', bead: '#6b7280' },
    { hi: '#fde0bf', mid: '#d97706', lo: '#7c2d12', line: '#3a1405', bead: '#fcd9a8' },
    { hi: '#ffffff', mid: '#cbd5e1', lo: '#475569', line: '#1e293b', bead: '#f8fafc' },
    { hi: '#fff7c2', mid: '#fbbf24', lo: '#92400e', line: '#3f1d03', bead: '#fef3c7' },
  ];
  // рисунок (свой svg со своим viewBox) — в поле (x, y) размером s
  const mnest = (svg, x, y, s) => { const vb = (svg.match(/^<svg[^>]*\bviewBox="([^"]*)"/) || [])[1] || '0 0 100 100'; return svg.replace(/^<svg[^>]*>/, `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="${vb}">`); };
  function medal(m, tier) {
    tier = Math.max(0, Math.min(3, tier | 0));
    const M = MEDAL_METAL[tier], k = 'md' + (++seq), el = m.stat.startsWith('el:') ? m.stat.slice(3) : null;
    const enamel = MEDAL_ENAMEL[el ? m.stat : m.id] || '#312e81';
    const art = el && MEDAL_EL[el] ? MEDAL_EL[el]() : MEDAL_ART[m.id] ? MEDAL_ART[m.id]()
      : msvg(`<text x="50" y="66" text-anchor="middle" font-size="48" font-weight="900" fill="#fff" font-family="Rubik, sans-serif">${m.name[0]}</text>`);
    let s = `<svg class="art" viewBox="0 0 100 100"><defs>` +
      mgrad(k + 'r', tier ? ['#a78bfa', '#6d28d9', '#3b0764'] : ['#64748b', '#334155', '#0f172a'], 1, 1) +
      mgrad(k + 'm', [M.hi, M.mid, M.lo], 1, 1) + mgrad(k + 'n', [M.lo, M.mid, M.hi], 1, 1) +
      mrad(k + 'e', [shade(enamel, 0.3), enamel, shade(enamel, -0.55)], 0.42, 0.36, 0.72) +
      mgrad(k + 's', ['#fef9c3', '#fbbf24', '#b45309']) +
      (tier ? '' : `<filter id="${k}g"><feColorMatrix type="saturate" values=".08"/></filter>`) + `</defs>`;
    // медальон — крупный (обод r 41, эмаль r 33), рисунок в нём — прежнего размера (48), центр (50, 47); лучи золота и камень
    // чуть выходят за рамку 100×100 — у .art overflow: visible
    const cy = 47, ring = (r, n, a0, f) => { for (let i = 0; i < n; i++) { const a = (i * 360 / n + a0) * Math.PI / 180; f((50 + r * Math.sin(a)).toFixed(2), (cy - r * Math.cos(a)).toFixed(2)); } };
    // лента Ордена: два хвоста с полосой цвета металла
    const tail = `<path d="M38.5 70 L30 99 L37 93.5 L43 99.5 L50.5 74Z" fill="url(#${k}r)" stroke="#1e1033" stroke-width="2" stroke-linejoin="round"/><path d="M41 73.5 L34 96" stroke="${M.mid}" stroke-width="2.6" stroke-linecap="round" opacity=".95"/>`;
    s += tail + `<g transform="translate(100 0) scale(-1 1)">${tail}</g>`;
    // серебро — бусины вокруг обода, золото — лучи
    if (tier === 2) ring(44, 12, 15, (x, y) => { s += `<circle cx="${x}" cy="${y}" r="2.8" fill="url(#${k}m)" stroke="${M.line}" stroke-width="1.2"/>`; });
    if (tier === 3) for (let i = 0; i < 16; i++) s += `<path d="M50 -0.5 L54.3 10 L45.7 10Z" transform="rotate(${i * 22.5} 50 ${cy})" fill="url(#${k}m)" stroke="${M.line}" stroke-width="1.3" stroke-linejoin="round"/>`;
    // обод с бусинами
    s += `<circle cx="50" cy="${cy}" r="41" fill="url(#${k}m)" stroke="${M.line}" stroke-width="2.6"/><circle cx="50" cy="${cy}" r="35.4" fill="url(#${k}n)" stroke="${M.line}" stroke-width="1.6"/>`;
    ring(38.2, 20, 0, (x, y) => { s += `<circle cx="${x}" cy="${y}" r="1.3" fill="${M.bead}" opacity="${tier ? 0.95 : 0.55}"/>`; });
    // эмаль и рисунок
    s += `<g${tier ? '' : ` filter="url(#${k}g)"`}><circle cx="50" cy="${cy}" r="33.2" fill="url(#${k}e)"/><circle cx="50" cy="${cy}" r="32" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2.6"/>` +
      `<g${tier ? '' : ' opacity=".5"'}>${mnest(art, 26, cy - 24, 48)}</g></g>` +
      `<path d="M22 39.5 A29 29 0 0 1 64.5 21.9" stroke="#fff" stroke-opacity=".22" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
    // золото — камень наверху
    if (tier === 3) s += `<path d="M50 -1 L56 5.5 L50 12 L44 5.5Z" fill="#c084fc" stroke="${M.line}" stroke-width="1.5" stroke-linejoin="round"/><path d="M50 1.5 L53 5.5 L50 8.5" fill="#f5d0fe" opacity=".85"/>`;
    // звёзды ступени — на ободе снизу
    (tier === 1 ? [[50, 85.2]] : tier === 2 ? [[44, 84.8], [56, 84.8]] : tier === 3 ? [[38, 82.6], [50, 85.6], [62, 82.6]] : [])
      .forEach(([x, y]) => { s += `<path d="${mstarD(x, y, 5.2)}" fill="url(#${k}s)" stroke="${M.line === '#0b0f17' ? '#111' : '#3f1d03'}" stroke-width="1.4" stroke-linejoin="round"/>`; });
    return s + '</svg>';
  }

  /* ---------------- КАПИЩЕ И ХРАНИТЕЛЬ ---------------- */
  // 4.6: капище — святилище: резные врата из двух идолов под балкой с коньками, между ними на каменном круге — священный огонь цвета капища
  function shrineIcon(tier, won, myth) {
    const fire = won ? '#fbbf24' : tier === 3 ? '#f43f5e' : tier === 2 ? '#c084fc' : '#2dd4bf', id = 'sh' + (++seq);
    // 4.28: своё святилище у каждой мифологии (js/places-art.js)
    if (myth && myth !== 'slavic' && typeof PLACE_ART !== 'undefined' && PLACE_ART[myth]) return PLACE_ART[myth].shrine(tier, fire, won, id);
    const post = x => `<path d="M${x - 6} 92 V44 Q${x - 6} 36 ${x} 33 Q${x + 6} 36 ${x + 6} 44 V92Z" fill="url(#${id}w)" stroke="#2a1508" stroke-width="2" stroke-linejoin="round"/>` +
      `<path d="M${x - 6} 56 H${x + 6} M${x - 6} 72 H${x + 6}" stroke="#2a1508" stroke-width="1.5"/>` +
      `<path d="M${x - 5} 61 l2.5 3 2.5-3 2.5 3 2.5-3" stroke="#e3b27a" stroke-width="1.1" fill="none"/>` +
      `<circle cx="${x - 2.4}" cy="45" r="1.7" fill="${fire}"/><circle cx="${x + 2.4}" cy="45" r="1.7" fill="${fire}"/>` +
      `<path d="M${x - 2.5} 50 Q${x} 52 ${x + 2.5} 50" stroke="#2a1508" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    return `<svg viewBox="0 -6 80 116" class="art"><defs>` +
      `<linearGradient id="${id}w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5e3314"/><stop offset=".4" stop-color="#c98a4b"/><stop offset="1" stop-color="#4a2610"/></linearGradient>` +
      `<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b07040"/><stop offset="1" stop-color="#4a2610"/></linearGradient>` +
      `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8b2ad"/><stop offset="1" stop-color="#57534e"/></linearGradient>` +
      `<radialGradient id="${id}g"><stop offset="0" stop-color="${fire}" stop-opacity="${won ? 0.65 : 0.5}"/><stop offset="1" stop-color="${fire}" stop-opacity="0"/></radialGradient>` +
      `<linearGradient id="${id}f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${fire}"/><stop offset=".7" stop-color="${shade(fire, 0.55)}"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>` +
      `<circle class="art-aura" cx="40" cy="70" r="${won ? 44 : 36}" fill="url(#${id}g)"/>` +
      `<ellipse cx="40" cy="103" rx="34" ry="6" fill="#000" opacity=".35"/>` +
      // каменный круг
      `<ellipse cx="40" cy="95" rx="30" ry="9" fill="#44403c" stroke="#1c1917" stroke-width="1.8"/><ellipse cx="40" cy="92" rx="30" ry="9" fill="url(#${id}s)" stroke="#1c1917" stroke-width="1.8"/>` +
      `<ellipse cx="40" cy="91.5" rx="17" ry="4.6" fill="#1c1917" opacity=".55"/>` +
      `<path d="M16 91l4 1.5M28 97l3-2.4M50 97l-2-2.6M62 92l-4 1" stroke="#1c1917" stroke-width="1.2" opacity=".6"/>` +
      // врата
      post(16) + post(64) +
      `<path d="M5 30 Q12 32 16 28 H64 Q68 32 75 30 L73 36 Q67 38 63 35 H17 Q13 38 7 36Z" fill="url(#${id}b)" stroke="#2a1508" stroke-width="1.8" stroke-linejoin="round"/>` +
      `<path d="M5 30 C1 26 3 20 8 22 C11 23 10 27 7 27M75 30 C79 26 77 20 72 22 C69 23 70 27 73 27" fill="none" stroke="#2a1508" stroke-width="2.2" stroke-linecap="round"/>` +
      `<path d="M22 31.5 h36" stroke="#e3b27a" stroke-width="1" stroke-dasharray="2.5 2.5" opacity=".8"/>` +
      `<path d="M40 28 V17" stroke="#2a1508" stroke-width="1.8"/><path class="art-sway" d="M40 17 L55 21 L40 25Z" fill="${fire}" stroke="#2a1508" stroke-width="1"/>` +
      // оберег на балке
      `<circle cx="40" cy="41" r="5.5" fill="none" stroke="${fire}" stroke-width="1.6"/><path d="M40 37v8M36 41h8" stroke="${fire}" stroke-width="1.4"/>` +
      // огонь на кругу
      `<g class="art-flicker"><path d="M40 60 C47 70 51 76 48 84 C46 90 34 90 32 84 C29 76 34 72 36 66 C38 71 40 70 40 60Z" fill="url(#${id}f)"/>` +
      `<path d="M40 72 C44 77 45 81 43 85 C41 88 38 88 37 85 C35 81 38 78 40 72Z" fill="#fffbeb" opacity=".9"/></g>` +
      `<path d="M31 88 L49 84 M31 84 L49 88" stroke="#3b1f0e" stroke-width="3" stroke-linecap="round"/>` +
      `<circle class="art-float" cx="32" cy="58" r="1.5" fill="${fire}"/><circle class="art-float" style="animation-delay:.8s" cx="47" cy="52" r="1.2" fill="#fff" opacity=".85"/>` +
      `</svg>`;
  }
  // 4.7: герб клана — щит в рельефной золотой кайме с заклёпками, венец с самоцветом, за щитом скрещённое оружие,
  // на поле — объёмный зверь с тенями и бликами. 4.28: кланы — мифологии (CLANS): зверь — CLANS[k].crest, поле — цвет клана.
  // Сокол-Рарог (славянский), сова Афины (греческий), волк Одина (скандинавский), медведица Артио (кельтский), скарабей
  // с солнцем (египетский), Лазурный дракон (китайский), ягуар (ацтекский), лиса-кицунэ (японский); у будущих кланов без
  // своего зверя — звезда Алатыря; '?' — клан следующего сезона
  const CREST = {
    slavic: { f: ['#fdba74', '#c2410c', '#3b0d02'], gem: '#f97316', gl: '#fed7aa' },
    greek: { f: ['#bfdbfe', '#2563eb', '#0b1a4d'], gem: '#3b82f6', gl: '#bfdbfe' },
    norse: { f: ['#ddd6fe', '#6d28d9', '#1e0b4b'], gem: '#a78bfa', gl: '#ede9fe' },
    celtic: { f: ['#bbf7d0', '#15803d', '#052e16'], gem: '#22c55e', gl: '#dcfce7' },
    egypt: { f: ['#fde68a', '#b45309', '#2a1603'], gem: '#facc15', gl: '#fef9c3' },
    china: { f: ['#fca5a5', '#dc2626', '#4c0808'], gem: '#ef4444', gl: '#fecaca' },
    aztec: { f: ['#a5f3fc', '#0e7490', '#042f2e'], gem: '#06b6d4', gl: '#cffafe' },
    japan: { f: ['#fbcfe8', '#be185d', '#4a0424'], gem: '#f472b6', gl: '#fce7f3' },
    '?': { f: ['#cbd5e1', '#475569', '#0f172a'], gem: '#94a3b8', gl: '#e2e8f0' },
  };
  const CREST_ARM = { falcon: 'arrow', bear: 'axe', wolf: 'spear', owl: 'trident', scarab: 'ankh', dragon: 'glaive', jaguar: 'club', fox: 'katana' };
  // цвет #rrggbb, смешанный с белым (t > 0) или чёрным (t < 0)
  const crestMix = (hex, t) => '#' + [1, 3, 5].map(i => { const v = parseInt(hex.slice(i, i + 2), 16), x = t > 0 ? v + (255 - v) * t : v * (1 + t); return Math.round(x).toString(16).padStart(2, '0'); }).join('');
  function crestOf(k) {
    if (k === '?') return { ...CREST['?'], beast: 'q', arm: 'spear', key: 'q' };
    const cl = typeof CLANS !== 'undefined' && CLANS[k] ? CLANS[k] : null, key = cl ? cl.myth : 'slavic';
    const beast = cl ? cl.crest : 'falcon', col = cl && /^#[0-9a-f]{6}$/i.test(cl.color) ? cl.color : '#f97316';
    const pal = CREST[key] || { f: [crestMix(col, 0.55), crestMix(col, -0.2), crestMix(col, -0.82)], gem: col, gl: crestMix(col, 0.7) };
    return { ...pal, beast, arm: CREST_ARM[beast] || 'spear', silver: beast === 'wolf' || beast === 'fox', key };
  }
  function clanCrest(k) {
    const c = crestOf(k), id = 'cr' + c.key, O = '#2a1405';
    const G = `url(#${id}g)`, M = `url(#${id}m)`, f2 = n => n.toFixed(1);
    const S = 'M60 16 L98 22 Q104 23 104 29 V62 C104 94 84 114 60 126 C36 114 16 94 16 62 V29 Q16 23 22 22Z';
    const S2 = 'M60 23 L94 28 Q97 28.5 97 32 V62 C97 90 80 107 60 118 C40 107 23 90 23 62 V32 Q23 28.5 26 28Z';
    // перо: лист от основания вверх, повёрнутый на a градусов
    const feather = (x, y, a, L, w, fill) => `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 0 C${w} ${f2(-L * .3)} ${f2(w * .7)} ${f2(-L * .82)} 0 ${-L} C${f2(-w * .7)} ${f2(-L * .86)} ${-w} ${f2(-L * .3)} 0 0Z" fill="${fill}" stroke="${O}" stroke-width=".8"/><path d="M0 -2 V${f2(-L * .8)}" stroke="${O}" stroke-width=".5" opacity=".45"/></g>`;
    // оружие за щитом: вертикально, потом поворот вокруг центра щита
    const weapon = rot => {
      const head = c.arm === 'arrow'
        ? `<path d="M0 -84 L6 -69 L0 -72 L-6 -69Z" fill="${G}" stroke="${O}" stroke-width=".9"/><path d="M0 50 L-6 57 L-6 66 L0 60 L6 66 L6 57Z" fill="${c.gem}" stroke="${O}" stroke-width=".8"/>`
        : c.arm === 'axe'
          ? `<path d="M0 -74 C8 -71 17 -74 19 -86 C14 -92 6 -92 0 -88Z" fill="${M}" stroke="${O}" stroke-width=".9"/><path d="M0 -94 L3 -86 L-3 -86Z" fill="${G}" stroke="${O}" stroke-width=".7"/><circle cy="60" r="3" fill="${G}" stroke="${O}" stroke-width=".8"/>`
        : c.arm === 'trident' // трезубец Посейдона
          ? `<path d="M-11 -62 V-79 H-13.5 L-9.5 -89 L-5.5 -79 H-8 V-67 H-1.6 V-83 H-4 L0 -94 L4 -83 H1.6 V-67 H8 V-79 H5.5 L9.5 -89 L13.5 -79 H11 V-62Z" fill="${M}" stroke="${O}" stroke-width=".9" stroke-linejoin="round"/><circle cy="60" r="3" fill="${G}" stroke="${O}" stroke-width=".8"/>`
        : c.arm === 'ankh' // посох с анхом — знаком жизни
          ? `<ellipse cy="-86" rx="5.2" ry="7.4" fill="none" stroke="${O}" stroke-width="4.4"/><ellipse cy="-86" rx="5.2" ry="7.4" fill="none" stroke="${G}" stroke-width="2.4"/><path d="M-10 -74.5 H10" stroke="${O}" stroke-width="4.6" stroke-linecap="round"/><path d="M-10 -74.5 H10" stroke="${G}" stroke-width="2.6" stroke-linecap="round"/><path d="M-4 60 L0 66 L4 60Z" fill="${G}" stroke="${O}" stroke-width=".8"/>`
        : c.arm === 'glaive' // гуань дао: изогнутый клинок и алая кисть
          ? `<path d="M-2 -64 L-2 -74 C4 -78 7 -85 6 -95 C12 -87 14 -76 8 -68 C5 -65 2 -64 -2 -64Z" fill="${M}" stroke="${O}" stroke-width=".9" stroke-linejoin="round"/><path d="M-1 -66 C3 -69 5.5 -75 5.5 -82" stroke="#fff" stroke-width=".8" fill="none" opacity=".6"/><path d="M0 -63 C-4 -58 -6 -54 -5 -48 M0 -63 C-2 -57 -2 -53 0 -47 M0 -63 C2 -58 3 -54 3 -49" stroke="${c.gem}" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cy="60" r="3" fill="${G}" stroke="${O}" stroke-width=".8"/>`
        : c.arm === 'club' // макуауитль: деревянная лопасть с обсидиановыми лезвиями
          ? `<path d="M-5 -60 L-6.5 -87 Q0 -94 6.5 -87 L5 -60Z" fill="url(#${id}w)" stroke="${O}" stroke-width=".9"/>${[-85, -78, -71, -64].map(y => `<path d="M-6 ${y} L-10.5 ${y + 2.5} L-6 ${y + 5}Z M6 ${y} L10.5 ${y + 2.5} L6 ${y + 5}Z" fill="#1f2937" stroke="${O}" stroke-width=".6"/>`).join('')}<circle cy="60" r="3" fill="${G}" stroke="${O}" stroke-width=".8"/>`
        : c.arm === 'katana' // катана: изогнутый клинок, круглая цуба
          ? `<path d="M-1.8 -68 C-1.8 -78 0 -87 4.5 -95 C3.2 -86 1.8 -78 1.8 -68Z" fill="${M}" stroke="${O}" stroke-width=".9" stroke-linejoin="round"/><ellipse cy="-69" rx="6" ry="2.2" fill="${G}" stroke="${O}" stroke-width=".8"/><path d="M-3 56 H3 M-3 60 H3" stroke="${c.gem}" stroke-width="1.4"/><circle cy="63" r="2.4" fill="${G}" stroke="${O}" stroke-width=".8"/>`
          : `<path d="M0 -92 C6 -83 6 -74 0 -68 C-6 -74 -6 -83 0 -92Z" fill="${M}" stroke="${O}" stroke-width=".9"/><path d="M-6 -67 H6" stroke="${G}" stroke-width="2.6" stroke-linecap="round"/><path d="M-6 -67 H6" stroke="${O}" stroke-width=".6" opacity=".6"/><circle cy="60" r="2.8" fill="${G}" stroke="${O}" stroke-width=".8"/>`;
      return `<g transform="translate(60 66) rotate(${rot})"><path d="M0 -70 V58" stroke="${O}" stroke-width="4.2" stroke-linecap="round"/><path d="M0 -70 V58" stroke="url(#${id}w)" stroke-width="2.4" stroke-linecap="round"/>${head}</g>`;
    };
    let beast = '';
    if (c.beast === 'falcon') {
      // сокол: крылья подняты, два яруса перьев, хвост веером, голова в профиль с крючковатым клювом и «усами»
      let wing = '';
      [-12, -26, -40, -54, -68, -82, -96].forEach((a, i) => { wing += feather(51, 60, a, 34 - Math.abs(i - 2) * 1.6, 5.2, `url(#${id}e2)`); });
      [-20, -38, -56, -74, -92].forEach((a, i) => { wing += feather(52, 60, a, 19 - i * .6, 5, G); });
      let tail = '';
      [158, 169, 180, 191, 202].forEach(a => { tail += feather(60, 92, a, 22, 4.4, `url(#${id}e2)`); });
      let scales = '';
      for (let r = 0; r < 4; r++) for (let j = -1 - (r > 1 ? 0 : 0); j <= 1; j++) scales += `<path d="M${f2(60 + j * 5.2 - 2.6)} ${f2(66 + r * 6)} q2.6 3 5.2 0" fill="none" stroke="${O}" stroke-width=".6" opacity=".45"/>`;
      beast = `${tail}${wing}<g transform="translate(120 0) scale(-1 1)">${wing}</g>
        <path d="M54 92 L50 100 M50 100 L46 101 M50 100 L48 104 M50 100 L52 104 M66 92 L70 100 M70 100 L74 101 M70 100 L72 104 M70 100 L68 104" stroke="${O}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M54 92 L50 100 M50 100 L46 101 M50 100 L48 104 M50 100 L52 104 M66 92 L70 100 M70 100 L74 101 M70 100 L72 104 M70 100 L68 104" stroke="${G}" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M60 52 C71 52 73 64 71 77 C69 89 64 95 60 97 C56 95 51 89 49 77 C47 64 49 52 60 52Z" fill="${G}" stroke="${O}" stroke-width="1"/>
        <path d="M60 56 C66 57 67 66 66 76 C65 86 62 91 60 92 C58 91 55 86 54 76 C53 66 54 57 60 56Z" fill="#fff6d0" opacity=".45"/>${scales}
        <path d="M60 36 C67 36 69 43 67 49 C65 54 60 56 56 55 C51 54 49 49 50 44 C51 39 55 36 60 36Z" fill="${G}" stroke="${O}" stroke-width="1"/>
        <path d="M51 40 C46 38.6 41.6 40.6 40.6 45.2 C40.4 46.8 40.9 48.2 41.8 49.2 C42.2 47.2 43.4 46 45.2 45.8 C45 46.8 45.6 47.6 46.8 47.8 L51.2 47Z" fill="url(#${id}e2)" stroke="${O}" stroke-width=".9" stroke-linejoin="round"/><path d="M44 42 C46 41 48.5 41 50.5 41.8" stroke="#fff" stroke-width=".8" fill="none" opacity=".6" stroke-linecap="round"/>
        <path d="M55.2 44.6 C53.6 47.6 54 51 56.6 53.4 C57.8 50.4 57.8 47.2 56.8 44.8Z" fill="${O}" opacity=".6"/>
        <path d="M52.5 39.6 Q57 37.2 61 39.8" stroke="${O}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <circle cx="56.5" cy="42.3" r="2.5" fill="${c.gem}" stroke="${O}" stroke-width=".9"/><circle cx="55.8" cy="41.6" r=".8" fill="#fff"/>
        <path d="M58 38 C62 37.5 65 39.5 66 43" stroke="#fff" stroke-width="1" fill="none" opacity=".55" stroke-linecap="round"/>`;
    } else if (c.beast === 'bear') {
      // медведь: зубчатая грива, уши, тяжёлые брови, светлая морда, раскрытая пасть с клыками
      beast = `        <circle cx="37" cy="48" r="9.5" fill="${G}" stroke="${O}" stroke-width="1"/><circle cx="83" cy="48" r="9.5" fill="${G}" stroke="${O}" stroke-width="1"/>
        <circle cx="37.5" cy="48.5" r="5" fill="#7a4a12" opacity=".75"/><circle cx="82.5" cy="48.5" r="5" fill="#7a4a12" opacity=".75"/>
        <path d="M31 73 C29 49 91 49 89 73 C90 94 76 108 60 110 C44 108 30 94 31 73Z" fill="${G}" stroke="${O}" stroke-width="1"/><path d="M33 80 C34 94 46 106 60 108 C74 106 86 94 87 80 C84 94 72 103 60 104 C48 103 36 94 33 80Z" fill="${O}" opacity=".18"/>
        <path d="M38 61 Q48 55 57 64 L56 68 Q48 61 39 65Z M82 61 Q72 55 63 64 L64 68 Q72 61 81 65Z" fill="${O}" opacity=".3"/>
        <path d="M40 60.5 Q48.5 56 56.5 64.5 M80 60.5 Q71.5 56 63.5 64.5" stroke="${O}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M44 66.5 L55 68.8 L46.5 71.5Z M76 66.5 L65 68.8 L73.5 71.5Z" fill="#fff3b0" stroke="${O}" stroke-width=".9" stroke-linejoin="round"/><circle cx="50" cy="69" r="1.3" fill="${O}"/><circle cx="70" cy="69" r="1.3" fill="${O}"/>
        <ellipse cx="60" cy="88" rx="16" ry="14" fill="url(#${id}mz)" stroke="${O}" stroke-width=".8"/>
        <path d="M52.5 79.5 Q60 75 67.5 79.5 Q64.5 86 60 86 Q55.5 86 52.5 79.5Z" fill="#20100a" stroke="${O}" stroke-width=".8"/><ellipse cx="57.5" cy="79.2" rx="2.4" ry="1.1" fill="#fff" opacity=".55"/>
        <path d="M60 86 V89" stroke="${O}" stroke-width="1.3"/>
        <path d="M49 91 Q60 87 71 91 Q67 102 60 103 Q53 102 49 91Z" fill="#5c0d0d" stroke="${O}" stroke-width="1"/><path d="M54 98 Q60 95 66 98 Q63 102 60 102 Q57 102 54 98Z" fill="#b91c1c" opacity=".8"/>
        <path d="M51.5 90.5 L53.5 96.5 L55.5 89.6Z M68.5 90.5 L66.5 96.5 L64.5 89.6Z M53.5 101 L55 96.5 L56.8 101.6Z M66.5 101 L65 96.5 L63.2 101.6Z" fill="#fffbe6" stroke="${O}" stroke-width=".6" stroke-linejoin="round"/>
        <path d="M44 52 Q52 48 60 49 M34 76 L40 78.5 M33 82 L39 83.5 M35 88 L40.5 88.5 M86 76 L80 78.5 M87 82 L81 83.5 M85 88 L79.5 88.5" stroke="${O}" stroke-width="1" fill="none" stroke-linecap="round" opacity=".4"/>
        <path d="M46 54 Q55 50 64 52" stroke="#fff" stroke-width="1.3" fill="none" opacity=".45" stroke-linecap="round"/>`;
    } else if (c.beast === 'wolf') {
      // волк: острые уши, меховые скулы, тёмная маска, раскосые янтарные глаза, длинная морда и оскал
      beast = `<g transform="translate(60 72) scale(.9) translate(-60 -72)"><path d="M60 110 L53 103 L47 97 L41 94 L36 89 L29 88 L32 83 L25 79 L31 75 L26 69 L32 66 L30 50 L27 28 L42 43 L51 41 L60 39 L69 41 L78 43 L93 28 L90 50 L88 66 L94 69 L89 75 L95 79 L88 83 L91 88 L84 89 L79 94 L73 97 L67 103Z" fill="${M}" stroke="${O}" stroke-width="1" stroke-linejoin="round"/>
        <path d="M30.5 33 L41 45.5 L33.5 50Z M89.5 33 L79 45.5 L86.5 50Z" fill="#4b5568" stroke="${O}" stroke-width=".7" stroke-linejoin="round"/><path d="M32 37 L37 46 M88 37 L83 46" stroke="#e5e7eb" stroke-width=".7" opacity=".7"/>
        <path d="M60 43 L68 56 L63 66 L60 70 L57 66 L52 56Z M36 60 L50 62 L52 70 L42 74Z M84 60 L70 62 L68 70 L78 74Z" fill="#4b5568" opacity=".45"/>
        <path d="M49 69 C53 66.5 67 66.5 71 69 C71.5 80 68 92 60 103 C52 92 48.5 80 49 69Z" fill="url(#${id}mz)" opacity=".75"/><path d="M60 68 V90" stroke="${O}" stroke-width=".8" opacity=".3"/><path d="M52 72 C53 82 56 90 60 96" stroke="#fff" stroke-width="1.1" fill="none" opacity=".7" stroke-linecap="round"/>
        <path d="M36 56.5 L51 60.5 M84 56.5 L69 60.5" stroke="${O}" stroke-width="2.3" stroke-linecap="round"/>
        <path d="M39 61 L52 63.5 L42.5 67.5Z M81 61 L68 63.5 L77.5 67.5Z" fill="#fbbf24" stroke="${O}" stroke-width=".9" stroke-linejoin="round"/><path d="M46 62.3 L47 66 M74 62.3 L73 66" stroke="${O}" stroke-width="1.3"/>
        <path d="M54.5 91 L65.5 91 L60 98Z" fill="#141a26" stroke="${O}" stroke-width=".8" stroke-linejoin="round"/><ellipse cx="58" cy="92.2" rx="2" ry=".9" fill="#fff" opacity=".6"/>
        <path d="M60 98 V100.5 M53.5 101 Q60 104.5 66.5 101" stroke="${O}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
        <path d="M54.8 101.5 L56.2 106 L57.6 102.4Z M65.2 101.5 L63.8 106 L62.4 102.4Z" fill="#fffbe6" stroke="${O}" stroke-width=".6"/>
        <path d="M33 74 L39 76 M31 80 L37 81 M87 74 L81 76 M89 80 L83 81 M40 88 L45 90 M80 88 L75 90" stroke="${O}" stroke-width="1" stroke-linecap="round" opacity=".45"/>
        <path d="M44 46 Q52 43 60 44 M62 44 Q68 43.5 74 46" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7" stroke-linecap="round"/></g>`;
    } else if (c.beast === 'owl') {
      // сова Афины: ушки-перья, лицевые диски, большие глаза, сложенные крылья, сидит на оливковой ветви
      let sc = '';
      for (let r = 0; r < 4; r++) for (let j = -1; j <= 1; j++) sc += `<path d="M${f2(60 + j * 6 - 3)} ${f2(76 + r * 6.5)} q3 3.4 6 0" fill="none" stroke="${O}" stroke-width=".6" opacity=".45"/>`;
      beast = `<path d="M32 108 Q60 101 88 108" stroke="${O}" stroke-width="4.2" fill="none" stroke-linecap="round"/><path d="M32 108 Q60 101 88 108" stroke="url(#${id}w)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <g fill="#86efac" stroke="${O}" stroke-width=".6"><ellipse cx="36" cy="103.5" rx="4.6" ry="1.9" transform="rotate(-24 36 103.5)"/><ellipse cx="84" cy="103.5" rx="4.6" ry="1.9" transform="rotate(24 84 103.5)"/><ellipse cx="29" cy="110" rx="4.2" ry="1.8" transform="rotate(18 29 110)"/><ellipse cx="91" cy="110" rx="4.2" ry="1.8" transform="rotate(-18 91 110)"/></g>
        <path d="M60 60 C77 60 83 76 81 90 C79 101 71 106 60 107 C49 106 41 101 39 90 C37 76 43 60 60 60Z" fill="${G}" stroke="${O}" stroke-width="1"/>
        <path d="M60 66 C69 67 72 78 71 88 C70 97 65 101 60 102 C55 101 50 97 49 88 C48 78 51 67 60 66Z" fill="#fff6d0" opacity=".42"/>${sc}
        <path d="M43 70 C34 80 34 97 45 106 C47 95 47 83 50 73Z M77 70 C86 80 86 97 75 106 C73 95 73 83 70 73Z" fill="url(#${id}e2)" stroke="${O}" stroke-width=".9" stroke-linejoin="round"/>
        <path d="M44 78 C41 86 41 94 45 100 M76 78 C79 86 79 94 75 100" stroke="${O}" stroke-width=".7" fill="none" opacity=".45"/>
        <path d="M53 106 L51 110 M56 106.5 L55.5 110.5 M64 106.5 L64.5 110.5 M67 106 L69 110" stroke="${O}" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M41 42 L37 26 L49 37Z M79 42 L83 26 L71 37Z" fill="url(#${id}e2)" stroke="${O}" stroke-width=".9" stroke-linejoin="round"/>
        <path d="M60 33 C75 33 81 42 81 53 C81 64 72 70 60 70 C48 70 39 64 39 53 C39 42 45 33 60 33Z" fill="${G}" stroke="${O}" stroke-width="1"/>
        <circle cx="50.5" cy="52" r="8.6" fill="#fff6d0" opacity=".6" stroke="${O}" stroke-width=".7"/><circle cx="69.5" cy="52" r="8.6" fill="#fff6d0" opacity=".6" stroke="${O}" stroke-width=".7"/>
        <path d="M42.5 44 Q51 46.5 60 53 Q69 46.5 77.5 44" stroke="${O}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <circle cx="50.5" cy="52.5" r="5.2" fill="${c.gem}" stroke="${O}" stroke-width="1"/><circle cx="69.5" cy="52.5" r="5.2" fill="${c.gem}" stroke="${O}" stroke-width="1"/>
        <circle cx="50.5" cy="52.5" r="2.5" fill="${O}"/><circle cx="69.5" cy="52.5" r="2.5" fill="${O}"/><circle cx="49.4" cy="51.3" r="1" fill="#fff"/><circle cx="68.4" cy="51.3" r="1" fill="#fff"/>
        <path d="M57 55 L63 55 L60 63Z" fill="url(#${id}e2)" stroke="${O}" stroke-width=".9" stroke-linejoin="round"/>
        <path d="M49 37 Q56 34.5 62 35.5" stroke="#fff" stroke-width="1.2" fill="none" opacity=".55" stroke-linecap="round"/>`;
    } else if (c.beast === 'scarab') {
      // скарабей Хепри: катит солнечный диск, крылья из трёх ярусов перьев (золото и лазурит)
      let wing = '';
      [-62, -76, -90, -104, -118].forEach((a, i) => { wing += feather(49, 72, a, 35 - i * 1.5, 5.4, `url(#${id}e2)`); });
      [-70, -86, -102, -118].forEach((a, i) => { wing += feather(50, 72, a, 23 - i, 5, `url(#${id}lp)`); });
      const legs = 'M51 61 L43 55 L46 47 M69 61 L77 55 L74 47 M50 76 L40 79 L35 87 M70 76 L80 79 L85 87 M52 92 L44 99 L42 107 M68 92 L76 99 L78 107';
      beast = `${wing}<g transform="translate(120 0) scale(-1 1)">${wing}</g>
        <path d="${legs}" stroke="${O}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${legs}" stroke="${G}" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="60" cy="37" r="11" fill="url(#${id}sun)" stroke="${O}" stroke-width="1"/><circle cx="60" cy="37" r="12.6" fill="none" stroke="${G}" stroke-width="1.6"/><path d="M53 32 Q57 28.5 62 29" stroke="#fff" stroke-width="1.2" fill="none" opacity=".6" stroke-linecap="round"/>
        <path d="M49 71 C48 90 55 101 60 104 C65 101 72 90 71 71 C71 68 49 68 49 71Z" fill="url(#${id}lp)" stroke="${O}" stroke-width="1"/>
        <path d="M60 71 V103" stroke="${G}" stroke-width="1.3"/><path d="M53 74 C52 84 55 93 58 98" stroke="#fff" stroke-width="1.1" fill="none" opacity=".5" stroke-linecap="round"/>
        <path d="M60 58 C67 58 71 62 71 66 C71 70 67 72 60 72 C53 72 49 70 49 66 C49 62 53 58 60 58Z" fill="url(#${id}lp)" stroke="${O}" stroke-width="1"/><path d="M52 64 H68" stroke="${G}" stroke-width="1" opacity=".8"/>
        <path d="M60 49 C65 49 68 52 68 56 L66 58.5 L63 57 L60 59 L57 57 L54 58.5 L52 56 C52 52 55 49 60 49Z" fill="${G}" stroke="${O}" stroke-width=".9" stroke-linejoin="round"/>
        <circle cx="56" cy="54" r="1.3" fill="${O}"/><circle cx="64" cy="54" r="1.3" fill="${O}"/>`;
    } else if (c.beast === 'dragon') {
      // Лазурный дракон: тело кольцами с гребнем и чешуёй, голова в профиль с рогами и усами, огненная жемчужина
      const body = 'M58 51 C50 60 41 66 43 77 C45 88 60 87 70 85 C82 83 87 93 80 101 C73 109 59 108 50 104 C45 102 41 104 38 108';
      beast = `<path d="${body}" stroke="${c.gem}" stroke-width="16" fill="none" stroke-dasharray="2.6 3.4" stroke-linecap="butt"/>
        <path d="${body}" stroke="${O}" stroke-width="12.4" fill="none" stroke-linecap="round"/><path d="${body}" stroke="${G}" stroke-width="10" fill="none" stroke-linecap="round"/>
        <path d="${body}" stroke="#8a5a14" stroke-width="6" fill="none" stroke-dasharray="1.6 3" opacity=".5"/><path d="${body}" stroke="#fff6d0" stroke-width="1.6" fill="none" opacity=".55" transform="translate(-1.6 -1.6)"/>
        <path d="M36 109 C32 104 30 110 26 106 C29 112 34 114 38 112Z" fill="#f59e0b" stroke="${O}" stroke-width=".8"/>
        <path d="M44 76 L37 80 L33 78 M37 80 L35 84 M37 80 L39 85 M77 90 L85 88 L88 91 M85 88 L87 84 M85 88 L89 86" stroke="${O}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M44 76 L37 80 L33 78 M37 80 L35 84 M37 80 L39 85 M77 90 L85 88 L88 91 M85 88 L87 84 M85 88 L89 86" stroke="${G}" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M55 45 L46 42 L50 48 L41 50 L49 53 L44 58 L55 55Z" fill="#f59e0b" stroke="${O}" stroke-width=".8" stroke-linejoin="round"/>
        <path d="M58 36 C54 29 50 26 43 26 C48 29 51 33 54 38Z M63 34 C62 27 60 22 55 19 C59 25 60 29 59.5 35Z" fill="#fff6d0" stroke="${O}" stroke-width=".8" stroke-linejoin="round"/>
        <path d="M52 46 C52 38 58 33 66 33 C72 33 76 35 80 38 L88 38 C90.5 40 90.5 44 87.5 46 L80 47 C78 51 72 53 66 52.5 C60 52.5 54 51 52 46Z" fill="${G}" stroke="${O}" stroke-width="1" stroke-linejoin="round"/>
        <path d="M80 47 L88.5 49 C86.5 52.5 82 53.5 78 52.5Z" fill="#7f1d1d" stroke="${O}" stroke-width=".8"/><path d="M82 47.6 L83 50 L84.2 48Z" fill="#fffbe6"/>
        <path d="M63 38 Q68 35.5 73 38" stroke="${O}" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="68" cy="41" r="2.4" fill="${c.gem}" stroke="${O}" stroke-width=".9"/><circle cx="67.4" cy="40.4" r=".7" fill="#fff"/>
        <path d="M86.5 45.5 C92 49 94 55 90.5 61 M84 39 C90 35 93 29 91 23" stroke="${G}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
        <path d="M57 42 Q64 37 72 36.5" stroke="#fff" stroke-width="1" fill="none" opacity=".55" stroke-linecap="round"/>
        <g class="art-flicker"><path d="M85 70 C80 66 81 60 85 57 C85 61 88 61 88 58 C92 62 92 67 88 70Z" fill="#fbbf24" opacity=".85"/></g>
        <circle cx="86.5" cy="67" r="4.4" fill="#fff7d6" stroke="${O}" stroke-width=".9"/><circle cx="85.3" cy="65.8" r="1.3" fill="#fff"/>`;
    } else if (c.beast === 'jaguar') {
      // ягуар: круглые уши, морда в розетках, изумрудные глаза, светлые брыли и клыки
      const ros = [[45, 58], [75, 58], [60, 52], [39, 72], [81, 72], [52, 50], [68, 50], [42, 88], [78, 88], [36, 80], [84, 80]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.1" fill="#b7791f" stroke="#2a1405" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r=".9" fill="#2a1405" opacity=".7"/>`).join('');
      beast = `<circle cx="37" cy="47" r="8.5" fill="${G}" stroke="${O}" stroke-width="1"/><circle cx="83" cy="47" r="8.5" fill="${G}" stroke="${O}" stroke-width="1"/>
        <circle cx="37.5" cy="47.5" r="4.4" fill="#2a1405" opacity=".75"/><circle cx="82.5" cy="47.5" r="4.4" fill="#2a1405" opacity=".75"/>
        <path d="M60 42 C80 42 91 55 91 72 C91 90 78 104 60 106 C42 104 29 90 29 72 C29 55 40 42 60 42Z" fill="${G}" stroke="${O}" stroke-width="1"/>${ros}
        <path d="M40 64 L54.5 67.5 L44.5 72Z M80 64 L65.5 67.5 L75.5 72Z" fill="#a3e635" stroke="${O}" stroke-width=".9" stroke-linejoin="round"/><path d="M48.5 65.6 V71 M71.5 65.6 V71" stroke="${O}" stroke-width="1.5"/>
        <path d="M45 72 C44 77 45 81 47 84 M75 72 C76 77 75 81 73 84" stroke="${O}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".7"/>
        <path d="M56 68 C57 74 58 78 60 80 C62 78 63 74 64 68" fill="#fff6d0" opacity=".5"/>
        <ellipse cx="53.5" cy="90" rx="7.4" ry="5.6" fill="url(#${id}mz)" stroke="${O}" stroke-width=".7"/><ellipse cx="66.5" cy="90" rx="7.4" ry="5.6" fill="url(#${id}mz)" stroke="${O}" stroke-width=".7"/>
        <path d="M54 80 L66 80 L60 86.5Z" fill="#7f1d1d" stroke="${O}" stroke-width=".9" stroke-linejoin="round"/><ellipse cx="58" cy="81.2" rx="2" ry=".8" fill="#fff" opacity=".5"/>
        <path d="M55.5 95 L57 101 L58.5 95.6Z M64.5 95 L63 101 L61.5 95.6Z" fill="#fffbe6" stroke="${O}" stroke-width=".6" stroke-linejoin="round"/>
        <g fill="${O}" opacity=".55"><circle cx="50" cy="89" r=".8"/><circle cx="53" cy="92" r=".8"/><circle cx="70" cy="89" r=".8"/><circle cx="67" cy="92" r=".8"/></g>
        <path d="M49 91 L37 89 M49 93.5 L38 95 M71 91 L83 89 M71 93.5 L82 95" stroke="#fffbe6" stroke-width=".8" opacity=".8"/>
        <path d="M46 49 Q54 45.5 62 46.5" stroke="#fff" stroke-width="1.3" fill="none" opacity=".5" stroke-linecap="round"/>`;
    } else if (c.beast === 'fox') {
      // лиса-кицунэ богини Инари: белая маска с алыми знаками, высокие уши, золотые глаза
      beast = `<g transform="translate(60 72) scale(.92) translate(-60 -72)"><path d="M60 110 L52 102 L44 94 L37 88 L31 84 L26 78 L31 75 L28 68 L32 63 L31 47 L29 22 L46 42 L60 39 L74 42 L91 22 L89 47 L88 63 L92 68 L89 75 L94 78 L89 84 L83 88 L76 94 L68 102Z" fill="${M}" stroke="${O}" stroke-width="1" stroke-linejoin="round"/>
        <path d="M32 28 L43 44 L35 50Z M88 28 L77 44 L85 50Z" fill="#dc2626" stroke="${O}" stroke-width=".7" stroke-linejoin="round"/><path d="M34 34 L38 44 M86 34 L82 44" stroke="#fecaca" stroke-width=".7" opacity=".8"/>
        <path d="M60 45 C55 52 56 59 60 64 C64 59 65 52 60 45Z" fill="#dc2626" stroke="${O}" stroke-width=".6"/><circle cx="60" cy="56" r="2" fill="#fbbf24" stroke="${O}" stroke-width=".5"/>
        <path d="M38 60 C42 53 48 52 54 57 M82 60 C78 53 72 52 66 57" stroke="#dc2626" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M39 65 L53.5 67.5 L43 71.5Z M81 65 L66.5 67.5 L77 71.5Z" fill="#fbbf24" stroke="${O}" stroke-width=".9" stroke-linejoin="round"/><path d="M46.5 66 V70.4 M73.5 66 V70.4" stroke="${O}" stroke-width="1.3"/>
        <path d="M44 73 C42 78 43 83 46 86 M76 73 C78 78 77 83 74 86" stroke="#dc2626" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M51 72 C54 70 66 70 69 72 C69 83 66 94 60 104 C54 94 51 83 51 72Z" fill="url(#${id}mz)" opacity=".8"/>
        <path d="M55.5 98 L64.5 98 L60 103.5Z" fill="#141a26" stroke="${O}" stroke-width=".8" stroke-linejoin="round"/><ellipse cx="58.3" cy="99" rx="1.6" ry=".7" fill="#fff" opacity=".6"/>
        <path d="M60 103.5 V106 M55 106.5 Q60 109.5 65 106.5" stroke="${O}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
        <path d="M31 76 L37 77 M29 81 L35 81 M89 76 L83 77 M91 81 L85 81" stroke="${O}" stroke-width="1" stroke-linecap="round" opacity=".45"/>
        <path d="M45 47 Q52 44 58 45 M62 45 Q68 44 75 47" stroke="#fff" stroke-width="1.2" fill="none" opacity=".75" stroke-linecap="round"/></g>`;
    } else if (c.beast === 'q') {
      // клан следующего сезона — знак вопроса
      beast = `<text x="60" y="97" text-anchor="middle" font-size="66" font-weight="900" font-family="Georgia, 'Times New Roman', serif" fill="${G}" stroke="${O}" stroke-width="1.6" paint-order="stroke">?</text>`;
    } else {
      // клан без своего зверя — восьмилучевая звезда Алатыря с самоцветом
      const pts = [...Array(16)].map((_, i) => { const a = Math.PI * i / 8 - Math.PI / 2, r = i % 2 ? 13 : 31; return `${f2(60 + r * Math.cos(a))},${f2(70 + r * Math.sin(a))}`; }).join(' ');
      beast = `<polygon points="${pts}" fill="${G}" stroke="${O}" stroke-width="1" stroke-linejoin="round"/>
        <path d="M60 58 L70 66 L66 80 L54 80 L50 66Z" fill="${c.gem}" stroke="${O}" stroke-width="1" stroke-linejoin="round"/><path d="M60 58 L60 80 M50 66 L70 66" stroke="#fff" stroke-width=".8" opacity=".55"/>`;
    }
    const rivets = [[22, 28], [98, 28], [16.5, 50], [103.5, 50], [19, 80], [101, 80], [35, 107], [85, 107], [60, 122]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#fff4c4" stroke="${O}" stroke-width=".7"/>`).join('');
    return `<svg viewBox="0 0 120 132" class="art crest" aria-hidden="true"><defs>
      <radialGradient id="${id}f" cx=".42" cy=".3" r=".9"><stop offset="0" stop-color="${c.f[0]}"/><stop offset=".42" stop-color="${c.f[1]}"/><stop offset="1" stop-color="${c.f[2]}"/></radialGradient>
      <radialGradient id="${id}h" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${c.gem}" stop-opacity=".55"/><stop offset="1" stop-color="${c.gem}" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7d1"/><stop offset=".3" stop-color="#f7d77e"/><stop offset=".58" stop-color="#d59a36"/><stop offset=".82" stop-color="#8a5a14"/><stop offset="1" stop-color="#e9bd5a"/></linearGradient>
      <linearGradient id="${id}e2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7d77e"/><stop offset=".6" stop-color="#b97a22"/><stop offset="1" stop-color="#6e430c"/></linearGradient>
      <linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1">${c.silver ? '<stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#e3e8f0"/><stop offset=".65" stop-color="#a7b2c4"/><stop offset=".88" stop-color="#5d6a80"/><stop offset="1" stop-color="#c9d2e0"/>' : '<stop offset="0" stop-color="#f1f5f9"/><stop offset=".5" stop-color="#b6c0cf"/><stop offset="1" stop-color="#5d6a80"/>'}</linearGradient>
      <radialGradient id="${id}mz" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="${c.silver ? '#ffffff' : '#fff6d6'}"/><stop offset="1" stop-color="${c.silver ? '#c3ccda' : '#e6bc68'}"/></radialGradient>
      <linearGradient id="${id}lp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#93c5fd"/><stop offset=".45" stop-color="#1d4ed8"/><stop offset="1" stop-color="#0b1a4d"/></linearGradient>
      <radialGradient id="${id}sun" cx=".38" cy=".34" r=".8"><stop offset="0" stop-color="#fecaca"/><stop offset=".45" stop-color="#ef4444"/><stop offset="1" stop-color="#7f1d1d"/></radialGradient>
      <linearGradient id="${id}w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b4222"/><stop offset=".5" stop-color="#c08a4f"/><stop offset="1" stop-color="#6b4222"/></linearGradient>
      <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff7d1"/><stop offset=".35" stop-color="#f3cf6b"/><stop offset=".7" stop-color="#a86a18"/><stop offset="1" stop-color="#f0c75e"/></linearGradient>
      <pattern id="${id}p" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M4 .8L7.2 4 4 7.2 .8 4Z" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width=".7"/></pattern>
      <radialGradient id="${id}v" cx=".5" cy=".42" r=".62"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
      <clipPath id="${id}c"><path d="${S2}"/></clipPath></defs>
      <circle cx="60" cy="68" r="60" fill="url(#${id}h)"/>
      ${weapon(-45)}${weapon(45)}
      <path d="${S}" fill="#140804" transform="translate(0 3)" opacity=".5"/>
      <path d="${S}" fill="url(#${id}r)" stroke="${O}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="${S2}" fill="url(#${id}f)"/>
      <g clip-path="url(#${id}c)"><rect x="16" y="20" width="90" height="100" fill="url(#${id}p)"/><path d="${S2}" fill="url(#${id}v)"/><ellipse cx="46" cy="36" rx="30" ry="11" fill="#fff" opacity=".12" transform="rotate(-14 46 36)"/></g>
      <path d="${S2}" fill="none" stroke="${O}" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M60 25.5 L92.5 30.3 Q94.8 30.7 94.8 33.2 V62 C94.8 88.5 78.5 104.5 60 115" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1"/>
      ${rivets}
      <g stroke-linejoin="round">${beast}</g>
      <path d="M42 18.5 L44.5 7.5 L51.5 12.5 L60 2.5 L68.5 12.5 L75.5 7.5 L78 18.5 Q60 14.5 42 18.5Z" fill="${G}" stroke="${O}" stroke-width="1"/>
      <path d="M42 18.5 Q60 14.5 78 18.5 L77.4 21.8 Q60 18 42.6 21.8Z" fill="url(#${id}e2)" stroke="${O}" stroke-width=".9"/>
      <circle cx="44.5" cy="6.8" r="2" fill="#fffbe6" stroke="${O}" stroke-width=".7"/><circle cx="60" cy="2" r="2.2" fill="#fffbe6" stroke="${O}" stroke-width=".7"/><circle cx="75.5" cy="6.8" r="2" fill="#fffbe6" stroke="${O}" stroke-width=".7"/>
      <path d="M60 9 L63.4 13 L60 17 L56.6 13Z" fill="${c.gem}" stroke="${O}" stroke-width=".8"/><path d="M60 10 L61.6 13 L60 13.6Z" fill="${c.gl}" opacity=".9"/>
      <circle cx="50" cy="19" r="1.3" fill="${c.gem}" stroke="${O}" stroke-width=".5"/><circle cx="70" cy="19" r="1.3" fill="${c.gem}" stroke="${O}" stroke-width=".5"/></svg>`;
  }
  function guardian(color) {
    return `<svg viewBox="0 0 100 100" class="art"><circle cx="50" cy="50" r="48" fill="#241a45"/>` +
      `<path d="M50 12 C72 12 82 34 82 56 L86 98 H14 L18 56 C18 34 28 12 50 12Z" fill="${color}"/>` +
      `<path d="M50 12 C72 12 82 34 82 56 L86 98 H70 L66 58 C66 40 60 26 50 22Z" fill="#000" opacity=".2"/>` +
      `<path d="M50 22 C64 22 70 38 70 52 C70 62 62 70 50 70 C38 70 30 62 30 52 C30 38 36 22 50 22Z" fill="#150d2b"/>` +
      `<ellipse cx="42" cy="50" rx="4" ry="2.6" fill="#fde047"/><ellipse cx="58" cy="50" rx="4" ry="2.6" fill="#fde047"/>` +
      `<path d="M36 82 H64" stroke="#fde047" stroke-width="3"/><circle cx="50" cy="82" r="5" fill="#fde047"/></svg>`;
  }

  /* ---------------- ОБЛИК ЛОВЧЕГО ---------------- */
  const EMBLEM = {
    charm: '<circle cx="50" cy="84" r="7" fill="#fbbf24" stroke="#92400e" stroke-width="2"/><path d="M50 79v10M45.5 81.5l9 5M54.5 81.5l-9 5" stroke="#92400e" stroke-width="1.6"/>',
    sun: '<circle cx="50" cy="84" r="5" fill="#fbbf24"/><path d="M50 74v3M50 91v3M40 84h3M57 84h3M43 77l2 2M55 89l2 2M57 77l-2 2M45 89l-2 2" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>',
    moon: '<path d="M53 76a8 8 0 1 0 5 13 7 7 0 1 1-5-13z" fill="#e0e7ff"/>',
    leaf: '<path d="M42 90c0-9 6-14 16-14 0 9-6 14-16 14zM42 90l9-8" fill="#4ade80" stroke="#166534" stroke-width="1.5"/>',
    bolt: '<path d="M52 74l-8 11h6l-2 10 9-12h-6z" fill="#fde047" stroke="#a16207" stroke-width="1.2"/>',
    horn: '<circle cx="50" cy="84" r="9" fill="#67e8f9" opacity=".25"/><path d="M45 93 L57 74 L53 93 Z" fill="#e0e7ff" stroke="#4338ca" stroke-width="1.3" stroke-linejoin="round"/><path d="M47.5 89l6-1.5M49.5 85l5-1.5M51.5 81l3.5-1" stroke="#4338ca" stroke-width="1"/>',
    needle: '<circle cx="50" cy="84" r="9" fill="#4ade80" opacity=".25"/><path d="M42 93 L58 75" stroke="#e2e8f0" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="56.6" cy="76.6" rx="1.5" ry="3.2" transform="rotate(42 56.6 76.6)" fill="none" stroke="#1b1030" stroke-width="1.2"/>',
    crown: '<path d="M41 90V78l4.5 5 4.5-7 4.5 7 4.5-5v12z" fill="#fbbf24" stroke="#92400e" stroke-width="1.4" stroke-linejoin="round"/><circle cx="50" cy="86" r="1.8" fill="#e11d48"/>',
    oak: '<circle cx="50" cy="84" r="9" fill="#a3e635" opacity=".22"/><path d="M40 89c0-7 5-11 12-11-1 7-5 11-12 11z" fill="#65a30d" stroke="#365314" stroke-width="1.3"/><ellipse cx="56" cy="87.5" rx="4.5" ry="5.5" fill="#d9a066" stroke="#78350f" stroke-width="1.3"/><path d="M51.3 84.2h9.4a4.7 3.2 0 0 0-9.4 0z" fill="#78350f"/>',
    star: '<path d="M50 75l2.6 5.4 5.9.9-4.3 4.1 1 5.9L50 88.5l-5.2 2.8 1-5.9-4.3-4.1 5.9-.9z" fill="#fde047" stroke="#a16207" stroke-width="1"/>',
  };
  // цвет — только #rrggbb: облик приходит и от других игроков (Лига, разломы), в атрибут SVG попадает лишь проверенное
  const HEX = /^#[0-9a-f]{6}$/i;
  // 4.22.2: Ловчий везде в игре — как на кнопке «Ловчий» в меню: объёмный плащ с капюшоном, светящиеся глаза, копья с флажками;
  // цвета плаща и глаз, эмблема на груди — из Гардероба. Номер у градиентов свой у каждого рисунка (на экране их может быть много)
  let hoodN = 0;
  function hood(c, eye, emblem) {
    const p = 'hd' + (++hoodN), ol = shade(c, -0.6), u = id => `url(#${p}${id})`;
    const em = (Object.prototype.hasOwnProperty.call(EMBLEM, emblem) && EMBLEM[emblem]) || EMBLEM.charm;
    return `<svg viewBox="0 0 100 100" class="art"><defs>` +
      `<linearGradient id="${p}c" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="${shade(c, .35)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -.4)}"/></linearGradient>` +
      `<radialGradient id="${p}f" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#2a1f4a"/><stop offset="1" stop-color="#07040f"/></radialGradient>` +
      `<radialGradient id="${p}e" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${eye}" stop-opacity=".7"/><stop offset="1" stop-color="${eye}" stop-opacity="0"/></radialGradient></defs>` +
      `<circle cx="50" cy="50" r="48" fill="#241a45"/><g transform="translate(5 8) scale(.9)">` +
      `<path d="M70 62 L86 24 M76 64 L92 32" stroke="#2a1405" stroke-width="5" stroke-linecap="round"/><path d="M70 62 L86 24 M76 64 L92 32" stroke="#c98a4a" stroke-width="2.2" stroke-linecap="round"/>` +
      `<g fill="#ef4444" stroke="#4c0808" stroke-width="1.5" stroke-linejoin="round"><path transform="translate(86 24) rotate(22.8)" d="M0 1 L-4.5 -3 V8 L0 12Z M0 1 L4.5 -3 V8 L0 12Z"/><path transform="translate(92 32) rotate(26.6)" d="M0 1 L-4.5 -3 V8 L0 12Z M0 1 L4.5 -3 V8 L0 12Z"/></g>` +
      `<path d="M10 92 C10 74 24 62 38 58 H62 C76 62 90 74 90 92Z" fill="${u('c')}" stroke="${ol}" stroke-width="3.2" stroke-linejoin="round"/>` +
      `<path d="M62 58 C76 62 90 74 90 92 H73 C73 78 69 66 62 58Z" fill="#000" opacity=".2"/><path d="M18 90 C20 78 28 70 36 66" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".3"/>` +
      `<path d="M47 78 L43 92 M53 78 L57 92" stroke="#f7d77e" stroke-width="2.2" stroke-linecap="round"/>` +
      `<path d="M50 5 C31 9 21 26 21 44 C21 57 28 65 38 67 H62 C72 65 79 57 79 44 C79 26 69 9 50 5Z" fill="${u('c')}" stroke="${ol}" stroke-width="3.2" stroke-linejoin="round"/>` +
      `<path d="M58 10 C70 18 79 30 79 44 C79 56 72 64 62 66 C68 56 70 34 58 10Z" fill="#000" opacity=".2"/>` +
      `<path d="M50 23 C62 23 67 36 67 46 C67 56 59 63 50 63 C41 63 33 56 33 46 C33 36 38 23 50 23Z" fill="${u('f')}" stroke="${ol}" stroke-width="2.4"/>` +
      `<path d="M36 38 C38 29 43 25 50 25" stroke="${shade(c, .3)}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>` +
      `<ellipse cx="50" cy="46" rx="16" ry="9" fill="${u('e')}"/><ellipse cx="43" cy="46" rx="4.2" ry="2.8" fill="${eye}"/><ellipse cx="57" cy="46" rx="4.2" ry="2.8" fill="${eye}"/>` +
      `<circle cx="44" cy="45.3" r="1.1" fill="#fff"/><circle cx="58" cy="45.3" r="1.1" fill="#fff"/>` +
      `<ellipse cx="33" cy="21" rx="7" ry="3.5" transform="rotate(-50 33 21)" fill="#fff" opacity=".5"/>` +
      `<g transform="translate(0 -10)">${em}</g></g></svg>`;
  }
  function avatar(look) {
    look = look || {};
    // 4.6: облик-скин (js/skins-art.js) — поверх него те же глаза и эмблема
    // только облики из списка LOOK.skin: облик приходит и от других игроков ('constructor', 'draw' и т. п. — мимо)
    if (look.skin && look.skin !== 'hood' && typeof SkinArt !== 'undefined' && LOOK.skin.some(k => k.id === look.skin)) return SkinArt.draw(look.skin, look);
    const cloak = HEX.test(look.cloak) ? look.cloak : '#6d28d9', eyes = HEX.test(look.eyes) ? look.eyes : '#5eead4';
    return hood(cloak, eyes, look.emblem);
  }

  // 4.6: фон и рамка карточки Ловчего (Гардероб): только значения из LOOK.bg / LOOK.frame; картинки — js/looks-art.js
  const cardUrl = {};
  function cardSkin(el, look) {
    if (!el) return;
    look = look || {};
    const url = (k, make) => cardUrl[k] || (cardUrl[k] = `url("data:image/svg+xml,${encodeURIComponent(make())}")`);
    const ok = typeof LookArt !== 'undefined' && typeof LookArt.cardBg === 'function' && typeof LookArt.cardFrame === 'function';
    const bg = ok && look.bg && look.bg !== 'night' && LOOK.bg.some(x => x.id === look.bg) ? look.bg : null;
    const fr = ok && look.frame && look.frame !== 'none' && LOOK.frame.some(x => x.id === look.frame) ? look.frame : null;
    el.classList.toggle('card-bg', !!bg); el.classList.toggle('card-fr', !!fr);
    if (bg) el.style.setProperty('--card-bg', url('b:' + bg, () => LookArt.cardBg(bg))); else el.style.removeProperty('--card-bg');
    if (fr) el.style.setProperty('--card-fr', url('f:' + fr, () => LookArt.cardFrame(fr))); else el.style.removeProperty('--card-fr');
    // живые части рамки — угловые украшения, навершие и подвеска: встроенный SVG, чтобы работали анимации (пламя, блеск самоцветов, руны)
    const old = el.querySelector(':scope > .cf-ov'); if (old) old.remove();
    const P = fr && typeof LookArt.frameParts === 'function' ? LookArt.frameParts(fr) : null;
    if (P) {
      const n = 'cf' + (++cfN);
      // части рамки — слоями (неподвижное картинкой, анимированное — лёгким SVG), кэш по рамке и месту
      // общие градиенты и штампы части рамки держат в defs одного угла — каждой части (отдельному рисунку) даём все defs, лишнее отсечёт stack
      const DEFS = /<defs>[\s\S]*?<\/defs>/g;
      const allDefs = [P.corner, ...(P.corners || []), P.crest, P.foot].filter(Boolean).map(b => (b.match(DEFS) || []).join('')).join('').replace(/<\/?defs>/g, '');
      const sv = (cls, vb, body) => body ? stack(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><defs>${allDefs.replace(/__ID__/g, 'cz')}</defs>${body.replace(DEFS, '').replace(/__ID__/g, 'cz')}</svg>`, `cf:${fr}:${cls}`, `cf ${cls}`) : '';
      const one = !Array.isArray(P.corners), c = one ? [P.corner, P.corner, P.corner, P.corner] : P.corners;
      el.insertAdjacentHTML('beforeend', (`<div class="cf-ov" aria-hidden="true">${sv('tl', '0 0 80 80', c[0])}${sv('tr' + (one ? ' mir' : ''), '0 0 80 80', c[1])}` +
        `${sv('bl' + (one ? ' mir' : ''), '0 0 80 80', c[2])}${sv('br' + (one ? ' mir' : ''), '0 0 80 80', c[3])}${sv('crest', '0 0 160 64', P.crest)}${sv('foot', '0 0 120 40', P.foot)}</div>`).replace(/__ID__/g, n));
    }
  }
  let cfN = 0;
  const emblem = id => (Object.prototype.hasOwnProperty.call(EMBLEM, id) && EMBLEM[id]) || EMBLEM.charm;
  // 4.6: наружу духи отдаются картинкой: объёмный рисунок (маски, фактуры) браузер растрирует один раз, а не каждый кадр анимации.
  // svgOf — сам SVG (для фото с поимки, где нужен размер)
  const svgOf = sp => spirit(sp.sid, sp.shiny, sp.dark);
  // 4.6.1: рисунок слоями — выглядит так же, но анимация не перерисовывает весь рисунок.
  // Неподвижные части (в порядке наложения) — картинками: браузер растрирует их один раз вместе с масками объёма и фактурой;
  // анимированные части (пламя, крылья, моргание, огоньки — по классам анимаций) — лёгкими встроенными SVG между ними.
  const NS = 'http://www.w3.org/2000/svg';
  const ANIM = /(^|\s)(art-(?:flicker|blink|float|sway|wing|spin|spin-soft|aura|eyes)|cf-glint|cf-pulse|beam|ty-lamp|ty-puddle)(\s|$)/;
  const NOPAINT = new Set(['defs', 'clipPath', 'mask', 'pattern', 'linearGradient', 'radialGradient', 'symbol', 'filter', 'style', 'title', 'desc', 'metadata']);
  const toUrl = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  const refsOf = s => [...s.matchAll(/url\(#([^)"']+)\)|href="#([^"]+)"/g)].map(m => m[1] || m[2]);
  const stackCache = {};
  let stkN = 0;
  // 4.6.3: движущаяся часть — тоже картинка (обрезанная по её границам), а само движение — у картинки:
  // видеокарта двигает готовый снимок, телефону не нужно перерисовывать рисунок каждый кадр.
  // Точка вращения и сдвиги пересчитываются из рисунка, поэтому движение то же. Если часть так не переводится
  // (вложенная анимация, обрезка или поворот у родителя, своё transform) — она остаётся встроенным SVG, как раньше.
  const CALM = /(^|\s)(art-(?:flicker|blink|float|sway|wing|spin|spin-soft|aura|eyes)|ty-lamp|ty-puddle)(\s|$)/;
  const KF_OK = /^(rotate|rotateZ|scale|scaleX|scaleY|skew|skewX|skewY|translate|translateX|translateY)$/;
  const kfCache = {};
  let kfSheet = null, kfN = 0;
  // кадры анимации из таблиц стилей игры: [{key, transform, opacity, easing}] или null, если там есть что-то кроме движения и прозрачности
  function kfOf(name) {
    if (name in kfCache) return kfCache[name];
    let rule = null;
    for (const sh of document.styleSheets) {
      let rs; try { rs = sh.cssRules; } catch (e) { continue; }
      for (const r of rs) if (r.type === 7 && r.name === name) rule = r;
    }
    let out = null;
    if (rule) {
      out = [];
      for (const k of rule.cssRules) {
        const st = k.style, f = { key: k.keyText };
        for (let i = 0; i < st.length; i++) {
          const p = st[i];
          if (p === 'transform') f.transform = st.transform;
          else if (p === 'opacity') f.opacity = st.opacity;
          else if (p === 'animation-timing-function') f.easing = st.animationTimingFunction;
          else { out = null; break; }
        }
        if (!out) break;
        out.push(f);
      }
    }
    return (kfCache[name] = out);
  }
  // сдвиги в единицах рисунка → проценты от картинки части; остальное (поворот, масштаб, скос) не меняется
  function kfMove(tr, sx, sy) {
    if (!tr || tr === 'none') return tr;
    let ok = true;
    const out = tr.replace(/([a-zA-Z]+)\(([^)]*)\)/g, (m, fn, args) => {
      if (!KF_OK.test(fn)) { ok = false; return m; }
      if (!/^translate/.test(fn)) return m;
      const a = args.split(',').map(x => x.trim()), pct = (x, k) => {
        const n = /^(-?[\d.]+)(px)?$/.exec(x);
        if (!n || (!n[2] && +n[1] !== 0)) { ok = false; return x; }
        return `${+(+n[1] * k).toFixed(4)}%`;
      };
      if (fn === 'translateX') return `translateX(${pct(a[0], sx)})`;
      if (fn === 'translateY') return `translateY(${pct(a[0], sy)})`;
      return `translate(${pct(a[0], sx)}, ${pct(a[1] || '0', sy)})`;
    });
    return ok ? out : null;
  }
  function kfRule(frames) {
    const css = frames.map(f => `${f.key}{${f.transform != null ? `transform:${f.transform};` : ''}${f.opacity != null ? `opacity:${f.opacity};` : ''}${f.easing ? `animation-timing-function:${f.easing};` : ''}}`).join('');
    if (kfCache['@' + css]) return kfCache['@' + css];
    if (!kfSheet) { kfSheet = document.createElement('style'); kfSheet.id = 'stk-kf'; document.head.appendChild(kfSheet); }
    const name = 'stkA' + (++kfN);
    kfSheet.sheet.insertRule(`@keyframes ${name}{${css}}`, kfSheet.sheet.cssRules.length);
    return (kfCache['@' + css] = name);
  }
  const r4 = x => +x.toFixed(4);
  // измеряет рисунок в невидимом месте страницы: {индекс части: {crop, css, op, calm}}
  function probe(root, vb, units, ctx) {
    const moved = {};
    if (typeof document === 'undefined' || !document.documentElement || !units.some(u => u.anim)) return moved;
    const host = document.createElement('div');
    host.className = `art art-stack ${ctx || ''}`;
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = `position:fixed;left:-99999px;top:0;width:${vb[2]}px;height:${vb[3]}px;visibility:hidden;pointer-events:none;contain:strict`;
    try {
      host.innerHTML = new XMLSerializer().serializeToString(root);
      const svg = host.firstElementChild;
      svg.setAttribute('width', vb[2]); svg.setAttribute('height', vb[3]);
      document.documentElement.appendChild(host);
      const byId = id => svg.querySelector(`[id="${CSS.escape(id)}"]`);
      units.forEach((u, i) => {
        if (!u.anim) return;
        const el = svg.querySelector(`[data-u="${i}"]`);
        // своё transform заменяется анимацией, вложенная анимация замрёт в картинке — такие части не трогаем
        if (!el || el.hasAttribute('transform') || [...el.querySelectorAll('*')].some(d => getComputedStyle(d).animationName !== 'none')) return;
        const cs = getComputedStyle(el), name = cs.animationName;
        if (!name || name === 'none' || name.includes(',')) return;
        // родители: без обрезки, масок и размывающих фильтров
        for (let p = el.parentNode; p && p !== svg; p = p.parentNode) {
          if (p.hasAttribute('clip-path') || p.hasAttribute('mask') || p.hasAttribute('filter')) return;
          const f = getComputedStyle(p).filter;
          if (f && f !== 'none' && /url|blur|drop-shadow/.test(f)) return;
          if (getComputedStyle(p).animationName !== 'none') return;
        }
        const P = el.parentNode.getCTM();
        if (!P || Math.abs(P.b) > 1e-6 || Math.abs(P.c) > 1e-6 || Math.abs(P.a - P.d) > 1e-6 || P.a <= 0) return;
        const s = P.a, frames = kfOf(name);
        if (!frames) return;
        const hasT = frames.some(f => f.transform), op = frames.some(f => f.opacity != null);
        if (hasT && cs.transformBox !== 'fill-box' && frames.some(f => f.transform && /(rotate|scale|skew)/.test(f.transform))) return;
        const b = el.getBBox();
        if (!(b.width > 0 && b.height > 0)) return;
        // поля: обводки и области фильтров внутри части
        let pad = 0;
        for (const d of [el, ...el.querySelectorAll('*')]) {
          const dc = getComputedStyle(d);
          if (dc.stroke && dc.stroke !== 'none') { const m = d.getCTM(); pad = Math.max(pad, (parseFloat(dc.strokeWidth) || 1) * (m ? Math.hypot(m.a, m.b) : s) / 2 * 1.5); }
          const fu = (d.getAttribute('filter') || '').match(/url\(#([^)"']+)\)/) || (dc.filter || '').match(/url\("?#([^)"']+)"?\)/);
          if (fu) {
            const F = byId(fu[1]);
            if (!F || F.getAttribute('filterUnits') === 'userSpaceOnUse') return;
            const fx = parseFloat(F.getAttribute('x') || '-10%') / (/%/.test(F.getAttribute('x') || '%') ? 100 : 1);
            const fy = parseFloat(F.getAttribute('y') || '-10%') / (/%/.test(F.getAttribute('y') || '%') ? 100 : 1);
            const fw = parseFloat(F.getAttribute('width') || '120%') / (/%/.test(F.getAttribute('width') || '%') ? 100 : 1);
            const fh = parseFloat(F.getAttribute('height') || '120%') / (/%/.test(F.getAttribute('height') || '%') ? 100 : 1);
            pad = Math.max(pad, Math.max(-fx, fx + fw - 1) * b.width * s, Math.max(-fy, fy + fh - 1) * b.height * s);
          } else if (dc.filter && dc.filter !== 'none' && /blur|drop-shadow/.test(dc.filter)) return;
        }
        pad += 1.5 + 0.04 * Math.max(b.width, b.height) * s;
        const cx = r4(P.a * b.x + P.e + vb[0] - pad), cy = r4(P.d * b.y + P.f + vb[1] - pad);
        const cw = r4(b.width * s + 2 * pad), ch = r4(b.height * s + 2 * pad);
        // сдвиги: 1 единица части = s единиц рисунка = s/cw ширины картинки
        let anim = name;
        if (frames.some(f => f.transform && /translate/.test(f.transform))) {
          const fr = frames.map(f => ({ ...f, transform: f.transform && kfMove(f.transform, 100 * s / cw, 100 * s / ch) }));
          if (fr.some((f, j) => frames[j].transform && !f.transform)) return;
          anim = kfRule(fr);
        } else if (frames.some(f => f.transform && !kfMove(f.transform, 1, 1))) return;
        const o = cs.transformOrigin.split(' ').map(parseFloat);
        const ox = P.a * (b.x + o[0]) + P.e + vb[0], oy = P.d * (b.y + o[1]) + P.f + vb[1];
        const own = op ? parseFloat(el.getAttribute('opacity') || el.style.opacity || '1') : 1;
        moved[i] = {
          crop: [cx, cy, cw, ch], op, calm: CALM.test(el.getAttribute('class') || ''),
          css: `left:${r4((cx - vb[0]) / vb[2] * 100)}%;top:${r4((cy - vb[1]) / vb[3] * 100)}%;width:${r4(cw / vb[2] * 100)}%;height:${r4(ch / vb[3] * 100)}%;` +
            `transform-origin:${r4((ox - cx) / cw * 100)}% ${r4((oy - cy) / ch * 100)}%;${own !== 1 ? `opacity:${own};` : ''}` +
            `animation:${anim} ${cs.animationDuration} ${cs.animationTimingFunction} ${cs.animationDelay} ${cs.animationIterationCount} ${cs.animationDirection} ${cs.animationFillMode}`,
        };
      });
    } catch (e) { /* что не измерилось — остаётся встроенным SVG */ } finally { host.remove(); }
    return moved;
  }
  function layers(svg, ctx) {
    if (!/xmlns=/.test(svg.slice(0, 200))) svg = svg.replace('<svg ', `<svg xmlns="${NS}" `);
    const vb = (/viewBox="([^"]+)"/.exec(svg) || [])[1] || '0 0 100 100', v = vb.split(/[\s,]+/).map(Number), ar = `${v[2]} / ${v[3]}`;
    if (typeof DOMParser === 'undefined') return { ar, parts: [{ svg }] };
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml'), root = doc.documentElement;
    if (root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) return { ar, parts: [{ svg }] };
    // <use> на элемент рисунка (не из defs) — заменяем копией: оригинал и ссылка могут попасть в разные слои
    for (const u of [...root.getElementsByTagName('use')]) {
      const id = (u.getAttribute('href') || u.getAttribute('xlink:href') || '').replace(/^#/, ''), t = id && doc.getElementById(id);
      if (!t || t.closest('defs, symbol')) continue;
      const g = doc.createElementNS(NS, 'g'), x = +u.getAttribute('x') || 0, y = +u.getAttribute('y') || 0;
      g.setAttribute('transform', `${u.getAttribute('transform') || ''}${x || y ? ` translate(${x} ${y})` : ''}`.trim());
      for (const a of ['class', 'style', 'opacity', 'fill', 'stroke']) if (u.hasAttribute(a)) g.setAttribute(a, u.getAttribute(a));
      const c = t.cloneNode(true); c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
      g.appendChild(c); u.replaceWith(g);
    }
    // единицы рисования в порядке наложения: анимированный элемент — целиком, остальное — до листьев
    const units = [];
    const walk = el => {
      for (const c of [...el.children]) {
        if (NOPAINT.has(c.localName)) continue;
        if (ANIM.test(c.getAttribute('class') || '') || /animation/.test(c.getAttribute('style') || '')) { units.push({ el: c, anim: true }); continue; }
        if (c.localName === 'g' || c.localName === 'a' || c.localName === 'switch') { walk(c); continue; }
        units.push({ el: c, anim: false });
      }
    };
    walk(root);
    if (!units.some(u => u.anim)) return { ar, parts: [{ img: toUrl(svg) }] };
    units.forEach((u, i) => u.el.setAttribute('data-u', i));
    const groups = [];
    units.forEach((u, i) => { const last = groups[groups.length - 1]; if (last && !u.anim && !last.anim) last.ids.add(i); else groups.push({ anim: u.anim, ids: new Set([i]) }); });
    const ser = new XMLSerializer();
    const moved = probe(root, v, units, ctx);
    const parts = groups.map(gr => {
      const c = root.cloneNode(true);
      const mv = gr.anim && moved[[...gr.ids][0]];
      c.querySelectorAll('[data-u]').forEach(e => {
        if (!gr.ids.has(+e.getAttribute('data-u'))) return e.remove();
        e.removeAttribute('data-u');
        // своя прозрачность части становится исходным значением картинки (анимация её заменяет, а не умножает)
        if (mv && mv.op) { e.removeAttribute('opacity'); e.style && e.style.removeProperty('opacity'); if (e.getAttribute('style') === '') e.removeAttribute('style'); }
      });
      // из defs — только то, на что ссылается этот слой
      const defs = [...c.querySelectorAll('defs > [id]')], body = ser.serializeToString(c).replace(/<defs[\s\S]*?<\/defs>/g, '');
      const need = new Set(refsOf(body));
      for (let grow = true; grow;) {
        grow = false;
        for (const d of defs) if (need.has(d.id) && !d._seen) { d._seen = true; refsOf(ser.serializeToString(d)).forEach(r => { if (!need.has(r)) { need.add(r); grow = true; } }); }
      }
      defs.forEach(d => { if (!need.has(d.id)) d.remove(); });
      c.setAttribute('class', 'stk');
      if (mv) { c.setAttribute('viewBox', mv.crop.join(' ')); c.removeAttribute('width'); c.removeAttribute('height'); }
      let s = ser.serializeToString(c);
      if (mv) return { img: toUrl(s), css: mv.css, cls: mv.calm ? 'sa sa-c' : 'sa' };
      if (!gr.anim) return { img: toUrl(s) };
      // встроенный слой: свои id на каждой вставке (__L__ подменяется при выдаче)
      const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
      for (const id of ids) s = s.split(`id="${id}"`).join(`id="${id}__L__"`).split(`#${id})`).join(`#${id}__L__)`).split(`"#${id}"`).join(`"#${id}__L__"`);
      return { svg: s };
    });
    return { ar, parts };
  }
  // key — кэш слоёв одинаковых рисунков (дух, знак карты, Велимир); cls — доп. классы обёртки
  // ctx — классы места, от которых зависит анимация (например, луч источника движется только на карте)
  function stack(svg, key, cls = '', ctx = '') {
    const L = key ? (stackCache[key] || (stackCache[key] = layers(svg, `${cls} ${ctx}`))) : layers(svg, `${cls} ${ctx}`);
    const n = 'k' + (++stkN);
    return `<span class="art art-stack${cls ? ' ' + cls : ''}" style="aspect-ratio:${L.ar}">` +
      L.parts.map(p => p.img ? `<img class="stk${p.cls ? ' ' + p.cls : ''}" src="${p.img}" alt="" draggable="false"${p.css ? ` style="${p.css}"` : ''}>` : p.svg.replace(/__L__/g, n)).join('') + '</span>';
  }
  const asImg = (svg, key, ctx) => stack(svg, key, '', ctx);
  // 4.17: дух — вырезанный стикер: лицевая сторона — рисунок с белой каймой, обратная — клейкая основа по его силуэту,
  // закрытая защитной плёнкой с отогнутым углом (под ним виден клей; лоскут — тот же силуэт, отражённый через линию сгиба). Крутится пальцем там, где дух крупно (см. ниже)
  const maskCache = {};
  const rawMask = sid => PICS[sid] ? picUrl(sid) : (maskCache[sid] || (maskCache[sid] = toUrl(spirit(sid)).replace(/'/g, '%27')));
  const silMask = {}; // чёткий силуэт (порог по прозрачности, без сияния и теней рисунка) — считает prepSil
  const maskOf = sid => silMask[sid] || rawMask(sid);
  // Код духа на плёнке — цифры из точек (матрица 5×7), две группы по 4
  const DOTS = ['01110100011001110101110011000101110', '00100011000010000100001000010001110', '01110100010000100010001000100011111', '11111000100010000010000011000101110',
    '00010001100101010010111110001000010', '11111100001111000001000011000101110', '00110010001000011110100011000101110', '11111000010001000100010000100001000',
    '01110100011000101110100011000101110', '01110100011000101111000010001001100'];
  // vert — столбиком (две группы по 4 одна под другой), иначе строкой
  const codeCache = {};
  const codeSvg = (code, vert, style) => (codeCache[code + vert] || (codeCache[code + vert] = (() => {
    let d = '', p = 0;
    [...code].forEach((ch, i) => {
      const g = DOTS[+ch] || '';
      for (let k = 0; k < 35; k++) if (g[k] === '1') { const cx = k % 5 + .5, cy = Math.floor(k / 5) + .5; d += vert ? `M${cx} ${p + cy}h0` : `M${p + cx} ${cy}h0`; }
      p += (vert ? 9 : 6) + (i === 3 ? (vert ? 4 : 3) : 0);
    });
    const L = p - (vert ? 2 : 1);
    return `<svg class="stc-code" viewBox="0 0 ${vert ? 5 : L} ${vert ? L : 7}" preserveAspectRatio="none" aria-hidden="true"__S__><path d="${d}"/></svg>`;
  })())).replace('__S__', ` style="${style}"`);
  // Силуэт духа разбирается один раз: чёткая маска оборота (256 px, порог прозрачности — без сияния и теней рисунка)
  const silWait = {};
  function prepSil(sid) {
    if (silWait[sid] || silMask[sid] || typeof document === 'undefined') return;
    silWait[sid] = true;
    const im = new Image();
    im.onload = () => {
      try {
        const M = 256, c = document.createElement('canvas'); c.width = c.height = M;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, M, M);
        const px = g.getImageData(0, 0, M, M);
        for (let i = 3; i < px.data.length; i += 4) { const on = px.data[i] > 150; px.data[i - 3] = px.data[i - 2] = px.data[i - 1] = 255; px.data[i] = on ? 255 : 0; }
        g.putImageData(px, 0, 0);
        silMask[sid] = c.toDataURL('image/png');
      } catch (e) { /* без чёткой маски — оборот по исходному рисунку */ }
      // готовые стикеры этого духа — на чёткий силуэт
      const ms = silMask[sid] ? `-webkit-mask-image:url('${silMask[sid]}');mask-image:url('${silMask[sid]}')` : '';
      document.querySelectorAll(`.sp-sticker[data-sid="${sid}"]`).forEach(st => {
        if (ms) st.querySelectorAll('.stc-glue, .stc-liner, .stc-flap, .stc-front > .sp-stars').forEach(el => el.setAttribute('style', ms));
      });
    };
    im.src = rawMask(sid);
  }
  // код — крупной строкой поперёк середины; где фигура уже, цифры срезаются по контуру (плёнка — по силуэту)
  const codeFor = (sid, code) => codeSvg(code, false, 'left:17%;top:46%;width:66%;height:9.24%');
  // info — сам дух (Art.of): код на плёнке, привязан ли (плёнка содрана), uid — чтобы содрать её в карточке
  const sticker = (front, sid, info) => {
    const m = maskOf(sid), ms = `-webkit-mask-image:url('${m}');mask-image:url('${m}')`, bound = !!(info && info.bound);
    const code = !bound && info && typeof S !== 'undefined' && S.spiritCode ? S.spiritCode(info) : '';
    prepSil(sid);
    // оборот зеркален (.stc-sil): так силуэт совпадает с лицом, как у настоящего стикера; надпись на плёнке — обратно прямая
    const stars = info && info.dark && !info.purified && !PICS[sid] ? navStars(sid, ms) : ''; // омрачённый рисованный дух — звёздочки поверх лица
    return `<span class="art sp-sticker${bound ? ' stc-bound' : ''}" style="aspect-ratio:1;--el:${elColor(sid)}" data-sid="${sid}"${code ? ` data-code="${code}"` : ''}${info && info.uid ? ` data-uid="${U.esc(info.uid)}"` : ''}><span class="stc-card"><span class="stc-front">${front.replace('class="art ', 'class="')}${stars}</span>` +
      `<span class="stc-back"><span class="stc-sil"><i class="stc-glue" style="${ms}"></i>` +
      (bound ? '' : `<i class="stc-liner" style="${ms}">${code ? codeFor(sid, code) : ''}</i><span class="stc-flapw"><i class="stc-flap" style="${ms}"></i></span>`) + '</span></span></span></span>';
  };
  const spiritK = (sid, shiny, dark, info) => sticker(PICS[sid] ? pic(sid, shiny, dark) : stack(spirit(sid, shiny, dark), `sp:${sid}${shiny ? ':s' : ''}${dark ? ':d' : ''}`), sid, info);
  // Вращение стикера: тянуть — крутится (с разгона докручивается до ближайшей стороны), коснуться — перевернуть.
  // Только крупные духи и не на поимке (там жест — бросок оберега).
  // 4.17: в карточке своего непривязанного духа, повёрнутого оборотом, можно потянуть отогнутый угол плёнки — она отрывается;
  // оторвал достаточно — стикер шлёт событие stickerpeel { uid, done(ok) }: подтверждение и сервер — у карточки (ui-spirits)
  if (typeof document !== 'undefined') {
    // 4.25: без выбора стартового духа — касание карточки выбирает духа, а переворачивало стикер оборотом (белый силуэт вместо лица)
    const ROT = '.det-art, .res-art, .evo-stage, .hatch-sp, .bk-art, .pf-buddy-a';
    const PC = 1.5, PEEL_AT = .4; // плёнка в покое отогнута до линии x + y = 1.5; оторвана, если сгиб дошёл до 0.4
    let g = null;
    const set = (card, ry) => { card._ry = ry; card.style.setProperty('--ry', ry + 'deg'); card.style.setProperty('--hp', (((ry % 360) + 360) % 360 / 3.6).toFixed(1) + '%'); };
    const backShown = card => { const r = (((card._ry || 0) % 360) + 360) % 360; return r > 90 && r < 270; };
    const peelTo = (back, pc, anim) => { back.classList.toggle('peel-anim', !!anim); back.style.setProperty('--pc', pc); };
    document.addEventListener('pointerdown', e => {
      const st = e.target.closest && e.target.closest('.sp-sticker');
      if (!st || !st.closest(ROT) || st.closest('.enc-art')) return;
      const r = st.getBoundingClientRect();
      if (r.width < 90) return;
      const card = st.querySelector('.stc-card'), back = st.querySelector('.stc-back');
      try { st.setPointerCapture(e.pointerId); } catch (err) { /* без захвата — события всё равно ловит документ */ }
      // угол плёнки: оборот зеркален — отогнутый угол виден слева внизу
      const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
      const peel = st.dataset.uid && !st.classList.contains('stc-bound') && st.closest('.det-art') && backShown(card) && (1 - u) + v > PC - .3
        && typeof S !== 'undefined' && S.d && S.findSpirit(st.dataset.uid);
      if (peel) { g = { peel: true, st, back, x: e.clientX, y: e.clientY, w: r.width, pc: PC, moved: false }; return; }
      g = { card, st, x: e.clientX, t: performance.now(), ry0: card._ry || 0, v: 0, lx: e.clientX, lt: performance.now(), moved: false };
    }, { passive: true });
    document.addEventListener('pointermove', e => {
      if (!g) return;
      const dx = e.clientX - g.x;
      if (g.peel) {
        const dist = Math.hypot(dx, e.clientY - g.y);
        if (!g.moved && dist < 6) return;
        if (!g.moved) { g.moved = true; g.back.classList.add('peeling'); g.st.classList.add('spin'); }
        // плёнка клеится крепко: первые 28 px не поддаётся, дальше идёт всё туже — оторвать можно, лишь протянув
        // палец почти на две ширины стикера; по пути телефон «щёлкает» — плёнка отходит рывками
        g.pc = U.clamp(PC - .55 * Math.pow(Math.max(0, dist - 28) / g.w, 1.45), -.4, PC);
        const step = Math.floor((PC - g.pc) / .12);
        if (step > (g.step || 0)) { g.step = step; U.vibrate(8); }
        peelTo(g.back, g.pc.toFixed(3), false);
        return;
      }
      if (!g.moved && Math.abs(dx) < 6) return;
      if (!g.moved) { g.moved = true; g.card.classList.add('drag'); g.st.classList.add('spin'); }
      const now = performance.now(); g.v = (e.clientX - g.lx) / Math.max(1, now - g.lt); g.lx = e.clientX; g.lt = now;
      set(g.card, g.ry0 + dx * 0.9);
    }, { passive: true });
    const up = () => {
      if (!g) return;
      const cur = g; g = null;
      if (cur.peel && cur.moved) {
        const { st, back } = cur, back0 = () => { peelTo(back, PC, true); setTimeout(() => { back.classList.remove('peeling', 'peel-anim'); back.style.removeProperty('--pc'); }, 480); };
        setTimeout(() => st.classList.remove('spin'), 600);
        if (cur.pc > PEEL_AT) { back0(); return; }
        peelTo(back, .45, true); // держим наполовину оторванной, пока Ловчий решает
        st.dispatchEvent(new CustomEvent('stickerpeel', { bubbles: true, detail: { uid: st.dataset.uid, done: ok => {
          if (!ok) { back0(); return; }
          peelTo(back, -1.2, true); back.classList.add('peeled'); // плёнка слетает
        } } }));
        return;
      }
      if (cur.peel) { // просто коснулся угла — перевернуть, как везде
        const card = cur.st.querySelector('.stc-card'); set(card, (card._ry || 0) + 180); return;
      }
      const { card, st } = cur; card.classList.remove('drag');
      // коснулся — перевернуть; потянул — докрутить по инерции до ближайшей стороны
      const target = cur.moved ? Math.round(((card._ry || 0) + cur.v * 260) / 180) * 180 : (card._ry || 0) + 180;
      set(card, target);
      setTimeout(() => st.classList.remove('spin'), 600);
    };
    document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
    // клик после вращения не должен открывать/выбирать (кнопки со стикером внутри)
    document.addEventListener('click', e => { const st = e.target.closest && e.target.closest('.sp-sticker.spin'); if (st) { e.stopPropagation(); e.preventDefault(); } }, true);
  }
  return { spirit: spiritK, of: sp => spiritK(sp.sid, sp.shiny, sp.dark, sp), svgOf, picUrl, picFilter, asImg, stack, img, imgOf, amulet, charm, item, cocoon, elIcon, springIcon, riftIcon, shade, wxIcon, moonIcon, medal, shrineIcon, clanCrest, guardian, avatar, emblem, cardSkin };
})();
