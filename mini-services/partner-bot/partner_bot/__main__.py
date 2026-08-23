"""Точка входа: python -m partner_bot [--config config.json]"""

from __future__ import annotations

import argparse
import asyncio
import logging
import logging.handlers
import sys
from pathlib import Path

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from .config import ConfigError, load_config
from .handlers import setup
from .storage import Storage

log = logging.getLogger("partner_bot")


def setup_logging(config: dict) -> None:
    """Пишем и в консоль (journald подхватит), и в файл с ротацией."""
    level = getattr(logging, str(config.get("level", "INFO")).upper(), logging.INFO)
    root = logging.getLogger()
    root.setLevel(level)

    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")

    stream = logging.StreamHandler()
    stream.setFormatter(formatter)
    root.addHandler(stream)

    path = config.get("file")
    if path:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        rotating = logging.handlers.RotatingFileHandler(
            path,
            maxBytes=int(config.get("max_bytes", 10 * 1024 * 1024)),
            backupCount=int(config.get("backup_count", 5)),
            encoding="utf-8",
        )
        rotating.setFormatter(formatter)
        root.addHandler(rotating)

    # aiogram на DEBUG заваливает лог телом каждого апдейта.
    logging.getLogger("aiogram.event").setLevel(max(level, logging.INFO))


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="partner_bot", description="Бот заявок медиа-партнёров")
    parser.add_argument(
        "--config",
        default=str(Path(__file__).resolve().parent.parent / "config.json"),
        help="путь к config.json",
    )
    return parser.parse_args(argv)


async def run(config: dict) -> None:
    storage = Storage(config["storage"]["path"])
    bot = Bot(
        token=config["bot"]["token"],
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dispatcher = Dispatcher(storage=MemoryStorage())
    dispatcher.include_router(setup(config, storage))

    me = await bot.get_me()
    log.info("бот @%s запущен, заявки уходят в чат %s", me.username, config["bot"]["admin_chat_id"])

    try:
        # Копим только то, что умеем обрабатывать; старые апдейты за время
        # простоя не нужны — иначе после перезапуска придёт лавина.
        await bot.delete_webhook(drop_pending_updates=True)
        await dispatcher.start_polling(bot, allowed_updates=dispatcher.resolve_used_update_types())
    finally:
        await bot.session.close()
        storage.close()


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        config = load_config(args.config)
    except ConfigError as exc:
        print(f"Ошибка конфигурации: {exc}", file=sys.stderr)
        return 2

    setup_logging(config["logging"])
    try:
        asyncio.run(run(config))
    except (KeyboardInterrupt, SystemExit):
        log.info("остановлен")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
