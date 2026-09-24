'use strict';
/* Панель модерации: заявки игроков на новые места и правка объектов карты.
   Вход — по ссылке на почту (Supabase Auth), права — по таблице admins на сервере (RLS). */

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dist = (a, b, c, d) => { const R = 6371000, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
// путь снимка — только «<id игрока>/<id>.jpg» (заявку игрок пишет сам; иначе строка вырвалась бы из атрибута разметки)
const photoUrl = p => /^[0-9a-f-]{36}\/[A-Za-z0-9-]{6,64}\.jpg$/.test(p || '') ? `${CLOUD_CONFIG.url}/storage/v1/object/public/poi-photos/${p}` : 'icons/icon-192.png';
const KIND = { spring: 'Родник', shrine: 'Капище' };
const REASONS = ['Объекта нет на фото или его не видно', 'Геометка не совпадает с местом объекта', 'Такой объект уже есть на карте',
  'Частная территория, школа или детский сад', 'Опасное место (дорога, стройка)', 'Неприемлемое содержание', 'Неинтересный объект'];
const tiles = () => L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });

const sb = supabase.createClient(CLOUD_CONFIG.url, CLOUD_CONFIG.anonKey, { auth: { persistSession: true, storageKey: CLOUD_CONFIG.admin, detectSessionInUrl: true } });
const app = $('#app');
let maps = [];
const clearMaps = () => { maps.forEach(m => m.remove()); maps = []; };

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session || session.user.is_anonymous) return login();
  $('.who').innerHTML = `${esc(session.user.email || session.user.id)} · <button class="btn small out">Выйти</button>`;
  $('.who .out').onclick = async () => { await sb.auth.signOut(); location.reload(); };
  const { data: isAdmin, error } = await sb.rpc('is_admin');
  if (error || !isAdmin) {
    app.innerHTML = `<div class="card login"><h2>Нет прав модератора</h2>
      <p>Вход выполнен, но этой учётной записи нет в списке модераторов.</p>
      <p class="small muted">ID учётной записи:<br><code>${esc(session.user.id)}</code></p>
      <p class="small muted">Владелец проекта добавляет модератора в Supabase → SQL Editor:<br><code>insert into public.admins (user_id) values ('${esc(session.user.id)}');</code></p></div>`;
    return;
  }
  const tabs = [['queue', 'Заявки'], ['map', 'Объекты на карте'], ['history', 'История']];
  const nav = $('.tabs');
  nav.innerHTML = tabs.map(([k, t]) => `<button data-t="${k}">${t}</button>`).join('');
  nav.onclick = e => { const b = e.target.closest('[data-t]'); if (b) show(b.dataset.t); };
  show(location.hash.slice(1) === 'map' ? 'map' : location.hash.slice(1) === 'history' ? 'history' : 'queue');
}

function show(tab) {
  history.replaceState(null, '', '#' + tab);
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  clearMaps();
  ({ queue, map: poiMap, history: hist })[tab]();
}

function login() {
  app.innerHTML = `<div class="card login"><h2>Вход для модераторов</h2>
    <p class="muted small">Введите почту — придёт письмо со ссылкой для входа.</p>
    <input class="input em" type="email" placeholder="почта" autocomplete="email">
    <div class="row"><button class="btn primary go">Получить ссылку</button></div>
    <p class="small msg"></p></div>`;
  const go = $('.go'), msg = $('.msg');
  go.onclick = async () => {
    const email = $('.em').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = 'Проверьте адрес почты'; return; }
    go.disabled = true;
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    go.disabled = false;
    msg.textContent = error ? 'Ошибка: ' + error.message : 'Письмо отправлено. Откройте ссылку из него в этом же браузере.';
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
      <p class="small muted">Автор: ${esc(s.author || '—')} · снято ${new Date(s.shot_at).toLocaleString('ru-RU')} · GPS ±${Math.round(s.accuracy)} м</p></div>
    <div>
      <h2 style="margin-top:0">${esc(s.name)}</h2>
      ${s.descr ? `<p>${esc(s.descr)}</p>` : '<p class="muted small">Без описания</p>'}
      <ul class="checks">
        <li class="${shift <= 50 ? 'ok' : 'bad'}">Точка объекта в ${Math.round(shift)} м от места съёмки (допустимо до 50 м)</li>
        <li class="exif muted">Проверяю геометку в файле…</li>
        <li class="dups muted">Ищу объекты рядом…</li>
      </ul>
      <div class="map"></div>
      <p class="small muted">Синяя точка — где стоял игрок при съёмке, жёлтая — предложенный объект, бирюзовые — уже есть на карте.</p>
      <label class="f">Название</label><input class="input nm" maxlength="60" value="${esc(s.name)}">
      <label class="f">Тип</label>
      <select class="input kd"><option value="spring" ${s.kind === 'spring' ? 'selected' : ''}>Родник</option><option value="shrine" ${s.kind === 'shrine' ? 'selected' : ''}>Капище</option></select>
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

  // геометка внутри файла должна совпасть с координатами заявки
  fetch(photoUrl(s.photo)).then(r => r.arrayBuffer()).then(buf => {
    const g = Exif.read(buf), li = $('.exif', box);
    if (!g) { li.className = 'bad'; li.textContent = 'В файле нет геометки'; return; }
    const d = dist(g.lat, g.lng, s.photo_lat, s.photo_lng);
    const dt = g.time ? Math.abs(g.time - Date.parse(s.shot_at)) / 60000 : null;
    li.className = d <= 5 && (dt == null || dt < 5) ? 'ok' : 'bad';
    li.textContent = `Геометка в файле: ${g.lat.toFixed(6)}, ${g.lng.toFixed(6)} — ${d <= 5 ? 'совпадает с заявкой' : `расходится на ${Math.round(d)} м`}${dt != null ? `, время съёмки ${dt < 5 ? 'совпадает' : `расходится на ${Math.round(dt)} мин`}` : ''}`;
  }).catch(() => { const li = $('.exif', box); li.className = 'bad'; li.textContent = 'Не удалось прочитать файл снимка'; });

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
  app.innerHTML = '<div class="bigmap"></div><p class="small muted"><b class="st"></b> Места загружаются при масштабе от 16. Бирюзовые — Родники, оранжевые — Капища, серые — скрытые, с белой обводкой — от игроков. Клик — изменить.</p>';
  const m = L.map($('.bigmap')).setView([55.7539, 37.6208], 16);
  maps.push(m);
  tiles().addTo(m);
  navigator.geolocation && navigator.geolocation.getCurrentPosition(p => m.setView([p.coords.latitude, p.coords.longitude], 16), () => {}, { timeout: 8000 });
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
    <select class="input kd"><option value="spring" ${p.kind === 'spring' ? 'selected' : ''}>Родник</option><option value="shrine" ${p.kind === 'shrine' ? 'selected' : ''}>Капище</option></select>
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

boot();
