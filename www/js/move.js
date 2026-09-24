'use strict';
/* 4.1: игра переехала с quinsiege.github.io/duholov на duholov.ru.
   Вход игрока хранится в браузере отдельно для каждого адреса, поэтому старый адрес сам переводит браузер
   на новый и передаёт ему вход (ключ обновления сессии) в части адреса после «#» — она не уходит на сервер.
   Новый адрес сразу меняет этот ключ на свой (Cloud.client) и стирает его из адреса.
   Приложение для Android старой версии открывает старый адрес и остаётся на нём до обновления приложения:
   оно ходит в тот же сервер, прогресс общий. */

const Move = {
  OLD: 'quinsiege.github.io',
  NEW: 'https://duholov.ru/',
  handoff: null, // ключ обновления сессии, принесённый со старого адреса

  // старый адрес в обычном браузере — перейти на новый вместе со входом
  go() {
    if (location.hostname !== this.OLD || /DuholovApp\//.test(navigator.userAgent)) return false;
    let rt = '';
    try { const s = JSON.parse(localStorage.getItem(CLOUD_PROJECTS.prod.auth) || 'null'); rt = (s && s.refresh_token) || ''; } catch (e) {}
    location.replace(this.NEW + location.search + (rt ? '#handoff=' + encodeURIComponent(rt) : ''));
    return true;
  },
  // новый адрес — забрать вход и сразу убрать его из адреса (и из истории браузера)
  take() {
    const m = location.hash.match(/^#handoff=([^&]+)/);
    if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    try { this.handoff = decodeURIComponent(m[1]); } catch (e) {}
  },
};
Move.moving = Move.go();
if (!Move.moving) Move.take();
