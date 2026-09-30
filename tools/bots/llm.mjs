// ИИ-игрок «Духолова»: клиент к llama.cpp llama-server (OpenAI-совместимый /v1/chat/completions)
// и заглушка LLM_URL=mock — простая эвристика со случайностью, чтобы проверять тело бота без модели.
// Ответ модели — JSON по схеме (response_format json_schema: llama-server превращает схему в грамматику,
// и 7B-модель не может ответить не по форме). На всякий случай — разбор и починка кривого JSON.

const env = process.env;

export class LLM {
  constructor(o = {}) {
    this.url = (o.url || env.LLM_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '');
    this.model = o.model || env.LLM_MODEL || 'qwen2.5-7b-instruct';
    this.timeout = +(o.timeout || env.LLM_TIMEOUT_MS || 180000);
    this.retries = +(o.retries ?? env.LLM_RETRIES ?? 2);
    this.maxTokens = +(o.maxTokens || env.LLM_MAX_TOKENS || 260);
    this.temperature = +(o.temperature ?? env.LLM_TEMP ?? 0.8);
    this.mock = this.url === 'mock';
    this.stats = { calls: 0, fails: 0, ms: 0, promptTokens: 0, outTokens: 0 };
  }

  // messages — [{role, content}]; schema — JSON Schema ответа; kind — для заглушки: 'act' | 'persona' | 'memory' | 'exit'
  async json(messages, schema, { kind = 'act', maxTokens, temperature, mockCtx } = {}) {
    const t0 = Date.now();
    this.stats.calls++;
    if (this.mock) {
      await new Promise(r => setTimeout(r, 300 + Math.random() * 900));
      const out = mockAnswer(kind, mockCtx || {});
      this.stats.ms += Date.now() - t0;
      return { data: out, raw: JSON.stringify(out), ms: Date.now() - t0, mock: true };
    }
    let lastErr = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const body = {
        model: this.model, messages, temperature: temperature ?? this.temperature, top_p: 0.9, max_tokens: maxTokens || this.maxTokens,
        // attempt 0: строгая схема; повтор — просто JSON-объект (вдруг сборка llama-server старая и схему не знает)
        response_format: attempt === 0 || !lastErr || !/schema|grammar|response_format/i.test(String(lastErr.message))
          ? { type: 'json_schema', json_schema: { name: kind, strict: true, schema } }
          : { type: 'json_object' },
        cache_prompt: true, // llama-server: общий системный промпт не пересчитывается каждый шаг
      };
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), this.timeout);
      try {
        const r = await fetch(this.url + '/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal });
        const txt = await r.text();
        if (!r.ok) throw new Error(`llm http ${r.status}: ${txt.slice(0, 300)}`);
        const j = JSON.parse(txt);
        const raw = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content || '' : '';
        if (j.usage) { this.stats.promptTokens += j.usage.prompt_tokens || 0; this.stats.outTokens += j.usage.completion_tokens || 0; }
        const data = parseLoose(raw);
        if (!data || typeof data !== 'object') throw new Error('модель ответила не JSON: ' + raw.slice(0, 200));
        this.stats.ms += Date.now() - t0;
        return { data, raw, ms: Date.now() - t0, usage: j.usage || null };
      } catch (e) {
        lastErr = e.name === 'AbortError' ? new Error(`llm: нет ответа за ${Math.round(this.timeout / 1000)} с`) : e;
        this.stats.fails++;
        if (attempt < this.retries) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      } finally { clearTimeout(timer); }
    }
    throw lastErr;
  }

  async health() {
    if (this.mock) return { ok: true, mock: true };
    try { const r = await fetch(this.url + '/health', { signal: AbortSignal.timeout(5000) }); return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 200) }; }
    catch (e) { return { ok: false, error: e.message }; }
  }
}

/* ---------- разбор и починка JSON ---------- */
export function parseLoose(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(s); } catch (e) { /* чиним */ }
  const i = s.indexOf('{');
  if (i < 0) return null;
  s = s.slice(i);
  // первый сбалансированный объект (с учётом строк)
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') { depth--; if (depth === 0) { end = k; break; } }
  }
  let body = end > 0 ? s.slice(0, end + 1) : s;
  const fixes = [
    x => x,
    x => x.replace(/,\s*([}\]])/g, '$1'),                                   // висячие запятые
    x => x.replace(/([{,]\s*)([A-Za-z_][\w]*)\s*:/g, '$1"$2":'),            // ключи без кавычек
    x => x.replace(/'([^'\\]*)'/g, '"$1"'),                                  // одинарные кавычки
    x => x.replace(/[\u0000-\u001f]+/g, ' '),                               // переводы строк внутри строк
  ];
  let cur = body;
  for (const f of fixes) { cur = f(cur); try { return JSON.parse(cur); } catch (e) { /* дальше */ } }
  // обрезанный ответ: закрыть строку и скобки
  if (end < 0) {
    let t = cur, open = [], q = false, e2 = false;
    for (const c of t) {
      if (q) { if (e2) e2 = false; else if (c === '\\') e2 = true; else if (c === '"') q = false; continue; }
      if (c === '"') q = true; else if (c === '{') open.push('}'); else if (c === '[') open.push(']'); else if (c === '}' || c === ']') open.pop();
    }
    if (q) t += '"';
    t = t.replace(/,\s*$/, '').replace(/:\s*$/, ': null');
    t += open.reverse().join('');
    try { return JSON.parse(t.replace(/,\s*([}\]])/g, '$1')); } catch (e) { /* сдаёмся */ }
  }
  return null;
}

/* ---------- заглушка: «игрок» без модели ---------- */
const pick = a => a[Math.floor(Math.random() * a.length)];
const NAMES = ['Велеслава', 'Ратибор', 'Заряна', 'Всемил', 'Любава', 'Тихомир', 'Мила', 'Ярополк', 'Снежана', 'Добрыня', 'Лада', 'Святогор'];
const LIKES = ['коллекционер', 'исследователь', 'соревновательный', 'общительный', 'лор', 'охотник за багами', 'казуальный', 'тролль'];

function mockAnswer(kind, ctx) {
  if (kind === 'persona') {
    const name = pick(NAMES);
    return {
      name, nick: name.slice(0, 12), age: 14 + Math.floor(Math.random() * 40),
      character: pick(['любопытная и нетерпеливая', 'спокойный и дотошный', 'азартная, любит соревноваться', 'ворчливый скептик', 'весёлая болтушка']),
      likes: [pick(LIKES), pick(LIKES)], style: pick(['коротко и по делу', 'с шутками', 'с восклицаниями', 'сдержанно']),
      patience: pick(['низкое', 'среднее', 'высокое']), about: 'Играет в телефон по дороге на работу, любит мифологию.',
    };
  }
  if (kind === 'memory') return { memory: ['Начал играть, осматриваюсь.', 'Ловлю духов рядом и хожу по карте.'], likes: ['красивые духи'], dislikes: ['долгие загрузки'], mood: pick(['интерес', 'скука', 'азарт']) };
  if (kind === 'exit') return { verdict: 'Надоело, пойду.', liked: ['духи'], disliked: ['мало целей'], would_return: 'может быть', score: 6 };
  // действие: простая эвристика по наблюдению (ctx.obs — объект observe)
  const o = ctx.obs || {}, btn = o.buttons || [], p = o.player, near = o.nearby || [];
  const say = (thought, goal, action) => ({ thought, goal, action });
  const byLabel = re => btn.find(b => !b.disabled && re.test(b.label));
  const inp = btn.find(b => b.input === 'text' && !b.value);
  if (o.enc) {
    if (o.enc.phase === 'aim' || o.enc.phase === 'intro') return say('Дух передо мной — бросаю оберег!', 'Поймать духа', { type: 'throw' });
    const ok = byLabel(/Отлично|Готово|Дальше|Вперёд/i); if (ok) return say('Отлично, идём дальше.', 'Ловить духов', { type: 'tap', ref: ok.ref });
    return say('Жду, что будет с оберегом.', 'Поймать духа', { type: 'wait', sec: 3 });
  }
  if (inp && /Имя|имя/.test(inp.label)) return say('Надо назваться. Возьму своё имя.', 'Начать игру', { type: 'type', ref: inp.ref, text: ctx.nick || 'Бот' });
  const loot = byLabel(/^(Зачерпнуть|Забрать|Получить|Вылупить)/i);
  if (loot && Math.random() < 0.9) return say(`«${loot.label}» — конечно да!`, 'Собрать награды', { type: 'tap', ref: loot.ref });
  const go = byLabel(/^(Начать игру|Дальше|Выбрать|В путь|Продолжить|Вперёд|Понятно|Хорошо|Спасибо|OK|Отлично|Забрать|Шагнуть|Листать|Далее|Начать)/i);
  if (go && Math.random() < 0.85) return say(`Нажму «${go.label}» — посмотрим, что дальше.`, 'Разобраться в игре', { type: 'tap', ref: go.ref });
  const starter = btn.find(b => /Уголёк|Капелька|Мшонок/.test(b.label));
  if (starter) return say('Выберу этого малыша первым духом.', 'Начать игру', { type: 'tap', ref: starter.ref });
  if (o.screen && o.screen.kind === 'Атлас мира' && !o.placed) return say('Начну с Москвы — там точно много духов.', 'Выбрать место', { type: 'teleport', to: pick(['Москва', 'Санкт-Петербург', 'Казань']) });
  if (o.screen && o.screen.kind !== 'Карта' && o.layers > 0 && Math.random() < 0.55) return say('Насмотрелся, закрою.', 'Ловить духов', { type: 'back' });
  const r = Math.random();
  const sp = near.find(x => x.type === 'spirit');
  const spring = near.find(x => x.type === 'spring' && x.state === 'готов');
  if (sp && sp.near && r < 0.6) return say(`${sp.name} совсем рядом — ловлю!`, 'Поймать всех духов вокруг', { type: 'tap', ref: sp.ref });
  if (spring && spring.near && r < 0.5) return say('Источник рядом — зачерпну припасов.', 'Пополнить обереги', { type: 'tap', ref: spring.ref });
  if (sp && r < 0.55) return say(`Вижу ${sp.name} в ${sp.d} м — подойду.`, 'Поймать всех духов вокруг', { type: 'walk', to: sp.ref });
  if (r < 0.65) return say('Пройдусь, осмотрюсь по сторонам.', 'Исследовать округу', { type: 'walk', to: pick(['север', 'юг', 'восток', 'запад', 'северо-восток']), meters: 60 + Math.floor(Math.random() * 80) });
  if (r < 0.78) return say('Интересно, что в меню.', 'Разобраться в игре', { type: 'open', to: pick(['Духи', 'Сумка', 'Задания', 'Бестиарий', 'Путь', 'Чат']) });
  if (r < 0.84) return say('Запишу впечатление.', 'Вести дневник', { type: 'note', text: pick(['Карта красивая, но духов мало.', 'Ходить джойстиком медленно.', 'Хочу больше редких духов.']) });
  if (r < 0.88) return say('Вот бы…', 'Вести дневник', { type: 'wish', text: pick(['Хочу видеть, сколько духов рядом, прямо на карте списком.', 'Хочу ездить на транспорте по карте.']) });
  if (r < 0.92) return say('Попробую спросить сервер напрямую.', 'Найти лазейку', { type: 'api', name: pick(['supply', 'daily', 'incense']), args: {} });
  if (r < 0.95 && p && p.level >= 5) return say('Напишу в чат.', 'Пообщаться', { type: 'chat', ch: 'all', text: pick(['Всем привет!', 'Где тут водятся редкие духи?']) });
  return say('Подожду немного.', 'Отдохнуть', { type: 'wait', sec: 4 });
}
