'use strict';
/* QR-код и сканер для кода дружбы. Передача духов по коду (посылки DUH2) закрыта в 3.18 — духов продают на аукционе. */

const Trade = {
  QR_LIB: 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
  QR_SRI: 'sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1',

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

  async copy(ta) {
    try { await navigator.clipboard.writeText(ta.value); UI.toast('Код скопирован', 'good'); }
    catch (e) { ta.select(); document.execCommand && document.execCommand('copy'); UI.toast('Код выделен — скопируй его'); }
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
