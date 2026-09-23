'use strict';
/* Обучение новичка: наставник Велимир ведёт по шагам.
   1 — поймать учебного духа рядом, 2 — зачерпнуть из родника, 3 — открыть меню. */

const Tut = {
  SID: 'vayfayka',
  TEXT: {
    1: 'Рядом с тобой появился дух — видишь светящийся круг? <b>Коснись его</b>, чтобы начать ловлю.',
    2: 'Превосходно! Обереги тратятся, их пополняют <b>родники</b> — синие колодцы со столбом света. <b>Стрелка вверху</b> покажет дорогу к ближайшему — подойди и коснись его.',
    3: 'Последнее: <b>золотой оберег внизу</b> — это меню. Там твои духи, бестиарий, задания и Летопись Ордена.',
  },

  step() { return (S.d && S.d.tut) || 0; },
  init() {
    if (!this.step()) return;
    this.el = U.el(`<div id="coach"><div class="coach-ava">${Art.guardian('#15803d')}</div><div class="coach-main"><b>Велимир</b><div class="coach-text"></div></div><button class="coach-skip">Пропустить</button></div>`);
    document.body.appendChild(this.el);
    this.el.querySelector('.coach-skip').onclick = () => UI.confirm('Пропустить обучение?', 'Подсказки больше не появятся. Правила можно прочитать в «Настройки → Об игре».', 'Пропустить', () => this.finish(true));
    this.show();
  },
  show() {
    const s = this.step();
    if (!this.el) return;
    this.el.classList.toggle('hidden', !s || UI.blocking());
    if (s) this.el.querySelector('.coach-text').innerHTML = this.TEXT[s];
    U.$('#menuBtn').classList.toggle('tut-pulse', s === 3);
  },
  advance(n) {
    if (!this.step() || this.step() >= n) return;
    S.d.tut = n; S.save();
    Sfx.play('spin');
    this.show();
    MapView.refresh(true);
    // на шаге «родник» Следопыт сам показывает дорогу к ближайшему
    if (n === 2) setTimeout(() => { const s = MapView.nearest('spring'); if (s) MapView.track(s); }, 800);
  },
  finish(skipped) {
    S.d.tut = 0;
    if (!skipped) {
      const got = S.giveRewards({ charm: 10, honey: 3, xp: 300 });
      UI.toast(`Обучение пройдено! ${got.map(x => `${x.label} +${x.n}`).join(', ')}`, 'good');
      Sfx.play('levelup');
    }
    S.save();
    U.$('#menuBtn').classList.remove('tut-pulse');
    if (this.el) { this.el.remove(); this.el = null; }
    MapView.refresh(true);
  },

  // Учебный дух держится в ~25 м от игрока, пока его не поймают
  spawn(lat, lng) {
    if (this.step() !== 1) return null;
    let p = S.d.tutPos;
    if (!p || U.dist(lat, lng, p[0], p[1]) > 60) {
      p = S.d.tutPos = [lat + 18 / 111320, lng + 16 / (111320 * Math.cos(lat * Math.PI / 180))];
      S.save();
    }
    return { type: 'spirit', id: 'tut', tut: true, sid: this.SID, lvl: 2, lat: p[0], lng: p[1], d: U.dist(lat, lng, p[0], p[1]), expires: Date.now() + 3600000 };
  },
};
