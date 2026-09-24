'use strict';
/* Капища Ордена: поединок 3 на 3 с хранителем.
   Тап — быстрая атака (копит энергию), «Приём» — особая атака с мини-игрой,
   у каждой стороны 2 щита, духа можно сменить (перезарядка 25 с). */

const Duel = {
  st: null,
  FAST: 6, CHARGE: 65, COST: 50, TIME: 180, HPX: 3, SWITCH_CD: 25,

  shieldSvg: '<svg viewBox="0 0 24 24" class="shd"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#5eead4" stroke="#0f766e" stroke-width="1.5"/></svg>',

  open(e) {
    const hold = Clans.info(e.id), mine = !!(hold && S.d.clan && hold.clan === S.d.clan);
    const g = W.guardian(e), T = SHRINE_TIERS[e.tier], mul = Ev.duelMul();
    let team = S.team();
    const holders = hold ? hold.holders.filter(h => h.sp && SP[h.sp.sid]) : [];
    const who = hold
      ? `<div class="guard"><div class="guard-ava clan" style="--cc:${CLANS[hold.clan].color}">${Art.guardian(CLANS[hold.clan].color)}</div><div><b>${CLANS[hold.clan].name}</b><small>держит Капище с ${new Date(hold.since).toLocaleDateString('ru-RU')} · защитников: ${holders.length} из ${HOLD_MAX}</small></div></div>
         <div class="rift-team-title">Защитники</div>
         <div class="holders">${holders.map(h => `<div class="mini">${Art.imgOf(h.sp)}<b>${S.power(h.sp)}</b><small>${U.esc(h.name || 'Ловчий')}</small></div>`).join('')}</div>`
      : `<div class="guard"><div class="guard-ava">${Art.guardian(g.color)}</div><div><b>${g.name}</b><small>Хранитель · ${g.title}</small></div></div>
         <div class="rift-team-title">Духи хранителя</div>
         <div class="rift-team">${UI.teamHtml(g.team)}</div>`;
    const canClan = !S.d.clan && S.d.level >= CLAN_LEVEL;
    let action;
    if (mine) action = `<div class="rift-tip">Капище держит твоя дружина. Поставь сюда своего защитника — и получай дань каждый день.</div>
        <button class="btn primary wide defend-go" ${holders.length >= HOLD_MAX ? 'disabled' : ''}>Поставить защитника</button>`;
    else if (e.won) action = `<div class="rift-done">Сегодня ты уже победил здесь.${S.d.clan ? '' : ' Завтра будет новый бой.'}</div>
        ${S.d.clan && !hold ? '<button class="btn primary wide defend-go">Поставить защитника</button>' : ''}`;
    else action = `
        <div class="rift-team-title">Твоя команда <button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team my">${UI.teamHtml(team)}</div>
        <div class="rift-tip">${hold ? 'Победа освободит Капище от защитников. ' : ''}Награда: ${U.fmtNum(T.xp * mul)} опыта, ✦ ${U.fmtNum(T.sparks * mul)} и предметы${mul > 1 ? ' (Неделя поединков ×2)' : ''}</div>
        <button class="btn primary wide duel-go" ${team.length ? '' : 'disabled'}>Бросить вызов</button>${Rules.dayLine(S.d, 'duels', 'Побед на Капищах')}`;
    const html = `
      <div class="shrine-view t${e.tier}">
        ${Poi.photoUrl(e.photo) ? `<div class="place-photo" style="background-image:url('${Poi.photoUrl(e.photo)}')"></div>` : `<div class="shrine-idol">${Art.shrineIcon(e.tier, e.won)}</div>`}
        <div class="rift-title">${U.esc(e.name)} <span class="stars">${'★'.repeat(e.tier)}</span></div>
        <div class="rift-meta">Капище ${e.god}${hold ? ' · ' + Clans.badge(hold.clan, true) : ''}</div>
        ${who}
        ${action}
        ${canClan ? '<button class="btn ghost wide clan-go">Выбрать дружину</button>' : ''}
      </div>`;
    const scr = UI.screen('Капище', html, 'shrine-screen');
    const go = scr.querySelector('.duel-go');
    if (go) go.onclick = async () => {
      if (this.st || this._starting) return;
      this._starting = true;
      const r = await Game.try('duelStart', { shrine: { id: e.id, lat: e.lat, lng: e.lng, name: e.name } });
      this._starting = false;
      if (!r) return;
      UI.closeScreen(scr);
      // защитники дружины — вместо хранителя
      const foe = r.foe ? { name: CLANS[r.clan].name, color: CLANS[r.clan].color, title: 'Защитники Капища', team: r.foe } : g;
      this.start({ ...e, kind: 'shrine', held: r.clan || null }, foe, S.team());
    };
    const def = scr.querySelector('.defend-go');
    if (def) def.onclick = () => Clans.defend(e, () => { UI.closeScreen(scr); this.open(W.shrineFor(e, e.d)); });
    const cg = scr.querySelector('.clan-go');
    if (cg) cg.onclick = () => Clans.choose(() => { UI.closeScreen(scr); this.open(W.shrineFor(e, e.d)); });
    const edit = scr.querySelector('.team-edit');
    if (edit) edit.onclick = () => UI.pickTeam(() => { team = S.team(); scr.querySelector('.rift-team.my').innerHTML = UI.teamHtml(team); });
    Clans.refresh(); // сводка могла устареть
  },

  // Захваченный родник: поединок с прислужником Нави
  openInvasion(e) {
    const g = W.grunt(e);
    let team = S.team();
    const html = `
      <div class="shrine-view invasion">
        <div class="shrine-idol">${Art.springIcon(false, true)}</div>
        <div class="rift-title">Родник «${U.esc(e.name)}» захвачен Навью!</div>
        <div class="guard"><div class="guard-ava dark">${Art.guardian(g.color)}</div><div><b>${g.name}</b><small>${g.title}</small></div></div>
        <div class="grunt-quote">«${g.quote}»</div>
        <div class="rift-team-title">Омрачённые духи</div>
        <div class="rift-team">${UI.teamHtml(g.team)}</div>
        <div class="rift-team-title">Твоя команда <button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team my">${UI.teamHtml(team)}</div>
        <div class="rift-tip">Слабость отряда: ${ELEMENT_KEYS.filter(x => ELEMENTS[x].beats.includes(g.el)).map(x => `${Art.elIcon(x, 16)} ${ELEMENTS[x].name}`).join(' ')}</div>
        <div class="rift-tip">Победа освободит родник и позволит спасти одного из омрачённых духов.</div>
        <button class="btn primary wide duel-go" ${team.length ? '' : 'disabled'}>Сразиться</button>
        ${Rules.dayLine(S.d, 'invasions', 'Вторжений отбито')}
      </div>`;
    const scr = UI.screen('Вторжение Нави', html, 'shrine-screen invasion-screen');
    scr.querySelector('.duel-go').onclick = async () => {
      if (!await this.begin('invStart', { spring: { id: e.id, lat: e.lat, lng: e.lng, name: e.name } })) return;
      UI.closeScreen(scr);
      this.start({ ...e, kind: 'invasion', tier: 1, T: { speed: 0.75, shield: 0.5 } }, g, S.team());
    };
    scr.querySelector('.team-edit').onclick = () => UI.pickTeam(() => { team = S.team(); scr.querySelector('.rift-team.my').innerHTML = UI.teamHtml(team); });
  },

  // Поединок с другом: его сильнейшие духи под управлением игры (команду присылает сервер)
  openSpar(f, top) {
    let team = S.team();
    const today = f.spar === U.today();
    const html = `
      <div class="shrine-view spar">
        <div class="guard"><div class="guard-ava">${Art.avatar(f.look || undefined)}</div><div><b>${U.esc(f.name)}</b><small>Дружеский поединок</small></div></div>
        <div class="rift-team-title">Сильнейшие духи друга</div>
        <div class="rift-team">${UI.teamHtml(top)}</div>
        <div class="rift-team-title">Твоя команда <button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team my">${UI.teamHtml(team)}</div>
        <div class="rift-tip">${today ? 'Награда за сегодня уже получена — сейчас это тренировка (+100 опыта за победу).' : 'Награда за первую победу за день: 800 опыта, ✦ 500, обереги и мёд, +1 ★ дружбы.'}</div>
        <button class="btn primary wide duel-go" ${team.length ? '' : 'disabled'}>Сразиться</button>
      </div>`;
    const scr = UI.screen('Поединок с другом', html, 'shrine-screen');
    scr.querySelector('.duel-go').onclick = async () => {
      if (this.st || this._starting) return;
      this._starting = true;
      const r = await Game.try('sparStart', { pid: f.id });
      this._starting = false;
      if (!r) return;
      UI.closeScreen(scr);
      const color = (r.look && r.look.cloak) || GUARD_COLORS[Math.floor(U.h(f.id) * GUARD_COLORS.length)];
      this.start({ kind: 'spar', name: f.name, T: { speed: 0.72, shield: 0.6 } }, { name: U.esc(r.name), color, team: r.foe }, S.team());
    };
    scr.querySelector('.team-edit').onclick = () => UI.pickTeam(() => {
      team = S.team();
      scr.querySelector('.rift-team.my').innerHTML = UI.teamHtml(team);
      scr.querySelector('.duel-go').disabled = !team.length;
    });
  },

  // Начало боя отмечает сервер (он же проверит правдоподобие победы в конце)
  async begin(type, args) {
    if (this.st || this._starting) return false;
    this._starting = true;
    const ok = await Game.try(type, args);
    this._starting = false;
    return !!ok;
  },
  endType(kind) { return kind === 'invasion' ? 'invEnd' : kind === 'league' ? 'leagueEnd' : kind === 'spar' ? 'sparEnd' : 'duelEnd'; },

  fighter(sp) {
    const x = S.battle(sp);
    return { sp, atk: x.atk, def: x.def, max: x.hp * this.HPX, cur: x.hp * this.HPX, energy: 0, emul: x.energy, el: SP[sp.sid].el, power: x.power };
  },

  start(e, g, team) {
    const root = U.el(`
      <div class="raid duel">
        <div class="raid-bg duel-bg"></div>
        <div class="raid-top duel-top">
          <div class="raid-timer">${this.TIME}</div>
          <div class="duel-foe-hud">
            <div class="duel-guard"><div class="guard-ava sm">${Art.guardian(g.color)}</div><b>${g.name}</b></div>
            <div class="duel-name foe-name"></div>
            <div class="bar boss"><i></i></div>
            <div class="duel-meta"><span class="shields foe-sh"></span><span class="raid-team foe-dots"></span></div>
          </div>
        </div>
        <div class="duel-foe"></div>
        <div class="raid-me duel-me"></div>
        <div class="raid-fx"></div>
        <div class="raid-hud">
          <div class="raid-mname"></div>
          <div class="bar hp"><i></i></div>
          <div class="duel-meta"><span class="shields my-sh"></span><span class="raid-team my-dots"></span></div>
        </div>
        <div class="raid-ctrl">
          <button class="duel-switch"><span>Смена</span><em></em></button>
          <button class="duel-special2 hidden"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fill"/></svg><span></span></button>
          <button class="raid-special"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fill"/></svg><span>Приём</span></button>
          <div class="duel-energy"></div>
        </div>
        <div class="raid-hint">Тапай — быстрая атака, она копит энергию.<br>Полная шкала — жми «Приём». Щиты берегут от приёмов хранителя.</div>
        <div class="duel-ov hidden"></div>
        <div class="raid-count">3</div>
      </div>`);
    document.body.appendChild(root);
    Music.play('battle');
    const $ = s => root.querySelector(s);
    const st = this.st = {
      e, g, T: e.T || SHRINE_TIERS[e.tier], root, $, time: this.TIME, paused: true, over: false,
      // e.carry — бойцы из прошлого боя турнира (раны не лечатся)
      me: { team: e.carry || team.map(sp => this.fighter(sp)), idx: Math.max(0, (e.carry || []).findIndex(f => f.cur > 0)), shields: 2, busy: 0, cd: 0 },
      foe: { team: g.team.map(sp => this.fighter(sp)), idx: 0, shields: 2, busy: 1.5 },
    };
    UI.pushLayer(() => this.quit());

    let sid = null;
    root.addEventListener('pointerdown', ev => {
      if (ev.target.closest('button') || ev.target.closest('.duel-ov')) return;
      sid = ev.pointerId;
    });
    root.addEventListener('pointerup', ev => {
      if (ev.pointerId !== sid) return;
      sid = null;
      this.fast();
    });
    $('.raid-special').onclick = () => this.myCharge('charge');
    $('.duel-special2').onclick = () => this.myCharge('charge2');
    $('.duel-switch').onclick = () => this.switchMenu(false);

    this.showSide('me'); this.showSide('foe');
    this.render();
    (async () => {
      for (let i = 3; i > 0; i--) { $('.raid-count').textContent = i; Sfx.play('tap'); await U.wait(650); if (this.st !== st) return; }
      $('.raid-count').textContent = 'Бой!';
      await U.wait(450);
      $('.raid-count').remove();
      st.paused = false;
      let last = performance.now();
      const loop = t => { if (this.st !== st || st.over) return; this.tick(Math.min(0.05, (t - last) / 1000)); last = t; requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    })();
  },

  cur(side) { const s = this.st[side]; return s.team[s.idx]; },
  showSide(side) {
    const st = this.st, f = this.cur(side);
    const box = st.$(side === 'me' ? '.duel-me' : '.duel-foe');
    box.innerHTML = Art.of(f.sp);
    box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap');
    const label = `${Art.elIcon(f.el, 16)} ${U.esc(f.sp.nick || SP[f.sp.sid].name)} <small>СИЛА ${f.power}</small>`;
    st.$(side === 'me' ? '.raid-mname' : '.foe-name').innerHTML = label;
  },

  tick(dt) {
    const st = this.st;
    if (st.paused || st.over) return;
    st.time -= dt; st.me.busy -= dt; st.me.cd -= dt; st.foe.busy -= dt;
    if (st.time <= 0) { st.time = 0; return this.finish(this.hpShare('me') >= this.hpShare('foe')); }
    if (st.foe.busy <= 0) {
      const f = this.cur('foe'), m = this.cur('me');
      if (f.energy >= this.COST && (Math.random() < 0.45 || m.cur < m.max * 0.35)) this.foeCharge();
      else { this.foeFast(); st.foe.busy = st.T.speed + Math.random() * 0.25; }
    }
    this.render();
  },
  hpShare(side) { const t = this.st[side].team; return t.reduce((a, f) => a + Math.max(0, f.cur) / f.max, 0) / t.length; },

  hit(side, n, cls) {
    const st = this.st, box = st.$(side === 'me' ? '.duel-me' : '.duel-foe');
    box.classList.remove('hit'); void box.offsetWidth; box.classList.add('hit');
    const r = box.getBoundingClientRect();
    const fl = U.el(`<div class="dmg ${cls || ''}" style="left:${r.left + r.width * (0.3 + Math.random() * 0.4)}px;top:${r.top + r.height * 0.25}px">${n}</div>`);
    st.$('.raid-fx').appendChild(fl);
    setTimeout(() => fl.remove(), 900);
  },

  fast() {
    const st = this.st;
    if (!st || st.paused || st.over || st.me.busy > 0) return;
    const m = this.cur('me'), f = this.cur('foe');
    st.me.busy = 0.5;
    m.energy = Math.min(100, m.energy + 7 * (m.emul || 1));
    const n = Raid.dmg(m.atk, f.def, this.FAST, m.el, f.el);
    f.cur -= n;
    Sfx.play('attack');
    const me = st.$('.duel-me'); me.classList.remove('atk'); void me.offsetWidth; me.classList.add('atk');
    this.hit('foe', n);
    if (f.cur <= 0) this.faint('foe');
    this.render();
  },
  foeFast() {
    const st = this.st, m = this.cur('me'), f = this.cur('foe');
    f.energy = Math.min(100, f.energy + 7);
    const n = Raid.dmg(f.atk, m.def, this.FAST, f.el, m.el);
    m.cur -= n;
    this.hit('me', `−${n}`, 'hurt');
    if (m.cur <= 0) this.faint('me');
  },

  overlay(html) {
    const ov = this.st.$('.duel-ov');
    ov.innerHTML = html; ov.classList.remove('hidden');
    return ov;
  },
  closeOverlay() { const ov = this.st.$('.duel-ov'); ov.classList.add('hidden'); ov.innerHTML = ''; },

  // Особый приём игрока: 2,2 секунды тапай по сфере — чем больше тапов, тем сильнее удар
  async myCharge(kind = 'charge') {
    const st = this.st;
    if (!st || st.paused || st.over) return;
    const m = this.cur('me'), f = this.cur('foe');
    const mv = MOVES[kind];
    if (kind === 'charge2' && !m.sp.move2) return;
    if (m.energy < mv.cost) { UI.toast('Мало энергии — атакуй тапами'); return; }
    m.energy -= mv.cost;
    st.paused = true;
    Sfx.play('special');
    const col = ELEMENTS[m.el].color;
    const ov = this.overlay(`<div class="charge-mini"><div class="charge-title">${ELEMENTS[m.el][kind]}</div><button class="charge-orb" style="--c:${col}"><span>Тапай!</span></button><div class="pbar"><i></i></div></div>`);
    let taps = 0;
    const orb = ov.querySelector('.charge-orb'), bar = ov.querySelector('.pbar i');
    orb.addEventListener('pointerdown', () => {
      taps++; Sfx.play('tap'); U.vibrate(8);
      orb.style.transform = `scale(${1 + Math.min(taps, 14) * 0.035})`;
      bar.style.width = Math.min(100, taps / 12 * 100) + '%';
    });
    await U.wait(2200);
    if (this.st !== st) return;
    const mult = 0.55 + 0.45 * Math.min(1, taps / 12);
    this.closeOverlay();
    const T = st.T;
    const shield = st.foe.shields > 0 && Math.random() < T.shield * (f.cur < f.max * 0.5 ? 1.2 : 0.9);
    let n;
    if (shield) {
      st.foe.shields--; n = 1;
      this.hit('foe', 'Щит!', 'dodged');
    } else {
      n = Raid.dmg(m.atk, f.def, mv.power * mult, m.el, f.el);
      st.root.style.setProperty('--fx', col);
      st.root.classList.remove('flash'); void st.root.offsetWidth; st.root.classList.add('flash');
      this.hit('foe', n, 'big');
      Sfx.element(m.el);
      U.vibrate(60);
    }
    f.cur -= n;
    st.paused = false;
    if (f.cur <= 0) this.faint('foe');
    this.render();
  },

  // Особый приём хранителя: 2,5 секунды на решение — ставить щит или нет
  foeCharge() {
    const st = this.st, f = this.cur('foe');
    f.energy -= this.COST;
    st.paused = true;
    Sfx.play('warn'); U.vibrate([30, 40, 30]);
    const has = st.me.shields > 0;
    const ov = this.overlay(`<div class="shield-q">
      <div class="charge-title">${st.g.name}: «${ELEMENTS[f.el].charge}»!</div>
      <div class="shield-timer"><i></i></div>
      <div class="shield-btns">
        <button class="btn primary sh-yes" ${has ? '' : 'disabled'}>${this.shieldSvg} Щит (${st.me.shields})</button>
        <button class="btn sh-no">Принять удар</button>
      </div></div>`);
    let done = false;
    const resolve = useShield => {
      if (done || this.st !== st) return;
      done = true;
      this.closeOverlay();
      const m = this.cur('me');
      let n;
      if (useShield && st.me.shields > 0) { st.me.shields--; n = 1; this.hit('me', 'Щит!', 'dodged'); Sfx.play('hit'); }
      else {
        n = Raid.dmg(f.atk, m.def, this.CHARGE, f.el, m.el);
        this.hit('me', `−${n}`, 'hurt');
        Sfx.play('hurt'); Sfx.element(f.el, true); U.vibrate(90);
        st.root.classList.remove('shake'); void st.root.offsetWidth; st.root.classList.add('shake');
      }
      m.cur -= n;
      st.foe.busy = st.T.speed;
      st.paused = false;
      if (m.cur <= 0) this.faint('me');
      this.render();
    };
    ov.querySelector('.sh-yes').onclick = () => resolve(true);
    ov.querySelector('.sh-no').onclick = () => resolve(false);
    setTimeout(() => resolve(false), 2500);
  },

  faint(side) {
    const st = this.st, s = st[side];
    const next = s.team.findIndex(x => x.cur > 0);
    if (next < 0) return this.finish(side === 'foe');
    if (side === 'foe') {
      st.paused = true;
      setTimeout(() => {
        if (this.st !== st || st.over) return;
        s.idx = next; s.busy = 1.2;
        this.showSide('foe');
        UI.toast(`${st.g.name} призывает: ${SP[this.cur('foe').sp.sid].name}`);
        st.paused = false;
        this.render();
      }, 900);
    } else {
      this.switchMenu(true);
    }
    this.render();
  },

  // Смена духа: добровольно (с перезарядкой) или после поражения текущего
  switchMenu(forced) {
    const st = this.st;
    if (!st || st.over || (st.paused && !forced)) return;
    if (!forced && st.me.cd > 0) { UI.toast(`Смена будет доступна через ${Math.ceil(st.me.cd)} с`); return; }
    const opts = st.me.team.map((f, i) => ({ f, i })).filter(x => x.f.cur > 0 && x.i !== st.me.idx);
    if (!opts.length) { if (!forced) UI.toast('Некого выпустить'); return; }
    st.paused = true;
    const ov = this.overlay(`<div class="switch-q"><div class="charge-title">${forced ? 'Дух без сил! Кого выпустить?' : 'Сменить духа'}</div>
      <div class="rift-team">${opts.map(x => `<button class="mini" data-i="${x.i}">${Art.of(x.f.sp)}<b>${Math.round(x.f.cur / x.f.max * 100)}%</b></button>`).join('')}</div>
      ${forced ? '' : '<button class="btn ghost sw-cancel">Отмена</button>'}</div>`);
    const pick = i => {
      if (this.st !== st) return;
      clearTimeout(timer);
      this.closeOverlay();
      st.me.idx = i;
      if (!forced) st.me.cd = this.SWITCH_CD;
      st.me.busy = 0.3;
      this.showSide('me');
      st.paused = false;
      this.render();
    };
    ov.querySelectorAll('[data-i]').forEach(b => b.onclick = () => pick(+b.dataset.i));
    const c = ov.querySelector('.sw-cancel');
    if (c) c.onclick = () => { clearTimeout(timer); this.closeOverlay(); st.paused = false; };
    const timer = forced ? setTimeout(() => pick(opts[0].i), 6000) : null;
  },

  render() {
    const st = this.st; if (!st) return;
    const m = this.cur('me'), f = this.cur('foe');
    st.$('.raid-timer').textContent = Math.ceil(st.time);
    st.$('.bar.boss i').style.width = Math.max(0, f.cur / f.max * 100) + '%';
    st.$('.bar.hp i').style.width = Math.max(0, m.cur / m.max * 100) + '%';
    const sh = n => this.shieldSvg.repeat(n) + '<i class="shd-empty"></i>'.repeat(2 - n);
    st.$('.my-sh').innerHTML = sh(st.me.shields);
    st.$('.foe-sh').innerHTML = sh(st.foe.shields);
    const dots = s => st[s].team.map((x, i) => `<i class="${x.cur <= 0 ? 'dead' : i === st[s].idx ? 'on' : ''}"></i>`).join('');
    st.$('.my-dots').innerHTML = dots('me');
    st.$('.foe-dots').innerHTML = dots('foe');
    const circ = 2 * Math.PI * 44, fill = st.$('.raid-special .fill');
    fill.style.strokeDasharray = circ;
    fill.style.strokeDashoffset = circ * (1 - Math.min(1, m.energy / this.COST));
    fill.style.stroke = ELEMENTS[m.el].color;
    st.$('.raid-special').classList.toggle('ready', m.energy >= this.COST);
    // второй приём (если выучен): дешевле, слабее
    const b2 = st.$('.duel-special2');
    b2.classList.toggle('hidden', !m.sp.move2);
    if (m.sp.move2) {
      const f2 = b2.querySelector('.fill');
      f2.style.strokeDasharray = circ;
      f2.style.strokeDashoffset = circ * (1 - Math.min(1, m.energy / MOVES.charge2.cost));
      f2.style.stroke = ELEMENTS[m.el].color;
      b2.classList.toggle('ready', m.energy >= MOVES.charge2.cost);
      b2.querySelector('span').textContent = ELEMENTS[m.el].charge2;
    }
    st.$('.duel-energy').textContent = `⚡ ${Math.floor(m.energy)}`;
    const sw = st.$('.duel-switch');
    sw.classList.toggle('cool', st.me.cd > 0);
    sw.querySelector('em').textContent = st.me.cd > 0 ? Math.ceil(st.me.cd) : '';
  },

  async finish(win) {
    const st = this.st;
    if (!st || st.over) return;
    st.over = true;
    this.closeOverlay();
    await U.wait(500);
    if (this.st !== st) return;
    let html;
    if (st.e.kind === 'league') return League.afterDuel(win, st);
    // итог боя проверяет сервер: победа засчитывается, если команда могла нанести столько урона за это время
    let r = null;
    try { r = await Game.act(this.endType(st.e.kind), { win: !!win }); } catch (e) { if (win) UI.toast(U.esc(e.message)); }
    if (this.st !== st) return;
    if (win && !(r && r.win)) {
      html = `<div class="res-title lose">Победа не засчитана</div>
        <div class="res-note">Сервер не подтвердил этот бой. Проверь интернет и попробуй снова.</div>`;
      const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn wide">На карту</button></div></div>`);
      res.querySelector('button').onclick = () => this.close();
      st.root.appendChild(res);
      return;
    }
    if (st.e.kind === 'invasion') return this.finishInvasion(win, r);
    if (st.e.kind === 'spar') return this.finishSpar(win, r);
    if (win) {
      Sfx.play('win'); U.vibrate([50, 50, 50, 50, 120]);
      const rw = r.rw;
      const note = r.clan
        ? (r.freed ? `Защитники «${CLANS[r.clan].name}» отступили — Капище «${U.esc(st.e.name)}» свободно!` : `Победа засчитана, но пока шёл бой, на Капище сменились защитники.`)
        : `«Достойно, Ловчий», — ${st.g.name} склоняет голову. Капище «${U.esc(st.e.name)}» освящено тобой до конца дня.`;
      const canDefend = S.d.clan && (!r.clan || r.freed);
      html = `<div class="res-title">Победа!</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(st.g.color)}</div></div>
        <div class="res-note">${note}${canDefend ? ' Поставь своего защитника — и Капище перейдёт твоей дружине.' : ''}</div>
        <div class="res-rw">${rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${x.label}</div>`).join('')}</div>
        ${canDefend ? '<button class="btn primary wide defend-now">Поставить защитника</button>' : ''}`;
      if (r.clan) Clans.refresh(true);
    } else {
      Sfx.play('lose');
      html = `<div class="res-title lose">Поражение</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(st.g.color)}</div></div>
        <div class="res-note">«Приходи, когда окрепнешь», — говорит ${st.g.name}. Попробуй другую команду: смотри на стихии хранителя и береги щиты для его приёмов.</div>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn ${html.includes('defend-now') ? 'ghost' : 'primary'} wide to-map">На карту</button></div></div>`);
    res.querySelector('.to-map').onclick = () => this.close();
    const dn = res.querySelector('.defend-now');
    if (dn) dn.onclick = () => { const e = st.e; this.close(); Clans.defend(e); };
    st.root.appendChild(res);
    UI.refreshHud();
  },
  finishSpar(win, r) {
    const st = this.st, g = st.g;
    let html;
    if (win) {
      Sfx.play('win'); U.vibrate([50, 50, 120]);
      html = `<div class="res-title">Победа!</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(g.color)}</div></div>
        <div class="res-note">${r.practice ? `Хорошая тренировка! Награда за поединок с ${g.name} сегодня уже получена.` : `${g.name} жмёт тебе руку: «Честный бой!» Дружба крепнет.`}</div>
        <div class="res-rw">${r.rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${x.label}</div>`).join('')}${r.practice ? '' : '<div><b>+1 ★</b> дружбы</div>'}</div>`;
    } else {
      Sfx.play('lose');
      html = `<div class="res-title lose">Поражение</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(g.color)}</div></div>
        <div class="res-note">Духи ${g.name} оказались сильнее. Подбери команду против их стихий и попробуй снова — поединки с другом не ограничены.</div>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn primary wide">Готово</button></div></div>`);
    res.querySelector('button').onclick = () => this.close();
    st.root.appendChild(res);
    UI.refreshHud();
  },
  finishInvasion(win, r) {
    const st = this.st, e = st.e, g = st.g;
    let html, rescue = null;
    if (win) {
      Sfx.play('win'); U.vibrate([50, 50, 50, 50, 120]);
      const rw = r.rw;
      rescue = g.team.find(x => x.sid === r.rescue.sid) || g.team[0];
      html = `<div class="res-title">Родник освобождён!</div>
        <div class="res-art">${Art.of(rescue)}</div>
        <div class="res-note">Прислужник растворился в тумане. Один из его духов — омрачённый ${SP[rescue.sid].name} — остался рядом. Его ещё можно спасти!</div>
        <div class="res-rw">${rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${x.label}</div>`).join('')}</div>
        <button class="btn primary wide rescue">Спасти духа</button>`;
    } else {
      Sfx.play('lose');
      html = `<div class="res-title lose">Навь сильнее… пока</div>
        <div class="res-art"><div class="guard-ava big dark">${Art.guardian(g.color)}</div></div>
        <div class="res-note">«${GRUNT_QUOTES[0]}» — смеётся прислужник. Возьми духов, сильных против стихии «${ELEMENTS[g.el].name}», и возвращайся.</div>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn wide to-map">На карту</button></div></div>`);
    res.querySelector('.to-map').onclick = () => this.close();
    const rb = res.querySelector('.rescue');
    if (rb) rb.onclick = () => {
      this.close();
      Encounter.start({ mode: 'rescue', seed: e.invId + ':rescue' });
    };
    st.root.appendChild(res);
    UI.refreshHud();
  },

  quit() {
    const st = this.st; if (!st) return;
    if (st.over) return this.close();
    UI.confirm('Сдаться?', 'Поединок будет проигран.', 'Сдаться', () => this.close(), 'Продолжить');
  },
  close() {
    const st = this.st; if (!st) return;
    // сдался или вышел до конца боя — это поражение
    if (!st.over) {
      Game.act(this.endType(st.e.kind), { win: false, board: Cfg.s.cloud !== false }).catch(() => {});
      if (st.e.kind === 'league') League.carry = null;
    }
    st.over = true;
    st.root.remove();
    this.st = null;
    UI.popLayer();
    Music.play('map');
    MapView.refresh();
    UI.flushLevelUps();
  },
};
