'use strict';
/* 5.2: «одна активная сцена». Пока открыта полноэкранная сцена — экран меню (UI.screen), поимка, бои (Разлом, Капище,
   Лига, совместный Разлом), Атлас, книга-вступление, итог обучения, съёмка места, вход, ошибка — карта под ней не работает:
   не пересчитывает духов и места, не рисует туман, не ходит в сеть за тем, что нужно только ей, не тикает таймерами HUD;
   её анимации и погода стоят, а когда сцена проявилась целиком (COVER_MS), карта и HUD вовсе не рисуются (style.css:
   body.stage, body.stage-cover). Сквозь стеклянные экраны меню (4.25) карта видна размытой — там она не прячется,
   а замирает, и видна лишь её подложка (плитки): значки, Ловчий и круги под стеклом не рисуются (5.2). Когда последняя сцена закрылась, карта сразу видна как была, а пропущенное догружается один раз:
   модули подписываются на Stage.on и помечают у себя, что пропустили.
   Вложенные сцены (из коллекции — карточка духа, из Разлома — поимка босса): карта на паузе, пока открыта хотя бы одна;
   у сцены под верхней анимации на паузе, а под непрозрачной верхней она и не рисуется (.stage-under, .stage-hid).
   Окна (UI.modal) — не сцены: под ними карта видна размытой (там на паузе только её анимации и погода).
   5.2: главное меню (UI.menu, .rm-wrap) — сцена, стеклянная: под ним только неподвижная подложка карты; HUD не рисуется,
   кроме центральной кнопки — она закрывает меню (style.css: body.rm-open). */

const Stage = {
  // корни полноэкранных сцен — прямые потомки body
  SEL: '.screen, .enc, .raid, .atlas, .intro, .tut-final, .cam-screen, .onb, .fatal, .rm-wrap',
  // стеклянные экраны меню (и Источник), Атлас (5.1.6) и само главное меню (5.2): под ними видна размытая неподвижная
  // подложка карты (4.25) — только плитки земли и домов; значки, круг Ловчего, зоны духов не рисуются (style.css, body.stage-glass)
  GLASS: '.screen, .atlas, .rm-wrap',
  COVER_MS: 700,    // сцена проявилась целиком — карту под ней можно не рисовать
  RESUME_MS: 80,    // закрыли сцену и тут же открыли другую (переход между экранами) — карта не просыпается зря
  list: [], fns: [], root: null, _busy: false, _mo: null, _co: null, _t: 0, _rt: 0,

  // root — где лежат сцены (в игре — body; тесты берут свою коробку)
  init(root) {
    root = root || document.body;
    if (this._mo || typeof MutationObserver === 'undefined' || !root) return;
    this.root = root;
    this._mo = new MutationObserver(r => this.onMut(r));
    this._co = new MutationObserver(r => this.onMut(r));
    this._mo.observe(root, { childList: true });
    [...root.children].forEach(el => this.track(el));
    this.sync();
  },
  // открыта хотя бы одна сцена (с учётом изменений, которые наблюдатель ещё не успел передать)
  get busy() { this.flush(); return this._busy; },
  // карта может работать: сцен нет и игра на экране
  idle() { return !this.busy && !document.hidden; },
  // верхняя сцена (или null)
  top() { this.flush(); return this._top || null; },
  // fn(busy): true — сцена открылась (карта на паузе), false — последняя закрылась (карта снова работает)
  on(fn) { this.fns.push(fn); return fn; },

  track(el) {
    if (!el || el.nodeType !== 1 || el._stage || !el.matches(this.SEL)) return;
    el._stage = { at: performance.now(), z: 0, glass: el.matches(this.GLASS) };
    const z = parseInt(getComputedStyle(el).zIndex, 10);
    el._stage.z = Number.isFinite(z) ? z : 0;
    this.list.push(el);
    this._co.observe(el, { attributes: true, attributeFilter: ['class'] });
  },
  flush() {
    if (!this._mo) return;
    const r = this._mo.takeRecords().concat(this._co.takeRecords());
    if (r.length) this.onMut(r);
  },
  onMut(recs) {
    let hit = false;
    for (const m of recs) {
      if (m.type === 'childList') { for (const n of m.addedNodes) if (n.nodeType === 1 && n.matches(this.SEL)) { this.track(n); hit = true; } if (m.removedNodes.length) hit = true; }
      else if (m.target._stage) hit = true;
    }
    if (hit) this.sync();
  },
  live(el) { return el.isConnected && !el.classList.contains('out') && !el.classList.contains('closing'); },
  sync() {
    clearTimeout(this._t); this._t = 0;
    this.list = this.list.filter(el => el.isConnected || (el.classList.remove('stage-under', 'stage-hid'), false));
    // сверху — у кого больше z-index, при равном — открытая позже
    const act = this.list.filter(el => this.live(el)).sort((a, b) => a._stage.z - b._stage.z);
    const top = act[act.length - 1] || null, now = performance.now(), busy = !!top;
    const shown = el => now - el._stage.at >= this.COVER_MS; // проявилась целиком
    let next = Infinity;
    act.forEach(el => { if (!shown(el)) next = Math.min(next, this.COVER_MS - (now - el._stage.at)); });
    // карта не рисуется, когда хоть одна сцена проявилась; пока открыта хоть одна — так и остаётся
    // (экран сменился следующим — HUD не мелькает под ним); под стеклом видна неподвижная карта
    this._cov = busy && (this._cov || act.some(shown));
    const glass = this._cov && !act.some(el => shown(el) && !el._stage.glass);
    for (const el of this.list) {
      const under = busy && el !== top && act.includes(el);
      el.classList.toggle('stage-under', under);
      el.classList.toggle('stage-hid', under && shown(top) && !top._stage.glass);
    }
    this._top = top;
    const b = this.root.classList;
    b.toggle('stage', busy); b.toggle('stage-cover', this._cov); b.toggle('stage-glass', glass);
    if (next < Infinity) this._t = setTimeout(() => this.sync(), next + 20);
    if (busy === this._busy) return;
    this._busy = busy;
    clearTimeout(this._rt); this._rt = 0;
    if (busy) this.emit(true);
    else this._rt = setTimeout(() => { this._rt = 0; if (!this.busy) this.emit(false); }, this.RESUME_MS);
  },
  // resumed — последнее, о чём сообщили подписчикам (чтобы не будить карту дважды)
  _said: false,
  emit(busy) {
    if (this._said === busy) return;
    this._said = busy;
    for (const fn of this.fns) { try { fn(busy); } catch (e) { console.warn('Stage:', e); } }
  },
};
