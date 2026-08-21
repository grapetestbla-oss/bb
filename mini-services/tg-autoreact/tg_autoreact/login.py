"""Добавление аккаунта: логин в Telegram и запись сессии в accounts.json.

Использование:
    python -m tg_autoreact.login --name acc1 --api-id 123456 --api-hash abc... --phone +79990000000
    python -m tg_autoreact.login --name bot1 --api-id 123456 --api-hash abc... --bot-token 123:ABC
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from telethon import TelegramClient
from telethon.sessions import StringSession

from .config import normalize_account
from .tg import build_proxy

DEFAULT_ACCOUNTS = Path(__file__).resolve().parent.parent / "accounts.json"


def parse_proxy(value: str | None) -> dict[str, Any] | None:
    """socks5://user:pass@host:1080 -> словарь прокси."""
    if not value:
        return None
    parsed = urlparse(value)
    if not parsed.hostname or not parsed.port:
        raise SystemExit(f"не разобрал прокси: {value} (нужен вид socks5://host:port)")
    proxy: dict[str, Any] = {
        "type": parsed.scheme or "socks5",
        "host": parsed.hostname,
        "port": parsed.port,
    }
    if parsed.username:
        proxy["username"] = parsed.username
        proxy["password"] = parsed.password or ""
    return proxy


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="tg_autoreact.login", description="Добавить аккаунт в accounts.json")
    parser.add_argument("--name", help="имя аккаунта в конфиге (по умолчанию — из телефона/бота)")
    parser.add_argument("--api-id", type=int, default=os.getenv("TG_API_ID"), help="api_id с my.telegram.org")
    parser.add_argument("--api-hash", default=os.getenv("TG_API_HASH"), help="api_hash с my.telegram.org")
    parser.add_argument("--phone", help="номер телефона в формате +7...")
    parser.add_argument("--bot-token", help="токен бота вместо пользовательского аккаунта")
    parser.add_argument("--proxy", help="socks5://user:pass@host:port")
    parser.add_argument("--accounts", default=str(DEFAULT_ACCOUNTS), help="путь к accounts.json")
    parser.add_argument("--print-only", action="store_true", help="только показать session-строку, не сохранять")
    return parser.parse_args(argv)


def load_file(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"accounts": []}
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    if isinstance(data, list):
        return {"accounts": data}
    data.setdefault("accounts", [])
    return data


def save_file(path: Path, data: dict[str, Any]) -> None:
    """Атомарная запись с правами 0600 — в файле лежат живые сессии."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    os.chmod(tmp, 0o600)
    os.replace(tmp, path)


async def login(args: argparse.Namespace) -> tuple[str, str]:
    """Возвращает (session_string, отображаемое имя аккаунта)."""
    client = TelegramClient(
        StringSession(),
        args.api_id,
        args.api_hash,
        proxy=build_proxy(parse_proxy(args.proxy)),
        device_model="Desktop",
        system_version="Linux",
        app_version="1.0",
    )
    # Никакого `async with` — он сам вызывает start() и лезет спрашивать телефон.
    try:
        if args.bot_token:
            await client.start(bot_token=args.bot_token)
        else:
            await client.start(phone=args.phone or (lambda: input("Номер телефона: ")))
        me = await client.get_me()
        display = getattr(me, "username", None) or getattr(me, "first_name", None) or str(me.id)
        return client.session.save(), display
    finally:
        await client.disconnect()


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    if not args.api_id or not args.api_hash:
        print("Нужны --api-id и --api-hash (получить: https://my.telegram.org/apps)", file=sys.stderr)
        return 2
    args.api_id = int(args.api_id)

    session_string, display = asyncio.run(login(args))
    name = args.name or display

    print(f"\nАккаунт: {display}")
    if args.print_only:
        print(f"session: {session_string}")
        return 0

    accounts_path = Path(args.accounts)
    data = load_file(accounts_path)

    entry: dict[str, Any] = {
        "name": name,
        "enabled": True,
        "api_id": args.api_id,
        "api_hash": args.api_hash,
        "session": session_string,
    }
    proxy = parse_proxy(args.proxy)
    if proxy:
        entry["proxy"] = proxy
    if args.bot_token:
        entry["bot_token"] = args.bot_token
    normalize_account(entry)

    accounts = data["accounts"]
    for index, existing in enumerate(accounts):
        if existing.get("name") == name:
            accounts[index] = {**existing, **entry}
            break
    else:
        accounts.append(entry)

    save_file(accounts_path, data)
    print(f"Сохранено в {accounts_path}. Сервис подхватит аккаунт в течение минуты — перезапуск не нужен.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
