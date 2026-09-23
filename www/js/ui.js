'use strict';
/* Интерфейс: HUD, меню, экраны (духи, бестиарий, сумка, коконы, задания, профиль, настройки), модалки */

const UI = {
  I: (() => {
    const s = (d, extra = '') => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
    return {
      close: s('<path d="M6 6L18 18M18 6L6 18"/>'),
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
    U.$('#tracker').onclick = () => { if (MapView.tracking) MapView.flyTo(MapView.tracking); };
    U.$('#profileBtn .ava-art').innerHTML = Art.avatar(S.d.look);
    this.refreshEvent();
    setInterval(() => this.refreshEvent(), 60000);
    setInterval(() => this.refreshHud(), 1000);
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
    const badge = S.questsClaimable() + S.readyCocoons().length + Friends.inbox.length + Order.claimable(); // задания, коконы, подарки, общее дело
    const b = U.$('#menuBtn .badge'); b.classList.toggle('hidden', !badge); b.textContent = badge;
    const inc = U.$('#incenseChip');
    if (S.incenseActive()) { inc.classList.remove('hidden'); inc.innerHTML = `${Art.item('incense')}<span>${U.fmtTime(d.incenseUntil - Date.now())}</span>`; }
    else inc.classList.add('hidden');
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

  /* ---------------- МЕНЮ ---------------- */
  menu() {
    Sfx.init(); Sfx.play('tap');
    const q = S.questsClaimable() + Order.claimable(), eggs = S.readyCocoons().length;
    const tiles = [
      ['spirits', 'Духи', () => this.collection(), S.d.spirits.length],
      ['book', 'Бестиарий', () => this.dex()],
      ['bag', 'Сумка', () => this.bag()],
      ['egg', 'Коконы', () => this.cocoons(), eggs ? '!' : ''],
      ['scroll', 'Задания', () => this.quests(), q ? '!' : ''],
      ['swap', 'Друзья', () => Friends.screen(), Friends.inbox.length ? '!' : S.d.items.gift ? S.d.items.gift : ''],
      ['pin', 'Места', () => Propose.screen(), Propose.badge()],
      ['trophy', 'Лига', () => { if (S.d.level < 5) { this.toast('Лига открывается с 5 уровня Ловчего'); return; } League.screen(); }, League.view().tickets || ''],
      ['gear', 'Настройки', () => this.settings()],
    ];
    if (Tut.step() === 3) setTimeout(() => Tut.finish(), 400);
    const sheet = U.el(`<div class="sheet-wrap"><div class="sheet"><div class="sheet-grip"></div><div class="menu-grid">${tiles.map((t, i) => `<button class="tile" data-i="${i}">${this.I[t[0]]}<span>${t[1]}</span>${t[3] ? `<i class="${t[3] === '!' ? 'alert' : ''}">${t[3]}</i>` : ''}</button>`).join('')}</div>
      <div class="sheet-foot"><span>${Art.item('charm')} ${S.d.items.charm || 0}</span><span class="spark">✦ ${U.fmtNum(S.d.sparks)} искр</span><span>${U.fmtDist(S.d.stats.km * 1000)} пройдено</span></div></div></div>`);
    const close = () => { this.popLayer(close); sheet.classList.add('out'); setTimeout(() => sheet.remove(), 200); };
    sheet.addEventListener('click', e => {
      const t = e.target.closest('.tile');
      if (t) { close(); Sfx.play('tap'); tiles[+t.dataset.i][2](); }
      else if (e.target === sheet) close();
    });
    document.body.appendChild(sheet);
    this.pushLayer(close);
  },

  /* ---------------- КОЛЛЕКЦИЯ ---------------- */
  collection() {
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
      scr.querySelector('.head-extra').textContent = `${S.d.spirits.length}`;
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
      const icon = { svyatki: '❄', maslenitsa: '☀', kupala: '✿', veles: '☾' }[h.id];
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
          <div class="panel res"><span>✦ ${U.fmtNum(S.d.sparks)} искр</span><span>Эссенция «${fam.name}»: <b>${ess}</b></span></div>
          <div class="det-actions">
            <button class="btn primary act-power" ${pErr ? 'data-err="' + U.esc(pErr) + '"' : ''}>Усилить<small>✦ ${pc.sparks} · ${pc.essence} эсс.</small></button>
            ${s.evo ? `<button class="btn evolve act-evo" ${eErr ? 'data-err="' + U.esc(eErr) + '"' : ''}>Превратить<small>${s.cost} эсс. → ${SP[s.evo].name}</small></button>` : ''}
          </div>
          <p class="det-desc">${s.desc}</p>
          ${sp.from ? `<p class="small">Получен в подарок от Ловчего ${U.esc(sp.from)}</p>` : ''}
          <div class="det-actions">
            <button class="btn ghost act-trade">${this.I.swap} Передать другу</button>
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
      else if (t.classList.contains('act-trade')) Trade.offer(sp, () => this.closeScreen(scr));
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
    const caught = SPECIES.filter(s => S.d.dex[s.id] && S.d.dex[s.id].caught).length;
    const seen = SPECIES.filter(s => S.d.dex[s.id] && S.d.dex[s.id].seen).length;
    const scr = this.screen('Бестиарий', `
      <div class="dex-sum">Поймано <b>${caught}</b> из ${SPECIES.length} · встречено ${seen}</div>
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
          <div class="det-tags"><span>${Art.elIcon(s.el, 18)} ${ELEMENTS[s.el].name}</span><span style="color:${RARITY[s.rar].color}">${RARITY[s.rar].name}</span>${s.time === 'night' ? '<span>Чаще ночью</span>' : ''}${s.time === 'day' ? '<span>Только днём</span>' : ''}${s.region ? `<span>Регион: ${REGIONS[s.region].name} (${REGIONS[s.region].range})</span>` : ''}${s.legend ? '<span>Только в разломах</span>' : ''}${s.season === 'winter' ? '<span>Зимний: дек–фев и Святки</span>' : ''}${s.season === 'kupala' ? '<span>Летний: июнь–июль и Купала</span>' : ''}</div>
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
    const scr = this.screen('Сумка', '<div class="list bag"></div>', 'bag-screen');
    const render = () => {
      scr.querySelector('.head-extra').textContent = `${S.bagCount()}/${BAG_LIMIT}`;
      const keys = Object.keys(ITEMS).filter(k => (S.d.items[k] || 0) > 0);
      const ams = AMULET_KEYS.filter(k => S.d.amulets[k] > 0);
      scr.querySelector('.list').innerHTML = ams.map(k => `
        <div class="row"><div class="row-ico">${Art.amulet(k)}</div><div class="row-main"><b>${AMULETS[k].name}</b><small>${AMULETS[k].desc}. Надевается на карточке духа.</small></div>
        <div class="row-side"><span class="cnt">×${S.d.amulets[k]}</span></div></div>`).join('') + keys.map(k => `
        <div class="row"><div class="row-ico">${Art.item(k)}</div><div class="row-main"><b>${ITEMS[k].name}</b><small>${ITEMS[k].desc}</small></div>
        <div class="row-side"><span class="cnt">×${S.d.items[k]}</span>${k === 'incense' ? `<button class="btn small primary use-inc">${S.incenseActive() ? 'Горит' : 'Зажечь'}</button>` : ''}</div></div>`).join('')
        || '<div class="empty">Сумка пуста. Загляни к ближайшему роднику!</div>';
    };
    scr.addEventListener('click', async e => {
      if (!e.target.closest('.use-inc')) return;
      if (S.incenseActive()) { this.toast(`Ладан ещё горит: ${U.fmtTime(S.d.incenseUntil - U.now())}`); return; }
      if (await Game.try('incense')) {
        Sfx.play('spin'); this.toast('Ладан зажжён — духи потянулись к тебе', 'good');
        MapView.refresh(); this.refreshHud(); render();
      }
    });
    render();
  },

  /* ---------------- КОКОНЫ ---------------- */
  cocoons() {
    const scr = this.screen('Коконы', '<div class="coc-info"></div><div class="grid coc"></div>', 'coc-screen');
    const render = () => {
      const inc = S.incubating();
      scr.querySelector('.head-extra').textContent = `${S.d.cocoons.length}/9`;
      scr.querySelector('.coc-info').innerHTML = `Коконы согреваются, пока ты ходишь. Одновременно можно греть <b>3</b> кокона (сейчас ${inc}).<br>Пройдено всего: <b>${U.fmtDist(S.d.stats.km * 1000)}</b>`;
      scr.querySelector('.grid').innerHTML = S.d.cocoons.map(c => {
        const ready = c.inc && c.walked >= c.km;
        return `<div class="coc-card ${ready ? 'ready' : ''}" data-id="${c.id}">
          <div class="coc-art ${c.inc ? 'warm' : ''}">${Art.cocoon(c.km)}</div>
          <b>${COCOON_TIERS[c.km].name}</b><small>${c.km} км</small>
          ${c.inc ? `<div class="pbar"><i style="width:${Math.min(100, c.walked / c.km * 100)}%"></i></div><small>${c.walked.toFixed(2)} / ${c.km} км</small>` : ''}
          ${ready ? '<button class="btn small primary hatch">Вылупить!</button>' : c.inc ? '' : `<button class="btn small warm-btn" ${inc >= 3 ? 'disabled' : ''}>Греть</button>`}
        </div>`;
      }).join('') || '<div class="empty">Коконов нет. Иногда их можно найти в роднике.</div>';
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
    this.qTab = tab || this.qTab || (S.storyReady() ? 'story' : 'day');
    const scr = this.screen('Задания', `<div class="seg q-tabs"><button data-tab="day">Задания дня${S.d.tasks.some(q => q.p >= q.n) || S.d.taskMeet.length ? ' •' : ''}</button><button data-tab="story">Летопись${S.storyReady() ? ' •' : ''}</button><button data-tab="order">Орден${Order.claimable() ? ' •' : ''}</button></div><div class="quests"></div>`, 'q-screen');
    const rwText = rw => Object.entries(rw).filter(([k]) => k !== 'xp').map(([k, n]) => k === 'sparks' ? `✦ ${n}` : `${ITEMS[k].name} ×${n}`).join(', ');
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
          const p = st.p[i], done = p >= s.n, pv = s.t === 'walk' ? `${p.toFixed(2)} / ${s.n}` : `${Math.floor(p)} / ${s.n}`;
          return `<div class="quest ${done ? 'done' : ''}"><div class="q-main"><b>${stepText(s)}</b><div class="pbar"><i style="width:${p / s.n * 100}%"></i></div><small>${pv}</small></div>${done ? '<span class="q-ok">✓</span>' : ''}</div>`;
        }).join('')}
        <div class="quest bonus ${ready ? 'done' : ''}"><div class="q-main"><b>Награда главы</b><small>${rwText(ch.reward)}${ch.gift ? ` и встреча с легендой: ${SP[ch.gift].name}` : ''}</small></div>
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
      const Q = S.d.quests, all = Q.list.every(q => q.claimed);
      scr.querySelector('.quests').innerHTML = Q.list.map((q, i) => {
        const done = q.p >= q.n, pv = q.t === 'walk' ? `${q.p.toFixed(2)} / ${q.n}` : `${Math.floor(q.p)} / ${q.n}`;
        return `<div class="quest ${q.claimed ? 'claimed' : done ? 'done' : ''}"><div class="q-main"><b>${q.text}</b><div class="pbar"><i style="width:${q.p / q.n * 100}%"></i></div><small>${pv} · Награда: ${rwText(q.reward)}</small></div>
          ${q.claimed ? '<span class="q-ok">✓</span>' : done ? `<button class="btn small primary claim" data-i="${i}">Забрать</button>` : ''}</div>`;
      }).join('') + `<div class="quest bonus ${Q.bonus ? 'claimed' : all ? 'done' : ''}"><div class="q-main"><b>Сундук дня</b><small>Выполни все три задания. Награда: ${rwText(BONUS)}</small></div>
        ${Q.bonus ? '<span class="q-ok">✓</span>' : all ? '<button class="btn small primary claim-bonus">Открыть</button>' : ''}</div>
        <div class="q-note">Новые задания появятся в полночь.</div>` + this.tasksHtml();
    };
    scr.addEventListener('click', e => {
      const c = e.target.closest('.claim'), b = e.target.closest('.claim-bonus');
      const tab = e.target.closest('[data-tab]');
      if (tab) { this.qTab = tab.dataset.tab; Sfx.play('tap'); render(); return; }
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
    render();
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
        <div class="prof-ava">${this.avatar()}</div>
        <div class="prof-btns"><button class="btn small ghost look-btn">Изменить облик</button><button class="btn small ghost journal-btn">Дневник</button></div>
        <div class="prof-name">${U.esc(d.name)}</div>
        <div class="prof-rank">${this.rank(d.level)} Ордена Оберега · уровень ${d.level}</div>
        ${d.clan ? `<div class="prof-clan">${Clans.badge(d.clan)} <button class="btn small ghost clan-open">Дружина</button><small>защитников поставлено: ${d.stats.defends || 0} · Капищ освобождено: ${d.stats.freed || 0}</small></div>`
          : d.level >= CLAN_LEVEL ? '<button class="btn small primary clan-btn">Выбрать дружину</button>' : ''}
        <div class="pbar big"><i style="width:${d.level >= MAX_LEVEL ? 100 : (d.xp - cur) / (next - cur) * 100}%"></i></div>
        <small>${d.level >= MAX_LEVEL ? 'Максимальный уровень' : `${U.fmtNum(d.xp - cur)} / ${U.fmtNum(next - cur)} опыта до ${d.level + 1} уровня`}</small>
        <div class="prof-stats">
          <div><b>${d.stats.caught}</b><span>поймано духов</span></div>
          <div><b>${caught}/${SPECIES.length}</b><span>видов в бестиарии</span></div>
          <div><b>${U.fmtDist(d.stats.km * 1000)}</b><span>пройдено</span></div>
          <div><b>${d.stats.springs}</b><span>родников</span></div>
          <div><b>${d.stats.raids}</b><span>закрыто разломов</span></div>
          <div><b>${d.stats.evolved}</b><span>превращений</span></div>
          <div><b>${d.stats.hatched}</b><span>из коконов</span></div>
          <div><b>${d.stats.duels}</b><span>побед в капищах</span></div>
          <div><b>${d.stats.traded}</b><span>обменов</span></div>
          <div><b>${d.stats.shiny}</b><span>сияющих</span></div>
          <div><b>${d.stats.invasions}</b><span>вторжений отбито</span></div>
          <div><b>${d.stats.purified}</b><span>очищено духов</span></div>
          <div><b>${d.stats.throwsGreat}</b><span>отличных бросков</span></div>
          <div><b>✦ ${U.fmtNum(d.sparks)}</b><span>искр</span></div>
        </div>
        <h3 class="prof-h">Спутник</h3>
        ${buddyHtml}
        <h3 class="prof-h">Знаки Ордена <small>${Object.values(d.medals).reduce((a, b) => a + b, 0)} / ${MEDALS.length * 3}</small></h3>
        <div class="medals">${medalsHtml}</div>
        <h3 class="prof-h">Альбом <small>${Album.list().length} / ${Album.MAX}</small></h3>
        <div class="album-box">${Album.html()}</div>
        <div class="prof-since">В Ордене с ${new Date(d.created).toLocaleDateString('ru-RU')}</div>
      </div>`, 'prof-screen');
    scr.addEventListener('click', e => {
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
        ${sw('Плащ', LOOK.cloak, x => `<button class="sw ${x.lvl > lvl ? 'locked' : ''}" data-k="cloak" data-v="${x.c}" data-l="${x.lvl}" title="${x.name}" style="--sw:${x.c}"></button>`)}
        ${sw('Глаза', LOOK.eyes, x => `<button class="sw ${x.lvl > lvl ? 'locked' : ''}" data-k="eyes" data-v="${x.c}" data-l="${x.lvl}" title="${x.name}" style="--sw:${x.c}"></button>`)}
        ${sw('Эмблема', LOOK.emblem, x => {
          // особые эмблемы: за ранг Лиги и за вторую книгу Летописи
          const lk = x.league && League.view().best < x.league ? 'league' : x.story && S.d.story.ch < x.story ? 'story' : x.lvl;
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
      if (b.dataset.l === 'story') { this.toast('Игла Кощея — награда за вторую книгу Летописи'); return; }
      if (+b.dataset.l > lvl) { this.toast(`Откроется на ${b.dataset.l} уровне`); return; }
      look[b.dataset.k] = b.dataset.v; Sfx.play('tap'); render();
    });
    render();
  },

  /* ---------------- НАСТРОЙКИ ---------------- */
  settings() {
    const s = Cfg.s;
    const row = (k, title, sub) => `<label class="row toggle"><div class="row-main"><b>${title}</b><small>${sub}</small></div><input type="checkbox" data-k="${k}" ${s[k] ? 'checked' : ''}><i></i></label>`;
    const scr = this.screen('Настройки', `
      <div class="list">
        ${DEV ? row('demo', 'Демо-режим (разработка)', 'Джойстик вместо GPS. Доступен только на локальном сервере.') : ''}
        ${row('ar', 'AR-камера', 'Духи появляются поверх изображения с камеры.')}
        ${row('music', 'Музыка', 'Спокойные «гусли» на карте и боевая тема в сражениях.')}
        ${row('sound', 'Звук', 'Звуковые эффекты.')}
        ${row('vibro', 'Вибрация', 'Отклик при бросках и попаданиях.')}
        ${row('weather', 'Настоящая погода', 'Узнавать погоду через Open-Meteo (отправляются координаты с точностью ~1 км). Выключено — погода Нави моделируется.')}
        ${row('eco', 'Экономия батареи', 'Меньше анимаций на карте, реже обновление и запросы GPS.')}
      </div>
      <div class="list">
        <div class="row"><div class="row-main"><b>Доступность и вид</b></div></div>
        ${row('bigText', 'Крупный текст', 'Увеличенный шрифт в меню, карточках и подсказках.')}
        ${row('tapThrow', 'Бросок одним касанием', 'Коснись оберега — он сам полетит в духа. Бонус кольца по-прежнему зависит от момента.')}
        ${row('calm', 'Меньше движения', 'Без покачиваний, мерцания и погодных эффектов.')}
        <div class="row"><div class="row-main"><b>Тема карты</b><small>Авто — тёмная с 20:00 до 6:00</small></div>
          <div class="seg map-theme">${[['auto', 'Авто'], ['light', 'День'], ['dark', 'Ночь']].map(([k, t]) => `<button data-theme="${k}" class="${(s.mapTheme || 'auto') === k ? 'on' : ''}">${t}</button>`).join('')}</div></div>
      </div>
      <div class="list install-list">
        <button class="row link inst-pwa hidden"><div class="row-main"><b>Установить на главный экран</b><small>Духолов откроется на весь экран, как обычное приложение</small></div></button>
        <a class="row link inst-apk hidden" href="duholov.apk" download><div class="row-main"><b>Скачать APK для Android</b><small>Приложение-обёртка: разреши установку из этого источника</small></div></a>
        ${Cloud.configured() ? row('cloud', 'Общая таблица Лиги', 'Показывать твоё имя, облик, уровень и звёзды в таблице сезона.') : ''}
      </div>
      <div class="list">
        <div class="row"><div class="row-main"><b>Прогресс на сервере</b><small class="sync-state"></small></div></div>
        <button class="row link tr-out"><div class="row-main"><b>Перенести на другое устройство</b><small>Получить одноразовый код для нового телефона</small></div></button>
        <button class="row link tr-in"><div class="row-main"><b>Перенести прогресс сюда</b><small>Ввести код со старого устройства</small></div></button>
      </div>
      <div class="list">
        <button class="row link about"><div class="row-main"><b>Об игре и мире</b><small>История Тонкой ночи и правила</small></div></button>
        <button class="row link reset"><div class="row-main"><b class="danger-t">Сбросить прогресс</b><small>Удалить всех духов и начать заново</small></div></button>
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
    const syncState = () => {
      if (!scr.isConnected) return clearInterval(st);
      scr.querySelector('.sync-state').textContent = !Game.on() ? 'Сервер не настроен' : Game.online
        ? 'Каждое действие сразу проверяет и сохраняет сервер игры' : 'Нет связи с сервером — проверь интернет';
    };
    const st = setInterval(syncState, 1000);
    syncState();
    scr.querySelector('.tr-out').onclick = () => Game.codeDialog();
    scr.querySelector('.tr-in').onclick = () => Game.claimDialog();
    scr.querySelector('.about').onclick = () => this.about();
    scr.querySelector('.reset').onclick = () => this.confirm('Сбросить прогресс?', 'Все духи, предметы и уровень будут удалены с сервера навсегда.', 'Сбросить', () => {
      this.confirm('Точно?', 'Это действие нельзя отменить.', 'Да, сбросить', async () => {
        if (await Game.try('reset')) location.reload();
      }, 'Нет', true);
    }, 'Отмена', true);
  },
  about() {
    this.modal({
      title: 'Духолов', cls: 'about-modal',
      html: LORE.map(p => `<p>${p}</p>`).join('') + `
        <h4>Как играть</h4>
        <ul>
          <li><b>Духи</b> появляются на карте вокруг тебя. Подойди ближе ${W.INTERACT} м и коснись духа.</li>
          <li><b>Бросок</b>: смахни оберег вверх. Сила свайпа — дальность. Попадание во внутреннее кольцо, пока оно маленькое, повышает шанс.</li>
          <li><b>Цвет кольца</b>: зелёный — лёгкий дух, красный — трудный. Мёд и серебряные/золотые обереги помогают.</li>
          <li><b>Родники</b> (синие колодцы) стоят у настоящих мест — памятников, фонтанов, арт-объектов, храмов. Дают обереги, мёд, живую воду и коконы. Перезаряжаются 5 минут.</li>
          <li><b>Разломы</b> (порталы со звёздами) открываются у Капищ на час — битвы с боссами. Тапай для атаки, уклоняйся при «!». Победа — шанс поймать босса. Боссы меняются каждый час.</li>
          <li><b>Стихии</b>: ${ELEMENT_KEYS.map(e => `${ELEMENTS[e].name} бьёт ${ELEMENTS[e].beats.map(b => ELEMENTS[b].name).join(' и ')}`).join('; ')}.</li>
          <li><b>Ночью</b> чаще встречаются духи Тени и Ветра, в каждом районе города — своя любимая стихия.</li>
          <li><b>Погода</b> усиливает две стихии: таких духов больше, они сильнее и дают больше искр. В <b>полнолуние</b> выходят Русалки и Навки, в <b>новолуние</b> чаще сияющие духи.</li>
          <li><b>Сияющие духи</b> — редкие цветовые варианты (примерно 1 из 128, в разломах 1 из 20).</li>
          <li><b>Спутник</b> ходит с тобой по карте и приносит эссенцию. Выбери его на карточке духа.</li>
          <li><b>Летопись Ордена</b> — сюжетные главы во вкладке заданий. <b>Знаки Ордена</b> — медали в профиле.</li>
          <li><b>Капища</b> (деревянные идолы) — поединки 3 на 3 с хранителями, с 3 уровня. Тап — атака, «Приём» — особый удар (тапай по сфере, чтобы усилить), 2 щита спасают от приёмов хранителя. Каждое капище можно освятить раз в день.</li>
          <li><b>Региональные духи</b> — вещие птицы Сирин, Алконост и Гамаюн — живут каждая в своей части света. Остальных можно получить через <b>Обмен</b>: карточка духа → «Передать другу», друг принимает код или QR в «Меню → Обмен».</li>
          <li><b>Вторжения Нави</b> (с 4 уровня): захваченные родники светятся лиловым. Победи прислужника — родник освободится, а омрачённого духа можно спасти. Омрачённые бьют сильнее, но их можно <b>очистить</b> на карточке духа.</li>
          <li><b>Праздники</b>: Святки, Масленица, Купальская ночь, Велесова ночь — с сезонными духами Морозко, Снегуркой и Купалинкой.</li>
          <li><b>Фото</b>: кнопка камеры во время встречи делает снимок духа (в AR — поверх камеры). Снимки — в Профиле, в Альбоме.</li>
          <li><b>Лига Ордена</b> (с 5 уровня): турнир из трёх поединков подряд без лечения. Звёзды за победы, 10 рангов с наградами, сезон — месяц. 3 жетона в день.</li>
          <li><b>Амулеты</b> (Перуна, Мокоши, Велеса, Сварога, Лады) надеваются на духа — по одному — и усиливают его в битвах. Выпадают за победы и ранги Лиги.</li>
          <li><b>Второй особый приём</b> учится на карточке духа: в поединках он дешевле основного (⚡35 вместо 50), но слабее.</li>
          <li><b>Друзья</b>: обменяйтесь кодами дружбы в «Меню → Друзья». Подарки из родников можно отправлять каждому другу раз в день — растёт уровень дружбы.</li>
          <li><b>Дневник Ловчего</b> (в профиле) хранит историю поимок и побед, любую запись можно показать на карте.</li>
          <li>В настройках есть <b>крупный текст</b>, <b>бросок одним касанием</b> и режим <b>«меньше движения»</b>.</li>
          <li><b>Следопыт</b>: в «Рядом» коснись духа или выбери «К роднику» / «К капищу» — стрелка вверху покажет направление.</li>
          <li><b>Прогресс хранится на сервере игры</b>. Новый телефон? «Настройки → Перенести на другое устройство» даст одноразовый код.</li>
          <li><b>Места</b>: знаешь интересный объект рядом? Сфотографируй его в «Меню → Места». Снимок получает геометку, модераторы проверяют заявку, и на карте появляется новый Родник или Капище.</li>
          <li><b>События недели</b> меняются каждый понедельник: неделя стихии, Звездопад с двойным опытом, Родниковая неделя и другие.</li>
        </ul>
        <p class="small">Играй внимательно: смотри по сторонам, а не только в телефон.</p>`,
      buttons: [{ label: 'Понятно', cls: 'primary' }],
    });
  },

  /* ---------------- РОДНИК ---------------- */
  spring(e) {
    const scr = this.screen('', `
      <div class="spring-view">
        <div class="spring-title">${U.esc(e.name)}</div>
        <div class="spring-disc"><div class="runes"></div>${e.photo ? `<div class="well photo" style="background-image:url('${Poi.photoUrl(e.photo)}')"></div>` : `<div class="well">${Art.springIcon(!e.ready)}</div>`}</div>
        <div class="spring-hint"></div>
        <div class="spring-loot"></div>
        <button class="btn primary wide spring-go">Зачерпнуть силу</button>
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
        `<div class="loot-xp">+${got.find(x => x.k === 'xp') ? got.find(x => x.k === 'xp').n : 50} опыта${r.full ? ' · Сумка полна!' : ''}</div>` +
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
  onboarding(done) {
    const root = U.el('<div class="onb"></div>');
    document.body.appendChild(root);
    let name = '', starter = null;
    const step = n => {
      root.innerHTML = '';
      let html = '';
      if (n === 0) html = `
        <div class="onb-logo"><div class="onb-charm">${Art.charm('charm3')}</div><h1>ДУХОЛОВ</h1><p>Лови духов Нави на улицах своего города</p></div>
        <div class="onb-spirits">${['vayfayka', 'domovoy', 'kapelka', 'fonarnik', 'leshachok'].map(x => `<div>${Art.spirit(x)}</div>`).join('')}</div>
        <button class="btn primary wide next">Начать</button>${Game.on() ? '<button class="btn ghost wide have">У меня уже есть прогресс</button>' : ''}`;
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
          const r = await Game.try('newGame', { name, starter });
          if (!r) { nx.disabled = false; return; }
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
    step(0);
  },
};
