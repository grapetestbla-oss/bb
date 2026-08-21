#!/usr/bin/env bash
# Деплой tg-autoreact на VPS с локальной машины — одной командой.
#
#   ./deploy/deploy.sh                       # значения по умолчанию (см. ниже)
#   VPS_HOST=1.2.3.4 DOMAIN=example.com ./deploy/deploy.sh
#   WEB_PASSWORD='свой-пароль' ./deploy/deploy.sh
#
# Пароль root спросит ssh (два раза: на копирование и на установку).
# Чтобы не вводить его повторно, сначала положите ключ: ssh-copy-id root@<ip>
set -euo pipefail

VPS_HOST="${VPS_HOST:-92.246.137.26}"
VPS_USER="${VPS_USER:-root}"
VPS_PORT="${VPS_PORT:-22}"
DOMAIN="${DOMAIN:-brawlboost.us}"
WEB_PORT="${WEB_PORT:-8088}"

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCHIVE="$(mktemp -t tg-autoreact-XXXX.tar.gz)"
trap 'rm -f "$ARCHIVE"' EXIT

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

say "Пакую $SRC_DIR"
tar czf "$ARCHIVE" -C "$(dirname "$SRC_DIR")" \
  --exclude='.venv' --exclude='logs' --exclude='__pycache__' \
  --exclude='accounts.json' --exclude='*.session' --exclude='*.pyc' \
  "$(basename "$SRC_DIR")"
echo "$(du -h "$ARCHIVE" | cut -f1) готово"

SSH_OPTS=(-p "$VPS_PORT" -o StrictHostKeyChecking=accept-new)
SCP_OPTS=(-P "$VPS_PORT" -o StrictHostKeyChecking=accept-new)

# sshpass используется, только если он есть и задан SSHPASS.
if [ -n "${SSHPASS:-}" ] && command -v sshpass >/dev/null 2>&1; then
  SSH=(sshpass -e ssh "${SSH_OPTS[@]}")
  SCP=(sshpass -e scp "${SCP_OPTS[@]}")
else
  SSH=(ssh "${SSH_OPTS[@]}")
  SCP=(scp "${SCP_OPTS[@]}")
fi

say "Копирую на $VPS_USER@$VPS_HOST"
"${SCP[@]}" "$ARCHIVE" "$VPS_USER@$VPS_HOST:/tmp/tg-autoreact.tar.gz"

say "Устанавливаю (домен $DOMAIN)"
"${SSH[@]}" "$VPS_USER@$VPS_HOST" \
  "DOMAIN='$DOMAIN' WEB_PORT='$WEB_PORT' WEB_PASSWORD='${WEB_PASSWORD:-}' bash -s" <<'REMOTE'
set -euo pipefail
rm -rf /opt/tg-autoreact-src
mkdir -p /opt/tg-autoreact-src
tar xzf /tmp/tg-autoreact.tar.gz -C /opt/tg-autoreact-src --strip-components=1
rm -f /tmp/tg-autoreact.tar.gz
export SRC=/opt/tg-autoreact-src
bash /opt/tg-autoreact-src/deploy/bootstrap.sh
REMOTE

say "Готово: https://$DOMAIN"
