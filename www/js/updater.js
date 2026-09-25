'use strict';
/* Обновления: клиент сверяет свою версию с www/version.json на сервере.
   Проверка — при входе в игру и при возвращении в неё (не чаще раза в 5 минут).
   Если вышла новая версия — обязательное окно «Обновить»: сохраняем прогресс, чистим кэш кода и перезагружаемся. */

const Updater = {
  IN_APP: /DuholovApp\/(\d+)/.test(navigator.userAgent),
  APK: +((navigator.userAgent.match(/DuholovApp\/(\d+)/) || [])[1] || 0),
  lastCheck: 0,
  shown: false,

  cmp(a, b) {
    const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return Math.sign(d); }
    return 0;
  },

  // 4.1: приложение до переезда на duholov.ru (подписано другим ключом — новое ставится только заново)
  oldApp() { return this.IN_APP && this.APK < 4; },
  // раз в 3 дня напомнить: привязать вход, удалить старое приложение, установить новое
  OLD_APP: 'duholov.oldAppHint',
  oldAppHint() {
    if (!this.oldApp() || this.shown) return;
    try { if (Date.now() - (+localStorage.getItem(this.OLD_APP) || 0) < 3 * 86400000) return; localStorage.setItem(this.OLD_APP, Date.now()); } catch (e) { return; }
    UI.modal({
      title: 'Новое приложение', cls: 'update-modal',
      html: `<p>Игра переехала на свой сервер в России — <b>duholov.ru</b>. Для этого вышло новое приложение: его нужно установить заново.</p>
        <ol class="upd-notes"><li>Привяжи вход: Меню → Настройки → Учётная запись (Google, Яндекс, VK, Telegram или почта). Без этого прогресс гостя не перенесётся.</li>
        <li>Удали это приложение.</li><li>Скачай и установи новое — войди тем же способом.</li></ol>`,
      buttons: [{ label: 'Позже' }, { label: 'Скачать', cls: 'primary', fn: () => { location.href = this.apkUrl(); } }],
    });
  },

  init() {
    this.whatsNew();
    this.check();
    setTimeout(() => this.oldAppHint(), 20000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.check(); });
    // 4.7.3: обновление, вышедшее, пока игрок в игре, находится само — проверка раз в 5 минут, пока игра открыта
    setInterval(() => { if (!document.hidden) this.check(); }, 5 * 60000);
  },

  // Первый запуск после обновления: показать, что нового
  SEEN: 'duholov.seenVersion',
  whatsNew() {
    let seen = null;
    try { seen = localStorage.getItem(this.SEEN); localStorage.setItem(this.SEEN, APP_VERSION); } catch (e) { return; }
    if (!seen && S.d && Date.now() - S.d.created > 60000) seen = '2.0.0'; // игроки 2.0.0 ещё не хранили версию
    if (!seen || this.cmp(APP_VERSION, seen) <= 0) return;
    fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null).then(v => {
      const notes = v && v.version === APP_VERSION && Array.isArray(v.notes) ? v.notes : [];
      UI.modal({
        title: 'Игра обновлена', cls: 'update-modal',
        html: `<div class="upd-ver">${U.esc(seen)} → <b>${U.esc(APP_VERSION)}</b></div>
          ${notes.length ? `<ul class="upd-notes">${notes.map(n => `<li>${U.esc(n)}</li>`).join('')}</ul>` : ''}`,
        buttons: [{ label: 'Отлично', cls: 'primary' }],
      });
    });
  },

  // 4.0.2: проверка на экране загрузки, ещё до входа в игру. Возвращает: null — всё свежее (или нет сети:
  // не держим загрузку дольше 4 с), 'apk' — нужно новое приложение, иначе — данные новой версии для apply()
  async boot() {
    // 4.7.3: ждём ответа до 8 с (медленный мобильный интернет); не успел — запрос не бросаем:
    // пришла новая версия позже — окно обновления поверх всего, как только игра открылась
    const req = fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
    const v = await Promise.race([req, U.wait(8000).then(() => undefined)]);
    this.lastCheck = Date.now();
    if (v === undefined) {
      req.then(late => {
        if (!late || this.shown) return;
        if (this.IN_APP && late.minApk && this.APK < late.minApk) this.promptApk(late);
        else if (this.cmp(late.version, APP_VERSION) > 0) {
          // ещё на экране загрузки — ставим сразу, без окна
          if (typeof Loader !== 'undefined' && Loader.el) { this.shown = true; Loader.set(30, `Загружаю обновление ${late.version}…`); this.apply(late.version); }
          else this.prompt(late);
        }
      });
      return null;
    }
    if (!v) return null;
    if (this.IN_APP && v.minApk && this.APK < v.minApk) return 'apk';
    if (this.cmp(v.version, APP_VERSION) <= 0) return null;
    // только что обновлялись, а версия всё ещё старая — CDN ещё раздаёт прежнюю: входим, check() повторит позже
    let tried = null;
    try { tried = JSON.parse(sessionStorage.getItem(this.TRIED)); } catch (e) {}
    if (tried && tried.v === v.version && Date.now() - tried.t < 3 * 60000) { this.lastCheck = 0; return null; }
    return v;
  },

  async check(force) {
    if (this.shown || (!force && Date.now() - this.lastCheck < 5 * 60000)) return;
    this.lastCheck = Date.now();
    let v;
    try {
      const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return;
      v = await r.json();
    } catch (e) { return; } // нет сети — проверим в следующий раз
    if (this.IN_APP && v.minApk && this.APK < v.minApk) return this.promptApk(v);
    if (this.cmp(v.version, APP_VERSION) <= 0) return;
    // только что обновлялись, а версия всё ещё старая — новая ещё расходится по серверам; повторим сами
    let tried = null;
    try { tried = JSON.parse(sessionStorage.getItem(this.TRIED)); } catch (e) {}
    if (tried && tried.v === v.version && Date.now() - tried.t < 3 * 60000) {
      setTimeout(() => this.apply(v.version), 20000);
      return;
    }
    this.prompt(v);
  },
  TRIED: 'duholov.updTried',

  prompt(v) {
    this.shown = true;
    UI.modal({
      title: 'Доступно обновление', cls: 'update-modal', dismiss: false,
      html: `<div class="upd-ver">${U.esc(APP_VERSION)} → <b>${U.esc(v.version)}</b></div>
        ${Array.isArray(v.notes) && v.notes.length ? `<ul class="upd-notes">${v.notes.map(n => `<li>${U.esc(n)}</li>`).join('')}</ul>` : ''}
        <p class="small">Прогресс сохранится. Обновление займёт несколько секунд.</p>`,
      buttons: [{ label: 'Обновить', cls: 'primary', keep: true, fn: w => { w.querySelector('.btn.primary').textContent = 'Обновляю…'; this.apply(v.version); } }],
    });
  },

  // 4.3.2: откуда приложение — с сайта (APK) или из магазина (store=rustore в User-Agent, см. MainActivity):
  // приложению из магазина новая версия приходит только через магазин
  STORE: (navigator.userAgent.match(/store=([a-z]+)/) || [])[1] || '',
  STORES: { rustore: { name: 'RuStore', url: 'https://www.rustore.ru/catalog/app/ru.duholov.game' } },
  apkUrl() { return this.STORES[this.STORE] ? this.STORES[this.STORE].url : 'duholov.apk'; },

  // Устаревшее приложение-обёртка: новую версию нужно скачать и установить (или обновить в магазине)
  promptApk(v) {
    this.shown = true;
    const st = this.STORES[this.STORE];
    UI.modal({
      title: 'Обновите приложение', cls: 'update-modal', dismiss: false,
      html: st ? `<p>Вышла новая версия приложения Духолов. Обновите его в ${st.name} — прогресс сохранится.</p>`
        : `<p>Вышла новая версия приложения Духолов для Android. Скачайте её и установите поверх текущей — прогресс сохранится.</p>`,
      buttons: [{ label: st ? `Открыть ${st.name}` : 'Скачать обновление', cls: 'primary', keep: true, fn: () => { location.href = this.apkUrl(); } }],
    });
  },

  async apply(version) {
    try { sessionStorage.setItem(this.TRIED, JSON.stringify({ v: version, t: Date.now() })); } catch (e) {}
    try { await Promise.race([Game.flushMove(), U.wait(3000)]); } catch (e) {} // прогресс и так на сервере
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k.startsWith('duholov-v')).map(k => caches.delete(k)));
      }
    } catch (e) {}
    // новый адрес страницы: CDN не отдаст закэшированную старую index.html (метка убирается при загрузке, см. main.js)
    location.replace(location.pathname + '?u=' + Date.now());
  },
};
