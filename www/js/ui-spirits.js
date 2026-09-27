'use strict';
/* Экраны духов (4.3.1, вынесены из ui.js): коллекция и команда, карточка духа, амулеты, имена, бестиарий, сумка, коконы.
   Это методы того же объекта UI — вызовы вида UI.collection() не меняются. */

Object.assign(UI, {
  /* ---------------- КОЛЛЕКЦИЯ ---------------- */
  collection() {
    Tut.ui('spirits'); // 4.0: шаг обучения
    const scr = this.screen(ru`Духи`, `
      <div class="toolbar">
        <div class="seg">${[['power', ru`Сила`], ['new', ru`Новые`], ['num', ru`Номер`], ['name', ru`Имя`]].map(([k, t]) => `<button data-sort="${k}">${t}</button>`).join('')}</div>
        <div class="chips"><button data-el="all">${ru`Все`}</button>${ELEMENT_KEYS.map(e => `<button data-el="${e}">${Art.elIcon(e, 18)}</button>`).join('')}<button class="sel-toggle">${ru`Выбрать`}</button></div>
      </div>
      <div class="grid cards"></div>
      <div class="sel-bar hidden"><span></span><button class="btn small ghost sel-dupes">${ru`Лишние`}</button><button class="btn small danger sel-release">${ru`Отпустить`}</button></div>`, 'col-screen');
    let selecting = false;
    const sel = new Set();
    const protectedUid = uid => { const x = S.findSpirit(uid); return !x || x.fav || x.shiny || (S.d.buddy && S.d.buddy.uid === uid) || S.d.team.includes(uid); };
    const updateBar = () => {
      const bar = scr.querySelector('.sel-bar');
      bar.classList.toggle('hidden', !selecting);
      bar.querySelector('span').textContent = ru`Выбрано: ${sel.size}`;
      scr.querySelector('.sel-toggle').classList.toggle('on', selecting);
      U.$$('.card', scr).forEach(c => c.classList.toggle('selected', sel.has(c.dataset.uid)));
    };
    const render = () => {
      let list = [...S.d.spirits];
      if (this.colEl !== 'all') list = list.filter(x => SP[x.sid].el === this.colEl);
      const cmp = {
        power: (a, b) => S.power(b) - S.power(a),
        new: (a, b) => b.t - a.t,
        num: (a, b) => SP[a.sid].num - SP[b.sid].num || S.power(b) - S.power(a),
        name: (a, b) => (a.nick || SP[a.sid].name).localeCompare(b.nick || SP[b.sid].name, I18N.locale),
      }[this.colSort];
      list.sort((a, b) => (b.fav - a.fav) || cmp(a, b));
      scr.querySelector('.head-extra').textContent = `${S.d.spirits.length} ${U.plural(S.d.spirits.length, ru`дух`, ru`духа`, ru`духов`)}`;
      U.$$('[data-sort]', scr).forEach(b => b.classList.toggle('on', b.dataset.sort === this.colSort));
      U.$$('[data-el]', scr).forEach(b => b.classList.toggle('on', b.dataset.el === this.colEl));
      scr.querySelector('.grid').innerHTML = list.map(x => `
        <button class="card el-${SP[x.sid].el} ${S.alive(x) ? '' : 'ko'}" data-uid="${x.uid}">
          ${x.fav ? `<span class="fav">${this.I.star}</span>` : ''}
          ${S.d.buddy && S.d.buddy.uid === x.uid ? '<span class="buddy-mark">♥</span>' : ''}
          ${x.amulet ? `<span class="am-mark" style="background:${AMULETS[x.amulet].color}"></span>` : ''}
          <div class="card-pw">${ru`СИЛА`} <b>${S.power(x)}</b></div>
          <div class="card-art">${Art.imgOf(x)}</div>
          <div class="card-name">${U.esc(x.nick || SP[x.sid].name)}</div>${this.hpBar(x)}
        </button>`).join('') || `<div class="empty">${ru`Пока никого. Выходи на улицу — духи ждут!`}</div>`;
      updateBar();
    };
    scr.addEventListener('click', e => {
      const s = e.target.closest('[data-sort]'), f = e.target.closest('[data-el]'), c = e.target.closest('.card');
      if (e.target.closest('.sel-toggle')) { selecting = !selecting; sel.clear(); updateBar(); return; }
      if (e.target.closest('.sel-dupes')) {
        // из каждого вида оставляем самого сильного, остальных (кроме защищённых) выбираем
        const best = {};
        S.d.spirits.forEach(x => { if (!best[x.sid] || S.power(x) > S.power(best[x.sid])) best[x.sid] = x; });
        sel.clear();
        S.d.spirits.forEach(x => { if (best[x.sid] !== x && !protectedUid(x.uid)) sel.add(x.uid); });
        this.toast(sel.size ? ru`Выбраны дубликаты: ${sel.size}. Избранные, сияющие, спутник и команда не выбираются.` : ru`Лишних духов нет`);
        updateBar(); return;
      }
      if (e.target.closest('.sel-release')) {
        if (!sel.size) { this.toast(ru`Никто не выбран`); return; }
        if (sel.size >= S.d.spirits.length) { this.toast(ru`Нельзя отпустить всех духов`); return; }
        this.confirm(ru`Отпустить?`, ru`Духов: ${sel.size}. Они вернутся в Навь, а ты получишь эссенцию.`, ru`Отпустить`, async () => {
          const r = await Game.try('release', { uids: [...sel] });
          if (!r) return;
          sel.clear(); selecting = false;
          Sfx.play('flee'); this.toast(ru`Отпущено духов: ${r.n}. Получено эссенции: ${r.n}`, 'good');
          render(); updateBar();
        }, ru`Отмена`, true);
        return;
      }
      if (s) { this.colSort = s.dataset.sort; render(); }
      else if (f) { this.colEl = f.dataset.el; render(); }
      else if (c && selecting) {
        const uid = c.dataset.uid;
        if (sel.has(uid)) sel.delete(uid);
        else if (protectedUid(uid)) { this.toast(ru`Избранных, сияющих, спутника и духов команды нельзя отпускать списком`); return; }
        else sel.add(uid);
        Sfx.play('tap'); updateBar();
      }
      else if (c) { Sfx.play('tap'); this.detail(c.dataset.uid, render); }
    });
    render();
  },

  rwText(rw) { return Object.entries(rw).filter(([k]) => k !== 'xp').map(([k, n]) => k === 'sparks' ? `✦ ${U.fmtNum(n)}` : `${ITEMS[k].name} ×${n}`).join(', '); },

  /* ---------------- КОМАНДА ---------------- */
  teamHtml(team) {
    return team.map(sp => `<div class="mini ${S.alive(sp) ? '' : 'ko'}">${Art.imgOf(sp)}<b>${S.power(sp)}</b>${this.hpBar(sp)}</div>`).join('') || `<i>${ru`Нет духов`}</i>`;
  },
  /* 4.15: здоровье духа — полоска (если ранен) или «без сил · 3 ч 20 мин» */
  hpBar(sp, always) {
    const h = S.hpNow(sp);
    if (h <= 0) return `<span class="hp-ko">${ru`без сил · ${U.fmtTime(S.koLeft(sp))}`}</span>`;
    if (h >= 1 && !always) return '';
    return `<i class="hp-bar ${h < 0.35 ? 'low' : h < 0.7 ? 'mid' : ''}"><i style="width:${Math.round(h * 100)}%"></i></i>`;
  },
  hpText(sp) { const h = S.hpNow(sp); return h <= 0 ? ru`без сил · ${U.fmtTime(S.koLeft(sp))}` : h >= 1 ? ru`здоров` : `${Math.round(h * 100)}%`; },
  // лечение одного духа: выбрать предмет
  healPick(sp, done) {
    const opts = S.healItems().map(k => {
      const it = ITEMS[k], n = S.d.items[k] || 0, err = S.canHeal(sp, k);
      const eff = S.hpNow(sp) <= 0 ? (it.revive ? ru`поднимет на ${it.revive} ч раньше` : ru`не поднимет без сил`) : !it.heal ? ru`только для духа без сил` : it.heal >= 1 ? ru`полностью` : `+${Math.round(it.heal * 100)}%`;
      return `<button class="heal-opt ${err ? 'off' : ''}" data-k="${k}" ${err ? `data-err="${U.esc(err)}"` : ''}><span class="heal-ico">${Art.item(k)}</span><span class="heal-t"><b>${it.name}</b><small>${eff}</small></span><em>×${n}</em></button>`;
    }).join('');
    const m = this.modal({ title: ru`Лечить: ${U.esc(sp.nick || SP[sp.sid].name)}`, cls: 'heal-modal',
      html: `<div class="heal-now">${ru`Здоровье: <b>${this.hpText(sp)}</b>`}</div><div class="heal-opts">${opts}</div><p class="small">${ru`Лечебное — в родниках, в Лавке и в наградах за уровень. Раненый дух и сам восстанавливает ${Rules.HP.REGEN * 100}% в час.`} ${ru`Дух без сил поднимается сам на ${Rules.HP.BACK * 100}% — чем реже дух, тем дольше ждать (от ${Rules.HP.KO_H[1]} до ${Rules.HP.KO_H[5]} ч).`}</p>`,
      buttons: [{ label: ru`Закрыть` }] });
    m.querySelector('.heal-opts').addEventListener('click', async e => {
      const b = e.target.closest('.heal-opt'); if (!b) return;
      if (b.dataset.err) { this.toast(b.dataset.err); return; }
      const r = await Game.try('heal', { uid: sp.uid, k: b.dataset.k });
      if (!r) return;
      Sfx.play('hatch'); this.healDone(sp, r);
      m.close(); done && done();
    });
  },
  // итог лечения: здоровье или сколько ещё ждать духу без сил
  healDone(sp, r) {
    const name = U.esc(sp.nick || SP[sp.sid].name);
    this.toast(r.hp > 0 ? ru`${name}: здоровье ${Math.round(r.hp * 100)}%` : ru`${name} поднимется через ${U.fmtTime(r.ko || 0)}`, 'good');
  },
  // лечение из Сумки: выбрать духа (Мёртвая вода — только духи без сил, остальное — раненые живые)
  healWho(k, done) {
    const rev = !ITEMS[k].heal;
    const list = S.d.spirits.filter(x => rev ? !S.alive(x) : S.alive(x) && S.hpNow(x) < 1).sort((a, b) => S.hpNow(a) - S.hpNow(b) || S.koLeft(a) - S.koLeft(b));
    if (!list.length) { this.toast(rev ? ru`Духов без сил нет` : ru`Все духи здоровы`); return; }
    const m = this.modal({ title: ru`${ITEMS[k].name}: кого лечить?`, cls: 'team-modal',
      html: `<div class="grid cards team-grid">${list.map(x => `<button class="card el-${SP[x.sid].el} ${S.alive(x) ? '' : 'ko'}" data-uid="${x.uid}"><div class="card-pw">${ru`СИЛА`} <b>${S.power(x)}</b></div>
        <div class="card-art">${Art.imgOf(x)}</div><div class="card-name">${U.esc(x.nick || SP[x.sid].name)}</div>${this.hpBar(x)}</button>`).join('')}</div>`,
      buttons: [{ label: ru`Закрыть` }] });
    m.querySelector('.team-grid').addEventListener('click', async e => {
      const c = e.target.closest('.card'); if (!c) return;
      const sp = S.findSpirit(c.dataset.uid), err = S.canHeal(sp, k);
      if (err) { this.toast(err); return; }
      const r = await Game.try('heal', { uid: sp.uid, k });
      if (!r) return;
      Sfx.play('hatch'); this.healDone(sp, r);
      m.close(); done && done();
    });
  },
  pickTeam(done) {
    const chosen = S.team().map(x => x.uid);
    const list = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a));
    const m = this.modal({
      title: ru`Команда из трёх духов`, cls: 'team-modal',
      html: `<p class="small">${ru`Выбери до трёх духов. Совет: бери стихии, которые сильнее противника.`}</p><div class="grid cards team-grid">${list.map(x => `
        <button class="card el-${SP[x.sid].el} ${S.alive(x) ? '' : 'ko'}" data-uid="${x.uid}"><div class="card-pw">${ru`СИЛА`} <b>${S.power(x)}</b></div>
        <div class="card-art">${Art.imgOf(x)}</div><div class="card-name">${Art.elIcon(SP[x.sid].el, 14)} ${U.esc(x.nick || SP[x.sid].name)}</div>${this.hpBar(x)}</button>`).join('')}</div>`,
      buttons: [{ label: ru`Сильнейшие`, fn: async () => { if (await Game.try('team', { uids: [] })) done(); } },
        { label: ru`Готово`, cls: 'primary', fn: async () => { if (await Game.try('team', { uids: chosen })) done(); } }],
    });
    const mark = () => U.$$('.card', m).forEach(c => { const i = chosen.indexOf(c.dataset.uid); c.classList.toggle('selected', i >= 0); c.dataset.n = i >= 0 ? i + 1 : ''; });
    m.querySelector('.team-grid').addEventListener('click', e => {
      const c = e.target.closest('.card'); if (!c) return;
      const i = chosen.indexOf(c.dataset.uid);
      if (i < 0 && !S.alive(S.findSpirit(c.dataset.uid))) { this.toast(ru`Дух без сил — подожди или подними его Мёртвой водой`); return; }
      if (i >= 0) chosen.splice(i, 1);
      else if (chosen.length < 3) chosen.push(c.dataset.uid);
      else { this.toast(ru`В команде уже три духа`); return; }
      Sfx.play('tap'); mark();
    });
    mark();
  },

  detail(uid, onChange) {
    Tut.ui('card'); // 4.0: шаг обучения
    if (!S.findSpirit(uid)) return;
    const scr = this.screen('', '', 'det-screen', onChange);
    let tab = 'grow'; // 4.14.1: карточка без прокрутки — сверху дух, ниже вкладки
    const render = () => {
      const sp = S.findSpirit(uid);
      if (!sp) { this.closeScreen(scr); return; }
      const s = SP[sp.sid], st = S.stats(sp), fam = SP[s.fam], ess = S.d.essence[s.fam] || 0;
      const pc = S.powerUpCost(sp), pErr = S.canPowerUp(sp), eErr = S.canEvolve(sp);
      const iv = S.ivPct(sp), stars = iv >= 100 ? 4 : iv >= 82 ? 3 : iv >= 67 ? 2 : iv >= 50 ? 1 : 0;
      const isBuddy = S.d.buddy && S.d.buddy.uid === sp.uid;
      const bar = (label, v) => `<div class="stat"><span>${label}</span><div class="sbar"><b class="${v === 15 ? 'max' : ''}" style="width:${Math.max(4, v / 15 * 100)}%"></b></div><em>${v}/15</em></div>`;
      scr.querySelector('.screen-head h2').innerHTML = `<button class="det-name dt-hname">${U.esc(sp.nick || s.name)} ${this.I.edit}</button>`; // 4.14.1: имя — рядом со стрелкой назад
      scr.querySelector('.head-extra').innerHTML = `<button class="btn-round favbtn ${sp.fav ? 'on' : ''}">${this.I.star}</button>`;
      const nx = S.stats({ ...sp, lvl: sp.lvl + 1 }); // что даст следующее усиление
      const row = (t, v, cls = '') => `<div class="dt-row ${cls}"><span>${t}</span><b>${v}</b></div>`;
      const hpN = S.hpNow(sp); // 4.15: здоровье
      const moves = [[ru`Быстрый приём`, ELEMENTS[s.el].fast], [ru`Особый приём`, ELEMENTS[s.el].charge]].concat(sp.move2 ? [[ru`Второй особый · ⚡${MOVES.charge2.cost}`, ELEMENTS[s.el].charge2]] : []);
      const pane = (k, html) => `<div class="dt-pane ${tab === k ? 'on' : ''}" data-pane="${k}">${html}</div>`;
      const TABS = [['grow', ru`Рост`, !pErr || (s.evo && !eErr)], ['fight', ru`Характеристики`, false], ['amulet', ru`Амулет`, false], ['about', ru`О духе`, false]];
      scr.querySelector('.screen-body').innerHTML = `
        <div class="det det2 el-${s.el}" style="--c:${ELEMENTS[s.el].color}">
          <div class="dt-hero">
            <div class="det-art">${Art.of(sp)}</div>
            <div class="dt-info">
              <div class="det-hp">№${String(s.num).padStart(2, '0')} ${s.name} · ${ru`ОЗ ${st.hp}`}</div>
              <div class="det-power"><small>${ru`СИЛА`}</small><b>${st.power}</b></div>
              <div class="det-lvl"><span>${ru`Уровень <b>${sp.lvl}</b> из ${S.maxLvl()}`}</span><div class="arc"><i style="width:${(sp.lvl / 40) * 100}%"></i></div></div>
              <div class="det-tags"><span>${Art.elIcon(s.el, 18)} ${ELEMENTS[s.el].name}</span><span style="color:${RARITY[s.rar].color}">${RARITY[s.rar].name}</span>${sp.shiny ? `<span class="shiny-t">✦ ${ru`Сияющий`}</span>` : ''}${sp.dark ? `<span class="dark-t">${ru`Омрачённый`}</span>` : ''}${sp.purified ? `<span class="pure-t">${ru`Очищенный`}</span>` : ''}${isBuddy ? `<span class="buddy-t">♥ ${ru`Спутник`}</span>` : ''}${hpN < 1 ? `<span class="hp-t ${hpN <= 0 ? 'ko' : ''}">${hpN <= 0 ? ru`без сил` : ru`ранен · ${Math.round(hpN * 100)}%`}</span>` : ''}</div>
            </div>
          </div>
          <div class="seg dt-tabs">${TABS.map(([k, t, dot]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${t}${dot ? '<i class="dt-dot"></i>' : ''}</button>`).join('')}</div>
          <div class="dt-panel">
            ${pane('grow', `
              <div class="dt-rows">
                <div class="dt-row dt-hp-row"><span>${ru`Здоровье`}</span><b>${this.hpText(sp)}${hpN < 1 ? `<button class="btn small primary act-heal">${ru`Лечить`}</button>` : ''}</b>${this.hpBar(sp, true)}</div>
                ${row(ru`После усиления`, `${ru`СИЛА`} ${st.power} → <i class="dt-up">${nx.power}</i> <em>+${nx.power - st.power}</em>`)}
                ${row(ru`ОЗ после усиления`, `${st.hp} → ${nx.hp}`)}
                ${s.evo ? `<div class="dt-row dt-evo-row"><span>${ru`Превращение`}</span><b>${S.d.dex[s.evo] && S.d.dex[s.evo].seen ? `<span class="dt-evo-a">${Art.img(s.evo)}</span>${SP[s.evo].name}` : '<span class="dt-evo-a"><span class="dx-q">?</span></span>???'}</b>
                  <div class="dt-evo-bar"><div class="pbar"><i style="width:${Math.min(100, ess / s.cost * 100)}%"></i></div><small>${ru`${Math.min(ess, s.cost)} / ${s.cost} эсс.`}</small></div></div>`
                  : row(ru`Превращение`, ru`высшая форма`)}
                ${row(ru`Искры`, `<span class="cur">${Art.item('sparks')}</span> ${U.fmtNum(S.d.sparks)}`, 'gold')}
                ${row(ru`Эссенция «${fam.name}»`, ess)}
                ${sp.dark ? `<div class="dt-row dt-dark"><span><b>${ru`Омрачён Навью`}</b><small>${ru`атака +20%, защита −17%`}</small></span>
                  <button class="btn small act-purify" ${S.canPurify(sp) ? `data-err="${U.esc(S.canPurify(sp))}"` : ''}>${ru`Очистить`}<small><span class="cur">${Art.item('sparks')}</span> ${S.PURIFY.sparks} · ${ru`${S.PURIFY.essence} эсс.`}</small></button></div>` : ''}
              </div>
              ${pErr ? `<div class="det-why">${U.esc(pErr)}</div>` : ''}
              <div class="det-actions top ${s.evo ? '' : 'one'}">
                <button class="btn primary act-power" ${pErr ? 'data-err="' + U.esc(pErr) + '"' + (sp.lvl >= S.maxLvl() ? ` data-short="${ru`Предел уровня`}"` : '') : ''}>${ru`Усилить`}<small><span class="cur">${Art.item('sparks')}</span> ${pc.sparks} · ${ru`${pc.essence} эсс.`}</small></button>
                ${s.evo ? `<button class="btn evolve act-evo" ${eErr ? 'data-err="' + U.esc(eErr) + '"' : ''}>${ru`Превратить`}<small>${ru`${s.cost} эсс.`} → ${S.d.dex[s.evo] && S.d.dex[s.evo].seen ? SP[s.evo].name : '???'}</small></button>` : ''}
              </div>
`)}
            ${pane('fight', `
              <div class="dt-rows">
                <div class="dt-row dt-appr"><span>${ru`Оценка Ордена`}</span><b><i class="dt-stars">${'★'.repeat(stars)}${'☆'.repeat(4 - stars)}</i> ${iv}%</b></div>
                ${bar(ru`Атака`, sp.iv[0])}${bar(ru`Защита`, sp.iv[1])}${bar(ru`Стойкость`, sp.iv[2])}
                ${moves.map(([t, n]) => row(t, n)).join('')}
              </div>
              ${sp.move2 ? '' : `<button class="btn ghost small wide dt-bottom act-move2" ${S.canLearnMove2(sp) ? `data-err="${U.esc(S.canLearnMove2(sp))}"` : ''}>${ru`Выучить «${ELEMENTS[s.el].charge2}»`}<small><span class="cur">${Art.item('sparks')}</span> ${MOVE2_COST.sparks} · ${ru`${MOVE2_COST.essence} эсс.`}</small></button>`}`)}
            ${pane('amulet', `
              <div class="amulet-slot dt-am">
                ${sp.amulet ? `<div class="am-ico">${Art.amulet(sp.amulet)}</div><div class="row-main"><b>${AMULETS[sp.amulet].name}</b><small>${AMULETS[sp.amulet].desc}</small></div>`
                  : `<div class="am-ico empty"></div><div class="row-main"><b>${ru`Амулет не надет`}</b><small>${ru`Амулет усиливает духа: атаку, защиту, здоровье, энергию в битвах или находки спутника`}</small></div>`}
              </div>
              ${sp.amulet ? `<button class="btn ghost small wide dt-bottom act-unequip">${ru`Снять амулет`}<small>${ru`вернётся в сумку`}</small></button>`
                : `<button class="btn ghost small wide dt-bottom act-equip" ${Object.values(S.d.amulets).some(n => n > 0) ? '' : `data-err="${ru`В сумке нет амулетов`}"`}>${ru`Надеть амулет`}<small>${ru`в сумке: ${Object.values(S.d.amulets).reduce((a, b) => a + b, 0)}`}</small></button>`}`)}
            ${pane('about', `
              <p class="det-desc">${s.desc}</p>
              <div class="dt-rows">
                ${row(ru`Семейство`, fam.name)}
                ${row(ru`Стихия`, `${Art.elIcon(s.el, 16)} ${ELEMENTS[s.el].name}`)}
                ${row(ru`Редкость`, `<i style="color:${RARITY[s.rar].color};font-style:normal">${RARITY[s.rar].name}</i>`)}
                ${sp.t ? row(ru`Пойман`, new Date(sp.t).toLocaleDateString(I18N.locale)) : ''}
                ${sp.from ? row(ru`Подарок`, ru`от Ловчего ${U.esc(sp.from)}`) : ''}
                ${row(ru`Спутник`, isBuddy ? `♥ ${ru`находка через ${Math.max(0, S.buddyDist(sp) - S.d.buddy.km).toFixed(2)} км`}` : ru`эссенция каждые ${S.buddyDist(sp)} км`)}
              </div>
              <div class="dt-about-acts">
                ${isBuddy ? '' : `<button class="btn ghost small act-buddy">♥ ${ru`Сделать спутником`}</button>`}
                <button class="btn ghost danger small act-release">${ru`Отпустить`}<small>${ru`+1 эссенция`}</small></button>
              </div>`)}
          </div>
        </div>`;
      U.$$('[data-err]', scr).forEach(b => b.classList.add('disabled'));
    };
    // действие над духом — на сервере; после ответа карточка перерисовывается
    const act = async (type, args, ok) => {
      const r = await Game.try(type, { uid, ...args });
      if (!r || !scr.isConnected) return r;
      render(); ok && ok(r);
      return r;
    };
    const pulse = () => { const a = scr.querySelector('.det-art'); if (a) a.classList.add('pulse'); };
    scr.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.tab) { tab = t.dataset.tab; Sfx.play('tap'); U.$$('[data-tab]', scr).forEach(x => x.classList.toggle('on', x === t)); U.$$('.dt-pane', scr).forEach(p => p.classList.toggle('on', p.dataset.pane === tab)); return; }
      const sp = S.findSpirit(uid); if (!sp) return;
      if (t.dataset.err) { this.toast(t.dataset.err); return; }
      if (t.classList.contains('favbtn')) act('fav', { on: !sp.fav });
      else if (t.classList.contains('det-name')) this.rename(sp, render);
      else if (t.classList.contains('act-move2')) {
        this.confirm(ru`Второй приём`, ru`Научить «${U.esc(sp.nick || SP[sp.sid].name)}» приёму «${ELEMENTS[SP[sp.sid].el].charge2}» за ✦ ${MOVE2_COST.sparks} и ${MOVE2_COST.essence} эссенции?`, ru`Научить`,
          () => act('move2', {}, () => { Sfx.play('levelup'); this.toast(ru`Новый приём выучен!`, 'good'); }));
      } else if (t.classList.contains('act-unequip')) act('unequip', {}, () => Sfx.play('tap'));
      else if (t.classList.contains('act-equip')) this.pickAmulet(sp, render);
      else if (t.classList.contains('act-purify')) {
        this.confirm(ru`Очистить духа?`, ru`Тьма Нави покинет «${U.esc(sp.nick || SP[sp.sid].name)}». Стоимость: ✦ ${S.PURIFY.sparks} и ${S.PURIFY.essence} эссенции.`, ru`Очистить`,
          () => act('purify', {}, () => { Sfx.play('levelup'); U.vibrate([40, 60, 120]); this.toast(ru`Дух очищен! Оценка выросла`, 'good'); pulse(); }));
      }
      else if (t.classList.contains('act-buddy')) {
        act('buddy', {}, () => { Sfx.play('catch'); U.vibrate(30); this.toast(ru`${U.esc(sp.nick || SP[sp.sid].name)} теперь твой спутник!`, 'good'); MapView.updateBuddy(); });
      }
      else if (t.classList.contains('act-heal')) this.healPick(sp, render);
      else if (t.classList.contains('act-power')) {
        if (t._busy) return;
        t._busy = true;
        act('powerUp', {}, () => { Sfx.play('spin'); U.vibrate(20); pulse(); }).finally(() => { t._busy = false; });
      } else if (t.classList.contains('act-evo')) {
        const s = SP[sp.sid];
        this.confirm(ru`Превращение`, S.d.dex[s.evo] && S.d.dex[s.evo].seen ? ru`Превратить «${U.esc(sp.nick || s.name)}» в ${SP[s.evo].name}? Потратится ${s.cost} эссенции.` : ru`Превратить «${U.esc(sp.nick || s.name)}» в неизвестную форму? Потратится ${s.cost} эссенции.`, ru`Превратить`, async () => {
          const r = await Game.try('evolve', { uid });
          if (r) this.evolveAnim(r.from, r.to, r.isNew, render, sp.shiny);
        });
      } else if (t.classList.contains('act-release')) {
        if (S.d.spirits.length <= 1) { this.toast(ru`Нельзя отпустить последнего духа`); return; }
        this.confirm(ru`Отпустить?`, ru`«${U.esc(sp.nick || SP[sp.sid].name)}» (СИЛА ${S.power(sp)}) вернётся в Навь. Взамен — 1 эссенция.`, ru`Отпустить`, async () => {
          if (await Game.try('release', { uids: [uid] })) { Sfx.play('flee'); this.closeScreen(scr); }
        }, ru`Отмена`, true);
      }
    });
    render();
  },
  pickAmulet(sp, done) {
    const have = AMULET_KEYS.filter(k => S.d.amulets[k] > 0);
    if (!have.length) { this.toast(ru`Амулетов нет. Они выпадают в разломах, капищах, вторжениях и за ранги Лиги.`); return; }
    const m = this.modal({
      title: ru`Выбери амулет`, cls: 'amulet-modal',
      html: `<div class="list">${have.map(k => `<button class="row am-pick" data-k="${k}"><div class="row-ico">${Art.amulet(k)}</div><div class="row-main"><b>${AMULETS[k].name}</b><small>${AMULETS[k].desc}</small></div><span class="cnt">×${S.d.amulets[k]}</span></button>`).join('')}</div>`,
      buttons: [{ label: ru`Отмена` }],
    });
    m.addEventListener('click', async e => {
      const b = e.target.closest('.am-pick'); if (!b) return;
      m.close();
      if (await Game.try('equip', { uid: sp.uid, k: b.dataset.k })) { Sfx.play('spin'); done(); }
    });
  },
  rename(sp, done) {
    const m = this.modal({
      title: ru`Имя духа`, html: `<input class="input" maxlength="16" value="${U.esc(sp.nick || SP[sp.sid].name)}">`,
      buttons: [{ label: ru`Отмена` }, { label: ru`Сохранить`, cls: 'primary', fn: async w => {
        const v = w.querySelector('input').value.trim();
        if (await Game.try('nick', { uid: sp.uid, nick: v })) done();
      } }],
    });
    setTimeout(() => m.querySelector('input').select(), 50);
  },  evolveAnim(from, to, isNew, done, shiny) {
    Sfx.play('levelup'); U.vibrate([40, 80, 40, 80, 120]);
    const m = this.modal({
      cls: 'evo-modal', dismiss: false,
      html: `<div class="evo-stage"><div class="evo-a">${Art.spirit(from, shiny)}</div><div class="evo-b">${Art.spirit(to, shiny)}</div><div class="evo-glow"></div></div>
             <div class="evo-text">${ru`${SP[from].name} превращается…`}</div>`,
      buttons: [],
    });
    setTimeout(() => {
      m.querySelector('.evo-text').innerHTML = `${ru`Это <b>${SP[to].name}</b>!`}${isNew ? `<div class="badge-new">${ru`Новая запись в Бестиарии!`}</div>` : ''}`;
      const b = U.el(`<button class="btn primary">${ru`Чудесно`}</button>`);
      b.onclick = () => { m.close(); done(); };
      m.querySelector('.modal-btns').appendChild(b);
    }, 2600);
  },

  /* ---------------- БЕСТИАРИЙ ---------------- */
  dex() {
    Tut.ui('dex'); // 4.0: шаг обучения
    const caught = SPECIES.filter(s => S.d.dex[s.id] && S.d.dex[s.id].caught).length;
    const seen = SPECIES.filter(s => S.d.dex[s.id] && S.d.dex[s.id].seen).length;
    const scr = this.screen(ru`Бестиарий`, `
      <div class="dex-sum">${ru`Поймано <b>${caught}</b> из ${SPECIES.length} · встречено ${seen}`}</div><div class="pbar dex-prog"><i style="width:${caught / SPECIES.length * 100}%"></i></div>
      <div class="grid dex">${SPECIES.map(s => {
        const d = S.d.dex[s.id] || {};
        const cls = d.caught ? 'caught' : d.seen ? 'seen' : 'unknown';
        return `<button class="dex-cell ${cls} el-${s.el}" data-sid="${s.id}"><span class="num">${String(s.num).padStart(2, '0')}</span>${d.shiny ? '<span class="dex-shiny">✦</span>' : ''}${d.seen ? Art.img(s.id) : '<span class="dx-q">?</span>'}<span class="nm">${d.seen ? s.name : '???'}</span></button>`;
      }).join('')}</div>`, 'dex-screen');
    scr.addEventListener('click', e => {
      const c = e.target.closest('.dex-cell'); if (!c) return;
      const s = SP[c.dataset.sid], d = S.d.dex[s.id];
      if (!d || !d.seen) { this.toast(ru`Этого духа ты ещё не встречал`); return; }
      this.dexCard(s.id);
    });
  },

  // 4.14.1: карточка вида в Бестиарии — как карточка духа: всё на одном экране без прокрутки.
  // Сверху — дух в волшебном круге, справа семейство, «ПОЙМАНО ··· N», встречи и сияющие, метки; ниже вкладки
  dexCard(sid) {
    const s = SP[sid], d = S.d.dex[sid] || {}, fam = SP[s.fam], num = String(s.num).padStart(2, '0');
    const scr = this.screen(`№${num} ${s.name}`, '', 'det-screen dexc-screen');
    const row = (t, v, cls = '') => `<div class="dt-row ${cls}"><span>${t}</span><b>${v}</b></div>`;
    const maxB = [0, 1, 2].map(i => Math.max(...SPECIES.map(x => x.base[i])));
    const bar = (label, i) => `<div class="stat"><span>${label}</span><div class="sbar"><b style="width:${Math.max(4, s.base[i] / maxB[i] * 100)}%"></b></div><em>${s.base[i]}</em></div>`;
    const chain = SPECIES.filter(x => x.fam === s.fam);
    const seen = x => S.d.dex[x.id] && S.d.dex[x.id].seen;
    const mine = S.d.spirits.filter(x => x.sid === sid).sort((a, b) => S.power(b) - S.power(a));
    const SEASON = { winter: ru`зима: дек–фев и Святки`, kupala: ru`лето: июнь–июль и Купала`, autumn: ru`осень: сен–ноя и Покров` };
    const pane = (k, html, on) => `<div class="dt-pane ${on ? 'on' : ''}" data-pane="${k}">${html}</div>`;
    scr.querySelector('.screen-body').innerHTML = `
      <div class="det det2 el-${s.el}" style="--c:${ELEMENTS[s.el].color}">
        <div class="dt-hero">
          <div class="det-art">${Art.spirit(s.id)}</div>
          <div class="dt-info">
            <div class="det-hp">${ru`Семейство «${fam.name}»`}</div>
            <div class="det-power"><small>${ru`ПОЙМАНО`}</small><b>${d.caught || 0}</b></div>
            <div class="det-lvl dx-meet"><span>${ru`Встречено <b>${d.seen || 0}</b>`}${d.shiny ? ` · <i class="dx-sh">✦ ${ru`сияющих <b>${d.shiny}</b>`}</i>` : ''}</span></div>
            <div class="det-tags"><span>${Art.elIcon(s.el, 18)} ${ELEMENTS[s.el].name}</span><span style="color:${RARITY[s.rar].color}">${RARITY[s.rar].name}</span></div>
          </div>
        </div>
        <div class="seg dt-tabs">${[['about', ru`О духе`], ['where', ru`Где искать`], ['family', ru`Эволюция`], ['mine', ru`Мои`]].map(([k, t], i) => `<button data-tab="${k}" class="${i ? '' : 'on'}">${t}</button>`).join('')}</div>
        <div class="dt-panel">
          ${pane('about', `
            <p class="det-desc">${s.desc}</p>
            <div class="dt-rows">
              ${bar(ru`Атака`, 0)}${bar(ru`Защита`, 1)}${bar(ru`Стойкость`, 2)}
              ${row(ru`Быстрый приём`, ELEMENTS[s.el].fast)}
              ${row(ru`Особый приём`, ELEMENTS[s.el].charge)}
            </div>`, true)}
          ${pane('where', `
            <div class="dt-rows">
              ${row(ru`Время`, s.time === 'night' ? ru`чаще ночью` : s.time === 'day' ? ru`только днём` : ru`днём и ночью`)}
              ${row(ru`Где`, s.legend ? (s.story ? ru`награда Летописи` : ru`только в разломах`) : ru`на карте, рядом с Ловчим`)}
              ${s.region ? row(ru`Регион`, `${REGIONS[s.region].name} · ${REGIONS[s.region].range}`, 'wrap') : ''}
              ${s.land ? row(ru`Земля`, `${LANDS[s.land].name}`, 'wrap') + row(ru`Граница`, LANDS[s.land].where, 'wrap') : ''}
              ${s.season ? row(ru`Сезон`, SEASON[s.season] || s.season, 'wrap') : row(ru`Сезон`, ru`круглый год`)}
              ${row(ru`Стихия`, `${Art.elIcon(s.el, 16)} ${ELEMENTS[s.el].name}`)}
            </div>`)}
          ${pane('family', `
            <div class="dx-chain">${chain.map((x, i) => `${i ? `<div class="dx-arr"><i>→</i><small>${chain[i - 1].cost ? ru`${chain[i - 1].cost} эсс.` : ''}</small></div>` : ''}
              <div class="dx-st ${x.id === sid ? 'cur' : ''} ${seen(x) ? '' : 'sil'}"><div class="dx-st-a">${seen(x) ? Art.img(x.id) : '<span class="dx-q">?</span>'}</div><b>${seen(x) ? x.name : '???'}</b></div>`).join('')}</div>
            <div class="dt-rows">
              ${row(ru`Форм в семействе`, chain.length)}
              ${row(ru`Эссенция «${fam.name}»`, S.d.essence[s.fam] || 0)}
              ${chain.length > 1 ? row(ru`Превращение`, ru`в карточке духа, «Рост»`) : row(ru`Превращение`, ru`у этого духа нет других форм`)}
            </div>`)}
          ${pane('mine', mine.length ? `
            <div class="dt-rows">${mine.slice(0, 6).map(x => `<button class="dt-row dx-mine" data-uid="${x.uid}"><span>${x.shiny ? '<i class="dx-sh">✦</i> ' : ''}${U.esc(x.nick || s.name)} <small>${ru`ур. ${x.lvl}`}</small></span><b>${ru`СИЛА`} ${S.power(x)}</b></button>`).join('')}</div>
            ${mine.length > 6 ? `<div class="det-why">${ru`и ещё ${mine.length - 6} — в «Духах»`}</div>` : ''}`
            : `<div class="dx-none"><b>${ru`Пока не пойман`}</b><small>${s.legend ? (s.story ? ru`Этот дух — награда Летописи.` : ru`Ищи его в разломах.`) : (s.time === 'night' ? ru`Ищи его на карте — чаще ночью.` : s.time === 'day' ? ru`Ищи его на карте — только днём.` : ru`Ищи его на карте — днём и ночью.`)}</small></div>`)}
        </div>
      </div>`;
    scr.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.tab) { Sfx.play('tap'); U.$$('[data-tab]', scr).forEach(x => x.classList.toggle('on', x === t)); U.$$('.dt-pane', scr).forEach(p => p.classList.toggle('on', p.dataset.pane === t.dataset.tab)); return; }
      if (t.dataset.uid) this.detail(t.dataset.uid);
    });
  },

  /* ---------------- СУМКА ---------------- */
  bag() {
    Tut.ui('bag'); // 4.0: шаг обучения
    const scr = this.screen(ru`Сумка`, '<div class="list bag"></div>', 'bag-screen');
    const render = () => {
      scr.querySelector('.head-extra').textContent = `${S.bagCount()}/${S.bagLimit()}`;
      const keys = Object.keys(ITEMS).filter(k => (S.d.items[k] || 0) > 0);
      const ams = AMULET_KEYS.filter(k => S.d.amulets[k] > 0);
      scr.querySelector('.list').innerHTML = ams.map(k => `
        <div class="row"><div class="row-ico">${Art.amulet(k)}</div><div class="row-main"><b>${AMULETS[k].name}</b><small>${AMULETS[k].desc}. ${ru`Надевается на карточке духа.`}</small></div>
        <div class="row-side"><span class="cnt">×${S.d.amulets[k]}</span></div></div>`).join('') + keys.map(k => `
        <div class="row"><div class="row-ico">${Art.item(k)}</div><div class="row-main"><b>${ITEMS[k].name}</b><small>${ITEMS[k].desc}</small></div>
        <div class="row-side"><span class="cnt">×${S.d.items[k]}</span><div class="row-acts">${k === 'incense' ? `<button class="btn small primary use-inc">${S.incenseActive() ? ru`Горит` : ru`Зажечь`}</button>` : ''}${k === 'xpbrew' ? `<button class="btn small primary use-xp">${S.d.xpUntil > U.now() ? ru`Действует` : ru`Выпить`}</button>` : ''}${ITEMS[k].heal || ITEMS[k].revive ? `<button class="btn small primary use-heal" data-k="${k}">${ru`Лечить`}</button>` : ''}<button class="btn-round small drop" data-k="${k}" aria-label="${ru`Выбросить`}">${this.I.trash}</button></div></div></div>`).join('')
        || `<div class="empty">${ru`Сумка пуста. Загляни к ближайшему роднику!`}</div>`;
    };
    scr.addEventListener('click', async e => {
      const drop = e.target.closest('.drop');
      if (drop) { this.discard(drop.dataset.k, () => { render(); this.refreshHud(); }); return; }
      const uh = e.target.closest('.use-heal'); if (uh) { this.healWho(uh.dataset.k, render); return; }
      if (e.target.closest('.use-xp')) { // 4.16: Настой опыта
        if (S.d.xpUntil > U.now()) { this.toast(ru`Настой опыта действует ещё ${U.fmtTime(S.d.xpUntil - U.now())}`); return; }
        if (await Game.try('xpBrew')) { Sfx.play('levelup'); this.toast(ru`Настой выпит: сутки опыта на ${Math.round((Rules.XP_BREW.MUL - 1) * 100)}% больше`, 'good'); this.refreshHud(); render(); }
        return;
      }
      if (!e.target.closest('.use-inc')) return;
      if (S.incenseActive()) { this.toast(ru`Ладан ещё горит: ${U.fmtTime(S.d.incenseUntil - U.now())}`); return; }
      if (await Game.try('incense')) {
        Sfx.play('spin'); this.toast(ru`Ладан зажжён — духи потянулись к тебе`, 'good');
        MapView.refresh(); this.refreshHud(); render();
      }
    });
    render();
  },

  // Выбросить предметы из сумки: сколько — выбирает игрок (кнопки, ползунок или число)
  discard(k, done) {
    const max = S.d.items[k] || 0;
    if (!max) return;
    let n = 1;
    const m = this.modal({
      title: ru`Выбросить`, cls: 'drop-modal',
      html: `<div class="drop-item">${Art.item(k)}<div><b>${ITEMS[k].name}</b><small>${ru`В сумке: ${max}`}</small></div></div>
        <div class="drop-step"><button class="btn-round step" data-d="-1">−</button><input type="number" class="drop-n" min="1" max="${max}" value="1" inputmode="numeric"><button class="btn-round step" data-d="1">+</button></div>
        <input type="range" class="drop-range" min="1" max="${max}" value="1">
        <div class="drop-quick">${[...new Set([1, 10, Math.ceil(max / 2), max])].filter(v => v >= 1 && v <= max).map(v => `<button class="btn small ghost" data-v="${v}">${v === max ? ru`Все (${v})` : v}</button>`).join('')}</div>`,
      buttons: [{ label: ru`Отмена` }, { label: ru`Выбросить`, cls: 'danger', keep: true, fn: async () => {
        const r = await Game.try('discard', { k, n });
        if (!r) return;
        m.close(); Sfx.play('tap');
        this.toast(ru`Выброшено: ${ITEMS[k].name} ×${r.n}`);
        done && done();
      } }],
    });
    const inp = m.querySelector('.drop-n'), range = m.querySelector('.drop-range');
    const set = v => { n = U.clamp(Math.round(+v || 1), 1, max); inp.value = n; range.value = n; };
    m.querySelector('.drop-step').addEventListener('click', e => { const b = e.target.closest('.step'); if (b) set(n + +b.dataset.d); });
    m.querySelector('.drop-quick').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) set(b.dataset.v); });
    range.addEventListener('input', () => set(range.value));
    inp.addEventListener('change', () => set(inp.value));
  },

  /* ---------------- КОКОНЫ ---------------- */
  cocoons() {
    Tut.ui('cocoons'); // 4.0: шаг обучения
    const scr = this.screen(ru`Коконы`, '<div class="coc-info"></div><div class="coc-box"></div>', 'coc-screen');
    const render = () => {
      const inc = S.incubating();
      scr.querySelector('.head-extra').textContent = `${S.d.cocoons.length}/9`;
      scr.querySelector('.coc-info').innerHTML = ru`Коконы согреваются, пока ты ходишь. Пройдено всего: <b>${U.fmtDist(S.d.stats.km * 1000)}</b>`;
      const card = c => {
        const ready = c.inc && c.walked >= c.km;
        return `<div class="coc-card ${ready ? 'ready' : ''} ${c.inc ? 'inc' : ''}" data-id="${c.id}" style="--tc:${COCOON_TIERS[c.km].color}">
          <div class="coc-stage"><i class="coc-ped"></i><div class="coc-art ${c.inc ? 'warm' : ''}">${Art.cocoon(c.km)}</div></div>
          <b>${COCOON_TIERS[c.km].name}</b><small class="coc-km">${ru`${c.km} км`}</small>
          ${c.inc ? `<div class="pbar"><i style="width:${Math.min(100, c.walked / c.km * 100)}%"></i></div><small>${ru`${c.walked.toFixed(2)} / ${c.km} км`}</small>` : ''}
          ${ready ? `<button class="btn small primary hatch">${ru`Вылупить!`}</button>` : c.inc ? '' : `<button class="btn small warm-btn" ${inc >= 3 ? 'disabled' : ''}>${ru`Греть`}</button>`}
        </div>`;
      };
      // греются — три места (свободные видны), ждут — остальные
      const warm = S.d.cocoons.filter(c => c.inc), wait = S.d.cocoons.filter(c => !c.inc);
      scr.querySelector('.coc-box').innerHTML = !S.d.cocoons.length ? `<div class="empty">${ru`Коконов нет. Иногда их можно найти в роднике.`}</div>`
        : `<h3 class="prof-h">${ru`Греются`} <small>${ru`${warm.length} из 3`}</small></h3><div class="grid coc">${warm.map(card).join('')}${`<div class="coc-card coc-slot"><div class="coc-art"></div><b>${ru`Свободно`}</b><small>${wait.length ? ru`нажми «Греть» у кокона ниже` : ru`коконы находят в родниках`}</small></div>`.repeat(Math.max(0, 3 - warm.length))}</div>
          ${wait.length ? `<h3 class="prof-h">${ru`Ждут`} <small>${wait.length}</small></h3><div class="grid coc">${wait.map(card).join('')}</div>` : ''}`;
    };
    scr.addEventListener('click', async e => {
      const card = e.target.closest('.coc-card'); if (!card) return;
      const c = S.d.cocoons.find(x => x.id === card.dataset.id); if (!c) return;
      if (e.target.closest('.warm-btn')) { if (await Game.try('warm', { id: c.id })) { Sfx.play('tap'); render(); } }
      else if (e.target.closest('.hatch')) {
        const r = await Game.try('hatch', { id: c.id });
        if (r) this.hatchAnim(c, r, () => { render(); this.refreshHud(); });
      }
    });
    render();
  },
  // r — ответ сервера: кто вылупился и что получено
  hatchAnim(c, r, done) {
    const res = { sp: S.findSpirit(r.uid) || S.makeSpirit(r.sid, 1, 'x'), isNew: r.isNew, essence: r.essence, sparks: r.sparks };
    Sfx.play('wobble');
    const m = this.modal({
      cls: 'hatch-modal', dismiss: false, buttons: [],
      html: `<div class="hatch-stage"><div class="hatch-coc">${Art.cocoon(c.km)}</div><div class="hatch-sp">${Art.of(res.sp)}</div><div class="evo-glow"></div></div><div class="evo-text">${ru`Кокон шевелится…`}</div>`,
    });
    setTimeout(() => Sfx.play('wobble'), 700);
    setTimeout(() => Sfx.play('wobble'), 1400);
    setTimeout(() => {
      Sfx.play('hatch'); U.vibrate([40, 60, 100]);
      m.querySelector('.hatch-stage').classList.add('open');
      m.querySelector('.evo-text').innerHTML = `${res.sp.shiny ? ru`Из кокона появился <b>✦ сияющий ${SP[res.sp.sid].name}</b>!` : ru`Из кокона появился <b>${SP[res.sp.sid].name}</b>!`}<div class="small">${ru`СИЛА ${S.power(res.sp)} · +${res.essence} эссенции · +${res.sparks} искр`}</div>${res.isNew ? `<div class="badge-new">${ru`Новая запись в Бестиарии!`}</div>` : ''}`;
      const b = U.el(`<button class="btn primary">${ru`Привет!`}</button>`);
      b.onclick = () => { m.close(); done(); };
      m.querySelector('.modal-btns').appendChild(b);
    }, 2200);
  },
});
