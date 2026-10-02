'use strict';
/* Разломы: битва с боссом (тап — атака, свайп/кнопка — уклон), затем поимка босса */

const Raid = {
  /* 4.16: босс — по уровню Ловчего (rl; в совместном бою — средний уровень Ловчих комнаты): атака и защита — как у духа
     уровня rl, умноженные на k; здоровье hp и сила удара pw — для Ловчего 20-го уровня, с уровнем растут вместе с силой
     духов (Raid.grow). Раньше босс был один на все уровни (hp 600 / 1800 / 4500, атака и защита — как у духа 14 / 22 / 28
     уровня): новичку не по силам, сильный закрывал 9 из 10, и легенды тоже. Ориентир побед живого игрока своей командой:
     малый — ~85%, средний — ~55–60%, великий (легенды) — в одиночку ~25%, втроём ~70%. lvl — уровень пойманного босса */
  TIER: {
    1: { hp: 3000, k: 1.35, lvl: 15, pw: 10, charms: 6, name: ru`Малый разлом` },
    2: { hp: 4500, k: 1,    lvl: 22, pw: 16, charms: 7, name: ru`Разлом` },
    3: { hp: 6000, k: 0.72, lvl: 30, pw: 24, charms: 9, name: ru`Великий разлом` },
  },
  // здоровье босса в совместном бою: +COOP за каждого союзника (раньше +80% — втроём было почти как в одиночку)
  COOP: 0.6,
  coopHp(n) { return 1 + this.COOP * Math.max(0, (n | 0) - 1); },
  st: null,

  team() { return S.team(); },
  // во сколько раз сильнее «опорного» (20-го уровня) дух уровня rl: здоровье босса растёт как урон духов, удар — как их здоровье
  // после 30-го уровня босс растёт вдвое медленнее: сила духов там упирается в предел уровня
  grow(rl) { const x = S.cpm(this.bossLvl(rl)) / S.cpm(20); return { hp: Math.pow(x, 1.2), pw: x }; },
  bossLvl(rl) { return rl <= 30 ? rl : 30 + (rl - 30) / 2; },
  bossStats(r) {
    if (r.cs) return { ...r.cs }; // 5.1.15: хранитель Разлома кампании — по команде Ловчего (S.campBoss; в бою — от сервера, raidStart)
    const T = this.TIER[r.tier], b = SP[r.boss].base, rl = U.clamp(Math.round(+r.rl || S.catchLvl()), 1, 40), c = S.cpm(this.bossLvl(rl)) * T.k, g = this.grow(rl);
    return { atk: (b[0] + 15) * c, def: (b[1] + 15) * c, hp: Math.round(T.hp * g.hp), pw: T.pw * g.pw, rl };
  },
  eff(att, def) {
    if (ELEMENTS[att].beats.includes(def)) return 1.6;
    if (ELEMENTS[def].beats.includes(att)) return 0.625;
    return 1;
  },

  open(r) {
    // 5.1.15: Разлом кампании (r.camp) — личный, с любого уровня, без Дальнего пропуска, друзей и дневного лимита; хранитель — по команде
    const camp = !!r.camp;
    if (!camp && S.d.level < RAID_LEVEL) { UI.toast(ru`Разломы открываются с ${RAID_LEVEL} уровня Ловчего`); return; } // 4.18
    const s = SP[r.boss], T = this.TIER[r.tier];
    let team = this.team();
    if (camp) r.cs = S.campBoss(team, r.boss);
    const counters = SPECIES.filter(x => ELEMENTS[x.el].beats.includes(s.el)).map(x => x.el).filter((v, i, a) => a.indexOf(v) === i);
    // до Разлома дальше 100 м — бой по Дальнему пропуску (совместный бой — только рядом)
    const d = MapView.pos ? U.dist(MapView.pos.lat, MapView.pos.lng, r.lat, r.lng) : 0;
    const far = d > W.BATTLE_R, passes = S.d.items.farpass || 0;
    const goBtn = camp && far ? `<button class="btn primary wide" disabled>${ru`Подойди к Разлому ближе`}</button>`
      : !far ? `<button class="btn primary wide rift-go" ${team.length ? '' : 'disabled'}>${ru`Сразиться`}</button>`
      : passes ? `<button class="btn primary wide rift-go far" ${team.length ? '' : 'disabled'}>${Art.item('farpass')} ${ru`Дальний бой · пропусков: ${passes}`}</button>`
      : `<button class="btn primary wide rift-shop">${Art.item('farpass')} ${ru`Нужен Дальний пропуск — в Лавку`}</button>`;
    // 4.22.2: в композиции карточки духа и Лиги: сверху портал с боссом, справа ступень, босс, сила и таймер;
    // вкладки «Бой» (команда и кнопки — закреплены внизу), «Босс» (слабость, погода, как бить), «Награда»
    const st = this.bossStats(r), el = s.el, w = Sky.w ? WEATHER[Sky.w.key] : null;
    const teamHtml = t => UI.teamCards(t); // 5.1.5: три карточки в ряд, пустые места — «+ Выбрать духа»
    const power = t => t.reduce((a, x) => a + S.power(x), 0);
    const row = (t, v) => `<div class="dt-row"><span>${t}</span><b>${v}</b></div>`;
    const it = (k, n) => `<span class="cur">${Art.item(k)}</span> ${n}`;
    const T2 = r.tier; // 4.25: место Разлома — значком булавки, без «у «…»» (название места не склоняется)
    const html = `
      <div class="det det2 rift2 t${T2}">
        <div class="dt-hero">
          <div class="det-art rift2-art"><div class="rift-portal">${Art.riftIcon(T2, r.myth)}</div><div class="rift-boss">${Art.spirit(r.boss)}</div></div>
          <div class="dt-info">
            <div class="det-hp">${T.name} <span class="stars">${'★'.repeat(T2)}</span></div>
            <div class="rift2-name">${Art.elIcon(el, 18)} ${s.name}</div>
            <div class="det-power"><small>${ru`СИЛА БОССА`}</small><b>${U.fmtNum(st.hp * 1.5)}</b></div>
            <div class="rift2-left">${camp ? ru`не закроется, пока не победишь` : ru`закроется через ${`<b class="rift-left">${U.fmtTime(Math.max(0, r.endsAt - U.now()))}</b>`}`}</div>
            ${r.place ? `<div class="rift2-place">${UI.I.pin}${U.esc(r.place)}</div>` : ''}
            ${camp ? '' : `<div class="rift2-place place-kind">${MYTH_PLACES[r.myth || 'slavic'].rift}</div>`}
          </div>
        </div>
        <div class="seg dt-tabs"><button data-tab="fight" class="on">${ru`Бой`}</button><button data-tab="boss">${ru`Босс`}</button><button data-tab="loot">${ru`Награда`}</button></div>
        <div class="dt-panel">
          <div class="dt-pane on" data-pane="fight">
            ${r.done ? `<div class="rift-done">${ru`Этот разлом ты уже закрыл. Новый босс — в начале следующего часа.`}</div>` : `
            <div class="dt-scroll rift2-fight">
              <div class="pf-mh lg2-th"><span>${ru`Твоя команда`}</span><b class="rift2-pw">${team.length ? ru`сила ${U.fmtNum(power(team))}` : ''}</b><button class="lg2-edit team-edit">${ru`Изменить`}</button></div>
              <div class="lg2-team rift-team">${teamHtml(team)}</div>
              ${far ? `<div class="rift-tip rift-far">${camp ? ru`До Разлома ${U.fmtDist(d)}. Подойди ближе — нужно ${W.BATTLE_R} м.` : ru`До Разлома ${U.fmtDist(d)}. Дальний пропуск: один Орден дарит каждый день, ещё — в Лавке. Позвать друзей можно, только подойдя к Капищу.`}</div>` : ''}
              ${camp ? `<div class="rift-tip">${ru`Хранитель — по силе твоей команды: тапай без остановки, и он падёт.`}</div>` : Rules.dayLine(S.d, 'raids', ru`Разломов закрыто`)}
            </div>
            <div class="rift2-acts">${goBtn}${far || camp ? '' : `<button class="btn ghost wide rift-coop">${ru`Позвать друзей`}</button>`}</div>`}
          </div>
          <div class="dt-pane" data-pane="boss">
            <p class="det-desc place-desc">${MYTH_PLACES[r.myth || 'slavic'].riftDesc}</p>
            <div class="dt-scroll dt-rows">
              ${row(ru`Стихия`, `${Art.elIcon(el, 16)} ${ELEMENTS[el].name}`)}
              ${row(ru`Слабость`, counters.map(e => `${Art.elIcon(e, 16)} ${ELEMENTS[e].name}`).join(' '))}
              ${w ? row(`${Art.wxIcon(Sky.w.key, 16)} ${w.name}`, ru`урон +20% у ${w.boost.map(e => ELEMENTS[e].name).join(` ${ru`и`} `)}`) : ''}
              ${row(ru`Уровень босса`, camp ? ru`по силе твоей команды` : ru`растёт с уровнем Ловчего`)}
              <p class="rift2-note">${T2 === 3 ? ru`Великий разлом в одиночку по силам немногим — позови друзей: втроём его закрыть куда легче.` : ru`Бей в слабость: духи этих стихий наносят больше урона. Тап — атака, смахни в сторону — уклон от удара босса.`}</p>
            </div>
          </div>
          <div class="dt-pane" data-pane="loot">
            <div class="dt-scroll dt-rows">
              ${camp ? row(ru`Кампания`, ru`цель шага`) : ''}
              ${row(ru`Опыт`, U.fmtNum(1000 * T2) + (far || camp ? '' : ru` · с друзьями +25%`))}
              ${row(ru`Искры`, it('sparks', U.fmtNum(350 * T2)))}
              ${row(ru`Обереги`, it('charm', 5) + (T2 >= 2 ? ' · ' + it('charm2', 3) : ''))}
              ${row(ru`Припасы`, it('honey', T2) + ' · ' + (T2 === 1 ? it('herb', 1) : it('water', 1)))}
              ${row(ru`Эссенция Рода`, it('rod', S.RIFT_ESS[T2] || 0))}
              ${S.ALATYR_DROP.rift[T2] ? row(ru`Осколок Алатыря`, S.ALATYR_DROP.rift[T2] >= 1 ? ru`точно` : ru`шанс ${Math.round(S.ALATYR_DROP.rift[T2] * 100)}%`) : ''}
              ${row(ru`Амулет`, ru`шанс ${[5, 12, 30][T2 - 1]}%`)}
              ${row(ru`Поимка босса`, ru`${T.charms} ${U.plural(T.charms, ru`оберег`, ru`оберега`, ru`оберегов`)}`)}
              <p class="rift2-note">${ru`После победы босса можно поймать. Оберегов на поимку больше за быструю победу (+1 за каждые 15 с быстрее 90 с) и за друзей (+2 за каждого). Уровень пойманного духа — не выше твоего, сияющий — примерно 1 из 20.`}</p>
            </div>
          </div>
        </div>
      </div>`;
    const scr = UI.screen(camp ? ru`Разлом кампании` : MYTH_PLACES[r.myth || 'slavic'].rift, html, 'rift-screen det-screen'); // 4.28: свой у каждой мифологии
    scr._ended = !!r.done; // уже закрытый — сообщение есть в разметке
    scr.querySelector('.dt-tabs').addEventListener('click', e => {
      const b = e.target.closest('[data-tab]'); if (!b) return;
      Sfx.play('tap');
      U.$$('.dt-tabs button', scr).forEach(x => x.classList.toggle('on', x === b));
      U.$$('.dt-pane', scr).forEach(p => p.classList.toggle('on', p.dataset.pane === b.dataset.tab));
    });
    const go = scr.querySelector('.rift-go');
    if (go) go.onclick = async () => { if (await this.battle(r, this.team(), null, far)) UI.closeScreen(scr); };
    const shop = scr.querySelector('.rift-shop');
    if (shop) shop.onclick = () => { UI.closeScreen(scr); Shop.screen(); };
    const cb = scr.querySelector('.rift-coop');
    if (cb) cb.onclick = () => { UI.closeScreen(scr); Coop.hostRift(r); };
    const edit = () => UI.pickTeam(() => {
      team = this.team();
      const box = scr.querySelector('.rift-team'); if (box) box.innerHTML = teamHtml(team);
      const pw = scr.querySelector('.rift2-pw'); if (pw) pw.textContent = team.length ? ru`сила ${U.fmtNum(power(team))}` : '';
      const g = scr.querySelector('.rift-go'); if (g) g.disabled = !team.length;
      if (camp) { r.cs = S.campBoss(team, r.boss); const bp = scr.querySelector('.det-power b'); if (bp) bp.textContent = U.fmtNum(this.bossStats(r).hp * 1.5); } // хранитель — по новой команде
    });
    scr.querySelector('.dt-panel').addEventListener('click', e => { if (e.target.closest('.team-edit')) edit(); });
    // каждую секунду: таймер; разлом закрыт (победа) или его час прошёл — вместо команды и кнопок сообщение
    const timer = setInterval(() => {
      if (!scr.isConnected) { clearInterval(timer); return; }
      const t = scr.querySelector('.rift-left'); if (t) t.textContent = U.fmtTime(Math.max(0, r.endsAt - U.now()));
      const done = camp ? !S.campRiftOn() : !!S.d.rifts[r.id], gone = !camp && U.now() >= r.endsAt;
      if ((done || gone) && !scr._ended) {
        scr._ended = true;
        scr.querySelector('[data-pane="fight"]').innerHTML = `<div class="rift-done">${done ? (camp ? ru`Разлом кампании закрыт!` : ru`Этот разлом ты уже закрыл. Новый босс — в начале следующего часа.`) : ru`Разлом схлопнулся — его час прошёл. Новые открываются в начале каждого часа.`}</div>`;
      }
    }, 1000);
  },

  // Разломы вокруг: все открытые в этот час Разломы до Rules.FAR.R от игрока
  async list() {
    Sfx.init(); Sfx.play('tap');
    if (S.d.level < RAID_LEVEL) { UI.toast(ru`Разломы открываются с ${RAID_LEVEL} уровня Ловчего`); return; } // 4.18
    const scr = UI.screen(ru`Разломы вокруг`, `<div class="rift-list"><div class="q-note">${ru`Ищу Разломы у Капищ вокруг…`}</div></div>`, 'rifts-screen');
    const box = scr.querySelector('.rift-list'), pos = MapView.pos;
    if (!pos) { box.innerHTML = `<div class="q-note">${ru`Жду, когда найдётся твоё место на карте…`}</div>`; return; }
    const shrines = await Poi.shrinesFar(pos.lat, pos.lng, Rules.FAR.R);
    // Разломы часа: пересчитываются каждую секунду — закрытый только что помечается сразу, в начале часа приходят новые
    let hour = Math.floor(U.now() / 3600000), rifts = [], sig = '';
    const calc = () => {
      hour = Math.floor(U.now() / 3600000);
      rifts = shrines.map(p => W.riftFor(p, p.d, hour)).filter(Boolean).sort((a, b) => (a.done - b.done) || (a.d - b.d));
      return rifts.map(r => r.id + (r.done ? '+' : '')).join() + '|' + (S.d.items.farpass || 0);
    };
    let tier = 0; // 0 — все, иначе только разломы этой силы
    const left = () => U.fmtTime(Math.max(0, (hour + 1) * 3600000 - U.now()));
    const render = () => {
      const passes = S.d.items.farpass || 0;
      const shown = rifts.map((r, i) => ({ r, i })).filter(x => !tier || x.r.tier === tier), more = Math.max(0, shown.length - 40);
      box.innerHTML = `<div class="shop-wallet"><span class="zlat">${Art.item('farpass')} ${ru`Пропусков: ${passes}`}</span><span>${ru`новые через ${`<b class="rl-left">${left()}</b>`}`}</span></div>
        <div class="chips rift-tiers">${[0, 1, 2, 3].map(t => `<button class="chip ${tier === t ? 'on' : ''}" data-t="${t}">${t ? '★'.repeat(t) : ru`Все`} <small>${rifts.filter(r => (!t || r.tier === t) && !r.done).length}</small></button>`).join('')}</div>
        ${shown.length ? shown.slice(0, 40).map(({ r, i }) => `<button class="rift-row t${r.tier} ${r.done ? 'done' : ''}" data-i="${i}">
          <div class="rr-boss">${Art.spirit(r.boss)}</div>
          <div class="row-main"><b>${SP[r.boss].name} <span class="stars">${'★'.repeat(r.tier)}</span></b><small>${U.esc(r.place || MYTH_PLACES[r.myth || 'slavic'].shrine)}</small></div>
          <div class="rr-d">${r.done ? `✓ ${ru`закрыт`}` : r.d <= W.BATTLE_R ? ru`рядом` : U.fmtDist(r.d)}</div></button>`).join('')
          : `<div class="q-note">${ru`Сейчас вокруг нет открытых Разломов. Новые открываются в начале каждого часа.`}</div>`}
        ${more ? `<div class="q-note">${ru`…и ещё ${more} дальше`}</div>` : ''}
        <div class="q-note">${ru`Разломы открываются у Капищ каждый час. Подойди к Капищу на 100 м — или закрой Разлом издалека (до 5 км) по Дальнему пропуску.`}</div>`;
    };
    box.addEventListener('click', e => {
      const c = e.target.closest('.chip'); if (c) { tier = +c.dataset.t; render(); return; }
      const b = e.target.closest('.rift-row'); if (b) this.open(rifts[+b.dataset.i]);
    });
    sig = calc(); render();
    const timer = setInterval(() => {
      if (!scr.isConnected) { clearInterval(timer); return; }
      const s = calc();
      if (s !== sig) { sig = s; render(); } // сменился набор разломов или чей-то статус — перерисовать
      else { const t = box.querySelector('.rl-left'); if (t) t.textContent = left(); } // иначе — только таймер
    }, 1000);
  },
  // Разломов вокруг (незакрытых) — для значка в меню; считаем по уже загруженному списку
  openCount() {
    if (!Poi.far || !MapView.pos) return 0;
    const hour = Math.floor(U.now() / 3600000);
    return Poi.far.items.filter(p => U.dist(MapView.pos.lat, MapView.pos.lng, p.lat, p.lng) <= Rules.FAR.R).map(p => W.riftFor(p, 0, hour)).filter(r => r && !r.done).length;
  },

  // Сервер проверяет, что разлом открыт здесь и сейчас, и запоминает начало боя.
  // coop: { host, hpMul, allies, code } — совместный бой (см. coop.js), союзников сервер считает по комнате. Возвращает true, если бой начался.
  async battle(r, team, coop, far) {
    if (this.st || this._starting) return false;
    this._starting = true;
    const ok = await Game.try('raidStart', r.camp ? { camp: true } : { rift: { id: r.poi, lat: r.lat, lng: r.lng, name: r.place }, coop: coop ? { code: coop.code } : null, far: !!far });
    this._starting = false;
    if (!ok) return false;
    if (r.camp && ok.cs) r.cs = ok.cs; // 5.1.15: хранитель Разлома кампании — как посчитал сервер по команде на старте боя
    this.start(r, team, coop);
    return true;
  },
  start(r, team, coop) {
    const s = SP[r.boss], T = this.TIER[r.tier], bs = this.bossStats(r);
    if (coop) bs.hp = Math.round(bs.hp * coop.hpMul);
    const root = U.el(`
      <div class="raid el-${s.el}">
        <div class="raid-bg"></div>
        <div class="raid-top">
          <div class="raid-timer">90</div>
          <div class="raid-bname">${Art.elIcon(s.el, 18)} ${s.name}</div>
          <div class="bar boss"><i></i></div>
          ${coop ? '<div class="raid-allies"></div>' : ''}
        </div>
        <div class="raid-boss"><div class="warn">!</div>${Art.spirit(r.boss)}</div>
        <div class="raid-me"></div>
        <div class="raid-fx"></div>
        <div class="raid-hud">
          <div class="raid-mname"></div>
          <div class="bar hp"><i></i></div>
          <div class="raid-team"></div>
        </div>
        <div class="raid-ctrl">
          <button class="raid-water">${Art.item('water')}<span></span></button>
          <button class="raid-special"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fill"/></svg><span>${ru`Приём`}</span></button>
          <button class="raid-dodge">${ru`Уклон`}</button>
        </div>
        <div class="raid-hint">${ru`Тапай по экрану — атака.<br>Когда босс замахивается (!) — жми «Уклон» или смахни в сторону.`}</div>
        <div class="raid-count">3</div>
      </div>`);
    document.body.appendChild(root);
    Music.play('map'); // 4.8.1: в боях — та же мелодия карты
    const $ = sel => root.querySelector(sel);
    const st = this.st = {
      r, s, bs, root, $, bossHp: bs.hp, time: 90, energy: 0, cool: 0, idx: 0, coop: coop || null, ko: false,
      team: team.map(sp => { const x = S.battle(sp); return { sp, ...x, max: x.hp * 5, lim: Math.round(x.hp * 5 * S.hpCap(sp)), cur: Math.max(1, Math.round(x.hp * 5 * S.hpNow(sp))) }; }), // 4.15: с тем здоровьем, что есть; 4.16: lim — предел усталого
      nextAtk: 3.2, tele: 0, dodgeT: -9, waters: 0, running: false, over: false,
    };
    UI.pushLayer(() => this.quit());
    this.showMine();
    $('.raid-water span').textContent = S.d.items.water || 0;

    const tapArea = root;
    let sx = 0, sy = 0, sid = null;
    tapArea.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      sid = e.pointerId; sx = e.clientX; sy = e.clientY;
    });
    tapArea.addEventListener('pointerup', e => {
      if (e.pointerId !== sid) return; sid = null;
      if (Math.abs(e.clientX - sx) > 50 && Math.abs(e.clientX - sx) > Math.abs(e.clientY - sy)) this.dodge(e.clientX > sx ? 1 : -1);
      else this.fast(e.clientX, e.clientY);
    });
    $('.raid-dodge').onclick = () => this.dodge(1);
    $('.raid-special').onclick = () => this.special();
    $('.raid-water').onclick = () => this.water();

    // обратный отсчёт
    (async () => {
      for (let i = 3; i > 0; i--) { $('.raid-count').textContent = i; Sfx.play('count'); await U.wait(650); if (this.st !== st) return; }
      $('.raid-count').textContent = ru`В бой!`;
      await U.wait(500);
      $('.raid-count').remove();
      st.running = true;
      let last = performance.now();
      const loop = t => { if (this.st !== st || st.over) return; this.tick(Math.min(0.05, (t - last) / 1000)); last = t; requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    })();
    this.render();
  },

  cur() { return this.st.team[this.st.idx]; },
  showMine() {
    const st = this.st, m = this.cur();
    st.$('.raid-me').innerHTML = Art.of(m.sp);
    st.$('.raid-me').classList.remove('swap'); void st.$('.raid-me').offsetWidth; st.$('.raid-me').classList.add('swap');
    st.$('.raid-mname').innerHTML = `${Art.elIcon(SP[m.sp.sid].el, 16)} ${U.esc(m.sp.nick || SP[m.sp.sid].name)} <small>${ru`СИЛА ${m.power}`}</small>`;
    st.$('.raid-team').innerHTML = st.team.map((x, i) => `<i class="${x.cur <= 0 ? 'dead' : i === st.idx ? 'on' : ''}"></i>`).join('');
  },
  dmg(att, def, power, attEl, defEl) {
    const wx = Sky.boosted(attEl) ? 1.2 : 1;
    return Math.floor(0.5 * power * (att / def) * 1.2 * wx * this.eff(attEl, defEl)) + 1;
  },
  float(text, x, y, cls = '') {
    const f = U.el(`<div class="dmg ${cls}" style="left:${x}px;top:${y}px">${text}</div>`);
    this.st.$('.raid-fx').appendChild(f);
    setTimeout(() => f.remove(), 900);
  },
  hitBoss(n, special) {
    const st = this.st;
    st.bossHp = Math.max(0, st.bossHp - n);
    const b = st.$('.raid-boss');
    b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
    const r = b.getBoundingClientRect();
    this.float(n, r.left + r.width * (0.3 + Math.random() * 0.4), r.top + r.height * 0.3, special ? 'big' : '');
    if (st.coop && !st.coop.solo) {
      Coop.localHit(n);
      // гость ждёт подтверждения победы от хозяина (на всякий случай — не дольше 4 секунд)
      if (!st.coop.host) {
        if (st.bossHp <= 0 && !st._wait) { st.bossHp = 1; st._wait = setTimeout(() => this.finish(true), 4000); }
        return;
      }
    }
    if (st.bossHp <= 0) this.finish(true);
  },

  /* ---------- совместный бой ---------- */
  remoteHit(name, n) { // у хозяина: урон союзника. Возвращает засчитанный урон.
    // 4.1: сообщение из открытого канала — только разумные числа: не больше 4% здоровья босса за удар и 12% за секунду от всех союзников
    const st = this.st; if (!st || st.over) return 0;
    n = Math.floor(+n);
    if (!Number.isFinite(n) || n <= 0) return 0;
    const max = st.bs.hp, now = Date.now(), w = st.allyWin || (st.allyWin = { t: now, n: 0 });
    n = Math.min(n, Math.ceil(max * 0.04));
    if (now - w.t > 1000) { w.t = now; w.n = 0; }
    if (w.n + n > max * 0.12) return 0;
    w.n += n;
    st.bossHp = Math.max(0, st.bossHp - n);
    const b = st.$('.raid-boss').getBoundingClientRect();
    this.float(`${n}`, b.left + b.width * (0.15 + Math.random() * 0.7), b.top + b.height * 0.55, 'ally');
    if (st.bossHp <= 0) this.finish(true);
    this.render();
    return n;
  },
  remoteState(hp, time) { // у гостя: состояние от хозяина
    const st = this.st; if (!st || st.over) return;
    if (!Number.isFinite(+hp) || !Number.isFinite(+time)) return; // сообщение из открытого канала — только числа
    st.bossHp = Math.max(+hp > 0 ? 1 : 0, Math.min(st.bossHp, +hp));
    st.time = +time;
    this.render();
  },
  remoteEnd(win) { const st = this.st; if (st && !st.over) { clearTimeout(st._wait); this.finish(win); } },
  renderAllies(list) {
    const st = this.st; if (!st || !st.coop) return;
    const box = st.$('.raid-allies'); if (!box) return;
    // список приходит по открытому каналу разлома — берём не больше 4 записей и только проверенные поля
    box.innerHTML = (Array.isArray(list) ? list.slice(0, 4) : []).filter(a => a && typeof a === 'object').map(a => `<span><i>${Art.avatar(a.look)}</i>${U.esc(String(a.name || '').slice(0, 20))} <b>${U.fmtNum(+a.n || 0)}</b></span>`).join('');
  },
  fast(x, y) {
    const st = this.st;
    if (!st || !st.running || st.over || st.cool > 0 || st.ko) return;
    const m = this.cur();
    st.cool = 0.32;
    st.energy = Math.min(100, st.energy + 6 * (m.energy || 1));
    Sfx.play('attack');
    const me = st.$('.raid-me'); me.classList.remove('atk'); void me.offsetWidth; me.classList.add('atk');
    this.hitBoss(this.dmg(m.atk, st.bs.def, 12, SP[m.sp.sid].el, st.s.el));
    this.render();
  },
  special() {
    const st = this.st;
    if (!st || !st.running || st.over || st.energy < 50 || st.ko) return;
    const m = this.cur(), el = SP[m.sp.sid].el;
    st.energy -= 50;
    Sfx.element(el); U.vibrate(60);
    st.root.classList.remove('flash'); void st.root.offsetWidth; st.root.classList.add('flash');
    st.root.style.setProperty('--fx', ELEMENTS[el].color);
    this.float(ELEMENTS[el].charge, window.innerWidth / 2, window.innerHeight * 0.52, 'move');
    this.hitBoss(this.dmg(m.atk, st.bs.def, 75, el, st.s.el), true);
    this.render();
  },
  dodge(dir) {
    const st = this.st;
    if (!st || !st.running || st.over) return;
    st.dodgeT = 0.6;
    const me = st.$('.raid-me');
    me.style.setProperty('--dx', dir * 70 + 'px');
    me.classList.remove('dodge'); void me.offsetWidth; me.classList.add('dodge');
  },
  async water() {
    const st = this.st;
    if (!st || !st.running || st.over || st.drinking) return;
    const m = this.cur();
    if (st.waters >= 3) { UI.toast(ru`За бой можно выпить не больше 3 флаконов`); return; }
    if (m.cur >= m.lim) { UI.toast(m.lim < m.max ? ru`Дух устал — выше не поднять, нужен отдых` : ru`Дух и так полон сил`); return; }
    if (!(S.d.items.water > 0)) { UI.toast(ru`Живой воды нет`); return; }
    st.drinking = true;
    const ok = await Game.try('water');
    st.drinking = false;
    if (!ok || this.st !== st || st.over) return;
    st.waters++;
    m.cur = Math.min(m.lim, m.cur + m.max / 2);
    Sfx.play('heal');
    st.$('.raid-water span').textContent = S.d.items.water || 0;
    this.render();
  },
  tick(dt) {
    const st = this.st;
    st.time -= dt; st.cool -= dt; st.dodgeT -= dt;
    if (st.time <= 0) { st.time = 0; this.render(); return this.finish(false); }
    if (st.ko) return this.render(); // свои духи без сил — смотрим, как бьются союзники
    if (st.tele > 0) {
      st.tele -= dt;
      if (st.tele <= 0) this.bossStrike();
    } else {
      st.nextAtk -= dt;
      if (st.nextAtk <= 0) {
        st.tele = 0.9;
        st.$('.raid-boss').classList.add('charging');
        Sfx.play('warn'); U.vibrate(25);
      }
    }
    this.render();
  },
  bossStrike() {
    const st = this.st, m = this.cur();
    st.$('.raid-boss').classList.remove('charging');
    st.nextAtk = 2.2 + Math.random() * 1.4;
    let n = this.dmg(st.bs.atk, m.def, st.bs.pw, st.s.el, SP[m.sp.sid].el);
    const dodged = st.dodgeT > 0;
    if (dodged) n = Math.max(1, Math.floor(n * 0.2));
    m.cur = Math.max(0, m.cur - n);
    const me = st.$('.raid-me').getBoundingClientRect();
    this.float(dodged ? ru`Уклон! −${n}` : `−${n}`, me.left + me.width / 2, me.top + 10, dodged ? 'dodged' : 'hurt');
    if (!dodged) {
      Sfx.play('hurt'); U.vibrate(80);
      st.root.classList.remove('shake'); void st.root.offsetWidth; st.root.classList.add('shake');
    }
    if (m.cur <= 0) {
      const next = st.team.findIndex(x => x.cur > 0);
      if (next < 0) {
        this.render();
        if (st.coop && !st.coop.solo) {
          st.ko = true;
          st.$('.raid-boss').classList.remove('charging');
          st.root.appendChild(U.el(`<div class="raid-ko">${ru`Твои духи без сил.<br>Союзники ещё сражаются!`}</div>`));
          return;
        }
        return this.finish(false);
      }
      st.idx = next; st.energy = 0;
      this.showMine();
    }
    this.render();
  },
  render() {
    const st = this.st; if (!st) return;
    const m = this.cur();
    st.$('.raid-timer').textContent = Math.ceil(st.time);
    st.$('.bar.boss i').style.width = (st.bossHp / st.bs.hp * 100) + '%';
    st.$('.bar.hp i').style.width = (m.cur / m.max * 100) + '%';
    const circ = 2 * Math.PI * 44;
    const f = st.$('.raid-special .fill');
    f.style.strokeDasharray = circ;
    f.style.strokeDashoffset = circ * (1 - Math.min(1, st.energy / 50));
    st.$('.raid-special').classList.toggle('ready', st.energy >= 50);
  },
  async finish(win) {
    const st = this.st;
    if (!st || st.over) return;
    st.over = true;
    clearTimeout(st._wait);
    if (st.coop && st.coop.host) Coop.hostEnd(win);
    await U.wait(400);
    // итог боя проверяет сервер: победа засчитывается, если команда могла нанести столько урона за это время
    let r = null;
    try { r = await Game.act('raidEnd', { win: !!win, hp: S.hpReport(st.team) }); } catch (e) { if (win) UI.toast(U.esc(e.message)); }
    if (this.st !== st) return;
    if (win && r && r.win) {
      Sfx.play('win'); U.vibrate([50, 50, 50, 50, 120]);
      const rw = r.rw, charms = r.charms, bonus = r.bonus, allies = r.allies;
      const res = U.el(`<div class="raid-result"><div class="res-card">
        <div class="res-title">${ru`Разлом закрыт!`}</div>
        <div class="res-art">${Art.spirit(st.s.id)}</div>
        <div class="res-rw">${rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${I18N.back(x.label)}</div>`).join('')}</div>
        <div class="res-note">${ru`Ослабленный ${st.s.name} остался в нашем мире. У тебя <b>${charms}</b> оберегов разлома${bonus ? ru` (+${bonus} за скорость)` : ''}${allies ? ru` (+${allies * 2} за союзников)` : ''}.`}</div>
        <button class="btn primary wide">${ru`Ловить!`}</button></div></div>`);
      res.querySelector('button').onclick = () => {
        this.close();
        Encounter.start({ mode: 'raid', seed: st.r.id });
      };
      st.root.appendChild(res);
    } else if (win) {
      // сервер не засчитал победу (нет связи или неправдоподобный бой)
      const res = U.el(`<div class="raid-result"><div class="res-card"><div class="res-title lose">${ru`Победа не засчитана`}</div>
        <div class="res-note">${ru`Сервер не подтвердил этот бой. Проверь интернет и попробуй снова — разлом открыт до конца часа.`}</div>
        <button class="btn wide">${ru`На карту`}</button></div></div>`);
      res.querySelector('button').onclick = () => this.close();
      st.root.appendChild(res);
    } else {
      Sfx.play('lose');
      const res = U.el(`<div class="raid-result"><div class="res-card">
        <div class="res-title lose">${ru`Разлом устоял`}</div>
        <div class="res-art dim">${Art.spirit(st.s.id)}</div>
        <div class="res-note">${ru`Осталось сил у босса: ${Math.round(st.bossHp / st.bs.hp * 100)}%. Усиль духов, возьми стихию-противника и попробуй снова — разлом открыт до конца часа.`}</div>
        <button class="btn wide">${ru`На карту`}</button></div></div>`);
      res.querySelector('button').onclick = () => this.close();
      st.root.appendChild(res);
    }
    UI.refreshHud();
  },
  quit() {
    const st = this.st; if (!st) return;
    if (st.over) return this.close();
    UI.confirm(ru`Покинуть битву?`, ru`Прогресс боя будет потерян.`, ru`Покинуть`, () => this.close(), ru`Остаться`, true); // 4.25: потеря боя — красной кнопкой
  },
  close() {
    const st = this.st; if (!st) return;
    if (!st.over) Game.act('raidEnd', { win: false, hp: S.hpReport(st.team) }).catch(() => {}); // вышел из боя
    st.over = true;
    st.root.remove();
    this.st = null;
    UI.popLayer();
    if (st.coop) Coop.leave();
    Music.play('map');
    MapView.refresh();
    UI.flushLevelUps();
  },
};
