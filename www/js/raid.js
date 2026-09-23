'use strict';
/* Разломы: битва с боссом (тап — атака, свайп/кнопка — уклон), затем поимка босса */

const Raid = {
  TIER: {
    // slvl — уровень, по которому считаются атака/защита босса; lvl — уровень пойманного босса
    1: { hp: 600,  slvl: 14, lvl: 15, pw: 10, charms: 6, name: 'Малый разлом' },
    2: { hp: 1800, slvl: 22, lvl: 22, pw: 16, charms: 7, name: 'Разлом' },
    3: { hp: 4500, slvl: 28, lvl: 30, pw: 24, charms: 9, name: 'Великий разлом' },
  },
  st: null,

  team() { return S.team(); },
  bossStats(r) {
    const T = this.TIER[r.tier], b = SP[r.boss].base, c = S.cpm(T.slvl);
    return { atk: (b[0] + 15) * c, def: (b[1] + 15) * c, hp: T.hp };
  },
  eff(att, def) {
    if (ELEMENTS[att].beats.includes(def)) return 1.6;
    if (ELEMENTS[def].beats.includes(att)) return 0.625;
    return 1;
  },

  open(r) {
    const s = SP[r.boss], T = this.TIER[r.tier];
    let team = this.team();
    const counters = SPECIES.filter(x => ELEMENTS[x.el].beats.includes(s.el)).map(x => x.el).filter((v, i, a) => a.indexOf(v) === i);
    const html = `
      <div class="rift-view t${r.tier}">
        <div class="rift-portal">${Art.riftIcon(r.tier)}</div>
        <div class="rift-boss">${Art.spirit(r.boss)}</div>
        <div class="rift-title">${T.name} <span class="stars">${'★'.repeat(r.tier)}</span></div>
        <div class="rift-name">${Art.elIcon(s.el, 20)} ${s.name}</div>
        ${r.place ? `<div class="rift-meta">Разлом открылся у «${U.esc(r.place)}»</div>` : ''}
        <div class="rift-meta">Сила босса ≈ ${U.fmtNum(T.hp * 1.5)} · закроется через ${U.fmtTime(r.endsAt - Date.now())}</div>
        <div class="rift-tip">Слабость: ${counters.map(e => `${Art.elIcon(e, 16)} ${ELEMENTS[e].name}`).join(' ')}</div>
        ${Sky.w ? `<div class="rift-tip">${Art.wxIcon(Sky.w.key, 16)} ${WEATHER[Sky.w.key].name}: урон +20% у ${WEATHER[Sky.w.key].boost.map(e => ELEMENTS[e].name).join(' и ')}</div>` : ''}
        ${r.done ? '<div class="rift-done">Этот разлом ты уже закрыл. Новый босс — в начале следующего часа.</div>' : `
        <div class="rift-team-title">Твоя команда <button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team">${UI.teamHtml(team)}</div>
        <button class="btn primary wide rift-go" ${team.length ? '' : 'disabled'}>Сразиться</button>
        <button class="btn ghost wide rift-coop">Позвать друзей — совместный бой</button>`}
      </div>`;
    const scr = UI.screen('Разлом', html, 'rift-screen');
    const go = scr.querySelector('.rift-go');
    if (go) go.onclick = () => { UI.closeScreen(scr); this.battle(r, team); };
    const cb = scr.querySelector('.rift-coop');
    if (cb) cb.onclick = () => { UI.closeScreen(scr); Coop.hostRift(r); };
    const edit = scr.querySelector('.team-edit');
    if (edit) edit.onclick = () => UI.pickTeam(() => { team = this.team(); scr.querySelector('.rift-team').innerHTML = UI.teamHtml(team); });
  },

  // coop: { host, hpMul, allies } — совместный бой (см. coop.js)
  battle(r, team, coop) {
    const s = SP[r.boss], T = this.TIER[r.tier], bs = this.bossStats(r);
    if (coop) bs.hp = Math.round(bs.hp * coop.hpMul);
    const root = U.el(`
      <div class="raid el-${s.el}">
        <div class="raid-bg"></div>
        <div class="raid-top">
          <div class="raid-timer">90</div>
          <div class="raid-bname">${Art.elIcon(s.el, 18)} ${s.name}</div>
          <div class="bar boss"><i></i></div>
          ${coop ? '<div class="raid-allies"></div>' : ''}
        </div>
        <div class="raid-boss"><div class="warn">!</div>${Art.spirit(r.boss)}</div>
        <div class="raid-me"></div>
        <div class="raid-fx"></div>
        <div class="raid-hud">
          <div class="raid-mname"></div>
          <div class="bar hp"><i></i></div>
          <div class="raid-team"></div>
        </div>
        <div class="raid-ctrl">
          <button class="raid-water">${Art.item('water')}<span></span></button>
          <button class="raid-special"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fill"/></svg><span>Приём</span></button>
          <button class="raid-dodge">Уклон</button>
        </div>
        <div class="raid-hint">Тапай по экрану — атака.<br>Когда босс замахивается (!) — жми «Уклон» или смахни в сторону.</div>
        <div class="raid-count">3</div>
      </div>`);
    document.body.appendChild(root);
    Music.play('battle');
    const $ = sel => root.querySelector(sel);
    const st = this.st = {
      r, s, bs, root, $, bossHp: bs.hp, time: 90, energy: 0, cool: 0, idx: 0, coop: coop || null, ko: false,
      team: team.map(sp => { const x = S.battle(sp); return { sp, ...x, max: x.hp * 5, cur: x.hp * 5 }; }),
      nextAtk: 3.2, tele: 0, dodgeT: -9, waters: 0, running: false, over: false,
    };
    UI.pushLayer(() => this.quit());
    this.showMine();
    $('.raid-water span').textContent = S.d.items.water || 0;

    const tapArea = root;
    let sx = 0, sy = 0, sid = null;
    tapArea.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      sid = e.pointerId; sx = e.clientX; sy = e.clientY;
    });
    tapArea.addEventListener('pointerup', e => {
      if (e.pointerId !== sid) return; sid = null;
      if (Math.abs(e.clientX - sx) > 50 && Math.abs(e.clientX - sx) > Math.abs(e.clientY - sy)) this.dodge(e.clientX > sx ? 1 : -1);
      else this.fast(e.clientX, e.clientY);
    });
    $('.raid-dodge').onclick = () => this.dodge(1);
    $('.raid-special').onclick = () => this.special();
    $('.raid-water').onclick = () => this.water();

    // обратный отсчёт
    (async () => {
      for (let i = 3; i > 0; i--) { $('.raid-count').textContent = i; Sfx.play('tap'); await U.wait(650); if (this.st !== st) return; }
      $('.raid-count').textContent = 'В бой!';
      await U.wait(500);
      $('.raid-count').remove();
      st.running = true;
      let last = performance.now();
      const loop = t => { if (this.st !== st || st.over) return; this.tick(Math.min(0.05, (t - last) / 1000)); last = t; requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    })();
    this.render();
  },

  cur() { return this.st.team[this.st.idx]; },
  showMine() {
    const st = this.st, m = this.cur();
    st.$('.raid-me').innerHTML = Art.of(m.sp);
    st.$('.raid-me').classList.remove('swap'); void st.$('.raid-me').offsetWidth; st.$('.raid-me').classList.add('swap');
    st.$('.raid-mname').innerHTML = `${Art.elIcon(SP[m.sp.sid].el, 16)} ${m.sp.nick || SP[m.sp.sid].name} <small>СИЛА ${m.power}</small>`;
    st.$('.raid-team').innerHTML = st.team.map((x, i) => `<i class="${x.cur <= 0 ? 'dead' : i === st.idx ? 'on' : ''}"></i>`).join('');
  },
  dmg(att, def, power, attEl, defEl) {
    const wx = Sky.boosted(attEl) ? 1.2 : 1;
    return Math.floor(0.5 * power * (att / def) * 1.2 * wx * this.eff(attEl, defEl)) + 1;
  },
  float(text, x, y, cls = '') {
    const f = U.el(`<div class="dmg ${cls}" style="left:${x}px;top:${y}px">${text}</div>`);
    this.st.$('.raid-fx').appendChild(f);
    setTimeout(() => f.remove(), 900);
  },
  hitBoss(n, special) {
    const st = this.st;
    st.bossHp = Math.max(0, st.bossHp - n);
    const b = st.$('.raid-boss');
    b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
    const r = b.getBoundingClientRect();
    this.float(n, r.left + r.width * (0.3 + Math.random() * 0.4), r.top + r.height * 0.3, special ? 'big' : '');
    if (st.coop && !st.coop.solo) {
      Coop.localHit(n);
      // гость ждёт подтверждения победы от хозяина (на всякий случай — не дольше 4 секунд)
      if (!st.coop.host) {
        if (st.bossHp <= 0 && !st._wait) { st.bossHp = 1; st._wait = setTimeout(() => this.finish(true), 4000); }
        return;
      }
    }
    if (st.bossHp <= 0) this.finish(true);
  },

  /* ---------- совместный бой ---------- */
  remoteHit(name, n) { // у хозяина: урон союзника
    const st = this.st; if (!st || st.over) return;
    st.bossHp = Math.max(0, st.bossHp - n);
    const b = st.$('.raid-boss').getBoundingClientRect();
    this.float(`${n}`, b.left + b.width * (0.15 + Math.random() * 0.7), b.top + b.height * 0.55, 'ally');
    if (st.bossHp <= 0) this.finish(true);
    this.render();
  },
  remoteState(hp, time) { // у гостя: состояние от хозяина
    const st = this.st; if (!st || st.over) return;
    st.bossHp = Math.max(hp > 0 ? 1 : 0, Math.min(st.bossHp, hp));
    st.time = time;
    this.render();
  },
  remoteEnd(win) { const st = this.st; if (st && !st.over) { clearTimeout(st._wait); this.finish(win); } },
  renderAllies(list) {
    const st = this.st; if (!st || !st.coop) return;
    const box = st.$('.raid-allies'); if (!box) return;
    box.innerHTML = (list || []).map(a => `<span><i>${Art.avatar(a.look)}</i>${U.esc(a.name)} <b>${U.fmtNum(a.n)}</b></span>`).join('');
  },
  fast(x, y) {
    const st = this.st;
    if (!st || !st.running || st.over || st.cool > 0 || st.ko) return;
    const m = this.cur();
    st.cool = 0.32;
    st.energy = Math.min(100, st.energy + 6 * (m.energy || 1));
    Sfx.play('attack');
    const me = st.$('.raid-me'); me.classList.remove('atk'); void me.offsetWidth; me.classList.add('atk');
    this.hitBoss(this.dmg(m.atk, st.bs.def, 12, SP[m.sp.sid].el, st.s.el));
    this.render();
  },
  special() {
    const st = this.st;
    if (!st || !st.running || st.over || st.energy < 50 || st.ko) return;
    const m = this.cur(), el = SP[m.sp.sid].el;
    st.energy -= 50;
    Sfx.element(el); U.vibrate(60);
    st.root.classList.remove('flash'); void st.root.offsetWidth; st.root.classList.add('flash');
    st.root.style.setProperty('--fx', ELEMENTS[el].color);
    this.float(ELEMENTS[el].charge, window.innerWidth / 2, window.innerHeight * 0.52, 'move');
    this.hitBoss(this.dmg(m.atk, st.bs.def, 75, el, st.s.el), true);
    this.render();
  },
  dodge(dir) {
    const st = this.st;
    if (!st || !st.running || st.over) return;
    st.dodgeT = 0.6;
    const me = st.$('.raid-me');
    me.style.setProperty('--dx', dir * 70 + 'px');
    me.classList.remove('dodge'); void me.offsetWidth; me.classList.add('dodge');
  },
  water() {
    const st = this.st;
    if (!st || !st.running || st.over) return;
    const m = this.cur();
    if (st.waters >= 3) { UI.toast('За бой можно выпить не больше 3 флаконов'); return; }
    if (m.cur >= m.max) { UI.toast('Дух и так полон сил'); return; }
    if (!S.useItem('water')) { UI.toast('Живой воды нет'); return; }
    st.waters++;
    m.cur = Math.min(m.max, m.cur + m.max / 2);
    Sfx.play('hatch');
    st.$('.raid-water span').textContent = S.d.items.water || 0;
    this.render();
  },
  tick(dt) {
    const st = this.st;
    st.time -= dt; st.cool -= dt; st.dodgeT -= dt;
    if (st.time <= 0) { st.time = 0; this.render(); return this.finish(false); }
    if (st.ko) return this.render(); // свои духи без сил — смотрим, как бьются союзники
    if (st.tele > 0) {
      st.tele -= dt;
      if (st.tele <= 0) this.bossStrike();
    } else {
      st.nextAtk -= dt;
      if (st.nextAtk <= 0) {
        st.tele = 0.9;
        st.$('.raid-boss').classList.add('charging');
        Sfx.play('warn'); U.vibrate(25);
      }
    }
    this.render();
  },
  bossStrike() {
    const st = this.st, m = this.cur();
    st.$('.raid-boss').classList.remove('charging');
    st.nextAtk = 2.2 + Math.random() * 1.4;
    const T = this.TIER[st.r.tier];
    let n = this.dmg(st.bs.atk, m.def, T.pw, st.s.el, SP[m.sp.sid].el);
    const dodged = st.dodgeT > 0;
    if (dodged) n = Math.max(1, Math.floor(n * 0.2));
    m.cur = Math.max(0, m.cur - n);
    const me = st.$('.raid-me').getBoundingClientRect();
    this.float(dodged ? `Уклон! −${n}` : `−${n}`, me.left + me.width / 2, me.top + 10, dodged ? 'dodged' : 'hurt');
    if (!dodged) {
      Sfx.play('hurt'); U.vibrate(80);
      st.root.classList.remove('shake'); void st.root.offsetWidth; st.root.classList.add('shake');
    }
    if (m.cur <= 0) {
      const next = st.team.findIndex(x => x.cur > 0);
      if (next < 0) {
        this.render();
        if (st.coop && !st.coop.solo) {
          st.ko = true;
          st.$('.raid-boss').classList.remove('charging');
          st.root.appendChild(U.el('<div class="raid-ko">Твои духи без сил.<br>Союзники ещё сражаются!</div>'));
          return;
        }
        return this.finish(false);
      }
      st.idx = next; st.energy = 0;
      this.showMine();
    }
    this.render();
  },
  render() {
    const st = this.st; if (!st) return;
    const m = this.cur();
    st.$('.raid-timer').textContent = Math.ceil(st.time);
    st.$('.bar.boss i').style.width = (st.bossHp / st.bs.hp * 100) + '%';
    st.$('.bar.hp i').style.width = (m.cur / m.max * 100) + '%';
    const circ = 2 * Math.PI * 44;
    const f = st.$('.raid-special .fill');
    f.style.strokeDasharray = circ;
    f.style.strokeDashoffset = circ * (1 - Math.min(1, st.energy / 50));
    st.$('.raid-special').classList.toggle('ready', st.energy >= 50);
  },
  async finish(win) {
    const st = this.st;
    if (!st || st.over) return;
    st.over = true;
    clearTimeout(st._wait);
    if (st.coop && st.coop.host) Coop.hostEnd(win);
    await U.wait(400);
    const allies = st.coop ? st.coop.allies : 0;
    if (win) {
      Sfx.play('win'); U.vibrate([50, 50, 50, 50, 120]);
      S.d.rifts[st.r.id] = true;
      J.add('raid', { sid: st.s.id, tier: st.r.tier, coop: allies });
      S.d.stats.raids++;
      S.progress('raid', 1);
      const t = st.r.tier;
      // в совместном бою опыта на четверть больше
      const rw = S.giveRewards({ xp: Math.round(1000 * t * (allies ? 1.25 : 1)), sparks: 400 * t, charm: 5, honey: 2 + t, water: 2, charm2: t >= 2 ? 3 : 0 });
      const am = S.rollAmulet([0.25, 0.4, 0.7][t - 1], st.r.id);
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      const bonus = Math.max(0, Math.floor(st.time / 15));
      const charms = this.TIER[t].charms + bonus + (Ev.cur.rifts ? 3 : 0) + allies * 2;
      const res = U.el(`<div class="raid-result"><div class="res-card">
        <div class="res-title">Разлом закрыт!</div>
        <div class="res-art">${Art.spirit(st.s.id)}</div>
        <div class="res-rw">${rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${x.label}</div>`).join('')}</div>
        <div class="res-note">Ослабленный ${st.s.name} остался в нашем мире. У тебя <b>${charms}</b> оберегов разлома${bonus ? ` (+${bonus} за скорость)` : ''}${allies ? ` (+${allies * 2} за союзников)` : ''}.</div>
        <button class="btn primary wide">Ловить!</button></div></div>`);
      res.querySelector('button').onclick = () => {
        this.close();
        const shiny = U.h('rshiny', st.r.id, S.d.created) < Sky.shinyRate(1 / 20);
        Encounter.start({ mode: 'raid', sid: st.s.id, lvl: this.TIER[t].lvl, seed: st.r.id, charms, shiny, boost: Sky.boosted(st.s.el) });
      };
      st.root.appendChild(res);
    } else {
      Sfx.play('lose');
      const res = U.el(`<div class="raid-result"><div class="res-card">
        <div class="res-title lose">Разлом устоял</div>
        <div class="res-art dim">${Art.spirit(st.s.id)}</div>
        <div class="res-note">Осталось сил у босса: ${Math.round(st.bossHp / st.bs.hp * 100)}%. Усиль духов, возьми стихию-противника и попробуй снова — разлом открыт до конца часа.</div>
        <button class="btn wide">На карту</button></div></div>`);
      res.querySelector('button').onclick = () => this.close();
      st.root.appendChild(res);
    }
    UI.refreshHud();
  },
  quit() {
    const st = this.st; if (!st) return;
    if (st.over) return this.close();
    UI.confirm('Покинуть битву?', 'Прогресс боя будет потерян.', 'Покинуть', () => this.close(), 'Остаться');
  },
  close() {
    const st = this.st; if (!st) return;
    st.over = true;
    st.root.remove();
    this.st = null;
    UI.popLayer();
    if (st.coop) Coop.leave();
    Music.play('map');
    MapView.refresh();
    UI.flushLevelUps();
  },
};
