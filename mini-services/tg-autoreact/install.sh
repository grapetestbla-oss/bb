#!/usr/bin/env bash
# Разворачивание сервиса на VPS (Debian/Ubuntu). Запускать от root.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tg-autoreact}"
APP_USER="${APP_USER:-tgreact}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v python3 >/dev/null || { echo "нет python3"; exit 1; }

id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"

mkdir -p "$APP_DIR"
cp -r "$SRC_DIR/tg_autoreact" "$APP_DIR/"
cp -n "$SRC_DIR/config.json" "$APP_DIR/config.json"
cp -n "$SRC_DIR/accounts.example.json" "$APP_DIR/accounts.example.json"
[ -f "$APP_DIR/accounts.json" ] || echo '{"accounts": []}' > "$APP_DIR/accounts.json"
mkdir -p "$APP_DIR/logs"

python3 -m venv "$APP_DIR/.venv"
cp "$SRC_DIR/requirements.txt" "$APP_DIR/requirements.txt"
"$APP_DIR/.venv/bin/pip" install --upgrade pip
"$APP_DIR/.venv/bin/pip" install -r "$SRC_DIR/requirements.txt"

# Веб-панель: пароль берём из WEB_PASSWORD или спрашиваем, если есть терминал.
WEB_HOST="${WEB_HOST:-127.0.0.1}"
WEB_PORT="${WEB_PORT:-8088}"
if [ -z "${WEB_PASSWORD:-}" ] && [ -t 0 ]; then
  read -rsp "Пароль веб-панели (пусто — панель не включать): " WEB_PASSWORD
  echo
fi
if [ -n "${WEB_PASSWORD:-}" ]; then
  # Пакет лежит в $APP_DIR и в venv не устанавливается, поэтому -m находит его
  # только через PYTHONPATH: рабочий каталог здесь — тот, откуда запустили скрипт.
  TG_AUTOREACT_WEB_PASSWORD="$WEB_PASSWORD" PYTHONPATH="$APP_DIR" \
    "$APP_DIR/.venv/bin/python" -m tg_autoreact.webpass \
    --config "$APP_DIR/config.json" --apply --host "$WEB_HOST" --port "$WEB_PORT"
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 600 "$APP_DIR/accounts.json" "$APP_DIR/config.json"

install -m 644 "$SRC_DIR/systemd/tg-autoreact.service" /etc/systemd/system/tg-autoreact.service
systemctl daemon-reload
systemctl enable tg-autoreact

systemctl start tg-autoreact

cat <<MSG

Готово, сервис запущен. Дальше:

  Вариант 1 — веб-панель (если задавали пароль):
       http://$WEB_HOST:$WEB_PORT
       Панель слушает только локально; снаружи открывайте её через SSH-туннель:
         ssh -L $WEB_PORT:127.0.0.1:$WEB_PORT root@<ip-сервера>
       либо поставьте перед ней nginx/caddy с HTTPS и укажите WEB_HOST=0.0.0.0.

  Вариант 2 — консоль:
       cd $APP_DIR && sudo -u $APP_USER .venv/bin/python -m tg_autoreact.login \\
         --name acc1 --api-id <API_ID> --api-hash <API_HASH> --phone +7...

  Логи:
       journalctl -u tg-autoreact -f
MSG
