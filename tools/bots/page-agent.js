/* ИИ-игрок «Духолова»: помощник внутри страницы игры (подключается bot.mjs через addInitScript до скриптов игры).
   Ничего не меняет в игре сам по себе — только смотрит (observe) и выполняет то, что решил бот:
   касание по ссылке, ходьба джойстиком, шаг через Атлас, бросок оберега свайпом, сырой Game.act.
   Глобальные объекты игры (S, UI, Walk, MapView, Atlas, Encounter, Game …) читаются только в момент вызова. */
(() => {
  'use strict';
  if (window.__bot || window.top !== window) return; // рамки (iframe) не трогаем
  const B = window.__bot = { toasts: [], dialogs: [], refs: 0, objs: {}, errors: [] };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clean = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
  const has = name => typeof window[name] !== 'undefined' || (() => { try { return typeof eval(name) !== 'undefined'; } catch (e) { return false; } })();
  const G = name => { try { return eval(name); } catch (e) { return undefined; } }; // const-глобалы игры (S, UI …) не лежат в window

  /* ---------- всплывашки (живут 3 с — ловим каждую) ---------- */
  const hookToasts = () => {
    const box = document.getElementById('toasts');
    if (!box) { setTimeout(hookToasts, 400); return; }
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      const text = clean(n.innerText || n.textContent, 200);
      if (text) B.toasts.push({ t: Date.now(), text, bad: /bad/.test(n.className) });
      if (B.toasts.length > 60) B.toasts.splice(0, B.toasts.length - 60);
    }))).observe(box, { childList: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookToasts); else hookToasts();
  addEventListener('error', e => { B.errors.push(clean(e.message, 200)); if (B.errors.length > 20) B.errors.shift(); });
  // внешние окна и уходы со страницы боту не нужны
  try { window.open = () => null; } catch (e) { /* нет */ }

  B.takeToasts = since => B.toasts.filter(t => t.t > since).map(t => (t.bad ? '⚠ ' : '') + t.text);

  /* ---------- что видно на экране ---------- */
  const W8 = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
  const bearing = (a, b) => {
    const toR = Math.PI / 180, y = Math.sin((b.lng - a.lng) * toR) * Math.cos(b.lat * toR);
    const x = Math.cos(a.lat * toR) * Math.sin(b.lat * toR) - Math.sin(a.lat * toR) * Math.cos(b.lat * toR) * Math.cos((b.lng - a.lng) * toR);
    return (Math.atan2(y, x) / toR + 360) % 360;
  };
  const dist = (a, b) => { const U = G('U'); return U ? U.dist(a.lat, a.lng, b.lat, b.lng) : 0; };
  const compass = deg => W8[Math.round(deg / 45) % 8];

  const visible = el => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return false;
    return true;
  };
  const inView = r => r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  // элемент можно нажать: в его середине (или в одной из точек) сверху лежит он сам
  const hittable = el => {
    const r = el.getBoundingClientRect();
    const pts = [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.5, 0.25], [0.5, 0.75]];
    for (const [fx, fy] of pts) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const h = document.elementFromPoint(x, y);
      if (h && (h === el || el.contains(h))) return true;
    }
    return false;
  };
  const scrollParent = el => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (p.scrollHeight > p.clientHeight + 4 || p.scrollWidth > p.clientWidth + 4)) return p;
    }
    return null;
  };
  const label = el => {
    const t = el.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA') return clean(el.getAttribute('aria-label') || el.placeholder || el.name || el.type, 40);
    if (t === 'SELECT') return clean(el.getAttribute('aria-label') || (el.options[el.selectedIndex] || {}).text, 40);
    let s = clean(el.innerText || el.textContent, 60);
    const aria = clean(el.getAttribute('aria-label') || el.getAttribute('title'), 40);
    if (!s) s = aria;
    else if (aria && !s.includes(aria) && s.length < 4) s = aria + ' ' + s;
    if (!s && el.dataset) s = clean(el.dataset.k || el.dataset.tab || el.dataset.l || el.dataset.id || '', 30);
    if (!s) { const c = String(el.getAttribute('class') || '').split(/\s+/).filter(x => x && !/^(btn|on|in|out|glass|rune|row|link)$/.test(x))[0]; s = c ? '[' + c + ']' : '[кнопка без подписи]'; }
    return s;
  };
  const CAND = 'button, [role=button], [role=tab], [role=link], a[href], input:not([type=hidden]), textarea, select, summary, [onclick], [data-tab], [data-k], [data-l], .at-pt, .starter, .tile, .row.link, .chip, .tab';
  const ROOT_NAMES = [
    ['.fatal', 'Ошибка'], ['.key-modal', 'Ключ тестового контура'], ['.at-gate', 'Врата Перепутицы (переход)'], ['.atlas', 'Атлас мира'], ['.enc', 'Встреча с духом'],
    ['.raid', 'Разлом (бой)'], ['.intro', 'Книга-вступление'], ['.lg-sheet', 'Лист входа'], ['.lg, .onb', 'Экран входа / знакомство'], ['.rm-wrap', 'Главное меню'],
    ['.modal-wrap', 'Окно'], ['.sheet-wrap', 'Панель'], ['.screen', 'Экран'], ['#bootLoader, .loader', 'Загрузка'],
  ];

  B.observe = (opts = {}) => {
    const now = Date.now();
    // старые ссылки — прочь
    document.querySelectorAll('[data-bot-ref]').forEach(e => e.removeAttribute('data-bot-ref'));
    B.refs = 0; B.objs = {};
    const out = { t: now, url: location.href, title: document.title };
    // верхний слой — то, что лежит в середине экрана
    const hit = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    let root = hit; while (root && root.parentElement && root.parentElement !== document.body) root = root.parentElement;
    let kind = 'Карта';
    const onMap = !root || root.id === 'map' || root.id === 'hud' || (root.closest && root.closest('#map'));
    if (!onMap && root) {
      const hitRoot = ROOT_NAMES.find(([sel]) => root.matches(sel) || root.querySelector(sel));
      kind = hitRoot ? hitRoot[1] : 'Слой ' + (root.id ? '#' + root.id : '.' + String(root.className).split(' ')[0]);
    }
    out.screen = { kind, title: '', text: '' };
    if (!onMap && root) {
      const h = [...root.querySelectorAll('h1, h2, h3, .modal-title, [class*="title"], [class*="ttl"], [class*="name"], header b')].find(e => visible(e) && clean(e.innerText, 80));
      out.screen.title = h ? clean(h.innerText, 80) : '';
      out.screen.text = clean(root.innerText, opts.textMax || 700);
    } else {
      const hud = document.getElementById('hud');
      out.screen.text = hud ? clean(hud.innerText, 240) : '';
    }
    // подсказка обучения
    const coach = document.getElementById('coach');
    out.coach = coach && visible(coach) ? clean(coach.innerText, 260) : '';
    // кнопки и поля: только те, что реально можно нажать (сверху ничего не лежит); в прокрутке — с пометкой
    const all = [...document.querySelectorAll(CAND)].filter(visible);
    const set = new Set(all);
    const top = all.filter(el => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
      for (let p = el.parentElement, i = 0; p && i < 6; p = p.parentElement, i++) if (set.has(p)) return false;
      return true;
    });
    const items = [];
    for (const el of top) {
      const r = el.getBoundingClientRect();
      let off = false;
      if (inView(r)) { if (!hittable(el)) continue; }
      else {
        const sp = scrollParent(el);
        if (!sp || !inView(sp.getBoundingClientRect()) || !hittable(sp)) continue;
        if (root && !root.contains(sp) && !onMap) continue;
        off = true;
      }
      if (el.closest('.leaflet-control-container, .leaflet-marker-pane')) continue; // значки карты — в «Рядом»
      const ref = 'b' + (++B.refs);
      el.setAttribute('data-bot-ref', ref);
      const it = { ref, label: label(el), tag: el.tagName.toLowerCase() };
      if (off) it.off = true;
      if (el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('locked')) it.disabled = true;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
        it.input = el.type || el.tagName.toLowerCase();
        it.value = el.type === 'password' ? (el.value ? '•••' : '') : clean(el.value, 60);
        if (el.type === 'checkbox' || el.type === 'radio') it.value = el.checked ? 'вкл' : 'выкл';
      }
      if (el.classList.contains('on') || el.getAttribute('aria-selected') === 'true') it.on = true;
      items.push(it);
      if (items.length >= (opts.maxButtons || 40)) break;
    }
    out.buttons = items;
    out.toasts = B.takeToasts(opts.since || now - 8000);
    out.dialogs = B.dialogs.splice(0);
    out.errors = B.errors.splice(0);

    // прогресс Ловчего
    const S = G('S');
    if (S && S.d) {
      const d = S.d, SP = G('SP') || {}, ITEMS = G('ITEMS') || {}, lx = G('levelXP');
      const p = { name: d.name, level: d.level, xp: d.xp, sparks: d.sparks || 0, zlat: d.zlat || 0, clan: d.clan || null, tut: d.tut || 0 };
      try { if (lx) { const a = lx(d.level), b = lx(d.level + 1); p.xpIn = Math.max(0, Math.round(d.xp - a)); p.xpNeed = Math.round(b - a); } } catch (e) { /* нет */ }
      p.items = Object.entries(d.items || {}).filter(([, n]) => n > 0).map(([k, n]) => [(ITEMS[k] && ITEMS[k].name) || k, n]);
      p.spirits = (d.spirits || []).length;
      const dex = Object.values(d.dex || {});
      p.species = dex.filter(x => x.caught).length; p.seen = dex.length;
      p.speciesAll = (G('SPECIES') || []).length;
      try { p.team = S.team().map(x => ({ name: (SP[x.sid] || {}).name || x.sid, lvl: x.lvl, power: S.power(x) })); } catch (e) { p.team = []; }
      try { p.best = [...d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 4).map(x => ({ name: (SP[x.sid] || {}).name || x.sid, lvl: x.lvl, power: S.power(x), shiny: !!x.shiny })); } catch (e) { p.best = []; }
      try { p.cocoons = (d.cocoons || []).map(c => `${c.km} км: ${Math.floor(c.walked * 10) / 10}/${c.km}${c.inc ? '' : ' (не в инкубаторе)'}`).slice(0, 4); } catch (e) { p.cocoons = []; }
      p.quests = d.quests && d.quests.list ? d.quests.list.map(q => `${clean(q.text, 70)} — ${q.p}/${q.n}${q.claimed ? ' (награда получена)' : q.p >= q.n ? ' (готово, забери награду)' : ''}`) : [];
      p.tasks = (d.tasks || []).slice(0, 3).map(q => `${clean(q.text, 70)} — ${q.p}/${q.n}`);
      p.stats = d.stats ? { caught: d.stats.caught || 0, km: Math.round((d.stats.km || 0) * 10) / 10, spins: d.stats.springs || d.stats.spins || 0 } : null;
      out.player = p;
    } else out.player = null;

    // место и что рядом
    const Walk = G('Walk'), MapView = G('MapView'), Atlas = G('Atlas');
    const pos = Walk && Walk.pos;
    if (pos) {
      out.pos = { lat: +pos.lat.toFixed(5), lng: +pos.lng.toFixed(5) };
      try { out.placed = Walk.placed(); out.gateWait = Math.ceil(Walk.cooldownLeft() / 60000); out.gates = Walk.gates(); } catch (e) { /* нет */ }
      out.walking = !!(Walk.mode);
      // ближайший город Атласа
      try {
        let best = null;
        Object.entries(Atlas.PLACES).forEach(([land, l]) => l.forEach(p => { const dd = dist(pos, { lat: p[3], lng: p[4] }); if (!best || dd < best.d) best = { name: p[1], place: p[2], d: dd, land }; }));
        if (best) out.city = { name: best.name, place: best.place, km: Math.round(best.d / 100) / 10 };
      } catch (e) { /* нет */ }
      const objs = [];
      try {
        const SP = G('SP') || {}, W = G('W');
        const range = e => e.type === 'rift' || e.type === 'shrine' ? 100 : (W && W.INTERACT) || 70;
        for (const m of MapView.markers.values()) {
          const e = m._ent; if (!e) continue;
          const dd = dist(pos, e);
          if (dd > (e.type === 'spirit' ? 330 : 260)) continue;
          objs.push({ e, d: dd });
        }
        objs.sort((a, b) => a.d - b.d);
        out.nearby = objs.slice(0, opts.maxObjs || 12).map(({ e, d }) => {
          const ref = 'o' + (Object.keys(B.objs).length + 1);
          B.objs[ref] = { id: e.id, type: e.type };
          const o = { ref, type: e.type, d: Math.round(d), dir: compass(bearing(pos, e)), near: d <= range(e) };
          if (e.type === 'spirit') { o.name = (SP[e.sid] || {}).name || e.sid; o.lvl = e.lvl; if (e.shiny) o.shiny = true; if (e.boost) o.boost = true; o.left = Math.max(0, Math.round((e.expires - Date.now()) / 60000)); }
          else if (e.type === 'spring') { o.name = e.name; o.state = e.invaded ? 'захвачен Навью' : e.ready ? 'готов' : 'отдыхает'; }
          else if (e.type === 'shrine') { o.name = e.name; o.state = (e.won ? 'сегодня уже побеждено' : `ур. ${e.tier}`) + (e.clan ? `, держит клан ${e.clan}` : ''); }
          else if (e.type === 'rift') { o.name = e.place || 'Разлом'; o.state = `${e.tier || '?'}★` + (e.boss && SP[e.boss] ? `, босс ${SP[e.boss].name}` : '') + (e.done ? ', пройден' : ''); }
          return o;
        });
      } catch (e) { out.nearby = []; }
    }
    out.layers = (() => { try { return G('UI').layers.length; } catch (e) { return 0; } })();
    out.enc = (() => { const E = G('Encounter'); return E && E.st ? { phase: E.st.phase, throws: E.st.throws, charm: E.st.charmType } : null; })();
    return out;
  };

  /* ---------- действия ---------- */
  B.clickRef = ref => { const el = document.querySelector(`[data-bot-ref="${ref}"]`); if (!el) return false; el.click(); return true; };
  B.findByText = text => {
    const q = clean(text, 80).toLowerCase(); if (!q) return null;
    const els = [...document.querySelectorAll('[data-bot-ref]')];
    const exact = els.find(e => label(e).toLowerCase() === q) || els.find(e => label(e).toLowerCase().includes(q));
    return exact ? exact.getAttribute('data-bot-ref') : null;
  };
  const objEnt = ref => {
    const o = B.objs[ref]; if (!o) return null;
    const MapView = G('MapView'); const m = MapView && MapView.markers.get(o.id);
    return m && m._ent ? m._ent : null;
  };
  B.tapObj = async ref => {
    const e = objEnt(ref); if (!e) return { ok: false, error: `Объекта ${ref} уже нет на карте` };
    const since = Date.now();
    G('MapView').tap(e);
    await sleep(1500);
    return { ok: true, toasts: B.takeToasts(since) };
  };

  // Ходьба джойстиком: bearing — куда (градусы по карте), meters — сколько; или к объекту ref
  B.walk = async ({ bearing: brg, meters = 60, ref, run = true, stopNear = true }) => {
    const Walk = G('Walk'), MapView = G('MapView'), UI = G('UI'), W = G('W');
    if (!Walk || !Walk.pos) return { ok: false, error: 'Ловчий ещё не на карте' };
    if (UI && UI.blocking()) return { ok: false, error: 'Поверх карты открыто окно — сначала закрой его (back)' };
    let target = null;
    if (ref) {
      const e = objEnt(ref);
      if (!e) return { ok: false, error: `Объекта ${ref} уже нет на карте` };
      target = { lat: e.lat, lng: e.lng, range: e.type === 'rift' || e.type === 'shrine' ? 90 : ((W && W.INTERACT) || 70) - 15 };
    }
    meters = Math.max(5, Math.min(+meters || 60, 400));
    const start = { ...Walk.pos }, since = Date.now();
    let moved = 0, reason = 'дошёл';
    const setDir = () => {
      const b = target ? bearing(Walk.pos, target) : brg;
      const th = (b + ((MapView && MapView.rot) || 0)) * Math.PI / 180;
      const mag = run ? 1 : 0.5;
      Walk.joy = { x: Math.sin(th) * mag, y: -Math.cos(th) * mag };
      Walk.run();
    };
    const t0 = Date.now();
    try {
      setDir();
      for (;;) {
        await sleep(200);
        moved = dist(start, Walk.pos);
        if (target) {
          const left = dist(Walk.pos, target);
          if (left <= target.range) { reason = 'дошёл до объекта'; break; }
          if (moved >= 400) { reason = 'прошёл 400 м, объект ещё дальше'; break; }
          setDir();
        } else if (moved >= meters) break;
        if (UI && UI.blocking()) { reason = 'по пути открылось окно'; break; }
        const E = G('Encounter'); if (E && E.st) { reason = 'началась встреча'; break; }
        if (Date.now() - t0 > 150000) { reason = 'устал идти (2,5 мин)'; break; }
      }
    } finally {
      Walk.joy = { x: 0, y: 0 };
      try { Walk.stop(); } catch (e) { /* нет */ }
    }
    return { ok: true, moved: Math.round(moved), reason, pos: { lat: +Walk.pos.lat.toFixed(5), lng: +Walk.pos.lng.toFixed(5) }, toasts: B.takeToasts(since) };
  };

  // Шаг через Атлас мира: город из списка Атласа или «широта, долгота»
  B.teleport = async q => {
    const Atlas = G('Atlas'), Walk = G('Walk');
    if (!Atlas || !Walk) return { ok: false, error: 'Атласа нет' };
    const since = Date.now();
    const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();
    let lat, lng, name, place, land;
    const m = /^\s*(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(String(q));
    if (m) { lat = +m[1]; lng = +m[2]; }
    else {
      const nq = norm(q);
      for (const [l, list] of Object.entries(Atlas.PLACES)) for (const p of list) {
        if (land) break;
        const n1 = norm(p[1]), n0 = norm(p[0]);
        if (nq && (n1 === nq || n0 === nq || n1.includes(nq) || nq.includes(n1))) { land = l; name = p[1]; place = p[2]; lat = p[3]; lng = p[4]; }
      }
      if (!land) {
        const all = Object.values(Atlas.PLACES).flat().map(p => p[1]);
        return { ok: false, error: `В Атласе нет места «${clean(q, 40)}». Места Атласа: ${all.join(', ')}. Можно и координаты «широта, долгота».` };
      }
    }
    if (!Atlas.el) { Atlas.open(); await sleep(900); }
    if (land && Atlas.el) {
      if (Atlas.step === 2 && Atlas.land !== land) { Atlas.toWorld(); await sleep(900); }
      if (Atlas.step === 1) { Atlas.select(land); await sleep(500); Atlas.toLand(); await sleep(1300); }
    }
    const p0 = Walk.pos ? { ...Walk.pos } : null;
    Atlas.go(lat, lng, name, place);
    await sleep(900);
    const okBtn = document.querySelector('.at-cd .at-ok, .at-cd .at-use');
    if (!okBtn) {
      const wait = document.querySelector('.at-cd .at-wait');
      if (wait) { wait.click(); await sleep(400); return { ok: false, error: `Врата отдыхают ещё ${Math.ceil(Walk.cooldownLeft() / 60000)} мин, а предмета «Врата Перепутицы» нет`, toasts: B.takeToasts(since) }; }
      return { ok: false, error: 'Окно Врат не открылось', toasts: B.takeToasts(since) };
    }
    const usedItem = okBtn.classList.contains('at-use');
    okBtn.click();
    for (let i = 0; i < 40; i++) {
      await sleep(250);
      if (Walk.pos && (!p0 || dist(p0, Walk.pos) > 50) && !Atlas.el) break;
      if (!document.querySelector('.at-gate') && i > 8 && Atlas.el && !Atlas._busy) break;
    }
    await sleep(600);
    const ok = !!(Walk.pos && (!p0 || dist(p0, Walk.pos) > 50));
    return { ok, where: name ? `${name}, ${place}` : `${lat}, ${lng}`, usedItem, toasts: B.takeToasts(since) };
  };

  // Раздел главного меню по названию (Духи, Сумка, Задания …)
  B.openSection = async q => {
    const UI = G('UI'); if (!UI) return { ok: false, error: 'Игра ещё не загрузилась' };
    const since = Date.now();
    for (let i = 0; i < 4 && UI.layers.length && !document.querySelector('.rm-wrap'); i++) { UI.back(); await sleep(450); }
    if (!document.querySelector('.rm-wrap')) { const b = document.getElementById('menuBtn'); if (!b) return { ok: false, error: 'Кнопки меню нет' }; b.click(); await sleep(800); }
    const tiles = [...document.querySelectorAll('.rm-wrap .rm-it')];
    if (!tiles.length) return { ok: false, error: 'Меню не открылось', toasts: B.takeToasts(since) };
    const nq = clean(q, 40).toLowerCase().replace(/ё/g, 'е');
    const lab = t => clean((t.querySelector('.rm-l') || t).innerText, 40).toLowerCase().replace(/ё/g, 'е');
    const t = tiles.find(t => lab(t) === nq || t.dataset.k === nq) || tiles.find(t => lab(t).includes(nq) || nq.includes(lab(t)));
    if (!t) return { ok: false, error: `Нет раздела «${clean(q, 30)}». Разделы: ${tiles.map(lab).join(', ')}` };
    t.click();
    await sleep(1200);
    return { ok: true, section: lab(t), toasts: B.takeToasts(since) };
  };

  B.back = async () => {
    const UI = G('UI'), since = Date.now();
    if (!UI || !UI.layers.length) return { ok: false, error: 'Закрывать нечего — это карта', toasts: B.takeToasts(since) };
    UI.back(); await sleep(600);
    return { ok: true, toasts: B.takeToasts(since) };
  };

  // Бросок оберега настоящим свайпом по шарику (pointer-события); skill 0..1 — насколько точная рука
  B.throwCharm = async (skill = 0.7) => {
    const E = G('Encounter'); const st = E && E.st;
    if (!st) return { ok: false, error: 'Сейчас нет встречи с духом' };
    for (let i = 0; i < 60 && E.st === st && st.phase !== 'aim'; i++) await sleep(100);
    if (E.st !== st || st.phase !== 'aim') return { ok: false, error: `Бросать нельзя (фаза: ${st.phase})` };
    const since = Date.now();
    // ловкий ждёт, когда кольцо сожмётся
    if (Math.random() < skill) for (let i = 0; i < 30 && !(st.ring < 0.55); i++) await sleep(60);
    const el = st.ballEl, r = el.getBoundingClientRect();
    const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2, H = st.H || innerHeight;
    const err = (1 - Math.max(0, Math.min(1, skill))) * 0.9;
    const vy = -1.6 * Math.max(480, H) / 800 * (1 + (Math.random() * 2 - 1) * err * 0.6);
    const vx = ((st.cx != null ? st.cx : innerWidth / 2) - x0) / 240 + (Math.random() * 2 - 1) * err * 0.5;
    const ev = (type, x, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: 77, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    ev('pointerdown', x0, y0);
    const t0 = performance.now();
    let x = x0, y = y0;
    for (let i = 0; i < 6; i++) {
      await sleep(16);
      const dt = performance.now() - t0; x = x0 + vx * dt; y = y0 + vy * dt; ev('pointermove', x, y);
    }
    ev('pointerup', x, y);
    // итог: следующий бросок, поимка или побег
    let res = 'бросок';
    for (let i = 0; i < 80; i++) {
      await sleep(150);
      if (E.st !== st) { res = 'встреча закончилась'; break; }
      if (st.phase === 'aim' && i > 6) { res = 'можно бросать снова'; break; }
      if (document.querySelector('.enc .enc-card, .enc .caught, .enc button.primary')) { res = 'дух пойман!'; break; }
    }
    const msg = document.querySelector('.enc-msg');
    return { ok: true, result: res, msg: msg ? clean(msg.innerText, 80) : '', throws: st.throws, toasts: B.takeToasts(since) };
  };

  B.act = async (type, args) => {
    const Game = G('Game'); if (!Game) return { ok: false, error: 'Игра ещё не загрузилась' };
    const since = Date.now();
    try {
      const r = await Game.act(String(type), args && typeof args === 'object' ? args : {});
      try { G('UI').refreshHud(); G('MapView').refresh(); } catch (e) { /* нет */ }
      return { ok: true, result: r === undefined ? null : r, toasts: B.takeToasts(since) };
    } catch (e) { return { ok: false, error: clean(e && e.message, 300), toasts: B.takeToasts(since) }; }
  };

  B.chatTail = async (ch = 'all', n = 6) => {
    const S = G('S'), Game = G('Game'); if (!S || !S.d || !Game) return [];
    try {
      const r = await Game.act('chatList', { ch });
      return (r && r.msgs || []).slice(-n).map(m => ({ name: clean(m.name, 20), lvl: m.lvl, text: clean(m.text, 140), mine: !!m.mine, t: m.t }));
    } catch (e) { return [{ name: 'чат', text: 'не открылся: ' + clean(e.message, 80) }]; }
  };

  // ключ закрытого контура: окно игры заполняет сам бот (модель ключ не видит)
  B.fillKey = key => {
    const m = document.querySelector('.key-modal'); if (!m) return false;
    const inp = m.querySelector('.key-in'), btn = m.closest('.modal-wrap').querySelector('.btn.primary');
    if (!inp || !btn) return false;
    inp.value = key; btn.click(); return true;
  };
  B.ready = () => { const S = G('S'), UI = G('UI'); return !!(UI && S) && document.readyState === 'complete'; };
  B.has = has;
})();
