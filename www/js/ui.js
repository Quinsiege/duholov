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
  /* 4.5: кнопки дизайн-системы. rune — главная («оберег»: золото, гравировка, наконечники, блик), glass — второстепенная
     (стекло той же формы). Форма — SVG под текстом, растягивается по ширине кнопки. */
  _rid: 0,
  runeShape(kind) {
    const id = 'rn' + (++this._rid), gold = kind === 'gold';
    // 4.6: округлая форма, орнамент — гравированная линия и ромбы у краёв
    const outer = 'M13 1H327Q339 1 339 13V51Q339 63 327 63H13Q1 63 1 51V13Q1 1 13 1Z', inner = 'M13 6H327Q334 6 334 13V51Q334 58 327 58H13Q6 58 6 51V13Q6 6 13 6Z';
    return `<svg class="rn-bg" viewBox="0 0 340 64" preserveAspectRatio="none" aria-hidden="true"><defs>
      ${gold ? `<linearGradient id="${id}g" x2="0" y2="1"><stop offset="0" stop-color="#fff7c7"/><stop offset=".32" stop-color="#fcd34d"/><stop offset=".72" stop-color="#f59e0b"/><stop offset="1" stop-color="#b45309"/></linearGradient>` : ''}
      <clipPath id="${id}c"><path d="${outer}"/></clipPath></defs>
      <path d="${outer}" fill="${gold ? `url(#${id}g)` : 'rgba(255,255,255,.07)'}" ${gold ? '' : 'stroke="rgba(255,255,255,.28)" stroke-width="1.2" vector-effect="non-scaling-stroke"'}/>
      ${gold ? '<path d="M13 6H327Q334 6 334 13V18H6V13Q6 6 13 6Z" fill="rgba(255,255,255,.38)"/>' : ''}
      <path d="${inner}" fill="none" stroke="${gold ? 'rgba(124,45,18,.5)' : 'rgba(255,255,255,.12)'}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
      <path d="M14 32l5-4 5 4-5 4zM316 32l5-4 5 4-5 4zM27 32l2.5-2.5 2.5 2.5-2.5 2.5zM308 32l2.5-2.5 2.5 2.5-2.5 2.5z" fill="${gold ? 'rgba(124,45,18,.55)' : 'rgba(253,224,71,.55)'}"/>
      ${gold ? `<g clip-path="url(#${id}c)"><rect class="rn-shine" x="-120" y="0" width="70" height="64" fill="rgba(255,255,255,.55)" transform="skewX(-20)"/></g>` : ''}</svg>`;
  },
  rune(label, cls = '', icon = '') { return `<button class="rune ${cls}">${this.runeShape('gold')}<span class="rn-t">${icon}${label}</span></button>`; },
  glass(label, cls = '', icon = '') { return `<button class="rune glass ${cls}">${this.runeShape('glass')}<span class="rn-t">${icon}${label}</span></button>`; },

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
    // 4.4: сцена экрана входа остаётся на всех шагах знакомства, шаги рисуются поверх неё
    const root = Login.screenRoot(), body = root.querySelector('.lg-body');
    let name = '', starter = null;
    const step = n => {
      body.innerHTML = '';
      root.classList.toggle('deep', n > 0); // на шагах с текстом сцена темнее — читать легче
      let html = '';
      // 4.5: без коробки — сцена во весь экран, «оберег» и стеклянная кнопка прямо на ней; 12+ — значок в углу
      if (n === 0) html = `<span class="age-chip" title="Возрастная категория">12+</span>${Login.logo('Лови духов Нави на улицах своего города')}
        <div class="lg-cta">
          ${Invite.ref() ? '<div class="lg-invite">✦ Тебя пригласил друг — вы сразу станете друзьями, а тебя ждёт подарок</div>' : ''}
          ${this.rune('Начать игру', 'next')}
          ${Game.on() ? this.glass('Уже играю — войти', 'lg-have', this.I.key) : ''}
          <p class="lg-legal">Без регистрации. Продолжая, ты принимаешь <a href="terms.html">Соглашение</a>, <a href="privacy.html">Политику</a> и <a href="offer.html">Оферту</a></p>
        </div>`;
      if (n === 1) html = `<div class="onb-lore">${LORE.map((p, i) => `<p style="animation-delay:${i * 0.5}s">${p}</p>`).join('')}</div>${this.rune('Вступить в Орден', 'next')}`;
      if (n === 2) html = `<div class="onb-q"><div class="onb-ava">${this.avatar()}</div><h2>Как тебя зовут, Ловчий?</h2><input class="input big" maxlength="16" placeholder="Имя" value="${U.esc(name)}"></div>${this.rune('Дальше', 'next')}`;
      if (n === 3) html = `<div class="onb-q"><h2>Выбери первого духа</h2><p>Он будет с тобой с первого дня.</p></div>
        <div class="onb-starters">${['ugolek', 'kapelka', 'mshonok'].map(id => `<button class="starter el-${SP[id].el}" data-id="${id}">${Art.spirit(id)}<b>${SP[id].name}</b><span>${Art.elIcon(SP[id].el, 16)} ${ELEMENTS[SP[id].el].name}</span></button>`).join('')}</div>
        <div class="onb-desc"></div>${this.rune('Выбрать', 'next').replace('<button ', '<button disabled ')}`;
      if (n === 4) html = `<div class="onb-q"><div class="onb-pin">${this.I.pin}</div><h2>Духи живут рядом с тобой</h2>
        <p>Игре нужна геопозиция, чтобы показать духов, родники и разломы вокруг. Прогресс хранится на сервере игры и доступен только тебе; сервер проверяет каждое действие (поэтому нужен интернет), в прогрессе есть дневник с местами поимок. Для проверки действий на карте сервер получает твоё местоположение. Чтобы загрузить места на карте и погоду, район (~1 км) запрашивается у OpenStreetMap и Open-Meteo (погоду можно выключить в настройках). Точные координаты уходят на сервер, только если ты сам предложишь новое место.</p></div>
        ${this.rune('Разрешить геопозицию', 'gps', this.I.pin)}${DEV ? '<button class="btn ghost wide demo">Демо-режим (разработка)</button>' : ''}`;
      body.appendChild(U.el(n === 0 ? `<div class="lg-wrap">${html}</div>` : `<div class="onb-step s${n}">${html}</div>`));
      const nx = body.querySelector('.next');
      const have = body.querySelector('.lg-have');
      if (have) have.onclick = () => Login.sheet(root, '<b>Уже играешь?</b><small>Войди — и твой прогресс откроется на этом устройстве</small>', Login.buttons('start'));
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
        const finish = demo => { Cfg.s.demo = demo; Cfg.save(); Login.close(root, done); };
        body.querySelector('.gps').onclick = () => finish(false);
        const demoBtn = body.querySelector('.demo');
        if (demoBtn) demoBtn.onclick = () => finish(true);
      } else if (nx) nx.onclick = () => { Sfx.init(); Sfx.play('tap'); step(n + 1); };
    };
    step(from);
  },
};
