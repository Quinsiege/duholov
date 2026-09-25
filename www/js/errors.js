'use strict';
/* 4.1: ошибки в браузере игрока — на сервер игры (таблица client_errors), чтобы видеть поломки, о которых не пишут.
   Не больше 10 разных ошибок за запуск, без данных игрока: версия, страница, текст, место в коде, браузер. */
const Errors = {
  sent: 0, seen: new Set(),
  report(msg, src, line, stack) {
    if (this.sent >= 10 || navigator.webdriver || typeof CLOUD_CONFIG === 'undefined' || !CLOUD_CONFIG.url) return;
    const key = `${msg}|${src}|${line}`;
    if (this.seen.has(key)) return;
    this.seen.add(key); this.sent++;
    try {
      fetch(CLOUD_CONFIG.url + '/functions/v1/game/log', {
        method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ v: APP_VERSION, page: location.pathname, msg: String(msg || '').slice(0, 500), src: String(src || '').slice(0, 200),
          line: line | 0, stack: String(stack || '').slice(0, 2000) }),
      }).catch(() => {});
    } catch (e) {}
  },
};
addEventListener('error', e => { if (e.message) Errors.report(e.message, e.filename, e.lineno, e.error && e.error.stack); });
addEventListener('unhandledrejection', e => { const r = e.reason; Errors.report((r && r.message) || String(r), 'promise', 0, r && r.stack); });
