'use strict';
/* 4.28: Разломы и Святилища других мифологий — значки (интерфейс тот же, что у славянских: art.js riftIcon / shrineIcon) */
const PLACE_ART = (() => {
  // затемнение / осветление цвета: amt < 0 — темнее, > 0 — светлее
  const sh = (hex, amt) => {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };
  const f1 = v => Math.round(v * 100) / 100;

  /* ---------- общее для Разломов ---------- */
  // воронка (как у славянского: чёрная сердцевина → фиолетовая мгла → цвет ступени) и ореол цвета ступени
  const riftDefs = (id, col) =>
    `<radialGradient id="${id}v"><stop offset="0" stop-color="#05010d"/><stop offset=".45" stop-color="#2e0a5c"/><stop offset=".8" stop-color="${col}" stop-opacity=".9"/><stop offset="1" stop-color="${col}" stop-opacity=".35"/></radialGradient>` +
    `<radialGradient id="${id}h"><stop offset=".55" stop-color="${col}" stop-opacity=".5"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
  const riftBack = id => `<ellipse cx="50" cy="92" rx="36" ry="7" fill="#000" opacity=".35"/><circle class="art-aura" cx="50" cy="50" r="50" fill="url(#${id}h)"/>`;
  // закрученные рукава воронки радиуса r вокруг (cx, cy) — вращаются
  const arms = (cx, cy, r, col) => {
    const s = r / 30;
    let a = '';
    for (let i = 0; i < 4; i++) a += `<path d="M${cx} ${cy} c${f1(10 * s)} ${f1(-6 * s)} ${f1(16 * s)} ${f1(-18 * s)} ${f1(8 * s)} ${f1(-28 * s)}" transform="rotate(${i * 90} ${cx} ${cy})" stroke="${col}" stroke-width="${f1(Math.max(1.6, 3 * s) - i * 0.15)}" fill="none" stroke-linecap="round" opacity=".88"/>`;
    return `<g class="art-spin">${a}<circle cx="${cx}" cy="${cy}" r="${f1(Math.max(3, 6 * s))}" fill="#fff" opacity=".88"/></g>`;
  };
  // спираль (кельтская) из полуокружностей
  const spiral = (cx, cy, k, flip) => {
    const sw = flip ? 0 : 1, d = flip ? -1 : 1;
    return `M${cx} ${cy} A${k / 2} ${k / 2} 0 0 ${sw} ${f1(cx + d * k)} ${cy} A${k} ${k} 0 0 ${sw} ${f1(cx - d * k)} ${cy} A${1.5 * k} ${1.5 * k} 0 0 ${sw} ${f1(cx + d * 2 * k)} ${cy} A${2 * k} ${2 * k} 0 0 ${sw} ${f1(cx - d * 2 * k)} ${cy}`;
  };
  // трискель: три спирали, повёрнутые на 120°
  const triskele = (cx, cy, k, col, w) => [0, 120, 240].map(a =>
    `<path d="${spiral(cx, cy - 2.2 * k, k)}" transform="rotate(${a} ${cx} ${cy})" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`).join('');

  /* ---------- общее для Святилищ ---------- */
  const shrineDefs = (id, fire, won) =>
    `<radialGradient id="${id}g"><stop offset="0" stop-color="${fire}" stop-opacity="${won ? 0.65 : 0.5}"/><stop offset="1" stop-color="${fire}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="${id}f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${fire}"/><stop offset=".7" stop-color="${sh(fire, 0.55)}"/><stop offset="1" stop-color="#fff"/></linearGradient>`;
  const shrineBack = (id, won, cy = 70) => `<circle class="art-aura" cx="40" cy="${cy}" r="${won ? 44 : 36}" fill="url(#${id}g)"/><ellipse cx="40" cy="103" rx="34" ry="6" fill="#000" opacity=".35"/>`;
  // пламя: основание в (x, y), s — масштаб (1 = как у славянского, высота 28)
  const flame = (id, x, y, s = 1) => `<g class="art-flicker"><g transform="translate(${x} ${y}) scale(${s})">` +
    `<path d="M0 -28 C7 -18 11 -12 8 -4 C6 2 -6 2 -8 -4 C-11 -12 -6 -16 -4 -22 C-2 -17 0 -18 0 -28Z" fill="url(#${id}f)"/>` +
    `<path d="M0 -16 C4 -11 5 -7 3 -3 C1 0 -2 0 -3 -3 C-5 -7 -2 -10 0 -16Z" fill="#fffbeb" opacity=".9"/></g></g>`;
  const sparks = (fire, a, b) => `<circle class="art-float" cx="${a[0]}" cy="${a[1]}" r="1.5" fill="${fire}"/><circle class="art-float" style="animation-delay:.8s" cx="${b[0]}" cy="${b[1]}" r="1.2" fill="#fff" opacity=".85"/>`;
  // чаша-жаровня на треноге: центр x, верх чаши y
  const brazier = (x, y, w = 9) => `<path d="M${x - w * 0.55} ${y + 3} L${x - w * 0.8} ${y + 16} M${x + w * 0.55} ${y + 3} L${x + w * 0.8} ${y + 16} M${x} ${y + 4} V${y + 16}" stroke="#1c1917" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M${x - w * 0.55} ${y + 3} L${x - w * 0.8} ${y + 16} M${x + w * 0.55} ${y + 3} L${x + w * 0.8} ${y + 16}" stroke="#b45309" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M${x - w} ${y} H${x + w} Q${x + w * 0.8} ${y + 6} ${x} ${y + 6} Q${x - w * 0.8} ${y + 6} ${x - w} ${y}Z" fill="#b45309" stroke="#1c1917" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M${x - w + 1.5} ${y + 1.6} H${x + w - 1.5}" stroke="#fcd34d" stroke-width="1" opacity=".8"/>`;

  return {
    greek: {
      // Врата Аида: скала, в ней мраморный портик — фронтон, антаблемент с меандром, две каннелированные колонны на ступенях; в проёме — воронка подземного мира
      rift(tier, col, id) {
        const colm = x => `<rect x="${x}" y="40" width="12" height="44" fill="url(#${id}m)" stroke="#44403c" stroke-width="1.6"/>` +
          `<path d="M${x + 3} 42V82M${x + 6} 42V82M${x + 9} 42V82" stroke="#78716c" stroke-width=".9" opacity=".7"/>` +
          `<path d="M${x - 2} 36h16v4h-16z" fill="url(#${id}m)" stroke="#44403c" stroke-width="1.4" stroke-linejoin="round"/>` +
          `<circle cx="${x - 1}" cy="38" r="1.8" fill="#e7e5e4" stroke="#44403c" stroke-width="1"/><circle cx="${x + 13}" cy="38" r="1.8" fill="#e7e5e4" stroke="#44403c" stroke-width="1"/>` +
          `<path d="M${x - 1} 84h14v3h-14z" fill="#d6d3d1" stroke="#44403c" stroke-width="1.2"/>`;
        let key = '';
        for (let x = 17; x < 82; x += 8) key += `M${x} 33 v-4 h5 v2.4 h-2.4`;
        return `<svg viewBox="0 0 100 100" class="art"><defs>${riftDefs(id, col)}` +
          `<linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78716c"/><stop offset="1" stop-color="#292524"/></linearGradient>` +
          `<linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d6d3d1"/><stop offset=".45" stop-color="#fafaf9"/><stop offset="1" stop-color="#a8a29e"/></linearGradient>` +
          `<linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fafaf9"/><stop offset="1" stop-color="#a8a29e"/></linearGradient></defs>` +
          riftBack(id) +
          // скала
          `<path d="M4 91 C1 72 7 54 15 44 C19 30 30 16 42 14 L50 9 L60 14 C72 17 82 30 86 44 C94 54 99 72 96 91Z" fill="url(#${id}r)" stroke="#1c1917" stroke-width="2" stroke-linejoin="round"/>` +
          `<path d="M12 60 L20 56 M84 58 L91 64 M26 22 L32 26 M72 22 L66 27 M8 78 L14 76 M92 80 L86 77" stroke="#1c1917" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>` +
          // проём с воронкой
          `<rect x="30" y="40" width="40" height="46" fill="url(#${id}v)"/>` + arms(50, 63, 17, col) +
          `<rect x="30" y="40" width="40" height="46" fill="none" stroke="#1c1917" stroke-width="1.6"/>` +
          colm(18) + colm(70) +
          // ступени
          `<path d="M12 87h76v3.5H12z" fill="url(#${id}p)" stroke="#44403c" stroke-width="1.4"/><path d="M8 90.5h84v4H8z" fill="#a8a29e" stroke="#44403c" stroke-width="1.4"/>` +
          // антаблемент с меандром и фронтон
          `<path d="M12 27h76v9H12z" fill="url(#${id}p)" stroke="#44403c" stroke-width="1.6"/>` +
          `<path class="art-blink" d="${key}" stroke="${col}" stroke-width="1.3" fill="none" stroke-linejoin="round"/>` +
          `<path d="M9 27 L50 8 L91 27Z" fill="url(#${id}p)" stroke="#44403c" stroke-width="1.8" stroke-linejoin="round"/>` +
          `<path d="M19 24.5 L50 11.5 L81 24.5Z" fill="#a8a29e" opacity=".55"/>` +
          `<circle cx="50" cy="19" r="3.4" fill="${col}" stroke="#44403c" stroke-width="1.2"/><circle cx="50" cy="19" r="1.3" fill="#fff" opacity=".9"/>` +
          `</svg>`;
      },
      // Храм: фронтон с акротериями, антаблемент, четыре колонны на трёх ступенях, внутри тьма целлы; перед храмом алтарь со священным огнём
      shrine(tier, fire, won, id) {
        const colm = x => `<rect x="${x - 4}" y="46" width="8" height="36" fill="url(#${id}m)" stroke="#44403c" stroke-width="1.3"/>` +
          `<path d="M${x - 1.4} 48V80M${x + 1.4} 48V80" stroke="#78716c" stroke-width=".7" opacity=".7"/>` +
          `<path d="M${x - 5.5} 42.5h11v3.5h-11z" fill="#e7e5e4" stroke="#44403c" stroke-width="1.1"/>`;
        return `<svg viewBox="0 -6 80 116" class="art"><defs>${shrineDefs(id, fire, won)}` +
          `<linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d6d3d1"/><stop offset=".45" stop-color="#fafaf9"/><stop offset="1" stop-color="#a8a29e"/></linearGradient>` +
          `<linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fafaf9"/><stop offset="1" stop-color="#a8a29e"/></linearGradient>` +
          `<radialGradient id="${id}c" cx=".5" cy=".8" r=".7"><stop offset="0" stop-color="${sh(fire, -0.35)}"/><stop offset="1" stop-color="#1c1917"/></radialGradient></defs>` +
          shrineBack(id, won) +
          // целла (тьма за колоннами)
          `<rect x="11" y="44" width="58" height="38" fill="url(#${id}c)"/>` +
          colm(15) + colm(29) + colm(51) + colm(65) +
          // ступени
          `<path d="M9 82h62v5H9z" fill="url(#${id}p)" stroke="#44403c" stroke-width="1.4"/><path d="M6 87h68v5H6z" fill="#d6d3d1" stroke="#44403c" stroke-width="1.4"/><path d="M3 92h74v6H3z" fill="#a8a29e" stroke="#44403c" stroke-width="1.4"/>` +
          // антаблемент: триглифы
          `<path d="M7 33h66v9.5H7z" fill="url(#${id}p)" stroke="#44403c" stroke-width="1.5"/>` +
          `<path d="M13 36v5M24 36v5M35 36v5M45 36v5M56 36v5M67 36v5" stroke="#78716c" stroke-width="2"/>` +
          // фронтон с акротериями
          `<path d="M4 33 L40 13 L76 33Z" fill="url(#${id}p)" stroke="#44403c" stroke-width="1.7" stroke-linejoin="round"/>` +
          `<path d="M13 30.5 L40 16 L67 30.5Z" fill="#a8a29e" opacity=".55"/>` +
          `<path d="M40 13 l-3 -5 3 -3 3 3z M4 33 l-2 -5 5 1z M76 33 l2 -5 -5 1z" fill="#e7e5e4" stroke="#44403c" stroke-width="1"/>` +
          `<circle cx="40" cy="25" r="3" fill="${fire}" stroke="#44403c" stroke-width="1"/>` +
          // алтарь с огнём
          flame(id, 40, 75, 1.05) +
          `<path d="M28 74h24v3.5H28z" fill="#e7e5e4" stroke="#44403c" stroke-width="1.3"/>` +
          `<path d="M30 77.5h20v14H30z" fill="url(#${id}m)" stroke="#44403c" stroke-width="1.3"/>` +
          `<path d="M33 81h14M33 88h14" stroke="#78716c" stroke-width="1"/><path d="M28 91.5h24v3H28z" fill="#d6d3d1" stroke="#44403c" stroke-width="1.2"/>` +
          sparks(fire, [31, 52], [49, 47]) +
          `</svg>`;
      },
    },

    norse: {
      // Разлом Гиннунгагап: ледник с зубчатыми пиками, посередине рваная трещина-бездна с воронкой и сполохами северного сияния; по бокам рунные камни в снегу
      rift(tier, col, id) {
        const stone = (d, x) => `<path d="${d}" fill="url(#${id}s)" stroke="#1c1917" stroke-width="1.8" stroke-linejoin="round"/>` +
          `<path class="art-blink" style="animation-delay:${x > 50 ? 0.8 : 0}s" d="M${x} 66 v12 M${x} 68 l3.5 2.5 M${x} 72 l3.5 2.5 M${x} 82 l-2.5 3 l2.5 3 l2.5 -3 l-2.5 -3" stroke="${col}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
        return `<svg viewBox="0 0 100 100" class="art"><defs>${riftDefs(id, col)}` +
          `<linearGradient id="${id}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0f9ff"/><stop offset=".45" stop-color="#7dd3fc"/><stop offset="1" stop-color="#1e3a8a"/></linearGradient>` +
          `<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#57534e"/><stop offset=".45" stop-color="#a8a29e"/><stop offset="1" stop-color="#44403c"/></linearGradient></defs>` +
          riftBack(id) +
          // ледник
          `<path d="M5 90 L7 60 L15 44 L22 49 L30 20 L39 30 L50 6 L61 30 L70 20 L78 49 L85 44 L93 60 L95 90Z" fill="url(#${id}i)" stroke="#0c1a3a" stroke-width="2" stroke-linejoin="round"/>` +
          `<path d="M30 20 L33 40 M50 6 L47 22 M70 20 L67 40 M15 44 L18 62 M85 44 L82 62" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>` +
          // трещина-бездна
          `<path d="M50 16 L57 27 L54 33 L66 44 L63 51 L71 62 L60 72 L62 80 L50 90 L40 80 L43 72 L29 62 L37 51 L34 44 L46 33 L43 26Z" fill="url(#${id}v)"/>` +
          // северное сияние в бездне
          `<path class="art-blink" d="M40 44 Q46 38 51 43 T62 41 M36 54 Q44 48 51 53 T66 52" stroke="#34d399" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".75"/>` +
          arms(50, 62, 13, col) +
          `<path d="M50 16 L57 27 L54 33 L66 44 L63 51 L71 62 L60 72 L62 80 L50 90 L40 80 L43 72 L29 62 L37 51 L34 44 L46 33 L43 26Z" fill="none" stroke="#0c1a3a" stroke-width="2.2" stroke-linejoin="round"/>` +
          `<path d="M57 27 L54 33 L66 44 M29 62 L37 51" stroke="#e0f2fe" stroke-width="1.2" fill="none" opacity=".8"/>` +
          // рунные камни
          stone('M5 94 L6 64 Q9 55 15 56 Q22 58 23 66 L22 94Z', 12) + stone('M95 94 L94 64 Q91 55 85 56 Q78 58 77 66 L78 94Z', 85) +
          `<path d="M6 63 Q10 55 15 56 Q21 57 23 64 Q16 60 6 63Z M94 63 Q90 55 85 56 Q79 57 77 64 Q84 60 94 63Z" fill="#f8fafc" stroke="#94a3b8" stroke-width=".8"/>` +
          // снежный наст
          `<path d="M2 94 Q14 88 28 91 Q40 87 50 91 Q62 87 72 91 Q86 88 98 94 Q50 98 2 94Z" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.2"/>` +
          `</svg>`;
      },
      // Рунный камень: высокий резной камень на кургане — красный плетёный змей по краю, светящиеся руны; перед ним чаша-огонь на треноге
      shrine(tier, fire, won, id) {
        return `<svg viewBox="0 -6 80 116" class="art"><defs>${shrineDefs(id, fire, won)}` +
          `<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#57534e"/><stop offset=".4" stop-color="#b8b2ad"/><stop offset="1" stop-color="#44403c"/></linearGradient>` +
          `<linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#65a30d"/><stop offset=".5" stop-color="#3f6212"/><stop offset="1" stop-color="#422006"/></linearGradient></defs>` +
          shrineBack(id, won, 60) +
          // курган
          `<path d="M2 100 Q8 78 40 76 Q72 78 78 100Z" fill="url(#${id}k)" stroke="#1a2e05" stroke-width="1.8" stroke-linejoin="round"/>` +
          `<path d="M12 88 l2 -4 1 4 M64 88 l2 -4 1 4 M22 81 l2 -3 1 3 M56 81 l1.5 -3 1 3" stroke="#a3e635" stroke-width="1" fill="none" stroke-linecap="round"/>` +
          // камень
          `<path d="M21 84 L19 28 Q19 6 40 4 Q61 6 61 28 L59 84Z" fill="url(#${id}s)" stroke="#1c1917" stroke-width="2" stroke-linejoin="round"/>` +
          // плетёный змей по краю (красная краска)
          `<path d="M26 82 L24.5 30 Q24.5 11 40 9.5 Q55.5 11 55.5 30 L54 70 Q53 78 46 76 Q40 74 36 78" fill="none" stroke="#1c1917" stroke-width="5.4" stroke-linecap="round"/>` +
          `<path d="M26 82 L24.5 30 Q24.5 11 40 9.5 Q55.5 11 55.5 30 L54 70 Q53 78 46 76 Q40 74 36 78" fill="none" stroke="#dc2626" stroke-width="3.2" stroke-linecap="round"/>` +
          `<path d="M26 82 L24.5 30 Q24.5 11 40 9.5 Q55.5 11 55.5 30 L54 70 Q53 78 46 76 Q40 74 36 78" fill="none" stroke="#fca5a5" stroke-width="3.2" stroke-dasharray="1.3 3.2" opacity=".7"/>` +
          `<path d="M24.8 40 l1.5 3 M24.8 52 l1.5 3 M25.2 64 l1.5 3 M55.2 40 l-1.5 3 M55 52 l-1.5 3 M31 14 l2 2 M48 14 l-2 2" stroke="#1c1917" stroke-width="1" opacity=".6"/>` +
          `<path d="M36 78 l-5 -2.4 l1.4 4.4z" fill="#dc2626" stroke="#1c1917" stroke-width="1.1" stroke-linejoin="round"/>` +
          // руны
          `<g class="art-blink"><path d="M34 20 v12 M34 22 l5 3 M34 26 l5 3 M44 20 v12 M44 20 l3.5 3 -3.5 3 3.5 6 M37 38 l3 -4 3 4 -3 4z M40 42 v6 M34 52 l6 6 6 -6 M40 52 v14" stroke="${fire}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>` +
          // чаша с огнём
          flame(id, 40, 82, 0.95) + brazier(40, 81, 11) +
          sparks(fire, [30, 58], [50, 52]) +
          `</svg>`;
      },
    },

    celtic: {
      // Холм сидов: зелёный курган, в нём арка из камней — вход в Иной мир, из которого льётся волшебный свет, в проёме воронка; над входом трискель, по бокам менгиры со спиралями
      rift(tier, col, id) {
        const arch = 'M33.5 91 V58 Q33.5 41.5 50 41.5 Q66.5 41.5 66.5 58 V91';
        return `<svg viewBox="0 0 100 100" class="art"><defs>${riftDefs(id, col)}` +
          `<linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86efac"/><stop offset=".45" stop-color="#16a34a"/><stop offset="1" stop-color="#14532d"/></linearGradient>` +
          `<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#57534e"/><stop offset=".45" stop-color="#b8b2ad"/><stop offset="1" stop-color="#44403c"/></linearGradient>` +
          `<linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".9"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>` +
          riftBack(id) +
          // холм
          `<path d="M2 91 C3 58 24 22 50 20 C76 22 97 58 98 91Z" fill="url(#${id}k)" stroke="#052e16" stroke-width="2" stroke-linejoin="round"/>` +
          `<path d="M14 60 l2 -5 2 5 M82 60 l2 -5 2 5 M24 38 l2 -4 2 4 M72 38 l2 -4 2 4 M8 80 l2 -5 2 5 M88 80 l2 -5 2 5" stroke="#bbf7d0" stroke-width="1.2" fill="none" stroke-linecap="round"/>` +
          `<g class="art-blink">${triskele(50, 29, 1.9, col, 1.1)}</g>` +
          // волшебный свет из входа
          `<path class="art-aura" d="M37 89 L63 89 L90 97 L10 97Z" fill="url(#${id}l)"/>` +
          // проём с воронкой
          `<path d="M37 90 V58 Q37 45 50 45 Q63 45 63 58 V90Z" fill="url(#${id}v)"/>` + arms(50, 68, 12, col) +
          // арка из камней
          `<path d="${arch}" fill="none" stroke="#1c1917" stroke-width="10.5"/><path d="${arch}" fill="none" stroke="url(#${id}s)" stroke-width="7"/>` +
          `<path d="${arch}" fill="none" stroke="#1c1917" stroke-width="7" stroke-dasharray="1.2 7.3" opacity=".8"/>` +
          // менгиры со спиралями
          `<path d="M13 93 L14 66 Q18 59 23 63 L25 93Z M87 93 L86 66 Q82 59 77 63 L75 93Z" fill="url(#${id}s)" stroke="#1c1917" stroke-width="1.8" stroke-linejoin="round"/>` +
          `<path class="art-blink" style="animation-delay:.6s" d="${spiral(19, 76, 1.7)} ${spiral(81, 76, 1.7, true)}" stroke="${col}" stroke-width="1" fill="none" stroke-linecap="round"/>` +
          `<circle class="art-float" cx="30" cy="62" r="1.8" fill="${col}"/><circle class="art-float" style="animation-delay:.9s" cx="71" cy="56" r="1.5" fill="#fff" opacity=".85"/>` +
          `</svg>`;
      },
      // Каменный круг: на травяном круге — трилит (два камня под перемычкой) с трискелем и спиралями, по бокам стоячие камни, в центре огонь
      shrine(tier, fire, won, id) {
        const st = (d) => `<path d="${d}" fill="url(#${id}s)" stroke="#1c1917" stroke-width="1.7" stroke-linejoin="round"/>`;
        return `<svg viewBox="0 -6 80 116" class="art"><defs>${shrineDefs(id, fire, won)}` +
          `<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#57534e"/><stop offset=".4" stop-color="#b8b2ad"/><stop offset="1" stop-color="#44403c"/></linearGradient>` +
          `<linearGradient id="${id}d" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#44403c"/><stop offset=".4" stop-color="#8a847e"/><stop offset="1" stop-color="#292524"/></linearGradient>` +
          `<radialGradient id="${id}k" cy=".35"><stop offset="0" stop-color="#4ade80"/><stop offset="1" stop-color="#166534"/></radialGradient></defs>` +
          shrineBack(id, won, 64) +
          // травяной круг
          `<ellipse cx="40" cy="92" rx="37" ry="10" fill="url(#${id}k)" stroke="#052e16" stroke-width="1.8"/>` +
          // дальние камни
          `<path d="M6 84 L7 64 Q10 60 14 63 L14 84Z M74 84 L73 64 Q70 60 66 63 L66 84Z" fill="url(#${id}d)" stroke="#1c1917" stroke-width="1.5" stroke-linejoin="round"/>` +
          // трилит
          st('M20 86 L21 30 L31 29 L31 86Z') + st('M60 86 L59 30 L49 29 L49 86Z') +
          st('M14 31 L15 17 Q40 14 65 17 L66 31 Q40 28 14 31Z') +
          `<g class="art-blink">${triskele(40, 22.8, 1.45, fire, .85)}<path d="${spiral(26, 50, 1.6)} ${spiral(54, 50, 1.6, true)}" stroke="${fire}" stroke-width="1" fill="none" stroke-linecap="round"/></g>` +
          // огонь в каменном очаге
          flame(id, 40, 88, 1.05) +
          `<path d="M29 90 Q31 86 34 88 Q37 85 40 88 Q43 85 46 88 Q49 86 51 90 Q40 93 29 90Z" fill="#78716c" stroke="#1c1917" stroke-width="1.3" stroke-linejoin="round"/>` +
          // ближние камни
          st('M2 99 L3 70 Q7 64 12 67 L14 99Z') + st('M78 99 L77 70 Q73 64 68 67 L66 99Z') +
          `<path d="${spiral(8, 82, 1.4)} ${spiral(72, 82, 1.4, true)}" stroke="${fire}" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".9"/>` +
          sparks(fire, [33, 58], [47, 52]) +
          `</svg>`;
      },
    },

    egypt: {
      // Врата Дуата: пилон — две башни-трапеции с карнизом и знаками анха, между ними ворота под солнечным диском с крыльями; в проёме — тёмная воронка
      rift(tier, col, id) {
        const ankh = x => `<path d="M${x} 58 v12 M${x - 3.5} 61 h7" stroke="${col}" stroke-width="1.8" stroke-linecap="round" fill="none"/><ellipse cx="${x}" cy="54.5" rx="2.4" ry="3.2" fill="none" stroke="${col}" stroke-width="1.6"/>`;
        return `<svg viewBox="0 0 100 100" class="art"><defs>${riftDefs(id, col)}` +
          `<linearGradient id="${id}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a16207"/><stop offset=".45" stop-color="#fcd9a0"/><stop offset="1" stop-color="#b7823f"/></linearGradient>` +
          `<linearGradient id="${id}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#b45309"/></linearGradient></defs>` +
          riftBack(id) +
          // башни пилона
          `<path d="M3 91 L12 18 L40 18 L42 91Z" fill="url(#${id}t)" stroke="#3b2106" stroke-width="2" stroke-linejoin="round"/>` +
          `<path d="M97 91 L88 18 L60 18 L58 91Z" fill="url(#${id}t)" stroke="#3b2106" stroke-width="2" stroke-linejoin="round"/>` +
          `<path d="M9 18 L10 11 H42 L43 18Z M91 18 L90 11 H58 L57 18Z" fill="url(#${id}d)" stroke="#3b2106" stroke-width="1.6" stroke-linejoin="round"/>` +
          `<path d="M11 15 H41 M89 15 H59" stroke="#0e7490" stroke-width="1.6"/>` +
          `<path d="M16 26 h8 M17 30 q3 -2.5 6 0 M18 34 h6 v3 M20 40 v5 M17 42.5 h6 M76 26 h8 M77 30 q3 -2.5 6 0 M76 34 h6 v3 M80 40 v5 M77 42.5 h6 M15 78 h10 M16 82 l3 -3 3 3 3 -3 M75 78 h10 M76 82 l3 -3 3 3 3 -3" stroke="#7c4a12" stroke-width="1.3" opacity=".8"/>` +
          `<g class="art-blink">${ankh(21)}${ankh(79)}</g>` +
          // ворота: проём с воронкой
          `<path d="M36 91 V42 H64 V91Z" fill="url(#${id}v)"/>` + arms(50, 67, 13, col) +
          `<path d="M36 91 V42 H64 V91" fill="none" stroke="#3b2106" stroke-width="1.8"/>` +
          `<path d="M32 91 V40 H36 V91Z M68 91 V40 H64 V91Z" fill="url(#${id}t)" stroke="#3b2106" stroke-width="1.6"/>` +
          // перемычка с карнизом и крылатым диском
          `<path d="M28 42 V32 H72 V42Z" fill="url(#${id}t)" stroke="#3b2106" stroke-width="1.8"/>` +
          `<path d="M26 32 L27 26 H73 L74 32Z" fill="url(#${id}d)" stroke="#3b2106" stroke-width="1.6" stroke-linejoin="round"/>` +
          `<path d="M50 37 C44 33 36 34 29 33 C34 36 40 39 50 40 C60 39 66 36 71 33 C64 34 56 33 50 37Z" fill="${col}" stroke="#3b2106" stroke-width="1.1" stroke-linejoin="round"/>` +
          `<path d="M34 35 l4 2 M40 35 l3 2.5 M66 35 l-4 2 M60 35 l-3 2.5" stroke="#3b2106" stroke-width=".8"/>` +
          `<circle cx="50" cy="36.5" r="3.6" fill="#fbbf24" stroke="#3b2106" stroke-width="1.2"/><circle cx="49" cy="35.5" r="1.1" fill="#fff" opacity=".85"/>` +
          // песок у подножия
          `<path d="M1 93 Q20 88 36 91 H64 Q80 88 99 93 Q50 97 1 93Z" fill="#e7c27d" stroke="#7c4a12" stroke-width="1.2"/>` +
          `</svg>`;
      },
      // Обелиск: гранитный обелиск с иероглифами (светящийся картуш) и золотым пирамидионом на двухступенчатом постаменте, по бокам огни в чашах на подставках
      shrine(tier, fire, won, id) {
        const stand = x => `<path d="M${x - 3} 97 L${x - 2} 84 H${x + 2} L${x + 3} 97Z" fill="url(#${id}t)" stroke="#3b2106" stroke-width="1.3" stroke-linejoin="round"/>` +
          `<path d="M${x - 7} 78 H${x + 7} Q${x + 6} 84 ${x} 84.5 Q${x - 6} 84 ${x - 7} 78Z" fill="#b45309" stroke="#3b2106" stroke-width="1.4" stroke-linejoin="round"/><path d="M${x - 6} 79.5 H${x + 6}" stroke="#fcd34d" stroke-width="1"/>`;
        return `<svg viewBox="0 -6 80 116" class="art"><defs>${shrineDefs(id, fire, won)}` +
          `<linearGradient id="${id}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a16207"/><stop offset=".45" stop-color="#fcd9a0"/><stop offset="1" stop-color="#b7823f"/></linearGradient>` +
          `<linearGradient id="${id}o" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fbd6a8"/><stop offset=".5" stop-color="#e0a872"/><stop offset=".5" stop-color="#b9783f"/><stop offset="1" stop-color="#7c4a1e"/></linearGradient>` +
          `<linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fef3c7"/><stop offset=".5" stop-color="#fbbf24"/><stop offset=".5" stop-color="#d97706"/><stop offset="1" stop-color="#92400e"/></linearGradient></defs>` +
          shrineBack(id, won, 58) +
          // постамент
          `<path d="M16 92h48v6H16z" fill="url(#${id}t)" stroke="#3b2106" stroke-width="1.5"/><path d="M22 84h36v8H22z" fill="url(#${id}t)" stroke="#3b2106" stroke-width="1.5"/>` +
          `<path d="M26 88h28" stroke="#7c4a12" stroke-width="1" stroke-dasharray="2 2"/>` +
          // обелиск и пирамидион
          `<path d="M30 84 L33 22 H47 L50 84Z" fill="url(#${id}o)" stroke="#3b2106" stroke-width="1.8" stroke-linejoin="round"/>` +
          `<path d="M33 22 L40 8 L47 22Z" fill="url(#${id}a)" stroke="#3b2106" stroke-width="1.6" stroke-linejoin="round"/>` +
          `<path d="M38 13 L36 19" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>` +
          // иероглифы
          `<path d="M37 29 h6 M38 33 q2 -3 4 0 M40 36 v4 M37.5 44 q2.5 -3 5 0 q-2.5 3 -5 0 M36.6 50 h6.8 M37 72 l2 -3 2 3 2 -3 M37 76 h6.4 M38 79 v2 h4 v-2" stroke="#5b3312" stroke-width="1.2" fill="none" stroke-linecap="round"/>` +
          `<g class="art-blink"><rect x="35.6" y="54" width="8.8" height="13" rx="4.2" fill="none" stroke="${fire}" stroke-width="1.5"/><path d="M40 57 v7 M38 59.5 h4" stroke="${fire}" stroke-width="1.4" stroke-linecap="round"/><circle cx="40" cy="56.8" r="1" fill="${fire}"/></g>` +
          // огни в чашах
          stand(11) + stand(69) + flame(id, 11, 79, 0.72) + flame(id, 69, 79, 0.72) +
          sparks(fire, [8, 50], [72, 46]) +
          `</svg>`;
      },
    },

    china: {
      // Небесные врата: красная стена под черепичной крышей с загнутыми концами, круглые «лунные ворота» в золотой кайме, внутри звёздная воронка; внизу — завитки облаков
      rift(tier, col, id) {
        const cloud = (x, y, s, m) => `<g transform="translate(${x} ${y}) scale(${m ? -s : s} ${s})"><path d="M-14 4 Q-16 -3 -9 -4 Q-8 -11 0 -10 Q6 -14 11 -8 Q17 -8 16 -1 Q20 4 14 5Z" fill="#f5f3ff" stroke="#6d28d9" stroke-width="1.4" stroke-linejoin="round"/>` +
          `<path d="M-3 -3 q3 -3 5 0 q1 3 -2 3" fill="none" stroke="#a78bfa" stroke-width="1.2" stroke-linecap="round"/></g>`;
        return `<svg viewBox="0 0 100 100" class="art"><defs>${riftDefs(id, col)}` +
          `<linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef4444"/><stop offset=".6" stop-color="#b91c1c"/><stop offset="1" stop-color="#7f1d1d"/></linearGradient>` +
          `<linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset=".5" stop-color="#0f766e"/><stop offset="1" stop-color="#134e4a"/></linearGradient></defs>` +
          riftBack(id) +
          // стена
          `<path d="M9 86 V26 H91 V86Z" fill="url(#${id}w)" stroke="#3b0a0a" stroke-width="2"/>` +
          `<path d="M9 34 H91" stroke="#fbbf24" stroke-width="1.4" opacity=".85"/>` +
          // крыша
          `<path d="M2 25 Q9 25 13 15 H87 Q91 25 98 25 L92 30 H8Z" fill="url(#${id}r)" stroke="#042f2e" stroke-width="1.8" stroke-linejoin="round"/>` +
          `<path d="M20 17 V28 M30 17 V28 M40 17 V28 M50 17 V28 M60 17 V28 M70 17 V28 M80 17 V28" stroke="#042f2e" stroke-width="1" opacity=".55"/>` +
          `<path d="M11 15 H89" stroke="#042f2e" stroke-width="3.4" stroke-linecap="round"/><path d="M11 14.5 H89" stroke="#5eead4" stroke-width="1.2" stroke-linecap="round"/>` +
          `<path d="M2 25 Q0 21 3 19 M98 25 Q100 21 97 19" stroke="#042f2e" stroke-width="2" fill="none" stroke-linecap="round"/>` +
          // лунные ворота со звёздной воронкой
          `<circle cx="50" cy="60" r="25" fill="url(#${id}v)"/>` +
          `<g class="art-blink" fill="#fff"><circle cx="38" cy="52" r="1"/><circle cx="62" cy="50" r="1.2"/><circle cx="58" cy="72" r=".9"/><circle cx="40" cy="70" r="1.1"/><circle cx="50" cy="42" r=".8"/></g>` +
          arms(50, 60, 18, col) +
          `<circle cx="50" cy="60" r="25" fill="none" stroke="#3b0a0a" stroke-width="6.5"/><circle cx="50" cy="60" r="25" fill="none" stroke="#fbbf24" stroke-width="3.6"/>` +
          `<circle cx="50" cy="60" r="25" fill="none" stroke="#fef3c7" stroke-width="1" stroke-dasharray="3 5" opacity=".9"/>` +
          // облака
          cloud(20, 88, 1, false) + cloud(80, 88, 1, true) + cloud(50, 93, 0.8, false) +
          `</svg>`;
      },
      // Пагода: три яруса красных стен под бирюзовыми загнутыми крышами с золотой каймой, шпиль с кольцами, светящаяся дверь с огоньком, фонари на углах
      shrine(tier, fire, won, id) {
        const roof = (y, hw, h) => `<path d="M${40 - hw} ${y} Q${40 - hw + 5} ${y + 1} ${40 - hw + 9} ${y - h} H${40 + hw - 9} Q${40 + hw - 5} ${y + 1} ${40 + hw} ${y} L${40 + hw - 6} ${y + 3.5} H${40 - hw + 6}Z" fill="url(#${id}r)" stroke="#042f2e" stroke-width="1.6" stroke-linejoin="round"/>` +
          `<path d="M${40 - hw + 6} ${y + 3.2} H${40 + hw - 6}" stroke="#fbbf24" stroke-width="1.2"/>` +
          `<path d="M${40 - hw} ${y} q-2 -3 0 -5 M${40 + hw} ${y} q2 -3 0 -5" stroke="#042f2e" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
        const body = (y, hw, h) => `<path d="M${40 - hw} ${y + h} V${y} H${40 + hw} V${y + h}Z" fill="url(#${id}w)" stroke="#3b0a0a" stroke-width="1.5"/>`;
        const win = (y) => `<rect x="36" y="${y}" width="8" height="6" rx="1" fill="${fire}" stroke="#3b0a0a" stroke-width="1"/><path d="M40 ${y} v6 M36 ${y + 3} h8" stroke="#3b0a0a" stroke-width=".8"/>`;
        const lamp = x => `<path d="M${x} 71.5 V75" stroke="#1c1917" stroke-width="1"/><ellipse cx="${x}" cy="79" rx="3.4" ry="4.2" fill="#dc2626" stroke="#450a0a" stroke-width="1.1"/>` +
          `<ellipse class="art-blink" cx="${x}" cy="79" rx="1.8" ry="2.8" fill="${sh(fire, 0.35)}"/><path d="M${x - 1.6} 75 h3.2 M${x - 1.6} 83.2 h3.2" stroke="#fbbf24" stroke-width="1.2"/>`;
        return `<svg viewBox="0 -6 80 116" class="art"><defs>${shrineDefs(id, fire, won)}` +
          `<linearGradient id="${id}w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7f1d1d"/><stop offset=".4" stop-color="#ef4444"/><stop offset="1" stop-color="#7f1d1d"/></linearGradient>` +
          `<linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset=".5" stop-color="#0f766e"/><stop offset="1" stop-color="#134e4a"/></linearGradient>` +
          `<linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fef3c7"/><stop offset=".5" stop-color="#fbbf24"/><stop offset="1" stop-color="#92400e"/></linearGradient></defs>` +
          shrineBack(id, won, 62) +
          // основание
          `<path d="M8 92h64v6H8z" fill="#a8a29e" stroke="#292524" stroke-width="1.5"/><path d="M8 92h64" stroke="#e7e5e4" stroke-width="1"/>` +
          // ярусы снизу вверх
          body(71, 22, 21) +
          `<path d="M33 92 V80 Q40 73 47 80 V92Z" fill="${sh(fire, -0.45)}" stroke="#3b0a0a" stroke-width="1.4"/>` + flame(id, 40, 91, 0.55) +
          roof(71, 36, 10) + body(51, 17, 17) + win(56) + roof(51, 30, 9) + body(33, 13, 15) + win(36.5) + roof(33, 24, 8) +
          // шпиль
          `<path d="M40 25 V4" stroke="#78350f" stroke-width="3.2" stroke-linecap="round"/><path d="M40 25 V4" stroke="url(#${id}a)" stroke-width="1.8" stroke-linecap="round"/>` +
          `<ellipse cx="40" cy="21" rx="4.5" ry="1.6" fill="#fbbf24" stroke="#78350f" stroke-width="1"/><ellipse cx="40" cy="16" rx="3.6" ry="1.4" fill="#fbbf24" stroke="#78350f" stroke-width="1"/><ellipse cx="40" cy="11" rx="2.8" ry="1.2" fill="#fbbf24" stroke="#78350f" stroke-width="1"/>` +
          `<circle cx="40" cy="3" r="2.6" fill="${fire}" stroke="#78350f" stroke-width="1"/>` +
          lamp(6) + lamp(74) +
          sparks(fire, [30, 44], [52, 30]) +
          `</svg>`;
      },
    },

    aztec: {
      // Врата Миктлана: «солнечный камень» — каменный диск с лучами (расписаны бирюзой и охрой), кольцом знаков дней и точек; в сердцевине воронка
      rift(tier, col, id) {
        let rays = '', glyphs = '', dots = '';
        for (let i = 0; i < 8; i++) rays += `<path d="M44 16 L50 1 L56 16Z" transform="rotate(${i * 45 + 22.5} 50 49)" fill="${i % 2 ? '#0d9488' : '#c2410c'}" stroke="#1c1917" stroke-width="1.6" stroke-linejoin="round"/>`;
        for (let i = 0; i < 20; i++) glyphs += `<rect x="47.6" y="19.4" width="4.8" height="4.4" rx=".6" transform="rotate(${i * 18} 50 49)" fill="${i % 5 === 0 ? col : '#57534e'}" stroke="#1c1917" stroke-width=".7"/>`;
        for (let i = 0; i < 24; i++) dots += `<circle cx="50" cy="27.6" r=".9" transform="rotate(${i * 15} 50 49)"/>`;
        return `<svg viewBox="0 0 100 100" class="art"><defs>${riftDefs(id, col)}` +
          `<radialGradient id="${id}s" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#e7dcc6"/><stop offset=".6" stop-color="#a8977c"/><stop offset="1" stop-color="#5b4d3a"/></radialGradient></defs>` +
          riftBack(id) + rays +
          `<circle cx="50" cy="49" r="34" fill="url(#${id}s)" stroke="#1c1917" stroke-width="2"/>` +
          `<circle cx="50" cy="49" r="29.5" fill="none" stroke="#1c1917" stroke-width="1" opacity=".7"/>` + glyphs +
          `<g fill="#3f3528" opacity=".8">${dots}</g>` +
          `<circle cx="50" cy="49" r="19" fill="url(#${id}v)"/>` + arms(50, 49, 14, col) +
          `<circle cx="50" cy="49" r="19" fill="none" stroke="#1c1917" stroke-width="2"/>` +
          `<circle cx="50" cy="49" r="19" fill="none" stroke="#0d9488" stroke-width="1" stroke-dasharray="2 3" opacity=".9"/>` +
          `</svg>`;
      },
      // Пирамида: четыре уступа из известняка с центральной лестницей, на вершине храм с расписным фризом и зубцами, светящийся вход, огонь над храмом
      shrine(tier, fire, won, id) {
        const tierP = (y, hw, h) => `<path d="M${40 - hw} ${y + h} L${40 - hw + 2} ${y} H${40 + hw - 2} L${40 + hw} ${y + h}Z" fill="url(#${id}s)" stroke="#2b1d0e" stroke-width="1.5" stroke-linejoin="round"/>` +
          `<path d="M${40 - hw + 2.4} ${y + 1} H${40 + hw - 2.4}" stroke="#f5e6c8" stroke-width="1" opacity=".8"/>`;
        let steps = '';
        for (let y = 53; y < 98; y += 3) steps += `M${33 + (98 - y) * 0.03} ${y} H${47 - (98 - y) * 0.03}`;
        return `<svg viewBox="0 -6 80 116" class="art"><defs>${shrineDefs(id, fire, won)}` +
          `<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6a3f"/><stop offset=".45" stop-color="#e3c89a"/><stop offset="1" stop-color="#7a5a32"/></linearGradient>` +
          `<linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5e6c8"/><stop offset="1" stop-color="#b8986a"/></linearGradient></defs>` +
          shrineBack(id, won, 56) +
          tierP(86, 38, 12) + tierP(74, 32, 12) + tierP(62, 26, 12) + tierP(50, 20, 12) +
          // лестница с балюстрадами
          `<path d="M32 98 L34 50 H46 L48 98Z" fill="url(#${id}l)" stroke="#2b1d0e" stroke-width="1.3" stroke-linejoin="round"/>` +
          `<path d="${steps}" stroke="#8a6a3f" stroke-width=".8"/>` +
          `<path d="M31 98 L33.5 50 M49 98 L46.5 50" stroke="#2b1d0e" stroke-width="2.2"/>` +
          // храм наверху
          `<path d="M24 50 V33 H56 V50Z" fill="url(#${id}s)" stroke="#2b1d0e" stroke-width="1.6"/>` +
          `<path d="M34 50 V41 Q40 35 46 41 V50Z" fill="${sh(fire, -0.4)}" stroke="#2b1d0e" stroke-width="1.3"/>` +
          `<path class="art-blink" d="M36 50 V42.5 Q40 38.5 44 42.5 V50Z" fill="${fire}" opacity=".85"/>` +
          `<path d="M22 33 V27 H58 V33Z" fill="#b91c1c" stroke="#2b1d0e" stroke-width="1.5"/>` +
          `<path d="M24 30 h4 v-1.6 h3 v3.2 h3 v-1.6 h4 M42 30 h4 v-1.6 h3 v3.2 h3 v-1.6 h4" stroke="#5eead4" stroke-width="1.2" fill="none"/>` +
          `<path d="M22 27 V23 H26 V27 M30 27 V23 H34 V27 M46 27 V23 H50 V27 M54 27 V23 H58 V27" fill="#e3c89a" stroke="#2b1d0e" stroke-width="1.2" stroke-linejoin="round"/>` +
          // огонь над храмом
          flame(id, 40, 27, 0.95) +
          `<path d="M33 27.5 h14 l-2 -3 h-10z" fill="#1c1917"/>` +
          sparks(fire, [30, 12], [51, 6]) +
          `</svg>`;
      },
    },

    japan: {
      // Врата Ёми: в туманном сосновом лесу стоят старые алые тории с чёрной перекладиной-касаги и тёмной табличкой,
      // за ними — воронка в подземную страну Ёми; по бокам тёмные сосны, внизу стелется туман, у ворот парят огоньки
      rift(tier, col, id) {
        const pine = (x, s, m) => `<g transform="translate(${x} 93) scale(${m ? -s : s} ${s})">` +
          `<path d="M-1.5 0 L-2.5 -30 Q-2 -44 2 -54 L4.5 -53 Q1 -44 1.5 -30 L2.5 0Z" fill="#57341a" stroke="#1c1917" stroke-width="1.2" stroke-linejoin="round"/>` +
          `<path d="M-15 -18 Q-18 -26 -7 -28 Q6 -31 13 -24 Q16 -18 7 -16 Q-4 -14 -15 -18Z M-12 -36 Q-14 -44 -4 -45 Q8 -47 13 -41 Q15 -35 6 -34 Q-4 -33 -12 -36Z M-7 -52 Q-8 -59 0 -60 Q9 -61 12 -56 Q13 -51 6 -50 Q-1 -49 -7 -52Z" fill="url(#${id}p)" stroke="#022c22" stroke-width="1.4" stroke-linejoin="round"/>` +
          `<path d="M-10 -22 Q0 -25 9 -22 M-8 -40 Q2 -42 9 -39 M-3 -56 Q3 -57 8 -55" stroke="#5eead4" stroke-width="1" fill="none" opacity=".45"/></g>`;
        const wisp = (x, y, d) => `<g class="art-float" style="animation-delay:-${d}s"><circle cx="${x}" cy="${y}" r="4.2" fill="url(#${id}h)" opacity=".8"/><path d="M${x} ${y - 4.4} C${x + 3} ${y - 1} ${x + 2.6} ${y + 2.6} ${x} ${y + 2.8} C${x - 2.6} ${y + 2.6} ${x - 3} ${y - 1} ${x} ${y - 4.4}Z" fill="${col}"/><circle cx="${x}" cy="${y}" r="1" fill="#fff"/></g>`;
        return `<svg viewBox="0 0 100 100" class="art"><defs>${riftDefs(id, col)}` +
          `<linearGradient id="${id}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7f1d1d"/><stop offset=".45" stop-color="#ef4444"/><stop offset="1" stop-color="#991b1b"/></linearGradient>` +
          `<linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#57534e"/><stop offset="1" stop-color="#0c0a09"/></linearGradient>` +
          `<linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14b8a6"/><stop offset=".55" stop-color="#0f5c4f"/><stop offset="1" stop-color="#042f2e"/></linearGradient></defs>` +
          riftBack(id) +
          // сосны и дальний туман
          pine(22, 0.62, true) + pine(78, 0.62, false) + pine(8, 0.95, false) + pine(92, 0.95, true) +
          `<g class="art-float" style="animation-delay:-1s"><path d="M0 60 Q14 55 28 59 Q20 64 0 64Z M100 58 Q86 53 72 57 Q80 62 100 62Z" fill="#e0e7ff" opacity=".35"/></g>` +
          // воронка Ёми
          `<ellipse cx="50" cy="63" rx="21" ry="25" fill="url(#${id}v)"/>` + arms(50, 63, 16, col) +
          // тории: столбы с чёрными основаниями
          `<path d="M26.5 91 L28.5 34 H34 L35 91Z M73.5 91 L71.5 34 H66 L65 91Z" fill="url(#${id}t)" stroke="#450a0a" stroke-width="1.5" stroke-linejoin="round"/>` +
          `<path d="M24.5 86h12.5v6H24.5z M63 86h12.5v6H63z" fill="url(#${id}k)" stroke="#0c0a09" stroke-width="1.2"/>` +
          `<path d="M30 38V84M69.5 38V84" stroke="#fca5a5" stroke-width="1" opacity=".5"/>` +
          // нуки, симаки и чёрная касаги с загнутыми концами
          `<path d="M18 38.5 H82 V44 H18Z" fill="url(#${id}t)" stroke="#450a0a" stroke-width="1.5"/>` +
          `<path d="M14 25 H86 V31 H14Z" fill="url(#${id}t)" stroke="#450a0a" stroke-width="1.5"/>` +
          `<path d="M3 15.5 Q50 23 97 15.5 L95.5 22 Q50 28.5 4.5 22Z" fill="url(#${id}k)" stroke="#0c0a09" stroke-width="1.6" stroke-linejoin="round"/>` +
          `<path d="M8 18.4 Q50 25 92 18.4" stroke="#a8a29e" stroke-width=".9" fill="none" opacity=".7"/>` +
          // табличка с огненным знаком
          `<path d="M44 30 H56 V40 H44Z" fill="#1c1917" stroke="#fbbf24" stroke-width="1.2"/>` +
          `<g class="art-blink"><circle cx="50" cy="35" r="2.6" fill="none" stroke="${col}" stroke-width="1.3"/><circle cx="50" cy="35" r="1" fill="${col}"/></g>` +
          // стелющийся туман и огоньки
          `<g class="art-float"><path d="M1 90 Q14 84 28 88 Q40 92 52 87 Q66 83 78 88 Q90 92 99 87 L99 95 Q50 99 1 95Z" fill="#eef2ff" opacity=".6"/></g>` +
          `<path d="M4 94 Q30 90 50 93 Q72 90 96 94" stroke="#fff" stroke-width="1.2" fill="none" opacity=".5"/>` +
          wisp(17, 70, 0.3) + wisp(84, 66, 1.1) +
          `</svg>`;
      },
      // Святилище: за алыми тории — маленький храм-хондэн из кипариса: крыша с перекрещёнными брусьями тиги,
      // священная верёвка симэнава с бумажными зигзагами, светящаяся дверь; по бокам дорожки — каменные фонари торо с огнём
      shrine(tier, fire, won, id) {
        const toro = x => `<path d="M${x - 5} 101 h10 v-2.6 h-10z" fill="url(#${id}s)" stroke="#292524" stroke-width="1"/>` +
          `<path d="M${x - 1.6} 98.4 V90 h3.2 V98.4Z" fill="url(#${id}s)" stroke="#292524" stroke-width="1"/>` +
          `<path d="M${x - 4.4} 90 h8.8 v-1.8 h-8.8z" fill="url(#${id}s)" stroke="#292524" stroke-width="1"/>` +
          `<path d="M${x - 3.4} 88.2 V81.6 h6.8 V88.2Z" fill="${sh(fire, -0.45)}" stroke="#292524" stroke-width="1"/>` +
          `<rect class="art-blink" x="${x - 2.2}" y="82.6" width="4.4" height="4.6" fill="${fire}"/>` +
          `<path d="M${x - 6} 81.8 Q${x} 77 ${x + 6} 81.8 Z" fill="url(#${id}s)" stroke="#292524" stroke-width="1" stroke-linejoin="round"/>` +
          `<circle cx="${x}" cy="77.6" r="1.4" fill="#a8a29e" stroke="#292524" stroke-width=".8"/>`;
        return `<svg viewBox="0 -6 80 116" class="art"><defs>${shrineDefs(id, fire, won)}` +
          `<linearGradient id="${id}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7f1d1d"/><stop offset=".45" stop-color="#ef4444"/><stop offset="1" stop-color="#991b1b"/></linearGradient>` +
          `<linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#57534e"/><stop offset="1" stop-color="#0c0a09"/></linearGradient>` +
          `<linearGradient id="${id}w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a16207"/><stop offset=".45" stop-color="#fcd9a0"/><stop offset="1" stop-color="#92400e"/></linearGradient>` +
          `<linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78716c"/><stop offset="1" stop-color="#292524"/></linearGradient>` +
          `<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#78716c"/><stop offset=".45" stop-color="#d6d3d1"/><stop offset="1" stop-color="#57534e"/></linearGradient></defs>` +
          shrineBack(id, won, 60) +
          // каменное основание
          `<path d="M17 86h46v5H17z" fill="url(#${id}s)" stroke="#292524" stroke-width="1.3"/><path d="M13 91h54v4H13z" fill="#a8a29e" stroke="#292524" stroke-width="1.3"/>` +
          // хондэн: стены, столбики, светящаяся дверь
          `<path d="M23 64h34v22H23z" fill="url(#${id}w)" stroke="#451a03" stroke-width="1.4"/>` +
          `<path d="M26 64V86M54 64V86M23 70H34M46 70H57" stroke="#78350f" stroke-width="1.1"/>` +
          `<path d="M34 86V68h12v18Z" fill="${sh(fire, -0.4)}" stroke="#451a03" stroke-width="1.3"/>` +
          `<path class="art-blink" d="M35.5 86V69.5h9V86Z" fill="${fire}" opacity=".85"/>` +
          `<path d="M40 69V86M35 75h10M35 80h10" stroke="#451a03" stroke-width=".8" opacity=".7"/>` +
          // крыша из коры кипариса и брусья тиги
          `<path d="M36 49 L31 40 M44 49 L49 40" stroke="#1c1917" stroke-width="4.6" stroke-linecap="round"/><path d="M36 49 L31 40 M44 49 L49 40" stroke="#a8a29e" stroke-width="2.4" stroke-linecap="round"/>` +
          `<circle cx="31" cy="40" r="1.4" fill="#fbbf24"/><circle cx="49" cy="40" r="1.4" fill="#fbbf24"/>` +
          `<path d="M12 66 Q26 60 40 46 Q54 60 68 66 L65 69 Q40 63 15 69Z" fill="url(#${id}r)" stroke="#0c0a09" stroke-width="1.5" stroke-linejoin="round"/>` +
          `<path d="M16 66.4 Q40 60 64 66.4" stroke="#d6d3d1" stroke-width=".9" fill="none" opacity=".6"/><path d="M40 47 V52" stroke="#fbbf24" stroke-width="1.6"/>` +
          // симэнава с сидэ
          `<path d="M24 69.5 Q40 74 56 69.5" stroke="#78350f" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M24 69.5 Q40 74 56 69.5" stroke="#e8c07a" stroke-width="1.8" fill="none" stroke-dasharray="2 1.4"/>` +
          `<path class="art-sway" style="transform-origin:50% 0" d="M31 71.5 h2.4 l-1.6 2.6 h2.4 l-1.6 2.6 h2.4 M46.5 71.5 h2.4 l-1.6 2.6 h2.4 l-1.6 2.6 h2.4" stroke="#f8fafc" stroke-width="1.6" fill="none" stroke-linejoin="round"/>` +
          // тории
          `<path d="M8.5 101 L10.5 30 H15.5 L16.5 101Z M71.5 101 L69.5 30 H64.5 L63.5 101Z" fill="url(#${id}t)" stroke="#450a0a" stroke-width="1.4" stroke-linejoin="round"/>` +
          `<path d="M7 96h11v6H7z M62 96h11v6H62z" fill="url(#${id}k)" stroke="#0c0a09" stroke-width="1.1"/>` +
          `<path d="M3 31 H77 V35.5 H3Z" fill="url(#${id}t)" stroke="#450a0a" stroke-width="1.4"/>` +
          `<path d="M5 19 H75 V24.5 H5Z" fill="url(#${id}t)" stroke="#450a0a" stroke-width="1.4"/>` +
          `<path d="M-1 10 Q40 17 81 10 L79.5 16.2 Q40 22.5 .5 16.2Z" fill="url(#${id}k)" stroke="#0c0a09" stroke-width="1.5" stroke-linejoin="round"/>` +
          `<path d="M35.5 24 H44.5 V31.5 H35.5Z" fill="#1c1917" stroke="#fbbf24" stroke-width="1.1"/><circle cx="40" cy="27.8" r="1.8" fill="${fire}"/>` +
          // каменные фонари торо и дорожка
          `<ellipse cx="40" cy="101" rx="9" ry="2.4" fill="#78716c" stroke="#292524" stroke-width="1"/>` +
          toro(25) + toro(55) + flame(id, 25, 87.5, 0.2) + flame(id, 55, 87.5, 0.2) +
          sparks(fire, [30, 50], [52, 44]) +
          `</svg>`;
      },
    },
  };
})();
