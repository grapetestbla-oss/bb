#!/usr/bin/env bash
# Установка бота заявок на VPS (Debian/Ubuntu). Запускать от root:
#
#   BOT_TOKEN='123:ABC' ADMIN_CHAT_ID='-1001234567890' bash install.sh
#
# Переменные: BOT_TOKEN (обязательно), ADMIN_CHAT_ID (обязательно), ADMIN_USER_IDS.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/partner-bot}"
APP_USER="${APP_USER:-partnerbot}"
ENV_FILE="${ENV_FILE:-/etc/partner-bot.env}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

die() { printf '\033[1;31mОшибка: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "запускайте от root"
[ -n "${BOT_TOKEN:-}" ] || die "не задан BOT_TOKEN (возьмите у @BotFather)"
[ -n "${ADMIN_CHAT_ID:-}" ] || die "не задан ADMIN_CHAT_ID — заявки некуда отправлять"

command -v python3 >/dev/null || die "нет python3"

id -u "$APP_USER" >/dev/null 2>&1 \
  || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"

mkdir -p "$APP_DIR/logs"
cp -r "$SRC_DIR/partner_bot" "$APP_DIR/"
cp -n "$SRC_DIR/config.json" "$APP_DIR/config.json"
cp "$SRC_DIR/requirements.txt" "$APP_DIR/requirements.txt"

python3 -m venv "$APP_DIR/.venv"
"$APP_DIR/.venv/bin/pip" install --upgrade pip
"$APP_DIR/.venv/bin/pip" install -r "$APP_DIR/requirements.txt"

# Список админов пишем в config.json, а секрет — только в env-файл.
ADMIN_USER_IDS="${ADMIN_USER_IDS:-}" \
  PYTHONPATH="$APP_DIR" "$APP_DIR/.venv/bin/python" - "$APP_DIR/config.json" <<'PY'
import json, os, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as fh:
    config = json.load(fh)
raw = os.environ.get("ADMIN_USER_IDS", "").replace(",", " ").split()
config["bot"]["admin_user_ids"] = [int(x) for x in raw]
# Токен в файле не держим — его подставит systemd из EnvironmentFile.
config["bot"]["token"] = ""
with open(path, "w", encoding="utf-8") as fh:
    json.dump(config, fh, ensure_ascii=False, indent=2)
    fh.write("\n")
print("config.json обновлён")
PY

umask 077
cat > "$ENV_FILE" <<ENV
PARTNER_BOT_TOKEN=$BOT_TOKEN
PARTNER_BOT_ADMIN_CHAT_ID=$ADMIN_CHAT_ID
ENV
chown root:"$APP_USER" "$ENV_FILE"
chmod 640 "$ENV_FILE"

chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 600 "$APP_DIR/config.json"

install -m 644 "$SRC_DIR/systemd/partner-bot.service" /etc/systemd/system/partner-bot.service
systemctl daemon-reload
systemctl enable partner-bot
systemctl restart partner-bot

sleep 2
systemctl is-active --quiet partner-bot \
  && echo "partner-bot: работает" \
  || echo "partner-bot: НЕ работает — journalctl -u partner-bot -n 50"

cat <<MSG

Готово. Дальше:

  1. Добавьте бота в приватную группу модерации ($ADMIN_CHAT_ID)
     и дайте ему право писать сообщения.
  2. Напишите боту /start в личку — придёт кнопка «Подать заявку».

  Логи:     journalctl -u partner-bot -f
  Токен:    $ENV_FILE (права 640, читает только $APP_USER)
  Заявки:   $APP_DIR/applications.db

MSG
