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

  // ночной город: дома разной высоты, у части — купола-луковки и шпили, окна горят не все
  skyline(seed, color, hMin, hMax, win, domes) {
    let r = seed;
    const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    let s = '', x = 0;
    while (x < 1600) {
      const w = 16 + rnd() * 38, h = hMin + rnd() * (hMax - hMin), top = 400 - h;
      s += `<rect x="${x.toFixed(0)}" y="${top.toFixed(0)}" width="${(w + 1).toFixed(0)}" height="${h.toFixed(0)}"/>`;
      const k = rnd();
      if (domes && k < .22) { // церковь: барабан и луковка с крестом
        const cx = x + w / 2, dw = Math.min(w * .5, 16);
        s += `<rect x="${(cx - dw * .45).toFixed(0)}" y="${(top - dw * .7).toFixed(0)}" width="${(dw * .9).toFixed(0)}" height="${(dw * .7 + 1).toFixed(0)}"/>`
          + `<path d="M${(cx - dw / 2).toFixed(1)} ${(top - dw * .7).toFixed(1)}q0 -${(dw * .7).toFixed(1)} ${(dw / 2).toFixed(1)} -${(dw * 1.2).toFixed(1)}q${(dw / 2).toFixed(1)} ${(dw * .5).toFixed(1)} ${(dw / 2).toFixed(1)} ${(dw * 1.2).toFixed(1)}z"/>`
          + `<rect x="${(cx - .8).toFixed(1)}" y="${(top - dw * 2.3).toFixed(1)}" width="1.6" height="${(dw * .5).toFixed(1)}"/><rect x="${(cx - 4).toFixed(1)}" y="${(top - dw * 2.15).toFixed(1)}" width="8" height="1.6"/>`;
      } else if (k < .34) s += `<rect x="${(x + w * .45).toFixed(0)}" y="${(top - 14).toFixed(0)}" width="1.2" height="14"/>`; // антенна
      else if (k < .42) s += `<path d="M${x.toFixed(0)} ${top.toFixed(0)}l${(w / 2).toFixed(0)} -${(w * .35).toFixed(0)}l${(w / 2).toFixed(0)} ${(w * .35).toFixed(0)}z"/>`; // крыша
      // окна
      if (win) for (let wy = top + 7; wy < 394; wy += 9) for (let wx = x + 4; wx < x + w - 5; wx += 7)
        if (rnd() < win) s += `<rect class="fm-w${Math.floor(rnd() * 3)}" x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="3.2" height="4.4" fill="#ffd27a"/>`;
      x += w;
    }
    return `<svg viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g fill="${color}">${s}</g></svg>`;
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
          <div class="fm-city far">${this.skyline(7, '#2a1c5e', 170, 360, .04, true)}</div>
          <div class="fm-city mid">${this.skyline(19, '#170e3a', 120, 290, .2, true)}</div>
          <div class="fm-city near">${this.skyline(31, '#07030f', 70, 200, .16, false)}</div>
          <div class="fm-swarm">${swarm.map((id, i) => {
            const a = (i / swarm.length) * Math.PI * 2 + (i % 3) * .4, d = 42 + (i % 4) * 9;
            return `<div style="--i:${i};--x:${(Math.cos(a) * d).toFixed(1)}vmax;--y:${(Math.sin(a) * d * .8 + 10).toFixed(1)}vmax;--r:${((i % 5) - 2) * 14}deg">${Art.spirit(id)}</div>`;
          }).join('')}</div>
          <div class="fm-hide">
            <div class="fm-hp lamp"><div class="fm-hb"><svg viewBox="0 0 100 200" aria-hidden="true"><rect x="47" y="60" width="6" height="140" fill="#1a1236"/><path d="M36 60h28l-5-16H41z" fill="#2a1f52"/><ellipse cx="50" cy="64" rx="22" ry="7" fill="#ffe7a3" opacity=".9"/></svg><div class="fm-hs">${Art.spirit('fonarnik')}</div></div></div>
            <div class="fm-hp puddle"><div class="fm-hb"><svg viewBox="0 0 200 100" aria-hidden="true"><ellipse cx="100" cy="60" rx="90" ry="24" fill="#0e3a52"/><ellipse class="rip" cx="100" cy="60" rx="30" ry="8" fill="none" stroke="#7fe8dc"/><ellipse class="rip b" cx="100" cy="60" rx="30" ry="8" fill="none" stroke="#7fe8dc"/></svg><div class="fm-hs">${Art.spirit('kapelka')}</div></div></div>
            <div class="fm-hp wires"><div class="fm-hb"><svg viewBox="0 0 200 120" aria-hidden="true"><path d="M0 30Q100 70 200 26M0 50Q100 96 200 48M0 70Q100 118 200 72" fill="none" stroke="#3b2d72" stroke-width="3"/><path class="zap" d="M92 58l8 10-6 2 9 12" fill="none" stroke="#fde047" stroke-width="3"/></svg><div class="fm-hs">${Art.spirit('vayfayka')}</div></div></div>
          </div>
          <div class="fm-map">
            <div class="fm-plane"><i class="fm-roads"></i><i class="fm-ring"><i class="r1"></i><i class="r2"></i></i></div>
            <div class="fm-sps">${['kapelka', 'ugolek', 'mshonok'].map((id, i) => `<div style="--i:${i}">${Art.spirit(id)}</div>`).join('')}</div>
            <div class="fm-me"><i></i></div>
          </div>
          <div class="fm-catch">
            <div class="fm-bird">${Art.spirit('zharptica')}<i class="fm-tgt"></i></div>
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
