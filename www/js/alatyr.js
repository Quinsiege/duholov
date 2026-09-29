'use strict';
/* 4.28: общий Алатырь — все Ловчие вместе собирают бел-горюч камень. Каждый найденный осколок идёт в общий счёт Ордена
   (у Ловчего он остаётся). Камень — семь граней, по одной на дорогу-мифологию (Rules.ALATYR_WORLD): собрана грань — дорога
   в её мир распутана, трое суток её духи встречаются чаще (Ev.mythMul). Считает сервер (core.js, serve.js), здесь — показ:
   экран камня, значок на карте и объявление. Дороги телефон получает от сервера событием roads (при входе и когда
   набор дорог изменился), счёт и историю — действием alatyr, когда открыт экран. */

const Alatyr = {
  info: null,   // последний ответ сервера: { total, roads, mine, now }
  _t: 0, _uid: 0,
  SEEN: 'duholov.alatyr.seen', // номер последней грани, о дороге которой игрок уже знает (объявление — один раз)

  // куда ведёт дорога каждой мифологии (сюжет — LORE)
  world(m) { return { slavic: ru`Навь`, greek: ru`Царство Аида`, norse: ru`Асгард`, celtic: ru`Холмы сидов`, egypt: ru`Дуат`, china: ru`Небеса`, aztec: ru`Миктлан` }[m] || m; },
  roadName(m) { return { slavic: ru`Дорога в Навь`, greek: ru`Дорога в царство Аида`, norse: ru`Дорога в Асгард`, celtic: ru`Дорога к холмам сидов`, egypt: ru`Дорога в Дуат`, china: ru`Дорога на Небеса`, aztec: ru`Дорога в Миктлан` }[m] || m; },
  // сколько осталось: часы и дни — как везде, меньше часа — минутами
  left(ms) { return ms >= 3600000 ? U.fmtTime(ms) : ru`${Math.max(1, Math.ceil(ms / 60000))} мин`; },
  color(m) { return (MYTHS[m] || {}).color || '#fde68a'; },

  seen() { try { return +(localStorage.getItem(this.SEEN) || -1); } catch (e) { return -1; } },
  setSeen(n) { try { localStorage.setItem(this.SEEN, String(n)); } catch (e) { /* без хранилища — объявление может повториться */ } },

  // дороги от сервера (событие roads или ответ действия alatyr)
  setRoads(list) {
    Ev.roads = Ev.roadsClean(list);
    if (this._ui) this.tick(); // до открытия карты (ответ на вход) — только дороги, значок и объявление — потом
  },
  // раз в минуту (UI.refreshEvent) и когда пришли дороги: значок на карте и объявление
  tick() {
    if (typeof UI === 'undefined' || !U.$('#holChip')) return;
    this._ui = true;
    this.chip();
    this.announce();
  },
  async refresh(force) {
    if (!S.d || (!force && this.info && Date.now() - this._t < 60000)) return this.info;
    this._t = Date.now();
    try {
      this.info = await Game.act('alatyr');
      if (this.info) this.setRoads(this.info.roads);
    } catch (e) { /* без связи — покажем прошлое */ }
    return this.info;
  },

  /* ---------- значок на карте ---------- */
  chip() {
    let c = U.$('#roadChip');
    if (!c) {
      c = U.el('<div id="roadChip" class="chip event road hidden" role="button"></div>');
      U.$('#holChip').after(c);
      c.onclick = () => { Sfx.play('tap'); this.screen(); };
    }
    const now = U.now(), live = Ev.roadsNow(now), soon = (Ev.roads || []).filter(r => r.from > now);
    const r = live[live.length - 1] || soon[0];
    c.classList.toggle('hidden', !r);
    if (!r) return c;
    c.classList.toggle('soon', !live.length);
    c.style.setProperty('--road', this.color(r.road));
    const more = live.length > 1 ? ` +${live.length - 1}` : '';
    c.innerHTML = `${this.gem(r.road, 16)}<span>${live.length ? `${this.world(r.road)} ×${Rules.ALATYR_WORLD.MUL}${more}` : ru`${this.world(r.road)} · скоро`}</span>`;
    c.setAttribute('aria-label', live.length ? ru`${this.roadName(r.road)} распутана` : ru`${this.roadName(r.road)} скоро распутается`);
    return c;
  },
  // маленький гранёный камешек цвета мифологии (значок, строки списков)
  gem(m, size = 18) {
    const c = this.color(m);
    return `<svg class="ala-gem" viewBox="0 0 20 20" width="${size}" height="${size}" aria-hidden="true"><path d="M10 1.5L17.5 6.5L16 14.5L10 18.5L4 14.5L2.5 6.5Z" fill="${c}" stroke="#fff7d6" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M10 1.5L10 18.5M2.5 6.5L17.5 6.5" stroke="rgba(255,255,255,.55)" stroke-width=".9"/><path d="M6.5 5L9 3.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".8"/></svg>`;
  },

  /* ---------- объявление: дорога распутана (один раз на грань) ---------- */
  announce() {
    if (!S.d || S.d.tut) return;
    const now = U.now(), seen = this.seen(), roads = Ev.roads || [];
    const fresh = roads.filter(r => r.n > seen && r.from <= now && r.to > now);
    // закончившиеся без игрока — объявлять уже поздно
    const gone = roads.filter(r => r.n > seen && r.to <= now).reduce((a, r) => Math.max(a, r.n), seen);
    if (!fresh.length) { if (gone > seen) this.setSeen(gone); return; }
    if (typeof Order !== 'undefined' && Order.busy()) return; // игрок занят — покажем, когда вернётся к карте (tick раз в минуту)
    const r = fresh.reduce((a, x) => (x.n > a.n ? x : a));
    this.setSeen(Math.max(gone, ...fresh.map(x => x.n)));
    Sfx.play('levelup'); U.vibrate([40, 40, 90]);
    const st = { face: r.n % Rules.ALATYR_WORLD.ORDER.length + 1, pct: 0 }; // камень витка этой грани: она и все до неё собраны
    UI.modal({
      title: ru`${this.roadName(r.road)} распутана!`, cls: 'ala-modal',
      html: `<div class="ala-mstone">${this.stone(st, 150, r.n % Rules.ALATYR_WORLD.ORDER.length)}</div>
        <p>${ru`Ловчие Ордена вместе собрали грань Алатыря-камня — дорога в мир «${this.world(r.road)}» больше не путается.`}</p>
        <div class="ala-ev" style="--road:${this.color(r.road)}">${this.gem(r.road, 26)}<div><b>${MYTHS[r.road].name}</b>
          <small>${ru`Духи этой мифологии встречаются в ${Rules.ALATYR_WORLD.MUL} раза чаще — ещё ${this.left(r.to - now)}.`}</small></div></div>`,
      buttons: [{ label: ru`Алатырь`, fn: () => this.screen() }, { label: ru`Ура!`, cls: 'primary' }],
    });
  },

  /* ---------- камень: семь граней вокруг «стола», собранные светятся цветом своей мифологии ----------
     st — Rules.alatyrStage (грани витка до st.face собраны, st.face собирается), size — px, hi — подсветить грань */
  stone(st, size = 260, hi = -1) {
    const id = 'ala' + (++this._uid), O = Rules.ALATYR_WORLD.ORDER, K = O.length;
    const P = (r, a) => [+(r * Math.cos(a)).toFixed(1), +(r * Math.sin(a)).toFixed(1)];
    const ang = k => (-90 + (k - 0.5) * 360 / K) * Math.PI / 180; // грань k — сверху по часовой, её середина на 12 часах для k = 0
    const outer = [...Array(K)].map((_, k) => P(104 + (U.h('alaR', k) - 0.5) * 12, ang(k)));
    const inner = [...Array(K)].map((_, k) => P(40 + (U.h('alaI', k) - 0.5) * 5, ang(k) + 0.06));
    const pts = a => a.map(p => p.join(',')).join(' ');
    const lerp = (a, b, t) => [+(a[0] + (b[0] - a[0]) * t).toFixed(1), +(a[1] + (b[1] - a[1]) * t).toFixed(1)];
    const done = Math.min(K, st.face), p = U.clamp(st.pct || 0, 0, 1);
    let faces = '', glow = '', cracks = '', seams = '', dots = '';
    for (let k = 0; k < K; k++) {
      const m = O[k], c = this.color(m), k1 = (k + 1) % K, quad = [inner[k], outer[k], outer[k1], inner[k1]];
      const mid = (ang(k) + ang(k + 1)) / 2, light = 0.5 + 0.5 * Math.cos(mid + 2.2); // свет сверху слева
      faces += `<polygon points="${pts(quad)}" fill="url(#${id}s)" style="filter:brightness(${(0.8 + light * 0.32).toFixed(2)})"/>`;
      if (k < done) {
        glow += `<polygon class="ala-lit${k === hi ? ' hi' : ''}" points="${pts(quad)}" fill="${c}" fill-opacity=".78" stroke="${c}" stroke-width="2" filter="url(#${id}g)"/>`;
        glow += `<polygon points="${pts([inner[k], lerp(inner[k], outer[k], .55), lerp(inner[k1], outer[k1], .55)])}" fill="#fff" fill-opacity=".22"/>`;
      } else if (k === done && p > 0) {
        const q = 0.12 + 0.88 * p;
        glow += `<polygon class="ala-part" points="${pts([inner[k], lerp(inner[k], outer[k], q), lerp(inner[k1], outer[k1], q), inner[k1]])}" fill="${c}" fill-opacity=".55" stroke="${c}" stroke-width="1.5"/>`;
      }
      if (k >= done) { // трещины: ломаная от стола к краю
        const a = lerp(inner[k], inner[k1], 0.3 + U.h('alaC', k) * 0.4), b = lerp(outer[k], outer[k1], 0.2 + U.h('alaD', k) * 0.6);
        const j1 = lerp(a, b, 0.38), j2 = lerp(a, b, 0.7), off = (U.h('alaE', k) - 0.5) * 16;
        cracks += `<path d="M${a} L${j1[0] + off},${j1[1] - off / 2} L${j2[0] - off / 2},${j2[1] + off / 2} L${b}" />`;
        if (U.h('alaF', k) > 0.4) { const s = lerp(a, b, 0.5); cracks += `<path d="M${s[0] + off},${s[1] - off / 2} l${(off * 0.9).toFixed(1)},${(9 - off / 3).toFixed(1)}" />`; }
      }
      seams += `<path d="M${inner[k]} L${outer[k]}" class="${k > 0 && k < done ? 'gold' : ''}"/>`;
      const d = P(122, mid);
      dots += `<circle cx="${d[0]}" cy="${d[1]}" r="${k < done ? 5.5 : 4}" fill="${k < done ? c : 'rgba(255,255,255,.18)'}" stroke="${c}" stroke-width="1.5"/>`;
    }
    const aura = 0.25 + 0.6 * (done + p) / K;
    return `<svg class="ala-stone" viewBox="-135 -135 270 270" width="${size}" height="${size}" role="img" aria-label="${ru`Алатырь-камень: собрано граней ${done} из ${K}`}">
      <defs>
        <radialGradient id="${id}a"><stop offset=".35" stop-color="#fde68a" stop-opacity="${aura.toFixed(2)}"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>
        <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#eee7d6"/><stop offset="1" stop-color="#b3a484"/></linearGradient>
        <radialGradient id="${id}t" cx=".4" cy=".35"><stop offset="0" stop-color="#fffdf5"/><stop offset="1" stop-color="#d8ccb0"/></radialGradient>
        <filter id="${id}g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle class="ala-aura" r="132" fill="url(#${id}a)"/>
      <polygon points="${pts(outer)}" fill="#3b2a12" transform="translate(3 6)" opacity=".45"/>
      ${faces}${glow}
      <g class="ala-seams" fill="none" stroke="#5b4a2a" stroke-width="1.6" stroke-linecap="round">${seams}</g>
      <g class="ala-cracks" fill="none" stroke="#3b2a12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".75">${cracks}</g>
      <polygon points="${pts(outer)}" fill="none" stroke="#5b4a2a" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="${pts(inner)}" fill="url(#${id}t)" stroke="#5b4a2a" stroke-width="2.2" stroke-linejoin="round"/>
      <g class="ala-rune" fill="none" stroke="#b45309" stroke-width="2.6" stroke-linejoin="round" opacity="${(0.4 + 0.6 * done / K).toFixed(2)}"><rect x="-14" y="-14" width="28" height="28"/><rect x="-14" y="-14" width="28" height="28" transform="rotate(45)"/><circle r="4.5" fill="#b45309" stroke="none"/></g>
      ${dots}
    </svg>`;
  },

  /* ---------- экран «Алатырь» ---------- */
  screen() {
    Sfx.init(); Sfx.play('tap');
    const scr = UI.screen(ru`Алатырь-камень`, '<div class="ala"></div>', 'ala-screen');
    const box = scr.querySelector('.ala');
    this.render(box);
    this.refresh(true).then(() => { if (box.isConnected) this.render(box); });
    // пока экран открыт — таймеры дорог идут
    const t = setInterval(() => { if (!box.isConnected) { clearInterval(t); return; } const l = box.querySelectorAll('[data-left]'); l.forEach(x => { x.textContent = this.left(+x.dataset.left - U.now()); }); }, 30000);
    return scr;
  },
  render(box) {
    const I = this.info, A = Rules.ALATYR_WORLD, K = A.ORDER.length, now = U.now();
    if (!I) {
      box.innerHTML = `<div class="ala-hero">${this.stone(Rules.alatyrStage(0), 240)}</div><div class="empty">${ru`Узнаём, сколько камня собрал Орден…`}</div>` + this.note();
      return;
    }
    const st = Rules.alatyrStage(I.total), roads = Ev.roadsClean(I.roads).sort((a, b) => b.n - a.n);
    const left = x => `<span data-left="${x}">${this.left(x - now)}</span>`;
    const live = roads.filter(r => r.from <= now && r.to > now), soon = roads.filter(r => r.from > now);
    const evs = live.map(r => `<div class="ala-ev on" style="--road:${this.color(r.road)}">${this.gem(r.road, 26)}<div><b>${ru`${this.roadName(r.road)} распутана`}</b>
        <small>${ru`Духи мифологии «${MYTHS[r.road].name}» встречаются в ${A.MUL} раза чаще. Осталось ${left(r.to)}`}</small></div></div>`).join('')
      + soon.map(r => `<div class="ala-ev" style="--road:${this.color(r.road)}">${this.gem(r.road, 26)}<div><b>${ru`${this.roadName(r.road)} распутывается`}</b>
        <small>${ru`Грань собрана! Духи мифологии «${MYTHS[r.road].name}» станут встречаться чаще через ${left(r.from)}`}</small></div></div>`).join('');
    const faces = A.ORDER.map((m, k) => {
      const n = st.ring * K + k, done = k < st.face, cur = k === st.face;
      const side = done ? `<span class="q-ok" aria-label="${ru`Собрана`}">✓</span>` : cur ? `<i>${U.fmtNum(st.have)} / ${U.fmtNum(st.need)}</i>` : `<i class="dim">${U.fmtNum(Rules.alatyrGoal(n))}</i>`;
      return `<div class="ala-face ${done ? 'done' : cur ? 'cur' : ''}" style="--road:${this.color(m)}">${this.gem(m, 22)}<div class="af-main"><b>${MYTHS[m].name}</b><small>${this.roadName(m)}</small>
        ${cur ? `<div class="pbar"><i style="width:${(st.pct * 100).toFixed(1)}%"></i></div>` : ''}</div>${side}</div>`;
    }).join('');
    const hist = roads.filter(r => r.to <= now).slice(0, 12).map(r => `<div class="ala-h" style="--road:${this.color(r.road)}">${this.gem(r.road, 18)}
        <span>${this.roadName(r.road)}</span><small>${ru`виток ${Math.floor(r.n / K) + 1}`} · ${new Date(r.from).toLocaleDateString(I18N.locale, { day: 'numeric', month: 'short' })}</small></div>`).join('');
    box.innerHTML = `
      <div class="ala-hero">${this.stone(st, 250)}
        <div class="ala-total"><b>${U.fmtNum(st.total)}</b><small>${ru`осколков собрал Орден`}</small></div></div>
      <div class="story-card ala-card" style="--road:${this.color(st.road)}">
        <div class="story-num">${ru`Виток ${st.ring + 1} · грань ${st.face + 1} из ${K}`}</div>
        <h3>${this.roadName(st.road)}</h3>
        <div class="pbar big"><i style="width:${(st.pct * 100).toFixed(1)}%"></i></div>
        <p class="o-me">${ru`Собрано ${U.fmtNum(st.have)} из ${U.fmtNum(st.need)} — до вехи ${U.fmtNum(st.need - st.have)}`}</p>
      </div>
      <div class="ala-mine">${Art.item('alatyr')}<div><b>${ru`Твой вклад: ${U.fmtNum(I.mine || 0)}`}</b><small>${ru`Столько осколков ты принёс Ордену. Они остаются у тебя — для пробуждения духов.`}</small></div></div>
      ${evs ? `<h3 class="prof-h">${ru`Распутанные дороги`}</h3>${evs}` : ''}
      <h3 class="prof-h">${ru`Грани витка`}</h3><div class="ala-faces">${faces}</div>
      ${hist ? `<h3 class="prof-h">${ru`Летопись дорог`}</h3><div class="ala-hist">${hist}</div>` : ''}
      ${this.note()}`;
  },
  note() {
    const A = Rules.ALATYR_WORLD;
    return `<div class="q-note">${ru`Каждый осколок Алатыря, найденный любым Ловчим, — в разломах и у хранителей-старейшин Капищ, — ложится в общий камень Ордена. Собрана грань — дорога в её мир распутана: ${A.HOURS / 24} дня духи этой мифологии встречаются в ${A.MUL} раза чаще, у всех Ловчих разом. Семь граней — виток; следующий виток дороже. Может, однажды осколков хватит, чтобы распутать дороги домой.`}</div>`;
  },
};

// дороги от сервера: при входе и когда набор дорог изменился (core.js, alatyrSync) — ещё до того, как открылась карта
Bus.on('roads', list => Alatyr.setRoads(list));
