#!/bin/sh
# Публикация «Дом!» на Firebase Hosting: https://dom-zadachi.web.app
# В _site копируется ТОЛЬКО фиксированный список файлов приложения: в папке проекта
# лежат _backup/ с данными семьи и рабочие заметки — наружу они уйти не должны.
# Новый файл приложения (картинка, скрипт) — добавить его в список ниже.
set -e
cd "$(dirname "$0")"
rm -rf _site && mkdir _site
cp index.html sw.js manifest.webmanifest icon-180.png icon-192.png icon-512.png _site/
npx -y firebase-tools@15 deploy --only hosting --project abkhazia-checklist --non-interactive
