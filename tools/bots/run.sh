#!/usr/bin/env bash
# ИИ-игроки «Духолова»: короткие команды.
#   ./run.sh bot [id]          — один бот в этом терминале (настройки — из /etc/duholov-bots.env, если есть, и окружения)
#   ./run.sh view              — зритель на 127.0.0.1:${BOT_VIEW_PORT:-8090}
#   ./run.sh start|stop|restart id…  — боты как службы systemd (duholov-bot@id)
#   ./run.sh status            — службы, модель, боты
#   ./run.sh logs [id]         — журнал бота (или модели: logs llm)
#   ./run.sh llm-test          — проверить модель: один ответ по схеме действия
#   ./run.sh offline [id]      — проверка без сети и модели: локальная игра (GAME_URL, по умолчанию http://localhost:8780/) + LLM_URL=mock
#   ./run.sh reset id          — забыть бота (персона, память, вход) — спросит подтверждение
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"
if [ -r /etc/duholov-bots.env ]; then set -a; . /etc/duholov-bots.env; set +a; fi
cmd=${1:-help}; shift || true
case "$cmd" in
  bot) exec node bot.mjs "${1:-bot1}" ;;
  view) exec node viewer.mjs ;;
  start|stop|restart)
    [ $# -gt 0 ] || { echo "Какого бота? ./run.sh $cmd bot1"; exit 1; }
    for id in "$@"; do
      if [ "$cmd" = start ]; then systemctl enable --now "duholov-bot@$id"; else systemctl "$cmd" "duholov-bot@$id"; fi
      [ "$cmd" = stop ] && systemctl disable "duholov-bot@$id" 2>/dev/null || true
    done ;;
  status)
    systemctl --no-pager --plain list-units 'duholov-*' || true
    echo; curl -s "${LLM_URL:-http://127.0.0.1:8080}/health" && echo || echo "модель не отвечает"
    echo; for d in "${BOTS_DIR:-$HERE/bots}"/*/; do [ -f "$d/state.json" ] && node -e "const s=require('$d/state.json');console.log((s.id+'').padEnd(10),(s.status+'').padEnd(16),'шаг',s.step,'|',s.stats?('ур.'+s.stats.level+' духов '+s.stats.spirits):'—','|',s.goal||'')"; done 2>/dev/null || true ;;
  logs)
    if [ "${1:-}" = llm ]; then exec journalctl -u duholov-llm -f -n 50; fi
    exec journalctl -u "duholov-bot@${1:-bot1}" -f -n 100 ;;
  llm-test)
    node -e "
      import('./llm.mjs').then(async ({ LLM }) => {
        const l = new LLM(); console.log('модель:', l.url, await l.health());
        const t = Date.now();
        const r = await l.json([{ role: 'system', content: 'Ты игрок мобильной игры. Отвечай JSON {thought, goal, action:{type}}.' }, { role: 'user', content: 'ЭКРАН: Карта. КНОПКИ: b1 «Меню». РЯДОМ: o1 дух Уголёк 40 м ✓. Что делаешь?' }],
          { type: 'object', required: ['thought', 'goal', 'action'], properties: { thought: { type: 'string' }, goal: { type: 'string' }, action: { type: 'object', required: ['type'], properties: { type: { type: 'string', enum: ['tap', 'walk', 'wait'] }, ref: { type: 'string' } } } } });
        console.log(Math.round((Date.now() - t) / 100) / 10 + ' с', r.data, r.usage || '');
      }).catch(e => { console.error('ошибка:', e.message); process.exit(1); });" ;;
  offline)
    export GAME_URL=${GAME_URL:-http://localhost:8780/} OFFLINE=1 LLM_URL=${LLM_URL_OFFLINE:-mock}
    exec node bot.mjs "${1:-dev1}" ;;
  reset)
    id=${1:?какого бота}; d="${BOTS_DIR:-$HERE/bots}/$id"
    [ -d "$d" ] || { echo "нет $d"; exit 1; }
    read -rp "Удалить папку $d (персона, память, логи, вход в игру)? [y/N] " a; [ "$a" = y ] && rm -rf "$d" && echo "удалено" ;;
  *) sed -n '2,11p' "$0" ;;
esac
