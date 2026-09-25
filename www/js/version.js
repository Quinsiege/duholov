'use strict';
/* Версия клиента. При выпуске обновления меняется здесь и в www/version.json (CI проверяет, что они совпадают).
   Этот же файл подключает service worker, чтобы название кэша менялось вместе с версией. */
const APP_VERSION = '4.7.3';

// Режим разработки: локальный сервер и тестовый сайт test.duholov.ru (оба ходят в тестовый контур). В проде тестовые функции скрыты.
const DEV = ['localhost', '127.0.0.1', 'test.duholov.ru'].includes(self.location.hostname);
