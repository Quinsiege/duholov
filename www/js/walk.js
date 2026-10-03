'use strict';
/* 5.1: Ловчий ходит без GPS. Позицию хранит и двигает этот модуль (Walk), карта (MapView) только показывает её.
   Мини-джойстик в нижнем углу карты (сторона — настройка joySide): лёгкий наклон — шаг, до упора — бег (Rules.MOVE);
   направление — наклон ручки относительно экрана (с учётом поворота карты). На ПК — ещё WASD и стрелки, Shift — бег.
   Пройденный путь — точками раз в секунду (Game.addPoint), серверу — действием move раз в Rules.MOVE.SYNC_MS, пока идёшь,
   и сразу после остановки: сервер считает километры и проверяет скорость, как раньше (бег медленнее Rules.SPEED.MAX).
   Место сохраняется на телефоне (для мгновенного старта) и в прогрессе (S.d.wpos — сервер, core.js keepPos).
   Телепорт через Атлас мира — Walk.teleport (действие teleport): первое появление даром, дальше — перезарядка или Врата. */

const Walk = {
  KEY: 'duholov.lastPos', // та же отметка, что до 5.1 писала карта по GPS: у старых игроков место сохраняется
  pos: null, heading: 0, mode: 0, // mode: 0 — стоит, 1 — шаг, 2 — бег
  joy: { x: 0, y: 0 }, keys: {}, el: null,
  _raf: 0, _last: 0, _ptT: 0, _syncT: 0, _saveT: 0,

  // rules.js подключается позже walk.js — если Rules ещё нет, запасное 85
  ok(p) { return !!p && Number.isFinite(+p.lat) && Number.isFinite(+p.lng) && Math.abs(p.lat) <= (typeof Rules !== 'undefined' ? Rules.MOVE.LAT : 85) && Math.abs(p.lng) <= 180; },
  // место при запуске: сохранённое на телефоне, а если прогресс знает другое (играл на другом устройстве) — из прогресса
  load() {
    let p = null;
    try { const a = JSON.parse(localStorage.getItem(this.KEY)); if (Array.isArray(a)) p = { lat: +a[0], lng: +a[1] }; } catch (e) { /* нет хранилища */ }
    if (!this.ok(p)) p = null;
    const w = typeof S !== 'undefined' && S.d && S.d.wpos;
    if (this.ok(w) && (!p || U.dist(p.lat, p.lng, w.lat, w.lng) > 200)) p = { lat: +w.lat, lng: +w.lng };
    this.pos = p;
    return p;
  },
  save(force) {
    const now = Date.now();
    if (!this.pos || (!force && now - this._saveT < 3000)) return;
    this._saveT = now;
    try { localStorage.setItem(this.KEY, JSON.stringify([+this.pos.lat.toFixed(6), +this.pos.lng.toFixed(6)])); } catch (e) { /* нет хранилища */ }
  },
  // позиция для запросов к серверу (game.js): без места — null (сервер попросит выбрать место в Атласе)
  wire() { return this.pos ? { lat: +this.pos.lat.toFixed(6), lng: +this.pos.lng.toFixed(6), acc: 5 } : null; },
  // у Ловчего есть место в мире игры (иначе — Атлас с выбором первого места)
  placed() { return !!this.pos && !!(typeof S !== 'undefined' && S.d && S.d.atlasV); },
  // сколько мс до телепорта даром (0 — можно)
  cooldownLeft() { return typeof S !== 'undefined' && S.d ? Rules.tpWait(S.d.tpAt, U.now()) : 0; },
  gates() { return (typeof S !== 'undefined' && S.d && S.d.items[Rules.MOVE.TP_ITEM]) || 0; },

  /* ---------- телепорт ---------- */
  // opt: first — первое появление (даром), item — идёт перезарядка: шагнуть за Врата Перепутицы (Атлас спрашивает Ловчего)
  // → { ok, error?, cd?, used? }: cd — мс до следующего телепорта даром, used — потрачены Врата
  async teleport(lat, lng, opt = {}) {
    lat = +lat; lng = +lng;
    if (!this.ok({ lat, lng })) return { ok: false, error: ru`Такого места нет на карте` };
    this.stop();
    try { await Game.flushMove(); } catch (e) { /* путь досчитается позже */ }
    let r;
    try { r = await Game.act('teleport', { lat, lng, first: opt.first === true, item: opt.item === true }); }
    catch (e) { return { ok: false, error: e.message, cd: this.cooldownLeft() }; }
    // сразу, до следующего запроса в очереди: он уйдёт уже с новым местом
    this.pos = { lat: r.lat, lng: r.lng };
    Game.pts = [];
    this._syncT = Date.now();
    this.save(true);
    if (typeof MapView !== 'undefined' && MapView.map) MapView.jump(r.lat, r.lng);
    document.dispatchEvent(new CustomEvent('duholov:teleported', { detail: { lat: r.lat, lng: r.lng } }));
    return { ok: true, cd: r.cd || 0, used: r.used || null };
  },
  // первое появление: у Ловчего ещё нет места в мире игры (новичок или первый вход после 5.1) — Атлас один раз,
  // когда карта загружена и не открыто других окон (книга-вступление — раньше)
  ensurePlaced() {
    if (this._ensure) return;
    this._ensure = true;
    let tries = 0;
    // 5.1.6: открытая книга-вступление ждётся всегда — Атлас не встаёт поверх неё (ещё не открытая — не дольше 90 с)
    const busy = () => UI.blocking() || (typeof Intro !== 'undefined' && (Intro.el || (Intro.need() && tries < 60)))
      || document.querySelector('.modal-wrap, .sheet-wrap, .screen, .enc, .raid, .onb, .loader, .fatal, .cam-screen, .lg-sheet, .atlas');
    const tick = () => {
      if (!S.d || this.placed() || (typeof Atlas !== 'undefined' && Atlas.el)) { this._ensure = false; return; }
      if (typeof Atlas === 'undefined' || busy()) { if (++tries < 400) setTimeout(tick, 1500); else this._ensure = false; return; }
      this._ensure = false;
      Atlas.open({ first: true });
    };
    setTimeout(tick, 1200);
  },

  /* ---------- джойстик ---------- */
  init() {
    if (this.el) return;
    this.el = U.$('#joystick');
    const j = this.el;
    if (!j) return;
    j.innerHTML = '<div class="jy-base"></div><div class="stick"></div>'; // матовое «жидкое стекло»: основа и ручка
    j.setAttribute('role', 'application');
    j.setAttribute('aria-label', ru`Джойстик: наклони, чтобы идти; до упора — бег`);
    j.classList.remove('hidden');
    this.side();
    const stick = j.querySelector('.stick');
    let id = null, geo = null;
    // 5.1.31: середина джойстика и ход ручки — один раз при касании: замер на каждом движении пальца заставлял браузер
    // тут же пересчитывать раскладку страницы (карта под пальцем меняется каждый кадр)
    const measure = () => { const r = j.getBoundingClientRect(); geo = { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 - stick.offsetWidth / 4 }; };
    const set = e => {
      if (!geo) measure();
      const R = geo.R;
      let dx = e.clientX - geo.x, dy = e.clientY - geo.y;
      const m = Math.hypot(dx, dy);
      if (m > R) { dx *= R / m; dy *= R / m; }
      stick.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy = { x: dx / R, y: dy / R };
      this.run();
    };
    j.addEventListener('pointerdown', e => {
      if (id != null) return;
      e.preventDefault(); e.stopPropagation();
      id = e.pointerId;
      try { j.setPointerCapture(id); } catch (x) { /* не поддерживается */ }
      j.classList.add('on');
      measure();
      set(e);
    });
    j.addEventListener('pointermove', e => { if (e.pointerId === id) { e.preventDefault(); set(e); } });
    const end = e => {
      if (e.pointerId !== id) return;
      id = null; geo = null; stick.style.transform = ''; j.classList.remove('on');
      this.joy = { x: 0, y: 0 };
    };
    j.addEventListener('pointerup', end);
    j.addEventListener('pointercancel', end);
    j.addEventListener('lostpointercapture', end);
    j.addEventListener('contextmenu', e => e.preventDefault());
    // клавиши (ПК): не в полях ввода
    const typing = e => { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
    const KEYS = { w: 'u', 'ц': 'u', arrowup: 'u', s: 'd', 'ы': 'd', arrowdown: 'd', a: 'l', 'ф': 'l', arrowleft: 'l', d: 'r', 'в': 'r', arrowright: 'r' };
    addEventListener('keydown', e => {
      const k = KEYS[(e.key || '').toLowerCase()];
      this.keys.shift = e.shiftKey;
      if (!k || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.startsWith('Arrow') && UI.blocking()) return; // стрелки в окнах — их прокрутка
      if (typeof Tut !== 'undefined' && !Tut.canWalk()) return; // 5.2: на обучении ходить — только на шаге «источник»
      this.keys[k] = true;
      this.run();
    });
    addEventListener('keyup', e => {
      this.keys.shift = e.shiftKey;
      const k = KEYS[(e.key || '').toLowerCase()];
      if (k) this.keys[k] = false;
    });
    const release = () => { this.keys = {}; this.joy = { x: 0, y: 0 }; stick.style.transform = ''; j.classList.remove('on'); id = null; geo = null; };
    addEventListener('blur', release);
    // свёрнутая игра стоит на месте: путь — серверу, место — на телефон
    document.addEventListener('visibilitychange', () => { if (document.hidden) { release(); this.stop(); } });
  },
  // сторона джойстика — по настройке (справа или слева)
  side() {
    const left = Cfg.s.joySide === 'left';
    document.body.classList.toggle('joy-left', left);
    document.body.classList.toggle('joy-right', !left);
  },
  // 5.2: поверх карты открыта полноэкранная сцена (stage.js) или идёт поимка — Ловчий стоит; снова пойдёт от следующего касания
  held() { return (typeof Stage !== 'undefined' && Stage.busy) || (typeof Encounter !== 'undefined' && !!Encounter.st); },
  // вектор движения на экране (x вправо, y вниз) и скорость, м/с
  input() {
    const M = Rules.MOVE, k = this.keys;
    let x = (k.r ? 1 : 0) - (k.l ? 1 : 0), y = (k.d ? 1 : 0) - (k.u ? 1 : 0);
    if (x || y) return { x, y, v: k.shift ? M.RUN : M.WALK };
    ({ x, y } = this.joy);
    const mag = Math.min(1, Math.hypot(x, y));
    if (mag < M.DEAD) return null;
    return { x, y, v: mag >= M.RUN_AT ? M.RUN : M.WALK };
  },
  // цикл кадров (requestAnimationFrame) — только пока есть ввод: без него страница не просыпается
  run() {
    if (this._raf || document.hidden || this.held()) return;
    this._last = performance.now();
    const loop = t => {
      const dt = Math.min(0.1, Math.max(0, (t - this._last) / 1000));
      this._last = t;
      if (!this.tick(dt, t)) { this._raf = 0; this.stop(); return; }
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  },
  // шаг кадра; false — ввода больше нет (цикл останавливается)
  tick(dt, t) {
    const inp = this.input();
    if (!inp) return false;
    if (this.held()) return false; // 5.2: открыта сцена (поимка, бой, экран) — цикл кадров останавливается, а не крутится вхолостую
    if (!this.pos || document.hidden || UI.blocking()) { this.setMode(0); return true; }
    const n = Math.hypot(inp.x, inp.y) || 1;
    // направление на экране → направление на карте: карта повёрнута на MapView.rot
    const rot = typeof MapView !== 'undefined' ? MapView.rot || 0 : 0;
    const brg = Math.atan2(inp.x / n, -inp.y / n) * 180 / Math.PI - rot, a = brg * Math.PI / 180;
    const m = inp.v * dt, lat = this.pos.lat, cos = Math.cos(lat * Math.PI / 180);
    const nl = U.clamp(lat + Math.cos(a) * m / 111320, -Rules.MOVE.LAT, Rules.MOVE.LAT);
    let ng = this.pos.lng + Math.sin(a) * m / (111320 * Math.max(0.01, cos));
    if (ng > 180) ng -= 360; else if (ng < -180) ng += 360;
    this.pos = { lat: nl, lng: ng };
    this.heading = brg;
    this.setMode(inp.v >= Rules.MOVE.RUN ? 2 : 1);
    if (typeof MapView !== 'undefined' && MapView.map) MapView.walkTo(nl, ng, brg);
    // точки пути и отправка серверу
    if (t - this._ptT >= Rules.MOVE.PT_MS) { this._ptT = t; Game.addPoint(nl, ng, 5); }
    const now = Date.now();
    if (!this._syncT) this._syncT = now;
    if (now - this._syncT >= Rules.MOVE.SYNC_MS) { this._syncT = now; Game.flushMove(); }
    this.save();
    return true;
  },
  setMode(m) {
    if (this.mode === m) return;
    this.mode = m;
    if (this.el) this.el.classList.toggle('run', m === 2);
    if (typeof MapView !== 'undefined' && MapView.setGait) MapView.setGait(m);
  },
  // остановился: последняя точка, место — на телефон, путь — серверу через секунду (вдруг снова пойдёт)
  stop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
    const was = this.mode;
    this.setMode(0);
    if (!was || !this.pos) return;
    Game.addPoint(this.pos.lat, this.pos.lng, 5);
    this._ptT = performance.now();
    this.save(true);
    clearTimeout(this._stopT);
    this._stopT = setTimeout(() => { if (!this.mode) { this._syncT = Date.now(); Game.flushMove(); } }, 1200);
  },
};
// 5.1.1: место загружается при запуске игры (main.js), а не при загрузке файла: на сайте все скрипты склеены в один
// (tools/web/build.mjs), и Rules/S, объявленные ниже по склейке, в этот момент ещё недоступны (ReferenceError)
