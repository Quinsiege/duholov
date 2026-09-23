'use strict';
/* Обмен духами через сервер: отданный дух уходит в «посылку» на сервере, а другу передаётся короткий код
   (DUH2.XXXXXXXXXX) — текстом или QR-кодом. Посылку может открыть только один человек и только однажды. */

const Trade = {
  QR_LIB: 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
  QR_SRI: 'sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1',

  async give(sp) { const r = await Game.try('tradeGive', { uid: sp.uid }); return r && r.code; },
  async receive(code) {
    const r = await Game.act('tradeReceive', { code });
    return { sp: S.findSpirit(r.uid), isNew: r.isNew };
  },
  loadQR() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    if (this._qrP) return this._qrP;
    this._qrP = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = this.QR_LIB; s.integrity = this.QR_SRI; s.crossOrigin = 'anonymous'; s.onload = () => res(window.qrcode); s.onerror = () => { this._qrP = null; rej(); };
      document.head.appendChild(s);
    });
    return this._qrP;
  },
  async qrSvg(text) {
    const qrcode = await this.loadQR();
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 3, scalable: true });
  },
  canScan() { return 'BarcodeDetector' in window && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); },

  /* ---------------- ЭКРАНЫ ---------------- */
  // Показ посылки: QR + текст кода + «Поделиться»
  showCode(item) {
    const s = SP[item.sid];
    const m = UI.modal({
      title: 'Посылка для друга', cls: 'trade-modal',
      html: `<div class="trade-sp">${Art.of(item)}</div>
        <p class="small">Покажи QR-код другу или отправь код в мессенджер. ${s.name} появится у того, кто первым его примет.</p>
        <div class="qr-box"><span class="small">Рисую QR-код…</span></div>
        <textarea class="input code-text" readonly rows="3">${U.esc(item.code)}</textarea>`,
      buttons: [
        { label: 'Копировать', keep: true, fn: w => this.copy(w.querySelector('.code-text')) },
        { label: 'Поделиться', cls: 'primary', keep: true, fn: () => this.share(item) },
      ],
    });
    this.qrSvg(item.code).then(svg => { m.querySelector('.qr-box').innerHTML = svg; })
      .catch(() => { m.querySelector('.qr-box').innerHTML = '<span class="small">QR-код недоступен без интернета — отправь текстовый код.</span>'; });
  },
  async copy(ta) {
    try { await navigator.clipboard.writeText(ta.value); UI.toast('Код скопирован', 'good'); }
    catch (e) { ta.select(); document.execCommand && document.execCommand('copy'); UI.toast('Код выделен — скопируй его'); }
  },
  async share(item) {
    const text = `Лови духа «${SP[item.sid].name}» в Духолове! Открой «Меню → Обмен» и вставь код:\n${item.code}`;
    if (navigator.share) { try { await navigator.share({ title: 'Духолов: подарок', text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(text); UI.toast('Текст с кодом скопирован — вставь его в мессенджер', 'good'); }
    catch (e) { UI.toast('Скопируй код вручную'); }
  },

  // Отдать духа из карточки
  offer(sp, after) {
    if (S.d.spirits.length <= 1) { UI.toast('Нельзя отдать последнего духа'); return; }
    const name = sp.nick || SP[sp.sid].name;
    UI.confirm('Передать другу?', `«${U.esc(name)}» (СИЛА ${S.power(sp)}) покинет твою коллекцию и превратится в код-посылку. Её сможет принять только один человек.`, 'Упаковать', async () => {
      if (!await this.give(sp)) return;
      Sfx.play('spin');
      after && after();
      this.showCode(S.d.sent[0]);
      MapView.updateBuddy();
    });
  },

  // Экран «Обмен»: принять духа и список отправленных
  screen() {
    const scr = UI.screen('Обмен', `
      <div class="panel trade-in">
        <b>Получить духа</b>
        <p class="small">Попроси друга упаковать духа (карточка духа → «Передать другу») и прими его код.</p>
        ${this.canScan() ? '<button class="btn primary wide scan-btn">Сканировать QR-код</button>' : ''}
        <textarea class="input code-in" rows="3" placeholder="Вставь код DUH2…"></textarea>
        <button class="btn wide accept-btn">Принять духа</button>
      </div>
      <div class="list sent-list"></div>`, 'trade-screen');
    const renderSent = () => {
      scr.querySelector('.sent-list').innerHTML = S.d.sent.length
        ? `<div class="row"><div class="row-main"><b>Отправленные посылки</b><small>Можно показать код ещё раз</small></div></div>` +
          S.d.sent.map((x, i) => `<button class="row sent-item" data-i="${i}"><div class="row-ico">${Art.of(x)}</div><div class="row-main"><b>${SP[x.sid].name}</b><small>${new Date(x.t).toLocaleString('ru-RU')}</small></div></button>`).join('')
        : '<div class="row"><div class="row-main"><small>Ты ещё никому не отправлял духов.</small></div></div>';
    };
    renderSent();
    const accept = code => {
      Friends.accept(code, () => { scr.querySelector('.code-in').value = ''; });
    };
    scr.querySelector('.accept-btn').onclick = () => accept(scr.querySelector('.code-in').value);
    const sb = scr.querySelector('.scan-btn');
    if (sb) sb.onclick = () => this.scan(accept);
    scr.querySelector('.sent-list').addEventListener('click', e => {
      const it = e.target.closest('.sent-item'); if (it) this.showCode(S.d.sent[+it.dataset.i]);
    });
  },
  welcome({ sp, isNew }) {
    Sfx.play('hatch'); U.vibrate([40, 60, 100]);
    UI.modal({
      cls: 'hatch-modal', title: 'Посылка открыта!',
      html: `<div class="hatch-stage open"><div class="hatch-sp">${Art.of(sp)}</div></div>
        <div class="evo-text"><b>${sp.shiny ? '✦ ' : ''}${SP[sp.sid].name}</b> от Ловчего ${U.esc(sp.from || 'без имени')}<div class="small">СИЛА ${S.power(sp)} · +5 эссенции</div>${isNew ? '<div class="badge-new">Новая запись в Бестиарии!</div>' : ''}</div>`,
      buttons: [{ label: 'Спасибо!', cls: 'primary' }],
    });
    UI.refreshHud();
  },

  // Сканер QR на камере (BarcodeDetector есть в Chrome для Android)
  async scan(onCode) {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }
    catch (e) { UI.toast('Нет доступа к камере'); return; }
    const det = new BarcodeDetector({ formats: ['qr_code'] });
    let alive = true;
    const m = UI.modal({
      title: 'Наведи камеру на QR-код', cls: 'scan-modal',
      html: '<div class="scan-box"><video playsinline muted autoplay></video><i></i></div>',
      buttons: [{ label: 'Отмена' }],
    });
    const stop = () => { alive = false; stream.getTracks().forEach(t => t.stop()); };
    const v = m.querySelector('video');
    v.srcObject = stream; v.play().catch(() => {});
    const obs = new MutationObserver(() => { if (!m.isConnected) { stop(); obs.disconnect(); } });
    obs.observe(document.body, { childList: true });
    while (alive && m.isConnected) {
      await U.wait(300);
      try {
        const codes = await det.detect(v);
        const hit = codes.find(c => c.rawValue && /DUH[12FG]/.test(c.rawValue));
        if (hit) { stop(); m.close(); onCode(hit.rawValue); return; }
      } catch (e) { /* кадр ещё не готов */ }
    }
  },
};
