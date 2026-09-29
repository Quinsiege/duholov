'use strict';
/* 4.28: общий Алатырь — все Ловчие вместе собирают бел-горюч камень. Каждый найденный осколок идёт в общий счёт Ордена
   (у Ловчего он остаётся). Камень сезона s — 6 + s граней, по одной на дорогу-мифологию (Rules.ALATYR_WORLD): собрана грань —
   дорога в её мир распутана, трое суток её духи встречаются чаще (Ev.mythMul). Собраны все — финал: во всех Разломах Кощей;
   потом он раскалывает камень, и начинается следующий сезон с новой мифологией (грань «?»). Считает сервер (core.js, serve.js),
   здесь — показ: экран камня, значок на карте, объявления (дорога, финал, раскол) и итоги сезона. Дороги и сезон телефон
   получает от сервера событиями roads и ala (при входе и когда они изменились), счёт и историю — действием alatyr. */

const Alatyr = {
  info: null,   // последний ответ сервера: { total, roads, mine, now, season, seasons, my }
  _t: 0, _uid: 0,
  tab: 'stone', TABS: ['stone', 'faces', 'mine', 'hist'],
  SEEN: 'duholov.alatyr.seen',      // номер последней грани, о дороге которой игрок уже знает (объявление — один раз)
  SEEN_FIN: 'duholov.alatyr.fin',   // сезон, о финале которого игрок знает
  SEEN_BRK: 'duholov.alatyr.brk',   // сезон, о начале (расколе) которого игрок знает
  SEEN_SUM: 'duholov.alatyr.sum',   // сезон, итоги которого игрок видел
  KEEP: 'duholov.alatyr.ala',       // последний известный сезон — чтобы до ответа сервера духи отбирались как надо

  // куда ведёт дорога каждой мифологии (сюжет — LORE); у мифологий новых сезонов — из их файла (MYTH_META: world, road)
  world(m) { return { slavic: ru`Навь`, greek: ru`Царство Аида`, norse: ru`Асгард`, celtic: ru`Холмы сидов`, egypt: ru`Дуат`, china: ru`Небеса`, aztec: ru`Миктлан` }[m] || (MYTHS[m] && MYTHS[m].world) || (MYTHS[m] ? MYTHS[m].name : '?'); },
  roadName(m) {
    const r = { slavic: ru`Дорога в Навь`, greek: ru`Дорога в царство Аида`, norse: ru`Дорога в Асгард`, celtic: ru`Дорога к холмам сидов`, egypt: ru`Дорога в Дуат`, china: ru`Дорога на Небеса`, aztec: ru`Дорога в Миктлан` }[m];
    return r || (MYTHS[m] && MYTHS[m].road) || (MYTHS[m] ? ru`Дорога в мир «${MYTHS[m].name}»` : ru`Грань «?»`);
  },
  mythName(m) { return m && MYTHS[m] ? MYTHS[m].name : '?'; },
  // сколько осталось: часы и дни — как везде, меньше часа — минутами
  left(ms) { return ms >= 3600000 ? U.fmtTime(ms) : ru`${Math.max(1, Math.ceil(ms / 60000))} мин`; },
  color(m) { return m ? (MYTHS[m] || {}).color || '#fde68a' : '#94a3b8'; },
  KOS: '#4ade80', // цвет Кощея (огонь Нави)

  seen(k = this.SEEN) { try { const v = localStorage.getItem(k); return v == null ? -1 : +v; } catch (e) { return -1; } },
  setSeen(n, k = this.SEEN) { try { localStorage.setItem(k, String(n)); } catch (e) { /* без хранилища — объявление может повториться */ } },

  // дороги от сервера (событие roads или ответ действия alatyr)
  setRoads(list) {
    Ev.roads = Ev.roadsClean(list);
    if (this._ui) this.tick(); // до открытия карты (ответ на вход) — только дороги, значок и объявление — потом
  },
  // сезон от сервера (событие ala или ответ действия alatyr): запомнить и открыть мифологии сезона
  setAla(x) {
    Ev.ala = Ev.alaClean(x);
    try { localStorage.setItem(this.KEEP, JSON.stringify(Ev.ala)); } catch (e) { /* без хранилища — до ответа сервера первый сезон */ }
    Ev.alaSync();
    if (this._ui) this.tick();
  },
  restore() {
    try { const x = JSON.parse(localStorage.getItem(this.KEEP) || 'null'); if (x) Ev.ala = Ev.alaClean(x); } catch (e) { /* нет — первый сезон */ }
    Ev.alaSync();
  },
  // раз в минуту (UI.refreshEvent) и когда пришли дороги или сезон: значок на карте и объявления
  tick() {
    if (typeof UI === 'undefined' || !U.$('#holChip')) return;
    this._ui = true;
    Ev.alaSync();
    this.chip();
    this.announce();
    // финал: победы над Кощеем на значке — не реже раза в 5 минут (событие ala их не несёт)
    if (Ev.finale() && typeof Game !== 'undefined' && Game.on && Game.on() && Date.now() - this._t > 5 * 60000) this.refresh(true).then(() => this.chip());
  },
  async refresh(force) {
    if (!S.d || (!force && this.info && Date.now() - this._t < 60000)) return this.info;
    this._t = Date.now();
    try {
      this.info = await Game.act('alatyr');
      if (this.info) { this.setRoads(this.info.roads); if (this.info.season) this.setAla(this.info.season); }
    } catch (e) { /* без связи — покажем прошлое */ }
    return this.info;
  },
  // 5.1.6: бейдж пункта меню «Алатырь»: идёт финал с Кощеем, не показаны итоги сезона или распутанная дорога
  badge() {
    const now = U.now(), sm = S.d && S.d.alaSum, seen = this.seen();
    if (Ev.finale(now) || (sm && sm.s >= 1 && this.seen(this.SEEN_SUM) < sm.s)) return '!';
    return (Ev.roads || []).some(r => r.n > seen && r.from <= now && r.to > now) ? '!' : '';
  },
  // награды сезонов (season-rewards.js) — если файл подключён
  rewards() { return typeof SeasonRewards !== 'undefined' && SeasonRewards ? SeasonRewards : null; },
  // камень текущего сезона (счёт — из последнего ответа сервера)
  stage() { return Ev.alaStage(this.info ? this.info.total : Ev.ala.start, U.now()); },

  /* ---------- значок на карте: финал (Кощей) важнее дорог ---------- */
  chip() {
    let c = U.$('#roadChip');
    if (!c) {
      c = U.el('<div id="roadChip" class="chip event road hidden" role="button"></div>');
      U.$('#holChip').after(c);
      c.onclick = () => { Sfx.play('tap'); this.screen(); };
    }
    const now = U.now(), f = Ev.ala.fin, end = Ev.alaEnd();
    if (f && now < end && now >= f.from - 2 * 3600000) { // финал идёт или вот-вот
      const on = now >= f.from;
      c.classList.remove('hidden'); c.classList.add('kos'); c.classList.toggle('soon', !on);
      c.style.setProperty('--road', this.KOS);
      c.innerHTML = `${Art.img('koschey')}<span>${!on ? ru`Кощей · скоро` : Ev.ala.brk ? ru`Раскол через ${this.left(end - now)}` : ru`Кощей · ${U.fmtNum(f.kills)}/${U.fmtNum(f.goal)}`}</span>`;
      c.setAttribute('aria-label', on ? ru`Финал сезона: во всех Разломах Кощей` : ru`Скоро финал сезона: Кощей идёт за камнем`);
      return c;
    }
    c.classList.remove('kos');
    const live = Ev.roadsNow(now), soon = (Ev.roads || []).filter(r => r.from > now);
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
  // маленький гранёный камешек цвета мифологии (значок, строки списков); без мифологии — серый со знаком вопроса
  gem(m, size = 18) {
    const c = this.color(m);
    return `<svg class="ala-gem" viewBox="0 0 20 20" width="${size}" height="${size}" aria-hidden="true"><path d="M10 1.5L17.5 6.5L16 14.5L10 18.5L4 14.5L2.5 6.5Z" fill="${c}" stroke="#fff7d6" stroke-width="1.2" stroke-linejoin="round"/>
      ${m ? `<path d="M10 1.5L10 18.5M2.5 6.5L17.5 6.5" stroke="rgba(255,255,255,.55)" stroke-width=".9"/><path d="M6.5 5L9 3.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".8"/>`
        : '<text x="10" y="14.2" text-anchor="middle" font-size="11" font-weight="900" fill="#1e1b2e" font-family="system-ui,sans-serif">?</text>'}</svg>`;
  },

  /* ---------- объявления: итоги сезона, раскол (новый сезон), финал, дорога — по одному за раз ---------- */
  announce() {
    if (!S.d || S.d.tut) return;
    if (typeof Order !== 'undefined' && Order.busy()) return; // игрок занят — покажем, когда вернётся к карте (tick раз в минуту)
    if (U.$('.modal-wrap')) return; // одно окно за раз
    // 4.28: и объявление «Дружины стали кланами» (clans.js) — после итогов и раскола
    this.sumShow() || this.brkShow() || (typeof Clans !== 'undefined' && Clans.moveShow()) || this.finShow() || this.roadShow();
  },
  roadShow() {
    const now = U.now(), seen = this.seen(), roads = Ev.roads || [];
    const fresh = roads.filter(r => r.n > seen && r.from <= now && r.to > now);
    // закончившиеся без игрока — объявлять уже поздно
    const gone = roads.filter(r => r.n > seen && r.to <= now).reduce((a, r) => Math.max(a, r.n), seen);
    if (!fresh.length) { if (gone > seen) this.setSeen(gone); return false; }
    const r = fresh.reduce((a, x) => (x.n > a.n ? x : a));
    this.setSeen(Math.max(gone, ...fresh.map(x => x.n)));
    Sfx.play('levelup'); U.vibrate([40, 40, 90]);
    const f = Rules.alaFace(r.n), st = Rules.alaStage(f.s, 0); // камень сезона этой грани: она и все до неё собраны
    Object.assign(st, { n: f.k + 1, pct: 0, done: f.k + 1 >= st.K });
    UI.modal({
      title: ru`${this.roadName(r.road)} распутана!`, cls: 'ala-modal',
      html: `<div class="ala-mstone">${this.stone(st, 150, f.k)}</div>
        <p>${ru`Ловчие Ордена вместе собрали грань Алатыря-камня — дорога в мир «${this.world(r.road)}» больше не путается.`}</p>
        <div class="ala-ev" style="--road:${this.color(r.road)}">${this.gem(r.road, 26)}<div><b>${this.mythName(r.road)}</b>
          <small>${ru`Духи этой мифологии встречаются в ${Rules.ALATYR_WORLD.MUL} раза чаще — ещё ${this.left(r.to - now)}.`}</small></div></div>`,
      buttons: [{ label: ru`Алатырь`, fn: () => this.screen() }, { label: ru`Ура!`, cls: 'primary' }],
    });
    return true;
  },
  // финал сезона начался: во всех Разломах Кощей
  finShow() {
    const now = U.now(), f = Ev.finale(now), s = Ev.ala.s;
    if (!f || this.seen(this.SEEN_FIN) >= s) return false;
    this.setSeen(s, this.SEEN_FIN);
    Sfx.play('levelup'); U.vibrate([60, 40, 60, 40, 120]);
    UI.modal({
      title: ru`Кощей пришёл за камнем!`, cls: 'ala-modal ala-kos-modal',
      html: `<div class="ala-kos-art">${Art.img('koschey')}</div>
        <p>${ru`Орден собрал все грани Алатыря — и Кощей тут как тут. Теперь во всех Разломах мира — он сам.`}</p>
        <p>${ru`Одолейте его всем Орденом ${U.fmtNum(f.goal)} раз — и он в ярости расколет камень раньше срока. Не одолеете — расколет всё равно через ${this.left(Ev.alaEnd() - now)}. Из трещины выйдет новая мифология.`}</p>
        <div class="ala-ev on" style="--road:${this.KOS}"><span class="ala-ev-ic">${Art.item('alatyr')}</span><div><b>${ru`Каждая победа — в твой вклад`}</b>
          <small>${ru`Победа над Кощеем идёт во вклад сезона как ${Rules.ALATYR_WORLD.FINALE.KILL} осколка.`}</small></div></div>`,
      buttons: [{ label: ru`Алатырь`, fn: () => this.screen() }, { label: ru`В бой!`, cls: 'primary' }],
    });
    return true;
  },
  // Кощей расколол камень: новый сезон и новая мифология (её файла ещё нет — «?» остаётся «?»)
  brkShow() {
    const now = U.now(), s = Ev.alaSeason(now), seen = this.seen(this.SEEN_BRK);
    if (s <= seen) return false;
    const at = s === Ev.ala.s ? Ev.ala.from : Ev.alaEnd();
    if (s < 2 || !at || now - at > 3 * 86400000) { this.setSeen(s, this.SEEN_BRK); return false; } // давно — поздно объявлять
    this.setSeen(s, this.SEEN_BRK);
    Sfx.play('levelup'); U.vibrate([90, 50, 90, 50, 200]);
    const m = mythOfSeason(s), st = Rules.alaStage(s, 0);
    const kids = m ? SPECIES_ALL.filter(x => x.myth === m && x.stage === 1 && !x.legend).slice(0, 3) : [];
    UI.modal({
      title: ru`Кощей расколол Алатырь!`, cls: 'ala-modal ala-brk-modal',
      html: `<div class="ala-mstone">${this.stone(st, 150, -1, true)}</div>
        ${m ? `<div class="ala-brk-new" style="--road:${this.color(m)}"><span class="ala-brk-place">${Art.shrineIcon(2, false, m)}</span>${kids.map(x => `<span class="ala-brk-sp">${Art.img(x.id)}</span>`).join('')}</div>
          <p>${ru`Бел-горюч камень снова треснул — и из трещины вышли духи нового мира. Открылась новая мифология — «${MYTHS[m].name}»: её духи, Разломы и святилища уже на карте.`}</p>
          ${CLANS[m] ? `<p class="small">${ru`С ней в Орден пришёл новый клан — «${CLANS[m].name}».`}</p>` : ''}`
        : `<p>${ru`Бел-горюч камень снова треснул, но какой мир открылся — Орден узнает с обновлением игры.`}</p>`}
        <div class="ala-ev on" style="--road:${this.color(m)}">${this.gem(m, 26)}<div><b>${ru`Начался сезон ${s}`}</b>
          <small>${ru`Камень теперь — ${st.K} граней, и собирать его — с начала. В Лиге тоже новый сезон.`}</small></div></div>`,
      buttons: [{ label: ru`Алатырь`, fn: () => this.screen() }, { label: ru`Ура!`, cls: 'primary' }],
    });
    return true;
  },
  // итоги прошлого сезона: вклад и награды (их выдал сервер при расколе — GameCore.alaTurn)
  sumShow() {
    const sm = S.d && S.d.alaSum;
    if (!sm || !(sm.s >= 1) || this.seen(this.SEEN_SUM) >= sm.s) return false;
    this.setSeen(sm.s, this.SEEN_SUM);
    Sfx.play('levelup');
    const got = Array.isArray(sm.got) ? sm.got : [], R = this.rewards();
    const line = `<p class="ala-sum-l">${ru`Осколков в общий камень: ${U.fmtNum(sm.n || 0)}. Побед над Кощеем в финале: ${U.fmtNum(sm.k || 0)}.`}</p>`;
    UI.modal(R && typeof R.html === 'function' ? { title: R.title(sm.s), html: R.html(sm.s, sm.pts || 0) + line, cls: 'ala-modal', buttons: [{ label: ru`Забрать`, cls: 'primary' }] } : {
      title: ru`Итоги сезона`, cls: 'ala-modal',
      html: `<div class="ala-sum-h">${Art.item('alatyr')}<div><small>${ru`Сезон ${sm.s} Алатыря`}</small><b>${ru`Твой вклад: ${U.fmtNum(sm.pts || 0)}`}</b></div></div>${line}
        ${got.length ? `<p>${ru`Награда Ордена за сезон:`}</p><div class="res-rw">${got.map(x => `<div>${x.n > 1 ? `<b>+${U.fmtNum(x.n)}</b> ` : ''}${U.esc(I18N.back(x.label))}</div>`).join('')}</div>` : ''}`,
      buttons: [{ label: ru`Забрать`, cls: 'primary' }],
    });
    return true;
  },

  /* ---------- камень: грани сезона вокруг «стола» и ещё одна — «?», мифология следующего сезона ----------
     st — Rules.alaStage (грани до st.n собраны, st.n собирается), size — px, hi — подсветить грань, broken — трещина раскола */
  stone(st, size = 260, hi = -1, broken = false) {
    const id = 'ala' + (++this._uid), faces = st.faces.concat(['?']), K = faces.length;
    const P = (r, a) => [+(r * Math.cos(a)).toFixed(1), +(r * Math.sin(a)).toFixed(1)];
    const ang = k => (-90 + (k - 0.5) * 360 / K) * Math.PI / 180; // грань k — сверху по часовой, её середина на 12 часах для k = 0
    const outer = [...Array(K)].map((_, k) => P(104 + (U.h('alaR', k) - 0.5) * 12, ang(k)));
    const inner = [...Array(K)].map((_, k) => P(40 + (U.h('alaI', k) - 0.5) * 5, ang(k) + 0.06));
    const pts = a => a.map(p => p.join(',')).join(' ');
    const lerp = (a, b, t) => [+(a[0] + (b[0] - a[0]) * t).toFixed(1), +(a[1] + (b[1] - a[1]) * t).toFixed(1)];
    const done = st.done ? st.K : Math.min(st.K, st.n), p = st.done || st.locked ? 0 : U.clamp(st.pct || 0, 0, 1);
    let faces2 = '', glow = '', cracks = '', seams = '', dots = '', q = '';
    for (let k = 0; k < K; k++) {
      const m = faces[k], nx = k === K - 1, c = nx ? '#8b7fb0' : this.color(m), k1 = (k + 1) % K, quad = [inner[k], outer[k], outer[k1], inner[k1]];
      const mid = (ang(k) + ang(k + 1)) / 2, light = 0.5 + 0.5 * Math.cos(mid + 2.2); // свет сверху слева
      faces2 += nx ? `<polygon class="ala-next" points="${pts(quad)}" fill="#2e2548"/>`
        : `<polygon points="${pts(quad)}" fill="url(#${id}s)" style="filter:brightness(${(0.8 + light * 0.32).toFixed(2)})"/>`;
      if (nx) { const cq = P(76, mid); q = `<text class="ala-q" x="${cq[0]}" y="${cq[1] + 9}" text-anchor="middle">?</text>`; }
      else if (k < done) {
        glow += `<polygon class="ala-lit${k === hi ? ' hi' : ''}" points="${pts(quad)}" fill="${c}" fill-opacity=".78" stroke="${c}" stroke-width="2" filter="url(#${id}g)"/>`;
        glow += `<polygon points="${pts([inner[k], lerp(inner[k], outer[k], .55), lerp(inner[k1], outer[k1], .55)])}" fill="#fff" fill-opacity=".22"/>`;
      } else if (k === done && p > 0) {
        const t = 0.12 + 0.88 * p;
        glow += `<polygon class="ala-part" points="${pts([inner[k], lerp(inner[k], outer[k], t), lerp(inner[k1], outer[k1], t), inner[k1]])}" fill="${c}" fill-opacity=".55" stroke="${c}" stroke-width="1.5"/>`;
      }
      if (k >= done && !nx) { // трещины: ломаная от стола к краю
        const a = lerp(inner[k], inner[k1], 0.3 + U.h('alaC', k) * 0.4), b = lerp(outer[k], outer[k1], 0.2 + U.h('alaD', k) * 0.6);
        const j1 = lerp(a, b, 0.38), j2 = lerp(a, b, 0.7), off = (U.h('alaE', k) - 0.5) * 16;
        cracks += `<path d="M${a} L${j1[0] + off},${j1[1] - off / 2} L${j2[0] - off / 2},${j2[1] + off / 2} L${b}" />`;
        if (U.h('alaF', k) > 0.4) { const s = lerp(a, b, 0.5); cracks += `<path d="M${s[0] + off},${s[1] - off / 2} l${(off * 0.9).toFixed(1)},${(9 - off / 3).toFixed(1)}" />`; }
      }
      seams += `<path d="M${inner[k]} L${outer[k]}" class="${(k > 0 && k < done) || (nx && st.done) ? 'gold' : ''}"/>`;
      const d = P(122, mid);
      dots += nx ? `<circle cx="${d[0]}" cy="${d[1]}" r="4" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="2 2"/>`
        : `<circle cx="${d[0]}" cy="${d[1]}" r="${k < done ? 5.5 : 4}" fill="${k < done ? c : 'rgba(255,255,255,.18)'}" stroke="${c}" stroke-width="1.5"/>`;
    }
    // раскол: трещина через весь камень, из неё — свет нового мира
    const brk = broken ? `<path class="ala-split" d="M-6,-118 L6,-70 L-10,-34 L8,4 L-6,40 L10,78 L-2,120" fill="none" stroke="#fef9c3" stroke-width="5" stroke-linejoin="round" filter="url(#${id}g)"/>
      <path d="M-6,-118 L6,-70 L-10,-34 L8,4 L-6,40 L10,78 L-2,120" fill="none" stroke="#1c1030" stroke-width="2" stroke-linejoin="round"/>` : '';
    const aura = 0.25 + 0.6 * (done + p) / st.K;
    return `<svg class="ala-stone" viewBox="-135 -135 270 270" width="${size}" height="${size}" role="img" aria-label="${ru`Алатырь-камень: собрано граней ${done} из ${st.K}`}">
      <defs>
        <radialGradient id="${id}a"><stop offset=".35" stop-color="#fde68a" stop-opacity="${aura.toFixed(2)}"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>
        <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#eee7d6"/><stop offset="1" stop-color="#b3a484"/></linearGradient>
        <radialGradient id="${id}t" cx=".4" cy=".35"><stop offset="0" stop-color="#fffdf5"/><stop offset="1" stop-color="#d8ccb0"/></radialGradient>
        <filter id="${id}g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle class="ala-aura" r="132" fill="url(#${id}a)"/>
      <polygon points="${pts(outer)}" fill="#3b2a12" transform="translate(3 6)" opacity=".45"/>
      ${faces2}${glow}
      <g class="ala-seams" fill="none" stroke="#5b4a2a" stroke-width="1.6" stroke-linecap="round">${seams}</g>
      <g class="ala-cracks" fill="none" stroke="#3b2a12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".75">${cracks}</g>
      <polygon points="${pts(outer)}" fill="none" stroke="#5b4a2a" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="${pts(inner)}" fill="url(#${id}t)" stroke="#5b4a2a" stroke-width="2.2" stroke-linejoin="round"/>
      <g class="ala-rune" fill="none" stroke="#b45309" stroke-width="2.6" stroke-linejoin="round" opacity="${(0.4 + 0.6 * done / st.K).toFixed(2)}"><rect x="-14" y="-14" width="28" height="28"/><rect x="-14" y="-14" width="28" height="28" transform="rotate(45)"/><circle r="4.5" fill="#b45309" stroke="none"/></g>
      ${q}${dots}${brk}
    </svg>`;
  },

  /* ---------- экран «Алатырь»: камень и сезон сверху, ниже вкладки «Камень», «Грани», «Вклад», «Летопись» ---------- */
  TAB_NAMES() { return { stone: ru`Камень`, faces: ru`Грани`, mine: ru`Вклад`, hist: ru`Летопись` }; },
  screen() {
    Sfx.init(); Sfx.play('tap');
    const T = this.TAB_NAMES();
    const scr = UI.screen(ru`Алатырь-камень`, `<div class="ala">
        <div class="ala-top"></div>
        <div class="seg dt-tabs ala-tabs">${this.TABS.map(k => `<button data-tab="${k}" class="${k === this.tab ? 'on' : ''}">${T[k]}</button>`).join('')}</div>
        <div class="ala-pane"></div>
      </div>`, 'ala-screen det-screen');
    const box = scr.querySelector('.ala'), pane = box.querySelector('.ala-pane');
    const show = (t, dir) => {
      this.tab = t;
      U.$$('[data-tab]', box).forEach(b => b.classList.toggle('on', b.dataset.tab === t));
      this.renderPane(box); pane.scrollTop = 0; UI.slideIn(pane, dir);
    };
    box.addEventListener('click', e => {
      const tb = e.target.closest('[data-tab]');
      if (tb && tb.dataset.tab !== this.tab) { Sfx.play('tap'); show(tb.dataset.tab, Math.sign(this.TABS.indexOf(tb.dataset.tab) - this.TABS.indexOf(this.tab))); }
    });
    UI.swipeTabs(pane, this.TABS, () => this.tab, show);
    this.render(box);
    this.refresh(true).then(() => { if (box.isConnected) this.render(box); });
    // пока экран открыт — таймеры дорог и финала идут
    const t = setInterval(() => { if (!box.isConnected) { clearInterval(t); return; } const l = box.querySelectorAll('[data-left]'); l.forEach(x => { x.textContent = this.left(+x.dataset.left - U.now()); }); }, 30000);
    return scr;
  },
  render(box) { this.renderTop(box); this.renderPane(box); },
  // шапка: камень сезона и где Орден сейчас
  renderTop(box) {
    const top = box.querySelector('.ala-top'), I = this.info, now = U.now(), st = this.stage(), f = Ev.finale(now);
    const left = x => `<span data-left="${x}">${this.left(x - now)}</span>`;
    let line, bar, sub;
    if (f) {
      line = ru`Финал сезона ${st.s}`; bar = Math.min(1, f.kills / f.goal);
      sub = Ev.ala.brk ? ru`Кощей одолён! Раскол через ${left(Ev.alaEnd())}` : ru`Побед над Кощеем: ${U.fmtNum(f.kills)} из ${U.fmtNum(f.goal)}`;
    } else if (st.done) {
      line = ru`Сезон ${st.s} · все грани собраны`; bar = 1; sub = ru`Кощей идёт за камнем…`;
    } else {
      line = ru`Сезон ${st.s} · грань ${st.n + 1} из ${st.K}`; bar = st.pct;
      sub = st.locked ? ru`Грань «?» откроется с обновлением игры` : ru`${this.roadName(st.myth)}: ${U.fmtNum(st.have)} / ${(st.est ? '≈ ' : '') + U.fmtNum(st.need)}`;
    }
    top.style.setProperty('--road', f ? this.KOS : this.color(st.myth));
    top.innerHTML = `<div class="ala-top-stone">${this.stone(st, 136)}</div>
      <div class="ala-top-i"><small class="story-num">${line}</small>
        <b class="ala-top-total">${I ? U.fmtNum(I.total) : '…'}</b><small>${ru`осколков собрал Орден`}</small>
        <div class="pbar"><i style="width:${(bar * 100).toFixed(1)}%"></i></div><small class="ala-top-sub">${sub}</small></div>`;
  },
  renderPane(box) {
    const pane = box.querySelector('.ala-pane');
    pane.innerHTML = !this.info && this.tab !== 'mine' ? `<div class="empty">${ru`Узнаём, сколько камня собрал Орден…`}</div>`
      : this.tab === 'faces' ? this.paneFaces() : this.tab === 'mine' ? this.paneMine() : this.tab === 'hist' ? this.paneHist() : this.paneStone();
  },
  // вкладка «Камень»: финал, грань, что собирается, распутанные дороги и «?»
  paneStone() {
    const I = this.info, A = Rules.ALATYR_WORLD, now = U.now(), st = this.stage(), f = Ev.ala.fin, end = Ev.alaEnd();
    const left = x => `<span data-left="${x}">${this.left(x - now)}</span>`;
    const roads = Ev.roadsClean(I.roads).sort((a, b) => b.n - a.n);
    const live = roads.filter(r => r.from <= now && r.to > now), soon = roads.filter(r => r.from > now);
    let out = '';
    // Кощей: финал идёт или вот-вот
    if (f && now < end) {
      const on = now >= f.from;
      out += `<div class="ala-kos ${on ? 'on' : ''}"><span class="ala-kos-art">${Art.img('koschey')}</span><div class="ala-kos-i">
        <small class="story-num">${ru`Финал сезона ${Ev.ala.s}`}</small><b>${on ? ru`Кощей пришёл за камнем!` : ru`Кощей идёт за камнем`}</b>
        ${on ? `<div class="pbar big"><i style="width:${Math.min(100, f.kills / f.goal * 100).toFixed(1)}%"></i></div>
          <small>${ru`Побед над Кощеем по всему миру: <b>${U.fmtNum(f.kills)}</b> из ${U.fmtNum(f.goal)}`}</small>
          <small>${Ev.ala.brk ? ru`Орден одолел Кощея — в ярости он расколет камень через ${left(end)}` : ru`Во всех Разломах мира — Кощей. Одолейте его ${U.fmtNum(f.goal)} раз — и он расколет камень раньше; иначе — через ${left(end)}.`}</small>`
          : `<small>${ru`Все грани собраны. Финал — через ${left(f.from)}: во всех Разломах мира будет ждать Кощей.`}</small>`}
      </div></div>`;
    } else if (st.s >= 2 && now - (Ev.ala.from || 0) < 3 * 86400000 && Ev.ala.s === st.s) {
      const m = mythOfSeason(st.s); // только что раскололся — какая мифология открылась
      out += `<div class="ala-ev on" style="--road:${this.color(m)}">${this.gem(m, 26)}<div><b>${ru`Кощей расколол Алатырь!`}</b>
        <small>${m ? ru`Открылась новая мифология — «${MYTHS[m].name}». Начался сезон ${st.s}.` : ru`Какой мир открылся — Орден узнает с обновлением игры. Начался сезон ${st.s}.`}</small></div></div>`;
    }
    if (!f) {
      out += `<div class="story-card ala-card" style="--road:${this.color(st.myth)}">
        <div class="story-num">${ru`Сезон ${st.s} · грань ${st.n + 1} из ${st.K}`}</div>
        <h3>${st.locked ? ru`Грань «?»` : this.roadName(st.myth)}</h3>
        <div class="pbar big"><i style="width:${(st.pct * 100).toFixed(1)}%"></i></div>
        <p class="o-me">${st.locked ? ru`Эта грань — мифологии, которой ещё нет в игре: она откроется с обновлением. Осколки копятся.` : ru`Собрано ${U.fmtNum(st.have)} из ${U.fmtNum(st.need)} — до вехи ${U.fmtNum(st.need - st.have)}`}</p>
      </div>`;
    }
    out += live.map(r => `<div class="ala-ev on" style="--road:${this.color(r.road)}">${this.gem(r.road, 26)}<div><b>${ru`${this.roadName(r.road)} распутана`}</b>
        <small>${ru`Духи мифологии «${this.mythName(r.road)}» встречаются в ${A.MUL} раза чаще. Осталось ${left(r.to)}`}</small></div></div>`).join('')
      + soon.map(r => `<div class="ala-ev" style="--road:${this.color(r.road)}">${this.gem(r.road, 26)}<div><b>${ru`${this.roadName(r.road)} распутывается`}</b>
        <small>${ru`Грань собрана! Духи мифологии «${this.mythName(r.road)}» станут встречаться чаще через ${left(r.from)}`}</small></div></div>`).join('');
    out += this.qCard(st);
    return out;
  },
  // грань «?» — мифология следующего сезона (имя не раскрываем, даже если она уже есть в игре)
  qCard(st) {
    return `<div class="ala-ev ala-qcard">${this.gem(null, 26)}<div><b>${ru`Грань «?»`}</b>
      <small>${st.done ? ru`Мифология сезона ${st.s + 1}. Кощей вот-вот расколет камень — и из трещины выйдет новый мир.`
        : ru`Мифология сезона ${st.s + 1}. Когда Орден соберёт все ${st.K} граней, Кощей придёт за камнем и расколет его — и из трещины выйдет новый мир.`}</small></div></div>`;
  },
  // вкладка «Грани»: грани сезона по порядку и «?»
  // 5.x: множитель Ордена — цена новых граней растёт с числом активных Ловчих (Rules.ALATYR_WORLD.GOALS)
  mulCard() {
    const G = Rules.ALATYR_WORLD.GOALS, N = Ev.ala.N || 0, mul = Rules.alaMul(N).toLocaleString(I18N.locale, { maximumFractionDigits: 2 });
    return `<div class="ala-mul"><b>${ru`Множитель Ордена ×${mul} — активных Ловчих ${G.LEVEL}+ уровня: ${U.fmtNum(N)}`}</b>
      <small>${ru`Чем больше Ловчих ${G.LEVEL}+ уровня играли за последние ${G.DAYS} дней, тем дороже новые грани: +${Math.round(G.PER * 100)}% за каждого, но не больше чем вдвое дороже прошлой грани. Цена грани фиксируется, когда грань открывается, и дальше не меняется. «≈» — ориентир для граней, что ещё не открылись.`}</small></div>`;
  },
  paneFaces() {
    const st = this.stage(), ap = p => (p.kind === 'est' ? '≈ ' : '') + U.fmtNum(p.p);
    const rows = st.faces.map((m, k) => {
      const done = k < st.n || st.done, cur = !st.done && k === st.n;
      const side = done ? `<span class="q-ok" aria-label="${ru`Собрана`}">✓</span>` : cur ? `<i>${U.fmtNum(st.have)} / ${ap(st.prices[k])}</i>` : `<i class="dim">${ap(st.prices[k])}</i>`;
      return `<div class="ala-face ${done ? 'done' : cur ? 'cur' : ''}${m ? '' : ' nomyth'}" style="--road:${this.color(m)}">${this.gem(m, 22)}<div class="af-main"><b>${m ? MYTHS[m].name : ru`Грань «?»`}</b><small>${m ? this.roadName(m) : ru`откроется с обновлением игры`}</small>
        ${cur ? `<div class="pbar"><i style="width:${(st.pct * 100).toFixed(1)}%"></i></div>` : ''}</div>${side}</div>`;
    }).join('');
    const cost = (st.prices.some(p => p.kind === 'est') ? '≈ ' : '') + U.fmtNum(st.prices.reduce((a, p) => a + p.p, 0));
    return `${this.mulCard()}<div class="ala-faces">${rows}
      <div class="ala-face nx">${this.gem(null, 22)}<div class="af-main"><b>?</b><small>${ru`Мифология сезона ${st.s + 1}: откроется, когда Кощей расколет камень`}</small></div><i class="dim">🔒</i></div></div>
      <div class="q-note">${ru`В сезоне ${st.s} у камня ${st.K} граней — по одной на каждую мифологию. Новая мифология сезона — последняя грань. Всего за сезон — ${cost} осколков.`}</div>`;
  },
  // вкладка «Вклад»: мой вклад в сезон и за всё время, награда сезона
  paneMine() {
    const I = this.info, st = this.stage(), my = I && I.my && I.my.s === st.s ? I.my : (S.d.alaS && S.d.alaS.s === st.s ? { ...S.d.alaS, pts: Rules.alaPoints(S.d.alaS) } : { n: 0, k: 0, pts: 0 });
    const R = this.rewards();
    let rw = '';
    if (R && typeof R.forContribution === 'function') {
      let list = [];
      try { list = R.forContribution(st.s, my.pts || 0) || []; } catch (e) { list = []; }
      const T = Array.isArray(R.TIERS) ? R.TIERS : [], t = typeof R.tierOf === 'function' ? R.tierOf(my.pts || 0) : -1, next = T[t + 1];
      const row = x => `<div class="sr-rw sr-k-${U.esc(x.k || '')}"><span class="sr-ic">${x.icon || ''}</span><span class="sr-t"><b>${U.esc(I18N.back(String(x.label || '')))}</b>${x.k === 'look' || x.k === 'medal' || !(x.n > 0) ? '' : `<em>+${U.fmtNum(x.n)}</em>`}</span></div>`;
      const big = list.filter(x => x.k === 'look' || x.k === 'medal').map(row).join(''), small = list.filter(x => x.k !== 'look' && x.k !== 'medal').map(row).join('');
      rw = `<h3 class="prof-h">${ru`Награда за сезон`}</h3>
        ${T.length ? `<div class="sr ala-sr"><div class="sr-ladder">${T.map((x, i) => `<i class="sr-step ${i <= t ? 'on' : ''} ${i === t ? 'cur' : ''}">${x.n}+</i>`).join('')}</div></div>` : ''}
        ${list.length ? `<div class="sr-list">${big}${small ? `<div class="sr-grid">${small}</div>` : ''}</div>` : `<div class="ala-rw"><small>${ru`Принеси в камень хотя бы один осколок — и Орден наградит тебя в конце сезона.`}</small></div>`}
        ${next ? `<div class="ala-rw"><small>${ru`До ступени «${next.name}» — ещё ${U.fmtNum(next.n - (my.pts || 0))}.`}</small></div>` : ''}
        <div class="q-note">${ru`Награду Орден выдаст, когда Кощей расколет камень, — по вкладу за сезон. Чем больше вклад, тем она щедрее.`}</div>`;
    }
    return `<div class="ala-mine big">${Art.item('alatyr')}<div><small class="story-num">${ru`Сезон ${st.s}`}</small><b>${ru`Твой вклад: ${U.fmtNum(my.pts || 0)}`}</b>
        <small>${ru`Осколков: ${U.fmtNum(my.n || 0)} · побед над Кощеем: ${U.fmtNum(my.k || 0)} (каждая — как ${Rules.ALATYR_WORLD.FINALE.KILL} осколка)`}</small></div></div>
      <div class="ala-mine">${Art.item('alatyr')}<div><b>${ru`За всё время: ${U.fmtNum((I && I.mine) || S.d.alaGiven || 0)}`}</b><small>${ru`Столько осколков ты принёс Ордену. Они остаются у тебя — для пробуждения духов.`}</small></div></div>
      ${rw}${this.note()}`;
  },
  // вкладка «Летопись»: дороги, финалы и расколы — от новых к старым
  paneHist() {
    const I = this.info, now = U.now(), ev = [];
    const date = t => new Date(t).toLocaleDateString(I18N.locale, { day: 'numeric', month: 'short' });
    Ev.roadsClean(I.roads).filter(r => r.from <= now).forEach(r => {
      const f = Rules.alaFace(r.n);
      ev.push({ t: r.from, html: `<div class="ala-h" style="--road:${this.color(r.road)}">${this.gem(r.road, 18)}<span>${this.roadName(r.road)}</span><small>${ru`сезон ${f.s}`} · ${date(r.from)}</small></div>` });
    });
    const seasons = Array.isArray(I.seasons) ? I.seasons : [];
    seasons.forEach(x => {
      if (x.fin && x.fin.from <= now) ev.push({ t: x.fin.from, html: `<div class="ala-h kos" style="--road:${this.KOS}">${Art.img('koschey')}<span>${ru`Финал сезона ${x.s}: Кощей пришёл за камнем`}</span><small>${date(x.fin.from)}</small></div>` });
      if (x.brk && x.brk <= now) {
        const m = mythOfSeason(x.s + 1);
        ev.push({ t: x.brk + 1, html: `<div class="ala-h brk" style="--road:${this.color(m)}">${this.gem(m, 18)}<span>${ru`Раскол: начался сезон ${x.s + 1}`}${x.fin ? ` · ${ru`побед над Кощеем ${U.fmtNum(x.fin.kills)}`}` : ''}</span><small>${date(x.brk)}</small></div>` });
      }
    });
    const list = ev.sort((a, b) => b.t - a.t).slice(0, 30).map(x => x.html).join('');
    return list ? `<div class="ala-hist">${list}</div>` : `<div class="empty">${ru`Летопись пока пуста: Орден ещё не собрал ни одной грани.`}</div>`;
  },
  note() {
    const A = Rules.ALATYR_WORLD;
    return `<div class="q-note">${ru`Каждый осколок Алатыря, найденный любым Ловчим, — в разломах и у хранителей-старейшин Капищ, — ложится в общий камень Ордена. Собрана грань — дорога в её мир распутана: ${A.HOURS / 24} дня духи этой мифологии встречаются в ${A.MUL} раза чаще, у всех Ловчих разом. Собраны все грани сезона — приходит Кощей: ${A.FINALE.DAYS} дней он ждёт во всех Разломах мира, а потом раскалывает камень. Из трещины выходит новая мифология, начинается новый сезон — и в Лиге тоже. В новом сезоне у камня на одну грань больше.`}</div>`;
  },
};

// сезон, известный с прошлого запуска, — до ответа сервера (духи отбираются по мифологиям этого сезона)
Alatyr.restore();
// дороги и сезон от сервера: при входе и когда они изменились (core.js, alatyrSync) — ещё до того, как открылась карта
Bus.on('roads', list => Alatyr.setRoads(list));
Bus.on('ala', x => Alatyr.setAla(x));
