'use strict';
/* Панель модерации: заявки игроков на новые места и правка объектов карты.
   Вход — по ссылке на почту (Supabase Auth), права — по таблице admins на сервере (RLS). */

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dist = (a, b, c, d) => { const R = 6371000, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
// путь снимка — только «<id игрока>/<id>.jpg» (заявку игрок пишет сам; иначе строка вырвалась бы из атрибута разметки)
const photoUrl = p => /^[0-9a-f-]{36}\/[A-Za-z0-9-]{6,64}\.jpg$/.test(p || '') ? `${CLOUD_CONFIG.url}/storage/v1/object/public/poi-photos/${p}` : 'icons/icon-192.png';
const KIND = { spring: 'Источник', shrine: 'Капище' };
const REASONS = ['Объекта нет на фото или его не видно', 'Геометка не совпадает с местом объекта', 'Такой объект уже есть на карте',
  'Частная территория, школа или детский сад', 'Опасное место (дорога, стройка)', 'Неприемлемое содержание', 'Неинтересный объект'];
const tiles = () => L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });

const sb = supabase.createClient(CLOUD_CONFIG.url, CLOUD_CONFIG.anonKey, { auth: { persistSession: true, storageKey: CLOUD_CONFIG.admin, detectSessionInUrl: true } });
const app = $('#app');
let maps = [];
const clearMaps = () => { maps.forEach(m => m.remove()); maps = []; };

// 4.26: второй фактор модератора — код из приложения-аутентификатора (TOTP). Без него сервер не считает вход модераторским
// (is_admin() требует aal2): украденного пароля мало
async function mfaGate() {
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.currentLevel === 'aal2') return true;
  const { data: f } = await sb.auth.mfa.listFactors();
  let factor = f && (f.totp || []).find(x => x.status === 'verified'), qr = '';
  if (!factor) {
    for (const x of ((f && f.all) || []).filter(x => x.status !== 'verified')) await sb.auth.mfa.unenroll({ factorId: x.id }); // брошенные попытки
    const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Духолов ' + new Date().toISOString().slice(0, 10) });
    if (error) { app.innerHTML = `<div class="card login"><h2>Второй фактор</h2><p>Не удалось подключить: ${esc(error.message)}</p></div>`; return false; }
    factor = data;
    qr = `<p>Подключи второй фактор: отсканируй код приложением-аутентификатором (Яндекс Ключ, Google Authenticator и т. п.).</p>
      <img src="${esc(data.totp.qr_code)}" alt="QR-код" style="width:200px;height:200px;background:#fff;border-radius:8px;padding:6px">
      <p class="small muted">Или введи ключ вручную: <code>${esc(data.totp.secret)}</code></p>`;
  }
  app.innerHTML = `<div class="card login"><h2>Код подтверждения</h2>${qr}<p>Введи 6 цифр из приложения-аутентификатора.</p>
    <input class="input code" inputmode="numeric" autocomplete="one-time-code" maxlength="6">
    <div class="row"><button class="btn ok go">Подтвердить</button></div><p class="small msg"></p></div>`;
  return new Promise(res => {
    const go = async () => {
      const code = $('.code').value.replace(/\D/g, '');
      const { data: ch, error: ce } = await sb.auth.mfa.challenge({ factorId: factor.id });
      const { error } = ce ? { error: ce } : await sb.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code });
      if (error) { $('.msg').textContent = 'Неверный код: ' + error.message; return; }
      res(true);
    };
    $('.go').onclick = go;
    $('.code').onkeydown = e => { if (e.key === 'Enter') go(); };
  });
}

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session || session.user.is_anonymous) return login();
  $('.who').innerHTML = `${esc(session.user.email || session.user.id)} · <button class="btn small out">Выйти</button>`;
  $('.who .out').onclick = async () => { await sb.auth.signOut(); location.reload(); };
  if (!(await mfaGate())) return;
  const { data: isAdmin, error } = await sb.rpc('is_admin');
  if (error || !isAdmin) {
    app.innerHTML = `<div class="card login"><h2>Нет прав модератора</h2>
      <p>Вход выполнен, но этой учётной записи нет в списке модераторов.</p>
      <p class="small muted">ID учётной записи:<br><code>${esc(session.user.id)}</code></p>
      <p class="small muted">Владелец проекта добавляет модератора в Supabase → SQL Editor:<br><code>insert into public.admins (user_id) values ('${esc(session.user.id)}');</code></p></div>`;
    return;
  }
  const tabs = [['queue', 'Заявки'], ['map', 'Объекты на карте'], ['history', 'История'], ['stats', 'Аналитика']];
  const nav = $('.tabs');
  nav.innerHTML = tabs.map(([k, t]) => `<button data-t="${k}">${t}</button>`).join('');
  nav.onclick = e => { const b = e.target.closest('[data-t]'); if (b) show(b.dataset.t); };
  const h = location.hash.slice(1);
  show(['map', 'history', 'stats'].includes(h) ? h : 'queue');
}

function show(tab) {
  history.replaceState(null, '', '#' + tab);
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  clearMaps();
  tipHide();
  ({ queue, map: poiMap, history: hist, stats })[tab]();
}

function login() {
  // 4.1: вход по почте и паролю (на своём сервере нет рассылки писем; пароль модератору задаёт владелец на сервере)
  app.innerHTML = `<div class="card login"><h2>Вход для модераторов</h2>
    <form class="lf"><input class="input em" type="email" placeholder="почта" autocomplete="username" required>
    <input class="input pw" type="password" placeholder="пароль" autocomplete="current-password" required>
    <div class="row"><button class="btn primary go">Войти</button></div></form>
    <p class="small msg"></p></div>`;
  const go = $('.go'), msg = $('.msg');
  $('.lf').onsubmit = async e => {
    e.preventDefault();
    const email = $('.em').value.trim(), password = $('.pw').value;
    if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = 'Проверьте адрес почты'; return; }
    go.disabled = true; msg.textContent = '';
    const { error } = await sb.auth.signInWithPassword({ email, password });
    go.disabled = false;
    if (error) { msg.textContent = /rate|many/i.test(error.message) ? 'Слишком много попыток — подождите минуту' : 'Неверная почта или пароль'; return; }
    location.reload();
  };
}

/* ---------- очередь заявок ---------- */
async function queue(note) {
  app.innerHTML = '<p class="muted">Загружаю заявки…</p>';
  const noteHtml = note ? `<p class="card small" style="margin:0 0 16px">${esc(note)}</p>` : '';
  const { data, error } = await sb.from('poi_submissions').select('*').eq('status', 'pending').order('created_at').limit(100);
  if (error) { app.innerHTML = `<p class="muted">Ошибка: ${esc(error.message)}</p>`; return; }
  const tab = $('.tabs [data-t="queue"]');
  if (tab) tab.textContent = `Заявки (${data.length})`;
  if (!data.length) { app.innerHTML = noteHtml + '<div class="card"><h2>Очередь пуста</h2><p class="muted">Новых заявок нет.</p></div>'; return; }
  app.innerHTML = noteHtml + `<div class="queue"><div class="qlist">${data.map((s, i) => `
    <button class="qitem" data-i="${i}"><img src="${photoUrl(s.photo)}" alt="" loading="lazy">
      <div><b>${esc(s.name)}</b><span class="small muted">${KIND[s.kind]} · ${new Date(s.created_at).toLocaleString('ru-RU')}</span></div></button>`).join('')}</div>
    <div class="card qdetail"></div></div>`;
  const list = $('.qlist');
  const open = i => {
    list.querySelectorAll('.qitem').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
    detail(data[i], note => { data.splice(i, 1); queue(note); });
  };
  list.onclick = e => { const b = e.target.closest('.qitem'); if (b) open(+b.dataset.i); };
  open(0);
}

async function detail(s, done) {
  clearMaps();
  const box = $('.qdetail');
  const shift = dist(s.lat, s.lng, s.photo_lat, s.photo_lng);
  box.innerHTML = `<div class="detail">
    <div><img class="photo" src="${photoUrl(s.photo)}" alt="Снимок объекта">
      <p class="small muted">Автор: ${esc(s.author || '—')} · снято ${new Date(s.shot_at).toLocaleString('ru-RU')} · точность ±${Math.round(s.accuracy)} м</p></div>
    <div>
      <h2 style="margin-top:0">${esc(s.name)}</h2>
      ${s.descr ? `<p>${esc(s.descr)}</p>` : '<p class="muted small">Без описания</p>'}
      <ul class="checks">
        <li class="${shift <= 50 ? 'ok' : 'bad'}">Точка объекта в ${Math.round(shift)} м от места съёмки (допустимо до 50 м)</li>
        <li class="exif muted">Проверяю место игрока…</li>
        <li class="dups muted">Ищу объекты рядом…</li>
      </ul>
      <div class="map"></div>
      <p class="small muted">Синяя точка — где стоял игрок при съёмке, жёлтая — предложенный объект, бирюзовые — уже есть на карте.</p>
      <label class="f">Название</label><input class="input nm" maxlength="60" value="${esc(s.name)}">
      <label class="f">Тип</label>
      <select class="input kd"><option value="spring" ${s.kind === 'spring' ? 'selected' : ''}>Источник</option><option value="shrine" ${s.kind === 'shrine' ? 'selected' : ''}>Капище</option></select>
      <div class="row"><button class="btn ok yes">Одобрить</button></div>
      <label class="f">Причина отказа</label>
      <select class="input rs">${REASONS.map(r => `<option>${esc(r)}</option>`).join('')}<option value="">Другое…</option></select>
      <input class="input rs2" maxlength="200" placeholder="Своя причина" style="display:none;margin-top:6px">
      <div class="row"><button class="btn no nope">Отклонить</button></div>
      <p class="small msg"></p>
    </div></div>`;
  const rs = $('.rs', box), rs2 = $('.rs2', box);
  rs.onchange = () => { rs2.style.display = rs.value ? 'none' : ''; };

  // карта: место съёмки, объект, соседи
  const m = L.map($('.map', box)).setView([s.lat, s.lng], 18);
  maps.push(m);
  tiles().addTo(m);
  L.circle([s.photo_lat, s.photo_lng], { radius: 50, color: '#fbbf24', dashArray: '6 6', weight: 1, fillOpacity: .05 }).addTo(m);
  L.circle([s.photo_lat, s.photo_lng], { radius: s.accuracy, color: '#38bdf8', weight: 1, fillOpacity: .08 }).addTo(m);
  L.circleMarker([s.photo_lat, s.photo_lng], { radius: 6, className: 'pin-me' }).bindTooltip('Место съёмки').addTo(m);
  L.circleMarker([s.lat, s.lng], { radius: 9, className: 'pin-obj' }).bindTooltip('Объект').addTo(m);

  // 4.26: где был игрок по данным сервера игры в момент заявки (снимки больше без геометки в файле — её писал сам телефон)
  { const li = $('.exif', box);
    if (s.srv_dist == null) { li.className = 'muted'; li.textContent = 'Место игрока по серверу неизвестно (заявка подана до 4.26)'; }
    else { li.className = s.srv_dist <= 150 ? 'ok' : 'bad'; li.textContent = `Сервер игры видел игрока в ${s.srv_dist} м от места съёмки`; } }

  const d = 0.003;
  placesIn(s.lat - d, s.lng - d * 2, s.lat + d, s.lng + d * 2).then(list => {
    const li = $('.dups', box);
    const near = list.filter(p => p.active !== false).map(p => ({ ...p, d: dist(s.lat, s.lng, p.lat, p.lng) })).sort((a, b) => a.d - b.d);
    near.forEach(p => L.circleMarker([p.lat, p.lng], { radius: 6, className: p.kind === 'shrine' ? 'pin-shrine' : 'pin-poi' }).bindTooltip(esc(p.name)).addTo(m));
    const close = near.filter(p => p.d < 30);
    li.className = close.length ? 'warn' : 'ok';
    li.textContent = close.length ? `Рядом уже есть: ${close.map(p => `«${p.name}» (${Math.round(p.d)} м)`).join(', ')}` : `Ближайший объект: ${near[0] ? `«${near[0].name}», ${Math.round(near[0].d)} м` : 'нет в радиусе 300 м'}`;
  });

  const msg = $('.msg', box);
  const decide = async (approve) => {
    const reason = approve ? null : (rs.value || rs2.value.trim());
    if (!approve && !reason) { msg.textContent = 'Укажите причину отказа'; return; }
    box.querySelectorAll('.btn').forEach(b => { b.disabled = true; });
    const name = $('.nm', box).value.trim() || s.name;
    const { error } = await sb.rpc('moderate', { p_id: s.id, p_approve: approve, p_reason: reason, p_name: name, p_kind: $('.kd', box).value });
    if (error) { msg.textContent = 'Ошибка: ' + error.message; box.querySelectorAll('.btn').forEach(b => { b.disabled = false; }); return; }
    done(approve
      ? `«${name}» одобрено. Автор увидит место на карте в течение 3 минут (или сразу после перезапуска игры), остальные игроки — в течение 5 минут.`
      : `Заявка «${s.name}» отклонена, автору придёт уведомление с причиной.`);
  };
  $('.yes', box).onclick = () => decide(true);
  $('.nope', box).onclick = () => decide(false);
}

/* ---------- места: OpenStreetMap + правки и места игроков с сервера (как видит игра) ---------- */
async function placesIn(s, w, n, e) {
  const [osm, srv] = await Promise.all([
    Osm.fetch(s, w, n, e).catch(err => { console.warn(err); return []; }),
    sb.from('pois').select('id, name, kind, cat, source, active, lat, lng, photo').gte('lat', s).lte('lat', n).gte('lng', w).lte('lng', e).limit(5000)
      .then(({ data }) => data || []),
  ]);
  const m = new Map();
  osm.forEach(p => m.set(p.id, { ...p, source: 'osm', active: true, srv: false }));
  srv.forEach(p => m.set(p.id, { ...p, srv: true }));
  return [...m.values()];
}

function poiMap() {
  app.innerHTML = '<div class="bigmap"></div><p class="small muted"><b class="st"></b> Места загружаются при масштабе от 16. Бирюзовые — Источники, оранжевые — Капища, серые — скрытые, с белой обводкой — от игроков. Клик — изменить.</p>';
  const m = L.map($('.bigmap')).setView([55.7539, 37.6208], 16);
  maps.push(m);
  tiles().addTo(m);
  const layer = L.layerGroup().addTo(m), st = $('.st');
  let seq = 0, loaded = null;
  // грузим с запасом вокруг видимой области; пока карта в её пределах (например, сдвиг при открытии подсказки) — не перегружаем
  const load = async force => {
    if (m.getZoom() < 16) { layer.clearLayers(); loaded = null; st.textContent = ''; return; }
    if (force !== true && loaded && loaded.contains(m.getBounds())) return;
    const b = m.getBounds().pad(0.3), my = ++seq;
    loaded = b;
    st.textContent = 'Загружаю места…';
    const list = await placesIn(b.getSouth(), b.getWest(), b.getNorth(), b.getEast());
    if (my !== seq) return;
    st.textContent = `Мест: ${list.length}.`;
    layer.clearLayers();
    list.forEach(p => {
      const cls = (p.active ? (p.kind === 'shrine' ? 'pin-shrine' : 'pin-poi') : 'pin-off') + (p.source === 'player' ? ' pin-player' : '');
      L.circleMarker([p.lat, p.lng], { radius: 7, className: cls }).addTo(layer).bindPopup(() => editor(p, () => load(true)));
    });
  };
  m.on('moveend', () => load());
  load();
}

// Правка места. Для объекта OSM создаётся запись-правка на сервере с тем же id.
function editor(p, reload) {
  const el = document.createElement('div');
  el.innerHTML = `${p.photo ? `<img src="${photoUrl(p.photo)}" style="width:100%;border-radius:8px">` : ''}
    <div class="small muted">${esc(p.id)} · ${esc(p.cat || '')} · ${p.source === 'osm' ? 'OpenStreetMap' : 'заявка игрока'}${p.source === 'osm' && p.srv ? ' · есть правка' : ''}</div>
    <input class="input nm" maxlength="80" value="${esc(p.name)}">
    <select class="input kd"><option value="spring" ${p.kind === 'spring' ? 'selected' : ''}>Источник</option><option value="shrine" ${p.kind === 'shrine' ? 'selected' : ''}>Капище</option></select>
    <label class="small"><input type="checkbox" class="ac" ${p.active ? 'checked' : ''}> показывать на карте</label>
    <div class="row"><button class="btn primary sv">Сохранить</button><span class="small msg"></span></div>`;
  $('.sv', el).onclick = async () => {
    const upd = { name: $('.nm', el).value.trim().slice(0, 80) || p.name, kind: $('.kd', el).value, active: $('.ac', el).checked, updated_at: new Date().toISOString() };
    const { error } = p.srv
      ? await sb.from('pois').update(upd).eq('id', p.id)
      : await sb.from('pois').insert({ id: p.id, source: 'osm', cat: p.cat, lat: p.lat, lng: p.lng, ...upd });
    $('.msg', el).textContent = error ? 'Ошибка: ' + error.message : 'Сохранено — игроки увидят изменение в течение 20 минут';
    if (!error) { Object.assign(p, upd, { srv: true }); setTimeout(reload, 1200); }
  };
  return el;
}

/* ---------- история решений ---------- */
async function hist() {
  app.innerHTML = '<p class="muted">Загружаю…</p>';
  const { data, error } = await sb.from('poi_submissions').select('id, name, kind, status, reason, author, reviewed_at, photo')
    .neq('status', 'pending').order('reviewed_at', { ascending: false }).limit(100);
  if (error) { app.innerHTML = `<p class="muted">Ошибка: ${esc(error.message)}</p>`; return; }
  app.innerHTML = `<div class="card"><table><tr><th></th><th>Место</th><th>Решение</th><th>Когда</th></tr>${data.map(s => `
    <tr><td><img src="${photoUrl(s.photo)}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px"></td>
      <td><b>${esc(s.name)}</b><br><span class="small muted">${KIND[s.kind]} · ${esc(s.author || '')}</span></td>
      <td class="st-${s.status}">${s.status === 'approved' ? 'Одобрено' : 'Отклонено'}${s.reason ? `<br><span class="small muted">${esc(s.reason)}</span>` : ''}</td>
      <td class="small muted">${s.reviewed_at ? new Date(s.reviewed_at).toLocaleString('ru-RU') : ''}</td></tr>`).join('')}</table>
    ${data.length ? '' : '<p class="muted">Пока ничего не рассмотрено.</p>'}</div>`;
}

/* ---------- 5.1.22: аналитика (server/035_analytics.sql) ----------
   Свои данные игры, без сторонних сервисов: активность (DAU, сессии), воронка новичка (знакомство → обучение → первые вехи →
   следующий день), удержание по когортам дня создания Ловчего, уровни и где остановились ушедшие, ретроспектива по
   сохранениям (картина видна и до накопления событий). Считает база (an_activity, an_funnel, an_retention, an_saves,
   an_saves_rows) — только модератору со вторым фактором (is_admin()). Дни — по Москве */
const AN = { days: 30, idle: 7 };
// шаги обучения (TUT в js/data.js, TUT_V 5) и Кампании (CAMPAIGN) — как называть их здесь
const TUT_IDS = ['catch1', 'catch2', 'menu', 'spirits', 'card', 'power', 'dex', 'spring', 'bag', 'cocoons', 'quests', 'path'];
const TUT_NAMES = { catch1: 'Поймать первого учебного духа', catch2: 'Поймать второго учебного духа', menu: 'Открыть меню', spirits: 'Раздел «Духи»',
  card: 'Карточка духа', power: 'Усилить духа', dex: 'Бестиарий', spring: 'Зачерпнуть силу Источника', bag: 'Сумка', cocoons: 'Коконы',
  quests: 'Задания', path: 'Путь Ловчего' };
const CAMP_NAMES = [['Первая охота', 'Тепло кокона', 'Вызов Лиги', 'Знамя клана', 'Эволюция', 'Искры и монеты', 'Дымок ладана', 'Врата Перепутицы', 'Дальний путь']];
const PF_NAMES = { web: 'Сайт', pwa: 'Сайт на экране «Домой»', apk: 'Приложение с сайта', play: 'Google Play', rustore: 'RuStore',
  android: 'Android', ios: 'iOS', desktop: 'компьютер', other: 'другое' };
const num = n => (n == null || !Number.isFinite(+n) ? '—' : Math.round(+n).toLocaleString('ru-RU'));
const pct = (a, b) => { if (!(b > 0)) return '—'; const p = a / b * 100; return (p > 0 && p < 10 ? p.toFixed(1).replace('.', ',') : Math.round(p)) + '%'; };
const secs = s => (s == null || !Number.isFinite(+s) ? '—' : s < 60 ? Math.round(s) + ' с'
  : s < 3600 ? (s / 60).toFixed(s < 600 ? 1 : 0).replace('.', ',') + ' мин' : s < 172800 ? (s / 3600).toFixed(1).replace('.', ',') + ' ч'
  : (s / 86400).toFixed(1).replace('.', ',') + ' дн.');
const dd = d => { const p = String(d || '').slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}.${p[1]}` : '—'; };
const ddy = d => { const p = String(d || '').slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : '—'; };
const addDays = (d, n) => new Date(Date.parse(String(d).slice(0, 10) + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const tutName = (k, ids) => { const id = (ids && ids[k]) || TUT_IDS[k - 1]; return TUT_NAMES[id] || id || `шаг ${k}`; };
const campName = (ch, s) => {
  if (ch == null) return 'Кампания ещё не началась';
  const steps = CAMP_NAMES[ch], g = `Глава ${['I', 'II', 'III', 'IV', 'V'][ch] || ch + 1}`;
  if (steps && s >= steps.length) return `${g} пройдена`;
  return `${g}, шаг ${(s || 0) + 1}${steps && steps[s] ? ` «${steps[s]}»` : ''}`;
};
const pfName = k => String(k).split('-').map(x => PF_NAMES[x] || x).join(' · ');
const card = (title, sub, body = '') => `<section class="card"><h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}${body}</section>`;
const kpis = list => `<div class="kpis">${list.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;
const legend = list => `<div class="legend">${list.map(([c, t]) => `<span><i class="${c}"></i>${t}</span>`).join('')}</div>`;
const nice = v => { const p = 10 ** Math.floor(Math.log10(v)), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };

// столбики: items — [{ a, b, label, tip }] (a — нижний ряд, b — верхний, через просвет 2px); ось — 0, половина и «круглый» верх;
// подписи по оси X — у каждого every-го. Значение — во всплывающей подсказке (наведение и фокус) и в таблице рядом
function columns(items, h = 150, every = 1) {
  const top = nice(Math.max(1, ...items.map(x => (x.a || 0) + (x.b || 0))));
  const seg = (v, c) => (v > 0 ? `<i class="${c}" style="height:${(v / top * 100).toFixed(2)}%"></i>` : '');
  const ax = v => v.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
  return `<div class="colchart"><div class="yl" style="height:${h}px"><span>${ax(top)}</span><span>${ax(top / 2)}</span><span>0</span></div>
    <div class="plot"><div class="cols" style="height:${h}px">${items.map(x => `<div class="c" tabindex="0" data-tip="${esc(x.tip)}">${seg(x.b, 's2')}${seg(x.a, 's1')}</div>`).join('')}</div>
    <div class="xl">${items.map((x, i) => `<span>${i % every === 0 ? esc(x.label) : ''}</span>`).join('')}</div></div></div>`;
}
// полоса в строке таблицы: части [значение, класс цвета] — доля от max
const hbar = (parts, max) => `<div class="hb">${parts.filter(p => p[0] > 0).map(([v, c]) => `<i class="${c}" style="width:${(v / Math.max(1, max) * 100).toFixed(2)}%"></i>`).join('')}</div>`;
// ячейка удержания: доля, цвет — один оттенок, чем больше, тем ярче (масштаб — по самой высокой доле в таблице)
const heat = (n, base, vmax, tip, now) => {
  if (!(base > 0)) return '<td class="heat"></td>';
  const a = 0.08 + 0.62 * Math.min(1, n / base / Math.max(vmax, 0.0001));
  return `<td class="heat${now ? ' now' : ''}" tabindex="0" style="background:rgba(57,135,229,${a.toFixed(3)})" data-tip="${esc(tip)}">${pct(n, base)}${now ? '…' : ''}</td>`;
};

// подсказка у столбиков и ячеек: одна на страницу, текст — только textContent
let tipEl = null;
function tipShow(t) {
  if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'an-tip'; document.body.appendChild(tipEl); }
  tipEl.textContent = t.dataset.tip || '';
  tipEl.style.display = 'block';
  const r = t.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  tipEl.style.left = Math.max(6, Math.min(innerWidth - w - 6, r.left + r.width / 2 - w / 2)) + 'px';
  tipEl.style.top = (r.top - h - 8 < 6 ? r.bottom + 8 : r.top - h - 8) + 'px';
}
function tipHide() { if (tipEl) tipEl.style.display = 'none'; }
app.addEventListener('pointerover', e => { const t = e.target.closest('[data-tip]'); if (t) tipShow(t); });
app.addEventListener('pointerout', e => { if (e.target.closest('[data-tip]')) tipHide(); });
app.addEventListener('focusin', e => { const t = e.target.closest('[data-tip]'); if (t) tipShow(t); });
app.addEventListener('focusout', tipHide);
addEventListener('scroll', tipHide, true);

async function stats() {
  const grid = $('.an-grid');
  if (grid) grid.classList.add('loading'); // пересчёт — прежняя картина остаётся, пока не придут новые цифры
  else app.innerHTML = '<p class="muted">Считаю аналитику…</p>';
  const rpc = (fn, args) => Promise.resolve(sb.rpc(fn, args)).catch(e => ({ error: { message: String((e && e.message) || e) } }));
  const [act, fun, ret, sav] = await Promise.all([rpc('an_activity', { p_days: AN.days }), rpc('an_funnel', { p_days: AN.days }),
    rpc('an_retention', { p_days: AN.days }), rpc('an_saves', { p_idle: AN.idle })]);
  if (location.hash !== '#stats') return; // пока считали, открыли другую вкладку
  const missing = r => r.error && (r.error.code === 'PGRST202' || /Could not find the function/i.test(r.error.message || ''));
  if ([act, fun, ret, sav].some(missing)) {
    app.innerHTML = card('Аналитики ещё нет в базе', '', `<p>Примените <code>server/035_analytics.sql</code>: сначала тестовый контур, потом бэкап и боевая база;
      затем <code>notify pgrst, 'reload schema'</code>.</p><p class="small muted">Пока миграции нет, сервер игры события не пишет — игра работает как раньше.</p>`);
    return;
  }
  const part = (r, fn) => {
    if (r.error) return card('Ошибка', '', `<p class="muted">${esc(r.error.message)}</p>`);
    try { return fn(r.data || {}); } catch (e) { console.error(e); return card('Не удалось показать', '', `<p class="muted">${esc(e.message)}</p>`); }
  };
  const segs = (k, vals) => `<span class="seg">${vals.map(v => `<button data-k="${k}" data-v="${v}" class="${v === AN[k] ? 'on' : ''}">${v} дн.</button>`).join('')}</span>`;
  app.innerHTML = `<div class="an">
    <div class="an-filters"><span>Период ${segs('days', [7, 14, 30, 60])}</span><span>Ушедшие — не заходили ${segs('idle', [3, 7, 14, 30])}</span>
      <span><button class="btn small csv">Сохранения в CSV</button> <span class="small muted csvmsg"></span></span></div>
    <div class="an-grid">${part(act, anActivity)}${part(fun, anFunnel)}${part(ret, anRetention)}${part(sav, anLevels)}${part(sav, anSaves)}</div></div>`;
  app.querySelectorAll('.seg button').forEach(b => { b.onclick = () => { AN[b.dataset.k] = +b.dataset.v; stats(); }; });
  $('.csv', app).onclick = csv;
}

// активность: DAU (вернувшиеся и новые), сессии, платформы и версии
function anActivity(a) {
  // средний DAU — по полным дням: без сегодняшнего и без первого дня данных (сервер начал писать посреди дня)
  const days = a.days || [], since = a.since, full = days.filter(d => d.d !== a.today && (!since || d.d > since));
  const avg = full.length ? full.reduce((s, d) => s + d.dau, 0) / full.length : null;
  const sum = k => days.reduce((s, d) => s + (+d[k] || 0), 0), ses = sum('ses'), su = sum('su'), sec = sum('sec');
  const last = days[days.length - 1] || {}, S = a.ses || {}, every = days.length > 20 ? 5 : days.length > 10 ? 2 : 1;
  const H = ['<1', '1–3', '3–5', '5–10', '10–20', '20–30', '30–60', '60+'], hist = a.hist || {};
  const hn = H.reduce((s, _, i) => s + (+hist[i] || 0), 0);
  const list = (o, name) => { const e = Object.entries(o || {}).sort((x, y) => y[1] - x[1]), m = Math.max(1, ...e.map(x => x[1]));
    return e.length ? `<div class="tw"><table>${e.map(([k, n]) => `<tr><td class="lbl">${esc(name(k))}</td><td class="num">${num(n)}</td><td class="bar">${hbar([[n, 's1']], m)}</td></tr>`).join('')}</table></div>`
      : '<p class="muted small">Пока нет данных.</p>'; };
  return card(`Активность за ${days.length} дн.`,
    since ? `Активный день — хоть один запрос к серверу игры за день (по Москве); пишется с ${ddy(since)}. Сессии — время, пока игра на экране телефона, с версии 5.1.22.`
      : 'Дней активности ещё нет — они появятся после первых запросов игроков к серверу игры.',
    kpis([[num(last.dau), 'DAU сегодня (день идёт)'], [avg == null ? '—' : num(avg), `Средний DAU за ${full.length} полн. дн.`], [num(a.wau), 'WAU — за 7 дней'],
      [num(a.mau), 'MAU — за 30 дней'], [avg != null && a.mau ? pct(avg, a.mau) : '—', 'Средний DAU / MAU'], [secs(S.med), 'Медиана сессии'],
      [su ? (ses / su).toFixed(1).replace('.', ',') : '—', 'Сессий на игрока в день'], [su ? secs(sec / su) : '—', 'В игре на игрока в день']])
    + `<h3>DAU по дням</h3>${legend([['sw1', 'вернувшиеся'], ['sw2', 'новые (создали Ловчего в этот день)']])}`
    + columns(days.map(d => ({ a: d.dau - d.new, b: d.new, label: dd(d.d), tip: `${ddy(d.d)}: DAU ${num(d.dau)} — вернулись ${num(d.dau - d.new)}, новых ${num(d.new)}` })), 160, every)
    + `<h3>Длина сессий, минут</h3><p class="sub">${num(S.n)} сессий у ${num(S.users)} игроков; медиана ${secs(S.med)}, половина сессий — от ${secs(S.p25)} до ${secs(S.p75)}, в среднем ${secs(S.avg)}.</p>`
    + columns(H.map((l, i) => ({ a: +hist[i] || 0, label: l, tip: `${l} мин: ${num(hist[i] || 0)} сессий (${pct(+hist[i] || 0, hn)})` })), 110)
    + `<div class="two"><div><h3>Платформы (игроки с сессиями)</h3>${list(a.pf, pfName)}</div>
       <div><h3>Версии игры (за 7 дней)</h3>${list(a.ver, k => k)}</div></div>`
    + `<details><summary>Таблица по дням</summary><div class="tw"><table><tr><th>День</th><th class="num">DAU</th><th class="num">Новые</th><th class="num">Сессий</th>
       <th class="num">Игроков с сессиями</th><th class="num">Медиана сессии</th><th class="num">В игре на игрока</th></tr>
       ${days.slice().reverse().map(d => `<tr><td>${ddy(d.d)}</td><td class="num">${num(d.dau)}</td><td class="num">${num(d.new)}</td><td class="num">${num(d.ses)}</td>
         <td class="num">${num(d.su)}</td><td class="num">${secs(d.med)}</td><td class="num">${d.su ? secs(d.sec / d.su) : '—'}</td></tr>`).join('')}</table></div></details>`);
}

// воронка новичка: до создания Ловчего (от открывших игру) и после (от создавших), вехи и первые сутки
function anFunnel(f) {
  const pre = f.pre || {}, post = f.post || {}, N = Math.max(TUT_IDS.length, +f.tutN || 0), G = +f.guests || 0, R = +f.reg || 0;
  const v = (o, k, x = 'n') => +((o[k] || {})[x] || 0), med = (o, k) => (o[k] && o[k].med != null ? secs(o[k].med) : '—');
  const PRE = [['open', 'Впервые открыли игру (новый гость)'], ['onb:0', 'Стартовый экран'], ['onb:book', 'Книга-вступление'], ['onb:2', 'Ввод имени'], ['reg', 'Создали Ловчего']];
  const SEQ = [['reg', 'Создали Ловчего'], ['onb:4', 'Экран «Весь мир — твой»'], ['onb:go', 'Нажали «В путь»'], ['place', 'Выбрали место в Атласе'],
    ...Array.from({ length: N }, (_, i) => [`tut:${i + 1}`, `Обучение ${i + 1}/${N}: ${tutName(i + 1, f.tutIds)}`])];
  const MS = [['lvl:2', 'Уровень 2'], ['lvl:3', 'Уровень 3'], ['lvl:5', 'Уровень 5'], ['lvl:10', 'Уровень 10'], ['lvl:15', 'Уровень 15'],
    ['camp:1', 'Кампания: пройден 1 шаг'], ['camp:3', 'Кампания: 3 шага'], ['camp:5', 'Кампания: 5 шагов'], ['camp:9', 'Кампания: 9 шагов (глава I)'],
    ['d1', 'Вернулись на следующий день']];
  const preRows = PRE.map(([k, l], i) => `<tr><td class="lbl">${l}</td><td class="num">${num(v(pre, k))}</td><td class="bar">${hbar([[v(pre, k), 's1']], G)}</td>
    <td class="num">${pct(v(pre, k), G)}</td><td class="num">${i ? pct(v(pre, k), v(pre, PRE[i - 1][0])) : ''}</td><td class="num">${i ? med(pre, k) : ''}</td></tr>`).join('');
  const seqRows = SEQ.map(([k, l], i) => {
    const n = v(post, k), q = v(post, k, 'nq'), qn = i + 1 < SEQ.length ? v(post, SEQ[i + 1][0], 'nq') : 0;
    return `<tr><td class="lbl">${l}</td><td class="num">${num(n)}</td><td class="bar">${hbar([[n, 's1']], R)}</td><td class="num">${pct(n, R)}</td>
      <td class="num">${i ? pct(n, v(post, SEQ[i - 1][0])) : ''}</td><td class="num">${i ? med(post, k) : ''}</td><td class="num">${pct(v(post, k, 'in30'), R)}</td>
      <td class="num">${num(q)}</td><td class="num">${num(Math.max(0, q - qn))}</td></tr>`;
  }).join('');
  const msRows = MS.map(([k, l]) => `<tr><td class="lbl">${l}</td><td class="num">${num(v(post, k))}</td><td class="bar">${hbar([[v(post, k), 's1']], R)}</td>
    <td class="num">${pct(v(post, k), R)}</td><td class="num">${k === 'd1' ? '' : med(post, k)}</td><td class="num">${k === 'd1' ? '' : pct(v(post, k, 'in30'), R)}</td></tr>`).join('');
  const H = ['<1', '1–3', '3–5', '5–10', '10–20', '20–30', '30+'], fs = f.first || {}, fn = +f.firstN || 0;
  return card(`Воронка новичка за ${AN.days} дн.`,
    `Новые гости (первый запуск игры): ${num(G)} · создали Ловчего: ${num(R)} · не вернулись после дня создания: ${num(f.quit)} из ${num(f.quitBase)}
      (${pct(+f.quit || 0, +f.quitBase || 0)}) — среди создавших больше двух суток назад. Время — медиана от первого запуска или от создания Ловчего.`,
    `<h3>До создания Ловчего</h3><div class="tw"><table><tr><th>Шаг</th><th class="num">Дошли</th><th></th><th class="num">от открывших</th><th class="num">от предыдущего</th>
      <th class="num">время</th></tr>${preRows}</table></div>
     <h3>Первые минуты: знакомство и обучение</h3><div class="tw"><table><tr><th>Шаг</th><th class="num">Дошли</th><th></th><th class="num">от создавших</th>
      <th class="num">от предыдущего</th><th class="num">время</th><th class="num">за 30 мин</th><th class="num">не вернулись: дошли</th><th class="num">…и остановились здесь</th></tr>
      ${seqRows}</table></div>
     <h3>Вехи</h3><div class="tw"><table><tr><th>Веха</th><th class="num">Дошли</th><th></th><th class="num">от создавших</th><th class="num">время</th><th class="num">за 30 мин</th></tr>
      ${msRows}</table></div>
     <h3>Сколько минут новички играли в первые сутки</h3><p class="sub">По сессиям телефона: ${num(fn)} новичков, создавших Ловчего больше суток назад.</p>`
    + columns(H.map((l, i) => ({ a: +fs[i] || 0, label: l, tip: `${l} мин: ${num(fs[i] || 0)} новичков (${pct(+fs[i] || 0, fn)})` })), 110));
}

// удержание: доля когорты дня создания Ловчего, игравшая ровно на N-й день
function anRetention(r) {
  const rows = r.rows || [], today = r.today, D = [1, 3, 7, 14, 30];
  if (!rows.length) return card('Удержание по когортам', `Когорт пока нет: дни активности пишутся с применения миграции${r.from ? `, когорты — с ${ddy(r.from)}` : ''}. Пока смотрите «Ретроспективу по сохранениям» ниже.`);
  let vmax = 0;
  rows.forEach(c => D.forEach(n => { if (addDays(c.reg, n) <= today && c.n > 0) vmax = Math.max(vmax, c['d' + n] / c.n); }));
  const cell = (c, n) => {
    const day = addDays(c.reg, n);
    if (day > today) return '<td class="heat"></td>';
    return heat(c['d' + n], c.n, vmax, `Когорта ${ddy(c.reg)}, день ${n} (${ddy(day)}): ${num(c['d' + n])} из ${num(c.n)}${day === today ? ' — день ещё идёт' : ''}`, day === today);
  };
  // итог — по когортам, у которых N-й день уже закончился
  const tot = D.map(n => { const done = rows.filter(c => addDays(c.reg, n) < today); return [done.reduce((s, c) => s + c['d' + n], 0), done.reduce((s, c) => s + c.n, 0)]; });
  return card('Удержание по когортам дня создания Ловчего',
    'Доля Ловчих когорты, игравших ровно на N-й день после создания (дни по Москве). Пусто — день ещё не наступил, «…» — идёт сейчас. Чем ярче ячейка, тем выше доля.',
    `<div class="tw"><table><tr><th>Когорта</th><th class="num">Создали</th>${D.map(n => `<th class="num">D${n}</th>`).join('')}</tr>
      <tr><td><b>Все когорты</b></td><td class="num">${num(rows.reduce((s, c) => s + c.n, 0))}</td>${tot.map(([a, b]) => `<td class="num"><b>${pct(a, b)}</b></td>`).join('')}</tr>
      ${rows.map(c => `<tr><td>${ddy(c.reg)}</td><td class="num">${num(c.n)}</td>${D.map(n => cell(c, n)).join('')}</tr>`).join('')}</table></div>`);
}

// уровни и где остановились ушедшие (по сохранениям)
function anLevels(s) {
  const lv = s.levels || [], mx = Math.max(1, ...lv.map(x => x.n)), idle = s.idle || AN.idle, N = TUT_IDS.length;
  const it = s.idleTut || {}, itN = Object.values(it).reduce((a, b) => a + b, 0), camp = s.idleCamp || [];
  const tutRows = (o, total) => { const m = Math.max(1, ...Object.values(o));
    return [...Array.from({ length: N }, (_, i) => [i + 1, `Шаг ${i + 1}/${N}: ${tutName(i + 1)}`]), [0, 'Обучение пройдено']]
      .filter(([k]) => +o[k] > 0).map(([k, l]) => `<tr><td class="lbl">${l}</td><td class="num">${num(o[k])}</td><td class="bar">${hbar([[+o[k], 's1']], m)}</td>
        <td class="num">${pct(+o[k], total)}</td></tr>`).join(''); };
  const cm = Math.max(1, ...camp.map(x => x.n));
  const d0 = s.day0Tut || {}, d0n = +s.day0 || 0, dm = s.day0Min || {};
  const H = ['<1', '1–3', '3–5', '5–10', '10–20', '20–30', '30–60', '60+'];
  return card('Уровни и где остановились ушедшие', `По сохранениям: ушедшие — без сохранений ${idle} дн. и дольше, остальные — активные.`,
    `<h3>Уровни Ловчих</h3>${legend([['sw1', `активные (за ${idle} дн.)`], ['sw0', 'ушедшие']])}
     <div class="tw"><table><tr><th>Уровень</th><th class="num">Всего</th><th></th><th class="num">Активные</th><th class="num">Ушедшие</th><th class="num">ушли, %</th></tr>
      ${lv.map(x => `<tr><td>${x.l}</td><td class="num">${num(x.n)}</td><td class="bar">${hbar([[x.act, 's1'], [x.n - x.act, 's0']], mx)}</td>
        <td class="num">${num(x.act)}</td><td class="num">${num(x.n - x.act)}</td><td class="num">${pct(x.n - x.act, x.n)}</td></tr>`).join('')}</table></div>
     <h3>Ушедшие: на каком шаге обучения (${num(itN)})</h3><p class="sub">«Шаг k» — шаг, который Ловчий так и не выполнил.</p>
     <div class="tw"><table>${tutRows(it, itN) || '<tr><td class="muted">Ушедших нет.</td></tr>'}</table></div>
     ${camp.length ? `<h3>Ушедшие после обучения: где в Кампании</h3><div class="tw"><table>${camp.map(x => `<tr><td class="lbl">${esc(campName(x.ch, x.s))}</td>
        <td class="num">${num(x.n)}</td><td class="bar">${hbar([[x.n, 's1']], cm)}</td></tr>`).join('')}</table></div>` : ''}
     <h3>Ушли в первые сутки: ${num(d0n)} из ${num(s.day0Base)} (${pct(d0n, +s.day0Base || 0)})</h3>
     <p class="sub">Создали Ловчего больше двух суток назад, а последнее сохранение — в первые 24 часа. На каком шаге обучения остановились и сколько минут
       прошло от создания до последнего сохранения.</p>
     <div class="tw"><table>${tutRows(d0, d0n) || '<tr><td class="muted">Таких нет.</td></tr>'}</table></div>`
    + columns(H.map((l, i) => ({ a: +dm[i] || 0, label: l, tip: `${l} мин: ${num(dm[i] || 0)} (${pct(+dm[i] || 0, d0n)})` })), 110));
}

// ретроспектива по сохранениям: недели создания и «возвращаемость» (последнее сохранение не раньше N-го дня)
function anSaves(s) {
  const t = s.tot || {}, wk = s.weeks || [], D = [1, 3, 7, 14, 30];
  let vmax = 0;
  wk.forEach(w => D.forEach(n => { if (w['e' + n] > 0) vmax = Math.max(vmax, w['r' + n] / w['e' + n]); }));
  return card('Ретроспектива по сохранениям',
    `Без событий — по уже существующим сохранениям: дата создания Ловчего, последнее сохранение, шаг обучения и уровень. Первый Ловчий — ${ddy(t.since)}.`,
    kpis([[num(t.n), 'Ловчих всего'], [num(t.a1), 'Играли за сутки'], [num(t.a7), 'Играли за 7 дней'], [num(t.a30), 'Играли за 30 дней'], [num(t.n7), 'Новых за 7 дней'],
      [num(t.n30), 'Новых за 30 дней'], [pct(+t.tdone || 0, +t.n || 0), 'Прошли обучение'], [num(s.guests30), 'Гостей за 30 дней без Ловчего']])
    + `<h3>Недели создания Ловчего</h3><p class="sub">«Возвращаемость» DN — доля Ловчих, чьё последнее сохранение не раньше N-го дня после создания (из тех, кто мог до
       него дожить). По сохранениям виден только первый и последний день, поэтому это верхняя граница удержания из таблицы выше.</p>
     <div class="tw"><table><tr><th>Неделя с</th><th class="num">Создали</th><th class="num">Прошли обучение</th><th class="num">Медиана уровня</th>
      <th class="num">Играли за 7 дн.</th>${D.map(n => `<th class="num">D${n}+</th>`).join('')}</tr>
      ${wk.map(w => `<tr><td>${ddy(w.w)}</td><td class="num">${num(w.n)}</td><td class="num">${pct(w.tdone, w.n)}</td><td class="num">${num(w.lvl)}</td>
        <td class="num">${num(w.a7)}</td>${D.map(n => heat(w['r' + n], w['e' + n], vmax, `Неделя с ${ddy(w.w)}, D${n}+: ${num(w['r' + n])} из ${num(w['e' + n])}`)).join('')}</tr>`).join('')}
     </table></div>`);
}

// сохранения построчно — CSV для таблиц (точка с запятой, BOM — для русского Excel); без имён и id
async function csv() {
  const b = $('.csv', app), msg = $('.csvmsg', app);
  b.disabled = true; msg.textContent = 'Готовлю…';
  const { data, error } = await sb.rpc('an_saves_rows', { p_limit: 20000 });
  b.disabled = false; msg.textContent = error ? 'Ошибка: ' + error.message : `Строк: ${(data || []).length}`;
  if (error) return;
  const t = x => (x ? new Date(x).toLocaleString('ru-RU') : '');
  const rows = [['Создан', 'Последнее сохранение', 'Уровень', 'Шаг обучения (0 — пройдено)', 'Глава Кампании', 'Шаг Кампании', 'Поймано духов', 'Версия игры'],
    ...(data || []).map(r => [t(r.reg), t(r.last), r.lvl, r.tut, r.ch == null ? '' : r.ch + 1, r.s == null ? '' : r.s + 1, r.caught == null ? '' : r.caught,
      String(r.v || '').replace(/[^\w.-]/g, '').replace(/^[-=+@]+/, '')])]; // версию пишет телефон — без формул для таблиц
  const text = '﻿' + rows.map(r => r.map(x => { const v = String(x == null ? '' : x); return /[";\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = `duholov-saves-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

boot();
