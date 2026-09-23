'use strict';
/* Встреча с духом: бросок оберега свайпом, сжимающееся кольцо, покачивания, AR-камера.
   Попадание и кольцо определяет телефон (это ловкость игрока), а поймался ли дух, сбежал ли он
   и какая награда — решает сервер (действия encStart / encThrow / encHoney / encEnd). */

const Encounter = {
  st: null,
  lastType: 'charm',

  throwables() { return Rules.THROWABLE.filter(k => (S.d.items[k] || 0) > 0); },

  // o: { mode: 'wild'|'raid'|'rescue'|'story', tut, spawnId, seed, onEnd } — вид и уровень духа сообщает сервер
  async start(o) {
    if (this.st || this._opening) return;
    if (o.mode !== 'raid' && !this.throwables().length) { UI.toast('Обереги закончились! Загляни к роднику.'); return; }
    this._opening = true;
    const r = await Game.try('encStart', { kind: o.tut ? 'tut' : o.mode, id: o.spawnId });
    this._opening = false;
    if (!r) { MapView.refresh(); return; }
    o = { ...o, mode: r.mode, sid: r.sid, lvl: r.lvl, shiny: r.shiny, dark: r.dark, boost: r.boost, charms: r.charms };
    const s = SP[o.sid];
    const sp = S.makeSpirit(o.sid, o.lvl, o.seed + ':iv', { ivMin: o.mode === 'wild' ? 0 : 10 });
    if (o.shiny) sp.shiny = true;
    if (o.dark) sp.dark = true;
    const power = r.power;
    const root = U.el(`
      <div class="enc">
        <video class="enc-cam" playsinline muted autoplay></video>
        <div class="enc-scene el-${s.el}"><div class="enc-sky"></div><div class="enc-ground"></div><div class="enc-motes">${'<i></i>'.repeat(14)}</div></div>
        <div class="enc-top">
          <button class="btn-round enc-run" aria-label="Уйти">${UI.I.close}</button>
          <div class="enc-info">
            <div class="enc-power">СИЛА <b>${power}</b></div>
            <div class="enc-name">${Art.elIcon(s.el, 20)} ${s.name}</div>
            <div class="enc-rar" style="color:${RARITY[s.rar].color}">${RARITY[s.rar].name} · ур. ${sp.lvl}</div>
            ${o.boost && Sky.w ? `<div class="enc-tag">${Art.wxIcon(Sky.w.key, 16)} Усилен погодой</div>` : ''}
            ${sp.shiny ? '<div class="enc-tag shiny">✦ Сияющий</div>' : ''}
            ${sp.dark ? '<div class="enc-tag dark">Омрачённый Навью</div>' : ''}
          </div>
          <div class="enc-tr">
            <button class="btn-round enc-ar ${Cfg.s.ar ? 'on' : ''}" aria-label="AR">AR</button>
            <button class="btn-round enc-photo" aria-label="Фото"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></button>
          </div>
        </div>
        <div class="enc-flash"></div>
        <div class="enc-creature ${sp.shiny ? 'is-shiny' : ''}"><div class="enc-art">${Art.of(sp)}</div></div>
        <svg class="enc-rings" viewBox="-100 -100 200 200"><circle class="ring-out" r="96"/><circle class="ring-in" r="96"/></svg>
        <div class="enc-fx"></div>
        <div class="enc-msg"></div>
        <div class="enc-ball"></div>
        <div class="enc-bottom">
          <button class="enc-honey"><div class="ico">${Art.item('honey')}</div><span></span></button>
          <div class="enc-hint">${Cfg.s.tapThrow ? 'Коснись оберега — он полетит в духа.' : 'Смахни оберег вверх.'}<br>Попади в кольцо, когда оно маленькое!</div>
          <button class="enc-type"><div class="ico"></div><span></span></button>
        </div>
      </div>`);
    document.body.appendChild(root);
    const types = this.throwables();
    const st = this.st = {
      o, s, sp, root, phase: 'intro', honey: false, throws: 0, raidLeft: o.charms || 0,
      charmType: o.mode === 'raid' ? 'rift' : (types.includes(this.lastType) ? this.lastType : types[0]),
      t0: performance.now(), ball: { x: 0, y: 0, sc: 1, rot: 0, op: 1 }, k: 0, tilt: 0, ring: 1,
      $: sel => root.querySelector(sel),
    };
    st.creatureEl = st.$('.enc-creature'); st.ballEl = st.$('.enc-ball'); st.ringEl = st.$('.enc-rings'); st.ringIn = st.$('.ring-in');
    UI.pushLayer(() => this.run());

    st.$('.enc-run').onclick = () => this.run();
    st.$('.enc-ar').onclick = e => {
      Cfg.s.ar = !Cfg.s.ar; Cfg.save();
      e.currentTarget.classList.toggle('on', Cfg.s.ar);
      Cfg.s.ar ? this.startCam() : this.stopCam();
    };
    st.$('.enc-photo').onclick = () => this.photo();
    st.$('.enc-honey').onclick = () => this.useHoney();
    st.$('.enc-type').onclick = () => this.cycleType();
    this.bindBall();
    this.layout();
    this._onResize = () => this.layout();
    window.addEventListener('resize', this._onResize);
    this._onTilt = e => { if (this.st && Cfg.s.ar && e.gamma != null) this.st.tilt = U.clamp(-e.gamma * 4, -80, 80); };
    window.addEventListener('deviceorientation', this._onTilt);
    if (Cfg.s.ar) this.startCam();
    this.updateBottom();
    requestAnimationFrame(this._loop = t => this.loop(t));
    // появление
    this.anim(550, p => { st.k = 1 - Math.pow(1 - p, 3) * 1; }).then(() => {
      if (this.st !== st) return;
      st.phase = 'aim';
      if (sp.shiny) { this.flash('✦ Сияющий дух! ✦', 'bonus'); Sfx.play('spin'); }
      if (o.tut) {
        st.$('.enc-hint').innerHTML = '<b>Зажми оберег и смахни вверх</b>, прямо к духу.<br>Чем быстрее свайп — тем дальше бросок.';
        st.root.appendChild(U.el(`<div class="tut-hand" style="left:${st.rest.x}px;top:${st.rest.y}px"><i></i></div>`));
      }
    });
    U.vibrate(sp.shiny ? [40, 60, 40] : 40);
    Sfx.element(s.el, true); // «голос» духа при появлении
  },

  layout() {
    const st = this.st; if (!st) return;
    // clientWidth/Height не зависят от CSS-анимации масштаба при появлении
    st.W = st.root.clientWidth; st.H = st.root.clientHeight;
    st.size = Math.min(st.W * 0.66, st.H * 0.38, 320);
    st.cx0 = st.W / 2; st.cy0 = st.H * 0.44;
    st.R = st.size * 0.3; st.ringR = st.size * 0.42;
    st.rest = { x: st.W / 2, y: st.H - 128 };
    st.creatureEl.style.width = st.creatureEl.style.height = st.size + 'px';
    st.ringEl.style.width = st.ringEl.style.height = st.ringR * 2 + 'px';
    if (st.phase === 'aim' || st.phase === 'intro') Object.assign(st.ball, { x: st.rest.x, y: st.rest.y, sc: 1, rot: 0, op: 1 });
  },

  loop(t) {
    const st = this.st; if (!st) return;
    const el = (t - st.t0) / 1000;
    const amp = [0, 0, 6, 16, 28, 34][st.s.rar] * st.size / 240;
    st.cx = st.cx0 + Math.sin(el * 1.25) * amp + st.tilt;
    // прыжок каждые ~5 секунд
    const hp = (el % 5.2) / 5.2;
    st.hop = hp > 0.88 ? -Math.sin((hp - 0.88) / 0.12 * Math.PI) * st.size * 0.14 : 0;
    st.cy = st.cy0 + st.hop;
    if (st.phase === 'aim' || st.phase === 'fly' || st.phase === 'intro') st.ring = 1 - 0.8 * ((el % 1.7) / 1.7);
    if (st.phase === 'fly') this.stepFlight(t);

    st.creatureEl.style.transform = `translate(${st.cx - st.size / 2}px, ${st.cy - st.size / 2}px) scale(${st.k})`;
    const showRing = st.phase === 'aim' || st.phase === 'fly';
    st.ringEl.style.opacity = showRing ? 1 : 0;
    st.ringEl.style.transform = `translate(${st.cx - st.ringR}px, ${st.cy - st.ringR}px)`;
    st.ringIn.setAttribute('r', (96 * st.ring).toFixed(1));
    st.ringIn.style.stroke = this.ringColor();
    const b = st.ball;
    st.ballEl.style.transform = `translate(${b.x - 38}px, ${b.y - 38}px) scale(${b.sc}) rotate(${b.rot}deg)`;
    st.ballEl.style.opacity = b.op;
    requestAnimationFrame(this._loop);
  },

  anim(dur, fn) {
    return new Promise(res => {
      const t0 = performance.now();
      const step = t => {
        if (!this.st) return res();
        const p = Math.min(1, (t - t0) / dur);
        fn(p);
        p < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
  },

  /* ---------------- ШАНС ---------------- */
  // только для цвета кольца: сам бросок считает сервер по тем же правилам (rules.js)
  chance(throwMul = 1) {
    const st = this.st, { sp, o } = st;
    return Rules.catchChance({ mode: o.mode, sid: sp.sid, lvl: sp.lvl, item: o.mode === 'raid' ? null : st.charmType, honey: st.honey, mul: throwMul });
  },
  ringColor() {
    const c = this.chance(1);
    return c >= 0.5 ? '#4ade80' : c >= 0.3 ? '#facc15' : c >= 0.15 ? '#fb923c' : '#f87171';
  },

  /* ---------------- НИЖНЯЯ ПАНЕЛЬ ---------------- */
  updateBottom() {
    const st = this.st;
    const cnt = st.o.mode === 'raid' ? st.raidLeft : Math.max(0, (S.d.items[st.charmType] || 0) - (st.spent || 0));
    st.ballEl.innerHTML = Art.charm(st.charmType);
    st.$('.enc-type .ico').innerHTML = Art.charm(st.charmType);
    st.$('.enc-type span').textContent = cnt;
    st.$('.enc-honey span').textContent = S.d.items.honey || 0;
    st.$('.enc-honey').classList.toggle('active', st.honey);
    st.$('.enc-honey').style.visibility = st.o.mode === 'raid' && !(S.d.items.honey > 0) ? 'hidden' : '';
  },
  cycleType() {
    const st = this.st;
    if (st.o.mode === 'raid' || st.phase !== 'aim') return;
    const types = this.throwables();
    if (types.length < 2) { UI.toast(types.length ? `Есть только «${ITEMS[types[0]].name}»` : 'Нет оберегов'); return; }
    st.charmType = types[(types.indexOf(st.charmType) + 1) % types.length];
    this.lastType = st.charmType;
    this.flash(ITEMS[st.charmType].name);
    this.updateBottom();
  },
  async useHoney() {
    const st = this.st;
    if (st.phase !== 'aim' || st.honeyBusy) return;
    if (st.honey) { this.flash('Дух уже лакомится мёдом'); return; }
    if (!(S.d.items.honey > 0)) { UI.toast('Мёда нет. Его можно найти у родников.'); return; }
    st.honeyBusy = true;
    const r = await Game.try('encHoney');
    st.honeyBusy = false;
    if (!r || this.st !== st) return;
    st.honey = true;
    Sfx.play('spin');
    this.flash('Дух ест мёд и успокаивается');
    st.$('.enc-fx').appendChild(U.el(`<div class="fx-honey" style="left:${st.cx}px;top:${st.cy}px">${Art.item('honey')}</div>`));
    setTimeout(() => { const f = st.$('.fx-honey'); if (f) f.remove(); }, 1200);
    this.updateBottom();
  },
  charmsLeft() { const st = this.st; return st.o.mode === 'raid' ? st.raidLeft : this.throwables().length > 0; },
  flash(text, cls = '') {
    const m = this.st.$('.enc-msg');
    m.className = 'enc-msg show ' + cls; m.innerHTML = text;
    clearTimeout(this._mt); this._mt = setTimeout(() => { if (this.st) m.className = 'enc-msg'; }, 1400);
  },

  /* ---------------- БРОСОК ---------------- */
  bindBall() {
    const st = this.st, el = st.ballEl;
    let drag = null;
    el.addEventListener('pointerdown', e => {
      if (st.phase !== 'aim') return;
      Sfx.init();
      drag = { id: e.pointerId, start: { x: e.clientX, y: e.clientY }, s: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      st.$('.enc-hint').classList.add('hide');
    });
    el.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const now = performance.now();
      drag.s.push({ x: e.clientX, y: e.clientY, t: now });
      while (drag.s.length > 2 && now - drag.s[0].t > 120) drag.s.shift();
      st.ball.x = e.clientX; st.ball.y = e.clientY;
    });
    const up = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const s = drag.s, s0 = drag.start; drag = null;
      const a = s[0], b = s[s.length - 1], dt = Math.max(16, b.t - a.t);
      const vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;
      const moved = Math.hypot(e.clientX - s0.x, e.clientY - s0.y);
      if (vy < -0.35 && st.phase === 'aim') this.throwCharm(vx, vy);
      else if (Cfg.s.tapThrow && moved < 14 && st.phase === 'aim') {
        // доступность: касание без свайпа — точный бросок в духа (бонус кольца зависит от момента касания)
        st.ball.x = st.rest.x; st.ball.y = st.rest.y;
        this.throwCharm((st.cx - st.rest.x) / 240, -1.6 * Math.max(480, st.H) / 800);
      } else this.returnBall();
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  },
  returnBall() {
    const st = this.st, b = st.ball, x0 = b.x, y0 = b.y;
    this.anim(220, p => { b.x = U.lerp(x0, st.rest.x, p); b.y = U.lerp(y0, st.rest.y, p); });
  },
  throwCharm(vx, vy) {
    const st = this.st;
    if (st.phase !== 'aim') return;
    if (st.o.mode === 'raid') { if (st.raidLeft <= 0) return; st.raidLeft--; }
    else if (!((S.d.items[st.charmType] || 0) - (st.spent || 0) > 0)) { UI.toast('Обереги этого вида закончились'); return; }
    else st.spent = (st.spent || 0) + 1; // пока летит, счётчик показываем без него — спишет сервер
    st.throws++;
    st.phase = 'fly';
    const hand = st.root.querySelector('.tut-hand'); if (hand) hand.remove();
    Sfx.play('throw');
    // сила свайпа нормируется по высоте экрана, чтобы на больших и маленьких телефонах бросок ощущался одинаково
    const power = -vy * (800 / Math.max(480, st.H));
    const f = 1 + U.clamp((power - 1.6) / 1.6, -1, 1) * 0.55;
    const x0 = st.ball.x, y0 = st.ball.y;
    const x1 = x0 + vx * 240, y1 = y0 - (y0 - st.cy0) * f;
    st.fl = { t0: performance.now(), dur: 620, x0, y0, x1, y1, qx: (x0 + x1) / 2, qy: Math.min(y0, y1) - st.H * 0.2, ring: st.ring, item: st.charmType };
    this.updateBottom();
  },
  stepFlight(t) {
    const st = this.st, fl = st.fl, b = st.ball;
    const p = Math.min(1, (t - fl.t0) / fl.dur), q = 1 - p;
    b.x = q * q * fl.x0 + 2 * q * p * fl.qx + p * p * fl.x1;
    b.y = q * q * fl.y0 + 2 * q * p * fl.qy + p * p * fl.y1;
    b.sc = 1 - 0.5 * p;
    b.rot += 14;
    if (p >= 1) { st.phase = 'resolve'; this.resolve(); }
  },
  // Бросок долетел: попадание и кольцо — отсюда, результат — с сервера
  send(hit, ring) {
    const st = this.st;
    const req = Game.act('encThrow', { item: st.fl.item, hit, ring });
    req.finally(() => { if (this.st === st) { st.spent = 0; this.updateBottom(); } }).catch(() => {});
    return req;
  },
  async resolve() {
    const st = this.st, b = st.ball;
    const dx = b.x - st.cx, dy = b.y - st.cy;
    const dist = Math.hypot(dx, dy * 0.85);
    if (dist > st.R * 1.15) return this.miss(this.send(false, null));
    // бонус за кольцо
    const inRing = Math.hypot(dx, dy) <= st.ringR * st.fl.ring + 10;
    const bonus = Rules.ringBonus(inRing ? st.fl.ring : null);
    if (inRing) this.flash(bonus.label, 'bonus');
    Sfx.play('hit'); U.vibrate(30);
    await this.capture(this.send(true, inRing ? +st.fl.ring.toFixed(3) : null));
  },
  async miss(req) {
    const st = this.st, b = st.ball;
    Sfx.play('miss');
    this.flash('Мимо!');
    const x0 = b.x, y0 = b.y;
    await this.anim(420, p => { b.y = y0 + p * p * st.H * 0.35; b.x = x0 + p * 20; b.op = 1 - p; b.sc = 0.5 - p * 0.1; });
    let r;
    try { r = await req; } catch (e) { UI.toast(U.esc(e.message)); }
    if (this.st !== st) return;
    if (r && r.over) return this.over(r);
    this.afterThrow();
  },
  // встреча закончилась без поимки (решение сервера)
  over(r) {
    if (r.fled) return this.fleeOut(r.text);
    UI.toast('Обереги закончились!');
    return this.end('noCharms');
  },
  afterThrow() {
    const st = this.st; if (!st) return;
    if (!this.charmsLeft()) {
      if (st.o.mode === 'raid') return this.fleeOut('Обереги кончились — дух вернулся в Навь…');
      UI.toast('Обереги закончились!');
      return this.end('noCharms');
    }
    if (st.o.mode !== 'raid' && !(S.d.items[st.charmType] > 0)) { st.charmType = this.throwables()[0]; this.updateBottom(); }
    Object.assign(st.ball, { x: st.rest.x, y: st.rest.y + 120, sc: 1, rot: 0, op: 0 });
    this.anim(260, p => { st.ball.y = st.rest.y + 120 * (1 - p); st.ball.op = p; }).then(() => { if (this.st === st) st.phase = 'aim'; });
  },

  /* ---------------- ПОИМКА ---------------- */
  async capture(req) {
    const st = this.st, b = st.ball;
    st.phase = 'capture';
    const hx = b.x, hy = b.y, cx = st.cx, top = st.cy - st.size * 0.12;
    st.$('.enc-fx').appendChild(U.el(`<div class="fx-burst" style="left:${cx}px;top:${st.cy}px"></div>`));
    await this.anim(380, p => {
      st.k = 1 - p;
      b.x = U.lerp(hx, cx, p); b.y = U.lerp(hy, top, p) - Math.sin(p * Math.PI) * 40; b.rot = 0; b.sc = 0.55;
    });
    if (!this.st) return;
    const ground = st.cy0 + st.size * 0.32;
    await this.anim(360, p => { b.y = U.lerp(top, ground, p * p); });
    await this.anim(220, p => { b.y = ground - Math.sin(p * Math.PI) * 16; });
    let r;
    try { r = await req; } catch (e) { UI.toast(U.esc(e.message)); }
    if (this.st !== st) return;
    st.honey = false; this.updateBottom();
    if (!r) return this.breakOut(null); // нет связи — бросок не засчитан
    for (let k = 0; k < 3; k++) {
      await U.wait(420);
      if (!this.st) return;
      Sfx.play('wobble'); U.vibrate(20);
      st.ballEl.classList.add('glow');
      await this.anim(460, p => { b.rot = Math.sin(p * Math.PI * 2) * 26; b.x = cx + Math.sin(p * Math.PI * 2) * 6; });
      st.ballEl.classList.remove('glow');
      if (k >= r.wobbles) return this.breakOut(r);
    }
    await U.wait(300);
    this.success(r);
  },
  async breakOut(r) {
    const st = this.st, b = st.ball;
    Sfx.play('escape'); U.vibrate([40, 30, 40]);
    st.$('.enc-fx').appendChild(U.el(`<div class="fx-burst out" style="left:${b.x}px;top:${b.y}px"></div>`));
    await this.anim(380, p => { st.k = p < 0.7 ? p / 0.7 * 1.12 : 1.12 - (p - 0.7) / 0.3 * 0.12; b.op = 1 - p; b.sc = 0.55 + p * 0.4; });
    if (!this.st) return;
    this.flash(['Дух вырвался!', 'Почти получилось!', 'Ай! Вырвался!'][Math.floor(Math.random() * 3)]);
    if (r && r.over) { await U.wait(700); return this.over(r); }
    this.afterThrow();
  },
  async fleeOut(text) {
    const st = this.st; if (!st) return;
    st.phase = 'done';
    Sfx.play('flee');
    this.flash(text);
    st.creatureEl.classList.add('flee');
    await this.anim(700, p => { st.k = 1 - p; st.cy0 -= 2; });
    await U.wait(700);
    this.end('fled');
  },
  // Пойман: сервер уже записал духа и награду, здесь — только показ
  async success(r) {
    const st = this.st, { s, sp } = st;
    st.phase = 'done';
    Sfx.play('catch'); U.vibrate([30, 60, 30, 60, 80]);
    st.$('.enc-fx').appendChild(U.el(`<div class="fx-stars" style="left:${st.ball.x}px;top:${st.ball.y}px">${'<i></i>'.repeat(10)}</div>`));
    await U.wait(900);
    if (!this.st) return;
    const mine = S.findSpirit(r.uid) || sp;
    const card = U.el(`
      <div class="enc-result"><div class="res-card">
        <div class="res-title">Пойман!</div>
        <div class="res-art">${Art.of(mine)}</div>
        <div class="res-name">${mine.shiny ? '✦ ' : ''}${s.name}</div>
        <div class="res-power">СИЛА ${S.power(mine)}</div>
        ${r.isNew ? '<div class="badge-new">Новая запись в Бестиарии!</div>' : ''}
        ${mine.shiny ? '<div class="badge-new shiny">Сияющий дух — редкая удача!</div>' : ''}
        <div class="res-rw">
          <div><b>+${U.fmtNum(r.xp)}</b> опыта${Ev.xpMul() > 1 ? ' (Звездопад ×2)' : ''}</div><div><b>+${r.sparks}</b> искр</div><div><b>+${r.ess}</b> эссенции «${SP[s.fam].name}»</div>
        </div>
        <button class="btn primary wide">Отлично</button>
      </div></div>`);
    card.querySelector('button').onclick = () => { Sfx.play('tap'); this.end('caught'); };
    st.root.appendChild(card);
    if (st.o.tut) Tut.sync();
  },
  /* ---------------- ФОТО ---------------- */
  // Снимок: кадр камеры (в AR) или сцена + дух + подпись; превью, «Поделиться», запись в альбом
  async photo() {
    const st = this.st;
    if (!st || st.phase === 'capture' || st.phase === 'done' || this._shooting) return;
    this._shooting = true;
    try {
      const W = st.W, H = st.H, k = Math.min(2, 1080 / W);
      const c = document.createElement('canvas');
      c.width = Math.round(W * k); c.height = Math.round(H * k);
      const g = c.getContext('2d');
      g.scale(k, k);
      const v = st.$('.enc-cam');
      if (st.stream && v.videoWidth) {
        const s = Math.max(W / v.videoWidth, H / v.videoHeight);
        g.drawImage(v, (W - v.videoWidth * s) / 2, (H - v.videoHeight * s) / 2, v.videoWidth * s, v.videoHeight * s);
      } else {
        const night = document.body.classList.contains('night');
        const sky = g.createLinearGradient(0, 0, 0, H);
        (night ? [[0, '#0b0628'], [0.45, '#2e1065'], [0.57, '#3b3b6e'], [1, '#1e293b']] : [[0, '#7dd3fc'], [0.45, '#bae6fd'], [0.58, '#d9f99d'], [1, '#65a30d']])
          .forEach(([o, col]) => sky.addColorStop(o, col));
        g.fillStyle = sky; g.fillRect(0, 0, W, H);
        const gr = g.createRadialGradient(W / 2, H * 0.565, 0, W / 2, H * 0.565, W * 0.45);
        gr.addColorStop(0, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(W / 2, H * 0.565, W * 0.45, 35, 0, 0, Math.PI * 2); g.fill();
      }
      const size = st.size * st.k;
      const svg = Art.of(st.sp).replace('<svg class="art"', `<svg width="${Math.round(size * 2)}" height="${Math.round(size * 2)}"`);
      const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
      g.drawImage(img, st.cx - size / 2, st.cy - size / 2, size, size);
      // подпись
      g.fillStyle = 'rgba(18,12,36,.72)'; g.fillRect(0, H - 60, W, 60);
      g.fillStyle = '#fde047'; g.font = '900 20px Rubik, sans-serif';
      g.fillText(`${st.sp.shiny ? '✦ ' : ''}${st.s.name} · СИЛА ${S.power(st.sp)}`, 16, H - 34);
      g.fillStyle = '#e2dcf7'; g.font = '500 13px Rubik, sans-serif';
      g.fillText(`Духолов · Ловчий ${S.d.name} · ${new Date().toLocaleDateString('ru-RU')}`, 16, H - 14);
      // вспышка
      Sfx.play('hit'); U.vibrate(30);
      const fl = st.$('.enc-flash'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
      const t = document.createElement('canvas'); t.width = 360; t.height = Math.round(360 * H / W);
      t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
      Album.add({ img: t.toDataURL('image/jpeg', 0.72), sid: st.s.id, t: Date.now() });
      Game.act('photo').catch(() => {}); // задание «сфотографируй духа» засчитывает сервер
      Album.preview(blob, `${st.s.name}.jpg`);
    } catch (e) { UI.toast('Не удалось сделать снимок'); }
    this._shooting = false;
  },

  /* ---------------- КАМЕРА ---------------- */
  async startCam() {
    const st = this.st; if (!st) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (!this.st || !Cfg.s.ar) { stream.getTracks().forEach(t => t.stop()); return; }
      st.stream = stream;
      const v = st.$('.enc-cam'); v.srcObject = stream; v.play().catch(() => {});
      st.root.classList.add('ar');
    } catch (e) {
      UI.toast('Камера недоступна — AR выключен');
      Cfg.s.ar = false; Cfg.save();
      st.$('.enc-ar').classList.remove('on');
    }
  },
  stopCam() {
    const st = this.st; if (!st) return;
    if (st.stream) st.stream.getTracks().forEach(t => t.stop());
    st.stream = null; st.tilt = 0;
    st.root.classList.remove('ar');
  },

  run() {
    const st = this.st; if (!st) return;
    if (st.phase === 'capture') return;
    if (st.o.mode === 'raid' && st.phase !== 'done') {
      UI.confirm('Уйти?', 'Если уйти, дух из разлома будет потерян.', 'Уйти', () => this.end('run'), 'Остаться');
      return;
    }
    this.end('run');
  },
  end(result) {
    const st = this.st; if (!st) return;
    this.stopCam();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('deviceorientation', this._onTilt);
    st.root.classList.add('closing');
    setTimeout(() => st.root.remove(), 250);
    this.st = null;
    if (result !== 'caught' && result !== 'fled' && result !== 'noCharms') Game.act('encEnd').catch(() => {});
    UI.popLayer();
    MapView.refresh();
    UI.refreshHud();
    UI.flushLevelUps();
    if (st.o.onEnd) st.o.onEnd(result);
  },
};
