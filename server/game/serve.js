/* ---------- Edge Function: вход, загрузка и сохранение прогресса, общие таблицы ---------- */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

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
      return must(await db.from('gifts').select('id, from_pid, from_name, created_at').eq('to_pid', pid).is('opened_at', null).order('created_at').limit(50)) || [];
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
    async deleteSave() {
      must(await db.from('saves').delete().eq('user_id', uid));
      must(await db.from('save_srv').delete().eq('user_id', uid));
    },
  };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply({ ok: false, error: 'POST only' }, 405);
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const who = token ? (await db.auth.getUser(token)).data : null;
  if (!who || !who.user) return reply({ ok: false, error: 'Нужен вход в игру', auth: true }, 401);
  const uid = who.user.id;
  let body;
  try { body = await req.json(); } catch { return reply({ ok: false, error: 'Некорректный запрос' }, 400); }
  if (verCmp(body.v, GameCore.MIN_CLIENT) < 0) return reply({ ok: false, upgrade: true, error: 'Вышла новая версия игры — обнови её' });
  const env = makeEnv(uid);

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const row = must(await db.from('saves').select('data, rev, moved_to').eq('user_id', uid).maybeSingle());
      if (row && row.moved_to) return reply({ ok: false, moved: true, error: 'Прогресс перенесён на другое устройство' });
      const srvRow = must(await db.from('save_srv').select('srv').eq('user_id', uid).maybeSingle());
      const res = await exclusive(() => GameCore.run(body, { data: row ? row.data : null, srv: srvRow ? srvRow.srv : {} }, env));
      if (!res.ok) return reply({ ok: false, error: res.error, rev: row ? row.rev : 0 });

      let rev = row ? row.rev : 0;
      if (res.reset) return reply({ ok: true, reset: true, results: res.results, events: [], now: res.now });
      if (res.data) {
        if (!row) {
          const ins = await db.from('saves').insert({ user_id: uid, data: res.data, rev: 1, app_version: String(body.v || '').slice(0, 20) });
          if (ins.error) { if (/duplicate/i.test(ins.error.message)) continue; throw new Error(ins.error.message); }
          rev = 1;
        } else {
          const upd = must(await db.from('saves').update({ data: res.data, rev: row.rev + 1, app_version: String(body.v || '').slice(0, 20), updated_at: new Date().toISOString() })
            .eq('user_id', uid).eq('rev', row.rev).select('rev'));
          if (!upd || !upd.length) continue; // прогресс изменился параллельно (второе устройство) — повторим
          rev = row.rev + 1;
        }
      }
      must(await db.from('save_srv').upsert({ user_id: uid, srv: res.srv, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }));
      for (const fn of res.after) { try { await fn(); } catch (e) { console.error('после сохранения:', String(e)); } }
      // разница — только если телефон знает предыдущую версию прогресса
      const patch = !res.full && row && body.rev === row.rev ? Diff.make(row.data, res.data) : null;
      return reply({ ok: true, rev, patch, data: patch ? undefined : res.data, results: res.results, events: res.events, now: res.now });
    }
    return reply({ ok: false, error: 'Сервер занят — повтори действие' });
  } catch (e) {
    console.error(String(e && e.stack || e));
    return reply({ ok: false, error: 'Ошибка сервера — попробуй ещё раз' }, 500);
  }
});
