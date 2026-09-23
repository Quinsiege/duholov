'use strict';
/* Геометки снимков: запись и чтение EXIF (GPS, время съёмки) в JPEG.
   Снимок объекта несёт в себе координаты места съёмки — модератор сверяет их с точкой на карте. */

const Exif = {
  // Тип TIFF: 1 BYTE, 2 ASCII, 4 LONG, 5 RATIONAL
  enc(type, val) {
    if (type === 2) {
      const s = String(val).replace(/[^\x20-\x7e]/g, '?') + '\0';
      return { count: s.length, size: s.length, put: (dv, p) => { for (let i = 0; i < s.length; i++) dv.setUint8(p + i, s.charCodeAt(i)); } };
    }
    if (type === 1) return { count: val.length, size: val.length, put: (dv, p) => val.forEach((b, i) => dv.setUint8(p + i, b)) };
    if (type === 4) return { count: 1, size: 4, put: (dv, p) => dv.setUint32(p, val) };
    return { count: val.length, size: 8 * val.length, put: (dv, p) => val.forEach(([n, d], i) => { dv.setUint32(p + i * 8, n); dv.setUint32(p + i * 8 + 4, d); }) };
  },
  ifdSize(entries) {
    return 2 + entries.length * 12 + 4 + entries.reduce((s, [, t, v]) => { const z = this.enc(t, v).size; return s + (z > 4 ? z + (z & 1) : 0); }, 0);
  },
  writeIfd(dv, off, entries) {
    let data = off + 2 + entries.length * 12 + 4;
    dv.setUint16(off, entries.length);
    entries.forEach(([tag, type, val], i) => {
      const p = off + 2 + i * 12, e = this.enc(type, val);
      dv.setUint16(p, tag); dv.setUint16(p + 2, type); dv.setUint32(p + 4, e.count);
      if (e.size <= 4) e.put(dv, p + 8);
      else { dv.setUint32(p + 8, data); e.put(dv, data); data += e.size + (e.size & 1); }
    });
    dv.setUint32(off + 2 + entries.length * 12, 0);
  },
  stamp(t) {
    const d = new Date(t), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}:${p(d.getMonth() + 1)}:${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  },
  dms(v) {
    v = Math.abs(v);
    const d = Math.floor(v), mf = (v - d) * 60, m = Math.floor(mf), s = Math.round((mf - m) * 60 * 10000);
    return [[d, 1], [m, 1], [s, 10000]];
  },
  // TIFF-блок с IFD0 → EXIF и GPS
  tiff({ lat, lng, acc, time }) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(time)) throw new Error('Нет координат или времени снимка');
    const dt = this.stamp(time);
    const ifd0 = [[0x010F, 2, 'Duholov'], [0x0131, 2, 'Duholov ' + APP_VERSION], [0x0132, 2, dt], [0x8769, 4, 0], [0x8825, 4, 0]];
    const exif = [[0x9003, 2, dt]];
    const gps = [
      [0x0000, 1, [2, 3, 0, 0]],
      [0x0001, 2, lat >= 0 ? 'N' : 'S'], [0x0002, 5, this.dms(lat)],
      [0x0003, 2, lng >= 0 ? 'E' : 'W'], [0x0004, 5, this.dms(lng)],
      [0x001F, 5, [[Math.round((acc || 0) * 100), 100]]],
    ];
    const o0 = 8, o1 = o0 + this.ifdSize(ifd0), o2 = o1 + this.ifdSize(exif), end = o2 + this.ifdSize(gps);
    ifd0[3][2] = o1; ifd0[4][2] = o2;
    const buf = new ArrayBuffer(end), dv = new DataView(buf);
    dv.setUint16(0, 0x4D4D); dv.setUint16(2, 42); dv.setUint32(4, o0);
    this.writeIfd(dv, o0, ifd0); this.writeIfd(dv, o1, exif); this.writeIfd(dv, o2, gps);
    return new Uint8Array(buf);
  },
  // Вставить геометку в JPEG (сегмент APP1 сразу после SOI, JFIF-заголовок убирается)
  embed(jpeg, meta) {
    const src = new Uint8Array(jpeg);
    if (src[0] !== 0xFF || src[1] !== 0xD8) throw new Error('Не JPEG');
    let rest = 2;
    if (src[2] === 0xFF && src[3] === 0xE0) rest = 4 + ((src[4] << 8) | src[5]);
    const t = this.tiff(meta), len = 2 + 6 + t.length;
    const out = new Uint8Array(2 + 2 + len + (src.length - rest));
    out.set([0xFF, 0xD8, 0xFF, 0xE1, len >> 8, len & 0xFF, 0x45, 0x78, 0x69, 0x66, 0, 0], 0);
    out.set(t, 12);
    out.set(src.subarray(rest), 12 + t.length);
    return out;
  },
  // Прочитать геометку: { lat, lng, acc, time } или null
  read(jpeg) {
    const b = new Uint8Array(jpeg), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (dv.getUint16(0) !== 0xFFD8) return null;
    let p = 2;
    while (p + 4 < b.length) {
      if (b[p] !== 0xFF) return null;
      const mk = b[p + 1], len = dv.getUint16(p + 2);
      if (mk === 0xDA) return null; // дальше — само изображение
      if (mk === 0xE1 && dv.getUint32(p + 4) === 0x45786966) return this.parseTiff(new DataView(b.buffer, b.byteOffset + p + 10, len - 8));
      p += 2 + len;
    }
    return null;
  },
  parseTiff(dv) {
    const le = dv.getUint16(0) === 0x4949;
    const u16 = o => dv.getUint16(o, le), u32 = o => dv.getUint32(o, le);
    const tags = off => {
      const n = u16(off), out = {};
      for (let i = 0; i < n; i++) {
        const p = off + 2 + i * 12, tag = u16(p), type = u16(p + 2), cnt = u32(p + 4);
        const size = ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 }[type] || 1) * cnt;
        const at = size <= 4 ? p + 8 : u32(p + 8);
        if (type === 2) { let s = ''; for (let k = 0; k < cnt - 1; k++) s += String.fromCharCode(dv.getUint8(at + k)); out[tag] = s; }
        else if (type === 5) { const v = []; for (let k = 0; k < cnt; k++) v.push(u32(at + k * 8) / (u32(at + k * 8 + 4) || 1)); out[tag] = v; }
        else if (type === 4) out[tag] = u32(at);
        else if (type === 3) out[tag] = u16(at);
        else { const v = []; for (let k = 0; k < cnt; k++) v.push(dv.getUint8(at + k)); out[tag] = v; }
      }
      return out;
    };
    const ifd0 = tags(u32(4));
    if (!ifd0[0x8825]) return null;
    const g = tags(ifd0[0x8825]);
    if (!g[2] || !g[4]) return null;
    const deg = v => v[0] + v[1] / 60 + v[2] / 3600;
    const exif = ifd0[0x8769] ? tags(ifd0[0x8769]) : {};
    const ts = exif[0x9003] || ifd0[0x0132];
    let time = null;
    if (ts) { const m = ts.match(/(\d+):(\d+):(\d+) (\d+):(\d+):(\d+)/); if (m) time = new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime(); }
    return {
      lat: deg(g[2]) * (g[1] === 'S' ? -1 : 1),
      lng: deg(g[4]) * (g[3] === 'W' ? -1 : 1),
      acc: g[0x1F] ? g[0x1F][0] : null,
      time,
    };
  },
};
