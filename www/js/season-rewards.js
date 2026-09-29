'use strict';
/* 4.28: награды сезонов Алатыря. Все Ловчие вместе собирают Алатырь-камень (js/alatyr.js); камень собран — Кощей раскалывает
   его, и начинается новый сезон. По итогам сезона Ловчий получает награды по вкладу n — сколько осколков он принёс в общий
   счёт за этот сезон. Ступени TIERS суммируются: принёс 30 — награды ступеней 1+, 5+, 15+ и 30+.
   Калибровка: у Ловчего ~0,3–1 осколка в день (Rules: разломы и старейшины Капищ, не больше двух в день), сезон — недели:
   1+ — заглянул в сезон, 5+ — играл, 15+ — играл регулярно, 30+ — почти каждый день, 60+ — весь сезон без перерыва.
   Награды — валюта и предметы (обликов у сезонов нет). Знак «Хранитель Алатыря» (MEDALS, stat alaSeasons) —
   число сезонов, где принесено не меньше MEDAL_MIN осколков: он про постоянство, а общий вклад и так виден на экране Алатыря.
   grant выдаёт на сервере (общие S, U, ITEMS, MEDALS, без DOM) — один раз на сезон: отметка S.d.alaRw[сезон] = n.
   html — окно «Итоги сезона Алатыря» на телефоне: UI.modal({ title: SeasonRewards.title(s), html: SeasonRewards.html(s, n) }). */
const SeasonRewards = {
  TIERS: [
    { n: 1,  name: ru`Причастный`,         rw: { sparks: 1500, charm2: 10 } },
    { n: 5,  name: ru`Искатель осколков`,  rw: { zlat: 10, honey: 5, brew: 3 }, medal: true },
    { n: 15, name: ru`Собиратель Алатыря`, rw: { zlat: 20, charm3: 5, incense: 1, water: 5 } },
    { n: 30, name: ru`Хранитель камня`,    rw: { zlat: 40, xpbrew: 2, rod: 15, deadwater: 1 } },
    { n: 60, name: ru`Сердце Алатыря`,     rw: { zlat: 50, deadwater: 1, rod: 20, farpass: 3 } },
  ],
  MEDAL_MIN: 5, // сезон засчитывается в знак «Хранитель Алатыря» (ступень с medal: true)
  ORDER: ['zlat', 'sparks', 'rod'], // порядок показа: сначала валюта, потом предметы

  roman(n) {
    n = Math.floor(+n) || 0;
    return [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
      .reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, '');
  },
  // номер последней достигнутой ступени (−1 — ни одной)
  tierOf(n) { let t = -1; this.TIERS.forEach((x, i) => { if (n >= x.n) t = i; }); return t; },
  medal() { return MEDALS.find(m => m.id === 'alatyr') || null; },
  label(k) { return typeof S !== 'undefined' && S.resName ? S.resName(k) : ITEMS[k] ? ITEMS[k].name : k; },
  norm(s, n) { return [Math.floor(+s) || 0, Math.max(0, Math.floor(+n) || 0)]; },

  // награды за вклад n в сезоне s (без картинок — годится и для сервера): [{ k, n, label, tier }]
  list(s, n) {
    [s, n] = this.norm(s, n);
    const out = [], sum = {}, tier = {};
    if (s < 1) return out;
    this.TIERS.forEach((t, i) => {
      if (n < t.n) return;
      if (t.medal && this.medal()) out.push({ k: 'medal', n: 1, label: ru`Сезон засчитан в знак «${this.medal().name}»`, tier: i });
      for (const [k, v] of Object.entries(t.rw)) { sum[k] = (sum[k] || 0) + v; if (!(k in tier)) tier[k] = i; }
    });
    const keys = Object.keys(sum).sort((a, b) => (this.ORDER.includes(b) - this.ORDER.includes(a)) || (this.ORDER.indexOf(a) - this.ORDER.indexOf(b)));
    keys.forEach(k => out.push({ k, n: sum[k], label: this.label(k), tier: tier[k] }));
    return out;
  },
  // то же для показа — с иконкой (разметка; на телефоне)
  forContribution(s, n) {
    return this.list(s, n).map(x => ({ ...x, icon: this.icon(x) }));
  },
  icon(x) {
    if (typeof Art === 'undefined') return '';
    if (x.k === 'medal') { const m = this.medal(); return Art.medal(m, Math.max(1, (S.d && S.d.medals && S.d.medals[m.id]) || 0)); }
    return Art.item(x.k);
  },

  // выдать награды сезона s за вклад n в прогресс S.d — один раз на сезон; → что выдано [{ k, n, label }] (для окна итогов)
  grant(St, s, n) {
    [s, n] = this.norm(s, n);
    const d = St && St.d;
    if (!d || s < 1) return [];
    if (!d.alaRw || typeof d.alaRw !== 'object' || Array.isArray(d.alaRw)) d.alaRw = {};
    if (Object.prototype.hasOwnProperty.call(d.alaRw, String(s))) return []; // уже выдано
    d.alaRw[s] = n;
    const out = [], rw = {};
    let medal = false;
    for (const x of this.list(s, n)) {
      if (x.k === 'medal') { d.stats = d.stats || {}; d.stats.alaSeasons = (d.stats.alaSeasons || 0) + 1; medal = true; out.push({ k: 'medal', n: 1, label: x.label }); }
      else rw[x.k] = x.n;
    }
    if (Object.keys(rw).length) out.push(...St.giveRewards(rw, true, true));
    if (medal && St.checkMedals) St.checkMedals();
    if (St.save) St.save();
    return out;
  },

  /* ---------- окно «Итоги сезона Алатыря» (только телефон) ---------- */
  title(s) { return ru`Итоги сезона Алатыря ${this.roman(s)}`.replace(/ (?=[IVXLCDM]+$)/, ' '); }, // номер не отрывается от слова
  html(s, n) {
    [s, n] = this.norm(s, n);
    const T = this.TIERS, t = this.tierOf(n), next = T[t + 1], rows = this.forContribution(s, n);
    const word = U.plural(n, ru`осколок`, ru`осколка`, ru`осколков`);
    const lead = n > 0
      ? ru`Орден собрал Алатырь-камень — и Кощей снова расколол его. Твой вклад за сезон: <b>${U.fmtNum(n)} ${word}</b>.`
      : ru`Орден собрал Алатырь-камень — и Кощей снова расколол его. В этом сезоне ты не принёс осколков: они выпадают в разломах и у старейшин Капищ.`;
    const ladder = T.map((x, i) => `<i class="sr-step ${i <= t ? 'on' : ''} ${i === t ? 'cur' : ''}">${x.n}+</i>`).join('');
    // знак — строкой во всю ширину, валюта и предметы — плитками в две колонки
    const row = x => `<div class="sr-rw sr-k-${x.k}"><span class="sr-ic">${x.icon}</span><span class="sr-t"><b>${U.esc(x.label)}</b>${x.k === 'medal' ? '' : `<em>+${U.fmtNum(x.n)}</em>`}</span></div>`;
    const big = rows.filter(x => x.k === 'medal').map(row).join(''), small = rows.filter(x => x.k !== 'medal').map(row).join('');
    const list = big + (small ? `<div class="sr-grid">${small}</div>` : '');
    const tail = next ? `<p class="sr-next">${ru`До ступени «${next.name}» не хватило ${U.fmtNum(next.n - n)} — в новом сезоне камень снова ждёт осколков.`}</p>`
      : `<p class="sr-next">${ru`Высшая ступень сезона — ты среди главных собирателей Ордена!`}</p>`;
    return `<div class="sr">
      <div class="sr-hero"><span class="sr-stone">${Art.item('alatyr')}</span><div class="sr-num">${ru`Сезон ${this.roman(s)}`}</div></div>
      <p class="sr-lead">${lead}</p>
      <div class="sr-ladder">${ladder}</div>
      ${t >= 0 ? `<div class="sr-rank">${ru`Твоя ступень — «${T[t].name}»`}</div>` : ''}
      ${list ? `<div class="sr-list">${list}</div>` : ''}
      ${tail}</div>`;
  },
};
