'use strict';
/* Кланы: Святилища под знаменем. Кто и где держит Святилища — сводка с сервера (shrines_in_box),
   бои, защитников и дань ведёт сервер игры.
   3.5: три дружины. 4.28: клан — мифология (data.js, CLANS): открыт клан открытой мифологии, клан следующего сезона — «?».
   Прежние дружины перешли в кланы (CLAN_OLD), у их Ловчих — один бесплатный переход (S.d.clanFree, clanMove). */

const Clans = {
  map: {},      // id Святилища → { clan, since, holders: [{ name, sp, t }] }
  box: null,    // прямоугольник, для которого загружена сводка
  t: 0,
  TTL: 3 * 60000,
  SEEN_MOVE: 'duholov.clanMove', // объявление «Дружины стали кланами» уже показано на этом телефоне

  info(id) { return this.map[id] || null; },
  badge(clan, small) {
    const c = CLANS[clan];
    return c ? `<span class="clan-badge ${small ? 'sm' : ''}" style="--cc:${c.color}"><i></i>${c.short}</span>` : '';
  },
  // «×1,5» — дань со святилищ мифологии своего клана (Rules.HOLD.MYTH)
  mythX() { return '×' + Rules.HOLD.MYTH.toLocaleString(I18N.locale); },
  // Святилище — святилище мифологии моего клана (дань там ×1,5)
  mine(p) { return !!(S.d && S.d.clan && W.placeMyth(p) === S.d.clan); }, // p — { id, lat, lng }: 5.1.26 мифология места — по его родине

  // Сводка занятых Святилищ вокруг игрока (раз в 3 минуты и после боёв)
  async refresh(force) {
    const pos = MapView.pos;
    if (!pos || !Game.on() || this._busy) return;
    const inBox = this.box && pos.lat > this.box[0] + 0.01 && pos.lat < this.box[2] - 0.01 && pos.lng > this.box[1] + 0.02 && pos.lng < this.box[3] - 0.02;
    if (!force && inBox && Date.now() - this.t < this.TTL) return;
    this._busy = true;
    try {
      const d = 0.03, dl = d / Math.max(0.2, Math.cos(pos.lat * Math.PI / 180));
      const box = [pos.lat - d, pos.lng - dl, pos.lat + d, pos.lng + dl];
      const sb = await Cloud.client();
      const { data, error } = await sb.rpc('shrines_in_box', { s: box[0], w: box[1], n: box[2], e: box[3] });
      if (error) throw new Error(error.message);
      const m = {};
      // 4.28: до миграции 032 в базе бывают прежние дружины (sokol…) — clanOf ведёт их к кланам мифологий
      (data || []).forEach(r => { const k = clanOf(r.clan); if (k && !Rules.shrineFree(r.id)) m[r.id] = { clan: k, since: r.since, holders: Array.isArray(r.holders) ? r.holders : [] }; });
      this.map = m; this.box = box; this.t = Date.now();
      MapView.refresh();
    } catch (e) { console.warn('Кланы:', e.message); }
    this._busy = false;
  },

  /* ---------- выбор клана: открытые кланы и «?» — клан мифологии следующего сезона ---------- */
  open() { Ev.alaSync(); return MYTH_KEYS.filter(k => CLANS[k]); },
  pickHtml(cur) {
    const s = Ev.alaSeason();
    return `<div class="clan-pick">${this.open().map(k => { const c = CLANS[k]; return `<button class="clan-opt ${k === cur ? 'mine' : ''}" data-k="${k}" style="--cc:${c.color}">
        <span class="clan-crest">${Art.clanCrest(k)}</span><b>${c.name}</b><small>${k === cur ? ru`твой клан` : `${MYTHS[k].name} · ${c.member}`}</small><i class="clan-go"></i></button>`; }).join('')}
      <button class="clan-opt clan-q" data-k="?" style="--cc:#8b8aa8"><span class="clan-crest">${Art.clanCrest('?')}</span><b>${ru`Клан «?»`}</b><small>${ru`откроется в сезоне ${s + 1}`}</small><i class="clan-go"></i></button></div>`;
  },
  bindPick(m, fn) {
    m.querySelector('.clan-pick').addEventListener('click', e => {
      const b = e.target.closest('.clan-opt'); if (!b) return;
      Sfx.play('tap');
      if (b.dataset.k === '?') { UI.toast(ru`Клан мифологии следующего сезона. Он откроется, когда Орден соберёт Алатырь-камень и Кощей снова расколет его.`); return; }
      fn(b.dataset.k);
    });
  },
  // Выбор клана — один раз (тем, кто был в дружине до 4.28, — ещё один бесплатный переход)
  choose(done) {
    if (S.d.clan) { done && done(); return; }
    if (S.d.level < CLAN_LEVEL) { UI.toast(ru`Клан можно выбрать с ${CLAN_LEVEL} уровня`); return; }
    const m = UI.modal({
      title: ru`Выбери клан`, cls: 'clan-modal',
      html: `<p class="small">${ru`У каждой мифологии Перепутицы — свой клан Ордена. Кланы держат Святилища: поставь своего духа защитником — и Святилище окрасится цветом твоего клана, а тебе каждый день будет приходить дань. Выбор — навсегда.`}</p>
        ${this.pickHtml()}`,
      buttons: [{ label: ru`Позже` }],
    });
    this.bindPick(m, k => this.card(k, 'join', () => { m.close && m.close(); done && done(); }));
  },

  // Карточка клана: герб, мифология, звание, девиз, кто они. mode: 'join' — вступить, 'move' — перейти, иначе — просмотр
  cardHtml(k, mode) {
    const c = CLANS[k];
    const note = mode === 'join' ? ru`Выбор — навсегда: сменить клан потом нельзя.`
      : mode === 'move' ? ru`Переход бесплатный и единственный. Защитники достоят свой срок в Святилищах прежнего клана, чат — уже нового.` : '';
    return `<div class="clan-card" style="--cc:${c.color}">
        <span class="clan-crest">${Art.clanCrest(k)}</span>
        <b class="cc-name">${c.name}</b>
        <div class="cc-motto">«${c.motto}»</div>
        <div class="cc-tags"><span>${ru`Мифология: ${MYTHS[k].name}`}</span><span>${ru`Звание: ${c.member}`}</span></div>
        <p class="cc-desc">${c.desc}</p>
        <div class="cc-bonus">${ru`На святилищах своей мифологии (${MYTH_PLACES[k] ? I18N.low(MYTH_PLACES[k].shrine) : ''}) защитники клана собирают дань ${this.mythX()}.`}</div>
        ${note ? `<p class="small cc-note">${note}</p>` : ''}
      </div>`;
  },
  card(k, mode, done) {
    const c = CLANS[k];
    if (!c) return;
    const act = mode === 'join' ? () => this.join(k, done) : mode === 'move' ? () => this.move(k, done) : null;
    UI.modal({
      cls: 'clan-modal clan-card-modal', html: this.cardHtml(k, mode),
      buttons: act ? [{ label: ru`Назад` }, { label: mode === 'move' ? ru`Перейти` : ru`Вступить`, cls: 'primary', fn: act }] : [{ label: ru`Закрыть` }],
    });
  },
  async join(k, done) {
    const c = CLANS[k], r = await Game.try('clanJoin', { clan: k });
    if (!r) return;
    Sfx.play('notice');
    UI.toast(ru`Ты в «${c.name}»! Побеждай в Святилищах и ставь защитников.`, 'good');
    UI.refreshHud();
    this.refresh(true);
    done && done();
  },
  async move(k, done) {
    const c = CLANS[k], r = await Game.try('clanMove', { clan: k });
    if (!r) return;
    Sfx.play('notice');
    UI.toast(ru`Теперь ты в «${c.name}». Добро пожаловать, ${c.member}!`, 'good');
    UI.refreshHud();
    this.refresh(true);
    done && done();
  },

  /* ---------- 4.28: «Дружины стали кланами мифологий» — объявление и бесплатный переход ---------- */
  // один раз на телефоне, пока переход не использован (зовёт Alatyr.announce — одно окно за раз)
  moveShow() {
    if (!S.d || !S.d.clan || !(S.d.clanFree > 0) || !CLANS[S.d.clan]) return false;
    try { if (localStorage.getItem(this.SEEN_MOVE)) return false; localStorage.setItem(this.SEEN_MOVE, '1'); } catch (e) { if (this._moveSeen) return false; }
    this._moveSeen = true;
    this.moveOffer();
    return true;
  },
  moveOffer(done) {
    if (!S.d.clan || !(S.d.clanFree > 0)) return;
    const cur = S.d.clan, c = CLANS[cur];
    const m = UI.modal({
      title: ru`Дружины стали кланами`, cls: 'clan-modal clan-move-modal',
      html: `<p class="small">${ru`Орден собрал Ловчих всех земель: теперь у каждой мифологии свой клан, а с каждым новым сезоном Алатыря приходит ещё один.`}</p>
        <div class="clan-now" style="--cc:${c.color}"><span class="clan-crest">${Art.clanCrest(cur)}</span>
          <div><small>${ru`Твоя дружина теперь —`}</small><b>${c.name}</b><small>${ru`Защитники в Святилищах и чат клана остались с тобой.`}</small></div></div>
        <p class="small">${ru`Один раз можно бесплатно перейти в любой открытый клан. Выбери его — или останься. Перейти можно и позже, на экране клана.`}</p>
        ${this.pickHtml(cur)}`,
      buttons: [{ label: ru`Остаться`, cls: 'primary' }],
    });
    this.bindPick(m, k => (k === cur ? this.card(k) : this.card(k, 'move', () => { m.close && m.close(); done && done(); })));
  },

  // Выбор духа-защитника и отправка в Святилище
  defend(e, done) {
    const list = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 40);
    const own = (e.myth || W.placeMyth(e)) === S.d.clan;
    const m = UI.modal({
      title: ru`Кого поставить защитником?`, cls: 'defend-modal',
      html: `<p class="small">${ru`Дух останется у тебя: в Святилище встанет его отражение. Пока он стоит, раз в день приходит дань — ✦ ${TRIBUTE.sparks} и оберег.`}
        ${ru`Отражение стоит до ${Rules.HOLD.MAX_H / 24} суток: первые ${Rules.HOLD.FRESH_H} ч в полной силе, потом устаёт и слабеет, а затем возвращается домой. Защитники — не больше чем на ${HOLD_MY_MAX} Святилищах.`}
        ${own ? `<b>${ru`Это святилище мифологии твоего клана — дань здесь ${this.mythX()}.`}</b>` : ''}</p>
        <div class="defend-list">${list.map(sp => `<button class="mini defend-sp" data-uid="${sp.uid}">${Art.imgOf(sp)}<b>${S.power(sp)}</b><small>${U.esc(sp.nick || SP[sp.sid].name)}</small></button>`).join('')}</div>`,
      buttons: [{ label: ru`Отмена` }],
    });
    m.querySelector('.defend-list').addEventListener('click', async ev => {
      const b = ev.target.closest('.defend-sp'); if (!b || this._defending) return;
      this._defending = true;
      const r = await Game.try('shrineDefend', { shrine: { id: e.id, lat: e.lat, lng: e.lng, name: e.name }, uid: b.dataset.uid });
      this._defending = false;
      if (!r) return;
      m.close && m.close();
      Sfx.play('success');
      UI.toast(ru`Защитник встал в Святилище «${U.esc(e.name)}» — оно под знаменем «${CLANS[r.clan].name}»`, 'good');
      await this.refresh(true);
      done && done();
    });
  },

  // Не вернулись ли защитники (их прогнали соперники) — раз в несколько минут
  async checkGuards(force) {
    if (!S.d || !S.d.clan || this._guards || (!force && Date.now() - (this._gt || 0) < 4 * 60000)) return this.guards;
    this._guards = true; this._gt = Date.now();
    try {
      const r = await Game.act('myGuards');
      this.guards = r.list;
      if (r.back.length) {
        Sfx.play('sad');
        const names = r.back.map(g => `«${U.esc(g.name)}»`).join(', ');
        const got = r.got.map(x => `${I18N.back(x.label)} +${x.n}`).join(', ');
        UI.toast(r.back.every(g => g.tired) ? ru`Срок на посту вышел — защитники вернулись с ${names}. За службу: ${got}`
          : r.back.length > 1 ? ru`Защитники вернулись с ${names}: соперники победили. За службу: ${got}` : ru`Защитник вернулся с ${names}: соперники победили. За службу: ${got}`);
        this.refresh(true);
      }
    } catch (e) { /* позже */ }
    this._guards = false;
    return this.guards;
  },

  // Экран клана: кто мы, мои защитники и сколько Святилищ у каждого клана
  async screen() {
    if (!S.d.clan) { this.choose(() => this.screen()); return; }
    const k0 = S.d.clan, c = CLANS[k0];
    const scr = UI.screen(ru`Клан`, `<div class="clan-view" style="--cc:${c.color}">
        <button class="clan-head" aria-label="${c.name}"><span class="clan-crest">${Art.clanCrest(k0)}</span><div><b>${c.name}</b><small>«${c.motto}»</small>
          <small class="ch-rank">${ru`Ты — ${c.member} · мифология: ${MYTHS[k0].name}`}</small></div></button>
        ${S.d.clanFree > 0 ? `<button class="btn ghost wide clan-move">${ru`Сменить клан — бесплатно, один раз`}</button>` : ''}
        <div class="clan-body"><div class="empty">${ru`Узнаём, как дела у кланов…`}</div></div>
      </div>`, 'clan-screen');
    scr.querySelector('.clan-head').onclick = () => { Sfx.play('tap'); this.card(k0); };
    const mv = scr.querySelector('.clan-move');
    if (mv) mv.onclick = () => { Sfx.play('tap'); this.moveOffer(() => { UI.closeScreen(scr); this.screen(); }); };
    let stats = null;
    const [guards] = await Promise.all([this.checkGuards(true), Game.act('clanStats').then(r => { stats = r; }).catch(() => {})]);
    if (!scr.isConnected) return;
    const pos = MapView.pos, list = guards || [];
    // 4.28: кланов 7+ — строки по числу Святилищ (мой клан всегда виден), имя — короткое
    const bars = (counts, title) => {
      if (!counts) return '';
      const keys = this.open().sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
      const max = Math.max(1, ...keys.map(k => counts[k] || 0));
      return `<div class="clan-stat"><div class="o-sub">${title}</div>${keys.map(k => { const x = CLANS[k]; return `
        <div class="clan-row ${k === S.d.clan ? 'mine' : ''}" style="--cc:${x.color}"><span><i class="cr-dot"></i>${x.short}</span><div class="clan-bar"><i style="width:${(counts[k] || 0) / max * 100}%"></i></div><b>${U.fmtNum(counts[k] || 0)}</b></div>`; }).join('')}</div>`;
    };
    const guardRow = g => {
      const d = pos ? U.dist(pos.lat, pos.lng, g.lat, g.lng) : null;
      const h = g.t ? Math.max(0, (U.now() - g.t) / 3600000) : 0;
      return `<div class="row guard-row" data-id="${U.esc(g.id)}"><div class="row-ico">${g.sp && SP[g.sp.sid] ? Art.imgOf(g.sp) : ''}</div>
        <div class="row-main"><b>${U.esc(g.name)}</b><small>${ru`на посту ${h < 1 ? ru`меньше часа` : ru`${Math.floor(h)} ч`} · защитников ${g.n} из ${HOLD_MAX}`}${d != null ? ` · ${U.fmtDist(d)}` : ''}</small>
          <small>${h >= Rules.HOLD.FRESH_H ? ru`устал: уровень −${Math.round((1 - Rules.holdK(g.t, U.now())) * 100)}% · домой через ${Math.max(1, Math.ceil(Rules.HOLD.MAX_H - h))} ч` : ru`в полной силе ещё ${Math.max(1, Math.ceil(Rules.HOLD.FRESH_H - h))} ч`}</small>
          ${this.mine(g) ? `<small class="gr-own">${ru`святилище твоей мифологии · дань ${this.mythX()}`}</small>` : ''}</div>
        <button class="btn small ghost show-guard">${ru`Показать`}</button></div>`;
    };
    scr.querySelector('.clan-body').innerHTML = `
      ${bars(stats && stats.near, ru`Святилища рядом (≈5 км)`)}
      ${bars(stats && stats.all, ru`Святилища по всему свету`)}
      <h3 class="prof-h">${ru`Мои защитники`} <small>${ru`${list.length} из ${HOLD_MY_MAX}`}</small></h3>
      <div class="list">${list.map(guardRow).join('') || `<div class="row"><div class="row-main"><small>${ru`Пока нигде. Победи в Святилище и поставь защитника — каждый день будет приходить дань.`}</small></div></div>`}</div>
      <div class="q-note">${ru`Дань — ✦ ${TRIBUTE.sparks}, оберег и ${Rules.ZLAT.tribute} ${U.plural(Rules.ZLAT.tribute, ru`монета`, ru`монеты`, ru`монет`)} в день за каждое Святилище, где твой защитник отстоял хотя бы ${Rules.HOLD.TRIBUTE_H} ч. Защитник стоит до ${Rules.HOLD.MAX_H / 24} суток и понемногу устаёт; если соперники его победят или срок выйдет, он вернётся с искрами за время на посту. Часть Святилищ — вольные: их не держит ни один клан.`}
        ${ru`На святилищах мифологии твоего клана искры и обереги дани — ${this.mythX()}.`}</div>`;
    scr.querySelector('.clan-body').addEventListener('click', e => {
      const row = e.target.closest('.guard-row');
      if (!row || !e.target.closest('.show-guard')) return;
      const g = list.find(x => x.id === row.dataset.id);
      if (!g) return;
      UI.closeScreen(scr);
      for (let i = 0; i < 5 && UI.blocking(); i++) UI.back(); // закрыть профиль и меню — к карте
      MapView.track({ id: g.id, type: 'shrine', lat: g.lat, lng: g.lng, name: g.name });
      UI.toast(ru`Следопыт ведёт к Святилищу «${U.esc(g.name)}»`);
    });
  },

  // Дань со Святилищ — раз в день, вместе с наградой за серию дней
  async tribute() {
    if (!S.d || !S.d.clan || S.d.tributeDay === U.today() || S.d.tributeNext > U.now() || this._tribute) return;
    this._tribute = true;
    try {
      const r = await Game.act('tribute');
      if (r && r.n) UI.toast(ru`Дань со Святилищ (${r.n}): ${r.got.map(x => `${I18N.back(x.label)} +${x.n}`).join(', ')}`, 'good'); // 5.1.29: без форм числа — «Святилища» в словарях только множественное
    } catch (e) { /* позже */ }
    this._tribute = false;
  },
};
