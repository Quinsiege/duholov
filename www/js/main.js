'use strict';
/* Точка входа */

// Предложение установить PWA может прийти ещё до загрузки — запоминаем для кнопки в настройках
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; });

// ссылка-приглашение ?ref=… — код друга запоминается до создания Ловчего
Invite.grab();
// после обновления страница открывается с меткой ?u=… (обход кэша CDN) — убираем её (и приглашение) из адреса
if (/[?&](u|ref)=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);

window.addEventListener('load', () => {
  if (typeof L === 'undefined') {
    const f = U.el(`<div class="fatal"><h2>Нет связи с Навью</h2><p>Не удалось загрузить карту. Проверь подключение к интернету.</p><button class="btn primary">Повторить</button></div>`);
    f.querySelector("button").onclick = () => location.reload();
    document.body.appendChild(f);
    return;
  }

  const start = () => {
    UI.init();
    Poi.init();
    MapView.init();
    Poi.ensure();
    setTimeout(() => Propose.checkResults(), 6000);
    setInterval(() => { if (!document.hidden) Propose.checkResults(); }, 3 * 60000);
    setTimeout(() => Friends.sync(), 4000); // взаимная дружба и подарки
    setInterval(() => { if (!document.hidden) Friends.sync(); }, 3 * 60000);
    Sky.init();
    Music.init();
    Music.play('map');
    Tut.init();
    Bus.on('cocoonReady', c => UI.toast(`${COCOON_TIERS[c.km].name} готов вылупиться!`, 'good'));
    const ready = S.readyCocoons().length;
    if (ready) setTimeout(() => UI.toast(`Коконов готово: ${ready}. Загляни в меню!`, 'good'), 1500);
    // пройденный путь уходит на сервер пачками; раз в 5 минут сервер обновляет задания дня и отметки
    setInterval(() => Game.flushMove(), 45000);
    setInterval(() => { if (!document.hidden) Game.act('tick').then(() => { UI.refreshHud(); Order.daily(); Order.refresh(); }).catch(() => {}); }, 5 * 60000);
    setTimeout(() => Order.daily(), 2500); // серия дней: награда за первый вход за день
    setTimeout(() => Order.refresh(), 8000); // общее дело Ордена — для значка меню
    setTimeout(() => Clans.refresh(), 5000); // кто держит Капища вокруг
    setInterval(() => { if (!document.hidden) { Clans.refresh(); Clans.tribute(); Clans.checkGuards(); Hints.check(); } }, 60000);
    Updater.init();
    setTimeout(() => Treasury.check(), 3000); // Казна: итог оплаты, если игрок вернулся со страницы оплаты
  };

  // Прогресс хранится на сервере: без связи игра ждёт её
  const offline = msg => new Promise(res => {
    const el = U.el(`<div class="fatal"><h2>Нет связи с Навью</h2><p>${U.esc(msg)}</p><p class="small">Прогресс хранится на сервере игры, поэтому нужен интернет.</p><button class="btn primary">Повторить</button></div>`);
    el.querySelector('button').onclick = () => { el.remove(); res(); };
    document.body.appendChild(el);
  });
  const boot = async () => {
    const splash = setTimeout(() => document.body.appendChild(U.el('<div class="boot-splash"><div class="onb-charm">' + Art.charm('charm3') + '</div><p>Связь с Навью…</p></div>')), 400);
    if (Game.on()) {
      for (;;) {
        try { await Game.load(); break; }
        catch (e) { const sp = U.$('.boot-splash'); if (sp) sp.remove(); await offline(e.message); }
      }
    }
    clearTimeout(splash);
    const sp = U.$('.boot-splash'); if (sp) sp.remove();
    // вернулись со страницы сервиса входа — довести вход до конца (учётная запись могла смениться — тогда заново)
    if (Game.on() && !Game.moved) {
      if (await Login.resume()) { location.reload(); return; }
      if (S.d) Login.load(); else await Login.load(); // новичку кнопки входа нужны сразу
    }
    if (Game.moved) Game.onMoved();
    else if (S.d) start();
    else UI.onboarding(start);
  };
  boot();

  // Звук можно включить только после первого касания
  const unlock = () => { Sfx.init(); Music.apply(); window.removeEventListener('pointerdown', unlock); };
  window.addEventListener('pointerdown', unlock);

  document.addEventListener('visibilitychange', () => {
    if (!S.d) return;
    if (document.hidden) Game.flushMove();
    else { Game.act('tick').then(() => { UI.refreshHud(); MapView.refresh(); Order.daily(); }).catch(() => {}); Treasury.check(); }
  });

  // Кнопка «Назад» в Android-обёртке: true — можно закрывать приложение
  window.nativeBack = () => (S.d ? UI.back() : true);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || DEV)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
