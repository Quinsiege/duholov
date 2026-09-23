'use strict';
/* Дневник Ловчего: хроника событий с местом и временем (последние 250 записей) */

const J = {
  MAX: 250,
  FILTERS: [['all', 'Всё'], ['catch', 'Поимки'], ['battle', 'Битвы'], ['other', 'Прочее']],
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
      case 'catch': return { ico: icon(e.sid), title: `Пойман ${e.shiny ? 'сияющий ' : ''}${e.dark ? 'омрачённый ' : ''}${sp(e.sid)}`, sub: e.power ? `СИЛА ${e.power}` : '' };
      case 'flee': return { ico: icon(e.sid), title: `${sp(e.sid)} ускользнул`, sub: 'Дух вернулся в Навь', cls: 'dim' };
      case 'hatch': return { ico: icon(e.sid), title: `Из кокона появился ${sp(e.sid)}`, sub: e.km ? `Кокон ${e.km} км` : '' };
      case 'evolve': return { ico: icon(e.to), title: `${sp(e.from)} превратился в ${sp(e.to)}`, sub: '' };
      case 'raid': return { ico: icon(e.sid), title: `Разлом закрыт: ${sp(e.sid)}`, sub: '★'.repeat(e.tier || 1) };
      case 'duel': return { ico: glyph('⛩'), title: `Победа: ${e.name}`, sub: `Хранитель ${e.guard || ''}` };
      case 'invasion': return { ico: glyph('☾', 'dark'), title: `Родник освобождён`, sub: e.name || '' };
      case 'league': return { ico: glyph('★', 'gold'), title: `Турнир Лиги: побед ${e.won} из 3`, sub: `Ранг: ${e.rank}` };
      case 'level': return { ico: glyph(e.l, 'gold'), title: `Новый уровень: ${e.l}`, sub: '' };
      case 'medal': return { ico: glyph('✦', 'gold'), title: `Знак «${e.name}»`, sub: MEDAL_TIERS[e.tier - 1] ? MEDAL_TIERS[e.tier - 1].name : '' };
      case 'story': return { ico: glyph('✎'), title: `Глава Летописи: «${e.title}»`, sub: 'Завершена' };
      case 'trade': return { ico: icon(e.sid), title: e.dir === 'out' ? `${sp(e.sid)} упакован для друга` : `${sp(e.sid)} получен от ${e.who || 'друга'}`, sub: 'Обмен' };
      case 'friend': return { ico: glyph('♥', 'pink'), title: `Новый друг: ${e.name}`, sub: '' };
      case 'spar': return { ico: glyph('⚔'), title: `Победа в поединке с другом`, sub: e.name || '' };
      case 'clan': return { ico: glyph('⚑', 'gold'), title: `Вступление: ${CLANS[e.clan] ? CLANS[e.clan].name : 'дружина'}`, sub: '' };
      case 'guardBack': return { ico: icon(e.sid), title: 'Защитник вернулся с Капища', sub: `${e.name || ''} · стоял ${e.hours} ч` };
      case 'defend': return { ico: icon(e.sid), title: `Защитник на Капище`, sub: e.name || '' };
      case 'shop': return { ico: glyph('☉', 'gold'), title: `Покупка в Лавке: ${e.name || ''}`, sub: '' };
      case 'passGold': return { ico: glyph('★', 'gold'), title: 'Открыта Золотая тропа', sub: e.season || '' };
      case 'exchange': return { ico: glyph('⇄', 'gold'), title: 'Обмен в Лавке', sub: `✦ ${U.fmtNum(e.sparks || 0)} → ${e.zlat || 0} златников` };
      case 'pay': return { ico: glyph('☉', 'gold'), title: 'Казна Ордена', sub: `+${e.zlat || 0} златников` };
      case 'auction': return { ico: glyph('⚖', 'gold'), title: e.dir === 'buy' ? `Куплен на аукционе: ${SP[e.sid] ? SP[e.sid].name : ''}` : e.dir === 'sold' ? `Продан на аукционе: ${SP[e.sid] ? SP[e.sid].name : ''}` : `Выставлен на аукцион: ${SP[e.sid] ? SP[e.sid].name : ''}`, sub: `${e.cur === 'zlat' ? '' : '✦ '}${U.fmtNum(e.price || 0)}${e.cur === 'zlat' ? ' златников' : ''}${e.who ? ' · ' + e.who : ''}` };
      case 'order': return { ico: glyph('⚑', 'gold'), title: 'Общее дело Ордена', sub: `Награда ${(e.i | 0) + 1}-й ступени` };
      case 'gift': return { ico: glyph('✉', 'pink'), title: e.dir === 'out' ? `Подарок отправлен: ${e.name}` : `Подарок от ${e.name}`, sub: '' };
    }
    return { ico: glyph('•'), title: e.type, sub: '' };
  },

  screen() {
    const scr = UI.screen('Дневник Ловчего', `
      <div class="chips j-filters">${this.FILTERS.map(([k, t]) => `<button data-f="${k}">${t}</button>`).join('')}</div>
      <div class="j-list"></div>`, 'journal-screen');
    const render = () => {
      U.$$('[data-f]', scr).forEach(b => b.classList.toggle('on', b.dataset.f === this.filter));
      const list = S.d.journal.filter(e => this.filter === 'all' || (this.GROUP[e.type] || 'other') === this.filter);
      let day = '', html = '';
      list.forEach((e, i) => {
        const d = new Date(e.t), ds = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
        if (ds !== day) { day = ds; html += `<div class="j-day">${ds}</div>`; }
        const v = this.view(e);
        html += `<div class="j-row ${v.cls || ''}">${v.ico}<div class="row-main"><b>${U.esc(v.title)}</b><small>${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}${v.sub ? ' · ' + U.esc(v.sub) : ''}</small></div>
          ${e.lat != null ? `<button class="btn small ghost j-map" data-i="${S.d.journal.indexOf(e)}" title="На карте">${UI.I.pin}</button>` : ''}</div>`;
      });
      scr.querySelector('.j-list').innerHTML = html || '<div class="empty">Записей пока нет. Лови духов — дневник заполнится сам.</div>';
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
