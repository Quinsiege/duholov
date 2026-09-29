'use strict';
/* Советы: разовые подсказки о возможностях, которые игрок ещё не нашёл
   (превратить духа, сдать поручение, открывшийся раздел, вступить в клан…). 4.24: без наставника и сюжета.
   Каждый совет показывается один раз; что уже показано — помнит телефон (это удобство, не прогресс). */

const Hints = {
  KEY: 'duholov.hints',
  GAP: 60000, // не чаще раза в минуту
  seen: null,

  load() {
    try { this.seen = JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch (e) { this.seen = {}; }
  },
  mark(id) {
    this.seen[id] = Date.now();
    try { localStorage.setItem(this.KEY, JSON.stringify(this.seen)); } catch (e) {}
  },

  // Карточка духа с подсветкой нужной кнопки
  openCard(uid, btn) {
    UI.detail(uid);
    setTimeout(() => {
      const b = document.querySelector(`.det-screen ${btn}`);
      if (b) { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); b.classList.add('hint-glow'); setTimeout(() => b.classList.remove('hint-glow'), 4000); }
    }, 300);
  },

  // Советы по порядку важности: первый подходящий и ещё не показанный
  list() {
    const d = S.d, today = U.today();
    const byPower = [...d.spirits].sort((a, b) => S.power(b) - S.power(a));
    const out = [];
    // выполненное поручение ждёт сдачи
    const task = d.tasks.find(q => q.p >= q.n);
    if (task) out.push({ id: 'task:' + task.id, btn: ru`К поручениям`,
      text: ru`Поручение «${I18N.back(task.text)}» выполнено. Сдай его — и тебя ждёт встреча с духом: ${SP[task.sid].name}.`, go: () => UI.quests('day') });
    // 4.18: открылся новый раздел — коротко о том, что это (по одному, пока раздел не открыт)
    const opened = UI.opened();
    const NEWS = [
      ['shop', 2, ru`Открылась <b>Лавка Ордена</b>: обереги, мёд и живая вода за искры и монеты. Каждый день там новое выгодное предложение.`, () => Shop.screen()],
      ['swap', 2, ru`Теперь можно заводить <b>друзей</b>: обменяйтесь кодами дружбы с другим Ловчим — и дарите друг другу подарки каждый день.`, () => Friends.screen()],
      ['trail', 3, ru`Открылась <b>Сезонная тропа</b>: очки Тропы дают за обычную игру, а за каждую ступень — награда. Новая Тропа — каждый месяц.`, () => Pass.screen()],
      ['rift', RAID_LEVEL, ru`У святилищ появились <b>Разломы</b> — трещины в иные миры с сильным духом-хранителем. Собери команду из трёх духов и закрой Разлом: за победу — обереги и шанс поймать босса.`, () => Raid.list()],
      ['shrine', DUEL_LEVEL, ru`Тебя уже пускают на <b>Капища предков</b>: подойди к Капищу на карте и сразись с хранителем — три твоих духа против трёх его.`, null],
      ['invasion', INVASION_LEVEL, ru`Навь начала <b>захватывать родники</b> — они на карте в тёмной дымке. Подойди, победи прислужников Нави — и родник снова твой, с наградой.`, null],
      ['trophy', League.LEVEL, ru`Открылась <b>Лига Ордена</b>: бои с живыми Ловчими в реальном времени, рейтинг и лиги — от Дерева до Легенды.`, () => League.screen()],
      ['gavel', Rules.AUCTION.LEVEL, ru`Открылся <b>Аукцион</b>: здесь Ловчие продают и покупают духов за искры и монеты.`, () => Auction.screen()],
    ];
    for (const [k, l, text, go] of NEWS) if (d.level >= l && !opened[k]) out.push({ id: 'open:' + k, btn: go ? ru`Показать` : ru`Понятно`, text, go: go ? () => { UI.markOpened(k); go(); } : null });
    // дух может превратиться
    const canEvo = byPower.find(sp => SP[sp.sid].evo && !S.canEvolve(sp));
    if (canEvo) out.push({ id: 'evolve:' + canEvo.sid, btn: ru`Показать`,
      text: ru`Эссенции хватает: «${U.esc(canEvo.nick || SP[canEvo.sid].name)}» может превратиться ${S.d.dex[SP[canEvo.sid].evo] && S.d.dex[SP[canEvo.sid].evo].seen ? ru`в <b>${SP[SP[canEvo.sid].evo].name}</b>` : ru`в <b>неизвестную форму</b>`}. Превращённый дух намного сильнее.`,
      go: () => this.openCard(canEvo.uid, '.act-evo') });
    // 4.16: сильный дух упёрся в предел уровня, а на звезду пробуждения всего хватает
    const canAw = byPower.slice(0, 6).find(sp => !S.canAwaken(sp));
    if (canAw) out.push({ id: 'awaken:' + canAw.uid + ':' + (canAw.stars || 0), btn: ru`Показать`,
      text: ru`«${U.esc(canAw.nick || SP[canAw.sid].name)}» дошёл до предела уровня, а осколков Алатыря хватает на <b>пробуждение</b>: звезда поднимет предел ещё на ${S.AWAKE.STEP} уровня.`,
      go: () => UI.awaken(canAw.uid) });
    // на Сезонной тропе ждут награды (раз в сезон)
    if (Pass.claimable() > 0) out.push({ id: 'pass:' + Pass.season(), btn: ru`К Тропе`,
      text: ru`Ты уже прошёл первые ступени <b>Сезонной тропы</b> — награды ждут! Очки Тропы дают за обычную игру: поимки, родники, прогулки и бои.`,
      go: () => Pass.screen() });
    // пора в клан
    if (d.level >= CLAN_LEVEL && !d.clan) out.push({ id: 'clan', btn: ru`Выбрать клан`,
      text: ru`Ты уже на ${CLAN_LEVEL} уровне — пора выбрать <b>клан</b>. У каждой мифологии свой клан, и кланы держат Капища: победи на Капище, поставь своего духа защитником — и каждый день получай дань.`,
      go: () => Clans.choose() });
    // коконы лежат без дела
    if (d.cocoons.some(c => !c.inc) && S.incubating() < 3) out.push({ id: 'cocoon:' + today, btn: ru`К коконам`,
      text: ru`Одновременно можно греть три кокона, а у тебя есть свободное место. Положи кокон греться — из него вылупится дух, пока ты гуляешь.`,
      go: () => UI.cocoons() });
    return out;
  },

  check() {
    if (!S.d || Tut.step() || UI.blocking() || Encounter.st || Raid.st || Duel.st) return;
    if (!this._t) { this._t = Date.now() - this.GAP + 20000; return; } // первый совет — не раньше чем через 20 с после входа
    if (Date.now() - this._t < this.GAP) return;
    if (!this.seen) this.load();
    const h = this.list().find(x => !this.seen[x.id]);
    if (!h) return;
    this._t = Date.now();
    this.mark(h.id);
    UI.modal({
      title: '', cls: 'hint-modal',
      html: `<div class="hint"><div class="hint-ava">${UI.menuIcon('orderbook')}</div><div><b>${ru`Совет`}</b><p>${h.text}</p></div></div>`,
      buttons: h.go ? [{ label: ru`Позже` }, { label: h.btn, cls: 'primary', fn: h.go }] : [{ label: h.btn, cls: 'primary' }],
    });
  },
};
