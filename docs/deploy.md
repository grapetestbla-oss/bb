# Деплой на VPS

Разворачивается всё одной командой на сервере. Приложение отдаёт обе части
проекта: BrawlBoost на `/` и KPGen на `/kp`.

## Что нужно

- VPS с Ubuntu/Debian и root или sudo
- домен, направленный A-записью на IP сервера — не обязателен, но без него не
  будет HTTPS (Caddy выпускает сертификат Let's Encrypt только на домен)
- открытые порты 80 и 443

## Быстрый путь

```bash
git clone https://github.com/grapetestbla-oss/bb.git
cd bb
git checkout claude/scrooge-mcduck-video-fnxbd5

bash deploy.sh ваш-домен.ru     # без домена: bash deploy.sh — сайт будет на http://IP
```

Скрипт ставит Docker, создаёт `.env` из `.env.example` со случайными секретами,
настраивает Caddy под домен, собирает контейнеры и наполняет базу демо-данными
BrawlBoost.

## Что поднимается

| Контейнер | Роль |
| --- | --- |
| `brawlboost-migrate` | Разовый запуск: накатывает схему Prisma в том с базой и отдаёт файлы пользователю приложения. Приложение стартует только после его успешного завершения |
| `brawlboost-app` | Next.js в standalone-режиме, порт 3000 |
| `brawlboost-chat` | Socket.IO для чата BrawlBoost, порт 3003 |
| `brawlboost-caddy` | Reverse proxy, HTTPS через Let's Encrypt, порты 80/443 |

База — SQLite в docker-томе `brawlboost-db`, файл `/app/db/custom.db`. Том
переживает пересборку образов; чтобы стереть данные, нужно удалить сам том.

## Переменные окружения

Лежат в `.env` рядом с `docker-compose.yml`, его читает docker compose.

| Переменная | Обязательна | Назначение |
| --- | --- | --- |
| `KP_SESSION_SECRET` | да | Подпись сессионной куки KPGen. Без неё compose не запустится |
| `KP_WEBHOOK_SECRET` | да | Проверка подписи вебхука об оплате |
| `NEXTAUTH_SECRET` | да | Секрет BrawlBoost |
| `NEXTAUTH_URL` | да | Публичный адрес сайта |
| `ANTHROPIC_API_KEY` | нет | С ключом текст КП пишет Claude, без него — встроенный сборщик |

Сгенерировать секрет: `openssl rand -base64 32`.

## Обновление

```bash
git pull
sudo docker compose up -d --build
```

Сервис миграции отработает сам: `prisma db push` идемпотентен — на существующей
базе он только доводит её до схемы, данные не трогает.

## Бэкап и восстановление базы

```bash
# выгрузить
sudo docker run --rm -v brawlboost-db:/db -v "$PWD":/backup alpine \
  cp /db/custom.db /backup/custom.db.bak

# залить обратно
sudo docker compose stop app
sudo docker run --rm -v brawlboost-db:/db -v "$PWD":/backup alpine \
  sh -c "cp /backup/custom.db.bak /db/custom.db && chown 1001:1001 /db/custom.db"
sudo docker compose start app
```

## Полезные команды

```bash
sudo docker compose logs -f app      # логи приложения
sudo docker compose restart app      # перезапуск
sudo docker compose down             # остановить всё (том с базой остаётся)
sudo docker compose up -d --build    # пересобрать и поднять
```

## Грабли, на которые легко наступить

- **`.env` больше не лежит в репозитории.** Раньше он был закоммичен с путём к
  базе с чужой машины: приложение поднималось, лендинг открывался, а регистрация
  падала с 500 — Prisma не могла открыть файл базы. Теперь `.env` создаётся из
  `.env.example` и игнорируется git'ом.
- **Путь к базе только абсолютный.** Для SQLite Prisma считает относительный
  путь от каталога `prisma/schema.prisma`, а не от корня проекта, поэтому
  `file:./db/custom.db` указывал бы мимо тома и данные терялись бы при
  пересборке. В compose задан `file:/app/db/custom.db`.
- **Схему накатывает отдельный контейнер, а не приложение.** В standalone-образе
  нет Prisma CLI со всеми его зависимостями, поэтому миграция выполняется из
  builder-стадии, где `node_modules` полный.
- **Права на файле базы.** Миграция идёт от root, приложение работает от uid
  1001, поэтому после `db push` том передаётся владельцу приложения. Если
  восстанавливаете базу из бэкапа вручную — не забудьте `chown 1001:1001`.
- **Платежи пока mock.** Продукт принимает «оплату» на внутренней странице и
  активирует подписку по подписанному вебхуку, но реальных денег не берёт.
  Как подключить провайдера — в `docs/kpgen.md`.
