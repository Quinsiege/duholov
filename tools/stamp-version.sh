#!/bin/sh
# Метка версии в адресах файлов (?v=dev → ?v=4.1.0-abc1234): браузеры и CDN кэшируют файлы, а новые адреса берут с сервера —
# новая страница никогда не получит старые скрипты. Запускается в CI перед выкладкой сайта.
# 4.7: к версии добавляется короткий хэш коммита — каждая выкладка (даже без смены версии) получает свои адреса и свой кэш.
set -e
V=$(node -p "require('./www/version.json').version")
B=$(printf %.7s "${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo local)}")
sed -i "s/?v=dev/?v=$V-$B/g" www/index.html www/admin.html www/auth.html www/sw.js
sed -i "s/^const BUILD = 'dev';/const BUILD = '$B';/" www/sw.js
if grep -q '?v=dev' www/index.html www/admin.html www/auth.html www/sw.js; then echo 'осталась метка ?v=dev'; exit 1; fi
if grep -q "^const BUILD = 'dev';" www/sw.js; then echo 'не проставлена метка сборки в sw.js'; exit 1; fi
echo "Версия $V, сборка $B"
