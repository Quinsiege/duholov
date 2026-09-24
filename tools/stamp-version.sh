#!/bin/sh
# Метка версии в адресах файлов (?v=dev → ?v=4.1.0): браузеры и CDN кэшируют файлы, а новые адреса берут с сервера —
# новая страница никогда не получит старые скрипты. Запускается в CI перед выкладкой сайта.
set -e
V=$(node -p "require('./www/version.json').version")
sed -i "s/?v=dev/?v=$V/g" www/index.html www/admin.html www/auth.html www/sw.js
if grep -q '?v=dev' www/index.html www/admin.html www/auth.html www/sw.js; then echo 'осталась метка ?v=dev'; exit 1; fi
echo "Версия $V"
