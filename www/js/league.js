'use strict';
/* Лига Ордена: турнир — три поединка подряд с Ловчими Лиги, раны между боями не лечатся.
   Победа — звезда, три победы подряд — ещё одна. Сезон длится месяц, в начале нового звёзды делятся пополам. */

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
  run: null,

  season(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; },
  seasonName() { return new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }); },
  seasonEnds() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1); },
  st() {
    const L = S.d.league = S.d.league || { season: this.season(), stars: 0, best: 0, tickets: this.TICKETS, day: U.today(), got: {} };
    if (L.season !== this.season()) { L.season = this.season(); L.stars = Math.floor(L.stars / 2); L.got = {}; }
    if (L.day !== U.today()) { L.day = U.today(); L.tickets = this.TICKETS; }
    return L;
  },
  rank(stars) { let r = 0; LEAGUE_RANKS.forEach((x, i) => { if (stars >= x.stars) r = i; }); return r; },

  // Соперник: сила растёт с рангом, ориентир — средний уровень твоих трёх сильнейших
  opponent(k) {
    const L = this.st(), r = this.rank(L.stars);
    const rng = U.rng(`league:${L.season}:${L.stars}:${k}:${this.run ? this.run.seed : 0}`);
    const maxStage = r <= 2 ? 1 : r <= 5 ? 2 : 3, maxRar = r <= 2 ? 2 : r <= 5 ? 3 : 4;
    const pool = SPECIES.filter(s => !s.legend && !s.region && !s.season && s.rar <= maxRar && s.stage <= maxStage);
    const top = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 3);
    const avg = top.length ? top.reduce((a, x) => a + x.lvl, 0) / top.length : S.d.level;
    const lvl = U.clamp(Math.round(Math.min(avg, S.d.level + 2) + (r - 3) * 0.8 + k), 3, 40);
    const team = [];
    while (team.length < 3) {
      const s = pool[Math.floor(rng() * pool.length)];
      if (team.some(x => x.sid === s.id)) continue;
      team.push(S.makeSpirit(s.id, lvl, `lg${L.stars}${k}${team.length}${this.run ? this.run.seed : ''}`, { ivMin: Math.min(12, 3 + r) }));
    }
    // имена трёх соперников турнира не повторяются (сдвиг 5 по кругу из 12)
    const name = GUARDIANS[(Math.floor(U.h('lgname', this.run ? this.run.seed : L.stars) * GUARDIANS.length) + k * 5) % GUARDIANS.length];
    return {
      name, color: GUARD_COLORS[Math.floor(rng() * GUARD_COLORS.length)], title: `Ловчий Лиги · ${LEAGUE_RANKS[r].name}`, team,
      T: { speed: Math.max(0.55, 0.86 - r * 0.033), shield: Math.min(0.9, 0.3 + r * 0.065) },
    };
  },

  screen() {
    const L = this.st(), r = this.rank(L.stars), next = LEAGUE_RANKS[r + 1];
    let team = S.team();
    const pct = next ? (L.stars - LEAGUE_RANKS[r].stars) / (next.stars - LEAGUE_RANKS[r].stars) * 100 : 100;
    const scr = UI.screen('Лига Ордена', `
      <div class="league">
        <div class="lg-badge r${Math.min(9, r)}"><span>${r + 1}</span></div>
        <div class="lg-rank">${LEAGUE_RANKS[r].name}</div>
        <div class="lg-season">Сезон: ${this.seasonName()} · до ${this.seasonEnds().toLocaleDateString('ru-RU')}</div>
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
    if (Cloud.enabled()) {
      Cloud.submitLeague().then(() => Cloud.top(L.season)).then(({ rows, me }) => {
        const box = scr.querySelector('.lg-top'); if (!box) return;
        box.innerHTML = rows.length ? rows.map((x, i) => `<div class="row ${x.user_id === me ? 'lg-me' : ''}"><b class="lg-pos">${i + 1}</b><div class="fr-ava">${Art.avatar(x.look || undefined)}</div>
          <div class="row-main"><b>${U.esc(x.name)}</b><small>${LEAGUE_RANKS[x.rank] ? LEAGUE_RANKS[x.rank].name : ''} · ур. ${x.level}</small></div><span class="cnt">★ ${x.stars}</span></div>`).join('')
          : '<div class="row"><div class="row-main"><small>В этом сезоне ещё никто не играл — будь первым!</small></div></div>';
      }).catch(e => { const box = scr.querySelector('.lg-top'); if (box) box.innerHTML = `<div class="row"><div class="row-main"><small>Таблица недоступна: ${U.esc(e.message)}</small></div></div>`; });
    }
    scr.querySelector('.lg-go').onclick = () => {
      team = S.team();
      if (team.length < 3 || L.tickets <= 0) return;
      L.tickets--; S.save();
      UI.closeScreen(scr);
      this.run = { team, k: 0, carry: null, won: 0, stars0: L.stars, rank0: r, seed: U.uid() };
      this.next();
    };
  },
  closeAndReopen(scr) { UI.closeScreen(scr); setTimeout(() => this.screen(), 230); },

  next() {
    const run = this.run, g = this.opponent(run.k);
    run.g = g;
    Duel.start({ kind: 'league', id: 'league', tier: 1, T: g.T, name: 'Лига', carry: run.carry }, g, run.team);
  },

  // Вызывается из Duel.finish
  afterDuel(win, st) {
    const run = this.run, L = this.st();
    run.carry = st.me.team;
    run.carry.forEach(f => { f.energy = 0; });
    let gained = 0;
    if (win) { run.won++; gained++; S.progress('league', 1); }
    const last = !win || run.k >= 2;
    if (win && run.k === 2) gained++; // чистая победа
    L.stars += gained;
    const rNew = this.rank(L.stars);
    const rewards = [];
    for (let i = 1; i <= rNew; i++) {
      if (!L.got[i]) {
        L.got[i] = true;
        rewards.push(...S.giveRewards(LEAGUE_RANKS[i].reward));
        // на рангах 3, 6 и 9 — гарантированный амулет
        if (i % 3 === 0) { const am = S.rollAmulet(1, 'lg' + i); rewards.push({ k: 'amulet', n: 1, label: AMULETS[am].name }); }
      }
    }
    if (rNew > L.best) L.best = rNew;
    S.addXP(win ? 400 + run.k * 200 : 100);
    S.save();
    Sfx.play(win ? 'win' : 'lose');
    const alive = run.carry.filter(f => f.cur > 0).length;
    if (last) { J.add('league', { won: run.won, rank: LEAGUE_RANKS[rNew].name }); Cloud.submitLeague(); }
    let html;
    if (!last) {
      const nx = this.opponent(run.k + 1);
      html = `<div class="res-title">Победа ${run.k + 1} из 3</div>
        <div class="res-note">+★ ${gained}. Твои духи (в строю: ${alive}) не отдыхают — следующий соперник уже ждёт.</div>
        <div class="guard"><div class="guard-ava">${Art.guardian(nx.color)}</div><div><b>${nx.name}</b><small>${nx.title}</small></div></div>
        <div class="rift-team">${UI.teamHtml(nx.team)}</div>
        <button class="btn primary wide lg-next">Следующий бой</button>`;
    } else {
      html = `<div class="res-title ${run.won ? '' : 'lose'}">${run.won === 3 ? 'Чистая победа!' : run.won ? 'Турнир окончен' : 'Поражение'}</div>
        <div class="res-note">Побед: ${run.won} из 3 · звёзд получено: ${L.stars - run.stars0}<br>Ранг: <b>${LEAGUE_RANKS[rNew].name}</b> (★ ${L.stars})</div>
        ${rNew > run.rank0 ? `<div class="badge-new">Новый ранг — ${LEAGUE_RANKS[rNew].name}!</div>` : ''}
        ${rewards.length ? `<div class="res-rw">${rewards.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${x.label}</div>`).join('')}</div>` : ''}
        <button class="btn primary wide lg-done">К Лиге</button>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}</div></div>`);
    st.root.appendChild(res);
    const nb = res.querySelector('.lg-next');
    if (nb) nb.onclick = () => { Duel.close(); run.k++; setTimeout(() => this.next(), 150); };
    const db = res.querySelector('.lg-done');
    if (db) db.onclick = () => { Duel.close(); this.run = null; setTimeout(() => this.screen(), 150); };
  },
};
