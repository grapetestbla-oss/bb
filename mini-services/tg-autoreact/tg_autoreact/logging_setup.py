"""Настройка логирования: stdout (journald) + опциональный файл с ротацией."""

from __future__ import annotations

import logging
import logging.handlers
import sys
from pathlib import Path
from typing import Any

_FORMAT = "%(asctime)s %(levelname)-7s [%(name)s] %(message)s"


def setup_logging(config: dict[str, Any], base_dir: Path) -> None:
    log_config = config.get("logging", {})
    level = getattr(logging, str(log_config.get("level", "INFO")).upper(), logging.INFO)

    root = logging.getLogger()
    root.setLevel(level)
    for handler in list(root.handlers):
        root.removeHandler(handler)

    formatter = logging.Formatter(_FORMAT)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    root.addHandler(stream_handler)

    log_file = log_config.get("file")
    if log_file:
        path = Path(log_file)
        if not path.is_absolute():
            path = base_dir / path
        path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.handlers.RotatingFileHandler(
            path,
            maxBytes=int(log_config.get("max_bytes", 10 * 1024 * 1024)),
            backupCount=int(log_config.get("backup_count", 5)),
            encoding="utf-8",
        )
        file_handler.setFormatter(formatter)
        root.addHandler(file_handler)

    # Telethon по умолчанию слишком разговорчив.
    logging.getLogger("telethon").setLevel(max(level, logging.WARNING))
