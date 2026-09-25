'use strict';
/* Интерфейс: HUD, меню, экраны (духи, бестиарий, сумка, коконы, задания, профиль, настройки), модалки */

const UI = {
  I: (() => {
    const s = (d, extra = '') => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
    return {
      close: s('<path d="M6 6L18 18M18 6L6 18"/>'),
      // 3.28: значки настроек
      music: s('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
      sound: s('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'),
      vibro: s('<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M3 8v8M21 8v8"/>'),
      sun: s('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
      battery: s('<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2M6 10v4M10 10v4"/>'),
      text: s('<path d="M4 7V5h11v2M9.5 5v14M7 19h5M14 12h6M17 12v7M15.5 19h3"/>'),
      hand: s('<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 10V4a1.5 1.5 0 0 1 3 0v7M14 10.5V6a1.5 1.5 0 0 1 3 0v7a7 7 0 0 1-7 7 6 6 0 0 1-5-2.7L3.4 14a1.5 1.5 0 0 1 2.5-1.6L8 15"/>'),
      calm: s('<path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><path d="M2 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" opacity=".5"/>'),
      map: s('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
      camera: s('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
      download: s('<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'),
      cloud: s('<path d="M7 18a4 4 0 0 1-.6-8 6 6 0 0 1 11.6 1.5A3.5 3.5 0 0 1 17.5 18z"/>'),
      key: s('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>'),
      mail: s('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
      lock: s('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
      eye: s('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
      eyeOff: s('<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.1 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
      logout: s('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>'),
      back: s('<path d="M15 5L8 12L15 19"/>'),
      target: s('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>'),
      spirits: s('<path d="M5 20V11a7 7 0 0 1 14 0v9l-2.3-1.6L14.3 20 12 18.4 9.7 20l-2.4-1.6z"/><circle cx="9.5" cy="11" r="1" fill="currentColor"/><circle cx="14.5" cy="11" r="1" fill="currentColor"/>'),
      book: s('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M19 19v2H6"/><path d="M9 8h6M9 11h4"/>'),
      bag: s('<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
      egg: s('<path d="M12 3c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11z"/><path d="M7 13l3 2 2-2 2 2 3-2"/>'),
      scroll: s('<path d="M7 3h11a2 2 0 0 1 2 2v2h-4"/><path d="M16 7v12a2 2 0 0 1-4 0v-1H4v1a2 2 0 0 0 2 2h8"/><path d="M16 7V5a2 2 0 0 0-4 0v13"/>'),
      user: s('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
      gear: s('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
      star: s('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
      edit: s('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
      pin: s('<path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
      swap: s('<path d="M4 8h13l-3-3M20 16H7l3 3"/>'),
      info: s('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
      trophy: s('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9 17h6"/>'),
      shop: s('<path d="M4 10h16v10H4z"/><path d="M3 10l2-6h14l2 6"/><path d="M9 20v-5h6v5"/><path d="M3 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3"/>'),
      trash: s('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>'),
      // Тропа — ступени сезона с флажком на вершине
      trail: s('<path d="M3 20h5v-4h5v-4h5V8"/><path d="M18 8V3l3.6 1.6L18 6.2"/>'),
      // Разлом — трещина в портале
      rift: s('<path d="M12.4 2.6l-2.3 5.6 3.4 2.6-2.9 4.7 1.7 6"/><path d="M7.4 5.4C5.2 7.3 4 9.6 4 12s1.2 4.7 3.4 6.6M16.6 5.4C18.8 7.3 20 9.6 20 12s-1.2 4.7-3.4 6.6"/>'),
      // Аукцион — молоток на подставке
      gavel: s('<rect x="10.5" y="2.8" width="5" height="10" rx="1.3" transform="rotate(-45 13 7.8)"/><path d="M11.2 9.6L4 16.8M12.5 21h8.5"/>'),
      chat: s('<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 9.5h8M8 12.8h5"/>'),
      shield: s('<path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/>'),
      journal: s('<path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z"/><path d="M6 3v18M10 8h6M10 12h6M10 16h4"/>'),
      qr: s('<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2v2M18 18h2v2h-2"/>'),
    };
  })(),

  layers: [], guard: false, colSort: 'power', colEl: 'all',

  init() {
    window.addEventListener('popstate', () => this.onPop());
    history.pushState({ g: 1 }, ''); this.guard = true;
    U.$('#profileBtn').onclick = () => this.profile();
    U.$('#menuBtn').onclick = () => this.menu();
    U.$('#nearbyBtn').onclick = () => this.nearbyList();
    U.$('#incenseChip').onclick = () => this.toast(`Ладан курится ещё ${U.fmtTime(S.d.incenseUntil - Date.now())}`);
    Bus.on('xp', () => this.refreshHud());
    Bus.on('levelup', l => this.levelUp(l));
    Bus.on('questDone', q => this.toast(`Задание выполнено: ${q.text}`, 'good'));
    Bus.on('quests', () => this.refreshHud());
    Bus.on('storyStep', s => this.toast(`Летопись: ${stepText(s)} — готово`, 'good'));
    Bus.on('buddyFind', text => this.toast(text, 'good'));
    Bus.on('medal', ({ m, tier }) => { Sfx.play('levelup'); this.toast(`Знак «${m.name}»: ${MEDAL_TIERS[tier - 1].name}! +${MEDAL_TIERS[tier - 1].xp} опыта`, 'good'); });
    Bus.on('weather', ({ w, changed }) => {
      this.refreshSky();
      if (changed && this._skyShown) this.toast(`Погода: ${WEATHER[w.key].name}. Сильнее духи: ${WEATHER[w.key].boost.map(e => ELEMENTS[e].name).join(', ')}`);
      this._skyShown = true;
    });
    U.$('#wxChip').onclick = () => this.skyInfo();
    U.$('#moonChip').onclick = () => this.skyInfo();
    U.$('#eventChip').onclick = () => this.eventInfo();
    this.applyA11y();
    U.$('#tracker .tr-x').onclick = e => { e.stopPropagation(); MapView.untrack(); };
    U.$('#storyPill').onclick = () => { Sfx.init(); Sfx.play('tap'); this.quests('story'); };
    U.$('#tracker').onclick = () => { if (MapView.tracking) MapView.flyTo(MapView.tracking); };
    U.$('#profileBtn .ava-art').innerHTML = Art.avatar(S.d.look);
    this.refreshEvent();
    setInterval(() => this.refreshEvent(), 60000);
    setInterval(() => { if (!document.hidden) this.refreshHud(); }, 1000);
    this.refreshHud();
    this.refreshSky();
  },

  applyA11y() {
    document.documentElement.classList.toggle('big-text', !!Cfg.s.bigText);
    document.body.classList.toggle('calm', !!Cfg.s.calm);
  },

  refreshSky() {
    const c = U.$('#wxChip'), m = U.$('#moonChip');
    if (Sky.w) { c.classList.remove('hidden'); c.innerHTML = `${Art.wxIcon(Sky.w.key, 18)}${Sky.w.temp != null ? `<span>${Sky.w.temp > 0 ? '+' : ''}${Sky.w.temp}°</span>` : ''}`; }
    const ev = Sky.moonEvent();
    m.classList.toggle('hidden', !ev);
    if (ev) m.innerHTML = `${Art.moonIcon(ev, 18)}<span>${MOON_EVENTS[ev].name}</span>`;
  },
  skyInfo() {
    Sfx.play('tap');
    const w = Sky.w, ev = Sky.moonEvent(), ph = Sky.moonPhase();
    const moonName = ph < 0.034 || ph > 0.966 ? 'новолуние' : ph < 0.25 ? 'растущий серп' : ph < 0.466 ? 'растущая Луна' : ph < 0.534 ? 'полнолуние' : ph < 0.75 ? 'убывающая Луна' : 'убывающий серп';
    this.modal({
      title: 'Небо над городом', cls: 'sky-modal',
      html: w ? `<div class="sky-row">${Art.wxIcon(w.key, 44)}<div><b>${WEATHER[w.key].name}${w.temp != null ? `, ${w.temp > 0 ? '+' : ''}${w.temp}°` : ''}</b>
          <small>${w.src === 'real' ? 'Настоящая погода (Open-Meteo)' : 'Погода Нави (смоделирована)'}</small></div></div>
        <p>Усилены: ${WEATHER[w.key].boost.map(e => `${Art.elIcon(e, 16)} ${ELEMENTS[e].name}`).join(', ')}. Таких духов больше, они сильнее, дают на 25% больше искр, а в разломах наносят на 20% больше урона.</p>` : '<p>Погода уточняется…</p>',
      buttons: [{ label: 'Понятно', cls: 'primary' }],
    }).querySelector('.modal-body').insertAdjacentHTML('beforeend',
      `<div class="sky-row">${Art.moonIcon(ev || (ph > 0.25 && ph < 0.75 ? 'full' : 'new'), 44)}<div><b>Луна: ${moonName}</b><small>${ev ? MOON_EVENTS[ev].desc : 'Ни полнолуния, ни новолуния — обычная ночь.'}</small></div></div>`);
  },

  /* ---------------- СЛОИ И КНОПКА «НАЗАД» ---------------- */
  blocking() { return this.layers.length > 0; },
  pushLayer(fn) {
    this.layers.push(fn);
    if (!this.guard) { history.pushState({ g: 1 }, ''); this.guard = true; }
    return fn;
  },
  popLayer(fn) {
    const i = fn ? this.layers.lastIndexOf(fn) : this.layers.length - 1;
    if (i >= 0) this.layers.splice(i, 1);
  },
  back() { // true — если можно выходить из приложения
    const top = this.layers[this.layers.length - 1];
    if (top) { top(); return false; }
    if (Date.now() - (this._lastBack || 0) < 2500) return true;
    this._lastBack = Date.now();
    this.toast('Нажми «Назад» ещё раз, чтобы выйти');
    return false;
  },
  onPop() {
    this.guard = false;
    const exit = this.back();
    if (exit) { history.back(); return; }
    history.pushState({ g: 1 }, ''); this.guard = true;
  },

  /* ---------------- ТОСТЫ И МОДАЛКИ ---------------- */
  toast(text, cls = '') {
    const box = U.$('#toasts');
    const t = U.el(`<div class="toast ${cls}">${text}</div>`);
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3000);
  },
  modal({ title = '', html = '', buttons = [{ label: 'OK' }], cls = '', dismiss = true }) {
    const wrap = U.el(`<div class="modal-wrap"><div class="modal ${cls}">${title ? `<div class="modal-title">${title}</div>` : ''}<div class="modal-body">${html}</div><div class="modal-btns"></div></div></div>`);
    const close = () => { if (!wrap.isConnected) return; this.popLayer(close); wrap.classList.add('out'); setTimeout(() => wrap.remove(), 200); };
    buttons.forEach(b => {
      const btn = U.el(`<button class="btn ${b.cls || ''}">${b.label}</button>`);
      btn.onclick = () => { Sfx.play('tap'); if (b.keep) { b.fn && b.fn(wrap); return; } close(); b.fn && b.fn(wrap); };
      wrap.querySelector('.modal-btns').appendChild(btn);
    });
    if (dismiss) wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    document.body.appendChild(wrap);
    this.pushLayer(close);
    wrap.close = close;
    return wrap;
  },
  confirm(title, text, okLabel, onOk, cancelLabel = 'Отмена', danger = false) {
    return this.modal({ title, html: `<p>${text}</p>`, buttons: [{ label: cancelLabel }, { label: okLabel, cls: danger ? 'danger' : 'primary', fn: onOk }] });
  },
  // 4.1.2: документ сайта (соглашение, политика, оферта) — внутри игры, в том же окне
  doc(title, src) { return this.screen(title, `<iframe class="offer-frame" src="${src}" title="${U.esc(title)}"></iframe>`, 'offer-screen'); },
  screen(title, html, cls = '', onClose) {
    const el = U.el(`<div class="screen ${cls}"><div class="screen-head"><button class="btn-round back">${this.I.back}</button><h2>${title}</h2><div class="head-extra"></div></div><div class="screen-body">${html}</div></div>`);
    el._close = () => this.closeScreen(el);
    el._onClose = onClose;
    el.querySelector('.back').onclick = () => { Sfx.play('tap'); el._close(); };
    document.body.appendChild(el);
    this.pushLayer(el._close);
    return el;
  },
  closeScreen(el) {
    if (!el.isConnected || el._closing) return;
    el._closing = true;
    this.popLayer(el._close);
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
    if (el._onClose) el._onClose();
  },

  /* ---------------- HUD ---------------- */
  refreshHud() {
    if (!S.d) return;
    const d = S.d, cur = levelXP(d.level), next = levelXP(d.level + 1);
    U.$('#hudLvl').textContent = d.level;
    const lk = JSON.stringify(d.look);
    if (this._lk !== lk) {
      this._lk = lk;
      U.$('#profileBtn .ava-art').innerHTML = Art.avatar(d.look);
      document.documentElement.style.setProperty('--pc', d.look.cloak);
    }
    U.$('#hudName').textContent = d.name;
    U.$('#hudXp').style.width = d.level >= MAX_LEVEL ? '100%' : ((d.xp - cur) / (next - cur) * 100) + '%';
    if (Tut.step()) Tut.show();
    this.storyPill();
    Hints.check();
    const badge = S.questsClaimable() + S.readyCocoons().length + Friends.inbox.length + Order.claimable(); // задания, коконы, подарки, общее дело
    const b = U.$('#menuBtn .badge'); b.classList.toggle('hidden', !badge); b.textContent = badge;
    const inc = U.$('#incenseChip');
    if (S.incenseActive()) { inc.classList.remove('hidden'); inc.innerHTML = `${Art.item('incense')}<span>${U.fmtTime(d.incenseUntil - Date.now())}</span>`; }
    else inc.classList.add('hidden');
  },
  // Летопись на карте: текущий шаг главы или «глава завершена» — чтобы сюжет не терялся в меню
  storyPill() {
    const el = U.$('#storyPill'); if (!el) return;
    const d = S.d, ch = STORY[d.story.ch], gift = d.storyGift;
    if (Tut.step() || (!ch && !gift)) { el.classList.add('hidden'); return; }
    let t, s, ready = false;
    if (!ch) { t = 'Летопись дочитана'; s = `Встреча ждёт: ${SP[gift].name}`; ready = true; }
    else if (S.storyReady()) { t = `Глава ${d.story.ch + 1}: «${ch.title}»`; s = 'Глава завершена — забери награду!'; ready = true; }
    else {
      const i = ch.steps.findIndex((x, k) => d.story.p[k] < x.n), step = ch.steps[i], p = d.story.p[i];
      t = `Глава ${d.story.ch + 1}: «${ch.title}»`;
      s = `${stepText(step).replace(/:\s*[\d.]+$/, '').replace(/^Пройди [\d.]+ км$/, 'Пройди пешком')} · ${step.t === 'walk' ? p.toFixed(1) : Math.floor(p)}/${step.n}${step.t === 'walk' ? ' км' : ''}`;
    }
    const key = t + s + ready;
    if (el._key === key && !el.classList.contains('hidden')) return;
    el._key = key;
    el.classList.remove('hidden');
    el.classList.toggle('ready', ready);
    el.querySelector('.sp-ico').innerHTML = this.I.scroll;
    el.querySelector('.sp-t').textContent = t;
    el.querySelector('.sp-s').textContent = s;
  },
  setGps(state, acc) {
    const c = U.$('#gpsChip');
    const map = { search: ['Ищу GPS…', 'warn'], ok: [`GPS ±${Math.round(acc)} м`, 'ok'], weak: [`GPS ±${Math.round(acc)} м`, 'warn'], off: ['Нет GPS', 'bad'], demo: ['Демо-режим', 'demo'] };
    const [t, cls] = map[state];
    c.className = 'chip ' + cls; c.innerHTML = `${this.I.pin}<span>${t}</span>`;
    c.onclick = state === 'demo' ? () => this.toast('Двигайся джойстиком или клавишами WASD. Выключить — в настройках.') : null;
  },
  updateNearby(list) {
    const box = U.$('#nearbyBtn .nb-arts');
    const key = list.slice(0, 3).map(e => e.id).join();
    if (box._key === key) return;
    box._key = key;
    box.innerHTML = list.slice(0, 3).map(e => `<div>${Art.img(e.sid)}</div>`).join('');
  },

  /* ---------------- СВАЙП ПО ВКЛАДКАМ ---------------- */
  // Свайп влево/вправо по экрану переключает вкладки: tabs — ключи по порядку, get() — текущая, set(key, dir) — показать.
  // На касаниях (touch), а не pointer: вертикальная прокрутка не отменяет жест. Не срабатывает на полях ввода,
  // ползунках, лентах с прокруткой вбок и карте.
  noSwipe(t) {
    for (let p = t; p && p !== document.body; p = p.parentElement) {
      if (p.matches && p.matches('input, textarea, select, .chips, .leaflet-container, .menu-pages, [data-noswipe]')) return true;
      if (p.matches && p.matches('.screen-body, .modal-body')) continue; // вертикальная прокрутка экрана — не лента вбок
      const o = getComputedStyle(p).overflowX;
      if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 2) return true;
    }
    return false;
  },
  swipeTabs(el, tabs, get, set) {
    let x0 = null, y0 = 0, t0 = 0;
    const start = (x, y, target) => { if (this.noSwipe(target)) { x0 = null; return; } x0 = x; y0 = y; t0 = Date.now(); };
    const end = (x, y) => {
      if (x0 == null) return;
      const dx = x - x0, dy = y - y0; x0 = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6 || Date.now() - t0 > 800) return;
      const dir = dx < 0 ? 1 : -1, i = tabs.indexOf(get()) + dir;
      if (i < 0 || i >= tabs.length) return;
      Sfx.play('tap'); set(tabs[i], dir);
    };
    el.addEventListener('touchstart', e => { const t = e.touches[0]; if (e.touches.length === 1) start(t.clientX, t.clientY, e.target); else x0 = null; }, { passive: true });
    el.addEventListener('touchend', e => { const t = e.changedTouches[0]; end(t.clientX, t.clientY); }, { passive: true });
    el.addEventListener('touchcancel', () => { x0 = null; }, { passive: true });
    // мышь (компьютер): то же перетаскиванием
    el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) start(e.clientX, e.clientY, e.target); });
    el.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') end(e.clientX, e.clientY); });
  },
  // лёгкий сдвиг содержимого при смене вкладки: видно, в какую сторону перелистнули
  slideIn(el, dir) {
    if (!el || !dir) return;
    el.classList.remove('slide-l', 'slide-r'); void el.offsetWidth; el.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
    clearTimeout(el._slideT); el._slideT = setTimeout(() => el.classList.remove('slide-l', 'slide-r'), 300); // и если анимация не проигралась
  },

  /* ---------------- МЕНЮ ---------------- */
  // 3.37: значки меню — в стиле вещей из Сумки (Art.item): отдельный предмет без плашки, яркая заливка,
  // толстая обводка тёмным оттенком своего цвета, тень снизу и белый блик
  menuIcon(k) {
    const hl = (x, y, rx, ry, r = -25) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${x} ${y})" fill="#fff" opacity=".5"/>`;
    const sh = (rx = 30) => `<ellipse cx="50" cy="93" rx="${rx}" ry="5" fill="#000" opacity=".28"/>`;
    const gear = (() => { let d = ''; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 - Math.PI / 16, r = i % 2 ? 26 : 35;
      d += (i ? 'L' : 'M') + (50 + r * Math.cos(a)).toFixed(1) + ' ' + (50 + r * Math.sin(a)).toFixed(1) + ' ' + (50 + r * Math.cos(a + Math.PI / 8)).toFixed(1) + ' ' + (50 + r * Math.sin(a + Math.PI / 8)).toFixed(1); }
      return d + 'Z'; })();
    const A = {
      // Духи: дух-привидение
      spirits: sh(26) + `<path d="M50 10 C30 10 20 26 20 44 V84 L30 77 L40 85 L50 77 L60 85 L70 77 L80 84 V44 C80 26 70 10 50 10Z" fill="#c4b5fd" stroke="#5b21b6" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M22 60 C30 72 70 72 78 60 V84 L70 77 L60 85 L50 77 L40 85 L30 77 L22 84Z" fill="#8b5cf6" opacity=".45"/>
        <ellipse cx="39" cy="45" rx="6" ry="8" fill="#2e1065"/><ellipse cx="61" cy="45" rx="6" ry="8" fill="#2e1065"/><circle cx="41" cy="42" r="2.4" fill="#fff"/><circle cx="63" cy="42" r="2.4" fill="#fff"/>
        <ellipse cx="31" cy="56" rx="4.5" ry="2.6" fill="#f472b6" opacity=".6"/><ellipse cx="69" cy="56" rx="4.5" ry="2.6" fill="#f472b6" opacity=".6"/><path d="M45 58 Q50 62 55 58" stroke="#2e1065" stroke-width="3" fill="none" stroke-linecap="round"/>` + hl(34, 22, 8, 4.5),
      // Бестиарий: книга с руной
      book: sh(28) + `<path d="M24 16 H74 Q80 16 80 22 V82 Q80 88 74 88 H24Z" fill="#fef3c7" stroke="#92400e" stroke-width="3"/>
        <path d="M20 12 H70 Q76 12 76 18 V78 Q76 84 70 84 H20 Q16 84 16 80 V16 Q16 12 20 12Z" fill="#14b8a6" stroke="#134e4a" stroke-width="3.5"/>
        <path d="M16 20 H26 V84 H20 Q16 84 16 80Z" fill="#0f766e"/><path d="M50 30 L62 48 L50 66 L38 48Z" fill="#fde047" stroke="#92400e" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="50" cy="48" r="4.5" fill="#92400e"/><path d="M62 12 V30 L67 26 L72 30 V12" fill="#ef4444" stroke="#7f1d1d" stroke-width="2.5" stroke-linejoin="round"/>` + hl(38, 22, 9, 3.5, -10),
      // Сумка: котомка с завязкой
      bag: sh(30) + `<path d="M34 36 C20 44 16 58 16 68 C16 84 30 90 50 90 C70 90 84 84 84 68 C84 58 80 44 66 36Z" fill="#d6a36b" stroke="#78350f" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M18 72 C24 84 76 84 82 72 C82 84 70 90 50 90 C30 90 18 84 18 72Z" fill="#a16207" opacity=".45"/>
        <path d="M38 36 C34 24 40 12 50 12 C60 12 66 24 62 36Z" fill="#e7c49a" stroke="#78350f" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M32 36 H68" stroke="#dc2626" stroke-width="6" stroke-linecap="round"/><path d="M66 38 L74 48 M66 38 L62 50" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>
        <rect x="54" y="58" width="16" height="14" rx="3" transform="rotate(-8 62 65)" fill="#b45309" stroke="#78350f" stroke-width="2.5"/>
        <path d="M58 61 L66 69 M66 61 L58 69" stroke="#fde68a" stroke-width="2" stroke-linecap="round"/>` + hl(32, 52, 7, 4, -40),
      // Коконы: как в разделе «Коконы»
      egg: Art.cocoon(2).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''),
      // Задания: свиток с печатью
      scroll: sh(30) + `<rect x="24" y="22" width="52" height="58" fill="#fef3c7" stroke="#92400e" stroke-width="3"/>
        <rect x="16" y="12" width="68" height="16" rx="8" fill="#fde68a" stroke="#92400e" stroke-width="3.5"/><rect x="16" y="74" width="68" height="16" rx="8" fill="#fde68a" stroke="#92400e" stroke-width="3.5"/>
        <path d="M34 40 H66 M34 50 H66 M34 60 H54" stroke="#b45309" stroke-width="4" stroke-linecap="round" opacity=".55"/>
        <circle cx="66" cy="66" r="10" fill="#dc2626" stroke="#7f1d1d" stroke-width="3"/><path d="M62 66 L66 62 L70 66 L66 70Z" fill="#fca5a5"/>` + hl(28, 17, 7, 2.5, 0),
      // Друзья: два духа обнялись, над ними сердечко
      swap: sh(36) + `<path d="M64 28 C50 28 44 40 44 52 V84 L51 79 L58 85 L65 79 L72 85 L79 79 L86 84 V52 C86 40 78 28 64 28Z" fill="#f9a8d4" stroke="#9d174d" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M56 51 Q60 46 64 51 M68 51 Q72 46 76 51" stroke="#500724" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="80" cy="60" rx="4" ry="2.4" fill="#f43f5e" opacity=".5"/>
        <path d="M36 32 C22 32 14 44 14 56 V86 L21 81 L28 87 L35 81 L42 87 L49 81 L56 86 V56 C56 44 50 32 36 32Z" fill="#a5f3fc" stroke="#155e75" stroke-width="3.5" stroke-linejoin="round"/>
        <ellipse cx="29" cy="55" rx="3.8" ry="5" fill="#083344"/><ellipse cx="43" cy="55" rx="3.8" ry="5" fill="#083344"/><circle cx="30.2" cy="53.3" r="1.5" fill="#fff"/><circle cx="44.2" cy="53.3" r="1.5" fill="#fff"/>
        <path d="M32 65 Q36 69 40 65" stroke="#083344" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="22" cy="63" rx="4" ry="2.4" fill="#f472b6" opacity=".5"/>
        <path d="M52 62 C60 58 66 60 68 66" stroke="#155e75" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M52 62 C60 58 66 60 68 66" stroke="#a5f3fc" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M50 22 C45 12 32 15 37 25 L50 35 L63 25 C68 15 55 12 50 22Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="3" stroke-linejoin="round"/>` + hl(26, 44, 6, 3.5) + hl(43, 20, 3, 1.8),
      // Чат: реплики-берестяные грамотки
      chat: sh(30) + `<path d="M18 14 H62 Q70 14 70 22 V44 Q70 52 62 52 H36 L24 62 V52 H18 Q10 52 10 44 V22 Q10 14 18 14Z" fill="#bfdbfe" stroke="#1e3a8a" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M40 38 H82 Q90 38 90 46 V70 Q90 78 82 78 H78 V88 L66 78 H40 Q32 78 32 70 V46 Q32 38 40 38Z" fill="#f0f9ff" stroke="#1e3a8a" stroke-width="3.5" stroke-linejoin="round"/>
        <circle cx="48" cy="58" r="4.5" fill="#2563eb"/><circle cx="61" cy="58" r="4.5" fill="#2563eb"/><circle cx="74" cy="58" r="4.5" fill="#2563eb"/>` + hl(22, 22, 7, 3, -15),
      // Лига: золотой кубок
      trophy: sh(24) + `<path d="M28 20 C12 20 10 32 14 40 C18 48 28 50 34 50" stroke="#92400e" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M28 20 C12 20 10 32 14 40 C18 48 28 50 34 50" stroke="#fbbf24" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M72 20 C88 20 90 32 86 40 C82 48 72 50 66 50" stroke="#92400e" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M72 20 C88 20 90 32 86 40 C82 48 72 50 66 50" stroke="#fbbf24" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M24 12 H76 V34 C76 52 64 62 50 62 C36 62 24 52 24 34Z" fill="#fbbf24" stroke="#92400e" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M60 14 H74 V34 C74 46 68 54 60 58Z" fill="#d97706" opacity=".5"/><rect x="43" y="60" width="14" height="14" fill="#f59e0b" stroke="#92400e" stroke-width="3"/>
        <rect x="28" y="72" width="44" height="16" rx="4" fill="#b45309" stroke="#78350f" stroke-width="3.5"/><path d="M50 22 L54 31 L64 32 L57 38 L59 48 L50 43 L41 48 L43 38 L36 32 L46 31Z" fill="#fef3c7" stroke="#92400e" stroke-width="2" stroke-linejoin="round"/>` + hl(33, 22, 4, 7, 10),
      // Лавка: лоток с полосатым навесом
      shop: sh(34) + `<rect x="18" y="44" width="64" height="44" rx="3" fill="#d6a36b" stroke="#78350f" stroke-width="3.5"/><rect x="40" y="58" width="20" height="30" rx="2" fill="#92400e" stroke="#78350f" stroke-width="3"/>
        <path d="M18 60 H82" stroke="#a16207" stroke-width="3" opacity=".5"/><rect x="24" y="50" width="12" height="10" rx="2" fill="#fde047" stroke="#78350f" stroke-width="2.5"/><rect x="64" y="50" width="12" height="10" rx="2" fill="#86efac" stroke="#78350f" stroke-width="2.5"/>
        <path d="M12 38 L22 12 H78 L88 38Z" fill="#fff" stroke="#7f1d1d" stroke-width="3.5" stroke-linejoin="round"/><path d="M34 12 L28 38 H40 L44 12Z M56 12 L60 38 H72 L66 12Z" fill="#ef4444"/>
        <path d="M12 38 Q18 48 24 38 Q30 48 36 38 Q42 48 48 38 Q54 48 60 38 Q66 48 72 38 Q78 48 84 38 Q86 42 88 38" fill="#ef4444" stroke="#7f1d1d" stroke-width="3" stroke-linejoin="round"/>` + hl(24, 18, 5, 2.5, -60),
      // Тропа: дорожный указатель
      trail: sh(26) + `<rect x="45" y="18" width="10" height="72" rx="3" fill="#a16207" stroke="#78350f" stroke-width="3.5"/>
        <path d="M22 22 H72 L82 32 L72 42 H22Z" fill="#d6a36b" stroke="#78350f" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M78 50 H28 L18 60 L28 70 H78Z" fill="#e7c49a" stroke="#78350f" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M30 32 H62 M36 60 H70" stroke="#78350f" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="5 5" opacity=".6"/>
        <path d="M50 10 C54 4 62 6 60 12 C58 16 52 16 50 10Z" fill="#4ade80" stroke="#166534" stroke-width="2.5"/>` + hl(30, 27, 5, 2, 0),
      // Разломы: каменная арка с руной, внутри — вихрь Нави
      rift: `<ellipse cx="50" cy="60" rx="30" ry="32" fill="#a855f7" opacity=".3"/>` + sh(36) + `<path d="M32 90 V50 A18 18 0 0 1 68 50 V90Z" fill="#6d28d9"/>
        <path d="M50 52 C58 52 60 62 52 64 C44 66 40 56 48 50 C58 43 70 54 64 66 C58 78 38 76 36 62" stroke="#c4b5fd" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <circle cx="50" cy="58" r="4.5" fill="#f5d0fe"/><circle cx="50" cy="58" r="10" fill="#f0abfc" opacity=".35"/>
        <path d="M14 90 V48 A36 36 0 0 1 86 48 V90 H68 V50 A18 18 0 0 0 32 50 V90Z" fill="#9ca3af" stroke="#374151" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M14 70 H32 M68 70 H86 M18 36 L34 42 M82 36 L66 42 M31 20 L40 34 M69 20 L60 34" stroke="#4b5563" stroke-width="3" stroke-linecap="round"/>
        <path d="M68 50 A18 18 0 0 0 60 35 L69 20 A36 36 0 0 1 86 48 V90 H68Z" fill="#374151" opacity=".3"/>
        <rect x="41" y="8" width="18" height="18" rx="3" fill="#6b7280" stroke="#374151" stroke-width="3.5"/><path d="M50 11 V23 M50 15 L45 11 M50 15 L55 11" stroke="#e879f9" stroke-width="2.8" stroke-linecap="round"/>
        <path d="M8 26 L10.5 31 L15.5 33.5 L10.5 36 L8 41 L5.5 36 L0.5 33.5 L5.5 31Z" fill="#fde047"/><circle cx="92" cy="30" r="2.6" fill="#e9d5ff"/>` + hl(24, 44, 6, 2.5, -60),
      // Аукцион: молоток бьёт по подставке (головкой вниз)
      gavel: sh(32) + `<rect x="34" y="76" width="50" height="13" rx="3.5" fill="#a16207" stroke="#78350f" stroke-width="3.5"/><path d="M38 79 H80" stroke="#fde68a" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>
        <path d="M72 66 L78 60 M78 72 L86 70 M66 62 L68 54" stroke="#fde047" stroke-width="3.5" stroke-linecap="round"/>
        <g transform="translate(42 54) rotate(40)"><rect x="-5" y="-58" width="10" height="48" rx="4" fill="#d6a36b" stroke="#78350f" stroke-width="3.5"/>
        <rect x="-25" y="-12" width="50" height="24" rx="5" fill="#b45309" stroke="#78350f" stroke-width="3.5"/><rect x="-18" y="-14" width="7" height="28" rx="2" fill="#fbbf24" stroke="#92400e" stroke-width="2.5"/>
        <rect x="11" y="-14" width="7" height="28" rx="2" fill="#fbbf24" stroke="#92400e" stroke-width="2.5"/><ellipse cx="-4" cy="-6" rx="6" ry="2.2" fill="#fff" opacity=".45"/></g>`,
      // Места: метка на карте
      pin: sh(18) + `<path d="M50 90 C50 90 20 60 20 38 A30 30 0 0 1 80 38 C80 60 50 90 50 90Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M66 20 A30 30 0 0 1 80 38 C80 60 50 90 50 90 C60 70 70 52 66 20Z" fill="#b91c1c" opacity=".45"/><circle cx="50" cy="38" r="12" fill="#fff" stroke="#7f1d1d" stroke-width="3"/>` + hl(34, 24, 6, 3.5, -40),
      // Ловчий: по пояс, в плаще с капюшоном (цвет плаща и глаз — из «Облика» игрока), застёжка-оберег
      user: (() => { const lk = (S.d && S.d.look) || {}, hex = /^#[0-9a-f]{6}$/i;
        const c = hex.test(lk.cloak) ? lk.cloak : '#6d28d9', eye = hex.test(lk.eyes) ? lk.eyes : '#5eead4', ol = Art.shade(c, -0.55);
        return sh(32) + `<path d="M12 92 C12 74 24 62 38 58 H62 C76 62 88 74 88 92Z" fill="${c}" stroke="${ol}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M62 58 C76 62 88 74 88 92 H72 C72 78 68 66 62 58Z" fill="#000" opacity=".2"/>
        <path d="M50 6 C32 10 22 26 22 44 C22 56 28 64 38 66 H62 C72 64 78 56 78 44 C78 26 68 10 50 6Z" fill="${c}" stroke="${ol}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M58 10 C70 18 78 30 78 44 C78 56 72 64 62 66 C68 56 70 34 58 10Z" fill="#000" opacity=".2"/>
        <path d="M50 24 C62 24 66 36 66 46 C66 56 59 62 50 62 C41 62 34 56 34 46 C34 36 38 24 50 24Z" fill="#150d2b" stroke="${ol}" stroke-width="2"/>
        <ellipse cx="43" cy="46" rx="4" ry="2.8" fill="${eye}"/><ellipse cx="57" cy="46" rx="4" ry="2.8" fill="${eye}"/><ellipse cx="50" cy="46" rx="14" ry="6" fill="${eye}" opacity=".15"/>
        <circle cx="50" cy="74" r="8" fill="#fbbf24" stroke="#92400e" stroke-width="3"/><path d="M50 69 V79 M45.5 71.5 L54.5 76.5 M54.5 71.5 L45.5 76.5" stroke="#fff7d6" stroke-width="2" stroke-linecap="round"/>` + hl(34, 22, 7, 3.5, -45); })(),
      // Дружина: славянский щит с умбоном
      shield: sh(26) + `<path d="M50 8 L84 20 V46 C84 70 68 84 50 92 C32 84 16 70 16 46 V20Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M50 8 V92 C68 84 84 70 84 46 V20Z" fill="#991b1b" opacity=".5"/><path d="M50 16 L76 25 V46 C76 64 64 76 50 83 C36 76 24 64 24 46 V25Z" fill="none" stroke="#fbbf24" stroke-width="3" opacity=".9"/>
        <circle cx="50" cy="48" r="12" fill="#fbbf24" stroke="#92400e" stroke-width="3"/><circle cx="50" cy="48" r="5" fill="#fde68a"/>` + hl(30, 26, 6, 3, -30),
      // Дневник: кожаная тетрадь с закладкой и пером
      journal: sh(28) + `<rect x="22" y="12" width="54" height="76" rx="5" fill="#fef3c7" stroke="#92400e" stroke-width="3"/>
        <rect x="18" y="10" width="54" height="76" rx="5" fill="#92400e" stroke="#451a03" stroke-width="3.5"/><rect x="18" y="10" width="12" height="76" rx="4" fill="#78350f"/>
        <rect x="36" y="26" width="28" height="18" rx="3" fill="#fef3c7" stroke="#451a03" stroke-width="2.5"/><path d="M41 32 H59 M41 38 H53" stroke="#b45309" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M58 10 V32 L63 28 L68 32 V10" fill="#ef4444" stroke="#7f1d1d" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M86 44 L56 80 L52 90 L62 84 L90 48Z" fill="#fde68a" stroke="#92400e" stroke-width="3" stroke-linejoin="round"/>` + hl(38, 18, 7, 2.5, 0),
      // 4.0 Путь Ловчего: карта-пергамент с пунктирной тропой к звезде
      path: sh(32) + `<path d="M12 22 L36 14 L64 22 L88 14 V78 L64 86 L36 78 L12 86Z" fill="#fef3c7" stroke="#92400e" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M36 14 V78 M64 22 V86" stroke="#d6a36b" stroke-width="2.5"/><path d="M64 22 L88 14 V78 L64 86Z" fill="#fde68a" opacity=".6"/>
        <path d="M20 72 C30 70 30 58 40 56 S54 52 56 44 S66 32 74 30" stroke="#dc2626" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-dasharray="4 5"/>
        <circle cx="20" cy="72" r="4.5" fill="#15803d" stroke="#14532d" stroke-width="2"/>
        <path d="M76 18 L79 25 L86 26 L81 31 L82 38 L76 34 L70 38 L71 31 L66 26 L73 25Z" fill="#fbbf24" stroke="#92400e" stroke-width="2.5" stroke-linejoin="round"/>` + hl(22, 28, 6, 2.2, -18),
      // 4.0 Книга Ордена: толстый фолиант с золотыми уголками и оберегом на обложке
      orderbook: sh(30) + `<path d="M22 14 H80 Q86 14 86 20 V84 Q86 90 80 90 H22Z" fill="#fef3c7" stroke="#92400e" stroke-width="3"/>
        <path d="M78 22 V84 M74 22 V84" stroke="#e7c49a" stroke-width="2"/>
        <rect x="14" y="10" width="62" height="78" rx="6" fill="#6d28d9" stroke="#2e1065" stroke-width="3.5"/><rect x="14" y="10" width="12" height="78" rx="5" fill="#4c1d95"/>
        <path d="M14 22 V16 Q14 10 20 10 H28 Z M76 22 V16 Q76 10 70 10 H62 Z M14 76 V82 Q14 88 20 88 H28 Z M76 76 V82 Q76 88 70 88 H62 Z" fill="#fbbf24" stroke="#92400e" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="48" cy="49" r="15" fill="#fbbf24" stroke="#92400e" stroke-width="3"/><circle cx="48" cy="49" r="10" fill="none" stroke="#fef3c7" stroke-width="1.8" stroke-dasharray="3 3"/>
        <path d="M48 41 V57 M41 45 L55 53 M55 45 L41 53" stroke="#fff7d6" stroke-width="2.6" stroke-linecap="round"/>` + hl(34, 20, 8, 3, -10),
      // Настройки: железная шестерня
      gear: sh(28) + `<path d="${gear}" fill="#94a3b8" stroke="#334155" stroke-width="3.5" stroke-linejoin="round"/>
        <circle cx="50" cy="50" r="20" fill="#64748b" opacity=".45"/><circle cx="50" cy="50" r="11" fill="#1e293b" stroke="#334155" stroke-width="3"/>` + hl(36, 30, 7, 3.5, -40),
    };
    return `<svg class="mi art" viewBox="0 0 100 100" aria-hidden="true">${A[k] || ''}</svg>`;
  },
  menu() {
    Sfx.init(); Sfx.play('tap');
    const ml = Tut.menuLock(); if (ml) { this.toast(ml); return; } // 4.0: меню открывается по ходу обучения
    const q = S.questsClaimable() + Order.claimable(), eggs = S.readyCocoons().length;
    const tiles = [
      ['spirits', 'Духи', () => this.collection(), S.d.spirits.length],
      ['book', 'Бестиарий', () => this.dex()],
      ['bag', 'Сумка', () => this.bag()],
      ['egg', 'Коконы', () => this.cocoons(), eggs ? '!' : ''],
      ['scroll', 'Задания', () => this.quests(), q ? '!' : ''],
      ['swap', 'Друзья', () => Friends.screen(), Friends.inbox.length ? '!' : S.d.items.gift ? S.d.items.gift : ''],
      ['chat', 'Чат', () => Chat.screen(), Chat.badge()],
      ['trophy', 'Лига', () => { if (S.d.level < 5) { this.toast('Лига открывается с 5 уровня Ловчего'); return; } League.screen(); }, League.view().tickets || ''],
      ['shop', 'Лавка', () => Shop.screen(), Shop.dealFresh() ? '!' : ''],
      ['trail', 'Тропа', () => Pass.screen(), Pass.claimable() || ''],
      ['rift', 'Разломы', () => Raid.list(), (n => n > 9 ? '9+' : n || '')(Raid.openCount())],
      ['path', 'Путь', () => Path.screen()],
      // вторая страница
      ['gavel', 'Аукцион', () => Auction.screen(), Auction.badge()],
      ['orderbook', 'Книга Ордена', () => Book.screen()],
      ['pin', 'Места', () => Propose.screen(), Propose.badge()],
      ['user', 'Ловчий', () => this.profile()],
      ['shield', 'Дружина', () => { if (S.d.level < CLAN_LEVEL) { this.toast(`Дружину можно выбрать с ${CLAN_LEVEL} уровня Ловчего`); return; } S.d.clan ? Clans.screen() : Clans.choose(); }],
      ['journal', 'Дневник', () => J.screen()],
      ['gear', 'Настройки', () => this.settings()],
    ];
    Tut.ui('menu'); // 4.0: шаг обучения «открой меню»
    // страницы по 12 плиток; листаются свайпом, внизу — точки текущей страницы
    const PER = 12, pages = [];
    for (let i = 0; i < tiles.length; i += PER) pages.push(tiles.slice(i, i + PER).map((t, j) => [t, i + j]));
    // 4.0: во время обучения — замки на ещё не пройденных разделах и подсветка нужного
    const tile = ([t, i]) => { const lock = Tut.tileLock(t[0]);
      return `<button class="tile${lock ? ' locked' : ''}${Tut.tileTarget(t[0]) ? ' tut-target' : ''}" data-i="${i}" data-k="${t[0]}">${this.menuIcon(t[0])}<span>${t[1]}</span>${lock ? '<i class="lock">🔒</i>' : t[3] ? `<i class="${t[3] === '!' ? 'alert' : ''}">${t[3]}</i>` : ''}</button>`; };
    const sheet = U.el(`<div class="sheet-wrap"><div class="sheet"><div class="sheet-grip"></div>
      <div class="menu-pages">${pages.map(p => `<div class="menu-grid">${p.map(tile).join('')}</div>`).join('')}</div>
      ${pages.length > 1 ? `<div class="menu-dots">${pages.map((_, i) => `<button class="${i === 0 ? 'on' : ''}" data-p="${i}" aria-label="Страница ${i + 1}"></button>`).join('')}</div>` : ''}
      <div class="sheet-foot"><span>${Art.item('charm')} ${S.d.items.charm || 0}</span><span class="spark">✦ ${U.fmtNum(S.d.sparks)}</span><span class="zlat">${Art.item('zlat')} ${U.fmtNum(S.d.zlat || 0)} ${U.plural(S.d.zlat || 0, 'златник', 'златника', 'златников')}</span></div></div></div>`);
    const close = () => { this.popLayer(close); sheet.classList.add('out'); setTimeout(() => sheet.remove(), 200); };
    const box = sheet.querySelector('.menu-pages'), dots = [...sheet.querySelectorAll('.menu-dots button')];
    const page = () => Math.round(box.scrollLeft / Math.max(1, box.clientWidth));
    box.addEventListener('scroll', () => { const p = page(); dots.forEach((d, i) => d.classList.toggle('on', i === p)); this.menuPage = p; }, { passive: true });
    sheet.addEventListener('click', e => {
      const d = e.target.closest('[data-p]');
      if (d) { box.scrollTo({ left: +d.dataset.p * box.clientWidth, behavior: 'smooth' }); return; }
      const t = e.target.closest('.tile');
      if (t) { const lk = Tut.tileLock(tiles[+t.dataset.i][0]); if (lk) { this.toast(lk); Sfx.play('miss'); return; } close(); Sfx.play('tap'); tiles[+t.dataset.i][2](); }
      else if (e.target === sheet) close();
    });
    document.body.appendChild(sheet);
    if (this.menuPage) box.scrollLeft = this.menuPage * box.clientWidth; // открываем на той странице, где закрыли
    this.pushLayer(close);
  },

  /* ---------------- КОЛЛЕКЦИЯ ---------------- */
  collection() {
    Tut.ui('spirits'); // 4.0: шаг обучения
    const scr = this.screen('Духи', `
      <div class="toolbar">
        <div class="seg">${[['power', 'Сила'], ['new', 'Новые'], ['num', 'Номер'], ['name', 'Имя']].map(([k, t]) => `<button data-sort="${k}">${t}</button>`).join('')}</div>
        <div class="chips"><button data-el="all">Все</button>${ELEMENT_KEYS.map(e => `<button data-el="${e}">${Art.elIcon(e, 18)}</button>`).join('')}<button class="sel-toggle">Выбрать</button></div>
      </div>
      <div class="grid cards"></div>
      <div class="sel-bar hidden"><span></span><button class="btn small ghost sel-dupes">Лишние</button><button class="btn small danger sel-release">Отпустить</button></div>`, 'col-screen');
    let selecting = false;
    const sel = new Set();
    const protectedUid = uid => { const x = S.findSpirit(uid); return !x || x.fav || x.shiny || (S.d.buddy && S.d.buddy.uid === uid) || S.d.team.includes(uid); };
    const updateBar = () => {
      const bar = scr.querySelector('.sel-bar');
      bar.classList.toggle('hidden', !selecting);
      bar.querySelector('span').textContent = `Выбрано: ${sel.size}`;
      scr.querySelector('.sel-toggle').classList.toggle('on', selecting);
      U.$$('.card', scr).forEach(c => c.classList.toggle('selected', sel.has(c.dataset.uid)));
    };
    const render = () => {
      let list = [...S.d.spirits];
      if (this.colEl !== 'all') list = list.filter(x => SP[x.sid].el === this.colEl);
      const cmp = {
        power: (a, b) => S.power(b) - S.power(a),
        new: (a, b) => b.t - a.t,
        num: (a, b) => SP[a.sid].num - SP[b.sid].num || S.power(b) - S.power(a),
        name: (a, b) => (a.nick || SP[a.sid].name).localeCompare(b.nick || SP[b.sid].name, 'ru'),
      }[this.colSort];
      list.sort((a, b) => (b.fav - a.fav) || cmp(a, b));
      scr.querySelector('.head-extra').textContent = `${S.d.spirits.length} ${U.plural(S.d.spirits.length, 'дух', 'духа', 'духов')}`;
      U.$$('[data-sort]', scr).forEach(b => b.classList.toggle('on', b.dataset.sort === this.colSort));
      U.$$('[data-el]', scr).forEach(b => b.classList.toggle('on', b.dataset.el === this.colEl));
      scr.querySelector('.grid').innerHTML = list.map(x => `
        <button class="card el-${SP[x.sid].el}" data-uid="${x.uid}">
          ${x.fav ? `<span class="fav">${this.I.star}</span>` : ''}
          ${S.d.buddy && S.d.buddy.uid === x.uid ? '<span class="buddy-mark">♥</span>' : ''}
          ${x.amulet ? `<span class="am-mark" style="background:${AMULETS[x.amulet].color}"></span>` : ''}
          <div class="card-pw">СИЛА <b>${S.power(x)}</b></div>
          <div class="card-art">${Art.imgOf(x)}</div>
          <div class="card-name">${U.esc(x.nick || SP[x.sid].name)}</div>
        </button>`).join('') || '<div class="empty">Пока никого. Выходи на улицу — духи ждут!</div>';
      updateBar();
    };
    scr.addEventListener('click', e => {
      const s = e.target.closest('[data-sort]'), f = e.target.closest('[data-el]'), c = e.target.closest('.card');
      if (e.target.closest('.sel-toggle')) { selecting = !selecting; sel.clear(); updateBar(); return; }
      if (e.target.closest('.sel-dupes')) {
        // из каждого вида оставляем самого сильного, остальных (кроме защищённых) выбираем
        const best = {};
        S.d.spirits.forEach(x => { if (!best[x.sid] || S.power(x) > S.power(best[x.sid])) best[x.sid] = x; });
        sel.clear();
        S.d.spirits.forEach(x => { if (best[x.sid] !== x && !protectedUid(x.uid)) sel.add(x.uid); });
        this.toast(sel.size ? `Выбраны дубликаты: ${sel.size}. Избранные, сияющие, спутник и команда не выбираются.` : 'Лишних духов нет');
        updateBar(); return;
      }
      if (e.target.closest('.sel-release')) {
        if (!sel.size) { this.toast('Никто не выбран'); return; }
        if (sel.size >= S.d.spirits.length) { this.toast('Нельзя отпустить всех духов'); return; }
        this.confirm('Отпустить?', `Духов: ${sel.size}. Они вернутся в Навь, а ты получишь эссенцию.`, 'Отпустить', async () => {
          const r = await Game.try('release', { uids: [...sel] });
          if (!r) return;
          sel.clear(); selecting = false;
          Sfx.play('flee'); this.toast(`Отпущено духов: ${r.n}. Получено эссенции: ${r.n}`, 'good');
          render(); updateBar();
        }, 'Отмена', true);
        return;
      }
      if (s) { this.colSort = s.dataset.sort; render(); }
      else if (f) { this.colEl = f.dataset.el; render(); }
      else if (c && selecting) {
        const uid = c.dataset.uid;
        if (sel.has(uid)) sel.delete(uid);
        else if (protectedUid(uid)) { this.toast('Избранных, сияющих, спутника и духов команды нельзя отпускать списком'); return; }
        else sel.add(uid);
        Sfx.play('tap'); updateBar();
      }
      else if (c) { Sfx.play('tap'); this.detail(c.dataset.uid, render); }
    });
    render();
  },

  rwText(rw) { return Object.entries(rw).filter(([k]) => k !== 'xp').map(([k, n]) => k === 'sparks' ? `✦ ${U.fmtNum(n)}` : `${ITEMS[k].name} ×${n}`).join(', '); },

  /* ---------------- КОМАНДА ---------------- */
  teamHtml(team) {
    return team.map(sp => `<div class="mini">${Art.imgOf(sp)}<b>${S.power(sp)}</b></div>`).join('') || '<i>Нет духов</i>';
  },
  pickTeam(done) {
    const chosen = S.team().map(x => x.uid);
    const list = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a));
    const m = this.modal({
      title: 'Команда из трёх духов', cls: 'team-modal',
      html: `<p class="small">Выбери до трёх духов. Совет: бери стихии, которые сильнее противника.</p><div class="grid cards team-grid">${list.map(x => `
        <button class="card el-${SP[x.sid].el}" data-uid="${x.uid}"><div class="card-pw">СИЛА <b>${S.power(x)}</b></div>
        <div class="card-art">${Art.imgOf(x)}</div><div class="card-name">${Art.elIcon(SP[x.sid].el, 14)} ${U.esc(x.nick || SP[x.sid].name)}</div></button>`).join('')}</div>`,
      buttons: [{ label: 'Сильнейшие', fn: async () => { if (await Game.try('team', { uids: [] })) done(); } },
        { label: 'Готово', cls: 'primary', fn: async () => { if (await Game.try('team', { uids: chosen })) done(); } }],
    });
    const mark = () => U.$$('.card', m).forEach(c => { const i = chosen.indexOf(c.dataset.uid); c.classList.toggle('selected', i >= 0); c.dataset.n = i >= 0 ? i + 1 : ''; });
    m.querySelector('.team-grid').addEventListener('click', e => {
      const c = e.target.closest('.card'); if (!c) return;
      const i = chosen.indexOf(c.dataset.uid);
      if (i >= 0) chosen.splice(i, 1);
      else if (chosen.length < 3) chosen.push(c.dataset.uid);
      else { this.toast('В команде уже три духа'); return; }
      Sfx.play('tap'); mark();
    });
    mark();
  },

  /* ---------------- СОБЫТИЕ НЕДЕЛИ ---------------- */
  refreshEvent() {
    const c = U.$('#eventChip'), ev = Ev.cur;
    c.innerHTML = `${ev.el ? Art.elIcon(ev.el, 16) : '<b class="ev-star">✦</b>'}<span>${ev.name}</span>`;
    const h = Ev.hol, hc = U.$('#holChip');
    hc.classList.toggle('hidden', !h);
    if (h) {
      const icon = { svyatki: '❄', maslenitsa: '☀', kupala: '✿', pokrov: '🍂', veles: '☾' }[h.id];
      hc.innerHTML = `<b class="ev-star">${icon}</b><span>${h.name}</span>`;
      hc.onclick = () => this.modal({
        title: h.name, cls: 'event-modal',
        html: `<p>${h.desc}</p>${h.seasonal ? `<div class="chain">${h.seasonal.map(id => `<div>${Art.spirit(id)}</div>`).join('')}</div>` : ''}<p class="small">Праздник продлится до ${h.end.toLocaleDateString('ru-RU', { timeZone: 'UTC' })}.</p>`,
        buttons: [{ label: 'Ура!', cls: 'primary' }],
      });
    }
  },
  eventInfo() {
    Sfx.play('tap');
    const ev = Ev.cur, nx = Ev.next;
    this.modal({
      title: ev.name, cls: 'event-modal',
      html: `<p>${ev.desc}</p><p class="small">До конца события: ${U.fmtTime(Ev.endsAt() - Date.now())}</p>
        <div class="ev-next"><small>Следующая неделя</small><b>${nx.name}</b><small>${nx.desc}</small></div>`,
      buttons: [{ label: 'Понятно', cls: 'primary' }],
    });
  },

  detail(uid, onChange) {
    Tut.ui('card'); // 4.0: шаг обучения
    if (!S.findSpirit(uid)) return;
    const scr = this.screen('', '', 'det-screen', onChange);
    const render = () => {
      const sp = S.findSpirit(uid);
      if (!sp) { this.closeScreen(scr); return; }
      const s = SP[sp.sid], st = S.stats(sp), fam = SP[s.fam], ess = S.d.essence[s.fam] || 0;
      const pc = S.powerUpCost(sp), pErr = S.canPowerUp(sp), eErr = S.canEvolve(sp);
      const iv = S.ivPct(sp), stars = iv >= 100 ? 4 : iv >= 82 ? 3 : iv >= 67 ? 2 : iv >= 50 ? 1 : 0;
      const isBuddy = S.d.buddy && S.d.buddy.uid === sp.uid;
      const bar = (label, v) => `<div class="stat"><span>${label}</span><div class="sbar"><b class="${v === 15 ? 'max' : ''}" style="width:${Math.max(4, v / 15 * 100)}%"></b></div><em>${v}/15</em></div>`;
      scr.querySelector('.screen-head h2').innerHTML = '';
      scr.querySelector('.head-extra').innerHTML = `<button class="btn-round favbtn ${sp.fav ? 'on' : ''}">${this.I.star}</button>`;
      scr.querySelector('.screen-body').innerHTML = `
        <div class="det el-${s.el}" style="--c:${ELEMENTS[s.el].color}">
          <div class="det-power">СИЛА <b>${st.power}</b></div>
          <div class="det-lvl"><div class="arc"><i style="width:${(sp.lvl / 40) * 100}%"></i></div><span>Уровень ${sp.lvl} из ${S.maxLvl()}</span></div>
          <div class="det-art">${Art.of(sp)}</div>
          <button class="det-name">${U.esc(sp.nick || s.name)} ${this.I.edit}</button>
          <div class="det-hp">ОЗ ${st.hp} · №${String(s.num).padStart(2, '0')} ${s.name}</div>
          <div class="det-tags"><span>${Art.elIcon(s.el, 18)} ${ELEMENTS[s.el].name}</span><span style="color:${RARITY[s.rar].color}">${RARITY[s.rar].name}</span>${sp.shiny ? '<span class="shiny-t">✦ Сияющий</span>' : ''}${sp.dark ? '<span class="dark-t">Омрачённый</span>' : ''}${sp.purified ? '<span class="pure-t">Очищенный</span>' : ''}</div>
          <div class="det-actions top">
            <button class="btn primary act-power" ${pErr ? 'data-err="' + U.esc(pErr) + '"' : ''}>Усилить<small>✦ ${pc.sparks} · ${pc.essence} эсс.</small></button>
            ${s.evo ? `<button class="btn evolve act-evo" ${eErr ? 'data-err="' + U.esc(eErr) + '"' : ''}>Превратить<small>${s.cost} эсс. → ${SP[s.evo].name}</small></button>` : ''}
          </div>
          ${pErr ? `<div class="det-why">${U.esc(pErr)}</div>` : ''}
          <div class="panel res"><span>✦ ${U.fmtNum(S.d.sparks)} искр</span><span>Эссенция «${fam.name}»: <b>${ess}</b></span></div>
          ${sp.dark ? `<div class="panel dark-panel"><b>Дух омрачён Навью</b><small>Атака +20%, защита −17%. Очищение снимет тьму: оценка +2 к каждому показателю, уровень до 25.</small>
            <button class="btn act-purify" ${S.canPurify(sp) ? `data-err="${U.esc(S.canPurify(sp))}"` : ''}>Очистить<small>✦ ${S.PURIFY.sparks} · ${S.PURIFY.essence} эсс.</small></button></div>` : ''}
          ${isBuddy
            ? `<div class="buddy-panel">♥ Твой спутник · находка через ${Math.max(0, S.buddyDist(sp) - S.d.buddy.km).toFixed(2)} км</div>`
            : `<button class="btn ghost wide act-buddy">♥ Сделать спутником <small>ходит с тобой и находит эссенцию каждые ${S.buddyDist(sp)} км</small></button>`}
          <div class="panel">
            <div class="det-appraise"><span>Оценка Ордена</span><b>${'★'.repeat(stars)}${'☆'.repeat(4 - stars)}</b><em>${iv}%</em></div>
            ${bar('Атака', sp.iv[0])}${bar('Защита', sp.iv[1])}${bar('Стойкость', sp.iv[2])}
            <div class="det-moves"><div><small>Быстрый приём</small>${ELEMENTS[s.el].fast}</div><div><small>Особый приём</small>${ELEMENTS[s.el].charge}</div></div>
            ${sp.move2 ? `<div class="det-moves"><div><small>Второй особый приём (⚡${MOVES.charge2.cost})</small>${ELEMENTS[s.el].charge2}</div></div>`
              : `<button class="btn ghost wide act-move2" ${S.canLearnMove2(sp) ? `data-err="${U.esc(S.canLearnMove2(sp))}"` : ''}>Выучить второй приём «${ELEMENTS[s.el].charge2}»<small>✦ ${MOVE2_COST.sparks} · ${MOVE2_COST.essence} эсс. · дешевле основного, для поединков</small></button>`}
          </div>
          <div class="panel amulet-slot">
            ${sp.amulet ? `<div class="am-ico">${Art.amulet(sp.amulet)}</div><div class="row-main"><b>${AMULETS[sp.amulet].name}</b><small>${AMULETS[sp.amulet].desc}</small></div><button class="btn small ghost act-unequip">Снять</button>`
              : `<div class="am-ico empty"></div><div class="row-main"><b>Амулет не надет</b><small>В сумке: ${Object.values(S.d.amulets).reduce((a, b) => a + b, 0)}</small></div><button class="btn small ghost act-equip">Надеть</button>`}
          </div>
          <p class="det-desc">${s.desc}</p>
          ${sp.from ? `<p class="small">Получен в подарок от Ловчего ${U.esc(sp.from)}</p>` : ''}
          <div class="det-actions">
            <button class="btn ghost danger act-release">Отпустить <small>+1 эссенция</small></button>
          </div>
        </div>`;
      U.$$('[data-err]', scr).forEach(b => b.classList.add('disabled'));
    };
    // действие над духом — на сервере; после ответа карточка перерисовывается
    const act = async (type, args, ok) => {
      const r = await Game.try(type, { uid, ...args });
      if (!r || !scr.isConnected) return r;
      render(); ok && ok(r);
      return r;
    };
    const pulse = () => { const a = scr.querySelector('.det-art'); if (a) a.classList.add('pulse'); };
    scr.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      const sp = S.findSpirit(uid); if (!sp) return;
      if (t.dataset.err) { this.toast(t.dataset.err); return; }
      if (t.classList.contains('favbtn')) act('fav', { on: !sp.fav });
      else if (t.classList.contains('det-name')) this.rename(sp, render);
      else if (t.classList.contains('act-move2')) {
        this.confirm('Второй приём', `Научить «${U.esc(sp.nick || SP[sp.sid].name)}» приёму «${ELEMENTS[SP[sp.sid].el].charge2}» за ✦ ${MOVE2_COST.sparks} и ${MOVE2_COST.essence} эссенции?`, 'Научить',
          () => act('move2', {}, () => { Sfx.play('levelup'); this.toast('Новый приём выучен!', 'good'); }));
      } else if (t.classList.contains('act-unequip')) act('unequip', {}, () => Sfx.play('tap'));
      else if (t.classList.contains('act-equip')) this.pickAmulet(sp, render);
      else if (t.classList.contains('act-purify')) {
        this.confirm('Очистить духа?', `Тьма Нави покинет «${U.esc(sp.nick || SP[sp.sid].name)}». Стоимость: ✦ ${S.PURIFY.sparks} и ${S.PURIFY.essence} эссенции.`, 'Очистить',
          () => act('purify', {}, () => { Sfx.play('levelup'); U.vibrate([40, 60, 120]); this.toast('Дух очищен! Оценка выросла', 'good'); pulse(); }));
      }
      else if (t.classList.contains('act-buddy')) {
        act('buddy', {}, () => { Sfx.play('catch'); U.vibrate(30); this.toast(`${U.esc(sp.nick || SP[sp.sid].name)} теперь твой спутник!`, 'good'); MapView.updateBuddy(); });
      }
      else if (t.classList.contains('act-power')) {
        if (t._busy) return;
        t._busy = true;
        act('powerUp', {}, () => { Sfx.play('spin'); U.vibrate(20); pulse(); }).finally(() => { t._busy = false; });
      } else if (t.classList.contains('act-evo')) {
        const s = SP[sp.sid];
        this.confirm('Превращение', `Превратить «${U.esc(sp.nick || s.name)}» в ${SP[s.evo].name}? Потратится ${s.cost} эссенции.`, 'Превратить', async () => {
          const r = await Game.try('evolve', { uid });
          if (r) this.evolveAnim(r.from, r.to, r.isNew, render, sp.shiny);
        });
      } else if (t.classList.contains('act-release')) {
        if (S.d.spirits.length <= 1) { this.toast('Нельзя отпустить последнего духа'); return; }
        this.confirm('Отпустить?', `«${U.esc(sp.nick || SP[sp.sid].name)}» (СИЛА ${S.power(sp)}) вернётся в Навь. Взамен — 1 эссенция.`, 'Отпустить', async () => {
          if (await Game.try('release', { uids: [uid] })) { Sfx.play('flee'); this.closeScreen(scr); }
        }, 'Отмена', true);
      }
    });
    render();
  },
  pickAmulet(sp, done) {
    const have = AMULET_KEYS.filter(k => S.d.amulets[k] > 0);
    if (!have.length) { this.toast('Амулетов нет. Они выпадают в разломах, капищах, вторжениях и за ранги Лиги.'); return; }
    const m = this.modal({
      title: 'Выбери амулет', cls: 'amulet-modal',
      html: `<div class="list">${have.map(k => `<button class="row am-pick" data-k="${k}"><div class="row-ico">${Art.amulet(k)}</div><div class="row-main"><b>${AMULETS[k].name}</b><small>${AMULETS[k].desc}</small></div><span class="cnt">×${S.d.amulets[k]}</span></button>`).join('')}</div>`,
      buttons: [{ label: 'Отмена' }],
    });
    m.addEventListener('click', async e => {
      const b = e.target.closest('.am-pick'); if (!b) return;
      m.close();
      if (await Game.try('equip', { uid: sp.uid, k: b.dataset.k })) { Sfx.play('spin'); done(); }
    });
  },
  rename(sp, done) {
    const m = this.modal({
      title: 'Имя духа', html: `<input class="input" maxlength="16" value="${U.esc(sp.nick || SP[sp.sid].name)}">`,
      buttons: [{ label: 'Отмена' }, { label: 'Сохранить', cls: 'primary', fn: async w => {
        const v = w.querySelector('input').value.trim();
        if (await Game.try('nick', { uid: sp.uid, nick: v })) done();
      } }],
    });
    setTimeout(() => m.querySelector('input').select(), 50);
  },  evolveAnim(from, to, isNew, done, shiny) {
    Sfx.play('levelup'); U.vibrate([40, 80, 40, 80, 120]);
    const m = this.modal({
      cls: 'evo-modal', dismiss: false,
      html: `<div class="evo-stage"><div class="evo-a">${Art.spirit(from, shiny)}</div><div class="evo-b">${Art.spirit(to, shiny)}</div><div class="evo-glow"></div></div>
             <div class="evo-text">${SP[from].name} превращается…</div>`,
      buttons: [],
    });
    setTimeout(() => {
      m.querySelector('.evo-text').innerHTML = `Это <b>${SP[to].name}</b>!${isNew ? '<div class="badge-new">Новая запись в Бестиарии!</div>' : ''}`;
      const b = U.el('<button class="btn primary">Чудесно</button>');
      b.onclick = () => { m.close(); done(); };
      m.querySelector('.modal-btns').appendChild(b);
    }, 2600);
  },

  /* ---------------- БЕСТИАРИЙ ---------------- */
  dex() {
    Tut.ui('dex'); // 4.0: шаг обучения
    const caught = SPECIES.filter(s => S.d.dex[s.id] && S.d.dex[s.id].caught).length;
    const seen = SPECIES.filter(s => S.d.dex[s.id] && S.d.dex[s.id].seen).length;
    const scr = this.screen('Бестиарий', `
      <div class="dex-sum">Поймано <b>${caught}</b> из ${SPECIES.length} · встречено ${seen}</div><div class="pbar dex-prog"><i style="width:${caught / SPECIES.length * 100}%"></i></div>
      <div class="grid dex">${SPECIES.map(s => {
        const d = S.d.dex[s.id] || {};
        const cls = d.caught ? 'caught' : d.seen ? 'seen' : 'unknown';
        return `<button class="dex-cell ${cls} el-${s.el}" data-sid="${s.id}"><span class="num">${String(s.num).padStart(2, '0')}</span>${d.shiny ? '<span class="dex-shiny">✦</span>' : ''}${Art.img(s.id)}<span class="nm">${d.seen ? s.name : '???'}</span></button>`;
      }).join('')}</div>`, 'dex-screen');
    scr.addEventListener('click', e => {
      const c = e.target.closest('.dex-cell'); if (!c) return;
      const s = SP[c.dataset.sid], d = S.d.dex[s.id];
      if (!d || !d.seen) { this.toast('Этого духа ты ещё не встречал'); return; }
      const chain = SPECIES.filter(x => x.fam === s.fam);
      this.modal({
        cls: 'dex-modal', title: `№${String(s.num).padStart(2, '0')} ${s.name}`,
        html: `<div class="dex-art el-${s.el}">${Art.spirit(s.id)}</div>
          <div class="det-tags"><span>${Art.elIcon(s.el, 18)} ${ELEMENTS[s.el].name}</span><span style="color:${RARITY[s.rar].color}">${RARITY[s.rar].name}</span>${s.time === 'night' ? '<span>Чаще ночью</span>' : ''}${s.time === 'day' ? '<span>Только днём</span>' : ''}${s.region ? `<span>Регион: ${REGIONS[s.region].name} (${REGIONS[s.region].range})</span>` : ''}${s.land ? `<span>Земля: ${LANDS[s.land].name} (${LANDS[s.land].where})</span>` : ''}${s.legend ? `<span>${s.story ? 'Награда Летописи' : 'Только в разломах'}</span>` : ''}${s.season === 'winter' ? '<span>Зимний: дек–фев и Святки</span>' : ''}${s.season === 'kupala' ? '<span>Летний: июнь–июль и Купала</span>' : ''}${s.season === 'autumn' ? '<span>Осенний: сен–ноя и Покров</span>' : ''}</div>
          <p>${s.desc}</p>
          ${chain.length > 1 ? `<div class="chain">${chain.map((x, i) => `${i ? '<span class="arr">→</span>' : ''}<div class="${S.d.dex[x.id] && S.d.dex[x.id].seen ? '' : 'unknown'}">${Art.spirit(x.id)}</div>`).join('')}</div>` : ''}
          ${d.shiny ? `<div class="chain"><div>${Art.spirit(s.id, true)}</div></div><div class="dex-stat shiny-t">✦ Сияющих поймано: ${d.shiny}</div>` : ''}
          <div class="dex-stat">Поймано: ${d.caught || 0} · Встречено: ${d.seen}</div>`,
        buttons: [{ label: 'Закрыть' }],
      });
    });
  },

  /* ---------------- СУМКА ---------------- */
  bag() {
    Tut.ui('bag'); // 4.0: шаг обучения
    const scr = this.screen('Сумка', '<div class="list bag"></div>', 'bag-screen');
    const render = () => {
      scr.querySelector('.head-extra').textContent = `${S.bagCount()}/${S.bagLimit()}`;
      const keys = Object.keys(ITEMS).filter(k => (S.d.items[k] || 0) > 0);
      const ams = AMULET_KEYS.filter(k => S.d.amulets[k] > 0);
      scr.querySelector('.list').innerHTML = ams.map(k => `
        <div class="row"><div class="row-ico">${Art.amulet(k)}</div><div class="row-main"><b>${AMULETS[k].name}</b><small>${AMULETS[k].desc}. Надевается на карточке духа.</small></div>
        <div class="row-side"><span class="cnt">×${S.d.amulets[k]}</span></div></div>`).join('') + keys.map(k => `
        <div class="row"><div class="row-ico">${Art.item(k)}</div><div class="row-main"><b>${ITEMS[k].name}</b><small>${ITEMS[k].desc}</small></div>
        <div class="row-side"><span class="cnt">×${S.d.items[k]}</span><div class="row-acts">${k === 'incense' ? `<button class="btn small primary use-inc">${S.incenseActive() ? 'Горит' : 'Зажечь'}</button>` : ''}<button class="btn-round small drop" data-k="${k}" aria-label="Выбросить">${this.I.trash}</button></div></div></div>`).join('')
        || '<div class="empty">Сумка пуста. Загляни к ближайшему роднику!</div>';
    };
    scr.addEventListener('click', async e => {
      const drop = e.target.closest('.drop');
      if (drop) { this.discard(drop.dataset.k, () => { render(); this.refreshHud(); }); return; }
      if (!e.target.closest('.use-inc')) return;
      if (S.incenseActive()) { this.toast(`Ладан ещё горит: ${U.fmtTime(S.d.incenseUntil - U.now())}`); return; }
      if (await Game.try('incense')) {
        Sfx.play('spin'); this.toast('Ладан зажжён — духи потянулись к тебе', 'good');
        MapView.refresh(); this.refreshHud(); render();
      }
    });
    render();
  },

  // Выбросить предметы из сумки: сколько — выбирает игрок (кнопки, ползунок или число)
  discard(k, done) {
    const max = S.d.items[k] || 0;
    if (!max) return;
    let n = 1;
    const m = this.modal({
      title: 'Выбросить', cls: 'drop-modal',
      html: `<div class="drop-item">${Art.item(k)}<div><b>${ITEMS[k].name}</b><small>В сумке: ${max}</small></div></div>
        <div class="drop-step"><button class="btn-round step" data-d="-1">−</button><input type="number" class="drop-n" min="1" max="${max}" value="1" inputmode="numeric"><button class="btn-round step" data-d="1">+</button></div>
        <input type="range" class="drop-range" min="1" max="${max}" value="1">
        <div class="drop-quick">${[...new Set([1, 10, Math.ceil(max / 2), max])].filter(v => v >= 1 && v <= max).map(v => `<button class="btn small ghost" data-v="${v}">${v === max ? `Все (${v})` : v}</button>`).join('')}</div>`,
      buttons: [{ label: 'Отмена' }, { label: 'Выбросить', cls: 'danger', keep: true, fn: async () => {
        const r = await Game.try('discard', { k, n });
        if (!r) return;
        m.close(); Sfx.play('tap');
        this.toast(`Выброшено: ${ITEMS[k].name} ×${r.n}`);
        done && done();
      } }],
    });
    const inp = m.querySelector('.drop-n'), range = m.querySelector('.drop-range');
    const set = v => { n = U.clamp(Math.round(+v || 1), 1, max); inp.value = n; range.value = n; };
    m.querySelector('.drop-step').addEventListener('click', e => { const b = e.target.closest('.step'); if (b) set(n + +b.dataset.d); });
    m.querySelector('.drop-quick').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) set(b.dataset.v); });
    range.addEventListener('input', () => set(range.value));
    inp.addEventListener('change', () => set(inp.value));
  },

  /* ---------------- КОКОНЫ ---------------- */
  cocoons() {
    Tut.ui('cocoons'); // 4.0: шаг обучения
    const scr = this.screen('Коконы', '<div class="coc-info"></div><div class="coc-box"></div>', 'coc-screen');
    const render = () => {
      const inc = S.incubating();
      scr.querySelector('.head-extra').textContent = `${S.d.cocoons.length}/9`;
      scr.querySelector('.coc-info').innerHTML = `Коконы согреваются, пока ты ходишь. Пройдено всего: <b>${U.fmtDist(S.d.stats.km * 1000)}</b>`;
      const card = c => {
        const ready = c.inc && c.walked >= c.km;
        return `<div class="coc-card ${ready ? 'ready' : ''}" data-id="${c.id}">
          <div class="coc-art ${c.inc ? 'warm' : ''}">${Art.cocoon(c.km)}</div>
          <b>${COCOON_TIERS[c.km].name}</b><small>${c.km} км</small>
          ${c.inc ? `<div class="pbar"><i style="width:${Math.min(100, c.walked / c.km * 100)}%"></i></div><small>${c.walked.toFixed(2)} / ${c.km} км</small>` : ''}
          ${ready ? '<button class="btn small primary hatch">Вылупить!</button>' : c.inc ? '' : `<button class="btn small warm-btn" ${inc >= 3 ? 'disabled' : ''}>Греть</button>`}
        </div>`;
      };
      // греются — три места (свободные видны), ждут — остальные
      const warm = S.d.cocoons.filter(c => c.inc), wait = S.d.cocoons.filter(c => !c.inc);
      scr.querySelector('.coc-box').innerHTML = !S.d.cocoons.length ? '<div class="empty">Коконов нет. Иногда их можно найти в роднике.</div>'
        : `<h3 class="prof-h">Греются <small>${warm.length} из 3</small></h3><div class="grid coc">${warm.map(card).join('')}${`<div class="coc-card coc-slot"><div class="coc-art"></div><b>Свободно</b><small>${wait.length ? 'нажми «Греть» у кокона ниже' : 'коконы находят в родниках'}</small></div>`.repeat(Math.max(0, 3 - warm.length))}</div>
          ${wait.length ? `<h3 class="prof-h">Ждут <small>${wait.length}</small></h3><div class="grid coc">${wait.map(card).join('')}</div>` : ''}`;
    };
    scr.addEventListener('click', async e => {
      const card = e.target.closest('.coc-card'); if (!card) return;
      const c = S.d.cocoons.find(x => x.id === card.dataset.id); if (!c) return;
      if (e.target.closest('.warm-btn')) { if (await Game.try('warm', { id: c.id })) { Sfx.play('tap'); render(); } }
      else if (e.target.closest('.hatch')) {
        const r = await Game.try('hatch', { id: c.id });
        if (r) this.hatchAnim(c, r, () => { render(); this.refreshHud(); });
      }
    });
    render();
  },
  // r — ответ сервера: кто вылупился и что получено
  hatchAnim(c, r, done) {
    const res = { sp: S.findSpirit(r.uid) || S.makeSpirit(r.sid, 1, 'x'), isNew: r.isNew, essence: r.essence, sparks: r.sparks };
    Sfx.play('wobble');
    const m = this.modal({
      cls: 'hatch-modal', dismiss: false, buttons: [],
      html: `<div class="hatch-stage"><div class="hatch-coc">${Art.cocoon(c.km)}</div><div class="hatch-sp">${Art.of(res.sp)}</div><div class="evo-glow"></div></div><div class="evo-text">Кокон шевелится…</div>`,
    });
    setTimeout(() => Sfx.play('wobble'), 700);
    setTimeout(() => Sfx.play('wobble'), 1400);
    setTimeout(() => {
      Sfx.play('hatch'); U.vibrate([40, 60, 100]);
      m.querySelector('.hatch-stage').classList.add('open');
      m.querySelector('.evo-text').innerHTML = `Из кокона появился <b>${res.sp.shiny ? '✦ сияющий ' : ''}${SP[res.sp.sid].name}</b>!<div class="small">СИЛА ${S.power(res.sp)} · +${res.essence} эссенции · +${res.sparks} искр</div>${res.isNew ? '<div class="badge-new">Новая запись в Бестиарии!</div>' : ''}`;
      const b = U.el('<button class="btn primary">Привет!</button>');
      b.onclick = () => { m.close(); done(); };
      m.querySelector('.modal-btns').appendChild(b);
    }, 2200);
  },

  /* ---------------- ЗАДАНИЯ ---------------- */
  quests(tab) {
    Tut.ui('quests'); // 4.0: шаг обучения
    this.qTab = tab || this.qTab || (S.storyReady() ? 'story' : 'day');
    const scr = this.screen('Задания', `<div class="seg q-tabs"><button data-tab="day">Задания дня${S.d.tasks.some(q => q.p >= q.n) || S.d.taskMeet.length ? ' •' : ''}</button><button data-tab="story">Летопись${S.storyReady() ? ' •' : ''}</button><button data-tab="order">Орден${Order.claimable() ? ' •' : ''}</button></div><div class="quests"></div>`, 'q-screen');
    const BONUS = Rules.QUEST_BONUS;
    const renderStory = () => {
      const st = S.d.story, ch = STORY[st.ch];
      const gift = S.d.storyGift;
      if (!ch) {
        scr.querySelector('.quests').innerHTML = `<div class="story-card"><div class="story-num">Летопись дочитана</div><p>Ты прошёл все ${STORY.length} глав. Новые главы появятся в следующих обновлениях Ордена.</p>
          ${gift ? `<button class="btn primary wide story-gift">${Art.spirit(gift)} Встретить: ${SP[gift].name}</button>` : ''}</div>`;
        return;
      }
      const ready = S.storyReady();
      scr.querySelector('.quests').innerHTML = `
        <div class="story-card">
          <div class="story-num">Глава ${st.ch + 1} из ${STORY.length}</div>
          <h3>${ch.title}</h3>
          <p class="story-text">${ch.intro}</p>
        </div>
        ${ch.steps.map((s, i) => {
          const p = st.p[i], done = p >= s.n, pv = s.t === 'walk' ? `${Math.min(p, s.n).toFixed(2)} / ${s.n} км` : `${Math.min(Math.floor(p), s.n)} / ${s.n}`;
          return `<div class="quest qd ${done ? 'done' : ''}"><div class="qd-ico">${this.qIcon(s.t, s.el)}</div>
            <div class="q-main"><b>${stepText(s)}</b><div class="qd-bar"><div class="pbar"><i style="width:${Math.min(100, p / s.n * 100)}%"></i></div><span>${pv}</span></div></div>${done ? '<span class="q-ok" aria-label="Готово">✓</span>' : ''}</div>`;
        }).join('')}
        <div class="quest bonus qd-chest ${ready ? 'done' : ''}"><div class="qd-ico chest">${ch.gift ? Art.spirit(ch.gift) : Art.item('gift')}</div>
          <div class="q-main"><b>Награда главы</b><div class="qd-pips">${ch.steps.map((s, i) => `<i class="${st.p[i] >= s.n ? 'on' : ''}"></i>`).join('')}<small>${ready ? 'можно завершить' : 'выполни все шаги главы'}</small></div>
          ${this.rwChips(ch.reward, true, ch.gift ? `<span class="qd-rw legend">${Art.spirit(ch.gift)}встреча: ${SP[ch.gift].name}</span>` : '')}</div>
          ${ready ? '<button class="btn small primary claim-story">Завершить</button>' : ''}</div>
        ${gift ? `<button class="btn primary wide story-gift">${Art.spirit(gift)} Встретить: ${SP[gift].name}</button>` : ''}`;
    };
    const render = () => {
      U.$$('[data-tab]', scr).forEach(b => b.classList.toggle('on', b.dataset.tab === this.qTab));
      if (this.qTab === 'story') return renderStory();
      if (this.qTab === 'order') {
        Order.render(scr.querySelector('.quests'));
        if (!this._orderAsked) { this._orderAsked = true; Order.refresh(true).then(() => { this._orderAsked = false; if (scr.isConnected && this.qTab === 'order') Order.render(scr.querySelector('.quests')); }); }
        return;
      }
      // 3.25: сводка дня (кольцо и таймер), значок задания, прогресс числом, награды — картинками
      const Q = S.d.quests, all = Q.list.every(q => q.claimed), doneN = Q.list.filter(q => q.p >= q.n).length;
      const rwChips = rw => this.rwChips(rw, false), ico = q => this.qIcon(q.t, q.el);
      const ring = (n, of) => { const L = 2 * Math.PI * 22; return `<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" class="qd-bg"/><circle cx="26" cy="26" r="22" class="qd-fg" style="stroke-dasharray:${L};stroke-dashoffset:${L * (1 - n / of)}"/></svg><b>${n}<small>/${of}</small></b>`; };
      scr.querySelector('.quests').innerHTML = `
        <div class="qd-head ${doneN >= Q.list.length ? 'full' : ''}"><div class="qd-ring">${ring(doneN, Q.list.length)}</div>
          <div class="row-main"><b>${doneN >= Q.list.length ? (Q.bonus ? 'Все задания дня выполнены' : 'Все задания выполнены — забери награды') : `Выполнено ${doneN} из ${Q.list.length}`}</b>
          <small>Новые задания через <span class="qd-left">${U.fmtTime(this.toMidnight())}</span></small></div></div>`
        + Q.list.map((q, i) => {
          const done = q.p >= q.n, pv = q.t === 'walk' ? `${Math.min(q.p, q.n).toFixed(2)} / ${q.n} км` : `${Math.min(Math.floor(q.p), q.n)} / ${q.n}`;
          return `<div class="quest qd ${q.claimed ? 'claimed' : done ? 'done' : ''}"><div class="qd-ico">${ico(q)}</div>
            <div class="q-main"><b>${q.text}</b><div class="qd-bar"><div class="pbar"><i style="width:${Math.min(100, q.p / q.n * 100)}%"></i></div><span>${pv}</span></div><div class="qd-rws">${rwChips(q.reward)}</div></div>
            ${q.claimed ? '<span class="q-ok" aria-label="Получено">✓</span>' : done ? `<button class="btn small primary claim" data-i="${i}">Забрать</button>` : ''}</div>`;
        }).join('')
        + `<div class="quest bonus qd-chest ${Q.bonus ? 'claimed' : all ? 'done' : ''}"><div class="qd-ico chest">${Art.item('gift')}</div>
          <div class="q-main"><b>Сундук дня</b><div class="qd-pips">${Q.list.map(q => `<i class="${q.claimed ? 'on' : q.p >= q.n ? 'half' : ''}"></i>`).join('')}<small>${Q.bonus ? 'открыт' : all ? 'можно открыть' : 'забери награды всех трёх заданий'}</small></div><div class="qd-rws">${rwChips(BONUS)}</div></div>
          ${Q.bonus ? '<span class="q-ok" aria-label="Открыт">✓</span>' : all ? '<button class="btn small primary claim-bonus">Открыть</button>' : ''}</div>`
        + this.dayLimitsHtml() + this.tasksHtml();
    };
    scr.addEventListener('click', e => {
      const c = e.target.closest('.claim'), b = e.target.closest('.claim-bonus');
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        const order = ['day', 'story', 'order'], dir = Math.sign(order.indexOf(tab.dataset.tab) - order.indexOf(this.qTab));
        this.qTab = tab.dataset.tab; Sfx.play('tap'); render(); this.slideIn(scr.querySelector('.quests'), dir); return;
      }
      const oc = e.target.closest('.o-claim');
      if (oc) { oc.disabled = true; Order.claim(+oc.dataset.w, +oc.dataset.i).then(() => { render(); this.refreshHud(); }); return; }
      if (e.target.closest('.claim-story')) {
        Game.try('storyClaim').then(res => {
          if (!res) return;
          const ch = STORY[res.ch];
          Sfx.play('levelup'); U.vibrate([40, 60, 120]);
          this.modal({
            cls: 'story-modal', title: `«${ch.title}» — глава завершена`,
            html: `<p class="story-text">${ch.outro}</p><div class="lvl-rw">${res.got.map(x => `<div>${x.k === 'xp' || x.k === 'sparks' ? `<b class="big-n">+${U.fmtNum(x.n)}</b>` : Art.item(x.k)}<span>${x.label}${x.k === 'xp' || x.k === 'sparks' ? '' : ` ×${x.n}`}</span></div>`).join('')}</div>`,
            buttons: [{ label: 'Дальше', cls: 'primary', fn: () => render() }],
          });
          render(); this.refreshHud();
        });
        return;
      }
      if (e.target.closest('.story-gift')) {
        this.closeScreen(scr);
        Encounter.start({ mode: 'story', seed: 'gift' + S.d.created });
        return;
      }
      const tc = e.target.closest('.t-claim'), td = e.target.closest('.t-drop'), tm = e.target.closest('.t-meet');
      if (tc) {
        tc.disabled = true;
        Game.try('taskClaim', { id: tc.dataset.id }).then(r => {
          if (r) { Sfx.play('spin'); this.toast(`Поручение сдано: ${r.got.map(x => `${x.label} +${x.n}`).join(', ')}. Тебя ждёт ${SP[r.meet.sid].name}!`, 'good'); }
          render(); this.refreshHud();
        });
        return;
      }
      if (td) {
        this.confirm('Отказаться от поручения?', 'Поручение исчезнет, новое можно получить у родника.', 'Отказаться', () => Game.try('taskDrop', { id: td.dataset.id }).then(() => { render(); this.refreshHud(); }), 'Оставить', true);
        return;
      }
      if (tm) {
        this.closeScreen(scr);
        Encounter.start({ mode: 'task', spawnId: tm.dataset.id, seed: 'task:' + tm.dataset.id });
        return;
      }
      const claim = (type, args, title, sound) => Game.try(type, args).then(r => {
        if (!r) return;
        Sfx.play(sound); this.toast(title + r.got.map(x => `${x.label} +${x.n}`).join(', '), 'good');
        render(); this.refreshHud();
      });
      if (c) claim('questClaim', { i: +c.dataset.i }, 'Получено: ', 'spin');
      else if (b) claim('questBonus', {}, 'Сундук: ', 'levelup');
    });
    this.swipeTabs(scr, ['day', 'story', 'order'], () => this.qTab, (k, dir) => { this.qTab = k; render(); this.slideIn(scr.querySelector('.quests'), dir); });
    render();
    // таймер до новых заданий — каждую секунду, пока экран открыт
    const tm = setInterval(() => { if (!scr.isConnected) { clearInterval(tm); return; } const el = scr.querySelector('.qd-left'); if (el) el.textContent = U.fmtTime(this.toMidnight()); }, 1000);
  },
  toMidnight() { return 86400000 - U.local().getTime() % 86400000; },
  // Награды «картинками»: предметы с иконкой, искры, опыт; extra — дополнительные плашки (кокон, встреча с легендой)
  rwChips(rw, wrap = true, extra = '') {
    const chips = Object.entries(rw || {}).map(([k, n]) => {
      if (k === 'xp') return `<span class="qd-rw xp">+${U.fmtNum(n)} опыта</span>`;
      if (k === 'sparks') return `<span class="qd-rw spark">✦ ${U.fmtNum(n)}</span>`;
      const a = Art.item(k);
      return a ? `<span class="qd-rw">${a}×${n}</span>` : '';
    }).join('') + extra;
    return wrap ? `<div class="qd-rws">${chips}</div>` : chips;
  },
  // Значок задания по его типу (задания дня, Летопись)
  qIcon(t, el) {
    if (t === 'catchEl' && el) return Art.elIcon(el, 22);
    return this.I[{ catch: 'spirits', catchEl: 'spirits', spring: 'target', throw: 'target', walk: 'trail', power: 'star', evolve: 'swap', raid: 'rift', duel: 'shield', photo: 'book', hatch: 'egg', buddy: 'user', friend: 'swap', invasion: 'shield', defend: 'shield', league: 'trophy', task: 'scroll', purify: 'star', land: 'pin' }[t] || 'scroll'];
  },
  // Лимиты дня (Rules.DAILY): сколько объектов карты уже пройдено сегодня
  dayLimitsHtml() {
    return `<h3 class="prof-h">Лимиты дня <small>обновятся в полночь</small></h3><div class="day-limits">${Object.keys(Rules.DAILY).map(k => {
      const u = Rules.dayUsed(S.d, k), m = Rules.DAILY[k];
      return `<div class="${u >= m ? 'out' : ''}"><b>${u}/${m}</b><small>${Rules.DAILY_NAMES[k]}</small></div>`;
    }).join('')}</div>`;
  },
  // Поручения из родников: задание → предметы и встреча с духом
  tasksHtml() {
    const d = S.d;
    const meets = d.taskMeet.map(m => `<div class="quest done t-row"><div class="t-sp">${Art.img(m.sid)}</div><div class="q-main"><b>Встреча: ${SP[m.sid].name}</b><small>${RARITY[SP[m.sid].rar].name} · ур. ${m.lvl}. Не сбежит, пока не поймаешь.</small></div>
      <button class="btn small primary t-meet" data-id="${m.id}">Встретить</button></div>`).join('');
    const tasks = d.tasks.map(q => {
      const done = q.p >= q.n, pv = q.t === 'walk' ? `${q.p.toFixed(2)} / ${q.n}` : `${Math.floor(q.p)} / ${q.n}`;
      return `<div class="quest t-row ${done ? 'done' : ''}"><div class="t-sp mystery">${Art.img(q.sid)}<i>${'★'.repeat(q.tier)}</i></div><div class="q-main"><b>${q.text}</b><div class="pbar"><i style="width:${Math.min(100, q.p / q.n * 100)}%"></i></div><small>${pv} · Награда: встреча с духом</small></div>
        ${done ? `<button class="btn small primary t-claim" data-id="${q.id}">Сдать</button>` : `<button class="btn-round small t-drop" data-id="${q.id}" aria-label="Отказаться">${this.I.close}</button>`}</div>`;
    }).join('');
    return `<h3 class="q-h">Поручения родников <small>${d.tasks.length} / ${TASK_LIMIT}</small></h3>${meets}${tasks ||
      (meets ? '' : '<div class="q-note">Родники иногда дают поручения: первое за день — всегда. За выполненное — предметы и встреча с духом, которого на улице не найти так просто.</div>')}`;
  },

  /* ---------------- ПРОФИЛЬ ---------------- */
  rank(l) { return l >= 30 ? 'Хранитель' : l >= 20 ? 'Ведун' : l >= 10 ? 'Следопыт' : l >= 5 ? 'Ловчий' : 'Послушник'; },
  profile() {
    Sfx.init(); Sfx.play('tap');
    const d = S.d, cur = levelXP(d.level), next = levelXP(d.level + 1);
    const caught = SPECIES.filter(s => d.dex[s.id] && d.dex[s.id].caught).length;
    const bsp = S.buddySpirit();
    const days = Math.max(1, Math.ceil((Date.now() - d.created) / 864e5));
    const buddyHtml = bsp ? `<div class="prof-buddy"><div class="pb-art">${Art.of(bsp)}</div><div class="pb-main"><b>♥ ${U.esc(bsp.nick || SP[bsp.sid].name)}</b><small>Спутник · находок: ${d.buddy.finds}</small>
      <div class="pbar"><i style="width:${Math.min(100, d.buddy.km / S.buddyDist(bsp) * 100)}%"></i></div><small>${d.buddy.km.toFixed(2)} / ${S.buddyDist(bsp)} км до находки</small></div></div>`
      : '<div class="prof-buddy empty-b">Спутника нет. Выбери его на карточке духа.</div>';
    const medalsHtml = MEDALS.map(m => {
      const tier = d.medals[m.id] || 0, v = S.medalValue(m), next = m.tiers[tier];
      return `<button class="medal" data-m="${m.id}"><div class="medal-art">${Art.medal(m, tier)}</div><b>${m.name}</b>
        ${next != null ? `<div class="pbar"><i style="width:${Math.min(100, v / next * 100)}%"></i></div>` : '<small class="gold-t">Золото</small>'}</button>`;
    }).join('');
    const scr = this.screen('Ловчий', `
      <div class="prof">
        <div class="pc-hero prof-hero" style="--cc:${d.clan ? CLANS[d.clan].color : '#fbbf24'}">
          <div class="prof-top">
            <div class="pc-ava prof-ava-wrap"><div class="prof-ava">${this.avatar()}</div><span class="pc-lvl">${d.level}</span></div>
            <div class="pc-id"><b class="pc-name">${U.esc(d.name)}</b><small>${this.rank(d.level)} Ордена Оберега</small>
              <div class="pc-tags">${d.clan ? `<span class="pc-tag clan">${CLANS[d.clan].short}</span>` : ''}<span class="pc-tag">в Ордене ${days} ${U.plural(days, 'день', 'дня', 'дней')}</span></div>
              ${Game.on() ? `<div class="acc-tags">${Login.accountTags()}</div>` : ''}</div>
          </div>
          <div class="prof-xp">
            <div class="prof-xp-row"><b>${d.level >= MAX_LEVEL ? 'Максимальный уровень' : `${d.level} → ${d.level + 1} уровень`}</b>${d.level >= MAX_LEVEL ? '' : `<span>${U.fmtNum(d.xp - cur)} / ${U.fmtNum(next - cur)}</span>`}</div>
            <div class="pbar big"><i style="width:${d.level >= MAX_LEVEL ? 100 : (d.xp - cur) / (next - cur) * 100}%"></i></div>
          </div>
        </div>
        <div class="prof-actions">
          <button class="pa look-btn"><span class="pa-ic">${this.I.edit}</span><b>Облик</b></button>
          <button class="pa journal-btn"><span class="pa-ic">${this.I.journal}</span><b>Дневник</b></button>
          ${d.clan ? `<button class="pa clan-open"><span class="pa-ic">${this.I.shield}</span><b>Дружина</b></button>`
            : d.level >= CLAN_LEVEL ? `<button class="pa hot clan-btn"><span class="pa-ic">${this.I.shield}</span><b>Выбрать дружину</b></button>`
            : `<button class="pa off" disabled><span class="pa-ic">${this.I.shield}</span><b>Дружина</b><small>с ${CLAN_LEVEL} уровня</small></button>`}
        </div>
        ${Game.on() && Login.isGuest() && Login.available().length ? `<div class="prof-acc guest"><small>Привяжи вход — прогресс откроется на любом устройстве:</small><div class="login-row">${Login.buttons('link')}</div></div>` : ''}
        <div class="prof-key">
          <div><span class="pk-ic">${this.I.spirits}</span><b>${U.fmtNum(d.stats.caught)}</b><small>поймано духов</small></div>
          <div><span class="pk-ic">${this.I.book}</span><b>${caught}<em>/${SPECIES.length}</em></b><small>бестиарий</small><i class="pk-bar"><i style="width:${caught / SPECIES.length * 100}%"></i></i></div>
          <div><span class="pk-ic">${this.I.trail}</span><b>${U.fmtDist(d.stats.km * 1000)}</b><small>пройдено</small></div>
        </div>
        <h3 class="prof-h">Достижения</h3>
        <div class="prof-rows">${[
          ['pin', 'Родников', d.stats.springs], ['rift', 'Закрыто разломов', d.stats.raids], ['shield', 'Побед на Капищах', d.stats.duels],
          ['target', 'Вторжений отбито', d.stats.invasions], ['star', 'Превращений', d.stats.evolved], ['egg', 'Из коконов', d.stats.hatched],
          ['star', 'Сияющих', d.stats.shiny], ['spirits', 'Очищено духов', d.stats.purified], ['target', 'Отличных бросков', d.stats.throwsGreat],
          ...(d.clan ? [['shield', 'Защитников поставлено', d.stats.defends || 0], ['trophy', 'Капищ освобождено', d.stats.freed || 0]] : []),
        ].map(([ic, t, v]) => `<div class="pr-row"><span class="pr-ic">${this.I[ic]}</span><span class="pr-t">${t}</span><b>${U.fmtNum(v || 0)}</b></div>`).join('')}</div>
        <h3 class="prof-h">Спутник</h3>
        ${buddyHtml}
        <h3 class="prof-h">Знаки Ордена <small>${Object.values(d.medals).reduce((a, b) => a + b, 0)} / ${MEDALS.length * 3}</small></h3>
        <div class="medals">${medalsHtml}</div>
        <h3 class="prof-h">Альбом <small>${Album.list().length} / ${Album.MAX}</small></h3>
        <div class="album-box">${Album.html()}</div>
        <div class="prof-since">В Ордене с ${new Date(d.created).toLocaleDateString('ru-RU')}</div>
      </div>`, 'prof-screen');
    scr.addEventListener('click', e => {
      const lg = e.target.closest('[data-login]'); if (lg) { Login.start(lg.dataset.login, lg.dataset.mode); return; }
      if (e.target.closest('.journal-btn')) { J.screen(); return; }
      if (e.target.closest('.clan-btn')) { Clans.choose(() => { this.closeScreen(scr); this.profile(); }); return; }
      if (e.target.closest('.clan-open')) { Clans.screen(); return; }
      if (e.target.closest('.look-btn')) {
        this.editLook(() => { scr.querySelector('.prof-ava').innerHTML = this.avatar(); this.refreshHud(); });
        return;
      }
      const ai = e.target.closest('.album-item');
      if (ai) {
        const m = Album.open(+ai.dataset.i);
        const refresh = () => { if (!m.isConnected) { scr.querySelector('.album-box').innerHTML = Album.html(); clearInterval(tm); } };
        const tm = setInterval(refresh, 300);
        return;
      }
      const b = e.target.closest('.medal'); if (!b) return;
      const m = MEDALS.find(x => x.id === b.dataset.m), tier = d.medals[m.id] || 0, v = S.medalValue(m);
      this.modal({
        cls: 'medal-modal', title: m.name,
        html: `<div class="medal-big">${Art.medal(m, tier)}</div><p>${m.desc}: <b>${m.stat === 'km' ? v.toFixed(1) : v}</b></p>
          <div class="medal-tiers">${m.tiers.map((t, i) => `<div class="${tier > i ? 'got' : ''}"><i style="background:${MEDAL_TIERS[i].color}"></i>${MEDAL_TIERS[i].name}: ${t}<small>+${MEDAL_TIERS[i].xp} опыта</small></div>`).join('')}</div>`,
        buttons: [{ label: 'Закрыть' }],
      });
    });
  },
  avatar() { return Art.avatar(S.d ? S.d.look : undefined); },
  // Облик: плащ, глаза, эмблема; варианты открываются с уровнем
  editLook(done) {
    const look = { ...S.d.look }, lvl = S.d.level;
    const sw = (group, items, render) => `<div class="look-row"><small>${group}</small><div class="look-sw">${items.map(render).join('')}</div></div>`;
    const m = this.modal({
      title: 'Облик Ловчего', cls: 'look-modal',
      html: `<div class="look-prev"></div>
        ${sw('Плащ', LOOK.cloak, x => {
          // плащи из Лавки и с Золотой тропы открываются покупкой
          const lk = (x.shop || x.pass) && !S.d.owned[x.c] ? (x.shop ? 'shop' : 'pass') : x.lvl;
          return `<button class="sw ${lk === 'shop' || lk === 'pass' || x.lvl > lvl ? 'locked' : ''} ${x.shop || x.pass ? 'special' : ''}" data-k="cloak" data-v="${x.c}" data-l="${lk}" title="${x.name}" style="--sw:${x.c}"></button>`;
        })}
        ${sw('Глаза', LOOK.eyes, x => `<button class="sw ${x.lvl > lvl ? 'locked' : ''}" data-k="eyes" data-v="${x.c}" data-l="${x.lvl}" title="${x.name}" style="--sw:${x.c}"></button>`)}
        ${sw('Эмблема', LOOK.emblem, x => {
          // особые эмблемы: за ранг Лиги и за вторую книгу Летописи
          const lk = x.league && League.view().best < x.league ? 'league' : x.story && S.d.story.ch < x.story ? 'story' : x.pass && !S.d.owned[x.id] ? 'pass' : x.lvl;
          const locked = x.lvl > lvl || typeof lk === 'string';
          return `<button class="sw em ${locked ? 'locked' : ''}" data-k="emblem" data-v="${x.id}" data-l="${lk}" title="${x.name}">${Art.avatar({ cloak: '#241a45', eyes: '#241a45', emblem: x.id }).replace('viewBox="0 0 100 100"', 'viewBox="36 70 28 28"')}</button>`;
        })}
        <p class="small look-hint">Новые цвета и эмблемы открываются с уровнем.</p>`,
      buttons: [{ label: 'Отмена' }, { label: 'Сохранить', cls: 'primary', fn: async () => { if (await Game.try('look', { look })) done && done(); } }],
    });
    const render = () => {
      m.querySelector('.look-prev').innerHTML = Art.avatar(look);
      U.$$('.sw', m).forEach(b => b.classList.toggle('on', look[b.dataset.k] === b.dataset.v));
    };
    m.addEventListener('click', e => {
      const b = e.target.closest('.sw'); if (!b) return;
      if (b.dataset.l === 'league') { this.toast('Венец Лиги — награда за ранг «Хранитель Лиги»'); return; }
      if (b.dataset.l === 'story') { this.toast('Эта эмблема — награда за Летопись'); return; }
      if (b.dataset.l === 'shop') { this.toast('Этот плащ продаётся в Лавке Ордена за златники'); return; }
      if (b.dataset.l === 'pass') { this.toast('Награда Золотой сезонной тропы'); return; }
      if (+b.dataset.l > lvl) { this.toast(`Откроется на ${b.dataset.l} уровне`); return; }
      look[b.dataset.k] = b.dataset.v; Sfx.play('tap'); render();
    });
    render();
  },

  /* ---------------- НАСТРОЙКИ ---------------- */
  settings() {
    const s = Cfg.s;
    // 3.28: разделы с заголовками, у каждого пункта — значок
    const row = (k, ico, title, sub) => `<label class="row toggle set-row"><span class="set-ico">${this.I[ico]}</span><div class="row-main"><b>${title}</b><small>${sub}</small></div><input type="checkbox" data-k="${k}" ${s[k] ? 'checked' : ''}><i></i></label>`;
    const link = (cls, ico, title, sub) => `<button class="row link set-row ${cls}"><span class="set-ico">${this.I[ico]}</span><div class="row-main"><b>${title}</b><small>${sub}</small></div><span class="set-chev">›</span></button>`;
    const sec = t => `<div class="set-h">${t}</div>`;
    const scr = this.screen('Настройки', `
      ${Game.on() ? `${sec('Учётная запись')}<div class="list acc-box"></div>` : ''}
      ${DEV ? `${sec('Разработка')}<div class="list">${row('demo', 'target', 'Демо-режим', 'Джойстик вместо GPS. Доступен только на локальном сервере.')}</div>` : ''}
      ${sec('Звук и отклик')}
      <div class="list">
        ${row('music', 'music', 'Музыка', 'Спокойные «гусли» на карте и боевая тема в сражениях.')}
        ${row('sound', 'sound', 'Звук', 'Звуковые эффекты.')}
        ${row('vibro', 'vibro', 'Вибрация', 'Отклик при бросках и попаданиях.')}
      </div>
      ${sec('Игра')}
      <div class="list">
        ${row('ar', 'camera', 'AR-камера', 'Духи появляются поверх изображения с камеры.')}
        ${row('tapThrow', 'hand', 'Бросок одним касанием', 'Коснись оберега — он сам полетит в духа. Бонус кольца по-прежнему зависит от момента.')}
        ${row('weather', 'sun', 'Настоящая погода', 'Погода через Open-Meteo (координаты с точностью ~1 км). Выключено — погода Нави моделируется.')}
        ${Cloud.configured() ? row('cloud', 'trophy', 'Общая таблица Лиги', 'Показывать твоё имя, облик, уровень и звёзды в таблице сезона.') : ''}
      </div>
      ${sec('Вид')}
      <div class="list">
        <div class="row set-row"><span class="set-ico">${this.I.map}</span><div class="row-main"><b>Тема карты</b><small>Авто — тёмная с 20:00 до 6:00</small></div>
          <div class="seg map-theme">${[['auto', 'Авто'], ['light', 'День'], ['dark', 'Ночь']].map(([k, t]) => `<button data-theme="${k}" class="${(s.mapTheme || 'auto') === k ? 'on' : ''}">${t}</button>`).join('')}</div></div>
        ${row('bigText', 'text', 'Крупный текст', 'Увеличенный шрифт в меню, карточках и подсказках.')}
        ${row('calm', 'calm', 'Меньше движения', 'Без покачиваний, мерцания и погодных эффектов.')}
        ${row('eco', 'battery', 'Экономия батареи', 'Меньше анимаций на карте, реже обновление и запросы GPS.')}
      </div>
      <div class="list install-list">
        <button class="row link set-row inst-pwa hidden"><span class="set-ico">${this.I.download}</span><div class="row-main"><b>Установить на главный экран</b><small>Духолов откроется на весь экран, как обычное приложение</small></div><span class="set-chev">›</span></button>
        <a class="row link set-row inst-apk hidden" href="duholov.apk" download><span class="set-ico">${this.I.download}</span><div class="row-main"><b>Скачать APK для Android</b><small>Приложение-обёртка: разреши установку из этого источника</small></div><span class="set-chev">›</span></a>
      </div>
      ${sec('Об игре')}
      <div class="list">
        ${link('about', 'info', 'Книга Ордена', 'Мир, духи и все правила игры; трейлер')}
        ${link('terms', 'info', 'Правила игры', 'Соглашение, безопасность на улице, чат · 12+')}
        ${link('privacy', 'info', 'Персональные данные', 'Какие данные хранит игра и как их удалить')}
        <button class="row link set-row reset"><span class="set-ico danger">${this.I.trash}</span><div class="row-main"><b class="danger-t">Сбросить прогресс</b><small>Удалить всех духов и начать заново</small></div><span class="set-chev">›</span></button>
        ${Game.on() ? `<button class="row link set-row del-acc"><span class="set-ico danger">${this.I.trash}</span><div class="row-main"><b class="danger-t">Удалить учётную запись</b><small>Прогресс, способы входа и все данные — навсегда</small></div></button>` : ''}
      </div>
      <div class="ver">Духолов · v${APP_VERSION}${Updater.IN_APP ? ` · приложение ${Updater.APK}` : ''} · <button class="link-btn check-upd">Проверить обновления</button><br>Карта © участники OpenStreetMap</div>`, 'set-screen');
    scr.addEventListener('change', e => {
      const k = e.target.dataset.k; if (!k) return;
      s[k] = e.target.checked; Cfg.save();
      if (k === 'demo') { s.demo ? MapView.startDemo() : (MapView._offered = false, MapView.startGPS()); }
      if (k === 'sound' && s.sound) { Sfx.init(); Sfx.play('tap'); }
      if (k === 'weather') Sky.update(true);
      if (k === 'music') { Sfx.init(); Music.apply(); }
      if (k === 'eco') { document.body.classList.toggle('eco', s.eco); if (!s.demo) MapView.startGPS(); }
      if (k === 'bigText' || k === 'calm') this.applyA11y();
    });
    scr.querySelector('.map-theme').addEventListener('click', e => {
      const b = e.target.closest('[data-theme]'); if (!b) return;
      s.mapTheme = b.dataset.theme; Cfg.save();
      U.$$('[data-theme]', scr).forEach(x => x.classList.toggle('on', x === b));
      MapView.night = null; MapView.setTiles();
    });
    // установка: кнопка PWA (если браузер предложил) и APK (если он собран и лежит рядом с сайтом)
    const pwa = scr.querySelector('.inst-pwa'), apk = scr.querySelector('.inst-apk');
    if (window.__installPrompt) pwa.classList.remove('hidden');
    scr.querySelector('.check-upd').onclick = async () => {
      await Updater.check(true);
      if (!Updater.shown) this.toast(`У тебя последняя версия — ${APP_VERSION}`, 'good');
    };
    pwa.onclick = async () => { const p = window.__installPrompt; if (!p) return; p.prompt(); await p.userChoice; window.__installPrompt = null; pwa.classList.add('hidden'); };
    if (!Updater.IN_APP && /Android/i.test(navigator.userAgent)) {
      fetch('duholov.apk', { method: 'HEAD' }).then(r => { if (r.ok) { apk.classList.remove('hidden'); il.classList.remove('empty-list'); } }).catch(() => {});
    }
    const il = scr.querySelector('.install-list');
    if (!il.querySelector('.row:not(.hidden)')) il.classList.add('empty-list');
    // 3.27–3.32: учётная запись — чей прогресс, какими входами открывается, привязать ещё вход, выйти
    const acc = scr.querySelector('.acc-box');
    const renderAcc = () => {
      if (!acc || !scr.isConnected) return;
      const d = S.d, guest = Login.isGuest(), links = Login.linked(), avail = Login.available().filter(k => !links.some(l => l.provider === k));
      const way = (ic, title, sub, end = '<span class="acc-ok">✓</span>') => `<div class="acc-way">${ic}<div class="row-main"><b>${title}</b><small>${sub}</small></div>${end}</div>`;
      // 3.33: у кого вход уже есть — непривязанные сервисы строками того же списка с небольшой кнопкой; гостю — крупные кнопки
      const addRows = guest ? '' : avail.map(k => way(Login.icon(k), Login.NAMES[k], 'ещё один способ входа',
        `<button class="btn acc-link" data-login="${k}" data-mode="link">Привязать</button>`)).join('');
      acc.innerHTML = `<div class="acc-hero ${guest ? 'guest' : ''}" style="--cc:${d.clan && CLANS[d.clan] ? CLANS[d.clan].color : '#fbbf24'}">
          <div class="pc-ava"><div class="acc-ava">${Art.avatar(d.look)}</div><span class="pc-lvl">${d.level}</span></div>
          <div class="acc-main"><b>${U.esc(d.name)}</b><small>${this.rank(d.level)} · ${d.level} уровень</small>
            <span class="acc-status ${guest ? 'warn' : 'ok'}">${guest ? `${this.I.user}Гость · только на этом устройстве` : `${this.I.cloud}Прогресс в облаке`}</span></div>
        </div>`
        + (links.length || Login.email ? `<div class="acc-ways"><div class="acc-cap">Способы входа</div>${Login.email ? way(`<span class="lg-ic mail">${this.I.mail}</span>`, 'Почта', U.esc(Login.email)) : ''}${links.map(l => way(Login.icon(l.provider), Login.NAMES[l.provider], l.name ? U.esc(l.name) : 'вход привязан')).join('')}${addRows}</div>` : '')
        + (guest && avail.length ? `<div class="acc-add"><small>Привяжи вход — прогресс откроется на любом устройстве</small><div class="login-row">${Login.buttons('link', avail)}</div></div>` : '')
        + (Updater.oldApp() ? `<div class="acc-add"><small><b>Новое приложение Духолов.</b> Игра переехала на duholov.ru — приложение нужно поставить заново: ${guest ? '<b>сначала привяжи вход выше</b> (иначе прогресс гостя пропадёт), потом ' : ''}удали это приложение и установи новое.</small><a class="btn primary" href="duholov.apk">Скачать новое приложение</a></div>` : '')
        + `<button class="row link set-row acc-out"><span class="set-ico out">${this.I.logout}</span><div class="row-main"><b>Выйти из учётной записи</b><small>${guest ? 'Прогресс гостя будет потерян' : 'Вернуться можно тем же входом'}</small></div><span class="set-chev">›</span></button>`;
      acc.querySelectorAll('[data-login]').forEach(b => { b.onclick = () => Login.start(b.dataset.login, b.dataset.mode); });
      acc.querySelector('.acc-out').onclick = () => Login.askSignOut();
    };
    renderAcc();
    Login.load().then(renderAcc);
    scr.querySelector('.about').onclick = () => Book.screen(); // 4.0: вместо списка «Об игре»
    scr.querySelector('.terms').onclick = () => UI.doc('Правила игры', 'terms.html');
    scr.querySelector('.privacy').onclick = () => UI.doc('Персональные данные', 'privacy.html');
    // 4.1: полное удаление учётной записи (152-ФЗ) — после двух подтверждений; платежи остаются без привязки
    const del = scr.querySelector('.del-acc');
    if (del) del.onclick = () => this.confirm('Удалить учётную запись?', 'Прогресс, духи, способы входа, место в Лиге и лоты аукциона будут удалены навсегда. Купленные златники не вернутся.', 'Удалить', () => {
      this.confirm('Точно удалить?', 'Восстановить учётную запись будет нельзя.', 'Да, удалить навсегда', async () => {
        try { await Game.auth('delete', { confirm: 'УДАЛИТЬ' }); } catch (e) { UI.toast(U.esc(e.message)); return; }
        try { localStorage.removeItem(CLOUD_CONFIG.auth); } catch (e) {}
        location.reload();
      }, 'Нет', true);
    });
    scr.querySelector('.reset').onclick = () => this.confirm('Сбросить прогресс?', 'Все духи, предметы и уровень будут удалены с сервера навсегда.', 'Сбросить', () => {
      this.confirm('Точно?', 'Это действие нельзя отменить.', 'Да, сбросить', async () => {
        if (await Game.try('reset')) location.reload();
      }, 'Нет', true);
    }, 'Отмена', true);
  },
  /* ---------------- РОДНИК ---------------- */
  spring(e) {
    const scr = this.screen('', `
      <div class="spring-view">
        <div class="spring-title">${U.esc(e.name)}</div>
        <div class="spring-disc"><div class="runes"></div>${Poi.photoUrl(e.photo) ? `<div class="well photo" style="background-image:url('${Poi.photoUrl(e.photo)}')"></div>` : `<div class="well">${Art.springIcon(!e.ready)}</div>`}</div>
        <div class="spring-hint"></div>
        <div class="spring-loot"></div>
        <button class="btn primary wide spring-go">Зачерпнуть силу</button>
        ${Rules.dayLine(S.d, 'springs', 'Родников')}
      </div>`, 'spring-screen');
    const hint = scr.querySelector('.spring-hint'), go = scr.querySelector('.spring-go');
    const ready = () => U.now() - (S.d.springs[e.id] || 0) > W.SPRING_COOLDOWN;
    const update = () => {
      if (!scr.isConnected) return clearInterval(timer);
      if (scr._done) return;
      if (!ready()) {
        hint.textContent = `Родник набирает силу: ${U.fmtTime((S.d.springs[e.id] || 0) + W.SPRING_COOLDOWN - U.now())}`;
        go.disabled = true; scr.querySelector('.spring-view').classList.add('used');
      } else {
        hint.textContent = 'Смахни по кругу или нажми кнопку';
        go.disabled = false; scr.querySelector('.spring-view').classList.remove('used');
      }
    };
    const timer = setInterval(update, 1000);
    update();
    // Добычу выдаёт сервер: он проверяет, что ты рядом и родник готов
    const take = async () => {
      if (!ready() || scr._done) return;
      scr._done = true;
      const disc = scr.querySelector('.spring-disc');
      disc.classList.add('spin');
      Sfx.play('spin'); U.vibrate([20, 40, 20]);
      const r = await Game.try('spring', { poi: { id: e.id, lat: e.lat, lng: e.lng, name: e.name } });
      if (!scr.isConnected) return;
      if (!r) { scr._done = false; disc.classList.remove('spin'); update(); return; }
      const got = r.got;
      const cocoonHtml = r.cocoon ? `<div class="loot-item" style="animation-delay:${got.length * 0.12}s">${Art.cocoon(r.cocoon.km)}<span>Кокон ${r.cocoon.km} км</span></div>` : '';
      scr.querySelector('.spring-loot').innerHTML = got.filter(x => x.k !== 'xp').map((x, i) => `<div class="loot-item" style="animation-delay:${i * 0.12}s">${Art.item(x.k)}<span>${x.label} ×${x.n}</span></div>`).join('') + cocoonHtml +
        `<div class="loot-xp">+${got.find(x => x.k === 'xp') ? got.find(x => x.k === 'xp').n : 50} опыта${r.full ? ' · Сумка полна! Расширь её в Лавке Ордена' : ''}</div>` +
        (r.task ? `<div class="loot-task">Новое поручение: <b>${r.task.text}</b><small>Награда — встреча с духом. Смотри «Меню → Задания».</small></div>` : '');
      hint.textContent = '';
      go.textContent = 'Готово';
      go.disabled = false;
      go.onclick = () => this.closeScreen(scr);
      MapView.refresh();
    };
    go.onclick = take;
    // жест: свайп по диску
    let sx = null;
    const disc = scr.querySelector('.spring-disc');
    disc.addEventListener('pointerdown', ev => { sx = ev.clientX; });
    disc.addEventListener('pointerup', ev => { if (sx != null && Math.abs(ev.clientX - sx) > 40) take(); sx = null; });
  },

  /* ---------------- РЯДОМ ---------------- */
  nearbyList() {
    Sfx.init(); Sfx.play('tap');
    const list = MapView.nearby.slice(0, 9);
    const m = this.modal({
      title: 'Духи рядом', cls: 'nearby-modal',
      html: list.length ? `<div class="nb-list">${list.map((e, i) => {
        const s = SP[e.sid], d = U.dist(MapView.pos.lat, MapView.pos.lng, e.lat, e.lng);
        const known = S.d.dex[s.id] && S.d.dex[s.id].caught;
        return `<button class="nb-item" data-i="${i}"><div class="nb-art ${S.d.dex[s.id] && S.d.dex[s.id].seen ? '' : 'unknown'}">${Art.img(e.sid)}</div><b>${S.d.dex[s.id] && S.d.dex[s.id].seen ? s.name : '???'}</b><small class="${d <= W.INTERACT ? 'near' : ''}">${U.fmtDist(d)}</small>${known ? '' : '<i class="new">new</i>'}</button>`;
      }).join('')}</div><p class="small nb-hint">Коснись духа — Следопыт покажет к нему дорогу.</p>` : '<p>Поблизости тихо. Прогуляйся или зажги ладан.</p>',
      buttons: [
        { label: 'К роднику', fn: () => this.trackNearest('spring') },
        { label: 'К капищу', fn: () => this.trackNearest('shrine') },
      ],
    });
    m.addEventListener('click', ev => {
      const it = ev.target.closest('.nb-item'); if (!it) return;
      const e = list[+it.dataset.i];
      m.close(); MapView.track(e); MapView.flyTo(e);
    });
  },
  trackNearest(type) {
    const e = MapView.nearest(type);
    if (!e) { this.toast(type === 'spring' ? 'Рядом нет готовых родников' : 'Рядом нет свободных капищ'); return; }
    MapView.track(e); MapView.flyTo(e);
    this.toast(`Следопыт: ${U.esc(e.name)}, ${U.fmtDist(e.d)}`);
  },

  /* ---------------- УРОВЕНЬ ---------------- */
  // lv: { l, got } — новый уровень и награда, которую уже выдал сервер
  levelUp(lv) {
    (this._lv = this._lv || []).push(lv);
    this.flushLevelUps();
  },
  flushLevelUps() {
    if (!this._lv || !this._lv.length || Encounter.st || Raid.st || Duel.st || this._lvOpen) return;
    const lv = this._lv.shift(), l = lv.l;
    this._lvOpen = true;
    setTimeout(() => {
      if (Encounter.st || Raid.st || Duel.st) { this._lv.unshift(lv); this._lvOpen = false; return; }
      const got = lv.got || [];
      Sfx.play('levelup'); U.vibrate([60, 60, 120]);
      const unlock = l === 8 ? '<p class="unlock">Открыт <b>Серебряный оберег</b>!</p>' : l === 16 ? '<p class="unlock">Открыт <b>Золотой оберег</b>!</p>' : l === 5 ? '<p class="unlock">Ты теперь <b>Ловчий</b>. Разломы ждут — и можно вступить в <b>дружину</b>: открой любое Капище!</p>' : '';
      this.modal({
        cls: 'lvl-modal', title: '',
        html: `<div class="lvl-num">${l}</div><div class="lvl-t">Новый уровень!</div>${unlock}<div class="lvl-rw">${got.map(x => `<div>${Art.item(x.k)}<span>${x.label} ×${x.n}</span></div>`).join('')}</div>`,
        buttons: [{ label: 'Вперёд', cls: 'primary', fn: () => { this._lvOpen = false; this.flushLevelUps(); } }],
        dismiss: false,
      });
      this.refreshHud();
    }, 350);
  },

  /* ---------------- ЗНАКОМСТВО ---------------- */
  onboarding(done, from = 0) { // from: 1 — сразу к истории (новичок только что вошёл через сервис или по почте)
    const root = U.el('<div class="onb"></div>');
    document.body.appendChild(root);
    let name = '', starter = null;
    const step = n => {
      root.innerHTML = '';
      let html = '';
      if (n === 0) html = `
        <div class="onb-logo"><div class="onb-charm">${Art.charm('charm3')}</div><h1>ДУХОЛОВ</h1><p>Лови духов Нави на улицах своего города</p></div>
        <div class="onb-stage">${['vayfayka', 'domovoy', 'kapelka', 'fonarnik', 'leshachok'].map(x => `<div>${Art.spirit(x)}</div>`).join('')}</div>
        ${Invite.ref() ? '<div class="onb-invite">Тебя пригласил друг — вы сразу станете друзьями, а тебя ждёт стартовый подарок.</div>' : ''}
        <div class="onb-cta"><button class="btn primary wide next">Начать игру</button><small>Без регистрации — вход можно привязать позже</small><small class="onb-agree"><span class="age-badge">12+</span>Нажимая «Начать игру», ты принимаешь <a href="terms.html">Соглашение</a> и <a href="privacy.html">Политику</a></small></div>
        ${Game.on() ? Login.panel(`<b>Уже играешь?</b><small>Войди — и твой прогресс откроется на этом устройстве</small>`, Login.buttons('start'), '') : ''}
        <a class="onb-offer" href="offer.html">Казна Ордена: цены, оферта и контакты</a><a class="onb-offer" href="privacy.html">Политика обработки персональных данных</a><a class="onb-offer" href="terms.html">Пользовательское соглашение · 12+</a>`;
      if (n === 1) html = `<div class="onb-lore">${LORE.map((p, i) => `<p style="animation-delay:${i * 0.5}s">${p}</p>`).join('')}</div><button class="btn primary wide next">Вступить в Орден</button>`;
      if (n === 2) html = `<div class="onb-q"><div class="onb-ava">${this.avatar()}</div><h2>Как тебя зовут, Ловчий?</h2><input class="input big" maxlength="16" placeholder="Имя" value="${U.esc(name)}"></div><button class="btn primary wide next">Дальше</button>`;
      if (n === 3) html = `<div class="onb-q"><h2>Выбери первого духа</h2><p>Он будет с тобой с первого дня.</p></div>
        <div class="onb-starters">${['ugolek', 'kapelka', 'mshonok'].map(id => `<button class="starter el-${SP[id].el}" data-id="${id}">${Art.spirit(id)}<b>${SP[id].name}</b><span>${Art.elIcon(SP[id].el, 16)} ${ELEMENTS[SP[id].el].name}</span></button>`).join('')}</div>
        <div class="onb-desc"></div><button class="btn primary wide next" disabled>Выбрать</button>`;
      if (n === 4) html = `<div class="onb-q"><div class="onb-pin">${this.I.pin}</div><h2>Духи живут рядом с тобой</h2>
        <p>Игре нужна геопозиция, чтобы показать духов, родники и разломы вокруг. Прогресс хранится на сервере игры и доступен только тебе; сервер проверяет каждое действие (поэтому нужен интернет), в прогрессе есть дневник с местами поимок. Для проверки действий на карте сервер получает твоё местоположение. Чтобы загрузить места на карте и погоду, район (~1 км) запрашивается у OpenStreetMap и Open-Meteo (погоду можно выключить в настройках). Точные координаты уходят на сервер, только если ты сам предложишь новое место.</p></div>
        <button class="btn primary wide gps">Разрешить геопозицию</button>${DEV ? '<button class="btn ghost wide demo">Демо-режим (разработка)</button>' : ''}`;
      root.appendChild(U.el(`<div class="onb-step s${n}">${html}</div>`));
      const nx = root.querySelector('.next');
      root.querySelectorAll('[data-login]').forEach(b => { b.onclick = () => Login.start(b.dataset.login, b.dataset.mode); });
      root.querySelectorAll('.mail-login').forEach(b => { b.onclick = () => Login.emailForm(); });
      if (n === 2) {
        const inp = root.querySelector('input');
        inp.focus();
        nx.onclick = () => { name = inp.value.trim(); if (!name) { this.toast('Назови себя'); return; } Sfx.play('tap'); step(3); };
        inp.onkeydown = ev => { if (ev.key === 'Enter') nx.click(); };
      } else if (n === 3) {
        root.querySelectorAll('.starter').forEach(b => b.onclick = () => {
          starter = b.dataset.id; Sfx.play('tap');
          root.querySelectorAll('.starter').forEach(x => x.classList.toggle('on', x === b));
          root.querySelector('.onb-desc').textContent = SP[starter].desc;
          nx.disabled = false;
        });
        nx.onclick = async () => {
          nx.disabled = true;
          const r = await Game.try('newGame', { name, starter, ref: Invite.ref() });
          if (!r) { nx.disabled = false; return; }
          Invite.done(r.invitedBy);
          Sfx.play('catch'); step(4);
        };
      } else if (n === 4) {
        const finish = demo => { Cfg.s.demo = demo; Cfg.save(); root.classList.add('out'); setTimeout(() => root.remove(), 400); done(); };
        root.querySelector('.gps').onclick = () => finish(false);
        const demoBtn = root.querySelector('.demo');
        if (demoBtn) demoBtn.onclick = () => finish(true);
      } else if (nx) nx.onclick = () => { Sfx.init(); Sfx.play('tap'); step(n + 1); };
      const have = root.querySelector('.have');
      if (have) have.onclick = () => Game.claimDialog(() => { root.classList.add('out'); setTimeout(() => root.remove(), 400); done(); });
    };
    step(from);
  },
};
