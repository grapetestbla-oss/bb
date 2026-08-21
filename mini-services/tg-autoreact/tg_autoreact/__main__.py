"""Точка входа: python -m tg_autoreact [--config config.json]"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

from .config import ConfigError, load_config
from .logging_setup import setup_logging
from .runner import Runner

DEFAULT_CONFIG = Path(__file__).resolve().parent.parent / "config.json"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="tg_autoreact",
        description="Ставит реакцию на все новые сообщения во всех чатах для набора аккаунтов.",
    )
    parser.add_argument("--config", default=str(DEFAULT_CONFIG), help="путь к config.json")
    parser.add_argument("--accounts", help="переопределить путь к accounts.json")
    parser.add_argument("--log-level", help="переопределить уровень логирования")
    return parser.parse_args(argv)


async def _run(config: dict, base_dir: Path) -> None:
    await Runner(config, base_dir).run()


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        config = load_config(args.config)
    except ConfigError as exc:
        print(f"Ошибка конфигурации: {exc}", file=sys.stderr)
        return 2

    if args.accounts:
        config["runtime"]["accounts_file"] = args.accounts
    if args.log_level:
        config["logging"]["level"] = args.log_level

    base_dir = Path(config["_base_dir"])
    setup_logging(config, base_dir)

    try:
        asyncio.run(_run(config, base_dir))
    except KeyboardInterrupt:
        logging.getLogger("main").info("прервано пользователем")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
