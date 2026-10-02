'use strict';
/* Святилища Ордена: поединок 3 на 3 с хранителем.
   Тап — быстрая атака (копит энергию), «Приём» — особая атака с мини-игрой,
   у каждой стороны 2 щита, духа можно сменить (перезарядка 25 с). */

const Duel = {
  st: null,
  FAST: 6, CHARGE: 65, COST: 50, TIME: 180, HPX: 3, SWITCH_CD: 25,
  // соперники без уровня Святилища: скорость ударов и щиты (4.3: те же числа проверяет сервер — Rules.duelTimeoutOk)
  // 4.16: прислужник Нави — pow: сила его омрачённых духов от силы духов игрока (W.grunt), темп ударов 0,52 (был 0,75,
  // вторжения выигрывались 99 из 100); ориентир — ~70% побед
  FOE: { invasion: { speed: 0.52, shield: 0.5, pow: 1.2 }, spar: { speed: 0.72, shield: 0.6 } },

  shieldSvg: '<svg viewBox="0 0 24 24" class="shd"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#5eead4" stroke="#0f766e" stroke-width="1.5"/></svg>',

  open(e) {
    // 4.16: вольное Святилище кланы не держат; защитники, чей срок вышел, ушли; уставшие — слабее (Rules.HOLD)
    const free = Rules.shrineFree(e.id), now = U.now();
    const holders0 = !free && Clans.info(e.id) ? Clans.info(e.id).holders.filter(h => h.sp && SP[h.sp.sid] && Rules.holdFresh(h, now)) : [];
    const hold = holders0.length ? Clans.info(e.id) : null, mine = !!(hold && S.d.clan && hold.clan === S.d.clan);
    const g = W.guardian(e), T = SHRINE_TIERS[e.tier], mul = Ev.duelMul(), t = e.tier, myth = e.myth || 'slavic';
    let team = S.team();
    const holders = holders0.map(h => ({ ...h, sp: Rules.holdSpirit(h.sp, h.t, now) }));
    const canClan = !S.d.clan && S.d.level >= CLAN_LEVEL;
    // 5.1.29: в композиции Разлома (Raid.open): сверху святилище с медальоном хранителя (у занятого — клана), справа ступень,
    // хранитель, сила его духов, звание и место; вкладки «Бой» (команда, кнопки — закреплены внизу), «Хранитель», «Награда»
    const power = list => list.reduce((a, x) => a + S.power(x), 0);
    const foeTeam = hold ? holders.map(h => h.sp) : g.team;
    const row = (k, v) => `<div class="dt-row"><span>${k}</span><b>${v}</b></div>`;
    const it = (k, n) => `<span class="cur">${Art.item(k)}</span> ${n}`;
    const photo = Poi.photoUrl(e.photo);
    const since = hold && hold.since && !isNaN(new Date(hold.since)) ? new Date(hold.since).toLocaleDateString(I18N.locale) : '';
    const held = hold ? (since ? ru`держит Святилище с ${since} · защитников: ${holders.length} из ${HOLD_MAX}` : ru`держит Святилище · защитников: ${holders.length} из ${HOLD_MAX}`) : '';
    const ownMyth = !free && S.d.clan && myth === S.d.clan ? `<div class="rift-tip own-myth" style="--cc:${CLANS[S.d.clan].color}">${ru`Святилище мифологии твоего клана: защитник здесь приносит дань ${Clans.mythX()}.`}</div>` : '';
    let fight, acts = '';
    if (mine) {
      fight = `<div class="rift-tip">${ru`Святилище держит твой клан. Поставь сюда своего защитника — и получай дань каждый день.`}</div>${ownMyth}`;
      acts = `<button class="btn primary wide defend-go" ${holders.length >= HOLD_MAX ? 'disabled' : ''}>${ru`Поставить защитника`}</button>`;
    } else if (e.won) {
      fight = `<div class="rift-done">${ru`Сегодня ты уже победил здесь.`}${S.d.clan ? '' : ` ${ru`Завтра будет новый бой.`}`}</div>`;
      if (S.d.clan && !hold && !free) acts = `<button class="btn primary wide defend-go">${ru`Поставить защитника`}</button>`;
    } else {
      fight = `
        <div class="pf-mh lg2-th"><span>${ru`Твоя команда`}</span><b class="rift2-pw">${team.length ? ru`сила ${U.fmtNum(power(team))}` : ''}</b><button class="lg2-edit team-edit">${ru`Изменить`}</button></div>
        <div class="lg2-team rift-team tm-my">${UI.teamCards(team)}</div>
        ${hold ? `<div class="rift-tip">${ru`Победа освободит Святилище от защитников.`}</div>` : ''}${ownMyth}
        ${Rules.dayLine(S.d, 'duels', ru`Побед в Святилищах`)}`;
      acts = `<button class="btn primary wide duel-go" ${team.length ? '' : 'disabled'}>${ru`Бросить вызов`}</button>`;
    }
    if (canClan) acts += `<button class="btn ghost wide clan-go">${ru`Выбрать клан`}</button>`;
    const html = `
      <div class="det det2 rift2 shrine2 t${t}">
        <div class="dt-hero">
          <div class="det-art rift2-art shrine2-art">
            ${photo ? `<div class="shrine2-photo" style="background-image:url('${photo}')"></div>` : `<div class="rift-portal">${Art.shrineIcon(t, e.won, e.myth)}</div>`}
            <div class="shrine2-guard${hold ? ' clan' : ''}"${hold ? ` style="--cc:${CLANS[hold.clan].color}"` : ''}>${Art.guardian(hold ? CLANS[hold.clan].color : g.color)}</div>
          </div>
          <div class="dt-info">
            <div class="det-hp">${ru`Святилище`} <span class="stars">${'★'.repeat(t)}</span></div>
            <div class="rift2-name">${hold ? CLANS[hold.clan].name : g.name}</div>
            <div class="det-power"><small>${hold ? ru`СИЛА ЗАЩИТНИКОВ` : ru`СИЛА ХРАНИТЕЛЯ`}</small><b>${U.fmtNum(power(foeTeam))}</b></div>
            <div class="rift2-left">${hold ? held : ru`Хранитель · ${g.title}`}</div>
            <div class="rift2-place">${UI.I.pin}${U.esc(e.name)}</div>
            <div class="rift2-place place-kind">${MYTH_PLACES[myth].shrineOf(e.god)}${free ? ' · ' + ru`вольное: кланы его не держат` : ''}</div>
          </div>
        </div>
        <div class="seg dt-tabs"><button data-tab="fight" class="on">${ru`Бой`}</button><button data-tab="guard">${ru`Хранитель`}</button><button data-tab="loot">${ru`Награда`}</button></div>
        <div class="dt-panel">
          <div class="dt-pane on" data-pane="fight">
            <div class="dt-scroll rift2-fight">${fight}</div>
            ${acts ? `<div class="rift2-acts">${acts}</div>` : ''}
          </div>
          <div class="dt-pane" data-pane="guard">
            <p class="det-desc place-desc">${MYTH_PLACES[myth].shrineDesc}</p>
            <div class="dt-scroll rift2-fight">
              <div class="pf-mh lg2-th"><span>${hold ? ru`Защитники` : ru`Духи хранителя`}</span><b class="rift2-pw">${ru`сила ${U.fmtNum(power(foeTeam))}`}</b></div>
              ${hold ? `<div class="holders">${holders.map(h => `<div class="mini">${Art.imgOf(h.sp)}<b>${S.power(h.sp)}</b><small>${U.esc(h.name || ru`Ловчий`)}</small></div>`).join('')}</div>`
                : `<div class="lg2-team">${UI.teamCards(g.team, true)}</div>`}
              ${hold ? `<p class="rift2-note">${Clans.badge(hold.clan, true)} ${held}</p>` : ''}
            </div>
          </div>
          <div class="dt-pane" data-pane="loot">
            <div class="dt-scroll dt-rows">
              ${row(ru`Опыт`, U.fmtNum(T.xp * mul))}
              ${row(ru`Искры`, it('sparks', U.fmtNum(T.sparks * mul)))}
              ${row(ru`Обереги`, [it('charm', 5 * mul), t >= 2 ? it('charm2', 3 * mul) : '', t === 3 ? it('charm3', 2 * mul) : ''].filter(Boolean).join(' · '))}
              ${row(ru`Припасы`, [t > 1 ? it('honey', (t - 1) * mul) : '', t < 3 ? it('herb', 1) : it('water', 1)].filter(Boolean).join(' · '))}
              ${S.ALATYR_DROP.duel[t] ? row(ru`Осколок Алатыря`, ru`шанс ${Math.round(S.ALATYR_DROP.duel[t] * 100)}%`) : ''}
              ${row(ru`Амулет`, ru`шанс ${4 * t}%`)}
              <p class="rift2-note">${ru`Победить хранителя здесь можно раз в день.`}${mul > 1 ? ` ${ru`(Неделя поединков ×2)`}` : ''}</p>
            </div>
          </div>
        </div>
      </div>`;
    const scr = UI.screen(MYTH_PLACES[myth].shrine, html, 'shrine-screen det-screen'); // 4.28: своё у каждой мифологии
    scr.querySelector('.dt-tabs').addEventListener('click', ev => {
      const b = ev.target.closest('[data-tab]'); if (!b) return;
      Sfx.play('tap');
      U.$$('.dt-tabs button', scr).forEach(x => x.classList.toggle('on', x === b));
      U.$$('.dt-pane', scr).forEach(p => p.classList.toggle('on', p.dataset.pane === b.dataset.tab));
    });
    const go = scr.querySelector('.duel-go');
    if (go) go.onclick = async () => {
      if (this.st || this._starting) return;
      this._starting = true;
      const r = await Game.try('duelStart', { shrine: { id: e.id, lat: e.lat, lng: e.lng, name: e.name } });
      this._starting = false;
      if (!r) return;
      UI.closeScreen(scr);
      // защитники клана — вместо хранителя
      const foe = r.foe ? { name: CLANS[r.clan].name, color: CLANS[r.clan].color, title: ru`Защитники Святилища`, team: r.foe } : g;
      // 4.16: темп хранителя — свой (W.foeSpeed), у защитников клана — обычный для ступени
      this.start({ ...e, kind: 'shrine', held: r.clan || null, T: r.foe ? T : { ...T, speed: g.speed } }, foe, S.team());
    };
    const def = scr.querySelector('.defend-go');
    if (def) def.onclick = () => Clans.defend(e, () => { UI.closeScreen(scr); this.open(W.shrineFor(e, e.d)); });
    const cg = scr.querySelector('.clan-go');
    if (cg) cg.onclick = () => Clans.choose(() => { UI.closeScreen(scr); this.open(W.shrineFor(e, e.d)); });
    // 5.1.5: «Изменить», карточка духа и пустое место — выбор команды
    scr.addEventListener('click', ev => {
      if (!ev.target.closest('.team-edit, .team-slot')) return;
      UI.pickTeam(() => {
        team = S.team();
        const box = scr.querySelector('.tm-my'); if (box) box.innerHTML = UI.teamCards(team);
        const pw = scr.querySelector('[data-pane="fight"] .rift2-pw'); if (pw) pw.textContent = team.length ? ru`сила ${U.fmtNum(power(team))}` : '';
        const b = scr.querySelector('.duel-go'); if (b) b.disabled = !team.length;
      });
    });
    Clans.refresh(); // сводка могла устареть
  },

  // Захваченный источник: поединок с прислужником Нави
  openInvasion(e) {
    // 4.15.1: в композиции карточки духа — сверху захваченный источник в тёмном круге Нави, справа «Захвачен Навью»,
    // сила отряда, прислужник и слабость отряда; ниже — омрачённые духи против твоей команды, внизу — «Сразиться»
    const g = W.grunt(e);
    const pw = t => t.reduce((a, x) => a + S.power(x), 0);
    const weak = ELEMENT_KEYS.filter(x => ELEMENTS[x].beats.includes(g.el));
    const scr = UI.screen(ru`Вторжение Нави`, `
      <div class="det det2 inv2 el-${g.el}">
        <div class="dt-hero">
          <div class="det-art inv2-art"><i class="inv2-mist"></i>${Art.springIcon(false, true)}</div>
          <div class="dt-info">
            <div class="det-hp inv2-place">${ru`Источник «${U.esc(e.name)}»`}</div>
            <div class="inv2-title">${ru`Захвачен Навью`}</div>
            <div class="det-power"><small>${ru`СИЛА ОТРЯДА`}</small><b>${U.fmtNum(pw(g.team))}</b></div>
            <div class="inv2-grunt"><span class="inv2-ava">${Art.guardian(g.color)}</span><span><b>${g.name}</b><small>${g.title}</small></span></div>
          </div>
        </div>
        <div class="inv2-quote">«${g.quote}»</div>
        <div class="dt-panel inv2-body"></div>
        <div class="inv2-foot"></div>
      </div>`, 'invasion-screen det-screen');
    const body = scr.querySelector('.inv2-body'), foot = scr.querySelector('.inv2-foot');
    const render = () => {
      const team = S.team(), ko = team.some(x => !S.alive(x)), mine = pw(team);
      const slots = UI.teamCards(team); // 5.1.5: три карточки в ряд, пустые места — «+ Выбрать духа»
      body.innerHTML = `
        <div class="pf-mh lg2-th"><span>${ru`Омрачённые духи`}</span><em class="inv2-weak">${ru`слабость`}${weak.map(x => `<i>${Art.elIcon(x, 15)} ${ELEMENTS[x].name}</i>`).join('')}</em></div>
        <div class="lg2-team">${UI.teamCards(g.team, 'inv2-dark')}</div>
        <div class="inv2-vs"><i></i><b>${mine >= pw(g.team) ? ru`силы на твоей стороне` : ru`отряд сильнее — бей в слабость`}</b><i></i></div>
        <div class="pf-mh lg2-th"><span>${ru`Твоя команда`}</span>${mine ? `<b>${ru`сила ${U.fmtNum(mine)}`}</b>` : ''}<button class="lg2-edit team-edit">${ru`Изменить`}</button></div>
        <div class="lg2-team">${slots}</div>`;
      foot.innerHTML = `
        <div class="lg2-rule">${ru`Победа освободит источник и позволит спасти одного из омрачённых духов.`}</div>
        ${Rules.dayLine(S.d, 'invasions', ru`Вторжений отбито`)}
        <button class="btn primary wide duel-go" ${team.length && !ko ? '' : 'disabled'}>${ko ? ru`В команде дух без сил` : team.length ? ru`Сразиться` : ru`Нужна команда`}</button>`;
    };
    render();
    scr.addEventListener('click', async e2 => {
      if (e2.target.closest('.team-edit, .team-slot')) { UI.pickTeam(() => { if (scr.isConnected) render(); }); return; }
      if (!e2.target.closest('.duel-go')) return;
      if (!await this.begin('invStart', { spring: { id: e.id, lat: e.lat, lng: e.lng, name: e.name } })) return;
      UI.closeScreen(scr);
      this.start({ ...e, kind: 'invasion', tier: 1, T: { ...this.FOE.invasion, speed: g.speed } }, g, S.team());
    });
  },

  // Поединок с другом: его сильнейшие духи под управлением игры (команду присылает сервер)
  openSpar(f, top) {
    let team = S.team();
    const today = f.spar === U.today();
    const html = `
      <div class="shrine-view spar">
        <div class="guard"><div class="guard-ava">${Art.avatar(f.look || undefined)}</div><div><b>${U.esc(f.name)}</b><small>${ru`Дружеский поединок`}</small></div></div>
        <div class="rift-team-title">${ru`Сильнейшие духи друга`}</div>
        <div class="lg2-team tm-row">${UI.teamCards(top, true)}</div>
        <div class="rift-team-title">${ru`Твоя команда`} <button class="btn small ghost team-edit">${ru`Изменить`}</button></div>
        <div class="lg2-team tm-row tm-my">${UI.teamCards(team)}</div>
        <div class="rift-tip">${today ? ru`Награда за сегодня уже получена — сейчас это тренировка (+100 опыта за победу).` : ru`Награда за первую победу за день: 800 опыта, ✦ 500, обереги и мёд, +1 ★ дружбы.`}</div>
        <button class="btn primary wide duel-go" ${team.length ? '' : 'disabled'}>${ru`Сразиться`}</button>
      </div>`;
    const scr = UI.screen(ru`Поединок с другом`, html, 'shrine-screen');
    scr.querySelector('.duel-go').onclick = async () => {
      if (this.st || this._starting) return;
      this._starting = true;
      const r = await Game.try('sparStart', { pid: f.id });
      this._starting = false;
      if (!r) return;
      UI.closeScreen(scr);
      const color = (r.look && r.look.cloak) || GUARD_COLORS[Math.floor(U.h(f.id) * GUARD_COLORS.length)];
      this.start({ kind: 'spar', name: f.name, T: this.FOE.spar }, { name: U.esc(r.name), color, team: r.foe }, S.team());
    };
    scr.addEventListener('click', ev => { // 5.1.5: «Изменить», карточка духа и пустое место — выбор команды
      if (!ev.target.closest('.team-edit, .team-slot')) return;
      UI.pickTeam(() => {
        team = S.team();
        scr.querySelector('.tm-my').innerHTML = UI.teamCards(team);
        scr.querySelector('.duel-go').disabled = !team.length;
      });
    });
  },

  // Начало боя отмечает сервер (он же проверит правдоподобие победы в конце)
  async begin(type, args) {
    if (this.st || this._starting) return false;
    this._starting = true;
    const ok = await Game.try(type, args);
    this._starting = false;
    return !!ok;
  },
  endType(kind) { return kind === 'invasion' ? 'invEnd' : kind === 'spar' ? 'sparEnd' : 'duelEnd'; },

  // 4.15: боец выходит с тем здоровьем, что есть у духа (раны общие на всю игру); в поединке с другом — с полным
  fighter(sp, full) {
    const x = S.battle(sp), max = x.hp * this.HPX;
    return { sp, atk: x.atk, def: x.def, max, cur: Math.max(1, Math.round(max * (full ? 1 : S.hpNow(sp)))), energy: 0, emul: x.energy, el: SP[sp.sid].el, power: x.power };
  },

  start(e, g, team) {
    const root = U.el(`
      <div class="raid duel">
        <div class="raid-bg duel-bg"></div>
        <div class="raid-top duel-top">
          <div class="raid-timer">${this.TIME}</div>
          <div class="duel-foe-hud">
            <div class="duel-guard"><div class="guard-ava sm">${Art.guardian(g.color)}</div><b>${g.name}</b></div>
            <div class="duel-name foe-name"></div>
            <div class="bar boss"><i></i></div>
            <div class="duel-meta"><span class="shields foe-sh"></span><span class="raid-team foe-dots"></span></div>
          </div>
        </div>
        <div class="duel-foe"></div>
        <div class="raid-me duel-me"></div>
        <div class="raid-fx"></div>
        <div class="raid-hud">
          <div class="raid-mname"></div>
          <div class="bar hp"><i></i></div>
          <div class="duel-meta"><span class="shields my-sh"></span><span class="raid-team my-dots"></span></div>
        </div>
        <div class="raid-ctrl">
          <button class="duel-switch"><span>${ru`Смена`}</span><em></em></button>
          <button class="duel-special2 hidden"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fill"/></svg><span></span></button>
          <button class="raid-special"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fill"/></svg><span>${ru`Приём`}</span></button>
          <div class="duel-energy"></div>
        </div>
        <div class="raid-hint">${ru`Тапай — быстрая атака, она копит энергию.<br>Полная шкала — жми «Приём». Щиты берегут от приёмов хранителя.`}</div>
        <div class="duel-ov hidden"></div>
        <div class="raid-count">3</div>
      </div>`);
    document.body.appendChild(root);
    Music.play('map'); // 4.8.1: в боях — та же мелодия карты
    const $ = s => root.querySelector(s);
    const st = this.st = {
      e, g, T: e.T || SHRINE_TIERS[e.tier], root, $, time: this.TIME, paused: true, over: false,
      me: { team: team.map(sp => this.fighter(sp, e.kind === 'spar')), idx: 0, shields: 2, busy: 0, cd: 0 },
      foe: { team: g.team.map(sp => this.fighter(sp)), idx: 0, shields: 2, busy: 1.5 },
    };
    UI.pushLayer(() => this.quit());

    let sid = null;
    root.addEventListener('pointerdown', ev => {
      if (ev.target.closest('button') || ev.target.closest('.duel-ov')) return;
      sid = ev.pointerId;
    });
    root.addEventListener('pointerup', ev => {
      if (ev.pointerId !== sid) return;
      sid = null;
      this.fast();
    });
    $('.raid-special').onclick = () => this.myCharge('charge');
    $('.duel-special2').onclick = () => this.myCharge('charge2');
    $('.duel-switch').onclick = () => this.switchMenu(false);

    this.showSide('me'); this.showSide('foe');
    this.render();
    (async () => {
      for (let i = 3; i > 0; i--) { $('.raid-count').textContent = i; Sfx.play('count'); await U.wait(650); if (this.st !== st) return; }
      $('.raid-count').textContent = ru`Бой!`;
      await U.wait(450);
      $('.raid-count').remove();
      st.paused = false;
      let last = performance.now();
      const loop = t => { if (this.st !== st || st.over) return; this.tick(Math.min(0.05, (t - last) / 1000)); last = t; requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    })();
  },

  cur(side) { const s = this.st[side]; return s.team[s.idx]; },
  showSide(side) {
    const st = this.st, f = this.cur(side);
    const box = st.$(side === 'me' ? '.duel-me' : '.duel-foe');
    box.innerHTML = Art.of(f.sp);
    box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap');
    const label = `${Art.elIcon(f.el, 16)} ${U.esc(f.sp.nick || SP[f.sp.sid].name)} <small>${ru`СИЛА ${f.power}`}</small>`;
    st.$(side === 'me' ? '.raid-mname' : '.foe-name').innerHTML = label;
  },

  tick(dt) {
    const st = this.st;
    if (st.paused || st.over) return;
    st.time -= dt; st.me.busy -= dt; st.me.cd -= dt; st.foe.busy -= dt;
    if (st.time <= 0) { st.time = 0; return this.finish(this.hpShare('me') >= this.hpShare('foe')); }
    if (st.foe.busy <= 0) {
      const f = this.cur('foe'), m = this.cur('me');
      if (f.energy >= this.COST && (Math.random() < 0.45 || m.cur < m.max * 0.35)) this.foeCharge();
      else { this.foeFast(); st.foe.busy = st.T.speed + Math.random() * 0.25; }
    }
    this.render();
  },
  hpShare(side) { const t = this.st[side].team; return t.reduce((a, f) => a + Math.max(0, f.cur) / f.max, 0) / t.length; },

  hit(side, n, cls) {
    const st = this.st, box = st.$(side === 'me' ? '.duel-me' : '.duel-foe');
    box.classList.remove('hit'); void box.offsetWidth; box.classList.add('hit');
    const r = box.getBoundingClientRect();
    const fl = U.el(`<div class="dmg ${cls || ''}" style="left:${r.left + r.width * (0.3 + Math.random() * 0.4)}px;top:${r.top + r.height * 0.25}px">${n}</div>`);
    st.$('.raid-fx').appendChild(fl);
    setTimeout(() => fl.remove(), 900);
  },

  fast() {
    const st = this.st;
    if (!st || st.paused || st.over || st.me.busy > 0) return;
    const m = this.cur('me'), f = this.cur('foe');
    st.me.busy = 0.5;
    m.energy = Math.min(100, m.energy + 7 * (m.emul || 1));
    const n = Raid.dmg(m.atk, f.def, this.FAST, m.el, f.el);
    f.cur -= n;
    Sfx.play('attack');
    const me = st.$('.duel-me'); me.classList.remove('atk'); void me.offsetWidth; me.classList.add('atk');
    this.hit('foe', n);
    if (f.cur <= 0) this.faint('foe');
    this.render();
  },
  foeFast() {
    const st = this.st, m = this.cur('me'), f = this.cur('foe');
    f.energy = Math.min(100, f.energy + 7);
    const n = Raid.dmg(f.atk, m.def, this.FAST, f.el, m.el);
    m.cur -= n;
    this.hit('me', `−${n}`, 'hurt');
    if (m.cur <= 0) this.faint('me');
  },

  overlay(html) {
    const ov = this.st.$('.duel-ov');
    ov.innerHTML = html; ov.classList.remove('hidden');
    return ov;
  },
  closeOverlay() { const ov = this.st.$('.duel-ov'); ov.classList.add('hidden'); ov.innerHTML = ''; },

  // Особый приём игрока: 2,2 секунды тапай по сфере — чем больше тапов, тем сильнее удар
  async myCharge(kind = 'charge') {
    const st = this.st;
    if (!st || st.paused || st.over) return;
    const m = this.cur('me'), f = this.cur('foe');
    const mv = MOVES[kind];
    if (kind === 'charge2' && !m.sp.move2) return;
    if (m.energy < mv.cost) { UI.toast(ru`Мало энергии — атакуй тапами`); return; }
    m.energy -= mv.cost;
    st.paused = true;
    Sfx.play('special');
    const col = ELEMENTS[m.el].color;
    const ov = this.overlay(`<div class="charge-mini"><div class="charge-title">${ELEMENTS[m.el][kind]}</div><button class="charge-orb" style="--c:${col}"><span>${ru`Тапай!`}</span></button><div class="pbar"><i></i></div></div>`);
    let taps = 0;
    const orb = ov.querySelector('.charge-orb'), bar = ov.querySelector('.pbar i');
    orb.addEventListener('pointerdown', () => {
      taps++; Sfx.play('charge', { rate: 1 + Math.min(taps, 20) * 0.03 }); U.vibrate(8);
      orb.style.transform = `scale(${1 + Math.min(taps, 14) * 0.035})`;
      bar.style.width = Math.min(100, taps / 12 * 100) + '%';
    });
    await U.wait(2200);
    if (this.st !== st) return;
    const mult = 0.55 + 0.45 * Math.min(1, taps / 12);
    this.closeOverlay();
    const T = st.T;
    const shield = st.foe.shields > 0 && Math.random() < T.shield * (f.cur < f.max * 0.5 ? 1.2 : 0.9);
    let n;
    if (shield) {
      st.foe.shields--; n = 1;
      this.hit('foe', ru`Щит!`, 'dodged');
    } else {
      n = Raid.dmg(m.atk, f.def, mv.power * mult, m.el, f.el);
      st.root.style.setProperty('--fx', col);
      st.root.classList.remove('flash'); void st.root.offsetWidth; st.root.classList.add('flash');
      this.hit('foe', n, 'big');
      Sfx.element(m.el);
      U.vibrate(60);
    }
    f.cur -= n;
    st.paused = false;
    if (f.cur <= 0) this.faint('foe');
    this.render();
  },

  // Особый приём хранителя: 2,5 секунды на решение — ставить щит или нет
  foeCharge() {
    const st = this.st, f = this.cur('foe');
    f.energy -= this.COST;
    st.paused = true;
    Sfx.play('warn'); U.vibrate([30, 40, 30]);
    const has = st.me.shields > 0;
    const ov = this.overlay(`<div class="shield-q">
      <div class="charge-title">${st.g.name}: «${ELEMENTS[f.el].charge}»!</div>
      <div class="shield-timer"><i></i></div>
      <div class="shield-btns">
        <button class="btn primary sh-yes" ${has ? '' : 'disabled'}>${this.shieldSvg} ${ru`Щит (${st.me.shields})`}</button>
        <button class="btn sh-no">${ru`Принять удар`}</button>
      </div></div>`);
    let done = false;
    const resolve = useShield => {
      if (done || this.st !== st) return;
      done = true;
      this.closeOverlay();
      const m = this.cur('me');
      let n;
      if (useShield && st.me.shields > 0) { st.me.shields--; n = 1; this.hit('me', ru`Щит!`, 'dodged'); Sfx.play('shield'); }
      else {
        n = Raid.dmg(f.atk, m.def, this.CHARGE, f.el, m.el);
        this.hit('me', `−${n}`, 'hurt');
        Sfx.play('hurt'); Sfx.element(f.el, true); U.vibrate(90);
        st.root.classList.remove('shake'); void st.root.offsetWidth; st.root.classList.add('shake');
      }
      m.cur -= n;
      st.foe.busy = st.T.speed;
      st.paused = false;
      if (m.cur <= 0) this.faint('me');
      this.render();
    };
    ov.querySelector('.sh-yes').onclick = () => resolve(true);
    ov.querySelector('.sh-no').onclick = () => resolve(false);
    setTimeout(() => resolve(false), 2500);
  },

  faint(side) {
    const st = this.st, s = st[side];
    const next = s.team.findIndex(x => x.cur > 0);
    if (next < 0) return this.finish(side === 'foe');
    if (side === 'foe') {
      st.paused = true;
      setTimeout(() => {
        if (this.st !== st || st.over) return;
        s.idx = next; s.busy = 1.2;
        this.showSide('foe');
        UI.toast(ru`${st.g.name} призывает: ${SP[this.cur('foe').sp.sid].name}`);
        st.paused = false;
        this.render();
      }, 900);
    } else {
      this.switchMenu(true);
    }
    this.render();
  },

  // Смена духа: добровольно (с перезарядкой) или после поражения текущего
  switchMenu(forced) {
    const st = this.st;
    if (!st || st.over || (st.paused && !forced)) return;
    if (!forced && st.me.cd > 0) { UI.toast(ru`Смена будет доступна через ${Math.ceil(st.me.cd)} с`); return; }
    const opts = st.me.team.map((f, i) => ({ f, i })).filter(x => x.f.cur > 0 && x.i !== st.me.idx);
    if (!opts.length) { if (!forced) UI.toast(ru`Некого выпустить`); return; }
    st.paused = true;
    const ov = this.overlay(`<div class="switch-q"><div class="charge-title">${forced ? ru`Дух без сил! Кого выпустить?` : ru`Сменить духа`}</div>
      <div class="rift-team">${opts.map(x => `<button class="mini" data-i="${x.i}">${Art.of(x.f.sp)}<b>${Math.round(x.f.cur / x.f.max * 100)}%</b></button>`).join('')}</div>
      ${forced ? '' : `<button class="btn ghost sw-cancel">${ru`Отмена`}</button>`}</div>`);
    const pick = i => {
      if (this.st !== st) return;
      clearTimeout(timer);
      this.closeOverlay();
      st.me.idx = i;
      if (!forced) st.me.cd = this.SWITCH_CD;
      st.me.busy = 0.3;
      this.showSide('me');
      st.paused = false;
      this.render();
    };
    ov.querySelectorAll('[data-i]').forEach(b => b.onclick = () => pick(+b.dataset.i));
    const c = ov.querySelector('.sw-cancel');
    if (c) c.onclick = () => { clearTimeout(timer); this.closeOverlay(); st.paused = false; };
    const timer = forced ? setTimeout(() => pick(opts[0].i), 6000) : null;
  },

  render() {
    const st = this.st; if (!st) return;
    const m = this.cur('me'), f = this.cur('foe');
    st.$('.raid-timer').textContent = Math.ceil(st.time);
    st.$('.bar.boss i').style.width = Math.max(0, f.cur / f.max * 100) + '%';
    st.$('.bar.hp i').style.width = Math.max(0, m.cur / m.max * 100) + '%';
    const sh = n => this.shieldSvg.repeat(n) + '<i class="shd-empty"></i>'.repeat(2 - n);
    st.$('.my-sh').innerHTML = sh(st.me.shields);
    st.$('.foe-sh').innerHTML = sh(st.foe.shields);
    const dots = s => st[s].team.map((x, i) => `<i class="${x.cur <= 0 ? 'dead' : i === st[s].idx ? 'on' : ''}"></i>`).join('');
    st.$('.my-dots').innerHTML = dots('me');
    st.$('.foe-dots').innerHTML = dots('foe');
    const circ = 2 * Math.PI * 44, fill = st.$('.raid-special .fill');
    fill.style.strokeDasharray = circ;
    fill.style.strokeDashoffset = circ * (1 - Math.min(1, m.energy / this.COST));
    fill.style.stroke = ELEMENTS[m.el].color;
    st.$('.raid-special').classList.toggle('ready', m.energy >= this.COST);
    // второй приём (если выучен): дешевле, слабее
    const b2 = st.$('.duel-special2');
    b2.classList.toggle('hidden', !m.sp.move2);
    if (m.sp.move2) {
      const f2 = b2.querySelector('.fill');
      f2.style.strokeDasharray = circ;
      f2.style.strokeDashoffset = circ * (1 - Math.min(1, m.energy / MOVES.charge2.cost));
      f2.style.stroke = ELEMENTS[m.el].color;
      b2.classList.toggle('ready', m.energy >= MOVES.charge2.cost);
      b2.querySelector('span').textContent = ELEMENTS[m.el].charge2;
    }
    st.$('.duel-energy').textContent = `⚡ ${Math.floor(m.energy)}`;
    const sw = st.$('.duel-switch');
    sw.classList.toggle('cool', st.me.cd > 0);
    sw.querySelector('em').textContent = st.me.cd > 0 ? Math.ceil(st.me.cd) : '';
  },

  async finish(win) {
    const st = this.st;
    if (!st || st.over) return;
    st.over = true;
    this.closeOverlay();
    await U.wait(500);
    if (this.st !== st) return;
    let html;
    // итог боя проверяет сервер: победа засчитывается, если команда могла нанести столько урона за это время
    let r = null;
    try { r = await Game.act(this.endType(st.e.kind), { win: !!win, hp: S.hpReport(st.me.team) }); } catch (e) { if (win) UI.toast(U.esc(e.message)); }
    if (this.st !== st) return;
    if (win && !(r && r.win)) {
      html = `<div class="res-title lose">${ru`Победа не засчитана`}</div>
        <div class="res-note">${ru`Сервер не подтвердил этот бой. Проверь интернет и попробуй снова.`}</div>`;
      const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn wide">${ru`На карту`}</button></div></div>`);
      res.querySelector('button').onclick = () => this.close();
      st.root.appendChild(res);
      return;
    }
    if (st.e.kind === 'invasion') return this.finishInvasion(win, r);
    if (st.e.kind === 'spar') return this.finishSpar(win, r);
    if (win) {
      Sfx.play('win'); U.vibrate([50, 50, 50, 50, 120]);
      const rw = r.rw;
      const note = r.clan
        ? (r.freed ? ru`Защитники «${CLANS[r.clan].name}» отступили — Святилище «${U.esc(st.e.name)}» свободно!` : ru`Победа засчитана, но пока шёл бой, в Святилище сменились защитники.`)
        : ru`«Достойно, Ловчий», — ${st.g.name} склоняет голову. Святилище «${U.esc(st.e.name)}» освящено тобой до конца дня.`;
      const canDefend = S.d.clan && (!r.clan || r.freed);
      html = `<div class="res-title">${ru`Победа!`}</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(st.g.color)}</div></div>
        <div class="res-note">${note}${canDefend ? ` ${ru`Поставь своего защитника — и Святилище перейдёт твоему клану.`}` : ''}</div>
        <div class="res-rw">${rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${I18N.back(x.label)}</div>`).join('')}</div>
        ${canDefend ? `<button class="btn primary wide defend-now">${ru`Поставить защитника`}</button>` : ''}`;
      if (r.clan) Clans.refresh(true);
    } else {
      Sfx.play('lose');
      html = `<div class="res-title lose">${ru`Поражение`}</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(st.g.color)}</div></div>
        <div class="res-note">${ru`«Приходи, когда окрепнешь», — говорит ${st.g.name}. Попробуй другую команду: смотри на стихии хранителя и береги щиты для его приёмов.`}</div>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn ${html.includes('defend-now') ? 'ghost' : 'primary'} wide to-map">${ru`На карту`}</button></div></div>`);
    res.querySelector('.to-map').onclick = () => this.close();
    const dn = res.querySelector('.defend-now');
    if (dn) dn.onclick = () => { const e = st.e; this.close(); Clans.defend(e); };
    st.root.appendChild(res);
    UI.refreshHud();
  },
  finishSpar(win, r) {
    const st = this.st, g = st.g;
    let html;
    if (win) {
      Sfx.play('win'); U.vibrate([50, 50, 120]);
      html = `<div class="res-title">${ru`Победа!`}</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(g.color)}</div></div>
        <div class="res-note">${r.practice ? ru`Хорошая тренировка! Награда за поединок с ${g.name} сегодня уже получена.` : ru`${g.name} жмёт тебе руку: «Честный бой!» Дружба крепнет.`}</div>
        <div class="res-rw">${r.rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${I18N.back(x.label)}</div>`).join('')}${r.practice ? '' : `<div>${ru`<b>+1 ★</b> дружбы`}</div>`}</div>`;
    } else {
      Sfx.play('lose');
      html = `<div class="res-title lose">${ru`Поражение`}</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(g.color)}</div></div>
        <div class="res-note">${ru`Духи ${g.name} оказались сильнее. Подбери команду против их стихий и попробуй снова — поединки с другом не ограничены.`}</div>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn primary wide">${ru`Готово`}</button></div></div>`);
    res.querySelector('button').onclick = () => this.close();
    st.root.appendChild(res);
    UI.refreshHud();
  },
  finishInvasion(win, r) {
    const st = this.st, e = st.e, g = st.g;
    let html, rescue = null;
    if (win) {
      Sfx.play('win'); U.vibrate([50, 50, 50, 50, 120]);
      const rw = r.rw;
      rescue = g.team.find(x => x.sid === r.rescue.sid) || g.team[0];
      html = `<div class="res-title">${ru`Источник освобождён!`}</div>
        <div class="res-art">${Art.of(rescue)}</div>
        <div class="res-note">${ru`Прислужник растворился в тумане. Один из его духов — омрачённый ${SP[rescue.sid].name} — остался рядом. Его ещё можно спасти!`}</div>
        <div class="res-rw">${rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${I18N.back(x.label)}</div>`).join('')}</div>
        <button class="btn primary wide rescue">${ru`Спасти духа`}</button>`;
    } else {
      Sfx.play('lose');
      html = `<div class="res-title lose">${ru`Навь сильнее… пока`}</div>
        <div class="res-art"><div class="guard-ava big dark">${Art.guardian(g.color)}</div></div>
        <div class="res-note">${ru`«${GRUNT_QUOTES[0]}» — смеётся прислужник. Возьми духов, сильных против стихии «${ELEMENTS[g.el].name}», и возвращайся.`}</div>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn wide to-map">${ru`На карту`}</button></div></div>`);
    res.querySelector('.to-map').onclick = () => this.close();
    const rb = res.querySelector('.rescue');
    if (rb) rb.onclick = () => {
      this.close();
      Encounter.start({ mode: 'rescue', seed: e.invId + ':rescue' });
    };
    st.root.appendChild(res);
    UI.refreshHud();
  },

  quit() {
    const st = this.st; if (!st) return;
    if (st.over) return this.close();
    UI.confirm(ru`Сдаться?`, ru`Поединок будет проигран.`, ru`Сдаться`, () => this.close(), ru`Продолжить`, true); // 4.25: сдаться — красной кнопкой
  },
  close() {
    const st = this.st; if (!st) return;
    // сдался или вышел до конца боя — это поражение
    if (!st.over) {
      Game.act(this.endType(st.e.kind), { win: false, board: true, hp: S.hpReport(st.me.team) }).catch(() => {});
    }
    st.over = true;
    st.root.remove();
    this.st = null;
    UI.popLayer();
    Music.play('map');
    MapView.refresh();
    UI.flushLevelUps();
  },
};
