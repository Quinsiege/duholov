'use strict';
/* Небо: реальная погода (Open-Meteo, без ключа) или смоделированная, и фазы Луны.
   Координаты округляются до ~1 км перед запросом. */

const Sky = {
  w: null, // { key, temp, src: 'real'|'sim', at, lat, lng }

  init() {
    this.update(true);
    setInterval(() => this.update(), 5 * 60000);
  },

  async update(force) {
    const p = MapView.pos;
    if (!p || !S.d) return;
    const stale = !this.w || Date.now() - this.w.at > 30 * 60000 || U.dist(p.lat, p.lng, this.w.lat, this.w.lng) > 5000;
    if (!stale && !force) return;
    let w = null;
    if (S.d.settings.weather) { try { w = await this.fetchReal(p); } catch (e) { w = null; } }
    if (!w) w = this.simulate(p);
    const changed = !this.w || this.w.key !== w.key;
    this.w = w;
    Bus.emit('weather', { w, changed });
  },

  async fetchReal(p) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat.toFixed(2)}&longitude=${p.lng.toFixed(2)}&current=weather_code,wind_speed_10m,temperature_2m`;
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    const c = (await r.json()).current;
    if (!c) return null;
    return { key: this.fromCode(c.weather_code, c.wind_speed_10m), temp: Math.round(c.temperature_2m), src: 'real', at: Date.now(), lat: p.lat, lng: p.lng };
  },
  // Коды погоды WMO → тип погоды игры
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
    const slot = Math.floor(Date.now() / (2 * 3600000));
    const m = new Date().getMonth();
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
