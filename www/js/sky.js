'use strict';
/* Небо: погода и фазы Луны.
   5.2: погоду решает сервер игры (GameCore.weather) — настоящую (Open-Meteo по клетке ~0.1°) или смоделированную, одну
   для всех Ловчих в клетке в этот час, и присылает её в каждом ответе (Game.apply → Sky.set). Телефон сам в сервис погоды
   не ходит; пока ответа сервера нет (запуск, нет связи) — показывает смоделированную (Sky.simulate). */

const Sky = {
  w: null, // { key, temp, src: 'real'|'sim', srv: погода от сервера, at, lat, lng }
  SRV_TTL: 2 * 3600000, // погода от сервера без обновления дольше — считается устаревшей (сервер давно не отвечал)

  init() {
    this.update(true);
    // 5.2: погода нужна карте — под полноэкранной сценой (stage.js) не спрашиваем; сцена закрылась — сверим один раз
    setInterval(() => { if (Stage.busy) this._miss = true; else this.update(); }, 5 * 60000);
    Stage.on(busy => { if (!busy && this._miss) { this._miss = false; setTimeout(() => this.update(), 500); } });
  },

  // Запасной вариант: погода от сервера есть и свежая — она и остаётся (новое место сервер пришлёт с ответом на шаг/телепорт);
  // нет — смоделированная, как её посчитал бы сервер без сервиса погоды
  update(force) {
    const p = MapView.pos;
    if (!p || !S.d) return;
    if (this.w && this.w.srv && Date.now() - this.w.at < this.SRV_TTL) return;
    const stale = !this.w || Date.now() - this.w.at > 30 * 60000 || U.dist(p.lat, p.lng, this.w.lat, this.w.lng) > 5000;
    if (!stale && !force) return;
    const w = this.simulate(p), changed = !this.w || this.w.key !== w.key;
    this.w = w;
    Bus.emit('weather', { w, changed });
  },

  // Погода от сервера (ответ на любое действие). Плашка и эффекты обновляются, только если она изменилась;
  // замена запасной модели настоящей при запуске — без всплывашки «Погода: …»
  set(x) {
    if (!x || !Object.prototype.hasOwnProperty.call(WEATHER, x.key)) return;
    const p = MapView.pos, prev = this.w;
    const w = { key: x.key, temp: Number.isFinite(x.temp) ? x.temp : null, src: x.src === 'real' ? 'real' : 'sim', srv: true, at: Date.now(), lat: p ? p.lat : 0, lng: p ? p.lng : 0 };
    this.w = w;
    if (prev && prev.srv && prev.key === w.key && prev.temp === w.temp && prev.src === w.src) return;
    Bus.emit('weather', { w, changed: !!(prev && prev.srv && prev.key !== w.key) });
  },
  // Коды погоды WMO → тип погоды игры (сервер, serve.js)
  fromCode(code, wind) {
    if (code >= 95) return 'storm';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if (code === 45 || code === 48) return 'fog';
    if (wind >= 28) return 'windy';
    if (code === 3) return 'overcast';
    if (code === 2) return 'partly';
    return 'clear';
  },
  simulate(p) {
    const slot = Math.floor(U.now() / (2 * 3600000));
    const m = Ev.month();
    const winter = m >= 10 || m <= 2;
    const key = U.weighted([
      ['clear', 4], ['partly', 4], ['overcast', 3], ['rain', winter ? 0.5 : 2], ['fog', 1],
      ['windy', 1.5], ['snow', winter ? 2.5 : 0], ['storm', winter ? 0 : 0.6],
    ], U.h('wx', Math.floor(p.lat * 10), Math.floor(p.lng * 10), slot));
    return { key, temp: null, src: 'sim', at: Date.now(), lat: p.lat, lng: p.lng };
  },

  boosted(el) { return !!this.w && WEATHER[this.w.key].boost.includes(el); },

  // Фаза Луны 0..1 (0 — новолуние, 0.5 — полнолуние)
  moonPhase(t = Date.now()) {
    const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14);
    const days = (t - ref) / 86400000;
    return (((days % syn) + syn) % syn) / syn;
  },
  moonEvent() {
    const ph = this.moonPhase();
    if (ph > 0.466 && ph < 0.534) return 'full';
    if (ph < 0.034 || ph > 0.966) return 'new';
    return null;
  },
  shinyRate(base = SHINY_RATE) { return base * (this.moonEvent() === 'new' ? 2 : 1) * Ev.shinyMul(); },
};
