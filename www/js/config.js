'use strict';
/* Облачный сервер (Supabase). Два контура с одинаковой схемой и одной и той же функцией game:
   сайт игры (и приложение, которое его открывает) — боевой проект, localhost — тестовый.
   Тестовые данные не попадают в бой и наоборот: сервер каждого проекта принимает запросы только
   со своих страниц (секрет ALLOWED_ORIGINS функции game).
   url и anonKey — публичные параметры проекта (Project Settings → API), их можно хранить в коде:
   доступ к данным ограничивают правила RLS и сервер игры. Пока у контура поля пустые, облака нет. */
const CLOUD_PROJECTS = {
  prod: {
    url: 'https://cthqhwjnhqomlhrlberb.supabase.co',
    anonKey: 'sb_publishable__EG6d35UtqI_7b4ZvLVd8g_PyENCyoA', // публичный (publishable) ключ
    auth: 'duholov.auth', admin: 'duholov.admin', // где браузер хранит вход (у каждого контура — свой)
  },
  test: {
    url: 'https://xktcxvotugcmlwbuasbg.supabase.co', // duholov-test
    anonKey: 'sb_publishable_owai4hZ9PApJRB1bALj7eA_NE_qrgi4', // публичный (publishable) ключ
    auth: 'duholov.test.auth', admin: 'duholov.test.admin',
    locked: true, // закрытый контур: нужен ключ доступа (спрашивается один раз, хранится только в этом браузере)
  },
};
const CLOUD_CONFIG = DEV ? CLOUD_PROJECTS.test : CLOUD_PROJECTS.prod;
