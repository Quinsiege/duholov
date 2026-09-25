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
  const DARK_AURA = `<g class="art-aura" opacity=".85"><circle cx="100" cy="118" r="78" fill="#3b0764" opacity=".35"/><circle cx="86" cy="104" r="56" fill="#581c87" opacity=".3"/><circle cx="118" cy="128" r="50" fill="#1e0b36" opacity=".35"/></g>` +
    `<g class="art-flicker" fill="#a21caf" opacity=".75"><path d="M40 176 C34 150 52 140 48 118 C62 136 66 154 60 176Z"/><path d="M160 176 C166 150 148 140 152 118 C138 136 134 154 140 176Z"/><path d="M92 180 C88 162 100 156 98 140 C108 154 110 166 106 180Z" opacity=".7"/></g>`;
  // shiny — сияющий вариант (другой оттенок и искры), dark — омрачённый Навью
  function spirit(sid, shiny, dark) {
    if (!cache[sid]) cache[sid] = ArtKit.render(SP[sid]) || build(SP[sid]); // 4.6: новый рисунок, если он уже есть
    let s = cache[sid].replace(/__ID__/g, 'a' + (++seq));
    const filters = [];
    if (shiny) filters.push(`hue-rotate(${shinyHue(sid)}deg) saturate(1.3) brightness(1.05)`);
    if (dark) filters.push('saturate(.7) brightness(.85) contrast(1.1)');
    if (filters.length) s = s.replace('<g class="art-body"', `<g class="art-body" style="filter:${filters.join(' ')}"`);
    if (dark) s = s.replace('<ellipse class="art-shadow"', DARK_AURA + '<ellipse class="art-shadow"');
    if (shiny) s = s.replace(/<\/svg>$/, SPARKLES + '</svg>');
    return s;
  }
  const of = sp => spirit(sp.sid, sp.shiny, sp.dark);

  // Лёгкая версия для карты и списков: SVG один раз кодируется в data-URL и дальше
  // рисуется как обычная картинка — вместо сотен DOM-узлов на каждого духа
  const imgCache = {};
  function img(sid, shiny, dark) {
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
  const CHARM_COL = {
    charm:  ['#fb923c', '#9a3412', '#ffedd5'],
    charm2: ['#e2e8f0', '#475569', '#ffffff'],
    charm3: ['#fde047', '#a16207', '#fffbeb'],
    rift:   ['#c084fc', '#581c87', '#f5f3ff'],
  };
  function charm(type = 'charm') {
    const [a, b, c] = CHARM_COL[type] || CHARM_COL.charm, id = 'c' + (++seq);
    return `<svg class="art" viewBox="0 0 100 100"><defs><radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${c}"/><stop offset=".45" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>` +
      `<path d="M50 8 L40 0 M50 8 L60 0" stroke="${b}" stroke-width="4" stroke-linecap="round"/>` +
      `<circle cx="50" cy="54" r="40" fill="url(#${id})" stroke="${b}" stroke-width="4"/>` +
      `<circle cx="50" cy="54" r="27" fill="none" stroke="${c}" stroke-width="2.5" stroke-dasharray="6 5" opacity=".9"/>` +
      `<path d="M50 32 V76 M35 43 L65 65 M65 43 L35 65" stroke="${c}" stroke-width="4" stroke-linecap="round" opacity=".95"/>` +
      `<circle cx="50" cy="54" r="7" fill="${c}"/><circle cx="50" cy="10" r="6" fill="${a}" stroke="${b}" stroke-width="3"/></svg>`;
  }
  function item(key) {
    if (key.startsWith('charm')) return charm(key);
    switch (key) {
      case 'gift': return `<svg class="art" viewBox="0 0 100 100"><path d="M22 44 Q20 88 50 90 Q80 88 78 44Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="3"/>` +
        `<path d="M30 52 Q50 60 70 52 M28 70 Q50 78 72 70" stroke="#fde047" stroke-width="3" fill="none" stroke-dasharray="4 4"/>` +
        `<path d="M24 44 Q50 34 76 44 Q50 52 24 44Z" fill="#b91c1c" stroke="#7f1d1d" stroke-width="3"/>` +
        `<path d="M50 40 C36 20 22 30 34 38 C40 42 46 41 50 40 C54 41 60 42 66 38 C78 30 64 20 50 40Z" fill="#fbbf24" stroke="#92400e" stroke-width="2.5"/>` +
        `<circle cx="50" cy="40" r="4.5" fill="#f59e0b" stroke="#92400e" stroke-width="2"/></svg>`;
      case 'honey': return `<svg class="art" viewBox="0 0 100 100"><rect x="28" y="14" width="44" height="12" rx="4" fill="#92400e"/><path d="M26 30 Q22 26 30 24 H70 Q78 26 74 30 Q86 50 80 78 Q76 92 50 92 Q24 92 20 78 Q14 50 26 30Z" fill="#f59e0b" stroke="#92400e" stroke-width="3"/><path d="M28 44 Q50 52 72 44 Q76 60 72 76 Q50 84 28 76 Q24 60 28 44Z" fill="#fcd34d" opacity=".7"/><ellipse cx="36" cy="56" rx="5" ry="10" fill="#fff" opacity=".5"/></svg>`;
      case 'water': return `<svg class="art" viewBox="0 0 100 100"><rect x="40" y="6" width="20" height="12" rx="3" fill="#a16207"/><path d="M42 18 H58 V36 Q80 48 80 70 Q80 94 50 94 Q20 94 20 70 Q20 48 42 36Z" fill="#e0f2fe" stroke="#0e7490" stroke-width="3" opacity=".95"/><path d="M24 64 Q50 56 76 64 Q78 90 50 90 Q22 90 24 64Z" fill="#2dd4bf"/><circle cx="40" cy="74" r="4" fill="#fff" opacity=".8"/><circle cx="58" cy="80" r="2.5" fill="#fff" opacity=".8"/></svg>`;
      // Златник: золотая монета с солнечным знаком
      case 'zlat': return `<svg class="art" viewBox="0 0 100 100"><circle cx="50" cy="54" r="38" fill="#b45309"/><circle cx="50" cy="50" r="38" fill="#fbbf24" stroke="#92400e" stroke-width="3.5"/><circle cx="50" cy="50" r="29" fill="none" stroke="#d97706" stroke-width="2.5" stroke-dasharray="3 4"/><circle cx="50" cy="50" r="9" fill="#f59e0b" stroke="#92400e" stroke-width="2.5"/><path d="M50 26v10M50 64v10M26 50h10M64 50h10M33 33l7 7M60 60l7 7M67 33l-7 7M40 60l-7 7" stroke="#92400e" stroke-width="3.5" stroke-linecap="round"/><path d="M28 36 Q34 24 46 20" stroke="#fef3c7" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".8"/></svg>`;
      // Дальний пропуск: грамота Ордена с печатью Разлома
      case 'farpass': return `<svg class="art" viewBox="0 0 100 100"><path d="M24 18 H78 Q86 18 86 26 V78 Q86 86 78 86 H30" fill="#fef3c7" stroke="#92400e" stroke-width="3"/>` +
        `<path d="M24 18 Q14 18 14 28 Q14 36 24 36 H30 V86 Q20 86 20 78" fill="#fde68a" stroke="#92400e" stroke-width="3"/>` +
        `<path d="M40 32 H74 M40 42 H70 M40 52 H62" stroke="#b45309" stroke-width="3" stroke-linecap="round" opacity=".6"/>` +
        `<circle cx="62" cy="70" r="13" fill="#7c3aed" stroke="#3b0764" stroke-width="3"/><path d="M58 60 L64 68 L59 72 L66 80" stroke="#e9d5ff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      case 'incense': return `<svg class="art" viewBox="0 0 100 100"><path class="art-float" d="M50 50 C40 40 60 32 50 22 C42 14 54 8 50 2" stroke="#c4b5fd" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/><path d="M16 58 H84 Q80 86 50 88 Q20 86 16 58Z" fill="#7c3aed" stroke="#3b0764" stroke-width="3"/><ellipse cx="50" cy="58" rx="34" ry="8" fill="#a78bfa" stroke="#3b0764" stroke-width="3"/><circle cx="50" cy="56" r="4" fill="#fb923c"/></svg>`;
    }
    return '';
  }
  function cocoon(km) {
    const col = (COCOON_TIERS[km] || COCOON_TIERS[2]).color;
    return `<svg class="art" viewBox="0 0 100 100"><ellipse cx="50" cy="92" rx="26" ry="5" fill="#000" opacity=".25"/><path d="M50 8 C74 8 84 40 82 60 C80 82 66 92 50 92 C34 92 20 82 18 60 C16 40 26 8 50 8Z" fill="${col}" stroke="${shade(col, -0.5)}" stroke-width="3"/>` +
      `<path d="M24 40 Q50 50 78 38 M20 60 Q50 72 82 58 M26 80 Q50 88 74 80" stroke="${shade(col, -0.3)}" stroke-width="3" fill="none" opacity=".8"/><ellipse cx="38" cy="30" rx="6" ry="10" fill="#fff" opacity=".45" transform="rotate(20 38 30)"/></svg>`;
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
  // 4.6: родник — резной колодец-сруб под двускатной крышей, вода светится, над срубом — столб силы
  function springIcon(used, invaded) {
    const w = invaded ? '#d946ef' : used ? '#8b7fc0' : '#5eead4', id = 'sp' + (++seq);
    const log = (y, i) => `<rect x="15" y="${y}" width="50" height="9" rx="4.5" fill="url(#${id}w)" stroke="#3b1f0e" stroke-width="1.6"/>` +
      `<circle cx="${i % 2 ? 16 : 64}" cy="${y + 4.5}" r="3.6" fill="#d9a066" stroke="#3b1f0e" stroke-width="1.3"/><circle cx="${i % 2 ? 16 : 64}" cy="${y + 4.5}" r="1.4" fill="none" stroke="#8a5a2b" stroke-width=".8"/>`;
    return `<svg viewBox="0 0 80 110" class="art"><defs>` +
      `<linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${w}" stop-opacity="${used ? 0.35 : 0.85}"/><stop offset="1" stop-color="${w}" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a4b"/><stop offset=".55" stop-color="#9a5b2a"/><stop offset="1" stop-color="#5e3314"/></linearGradient>` +
      `<linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c4a22"/><stop offset="1" stop-color="#3b1f0e"/></linearGradient>` +
      `<radialGradient id="${id}g"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="${w}"/><stop offset="1" stop-color="${w}" stop-opacity=".6"/></radialGradient></defs>` +
      `<ellipse cx="40" cy="103" rx="30" ry="6" fill="#000" opacity=".35"/>` +
      `<rect class="beam" x="28" y="0" width="24" height="74" rx="12" fill="url(#${id})"/>` +
      // столбы и ворот с ведёрком
      `<path d="M20 74V34M60 74V34" stroke="#3b1f0e" stroke-width="5" stroke-linecap="round"/><path d="M20 74V34M60 74V34" stroke="#9a5b2a" stroke-width="2.6" stroke-linecap="round"/>` +
      `<path d="M19 44H61" stroke="#3b1f0e" stroke-width="4.5" stroke-linecap="round"/><path d="M19 44H61" stroke="#c98a4b" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M44 44V56" stroke="#d6c7a1" stroke-width="1.3"/><path d="M39.5 56h9l-1.3 7h-6.4z" fill="#9a5b2a" stroke="#3b1f0e" stroke-width="1.2" stroke-linejoin="round"/>` +
      // крыша с резным коньком
      `<path d="M8 38 L40 14 L72 38 L66 40 L40 21 L14 40Z" fill="url(#${id}r)" stroke="#2a1508" stroke-width="1.8" stroke-linejoin="round"/>` +
      `<path d="M14 38 L40 19 L66 38" fill="none" stroke="#d9a066" stroke-width="1.2" stroke-dasharray="3 3" opacity=".8"/>` +
      `<path d="M40 14 C36 8 40 4 43 7 C45 9 43 12 40 11" fill="none" stroke="#3b1f0e" stroke-width="2.4" stroke-linecap="round"/>` +
      // сруб: вода сверху, три венца
      `<ellipse cx="40" cy="74" rx="25" ry="7" fill="#2a1508"/><ellipse cx="40" cy="74.5" rx="21" ry="5" fill="url(#${id}g)"/>` +
      `<ellipse cx="34" cy="73.5" rx="6" ry="1.4" fill="#fff" opacity=".75"/>` +
      log(75, 0) + log(83, 1) + log(91, 2) +
      `<circle class="art-float" cx="30" cy="58" r="2.6" fill="${w}"/><circle class="art-float" style="animation-delay:.7s" cx="50" cy="44" r="2.2" fill="${w}"/><circle class="art-float" style="animation-delay:1.3s" cx="38" cy="30" r="1.6" fill="#fff" opacity=".8"/>` +
      (invaded ? `<g class="art-flicker" fill="#3b0764" opacity=".88"><path d="M10 98 C4 76 20 66 16 44 C30 62 32 80 26 98Z"/><path d="M70 98 C76 76 60 66 64 44 C50 62 48 80 54 98Z"/></g>` +
        `<ellipse cx="34" cy="62" rx="3.6" ry="2.4" fill="#f43f5e"/><ellipse cx="46" cy="62" rx="3.6" ry="2.4" fill="#f43f5e"/>` : '') + `</svg>`;
  }
  // 4.6: разлом — каменные врата-кольцо с рунами, внутри закручивается воронка Нави
  function riftIcon(tier) {
    const col = tier === 3 ? '#fbbf24' : tier === 2 ? '#f472b6' : '#a78bfa', id = 'rf' + (++seq);
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
  function medal(m, tier) {
    const col = tier ? MEDAL_TIERS[tier - 1].color : '#4b5563';
    const inner = m.stat.startsWith('el:') ? `<g transform="translate(34 30) scale(1.35)">${elIcon(m.stat.slice(3), 24).replace(/<svg[^>]*>|<\/svg>/g, '')}</g>`
      : `<text x="50" y="60" text-anchor="middle" font-size="30" font-weight="900" fill="#1b1030" font-family="Rubik, sans-serif">${m.name[0]}</text>`;
    return `<svg class="art" viewBox="0 0 100 100"><path d="M32 60 L22 96 L38 88 L46 100 L50 64Z M68 60 L78 96 L62 88 L54 100 L50 64Z" fill="${tier ? '#7c3aed' : '#374151'}"/>` +
      `<circle cx="50" cy="46" r="36" fill="${col}" stroke="${shade(col, -0.4)}" stroke-width="4"/><circle cx="50" cy="46" r="27" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2" stroke-dasharray="4 4"/>` +
      `<g opacity="${tier ? 1 : 0.5}">${inner}</g></svg>`;
  }

  /* ---------------- КАПИЩЕ И ХРАНИТЕЛЬ ---------------- */
  // 4.6: капище — святилище: резные врата из двух идолов под балкой с коньками, между ними на каменном круге — священный огонь цвета капища
  function shrineIcon(tier, won) {
    const fire = won ? '#fbbf24' : tier === 3 ? '#f43f5e' : tier === 2 ? '#c084fc' : '#2dd4bf', id = 'sh' + (++seq);
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
  // 4.7: герб дружины — щит в рельефной золотой кайме с заклёпками, венец с самоцветом, за щитом скрещённое оружие,
  // на поле — объёмный зверь с тенями и бликами: сокол (крылья из перьев), рычащий медведь, серебряный волк
  const CREST = {
    sokol: { f: ['#fca5a5', '#dc2626', '#4c0808'], gem: '#ef4444', gl: '#fecaca', arm: 'arrow' },
    medved: { f: ['#bfdbfe', '#2563eb', '#0b1a4d'], gem: '#3b82f6', gl: '#bfdbfe', arm: 'axe' },
    volk: { f: ['#fcd34d', '#a16207', '#2a1603'], gem: '#eab308', gl: '#fef08a', arm: 'spear', silver: true },
  };
  function clanCrest(k) {
    const c = CREST[k] || CREST.sokol, id = 'cr' + k, O = '#2a1405';
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
          : `<path d="M0 -92 C6 -83 6 -74 0 -68 C-6 -74 -6 -83 0 -92Z" fill="${M}" stroke="${O}" stroke-width=".9"/><path d="M-6 -67 H6" stroke="${G}" stroke-width="2.6" stroke-linecap="round"/><path d="M-6 -67 H6" stroke="${O}" stroke-width=".6" opacity=".6"/><circle cy="60" r="2.8" fill="${G}" stroke="${O}" stroke-width=".8"/>`;
      return `<g transform="translate(60 66) rotate(${rot})"><path d="M0 -70 V58" stroke="${O}" stroke-width="4.2" stroke-linecap="round"/><path d="M0 -70 V58" stroke="url(#${id}w)" stroke-width="2.4" stroke-linecap="round"/>${head}</g>`;
    };
    let beast = '';
    if (k === 'sokol') {
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
    } else if (k === 'medved') {
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
    } else {
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
  function avatar(look) {
    look = look || {};
    // 4.6: облик-скин (js/skins-art.js) — поверх него те же глаза и эмблема
    // только облики из списка LOOK.skin: облик приходит и от других игроков ('constructor', 'draw' и т. п. — мимо)
    if (look.skin && look.skin !== 'hood' && typeof SkinArt !== 'undefined' && LOOK.skin.some(k => k.id === look.skin)) return SkinArt.draw(look.skin, look);
    const cloak = HEX.test(look.cloak) ? look.cloak : '#6d28d9', eyes = HEX.test(look.eyes) ? look.eyes : '#5eead4';
    return `<svg viewBox="0 0 100 100" class="art"><circle cx="50" cy="50" r="48" fill="#241a45"/>` +
      `<path d="M50 14 C70 14 80 34 80 54 L84 96 H16 L20 54 C20 34 30 14 50 14Z" fill="${cloak}"/>` +
      `<path d="M50 14 C70 14 80 34 80 54 L84 96 H70 L66 58 C66 40 60 26 50 22Z" fill="#000" opacity=".18"/>` +
      `<path d="M50 22 C64 22 70 38 70 52 C70 62 62 70 50 70 C38 70 30 62 30 52 C30 38 36 22 50 22Z" fill="#150d2b"/>` +
      `<ellipse cx="42" cy="50" rx="4" ry="2.6" fill="${eyes}"/><ellipse cx="58" cy="50" rx="4" ry="2.6" fill="${eyes}"/>` +
      ((Object.prototype.hasOwnProperty.call(EMBLEM, look.emblem) && EMBLEM[look.emblem]) || EMBLEM.charm) + `</svg>`;
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
  // ctx — классы места, от которых зависит анимация (например, луч родника движется только на карте)
  function stack(svg, key, cls = '', ctx = '') {
    const L = key ? (stackCache[key] || (stackCache[key] = layers(svg, `${cls} ${ctx}`))) : layers(svg, `${cls} ${ctx}`);
    const n = 'k' + (++stkN);
    return `<span class="art art-stack${cls ? ' ' + cls : ''}" style="aspect-ratio:${L.ar}">` +
      L.parts.map(p => p.img ? `<img class="stk${p.cls ? ' ' + p.cls : ''}" src="${p.img}" alt="" draggable="false"${p.css ? ` style="${p.css}"` : ''}>` : p.svg.replace(/__L__/g, n)).join('') + '</span>';
  }
  const asImg = (svg, key, ctx) => stack(svg, key, '', ctx);
  const spiritK = (sid, shiny, dark) => stack(spirit(sid, shiny, dark), `sp:${sid}${shiny ? ':s' : ''}${dark ? ':d' : ''}`);
  return { spirit: spiritK, of: sp => spiritK(sp.sid, sp.shiny, sp.dark), svgOf, asImg, stack, img, imgOf, amulet, charm, item, cocoon, elIcon, springIcon, riftIcon, shade, wxIcon, moonIcon, medal, shrineIcon, clanCrest, guardian, avatar, emblem, cardSkin };
})();
