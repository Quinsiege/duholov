'use strict';
/* Экраны Ловчего (4.3.1, вынесены из ui.js): задания и поручения, профиль, облик, настройки.
   Это методы того же объекта UI — вызовы вида UI.settings() не меняются. */

Object.assign(UI, {
  /* ---------------- ЗАДАНИЯ ---------------- */
  quests(tab) {
    Tut.ui('quests'); // 4.0: шаг обучения
    this.qTab = tab || (this.qTab === 'order' ? 'order' : 'day');
    const dot = '<i class="dt-dot"></i>'; // 4.21: вкладки как у духа и родника — есть что забрать → зелёная точка
    const scr = this.screen(ru`Задания`, `<div class="seg dt-tabs q-tabs"><button data-tab="day">${ru`Задания дня`}${S.d.tasks.some(q => q.p >= q.n) || S.d.taskMeet.length ? dot : ''}</button><button data-tab="order">${ru`Орден`}${Order.claimable() ? dot : ''}</button></div><div class="quests"></div>`, 'q-screen');
    const BONUS = Rules.QUEST_BONUS;
    const render = () => {
      U.$$('[data-tab]', scr).forEach(b => b.classList.toggle('on', b.dataset.tab === this.qTab));
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
          <div class="row-main"><b>${doneN >= Q.list.length ? (Q.bonus ? ru`Все задания дня выполнены` : ru`Все задания выполнены — забери награды`) : ru`Выполнено ${doneN} из ${Q.list.length}`}</b>
          <small>${ru`Новые задания через ${`<span class="qd-left">${U.fmtTime(this.toMidnight())}</span>`}`}</small></div></div>`
        + Q.list.map((q, i) => {
          const done = q.p >= q.n, pv = q.t === 'walk' ? ru`${Math.min(q.p, q.n).toFixed(2)} / ${q.n} км` : `${Math.min(Math.floor(q.p), q.n)} / ${q.n}`;
          return `<div class="quest qd ${q.claimed ? 'claimed' : done ? 'done' : ''}"><div class="qd-ico">${ico(q)}</div>
            <div class="q-main"><b>${I18N.back(q.text)}</b><div class="qd-bar"><div class="pbar"><i style="width:${Math.min(100, q.p / q.n * 100)}%"></i></div><span>${pv}</span></div><div class="qd-rws">${rwChips(q.reward)}</div></div>
            ${q.claimed ? `<span class="q-ok" aria-label="${ru`Получено`}">✓</span>` : done ? `<button class="btn small primary claim" data-i="${i}">${ru`Забрать`}</button>` : ''}</div>`;
        }).join('')
        + `<div class="quest bonus qd-chest ${Q.bonus ? 'claimed' : all ? 'done' : ''}"><div class="qd-ico chest">${Art.item('gift')}</div>
          <div class="q-main"><b>${ru`Сундук дня`}</b><div class="qd-pips">${Q.list.map(q => `<i class="${q.claimed ? 'on' : q.p >= q.n ? 'half' : ''}"></i>`).join('')}<small>${Q.bonus ? ru`открыт` : all ? ru`можно открыть` : ru`забери награды всех трёх заданий`}</small></div><div class="qd-rws">${rwChips(BONUS)}</div></div>
          ${Q.bonus ? `<span class="q-ok" aria-label="${ru`Открыт`}">✓</span>` : all ? `<button class="btn small primary claim-bonus">${ru`Открыть`}</button>` : ''}</div>`
        + this.dayLimitsHtml() + this.tasksHtml();
    };
    scr.addEventListener('click', e => {
      const c = e.target.closest('.claim'), b = e.target.closest('.claim-bonus');
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        const order = ['day', 'order'], dir = Math.sign(order.indexOf(tab.dataset.tab) - order.indexOf(this.qTab));
        this.qTab = tab.dataset.tab; Sfx.play('tap'); render(); this.slideIn(scr.querySelector('.quests'), dir); return;
      }
      const oc = e.target.closest('.o-claim');
      if (oc) { oc.disabled = true; Order.claim(+oc.dataset.w, +oc.dataset.i).then(() => { render(); this.refreshHud(); }); return; }
      const tc = e.target.closest('.t-claim'), td = e.target.closest('.t-drop'), tm = e.target.closest('.t-meet');
      if (tc) {
        tc.disabled = true;
        Game.try('taskClaim', { id: tc.dataset.id }).then(r => {
          if (r) { Sfx.play('spin'); this.toast(ru`Поручение сдано: ${r.got.map(x => `${I18N.back(x.label)} +${x.n}`).join(', ')}. Тебя ждёт ${SP[r.meet.sid].name}!`, 'good'); }
          render(); this.refreshHud();
        });
        return;
      }
      if (td) {
        this.confirm(ru`Отказаться от поручения?`, ru`Поручение исчезнет, новое можно получить у родника.`, ru`Отказаться`, () => Game.try('taskDrop', { id: td.dataset.id }).then(() => { render(); this.refreshHud(); }), ru`Оставить`, true);
        return;
      }
      if (tm) {
        this.closeScreen(scr);
        Encounter.start({ mode: 'task', spawnId: tm.dataset.id, seed: 'task:' + tm.dataset.id });
        return;
      }
      const claim = (type, args, title, sound) => Game.try(type, args).then(r => {
        if (!r) return;
        Sfx.play(sound); this.toast(title(r.got.map(x => `${I18N.back(x.label)} +${x.n}`).join(', ')), 'good');
        render(); this.refreshHud();
      });
      if (c) claim('questClaim', { i: +c.dataset.i }, t => ru`Получено: ${t}`, 'spin');
      else if (b) claim('questBonus', {}, t => ru`Сундук: ${t}`, 'levelup');
    });
    this.swipeTabs(scr, ['day', 'order'], () => this.qTab, (k, dir) => { this.qTab = k; render(); this.slideIn(scr.querySelector('.quests'), dir); });
    render();
    // таймер до новых заданий — каждую секунду, пока экран открыт
    const tm = setInterval(() => { if (!scr.isConnected) { clearInterval(tm); return; } const el = scr.querySelector('.qd-left'); if (el) el.textContent = U.fmtTime(this.toMidnight()); }, 1000);
  },
  toMidnight() { return 86400000 - U.local().getTime() % 86400000; },
  // Награды «картинками»: предметы с иконкой, искры, опыт; extra — дополнительные плашки (кокон, встреча с легендой)
  rwChips(rw, wrap = true, extra = '') {
    const chips = Object.entries(rw || {}).map(([k, n]) => {
      if (k === 'xp') return `<span class="qd-rw xp">${ru`+${U.fmtNum(n)} опыта`}</span>`;
      if (k === 'sparks') return `<span class="qd-rw spark"><span class="cur">${Art.item('sparks')}</span> ${U.fmtNum(n)}</span>`;
      const a = Art.item(k);
      return a ? `<span class="qd-rw">${a}×${n}</span>` : '';
    }).join('') + extra;
    return wrap ? `<div class="qd-rws">${chips}</div>` : chips;
  },
  // Значок задания по его типу
  qIcon(t, el) {
    if (t === 'catchEl' && el) return Art.elIcon(el, 22);
    return this.I[{ catch: 'spirits', catchEl: 'spirits', spring: 'target', throw: 'target', walk: 'trail', power: 'star', evolve: 'swap', raid: 'rift', duel: 'shield', photo: 'book', hatch: 'egg', buddy: 'user', friend: 'swap', invasion: 'shield', defend: 'shield', league: 'trophy', task: 'scroll', purify: 'star', land: 'pin', awaken: 'star' }[t] || 'scroll'];
  },
  // Лимиты дня (Rules.DAILY): сколько объектов карты уже пройдено сегодня
  dayLimitsHtml() {
    return `<h3 class="prof-h">${ru`Лимиты дня`} <small>${ru`обновятся в полночь`}</small></h3><div class="day-limits">${Object.keys(Rules.DAILY).map(k => {
      const u = Rules.dayUsed(S.d, k), m = Rules.DAILY[k];
      return `<div class="${u >= m ? 'out' : ''}"><b>${u}/${m}</b><small>${Rules.DAILY_NAMES[k]}</small></div>`;
    }).join('')}</div>`;
  },
  // Поручения из родников: задание → предметы и встреча с духом
  tasksHtml() {
    const d = S.d;
    const meets = d.taskMeet.map(m => `<div class="quest done t-row"><div class="t-sp">${Art.img(m.sid)}</div><div class="q-main"><b>${ru`Встреча: ${SP[m.sid].name}`}</b><small>${ru`${RARITY[SP[m.sid].rar].name} · ур. ${m.lvl}. Не сбежит, пока не поймаешь.`}</small></div>
      <button class="btn small primary t-meet" data-id="${m.id}">${ru`Встретить`}</button></div>`).join('');
    const tasks = d.tasks.map(q => {
      const done = q.p >= q.n, pv = q.t === 'walk' ? `${q.p.toFixed(2)} / ${q.n}` : `${Math.floor(q.p)} / ${q.n}`;
      return `<div class="quest t-row ${done ? 'done' : ''}"><div class="t-sp mystery">${Art.img(q.sid)}<i>${'★'.repeat(q.tier)}</i></div><div class="q-main"><b>${I18N.back(q.text)}</b><div class="pbar"><i style="width:${Math.min(100, q.p / q.n * 100)}%"></i></div><small>${q.guest ? ru`${pv} · Награда: гость издалека` : ru`${pv} · Награда: встреча с духом`}</small></div>
        ${done ? `<button class="btn small primary t-claim" data-id="${q.id}">${ru`Сдать`}</button>` : `<button class="btn-round small t-drop" data-id="${q.id}" aria-label="${ru`Отказаться`}">${this.I.close}</button>`}</div>`;
    }).join('');
    return `<h3 class="q-h">${ru`Поручения родников`} <small>${d.tasks.length} / ${TASK_LIMIT}</small></h3>${meets}${tasks ||
      (meets ? '' : `<div class="q-note">${ru`Родники иногда дают поручения: первое за день — всегда. За выполненное — предметы и встреча с духом, которого на улице не найти так просто.`}</div>`)}`;
  },

  /* ---------------- ПРОФИЛЬ ---------------- */
  rank(l) { return l >= 30 ? ru`Хранитель` : l >= 20 ? ru`Ведун` : l >= 10 ? ru`Следопыт` : l >= 5 ? ru`Ловчий` : ru`Послушник`; },
  profile() {
    Sfx.init(); Sfx.play('tap');
    const d = S.d, cur = levelXP(d.level), next = levelXP(d.level + 1);
    const caught = SPECIES.filter(s => d.dex[s.id] && d.dex[s.id].caught).length;
    const bsp = S.buddySpirit();
    const days = Math.max(1, Math.ceil((Date.now() - d.created) / 864e5));
    // 4.14.1: Ловчий — как карточка духа: всё на одном экране. Имя — у стрелки назад; сверху (≤30%) облик в руническом круге,
    // звание, «УРОВЕНЬ ··· N», опыт отдельным блоком, метки; ниже — «Гардероб · Дневник · Клан» и вкладки
    const cc = d.clan && CLANS[d.clan] ? CLANS[d.clan].color : '#fbbf24', maxed = d.level >= MAX_LEVEL;
    const row = (t, v, cls = '') => `<div class="dt-row ${cls}"><span>${t}</span><b>${v}</b></div>`;
    const ach = [
      [ru`Пробуждений`, d.stats.awakened || 0], [ru`Родников`, d.stats.springs], [ru`Закрыто разломов`, d.stats.raids], [ru`Побед на Капищах`, d.stats.duels],
      [ru`Вторжений отбито`, d.stats.invasions], [ru`Превращений`, d.stats.evolved], [ru`Из коконов`, d.stats.hatched], [ru`Сияющих`, d.stats.shiny],
      [ru`Очищено духов`, d.stats.purified], [ru`Отличных бросков`, d.stats.throwsGreat],
      ...(d.clan ? [[ru`Защитников поставлено`, d.stats.defends || 0], [ru`Капищ освобождено`, d.stats.freed || 0]] : []),
    ];
    const medalsHtml = MEDALS.map(m => {
      const tier = d.medals[m.id] || 0, v = S.medalValue(m), nx = m.tiers[tier];
      return `<button class="medal pf-medal" data-m="${m.id}" title="${m.name}"><div class="medal-art">${Art.medal(m, tier)}</div>
        <i class="pf-mbar"><i style="width:${nx != null ? Math.min(100, v / nx * 100) : 100}%"></i></i></button>`;
    }).join('');
    const pane = (k, html, on) => `<div class="dt-pane ${on ? 'on' : ''}" data-pane="${k}">${html}</div>`;
    const scr = this.screen(U.esc(d.name), `
      <div class="det det2 prof2" style="--c:${cc}">
        <div class="dt-hero">
          <div class="det-art pf-ava"><div class="prof-ava">${this.avatar()}</div></div>
          <div class="dt-info">
            <div class="det-hp">${ru`${this.rank(d.level)} Ордена Оберега`}</div>
            <div class="det-power"><small>${ru`УРОВЕНЬ`}</small><b>${d.level}</b></div>
            <div class="det-lvl"><span>${maxed ? ru`Максимальный уровень` : ru`Опыт <b>${U.fmtNum(d.xp - cur)}</b> из ${U.fmtNum(next - cur)} до ${d.level + 1}`}</span><div class="arc"><i style="width:${maxed ? 100 : (d.xp - cur) / (next - cur) * 100}%"></i></div></div>
            <div class="det-tags">${d.clan && CLANS[d.clan] ? `<span class="tag-crest" style="color:${cc}"><i>${Art.clanCrest(d.clan)}</i>${CLANS[d.clan].short}</span>` : ''}<span>${ru`в Ордене ${days} ${U.plural(days, ru`день`, ru`дня`, ru`дней`)}`}</span></div>
            ${Game.on() ? `<div class="acc-tags">${Login.accountTags()}</div>` : ''}
          </div>
        </div>
        ${Game.on() && Login.isGuest() && Login.available().length ? `<div class="prof-acc guest"><small>${ru`Привяжи вход — прогресс откроется на любом устройстве:`}</small><div class="login-row">${Login.buttons('link')}</div></div>` : ''} <!-- 4.22.1: привязка входа — над «Гардероб · Дневник · Клан» -->
        <div class="pf-acts">
          <button class="btn ghost small look-btn">${this.I.edit} ${ru`Гардероб`}</button>
          <button class="btn ghost small journal-btn">${this.I.journal} ${ru`Дневник`}</button>
          ${d.clan ? `<button class="btn ghost small clan-open">${this.I.shield} ${ru`Клан`}</button>`
            : d.level >= CLAN_LEVEL ? `<button class="btn small primary clan-btn">${this.I.shield} ${ru`Клан`}</button>`
            : `<button class="btn ghost small disabled" data-err="${ru`Клан откроется на ${CLAN_LEVEL} уровне`}">${this.I.shield} ${ru`Клан`}</button>`}
        </div>
        <div class="seg dt-tabs">${[['ach', ru`Достижения`], ['buddy', ru`Спутник`], ['medals', ru`Знаки`], ['album', ru`Альбом`]].map(([k, t], i) => `<button data-tab="${k}" class="${i ? '' : 'on'}">${t}</button>`).join('')}</div>
        <div class="dt-panel">
          ${pane('ach', `
            <div class="pf-key">
              <div><b>${U.fmtNum(d.stats.caught)}</b><small>${ru`поймано духов`}</small></div>
              <div><b>${caught}<em>/${SPECIES.length}</em></b><small>${ru`бестиарий`}</small></div>
              <div><b>${U.fmtDist(d.stats.km * 1000)}</b><small>${ru`пройдено`}</small></div>
            </div>
            <div class="dt-rows pf-grid">${ach.map(([t, v]) => row(t, U.fmtNum(v || 0))).join('')}</div>`, true)}
          ${pane('buddy', bsp ? `
            <div class="pf-buddy">
              <div class="pf-buddy-a">${Art.of(bsp)}</div>
              <div class="pf-buddy-t"><b>♥ ${U.esc(bsp.nick || SP[bsp.sid].name)}</b><small>${ru`СИЛА ${S.power(bsp)} · ур. ${bsp.lvl}`}</small></div>
            </div>
            <div class="dt-rows">
              ${row(ru`Находок`, d.buddy.finds)}
              <div class="dt-row dt-evo-row"><span>${ru`До находки`}</span><b>${ru`${d.buddy.km.toFixed(2)} / ${S.buddyDist(bsp)} км`}</b>
                <div class="dt-evo-bar"><div class="pbar"><i style="width:${Math.min(100, d.buddy.km / S.buddyDist(bsp) * 100)}%"></i></div></div></div>
              ${row(ru`Находит`, ru`эссенцию «${SP[SP[bsp.sid].fam].name}»`)}
            </div>`
            : `<div class="dx-none"><b>${ru`Спутника нет`}</b><small>${ru`Выбери его в карточке духа: вкладка «О духе» → «Сделать спутником». Спутник ходит с тобой и находит эссенцию.`}</small></div>`)}
          ${pane('medals', `
            <div class="pf-mh"><span>${ru`Знаки Ордена`}</span><b>${Object.values(d.medals).reduce((a, b) => a + b, 0)} / ${MEDALS.length * 3}</b></div>
            <div class="pf-medals">${medalsHtml}</div>`)}
          ${pane('album', `
            <div class="pf-mh"><span>${ru`Снимки встреч`}</span><b>${Album.list().length} / ${Album.MAX}</b></div>
            <div class="album-box">${Album.html()}</div>`)}
        </div>
      </div>`, 'prof-screen det-screen');
    scr.addEventListener('click', e => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { Sfx.play('tap'); U.$$('[data-tab]', scr).forEach(x => x.classList.toggle('on', x === tb)); U.$$('.dt-pane', scr).forEach(p => p.classList.toggle('on', p.dataset.pane === tb.dataset.tab)); return; }
      const er = e.target.closest('[data-err]'); if (er) { this.toast(er.dataset.err); return; }
      const lg = e.target.closest('[data-login]'); if (lg) { Login.start(lg.dataset.login, lg.dataset.mode); return; }
      if (e.target.closest('.journal-btn')) { J.screen(); return; }
      if (e.target.closest('.clan-btn')) { Clans.choose(() => { this.closeScreen(scr); this.profile(); }); return; }
      if (e.target.closest('.clan-open')) { Clans.screen(); return; }
      if (e.target.closest('.look-btn')) {
        this.editLook(() => { scr.querySelector('.prof-ava').innerHTML = this.avatar(); this.refreshHud(); });
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
          <div class="medal-tiers">${m.tiers.map((t, i) => `<div class="${tier > i ? 'got' : ''}"><i style="background:${MEDAL_TIERS[i].color}"></i>${MEDAL_TIERS[i].name}: ${t}<small>${ru`+${MEDAL_TIERS[i].xp} опыта`}</small></div>`).join('')}</div>`,
        buttons: [{ label: ru`Закрыть` }],
      });
    });
  },
  avatar() { return Art.avatar(S.d ? S.d.look : undefined); },
  // 4.6: Гардероб Ловчего — облики-скины (за монеты или с уровнем), плащ, глаза, эмблема; примерка до сохранения
  // 4.14.1: вкладки «Фон» и «Рамка» убраны — карточки Ловчего показываются без них (выбранное остаётся в сохранении)
  editLook(done) {
    const look = { cloak: '#6d28d9', eyes: '#5eead4', emblem: 'charm', ...S.d.look };
    const DEF = { skin: 'hood', bg: 'night', frame: 'none' };
    for (const k in DEF) look[k] = look[k] || DEF[k];
    const lvl = S.d.level;
    const KIND = { skin: ru`Облик`, bg: ru`Фон`, frame: ru`Рамка` };
    let tab = 'skin';
    const scr = this.screen(ru`Гардероб`, `<div class="wd">
      <div class="wd-hero"><div class="wd-stage"><i class="wd-ring"></i><div class="wd-ava"></div></div>
        <div class="wd-cardprev pc-hero"><div class="pc-ava"><div class="wd-cp-ava"></div><span class="pc-lvl">${S.d.level}</span></div><div class="pc-id"><b class="pc-name">${U.esc(S.d.name)}</b><small>${ru`${this.rank(S.d.level)} Ордена Оберега`}</small></div></div>
        <div class="wd-title"><b class="wd-name"></b><span class="wd-rar"></span></div><p class="wd-desc"></p></div>
      <div class="seg wd-tabs"><button data-t="skin" class="on">${ru`Облики`}</button><button data-t="more">${ru`Детали`}</button></div>
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
      $('.wd-desc').textContent = x.desc || (k === 'bg' ? ru`Фон твоей карточки Ловчего — его видят все, кто её откроет: из чата, Лиги и списка друзей.` : k === 'frame' ? ru`Рамка твоей карточки Ловчего — её видят все, кто откроет карточку.` : '');
    };
    const wide = kind => kind === 'bg' || kind === 'frame';
    const cards = kind => `<div class="wd-grid ${wide(kind) ? 'wide' : ''}">${LOOK[kind].map(x => {
      const R = SKIN_RAR[x.rar || 0], own = has(kind, x), on = look[kind] === x.id, lvLock = !x.shop && !own;
      const tag = own ? (worn(kind, x.id) ? ru`✓ Надет` : on ? ru`Примеряешь` : ru`Твой`) : lvLock ? ru`с ${x.lvl} ур.` : `<span class="cur">${Art.item('zlat')}</span> ${U.fmtNum(x.shop)}`;
      return `<button class="wd-card ${on ? 'on' : ''} ${own ? 'own' : ''} ${lvLock ? 'lv' : ''} r${x.rar || 0}" data-kind="${kind}" data-id="${x.id}" data-lv="${lvLock ? x.lvl : ''}" style="--rc:${R.c}">
        ${wide(kind) ? `<span class="wd-mini" data-mini="${x.id}"><i>${Art.avatar(look)}</i></span>` : `<span class="wd-c-ava">${Art.avatar({ ...look, [kind]: x.id })}</span>`}<b>${x.name}</b><span class="wd-c-tag">${tag}</span></button>`;
    }).join('')}</div>`;
    const lockOf = (x, kind) => {
      if (kind === 'cloak') return (x.shop || x.pass) && !S.d.owned[x.c] ? (x.shop ? 'shop' : 'pass') : x.lvl > lvl ? x.lvl : '';
      if (kind === 'eyes') return x.lvl > lvl ? x.lvl : '';
      return x.league && League.view().best < x.league ? 'league' : x.pass && !S.d.owned[x.id] ? 'pass' : x.lvl > lvl ? x.lvl : '';
    };
    const swatches = (kind, title) => `<h3 class="wd-h">${title}</h3><div class="wd-sw">${LOOK[kind].map(x => {
      const v = kind === 'emblem' ? x.id : x.c, lk = lockOf(x, kind), on = look[kind] === v;
      const face = kind === 'emblem' ? `<svg viewBox="36 70 28 28" class="art">${Art.emblem(x.id)}</svg>` : '';
      return `<button class="wd-s ${kind} ${on ? 'on' : ''} ${lk !== '' ? 'locked' : ''}" data-k="${kind}" data-v="${v}" data-l="${lk}" title="${x.name}" style="--sw:${kind === 'emblem' ? '#241a45' : v}">${face}<small>${x.name}</small></button>`;
    }).join('')}</div>`;
    const body = () => {
      $('.wd-body').innerHTML = tab === 'more'
        ? (look.skin !== 'hood' ? `<p class="wd-note">${ru`Цвет плаща виден у облика «Ловчий». У особых обликов — свой наряд, а глаза и эмблема — твои.`}</p>` : '') +
          swatches('cloak', ru`Плащ`) + swatches('eyes', ru`Глаза`) + swatches('emblem', ru`Эмблема`)
        : cards(tab);
      if (tab === 'bg' || tab === 'frame') scr.querySelectorAll('.wd-mini').forEach(el => Art.cardSkin(el, { ...look, [tab]: el.dataset.mini }));
    };
    const foot = () => {
      const p = pending();
      if (p) {
        const [k, x] = p;
        // 4.14.1: кнопки Гардероба — как в карточке духа: компактные, внизу; не хватает монет — выглядит недоступной
        const zl = S.d.zlat || 0, poor = zl < x.shop;
        $('.wd-foot').innerHTML = `<button class="btn primary wd-bb wd-buy ${poor ? 'disabled' : ''}">${ru`Купить ${I18N.low(KIND[k])}`}<small><span class="cur">${Art.item('zlat')}</span> ${ru`${U.fmtNum(x.shop)} · у тебя ${U.fmtNum(zl)}`}${poor ? ` — ${ru`не хватает`}` : ''}</small></button>`;
      } else $('.wd-foot').innerHTML = saved() ? `<button class="btn ghost wd-bb wd-save wd-done">${ru`✓ Облик надет`}</button>` : `<button class="btn primary wd-bb wd-save">${ru`Надеть облик`}</button>`;
    };
    const render = () => { hero(); body(); foot(); };
    scr.addEventListener('click', async e => {
      const t = e.target.closest('.wd-tabs button');
      if (t) { tab = t.dataset.t; scr.querySelectorAll('.wd-tabs button').forEach(b => b.classList.toggle('on', b === t)); hero(); body(); return; }
      const c = e.target.closest('.wd-card');
      if (c) {
        if (c.dataset.lv) return this.toast(ru`Откроется на ${c.dataset.lv} уровне`);
        look[c.dataset.kind] = c.dataset.id; Sfx.play('tap'); render(); return;
      }
      const sw = e.target.closest('.wd-s');
      if (sw) {
        const l = sw.dataset.l;
        if (l === 'league') return this.toast(ru`Венец Лиги — награда за ранг «Хранитель Лиги»`);
        if (l === 'shop') return this.toast(ru`Этот плащ продаётся в Лавке Ордена за монеты`);
        if (l === 'pass') return this.toast(ru`Награда Золотой сезонной тропы`);
        if (l) return this.toast(ru`Откроется на ${l} уровне`);
        look[sw.dataset.k] = sw.dataset.v; Sfx.play('tap'); render(); return;
      }
      if (e.target.closest('.wd-buy')) {
        const [k, x] = pending();
        if ((S.d.zlat || 0) < x.shop) { this.toast(ru`Не хватает монет — их можно добыть в Казне Ордена`); return; }
        this.confirm(`${KIND[k]} «${x.name}»`, `${x.desc ? x.desc + '<br><br>' : ''}${ru`Цена: <b>${U.fmtNum(x.shop)}</b> монет.`}`, ru`Купить`, async () => {
          const r = await Game.try('shopBuy', { id: `${k}:${x.id}` });
          if (!r) return;
          Sfx.play('catch'); this.toast(ru`${KIND[k]} «${x.name}» — теперь твой!`, 'good'); render();
        });
        return;
      }
      if (e.target.closest('.wd-save') && !saved()) {
        const send = { cloak: look.cloak, eyes: look.eyes, emblem: look.emblem, skin: look.skin, bg: look.bg, frame: look.frame };
        if (await Game.try('look', { look: send })) { Sfx.play('levelup'); this.toast(ru`Облик надет`, 'good'); render(); done && done(); }
      }
    });
    render();
  },

  /* ---------------- НАСТРОЙКИ ---------------- */
  // 4.15: выбор языка — список на родных названиях; смена перезапускает игру
  pickLang() {
    const m = this.modal({
      title: ru`Язык игры`, cls: 'lang-modal',
      html: `<div class="list lang-list">${Object.entries(I18N.LANGS).map(([k, n]) => `<button class="row link lang-row ${k === I18N.lang ? 'on' : ''}" data-l="${k}"><div class="row-main"><b>${n}</b></div>${k === I18N.lang ? '<span class="q-ok">✓</span>' : ''}</button>`).join('')}</div>`,
      buttons: [{ label: ru`Закрыть` }],
    });
    m.querySelector('.lang-list').addEventListener('click', e => {
      const b = e.target.closest('[data-l]'); if (!b) return;
      if (b.dataset.l === I18N.lang) { m.close(); return; }
      Sfx.play('tap'); I18N.set(b.dataset.l);
    });
  },
  // 4.25.2: Поддержка — письмо на почту для обращений; в письмо сразу подставляются имя, номер Ловчего, версия и устройство
  SUPPORT_MAIL: 'urazov.buj@gmail.com',
  support() {
    Sfx.play('tap');
    const mail = this.SUPPORT_MAIL, d = S.d || {};
    const body = [ru`Опиши, что случилось или что хочешь предложить:`, '', '', '—', ru`Ловчий: ${d.name || '—'}`, ru`Номер: ${(d.pid || '—').slice(0, 12)}`,
      ru`Версия игры: ${APP_VERSION}`, ru`Устройство: ${navigator.userAgent.slice(0, 160)}`].join('\n');
    const href = `mailto:${mail}?subject=${encodeURIComponent(ru`Духолов — поддержка`)}&body=${encodeURIComponent(body)}`;
    this.modal({
      title: ru`Поддержка`, cls: 'support-modal',
      html: `<p>${ru`Нашёл ошибку, есть вопрос по игре или оплате, хочешь что-то предложить — напиши нам на почту, ответим.`}</p>
        <p class="sup-mail">${this.I.mail || '✉'} <b>${mail}</b></p>
        <p class="small">${ru`В письмо сразу добавятся имя Ловчего, версия игры и устройство — так мы быстрее разберёмся.`}</p>`,
      buttons: [
        { label: ru`Скопировать адрес`, keep: true, fn: () => { const ok = () => this.toast(ru`Адрес скопирован`, 'good'); try { navigator.clipboard.writeText(mail).then(ok, () => this.toast(mail)); } catch (e) { this.toast(mail); } } },
        { label: ru`Написать письмо`, cls: 'primary', fn: () => { location.href = href; } },
      ],
    });
  },
  settings() {
    const s = Cfg.s;
    // 3.28: разделы с заголовками, у каждого пункта — значок
    const row = (k, ico, title, sub) => `<label class="row toggle set-row"><span class="set-ico">${this.I[ico]}</span><div class="row-main"><b>${title}</b><small>${sub}</small></div><input type="checkbox" data-k="${k}" ${s[k] ? 'checked' : ''}><i></i></label>`;
    const link = (cls, ico, title, sub) => `<button class="row link set-row ${cls}"><span class="set-ico">${this.I[ico]}</span><div class="row-main"><b>${title}</b><small>${sub}</small></div><span class="set-chev">›</span></button>`;
    const sec = t => `<div class="set-h">${t}</div>`;
    const scr = this.screen(ru`Настройки`, `
      ${Game.on() ? `${sec(ru`Учётная запись`)}<div class="list acc-box"></div>` : ''}
      ${sec(ru`Язык`)}
      <div class="list"><button class="row link set-row lang-pick"><span class="set-ico">${this.I.text}</span><div class="row-main"><b>${ru`Язык игры`}${I18N.lang === 'en' ? '' : ' · Language'}</b><small>${I18N.LANGS[I18N.lang]}</small></div><span class="set-chev">›</span></button></div>
      ${sec(ru`Звук и отклик`)}
      <div class="list">
        ${row('music', 'music', ru`Музыка`, ru`Тихие мелодии Нави: на карте днём и ночью своя, у наставника — своя.`)}
        <div class="row set-row vol-row"><span class="set-ico">${this.I.sound}</span><div class="row-main"><b>${ru`Громкость музыки`}</b><div class="vol-line"><input type="range" class="vol" min="0" max="100" step="5" value="${Math.round((s.musicVol == null ? 0.6 : s.musicVol) * 100)}" aria-label="${ru`Громкость музыки`}"><span class="vol-v"></span></div></div></div>
        ${row('sound', 'sound', ru`Звук`, ru`Звуковые эффекты.`)}
        ${row('vibro', 'vibro', ru`Вибрация`, ru`Отклик при бросках и попаданиях.`)}
      </div>
      ${sec(ru`Игра`)}
      <div class="list">
        <div class="row set-row"><span class="set-ico">${this.I.hand}</span><div class="row-main"><b>${ru`Джойстик`}</b><small>${ru`Наклон — шаг, до упора — бег`}</small></div>
          <div class="seg joy-side">${[['left', ru`Слева`], ['right', ru`Справа`]].map(([k, t]) => `<button data-side="${k}" class="${(s.joySide || 'right') === k ? 'on' : ''}">${t}</button>`).join('')}</div></div>
        ${row('ar', 'camera', ru`AR-камера`, ru`Духи появляются поверх изображения с камеры.`)}
        ${row('tapThrow', 'hand', ru`Бросок одним касанием`, ru`Коснись оберега — он сам полетит в духа. Бонус кольца по-прежнему зависит от момента.`)}
        ${row('weather', 'sun', ru`Настоящая погода`, ru`Погода через Open-Meteo (координаты с точностью ~1 км). Выключено — погода Нави моделируется.`)}
        ${Cloud.configured() ? row('cloud', 'trophy', ru`Общая таблица Лиги`, ru`Показывать твоё имя, облик, уровень и звёзды в таблице сезона.`) : ''}
      </div>
      ${sec(ru`Вид`)}
      <div class="list">
        <div class="row set-row"><span class="set-ico">${this.I.map}</span><div class="row-main"><b>${ru`Тема карты`}</b><small>${ru`Авто — по солнцу: рассвет, день, закат и ночь`}</small></div>
          <div class="seg map-theme">${[['auto', ru`Авто`], ['light', ru`День`], ['dark', ru`Ночь`]].map(([k, t]) => `<button data-theme="${k}" class="${(s.mapTheme || 'auto') === k ? 'on' : ''}">${t}</button>`).join('')}</div></div>
        ${row('tilt3d', 'map', ru`Объёмная карта`, ru`Наклон камеры: дома стоят, духи поднимаются с земли. Выключи, если телефон греется.`)}
        ${row('fog', 'map', ru`Туман Нави`, ru`Всё, что дальше от тебя, скрыто дымкой: она расступается вокруг тебя и снова смыкается, когда уходишь.`)}
        ${row('bigText', 'text', ru`Крупный текст`, ru`Увеличенный шрифт в меню, карточках и подсказках.`)}
        ${row('calm', 'calm', ru`Меньше движения`, ru`Без покачиваний, мерцания и погодных эффектов.`)}
        ${row('eco', 'battery', ru`Экономия батареи`, ru`Меньше анимаций на карте и реже её обновление.`)}
        ${row('awake', 'battery', ru`Не гасить экран`, ru`Экран не гаснет, пока игра открыта: удобно на прогулке, но телефон сильнее греется и быстрее садится.`)}
      </div>
      <div class="list install-list">
        <button class="row link set-row inst-pwa hidden"><span class="set-ico">${this.I.download}</span><div class="row-main"><b>${ru`Установить на главный экран`}</b><small>${ru`Духолов откроется на весь экран, как обычное приложение`}</small></div><span class="set-chev">›</span></button>
        <a class="row link set-row inst-apk hidden" href="duholov.apk" download><span class="set-ico">${this.I.download}</span><div class="row-main"><b>${ru`Скачать APK для Android`}</b><small>${ru`Приложение-обёртка: разреши установку из этого источника`}</small></div><span class="set-chev">›</span></a>
      </div>
      ${sec(ru`Об игре`)}
      <div class="list">
        ${link('about', 'info', ru`Книга Ордена`, ru`Мир, духи и все правила игры`)}
        ${link('terms', 'info', ru`Правила игры`, ru`Соглашение, безопасность на улице, чат · 12+`)}
        ${link('privacy', 'info', ru`Персональные данные`, ru`Какие данные хранит игра и как их удалить`)}
        <button class="row link set-row reset"><span class="set-ico danger">${this.I.trash}</span><div class="row-main"><b class="danger-t">${ru`Сбросить прогресс`}</b><small>${ru`Удалить всех духов и начать заново`}</small></div><span class="set-chev">›</span></button>
        ${Game.on() ? `<button class="row link set-row del-acc"><span class="set-ico danger">${this.I.trash}</span><div class="row-main"><b class="danger-t">${ru`Удалить учётную запись`}</b><small>${ru`Прогресс, способы входа и все данные — навсегда`}</small></div></button>` : ''}
      </div>
      <div class="ver">${ru`Духолов`} · v${APP_VERSION}${Updater.IN_APP ? ` · ${ru`приложение ${Updater.APK}`}` : ''} · <button class="link-btn check-upd">${ru`Проверить обновления`}</button><br>${ru`Карта © участники OpenStreetMap`}</div>`, 'set-screen');
    scr.querySelector('.lang-pick').onclick = () => this.pickLang();
    // 4.8.1: ползунок громкости музыки — меняется сразу, сохраняется при отпускании
    const vol = scr.querySelector('.vol'), volV = scr.querySelector('.vol-v');
    const showVol = () => { volV.textContent = vol.value + '%'; vol.style.setProperty('--p', vol.value + '%'); };
    showVol();
    vol.addEventListener('input', () => { showVol(); Sfx.init(); Music.setVolume(vol.value / 100); });
    vol.addEventListener('change', () => Cfg.save());
    scr.addEventListener('change', e => {
      const k = e.target.dataset.k; if (!k) return;
      s[k] = e.target.checked; Cfg.save();
      if (k === 'sound' && s.sound) { Sfx.init(); Sfx.play('tap'); }
      if (k === 'weather') Sky.update(true);
      if (k === 'music') { Sfx.init(); Music.apply(); }
      if (k === 'eco') document.body.classList.toggle('eco', s.eco);
      if (k === 'bigText' || k === 'calm') this.applyA11y();
      if (k === 'tilt3d') MapView.setTilt(s.tilt3d);
      if (k === 'fog') Fog.apply();
      if (k === 'awake') Awake.apply();
    });
    // 5.1: джойстик слева или справа
    scr.querySelector('.joy-side').addEventListener('click', e => {
      const b = e.target.closest('[data-side]'); if (!b) return;
      Sfx.play('tap'); s.joySide = b.dataset.side; Cfg.save();
      U.$$('[data-side]', scr).forEach(x => x.classList.toggle('on', x === b));
      Walk.side();
    });
    scr.querySelector('.map-theme').addEventListener('click', e => {
      const b = e.target.closest('[data-theme]'); if (!b) return;
      s.mapTheme = b.dataset.theme; Cfg.save();
      U.$$('[data-theme]', scr).forEach(x => x.classList.toggle('on', x === b));
      MapView._look = null; MapView.setTiles();
    });
    // установка: кнопка PWA (если браузер предложил) и APK (если он собран и лежит рядом с сайтом)
    const pwa = scr.querySelector('.inst-pwa'), apk = scr.querySelector('.inst-apk');
    if (window.__installPrompt) pwa.classList.remove('hidden');
    scr.querySelector('.check-upd').onclick = async () => {
      await Updater.check(true);
      if (!Updater.shown) this.toast(ru`У тебя последняя версия — ${APP_VERSION}`, 'good');
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
      const addRows = guest ? '' : avail.map(k => way(Login.icon(k), Login.NAMES[k], ru`ещё один способ входа`,
        `<button class="btn acc-link" data-login="${k}" data-mode="link">${ru`Привязать`}</button>`)).join('');
      acc.innerHTML = `<div class="acc-hero ${guest ? 'guest' : ''}" style="--cc:${d.clan && CLANS[d.clan] ? CLANS[d.clan].color : '#fbbf24'}">
          <div class="pc-ava"><div class="acc-ava">${Art.avatar(d.look)}</div><span class="pc-lvl">${d.level}</span></div>
          <div class="acc-main"><b>${U.esc(d.name)}</b><small>${ru`${this.rank(d.level)} · ${d.level} уровень`}</small>
            <span class="acc-status ${guest ? 'warn' : 'ok'}">${guest ? `${this.I.user}${ru`Гость · только на этом устройстве`}` : `${this.I.cloud}${ru`Прогресс в облаке`}`}</span></div>
        </div>`
        + (links.length || Login.email ? `<div class="acc-ways"><div class="acc-cap">${ru`Способы входа`}</div>${Login.email ? way(`<span class="lg-ic mail">${this.I.mail}</span>`, ru`Почта`, U.esc(Login.email)) : ''}${links.map(l => way(Login.icon(l.provider), Login.NAMES[l.provider], l.name ? U.esc(l.name) : ru`вход привязан`)).join('')}${addRows}</div>` : '')
        + (guest && avail.length ? `<div class="acc-add"><small>${ru`Привяжи вход — прогресс откроется на любом устройстве`}</small><div class="login-row">${Login.buttons('link', avail)}</div></div>` : '')
        + (Updater.oldApp() ? `<div class="acc-add"><small>${guest ? ru`<b>Новое приложение Духолов.</b> Игра переехала на duholov.ru — приложение нужно поставить заново: <b>сначала привяжи вход выше</b> (иначе прогресс гостя пропадёт), потом удали это приложение и установи новое.` : ru`<b>Новое приложение Духолов.</b> Игра переехала на duholov.ru — приложение нужно поставить заново: удали это приложение и установи новое.`}</small><a class="btn primary" href="duholov.apk">${ru`Скачать новое приложение`}</a></div>` : '')
        + `<button class="row link set-row acc-out"><span class="set-ico out">${this.I.logout}</span><div class="row-main"><b>${ru`Выйти из учётной записи`}</b><small>${guest ? ru`Прогресс гостя будет потерян` : ru`Вернуться можно тем же входом`}</small></div><span class="set-chev">›</span></button>`;
      acc.querySelectorAll('[data-login]').forEach(b => { b.onclick = () => Login.start(b.dataset.login, b.dataset.mode); });
      acc.querySelector('.acc-out').onclick = () => Login.askSignOut();
    };
    renderAcc();
    Login.load().then(renderAcc);
    scr.querySelector('.about').onclick = () => Book.screen(); // 4.0: вместо списка «Об игре»
    scr.querySelector('.terms').onclick = () => UI.doc(ru`Правила игры`, 'terms.html');
    scr.querySelector('.privacy').onclick = () => UI.doc(ru`Персональные данные`, 'privacy.html');
    // 4.1: полное удаление учётной записи (152-ФЗ) — после двух подтверждений; платежи остаются без привязки
    const del = scr.querySelector('.del-acc');
    if (del) del.onclick = () => this.confirm(ru`Удалить учётную запись?`, ru`Прогресс, духи, способы входа, место в Лиге и лоты аукциона будут удалены навсегда. Купленные монеты не вернутся.`, ru`Удалить`, () => {
      this.confirm(ru`Точно удалить?`, ru`Восстановить учётную запись будет нельзя.`, ru`Да, удалить навсегда`, async () => {
        try { await Game.auth('delete', { confirm: 'УДАЛИТЬ' }); } catch (e) { UI.toast(U.esc(I18N.back(e.message))); return; }
        try { localStorage.removeItem(CLOUD_CONFIG.auth); } catch (e) {}
        location.reload();
      }, ru`Нет`, true);
    }, ru`Отмена`, true); // 4.25: удаление — красной кнопкой уже на первом шаге (как «Сбросить прогресс?»)
    scr.querySelector('.reset').onclick = () => this.confirm(ru`Сбросить прогресс?`, ru`Все духи, предметы и уровень будут удалены с сервера навсегда.`, ru`Сбросить`, () => {
      this.confirm(ru`Точно?`, ru`Это действие нельзя отменить.`, ru`Да, сбросить`, async () => {
        if (await Game.try('reset')) location.reload();
      }, ru`Нет`, true);
    }, ru`Отмена`, true);
  },
});
