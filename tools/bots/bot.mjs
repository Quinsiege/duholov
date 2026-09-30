#!/usr/bin/env node
// ИИ-игрок «Духолова»: один бот со своей волей. Playwright (headless Chromium) открывает игру, бот проходит вход
// и дальше живёт циклом «наблюдение → решение модели → действие → итог». Всё, что он видит, думает и делает, —
// в bots/<id>/ (persona.json, memory.json, state.json, log.jsonl, shots/, live.jpg); смотреть — viewer.mjs.
//
//   node bot.mjs [id]                       — тестовый контур https://test.duholov.ru/ (ключ — DUHOLOV_TEST_KEY)
//   GAME_URL=http://localhost:8780/ OFFLINE=1 LLM_URL=mock node bot.mjs dev1   — локально, без сети и без модели
// Остальные настройки — переменные окружения (см. CFG ниже и README.md).
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LLM } from './llm.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const env = process.env;
const num = (v, d) => (v != null && v !== '' && Number.isFinite(+v) ? +v : d);

const CFG = {
  id: String(process.argv[2] || env.BOT_ID || 'bot1').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'bot1',
  dir: path.resolve(env.BOTS_DIR || path.join(HERE, 'bots')),
  url: env.GAME_URL || 'https://test.duholov.ru/',
  offline: env.OFFLINE === '1',
  cdp: env.CDP_URL || '',                        // подключиться к уже запущенному Chromium (локальная проверка)
  headless: env.HEADLESS !== '0',
  gapMin: num(env.ACT_GAP_MIN_MS, 3000), gapMax: num(env.ACT_GAP_MAX_MS, 5000), // не чаще одного действия в 3–5 с
  apiPerMin: num(env.API_PER_MIN, 4),            // сырых вызовов Game.act в минуту
  memEvery: num(env.MEM_EVERY, 10),              // раз в N шагов модель сжимает историю
  maxSteps: num(env.MAX_STEPS, 0),               // 0 — без конца
  shotsKeep: num(env.SHOTS_KEEP, 3000),          // сколько последних снимков шагов хранить
  fps: Math.max(0.5, Math.min(8, num(env.BOT_FPS, 3))),
  chatEvery: num(env.CHAT_EVERY, 4),             // чат — в наблюдении раз в N шагов
  obsMax: num(env.OBS_MAX_CHARS, 5200),          // наблюдение не длиннее (≈ 1,5 тыс. токенов)
  force: env.BOT_FORCE === '1',                  // запустить, даже если бот уже бросил игру
  tz: env.BOT_TZ || 'Europe/Moscow',
  viewport: { width: num(env.BOT_W, 400), height: num(env.BOT_H, 800) },
};
const KEY = env.DUHOLOV_TEST_KEY || '';          // ключ закрытого контура: никуда не пишется и не выводится
const TEST_HOST = 'test.duholov.ru';
const PAY_HOSTS = /(^|\.)(yookassa\.ru|yoomoney\.ru|yoomoney\.com|money\.yandex\.ru|pay\.google\.com|checkout\.|payments?\.)/i;
const PAY_LABEL = /₽|руб\.?(\s|$)|оплат|оплач|купить за \d+\s*(₽|руб)|google play|rustore pay|банковск/i;

/* ---------- безопасность: только тестовый контур (или локальная игра в OFFLINE) ---------- */
const gameURL = new URL(CFG.url);
const LOCAL = ['localhost', '127.0.0.1', '[::1]'];
if (CFG.offline) {
  if (!LOCAL.includes(gameURL.hostname)) { console.error(`OFFLINE=1 — только локальная игра (localhost), а не ${gameURL.hostname}`); process.exit(2); }
} else if (gameURL.hostname !== TEST_HOST || gameURL.protocol !== 'https:') {
  console.error(`Бот играет только в тестовом контуре https://${TEST_HOST}/ (GAME_URL=${CFG.url} запрещён)`); process.exit(2);
}
if (!CFG.offline && !KEY && env.BOT_NO_KEY !== '1') { console.error('Нет ключа тестового контура: задай DUHOLOV_TEST_KEY (в /etc/duholov-bots.env)'); process.exit(2); }
const allowedNav = h => (CFG.offline ? LOCAL.includes(h) : h === TEST_HOST);

/* ---------- файлы бота ---------- */
const BD = path.join(CFG.dir, CFG.id);
const F = {
  persona: path.join(BD, 'persona.json'), memory: path.join(BD, 'memory.json'), state: path.join(BD, 'state.json'),
  log: path.join(BD, 'log.jsonl'), diary: path.join(BD, 'diary.jsonl'), wishes: path.join(BD, 'wishes.jsonl'), errors: path.join(BD, 'errors.jsonl'),
  storage: path.join(BD, 'storage.json'), live: path.join(BD, 'live.jpg'), shots: path.join(BD, 'shots'), exit: path.join(BD, 'exit.json'),
};
fs.mkdirSync(F.shots, { recursive: true });
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
// запись через временный файл; на Windows переименование может упереться в открытый зрителем файл — тогда повтор или прямая запись
const writeJSON = (f, o) => {
  const t = f + '.tmp', s = JSON.stringify(o, null, 1);
  fs.writeFileSync(t, s);
  for (let i = 0; i < 5; i++) { try { fs.renameSync(t, f); return; } catch (e) { const w = Date.now() + 20; while (Date.now() < w) { /* пауза */ } } }
  try { fs.writeFileSync(f, s); fs.rmSync(t, { force: true }); } catch (e) { console.warn('не записан', path.basename(f), e.message); }
};
const append = (f, o) => fs.appendFileSync(f, JSON.stringify(o) + '\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => Date.now();
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), `[${CFG.id}]`, ...a);
const cut = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
// ключ никогда не попадает в логи: на всякий случай вычищаем его из любой строки
const scrub = s => (KEY && typeof s === 'string' ? s.split(KEY).join('•••') : s);

/* ---------- промпты (prompt.md) ---------- */
function loadPrompts() {
  const md = fs.readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  const out = {};
  md.split(/^## /m).slice(1).forEach(block => { const i = block.indexOf('\n'); out[block.slice(0, i).trim()] = block.slice(i + 1).trim(); });
  for (const k of ['SYSTEM', 'PERSONA', 'MEMORY', 'EXIT']) if (!out[k]) throw new Error(`prompt.md: нет раздела ## ${k}`);
  return out;
}
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));

/* ---------- схемы ответов модели ---------- */
const ACTIONS = ['tap', 'type', 'walk', 'teleport', 'open', 'back', 'throw', 'wait', 'chat', 'api', 'note', 'wish', 'quit'];
const SCHEMA_ACT = {
  type: 'object', additionalProperties: false, required: ['thought', 'goal', 'action'],
  properties: {
    thought: { type: 'string', maxLength: 280 },
    goal: { type: 'string', maxLength: 90 },
    action: {
      type: 'object', additionalProperties: false, required: ['type'],
      properties: {
        type: { type: 'string', enum: ACTIONS },
        ref: { type: 'string', maxLength: 12 },
        to: { type: 'string', maxLength: 60 },
        text: { type: 'string', maxLength: 220 },
        meters: { type: 'integer' }, sec: { type: 'integer' },
        ch: { type: 'string', enum: ['all', 'trade', 'raid', 'help', 'clan'] },
        name: { type: 'string', maxLength: 30 },
        args: { type: 'object' },
      },
    },
  },
};
const SCHEMA_PERSONA = {
  type: 'object', required: ['name', 'nick', 'age', 'character', 'likes', 'style', 'patience', 'about'],
  properties: {
    name: { type: 'string', maxLength: 30 }, nick: { type: 'string', maxLength: 16 }, age: { type: 'integer' },
    character: { type: 'string', maxLength: 200 }, likes: { type: 'array', items: { type: 'string', maxLength: 60 }, maxItems: 5 },
    style: { type: 'string', maxLength: 100 }, patience: { type: 'string', enum: ['низкое', 'среднее', 'высокое'] }, about: { type: 'string', maxLength: 240 },
  },
};
const SCHEMA_MEMORY = {
  type: 'object', required: ['memory', 'likes', 'dislikes', 'mood'],
  properties: {
    memory: { type: 'array', items: { type: 'string', maxLength: 140 }, maxItems: 10 },
    likes: { type: 'array', items: { type: 'string', maxLength: 80 }, maxItems: 4 },
    dislikes: { type: 'array', items: { type: 'string', maxLength: 80 }, maxItems: 4 },
    mood: { type: 'string', maxLength: 20 },
  },
};
const SCHEMA_EXIT = {
  type: 'object', required: ['verdict', 'liked', 'disliked', 'would_return', 'score'],
  properties: {
    verdict: { type: 'string', maxLength: 500 }, liked: { type: 'array', items: { type: 'string', maxLength: 100 }, maxItems: 5 },
    disliked: { type: 'array', items: { type: 'string', maxLength: 100 }, maxItems: 5 }, would_return: { type: 'string', maxLength: 160 }, score: { type: 'integer' },
  },
};

/* ---------- личность ---------- */
const TASTES = ['коллекционер', 'исследователь', 'соревновательный', 'общительный', 'любитель лора и мифов', 'охотник за багами', 'казуальный', 'тролль'];
const TASTE_W = [18, 16, 14, 12, 10, 10, 14, 6];
function tasteMix() {
  const pool = TASTES.map((t, i) => ({ t, w: TASTE_W[i] * (0.3 + Math.random()) })).sort((a, b) => b.w - a.w);
  const n = Math.random() < 0.35 ? 3 : 2, top = pool.slice(0, n), sum = top.reduce((a, x) => a + x.w, 0);
  return top.map(x => ({ taste: x.t, share: Math.round(x.w / sum * 100) }));
}
function personaText(p) {
  return [`${p.name}, ${p.age} лет. Ник в игре: ${p.nick}.`, `Характер: ${p.character}`, `Во что любит играть: ${(p.mix || []).map(m => `${m.taste} ${m.share}%`).join(', ')}${p.likes && p.likes.length ? '; ' + p.likes.join('; ') : ''}.`,
    `Терпение: ${p.patience}. Как пишет: ${p.style}.`, p.about ? `О себе: ${p.about}` : ''].filter(Boolean).join('\n');
}
const cleanNick = s => String(s || '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 16) || 'Ловчий';
async function makePersona(llm, P) {
  const mix = tasteMix();
  const age = Math.round(12 + Math.pow(Math.random(), 1.6) * 48);
  let d = null;
  for (let i = 0; i < 2 && !d; i++) {
    try {
      const r = await llm.json([{ role: 'user', content: fill(P.PERSONA, { age, mix: mix.map(m => `${m.taste} (${m.share}%)`).join(', ') }) }], SCHEMA_PERSONA, { kind: 'persona', maxTokens: 400, temperature: 1.0 });
      d = r.data;
    } catch (e) { say('персона: модель не ответила —', e.message); await sleep(5000); }
  }
  d = d || { name: 'Игрок', nick: 'Ловчий' + Math.floor(Math.random() * 900 + 100), age, character: 'обычный человек, играет от скуки', likes: [], style: 'коротко', patience: 'среднее', about: '' };
  return {
    id: CFG.id, name: cut(d.name, 30), nick: cleanNick(d.nick || d.name), age: Math.max(10, Math.min(80, Math.round(+d.age || age))),
    character: cut(d.character, 200), likes: (d.likes || []).slice(0, 5).map(x => cut(x, 60)), style: cut(d.style, 100),
    patience: ['низкое', 'среднее', 'высокое'].includes(d.patience) ? d.patience : 'среднее', about: cut(d.about, 240),
    mix, skill: +(0.35 + Math.random() * 0.6).toFixed(2), created: new Date().toISOString(),
  };
}

/* ---------- наблюдение → текст для модели ---------- */
const TYPE_RU = { spirit: 'дух', spring: 'Источник', shrine: 'Капище', rift: 'Разлом' };
const fmtMin = ms => { const m = Math.round(ms / 60000); return m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч ${m % 60} мин`; };
function actShort(a) {
  if (!a) return '—';
  const x = [a.type];
  if (a.ref) x.push(a.ref);
  if (a.to) x.push(`«${cut(a.to, 30)}»`);
  if (a.meters) x.push(a.meters + ' м');
  if (a.sec) x.push(a.sec + ' с');
  if (a.ch) x.push(a.ch);
  if (a.name) x.push(a.name);
  if (a.args && Object.keys(a.args).length) x.push(cut(JSON.stringify(a.args), 60));
  if (a.text && a.type !== 'note' && a.type !== 'wish') x.push(`«${cut(a.text, 40)}»`);
  return x.join(' ');
}
function formatObs(o, ctx) {
  const L = [], p = o.player, mem = ctx.mem;
  L.push(`Шаг ${ctx.step} · в игре ${fmtMin(mem.playMs || 0)}${mem.mood ? ` · настроение: ${mem.mood}` : ''}`);
  if (mem.goal) L.push(`ТВОЯ ЦЕЛЬ: ${mem.goal}`);
  if (ctx.lastResult) L.push(`ИТОГ ПРОШЛОГО ДЕЙСТВИЯ: ${ctx.lastResult}`);
  if (ctx.stuck) L.push(`⚠ ${ctx.stuck}`);
  const hist = (mem.lastSteps || []).slice(-6, -1); // последний шаг — уже в «итоге»
  if (hist.length) { L.push('ПРОШЛЫЕ ШАГИ:'); hist.forEach(h => L.push(`- ${h.a} → ${cut(h.r, 70)}`)); }
  if (mem.summary && mem.summary.length) L.push('ПАМЯТЬ: ' + mem.summary.join(' / '));
  if (mem.likes && mem.likes.length) L.push('НРАВИТСЯ: ' + mem.likes.join('; ') + (mem.dislikes && mem.dislikes.length ? ' · БЕСИТ: ' + mem.dislikes.join('; ') : ''));
  if (mem.notes && mem.notes.length) L.push('ДНЕВНИК: ' + mem.notes.slice(-2).map(n => cut(n, 90)).join(' / '));
  L.push('');
  L.push(`ЭКРАН: ${o.screen.kind}${o.screen.title ? ` — «${cut(o.screen.title, 60)}»` : ''}`);
  if (o.screen.text) L.push(`ТЕКСТ: ${o.screen.text}`);
  if (o.coach) L.push(`ПОДСКАЗКА ИГРЫ: ${o.coach}`);
  if (o.enc) L.push(`ВСТРЕЧА: фаза ${o.enc.phase}, бросков ${o.enc.throws}, оберег: ${o.enc.charm || '—'} (бросок — действие throw)`);
  const btn = (o.buttons || []).filter(b => !b.input), inp = (o.buttons || []).filter(b => b.input);
  if (btn.length) L.push('КНОПКИ: ' + btn.map(b => `${b.ref} «${cut(b.label, 38)}»${b.on ? '•' : ''}${b.off ? '↓' : ''}${b.disabled ? '🔒' : ''}`).join(' · '));
  if (inp.length) L.push('ПОЛЯ: ' + inp.map(b => `${b.ref} [${b.input}] «${cut(b.label, 30)}» = «${b.value || ''}»`).join(' · '));
  if (o.toasts && o.toasts.length) L.push('ВСПЛЫЛО: ' + [...new Set(o.toasts)].slice(-5).join(' | '));
  if (o.dialogs && o.dialogs.length) L.push('ОКНО БРАУЗЕРА: ' + o.dialogs.join(' | '));
  if (ctx.pageErrors && ctx.pageErrors.length) L.push('ОШИБКИ СТРАНИЦЫ: ' + ctx.pageErrors.slice(-2).map(e => cut(e, 100)).join(' | '));
  L.push('');
  if (p) {
    L.push(`ЛОВЧИЙ: ${p.name}, ур. ${p.level}${p.xpNeed ? ` (опыт ${p.xpIn}/${p.xpNeed})` : ''} · искры ${p.sparks} · монеты ${p.zlat}${p.clan ? ` · клан ${p.clan}` : ''}${p.tut ? ' · идёт обучение' : ''}`);
    if (p.items.length) L.push('СУМКА: ' + p.items.map(([n, k]) => `${n} ${k}`).join(', '));
    if (p.team.length) L.push('КОМАНДА: ' + p.team.map(t => `${t.name} ур.${t.lvl} (сила ${t.power})`).join(', '));
    L.push(`КОЛЛЕКЦИЯ: духов ${p.spirits}, видов поймано ${p.species} из ${p.speciesAll} (видел ${p.seen})${p.best.length ? '; сильнейшие: ' + p.best.map(b => `${b.name} ${b.power}${b.shiny ? '✦' : ''}`).join(', ') : ''}`);
    if (p.cocoons.length) L.push('КОКОНЫ: ' + p.cocoons.join('; '));
    if (p.quests.length) L.push('ЗАДАНИЯ ДНЯ: ' + p.quests.join('; '));
    if (p.tasks.length) L.push('ПОРУЧЕНИЯ: ' + p.tasks.join('; '));
  } else L.push('ЛОВЧИЙ: ещё не создан (игра только открылась)');
  if (o.pos) {
    const c = o.city;
    L.push(`ГДЕ: ${c ? (c.km < 30 ? `${c.name} (${c.place}, ${c.km} км)` : `далеко от городов Атласа, ближайший — ${c.name} (${Math.round(c.km)} км)`) : '?'} · ${o.pos.lat}, ${o.pos.lng}`
      + (o.placed === false ? ' · места в мире ещё нет — выбери его в Атласе' : ` · Врата: ${o.gateWait ? `через ${o.gateWait} мин` : 'открыты'}, предмет «Врата»: ${o.gates || 0}`));
    const near = o.nearby || [];
    if (near.length) L.push('РЯДОМ (✓ — можно нажать): ' + near.map(x => `${x.ref} ${TYPE_RU[x.type] || x.type} ${x.name ? `«${cut(x.name, 30)}»` : ''}${x.lvl ? ` ур.${x.lvl}` : ''}${x.shiny ? ' сияющий' : ''}${x.state ? ` (${x.state})` : ''} ${x.d} м ${x.dir}${x.near ? ' ✓' : ''}`).join(' · '));
    else L.push('РЯДОМ: на карте вокруг пусто');
  }
  if (ctx.chat && ctx.chat.length) L.push('ЧАТ (общий): ' + ctx.chat.map(m => `${m.mine ? 'я' : m.name}${m.lvl ? `[${m.lvl}]` : ''}: ${cut(m.text, 90)}`).join(' | '));
  L.push('');
  L.push('Что делаешь дальше? Ответь JSON {thought, goal, action}.');
  let s = L.join('\n');
  if (s.length > CFG.obsMax && !ctx._again) { // длинный текст экрана режется первым, остальное — хвостом
    const over = s.length - CFG.obsMax;
    s = formatObs({ ...o, screen: { ...o.screen, text: cut(o.screen.text, Math.max(120, o.screen.text.length - over - 20)) } }, { ...ctx, _again: true });
    if (s.length > CFG.obsMax) s = s.slice(0, CFG.obsMax - 60) + '\n…\nЧто делаешь дальше? Ответь JSON {thought, goal, action}.';
  }
  return s;
}

/* ---------- бот ---------- */
class Bot {
  constructor() {
    this.P = loadPrompts();
    this.llm = new LLM();
    this.persona = readJSON(F.persona, null);
    this.mem = Object.assign({ summary: [], likes: [], dislikes: [], mood: '', goal: '', notes: [], lastSteps: [], steps: 0, playMs: 0, wishes: 0, quit: null, catches: 0 }, readJSON(F.memory, {}));
    this.apiCalls = [];
    this.lastActAt = 0;
    this.lastResult = '';
    this.pageErrors = [];
    this.chat = [];
    this.status = 'старт';
    this.frameAt = 0;
    this.fails = [];
    this.started = now();
    this.cur = {}; // последняя мысль и действие — в state.json для зрителя
  }

  saveMem() { writeJSON(F.memory, this.mem); }
  setState(status, extra = {}) {
    this.status = status;
    const p = this.lastObs && this.lastObs.player;
    writeJSON(F.state, {
      id: CFG.id, status, step: this.mem.steps, goal: this.mem.goal, mood: this.mem.mood, updated: now(), since: this.started,
      mode: CFG.offline ? 'offline' : 'test', llm: this.llm.mock ? 'mock' : this.llm.url.replace(/^https?:\/\//, ''), playMs: this.mem.playMs,
      stats: p ? { level: p.level, xpIn: p.xpIn, xpNeed: p.xpNeed, spirits: p.spirits, species: p.species, sparks: p.sparks, zlat: p.zlat, caught: (p.stats && p.stats.caught) || 0, km: p.stats && p.stats.km } : null,
      where: this.lastObs && this.lastObs.city ? `${this.lastObs.city.name}${this.lastObs.city.km > 30 ? ' (далеко)' : ''}` : null,
      screen: this.lastObs ? this.lastObs.screen.kind : null, llmStats: this.llm.stats, quit: this.mem.quit, ...this.cur, ...extra,
    });
  }

  /* ----- браузер ----- */
  async openBrowser() {
    let pw;
    try { pw = await import('playwright'); }
    catch (e) { pw = await import(pathToFileURL(env.PLAYWRIGHT_PATH || path.join(REPO, 'tests', 'node_modules', 'playwright', 'index.mjs')).href); }
    const { chromium } = pw;
    this.browser = CFG.cdp ? await chromium.connectOverCDP(CFG.cdp)
      : await chromium.launch({ headless: CFG.headless, args: ['--disable-blink-features=AutomationControlled', '--mute-audio', '--autoplay-policy=user-gesture-required', '--disable-dev-shm-usage'] });
    const storageState = fs.existsSync(F.storage) ? readJSON(F.storage, undefined) : undefined;
    this.ctx = await this.browser.newContext({
      viewport: CFG.viewport, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: CFG.tz,
      storageState, bypassCSP: CFG.offline, serviceWorkers: 'block', permissions: [],
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36 DuholovAI/1',
    });
    const ctx = this.ctx;
    await ctx.addInitScript({ path: path.join(HERE, 'page-agent.js') });
    if (CFG.offline) {
      // автотестовый браузер: игра не ходит в облако (Cloud.configured), её сервер работает прямо в странице (offline.js)
      await ctx.addInitScript(() => { try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => true, configurable: true }); } catch (e) { /* нет */ } });
      const core = fs.readFileSync(path.join(REPO, 'server', 'game', 'core.js'), 'utf8');
      await ctx.addInitScript({ content: `window.__BOT_CORE = ${JSON.stringify(core)};` });
      await ctx.addInitScript({ path: path.join(HERE, 'offline.js') });
      await this.offlineRoutes();
    } else {
      // настоящий контур: браузер не должен выглядеть автотестом (иначе игра не пойдёт в облако), ключ — из окружения
      const keyJs = KEY ? `try { if (location.hostname === ${JSON.stringify(TEST_HOST)} && !localStorage.getItem('duholov.test.key')) localStorage.setItem('duholov.test.key', ${JSON.stringify(KEY)}); } catch (e) {}` : '';
      await ctx.addInitScript({ content: `try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true }); } catch (e) {}\n${keyJs}` });
      // оплата настоящими деньгами — запрещена: Казна отвечает ошибкой ещё до сервера
      await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
        try { eval('Game').pay = async () => { throw new Error('Оплата отключена для ИИ-игроков'); }; } catch (e) { /* нет */ }
      }));
    }
    // уходы на чужие сайты и платёжные страницы — отбой
    await ctx.route('**/*', route => {
      const req = route.request();
      let host = '';
      try { host = new URL(req.url()).hostname; } catch (e) { return route.continue(); }
      if (PAY_HOSTS.test(host)) { this.note_sys('заблокирован запрос к платёжному сервису ' + host); return route.abort(); }
      let main = false; try { main = req.isNavigationRequest() && req.frame() === req.frame().page().mainFrame(); } catch (e) { /* не страница */ }
      if (main && !/^(data|blob|about):/.test(req.url()) && !allowedNav(host)) {
        this.note_sys('заблокирован переход на ' + host); return route.abort();
      }
      return route.fallback();
    });
    ctx.on('page', p => { if (this.page && p !== this.page) { this.note_sys('закрыто новое окно ' + cut(p.url(), 80)); p.close().catch(() => {}); } });
    this.page = await ctx.newPage();
    const page = this.page;
    page.on('pageerror', e => { const m = scrub(cut(e.message, 300)); this.pageErrors.push(m); if (this.pageErrors.length > 10) this.pageErrors.shift(); append(F.errors, { t: now(), step: this.mem.steps, kind: 'page', m }); });
    page.on('dialog', async d => { const m = `${d.type()}: ${cut(d.message(), 160)}`; try { await page.evaluate(x => window.__bot && window.__bot.dialogs.push(x), m); } catch (e) { /* нет */ } if (d.type() === 'prompt') await d.dismiss().catch(() => {}); else await d.accept().catch(() => {}); });
    page.on('crash', () => { this.crashed = true; say('страница упала'); });
    await this.screencast();
  }
  note_sys(m) { say(scrub(m)); append(F.errors, { t: now(), step: this.mem.steps, kind: 'guard', m: scrub(m) }); }

  async offlineRoutes() {
    // карта: любой .pmtiles — локальный файл (как в скриптах съёмки), сеть наружу — отбой
    const tdir = path.join(REPO, 'www', 'tiles');
    const pmFile = env.OFFLINE_TILES || (fs.existsSync(tdir) ? fs.readdirSync(tdir).filter(f => f.endsWith('.pmtiles')).map(f => path.join(tdir, f))[0] : null);
    const pm = pmFile && fs.existsSync(pmFile) ? fs.readFileSync(pmFile) : null;
    await this.ctx.route(/\.pmtiles(\?|$)/, async route => {
      if (!pm) return route.abort();
      const h = route.request().headers(), m = /bytes=(\d+)-(\d*)/.exec(h.range || '');
      if (!m) return route.fulfill({ status: 200, body: pm, headers: { 'Content-Type': 'application/octet-stream', 'Accept-Ranges': 'bytes' } });
      const a = +m[1], b = m[2] ? Math.min(+m[2], pm.length - 1) : pm.length - 1;
      return route.fulfill({ status: 206, body: pm.subarray(a, b + 1), headers: { 'Content-Type': 'application/octet-stream', 'Content-Range': `bytes ${a}-${b}/${pm.length}`, 'Accept-Ranges': 'bytes' } });
    });
    await this.ctx.route(u => !LOCAL.includes(u.hostname), route => route.abort());
  }

  // живой экран для зрителя: кадры CDP Page.startScreencast → live.jpg (не чаще BOT_FPS)
  async screencast() {
    try {
      this.cdp = await this.ctx.newCDPSession(this.page);
      this.cdp.on('Page.screencastFrame', f => {
        this.cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
        const t = now();
        if (t - this.frameAt < 1000 / CFG.fps) return;
        this.frameAt = t;
        this.lastFrame = Buffer.from(f.data, 'base64');
        const tmp = F.live + '.tmp';
        fsp.writeFile(tmp, this.lastFrame).then(() => fsp.rename(tmp, F.live)).catch(() => {});
      });
      await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, maxWidth: CFG.viewport.width, maxHeight: CFG.viewport.height, everyNthFrame: 1 });
    } catch (e) { say('живой экран недоступен:', e.message); }
  }

  async saveStorage() {
    try {
      const st = await this.ctx.storageState();
      st.origins.forEach(o => { o.localStorage = o.localStorage.filter(x => x.name !== 'duholov.test.key'); }); // ключ контура на диск не пишем
      writeJSON(F.storage, st);
    } catch (e) { /* браузер закрыт */ }
  }

  async start() {
    await this.page.goto(CFG.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    for (let i = 0; i < 120; i++) { if (await this.page.evaluate(() => window.__bot && window.__bot.ready()).catch(() => false)) break; await sleep(500); }
    await sleep(2500);
  }

  async observe(opts = {}) {
    // окно ключа закрытого контура заполняет бот сам — модель ключ не видит
    if (KEY && !CFG.offline) { const f = await this.page.evaluate(k => window.__bot.fillKey(k), KEY).catch(() => false); if (f) { this.note_sys('ключ контура введён заново (игра спросила)'); await sleep(2500); } }
    return this.page.evaluate(o => window.__bot.observe(o), { since: this.lastActAt ? this.lastActAt - 500 : now() - 8000, ...opts });
  }

  /* ----- действия ----- */
  async perform(a, obs) {
    const B = (fn, arg) => this.page.evaluate(fn, arg);
    const labelOf = ref => { const b = (obs.buttons || []).find(x => x.ref === ref); return b ? b.label : ''; };
    const toastTail = r => (r && r.toasts && r.toasts.length ? ' Всплыло: ' + [...new Set(r.toasts)].slice(-3).join(' | ') : '');
    switch (a.type) {
      case 'tap': {
        let ref = a.ref && /^[bo]\d+$/.test(a.ref.trim()) ? a.ref.trim() : null;
        if (!ref && (a.text || a.to)) ref = await B(t => window.__bot.findByText(t), a.text || a.to);
        if (ref && ref[0] === 'o') { const r = await B(x => window.__bot.tapObj(x), ref); return r.ok ? { ok: true, text: `коснулся объекта ${ref}.${toastTail(r)}` } : { ok: false, text: r.error }; }
        if (!ref) {
          const t = a.text || a.to || a.ref;
          if (!t) return { ok: false, text: 'не указано, что нажать (ref или text)' };
          if (PAY_LABEL.test(t)) return { ok: false, text: 'кнопки оплаты настоящими деньгами боту запрещены' };
          try { await this.page.getByText(t, { exact: false }).first().click({ timeout: 3000 }); await sleep(1200); return { ok: true, text: `нажал на надпись «${cut(t, 40)}»` }; }
          catch (e) { return { ok: false, text: `на экране нет «${cut(t, 40)}»` }; }
        }
        const label = labelOf(ref);
        if (PAY_LABEL.test(label)) return { ok: false, text: `«${cut(label, 40)}» — оплата настоящими деньгами, боту запрещено` };
        const loc = this.page.locator(`[data-bot-ref="${ref}"]`);
        if (!(await loc.count())) return { ok: false, text: `кнопки ${ref} уже нет на экране` };
        try { await loc.first().click({ timeout: 4000 }); }
        catch (e) { const ok = await B(x => window.__bot.clickRef(x), ref).catch(() => false); if (!ok) return { ok: false, text: `не получилось нажать ${ref}: ${cut(e.message, 80)}` }; }
        await sleep(1300);
        return { ok: true, text: `нажал ${ref} «${cut(label, 40)}»` };
      }
      case 'type': {
        const ref = a.ref && a.ref.trim();
        const text = cut(a.text || '', 120);
        if (!ref) return { ok: false, text: 'не указано поле (ref)' };
        const loc = this.page.locator(`[data-bot-ref="${ref}"]`);
        if (!(await loc.count())) return { ok: false, text: `поля ${ref} нет на экране` };
        try { await loc.first().fill(text, { timeout: 4000 }); }
        catch (e) { try { await loc.first().click({ timeout: 2000 }); await this.page.keyboard.type(text, { delay: 40 }); } catch (e2) { return { ok: false, text: `в ${ref} не вводится: ${cut(e2.message, 60)}` }; } }
        await sleep(400);
        return { ok: true, text: `ввёл «${text}» в ${ref}` };
      }
      case 'walk': {
        const to = String(a.to || a.ref || '').trim().toLowerCase();
        const arg = { meters: Math.max(10, Math.min(400, +a.meters || 80)) };
        if (/^o\d+$/.test(to)) arg.ref = to;
        else {
          const DIRS = [['северо-восток', 45], ['северо-запад', 315], ['юго-восток', 135], ['юго-запад', 225], ['север', 0], ['юг', 180], ['восток', 90], ['запад', 270],
            ['св', 45], ['сз', 315], ['юв', 135], ['юз', 225], ['с', 0], ['ю', 180], ['в', 90], ['з', 270], ['north', 0], ['south', 180], ['east', 90], ['west', 270]];
          const d = DIRS.find(([k]) => to === k || to.startsWith(k));
          arg.bearing = d ? d[1] : Number.isFinite(+to) && to !== '' ? +to : Math.floor(Math.random() * 360);
        }
        const r = await B(x => window.__bot.walk(x), arg);
        return r.ok ? { ok: true, text: `прошёл ${r.moved} м (${r.reason}).${toastTail(r)}` } : { ok: false, text: r.error };
      }
      case 'teleport': {
        const to = String(a.to || a.text || '').trim();
        if (!to) return { ok: false, text: 'куда? (to — город Атласа или «широта, долгота»)' };
        const r = await B(x => window.__bot.teleport(x), to);
        await sleep(1500);
        return r.ok ? { ok: true, text: `шагнул через Врата: ${r.where}${r.usedItem ? ' (потратил предмет «Врата»)' : ''}.${toastTail(r)}` } : { ok: false, text: cut(r.error, 600) + toastTail(r) };
      }
      case 'open': {
        const r = await B(x => window.__bot.openSection(x), String(a.to || a.text || a.name || ''));
        return r.ok ? { ok: true, text: `открыл раздел «${r.section}».${toastTail(r)}` } : { ok: false, text: r.error + toastTail(r) };
      }
      case 'back': { const r = await B(() => window.__bot.back()); return { ok: r.ok, text: r.ok ? 'закрыл окно' : r.error }; }
      case 'throw': {
        const r = await B(s => window.__bot.throwCharm(s), this.persona.skill || 0.7);
        return r.ok ? { ok: true, text: `бросил оберег: ${r.result}${r.msg ? ` («${r.msg}»)` : ''}.${toastTail(r)}` } : { ok: false, text: r.error };
      }
      case 'wait': { const s = Math.max(3, Math.min(120, +a.sec || 10)); await sleep(s * 1000); return { ok: true, text: `подождал ${s} с` }; }
      case 'chat': {
        const text = cut(a.text || '', 200); if (!text) return { ok: false, text: 'пустое сообщение' };
        const r = await B(x => window.__bot.act('chatSend', x), { ch: a.ch || 'all', text });
        this.chatAt = 0; // перечитать чат на следующем шаге
        return r.ok ? { ok: true, text: `написал в чат ${a.ch || 'all'}: «${text}»` } : { ok: false, text: `чат: ${r.error}` };
      }
      case 'api': {
        const name = String(a.name || a.to || '').trim();
        if (!/^[A-Za-z][A-Za-z0-9]{0,29}$/.test(name)) return { ok: false, text: 'api: нужно имя действия (name)' };
        const t = now(); this.apiCalls = this.apiCalls.filter(x => t - x < 60000);
        if (this.apiCalls.length >= CFG.apiPerMin) return { ok: false, text: `api: не больше ${CFG.apiPerMin} в минуту — подожди` };
        this.apiCalls.push(t);
        const r = await B(x => window.__bot.act(x.n, x.a), { n: name, a: a.args && typeof a.args === 'object' ? a.args : {} });
        const res = r.ok ? cut(JSON.stringify(r.result), 500) : r.error;
        return { ok: r.ok, text: `api ${name}: ${r.ok ? 'ок → ' : 'отказ: '}${res}${toastTail(r)}` };
      }
      case 'note': {
        const text = cut(a.text || a.to || '', 300); if (!text) return { ok: false, text: 'пустая запись' };
        this.mem.notes.push(text); if (this.mem.notes.length > 30) this.mem.notes.shift();
        append(F.diary, { t: now(), step: this.mem.steps, text });
        return { ok: true, text: 'записал в дневник' };
      }
      case 'wish': {
        const text = cut(a.text || a.to || '', 300); if (!text) return { ok: false, text: 'пустое желание' };
        this.mem.wishes++;
        append(F.wishes, { t: now(), step: this.mem.steps, text, screen: obs.screen.kind, level: obs.player ? obs.player.level : 0 });
        return { ok: true, text: 'желание записано (его прочтут разработчики)' };
      }
      case 'quit': return { ok: true, text: 'ухожу из игры', quit: cut(a.text || a.to || 'надоело', 300) };
      default: return { ok: false, text: `нет такого действия «${a.type}»` };
    }
  }

  diff(o0, o1) {
    const a = o0 && o0.player, b = o1 && o1.player, out = [];
    if (!a && b) out.push(`Ловчий создан: ${b.name}`);
    if (a && b) {
      if (b.level > a.level) out.push(`НОВЫЙ УРОВЕНЬ ${b.level}!`);
      if (b.xp !== a.xp) out.push(`опыт ${b.xp - a.xp > 0 ? '+' : ''}${Math.round(b.xp - a.xp)}`);
      if (b.sparks !== a.sparks) out.push(`искры ${b.sparks - a.sparks > 0 ? '+' : ''}${b.sparks - a.sparks}`);
      if (b.zlat !== a.zlat) out.push(`монеты ${b.zlat - a.zlat > 0 ? '+' : ''}${b.zlat - a.zlat}`);
      if (b.spirits !== a.spirits) out.push(`духов ${b.spirits - a.spirits > 0 ? '+' : ''}${b.spirits - a.spirits}`);
      if (b.species > a.species) { out.push(`новый вид в Бестиарии (+${b.species - a.species})`); }
      const ia = Object.fromEntries(a.items), ib = Object.fromEntries(b.items);
      const ch = [...new Set([...Object.keys(ia), ...Object.keys(ib)])].map(k => [k, (ib[k] || 0) - (ia[k] || 0)]).filter(([, d]) => d).slice(0, 5);
      if (ch.length) out.push(ch.map(([k, d]) => `${k} ${d > 0 ? '+' : ''}${d}`).join(', '));
    }
    const s0 = o0 && o0.screen, s1 = o1 && o1.screen;
    if (s1 && (!s0 || s0.kind !== s1.kind || s0.title !== s1.title)) out.push(`теперь на экране: ${s1.kind}${s1.title ? ` «${cut(s1.title, 40)}»` : ''}`);
    return out.join('; ');
  }

  async compress(force) {
    if (!force && (this.mem.steps % CFG.memEvery !== 0 || this.mem.steps === 0)) return;
    const steps = this.mem.lastSteps.slice(-CFG.memEvery * 2).map(h => `- ${h.th} → ${h.a} → ${cut(h.r, 90)}`).join('\n');
    try {
      const r = await this.llm.json([{ role: 'user', content: fill(this.P.MEMORY, { persona: personaText(this.persona), memory: this.mem.summary.join('\n') || '(пусто — только начал)', steps }) }],
        SCHEMA_MEMORY, { kind: 'memory', maxTokens: 420, temperature: 0.5 });
      const d = r.data;
      if (Array.isArray(d.memory) && d.memory.length) this.mem.summary = d.memory.slice(0, 10).map(x => cut(x, 140));
      if (Array.isArray(d.likes)) this.mem.likes = d.likes.slice(0, 4).map(x => cut(x, 80));
      if (Array.isArray(d.dislikes)) this.mem.dislikes = d.dislikes.slice(0, 4).map(x => cut(x, 80));
      if (d.mood) this.mem.mood = cut(d.mood, 20);
      this.mem.lastSteps = this.mem.lastSteps.slice(-6);
      append(F.log, { t: now(), step: this.mem.steps, kind: 'memory', memory: this.mem.summary, likes: this.mem.likes, dislikes: this.mem.dislikes, mood: this.mem.mood, ms: r.ms });
      this.saveMem();
      say('память сжата:', this.mem.mood, '|', cut(this.mem.summary.join(' / '), 160));
    } catch (e) { say('память: модель не ответила —', e.message); }
  }

  async exitInterview(reason) {
    const p = this.lastObs && this.lastObs.player;
    const stats = p ? `уровень ${p.level}, духов ${p.spirits}, видов ${p.species}, в игре ${fmtMin(this.mem.playMs)}, шагов ${this.mem.steps}` : `в игре ${fmtMin(this.mem.playMs)}, Ловчий так и не создан`;
    let d = null;
    try {
      d = (await this.llm.json([{ role: 'user', content: fill(this.P.EXIT, { persona: personaText(this.persona), reason, memory: [...this.mem.summary, ...this.mem.notes.slice(-5)].join('\n') || '—', stats }) }],
        SCHEMA_EXIT, { kind: 'exit', maxTokens: 450, temperature: 0.6 })).data;
    } catch (e) { say('отзыв: модель не ответила —', e.message); }
    const out = { t: now(), step: this.mem.steps, reason, stats, review: d, likes: this.mem.likes, dislikes: this.mem.dislikes, mood: this.mem.mood };
    writeJSON(F.exit, out);
    append(F.log, { t: now(), step: this.mem.steps, kind: 'quit', reason, review: d });
    return out;
  }

  async step() {
    const st = ++this.mem.steps, t0 = now();
    this.setState('смотрит');
    const obs = await this.observe();
    if (obs.errors && obs.errors.length) obs.errors.forEach(m => this.pageErrors.push(scrub(m)));
    this.lastObs = obs;
    if (obs.player && (st % CFG.chatEvery === 1 || !this.chatAt)) { this.chat = await this.page.evaluate(() => window.__bot.chatTail('all', 5)).catch(() => []); this.chatAt = now(); }
    // застрял: одно и то же не выходит
    const recentFails = this.fails.slice(-4);
    const stuck = recentFails.length >= 3 && recentFails.every(f => !f.ok) ? 'Последние действия не получаются. Попробуй что-то другое: back, open, walk, wait — или брось, если надоело.' : '';
    const text = scrub(formatObs(obs, { step: st, mem: this.mem, lastResult: this.lastResult, stuck, chat: this.chat, pageErrors: this.pageErrors.splice(0) }));
    const messages = [{ role: 'system', content: fill(this.P.SYSTEM, { persona: personaText(this.persona), nick: this.persona.nick }) }, { role: 'user', content: text }];
    this.setState('думает');
    let ans, raw = '', llmMs = 0;
    try {
      const r = await this.llm.json(messages, SCHEMA_ACT, { kind: 'act', mockCtx: { obs, nick: this.persona.nick } });
      ans = r.data; raw = r.raw; llmMs = r.ms;
    } catch (e) {
      say('модель не ответила:', e.message);
      // промпт не влез в окно слота llama-server (-c / --parallel) — наблюдение станет короче
      if (/context|too long|exceed|n_ctx/i.test(e.message)) { CFG.obsMax = Math.max(2200, Math.round(CFG.obsMax * 0.8)); say('наблюдение короче:', CFG.obsMax, 'знаков'); }
      append(F.log, { t: now(), step: st, kind: 'llm-error', error: cut(e.message, 300) });
      this.mem.steps--; this.setState('нет ответа модели', { error: cut(e.message, 200) });
      await sleep(20000);
      return;
    }
    let a = ans && typeof ans.action === 'object' && ans.action ? ans.action : null;
    const thought = cut(ans && ans.thought, 300), goal = cut(ans && ans.goal, 90);
    if (!a || !ACTIONS.includes(a.type)) a = { type: 'wait', sec: 5, _bad: true };
    if (goal) this.mem.goal = goal;
    // не чаще одного действия в 3–5 с
    const gap = CFG.gapMin + Math.random() * Math.max(0, CFG.gapMax - CFG.gapMin);
    const w = this.lastActAt + gap - now(); if (w > 0) await sleep(w);
    this.cur = { thought, action: actShort(a) };
    this.setState('действует');
    say(`#${st}`, cut(thought, 110), '→', actShort(a));
    let res;
    const ta = now();
    try { res = await this.perform(a, obs); }
    catch (e) { res = { ok: false, text: 'действие сорвалось: ' + cut(e.message, 160) }; }
    if (a._bad) res = { ok: false, text: 'ответ не понят (нужен JSON с action.type из списка) — подождал 5 с' };
    this.lastActAt = now();
    // итог: что изменилось
    await sleep(600);
    let after = null;
    try { after = await this.observe({ maxButtons: 0, textMax: 200 }); } catch (e) { /* страница занята */ }
    const df = after ? this.diff(obs, after) : '';
    const toasts = after && after.toasts && after.toasts.length ? 'Всплыло: ' + [...new Set(after.toasts)].slice(-3).join(' | ') : '';
    const result = scrub([res.text, df, res.text.includes('Всплыло') ? '' : toasts].filter(Boolean).join(' · '));
    this.lastResult = `${actShort(a)} → ${res.ok ? '' : 'НЕ ВЫШЛО: '}${result}`;
    if (after && after.player) this.lastObs = { ...after, buttons: obs.buttons, nearby: after.nearby || obs.nearby };
    if (after && after.player && obs.player && after.player.spirits > obs.player.spirits) this.mem.catches += after.player.spirits - obs.player.spirits;
    this.fails.push({ ok: res.ok, a: a.type }); if (this.fails.length > 8) this.fails.shift();
    this.mem.lastSteps.push({ st, th: cut(thought, 120), a: actShort(a), r: (res.ok ? '' : '✗ ') + cut(result, 140) });
    if (this.mem.lastSteps.length > CFG.memEvery * 3) this.mem.lastSteps.splice(0, this.mem.lastSteps.length - CFG.memEvery * 3);
    // снимок шага
    const shot = `${String(st).padStart(6, '0')}.jpg`;
    try { await this.page.screenshot({ path: path.join(F.shots, shot), type: 'jpeg', quality: 60, timeout: 8000 }); } catch (e) { /* пропуск */ }
    if (st > CFG.shotsKeep) fsp.unlink(path.join(F.shots, `${String(st - CFG.shotsKeep).padStart(6, '0')}.jpg`)).catch(() => {});
    this.mem.playMs += now() - t0;
    append(F.log, {
      t: now(), step: st, kind: 'step', screen: obs.screen.kind, title: obs.screen.title, pos: obs.pos || null, city: obs.city ? obs.city.name : null,
      level: obs.player ? obs.player.level : null, obs: text, llm: { raw: cut(scrub(raw), 1200), ms: llmMs }, thought, goal, action: a, act: actShort(a), ok: res.ok, result, actMs: now() - ta, shot,
    });
    this.saveMem();
    this.cur = { thought, action: actShort(a), result: cut(result, 200), ok: res.ok };
    this.setState('ждёт');
    if (res.quit) { this.mem.quit = { t: now(), reason: res.quit, step: st }; this.saveMem(); this.quitReason = res.quit; }
    await this.compress();
    if (st % 5 === 0) await this.saveStorage();
  }

  async run() {
    if (this.mem.quit && !CFG.force) { say(`бот бросил игру (${this.mem.quit.reason}) — не запускаю (BOT_FORCE=1 — всё равно запустить)`); this.setState('бросил игру'); return 0; }
    if (!this.persona) {
      this.setState('придумывает себя');
      this.persona = await makePersona(this.llm, this.P);
      writeJSON(F.persona, this.persona);
      say('персона:', this.persona.name, this.persona.age, '|', this.persona.mix.map(m => m.taste).join(' + '), '| ник', this.persona.nick);
    }
    const h = await this.llm.health();
    if (!h.ok) say('llama-server не отвечает на /health:', h.error || h.status, '— всё равно пробую');
    let restarts = 0;
    for (;;) {
      try {
        this.setState('открывает игру');
        await this.openBrowser();
        await this.start();
        say('игра открыта:', CFG.url, CFG.offline ? '(OFFLINE)' : '');
        while (!this.quitReason) {
          if (CFG.maxSteps && this.mem.steps >= CFG.maxSteps) { say('достигнут MAX_STEPS'); break; }
          if (this.crashed) throw new Error('страница упала');
          await this.step();
          restarts = 0;
        }
        break;
      } catch (e) {
        say('сбой:', scrub(e.message));
        append(F.errors, { t: now(), step: this.mem.steps, kind: 'crash', m: scrub(cut(e.stack || e.message, 800)) });
        this.setState('перезапуск', { error: cut(scrub(e.message), 200) });
        await this.close();
        if (++restarts > 20) { say('слишком много сбоев подряд — выхожу'); return 1; }
        await sleep(Math.min(300000, 5000 * 2 ** Math.min(6, restarts)));
      }
    }
    if (this.quitReason) {
      say('БОТ БРОСИЛ ИГРУ:', this.quitReason);
      const x = await this.exitInterview(this.quitReason);
      this.setState('бросил игру', { review: x.review });
    } else this.setState('остановлен');
    await this.saveStorage();
    await this.close();
    return 0;
  }

  async close() {
    try { if (this.ctx) { await this.saveStorage(); await this.ctx.close(); } } catch (e) { /* уже закрыт */ }
    try { if (this.browser && !CFG.cdp) await this.browser.close(); } catch (e) { /* уже закрыт */ }
    this.ctx = null; this.browser = null; this.page = null; this.crashed = false;
  }
}

const bot = new Bot();
let stopping = false;
const stop = async sig => {
  if (stopping) return; stopping = true;
  say('остановка по', sig);
  try { bot.setState('остановлен'); await bot.close(); } catch (e) { /* нет */ }
  process.exit(0);
};
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
process.on('unhandledRejection', e => say('unhandledRejection:', scrub(String(e && e.message || e))));
say(`старт: ${CFG.url}${CFG.offline ? ' (OFFLINE)' : ''}, модель ${bot.llm.mock ? 'mock' : bot.llm.url}, папка ${BD}${KEY ? ', ключ контура задан' : CFG.offline ? '' : ', КЛЮЧ КОНТУРА НЕ ЗАДАН (DUHOLOV_TEST_KEY)'}`);
process.exitCode = await bot.run();
