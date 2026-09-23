'use strict';
/* Точка входа */

// Предложение установить PWA может прийти ещё до загрузки — запоминаем для кнопки в настройках
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; });

// после обновления страница открывается с меткой ?u=… (обход кэша CDN) — убираем её из адреса
if (/[?&]u=\d+/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);

window.addEventListener('load', () => {
  if (typeof L === 'undefined') {
    document.body.appendChild(U.el(`<div class="fatal"><h2>Нет связи с Навью</h2><p>Не удалось загрузить карту. Проверь подключение к интернету.</p><button class="btn primary" onclick="location.reload()">Повторить</button></div>`));
    return;
  }

  const start = () => {
    S.ensureQuests();
    W.prune();
    UI.init();
    Poi.init();
    MapView.init();
    Poi.ensure();
    if (Sync.moved) Sync.onMoved();
    else if (Sync.note) setTimeout(() => UI.toast(Sync.note, 'good'), 1200);
    setTimeout(() => Propose.checkResults(), 6000);
    setInterval(() => { if (!document.hidden) Propose.checkResults(); }, 3 * 60000);
    setTimeout(() => Friends.sync(), 8000); // взаимная дружба: кто добавил меня по коду
    setInterval(() => { if (!document.hidden) Friends.sync(); }, 3 * 60000);
    Sky.init();
    Music.init();
    Music.play('map');
    Tut.init();
    Bus.on('cocoonReady', c => UI.toast(`${COCOON_TIERS[c.km].name} готов вылупиться!`, 'good'));
    const ready = S.readyCocoons().length;
    if (ready) setTimeout(() => UI.toast(`Коконов готово: ${ready}. Загляни в меню!`, 'good'), 1500);
    setInterval(() => { W.prune(); S.ensureQuests(); }, 60000);
    Updater.init();
  };

  // Сначала сверяемся с сервером: главная копия прогресса хранится там
  const boot = async () => {
    S.load();
    const splash = setTimeout(() => document.body.appendChild(U.el('<div class="boot-splash"><div class="onb-charm">' + Art.charm('charm3') + '</div><p>Связь с Навью…</p></div>')), 400);
    await Sync.boot();
    clearTimeout(splash);
    const sp = U.$('.boot-splash'); if (sp) sp.remove();
    if (S.d) start(); else UI.onboarding(start);
  };
  boot();

  // Звук можно включить только после первого касания
  const unlock = () => { Sfx.init(); Music.apply(); window.removeEventListener('pointerdown', unlock); };
  window.addEventListener('pointerdown', unlock);

  document.addEventListener('visibilitychange', () => { if (document.hidden && S.d) S.save(true); });
  window.addEventListener('pagehide', () => { if (S.d) S.save(true); });

  // Кнопка «Назад» в Android-обёртке: true — можно закрывать приложение
  window.nativeBack = () => (S.d ? UI.back() : true);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || DEV)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
