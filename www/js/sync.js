'use strict';
/* Прогресс на сервере. Главная копия — на сервере игры (таблица saves, только своя строка).
   На телефоне — рабочий кэш, чтобы играть без связи; изменения уходят на сервер в течение ~30 секунд.
   Если сервер знает более новую версию (другое устройство, перенос) — побеждает сервер. */

const Sync = {
  KEY: 'duholov.sync',
  DELAY: 30000,      // изменения копятся и уходят пачкой; при сворачивании игры — сразу
  st: { uid: null, rev: 0, dirty: false },
  uid: null, gen: 0, timer: null, pushing: false, moved: false, online: false,

  on() { return Cloud.configured(); },
  loadMeta() { try { Object.assign(this.st, JSON.parse(localStorage.getItem(this.KEY)) || {}); } catch (e) {} },
  saveMeta() { try { localStorage.setItem(this.KEY, JSON.stringify(this.st)); } catch (e) {} },
  timeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Сервер не отвечает')), ms))]); },

  // что уходит на сервер: без последней точки на карте (она нужна только этому телефону)
  payload() {
    const d = Object.assign({}, S.d);
    delete d.lastPos; delete d.tutPos;
    return d;
  },
  adopt(data, rev) {
    const keep = S.d && S.d.lastPos;
    S.d = data; S.migrate();
    if (keep && !S.d.lastPos) S.d.lastPos = keep;
    S.writeLocal();
    this.st.rev = rev; this.st.dirty = false; this.gen++;
    this.saveMeta();
  },

  // До старта игры: сверить кэш с сервером. Без связи — играем с кэша.
  async boot() {
    this.loadMeta();
    if (!this.on()) return;
    try {
      const sb = await this.timeout(Cloud.client(), 8000);
      const { data: ses } = await sb.auth.getSession();
      this.uid = ses.session.user.id;
      if (this.st.uid !== this.uid) this.st = { uid: this.uid, rev: 0, dirty: !!S.d };
      const { data: row, error } = await this.timeout(sb.from('saves').select('data, rev, moved_to').maybeSingle(), 8000);
      if (error) throw new Error(error.message);
      this.online = true;
      if (row && row.moved_to) { this.moved = true; return; }
      if (row && row.rev > this.st.rev) {
        if (S.d && this.st.dirty) this.note = 'Прогресс загружен с сервера: на другом устройстве он новее.';
        this.adopt(row.data, row.rev);
      } else if (S.d && (this.st.dirty || !row)) {
        this.st.dirty = true;
        this.schedule(0);
      }
      this.saveMeta();
    } catch (e) { console.warn('Синхронизация:', e.message); }
  },

  // вызывается при каждом сохранении
  touch(now) {
    if (!this.on() || this.moved) return;
    this.gen++;
    if (!this.st.dirty) { this.st.dirty = true; this.saveMeta(); }
    if (now) this.push();
    else this.schedule(this.DELAY);
  },
  schedule(ms) {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.push(); }, ms);
  },
  push() {
    if (!this.on() || !S.d || this.moved || !this.st.dirty) return Promise.resolve();
    if (this.pushing) { this.again = true; return this._p; }
    this._p = this._push();
    return this._p;
  },
  async _push() {
    clearTimeout(this.timer); this.timer = null;
    this.pushing = true;
    const gen = this.gen;
    let retry = false;
    try {
      const sb = await Cloud.client();
      if (!this.uid) { const { data: ses } = await sb.auth.getSession(); this.uid = ses.session.user.id; this.st.uid = this.uid; }
      const { data: r, error } = await sb.rpc('put_save', { p_data: this.payload(), p_base: this.st.rev, p_ver: APP_VERSION });
      if (error) throw new Error(error.message);
      this.online = true;
      if (r.ok) {
        this.st.rev = r.rev;
        if (this.gen === gen) this.st.dirty = false;
        this.saveMeta();
      } else if (r.moved) this.onMoved();
      else await this.onConflict();
    } catch (e) {
      console.warn('Сохранение на сервер:', e.message);
      this.online = false;
      retry = true;
    }
    this.pushing = false;
    if (this.again || (this.st.dirty && !this.moved)) { this.again = false; this.schedule(retry ? 30000 : this.DELAY); }
  },

  // На сервере версия новее: прогресс меняли на другом устройстве
  async onConflict() {
    const sb = await Cloud.client();
    const { data: row } = await sb.from('saves').select('data, rev, moved_to').maybeSingle();
    if (!row) { this.st.rev = 0; return; }
    if (row.moved_to) { this.onMoved(); return; }
    this.adopt(row.data, row.rev);
    UI.modal({
      title: 'Прогресс обновлён', dismiss: false,
      html: '<p>На сервере есть более новая версия твоего прогресса — видимо, ты играл на другом устройстве. Игра загрузит её.</p>',
      buttons: [{ label: 'Продолжить', cls: 'primary', fn: () => location.reload() }],
    });
  },
  onMoved() {
    if (this._movedShown) return;
    this.moved = true; this._movedShown = true;
    clearTimeout(this.timer);
    UI.modal({
      title: 'Прогресс перенесён', dismiss: false,
      html: '<p>Твой прогресс перенесён на другое устройство и продолжается там. На этом устройстве можно начать заново.</p>',
      buttons: [{ label: 'Начать заново', cls: 'primary', fn: () => this.startOver() }],
    });
  },
  async startOver() {
    S.reset();
    this.st = { uid: null, rev: 0, dirty: false }; this.saveMeta();
    try { const sb = await Cloud.client(); await sb.auth.signOut(); } catch (e) {}
    location.reload();
  },

  // Сброс прогресса: удалить и серверную копию, иначе она вернётся при следующем запуске
  async wipe() {
    const sb = await this.timeout(Cloud.client(), 8000);
    const { error } = await sb.from('saves').delete().eq('user_id', this.uid || (await sb.auth.getSession()).data.session.user.id);
    if (error) throw new Error(error.message);
    this.st = { uid: this.uid, rev: 0, dirty: false }; this.saveMeta();
  },

  /* ---------- перенос на другое устройство ---------- */
  async makeCode() {
    for (let i = 0; i < 2 && this.st.dirty; i++) await this.push();
    if (this.st.dirty) throw new Error('Не удалось сохранить прогресс на сервере. Проверь интернет.');
    const sb = await Cloud.client();
    const { data, error } = await sb.rpc('make_transfer_code');
    if (error) throw new Error(error.message);
    return data;
  },
  async claim(code) {
    const sb = await this.timeout(Cloud.client(), 8000);
    const { data, error } = await sb.rpc('claim_transfer', { p_code: code });
    if (error) throw new Error(error.message);
    this.uid = (await sb.auth.getSession()).data.session.user.id;
    this.st.uid = this.uid;
    this.adopt(data.data, data.rev);
  },
  // диалог ввода кода (из настроек и со стартового экрана)
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
        catch (e) { UI.toast(e.message); btn.disabled = false; }
      } }],
    });
    setTimeout(() => m.querySelector('.code-in').focus(), 100);
  },
  async codeDialog() {
    let code;
    try { code = await this.makeCode(); } catch (e) { UI.toast(e.message); return; }
    const m = UI.modal({
      title: 'Код переноса',
      html: `<p>Введи этот код на новом устройстве: при первом запуске — «У меня уже есть прогресс», или «Настройки → Перенести прогресс сюда». Код действует 24 часа и один раз.</p>
        <div class="transfer-code">${U.esc(code)}</div>
        <p class="small">После переноса прогресс продолжится на новом устройстве, а здесь можно будет начать заново. Никому не сообщай код.</p>`,
      buttons: [{ label: 'Скопировать', keep: true, fn: async () => { try { await navigator.clipboard.writeText(code); UI.toast('Код скопирован', 'good'); } catch (e) { UI.toast('Не удалось скопировать'); } } },
        { label: 'Готово', cls: 'primary' }],
    });
    return m;
  },
};
