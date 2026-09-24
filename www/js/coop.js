'use strict';
/* Совместные разломы: до 4 Ловчих.
   Комнату ведёт сервер игры (код, участники, начало боя — roomCreate/roomJoin/roomStart): число союзников
   для урона и наград он берёт оттуда. Во время боя телефоны обмениваются ударами и здоровьем босса
   через Supabase Realtime (канал raid-<код>): хозяин ведёт счёт, гости присылают свой урон. */

const Coop = {
  MAX: 4,
  POLL: 2000,
  ch: null, host: false, code: '', rift: null, members: [], hpMul: 1, dmgBy: {}, scr: null, running: false,
  key: Math.random().toString(36).slice(2, 10), // кто я в канале (не код игрока)

  /* ---------------- КАНАЛ ---------------- */
  async connect(code) {
    const sb = await Cloud.client();
    this.ch = sb.channel(`raid-${code}`, { config: { broadcast: { self: false } } });
    this.ch.on('broadcast', { event: 'm' }, ({ payload }) => this.onMsg(payload || {}));
    await new Promise(res => this.ch.subscribe(s => { if (s === 'SUBSCRIBED' || s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') res(s); }));
  },
  send(msg) { try { if (this.ch) this.ch.send({ type: 'broadcast', event: 'm', payload: { ...msg, from: this.key, name: S.d.name } }); } catch (e) {} },
  onMsg(m) {
    if (m.t === 'lobby') this.poll(); // кто-то вошёл или вышел — спросим сервер
    else if (m.t === 'start' && !this.host && !this.running) this.poll();
    else if (m.t === 'dmg' && this.host && this.running) {
      const k = String(m.from), n = Raid.remoteHit(String(m.name || 'Союзник').slice(0, 20), m.n);
      if (n) this.dmgBy[k] = { name: String(m.name || 'Союзник').slice(0, 20), n: ((this.dmgBy[k] || {}).n || 0) + n };
    } else if (m.t === 'state' && !this.host) { Raid.remoteState(m.hp, m.time); Raid.renderAllies(m.dmg); }
    else if (m.t === 'end' && !this.host) { Raid.renderAllies(m.dmg); Raid.remoteEnd(m.win); }
  },

  /* ---------------- КОМНАТА ---------------- */
  apply(room) {
    this.code = room.code; this.rift = room.rift; this.members = room.members; this.host = room.isHost; this.hpMul = room.hpMul;
    if (room.status === 'started' && !this.running) { this.running = true; this.launch(); return; }
    this.lobby();
  },
  async hostRift(r) {
    this.reset();
    const room = await Game.try('roomCreate', { rift: { id: r.poi, lat: r.lat, lng: r.lng, name: r.place } });
    if (!room) return;
    await this.connect(room.code);
    this.apply(room);
    this.startPolling();
  },
  async join(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 5) { UI.toast('Код разлома — 5 символов'); return; }
    this.reset();
    UI.toast('Подключаюсь к разлому…');
    const room = await Game.try('roomJoin', { code });
    if (!room) return;
    await this.connect(room.code);
    this.send({ t: 'lobby' });
    this.apply(room);
    this.startPolling();
  },
  // Пока ждём начала боя — раз в 2 секунды сверяемся с сервером (и сразу — по сигналу из канала)
  startPolling() { clearInterval(this._poll); this._poll = setInterval(() => this.poll(), this.POLL); },
  async poll() {
    if (!this.code || this.running || this._polling) return;
    this._polling = true;
    try { this.apply(await Game.act('roomState', { code: this.code })); }
    catch (e) { UI.toast(U.esc(e.message)); this.leave(); }
    this._polling = false;
  },
  async start() {
    if (!this.host || this.members.length < 2) return;
    const room = await Game.try('roomStart', { code: this.code });
    if (!room) return;
    this.send({ t: 'start' });
    this.apply(room);
  },

  /* ---------------- БОЙ ---------------- */
  launch() {
    clearInterval(this._poll);
    if (this.scr) { UI.closeScreen(this.scr); this.scr = null; }
    this.dmgBy = { [this.key]: { name: S.d.name, n: 0 } };
    Raid.battle(this.rift, S.team(), { host: this.host, hpMul: this.hpMul, allies: this.members.length - 1, code: this.code }).then(ok => {
      if (!ok) { this.leave(); return; }
      if (!this.host) return;
      // хозяин рассылает состояние боя 3 раза в секунду
      this._sync = setInterval(() => {
        const st = Raid.st;
        if (!st || !st.coop) return;
        this.send({ t: 'state', hp: st.bossHp, time: st.time, dmg: this.dmgTable() });
        Raid.renderAllies(this.dmgTable());
      }, 330);
    });
  },
  dmgTable() {
    const look = n => (this.members.find(m => m.name === n) || {}).look;
    return Object.values(this.dmgBy).map(d => ({ name: d.name, n: Math.round(d.n), look: look(d.name) }));
  },
  // Вызывается битвой при каждом ударе этого игрока
  localHit(n) {
    if (this.host) this.dmgBy[this.key].n += n;
    else this.send({ t: 'dmg', n });
  },
  hostEnd(win) {
    if (!this.host) return;
    clearInterval(this._sync);
    this.send({ t: 'end', win, dmg: this.dmgTable() });
  },

  /* ---------------- ЭКРАН КОМНАТЫ ---------------- */
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
    s.querySelector('.team-edit').onclick = () => UI.pickTeam(async () => {
      s.querySelector('.rift-team.my').innerHTML = UI.teamHtml(S.team());
      const room = await Game.try('roomJoin', { code: this.code }); // обновить свою силу в комнате
      if (room) { this.send({ t: 'lobby' }); this.apply(room); }
    });
    this.renderLobby();
  },
  renderLobby() {
    const s = this.scr; if (!s || !s.isConnected) return;
    s.querySelector('.coop-n').textContent = `${this.members.length} / ${this.MAX}`;
    s.querySelector('.coop-members').innerHTML = this.members.map(m => `<div class="row"><div class="fr-ava">${Art.avatar(m.look || undefined)}</div><div class="row-main"><b>${U.esc(m.name)}${m.host ? ' · хозяин' : ''}${m.me ? ' (ты)' : ''}</b><small>Ур. ${+m.lvl || 1} · сила команды ${U.fmtNum(+m.power || 0)}</small></div></div>`).join('');
    const go = s.querySelector('.coop-start');
    if (go) { go.disabled = this.members.length < 2; go.textContent = this.members.length < 2 ? 'Ждём хотя бы одного друга…' : `Начать бой (${this.members.length} Ловчих)`; }
  },
  inviteText() { return `Идём закрывать разлом в Духолове! «Меню → Друзья» → «Совместный разлом» → код: ${this.code}`; },

  reset() {
    clearInterval(this._sync); clearInterval(this._poll);
    if (this.ch) { try { this.ch.unsubscribe(); } catch (e) {} }
    Object.assign(this, { ch: null, code: '', members: [], dmgBy: {}, running: false });
  },
  leave() {
    if (this.code && !this.running) Game.act('roomLeave', { code: this.code }).catch(() => {});
    if (this.code) this.send({ t: 'lobby' });
    this.reset();
    if (this.scr && this.scr.isConnected) UI.closeScreen(this.scr);
    this.scr = null;
  },
};
