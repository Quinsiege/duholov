#!/usr/bin/env bash
# Установка ИИ-игроков «Духолова» на отдельный сервер (Ubuntu 24.04, root). Повторный запуск безопасен.
#   bash setup-server.sh            — всё: пакеты, Node 20, Playwright Chromium, llama.cpp, модель из S3, службы systemd
#   SKIP_MODEL=1 / SKIP_LLAMA=1     — пропустить скачивание модели / сборку llama.cpp
# Папки: /opt/duholov-bots/app (код — эта папка tools/bots), /opt/duholov-bots/bots (данные ботов),
#        /opt/duholov-bots/ms-playwright (браузер), /opt/llama.cpp, /opt/models (модель).
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Нужен root"; exit 1; }
SRC="$(cd "$(dirname "$0")" && pwd)"
BASE=/opt/duholov-bots; APP=$BASE/app; DATA=$BASE/bots; PWB=$BASE/ms-playwright
LLAMA_DIR=/opt/llama.cpp; MODELS=/opt/models/qwen2.5-7b-instruct
MODEL_S3=${MODEL_S3:-s3://duholov-models/qwen2.5-7b-instruct}
MODEL_FILE=qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf
MODEL_FILE2=qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf
log() { echo -e "\n\033[1;33m== $*\033[0m"; }

log "Пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q ca-certificates curl git build-essential cmake unzip awscli rsync >/dev/null || apt-get install -y -q ca-certificates curl git build-essential cmake unzip rsync

if ! command -v aws >/dev/null; then
  log "AWS CLI (awscli нет в apt — ставлю официальный)"
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/awscli.zip && unzip -qo /tmp/awscli.zip -d /tmp && /tmp/aws/install --update && rm -rf /tmp/aws /tmp/awscli.zip
fi

NODE_MAJOR=$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || echo 0)
if [ "${NODE_MAJOR:-0}" -lt 20 ]; then
  log "Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y -q nodejs >/dev/null
fi
node -v

log "Пользователь duholov-bot и папки"
id duholov-bot >/dev/null 2>&1 || useradd --system --create-home --home-dir $BASE --shell /usr/sbin/nologin duholov-bot
mkdir -p "$APP" "$DATA" "$PWB"
rsync -a --delete --exclude bots --exclude node_modules --exclude ms-playwright "$SRC/" "$APP/"
chmod +x "$APP/run.sh" "$APP/setup-server.sh" || true

log "Playwright + Chromium (с системными библиотеками)"
cd "$APP"
npm install --omit=dev --no-audit --no-fund
PLAYWRIGHT_BROWSERS_PATH=$PWB npx --yes playwright install --with-deps chromium
chown -R duholov-bot:duholov-bot "$BASE"

if [ "${SKIP_LLAMA:-0}" != 1 ]; then
  log "llama.cpp: сборка llama-server под этот процессор"
  if [ -d $LLAMA_DIR/.git ]; then git -C $LLAMA_DIR pull -q --ff-only || true; else git clone -q --depth 1 https://github.com/ggml-org/llama.cpp $LLAMA_DIR; fi
  cmake -S $LLAMA_DIR -B $LLAMA_DIR/build -DCMAKE_BUILD_TYPE=Release -DGGML_NATIVE=ON -DLLAMA_CURL=OFF -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF >/dev/null
  cmake --build $LLAMA_DIR/build --config Release -j"$(nproc)" --target llama-server
fi
LLAMA_BIN=$LLAMA_DIR/build/bin/llama-server
[ -x $LLAMA_BIN ] || { echo "Нет $LLAMA_BIN — сборка не удалась"; exit 1; }

if [ "${SKIP_MODEL:-0}" != 1 ]; then
  log "Модель Qwen2.5-7B-Instruct Q4_K_M из S3 ($MODEL_S3)"
  [ -f /root/.duholov-s3 ] || { echo "Нет /root/.duholov-s3 (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_ENDPOINT) — положи его и запусти снова (или SKIP_MODEL=1)"; exit 1; }
  set -a; . /root/.duholov-s3; set +a
  mkdir -p $MODELS
  for f in $MODEL_FILE $MODEL_FILE2; do
    if [ -s "$MODELS/$f" ]; then echo "уже есть: $f"; else aws --endpoint-url "$S3_ENDPOINT" s3 cp "$MODEL_S3/$f" "$MODELS/$f.part" --only-show-errors && mv "$MODELS/$f.part" "$MODELS/$f"; fi
  done
  chown -R duholov-bot:duholov-bot /opt/models
fi
ls -la $MODELS

log "Настройки /etc/duholov-bots.env"
if [ ! -f /etc/duholov-bots.env ]; then
  umask 077
  cat > /etc/duholov-bots.env <<Y
# ИИ-игроки «Духолова». Ключ тестового контура впишет владелец (строка DUHOLOV_TEST_KEY=…), файл читает только root.
DUHOLOV_TEST_KEY=
GAME_URL=https://test.duholov.ru/
LLM_URL=http://127.0.0.1:8080
LLM_PORT=8080
BOTS_DIR=$DATA
PLAYWRIGHT_BROWSERS_PATH=$PWB
BOT_VIEW_PORT=8090
# API_PER_MIN=4
# MEM_EVERY=10
# LLM_TIMEOUT_MS=180000
Y
  chmod 600 /etc/duholov-bots.env
  echo "Создан /etc/duholov-bots.env — впиши DUHOLOV_TEST_KEY: nano /etc/duholov-bots.env"
fi

log "Службы systemd"
for u in duholov-llm.service duholov-bot@.service duholov-bots-view.service; do
  sed -e "s#@APP@#$APP#g" -e "s#@LLAMA@#$LLAMA_BIN#g" -e "s#@MODEL@#$MODELS/$MODEL_FILE#g" "$APP/systemd/$u" > /etc/systemd/system/$u
done
systemctl daemon-reload
systemctl enable --now duholov-llm.service duholov-bots-view.service
echo "Жду llama-server (загрузка модели ~1 мин)…"
for i in $(seq 1 90); do curl -sf http://127.0.0.1:8080/health >/dev/null && break; sleep 2; done
curl -s http://127.0.0.1:8080/health; echo

log "Готово"
cat <<T
  Ключ контура:      nano /etc/duholov-bots.env        (DUHOLOV_TEST_KEY=…)
  Запустить бота:    systemctl enable --now duholov-bot@bot1
  Ещё ботов:         systemctl enable --now duholov-bot@bot2 duholov-bot@bot3
  Смотреть:          на своём компьютере  ssh -L 8090:127.0.0.1:8090 root@<ip>  →  http://localhost:8090/
  Журнал бота:       journalctl -u duholov-bot@bot1 -f
  Проверка модели:   $APP/run.sh llm-test
T
