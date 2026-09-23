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
    this.check();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.check(); });
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
    if (this.cmp(v.version, APP_VERSION) > 0) this.prompt(v);
  },

  prompt(v) {
    this.shown = true;
    UI.modal({
      title: 'Доступно обновление', cls: 'update-modal', dismiss: false,
      html: `<div class="upd-ver">${U.esc(APP_VERSION)} → <b>${U.esc(v.version)}</b></div>
        ${Array.isArray(v.notes) && v.notes.length ? `<ul class="upd-notes">${v.notes.map(n => `<li>${U.esc(n)}</li>`).join('')}</ul>` : ''}
        <p class="small">Прогресс сохранится. Обновление займёт несколько секунд.</p>`,
      buttons: [{ label: 'Обновить', cls: 'primary', keep: true, fn: w => { w.querySelector('.btn.primary').textContent = 'Обновляю…'; this.apply(); } }],
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

  async apply() {
    try { S.save(true); } catch (e) {}
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
    location.reload();
  },
};
