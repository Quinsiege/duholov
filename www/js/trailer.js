'use strict';
/* 4.0: трейлер «Тонкая ночь» — короткий фильм при заходе в игру (один раз на устройстве после обновления до 4.0,
   потом — из «Книги Ордена»). Сцены на CSS-анимации и артах игры, музыка и звуки — WebAudio (Sfx), без файлов. */

const Trailer = {
  KEY: 'duholov.trailer', VER: '4',
  due() { try { return localStorage.getItem(this.KEY) !== this.VER; } catch (e) { return false; } },
  seen() { try { localStorage.setItem(this.KEY, this.VER); } catch (e) {} },

  // Сцены: [длительность, класс сцены, подпись]
  SCENES: [
    [5200, 'city', 'Обычный город. Обычная ночь.'],
    [5600, 'crack', 'Но раз в тысячу лет граница между <b>Явью</b> и <b>Навью</b> истончается…'],
    [5200, 'koschey', '…и <b>Кощей Бессмертный</b> распахивает двери.'],
    [5600, 'flood', 'В город хлынули <b>духи Нави</b>.'],
    [5600, 'hide', 'Они прячутся в фонарях, лужах и проводах.'],
    [5200, 'order', 'Но древний <b>Орден Оберега</b> не спит.'],
    [5000, 'mentor', '«Нам нужен новый Ловчий».'],
    [0, 'logo', ''],
  ],

  play(o = {}) {
    return new Promise(done => {
      Sfx.init();
      const flood = ['vayfayka', 'kapelka', 'ugolek', 'skvoznyak', 'mshonok', 'shoroh', 'paketik', 'zheludok', 'fonarnik', 'tenka', 'kostrovik', 'listopadnica'];
      const root = U.el(`<div class="trl">
        <div class="trl-sky">${'<i class="trl-star"></i>'.repeat(24)}<div class="trl-moon"></div></div>
        <svg class="trl-rift" viewBox="0 0 100 200" preserveAspectRatio="none"><path d="M52 0 L46 30 L55 52 L44 80 L56 104 L45 130 L54 156 L47 200" /></svg>
        <div class="trl-city"><svg viewBox="0 0 800 200" preserveAspectRatio="none"><path d="M0 200V120h40V90h36v30h28V64h44v56h24V96h40v24h32V40l24-20 24 20v80h36V84h52v36h20v-20h44v20h28V70h40v50h32V92h48v28h24v-14h32v14h28V60h36v60h40V96h36v104Z" fill="#070312"/>
          <g class="trl-win" fill="#fde047">${[70, 90, 150, 170, 250, 330, 345, 430, 470, 520, 600, 640, 700, 735].map((x, i) => `<rect x="${x}" y="${80 + (i * 37) % 60}" width="7" height="9"/>`).join('')}</g></svg></div>
        <div class="trl-kos">${Art.spirit('koschey')}</div>
        <div class="trl-flood">${flood.map((id, i) => `<div style="--i:${i};--y:${(i * 29) % 70}%">${Art.spirit(id)}</div>`).join('')}</div>
        <div class="trl-hide">${[['fonarnik', 'в фонарях'], ['kapelka', 'в лужах'], ['vayfayka', 'в проводах']].map(([id, t], i) => `<div class="trl-card" style="--i:${i}">${Art.spirit(id)}<span>${t}</span></div>`).join('')}</div>
        <div class="trl-order"><div class="trl-rays"></div><div class="trl-charm">${Art.charm('charm3')}</div></div>
        <div class="trl-mentor">${CutArt.velimir()}</div>
        <div class="trl-logo"><div class="trl-lcharm">${Art.charm('charm3')}</div><h1>ДУХОЛОВ</h1><p>Лови духов Нави на улицах своего города</p><span class="trl-ver">4.0 · Новая глава</span>
          <button class="btn primary wide trl-go">${o.replay ? 'Закрыть' : 'Начать'}</button></div>
        <div class="trl-cap"></div>
        <div class="trl-bars"></div>
        <button class="trl-skip">Пропустить ›</button>
        <div class="trl-start"><div class="trl-play">▶</div><b>Тонкая ночь</b><small>Коснись, чтобы смотреть трейлер со звуком</small></div>
      </div>`);
      document.body.appendChild(root);
      const cap = root.querySelector('.trl-cap');
      let timers = [], ended = false;
      const back = () => finish();
      UI.pushLayer(back);
      const finish = () => {
        if (ended) return; ended = true;
        timers.forEach(clearTimeout); UI.popLayer(back); this.seen();
        root.classList.add('out'); setTimeout(() => { root.remove(); done(); }, 600);
      };
      root.querySelector('.trl-skip').onclick = e => { e.stopPropagation(); finish(); };
      root.querySelector('.trl-go').onclick = e => { e.stopPropagation(); Sfx.play('tap'); finish(); };
      const run = () => {
        root.querySelector('.trl-start').remove();
        let t = 0;
        this.SCENES.forEach(([dur, cls, text], i) => {
          timers.push(setTimeout(() => {
            root.className = 'trl on s-' + cls;
            cap.classList.remove('in'); void cap.offsetWidth;
            cap.innerHTML = text; if (text) cap.classList.add('in');
            this.sound(cls);
          }, t));
          t += dur;
        });
      };
      root.querySelector('.trl-start').onclick = () => { Sfx.init(); if (Sfx.ctx && Sfx.ctx.state === 'suspended') Sfx.ctx.resume(); run(); };
    });
  },

  // Звуковая дорожка: гул, треск разлома, удары, хор и фанфары
  sound(cls) {
    const T = (f, d, o) => Sfx.tone(f, d, o), N = (d, o) => Sfx.noise(d, o);
    const pad = (fs, d, v = 0.035) => fs.forEach(f => T(f, d, { type: 'sine', vol: v }));
    const boom = (w = 0) => { N(1.2, { vol: 0.22, f: 900, to: 50, when: w }); T(70, 1.4, { vol: 0.22, to: 32, when: w }); };
    switch (cls) {
      case 'city': T(73.4, 5.4, { type: 'sawtooth', vol: 0.025 }); pad([146.8, 174.6, 220], 5, 0.02); break;
      case 'crack': N(4.5, { vol: 0.12, f: 120, to: 900 }); T(110, 4.5, { type: 'sawtooth', vol: 0.03, to: 220 }); boom(4.4); break;
      case 'koschey': boom(); T(55, 5, { type: 'sawtooth', vol: 0.035 }); pad([146.8, 155.6, 220], 4.8, 0.03); break;
      case 'flood': for (let i = 0; i < 8; i++) N(0.45, { vol: 0.06, type: 'bandpass', f: 600 + i * 150, to: 2400, when: i * 0.55 }); T(98, 5.4, { type: 'triangle', vol: 0.04 }); break;
      case 'hide': [0, 1.6, 3.2].forEach((w, i) => T([523, 587, 659][i], 0.5, { vol: 0.06, when: w })); pad([174.6, 220, 261.6], 5.2, 0.025); break;
      case 'order': pad([293.7, 370, 440, 587.3], 5, 0.04); N(1.5, { vol: 0.05, type: 'highpass', f: 5000, to: 9000 }); break;
      case 'mentor': pad([220, 277.2, 329.6], 4.8, 0.035); break;
      case 'logo': boom(); [0, 0.18, 0.36].forEach((w, i) => T([293.7, 370, 440][i], 1.8, { type: 'triangle', vol: 0.09, when: w })); T(587.3, 2.6, { type: 'triangle', vol: 0.08, when: 0.6 }); break;
    }
  },
};
