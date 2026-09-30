/* ИИ-игрок «Духолова»: режим OFFLINE=1 — игра без сети, для проверки тела бота и зрителя.
   Настоящий сервер игры (server/game/core.js) работает прямо в странице — как в автотестах (tests/index.html):
   bot.mjs кладёт его текст в window.__BOT_CORE, этот файл при DOMContentLoaded (все скрипты игры уже выполнены,
   событие load ещё нет — main.js не начал загрузку) вставляет его в страницу и подменяет Game.call своим «сервером»:
   прогресс и общие таблицы (чат, подарки, аукцион …) — в памяти и в localStorage страницы (bot.offline.v1).
   Места (Источники, Капища) вместо OpenStreetMap — придуманные рядом с Ловчим, одинаковые при каждом запуске. */
(() => {
  'use strict';
  const KEY = 'bot.offline.v1';
  const boot = () => {
    if (window.__botOffline || !window.__BOT_CORE || window.top !== window || typeof Game === 'undefined' || typeof GameCore !== 'undefined') return; // только страница игры, не её рамки
    window.__botOffline = true;
    const s = document.createElement('script');
    s.textContent = window.__BOT_CORE + '\n;window.__GameCore = GameCore;';
    document.head.appendChild(s);
    const GC = window.__GameCore;
    if (!GC) { console.error('offline: сервер игры не загрузился'); return; }

    let DB = null;
    try { DB = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* нет */ }
    DB = Object.assign({ me: null, srv: {}, rev: 0, pid: null, links: [], gifts: [], trades: {}, league: [], order: {}, holds: {}, rooms: {}, promos: {}, promoUsed: {}, lots: [], chat: [], reports: [], ala: 0 }, DB || {});
    if (!DB.chat.length) {
      const t0 = Date.now() - 3600000;
      [['Ведана', 12, 'Кто-нибудь видел Жар-птицу у Красной площади?'], ['Мирослав', 7, 'Источники у фонтанов сегодня щедрые'], ['Орден', 30, 'Это тихий локальный мир для проверки ИИ-игроков — сообщения видишь только ты']]
        .forEach(([name, lvl, text], i) => DB.chat.push({ id: i + 1, channel: 'all', pid: 'npc' + i + 'xxxxxx', name, lvl, clan: null, text, created_at: new Date(t0 + i * 600000).toISOString(), hidden: false }));
    }
    const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { console.warn('offline: не сохранилось', e.message); } };
    const me = 'offline-user';
    const clone = o => JSON.parse(JSON.stringify(o));

    // окружение сервера — упрощённая копия базы в памяти из tests/index.html (один живой игрок)
    const env = {
      poi: async () => null,
      poiCovered: async () => false,
      registerPid: async pid => { DB.pid = pid; return 'ok'; },
      player: async pid => (pid === DB.pid && DB.me ? { name: DB.me.name, level: DB.me.level } : null),
      friendSave: async pid => (pid === DB.pid && DB.me ? { data: clone(DB.me), seen: new Date().toISOString() } : null),
      briefByPid: async pids => { const o = {}; if (DB.me && pids.includes(DB.pid)) o[DB.pid] = { name: DB.me.name, level: DB.me.level, clan: DB.me.clan, look: DB.me.look }; return o; },
      leagueTop: async season => {
        const rows = DB.league.filter(x => x.season === season).slice(-1).map(x => ({ user_id: me, name: x.name, pts: x.pts, rank: x.rank, level: x.level, look: x.look, pid: DB.pid, me: true, cur: null }));
        return { total: rows.length, me: null, rows, tier: rows };
      },
      leagueScore: async x => { DB.league.push({ user: me, ...x }); },
      link: async (from, to, name, level) => { DB.links = DB.links.filter(l => !(l.from_pid === from && l.to_pid === to)); DB.links.push({ from_pid: from, to_pid: to, from_name: name, from_level: level, created_at: new Date().toISOString() }); },
      linksTo: async pid => DB.links.filter(l => l.to_pid === pid),
      giftsTo: async pid => DB.gifts.filter(g => g.to_pid === pid && !g.opened_at).map(g => ({ ...g, invite: g.contents && g.contents.invite })),
      invitesTo: async pid => DB.gifts.filter(g => g.to_pid === pid && g.contents && g.contents.invite === 1).length,
      giftCreate: async (from, to, name, contents) => { DB.gifts.push({ id: 'gift' + DB.gifts.length, from_pid: from, to_pid: to, from_name: name, contents, created_at: new Date().toISOString() }); },
      gift: async id => DB.gifts.find(g => g.id === id) || null,
      giftTake: async (id, pid) => { const g = DB.gifts.find(x => x.id === id && x.to_pid === pid && !x.opened_at); if (!g) return false; g.opened_at = Date.now(); return true; },
      tradeCreate: async (code, pid, name, spirit) => { DB.trades[code] = { code, from_pid: pid, from_name: name, spirit }; },
      tradeTake: async (code, pid) => { const t = DB.trades[code]; if (!t || t.taken_by) return null; if (t.from_pid === pid) return { own: true }; t.taken_by = pid; return t; },
      tradeReclaim: async (code, pid) => { const t = DB.trades[code]; if (!t || t.taken_by || t.from_pid !== pid) return null; t.taken_by = pid; return t; },
      mySubmissions: async () => [],
      orderPut: async x => { DB.order[x.week + ':' + x.pid] = { ...x }; },
      orderStats: async (week, pid) => { const rows = Object.values(DB.order).filter(r => r.week === week && r.n > 0), m = rows.find(r => r.pid === pid); return { players: rows.length, total: rows.reduce((a, r) => a + r.n, 0), mine: m ? m.n : null, top: rows.map(r => ({ pid: r.pid, name: r.name, n: r.n })) }; },
      holdGet: async poi => { const h = DB.holds[poi]; return h && h.holders.length ? clone(h) : null; },
      holdDefend: async (poi, lat, lng, clan, holder) => { const h = DB.holds[poi] = DB.holds[poi] || { clan, holders: [], ver: 1 }; if (h.holders.some(x => x.pid === holder.pid)) return false; h.clan = clan; h.holders.push(holder); h.ver++; return true; },
      holdDefeat: async (poi, ver) => { const h = DB.holds[poi]; if (!h || h.ver !== ver) return false; h.holders = []; h.ver++; return true; },
      myHolds: async pid => Object.values(DB.holds).filter(h => h.holders.some(x => x.pid === pid)).length,
      myHoldsList: async pid => Object.entries(DB.holds).filter(([, h]) => h.holders.some(x => x.pid === pid)).map(([id, h]) => { const x = h.holders.find(y => y.pid === pid); return { id, name: 'Капище', lat: 0, lng: 0, sid: x.sp.sid, sp: x.sp, t: x.t, n: h.holders.length }; }),
      clanCounts: async () => ({}),
      roomCreate: async row => { if (DB.rooms[row.code]) return null; DB.rooms[row.code] = { ...clone(row), status: 'lobby', created_at: new Date().toISOString(), started_at: null }; return clone(DB.rooms[row.code]); },
      roomGet: async code => (DB.rooms[code] ? clone(DB.rooms[code]) : null),
      roomJoin: async (code, m) => { const r = DB.rooms[code]; if (!r || r.status === 'closed') return { error: 'Разлом с таким кодом не найден' }; const i = r.members.findIndex(x => x.pid === m.pid); if (i >= 0) r.members[i] = m; else r.members.push(m); return clone(r); },
      roomStart: async (code, pid) => { const r = DB.rooms[code]; if (!r || r.host_pid !== pid) return null; r.status = 'started'; r.started_at = new Date().toISOString(); return clone(r); },
      roomLeave: async (code, pid) => { const r = DB.rooms[code]; if (r) r.members = r.members.filter(x => x.pid !== pid); },
      lotCreate: async row => { const l = { id: 'lot' + Date.now(), status: 'open', delivered: false, settled: false, created_at: new Date().toISOString(), ...clone(row) }; DB.lots.push(l); return { ...l }; },
      lotsFind: async () => [], lotsRecent: async () => [],
      lotsMine: async pid => DB.lots.filter(l => l.seller_pid === pid).map(l => ({ ...l })),
      lotsOpenCount: async pid => DB.lots.filter(l => l.seller_pid === pid && l.status === 'open').length,
      lotGet: async id => { const l = DB.lots.find(x => x.id === id); return l ? { ...l } : null; },
      lotBuy: async () => null,
      lotCancel: async (id, pid) => { const l = DB.lots.find(x => x.id === id && x.seller_pid === pid); if (l && l.status === 'open') { l.status = 'cancelled'; return { ...l }; } return null; },
      lotsToSettle: async pid => DB.lots.filter(l => l.seller_pid === pid && !l.settled && ['sold', 'cancelled', 'expired'].includes(l.status)).map(l => ({ ...l })),
      lotsDone: async (ids, field) => { DB.lots.forEach(l => { if (ids.includes(l.id)) l[field] = true; }); },
      chatList: async (ch, after) => DB.chat.filter(m => m.channel === ch && !m.hidden && m.id > (after || 0)).slice(-50).map(m => ({ ...m })),
      chatInsert: async row => { const m = { id: DB.chat.length + 1, created_at: new Date().toISOString(), hidden: false, ...row }; DB.chat.push(m); if (DB.chat.length > 300) DB.chat.splice(0, 100); return { ...m }; },
      chatReport: async () => 1,
      paidList: async () => [], payCredited: async () => {}, refundList: async () => [], payDebited: async () => {},
      promo: async code => { const c = DB.promos[code]; return c ? { reward: { ...c.reward } } : { error: 'not_found' }; },
      promoDone: async () => {},
      pvpFind: async () => ({ wait: true, n: 0 }), pvpCancel: async () => ({}), pvpLive: async () => null, pvpLoad: async () => null, pvpPut: async () => null, pvpPending: async () => [], pvpSettled: async () => {},
      alatyrAdd: async n => { DB.ala = (DB.ala || 0) + n; },
      alatyrKill: async () => {},
      alatyrState: async () => ({ total: DB.ala || 0, roads: clone((window.Ev && Ev.roads) || []) }),
      deleteSave: async () => { DB.me = null; },
    };
    // неизвестный метод базы — пустой ответ (новые таблицы сервера не ломают проверку)
    const envP = new Proxy(env, { get: (t, k) => (k in t ? t[k] : (typeof k === 'string' && !['weather', 'lockAt', 'LOCK_MS', 'then'].includes(k) ? async () => null : undefined)) });

    const run = async actions => {
      const req = { a: actions, rev: DB.rev, tz: -new Date().getTimezoneOffset(), pos: Walk.wire(), v: APP_VERSION };
      const res = await GC.run(req, { data: DB.me, srv: DB.srv }, envP);
      if (!res.ok) { if (res.rl) DB.srv = { ...DB.srv, rl: res.rl }; persist(); return { ok: false, error: res.error }; }
      DB.me = res.data ? clone(res.data) : null; DB.srv = res.srv; DB.rev++;
      const d0 = S.d; S.d = null; try { for (const fn of res.after || []) await fn(); } catch (e) { console.warn('offline after:', e.message); } finally { S.d = d0; }
      persist();
      return { ok: true, rev: DB.rev, data: res.data, results: res.results, events: res.events, now: res.now, wx: res.wx || null };
    };
    Game.call = async actions => {
      const busy = setTimeout(() => document.body.classList.add('net-busy'), 350);
      try { return await run(actions); } finally { clearTimeout(busy); document.body.classList.remove('net-busy'); }
    };
    Game.pay = async () => { throw new Error('Оплата отключена (локальная проверка ИИ-игрока)'); };
    Game.auth = async () => { throw new Error('Вход через сервисы недоступен без сети'); };
    Cloud.client = async () => { throw new Error('Нет облака (OFFLINE)'); };

    // придуманные места вокруг: 14 в каждом квадрате 0.01°, id и названия — от координат квадрата
    const NAMES = [['Памятник', 'monument'], ['Храм', 'place_of_worship'], ['Фонтан', 'fountain'], ['Смотровая площадка', 'viewpoint'], ['Музей', 'museum'], ['Арт-объект', 'artwork'],
      ['Часовенка', 'wayside_shrine'], ['Парк', 'park'], ['Библиотека', 'library'], ['Театр', 'theatre'], ['Часы', 'clock'], ['Родник', 'spring'], ['Усадьба', 'manor'], ['Руины', 'ruins']];
    const WHO = ['Пушкину', 'Кутузову', 'Ломоносову', 'Гагарину', 'героям', 'Чайковскому', 'Мину и Пожарскому', 'Толстому', 'Менделееву'];
    Osm.fetch = async (s, w, n, e) => {
      const tx = Math.round(w * 100), ty = Math.round(s * 100), r = U.rng('botplaces:' + tx + ':' + ty), out = [];
      for (let i = 0; i < 14; i++) {
        const [nm, cat] = NAMES[Math.floor(r() * NAMES.length)];
        const id = 'osm:n' + (900000000 + Math.abs((tx * 7919 + ty * 104729) % 9000000) * 10 + i);
        const kind = Osm.CATS[cat] && Osm.CATS[cat][1] && r() < 0.5 ? 'shrine' : 'spring';
        out.push({ id, name: nm === 'Памятник' ? `Памятник ${WHO[Math.floor(r() * WHO.length)]}` : nm, kind, cat, lat: s + (0.08 + r() * 0.84) * (n - s), lng: w + (0.08 + r() * 0.84) * (e - w) });
      }
      return out;
    };
    // сохранённый прогресс — сразу в игру (как ответ на load): main.js покажет «Продолжить»
    if (DB.me) { try { S.d = clone(DB.me); S.migrate(); Game.rev = DB.rev; } catch (e) { console.warn('offline: прогресс не прочитался', e.message); } }
    window.__botOfflineDB = () => DB;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
