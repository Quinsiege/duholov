'use strict';
/* Лавка Ордена и Сезонная тропа (3.12). Цены, награды и списание — на сервере (shopBuy, passClaim, passGold),
   здесь только показ. Каталог и награды — Rules.SHOP / Rules.passReward. */

// Картинка и подпись награды/товара
const Loot = {
  art(k, rw) {
    if (k === 'cocoon') return Art.cocoon(rw.cocoon || rw.km || 5);
    if (k === 'amulet') return Art.amulet(AMULETS[rw.id] ? rw.id : 'perun');
    if (k === 'sparks') return '<b class="big-n">✦</b>';
    if (k === 'look') return Art.avatar(LOOK.cloak.some(c => c.c === rw.look) ? { cloak: rw.look, eyes: '#5eead4', emblem: 'charm' } : { cloak: '#241a45', eyes: '#5eead4', emblem: rw.look });
    if (k === 'bag') return Art.item('gift');
    return Art.item(k) || '<b class="big-n">✦</b>';
  },
  // Список частей награды { k, n, label } из объекта Rules.passReward / товара
  parts(rw) {
    const out = [];
    for (const [k, n] of Object.entries(rw)) {
      if (!n) continue;
      if (k === 'sparks') out.push({ k, n, label: `✦ ${U.fmtNum(n)}` });
      else if (k === 'grivna') out.push({ k, n, label: `${n} гривен` });
      else if (k === 'cocoon') out.push({ k, n: 1, label: `Кокон ${n} км`, cocoon: n });
      else if (k === 'amulet') out.push({ k, n: 1, label: 'Амулет' });
      else if (k === 'look') { const x = LOOK.cloak.find(c => c.c === n) || LOOK.emblem.find(m => m.id === n); out.push({ k, n: 1, label: x ? x.name : 'Облик', look: n }); }
      else if (ITEMS[k]) out.push({ k, n, label: n > 1 ? `${ITEMS[k].name} ×${n}` : ITEMS[k].name });
    }
    return out;
  },
  // Полученное с сервера: [{ k, n, label }]
  cells(got) {
    const text = x => x.k === 'sparks' || x.k === 'grivna' || x.k === 'xp' ? `+${U.fmtNum(x.n)} ${x.label}`
      : x.k === 'bag' ? `+${x.n} мест в сумке` : x.n > 1 ? `${x.label} ×${x.n}` : x.label;
    return `<div class="lvl-rw">${got.map(x => `<div>${this.art(x.k, x)}<span>${text(x)}</span></div>`).join('')}</div>`;
  },
};

const Shop = {
  // Товар дня ещё не куплен — значок на плитке меню
  dealFresh() { return S.d && S.d.shop.deal !== U.today(); },
  price(it) { return it.cur === 'sparks' ? `✦ ${U.fmtNum(it.price)}` : `${Art.item('grivna')} ${U.fmtNum(it.price)}`; },
  wallet() { return `<div class="shop-wallet"><span class="spark">✦ ${U.fmtNum(S.d.sparks)} искр</span><span class="grivna">${Art.item('grivna')} ${U.fmtNum(S.d.grivna || 0)} гривен</span></div>`; },

  screen() {
    Sfx.init(); Sfx.play('tap');
    const scr = UI.screen('Лавка Ордена', '<div class="shop"></div>', 'shop-screen');
    const box = scr.querySelector('.shop');
    const render = () => {
      const today = U.today(), deal = Rules.shopDeal(today), dealBought = S.d.shop.deal === today;
      const lvlLock = it => it.lvl && S.d.level < it.lvl ? `с ${it.lvl} ур.` : '';
      const row = (it, id, extra = '') => {
        const lock = lvlLock(it), left = it.bag ? Rules.BAG_MAX_UP - S.d.bagExtra : 1;
        const icon = it.bag ? `<div class="shop-ico bag">${UI.I.bag}</div>` : `<div class="shop-ico">${Loot.art(it.give ? Object.keys(it.give)[0] : it.cocoon ? 'cocoon' : 'amulet', it)}</div>`;
        return `<div class="shop-row ${lock || !left ? 'off' : ''}">${icon}<div class="row-main"><b>${it.name}</b><small>${it.desc || ''}${extra}</small></div>
          <button class="btn small ${it.cur === 'grivna' ? 'primary' : ''} buy" data-id="${id}" ${lock || !left ? 'disabled' : ''}>${lock || (left ? this.price(it) : 'Максимум')}</button></div>`;
      };
      const bag = { ...Rules.SHOP.find(x => x.bag), price: Rules.bagPrice(S.d.bagExtra) };
      const cloaks = LOOK.cloak.filter(c => c.shop);
      box.innerHTML = `${this.wallet()}
        <div class="shop-deal ${dealBought ? 'off' : ''}"><div class="shop-tag">Товар дня · −40%</div>${row(deal, 'deal', dealBought ? ' · куплен, завтра будет новый' : '')}</div>
        <h3 class="prof-h">Сумка <small>${S.bagCount()} / ${S.bagLimit()}</small></h3>
        ${row(bag, 'bag', ` · расширено ${S.d.bagExtra} из ${Rules.BAG_MAX_UP}`)}
        <h3 class="prof-h">Припасы</h3>
        ${Rules.SHOP.filter(x => !x.bag).map(x => row(x, x.id)).join('')}
        <h3 class="prof-h">Облик</h3>
        <div class="shop-cloaks">${cloaks.map(c => `<button class="shop-cloak ${S.d.owned[c.c] ? 'owned' : ''}" data-id="look:${c.c}" ${S.d.owned[c.c] ? 'disabled' : ''}>
          <div class="shop-ava">${Art.avatar({ cloak: c.c, eyes: S.d.look.eyes, emblem: S.d.look.emblem })}</div><b>${c.name}</b><small>${S.d.owned[c.c] ? 'Уже твой' : this.price({ cur: 'grivna', price: c.shop })}</small></button>`).join('')}</div>
        <div class="q-note">Гривны дают за серию дней (на 7-й день — 30), сундук дня, новые уровни, главы Летописи, дань с Капищ и Сезонную тропу. Искры — за поимки, родники и бои.</div>`;
    };
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-id]'); if (!b || b.disabled) return;
      const id = b.dataset.id, deal = id === 'deal';
      const it = deal ? Rules.shopDeal(U.today()) : id === 'bag' ? { ...Rules.SHOP.find(x => x.bag), price: Rules.bagPrice(S.d.bagExtra) }
        : id.startsWith('look:') ? (c => ({ name: `Плащ «${c.name}»`, cur: 'grivna', price: c.shop }))(LOOK.cloak.find(c => c.c === id.slice(5))) : Rules.SHOP.find(x => x.id === id);
      UI.confirm(it.name, `Купить за ${this.price(it)}?`, 'Купить', async () => {
        const r = await Game.try('shopBuy', deal ? { deal: true } : { id });
        if (!r) return;
        Sfx.play('spin'); U.vibrate(20);
        UI.modal({ title: 'Покупка', html: `<p>${U.esc(it.name)} — твоё!</p>${Loot.cells(r.got)}`, buttons: [{ label: 'Отлично', cls: 'primary' }] });
        render(); UI.refreshHud();
      });
    });
    render();
  },
};

const Pass = {
  // Состояние тропы текущего сезона (если сезон сменился — пустое, сервер заведёт новое)
  season() { const d = U.local(); return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`; },
  state() {
    const P = S.d.pass;
    return P && P.season === this.season() ? P : { season: this.season(), pts: 0, gold: false, got: { free: [], gold: [] } };
  },
  endsAt() { const d = U.local(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - U.tzMin() * 60000; },
  claimable() {
    if (!S.d) return 0;
    const P = this.state(), L = Rules.passLevel(P.pts);
    let n = 0;
    for (let l = 1; l <= L; l++) { if (!P.got.free.includes(l)) n++; if (P.gold && !P.got.gold.includes(l)) n++; }
    return n;
  },
  MONTHS: ['Январская', 'Февральская', 'Мартовская', 'Апрельская', 'Майская', 'Июньская', 'Июльская', 'Августовская', 'Сентябрьская', 'Октябрьская', 'Ноябрьская', 'Декабрьская'],

  screen() {
    Sfx.init(); Sfx.play('tap');
    const scr = UI.screen('Сезонная тропа', '<div class="pass"></div>', 'pass-screen');
    const box = scr.querySelector('.pass');
    const render = () => {
      const P = this.state(), L = Rules.passLevel(P.pts), per = Rules.PASS.PER, max = Rules.PASS.LEVELS;
      const month = this.MONTHS[+P.season.split('-')[1] - 1];
      const inLvl = L >= max ? per : P.pts - L * per;
      const cell = (track, l) => {
        const rw = Loot.parts(Rules.passReward(track, l)), got = P.got[track].includes(l), open = L >= l, can = open && !got && (track === 'free' || P.gold);
        const lock = track === 'gold' && !P.gold;
        return `<button class="pass-cell ${track} ${got ? 'got' : can ? 'can' : ''} ${lock ? 'lock' : ''}" data-t="${track}" data-l="${l}" ${can ? '' : 'disabled'}>
          <div class="pc-art">${Loot.art(rw[0].k, rw[0])}</div><small>${rw.map(x => x.label).join(' · ')}</small>${got ? '<i>✓</i>' : ''}</button>`;
      };
      box.innerHTML = `
        <div class="story-card pass-head">
          <div class="story-num">${month} тропа · до конца ${U.fmtTime(Math.max(0, this.endsAt() - U.now()))}</div>
          <h3>Ступень ${L} из ${max}</h3>
          <div class="pbar big"><i style="width:${inLvl / per * 100}%"></i></div>
          <small>${L >= max ? 'Тропа пройдена!' : `${inLvl} / ${per} очков до ступени ${L + 1}`} · очки — за поимки, родники, прогулки, коконы и бои</small>
          ${P.gold ? '<div class="pass-gold on">★ Золотая тропа открыта</div>'
            : `<button class="btn primary wide pass-buy">Открыть Золотую тропу · ${Art.item('grivna')} ${Rules.PASS.GOLD}</button><small class="pass-note">Золотые ступени: золотые обереги, коконы 10 км, амулеты, гривны, плащ «Сезонная тропа» и Знак Тропы. У тебя ${U.fmtNum(S.d.grivna || 0)} гривен.</small>`}
        </div>
        <div class="pass-cols"><span>Ступень</span><span>Для всех</span><span>★ Золотая</span></div>
        ${Array.from({ length: max }, (_, i) => i + 1).map(l => `<div class="pass-row ${L >= l ? 'open' : ''}"><div class="pass-l">${l}</div>${cell('free', l)}${cell('gold', l)}</div>`).join('')}`;
    };
    box.addEventListener('click', async e => {
      if (e.target.closest('.pass-buy')) {
        UI.confirm('Золотая тропа', `Открыть Золотую тропу этого сезона за ${Rules.PASS.GOLD} гривен? Золотые награды уже пройденных ступеней можно будет забрать сразу.`, 'Открыть', async () => {
          if (!await Game.try('passGold')) return;
          Sfx.play('levelup'); U.vibrate([40, 60, 120]);
          UI.toast('Золотая тропа открыта!', 'good');
          render(); UI.refreshHud();
        });
        return;
      }
      const c = e.target.closest('.pass-cell'); if (!c || c.disabled || this._busy) return;
      this._busy = true;
      const r = await Game.try('passClaim', { lvl: +c.dataset.l, track: c.dataset.t });
      this._busy = false;
      if (!r) return;
      Sfx.play('spin');
      UI.modal({ title: `Ступень ${c.dataset.l}`, html: Loot.cells(r.got), buttons: [{ label: 'Забрать', cls: 'primary' }] });
      render(); UI.refreshHud();
    });
    render();
    // прокрутить к первой незабранной ступени
    setTimeout(() => { const f = box.querySelector('.pass-cell.can') || box.querySelectorAll('.pass-row.open')[Math.max(0, Rules.passLevel(this.state().pts) - 1)]; if (f) f.scrollIntoView({ block: 'center' }); }, 100);
  },
};
