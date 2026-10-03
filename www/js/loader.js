'use strict';
/* Экран загрузки (3.31): прогресс-бар и подсказки Ордена, которые можно листать.
   Держится, пока грузится прогресс, а после входа в игру — пока карта не найдёт Ловчего и не подгрузит подложку
   (раньше игрока встречала серая недогруженная карта). 3.31.1: сам экран есть в index.html — виден с первой секунды.
   5.1.35: переработан — ночь Нави (sky: та же, что фон экрана входа), название текстом без картинки-логотипа, совет одной строкой
   (касание или смахивание — следующий, без стрелок и точек), тонкая золотая полоса */

const Loader = {
  el: null, pct: 0, hint: 0, rot: null, tpl: null,
  HINTS: [
    ru`Бросай оберег, когда кольцо сжимается: «Отлично!» даёт больше опыта и шанс поимки.`,
    ru`Источники наполняются снова через несколько минут — прогулка по кругу приносит припасы.`,
    ru`Спутник ходит с тобой и находит эссенцию своего семейства.`,
    ru`В Лиге дерутся живые Ловчие: победа над сильным соперником даёт больше рейтинга, чем над слабым.`,
    ru`Разломы открываются у Святилищ каждый час: собери команду из трёх духов.`,
    ru`Сияющие духи редки — их выдают искры вокруг.`,
    ru`Коконы греются шагами: одновременно можно греть три.`,
    ru`Ходи джойстиком: лёгкий наклон — шаг, до упора — бег. Километры для коконов считаются так же.`,
    ru`Атлас мира переносит в любой уголок Земли раз в полчаса, а Врата Перепутицы — сразу.`,
    ru`Задания дня обновляются в полночь, а за все три ждёт Сундук дня.`,
    ru`Поставь защитника в Святилище своего клана — он принесёт искры.`,
    ru`Погода усиливает духов своей стихии: в дождь чаще встречаются водные.`,
    ru`Привяжи вход через Google, Яндекс или Telegram — прогресс не потеряется при смене телефона.`,
    ru`Дари друзьям подарки каждый день — дружба растёт и приносит опыт.`,
  ],

  // ночь Нави — фон экрана загрузки и экрана входа: только небо со звёздами до низа экрана (стили — в index.html: экран загрузки
  // виден раньше таблиц стилей игры)
  sky() {
    return '<div class="nav-sky" aria-hidden="true"><i class="ns-stars"></i><i class="ns-stars s2"></i><i class="ns-aur a1"></i><i class="ns-aur a2"></i>' +
      [1, 2, 3, 4, 5, 6, 7, 8].map(i => `<i class="ns-wisp w${i}"></i>`).join('') + '</div>';
  },
  // название игры — текстом (картинки-логотипа больше нет), под ним — узор и строка
  mark(sub) { return `<h1 class="wordmark">${ru`Духолов`}</h1><i class="wm-orn" aria-hidden="true"></i><p class="tagline">${sub}</p>`; },
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
      } else if (this.tpl) {
        // 4.4: тот же экран, что в index.html (со сценой), — копия, снятая при первом показе
        this.hint = Math.floor(Math.random() * this.HINTS.length);
        this.el = this.tpl.cloneNode(true);
        const bar = this.el.querySelector('.ld-bar i');
        bar.classList.remove('boot'); bar.style.width = '0%';
        this.el.querySelector('.ld-pct').textContent = '';
        this.el.querySelector('.ld-text').textContent = '';
        document.body.appendChild(this.el);
      } else {
        this.hint = Math.floor(Math.random() * this.HINTS.length);
        this.el = U.el(`<div class="loader" role="status" aria-live="polite">${this.sky()}
          <div class="ld-mid">${this.mark(ru`Лови духов Нави по всему свету`)}</div>
          <div class="ld-foot">
            <div class="ld-tip"><small>✦ ${ru`Совет Ордена`}</small><p></p></div>
            <div class="ld-prog"><div class="ld-row"><span class="ld-text"></span><b class="ld-pct"></b></div><div class="ld-bar"><i></i></div></div>
          </div>
        </div>`);
        document.body.appendChild(this.el);
      }
      // совет: касание — следующий, смахивание — следующий или предыдущий
      let x0 = null, swiped = false;
      const tip = this.el.querySelector('.ld-tip');
      tip.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; swiped = false; }, { passive: true });
      tip.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) { swiped = true; this.go(dx < 0 ? 1 : -1, true); } }, { passive: true });
      tip.addEventListener('click', () => { if (swiped) { swiped = false; return; } this.go(1, true); });
      this.go(0, false, !!boot);
      this.rot = setInterval(() => this.go(1), 7000);
    }
    if (text) this.set(this.pct, text);
  },
  go(step, manual, quiet) {
    if (!this.el) return;
    const n = this.HINTS.length;
    this.hint = (this.hint + step + n) % n;
    // место под подсказку — по самой длинной: все подсказки лежат невидимыми в той же клетке, видна одна —
    // высота низа экрана не меняется при листании, и название над ним не прыгает
    let tw = this.el.querySelector('.ld-tw');
    if (!tw) {
      const p0 = this.el.querySelector('.ld-tip p');
      tw = document.createElement('div'); tw.className = 'ld-tw';
      p0.replaceWith(tw); tw.appendChild(p0);
      this.HINTS.forEach(h => { const g = document.createElement('p'); g.className = 'ld-ghost'; g.setAttribute('aria-hidden', 'true'); g.textContent = h; tw.appendChild(g); });
    }
    const p = tw.querySelector('p:not(.ld-ghost)');
    if (!quiet) { p.classList.remove('in'); void p.offsetWidth; p.classList.add('in'); }
    p.textContent = this.HINTS[this.hint];
    if (manual) { clearInterval(this.rot); this.rot = setInterval(() => this.go(1), 9000); } // пролистал сам — даём дочитать
  },
  // прогресс только растёт
  set(pct, text) {
    if (!this.el) return;
    this.pct = Math.max(this.pct, Math.min(100, pct));
    this.el.querySelector('.ld-bar i').style.width = this.pct + '%';
    this.el.querySelector('.ld-pct').textContent = Math.round(this.pct) + '%';
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

  // Карта готова: подложка вокруг Ловчего загружена (5.1: место известно сразу — walk.js). Не дольше 15 с.
  waitMap() {
    return new Promise(res => {
      const t0 = Date.now();
      const tick = () => {
        // 5.1.40: карта MapLibre готова — стиль и плитки на экране загружены (loaded); карты нет (без WebGL) — не ждём
        const m = MapView.map, done = !m || m.loaded(), waited = Date.now() - t0;
        this.set(72 + (done ? 26 : Math.min(24, waited / 500)), ru`Загружаю карту…`); // 5.1: место Ловчего известно сразу (walk.js) — ждём только подложку
        if (done || waited > 15000) { res(); return; }
        setTimeout(tick, 200);
      };
      tick();
    });
  },
};
