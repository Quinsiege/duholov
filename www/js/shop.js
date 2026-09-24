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
      else if (k === 'zlat') out.push({ k, n, label: `${n} ${U.plural(n, 'златник', 'златника', 'златников')}` });
      else if (k === 'cocoon') out.push({ k, n: 1, label: `Кокон ${n} км`, cocoon: n });
      else if (k === 'amulet') out.push({ k, n: 1, label: 'Амулет' });
      else if (k === 'look') { const x = LOOK.cloak.find(c => c.c === n) || LOOK.emblem.find(m => m.id === n); out.push({ k, n: 1, label: x ? x.name : 'Облик', look: n }); }
      else if (ITEMS[k]) out.push({ k, n, label: n > 1 ? `${ITEMS[k].name} ×${n}` : ITEMS[k].name });
    }
    return out;
  },
  // Полученное с сервера: [{ k, n, label }]
  cells(got) {
    const text = x => x.k === 'sparks' || x.k === 'zlat' || x.k === 'xp' ? `+${U.fmtNum(x.n)} ${x.label}`
      : x.k === 'bag' ? `+${x.n} мест в сумке` : x.n > 1 ? `${x.label} ×${x.n}` : x.label;
    return `<div class="lvl-rw">${got.map(x => `<div>${this.art(x.k, x)}<span>${text(x)}</span></div>`).join('')}</div>`;
  },
};

// Казна Ордена: златники за рубли. Страница оплаты — ЮKassa (карта, СБП, SberPay, T-Pay, ЮMoney, баланс телефона);
// итог сервер узнаёт у ЮKassa сам (Game.pay('sync')), а начисляет действие payClaim.
const Treasury = {
  KEY: 'duholov.pay.open', // ждём итог оплаты (удобство: проверить при возвращении в игру)
  info: null,
  async load() {
    if (!this.info) { try { this.info = await Game.pay('info'); } catch (e) { return { on: false }; } }
    return this.info;
  },
  waiting() { try { return +localStorage.getItem(this.KEY) || 0; } catch (e) { return 0; } },
  setWaiting(v) { try { v ? localStorage.setItem(this.KEY, String(Date.now())) : localStorage.removeItem(this.KEY); } catch (e) {} },
  html(info) {
    // наборы с ценами видны всегда; пока оплата не подключена (info.on = false), купить нельзя
    return `<h3 class="prof-h">Казна Ордена <small>златники за рубли</small></h3>
      <div class="pay-packs">${Rules.PAY.map(p => `<button class="pay-pack ${p.hot ? 'hot' : ''}" data-pay="${p.id}">
        ${p.hot ? '<span class="pay-hot">Выгодно</span>' : p.bonus ? `<span class="pay-bonus">+${p.bonus}%</span>` : ''}
        <div class="pay-coins">${Art.item('zlat')}</div><b>${U.fmtNum(p.zlat)}</b><small>${U.plural(p.zlat, 'златник', 'златника', 'златников')}</small>
        <span class="pay-price">${U.fmtNum(p.rub)} ₽</span></button>`).join('')}</div>
      <div class="q-note">${info.on ? '' : '<b>Оплата скоро откроется.</b> '}Оплата картой, через СБП, SberPay, T-Pay, ЮMoney или с баланса телефона — на защищённой странице ЮKassa. <button class="linkish pay-offer">Оферта</button>${this.waiting() ? ' <button class="linkish pay-recheck">Я оплатил — проверить</button>' : ''}</div>`;
  },
  buy(id, info, onDone) {
    const p = Rules.PAY.find(x => x.id === id);
    const m = UI.modal({
      title: 'Казна Ордена', cls: 'pay-modal pay-buy',
      html: `<div class="pay-sum">${Art.item('zlat')}<div><b>${U.fmtNum(p.zlat)} ${U.plural(p.zlat, 'златник', 'златника', 'златников')}</b><small>${p.bonus ? `с бонусом +${p.bonus}%` : 'набор'}</small></div><span>${U.fmtNum(p.rub)} ₽</span></div>
        ${info.receipt ? '<input type="email" class="pay-email" placeholder="Почта для чека" autocomplete="email" inputmode="email">' : ''}
        <p class="pay-note">Откроется страница оплаты ЮKassa: карта, СБП, SberPay, T-Pay, ЮMoney или баланс телефона. После оплаты вернись в игру — златники придут сами.</p>
        <p class="pay-note">Оплачивая, ты принимаешь условия <button class="linkish pay-offer">публичной оферты</button>.</p>`,
      buttons: [{ label: 'Отмена' }, { label: `Оплатить ${U.fmtNum(p.rub)} ₽`, cls: 'primary', keep: true, fn: async () => {
        const email = info.receipt ? m.querySelector('.pay-email').value.trim() : '';
        if (m._busy) return;
        m._busy = true;
        try {
          const r = await Game.pay('create', { pack: id, email });
          this.setWaiting(true);
          m.close();
          if (!/^https:\/\/([a-z0-9-]+\.)*(yoomoney\.ru|yookassa\.ru)\//i.test(r.url || '')) throw new Error('Неверная ссылка на оплату');
          location.href = r.url; // в приложении откроется браузер, в браузере — страница оплаты
        } catch (e) { UI.toast(U.esc(e.message), 'bad'); } finally { m._busy = false; }
        onDone && onDone();
      } }],
    });
    m.querySelector('.pay-offer').onclick = () => this.offer();
  },
  // Публичная оферта — экраном внутри игры (в приложении ссылка на свой сайт заменила бы игру)
  offer() { UI.screen('Публичная оферта', '<iframe class="offer-frame" src="offer.html" title="Публичная оферта"></iframe>', 'offer-screen'); },
  // Итог оплаты: сервер спрашивает ЮKassa и начисляет оплаченное
  async check(force) {
    if (this.waiting() && Date.now() - this.waiting() > 3 * 86400000) this.setWaiting(false); // старше 3 дней — не ждём
    if (!S.d || this._checking || (!force && !this.waiting())) return;
    this._checking = true;
    try {
      const s = await Game.pay('sync');
      if (s.paid) {
        const r = await Game.try('payClaim');
        if (r && r.zlat) {
          Sfx.play('levelup'); U.vibrate([40, 60, 120]);
          UI.modal({ title: 'Казна Ордена', html: `<div class="lvl-rw"><div>${Art.item('zlat')}<span>+${U.fmtNum(r.zlat)} ${U.plural(r.zlat, 'златник', 'златника', 'златников')}</span></div></div><p>Спасибо, что поддерживаешь Орден!</p>`, buttons: [{ label: 'Отлично', cls: 'primary' }] });
          UI.refreshHud();
        }
      }
      if (!s.open) this.setWaiting(false);
      else if (force) UI.toast('Оплата ещё не завершена — если ты оплатил, проверь через минуту');
      if (force && !s.paid && !s.open) UI.toast('Оплаченных наборов не найдено');
    } catch (e) { if (force) UI.toast(U.esc(e.message), 'bad'); }
    finally { this._checking = false; }
  },
};

const Shop = {
  // Товар дня ещё не куплен — значок на плитке меню
  dealFresh() { return S.d && S.d.shop.deal !== U.today(); },
  price(it) { return it.cur === 'sparks' ? `✦ ${U.fmtNum(it.price)}` : `<span class="cur">${Art.item('zlat')}</span> ${U.fmtNum(it.price)}`; },
  wallet() { return `<div class="shop-wallet"><span class="spark">✦ ${U.fmtNum(S.d.sparks)} искр</span><span class="zlat">${Art.item('zlat')} ${U.fmtNum(S.d.zlat || 0)} ${U.plural(S.d.zlat || 0, 'златник', 'златника', 'златников')}</span></div>`; },

  // На покупку не хватает валюты
  poor(it) { return (S.d[it.cur === 'sparks' ? 'sparks' : 'zlat'] || 0) < it.price; },
  // Обменов сегодня осталось
  exLeft() { const ex = S.d.shop.ex; return Rules.EXCHANGE.DAY - (ex && ex.day === U.today() ? ex.n : 0); },
  exchangeHtml() {
    const E = Rules.EXCHANGE, left = this.exLeft(), can = Math.min(left, Math.floor(S.d.sparks / E.SPARKS));
    const btn = n => `<button class="btn small ${n === 1 ? 'primary' : ''}" data-ex="${n}" ${can >= n ? '' : 'disabled'}>×${n}</button>`;
    return `<div class="shop-ex">
      <div class="ex-rate"><span class="spark">✦ ${U.fmtNum(E.SPARKS)}</span><b>→</b><span class="zlat">${Art.item('zlat')} ${E.ZLAT}</span></div>
      <div class="row-main"><b>Обменник</b><small>${left ? `Сегодня ещё ${left} ${U.plural(left, 'обмен', 'обмена', 'обменов')}` : 'На сегодня всё — приходи завтра'}</small></div>
      <div class="ex-btns">${btn(1)}${[5, left].filter((v, i, a) => v > 1 && a.indexOf(v) === i).map(btn).join('')}</div>
    </div>`;
  },

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
          <button class="btn small ${it.cur === 'zlat' ? 'primary' : 'spark-btn'} ${!lock && left && this.poor(it) ? 'poor' : ''} buy" data-id="${id}" ${lock || !left ? 'disabled' : ''}>${lock || (left ? this.price(it) : 'Максимум')}</button></div>`;
      };
      const bag = { ...Rules.SHOP.find(x => x.bag), price: Rules.bagPrice(S.d.bagExtra) };
      const cloaks = LOOK.cloak.filter(c => c.shop);
      box.innerHTML = `${this.wallet()}${Treasury.html(pay)}
        <div class="shop-deal ${dealBought ? 'off' : ''}"><div class="shop-tag">Товар дня · −40%</div>${row(deal, 'deal', dealBought ? ' · куплен, завтра будет новый' : '')}</div>
        ${this.exchangeHtml()}
        <h3 class="prof-h">Сумка <small>${S.bagCount()} / ${S.bagLimit()}</small></h3>
        ${row(bag, 'bag', ` · расширено ${S.d.bagExtra} из ${Rules.BAG_MAX_UP}`)}
        <h3 class="prof-h">Припасы</h3>
        ${Rules.SHOP.filter(x => !x.bag).map(x => row(x, x.id)).join('')}
        <h3 class="prof-h">Облик</h3>
        <div class="shop-cloaks">${cloaks.map(c => `<button class="shop-cloak ${S.d.owned[c.c] ? 'owned' : this.poor({ cur: 'zlat', price: c.shop }) ? 'poor' : ''}" data-id="look:${c.c}" ${S.d.owned[c.c] ? 'disabled' : ''}>
          <div class="shop-ava">${Art.avatar({ cloak: c.c, eyes: S.d.look.eyes, emblem: S.d.look.emblem })}</div><b>${c.name}</b><small>${S.d.owned[c.c] ? 'Уже твой' : this.price({ cur: 'zlat', price: c.shop })}</small></button>`).join('')}</div>
        <div class="q-note">Златники дают за серию дней (на 7-й день — 30), сундук дня, новые уровни, главы Летописи, дань с Капищ и Сезонную тропу. Искры — за поимки, родники и бои.</div>`;
    };
    box.addEventListener('click', async e => {
      const pk = e.target.closest('[data-pay]'); if (pk) { if (pay.on) Treasury.buy(pk.dataset.pay, pay, render); else UI.toast('Оплата скоро откроется — следи за обновлениями'); return; }
      if (e.target.closest('.pay-recheck')) { await Treasury.check(true); render(); return; }
      if (e.target.closest('.pay-offer')) { Treasury.offer(); return; }
      const x = e.target.closest('[data-ex]');
      if (x && !x.disabled) {
        const n = +x.dataset.ex, E = Rules.EXCHANGE;
        const r = await Game.try('exchange', { n });
        if (!r) return;
        Sfx.play('spin'); U.vibrate(20);
        UI.toast(`Обмен: ✦ ${U.fmtNum(E.SPARKS * n)} → ${E.ZLAT * n} ${U.plural(E.ZLAT * n, 'златник', 'златника', 'златников')}`, 'good');
        render(); UI.refreshHud();
        return;
      }
      const b = e.target.closest('[data-id]'); if (!b || b.disabled) return;
      // не хватает валюты — сразу подсказка, где её взять, без окна покупки
      if (b.classList.contains('poor')) {
        const zl = b.classList.contains('primary') || b.classList.contains('shop-cloak');
        UI.toast(zl ? 'Не хватает златников — обменяй искры в Обменнике или загляни в Казну' : 'Не хватает искр — их дают за поимки, родники и бои');
        return;
      }
      const id = b.dataset.id, deal = id === 'deal';
      const it = deal ? Rules.shopDeal(U.today()) : id === 'bag' ? { ...Rules.SHOP.find(x => x.bag), price: Rules.bagPrice(S.d.bagExtra) }
        : id.startsWith('look:') ? (c => ({ name: `Плащ «${c.name}»`, cur: 'zlat', price: c.shop }))(LOOK.cloak.find(c => c.c === id.slice(5))) : Rules.SHOP.find(x => x.id === id);
      const cur = it.cur === 'sparks' ? 'sparks' : 'zlat', left = (S.d[cur] || 0) - it.price;
      UI.confirm(it.name, `Купить за ${this.price(it)}? После покупки останется ${this.price({ cur: it.cur, price: left })}.`, 'Купить', async () => {
        const r = await Game.try('shopBuy', deal ? { deal: true } : { id });
        if (!r) return;
        Sfx.play('spin'); U.vibrate(20);
        UI.modal({ title: 'Покупка', html: `<p>${U.esc(it.name)} — твоё!</p>${Loot.cells(r.got)}`, buttons: [{ label: 'Отлично', cls: 'primary' }] });
        render(); UI.refreshHud();
      });
    });
    let pay = { on: false };
    render();
    Treasury.load().then(i => { pay = i; if (scr.isConnected) render(); });
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
          <div class="story-num">${month} тропа · <span class="nowrap">до конца ${U.fmtTime(Math.max(0, this.endsAt() - U.now()))}</span></div>
          <h3>Ступень ${L} из ${max}</h3>
          <div class="pbar big"><i style="width:${inLvl / per * 100}%"></i></div>
          <small>${L >= max ? 'Тропа пройдена!' : `${inLvl} / ${per} очков до ступени ${L + 1}`} · очки — за поимки, родники, прогулки, коконы и бои</small>
          ${P.gold ? '<div class="pass-gold on">★ Золотая тропа открыта</div>'
            : `<button class="btn primary wide pass-buy">Открыть Золотую тропу · ${Art.item('zlat')} ${Rules.PASS.GOLD}</button><small class="pass-note">Золотые ступени: золотые обереги, коконы 10 км, амулеты, златники, плащ «Сезонная тропа» и Знак Тропы. У тебя ${U.fmtNum(S.d.zlat || 0)} ${U.plural(S.d.zlat || 0, 'златник', 'златника', 'златников')}.</small>`}
        </div>
        <div class="pass-cols"><span>Ступень</span><span>Для всех</span><span>★ Золотая</span></div>
        ${Array.from({ length: max }, (_, i) => i + 1).map(l => `<div class="pass-row ${L >= l ? 'open' : ''}"><div class="pass-l">${l}</div>${cell('free', l)}${cell('gold', l)}</div>`).join('')}`;
    };
    box.addEventListener('click', async e => {
      if (e.target.closest('.pass-buy')) {
        UI.confirm('Золотая тропа', `Открыть Золотую тропу этого сезона за ${Rules.PASS.GOLD} златников? Золотые награды уже пройденных ступеней можно будет забрать сразу.`, 'Открыть', async () => {
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
