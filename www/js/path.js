'use strict';
/* 4.0: «Путь Ловчего» — дорога уровней 1–40: звания, что открывается на каждом уровне и награды за уровень.
   Только показывает то, что уже есть в игре (уровни открытия берутся из тех же констант, что проверяет сервер). */

const Path = {
  RANKS: { 1: ru`Послушник`, 5: ru`Ловчий`, 10: ru`Следопыт`, 20: ru`Ведун`, 30: ru`Хранитель` },
  // что открывается на уровне: [значок меню или предмет, название, пояснение]
  unlocks() {
    const U2 = {};
    const add = (l, ic, t, s) => (U2[l] = U2[l] || []).push({ ic, t, s });
    add(1, 'spirits', ru`Поимка духов`, ru`Обереги, мёд, источники и коконы`);
    add(1, 'scroll', ru`Задания`, ru`Задания дня и поручения источников`);
    add(2, 'shop', ru`Лавка Ордена`, ru`Обереги, мёд и живая вода`); // 4.18: лестница открытий (см. UI.openLvl)
    add(2, 'swap', ru`Друзья`, ru`Коды дружбы и ежедневные подарки`);
    add(3, 'trail', ru`Сезонная тропа`, ru`Награды за обычную игру`);
    add(RAID_LEVEL, 'rift', ru`Разломы`, ru`Бой командой из трёх духов с хранителем Разлома`);
    add(DUEL_LEVEL, 'shield', ru`Капища предков`, ru`Поединки 3 на 3 с хранителями`);
    add(Rules.CHAT.LEVEL, 'chat', ru`Чат Ордена`, ru`Можно писать сообщения`);
    add(INVASION_LEVEL, 'rift', ru`Вторжения Нави`, ru`Освобождай захваченные источники`);
    add(League.LEVEL, 'trophy', ru`Лига Ордена`, ru`Бои с живыми Ловчими, рейтинг и лиги`);
    add(CLAN_LEVEL, 'shield', ru`Клан`, ru`Клан своей мифологии — знамя над святилищами`);
    add(Rules.AUCTION.LEVEL, 'gavel', ru`Аукцион`, ru`Продажа и покупка духов`);
    add(ITEMS.charm2.unlock, 'item:charm2', ru`Серебряный оберег`, ru`Шанс поимки ×1,5`);
    add(ITEMS.charm3.unlock, 'item:charm3', ru`Золотой оберег`, ru`Шанс поимки ×2`);
    Object.entries(TASK_TIERS).forEach(([t, x]) => add(x.lvl, 'egg', ru`Поручения источников · ${'I'.repeat(+t)}`, ru`Особые встречи и награды`));
    LOOK.cloak.filter(c => c.lvl > 1 && !c.shop && !c.pass).forEach(c => add(c.lvl, 'look:' + c.c, ru`Плащ «${c.name}»`, ru`Для облика Ловчего`));
    LOOK.eyes.filter(c => c.lvl > 1).forEach(c => add(c.lvl, 'eyes:' + c.c, ru`Глаза «${c.name}»`, ru`Для облика Ловчего`));
    LOOK.emblem.filter(c => c.lvl > 1 && !c.league && !c.pass).forEach(c => add(c.lvl, 'emb', ru`Знак «${c.name}»`, ru`Для облика Ловчего`));
    // 4.16: пробуждение духов — тоже по уровням, до самого 40-го
    S.AWAKE.LVL.forEach((l, i) => add(l, 'item:alatyr', ru`Пробуждение: звезда ${i + 1}`, ru`Предел уровня духа +${S.AWAKE.STEP} за осколки Алатыря`));
    add(MAX_LEVEL, 'trophy', ru`Вершина пути`, ru`Максимальный уровень Ловчего`);
    return U2;
  },
  ico(k) {
    if (k.startsWith('item:')) return Art.item(k.slice(5));
    if (k.startsWith('look:')) return `<svg viewBox="0 0 100 100" class="art"><path d="M50 12 C68 12 78 30 78 48 L84 90 H16 L22 48 C22 30 32 12 50 12Z" fill="${k.slice(5)}" stroke="#1c0b33" stroke-width="4"/><ellipse cx="50" cy="46" rx="15" ry="17" fill="#150d2b"/></svg>`;
    if (k.startsWith('eyes:')) return `<svg viewBox="0 0 100 100" class="art"><circle cx="50" cy="50" r="40" fill="#150d2b" stroke="#1c0b33" stroke-width="4"/><ellipse cx="36" cy="50" rx="9" ry="6" fill="${k.slice(5)}"/><ellipse cx="64" cy="50" rx="9" ry="6" fill="${k.slice(5)}"/></svg>`;
    if (k === 'emb') return Art.charm('charm');
    return UI.menuIcon(k);
  },
  // 4.16: опыт за сегодня (дневной потолок) и опыт отдыха — те же правила, что у сервера (S.xpGain)
  dayNote() {
    const x = S.xpToday(), mul = Ev.xpMul(), F = XP_DAY.FULL * mul, H = XP_DAY.HALF * mul;
    const now = x.n < F ? ru`Сегодня получено ${U.fmtNum(Math.round(x.n))} опыта — полностью до ${U.fmtNum(F)}` : x.n < H ? ru`Сегодня получено ${U.fmtNum(Math.round(x.n))} опыта — дальше вполовину до ${U.fmtNum(H)}` : ru`Сегодня получено ${U.fmtNum(Math.round(x.n))} опыта — дальше на четверть`;
    return `<p class="pth-note"><b>${now}</b>${x.rest > 0 ? `<br><b>${ru`Опыт отдыха: следующие ${U.fmtNum(x.rest)} опыта — вдвое`}</b>` : ''}<br>
      ${ru`За день опыт идёт полностью до ${U.fmtNum(XP_DAY.FULL)}, дальше до ${U.fmtNum(XP_DAY.HALF)} — вполовину, сверх — на четверть. Обучение и знаки Ордена дают опыт всегда полностью. За каждый день без игры копится опыт отдыха (${U.fmtNum(XP_DAY.REST)}, не больше чем за ${XP_DAY.REST_DAYS} ${U.plural(XP_DAY.REST_DAYS, ru`день`, ru`дня`, ru`дней`)}): пока он есть, опыт вдвое.`}</p>`;
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
        rows.push(`<div class="pth-row mini ${st}"><span class="pth-node">${l}</span><div class="pth-card"><small>${ru`Награда`}</small><div class="pth-rws">${this.rw(l)}</div></div></div>`);
        continue;
      }
      rows.push(`<div class="pth-row ${st}${rank ? ' rank' : ''}" ${st === 'cur' ? 'id="pthCur"' : ''}><span class="pth-node">${l}</span>
        <div class="pth-card">${rank ? `<div class="pth-rank">${ru`Звание «${rank}»`}</div>` : ''}${st === 'cur' ? `<div class="pth-here">${ru`Ты здесь`}</div>` : ''}
          ${list.map(x => `<div class="pth-un"><span class="pth-ic">${this.ico(x.ic)}</span><div><b>${x.t}</b><small>${x.s}</small></div></div>`).join('')}
          ${l > 1 ? `<div class="pth-rws">${this.rw(l)}</div>` : ''}</div></div>`);
    }
    const scr = UI.screen(ru`Путь Ловчего`, `
      <div class="pth-head" style="--cc:${d.clan && CLANS[d.clan] ? CLANS[d.clan].color : '#fbbf24'}">
        <div class="pc-ava"><div class="acc-ava">${Art.avatar(d.look)}</div><span class="pc-lvl">${d.level}</span></div>
        <div class="pth-hmain"><b>${UI.rank(d.level)} · ${ru`${d.level} уровень`}</b>
          <div class="pbar"><i style="width:${d.level >= MAX_LEVEL ? 100 : (d.xp - cur) / (next - cur) * 100}%"></i></div>
          <small>${d.level >= MAX_LEVEL ? ru`Ты прошёл весь путь!` : ru`До ${d.level + 1} уровня — ${U.fmtNum(next - d.xp)} опыта`}${nextUnlock ? ` · ${ru`дальше: ${un[nextUnlock][0].t} на ${nextUnlock}`}` : ''}</small></div>
      </div>
      <p class="pth-note">${ru`Опыт дают поимки, источники, разломы, капища и задания. С уровнем растут и твои духи: их можно усиливать до уровня Ловчего +5.`} ${ru`С ${S.AWAKE.LVL[0]} уровня духов можно пробуждать: каждая звезда поднимает предел уровня духа ещё на ${S.AWAKE.STEP}, до ${SPIRIT_MAX}.`}</p>
      ${this.dayNote()}
      <div class="pth-road">${rows.join('')}</div>`, 'pth-screen');
    setTimeout(() => { const c = scr.querySelector('#pthCur'); if (c) c.scrollIntoView({ block: 'center' }); }, 60);
  },
};
