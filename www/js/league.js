'use strict';
/* Лига Ордена: турнир — три поединка подряд с Ловчими Лиги, раны между боями не лечатся.
   Победа — звезда, три победы подряд — ещё одна. Сезон длится месяц, в начале нового звёзды делятся пополам.
   Жетоны, звёзды и награды ведёт сервер (leagueStart / leagueEnd), телефон показывает бои. */

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
  carry: null, // раны духов между боями турнира (только на телефоне)

  season(d = U.local()) { return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; },
  seasonName() { return U.local().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }); },
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

  screen() {
    const L = this.view(), r = this.rank(L.stars), next = LEAGUE_RANKS[r + 1];
    const team = S.team();
    const pct = next ? (L.stars - LEAGUE_RANKS[r].stars) / (next.stars - LEAGUE_RANKS[r].stars) * 100 : 100;
    const scr = UI.screen('Лига Ордена', `
      <div class="league">
        <div class="lg-badge r${Math.min(9, r)}"><span>${r + 1}</span></div>
        <div class="lg-rank">${LEAGUE_RANKS[r].name}</div>
        <div class="lg-season">Сезон: ${this.seasonName()} · до ${this.seasonEnds().toLocaleDateString('ru-RU', { timeZone: 'UTC' })}</div>
        <div class="pbar big"><i style="width:${pct}%"></i></div>
        <small>★ ${L.stars}${next ? ` / ${next.stars} до ранга «${next.name}»` : ' — высший ранг!'}</small>
        <div class="lg-tickets">${'<i class="on"></i>'.repeat(L.tickets)}${'<i></i>'.repeat(this.TICKETS - L.tickets)}<span>Жетоны турнира: ${L.tickets} из ${this.TICKETS} (обновятся завтра)</span></div>
        <div class="panel lg-rules"><b>Турнир</b><small>Три поединка подряд с Ловчими Лиги. Раны духов между боями не лечатся, щиты — восстанавливаются. Победа — ★, три победы подряд — ещё ★. Поражение звёзд не отнимает.</small></div>
        <div class="rift-team-title">Команда на турнир <button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team my">${UI.teamHtml(team)}</div>
        <button class="btn primary wide lg-go" ${L.tickets > 0 && team.length === 3 ? '' : 'disabled'}>${team.length < 3 ? 'Нужно три духа' : L.tickets > 0 ? 'Начать турнир' : 'Жетоны кончились — приходи завтра'}</button>
        <h3 class="prof-h">Таблица сезона</h3>
        <div class="list lg-top">${Cloud.enabled() ? '<div class="row"><div class="row-main"><small>Загружаю…</small></div></div>'
          : '<div class="row"><div class="row-main"><small>Общая таблица всех Ловчих появится, когда к игре подключат облачный сервер.</small></div></div>'}</div>
        <h3 class="prof-h">Награды за ранги</h3>
        <div class="list lg-rewards">${LEAGUE_RANKS.slice(1).map((x, i) => `
          <div class="row ${L.best >= i + 1 ? 'got' : ''}"><div class="lg-mini r${i + 1}">${i + 2}</div><div class="row-main"><b>${x.name}</b><small>★ ${x.stars} · ${UI.rwText(x.reward)}${(i + 1) % 3 === 0 ? ' + амулет' : ''}${i + 1 === 9 ? ' + эмблема «Венец»' : ''}</small></div>${L.got[i + 1] ? '<span class="q-ok">✓</span>' : ''}</div>`).join('')}</div>
      </div>`, 'league-screen');
    scr.querySelector('.team-edit').onclick = () => UI.pickTeam(() => { this.closeAndReopen(scr); });
    // таблица сезона — сразу и потом каждые 5 секунд, пока экран открыт (места меняются в реальном времени)
    const loadTop = () => Cloud.top(L.season).then(({ rows, me }) => {
      const box = scr.querySelector('.lg-top'); if (!box) return;
      const html = rows.length ? rows.map((x, i) => `<div class="row ${x.user_id === me ? 'lg-me' : ''}"><b class="lg-pos">${i + 1}</b><div class="fr-ava">${Art.avatar(x.look || undefined)}</div>
        <div class="row-main"><b>${U.esc(x.name)}</b><small>${LEAGUE_RANKS[x.rank] ? LEAGUE_RANKS[x.rank].name : ''} · ур. ${x.level}</small></div><span class="cnt">★ ${x.stars}</span></div>`).join('')
        : '<div class="row"><div class="row-main"><small>В этом сезоне ещё никто не играл — будь первым!</small></div></div>';
      if (box._html !== html) { box.innerHTML = html; box._html = html; } // перерисовка — только если что-то изменилось
    }).catch(e => {
      const box = scr.querySelector('.lg-top');
      if (box && !box._html) box.innerHTML = `<div class="row"><div class="row-main"><small>Таблица недоступна: ${U.esc(e.message)}</small></div></div>`; // уже показанную не стираем
    });
    if (Cloud.enabled()) {
      loadTop();
      const t = setInterval(() => { if (!scr.isConnected) { clearInterval(t); return; } if (!document.hidden) loadTop(); }, 5000);
    }
    scr.querySelector('.lg-go').onclick = async () => {
      if (S.team().length < 3) return;
      const r0 = await Game.try('leagueStart');
      if (!r0) return;
      UI.closeScreen(scr);
      this.carry = null;
      this.next();
    };
  },
  closeAndReopen(scr) { UI.closeScreen(scr); setTimeout(() => this.screen(), 230); },

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
