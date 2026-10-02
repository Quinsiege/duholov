// Клиент аддона «MCP for Blender» (localhost:9876): выполнить Python в открытом Blender и напечатать вывод.
//   node bl.mjs file.py [file2.py …]   — файлы склеиваются по порядку (общие помощники — первым); в начало кода
//                                         ставится TOOLS — папка этого скрипта (export_all.py кладёт модели в ../../www/models)
//   node bl.mjs -e "print(1)"           — код строкой
//   node bl.mjs -c get_scene_info       — любая команда аддона без параметров
import net from 'node:net';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const TOOLS = `TOOLS = r"${dirname(fileURLToPath(import.meta.url))}"`;
let cmd;
if (args[0] === '-c') cmd = { type: args[1], params: {} };
else if (args[0] === '-e') cmd = { type: 'execute_code', params: { code: args.slice(1).join(' ') } };
else cmd = { type: 'execute_code', params: { code: [TOOLS, ...args.map(f => readFileSync(f, 'utf8'))].join('\n\n') } };

const sock = net.createConnection({ host: '127.0.0.1', port: 9876 });
let buf = '';
const done = (code, text) => { process.stdout.write(text.endsWith('\n') ? text : text + '\n'); sock.destroy(); process.exit(code); };
const timer = setTimeout(() => done(2, 'нет ответа за 10 минут'), 600000);
sock.on('connect', () => sock.write(JSON.stringify(cmd)));
sock.on('data', d => {
  buf += d.toString('utf8');
  let r;
  try { r = JSON.parse(buf); } catch { return; } // ответ пришёл не целиком — ждём ещё
  clearTimeout(timer);
  if (r.status !== 'success') {
    let m = r.message || JSON.stringify(r);
    try { const e = JSON.parse(m); m = `${e.exception_type}: ${e.message}\n${e.traceback || ''}`; } catch { /* как есть */ }
    return done(1, 'ОШИБКА: ' + m);
  }
  const res = r.result;
  done(0, res && typeof res === 'object' && 'result' in res && cmd.type === 'execute_code' ? String(res.result || '(без вывода)') : JSON.stringify(res, null, 1));
});
sock.on('error', e => done(3, 'нет связи с Blender (открыт ли он?): ' + e.message));
