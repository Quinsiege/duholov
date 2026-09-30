#!/usr/bin/env node
// ИИ-игроки «Духолова»: зритель в реальном времени. Маленький HTTP-сервер без фреймворков, слушает только 127.0.0.1
// (владелец смотрит через SSH-туннель: ssh -L 8090:127.0.0.1:8090 root@<ip> → http://localhost:8090/).
// Читает папки ботов (bots/<id>/: persona.json, state.json, log.jsonl, diary.jsonl, wishes.jsonl, live.jpg, shots/)
// и шлёт странице изменения через SSE: новые кадры экрана (~2–4 в секунду), шаги, заметки, желания.
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(process.env.BOTS_DIR || path.join(HERE, 'bots'));
const PORT = +process.env.BOT_VIEW_PORT || 8090;
const HOST = process.env.BOT_VIEW_HOST || '127.0.0.1';
const ID = /^[a-zA-Z0-9_-]{1,32}$/;

const readJSON = async (f, d = null) => { try { return JSON.parse(await fsp.readFile(f, 'utf8')); } catch (e) { return d; } };
const mtime = f => { try { return fs.statSync(f).mtimeMs; } catch (e) { return 0; } };
const size = f => { try { return fs.statSync(f).size; } catch (e) { return 0; } };

// последние строки JSONL (читается только хвост файла)
async function tail(f, n, maxBytes = 1_500_000) {
  let fh;
  try {
    fh = await fsp.open(f, 'r');
    const st = await fh.stat(), len = Math.min(st.size, maxBytes), buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, st.size - len);
    const lines = buf.toString('utf8').split('\n');
    if (st.size > len) lines.shift(); // первая строка могла обрезаться
    return lines.filter(Boolean).slice(-n).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
  } catch (e) { return []; } finally { if (fh) await fh.close(); }
}
async function readFrom(f, pos) {
  const sz = size(f);
  if (sz <= pos) return { lines: [], pos: sz < pos ? 0 : pos };
  const fh = await fsp.open(f, 'r');
  try {
    const buf = Buffer.alloc(sz - pos); await fh.read(buf, 0, buf.length, pos);
    const s = buf.toString('utf8'), cut = s.lastIndexOf('\n');
    if (cut < 0) return { lines: [], pos };
    const lines = s.slice(0, cut).split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
    return { lines, pos: pos + Buffer.byteLength(s.slice(0, cut + 1)) };
  } finally { await fh.close(); }
}
// шаг для ленты: без полного наблюдения (оно большое)
const slim = x => (x.kind === 'step'
  ? { kind: 'step', t: x.t, step: x.step, thought: x.thought, goal: x.goal, act: x.act, type: x.action && x.action.type, ok: x.ok, result: x.result, screen: x.screen, title: x.title, city: x.city, level: x.level, shot: x.shot, llmMs: x.llm && x.llm.ms }
  : x.kind === 'memory' ? { kind: 'memory', t: x.t, step: x.step, memory: x.memory, likes: x.likes, dislikes: x.dislikes, mood: x.mood }
  : { kind: x.kind, t: x.t, step: x.step, reason: x.reason, review: x.review, error: x.error });

async function listBots() {
  let ids = [];
  try { ids = (await fsp.readdir(DIR, { withFileTypes: true })).filter(d => d.isDirectory() && ID.test(d.name)).map(d => d.name); } catch (e) { /* пусто */ }
  const out = [];
  for (const id of ids) {
    const persona = await readJSON(path.join(DIR, id, 'persona.json'));
    if (!persona) continue;
    const state = await readJSON(path.join(DIR, id, 'state.json'), {});
    out.push({ id, persona: { name: persona.name, nick: persona.nick, age: persona.age, mix: persona.mix }, state });
  }
  return out.sort((a, b) => (b.state.updated || 0) - (a.state.updated || 0));
}

function sse(req, res, id) {
  const bd = path.join(DIR, id);
  const F = { state: path.join(bd, 'state.json'), live: path.join(bd, 'live.jpg'), log: path.join(bd, 'log.jsonl'), diary: path.join(bd, 'diary.jsonl'), wishes: path.join(bd, 'wishes.jsonl'), memory: path.join(bd, 'memory.json') };
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  const send = (ev, data) => res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`);
  let alive = true, pos = {}, mt = {};
  const init = async () => {
    const [persona, state, memory, exit, log, diary, wishes] = await Promise.all([
      readJSON(path.join(bd, 'persona.json')), readJSON(F.state, {}), readJSON(F.memory, {}), readJSON(path.join(bd, 'exit.json')),
      tail(F.log, 120), tail(F.diary, 40), tail(F.wishes, 40)]);
    const mem = memory ? { summary: memory.summary, likes: memory.likes, dislikes: memory.dislikes, mood: memory.mood, catches: memory.catches, wishes: memory.wishes } : null;
    send('init', { id, persona, state, memory: mem, exit, feed: log.map(slim).filter(x => x.kind !== 'step' || x.thought != null).slice(-60), diary, wishes });
    for (const k of ['log', 'diary', 'wishes']) pos[k] = size(F[k]);
    mt.state = mtime(F.state); mt.live = mtime(F.live);
    if (mt.live) send('frame', { t: mt.live });
  };
  const tick = async () => {
    if (!alive) return;
    try {
      const ml = mtime(F.live); if (ml && ml !== mt.live) { mt.live = ml; send('frame', { t: ml }); }
      const ms = mtime(F.state); if (ms !== mt.state) { mt.state = ms; send('state', await readJSON(F.state, {})); }
      for (const [k, ev] of [['log', 'log'], ['diary', 'note'], ['wishes', 'wish']]) {
        const r = await readFrom(F[k], pos[k] || 0); pos[k] = r.pos;
        r.lines.forEach(x => send(ev, k === 'log' ? slim(x) : x));
      }
    } catch (e) { /* файл пишется — в следующий раз */ }
    if (alive) setTimeout(tick, 250);
  };
  const ping = setInterval(() => res.write(': ping\n\n'), 20000);
  req.on('close', () => { alive = false; clearInterval(ping); });
  init().then(tick).catch(e => { send('error', { message: e.message }); });
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), p = u.pathname.split('/').filter(Boolean);
  const file = async (f, type, cache = 'no-store') => {
    try { const b = await fsp.readFile(f); res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache, 'Content-Length': b.length }); res.end(b); }
    catch (e) { res.writeHead(404); res.end(); }
  };
  try {
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    if (!p.length) return file(path.join(HERE, 'viewer.html'), TYPES['.html']);
    if (p[0] === 'api' && p[1] === 'bots') { const b = JSON.stringify(await listBots()); res.writeHead(200, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' }); res.end(b); return; }
    if (p[0] === 'api' && p[1] === 'bot' && ID.test(p[2] || '')) {
      const bd = path.join(DIR, p[2]);
      if (p[3] === 'events') return sse(req, res, p[2]);
      if (p[3] === 'live.jpg') return file(path.join(bd, 'live.jpg'), TYPES['.jpg']);
      if (p[3] === 'shot' && /^\d{6}\.jpg$/.test(p[4] || '')) return file(path.join(bd, 'shots', p[4]), TYPES['.jpg'], 'max-age=86400');
      if (p[3] === 'exit') return file(path.join(bd, 'exit.json'), TYPES['.json']);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('нет такого');
  } catch (e) { res.writeHead(500); res.end(String(e.message)); }
});
server.listen(PORT, HOST, () => console.log(`Зритель ИИ-игроков: http://${HOST}:${PORT}/  (папка ${DIR})`));
