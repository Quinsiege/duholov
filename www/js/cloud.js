'use strict';
/* Облако (Supabase): анонимный вход (в закрытом тестовом контуре — с ключом доступа). Через него работают сервер игры
   (game.js), объекты карты (pois.js) и заявки мест (propose.js). Таблицу сезона Лиги отдаёт только сервер игры. */

const Cloud = {
  LIB: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
  LIB_SRI: 'sha384-GFr3yTh5lJznCbZfpTtXnwboFsxqtTQoeTZCRHhE0579KrRmlCzen5AA8ohaB5ug', // проверка целостности: подменённый файл CDN не выполнится
  sb: null,

  // автотесты (браузер под управлением Playwright) на боевой сервер не ходят
  configured() { return !!(CLOUD_CONFIG.url && CLOUD_CONFIG.anonKey) && !navigator.webdriver; },
  enabled() { return this.configured(); }, // таблицу видят все; Cfg.s.cloud — показывать ли в ней себя

  async client() {
    if (this.sb) return this.sb;
    if (!window.supabase) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = this.LIB; s.integrity = this.LIB_SRI; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = () => rej(new Error('Не удалось загрузить облачную библиотеку'));
        document.head.appendChild(s);
      });
    }
    const sb = window.supabase.createClient(CLOUD_CONFIG.url, CLOUD_CONFIG.anonKey, { auth: { persistSession: true, storageKey: CLOUD_CONFIG.auth } });
    const { data } = await sb.auth.getSession();
    if (!data.session) await this.signIn(sb);
    this.sb = sb;
    return sb;
  },
  // Анонимный вход (в закрытом контуре — с ключом доступа)
  async signIn(sb) {
    const key = await this.accessKey();
    const { error } = await sb.auth.signInAnonymously(key ? { options: { data: { access: key } } } : undefined);
    if (error && CLOUD_CONFIG.locked) this.forgetKey(); // неверный ключ — спросим снова
    if (error) throw new Error('Облако: ' + error.message);
  },
  // Сохранённый вход больше не действует (например, пользователя удалили) — войти заново
  async relogin() {
    const sb = await this.client();
    await sb.auth.signOut().catch(() => {});
    await this.signIn(sb);
  },

  // Закрытый контур (тестовый проект): ключ доступа знает только владелец — его нет в коде и репозитории.
  // Передаётся при входе (хук Before User Created) и с каждым запросом к серверу игры (заголовок x-duholov-access).
  // Спрашивается окном игры (системный prompt доступен не везде) и хранится только в этом браузере.
  KEY_STORE: 'duholov.test.key',
  _asking: null,
  async accessKey() {
    if (!CLOUD_CONFIG.locked) return '';
    let k = '';
    try { k = localStorage.getItem(this.KEY_STORE) || ''; } catch (e) {}
    if (k) return k;
    if (!this._asking) {
      this._asking = new Promise(res => {
        UI.modal({
          title: 'Тестовый контур', dismiss: false, cls: 'key-modal',
          html: '<p class="small">Это закрытый тестовый сервер. Введи ключ доступа — он сохранится только в этом браузере.</p><input class="input key-in" type="password" autocomplete="off" placeholder="Ключ доступа">',
          buttons: [{ label: 'Войти', cls: 'primary', keep: true, fn: w => {
            const v = w.querySelector('.key-in').value.trim();
            if (!v) return;
            try { localStorage.setItem(this.KEY_STORE, v); } catch (e) {}
            w.close(); res(v);
          } }],
        });
      }).finally(() => { this._asking = null; });
    }
    return this._asking;
  },
  forgetKey() { try { localStorage.removeItem(this.KEY_STORE); } catch (e) {} },
  async headers() { const k = await this.accessKey(); return k ? { 'x-duholov-access': k } : {}; },
};
