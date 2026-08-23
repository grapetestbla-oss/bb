"""Вступление в чаты из вашего списка.

    python -m tg_autoreact.join --account acc1 --targets targets.txt
    python -m tg_autoreact.join --account acc1 --targets targets.txt --dry-run

Список чатов задаёте вы: файл со ссылками либо join.targets в config.json.
Поиском чатов по каталогу Telegram модуль не занимается.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path
from typing import Any

from .config import ConfigError, load_accounts, load_config
from .joiner import (
    ALREADY_IN,
    FAILED,
    JOINED,
    STOPPED,
    TOO_SMALL,
    JoinOutcome,
    Target,
    join_all,
    parse_targets,
)
from .tg import build_client

DEFAULT_CONFIG = Path(__file__).resolve().parent.parent / "config.json"

STATUS_LABEL = {
    JOINED: "вступили",
    ALREADY_IN: "уже состоим",
    TOO_SMALL: "мало участников",
    FAILED: "ошибка",
    STOPPED: "остановлено",
}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="tg_autoreact.join",
        description="Вступить в чаты из списка (с фильтром по числу участников)",
    )
    parser.add_argument("--account", required=True, help="имя аккаунта из accounts.json")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG), help="путь к config.json")
    parser.add_argument(
        "--targets",
        help="файл со списком чатов, по одному в строке (# — комментарий). "
        "Без него берётся join.targets из config.json",
    )
    parser.add_argument("--min-members", type=int, help="нижняя граница числа участников")
    parser.add_argument("--max-joins", type=int, help="сколько чатов максимум за один проход")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="показать, куда бы вступили, но ничего не делать",
    )
    return parser.parse_args(argv)


def read_targets(args: argparse.Namespace, join_config: dict[str, Any]) -> list[Target]:
    """Собирает список целей из файла или конфигурации."""
    if args.targets:
        path = Path(args.targets)
        if not path.exists():
            raise SystemExit(f"файл со списком не найден: {path}")
        lines = path.read_text(encoding="utf-8").splitlines()
    else:
        lines = [str(item) for item in join_config.get("targets") or []]

    if not lines:
        raise SystemExit(
            "список чатов пуст: укажите --targets со ссылками "
            "или заполните join.targets в config.json"
        )

    targets, problems = parse_targets(lines)
    for problem in problems:
        print(f"  пропущено — {problem}", file=sys.stderr)
    if not targets:
        raise SystemExit("не разобрана ни одна ссылка")
    return targets


def report(outcomes: list[JoinOutcome]) -> None:
    """Печатает итог по каждой цели и сводку."""
    print()
    for outcome in outcomes:
        label = STATUS_LABEL.get(outcome.status, outcome.status)
        members = f"{outcome.members} уч." if outcome.members is not None else "размер неизвестен"
        detail = f" — {outcome.detail}" if outcome.detail else ""
        print(f"  [{label}] {outcome.target.raw} ({members}){detail}")

    totals: dict[str, int] = {}
    for outcome in outcomes:
        totals[outcome.status] = totals.get(outcome.status, 0) + 1
    print("\nИтого: " + ", ".join(f"{STATUS_LABEL.get(k, k)}: {v}" for k, v in sorted(totals.items())))


async def run(args: argparse.Namespace) -> int:
    config = load_config(args.config)
    join_config = config.get("join", {})

    accounts = load_accounts(Path(args.config).parent / config["runtime"]["accounts_file"])
    account = next((item for item in accounts if item["name"] == args.account), None)
    if account is None:
        names = ", ".join(item["name"] for item in accounts) or "(пусто)"
        raise SystemExit(f"аккаунт {args.account!r} не найден. Есть: {names}")

    targets = read_targets(args, join_config)
    min_members = args.min_members if args.min_members is not None else join_config["min_members"]
    max_joins = args.max_joins if args.max_joins is not None else join_config["max_joins_per_run"]

    print(f"Целей в списке: {len(targets)}; порог участников: {min_members}; предел за проход: {max_joins}")
    if args.dry_run:
        print("Режим проверки — вступлений не будет.")

    client = build_client(account, config["runtime"])
    await client.connect()
    try:
        if not await client.is_user_authorized():
            raise SystemExit(f"аккаунт {args.account} не авторизован — перевыпустите сессию")
        outcomes = await join_all(
            client,
            targets,
            min_members=min_members,
            max_joins=max_joins,
            delay_min=join_config["delay_min_seconds"],
            delay_max=join_config["delay_max_seconds"],
            max_flood_wait=join_config["max_flood_wait_seconds"],
            dry_run=args.dry_run,
        )
    finally:
        await client.disconnect()

    report(outcomes)
    return 0


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        return asyncio.run(run(args))
    except ConfigError as exc:
        print(f"Ошибка конфигурации: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("\nпрервано", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
