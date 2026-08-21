"""Загрузка и валидация конфигурации сервиса авто-реакций."""

from __future__ import annotations

import copy
import hashlib
import json
import os
from pathlib import Path
from typing import Any

DEFAULT_CONFIG: dict[str, Any] = {
    "reaction": {
        # Основная реакция: "горящее сердечко".
        "emoji": "❤️‍\U0001f525",
        # Если чат не разрешает основную реакцию — пробуем по очереди эти.
        "fallback_emojis": ["❤‍\U0001f525", "\U0001f525", "❤️"],
        "big": False,
        "add_to_recent": False,
    },
    "limits": {
        # Верхний потолок реакций в минуту на один аккаунт.
        "per_account_per_minute": 20,
        # Минимальная пауза между двумя реакциями одного аккаунта.
        "min_interval_seconds": 1.5,
        # Пауза между реакциями в одном и том же чате (0 — без ограничения).
        "per_chat_cooldown_seconds": 0.0,
        # Случайная задержка перед реакцией, чтобы не выглядеть как робот.
        "delay_min_seconds": 0.5,
        "delay_max_seconds": 3.0,
        # Размер очереди необработанных сообщений на аккаунт.
        "max_queue_size": 500,
        # Сколько секунд FloodWait ещё имеет смысл переждать с повтором.
        "max_flood_wait_retry_seconds": 300,
    },
    "filters": {
        "skip_outgoing": True,
        "private": True,
        "groups": True,
        "channels": True,
        # False — не реагировать на сообщения от ботов (стоит один лишний запрос).
        "bots": True,
        "skip_service_messages": True,
        # Если whitelist не пустой — работаем только по нему.
        "whitelist_chat_ids": [],
        "blacklist_chat_ids": [],
    },
    "backfill": {
        # Проставить реакции на уже существующие сообщения при старте аккаунта.
        "enabled": False,
        "dialogs_limit": 50,
        "messages_per_dialog": 20,
    },
    "runtime": {
        "accounts_file": "accounts.json",
        # Как часто перечитывать accounts.json (добавление аккаунтов на лету).
        "accounts_reload_seconds": 30,
        "stats_interval_seconds": 300,
        "restart_backoff_seconds": [5, 15, 60, 300],
        # На сколько выключать чат после ошибки доступа/реакций.
        "chat_error_cooldown_seconds": 1800,
        "device_model": "Desktop",
        "system_version": "Linux",
        "app_version": "1.0",
    },
    "logging": {
        "level": "INFO",
        "file": "logs/autoreact.log",
        "max_bytes": 10 * 1024 * 1024,
        "backup_count": 5,
    },
}


class ConfigError(Exception):
    """Конфиг сломан и работать по нему нельзя."""


def deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    """Рекурсивно накладывает override на base, не мутируя аргументы."""
    result = copy.deepcopy(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = copy.deepcopy(value)
    return result


def _read_json(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except FileNotFoundError:
        raise ConfigError(f"файл не найден: {path}")
    except json.JSONDecodeError as exc:
        raise ConfigError(f"некорректный JSON в {path}: {exc}")
    if not isinstance(data, dict):
        raise ConfigError(f"ожидался JSON-объект в {path}")
    return data


def load_config(path: str | os.PathLike[str]) -> dict[str, Any]:
    """Читает config.json и накладывает его поверх значений по умолчанию."""
    config_path = Path(path)
    user_config = _read_json(config_path) if config_path.exists() else {}
    config = deep_merge(DEFAULT_CONFIG, user_config)
    config["_base_dir"] = str(config_path.resolve().parent)
    _validate_config(config)
    return config


def _validate_config(config: dict[str, Any]) -> None:
    reaction = config["reaction"]
    if not reaction.get("emoji"):
        raise ConfigError("reaction.emoji не может быть пустым")
    if not isinstance(reaction.get("fallback_emojis"), list):
        raise ConfigError("reaction.fallback_emojis должен быть списком")

    limits = config["limits"]
    if limits["delay_min_seconds"] > limits["delay_max_seconds"]:
        raise ConfigError("limits.delay_min_seconds больше limits.delay_max_seconds")
    for key in ("per_account_per_minute", "min_interval_seconds", "per_chat_cooldown_seconds"):
        if limits[key] < 0:
            raise ConfigError(f"limits.{key} не может быть отрицательным")
    if limits["max_queue_size"] < 1:
        raise ConfigError("limits.max_queue_size должен быть >= 1")

    backoff = config["runtime"]["restart_backoff_seconds"]
    if not isinstance(backoff, list) or not backoff:
        raise ConfigError("runtime.restart_backoff_seconds должен быть непустым списком")


def account_fingerprint(account: dict[str, Any]) -> str:
    """Хэш аккаунта — по нему решаем, надо ли перезапускать воркер."""
    payload = json.dumps(account, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def load_accounts(path: str | os.PathLike[str]) -> list[dict[str, Any]]:
    """Читает accounts.json и нормализует записи аккаунтов.

    Поддерживаются два формата файла: {"accounts": [...]} и просто [...].
    """
    accounts_path = Path(path)
    if not accounts_path.exists():
        return []

    try:
        with accounts_path.open("r", encoding="utf-8") as fh:
            raw = json.load(fh)
    except json.JSONDecodeError as exc:
        raise ConfigError(f"некорректный JSON в {accounts_path}: {exc}")

    items = raw.get("accounts", []) if isinstance(raw, dict) else raw
    if not isinstance(items, list):
        raise ConfigError(f"ожидался список аккаунтов в {accounts_path}")

    accounts: list[dict[str, Any]] = []
    seen_names: set[str] = set()
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            raise ConfigError(f"аккаунт #{index} не является объектом")
        account = normalize_account(item, index)
        if account["name"] in seen_names:
            raise ConfigError(f"дублируется имя аккаунта: {account['name']}")
        seen_names.add(account["name"])
        accounts.append(account)
    return accounts


def normalize_account(item: dict[str, Any], index: int = 0) -> dict[str, Any]:
    account = copy.deepcopy(item)
    account.setdefault("name", f"account-{index + 1}")
    account.setdefault("enabled", True)
    account.setdefault("overrides", {})

    name = account["name"]
    if not account.get("bot_token"):
        if not account.get("api_id") or not account.get("api_hash"):
            raise ConfigError(f"аккаунт {name}: нужны api_id и api_hash (или bot_token)")
        if not account.get("session") and not account.get("session_file"):
            raise ConfigError(
                f"аккаунт {name}: нет session (строка) или session_file — "
                "получите их через `python -m tg_autoreact.login`"
            )
    else:
        if not account.get("api_id") or not account.get("api_hash"):
            raise ConfigError(f"аккаунт {name}: для bot_token тоже нужны api_id и api_hash")

    try:
        account["api_id"] = int(account["api_id"])
    except (TypeError, ValueError):
        raise ConfigError(f"аккаунт {name}: api_id должен быть числом")

    return account
