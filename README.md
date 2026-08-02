# Дом!

Семейный менеджер домашних дел — PWA. Хаб категорий, быстрый ввод в Inbox,
витрина «На выходные», приоритеты задач. Работает офлайн, синхронизируется между
устройствами через Firebase. Вход — Google.

Собран на движке приложения [«Соберись!»](https://github.com/faxbax-ctrl/abkhazia-checklist)
(один статический `index.html`, без сборки и фреймворков).

**Живой адрес:** https://faxbax-ctrl.github.io/dom-tasks/

## Запуск локально
Просто откройте `index.html` в браузере, либо поднимите статический сервер:

```bash
python3 -m http.server 8080
```

и зайдите на `http://localhost:8080`.

## Деплой
GitHub Pages: ветка `main`, корень репозитория. `git push` → публикация ~1 минута.

## Доступ (важно)
Кто имеет доступ к данным — определяется **только правилами Firestore**, не кодом.
В репозитории списка email нет.

Текущее правило — **wildcard** (общее с «Соберись!»): доступ ко всем документам проекта
разрешённым email, поэтому документ `checklists/home` уже покрыт (отдельное правило не нужно).
Форма (Firebase Console → Firestore → Rules → Publish):

```
match /{document=**} {
  allow read, write: if request.auth != null &&
    request.auth.token.email in ['email1@example.com', 'email2@example.com'];
}
```

**Добавить пользователя** — дописать его email в этот список правил и нажать Publish.
В коде ничего менять не нужно. Реальный список email — только в консоли, не в репозитории.

## После правок `index.html` / `sw.js`
Поднимите версию кэша в `sw.js` (`const CACHE='dom-vN'` → `vN+1`), иначе у
пользователей останется старая версия из кэша service worker.

Подробности — в [`CLAUDE.md`](CLAUDE.md).
