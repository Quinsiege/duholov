'use strict';
/* Серия дней и общее дело Ордена (3.1). Считает и выдаёт награды сервер — здесь только показ. */

const Order = {
  info: null,   // последний ответ сервера: { cur, prev }
  _t: 0,

  // Сколько наград общего дела можно забрать (для значка меню)
  claimable() {
    if (!this.info) return 0;
    return [this.info.cur, this.info.prev].filter(Boolean).reduce((n, w) => n + Rules.ORDER.STEPS.filter((s, i) => this.canClaim(w, i)).length, 0);
  },
  canClaim(w, i) {
    const s = Rules.ORDER.STEPS[i];
    return !w.got.includes(i) && w.n >= s.need && w.total >= Math.ceil(s.at * w.goal);
  },
  async refresh(force) {
    if (!S.d || (!force && Date.now() - this._t < 10 * 60000)) return this.info;
    this._t = Date.now();
    try { this.info = await Game.act('order'); } catch (e) { /* покажем прошлые данные */ }
    UI.refreshHud();
    return this.info;
  },

  /* ---------- серия дней ---------- */
  // Первый вход за день: награда по серии (во время обучения и боёв — позже)
  async daily() {
    if (!S.d || S.d.tut || S.d.streak.day === U.today() || this._daily || Encounter.st || Raid.st || Duel.st) return;
    this._daily = true;
    try {
      const r = await Game.act('daily');
      if (r && !r.already) this.streakModal(r);
    } catch (e) { /* без связи — при следующей проверке */ }
    this._daily = false;
  },
  rwCell(x) {
    const art = x.k === 'cocoon' ? Art.cocoon(10) : x.k === 'xp' || x.k === 'sparks' ? `<b class="big-n">+${U.fmtNum(x.n)}</b>` : Art.item(x.k);
    return `<div>${art}<span>${x.label}${x.k === 'xp' || x.k === 'sparks' || x.k === 'cocoon' ? '' : ` ×${x.n}`}</span></div>`;
  },
  streakModal(r) {
    const L = Rules.STREAK.length, day = (r.n - 1) % L;
    const cells = Rules.STREAK.map((rw, i) => {
      const k = Object.keys(rw).find(x => x !== 'xp');
      const ico = i === L - 1 ? Art.cocoon(10) : Art.item(k) || '<b class="big-n">✦</b>';
      return `<div class="st-day ${i < day ? 'past' : i === day ? 'now' : ''}"><small>${i + 1}</small>${ico}</div>`;
    }).join('');
    Sfx.play('levelup'); U.vibrate([40, 40, 90]);
    UI.modal({
      cls: 'streak-modal', title: r.n === 1 ? 'Добро пожаловать!' : `${r.n} ${U.plural(r.n, 'день', 'дня', 'дней')} подряд!`,
      html: `<div class="st-row">${cells}</div>
        <p class="st-hint">${r.n === 1 ? 'Заходи каждый день — награды растут, а на 7-й день ждёт кокон 10 км.' : day === L - 1 ? 'Седьмой день! Завтра круг начнётся снова — серия продолжается.' : 'Не пропускай день — иначе серия начнётся сначала.'}</p>
        <div class="lvl-rw">${r.got.map(x => this.rwCell(x)).join('')}</div>`,
      buttons: [{ label: 'Забрать', cls: 'primary', fn: () => UI.refreshHud() }],
      dismiss: false,
    });
  },

  /* ---------- общее дело Ордена ---------- */
  weekCard(w, title) {
    const pct = Math.min(100, w.total / w.goal * 100), ev = title ? null : Ev.cur;
    const steps = Rules.ORDER.STEPS.map((s, i) => {
      const at = Math.ceil(s.at * w.goal), reached = w.total >= at, got = w.got.includes(i), can = this.canClaim(w, i);
      const rw = Object.entries(s.reward).map(([k, n]) => k === 'sparks' ? `✦ ${U.fmtNum(n)}` : `${ITEMS[k].name} ×${n}`).join(', ') + (i === Rules.ORDER.STEPS.length - 1 ? ', кокон 10 км' : '');
      const why = got ? '' : !reached ? `Ордену осталось ${U.fmtNum(at - w.total)}` : w.n < s.need ? `Твой вклад: ${w.n} из ${s.need}` : '';
      return `<div class="quest ${got ? 'claimed' : can ? 'done' : ''}"><div class="q-main"><b>Ступень ${i + 1} · ${U.fmtNum(at)} очков</b><small>${rw}${why ? `<br>${why}` : ''}</small></div>
        ${got ? '<span class="q-ok">✓</span>' : can ? `<button class="btn small primary o-claim" data-w="${w.week}" data-i="${i}">Забрать</button>` : ''}</div>`;
    }).join('');
    const marks = Rules.ORDER.STEPS.map(s => `<em style="left:${s.at * 100}%"></em>`).join('');
    const top = w.top.length ? `<div class="o-top"><div class="o-sub">Лучшие Ловчие недели</div>${w.top.map((r, i) => `<div class="o-row ${r.me ? 'me' : ''}"><span>${i + 1}</span><b>${U.esc(r.name)}</b><i>${U.fmtNum(r.n)}</i></div>`).join('')}</div>` : '';
    return `<div class="story-card o-card">
        <div class="story-num">${title || `${ev.name} · до конца ${U.fmtTime(Math.max(0, w.endsAt - U.now()))}`}</div>
        <h3>${U.fmtNum(w.total)} из ${U.fmtNum(w.goal)}</h3>
        <div class="pbar big o-bar"><i style="width:${pct}%"></i>${marks}</div>
        <p class="o-me">Участников: <b>${w.players}</b> · Твой вклад: <b>${U.fmtNum(w.n)}</b></p>
      </div>${steps}${top}`;
  },
  render(box) {
    const I = this.info;
    if (!I) { box.innerHTML = '<div class="empty">Узнаём, как идут дела у Ордена…</div>'; return; }
    const ev = Ev.cur, x2 = ev.el ? `поимка духа стихии «${ELEMENTS[ev.el].name}» — 3 очка` : ev.loot ? 'родник — 2 очка' : ev.rifts ? 'разлом — 10 очков' : ev.duel ? 'победа в капище — 6 очков' : ev.km ? 'путь и коконы — вдвое' : '';
    box.innerHTML = (I.prev ? this.weekCard(I.prev, 'Прошлая неделя — награды ещё ждут') : '') + this.weekCard(I.cur) +
      `<div class="q-note">Все Ловчие вместе копят очки: ${Rules.ORDER_RULES.map(([t, n]) => `${t.toLowerCase()} — ${n}`).join(', ')}.${x2 ? ` На этой неделе ${x2}.` : ''}
       Цель растёт с числом участников. Награду ступени получает каждый, кто внёс нужное число очков.</div>`;
  },
  async claim(week, i) {
    const r = await Game.try('orderClaim', { week, i });
    if (!r) return false;
    Sfx.play('levelup');
    UI.modal({ title: `Общее дело: ступень ${i + 1}`, html: `<p>Орден благодарит тебя за помощь!</p><div class="lvl-rw">${r.got.map(x => this.rwCell(x)).join('')}</div>`, buttons: [{ label: 'Отлично', cls: 'primary' }] });
    await this.refresh(true);
    return true;
  },
};
