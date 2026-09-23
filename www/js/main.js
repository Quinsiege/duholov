'use strict';
/* Точка входа */

// Предложение установить PWA может прийти ещё до загрузки — запоминаем для кнопки в настройках
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; });

window.addEventListener('load', () => {
  if (typeof L === 'undefined') {
    document.body.appendChild(U.el(`<div class="fatal"><h2>Нет связи с Навью</h2><p>Не удалось загрузить карту. Проверь подключение к интернету.</p><button class="btn primary" onclick="location.reload()">Повторить</button></div>`));
    return;
  }

  const start = () => {
    S.ensureQuests();
    W.prune();
    UI.init();
    MapView.init();
    Sky.init();
    Music.init();
    Music.play('map');
    Tut.init();
    Bus.on('cocoonReady', c => UI.toast(`${COCOON_TIERS[c.km].name} готов вылупиться!`, 'good'));
    const ready = S.readyCocoons().length;
    if (ready) setTimeout(() => UI.toast(`Коконов готово: ${ready}. Загляни в меню!`, 'good'), 1500);
    setInterval(() => { W.prune(); S.ensureQuests(); }, 60000);
  };

  if (S.load()) start();
  else UI.onboarding(start);

  // Звук можно включить только после первого касания
  const unlock = () => { Sfx.init(); Music.apply(); window.removeEventListener('pointerdown', unlock); };
  window.addEventListener('pointerdown', unlock);

  document.addEventListener('visibilitychange', () => { if (document.hidden && S.d) S.save(true); });
  window.addEventListener('pagehide', () => { if (S.d) S.save(true); });

  // Кнопка «Назад» в Android-обёртке: true — можно закрывать приложение
  window.nativeBack = () => (S.d ? UI.back() : true);

  const inApp = location.hostname === 'appassets.androidplatform.net';
  if ('serviceWorker' in navigator && !inApp && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
