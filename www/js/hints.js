'use strict';
/* Советы Велимира: разовые подсказки о возможностях, которые игрок ещё не нашёл
   (усилить духа, превратить, сдать поручение, забрать главу Летописи, вступить в дружину…).
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
    // глава Летописи завершена
    if (STORY[d.story.ch] && S.storyReady()) out.push({ id: 'story:' + d.story.ch, btn: 'Открыть Летопись',
      text: `Глава «${STORY[d.story.ch].title}» Летописи завершена! Забери награду — и узнаешь, что было дальше.`, go: () => UI.quests('story') });
    // выполненное поручение ждёт сдачи
    const task = d.tasks.find(q => q.p >= q.n);
    if (task) out.push({ id: 'task:' + task.id, btn: 'К поручениям',
      text: `Поручение «${task.text}» выполнено. Сдай его — и тебя ждёт встреча с духом: ${SP[task.sid].name}.`, go: () => UI.quests('day') });
    // можно усилить духа, а игрок ещё ни разу этого не делал
    const canPower = byPower.find(sp => !S.canPowerUp(sp));
    const neverPowered = d.story.ch === 0 && d.story.p[2] < 1;
    if (canPower && neverPowered && d.stats.caught >= 3) out.push({ id: 'power', btn: 'Показать',
      text: `Искры и эссенция нужны, чтобы <b>усиливать духов</b>: сильный дух легче побеждает в разломах и на капищах. Открой карточку духа и нажми «Усилить» — например, у «${U.esc(canPower.nick || SP[canPower.sid].name)}».`,
      go: () => this.openCard(canPower.uid, '.act-power') });
    // дух может превратиться
    const canEvo = byPower.find(sp => SP[sp.sid].evo && !S.canEvolve(sp));
    if (canEvo) out.push({ id: 'evolve:' + canEvo.sid, btn: 'Показать',
      text: `Эссенции хватает: «${U.esc(canEvo.nick || SP[canEvo.sid].name)}» может превратиться в <b>${SP[SP[canEvo.sid].evo].name}</b>. Превращённый дух намного сильнее.`,
      go: () => this.openCard(canEvo.uid, '.act-evo') });
    // Летопись ждёт закрытого Разлома, а до Капищ далеко — есть Дальний пропуск
    const ch = STORY[d.story.ch], ri = ch ? ch.steps.findIndex(s => s.t === 'raid') : -1;
    if (ri >= 0 && d.story.p[ri] < ch.steps[ri].n && d.items.farpass) out.push({ id: 'rifts:' + d.story.ch, btn: 'Разломы вокруг',
      text: 'Летопись ждёт, когда ты закроешь <b>Разлом</b>. Не обязательно идти к Капищу: в «Меню → Разломы» видны все Разломы на 5 км вокруг, а <b>Дальний пропуск</b> позволяет сразиться издалека. Один пропуск Орден дарит каждый день.',
      go: () => Raid.list() });
    // на Сезонной тропе ждут награды (раз в сезон)
    if (Pass.claimable() > 0) out.push({ id: 'pass:' + Pass.season(), btn: 'К Тропе',
      text: 'Ты уже прошёл первые ступени <b>Сезонной тропы</b> — награды ждут! Очки Тропы дают за обычную игру: поимки, родники, прогулки и бои.',
      go: () => Pass.screen() });
    // пора в дружину
    if (d.level >= CLAN_LEVEL && !d.clan) out.push({ id: 'clan', btn: 'Выбрать дружину',
      text: 'Ты уже Ловчий пятого уровня — пора выбрать <b>дружину</b>. Дружины держат Капища: победи на Капище, поставь своего духа защитником — и каждый день получай дань.',
      go: () => Clans.choose() });
    // коконы лежат без дела
    if (d.cocoons.some(c => !c.inc) && S.incubating() < 3) out.push({ id: 'cocoon:' + today, btn: 'К коконам',
      text: 'Одновременно можно греть три кокона, а у тебя есть свободное место. Положи кокон греться — из него вылупится дух, пока ты гуляешь.',
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
      html: `<div class="hint"><div class="hint-ava">${Art.stack(CutArt.velimir(true).replace('class="vm-breath"', ''), 'velimir-mini')}</div><div><b>Совет Велимира</b><p>${h.text}</p></div></div>`,
      buttons: [{ label: 'Позже' }, { label: h.btn, cls: 'primary', fn: h.go }],
    });
  },
};
