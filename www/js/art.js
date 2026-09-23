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
  function eye(x, y, r) {
    return `<ellipse cx="${x}" cy="${y}" rx="${r * 0.82}" ry="${r}" fill="#fff"/>` +
      `<ellipse cx="${x + r * 0.12}" cy="${y + r * 0.14}" rx="${r * 0.5}" ry="${r * 0.62}" fill="${DARK}"/>` +
      `<circle cx="${x - r * 0.1}" cy="${y - r * 0.28}" r="${r * 0.24}" fill="#fff"/>`;
  }
  function glowEye(x, y, r, col, fid) {
    return `<ellipse cx="${x}" cy="${y}" rx="${r * 1.05}" ry="${r * 0.7}" fill="${col}" filter="url(#${fid})"/>` +
      `<ellipse cx="${x}" cy="${y}" rx="${r * 0.62}" ry="${r * 0.4}" fill="#fff" opacity=".9"/>`;
  }
  function face(L, sh, fid) {
    const y = sh.face, dx = sh.ex, r = sh.er, ec = L.eye || L.c3;
    let s = '<g class="art-eyes">';
    switch (L.eyes) {
      case 'big': s += eye(100 - dx, y, r * 1.3) + eye(100 + dx, y, r * 1.3); break;
      case 'sleepy':
        [100 - dx, 100 + dx].forEach(x => { s += `<path d="M${x - r * 0.85} ${y} Q${x} ${y + r * 0.8} ${x + r * 0.85} ${y}" stroke="${DARK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`; });
        break;
      case 'angry':
        s += eye(100 - dx, y, r) + eye(100 + dx, y, r);
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
      default: s += eye(100 - dx, y, r) + eye(100 + dx, y, r);
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

  const cache = {};
  const SPARKLES = [[26, 40, 1], [172, 58, 0.8], [160, 150, 0.65], [36, 140, 0.55]].map(([x, y, k], i) =>
    `<path class="art-blink" style="animation-delay:${i * 0.4}s" d="M${x} ${y - 12 * k} L${x + 3 * k} ${y - 3 * k} L${x + 12 * k} ${y} L${x + 3 * k} ${y + 3 * k} L${x} ${y + 12 * k} L${x - 3 * k} ${y + 3 * k} L${x - 12 * k} ${y} L${x - 3 * k} ${y - 3 * k}Z" fill="#fde047" stroke="#fff" stroke-width="1"/>`).join('');
  function shinyHue(sid) { return 90 + Math.round(U.h('shinyhue', sid) * 180); }
  const DARK_AURA = `<g class="art-aura" opacity=".85"><circle cx="100" cy="118" r="78" fill="#3b0764" opacity=".35"/><circle cx="86" cy="104" r="56" fill="#581c87" opacity=".3"/><circle cx="118" cy="128" r="50" fill="#1e0b36" opacity=".35"/></g>` +
    `<g class="art-flicker" fill="#a21caf" opacity=".75"><path d="M40 176 C34 150 52 140 48 118 C62 136 66 154 60 176Z"/><path d="M160 176 C166 150 148 140 152 118 C138 136 134 154 140 176Z"/><path d="M92 180 C88 162 100 156 98 140 C108 154 110 166 106 180Z" opacity=".7"/></g>`;
  // shiny — сияющий вариант (другой оттенок и искры), dark — омрачённый Навью
  function spirit(sid, shiny, dark) {
    if (!cache[sid]) cache[sid] = build(SP[sid]);
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
    const ids = { b: '__ID__b', a: '__ID__a', f: '__ID__f' };
    const all = [...(L.back || []), ...(L.feats || [])];
    const back = BACK.filter(k => all.includes(k));
    const front = all.filter(k => !BACK.includes(k));
    const scale = sp.stage === 3 ? 1 : sp.stage === 2 ? 0.9 : (sp.evo ? 0.78 : 0.92);
    const stroke = shade(L.c2, -0.45);
    let s = `<svg class="art" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><radialGradient id="${ids.b}" cx=".36" cy=".28" r=".85"><stop offset="0" stop-color="${shade(L.c1, 0.15)}"/><stop offset=".55" stop-color="${L.c1}"/><stop offset="1" stop-color="${L.c2}"/></radialGradient>` +
      `<radialGradient id="${ids.a}"><stop offset=".3" stop-color="${L.c3}" stop-opacity=".55"/><stop offset="1" stop-color="${L.c3}" stop-opacity="0"/></radialGradient>` +
      `<filter id="${ids.f}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3"/></filter></defs>` +
      `<ellipse class="art-shadow" cx="100" cy="180" rx="${50 * scale}" ry="${9 * scale}" fill="#000" opacity=".28"/>` +
      `<g class="art-body" transform="translate(100 176) scale(${scale}) translate(-100 -176)">`;
    back.forEach(k => { s += feat(k, L, sh, ids); });
    s += `<path d="${sh.d}" fill="url(#${ids.b})" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>`;
    if (sh.detail) s += sh.detail;
    if (sh.head) s += `<path d="${sh.head}" fill="url(#${ids.b})" stroke="${stroke}" stroke-width="3"/>`;
    const hy = sh.head ? sh.face - 16 : sh.top + (sh.face - sh.top) * 0.45;
    s += `<ellipse cx="${100 - (sh.head ? sh.hw : sh.bw) * 0.42}" cy="${hy}" rx="${sh.head ? 7 : 12}" ry="${sh.head ? 4.5 : 7}" transform="rotate(-35 ${100 - (sh.head ? sh.hw : sh.bw) * 0.42} ${hy})" fill="#fff" opacity=".35"/>`;
    s += face(L, sh, ids.f);
    front.forEach(k => { s += feat(k, L, sh, ids); });
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
      case 'grivna': return `<svg class="art" viewBox="0 0 100 100"><path d="M14 58 L30 36 H70 L86 58 L70 80 H30Z" fill="#e2e8f0" stroke="#64748b" stroke-width="3.5" stroke-linejoin="round"/><path d="M30 36 L40 58 H60 L70 36 M40 58 L30 80 M60 58 L70 80" stroke="#94a3b8" stroke-width="2.5" fill="none"/><path d="M22 50 L32 40 H48" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/><circle cx="50" cy="58" r="6" fill="#fbbf24" stroke="#92400e" stroke-width="2"/></svg>`;
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
  function springIcon(used, invaded) {
    const w = invaded ? '#c026d3' : used ? '#a78bfa' : '#5eead4', id = 'sp' + (++seq);
    return `<svg viewBox="0 0 80 110" class="art"><defs><linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${w}" stop-opacity=".8"/><stop offset="1" stop-color="${w}" stop-opacity="0"/></linearGradient></defs>` +
      `<rect class="beam" x="26" y="0" width="28" height="80" fill="url(#${id})"/>` +
      `<ellipse cx="40" cy="92" rx="30" ry="12" fill="#57534e" stroke="#292524" stroke-width="3"/>` +
      `<ellipse cx="40" cy="88" rx="30" ry="12" fill="#a8a29e" stroke="#292524" stroke-width="3"/>` +
      `<ellipse cx="40" cy="87" rx="21" ry="7" fill="${w}"/><ellipse cx="34" cy="85" rx="6" ry="2" fill="#fff" opacity=".7"/>` +
      `<circle class="art-float" cx="30" cy="60" r="3" fill="${w}"/><circle class="art-float" style="animation-delay:.7s" cx="50" cy="48" r="2.5" fill="${w}"/>` +
      (invaded ? `<g class="art-flicker" fill="#3b0764" opacity=".85"><path d="M14 92 C8 70 24 62 20 40 C34 58 36 76 30 92Z"/><path d="M66 92 C72 70 56 62 60 40 C46 58 44 76 50 92Z"/></g>` +
        `<ellipse cx="34" cy="30" rx="4" ry="2.6" fill="#f43f5e"/><ellipse cx="46" cy="30" rx="4" ry="2.6" fill="#f43f5e"/>` : '') + `</svg>`;
  }
  function riftIcon(tier) {
    const col = tier === 3 ? '#fbbf24' : tier === 2 ? '#f472b6' : '#a78bfa', id = 'rf' + (++seq);
    return `<svg viewBox="0 0 100 100" class="art"><defs><radialGradient id="${id}"><stop offset="0" stop-color="#0b0418"/><stop offset=".55" stop-color="#3b0764"/><stop offset=".85" stop-color="${col}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs>` +
      `<ellipse cx="50" cy="88" rx="36" ry="9" fill="#000" opacity=".3"/>` +
      `<g class="art-spin"><ellipse cx="50" cy="50" rx="44" ry="44" fill="url(#${id})"/>` +
      `<path d="M50 10 Q80 20 78 50 M90 50 Q80 80 50 78 M50 90 Q20 80 22 50 M10 50 Q20 20 50 22" stroke="${col}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/></g></svg>`;
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
  function shrineIcon(tier, won) {
    const flag = won ? '#fbbf24' : tier === 3 ? '#ef4444' : tier === 2 ? '#a78bfa' : '#5eead4';
    return `<svg viewBox="0 -6 80 116" class="art">` +
      (won ? `<circle class="art-aura" cx="40" cy="50" r="38" fill="#fbbf24" opacity=".35"/>` : '') +
      `<ellipse cx="40" cy="100" rx="30" ry="8" fill="#000" opacity=".3"/>` +
      `<path d="M14 100 L20 88 H60 L66 100Z" fill="#78716c" stroke="#292524" stroke-width="2"/>` +
      `<rect x="27" y="22" width="26" height="68" rx="8" fill="#a16207" stroke="#451a03" stroke-width="2.5"/>` +
      `<path d="M27 40 H53 M27 62 H53" stroke="#451a03" stroke-width="2"/>` +
      `<circle cx="34" cy="31" r="2.6" fill="#1c1917"/><circle cx="46" cy="31" r="2.6" fill="#1c1917"/><path d="M35 36 Q40 38 45 36" stroke="#1c1917" stroke-width="2" fill="none"/>` +
      `<path d="M33 48 L40 56 L47 48 M40 56 V60" stroke="${flag}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
      `<path d="M33 70 L40 78 L47 70 M36 82 H44" stroke="#451a03" stroke-width="2" fill="none"/>` +
      `<path d="M24 22 L40 8 L56 22Z" fill="#57534e" stroke="#292524" stroke-width="2"/>` +
      `<path d="M40 8 V-2" stroke="#292524" stroke-width="2"/><path class="art-sway" d="M40 -2 L58 3 L40 8Z" fill="${flag}"/>` +
      `</svg>`;
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
    star: '<path d="M50 75l2.6 5.4 5.9.9-4.3 4.1 1 5.9L50 88.5l-5.2 2.8 1-5.9-4.3-4.1 5.9-.9z" fill="#fde047" stroke="#a16207" stroke-width="1"/>',
  };
  function avatar(look = { cloak: '#6d28d9', eyes: '#5eead4', emblem: 'charm' }) {
    return `<svg viewBox="0 0 100 100" class="art"><circle cx="50" cy="50" r="48" fill="#241a45"/>` +
      `<path d="M50 14 C70 14 80 34 80 54 L84 96 H16 L20 54 C20 34 30 14 50 14Z" fill="${look.cloak}"/>` +
      `<path d="M50 14 C70 14 80 34 80 54 L84 96 H70 L66 58 C66 40 60 26 50 22Z" fill="#000" opacity=".18"/>` +
      `<path d="M50 22 C64 22 70 38 70 52 C70 62 62 70 50 70 C38 70 30 62 30 52 C30 38 36 22 50 22Z" fill="#150d2b"/>` +
      `<ellipse cx="42" cy="50" rx="4" ry="2.6" fill="${look.eyes}"/><ellipse cx="58" cy="50" rx="4" ry="2.6" fill="${look.eyes}"/>` +
      (EMBLEM[look.emblem] || EMBLEM.charm) + `</svg>`;
  }

  return { spirit, of, img, imgOf, amulet, charm, item, cocoon, elIcon, springIcon, riftIcon, shade, wxIcon, moonIcon, medal, shrineIcon, guardian, avatar };
})();
