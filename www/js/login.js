'use strict';
/* Вход через сервисы (3.27): Google, Яндекс, VK, Telegram — или просто гость.
   Игрок всегда сначала гость. Кнопка «Войти через …» уводит на страницу сервиса, тот возвращает на auth.html,
   а игра отдаёт полученное серверу (Game.auth('signin')). Сервер сам проверяет вход у сервиса и либо привязывает его
   к текущему Ловчему, либо (вход уже привязан к другому — новое устройство) выдаёт одноразовый вход в ту учётную запись.
   Какие сервисы подключены и их публичные номера приложений, знает сервер (Game.auth('info')). */

const Login = {
  info: null,                      // { providers: { google: { client_id }, … }, links: [{ provider, name }] }
  PEND: 'duholov.login',           // что начали: сервис, цель, state, nonce, code_verifier (sessionStorage)
  CB: 'duholov.logincb',           // что вернул сервис (пишет auth.html)
  ORDER: ['google', 'yandex', 'telegram'], // VK ID — позже (код входа готов, кнопку вернуть сюда)
  NAMES: { google: 'Google', yandex: 'Яндекс', vk: 'VK', telegram: 'Telegram' },

  async load() {
    try { this.info = await Game.auth('info'); } catch (e) { this.info = this.info || { providers: {}, links: [] }; }
    // 3.29: вход по почте и паролю (учётные записи создаёт владелец в Supabase — например, для проверки магазином)
    try {
      const u = ((await (await Cloud.client()).auth.getSession()).data.session || {}).user;
      this.email = u && !u.is_anonymous && u.email && !/\.invalid$/i.test(u.email) ? u.email : null;
    } catch (e) { this.email = null; }
    return this.info;
  },
  // приложение для Android до 3-й версии открывало страницы сервисов во внешнем браузере; Google не пускает во встроенные окна
  app() { const m = /DuholovApp\/(\d+)/.exec(navigator.userAgent); return m ? +m[1] : 0; },
  available() {
    const p = (this.info && this.info.providers) || {}, app = this.app();
    return this.ORDER.filter(k => p[k] && !(app && (app < 3 || k === 'google')));
  },
  appTooOld() { const app = this.app(); return app > 0 && app < 3 && this.ORDER.some(k => this.info && this.info.providers && this.info.providers[k]); },
  linked() { return (this.info && this.info.links) || []; },
  isGuest() { return !this.linked().length && !this.email; },
  icon(k) {
    const I = {
      google: '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.8h3.5c2.1-1.9 3.3-4.8 3.3-8.1z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.9A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2.1a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.1L5.7 10C6.6 7.4 9.1 5.4 12 5.4z"/></svg>',
      yandex: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#FC3F1D"/><path fill="#fff" d="M13.3 6.2h-1.1c-2 0-3.1 1-3.1 2.6 0 1.8.8 2.6 2.4 3.7l1.3.9-3.8 5.6H6.2l3.4-5c-2-1.4-3.1-2.6-3.1-4.9 0-2.9 2-4.8 5.7-4.8h3.7v14.7h-2.6z"/></svg>',
      vk: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0077FF"/><path fill="#fff" d="M12.8 17.3c-5.3 0-8.3-3.6-8.4-9.6h2.6c.1 4.4 2 6.3 3.6 6.7V7.7h2.5v3.8c1.5-.2 3.1-1.9 3.6-3.8h2.4a7.2 7.2 0 0 1-3.3 4.7 7.5 7.5 0 0 1 3.9 4.9h-2.7c-.6-1.8-2-3.2-3.9-3.4v3.4z"/></svg>',
      telegram: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#27A7E7"/><path fill="#fff" d="M17.6 7.2 15.6 17c-.1.7-.6.9-1.1.5l-3.1-2.3-1.5 1.4c-.2.2-.3.3-.6.3l.2-3.2 5.8-5.2c.3-.2-.1-.4-.4-.2L7.8 12.8l-3.1-1c-.7-.2-.7-.7.1-1l12-4.6c.6-.2 1 .1.8 1z"/></svg>',
    };
    return `<span class="lg-ic">${I[k] || ''}</span>`;
  },
  buttons(mode, only) {
    return (only || this.available()).map(k => `<button class="btn login-btn" data-login="${k}" data-mode="${mode}">${this.icon(k)}${this.NAMES[k]}</button>`).join('');
  },

  /* ---------- уйти на страницу сервиса ---------- */
  cbUrl() { return new URL('auth.html', location.href.split(/[?#]/)[0]).href; },
  rand(n = 32) { const a = new Uint8Array(n); crypto.getRandomValues(a); return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  async start(provider, mode) {
    const p = this.info && this.info.providers && this.info.providers[provider];
    if (!p) { UI.toast('Этот способ входа пока не подключён'); return; }
    const state = this.rand(16), nonce = this.rand(16), verifier = this.rand(48), redirect = this.cbUrl();
    const pend = { provider, mode, state, nonce, verifier, redirect, t: Date.now() };
    try { sessionStorage.setItem(this.PEND, JSON.stringify(pend)); } catch (e) { UI.toast('Браузер не даёт сохранить вход — проверь настройки'); return; }
    const q = o => new URLSearchParams(o).toString();
    let url;
    if (provider === 'google') url = 'https://accounts.google.com/o/oauth2/v2/auth?' + q({ client_id: p.client_id, redirect_uri: redirect, response_type: 'id_token', scope: 'openid profile', nonce, state, prompt: 'select_account' });
    else if (provider === 'yandex') url = 'https://oauth.yandex.ru/authorize?' + q({ response_type: 'token', client_id: p.client_id, redirect_uri: redirect, state });
    else if (provider === 'vk') {
      const ch = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      url = 'https://id.vk.com/authorize?' + q({ response_type: 'code', client_id: p.client_id, redirect_uri: redirect, state, code_challenge: ch, code_challenge_method: 'S256', scope: 'vkid.personal_info' });
    } else if (provider === 'telegram') url = 'https://oauth.telegram.org/auth?' + q({ bot_id: p.bot_id, origin: location.origin, return_to: redirect, request_access: 'write' });
    if (!url) return;
    Sfx.play('tap');
    this.leaving(provider);
    location.href = url;
  },

  /* ---------- вернулись со страницы сервиса (вызывается при запуске, после загрузки прогресса) ---------- */
  // true — учётная запись сменилась, страницу нужно перезагрузить
  async resume() {
    let pend = null, cb = null;
    try { pend = JSON.parse(sessionStorage.getItem(this.PEND)); cb = JSON.parse(sessionStorage.getItem(this.CB)); } catch (e) {}
    try { sessionStorage.removeItem(this.PEND); sessionStorage.removeItem(this.CB); } catch (e) {}
    if (!pend || !cb) return false;
    if (Date.now() - pend.t > 15 * 60000) { UI.toast('Вход устарел — попробуй ещё раз'); return false; }
    if (cb.error) { UI.toast(cb.error_description ? `Вход не выполнен: ${U.esc(cb.error_description)}` : 'Вход отменён'); return false; }
    let proof;
    if (pend.provider === 'telegram') {
      let data = null;
      try { data = JSON.parse(decodeURIComponent(escape(atob(String(cb.tgAuthResult || '').replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) {}
      if (!data) { UI.toast('Вход через Telegram отменён'); return false; }
      proof = { data };
    } else {
      if (cb.state !== pend.state) { UI.toast('Вход не подтверждён — попробуй ещё раз'); return false; } // защита от подмены ответа
      if (pend.provider === 'google') proof = { id_token: cb.id_token, nonce: pend.nonce };
      if (pend.provider === 'yandex') proof = { access_token: cb.access_token };
      if (pend.provider === 'vk') proof = { code: cb.code, device_id: cb.device_id, code_verifier: pend.verifier, redirect_uri: pend.redirect, state: cb.state };
    }
    let r;
    try { r = await Game.auth('signin', { provider: pend.provider, proof }); }
    catch (e) { UI.toast(U.esc(e.message)); return false; }
    const name = this.NAMES[pend.provider];
    if (r.linked) {
      await this.load(); this.markLogged(); // сразу в игру, без экрана входа
      UI.toast(r.already ? `Вход через ${name} уже привязан` : `Готово: вход через ${name} привязан — прогресс не потеряется`, 'good');
      return false;
    }
    if (r.switch) {
      // вход привязан к другому Ловчему: на новом устройстве (без прогресса) — сразу туда, иначе спросить
      const go = async () => {
        const sb = await Cloud.client();
        const { error } = await sb.auth.verifyOtp({ token_hash: r.token_hash, type: 'email' });
        if (error) { UI.toast('Не удалось войти — попробуй ещё раз'); return false; }
        this.markLogged(); return true;
      };
      if (!S.d || pend.mode === 'start') return go();
      const who = r.player ? `«${U.esc(r.player.name)}» (${r.player.level} ур.)` : 'другому Ловчему';
      return new Promise(res => UI.modal({
        title: 'Вход уже привязан',
        html: `<p>Вход через ${name} привязан к Ловчему ${who}.</p><p class="small">Перейти в ту учётную запись? Текущий прогресс на этом устройстве ${this.isGuest() ? 'гостевой — он останется в прежней учётной записи, вернуться в неё будет нельзя' : 'останется в своей учётной записи'}.</p>`,
        buttons: [{ label: 'Остаться', fn: () => res(false) }, { label: 'Перейти', cls: 'primary', fn: async () => res(await go()) }],
        dismiss: false,
      }));
    }
    return false;
  },

  /* ---------- 3.28: экран входа при каждом запуске ---------- */
  // плашки учётной записи: сервисы, через которые привязан вход, или «Гость»
  accountTags() {
    const links = this.linked();
    const mail = this.email ? `<span class="acc-tag mail">${UI.I.key}${U.esc(this.email)}</span>` : '';
    return links.length || mail ? mail + links.map(l => `<span class="acc-tag">${this.icon(l.provider)}${this.NAMES[l.provider]}${l.name ? ` · ${U.esc(l.name)}` : ''}</span>`).join('')
      : '<span class="acc-tag guest">Гость</span>';
  },
  // Вход по почте и паролю (3.31 — своё оформление): учётную запись заранее создаёт владелец (Supabase → Authentication → Users)
  emailForm() {
    const m = UI.modal({
      cls: 'mail-modal', buttons: [],
      html: `<div class="mail-head"><span class="mail-ic">${UI.I.key}</span><b>Вход по почте</b><small>Для учётных записей, выданных Орденом</small>${S.d && this.isGuest() ? '<small class="mail-note">Гостевой прогресс на этом устройстве сменится прогрессом этой учётной записи</small>' : ''}</div>
        <form class="mail-form" novalidate>
          <label class="fld"><span class="fld-ic">${UI.I.mail}</span><input name="email" type="email" inputmode="email" autocomplete="username" placeholder="Почта" required></label>
          <label class="fld"><span class="fld-ic">${UI.I.lock}</span><input name="password" type="password" autocomplete="current-password" placeholder="Пароль" required>
            <button type="button" class="fld-eye" aria-label="Показать пароль">${UI.I.eye}</button></label>
          <div class="mail-err" role="alert"></div>
          <button class="btn primary wide mail-go">Войти</button>
          <button type="button" class="linkish mail-cancel">Отмена</button>
        </form>`,
    });
    const f = m.querySelector('.mail-form'), err = f.querySelector('.mail-err'), go = f.querySelector('.mail-go'), eye = f.querySelector('.fld-eye');
    const fail = text => { err.textContent = text; f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); go.disabled = false; go.textContent = 'Войти'; };
    setTimeout(() => f.email.focus(), 250);
    f.querySelector('.mail-cancel').onclick = () => m.close();
    eye.onclick = () => {
      const show = f.password.type === 'password';
      f.password.type = show ? 'text' : 'password';
      eye.innerHTML = show ? UI.I.eyeOff : UI.I.eye;
      eye.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
    };
    f.oninput = () => { err.textContent = ''; };
    f.onsubmit = async e => {
      e.preventDefault();
      const email = f.email.value.trim(), password = f.password.value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fail('Проверь почту'); f.email.focus(); return; }
      if (!password) { fail('Введи пароль'); f.password.focus(); return; }
      go.disabled = true; go.textContent = 'Вхожу…'; err.textContent = '';
      try {
        const sb = await Cloud.client();
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) { fail(/rate|many/i.test(error.message) ? 'Слишком много попыток — подожди минуту' : 'Неверная почта или пароль'); return; }
        go.textContent = 'Готово!';
        this.markLogged(); location.reload();
      } catch (x) { fail('Нет связи с сервером — попробуй ещё раз'); }
    };
  },
  // Панель входа (3.30): заголовок, кнопки сервисов, внизу — почта и пароль (+ extra, например «Выйти»)
  panel(head, buttons, extra = '') {
    return `<div class="auth-panel"><div class="auth-head">${head}</div>
      ${buttons ? `<div class="login-row">${buttons}</div>` : ''}
      ${this.appTooOld() ? '<p class="small onb-note">Вход через Яндекс и Telegram — в новой версии приложения: <a href="${Updater.apkUrl()}">скачать</a>.</p>' : ''}
      <div class="auth-or"><span>или</span></div>
      <div class="auth-foot"><button class="btn mail-login"><span class="ml-ic">${UI.I.key}</span><span class="ml-t">Почта и пароль</span><span class="ml-chev">›</span></button>${extra}</div></div>`;
  },
  // Только что вошёл (через сервис или по почте) — экран входа при следующем запуске страницы не нужен
  SKIP: 'duholov.justLogged',
  markLogged() { try { sessionStorage.setItem(this.SKIP, '1'); } catch (e) {} },
  justLogged() { let v = null; try { v = sessionStorage.getItem(this.SKIP); sessionStorage.removeItem(this.SKIP); } catch (e) {} return !!v; },
  // Вернувшийся Ловчий: «С возвращением», чей это прогресс, «Продолжить»; ниже — панель входа.
  // 3.32: компактнее (всё видно без прокрутки), «Выйти» — прямо на карточке учётной записи
  gate(done) {
    const root = U.el('<div class="onb"></div>'), d = S.d, avail = this.available(), guest = this.isGuest();
    const dex = Object.values(d.dex || {}).filter(x => x && x.caught).length;
    const panel = guest
      ? this.panel('<b>Сохрани прогресс</b><small>Привяжи вход — и прогресс откроется на любом устройстве</small>', this.buttons('link'))
      : this.panel('<b>Другой аккаунт</b><small>Текущий прогресс останется в своей учётной записи</small>',
        avail.map(k => `<button class="btn login-btn" data-switch="${k}">${this.icon(k)}${this.NAMES[k]}</button>`).join(''));
    root.innerHTML = `<div class="onb-step s0 gate">
      <div class="onb-logo"><div class="onb-charm">${Art.charm('charm3')}</div><h1>ДУХОЛОВ</h1><p>С возвращением, Ловчий!</p></div>
      <div class="acc-card ${guest ? 'is-guest' : ''}" style="--cc:${d.clan && CLANS[d.clan] ? CLANS[d.clan].color : '#fbbf24'}">
        <div class="acc-top"><div class="pc-ava"><div class="acc-ava">${Art.avatar(d.look)}</div><span class="pc-lvl">${d.level}</span></div>
          <div class="acc-main"><b>${U.esc(d.name)}</b><small>${UI.rank(d.level)} · ${d.level} уровень</small><div class="acc-tags">${this.accountTags()}</div></div></div>
        <div class="acc-stats"><div><b>${U.fmtNum(d.spirits.length)}</b><span>духов</span></div><div><b>${dex}/${SPECIES.length}</b><span>бестиарий</span></div>
          <div><b>${U.fmtNum(d.stats.caught || 0)}</b><span>поймано</span></div></div>
        ${Game.on() ? `<div class="acc-foot ${guest ? 'warn' : 'ok'}"><span>${guest ? `${UI.I.user}Прогресс только на этом устройстве` : `${UI.I.cloud}Прогресс в облаке`}</span>
          <button class="acc-exit" aria-label="Выйти из учётной записи">${UI.I.logout}Выйти</button></div>` : ''}
      </div>
      <button class="btn primary wide go">Продолжить</button>
      ${!Game.on() ? '' : guest ? panel : `<button class="gate-more" aria-expanded="false">${UI.I.swap}<span>Войти в другой аккаунт</span><i class="gm-chev">›</i></button><div class="gate-other hidden">${panel}</div>`}
    </div>`;
    document.body.appendChild(root);
    const close = () => { root.classList.add('out'); setTimeout(() => root.remove(), 400); };
    root.querySelector('.go').onclick = () => { Sfx.init(); Sfx.play('tap'); close(); done(); };
    root.querySelectorAll('[data-login]').forEach(b => { b.onclick = () => this.start(b.dataset.login, 'link'); });
    root.querySelectorAll('[data-switch]').forEach(b => { b.onclick = () => this.switchTo(b.dataset.switch); });
    const mail = root.querySelector('.mail-login');
    if (mail) mail.onclick = () => this.emailForm();
    // 3.34: у вошедшего «Другой аккаунт» свёрнут — чаще всего нужен просто «Продолжить»
    const more = root.querySelector('.gate-more');
    if (more) more.onclick = () => {
      const box = root.querySelector('.gate-other'), open = box.classList.toggle('hidden') === false;
      more.setAttribute('aria-expanded', open); more.classList.toggle('open', open);
      if (open) setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    };
    const out = root.querySelector('.acc-exit');
    if (out) out.onclick = () => this.askSignOut();
  },
  async switchTo(provider) {
    if (this.isGuest()) return this.start(provider, 'link');
    this.leaving(provider);
    await this.dropSession();
    // новый гость создастся при возвращении; если вход через сервис уже привязан — игра сразу откроет ту учётную запись
    return this.start(provider, 'start');
  },
  // 3.31.1: выйти только на этом устройстве и не дольше 1,5 с. Раньше sb.auth.signOut() шёл на сервер и ждал
  // внутреннюю блокировку клиента — после нажатия кнопки входа до 15 с ничего не происходило
  async dropSession() {
    try { const sb = await Cloud.client(); await Promise.race([sb.auth.signOut({ scope: 'local' }), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
    try { localStorage.removeItem(CLOUD_CONFIG.auth); } catch (e) {}
    Cloud.sb = null;
  },
  // Сразу показать, что нажатие принято: страница сервиса может открываться несколько секунд
  leaving(provider) {
    Loader.show(`Открываю ${this.NAMES[provider] || 'вход'}…`); Loader.set(30);
    // вернулся кнопкой «Назад» (страница из кэша браузера) — убрать экран
    window.addEventListener('pageshow', e => { if (e.persisted) Loader.hide(); }, { once: true });
  },

  // 3.32: выйти из текущей учётной записи. У гостя нет входа, чтобы вернуться, — предупреждаем прямо
  askSignOut() {
    if (!this.isGuest()) {
      UI.confirm('Выйти?', 'Прогресс останется в учётной записи — вернуться в неё можно тем же входом. На этом устройстве начнётся новая гостевая игра.', 'Выйти', () => this.signOut());
      return;
    }
    const names = this.available().map(k => this.NAMES[k]);
    UI.confirm('Выйти из гостевой игры?', `<b>Прогресс гостя пропадёт навсегда</b> — у гостя нет входа, чтобы вернуться.${names.length ? ` Чтобы сохранить его, сначала привяжи вход через ${names.join(' или ')}.` : ''}`,
      'Выйти', () => this.signOut(true), 'Отмена', true);
  },
  async signOut(guest) {
    if (this.isGuest() && !guest) return;
    Loader.show('Выхожу…'); Loader.set(40);
    await this.dropSession();
    location.reload();
  },
};
