'use strict';
/* 4.0: «Книга Ордена» — иллюстрированная энциклопедия мира и всех механик (вместо длинного списка «Об игре»).
   Цифры и списки берутся из тех же данных, что использует игра, поэтому книга всегда совпадает с правилами. */

const Book = {
  CH: [
    { id: 'world', ico: 'orderbook', t: 'Мир Духолова', s: 'Тонкая ночь, Навь и Орден' },
    { id: 'spirits', ico: 'spirits', t: 'Духи и стихии', s: 'Шесть стихий, редкость, семейства' },
    { id: 'catch', ico: 'item:charm', t: 'Поимка', s: 'Кольцо, броски, обереги и мёд' },
    { id: 'springs', ico: 'bag', t: 'Родники и Сумка', s: 'Где брать обереги и припасы' },
    { id: 'cocoons', ico: 'egg', t: 'Коконы и спутник', s: 'Шаги, вылупление, находки' },
    { id: 'power', ico: 'item:water', t: 'Усиление и превращение', s: 'Искры, эссенция, амулеты' },
    { id: 'rifts', ico: 'rift', t: 'Разломы', s: 'Боссы Нави и команда из трёх' },
    { id: 'shrines', ico: 'shield', t: 'Капища и дружины', s: 'Хранители, защитники, дань' },
    { id: 'nav', ico: 'user', t: 'Вторжения Нави', s: 'Прислужники и омрачённые духи' },
    { id: 'league', ico: 'trophy', t: 'Лига Ордена', s: 'Турниры, звёзды, ранги' },
    { id: 'friends', ico: 'swap', t: 'Друзья, чат и аукцион', s: 'Подарки, дружба, торговля' },
    { id: 'story', ico: 'scroll', t: 'Летопись', s: 'Четыре книги истории Ордена' },
    { id: 'events', ico: 'trail', t: 'Праздники и события', s: 'Святки, Купала, Покров…' },
    { id: 'path', ico: 'path', t: 'Путь Ловчего', s: 'Что откроется на каждом уровне' },
  ],
  ico(k) { return k.startsWith('item:') ? Art.item(k.slice(5)) : UI.menuIcon(k); },
  screen() {
    Sfx.init(); Sfx.play('tap');
    const scr = UI.screen('Книга Ордена', `
      <button class="bk-trailer"><span class="bk-play">▶</span><div><b>Трейлер «Тонкая ночь»</b><small>С чего всё началось</small></div></button>
      <div class="bk-grid">${this.CH.map(c => `<button class="bk-ch" data-id="${c.id}"><span class="bk-ico">${this.ico(c.ico)}</span><b>${c.t}</b><small>${c.s}</small></button>`).join('')}</div>
      <p class="small center bk-foot">Орден Оберега · записано Велимиром и Ловчими всех земель</p>`, 'bk-screen');
    scr.querySelector('.bk-trailer').onclick = () => Trailer.play({ replay: true });
    scr.querySelectorAll('.bk-ch').forEach(b => { b.onclick = () => b.dataset.id === 'path' ? Path.screen() : this.page(b.dataset.id); });
  },
  page(id) {
    Sfx.play('tap');
    const c = this.CH.find(x => x.id === id), P = this.PAGES[id].call(this);
    UI.screen(c.t, `<div class="bk-page"><div class="bk-hero"><span class="bk-ico big">${this.ico(c.ico)}</span><div><small>Книга Ордена</small><b>${c.t}</b></div></div>${P}</div>`, 'bk-screen');
  },
  // строки-карточки: [картинка, заголовок, текст]
  cards(list) { return `<div class="bk-cards">${list.map(([a, t, s]) => `<div class="bk-card">${a ? `<span class="bk-art">${a}</span>` : ''}<div><b>${t}</b><p>${s}</p></div></div>`).join('')}</div>`; },
  p(t) { return `<p class="bk-p">${t}</p>`; },
  h(t) { return `<h3 class="prof-h">${t}</h3>`; },
  PAGES: {
    world() {
      return LORE.map(x => this.p(x)).join('') + this.h('Орден Оберега') +
        this.p('Ловчие Ордена берегут границу между Явью и Навью. Старший Ловчий — <b>Велимир</b>: он встречает каждого новичка и ведёт Летопись. Клятва Ордена проста: <b>беречь духов, беречь границу, беречь друг друга</b>.') +
        this.cards([[Art.spirit('koschey'), 'Кощей Бессмертный', 'Царь Нави. Это он истончил границу в Тонкую ночь. О том, чем всё закончилось, рассказывает вторая книга Летописи.'],
          [Art.spirit('vayfayka'), 'Новые духи', 'Город рождает своих духов: из Wi‑Fi, фонарей, трамваев и пакетов. В старых книгах о таких не писали — пишем мы.']]);
    },
    spirits() {
      const el = ELEMENT_KEYS.map(k => [Art.elIcon(k, 40), ELEMENTS[k].name, `Сильнее против: ${ELEMENTS[k].beats.map(b => ELEMENTS[b].name).join(' и ')}. Приёмы: «${ELEMENTS[k].fast}», «${ELEMENTS[k].charge}».`]);
      const rar = Object.entries(RARITY).map(([k, r]) => `<span class="bk-tag" style="color:${r.color};border-color:${r.color}">${r.name}</span>`).join('');
      return this.p(`В бестиарии Ордена — <b>${SPECIES.length} видов</b> духов. У каждого своя стихия, редкость и семейство: малыши превращаются во взрослых духов.`) +
        this.h('Шесть стихий') + this.cards(el) + this.h('Редкость') + `<div class="bk-tags">${rar}</div>` +
        this.p('Ночью чаще встречаются духи Тени и Ветра, у каждого района города — своя любимая стихия. Есть и особые духи: ночные, дневные, сезонные, региональные и духи родных земель.') +
        this.h('Сияющие') + this.p(`Редкие цветовые варианты — примерно 1 из ${Math.round(1 / SHINY_RATE)}. Их выдают искры вокруг духа.`);
    },
    catch() {
      return this.cards([
        [Art.item('charm'), 'Бросок', 'Коснись духа на карте, затем смахни оберег вверх. Сила свайпа — дальность броска.'],
        [Art.item('charm2'), 'Кольцо', 'Внутреннее кольцо сжимается. Попади, пока оно маленькое, — будет «Отлично!» или «Превосходно!»: больше опыта и выше шанс.'],
        [Art.item('honey'), 'Мёд', 'Успокаивает духа: шанс поимки ×1,5 на один бросок.'],
        [Art.item('charm3'), 'Обереги', `Обычный, серебряный (×1,5, с ${ITEMS.charm2.unlock} ур.) и золотой (×2, с ${ITEMS.charm3.unlock} ур.).`]]) +
        this.p('Цвет кольца — нрав духа: <b>зелёный</b> — покладистый, <b>жёлтый</b> — с характером, <b>красный</b> — упрямый. Дух может и сбежать — тогда он растворится в воздухе.');
    },
    springs() {
      const items = ['charm', 'honey', 'water', 'incense', 'farpass', 'gift'].map(k => [Art.item(k), ITEMS[k].name, ITEMS[k].desc]);
      return this.p('Родники — старые колодцы у настоящих мест: памятников, фонтанов, храмов, арт-объектов. Подойди и коснись — выпадут припасы, иногда кокон. Потом родник набирает силу несколько минут.') +
        this.h('Вещи в Сумке') + this.cards(items) + this.p(`В Сумке помещается ${BAG_LIMIT} вещей — лишнее можно выбросить.`);
    },
    cocoons() {
      const t = Object.entries(COCOON_TIERS).map(([km, c]) => [Art.cocoon(+km), c.name, `Вылупится через ${km} км пути. Внутри — ${Object.keys(c.pool).map(r => RARITY[r].name.toLowerCase()).join(', ')} духи.`]);
      return this.p('Коконы выпадают из родников и греются шагами. Одновременно можно греть три.') + this.cards(t) +
        this.h('Спутник') + this.p('Выбери спутника на карточке духа — он будет идти рядом и приносить эссенцию своего семейства. Амулет Лады делает находки вдвое чаще.');
    },
    power() {
      const am = AMULET_KEYS.map(k => [Art.amulet(k), AMULETS[k].name, AMULETS[k].desc]);
      return this.p('<b>Усиление</b> поднимает уровень духа за искры и эссенцию семейства (уровень духа — до уровня Ловчего +5). <b>Превращение</b> делает малыша взрослым: нужна эссенция, её приносят поимки духов того же семейства.') +
        this.p(`<b>Второй особый приём</b> учится на карточке духа: дешевле основного (⚡${MOVES.charge2.cost} вместо ${MOVES.charge.cost}), но слабее.`) +
        this.h('Амулеты') + this.cards(am) + this.p('Амулет надевается на духа — по одному. Выпадают за победы в разломах и за ранги Лиги.');
    },
    rifts() {
      return this.cards([[Art.riftIcon(3), 'Разлом', 'Портал со звёздами у Капища, открыт час. Внутри — босс Нави. Собери команду из трёх духов.'],
        [Art.item('water'), 'Бой', 'Тапай, чтобы атаковать; уклоняйся при «!». Живая вода лечит духа прямо в бою.'],
        [Art.spirit('zharptica'), 'Награда', 'Победа — шанс поймать босса, обереги разлома и амулеты. Боссы меняются каждый час.']]) +
        this.p('Великие разломы — самые сильные: там встречаются легенды. Дальний пропуск позволяет закрыть разлом до 5 км от тебя, не подходя к нему. С друзьями можно закрыть совместный разлом.');
    },
    shrines() {
      const cl = Object.values(CLANS).map(c => [`<svg viewBox="0 0 100 100" class="art"><path d="M50 8 L84 20 V46 C84 70 68 84 50 92 C32 84 16 70 16 46 V20Z" fill="${c.color}" stroke="#1c0b33" stroke-width="4"/></svg>`, c.name, c.motto]);
      return this.p('Капища — резные идолы у памятных мест. С 3 уровня можно сразиться с хранителем: бой 3 на 3, тап — атака, «Приём» — особый удар, два щита спасают от приёмов хранителя. Каждое капище можно освятить раз в день.') +
        this.cards(Object.values(SHRINE_TIERS).map((t, i) => [Art.shrineIcon(i + 1), `Хранитель-${t.title.toLowerCase()}`, `Награда: ${U.fmtNum(t.xp)} опыта и ${U.fmtNum(t.sparks)} искр.`])) +
        this.h(`Дружины (с ${CLAN_LEVEL} уровня)`) + this.cards(cl) +
        this.p(`Поставь защитника на Капище своей дружины — он приносит дань: ${TRIBUTE.sparks} искр и оберег в день за каждое Капище (до ${HOLD_MY_MAX} Капищ).`);
    },
    nav() {
      return this.p('С 4 уровня прислужники Нави захватывают родники — такие светятся лиловым. Победи прислужника, и родник освободится, а омрачённого духа можно спасти.') +
        this.cards([[Art.springIcon(false, true), 'Захваченный родник', 'Пока он в руках Нави, из него ничего не взять.'],
          [Art.spirit('rusalka', false, true), 'Омрачённый дух', 'Бьёт сильнее, но хуже держит удар. На карточке его можно очистить — он станет обычным.']]);
    },
    league() {
      return this.p(`С ${League.LEVEL} уровня — Лига Ордена: турнир из трёх поединков подряд без лечения. За победы — звёзды, за звёзды — ранги и награды. Три победы подряд — ещё одна звезда сверху. Сезон длится месяц, в день — ${League.TICKETS} жетона.`) +
        this.cards([[UI.menuIcon('trophy'), 'Ранги', '10 рангов Лиги с наградами: обереги, амулеты и знак «Венец Лиги» для облика.']]);
    },
    friends() {
      return this.p('Обменяйтесь кодами дружбы в «Меню → Друзья». Подарки из родников можно отправлять каждому другу раз в день — растёт уровень дружбы и приносит опыт.') +
        this.cards(FRIEND_LEVELS.map(f => [UI.menuIcon('swap'), f.name, f.pts ? `${f.pts} очков дружбы${f.xp ? ` · +${U.fmtNum(f.xp)} опыта` : ''}` : 'Начало дружбы'])) +
        this.h('Чат и Аукцион') + this.p(`Писать в Чат Ордена можно с ${Rules.CHAT.LEVEL} уровня. С ${Rules.AUCTION.LEVEL} уровня открыт Аукцион: продавай духов за искры или златники, лот живёт ${Rules.AUCTION.HOURS} часа.`);
    },
    story() {
      const books = [['Книга первая', 0, 6], ['Книга вторая «Игла Кощея»', 6, 12], ['Книга третья «Земли Руси»', 12, 18], ['Книга четвёртая «Осень Нави»', 18, STORY.length]];
      const done = S.d ? S.d.story.ch : 0;
      return this.p('Летопись — сюжет Ордена: главы с заданиями, наградами и легендарными духами в конце каждой книги. Открывается во вкладке «Задания».') +
        books.map(([t, a, b]) => this.h(t) + `<div class="bk-chs">${STORY.slice(a, b).map((c, i) => `<span class="bk-chip ${a + i < done ? 'on' : ''}">${a + i + 1}. ${c.title}</span>`).join('')}</div>`).join('');
    },
    events() {
      const h = Object.entries(HOLIDAYS).map(([k, x]) => [UI.menuIcon('trail'), x.name, x.desc]);
      return this.p('Каждый понедельник начинается новое событие недели, а по календарю приходят праздники.') + this.h('Праздники') + this.cards(h) +
        this.h('События недели') + `<div class="bk-tags">${WEEK_EVENTS.map(e => `<span class="bk-tag">${e.name}</span>`).join('')}</div>`;
    },
  },
};
