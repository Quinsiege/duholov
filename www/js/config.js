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
  },
  test: {
    url: '',
    anonKey: '',
  },
};
const CLOUD_CONFIG = DEV ? CLOUD_PROJECTS.test : CLOUD_PROJECTS.prod;
