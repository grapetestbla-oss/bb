#!/usr/bin/env bash
# Разворачивает tg-autoreact на чистом VPS (Debian/Ubuntu) и публикует панель
# по HTTPS на домене. Запускается на самом сервере от root.
#
#   DOMAIN=brawlboost.us SRC=/opt/tg-autoreact-src bash bootstrap.sh
#
# Переменные:
#   DOMAIN        домен панели (обязательно; A-запись должна вести на этот сервер)
#   SRC           каталог с исходниками сервиса (по умолчанию — родитель этого скрипта)
#   WEB_PASSWORD  пароль панели (по умолчанию генерируется)
#   WEB_PORT      локальный порт панели (по умолчанию 8088)
#   SKIP_CADDY=1  не трогать Caddy (если реверс-прокси у вас свой)
#   SKIP_UFW=1    не трогать фаервол
set -euo pipefail

DOMAIN="${DOMAIN:-}"
WEB_PORT="${WEB_PORT:-8088}"
APP_DIR="${APP_DIR:-/opt/tg-autoreact}"
APP_USER="${APP_USER:-tgreact}"
SRC="${SRC:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31mОшибка: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "запускайте от root"
[ -n "$DOMAIN" ] || die "не задан DOMAIN (например: DOMAIN=brawlboost.us)"
[ -f "$SRC/install.sh" ] || die "в $SRC нет install.sh — не туда распакованы исходники"

export DEBIAN_FRONTEND=noninteractive

DNS_OK=1
if [ "${SKIP_CADDY:-0}" != "1" ]; then
  SERVER_IP="$(curl -s --max-time 10 https://api.ipify.org || true)"
  DOMAIN_IP="$(getent hosts "$DOMAIN" 2>/dev/null | awk '{print $1}' | head -1 || true)"
  if [ -z "$DOMAIN_IP" ]; then
    DNS_OK=0
    printf '\033[1;33mВнимание: у %s нет A-записи. Caddy поставим, но сертификат он получит только после того, как запись появится.\033[0m\n' "$DOMAIN"
  elif [ -n "$SERVER_IP" ] && [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    DNS_OK=0
    printf '\033[1;33mВнимание: %s ведёт на %s, а этот сервер — %s. Сертификат не выдадут, пока запись не исправлена.\033[0m\n' "$DOMAIN" "$DOMAIN_IP" "$SERVER_IP"
  fi
fi

say "Пакеты"
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-pip curl ca-certificates gnupg ufw >/dev/null

if [ "${SKIP_CADDY:-0}" != "1" ] && ! command -v caddy >/dev/null 2>&1; then
  say "Ставлю Caddy"
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https >/dev/null
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy >/dev/null
fi

say "Пароль панели"
if [ -z "${WEB_PASSWORD:-}" ]; then
  WEB_PASSWORD="$(head -c 18 /dev/urandom | base64 | tr -d '/+=' | head -c 20)"
  GENERATED=1
fi

say "Сервис tg-autoreact"
WEB_PASSWORD="$WEB_PASSWORD" WEB_HOST=127.0.0.1 WEB_PORT="$WEB_PORT" bash "$SRC/install.sh"

say "Панель за HTTPS"
"$APP_DIR/.venv/bin/python" - "$APP_DIR/config.json" "$WEB_PORT" <<'PY'
import json, sys
path, port = sys.argv[1], int(sys.argv[2])
with open(path, encoding="utf-8") as fh:
    config = json.load(fh)
web = config.setdefault("web", {})
web["enabled"] = True
web["host"] = "127.0.0.1"
web["port"] = port
# Панель отдаётся по HTTPS — кука сессии не должна уходить по обычному HTTP.
web["secure_cookie"] = True
with open(path, "w", encoding="utf-8") as fh:
    json.dump(config, fh, ensure_ascii=False, indent=2)
    fh.write("\n")
print("config.json обновлён")
PY
chown "$APP_USER:$APP_USER" "$APP_DIR/config.json"
chmod 600 "$APP_DIR/config.json"
systemctl restart tg-autoreact

if [ "${SKIP_CADDY:-0}" != "1" ]; then
  say "Caddy для $DOMAIN"
  mkdir -p /etc/caddy /var/log/caddy
  chown -R caddy:caddy /var/log/caddy 2>/dev/null || true
  DOMAIN="$DOMAIN" WEB_PORT="$WEB_PORT" \
    sed -e "s|\${DOMAIN}|$DOMAIN|g" -e "s|\${WEB_PORT}|$WEB_PORT|g" \
    "$SRC/deploy/Caddyfile.template" > /etc/caddy/Caddyfile
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
  systemctl enable --now caddy
  systemctl reload caddy || systemctl restart caddy
fi

if [ "${SKIP_UFW:-0}" != "1" ]; then
  say "Фаервол"
  ufw allow OpenSSH >/dev/null || ufw allow 22/tcp >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  # Порт панели наружу не открываем: к нему ходит только Caddy с localhost.
  yes | ufw enable >/dev/null
fi

say "Проверка"
systemctl is-active --quiet tg-autoreact && echo "tg-autoreact: работает" || echo "tg-autoreact: НЕ работает (journalctl -u tg-autoreact -n 50)"
if [ "${SKIP_CADDY:-0}" != "1" ]; then
  systemctl is-active --quiet caddy && echo "caddy: работает" || echo "caddy: НЕ работает (journalctl -u caddy -n 50)"
fi
LOCAL_CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$WEB_PORT/" || true)"
echo "панель локально: HTTP $LOCAL_CODE (ожидается 200)"

echo "жду сертификат Let's Encrypt..."
PUBLIC_CODE=""
for _ in $(seq 1 12); do
  PUBLIC_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAIN/" || true)"
  [ "$PUBLIC_CODE" = "200" ] && break
  sleep 5
done
echo "https://$DOMAIN/ -> HTTP ${PUBLIC_CODE:-нет ответа}"
if [ "$PUBLIC_CODE" != "200" ]; then
  if [ "$DNS_OK" = "0" ]; then
    echo "  причина — DNS: добавьте A-запись $DOMAIN -> $(curl -s --max-time 5 https://api.ipify.org || echo '<ip этого сервера>')."
    echo "  Caddy повторяет попытку выпуска сертификата сам, переустанавливать ничего не нужно."
  else
    echo "  смотрите: journalctl -u caddy -n 50"
  fi
fi

if [ "${PRINT_PASSWORD:-1}" = "1" ]; then
  PASSWORD_LINE="  Пароль:  $WEB_PASSWORD"
else
  PASSWORD_LINE="  Пароль:  (задан заранее, в лог не печатается)"
fi

cat <<MSG

────────────────────────────────────────────────────────────
  Панель:  https://$DOMAIN
$PASSWORD_LINE
────────────────────────────────────────────────────────────

  Сменить пароль:
      cd $APP_DIR && sudo -u $APP_USER .venv/bin/python -m tg_autoreact.webpass --apply
      systemctl restart tg-autoreact

  Логи:      journalctl -u tg-autoreact -f
  Аккаунты:  $APP_DIR/accounts.json (права 600, там живые сессии)

MSG
[ "${GENERATED:-0}" = "1" ] && [ "${PRINT_PASSWORD:-1}" = "1" ] && echo "  Пароль сгенерирован автоматически — сохраните его сейчас." && echo
echo "  Не забудьте сменить root-пароль сервера и настроить вход по SSH-ключу."
echo
