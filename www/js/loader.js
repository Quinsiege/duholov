'use strict';
/* Экран загрузки (3.31): прогресс-бар и подсказки Ордена, которые можно листать.
   Держится, пока грузится прогресс, а после входа в игру — пока карта не найдёт Ловчего и не подгрузит подложку
   (раньше игрока встречала серая недогруженная карта). 3.31.1: сам экран есть в index.html — виден с первой секунды. */

const Loader = {
  el: null, pct: 0, hint: 0, rot: null, tpl: null,
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
      // первый раз — подхватываем экран из index.html (он виден с первой секунды), потом создаём такой же
      const boot = document.getElementById('bootLoader');
      if (boot) {
        boot.removeAttribute('id');
        this.tpl = boot.cloneNode(true); // для следующих показов — такой же экран
        this.el = boot;
        this.hint = 0; // совет, который уже на экране
        const bar = boot.querySelector('.ld-bar i'), w = bar.getBoundingClientRect().width / (bar.parentNode.getBoundingClientRect().width || 1);
        this.pct = Math.round(w * 100);
        bar.style.width = this.pct + '%';
        bar.classList.remove('boot');
        boot.querySelector('.ld-pct').textContent = this.pct + '%';
        this.runes();
      } else if (this.tpl) {
        // 4.4: тот же экран, что в index.html (со сценой), — копия, снятая при первом показе
        this.hint = Math.floor(Math.random() * this.HINTS.length);
        this.el = this.tpl.cloneNode(true);
        const bar = this.el.querySelector('.ld-bar i');
        bar.classList.remove('boot'); bar.style.width = '0%';
        this.lit = 0;
        this.el.querySelector('.ld-pct').textContent = '';
        this.el.querySelector('.ld-text').textContent = '';
        document.body.appendChild(this.el);
      } else {
        this.hint = Math.floor(Math.random() * this.HINTS.length);
        this.el = U.el(`<div class="loader" role="status" aria-live="polite"><div class="ld-scene"></div><div class="ld-bg"></div><div class="ld-shade"></div>
          <div class="ld-logo"><div class="ld-charm">${Art.charm('charm3')}</div><h1>ДУХОЛОВ</h1><p>Лови духов Нави на улицах своего города</p></div>
          <div class="ld-foot">
            <div class="ld-hint">
              <div class="ld-tip"><small>✦ Совет Ордена</small><p></p></div>
              <button class="ld-arrow prev" aria-label="Предыдущая подсказка">‹</button>
              <button class="ld-arrow next" aria-label="Следующая подсказка">›</button>
            </div>
            <div class="ld-dots"></div>
            <div class="ld-prog"><div class="ld-row"><span class="ld-text"></span><b class="ld-pct"></b></div><div class="ld-bar"><i></i><b class="ld-runes"></b></div></div>
          </div>
        </div>`);
        document.body.appendChild(this.el);
      }
      this.el.querySelector('.ld-dots').innerHTML = this.HINTS.map((_, i) => `<i data-i="${i}"></i>`).join('');
      this.el.querySelector('.prev').onclick = () => this.go(-1, true);
      this.el.querySelector('.next').onclick = () => this.go(1, true);
      this.el.querySelector('.ld-dots').onclick = e => { const d = e.target.closest('[data-i]'); if (d) { this.hint = +d.dataset.i; this.go(0, true); } };
      // листание пальцем
      let x0 = null;
      const tip = this.el.querySelector('.ld-hint');
      tip.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
      tip.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) this.go(dx < 0 ? 1 : -1, true); }, { passive: true });
      this.go(0, false, !!boot);
      if (typeof Scene !== 'undefined') Scene.loading(this.el); // 4.4: фон из scenes.json
      this.rot = setInterval(() => this.go(1), 7000);
    }
    if (text) this.set(this.pct, text);
  },
  go(step, manual, quiet) {
    if (!this.el) return;
    const n = this.HINTS.length;
    this.hint = (this.hint + step + n) % n;
    const p = this.el.querySelector('.ld-tip p');
    if (!quiet) { p.classList.remove('in'); void p.offsetWidth; p.classList.add('in'); }
    p.textContent = this.HINTS[this.hint];
    this.el.querySelectorAll('.ld-dots i').forEach((d, i) => d.classList.toggle('on', i === this.hint));
    if (manual) { clearInterval(this.rot); this.rot = setInterval(() => this.go(1), 9000); } // пролистал сам — даём дочитать
  },
  // прогресс только растёт
  set(pct, text) {
    if (!this.el) return;
    this.pct = Math.max(this.pct, Math.min(100, pct));
    this.el.querySelector('.ld-bar i').style.width = this.pct + '%';
    this.el.querySelector('.ld-pct').textContent = Math.round(this.pct) + '%';
    if (text) this.el.querySelector('.ld-text').textContent = text;
    clearTimeout(this._rt); this._rt = setTimeout(() => this.runes(), 320); // руна — когда огонь дойдёт до неё (полоса едет .35 с)
  },
  // 4.6: чтение заклинания — руны проступают по одной, когда огонь дошёл до середины руны; новая вспыхивает
  runes() {
    const el = this.el && this.el.querySelector('.ld-runes'), bar = el && el.parentNode;
    if (!el || !bar.clientWidth) return;
    const CELL = 22, OFF = 5, fill = bar.clientWidth * this.pct / 100;
    const n = Math.max(0, Math.min(Math.floor((bar.clientWidth - OFF) / CELL), Math.floor((fill - OFF + CELL / 2) / CELL)));
    el.style.width = n ? (OFF + n * CELL) + 'px' : '0';
    if (n > (this.lit || 0)) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    this.lit = n;
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
