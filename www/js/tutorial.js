'use strict';
/* 4.0: обучение новичка (шаги — TUT в data.js). 4.24: без сцен, заставок и наставника — только подсказка над картой
   с подсветкой нужной кнопки. Пропустить нельзя: шаг хранит сервер (S.d.tut), после перезахода игра продолжает
   с того же места. Разделы меню открываются по ходу обучения. Шаги засчитывает сервер: поимка, родник и усиление —
   сам, разделы — по действию tutNext строго по порядку. */

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
    const st = this.at();
    const go = () => {
      this.coach(st);
      MapView.refresh(true);
      // на шаге «родник» Следопыт сам показывает дорогу к ближайшему
      if (st.kind === 'spring') setTimeout(() => { const n = MapView.nearest('spring'); if (n) MapView.track(n); }, 800);
    };
    const run = () => {
      if (this.step() !== s) return; // пока ждали, шаг уже сменился — покажет следующий вызов
      this._pending = false;
      if (!first) Sfx.play('spin');
      go();
    };
    if (first) { run(); return; }
    this._pending = true; this.hideCoach();
    const free = () => !(Encounter.st || (typeof Raid !== 'undefined' && Raid.st) || (typeof Duel !== 'undefined' && Duel.st) || document.querySelector('.enc, .tut-final'));
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
    spring: ['.screen .spring-go:not([disabled])', '#tracker', '.mk-spring'], // 4.7.3: на экране родника — кнопка «Зачерпнуть силу»
    bag: ['.tile[data-k="bag"]', '#menuBtn'],
    cocoons: ['.tile[data-k="egg"]', '#menuBtn'],
    quests: ['.tile[data-k="scroll"]', '#menuBtn'],
    path: ['.tile[data-k="path"]', '#menuBtn'],
  },
  // важное, что наставник не должен закрывать (кроме самой цели)
  KEEP: ['.hud-top', '#tracker', '#menuBtn', '#nearbyBtn', '#recenterBtn', '.sheet', '.screen-head', '.screen .toolbar', '.screen .seg', '.screen .chips', '.screen .tabs', '.menu-grid .tile', '.menu-dots', '.screen .spring-disc'],
  coach(st) {
    if (!this.el) {
      this.el = U.el(`<div id="coach" class="tut-coach pos-bottom"><div class="coach-ava">${UI.menuIcon('orderbook')}</div>
        <div class="coach-main"><div class="coach-top"><b>${ru`Подсказка`}</b><span class="coach-ch"></span></div><div class="coach-text"></div>
        <div class="coach-bar"><i></i></div></div></div>`);
      // 4.7: подсветка — затемнение вокруг цели, золотая рамка с уголками, волна и указатель
      this.ring = U.el('<div id="tutRing" class="hidden"><b class="tr-g"></b><b class="tr-w"></b><b class="tr-f"></b><b class="tr-r"></b><b class="tr-c c1"></b><b class="tr-c c2"></b><b class="tr-c c3"></b><b class="tr-c c4"></b><i class="tr-p"></i></div>');
      document.body.append(this.ring, this.el);
      this.el.addEventListener('click', () => { if (this.el.classList.contains('info')) this.gotIt(); }); // «Понятно» — касанием в любом месте плашки
      this.loop = setInterval(() => this.track(), 300);
      addEventListener('resize', this._rs = () => this.track());
    }
    const n = this.step();
    this.el.querySelector('.coach-ch').textContent = ru`Обучение · ${n}/${TUT.length}`;
    this.el.querySelector('.coach-bar i').style.width = ((n - 1) / TUT.length * 100) + '%';
    // открыл нужный раздел — объяснение экрана и «Понятно» (шаг засчитывается только по кнопке)
    const info = st.kind === 'ui' && this.opened === st.id;
    this._hint = info ? `${st.info}<span class="coach-ok"><span>${ru`Понятно`}</span><i class="tn-a"></i></span>` : st.hint; this._back = null;
    this.el.querySelector('.coach-text').innerHTML = this._hint;
    this.el.classList.toggle('info', info);
    this.el.classList.remove('bump'); void this.el.offsetWidth; this.el.classList.add('bump');
    this.track();
  },
  vis(e) { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; },
  findTarget(st) {
    const top = U.$$('.screen').filter(s => !s.classList.contains('out')).pop(), sheet = U.$$('.sheet-wrap').filter(s => !s.classList.contains('out')).pop();
    // 4.7.1: шаг «родник» — игрок дошёл до родника или перешёл к нему по стрелке: подсвечиваем сам родник, а не стрелку
    if (st.id === 'spring' && !top && !sheet && typeof MapView !== 'undefined') {
      const tr = MapView.tracking, m = tr && MapView.markers.get(tr.id), icon = m && m.getElement();
      const el = icon && (icon.querySelector('.mk-spring') || icon), near = !!U.$('#tracker.near');
      if (el && this.vis(el) && (near || !MapView.follow)) return { el, spring: near ? 'near' : 'seen' };
    }
    for (const sel of this.TARGET[st.id] || []) {
      const el = U.$$(sel).find(e => this.vis(e));
      if (!el) continue;
      if (sheet && !sheet.contains(el)) continue;            // под открытым меню не нажать
      if (!sheet && top && !top.contains(el)) continue;      // под открытым экраном не нажать
      if (st.id === 'spring') return { el, spring: el.matches('.spring-go') ? 'go' : el.matches('.mk-spring') ? (U.$('#tracker.near') ? 'near' : 'seen') : '' };
      return { el };
    }
    if (sheet) return null;                                  // меню открыто, а цель не в нём — закрыть меню подскажет текст
    if (top) { const b = top.querySelector('.back'); return b ? { el: b, back: true } : null; }
    return null;
  },
  // Раз в 300 мс: где цель, куда поставить наставника, чтобы не закрыть ни её, ни важное
  track() {
    if (!this.el) return;
    const st = this.at(), busy = !st || this._pending || Encounter.st || (typeof Raid !== 'undefined' && Raid.st) || (typeof Duel !== 'undefined' && Duel.st)
      || U.$$('.modal-wrap').some(m => !m.classList.contains('out') && !m.classList.contains('sheet-wrap')) || document.querySelector('.onb, .tut-final');
    this.el.classList.toggle('hidden', !!busy);
    U.$('#menuBtn').classList.remove('tut-pulse');
    if (busy) { this.ring.classList.add('hidden'); return; }
    const t = st.kind === 'ui' && this.opened === st.id ? null : this.findTarget(st); // объясняет экран — подсвечивать нечего
    // текст: если цель — «Назад», сначала вернуться; у родника — коснуться его
    const mode = t && t.back ? 'back' : (t && t.spring) || '';
    if (mode !== this._back) {
      this._back = mode;
      this.el.querySelector('.coach-text').innerHTML = mode === 'back' ? `${this._hint}<small class="coach-back">${ru`Сначала вернись назад — кнопка подсвечена.`}</small>`
        : mode === 'near' ? ru`Ты у родника! <b>Коснись его</b> — он подсвечен.`
          : mode === 'seen' ? ru`Вот он, родник — <b>подсвечен</b>. Подойди ближе и коснись его.`
            : mode === 'go' ? ru`Это родник! Смахни по кругу или нажми <b>«Зачерпнуть силу»</b> — он поделится с тобой силой.` : this._hint;
    }
    let tr = null;
    if (t && t.el) {
      tr = t.el.getBoundingClientRect();
      const pad = 6, R = this.ring.style, round = t.el.matches('#menuBtn, .tut-ring, .btn-round, .back');
      R.left = (tr.left - pad) + 'px'; R.top = (tr.top - pad) + 'px'; R.width = (tr.width + pad * 2) + 'px'; R.height = (tr.height + pad * 2) + 'px';
      this.ring.classList.toggle('round', round);
      this.ring.classList.toggle('below', tr.top < 96 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--st')) || 0)); // у верхнего края — указатель снизу
      this.ring.classList.remove('hidden');
    } else this.ring.classList.add('hidden');
    // место: сверху или снизу — где меньше перекрытий с целью (втройне важна) и важными элементами
    // учитываем только видимое сверху: открытый экран или меню закрывают всё, что под ними
    const layer = U.$$('.sheet-wrap').filter(s => !s.classList.contains('out')).pop() || U.$$('.screen').filter(s => !s.classList.contains('out')).pop();
    const keep = this.KEEP.flatMap(s => U.$$(s)).filter(e => this.vis(e) && (!layer || layer.contains(e)) && (!t || !t.el || !e.contains(t.el))).map(e => [e.getBoundingClientRect(), 1]);
    if (tr) {
      keep.push([tr, 3]);
      // указатель над целью (или под ней у верхнего края) тоже не закрываем
      const below = this.ring.classList.contains('below');
      keep.push([{ left: tr.left + tr.width / 2 - 18, right: tr.left + tr.width / 2 + 18, top: below ? tr.bottom : tr.top - 60, bottom: below ? tr.bottom + 60 : tr.top }, 2]);
    }
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

  /* ---------- награды за этапы и финал ---------- */
  chapterDone({ ch, got, done }) {
    const list = got.map(x => `<div class="lvl-rw-i">${I18N.back(x.label)} <b>+${U.fmtNum(x.n)}</b></div>`).join('');
    if (!done) {
      Sfx.play('levelup');
      UI.toast(ru`Обучение: «${TUT_CHAPTERS[ch].title}» — готово! ${got.map(x => `${I18N.back(x.label)} +${x.n}`).join(', ')}`, 'good');
      return;
    }
    // Финал: обучение пройдено
    Sfx.play('levelup');
    const root = U.el(`<div class="tut-final"><div class="tf-rays"></div>
      <div class="tf-me"><div class="tf-ring"></div><div class="ts-me-ring">${Art.avatar(S.d.look)}</div></div>
      <small>${ru`Обучение`}</small><h2>${ru`Обучение пройдено!`}</h2><p>${ru`Теперь ты знаешь главное. Духи ждут по всему свету.`}</p>
      <div class="tf-got">${list}</div>${UI.rune(ru`В путь!`, 'tf-go')}</div>`);
    document.body.appendChild(root);
    root.querySelector('.tf-go').onclick = () => { Sfx.play('tap'); root.classList.add('out'); setTimeout(() => root.remove(), 400); };
  },

  close() {
    U.$('#menuBtn').classList.remove('tut-pulse');
    if (this.el) { this.el.remove(); this.el = null; clearInterval(this.loop); removeEventListener('resize', this._rs); }
    if (this.ring) { this.ring.remove(); this.ring = null; }
    MapView.refresh(true);
  },

  /* ---------- разделы меню по ходу обучения ---------- */
  // Меню открывается с шага «открой меню»
  menuLock() {
    const n = this.step();
    return n && n < this.idx('menu') ? ru`Сначала поймай духов: меню откроется чуть позже.` : null;
  },
  // Раздел меню: замок до своего шага обучения (настройки и Ловчий — всегда)
  tileLock(key) {
    const n = this.step();
    if (!n || key === 'gear' || key === 'user') return null;
    const need = this.TILE_STEP[key];
    if (need && n >= this.idx(need)) return null;
    return need ? ru`Откроется по ходу обучения — подсказка покажет` : ru`Откроется после обучения`;
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
  // Игрок открыл раздел текущего шага: подсказка объясняет, что это за экран; дальше — только по «Понятно»
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
    if (this.el) this.el.classList.add('wait');
    try { Sfx.play('tap'); await Game.act('tutNext', { id: st.id }); }
    catch (e) { UI.toast(U.esc(e.message)); }
    finally { this._uiBusy = false; if (this.el) this.el.classList.remove('wait'); }
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
    return { type: 'spirit', id: 'tut' + this.step(), tut: true, sid: st.sid, lvl: Math.min(2, S.catchLvl()), lat: p[0], lng: p[1], d: U.dist(lat, lng, p[0], p[1]), expires: U.now() + 3600000 };
  },
};
