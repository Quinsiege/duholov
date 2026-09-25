'use strict';
/* Экраны духов (4.3.1, вынесены из ui.js): коллекция и команда, карточка духа, амулеты, имена, бестиарий, сумка, коконы.
   Это методы того же объекта UI — вызовы вида UI.collection() не меняются. */

Object.assign(UI, {
  /* ---------------- КОЛЛЕКЦИЯ ---------------- */
  collection() {
    Tut.ui('spirits'); // 4.0: шаг обучения
    const scr = this.screen('Духи', `
      <div class="toolbar">
        <div class="seg">${[['power', 'Сила'], ['new', 'Новые'], ['num', 'Номер'], ['name', 'Имя']].map(([k, t]) => `<button data-sort="${k}">${t}</button>`).join('')}</div>
        <div class="chips"><button data-el="all">Все</button>${ELEMENT_KEYS.map(e => `<button data-el="${e}">${Art.elIcon(e, 18)}</button>`).join('')}<button class="sel-toggle">Выбрать</button></div>
      </div>
      <div class="grid cards"></div>
      <div class="sel-bar hidden"><span></span><button class="btn small ghost sel-dupes">Лишние</button><button class="btn small danger sel-release">Отпустить</button></div>`, 'col-screen');
    let selecting = false;
    const sel = new Set();
    const protectedUid = uid => { const x = S.findSpirit(uid); return !x || x.fav || x.shiny || (S.d.buddy && S.d.buddy.uid === uid) || S.d.team.includes(uid); };
    const updateBar = () => {
      const bar = scr.querySelector('.sel-bar');
      bar.classList.toggle('hidden', !selecting);
      bar.querySelector('span').textContent = `Выбрано: ${sel.size}`;
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
        name: (a, b) => (a.nick || SP[a.sid].name).localeCompare(b.nick || SP[b.sid].name, 'ru'),
      }[this.colSort];
      list.sort((a, b) => (b.fav - a.fav) || cmp(a, b));
      scr.querySelector('.head-extra').textContent = `${S.d.spirits.length} ${U.plural(S.d.spirits.length, 'дух', 'духа', 'духов')}`;
      U.$$('[data-sort]', scr).forEach(b => b.classList.toggle('on', b.dataset.sort === this.colSort));
      U.$$('[data-el]', scr).forEach(b => b.classList.toggle('on', b.dataset.el === this.colEl));
      scr.querySelector('.grid').innerHTML = list.map(x => `
        <button class="card el-${SP[x.sid].el}" data-uid="${x.uid}">
          ${x.fav ? `<span class="fav">${this.I.star}</span>` : ''}
          ${S.d.buddy && S.d.buddy.uid === x.uid ? '<span class="buddy-mark">♥</span>' : ''}
          ${x.amulet ? `<span class="am-mark" style="background:${AMULETS[x.amulet].color}"></span>` : ''}
          <div class="card-pw">СИЛА <b>${S.power(x)}</b></div>
          <div class="card-art">${Art.imgOf(x)}</div>
          <div class="card-name">${U.esc(x.nick || SP[x.sid].name)}</div>
        </button>`).join('') || '<div class="empty">Пока никого. Выходи на улицу — духи ждут!</div>';
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
        this.toast(sel.size ? `Выбраны дубликаты: ${sel.size}. Избранные, сияющие, спутник и команда не выбираются.` : 'Лишних духов нет');
        updateBar(); return;
      }
      if (e.target.closest('.sel-release')) {
        if (!sel.size) { this.toast('Никто не выбран'); return; }
        if (sel.size >= S.d.spirits.length) { this.toast('Нельзя отпустить всех духов'); return; }
        this.confirm('Отпустить?', `Духов: ${sel.size}. Они вернутся в Навь, а ты получишь эссенцию.`, 'Отпустить', async () => {
          const r = await Game.try('release', { uids: [...sel] });
          if (!r) return;
          sel.clear(); selecting = false;
          Sfx.play('flee'); this.toast(`Отпущено духов: ${r.n}. Получено эссенции: ${r.n}`, 'good');
          render(); updateBar();
        }, 'Отмена', true);
        return;
      }
      if (s) { this.colSort = s.dataset.sort; render(); }
      else if (f) { this.colEl = f.dataset.el; render(); }
      else if (c && selecting) {
        const uid = c.dataset.uid;
        if (sel.has(uid)) sel.delete(uid);
        else if (protectedUid(uid)) { this.toast('Избранных, сияющих, спутника и духов команды нельзя отпускать списком'); return; }
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
    return team.map(sp => `<div class="mini">${Art.imgOf(sp)}<b>${S.power(sp)}</b></div>`).join('') || '<i>Нет духов</i>';
  },
  pickTeam(done) {
    const chosen = S.team().map(x => x.uid);
    const list = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a));
    const m = this.modal({
      title: 'Команда из трёх духов', cls: 'team-modal',
      html: `<p class="small">Выбери до трёх духов. Совет: бери стихии, которые сильнее противника.</p><div class="grid cards team-grid">${list.map(x => `
        <button class="card el-${SP[x.sid].el}" data-uid="${x.uid}"><div class="card-pw">СИЛА <b>${S.power(x)}</b></div>
        <div class="card-art">${Art.imgOf(x)}</div><div class="card-name">${Art.elIcon(SP[x.sid].el, 14)} ${U.esc(x.nick || SP[x.sid].name)}</div></button>`).join('')}</div>`,
      buttons: [{ label: 'Сильнейшие', fn: async () => { if (await Game.try('team', { uids: [] })) done(); } },
        { label: 'Готово', cls: 'primary', fn: async () => { if (await Game.try('team', { uids: chosen })) done(); } }],
    });
    const mark = () => U.$$('.card', m).forEach(c => { const i = chosen.indexOf(c.dataset.uid); c.classList.toggle('selected', i >= 0); c.dataset.n = i >= 0 ? i + 1 : ''; });
    m.querySelector('.team-grid').addEventListener('click', e => {
      const c = e.target.closest('.card'); if (!c) return;
      const i = chosen.indexOf(c.dataset.uid);
      if (i >= 0) chosen.splice(i, 1);
      else if (chosen.length < 3) chosen.push(c.dataset.uid);
      else { this.toast('В команде уже три духа'); return; }
      Sfx.play('tap'); mark();
    });
    mark();
  },

  detail(uid, onChange) {
    Tut.ui('card'); // 4.0: шаг обучения
    if (!S.findSpirit(uid)) return;
    const scr = this.screen('', '', 'det-screen', onChange);
    const render = () => {
      const sp = S.findSpirit(uid);
      if (!sp) { this.closeScreen(scr); return; }
      const s = SP[sp.sid], st = S.stats(sp), fam = SP[s.fam], ess = S.d.essence[s.fam] || 0;
      const pc = S.powerUpCost(sp), pErr = S.canPowerUp(sp), eErr = S.canEvolve(sp);
      const iv = S.ivPct(sp), stars = iv >= 100 ? 4 : iv >= 82 ? 3 : iv >= 67 ? 2 : iv >= 50 ? 1 : 0;
      const isBuddy = S.d.buddy && S.d.buddy.uid === sp.uid;
      const bar = (label, v) => `<div class="stat"><span>${label}</span><div class="sbar"><b class="${v === 15 ? 'max' : ''}" style="width:${Math.max(4, v / 15 * 100)}%"></b></div><em>${v}/15</em></div>`;
      scr.querySelector('.screen-head h2').innerHTML = '';
      scr.querySelector('.head-extra').innerHTML = `<button class="btn-round favbtn ${sp.fav ? 'on' : ''}">${this.I.star}</button>`;
      scr.querySelector('.screen-body').innerHTML = `
        <div class="det el-${s.el}" style="--c:${ELEMENTS[s.el].color}">
          <div class="det-power">СИЛА <b>${st.power}</b></div>
          <div class="det-lvl"><div class="arc"><i style="width:${(sp.lvl / 40) * 100}%"></i></div><span>Уровень ${sp.lvl} из ${S.maxLvl()}</span></div>
          <div class="det-art">${Art.of(sp)}</div>
          <button class="det-name">${U.esc(sp.nick || s.name)} ${this.I.edit}</button>
          <div class="det-hp">ОЗ ${st.hp} · №${String(s.num).padStart(2, '0')} ${s.name}</div>
          <div class="det-tags"><span>${Art.elIcon(s.el, 18)} ${ELEMENTS[s.el].name}</span><span style="color:${RARITY[s.rar].color}">${RARITY[s.rar].name}</span>${sp.shiny ? '<span class="shiny-t">✦ Сияющий</span>' : ''}${sp.dark ? '<span class="dark-t">Омрачённый</span>' : ''}${sp.purified ? '<span class="pure-t">Очищенный</span>' : ''}</div>
          <div class="det-actions top">
            <button class="btn primary act-power" ${pErr ? 'data-err="' + U.esc(pErr) + '"' : ''}>Усилить<small><span class="cur">${Art.item('sparks')}</span> ${pc.sparks} · ${pc.essence} эсс.</small></button>
            ${s.evo ? `<button class="btn evolve act-evo" ${eErr ? 'data-err="' + U.esc(eErr) + '"' : ''}>Превратить<small>${s.cost} эсс. → ${SP[s.evo].name}</small></button>` : ''}
          </div>
          ${pErr ? `<div class="det-why">${U.esc(pErr)}</div>` : ''}
          <div class="panel res"><span><span class="cur">${Art.item('sparks')}</span> ${U.fmtNum(S.d.sparks)} искр</span><span>Эссенция «${fam.name}»: <b>${ess}</b></span></div>
          ${sp.dark ? `<div class="panel dark-panel"><b>Дух омрачён Навью</b><small>Атака +20%, защита −17%. Очищение снимет тьму: оценка +2 к каждому показателю, уровень до 25.</small>
            <button class="btn act-purify" ${S.canPurify(sp) ? `data-err="${U.esc(S.canPurify(sp))}"` : ''}>Очистить<small><span class="cur">${Art.item('sparks')}</span> ${S.PURIFY.sparks} · ${S.PURIFY.essence} эсс.</small></button></div>` : ''}
          ${isBuddy
            ? `<div class="buddy-panel">♥ Твой спутник · находка через ${Math.max(0, S.buddyDist(sp) - S.d.buddy.km).toFixed(2)} км</div>`
            : `<button class="btn ghost wide act-buddy">♥ Сделать спутником <small>ходит с тобой и находит эссенцию каждые ${S.buddyDist(sp)} км</small></button>`}
          <div class="panel">
            <div class="det-appraise"><span>Оценка Ордена</span><b>${'★'.repeat(stars)}${'☆'.repeat(4 - stars)}</b><em>${iv}%</em></div>
            ${bar('Атака', sp.iv[0])}${bar('Защита', sp.iv[1])}${bar('Стойкость', sp.iv[2])}
            <div class="det-moves"><div><small>Быстрый приём</small>${ELEMENTS[s.el].fast}</div><div><small>Особый приём</small>${ELEMENTS[s.el].charge}</div></div>
            ${sp.move2 ? `<div class="det-moves"><div><small>Второй особый приём (⚡${MOVES.charge2.cost})</small>${ELEMENTS[s.el].charge2}</div></div>`
              : `<button class="btn ghost wide act-move2" ${S.canLearnMove2(sp) ? `data-err="${U.esc(S.canLearnMove2(sp))}"` : ''}>Выучить второй приём «${ELEMENTS[s.el].charge2}»<small><span class="cur">${Art.item('sparks')}</span> ${MOVE2_COST.sparks} · ${MOVE2_COST.essence} эсс. · дешевле основного, для поединков</small></button>`}
          </div>
          <div class="panel amulet-slot">
            ${sp.amulet ? `<div class="am-ico">${Art.amulet(sp.amulet)}</div><div class="row-main"><b>${AMULETS[sp.amulet].name}</b><small>${AMULETS[sp.amulet].desc}</small></div><button class="btn small ghost act-unequip">Снять</button>`
              : `<div class="am-ico empty"></div><div class="row-main"><b>Амулет не надет</b><small>В сумке: ${Object.values(S.d.amulets).reduce((a, b) => a + b, 0)}</small></div><button class="btn small ghost act-equip">Надеть</button>`}
          </div>
          <p class="det-desc">${s.desc}</p>
          ${sp.from ? `<p class="small">Получен в подарок от Ловчего ${U.esc(sp.from)}</p>` : ''}
          <div class="det-actions">
            <button class="btn ghost danger act-release">Отпустить <small>+1 эссенция</small></button>
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
      const sp = S.findSpirit(uid); if (!sp) return;
      if (t.dataset.err) { this.toast(t.dataset.err); return; }
      if (t.classList.contains('favbtn')) act('fav', { on: !sp.fav });
      else if (t.classList.contains('det-name')) this.rename(sp, render);
      else if (t.classList.contains('act-move2')) {
        this.confirm('Второй приём', `Научить «${U.esc(sp.nick || SP[sp.sid].name)}» приёму «${ELEMENTS[SP[sp.sid].el].charge2}» за ✦ ${MOVE2_COST.sparks} и ${MOVE2_COST.essence} эссенции?`, 'Научить',
          () => act('move2', {}, () => { Sfx.play('levelup'); this.toast('Новый приём выучен!', 'good'); }));
      } else if (t.classList.contains('act-unequip')) act('unequip', {}, () => Sfx.play('tap'));
      else if (t.classList.contains('act-equip')) this.pickAmulet(sp, render);
      else if (t.classList.contains('act-purify')) {
        this.confirm('Очистить духа?', `Тьма Нави покинет «${U.esc(sp.nick || SP[sp.sid].name)}». Стоимость: ✦ ${S.PURIFY.sparks} и ${S.PURIFY.essence} эссенции.`, 'Очистить',
          () => act('purify', {}, () => { Sfx.play('levelup'); U.vibrate([40, 60, 120]); this.toast('Дух очищен! Оценка выросла', 'good'); pulse(); }));
      }
      else if (t.classList.contains('act-buddy')) {
        act('buddy', {}, () => { Sfx.play('catch'); U.vibrate(30); this.toast(`${U.esc(sp.nick || SP[sp.sid].name)} теперь твой спутник!`, 'good'); MapView.updateBuddy(); });
      }
      else if (t.classList.contains('act-power')) {
        if (t._busy) return;
        t._busy = true;
        act('powerUp', {}, () => { Sfx.play('spin'); U.vibrate(20); pulse(); }).finally(() => { t._busy = false; });
      } else if (t.classList.contains('act-evo')) {
        const s = SP[sp.sid];
        this.confirm('Превращение', `Превратить «${U.esc(sp.nick || s.name)}» в ${SP[s.evo].name}? Потратится ${s.cost} эссенции.`, 'Превратить', async () => {
          const r = await Game.try('evolve', { uid });
          if (r) this.evolveAnim(r.from, r.to, r.isNew, render, sp.shiny);
        });
      } else if (t.classList.contains('act-release')) {
        if (S.d.spirits.length <= 1) { this.toast('Нельзя отпустить последнего духа'); return; }
        this.confirm('Отпустить?', `«${U.esc(sp.nick || SP[sp.sid].name)}» (СИЛА ${S.power(sp)}) вернётся в Навь. Взамен — 1 эссенция.`, 'Отпустить', async () => {
          if (await Game.try('release', { uids: [uid] })) { Sfx.play('flee'); this.closeScreen(scr); }
        }, 'Отмена', true);
      }
    });
    render();
  },
  pickAmulet(sp, done) {
    const have = AMULET_KEYS.filter(k => S.d.amulets[k] > 0);
    if (!have.length) { this.toast('Амулетов нет. Они выпадают в разломах, капищах, вторжениях и за ранги Лиги.'); return; }
    const m = this.modal({
      title: 'Выбери амулет', cls: 'amulet-modal',
      html: `<div class="list">${have.map(k => `<button class="row am-pick" data-k="${k}"><div class="row-ico">${Art.amulet(k)}</div><div class="row-main"><b>${AMULETS[k].name}</b><small>${AMULETS[k].desc}</small></div><span class="cnt">×${S.d.amulets[k]}</span></button>`).join('')}</div>`,
      buttons: [{ label: 'Отмена' }],
    });
    m.addEventListener('click', async e => {
      const b = e.target.closest('.am-pick'); if (!b) return;
      m.close();
      if (await Game.try('equip', { uid: sp.uid, k: b.dataset.k })) { Sfx.play('spin'); done(); }
    });
  },
  rename(sp, done) {
    const m = this.modal({
      title: 'Имя духа', html: `<input class="input" maxlength="16" value="${U.esc(sp.nick || SP[sp.sid].name)}">`,
      buttons: [{ label: 'Отмена' }, { label: 'Сохранить', cls: 'primary', fn: async w => {
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
             <div class="evo-text">${SP[from].name} превращается…</div>`,
      buttons: [],
    });
    setTimeout(() => {
      m.querySelector('.evo-text').innerHTML = `Это <b>${SP[to].name}</b>!${isNew ? '<div class="badge-new">Новая запись в Бестиарии!</div>' : ''}`;
      const b = U.el('<button class="btn primary">Чудесно</button>');
      b.onclick = () => { m.close(); done(); };
      m.querySelector('.modal-btns').appendChild(b);
    }, 2600);
  },

  /* ---------------- БЕСТИАРИЙ ---------------- */
  dex() {
    Tut.ui('dex'); // 4.0: шаг обучения
    const caught = SPECIES.filter(s => S.d.dex[s.id] && S.d.dex[s.id].caught).length;
    const seen = SPECIES.filter(s => S.d.dex[s.id] && S.d.dex[s.id].seen).length;
    const scr = this.screen('Бестиарий', `
      <div class="dex-sum">Поймано <b>${caught}</b> из ${SPECIES.length} · встречено ${seen}</div><div class="pbar dex-prog"><i style="width:${caught / SPECIES.length * 100}%"></i></div>
      <div class="grid dex">${SPECIES.map(s => {
        const d = S.d.dex[s.id] || {};
        const cls = d.caught ? 'caught' : d.seen ? 'seen' : 'unknown';
        return `<button class="dex-cell ${cls} el-${s.el}" data-sid="${s.id}"><span class="num">${String(s.num).padStart(2, '0')}</span>${d.shiny ? '<span class="dex-shiny">✦</span>' : ''}${Art.img(s.id)}<span class="nm">${d.seen ? s.name : '???'}</span></button>`;
      }).join('')}</div>`, 'dex-screen');
    scr.addEventListener('click', e => {
      const c = e.target.closest('.dex-cell'); if (!c) return;
      const s = SP[c.dataset.sid], d = S.d.dex[s.id];
      if (!d || !d.seen) { this.toast('Этого духа ты ещё не встречал'); return; }
      const chain = SPECIES.filter(x => x.fam === s.fam);
      this.modal({
        cls: 'dex-modal', title: `№${String(s.num).padStart(2, '0')} ${s.name}`,
        html: `<div class="dex-art el-${s.el}">${Art.spirit(s.id)}</div>
          <div class="det-tags"><span>${Art.elIcon(s.el, 18)} ${ELEMENTS[s.el].name}</span><span style="color:${RARITY[s.rar].color}">${RARITY[s.rar].name}</span>${s.time === 'night' ? '<span>Чаще ночью</span>' : ''}${s.time === 'day' ? '<span>Только днём</span>' : ''}${s.region ? `<span>Регион: ${REGIONS[s.region].name} (${REGIONS[s.region].range})</span>` : ''}${s.land ? `<span>Земля: ${LANDS[s.land].name} (${LANDS[s.land].where})</span>` : ''}${s.legend ? `<span>${s.story ? 'Награда Летописи' : 'Только в разломах'}</span>` : ''}${s.season === 'winter' ? '<span>Зимний: дек–фев и Святки</span>' : ''}${s.season === 'kupala' ? '<span>Летний: июнь–июль и Купала</span>' : ''}${s.season === 'autumn' ? '<span>Осенний: сен–ноя и Покров</span>' : ''}</div>
          <p>${s.desc}</p>
          ${chain.length > 1 ? `<div class="chain">${chain.map((x, i) => `${i ? '<span class="arr">→</span>' : ''}<div class="${S.d.dex[x.id] && S.d.dex[x.id].seen ? '' : 'unknown'}">${Art.spirit(x.id)}</div>`).join('')}</div>` : ''}
          ${d.shiny ? `<div class="chain"><div>${Art.spirit(s.id, true)}</div></div><div class="dex-stat shiny-t">✦ Сияющих поймано: ${d.shiny}</div>` : ''}
          <div class="dex-stat">Поймано: ${d.caught || 0} · Встречено: ${d.seen}</div>`,
        buttons: [{ label: 'Закрыть' }],
      });
    });
  },

  /* ---------------- СУМКА ---------------- */
  bag() {
    Tut.ui('bag'); // 4.0: шаг обучения
    const scr = this.screen('Сумка', '<div class="list bag"></div>', 'bag-screen');
    const render = () => {
      scr.querySelector('.head-extra').textContent = `${S.bagCount()}/${S.bagLimit()}`;
      const keys = Object.keys(ITEMS).filter(k => (S.d.items[k] || 0) > 0);
      const ams = AMULET_KEYS.filter(k => S.d.amulets[k] > 0);
      scr.querySelector('.list').innerHTML = ams.map(k => `
        <div class="row"><div class="row-ico">${Art.amulet(k)}</div><div class="row-main"><b>${AMULETS[k].name}</b><small>${AMULETS[k].desc}. Надевается на карточке духа.</small></div>
        <div class="row-side"><span class="cnt">×${S.d.amulets[k]}</span></div></div>`).join('') + keys.map(k => `
        <div class="row"><div class="row-ico">${Art.item(k)}</div><div class="row-main"><b>${ITEMS[k].name}</b><small>${ITEMS[k].desc}</small></div>
        <div class="row-side"><span class="cnt">×${S.d.items[k]}</span><div class="row-acts">${k === 'incense' ? `<button class="btn small primary use-inc">${S.incenseActive() ? 'Горит' : 'Зажечь'}</button>` : ''}<button class="btn-round small drop" data-k="${k}" aria-label="Выбросить">${this.I.trash}</button></div></div></div>`).join('')
        || '<div class="empty">Сумка пуста. Загляни к ближайшему роднику!</div>';
    };
    scr.addEventListener('click', async e => {
      const drop = e.target.closest('.drop');
      if (drop) { this.discard(drop.dataset.k, () => { render(); this.refreshHud(); }); return; }
      if (!e.target.closest('.use-inc')) return;
      if (S.incenseActive()) { this.toast(`Ладан ещё горит: ${U.fmtTime(S.d.incenseUntil - U.now())}`); return; }
      if (await Game.try('incense')) {
        Sfx.play('spin'); this.toast('Ладан зажжён — духи потянулись к тебе', 'good');
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
      title: 'Выбросить', cls: 'drop-modal',
      html: `<div class="drop-item">${Art.item(k)}<div><b>${ITEMS[k].name}</b><small>В сумке: ${max}</small></div></div>
        <div class="drop-step"><button class="btn-round step" data-d="-1">−</button><input type="number" class="drop-n" min="1" max="${max}" value="1" inputmode="numeric"><button class="btn-round step" data-d="1">+</button></div>
        <input type="range" class="drop-range" min="1" max="${max}" value="1">
        <div class="drop-quick">${[...new Set([1, 10, Math.ceil(max / 2), max])].filter(v => v >= 1 && v <= max).map(v => `<button class="btn small ghost" data-v="${v}">${v === max ? `Все (${v})` : v}</button>`).join('')}</div>`,
      buttons: [{ label: 'Отмена' }, { label: 'Выбросить', cls: 'danger', keep: true, fn: async () => {
        const r = await Game.try('discard', { k, n });
        if (!r) return;
        m.close(); Sfx.play('tap');
        this.toast(`Выброшено: ${ITEMS[k].name} ×${r.n}`);
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
    const scr = this.screen('Коконы', '<div class="coc-info"></div><div class="coc-box"></div>', 'coc-screen');
    const render = () => {
      const inc = S.incubating();
      scr.querySelector('.head-extra').textContent = `${S.d.cocoons.length}/9`;
      scr.querySelector('.coc-info').innerHTML = `Коконы согреваются, пока ты ходишь. Пройдено всего: <b>${U.fmtDist(S.d.stats.km * 1000)}</b>`;
      const card = c => {
        const ready = c.inc && c.walked >= c.km;
        return `<div class="coc-card ${ready ? 'ready' : ''}" data-id="${c.id}">
          <div class="coc-art ${c.inc ? 'warm' : ''}">${Art.cocoon(c.km)}</div>
          <b>${COCOON_TIERS[c.km].name}</b><small>${c.km} км</small>
          ${c.inc ? `<div class="pbar"><i style="width:${Math.min(100, c.walked / c.km * 100)}%"></i></div><small>${c.walked.toFixed(2)} / ${c.km} км</small>` : ''}
          ${ready ? '<button class="btn small primary hatch">Вылупить!</button>' : c.inc ? '' : `<button class="btn small warm-btn" ${inc >= 3 ? 'disabled' : ''}>Греть</button>`}
        </div>`;
      };
      // греются — три места (свободные видны), ждут — остальные
      const warm = S.d.cocoons.filter(c => c.inc), wait = S.d.cocoons.filter(c => !c.inc);
      scr.querySelector('.coc-box').innerHTML = !S.d.cocoons.length ? '<div class="empty">Коконов нет. Иногда их можно найти в роднике.</div>'
        : `<h3 class="prof-h">Греются <small>${warm.length} из 3</small></h3><div class="grid coc">${warm.map(card).join('')}${`<div class="coc-card coc-slot"><div class="coc-art"></div><b>Свободно</b><small>${wait.length ? 'нажми «Греть» у кокона ниже' : 'коконы находят в родниках'}</small></div>`.repeat(Math.max(0, 3 - warm.length))}</div>
          ${wait.length ? `<h3 class="prof-h">Ждут <small>${wait.length}</small></h3><div class="grid coc">${wait.map(card).join('')}</div>` : ''}`;
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
      html: `<div class="hatch-stage"><div class="hatch-coc">${Art.cocoon(c.km)}</div><div class="hatch-sp">${Art.of(res.sp)}</div><div class="evo-glow"></div></div><div class="evo-text">Кокон шевелится…</div>`,
    });
    setTimeout(() => Sfx.play('wobble'), 700);
    setTimeout(() => Sfx.play('wobble'), 1400);
    setTimeout(() => {
      Sfx.play('hatch'); U.vibrate([40, 60, 100]);
      m.querySelector('.hatch-stage').classList.add('open');
      m.querySelector('.evo-text').innerHTML = `Из кокона появился <b>${res.sp.shiny ? '✦ сияющий ' : ''}${SP[res.sp.sid].name}</b>!<div class="small">СИЛА ${S.power(res.sp)} · +${res.essence} эссенции · +${res.sparks} искр</div>${res.isNew ? '<div class="badge-new">Новая запись в Бестиарии!</div>' : ''}`;
      const b = U.el('<button class="btn primary">Привет!</button>');
      b.onclick = () => { m.close(); done(); };
      m.querySelector('.modal-btns').appendChild(b);
    }, 2200);
  },
});
