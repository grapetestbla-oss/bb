"""Пароль для веб-панели.

    python -m tg_autoreact.webpass                     # напечатать хеш
    python -m tg_autoreact.webpass --apply             # записать хеш в config.json и включить панель
    python -m tg_autoreact.webpass --apply --port 8088 --host 0.0.0.0
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import sys
from pathlib import Path

from .web.auth import hash_password

DEFAULT_CONFIG = Path(__file__).resolve().parent.parent / "config.json"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="tg_autoreact.webpass", description="Пароль веб-панели")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG), help="путь к config.json")
    parser.add_argument("--apply", action="store_true", help="записать хеш в config.json и включить панель")
    parser.add_argument("--host", help="web.host при --apply")
    parser.add_argument("--port", type=int, help="web.port при --apply")
    parser.add_argument(
        "--password",
        default=os.getenv("TG_AUTOREACT_WEB_PASSWORD"),
        help="пароль (по умолчанию спрашивается интерактивно)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    password = args.password
    if not password:
        password = getpass.getpass("Пароль панели: ")
        if password != getpass.getpass("Ещё раз: "):
            print("Пароли не совпадают", file=sys.stderr)
            return 2
    if len(password) < 8:
        print("Слишком короткий пароль: минимум 8 символов", file=sys.stderr)
        return 2

    digest = hash_password(password)

    if not args.apply:
        print(digest)
        print('\nВставьте это в config.json: "web": { "enabled": true, "password_hash": "<строка выше>" }')
        return 0

    config_path = Path(args.config)
    config = json.loads(config_path.read_text(encoding="utf-8")) if config_path.exists() else {}
    web = config.setdefault("web", {})
    web["enabled"] = True
    web["password_hash"] = digest
    web["password"] = ""
    if args.host:
        web["host"] = args.host
    if args.port:
        web["port"] = args.port
    web.setdefault("host", "127.0.0.1")
    web.setdefault("port", 8088)

    config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Панель включена в {config_path}: http://{web['host']}:{web['port']}")
    print("Перезапустите сервис: systemctl restart tg-autoreact")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
