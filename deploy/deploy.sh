#!/usr/bin/env bash
# ============================================================
#  Fantastiqueboy Set Ups — установка на сервер (Ubuntu/Debian)
# ============================================================
#  Запускать на VPS от root:
#     bash deploy.sh                # сайт на http://IP
#     bash deploy.sh example.com    # сайт на https://example.com (сертификат от Let's Encrypt)
#
#  Скрипт ставит Node.js и Bun, собирает приложение, поднимает
#  systemd-сервис на 127.0.0.1:3000 и настраивает Caddy как фронт.
# ============================================================
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR="${APP_DIR:-/opt/fantastiqueboy-setups}"
SERVICE="fantastiqueboy-setups"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }

if [[ $EUID -ne 0 ]]; then
  echo "Запустите скрипт от root: sudo bash deploy.sh ${DOMAIN}" >&2
  exit 1
fi

if [[ ! -f "$APP_DIR/package.json" ]]; then
  echo "Не найден $APP_DIR/package.json — распакуйте архив проекта в $APP_DIR" >&2
  exit 1
fi

log "Системные пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl unzip gnupg ca-certificates debian-keyring debian-archive-keyring apt-transport-https openssl

log "Node.js 22"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
node -v

log "Bun"
export BUN_INSTALL=/usr/local
if ! command -v bun >/dev/null 2>&1; then
  curl -fsSL https://bun.sh/install | bash
fi
export PATH="/usr/local/bin:$PATH"
bun -v

log "Caddy"
if ! command -v caddy >/dev/null 2>&1; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
fi

cd "$APP_DIR"

log "Переменные окружения"
if [[ ! -f .env ]]; then
  # путь к базе абсолютный: standalone-сервер стартует не из корня проекта
  cat > .env <<ENV
DATABASE_URL=file:${APP_DIR}/db/custom.db
AUTH_SECRET=$(openssl rand -hex 32)
NODE_ENV=production
ENV
  echo "Создан .env со свежим AUTH_SECRET"
else
  echo ".env уже есть — оставляю как есть"
fi
mkdir -p db

log "Зависимости"
bun install --frozen-lockfile

log "База данных"
bunx prisma generate
bunx prisma db push --skip-generate

log "Сборка"
bun run build

# Prisma-клиент и схема нужны рядом со standalone-сервером
mkdir -p .next/standalone/node_modules
cp -r node_modules/.prisma .next/standalone/node_modules/ 2>/dev/null || true
cp -r prisma .next/standalone/ 2>/dev/null || true

log "systemd-сервис"
cat > /etc/systemd/system/${SERVICE}.service <<UNIT
[Unit]
Description=Fantastiqueboy Set Ups (Next.js)
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/local/bin/bun ${APP_DIR}/.next/standalone/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now ${SERVICE}
systemctl restart ${SERVICE}

log "Caddy"
if [[ -n "$DOMAIN" ]]; then
  SITE="$DOMAIN"
else
  SITE=":80"
fi
cat > /etc/caddy/Caddyfile <<CADDY
${SITE} {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
    log {
        output file /var/log/caddy/fantastiqueboy-setups.log
    }
}
CADDY
systemctl reload caddy || systemctl restart caddy

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
fi

log "Первичное наполнение (трассы, обучение, настройки)"
for i in $(seq 1 20); do
  if curl -fsS -X POST http://127.0.0.1:3000/api/seed >/dev/null 2>&1; then
    echo "Готово"
    break
  fi
  sleep 2
done

log "Установка завершена"
if [[ -n "$DOMAIN" ]]; then
  echo "Сайт:   https://${DOMAIN}"
else
  echo "Сайт:   http://$(curl -fsS -m 5 ifconfig.me 2>/dev/null || echo 'IP-сервера')"
fi
echo "Дальше:  зарегистрируйтесь на сайте — первый аккаунт получает панель /admin"
echo "Логи:   journalctl -u ${SERVICE} -f"
