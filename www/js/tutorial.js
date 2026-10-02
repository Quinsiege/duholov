'use strict';
/* 4.0: обучение новичка (шаги — TUT в data.js). 4.24: без сцен, заставок и наставника — только подсказка над картой
   с подсветкой нужной кнопки. Пропустить нельзя: шаг хранит сервер (S.d.tut), после перезахода игра продолжает
   с того же места. Разделы меню открываются по ходу обучения. Шаги засчитывает сервер: поимка, источник и усиление —
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
    this.guard();
    this.shown = -1;
    this.sync(true);
  },

  // Сервер перевёл обучение на новый шаг (или игра только что запустилась).
  // Новый шаг показывается не мгновенно: сначала игрок видит итог действия (поимку, источник, усиление),
  // а сцены и заставки глав ждут, пока закроется экран встречи или боя.
  sync(first) {
    if (!this.started) return;
    const s = this.step();
    if (s === this.shown) return;
    this.shown = s; this.opened = null;
    if (!s) { this.close(); this.refreshTiles(); return; }
    document.body.classList.add('tut-focus'); // 5.2: фокус обучения — недоступное приглушено (mark)
    this.refreshTiles();
    const st = this.at();
    const go = () => {
      this.coach(st);
      MapView.refresh(true);
      // на шаге «источник» Следопыт сам показывает дорогу к ближайшему
      if (st.kind === 'spring') setTimeout(() => { const n = MapView.nearest('spring'); if (n) MapView.track(n); }, 800);
    };
    const run = () => {
      if (this.step() !== s) return; // пока ждали, шаг уже сменился — покажет следующий вызов
      this._pending = false;
      if (!first) Sfx.play('hint');
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
    spring: ['.screen .spring-go:not([disabled])', '#tracker', '.mk-spring'], // 4.7.3: на экране источника — кнопка «Зачерпнуть силу»
    bag: ['.tile[data-k="bag"]', '#menuBtn'],
    cocoons: ['.tile[data-k="egg"]', '#menuBtn'],
    quests: ['.tile[data-k="scroll"]', '#menuBtn'],
    path: ['.tile[data-k="path"]', '#menuBtn'],
  },
  // важное, что наставник не должен закрывать (кроме самой цели)
  KEEP: ['.hud-top', '#tracker', '#menuBtn', '#nearbyBtn', '#recenterBtn', '.sheet', '.screen-head', '.screen .toolbar', '.screen .seg', '.screen .chips', '.screen .tabs', '.menu-grid .tile', '.rm-h > span', '.menu-dots', '.screen .spring-disc'],
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
    this.el.classList.remove('bump', 'nudge'); void this.el.offsetWidth; this.el.classList.add('bump');
    this.track();
  },
  vis(e) { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; },
  findTarget(st) {
    const top = U.$$('.screen').filter(s => !s.classList.contains('out')).pop(), sheet = U.$$('.sheet-wrap').filter(s => !s.classList.contains('out')).pop();
    // 4.7.1: шаг «источник» — игрок дошёл до источника или перешёл к нему по стрелке: подсвечиваем сам источник, а не стрелку
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
    this.mark();
    const st = this.at(), busy = !st || this._pending || Encounter.st || (typeof Raid !== 'undefined' && Raid.st) || (typeof Duel !== 'undefined' && Duel.st)
      || U.$$('.modal-wrap').some(m => !m.classList.contains('out') && !m.classList.contains('sheet-wrap')) || document.querySelector('.onb, .tut-final');
    this.el.classList.toggle('hidden', !!busy);
    U.$('#menuBtn').classList.remove('tut-pulse');
    if (busy) { this.ring.classList.add('hidden'); return; }
    const t = st.kind === 'ui' && this.opened === st.id ? null : this.findTarget(st); // объясняет экран — подсвечивать нечего
    // текст: если цель — «Назад», сначала вернуться; у источника — коснуться его
    const mode = t && t.back ? 'back' : (t && t.spring) || '';
    if (mode !== this._back) {
      this._back = mode;
      this.el.querySelector('.coach-text').innerHTML = mode === 'back' ? `${this._hint}<small class="coach-back">${ru`Сначала вернись назад — кнопка подсвечена.`}</small>`
        : mode === 'near' ? ru`Ты у источника! <b>Коснись его</b> — он подсвечен.`
          : mode === 'seen' ? ru`Вот он, источник — <b>подсвечен</b>. Подойди ближе и коснись его.`
            : mode === 'go' ? ru`Это источник! Смахни по кругу или нажми <b>«Зачерпнуть силу»</b> — он поделится с тобой силой.` : this._hint;
    }
    let tr = null;
    // 5.2: в открытом меню указатель над разделом короче, подсказка — пузырь у подсвеченного пункта (bubble).
    // Пока значки меню вылетают на места — ни пузыря, ни рамки (UI.menu зовёт track, когда меню встало)
    const inMenu = !!U.$$('.rm-wrap').find(s => !s.classList.contains('out'));
    this.ring.classList.toggle('in-menu', inMenu);
    if (inMenu && UI._rmAt && performance.now() - UI._rmAt < UI.RM_FLY) { this.el.classList.add('hidden'); this.ring.classList.add('hidden'); return; }
    if (t && t.el) {
      tr = t.el.getBoundingClientRect();
      const pad = 6, R = this.ring.style, round = t.el.matches('#menuBtn, .tut-ring, .btn-round, .back');
      R.left = (tr.left - pad) + 'px'; R.top = (tr.top - pad) + 'px'; R.width = (tr.width + pad * 2) + 'px'; R.height = (tr.height + pad * 2) + 'px';
      this.ring.classList.toggle('round', round);
      // у верхнего края — указатель снизу (в меню верхняя безопасная зона — из отступа панели: 10px + зона)
      const mw = inMenu && U.$$('.rm-wrap').find(x => !x.classList.contains('out')), mst = mw ? Math.max(0, parseFloat(getComputedStyle(mw).paddingTop) - 10) : 0;
      this.ring.classList.toggle('below', inMenu ? tr.top < 48 + mst : tr.top < 96 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--st')) || 0));
      this.ring.classList.remove('hidden');
    } else this.ring.classList.add('hidden');
    if (inMenu) { this.bubble(tr); return; }
    if (this.el.classList.contains('bubble')) {
      this.el.classList.remove('bubble', 'b-up', 'b-down');
      ['left', 'top', 'width', 'right', 'bottom', '--ax'].forEach(k => this.el.style.removeProperty(k));
    }
    // место: сверху или снизу — где меньше перекрытий с целью (втройне важна) и важными элементами
    // учитываем только видимое сверху: открытый экран или меню закрывают всё, что под ними
    const layer = U.$$('.sheet-wrap').filter(s => !s.classList.contains('out')).pop() || U.$$('.screen').filter(s => !s.classList.contains('out')).pop();
    const keep = this.KEEP.flatMap(s => U.$$(s)).filter(e => this.vis(e) && (!layer || layer.contains(e)) && (!t || !t.el || !e.contains(t.el))).map(e => [e.getBoundingClientRect(), 1]);    if (tr) {
      keep.push([tr, 3]);
      // указатель над целью (или под ней у верхнего края) тоже не закрываем
      const below = this.ring.classList.contains('below');
      const ph = inMenu ? 48 : 60;
      keep.push([{ left: tr.left + tr.width / 2 - 18, right: tr.left + tr.width / 2 + 18, top: below ? tr.bottom : tr.top - ph, bottom: below ? tr.bottom + ph : tr.top }, 2]);
    }
    // 5.2: снизу подсказка закрыла бы нужную шагу кнопку карты (джойстик на шаге «источник») — встаёт над ней.
    // Поднятая подсказка не закрывает и саму цель (подсвеченный источник прямо над джойстиком) — тогда встаёт над целью
    // вместе с указателем. Подъём входит и в оценку места (cost)
    const lift = pos => {
      this.el.style.removeProperty('bottom');
      if (pos !== 'bottom' || layer) return;
      const c = this.el.getBoundingClientRect();
      const under = ((this.FOCUS[st.id] || {}).hud || []).map(s => U.$(s)).filter(e => e && this.vis(e)).map(e => e.getBoundingClientRect())
        .filter(r => r.top < c.bottom && r.bottom > c.top && r.left < c.right && r.right > c.left);
      if (!under.length) return;
      let bot = Math.min(...under.map(r => r.top)) - 10; // нижний край подсказки
      if (tr) {
        const tTop = tr.top - (this.ring.classList.contains('below') ? 0 : 60); // цель с указателем над ней
        if (tTop < bot && tr.bottom > bot - c.height) bot = Math.min(bot, tTop - 10);
      }
      this.el.style.bottom = Math.round(innerHeight - bot) + 'px';
    };
    const cost = pos => {
      this.el.classList.remove('pos-top', 'pos-bottom'); this.el.classList.add('pos-' + pos); lift(pos);
      const c = this.el.getBoundingClientRect();
      return keep.reduce((a, [r, w]) => a + w * Math.max(0, Math.min(c.right, r.right) - Math.max(c.left, r.left)) * Math.max(0, Math.min(c.bottom, r.bottom) - Math.max(c.top, r.top)), 0);
    };
    const cur = this._pos || 'bottom', other = cur === 'top' ? 'bottom' : 'top';
    const a = cost(cur), b = cost(other), pos = b + 500 < a ? other : cur; // без дёрганья: меняем место, только если заметно лучше
    this.el.classList.remove('pos-top', 'pos-bottom'); this.el.classList.add('pos-' + pos);
    this.el.classList.toggle('in-screen', !!U.$$('.screen').find(s => !s.classList.contains('out')));
    lift(pos);
    this._pos = pos;
  },
  // 5.2: при открытом меню подсказка — пузырь у подсвеченного пункта: со стороны указателя за ним (или с другой стороны,
  // если там не помещается), стрелка — к пункту; без цели (объясняет меню) — над кнопкой меню, стрелка к ней.
  // Меню при этом не двигается; пузырь не выходит за края экрана и за верхнюю/нижнюю безопасную зону
  bubble(tr) {
    const E = this.el, s = E.style, W = innerWidth, H = innerHeight, m = 10, w = Math.min(320, W - 2 * m);
    E.classList.remove('pos-top', 'pos-bottom'); E.classList.add('bubble');
    s.width = w + 'px'; s.right = 'auto'; s.bottom = 'auto';
    const h = E.offsetHeight;
    // безопасные зоны — из отступов панели меню (у неё padding = 10px + верхняя зона, 106px + нижняя)
    const wrap = U.$$('.rm-wrap').find(x => !x.classList.contains('out')), cs = wrap && getComputedStyle(wrap);
    const top0 = m + (cs ? Math.max(0, parseFloat(cs.paddingTop) - 10) : 0), bot0 = H - m - (cs ? Math.max(0, parseFloat(cs.paddingBottom) - 106) : 0);
    let cx, y, up;
    if (tr) {
      cx = tr.left + tr.width / 2;
      const below = this.ring.classList.contains('below'), gA = below ? 14 : 56, gB = below ? 56 : 14; // указатель — между пунктом и пузырём
      const yA = tr.top - gA - h, yB = tr.bottom + gB;
      if (!below && yA >= top0) { y = yA; up = false; }
      else if (yB + h <= bot0) { y = yB; up = true; }
      else if (yA >= top0) { y = yA; up = false; }
      else { y = Math.max(top0, Math.min(bot0 - h, yB)); up = true; }
    } else {
      const o = U.$('#menuBtn').getBoundingClientRect();
      cx = o.left + o.width / 2; y = Math.max(top0, o.top - 14 - h); up = false;
    }
    const x = Math.round(Math.max(m, Math.min(W - m - w, cx - w / 2)));
    s.left = x + 'px'; s.top = Math.round(y) + 'px';
    s.setProperty('--ax', Math.round(Math.max(18, Math.min(w - 18, cx - x))) + 'px');
    E.classList.toggle('b-up', up); E.classList.toggle('b-down', !up);
  },
  show() { this.track(); },
  hideCoach() { if (this.el) this.el.classList.add('hidden'); if (this.ring) this.ring.classList.add('hidden'); U.$('#menuBtn').classList.remove('tut-pulse'); },

  /* ---------- награды за этапы и финал ---------- */
  chapterDone({ ch, got, done }) {
    const list = got.map(x => `<div class="lvl-rw-i">${I18N.back(x.label)} <b>+${U.fmtNum(x.n)}</b></div>`).join('');
    if (!done) {
      Sfx.play('reward_big');
      UI.toast(ru`Обучение: «${TUT_CHAPTERS[ch].title}» — готово! ${got.map(x => `${I18N.back(x.label)} +${x.n}`).join(', ')}`, 'good');
      return;
    }
    // Финал: обучение пройдено. 5.2: экраны последнего шага закрываются — после «В путь!» игрок на карте,
    // а не в «Пути Ловчего», нарисованном до награды за обучение (там был прежний уровень)
    U.$$('.screen').filter(s => !s.classList.contains('out') && s._close).forEach(s => s._close());
    Sfx.play('reward_big');
    const root = U.el(`<div class="tut-final"><div class="tf-rays"></div>
      <div class="tf-me"><div class="tf-ring"></div><div class="ts-me-ring">${Art.avatar(S.d.look)}</div></div>
      <small>${ru`Обучение`}</small><h2>${ru`Обучение пройдено!`}</h2><p>${ru`Теперь ты знаешь главное. Дальше — Кампания: её шаг виден на карте под твоим именем.`}</p>
      <div class="tf-got">${list}</div>${UI.rune(ru`В путь!`, 'tf-go')}</div>`);
    document.body.appendChild(root);
    root.querySelector('.tf-go').onclick = () => { Sfx.play('tap'); root.classList.add('out'); setTimeout(() => root.remove(), 400); };
  },

  close() {
    U.$('#menuBtn').classList.remove('tut-pulse');
    if (this.el) { this.el.remove(); this.el = null; clearInterval(this.loop); removeEventListener('resize', this._rs); }
    if (this.ring) { this.ring.remove(); this.ring = null; }
    document.body.classList.remove('tut-focus'); // 5.2: фокус снят — всё снова доступно, без следов
    U.$$('.tut-off').forEach(e => e.classList.remove('tut-off'));
    MapView.refresh(true);
  },

  /* ---------- 5.2: фокус обучения — пока идёт обучение, доступно только действие текущего шага ---------- */
  // Фокус действует в «зонах игры»: HUD карты (с джойстиком и Следопытом), меню и экраны; маркеры карты — через MapView.tap
  // (entOk). Всё прочее — окна, поимка, знакомство, книга-вступление, Атлас первого места, ошибки, обновление, сама подсказка
  // и «Обучение пройдено» — работает как обычно: в чужие окна без разрешённого действия всё равно не попасть.
  ZONES: '#hud, .rm-wrap, .screen',
  FREE_SCR: '.set-screen, .offer-screen', // экраны, где можно всё: настройки (язык, звук, учётная запись) и документы
  // «К себе», «Назад» и «В сумку» после источника; читать — всегда: вкладки карточки духа («О духе», «Где искать»…),
  // виды и мифологии в Бестиарии (шаг «Бестиарий» сам предлагает «коснись вида, чтобы прочитать о нём»)
  ALWAYS: ['#recenterBtn', '.screen-head .back', '.spr2.taken .spring-go', '.dt-tabs button', '.dex-screen .dex-cell', '.dex-screen [data-myth]'],
  NEVER: ['#tracker .tr-x'],               // стрелку Следопыта на шаге «источник» не снять
  // что можно на шаге: hud — кнопки карты, tile — раздел меню, scr — кнопки внутри экранов
  FOCUS: {
    menu: { hud: ['#menuBtn'] },
    spirits: { hud: ['#menuBtn'], tile: 'spirits' },
    card: { hud: ['#menuBtn'], tile: 'spirits', scr: ['.col-screen .grid.cards .card'] },
    power: { hud: ['#menuBtn'], tile: 'spirits', scr: ['.col-screen .grid.cards .card', '.det-screen .act-power'] },
    dex: { hud: ['#menuBtn'], tile: 'book' },
    spring: { hud: ['#joystick', '#tracker'], scr: ['.spring-screen .spring-go', '.spring-screen .spr2-well'] },
    bag: { hud: ['#menuBtn'], tile: 'bag' },
    cocoons: { hud: ['#menuBtn'], tile: 'egg' },
    quests: { hud: ['#menuBtn'], tile: 'scroll' },
    path: { hud: ['#menuBtn'], tile: 'path' },
  },
  focusOn() { return !!this.started && !!this.at(); },
  // можно ли нажать элемент t сейчас
  allows(t) {
    const st = this.focusOn() && this.at();
    if (!st || !t || !t.closest) return true;
    const zone = t.closest(this.ZONES);
    if (!zone) return true;
    const f = this.FOCUS[st.id] || {}, hit = list => list.some(s => { const m = t.closest(s); return !!m && zone.contains(m); });
    if (hit(this.NEVER)) return false;
    if (hit(this.ALWAYS)) return true;
    if (zone.matches('.rm-wrap')) { // меню: касание мимо разделов закрывает его; закрытый раздел сам скажет, когда откроется
      const tile = t.closest('.tile[data-k]');
      return !tile || tile.classList.contains('locked') || tile.dataset.k === 'gear' || tile.dataset.k === f.tile;
    }
    if (zone.matches('.screen')) {
      const open = U.$$('.screen').filter(s => !s.classList.contains('out')), i = open.indexOf(zone);
      if (open.slice(0, i + 1).some(s => s.matches(this.FREE_SCR))) return true; // настройки и всё, что открыто из них
      return hit(f.scr || []);
    }
    // HUD карты
    if (t.closest('#menuBtn') && UI._rm) return true; // открытое меню кнопка закрывает
    // шаг «источник», а готового источника рядом нет — можно шагнуть через Атлас мира
    if (st.id === 'spring' && t.closest('#atlasBtn') && typeof MapView !== 'undefined' && MapView.map && !MapView.nearest('spring')) return true;
    return hit(f.hud || []);
  },
  // объект карты (дух, источник, святилище, разлом): на шаге «поймай» — только учебный дух, на шаге «источник» — источники
  entOk(e) {
    const st = this.focusOn() && this.at();
    if (!st || !e) return true;
    if (st.kind === 'catch') return e.type === 'spirit' && !!e.tut;
    if (st.kind === 'spring') return e.type === 'spring';
    return false;
  },
  canWalk() { const st = this.focusOn() && this.at(); return !st || st.kind === 'spring'; },
  // перехват нажатий: на фазе захвата, до обработчиков самих кнопок (один раз за игру; без обучения — пропускает всё)
  guard() {
    if (this._guarded) return;
    this._guarded = true;
    const no = e => this.focusOn() && e.target && e.target.nodeType === 1 && !this.allows(e.target);
    document.addEventListener('click', e => {
      if (!no(e)) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (e.target.closest(this.TAPPABLE)) this.nudge(); // касание пустого места экрана — молча
    }, true);
    // нажатие недоступного не доходит и до его pointerdown/touchstart (джойстик, смахивание вкладок); толчок — по click
    ['pointerdown', 'mousedown', 'touchstart'].forEach(type => document.addEventListener(type, e => {
      if (!no(e)) return;
      e.stopPropagation(); e.stopImmediatePropagation();
      if (type === 'pointerdown' && e.target.closest('#joystick')) e.preventDefault();
    }, type === 'touchstart' ? { capture: true, passive: true } : true));
  },
  TAPPABLE: 'button, a, input, select, textarea, label, [role="button"], .chip, .card, .tile, [data-tab], #joystick, #tracker',
  // толчок: подсказка вздрагивает, и (не чаще раза в 2 с) всплывашка — что сначала шаг обучения
  nudge() {
    if (typeof Sfx !== 'undefined') Sfx.play('nudge');
    if (this.el && !this.el.classList.contains('hidden')) {
      const c = this.el;
      c.classList.remove('nudge'); void c.offsetWidth; c.classList.add('nudge');
      clearTimeout(this._nudgeC); this._nudgeC = setTimeout(() => c.classList.remove('nudge'), 700);
    }
    const now = Date.now();
    if (now - (this._nudgeT || 0) < 2000) return;
    this._nudgeT = now;
    UI.toast(ru`Сначала закончи шаг обучения`);
  },
  // недоступное сейчас — приглушено (раз в 300 мс из track): кнопки HUD, разделы меню, кнопки открытых экранов
  mark() {
    const on = this.focusOn();
    U.$$('#hud button, #hud .chip, #joystick, #tracker, .rm-wrap .tile, .screen:not(.out) button').forEach(e => {
      const off = on && !this.allows(e);
      if (e.classList.contains('tut-off') !== off) e.classList.toggle('tut-off', off);
    });
  },

  /* ---------- разделы меню по ходу обучения ---------- */
  // Меню открывается с шага «открой меню»
  menuLock() {
    const n = this.step();
    return n && n < this.idx('menu') ? ru`Сначала поймай духов: меню откроется чуть позже.` : null;
  },
  // Раздел меню: замок до своего шага обучения (настройки — всегда; 5.2: Ловчий — после обучения, как и профиль на карте)
  tileLock(key) {
    const n = this.step();
    if (!n || key === 'gear') return null;
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
    return { type: 'spirit', id: 'tut' + this.step(), tut: true, sid: S.tutSid(st, lat, lng), lvl: Math.min(2, S.catchLvl()), lat: p[0], lng: p[1], d: U.dist(lat, lng, p[0], p[1]), expires: U.now() + 3600000 };
  },
};
