# tg-autoreact — авто-реакции «горящее сердечко» для Telegram

Автономный сервис для VPS: подключает произвольное количество Telegram-аккаунтов и
ставит реакцию ❤️‍🔥 на все новые сообщения во всех чатах, которые видит аккаунт.
Новые аккаунты добавляются на лету — перезапуск сервиса не нужен.

## Важно до запуска

* **«Токена аккаунта» у пользовательских аккаунтов Telegram не существует.** Токен есть
  только у ботов. Для обычного аккаунта нужны `api_id` + `api_hash` (с
  <https://my.telegram.org/apps>) и **session-строка**, которую выдаёт скрипт логина.
  Session-строка — это, по сути, полный доступ к аккаунту: храните `accounts.json` с
  правами `600` и не коммитьте его.
* Бот-токены тоже поддерживаются (`bot_token` в записи аккаунта), но бот видит сообщения
  только в тех чатах, куда добавлен, и с выключенным privacy mode.
* Массовые авто-реакции — типичный триггер антиспама Telegram: FloodWait, ограничения
  на аккаунт, вплоть до блокировки. Дефолтные лимиты специально консервативные
  (20 реакций в минуту на аккаунт, пауза 0.5–3 с перед каждой). Поднимать их — риск
  ваших аккаунтов.

## Быстрый старт на VPS

```bash
git clone <repo> && cd <repo>/mini-services/tg-autoreact
sudo ./install.sh                      # venv + systemd-юнит в /opt/tg-autoreact
```

Добавить первый аккаунт (интерактивно — попросит код из Telegram и пароль 2FA, если он есть):

```bash
cd /opt/tg-autoreact
sudo -u tgreact .venv/bin/python -m tg_autoreact.login \
    --name acc1 --api-id 123456 --api-hash 0123456789abcdef... --phone +79990000000
```

Запустить и смотреть логи:

```bash
sudo systemctl start tg-autoreact
sudo journalctl -u tg-autoreact -f
```

### Вручную, без install.sh

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m tg_autoreact.login --name acc1 --api-id ... --api-hash ... --phone +7...
.venv/bin/python -m tg_autoreact --config config.json
```

### Docker

```bash
docker build -t tg-autoreact .
docker run -d --name tg-autoreact --restart unless-stopped \
  -v "$PWD/accounts.json:/app/accounts.json" \
  -v "$PWD/logs:/app/logs" \
  tg-autoreact
```

Логин делайте на хосте (нужен интерактивный ввод кода), затем монтируйте готовый
`accounts.json`.

## Добавление аккаунтов «на лету»

Сервис перечитывает `accounts.json` каждые `runtime.accounts_reload_seconds` (по
умолчанию 30 с) и сам:

* поднимает воркер для нового аккаунта;
* перезапускает воркер, если запись аккаунта изменилась;
* останавливает воркер, если аккаунт удалён или `"enabled": false`.

Так что добавить аккаунт = выполнить `python -m tg_autoreact.login ...` ещё раз.
Скрипт логина пишет в тот же `accounts.json` атомарно, живой сервис не мешает.

Выключить один аккаунт, не удаляя сессию:

```bash
# в accounts.json у нужной записи
"enabled": false
```

## Формат accounts.json

```jsonc
{
  "accounts": [
    {
      "name": "acc1",                  // уникальное имя, попадает в логи
      "enabled": true,
      "api_id": 123456,
      "api_hash": "0123456789abcdef...",
      "session": "1BVtsOK...",         // session-строка из скрипта логина
      "proxy": {                        // опционально
        "type": "socks5",
        "host": "127.0.0.1",
        "port": 1080,
        "username": "user",
        "password": "pass"
      },
      "overrides": {                    // опционально: свои настройки для аккаунта
        "limits": { "per_account_per_minute": 10 },
        "filters": { "channels": false }
      }
    }
  ]
}
```

Вместо `session` можно указать `session_file` (путь к обычному `.session`-файлу
Telethon) или `bot_token` (для ботов).

Пример со всеми полями — в `accounts.example.json`.

## Настройки (config.json)

| Параметр | По умолчанию | Что делает |
| --- | --- | --- |
| `reaction.emoji` | `❤️‍🔥` | Основная реакция |
| `reaction.fallback_emojis` | `["❤‍🔥","🔥","❤️"]` | Чем заменить, если чат запрещает основную. Найденный рабочий эмодзи кешируется на чат |
| `reaction.big` | `false` | «Большая» реакция с анимацией |
| `limits.per_account_per_minute` | `20` | Потолок реакций в минуту на аккаунт (0 — без лимита) |
| `limits.min_interval_seconds` | `1.5` | Минимальная пауза между реакциями аккаунта |
| `limits.per_chat_cooldown_seconds` | `0` | Пауза между реакциями внутри одного чата; сообщения, попавшие в паузу, пропускаются |
| `limits.delay_min/max_seconds` | `0.5` / `3.0` | Случайная задержка перед реакцией |
| `limits.max_queue_size` | `500` | Буфер сообщений на аккаунт; при переполнении лишнее отбрасывается |
| `limits.max_flood_wait_retry_seconds` | `300` | До какого FloodWait сообщение возвращается в очередь на один повтор |
| `filters.private/groups/channels` | `true` | Типы чатов, в которых работать |
| `filters.bots` | `true` | Реагировать ли на сообщения ботов |
| `filters.skip_outgoing` | `true` | Не реагировать на свои сообщения |
| `filters.whitelist_chat_ids` | `[]` | Если непустой — работать только в этих чатах |
| `filters.blacklist_chat_ids` | `[]` | Исключения. Id принимается в любом виде: `-1001234567890` или `1234567890` |
| `backfill.enabled` | `false` | Пройтись по истории при старте и проставить реакции на старые сообщения |
| `backfill.dialogs_limit` / `messages_per_dialog` | `50` / `20` | Глубина этого прохода |
| `runtime.accounts_reload_seconds` | `30` | Как часто перечитывать `accounts.json` |
| `runtime.chat_error_cooldown_seconds` | `1800` | На сколько отключать чат после отказа доступа/реакций |
| `runtime.restart_backoff_seconds` | `[5,15,60,300]` | Лестница пауз при переподключении аккаунта |
| `logging.level` / `logging.file` | `INFO` / `logs/autoreact.log` | Логи (плюс всегда stdout → journald) |

Любую секцию можно переопределить для конкретного аккаунта через `overrides`.

## Как это устроено

```
tg_autoreact/
  __main__.py      точка входа, разбор аргументов
  runner.py        супервизор: воркер на аккаунт, hot-reload accounts.json, статистика
  worker.py        один аккаунт: слушает NewMessage → очередь → реакции
  tg.py            Telethon: клиент, прокси, SendReaction, классификация ошибок
  ratelimit.py     скользящее окно на минуту + пауза по FloodWait + кулдаун чата
  filters.py       отбор чатов и сообщений
  config.py        конфиг, аккаунты, валидация
  login.py         интерактивный вход и запись сессии в accounts.json
```

Поведение в нештатных ситуациях:

* **FloodWait N** — весь аккаунт встаёт на паузу N+джиттер секунд; сообщение
  возвращается в очередь один раз, если N ≤ `max_flood_wait_retry_seconds`.
* **Реакция запрещена в чате** — перебираются `fallback_emojis`; если не подошёл ни один,
  чат отключается на `chat_error_cooldown_seconds`.
* **Нет доступа к чату** (бан, только для админов, приватный канал) — чат отключается
  на тот же срок, без перебора эмодзи.
* **Обрыв связи** — переподключение по лестнице `restart_backoff_seconds`.
* **Сессия умерла / аккаунт забанен** — воркер останавливается насовсем и помечается
  `FATAL` в логе статистики; после исправления записи в `accounts.json` он поднимется сам.
* **Поток сообщений выше лимитов** — очередь переполняется, лишнее отбрасывается с
  предупреждением раз в минуту (это защита: копить часовой хвост реакций бессмысленно).

Каждые `runtime.stats_interval_seconds` в лог пишется сводка по каждому аккаунту:
реакции, пропуски, потери, ошибки, FloodWait, чаты в бане.

## Тесты

```bash
.venv/bin/python tests/test_core.py     # конфиг, фильтры, рейт-лимитер
.venv/bin/python tests/test_worker.py   # логика реакций на подставном клиенте
```

Сети не требуют.
