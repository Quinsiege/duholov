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
    // 4.6.3: когда непрозрачный экран (меню, поимка, разлом, сцена обучения) уже полностью проявился, карта под ним
    // не видна — помечаем его, и карта с HUD не рисуются и не анимируются (style.css); при закрытии снова видны сразу
    new MutationObserver(ms => {
      for (const m of ms) for (const n of m.addedNodes) {
        if (n.nodeType === 1 && n.matches('.screen, .enc, .raid, .tut-scene, .tut-final')) setTimeout(() => n.isConnected && n.classList.add('covers'), 700);
      }
    }).observe(document.body, { childList: true });
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
    // 4.6.3: HUD обновляется раз в секунду — пишем только то, что изменилось, иначе браузер каждый раз перерисовывает панель
    const put = (el, v) => { v = String(v); if (el.textContent !== v) el.textContent = v; };
    put(U.$('#hudLvl'), d.level);
    const lk = JSON.stringify(d.look);
    if (this._lk !== lk) {
      this._lk = lk;
      U.$('#profileBtn .ava-art').innerHTML = Art.avatar(d.look);
      document.documentElement.style.setProperty('--pc', d.look.cloak);
    }
    put(U.$('#hudName'), d.name);
    const xw = d.level >= MAX_LEVEL ? '100%' : ((d.xp - cur) / (next - cur) * 100) + '%', xb = U.$('#hudXp');
    if (xb._w !== xw) { xb._w = xw; xb.style.width = xw; }
    if (Tut.step()) Tut.show();
    this.storyPill();
    Hints.check();
    const badge = S.questsClaimable() + S.readyCocoons().length + Friends.inbox.length + Order.claimable(); // задания, коконы, подарки, общее дело
    const b = U.$('#menuBtn .badge'); b.classList.toggle('hidden', !badge); put(b, badge);
    const inc = U.$('#incenseChip');
    if (S.incenseActive()) {
      inc.classList.remove('hidden');
      if (!inc.querySelector('span')) inc.innerHTML = `${Art.item('incense')}<span></span>`;
      put(inc.querySelector('span'), U.fmtTime(d.incenseUntil - Date.now()));
    }
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
    el.querySelector('.sp-ico').innerHTML = this.menuIcon('scroll'); // 4.7: тот же значок, что у «Заданий» в меню
    el.querySelector('.sp-t').textContent = t;
    el.querySelector('.sp-s').textContent = s;
  },
  setGps(state, acc) {
    const c = U.$('#gpsChip');
    const map = { search: ['Ищу GPS…', 'warn'], ok: [`GPS ±${Math.round(acc)} м`, 'ok'], weak: [`GPS ±${Math.round(acc)} м`, 'warn'], off: ['Нет GPS', 'bad'], demo: ['Демо-режим', 'demo'] };
    const [t, cls] = map[state];
    if (c._k === t + cls) return; // GPS приходит каждую секунду — без изменений не перестраиваем значок
    c._k = t + cls;
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
    // 4.7.4: объём — градиенты, блик, тёмная обводка, тень; рисуется только нужный значок.
    // id градиентов свои у каждого рисунка (ключ + номер): иначе значок ссылался бы на градиент из скрытой копии и терял заливку
    const p = 'mi-' + k + (this._miN = (this._miN || 0) + 1);
    const f1 = n => +n.toFixed(1), P = (cx, cy, r, a) => f1(cx + r * Math.cos(a)) + ' ' + f1(cy + r * Math.sin(a));
    const st = s => s.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a == null ? '' : ` stop-opacity="${a}"`}/>`).join('');
    const lg = (id, s, x2 = 0, y2 = 1, x1 = 0, y1 = 0) => `<linearGradient id="${p}-${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${st(s)}</linearGradient>`;
    const rg = (id, s, cx = .38, cy = .3, r = .8) => `<radialGradient id="${p}-${id}" cx="${cx}" cy="${cy}" r="${r}">${st(s)}</radialGradient>`;
    const u = id => `url(#${p}-${id})`, D = (...g) => `<defs>${g.join('')}</defs>`;
    const AU = [[0, '#fff7d1'], [.35, '#f7d77e'], [.75, '#d59a36'], [1, '#8a5a14']];
    const PAPER = [[0, '#fffaf0'], [.6, '#f6e2b3'], [1, '#dcb271']];
    const hl = (x, y, rx, ry, r = -25, op = .55) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${x} ${y})" fill="#fff" opacity="${op}"/>`;
    const sh = (rx = 30) => `<ellipse cx="50" cy="93" rx="${rx}" ry="5" fill="#000" opacity=".3"/>`;
    const spk = (x, y, r, c = '#fff7d1') => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${c}"/>`;
    const star = (cx, cy, R, r, n = 5, a0 = -Math.PI / 2) => { let d = ''; for (let i = 0; i < n * 2; i++) d += (i ? 'L' : 'M') + P(cx, cy, i % 2 ? r : R, a0 + i * Math.PI / n); return d + 'Z'; };
    const cog = (cx, cy, R, r, n) => { let d = ''; const s = 2 * Math.PI / n; for (let i = 0; i < n; i++) { const a = i * s;
      d += (i ? 'L' : 'M') + P(cx, cy, r, a - s * .3) + 'L' + P(cx, cy, R, a - s * .16) + 'L' + P(cx, cy, R, a + s * .16) + 'L' + P(cx, cy, r, a + s * .3); } return d + 'Z'; };
    const blob = (cx, cy, r, n) => { let d = 'M' + P(cx, cy, r, 0); for (let i = 0; i < n; i++) d += 'Q' + P(cx, cy, r * 1.16, (i + .5) * 2 * Math.PI / n) + ' ' + P(cx, cy, r, (i + 1) * 2 * Math.PI / n); return d + 'Z'; };
    // дух-привидение: тело, лицо (x — сдвиг), для «Духов» и «Друзей»
    const face = (x, y, s = 1) => `<ellipse cx="${x - 11 * s}" cy="${y}" rx="${6.5 * s}" ry="${8.5 * s}" fill="#1b0f45"/><ellipse cx="${x + 11 * s}" cy="${y}" rx="${6.5 * s}" ry="${8.5 * s}" fill="#1b0f45"/>
      <ellipse cx="${x - 11 * s}" cy="${y + 4 * s}" rx="${4 * s}" ry="${2.8 * s}" fill="#2dd4bf" opacity=".75"/><ellipse cx="${x + 11 * s}" cy="${y + 4 * s}" rx="${4 * s}" ry="${2.8 * s}" fill="#2dd4bf" opacity=".75"/>
      <circle cx="${x - 8.5 * s}" cy="${y - 3.5 * s}" r="${2.8 * s}" fill="#fff"/><circle cx="${x + 13.5 * s}" cy="${y - 3.5 * s}" r="${2.8 * s}" fill="#fff"/>
      <ellipse cx="${x - 21 * s}" cy="${y + 11 * s}" rx="${4.5 * s}" ry="${2.6 * s}" fill="#f472b6" opacity=".6"/><ellipse cx="${x + 21 * s}" cy="${y + 11 * s}" rx="${4.5 * s}" ry="${2.6 * s}" fill="#f472b6" opacity=".6"/>
      <path d="M${x - 5 * s} ${y + 12 * s} Q${x} ${y + 17 * s} ${x + 5 * s} ${y + 12 * s}" stroke="#1b0f45" stroke-width="${2.8 * s}" fill="none" stroke-linecap="round"/>`;
    const A = {
      // Духи: светящийся дух-привидение
      spirits: () => D(rg('b', [[0, '#fff'], [.45, '#e6ddff'], [.8, '#a88cff'], [1, '#6a45dd']], .4, .28, .85), rg('g', [[0, '#5eead4', .5], [1, '#5eead4', 0]], .5, .5, .5)) +
        `<circle cx="50" cy="50" r="48" fill="${u('g')}"/>` + sh(24) +
        `<path d="M22 54 C13 54 8 46 10 40 C16 40 21 44 25 47Z M78 54 C87 54 92 46 90 40 C84 40 79 44 75 47Z" fill="#b9a5ff" stroke="#2e1a6b" stroke-width="3" stroke-linejoin="round"/>
        <path d="M50 9 C30 9 19 25 19 44 V70 C19 76 16 81 11 85 C18 88 25 87 30 83 C34 89 42 91 48 86 C53 91 61 91 66 86 C71 90 80 89 86 84 C82 79 81 73 81 66 V44 C81 25 70 9 50 9Z" fill="${u('b')}" stroke="#2e1a6b" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M20 64 C32 76 68 76 80 64 V67 C80 74 82 79 85 83 C79 88 71 89 66 85 C61 90 53 90 48 85 C42 90 34 88 30 82 C25 86 19 87 13 85 C17 81 20 76 20 70Z" fill="#5b3bd0" opacity=".3"/>
        <path d="M68 17 C75 23 77.5 32 78 42" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".45"/>` +
        face(50, 44) + hl(33, 22, 8, 4.5, -35, .7) + `<circle cx="25" cy="33" r="2.2" fill="#fff" opacity=".6"/>` + spk(88, 18, 6) + spk(12, 22, 4.5) + spk(90, 60, 3.5, '#5eead4'),
      // Бестиарий: бирюзовый фолиант с золотыми уголками и самоцветом-руной
      book: () => D(lg('c', [[0, '#5eead4'], [.45, '#14b8a6'], [1, '#0b4f4a']], .7, 1), lg('p', PAPER), lg('a', AU, .6, 1), rg('j', [[0, '#fdf4ff'], [.4, '#c084fc'], [1, '#4c1d95']], .35, .3, .8)) + sh(30) +
        `<path d="M24 16 H78 Q84 16 84 22 V84 Q84 90 78 90 H24Z" fill="${u('p')}" stroke="#5c3310" stroke-width="3"/><path d="M79 24 V84 M75 22 V87" stroke="#c9a064" stroke-width="1.6"/>
        <path d="M60 86 V96 L64 92.5 L68 96 V86Z" fill="#dc2626" stroke="#5c0f0f" stroke-width="2.2" stroke-linejoin="round"/>
        <rect x="13" y="10" width="64" height="77" rx="6" fill="${u('c')}" stroke="#062e2b" stroke-width="3.2"/>
        <path d="M14.6 16 Q14.6 11.6 19 11.6 H26 V85.4 H19 Q14.6 85.4 14.6 81Z" fill="#053b37" opacity=".45"/>
        <rect x="15" y="20" width="11" height="4.5" rx="1" fill="${u('a')}"/><rect x="15" y="73" width="11" height="4.5" rx="1" fill="${u('a')}"/>
        <rect x="31" y="17" width="40" height="63" rx="3" fill="none" stroke="#f7d77e" stroke-width="1.8" opacity=".75"/>
        <path d="M77 23 V16 Q77 10 71 10 H63Z M77 74 V81 Q77 87 71 87 H63Z" fill="${u('a')}" stroke="#5c3a0c" stroke-width="2" stroke-linejoin="round"/>
        <path d="M51 27 L66 48.5 L51 70 L36 48.5Z" fill="${u('a')}" stroke="#5c3a0c" stroke-width="2.6" stroke-linejoin="round"/>
        <path d="M51 36 L59.5 48.5 L51 61 L42.5 48.5Z" fill="${u('j')}" stroke="#3b0764" stroke-width="1.6" stroke-linejoin="round"/>
        <circle cx="51" cy="21.5" r="2.3" fill="#f7d77e"/><circle cx="51" cy="75.5" r="2.3" fill="#f7d77e"/>` + hl(48.5, 44, 2.2, 4, 30, .8) + hl(44, 14.5, 14, 1.8, 0, .45) + hl(20, 40, 1.6, 12, 0, .3),
      // Сумка: кожаная сума с клапаном, строчкой и золотой пряжкой
      bag: () => D(lg('l', [[0, '#e2a86a'], [.5, '#b06a2c'], [1, '#6b3812']]), lg('f', [[0, '#d38e4c'], [1, '#7a3f14']]), lg('a', AU, .5, 1)) + sh(34) +
        `<path d="M24 48 C22 12 78 12 76 48" fill="none" stroke="#2a1405" stroke-width="10.5" stroke-linecap="round"/><path d="M24 48 C22 12 78 12 76 48" fill="none" stroke="#a8652a" stroke-width="5.5" stroke-linecap="round"/>
        <path d="M24 44 C23 16 77 16 76 44" fill="none" stroke="#f0c68c" stroke-width="1.1" stroke-dasharray="2.5 2.5" opacity=".8"/>
        <path d="M14 46 Q14 38 22 38 H78 Q86 38 86 46 V78 Q86 90 74 90 H26 Q14 90 14 78Z" fill="${u('l')}" stroke="#2a1405" stroke-width="3.2"/>
        <path d="M15.6 76 H84.4 V78 Q84.4 88.4 74 88.4 H26 Q15.6 88.4 15.6 78Z" fill="#3d1a05" opacity=".35"/>
        <path d="M12 44 Q12 35 21 35 H79 Q88 35 88 44 V57 Q88 71 50 75 Q12 71 12 57Z" fill="${u('f')}" stroke="#2a1405" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M18 44 Q18 41 21 41 H79 Q82 41 82 44 V56 Q82 66 50 69.5 Q18 66 18 56Z" fill="none" stroke="#f3cf95" stroke-width="1.5" stroke-dasharray="3 2.6" opacity=".8"/>
        <path d="M50 44 L56 51 L50 58 L44 51Z" fill="${u('a')}" stroke="#5c3a0c" stroke-width="1.8" stroke-linejoin="round"/><circle cx="50" cy="51" r="1.8" fill="#7f1d1d"/>
        <rect x="45" y="68" width="10" height="19" rx="2" fill="#6b3812" stroke="#2a1405" stroke-width="2.4"/>
        <rect x="39.5" y="64" width="21" height="15" rx="3.5" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.4"/><rect x="44.5" y="68.3" width="11" height="6.4" rx="1.6" fill="#3d1a05"/>
        <circle cx="21" cy="44" r="2.4" fill="#f7d77e" stroke="#5c3a0c" stroke-width="1"/><circle cx="79" cy="44" r="2.4" fill="#f7d77e" stroke="#5c3a0c" stroke-width="1"/>` + hl(30, 39, 9, 2.2, -6, .5),
      // Коконы: светящийся кокон в гнезде, трещинка
      egg: () => D(rg('e', [[0, '#fff'], [.3, '#d8fff6'], [.72, '#5eead4'], [1, '#0f766e']], .38, .3, .8), rg('g', [[0, '#f0abfc', .9], [1, '#a855f7', 0]], .5, .5, .5), lg('n', [[0, '#b77a3e'], [1, '#5a2e0c']]),
        `<clipPath id="${p}-c"><path d="M50 8 C69 8 80 34 80 56 C80 76 67 88 50 88 C33 88 20 76 20 56 C20 34 31 8 50 8Z"/></clipPath>`) + sh(32) +
        `<path d="M50 8 C69 8 80 34 80 56 C80 76 67 88 50 88 C33 88 20 76 20 56 C20 34 31 8 50 8Z" fill="${u('e')}"/>
        <g clip-path="${u('c')}"><circle cx="54" cy="58" r="22" fill="${u('g')}"/><path d="M16 42 Q50 60 84 36 M16 62 Q50 80 84 56" stroke="#0b4540" stroke-width="6" fill="none"/><path d="M16 42 Q50 60 84 36 M16 62 Q50 80 84 56" stroke="#b6fff0" stroke-width="2.6" fill="none"/></g>
        <path d="M50 8 C69 8 80 34 80 56 C80 76 67 88 50 88 C33 88 20 76 20 56 C20 34 31 8 50 8Z" fill="none" stroke="#0b4540" stroke-width="3.2"/>
        <path d="M45 15 L50 21 L45.5 26 L52 31 L49 35" stroke="#c084fc" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/><path d="M45 15 L50 21 L45.5 26 L52 31 L49 35" stroke="#fdf4ff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M11 73 Q13 93 50 93 Q87 93 89 73 Q70 83 50 83 Q30 83 11 73Z" fill="${u('n')}" stroke="#2a1405" stroke-width="3" stroke-linejoin="round"/>
        <path d="M18 81 Q44 90 72 84" stroke="#3d1a05" stroke-width="1.6" fill="none" opacity=".5"/><path d="M17 80 Q38 89 64 86 M36 90 Q62 91 83 80 M22 85 Q30 84 40 87" stroke="#e8b67a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M17 77 C11 79 5 75 3 69 C9 67 14 70 17 77Z M83 77 C89 79 95 75 97 69 C91 67 86 70 83 77Z" fill="#4ade80" stroke="#14532d" stroke-width="2" stroke-linejoin="round"/>` +
        hl(37, 30, 5, 10, 25, .6) + `<circle cx="33" cy="46" r="2" fill="#fff" opacity=".6"/>` + spk(86, 20, 5.5) + spk(14, 28, 4, '#f0abfc'),
      // Задания: пергамент на валиках, красная сургучная печать с лентами
      scroll: () => D(lg('p', PAPER), lg('r', [[0, '#f5c27a'], [.35, '#fde9bf'], [.6, '#b9722d'], [1, '#5a2e0c']]), lg('a', AU, .5, 1), rg('s', [[0, '#ff9b8a'], [.45, '#dc2626'], [1, '#7a0c0c']], .38, .32, .75)) + sh(34) +
        `<path d="M23 20 H77 Q73.5 50 77 80 H23 Q26.5 50 23 20Z" fill="${u('p')}" stroke="#5c3310" stroke-width="3"/>
        <path d="M70 21 H76 Q72.5 50 76 79 H70 Q67 50 70 21Z" fill="#b9722d" opacity=".25"/>
        <path d="M32 36 H66 M32 45 H68 M32 54 H56" stroke="#9a5a1c" stroke-width="3.6" stroke-linecap="round" opacity=".6"/>
        <rect x="14" y="11" width="72" height="14" rx="7" fill="${u('r')}" stroke="#2a1405" stroke-width="3"/><rect x="14" y="75" width="72" height="14" rx="7" fill="${u('r')}" stroke="#2a1405" stroke-width="3"/>
        <circle cx="12" cy="18" r="5.5" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.4"/><circle cx="88" cy="18" r="5.5" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.4"/>
        <circle cx="12" cy="82" r="5.5" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.4"/><circle cx="88" cy="82" r="5.5" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.4"/>
        <path d="M60 76 L54 95 L59.5 92 L62.5 96.5 L67 79Z M72 79 L75 96.5 L78.5 92 L84 94 L77 76Z" fill="#b91c1c" stroke="#4c0808" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="${blob(66, 68, 13, 9)}" fill="${u('s')}" stroke="#4c0808" stroke-width="2.6" stroke-linejoin="round"/>
        <circle cx="66" cy="68" r="8.5" fill="none" stroke="#7a0c0c" stroke-width="2" opacity=".7"/><path d="${star(66, 68, 6.5, 2.8, 4, 0)}" fill="#ffc9bd"/>` +
        hl(60.5, 61.5, 3.4, 1.8, -35, .7) + hl(38, 15, 16, 1.8, 0, .6) + hl(38, 79, 16, 1.8, 0, .5),
      // Друзья: два духа обнялись, над ними сердечко
      swap: () => D(rg('p', [[0, '#fff'], [.4, '#fcd3ea'], [.85, '#f472b6'], [1, '#be185d']], .38, .28, .85), rg('c', [[0, '#fff'], [.4, '#cffafe'], [.85, '#22d3ee'], [1, '#0e7490']], .38, .28, .85), rg('h', [[0, '#ffe4e6'], [.35, '#fb7185'], [1, '#9f1239']], .35, .3, .8)) + sh(38) +
        `<path d="M64 28 C50 28 44 40 44 52 V82 Q47.5 89 51 82 Q54.5 89 58 82 Q61.5 89 65 82 Q68.5 89 72 82 Q75.5 89 79 82 Q82.5 89 86 82 V52 C86 40 78 28 64 28Z" fill="${u('p')}" stroke="#6b0f3a" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M56 52 Q60 46.5 64 52 M68 52 Q72 46.5 76 52" stroke="#4a0626" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="79" cy="60" rx="4" ry="2.4" fill="#e11d48" opacity=".45"/>
        <path d="M36 32 C22 32 14 44 14 56 V84 Q17.5 91 21 84 Q24.5 91 28 84 Q31.5 91 35 84 Q38.5 91 42 84 Q45.5 91 49 84 Q52.5 91 56 84 V56 C56 44 50 32 36 32Z" fill="${u('c')}" stroke="#0c4a5e" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M52 64 C60 58 67 60 70 67" stroke="#0c4a5e" stroke-width="9.5" fill="none" stroke-linecap="round"/><path d="M52 64 C60 58 67 60 70 67" stroke="#a5f3fc" stroke-width="4.5" fill="none" stroke-linecap="round"/>` +
        face(35, 56, .62) +
        `<path d="M50 21 C44 10 27 13 31 26 C34 33 44 37 50 42 C56 37 66 33 69 26 C73 13 56 10 50 21Z" fill="${u('h')}" stroke="#5c0a1c" stroke-width="3" stroke-linejoin="round"/>` +
        hl(40, 20, 4.5, 2.6, -35, .75) + hl(25, 42, 5, 3, -35, .6) + hl(56, 36, 4, 2.4, -35, .55) + spk(88, 20, 5) + spk(12, 22, 3.5),
      // Чат: две реплики — лаковая и светлая, три точки
      chat: () => D(lg('b', [[0, '#a78bfa'], [1, '#4c2fa6']]), lg('f', [[0, '#fff'], [1, '#dcd3f7']]), rg('d', [[0, '#c4b5fd'], [.5, '#7c3aed'], [1, '#3b0f8a']], .35, .3, .8)) + sh(30) +
        `<path d="M20 11 H60 Q70 11 70 21 V41 Q70 51 60 51 H38 L24 62 L27 51 H20 Q10 51 10 41 V21 Q10 11 20 11Z" fill="${u('b')}" stroke="#1a0f40" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M20 22 H46 M20 31 H36" stroke="#ede9fe" stroke-width="3.6" stroke-linecap="round" opacity=".75"/>
        <path d="M42 35 H80 Q90 35 90 45 V68 Q90 78 80 78 H76 L79 91 L63 78 H42 Q32 78 32 68 V45 Q32 35 42 35Z" fill="${u('f')}" stroke="#1a0f40" stroke-width="3.2" stroke-linejoin="round"/>
        <circle cx="48" cy="57" r="5.2" fill="${u('d')}"/><circle cx="61" cy="57" r="5.2" fill="${u('d')}"/><circle cx="74" cy="57" r="5.2" fill="${u('d')}"/>
        <circle cx="46.5" cy="55.3" r="1.5" fill="#fff"/><circle cx="59.5" cy="55.3" r="1.5" fill="#fff"/><circle cx="72.5" cy="55.3" r="1.5" fill="#fff"/>` +
        hl(22, 16, 8, 2, -8, .6) + hl(46, 40, 9, 2.2, -6, .9),
      // Лига: золотой кубок с звездой на лаковой подставке
      trophy: () => D(lg('a', [[0, '#8a5a14'], [.22, '#f7d77e'], [.38, '#fff7d1'], [.62, '#e3a843'], [1, '#7a4a10']], 1, 0), lg('w', [[0, '#7c5ce6'], [1, '#2a1b5a']])) + sh(28) +
        `<path d="M27 21 C10 19 8 34 13 42 C17 48 26 51 33 51 M73 21 C90 19 92 34 87 42 C83 48 74 51 67 51" stroke="#4a2c06" stroke-width="10.5" fill="none" stroke-linecap="round"/>
        <path d="M27 21 C10 19 8 34 13 42 C17 48 26 51 33 51 M73 21 C90 19 92 34 87 42 C83 48 74 51 67 51" stroke="#f0c75e" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M22 23 C14 24 12 33 15 39" stroke="#fff7d1" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <path d="M44 58 H56 L54.5 70 H45.5Z" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.8" stroke-linejoin="round"/>
        <path d="M22 13 H78 V32 C78 52 65 62 50 62 C35 62 22 52 22 32Z" fill="${u('a')}" stroke="#4a2c06" stroke-width="3.2" stroke-linejoin="round"/>
        <rect x="18" y="8" width="64" height="9" rx="4.5" fill="${u('a')}" stroke="#4a2c06" stroke-width="3"/>
        <ellipse cx="50" cy="71" rx="10" ry="4" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.6"/>
        <path d="M34 75 H66 L71 81 H29Z" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.8" stroke-linejoin="round"/>
        <rect x="25" y="80" width="50" height="11" rx="3" fill="${u('w')}" stroke="#140c2e" stroke-width="3"/><rect x="33" y="84" width="34" height="3.4" rx="1.7" fill="#f7d77e" opacity=".9"/>
        <path d="${star(50, 35, 12, 5)}" fill="#fff3c4" stroke="#9a6414" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M30 20 V34 C30 42 33 48 37 52" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".55"/>` + spk(88, 10, 5) + spk(10, 62, 3.5) + spk(90, 62, 3),
      // Лавка: лоток с полосатым навесом и товаром
      shop: () => D(lg('w', [[0, '#dfa468'], [1, '#7a4318']]), lg('r', [[0, '#ff7a7a'], [1, '#b91c1c']]), lg('c', [[0, '#fffaf0'], [1, '#f1d6a0']]), lg('a', AU, .5, 1), rg('t', [[0, '#ecfeff'], [.45, '#2dd4bf'], [1, '#0f5e56']], .35, .35, .8), rg('v', [[0, '#e9d5ff'], [.5, '#8b5cf6'], [1, '#3b0f8a']], .35, .3, .8)) + sh(40) +
        `<rect x="17" y="26" width="7" height="38" fill="${u('w')}" stroke="#2a1405" stroke-width="2.5"/><rect x="76" y="26" width="7" height="38" fill="${u('w')}" stroke="#2a1405" stroke-width="2.5"/>
        <path d="M27.5 46 H32.5 V50 C37.5 52 38.5 57 37 61 H23 C21.5 57 22.5 52 27.5 50Z" fill="${u('t')}" stroke="#0b3b36" stroke-width="2.2" stroke-linejoin="round"/><rect x="26.5" y="43" width="7" height="4" rx="1" fill="#b45309" stroke="#2a1405" stroke-width="1.6"/>
        <ellipse cx="50" cy="59" rx="8" ry="3" fill="${u('a')}" stroke="#5c3a0c" stroke-width="1.8"/><ellipse cx="50" cy="55" rx="8" ry="3" fill="${u('a')}" stroke="#5c3a0c" stroke-width="1.8"/><ellipse cx="51" cy="51" rx="8" ry="3" fill="${u('a')}" stroke="#5c3a0c" stroke-width="1.8"/>
        <rect x="63" y="48" width="13" height="13" rx="3" fill="${u('v')}" stroke="#1a0f40" stroke-width="2.2"/><rect x="62" y="45" width="15" height="4.5" rx="1.5" fill="#f7d77e" stroke="#5c3a0c" stroke-width="1.6"/>
        <rect x="8" y="58" width="84" height="8" rx="3" fill="#e8b57a" stroke="#2a1405" stroke-width="3"/>
        <path d="M12 65 H88 V86 Q88 90 84 90 H16 Q12 90 12 86Z" fill="${u('w')}" stroke="#2a1405" stroke-width="3.2"/><path d="M13.6 72 H86.4 M37 66.6 V88.4 M63 66.6 V88.4" stroke="#4a2408" stroke-width="1.8" opacity=".45"/>
        <path d="M25 76 L29 80.5 L25 85 L21 80.5Z M50 76 L54 80.5 L50 85 L46 80.5Z M75 76 L79 80.5 L75 85 L71 80.5Z" fill="${u('a')}" stroke="#5c3a0c" stroke-width="1.4"/>
        <path d="M10 34 L20 8 H80 L90 34Z" fill="${u('c')}"/><path d="M20 8 H30 L23.3 34 H10Z M40 8 H50 V34 H36.7Z M60 8 H70 L76.7 34 H63.3Z" fill="${u('r')}"/>
        <path d="M10 34 Q16.7 44 23.3 34Z M36.7 34 Q43.3 44 50 34Z M63.3 34 Q70 44 76.7 34Z" fill="${u('r')}"/><path d="M23.3 34 Q30 44 36.7 34Z M50 34 Q56.7 44 63.3 34Z M76.7 34 Q83.3 44 90 34Z" fill="${u('c')}"/>
        <path d="M10 34 L20 8 H80 L90 34 Q83.3 44 76.7 34 Q70 44 63.3 34 Q56.7 44 50 34 Q43.3 44 36.7 34 Q30 44 23.3 34 Q16.7 44 10 34Z" fill="none" stroke="#4c0808" stroke-width="3.2" stroke-linejoin="round"/>
        <rect x="16" y="3.5" width="68" height="7" rx="3.5" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.6"/>` + hl(28, 6.5, 8, 1.4, 0, .7) + hl(21, 22, 1.6, 7, 20, .45) + hl(26, 54, 1.4, 2.6, 0, .8),
      // Тропа: дорожный указатель на травяной кочке
      trail: () => D(lg('w', [[0, '#f3cd97'], [.5, '#c98a4a'], [1, '#8a4f1d']]), lg('p', [[0, '#5a2e0c'], [.4, '#b97a3c'], [1, '#4a2408']], 1, 0), lg('g', [[0, '#86efac'], [1, '#15803d']]), lg('a', AU, .5, 1)) + sh(30) +
        `<rect x="44" y="14" width="12" height="76" rx="3" fill="${u('p')}" stroke="#2a1405" stroke-width="3"/><path d="M40 16 L50 6 L60 16Z" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.6" stroke-linejoin="round"/>
        <path d="M18 20 H74 L87 31 L74 42 H18 Q14 42 14 38 V24 Q14 20 18 20Z" fill="${u('w')}" stroke="#2a1405" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M82 50 H28 L13 61 L28 72 H82 Q86 72 86 68 V54 Q86 50 82 50Z" fill="${u('w')}" stroke="#2a1405" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M21 36 Q40 34 70 37 M34 66 Q56 64 80 67" stroke="#8a4f1d" stroke-width="1.5" fill="none" opacity=".6"/>
        <path d="M22 28 H40 M31 58 H42" stroke="#5a2e0c" stroke-width="3.4" stroke-linecap="round" opacity=".7"/>
        <path d="M66 25 L71 31 L66 37 L61 31Z M70 55 L75 61 L70 67 L65 61Z" fill="#b91c1c" stroke="#4c0808" stroke-width="1.6" stroke-linejoin="round"/>
        <circle cx="50" cy="31" r="2.2" fill="#3d1a05"/><circle cx="50" cy="61" r="2.2" fill="#3d1a05"/>
        <path d="M26 92 Q28 82 34 87 Q36 76 43 84 Q46 74 50 83 Q54 74 57 84 Q64 76 66 87 Q72 82 74 92Z" fill="${u('g')}" stroke="#14532d" stroke-width="2.6" stroke-linejoin="round"/>
        <path d="M60 14 C64 6 74 6 74 12 C70 16 64 17 60 14Z" fill="#4ade80" stroke="#14532d" stroke-width="2" stroke-linejoin="round"/>` + hl(34, 23.5, 12, 1.6, 0, .6) + hl(48, 53.5, 14, 1.6, 0, .55) + spk(88, 48, 4) + spk(12, 50, 3),
      // Разломы: арка из камней-клиньев, внутри вихрь Нави
      rift: () => { const wedge = i => { const a1 = Math.PI + i * Math.PI / 5, a2 = a1 + Math.PI / 5; return `M${P(50, 52, 38, a1)} A38 38 0 0 1 ${P(50, 52, 38, a2)} L${P(50, 52, 20, a2)} A20 20 0 0 0 ${P(50, 52, 20, a1)}Z`; };
        return D(rg('v', [[0, '#fdf4ff'], [.22, '#f0abfc'], [.6, '#7c3aed'], [1, '#1e0b4a']], .5, .6, .6), lg('s', [[0, '#d5dce8'], [.5, '#8f99ad'], [1, '#4b5263']]), rg('g', [[0, '#d8b4fe', .9], [.5, '#a855f7', .35], [1, '#a855f7', 0]], .5, .5, .5)) +
        `<circle cx="50" cy="56" r="44" fill="${u('g')}"/>` + sh(40) +
        `<path d="M30 90 V52 A20 20 0 0 1 70 52 V90Z" fill="${u('v')}"/>
        <path d="M50 58 C56 58 57 65 51 66 C44 67 41 59 46 54 C53 47 64 53 62 64 C60 75 44 78 37 68" stroke="#f5d0fe" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".9"/>
        <path d="M58 41 C66 45 69 54 67 62 M35 78 C40 84 52 86 60 80" stroke="#c084fc" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/><circle cx="50" cy="60" r="4.5" fill="#fff"/>
        <g fill="${u('s')}" stroke="#232838" stroke-width="2.8" stroke-linejoin="round"><path d="${[0, 1, 3, 4].map(wedge).join('')}"/>
        <rect x="12" y="52" width="18" height="19" rx="2"/><rect x="12" y="71" width="18" height="19" rx="2"/><rect x="70" y="52" width="18" height="19" rx="2"/><rect x="70" y="71" width="18" height="19" rx="2"/>
        <path d="M40 10 H60 L57.5 33 H42.5Z"/></g>
        <path d="M50 15 V28 M50 19 L45 15 M50 19 L55 15" stroke="#e879f9" stroke-width="2.8" stroke-linecap="round"/>
        <path d="M21 58 V65 M18 62 L24 58 M79 76 V84 M76 79 L82 76" stroke="#5eead4" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M70 52 H88 V90 H70Z M60 15 L57.5 33" fill="#1e2230" opacity=".22"/>
        <path d="M12 50 Q16 44 22 49 Q26 44 30 50Z M70 50 Q75 44 80 49 Q85 45 88 50Z" fill="#4ade80" stroke="#14532d" stroke-width="1.8" stroke-linejoin="round"/>` +
        hl(22, 34, 6, 2.2, -55, .5) + spk(8, 28, 5.5) + spk(92, 26, 4, '#f0abfc') + `<circle cx="42" cy="44" r="1.6" fill="#fff"/><circle cx="60" cy="72" r="1.3" fill="#fff" opacity=".8"/>`; },
      // Аукцион: молоток бьёт по лаковой подставке
      gavel: () => D(lg('w', [[0, '#e8ad6c'], [.5, '#a55f24'], [1, '#5e300c']]), lg('h', [[0, '#f3cd97'], [1, '#9a5a22']], 1, 0), lg('a', AU, .5, 1), lg('b', [[0, '#8b6cf0'], [1, '#2a1b5a']])) + sh(34) +
        `<path d="M32 76 V83 C32 92 84 92 84 83 V76Z" fill="${u('b')}" stroke="#140c2e" stroke-width="3"/><path d="M32.5 81 C33 88 83 88 83.5 81" stroke="#f7d77e" stroke-width="2.4" fill="none"/>
        <ellipse cx="58" cy="76" rx="26" ry="7" fill="#a78bfa" stroke="#140c2e" stroke-width="3"/><ellipse cx="58" cy="75.5" rx="18" ry="4" fill="#c4b5fd" opacity=".6"/>
        <path d="M76 62 L82 55 M80 70 L89 68 M69 58 L70 49" stroke="#fde047" stroke-width="3.6" stroke-linecap="round"/>
        <g transform="translate(42 54) rotate(40)"><rect x="-5.5" y="-60" width="11" height="50" rx="4" fill="${u('h')}" stroke="#2a1405" stroke-width="3"/><circle cy="-60" r="7" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.6"/>
        <rect x="-26" y="-13" width="52" height="26" rx="6" fill="${u('w')}" stroke="#2a1405" stroke-width="3.2"/>
        <rect x="-20" y="-15" width="7.5" height="30" rx="2.5" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.4"/><rect x="12.5" y="-15" width="7.5" height="30" rx="2.5" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.4"/>
        <rect x="-8" y="-6.5" width="16" height="13" rx="2" fill="#7f1d1d" stroke="#2a1405" stroke-width="2"/><path d="M0 -4.5 L3.5 0 L0 4.5 L-3.5 0Z" fill="#fde68a"/>
        <ellipse cx="-2" cy="-8.5" rx="17" ry="1.8" fill="#fff" opacity=".45"/><rect x="-3.5" y="-56" width="2" height="36" rx="1" fill="#fff" opacity=".35"/></g>` + spk(88, 42, 5) + spk(76, 86, 0),
      // Места: глянцевая метка с золотым кольцом и бирюзовым камнем
      pin: () => D(rg('r', [[0, '#ffb3a8'], [.35, '#f43f5e'], [.8, '#be123c'], [1, '#7f0d24']], .35, .25, .85), lg('a', AU, .5, 1), rg('c', [[0, '#fff'], [.45, '#ccfbf1'], [1, '#14b8a6']], .35, .3, .8)) +
        `<ellipse cx="50" cy="90" rx="22" ry="5.5" fill="none" stroke="#5eead4" stroke-width="2.4" opacity=".75"/><ellipse cx="50" cy="90" rx="12" ry="3" fill="#000" opacity=".35"/>
        <path d="M50 91 C46 80 17 62 17 38 A33 33 0 0 1 83 38 C83 62 54 80 50 91Z" fill="${u('r')}" stroke="#4c0717" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M70 13 C79 20 82 30 81 40 C80 58 60 76 51 88 C60 72 74 52 70 13Z" fill="#4c0717" opacity=".22"/>
        <circle cx="50" cy="38" r="15" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.6"/><circle cx="50" cy="38" r="9.5" fill="${u('c')}" stroke="#0b4540" stroke-width="2"/>
        <path d="${star(50, 38, 6, 2.4, 4)}" fill="#fff" opacity=".85"/>
        <path d="M26 32 C28 21 36 13 46 11" stroke="#fff" stroke-width="4.2" fill="none" stroke-linecap="round" opacity=".6"/><circle cx="24" cy="41" r="2.2" fill="#fff" opacity=".6"/>` + spk(88, 14, 5) + spk(12, 66, 3.5),
      // Ловчий: по пояс, в плаще с капюшоном (цвет плаща и глаз — из «Облика» игрока), стрелы за плечом, застёжка-оберег
      user: () => { const lk = (S.d && S.d.look) || {}, hex = /^#[0-9a-f]{6}$/i;
        const c = hex.test(lk.cloak) ? lk.cloak : '#6d28d9', eye = hex.test(lk.eyes) ? lk.eyes : '#5eead4', ol = Art.shade(c, -0.6);
        return D(lg('c', [[0, Art.shade(c, .35)], [.55, c], [1, Art.shade(c, -.4)]], .4, 1), rg('f', [[0, '#2a1f4a'], [1, '#07040f']], .5, .45, .6), rg('e', [[0, eye, .7], [1, eye, 0]], .5, .5, .5), lg('a', AU, .5, 1)) + sh(36) +
        `<path d="M70 62 L86 24 M76 64 L92 32" stroke="#2a1405" stroke-width="5" stroke-linecap="round"/><path d="M70 62 L86 24 M76 64 L92 32" stroke="#c98a4a" stroke-width="2.2" stroke-linecap="round"/>
        <g fill="#ef4444" stroke="#4c0808" stroke-width="1.5" stroke-linejoin="round"><path transform="translate(86 24) rotate(22.8)" d="M0 1 L-4.5 -3 V8 L0 12Z M0 1 L4.5 -3 V8 L0 12Z"/><path transform="translate(92 32) rotate(26.6)" d="M0 1 L-4.5 -3 V8 L0 12Z M0 1 L4.5 -3 V8 L0 12Z"/></g>
        <path d="M10 92 C10 74 24 62 38 58 H62 C76 62 90 74 90 92Z" fill="${u('c')}" stroke="${ol}" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M62 58 C76 62 90 74 90 92 H73 C73 78 69 66 62 58Z" fill="#000" opacity=".2"/><path d="M18 90 C20 78 28 70 36 66" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".3"/>
        <path d="M47 78 L43 92 M53 78 L57 92" stroke="#f7d77e" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M50 5 C31 9 21 26 21 44 C21 57 28 65 38 67 H62 C72 65 79 57 79 44 C79 26 69 9 50 5Z" fill="${u('c')}" stroke="${ol}" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M58 10 C70 18 79 30 79 44 C79 56 72 64 62 66 C68 56 70 34 58 10Z" fill="#000" opacity=".2"/>
        <path d="M50 23 C62 23 67 36 67 46 C67 56 59 63 50 63 C41 63 33 56 33 46 C33 36 38 23 50 23Z" fill="${u('f')}" stroke="${ol}" stroke-width="2.4"/>
        <path d="M36 38 C38 29 43 25 50 25" stroke="${Art.shade(c, .3)}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>
        <ellipse cx="50" cy="46" rx="16" ry="9" fill="${u('e')}"/><ellipse cx="43" cy="46" rx="4.2" ry="2.8" fill="${eye}"/><ellipse cx="57" cy="46" rx="4.2" ry="2.8" fill="${eye}"/>
        <circle cx="44" cy="45.3" r="1.1" fill="#fff"/><circle cx="58" cy="45.3" r="1.1" fill="#fff"/>
        <circle cx="50" cy="74" r="8.5" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.6"/><path d="M50 68.5 L55.5 74 L50 79.5 L44.5 74Z" fill="#b91c1c" stroke="#4a2c06" stroke-width="1.4"/>` +
        hl(33, 21, 7, 3.5, -50, .5) + hl(47.5, 71.5, 2, 1.2, -30, .8); },
      // Дружина: каплевидный червлёный щит в золотой оковке, умбон и ромб-оберег
      shield: () => D(lg('r', [[0, '#f87171'], [.5, '#dc2626'], [1, '#7f1d1d']], .7, 1), lg('a', AU, .6, 1), rg('b', [[0, '#fff7d1'], [.4, '#f7d77e'], [1, '#8a5a14']], .35, .3, .8)) + sh(26) +
        `<path d="M50 6 C64 6 80 10 86 16 C88 44 78 74 50 94 C22 74 12 44 14 16 C20 10 36 6 50 6Z" fill="${u('a')}" stroke="#3d2404" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M50 13 C62 13 73 16 79 20 C80 44 72 68 50 85 C28 68 20 44 21 20 C27 16 38 13 50 13Z" fill="${u('r')}" stroke="#4c0808" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M50 13 C62 13 73 16 79 20 C80 44 72 68 50 85Z" fill="#000" opacity=".14"/>
        <path d="M50 22 L69 46 L50 70 L31 46Z" fill="none" stroke="#f7d77e" stroke-width="3" stroke-linejoin="round"/>
        <path d="M50 16.5 L53 20 L50 23.5 L47 20Z M50 72 L53 75.5 L50 79 L47 75.5Z M27 43 L30 46.5 L27 50 L24 46.5Z M73 43 L76 46.5 L73 50 L70 46.5Z" fill="#f7d77e"/>
        <circle cx="50" cy="46" r="11" fill="${u('b')}" stroke="#3d2404" stroke-width="2.6"/><circle cx="50" cy="46" r="4.5" fill="#fff7d1" opacity=".8"/>
        <g fill="#fff7d1" stroke="#6b4210" stroke-width="1"><circle cx="50" cy="9.5" r="2.1"/><circle cx="29" cy="11.5" r="2.1"/><circle cx="71" cy="11.5" r="2.1"/><circle cx="17.5" cy="30" r="2.1"/><circle cx="82.5" cy="30" r="2.1"/><circle cx="25" cy="60" r="2.1"/><circle cx="75" cy="60" r="2.1"/><circle cx="50" cy="89" r="2.1"/></g>` +
        hl(31, 26, 3, 8, 20, .45) + hl(46, 42, 3, 1.8, -35, .8),
      // Дневник: кожаная тетрадь с ярлыком, закладкой и пером
      journal: () => D(lg('l', [[0, '#c0703a'], [.5, '#8a3f14'], [1, '#4a1e06']], .6, 1), lg('p', PAPER), lg('a', AU, .6, 1), lg('q', [[0, '#fff'], [.6, '#ccfbf1'], [1, '#2dd4bf']], 1, 0)) + sh(30) +
        `<path d="M22 13 H72 Q78 13 78 19 V83 Q78 89 72 89 H22Z" fill="${u('p')}" stroke="#5c3310" stroke-width="3"/><path d="M73.5 20 V83" stroke="#c9a064" stroke-width="1.5"/>
        <rect x="12" y="9" width="60" height="78" rx="6" fill="${u('l')}" stroke="#2a1003" stroke-width="3.2"/>
        <path d="M13.6 15 Q13.6 10.6 18 10.6 H24 V85.4 H18 Q13.6 85.4 13.6 81Z" fill="#2a1003" opacity=".35"/>
        <rect x="28" y="15" width="38" height="66" rx="3" fill="none" stroke="#f3cf95" stroke-width="1.4" stroke-dasharray="3 2.4" opacity=".6"/>
        <path d="M72 22 V15 Q72 9 66 9 H59Z M72 74 V81 Q72 87 66 87 H59Z" fill="${u('a')}" stroke="#4a2c06" stroke-width="2" stroke-linejoin="round"/>
        <rect x="30" y="36" width="30" height="20" rx="3" fill="${u('p')}" stroke="#2a1003" stroke-width="2.4"/><path d="M35 43 H55 M35 49 H48" stroke="#9a5a1c" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M47 9 V30 L51.5 26 L56 30 V9" fill="#dc2626" stroke="#4c0808" stroke-width="2.2" stroke-linejoin="round"/>
        <g transform="translate(74 56) rotate(32)"><path d="M0 -40 C12 -28 10 4 2.2 18 H-2.2 C-10 4 -12 -28 0 -40Z" fill="${u('q')}" stroke="#134e4a" stroke-width="2.6" stroke-linejoin="round"/>
        <path d="M0 -34 V26 M0 -18 L6 -24 M0 -8 L-6 -14 M0 2 L5.5 -3" stroke="#134e4a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <path d="M-2.4 18 H2.4 L1.6 28 L0 33 L-1.6 28Z" fill="${u('a')}" stroke="#4a2c06" stroke-width="1.8" stroke-linejoin="round"/></g>` +
        hl(34, 13.5, 12, 1.6, 0, .5) + hl(18, 42, 1.4, 12, 0, .3),
      // Путь: сложенная карта с тропой, ёлками, озером и звездой-целью
      path: () => D(lg('p', PAPER), lg('q', [[0, '#f0d49c'], [1, '#c99a55']]), lg('a', AU, .5, 1)) + sh(34) +
        `<path d="M10 22 L36 13 L64 22 L90 13 V79 L64 88 L36 79 L10 88Z" fill="${u('p')}"/><path d="M36 13 L64 22 V88 L36 79Z" fill="${u('q')}"/>
        <path d="M10 22 L36 13 L64 22 L90 13 V79 L64 88 L36 79 L10 88Z M36 13 V79 M64 22 V88" fill="none" stroke="#5c3310" stroke-width="3" stroke-linejoin="round"/>
        <ellipse cx="75" cy="66" rx="9" ry="5.5" fill="#5eead4" stroke="#0f5e56" stroke-width="2"/><ellipse cx="72" cy="64.5" rx="3.5" ry="1.3" fill="#fff" opacity=".7"/>
        <path d="M20 44 L26 54 H14Z M20 36 L25 45 H15Z M31 52 L36 61 H26Z M31 45 L35.5 53 H26.5Z" fill="#16a34a" stroke="#14532d" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M18 76 C28 74 30 64 40 62 S54 58 56 48 S66 34 74 31" stroke="#b91c1c" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-dasharray="4.5 4.5"/>
        <circle cx="18" cy="76" r="4.8" fill="#2dd4bf" stroke="#0b4540" stroke-width="2"/>
        <circle cx="76" cy="27" r="13" fill="#fde047" opacity=".3"/><path d="${star(76, 27, 10, 4.2)}" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.2" stroke-linejoin="round"/>` +
        hl(20, 22, 7, 1.8, -19, .7) + hl(72, 20, 2.2, 1.4, -30, .9),
      // Книга Ордена: лаковый фолиант, золотые уголки, застёжка, медальон с восьмиконечной звездой
      orderbook: () => D(lg('c', [[0, '#a78bfa'], [.45, '#6d28d9'], [1, '#2a1b5a']], .6, 1), lg('p', PAPER), lg('a', AU, .6, 1), rg('m', [[0, '#fff7d1'], [.45, '#f7d77e'], [1, '#8a5a14']], .35, .3, .8), rg('j', [[0, '#ecfeff'], [.45, '#2dd4bf'], [1, '#0f5e56']], .35, .3, .8)) + sh(32) +
        `<path d="M22 14 H82 Q88 14 88 20 V84 Q88 90 82 90 H22Z" fill="${u('p')}" stroke="#5c3310" stroke-width="3"/><path d="M83 22 V84 M79 20 V87" stroke="#c9a064" stroke-width="1.6"/>
        <rect x="12" y="9" width="66" height="79" rx="6" fill="${u('c')}" stroke="#170d38" stroke-width="3.2"/>
        <path d="M13.6 15 Q13.6 10.6 18 10.6 H25 V86.4 H18 Q13.6 86.4 13.6 82Z" fill="#170d38" opacity=".4"/>
        <rect x="14" y="19" width="11" height="4.5" rx="1" fill="${u('a')}"/><rect x="14" y="74" width="11" height="4.5" rx="1" fill="${u('a')}"/>
        <rect x="30" y="16" width="42" height="65" rx="3" fill="none" stroke="#f7d77e" stroke-width="1.8" opacity=".7"/>
        <g fill="${u('a')}" stroke="#4a2c06" stroke-width="2" stroke-linejoin="round"><path d="M25 9 H37 L25 21Z M78 21 V15 Q78 9 72 9 H66Z M25 88 H37 L25 76Z M78 76 V82 Q78 88 72 88 H66Z"/>
        <rect x="70" y="42" width="18" height="13" rx="3"/></g><circle cx="80" cy="48.5" r="2.4" fill="#4a2c06"/>
        <circle cx="50" cy="48.5" r="16" fill="${u('m')}" stroke="#4a2c06" stroke-width="2.8"/><circle cx="50" cy="48.5" r="12" fill="none" stroke="#8a5a14" stroke-width="1.4" opacity=".7"/>
        <path d="${star(50, 48.5, 11, 6.4, 8)}" fill="${u('j')}" stroke="#0b3b36" stroke-width="1.6" stroke-linejoin="round"/><circle cx="50" cy="48.5" r="2.6" fill="#fff7d1"/>` +
        hl(36, 14.5, 12, 1.8, 0, .55) + hl(44, 41, 3, 1.8, -35, .8),
      // Настройки: стальная шестерня и малая золотая
      gear: () => D(lg('s', [[0, '#f1f5f9'], [.45, '#a3b1c6'], [1, '#475569']], .6, 1), lg('a', AU, .6, 1), rg('h', [[0, '#fff7d1'], [.45, '#f7d77e'], [1, '#8a5a14']], .35, .3, .8)) + sh(32) +
        `<path d="${cog(74, 27, 18, 13, 10)}" fill="${u('a')}" stroke="#4a2c06" stroke-width="2.8" stroke-linejoin="round"/><circle cx="74" cy="27" r="5" fill="#2a1405" stroke="#4a2c06" stroke-width="2"/>
        <path d="${cog(43, 57, 34, 26, 12)}" fill="${u('s')}" stroke="#1e293b" stroke-width="3.2" stroke-linejoin="round"/>
        <circle cx="43" cy="57" r="19" fill="none" stroke="#475569" stroke-width="2.4" opacity=".55"/><path d="M29 47 A17 17 0 0 1 48 40.7" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".6"/>
        <circle cx="43" cy="57" r="11" fill="${u('h')}" stroke="#4a2c06" stroke-width="2.6"/><circle cx="43" cy="57" r="4.5" fill="#1e293b"/>` +
        hl(21, 44, 2.2, 5, 25, .55) + hl(70, 20, 3.5, 1.6, -30, .7),
    };
    return `<svg class="mi art" viewBox="0 0 100 100" aria-hidden="true">${A[k] ? A[k]() : ''}</svg>`;
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
      ${pages.length > 1 ? `<div class="menu-dots">${pages.map((_, i) => `<button class="${i === 0 ? 'on' : ''}" data-p="${i}" aria-label="Страница ${i + 1}"></button>`).join('')}</div>` : ''}</div></div>`);
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
      if (n === 0) html = `<span class="age-chip" title="Возрастная категория">12+</span>${Login.logo('Лови духов Нави на улицах своего города')}${Realms.banner()}
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
      Realms.bind(root); // 4.6: выбор сервера (пока только интерфейс)
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
