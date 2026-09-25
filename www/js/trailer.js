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
    [4600, 'koschey', '…и <b>Кощей Бессмертный</b> распахивает врата.'],
    [4400, 'swarm', 'Сотни <b>духов Нави</b> вырвались в наш мир.'],
    [5400, 'hide', 'Они прячутся <b>в фонарях</b>…'],
    [5200, 'map', 'Выйди на улицу — <b>духи уже рядом</b>.'],
    [4800, 'catch', 'Брось оберег — и дух <b>твой</b>.'],
    [4600, 'clans', 'Вступи в <b>дружину</b>. Держите Капища вместе.'],
    [4400, 'dex', ''],
    [5600, 'mentor', '«Ордену нужен новый Ловчий…»'],
    [0, 'logo', ''],
  ],
  // события внутри сцен: [сцена, через сколько мс, что сделать]
  CUES: [
    ['crack', 4300, t => t.hit(2)],
    ['koschey', 0, t => t.hit(1)],
    ['hide', 1800, t => t.cap('…<b>в лужах</b>…')],
    ['hide', 3600, t => t.cap('…и <b>в проводах</b>.')],
    ['catch', 2100, t => { t.hit(1); t.fx.burst(); }],
    ['dex', 0, t => t.cap(`<b>${SPECIES.length} духов</b> из русских сказок.`)],
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
  // мокрый асфальт, лужа с отражением луны, круги от капель
  puddle() {
    return `<svg viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
      <linearGradient id="fmp-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0818" stop-opacity="0"/><stop offset=".35" stop-color="#140e26"/><stop offset="1" stop-color="#090611"/></linearGradient>
      <linearGradient id="fmp-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3f7a"/><stop offset=".5" stop-color="#15294f"/><stop offset="1" stop-color="#0b1a33"/></linearGradient>
      <radialGradient id="fmp-moon"><stop offset="0" stop-color="#fff7d6" stop-opacity=".95"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>
      <filter id="fmp-soft"><feGaussianBlur stdDeviation="1.6"/></filter></defs>
      
      <g fill="#2a2046" opacity=".5">${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 73) % 300}" cy="${70 + (i * 37) % 100}" r="${.6 + (i % 3) * .4}"/>`).join('')}</g>
      <ellipse cx="150" cy="118" rx="126" ry="36" fill="url(#fmp-water)"/>
      <ellipse cx="150" cy="118" rx="126" ry="36" fill="none" stroke="#7fe8dc" stroke-opacity=".35" stroke-width="1.4"/>
      <ellipse cx="206" cy="110" rx="16" ry="5" fill="url(#fmp-moon)" filter="url(#fmp-soft)"/>
      <path d="M60 112h60M70 124h90M180 128h50" stroke="#9fd8ff" stroke-opacity=".18" stroke-width="1.2" stroke-linecap="round"/>
      <ellipse class="rip" cx="150" cy="118" rx="26" ry="7" fill="none" stroke="#bff6ee" stroke-width="1.2"/>
      <ellipse class="rip b" cx="150" cy="118" rx="26" ry="7" fill="none" stroke="#bff6ee" stroke-width="1.2"/>
      <ellipse class="rip c" cx="96" cy="124" rx="12" ry="3.4" fill="none" stroke="#bff6ee" stroke-width="1"/>
      <ellipse class="rip d" cx="214" cy="126" rx="12" ry="3.4" fill="none" stroke="#bff6ee" stroke-width="1"/>
    </svg>`;
  },
  // деревянный столб с изоляторами, провисшие провода со свечением, электрическая дуга
  wires() {
    const W = ['M40 37Q220 118 420 60', 'M64 37Q230 128 420 76', 'M88 37Q240 138 420 92'];
    return `<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
      <linearGradient id="fmw-pole" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a1024"/><stop offset=".4" stop-color="#4a3040"/><stop offset="1" stop-color="#140c1c"/></linearGradient>
      <radialGradient id="fmw-ins" cx=".35" cy=".3"><stop offset="0" stop-color="#e0fffb"/><stop offset=".5" stop-color="#5eead4"/><stop offset="1" stop-color="#0f766e"/></radialGradient>
      <filter id="fmw-glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs>
      <path d="M56 240L60 34h8l4 206z" fill="url(#fmw-pole)"/>
      <rect x="26" y="44" width="76" height="7" rx="2" fill="#3a2433"/><rect x="26" y="44" width="76" height="1.6" fill="#8a5a6a" opacity=".6"/>
      ${[40, 64, 88].map(cx => `<rect x="${cx - 1.4}" y="38" width="2.8" height="8" fill="#241827"/><ellipse cx="${cx}" cy="37" rx="5" ry="4" fill="url(#fmw-ins)"/>`).join('')}
      <g fill="none" stroke-linecap="round">${W.map(d => `<path d="${d}" stroke="#a78bfa" stroke-opacity=".45" stroke-width="7" filter="url(#fmw-glow)"/><path d="${d}" stroke="#241a45" stroke-width="2.6"/><path d="${d}" stroke="#c4b5fd" stroke-opacity=".5" stroke-width=".8"/>`).join('')}</g>
      <g class="zap" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M225 83l6 6-4 2 8 5-3 2 15 3" stroke="#fde047" stroke-width="6" opacity=".4" filter="url(#fmw-glow)"/><path d="M225 83l6 6-4 2 8 5-3 2 15 3" stroke="#fffbeb" stroke-width="1.8"/></g>
      <g fill="#fde047">${[[222, 80], [238, 92], [250, 104], [232, 99]].map(([cx, cy], i) => `<circle class="fm-spark" style="--i:${i}" cx="${cx}" cy="${cy}" r="1.8"/>`).join('')}</g>
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

  play(o = {}) {
    return new Promise(done => {
      Sfx.init();
      const calm = document.body.classList.contains('calm');
      const swarm = ['vayfayka', 'kapelka', 'ugolek', 'skvoznyak', 'mshonok', 'shoroh', 'paketik', 'zheludok', 'fonarnik', 'tenka', 'kostrovik', 'listopadnica', 'navka', 'kikimora', 'domovoy', 'gromovik']
        .filter(id => SP[id]);
      const dex = SPECIES.filter(s => !s.story).slice(0, 30);
      let hero = '';
      try { if (S.d && S.d.look) hero = Art.stack(CutArt.hero(S.d.look).replace('class="vm-breath"', '')); } catch (e) {}
      const stars = Array.from({ length: 40 }, (_, i) => `<i style="left:${(i * 61) % 100}%;top:${(i * 37) % 58}%;--d:${(i % 7) * .4}s"></i>`).join('');
      const root = U.el(`<div class="fm">
        <div class="fm-cam">
          <div class="fm-sky"><i class="fm-aur"></i><div class="fm-stars">${stars}</div><div class="fm-moon"></div></div>
          <svg class="fm-rift" viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden="true"><path class="g" d="M52 0 L45 34 L56 62 L43 98 L57 130 L46 168 L55 204 L48 240 L52 300"/><path d="M52 0 L45 34 L56 62 L43 98 L57 130 L46 168 L55 204 L48 240 L52 300"/></svg>
          <div class="fm-kos"><i class="fm-kglow"></i>${Art.spirit('koschey')}</div>
          <div class="fm-city far">${this.skyline('far', 7, { hMin: 170, hMax: 360, top: '#34256e', bot: '#1a1142', rim: '#8b7fd6', win: .03, tower: true })}</div>
          <div class="fm-city mid">${this.skyline('mid', 19, { hMin: 120, hMax: 290, top: '#241752', bot: '#0f0826', rim: '#b7a6f2', win: .2, domes: true })}</div>
          <div class="fm-city near">${this.skyline('near', 31, { hMin: 70, hMax: 200, top: '#140b2b', bot: '#05020b', rim: '#6d5ca6', win: .16, chimneys: true, waterTower: true })}</div>
          <div class="fm-swarm">${swarm.map((id, i) => {
            const a = (i / swarm.length) * Math.PI * 2 + (i % 3) * .4, d = 42 + (i % 4) * 9;
            return `<div style="--i:${i};--x:${(Math.cos(a) * d).toFixed(1)}vmax;--y:${(Math.sin(a) * d * .8 + 10).toFixed(1)}vmax;--r:${((i % 5) - 2) * 14}deg">${Art.spirit(id)}</div>`;
          }).join('')}</div>
          <div class="fm-hide">
            <div class="fm-hp lamp"><div class="fm-hb">${this.lamp()}<div class="fm-hs">${Art.spirit('fonarnik')}</div></div></div>
            <div class="fm-hp puddle"><i class="fm-rain"></i><div class="fm-hb">${this.puddle()}<div class="fm-hs refl">${Art.spirit('kapelka')}</div><div class="fm-hs">${Art.spirit('kapelka')}</div></div></div>
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
          <div class="fm-dex">${dex.map((s, i) => `<div style="--i:${i}">${Art.spirit(s.id)}</div>`).join('')}</div>
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
      const capEl = root.querySelector('.fm-cap');
      let timers = [], ended = false, music = null;
      const at = (ms, fn) => timers.push(setTimeout(fn, ms));
      const fx = this.particles(root.querySelector('.fm-fx'), calm);
      const t = {
        fx,
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
        this.SCENES.slice(i0).forEach(([dur, cls, text]) => {
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

  // Частицы на холсте: пыль Нави, искры разлома, рой, золото Ордена, взрыв при поимке
  particles(cv, calm) {
    const x = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0, parts = [], mode = 'dust', raf = 0, live = true;
    const size = () => { W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; };
    size();
    addEventListener('resize', size);
    const R = (a, b) => a + Math.random() * (b - a);
    const MODES = {
      city: { n: .5, make: () => ({ x: R(0, W), y: H * R(.5, 1), vx: R(-.1, .1), vy: R(-.5, -.15), r: R(.6, 1.8), l: R(160, 320), c: Math.random() < .5 ? '255,210,122' : '196,170,255' }) },
      crack: { n: 5, make: () => ({ x: W * R(.46, .54), y: H * R(.04, .6), vx: R(-3, 3), vy: R(-2.5, 1.5), r: R(.8, 2.4), l: R(30, 80), c: Math.random() < .6 ? '232,210,255' : '192,132,252' }) },
      koschey: { n: 3, make: () => ({ x: W * R(.3, .7), y: H * R(.5, .9), vx: R(-.6, .6), vy: R(-2.4, -.8), r: R(1, 2.6), l: R(60, 140), c: Math.random() < .5 ? '134,239,172' : '74,222,128' }) },
      swarm: { n: 6, streak: true, make: () => { const a = R(0, Math.PI * 2), s = R(4, 12); return { x: W * .5, y: H * .32, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: R(.8, 2), l: R(40, 90), c: Math.random() < .5 ? '216,180,254' : '255,255,255' }; } },
      hide: { n: 1, make: () => ({ x: R(0, W), y: H * R(.2, 1), vx: R(-.2, .2), vy: R(-.4, -.1), r: R(.6, 1.6), l: R(160, 300), c: '196,170,255' }) },
      map: { n: 1.4, make: () => ({ x: R(0, W), y: H * R(.4, 1), vx: 0, vy: R(-.6, -.2), r: R(.6, 1.8), l: R(120, 240), c: '255,210,122' }) },
      catch: { n: 1.4, make: () => ({ x: W * R(.35, .65), y: H * R(.3, .6), vx: R(-.4, .4), vy: R(-1.2, -.3), r: R(.8, 2.2), l: R(60, 140), c: '255,170,80' }) },
      clans: { n: 2, make: () => ({ x: R(0, W), y: H * R(.6, 1.05), vx: R(-.2, .2), vy: R(-1.4, -.5), r: R(.8, 2.4), l: R(120, 220), c: '253,224,71' }) },
      dex: { n: 2, make: () => ({ x: R(0, W), y: R(0, H), vx: R(-.3, .3), vy: R(-.3, .3), r: R(.6, 1.6), l: R(80, 160), c: '255,255,255' }) },
      mentor: { n: 1.6, make: () => ({ x: R(0, W), y: H * R(.5, 1.05), vx: R(-.2, .2), vy: R(-1, -.3), r: R(.8, 2.2), l: R(140, 260), c: Math.random() < .5 ? '253,224,71' : '134,239,172' }) },
      logo: { n: 3, make: () => ({ x: W * R(.2, .8), y: H * R(.55, 1), vx: R(-.4, .4), vy: R(-2, -.6), r: R(.8, 2.6), l: R(100, 200), c: '253,224,71' }) },
    };
    const frame = () => {
      if (!live) return;
      const m = MODES[mode];
      if (m && parts.length < (calm ? 120 : 360)) { let n = m.n * (calm ? .5 : 1); while (n > 0) { if (Math.random() < n) parts.push(Object.assign(m.make(), { t: 0, s: m.streak })); n -= 1; } }
      x.clearRect(0, 0, W, H);
      x.globalCompositeOperation = 'lighter';
      parts = parts.filter(p => {
        p.t++; p.x += p.vx * dpr; p.y += p.vy * dpr;
        if (p.s) { p.vx *= 1.04; p.vy *= 1.04; }
        const k = p.t / p.l;
        if (k >= 1 || p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) return false;
        const a = Math.sin(Math.PI * k) * .9;
        if (p.s) {
          x.strokeStyle = `rgba(${p.c},${a * .8})`; x.lineWidth = p.r * dpr; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - p.vx * 4 * dpr, p.y - p.vy * 4 * dpr); x.stroke();
        } else {
          x.fillStyle = `rgba(${p.c},${a * .16})`; x.beginPath(); x.arc(p.x, p.y, p.r * 4 * dpr, 0, 7); x.fill();
          x.fillStyle = `rgba(${p.c},${a})`; x.beginPath(); x.arc(p.x, p.y, p.r * dpr, 0, 7); x.fill();
        }
        return true;
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return {
      mode: m => { mode = m; },
      // вспышка золотых искр из центра (оберег попал)
      burst: () => {
        for (let i = 0; i < (calm ? 50 : 110); i++) {
          const a = R(0, Math.PI * 2), s = R(2, 11);
          parts.push({ x: W * .5, y: H * .42, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, r: R(1, 3), l: R(40, 90), c: Math.random() < .5 ? '253,224,71' : '255,255,255', t: 0 });
        }
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
      case 'crack': N(4.3, { vol: 0.1, f: 120, to: 1600 }); T(110, 4.3, { type: 'sawtooth', vol: 0.03, to: 330 }); boom(4.3, .26); break;
      case 'koschey': T(49, 4.5, { type: 'sawtooth', vol: 0.035 }); pad([98, 146.8, 155.6], 4.4, 0.03); break;
      case 'swarm': for (let i = 0; i < 7; i++) whoosh(i * 0.55, 0.06 + (i % 2) * .02); T(98, 4.2, { type: 'triangle', vol: 0.035 }); break;
      case 'hide': [0, 1.8, 3.6].forEach((w, i) => { T([523.3, 587.3, 659.3][i], 0.6, { vol: 0.05, when: w }); T([1046.5, 1174.7, 1318.5][i], 0.4, { vol: 0.02, when: w + .08 }); }); break;
      case 'map': [0.6, 1.5, 2.4].forEach((w, i) => T([784, 880, 1046.5][i], 0.35, { type: 'triangle', vol: 0.05, when: w })); break;
      case 'catch': whoosh(1.4, .09); T(1318.5, .5, { vol: .06, when: 2.1 }); [0, .09, .18, .27].forEach((w, i) => T([659.3, 784, 987.8, 1318.5][i], .5, { type: 'triangle', vol: .05, when: 2.3 + w })); boom(2.1, .12); break;
      case 'clans': [0.2, 0.9, 1.6].forEach(w => { boom(w, .1); }); pad([196, 246.9, 293.7], 4.2, 0.03); break;
      case 'dex': [0, .15, .3, .45, .6, .75].forEach((w, i) => T([523.3, 587.3, 659.3, 784, 880, 1046.5][i], .4, { type: 'triangle', vol: .035, when: w })); break;
      case 'mentor': pad([220, 277.2, 329.6], 5.2, 0.03); T(659.3, 1.5, { vol: .03, when: 2.8 }); break;
      case 'logo': boom(0, .28); [0, 0.18, 0.36].forEach((w, i) => T([293.7, 370, 440][i], 1.8, { type: 'triangle', vol: 0.08, when: w })); T(587.3, 2.6, { type: 'triangle', vol: 0.07, when: 0.6 }); break;
    }
  },
};
