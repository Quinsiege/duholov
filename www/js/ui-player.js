'use strict';
/* Экраны Ловчего (4.3.1, вынесены из ui.js): задания и поручения, профиль, облик, настройки.
   Это методы того же объекта UI — вызовы вида UI.settings() не меняются. */

Object.assign(UI, {
  /* ---------------- ЗАДАНИЯ ---------------- */
  quests(tab) {
    Tut.ui('quests'); // 4.0: шаг обучения
    this.qTab = tab || this.qTab || (S.storyReady() ? 'story' : 'day');
    const scr = this.screen('Задания', `<div class="seg q-tabs"><button data-tab="day">Задания дня${S.d.tasks.some(q => q.p >= q.n) || S.d.taskMeet.length ? ' •' : ''}</button><button data-tab="story">Летопись${S.storyReady() ? ' •' : ''}</button><button data-tab="order">Орден${Order.claimable() ? ' •' : ''}</button></div><div class="quests"></div>`, 'q-screen');
    const BONUS = Rules.QUEST_BONUS;
    const renderStory = () => {
      const st = S.d.story, ch = STORY[st.ch];
      const gift = S.d.storyGift;
      if (!ch) {
        scr.querySelector('.quests').innerHTML = `<div class="story-card"><div class="story-num">Летопись дочитана</div><p>Ты прошёл все ${STORY.length} глав. Новые главы появятся в следующих обновлениях Ордена.</p>
          ${gift ? `<button class="btn primary wide story-gift">${Art.spirit(gift)} Встретить: ${SP[gift].name}</button>` : ''}</div>`;
        return;
      }
      const ready = S.storyReady();
      scr.querySelector('.quests').innerHTML = `
        <div class="story-card">
          <div class="story-num">Глава ${st.ch + 1} из ${STORY.length}</div>
          <h3>${ch.title}</h3>
          <p class="story-text">${ch.intro}</p>
        </div>
        ${ch.steps.map((s, i) => {
          const p = st.p[i], done = p >= s.n, pv = s.t === 'walk' ? `${Math.min(p, s.n).toFixed(2)} / ${s.n} км` : `${Math.min(Math.floor(p), s.n)} / ${s.n}`;
          return `<div class="quest qd ${done ? 'done' : ''}"><div class="qd-ico">${this.qIcon(s.t, s.el)}</div>
            <div class="q-main"><b>${stepText(s)}</b><div class="qd-bar"><div class="pbar"><i style="width:${Math.min(100, p / s.n * 100)}%"></i></div><span>${pv}</span></div></div>${done ? '<span class="q-ok" aria-label="Готово">✓</span>' : ''}</div>`;
        }).join('')}
        <div class="quest bonus qd-chest ${ready ? 'done' : ''}"><div class="qd-ico chest">${ch.gift ? Art.spirit(ch.gift) : Art.item('gift')}</div>
          <div class="q-main"><b>Награда главы</b><div class="qd-pips">${ch.steps.map((s, i) => `<i class="${st.p[i] >= s.n ? 'on' : ''}"></i>`).join('')}<small>${ready ? 'можно завершить' : 'выполни все шаги главы'}</small></div>
          ${this.rwChips(ch.reward, true, ch.gift ? `<span class="qd-rw legend">${Art.spirit(ch.gift)}встреча: ${SP[ch.gift].name}</span>` : '')}</div>
          ${ready ? '<button class="btn small primary claim-story">Завершить</button>' : ''}</div>
        ${gift ? `<button class="btn primary wide story-gift">${Art.spirit(gift)} Встретить: ${SP[gift].name}</button>` : ''}`;
    };
    const render = () => {
      U.$$('[data-tab]', scr).forEach(b => b.classList.toggle('on', b.dataset.tab === this.qTab));
      if (this.qTab === 'story') return renderStory();
      if (this.qTab === 'order') {
        Order.render(scr.querySelector('.quests'));
        if (!this._orderAsked) { this._orderAsked = true; Order.refresh(true).then(() => { this._orderAsked = false; if (scr.isConnected && this.qTab === 'order') Order.render(scr.querySelector('.quests')); }); }
        return;
      }
      // 3.25: сводка дня (кольцо и таймер), значок задания, прогресс числом, награды — картинками
      const Q = S.d.quests, all = Q.list.every(q => q.claimed), doneN = Q.list.filter(q => q.p >= q.n).length;
      const rwChips = rw => this.rwChips(rw, false), ico = q => this.qIcon(q.t, q.el);
      const ring = (n, of) => { const L = 2 * Math.PI * 22; return `<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" class="qd-bg"/><circle cx="26" cy="26" r="22" class="qd-fg" style="stroke-dasharray:${L};stroke-dashoffset:${L * (1 - n / of)}"/></svg><b>${n}<small>/${of}</small></b>`; };
      scr.querySelector('.quests').innerHTML = `
        <div class="qd-head ${doneN >= Q.list.length ? 'full' : ''}"><div class="qd-ring">${ring(doneN, Q.list.length)}</div>
          <div class="row-main"><b>${doneN >= Q.list.length ? (Q.bonus ? 'Все задания дня выполнены' : 'Все задания выполнены — забери награды') : `Выполнено ${doneN} из ${Q.list.length}`}</b>
          <small>Новые задания через <span class="qd-left">${U.fmtTime(this.toMidnight())}</span></small></div></div>`
        + Q.list.map((q, i) => {
          const done = q.p >= q.n, pv = q.t === 'walk' ? `${Math.min(q.p, q.n).toFixed(2)} / ${q.n} км` : `${Math.min(Math.floor(q.p), q.n)} / ${q.n}`;
          return `<div class="quest qd ${q.claimed ? 'claimed' : done ? 'done' : ''}"><div class="qd-ico">${ico(q)}</div>
            <div class="q-main"><b>${q.text}</b><div class="qd-bar"><div class="pbar"><i style="width:${Math.min(100, q.p / q.n * 100)}%"></i></div><span>${pv}</span></div><div class="qd-rws">${rwChips(q.reward)}</div></div>
            ${q.claimed ? '<span class="q-ok" aria-label="Получено">✓</span>' : done ? `<button class="btn small primary claim" data-i="${i}">Забрать</button>` : ''}</div>`;
        }).join('')
        + `<div class="quest bonus qd-chest ${Q.bonus ? 'claimed' : all ? 'done' : ''}"><div class="qd-ico chest">${Art.item('gift')}</div>
          <div class="q-main"><b>Сундук дня</b><div class="qd-pips">${Q.list.map(q => `<i class="${q.claimed ? 'on' : q.p >= q.n ? 'half' : ''}"></i>`).join('')}<small>${Q.bonus ? 'открыт' : all ? 'можно открыть' : 'забери награды всех трёх заданий'}</small></div><div class="qd-rws">${rwChips(BONUS)}</div></div>
          ${Q.bonus ? '<span class="q-ok" aria-label="Открыт">✓</span>' : all ? '<button class="btn small primary claim-bonus">Открыть</button>' : ''}</div>`
        + this.dayLimitsHtml() + this.tasksHtml();
    };
    scr.addEventListener('click', e => {
      const c = e.target.closest('.claim'), b = e.target.closest('.claim-bonus');
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        const order = ['day', 'story', 'order'], dir = Math.sign(order.indexOf(tab.dataset.tab) - order.indexOf(this.qTab));
        this.qTab = tab.dataset.tab; Sfx.play('tap'); render(); this.slideIn(scr.querySelector('.quests'), dir); return;
      }
      const oc = e.target.closest('.o-claim');
      if (oc) { oc.disabled = true; Order.claim(+oc.dataset.w, +oc.dataset.i).then(() => { render(); this.refreshHud(); }); return; }
      if (e.target.closest('.claim-story')) {
        Game.try('storyClaim').then(res => {
          if (!res) return;
          const ch = STORY[res.ch];
          Sfx.play('levelup'); U.vibrate([40, 60, 120]);
          this.modal({
            cls: 'story-modal', title: `«${ch.title}» — глава завершена`,
            html: `<p class="story-text">${ch.outro}</p><div class="lvl-rw">${res.got.map(x => `<div>${x.k === 'xp' || x.k === 'sparks' ? `<b class="big-n">+${U.fmtNum(x.n)}</b>` : Art.item(x.k)}<span>${x.label}${x.k === 'xp' || x.k === 'sparks' ? '' : ` ×${x.n}`}</span></div>`).join('')}</div>`,
            buttons: [{ label: 'Дальше', cls: 'primary', fn: () => render() }],
          });
          render(); this.refreshHud();
        });
        return;
      }
      if (e.target.closest('.story-gift')) {
        this.closeScreen(scr);
        Encounter.start({ mode: 'story', seed: 'gift' + S.d.created });
        return;
      }
      const tc = e.target.closest('.t-claim'), td = e.target.closest('.t-drop'), tm = e.target.closest('.t-meet');
      if (tc) {
        tc.disabled = true;
        Game.try('taskClaim', { id: tc.dataset.id }).then(r => {
          if (r) { Sfx.play('spin'); this.toast(`Поручение сдано: ${r.got.map(x => `${x.label} +${x.n}`).join(', ')}. Тебя ждёт ${SP[r.meet.sid].name}!`, 'good'); }
          render(); this.refreshHud();
        });
        return;
      }
      if (td) {
        this.confirm('Отказаться от поручения?', 'Поручение исчезнет, новое можно получить у родника.', 'Отказаться', () => Game.try('taskDrop', { id: td.dataset.id }).then(() => { render(); this.refreshHud(); }), 'Оставить', true);
        return;
      }
      if (tm) {
        this.closeScreen(scr);
        Encounter.start({ mode: 'task', spawnId: tm.dataset.id, seed: 'task:' + tm.dataset.id });
        return;
      }
      const claim = (type, args, title, sound) => Game.try(type, args).then(r => {
        if (!r) return;
        Sfx.play(sound); this.toast(title + r.got.map(x => `${x.label} +${x.n}`).join(', '), 'good');
        render(); this.refreshHud();
      });
      if (c) claim('questClaim', { i: +c.dataset.i }, 'Получено: ', 'spin');
      else if (b) claim('questBonus', {}, 'Сундук: ', 'levelup');
    });
    this.swipeTabs(scr, ['day', 'story', 'order'], () => this.qTab, (k, dir) => { this.qTab = k; render(); this.slideIn(scr.querySelector('.quests'), dir); });
    render();
    // таймер до новых заданий — каждую секунду, пока экран открыт
    const tm = setInterval(() => { if (!scr.isConnected) { clearInterval(tm); return; } const el = scr.querySelector('.qd-left'); if (el) el.textContent = U.fmtTime(this.toMidnight()); }, 1000);
  },
  toMidnight() { return 86400000 - U.local().getTime() % 86400000; },
  // Награды «картинками»: предметы с иконкой, искры, опыт; extra — дополнительные плашки (кокон, встреча с легендой)
  rwChips(rw, wrap = true, extra = '') {
    const chips = Object.entries(rw || {}).map(([k, n]) => {
      if (k === 'xp') return `<span class="qd-rw xp">+${U.fmtNum(n)} опыта</span>`;
      if (k === 'sparks') return `<span class="qd-rw spark"><span class="cur">${Art.item('sparks')}</span> ${U.fmtNum(n)}</span>`;
      const a = Art.item(k);
      return a ? `<span class="qd-rw">${a}×${n}</span>` : '';
    }).join('') + extra;
    return wrap ? `<div class="qd-rws">${chips}</div>` : chips;
  },
  // Значок задания по его типу (задания дня, Летопись)
  qIcon(t, el) {
    if (t === 'catchEl' && el) return Art.elIcon(el, 22);
    return this.I[{ catch: 'spirits', catchEl: 'spirits', spring: 'target', throw: 'target', walk: 'trail', power: 'star', evolve: 'swap', raid: 'rift', duel: 'shield', photo: 'book', hatch: 'egg', buddy: 'user', friend: 'swap', invasion: 'shield', defend: 'shield', league: 'trophy', task: 'scroll', purify: 'star', land: 'pin' }[t] || 'scroll'];
  },
  // Лимиты дня (Rules.DAILY): сколько объектов карты уже пройдено сегодня
  dayLimitsHtml() {
    return `<h3 class="prof-h">Лимиты дня <small>обновятся в полночь</small></h3><div class="day-limits">${Object.keys(Rules.DAILY).map(k => {
      const u = Rules.dayUsed(S.d, k), m = Rules.DAILY[k];
      return `<div class="${u >= m ? 'out' : ''}"><b>${u}/${m}</b><small>${Rules.DAILY_NAMES[k]}</small></div>`;
    }).join('')}</div>`;
  },
  // Поручения из родников: задание → предметы и встреча с духом
  tasksHtml() {
    const d = S.d;
    const meets = d.taskMeet.map(m => `<div class="quest done t-row"><div class="t-sp">${Art.img(m.sid)}</div><div class="q-main"><b>Встреча: ${SP[m.sid].name}</b><small>${RARITY[SP[m.sid].rar].name} · ур. ${m.lvl}. Не сбежит, пока не поймаешь.</small></div>
      <button class="btn small primary t-meet" data-id="${m.id}">Встретить</button></div>`).join('');
    const tasks = d.tasks.map(q => {
      const done = q.p >= q.n, pv = q.t === 'walk' ? `${q.p.toFixed(2)} / ${q.n}` : `${Math.floor(q.p)} / ${q.n}`;
      return `<div class="quest t-row ${done ? 'done' : ''}"><div class="t-sp mystery">${Art.img(q.sid)}<i>${'★'.repeat(q.tier)}</i></div><div class="q-main"><b>${q.text}</b><div class="pbar"><i style="width:${Math.min(100, q.p / q.n * 100)}%"></i></div><small>${pv} · Награда: встреча с духом</small></div>
        ${done ? `<button class="btn small primary t-claim" data-id="${q.id}">Сдать</button>` : `<button class="btn-round small t-drop" data-id="${q.id}" aria-label="Отказаться">${this.I.close}</button>`}</div>`;
    }).join('');
    return `<h3 class="q-h">Поручения родников <small>${d.tasks.length} / ${TASK_LIMIT}</small></h3>${meets}${tasks ||
      (meets ? '' : '<div class="q-note">Родники иногда дают поручения: первое за день — всегда. За выполненное — предметы и встреча с духом, которого на улице не найти так просто.</div>')}`;
  },

  /* ---------------- ПРОФИЛЬ ---------------- */
  rank(l) { return l >= 30 ? 'Хранитель' : l >= 20 ? 'Ведун' : l >= 10 ? 'Следопыт' : l >= 5 ? 'Ловчий' : 'Послушник'; },
  profile() {
    Sfx.init(); Sfx.play('tap');
    const d = S.d, cur = levelXP(d.level), next = levelXP(d.level + 1);
    const caught = SPECIES.filter(s => d.dex[s.id] && d.dex[s.id].caught).length;
    const bsp = S.buddySpirit();
    const days = Math.max(1, Math.ceil((Date.now() - d.created) / 864e5));
    const buddyHtml = bsp ? `<div class="prof-buddy"><div class="pb-art">${Art.of(bsp)}</div><div class="pb-main"><b>♥ ${U.esc(bsp.nick || SP[bsp.sid].name)}</b><small>Спутник · находок: ${d.buddy.finds}</small>
      <div class="pbar"><i style="width:${Math.min(100, d.buddy.km / S.buddyDist(bsp) * 100)}%"></i></div><small>${d.buddy.km.toFixed(2)} / ${S.buddyDist(bsp)} км до находки</small></div></div>`
      : '<div class="prof-buddy empty-b">Спутника нет. Выбери его на карточке духа.</div>';
    const medalsHtml = MEDALS.map(m => {
      const tier = d.medals[m.id] || 0, v = S.medalValue(m), next = m.tiers[tier];
      return `<button class="medal" data-m="${m.id}"><div class="medal-art">${Art.medal(m, tier)}</div><b>${m.name}</b>
        ${next != null ? `<div class="pbar"><i style="width:${Math.min(100, v / next * 100)}%"></i></div>` : '<small class="gold-t">Золото</small>'}</button>`;
    }).join('');
    const scr = this.screen('Ловчий', `
      <div class="prof">
        <div class="pc-hero prof-hero" style="--cc:${d.clan ? CLANS[d.clan].color : '#fbbf24'}">
          <div class="prof-top">
            <div class="pc-ava prof-ava-wrap"><div class="prof-ava">${this.avatar()}</div><span class="pc-lvl">${d.level}</span></div>
            <div class="pc-id"><b class="pc-name">${U.esc(d.name)}</b><small>${this.rank(d.level)} Ордена Оберега</small>
              <div class="pc-tags">${d.clan ? `<span class="pc-tag clan">${CLANS[d.clan].short}</span>` : ''}<span class="pc-tag">в Ордене ${days} ${U.plural(days, 'день', 'дня', 'дней')}</span></div>
              ${Game.on() ? `<div class="acc-tags">${Login.accountTags()}</div>` : ''}</div>
          </div>
          <div class="prof-xp">
            <div class="prof-xp-row"><b>${d.level >= MAX_LEVEL ? 'Максимальный уровень' : `${d.level} → ${d.level + 1} уровень`}</b>${d.level >= MAX_LEVEL ? '' : `<span>${U.fmtNum(d.xp - cur)} / ${U.fmtNum(next - cur)}</span>`}</div>
            <div class="pbar big"><i style="width:${d.level >= MAX_LEVEL ? 100 : (d.xp - cur) / (next - cur) * 100}%"></i></div>
          </div>
        </div>
        <div class="prof-actions">
          <button class="pa look-btn"><span class="pa-ic">${this.I.edit}</span><b>Гардероб</b></button>
          <button class="pa journal-btn"><span class="pa-ic">${this.I.journal}</span><b>Дневник</b></button>
          ${d.clan ? `<button class="pa clan-open"><span class="pa-ic">${this.I.shield}</span><b>Дружина</b></button>`
            : d.level >= CLAN_LEVEL ? `<button class="pa hot clan-btn"><span class="pa-ic">${this.I.shield}</span><b>Выбрать дружину</b></button>`
            : `<button class="pa off" disabled><span class="pa-ic">${this.I.shield}</span><b>Дружина</b><small>с ${CLAN_LEVEL} уровня</small></button>`}
        </div>
        ${Game.on() && Login.isGuest() && Login.available().length ? `<div class="prof-acc guest"><small>Привяжи вход — прогресс откроется на любом устройстве:</small><div class="login-row">${Login.buttons('link')}</div></div>` : ''}
        <div class="prof-key">
          <div><span class="pk-ic">${this.I.spirits}</span><b>${U.fmtNum(d.stats.caught)}</b><small>поймано духов</small></div>
          <div><span class="pk-ic">${this.I.book}</span><b>${caught}<em>/${SPECIES.length}</em></b><small>бестиарий</small><i class="pk-bar"><i style="width:${caught / SPECIES.length * 100}%"></i></i></div>
          <div><span class="pk-ic">${this.I.trail}</span><b>${U.fmtDist(d.stats.km * 1000)}</b><small>пройдено</small></div>
        </div>
        <h3 class="prof-h">Достижения</h3>
        <div class="prof-rows">${[
          ['pin', 'Родников', d.stats.springs], ['rift', 'Закрыто разломов', d.stats.raids], ['shield', 'Побед на Капищах', d.stats.duels],
          ['target', 'Вторжений отбито', d.stats.invasions], ['star', 'Превращений', d.stats.evolved], ['egg', 'Из коконов', d.stats.hatched],
          ['star', 'Сияющих', d.stats.shiny], ['spirits', 'Очищено духов', d.stats.purified], ['target', 'Отличных бросков', d.stats.throwsGreat],
          ...(d.clan ? [['shield', 'Защитников поставлено', d.stats.defends || 0], ['trophy', 'Капищ освобождено', d.stats.freed || 0]] : []),
        ].map(([ic, t, v]) => `<div class="pr-row"><span class="pr-ic">${this.I[ic]}</span><span class="pr-t">${t}</span><b>${U.fmtNum(v || 0)}</b></div>`).join('')}</div>
        <h3 class="prof-h">Спутник</h3>
        ${buddyHtml}
        <h3 class="prof-h">Знаки Ордена <small>${Object.values(d.medals).reduce((a, b) => a + b, 0)} / ${MEDALS.length * 3}</small></h3>
        <div class="medals">${medalsHtml}</div>
        <h3 class="prof-h">Альбом <small>${Album.list().length} / ${Album.MAX}</small></h3>
        <div class="album-box">${Album.html()}</div>
        <div class="prof-since">В Ордене с ${new Date(d.created).toLocaleDateString('ru-RU')}</div>
      </div>`, 'prof-screen');
    Art.cardSkin(scr.querySelector('.prof-hero'), d.look); // 4.6: фон и рамка карточки из Гардероба
    scr.addEventListener('click', e => {
      const lg = e.target.closest('[data-login]'); if (lg) { Login.start(lg.dataset.login, lg.dataset.mode); return; }
      if (e.target.closest('.journal-btn')) { J.screen(); return; }
      if (e.target.closest('.clan-btn')) { Clans.choose(() => { this.closeScreen(scr); this.profile(); }); return; }
      if (e.target.closest('.clan-open')) { Clans.screen(); return; }
      if (e.target.closest('.look-btn')) {
        this.editLook(() => { scr.querySelector('.prof-ava').innerHTML = this.avatar(); Art.cardSkin(scr.querySelector('.prof-hero'), S.d.look); this.refreshHud(); });
        return;
      }
      const ai = e.target.closest('.album-item');
      if (ai) {
        const m = Album.open(+ai.dataset.i);
        const refresh = () => { if (!m.isConnected) { scr.querySelector('.album-box').innerHTML = Album.html(); clearInterval(tm); } };
        const tm = setInterval(refresh, 300);
        return;
      }
      const b = e.target.closest('.medal'); if (!b) return;
      const m = MEDALS.find(x => x.id === b.dataset.m), tier = d.medals[m.id] || 0, v = S.medalValue(m);
      this.modal({
        cls: 'medal-modal', title: m.name,
        html: `<div class="medal-big">${Art.medal(m, tier)}</div><p>${m.desc}: <b>${m.stat === 'km' ? v.toFixed(1) : v}</b></p>
          <div class="medal-tiers">${m.tiers.map((t, i) => `<div class="${tier > i ? 'got' : ''}"><i style="background:${MEDAL_TIERS[i].color}"></i>${MEDAL_TIERS[i].name}: ${t}<small>+${MEDAL_TIERS[i].xp} опыта</small></div>`).join('')}</div>`,
        buttons: [{ label: 'Закрыть' }],
      });
    });
  },
  avatar() { return Art.avatar(S.d ? S.d.look : undefined); },
  // 4.6: Гардероб Ловчего — облики-скины, фон и рамка портрета (за златники или с уровнем), плащ, глаза, эмблема; примерка до сохранения
  editLook(done) {
    const look = { cloak: '#6d28d9', eyes: '#5eead4', emblem: 'charm', ...S.d.look };
    const DEF = { skin: 'hood', bg: 'night', frame: 'none' };
    for (const k in DEF) look[k] = look[k] || DEF[k];
    const lvl = S.d.level;
    const KIND = { skin: 'Облик', bg: 'Фон', frame: 'Рамка' };
    let tab = 'skin';
    const scr = this.screen('Гардероб', `<div class="wd">
      <div class="wd-hero"><div class="wd-stage"><i class="wd-ring"></i><div class="wd-ava"></div></div>
        <div class="wd-cardprev pc-hero"><div class="pc-ava"><div class="wd-cp-ava"></div><span class="pc-lvl">${S.d.level}</span></div><div class="pc-id"><b class="pc-name">${U.esc(S.d.name)}</b><small>${this.rank(S.d.level)} Ордена Оберега</small></div></div>
        <div class="wd-title"><b class="wd-name"></b><span class="wd-rar"></span></div><p class="wd-desc"></p></div>
      <div class="seg wd-tabs"><button data-t="skin" class="on">Облики</button><button data-t="bg">Фон</button><button data-t="frame">Рамка</button><button data-t="more">Детали</button></div>
      <div class="wd-body"></div>
      <div class="wd-foot"></div></div>`, 'wd-screen');
    const $ = s => scr.querySelector(s);
    const item = (kind, id) => LOOK[kind].find(x => x.id === id) || LOOK[kind][0];
    const has = (kind, x) => x.shop ? !!S.d.owned[`${kind}:${x.id}`] : (x.lvl || 1) <= lvl;
    const worn = (kind, id) => ((S.d.look || {})[kind] || DEF[kind]) === id;
    const saved = () => { const c = S.d.look || {}; return c.cloak === look.cloak && c.eyes === look.eyes && c.emblem === look.emblem && Object.keys(DEF).every(k => (c[k] || DEF[k]) === look[k]); };
    // что ещё не куплено из примеряемого — сначала облик, потом фон, потом рамка
    const pending = () => Object.keys(DEF).map(k => [k, item(k, look[k])]).find(([k, x]) => x.shop && !has(k, x));
    const hero = () => {
      // на вкладках фона и рамки — всегда превью карточки; на остальных — облик (или то, что ждёт покупки)
      const [k, x] = tab === 'bg' || tab === 'frame' ? [tab, item(tab, look[tab])] : pending() || ['skin', item('skin', look.skin)];
      const R = SKIN_RAR[x.rar || 0];
      const cardMode = k === 'bg' || k === 'frame';
      $('.wd-hero').classList.toggle('card-mode', cardMode);
      $('.wd-ava').innerHTML = Art.avatar(look);
      $('.wd-cp-ava').innerHTML = Art.avatar(look); Art.cardSkin($('.wd-cardprev'), look);
      $('.wd-stage').style.setProperty('--rc', R.c);
      $('.wd-name').textContent = x.name;
      $('.wd-rar').textContent = `${KIND[k]} · ${R.name}`; $('.wd-rar').style.color = R.c;
      $('.wd-desc').textContent = x.desc || (k === 'bg' ? 'Фон твоей карточки Ловчего — его видят все, кто её откроет: из чата, Лиги и списка друзей.' : k === 'frame' ? 'Рамка твоей карточки Ловчего — её видят все, кто откроет карточку.' : '');
    };
    const wide = kind => kind === 'bg' || kind === 'frame';
    const cards = kind => `<div class="wd-grid ${wide(kind) ? 'wide' : ''}">${LOOK[kind].map(x => {
      const R = SKIN_RAR[x.rar || 0], own = has(kind, x), on = look[kind] === x.id, lvLock = !x.shop && !own;
      const tag = own ? (worn(kind, x.id) ? '✓ Надет' : on ? 'Примеряешь' : 'Твой') : lvLock ? `с ${x.lvl} ур.` : `<span class="cur">${Art.item('zlat')}</span> ${U.fmtNum(x.shop)}`;
      return `<button class="wd-card ${on ? 'on' : ''} ${own ? 'own' : ''} ${lvLock ? 'lv' : ''} r${x.rar || 0}" data-kind="${kind}" data-id="${x.id}" data-lv="${lvLock ? x.lvl : ''}" style="--rc:${R.c}">
        ${wide(kind) ? `<span class="wd-mini" data-mini="${x.id}"><i>${Art.avatar(look)}</i></span>` : `<span class="wd-c-ava">${Art.avatar({ ...look, [kind]: x.id })}</span>`}<b>${x.name}</b><span class="wd-c-tag">${tag}</span></button>`;
    }).join('')}</div>`;
    const lockOf = (x, kind) => {
      if (kind === 'cloak') return (x.shop || x.pass) && !S.d.owned[x.c] ? (x.shop ? 'shop' : 'pass') : x.lvl > lvl ? x.lvl : '';
      if (kind === 'eyes') return x.lvl > lvl ? x.lvl : '';
      return x.league && League.view().best < x.league ? 'league' : x.story && S.d.story.ch < x.story ? 'story' : x.pass && !S.d.owned[x.id] ? 'pass' : x.lvl > lvl ? x.lvl : '';
    };
    const swatches = (kind, title) => `<h3 class="wd-h">${title}</h3><div class="wd-sw">${LOOK[kind].map(x => {
      const v = kind === 'emblem' ? x.id : x.c, lk = lockOf(x, kind), on = look[kind] === v;
      const face = kind === 'emblem' ? `<svg viewBox="36 70 28 28" class="art">${Art.emblem(x.id)}</svg>` : '';
      return `<button class="wd-s ${kind} ${on ? 'on' : ''} ${lk !== '' ? 'locked' : ''}" data-k="${kind}" data-v="${v}" data-l="${lk}" title="${x.name}" style="--sw:${kind === 'emblem' ? '#241a45' : v}">${face}<small>${x.name}</small></button>`;
    }).join('')}</div>`;
    const body = () => {
      $('.wd-body').innerHTML = tab === 'more'
        ? (look.skin !== 'hood' ? '<p class="wd-note">Цвет плаща виден у облика «Ловчий». У особых обликов — свой наряд, а глаза и эмблема — твои.</p>' : '') +
          swatches('cloak', 'Плащ') + swatches('eyes', 'Глаза') + swatches('emblem', 'Эмблема')
        : cards(tab);
      if (tab === 'bg' || tab === 'frame') scr.querySelectorAll('.wd-mini').forEach(el => Art.cardSkin(el, { ...look, [tab]: el.dataset.mini }));
    };
    const foot = () => {
      const p = pending();
      if (p) {
        const [k, x] = p;
        $('.wd-foot').innerHTML = this.rune(`Купить: ${KIND[k].toLowerCase()} за <span class="cur">${Art.item('zlat')}</span> ${U.fmtNum(x.shop)}`, 'wd-buy') + `<p class="wd-wallet">У тебя <span class="cur">${Art.item('zlat')}</span> ${U.fmtNum(S.d.zlat || 0)}</p>`;
      } else $('.wd-foot').innerHTML = this.rune(saved() ? 'Облик надет' : 'Надеть облик', 'wd-save' + (saved() ? ' wd-done' : ''));
    };
    const render = () => { hero(); body(); foot(); };
    scr.addEventListener('click', async e => {
      const t = e.target.closest('.wd-tabs button');
      if (t) { tab = t.dataset.t; scr.querySelectorAll('.wd-tabs button').forEach(b => b.classList.toggle('on', b === t)); hero(); body(); return; }
      const c = e.target.closest('.wd-card');
      if (c) {
        if (c.dataset.lv) return this.toast(`Откроется на ${c.dataset.lv} уровне`);
        look[c.dataset.kind] = c.dataset.id; Sfx.play('tap'); render(); return;
      }
      const sw = e.target.closest('.wd-s');
      if (sw) {
        const l = sw.dataset.l;
        if (l === 'league') return this.toast('Венец Лиги — награда за ранг «Хранитель Лиги»');
        if (l === 'story') return this.toast('Эта эмблема — награда за Летопись');
        if (l === 'shop') return this.toast('Этот плащ продаётся в Лавке Ордена за златники');
        if (l === 'pass') return this.toast('Награда Золотой сезонной тропы');
        if (l) return this.toast(`Откроется на ${l} уровне`);
        look[sw.dataset.k] = sw.dataset.v; Sfx.play('tap'); render(); return;
      }
      if (e.target.closest('.wd-buy')) {
        const [k, x] = pending();
        if ((S.d.zlat || 0) < x.shop) { this.toast('Не хватает златников — их можно добыть в Казне Ордена'); return; }
        this.confirm(`${KIND[k]} «${x.name}»`, `${x.desc ? x.desc + '<br><br>' : ''}Цена: <b>${U.fmtNum(x.shop)}</b> златников.`, 'Купить', async () => {
          const r = await Game.try('shopBuy', { id: `${k}:${x.id}` });
          if (!r) return;
          Sfx.play('catch'); this.toast(`${KIND[k]} «${x.name}» — теперь твой!`, 'good'); render();
        });
        return;
      }
      if (e.target.closest('.wd-save') && !saved()) {
        const send = { cloak: look.cloak, eyes: look.eyes, emblem: look.emblem, skin: look.skin, bg: look.bg, frame: look.frame };
        if (await Game.try('look', { look: send })) { Sfx.play('levelup'); this.toast('Облик надет', 'good'); render(); done && done(); }
      }
    });
    render();
  },

  /* ---------------- НАСТРОЙКИ ---------------- */
  settings() {
    const s = Cfg.s;
    // 3.28: разделы с заголовками, у каждого пункта — значок
    const row = (k, ico, title, sub) => `<label class="row toggle set-row"><span class="set-ico">${this.I[ico]}</span><div class="row-main"><b>${title}</b><small>${sub}</small></div><input type="checkbox" data-k="${k}" ${s[k] ? 'checked' : ''}><i></i></label>`;
    const link = (cls, ico, title, sub) => `<button class="row link set-row ${cls}"><span class="set-ico">${this.I[ico]}</span><div class="row-main"><b>${title}</b><small>${sub}</small></div><span class="set-chev">›</span></button>`;
    const sec = t => `<div class="set-h">${t}</div>`;
    const scr = this.screen('Настройки', `
      ${Game.on() ? `${sec('Учётная запись')}<div class="list acc-box"></div>` : ''}
      ${DEV ? `${sec('Разработка')}<div class="list">${row('demo', 'target', 'Демо-режим', 'Джойстик вместо GPS. Доступен только на локальном сервере.')}</div>` : ''}
      ${sec('Звук и отклик')}
      <div class="list">
        ${row('music', 'music', 'Музыка', 'Мелодии Нави на карте (днём и ночью своя), у наставника и боевая тема в сражениях.')}
        ${row('sound', 'sound', 'Звук', 'Звуковые эффекты.')}
        ${row('vibro', 'vibro', 'Вибрация', 'Отклик при бросках и попаданиях.')}
      </div>
      ${sec('Игра')}
      <div class="list">
        ${row('ar', 'camera', 'AR-камера', 'Духи появляются поверх изображения с камеры.')}
        ${row('tapThrow', 'hand', 'Бросок одним касанием', 'Коснись оберега — он сам полетит в духа. Бонус кольца по-прежнему зависит от момента.')}
        ${row('weather', 'sun', 'Настоящая погода', 'Погода через Open-Meteo (координаты с точностью ~1 км). Выключено — погода Нави моделируется.')}
        ${Cloud.configured() ? row('cloud', 'trophy', 'Общая таблица Лиги', 'Показывать твоё имя, облик, уровень и звёзды в таблице сезона.') : ''}
      </div>
      ${sec('Вид')}
      <div class="list">
        <div class="row set-row"><span class="set-ico">${this.I.map}</span><div class="row-main"><b>Тема карты</b><small>Авто — тёмная с 20:00 до 6:00</small></div>
          <div class="seg map-theme">${[['auto', 'Авто'], ['light', 'День'], ['dark', 'Ночь']].map(([k, t]) => `<button data-theme="${k}" class="${(s.mapTheme || 'auto') === k ? 'on' : ''}">${t}</button>`).join('')}</div></div>
        ${row('bigText', 'text', 'Крупный текст', 'Увеличенный шрифт в меню, карточках и подсказках.')}
        ${row('calm', 'calm', 'Меньше движения', 'Без покачиваний, мерцания и погодных эффектов.')}
        ${row('eco', 'battery', 'Экономия батареи', 'Меньше анимаций на карте, реже обновление и запросы GPS.')}
      </div>
      <div class="list install-list">
        <button class="row link set-row inst-pwa hidden"><span class="set-ico">${this.I.download}</span><div class="row-main"><b>Установить на главный экран</b><small>Духолов откроется на весь экран, как обычное приложение</small></div><span class="set-chev">›</span></button>
        <a class="row link set-row inst-apk hidden" href="duholov.apk" download><span class="set-ico">${this.I.download}</span><div class="row-main"><b>Скачать APK для Android</b><small>Приложение-обёртка: разреши установку из этого источника</small></div><span class="set-chev">›</span></a>
      </div>
      ${sec('Об игре')}
      <div class="list">
        ${link('about', 'info', 'Книга Ордена', 'Мир, духи и все правила игры; трейлер')}
        ${link('terms', 'info', 'Правила игры', 'Соглашение, безопасность на улице, чат · 12+')}
        ${link('privacy', 'info', 'Персональные данные', 'Какие данные хранит игра и как их удалить')}
        <button class="row link set-row reset"><span class="set-ico danger">${this.I.trash}</span><div class="row-main"><b class="danger-t">Сбросить прогресс</b><small>Удалить всех духов и начать заново</small></div><span class="set-chev">›</span></button>
        ${Game.on() ? `<button class="row link set-row del-acc"><span class="set-ico danger">${this.I.trash}</span><div class="row-main"><b class="danger-t">Удалить учётную запись</b><small>Прогресс, способы входа и все данные — навсегда</small></div></button>` : ''}
      </div>
      <div class="ver">Духолов · v${APP_VERSION}${Updater.IN_APP ? ` · приложение ${Updater.APK}` : ''} · <button class="link-btn check-upd">Проверить обновления</button><br>Карта © участники OpenStreetMap</div>`, 'set-screen');
    scr.addEventListener('change', e => {
      const k = e.target.dataset.k; if (!k) return;
      s[k] = e.target.checked; Cfg.save();
      if (k === 'demo') { s.demo ? MapView.startDemo() : (MapView._offered = false, MapView.startGPS()); }
      if (k === 'sound' && s.sound) { Sfx.init(); Sfx.play('tap'); }
      if (k === 'weather') Sky.update(true);
      if (k === 'music') { Sfx.init(); Music.apply(); }
      if (k === 'eco') { document.body.classList.toggle('eco', s.eco); if (!s.demo) MapView.startGPS(); }
      if (k === 'bigText' || k === 'calm') this.applyA11y();
    });
    scr.querySelector('.map-theme').addEventListener('click', e => {
      const b = e.target.closest('[data-theme]'); if (!b) return;
      s.mapTheme = b.dataset.theme; Cfg.save();
      U.$$('[data-theme]', scr).forEach(x => x.classList.toggle('on', x === b));
      MapView.night = null; MapView.setTiles();
    });
    // установка: кнопка PWA (если браузер предложил) и APK (если он собран и лежит рядом с сайтом)
    const pwa = scr.querySelector('.inst-pwa'), apk = scr.querySelector('.inst-apk');
    if (window.__installPrompt) pwa.classList.remove('hidden');
    scr.querySelector('.check-upd').onclick = async () => {
      await Updater.check(true);
      if (!Updater.shown) this.toast(`У тебя последняя версия — ${APP_VERSION}`, 'good');
    };
    pwa.onclick = async () => { const p = window.__installPrompt; if (!p) return; p.prompt(); await p.userChoice; window.__installPrompt = null; pwa.classList.add('hidden'); };
    if (!Updater.IN_APP && /Android/i.test(navigator.userAgent)) {
      fetch('duholov.apk', { method: 'HEAD' }).then(r => { if (r.ok) { apk.classList.remove('hidden'); il.classList.remove('empty-list'); } }).catch(() => {});
    }
    const il = scr.querySelector('.install-list');
    if (!il.querySelector('.row:not(.hidden)')) il.classList.add('empty-list');
    // 3.27–3.32: учётная запись — чей прогресс, какими входами открывается, привязать ещё вход, выйти
    const acc = scr.querySelector('.acc-box');
    const renderAcc = () => {
      if (!acc || !scr.isConnected) return;
      const d = S.d, guest = Login.isGuest(), links = Login.linked(), avail = Login.available().filter(k => !links.some(l => l.provider === k));
      const way = (ic, title, sub, end = '<span class="acc-ok">✓</span>') => `<div class="acc-way">${ic}<div class="row-main"><b>${title}</b><small>${sub}</small></div>${end}</div>`;
      // 3.33: у кого вход уже есть — непривязанные сервисы строками того же списка с небольшой кнопкой; гостю — крупные кнопки
      const addRows = guest ? '' : avail.map(k => way(Login.icon(k), Login.NAMES[k], 'ещё один способ входа',
        `<button class="btn acc-link" data-login="${k}" data-mode="link">Привязать</button>`)).join('');
      acc.innerHTML = `<div class="acc-hero ${guest ? 'guest' : ''}" style="--cc:${d.clan && CLANS[d.clan] ? CLANS[d.clan].color : '#fbbf24'}">
          <div class="pc-ava"><div class="acc-ava">${Art.avatar(d.look)}</div><span class="pc-lvl">${d.level}</span></div>
          <div class="acc-main"><b>${U.esc(d.name)}</b><small>${this.rank(d.level)} · ${d.level} уровень</small>
            <span class="acc-status ${guest ? 'warn' : 'ok'}">${guest ? `${this.I.user}Гость · только на этом устройстве` : `${this.I.cloud}Прогресс в облаке`}</span></div>
        </div>`
        + (links.length || Login.email ? `<div class="acc-ways"><div class="acc-cap">Способы входа</div>${Login.email ? way(`<span class="lg-ic mail">${this.I.mail}</span>`, 'Почта', U.esc(Login.email)) : ''}${links.map(l => way(Login.icon(l.provider), Login.NAMES[l.provider], l.name ? U.esc(l.name) : 'вход привязан')).join('')}${addRows}</div>` : '')
        + (guest && avail.length ? `<div class="acc-add"><small>Привяжи вход — прогресс откроется на любом устройстве</small><div class="login-row">${Login.buttons('link', avail)}</div></div>` : '')
        + (Updater.oldApp() ? `<div class="acc-add"><small><b>Новое приложение Духолов.</b> Игра переехала на duholov.ru — приложение нужно поставить заново: ${guest ? '<b>сначала привяжи вход выше</b> (иначе прогресс гостя пропадёт), потом ' : ''}удали это приложение и установи новое.</small><a class="btn primary" href="duholov.apk">Скачать новое приложение</a></div>` : '')
        + `<button class="row link set-row acc-out"><span class="set-ico out">${this.I.logout}</span><div class="row-main"><b>Выйти из учётной записи</b><small>${guest ? 'Прогресс гостя будет потерян' : 'Вернуться можно тем же входом'}</small></div><span class="set-chev">›</span></button>`;
      acc.querySelectorAll('[data-login]').forEach(b => { b.onclick = () => Login.start(b.dataset.login, b.dataset.mode); });
      acc.querySelector('.acc-out').onclick = () => Login.askSignOut();
    };
    renderAcc();
    Login.load().then(renderAcc);
    scr.querySelector('.about').onclick = () => Book.screen(); // 4.0: вместо списка «Об игре»
    scr.querySelector('.terms').onclick = () => UI.doc('Правила игры', 'terms.html');
    scr.querySelector('.privacy').onclick = () => UI.doc('Персональные данные', 'privacy.html');
    // 4.1: полное удаление учётной записи (152-ФЗ) — после двух подтверждений; платежи остаются без привязки
    const del = scr.querySelector('.del-acc');
    if (del) del.onclick = () => this.confirm('Удалить учётную запись?', 'Прогресс, духи, способы входа, место в Лиге и лоты аукциона будут удалены навсегда. Купленные златники не вернутся.', 'Удалить', () => {
      this.confirm('Точно удалить?', 'Восстановить учётную запись будет нельзя.', 'Да, удалить навсегда', async () => {
        try { await Game.auth('delete', { confirm: 'УДАЛИТЬ' }); } catch (e) { UI.toast(U.esc(e.message)); return; }
        try { localStorage.removeItem(CLOUD_CONFIG.auth); } catch (e) {}
        location.reload();
      }, 'Нет', true);
    });
    scr.querySelector('.reset').onclick = () => this.confirm('Сбросить прогресс?', 'Все духи, предметы и уровень будут удалены с сервера навсегда.', 'Сбросить', () => {
      this.confirm('Точно?', 'Это действие нельзя отменить.', 'Да, сбросить', async () => {
        if (await Game.try('reset')) location.reload();
      }, 'Нет', true);
    }, 'Отмена', true);
  },
});
