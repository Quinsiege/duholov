'use strict';
/* Игра в Node: те же файлы, что собирает сервер (tools/build-server.ps1), но без Supabase — для симуляции мира.
   Время берётся из globalThis.SIM_T (Date.now подменён). Возвращает объект с глобальными модулями игры. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = ['www/js/i18n.js', 'www/js/data.js', 'www/js/util.js', 'www/js/events.js', 'www/js/sky.js', 'www/js/world.js',
  'www/js/state.js', 'www/js/journal.js', 'www/js/league.js', 'www/js/raid.js', 'www/js/duel.js',
  'www/js/rules.js', 'www/js/diff.js', 'server/game/core.js'];
const PRELUDE = `
const DEV = false;
const APP_VERSION = '4.15.1';
const window = globalThis;
const location = { hostname: 'server', search: '' };
const MapView = { pos: null, refresh() {}, updateBuddy() {} };
const Poi = { near: () => [], nearest: () => null };
const Tut = { SID: 'vayfayka', spawn: () => null, step: () => 0 };
const UI = { toast() {}, refreshHud() {} };
const Sync = { touch() {} };
const Cloud = { configured: () => false };
const Cfg = { s: { sound: false, vibro: false } };
`;
function load() {
  globalThis.SIM_T = Date.UTC(2026, 9, 1, 5, 0);
  Date.now = () => Math.round(globalThis.SIM_T);
  let src = PRELUDE;
  for (const f of FILES) src += `\n// ===== ${f} =====\n` + fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^﻿?'use strict';\s*/m, '');
  src += `\nglobalThis.G = { GameCore, S, W, U, SP, SPECIES, Rules, Raid, Duel, League, LEAGUE_RANKS, SHRINE_TIERS, ITEMS, TUT, STORY, stepText, CLAN_LEVEL, CLANS, AMULETS, RARITY, ELEMENTS, Sky, Bus, levelXP, GIFT_LIMIT, HOLD_MAX, TRIBUTE, I18N };`;
  vm.runInThisContext(src, { filename: 'duholov-game.js' });
  return globalThis.G;
}
module.exports = { load };
