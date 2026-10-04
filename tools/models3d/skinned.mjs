// Персонаж со скелетом (glTF из генератора, скелет Mixamo) → модель игры www/models/<имя>.m3d (формат — M3D.parse, head.skin).
//   node tools/models3d/skinned.mjs <файл.glb> [имя=catcher] [размер текстуры=1024]
// Сетка — как есть (треугольники и вершины не меняются). Кости пальцев убираются: их веса переходят кисти (пальцы — как одно
// целое с ладонью). На вершину — до 4 костей (самые сильные; веса — заново к сумме 1). Анимации запекаются матрицами костей
// (3×4, 30 кадров в секунду) уже в осях игры: Z вверх, лицом к −Y, метры. Клипы игры: idle (стоит — собирается здесь: ноги из
// исходной позы, корпус и руки — из кадра ходьбы, где ноги рядом, и дыхание), walk, run. Текстура цвета — WebP (ffmpeg).
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Ключи: --clips=idle:hover,walk:fly,run:dash — клип игры ← анимация файла (без idle — «стоит» собирается, как у Ловчего);
// --drop=<regexp> — кости пальцев (по имени); --handr=0.03 — вершина ближе к костям пальцев — рука; --float — не ставить на землю (дух парит: высота — из анимации)
const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const [src, NAME = 'catcher', TEX = '1024'] = args.filter(a => !a.startsWith('--'));
if (!src) { console.error('node skinned.mjs <файл.glb> [имя] [размер текстуры] [--clips=…] [--drop=…] [--float]'); process.exit(1); }
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'www', 'models', NAME + '.m3d');
const FPS = 30;
const CLIPS = opt.clips ? Object.fromEntries(opt.clips.split(',').map(p => p.split(':'))) : { walk: 'Walking', run: 'Running' }; // клип игры ← анимация файла
const DROP = new RegExp(opt.drop || 'Hand(Thumb|Index|Middle|Ring|Pinky)\\d'); // кости пальцев
const MAXV = 65535; // вершин в части (индексы u16): больше — сетка делится на части, треугольники те же

/* ---------- glTF ---------- */
const glb = readFileSync(src);
const jl = glb.readUInt32LE(12), J = JSON.parse(glb.subarray(20, 20 + jl).toString('utf8')), BIN = glb.subarray(20 + jl + 8);
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const CT = { 5126: Float32Array, 5123: Uint16Array, 5121: Uint8Array, 5125: Uint32Array };
function acc(i) {
  const a = J.accessors[i], bv = J.bufferViews[a.bufferView], n = NC[a.type], C = CT[a.componentType];
  const st = bv.byteStride, off = (bv.byteOffset || 0) + (a.byteOffset || 0);
  if (st && st !== n * C.BYTES_PER_ELEMENT) throw new Error('чередующиеся буферы не поддержаны');
  return C.from(new C(BIN.buffer.slice(BIN.byteOffset + off, BIN.byteOffset + off + a.count * n * C.BYTES_PER_ELEMENT)));
}
const prim = J.meshes[0].primitives;
if (prim.length !== 1) throw new Error('ожидалась одна часть сетки');
const P = prim[0], at = P.attributes;
const POS = acc(at.POSITION), NRM = acc(at.NORMAL), UV = acc(at.TEXCOORD_0), IDX = acc(P.indices);
const NV = POS.length / 3;
const skin = J.skins[0], JOINTS = skin.joints, IBM = acc(skin.inverseBindMatrices);

/* ---------- матрицы 4×4 по столбцам ---------- */
const mul = (a, b) => { const r = new Float64Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let x = 0; for (let k = 0; k < 4; k++) x += a[k * 4 + j] * b[i * 4 + k]; r[i * 4 + j] = x; } return r; };
const I4 = () => { const m = new Float64Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };
function trs(t, q, s) {
  const [x, y, z, w] = q, [sx, sy, sz] = s;
  return Float64Array.from([
    (1 - 2 * (y * y + z * z)) * sx, (2 * (x * y + z * w)) * sx, (2 * (x * z - y * w)) * sx, 0,
    (2 * (x * y - z * w)) * sy, (1 - 2 * (x * x + z * z)) * sy, (2 * (y * z + x * w)) * sy, 0,
    (2 * (x * z + y * w)) * sz, (2 * (y * z - x * w)) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    t[0], t[1], t[2], 1]);
}
const nlerp = (a, b, k) => { const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = d < 0 ? -1 : 1; const r = a.map((x, i) => x * (1 - k) + b[i] * s * k); const l = Math.hypot(...r); return r.map(x => x / l); };
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qax = (ax, ang) => { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; };
// оси glTF (Y вверх, лицом к +Z) → оси игры (Z вверх, лицом к −Y): (x, y, z) → (x, −z, y)
const C = Float64Array.from([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]);

/* ---------- скелет: родители, исходная поза ---------- */
const parent = new Map();
J.nodes.forEach((n, i) => (n.children || []).forEach(c => parent.set(c, i)));
const rest = J.nodes.map(n => ({ t: n.translation || [0, 0, 0], r: n.rotation || [0, 0, 0, 1], s: n.scale || [1, 1, 1] }));
const keep = JOINTS.map((ni, k) => !DROP.test(J.nodes[ni].name || '') ? k : -1).filter(k => k >= 0); // индексы в skin.joints
const remap = JOINTS.map((ni, k) => { // кость → оставшаяся (сама или ближайший предок из оставшихся)
  let n = ni;
  while (DROP.test(J.nodes[n].name || '')) n = parent.get(n);
  const kk = keep.indexOf(JOINTS.indexOf(n));
  if (kk < 0) throw new Error('нет кости для ' + J.nodes[ni].name);
  return kk;
});
const NB = keep.length;
console.log(`кости: ${JOINTS.length} → ${NB} (без пальцев)`);

/* ---------- веса: до 4 на вершину ---------- */
// Вес убранных костей (пальцев) у вершины. Автоскелет генератора вешает кости пальцев и на соседнее (полы плаща у бёдер,
// волосы, корпус), а самим пальцам — бёдра: в исходной позе кисти висят у бёдер. Если больше половины веса вершины — пальцы,
// кисть и предплечье, это рука: вершина — только руке (веса пальцев — кисти, случайные веса бедра и корпуса — прочь); иначе —
// плащ, волосы, корпус: вес пальцев — её собственным костям, пропорционально. Иначе кусок плаща тянется за рукой, а палец —
// остаётся у бедра и растягивается.
const dropped = k => remap[k] !== keep.indexOf(k);
const parentKept = b => { // оставшаяся кость-родитель оставшейся кости b (у кисти — предплечье)
  let n = parent.get(JOINTS[keep[b]]);
  while (n != null && !JOINTS.includes(n)) n = parent.get(n);
  return n == null ? -1 : remap[JOINTS.indexOf(n)];
};
// и где кисть с пальцами в исходной позе: вершина ближе HAND_R к их костям (отрезки кисть → суставы пальцев) — рука, сколько бы
// веса ни висело на бедре (кисти в исходной позе — у бёдер)
const bindPos = k => { // начало кости k (индекс в skin.joints) в исходной позе: IBM·p = 0 → решить M p = −t (метод Гаусса)
  const m = IBM.subarray(k * 16, k * 16 + 16), A = [0, 1, 2].map(r => [m[r], m[4 + r], m[8 + r], -m[12 + r]]);
  for (let i = 0; i < 3; i++) {
    let q = i;
    for (let r = i + 1; r < 3; r++) if (Math.abs(A[r][i]) > Math.abs(A[q][i])) q = r;
    [A[i], A[q]] = [A[q], A[i]];
    for (let r = 0; r < 3; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c < 4; c++) A[r][c] -= f * A[i][c]; }
  }
  return [0, 1, 2].map(i => A[i][3] / A[i][i]);
};
const HAND_R = +(opt.handr || 0.03), HSEG = new Map(); // кисть → отрезки её пальцев
JOINTS.forEach((ni, k) => {
  if (!dropped(k)) return;
  let pn = parent.get(ni);
  while (pn != null && !JOINTS.includes(pn)) pn = parent.get(pn);
  if (pn == null) return;
  const t = remap[k];
  if (!HSEG.has(t)) HSEG.set(t, []);
  HSEG.get(t).push([bindPos(JOINTS.indexOf(pn)), bindPos(k)]);
});
const segD = (q, [a, b]) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  const t = l ? Math.max(0, Math.min(1, ((q[0] - a[0]) * d[0] + (q[1] - a[1]) * d[1] + (q[2] - a[2]) * d[2]) / l)) : 0;
  return Math.hypot(q[0] - a[0] - d[0] * t, q[1] - a[1] - d[1] * t, q[2] - a[2] - d[2] * t);
};
const onHand = (v, t) => { const q = [POS[v * 3], POS[v * 3 + 1], POS[v * 3 + 2]]; return (HSEG.get(t) || []).some(sg => segD(q, sg) < HAND_R); };
const sets = Object.keys(at).filter(k => k.startsWith('JOINTS_')).map(k => [acc(at[k]), acc(at['WEIGHTS_' + k.slice(7)])]);
const JW = new Uint8Array(NV * 8);
let nHand = 0, nOther = 0;
for (let v = 0; v < NV; v++) {
  let m = new Map();
  const loose = new Map(); // кисть → вес её пальцев у вершины
  for (const [jj, ww] of sets) for (let c = 0; c < 4; c++) {
    const w = ww[v * 4 + c], k = jj[v * 4 + c];
    if (!(w > 0)) continue;
    if (dropped(k)) loose.set(remap[k], (loose.get(remap[k]) || 0) + w); else m.set(remap[k], (m.get(remap[k]) || 0) + w);
  }
  if (loose.size) {
    const [t, lw] = [...loose].sort((x, y) => y[1] - x[1])[0], fa = parentKept(t);
    const total = lw + [...m.values()].reduce((s0, x) => s0 + x, 0) + [...loose].filter(([k]) => k !== t).reduce((s0, x) => s0 + x[1], 0);
    const arm = lw + (m.get(t) || 0) + (fa >= 0 ? m.get(fa) || 0 : 0);
    if (arm >= 0.5 * total || m.size === 0 || onHand(v, t)) {
      const n2 = new Map([[t, lw + (m.get(t) || 0)]]);
      if (fa >= 0 && m.get(fa)) n2.set(fa, m.get(fa));
      m = n2; nHand++;
    } else {
      const tot = [...m.values()].reduce((s0, x) => s0 + x, 0);
      for (const [b0, ow] of m) m.set(b0, ow + lw * ow / tot);
      nOther++;
    }
  }
  const top = [...m].sort((a0, b0) => b0[1] - a0[1]).slice(0, 4), sum = top.reduce((s0, x) => s0 + x[1], 0) || 1;
  let q = top.map(x => Math.round(x[1] / sum * 255)), d = 255 - q.reduce((s0, x) => s0 + x, 0);
  if (q.length) q[0] += d;
  for (let c = 0; c < 4; c++) { JW[v * 8 + c] = top[c] ? top[c][0] : 0; JW[v * 8 + 4 + c] = top[c] ? q[c] : 0; }
}
console.log(`вершины с весами пальцев: рука — ${nHand}, плащ, волосы, корпус — ${nOther}`);

/* ---------- анимации: локальные TRS узлов к моменту t ---------- */
function clipOf(name) {
  const a = J.animations.find(x => x.name === name);
  if (!a) throw new Error('нет анимации ' + name);
  const ch = a.channels.map(c => { const s = a.samplers[c.sampler]; return { n: c.target.node, p: c.target.path, t: acc(s.input), v: acc(s.output) }; });
  const dur = Math.max(...ch.map(c => c.t[c.t.length - 1]));
  return { ch, dur };
}
function poseAt(clip, t) {
  const L = rest.map(r => ({ t: [...r.t], r: [...r.r], s: [...r.s] }));
  for (const c of clip.ch) {
    const T = c.t, n = c.p === 'rotation' ? 4 : 3;
    let i = 0;
    while (i < T.length - 2 && T[i + 1] <= t) i++;
    const k = T.length < 2 ? 0 : Math.min(1, Math.max(0, (t - T[i]) / (T[i + 1] - T[i] || 1)));
    const a = Array.from(c.v.slice(i * n, i * n + n)), b = T.length < 2 ? a : Array.from(c.v.slice((i + 1) * n, (i + 1) * n + n));
    const val = n === 4 ? nlerp(a, b, k) : a.map((x, j) => x + (b[j] - x) * k);
    L[c.n][c.p === 'translation' ? 't' : c.p === 'rotation' ? 'r' : 's'] = val;
  }
  return L;
}
// матрицы костей (3×4 по строкам, в осях игры) для набора локальных поз узлов
function bones(L) {
  const G = new Array(J.nodes.length);
  const g = i => G[i] || (G[i] = parent.has(i) ? mul(g(parent.get(i)), trs(L[i].t, L[i].r, L[i].s)) : trs(L[i].t, L[i].r, L[i].s));
  const out = new Float32Array(NB * 12);
  keep.forEach((k, b) => {
    const M = mul(C, mul(g(JOINTS[k]), IBM.subarray(k * 16, k * 16 + 16)));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) out[b * 12 + r * 4 + c] = M[c * 4 + r];
  });
  return out;
}
const node = nm => J.nodes.findIndex(n => n.name === nm);
const clips = {};
for (const [k, nm] of Object.entries(CLIPS)) {
  const c = clipOf(nm), n = Math.max(2, Math.round(c.dur * FPS));
  const frames = [];
  for (let f = 0; f < n; f++) frames.push(bones(poseAt(c, c.dur * f / n)));
  clips[k] = { n, fps: n / c.dur, frames, src: c };
}
// стоит: ноги и бёдра — из исходной позы (прямо, чуть врозь), корпус, руки и голова — из кадра ходьбы, где ступни ближе всего
// друг к другу (руки опущены вдоль тела); дыхание — грудь чуть поднимается, руки чуть покачиваются (2,6 с). Если idle есть в файле — он
if (!clips.idle) {
  const w = clips.walk.src, lf = node('mixamorig:LeftFoot'), rf = node('mixamorig:RightFoot');
  let best = 0, bd = Infinity;
  for (let f = 0; f < 40; f++) {
    const L = poseAt(w, w.dur * f / 40), G = [];
    const g = i => G[i] || (G[i] = parent.has(i) ? mul(g(parent.get(i)), trs(L[i].t, L[i].r, L[i].s)) : trs(L[i].t, L[i].r, L[i].s));
    const d = Math.abs(g(lf)[14] - g(rf)[14]);
    if (d < bd) { bd = d; best = w.dur * f / 40; }
  }
  const W0 = poseAt(w, best), up = new Set(['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'].map(s => node('mixamorig:' + s)));
  const n = Math.round(2.6 * FPS), frames = [];
  for (let f = 0; f < n; f++) {
    const ph = 2 * Math.PI * f / n, L = rest.map((r, i) => up.has(i) ? { t: [...W0[i].t], r: [...W0[i].r], s: [...W0[i].s] } : { t: [...r.t], r: [...r.r], s: [...r.s] });
    for (const [nm, a] of [['Spine1', 0.018], ['Spine2', 0.022]]) { const i = node('mixamorig:' + nm); L[i].r = qmul(L[i].r, qax([1, 0, 0], -a * Math.sin(ph))); }
    for (const [nm, s] of [['LeftArm', 1], ['RightArm', -1]]) { const i = node('mixamorig:' + nm); L[i].r = qmul(L[i].r, qax([0, 0, 1], s * 0.025 * Math.sin(ph + 0.6))); }
    frames.push(bones(L));
  }
  clips.idle = { n, fps: FPS, frames };
  console.log(`стоит: поза ходьбы в ${best.toFixed(2)} с (ступни ближе всего), ${n} кадров`);
}

/* ---------- рамка модели: по всем кадрам всех клипов ---------- */
function skinAt(B, v, out) {
  let x = 0, y = 0, z = 0;
  const px = POS[v * 3], py = POS[v * 3 + 1], pz = POS[v * 3 + 2];
  for (let c = 0; c < 4; c++) {
    const w = JW[v * 8 + 4 + c] / 255; if (!w) continue;
    const o = JW[v * 8 + c] * 12;
    x += w * (B[o] * px + B[o + 1] * py + B[o + 2] * pz + B[o + 3]);
    y += w * (B[o + 4] * px + B[o + 5] * py + B[o + 6] * pz + B[o + 7]);
    z += w * (B[o + 8] * px + B[o + 9] * py + B[o + 10] * pz + B[o + 11]);
  }
  out[0] = x; out[1] = y; out[2] = z;
}
let R = 0, H = 0, Z0 = Infinity;
const tmp = [0, 0, 0];
for (const c of Object.values(clips)) for (const B of c.frames) for (let v = 0; v < NV; v += 3) { skinAt(B, v, tmp); R = Math.max(R, Math.hypot(tmp[0], tmp[1])); H = Math.max(H, tmp[2]); }
for (let v = 0; v < NV; v++) { skinAt(clips.idle.frames[0], v, tmp); Z0 = Math.min(Z0, tmp[2]); }
// стоящий — ступнями на земле (z = 0): все кадры на столько же вниз; --float — высота из анимации (дух парит)
if (opt.float) Z0 = 0;
for (const c of Object.values(clips)) for (const B of c.frames) for (let b = 0; b < NB; b++) B[b * 12 + 11] -= Z0;
H -= Z0;
console.log(`рамка: радиус ${R.toFixed(3)} м, высота ${H.toFixed(3)} м (стоящий опущен на ${Z0.toFixed(3)} м)`);

/* ---------- текстура цвета → WebP ---------- */
const mt = J.materials[P.material || 0], ti = mt.pbrMetallicRoughness.baseColorTexture.index, im = J.images[J.textures[ti].source];
const bvI = J.bufferViews[im.bufferView], dir = mkdtempSync(join(tmpdir(), 'm3d-'));
const inF = join(dir, 'base' + (im.mimeType === 'image/png' ? '.png' : '.jpg')), outF = join(dir, 'base.webp');
writeFileSync(inF, BIN.subarray(bvI.byteOffset || 0, (bvI.byteOffset || 0) + bvI.byteLength));
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', inF, '-vf', `scale=${TEX}:${TEX}:flags=area`, '-c:v', 'libwebp', '-quality', '88', outF]);
const TEXB = readFileSync(outF);
rmSync(dir, { recursive: true, force: true });

/* ---------- запись ---------- */
const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
for (let v = 0; v < NV; v++) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], POS[v * 3 + i]); hi[i] = Math.max(hi[i], POS[v * 3 + i]); }
const qs = lo.map((l, i) => Math.max(hi[i] - l, 1e-6) / 65535);
// части по ≤ MAXV вершин (индексы u16 — от первой вершины своей части): треугольники идут по порядку, вершина на стыке частей —
// своя копия в каждой части; число треугольников не меняется
const order = [], prims = [], idxA = [];
{
  let map = new Map(), v0 = 0, i0 = 0;
  const close = () => { if (idxA.length > i0) prims.push({ g: 0, m: 0, v: [v0, order.length - v0], i: [i0, idxA.length - i0], ol: 0.016 }); map = new Map(); v0 = order.length; i0 = idxA.length; };
  for (let t = 0; t < IDX.length; t += 3) {
    const tri = [IDX[t], IDX[t + 1], IDX[t + 2]];
    if (map.size + tri.filter(v => !map.has(v)).length > MAXV) close();
    for (const v of tri) { let k = map.get(v); if (k == null) { k = order.length - v0; map.set(v, k); order.push(v); } idxA.push(k); }
  }
  close();
}
const N2 = order.length;
const pos = new Int16Array(N2 * 4), nrm = new Int8Array(N2 * 4), uv = new Uint16Array(N2 * 2), jw = new Uint8Array(N2 * 8);
order.forEach((v, j) => {
  for (let i = 0; i < 3; i++) pos[j * 4 + i] = Math.round((POS[v * 3 + i] - lo[i]) / qs[i]) - 32768;
  const l = Math.hypot(NRM[v * 3], NRM[v * 3 + 1], NRM[v * 3 + 2]) || 1;
  for (let i = 0; i < 3; i++) nrm[j * 4 + i] = Math.max(-127, Math.min(127, Math.round(NRM[v * 3 + i] / l * 127)));
  for (let i = 0; i < 2; i++) uv[j * 2 + i] = Math.round(Math.max(0, Math.min(1, UV[v * 2 + i] - Math.floor(UV[v * 2 + i] === 1 ? 0 : UV[v * 2 + i]))) * 65535);
  jw.set(JW.subarray(v * 8, v * 8 + 8), j * 8);
});
const idx = Uint16Array.from(idxA);
const pad4 = n => n + (-n % 4 + 4) % 4;
const parts = [], offs = {};
let o = 0;
const put = (k, bytes) => { offs[k] = o; parts.push(bytes); o += bytes.length; const p = pad4(o) - o; if (p) { parts.push(new Uint8Array(p)); o += p; } };
put('pos', new Uint8Array(pos.buffer)); put('nrm', new Uint8Array(nrm.buffer)); put('uv', new Uint8Array(uv.buffer)); put('jw', jw);
put('idx', new Uint8Array(idx.buffer));
const cl = {};
for (const k of ['idle', 'walk', 'run']) { const c = clips[k], f = new Float32Array(c.n * NB * 12); c.frames.forEach((B, i) => f.set(B, i * NB * 12)); cl[k] = { n: c.n, fps: +c.fps.toFixed(4), off: o }; put('a_' + k, new Uint8Array(f.buffer)); }
put('tex', TEXB);
const head = {
  v: 2, name: NAME, q: [...lo, ...qs].map(x => +x.toFixed(7)), r: +R.toFixed(3), h: +H.toFixed(3),
  mats: [{ n: 'skin_tex', c: [1, 1, 1], e: [0, 0, 0], a: 1, ro: 0.75, mt: 0, ds: mt.doubleSided ? 1 : 0, tex: 1 }],
  groups: [{ t: 'static' }],
  prims,
  skin: { nb: NB, names: keep.map(k => J.nodes[JOINTS[k]].name || ''), clips: cl, tex: { off: offs.tex, len: TEXB.length, type: 'image/webp' }, uv: offs.uv, jw: offs.jw },
  buf: { pos: offs.pos, nrm: offs.nrm, col: offs.uv, idx: offs.idx, len: offs.idx + idx.length * 2 },
};
let js = Buffer.from(JSON.stringify(head));
js = Buffer.concat([js, Buffer.alloc(pad4(js.length) - js.length, 0x20)]);
const hdr = Buffer.alloc(8); hdr.write('M3D1', 0, 'ascii'); hdr.writeUInt32LE(js.length, 4);
writeFileSync(OUT, Buffer.concat([hdr, js, ...parts.map(p => Buffer.from(p.buffer, p.byteOffset, p.byteLength))]));
console.log(`${OUT}: ${(8 + js.length + o) / 1024 | 0} КБ — ${N2} вершин (в исходнике ${NV}), ${idx.length / 3} треугольников (${prims.length} ч.), ${NB} костей, клипы ${Object.entries(cl).map(([k, c]) => `${k} ${c.n}`).join(', ')}, текстура ${TEXB.length / 1024 | 0} КБ`);
