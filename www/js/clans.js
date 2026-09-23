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
      (data || []).forEach(r => { if (CLANS[r.clan]) m[r.id] = { clan: r.clan, since: r.since, holders: Array.isArray(r.holders) ? r.holders : [] }; });
      this.map = m; this.box = box; this.t = Date.now();
      MapView.refresh();
    } catch (e) { console.warn('Дружины:', e.message); }
    this._busy = false;
  },

  // Выбор дружины — один раз
  choose(done) {
    if (S.d.clan) { done && done(); return; }
    if (S.d.level < CLAN_LEVEL) { UI.toast(`Дружину можно выбрать с ${CLAN_LEVEL} уровня`); return; }
    const m = UI.modal({
      title: 'Выбери дружину', cls: 'clan-modal',
      html: `<p class="small">Дружины Ордена держат Капища: поставь своего духа защитником — и Капище окрасится цветом твоей дружины, а тебе каждый день будет приходить дань. Выбор — навсегда.</p>
        <div class="clan-pick">${Object.entries(CLANS).map(([k, c]) => `<button class="clan-opt" data-k="${k}" style="--cc:${c.color}"><i></i><b>${c.name}</b><small>${c.motto}</small></button>`).join('')}</div>`,
      buttons: [{ label: 'Позже' }],
    });
    m.querySelector('.clan-pick').addEventListener('click', e => {
      const b = e.target.closest('.clan-opt'); if (!b) return;
      const c = CLANS[b.dataset.k];
      UI.confirm(c.name, `Вступить в «${c.name}»? Сменить дружину потом нельзя.`, 'Вступить', async () => {
        const r = await Game.try('clanJoin', { clan: b.dataset.k });
        if (!r) return;
        m.close && m.close();
        Sfx.play('levelup');
        UI.toast(`Ты в «${c.name}»! Побеждай на Капищах и ставь защитников.`, 'good');
        UI.refreshHud();
        done && done();
      });
    });
  },

  // Выбор духа-защитника и отправка на Капище
  defend(e, done) {
    const list = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 40);
    const m = UI.modal({
      title: 'Кого поставить защитником?', cls: 'defend-modal',
      html: `<p class="small">Дух останется у тебя: на Капище встанет его отражение. Пока он стоит, раз в день приходит дань — ✦ ${TRIBUTE.sparks} и оберег.</p>
        <div class="defend-list">${list.map(sp => `<button class="mini defend-sp" data-uid="${sp.uid}">${Art.imgOf(sp)}<b>${S.power(sp)}</b><small>${U.esc(sp.nick || SP[sp.sid].name)}</small></button>`).join('')}</div>`,
      buttons: [{ label: 'Отмена' }],
    });
    m.querySelector('.defend-list').addEventListener('click', async ev => {
      const b = ev.target.closest('.defend-sp'); if (!b || this._defending) return;
      this._defending = true;
      const r = await Game.try('shrineDefend', { shrine: { id: e.id, lat: e.lat, lng: e.lng, name: e.name }, uid: b.dataset.uid });
      this._defending = false;
      if (!r) return;
      m.close && m.close();
      Sfx.play('levelup');
      UI.toast(`Защитник встал на Капище «${U.esc(e.name)}» — оно под знаменем «${CLANS[r.clan].name}»`, 'good');
      await this.refresh(true);
      done && done();
    });
  },

  // Дань с Капищ — раз в день, вместе с наградой за серию дней
  async tribute() {
    if (!S.d || !S.d.clan || S.d.tributeDay === U.today() || this._tribute) return;
    this._tribute = true;
    try {
      const r = await Game.act('tribute');
      if (r && r.n) UI.toast(`Дань с ${r.n} ${U.plural(r.n, 'Капища', 'Капищ', 'Капищ')}: ${r.got.map(x => `${x.label} +${x.n}`).join(', ')}`, 'good');
    } catch (e) { /* позже */ }
    this._tribute = false;
  },
};
