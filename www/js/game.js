'use strict';
/* Связь с сервером игры. Прогресс хранится и меняется только на сервере: телефон отправляет действие
   (Game.act), сервер проверяет его и отвечает изменениями прогресса и событиями (уровень, знак, задание).
   Телефон ничего не записывает в прогресс сам — только показывает то, что прислал сервер. */

class PlayError extends Error { constructor(m) { super(I18N.back(m)); } } // 4.15: ошибка сервера — на язык игрока

const Game = {
  rev: 0,
  q: Promise.resolve(),
  online: true,
  pts: [],            // точки пути (5.1: джойстик, walk.js) для подсчёта пройденного пути (отправляются пачкой)
  _snap: null,

  on() { return Cloud.configured(); },

  // Один запрос к серверу
  // 4.20.1: запрос не ждёт вечно — после сбоя сервера вкладка могла «зависнуть» на загрузке (12%); по таймауту — «Нет связи» и повтор
  NET_MS: 25000,
  timed(p, ms = this.NET_MS) { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms); })]).finally(() => clearTimeout(t)); },
  async call(actions) {
    if (!this.on()) throw new PlayError(ru`Нет связи с сервером игры`);
    const sb = await this.timed(Cloud.client()).catch(() => { throw new PlayError(ru`Нет связи с сервером игры — проверь интернет`); });
    const p = Walk.wire(); // 5.1: место Ловчего (джойстик и Атлас) — без GPS
    const body = { a: actions, rev: this.rev, tz: -new Date().getTimezoneOffset(), wx: Sky.w ? Sky.w.key : null, pos: p, v: APP_VERSION };
    let res;
    for (let attempt = 0; attempt < 2; attempt++) {
      const headers = await Cloud.headers(); // в закрытом контуре — ключ доступа (спросит окном, если его нет)
      const invoke = () => this.timed(sb.functions.invoke('game', { body, headers }));
      const busy = setTimeout(() => document.body.classList.add('net-busy'), 350);
      try {
        const r = await invoke();
        if (r.error) {
          let payload = null;
          try { payload = r.error.context && await r.error.context.json(); } catch (e) {}
          // вход устарел: обновить; в тестовом контуре, если нельзя (пользователя удалили), — войти заново
          if (payload && payload.auth && attempt === 0) {
            const { error } = await sb.auth.refreshSession().catch(e => ({ error: e }));
            if (error && CLOUD_CONFIG.locked) await Cloud.relogin(); // только в тесте: в бою новый вход = новый пустой аккаунт
            continue;
          }
          // неверный ключ закрытого контура — забыть и спросить снова
          if (payload && payload.error && /ключ доступа/.test(payload.error) && attempt === 0) { Cloud.forgetKey(); continue; }
          if (payload && payload.error) { res = payload; break; }
          throw new Error(r.error.message);
        }
        res = r.data;
        break;
      } catch (e) {
        console.warn('Сервер игры:', e && e.message);
        this.online = false;
        throw new PlayError(ru`Нет связи с сервером игры — проверь интернет`);
      } finally { clearTimeout(busy); document.body.classList.remove('net-busy'); }
    }
    this.online = true;
    return res;
  },

  // Казна: запрос к оплате (info / create / sync) — отдельно от игровых действий
  async pay(op, args = {}) {
    if (!this.on()) throw new PlayError(ru`Нет связи с сервером игры`);
    const sb = await Cloud.client();
    const r = await sb.functions.invoke('game', { body: { pay: op, args, v: APP_VERSION }, headers: await Cloud.headers() }).catch(() => ({ error: true }));
    let res = r.data;
    if (r.error) { try { res = r.error.context && await r.error.context.json(); } catch (e) { res = null; } }
    if (!res || !res.ok) throw new PlayError((res && res.error) || ru`Нет связи с сервером игры — проверь интернет`);
    return res;
  },

  // Вход через сервисы (3.27): info — какие подключены и что привязано; signin — привязать или войти (login.js)
  async auth(op, args = {}) {
    if (!this.on()) throw new PlayError(ru`Нет связи с сервером игры`);
    const sb = await Cloud.client();
    const r = await this.timed(sb.functions.invoke('game', { body: { auth: op, args, v: APP_VERSION }, headers: await Cloud.headers() })).catch(() => ({ error: true }));
    let res = r.data;
    if (r.error) { try { res = r.error.context && await r.error.context.json(); } catch (e) { res = null; } }
    if (!res || !res.ok) throw new PlayError((res && res.error) || ru`Нет связи с сервером игры — проверь интернет`);
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
      throw new PlayError((res && res.error) || ru`Ошибка сервера`);
    }
    this.apply(res);
    return res.results && res.results[0];
  },
  // То же, но ошибка показывается подсказкой, а результат — null
  async try(type, args) {
    try { return await this.act(type, args); }
    catch (e) { UI.toast(U.esc(e.message), 'bad'); Sfx.play('miss'); return null; } // 4.25: ошибка — красная метка у всплывашки
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
    if (S.d && S.d.payNew && typeof Treasury !== 'undefined') setTimeout(() => Treasury.notice(), 400); // 4.22: сервер начислил оплату
  },
  emit(ev, data) {
    if (ev === 'medal') { const m = MEDALS.find(x => x.id === data.m); if (m) Bus.emit('medal', { m, tier: data.tier }); return; }
    if (ev === 'toast') { UI.toast(U.esc(I18N.back(data.text)), data.cls || ''); return; }
    Bus.emit(ev, data);
  },

  // Загрузка прогресса при запуске
  async load() {
    const res = await this.call([{ type: 'load' }]);
    if (!res || !res.ok) {
      if (res && res.moved) { this.moved = true; return null; }
      if (res && res.upgrade) { Updater.check(true); throw new PlayError(res.error); }
      throw new PlayError((res && res.error) || ru`Ошибка сервера`);
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
      title: ru`Прогресс перенесён`, dismiss: false,
      html: `<p>${ru`Твой прогресс перенесён на другое устройство и продолжается там. На этом устройстве можно начать заново.`}</p><p class="warn-box">${ru`Если ты <b>не</b> переносил прогресс — не начинай заново: напиши на почту из «Оферты» (Лавка → Казна) и укажи имя Ловчего и когда это случилось. Прогресс можно вернуть.`}</p>`,
      buttons: [{ label: ru`Начать заново`, cls: 'primary', fn: () => this.startOver() }],
    });
  },
  async startOver() {
    await Login.dropSession(); // быстро и только на этом устройстве (3.31.1)
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
    const { data, error } = await sb.rpc('claim_transfer', { p_code: code });
    if (error) throw new Error(error.message);
    if (data && data.error) throw new Error(I18N.back(data.error)); // неверный код (попытки считает сервер)
    this.rev = 0;
    await this.load();
  },
  claimDialog(after) {
    const m = UI.modal({
      title: ru`Перенести прогресс сюда`,
      html: `<p>${ru`На старом устройстве открой «Настройки → Перенести на другое устройство» и введи полученный код.`}${S.d ? ' ' + ru`Текущий прогресс на этом устройстве будет заменён.` : ''}</p>
        <p class="small">${ru`Вводи только код со своего же устройства. Если код прислал кто-то другой — это может быть обман.`}</p>
        <input class="input code-in" maxlength="16" placeholder="XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off">`,
      buttons: [{ label: ru`Отмена` }, { label: ru`Перенести`, cls: 'primary', keep: true, fn: async w => {
        const code = w.querySelector('.code-in').value.trim();
        if (code.replace(/[^a-z0-9]/gi, '').length !== 12) { UI.toast(ru`Код — 12 букв и цифр`); return; }
        const btn = w.querySelector('.btn.primary'); btn.disabled = true;
        try { await this.claim(code); w.close(); UI.toast(ru`Прогресс перенесён!`, 'good'); (after || (() => location.reload()))(); }
        catch (e) { UI.toast(U.esc(e.message)); btn.disabled = false; }
      } }],
    });
    setTimeout(() => m.querySelector('.code-in').focus(), 100);
  },
  async codeDialog() {
    let code;
    try { code = await this.makeCode(); } catch (e) { UI.toast(U.esc(e.message)); return; }
    UI.modal({
      title: ru`Код переноса`,
      html: `<p>${ru`Введи этот код на новом устройстве: при первом запуске — «У меня уже есть прогресс», или «Настройки → Перенести прогресс сюда». Код действует 30 минут и один раз.`}</p>
        <div class="transfer-code">${U.esc(code)}</div>
        <p class="small">${ru`После переноса прогресс продолжится на новом устройстве, а здесь можно будет начать заново.`}</p>
        <p class="warn-box">${ru`<b>Никому не сообщай этот код.</b> По нему забирают весь прогресс — духов, монеты и покупки. Орден, модераторы и друзья никогда не просят код; «подарок за код» — это обман.`}</p>`,
      buttons: [{ label: ru`Скопировать`, keep: true, fn: async () => { try { await navigator.clipboard.writeText(code); UI.toast(ru`Код скопирован`, 'good'); } catch (e) { UI.toast(ru`Не удалось скопировать`); } } },
        { label: ru`Готово`, cls: 'primary' }],
    });
  },
};
