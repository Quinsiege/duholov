'use strict';
/* Совместные разломы: до 4 Ловчих, прямое соединение телефонов (WebRTC через PeerJS).
   Хозяин комнаты ведёт счёт здоровья босса, гости присылают свой урон. Аккаунты не нужны. */

const Coop = {
  LIB: 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',
  PREFIX: 'duholov-rift-',
  ALPHA: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  MAX: 4,
  peer: null, conns: [], host: false, code: '', rift: null, members: [], dmgBy: {}, scr: null, running: false,

  load() {
    if (window.Peer) return Promise.resolve();
    if (this._p) return this._p;
    this._p = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = this.LIB; s.onload = res; s.onerror = () => { this._p = null; rej(new Error('Нет связи с сервером соединений')); };
      document.head.appendChild(s);
    });
    return this._p;
  },
  me() {
    const team = S.team();
    return { name: S.d.name, look: S.d.look, lvl: S.d.level, power: team.reduce((a, x) => a + S.power(x), 0), sid: team[0] && team[0].sid };
  },
  send(c, msg) { try { if (c && c.open) c.send(msg); } catch (e) {} },
  broadcast(msg) { this.conns.forEach(c => this.send(c, msg)); },

  /* ---------------- ХОЗЯИН ---------------- */
  async hostRift(r) {
    try { await this.load(); } catch (e) { UI.toast(e.message); return; }
    this.reset();
    this.host = true;
    // место разлома нужно каждому участнику: сервер проверяет, что разлом существует
    this.rift = { id: r.id, tier: r.tier, boss: r.boss, endsAt: r.endsAt, poi: r.poi, lat: r.lat, lng: r.lng, place: r.place };
    this.code = Array.from({ length: 5 }, () => this.ALPHA[Math.floor(Math.random() * this.ALPHA.length)]).join('');
    this.peer = new Peer(this.PREFIX + this.code);
    this.peer.on('open', () => { this.members = [{ id: 'host', ...this.me() }]; this.lobby(); });
    this.peer.on('error', e => {
      if (e.type === 'unavailable-id') { UI.toast('Код занят, пробую другой'); setTimeout(() => this.hostRift(r), 300); }
      else this.fail(e);
    });
    this.peer.on('connection', c => {
      c.on('data', m => this.onHostData(c, m));
      c.on('close', () => this.dropGuest(c));
    });
  },
  onHostData(c, m) {
    if (m.t === 'hello') {
      const info = { id: c.peer, name: String(m.name).slice(0, 20), look: m.look, lvl: m.lvl, power: m.power, sid: m.sid };
      const known = this.members.findIndex(x => x.id === c.peer);
      if (known >= 0) { this.members[known] = info; this.syncLobby(); return; } // гость сменил команду
      if (this.running) { this.send(c, { t: 'full', why: 'Бой уже начался' }); return; }
      if (this.members.length >= this.MAX) { this.send(c, { t: 'full', why: 'В разломе уже 4 Ловчих' }); return; }
      this.conns.push(c);
      this.members.push(info);
      Sfx.play('catch');
      this.syncLobby();
    } else if (m.t === 'dmg' && this.running) {
      this.dmgBy[c.peer] = (this.dmgBy[c.peer] || 0) + m.n;
      Raid.remoteHit(this.nameOf(c.peer), m.n);
    }
  },
  dropGuest(c) {
    this.conns = this.conns.filter(x => x !== c);
    const who = this.members.find(x => x.id === c.peer);
    this.members = this.members.filter(x => x.id !== c.peer);
    if (who) UI.toast(`${who.name} покинул разлом`);
    this.syncLobby();
  },
  nameOf(id) { const m = this.members.find(x => x.id === id); return m ? m.name : 'Союзник'; },
  syncLobby() {
    this.broadcast({ t: 'lobby', rift: this.rift, members: this.members, code: this.code });
    this.renderLobby();
  },
  start() {
    if (!this.host || this.members.length < 2) return;
    const hpMul = 1 + 0.8 * (this.members.length - 1);
    this.running = true;
    this.broadcast({ t: 'start', rift: this.rift, members: this.members, hpMul });
    this.launch(hpMul);
    // хозяин рассылает состояние боя 3 раза в секунду
    this._sync = setInterval(() => {
      const st = Raid.st;
      if (!st || !st.coop) return;
      this.broadcast({ t: 'state', hp: st.bossHp, time: st.time, dmg: this.dmgTable() });
      Raid.renderAllies(this.dmgTable());
    }, 330);
  },
  dmgTable() { return this.members.map(m => ({ name: m.name, n: Math.round(this.dmgBy[m.id] || 0), look: m.look })); },
  // Вызывается битвой при каждом ударе этого игрока
  localHit(n) {
    if (this.host) this.dmgBy.host = (this.dmgBy.host || 0) + n;
    else this.send(this.conns[0], { t: 'dmg', n });
  },
  hostEnd(win) {
    if (!this.host) return;
    clearInterval(this._sync);
    this.broadcast({ t: 'end', win, dmg: this.dmgTable() });
  },

  /* ---------------- ГОСТЬ ---------------- */
  async join(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 5) { UI.toast('Код разлома — 5 символов'); return; }
    try { await this.load(); } catch (e) { UI.toast(e.message); return; }
    this.reset();
    this.host = false;
    this.code = code;
    UI.toast('Подключаюсь к разлому…');
    this.peer = new Peer();
    this.peer.on('error', e => this.fail(e));
    this.peer.on('open', () => {
      const c = this.peer.connect(this.PREFIX + code, { reliable: true });
      const timer = setTimeout(() => { if (!c.open) this.fail({ type: 'timeout' }); }, 15000);
      c.on('open', () => { clearTimeout(timer); this.conns = [c]; this.send(c, { t: 'hello', ...this.me() }); });
      c.on('data', m => this.onGuestData(m));
      c.on('close', () => {
        if (this._left) return;
        UI.toast('Связь с хозяином разлома потеряна');
        if (Raid.st && Raid.st.coop) Raid.st.coop.solo = true; // бой продолжается в одиночку
        else this.leave();
      });
    });
  },
  onGuestData(m) {
    if (m.t === 'lobby') { this.rift = m.rift; this.members = m.members; this.lobby(); }
    else if (m.t === 'full') { UI.toast(m.why); this.leave(); }
    else if (m.t === 'start') { this.rift = m.rift; this.members = m.members; this.running = true; this.launch(m.hpMul); }
    else if (m.t === 'state') { Raid.remoteState(m.hp, m.time); Raid.renderAllies(m.dmg); }
    else if (m.t === 'end') { Raid.renderAllies(m.dmg); Raid.remoteEnd(m.win); }
  },

  /* ---------------- ОБЩЕЕ ---------------- */
  launch(hpMul) {
    if (this.scr) { UI.closeScreen(this.scr); this.scr = null; }
    Raid.battle(this.rift, S.team(), { host: this.host, hpMul, allies: this.members.length - 1 }).then(ok => { if (!ok) this.leave(); });
  },
  lobby() {
    if (this.scr && this.scr.isConnected) { this.renderLobby(); return; }
    this.scr = UI.screen('Совместный разлом', `
      <div class="coop">
        <div class="rift-boss sm">${Art.spirit(this.rift.boss)}</div>
        <div class="rift-name">${SP[this.rift.boss].name} <span class="stars">${'★'.repeat(this.rift.tier)}</span></div>
        <div class="coop-code-t">Код разлома</div>
        <div class="coop-code">${this.code}</div>
        ${this.host ? '<div class="fr-btns"><button class="btn small coop-qr">QR-код</button><button class="btn small primary coop-share">Позвать друзей</button></div>' : ''}
        <h3 class="prof-h">Ловчие <small class="coop-n"></small></h3>
        <div class="list coop-members"></div>
        <div class="rift-team-title">Твоя команда <button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team my">${UI.teamHtml(S.team())}</div>
        ${this.host ? '<button class="btn primary wide coop-start">Начать бой</button><p class="small">Здоровье босса растёт с каждым Ловчим, награда — у каждого своя.</p>'
          : '<p class="coop-wait">Ждём, когда хозяин начнёт бой…</p>'}
      </div>`, 'rift-screen coop-screen', () => { if (!this.running) this.leave(); });
    const s = this.scr;
    const q = s.querySelector('.coop-qr'); if (q) q.onclick = () => Friends.showQR('Код разлома', this.code, this.inviteText());
    const sh = s.querySelector('.coop-share'); if (sh) sh.onclick = () => Friends.shareText(this.inviteText());
    const go = s.querySelector('.coop-start'); if (go) go.onclick = () => this.start();
    s.querySelector('.team-edit').onclick = () => UI.pickTeam(() => {
      s.querySelector('.rift-team.my').innerHTML = UI.teamHtml(S.team());
      if (!this.host) this.send(this.conns[0], { t: 'hello', ...this.me() });
      else { this.members[0] = { id: 'host', ...this.me() }; this.syncLobby(); }
    });
    this.renderLobby();
  },
  renderLobby() {
    const s = this.scr; if (!s || !s.isConnected) return;
    s.querySelector('.coop-n').textContent = `${this.members.length} / ${this.MAX}`;
    s.querySelector('.coop-members').innerHTML = this.members.map((m, i) => `<div class="row"><div class="fr-ava">${Art.avatar(m.look)}</div><div class="row-main"><b>${U.esc(m.name)}${i === 0 ? ' · хозяин' : ''}</b><small>Ур. ${m.lvl} · сила команды ${U.fmtNum(m.power)}</small></div></div>`).join('');
    const go = s.querySelector('.coop-start');
    if (go) { go.disabled = this.members.length < 2; go.textContent = this.members.length < 2 ? 'Ждём хотя бы одного друга…' : `Начать бой (${this.members.length} Ловчих)`; }
  },
  inviteText() { return `Идём закрывать разлом в Духолове! «Меню → Друзья» → «Совместный разлом» → код: ${this.code}`; },
  fail(e) {
    const t = e && e.type;
    UI.toast(t === 'peer-unavailable' ? 'Разлом с таким кодом не найден' : t === 'timeout' ? 'Не удалось подключиться — проверьте интернет' : 'Ошибка соединения' + (t ? ` (${t})` : ''));
    this.leave();
  },
  reset() {
    clearInterval(this._sync);
    this._left = true;
    this.conns.forEach(c => { try { c.close(); } catch (e) {} });
    if (this.peer) { try { this.peer.destroy(); } catch (e) {} }
    Object.assign(this, { peer: null, conns: [], members: [], dmgBy: {}, running: false, _left: false });
  },
  leave() {
    this.reset();
    if (this.scr && this.scr.isConnected) UI.closeScreen(this.scr);
    this.scr = null;
  },
};
