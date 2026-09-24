'use strict';
/* 4.0: «Посвящение в Ловчие» — большое обучение с наставником Велимиром (шаги — TUT в data.js).
   Пропустить нельзя: шаг хранит сервер (S.d.tut), после перезахода игра продолжает с того же места.
   Сцены (talk) — полноэкранные диалоги; остальные шаги — подсказка-наставник над картой. Разделы меню
   открываются по ходу обучения. Шаги засчитывает сервер: поимка, родник и усиление — сам, сцены и разделы —
   по действию tutNext строго по порядку. */

const Tut = {
  // какой раздел меню открывается на каком шаге (до него — замок), и какой раздел подсветить
  TILE_STEP: { spirits: 'spirits', book: 'dex', bag: 'bag', egg: 'cocoons', scroll: 'quests', path: 'path' },
  UI_TILE: { spirits: 'spirits', dex: 'book', bag: 'bag', cocoons: 'egg', quests: 'scroll', path: 'path' },
  pos: null,   // где стоит учебный дух (только на этом телефоне)
  shown: 0, ch: -1,

  step() { return (S.d && S.d.tut) || 0; },
  at() { return S.tutAt(); },
  idx(id) { return TUT.findIndex(s => s.id === id) + 1; },
  init() {
    this.started = true;
    Bus.on('tutChapter', e => this.chapterDone(e));
    this.shown = -1;
    this.sync(true);
  },

  // Сервер перевёл обучение на новый шаг (или игра только что запустилась)
  sync(first) {
    if (!this.started) return;
    const s = this.step();
    if (s === this.shown) return;
    this.shown = s;
    if (!s) { this.close(); this.refreshTiles(); return; }
    this.refreshTiles();
    const st = this.at(), newCh = st.ch !== this.ch;
    this.ch = st.ch;
    if (!first) Sfx.play('spin');
    const go = () => {
      if (st.kind === 'talk') { this.hideCoach(); this.scene(st); return; }
      this.coach(st);
      MapView.refresh(true);
      // на шаге «родник» Следопыт сам показывает дорогу к ближайшему
      if (st.kind === 'spring') setTimeout(() => { const n = MapView.nearest('spring'); if (n) MapView.track(n); }, 800);
    };
    // новая глава — сначала её заставка (кроме глав, что начинаются со сцены: там заставка внутри сцены)
    if (newCh && st.kind !== 'talk') this.titleCard(st.ch, go); else go();
  },

  /* ---------- подсказка-наставник над картой ---------- */
  coach(st) {
    if (!this.el) {
      this.el = U.el(`<div id="coach" class="tut-coach"><div class="coach-ava">${Art.guardian('#15803d')}</div>
        <div class="coach-main"><div class="coach-top"><b>Велимир</b><span class="coach-ch"></span></div><div class="coach-text"></div>
        <div class="coach-bar"><i></i></div></div></div>`);
      document.body.appendChild(this.el);
    }
    const n = this.step();
    this.el.querySelector('.coach-ch').textContent = `Посвящение · ${n}/${TUT.length}`;
    this.el.querySelector('.coach-bar i').style.width = ((n - 1) / TUT.length * 100) + '%';
    this.el.querySelector('.coach-text').innerHTML = st.hint;
    this.el.classList.remove('bump'); void this.el.offsetWidth; this.el.classList.add('bump');
    this.show();
  },
  show() {
    const st = this.at();
    if (this.el) this.el.classList.toggle('hidden', !st || st.kind === 'talk' || UI.blocking());
    U.$('#menuBtn').classList.toggle('tut-pulse', !!st && st.kind === 'ui' && st.id === 'menu'
      || !!st && st.kind === 'ui' && !!this.UI_TILE[st.id]);
  },
  hideCoach() { if (this.el) this.el.classList.add('hidden'); U.$('#menuBtn').classList.remove('tut-pulse'); },

  /* ---------- сцена с Велимиром ---------- */
  scene(st) {
    if (this.sc) this.sc.remove();
    const first = TUT.find(s => s.ch === st.ch) === st; // сцена открывает главу — сначала заставка главы
    const root = this.sc = U.el(`<div class="tut-scene">
      <div class="ts-sky"><i class="ts-moon"></i>${'<i class="ts-star"></i>'.repeat(14)}</div>
      <svg class="ts-city" viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M0 120V80h20V60h18v20h14V44h22v36h12V66h20v14h16V30l12-10 12 10v50h18V56h26v24h10V70h22v10h14V48h20v32h16V62h24v18h12V74h16v46Z" fill="#0a0616"/>
        <g fill="#fde047" opacity=".7"><rect x="60" y="52" width="4" height="5"/><rect x="152" y="40" width="4" height="5"/><rect x="160" y="56" width="4" height="5"/><rect x="232" y="64" width="4" height="5"/><rect x="306" y="58" width="4" height="5"/></g></svg>
      <div class="ts-chap"></div>
      <div class="ts-stage"><div class="ts-mentor">${Art.guardian('#15803d')}</div><div class="ts-me">${Art.avatar(S.d.look)}</div></div>
      <div class="ts-box"><div class="ts-who"></div><div class="ts-line"></div><div class="ts-foot"><span class="ts-prog"></span><button class="btn primary ts-next">Дальше</button></div></div>
    </div>`);
    document.body.appendChild(root);
    UI.pushLayer(this._noBack = () => {}); // «Назад» сцену не закрывает — обучение не пропустить
    const box = root.querySelector('.ts-box'), who = root.querySelector('.ts-who'), line = root.querySelector('.ts-line'), btn = root.querySelector('.ts-next');
    let i = -1, typing = null;
    const say = () => {
      const [w, text] = st.lines[i];
      root.dataset.who = w;
      who.textContent = w === 'v' ? 'Велимир' : w === 'you' ? (S.d.name || 'Ты') : '';
      root.querySelector('.ts-prog').textContent = `${i + 1} / ${st.lines.length}`;
      btn.textContent = i === st.lines.length - 1 ? 'Продолжить' : 'Дальше';
      // печать по буквам (теги — целиком); касание — допечатать сразу
      const parts = text.split(/(<[^>]+>)/).filter(Boolean);
      let out = '', p = 0, c = 0;
      clearInterval(typing);
      const calm = document.documentElement.classList.contains('calm') || (Cfg.s && Cfg.s.calm);
      if (calm) { line.innerHTML = text; typing = null; return; }
      typing = setInterval(() => {
        if (p >= parts.length) { clearInterval(typing); typing = null; return; }
        const part = parts[p];
        if (part[0] === '<') { out += part; p++; c = 0; }
        else { out += part[c++]; if (c >= part.length) { p++; c = 0; } }
        line.innerHTML = out;
      }, 22);
      line._full = text;
    };
    const next = async () => {
      if (typing) { clearInterval(typing); typing = null; line.innerHTML = line._full; return; }
      if (i < st.lines.length - 1) { i++; Sfx.play('tap'); say(); return; }
      btn.disabled = true;
      const r = await Game.try('tutNext', { id: st.id });
      if (!r) { btn.disabled = false; return; }
      this.closeScene();
      this.sync();
    };
    btn.onclick = e => { e.stopPropagation(); next(); };
    box.onclick = () => next();
    const start = () => { root.classList.add('talk'); i = 0; say(); };
    if (first) this.titleCard(st.ch, start, root.querySelector('.ts-chap')); else start();
  },
  closeScene() {
    if (!this.sc) return;
    const el = this.sc; this.sc = null;
    UI.popLayer(this._noBack);
    el.classList.add('out'); setTimeout(() => el.remove(), 350);
  },

  /* ---------- заставка главы ---------- */
  titleCard(ch, done, into) {
    const c = TUT_CHAPTERS[ch];
    const el = U.el(`<div class="tut-title"><small>Посвящение в Ловчие</small><b>Глава ${ch + 1}</b><h2>${c.title}</h2><i></i></div>`);
    (into || document.body).appendChild(el);
    Sfx.play('spin');
    setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); done(); }, 450); }, 1900);
  },

  /* ---------- награды за главы и финал ---------- */
  chapterDone({ ch, got, done }) {
    const list = got.map(x => `<div class="lvl-rw-i">${x.label} <b>+${U.fmtNum(x.n)}</b></div>`).join('');
    if (!done) {
      Sfx.play('levelup');
      UI.toast(`Глава ${ch + 1} «${TUT_CHAPTERS[ch].title}» пройдена! ${got.map(x => `${x.label} +${x.n}`).join(', ')}`, 'good');
      return;
    }
    // Финал: клятва дана — посвящение пройдено
    Sfx.play('levelup');
    const root = U.el(`<div class="tut-final"><div class="tf-rays"></div>
      <div class="tf-charm">${Art.charm('charm3')}</div>
      <small>Орден Оберега</small><h2>Посвящение пройдено!</h2><p>Отныне ты — <b>Ловчий Ордена</b>. Духи Нави ждут на улицах твоего города.</p>
      <div class="tf-got">${list}</div><button class="btn primary wide">В путь!</button></div>`);
    document.body.appendChild(root);
    root.querySelector('.btn').onclick = () => { Sfx.play('tap'); root.classList.add('out'); setTimeout(() => root.remove(), 400); };
  },

  close() {
    U.$('#menuBtn').classList.remove('tut-pulse');
    if (this.el) { this.el.remove(); this.el = null; }
    this.closeScene();
    MapView.refresh(true);
  },

  /* ---------- разделы меню по ходу обучения ---------- */
  // Меню открывается с шага «открой меню»
  menuLock() {
    const n = this.step();
    return n && n < this.idx('menu') ? 'Сначала закончи с Велимиром: меню откроется чуть позже.' : null;
  },
  // Раздел меню: замок до своего шага обучения (настройки и Ловчий — всегда)
  tileLock(key) {
    const n = this.step();
    if (!n || key === 'gear' || key === 'user') return null;
    const need = this.TILE_STEP[key];
    if (need && n >= this.idx(need)) return null;
    return need ? 'Откроется по ходу обучения — Велимир подскажет' : 'Откроется после посвящения в Ловчие';
  },
  tileTarget(key) { const st = this.at(); return !!st && st.kind === 'ui' && this.UI_TILE[st.id] === key; },
  // открытое меню: обновить замки и подсветку после перехода на новый шаг
  refreshTiles() {
    U.$$('.menu-grid .tile[data-k]').forEach(t => {
      const lock = this.tileLock(t.dataset.k);
      t.classList.toggle('locked', !!lock); t.classList.toggle('tut-target', this.tileTarget(t.dataset.k));
      const li = t.querySelector('i.lock'); if (!lock && li) li.remove();
    });
  },
  // Игрок открыл раздел: если это текущий шаг — засчитать
  async ui(id) {
    const st = this.at();
    if (!st || st.kind !== 'ui' || st.id !== id || this._uiBusy) return;
    this._uiBusy = true;
    try { await Game.act('tutNext', { id }); } catch (e) {} finally { this._uiBusy = false; }
  },

  // Учебный дух держится в ~25 м от игрока, пока его не поймают (на шагах «поймай»)
  spawn(lat, lng) {
    const st = this.at();
    if (!st || st.kind !== 'catch') return null;
    let p = this.pos;
    if (!p || p.n !== this.step() || U.dist(lat, lng, p[0], p[1]) > 60) {
      const a = this.step() * 1.9;
      p = this.pos = [lat + Math.sin(a) * 22 / 111320, lng + Math.cos(a) * 22 / (111320 * Math.cos(lat * Math.PI / 180))];
      p.n = this.step();
    }
    return { type: 'spirit', id: 'tut' + this.step(), tut: true, sid: st.sid, lvl: 2, lat: p[0], lng: p[1], d: U.dist(lat, lng, p[0], p[1]), expires: U.now() + 3600000 };
  },
};
