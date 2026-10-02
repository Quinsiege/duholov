// Звуки игры: исходники из наборов (Kenney, Leohpaz) → www/sfx/<имя>.mp3 и www/sfx/LICENSES.md.
// Каждый файл: моно 44,1 кГц, без тишины в начале и в конце, срез ниже 100 Гц (у телефонов их нет), выравнивание
// громкости (максимум «мгновенной» громкости EBU R128 — к −16 LUFS, пик — не выше −1,5 дБFS), MP3 96 кбит/с.
// Громкость звука в игре задаёт поле vol в таблице SFX (www/js/util.js) — подобрана по замерам: на 2 дБ громче
// прежнего синтеза, чтобы привычное соотношение звуков и музыки не сломалось.
// Запуск: node tools/sfx/build.mjs <папка с распакованными наборами>   (нужен ffmpeg в PATH)
// Наборы в папке: kenney-interface-sounds, kenney-music-jingles, kenney-impact-sounds, kenney-rpg-audio,
// leohpaz-rpg-essentials — как в архивах с официальных страниц (адреса — в www/sfx/LICENSES.md). В репозиторий не кладём.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'www/sfx');
const SRC = process.argv[2] && path.resolve(process.argv[2]);
if (!SRC || !fs.existsSync(SRC)) { console.error('Укажи папку с наборами: node tools/sfx/build.mjs <папка>'); process.exit(1); }
const TARGET_M = -16, CEIL = -1.5, MAX_GAIN = 24;

const PACKS = {
  kui: { dir: 'kenney-interface-sounds/Audio/', name: 'Kenney — Interface Sounds', author: 'Kenney (kenney.nl)', url: 'https://kenney.nl/assets/interface-sounds', lic: 'CC0 1.0' },
  kjg: { dir: 'kenney-music-jingles/Audio/', name: 'Kenney — Music Jingles', author: 'Kenney (kenney.nl)', url: 'https://kenney.nl/assets/music-jingles', lic: 'CC0 1.0' },
  kim: { dir: 'kenney-impact-sounds/Audio/', name: 'Kenney — Impact Sounds', author: 'Kenney (kenney.nl)', url: 'https://kenney.nl/assets/impact-sounds', lic: 'CC0 1.0' },
  krp: { dir: 'kenney-rpg-audio/Audio/', name: 'Kenney — RPG Audio', author: 'Kenney (kenney.nl)', url: 'https://kenney.nl/assets/rpg-audio', lic: 'CC0 1.0' },
  leo: { dir: 'leohpaz-rpg-essentials/', name: 'Leohpaz — RPG Essentials SFX (Free)', author: 'Leohpaz (Leonardo Paz)', url: 'https://leohpaz.itch.io/rpg-essentials-sfx-free', lic: 'бесплатно в своих проектах, см. ниже' },
};

// имя файла → источник: [набор, файл] или несколько слоёв { mix: [[набор, файл, дБ]…] }; max — обрезать до N секунд с затуханием
const MAP = {
  // интерфейс
  tap:        { src: ['kui', 'glass_006.ogg'] },
  count:      { src: ['kui', 'tick_004.ogg'] },
  page:       { src: ['krp', 'bookFlip3.ogg'] },
  hint:       { src: ['kui', 'glass_001.ogg'] },
  success:    { src: ['kui', 'confirmation_003.ogg'] },
  send:       { src: ['kui', 'open_002.ogg'] },
  // поимка и духи
  throw:      { src: ['kui', 'maximize_009.ogg'] },
  hit:        { src: ['kim', 'impactGlass_light_002.ogg'] },
  miss:       { src: ['leo', '10_Battle_SFX/35_Miss_Evade_02.wav'] },
  wobble:     { src: ['kui', 'drop_002.ogg'] },
  escape:     { src: ['kim', 'impactGlass_medium_000.ogg'] },
  flee:       { src: ['leo', '10_Battle_SFX/51_Flee_02.wav'] },
  catch:      { src: ['kjg', 'Pizzicato jingles/jingles_PIZZI04.ogg'] },
  shiny:      { src: ['kui', 'glass_004.ogg'] },
  photo:      { src: ['krp', 'metalClick.ogg'] },
  heal:       { src: ['leo', '8_Buffs_Heals_SFX/02_Heal_02.wav'] },
  hatch:      { mix: [['kjg', 'Pizzicato jingles/jingles_PIZZI16.ogg', 0], ['leo', '8_Buffs_Heals_SFX/30_Revive_03.wav', -8]], max: 1.4 },
  use_item:   { src: ['leo', '10_UI_Menu_SFX/051_use_item_01.wav'] },
  // бой
  attack:     { src: ['leo', '12_Player_Movement_SFX/56_Attack_03.wav'] },
  special:    { src: ['leo', '8_Atk_Magic_SFX/45_Charge_05.wav'], max: 1.3 },
  charge:     { src: ['kui', 'drop_001.ogg'] },
  warn:       { src: ['kui', 'error_008.ogg'] },
  shield:     { src: ['leo', '10_Battle_SFX/39_Block_03.wav'] },
  hurt:       { src: ['leo', '12_Player_Movement_SFX/61_Hit_03.wav'] },
  ko:         { src: ['leo', '10_Battle_SFX/69_Enemy_death_01.wav'] },
  match:      { src: ['leo', '10_Battle_SFX/55_Encounter_02.wav'], max: 1.3 },
  win:        { src: ['kjg', 'Pizzicato jingles/jingles_PIZZI10.ogg'] },
  lose:       { src: ['kjg', 'Pizzicato jingles/jingles_PIZZI11.ogg'] },
  // голоса стихий (тень — синтез: «Яд» Leohpaz почти весь ниже 250 Гц, в динамике телефона его не слышно)
  'el-fire':    { src: ['leo', '8_Atk_Magic_SFX/04_Fire_explosion_04_medium.wav'], max: 1.2 },
  'el-water':   { src: ['leo', '8_Atk_Magic_SFX/22_Water_02.wav'], max: 1.2 },
  'el-forest':  { src: ['leo', '8_Atk_Magic_SFX/30_Earth_02.wav'], max: 1.2 },
  'el-wind':    { src: ['leo', '8_Atk_Magic_SFX/25_Wind_01.wav'], max: 1.2 },
  'el-current': { src: ['leo', '8_Atk_Magic_SFX/18_Thunder_02.wav'], max: 1.2 },
  // награды и события
  spring:     { src: ['leo', '8_Buffs_Heals_SFX/39_Absorb_04.wav'], max: 1.3 },
  bag:        { src: ['krp', 'cloth1.ogg'] },
  loot:       { src: ['kui', 'drop_004.ogg'] },
  reward:     { src: ['kui', 'confirmation_002.ogg'] },
  reward_big: { src: ['kjg', 'Pizzicato jingles/jingles_PIZZI15.ogg'] },
  pay:        { mix: [['kjg', 'Steel jingles/jingles_STEEL16.ogg', 0], ['krp', 'handleCoins2.ogg', -6]] },
  coins:      { src: ['krp', 'handleCoins.ogg'] },
  equip:      { src: ['leo', '10_UI_Menu_SFX/070_Equip_10.wav'] },
  notice:     { src: ['kjg', 'Pizzicato jingles/jingles_PIZZI06.ogg'] },
  portal:     { src: ['leo', '12_Player_Movement_SFX/88_Teleport_02.wav'], max: 1.5 },
  // уровни и рост
  levelup:    { src: ['kjg', 'Pizzicato jingles/jingles_PIZZI02.ogg'] },
  powerup:    { src: ['leo', '8_Buffs_Heals_SFX/16_Atk_buff_04.wav'], max: 1.2 },
  // ошибки
  error:      { src: ['kui', 'question_002.ogg'] },
  locked:     { src: ['leo', '10_UI_Menu_SFX/033_Denied_03.wav'] },
  nudge:      { src: ['kui', 'question_004.ogg'] },
  sad:        { src: ['kjg', 'Pizzicato jingles/jingles_PIZZI01.ogg'] },
};

const ff = args => spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-y', ...args], { encoding: 'utf8' });
const must = (r, what) => { if (r.status) { console.error(what, r.stderr.slice(-800)); process.exit(1); } return r; };
const srcPath = ([pack, file]) => {
  const p = path.join(SRC, PACKS[pack].dir, file);
  if (!fs.existsSync(p)) { console.error('нет файла', p); process.exit(1); }
  return p;
};
// максимум мгновенной громкости (окно 400 мс; короткий звук дополнен тишиной) и пик
function measure(file) {
  const r = ff(['-i', file, '-af', 'apad=pad_dur=0.5,ebur128=framelog=info:peak=sample', '-f', 'null', '-']);
  const ms = [...r.stderr.matchAll(/ M:\s*(-?[\d.]+)/g)].map(m => +m[1]).filter(v => v > -70);
  const pk = (r.stderr.match(/Sample peak:\s*\n\s*Peak:\s*(-?[\d.]+)/) || [])[1];
  return { m: ms.length ? Math.max(...ms) : -70, peak: pk === undefined ? -120 : +pk };
}
const duration = file => +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim();

fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'duholov-sfx-'));
const LEAD = 'silenceremove=start_periods=1:start_threshold=-50dB';
const rows = [];
try {
  for (const [name, e] of Object.entries(MAP)) {
    const layers = e.mix || [[...e.src, 0]];
    const inputs = layers.flatMap(l => ['-i', srcPath(l)]);
    // каждый слой: моно, 44,1 кГц, без тишины в начале, своя громкость; слои складываются
    const pre = layers.map((l, i) => `[${i}:a]aformat=sample_fmts=fltp:channel_layouts=mono,aresample=44100,${LEAD},volume=${l[2]}dB[a${i}]`);
    const mixed = layers.length > 1 ? `;${layers.map((_, i) => `[a${i}]`).join('')}amix=inputs=${layers.length}:normalize=0:duration=longest[m]` : '';
    const cut = e.max ? `,atrim=end=${e.max},afade=t=out:st=${(e.max - 0.3).toFixed(2)}:d=0.3` : '';
    const chain = `${pre.join(';')}${mixed};[${layers.length > 1 ? 'm' : 'a0'}]anull${cut},areverse,silenceremove=start_periods=1:start_threshold=-60dB,areverse,highpass=f=100[o]`;
    const wav = path.join(tmp, name + '.wav');
    must(ff([...inputs, '-filter_complex', chain, '-map', '[o]', '-c:a', 'pcm_f32le', wav]), name);
    const { m, peak } = measure(wav), dur = duration(wav);
    const gain = Math.min(TARGET_M - m, CEIL - peak, MAX_GAIN);
    const fo = Math.min(0.015, dur / 4);
    const mp3 = path.join(OUT, name + '.mp3');
    must(ff(['-i', wav, '-af', `volume=${gain.toFixed(2)}dB,afade=t=in:d=0.003,afade=t=out:st=${Math.max(0, dur - fo).toFixed(3)}:d=${fo.toFixed(3)}`,
      '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', '-map_metadata', '-1', '-id3v2_version', '0', '-write_id3v1', '0', mp3]), name);
    const after = measure(mp3);
    rows.push({ name, dur, kb: fs.statSync(mp3).size / 1024, m: after.m, peak: after.peak, from: layers.map(l => [l[0], l[1]]) });
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

// лишние файлы прошлых сборок — убрать
const keep = new Set(Object.keys(MAP).map(n => n + '.mp3'));
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.mp3') && !keep.has(f)) fs.rmSync(path.join(OUT, f));

const total = rows.reduce((a, r) => a + r.kb, 0);
for (const r of rows) console.log(`${r.name.padEnd(11)} ${r.dur.toFixed(2)} с  ${r.kb.toFixed(1).padStart(5)} КБ  M ${r.m.toFixed(1)} LUFS  пик ${r.peak.toFixed(1)}`);
console.log(`Итого: ${rows.length} файлов, ${total.toFixed(0)} КБ`);

// LICENSES.md — откуда каждый файл
const lic = `# Звуки игры: источники и лицензии

Файлы собраны скриптом \`tools/sfx/build.mjs\`: моно, MP3 96 кбит/с, обрезка тишины, выравнивание громкости.
Ни один набор не требует указывать автора — указываем, чтобы было честно и проще проверить.

| Файл | Набор | Исходный файл | Автор | Лицензия |
|---|---|---|---|---|
${rows.map(r => r.from.map(([p, f], i) => `| ${i ? '' : r.name + '.mp3'} | ${PACKS[p].name} | ${f.split('/').pop()} | ${PACKS[p].author} | ${PACKS[p].lic} |`).join('\n')).join('\n')}

## Наборы

- **Kenney — Interface Sounds, Music Jingles, Impact Sounds, RPG Audio** — https://kenney.nl/assets/interface-sounds,
  https://kenney.nl/assets/music-jingles, https://kenney.nl/assets/impact-sounds, https://kenney.nl/assets/rpg-audio.
  Лицензия CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/). Из License.txt: Interface Sounds и Impact Sounds —
  «This content is free to use in personal, educational and commercial projects. Support us by crediting Kenney or
  www.kenney.nl (this is not mandatory)»; Music Jingles и RPG Audio — «You may use these assets in personal and commercial
  projects. Credit (Kenney or www.kenney.nl) would be nice but is not mandatory.»
- **Leohpaz — RPG Essentials SFX (Free)** — https://leohpaz.itch.io/rpg-essentials-sfx-free. Условия со страницы набора
  (2 октября 2026): «Both the demo and the complete pack are free to use in your projects; You may not sell it or distribute
  this asset pack for free, please redirect people to this page in case someone else shows interest in my work; Credits are
  not mandatory, but much appreciated». Сам набор мы не раздаём: в игре только отдельные обработанные звуки.
`;
fs.writeFileSync(path.join(OUT, 'LICENSES.md'), lic);
console.log('www/sfx/LICENSES.md записан');
