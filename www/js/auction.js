'use strict';
/* Аукцион духов (3.17). Лоты, цены и расчёты — на сервере (auctionFind / auctionSell / auctionBuy / auctionCancel /
   auctionMine), здесь только показ. Дух на время продажи хранится в лоте; за проданных продавец получает цену
   минус комиссию (Rules.auctionFee), когда заходит во вкладку «Мои лоты». */

const Auction = {
  tab: 'buy',
  f: { sort: 'new', mine: true }, // фильтры поиска (сохраняются, пока открыта игра); mine — 4.16: «не выше моего уровня»
  hints: {},              // 4.16: подсказки цены по недавним сделкам: sid:lvl → { sparks, zlat }
  q: '',                  // поиск по названию духа
  mine: null,             // последний ответ auctionMine

  badge() { return this.mine && this.mine.lots.some(l => l.status !== 'open' && !l.settled) ? '!' : ''; },
  stars(pct) { return pct >= 100 ? 4 : pct >= 82 ? 3 : pct >= 67 ? 2 : pct >= 50 ? 1 : 0; },
  starsHtml(pct) { const n = this.stars(pct); return `<span class="au-stars">${'★'.repeat(n)}${'☆'.repeat(4 - n)}</span>`; },
  priceHtml(cur, price) { return cur === 'zlat' ? `<span class="cur">${Art.item('zlat')}</span> ${U.fmtNum(price)}` : `<span class="cur">${Art.item('sparks')}</span> ${U.fmtNum(price)}`; },
  curName(cur, n) { return cur === 'zlat' ? U.plural(n, ru`монета`, ru`монеты`, ru`монет`) : U.plural(n, ru`искра`, ru`искры`, ru`искр`); },
  // дух из упакованного лота: { s, l, i, y, d, n, p, m }
  sp(p) { return { sid: p.s, lvl: p.l, iv: p.i, shiny: !!p.y, dark: !!p.d, purified: !!p.p, nick: p.n || null }; },
  filters() { return Object.entries(this.f).filter(([k, v]) => k !== 'sort' && k !== 'mine' && v).length + (this.q ? 1 : 0); },
  // 4.16: подсказка цены (недавние сделки с этим видом) — с сервера, запоминается на время игры
  async hint(sid, lvl) {
    const k = sid + ':' + lvl;
    if (!this.hints[k]) { try { this.hints[k] = (await Game.act('auctionPrice', { sid, lvl })).hint; } catch (e) { return null; } }
    return this.hints[k];
  },
  hintHtml(h) {
    const parts = ['sparks', 'zlat'].filter(c => h && h[c]).map(c => { const x = h[c];
      return x.lo === x.hi ? ru`${this.priceHtml(c, x.med)} (сделок: ${x.n})` : ru`${this.priceHtml(c, x.lo)}–${U.fmtNum(x.hi)}, чаще около ${U.fmtNum(x.med)} (сделок: ${x.n})`; });
    return parts.length ? ru`Недавно продавали: ${parts.join(' · ')}` : ru`За последние ${Rules.AUCTION.RECENT} дней таких духов не продавали.`;
  },
  left(iso) { const ms = Date.parse(iso) - U.now(); return ms > 0 ? U.fmtTime(ms) : ru`истёк`; },

  screen() {
    if (S.d.level < Rules.AUCTION.LEVEL) { UI.toast(ru`Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`); return; }
    Sfx.init(); Sfx.play('tap');
    const scr = UI.screen(ru`Аукцион`, `<div class="seg au-tabs"><button data-tab="buy">${ru`Купить`}</button><button data-tab="mine">${ru`Мои лоты`}</button></div><div class="au-body"></div>`, 'au-screen');
    const body = scr.querySelector('.au-body');
    const show = (tab, dir) => {
      this.tab = tab;
      U.$$('[data-tab]', scr).forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
      tab === 'buy' ? this.renderBuy(body, true) : this.renderMine(body);
      UI.slideIn(body, dir);
    };
    scr.querySelector('.au-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b && b.dataset.tab !== this.tab) show(b.dataset.tab, b.dataset.tab === 'mine' ? 1 : -1); });
    UI.swipeTabs(scr, ['buy', 'mine'], () => this.tab, show);
    show(this.tab);
  },

  /* ---------- Купить ---------- */
  async renderBuy(box, fresh) {
    if (fresh) { this.lots = []; this.from = 0; this.end = false; }
    const sorts = [['new', ru`Новые`], ['cheap', ru`Дешевле`], ['dear', ru`Дороже`], ['power', ru`Сила`], ['iv', ru`Оценка`]];
    box.innerHTML = `<div class="au-bar"><input class="input au-q" placeholder="${ru`Найти духа по названию`}" value="${U.esc(this.q)}" maxlength="24">
        <button class="btn small au-filt ${this.filters() ? 'primary' : ''}">${ru`Фильтры`}${this.filters() ? ` · ${this.filters()}` : ''}</button></div>
      <div class="chips au-sorts">${sorts.map(([k, t]) => `<button data-sort="${k}" class="${this.f.sort === k ? 'on' : ''}">${t}</button>`).join('')}<button data-mine class="${this.f.mine ? 'on' : ''}">${ru`Не выше ${S.catchLvl()} ур.`}</button></div>
      <div class="au-list"><div class="q-note">${ru`Ищу лоты…`}</div></div>`;
    const list = box.querySelector('.au-list');
    const load = async () => {
      const sids = this.q ? SPECIES.filter(s => s.name.toLowerCase().includes(this.q.toLowerCase())).map(s => s.id) : null;
      if (sids && !sids.length) { list.innerHTML = `<div class="q-note">${ru`Таких духов в Бестиарии нет.`}</div>`; return; }
      let r;
      try { r = await Game.act('auctionFind', { f: { ...this.f, sids }, from: this.from }); } catch (e) { list.innerHTML = `<div class="q-note">${U.esc(e.message)}</div>`; return; }
      this.lots.push(...r.lots); this.from += r.lots.length; this.end = r.lots.length < 30;
      if (!box.isConnected) return;
      list.innerHTML = this.lots.length ? this.lots.map((l, i) => this.lotRow(l, i)).join('') + (this.end ? '' : `<button class="btn ghost wide au-more">${ru`Показать ещё`}</button>`)
        : `<div class="q-note">${this.filters() ? ru`По этим условиям лотов нет — ослабь фильтры.` : ru`Пока никто ничего не выставил. Стань первым — во вкладке «Мои лоты».`}</div>`;
    };
    box.onclick = e => {
      const s = e.target.closest('[data-sort]');
      if (s) { this.f.sort = s.dataset.sort; this.renderBuy(box, true); return; }
      if (e.target.closest('[data-mine]')) { this.f.mine = !this.f.mine; this.renderBuy(box, true); return; }
      if (e.target.closest('.au-filt')) { this.filterSheet(() => this.renderBuy(box, true)); return; }
      if (e.target.closest('.au-more')) { e.target.closest('.au-more').disabled = true; load(); return; }
      const row = e.target.closest('.au-lot');
      if (row) this.lotModal(this.lots[+row.dataset.i], () => this.renderBuy(box, true));
    };
    const qi = box.querySelector('.au-q');
    qi.onchange = () => { this.q = qi.value.trim(); this.renderBuy(box, true); };
    qi.onkeydown = e => { if (e.key === 'Enter') qi.blur(); };
    await load();
  },
  lotRow(l, i) {
    const s = SP[l.sid], p = l.spirit;
    const poor = (S.d[l.cur] || 0) < l.price;
    return `<button class="au-lot" data-i="${i}">
      <div class="au-art">${Art.img(p.s, !!p.y, !!p.d)}</div>
      <div class="row-main"><b>${U.esc(p.n || s.name)}${p.y ? ' <span class="au-shiny">✦</span>' : ''}</b>
        <small>${l.myLvl < l.lvl ? ru`СИЛА ${U.fmtNum(l.power)} → у тебя ${U.fmtNum(l.myPower)} (ур. ${l.myLvl})` : ru`СИЛА ${U.fmtNum(l.power)} · ур. ${l.lvl}`} · ${U.esc(l.seller_name)}</small>
        <small class="au-ivs">${this.starsHtml(l.iv_pct)} <b>${l.iv_pct}%</b> · ${ru`А ${l.iv_a} · З ${l.iv_d} · С ${l.iv_s}`}</small></div>
      <span class="btn small ${l.cur === 'zlat' ? 'primary' : 'spark-btn'} ${poor ? 'poor' : ''} au-price">${this.priceHtml(l.cur, l.price)}</span></button>`;
  },
  lotModal(l, done) {
    const p = l.spirit, s = SP[l.sid], mine = Math.min(l.lvl, S.catchLvl());
    const bar = (t, v) => `<div class="au-stat"><span>${t}</span><div class="pbar"><i style="width:${v / 15 * 100}%"></i></div><b>${v}/15</b></div>`;
    const m = UI.modal({
      title: U.esc(p.n || s.name), cls: 'au-modal',
      html: `<div class="au-big">${Art.img(p.s, !!p.y, !!p.d)}</div>
        <div class="au-tags"><span>${Art.elIcon(s.el, 14)} ${ELEMENTS[s.el].name}</span><span style="color:${RARITY[s.rar].color}">${RARITY[s.rar].name}</span>${p.y ? `<span>✦ ${ru`Сияющий`}</span>` : ''}${p.d ? `<span>${ru`Омрачённый`}</span>` : ''}</div>
        <div class="au-meta">${ru`СИЛА <b>${U.fmtNum(l.power)}</b> · уровень ${l.lvl}`}${mine < l.lvl ? ` <small>${l.myPower ? ru`(у тебя будет ${mine} ур. и СИЛА ${U.fmtNum(l.myPower)}: выше твоего уровня нельзя)` : ru`(у тебя будет ${mine}: выше твоего уровня нельзя)`}</small>` : ''}</div>
        <p class="small au-hint">${ru`Узнаю, за сколько продавали таких духов…`}</p>
        <div class="au-appr">${ru`Оценка Ордена`} ${this.starsHtml(l.iv_pct)} <b>${l.iv_pct}%</b></div>
        ${bar(ru`Атака`, l.iv_a)}${bar(ru`Защита`, l.iv_d)}${bar(ru`Стойкость`, l.iv_s)}
        <div class="au-price-big">${this.priceHtml(l.cur, l.price)}</div>
        <p class="small au-seller">${ru`Продаёт ${U.esc(l.seller_name)} · до конца ${this.left(l.expires_at)}`}</p>`,
      buttons: [{ label: ru`Отмена` }, { label: ru`Купить`, cls: 'primary', keep: true, fn: async w => {
        if ((S.d[l.cur] || 0) < l.price) { UI.toast(l.cur === 'zlat' ? ru`Не хватает монет — обменяй искры в Лавке или загляни в Казну` : ru`Не хватает искр`); return; }
        if (w._busy) return; w._busy = true;
        const r = await Game.try('auctionBuy', { id: l.id });
        w._busy = false;
        if (!r) return;
        w.close(); Sfx.play('coins'); U.vibrate([30, 40, 80]);
        UI.toast(r.isNew ? ru`${U.esc(s.name)} теперь твой — новый вид в Бестиарии!` : ru`${U.esc(s.name)} теперь твой!`, 'good');
        UI.refreshHud(); done && done();
      } }],
    });
    this.hint(l.sid, l.lvl).then(h => { const el = m.querySelector('.au-hint'); if (el) el.innerHTML = h ? this.hintHtml(h) : ''; });
  },
  filterSheet(done) {
    const f = { ...this.f };
    const chip = (key, val, label, cur) => `<button data-k="${key}" data-v="${val}" class="${String(cur ?? '') === String(val) ? 'on' : ''}">${label}</button>`;
    const range = (key, label, max, step) => `<div class="au-rng"><span>${label}</span><input type="range" data-r="${key}" min="0" max="${max}" step="${step}" value="${f[key] || 0}"><b data-rv="${key}">${f[key] ? ru`от ${f[key]}${key === 'minIv' ? '%' : ''}` : ru`любая`}</b></div>`;
    const m = UI.modal({
      title: ru`Фильтры`, cls: 'au-filters',
      html: `<div class="au-fl">${ru`Стихия`}</div><div class="chips au-wrap">${chip('el', '', ru`Все`, f.el || '')}${ELEMENT_KEYS.map(e => chip('el', e, `${Art.elIcon(e, 14)} ${ELEMENTS[e].name}`, f.el)).join('')}</div>
        <div class="au-fl">${ru`Редкость`}</div><div class="chips au-wrap">${chip('rar', '', ru`Все`, f.rar || '')}${Object.keys(RARITY).map(r => chip('rar', r, RARITY[r].name, f.rar)).join('')}</div>
        <div class="au-fl">${ru`Валюта`}</div><div class="chips au-wrap">${chip('cur', '', ru`Любая`, f.cur || '')}${chip('cur', 'sparks', '✦ ' + ru`Искры`, f.cur)}${chip('cur', 'zlat', ru`Монеты`, f.cur)}</div>
        <div class="au-fl">${ru`Оценка Ордена и показатели`}</div>
        ${range('minIv', ru`Оценка`, 100, 5)}${range('minA', ru`Атака`, 15, 1)}${range('minD', ru`Защита`, 15, 1)}${range('minS', ru`Стойкость`, 15, 1)}
        <div class="au-nums"><label>${ru`Сила от`}<input class="input" type="number" inputmode="numeric" data-n="minPower" value="${f.minPower || ''}" placeholder="${ru`любая`}"></label>
          <label>${ru`Цена до`}<input class="input" type="number" inputmode="numeric" data-n="maxPrice" value="${f.maxPrice || ''}" placeholder="${ru`любая`}"></label></div>
        <label class="au-check"><input type="checkbox" data-c="shiny" ${f.shiny ? 'checked' : ''}> ${ru`Только сияющие`}</label>`,
      buttons: [{ label: ru`Сбросить`, fn: () => { this.f = { sort: this.f.sort, mine: this.f.mine }; this.q = ''; done(); } },
        { label: ru`Показать`, cls: 'primary', fn: () => {
          m.querySelectorAll('[data-n]').forEach(i => { const v = Math.floor(+i.value); f[i.dataset.n] = v > 0 ? v : 0; });
          f.shiny = m.querySelector('[data-c="shiny"]').checked;
          this.f = f; done();
        } }],
    });
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      f[b.dataset.k] = b.dataset.v;
      b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    });
    m.addEventListener('input', e => {
      const r = e.target.closest('[data-r]'); if (!r) return;
      const k = r.dataset.r, v = +r.value; f[k] = v;
      m.querySelector(`[data-rv="${k}"]`).textContent = v ? ru`от ${v}${k === 'minIv' ? '%' : ''}` : ru`любая`;
    });
  },

  /* ---------- Мои лоты ---------- */
  async renderMine(box) {
    const A = Rules.AUCTION;
    box.innerHTML = `<div class="au-info">${ru`Комиссия ${Math.round(A.FEE * 100)}% с продажи · залог ${Math.round(A.DEPOSIT * 100)}% вернётся при продаже · лот живёт ${A.HOURS / 24} дня · до ${A.MAX_OPEN} лотов сразу`}</div>
      <button class="btn primary wide au-sell">${ru`Выставить духа`}</button><div class="au-mine"><div class="q-note">${ru`Загружаю…`}</div></div>`;
    box.onclick = e => {
      if (e.target.closest('.au-sell')) { this.pickSpirit(sp => this.sellModal(sp, () => this.renderMine(box))); return; }
      const c = e.target.closest('.au-cancel');
      if (c) {
        UI.confirm(ru`Снять с продажи?`, ru`Дух вернётся в твою коллекцию, а залог — нет.`, ru`Снять`, async () => {
          if (await Game.try('auctionCancel', { id: c.dataset.id })) { UI.toast(ru`Дух вернулся в коллекцию`, 'good'); this.renderMine(box); }
        }, ru`Отмена`, true); // 4.25: залог пропадёт — красной кнопкой
      }
    };
    let r;
    try { r = await Game.act('auctionMine'); } catch (e) { box.querySelector('.au-mine').innerHTML = `<div class="q-note">${U.esc(e.message)}</div>`; return; }
    this.mine = r;
    if (r.got.length) this.gotModal(r.got);
    if (!box.isConnected) return;
    box.querySelector('.au-sell').disabled = r.open >= A.MAX_OPEN;
    const st = { open: ru`На продаже`, sold: ru`Продан`, cancelled: ru`Снят`, expired: ru`Истёк — дух вернулся` };
    box.querySelector('.au-mine').innerHTML = r.lots.length ? r.lots.map(l => {
      const p = l.spirit, s = SP[l.sid] || SP[p.s];
      return `<div class="au-lot mine ${l.status}"><div class="au-art">${Art.img(p.s, !!p.y, !!p.d)}</div>
        <div class="row-main"><b>${U.esc(p.n || s.name)}</b><small>${ru`СИЛА ${U.fmtNum(l.power)}`} · ${this.starsHtml(l.iv_pct)} ${l.iv_pct}%</small>
          <small class="au-st">${st[l.status]} · ${this.priceHtml(l.cur, l.price)}${l.status === 'open' ? ' · ' + ru`ещё ${this.left(l.expires_at)}` : l.status === 'sold' ? ` · ${U.esc(l.buyer_name || '')} · ${ru`тебе ${this.priceHtml(l.cur, l.price - Rules.auctionFee(l.price))}`}` : ''}</small></div>
        ${l.status === 'open' ? `<button class="btn small ghost au-cancel" data-id="${l.id}">${ru`Снять`}</button>` : ''}</div>`;
    }).join('') : `<div class="q-note">${ru`Ты ещё ничего не выставлял.`}</div>`;
    UI.refreshHud();
  },
  gotModal(got) {
    const rows = got.map(g => g.type === 'sold'
      ? `<div>${Art.img(g.sid)}<span>${ru`${SP[g.sid].name} продан${g.buyer ? ` (${U.esc(g.buyer)})` : ''}: +${this.priceHtml(g.cur, g.net)}`}${g.dep ? ' ' + ru`и залог ${this.priceHtml(g.cur, g.dep)}` : ''}</span></div>`
      : `<div>${Art.img(g.sid)}<span>${ru`${SP[g.sid].name} вернулся: ${g.type === 'expired' ? ru`срок лота истёк` : ru`лот снят`}`}${g.lost ? ' · ' + ru`залог ${this.priceHtml(g.cur, g.lost)} не вернулся` : ''}</span></div>`).join('');
    Sfx.play('reward');
    UI.modal({ title: ru`Итоги аукциона`, html: `<div class="au-got">${rows}</div>`, buttons: [{ label: ru`Отлично`, cls: 'primary' }], tap: true });
  },
  // выбор духа для продажи: сильнейшие сверху, избранных продать нельзя
  pickSpirit(then) {
    const list = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a));
    const m = UI.modal({
      title: ru`Какого духа выставить?`, cls: 'au-pick',
      html: `<div class="au-picklist">${list.map(sp => `<button class="au-pk ${sp.fav || sp.bound ? 'off' : ''}" data-u="${sp.uid}">
        <div class="au-art">${Art.img(sp.sid, sp.shiny, sp.dark && !sp.purified)}</div>
        <div class="row-main"><b>${U.esc(sp.nick || SP[sp.sid].name)}</b><small>${ru`СИЛА ${U.fmtNum(S.power(sp))} · ур. ${sp.lvl}`} · ${this.starsHtml(S.ivPct(sp))} ${S.ivPct(sp)}%${sp.fav ? ' · ' + ru`избранный` : ''}${sp.bound ? ' · ' + ru`привязан` : ''}</small></div></button>`).join('')}</div>`,
      buttons: [{ label: ru`Отмена` }],
    });
    m.querySelector('.au-picklist').addEventListener('click', e => {
      const b = e.target.closest('.au-pk'); if (!b) return;
      const sp = S.findSpirit(b.dataset.u);
      if (sp.fav) { UI.toast(ru`Избранного духа продать нельзя — сними отметку на его карточке`); return; }
      if (sp.bound) { UI.toast(ru`Дух привязан к тебе: плёнка на обороте содрана — продать его нельзя`); return; }
      if (S.d.spirits.length <= 1) { UI.toast(ru`Нельзя продать последнего духа`); return; }
      m.close(); then(sp);
    });
  },
  sellModal(sp, done) {
    const A = Rules.AUCTION;
    let cur = 'sparks';
    const m = UI.modal({
      title: ru`Выставить на аукцион`, cls: 'au-sellm',
      html: `<div class="au-sellsp">${Art.img(sp.sid, sp.shiny, sp.dark && !sp.purified)}<div><b>${U.esc(sp.nick || SP[sp.sid].name)}</b><small>${ru`СИЛА ${U.fmtNum(S.power(sp))}`} · ${this.starsHtml(S.ivPct(sp))} ${S.ivPct(sp)}%</small></div></div>
        <div class="seg au-cur"><button data-c="sparks" class="on">✦ ${ru`Искры`}</button><button data-c="zlat">${ru`Монеты`}</button></div>
        <p class="small au-hint">${ru`Узнаю, за сколько продавали таких духов…`}</p>
        <input class="input big au-pr" type="number" inputmode="numeric" placeholder="${ru`Цена`}">
        <div class="au-fee"></div>
        <p class="small">${ru`Дух уйдёт из коллекции на время продажи. Если его не купят за ${A.HOURS / 24} дня или ты снимешь лот — он вернётся.`} ${ru`Залог ${Math.round(A.DEPOSIT * 100)}% от цены вернётся вместе с выручкой, если духа купят, и пропадёт, если нет.`}</p>`,
      buttons: [{ label: ru`Отмена` }, { label: ru`Выставить`, cls: 'primary', keep: true, fn: async w => {
        const price = Math.floor(+pr.value);
        if (!(price >= A.MIN[cur] && price <= A.MAX[cur])) { UI.toast(ru`Цена — от ${U.fmtNum(A.MIN[cur])} до ${U.fmtNum(A.MAX[cur])} ${this.curName(cur, A.MAX[cur])}`); return; }
        if (w._busy) return; w._busy = true;
        const r = await Game.try('auctionSell', { uid: sp.uid, cur, price });
        w._busy = false;
        if (!r) return;
        w.close(); Sfx.play('coins');
        UI.toast(ru`Дух выставлен на аукцион`, 'good'); done && done();
      } }],
    });
    const pr = m.querySelector('.au-pr'), fee = m.querySelector('.au-fee');
    const upd = () => {
      const p = Math.floor(+pr.value);
      fee.innerHTML = p > 0 ? ru`Комиссия ${Math.round(A.FEE * 100)}%: ${this.priceHtml(cur, Rules.auctionFee(p))} · тебе придёт <b>${this.priceHtml(cur, Math.max(0, p - Rules.auctionFee(p)))}</b>`
          + ' · ' + ru`залог сейчас ${this.priceHtml(cur, Rules.auctionDeposit(cur, p))}`
        : ru`Минимум ${this.priceHtml(cur, A.MIN[cur])}. Комиссия ${Math.round(A.FEE * 100)}% с продажи.`;
    };
    // 4.16: подсказка цены по недавним сделкам; пустое поле цены — заполняем обычной ценой
    this.hint(sp.sid, sp.lvl).then(h => {
      const el = m.querySelector('.au-hint'); if (!el) return;
      el.innerHTML = h ? this.hintHtml(h) : '';
      if (h && !pr.value) { const c = h.sparks ? 'sparks' : h.zlat ? 'zlat' : null; if (c) { m.querySelector(`.au-cur [data-c="${c}"]`).click(); pr.value = h[c].med; upd(); } }
    });
    m.querySelector('.au-cur').addEventListener('click', e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      cur = b.dataset.c; m.querySelectorAll('.au-cur button').forEach(x => x.classList.toggle('on', x === b)); upd();
    });
    pr.addEventListener('input', upd);
    upd();
    setTimeout(() => pr.focus(), 100);
  },
};
