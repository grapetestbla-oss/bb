# Установка на VPS

## 1. Загрузить проект на сервер

С локальной машины (архив лежит рядом с этим файлом или собирается из репозитория):

```bash
scp fantastiqueboy-setups.tar.gz root@92.246.137.26:/root/
```

## 2. Распаковать и запустить установку

```bash
ssh root@92.246.137.26
mkdir -p /opt/fantastiqueboy-setups
tar -xzf /root/fantastiqueboy-setups.tar.gz -C /opt/fantastiqueboy-setups
cd /opt/fantastiqueboy-setups
bash deploy/deploy.sh                # сайт на http://92.246.137.26
# или с доменом (нужен A-запись на этот IP):
bash deploy/deploy.sh example.com    # https с сертификатом Let's Encrypt
```

Скрипт ставит Node.js 22, Bun и Caddy, собирает приложение, поднимает
systemd-сервис `fantastiqueboy-setups` на `127.0.0.1:3000`, настраивает Caddy
как фронт и выполняет первичное наполнение (администратор, трассы, обучение).

## 3. После установки

- Сайт: `http://92.246.137.26` или `https://<домен>`
- Панель: `/admin`, логин `fantasticqueboy`, пароль `fantasticqueboy` —
  **сразу смените в личном кабинете → «Профиль»**
- Ключи FreeKassa и Platega вводятся в панели → «Платежи»
- Каталог пуст: заводите пилотов, сетапы и паки вручную

## Обновление версии

```bash
systemctl stop fantastiqueboy-setups
tar -xzf /root/fantastiqueboy-setups.tar.gz -C /opt/fantastiqueboy-setups
cd /opt/fantastiqueboy-setups
bun install --frozen-lockfile
bunx prisma generate && bunx prisma db push --skip-generate
bun run build
systemctl start fantastiqueboy-setups
```

База (`db/custom.db`) и `.env` при обновлении не перезаписываются.

## Полезные команды

```bash
systemctl status fantastiqueboy-setups     # состояние
journalctl -u fantastiqueboy-setups -f     # логи приложения
systemctl reload caddy                     # перечитать конфиг Caddy
```

## Вариант с Docker

```bash
cd /opt/fantastiqueboy-setups
DOMAIN=example.com docker compose up -d --build
```
