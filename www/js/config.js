'use strict';
/* Облачный сервер (Supabase) для общей таблицы Лиги.
   Пока поля пустые, игра полностью работает без сервера.
   url и anonKey — публичные параметры проекта (Project Settings → API), их можно хранить в коде:
   доступ к данным ограничивают правила RLS из server/supabase.sql. */
const CLOUD_CONFIG = {
  url: 'https://cthqhwjnhqomlhrlberb.supabase.co',
  anonKey: 'sb_publishable__EG6d35UtqI_7b4ZvLVd8g_PyENCyoA', // публичный (publishable) ключ
};
