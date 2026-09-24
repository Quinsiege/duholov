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
    const sb = window.supabase.createClient(CLOUD_CONFIG.url, CLOUD_CONFIG.anonKey, { auth: { persistSession: true, storageKey: CLOUD_CONFIG.auth } });
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      const key = this.accessKey();
      const { error } = await sb.auth.signInAnonymously(key ? { options: { data: { access: key } } } : undefined);
      if (error && CLOUD_CONFIG.locked) this.forgetKey();
      if (error) throw new Error('Облако: ' + error.message);
    }
    this.sb = sb;
    return sb;
  },

  // Закрытый контур (тестовый проект): ключ доступа знает только владелец — его нет в коде и репозитории.
  // Передаётся при входе (хук Before User Created) и с каждым запросом к серверу игры (заголовок x-duholov-access).
  KEY_STORE: 'duholov.test.key',
  accessKey() {
    if (!CLOUD_CONFIG.locked) return '';
    let k = '';
    try { k = localStorage.getItem(this.KEY_STORE) || ''; } catch (e) {}
    if (!k) {
      k = String(window.prompt('Ключ доступа к тестовому контуру duholov-test:') || '').trim();
      if (k) { try { localStorage.setItem(this.KEY_STORE, k); } catch (e) {} }
    }
    return k;
  },
  forgetKey() { try { localStorage.removeItem(this.KEY_STORE); } catch (e) {} },
  headers() { const k = this.accessKey(); return k ? { 'x-duholov-access': k } : {}; },

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
