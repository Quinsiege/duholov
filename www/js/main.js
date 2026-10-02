'use strict';
/* Точка входа */

// Предложение установить PWA может прийти ещё до загрузки — запоминаем для кнопки в настройках
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; });

// ссылка-приглашение ?ref=… — код друга запоминается до создания Ловчего
Invite.grab();
// после обновления страница открывается с меткой ?u=… (обход кэша CDN) — убираем её (и приглашение) из адреса
if (/[?&](u|ref)=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);

window.addEventListener('load', () => {
  Walk.load(); // 5.1.1: место Ловчего — когда все скрипты уже загружены
  if (Move.moving) return; // 4.1: старый адрес — браузер уже уходит на duholov.ru
  Metrics.init(); // 5.1.22: своя аналитика — сессия и запуск (игроку не видна, сбои — молча)
  if (typeof L === 'undefined') {
    const bl = document.getElementById('bootLoader'); if (bl) bl.remove(); // экран загрузки из index.html не должен закрыть ошибку
    const f = U.el(`<div class="fatal"><h2>${ru`Нет связи с Навью`}</h2><p>${ru`Не удалось загрузить карту. Проверь подключение к интернету.`}</p><button class="btn primary">${ru`Повторить`}</button></div>`);
    f.querySelector("button").onclick = () => location.reload();
    document.body.appendChild(f);
    return;
  }

  const start = () => {
    Loader.show(ru`Загружаю карту…`); Loader.set(60); // карта грузится под экраном загрузки
    UI.init();
    Poi.init();
    MapView.init();
    Poi.ensure();
    // 5.1.17: у Ловчего ещё нет места в мире игры (новичок после знакомства) — Атлас сразу, поверх экрана загрузки: глобусу
    // карта не нужна. Раньше он открывался через секунду после загрузки карты — и мелькали карта и HUD
    if (S.d && typeof Atlas !== 'undefined' && !Walk.placed()) { Atlas.open({ first: true }); Loader.hide(); }
    // 4.28: уже играющим — книга-вступление один раз, когда нет других окон; 5.1: у кого нет места в мире игры — Атлас (один раз)
    Loader.waitMap().then(() => { Loader.hide(); Metrics.ev('ready', { ms: performance.now() }); Intro.later(); Walk.ensurePlaced(); });
    setTimeout(() => Propose.checkResults(), 6000);
    setInterval(() => { if (!document.hidden) Propose.checkResults(); }, 3 * 60000);
    setTimeout(() => Friends.sync(), 4000); // взаимная дружба и подарки
    setInterval(() => { if (!document.hidden) Friends.sync(); }, 3 * 60000);
    Sky.init();
    Music.init();
    Music.play('map');
    Tut.init();
    Bus.on('cocoonReady', c => UI.toast(ru`${COCOON_TIERS[c.km].name} готов вылупиться!`, 'good'));
    const ready = S.readyCocoons().length;
    if (ready) setTimeout(() => UI.toast(ru`Коконов готово: ${ready}. Загляни в меню!`, 'good'), 1500);
    // пройденный путь уходит на сервер пачками; раз в 5 минут сервер обновляет задания дня и отметки
    setInterval(() => Game.flushMove(), 45000);
    setInterval(() => { if (!document.hidden) Game.act('tick').then(() => { UI.refreshHud(); Order.daily(); Order.refresh(); }).catch(() => {}); }, 5 * 60000);
    setTimeout(() => Order.daily(), 2500); // серия дней: награда за первый вход за день
    setTimeout(() => Order.refresh(), 8000); // общее дело Ордена — для значка меню
    // кто держит Капища вокруг — это нужно только карте: под полноэкранной сценой (stage.js) не спрашиваем, догоняем один раз после
    let clansMiss = false;
    const clans = () => { if (Stage.busy) clansMiss = true; else Clans.refresh(); };
    Stage.on(busy => { if (!busy && clansMiss) { clansMiss = false; setTimeout(clans, 700); } });
    setTimeout(clans, 5000);
    setInterval(() => { if (!document.hidden) { clans(); Clans.tribute(); Clans.checkGuards(); Hints.check(); } }, 60000);
    Updater.init();
    setTimeout(() => Treasury.check(), 3000); // Казна: итог оплаты, если игрок вернулся со страницы оплаты
  };

  // Прогресс хранится на сервере: без связи игра ждёт её
  const offline = msg => new Promise(res => {
    const el = U.el(`<div class="fatal"><h2>${ru`Нет связи с Навью`}</h2><p>${U.esc(msg)}</p><p class="small">${ru`Прогресс хранится на сервере игры, поэтому нужен интернет.`}</p><button class="btn primary">${ru`Повторить`}</button></div>`);
    el.querySelector('button').onclick = () => { el.remove(); res(); };
    document.body.appendChild(el);
  });
  const boot = async () => {
    // 3.31: экран загрузки с прогрессом и подсказками — вместо заставки «Связь с Навью…»
    // 4.0.2: сначала — есть ли обновление: новая версия ставится прямо с экрана загрузки, до входа в игру
    Loader.show(ru`Проверяю обновления…`); Loader.set(6);
    const upd = await Updater.boot();
    if (upd === 'apk') { Loader.hide(); Updater.promptApk(); return; }
    if (upd) { Loader.set(30, ru`Загружаю обновление ${upd.version}…`); await Updater.apply(upd.version); return; }
    Loader.show(ru`Связь с Навью…`); Loader.set(12);
    if (Game.on()) {
      for (;;) {
        try { await Game.load(); break; }
        catch (e) { Loader.hide(); await offline(e.message); Loader.show(ru`Связь с Навью…`); }
      }
      Metrics.tick(); // 5.1.22: вход уже есть — первая пачка аналитики сразу (короткий визит тоже будет виден)
    }
    Loader.set(45, ru`Прогресс загружен`);
    // вернулись со страницы сервиса входа — довести вход до конца (учётная запись могла смениться — тогда заново)
    if (Game.on() && !Game.moved) {
      if (await Login.resume()) { location.reload(); return; }
      await Login.load(); // экрану входа нужны подключённые сервисы и привязки
    }
    Loader.set(58);
    Music.play('map'); // вход и знакомство — мелодия карты (зазвучит с первым касанием)
    // только что вошёл через сервис или по почте — сразу в игру (или к имени новичка), без экрана входа (3.30)
    const logged = Login.justLogged();
    if (Game.moved) { Loader.hide(); Game.onMoved(); }
    else if (S.d && logged) start();
    else { Loader.hide(); if (S.d) Login.gate(start); else UI.onboarding(start, logged ? 2 : 0); } // экран входа: чей прогресс, «Продолжить» (3.28)
  };
  // 4.1: сбой при запуске — не вечный экран загрузки, а понятная ошибка с повтором (и отчёт на сервер)
  boot().catch(e => {
    Errors.report('boot: ' + ((e && e.message) || e), 'main.js', 0, e && e.stack);
    Loader.hide();
    const f = U.el(`<div class="fatal"><h2>${ru`Не получилось запустить игру`}</h2><p>${ru`Проверь подключение к интернету и попробуй ещё раз.`}</p><button class="btn primary">${ru`Повторить`}</button></div>`);
    f.querySelector('button').onclick = () => location.reload();
    document.body.appendChild(f);
  });

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
