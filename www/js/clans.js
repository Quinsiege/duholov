'use strict';
/* Дружины (3.5): Капища под знаменем. Кто и где держит Капища — сводка с сервера (shrines_in_box),
   бои, защитников и дань ведёт сервер игры. */

const Clans = {
  map: {},      // id Капища → { clan, since, holders: [{ name, sp, t }] }
  box: null,    // прямоугольник, для которого загружена сводка
  t: 0,
  TTL: 3 * 60000,

  info(id) { return this.map[id] || null; },
  badge(clan, small) {
    const c = CLANS[clan];
    return c ? `<span class="clan-badge ${small ? 'sm' : ''}" style="--cc:${c.color}"><i></i>${c.short}</span>` : '';
  },

  // Сводка занятых Капищ вокруг игрока (раз в 3 минуты и после боёв)
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
      (data || []).forEach(r => { if (CLANS[r.clan] && !Rules.shrineFree(r.id)) m[r.id] = { clan: r.clan, since: r.since, holders: Array.isArray(r.holders) ? r.holders : [] }; });
      this.map = m; this.box = box; this.t = Date.now();
      MapView.refresh();
    } catch (e) { console.warn('Дружины:', e.message); }
    this._busy = false;
  },

  // Выбор дружины — один раз
  choose(done) {
    if (S.d.clan) { done && done(); return; }
    if (S.d.level < CLAN_LEVEL) { UI.toast(ru`Дружину можно выбрать с ${CLAN_LEVEL} уровня`); return; }
    const m = UI.modal({
      title: ru`Выбери дружину`, cls: 'clan-modal',
      html: `<p class="small">${ru`Дружины Ордена держат Капища: поставь своего духа защитником — и Капище окрасится цветом твоей дружины, а тебе каждый день будет приходить дань. Выбор — навсегда.`}</p>
        <div class="clan-pick">${Object.entries(CLANS).map(([k, c]) => `<button class="clan-opt" data-k="${k}" style="--cc:${c.color}"><span class="clan-crest">${Art.clanCrest(k)}</span><b>${c.name}</b><small>${c.motto}</small><i class="clan-go"></i></button>`).join('')}</div>`,
      buttons: [{ label: ru`Позже` }],
    });
    m.querySelector('.clan-pick').addEventListener('click', e => {
      const b = e.target.closest('.clan-opt'); if (!b) return;
      const c = CLANS[b.dataset.k];
      UI.confirm(c.name, ru`Вступить в «${c.name}»? Сменить дружину потом нельзя.`, ru`Вступить`, async () => {
        const r = await Game.try('clanJoin', { clan: b.dataset.k });
        if (!r) return;
        m.close && m.close();
        Sfx.play('levelup');
        UI.toast(ru`Ты в «${c.name}»! Побеждай на Капищах и ставь защитников.`, 'good');
        UI.refreshHud();
        done && done();
      });
    });
  },

  // Выбор духа-защитника и отправка на Капище
  defend(e, done) {
    const list = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 40);
    const m = UI.modal({
      title: ru`Кого поставить защитником?`, cls: 'defend-modal',
      html: `<p class="small">${ru`Дух останется у тебя: на Капище встанет его отражение. Пока он стоит, раз в день приходит дань — ✦ ${TRIBUTE.sparks} и оберег.`}
        ${ru`Отражение стоит до ${Rules.HOLD.MAX_H / 24} суток: первые ${Rules.HOLD.FRESH_H} ч в полной силе, потом устаёт и слабеет, а затем возвращается домой. Защитники — не больше чем на ${HOLD_MY_MAX} Капищах.`}</p>
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
      Sfx.play('levelup');
      UI.toast(ru`Защитник встал на Капище «${U.esc(e.name)}» — оно под знаменем «${CLANS[r.clan].name}»`, 'good');
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
        Sfx.play('miss');
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

  // Экран дружины: мои защитники и сколько Капищ у каждой дружины
  async screen() {
    if (!S.d.clan) { this.choose(() => this.screen()); return; }
    const c = CLANS[S.d.clan];
    const scr = UI.screen(ru`Дружина`, `<div class="clan-view" style="--cc:${c.color}">
        <div class="clan-head"><span class="clan-crest">${Art.clanCrest(S.d.clan)}</span><div><b>${c.name}</b><small>${c.motto}</small></div></div>
        <div class="clan-body"><div class="empty">${ru`Узнаём, как дела у дружин…`}</div></div>
      </div>`, 'clan-screen');
    let stats = null;
    const [guards] = await Promise.all([this.checkGuards(true), Game.act('clanStats').then(r => { stats = r; }).catch(() => {})]);
    if (!scr.isConnected) return;
    const pos = MapView.pos, list = guards || [];
    const bars = (counts, title) => {
      if (!counts) return '';
      const max = Math.max(1, ...Object.values(counts));
      return `<div class="clan-stat"><div class="o-sub">${title}</div>${Object.entries(CLANS).map(([k, x]) => `
        <div class="clan-row ${k === S.d.clan ? 'mine' : ''}" style="--cc:${x.color}"><span>${x.short}</span><div class="clan-bar"><i style="width:${counts[k] / max * 100}%"></i></div><b>${U.fmtNum(counts[k] || 0)}</b></div>`).join('')}</div>`;
    };
    const guardRow = g => {
      const d = pos ? U.dist(pos.lat, pos.lng, g.lat, g.lng) : null;
      const h = g.t ? Math.max(0, (U.now() - g.t) / 3600000) : 0;
      return `<div class="row guard-row" data-id="${U.esc(g.id)}"><div class="row-ico">${g.sp && SP[g.sp.sid] ? Art.imgOf(g.sp) : ''}</div>
        <div class="row-main"><b>${U.esc(g.name)}</b><small>${ru`на посту ${h < 1 ? ru`меньше часа` : ru`${Math.floor(h)} ч`} · защитников ${g.n} из ${HOLD_MAX}`}${d != null ? ` · ${U.fmtDist(d)}` : ''}</small>
          <small>${h >= Rules.HOLD.FRESH_H ? ru`устал: уровень −${Math.round((1 - Rules.holdK(g.t, U.now())) * 100)}% · домой через ${Math.max(1, Math.ceil(Rules.HOLD.MAX_H - h))} ч` : ru`в полной силе ещё ${Math.max(1, Math.ceil(Rules.HOLD.FRESH_H - h))} ч`}</small></div>
        <button class="btn small ghost show-guard">${ru`Показать`}</button></div>`;
    };
    scr.querySelector('.clan-body').innerHTML = `
      ${bars(stats && stats.near, ru`Капища рядом (≈5 км)`)}
      ${bars(stats && stats.all, ru`Капища по всей России`)}
      <h3 class="prof-h">${ru`Мои защитники`} <small>${ru`${list.length} из ${HOLD_MY_MAX}`}</small></h3>
      <div class="list">${list.map(guardRow).join('') || `<div class="row"><div class="row-main"><small>${ru`Пока нигде. Победи на Капище и поставь защитника — каждый день будет приходить дань.`}</small></div></div>`}</div>
      <div class="q-note">${ru`Дань — ✦ ${TRIBUTE.sparks}, оберег и ${Rules.ZLAT.tribute} ${U.plural(Rules.ZLAT.tribute, ru`златник`, ru`златника`, ru`златников`)} в день за каждое Капище, где твой защитник отстоял хотя бы ${Rules.HOLD.TRIBUTE_H} ч. Защитник стоит до ${Rules.HOLD.MAX_H / 24} суток и понемногу устаёт; если соперники его победят или срок выйдет, он вернётся с искрами за время на посту. Часть Капищ — вольные: их не держит ни одна дружина.`}</div>`;
    scr.querySelector('.clan-body').addEventListener('click', e => {
      const row = e.target.closest('.guard-row');
      if (!row || !e.target.closest('.show-guard')) return;
      const g = list.find(x => x.id === row.dataset.id);
      if (!g) return;
      UI.closeScreen(scr);
      for (let i = 0; i < 5 && UI.blocking(); i++) UI.back(); // закрыть профиль и меню — к карте
      MapView.track({ id: g.id, type: 'shrine', lat: g.lat, lng: g.lng, name: g.name });
      UI.toast(ru`Следопыт ведёт к Капищу «${U.esc(g.name)}»`);
    });
  },

  // Дань с Капищ — раз в день, вместе с наградой за серию дней
  async tribute() {
    if (!S.d || !S.d.clan || S.d.tributeDay === U.today() || S.d.tributeNext > U.now() || this._tribute) return;
    this._tribute = true;
    try {
      const r = await Game.act('tribute');
      if (r && r.n) UI.toast(ru`Дань с ${r.n} ${U.plural(r.n, ru`Капища`, ru`Капищ`, ru`Капищ`)}: ${r.got.map(x => `${I18N.back(x.label)} +${x.n}`).join(', ')}`, 'good');
    } catch (e) { /* позже */ }
    this._tribute = false;
  },
};
