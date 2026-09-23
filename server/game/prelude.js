// @ts-nocheck
// Духолов: сервер игры (Supabase Edge Function «game»). ФАЙЛ СОБРАН АВТОМАТИЧЕСКИ tools/build-server.ps1
// из общих модулей игры (www/js) и server/game — не правьте его вручную.
import { createClient } from 'npm:@supabase/supabase-js@2';

// Заглушки браузерного окружения: на сервере нет карты, звука и окон
const DEV = false;
const APP_VERSION = '__APP_VERSION__';
const window = globalThis;
const location = { hostname: 'server', search: '' };
const MapView = { pos: null, refresh() {}, updateBuddy() {} };
const Poi = { near: () => [], nearest: () => null };
const Tut = { SID: 'vayfayka', spawn: () => null, step: () => 0 };
const UI = { toast() {}, refreshHud() {} };
const Sync = { touch() {} };
const Cloud = { configured: () => false };
const Cfg = { s: { sound: false, vibro: false } };
