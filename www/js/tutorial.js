'use strict';
/* Обучение новичка: наставник Велимир ведёт по шагам.
   1 — поймать учебного духа рядом, 2 — зачерпнуть из родника, 3 — открыть меню.
   Шаги переключает сервер (после поимки и родника), телефон показывает подсказки. */

const Tut = {
  SID: 'vayfayka',
  TEXT: {
    1: 'Рядом с тобой появился дух — видишь светящийся круг? <b>Коснись его</b>, чтобы начать ловлю.',
    2: 'Превосходно! Обереги тратятся, их пополняют <b>родники</b> — синие колодцы со столбом света. <b>Стрелка вверху</b> покажет дорогу к ближайшему — подойди и коснись его.',
    3: 'Последнее: <b>золотой оберег внизу</b> — это меню. Там твои духи, бестиарий, задания и Летопись Ордена.',
  },
  pos: null,   // где стоит учебный дух (только на этом телефоне)
  shown: 0,

  step() { return (S.d && S.d.tut) || 0; },
  init() {
    this.started = true;
    this.shown = this.step();
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
  // Сервер перевёл обучение на новый шаг
  sync() {
    const s = this.step();
    if (!this.started || s === this.shown) return;
    this.shown = s;
    if (!s) { this.close(); return; }
    Sfx.play('spin');
    this.show();
    MapView.refresh(true);
    // на шаге «родник» Следопыт сам показывает дорогу к ближайшему
    if (s === 2) setTimeout(() => { const n = MapView.nearest('spring'); if (n) MapView.track(n); }, 800);
  },
  async finish(skipped) {
    const r = await Game.try('tutFinish', { skip: !!skipped });
    if (!r) return;
    if (r.got.length) {
      UI.toast(`Обучение пройдено! ${r.got.map(x => `${x.label} +${x.n}`).join(', ')}`, 'good');
      Sfx.play('levelup');
    }
    this.shown = 0;
    this.close();
  },
  close() {
    U.$('#menuBtn').classList.remove('tut-pulse');
    if (this.el) { this.el.remove(); this.el = null; }
    MapView.refresh(true);
  },

  // Учебный дух держится в ~25 м от игрока, пока его не поймают
  spawn(lat, lng) {
    if (this.step() !== 1) return null;
    let p = this.pos;
    if (!p || U.dist(lat, lng, p[0], p[1]) > 60) p = this.pos = [lat + 18 / 111320, lng + 16 / (111320 * Math.cos(lat * Math.PI / 180))];
    return { type: 'spirit', id: 'tut', tut: true, sid: this.SID, lvl: 2, lat: p[0], lng: p[1], d: U.dist(lat, lng, p[0], p[1]), expires: U.now() + 3600000 };
  },
};
