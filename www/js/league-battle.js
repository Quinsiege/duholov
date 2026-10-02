'use strict';
/* 4.16: Лига — поиск живого соперника и бой в реальном времени (экран телефона).
   Всё считает сервер (PvP в league.js, GameCore.pvp): телефон отправляет только намерения — быстрые удары (пачками,
   не чаще ~3 запросов в секунду), приём с мини-игрой, щит, смену духа, «сдаюсь» — и показывает бой, который прислал
   сервер. Обновления приходят через Supabase Realtime (личный закрытый канал league:<id входа>, в него пишет только
   база); без Realtime — опросом. Свои быстрые удары видны сразу (предсказание по тем же формулам PvP), но полоски
   здоровья, энергия и итог — всегда по серверу. Раз в 2 с телефон отмечается «на связи»: молчит 20 с — поражение. */

const LeagueBattle = {
  POLL_FIND: 2500,   // мс между запросами поиска
  GIVE_UP: 180,      // с — дольше не ищем
  SEND_GAP: 330,     // мс между пачками ударов
  BEAT: 2000,        // мс — «я на связи» (и досчитать бой: автоходы, время)
  POLL_NO_RT: 700,   // мс — опрос, если Realtime не подключился
  COUNT_GO: 600,     // 5.1.18: «Бой!» — за столько мс до начала боя; с началом боя надписи уже нет
  TICK_MS: 100,      // мс — шаг экрана боя (отсчёт, подсказки, отправка ударов)
  ch: null, rt: false,
  sr: null,          // поиск
  st: null,          // бой

  /* ---------------- СВЯЗЬ ---------------- */
  // ход в бою — вне очереди действий Game.act (сервер не трогает прогресс, отвечает быстро)
  async req(op, args) {
    const sb = await Cloud.client();
    const r = await sb.functions.invoke('game', { body: { pvp: op, args, v: APP_VERSION }, headers: await Cloud.headers() }).catch(() => ({ error: true }));
    let res = r.data;
    if (r.error) { try { res = r.error.context && await r.error.context.json(); } catch (e) { res = null; } }
    if (!res) throw new PlayError(ru`Нет связи с сервером игры — проверь интернет`);
    if (res.now) U.skew = Math.round(res.now - Date.now());
    if (!res.ok) throw new PlayError(res.error || ru`Ошибка сервера`);
    return res;
  },
  // личный закрытый канал: новости о паре («found») и каждое изменение боя («pvp»)
  async connect() {
    if (this.ch) return;
    try {
      const sb = await Cloud.client();
      const { data } = await sb.auth.getSession();
      const s = data && data.session;
      if (!s || !s.user) return;
      await sb.realtime.setAuth(s.access_token);
      const ch = this.ch = sb.channel('league:' + s.user.id, { config: { private: true } });
      ch.on('broadcast', { event: 'found' }, ({ payload }) => { if (payload && payload.id) this.found(payload.id); });
      ch.on('broadcast', { event: 'pvp' }, ({ payload }) => this.push(payload));
      ch.subscribe(x => { this.rt = x === 'SUBSCRIBED'; });
    } catch (e) { this.rt = false; }
  },
  disconnect() { if (this.ch) { try { this.ch.unsubscribe(); } catch (e) {} } this.ch = null; this.rt = false; },

  /* ---------------- ПОИСК ---------------- */
  search() {
    if (this.st || this.sr || Duel.st) return;
    Sfx.init(); Sfx.play('tap');
    const scr = UI.screen(ru`Поиск соперника`, `
      <div class="lgs">
        <div class="lgs-radar"><i></i><i></i><div class="lgs-ava">${Art.avatar(S.d.look)}</div></div>
        <div class="lgs-time">0:00</div>
        <div class="lgs-where">${ru`Ищем соперника`}</div>
        <div class="lgs-n"></div>
        <button class="btn wide lgs-cancel">${ru`Отменить поиск`}</button>
      </div>`, 'league-search', () => this.stopSearch(true));
    const sr = this.sr = { scr, t0: Date.now(), last: 0, busy: false, done: false };
    this.connect();
    const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const poll = async () => {
      if (sr.done || sr.busy) return;
      sr.busy = true; sr.last = Date.now();
      let r = null;
      try { r = await Game.act('pvpFind', { board: true }); }
      catch (e) { sr.busy = false; if (sr.done) return; UI.toast(U.esc(e.message)); sr.done = true; UI.closeScreen(scr); return; }
      sr.busy = false;
      if (sr.done) return;
      if (r.done && r.done.length) League.showDone({ done: r.done });
      if (r.match) { this.found(r.match); return; }
      const where = scr.querySelector('.lgs-where'), n = scr.querySelector('.lgs-n');
      if (where) where.textContent = ru`Ищем соперника`; // 5.1.11: соперник — ±League.RANGE очков, без лиг
      if (n) n.textContent = r.n > 1 ? ru`Сейчас ищут соперника: ${r.n}` : ru`Пока ищешь только ты — позови друзей в Лигу`;
    };
    sr.timer = setInterval(() => {
      if (sr.done) return;
      const s = Math.floor((Date.now() - sr.t0) / 1000), t = scr.querySelector('.lgs-time');
      if (t) t.textContent = mmss(s);
      if (s >= this.GIVE_UP) { UI.toast(ru`Сейчас в Лиге мало Ловчих — попробуй позже`); UI.closeScreen(scr); return; }
      if (Date.now() - sr.last >= this.POLL_FIND) poll();
    }, 250);
    scr.querySelector('.lgs-cancel').onclick = () => UI.closeScreen(scr);
    poll();
  },
  stopSearch(cancel) {
    const sr = this.sr; if (!sr) return;
    this.sr = null; sr.done = true; clearInterval(sr.timer);
    if (!cancel || sr.matched) return;
    // пара могла составиться, пока шла отмена — тогда бой всё равно начинается
    Game.act('pvpCancel').then(r => { if (r && r.match && !this.st) this.resume(r.match); }).catch(() => {});
    if (!this.st) this.disconnect();
  },
  // Соперник найден: кто он (имя, лига, рейтинг, сила, духи) и отсчёт до начала боя
  async found(id) {
    const sr = this.sr;
    if (!sr || sr.matched) return;
    sr.matched = true; sr.done = true; clearInterval(sr.timer);
    let r;
    try { r = await this.req('state', { id }); } catch (e) { UI.toast(U.esc(e.message)); this.sr = null; UI.closeScreen(sr.scr); return; }
    const v = PvP.view(r.st, r.seat, U.now()), f = v.foe, box = sr.scr.querySelector('.lgs');
    Sfx.play('match'); U.vibrate([40, 40, 80]);
    if (box) box.innerHTML = `
      <div class="lgs-title">${ru`Соперник найден!`}</div>
      <div class="lgs-foe">
        <div class="lgs-ava big">${Art.avatar(f.look || undefined)}</div>
        <b>${U.esc(f.name)}${CLANS[f.clan] ? `<i class="lgx-clan" style="background:${CLANS[f.clan].color}"></i>` : ''}</b>
        <div class="lgs-rank"><span class="lg-badge sm">${League.badge(f.rank)}</span>${LEAGUE_RANKS[f.rank].name} · ${League.cup()}${U.fmtNum(f.pts)}</div>
        <small>${ru`ур. ${f.lvl} · сила команды ${U.fmtNum(f.power)}`}</small>
      </div>
      <div class="rift-team">${f.team.map(x => `<div class="mini">${Art.of(x)}<b>${U.fmtNum(x.power)}</b></div>`).join('')}</div>
      <div class="lgs-go">${ru`Бой через`} <b class="lgs-cd"></b></div>`;
    const t = setInterval(() => {
      const left = Math.ceil((v.t0 - U.now()) / 1000), cd = sr.scr.querySelector('.lgs-cd');
      if (cd) cd.textContent = Math.max(0, left);
      if (left <= 2 || !sr.scr.isConnected) {
        clearInterval(t);
        this.sr = null;
        if (sr.scr.isConnected) UI.closeScreen(sr.scr);
        this.battle(r);
      }
    }, 200);
  },
  // Вернуться в идущий бой (экран Лиги, телефон закрывали)
  async resume(id) {
    if (!id || this.st) return;
    this.connect();
    try { this.battle(await this.req('state', { id })); } catch (e) { UI.toast(U.esc(e.message)); }
  },

  /* ---------------- БОЙ ---------------- */
  battle(r) {
    if (this.st) return;
    const root = U.el(`
      <div class="raid duel pvp">
        <div class="raid-bg duel-bg"></div>
        <div class="raid-top duel-top">
          <div class="raid-timer">${PvP.TIME}</div>
          <div class="duel-foe-hud">
            <div class="duel-guard"><div class="guard-ava sm pvp-ava"></div><b class="pvp-foe"></b><span class="lg-badge xs pvp-rank"></span></div>
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
          <button class="duel-switch"><span>${ru`Смена`}</span><em></em></button>
          <button class="duel-special2 hidden"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fill"/></svg><span></span></button>
          <button class="raid-special"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fill"/></svg><span>${ru`Приём`}</span></button>
          <div class="duel-energy"></div>
        </div>
        <div class="raid-hint">${ru`Тапай — быстрая атака, она копит энергию; полная шкала — «Приём». Щиты берегут от приёмов соперника.`}</div>
        <div class="pvp-wait hidden"></div>
        <div class="pvp-net hidden">${ru`Нет связи с сервером — переподключаюсь…`}</div>
        <div class="duel-ov hidden"></div>
        <div class="raid-count"></div>
      </div>`);
    document.body.appendChild(root);
    Music.play('map');
    const st = this.st = { pvp: true, id: r.id, seat: r.seat, raw: r.st, ver: r.ver, root, $: s => root.querySelector(s),
      sent: 0, unsent: 0, out: [], inflight: false, lastSend: 0, lastBeat: 0, fails: 0, nextTap: 0, lastN: r.st.n,
      idx: { me: -1, foe: -1 }, dlg: null, charging: false, over: false };
    // 4.16: бой Лиги — тоже бой: подсказки, окна уровня и обучение ждут, пока он идёт (они смотрят на Duel.st)
    Duel.st = st;
    st.layer = UI.pushLayer(() => this.quit());
    let sid = null;
    root.addEventListener('pointerdown', ev => { if (ev.target.closest('button') || ev.target.closest('.duel-ov')) return; sid = ev.pointerId; });
    root.addEventListener('pointerup', ev => { if (ev.pointerId !== sid) return; sid = null; this.tap(); });
    st.$('.raid-special').onclick = () => this.charge('charge');
    st.$('.duel-special2').onclick = () => this.charge('charge2');
    st.$('.duel-switch').onclick = () => this.switchMenu(false);
    const v = PvP.view(r.st, r.seat, U.now());
    st.$('.pvp-ava').innerHTML = Art.avatar(v.foe.look || undefined);
    st.$('.pvp-foe').textContent = v.foe.name;
    st.$('.pvp-rank').innerHTML = League.badge(v.foe.rank);
    this.onState();
    st.timer = setInterval(() => this.tick(), this.TICK_MS);
  },
  // бой глазами игрока: сервер + ещё не подтверждённые свои удары
  view() {
    const st = this.st, now = U.now(), raw = st.raw, me = raw.s ? raw.s[st.seat] : null;
    let x = raw;
    const pend = me ? st.unsent + Math.max(0, st.sent - me.hits - me.rej) : 0;
    if (pend > 0 && !raw.over && !raw.pause && now >= raw.t0) {
      x = JSON.parse(JSON.stringify(raw));
      for (let i = 0; i < pend && !x.pause && !x.over; i++) PvP.fast(x, st.seat, now);
    }
    return PvP.view(x, st.seat, now);
  },
  tick() {
    const st = this.st; if (!st) return;
    const now = U.now();
    this.pump();
    if (!st.inflight && !st.over) {
      const gap = this.rt ? this.BEAT : this.POLL_NO_RT;
      if (now - Math.max(st.lastSend, st.lastBeat) >= gap) this.beat();
    }
    this.render();
  },
  async beat() {
    const st = this.st; if (!st || st.inflight) return;
    st.inflight = true; st.lastBeat = U.now();
    try { this.apply(await this.req('state', { id: st.id })); st.fails = 0; } catch (e) { this.fail(e); }
    if (this.st === st) st.inflight = false;
  },
  // отправка: сначала накопленные удары, за ними — приём, щит, смена (по порядку нажатий)
  async pump() {
    const st = this.st;
    if (!st || st.inflight || st.over) return;
    if (!st.out.length && (!st.unsent || U.now() - st.lastSend < this.SEND_GAP)) return;
    const ins = [];
    let n = 0;
    if (st.unsent) { n = Math.min(st.unsent, PvP.MAX_TAPS); ins.push({ t: 'hit', n }); st.unsent -= n; st.sent += n; }
    ins.push(...st.out.splice(0, 4 - ins.length));
    st.inflight = true; st.lastSend = U.now();
    try {
      const r = await this.req('move', { id: st.id, in: ins });
      st.fails = 0;
      this.apply(r);
      (r.res || []).forEach((x, i) => {
        if (!x.ign) return;
        if (ins[i].t === 'charge') { st.charging = false; this.closeDlg(); UI.toast(x.ign === 'energy' ? ru`Мало энергии — атакуй тапами` : ru`Приём сейчас не выйдет`); }
        if (ins[i].t === 'switch' && x.ign === 'cd') UI.toast(ru`Смена ещё не готова`);
      });
    } catch (e) { if (this.st === st) { st.sent -= n; this.fail(e); } }
    if (this.st === st) st.inflight = false;
  },
  fail(e) {
    const st = this.st; if (!st) return;
    st.fails++;
    if (/не найден/.test(e.message)) { UI.toast(U.esc(e.message)); this.close(); return; }
    st.$('.pvp-net').classList.toggle('hidden', st.fails < 2);
  },
  apply(r) {
    const st = this.st;
    if (!st || !r || r.id !== st.id || r.ver < st.ver) return;
    st.raw = r.st; st.ver = r.ver;
    st.$('.pvp-net').classList.add('hidden');
    this.onState();
  },
  // новость из канала Realtime (от базы)
  push(p) {
    const st = this.st;
    if (!st || !p || p.id !== st.id || !(p.ver > st.ver) || !p.st || p.st.init) return;
    st.raw = p.st; st.ver = p.ver;
    this.onState();
  },

  // Бой изменился: события соперника, окна щита и смены, конец боя
  onState() {
    const st = this.st, raw = st.raw, v = this.view();
    if (st.idx.me !== v.me.idx) { st.idx.me = v.me.idx; this.showSide('me', v); }
    if (st.idx.foe !== v.foe.idx) { st.idx.foe = v.foe.idx; this.showSide('foe', v); }
    for (const e of v.log) {
      if (e.n <= st.lastN) continue;
      if (e.e === 'hit' && e.s === 'foe') { this.hit('me', `−${e.d}`, 'hurt'); }
      else if (e.e === 'charge' && e.s === 'foe') { Sfx.play('warn'); U.vibrate([30, 40, 30]); }
      else if (e.e === 'charged') {
        const to = e.s === 'me' ? 'foe' : 'me';
        if (e.sh) { this.hit(to, ru`Щит!`, 'dodged'); Sfx.play('shield'); }
        else {
          this.hit(to, to === 'me' ? `−${e.d}` : e.d, to === 'me' ? 'hurt' : 'big');
          const f = to === 'me' ? v.foe.team[v.foe.idx] : v.me.team[v.me.idx];
          if (f) { Sfx.element(f.el, to === 'me'); st.root.style.setProperty('--fx', ELEMENTS[f.el].color); }
          st.root.classList.remove(to === 'me' ? 'shake' : 'flash'); void st.root.offsetWidth; st.root.classList.add(to === 'me' ? 'shake' : 'flash');
          U.vibrate(to === 'me' ? 90 : 60);
        }
      } else if (e.e === 'switch' && e.s === 'foe') UI.toast(ru`${U.esc(v.foe.name)} выпускает: ${SP[v.foe.team[e.i].sid].name}`);
      else if (e.e === 'ko') Sfx.play(e.s === 'me' ? 'hurt' : 'ko');
    }
    st.lastN = raw.n;
    // окна: щит от приёма соперника, выбор духа после поражения бойца
    const p = v.pause;
    if (p && p.k === 'charge' && p.by === 'foe' && !p.done) this.shieldDlg(p, v);
    else if (p && p.k === 'switch' && p.who.includes('me')) this.switchMenu(true, p);
    // окно щита или смены, чья пауза уже кончилась (сервер решил сам), и добровольная смена, если бой встал на паузу, — закрыть
    else if (st.dlg && (/^(shield|switch):/.test(st.dlg) || (st.dlg === 'switch' && p))) this.closeDlg();
    const wait = st.$('.pvp-wait');
    const txt = p && p.k === 'switch' && !p.who.includes('me') ? ru`${U.esc(v.foe.name)} выбирает духа…` : p && p.k === 'charge' && p.by === 'foe' && p.done ? ru`Приём соперника…` : '';
    wait.textContent = txt; wait.classList.toggle('hidden', !txt);
    if (v.over && !st.over) this.finish(v);
  },
  showSide(side, v) {
    const st = this.st, x = v[side], f = x.team[x.idx];
    if (!f) return;
    const box = st.$(side === 'me' ? '.duel-me' : '.duel-foe');
    box.innerHTML = Art.of(f);
    box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap');
    st.$(side === 'me' ? '.raid-mname' : '.foe-name').innerHTML = `${Art.elIcon(f.el, 16)} ${U.esc(f.nick || SP[f.sid].name)} <small>${ru`СИЛА ${f.power}`}</small>`;
  },
  hit(side, n, cls) {
    const st = this.st, box = st.$(side === 'me' ? '.duel-me' : '.duel-foe');
    box.classList.remove('hit'); void box.offsetWidth; box.classList.add('hit');
    const r = box.getBoundingClientRect();
    const fl = U.el(`<div class="dmg ${cls || ''}" style="left:${r.left + r.width * (0.3 + Math.random() * 0.4)}px;top:${r.top + r.height * 0.25}px">${n}</div>`);
    st.$('.raid-fx').appendChild(fl);
    setTimeout(() => fl.remove(), 900);
  },
  // 5.1.18: надпись отсчёта за ms мс до начала боя (его назначил сервер): секунды, «Бой!» — в последние COUNT_GO мс, с началом
  // боя — null (надпись убрать). Раньше «Бой!» висела ещё секунду поверх идущего боя: закрывала экран и касания, а соперник уже бил
  countText(ms) { return ms <= 0 ? null : ms <= this.COUNT_GO ? ru`Бой!` : Math.ceil((ms - this.COUNT_GO) / 1000); },
  render() {
    const st = this.st; if (!st) return;
    const v = this.view(), now = U.now(), m = v.me.team[v.me.idx], f = v.foe.team[v.foe.idx];
    const cnt = st.$('.raid-count');
    if (cnt) { const t = this.countText(v.t0 - now - this.TICK_MS); if (t == null) cnt.remove(); else cnt.textContent = t; } // на шаг раньше: к началу боя надписи уже нет
    st.$('.raid-timer').textContent = Math.ceil(v.left);
    if (f) st.$('.bar.boss i').style.width = Math.max(0, f.cur / f.max * 100) + '%';
    if (m) st.$('.bar.hp i').style.width = Math.max(0, m.cur / m.max * 100) + '%';
    const sh = n => Duel.shieldSvg.repeat(n) + '<i class="shd-empty"></i>'.repeat(Math.max(0, 2 - n));
    st.$('.my-sh').innerHTML = sh(v.me.sh);
    st.$('.foe-sh').innerHTML = sh(v.foe.sh);
    const dots = x => x.team.map((y, i) => `<i class="${y.cur <= 0 ? 'dead' : i === x.idx ? 'on' : ''}"></i>`).join('');
    st.$('.my-dots').innerHTML = dots(v.me);
    st.$('.foe-dots').innerHTML = dots(v.foe);
    if (!m) return;
    const circ = 2 * Math.PI * 44, fill = st.$('.raid-special .fill');
    fill.style.strokeDasharray = circ;
    fill.style.strokeDashoffset = circ * (1 - Math.min(1, m.en / MOVES.charge.cost));
    fill.style.stroke = ELEMENTS[m.el].color;
    st.$('.raid-special').classList.toggle('ready', m.en >= MOVES.charge.cost);
    const b2 = st.$('.duel-special2');
    b2.classList.toggle('hidden', !m.move2);
    if (m.move2) {
      const f2 = b2.querySelector('.fill');
      f2.style.strokeDasharray = circ;
      f2.style.strokeDashoffset = circ * (1 - Math.min(1, m.en / MOVES.charge2.cost));
      f2.style.stroke = ELEMENTS[m.el].color;
      b2.classList.toggle('ready', m.en >= MOVES.charge2.cost);
      b2.querySelector('span').textContent = ELEMENTS[m.el].charge2;
    }
    st.$('.duel-energy').textContent = `⚡ ${Math.floor(m.en)}`;
    const cd = Math.max(0, (v.me.cd - now) / 1000), sw = st.$('.duel-switch');
    sw.classList.toggle('cool', cd > 0);
    sw.querySelector('em').textContent = cd > 0 ? Math.ceil(cd) : '';
  },
  active(v) { return !v.over && !v.pause && U.now() >= v.t0 && !this.st.charging; },

  /* ---------------- ВВОД ---------------- */
  tap() {
    const st = this.st;
    if (!st || st.over || st.dlg) return;
    const v = this.view(), now = U.now();
    if (!this.active(v) || now < st.nextTap) return;
    st.nextTap = now + 1000 / PvP.RATE; // не чаще, чем засчитает сервер
    st.unsent++;
    Sfx.play('attack');
    const me = st.$('.duel-me'); me.classList.remove('atk'); void me.offsetWidth; me.classList.add('atk');
    const m = v.me.team[v.me.idx], f = v.foe.team[v.foe.idx];
    if (m && f) this.hit('foe', PvP.dmg(st.raw.s[st.seat].team[v.me.idx].atk, st.raw.s[PvP.other(st.seat)].team[v.foe.idx].def, PvP.FAST, m.el, f.el));
    this.pump();
  },
  // Приём: сервер ставит бой на паузу; 2,2 с тапай по сфере — число тапов сервер ограничит скоростью руки
  async charge(kind) {
    const st = this.st;
    if (!st || st.over || st.dlg) return;
    const v = this.view(), m = v.me.team[v.me.idx], mv = MOVES[kind];
    if (!this.active(v) || !m) return;
    if (kind === 'charge2' && !m.move2) return;
    if (m.en < mv.cost) { UI.toast(ru`Мало энергии — атакуй тапами`); return; }
    st.charging = true; st.dlg = 'charge';
    st.out.push({ t: 'charge', kind });
    this.pump();
    Sfx.play('special');
    const col = ELEMENTS[m.el].color;
    const ov = this.overlay(`<div class="charge-mini"><div class="charge-title">${ELEMENTS[m.el][kind]}</div><button class="charge-orb" style="--c:${col}"><span>${ru`Тапай!`}</span></button><div class="pbar"><i></i></div></div>`);
    let taps = 0;
    const orb = ov.querySelector('.charge-orb'), bar = ov.querySelector('.pbar i');
    orb.addEventListener('pointerdown', () => {
      taps++; Sfx.play('charge', { rate: 1 + Math.min(taps, 20) * 0.03 }); U.vibrate(8);
      orb.style.transform = `scale(${1 + Math.min(taps, 14) * 0.035})`;
      bar.style.width = Math.min(100, taps / PvP.TAPS_MAX * 100) + '%';
    });
    await U.wait(PvP.MINI);
    if (this.st !== st) return;
    if (st.dlg === 'charge') this.closeDlg();
    if (st.charging) { st.out.push({ t: 'taps', n: Math.min(taps, PvP.TAPS_MAX) }); st.charging = false; this.pump(); }
  },
  shieldDlg(p, v) {
    const st = this.st;
    if (st.dlg === 'shield:' + p.t) return;
    this.closeDlg();
    st.dlg = 'shield:' + p.t;
    const f = v.foe.team[v.foe.idx], has = v.me.sh > 0;
    const ov = this.overlay(`<div class="shield-q">
      <div class="charge-title">${U.esc(v.foe.name)}: «${ELEMENTS[f.el][p.kind]}»!</div>
      <div class="shield-timer"><i></i></div>
      <div class="shield-btns">
        <button class="btn primary sh-yes" ${has ? '' : 'disabled'}>${Duel.shieldSvg} ${ru`Щит (${v.me.sh})`}</button>
        <button class="btn sh-no">${ru`Принять удар`}</button>
      </div></div>`);
    const bar = ov.querySelector('.shield-timer i'), total = Math.max(500, p.t + PvP.DECIDE - 500 - U.now());
    bar.style.transition = `width ${total}ms linear`; requestAnimationFrame(() => { bar.style.width = '0%'; });
    const pick = on => { if (st.dlg !== 'shield:' + p.t) return; this.closeDlg(); st.out.push({ t: 'shield', on }); this.pump(); };
    ov.querySelector('.sh-yes').onclick = () => pick(true);
    ov.querySelector('.sh-no').onclick = () => pick(false);
    setTimeout(() => pick(false), total);
  },
  // Смена духа: добровольно (перезарядка, бой не останавливается) или после поражения бойца (6 с, потом — сам)
  switchMenu(forced, p) {
    const st = this.st;
    if (!st || st.over) return;
    const key = forced ? 'switch:' + p.t : 'switch';
    if (st.dlg === key || (!forced && st.dlg)) return;
    const v = this.view();
    if (!forced) {
      if (!this.active(v)) return;
      if (v.me.cd > U.now()) { UI.toast(ru`Смена будет доступна через ${Math.ceil((v.me.cd - U.now()) / 1000)} с`); return; }
    }
    const opts = v.me.team.map((f, i) => ({ f, i })).filter(x => x.f.cur > 0 && x.i !== v.me.idx);
    if (!opts.length) { if (!forced) UI.toast(ru`Некого выпустить`); return; }
    this.closeDlg();
    st.dlg = key;
    const ov = this.overlay(`<div class="switch-q"><div class="charge-title">${forced ? ru`Дух без сил! Кого выпустить?` : ru`Сменить духа`}</div>
      <div class="rift-team">${opts.map(x => `<button class="mini" data-i="${x.i}">${Art.of(x.f)}<b>${Math.round(x.f.cur / x.f.max * 100)}%</b></button>`).join('')}</div>
      ${forced ? '' : `<button class="btn ghost sw-cancel">${ru`Отмена`}</button>`}</div>`);
    ov.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { if (st.dlg !== key) return; this.closeDlg(); st.out.push({ t: 'switch', i: +b.dataset.i }); this.pump(); });
    const c = ov.querySelector('.sw-cancel');
    if (c) c.onclick = () => this.closeDlg();
  },
  overlay(html) { const ov = this.st.$('.duel-ov'); ov.innerHTML = html; ov.classList.remove('hidden'); return ov; },
  closeDlg() { const st = this.st; if (!st) return; st.dlg = null; const ov = st.$('.duel-ov'); ov.classList.add('hidden'); ov.innerHTML = ''; },
  quit() {
    const st = this.st; if (!st) return;
    if (st.over) { this.close(); return; }
    UI.confirm(ru`Сдаться?`, ru`Бой будет проигран, рейтинг уменьшится, опыта не будет.`, ru`Сдаться`, () => { if (this.st === st && !st.over) { st.out.push({ t: 'quit' }); this.pump(); } }, ru`Продолжить`, true); // 4.25: сдаться — красной кнопкой
  },

  /* ---------------- ИТОГ ---------------- */
  // Итог: карточка — сразу по бою от сервера (рейтинг посчитан в нём), потом — зачёт в прогресс (pvpResult):
  // новая лига, награды, опыт. Нет связи — итог засчитается при следующем входе в Лигу
  async finish(v) {
    const st = this.st;
    st.over = true;
    this.closeDlg();
    await U.wait(700);
    if (this.st !== st) return;
    const win = v.over.win === 'me', draw = !v.over.win, foe = U.esc(v.foe.name), d = v.over.d ? v.over.d.d : 0;
    const why = {
      ko: win ? ru`Все духи ${foe} без сил.` : ru`Все твои духи без сил.`,
      time: draw ? ru`Время вышло — силы равны.` : win ? ru`Время вышло — у твоих духов осталось больше сил.` : ru`Время вышло — у духов ${foe} осталось больше сил.`,
      idle: win ? ru`${foe} пропал со связи — победа твоя.` : ru`Ты слишком долго не был на связи — поражение.`,
      quit: win ? ru`${foe} сдался.` : ru`Ты сдался.`,
    }[v.over.why] || '';
    Sfx.play(win ? 'win' : 'lose'); if (win) U.vibrate([50, 50, 50, 50, 120]);
    const res = U.el(`<div class="raid-result"><div class="res-card">
      <div class="res-title ${win ? '' : 'lose'}">${win ? ru`Победа!` : draw ? ru`Ничья` : ru`Поражение`}</div>
      <div class="guard"><div class="guard-ava">${Art.avatar(v.foe.look || undefined)}</div><div><b>${foe}</b><small>${LEAGUE_RANKS[v.foe.rank].name} · ${U.fmtNum(v.foe.pts)}</small></div></div>
      <div class="res-note">${why}<br>${ru`Рейтинг ${d >= 0 ? '+' : '−'}${Math.abs(d)}`}<span class="lg-res-league"></span></div>
      <div class="lg-res-more"><div class="res-note">${ru`Засчитываю итог…`}</div></div>
      <button class="btn primary wide lg-again">${ru`Ещё бой`}</button>
      <button class="btn wide lg-done">${ru`К Лиге`}</button></div></div>`);
    st.root.appendChild(res);
    res.querySelector('.lg-again').onclick = () => { this.close(); setTimeout(() => this.search(), 150); };
    res.querySelector('.lg-done').onclick = () => { this.close(); setTimeout(() => League.screen(), 150); };
    let r = null;
    try { r = await Game.act('pvpResult', { board: true }); } catch (e) { UI.toast(U.esc(e.message)); }
    if (this.st !== st) return;
    const x = r && r.done ? r.done.find(y => y.id === st.id) : null, more = res.querySelector('.lg-res-more');
    if (x) res.querySelector('.lg-res-league').innerHTML = ` · ${ru`Лига: <b>${LEAGUE_RANKS[x.rNew].name}</b> · рейтинг ${U.fmtNum(x.pts)}`}`;
    more.innerHTML = !r ? `<div class="res-note">${ru`Итог засчитается, когда появится связь.`}</div>` : x ? `
      ${x.rNew > x.rank0 ? `<div class="badge-new">${ru`Новая лига — ${LEAGUE_RANKS[x.rNew].name}!`}</div>` : x.rNew < x.rank0 ? `<div class="badge-new down">${ru`Выпал в лигу «${LEAGUE_RANKS[x.rNew].name}»`}</div>` : ''}
      ${x.xp || x.rewards.length ? `<div class="res-rw">${x.xp ? `<div><b>+${U.fmtNum(x.xp)}</b> ${ru`опыта`}</div>` : ''}${x.rewards.map(y => `<div><b>+${U.fmtNum(y.n)}</b> ${I18N.back(y.label)}</div>`).join('')}</div>` : ''}` : '';
    res.querySelector('.lg-again').disabled = !(League.view().tickets > 0);
    UI.refreshHud();
  },
  close() {
    const st = this.st; if (!st) return;
    clearInterval(st.timer);
    st.root.remove();
    this.st = null;
    if (Duel.st === st) Duel.st = null;
    UI.popLayer(st.layer);
    this.disconnect();
    Music.play('map');
    MapView.refresh();
    UI.flushLevelUps();
  },
};
