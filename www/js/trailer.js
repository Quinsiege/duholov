'use strict';
/* Трейлер «Тонкая ночь» — короткий фильм при первом заходе в игру, потом — из «Книги Ордена».
   4.14: переснят. ~48 секунд кино: камера с наездами и тряской на ударах, глубина (три слоя ночного города,
   частицы на холсте), вспышки на склейках, зерно плёнки, виньетка и кинорамка. Сюжет — разлом Нави, Кощей,
   рой духов, прячущихся в фонарях, лужах и проводах, — и сама игра: карта с кругом Ловчего, поимка оберегом,
   дружины и Капища, бестиарий, наставник Велимир и сам игрок. Картинки — арты игры (Art, CutArt), музыка —
   мелодия ночной карты, удары, гул и шорохи — WebAudio (Sfx). */

const Trailer = {
  KEY: 'duholov.trailer', VER: '4',
  due() { try { return localStorage.getItem(this.KEY) !== this.VER; } catch (e) { return false; } },
  seen() { try { localStorage.setItem(this.KEY, this.VER); } catch (e) {} },

  // Сцены: [длительность, сцена, подпись]; подписи внутри сцены — в CUES
  SCENES: [
    [5000, 'city', 'Твой город. Обычная ночь.'],
    [5000, 'crack', 'Но раз в тысячу лет граница между <b>Явью</b> и <b>Навью</b> истончается…'],
    [5600, 'koschey', '…и <b>Кощей Бессмертный</b> распахивает врата.'],
    [4400, 'swarm', 'Сотни <b>духов Нави</b> вырвались в наш мир.'],
    [5400, 'hide', 'Они прячутся <b>в фонарях</b>…'],
    [5200, 'map', 'Выйди на улицу — <b>духи уже рядом</b>.'],
    [5400, 'springs', 'Родники у настоящих мест города дарят <b>обереги</b>.'],
    [4800, 'catch', 'Брось оберег — и дух <b>твой</b>.'],
    [6000, 'evolve', 'Расти духов — и они <b>превращаются</b>.'],
    [5600, 'cocoon', 'Гуляй — и из <b>коконов</b> вылупятся редкие духи.'],
    [6400, 'dex', ''],
    [4600, 'clans', 'Вступи в <b>дружину</b>. Держите Капища вместе.'],
    [5800, 'duel', 'Бейся за <b>Капища</b>: дух против духа.'],
    [7000, 'raid', 'Разломы открываются каждый час. Собери <b>отряд</b> и одолей стража Нави.'],
    [7600, 'auction', 'Покупай и продавай духов на <b>аукционе</b>.'],
    [6400, 'weather', 'Настоящая <b>погода</b> и <b>луна</b> решают, кто выйдет на улицы.'],
    [5400, 'wardrobe', 'Собери свой <b>облик</b> Ловчего.'],
    [5400, 'league', 'Поднимайся в <b>Лиге</b> — стань лучшим Ловчим сезона.'],
    [5600, 'mentor', '«Ордену нужен новый Ловчий…»'],
    [0, 'logo', ''],
  ],
  // события внутри сцен: [сцена, через сколько мс, что сделать]
  CUES: [
    ['crack', 4300, t => t.hit(2)],
    // удар молнии в землю: Кощей встаёт из вспышки; ещё два разряда следом
    ['koschey', 0, t => { t.hit(2); t.fx.burst({ x: .5, y: .8, n: 110, c: ['187,247,208', '255,255,255', '192,132,252'] }); }],
    ['koschey', 1400, t => { t.hit(1); t.fx.burst({ x: .5, y: .8, n: 50, c: ['187,247,208', '255,255,255'], rings: 1 }); }],
    ['koschey', 2600, t => t.hit(1)],
    ['hide', 1800, t => t.cap('…<b>в лужах</b>…')],
    ['hide', 3600, t => t.cap('…и <b>в проводах</b>.')],
    ['catch', 2100, t => { t.hit(1); t.fx.burst(); }],
    ['evolve', 2050, t => { t.hit(1); t.fx.burst({ y: .46, n: 70, c: ['253,224,71', '255,140,60', '255,255,255'] }); }],
    ['evolve', 3950, t => { t.hit(2); t.fx.burst({ y: .46, n: 130, c: ['253,224,71', '255,140,60', '255,255,255'] }); }],
    ['cocoon', 0, t => t.count('.fm-km b', 0, 10, 3200, 1)],
    ['cocoon', 3500, t => { t.hit(1); t.fx.burst({ y: .44, n: 100, c: ['56,189,248', '255,255,255', '253,224,71'] }); }],
    ['dex', 0, t => t.count('.fm-count b', 0, SPECIES.length, 3000, 0, 1400)],
    ['duel', 1200, t => t.hit(1)], ['duel', 2200, t => t.hit(1)], ['duel', 3200, t => t.hit(1)],
    ['duel', 4400, t => { t.hit(2); t.fx.burst({ x: .75, y: .5, n: 80, c: ['254,240,138', '167,139,250', '255,255,255'] }); }],
    ['raid', 2300, t => t.hit(1)], ['raid', 3000, t => t.hit(1)], ['raid', 3700, t => t.hit(1)], ['raid', 4400, t => t.hit(1)],
    ['raid', 5200, t => { t.hit(2); t.fx.burst({ y: .36, n: 140, c: ['249,115,22', '253,224,71', '255,255,255', '192,132,252'] }); }],
    ['weather', 3200, t => t.fx.mode('snow')], ['weather', 4800, t => t.fx.mode('weather')],
    ['league', 2900, t => { const e = t.q('.fm-row.me em'); if (e) e.textContent = '1'; }],
    ['league', 3500, t => t.fx.burst({ y: .5, n: 90, c: ['253,224,71', '244,114,182', '96,165,250', '134,239,172'] })],
    ['mentor', 2800, t => t.cap('«…и он уже здесь. Это — <b>ты</b>.»')],
    ['logo', 0, t => t.hit(2)],
  ],

  /* ---------- рисунки трейлера ---------- */
  // ночной город: объём градиентом, лунная кромка крыш, окна со свечением; у разных слоёв — свои детали:
  // дальний — телебашня с мигающим огнём, средний — церкви с золотыми луковками, ближний — трубы и водонапорная башня
  skyline(id, seed, o) {
    let r = seed;
    const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647, f = v => v.toFixed(1);
    let b = '', rim = '', win = '', gold = '', extra = '', x = 0;
    while (x < 1600) {
      const w = 16 + rnd() * 38, h = o.hMin + rnd() * (o.hMax - o.hMin), top = 400 - h, k = rnd();
      b += `<rect x="${f(x)}" y="${f(top)}" width="${f(w + .6)}" height="${f(h)}"/>`;
      rim += `<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="1.3"/>`;
      if (o.domes && k < .2) { // церковь: барабан, золотая луковка, крест
        const cx = x + w / 2, dw = Math.min(w * .52, 16);
        b += `<rect x="${f(cx - dw * .42)}" y="${f(top - dw * .8)}" width="${f(dw * .84)}" height="${f(dw * .8 + 1)}"/>`;
        gold += `<path d="M${f(cx - dw / 2)} ${f(top - dw * .8)}q0 -${f(dw * .75)} ${f(dw / 2)} -${f(dw * 1.25)}q${f(dw / 2)} ${f(dw * .5)} ${f(dw / 2)} ${f(dw * 1.25)}z"/>`
          + `<rect x="${f(cx - .7)}" y="${f(top - dw * 2.45)}" width="1.4" height="${f(dw * .5)}"/><rect x="${f(cx - 3.2)}" y="${f(top - dw * 2.3)}" width="6.4" height="1.3"/>`;
      } else if (o.chimneys && k < .3) { // трубы
        b += `<rect x="${f(x + w * .2)}" y="${f(top - 9)}" width="4" height="9"/><rect x="${f(x + w * .6)}" y="${f(top - 6)}" width="3" height="6"/>`;
      } else if (k < .4) b += `<rect x="${f(x + w * .45)}" y="${f(top - 14)}" width="1.2" height="14"/><rect x="${f(x + w * .45 - 3)}" y="${f(top - 10)}" width="7" height="1"/>`; // антенна
      else if (k < .48) b += `<path d="M${f(x)} ${f(top)}l${f(w / 2)} -${f(w * .38)}l${f(w / 2)} ${f(w * .38)}z"/>`; // крыша-шатёр
      if (o.win) for (let wy = top + 7; wy < 394; wy += 9) {
        const row = rnd() < .25; // целый освещённый этаж — как в офисах
        for (let wx = x + 4; wx < x + w - 5; wx += 7) if (row ? rnd() < .8 : rnd() < o.win) win += `<rect x="${f(wx)}" y="${f(wy)}" width="3.2" height="4.4"/>`;
      }
      x += w;
    }
    if (o.tower) { // телебашня: игла с площадками и красным огнём
      const cx = 1060;
      extra += `<path d="M${cx - 16} 400L${cx - 3} 70h6L${cx + 16} 400z"/><rect x="${cx - 12}" y="150" width="24" height="10" rx="3"/><rect x="${cx - 8}" y="110" width="16" height="6" rx="2"/><rect x="${cx - 1}" y="18" width="2" height="54"/>`;
      extra += `<circle class="fm-red" cx="${cx}" cy="18" r="3.4" fill="#ff4d6d"/><circle class="fm-red" cx="${cx}" cy="18" r="10" fill="#ff4d6d" opacity=".35"/>`;
    }
    if (o.waterTower) {
      const cx = 420;
      extra += `<rect x="${cx - 2}" y="238" width="4" height="162"/><rect x="${cx - 14}" y="262" width="3" height="138"/><rect x="${cx + 11}" y="262" width="3" height="138"/><path d="M${cx - 20} 262h40v-22q-20 -16 -40 0z"/>`;
    }
    return `<svg viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>
      <linearGradient id="fmg-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.top}"/><stop offset="1" stop-color="${o.bot}"/></linearGradient>
      <linearGradient id="fmd-${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5a12"/><stop offset=".45" stop-color="#ffe7a3"/><stop offset="1" stop-color="#a86a18"/></linearGradient>
      <filter id="fmb-${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>
      <g fill="url(#fmg-${id})">${b}${extra}</g>
      <g fill="${o.rim}" opacity=".75">${rim}</g>
      ${gold ? `<g fill="url(#fmd-${id})" opacity="${o.goldA || .8}">${gold}</g>` : ''}
      ${win ? `<g fill="#ffb347" filter="url(#fmb-${id})" opacity=".85">${win}</g><g class="fm-wins" fill="#ffe2a0">${win}</g>` : ''}
    </svg>`;
  },
  // кованый фонарь: столб с кольцами и завитками, стеклянный плафон, конус света, лужица света на земле
  lamp() {
    return `<svg viewBox="0 0 120 240" aria-hidden="true"><defs>
      <linearGradient id="fml-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a3" stop-opacity=".55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></linearGradient>
      <radialGradient id="fml-halo"><stop offset="0" stop-color="#fff3c4" stop-opacity=".9"/><stop offset=".35" stop-color="#ffcf6b" stop-opacity=".45"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
      <radialGradient id="fml-pool"><stop offset="0" stop-color="#ffd27a" stop-opacity=".6"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
      <linearGradient id="fml-iron" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#120c24"/><stop offset=".35" stop-color="#3a2f63"/><stop offset=".55" stop-color="#1c1538"/><stop offset="1" stop-color="#0b0718"/></linearGradient>
      <radialGradient id="fml-glass" cx=".5" cy=".4"><stop offset="0" stop-color="#fffbeb"/><stop offset=".5" stop-color="#ffe08a"/><stop offset="1" stop-color="#f59e0b"/></radialGradient></defs>
      <path d="M50 66L4 240H116L70 66z" fill="url(#fml-cone)"/>
      <ellipse cx="60" cy="234" rx="54" ry="9" fill="url(#fml-pool)"/>
      <circle cx="60" cy="54" r="40" fill="url(#fml-halo)"/>
      <path d="M52 240L55 224H65L68 240z" fill="url(#fml-iron)"/><rect x="50" y="222" width="20" height="4" rx="1.5" fill="#2a2046"/>
      <rect x="56.5" y="72" width="7" height="152" fill="url(#fml-iron)"/>
      <rect x="54" y="128" width="12" height="4" rx="2" fill="#2f2552"/><rect x="54" y="186" width="12" height="4" rx="2" fill="#2f2552"/>
      <path d="M57 92c-10 0-14-8-8-12s10 2 6 5M63 92c10 0 14-8 8-12s-10 2-6 5" fill="none" stroke="#2f2552" stroke-width="2.4" stroke-linecap="round"/>
      <rect x="52" y="66" width="16" height="7" rx="2" fill="#241b44"/>
      <path d="M47 42h26l-3 24H50z" fill="url(#fml-glass)"/>
      <path d="M47 42h26l-3 24H50zM60 42v24M53.5 42l-1.6 24M66.5 42l1.6 24" fill="none" stroke="#1c1538" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M43 43L60 28 77 43z" fill="#241b44"/><path d="M43 43L60 28 77 43" fill="none" stroke="#f3cf6b" stroke-opacity=".5" stroke-width="1"/>
      <circle cx="60" cy="25" r="3.2" fill="#2f2552"/><circle cx="60" cy="25" r="1.2" fill="#f3cf6b" opacity=".7"/>
      <g fill="#fff3c4">${[[30, 40], [88, 60], [40, 86], [82, 30], [95, 96]].map(([cx, cy], i) => `<circle class="fm-moth" style="--i:${i}" cx="${cx}" cy="${cy}" r="1.3"/>`).join('')}</g>
    </svg>`;
  },
  // молния: ломаная из середин отрезков со сдвигом (чем мельче, тем меньше сдвиг) и 2–3 ветвями вниз-вбок
  bolt(x0, y0, x1, y1, seed, disp = 60, twig = false) {
    let r = seed;
    const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647, f = v => v.toFixed(1);
    let pts = [[x0, y0], [x1, y1]], d = disp;
    for (let it = 0; it < (twig ? 4 : 6); it++) {
      const np = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        np.push([(ax + bx) / 2 + (rnd() - .5) * d, (ay + by) / 2 + (rnd() - .5) * d * .35], [bx, by]);
      }
      pts = np; d *= .55;
    }
    const path = 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L');
    if (twig) return path;
    let br = '';
    for (let k = 0; k < 3; k++) {
      const i = 8 + Math.floor(rnd() * (pts.length - 20)), [sx, sy] = pts[i], len = 40 + rnd() * 90, a = (rnd() < .5 ? -1 : 1) * (.35 + rnd() * .6);
      br += this.bolt(sx, sy, sx + Math.sin(a) * len, sy + Math.cos(a) * len, 1 + Math.floor(rnd() * 1e6), disp * .45, true);
    }
    return { path, br };
  },
  // слой дождя: плитка со случайными штрихами (бесшовно по вертикали) — near ближе: толще, ярче, длиннее
  rainTile(seed, n, len, w, a) {
    let r = seed;
    const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = (rnd() * 120).toFixed(1), y = rnd() * 240, l = len * (.6 + rnd() * .6);
      for (const dy of [0, -240]) s += `<line x1="${x}" y1="${(y + dy).toFixed(1)}" x2="${x}" y2="${(y + dy + l).toFixed(1)}"/>`;
    }
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="240"><g stroke="#dbeafe" stroke-opacity="${a}" stroke-width="${w}" stroke-linecap="round">${s}</g></svg>`)}")`;
  },
  // мокрый асфальт, лужа: бегущий блик, дрожащее отражение луны, круги от капель и брызги
  puddle() {
    const drops = [[150, 118, 0, 1.5], [96, 124, .5, 1.3], [214, 126, 1.1, 1.6], [122, 108, .8, 1.2], [188, 112, .25, 1.4], [70, 118, 1.3, 1.5], [238, 114, .65, 1.3], [160, 132, 1.5, 1.4]];
    return `<svg viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
      <linearGradient id="fmp-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34508f"/><stop offset=".45" stop-color="#18305c"/><stop offset="1" stop-color="#0b1a33"/></linearGradient>
      <linearGradient id="fmp-shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e0f2fe" stop-opacity="0"/><stop offset=".5" stop-color="#e0f2fe" stop-opacity=".22"/><stop offset="1" stop-color="#e0f2fe" stop-opacity="0"/></linearGradient>
      <radialGradient id="fmp-moon"><stop offset="0" stop-color="#fff7d6" stop-opacity=".95"/><stop offset=".6" stop-color="#fde68a" stop-opacity=".35"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>
      <clipPath id="fmp-clip"><ellipse cx="150" cy="118" rx="126" ry="36"/></clipPath>
      <filter id="fmp-soft"><feGaussianBlur stdDeviation="1.4"/></filter></defs>
      <g fill="#3a2f63" opacity=".45">${Array.from({ length: 50 }, (_, i) => `<circle cx="${(i * 73) % 300}" cy="${60 + (i * 37) % 110}" r="${.5 + (i % 3) * .35}"/>`).join('')}</g>
      <ellipse cx="150" cy="118" rx="126" ry="36" fill="url(#fmp-water)"/>
      <g clip-path="url(#fmp-clip)">
        <path d="M40 104h70M60 114h110M150 126h80M30 128h50" stroke="#9fd8ff" stroke-opacity=".16" stroke-width="1.2" stroke-linecap="round"/>
        <ellipse class="fm-mref" cx="206" cy="110" rx="18" ry="5" fill="url(#fmp-moon)" filter="url(#fmp-soft)"/>
        <rect class="fm-shim" x="-90" y="78" width="70" height="80" fill="url(#fmp-shine)"/>
      </g>
      <ellipse cx="150" cy="118" rx="126" ry="36" fill="none" stroke="#7fe8dc" stroke-opacity=".4" stroke-width="1.3"/>
      <ellipse cx="150" cy="116" rx="122" ry="33" fill="none" stroke="#e0f2fe" stroke-opacity=".12" stroke-width=".8"/>
      ${drops.map(([x, y, d, t]) => `<g class="fm-rp" style="--d:${d}s;--t:${t}s"><ellipse cx="${x}" cy="${y}" rx="15" ry="4.2"/><ellipse class="in" cx="${x}" cy="${y}" rx="8" ry="2.2"/></g>`
        + `<g class="fm-spl" style="--d:${d}s;--t:${t}s">${[-1, 0, 1].map(k => `<circle cx="${x}" cy="${y}" r="${k ? .9 : 1.2}" style="--x:${k * 4}px"/>`).join('')}</g>`).join('')}
    </svg>`;
  },
  // деревянный столб с изоляторами, провисшие провода со свечением; живая дуга (три формы по очереди), вспышка и сноп искр
  wires() {
    const W = ['M40 37Q220 118 420 60', 'M64 37Q230 128 420 76', 'M88 37Q240 138 420 92'];
    const arcs = [11, 23, 37].map(sd => this.bolt(168, 77, 197, 90, sd, 16, true));
    return `<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
      <linearGradient id="fmw-pole" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a1024"/><stop offset=".4" stop-color="#4a3040"/><stop offset="1" stop-color="#140c1c"/></linearGradient>
      <radialGradient id="fmw-ins" cx=".35" cy=".3"><stop offset="0" stop-color="#e0fffb"/><stop offset=".5" stop-color="#5eead4"/><stop offset="1" stop-color="#0f766e"/></radialGradient>
      <radialGradient id="fmw-flash"><stop offset="0" stop-color="#fffbeb" stop-opacity=".95"/><stop offset=".3" stop-color="#fde047" stop-opacity=".5"/><stop offset="1" stop-color="#a78bfa" stop-opacity="0"/></radialGradient>
      <filter id="fmw-glow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="3"/></filter></defs>
      <path d="M56 240L60 34h8l4 206z" fill="url(#fmw-pole)"/>
      <rect x="26" y="44" width="76" height="7" rx="2" fill="#3a2433"/><rect x="26" y="44" width="76" height="1.6" fill="#8a5a6a" opacity=".6"/>
      ${[40, 64, 88].map(cx => `<rect x="${cx - 1.4}" y="38" width="2.8" height="8" fill="#241827"/><ellipse cx="${cx}" cy="37" rx="5" ry="4" fill="url(#fmw-ins)"/><ellipse cx="${cx - 1.6}" cy="35.6" rx="1.4" ry="1" fill="#fff" opacity=".8"/>`).join('')}
      <g fill="none" stroke-linecap="round">${W.map(d => `<path d="${d}" stroke="#a78bfa" stroke-opacity=".45" stroke-width="7" filter="url(#fmw-glow)"/><path d="${d}" stroke="#241a45" stroke-width="2.6"/><path d="${d}" stroke="#c4b5fd" stroke-opacity=".5" stroke-width=".8"/>`).join('')}</g>
      <circle class="fm-arcflash" cx="183" cy="83" r="34" fill="url(#fmw-flash)"/>
      <g class="fm-arc" fill="none" stroke-linecap="round" stroke-linejoin="round">${arcs.map((d, i) => `<g class="v v${i}"><path d="${d}" stroke="#fde047" stroke-width="6" opacity=".45" filter="url(#fmw-glow)"/><path d="${d}" stroke="#fef9c3" stroke-width="2.2"/><path d="${d}" stroke="#fff" stroke-width=".8"/></g>`).join('')}</g>
      <g fill="#fff3b0">${Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i - 4.5) * .32; return `<circle class="fm-spark" style="--i:${i};--x:${(Math.cos(a) * (18 + (i % 3) * 8)).toFixed(1)}px;--y:${(Math.sin(a) * 14 + 34 + (i % 4) * 6).toFixed(1)}px" cx="183" cy="83" r="${1 + (i % 3) * .4}"/>`; }).join('')}</g>
    </svg>`;
  },
  // кусок «Карты Нави» для сцены с картой: кварталы с объёмными домами и окнами, парк с ёлочками, канал с мостами,
  // золотые проспекты со свечением, фонари — узор повторяется, но крупно и вдали растворяется в дымке
  mapTile() {
    let s = `<rect width="400" height="400" fill="#120b25"/>`;
    // решётка земли
    for (let y = 0; y < 400; y += 20) for (let x = (y / 20) % 2 ? 10 : 0; x < 400; x += 20) s += `<path d="M${x + 10} ${y + 2}l8 8-8 8-8-8z" fill="none" stroke="#f3cf6b" stroke-opacity=".05"/>`;
    // парк
    s += `<rect x="228" y="22" width="164" height="118" rx="6" fill="#0f2c24" stroke="#1d5a44" stroke-width="1.5"/>`;
    for (let i = 0; i < 26; i++) { const tx = 240 + (i * 53) % 140, ty = 34 + (i * 37) % 96; s += `<path d="M${tx} ${ty - 7}l5 9h-10z" fill="#34d399" fill-opacity=".35"/>`; }
    // канал
    s += `<rect x="0" y="268" width="400" height="24" fill="#0b3142"/><path d="M0 268H400M0 292H400" stroke="#2dd4bf" stroke-opacity=".6" stroke-width="1.4"/>`;
    // дома: крыша, южная стена с окнами, золотая кромка
    const B = [[20, 22, 70, 50, 14], [104, 20, 44, 72, 20], [160, 30, 50, 40, 10], [20, 96, 56, 44, 12], [96, 116, 112, 34, 16], [20, 162, 42, 54, 18], [84, 166, 60, 40, 12], [160, 170, 50, 60, 22], [236, 168, 70, 38, 12], [322, 160, 66, 56, 16], [236, 222, 150, 26, 8], [20, 306, 80, 56, 14], [120, 312, 50, 70, 20], [190, 306, 90, 40, 12], [300, 310, 88, 62, 18]];
    for (const [x, y, w, h, d] of B) {
      s += `<rect x="${x}" y="${y + d}" width="${w}" height="${h}" fill="#150e2e"/>`; // тень-стена
      for (let wx = x + 4; wx < x + w - 3; wx += 6) if ((wx * 7 + y) % 3) s += `<rect x="${wx}" y="${y + h + 2}" width="2" height="${Math.max(2, d - 5)}" fill="#ffc466" fill-opacity="${((wx * 13) % 5) / 8 + .2}"/>`;
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="#2c2154" stroke="#f3cf6b" stroke-opacity=".45" stroke-width="1"/>`;
    }
    // дороги: свечение, кайма, золото, блик; мосты через канал
    const R = 'M0 10H400M200 0V400M0 150H400M72 150V400M320 0V150';
    s += `<path d="${R}" stroke="#fbbf24" stroke-opacity=".14" stroke-width="22" fill="none"/><path d="${R}" stroke="#06030d" stroke-width="10" fill="none"/>`
      + `<path d="${R}" stroke="#e0b45a" stroke-width="6.5" fill="none"/><path d="${R}" stroke="#fff6d6" stroke-opacity=".55" stroke-width="1.4" fill="none"/>`
      + `<path d="M190 264h20v32h-20zM62 264h20v32h-20z" fill="#e0b45a" opacity=".9"/>`;
    // фонари
    for (const [x, y] of [[40, 10], [120, 10], [280, 10], [360, 10], [200, 60], [200, 110], [200, 200], [200, 330], [30, 150], [140, 150], [260, 150], [380, 150], [72, 220], [72, 360], [320, 60]])
      s += `<circle cx="${x}" cy="${y}" r="9" fill="#ffc466" fill-opacity=".16"/><circle cx="${x}" cy="${y}" r="2.2" fill="#fff0c8"/>`;
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">${s}</svg>`)}")`;
  },

  /* ---------- 4.14: сцены с механиками, стена бестиария, удар молнии при появлении Кощея ---------- */
  // удар молнии в землю там, где встаёт Кощей: толстый разряд с ветвями, вспышка у земли; дуги Нави вокруг него
  kStrike() {
    const b = this.bolt(200, 0, 200, 560, 41, 90);
    const main = `<svg class="fm-kbolt" viewBox="0 0 400 600" preserveAspectRatio="none" aria-hidden="true"><g><path class="o" d="${b.path}${b.br}"/><path class="m" d="${b.path}"/><path class="m t" d="${b.br}"/><path class="c" d="${b.path}"/></g></svg><i class="fm-kimpact"></i>`;
    const arcs = [[80, 100, 170, 220], [320, 90, 232, 210], [70, 250, 160, 340], [330, 240, 240, 340], [140, 30, 260, 90], [180, 290, 300, 390]]
      .map(([x0, y0, x1, y1], i) => `<g class="fm-ka a${i}">${[1, 2, 3].map(k => `<path class="v v${k}" d="${this.bolt(x0, y0, x1, y1, 7 + i * 31 + k * 5, 26, true)}"/>`).join('')}</g>`).join('');
    return { main, arcs: `<svg class="fm-karcs" viewBox="0 0 400 420" aria-hidden="true">${arcs}</svg>` };
  },
  // бестиарий: 3D-стена из всех карточек, Жар-птица — в центре; рамка и самоцвет — по редкости
  dexWall() {
    const list = SPECIES.slice(), mid = Math.floor(list.length / 2), zi = list.findIndex(s => s.id === 'zharptica');
    if (zi >= 0) [list[mid], list[zi]] = [list[zi], list[mid]];
    const cols = 9, rows = Math.ceil(list.length / cols), cr = (rows - 1) / 2, cc = (cols - 1) / 2;
    return `<div class="fm-wall" style="--cols:${cols}">${list.map((s, i) => {
      const r = Math.floor(i / cols), c = i % cols, dd = Math.hypot(r - cr, c - cc);
      return `<div class="fm-cd r${s.rar}" style="--dd:${dd.toFixed(2)}"><div class="f">${Art.spirit(s.id)}<i class="gem"></i></div><div class="b"></div></div>`;
    }).join('')}</div>`;
  },
  // сцены с механиками игры
  extraScenes() {
    const zl = Art.item('zlat'), look = (skin, cloak, eyes, emblem) => Art.avatar({ skin, cloak, eyes, emblem });
    const spring = `<div class="fm-spr"><i class="fm-sglow"></i><div class="fm-spring">${Art.asImg(Art.springIcon(false), 'spring:false:false')}</div>
      <div class="fm-loot">${[['charm', -30, -34], ['charm2', 30, -36], ['honey', -40, 4], ['water', 40, 2], ['sparks', 0, -48], ['charm3', -18, 30], ['incense', 20, 30]]
        .map(([k, x, y], i) => `<div style="--x:${x}vmin;--y:${y}vmin;--i:${i}">${Art.item(k)}</div>`).join('')}</div></div>`;
    const evolve = `<div class="fm-evo"><i class="fm-erays"></i>${['ugolek', 'kostrovik', 'zharogriv'].map((id, i) => `<div class="fm-es s${i}">${Art.spirit(id)}</div>`).join('')}
      <div class="fm-ename">${['Уголёк', 'Костровик', 'Жарогрив'].map((n, i) => `<b class="n${i}">${n}</b>`).join('')}</div></div>`;
    const cocoon = `<div class="fm-coc"><div class="fm-km"><b>0.0</b> км</div><div class="fm-steps">${'<i></i>'.repeat(8)}</div>
      <div class="fm-cocoon">${Art.cocoon(10)}</div><i class="fm-cflash"></i><div class="fm-hatch">${Art.spirit('rusalka')}</div></div>`;
    const duel = `<div class="fm-duel"><i class="fm-dfloor"></i>
      <div class="fm-df me"><div class="fm-hpbar"><i></i></div>${Art.spirit('gromovik')}</div>
      <div class="fm-df foe"><div class="fm-hpbar"><i></i></div>${Art.spirit('leshiy')}</div>
      <svg class="fm-dbeam" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">${[1, 2, 3].map(k => `<path class="v v${k}" d="${this.bolt(90, 60, 310, 60, 13 + k * 17, 40, true)}"/>`).join('')}</svg>
      <div class="fm-move">Шаровая молния!</div><div class="fm-flag">${Art.clanCrest('sokol')}</div></div>`;
    const raid = `<div class="fm-raid"><div class="fm-portal"><i class="p1"></i><i class="p2"></i><i class="p3"></i></div>
      <div class="fm-boss">${Art.spirit('gorynych')}</div>
      <div class="fm-bbar"><b>Змей Горыныч</b><span>★★★</span><div><i></i></div></div>
      <div class="fm-team">${[['bogatyr', '#b91c1c', '#fde047', 'sun'], [null, '#1d4ed8', '#5eead4', 'charm'], ['volhv', '#15803d', '#c084fc', 'moon']]
        .map(([sk, c, e, em], i) => `<div class="fm-tm" style="--i:${i}">${look(sk, c, e, em)}</div>`).join('')}</div>
      <div class="fm-shots">${Array.from({ length: 9 }, (_, i) => `<i style="--i:${i};--x:${[-26, 0, 26][i % 3]}vmin"></i>`).join('')}</div>
      <div class="fm-won">Разлом закрыт!</div></div>`;
    const auction = this.auctionUI();
    const weather = `<div class="fm-wx">${[['clear', 'sun', 'Ясно', 'Огонь и Лес сильнее', 'ugolek'], ['rain', 'rain', 'Дождь', 'Вода и Ток сильнее', 'kapelka'], ['snow', 'snow', 'Снег', 'Ветер и Вода сильнее', 'skvoznyak'], ['full', 'moon', 'Полнолуние', 'Русалки и Навки выходят чаще', 'rusalka']]
      .map(([k, cls, t, d, sp], i) => `<div class="fm-wp ${cls}" style="--i:${i}"><div class="fm-wi">${k === 'full' ? Art.moonIcon('full', 120) : Art.wxIcon(k, 120)}</div><div class="fm-wsp">${Art.spirit(sp)}</div><div class="fm-wt"><b>${t}</b><span>${d}</span></div></div>`).join('')}</div>`;
    const skins = [['hood', 'Ловчий'], ['kupala', 'Купальский'], ['leshiy', 'Лесной'], ['moroz', 'Морозный'], ['volhv', 'Волхв'], ['bogatyr', 'Богатырь'], ['voron', 'Вороний'], ['navstrazh', 'Навий страж'], ['zharpero', 'Жар-перо'], ['knyaz', 'Княжий']];
    const wardrobe = `<div class="fm-ward"><i class="fm-wrays"></i><div class="fm-wring"></div>${skins.map(([k, n], i) => `<div class="fm-sk" style="--i:${i}">${look(k, '#6d28d9', '#fde047', 'charm')}<b>${n}</b></div>`).join('')}</div>`;
    const league = `<div class="fm-lg"><div class="fm-lgh">${UI.menuIcon('trophy')}<b>Лига Ловчих</b><span>Сезон</span></div><div class="fm-rows">
      ${[['Ратибор', 'bogatyr', '#b91c1c', 4210], ['Милава', 'kupala', '#be185d', 3980], ['Светозар', 'volhv', '#15803d', 3655], ['Лада', 'leshiy', '#0f766e', 3120]].map(([n, sk, c, v], i) => `<div class="fm-row" style="--i:${i}"><em>${i + 1}</em>${look(sk, c, '#fde047', 'star')}<b>${n}</b><span>★ ${v}</span></div>`).join('')}
      <div class="fm-row me" style="--i:4"><em>5</em>${look('zharpero', '#6d28d9', '#fde047', 'crown')}<b>Ты</b><span>★ 4380</span><i class="crown">♛</i></div></div></div>`;
    return spring + evolve + cocoon + duel + raid + auction + weather + wardrobe + league;
  },

  // аукцион — настоящий интерфейс игры в телефоне (те же классы и стили, строки лотов — Auction.lotRow):
  // палец открывает лот Жар-птицы, покупает, переходит в «Мои лоты» — там итоги продажи своего духа
  auctionUI() {
    let rows = '', l0 = null;
    const had = S.d;
    try {
      S.d = Object.assign({}, had || {}, { zlat: 99999, sparks: 9999999 }); // чтобы цены не выглядели «не по карману»
      const exp = new Date(Date.now() + 47 * 3600e3).toISOString();
      const lot = (sid, lvl, power, seller, iv, a, d, st, cur, price, y) => ({ id: sid, sid, spirit: { s: sid, l: lvl, y: y ? 1 : 0 }, lvl, power, seller_name: seller, iv_pct: iv, iv_a: a, iv_d: d, iv_s: st, cur, price, expires_at: exp });
      const lots = [lot('zharptica', 30, 3120, 'Ратибор', 93, 15, 13, 14, 'zlat', 340, true), lot('rusalka', 24, 2210, 'Милава', 82, 13, 12, 12, 'zlat', 180),
        lot('gromovik', 22, 1980, 'Светозар', 71, 11, 10, 11, 'sparks', 5400), lot('leshiy', 20, 1760, 'Лада', 64, 9, 11, 9, 'sparks', 3900), lot('kostrovik', 18, 1210, 'Ратмир', 58, 8, 9, 9, 'sparks', 1800)];
      rows = lots.map((l, i) => Auction.lotRow(l, i)).join('');
      l0 = lots[0];
    } catch (e) { rows = ''; } finally { S.d = had; }
    if (!l0) return '';
    const s = SP[l0.sid], A = Rules.AUCTION, fee = Rules.auctionFee(180);
    const bar = (t, v) => `<div class="au-stat"><span>${t}</span><div class="pbar"><i style="width:${v / 15 * 100}%"></i></div><b>${v}/15</b></div>`;
    const sorts = [['new', 'Новые'], ['cheap', 'Дешевле'], ['dear', 'Дороже'], ['power', 'Сила'], ['iv', 'Оценка']];
    const buy = `<div class="au-bar"><input class="input au-q" placeholder="Найти духа по названию" tabindex="-1" readonly><button class="btn small au-filt" tabindex="-1">Фильтры</button></div>
      <div class="chips au-sorts">${sorts.map(([k, t]) => `<button class="${k === 'new' ? 'on' : ''}" tabindex="-1">${t}</button>`).join('')}</div><div class="au-list">${rows}</div>`;
    const mine = `<div class="au-info">Комиссия ${Math.round(A.FEE * 100)}% с продажи · лот живёт ${A.HOURS / 24} дня · до ${A.MAX_OPEN} лотов сразу</div>
      <button class="btn primary wide au-sell" tabindex="-1">Выставить духа</button><div class="au-mine">
      <div class="au-lot mine sold"><div class="au-art">${Art.img('rusalka')}</div><div class="row-main"><b>Русалка</b><small>СИЛА 2 210 · ${Auction.starsHtml(82)} 82%</small>
        <small class="au-st">Продан · ${Auction.priceHtml('zlat', 180)} · Милава · тебе ${Auction.priceHtml('zlat', 180 - fee)}</small></div></div>
      <div class="au-lot mine open"><div class="au-art">${Art.img('gromovik')}</div><div class="row-main"><b>Громовик</b><small>СИЛА 1 980 · ${Auction.starsHtml(71)} 71%</small>
        <small class="au-st">На продаже · ${Auction.priceHtml('sparks', 5400)} · ещё 1 д 22 ч</small></div><button class="btn small ghost au-cancel" tabindex="-1">Снять</button></div></div>`;
    const modal = `<div class="modal-wrap fm-am"><div class="modal au-modal"><div class="modal-title">${s.name}</div><div class="modal-body">
      <div class="au-big">${Art.img(l0.sid, true, false)}</div>
      <div class="au-tags"><span>${Art.elIcon(s.el, 14)} ${ELEMENTS[s.el].name}</span><span style="color:${RARITY[s.rar].color}">${RARITY[s.rar].name}</span><span>✦ Сияющий</span></div>
      <div class="au-meta">СИЛА <b>${U.fmtNum(l0.power)}</b> · уровень ${l0.lvl}</div>
      <div class="au-appr">Оценка Ордена ${Auction.starsHtml(l0.iv_pct)} <b>${l0.iv_pct}%</b></div>
      ${bar('Атака', l0.iv_a)}${bar('Защита', l0.iv_d)}${bar('Стойкость', l0.iv_s)}
      <div class="au-price-big">${Auction.priceHtml(l0.cur, l0.price)}</div><p class="small au-seller">Продаёт ${l0.seller_name} · до конца 1 д 23 ч</p></div>
      <div class="modal-btns"><button class="btn" tabindex="-1">Отмена</button><button class="btn primary fm-buy" tabindex="-1">Купить</button></div></div></div>`;
    const got = `<div class="modal-wrap fm-gm"><div class="modal"><div class="modal-title">Итоги аукциона</div><div class="modal-body"><div class="au-got">
      <div>${Art.img('rusalka')}<span>Русалка продан (Милава): +${Auction.priceHtml('zlat', 180 - fee)}</span></div></div></div>
      <div class="modal-btns"><button class="btn primary" tabindex="-1">Отлично</button></div></div></div>`;
    return `<div class="fm-auc"><div class="fm-aucw"><div class="fm-phone"><div class="screen au-screen fm-scr"><div class="screen-head"><button class="btn-round back" tabindex="-1">${UI.I.back}</button><h2>Аукцион</h2><div class="head-extra"></div></div>
      <div class="screen-body"><div class="fm-tabs"><div class="seg au-tabs ta"><button class="on" tabindex="-1">Купить</button><button tabindex="-1">Мои лоты</button></div>
        <div class="seg au-tabs tb"><button tabindex="-1">Купить</button><button class="on fm-tmine" tabindex="-1">Мои лоты</button></div></div>
        <div class="au-body"><div class="fm-av buy">${buy}</div><div class="fm-av mine">${mine}</div></div></div></div>
      ${modal}<div class="fm-toast"><div class="toast good">${s.name} теперь твоя!</div></div>${got}
      <div class="fm-finger"><i></i></div></div></div>
      <div class="fm-coins">${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i};--x:${(i * 37) % 100}%">${Art.item('zlat')}</i>`).join('')}</div></div>`;
  },
  // палец в телефоне: координаты целей (лот, «Купить», вкладка «Мои лоты») — по настоящей раскладке
  fitAuction(root) {
    const ph = root.querySelector('.fm-phone');
    if (!ph) return;
    const k = Math.min(innerWidth / 390, innerHeight * .74 / 700);
    ph.style.setProperty('--ps', k.toFixed(3));
    const pr = ph.getBoundingClientRect();
    const at = (sel, n) => {
      const e = ph.querySelector(sel);
      if (!e) return;
      const r = e.getBoundingClientRect();
      ph.style.setProperty(`--${n}x`, ((r.left + r.width * .5 - pr.left) / k).toFixed(0) + 'px');
      ph.style.setProperty(`--${n}y`, ((r.top + r.height * .5 - pr.top) / k).toFixed(0) + 'px');
    };
    at('.fm-av.buy .au-lot', 'a'); at('.fm-buy', 'b'); at('.fm-tmine', 'c'); at('.fm-gm .btn', 'd');
  },

  play(o = {}) {
    return new Promise(done => {
      Sfx.init();
      const calm = document.body.classList.contains('calm');
      const swarm = ['vayfayka', 'kapelka', 'ugolek', 'skvoznyak', 'mshonok', 'shoroh', 'paketik', 'zheludok', 'fonarnik', 'tenka', 'kostrovik', 'listopadnica', 'navka', 'kikimora', 'domovoy', 'gromovik']
        .filter(id => SP[id]);
      const ks = this.kStrike();
      let hero = '';
      try { if (S.d && S.d.look) hero = Art.stack(CutArt.hero(S.d.look).replace('class="vm-breath"', '')); } catch (e) {}
      const stars = Array.from({ length: 40 }, (_, i) => `<i style="left:${(i * 61) % 100}%;top:${(i * 37) % 58}%;--d:${(i % 7) * .4}s"></i>`).join('');
      const root = U.el(`<div class="fm">
        <div class="fm-cam">
          <div class="fm-sky"><i class="fm-aur"></i><div class="fm-stars">${stars}</div><div class="fm-moon"></div></div>
          <i class="fm-lit"></i>
          <svg class="fm-bolts" viewBox="0 0 400 600" preserveAspectRatio="none" aria-hidden="true">${[[70, 0, 120, 420, 3], [330, 0, 290, 460, 7], [150, 0, 40, 360, 13], [260, 0, 360, 380, 19]].map(([x0, y0, x1, y1, sd], i) => {
            const b = this.bolt(x0, y0, x1, y1, sd);
            return `<g class="fm-bolt b${i}"><path class="o" d="${b.path}${b.br}"/><path class="m" d="${b.path}"/><path class="m t" d="${b.br}"/><path class="c" d="${b.path}"/></g>`;
          }).join('')}</svg>
          <i class="fm-rglow"></i>
          <svg class="fm-rift" viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden="true"><path class="g" d="M52 0 L45 34 L56 62 L43 98 L57 130 L46 168 L55 204 L48 240 L52 300"/><path d="M52 0 L45 34 L56 62 L43 98 L57 130 L46 168 L55 204 L48 240 L52 300"/>${[1, 2, 3].map(k => `<path class="v v${k}" d="${this.bolt(52, 0, 52, 300, 5 + k * 11, 18, true)}"/>`).join('')}</svg>
          <div class="fm-kos"><i class="fm-kglow"></i>${Art.spirit('koschey')}${ks.arcs}</div>
          ${ks.main}
          <div class="fm-city far">${this.skyline('far', 7, { hMin: 170, hMax: 360, top: '#34256e', bot: '#1a1142', rim: '#8b7fd6', win: .03, tower: true })}</div>
          <div class="fm-city mid">${this.skyline('mid', 19, { hMin: 120, hMax: 290, top: '#241752', bot: '#0f0826', rim: '#b7a6f2', win: .2, domes: true })}</div>
          <div class="fm-city near">${this.skyline('near', 31, { hMin: 70, hMax: 200, top: '#140b2b', bot: '#05020b', rim: '#6d5ca6', win: .16, chimneys: true, waterTower: true })}</div>
          <div class="fm-swarm">${swarm.map((id, i) => {
            const a = (i / swarm.length) * Math.PI * 2 + (i % 3) * .4, d = 42 + (i % 4) * 9;
            return `<div style="--i:${i};--x:${(Math.cos(a) * d).toFixed(1)}vmax;--y:${(Math.sin(a) * d * .8 + 10).toFixed(1)}vmax;--r:${((i % 5) - 2) * 14}deg">${Art.spirit(id)}</div>`;
          }).join('')}</div>
          <div class="fm-hide">
            <div class="fm-hp lamp"><div class="fm-hb">${this.lamp()}<div class="fm-hs">${Art.spirit('fonarnik')}</div></div></div>
            <div class="fm-hp puddle"><i class="fm-rain far" style='background-image:${this.rainTile(3, 14, 26, 1, .35)}'></i><i class="fm-rain mid" style='background-image:${this.rainTile(9, 10, 38, 1.4, .5)}'></i><i class="fm-rain near" style='background-image:${this.rainTile(17, 6, 60, 2.2, .7)}'></i><div class="fm-hb">${this.puddle()}<div class="fm-hs refl">${Art.spirit('kapelka')}</div><div class="fm-hs">${Art.spirit('kapelka')}</div></div></div>
            <div class="fm-hp wires"><div class="fm-hb">${this.wires()}<div class="fm-hs">${Art.spirit('vayfayka')}</div></div></div>
          </div>
          <div class="fm-map">
            <div class="fm-plane"><i class="fm-roads" style='background-image:${this.mapTile()}'></i><i class="fm-ring"><i class="r1"></i><i class="r2"></i></i></div>
            <div class="fm-sps">${['kapelka', 'ugolek', 'mshonok'].map((id, i) => `<div style="--i:${i}">${Art.spirit(id)}</div>`).join('')}</div>
            <div class="fm-me"><i></i></div>
          </div>
          <div class="fm-catch">
            <i class="fm-circ"></i><i class="fm-arena"></i><div class="fm-bird">${Art.spirit('zharptica')}<i class="fm-tgt"></i></div>
            <div class="fm-throw">${Art.charm('charm3')}</div>
            <div class="fm-got">Поймано!</div>
          </div>
          <div class="fm-clans">${Object.keys(CLANS).map((k, i) => `<div class="fm-cl" style="--i:${i};--cc:${CLANS[k].color}"><i></i>${Art.clanCrest(k)}<b>${CLANS[k].short}</b></div>`).join('')}
            <div class="fm-shrine">${Art.asImg(Art.shrineIcon(3, false), 'shrine:3:false')}</div></div>
          <div class="fm-dex">${this.dexWall()}</div><div class="fm-count"><b>0</b><span>духов из русских сказок</span></div>
          ${this.extraScenes()}
          <div class="fm-men"><div class="fm-vm"><i></i>${Art.stack(CutArt.velimir().replace('class="vm-breath"', ''), 'velimir')}</div>${hero ? `<div class="fm-hero"><i></i>${hero}</div>` : ''}</div>
        </div>
        <canvas class="fm-fx"></canvas>
        <div class="fm-flash"></div><div class="fm-grain"></div><div class="fm-vig"></div>
        <div class="fm-logo"><div class="fm-lcharm"><i></i>${Art.charm('charm3')}</div><h1>ДУХОЛОВ</h1><p>Лови духов Нави на улицах своего города</p>
          <span class="fm-ver">v${APP_VERSION}</span><button class="btn primary wide fm-go">${o.replay ? 'Закрыть' : 'Начать'}</button></div>
        <div class="fm-cap"></div>
        <div class="fm-bars"><i></i><i></i></div>
        <button class="fm-skip">Пропустить ›</button>
        <div class="fm-start"><div class="fm-play"><i></i></div><b>Тонкая ночь</b><small>Коснись, чтобы смотреть трейлер со звуком</small></div>
      </div>`);
      document.body.appendChild(root);
      this.fitAuction(root);
      const capEl = root.querySelector('.fm-cap');
      let timers = [], ended = false, music = null;
      const at = (ms, fn) => timers.push(setTimeout(fn, ms));
      const fx = this.particles(root.querySelector('.fm-fx'), calm);
      const t = {
        fx,
        q: sel => root.querySelector(sel),
        // счётчик: от a до b за dur мс (dec — знаков после запятой), с задержкой
        count: (sel, a, b, dur, dec = 0, delay = 0) => at(delay, () => {
          const el = root.querySelector(sel), t0 = performance.now();
          if (!el) return;
          const tick = () => { if (ended) return; const k = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (a + (b - a) * e).toFixed(dec); if (k < 1) requestAnimationFrame(tick); };
          tick();
        }),
        cap: html => { capEl.classList.remove('in'); void capEl.offsetWidth; capEl.innerHTML = html; if (html) capEl.classList.add('in'); },
        // удар: вспышка и тряска камеры (сила 1–2)
        hit: k => {
          const f = root.querySelector('.fm-flash');
          f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
          if (calm) return;
          const c = root.querySelector('.fm-cam');
          c.classList.remove('shake', 'shake2'); void c.offsetWidth; c.classList.add(k > 1 ? 'shake2' : 'shake');
        },
      };
      const back = () => finish();
      UI.pushLayer(back);
      const finish = () => {
        if (ended) return; ended = true;
        timers.forEach(clearTimeout); UI.popLayer(back); this.seen(); fx.stop();
        if (music) { const m = music, v0 = m.volume; let k = 0; const iv = setInterval(() => { k++; m.volume = Math.max(0, v0 * (1 - k / 10)); if (k >= 10) { clearInterval(iv); m.pause(); } }, 60); }
        Music.hold = false; Music.apply();
        root.classList.add('out'); setTimeout(() => { root.remove(); done(); }, 600);
      };
      root.querySelector('.fm-skip').onclick = e => { e.stopPropagation(); finish(); };
      root.querySelector('.fm-go').onclick = e => { e.stopPropagation(); Sfx.play('tap'); finish(); };
      const run = () => {
        root.querySelector('.fm-start').remove();
        // своя музыка: мелодия ночной карты громче обычного; фоновая музыка игры на это время молчит
        Music.hold = true; Music.apply();
        if (Cfg.s.music) {
          try { music = new Audio(Music.FILES.night); music.volume = 0; const p = music.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { music = null; }
          if (music) { let k = 0; const iv = setInterval(() => { k++; music.volume = Math.min(.6, k * .04); if (k >= 15) clearInterval(iv); }, 100); }
        }
        // o.from — начать с этой сцены (для съёмки кадров и проверки)
        const i0 = o.from ? Math.max(0, this.SCENES.findIndex(x => x[1] === o.from)) : 0;
        let tt = 0;
        // o.only — только эта сцена (для съёмки кадров)
        this.SCENES.slice(i0, o.only ? i0 + 1 : undefined).forEach(([dur, cls, text]) => {
          at(tt, () => {
            root.className = 'fm on s-' + cls;
            t.cap(text);
            fx.mode(cls);
            this.sound(cls);
          });
          this.CUES.filter(c => c[0] === cls).forEach(([, ms, fn]) => at(tt + ms, () => fn(t)));
          tt += dur;
        });
      };
      root.querySelector('.fm-start').onclick = () => { Sfx.init(); if (Sfx.ctx && Sfx.ctx.state === 'suspended') Sfx.ctx.resume(); run(); };
      if (o.autostart) run();
    });
  },

  /* Частицы на холсте. Каждая — мягкое свечение (заранее нарисованный спрайт: белое ядро, цветной ореол),
     мерцает, может падать (искры), покачиваться (светлячки, души) и тянуть за собой хвост (искры, рой).
     У каждой сцены — свой характер; при поимке — взрыв искр с ударной волной. */
  particles(cv, calm) {
    const x = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0, parts = [], rings = [], mode = 'city', raf = 0, live = true, frame = 0;
    const size = () => { W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; };
    size();
    addEventListener('resize', size);
    const R = (a, b) => a + Math.random() * (b - a), pick = arr => arr[Math.floor(Math.random() * arr.length)];
    // спрайты свечения и звёздочек по цветам (кэш)
    const SPR = {};
    const glow = c => SPR[c] || (SPR[c] = (() => {
      const s = document.createElement('canvas'); s.width = s.height = 64;
      const g = s.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.14, `rgba(${c},1)`); gr.addColorStop(.4, `rgba(${c},.32)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return s;
    })());
    const star = c => SPR['*' + c] || (SPR['*' + c] = (() => {
      const s = document.createElement('canvas'); s.width = s.height = 64;
      const g = s.getContext('2d');
      g.drawImage(glow(c), 16, 16, 32, 32);
      g.fillStyle = '#fff'; g.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? 3 : 30; g.lineTo(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr); }
      g.closePath(); g.globalAlpha = .9; g.fill(); return s;
    })());
    const GOLD = '253,224,71', WHITE = '255,255,255', VIO = '192,132,252', LIL = '232,210,255', GREEN = '134,239,172', EMBER = '255,140,60', WARM = '255,210,122';
    // make(): новая частица; n — сколько рождается за кадр
    const MODES = {
      city: { n: .5, make: () => ({ x: R(0, W), y: H * R(.45, 1), vx: R(-.15, .15), vy: R(-.4, -.1), r: R(.7, 1.8), l: R(200, 360), c: pick([WARM, WARM, '196,170,255']), wob: .03, tw: 1 }) },
      crack: { n: 4, make: () => ({ x: W * R(.47, .53), y: H * R(.04, .6), vx: R(-3.4, 3.4), vy: R(-3.2, .6), g: .09, r: R(.8, 2.2), l: R(40, 90), c: pick([LIL, VIO, WHITE]), tail: 5 }) },
      koschey: { n: 2.4, make: () => ({ x: W * R(.25, .75), y: H * R(.55, .95), vx: R(-.4, .4), vy: R(-1.8, -.6), r: R(1.4, 3.4), l: R(80, 160), c: pick([GREEN, '74,222,128']), wob: .07, tw: 1 }) },
      swarm: { n: 6, make: () => { const a = R(0, Math.PI * 2), s = R(3, 9); return { x: W * .5, y: H * .32, vx: Math.cos(a) * s, vy: Math.sin(a) * s, acc: 1.045, r: R(.8, 2), l: R(40, 90), c: pick([LIL, WHITE, VIO]), tail: 9 }; } },
      hide: { n: .6, make: () => ({ x: R(0, W), y: H * R(.2, 1), vx: R(-.2, .2), vy: R(-.35, -.05), r: R(.6, 1.5), l: R(180, 320), c: pick(['196,170,255', WARM]), wob: .03, tw: 1 }) },
      map: { n: 1.2, make: () => ({ x: R(0, W), y: H * R(.4, 1), vx: 0, vy: R(-.7, -.2), r: R(.7, 1.8), l: R(120, 240), c: pick([GOLD, WARM]), wob: .02, tw: 1 }) },
      catch: { n: 2.2, make: () => ({ x: W * R(.3, .7), y: H * R(.5, .75), vx: R(-.4, .4), vy: R(-2, -.6), r: R(.8, 2.2), l: R(50, 120), c: pick([EMBER, GOLD, '255,90,40']), wob: .05, tw: 2 }) },
      clans: { n: 1.6, make: () => ({ x: R(0, W), y: H * R(.1, .9), vx: R(-.2, .2), vy: R(-.6, -.1), r: R(1, 2.6), l: R(80, 160), c: GOLD, tw: 2, star: Math.random() < .35 }) },
      dex: { n: 1.2, make: () => ({ x: R(0, W), y: R(0, H), vx: 0, vy: 0, r: R(1.2, 3), l: R(30, 70), c: pick([WHITE, GOLD, LIL]), star: true }) },
      mentor: { n: 1, make: () => ({ x: R(0, W), y: H * R(.35, 1), vx: R(-.3, .3), vy: R(-.5, .1), r: R(1.2, 2.8), l: R(160, 300), c: pick([GREEN, GOLD]), wob: .08, tw: 1 }) },
      springs: { n: 2, make: () => ({ x: W * R(.3, .7), y: H * R(.4, .62), vx: R(-.5, .5), vy: R(-2, -.6), r: R(.8, 2.2), l: R(60, 130), c: pick(['94,234,212', '186,230,253', WHITE]), tw: 2 }) },
      evolve: { n: 2.4, make: () => ({ x: W * R(.25, .75), y: H * R(.45, .8), vx: R(-.3, .3), vy: R(-2.2, -.7), r: R(.9, 2.4), l: R(60, 130), c: pick([GOLD, EMBER, WARM]), wob: .04, tw: 1 }) },
      cocoon: { n: 1, make: () => ({ x: R(0, W), y: H * R(.3, 1), vx: R(-.2, .2), vy: R(-.5, -.1), r: R(.8, 2), l: R(140, 260), c: pick([WARM, '186,230,253']), wob: .03, tw: 1 }) },
      duel: { n: 3, make: () => ({ x: W * R(.4, .6), y: H * R(.4, .52), vx: R(-3.5, 3.5), vy: R(-2.5, 1.5), g: .05, r: R(.8, 2), l: R(25, 60), c: pick(['254,240,138', '167,139,250', WHITE]), tail: 3 }) },
      raid: { n: 3, make: () => ({ x: W * R(.15, .85), y: H * R(.15, .7), vx: R(-.6, .6), vy: R(-1.4, -.2), r: R(.9, 2.6), l: R(60, 140), c: pick([VIO, '249,115,22', LIL]), wob: .05, tw: 1 }) },
      auction: { n: .25, make: () => ({ x: Math.random() < .5 ? R(0, W * .12) : R(W * .88, W), y: H * R(.1, .8), vx: 0, vy: R(-.3, .1), r: R(1, 2.2), l: R(40, 90), c: pick([GOLD, WHITE]), star: true }) },
      weather: { n: .6, make: () => ({ x: R(0, W), y: H * R(.2, 1), vx: R(-.2, .2), vy: R(-.4, -.1), r: R(.7, 1.6), l: R(160, 300), c: WHITE, wob: .03, tw: 1 }) },
      snow: { n: 3.5, make: () => ({ x: R(-20, W), y: -10, vx: R(-.3, .5), vy: R(.9, 2.4), r: R(1, 2.8), l: R(300, 520), c: WHITE, wob: .05 }) },
      wardrobe: { n: 1.8, make: () => ({ x: R(0, W), y: R(0, H), vx: 0, vy: R(-.4, 0), r: R(1.2, 3), l: R(40, 90), c: pick([GOLD, VIO, WHITE]), star: true }) },
      league: { n: 2, make: () => ({ x: R(0, W), y: -10, vx: R(-.6, .6), vy: R(1.2, 3), r: R(1.2, 2.6), l: R(200, 340), c: pick([GOLD, '244,114,182', '96,165,250', GREEN]), wob: .08, tw: 2 }) },
      logo: { n: 2.4, make: () => ({ x: W * R(.15, .85), y: H * R(.55, 1), vx: R(-.4, .4), vy: R(-2.2, -.6), r: R(.8, 2.6), l: R(90, 200), c: pick([GOLD, GOLD, WARM]), wob: .04, tw: 1, star: Math.random() < .15 }) },
    };
    const step = () => {
      if (!live) return;
      frame++;
      const m = MODES[mode];
      if (m && parts.length < (calm ? 140 : 420)) {
        let n = m.n * (calm ? .45 : 1);
        while (n > 0) { if (Math.random() < n) parts.push(Object.assign({ t: 0, ph: R(0, 6.3) }, m.make())); n -= 1; }
      }
      x.clearRect(0, 0, W, H);
      x.globalCompositeOperation = 'lighter';
      parts = parts.filter(p => {
        p.t++;
        if (p.g) p.vy += p.g;
        if (p.acc) { p.vx *= p.acc; p.vy *= p.acc; }
        if (p.wob) p.vx += Math.sin(p.t * .05 + p.ph) * p.wob;
        p.x += p.vx * dpr; p.y += p.vy * dpr;
        const k = p.t / p.l;
        if (k >= 1 || p.x < -80 || p.x > W + 80 || p.y < -80 || p.y > H + 80) return false;
        let a = Math.sin(Math.PI * Math.min(1, k * 1.15));
        if (p.tw) a *= .55 + .45 * Math.sin(p.t * (p.tw === 2 ? .45 : .12) + p.ph);
        const s = p.r * 9 * dpr;
        if (p.tail) { // хвост: яркая голова, тающий след по скорости
          const tx = p.x - p.vx * p.tail * dpr, ty = p.y - p.vy * p.tail * dpr, gr = x.createLinearGradient(p.x, p.y, tx, ty);
          gr.addColorStop(0, `rgba(${p.c},${a})`); gr.addColorStop(1, `rgba(${p.c},0)`);
          x.strokeStyle = gr; x.lineWidth = p.r * 1.2 * dpr; x.lineCap = 'round';
          x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(tx, ty); x.stroke();
        }
        x.globalAlpha = a;
        x.drawImage(p.star ? star(p.c) : glow(p.c), p.x - s / 2, p.y - s / 2, s, s);
        x.globalAlpha = 1;
        return true;
      });
      // ударные волны
      rings = rings.filter(g => {
        g.t++;
        const k = g.t / g.l;
        if (k >= 1) return false;
        const e = 1 - Math.pow(1 - k, 3);
        x.strokeStyle = `rgba(${g.c},${(1 - k) * .8})`; x.lineWidth = (1 - k) * g.w * dpr;
        x.beginPath(); x.arc(g.x, g.y, e * g.r, 0, 7); x.stroke();
        return true;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return {
      mode: m => { mode = m; },
      // оберег попал: вспышка, взрыв золотых искр с хвостами и две ударные волны
      burst: (o = {}) => {
        const cx = W * (o.x == null ? .5 : o.x), cy = H * (o.y == null ? .42 : o.y), cols = o.c || [GOLD, WHITE, EMBER];
        parts.push({ x: cx, y: cy, vx: 0, vy: 0, r: 22, l: 26, c: cols[0], t: 0, ph: 0 });
        for (let i = 0; i < (calm ? 50 : (o.n || 130)); i++) {
          const a = R(0, Math.PI * 2), s = R(3, 13);
          parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, g: .14, r: R(1, 2.8), l: R(40, 95), c: pick(cols), tail: 3, t: 0, ph: R(0, 6) });
        }
        const M = Math.min(W, H);
        rings.push({ x: cx, y: cy, r: M * .55, w: 10, l: 34, c: cols[0], t: 0 });
        if (o.rings !== 1) rings.push({ x: cx, y: cy, r: M * .35, w: 6, l: 26, c: '255,255,255', t: 0 });
      },
      stop: () => { live = false; cancelAnimationFrame(raf); removeEventListener('resize', size); },
    };
  },

  // Звуковая дорожка поверх музыки: гул, треск разлома, удары, шорох роя, звон поимки, фанфары
  sound(cls) {
    const T = (f, d, o) => Sfx.tone(f, d, o), N = (d, o) => Sfx.noise(d, o);
    const pad = (fs, d, v = 0.03) => fs.forEach(f => T(f, d, { type: 'sine', vol: v }));
    const boom = (w = 0, v = .22) => { N(1.3, { vol: v, f: 900, to: 45, when: w }); T(68, 1.6, { vol: v, to: 30, when: w }); };
    const whoosh = (w = 0, v = .07) => N(.7, { vol: v, type: 'bandpass', f: 400, to: 3000, when: w, q: 2 });
    switch (cls) {
      case 'city': T(73.4, 5, { type: 'sawtooth', vol: 0.018 }); N(5, { vol: 0.025, f: 300, to: 500 }); break;
      case 'crack': [.9, 2.1, 3, 3.7].forEach((w, i) => { N(.25, { vol: .16, type: 'highpass', f: 2500, to: 600, when: w }); N(1.6, { vol: .12 + i * .02, f: 300, to: 60, when: w + .06 }); });
        N(4.3, { vol: 0.1, f: 120, to: 1600 }); T(110, 4.3, { type: 'sawtooth', vol: 0.03, to: 330 }); boom(4.3, .26); break;
      case 'koschey': [0, 1.4, 2.6].forEach((w, i) => { N(.3, { vol: .24 - i * .05, type: 'highpass', f: 3500, to: 500, when: w }); N(2.2, { vol: .22 - i * .04, f: 500, to: 40, when: w + .04 }); T(42, 1.6, { vol: .2 - i * .05, to: 26, when: w }); });
        T(49, 4.5, { type: 'sawtooth', vol: 0.035 }); pad([98, 146.8, 155.6], 4.4, 0.03); break;
      case 'swarm': for (let i = 0; i < 7; i++) whoosh(i * 0.55, 0.06 + (i % 2) * .02); T(98, 4.2, { type: 'triangle', vol: 0.035 }); break;
      case 'hide': [0, 1.8, 3.6].forEach((w, i) => { T([523.3, 587.3, 659.3][i], 0.6, { vol: 0.05, when: w }); T([1046.5, 1174.7, 1318.5][i], 0.4, { vol: 0.02, when: w + .08 }); }); break;
      case 'map': [0.6, 1.5, 2.4].forEach((w, i) => T([784, 880, 1046.5][i], 0.35, { type: 'triangle', vol: 0.05, when: w })); break;
      case 'catch': whoosh(1.4, .09); T(1318.5, .5, { vol: .06, when: 2.1 }); [0, .09, .18, .27].forEach((w, i) => T([659.3, 784, 987.8, 1318.5][i], .5, { type: 'triangle', vol: .05, when: 2.3 + w })); boom(2.1, .12); break;
      case 'clans': [0.2, 0.9, 1.6].forEach(w => { boom(w, .1); }); pad([196, 246.9, 293.7], 4.2, 0.03); break;
      case 'dex': [0, .15, .3, .45, .6, .75].forEach((w, i) => T([523.3, 587.3, 659.3, 784, 880, 1046.5][i], .4, { type: 'triangle', vol: .035, when: w })); break;
      case 'springs': [0, .12, .24, .36, .48, .6, .72].forEach((w, i) => T([1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349][i], .35, { type: 'triangle', vol: .035, when: 1.1 + w * 1.8 })); N(1.2, { vol: .05, type: 'bandpass', f: 1800, to: 900, when: .2, q: 3 }); break;
      case 'evolve': T(180, 2, { type: 'sawtooth', vol: .03, to: 720 }); T(360, 1.9, { type: 'sawtooth', vol: .02, to: 1100, when: 2.05 }); boom(2.05, .12); boom(3.95, .2); [0, .12, .24, .36].forEach((w, i) => T([523.3, 659.3, 784, 1046.5][i], 1.4, { type: 'triangle', vol: .06, when: 4 + w })); break;
      case 'cocoon': for (let i = 0; i < 8; i++) N(.12, { vol: .05, f: 400, to: 200, when: i * .28 }); N(.4, { vol: .12, type: 'highpass', f: 2000, to: 800, when: 3 }); boom(3.5, .12); [0, .1, .2].forEach((w, i) => T([784, 987.8, 1318.5][i], 1, { type: 'triangle', vol: .06, when: 3.55 + w })); break;
      case 'duel': [1.2, 2.2, 3.2].forEach(w => { N(.35, { vol: .12, type: 'bandpass', f: 2500, to: 600, when: w, q: 2 }); T(220, .3, { type: 'square', vol: .03, to: 80, when: w }); }); T(880, .6, { type: 'sawtooth', vol: .04, to: 220, when: 2.9 }); boom(4.4, .2); break;
      case 'raid': T(55, 7, { type: 'sawtooth', vol: .03 }); N(1.5, { vol: .08, f: 200, to: 1200, when: .4 }); for (let i = 0; i < 9; i++) whoosh(2 + i * .36, .05); [2.3, 3, 3.7, 4.4].forEach(w => boom(w, .1)); boom(5.2, .26); [0, .15, .3, .45].forEach((w, i) => T([392, 523.3, 659.3, 784][i], 1.4, { type: 'triangle', vol: .07, when: 5.6 + w })); break;
      case 'auction': [1.37, 2.89, 4.26, 6.38].forEach(w => { T(1400, .05, { vol: .05, when: w }); N(.05, { vol: .04, type: 'highpass', f: 4000, when: w }); }); [0, .09, .18, .27].forEach((w, i) => T([659.3, 784, 987.8, 1318.5][i], .5, { type: 'triangle', vol: .05, when: 3.08 + w })); [0, .12, .24, .36, .48].forEach((w, i) => T(1800 + i * 150, .09, { vol: .05, when: 5.05 + w })); break;
      case 'weather': [0, 1.6, 3.2, 4.8].forEach(w => whoosh(w, .07)); N(1.6, { vol: .06, f: 3000, to: 3000, when: 1.6 }); pad([220, 277.2, 329.6], 6, .02); break;
      case 'wardrobe': for (let i = 0; i < 10; i++) T(1046.5 + i * 60, .12, { type: 'triangle', vol: .04, when: .2 + i * .5 }); [0, .12, .24].forEach((w, i) => T([784, 987.8, 1174.7][i], 1.2, { type: 'triangle', vol: .06, when: 4.7 + w })); break;
      case 'league': for (let i = 0; i < 14; i++) N(.08, { vol: .07, f: 300, to: 200, when: 2.4 + i * .07 }); boom(3.4, .14); [0, .15, .3, .45].forEach((w, i) => T([523.3, 659.3, 784, 1046.5][i], 1.6, { type: 'triangle', vol: .07, when: 3.5 + w })); break;
      case 'mentor': pad([220, 277.2, 329.6], 5.2, 0.03); T(659.3, 1.5, { vol: .03, when: 2.8 }); break;
      case 'logo': boom(0, .28); [0, 0.18, 0.36].forEach((w, i) => T([293.7, 370, 440][i], 1.8, { type: 'triangle', vol: 0.08, when: w })); T(587.3, 2.6, { type: 'triangle', vol: 0.07, when: 0.6 }); break;
    }
  },
};
