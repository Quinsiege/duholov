'use strict';
/* Облако (Supabase): анонимный вход, прогресс (sync.js), объекты карты (pois.js), заявки мест (propose.js)
   и общая таблица сезона Лиги (имя Ловчего, облик, уровень и звёзды). */

const Cloud = {
  LIB: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
  LIB_SRI: 'sha384-GFr3yTh5lJznCbZfpTtXnwboFsxqtTQoeTZCRHhE0579KrRmlCzen5AA8ohaB5ug', // проверка целостности: подменённый файл CDN не выполнится
  sb: null,

  // автотесты (браузер под управлением Playwright) на боевой сервер не ходят
  configured() { return !!(CLOUD_CONFIG.url && CLOUD_CONFIG.anonKey) && !navigator.webdriver; },
  enabled() { return this.configured(); }, // таблицу видят все; Cfg.s.cloud — показывать ли в ней себя

  async client() {
    if (this.sb) return this.sb;
    if (!window.supabase) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = this.LIB; s.integrity = this.LIB_SRI; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = () => rej(new Error('Не удалось загрузить облачную библиотеку'));
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

  // Топ-50 сезона и место игрока (строки таблицы пишет сервер игры после турниров)
  async top(season) {
    const sb = await this.client();
    const { data, error } = await sb.from('league_scores').select('user_id,name,stars,rank,level,look')
      .eq('season', season).order('stars', { ascending: false }).order('updated_at', { ascending: true }).limit(50);
    if (error) throw new Error(error.message);
    const { data: { user } } = await sb.auth.getUser();
    return { rows: data || [], me: user && user.id };
  },
};
