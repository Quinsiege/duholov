'use strict';
/* 4.6: выбор сервера. Список серверов-княжеств (REALMS ниже) — пока ОБРАЗЕЦ и виден только на тестовом контуре.
   4.21: состояние и пинг — настоящие: экран входа замеряет отклик сервера игры (GET …/functions/v1/game/ping, база
   проверяется там же) и показывает, на связи ли он. На боевом сайте вместо образца — наш единственный сервер. */

const REALMS = [
  { id: 'kitezh', name: ru`Китеж`, region: ru`Москва и Центр`, tz: 'UTC+3', color: '#fbbf24', glyph: 'domes', load: 0.72, online: 18450, ping: 24, tags: ['rec'],
    about: ru`Старейший сервер: здесь самая сильная Лига и больше всего Орденов.` },
  { id: 'lukomorye', name: ru`Лукоморье`, region: ru`Северо-Запад`, tz: 'UTC+3', color: '#34d399', glyph: 'oak', load: 0.48, online: 9120, ping: 31,
    about: ru`Белые ночи — Разломы открываются чаще, чем где-либо.` },
  { id: 'buyan', name: ru`Буян`, region: ru`Юг и Кавказ`, tz: 'UTC+3', color: '#38bdf8', glyph: 'island', load: 0.31, online: 6230, ping: 46,
    about: ru`Тёплые моря и водные духи круглый год.` },
  { id: 'belovodye', name: ru`Беловодье`, region: ru`Урал и Сибирь`, tz: 'UTC+5…+7', color: '#e2e8f0', glyph: 'peaks', load: 0.56, online: 7810, ping: 62,
    about: ru`Горные Святилища и Хозяйка Медной горы.` },
  { id: 'iriy', name: ru`Ирий`, region: ru`Дальний Восток`, tz: 'UTC+10', color: '#f472b6', glyph: 'bird', load: 0.22, online: 2940, ping: 118,
    about: ru`Первым встречает рассвет: ежедневные задания обновляются раньше всех.` },
  { id: 'tridevyatoe', name: ru`Тридевятое царство`, region: ru`Вся Россия`, tz: 'UTC+3', color: '#a78bfa', glyph: 'crown', load: 0.08, online: 640, ping: 38, tags: ['new'],
    about: ru`Новый сервер: все начинают с нуля — самое время занять первые места в Лиге.` },
  { id: 'kalinov', name: ru`Калинов мост`, region: ru`Вся Россия`, tz: 'UTC+3', color: '#f43f5e', glyph: 'bridge', load: 0.97, online: 24100, ping: 40,
    about: ru`Сервер для опытных Ловчих: сильные духи и суровые Разломы.` },
];

const Realms = {
  KEY: 'duholov-realm',
  // пока данные — образец, выбор сервера виден только на тестовом контуре (localhost, test.duholov.ru): игрокам не показываем выдуманные серверы и друзей
  on: DEV,
  // 4.21: на боевом сайте — один настоящий сервер (где стоит — CLOUD_CONFIG.where), состояние и пинг — живые
  home() {
    const h = this.HOME[CLOUD_CONFIG.where] || this.HOME.msk;
    return { id: 'home', real: true, name: this.where() || ru`Духолов`, region: ru`Сервер игры`, tz: h.tz, color: h.color, glyph: h.glyph,
      about: ru`Пока это единственный сервер: здесь вся Лига, Ордена и Святилища. Новые серверы появятся позже.` };
  },
  list() { return this.on ? REALMS : [this.home()]; },
  current() {
    if (!this.on) return this.home();
    let id = null;
    try { id = localStorage.getItem(this.KEY); } catch (e) {}
    return REALMS.find(r => r.id === id) || REALMS[0];
  },
  save(id) { try { localStorage.setItem(this.KEY, id); } catch (e) {} },
  // заполненность → подпись и цвет; «Заполнен» — новые Ловчие не принимаются
  load(r) {
    return r.load >= 0.95 ? { t: ru`Заполнен`, c: '#fb7185', k: 'full' } : r.load >= 0.75 ? { t: ru`Людно`, c: '#fb923c', k: 'busy' }
      : r.load >= 0.4 ? { t: ru`Оживлённо`, c: '#fde047', k: 'mid' } : { t: ru`Свободно`, c: '#4ade80', k: 'free' };
  },
  bars(ms) { return ms < 40 ? 4 : ms < 70 ? 3 : ms < 110 ? 2 : 1; },
  // есть ли у игрока Ловчий на сервере (образец: только на выбранном и на Китеже, если прогресс уже есть)
  hero(r) {
    if (!S.d || !S.d.name) return null;
    const cur = this.current();
    if (r.id === cur.id) return { name: S.d.name, lvl: S.d.level || 1 };
    return null;
  },
  friends(r) { return Math.floor(U.h('realm-friends', r.id) * 5); },
  // 4.15: «18,5 тыс.» по-русски; в других языках — краткая запись по их правилам (18K, 1.8万…)
  fmtOnline(n) { return n < 1000 ? String(n) : I18N.lang === 'ru' ? ru`${(n / 1000).toLocaleString(I18N.locale, { maximumFractionDigits: n >= 10000 ? 0 : 1 })} тыс.` : new Intl.NumberFormat(I18N.locale, { notation: 'compact', maximumFractionDigits: n >= 10000 ? 0 : 1 }).format(n); },

  // герб сервера: медальон с эмалью цвета сервера и знаком
  GLYPH: {
    domes: 'M10 32V22h4v-4c0-3 3-5 3-7 0 2 3 4 3 7v4h0v-6c0-4 4-6 4-9 0 3 4 5 4 9v6h0v-4c0-3 3-5 3-7 0 2 3 4 3 7v4h4v10Z M17 6v-3M24 3V0M31 6v-3',
    oak: 'M20 34V24M20 26l-5-4M20 24l5-5M9 18c-3-5 2-10 6-8 1-5 9-6 11-1 5-2 9 4 6 8 3 3 0 8-4 7-2 3-7 3-9 0-4 2-9-1-10-6Z M12 34h16',
    island: 'M4 30c4-3 8-3 12 0s8 3 12 0 8-3 8 0M8 26c3-8 9-12 12-12s9 4 12 12Z M18 14v-6l6 3-6 3',
    peaks: 'M3 32 13 14l6 9 5-7 13 16Z M13 14l-3 6h6ZM24 16l-3 4h5Z M14 32c2-3 6-3 8-1s6 2 8 1',
    bird: 'M20 12c-2 0-4 2-4 4s2 5 4 5 4-3 4-5-2-4-4-4Z M16 18C10 12 4 12 2 14c5 1 9 5 12 9M24 18c6-6 12-6 14-4-5 1-9 5-12 9M17 22l-3 12h12l-3-12Z',
    crown: 'M6 28 4 12l9 7 7-12 7 12 9-7-2 16Z M6 32h28',
    bridge: 'M2 24h36M4 24c4-8 12-12 16-12s12 4 16 12M10 24v-6M20 24V12M30 24v-6M8 34c2-4 4-2 5-6 2 3 4 3 4 6M24 34c2-4 4-2 5-6 2 3 4 3 4 6',
  },
  crest(r, size = 56) {
    const id = 'rl' + (++this._n);
    return `<svg class="rl-crest" width="${size}" height="${size}" viewBox="0 0 60 60" aria-hidden="true"><defs>` +
      `<radialGradient id="${id}e" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="${r.color}" stop-opacity=".55"/><stop offset=".6" stop-color="#241650"/><stop offset="1" stop-color="#0d0724"/></radialGradient>` +
      `<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f3cf6b"/><stop offset="1" stop-color="#a1570f"/></linearGradient></defs>` +
      `<circle cx="30" cy="30" r="28" fill="url(#${id}g)"/><circle cx="30" cy="30" r="24.5" fill="url(#${id}e)" stroke="#3b1a02" stroke-width="1.2"/>` +
      [0, 90, 180, 270].map(a => `<path d="M30 1.2l2.2 2.2-2.2 2.2-2.2-2.2z" fill="#3b1a02" transform="rotate(${a} 30 30)"/>`).join('') +
      `<g transform="translate(10 11)" fill="none" stroke="${r.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${this.GLYPH[r.glyph]}" fill="${r.color}" fill-opacity=".22"/></g></svg>`;
  },
  _n: 0,

  /* ---------- 4.21: настоящее состояние сервера игры ---------- */
  // st: wait — замеряем, ok — на связи, slow — отвечает медленно, down — не отвечает, net — нет интернета, none — облака нет
  live: { st: 'wait', ms: 0 },
  WHERE: { msk: ru`Москва`, spb: ru`Санкт-Петербург` },
  where() { return this.WHERE[CLOUD_CONFIG.where] || ''; },
  COLOR: { wait: '#a8a0c8', ok: '#4ade80', slow: '#fbbf24', down: '#fb7185', net: '#fb7185', none: '#a8a0c8' },
  stateText(st) {
    return { wait: ru`Проверяем связь…`, ok: ru`Сервер на связи`, slow: ru`Сервер отвечает медленно`, down: ru`Сервер не отвечает`,
      net: ru`Нет интернета`, none: ru`Игра без сервера` }[st];
  },
  // один замер: мс до ответа; состояние базы — в ответе сервера (db: -1 — база не отвечает)
  async hit(ms = 6000) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = setTimeout(() => ctl && ctl.abort(), ms);
    const t0 = performance.now();
    try {
      const r = await fetch(CLOUD_CONFIG.url + '/functions/v1/game/ping?t=' + Date.now(), { cache: 'no-store', signal: ctl && ctl.signal });
      const dt = Math.round(performance.now() - t0);
      if (r.status >= 500) return { down: true };
      const j = await r.json().catch(() => ({}));
      return { ms: dt, db: typeof j.db === 'number' ? j.db : 0 };
    } catch (e) { return { down: true }; } finally { clearTimeout(t); }
  },
  // замер: первый запрос тратит время на соединение (TLS) — пинг берём лучший из двух следующих
  async probe() {
    if (this._busy) return this._busy;
    this._busy = (async () => {
      if (!Cloud.configured()) return (this.live = { st: 'none', ms: 0 });
      if (navigator.onLine === false) return (this.live = { st: 'net', ms: 0 });
      const a = await this.hit();
      if (a.down) return (this.live = { st: navigator.onLine === false ? 'net' : 'down', ms: 0 });
      const ok = [a, await this.hit(), await this.hit()].filter(x => !x.down);
      const ms = Math.min(...ok.map(x => x.ms).slice(-2)), db = ok[ok.length - 1].db;
      return (this.live = { st: db < 0 || db > 1500 || ms > 400 ? 'slow' : 'ok', ms, db });
    })();
    try { return await this._busy; } finally { this._busy = null; this.paint(); }
  },
  // обновить все показатели сервера на экране (кнопка и витрина)
  paint() {
    const l = this.live, c = this.COLOR[l.st], up = l.st === 'ok' || l.st === 'slow', bars = up ? (l.ms < 60 ? 4 : l.ms < 120 ? 3 : l.ms < 250 ? 2 : 1) : 0; // мобильная сеть: 40–100 мс — это хорошо
    document.querySelectorAll('[data-srv]').forEach(el => {
      el.style.setProperty('--c', c);
      el.dataset.st = l.st;
      const t = el.querySelector('.srv-t'); if (t) t.textContent = this.stateText(l.st);
      const ms = el.querySelector('.srv-ms'); if (ms) ms.textContent = up ? ru`${l.ms} мс` : '';
      el.querySelectorAll('.rl-sig i').forEach((b, i) => b.classList.toggle('on', i < bars));
      const btn = el.closest('button');
      if (btn && btn.dataset.lbl) btn.setAttribute('aria-label', `${btn.dataset.lbl}. ${this.stateText(l.st)}${up ? ' · ' + ru`${l.ms} мс` : ''}`);
    });
  },
  sig() { return `<span class="rl-sig">${[1, 2, 3, 4].map(i => `<i style="height:${2 + i * 2.5}px"></i>`).join('')}</span>`; },
  // пока экран входа открыт — перемеряем раз в 20 с (и сразу, когда пропал или вернулся интернет)
  watch(root) {
    clearInterval(this._iv);
    window.removeEventListener('online', this._on); window.removeEventListener('offline', this._on);
    const tick = () => {
      if (!root.isConnected) { clearInterval(this._iv); window.removeEventListener('online', this._on); window.removeEventListener('offline', this._on); return; }
      this._at = Date.now(); this.probe();
    };
    this._iv = setInterval(tick, 20000);
    this._on = () => { this.live = { st: 'wait', ms: 0 }; this.paint(); tick(); };
    window.addEventListener('online', this._on); window.addEventListener('offline', this._on);
    this.paint();
    if (Date.now() - (this._at || 0) > 5000) tick(); // шаги знакомства перерисовывают экран — не перемеряем каждый раз
  },

  // кнопка в углу (образец, тестовый контур); с 4.21 экраны входа показывают витрину banner()
  // 5.1.35: значок сервера — вверху экрана входа (и на боевом: там — настоящий сервер, его состояние и пинг)
  chip() {
    const c = this.COLOR[this.live.st], r = this.current();
    return `<button class="realm-chip" data-lbl="${ru`Сервер: ${U.esc(r.name)}. Сменить`}" aria-label="${ru`Сервер: ${U.esc(r.name)}. Сменить`}">${this.crest(r, 30)}` +
      `<span class="rc-main"><small>${ru`Сервер`}</small><b>${U.esc(r.name)}</b></span><span class="srv-live" data-srv style="--c:${c}"><i class="rc-dot srv-dot"></i><em class="srv-ms"></em></span><svg class="rc-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  },
  // герб нашего сервера (по городу, где он стоит)
  HOME: { msk: { color: '#fbbf24', glyph: 'domes', tz: 'UTC+3' }, spb: { color: '#38bdf8', glyph: 'bridge', tz: 'UTC+3' } },
  bind(root) {
    const chip = root.querySelector('.realm-chip');
    if (!chip) return;
    this.watch(root);
    const redraw = () => { chip.outerHTML = this.chip(); this.bind(root); };
    chip.onclick = () => { Sfx.init(); Sfx.play('tap'); this.open(redraw); };
  },

  card(r, sel, i = 0) {
    const L = r.real ? { c: this.COLOR[this.live.st], k: 'free' } : this.load(r), bars = r.real ? 0 : this.bars(r.ping), me = this.hero(r), fr = r.real ? 0 : this.friends(r);
    const tags = (r.tags || []).map(t => t === 'rec' ? `<span class="rl-tag rec">✦ ${ru`Рекомендуем`}</span>` : t === 'new' ? `<span class="rl-tag new">${ru`Новый`}</span>` : '').join('') +
      (L.k === 'full' ? `<span class="rl-tag full">${ru`Заполнен`}</span>` : '');
    const seg = Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.ceil(r.load * 5) ? 'on' : ''}"></i>`).join('');
    return `<button class="rl-card ${sel ? 'on' : ''} ${L.k === 'full' && !me ? 'closed' : ''}" data-id="${r.id}" style="--rc:${r.color};--lc:${L.c};animation-delay:${i * 0.045}s" role="radio" aria-checked="${sel}">
      <div class="rl-top">${this.crest(r)}
        <div class="rl-head"><b>${U.esc(r.name)}</b><small>${U.esc(r.region)} · ${r.tz}</small>${tags ? `<div class="rl-tags">${tags}</div>` : ''}</div>
        <span class="rl-radio" aria-hidden="true"></span></div>
      <p class="rl-about">${U.esc(r.about)}</p>
      ${me ? `<div class="rl-me"><span class="rl-ava">${Art.avatar ? Art.avatar(S.d.look) : ''}</span><span>${ru`Твой Ловчий: <b>${U.esc(me.name)}</b> · ${me.lvl} ур.`}</span></div>` : ''}
      <div class="rl-stats">${r.real ? `<span class="srv-live" data-srv style="--c:${L.c}"><i class="rc-dot srv-dot"></i><span class="srv-t">${this.stateText(this.live.st)}</span>${this.sig()}<em class="srv-ms"></em></span></div></button>` : `
        <span class="rl-load" title="${ru`Заполненность`}"><span class="rl-seg">${seg}</span><em>${L.t}</em></span>
        <span class="rl-ping" title="${ru`Отклик`}"><span class="rl-sig">${[1, 2, 3, 4].map(i => `<i class="${i <= bars ? 'on' : ''}" style="height:${3 + i * 3}px"></i>`).join('')}</span>${ru`${r.ping} мс`}</span>
        <span class="rl-online">${ru`${this.fmtOnline(r.online)} Ловчих`}${fr ? ` · <b>${ru`${fr} ${U.plural(fr, ru`друг`, ru`друга`, ru`друзей`)}`}</b>` : ''}</span>
      </div></button>`}`;
  },

  // шторка выбора сервера
  open(onPick) {
    let sel = this.current().id, filter = 'all';
    const wrap = U.el(`<div class="rl-wrap" role="dialog" aria-label="${ru`Выбор сервера`}"><div class="rl-sheet">
      <div class="rl-grip"></div>
      <div class="rl-title"><h3>${ru`Выбор сервера`}</h3><button class="rl-x" aria-label="${ru`Закрыть`}">${UI.I.close}</button></div>
      <p class="rl-sub">${ru`Каждый сервер — своё княжество Нави: свои Ловчие, Лига и Ордена. Прогресс на каждом сервере свой.`}</p>
      <div class="seg rl-filter"><button data-f="all" class="on">${ru`Все`}</button><button data-f="rec">${ru`Советуем`}</button><button data-f="mine">${ru`Мои`}</button><button data-f="near">${ru`Ближе`}</button></div>
      <div class="rl-list" role="radiogroup"></div>
      <div class="rl-foot"></div>
    </div></div>`);
    const list = wrap.querySelector('.rl-list'), foot = wrap.querySelector('.rl-foot');
    const render = () => {
      let rs = this.list().slice();
      if (filter === 'rec') rs = rs.filter(r => (r.tags || []).length || this.load(r).k === 'free');
      if (filter === 'mine') rs = rs.filter(r => this.hero(r));
      if (filter === 'near') rs.sort((a, b) => a.ping - b.ping);
      list.innerHTML = rs.length ? rs.map((r, i) => this.card(r, r.id === sel, i)).join('')
        : `<div class="rl-empty">${ru`Здесь пока пусто — выбери сервер во вкладке «Все»`}</div>`;
      const r = this.list().find(x => x.id === sel), same = sel === this.current().id;
      foot.innerHTML = UI.rune(same ? ru`Остаться здесь` : ru`Перейти в ${U.esc(r.name)}`, 'rl-go') +
        `<p class="rl-note">${this.hero(r) ? ru`Твой Ловчий ждёт тебя здесь.` : ru`На этом сервере ты начнёшь новый путь Ловчего.`}</p>`;
    };
    const close = () => { if (!wrap.isConnected) return; UI.popLayer(close); wrap.classList.add('out'); setTimeout(() => wrap.remove(), 220); };
    wrap.onclick = e => {
      if (e.target === wrap || e.target.closest('.rl-x')) return close();
      const f = e.target.closest('.rl-filter button');
      if (f) { filter = f.dataset.f; wrap.querySelectorAll('.rl-filter button').forEach(x => x.classList.toggle('on', x === f)); render(); return; }
      const c = e.target.closest('.rl-card');
      if (c) {
        const r = this.list().find(x => x.id === c.dataset.id);
        if (c.classList.contains('closed')) { UI.toast(ru`«${r.name}» заполнен: новых Ловчих пока не принимают`); return; }
        sel = r.id; Sfx.play && Sfx.play('tap'); render(); return;
      }
      if (e.target.closest('.rl-go')) {
        const r = this.list().find(x => x.id === sel);
        if (sel !== this.current().id) { this.save(sel); UI.toast(ru`Сервер: ${r.name}`); if (onPick) onPick(r); }
        close();
      }
    };
    if (this.list().length < 2) wrap.querySelector('.rl-filter').remove();
    document.body.appendChild(wrap);
    UI.pushLayer(close);
    render();
    this.paint();
    this.probe();
  },
};
