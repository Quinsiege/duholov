'use strict';
/* Экран загрузки (3.31): прогресс-бар и подсказки Ордена, которые можно листать.
   Держится, пока грузится прогресс, а после входа в игру — пока карта не найдёт Ловчего и не подгрузит подложку
   (раньше игрока встречала серая недогруженная карта). */

const Loader = {
  el: null, pct: 0, hint: 0, rot: null,
  HINTS: [
    'Бросай оберег, когда кольцо сжимается: «Отлично!» даёт больше опыта и шанс поимки.',
    'Родники наполняются снова через несколько минут — прогулка по кругу приносит припасы.',
    'Спутник ходит с тобой и находит эссенцию своего семейства.',
    'Три победы подряд в турнире Лиги — ещё одна звезда сверху.',
    'Разломы открываются у Капищ каждый час: собери команду из трёх духов.',
    'Сияющие духи редки — их выдают искры вокруг.',
    'Коконы греются шагами: одновременно можно греть три.',
    'Задания дня обновляются в полночь, а за все три ждёт Сундук дня.',
    'Поставь защитника на Капище своей дружины — он принесёт искры.',
    'Погода усиливает духов своей стихии: в дождь чаще встречаются водные.',
    'Привяжи вход через Google, Яндекс или Telegram — прогресс не потеряется при смене телефона.',
    'Дари друзьям подарки каждый день — дружба растёт и приносит опыт.',
  ],

  show(text) {
    if (!this.el) {
      this.hint = Math.floor(Math.random() * this.HINTS.length);
      this.el = U.el(`<div class="loader" role="status" aria-live="polite">
        <div class="ld-logo"><div class="onb-charm">${Art.charm('charm3')}</div><h1>ДУХОЛОВ</h1></div>
        <div class="ld-prog"><div class="ld-bar"><i></i></div><div class="ld-text"></div></div>
        <div class="ld-hint">
          <button class="ld-arrow prev" aria-label="Предыдущая подсказка">‹</button>
          <div class="ld-tip"><small>Совет Ордена</small><p></p></div>
          <button class="ld-arrow next" aria-label="Следующая подсказка">›</button>
        </div>
        <div class="ld-dots">${this.HINTS.map((_, i) => `<i data-i="${i}"></i>`).join('')}</div>
      </div>`);
      document.body.appendChild(this.el);
      this.el.querySelector('.prev').onclick = () => this.go(-1, true);
      this.el.querySelector('.next').onclick = () => this.go(1, true);
      this.el.querySelector('.ld-dots').onclick = e => { const d = e.target.closest('[data-i]'); if (d) { this.hint = +d.dataset.i; this.go(0, true); } };
      // листание пальцем
      let x0 = null;
      const tip = this.el.querySelector('.ld-hint');
      tip.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
      tip.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) this.go(dx < 0 ? 1 : -1, true); }, { passive: true });
      this.go(0);
      this.rot = setInterval(() => this.go(1), 7000);
    }
    if (text) this.set(this.pct, text);
  },
  go(step, manual) {
    if (!this.el) return;
    const n = this.HINTS.length;
    this.hint = (this.hint + step + n) % n;
    const p = this.el.querySelector('.ld-tip p');
    p.classList.remove('in'); void p.offsetWidth; p.classList.add('in');
    p.textContent = this.HINTS[this.hint];
    this.el.querySelectorAll('.ld-dots i').forEach((d, i) => d.classList.toggle('on', i === this.hint));
    if (manual) { clearInterval(this.rot); this.rot = setInterval(() => this.go(1), 9000); } // пролистал сам — даём дочитать
  },
  // прогресс только растёт
  set(pct, text) {
    if (!this.el) return;
    this.pct = Math.max(this.pct, Math.min(100, pct));
    this.el.querySelector('.ld-bar i').style.width = this.pct + '%';
    if (text) this.el.querySelector('.ld-text').textContent = text;
  },
  hide() {
    if (!this.el) return;
    const el = this.el;
    this.set(100);
    this.el = null; this.pct = 0;
    clearInterval(this.rot);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, 250);
  },

  // Карта готова: известно, где Ловчий (или прошло 6 с), и подложка вокруг загружена. Не дольше 15 с.
  waitMap() {
    return new Promise(res => {
      const t0 = Date.now();
      const tick = () => {
        const tl = MapView.tiles, tiles = tl && tl._tiles ? Object.values(tl._tiles) : [];
        const frac = tiles.length ? tiles.filter(t => t.loaded).length / tiles.length : 0;
        const here = MapView.gpsOK || MapView.demo, waited = Date.now() - t0;
        this.set(62 + (here ? 10 : 0) + frac * 26, here || waited > 6000 ? 'Загружаю карту…' : 'Ищу тебя на карте…');
        if ((tiles.length && frac >= 1 && (here || waited > 6000)) || waited > 15000) { res(); return; }
        setTimeout(tick, 200);
      };
      tick();
    });
  },
};
