'use strict';
/* Связь с сервером игры. Прогресс хранится и меняется только на сервере: телефон отправляет действие
   (Game.act), сервер проверяет его и отвечает изменениями прогресса и событиями (уровень, знак, задание).
   Телефон ничего не записывает в прогресс сам — только показывает то, что прислал сервер. */

class PlayError extends Error {}

const Game = {
  rev: 0,
  q: Promise.resolve(),
  online: true,
  pts: [],            // точки GPS для подсчёта пройденного пути (отправляются пачкой)
  _snap: null,

  on() { return Cloud.configured(); },

  // Один запрос к серверу
  async call(actions) {
    if (!this.on()) throw new PlayError('Нет связи с сервером игры');
    const sb = await Cloud.client();
    const p = MapView.pos && (MapView.gpsOK || MapView.demo) ? { lat: +MapView.pos.lat.toFixed(6), lng: +MapView.pos.lng.toFixed(6), acc: Math.round(MapView.acc || 20) } : null;
    const body = { a: actions, rev: this.rev, tz: -new Date().getTimezoneOffset(), wx: Sky.w ? Sky.w.key : null, pos: p, v: APP_VERSION };
    let res;
    for (let attempt = 0; attempt < 2; attempt++) {
      const busy = setTimeout(() => document.body.classList.add('net-busy'), 350);
      try {
        const r = await sb.functions.invoke('game', { body });
        if (r.error) {
          let payload = null;
          try { payload = r.error.context && await r.error.context.json(); } catch (e) {}
          if (payload && payload.auth && attempt === 0) { await sb.auth.refreshSession().catch(() => {}); continue; }
          if (payload && payload.error) { res = payload; break; }
          throw new Error(r.error.message);
        }
        res = r.data;
        break;
      } catch (e) {
        this.online = false;
        throw new PlayError('Нет связи с сервером игры — проверь интернет');
      } finally { clearTimeout(busy); document.body.classList.remove('net-busy'); }
    }
    this.online = true;
    return res;
  },

  // Действие игрока. Запросы идут строго по очереди.
  act(type, args = {}) {
    const run = () => this._act(type, args);
    const p = this.q.then(run, run);
    this.q = p.catch(() => {});
    return p;
  },
  async _act(type, args) {
    if (DEV && this._snap && S.d && JSON.stringify(S.d) !== this._snap) console.error('Прогресс изменён на телефоне в обход сервера:', Diff.make(JSON.parse(this._snap), S.d).map(o => o.p.join('.')).join(', '));
    const res = await this.call([{ type, args }]);
    if (!res || !res.ok) {
      if (res && res.moved) this.onMoved();
      if (res && res.upgrade) Updater.check(true);
      throw new PlayError((res && res.error) || 'Ошибка сервера');
    }
    this.apply(res);
    return res.results && res.results[0];
  },
  // То же, но ошибка показывается подсказкой, а результат — null
  async try(type, args) {
    try { return await this.act(type, args); }
    catch (e) { UI.toast(U.esc(e.message)); Sfx.play('miss'); return null; }
  },

  apply(res) {
    if (res.now) U.skew = Math.round(res.now - Date.now());
    if (res.reset) { S.d = null; this.rev = 0; }
    else if (res.data !== undefined) S.d = res.data;
    else if (res.patch) S.d = Diff.apply(S.d, res.patch);
    if (res.rev != null) this.rev = res.rev;
    if (S.d) S.migrate();
    this._snap = DEV && S.d ? JSON.stringify(S.d) : null;
    (res.events || []).forEach(([ev, data]) => this.emit(ev, data));
    Tut.sync(); // сервер мог перевести обучение на следующий шаг
  },
  emit(ev, data) {
    if (ev === 'medal') { const m = MEDALS.find(x => x.id === data.m); if (m) Bus.emit('medal', { m, tier: data.tier }); return; }
    if (ev === 'toast') { UI.toast(U.esc(data.text), data.cls || ''); return; }
    Bus.emit(ev, data);
  },

  // Загрузка прогресса при запуске
  async load() {
    const res = await this.call([{ type: 'load' }]);
    if (!res || !res.ok) {
      if (res && res.moved) { this.moved = true; return null; }
      if (res && res.upgrade) { Updater.check(true); throw new PlayError(res.error); }
      throw new PlayError((res && res.error) || 'Ошибка сервера');
    }
    this.apply(res);
    return S.d;
  },

  /* ---------- пройденный путь ---------- */
  addPoint(lat, lng, acc) {
    this.pts.push([+lat.toFixed(6), +lng.toFixed(6), U.now(), Math.round(acc || 20)]);
    if (this.pts.length > 150) this.pts.splice(0, this.pts.length - 150);
  },
  async flushMove() {
    if (this.pts.length < 2 || !S.d || this._moving) return;
    const pts = this.pts.splice(0, this.pts.length);
    this.pts.push(pts[pts.length - 1]); // последняя точка — начало следующего отрезка
    this._moving = true;
    try { await this.act('move', { pts }); } catch (e) { /* без связи — путь досчитается позже */ this.pts.unshift(...pts.slice(0, -1)); }
    this._moving = false;
  },

  /* ---------- перенос на другое устройство ---------- */
  onMoved() {
    if (this._movedShown) return;
    this._movedShown = true;
    UI.modal({
      title: 'Прогресс перенесён', dismiss: false,
      html: '<p>Твой прогресс перенесён на другое устройство и продолжается там. На этом устройстве можно начать заново.</p>',
      buttons: [{ label: 'Начать заново', cls: 'primary', fn: () => this.startOver() }],
    });
  },
  async startOver() {
    try { const sb = await Cloud.client(); await sb.auth.signOut(); } catch (e) {}
    location.reload();
  },
  async makeCode() {
    const sb = await Cloud.client();
    const { data, error } = await sb.rpc('make_transfer_code');
    if (error) throw new Error(error.message);
    return data;
  },
  async claim(code) {
    const sb = await Cloud.client();
    const { error } = await sb.rpc('claim_transfer', { p_code: code });
    if (error) throw new Error(error.message);
    this.rev = 0;
    await this.load();
  },
  claimDialog(after) {
    const m = UI.modal({
      title: 'Перенести прогресс сюда',
      html: `<p>На старом устройстве открой «Настройки → Перенести на другое устройство» и введи полученный код.${S.d ? ' Текущий прогресс на этом устройстве будет заменён.' : ''}</p>
        <input class="input code-in" maxlength="16" placeholder="XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off">`,
      buttons: [{ label: 'Отмена' }, { label: 'Перенести', cls: 'primary', keep: true, fn: async w => {
        const code = w.querySelector('.code-in').value.trim();
        if (code.replace(/[^a-z0-9]/gi, '').length !== 12) { UI.toast('Код — 12 букв и цифр'); return; }
        const btn = w.querySelector('.btn.primary'); btn.disabled = true;
        try { await this.claim(code); w.close(); UI.toast('Прогресс перенесён!', 'good'); (after || (() => location.reload()))(); }
        catch (e) { UI.toast(U.esc(e.message)); btn.disabled = false; }
      } }],
    });
    setTimeout(() => m.querySelector('.code-in').focus(), 100);
  },
  async codeDialog() {
    let code;
    try { code = await this.makeCode(); } catch (e) { UI.toast(U.esc(e.message)); return; }
    UI.modal({
      title: 'Код переноса',
      html: `<p>Введи этот код на новом устройстве: при первом запуске — «У меня уже есть прогресс», или «Настройки → Перенести прогресс сюда». Код действует 24 часа и один раз.</p>
        <div class="transfer-code">${U.esc(code)}</div>
        <p class="small">После переноса прогресс продолжится на новом устройстве, а здесь можно будет начать заново. Никому не сообщай код.</p>`,
      buttons: [{ label: 'Скопировать', keep: true, fn: async () => { try { await navigator.clipboard.writeText(code); UI.toast('Код скопирован', 'good'); } catch (e) { UI.toast('Не удалось скопировать'); } } },
        { label: 'Готово', cls: 'primary' }],
    });
  },
};
