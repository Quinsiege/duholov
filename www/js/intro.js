'use strict';
/* 4.28: книга-вступление — «Сказ о Перепутице» (тот же сюжет, что LORE в data.js и глава «Мир Духолова» в Книге Ордена).
   Шесть страниц: картинка из арта игры (духи, боги, Разломы, святилища, осколок; Алатырь рисуется здесь) + пара фраз.
   Листается свайпом и кнопками, страница переворачивается вокруг корешка (только transform/opacity — плавно и на слабых
   телефонах); «Меньше движения» (body.calm) — простая смена страниц, «Экономия батареи» (.eco) — без размытий и покачиваний.
   Новичку — перед знакомством (UI.onboarding, шаг имени), уже играющим — один раз после загрузки карты (Intro.later, main.js),
   когда нет других окон. Отметка «прочитано/пропущено» — на этом устройстве (Cfg.s.intro), сервер о ней не знает.
   Открыть снова — Книга Ордена → «Мир Духолова» → «Читать с начала». */

const Intro = {
  el: null, i: 0, flip: null, _n: 0,

  need() { return !(Cfg.s && Cfg.s.intro); },
  mark() { Cfg.s.intro = 1; Cfg.save(); },

  // уже играющим: один раз при запуске — когда карта загружена и не открыто ни одно окно (два раза подряд, с паузой)
  later() {
    if (!this.need() || this._later) return;
    this._later = true;
    let tries = 0, ok = 0;
    const free = () => !this.el && !UI.blocking() && !(typeof Encounter !== 'undefined' && Encounter.st)
      && !document.querySelector('.modal-wrap, .sheet-wrap, .screen, .enc, .raid, .onb, .loader, .tut-final, .fatal, .cam-screen, .lg-sheet, .atlas'); // 5.1.6: и не поверх Атласа
    const tick = () => {
      if (!this.need() || this.el) return;
      ok = free() ? ok + 1 : 0;
      if (ok >= 2) { this.open(); return; }
      if (++tries < 150) setTimeout(tick, 1500);
    };
    setTimeout(tick, 3000);
  },

  /* ---------- рисунки ---------- */
  // предмет сцены: x, y — центр в % сцены, w — ширина в %
  o(html, x, y, w, cls = '', st = '') { return `<div class="in-o ${cls}" style="left:${x}%;top:${y}%;width:${w}%;${st}">${html}</div>`; },
  sp(id, x, y, w, cls = '', rot = 0, d = 0) { return SP[id] ? this.o(Art.spirit(id), x, y, w, 'in-sp fl ' + cls, `--in-r:${rot}deg;--in-d:${d}s`) : ''; },
  chip(t, x, y) { return `<span class="in-chip" style="left:${x}%;top:${y}%">${t}</span>`; },

  // Алатырь — бел-горюч камень: whole — целый, crack — с трещиной и иглой Кощея, broken — расколот, летят осколки
  stone(kind = 'whole') {
    const id = 'ia' + (++this._n);
    const crack = '104,44 95,72 110,95 97,119 108,143 100,172';
    const body = `<path d="M28 144 C22 112 36 74 70 58 C100 44 142 46 162 72 C180 96 180 132 168 152 C156 168 128 172 98 172 C64 172 32 166 28 144Z" fill="url(#${id}b)" stroke="#8d7a5c" stroke-width="2.2"/>` +
      `<path d="M36 146 C48 164 84 168 112 166 C142 164 164 150 170 124 C156 150 120 158 86 156 C64 155 46 152 36 146Z" fill="#a8946f" opacity=".45"/>` +
      `<ellipse cx="80" cy="74" rx="30" ry="13" transform="rotate(-22 80 74)" fill="#fff" opacity=".75"/>` +
      // знак Алатыря — восьмиконечная звезда, выбитая в камне и налитая светом
      `<g fill="none" stroke-linejoin="round"><path d="M102 88 L124 110 L102 132 L80 110Z M86 94 H118 V126 H86Z" stroke="#fbbf24" stroke-width="7" opacity=".28"/>` +
      `<path d="M102 88 L124 110 L102 132 L80 110Z M86 94 H118 V126 H86Z" stroke="#d97706" stroke-width="2.6" class="in-glow"/>` +
      `<circle cx="102" cy="110" r="5" fill="#fde68a" stroke="#d97706" stroke-width="1.6"/></g>` +
      `<path d="M58 104 l6 -8 M62 120 l7 3 M142 92 l6 6 M146 124 l-6 6" stroke="#b08d57" stroke-width="2" stroke-linecap="round" opacity=".7"/>`;
    const flame = `<g class="in-flame"><path d="M70 60 C62 40 76 30 74 14 C88 30 90 44 84 60Z" fill="url(#${id}f)"/><path d="M96 50 C88 24 104 14 100 -6 C118 14 120 34 110 50Z" fill="url(#${id}f)"/>` +
      `<path d="M124 56 C118 38 130 30 128 16 C140 30 142 44 136 58Z" fill="url(#${id}f)"/></g>`;
    const defs = `<defs><radialGradient id="${id}h"><stop offset="0" stop-color="#fffbeb" stop-opacity=".95"/><stop offset=".42" stop-color="#fcd34d" stop-opacity=".45"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="${id}b" cx=".36" cy=".28" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".38" stop-color="#fbf5e6"/><stop offset=".74" stop-color="#e3d4b3"/><stop offset="1" stop-color="#b9a47e"/></radialGradient>` +
      `<linearGradient id="${id}f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fde68a" stop-opacity=".9"/><stop offset=".6" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<clipPath id="${id}l"><polygon points="0,0 104,0 ${crack} 100,200 0,200"/></clipPath><clipPath id="${id}r"><polygon points="104,0 200,0 200,200 100,200 ${crack.split(' ').reverse().join(' ')}"/></clipPath></defs>`;
    const glowR = kind === 'broken' ? 98 : 92;
    let s = `<svg class="art in-stone" viewBox="-10 -20 220 220" aria-hidden="true">${defs}` +
      `<circle class="in-pulse" cx="100" cy="104" r="${glowR}" fill="url(#${id}h)"/>` +
      `<ellipse cx="100" cy="176" rx="64" ry="9" fill="#000" opacity=".35"/>`;
    if (kind === 'whole') s += flame + body;
    if (kind === 'crack') {
      s += flame + body +
        `<polyline points="${crack}" fill="none" stroke="#f59e0b" stroke-width="9" opacity=".45" stroke-linejoin="round"/>` +
        `<polyline points="${crack}" fill="none" stroke="#fffbeb" stroke-width="3.2" stroke-linejoin="round" class="in-glow"/>` +
        `<path d="M95 72 l-16 6 M110 95 l17 -4 M97 119 l-15 8" stroke="#fde68a" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>` +
        // игла Кощея — воткнута в самое сердце камня
        `<g class="in-needle"><path d="M146 -2 L108 58" stroke="#fef3c7" stroke-width="3.2" stroke-linecap="round"/><path d="M146 -2 L108 58" stroke="#b45309" stroke-width="1" stroke-linecap="round" opacity=".6"/>` +
        `<ellipse cx="143" cy="3" rx="2.6" ry="5.4" transform="rotate(32 143 3)" fill="none" stroke="#fef3c7" stroke-width="1.8"/>` +
        `<path d="M112 44 l0 -10 M107 49 l-9 0 M117 49 l9 0 M112 54 l0 8" stroke="#fff" stroke-width="2" stroke-linecap="round" class="in-glow"/></g>`;
    }
    if (kind === 'broken') {
      s += `<ellipse cx="104" cy="106" rx="16" ry="70" fill="#fffbeb" opacity=".85" class="in-pulse"/>` +
        `<g transform="translate(-16 8) rotate(-9 100 110)"><g clip-path="url(#${id}l)">${body}</g><polyline points="${crack}" fill="none" stroke="#fde68a" stroke-width="2.4" stroke-linejoin="round"/></g>` +
        `<g transform="translate(16 4) rotate(8 100 110)"><g clip-path="url(#${id}r)">${body}</g><polyline points="${crack}" fill="none" stroke="#fde68a" stroke-width="2.4" stroke-linejoin="round"/></g>` +
        [[92, 18, 12, 20], [126, 8, 9, -30], [66, 30, 8, 40], [150, 40, 7, 10], [110, -6, 6, 60]].map(([x, y, r, a], k) =>
          `<path class="in-shard" style="--in-d:${k * 0.35}s" d="M${x} ${y - r} L${x + r * 0.8} ${y + r * 0.2} L${x + r * 0.1} ${y + r} L${x - r * 0.8} ${y + r * 0.1}Z" transform="rotate(${a} ${x} ${y})" fill="#fdf6e3" stroke="#fbbf24" stroke-width="1.4"/>`).join('');
    }
    return s + '</svg>';
  },

  // дороги между мирами: ровные к семи вратам (до Перепутицы) или спутанные в клубок (после)
  roads(tangled) {
    const M = MYTH_KEYS, c = [50, 54];
    const at = (k, r) => { const a = -Math.PI / 2 + k * 2 * Math.PI / M.length; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; };
    const f = n => +n.toFixed(1);
    let s = '<svg class="in-roads" viewBox="0 0 100 100" aria-hidden="true">';
    if (!tangled) {
      M.forEach((m, k) => {
        const col = MYTHS[m].color, [x1, y1] = at(k, 27), [x, y] = at(k, 41);
        s += `<path d="M${f(x1)} ${f(y1)} L${f(x)} ${f(y)}" stroke="#fde68a" stroke-width=".7" stroke-dasharray="1.6 1.4" opacity=".75"/>` +
          `<g transform="translate(${f(x)} ${f(y)})"><circle r="7" fill="${col}" opacity=".22"/><circle r="4.8" fill="none" stroke="${col}" stroke-width=".5" opacity=".7"/>` +
          `<path d="M-3.2 4 V-.6 A3.2 3.2 0 0 1 3.2 -.6 V4Z" fill="#150c2e" stroke="${col}" stroke-width="1.3" stroke-linejoin="round"/><path d="M-1.4 4 V.4 A1.4 1.4 0 0 1 1.4 .4 V4" fill="${col}" opacity=".7"/></g>`;
      });
    } else {
      M.forEach((m, k) => {
        const col = MYTHS[m].color, [x, y] = at(k, 38), [a1, b1] = at(k + 2.4, 30), [a2, b2] = at(k - 1.7, 16);
        s += `<path d="M${c[0]} ${c[1]} C${f(a2)} ${f(b2)} ${f(a1)} ${f(b1)} ${f(x)} ${f(y)}" fill="none" stroke="${col}" stroke-width="1" stroke-linecap="round" opacity=".75"/>`;
      });
      s += '<g fill="none" stroke="#fde68a" stroke-width=".5" opacity=".35">' + [0, 60, 120].map(a => `<ellipse cx="50" cy="54" rx="22" ry="9" transform="rotate(${a} 50 54)"/>`).join('') + '</g>';
    }
    return s + '</svg>';
  },
  sparks(n = 10) {
    let s = '';
    for (let k = 0; k < n; k++) {
      const x = (k * 37 + 11) % 96 + 2, y = (k * 53 + 7) % 90 + 4, r = 0.4 + (k % 3) * 0.3;
      s += `<circle class="in-spark" style="--in-d:${(k * 0.43) % 3}s" cx="${x}" cy="${y}" r="${r}" fill="#fde68a"/>`;
    }
    return `<svg class="in-roads" viewBox="0 0 100 100" aria-hidden="true">${s}</svg>`;
  },

  pages() {
    const gods = ['zharptica', 'gr_zeus', 'no_loki', 'ce_morrigan', 'eg_anubis', 'cn_wukong', 'az_quetzalcoatl'];
    const ring = gods.map((id, k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 7; return this.sp(id, 50 + 37 * Math.cos(a), 54 + 37 * Math.sin(a), 25, '', ((k * 47) % 30) - 15, k * 0.3); }).join('');
    return [
      { k: ru`Глава ${'I'}`, t: ru`Алатырь-камень`,
        x: ru`У каждого народа — свой мир духов: Навь, Асгард, Дуат, Миктлан… В середине всех миров лежал <b>Алатырь</b> — бел-горюч камень. Он держал врата на местах, и духи не путали дорог.`,
        art: () => this.sparks() + this.roads(false) + this.o(this.stone('whole'), 50, 54, 58, 'fl') },
      { k: ru`Глава ${'II'}`, t: ru`Игла Кощея`,
        x: ru`Однажды осенней ночью Кощей Бессмертный решил спрятать свою смерть — иглу — прямо в сердце Алатыря. Камень треснул.`,
        art: () => this.sparks(8) + this.o(this.stone('crack'), 63, 62, 70) + this.sp('koschey', 28, 30, 52, 'in-big', -6) },
      { k: ru`Глава ${'III'}`, t: ru`Перепутица`,
        x: ru`Врата распахнулись разом, дороги между мирами спутались в клубок — и духи и боги семи мифологий высыпали в наш мир. Эту ночь назвали <b>Перепутицей</b>.`,
        aside: ru`Кощей уверяет, что камень треснул сам. Локи и Сунь Укун почему-то хихикают.`,
        art: () => this.roads(true) + this.o(this.stone('broken'), 50, 54, 44) + ring },
      { k: ru`Глава ${'IV'}`, t: ru`Духи повсюду`,
        x: ru`Теперь Гиппокамп плещется в фонтанах Рима, Леший гуляет по подмосковным паркам, а Ниссе греет котов в Осло: каждый дух — у себя на родине. А город рождает и своих духов — Вайфайку, Трамвайника, Фонарника.`,
        art: () => this.sparks(6) + this.sp('gr_gippokamp', 25, 24, 46, 'in-big', -5) + this.chip(ru`Рим`, 25, 45) +
          this.sp('leshiy', 76, 23, 44, 'in-big', 5, 0.6) + this.chip(ru`Москва`, 76, 45) +
          this.sp('no_nisse', 50, 56, 42, 'in-big', 0, 1.2) + this.chip(ru`Осло`, 50, 76) +
          this.sp('vayfayka', 14, 70, 28, '', -8, 0.4) + this.sp('tramvaynik', 86, 70, 28, '', 8, 0.9) + this.sp('fonarnik', 50, 91, 24, '', 0, 1.5) },
      { k: ru`Глава ${'V'}`, t: ru`Разломы и святилища`,
        x: ru`Трещины от камня — <b>Разломы</b> — открываются в каждом городе, в них застряли осколки Алатыря. А боги ставят святилища у себя на родине: Святилища — на Руси, Храмы — в Греции, Пагоды — в Китае, Пирамиды — в Америке.`,
        art: () => this.sparks(8) + this.o(Art.riftIcon(3), 50, 36, 56) + this.o(Art.item('alatyr'), 50, 36, 17, 'fl in-shardi') +
          [['slavic', 14], ['china', 38], ['greek', 62], ['egypt', 86]].map(([m, x], k) => this.o(Art.shrineIcon(2, false, m), x, 81, 22, 'fl', `--in-d:${k * 0.5}s`)).join('') },
      { k: ru`Твоя глава`, t: ru`Ты — Ловчий Ордена Оберега`, last: true,
        x: ru`Оберег, сделанный с заботой, успокаивает любого духа — так появился Орден Оберега, союз Ловчих всех земель. Лови духов, закрывай разломы и собирай осколки Алатыря: может, их хватит, чтобы распутать дороги домой.`,
        art: () => this.sparks(12) + `<div class="in-halo"></div>` + this.o(Art.item('charm'), 50, 42, 42, 'fl') +
          this.sp('ugolek', 16, 72, 29, '', -8, 0.3) + this.sp('kapelka', 50, 84, 27, '', 0, 0.8) + this.sp('mshonok', 84, 72, 29, '', 8, 1.3) },
    ];
  },

  corner: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M3 30 V9 Q3 3 9 3 H30" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 24 V12 Q8 8 12 8 H24" fill="none" stroke="currentColor" stroke-width="1" opacity=".6"/><path d="M3 3 l5 5" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>',

  pageEl(n) {
    const p = this.P[n], N = this.P.length;
    return U.el(`<article class="in-page${p.last ? ' last' : ''}" aria-label="${n + 1} / ${N}"><div class="in-sheet">
      ${['tl', 'tr', 'bl', 'br'].map(c => `<i class="in-cn ${c}">${this.corner}</i>`).join('')}
      <div class="in-art"><div class="in-stage">${p.art()}</div></div>
      <div class="in-txt"><small class="in-k">${p.k}</small><h2${p.t.length > 16 ? ' class="long"' : ''}>${p.t}</h2><p>${p.x}</p>${p.aside ? `<p class="in-aside">${p.aside}</p>` : ''}</div>
      <span class="in-pn">${n + 1}</span><i class="in-shade"></i></div></article>`);
  },

  // opts: done — что делать после (знакомство новичка), again — открыта из Книги Ордена
  open(opts = {}) {
    if (this.el) return;
    try { Sfx.init(); } catch (e) {}
    this.opts = opts; this.P = this.pages(); this.i = 0;
    const N = this.P.length;
    const el = this.el = U.el(`<div class="intro" role="dialog" aria-modal="true" aria-label="${ru`Книга Ордена`}">
      <div class="in-top"><span class="in-lbl">${UI.I.book}${ru`Книга Ордена`}</span><button class="in-skip">${ru`Пропустить`}</button></div>
      <div class="in-book"><i class="in-edge e2"></i><i class="in-edge e1"></i></div>
      <div class="in-foot"><button class="btn-round in-prev" aria-label="${ru`Назад`}">${UI.I.back}</button>
        <div class="in-dots">${this.P.map((_, k) => `<i data-k="${k}"></i>`).join('')}</div>
        <div class="in-nextw">${UI.rune(ru`Далее`, 'in-next')}</div></div></div>`);
    this.book = el.querySelector('.in-book');
    this.cur = this.pageEl(0); this.book.appendChild(this.cur);
    document.body.appendChild(el);
    this.sync();
    el.querySelector('.in-skip').onclick = () => { Sfx.play('tap'); this.close(); };
    el.querySelector('.in-prev').onclick = () => this.go(this.i - 1);
    el.querySelector('.in-nextw').onclick = () => { if (this.i >= N - 1) { Sfx.play('success'); this.close(); } else this.go(this.i + 1); };
    el.querySelector('.in-dots').onclick = e => { const d = e.target.closest('[data-k]'); if (d) this.go(+d.dataset.k); };
    this.key = e => {
      if (e.key === 'ArrowRight') this.go(this.i + 1);
      else if (e.key === 'ArrowLeft') this.go(this.i - 1);
      else if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', this.key);
    this.swipe();
    // «Назад» телефона закрывает книгу (в игре; на экране знакомства слоёв нет)
    this.layer = () => this.close();
    if (S.d) UI.pushLayer(this.layer);
  },

  sync() {
    const N = this.P.length, last = this.i >= N - 1, el = this.el;
    el.querySelectorAll('.in-dots i').forEach((d, k) => d.classList.toggle('on', k === this.i));
    el.querySelector('.in-prev').disabled = this.i === 0;
    const t = el.querySelector('.in-nextw .rn-t');
    t.textContent = last ? (this.opts.again ? ru`Закрыть книгу` : ru`В путь!`) : ru`Далее`;
    el.querySelector('.in-nextw').classList.toggle('sm', t.textContent.length > 10); // длинная надпись — мельче, в одну строку
    el.classList.toggle('at-last', last);
  },

  calm() { return document.body.classList.contains('calm'); },
  // угол страницы: 0 — лежит, −100 — перевёрнута налево (к корешку)
  setA(p, a, anim) {
    const sh = p.querySelector('.in-shade');
    p.style.transition = anim ? '' : 'none';
    p.style.transform = `rotateY(${a}deg)`;
    if (sh) { sh.style.transition = anim ? '' : 'none'; sh.style.opacity = Math.min(0.6, -a / 130).toFixed(3); }
  },
  // начать переворот: dir 1 — вперёд (текущая уходит влево, под ней — следующая), −1 — назад (предыдущая ложится сверху)
  begin(dir) {
    const n = this.i + dir;
    if (this.flip || !this.P || n < 0 || n >= this.P.length) return null;
    const np = this.pageEl(n);
    if (dir > 0) { this.book.insertBefore(np, this.cur); this.flip = { dir, n, top: this.cur, under: np, neu: np }; }
    else { this.setA(np, -100); this.book.appendChild(np); this.flip = { dir, n, top: np, under: this.cur, neu: np }; }
    this.flip.top.classList.add('turning');
    void this.flip.top.offsetWidth; // стиль «до» посчитан — переход пойдёт от него
    return this.flip;
  },
  // закончить: done — страница перевернулась, иначе — вернулась на место
  end(done) {
    const f = this.flip; if (!f) return;
    const target = f.dir > 0 ? (done ? -100 : 0) : (done ? 0 : -100);
    const gone = done ? (f.neu === f.top ? f.under : f.top) : f.neu, stay = gone === f.top ? f.under : f.top;
    const fin = () => {
      if (f.fin) return; f.fin = true;
      gone.remove();
      stay.classList.remove('turning'); stay.style.transform = ''; stay.style.transition = ''; stay.style.opacity = '';
      const sh = stay.querySelector('.in-shade'); if (sh) { sh.style.opacity = ''; sh.style.transition = ''; }
      if (this.flip === f) this.flip = null;
    };
    if (done) { this.cur = stay; this.i = f.n; this.sync(); }
    if (this.calm()) { // «Меньше движения»: без переворота — новая страница просто проявляется
      this.setA(f.top, target); fin();
      if (done) stay.classList.add('in-fade');
      return;
    }
    requestAnimationFrame(() => this.setA(f.top, target, true));
    f.top.addEventListener('transitionend', ev => { if (ev.target === f.top) fin(); });
    setTimeout(fin, 700);
  },
  go(n) {
    if (!this.el || this.flip || n === this.i || n < 0 || n >= this.P.length) return;
    Sfx.play('page');
    if (Math.abs(n - this.i) > 1) { // точка далеко — без листания всех страниц
      const np = this.pageEl(n); this.cur.replaceWith(np); this.cur = np; this.i = n; this.sync();
      np.classList.add('in-fade'); return;
    }
    if (this.begin(n > this.i ? 1 : -1)) this.end(true);
  },

  // свайп: страница идёт за пальцем, отпустил дальше трети (или быстро) — перевернётся
  swipe() {
    const b = this.book;
    let st = null;
    b.addEventListener('pointerdown', e => {
      if (this.flip || e.button > 0) return;
      st = { x: e.clientX, y: e.clientY, t: Date.now(), on: false, id: e.pointerId };
    });
    b.addEventListener('pointermove', e => {
      if (!st || e.pointerId !== st.id) return;
      const dx = e.clientX - st.x, dy = e.clientY - st.y, w = b.clientWidth || 360;
      if (!st.on) {
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) { if (Math.abs(dy) > 14) st = null; return; }
        if (!this.begin(dx < 0 ? 1 : -1)) { st = null; return; }
        st.on = true; st.dir = this.flip.dir;
        try { b.setPointerCapture(e.pointerId); } catch (x) {}
      }
      if (this.calm() || !this.flip) return; // без движения за пальцем — решится, когда отпустит
      const k = Math.max(0, Math.min(1, (st.dir > 0 ? -dx : dx) / (w * 0.9)));
      this.setA(this.flip.top, st.dir > 0 ? -100 * k : -100 + 100 * k);
    });
    const up = (e, cancel) => {
      if (!st || e.pointerId !== st.id) return;
      const s = st; st = null;
      if (!s.on || !this.flip) return;
      const dx = e.clientX - s.x, w = b.clientWidth || 360, v = Math.abs(dx) / Math.max(1, Date.now() - s.t);
      const done = !cancel && ((s.dir > 0 ? -dx : dx) > w * 0.3 || (v > 0.5 && (s.dir > 0 ? dx < 0 : dx > 0)));
      if (done) Sfx.play('page');
      this.end(done);
    };
    b.addEventListener('pointerup', e => up(e));
    b.addEventListener('pointercancel', e => up(e, true));
  },

  close() {
    const el = this.el; if (!el) return;
    this.mark();
    this.el = null; this.flip = null;
    document.removeEventListener('keydown', this.key);
    if (this.layer) { UI.popLayer(this.layer); this.layer = null; }
    el.classList.add('out');
    setTimeout(() => el.remove(), this.calm() ? 0 : 320);
    const done = this.opts && this.opts.done;
    this.opts = null;
    if (done) done();
  },
};
