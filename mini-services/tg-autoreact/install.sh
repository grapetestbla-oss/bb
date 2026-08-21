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
"$APP_DIR/.venv/bin/pip" install --upgrade pip
"$APP_DIR/.venv/bin/pip" install -r "$SRC_DIR/requirements.txt"

chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 600 "$APP_DIR/accounts.json"

install -m 644 "$SRC_DIR/systemd/tg-autoreact.service" /etc/systemd/system/tg-autoreact.service
systemctl daemon-reload
systemctl enable tg-autoreact

cat <<MSG

Готово. Дальше:
  1) Добавьте аккаунт (интерактивно, нужен код из Telegram):
       cd $APP_DIR && sudo -u $APP_USER .venv/bin/python -m tg_autoreact.login \\
         --name acc1 --api-id <API_ID> --api-hash <API_HASH> --phone +7...
  2) Запустите сервис:
       systemctl start tg-autoreact
  3) Логи:
       journalctl -u tg-autoreact -f
MSG
