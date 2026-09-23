'use strict';
/* «Места»: игрок предлагает реальный объект для карты.
   Снимок делается только камерой в игре, в момент съёмки фиксируется GPS — координаты записываются в сам
   файл (EXIF) и в заявку. Точку объекта можно сдвинуть не дальше 50 м от места съёмки (это же проверяет сервер).
   Заявку рассматривает модератор; одобренная появляется на карте как Родник или Капище. */

const Propose = {
  MIN_LEVEL: 5,
  MAX_ACC: 30,        // требуемая точность GPS, м
  MAX_SHIFT: 50,      // насколько можно сдвинуть точку от места съёмки, м
  DUP: 20,            // ближе этого к существующему объекту — дубликат
  unseen: 0,

  badge() { return this.unseen ? '!' : ''; },
  statusName: { pending: 'На проверке', approved: 'Одобрено', rejected: 'Отклонено' },

  /* ---------- экран «Места» ---------- */
  async screen() {
    this.unseen = 0;
    const lock = S.d.level < this.MIN_LEVEL;
    const scr = UI.screen('Места', `
      <div class="prop-intro">
        <p>Родники и Капища стоят у настоящих мест. Знаешь интересный объект рядом? Предложи его!</p>
        <ul class="prop-rules">
          <li><b>Подходят:</b> памятники, скульптуры, фонтаны, мозаики, необычные здания, храмы, парки, родники, смотровые площадки.</li>
          <li><b>Не подходят:</b> частные дома и дворы, школы и детские сады, опасные места (проезжая часть, стройки), обычные магазины.</li>
          <li>Стой рядом с объектом: снимок получает геометку, модератор сверяет её с точкой на карте.</li>
        </ul>
        <button class="btn primary wide prop-new" ${lock ? 'disabled' : ''}>Сфотографировать объект</button>
        ${lock ? `<p class="small center">Предлагать места можно с ${this.MIN_LEVEL} уровня Ловчего.</p>` : '<p class="small center">Не больше 5 заявок в сутки.</p>'}
      </div>
      <h3 class="prof-h">Мои заявки</h3>
      <div class="prop-list"><p class="small">Загружаю…</p></div>`, 'prop-screen');
    scr.querySelector('.prop-new').onclick = () => this.camera();
    this.renderList(scr.querySelector('.prop-list'));
  },
  async renderList(box) {
    try {
      const rows = await this.mine();
      box.innerHTML = rows.length ? rows.map(r => `
        <div class="prop-item">
          <div class="prop-thumb" style="background-image:url('${Poi.photoUrl(r.photo)}')"></div>
          <div class="row-main"><b>${U.esc(r.name)}</b>
            <small>${r.kind === 'shrine' ? 'Капище' : 'Родник'} · ${new Date(r.created_at).toLocaleDateString('ru-RU')}${r.reason ? ' · ' + U.esc(r.reason) : ''}</small></div>
          <span class="prop-st ${r.status}">${this.statusName[r.status]}</span>
        </div>`).join('') : '<p class="small">Заявок пока нет.</p>';
    } catch (e) { box.innerHTML = `<p class="small">Нет связи с сервером: ${U.esc(e.message)}</p>`; }
  },
  async mine() {
    const sb = await Cloud.client();
    const { data, error } = await sb.from('poi_submissions').select('id, name, kind, status, reason, created_at, photo')
      .order('created_at', { ascending: false }).limit(30);
    if (error) throw new Error(error.message);
    return data;
  },

  // При входе в игру: сообщить о решениях по заявкам и выдать награду за одобренные
  async checkResults() {
    if (!Cloud.configured()) return;
    try {
      const rows = (await this.mine()).filter(r => r.status !== 'pending' && !S.d.props[r.id]);
      rows.reverse().forEach(r => {
        S.d.props[r.id] = r.status;
        if (r.status === 'approved') {
          const got = S.giveRewards({ xp: 1000, sparks: 500, charm: 10 });
          UI.toast(`Место «${U.esc(r.name)}» одобрено и появилось на карте! ${got.map(x => `${x.label} +${U.fmtNum(x.n)}`).join(', ')}`, 'good');
        } else UI.toast(`Место «${U.esc(r.name)}» отклонено${r.reason ? ': ' + U.esc(r.reason) : ''}`);
      });
      if (rows.length) { this.unseen = rows.length; S.save(); UI.refreshHud(); }
    } catch (e) { console.warn('Заявки:', e.message); }
  },

  /* ---------- съёмка ---------- */
  camera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { UI.toast('Камера недоступна на этом устройстве'); return; }
    const el = U.el(`<div class="cam-screen">
      <video autoplay playsinline muted></video>
      <div class="cam-top"><button class="btn-round cam-x">${UI.I.close}</button><span class="cam-gps">Ищу GPS…</span></div>
      <div class="cam-hint">Наведи камеру на объект целиком</div>
      <button class="cam-shot" aria-label="Снимок"></button>
    </div>`);
    document.body.appendChild(el);
    const video = el.querySelector('video'), gpsEl = el.querySelector('.cam-gps');
    let stream = null, watch = null, fix = null;
    const close = () => {
      UI.popLayer(close);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (watch != null) navigator.geolocation.clearWatch(watch);
      el.remove();
    };
    UI.pushLayer(close);
    el.querySelector('.cam-x').onclick = close;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false })
      .then(s => { if (!el.isConnected) { s.getTracks().forEach(t => t.stop()); return; } stream = s; video.srcObject = s; video.play().catch(() => {}); })
      .catch(() => { UI.toast('Нет доступа к камере'); close(); });
    // геопозиция следит всё время съёмки: к моменту снимка уже есть свежая точка
    const onFix = f => {
      fix = f;
      gpsEl.textContent = `GPS ±${Math.round(f.acc)} м`;
      gpsEl.className = 'cam-gps ' + (f.acc <= this.MAX_ACC ? 'ok' : 'weak');
    };
    if (DEV && MapView.demo) onFix({ lat: MapView.pos.lat, lng: MapView.pos.lng, acc: 5, t: Date.now() });
    else if ('geolocation' in navigator) {
      watch = navigator.geolocation.watchPosition(p => onFix({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, t: p.timestamp }),
        () => { gpsEl.textContent = 'Нет GPS'; gpsEl.className = 'cam-gps bad'; }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
    }
    el.querySelector('.cam-shot').onclick = async () => {
      if (!stream || !video.videoWidth) { UI.toast('Камера ещё включается'); return; }
      if (!fix || Date.now() - fix.t > 15000) { UI.toast('Жду сигнал GPS…'); return; }
      if (fix.acc > this.MAX_ACC) { UI.toast(`GPS неточный (±${Math.round(fix.acc)} м). Выйди на открытое место и подожди.`); return; }
      Sfx.play('hit'); U.vibrate(30);
      const shot = { ...fix, t: Date.now() };
      try {
        const blob = await this.capture(video, shot);
        close();
        this.form(blob, shot);
      } catch (e) { UI.toast('Не удалось сделать снимок'); }
    };
  },
  // кадр → JPEG (до 1280 px) с геометкой в EXIF
  async capture(video, fix) {
    const k = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(video.videoWidth * k); c.height = Math.round(video.videoHeight * k);
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    for (const q of [0.85, 0.72, 0.6]) {
      const b = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
      const out = new Blob([Exif.embed(await b.arrayBuffer(), { lat: fix.lat, lng: fix.lng, acc: fix.acc, time: fix.t })], { type: 'image/jpeg' });
      if (out.size < 950000) return out;
    }
    throw new Error('Слишком большой снимок');
  },

  /* ---------- заявка ---------- */
  form(blob, fix) {
    const url = URL.createObjectURL(blob);
    let kind = 'spring', pt = { lat: fix.lat, lng: fix.lng };
    const scr = UI.screen('Новое место', `
      <div class="prop-form">
        <div class="prop-photo" style="background-image:url('${url}')"></div>
        <label class="prop-label">Название</label>
        <input class="input prop-name" maxlength="60" placeholder="Например: Памятник Пушкину">
        <label class="prop-label">Чем интересно (необязательно)</label>
        <textarea class="input prop-descr" maxlength="300" rows="2" placeholder="Коротко для модератора"></textarea>
        <label class="prop-label">Что здесь будет</label>
        <div class="seg prop-kind"><button data-k="spring" class="on">Родник</button><button data-k="shrine">Капище</button></div>
        <p class="small prop-kind-hint">Родник — для любого интересного объекта. Капище — для заметных мест: памятник, парк, крупное здание.</p>
        <label class="prop-label">Точка объекта</label>
        <div class="prop-map"></div>
        <p class="small">Круг — ${this.MAX_SHIFT} м от места съёмки (±${Math.round(fix.acc)} м). Перетащи булавку точно на объект.</p>
        <div class="prop-warn small"></div>
        <button class="btn primary wide prop-send">Отправить на проверку</button>
      </div>`, 'prop-screen', () => { URL.revokeObjectURL(url); if (map) map.remove(); });
    scr.querySelector('.prop-kind').addEventListener('click', e => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      kind = b.dataset.k;
      U.$$('[data-k]', scr).forEach(x => x.classList.toggle('on', x === b));
    });
    const warn = scr.querySelector('.prop-warn');
    const checkDup = () => {
      const near = Poi.nearest(pt.lat, pt.lng, this.DUP);
      warn.textContent = near ? `Здесь уже есть «${near.name}» (${Math.round(near.d)} м). Дубликаты отклоняются.` : '';
    };
    // мини-карта с булавкой
    let map = null;
    setTimeout(() => {
      if (!scr.isConnected) return;
      map = L.map(scr.querySelector('.prop-map'), { zoomControl: false, attributionControl: false }).setView([fix.lat, fix.lng], 18);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      L.circle([fix.lat, fix.lng], { radius: this.MAX_SHIFT, className: 'prop-zone', interactive: false }).addTo(map);
      L.circleMarker([fix.lat, fix.lng], { radius: 4, className: 'prop-me', interactive: false }).addTo(map);
      Poi.near(fix.lat, fix.lng, 200).forEach(p => L.circleMarker([p.lat, p.lng], { radius: 6, className: 'prop-exist' }).bindTooltip(U.esc(p.name)).addTo(map));
      const pin = L.marker([fix.lat, fix.lng], { draggable: true, icon: L.divIcon({ className: 'mk', iconSize: [34, 44], iconAnchor: [17, 42],
        html: '<div class="mk-pin"><svg viewBox="0 0 24 30"><path d="M12 29s-10-10-10-17a10 10 0 0 1 20 0c0 7-10 17-10 17z" fill="#fbbf24" stroke="#92400e" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="#92400e"/></svg></div>' }) }).addTo(map);
      pin.on('dragend', () => {
        let ll = pin.getLatLng();
        const d = U.dist(fix.lat, fix.lng, ll.lat, ll.lng);
        if (d > this.MAX_SHIFT) { // вернуть на границу круга
          const k = (this.MAX_SHIFT - 1) / d;
          ll = L.latLng(fix.lat + (ll.lat - fix.lat) * k, fix.lng + (ll.lng - fix.lng) * k);
          pin.setLatLng(ll);
          UI.toast(`Не дальше ${this.MAX_SHIFT} м от места съёмки`);
        }
        pt = { lat: ll.lat, lng: ll.lng };
        checkDup();
      });
      map.invalidateSize();
    }, 280);
    checkDup();

    const send = scr.querySelector('.prop-send');
    send.onclick = async () => {
      const name = scr.querySelector('.prop-name').value.trim().replace(/\s+/g, ' ');
      const descr = scr.querySelector('.prop-descr').value.trim();
      if (name.length < 3) { UI.toast('Назови объект (от 3 букв)'); return; }
      const dup = Poi.nearest(pt.lat, pt.lng, this.DUP);
      if (dup) { UI.toast(`Этот объект уже есть на карте: «${U.esc(dup.name)}»`); return; }
      send.disabled = true; send.textContent = 'Отправляю…';
      try {
        await this.submit({ blob, fix, pt, name, descr, kind });
        UI.closeScreen(scr);
        UI.toast('Заявка отправлена! Модератор проверит её в ближайшее время.', 'good');
        Sfx.play('spin');
        this.screen();
      } catch (e) {
        UI.toast('Не удалось отправить: ' + U.esc(e.message));
        send.disabled = false; send.textContent = 'Отправить на проверку';
      }
    };
  },
  async submit({ blob, fix, pt, name, descr, kind }) {
    const sb = await Cloud.client();
    const uid = (await sb.auth.getSession()).data.session.user.id;
    const id = self.crypto && crypto.randomUUID ? crypto.randomUUID() : U.uid() + U.uid();
    const path = `${uid}/${id}.jpg`;
    const up = await sb.storage.from('poi-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (up.error) throw new Error(up.error.message);
    const { error } = await sb.from('poi_submissions').insert({
      author: S.d.name.slice(0, 20), name: name.slice(0, 60), descr: descr.slice(0, 300) || null, kind,
      lat: pt.lat, lng: pt.lng, photo_lat: fix.lat, photo_lng: fix.lng, accuracy: Math.max(1, Math.round(fix.acc)),
      shot_at: new Date(fix.t).toISOString(), photo: path,
    });
    if (error) throw new Error(error.message);
  },
};
