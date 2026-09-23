'use strict';
/* Облако (Supabase): анонимный вход и общая таблица сезона Лиги.
   Отправляются только имя Ловчего, облик, уровень и звёзды Лиги. */

const Cloud = {
  LIB: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
  sb: null,

  configured() { return !!(CLOUD_CONFIG.url && CLOUD_CONFIG.anonKey); },
  enabled() { return this.configured() && S.d && S.d.settings.cloud !== false; },

  async client() {
    if (this.sb) return this.sb;
    if (!window.supabase) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = this.LIB; s.onload = res; s.onerror = () => rej(new Error('Не удалось загрузить облачную библиотеку'));
        document.head.appendChild(s);
      });
    }
    const sb = window.supabase.createClient(CLOUD_CONFIG.url, CLOUD_CONFIG.anonKey, { auth: { persistSession: true, storageKey: 'duholov.auth' } });
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      const { error } = await sb.auth.signInAnonymously();
      if (error) throw new Error('Облако: ' + error.message);
    }
    this.sb = sb;
    return sb;
  },

  async submitLeague() {
    if (!this.enabled()) return;
    try {
      const sb = await this.client();
      const L = League.st();
      const { data: { user } } = await sb.auth.getUser();
      await sb.from('league_scores').upsert({
        user_id: user.id, season: L.season, name: S.d.name.slice(0, 20), stars: L.stars,
        rank: League.rank(L.stars), level: S.d.level, look: S.d.look, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,season' });
    } catch (e) { console.warn(e); }
  },

  // Топ-50 сезона и место игрока
  async top(season) {
    const sb = await this.client();
    const { data, error } = await sb.from('league_scores').select('user_id,name,stars,rank,level,look')
      .eq('season', season).order('stars', { ascending: false }).order('updated_at', { ascending: true }).limit(50);
    if (error) throw new Error(error.message);
    const { data: { user } } = await sb.auth.getUser();
    return { rows: data || [], me: user && user.id };
  },
};
