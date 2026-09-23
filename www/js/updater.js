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

  init() {
    this.whatsNew();
    this.check();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.check(); });
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

  // Устаревшее приложение-обёртка: новую версию нужно скачать и установить
  promptApk(v) {
    this.shown = true;
    UI.modal({
      title: 'Обновите приложение', cls: 'update-modal', dismiss: false,
      html: `<p>Вышла новая версия приложения Духолов для Android. Скачайте её и установите поверх текущей — прогресс сохранится.</p>`,
      buttons: [{ label: 'Скачать обновление', cls: 'primary', keep: true, fn: () => { location.href = 'duholov.apk'; } }],
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
