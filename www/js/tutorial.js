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

  // Сервер перевёл обучение на новый шаг (или игра только что запустилась).
  // Новый шаг показывается не мгновенно: сначала игрок видит итог действия (поимку, родник, усиление),
  // а сцены и заставки глав ждут, пока закроется экран встречи или боя.
  sync(first) {
    if (!this.started) return;
    const s = this.step();
    if (s === this.shown) return;
    this.shown = s; this.opened = null;
    if (!s) { this.close(); this.refreshTiles(); return; }
    this.refreshTiles();
    const st = this.at(), newCh = st.ch !== this.ch;
    this.ch = st.ch;
    const go = () => {
      if (st.kind === 'talk') { this.hideCoach(); this.scene(st); return; }
      this.coach(st);
      MapView.refresh(true);
      // на шаге «родник» Следопыт сам показывает дорогу к ближайшему
      if (st.kind === 'spring') setTimeout(() => { const n = MapView.nearest('spring'); if (n) MapView.track(n); }, 800);
    };
    const run = () => {
      if (this.step() !== s) return; // пока ждали, шаг уже сменился — покажет следующий вызов
      this._pending = false;
      if (!first) Sfx.play('spin');
      // новая глава — сначала её заставка (кроме глав, что начинаются со сцены: там заставка внутри сцены)
      if (newCh && st.kind !== 'talk') this.titleCard(st.ch, go); else go();
    };
    if (first) { run(); return; }
    this._pending = true; this.hideCoach();
    const free = () => !(Encounter.st || (typeof Raid !== 'undefined' && Raid.st) || (typeof Duel !== 'undefined' && Duel.st) || document.querySelector('.enc, .tut-title'));
    const when = () => free() ? run() : setTimeout(when, 400);
    setTimeout(when, 1100);
  },

  /* ---------- наставник поверх интерфейса: подсветка цели и умное место ---------- */
  // Что подсветить на шаге — первое видимое по списку. Если открыт экран, где цели нет, — его кнопка «Назад».
  TARGET: {
    catch1: ['.tut-ring'], catch2: ['.tut-ring'],
    menu: ['#menuBtn'],
    spirits: ['.tile[data-k="spirits"]', '#menuBtn'],
    card: ['.screen .grid.cards .card', '.tile[data-k="spirits"]', '#menuBtn'],
    power: ['.screen .act-power', '.screen .grid.cards .card', '.tile[data-k="spirits"]', '#menuBtn'],
    dex: ['.tile[data-k="book"]', '#menuBtn'],
    spring: ['#tracker', '.mk-spring'],
    bag: ['.tile[data-k="bag"]', '#menuBtn'],
    cocoons: ['.tile[data-k="egg"]', '#menuBtn'],
    quests: ['.tile[data-k="scroll"]', '#menuBtn'],
    path: ['.tile[data-k="path"]', '#menuBtn'],
  },
  // важное, что наставник не должен закрывать (кроме самой цели)
  KEEP: ['.hud-top', '#tracker', '#storyPill', '#menuBtn', '#nearbyBtn', '#recenterBtn', '.sheet', '.screen-head', '.screen .toolbar', '.screen .seg', '.screen .chips', '.screen .tabs', '.menu-grid .tile', '.sheet-foot', '.menu-dots'],
  coach(st) {
    if (!this.el) {
      this.el = U.el(`<div id="coach" class="tut-coach pos-bottom"><div class="coach-ava">${Art.asImg(CutArt.velimir(true), 'velimir-mini')}</div>
        <div class="coach-main"><div class="coach-top"><b>Велимир</b><span class="coach-ch"></span></div><div class="coach-text"></div>
        <div class="coach-bar"><i></i></div></div></div>`);
      this.ring = U.el('<div id="tutRing" class="hidden"><i></i></div>');
      document.body.append(this.ring, this.el);
      this.el.addEventListener('click', e => { if (e.target.closest('.coach-ok')) this.gotIt(); });
      this.loop = setInterval(() => this.track(), 300);
      addEventListener('resize', this._rs = () => this.track());
    }
    const n = this.step();
    this.el.querySelector('.coach-ch').textContent = `Посвящение · ${n}/${TUT.length}`;
    this.el.querySelector('.coach-bar i').style.width = ((n - 1) / TUT.length * 100) + '%';
    // открыл нужный раздел — объяснение экрана и «Понятно» (шаг засчитывается только по кнопке)
    const info = st.kind === 'ui' && this.opened === st.id;
    this._hint = info ? `${st.info}<button class="btn primary coach-ok">Понятно ›</button>` : st.hint; this._back = null;
    this.el.querySelector('.coach-text').innerHTML = this._hint;
    this.el.classList.toggle('info', info);
    this.el.classList.remove('bump'); void this.el.offsetWidth; this.el.classList.add('bump');
    this.track();
  },
  vis(e) { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; },
  findTarget(st) {
    const top = U.$$('.screen').filter(s => !s.classList.contains('out')).pop(), sheet = U.$$('.sheet-wrap').filter(s => !s.classList.contains('out')).pop();
    for (const sel of this.TARGET[st.id] || []) {
      const el = U.$$(sel).find(e => this.vis(e));
      if (!el) continue;
      if (sheet && !sheet.contains(el)) continue;            // под открытым меню не нажать
      if (!sheet && top && !top.contains(el)) continue;      // под открытым экраном не нажать
      return { el };
    }
    if (sheet) return null;                                  // меню открыто, а цель не в нём — закрыть меню подскажет текст
    if (top) { const b = top.querySelector('.back'); return b ? { el: b, back: true } : null; }
    return null;
  },
  // Раз в 300 мс: где цель, куда поставить наставника, чтобы не закрыть ни её, ни важное
  track() {
    if (!this.el) return;
    const st = this.at(), busy = !st || this._pending || st.kind === 'talk' || this.sc || Encounter.st || (typeof Raid !== 'undefined' && Raid.st) || (typeof Duel !== 'undefined' && Duel.st)
      || U.$$('.modal-wrap').some(m => !m.classList.contains('out') && !m.classList.contains('sheet-wrap')) || document.querySelector('.onb, .tut-title, .tut-final, .trl');
    this.el.classList.toggle('hidden', !!busy);
    U.$('#menuBtn').classList.remove('tut-pulse');
    if (busy) { this.ring.classList.add('hidden'); return; }
    const t = st.kind === 'ui' && this.opened === st.id ? null : this.findTarget(st); // объясняет экран — подсвечивать нечего
    // текст: если цель — «Назад», сначала вернуться
    const back = !!(t && t.back);
    if (back !== this._back) {
      this._back = back;
      this.el.querySelector('.coach-text').innerHTML = back ? `${this._hint}<small class="coach-back">Сначала вернись назад — кнопка подсвечена.</small>` : this._hint;
    }
    let tr = null;
    if (t && t.el) {
      tr = t.el.getBoundingClientRect();
      const pad = 6, R = this.ring.style, round = t.el.matches('#menuBtn, .tut-ring, .btn-round, .back');
      R.left = (tr.left - pad) + 'px'; R.top = (tr.top - pad) + 'px'; R.width = (tr.width + pad * 2) + 'px'; R.height = (tr.height + pad * 2) + 'px';
      this.ring.classList.toggle('round', round);
      this.ring.classList.remove('hidden');
    } else this.ring.classList.add('hidden');
    // место: сверху или снизу — где меньше перекрытий с целью (втройне важна) и важными элементами
    // учитываем только видимое сверху: открытый экран или меню закрывают всё, что под ними
    const layer = U.$$('.sheet-wrap').filter(s => !s.classList.contains('out')).pop() || U.$$('.screen').filter(s => !s.classList.contains('out')).pop();
    const keep = this.KEEP.flatMap(s => U.$$(s)).filter(e => this.vis(e) && (!layer || layer.contains(e)) && (!t || !t.el || !e.contains(t.el))).map(e => [e.getBoundingClientRect(), 1]);
    if (tr) keep.push([tr, 3]);
    const cost = pos => {
      this.el.classList.remove('pos-top', 'pos-bottom'); this.el.classList.add('pos-' + pos);
      const c = this.el.getBoundingClientRect();
      return keep.reduce((a, [r, w]) => a + w * Math.max(0, Math.min(c.right, r.right) - Math.max(c.left, r.left)) * Math.max(0, Math.min(c.bottom, r.bottom) - Math.max(c.top, r.top)), 0);
    };
    const cur = this._pos || 'bottom', other = cur === 'top' ? 'bottom' : 'top';
    const a = cost(cur), b = cost(other), pos = b + 500 < a ? other : cur; // без дёрганья: меняем место, только если заметно лучше
    this.el.classList.remove('pos-top', 'pos-bottom'); this.el.classList.add('pos-' + pos);
    this.el.classList.toggle('in-screen', !!U.$$('.screen').find(s => !s.classList.contains('out')));
    this._pos = pos;
  },
  show() { this.track(); },
  hideCoach() { if (this.el) this.el.classList.add('hidden'); if (this.ring) this.ring.classList.add('hidden'); U.$('#menuBtn').classList.remove('tut-pulse'); },

  /* ---------- сцена с Велимиром ---------- */
  scene(st) {
    if (this.sc) this.sc.remove();
    const first = TUT.find(s => s.ch === st.ch) === st; // сцена открывает главу — сначала заставка главы
    // 4.6: кинокадр — ночной двор, сияние Нави, Велимир и ты; реплики в лаковой шкатулке
    const root = this.sc = U.el(`<div class="tut-scene">
      <div class="ts-bg"><i class="ts-aur a1"></i><i class="ts-aur a2"></i><i class="ts-moon"></i>${'<i class="ts-star"></i>'.repeat(14)}${CutArt.yard()}<i class="ts-mist"></i></div>
      <div class="ts-film"><i></i><i></i></div>
      <div class="ts-chap"></div>
      <div class="ts-stage"><div class="ts-mentor"><i class="ts-halo"></i>${Art.asImg(CutArt.velimir(), 'velimir')}</div><div class="ts-me"><div class="ts-hero">${Art.asImg(CutArt.hero(S.d.look))}</div><span class="ts-me-name">${U.esc(S.d.name || 'Ты')}</span></div></div>
      <div class="ts-box"><div class="ts-who"></div><div class="ts-line"></div><div class="ts-foot"><span class="ts-prog"></span><button class="btn primary small ts-next">Дальше</button></div></div>
    </div>`);
    document.body.appendChild(root);
    UI.pushLayer(this._noBack = () => {}); // «Назад» сцену не закрывает — обучение не пропустить
    const box = root.querySelector('.ts-box'), who = root.querySelector('.ts-who'), line = root.querySelector('.ts-line'), btn = root.querySelector('.ts-next');
    let i = -1, typing = null;
    const say = () => {
      const [w, text] = st.lines[i];
      root.dataset.who = w;
      who.textContent = w === 'v' ? 'Велимир' : w === 'you' ? (S.d.name || 'Ты') : '';
      root.querySelector('.ts-prog').innerHTML = st.lines.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'on' : ''}"></i>`).join('');
      btn.textContent = i === st.lines.length - 1 ? 'Продолжить' : 'Дальше';
      line.classList.remove('in'); void line.offsetWidth; line.classList.add('in');
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
    const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
    const el = U.el(`<div class="tut-title"><div class="tt-ring"></div><small>Посвящение в Ловчие</small><b>Глава ${ROMAN[ch] || ch + 1}</b><h2>${c.title}</h2><i></i></div>`);
    (into || document.body).appendChild(el);
    Sfx.play('spin');
    setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); done(); }, 450); }, 2300);
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
      <div class="tf-me"><div class="tf-ring"></div><div class="ts-me-ring">${Art.avatar(S.d.look)}</div></div>
      <small>Орден Оберега</small><h2>Посвящение пройдено!</h2><p>Отныне ты — <b>Ловчий Ордена</b>. Духи Нави ждут на улицах твоего города.</p>
      <div class="tf-got">${list}</div>${UI.rune('В путь!', 'tf-go')}</div>`);
    document.body.appendChild(root);
    root.querySelector('.tf-go').onclick = () => { Sfx.play('tap'); root.classList.add('out'); setTimeout(() => root.remove(), 400); };
  },

  close() {
    U.$('#menuBtn').classList.remove('tut-pulse');
    if (this.el) { this.el.remove(); this.el = null; clearInterval(this.loop); removeEventListener('resize', this._rs); }
    if (this.ring) { this.ring.remove(); this.ring = null; }
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
  // Игрок открыл раздел текущего шага: Велимир объясняет, что это за экран; дальше — только по «Понятно»
  ui(id) {
    const st = this.at();
    if (!st || st.kind !== 'ui' || st.id !== id || this.opened === id) return;
    this.opened = id;
    this.coach(st);
  },
  async gotIt() {
    const st = this.at();
    if (!st || st.kind !== 'ui' || this.opened !== st.id || this._uiBusy) return;
    this._uiBusy = true;
    const b = this.el && this.el.querySelector('.coach-ok'); if (b) b.disabled = true;
    try { Sfx.play('tap'); await Game.act('tutNext', { id: st.id }); }
    catch (e) { UI.toast(U.esc(e.message)); if (b) b.disabled = false; }
    finally { this._uiBusy = false; }
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
