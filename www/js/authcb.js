'use strict';
/* auth.html: сервис входа вернул игрока. Параметры ответа (из адреса после «?» и «#») запоминаются в этой вкладке,
   адрес с ними сразу стирается из истории, игра открывается снова и доводит вход до конца (login.js → Login.resume). */
(() => {
  const out = {};
  const take = s => new URLSearchParams(s).forEach((v, k) => { out[k] = v; });
  take(location.search.slice(1));
  take(location.hash.slice(1));
  try { sessionStorage.setItem('duholov.logincb', JSON.stringify(out)); } catch (e) { /* без хранилища вход не завершится — игра скажет об этом */ }
  location.replace('./');
})();
