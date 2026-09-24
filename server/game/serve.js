/* ---------- Edge Function: вход, загрузка и сохранение прогресса, общие таблицы ---------- */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-duholov-access',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// секретный ключ проекта (новая схема ключей Supabase, с запасным вариантом для старой)
function serviceKey() {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const k = keys.default || Object.values(keys)[0];
    if (k) return String(k);
  } catch { /* старая схема */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}
const db = createClient(Deno.env.get('SUPABASE_URL'), serviceKey(), { auth: { persistSession: false } });
const UUID = /^[0-9a-f-]{36}$/;
// Игровой код работает с общими переменными (S.d, часовой пояс, погода), поэтому запросы
// внутри одного экземпляра функции выполняются строго по очереди
let queue = Promise.resolve();
const exclusive = fn => { const p = queue.then(fn, fn); queue = p.catch(() => {}); return p; };
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const verCmp = (a, b) => {
  const pa = String(a || '0').split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return Math.sign(d); }
  return 0;
};

/* ---------- Казна: покупка златников через ЮKassa ----------
   Секреты задаёт владелец в Supabase → Edge Functions → Secrets:
     YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY — магазин ЮKassa (для проверки — тестовый магазин);
     PAY_RECEIPT=on — передавать чек по 54-ФЗ (тогда игрок вводит почту);
     PAY_RETURN_URL — куда вернуть игрока после оплаты (по умолчанию paid.html сайта игры).
   Телефону не верим: пакет, сумма и число златников — из Rules.PAY; итог платежа сервер
   сам спрашивает у ЮKassa (sync), а начисляет его действие игры payClaim. */
const PAY = {
  shop: Deno.env.get('YOOKASSA_SHOP_ID') || '',
  key: Deno.env.get('YOOKASSA_SECRET_KEY') || '',
  receipt: Deno.env.get('PAY_RECEIPT') === 'on',
  ret: Deno.env.get('PAY_RETURN_URL') || 'https://duholov.ru/paid.html',
};
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
async function yk(method, path, body, idem) {
  const r = await fetch('https://api.yookassa.ru/v3' + path, {
    method,
    headers: { Authorization: 'Basic ' + btoa(`${PAY.shop}:${PAY.key}`), 'Content-Type': 'application/json', ...(idem ? { 'Idempotence-Key': idem } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`ЮKassa ${r.status}: ${j.description || j.code || ''}`);
  return j;
}
const Pay = {
  on() { return !!(PAY.shop && PAY.key); },
  async handle(uid, op, a) {
    if (op === 'info') return { ok: true, on: this.on(), receipt: PAY.receipt };
    if (!this.on()) return { ok: false, error: 'Покупки пока не подключены' };
    try {
      if (op === 'create') return await this.create(uid, a || {});
      if (op === 'sync') return await this.sync(uid);
    } catch (e) {
      console.error('Казна:', String(e));
      return { ok: false, error: 'Платёжный сервис не ответил — попробуй чуть позже' };
    }
    return { ok: false, error: 'Неизвестная операция' };
  },
  async create(uid, a) {
    const pack = Rules.PAY.find(p => p.id === a.pack);
    if (!pack) return { ok: false, error: 'Такого набора нет' };
    const email = String(a.email || '').trim();
    if (PAY.receipt && !EMAIL.test(email)) return { ok: false, error: 'Укажи почту — на неё придёт чек' };
    const since = new Date(Date.now() - 3600000).toISOString();
    const { count } = await db.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('created_at', since);
    if ((count || 0) >= 10) return { ok: false, error: 'Слишком много попыток оплаты — подожди немного' };
    const amount = pack.rub.toFixed(2), title = `${pack.zlat} златников — «Духолов»`;
    const row = must(await db.from('payments').insert({ user_id: uid, pack: pack.id, zlat: pack.zlat, amount }).select('id').single());
    const p = await yk('POST', '/payments', {
      amount: { value: amount, currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: PAY.ret },
      description: title,
      metadata: { order_id: row.id, user_id: uid, pack: pack.id },
      ...(PAY.receipt ? { receipt: { customer: { email }, items: [{ description: title, quantity: '1.00', amount: { value: amount, currency: 'RUB' },
        vat_code: 1, payment_mode: 'full_payment', payment_subject: 'service' }] } } : {}),
    }, row.id);
    must(await db.from('payments').update({ ext_id: p.id, status: p.status, updated_at: new Date().toISOString() }).eq('id', row.id));
    if (!p.confirmation || !p.confirmation.confirmation_url) return { ok: false, error: 'Платёжный сервис не выдал страницу оплаты' };
    return { ok: true, order: row.id, url: p.confirmation.confirmation_url };
  },
  // Спросить у ЮKassa итог незавершённых оплат игрока (за 3 дня); остальные доводит уведомление ЮKassa (notify)
  async sync(uid) {
    const since = new Date(Date.now() - 3 * 86400000).toISOString();
    const rows = must(await db.from('payments').select('id, ext_id, amount, status, credited').eq('user_id', uid)
      .in('status', ['pending', 'waiting_for_capture']).not('ext_id', 'is', null).gte('created_at', since).limit(20)) || [];
    for (const r of rows) await this.refresh(r);
    const { count } = await db.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'succeeded').eq('credited', false);
    const { count: open } = await db.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', uid).in('status', ['pending', 'waiting_for_capture']).gte('created_at', since);
    return { ok: true, paid: count || 0, open: open || 0 };
  },
  // Итог платежа — только из ответа ЮKassa (платёж должен быть именно этим заказом и на эту сумму)
  async refresh(r) {
    const p = await yk('GET', `/payments/${encodeURIComponent(r.ext_id)}`);
    const same = p.metadata && p.metadata.order_id === r.id && p.amount && (+p.amount.value).toFixed(2) === (+r.amount).toFixed(2) && p.amount.currency === 'RUB';
    let status = !same ? 'failed' : p.status === 'succeeded' && p.paid ? 'succeeded' : p.status;
    if (same && p.refunded_amount && +p.refunded_amount.value > 0) status = 'refunded';
    if (status === r.status) return status;
    // возврат уже начисленного платежа — владельцу видно в журнале (списывать златники вручную по обращению)
    if (status === 'refunded' && r.credited) console.error(`Казна: возврат начисленного платежа ${r.id}`);
    // вернувшийся платёж больше не начисляется; начисленный остаётся «начисленным»
    must(await db.from('payments').update({ status, method: p.payment_method ? String(p.payment_method.type).slice(0, 40) : null, updated_at: new Date().toISOString() }).eq('id', r.id));
    return status;
  },
  // 4.1: HTTP-уведомление ЮKassa (Интеграция → HTTP-уведомления: https://api.duholov.ru/functions/v1/game/yookassa).
  // Телу уведомления не верим — берём из него только номер платежа и сами спрашиваем ЮKassa.
  async notify(body) {
    if (!this.on() || !body || !body.object) return;
    const ext = String((String(body.event || '').startsWith('refund.') ? body.object.payment_id : body.object.id) || '').slice(0, 64);
    if (!/^[0-9a-f-]{20,64}$/i.test(ext)) return;
    const r = must(await db.from('payments').select('id, ext_id, amount, status, credited').eq('ext_id', ext).maybeSingle());
    if (r) await this.refresh(r);
  },
};

/* ---------- Вход через сервисы (3.27): Google, Яндекс, VK, Telegram ----------
   Игрок всегда сначала гость (анонимный вход Supabase). «Войти через …» — сервер сам проверяет вход у сервиса и:
   · если этот вход ещё ни к кому не привязан — привязывает его к текущему игроку (таблица auth_links) и превращает
     гостя в постоянную учётную запись (служебная почта в зоне .invalid — письма на неё доставить нельзя);
   · если привязан к другому игроку (новое устройство) — выдаёт одноразовый вход в его учётную запись (token_hash).
   Настройки владелец задаёт в Supabase → Edge Functions → Secrets (публичные номера приложений уходят клиенту, секреты — нет):
     GOOGLE_CLIENT_ID · YANDEX_CLIENT_ID · VK_CLIENT_ID · TELEGRAM_BOT_TOKEN. Не задан — сервиса нет в списке. */
const AUTHP = {
  google: Deno.env.get('GOOGLE_CLIENT_ID') || '',
  yandex: Deno.env.get('YANDEX_CLIENT_ID') || '',
  vk: Deno.env.get('VK_CLIENT_ID') || '',
  telegram: Deno.env.get('TELEGRAM_BOT_TOKEN') || '',
};
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const getJson = async (url, init) => {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(12000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.error || `ответ ${r.status}`);
  return j;
};
const Auth = {
  // публичные параметры для кнопок входа: номера приложений (не секреты)
  providers() {
    const p = {};
    if (AUTHP.google) p.google = { client_id: AUTHP.google };
    if (AUTHP.yandex) p.yandex = { client_id: AUTHP.yandex };
    if (AUTHP.vk) p.vk = { client_id: AUTHP.vk };
    if (AUTHP.telegram) p.telegram = { bot_id: AUTHP.telegram.split(':')[0] };
    return p;
  },
  // Проверка входа у сервиса → { sub, name }
  async verify(provider, a) {
    if (provider === 'google') {
      const t = await getJson('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(a.id_token || '')));
      if (t.aud !== AUTHP.google || !['accounts.google.com', 'https://accounts.google.com'].includes(t.iss) || +t.exp * 1000 < Date.now()) throw new Error('вход Google не подтверждён');
      if (!a.nonce || t.nonce !== a.nonce) throw new Error('вход Google не подтверждён');
      return { sub: String(t.sub), name: t.name || t.email || 'Google' };
    }
    if (provider === 'yandex') {
      const t = await getJson('https://login.yandex.ru/info?format=json', { headers: { Authorization: 'OAuth ' + String(a.access_token || '') } });
      if (String(t.client_id) !== AUTHP.yandex || !t.id) throw new Error('вход Яндекса не подтверждён'); // токен выдан именно нашему приложению
      return { sub: String(t.id), name: t.display_name || t.real_name || t.login || 'Яндекс' };
    }
    if (provider === 'vk') {
      const form = new URLSearchParams({ grant_type: 'authorization_code', code: String(a.code || ''), code_verifier: String(a.code_verifier || ''),
        client_id: AUTHP.vk, device_id: String(a.device_id || ''), redirect_uri: String(a.redirect_uri || ''), state: String(a.state || '') });
      const t = await getJson('https://id.vk.com/oauth2/auth', { method: 'POST', body: form });
      if (!t.user_id || !t.access_token) throw new Error('вход VK не подтверждён');
      let name = 'VK';
      try {
        const u = await getJson('https://id.vk.com/oauth2/user_info', { method: 'POST', body: new URLSearchParams({ client_id: AUTHP.vk, access_token: t.access_token }) });
        if (u.user) name = [u.user.first_name, u.user.last_name].filter(Boolean).join(' ') || name;
      } catch { /* имя не обязательно */ }
      return { sub: String(t.user_id), name };
    }
    if (provider === 'telegram') {
      // подпись Telegram Login: HMAC-SHA256 от строк «ключ=значение» (по алфавиту, без hash) на ключе SHA256(токена бота)
      const d = a.data && typeof a.data === 'object' ? a.data : {};
      if (!d.id || !d.hash || !d.auth_date) throw new Error('вход Telegram не подтверждён');
      if (Date.now() / 1000 - +d.auth_date > 86400) throw new Error('вход Telegram устарел — попробуй ещё раз');
      const check = Object.keys(d).filter(k => k !== 'hash').sort().map(k => `${k}=${d[k]}`).join('\n');
      const secret = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(AUTHP.telegram));
      const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(check)));
      if (sig !== String(d.hash)) throw new Error('вход Telegram не подтверждён');
      return { sub: String(d.id), name: [d.first_name, d.last_name].filter(Boolean).join(' ') || (d.username ? '@' + d.username : 'Telegram') };
    }
    throw new Error('Такого способа входа нет');
  },
  async handle(uid, op, a) {
    if (op === 'info') {
      const links = must(await db.from('auth_links').select('provider, name, created_at').eq('user_id', uid)) || [];
      return { ok: true, providers: this.providers(), links };
    }
    if (op !== 'signin') return { ok: false, error: 'Неизвестная операция' };
    const provider = String(a.provider || '');
    if (!this.providers()[provider]) return { ok: false, error: 'Этот способ входа пока не подключён' };
    let who;
    try { who = await this.verify(provider, a.proof || {}); }
    catch (e) { console.warn('Вход:', provider, String(e)); return { ok: false, error: `Не удалось войти: ${String(e.message || e).slice(0, 120)}` }; }
    const name = String(who.name).slice(0, 60);
    const row = must(await db.from('auth_links').select('user_id').eq('provider', provider).eq('subject', who.sub).maybeSingle());
    if (row && row.user_id === uid) return { ok: true, linked: true, already: true };
    if (row) {
      // вход уже привязан к другому Ловчему — одноразовый вход в его учётную запись
      const { data: u, error } = await db.auth.admin.getUserById(row.user_id);
      if (error || !u || !u.user || !u.user.email) return { ok: false, error: 'Учётная запись не найдена' };
      const { data: link, error: le } = await db.auth.admin.generateLink({ type: 'magiclink', email: u.user.email });
      if (le || !link || !link.properties) return { ok: false, error: 'Не удалось войти — попробуй ещё раз' };
      const s = must(await db.from('saves').select('name:data->name, level:data->level').eq('user_id', row.user_id).maybeSingle());
      return { ok: true, switch: true, token_hash: link.properties.hashed_token, player: s ? { name: String(s.name || 'Ловчий').slice(0, 20), level: +s.level || 1 } : null };
    }
    // новый вход — привязываем к текущему игроку; гость становится постоянной учётной записью
    const { data: me } = await db.auth.admin.getUserById(uid);
    if (me && me.user && !me.user.email) {
      const { error } = await db.auth.admin.updateUserById(uid, { email: `u${uid.replace(/-/g, '')}@users.duholov.invalid`, email_confirm: true });
      if (error) { console.error('Вход: почта', String(error.message)); return { ok: false, error: 'Не удалось сохранить вход — попробуй ещё раз' }; }
    }
    const { error: ie } = await db.from('auth_links').insert({ provider, subject: who.sub, user_id: uid, name });
    if (ie) return { ok: false, error: /duplicate/i.test(ie.message) ? 'Этот вход уже привязан — попробуй ещё раз' : 'Не удалось сохранить вход' };
    return { ok: true, linked: true, name };
  },
};

// Доступ к общим таблицам для GameCore (от имени сервера, в пределах одного игрока uid)
function makeEnv(uid) {
  return {
    async poi(id) { return must(await db.from('pois').select('id, kind, lat, lng, name, photo, active').eq('id', id).maybeSingle()); },
    // Есть ли в округе (~1 км) места, загруженные импортом OpenStreetMap
    async poiCovered(lat, lng) {
      const dLng = 0.011 / Math.max(0.2, Math.cos(lat * Math.PI / 180));
      const rows = must(await db.from('pois').select('id').eq('imported', true)
        .gte('lat', lat - 0.011).lte('lat', lat + 0.011).gte('lng', lng - dLng).lte('lng', lng + dLng).limit(1));
      return !!(rows && rows.length);
    },
    async registerPid(pid) {
      const row = must(await db.from('players').select('user_id').eq('pid', pid).maybeSingle());
      if (row && row.user_id === uid) return 'ok';
      if (row) return 'taken';
      must(await db.from('players').delete().eq('user_id', uid));
      must(await db.from('players').insert({ pid, user_id: uid }));
      return 'ok';
    },
    async player(pid) {
      const p = must(await db.from('players').select('user_id').eq('pid', pid).maybeSingle());
      if (!p) return null;
      const s = must(await db.from('saves').select('data->name, data->level').eq('user_id', p.user_id).maybeSingle());
      return s ? { name: String(s.name || 'Ловчий').slice(0, 20), level: +s.level || 1 } : null;
    },
    // Сохранение другого Ловчего (для профиля друга; взаимность проверяет GameCore)
    async friendSave(pid) {
      const p = must(await db.from('players').select('user_id').eq('pid', pid).maybeSingle());
      if (!p) return null;
      const s = must(await db.from('saves').select('data, updated_at').eq('user_id', p.user_id).maybeSingle());
      return s ? { data: s.data, seen: s.updated_at } : null;
    },
    async link(from, to, name, level) {
      must(await db.from('friend_links').upsert({ from_pid: from, to_pid: to, from_name: String(name).slice(0, 20), from_level: level, created_at: new Date().toISOString() }, { onConflict: 'from_pid,to_pid' }));
    },
    async linksTo(pid) { return must(await db.from('friend_links').select('from_pid, from_name, from_level, created_at').eq('to_pid', pid).limit(200)) || []; },
    async giftsTo(pid) {
      return must(await db.from('gifts').select('id, from_pid, from_name, created_at, invite:contents->invite').eq('to_pid', pid).is('opened_at', null).order('created_at').limit(50)) || [];
    },
    // Сколько подарков «за приглашение» уже получил игрок
    async invitesTo(pid) {
      const { count, error } = await db.from('gifts').select('id', { count: 'exact', head: true }).eq('to_pid', pid).eq('contents->>invite', '1');
      if (error) throw new Error(error.message);
      return count || 0;
    },
    async giftCreate(from, to, name, contents) { must(await db.from('gifts').insert({ from_pid: from, to_pid: to, from_name: String(name).slice(0, 20), contents })); },
    async gift(id) { return UUID.test(id) ? must(await db.from('gifts').select('*').eq('id', id).maybeSingle()) : null; },
    async giftTake(id, pid) {
      const rows = must(await db.from('gifts').update({ opened_at: new Date().toISOString() }).eq('id', id).eq('to_pid', pid).is('opened_at', null).select('id'));
      return rows && rows.length > 0;
    },
    async tradeCreate(code, pid, name, spirit) { must(await db.from('trades').insert({ code, from_pid: pid, from_name: String(name).slice(0, 20), spirit })); },
    async tradeTake(code, pid) {
      const t = must(await db.from('trades').select('*').eq('code', code).maybeSingle());
      if (!t || t.taken_by) return null;
      if (t.from_pid === pid) return { own: true };
      const rows = must(await db.from('trades').update({ taken_by: pid, taken_at: new Date().toISOString() }).eq('code', code).is('taken_by', null).select('code'));
      return rows && rows.length ? t : null;
    },
    // Чат: последние 50 сообщений канала (или новые после after); отправка; жалоба (после 3 — сообщение скрыто)
    async chatList(channel, after) {
      let q = db.from('chat_messages').select('id, pid, name, lvl, clan, text, created_at').eq('channel', channel).eq('hidden', false);
      if (after) q = q.gt('id', after);
      const rows = must(await q.order('id', { ascending: false }).limit(50)) || [];
      return rows.reverse();
    },
    async chatInsert(row) {
      if (Math.random() < 0.02) await db.from('chat_messages').delete().lt('created_at', new Date(Date.now() - 7 * 86400000).toISOString()); // старше недели
      return must(await db.from('chat_messages').insert({ ...row, uid }).select('id, pid, name, lvl, clan, text, created_at').single());
    },
    async chatReport(id, pid) {
      const { error } = await db.from('chat_reports').insert({ message_id: id, reporter: pid });
      if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
      const { count } = await db.from('chat_reports').select('message_id', { count: 'exact', head: true }).eq('message_id', id);
      if ((count || 0) >= 3) must(await db.from('chat_messages').update({ hidden: true }).eq('id', id));
      return count || 0;
    },
    // 3.21: текущие имя, уровень, дружина и облик Ловчих — прямо из их сохранений (по user_id или по коду игрока)
    async briefByUid(uids) {
      const out = {};
      if (!uids.length) return out;
      const rows = must(await db.from('saves').select('user_id, name:data->name, level:data->level, clan:data->clan, look:data->look').in('user_id', uids)) || [];
      rows.forEach(r => { out[r.user_id] = { name: r.name, level: r.level, clan: r.clan, look: r.look }; });
      return out;
    },
    async briefByPid(pids) {
      const out = {};
      if (!pids.length) return out;
      const ps = must(await db.from('players').select('pid, user_id').in('pid', pids)) || [];
      const by = await this.briefByUid(ps.map(p => p.user_id));
      ps.forEach(p => { if (by[p.user_id]) out[p.pid] = by[p.user_id]; });
      return out;
    },
    // Таблица сезона: топ-50 с текущими данными Ловчих, сколько всего участников и место игрока, если он ниже
    // tier — тройка лучших в ранге rank (пьедестал)
    async leagueTop(season, rank) {
      const q = () => db.from('league_scores').select('user_id, name, stars, rank, level, look, updated_at').eq('season', season);
      const rows = must(await q().order('stars', { ascending: false }).order('updated_at', { ascending: true }).limit(50)) || [];
      const tier = must(await q().eq('rank', rank | 0).order('stars', { ascending: false }).order('updated_at', { ascending: true }).limit(3)) || [];
      const uids = [...new Set(rows.concat(tier).map(r => r.user_id))];
      const ps = uids.length ? must(await db.from('players').select('pid, user_id').in('user_id', uids)) || [] : [];
      const pid = {}; ps.forEach(p => { pid[p.user_id] = p.pid; });
      const cur = await this.briefByUid(uids);
      const view = r => ({ ...r, pid: pid[r.user_id] || null, me: r.user_id === uid, cur: cur[r.user_id] || null });
      const { count: total, error } = await db.from('league_scores').select('user_id', { count: 'exact', head: true }).eq('season', season);
      if (error) throw new Error(error.message);
      let me = null;
      if (!rows.some(r => r.user_id === uid)) {
        const my = must(await db.from('league_scores').select('stars, updated_at').eq('season', season).eq('user_id', uid).maybeSingle());
        if (my) {
          const { count } = await db.from('league_scores').select('user_id', { count: 'exact', head: true }).eq('season', season)
            .or(`stars.gt.${my.stars | 0},and(stars.eq.${my.stars | 0},updated_at.lt."${my.updated_at}")`);
          me = { place: (count || 0) + 1, stars: my.stars };
        }
      }
      return { rows: rows.map(view), tier: tier.map(view), total: total || 0, me };
    },
    // 3.18: неоткрытую посылку забирает сам отправитель (передача духов закрыта)
    async tradeReclaim(code, pid) {
      const rows = must(await db.from('trades').update({ taken_by: pid, taken_at: new Date().toISOString() }).eq('code', code).eq('from_pid', pid).is('taken_by', null).select('*'));
      return rows && rows[0] || null;
    },
    async mySubmissions() {
      return must(await db.from('poi_submissions').select('id, name, status, reason').eq('user_id', uid).order('created_at', { ascending: false }).limit(50)) || [];
    },
    async leagueScore(x) {
      must(await db.from('league_scores').upsert({ user_id: uid, season: x.season, name: String(x.name).slice(0, 20), stars: Math.min(1000, x.stars), rank: x.rank,
        level: x.level, look: x.look, updated_at: new Date().toISOString() }, { onConflict: 'user_id,season' }));
    },
    // Общее дело Ордена: вклад игрока за неделю (n только растёт) и итоги недели
    async orderPut(x) {
      must(await db.from('order_players').upsert({ week: x.week, pid: x.pid, name: String(x.name).slice(0, 20), n: Math.min(1e6, x.n), updated_at: new Date().toISOString() }, { onConflict: 'week,pid' }));
    },
    async orderStats(week, pid) { return must(await db.rpc('order_stats', { p_week: week, p_pid: pid })); },
    // Дружины: кто держит Капище, поставить защитника, освободить после победы, сколько Капищ держит игрок
    async holdGet(poi) {
      const r = must(await db.from('shrine_holds').select('clan, holders, ver').eq('poi_id', poi).maybeSingle());
      return r && Array.isArray(r.holders) && r.holders.length ? r : null;
    },
    async holdDefend(poi, lat, lng, clan, holder) { return !!must(await db.rpc('shrine_defend', { p_poi: poi, p_lat: lat, p_lng: lng, p_clan: clan, p_holder: holder })); },
    async holdDefeat(poi, ver) { return !!must(await db.rpc('shrine_defeat', { p_poi: poi, p_ver: ver })); },
    async myHolds(pid) {
      const { count, error } = await db.from('shrine_holds').select('poi_id', { count: 'exact', head: true }).contains('holders', JSON.stringify([{ pid }]));
      if (error) throw new Error(error.message);
      return count || 0;
    },
    // Капища, где стоят защитники игрока: название — из таблицы мест
    async myHoldsList(pid) {
      const rows = must(await db.from('shrine_holds').select('poi_id, lat, lng, holders').contains('holders', JSON.stringify([{ pid }])).limit(HOLD_MY_MAX + 5)) || [];
      const ids = rows.map(r => r.poi_id);
      const names = ids.length ? must(await db.from('pois').select('id, name').in('id', ids)) || [] : [];
      return rows.map(r => {
        const h = (r.holders || []).find(x => x.pid === pid) || {};
        const p = names.find(x => x.id === r.poi_id);
        return { id: r.poi_id, name: p ? p.name : 'Капище', lat: r.lat, lng: r.lng, sid: h.sp && h.sp.sid, sp: h.sp || null, t: h.t || null, n: (r.holders || []).length };
      });
    },
    // Сколько Капищ держит каждая дружина (во всей стране или в прямоугольнике [s, w, n, e])
    async clanCounts(box) {
      const out = {};
      for (const k of Object.keys(CLANS)) {
        let q = db.from('shrine_holds').select('poi_id', { count: 'exact', head: true }).eq('clan', k).neq('holders', '[]');
        if (box) q = q.gte('lat', box[0]).lte('lat', box[2]).gte('lng', box[1]).lte('lng', box[3]);
        const { count, error } = await q;
        if (error) throw new Error(error.message);
        out[k] = count || 0;
      }
      return out;
    },
    // Совместные разломы: комнаты (код, участники, начало боя)
    async roomCreate(row) {
      await db.from('raid_rooms').delete().lt('created_at', new Date(Date.now() - 86400000).toISOString()); // старые комнаты
      const { data, error } = await db.from('raid_rooms').insert(row).select('*').maybeSingle();
      if (error) { if (/duplicate/i.test(error.message)) return null; throw new Error(error.message); }
      return data;
    },
    async roomGet(code) { return must(await db.from('raid_rooms').select('*').eq('code', code).maybeSingle()); },
    async roomJoin(code, member) { return must(await db.rpc('raid_room_join', { p_code: code, p_member: member })); },
    async roomStart(code, pid) {
      const rows = must(await db.from('raid_rooms').update({ status: 'started', started_at: new Date().toISOString() })
        .eq('code', code).eq('host_pid', pid).eq('status', 'lobby').select('*'));
      return rows && rows[0] || null;
    },
    async roomLeave(code, pid) { must(await db.rpc('raid_room_leave', { p_code: code, p_pid: pid })); },
    // Аукцион. Смена статуса — одним условным update (гонка двух покупателей невозможна);
    // если update ничего не нашёл, но лот уже «мой» и не выдан — возвращаем его (повтор запроса после сбоя сохранения)
    async lotCreate(row) { return must(await db.from('auction_lots').insert({ ...row, seller_uid: uid }).select('*').single()); },
    async lotsFind(f) {
      let q = db.from('auction_lots').select('id, seller_name, spirit, sid, lvl, power, iv_pct, iv_a, iv_d, iv_s, shiny, cur, price, expires_at')
        .eq('status', 'open').gt('expires_at', new Date().toISOString());
      if (f.sids) q = q.in('sid', f.sids);
      if (f.el) q = q.eq('el', f.el);
      if (f.rar) q = q.eq('rar', f.rar);
      if (f.cur) q = q.eq('cur', f.cur);
      if (f.shiny) q = q.eq('shiny', true);
      for (const [k, col] of [['minIv', 'iv_pct'], ['minA', 'iv_a'], ['minD', 'iv_d'], ['minS', 'iv_s'], ['minPower', 'power'], ['minLvl', 'lvl']]) if (f[k]) q = q.gte(col, f[k]);
      if (f.maxPrice) q = q.lte('price', f.maxPrice);
      if (f.notPid) q = q.neq('seller_pid', f.notPid);
      const [col, asc] = { new: ['created_at', false], cheap: ['price', true], dear: ['price', false], power: ['power', false], iv: ['iv_pct', false] }[f.sort] || ['created_at', false];
      return must(await q.order(col, { ascending: asc }).order('id').range(f.from, f.from + 29)) || [];
    },
    async lotsMine(pid) {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      return must(await db.from('auction_lots').select('id, spirit, sid, lvl, power, iv_pct, cur, price, status, buyer_name, created_at, expires_at, closed_at, settled')
        .eq('seller_pid', pid).or(`status.eq.open,created_at.gte."${since}"`).order('created_at', { ascending: false }).limit(40)) || [];
    },
    async lotsOpenCount(pid) {
      const { count, error } = await db.from('auction_lots').select('id', { count: 'exact', head: true }).eq('seller_pid', pid).eq('status', 'open');
      if (error) throw new Error(error.message);
      return count || 0;
    },
    async lotBuy(id, pid, name) {
      if (!UUID.test(id)) return null;
      const now = new Date().toISOString();
      const rows = must(await db.from('auction_lots').update({ status: 'sold', buyer_pid: pid, buyer_name: String(name).slice(0, 20), closed_at: now })
        .eq('id', id).eq('status', 'open').gt('expires_at', now).neq('seller_pid', pid).select('*'));
      if (rows && rows[0]) return rows[0];
      return must(await db.from('auction_lots').select('*').eq('id', id).eq('status', 'sold').eq('buyer_pid', pid).eq('delivered', false).maybeSingle());
    },
    async lotGet(id) { return UUID.test(id) ? must(await db.from('auction_lots').select('id, seller_pid, status, cur, price, expires_at').eq('id', id).maybeSingle()) : null; },
    async lotCancel(id, pid) {
      if (!UUID.test(id)) return null;
      const rows = must(await db.from('auction_lots').update({ status: 'cancelled', closed_at: new Date().toISOString() })
        .eq('id', id).eq('seller_pid', pid).eq('status', 'open').select('*'));
      if (rows && rows[0]) return rows[0];
      return must(await db.from('auction_lots').select('*').eq('id', id).eq('seller_pid', pid).eq('status', 'cancelled').eq('settled', false).maybeSingle());
    },
    // Итоги для продавца: истёкшие лоты закрываются; проданные, снятые и истёкшие — ещё не рассчитанные
    async lotsToSettle(pid) {
      const now = new Date().toISOString();
      must(await db.from('auction_lots').update({ status: 'expired', closed_at: now }).eq('seller_pid', pid).eq('status', 'open').lt('expires_at', now));
      return must(await db.from('auction_lots').select('*').eq('seller_pid', pid).eq('settled', false).in('status', ['sold', 'cancelled', 'expired']).limit(50)) || [];
    },
    async lotsDone(ids, field) { if (ids.length) must(await db.from('auction_lots').update({ [field]: true }).in('id', ids)); },
    // Казна: оплаченные, но ещё не начисленные наборы златников; отметка «начислено»
    async paidList() { return must(await db.from('payments').select('id, pack, zlat').eq('user_id', uid).eq('status', 'succeeded').eq('credited', false).limit(50)) || []; },
    async payCredited(ids) { must(await db.from('payments').update({ credited: true, updated_at: new Date().toISOString() }).eq('user_id', uid).in('id', ids)); },
    async deleteSave() {
      must(await db.from('saves').delete().eq('user_id', uid));
      must(await db.from('save_srv').delete().eq('user_id', uid));
    },
  };
}

// Защита от перебора и наводнения запросами: не больше FLOOD запросов в минуту от одного игрока
// и не больше BAD_TOKENS неверных входов в минуту с одного адреса (в пределах экземпляра функции)
const FLOOD = 150, BAD_TOKENS = 20;
// Замок игрока на время запроса: сам истекает через LOCK_MS (если функция упала); ждём его до LOCK_TRIES × 200 мс
const LOCK_MS = 30000, LOCK_TRIES = 25;
const hits = new Map(), badTokens = new Map(), errHits = new Map();
const tooMany = (map, key, max) => {
  const now = Date.now(), m = Math.floor(now / 60000);
  const h = map.get(key);
  if (!h || h.m !== m) { map.set(key, { m, n: 1 }); if (map.size > 20000) map.clear(); return false; }
  return ++h.n > max;
};

// Контуры (3.22.1): код функции один и тот же, а с каких страниц её можно вызывать — задаёт секрет проекта
// ALLOWED_ORIGINS (через запятую). Боевой проект — только сайт игры (так по умолчанию), тестовый — только localhost.
// Запросы не из браузера (без заголовка Origin) проверяются как обычно — по входу игрока.
const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'https://duholov.ru,https://quinsiege.github.io').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
// Закрытый контур (тестовый проект): секрет ACCESS_KEY — без заголовка x-duholov-access с этим ключом запросы
// отклоняются (Origin подделывает любой скрипт, а адрес и публичный ключ проекта лежат в открытом репозитории).
// В боевом проекте секрет не задан — игра открыта всем.
const ACCESS = Deno.env.get('ACCESS_KEY') || '';
const sameKey = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

Deno.serve(async req => {
  const origin = req.headers.get('origin');
  const allowed = !origin || ORIGINS.includes(origin);
  const headers = { ...CORS, 'Access-Control-Allow-Origin': allowed && origin ? origin : ORIGINS[0], Vary: 'Origin' };
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  // уведомление ЮKassa о платеже: итог проверяем сами (Pay.notify); при сбое — 500, и ЮKassa повторит уведомление позже
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/yookassa')) {
    try { await Pay.notify(await req.json().catch(() => null)); return new Response('ok'); }
    catch (e) { console.error('Казна, уведомление:', String(e)); return new Response('retry', { status: 500 }); }
  }
  if (!allowed) return reply({ ok: false, error: 'Этот сервер игры не принимает запросы с этой страницы' }, 403);
  // 4.1: ошибка из браузера игрока (www/js/errors.js) — в client_errors; не больше 20 в минуту с адреса, хранится 14 дней
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/log')) {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    if (tooMany(errHits, ip, 20)) return reply({ ok: false }, 429);
    const b = await req.json().catch(() => null), s = (x, n) => String((x == null ? '' : x)).slice(0, n);
    if (b && b.msg) {
      const { error } = await db.from('client_errors').insert({ v: s(b.v, 20), page: s(b.page, 100), msg: s(b.msg, 500), src: s(b.src, 200),
        line: Number.isFinite(+b.line) ? +b.line | 0 : null, stack: s(b.stack, 2000), ua: s(req.headers.get('user-agent'), 300) });
      if (error) console.error('client_errors:', error.message);
      if (Math.random() < 0.01) await db.from('client_errors').delete().lt('at', new Date(Date.now() - 14 * 86400000).toISOString());
    }
    return reply({ ok: true });
  }
  if (ACCESS && !sameKey(req.headers.get('x-duholov-access') || '', ACCESS)) return reply({ ok: false, error: 'Закрытый контур: нужен ключ доступа' }, 403);
  if (req.method !== 'POST') return reply({ ok: false, error: 'POST only' }, 405);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const bad = badTokens.get(ip);
  if (bad && bad.m === Math.floor(Date.now() / 60000) && bad.n > BAD_TOKENS) return reply({ ok: false, error: 'Слишком много попыток — подожди минуту' }, 429);
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const who = token ? (await db.auth.getUser(token)).data : null;
  if (!who || !who.user) { tooMany(badTokens, ip, BAD_TOKENS); return reply({ ok: false, error: 'Нужен вход в игру', auth: true }, 401); }
  const uid = who.user.id;
  if (tooMany(hits, uid, FLOOD)) return reply({ ok: false, error: 'Слишком много запросов — подожди минуту' }, 429);
  let body;
  try { body = await req.json(); } catch { return reply({ ok: false, error: 'Некорректный запрос' }, 400); }
  if (verCmp(body.v, GameCore.MIN_CLIENT) < 0) return reply({ ok: false, upgrade: true, error: 'Вышла новая версия игры — обнови её' });
  // Казна: создать оплату / узнать итог — вне очереди игровых действий (ждём ответа ЮKassa)
  if (body.pay) return reply(await Pay.handle(uid, String(body.pay), body.args));
  // Вход через сервисы: список, привязка и переключение учётной записи — тоже вне очереди игровых действий
  if (body.auth) { try { return reply(await Auth.handle(uid, String(body.auth), body.args || {})); } catch (e) { console.error('Вход:', String(e)); return reply({ ok: false, error: 'Ошибка входа — попробуй ещё раз' }, 500); } }
  const env = makeEnv(uid);

  // 4.1: действия одного игрока выполняются строго по очереди — на всех экземплярах функции (замок в базе, 017_request_lock.sql).
  // Прогресс и служебные данные сервера записываются одной транзакцией вместе со снятием замка.
  const tok = crypto.randomUUID();
  let locked = false;
  const release = async srv => {
    if (!locked) return;
    locked = false;
    const { error } = await db.rpc('game_release', { p_uid: uid, p_token: tok, p_srv: srv || null });
    if (error) console.error('Замок:', error.message);
  };
  try {
    let got = null;
    for (let i = 0; i < LOCK_TRIES; i++) {
      got = must(await db.rpc('game_begin', { p_uid: uid, p_token: tok, p_ms: LOCK_MS }));
      if (got && !got.locked) break;
      await new Promise(r => setTimeout(r, 200));
    }
    if (!got || got.locked) return reply({ ok: false, error: 'Предыдущее действие ещё выполняется — повтори' });
    locked = true;
    const row = got.row, srv = got.srv || {};
    if (row && row.moved_to) return reply({ ok: false, moved: true, error: 'Прогресс перенесён на другое устройство' });
    const res = await exclusive(() => GameCore.run(body, { data: row ? row.data : null, srv }, env));
    if (!res.ok) {
      if (res.rl) await release({ ...srv, rl: res.rl });
      return reply({ ok: false, error: res.error, rev: row ? row.rev : 0 });
    }
    if (res.reset) return reply({ ok: true, reset: true, results: res.results, events: [], now: res.now });
    const rev = must(await db.rpc('game_commit', { p_uid: uid, p_token: tok, p_rev: row ? row.rev : 0, p_data: res.data || null, p_srv: res.srv,
      p_ver: String(body.v || '').slice(0, 20) }));
    if (rev == null) return reply({ ok: false, error: 'Прогресс изменился на другом устройстве — повтори действие' });
    locked = false; // замок снят вместе с сохранением
    for (const fn of res.after) { try { await fn(); } catch (e) { console.error('после сохранения:', String(e)); } }
    // разница — только если телефон знает предыдущую версию прогресса
    const patch = !res.full && row && body.rev === row.rev ? Diff.make(row.data, res.data) : null;
    return reply({ ok: true, rev, patch, data: patch ? undefined : res.data, results: res.results, events: res.events, now: res.now });
  } catch (e) {
    console.error(String(e && e.stack || e));
    return reply({ ok: false, error: 'Ошибка сервера — попробуй ещё раз' }, 500);
  } finally {
    await release();
  }
});
