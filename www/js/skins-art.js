'use strict';
/* 4.6: облики-скины Ловчего — портреты для аватара (круг 100×100). Art.avatar берёт отсюда, если look.skin задан.
   Стиль «сказочная Навь»: мягкий объём градиентами (свет сверху-слева), тёмная обводка, свечение — только радиальными градиентами.
   Облик приходит и от других игроков: в разметку попадают лишь проверенный цвет глаз (#rrggbb) и эмблема через Art.emblem. */

const SkinArt = (() => {
  let seq = 0;
  const D = '#1b1030';
  const HEX = /^#[0-9a-f]{6}$/i;

  /* ---------- общие кирпичики ---------- */
  const st = a => a.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op == null ? '' : ` stop-opacity="${op}"`}/>`).join('');
  // линейный градиент; по умолчанию — свет сверху-слева к низу-справа
  const lg = (id, a, x1 = 0, y1 = 0, x2 = 1, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${st(a)}</linearGradient>`;
  const rg = (id, a, cx = 0.5, cy = 0.5, r = 0.5) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${st(a)}</radialGradient>`;
  const glowG = (id, c, o = 0.8) => rg(id, [[0, c, o], [0.45, c, o * 0.4], [1, c, 0]]);
  const eyesOf = look => (HEX.test(look.eyes) ? look.eyes : '#5eead4');
  const emb = (look, dx = 0, dy = 0) => {
    const e = typeof Art !== 'undefined' && Art.emblem ? Art.emblem(look.emblem) : '';
    return dx || dy ? `<g transform="translate(${dx} ${dy})">${e}</g>` : e;
  };
  // зеркальная копия относительно вертикали x=50
  const mir = s => s + `<g transform="matrix(-1 0 0 1 100 0)">${s}</g>`;
  // рамка: фон-круг, обрезка по кругу, тонкий внутренний ободок
  const svg = (p, defs, bg, body) =>
    `<svg viewBox="0 0 100 100" class="art"><defs><clipPath id="${p}c"><circle cx="50" cy="50" r="48"/></clipPath>` +
    rg(`${p}b`, [[0, bg[0]], [1, bg[1]]], 0.5, 0.42, 0.6) + defs + `</defs>` +
    `<circle cx="50" cy="50" r="48" fill="url(#${p}b)"/><g clip-path="url(#${p}c)">${body}</g>` +
    `<circle cx="50" cy="50" r="47.4" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1.2"/></svg>`;

  // плечи-плащ и капюшон (общие силуэты)
  const BODY = 'M10 100C12 78 26 67 50 65C74 67 88 78 90 100Z';
  const HOOD = 'M50 16C69 16 78 34 78 52L80 74C70 79 30 79 20 74L22 52C22 34 31 16 50 16Z';
  const HOOD_SH = 'M50 16C69 16 78 34 78 52L80 74C76 76 72 77 68 77L68 58C68 40 62 26 50 22Z';
  const OPEN = 'M50 24C63 24 69 38 69 51C69 62 61 70 50 70C39 70 31 62 31 51C31 38 37 24 50 24Z';

  // светящиеся глаза в тени капюшона
  const gEye = (p, x, y, e) =>
    `<circle cx="${x}" cy="${y}" r="7" fill="url(#${p}g)"/><ellipse cx="${x}" cy="${y}" rx="3.8" ry="2.5" fill="${e}"/>` +
    `<ellipse cx="${x - 0.5}" cy="${y - 0.4}" rx="1.7" ry="1" fill="#fff" opacity=".9"/>`;
  const shadowFace = (p, e, y = 50) =>
    `<path d="${OPEN}" fill="url(#${p}o)" stroke="${D}" stroke-width="1"/>` + gEye(p, 42, y, e) + gEye(p, 58, y, e);
  const shadowDefs = (p, e) => glowG(`${p}g`, e, 0.75) + rg(`${p}o`, [[0, '#1d1236'], [1, '#07040f']], 0.5, 0.62, 0.6);

  // открытое лицо: кожа, радужка цвета look.eyes, мягкий румянец
  const skinDef = p => rg(`${p}k`, [[0, '#ffe8d2'], [0.6, '#f3bd93'], [1, '#c98661']], 0.38, 0.32, 0.75);
  const eye = (x, y, e) =>
    `<ellipse cx="${x}" cy="${y}" rx="2.7" ry="2.1" fill="#fff"/><circle cx="${x + 0.2}" cy="${y + 0.2}" r="1.75" fill="${e}"/>` +
    `<circle cx="${x + 0.2}" cy="${y + 0.2}" r=".8" fill="${D}"/><circle cx="${x - 0.5}" cy="${y - 0.5}" r=".6" fill="#fff"/>` +
    `<path d="M${x - 3} ${y - 0.3}Q${x} ${y - 3} ${x + 3} ${y - 0.3}" fill="none" stroke="${D}" stroke-width="1" stroke-linecap="round"/>`;
  const face = (p, e, cy, o = {}) =>
    `<ellipse cx="50" cy="${cy}" rx="${o.rx || 11.5}" ry="${o.ry || 13}" fill="url(#${p}k)" stroke="#5b3320" stroke-width=".9"/>` +
    `<ellipse cx="42.5" cy="${cy + 5}" rx="2.6" ry="1.6" fill="#f472b6" opacity=".28"/><ellipse cx="57.5" cy="${cy + 5}" rx="2.6" ry="1.6" fill="#f472b6" opacity=".28"/>` +
    eye(45.3, cy, e) + eye(54.7, cy, e) +
    `<path d="M50.3 ${cy + 1.5}Q48.6 ${cy + 5.4} 50.8 ${cy + 5.8}" fill="none" stroke="#a0603f" stroke-width=".8" stroke-linecap="round"/>` +
    (o.mouth === false ? '' : `<path d="M47.6 ${cy + 8.4}Q50 ${cy + 10} 52.4 ${cy + 8.4}" fill="none" stroke="#8a3b2a" stroke-width=".95" stroke-linecap="round"/>`);
  // пара бровей
  const brows = (y, c, w, tilt = 0) =>
    `<path d="M41.2 ${y + tilt}Q44.5 ${y - 2} 48.3 ${y + 0.4 + tilt * 0.3}M58.8 ${y + tilt}Q55.5 ${y - 2} 51.7 ${y + 0.4 + tilt * 0.3}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  // искорка-звёздочка
  const spark = (x, y, r, c) => {
    const k = +(r * 0.18).toFixed(2), f = n => +n.toFixed(2);
    return `<path d="M${x} ${f(y - r)}Q${f(x + k)} ${f(y - k)} ${f(x + r)} ${y}Q${f(x + k)} ${f(y + k)} ${x} ${f(y + r)}` +
      `Q${f(x - k)} ${f(y + k)} ${f(x - r)} ${y}Q${f(x - k)} ${f(y - k)} ${x} ${f(y - r)}Z" fill="${c}"/>`;
  };

  const S = {
    draw(id, look) {
      look = look || {};
      if (id !== 'draw' && Object.prototype.hasOwnProperty.call(S, id) && typeof S[id] === 'function') return S[id](look);
      // неизвестный облик — обычный Ловчий в капюшоне
      return typeof Art !== 'undefined' ? Art.avatar(Object.assign({}, look, { skin: 'hood' })) : '';
    },

    /* 1. Волхв — седой, высокая шапка с рунами, борода, посох с огоньком */
    volhv(look) {
      const p = `sk${++seq}`, e = eyesOf(look);
      const defs = skinDef(p) +
        lg(`${p}r`, [[0, '#f4f5fa'], [0.55, '#b9bfd0'], [1, '#6b7390']]) +
        lg(`${p}h`, [[0, '#ffffff'], [0.5, '#d3d8e4'], [1, '#7c849c']], 0, 0, 1, 0.6) +
        lg(`${p}w`, [[0, '#ffffff'], [1, '#bcc3d3']], 0, 0, 0.3, 1) +
        lg(`${p}s`, [[0, '#a8743d'], [1, '#4a2a10']], 0, 0, 1, 0) +
        glowG(`${p}f`, '#fcd34d', 0.9) + lg(`${p}q`, [[0, '#fef9c3'], [0.5, '#fbbf24'], [1, '#ea580c']], 0, 0, 0, 1);
      const body =
        // посох за правым плечом, огонёк на навершии
        `<circle cx="71" cy="16" r="15" fill="url(#${p}f)"/>` +
        `<path d="M80 100L72.5 22" stroke="${D}" stroke-width="4.4" stroke-linecap="round"/><path d="M80 100L72.5 22" stroke="url(#${p}s)" stroke-width="2.8" stroke-linecap="round"/>` +
        `<path d="M72.5 24q-4.5-3-2.2-7.2q3.4-2.4 5.6 1" fill="none" stroke="${D}" stroke-width="3.4" stroke-linecap="round"/><path d="M72.5 24q-4.5-3-2.2-7.2q3.4-2.4 5.6 1" fill="none" stroke="#a8743d" stroke-width="1.8" stroke-linecap="round"/>` +
        `<path d="M72.5 7.5C76 11 77.2 14 75.6 16.6C74 18.8 70.6 18.6 69.6 16.2C68.8 13.8 71 12 72.5 7.5Z" fill="url(#${p}q)" stroke="#9a3412" stroke-width=".6"/><ellipse cx="72.6" cy="15.2" rx="1.4" ry="2" fill="#fffbeb"/>` +
        // хламида
        `<path d="M12 100C14 80 26 70 50 67C74 70 86 80 88 100Z" fill="url(#${p}r)" stroke="${D}" stroke-width="1.2"/>` +
        `<path d="M24 100C26 88 30 80 36 75M76 100C74 88 70 80 64 75" fill="none" stroke="#6b7390" stroke-width=".8" opacity=".6"/>` +
        // вышивка по полам и плечам
        `<path d="M41 69L36.5 100M59 69L63.5 100M16 88Q24 76 38 72" fill="none" stroke="#9f1239" stroke-width="3.2"/>` +
        `<path d="M41 69L36.5 100M59 69L63.5 100M16 88Q24 76 38 72" fill="none" stroke="#fbbf24" stroke-width="1.1" stroke-dasharray="1.4 1.6"/>` +
        // седые волосы, лицо
        `<path d="M36.5 40C33 54 34.5 66 39.5 73L60.5 73C65.5 66 67 54 63.5 40Z" fill="url(#${p}w)" stroke="#8b93aa" stroke-width=".7"/>` +
        face(p, e, 46, { rx: 11, ry: 12.5, mouth: false }) +
        `<path d="M40.5 42.6Q44.5 39.4 48.6 42M59.5 42.6Q55.5 39.4 51.4 42" fill="none" stroke="#6b7390" stroke-width="3" stroke-linecap="round"/>` +
        `<path d="M40.5 42.6Q44.5 39.4 48.6 42M59.5 42.6Q55.5 39.4 51.4 42" fill="none" stroke="#f8fafc" stroke-width="2" stroke-linecap="round"/>` +
        // длинная борода и усы
        `<path d="M38.6 50C39 58 42 64 44 70C46 78 48 85 50 91C52 85 54 78 56 70C58 64 61 58 61.4 50C59 56 55 57.5 50 57.5C45 57.5 41 56 38.6 50Z" fill="url(#${p}w)" stroke="#6b7390" stroke-width=".8"/>` +
        `<path d="M45 61Q46.5 72 49 83M55 61Q53.5 72 51 83M50 59V87M42 57Q43.5 63 46 68M58 57Q56.5 63 54 68" fill="none" stroke="#9aa3b8" stroke-width=".6" stroke-linecap="round"/>` +
        `<path d="M50 53.2C47 52.4 43 53 41.4 57C44 55.6 47 56.2 50 55.4C53 56.2 56 55.6 58.6 57C57 53 53 52.4 50 53.2Z" fill="#fff" stroke="#8b93aa" stroke-width=".6"/>` +
        // остроконечная шапка с рунами
        `<path d="M36.4 39C37 27 41.5 15 45.6 5.6C50.5 13 60.5 26 63.6 39Z" fill="url(#${p}h)" stroke="${D}" stroke-width="1.2" stroke-linejoin="round"/>` +
        `<path d="M45.6 5.6C50.5 13 60.5 26 63.6 39L57 39C55 28 50 16 45.6 5.6Z" fill="#000" opacity=".14"/>` +
        `<path d="M46 16.5v6.5l3-3M43.4 26.5l2.8 5 2.8-5M52 24.5v7M52 28l3-2.5M40.8 34h3" fill="none" stroke="#2563eb" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="M44 12Q41 22 39.5 34" fill="none" stroke="#fff" stroke-width="1.3" opacity=".7" stroke-linecap="round"/>` +
        `<path d="M34.6 36.6Q50 31.4 65.4 36.6L65.8 41Q50 35.8 34.2 41Z" fill="#9f1239" stroke="${D}" stroke-width="1"/>` +
        `<path d="M36 38.8Q50 33.8 64 38.8" fill="none" stroke="#fbbf24" stroke-width="1.1" stroke-dasharray="1.2 1.8"/>` +
        emb(look, -21, -1);
      return svg(p, defs, ['#2c2558', '#110b26'], body);
    },

    /* 2. Богатырь — шелом-шишак, бармица, кольчуга, красное корзно */
    bogatyr(look) {
      const p = `sk${++seq}`, e = eyesOf(look);
      const defs = skinDef(p) +
        lg(`${p}m`, [[0, '#cbd5e1'], [0.5, '#64748b'], [1, '#1e293b']]) +
        `<pattern id="${p}n" width="3" height="2.4" patternUnits="userSpaceOnUse"><path d="M0 0a1.5 1.3 0 0 0 3 0M-1.5 1.2a1.5 1.3 0 0 0 3 0M1.5 1.2a1.5 1.3 0 0 0 3 0" fill="none" stroke="#e2e8f0" stroke-opacity=".55" stroke-width=".45"/></pattern>` +
        lg(`${p}r`, [[0, '#f87171'], [0.45, '#b91c1c'], [1, '#450a0a']]) +
        lg(`${p}h`, [[0, '#f8fafc'], [0.35, '#a3b1c4'], [0.7, '#52607a'], [1, '#1e293b']], 0, 0, 1, 0.3) +
        lg(`${p}a`, [[0, '#fef3c7'], [0.5, '#f59e0b'], [1, '#92400e']], 0, 0, 0, 1) +
        rg(`${p}z`, [[0, '#fff7cc'], [0.5, '#fbbf24'], [1, '#92400e']], 0.35, 0.3, 0.7);
      const mail = d => `<path d="${d}" fill="url(#${p}m)" stroke="${D}" stroke-width="1"/><path d="${d}" fill="url(#${p}n)"/>`;
      const body =
        // корзно
        `<path d="${BODY}" fill="url(#${p}r)" stroke="${D}" stroke-width="1.2"/>` +
        // кольчуга на груди
        mail('M31 100C32 86 38 76 50 73C62 74 68 78 69 84C66 90 64 95 63 100Z') +
        `<path d="M69 76C66 86 62 94 58 100L76 100C75 90 73 82 69 76Z" fill="url(#${p}r)" stroke="${D}" stroke-width="1"/>` +
        `<path d="M22 100C23 88 27 80 33 75M78 100C77 92 75 86 72 81" fill="none" stroke="#450a0a" stroke-width="1" opacity=".7"/>` +
        `<path d="M14 90Q20 76 34 71" fill="none" stroke="#fca5a5" stroke-width="1.2" opacity=".45" stroke-linecap="round"/>` +
        // бармица вокруг лица
        mail('M32.6 40C31.6 54 32.6 65 36 73C42 77.5 58 77.5 64 73C67.4 65 68.4 54 67.4 40Z') +
        face(p, e, 50, { rx: 10.4, ry: 12, mouth: false }) +
        // суровые брови, усы и короткая борода
        `<path d="M40.8 44.6L48 47M59.2 44.6L52 47" stroke="#3b2412" stroke-width="2.2" stroke-linecap="round"/>` +
        `<path d="M40.8 55C41.6 60.4 45.4 63.4 50 63.4C54.6 63.4 58.4 60.4 59.2 55C57 58 54 58.6 50 58.6C46 58.6 43 58 40.8 55Z" fill="#7c4a1e" stroke="#3b2412" stroke-width=".7"/>` +
        `<path d="M50 56.2C47.4 55.2 44.4 55.6 42.8 58.4C45.4 57.4 47.6 57.8 50 57.6C52.4 57.8 54.6 57.4 57.2 58.4C55.6 55.6 52.6 55.2 50 56.2Z" fill="#5c3312"/>` +
        `<path d="M47.8 60.2H52.2" stroke="#3b2412" stroke-width=".8" stroke-linecap="round"/>` +
        // шелом-шишак с наносником
        `<path d="M32.4 42C32.4 28 40 19.5 50 11.5C60 19.5 67.6 28 67.6 42Z" fill="url(#${p}h)" stroke="${D}" stroke-width="1.2"/>` +
        `<path d="M48.7 13L50 3.6L51.3 13Z" fill="url(#${p}a)" stroke="${D}" stroke-width=".8" stroke-linejoin="round"/><circle cx="50" cy="12.4" r="2.2" fill="url(#${p}z)" stroke="${D}" stroke-width=".8"/>` +
        `<path d="M50 14.5V39M43 18.5Q38.6 28 38.6 39.5M57 18.5Q61.4 28 61.4 39.5" fill="none" stroke="#92400e" stroke-width="1.9"/>` +
        `<path d="M50 14.5V39M43 18.5Q38.6 28 38.6 39.5M57 18.5Q61.4 28 61.4 39.5" fill="none" stroke="#fbbf24" stroke-width=".9"/>` +
        `<path d="M40 23Q36.4 29.5 36.2 36" fill="none" stroke="#fff" stroke-width="1.6" opacity=".75" stroke-linecap="round"/>` +
        `<path d="M31.6 39.4Q50 35.4 68.4 39.4L68.4 44.2Q50 40.2 31.6 44.2Z" fill="url(#${p}a)" stroke="${D}" stroke-width="1"/>` +
        `<path d="M34 41.6h1.6M39 40.8h1.6M44 40.2h1.6M54.4 40.2h1.6M59.4 40.8h1.6M64.4 41.6h1.6" stroke="#7c2d12" stroke-width="1.1"/>` +
        `<path d="M48.7 42.4H51.3L51.1 53.4Q50 54.6 48.9 53.4Z" fill="url(#${p}h)" stroke="${D}" stroke-width=".8"/>` +
        // золотая застёжка корзна на правом плече
        `<circle cx="68.5" cy="76" r="4.8" fill="url(#${p}z)" stroke="#78350f" stroke-width="1"/><circle cx="68.5" cy="76" r="3" fill="none" stroke="#92400e" stroke-width=".6" stroke-dasharray="1 .8"/>` +
        `<circle cx="68.5" cy="76" r="1.7" fill="#dc2626" stroke="#7f1d1d" stroke-width=".5"/><circle cx="67.9" cy="75.4" r=".55" fill="#fff"/>` +
        emb(look);
      return svg(p, defs, ['#2f2150', '#100a24'], body);
    },

    /* 3. Навий страж — рогатая костяная личина, фиолетовый плащ, пламя Нави */
    navstrazh(look) {
      const p = `sk${++seq}`, e = eyesOf(look);
      const defs = shadowDefs(p, e) +
        glowG(`${p}v`, '#a855f7', 0.55) +
        lg(`${p}p`, [[0, '#e9d5ff'], [0.35, '#a855f7'], [1, '#4c1d95', 0.9]], 0, 0, 0, 1) +
        lg(`${p}y`, [[0, '#ecfccb'], [0.4, '#4ade80'], [1, '#15803d', 0.6]], 0, 0, 0, 1) +
        lg(`${p}c`, [[0, '#6d28d9'], [0.5, '#3b0764'], [1, '#1a0536']]) +
        lg(`${p}d`, [[0, '#8b5cf6'], [0.45, '#4c1d95'], [1, '#1e0845']]) +
        lg(`${p}k`, [[0, '#fffaf0'], [0.55, '#e3d8bd'], [1, '#9c8b68']]);
      const flame =
        `<path d="M14 36C9 27 14 18 17 8C19 15 23 16 23.5 21C25 16 27 13 26.5 7C33 14 34 25 30 34Z" fill="url(#${p}p)"/>` +
        `<path d="M18 33C15 27 18 22 19.6 16C21 20 23.4 22 23.6 25C25 22 26.4 19 26.6 16C29.6 21 29.4 28 26.4 33Z" fill="url(#${p}y)"/>`;
      const horn =
        `<path d="M37.6 31C28.6 29.4 22.6 23.8 21.6 14.6C27 20.6 34 22.6 43 23.4Z" fill="url(#${p}k)" stroke="${D}" stroke-width="1" stroke-linejoin="round"/>` +
        `<path d="M26 22.6l2.6-3M29.6 25.4l2.2-3.4M33.4 27.4l1.8-3.6M37 28.8l1.4-3.8" stroke="#8a7a5a" stroke-width=".75" stroke-linecap="round"/>`;
      const body =
        `<ellipse cx="50" cy="26" rx="44" ry="28" fill="url(#${p}v)"/>` +
        mir(flame) +
        `<path d="${BODY}" fill="url(#${p}c)" stroke="${D}" stroke-width="1.2"/>` +
        `<path d="M30 100C31 90 33 82 37 77M70 100C69 90 67 82 63 77" fill="none" stroke="#0f0520" stroke-width="1.2" opacity=".7"/>` +
        `<path d="${HOOD}" fill="url(#${p}d)" stroke="${D}" stroke-width="1.2"/><path d="${HOOD_SH}" fill="#000" opacity=".2"/>` +
        `<path d="M34 24Q26 36 25 56" fill="none" stroke="#c4b5fd" stroke-width="1.4" opacity=".45" stroke-linecap="round"/>` +
        `<path d="M20 74C30 79 70 79 80 74" fill="none" stroke="#4ade80" stroke-width="1" opacity=".55"/>` +
        mir(horn) +
        `<path d="${OPEN}" fill="url(#${p}o)" stroke="${D}" stroke-width="1"/>` +
        // костяная личина
        `<path d="M50 28.6C60 28.6 65.4 36.6 65.4 46.6C65.4 55 60.4 62 55.4 66L50 69.4L44.6 66C39.6 62 34.6 55 34.6 46.6C34.6 36.6 40 28.6 50 28.6Z" fill="url(#${p}k)" stroke="${D}" stroke-width="1"/>` +
        `<path d="M50 28.6C60 28.6 65.4 36.6 65.4 46.6C65.4 55 60.4 62 55.4 66L50 69.4Z" fill="#3b2a55" opacity=".14"/>` +
        `<path d="M37.6 44.6L47.4 46.8L46.4 52L38.6 50.6ZM62.4 44.6L52.6 46.8L53.6 52L61.4 50.6Z" fill="#0b0618" stroke="${D}" stroke-width=".7" stroke-linejoin="round"/>` +
        gEye(p, 42.6, 48.6, e) + gEye(p, 57.4, 48.6, e) +
        `<path d="M48.8 54L50 57.6L51.2 54Z" fill="#0b0618"/>` +
        `<path d="M43.4 60.6H56.6M45.6 58.4V63M48 58.6V64.2M52 58.6V64.2M54.4 58.4V63" fill="none" stroke="#5b4a33" stroke-width=".7" stroke-linecap="round"/>` +
        `<path d="M50 31.6V38.6M46.8 34.8L50 38.2L53.2 34.8M40 40Q42.6 38.6 45 39.4M60 40Q57.4 38.6 55 39.4" fill="none" stroke="#7c3aed" stroke-width=".95" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="M39.4 36Q42 31.4 47 30.4" fill="none" stroke="#fff" stroke-width="1.1" opacity=".8" stroke-linecap="round"/>` +
        `<circle cx="14" cy="60" r="1.1" fill="#86efac"/><circle cx="87" cy="56" r="1" fill="#d8b4fe"/><circle cx="20" cy="46" r=".8" fill="#d8b4fe"/><circle cx="82" cy="44" r=".9" fill="#86efac"/>` +
        emb(look);
      return svg(p, defs, ['#261845', '#0a0617'], body);
    },

    /* 4. Жар-перо (легендарный) — венец из перьев Жар-птицы, золото-алый плащ, искры */
    zharpero(look) {
      const p = `sk${++seq}`, e = eyesOf(look);
      const defs = shadowDefs(p, e) +
        rg(`${p}w`, [[0, '#fff3c4', 0.95], [0.35, '#fb923c', 0.55], [1, '#dc2626', 0]]) +
        lg(`${p}f`, [[0, '#fef08a'], [0.4, '#f97316'], [1, '#991b1b']], 0, 0, 0, 1) +
        lg(`${p}c`, [[0, '#fcd34d'], [0.35, '#ea580c'], [0.7, '#b91c1c'], [1, '#5b0f14']]) +
        lg(`${p}d`, [[0, '#fde68a'], [0.35, '#f59e0b'], [0.7, '#c2410c'], [1, '#7f1d1d']]) +
        `<pattern id="${p}s" width="6" height="5" patternUnits="userSpaceOnUse"><path d="M0 0Q3 6 6 0M-3 2.5Q0 8.5 3 2.5M3 2.5Q6 8.5 9 2.5" fill="none" stroke="#fde68a" stroke-opacity=".45" stroke-width=".6"/></pattern>` +
        // одно перо Жар-птицы: остриё вверх, основание у 50,31
        `<g id="${p}e"><path d="M50 31C44 24 43 12.6 50 4.4C57 12.6 56 24 50 31Z" fill="url(#${p}f)" stroke="#7c2d12" stroke-width=".8"/>` +
        `<path d="M50 29V8" stroke="#fef3c7" stroke-width=".55" opacity=".8"/><ellipse cx="50" cy="12.6" rx="3.2" ry="4.4" fill="#fde047" stroke="#b45309" stroke-width=".5"/>` +
        `<ellipse cx="50" cy="13.2" rx="1.7" ry="2.5" fill="#dc2626"/><circle cx="49.4" cy="12" r=".6" fill="#fff"/></g>`;
      // веер перьев: крайние чуть короче
      const feathers = [[-68, 0.8], [68, 0.8], [-46, 0.9], [46, 0.9], [-23, 0.97], [23, 0.97], [0, 1]]
        .map(([a, s]) => `<use href="#${p}e" transform="rotate(${a} 50 31) translate(50 31) scale(${s}) translate(-50 -31)"/>`).join('');
      const body =
        `<circle cx="50" cy="36" r="46" fill="url(#${p}w)"/>` +
        `<path d="${BODY}" fill="url(#${p}c)" stroke="${D}" stroke-width="1.2"/><path d="${BODY}" fill="url(#${p}s)"/>` +
        `<path d="M30 100C31 90 33 82 37 77M70 100C69 90 67 82 63 77" fill="none" stroke="#5b0f14" stroke-width="1.2" opacity=".7"/>` +
        `<path d="${HOOD}" fill="url(#${p}d)" stroke="${D}" stroke-width="1.2"/><path d="${HOOD}" fill="url(#${p}s)"/><path d="${HOOD_SH}" fill="#450a0a" opacity=".25"/>` +
        `<path d="M34 24Q26 36 25 56" fill="none" stroke="#fff7d6" stroke-width="1.5" opacity=".6" stroke-linecap="round"/>` +
        feathers +
        `<path d="${OPEN}" fill="none" stroke="#7c2d12" stroke-width="4.4"/><path d="${OPEN}" fill="none" stroke="#fde047" stroke-width="2.6"/>` +
        shadowFace(p, e) +
        `<path d="M36 33Q50 21 64 33" fill="none" stroke="#fef3c7" stroke-width=".8" opacity=".7"/><circle cx="50" cy="24" r="2" fill="#dc2626" stroke="#7c2d12" stroke-width=".6"/><circle cx="49.4" cy="23.4" r=".6" fill="#fff"/>` +
        `<path d="M20 74C30 79 70 79 80 74" fill="none" stroke="#fde047" stroke-width="1.4"/>` +
        spark(17, 50, 3, '#fef9c3') + spark(84, 58, 2.6, '#fde68a') + spark(13, 70, 1.8, '#fdba74') + spark(88, 76, 2, '#fef9c3') +
        `<circle cx="22" cy="62" r=".9" fill="#fde68a"/><circle cx="80" cy="46" r="1" fill="#fff7d6"/><circle cx="26" cy="86" r=".8" fill="#fdba74"/>` +
        emb(look);
      return svg(p, defs, ['#4a1a2c', '#150a1c'], body);
    },

    /* 5. Морозный — ледяной венец, иней на плаще, снежинки */
    moroz(look) {
      const p = `sk${++seq}`, e = eyesOf(look);
      const defs = shadowDefs(p, e) +
        glowG(`${p}v`, '#7dd3fc', 0.5) +
        lg(`${p}c`, [[0, '#e0f2fe'], [0.4, '#7aa8d8'], [1, '#1e3a6e']]) +
        lg(`${p}d`, [[0, '#f8fafc'], [0.35, '#a5c8ec'], [0.75, '#4a74b0'], [1, '#1e3a6e']]) +
        lg(`${p}i`, [[0, '#ffffff'], [0.5, '#bae6fd'], [1, '#38bdf8']], 0, 0, 1, 1) +
        // ледяной кристалл: основание в 0,0, остриё вверх
        `<g id="${p}x"><path d="M0-20L3.4-6L0 0L-3.4-6Z" fill="url(#${p}i)" stroke="#1e3a8a" stroke-width=".8" stroke-linejoin="round"/>` +
        `<path d="M0-20L3.4-6L0 0Z" fill="#0369a1" opacity=".28"/><path d="M-1.2-15L-2-7" stroke="#fff" stroke-width=".7" stroke-linecap="round"/></g>` +
        `<path id="${p}f" d="M0-3V3M-2.6-1.5L2.6 1.5M-2.6 1.5L2.6-1.5M-.8-2.4L0-1.6L.8-2.4M-.8 2.4L0 1.6L.8 2.4" fill="none" stroke="#e0f2fe" stroke-width=".6" stroke-linecap="round"/>`;
      const x = (t, s) => `<use href="#${p}x" transform="${t} scale(${s})"/>`;
      const f = (tx, ty, s) => `<use href="#${p}f" transform="translate(${tx} ${ty}) scale(${s})"/>`;
      const body =
        `<ellipse cx="50" cy="28" rx="38" ry="26" fill="url(#${p}v)"/>` +
        `<path d="${BODY}" fill="url(#${p}c)" stroke="${D}" stroke-width="1.2"/>` +
        // иней: морозные веточки
        `<path d="M18 94Q22 86 29 82M22 88l-3-2.4M25 85l-1.4-3.2M72 82Q79 86 83 94M78 88l3-2.4M75 85l1.4-3.2M36 96q2-5 6-7M64 96q-2-5-6-7" fill="none" stroke="#fff" stroke-width=".8" stroke-linecap="round" opacity=".75"/>` +
        `<path d="M30 100C31 90 33 82 37 77M70 100C69 90 67 82 63 77" fill="none" stroke="#1e3a6e" stroke-width="1.1" opacity=".6"/>` +
        `<path d="${HOOD}" fill="url(#${p}d)" stroke="${D}" stroke-width="1.2"/><path d="${HOOD_SH}" fill="#0c1e44" opacity=".22"/>` +
        `<path d="M34 24Q26 36 25 56" fill="none" stroke="#fff" stroke-width="1.5" opacity=".7" stroke-linecap="round"/>` +
        // снежная опушка по краю капюшона
        `<path d="M20 74C24 71 26 76 30 74C33 72 36 77 40 75C43 73 46 78 50 76C54 78 57 73 60 75C64 77 67 72 70 74C74 76 76 71 80 74C70 80 30 80 20 74Z" fill="#f8fafc" stroke="#7aa8d8" stroke-width=".6"/>` +
        `<path d="${OPEN}" fill="none" stroke="#e0f2fe" stroke-width="2.4"/>` +
        shadowFace(p, e) +
        // ледяной венец
        `<path d="M33 30.6Q50 21.6 67 30.6" fill="none" stroke="#1e3a8a" stroke-width="3.4" stroke-linecap="round"/><path d="M33 30.6Q50 21.6 67 30.6" fill="none" stroke="#bae6fd" stroke-width="2" stroke-linecap="round"/>` +
        x('translate(35.4 30.4) rotate(-30)', 0.55) + x('translate(64.6 30.4) rotate(30)', 0.55) +
        x('translate(42.4 27.2) rotate(-13)', 0.8) + x('translate(57.6 27.2) rotate(13)', 0.8) + x('translate(50 26)', 1.1) +
        `<circle cx="50" cy="25.6" r="1.4" fill="#fff"/>` +
        f(18, 34, 1.2) + f(83, 36, 1) + f(13, 58, .9) + f(87, 62, 1.3) + f(24, 18, .8) + f(77, 18, .9) +
        `<circle cx="28" cy="46" r=".7" fill="#fff"/><circle cx="74" cy="50" r=".6" fill="#fff"/><circle cx="16" cy="76" r=".7" fill="#e0f2fe"/>` +
        emb(look);
      return svg(p, defs, ['#1f2d5c', '#090e25'], body);
    },

    /* 6. Купальский — венок с цветком папоротника, льняная рубаха с вышивкой, светлячки */
    kupala(look) {
      const p = `sk${++seq}`, e = eyesOf(look);
      const defs = skinDef(p) +
        lg(`${p}h`, [[0, '#f5d68f'], [0.5, '#d4a054'], [1, '#8a5a24']]) +
        lg(`${p}l`, [[0, '#fbf7ec'], [0.55, '#dcd2b8'], [1, '#9c8f70']]) +
        rg(`${p}w`, [[0, '#fff7c2', 0.95], [0.4, '#fb923c', 0.45], [1, '#f97316', 0]]) +
        rg(`${p}r`, [[0, '#fff7ae'], [0.45, '#f97316'], [1, '#b91c1c']]) +
        glowG(`${p}y`, '#d9f99d', 0.85) +
        `<circle id="${p}d" r="2.1" fill="#facc15" stroke="#fff" stroke-width="2.4" stroke-dasharray="1.3 .9"/>` +
        `<circle id="${p}v" r="2" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2.2" stroke-dasharray="1 .8"/>` +
        `<path id="${p}t" d="M0 0C1.6-1.8 4.2-1.8 5.4 0C4.2 1.8 1.6 1.8 0 0Z" fill="#4d8a2c" stroke="#1f3d12" stroke-width=".45"/>`;
      const u = (id, x, y, r = 0) => `<use href="#${p}${id}" transform="translate(${x} ${y})${r ? ` rotate(${r})` : ''}"/>`;
      const fly = (x, y) => `<circle cx="${x}" cy="${y}" r="4" fill="url(#${p}y)"/><circle cx="${x}" cy="${y}" r=".8" fill="#fefce8"/>`;
      const body =
        fly(16, 40) + fly(84, 32) + fly(12, 64) + fly(88, 70) + fly(27, 16) +
        // льняные волосы
        `<path d="M35 44C32.6 58 33 70 36 79L64 79C67 70 67.4 58 65 44C63 32 57 28 50 28C43 28 37 32 35 44Z" fill="url(#${p}h)" stroke="#6b4318" stroke-width=".8"/>` +
        // рубаха
        `<path d="M12 100C14 80 26 70 50 68C74 70 86 80 88 100Z" fill="url(#${p}l)" stroke="${D}" stroke-width="1.2"/>` +
        `<path d="M24 100C26 90 29 83 34 78M76 100C74 90 71 83 66 78" fill="none" stroke="#9c8f70" stroke-width=".8" opacity=".7"/>` +
        `<path d="M44.6 60V70.6Q50 74 55.4 70.6V60Z" fill="#dca07a"/>` +
        // красная вышивка: ворот и плечи
        `<path d="M39.6 69.4Q50 77.6 60.4 69.4M17 87Q23 77 35 73M83 87Q77 77 65 73" fill="none" stroke="#b91c1c" stroke-width="3.2" stroke-linecap="round"/>` +
        `<path d="M39.6 69.4Q50 77.6 60.4 69.4M17 87Q23 77 35 73M83 87Q77 77 65 73" fill="none" stroke="#fde68a" stroke-width=".9" stroke-dasharray="1.2 1.4"/>` +
        `<path d="M41 73.4l1.6 1.8 1.6-1.4 1.6 2 1.6-1.4 1.6 2 1.6-2 1.6 1.4 1.6-2 1.6 1.4 1.6-1.8" fill="none" stroke="#b91c1c" stroke-width=".8"/>` +
        face(p, e, 49, { rx: 11, ry: 12.6 }) +
        brows(45.4, '#9a6a30', 1) +
        // чёлка с пробором
        `<path d="M38.6 47C37.6 38.6 43 33.6 50 33.6C57 33.6 62.4 38.6 61.4 47C58.6 41 54.4 39.2 50 40C45.6 39.2 41.4 41 38.6 47Z" fill="url(#${p}h)" stroke="#6b4318" stroke-width=".7"/>` +
        `<path d="M50 34.4Q48.6 37.4 47 40" fill="none" stroke="#fdf0c8" stroke-width=".8" opacity=".7"/>` +
        // венок из полевых цветов
        `<circle cx="50" cy="30" r="15" fill="url(#${p}w)"/>` +
        `<path d="M33.6 45Q50 24 66.4 45" fill="none" stroke="#2f5a1c" stroke-width="3.6" stroke-linecap="round"/>` +
        u('t', 35.6, 40.6, -110) + u('t', 38.4, 36.4, -150) + u('t', 45, 32, -170) + u('t', 64.4, 40.6, -70) + u('t', 61.6, 36.4, -30) + u('t', 55, 32, -10) +
        u('d', 36, 42.4) + u('d', 64, 42.4) + u('v', 40.6, 36) + u('v', 59.4, 36) +
        `<circle cx="34" cy="47" r="2.4" fill="#dc2626" stroke="#7f1d1d" stroke-width=".5"/><circle cx="34" cy="47" r=".8" fill="#1f0a0a"/>` +
        `<circle cx="66" cy="47" r="2.4" fill="#dc2626" stroke="#7f1d1d" stroke-width=".5"/><circle cx="66" cy="47" r=".8" fill="#1f0a0a"/>` +
        u('d', 45.4, 32.4) + u('d', 54.6, 32.4) +
        // цветок папоротника
        `<g transform="translate(50 29)"><path d="M0-6.4L1.7-1.7L6.4 0L1.7 1.7L0 6.4L-1.7 1.7L-6.4 0L-1.7-1.7Z" fill="url(#${p}r)" stroke="#7f1d1d" stroke-width=".5" transform="rotate(22.5)"/>` +
        `<path d="M0-5L1.3-1.3L5 0L1.3 1.3L0 5L-1.3 1.3L-5 0L-1.3-1.3Z" fill="#fde047" stroke="#c2410c" stroke-width=".4"/><circle r="1.6" fill="#fffbeb"/></g>` +
        emb(look);
      return svg(p, defs, ['#1d3050', '#0a0f24'], body);
    },

    /* 7. Лесной — капюшон из мха и листьев, ветвистые рога с листвой */
    leshiy(look) {
      const p = `sk${++seq}`, e = eyesOf(look);
      const defs = shadowDefs(p, e) +
        glowG(`${p}v`, '#86efac', 0.35) +
        lg(`${p}c`, [[0, '#5a7a36'], [0.5, '#34501f'], [1, '#172a10']]) +
        lg(`${p}d`, [[0, '#8fb04a'], [0.4, '#557a2c'], [1, '#1f3614']]) +
        `<path id="${p}t" d="M0 0C1.8-2.2 5.2-2.4 7 0C5.2 2.4 1.8 2.2 0 0Z" stroke="#16300c" stroke-width=".5"/>`;
      const leaf = (x, y, r, c, s = 1) => `<use href="#${p}t" fill="${c}" transform="translate(${x} ${y}) rotate(${r})${s !== 1 ? ` scale(${s})` : ''}"/>`;
      const A = 'M39 27C35 21 30 16 24.4 12.6M31.6 18.6C28 18.6 24 20 20.6 22.4M28.4 15.8C27.4 12 28.2 9.2 30.8 7M34.6 21.6C33.8 17 34.8 13.6 36.8 10.6';
      const antler =
        `<path d="${A}" fill="none" stroke="${D}" stroke-width="4" stroke-linecap="round"/><path d="${A}" fill="none" stroke="#8b5a2b" stroke-width="2.4" stroke-linecap="round"/>` +
        `<path d="${A}" fill="none" stroke="#d2a06a" stroke-width=".7" stroke-linecap="round" transform="translate(-.4 -.4)"/>` +
        leaf(24.4, 12.6, -140, '#6fae3a') + leaf(20.6, 22.4, 170, '#8cc04a') + leaf(30.8, 7, -100, '#5d9a32', 0.9) + leaf(36.8, 10.6, -70, '#d9a33a', 0.85);
      // бугорки мха по краю капюшона
      const moss = [[24, 44, 3.4], [23, 56, 3.2], [22, 67, 3.4], [29, 26, 3.4], [38, 18.6, 3.4], [50, 16.4, 3.6], [62, 18.6, 3.4], [71, 26, 3.4], [76, 44, 3.4], [77, 56, 3.2], [78, 67, 3.4]]
        .map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 2 ? '#4f7428' : '#6b8f34'}" stroke="#1f3614" stroke-width=".6"/>`).join('');
      const body =
        `<ellipse cx="50" cy="30" rx="40" ry="28" fill="url(#${p}v)"/>` +
        mir(antler) +
        `<path d="${BODY}" fill="url(#${p}c)" stroke="${D}" stroke-width="1.2"/>` +
        leaf(22, 88, -40, '#557a2c', 1.3) + leaf(78, 88, -140, '#6b8f34', 1.3) + leaf(30, 80, -20, '#b7791f', 1.1) + leaf(70, 80, 200, '#4f7428', 1.1) +
        `<path d="M30 100C31 90 33 82 37 77M70 100C69 90 67 82 63 77" fill="none" stroke="#0f1f08" stroke-width="1.1" opacity=".7"/>` +
        `<path d="${HOOD}" fill="url(#${p}d)" stroke="${D}" stroke-width="1.2"/>` + moss + `<path d="${HOOD_SH}" fill="#0b1a06" opacity=".22"/>` +
        `<path d="M33 25Q26 36 25.4 54" fill="none" stroke="#c7e08a" stroke-width="1.3" opacity=".5" stroke-linecap="round"/>` +
        // листва на капюшоне
        leaf(33, 30, -60, '#8cc04a') + leaf(64, 26, 40, '#d9a33a') + leaf(27, 64, 100, '#6fae3a') + leaf(72, 62, 60, '#8cc04a', 1.1) +
        leaf(44, 21, -20, '#6fae3a', 0.9) + leaf(57, 21, 200, '#5d9a32', 0.9) + leaf(20, 74, 20, '#b7791f') + leaf(80, 74, 160, '#6fae3a') +
        shadowFace(p, e, 51) +
        `<path d="M36 64Q42 70 50 70.4Q58 70 64 64" fill="none" stroke="#2c4a18" stroke-width="1.6" opacity=".7"/>` +
        `<circle cx="15" cy="50" r="1" fill="#bef264"/><circle cx="86" cy="48" r=".9" fill="#bef264"/><circle cx="84" cy="80" r=".8" fill="#d9f99d"/>` +
        emb(look);
      return svg(p, defs, ['#1c3830', '#08120f'], body);
    },

    /* 8. Вороний — маска-клюв, плащ из чёрных перьев с фиолетовым отливом, перо в капюшоне */
    voron(look) {
      const p = `sk${++seq}`, e = eyesOf(look);
      const defs = shadowDefs(p, e) +
        glowG(`${p}v`, '#8b5cf6', 0.4) +
        lg(`${p}c`, [[0, '#3f2e66'], [0.45, '#1b1330'], [1, '#07050d']]) +
        lg(`${p}d`, [[0, '#5b4690'], [0.35, '#2a1f48'], [1, '#0a0714']]) +
        lg(`${p}k`, [[0, '#a4a2c0'], [0.3, '#4a4764'], [1, '#08070e']], 0, 0, 1, 0.5) +
        lg(`${p}q`, [[0, '#2dd4bf'], [0.5, '#7c3aed'], [1, '#1e1036']]) +
        lg(`${p}f`, [[0, '#3a2c5e'], [1, '#0d0918']], 0, 0, 0, 1) +
        // перо плаща: закруглённое, с фиолетовым отливом по краю
        `<path id="${p}t" d="M-4.4 0C-4.4 6.4-1.6 11 0 13.4C1.6 11 4.4 6.4 4.4 0Z" fill="url(#${p}f)" stroke="#07050d" stroke-width=".7"/>` +
        `<path id="${p}h" d="M3.4 1Q3 7.6 0 12.2" fill="none" stroke="#a78bfa" stroke-opacity=".55" stroke-width=".7"/>`;
      // ряды перьев на плечах (сверху вниз — нижние ряды рисуются первыми)
      const row = (y, x0, x1, dx, bend, hl = 1) => {
        let s = '';
        for (let x = x0; x <= x1; x += dx) {
          const t = `transform="translate(${x} ${+(y + Math.abs(x - 50) * bend).toFixed(1)}) rotate(${+((50 - x) * 0.45).toFixed(1)})"`;
          s += `<use href="#${p}t" ${t}/>` + (hl ? `<use href="#${p}h" ${t}/>` : '');
        }
        return s;
      };
      const body =
        `<ellipse cx="50" cy="40" rx="42" ry="32" fill="url(#${p}v)"/>` +
        `<path d="${BODY}" fill="url(#${p}c)" stroke="${D}" stroke-width="1.2"/>` +
        row(88, 14, 86, 8, -0.1, 0) + row(80, 19, 81, 7.75, -0.12) +
        `<path d="M16 90Q22 76 36 71" fill="none" stroke="#c4b5fd" stroke-width="1.2" opacity=".4" stroke-linecap="round"/>` +
        // перо, заткнутое за капюшон
        `<path d="M58 30C62 20 68 14 75.6 10.6C74 18 70 24 61 32Z" fill="url(#${p}q)" stroke="${D}" stroke-width=".8" stroke-linejoin="round"/>` +
        `<path d="M59.6 31Q66 20 75.6 10.6" fill="none" stroke="#e9d5ff" stroke-width=".55" opacity=".8"/>` +
        `<path d="M50 14C70 14 79 34 79 54L81 74C70 79 30 79 19 74L21 54C21 34 30 14 50 14Z" fill="url(#${p}d)" stroke="${D}" stroke-width="1.2"/>` +
        `<path d="M27 40q4 3 8 1M25.6 52q4 3 8 1M25 64q4 3 8 1M73 40q-4 3-8 1M74.4 52q-4 3-8 1M75 64q-4 3-8 1M38 24q4 3 8 1M62 24q-4 3-8 1" fill="none" stroke="#a78bfa" stroke-width=".7" opacity=".45" stroke-linecap="round"/>` +
        `<path d="${HOOD_SH}" fill="#000" opacity=".25"/>` +
        `<path d="M34 22Q25 34 24.4 54M40 17.6Q36 20 33 24" fill="none" stroke="#c4b5fd" stroke-width="1.4" opacity=".55" stroke-linecap="round"/>` +
        row(72.6, 22, 78, 7, -0.05) +
        `<path d="${OPEN}" fill="url(#${p}o)" stroke="${D}" stroke-width="1"/>` +
        // маска вокруг глаз
        `<path d="M33.6 45C37.6 37.6 45.6 37 50 41.6C54.4 37 62.4 37.6 66.4 45C62.6 51.6 56 53.4 50 51.4C44 53.4 37.4 51.6 33.6 45Z" fill="url(#${p}k)" stroke="#6d28d9" stroke-width=".7"/>` +
        gEye(p, 42.4, 45.6, e) + gEye(p, 57.6, 45.6, e) +
        // клюв
        `<path d="M44 48.6C45.6 57 48 65 50 73C52 65 54.4 57 56 48.6C54 50.4 52 51 50 51C48 51 46 50.4 44 48.6Z" fill="url(#${p}k)" stroke="${D}" stroke-width=".9" stroke-linejoin="round"/>` +
        `<path d="M55.4 51Q53.6 60 50.6 71" fill="none" stroke="#a78bfa" stroke-width=".8" opacity=".7" stroke-linecap="round"/>` +
        `<path d="M50 51V73" stroke="#1b1030" stroke-width=".6" opacity=".7"/><path d="M46.6 52Q48 60 49.6 68" fill="none" stroke="#e5e7eb" stroke-width=".9" opacity=".75" stroke-linecap="round"/><circle cx="48.2" cy="55" r=".55" fill="#0a0714"/><circle cx="51.8" cy="55" r=".55" fill="#0a0714"/>` +
        `<path d="M39 40.2Q43 38.6 46.6 40.4" fill="none" stroke="#fff" stroke-width=".8" opacity=".55" stroke-linecap="round"/>` +
        emb(look, 0, 2);
      return svg(p, defs, ['#251a40', '#07050f'], body);
    },

    /* 9. Княжий (легендарный) — шапка с собольей опушкой и самоцветами, кафтан с золотым шитьём */
    knyaz(look) {
      const p = `sk${++seq}`, e = eyesOf(look);
      const defs = skinDef(p) +
        rg(`${p}w`, [[0, '#fff3c4', 0.85], [0.4, '#fbbf24', 0.35], [1, '#f59e0b', 0]]) +
        lg(`${p}c`, [[0, '#fb7185'], [0.35, '#be123c'], [1, '#4c0519']], 0, 0, 0.6, 1) +
        lg(`${p}a`, [[0, '#fff7cc'], [0.35, '#fbbf24'], [0.75, '#b45309'], [1, '#78350f']]) +
        lg(`${p}u`, [[0, '#8a5a34'], [0.5, '#4a2c16'], [1, '#22120a']], 0, 0, 0, 1) +
        rg(`${p}r`, [[0, '#fecaca'], [0.4, '#dc2626'], [1, '#7f1d1d']], 0.35, 0.3, 0.7) +
        rg(`${p}g`, [[0, '#bbf7d0'], [0.4, '#16a34a'], [1, '#14532d']], 0.35, 0.3, 0.7) +
        rg(`${p}s`, [[0, '#bfdbfe'], [0.4, '#2563eb'], [1, '#1e3a8a']], 0.35, 0.3, 0.7);
      const gem = (x, y, r, g) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${p}${g})" stroke="#78350f" stroke-width=".6"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="#fff" opacity=".85"/>`;
      const body =
        `<circle cx="50" cy="38" r="46" fill="url(#${p}w)"/>` +
        // кафтан
        `<path d="${BODY}" fill="url(#${p}c)" stroke="${D}" stroke-width="1.2"/>` +
        `<path d="M24 100C26 92 28 86 32 81M76 100C74 92 72 86 68 81" fill="none" stroke="#3b0715" stroke-width="1" opacity=".6"/>` +
        `<path d="M14 92Q18 80 30 74" fill="none" stroke="#fecdd3" stroke-width="1.2" opacity=".4" stroke-linecap="round"/>` +
        `<path d="M50 76V100" stroke="#78350f" stroke-width="3.8"/><path d="M50 76V100" stroke="url(#${p}a)" stroke-width="2.4"/>` +
        // золотые бармы-оплечье с медальонами
        `<path d="M17 86C23 74 36 69 50 69C64 69 77 74 83 86L78.6 91.4C72 82.6 62 78.6 50 78.6C38 78.6 28 82.6 21.4 91.4Z" fill="url(#${p}a)" stroke="#78350f" stroke-width="1"/>` +
        `<path d="M20.6 87.4C27 78 38 74 50 74C62 74 73 78 79.4 87.4" fill="none" stroke="#9f1239" stroke-width="1" stroke-dasharray="2.6 1.4"/>` +
        gem(28.4, 80.4, 1.7, 'g') + gem(71.6, 80.4, 1.7, 'g') + gem(38.6, 75.4, 1.4, 's') + gem(61.4, 75.4, 1.4, 's') +
        // стоячий ворот-ожерелье с жемчугом
        `<path d="M44.8 60V68H55.2V60Z" fill="#dca07a"/>` +
        `<path d="M36 64.4C40 72 60 72 64 64.4L66.4 70.6C60 78.4 40 78.4 33.6 70.6Z" fill="url(#${p}a)" stroke="#78350f" stroke-width="1"/>` +
        `<path d="M37 69.4Q50 76 63 69.4" fill="none" stroke="#fffbeb" stroke-width="1.3" stroke-dasharray=".1 2.2" stroke-linecap="round"/>` +
        gem(50, 73.2, 1.6, 'r') +
        // волосы из-под шапки, лицо, борода
        `<path d="M38.4 44C36.8 52 37.6 58 40.6 61.6L41.6 47ZM61.6 44C63.2 52 62.4 58 59.4 61.6L58.4 47Z" fill="#6b3f1d" stroke="#3b2412" stroke-width=".6"/>` +
        face(p, e, 51, { rx: 11, ry: 12.4, mouth: false }) +
        brows(47.2, '#4a2c16', 1.4) +
        `<path d="M40.2 56C41 61.6 45 65.2 50 65.2C55 65.2 59 61.6 59.8 56C57.4 59.2 54 60 50 60C46 60 42.6 59.2 40.2 56Z" fill="#7a4a24" stroke="#3b2412" stroke-width=".6"/>` +
        `<path d="M50 57.8C47.6 56.8 44.8 57.2 43.4 59.6C45.8 58.8 48 59.2 50 59.2C52 59.2 54.2 58.8 56.6 59.6C55.2 57.2 52.4 56.8 50 57.8Z" fill="#5c3312"/><path d="M48 61.6Q50 62.6 52 61.6" fill="none" stroke="#8a3b2a" stroke-width=".8" stroke-linecap="round"/>` +
        // шапка: золотая тулья с филигранью
        `<path d="M36.6 40C36.6 27 42.6 18.4 50 17.4C57.4 18.4 63.4 27 63.4 40Z" fill="url(#${p}a)" stroke="#78350f" stroke-width="1.1"/>` +
        `<path d="M50 18V39M43.4 21Q40.4 29 40.6 39M56.6 21Q59.6 29 59.4 39" fill="none" stroke="#92400e" stroke-width=".8"/>` +
        `<path d="M46.6 24q-2 3 0 5M53.4 24q2 3 0 5M46 33q-2 2.6 0 4.6M54 33q2 2.6 0 4.6" fill="none" stroke="#fef3c7" stroke-width=".6" opacity=".8"/>` +
        `<path d="M41 23Q38.4 29 38.4 35" fill="none" stroke="#fff" stroke-width="1.2" opacity=".7" stroke-linecap="round"/>` +
        gem(50, 28, 2.6, 'r') + gem(43.6, 33, 1.8, 'g') + gem(56.4, 33, 1.8, 'g') + gem(50, 35.6, 1.5, 's') +
        // навершие без креста: золотой столбик и самоцвет
        `<path d="M48.6 17.8L49.2 13.6H50.8L51.4 17.8Z" fill="url(#${p}a)" stroke="#78350f" stroke-width=".7"/>` +
        gem(50, 11, 3, 's') +
        // соболья опушка
        `<path d="M33.8 40.6C35 37 38 38.4 40 36.8C42.6 35 45.6 37 48 35.4C50 34.6 52 34.6 52 35.4C54.4 37 57.4 35 60 36.8C62 38.4 65 37 66.2 40.6L67 46.6C65 48.6 62.6 45.6 60 47.2C57 45.2 54 46.8 50 45.4C46 46.8 43 45.2 40 47.2C37.4 45.6 35 48.6 33 46.6Z" fill="url(#${p}u)" stroke="#1a0d05" stroke-width=".8"/>` +
        `<path d="M37 40.4q1 2 0 4M41 39.4q1 2.2 0 4.2M45 38.8q1 2.2 0 4.2M49 38.4q1 2.2 0 4.2M53 38.4q1 2.2 0 4.2M57 38.8q1 2.2 0 4.2M61 39.4q1 2.2 0 4.2M64.6 40.4q1 2 0 4" fill="none" stroke="#a87a50" stroke-width=".7" opacity=".75" stroke-linecap="round"/>` +
        spark(20, 34, 2.4, '#fef3c7') + spark(81, 30, 2, '#fde68a') + spark(86, 56, 1.6, '#fef3c7') +
        emb(look, 0, 4);
      return svg(p, defs, ['#35265a', '#110a24'], body);
    },
  };
  return S;
})();
