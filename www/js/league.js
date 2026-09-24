'use strict';
/* Лига Ордена: турнир — три поединка подряд с Ловчими Лиги, раны между боями не лечатся.
   Победа — звезда, три победы подряд — ещё одна. Сезон длится месяц, в начале нового звёзды делятся пополам.
   Жетоны, звёзды и награды ведёт сервер (leagueStart / leagueEnd), телефон показывает бои.
   Экран (3.21): герб ранга и место в таблице, вкладки «Турнир», «Таблица» (живая, с текущими уровнями — leagueTop)
   и «Ранги»; строка таблицы открывает карточку Ловчего. */

const LEAGUE_RANKS = [
  { name: 'Новик', stars: 0 },
  { name: 'Отрок', stars: 3, reward: { charm: 10, sparks: 500 } },
  { name: 'Гридень', stars: 6, reward: { honey: 5, sparks: 800 } },
  { name: 'Кметь', stars: 10, reward: { charm2: 5, water: 5 } },
  { name: 'Витязь', stars: 15, reward: { charm2: 8, sparks: 1500 } },
  { name: 'Богатырь', stars: 21, reward: { charm3: 3, incense: 1 } },
  { name: 'Воевода', stars: 28, reward: { charm2: 10, sparks: 3000 } },
  { name: 'Волхв', stars: 36, reward: { charm3: 5, water: 10 } },
  { name: 'Сказитель', stars: 45, reward: { incense: 3, sparks: 5000 } },
  { name: 'Хранитель Лиги', stars: 55, reward: { charm3: 10, sparks: 8000 } },
];

const League = {
  TICKETS: 3,
  LEVEL: 5,    // с какого уровня Ловчего открыта Лига (проверяет сервер)
  carry: null, // раны духов между боями турнира (только на телефоне)
  tab: 'play',
  TABS: ['play', 'table', 'ranks'],

  season(d = U.local()) { return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; },
  seasonName() { return U.local().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).replace(/\s*г\.?$/, ''); },
  seasonEnds() { const d = U.local(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); },
  // новый сезон — звёзды пополам, новый день — снова три жетона
  norm(L) {
    L = L || { season: this.season(), stars: 0, best: 0, tickets: this.TICKETS, day: U.today(), got: {}, run: null };
    if (L.season !== this.season()) { L.season = this.season(); L.stars = Math.floor(L.stars / 2); L.got = {}; L.run = null; }
    if (L.day !== U.today()) { L.day = U.today(); L.tickets = this.TICKETS; }
    return L;
  },
  st() { return (S.d.league = this.norm(S.d.league)); },                                      // сервер
  view() { return this.norm(S.d.league ? JSON.parse(JSON.stringify(S.d.league)) : null); },   // телефон
  rank(stars) { let r = 0; LEAGUE_RANKS.forEach((x, i) => { if (stars >= x.stars) r = i; }); return r; },
  rwLine(i) { const x = LEAGUE_RANKS[i]; return x.reward ? UI.rwText(x.reward) + (i % 3 === 0 ? ' + амулет' : '') + (i === 9 ? ' + эмблема «Венец»' : '') : ''; },

  // Соперник: сила растёт с рангом, ориентир — средний уровень твоих трёх сильнейших.
  // Одинаков на телефоне и сервере: зависит от звёзд, номера боя и зерна турнира.
  opponent(k, L = this.view()) {
    const r = this.rank(L.stars), seed = L.run ? L.run.seed : 0;
    const rng = U.rng(`league:${L.season}:${L.stars}:${k}:${seed}`);
    const maxStage = r <= 2 ? 1 : r <= 5 ? 2 : 3, maxRar = r <= 2 ? 2 : r <= 5 ? 3 : 4;
    const pool = SPECIES.filter(s => !s.legend && !s.region && !s.land && !s.season && s.rar <= maxRar && s.stage <= maxStage);
    const top = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 3);
    const avg = top.length ? top.reduce((a, x) => a + x.lvl, 0) / top.length : S.d.level;
    const lvl = U.clamp(Math.round(Math.min(avg, S.d.level + 2) + (r - 3) * 0.8 + k), 3, 40);
    const team = [];
    while (team.length < 3) {
      const s = pool[Math.floor(rng() * pool.length)];
      if (team.some(x => x.sid === s.id)) continue;
      team.push(S.makeSpirit(s.id, lvl, `lg${L.stars}${k}${team.length}${seed || ''}`, { ivMin: Math.min(12, 3 + r) }));
    }
    // имена трёх соперников турнира не повторяются (сдвиг 5 по кругу из 12)
    const name = GUARDIANS[(Math.floor(U.h('lgname', seed || L.stars) * GUARDIANS.length) + k * 5) % GUARDIANS.length];
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
    let L = this.view(), r = this.rank(L.stars);
    const next = LEAGUE_RANKS[r + 1], base = LEAGUE_RANKS[r].stars;
    const pips = next ? Array.from({ length: next.stars - base }, (_, i) => `<i class="${i < L.stars - base ? 'on' : ''}"></i>`).join('') : '';
    const scr = UI.screen('Лига Ордена', `
      <section class="lgx-hero r${r}">
        <div class="lgx-top"><span class="lgx-chip">Сезон · ${this.seasonName()}</span><span class="lgx-chip" title="До конца сезона">⏳ <b class="lgx-ends"></b></span></div>
        <div class="lgx-crest"><div class="lgx-hex r${r}"><span>${r + 1}</span></div></div>
        <div class="lgx-rank">${LEAGUE_RANKS[r].name}</div>
        <div class="lgx-place">${Cloud.enabled() ? 'Ищу тебя в таблице…' : ''}</div>
        ${next ? `<div class="lgx-pips">${pips}</div><small class="lgx-next">★ ${L.stars} · до ранга «${next.name}» ещё ${next.stars - L.stars} ★</small>`
          : `<small class="lgx-next">★ ${L.stars} · высший ранг Лиги!</small>`}
      </section>
      <div class="seg lgx-tabs"><button data-tab="play">Турнир</button><button data-tab="table">Таблица</button><button data-tab="ranks">Ранги</button></div>
      <div class="lgx-pane"></div>`, 'league-screen');
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
            ${[1, 2, 3].map(k => `<div class="lgx-step"><span>${k}</span><small>+1 ★</small></div><i></i>`).join('')}
            <div class="lgx-step bonus"><span>★</span><small>+1 ★ за 3 из 3</small></div>
          </div>
          <small class="lgx-rules">Три боя подряд с Ловчими Лиги. Раны духов между боями не лечатся, щиты восстанавливаются. Поражение звёзд не отнимает.</small>
        </div>
        <div class="lgx-team-head"><b>Команда на турнир</b>${power ? `<span>сила ${U.fmtNum(power)}</span>` : ''}<button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team my lgx-team">${slots}</div>
        ${next ? `<div class="lgx-card lgx-goal"><div class="lg-mini r${r + 1}">${r + 2}</div><div class="row-main"><small>Следующая награда · ещё ${next.stars - L.stars} ★</small><b>${next.name}: ${this.rwLine(r + 1)}</b></div></div>` : ''}
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
          <div class="lgx-pod-base">★ ${x.stars}${move(x)}</div></button>`; }).join('');
      const list = rows.map((x, j) => ({ x, j })).filter(o => !onPod.has(key(o.x))).map(({ x, j }) => `
        <button class="lgx-row ${x.me ? 'me' : ''}" data-pid="${U.esc(x.pid || '')}" data-name="${U.esc(x.name)}">
          <b class="lgx-pos">${j + 1}</b><div class="fr-ava">${Art.avatar(x.look || undefined)}</div>
          <div class="row-main"><b>${who(x)}</b><small>${LEAGUE_RANKS[x.rank].name} · ур. ${x.lvl}</small></div>
          ${move(x)}<span class="lgx-stars">★ ${x.stars}</span></button>`).join('');
      const mine = !rows.some(x => x.me) && data.me ? `<div class="lgx-row me lgx-mine"><b class="lgx-pos">${data.me.place}</b><div class="row-main"><b>Ты</b><small>${LEAGUE_RANKS[r].name} · ур. ${S.d.level}</small></div><span class="lgx-stars">★ ${data.me.stars}</span></div>` : '';
      pane.innerHTML = head + (pod ? `<div class="lgx-sub"><div class="lg-mini r${tier.rank}">${tier.rank + 1}</div>Лучшие в ранге «${LEAGUE_RANKS[tier.rank].name}»</div><div class="lgx-podium">${pod}</div>` : '')
        + (list ? `<div class="lgx-sub">Топ-50 сезона</div><div class="list lgx-list">${list}</div>` : '') + mine
        + (Cfg.s.cloud === false ? '<div class="q-note">Тебя нет в таблице: так выбрано в Настройках.</div>' : '<div class="q-note">Нажми на Ловчего, чтобы открыть его карточку.</div>');
    };

    const renderRanks = () => {
      pane.innerHTML = `<div class="lgx-ladder">${LEAGUE_RANKS.map((x, i) => `
        <div class="lgx-rung ${i < r ? 'past' : i === r ? 'cur' : ''}">
          <div class="lg-mini r${i}">${i + 1}</div>
          <div class="row-main"><b>${x.name}${i === r ? ' <span class="lgx-you">ты здесь</span>' : ''}</b><small>★ ${x.stars}${x.reward ? ' · ' + this.rwLine(i) : ' · начало пути'}</small></div>
          ${L.got[i] ? '<span class="q-ok" title="Получено в этом сезоне">✓</span>' : i > r ? `<span class="lgx-need">ещё ${x.stars - L.stars} ★</span>` : ''}
        </div>`).join('')}</div>
        <div class="q-note">Награду за ранг дают один раз за сезон. В начале нового сезона звёзды делятся пополам — и награды можно получить снова. На рангах 4, 7 и 10 — ещё и амулет.</div>`;
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
      if (L.day !== U.today()) { L = this.view(); r = this.rank(L.stars); if (this.tab === 'play') renderPlay(); }
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
        <div class="res-note">+★ ${r.gained}. Твои духи (в строю: ${alive}) не отдыхают — следующий соперник уже ждёт.</div>
        <div class="guard"><div class="guard-ava">${Art.guardian(nx.color)}</div><div><b>${nx.name}</b><small>${nx.title}</small></div></div>
        <div class="rift-team">${UI.teamHtml(nx.team)}</div>
        <button class="btn primary wide lg-next">Следующий бой</button>`;
    } else {
      html = `<div class="res-title ${r.won ? '' : 'lose'}">${r.won === 3 ? 'Чистая победа!' : r.won ? 'Турнир окончен' : 'Поражение'}</div>
        <div class="res-note">Побед: ${r.won} из 3 · звёзд получено: ${r.starsGot}<br>Ранг: <b>${LEAGUE_RANKS[r.rNew].name}</b> (★ ${r.stars})</div>
        ${r.rNew > r.rank0 ? `<div class="badge-new">Новый ранг — ${LEAGUE_RANKS[r.rNew].name}!</div>` : ''}
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
