#!/usr/bin/env bash
# Установка tg-autoreact на VPS одной командой — код скачивается прямо с GitHub.
# Запускать на сервере от root:
#
#   curl -fsSL https://raw.githubusercontent.com/grapetestbla-oss/bb/claude/telegram-auto-reaction-script-wrx20c/mini-services/tg-autoreact/deploy/vps-install.sh | DOMAIN=brawlboost.us bash
#
# Переменные: DOMAIN, WEB_PASSWORD, WEB_PORT, REPO, BRANCH, SKIP_CADDY, SKIP_UFW.
set -euo pipefail

REPO="${REPO:-grapetestbla-oss/bb}"
BRANCH="${BRANCH:-claude/telegram-auto-reaction-script-wrx20c}"
SUBDIR="mini-services/tg-autoreact"
SRC="${SRC:-/opt/tg-autoreact-src}"
DOMAIN="${DOMAIN:-brawlboost.us}"

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31mОшибка: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "запускайте от root"

if ! command -v curl >/dev/null 2>&1 || ! command -v tar >/dev/null 2>&1; then
  say "Ставлю curl и tar"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq curl tar ca-certificates >/dev/null
fi

say "Качаю код из $REPO ($BRANCH)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$BRANCH" -o "$TMP/src.tar.gz" \
  || die "не скачался архив ветки — проверьте REPO/BRANCH"
tar xzf "$TMP/src.tar.gz" -C "$TMP"

ROOT="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -1)"
[ -d "$ROOT/$SUBDIR" ] || die "в архиве нет каталога $SUBDIR"

rm -rf "$SRC"
mkdir -p "$SRC"
cp -a "$ROOT/$SUBDIR/." "$SRC/"
echo "исходники: $SRC"

if [ "${DOWNLOAD_ONLY:-0}" = "1" ]; then
  say "DOWNLOAD_ONLY=1 — установку не запускаю"
  exit 0
fi

say "Запускаю установку (домен $DOMAIN)"
DOMAIN="$DOMAIN" SRC="$SRC" bash "$SRC/deploy/bootstrap.sh"
