'use strict';
/* Изменения состояния: сервер после каждого действия присылает не весь прогресс, а разницу.
   Операция: { p: путь, v: значение } — записать; { p, del: 1 } — удалить;
   { p, push: [...] } — дописать в конец массива; { p, unshift: [...], len } — добавить в начало и обрезать. */

const Diff = {
  same(a, b) { return a === b || JSON.stringify(a) === JSON.stringify(b); },
  isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); },

  make(a, b, p = [], out = []) {
    if (this.isObj(a) && this.isObj(b)) {
      for (const k of Object.keys(a)) if (!(k in b)) out.push({ p: [...p, k], del: 1 });
      for (const k of Object.keys(b)) if (!(k in a) || !this.same(a[k], b[k])) this.make(a[k], b[k], [...p, k], out);
      return out;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length === b.length) {
        for (let i = 0; i < b.length; i++) if (!this.same(a[i], b[i])) this.make(a[i], b[i], [...p, i], out);
        return out;
      }
      if (b.length > a.length && this.same(a, b.slice(0, a.length))) { out.push({ p, push: b.slice(a.length) }); return out; }
      // новые записи в начале (дневник, отправленные посылки), хвост обрезан
      for (let u = 1; u <= Math.min(5, b.length); u++) {
        if (this.same(b.slice(u), a.slice(0, b.length - u))) { out.push({ p, unshift: b.slice(0, u), len: b.length }); return out; }
      }
    }
    if (!this.same(a, b)) out.push({ p, v: b });
    return out;
  },

  apply(obj, ops) {
    for (const op of ops) {
      if (!op.p.length) { obj = op.v; continue; }
      let t = obj;
      for (let i = 0; i < op.p.length - 1; i++) {
        const k = op.p[i];
        if (t[k] == null) t[k] = typeof op.p[i + 1] === 'number' ? [] : {};
        t = t[k];
      }
      const k = op.p[op.p.length - 1];
      if (op.del) { if (Array.isArray(t)) t.splice(k, 1); else delete t[k]; }
      else if (op.push) t[k].push(...op.push);
      else if (op.unshift) { t[k].unshift(...op.unshift); t[k].length = op.len; }
      else t[k] = op.v;
    }
    return obj;
  },
};
