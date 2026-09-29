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
// 4.3: запросы разных игроков выполняются одновременно — у каждого свои поля игрового кода (GameCore.isolate)
GameCore.isolate(new AsyncLocalStorage());
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
// 4.16: защитник Капища на посту не дольше Rules.HOLD.MAX_H часов — раньше этого момента (мс) он уже ушёл
const holdCutoff = () => Date.now() - Rules.HOLD.MAX_H * 3600000;
const verCmp = (a, b) => {
  const pa = String(a || '0').split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return Math.sign(d); }
  return 0;
};

/* ---------- Казна: покупка монет через ЮKassa ----------
   Секреты задаёт владелец в Supabase → Edge Functions → Secrets:
     YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY — магазин ЮKassa (для проверки — тестовый магазин);
     PAY_RECEIPT=on — передавать чек по 54-ФЗ (тогда игрок вводит почту);
     PAY_RETURN_URL — куда вернуть игрока после оплаты (по умолчанию paid.html сайта игры).
   Телефону не верим: пакет, сумма и число монет — из Rules.PAY; итог платежа сервер
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
/* ---------- 4.27: Казна в версии для Google Play — покупки через Google Play Billing ----------
   Секрет GOOGLE_PLAY_SA — ключ сервисного аккаунта Google Cloud (JSON одной строкой, вписывает duholov-secrets), которому
   в Play Console выданы права на приложение («Просмотр финансовых данных», «Управление заказами и подписками»).
   Телефону не верим: сервер сам спрашивает Google Play Developer API о покупке — набор, состояние и владельца
   (obfuscatedExternalAccountId = хэш id игрока, его задаёт приложение при покупке), — начисляет (payClaim) и «потребляет» её.
   Возвраты: раз в час сервер смотрит отменённые покупки (voidedpurchases) и списывает начисленное (payRefund). */
const GPLAY = { pkg: 'ru.duholov.game', sa: null, tok: '', exp: 0, voidAt: 0 };
try { GPLAY.sa = JSON.parse(Deno.env.get('GOOGLE_PLAY_SA') || 'null'); } catch { console.error('GOOGLE_PLAY_SA: не JSON'); }
const b64u = bytes => btoa(typeof bytes === 'string' ? unescape(encodeURIComponent(bytes)) : String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// вход сервисного аккаунта: подписанный RS256 JWT → токен доступа (живёт час)
async function gpToken() {
  if (GPLAY.tok && Date.now() < GPLAY.exp) return GPLAY.tok;
  const sa = GPLAY.sa, now = Math.floor(Date.now() / 1000);
  const body = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64u(JSON.stringify({ iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const der = Uint8Array.from(atob(String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(body)));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(12000),
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: body + '.' + b64u(sig) }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('Google OAuth ' + r.status + ': ' + (j.error_description || j.error || ''));
  GPLAY.tok = j.access_token; GPLAY.exp = Date.now() + (Math.max(300, +j.expires_in || 3600) - 120) * 1000;
  return GPLAY.tok;
}
async function gp(method, path) {
  const r = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${GPLAY.pkg}${path}`,
    { method, headers: { Authorization: 'Bearer ' + await gpToken() }, signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Google Play ${r.status}: ${(j.error && j.error.message) || ''}`);
  return j;
}
// владелец покупки — хэш id игрока (сам id Google не отдаём)
const gpAcct = async uid => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('gplay:' + uid))).slice(0, 64);

const Pay = {
  on() { return !!(PAY.shop && PAY.key); },
  async handle(uid, op, a) {
    if (op === 'info') {
      if (GPLAY.sa && Date.now() - GPLAY.voidAt > 3600000) { GPLAY.voidAt = Date.now(); this.gplayVoided().catch(e => console.error('Google Play, возвраты:', String(e))); }
      return { ok: true, on: this.on(), receipt: PAY.receipt, gplay: GPLAY.sa ? { acct: await gpAcct(uid) } : null };
    }
    if (op === 'gplay') {
      if (!GPLAY.sa) return { ok: false, error: ru`Покупки через Google Play пока не подключены` };
      try { return await this.gplay(uid, a || {}); }
      catch (e) { console.error('Казна, Google Play:', String(e)); return { ok: false, error: ru`Google Play не ответил — покупка не пропадёт, проверим её позже` }; }
    }
    if (!this.on()) return { ok: false, error: ru`Покупки пока не подключены` };
    try {
      if (op === 'create') return await this.create(uid, a || {});
      if (op === 'sync') return await this.sync(uid);
      if (op === 'list') return await this.list(uid);
    } catch (e) {
      console.error('Казна:', String(e));
      return { ok: false, error: ru`Платёжный сервис не ответил — попробуй чуть позже` };
    }
    return { ok: false, error: ru`Неизвестная операция` };
  },
  async create(uid, a) {
    const pack = Rules.PAY.find(p => p.id === a.pack);
    if (!pack) return { ok: false, error: ru`Такого набора нет` };
    const email = String(a.email || '').trim();
    if (PAY.receipt && !EMAIL.test(email)) return { ok: false, error: ru`Укажи почту — на неё придёт чек` };
    const since = new Date(Date.now() - 3600000).toISOString();
    const { count } = await db.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('created_at', since);
    if ((count || 0) >= 10) return { ok: false, error: ru`Слишком много попыток оплаты — подожди немного` };
    const amount = pack.rub.toFixed(2), title = `${pack.zlat} монет — «Духолов»`;
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
    if (!p.confirmation || !p.confirmation.confirmation_url) return { ok: false, error: ru`Платёжный сервис не выдал страницу оплаты` };
    return { ok: true, order: row.id, url: p.confirmation.confirmation_url };
  },
  // 4.27: покупка через Google Play — проверить у Google, записать (номер заказа Google — ext_id «gp:…»), начислить, потребить
  async gplay(uid, a) {
    const pack = Rules.PAY.find(p => p.id === a.product), token = String(a.token || '');
    if (!pack || !/^[A-Za-z0-9._:-]{20,1000}$/.test(token)) return { ok: false, error: ru`Такого набора нет` };
    const path = `/purchases/products/${encodeURIComponent(pack.id)}/tokens/${encodeURIComponent(token)}`;
    const p = await gp('GET', path);
    if (p.obfuscatedExternalAccountId !== await gpAcct(uid)) return { ok: false, error: ru`Эту покупку сделал другой Ловчий` };
    if (p.purchaseState === 2) return { ok: true, pending: true }; // отложенная оплата — засчитаем, когда пройдёт
    if (p.purchaseState !== 0) return { ok: false, error: ru`Покупка отменена` };
    const ext = 'gp:' + String(p.orderId || token.slice(0, 64)).slice(0, 80);
    let row = must(await db.from('payments').select('id, credited, status').eq('ext_id', ext).maybeSingle());
    if (!row) {
      const ins = await db.from('payments').insert({ user_id: uid, pack: pack.id, zlat: pack.zlat, amount: pack.rub.toFixed(2), provider: 'gplay',
        ext_id: ext, status: 'succeeded', method: 'google_play', paid_at: new Date(+p.purchaseTimeMillis || Date.now()).toISOString() }).select('id, credited, status').single();
      row = ins.data || must(await db.from('payments').select('id, credited, status').eq('ext_id', ext).maybeSingle()); // гонка двух запросов — запись одна
      if (!row) throw new Error(ins.error ? ins.error.message : 'нет записи');
    }
    if (row.status === 'succeeded' && !row.credited) await this.credit(uid);
    if (p.consumptionState !== 1) { try { await gp('POST', path + ':consume'); } catch (e) { console.error('Google Play, consume:', String(e)); } }
    return { ok: true, credited: row.status === 'succeeded' };
  },
  // 4.27: отменённые и возвращённые покупки Google Play за 30 дней → статус refunded и списание начисленного
  async gplayVoided() {
    const r = await gp('GET', `/purchases/voidedpurchases?startTime=${Date.now() - 30 * 86400000}&maxResults=1000`);
    for (const v of r.voidedPurchases || []) {
      if (!v.orderId) continue;
      const row = must(await db.from('payments').select('id, user_id, credited, status').eq('ext_id', 'gp:' + String(v.orderId).slice(0, 80)).maybeSingle());
      if (!row || row.status === 'refunded') continue;
      must(await db.from('payments').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', row.id));
      console.error(`Казна: возврат Google Play ${row.id}`);
      if (row.credited && row.user_id) await this.credit(row.user_id, 'payRefund');
    }
  },
  // Спросить у ЮKassa итог незавершённых оплат игрока (за 3 дня); остальные доводит уведомление ЮKassa (notify)
  async sync(uid) {
    const since = new Date(Date.now() - 3 * 86400000).toISOString();
    const rows = must(await db.from('payments').select('id, user_id, ext_id, amount, status, credited').eq('user_id', uid)
      .in('status', ['pending', 'waiting_for_capture']).not('ext_id', 'is', null).gte('created_at', since).limit(20)) || [];
    let credited = 0;
    for (const r of rows) if (await this.refresh(r) === 'succeeded' && !r.credited) credited++;
    const { count } = await db.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'succeeded').eq('credited', false);
    const { count: open } = await db.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', uid).in('status', ['pending', 'waiting_for_capture']).gte('created_at', since);
    return { ok: true, paid: count || 0, open: open || 0, credited };
  },
  // 4.22.1: мои покупки — для Казны: когда, что, сколько, ссылка на чек «Мой налог» (пробивает tools/server/duholov-payments)
  async list(uid) {
    const rows = must(await db.from('payments').select('zlat, amount, status, paid_at, created_at, npd_url, provider').eq('user_id', uid)
      .in('status', ['succeeded', 'refunded']).order('created_at', { ascending: false }).limit(30)) || [];
    const RC = /^https:\/\/lknpd\.nalog\.ru\/api\/v1\/receipt\/\d{10,12}\/[A-Za-z0-9-]+\/print$/;
    return { ok: true, list: rows.map(r => ({ t: Date.parse(r.paid_at || r.created_at), zlat: r.zlat, rub: +r.amount, refunded: r.status === 'refunded', gp: r.provider === 'gplay',
      receipt: r.npd_url && RC.test(r.npd_url) ? r.npd_url : null })) };
  },
  // Итог платежа — только из ответа ЮKassa (платёж должен быть именно этим заказом и на эту сумму)
  async refresh(r) {
    const p = await yk('GET', `/payments/${encodeURIComponent(r.ext_id)}`);
    const same = p.metadata && p.metadata.order_id === r.id && p.amount && (+p.amount.value).toFixed(2) === (+r.amount).toFixed(2) && p.amount.currency === 'RUB';
    let status = !same ? 'failed' : p.status === 'succeeded' && p.paid ? 'succeeded' : p.status;
    if (same && p.refunded_amount && +p.refunded_amount.value > 0) status = 'refunded';
    if (status === r.status) return status;
    // 4.26: возврат уже начисленного платежа — монеты списываются (действие payRefund; может уйти в минус — Казна и аукцион
    // закрыты до погашения). Владельцу — в журнале
    if (status === 'refunded' && r.credited) console.error(`Казна: возврат начисленного платежа ${r.id}`);
    // вернувшийся платёж больше не начисляется; начисленный остаётся «начисленным»
    // 4.22.1: paid_at — когда ЮKassa приняла оплату: время продажи в чеке «Мой налог» (tools/server/duholov-payments)
    const paidAt = status === 'succeeded' ? { paid_at: p.captured_at || new Date().toISOString() } : {};
    must(await db.from('payments').update({ status, method: p.payment_method ? String(p.payment_method.type).slice(0, 40) : null, ...paidAt, updated_at: new Date().toISOString() }).eq('id', r.id));
    if (status === 'succeeded' && !r.credited && r.user_id) await this.credit(r.user_id);
    if (status === 'refunded' && r.credited && r.user_id) await this.credit(r.user_id, 'payRefund');
    return status;
  },
  // 4.22: начислить оплаченное сразу — действие игры payClaim от имени игрока, в общей очереди его действий (замок);
  // игра покажет «+N монет», когда игрок откроет её (S.d.payNew). Повтор безопасен: заказ отмечается в прогрессе и в базе
  async credit(uid, type = 'payClaim') {
    const { data: sv } = await db.from('saves').select('app_version').eq('user_id', uid).maybeSingle(); // версия игры игрока — прежняя
    const out = await play(uid, { a: [{ type }], sys: true, v: (sv && sv.app_version) || '' }, makeEnv(uid));
    if (!out.body.ok && !/Прогресс не найден/.test(out.body.error || '')) throw new Error('начисление: ' + (out.body.error || out.status));
  },
  // 4.1: HTTP-уведомление ЮKassa (Интеграция → HTTP-уведомления: https://api.duholov.ru/functions/v1/game/yookassa).
  // Телу уведомления не верим — берём из него только номер платежа и сами спрашиваем ЮKassa.
  async notify(body) {
    if (!this.on() || !body || !body.object) return;
    const ext = String((String(body.event || '').startsWith('refund.') ? body.object.payment_id : body.object.id) || '').slice(0, 64);
    if (!/^[0-9a-f-]{20,64}$/i.test(ext)) return;
    const r = must(await db.from('payments').select('id, user_id, ext_id, amount, status, credited').eq('ext_id', ext).maybeSingle());
    if (r) await this.refresh(r);
    // оплачен, но не начислен (например, прошлая попытка не взяла замок) — начислить; ошибка → 500, ЮKassa повторит уведомление
    if (r && !r.credited && (await db.from('payments').select('status, credited').eq('id', r.id).single()).data?.status === 'succeeded') await this.credit(r.user_id);
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
// 4.23: вход через бота Telegram — на телефоне открывается приложение Telegram: игрок жмёт «Запустить» у бота,
// бот (приёмник сообщений …/game/tg) отмечает код входа подтверждённым, игра завершает вход. Имя бота — из getMe
const TG = {
  bot: '', at: 0,
  TTL: 10 * 60000, // 4.26: код входа через бота живёт 10 минут (было 15)
  // 4.23.1: имя бота — из базы (tg_meta: его пишет служба duholov-tg-poll). Сам сервер игры до Telegram не достучится —
  // запрос getMe висел до обрыва по времени, и вместе с ним — вход и привязки у всех игроков
  async name() {
    if (!AUTHP.telegram) return '';
    if (this.bot && Date.now() - this.at < 10 * 60000) return this.bot;
    const { data } = await db.from('tg_meta').select('v').eq('k', 'bot').maybeSingle();
    this.bot = (data && data.v) || ''; this.at = Date.now();
    return this.bot;
  },
  // секрет заголовка X-Telegram-Bot-Api-Secret-Token: sha256("tgwh:" + токен), 48 знаков (так же считает duholov-tg-poll)
  async secret() { return AUTHP.telegram ? hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tgwh:' + AUTHP.telegram))).slice(0, 48) : ''; },
  // сообщение боту → ответ { chat_id, text } (отправит служба) или null
  async update(u) {
    if (u && u._meta && typeof u._meta.bot === 'string' && /^[A-Za-z0-9_]{3,64}$/.test(u._meta.bot)) { // служба сообщает имя бота
      await db.from('tg_meta').upsert({ k: 'bot', v: u._meta.bot }); this.bot = u._meta.bot; this.at = Date.now();
      return null;
    }
    const tgName = f => [f.first_name, f.last_name].filter(Boolean).join(' ') || (f.username ? '@' + f.username : 'Telegram');
    const since = () => new Date(Date.now() - this.TTL).toISOString();
    // 4.26: ответ кнопкой «Да, это я» / «Нет» — только тот, кто нажимал «Запустить» (tg_id), и только свежий код
    const cq = u && u.callback_query;
    if (cq) {
      const k = /^(ok|no):([A-Za-z0-9_-]{8,64})$/.exec(String(cq.data || '')), msg = cq.message;
      if (!k || !cq.from || !msg || !msg.chat || msg.chat.type !== 'private') return { answer: { callback_query_id: cq.id } };
      let text;
      if (k[1] === 'no') {
        await db.from('tg_login').delete().eq('code', k[2]).is('confirmed_at', null);
        text = '✖ Вход отменён. Если ссылку тебе прислал кто-то другой — не переходи по таким ссылкам: так пытаются получить доступ к чужому Ловчему.';
      } else {
        const { data } = await db.from('tg_login').update({ tg_id: cq.from.id, tg_name: tgName(cq.from).slice(0, 80), confirmed_at: new Date().toISOString() })
          .eq('code', k[2]).eq('asked_tg', cq.from.id).is('confirmed_at', null).gte('created_at', since()).select('code');
        text = data && data.length ? '✅ Вход в «Духолов» подтверждён — возвращайся в игру.' : 'Ссылка для входа устарела — начни вход в игре заново.';
      }
      return { answer: { callback_query_id: cq.id }, edit: { chat_id: msg.chat.id, message_id: msg.message_id, text } };
    }
    const m = u && (u.message || u.edited_message);
    if (!m || !m.chat || m.chat.type !== 'private' || !m.from) return null;
    const name = tgName(m.from);
    await db.from('tg_chats').upsert({ chat_id: m.chat.id, name: name.slice(0, 80), username: String(m.from.username || '').slice(0, 64), last_at: new Date().toISOString() });
    const code = /^\/start login_([A-Za-z0-9_-]{8,64})$/.exec(String(m.text || '').trim());
    if (code) {
      if (Math.random() < 0.05) await db.from('tg_login').delete().lt('created_at', new Date(Date.now() - 86400000).toISOString());
      const { data } = await db.from('tg_login').update({ asked_tg: m.from.id }).eq('code', code[1]).is('confirmed_at', null).gte('created_at', since()).select('code');
      if (!data || !data.length) return { chat_id: m.chat.id, text: 'Ссылка для входа устарела — начни вход в игре заново.' };
      // к этому Telegram уже привязан Ловчий — назовём его: вход откроет именно его
      const { data: link } = await db.from('auth_links').select('user_id').eq('provider', 'telegram').eq('subject', String(m.from.id)).maybeSingle();
      const sv = link ? (await db.from('saves').select('name:data->name').eq('user_id', link.user_id).maybeSingle()).data : null;
      const who = sv && sv.name ? ` — в твоего Ловчего «${String(sv.name).slice(0, 20)}»` : '';
      return { chat_id: m.chat.id, text: `🔐 Вход в «Духолов» через твой Telegram${who}.\n\nНажми «Да, это я», только если ты сам сейчас входишь в игру. Если ссылку тебе прислал кто-то другой — это обман: не нажимай, иначе чужой человек получит доступ к твоему Ловчему.`,
        reply_markup: { inline_keyboard: [[{ text: '✅ Да, это я', callback_data: 'ok:' + code[1] }], [{ text: '✖ Нет, это не я', callback_data: 'no:' + code[1] }]] } };
    }
    if (/^\/start\b/.test(String(m.text || ''))) return { chat_id: m.chat.id, text: 'Это бот игры «Духолов» — лови духов Нави по всему свету: https://duholov.ru' };
    return null;
  },
};
const getJson = async (url, init) => {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(12000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.error || ru`ответ ${r.status}`);
  return j;
};
const Auth = {
  // публичные параметры для кнопок входа: номера приложений (не секреты)
  providers() {
    const p = {};
    if (AUTHP.google) p.google = { client_id: AUTHP.google };
    if (AUTHP.yandex) p.yandex = { client_id: AUTHP.yandex };
    if (AUTHP.vk) p.vk = { client_id: AUTHP.vk };
    if (AUTHP.telegram) p.telegram = { bot_id: AUTHP.telegram.split(':')[0], bot: TG.bot || null };
    return p;
  },
  // Проверка входа у сервиса → { sub, name }
  async verify(provider, a, uid) {
    if (provider === 'google') {
      const t = await getJson('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(a.id_token || '')));
      if (t.aud !== AUTHP.google || !['accounts.google.com', 'https://accounts.google.com'].includes(t.iss) || +t.exp * 1000 < Date.now()) throw new Error(ru`вход Google не подтверждён`);
      // 4.26: nonce — подписанный сервером билет этого игрока (op 'gnonce'), а не случайная строка телефона
      const nt = a.nonce && t.nonce === a.nonce ? await this.ticket(null, a.nonce) : null;
      if (!nt || nt.g !== uid) throw new Error(ru`вход Google не подтверждён`);
      return { sub: String(t.sub), name: t.name || t.email || 'Google' };
    }
    if (provider === 'yandex') {
      const t = await getJson('https://login.yandex.ru/info?format=json', { headers: { Authorization: 'OAuth ' + String(a.access_token || '') } });
      if (String(t.client_id) !== AUTHP.yandex || !t.id) throw new Error(ru`вход Яндекса не подтверждён`); // токен выдан именно нашему приложению
      return { sub: String(t.id), name: t.display_name || t.real_name || t.login || 'Яндекс' };
    }
    if (provider === 'vk') {
      const form = new URLSearchParams({ grant_type: 'authorization_code', code: String(a.code || ''), code_verifier: String(a.code_verifier || ''),
        client_id: AUTHP.vk, device_id: String(a.device_id || ''), redirect_uri: String(a.redirect_uri || ''), state: String(a.state || '') });
      const t = await getJson('https://id.vk.com/oauth2/auth', { method: 'POST', body: form });
      if (!t.user_id || !t.access_token) throw new Error(ru`вход VK не подтверждён`);
      let name = 'VK';
      try {
        const u = await getJson('https://id.vk.com/oauth2/user_info', { method: 'POST', body: new URLSearchParams({ client_id: AUTHP.vk, access_token: t.access_token }) });
        if (u.user) name = [u.user.first_name, u.user.last_name].filter(Boolean).join(' ') || name;
      } catch { /* имя не обязательно */ }
      return { sub: String(t.user_id), name };
    }
    if (provider === 'telegram' && a.code) {
      // 4.23: вход через бота — код одноразовый, только того игрока, который его получил, и не старше 15 минут
      const { data: row } = await db.from('tg_login').select('tg_id, tg_name, confirmed_at, created_at').eq('code', String(a.code)).eq('user_id', uid).maybeSingle();
      if (!row || !row.confirmed_at || !row.tg_id || Date.parse(row.created_at) < Date.now() - TG.TTL) throw new Error(ru`вход Telegram не подтверждён`);
      await db.from('tg_login').delete().eq('code', String(a.code));
      return { sub: String(row.tg_id), name: row.tg_name || 'Telegram' };
    }
    if (provider === 'telegram') {
      // подпись Telegram Login: HMAC-SHA256 от строк «ключ=значение» (по алфавиту, без hash) на ключе SHA256(токена бота)
      const d = a.data && typeof a.data === 'object' ? a.data : {};
      if (!d.id || !d.hash || !d.auth_date) throw new Error(ru`вход Telegram не подтверждён`);
      if (Date.now() / 1000 - +d.auth_date > 600) throw new Error(ru`вход Telegram устарел — попробуй ещё раз`); // 4.26: 10 минут (было сутки)
      const check = Object.keys(d).filter(k => k !== 'hash').sort().map(k => `${k}=${d[k]}`).join('\n');
      const secret = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(AUTHP.telegram));
      const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(check)));
      if (!sameKey(sig, String(d.hash))) throw new Error(ru`вход Telegram не подтверждён`);
      return { sub: String(d.id), name: [d.first_name, d.last_name].filter(Boolean).join(' ') || (d.username ? '@' + d.username : 'Telegram') };
    }
    throw new Error(ru`Такого способа входа нет`);
  },
  // 4.22.1: подписанный билет «перенести вход» (15 минут): ticket(data) — выдать, ticket(null, str) — проверить и вернуть data
  async ticket(data, str) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('relink:' + serviceKey()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sign = async body => hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
    if (data) { const body = btoa(unescape(encodeURIComponent(JSON.stringify({ ...data, exp: Date.now() + 15 * 60000 })))); return body + '.' + await sign(body); }
    const [body, sig] = String(str || '').split('.');
    if (!body || !sig || !sameKey(sig, await sign(body))) return null;
    try { const t = JSON.parse(decodeURIComponent(escape(atob(body)))); return t.exp > Date.now() ? t : null; } catch { return null; }
  },
  async handle(uid, op, a) {
    if (op === 'info' && AUTHP.telegram) await TG.name(); // из базы — быстро
    // 4.23: вход через бота Telegram — выдать код; проверить, подтвердил ли бот
    if (op === 'tgstart') {
      if (!AUTHP.telegram || !(await TG.name())) return { ok: false, error: ru`Вход через Telegram сейчас недоступен` };
      const b = new Uint8Array(18); crypto.getRandomValues(b);
      const code = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const { error } = await db.from('tg_login').insert({ code, user_id: uid });
      if (error) return { ok: false, error: ru`Не удалось начать вход — попробуй ещё раз` };
      return { ok: true, code, bot: TG.bot };
    }
    if (op === 'gnonce') { const b = new Uint8Array(12); crypto.getRandomValues(b); return { ok: true, nonce: await this.ticket({ g: uid, r: hex(b) }) }; }
    if (op === 'tgcheck') {
      const { data: row } = await db.from('tg_login').select('confirmed_at').eq('code', String(a.code || '')).eq('user_id', uid).maybeSingle();
      return { ok: true, ready: !!(row && row.confirmed_at) };
    }
    if (op === 'info') {
      const links = must(await db.from('auth_links').select('provider, name, created_at').eq('user_id', uid)) || [];
      return { ok: true, providers: this.providers(), links };
    }
    // 4.1: удалить учётную запись целиком (152-ФЗ): прогресс, способы входа, лоты, место в Лиге — всё, что связано
    // с ней в базе, удаляется вместе с ней; записи о платежах остаются без привязки (налоговый учёт, 018)
    if (op === 'delete') {
      if (a.confirm !== 'УДАЛИТЬ') return { ok: false, error: ru`Нужно подтверждение` };
      // 4.26: снимки предложенных мест — файлы хранилища (папка <uid>/) удаляются отдельно
      try {
        const { data: files } = await db.storage.from('poi-photos').list(uid, { limit: 1000 });
        if (files && files.length) await db.storage.from('poi-photos').remove(files.map(f => `${uid}/${f.name}`));
      } catch (e) { console.error('Удаление снимков:', String(e)); }
      const { error } = await db.auth.admin.deleteUser(uid);
      if (error) { console.error('Удаление учётной записи:', error.message); return { ok: false, error: ru`Не получилось удалить — попробуй ещё раз` }; }
      return { ok: true };
    }
    // 4.22.1: вход был привязан к другому Ловчему, игрок выбрал «привязать сюда» — переносим по билету из signin
    if (op === 'relink') {
      const t = await this.ticket(null, a.ticket);
      if (!t || t.to !== uid) return { ok: false, error: ru`Вход устарел — попробуй ещё раз` };
      const { data: me } = await db.auth.admin.getUserById(uid);
      if (me && me.user && !me.user.email) {
        const { error } = await db.auth.admin.updateUserById(uid, { email: `u${uid.replace(/-/g, '')}@users.duholov.invalid`, email_confirm: true });
        if (error) { console.error('Вход: почта', String(error.message)); return { ok: false, error: ru`Не удалось сохранить вход — попробуй ещё раз` }; }
      }
      const moved = must(await db.from('auth_links').update({ user_id: uid, name: t.name }).eq('provider', t.p).eq('subject', t.s).eq('user_id', t.from).select('provider')) || [];
      if (!moved.length) return { ok: false, error: ru`Вход уже изменился — попробуй ещё раз` };
      console.warn('Вход перенесён:', t.p, t.from, '→', uid);
      return { ok: true, linked: true, moved: true, name: t.name };
    }
    if (op !== 'signin') return { ok: false, error: ru`Неизвестная операция` };
    const provider = String(a.provider || '');
    if (!this.providers()[provider]) return { ok: false, error: ru`Этот способ входа пока не подключён` };
    let who;
    try { who = await this.verify(provider, a.proof || {}, uid); }
    catch (e) { console.warn('Вход:', provider, String(e)); return { ok: false, error: ru`Не удалось войти: ${String(e.message || e).slice(0, 120)}` }; }
    const name = String(who.name).slice(0, 60);
    const row = must(await db.from('auth_links').select('user_id').eq('provider', provider).eq('subject', who.sub).maybeSingle());
    if (row && row.user_id === uid) return { ok: true, linked: true, already: true };
    if (row) {
      // вход уже привязан к другому Ловчему — одноразовый вход в его учётную запись
      const { data: u, error } = await db.auth.admin.getUserById(row.user_id);
      if (error || !u || !u.user || !u.user.email) return { ok: false, error: ru`Учётная запись не найдена` };
      const { data: link, error: le } = await db.auth.admin.generateLink({ type: 'magiclink', email: u.user.email });
      if (le || !link || !link.properties) return { ok: false, error: ru`Не удалось войти — попробуй ещё раз` };
      const s = must(await db.from('saves').select('name:data->name, level:data->level').eq('user_id', row.user_id).maybeSingle());
      // 4.22.1: или перенести этот вход к текущему Ловчему — билет на 15 минут; у старого останутся ли другие способы входа
      const others = (must(await db.from('auth_links').select('provider').eq('user_id', row.user_id)) || []).length - 1 + (/\.invalid$/i.test(u.user.email) ? 0 : 1);
      return { ok: true, switch: true, token_hash: link.properties.hashed_token, relink: await this.ticket({ p: provider, s: who.sub, from: row.user_id, to: uid, name }),
        others: Math.max(0, others), player: s ? { name: String(s.name || 'Ловчий').slice(0, 20), level: +s.level || 1 } : null };
    }
    // новый вход — привязываем к текущему игроку; гость становится постоянной учётной записью
    const { data: me } = await db.auth.admin.getUserById(uid);
    if (me && me.user && !me.user.email) {
      const { error } = await db.auth.admin.updateUserById(uid, { email: `u${uid.replace(/-/g, '')}@users.duholov.invalid`, email_confirm: true });
      if (error) { console.error('Вход: почта', String(error.message)); return { ok: false, error: ru`Не удалось сохранить вход — попробуй ещё раз` }; }
    }
    const { error: ie } = await db.from('auth_links').insert({ provider, subject: who.sub, user_id: uid, name });
    if (ie) return { ok: false, error: /duplicate/i.test(ie.message) ? ru`Этот вход уже привязан — попробуй ещё раз` : ru`Не удалось сохранить вход` };
    return { ok: true, linked: true, name };
  },
};

// Доступ к общим таблицам для GameCore (от имени сервера, в пределах одного игрока uid)
// 4.15: настоящая погода для проверки погоды телефона — Open-Meteo (как у телефона), кэш по точке на 20 минут
const WX = new Map();
async function realWeather(lat, lng) {
  const k = lat.toFixed(2) + ',' + lng.toFixed(2), c = WX.get(k), now = Date.now();
  if (c && now - c.at < 20 * 60000) return c.keys;
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 3000);
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&current=weather_code,wind_speed_10m`, { signal: ctrl.signal });
    if (!r.ok) return c ? c.keys : null;
    const cur = (await r.json()).current;
    if (!cur) return c ? c.keys : null;
    const key = Sky.fromCode(cur.weather_code, cur.wind_speed_10m);
    const keys = c && c.keys[0] !== key ? [key, c.keys[0]] : [key];
    if (WX.size > 5000) WX.clear();
    WX.set(k, { keys, at: now });
    return keys;
  } catch (e) { return c ? c.keys : null; } finally { clearTimeout(t); }
}

/* ---------- 4.28: общий Алатырь (029_alatyr_world.sql) ----------
   alatyr_world — общий счёт осколков Ордена (одна строка), alatyr_roads — распутанные дороги (грань n, мифология, начало
   и конец события в мс). Счёт прибавляет alatyr_add атомарно и возвращает счёт до и после — вехи между ними (Rules.alaStage)
   отмечает только тот запрос, что их перешагнул; дорогу записывает alatyr_open (повтор той же грани ничего не меняет).
   Состояние кэшируется в экземпляре на TTL и кладётся в Ev.roads — по нему сервер отбирает духов (Ev.mythMul), а телефон
   получает те же дороги событием roads (core.js, alatyrSync). Событие начинается не раньше чем через Rules.ALATYR_WORLD.LEAD
   минут после вехи — за это время о нём узнают все экземпляры сервера и телефоны */
/* 4.28: сезоны Алатыря (030_alatyr_seasons.sql): alatyr_seasons — строка на сезон: счёт на его начало (start_total), начало
   (from_ms — момент раскола прошлого), финал (finale_from/to, kills — победы над Кощеем, goal) и раскол (broken_ms — с него
   идёт следующий сезон; строку следующего сезона пишет тот же alatyr_break). Кто первым заметил, что пора, — пишет:
   собраны все грани — финал (alatyr_finale), Орден одолел Кощея goal раз — раскол с ближайшего полного часа (alatyr_break
   в World.kill), финал кончился — раскол в его конце (здесь, в load). Повтор ничего не меняет. Нет таблицы (миграция ещё
   не применена) — первый сезон с нуля, без финала */
const World = {
  st: null, at: 0, p: null, TTL: 60000,
  Nc: null, // 5.x: число активных Ловчих { v, at } (active)
  season(rows, now) {
    const [top, prev] = rows;
    if (!top) return { s: 1, from: 0, start: 0, fin: null, brk: null };
    const cur = top.from_ms > now && prev ? prev : top; // раскол назначен, но ещё не настал — идёт прошлый сезон
    return this.row(cur, cur === prev ? +top.from_ms : null);
  },
  row(r, brk) {
    const fin = r.finale_from != null && r.finale_to != null ? { from: +r.finale_from, to: +r.finale_to, kills: +r.kills || 0, goal: +r.goal || Rules.ALATYR_WORLD.FINALE.GOAL } : null;
    return { s: +r.season, from: +r.from_ms || 0, start: +r.start_total || 0, fin, brk: brk || (r.broken_ms != null ? +r.broken_ms : null) };
  },
  async load(depth = 0) {
    const now = Date.now();
    const w = must(await db.from('alatyr_world').select('total').eq('id', 1).maybeSingle());
    const rows = must(await db.from('alatyr_roads').select('n, road, from_ms, to_ms').order('n', { ascending: false }).limit(30)) || [];
    const sq = await db.from('alatyr_seasons').select('season, start_total, from_ms, finale_from, finale_to, kills, goal, broken_ms').order('season', { ascending: false }).limit(8);
    if (sq.error && depth === 0) console.warn('Алатырь: сезоны недоступны —', sq.error.message);
    const srows = sq.error ? [] : sq.data || [];
    // 5.x: зафиксированные цены граней (033_alatyr_goals.sql) и число активных Ловчих; нет таблицы — базовые цены, без фиксации
    const gq = await db.from('alatyr_goals').select('n, goal').order('n', { ascending: false }).limit(120);
    if (gq.error && depth === 0) console.warn('Алатырь: цены граней недоступны —', gq.error.message);
    const goals = {};
    (gq.error ? [] : gq.data || []).forEach(r => { if (+r.goal > 0) goals[r.n] = +r.goal; });
    const st = { total: +(w && w.total) || 0, roads: rows.map(r => ({ n: r.n, road: r.road, from: +r.from_ms, to: +r.to_ms })), ...this.season(srows, now),
      seasons: srows.map(r => this.row(r)), db: !sq.error, gdb: !gq.error, goals, N: gq.error ? 0 : await this.active() };
    if (depth > 3) return st;
    // финал кончился, а Орден не одолел Кощея — раскол в конце финала
    if (st.db && st.fin && !st.brk && now >= st.fin.to) { if (await this.brk(st.s, st.fin.to)) return this.load(depth + 1); }
    // 5.x: грань открылась (собрана предыдущая, начался сезон, первый запуск 5.x), а её цена ещё не записана — записать сейчас
    const end = st.brk || (st.fin && st.fin.to) || 0; // раскол уже настал, а строки нового сезона нет — подождём её
    if (st.gdb && !(end && now >= end)) {
      const nf = Rules.alaNextFix(st.s, st.total - st.start, st);
      if (nf >= 0 && await this.fix(nf, st)) return this.load(depth + 1);
    }
    const stg = Rules.alaStage(st.s, st.total - st.start, st);
    // запрос, перешагнувший веху, упал до записи дороги — дорога последней собранной грани записывается сейчас
    const n = stg.base + stg.n - 1;
    if (stg.n > 0 && !st.roads.some(r => r.n === n) && !(st.roads.length && st.roads[0].n > n)) {
      if (await this.open(n, now, st)) return this.load(depth + 1);
    }
    // все грани собраны, а финала нет (запрос, собравший последнюю грань, упал) — финал сейчас
    if (st.db && stg.done && !st.fin && !st.brk) { if (await this.finale(st.s, now)) return this.load(depth + 1); }
    return st;
  },
  apply(st) {
    this.st = st; this.at = Date.now();
    const cut = Date.now() - 86400000;
    Ev.roads = st.roads.filter(r => r.to > cut).sort((a, b) => a.n - b.n);
    // 5.x: цены граней — текущего сезона и последней грани прошлого (от неё ограничение ×CAP для первой грани сезона)
    const low = Rules.alaBase(st.s) - 1, goals = {};
    Object.keys(st.goals || {}).forEach(k => { if (+k >= low) goals[k] = st.goals[k]; });
    Ev.ala = { s: st.s, from: st.from, start: st.start, fin: st.fin, brk: st.brk, goals, N: st.N || 0 };
    Ev.alaSync();
    return st;
  },
  // 5.x: сколько Ловчих уровня GOALS.LEVEL+ играли за GOALS.DAYS дней (alatyr_active) — не чаще раза в 10 минут
  async active() {
    const c = this.Nc, G = Rules.ALATYR_WORLD.GOALS;
    if (c && Date.now() - c.at < 600000) return c.v;
    const r = await db.rpc('alatyr_active', { p_level: G.LEVEL, p_days: G.DAYS });
    if (r.error) console.warn('Алатырь: число активных Ловчих —', r.error.message);
    const v = r.error ? (c ? c.v : 0) : Math.max(0, Math.floor(+r.data) || 0);
    this.Nc = { v, at: Date.now() };
    return v;
  },
  // 5.x: записать цену открывшейся грани n (G — { goals, N } сервера); в базе уже есть — берём её (первый записавший побеждает)
  async fix(n, G) {
    const N = await this.active(), fresh = !Object.keys(G.goals || {}).length;
    const prev = n > 0 ? Rules.alaPrices(n - 1, fresh ? { goals: {}, N: 0 } : G)[n - 1].p : 0; // до 5.x грани стоили базовую цену
    const p = Rules.alaPriceNew(n, N, prev);
    const got = +must(await db.rpc('alatyr_goal', { p_n: n, p_goal: p, p_players: N, p_mul: Rules.alaMul(N) })) || 0;
    if (got > 0) { G.goals = G.goals || {}; G.goals[n] = got; G.N = N; if (got === p) console.warn(`Алатырь: цена грани ${n} — ${p} (активных Ловчих ${N}, ×${Rules.alaMul(N)})`); }
    return got > 0;
  },
  async finale(s, now) {
    const f = Rules.alaFinale(now);
    const ok = !!must(await db.rpc('alatyr_finale', { p_season: s, p_from: f.from, p_to: f.to, p_goal: Rules.ALATYR_WORLD.FINALE.GOAL }));
    if (ok) console.warn(`Алатырь: сезон ${s} — все грани собраны, финал с ${new Date(f.from).toISOString()}`);
    return ok;
  },
  async brk(s, at) {
    const ok = !!must(await db.rpc('alatyr_break', { p_season: s, p_at: at }));
    if (ok) console.warn(`Алатырь: Кощей раскалывает камень — сезон ${s + 1} с ${new Date(at).toISOString()}`);
    return ok;
  },
  // победа над Кощеем в финале сезона s; Орден одолел его goal раз — раскол с ближайшего полного часа
  async kill(s) {
    if (!(s >= 1)) return;
    const now = Date.now(), r = must(await db.rpc('alatyr_kill', { p_season: s, p_n: 1, p_now: now }));
    if (!r) return;
    if (+r.prev < +r.goal && +r.kills >= +r.goal) { await this.brk(s, Rules.alaHour(now)); this.at = 0; await this.get(); }
    else if (this.st && this.st.s === s && this.st.fin) this.st.fin.kills = Math.max(this.st.fin.kills, +r.kills || 0);
  },
  // состояние не старше ttl мс; база не ответила — прежнее (дороги не пропадают из-за сбоя)
  async get(ttl = this.TTL) {
    if (this.st && Date.now() - this.at < ttl) return this.st;
    if (!this.p) this.p = this.load().then(st => this.apply(st)).catch(e => { console.error('Алатырь:', String(e)); return this.st; }).finally(() => { this.p = null; });
    return this.p;
  },
  // дорога грани n (сквозной номер); goal — общий счёт, на котором грань собрана (st — сезон этой грани)
  async open(n, now, st) {
    const road = Rules.alatyrRoad(n), f = Rules.alaFace(n);
    if (!road) return false; // мифологии этой грани ещё нет в игре — грань ждёт обновления
    let at = st && st.s === f.s ? st.start : 0;
    const P = Rules.alaSeasonPrices(f.s, st); // 5.x: по зафиксированным ценам граней
    for (let k = 0; k <= f.k; k++) at += P[k].p;
    const t = Rules.alatyrOpen(now);
    return !!must(await db.rpc('alatyr_open', { p_n: n, p_road: road, p_goal: at, p_from: t.from, p_to: t.to }));
  },
  // +n осколков в общий счёт; перешагнули веху сезона — записать дорогу, собрали все грани — финал (и сразу обновить кэш)
  async add(n) {
    const r = must(await db.rpc('alatyr_add', { p_n: n }));
    if (!r) return;
    const now = Date.now(), st = this.st;
    // сезон сменился, а кэш об этом ещё не знает — вехи отметит load по свежему состоянию
    if (!st || Ev.alaSeason(now) !== st.s) { this.at = 0; await this.get(); return; }
    let changed = false;
    // 5.x: собрана грань — цена следующей фиксируется сейчас, до того как считать, не собрана ли и она
    for (let i = 0; st.gdb && i < 12; i++) {
      const nf = Rules.alaNextFix(st.s, (+r.total || 0) - st.start, st);
      if (nf < 0 || !(await this.fix(nf, st))) break;
      changed = true;
    }
    const A = Rules.alaStage(st.s, (+r.prev || 0) - st.start, st), B = Rules.alaStage(st.s, (+r.total || 0) - st.start, st);
    for (let k = Math.max(A.n, B.n - 3); k < B.n; k++) {
      if (await this.open(B.base + k, now, st)) { changed = true; console.warn(`Алатырь: сезон ${st.s}, грань ${k + 1} из ${B.K} собрана — ${B.faces[k]}`); }
    }
    if (st.db && B.done && !A.done && !st.fin && !st.brk && await this.finale(st.s, now)) changed = true;
    if (changed) { this.at = 0; await this.get(); } else st.total = Math.max(st.total, +r.total || 0);
  },
};

function makeEnv(uid) {
  return {
    weather: (lat, lng) => realWeather(lat, lng),
    // 4.28: общий Алатырь — осколки в общий счёт (после сохранения прогресса) и состояние для экрана (не старше 15 с)
    async alatyrAdd(n) { await World.add(Math.max(1, Math.min(10, n | 0))); },
    async alatyrState() { return World.get(15000); },
    // 4.28: победа над Кощеем в финале сезона s — в общий счёт (после сохранения прогресса)
    async alatyrKill(s) { await World.kill(s | 0); },
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
    // 4.28: канал клана clan:<мифология> читается вместе с каналом прежней дружины (clan:sokol…), пока миграция 032 их не перенесла
    async chatList(channel, after) {
      const chs = /^clan:/.test(channel) ? clanIds(channel.slice(5)).map(k => 'clan:' + k) : [channel];
      let q = db.from('chat_messages').select('id, pid, name, lvl, clan, text, created_at').in('channel', chs).eq('hidden', false);
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
    // 3.21: текущие имя, уровень, клан и облик Ловчих — прямо из их сохранений (по user_id или по коду игрока)
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
      // 4.15: порядок и место — по рейтингу (колонка rating, миграция 021)
      const q = () => db.from('league_scores').select('user_id, name, rating, rank, level, look, updated_at').eq('season', season);
      const rows = must(await q().order('rating', { ascending: false }).order('updated_at', { ascending: true }).limit(50)) || [];
      const tier = must(await q().eq('rank', rank | 0).order('rating', { ascending: false }).order('updated_at', { ascending: true }).limit(3)) || [];
      const uids = [...new Set(rows.concat(tier).map(r => r.user_id))];
      const ps = uids.length ? must(await db.from('players').select('pid, user_id').in('user_id', uids)) || [] : [];
      const pid = {}; ps.forEach(p => { pid[p.user_id] = p.pid; });
      const cur = await this.briefByUid(uids);
      const view = r => ({ ...r, pts: r.rating, pid: pid[r.user_id] || null, me: r.user_id === uid, cur: cur[r.user_id] || null });
      const { count: total, error } = await db.from('league_scores').select('user_id', { count: 'exact', head: true }).eq('season', season);
      if (error) throw new Error(error.message);
      let me = null;
      if (!rows.some(r => r.user_id === uid)) {
        const my = must(await db.from('league_scores').select('rating, updated_at').eq('season', season).eq('user_id', uid).maybeSingle());
        if (my) {
          const { count } = await db.from('league_scores').select('user_id', { count: 'exact', head: true }).eq('season', season)
            .or(`rating.gt.${my.rating | 0},and(rating.eq.${my.rating | 0},updated_at.lt."${my.updated_at}")`);
          me = { place: (count || 0) + 1, pts: my.rating };
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
      // 4.15: рейтинг — в колонке rating; stars — для совместимости (рейтинг / 100)
      const pts = Math.max(0, Math.min(20000, x.pts | 0));
      must(await db.from('league_scores').upsert({ user_id: uid, season: x.season, name: String(x.name).slice(0, 20), rating: pts, stars: Math.min(1000, Math.floor(pts / 100)), rank: x.rank,
        level: x.level, look: x.look, updated_at: new Date().toISOString() }, { onConflict: 'user_id,season' }));
    },
    // 4.16: Лига — бои с живыми Ловчими (022_league_pvp.sql). Очередь поиска и пара — атомарно в базе (league_find,
    // SKIP LOCKED); бой — строка league_matches (state ведёт GameCore.pvp, запись — с проверкой версии, league_put);
    // обновления боя база сама рассылает обоим в их личные каналы Realtime (league:<user_id>).
    // Коды входа (user_id) наружу не уходят: сторону a/b считаем здесь
    async pvpFind(t) {
      return must(await db.rpc('league_find', { p_uid: uid, p_pid: t.info.pid, p_season: t.season, p_rating: t.pts | 0, p_lo: t.lo | 0, p_hi: t.hi | 0,
        p_info: t.info, p_avoid: t.avoid || null, p_wide: !!t.wide, p_now: Date.now() }));
    },
    async pvpCancel() { return must(await db.rpc('league_cancel', { p_uid: uid })); },
    async pvpLive() {
      const rows = must(await db.from('league_matches').select('id').eq('status', 'live').or(`a_uid.eq.${uid},b_uid.eq.${uid}`).order('created_at', { ascending: false }).limit(1)) || [];
      return rows[0] ? { id: rows[0].id } : null;
    },
    async pvpLoad(id) {
      if (!UUID.test(id)) return null;
      const r = must(await db.from('league_matches').select('id, ver, state, season, a_uid, b_uid').eq('id', id).maybeSingle());
      if (!r) return null;
      return { id: r.id, ver: r.ver, state: r.state, season: r.season, seat: r.a_uid === uid ? 'a' : r.b_uid === uid ? 'b' : null };
    },
    // новая версия боя или null — бой успел измениться (ход соперника) или уже закончен
    async pvpPut(id, ver, state, done) { return must(await db.rpc('league_put', { p_id: id, p_ver: ver, p_state: state, p_done: !!done })); },
    // законченные бои игрока, ещё не засчитанные в его прогресс
    async pvpPending() {
      const rows = must(await db.from('league_matches').select('id, state, season, a_uid, b_uid').eq('status', 'done')
        .or(`and(a_uid.eq.${uid},a_settled.eq.false),and(b_uid.eq.${uid},b_settled.eq.false)`).order('updated_at').limit(10)) || [];
      return rows.map(r => ({ id: r.id, state: r.state, season: r.season, seat: r.a_uid === uid ? 'a' : 'b' }));
    },
    async pvpSettled(id) { must(await db.rpc('league_settled', { p_id: id, p_uid: uid })); },
    // Общее дело Ордена: вклад игрока за неделю (n только растёт) и итоги недели
    async orderPut(x) {
      must(await db.from('order_players').upsert({ week: x.week, pid: x.pid, name: String(x.name).slice(0, 20), n: Math.min(1e6, x.n), updated_at: new Date().toISOString() }, { onConflict: 'week,pid' }));
    },
    async orderStats(week, pid) { return must(await db.rpc('order_stats', { p_week: week, p_pid: pid })); },
    // Кланы: кто держит Капище, поставить защитника, освободить после победы, сколько Капищ держит игрок
    async holdGet(poi) {
      const r = must(await db.from('shrine_holds').select('clan, holders, ver').eq('poi_id', poi).maybeSingle());
      return r && Array.isArray(r.holders) && r.holders.length ? r : null;
    },
    // 4.16: защитники старше Rules.HOLD.MAX_H часов уже ушли — shrine_defend (023) убирает их перед проверками
    async holdDefend(poi, lat, lng, clan, holder) {
      return !!must(await db.rpc('shrine_defend', { p_poi: poi, p_lat: lat, p_lng: lng, p_clan: clan, p_holder: holder, p_cutoff: holdCutoff(), p_max: HOLD_MAX }));
    },
    async holdDefeat(poi, ver) { return !!must(await db.rpc('shrine_defeat', { p_poi: poi, p_ver: ver })); },
    // 4.16: считаются только защитники, которые ещё на посту (ушедшие по сроку остаются в строке до уборки)
    async myHolds(pid) {
      const rows = must(await db.from('shrine_holds').select('holders').contains('holders', JSON.stringify([{ pid }])).limit(200)) || [];
      const cut = holdCutoff();
      return rows.filter(r => (r.holders || []).some(h => h.pid === pid && +h.t >= cut)).length;
    },
    // Капища, где стоят защитники игрока: название — из таблицы мест
    async myHoldsList(pid) {
      const cut = holdCutoff();
      const rows = (must(await db.from('shrine_holds').select('poi_id, lat, lng, holders').contains('holders', JSON.stringify([{ pid }])).limit(200)) || [])
        .filter(r => (r.holders || []).some(h => h.pid === pid && +h.t >= cut)).slice(0, HOLD_MY_MAX + 5);
      const ids = rows.map(r => r.poi_id);
      const names = ids.length ? must(await db.from('pois').select('id, name').in('id', ids)) || [] : [];
      return rows.map(r => {
        const h = (r.holders || []).find(x => x.pid === pid) || {};
        const p = names.find(x => x.id === r.poi_id);
        return { id: r.poi_id, name: p ? p.name : 'Капище', lat: r.lat, lng: r.lng, sid: h.sp && h.sp.sid, sp: h.sp || null, t: h.t || null, n: (r.holders || []).length };
      });
    },
    // Сколько Капищ держит каждый открытый клан (по всему свету или в прямоугольнике [s, w, n, e]).
    // 4.28: кланы — мифологии (MYTH_KEYS), считаются параллельно; до миграции 032 — вместе с прежними дружинами (clanIds)
    async clanCounts(box) {
      const out = {};
      await Promise.all(MYTH_KEYS.map(async k => {
        let q = db.from('shrine_holds').select('poi_id', { count: 'exact', head: true }).in('clan', clanIds(k)).neq('holders', '[]');
        if (box) q = q.gte('lat', box[0]).lte('lat', box[2]).gte('lng', box[1]).lte('lng', box[3]);
        const { count, error } = await q;
        if (error) throw new Error(error.message);
        out[k] = count || 0;
      }));
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
      if (f.maxLvl) q = q.lte('lvl', f.maxLvl); // 4.16: «не выше моего уровня»
      if (f.notPid) q = q.neq('seller_pid', f.notPid);
      const [col, asc] = { new: ['created_at', false], cheap: ['price', true], dear: ['price', false], power: ['power', false], iv: ['iv_pct', false] }[f.sort] || ['created_at', false];
      return must(await q.order(col, { ascending: asc }).order('id').range(f.from, f.from + 29)) || [];
    },
    // 4.16: недавние сделки с духом вида sid (для подсказки цены) — индекс auction_sold_idx (023)
    async lotsRecent(sid, since) {
      return must(await db.from('auction_lots').select('cur, price, lvl').eq('sid', sid).eq('status', 'sold').gte('closed_at', new Date(since).toISOString())
        .order('closed_at', { ascending: false }).limit(60)) || [];
    },
    async lotsMine(pid) {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      return must(await db.from('auction_lots').select('id, spirit, sid, lvl, power, iv_pct, cur, price, deposit, status, buyer_name, created_at, expires_at, closed_at, settled')
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
    // Казна: оплаченные, но ещё не начисленные наборы монет; отметка «начислено»
    async paidList() { return must(await db.from('payments').select('id, pack, zlat').eq('user_id', uid).eq('status', 'succeeded').eq('credited', false).limit(50)) || []; },
    async payCredited(ids) { must(await db.from('payments').update({ credited: true, updated_at: new Date().toISOString() }).eq('user_id', uid).in('id', ids)); },
    // 4.26: возвращённые (refunded) и уже начисленные, но ещё не списанные платежи; отметка «списано»
    async refundList() { return must(await db.from('payments').select('id, zlat').eq('user_id', uid).eq('status', 'refunded').eq('credited', true).eq('debited', false).limit(50)) || []; },
    async payDebited(ids) { must(await db.from('payments').update({ debited: true, updated_at: new Date().toISOString() }).eq('user_id', uid).in('id', ids)); },
    // 5.x: промокод (034_promo_codes.sql): погасить → { reward[, again] } | { error }; награда сохранена в прогрессе.
    // Миграции ещё нет в базе — «промокоды пока недоступны», а не ошибка сервера
    async promo(code) {
      const { data, error } = await db.rpc('promo_redeem', { p_code: code, p_user: uid });
      if (error) { if (error.code === 'PGRST202' || /promo_redeem/.test(error.message)) return { error: 'off' }; throw new Error(error.message); }
      return data;
    },
    async promoDone(code) { must(await db.rpc('promo_done', { p_code: code, p_user: uid })); },
    async deleteSave() {
      must(await db.from('saves').delete().eq('user_id', uid));
      must(await db.from('save_srv').delete().eq('user_id', uid));
    },
  };
}

// Защита от перебора и наводнения запросами: не больше FLOOD запросов в минуту от одного игрока
// и не больше BAD_TOKENS неверных входов в минуту с одного адреса (в пределах экземпляра функции)
const FLOOD = 150, BAD_TOKENS = 20;
// 4.16: ходы в бою Лиги: телефон шлёт их не чаще ~3 в секунду (удары — пачками) и раз в 2 с — «я на связи»
const PVP_FLOOD = 360;
const pvpHits = new Map();
// Замок игрока на время запроса: сам истекает через LOCK_MS (если функция упала); ждём его до LOCK_TRIES × 200 мс
const LOCK_MS = 30000, LOCK_TRIES = 25;
const hits = new Map(), badTokens = new Map(), errHits = new Map(), pingHits = new Map(), ykHits = new Map();
// 4.26: тело запроса — не больше MAX_BODY байт (перед сервером — ещё и Caddy, 256 КБ)
const MAX_BODY = 128 * 1024;
let dbCheck = { at: 0, p: null };
const dbHealth = () => {
  if (dbCheck.p && Date.now() - dbCheck.at < 5000) return dbCheck.p;
  const t0 = Date.now();
  const q = db.from('saves').select('user_id').limit(1).then(r => r.error ? -1 : Date.now() - t0, () => -1);
  dbCheck = { at: t0, p: Promise.race([q, new Promise(res => setTimeout(() => res(-1), 3000))]) };
  return dbCheck.p;
};
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

/* Действия игрока — строго по очереди (замок в базе): запрос из игры или сам сервер (4.22: начисление оплаты) */
async function play(uid, body, env) {
  const R = (b, status = 200) => ({ body: b, status });
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
    await World.get(); // 4.28: дороги Алатыря (Ev.roads) — до отбора духов; из кэша экземпляра, база — не чаще раза в минуту
    let got = null;
    for (let i = 0; i < LOCK_TRIES; i++) {
      got = must(await db.rpc('game_begin', { p_uid: uid, p_token: tok, p_ms: LOCK_MS }));
      if (got && !got.locked) break;
      await new Promise(r => setTimeout(r, 200));
    }
    if (!got || got.locked) return R({ ok: false, error: ru`Предыдущее действие ещё выполняется — повтори` });
    locked = true;
    env.lockAt = Date.now(); env.LOCK_MS = LOCK_MS; // 4.26: core.js не пишет в общие таблицы, если замок вот-вот истечёт
    const row = got.row, srv = got.srv || {};
    if (row && row.moved_to) return R({ ok: false, moved: true, error: ru`Прогресс перенесён на другое устройство` });
    // от имени сервера (начисление оплаты): часовой пояс — тот, что сервер помнит у игрока
    if (body.sys) body.tz = srv.tz ? srv.tz.v : 180;
    const res = await GameCore.run(body, { data: row ? row.data : null, srv }, env);
    if (!res.ok) {
      if (res.rl) await release({ ...srv, rl: res.rl });
      return R({ ok: false, error: res.error, rev: row ? row.rev : 0 });
    }
    if (res.reset) return R({ ok: true, reset: true, results: res.results, events: [], now: res.now });
    // 4.1: прогресс не изменился (чат, Лига, комната разлома, tick) — пишем только служебные данные, без перезаписи прогресса
    const ops = row && res.data ? Diff.make(row.data, res.data) : null;
    const rev = must(await db.rpc('game_commit', { p_uid: uid, p_token: tok, p_rev: row ? row.rev : 0, p_data: ops && !ops.length ? null : (res.data || null),
      p_srv: res.srv, p_ver: String(body.v || '').slice(0, 20) }));
    if (rev == null) return R({ ok: false, error: ru`Прогресс изменился на другом устройстве — повтори действие` });
    locked = false; // замок снят вместе с сохранением
    for (const fn of res.after) { try { await fn(); } catch (e) { console.error('после сохранения:', String(e)); } }
    // разница — только если телефон знает предыдущую версию прогресса
    const patch = !res.full && row && body.rev === row.rev ? ops : null;
    return R({ ok: true, rev, patch, data: patch ? undefined : res.data, results: res.results, events: res.events, now: res.now });
  } catch (e) {
    console.error(String(e && e.stack || e));
    return R({ ok: false, error: ru`Ошибка сервера — попробуй ещё раз` }, 500);
  } finally {
    await release();
  }
}

Deno.serve(async req => {
  const origin = req.headers.get('origin');
  const allowed = !origin || ORIGINS.includes(origin);
  const headers = { ...CORS, 'Access-Control-Allow-Origin': allowed && origin ? origin : ORIGINS[0], Vary: 'Origin' };
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (+(req.headers.get('content-length') || 0) > MAX_BODY) return reply({ ok: false, error: ru`Слишком большой запрос` }, 413);
  // уведомление ЮKassa о платеже: итог проверяем сами (Pay.notify); при сбое — 500, и ЮKassa повторит уведомление позже
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/tg')) {
    const sec = await TG.secret();
    if (!sec || !sameKey(req.headers.get('x-telegram-bot-api-secret-token') || '', sec)) return new Response('forbidden', { status: 403 });
    let reply = null;
    try { reply = await TG.update(await req.json().catch(() => null)); } catch (e) { console.error('Telegram:', String(e)); }
    return new Response(JSON.stringify({ ok: true, reply }), { headers: { 'Content-Type': 'application/json' } }); // ответ боту отправит служба
  }
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/yookassa')) {
    if (tooMany(ykHits, (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown', 120)) return new Response('slow down', { status: 429 });
    try { await Pay.notify(await req.json().catch(() => null)); return new Response('ok'); }
    catch (e) { console.error('Казна, уведомление:', String(e)); return new Response('retry', { status: 500 }); }
  }
  if (!allowed) return reply({ ok: false, error: ru`Этот сервер игры не принимает запросы с этой страницы` }, 403);
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
  // 4.21: состояние сервера для экрана входа — отвечает сразу; база проверяется не чаще раза в 5 с (db: мс ответа, -1 — не ответила за 3 с)
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/ping')) {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    if (tooMany(pingHits, ip, 60)) return reply({ ok: false }, 429);
    return reply({ ok: true, db: await dbHealth() });
  }
  if (ACCESS && !sameKey(req.headers.get('x-duholov-access') || '', ACCESS)) return reply({ ok: false, error: ru`Закрытый контур: нужен ключ доступа` }, 403);
  if (req.method !== 'POST') return reply({ ok: false, error: 'POST only' }, 405);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const bad = badTokens.get(ip);
  if (bad && bad.m === Math.floor(Date.now() / 60000) && bad.n > BAD_TOKENS) return reply({ ok: false, error: ru`Слишком много попыток — подожди минуту` }, 429);
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const who = token ? (await db.auth.getUser(token)).data : null;
  if (!who || !who.user) { tooMany(badTokens, ip, BAD_TOKENS); return reply({ ok: false, error: ru`Нужен вход в игру`, auth: true }, 401); }
  const uid = who.user.id;
  let body;
  try { body = await req.json(); } catch { return reply({ ok: false, error: ru`Некорректный запрос` }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ ok: false, error: ru`Некорректный запрос` }, 400);
  // 4.16: ходы в бою Лиги идут чаще обычных действий — у них своя граница частоты (саму частоту ударов проверяет PvP)
  if (body && body.pvp) {
    if (tooMany(pvpHits, uid, PVP_FLOOD)) return reply({ ok: false, error: ru`Слишком много запросов — подожди минуту` }, 429);
    try { return reply(await GameCore.pvp(String(body.pvp), body.args || {}, makeEnv(uid))); }
    catch (e) { console.error('Лига:', String(e && e.stack || e)); return reply({ ok: false, error: ru`Ошибка сервера — попробуй ещё раз` }, 500); }
  }
  if (tooMany(hits, uid, FLOOD)) return reply({ ok: false, error: ru`Слишком много запросов — подожди минуту` }, 429);
  if (verCmp(body.v, GameCore.MIN_CLIENT) < 0) return reply({ ok: false, upgrade: true, error: ru`Вышла новая версия игры — обнови её` });
  // Казна: создать оплату / узнать итог — вне очереди игровых действий (ждём ответа ЮKassa)
  if (body.pay) return reply(await Pay.handle(uid, String(body.pay), body.args));
  // Вход через сервисы: список, привязка и переключение учётной записи — тоже вне очереди игровых действий
  if (body.auth) { try { return reply(await Auth.handle(uid, String(body.auth), body.args || {})); } catch (e) { console.error('Вход:', String(e)); return reply({ ok: false, error: ru`Ошибка входа — попробуй ещё раз` }, 500); } }
  const out = await play(uid, body, makeEnv(uid));
  return reply(out.body, out.status);
});
