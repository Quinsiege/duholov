'use strict';
/* Дневник Ловчего: хроника событий с местом и временем (последние 250 записей) */

const J = {
  MAX: 250,
  FILTERS: [['all', ru`Всё`], ['catch', ru`Поимки`], ['battle', ru`Битвы`], ['other', ru`Прочее`]],
  GROUP: { catch: 'catch', flee: 'catch', hatch: 'catch', raid: 'battle', duel: 'battle', invasion: 'battle', league: 'battle', spar: 'battle' },
  filter: 'all',

  add(type, data = {}) {
    if (!S.d) return;
    const e = { t: Date.now(), type, ...data };
    if (MapView.pos && e.lat == null) { e.lat = +MapView.pos.lat.toFixed(5); e.lng = +MapView.pos.lng.toFixed(5); }
    S.d.journal.unshift(e);
    if (S.d.journal.length > this.MAX) S.d.journal.length = this.MAX;
    S.save();
  },

  // Иконка, заголовок и подпись записи
  view(e) {
    const sp = sid => SP[sid] ? SP[sid].name : '?';
    const icon = sid => `<div class="j-ico">${Art.img(sid, e.shiny, e.dark)}</div>`;
    const glyph = (g, cls = '') => `<div class="j-ico glyph ${cls}">${g}</div>`;
    switch (e.type) {
      // целые фразы на каждый вариант (сияющий/омрачённый) — чтобы перевод не собирался из кусков
      case 'catch': { const n = sp(e.sid);
        return { ico: icon(e.sid), title: e.shiny && e.dark ? ru`Пойман сияющий омрачённый ${n}` : e.shiny ? ru`Пойман сияющий ${n}` : e.dark ? ru`Пойман омрачённый ${n}` : ru`Пойман ${n}`, sub: e.power ? ru`СИЛА ${e.power}` : '' }; }
      case 'flee': return { ico: icon(e.sid), title: ru`${sp(e.sid)} ускользнул`, sub: ru`Дух вернулся в Навь`, cls: 'dim' };
      case 'hatch': return { ico: icon(e.sid), title: ru`Из кокона появился ${sp(e.sid)}`, sub: e.km ? ru`Кокон ${e.km} км` : '' };
      case 'evolve': return { ico: icon(e.to), title: ru`${sp(e.from)} превратился в ${sp(e.to)}`, sub: '' };
      case 'raid': return { ico: icon(e.sid), title: ru`Разлом закрыт: ${sp(e.sid)}`, sub: '★'.repeat(e.tier || 1) };
      // e.name — название Капища с карты; e.guard / e.rank / e.name знака, лавки, e.title главы — русские названия из данных (сохранены сервером), переводим при показе
      case 'duel': return { ico: glyph('⛩'), title: ru`Победа: ${e.name}`, sub: ru`Хранитель ${I18N.back(e.guard || '')}` };
      case 'invasion': return { ico: glyph('☾', 'dark'), title: ru`Родник освобождён`, sub: e.name || '' };
      case 'league': return { ico: glyph('★', 'gold'), title: ru`Турнир Лиги: побед ${e.won} из 3`, sub: ru`Ранг: ${I18N.back(e.rank)}` };
      case 'level': return { ico: glyph(e.l, 'gold'), title: ru`Новый уровень: ${e.l}`, sub: '' };
      case 'medal': return { ico: glyph('✦', 'gold'), title: ru`Знак «${I18N.back(e.name)}»`, sub: MEDAL_TIERS[e.tier - 1] ? MEDAL_TIERS[e.tier - 1].name : '' };
      case 'story': return { ico: glyph('✎'), title: ru`Глава Летописи: «${I18N.back(e.title)}»`, sub: ru`Завершена` };
      case 'trade': return { ico: icon(e.sid), title: e.dir === 'out' ? ru`${sp(e.sid)} упакован для друга` : e.who ? ru`${sp(e.sid)} получен от ${e.who}` : ru`${sp(e.sid)} получен от друга`, sub: ru`Обмен` };
      case 'friend': return { ico: glyph('♥', 'pink'), title: ru`Новый друг: ${e.name}`, sub: '' };
      case 'spar': return { ico: glyph('⚔'), title: ru`Победа в поединке с другом`, sub: e.name || '' };
      case 'clan': return { ico: glyph('⚑', 'gold'), title: ru`Вступление: ${CLANS[e.clan] ? CLANS[e.clan].name : ru`дружина`}`, sub: '' };
      case 'guardBack': return { ico: icon(e.sid), title: ru`Защитник вернулся с Капища`, sub: `${e.name || ''} · ${ru`стоял ${e.hours} ч`}` };
      case 'defend': return { ico: icon(e.sid), title: ru`Защитник на Капище`, sub: e.name || '' };
      case 'shop': return { ico: glyph('☉', 'gold'), title: ru`Покупка в Лавке: ${I18N.back(e.name || '')}`, sub: '' };
      case 'passGold': return { ico: glyph('★', 'gold'), title: ru`Открыта Золотая тропа`, sub: e.season || '' };
      case 'exchange': return { ico: glyph('⇄', 'gold'), title: ru`Обмен в Лавке`, sub: `✦ ${U.fmtNum(e.sparks || 0)} → ${ru`${e.zlat || 0} златников`}` };
      case 'pay': return { ico: glyph('☉', 'gold'), title: ru`Казна Ордена`, sub: ru`+${e.zlat || 0} златников` };
      case 'auction': { const n = SP[e.sid] ? SP[e.sid].name : '', p = U.fmtNum(e.price || 0);
        return { ico: glyph('⚖', 'gold'), title: e.dir === 'buy' ? ru`Куплен на аукционе: ${n}` : e.dir === 'sold' ? ru`Продан на аукционе: ${n}` : ru`Выставлен на аукцион: ${n}`, sub: `${e.cur === 'zlat' ? ru`${p} златников` : '✦ ' + p}${e.who ? ' · ' + e.who : ''}` }; }
      case 'order': return { ico: glyph('⚑', 'gold'), title: ru`Общее дело Ордена`, sub: ru`Награда ${(e.i | 0) + 1}-й ступени` };
      case 'gift': return { ico: glyph('✉', 'pink'), title: e.dir === 'out' ? ru`Подарок отправлен: ${e.name}` : ru`Подарок от ${e.name}`, sub: '' };
    }
    return { ico: glyph('•'), title: e.type, sub: '' };
  },

  screen() {
    const scr = UI.screen(ru`Дневник Ловчего`, `
      <div class="chips j-filters">${this.FILTERS.map(([k, t]) => `<button data-f="${k}">${t}</button>`).join('')}</div>
      <div class="j-list"></div>`, 'journal-screen');
    const render = () => {
      U.$$('[data-f]', scr).forEach(b => b.classList.toggle('on', b.dataset.f === this.filter));
      const list = S.d.journal.filter(e => this.filter === 'all' || (this.GROUP[e.type] || 'other') === this.filter);
      let day = '', html = '';
      list.forEach((e, i) => {
        const d = new Date(e.t), ds = d.toLocaleDateString(I18N.locale, { day: 'numeric', month: 'long', weekday: 'short' });
        if (ds !== day) { day = ds; html += `<div class="j-day">${ds}</div>`; }
        const v = this.view(e);
        html += `<div class="j-row ${v.cls || ''}">${v.ico}<div class="row-main"><b>${U.esc(v.title)}</b><small>${d.toLocaleTimeString(I18N.locale, { hour: '2-digit', minute: '2-digit' })}${v.sub ? ' · ' + U.esc(v.sub) : ''}</small></div>
          ${e.lat != null ? `<button class="btn small ghost j-map" data-i="${S.d.journal.indexOf(e)}" title="${ru`На карте`}">${UI.I.pin}</button>` : ''}</div>`;
      });
      scr.querySelector('.j-list').innerHTML = html || `<div class="empty">${ru`Записей пока нет. Лови духов — дневник заполнится сам.`}</div>`;
    };
    scr.addEventListener('click', ev => {
      const f = ev.target.closest('[data-f]');
      if (f) { this.filter = f.dataset.f; render(); return; }
      const m = ev.target.closest('.j-map');
      if (m) {
        const e = S.d.journal[+m.dataset.i];
        // закрываем все экраны и показываем место на карте
        for (let k = 0; k < 6 && UI.layers.length; k++) UI.back();
        setTimeout(() => MapView.showPin(e.lat, e.lng, this.view(e).title), 250);
      }
    });
    render();
  },
};
