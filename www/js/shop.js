'use strict';
/* Лавка Ордена и Сезонная тропа (3.12). Цены, награды и списание — на сервере (shopBuy, passClaim, passGold),
   здесь только показ. Каталог и награды — Rules.SHOP / Rules.passReward. */

// Картинка и подпись награды/товара
const Loot = {
  art(k, rw) {
    if (k === 'cocoon') return Art.cocoon(rw.cocoon || rw.km || 5);
    if (k === 'amulet') return Art.amulet(AMULETS[rw.id] ? rw.id : 'perun');
    if (k === 'sparks') return Art.item('sparks');
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
      else if (k === 'zlat') out.push({ k, n, label: ru`${n} ${U.plural(n, ru`монета`, ru`монеты`, ru`монет`)}` });
      else if (k === 'cocoon') out.push({ k, n: 1, label: ru`Кокон ${n} км`, cocoon: n });
      else if (k === 'amulet') out.push({ k, n: 1, label: ru`Амулет` });
      else if (k === 'amuletPick') out.push({ k: 'amulet', n: 1, label: ru`Амулет на выбор` }); // 5.1.21: Тропа — выбирает Ловчий
      else if (k === 'look') { const x = LOOK.cloak.find(c => c.c === n) || LOOK.emblem.find(m => m.id === n) || LOOK.skin.find(k => `skin:${k.id}` === n) || LOOK.bg.find(k => `bg:${k.id}` === n) || LOOK.frame.find(k => `frame:${k.id}` === n); out.push({ k, n: 1, label: x ? x.name : ru`Облик`, look: n }); }
      else if (ITEMS[k]) out.push({ k, n, label: n > 1 ? `${ITEMS[k].name} ×${n}` : ITEMS[k].name });
    }
    return out;
  },
  // Полученное с сервера: [{ k, n, label }]
  cells(got) {
    const text = x => x.k === 'sparks' || x.k === 'zlat' || x.k === 'xp' ? `+${U.fmtNum(x.n)} ${I18N.back(x.label)}`
      : x.k === 'bag' ? ru`+${x.n} мест в сумке` : x.n > 1 ? `${I18N.back(x.label)} ×${x.n}` : I18N.back(x.label);
    return `<div class="lvl-rw">${got.map(x => `<div>${this.art(x.k, x)}<span>${text(x)}</span></div>`).join('')}</div>`;
  },
};

// 4.27: версия приложения для Google Play (store=play) — покупки Казны только через Google Play Billing.
// Приложение проводит покупку (DuholovNative.billing*, ответы — window.nativeBilling), засчитывает её сервер (Game.pay('gplay')).
const GPlay = {
  waits: {}, // ждём ответа приложения по запросу: products | buy | pending (у каждого свой — запросы не перебивают друг друга)
  on() { return typeof Updater !== 'undefined' && Updater.STORE === 'play' && !!(window.DuholovNative && window.DuholovNative.billingBuy); },
  // ответ приложения на запрос op (или ошибка Google Play: code — BillingResponseCode)
  ask(op, fn, ms = 20000) {
    return new Promise((res, rej) => {
      const done = (o, e) => { clearTimeout(t); if (this.waits[op] === w) delete this.waits[op]; e ? rej(e) : res(o); };
      const t = setTimeout(() => done(null, new Error(ru`Google Play не ответил — попробуй ещё раз`)), ms);
      const w = o => o.type === 'error' ? done(null, Object.assign(new Error(this.msg(o)), { code: o.code })) : done(o);
      this.waits[op] = w;
      try { fn(); } catch (e) { done(null, e); }
    });
  },
  // ответ приложения → тот, кто его ждёт; покупка без ожидания (отложенная оплата прошла позже) — засчитать сразу
  got(o) {
    if (!o) return;
    const op = o.type === 'error' ? o.op : { products: 'products', purchases: 'buy', pending: 'pending' }[o.type];
    if (this.waits[op]) this.waits[op](o); else if (o.type === 'purchases') Treasury.recover();
  },
  msg(o) {
    if (o.code === 1) return ru`Покупка отменена`;
    if (o.code === 2 || o.code === 3 || o.code === -1) return ru`Покупки через Google Play недоступны на этом устройстве или в твоей стране`;
    if (o.code === 7) return ru`Этот набор уже оплачен — засчитываем`;
    return ru`Google Play: ошибка ${o.code}`;
  },
  products() { return this.ask('products', () => window.DuholovNative.billingProducts(JSON.stringify(Rules.PAY.map(p => p.id)))); },
  buy(id, acct) { return this.ask('buy', () => window.DuholovNative.billingBuy(id, acct), 10 * 60000); },
  pending() { return this.ask('pending', () => window.DuholovNative.billingPending()); },
  // засчитать покупки на сервере: state 1 — оплачено, 2 — отложенная оплата (засчитаем, когда пройдёт)
  async claim(list) {
    let n = 0, pend = 0;
    for (const p of list || []) {
      if (p.state === 2) { pend++; continue; }
      if (p.state !== 1) continue;
      for (const id of p.products || []) { const r = await Game.pay('gplay', { product: id, token: p.token }); if (r.pending) pend++; else if (r.credited) n++; }
    }
    return { n, pend };
  },
};
// ответы приложения; покупка, завершившаяся без ожидания (отложенная оплата прошла), — засчитать сразу
window.nativeBilling = o => GPlay.got(o);

// Казна Ордена: монеты за рубли. Страница оплаты — ЮKassa (карта, СБП, SberPay, T-Pay, ЮMoney);
// итог сервер узнаёт у ЮKassa сам (Game.pay('sync')), а начисляет действие payClaim.
const Treasury = {
  KEY: 'duholov.pay.open', // ждём итог оплаты (удобство: проверить при возвращении в игру)
  info: null,
  async load() {
    if (!this.info) { try { this.info = await Game.pay('info'); } catch (e) { return { on: false }; } }
    // 4.27: версия для Google Play — наборы и цены (в валюте игрока) из Google Play; ЮKassa здесь не используется
    const i = this.info;
    if (GPlay.on() && !(i.play && i.on)) {
      i.play = true; i.on = false; i.prices = i.prices || {};
      if (!i.gplay) i.why = ru`Покупки через Google Play пока не подключены`;
      else {
        try {
          const r = await GPlay.products();
          for (const x of r.list || []) i.prices[x.id] = x.price;
          i.on = Rules.PAY.some(p => i.prices[p.id]);
          if (!i.on) i.why = ru`Наборы монет в Google Play ещё не открыты`;
        } catch (e) { i.why = e.message; }
        this.recover();
      }
    }
    return i;
  },
  // 4.27: оплаченные в Google Play, но ещё не засчитанные покупки (игра закрылась посреди покупки, нет сети)
  async recover(show) {
    if (!GPlay.on() || this._recovering) return;
    this._recovering = true;
    try {
      const r = await GPlay.pending(), c = await GPlay.claim(r.list);
      if (c.n) { await Game.try('tick'); this.notice(); }
    } catch (e) { if (show) UI.toast(U.esc(e.message), 'bad'); }
    finally { this._recovering = false; }
  },
  async buyPlay(id, info, onDone) {
    if (this._busy) return;
    this._busy = true;
    try {
      const r = await GPlay.buy(id, info.gplay.acct), c = await GPlay.claim(r.list);
      if (c.n) { await Game.try('tick'); this.notice(); }
      else if (c.pend) UI.toast(ru`Оплата ещё не завершена — монеты придут, когда Google Play её подтвердит`);
    } catch (e) {
      if (e.code === 7) await this.recover(true);
      else if (e.code !== 1) UI.toast(U.esc(e.message), 'bad');
    } finally { this._busy = false; onDone && onDone(); }
  },
  waiting() { try { return +localStorage.getItem(this.KEY) || 0; } catch (e) { return 0; } },
  setWaiting(v) { try { v ? localStorage.setItem(this.KEY, String(Date.now())) : localStorage.removeItem(this.KEY); } catch (e) {} },
  html(info) {
    // наборы с ценами видны всегда; пока оплата не подключена (info.on = false), купить нельзя
    return `<h3 class="prof-h">${ru`Казна Ордена`} <small>${ru`монеты за рубли`}</small></h3>
      <div class="pay-packs">${Rules.PAY.map(p => `<button class="pay-pack ${p.hot ? 'hot' : ''}" data-pay="${p.id}">
        ${p.hot ? `<span class="pay-hot">${ru`Выгодно`}</span>` : p.bonus ? `<span class="pay-bonus">+${p.bonus}%</span>` : ''}
        <div class="pay-coins">${Art.item('zlat')}</div><b>${U.fmtNum(p.zlat)}</b><small>${U.plural(p.zlat, ru`монета`, ru`монеты`, ru`монет`)}</small>
        <span class="pay-price">${info.play ? U.esc(info.prices[p.id] || '—') : `${U.fmtNum(p.rub)} ₽`}</span></button>`).join('')}</div>
      ${info.play ? `<div class="q-note">${info.on ? ru`Оплата — через Google Play.` : `<b>${U.esc(info.why || '')}</b>`} <button class="linkish pay-mine">${ru`Мои покупки`}</button></div>` : `<div class="q-note">${info.on ? '' : `<b>${ru`Оплата скоро откроется.`}</b> `}${ru`Оплата картой, через СБП, SberPay, T-Pay или ЮMoney — на защищённой странице ЮKassa.`} <button class="linkish pay-offer">${ru`Оферта`}</button> <button class="linkish pay-mine">${ru`Мои покупки и чеки`}</button>${this.waiting() ? ` <button class="linkish pay-recheck">${ru`Я оплатил — проверить`}</button>` : ''}</div>`}`;
  },
  buy(id, info, onDone) {
    if (info.play) return this.buyPlay(id, info, onDone);
    const p = Rules.PAY.find(x => x.id === id);
    const m = UI.modal({
      title: ru`Казна Ордена`, cls: 'pay-modal pay-buy',
      html: `<div class="pay-sum">${Art.item('zlat')}<div><b>${ru`${U.fmtNum(p.zlat)} ${U.plural(p.zlat, ru`монета`, ru`монеты`, ru`монет`)}`}</b><small>${p.bonus ? ru`с бонусом +${p.bonus}%` : ru`набор`}</small></div><span>${U.fmtNum(p.rub)} ₽</span></div>
        ${info.receipt ? `<input type="email" class="pay-email" placeholder="${ru`Почта для чека`}" autocomplete="email" inputmode="email">` : ''}
        <p class="pay-note">${ru`Откроется страница оплаты ЮKassa: карта, СБП, SberPay, T-Pay или ЮMoney. После оплаты вернись в игру — монеты придут сами.`}</p>
        <p class="pay-note">${ru`Оплачивая, ты принимаешь условия ${`<button class="linkish pay-offer">${ru`публичной оферты`}</button>`}.`}</p>`,
      buttons: [{ label: ru`Отмена` }, { label: ru`Оплатить ${U.fmtNum(p.rub)} ₽`, cls: 'primary', keep: true, fn: async () => {
        const email = info.receipt ? m.querySelector('.pay-email').value.trim() : '';
        if (m._busy) return;
        m._busy = true;
        try {
          const r = await Game.pay('create', { pack: id, email });
          this.setWaiting(true);
          m.close();
          if (!/^https:\/\/([a-z0-9-]+\.)*(yoomoney\.ru|yookassa\.ru)\//i.test(r.url || '')) throw new Error(ru`Неверная ссылка на оплату`);
          location.href = r.url; // страница оплаты ЮKassa (в приложении 6+ — внутри него; после оплаты — обратно в игру)
        } catch (e) { UI.toast(U.esc(e.message), 'bad'); } finally { m._busy = false; }
        onDone && onDone();
      } }],
    });
    m.querySelector('.pay-offer').onclick = () => this.offer();
  },
  // Публичная оферта — экраном внутри игры (в приложении ссылка на свой сайт заменила бы игру)
  offer() { UI.doc(ru`Публичная оферта`, 'offer.html'); },
  // Итог оплаты: сервер спрашивает ЮKassa и начисляет оплаченное
  // 4.22: монеты начисляет сервер, как только ЮKassa подтвердила оплату (игрок может быть и не в игре);
  // игра показывает «+N монет» один раз — по отметке S.d.payNew — и сообщает серверу, что игрок увидел
  notice() {
    const n = S.d && S.d.payNew;
    if (!n || this._noticed === n || document.querySelector('.onb, .loader:not(.out)')) return; // не поверх загрузки и входа
    this._noticed = n;
    Sfx.play('levelup'); U.vibrate([40, 60, 120]);
    UI.modal({ title: ru`Казна Ордена`, html: `<div class="lvl-rw"><div>${Art.item('zlat')}<span>${ru`+${U.fmtNum(n)} ${U.plural(n, ru`монета`, ru`монеты`, ru`монет`)}`}</span></div></div><p>${ru`Оплата прошла — монеты уже в твоей Казне. Спасибо, что поддерживаешь Орден!`}</p><p class="pay-note">${this.info && this.info.play ? ru`Чек об оплате пришлёт Google Play на почту твоего аккаунта Google.` : ru`Чек об оплате появится через пару минут: Казна → «Мои покупки и чеки».`}</p>`, buttons: [{ label: ru`Отлично`, cls: 'primary' }] });
    UI.refreshHud();
    Game.act('payAck').then(() => { this._noticed = 0; }).catch(() => { this._noticed = 0; });
  },
  // 4.22.1: мои покупки — когда, что, сколько и чек об оплате (электронный чек самозанятого из «Мой налог»,
  // сервер пробивает его в течение минуты после оплаты — tools/server/duholov-payments)
  async purchases() {
    let r;
    try { r = await Game.pay('list'); } catch (e) { UI.toast(U.esc(e.message), 'bad'); return; }
    const list = (r && r.list) || [];
    const when = t => new Date(t).toLocaleString(I18N.locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    const row = x => `<div class="pl-row"><span class="pl-ico">${Art.item('zlat')}</span>
      <div class="row-main"><b>${ru`${U.fmtNum(x.zlat)} ${U.plural(x.zlat, ru`монета`, ru`монеты`, ru`монет`)}`}${x.gp ? '' : ` · ${U.fmtNum(x.rub)} ₽`}</b><small>${when(x.t)}${x.refunded ? ' · ' + ru`возврат` : ''}</small></div>
      ${x.gp ? '<span class="pl-wait">Google Play</span>' : x.receipt ? `<a class="pl-rc" href="${U.esc(x.receipt)}" target="_blank" rel="noopener">${ru`Чек`} ›</a>` : x.refunded ? '' : `<span class="pl-wait">${ru`чек готовится`}</span>`}</div>`;
    UI.modal({ title: ru`Мои покупки и чеки`, cls: 'pay-modal pay-list',
      html: list.length ? `<div class="pl-rows">${list.map(row).join('')}</div>`
        : `<p class="pay-note">${ru`Покупок пока нет`}</p>`,
      buttons: [{ label: ru`Закрыть` }] });
  },
  async check(force) {
    this.notice();
    if (GPlay.on()) { this.recover(force); return; } // 4.27: версия для Google Play — ЮKassa не используется
    if (this.waiting() && Date.now() - this.waiting() > 3 * 86400000) this.setWaiting(false); // старше 3 дней — не ждём
    if (!S.d || this._checking || (!force && !this.waiting())) return;
    this._checking = true;
    try {
      const s = await Game.pay('sync');
      // сервер начисляет сам (при проверке или по уведомлению ЮKassa) — забираем свежий прогресс; payClaim — если что-то осталось
      if (s.paid || s.credited) await Game.try(s.paid ? 'payClaim' : 'tick');
      const shown = !!(S.d && S.d.payNew);
      this.notice();
      if (!s.open) this.setWaiting(false);
      else if (force) UI.toast(ru`Оплата ещё не завершена — если ты оплатил, проверь через минуту`);
      if (force && !shown && !s.open) UI.toast(ru`Оплаченных наборов не найдено`);
    } catch (e) { if (force) UI.toast(U.esc(e.message), 'bad'); }
    finally { this._checking = false; }
  },
};

// 5.x: промокоды — ввод кода (Настройки → «Промокод», Лавка → Казна → «Есть промокод?»). Проверяет и начисляет сервер
// (действие promo, 034_promo_codes.sql): один раз на учётную запись, не больше 10 попыток в час
const Promo = {
  ask(onDone) {
    if (!S.d || !Game.on()) { UI.toast(ru`Промокоды работают, когда игра на связи с сервером`); return; }
    Sfx.init(); Sfx.play('tap');
    let busy = false;
    const m = UI.modal({
      title: ru`Промокод`, cls: 'promo-modal',
      html: `<div class="promo-ico">${Art.item('zlat')}</div>
        <p>${ru`Введи промокод — награда сразу придёт в игру. Каждый код можно ввести один раз.`}</p>
        <input class="input big promo-in" maxlength="40" placeholder="${ru`КОД`}" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" aria-label="${ru`Промокод`}">
        <p class="promo-err" role="alert" hidden></p>`,
      buttons: [{ label: ru`Отмена` }, { label: ru`Активировать`, cls: 'primary', keep: true, fn: () => go() }],
    });
    const inp = m.querySelector('.promo-in'), err = m.querySelector('.promo-err'), btn = m.querySelector('.modal-btns .primary');
    const go = async () => {
      const code = inp.value.trim();
      if (!code) { inp.focus(); return; }
      if (busy) return;
      busy = true; btn.disabled = true; err.hidden = true;
      try {
        const r = await Game.act('promo', { code });
        m.close();
        this.show(r);
        onDone && onDone();
      } catch (e) {
        err.textContent = e.message; err.hidden = false;
        Sfx.play('miss'); U.vibrate(30);
        inp.select();
      } finally { busy = false; btn.disabled = false; }
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    inp.addEventListener('input', () => { err.hidden = true; });
    setTimeout(() => { if (m.isConnected) inp.focus(); }, 250);
    return m;
  },
  // Окно «Промокод активирован!» — полученное с сервера: [{ k, n, label }]
  show(r) {
    const got = ((r && r.got) || []).map(x => x.k === 'zlat' ? { ...x, label: U.plural(x.n, ru`монета`, ru`монеты`, ru`монет`) }
      : x.k === 'sparks' ? { ...x, label: U.plural(x.n, ru`искра`, ru`искры`, ru`искр`) } : x);
    Sfx.play('levelup'); U.vibrate([40, 60, 120]);
    UI.modal({
      title: ru`Промокод активирован!`, cls: 'promo-modal promo-ok',
      html: `<div class="promo-code">${U.esc((r && r.code) || '')}</div>${got.length ? Loot.cells(got) : ''}
        <p>${ru`Награда уже у тебя — монеты в Казне, вещи в Сумке.`}</p>`,
      buttons: [{ label: ru`Отлично`, cls: 'primary' }],
    });
    UI.refreshHud();
  },
};

const Shop = {
  // Товар дня ещё не куплен — значок на плитке меню
  dealFresh() { return S.d && S.d.shop.deal !== U.today(); },
  price(it) { return it.cur === 'sparks' ? `<span class="cur">${Art.item('sparks')}</span> ${U.fmtNum(it.price)}` : `<span class="cur">${Art.item('zlat')}</span> ${U.fmtNum(it.price)}`; },
  wallet() { return `<div class="shop-wallet"><span class="spark"><span class="cur">${Art.item('sparks')}</span> ${ru`${U.fmtNum(S.d.sparks)} искр`}</span><span class="zlat">${Art.item('zlat')} ${ru`${U.fmtNum(S.d.zlat || 0)} ${U.plural(S.d.zlat || 0, ru`монета`, ru`монеты`, ru`монет`)}`}</span></div>`; },

  // На покупку не хватает валюты
  poor(it) { return (S.d[it.cur === 'sparks' ? 'sparks' : 'zlat'] || 0) < it.price; },
  // Обменов сегодня осталось
  exLeft() { const ex = S.d.shop.ex; return Rules.EXCHANGE.DAY - (ex && ex.day === U.today() ? ex.n : 0); },
  exchangeHtml() {
    const E = Rules.EXCHANGE, left = this.exLeft(), can = Math.min(left, Math.floor(S.d.sparks / E.SPARKS));
    const camp = S.campExLeft(); // 5.1.20: на шаге Кампании «обмены» — курс Кампании
    const btn = n => `<button class="btn small ${n === 1 ? 'primary' : ''}" data-ex="${n}" ${can >= n ? '' : 'disabled'}>×${n}</button>`;
    return `<div class="shop-ex">
      <div class="ex-rate"><span class="spark"><span class="cur">${Art.item('sparks')}</span> ${U.fmtNum(E.SPARKS)}</span><b>→</b><span class="zlat">${Art.item('zlat')} ${camp ? E.CAMP : E.ZLAT}</span></div>
      <div class="row-main"><b>${ru`Обменник`}</b><small>${left ? ru`Сегодня ещё ${left} ${U.plural(left, ru`обмен`, ru`обмена`, ru`обменов`)}` : ru`На сегодня всё — приходи завтра`}</small>${camp ? `<small>${ru`Курс Кампании: ещё ${camp} ${U.plural(camp, ru`обмен`, ru`обмена`, ru`обменов`)}`}</small>` : ''}</div>
      <div class="ex-btns">${btn(1)}${[5, left].filter((v, i, a) => v > 1 && a.indexOf(v) === i).map(btn).join('')}</div>
    </div>`;
  },

  // 4.15: Лавка — в композиции карточки духа: сверху (≤30%) лоток в волшебном круге, справа «МОНЕТЫ ··· N», искры и обмены
  // отдельным блоком, метка товара дня; ниже вкладки «Товары · Казна · Обмен · Облик», содержимое листается внутри панели
  screen() {
    Sfx.init(); Sfx.play('tap');
    const scr = UI.screen(ru`Лавка Ордена`, '<div class="shop det det2 shop2" style="--c:#fbbf24"></div>', 'shop-screen det-screen');
    const box = scr.querySelector('.shop');
    let tab = 'goods';
    const render = () => {
      const today = U.today(), deal = Rules.shopDeal(today), dealBought = S.d.shop.deal === today;
      const lvlLock = it => it.lvl && S.d.level < it.lvl ? ru`с ${it.lvl} ур.` : '';
      const row = (it, id, extra = '') => {
        const lock = lvlLock(it), lim = [it.day ? it.day - Rules.dayUsed(S.d, 'shop:' + it.id) : Infinity, it.week ? it.week - Rules.weekUsed(S.d, 'shop:' + it.id) : Infinity];
        const left = it.bag ? Rules.BAG_MAX_UP - S.d.bagExtra : it.day || it.week ? Math.max(0, Math.min(...lim)) : 1, weekOut = it.week && lim[1] <= 0; // 4.16: лимиты в день и в неделю
        const icon = it.bag ? `<div class="shop-ico bag">${UI.I.bag}</div>` : `<div class="shop-ico">${Loot.art(it.give ? Object.keys(it.give)[0] : it.cocoon ? 'cocoon' : 'amulet', it)}</div>`;
        return `<div class="shop-row ${lock || !left ? 'off' : ''}">${icon}<div class="row-main"><b>${it.name}</b><small>${it.desc || ''}${extra}</small></div>
          <button class="btn small ${it.cur === 'zlat' ? 'primary' : 'spark-btn'} ${!lock && left && this.poor(it) ? 'poor' : ''} buy" data-id="${id}" ${lock || !left ? 'disabled' : ''}>${lock || (left ? this.price(it) : weekOut ? ru`В понедельник` : it.day ? ru`Завтра` : ru`Максимум`)}</button></div>`;
      };
      const bag = { ...Rules.SHOP.find(x => x.bag), price: Rules.bagPrice(S.d.bagExtra) };
      const cloaks = LOOK.cloak.filter(c => c.shop), zl = S.d.zlat || 0, exLeft = this.exLeft();
      const pane = (k, html) => `<div class="dt-pane ${tab === k ? 'on' : ''}" data-pane="${k}">${html}</div>`;
      box.innerHTML = `
        <div class="dt-hero">
          <div class="det-art shop2-art"><span class="shop2-ico">${UI.menuIcon('shop')}</span></div>
          <div class="dt-info">
            <div class="det-hp">${ru`Всё для Ловчего — за искры и монеты`}</div>
            <div class="det-power"><small>${ru`МОНЕТЫ`}</small><b><span class="cur">${Art.item('zlat')}</span>${U.fmtNum(zl)}</b></div>
            <div class="det-lvl"><span>${ru`Искры <b>${U.fmtNum(S.d.sparks)}</b> · обменов сегодня <b>${exLeft}</b>`}</span></div>
            <div class="det-tags">${dealBought ? `<span>${ru`товар дня куплен`}</span>` : `<span class="shop2-hot">${ru`Товар дня · −40%`}</span>`}</div>
          </div>
        </div>
        <div class="seg dt-tabs">${[['goods', ru`Товары`], ['pay', ru`Казна`], ['ex', ru`Обмен`], ['look', ru`Облик`]].map(([k, t]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${t}${k === 'goods' && !dealBought ? '<i class="dt-dot"></i>' : ''}</button>`).join('')}</div>
        <div class="dt-panel">
          ${pane('goods', `
            <div class="shop-deal ${dealBought ? 'off' : ''}">${row({ ...deal, name: `${deal.name} <i class="shop2-chip">${ru`−40% · товар дня`}</i>` }, 'deal', dealBought ? ' · ' + ru`куплен, завтра будет новый` : '')}</div>
            <div class="pf-mh"><span>${ru`Сумка`}</span><b>${S.bagCount()} / ${S.bagLimit()}</b></div>
            ${row(bag, 'bag', ' · ' + ru`расширено ${S.d.bagExtra} из ${Rules.BAG_MAX_UP}`)}
            <div class="pf-mh"><span>${ru`Припасы`}</span></div>
            ${Rules.SHOP.filter(x => !x.bag).map(x => row(x, x.id)).join('')}`)}
          ${pane('pay', `${Treasury.html(pay)}<div class="q-note promo-q"><button class="linkish promo-open">${ru`Есть промокод?`}</button></div>`)}
          ${pane('ex', `${this.exchangeHtml()}
            <div class="dt-rows">
              <div class="dt-row"><span>${ru`Курс`}</span><b><span class="cur">${Art.item('sparks')}</span> ${U.fmtNum(Rules.EXCHANGE.SPARKS)} → <span class="cur">${Art.item('zlat')}</span> ${Rules.EXCHANGE.ZLAT}</b></div>
              ${S.campExLeft() ? `<div class="dt-row"><span>${ru`Курс Кампании`}</span><b><span class="cur">${Art.item('sparks')}</span> ${U.fmtNum(Rules.EXCHANGE.SPARKS)} → <span class="cur">${Art.item('zlat')}</span> ${Rules.EXCHANGE.CAMP}</b></div>` : ''}
              <div class="dt-row"><span>${ru`Обменов в день`}</span><b>${Rules.EXCHANGE.DAY}</b></div>
            </div>
            <div class="q-note">${ru`Монеты дают за серию дней (на 7-й день — ${Rules.ZLAT.streak7}), сундук дня, новые уровни, дань с Капищ и Сезонную тропу. Искры — за поимки, источники и бои.`}</div>`)}
          ${pane('look', `
            <button class="shop-wd"><span class="sw-avas">${['volhv', 'zharpero', 'navstrazh'].map(id => `<i>${Art.avatar({ ...S.d.look, skin: id })}</i>`).join('')}</span><span class="sw-t"><b>${ru`Гардероб Ловчего`}</b><small>${ru`${LOOK.skin.length - 1} особых обликов · от ${Math.min(...LOOK.skin.filter(k => k.shop).map(k => k.shop))} монет`}</small></span><span class="sw-go">›</span></button>
            <div class="pf-mh"><span>${ru`Плащи`}</span></div>
            <div class="shop-cloaks">${cloaks.map(c => `<button class="shop-cloak ${S.d.owned[c.c] ? 'owned' : this.poor({ cur: 'zlat', price: c.shop }) ? 'poor' : ''}" data-id="look:${c.c}" ${S.d.owned[c.c] ? 'disabled' : ''}>
              <div class="shop-ava">${Art.avatar({ cloak: c.c, eyes: S.d.look.eyes, emblem: S.d.look.emblem })}</div><b>${c.name}</b><small>${S.d.owned[c.c] ? ru`Уже твой` : this.price({ cur: 'zlat', price: c.shop })}</small></button>`).join('')}</div>`)}
        </div>`;
    };
    box.addEventListener('click', async e => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { tab = tb.dataset.tab; Sfx.play('tap'); U.$$('[data-tab]', box).forEach(x => x.classList.toggle('on', x === tb)); U.$$('.dt-pane', box).forEach(p => p.classList.toggle('on', p.dataset.pane === tab)); return; }
      const pk = e.target.closest('[data-pay]'); if (pk) { if (pay.on) Treasury.buy(pk.dataset.pay, pay, render); else UI.toast(pay.play ? U.esc(pay.why || '') : ru`Оплата скоро откроется — следи за обновлениями`); return; }
      if (e.target.closest('.pay-recheck')) { await Treasury.check(true); render(); return; }
      if (e.target.closest('.pay-offer')) { Treasury.offer(); return; }
      if (e.target.closest('.pay-mine')) { Treasury.purchases(); return; }
      if (e.target.closest('.promo-open')) { Promo.ask(() => { if (scr.isConnected) render(); }); return; }
      const x = e.target.closest('[data-ex]');
      if (x && !x.disabled) {
        const n = +x.dataset.ex, E = Rules.EXCHANGE;
        const r = await Game.try('exchange', { n });
        if (!r) return;
        Sfx.play('spin'); U.vibrate(20);
        const z = r.zlat != null ? r.zlat : E.ZLAT * n; // 5.1.20: курс считает сервер (на шаге Кампании — свой)
        UI.toast(ru`Обмен: ✦ ${U.fmtNum(E.SPARKS * n)} → ${z} ${U.plural(z, ru`монета`, ru`монеты`, ru`монет`)}`, 'good');
        render(); UI.refreshHud();
        return;
      }
      if (e.target.closest('.shop-wd')) { UI.editLook(() => { UI.refreshHud(); render(); }); return; } // 4.6: облики-скины
      const b = e.target.closest('[data-id]'); if (!b || b.disabled) return;
      // не хватает валюты — сразу подсказка, где её взять, без окна покупки
      if (b.classList.contains('poor')) {
        const zl = b.classList.contains('primary') || b.classList.contains('shop-cloak');
        UI.toast(zl ? ru`Не хватает монет — обменяй искры в Обменнике или загляни в Казну` : ru`Не хватает искр — их дают за поимки, источники и бои`);
        return;
      }
      const id = b.dataset.id, deal = id === 'deal';
      const it = deal ? Rules.shopDeal(U.today()) : id === 'bag' ? { ...Rules.SHOP.find(x => x.bag), price: Rules.bagPrice(S.d.bagExtra) }
        : id.startsWith('look:') ? (c => ({ name: ru`Плащ «${c.name}»`, cur: 'zlat', price: c.shop }))(LOOK.cloak.find(c => c.c === id.slice(5))) : Rules.SHOP.find(x => x.id === id);
      const cur = it.cur === 'sparks' ? 'sparks' : 'zlat', left = (S.d[cur] || 0) - it.price;
      UI.confirm(it.name, ru`Купить за ${this.price(it)}? После покупки останется ${this.price({ cur: it.cur, price: left })}.`, ru`Купить`, async () => {
        const r = await Game.try('shopBuy', deal ? { deal: true } : { id });
        if (!r) return;
        Sfx.play('spin'); U.vibrate(20);
        UI.modal({ title: ru`Покупка`, html: `<p>${ru`${U.esc(it.name)} — твоё!`}</p>${Loot.cells(r.got)}`, buttons: [{ label: ru`Отлично`, cls: 'primary' }] });
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
  MONTHS: [ru`Январская`, ru`Февральская`, ru`Мартовская`, ru`Апрельская`, ru`Майская`, ru`Июньская`, ru`Июльская`, ru`Августовская`, ru`Сентябрьская`, ru`Октябрьская`, ru`Ноябрьская`, ru`Декабрьская`],

  screen() {
    Sfx.init(); Sfx.play('tap');
    const scr = UI.screen(ru`Сезонная тропа`, '<div class="pass"></div>', 'pass-screen');
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
          <div class="story-num">${ru`${month} тропа`} · <span class="nowrap">${ru`до конца ${U.fmtTime(Math.max(0, this.endsAt() - U.now()))}`}</span></div>
          <h3>${ru`Ступень ${L} из ${max}`}</h3>
          <div class="pbar big"><i style="width:${inLvl / per * 100}%"></i></div>
          <small>${L >= max ? ru`Тропа пройдена!` : ru`${inLvl} / ${per} очков до ступени ${L + 1}`} · ${ru`очки — за поимки, источники, прогулки, коконы и бои`}</small>
          ${P.gold ? `<div class="pass-gold on">★ ${ru`Золотая тропа открыта`}</div>`
            : `<button class="btn primary wide pass-buy">${ru`Открыть Золотую тропу`}<small><span class="cur">${Art.item('zlat')}</span> ${Rules.PASS.GOLD}</small></button><small class="pass-note">${ru`Золотые ступени: серебряные и золотые обереги, Живая вода, искры, коконы 10 км, амулеты на выбор, плащ «Сезонная тропа» и Знак Тропы. У тебя ${U.fmtNum(S.d.zlat || 0)} ${U.plural(S.d.zlat || 0, ru`монета`, ru`монеты`, ru`монет`)}.`}</small>`}
        </div>
        <div class="pass-cols"><span>${ru`Ступень`}</span><span>${ru`Для всех`}</span><span>★ ${ru`Золотая`}</span></div>
        ${Array.from({ length: max }, (_, i) => i + 1).map(l => `<div class="pass-row ${L >= l ? 'open' : ''}"><div class="pass-l">${l}</div>${cell('free', l)}${cell('gold', l)}</div>`).join('')}`;
    };
    box.addEventListener('click', async e => {
      if (e.target.closest('.pass-buy')) {
        UI.confirm(ru`Золотая тропа`, ru`Открыть Золотую тропу этого сезона за ${Rules.PASS.GOLD} монет? Золотые награды уже пройденных ступеней можно будет забрать сразу.`, ru`Открыть`, async () => {
          if (!await Game.try('passGold')) return;
          Sfx.play('levelup'); U.vibrate([40, 60, 120]);
          UI.toast(ru`Золотая тропа открыта!`, 'good');
          render(); UI.refreshHud();
        });
        return;
      }
      const c = e.target.closest('.pass-cell'); if (!c || c.disabled || this._busy) return;
      const lvl = +c.dataset.l, track = c.dataset.t;
      const claim = async am => {
        this._busy = true;
        const r = await Game.try('passClaim', { lvl, track, am });
        this._busy = false;
        if (!r) return false;
        Sfx.play('spin');
        UI.modal({ title: ru`Ступень ${lvl}`, html: Loot.cells(r.got), buttons: [{ label: ru`Забрать`, cls: 'primary' }] });
        render(); UI.refreshHud();
        return true;
      };
      // 5.1.21: на ступени амулет на выбор — сперва выбрать амулет
      if (Rules.passReward(track, lvl).amuletPick) this.pickAmulet(lvl, claim);
      else claim();
    });
    render();
    // прокрутить к первой незабранной ступени
    setTimeout(() => { const f = box.querySelector('.pass-cell.can') || box.querySelectorAll('.pass-row.open')[Math.max(0, Rules.passLevel(this.state().pts) - 1)]; if (f) f.scrollIntoView({ block: 'center' }); }, 100);
  },
  // 5.1.21: амулет на выбор за ступень — список амулетов, как при переплавке; выбрал — награда забирается (claim(id) → удалось ли)
  pickAmulet(lvl, claim) {
    const m = UI.modal({
      title: ru`Выбери амулет`, cls: 'melt-modal',
      html: `<p>${ru`Награда ступени ${lvl}: один амулет на выбор.`}</p>
        <div class="list">${AMULET_KEYS.map(k => `<button class="row melt-to" data-k="${k}"><div class="row-ico">${Art.amulet(k)}</div><div class="row-main"><b>${AMULETS[k].name}</b><small>${AMULETS[k].desc}</small></div><div class="row-side"><span class="cnt">×${S.d.amulets[k] || 0}</span></div></button>`).join('')}</div>`,
      buttons: [{ label: ru`Отмена` }],
    });
    m.addEventListener('click', async e => {
      const b = e.target.closest('.melt-to'); if (!b || m._busy) return;
      m._busy = true;
      const ok = await claim(b.dataset.k);
      m._busy = false;
      if (ok) m.close();
    });
  },
};
