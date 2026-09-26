'use strict';
/* Лига Ордена: турнир — три поединка подряд с Ловчими Лиги, раны между боями не лечатся.
   4.15: вместо звёзд — рейтинг (как кубки в Clash Royale): победа +30, поражение −30 (можно выпасть в прошлую лигу);
   каждая лига — от своего порога рейтинга. Сезон длится месяц, в начале нового рейтинг сверх 1000 срезается наполовину.
   Звёзды старых сохранений переводятся в рейтинг ×100. Жетоны, рейтинг и награды ведёт сервер (leagueStart / leagueEnd).
   Экран (3.21): герб ранга и место в таблице, вкладки «Турнир», «Таблица» (живая, с текущими уровнями — leagueTop)
   и «Ранги»; строка таблицы открывает карточку Ловчего. */

// pts — с какого рейтинга начинается лига
const LEAGUE_RANKS = [
  { name: 'Новик', pts: 0 },
  { name: 'Отрок', pts: 300, reward: { charm: 10, sparks: 500 } },
  { name: 'Гридень', pts: 600, reward: { honey: 5, sparks: 800 } },
  { name: 'Кметь', pts: 1000, reward: { charm2: 5, water: 5 } },
  { name: 'Витязь', pts: 1500, reward: { charm2: 8, sparks: 1500 } },
  { name: 'Богатырь', pts: 2100, reward: { charm3: 3, incense: 1 } },
  { name: 'Воевода', pts: 2800, reward: { charm2: 10, sparks: 3000 } },
  { name: 'Волхв', pts: 3600, reward: { charm3: 5, water: 10 } },
  { name: 'Сказитель', pts: 4500, reward: { incense: 3, sparks: 5000 } },
  { name: 'Хранитель Лиги', pts: 5500, reward: { charm3: 10, sparks: 8000 } },
];

const League = {
  TICKETS: 3,
  WIN: 30, LOSS: 30, // рейтинг за победу и за поражение
  SOFT: 1000,        // в новом сезоне рейтинг сверх этого срезается наполовину
  MAXPTS: 20000,
  LEVEL: 5,    // с какого уровня Ловчего открыта Лига (проверяет сервер)
  carry: null, // раны духов между боями турнира (только на телефоне)
  tab: 'play',
  TABS: ['play', 'table', 'ranks'],

  season(d = U.local()) { return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; },
  seasonName() { return U.local().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).replace(/\s*г\.?$/, ''); },
  seasonEnds() { const d = U.local(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); },
  // 4.15: звёзды старого сохранения — в рейтинг ×100; новый сезон — рейтинг сверх 1000 наполовину; новый день — снова три жетона
  reset(p) { return p > this.SOFT ? this.SOFT + Math.floor((p - this.SOFT) / 2) : p; },
  norm(L) {
    L = L || { season: this.season(), pts: 0, best: 0, tickets: this.TICKETS, day: U.today(), got: {}, run: null };
    if (L.pts == null) {
      L.pts = U.clamp(Math.floor((+L.stars || 0) * 100), 0, this.MAXPTS); delete L.stars;
      if (L.run && L.run.pts0 == null) { L.run.pts0 = U.clamp(Math.floor((+L.run.stars0 || 0) * 100), 0, this.MAXPTS); delete L.run.stars0; }
    }
    if (L.season !== this.season()) { L.season = this.season(); L.pts = this.reset(L.pts); L.got = {}; L.run = null; }
    if (L.day !== U.today()) { L.day = U.today(); L.tickets = this.TICKETS; }
    return L;
  },
  st() { return (S.d.league = this.norm(S.d.league)); },                                      // сервер
  view() { return this.norm(S.d.league ? JSON.parse(JSON.stringify(S.d.league)) : null); },   // телефон
  rank(pts) { let r = 0; LEAGUE_RANKS.forEach((x, i) => { if (pts >= x.pts) r = i; }); return r; },
  // рейтинг из чужого сохранения (карточка Ловчего): старые звёзды ×100, прошлый сезон — со срезом
  ratingOf(L) {
    if (!L || typeof L !== 'object') return 0;
    let p = L.pts != null ? +L.pts || 0 : (+L.stars || 0) * 100;
    if (L.season !== this.season()) p = this.reset(p);
    return U.clamp(Math.floor(p), 0, this.MAXPTS);
  },

  // 4.15: значок лиги — щит из своего металла и свой знак: росток, лук, копьё, топор, меч, булава, стяг, посох, гусли, корона
  badge(i) {
    const M = [['#e7c29a', '#a8744a', '#5b3a1f'], ['#f6d2a8', '#c7803f', '#6e3b12'], ['#f6d2a8', '#c7803f', '#6e3b12'], ['#f8fafc', '#aab4c3', '#4b5568'], ['#f8fafc', '#aab4c3', '#4b5568'],
      ['#fff4c2', '#f5b82e', '#8a4f05'], ['#fff4c2', '#f5b82e', '#8a4f05'], ['#d1fae5', '#34d399', '#065f46'], ['#d1fae5', '#34d399', '#065f46'], ['#f5e8ff', '#b77cf7', '#3b1580']][i] || ['#fff', '#aaa', '#333'];
    const id = 'lgb' + (this._bn = (this._bn || 0) + 1);
    const G = [
      { f: 'M50 60c-11 0-17-8-17-17 11 0 17 7 17 17zM50 54c10 0 15-8 15-15-10 0-15 6-15 15z', l: 'M50 80V50' },
      { f: 'M40 33c22 8 22 40 0 48l3-4c15-8 15-32-3-40z', l: 'M42 35v44M34 57h30M58 51l8 6-8 6' },
      { f: 'M50 27l8 14-8 7-8-7z', l: 'M50 47v34M44 70h12' },
      { f: 'M44 34c16-7 27 3 21 20-7-4-14-6-21-8z', l: 'M45 34l9 47' },
      { f: 'M50 27l5 8v30h-10V35zM37 64h26v5H37zM47 69h6v9h-6zM50 84a4 4 0 1 0 0-.1z', l: '' },
      { f: 'M50 33l4 5 6-1-1 6 5 4-5 4 1 6-6-1-4 5-4-5-6 1 1-6-5-4 5-4-1-6 6 1z', l: 'M50 56v25' },
      { f: 'M42 32h25l-7 10 7 10H42z', l: 'M40 30v51' },
      { f: 'M53 23c7 7 7 14 0 18-7-4-7-11 0-18z', l: 'M53 41v40M44 52l18 8M44 60l18-8' },
      { f: 'M35 42l30-7 3 36-30 5z', t: 'M43 44l3 29M50 42l3 30M57 41l3 29M38 50l27-6' },
      { f: 'M32 70l3-28 9 11 6-16 6 16 9-11 3 28zM32 73h36v5H32z', l: '' },
    ][i] || { f: '', l: '' };
    const laurel = i >= 6 ? `<g fill="none" stroke="${M[1]}" stroke-width="3" stroke-linecap="round" opacity=".95">
      <path d="M14 34c-8 14-6 36 10 52M86 34c8 14 6 36-10 52"/>${[0, 1, 2, 3].map(k => `<path d="M${12 - k * 0} ${44 + k * 12}c-6-2-9-7-8-12M${88} ${44 + k * 12}c6-2 9-7 8-12"/>`).join('')}</g>` : '';
    const crown = i === 9 ? `<path d="M36 12l4-9 6 6 4-8 4 8 6-6 4 9z" fill="url(#${id}m)" stroke="${M[2]}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="50" cy="3" r="2.2" fill="#fde68a"/>` : '';
    return `<svg class="lg-badge-svg" viewBox="0 -6 100 116" aria-hidden="true"><defs>
      <linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${M[0]}"/><stop offset=".55" stop-color="${M[1]}"/><stop offset="1" stop-color="${M[2]}"/></linearGradient>
      <radialGradient id="${id}f" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#3a2470"/><stop offset="1" stop-color="#120a2e"/></radialGradient></defs>
      ${laurel}${crown}
      <path d="M50 12L86 23v28c0 26-15 43-36 52C29 94 14 77 14 51V23z" fill="url(#${id}m)" stroke="${M[2]}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M50 20l28 9v22c0 21-12 35-28 42-16-7-28-21-28-42V29z" fill="url(#${id}f)" stroke="${M[2]}" stroke-width="1.2" opacity=".96"/>
      ${G.l ? `<path d="${G.l}" fill="none" stroke="${M[2]}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="${G.l}" fill="none" stroke="url(#${id}m)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      ${G.f ? `<path d="${G.f}" fill="url(#${id}m)" stroke="${M[2]}" stroke-width="1.8" stroke-linejoin="round"/>` : ''}
      ${G.t ? `<path d="${G.t}" fill="none" stroke="${M[2]}" stroke-width="1.8" stroke-linecap="round"/>` : ''}
      <path d="M26 30c6-4 14-6 22-6" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".35" fill="none"/></svg>`;
  },
  // значок рейтинга — кубок
  cup() { return '<svg class="lg-cup" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v3.5a5 5 0 0 1-10 0z" fill="#fcd34d" stroke="#92400e" stroke-width="1.2"/><path d="M7 5.5H4.5a3 3 0 0 0 3 4M17 5.5h2.5a3 3 0 0 1-3 4" fill="none" stroke="#fcd34d" stroke-width="1.6"/><path d="M12 12.5v3.5M8.5 20h7l-.8-3.5H9.3z" fill="#f59e0b" stroke="#92400e" stroke-width="1.1"/></svg>'; },
  rwLine(i) { const x = LEAGUE_RANKS[i]; return x.reward ? UI.rwText(x.reward) + (i % 3 === 0 ? ' + амулет' : '') + (i === 9 ? ' + эмблема «Венец»' : '') : ''; },

  // Соперник: сила растёт с рангом, ориентир — средний уровень твоих трёх сильнейших.
  // Одинаков на телефоне и сервере: зависит от рейтинга, номера боя и зерна турнира.
  opponent(k, L = this.view()) {
    const r = this.rank(L.pts), seed = L.run ? L.run.seed : 0;
    const rng = U.rng(`league:${L.season}:${L.pts}:${k}:${seed}`);
    const maxStage = r <= 2 ? 1 : r <= 5 ? 2 : 3, maxRar = r <= 2 ? 2 : r <= 5 ? 3 : 4;
    const pool = SPECIES.filter(s => !s.legend && !s.region && !s.land && !s.season && s.rar <= maxRar && s.stage <= maxStage);
    const top = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 3);
    const avg = top.length ? top.reduce((a, x) => a + x.lvl, 0) / top.length : S.d.level;
    const lvl = U.clamp(Math.round(Math.min(avg, S.d.level + 2) + (r - 3) * 0.8 + k), 3, 40);
    const team = [];
    while (team.length < 3) {
      const s = pool[Math.floor(rng() * pool.length)];
      if (team.some(x => x.sid === s.id)) continue;
      team.push(S.makeSpirit(s.id, lvl, `lg${L.pts}${k}${team.length}${seed || ''}`, { ivMin: Math.min(12, 3 + r) }));
    }
    // имена трёх соперников турнира не повторяются (сдвиг 5 по кругу из 12)
    const name = GUARDIANS[(Math.floor(U.h('lgname', seed || L.pts) * GUARDIANS.length) + k * 5) % GUARDIANS.length];
    return {
      name, color: GUARD_COLORS[Math.floor(rng() * GUARD_COLORS.length)], title: `Ловчий Лиги · ${LEAGUE_RANKS[r].name}`, team,
      T: { speed: Math.max(0.55, 0.86 - r * 0.033), shield: Math.min(0.9, 0.3 + r * 0.065) },
    };
  },

  // «6 дн 11 ч», «5 ч 12 мин», «12 мин 05 с»
  left(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60;
    return d ? `${d} дн ${h} ч` : h ? `${h} ч ${m} мин` : `${m} мин ${String(s % 60).padStart(2, '0')} с`;
  },
  toMidnight() { return 86400000 - U.local().getTime() % 86400000; },

  // Таблица сезона — только с сервера игры (текущие уровни и имена, коды для карточки)
  async top() {
    return Game.act('leagueTop', { board: Cfg.s.cloud !== false }); // таблицу напрямую не читает никто (3.23): только через сервер игры
  },

  screen() {
    Sfx.init();
    let L = this.view(), r = this.rank(L.pts);
    const next = LEAGUE_RANKS[r + 1], base = LEAGUE_RANKS[r].pts, cup = this.cup();
    const prog = next ? Math.min(100, (L.pts - base) / (next.pts - base) * 100) : 100;
    // 4.14.1: Лига — в композиции карточки духа: сверху (≤30%) знак ранга в волшебном круге, справа сезон, ранг, «ЗВЁЗДЫ ··· N»,
    // путь до следующего ранга отдельным блоком и место в таблице; ниже вкладки, содержимое вкладки листается внутри панели
    const scr = UI.screen('Лига Ордена', `
      <div class="det det2 lg2 r${r}">
        <div class="dt-hero">
          <div class="det-art lg2-crest">${this.badge(r)}</div>
          <div class="dt-info">
            <div class="det-hp">Сезон · ${this.seasonName()} · ⏳ <b class="lgx-ends"></b></div>
            <div class="lg2-rank">${LEAGUE_RANKS[r].name}</div>
            <div class="det-power"><small>РЕЙТИНГ</small><b>${cup}${U.fmtNum(L.pts)}</b></div>
            <div class="det-lvl"><span>${next ? `до лиги «${next.name}» — <b>${U.fmtNum(next.pts)}</b>, ещё ${U.fmtNum(next.pts - L.pts)}` : 'высшая лига!'}</span><div class="arc"><i style="width:${prog}%"></i></div></div>
            <div class="lgx-place">${Cloud.enabled() ? 'Ищу тебя в таблице…' : ''}</div>
          </div>
        </div>
        <div class="seg dt-tabs lgx-tabs"><button data-tab="play">Турнир</button><button data-tab="table">Таблица</button><button data-tab="ranks">Лиги</button></div>
        <div class="dt-panel"><div class="lgx-pane"></div></div>
      </div>`, 'league-screen det-screen');
    const body = scr.querySelector('.screen-body'), pane = scr.querySelector('.lgx-pane');
    let data = null, moves = {}, prevPos = null, loading = false;

    const tickets = () => `
      <div class="lgx-card lgx-tix">
        <div class="lgx-tokens">${Array.from({ length: this.TICKETS }, (_, i) => `<span class="${i < L.tickets ? 'on' : ''}"><svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.8z"/></svg></span>`).join('')}</div>
        <div class="row-main"><b>Жетоны турнира: ${L.tickets} из ${this.TICKETS}</b><small>${L.tickets < this.TICKETS ? `Новые через <span class="lgx-mid"></span>` : 'Один жетон — один турнир'}</small></div>
      </div>`;
    const renderPlay = () => {
      const team = S.team(), locked = S.d.level < this.LEVEL, power = team.reduce((a, x) => a + S.power(x), 0);
      const slots = UI.teamHtml(team).replace('<i>Нет духов</i>', '') + '<button class="mini lgx-slot team-slot" aria-label="Выбрать духа">+</button>'.repeat(Math.max(0, 3 - team.length));
      const btn = locked ? `Лига откроется на ${this.LEVEL} уровне` : team.length < 3 ? 'Нужно три духа' : L.tickets > 0 ? 'Начать турнир' : 'Жетоны кончились — приходи завтра';
      pane.innerHTML = `
        ${locked ? `<div class="lgx-card lgx-lock"><b>Лига откроется на ${this.LEVEL} уровне Ловчего</b><small>Сейчас у тебя ${S.d.level}-й. Лови духов, проходи родники и разломы — опыт придёт быстро.</small></div>` : ''}
        ${tickets()}
        <div class="lgx-card lgx-path">
          <div class="lgx-steps">
            ${[1, 2, 3].map(k => `<div class="lgx-step"><span>${k}</span><small>+${this.WIN}</small></div>${k < 3 ? '<i></i>' : ''}`).join('')}
          </div>
          <small class="lgx-rules">Три боя подряд с Ловчими Лиги. Победа — +${this.WIN} рейтинга, поражение — −${this.LOSS} и конец турнира. Раны духов между боями не лечатся, щиты восстанавливаются.</small>
        </div>
        <div class="lgx-team-head"><b>Команда на турнир</b>${power ? `<span>сила ${U.fmtNum(power)}</span>` : ''}<button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team my lgx-team">${slots}</div>
        ${next ? `<div class="lgx-card lgx-goal"><span class="lg-badge sm">${this.badge(r + 1)}</span><div class="row-main"><small>Следующая лига · ещё ${U.fmtNum(next.pts - L.pts)} рейтинга</small><b>${next.name}: ${this.rwLine(r + 1)}</b></div></div>` : ''}
        <button class="btn primary wide lg-go" ${!locked && L.tickets > 0 && team.length === 3 ? '' : 'disabled'}>${btn}</button>`;
    };

    const who = x => `${U.esc(x.name)}${CLANS[x.clan] ? `<i class="lgx-clan" style="background:${CLANS[x.clan].color}" title="${CLANS[x.clan].name}"></i>` : ''}`;
    const move = x => { const d = x.pid && moves[x.pid]; return d && Date.now() - d.t < 20000 ? `<span class="lgx-move ${d.d > 0 ? 'up' : 'down'}">${d.d > 0 ? '▲' : '▼'}${Math.abs(d.d)}</span>` : ''; };
    const renderTable = () => {
      if (!Cloud.enabled()) { pane.innerHTML = '<div class="lgx-card"><small>Общая таблица всех Ловчих появится, когда к игре подключат облачный сервер.</small></div>'; return; }
      const head = `<div class="lgx-live"><i></i>Обновляется в реальном времени${data ? `<span>${data.total} ${U.plural(data.total, 'Ловчий', 'Ловчих', 'Ловчих')} в сезоне</span>` : ''}</div>`;
      if (!data) { pane.innerHTML = head + '<div class="lgx-card"><small>Загружаю таблицу…</small></div>'; return; }
      if (data.error) { pane.innerHTML = head + `<div class="lgx-card"><small>Таблица недоступна: ${U.esc(data.error)}</small></div>`; return; }
      const rows = data.rows, tier = data.tier || { rank: r, rows: [] };
      if (!rows.length) { pane.innerHTML = head + '<div class="lgx-card"><small>В этом сезоне ещё никто не сыграл турнир — будь первым!</small></div>'; return; }
      // пьедестал — тройка лучших в твоём ранге; ниже — остальные из топ-50 сезона (с их местом в сезоне)
      const key = x => x.pid || x.name, onPod = new Set(tier.rows.map(key));
      const seat = x => rows.findIndex(y => key(y) === key(x)) + 1;
      const pod = [1, 0, 2].filter(i => tier.rows[i]).map(i => { const x = tier.rows[i], p = seat(x); return `
        <button class="lgx-pod p${i + 1} ${x.me ? 'me' : ''}" data-pid="${U.esc(x.pid || '')}" data-name="${U.esc(x.name)}">
          <div class="lgx-pod-ava">${Art.avatar(x.look || undefined)}<span>${i + 1}</span></div>
          <b>${who(x)}</b><small>${p ? `${p}-е место · ` : ''}ур. ${x.lvl}</small>
          <div class="lgx-pod-base">${cup}${U.fmtNum(x.pts)}${move(x)}</div></button>`; }).join('');
      const list = rows.map((x, j) => ({ x, j })).filter(o => !onPod.has(key(o.x))).map(({ x, j }) => `
        <button class="lgx-row ${x.me ? 'me' : ''}" data-pid="${U.esc(x.pid || '')}" data-name="${U.esc(x.name)}">
          <b class="lgx-pos">${j + 1}</b><div class="fr-ava">${Art.avatar(x.look || undefined)}</div>
          <div class="row-main"><b>${who(x)}</b><small>${LEAGUE_RANKS[x.rank].name} · ур. ${x.lvl}</small></div>
          ${move(x)}<span class="lgx-stars">${cup}${U.fmtNum(x.pts)}</span></button>`).join('');
      const mine = !rows.some(x => x.me) && data.me ? `<div class="lgx-row me lgx-mine"><b class="lgx-pos">${data.me.place}</b><div class="row-main"><b>Ты</b><small>${LEAGUE_RANKS[r].name} · ур. ${S.d.level}</small></div><span class="lgx-stars">${cup}${U.fmtNum(data.me.pts)}</span></div>` : '';
      pane.innerHTML = head + (pod ? `<div class="lgx-sub"><span class="lg-badge sm">${this.badge(tier.rank)}</span>Лучшие в лиге «${LEAGUE_RANKS[tier.rank].name}»</div><div class="lgx-podium">${pod}</div>` : '')
        + (list ? `<div class="lgx-sub">Топ-50 сезона</div><div class="list lgx-list">${list}</div>` : '') + mine
        + (Cfg.s.cloud === false ? '<div class="q-note">Тебя нет в таблице: так выбрано в Настройках.</div>' : '<div class="q-note">Нажми на Ловчего, чтобы открыть его карточку.</div>');
    };

    const renderRanks = () => {
      pane.innerHTML = `<div class="lgx-ladder">${LEAGUE_RANKS.map((x, i) => `
        <div class="lgx-rung ${i < r ? 'past' : i === r ? 'cur' : ''}">
          <span class="lg-badge">${this.badge(i)}</span>
          <div class="row-main"><b>${x.name}${i === r ? ' <span class="lgx-you">ты здесь</span>' : ''}</b><small>от ${U.fmtNum(x.pts)}${x.reward ? ' · ' + this.rwLine(i) : ' · начало пути'}</small></div>
          ${L.got[i] ? '<span class="q-ok" title="Получено в этом сезоне">✓</span>' : i > r ? `<span class="lgx-need">ещё ${U.fmtNum(x.pts - L.pts)}</span>` : ''}
        </div>`).join('')}</div>
        <div class="q-note">Победа в турнире — +${this.WIN} рейтинга, поражение — −${this.LOSS}: можно выпасть в прошлую лигу. Награду за лигу дают один раз за сезон. В начале нового сезона рейтинг сверх ${U.fmtNum(this.SOFT)} срезается наполовину — и награды можно получить снова. В лигах «Кметь», «Воевода» и «Хранитель Лиги» — ещё и амулет.</div>`;
    };

    const place = () => {
      const el = scr.querySelector('.lgx-place'); if (!el || !data || data.error) return;
      const i = data.rows.findIndex(x => x.me);
      el.innerHTML = i >= 0 ? `<b>${i + 1}-е место</b> из ${data.total} в сезоне` : data.me ? `<b>${data.me.place}-е место</b> из ${data.total} в сезоне`
        : Cfg.s.cloud === false ? 'Тебя нет в таблице (Настройки)' : 'Сыграй турнир, чтобы попасть в таблицу';
    };
    const render = () => {
      U.$$('[data-tab]', scr).forEach(b => b.classList.toggle('on', b.dataset.tab === this.tab));
      if (this.tab === 'table') renderTable(); else if (this.tab === 'ranks') renderRanks(); else renderPlay();
      tick();
    };
    const show = (t, dir) => { this.tab = t; render(); UI.slideIn(pane, dir); };
    // таблица — сразу и потом каждые 5 секунд, пока экран открыт; перерисовка — только если что-то изменилось
    const load = async () => {
      if (loading || !Cloud.enabled()) return;
      loading = true;
      let d;
      try { d = await this.top(); } catch (e) { d = data && !data.error ? data : { error: e.message }; }
      loading = false;
      if (!scr.isConnected) return;
      if (!d.error) {
        const pos = {}; d.rows.forEach((x, i) => { if (x.pid) pos[x.pid] = i; });
        if (prevPos) Object.keys(pos).forEach(p => { if (prevPos[p] != null && prevPos[p] !== pos[p]) moves[p] = { d: prevPos[p] - pos[p], t: Date.now() }; });
        prevPos = pos;
      }
      const changed = JSON.stringify(d) !== JSON.stringify(data) || Object.values(moves).some(m => Date.now() - m.t < 25000);
      data = d; place();
      if (changed && this.tab === 'table') renderTable();
    };
    const tick = () => {
      const e = scr.querySelector('.lgx-ends'); if (e) e.textContent = this.left(this.seasonEnds().getTime() - U.local().getTime());
      const m = scr.querySelector('.lgx-mid'); if (m) m.textContent = this.left(this.toMidnight());
    };

    scr.addEventListener('click', async e => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { if (tb.dataset.tab !== this.tab) { Sfx.play('tap'); show(tb.dataset.tab, Math.sign(this.TABS.indexOf(tb.dataset.tab) - this.TABS.indexOf(this.tab))); } return; }
      if (e.target.closest('.team-edit, .team-slot')) { UI.pickTeam(() => { if (scr.isConnected && this.tab === 'play') renderPlay(); }); return; }
      const row = e.target.closest('[data-pid]');
      if (row) {
        const x = data && data.rows && data.rows.concat(data.tier ? data.tier.rows : []).find(y => y.pid && y.pid === row.dataset.pid);
        if (x) Friends.card(x.pid, { name: x.name, look: x.look }); else UI.toast('Карточка откроется после обновления сервера'); return; }
      const go = e.target.closest('.lg-go');
      if (go) {
        if (S.team().length < 3) return;
        go.disabled = true;
        const r0 = await Game.try('leagueStart');
        if (!r0) { go.disabled = false; return; }
        UI.closeScreen(scr);
        this.carry = null;
        this.next();
      }
    });
    UI.swipeTabs(body, this.TABS, () => this.tab, show);
    render(); load();
    let n = 0;
    const t = setInterval(() => {
      if (!scr.isConnected) { clearInterval(t); return; }
      tick();
      // жетоны вернулись в полночь — перерисовать вкладку турнира
      if (L.day !== U.today()) { L = this.view(); r = this.rank(L.pts); if (this.tab === 'play') renderPlay(); }
      if (++n % 5 === 0 && !document.hidden) load();
    }, 1000);
  },

  next() {
    const run = this.view().run;
    if (!run) return;
    const g = this.opponent(run.k), team = run.team.map(u => S.findSpirit(u)).filter(Boolean);
    Duel.start({ kind: 'league', id: 'league', tier: 1, T: g.T, name: 'Лига', carry: this.carry }, g, team);
  },

  // Вызывается из Duel.finish: итог боя засчитывает сервер
  async afterDuel(win, st) {
    let r = null;
    try { r = await Game.act('leagueEnd', { win: !!win, board: Cfg.s.cloud !== false }); } catch (e) { UI.toast(U.esc(e.message)); }
    if (Duel.st !== st) return;
    if (!r) {
      const res = U.el(`<div class="raid-result"><div class="res-card"><div class="res-title lose">Бой не засчитан</div>
        <div class="res-note">Сервер не подтвердил итог боя. Проверь интернет.</div><button class="btn primary wide lg-done">К Лиге</button></div></div>`);
      st.root.appendChild(res);
      res.querySelector('.lg-done').onclick = () => { Duel.close(); this.carry = null; setTimeout(() => this.screen(), 150); };
      return;
    }
    this.carry = st.me.team;
    this.carry.forEach(f => { f.energy = 0; });
    Sfx.play(r.win ? 'win' : 'lose');
    const alive = this.carry.filter(f => f.cur > 0).length;
    let html;
    if (!r.last) {
      const nx = this.opponent(r.k + 1);
      html = `<div class="res-title">Победа ${r.k + 1} из 3</div>
        <div class="res-note">Рейтинг +${r.gained}. Твои духи (в строю: ${alive}) не отдыхают — следующий соперник уже ждёт.</div>
        <div class="guard"><div class="guard-ava">${Art.guardian(nx.color)}</div><div><b>${nx.name}</b><small>${nx.title}</small></div></div>
        <div class="rift-team">${UI.teamHtml(nx.team)}</div>
        <button class="btn primary wide lg-next">Следующий бой</button>`;
    } else {
      html = `<div class="res-title ${r.won ? '' : 'lose'}">${r.won === 3 ? 'Чистая победа!' : r.won ? 'Турнир окончен' : 'Поражение'}</div>
        <div class="res-note">Побед: ${r.won} из 3 · рейтинг ${r.ptsGot >= 0 ? '+' : '−'}${Math.abs(r.ptsGot)}<br>Лига: <b>${LEAGUE_RANKS[r.rNew].name}</b> · рейтинг ${U.fmtNum(r.pts)}</div>
        ${r.rNew > r.rank0 ? `<div class="badge-new">Новая лига — ${LEAGUE_RANKS[r.rNew].name}!</div>` : r.rNew < r.rank0 ? `<div class="badge-new down">Выпал в лигу «${LEAGUE_RANKS[r.rNew].name}»</div>` : ''}
        ${r.rewards.length ? `<div class="res-rw">${r.rewards.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${x.label}</div>`).join('')}</div>` : ''}
        <button class="btn primary wide lg-done">К Лиге</button>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}</div></div>`);
    st.root.appendChild(res);
    const nb = res.querySelector('.lg-next');
    if (nb) nb.onclick = () => { Duel.close(); setTimeout(() => this.next(), 150); };
    const db = res.querySelector('.lg-done');
    if (db) db.onclick = () => { Duel.close(); this.carry = null; setTimeout(() => this.screen(), 150); };
  },
};
