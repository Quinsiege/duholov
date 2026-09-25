'use strict';
/* 4.6: выбор сервера — пока только интерфейс. Серверы — княжества Нави; список, загрузка, пинг и друзья — ОБРАЗЕЦ
   (REALMS ниже), сервер игры о них ещё ничего не знает. Выбор запоминается на телефоне и ни на что не влияет,
   пока не появится серверная часть: тогда REALMS заменит ответ сервера, а pick() начнёт переключать адрес API. */

const REALMS = [
  { id: 'kitezh', name: 'Китеж', region: 'Москва и Центр', tz: 'UTC+3', color: '#fbbf24', glyph: 'domes', load: 0.72, online: 18450, ping: 24, tags: ['rec'],
    about: 'Старейший сервер: здесь самая сильная Лига и больше всего Орденов.' },
  { id: 'lukomorye', name: 'Лукоморье', region: 'Северо-Запад', tz: 'UTC+3', color: '#34d399', glyph: 'oak', load: 0.48, online: 9120, ping: 31,
    about: 'Белые ночи — Разломы открываются чаще, чем где-либо.' },
  { id: 'buyan', name: 'Буян', region: 'Юг и Кавказ', tz: 'UTC+3', color: '#38bdf8', glyph: 'island', load: 0.31, online: 6230, ping: 46,
    about: 'Тёплые моря и водные духи круглый год.' },
  { id: 'belovodye', name: 'Беловодье', region: 'Урал и Сибирь', tz: 'UTC+5…+7', color: '#e2e8f0', glyph: 'peaks', load: 0.56, online: 7810, ping: 62,
    about: 'Горные Капища и Хозяйка Медной горы.' },
  { id: 'iriy', name: 'Ирий', region: 'Дальний Восток', tz: 'UTC+10', color: '#f472b6', glyph: 'bird', load: 0.22, online: 2940, ping: 118,
    about: 'Первым встречает рассвет: ежедневные задания обновляются раньше всех.' },
  { id: 'tridevyatoe', name: 'Тридевятое царство', region: 'Вся Россия', tz: 'UTC+3', color: '#a78bfa', glyph: 'crown', load: 0.08, online: 640, ping: 38, tags: ['new'],
    about: 'Новый сервер: все начинают с нуля — самое время занять первые места в Лиге.' },
  { id: 'kalinov', name: 'Калинов мост', region: 'Вся Россия', tz: 'UTC+3', color: '#f43f5e', glyph: 'bridge', load: 0.97, online: 24100, ping: 40,
    about: 'Сервер для опытных Ловчих: сильные духи и суровые Разломы.' },
];

const Realms = {
  KEY: 'duholov-realm',
  current() {
    let id = null;
    try { id = localStorage.getItem(this.KEY); } catch (e) {}
    return REALMS.find(r => r.id === id) || REALMS[0];
  },
  save(id) { try { localStorage.setItem(this.KEY, id); } catch (e) {} },
  // заполненность → подпись и цвет; «Заполнен» — новые Ловчие не принимаются
  load(r) {
    return r.load >= 0.95 ? { t: 'Заполнен', c: '#fb7185', k: 'full' } : r.load >= 0.75 ? { t: 'Людно', c: '#fb923c', k: 'busy' }
      : r.load >= 0.4 ? { t: 'Оживлённо', c: '#fde047', k: 'mid' } : { t: 'Свободно', c: '#4ade80', k: 'free' };
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
  fmtOnline(n) { return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',')} тыс.` : String(n); },

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

  // кнопка на экране входа
  chip() {
    const r = this.current(), L = this.load(r);
    return `<button class="realm-chip" aria-label="Сервер: ${U.esc(r.name)}. Сменить">${this.crest(r, 30)}` +
      `<span class="rc-main"><small>Сервер</small><b>${U.esc(r.name)}</b></span><i class="rc-dot" style="--c:${L.c}"></i><svg class="rc-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  },
  // крупная витрина сервера — в середине стартового экрана
  banner() {
    const r = this.current(), L = this.load(r), bars = this.bars(r.ping);
    return `<button class="realm-hero" style="--rc:${r.color};--lc:${L.c}" aria-label="Сервер: ${U.esc(r.name)}. Сменить">
      <span class="rh-crest"><i class="rh-ring"></i>${this.crest(r, 92)}</span>
      <small>Твой сервер</small><b>${U.esc(r.name)}</b>
      <span class="rh-meta">${U.esc(r.region)} · <i class="rc-dot" style="--c:${L.c}"></i> ${L.t} · <span class="rl-sig">${[1, 2, 3, 4].map(i => `<i class="${i <= bars ? 'on' : ''}" style="height:${2 + i * 2.5}px"></i>`).join('')}</span> ${r.ping} мс</span>
      <span class="rh-change">Сменить сервер <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button>`;
  },
  bind(root) {
    const b = root.querySelector('.realm-chip, .realm-hero');
    if (b) b.onclick = () => this.open(() => { b.outerHTML = b.classList.contains('realm-hero') ? this.banner() : this.chip(); this.bind(root); });
  },

  card(r, sel, i = 0) {
    const L = this.load(r), bars = this.bars(r.ping), me = this.hero(r), fr = this.friends(r);
    const tags = (r.tags || []).map(t => t === 'rec' ? '<span class="rl-tag rec">✦ Рекомендуем</span>' : t === 'new' ? '<span class="rl-tag new">Новый</span>' : '').join('') +
      (L.k === 'full' ? '<span class="rl-tag full">Заполнен</span>' : '');
    const seg = Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.ceil(r.load * 5) ? 'on' : ''}"></i>`).join('');
    return `<button class="rl-card ${sel ? 'on' : ''} ${L.k === 'full' && !me ? 'closed' : ''}" data-id="${r.id}" style="--rc:${r.color};--lc:${L.c};animation-delay:${i * 0.045}s" role="radio" aria-checked="${sel}">
      <div class="rl-top">${this.crest(r)}
        <div class="rl-head"><b>${U.esc(r.name)}</b><small>${U.esc(r.region)} · ${r.tz}</small>${tags ? `<div class="rl-tags">${tags}</div>` : ''}</div>
        <span class="rl-radio" aria-hidden="true"></span></div>
      <p class="rl-about">${U.esc(r.about)}</p>
      ${me ? `<div class="rl-me"><span class="rl-ava">${Art.avatar ? Art.avatar(S.d.look) : ''}</span><span>Твой Ловчий: <b>${U.esc(me.name)}</b> · ${me.lvl} ур.</span></div>` : ''}
      <div class="rl-stats">
        <span class="rl-load" title="Заполненность"><span class="rl-seg">${seg}</span><em>${L.t}</em></span>
        <span class="rl-ping" title="Отклик"><span class="rl-sig">${[1, 2, 3, 4].map(i => `<i class="${i <= bars ? 'on' : ''}" style="height:${3 + i * 3}px"></i>`).join('')}</span>${r.ping} мс</span>
        <span class="rl-online">${this.fmtOnline(r.online)} Ловчих${fr ? ` · <b>${fr} ${U.plural(fr, 'друг', 'друга', 'друзей')}</b>` : ''}</span>
      </div></button>`;
  },

  // шторка выбора сервера
  open(onPick) {
    let sel = this.current().id, filter = 'all';
    const wrap = U.el(`<div class="rl-wrap" role="dialog" aria-label="Выбор сервера"><div class="rl-sheet">
      <div class="rl-grip"></div>
      <div class="rl-title"><h3>Выбор сервера</h3><button class="rl-x" aria-label="Закрыть">${UI.I.close}</button></div>
      <p class="rl-sub">Каждый сервер — своё княжество Нави: свои Ловчие, Лига и Ордена. Прогресс на каждом сервере свой.</p>
      <div class="seg rl-filter"><button data-f="all" class="on">Все</button><button data-f="rec">Советуем</button><button data-f="mine">Мои</button><button data-f="near">Ближе</button></div>
      <div class="rl-list" role="radiogroup"></div>
      <div class="rl-foot"></div>
    </div></div>`);
    const list = wrap.querySelector('.rl-list'), foot = wrap.querySelector('.rl-foot');
    const render = () => {
      let rs = REALMS.slice();
      if (filter === 'rec') rs = rs.filter(r => (r.tags || []).length || this.load(r).k === 'free');
      if (filter === 'mine') rs = rs.filter(r => this.hero(r));
      if (filter === 'near') rs.sort((a, b) => a.ping - b.ping);
      list.innerHTML = rs.length ? rs.map((r, i) => this.card(r, r.id === sel, i)).join('')
        : '<div class="rl-empty">Здесь пока пусто — выбери сервер во вкладке «Все»</div>';
      const r = REALMS.find(x => x.id === sel), same = sel === this.current().id;
      foot.innerHTML = UI.rune(same ? 'Остаться здесь' : `Перейти в ${U.esc(r.name)}`, 'rl-go') +
        `<p class="rl-note">${this.hero(r) ? 'Твой Ловчий ждёт тебя здесь.' : 'На этом сервере ты начнёшь новый путь Ловчего.'}</p>`;
    };
    const close = () => { if (!wrap.isConnected) return; UI.popLayer(close); wrap.classList.add('out'); setTimeout(() => wrap.remove(), 220); };
    wrap.onclick = e => {
      if (e.target === wrap || e.target.closest('.rl-x')) return close();
      const f = e.target.closest('.rl-filter button');
      if (f) { filter = f.dataset.f; wrap.querySelectorAll('.rl-filter button').forEach(x => x.classList.toggle('on', x === f)); render(); return; }
      const c = e.target.closest('.rl-card');
      if (c) {
        const r = REALMS.find(x => x.id === c.dataset.id);
        if (c.classList.contains('closed')) { UI.toast(`«${r.name}» заполнен: новых Ловчих пока не принимают`); return; }
        sel = r.id; Sfx.play && Sfx.play('tap'); render(); return;
      }
      if (e.target.closest('.rl-go')) {
        const r = REALMS.find(x => x.id === sel);
        if (sel !== this.current().id) { this.save(sel); UI.toast(`Сервер: ${r.name}`); if (onPick) onPick(r); }
        close();
      }
    };
    document.body.appendChild(wrap);
    UI.pushLayer(close);
    render();
  },
};
