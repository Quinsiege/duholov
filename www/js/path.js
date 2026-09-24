'use strict';
/* 4.0: «Путь Ловчего» — дорога уровней 1–40: звания, что открывается на каждом уровне и награды за уровень.
   Только показывает то, что уже есть в игре (уровни открытия берутся из тех же констант, что проверяет сервер). */

const Path = {
  RANKS: { 1: 'Послушник', 5: 'Ловчий', 10: 'Следопыт', 20: 'Ведун', 30: 'Хранитель' },
  // что открывается на уровне: [значок меню или предмет, название, пояснение]
  unlocks() {
    const U2 = {};
    const add = (l, ic, t, s) => (U2[l] = U2[l] || []).push({ ic, t, s });
    add(1, 'spirits', 'Поимка духов', 'Обереги, мёд, родники и коконы');
    add(1, 'scroll', 'Задания и Летопись', 'Задания дня и сюжет Ордена');
    add(3, 'shield', 'Капища предков', 'Поединки 3 на 3 с хранителями');
    add(Rules.CHAT.LEVEL, 'chat', 'Чат Ордена', 'Можно писать сообщения');
    add(4, 'rift', 'Вторжения Нави', 'Освобождай захваченные родники');
    add(League.LEVEL, 'trophy', 'Лига Ордена', 'Турниры, звёзды и ранги');
    add(CLAN_LEVEL, 'shield', 'Дружина', 'Сокол, Медведь или Волк — знамя над капищами');
    add(Rules.AUCTION.LEVEL, 'gavel', 'Аукцион', 'Продажа и покупка духов');
    add(Propose.MIN_LEVEL, 'pin', 'Места', 'Предлагай новые родники и капища');
    add(ITEMS.charm2.unlock, 'item:charm2', 'Серебряный оберег', 'Шанс поимки ×1,5');
    add(ITEMS.charm3.unlock, 'item:charm3', 'Золотой оберег', 'Шанс поимки ×2');
    Object.entries(TASK_TIERS).forEach(([t, x]) => add(x.lvl, 'egg', `Поручения родников · ${'I'.repeat(+t)}`, 'Особые встречи и награды'));
    LOOK.cloak.filter(c => c.lvl > 1 && !c.shop && !c.pass).forEach(c => add(c.lvl, 'look:' + c.c, `Плащ «${c.name}»`, 'Для облика Ловчего'));
    LOOK.eyes.filter(c => c.lvl > 1).forEach(c => add(c.lvl, 'eyes:' + c.c, `Глаза «${c.name}»`, 'Для облика Ловчего'));
    LOOK.emblem.filter(c => c.lvl > 1 && !c.league && !c.story && !c.pass).forEach(c => add(c.lvl, 'emb', `Знак «${c.name}»`, 'Для облика Ловчего'));
    add(MAX_LEVEL, 'trophy', 'Вершина пути', 'Максимальный уровень Ловчего');
    return U2;
  },
  ico(k) {
    if (k.startsWith('item:')) return Art.item(k.slice(5));
    if (k.startsWith('look:')) return `<svg viewBox="0 0 100 100" class="art"><path d="M50 12 C68 12 78 30 78 48 L84 90 H16 L22 48 C22 30 32 12 50 12Z" fill="${k.slice(5)}" stroke="#1c0b33" stroke-width="4"/><ellipse cx="50" cy="46" rx="15" ry="17" fill="#150d2b"/></svg>`;
    if (k.startsWith('eyes:')) return `<svg viewBox="0 0 100 100" class="art"><circle cx="50" cy="50" r="40" fill="#150d2b" stroke="#1c0b33" stroke-width="4"/><ellipse cx="36" cy="50" rx="9" ry="6" fill="${k.slice(5)}"/><ellipse cx="64" cy="50" rx="9" ry="6" fill="${k.slice(5)}"/></svg>`;
    if (k === 'emb') return Art.charm('charm');
    return UI.menuIcon(k);
  },
  rw(l) {
    return Object.entries(S.levelRewards(l)).map(([k, n]) => `<span class="pth-rw">${Art.item(k)}<b>${U.fmtNum(n)}</b></span>`).join('');
  },
  screen() {
    Sfx.init(); Sfx.play('tap');
    Tut.ui('path'); // 4.0: шаг обучения
    const d = S.d, cur = levelXP(d.level), next = levelXP(d.level + 1), un = this.unlocks();
    const nextUnlock = Object.keys(un).map(Number).sort((a, b) => a - b).find(l => l > d.level);
    const rows = [];
    for (let l = 1; l <= MAX_LEVEL; l++) {
      const st = l < d.level ? 'done' : l === d.level ? 'cur' : 'next', rank = this.RANKS[l], list = un[l] || [];
      if (!rank && !list.length && l % 5 && l !== d.level) {
        // обычный уровень — короткая строка с наградой
        rows.push(`<div class="pth-row mini ${st}"><span class="pth-node">${l}</span><div class="pth-card"><small>Награда</small><div class="pth-rws">${this.rw(l)}</div></div></div>`);
        continue;
      }
      rows.push(`<div class="pth-row ${st}${rank ? ' rank' : ''}" ${st === 'cur' ? 'id="pthCur"' : ''}><span class="pth-node">${l}</span>
        <div class="pth-card">${rank ? `<div class="pth-rank">Звание «${rank}»</div>` : ''}${st === 'cur' ? '<div class="pth-here">Ты здесь</div>' : ''}
          ${list.map(x => `<div class="pth-un"><span class="pth-ic">${this.ico(x.ic)}</span><div><b>${x.t}</b><small>${x.s}</small></div></div>`).join('')}
          ${l > 1 ? `<div class="pth-rws">${this.rw(l)}</div>` : ''}</div></div>`);
    }
    const scr = UI.screen('Путь Ловчего', `
      <div class="pth-head" style="--cc:${d.clan && CLANS[d.clan] ? CLANS[d.clan].color : '#fbbf24'}">
        <div class="pc-ava"><div class="acc-ava">${Art.avatar(d.look)}</div><span class="pc-lvl">${d.level}</span></div>
        <div class="pth-hmain"><b>${UI.rank(d.level)} · ${d.level} уровень</b>
          <div class="pbar"><i style="width:${d.level >= MAX_LEVEL ? 100 : (d.xp - cur) / (next - cur) * 100}%"></i></div>
          <small>${d.level >= MAX_LEVEL ? 'Ты прошёл весь путь!' : `До ${d.level + 1} уровня — ${U.fmtNum(next - d.xp)} опыта`}${nextUnlock ? ` · дальше: ${un[nextUnlock][0].t} на ${nextUnlock}` : ''}</small></div>
      </div>
      <p class="pth-note">Опыт дают поимки, родники, разломы, капища, задания и Летопись. С уровнем растут и твои духи: их можно усиливать до уровня Ловчего +5.</p>
      <div class="pth-road">${rows.join('')}</div>`, 'pth-screen');
    setTimeout(() => { const c = scr.querySelector('#pthCur'); if (c) c.scrollIntoView({ block: 'center' }); }, 60);
  },
};
